//! WebAuthn Service
//!
//! Handles WebAuthn credential registration and authentication flows.

use std::collections::HashMap;
use std::io::Cursor;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use ciborium::de::from_reader;
use p256::ecdsa::{signature::Verifier as _, Signature as P256Signature, VerifyingKey};
use p256::EncodedPoint;
use rsa::pkcs1v15::{Signature as RsaSignature, VerifyingKey as RsaVerifyingKey};
use rsa::signature::Verifier;
use rsa::RsaPublicKey;
use serde::Deserialize;
use serde_cbor::Value;
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use url::Url;
use uuid::Uuid;

use crate::config::AppConfig;
use crate::db::authenticator_models::CreateAuthenticatorInput;
use crate::db::authenticator_repos::AuthenticatorRepo;
use crate::error::{AppError, AppResult};

/// WebAuthn registration challenge stored temporarily
#[derive(Debug, Clone)]
pub struct RegistrationChallenge {
    pub user_id: Uuid,
    pub challenge: Vec<u8>,
}

/// WebAuthn authentication challenge stored temporarily
#[derive(Debug, Clone)]
pub struct AuthenticationChallenge {
    pub challenge: Vec<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ChallengeKind {
    Registration,
    Authentication,
}

#[derive(Debug, Clone)]
struct StoredChallenge {
    challenge: Vec<u8>,
    user_id: Option<Uuid>,
    created_at: Instant,
    kind: ChallengeKind,
}

const CHALLENGE_TTL: Duration = Duration::from_secs(300); // 5 minutes

static CHALLENGE_STORE: OnceLock<Mutex<HashMap<String, StoredChallenge>>> = OnceLock::new();

fn store_challenge(key: String, challenge: Vec<u8>, user_id: Option<Uuid>, kind: ChallengeKind) {
    let store = CHALLENGE_STORE.get_or_init(|| Mutex::new(HashMap::new()));
    let mut map = store.lock().expect("Challenge store poisoned");
    // prune expired
    map.retain(|_, v| v.created_at.elapsed() < CHALLENGE_TTL);
    map.insert(
        key,
        StoredChallenge {
            challenge,
            user_id,
            created_at: Instant::now(),
            kind,
        },
    );
}

fn consume_challenge(key: &str, expected_kind: ChallengeKind) -> Option<StoredChallenge> {
    let store = CHALLENGE_STORE.get_or_init(|| Mutex::new(HashMap::new()));
    let mut map = store.lock().expect("Challenge store poisoned");
    // prune expired
    map.retain(|_, v| v.created_at.elapsed() < CHALLENGE_TTL);
    match map.remove(key) {
        Some(challenge) if challenge.kind == expected_kind => Some(challenge),
        _ => None,
    }
}

#[derive(Deserialize)]
struct ClientData {
    challenge: String,
    origin: String,
    #[serde(rename = "type")]
    typ: String,
}

pub struct WebAuthnService {
    rp_id: String,
    origin: String,
}

impl WebAuthnService {
    pub fn new(rp_id: &str, origin: &str) -> Self {
        Self {
            rp_id: rp_id.to_string(),
            origin: origin.to_string(),
        }
    }

    /// Construct service using runtime configuration
    pub fn from_config(config: &AppConfig) -> AppResult<Self> {
        // Prefer host from frontend URL, fall back to cookie domain
        let rp_id = Url::parse(&config.server.frontend_url)
            .ok()
            .and_then(|url| url.host_str().map(|h| h.to_string()))
            .filter(|host| !host.is_empty())
            .unwrap_or_else(|| config.auth.cookie_domain.clone());

        if config.is_production() && !rp_id.contains('.') {
            return Err(AppError::Internal(
                "Invalid RP ID for production WebAuthn configuration".to_string(),
            ));
        }

        Ok(Self {
            rp_id,
            origin: config.server.frontend_url.clone(),
        })
    }

    /// Generate registration options for a new credential
    pub fn start_register(
        &self,
        user_id: Uuid,
        user_name: &str,
        user_display_name: &str,
    ) -> AppResult<serde_json::Value> {
        // Generate challenge (32 bytes of random data)
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let challenge: Vec<u8> = (0..32).map(|_| rng.gen()).collect();

        // Encode as base64 for JSON
        let challenge_b64 = URL_SAFE_NO_PAD.encode(&challenge);

        // Persist challenge in memory for short-lived verification
        store_challenge(
            challenge_b64.clone(),
            challenge.clone(),
            Some(user_id),
            ChallengeKind::Registration,
        );

        // Return creation options
        let options = json!({
            "challenge": challenge_b64,
            "rp": {
                "name": "Ignition",
                "id": &self.rp_id,
            },
            "user": {
                "id": URL_SAFE_NO_PAD.encode(user_id.as_bytes()),
                "name": user_name,
                "displayName": user_display_name,
            },
            "pubKeyCredParams": [
                { "type": "public-key", "alg": -7 },   // ES256
                { "type": "public-key", "alg": -257 }, // RS256
            ],
            "timeout": 60000,
            "attestation": "direct",
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",
                "requireResidentKey": false,
                "userVerification": "preferred",
            }
        });

        // In production, store challenge in Redis or database with TTL
        // For now, returning in response (frontend will send back in verification)
        Ok(json!({
            "options": options,
            "challenge": challenge_b64,
        }))
    }

    /// Verify registration credential
    pub async fn finish_register(
        &self,
        pool: &PgPool,
        user_id: Uuid,
        credential_data: serde_json::Value,
    ) -> AppResult<Uuid> {
        // Extract credential from response
        let credential_id = credential_data
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::BadRequest("Missing credential ID".to_string()))?;

        let attestation_object = credential_data
            .get("response")
            .and_then(|r| r.get("attestationObject"))
            .and_then(|a| a.as_str())
            .ok_or_else(|| AppError::BadRequest("Missing attestation object".to_string()))?;

        let client_data_json = credential_data
            .get("response")
            .and_then(|r| r.get("clientDataJSON"))
            .and_then(|a| a.as_str())
            .ok_or_else(|| AppError::BadRequest("Missing clientDataJSON".to_string()))?;

        // Decode clientDataJSON to validate challenge and origin
        let (client_data, _) = parse_client_data(client_data_json)?;
        if client_data.typ != "webauthn.create" {
            return Err(AppError::Unauthorized(
                "Invalid WebAuthn client data type for registration".to_string(),
            ));
        }

        // Validate challenge and bind to user
        let decoded_client_challenge = decode_base64(&client_data.challenge)?;
        let stored = consume_challenge(&client_data.challenge, ChallengeKind::Registration)
            .or_else(|| {
                // accept if encoding differs but bytes match
                let store = CHALLENGE_STORE.get_or_init(|| Mutex::new(HashMap::new()));
                let mut map = store.lock().expect("Challenge store poisoned");
                map.retain(|_, v| v.created_at.elapsed() < CHALLENGE_TTL);
                let key = map
                    .iter()
                    .find(|(_, v)| {
                        v.kind == ChallengeKind::Registration
                            && v.challenge == decoded_client_challenge
                    })
                    .map(|(k, _)| k.clone())?;
                map.remove(&key)
            });

        match stored {
            Some(challenge) => {
                if let Some(expected_user) = challenge.user_id {
                    if expected_user != user_id {
                        return Err(AppError::Unauthorized(
                            "Challenge user mismatch for WebAuthn registration".to_string(),
                        ));
                    }
                }
            }
            None => {
                return Err(AppError::Unauthorized(
                    "WebAuthn challenge not found or expired".to_string(),
                ))
            }
        }

        // Validate origin against configured frontend origin
        validate_origin(&self.origin, &client_data.origin)?;

        // Decode and parse attestation object to extract credential public key and counters
        let attestation_bytes = decode_base64(attestation_object).map_err(|_| {
            AppError::BadRequest("Invalid base64 in attestation object".to_string())
        })?;
        let attestation = parse_attestation_object(&attestation_bytes)?;

        // Ensure credential IDs align
        let credential_id_bytes = decode_base64(credential_id)
            .map_err(|_| AppError::BadRequest("Invalid credential ID encoding".to_string()))?;
        if let Some(attested_id) = &attestation.credential_id {
            if *attested_id != credential_id_bytes {
                return Err(AppError::Unauthorized(
                    "Credential ID mismatch in attestation".to_string(),
                ));
            }
        }

        // Validate RP hash and user presence
        validate_rp_id_hash(&self.rp_id, &attestation.auth_data)?;

        // Store credential public key (CBOR-encoded) as base64url string
        let public_key_bytes = attestation
            .credential_public_key
            .ok_or_else(|| AppError::BadRequest("Missing credential public key".to_string()))?;
        let public_key_b64 = URL_SAFE_NO_PAD.encode(&public_key_bytes);

        // Create authenticator record
        let input = CreateAuthenticatorInput {
            user_id,
            credential_id: credential_id.to_string(),
            provider_account_id: credential_id.to_string(),
            credential_public_key: public_key_b64,
            counter: attestation.sign_count as i64,
            credential_device_type: "platform".to_string(),
            credential_backed_up: false,
            transports: vec![],
        };

        let authenticator = AuthenticatorRepo::create(pool, input).await?;

        Ok(authenticator.id)
    }

    /// Generate authentication options
    pub fn start_signin(&self) -> AppResult<serde_json::Value> {
        // Generate challenge
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let challenge: Vec<u8> = (0..32).map(|_| rng.gen()).collect();

        let challenge_b64 = URL_SAFE_NO_PAD.encode(&challenge);

        store_challenge(
            challenge_b64.clone(),
            challenge.clone(),
            None,
            ChallengeKind::Authentication,
        );

        let options = json!({
            "challenge": challenge_b64,
            "timeout": 60000,
            "rpId": &self.rp_id,
            "userVerification": "preferred",
        });

        Ok(json!({
            "options": options,
            "challenge": challenge_b64,
        }))
    }

    /// Verify authentication assertion
    pub async fn finish_signin(
        &self,
        pool: &PgPool,
        credential_data: serde_json::Value,
    ) -> AppResult<(Uuid, i64)> {
        // Extract credential ID
        let credential_id = credential_data
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::BadRequest("Missing credential ID".to_string()))?;

        // Lookup authenticator
        let authenticator = AuthenticatorRepo::get_by_credential_id(pool, credential_id)
            .await?
            .ok_or_else(|| AppError::Unauthorized("Credential not found".to_string()))?;

        // Parse client data and validate challenge/origin
        let client_data_json = credential_data
            .get("response")
            .and_then(|r| r.get("clientDataJSON"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::BadRequest("Missing clientDataJSON".to_string()))?;
        let (client_data, client_data_raw) = parse_client_data(client_data_json)?;
        if client_data.typ != "webauthn.get" {
            return Err(AppError::Unauthorized(
                "Invalid WebAuthn client data type for authentication".to_string(),
            ));
        }

        let decoded_client_challenge = decode_base64(&client_data.challenge)?;
        let stored = consume_challenge(&client_data.challenge, ChallengeKind::Authentication)
            .or_else(|| {
                let store = CHALLENGE_STORE.get_or_init(|| Mutex::new(HashMap::new()));
                let mut map = store.lock().expect("Challenge store poisoned");
                map.retain(|_, v| v.created_at.elapsed() < CHALLENGE_TTL);
                let key = map
                    .iter()
                    .find(|(_, v)| {
                        v.kind == ChallengeKind::Authentication
                            && v.challenge == decoded_client_challenge
                    })
                    .map(|(k, _)| k.clone())?;
                map.remove(&key)
            });

        if stored.is_none() {
            return Err(AppError::Unauthorized(
                "WebAuthn challenge not found or expired".to_string(),
            ));
        }

        validate_origin(&self.origin, &client_data.origin)?;

        // Validate RP ID hash inside authenticatorData
        let authenticator_data = credential_data
            .get("response")
            .and_then(|r| r.get("authenticatorData"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::BadRequest("Missing authenticatorData".to_string()))?;
        let authenticator_bytes = decode_base64(authenticator_data)
            .map_err(|_| AppError::BadRequest("Invalid base64 in authenticatorData".to_string()))?;
        validate_rp_id_hash(&self.rp_id, &authenticator_bytes)?;

        let parsed_auth_data = parse_authenticator_data(&authenticator_bytes)?;

        // Verify signature using stored public key
        let signature = credential_data
            .get("response")
            .and_then(|r| r.get("signature"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::BadRequest("Missing signature".to_string()))?;
        let signature_bytes = decode_base64(signature)
            .map_err(|_| AppError::BadRequest("Invalid base64 in signature".to_string()))?;

        let stored_public_key =
            decode_base64(&authenticator.credential_public_key).map_err(|_| {
                AppError::Internal("Stored credential public key is invalid".to_string())
            })?;

        let cose_key = parse_cose_public_key(&stored_public_key)?;

        let client_hash = Sha256::digest(&client_data_raw);
        let mut signed_data = Vec::with_capacity(authenticator_bytes.len() + client_hash.len());
        signed_data.extend_from_slice(&authenticator_bytes);
        signed_data.extend_from_slice(&client_hash);

        verify_signature(&cose_key, &signature_bytes, &signed_data)?;

        // Check for cloning (counter must be greater than stored counter)
        let counter = parsed_auth_data.sign_count as i64;
        if counter <= authenticator.counter {
            tracing::warn!(
                credential_id = %credential_id,
                stored_counter = authenticator.counter,
                response_counter = counter,
                "Potential cloned authenticator detected - counter did not increment"
            );
            return Err(AppError::Unauthorized(
                "Authenticator counter replay detected".to_string(),
            ));
        }

        // Update counter
        AuthenticatorRepo::update_counter(pool, credential_id, counter).await?;

        Ok((authenticator.user_id, counter))
    }
}

fn decode_base64(data: &str) -> AppResult<Vec<u8>> {
    STANDARD
        .decode(data)
        .or_else(|_| URL_SAFE_NO_PAD.decode(data))
        .map_err(|_| AppError::BadRequest("Invalid base64 encoding".to_string()))
}

fn parse_client_data(encoded: &str) -> AppResult<(ClientData, Vec<u8>)> {
    let bytes = decode_base64(encoded)?;
    let client_data = serde_json::from_slice::<ClientData>(&bytes)
        .map_err(|_| AppError::BadRequest("Invalid clientDataJSON".to_string()))?;
    Ok((client_data, bytes))
}

fn validate_origin(expected_origin: &str, actual_origin: &str) -> AppResult<()> {
    let expected = Url::parse(expected_origin)
        .map_err(|_| AppError::Internal("Server origin misconfigured".to_string()))?;
    let actual = Url::parse(actual_origin)
        .map_err(|_| AppError::Unauthorized("Invalid origin in WebAuthn response".to_string()))?;

    if expected.scheme() != actual.scheme() || expected.host_str() != actual.host_str() {
        return Err(AppError::Unauthorized(
            "Origin mismatch in WebAuthn response".to_string(),
        ));
    }

    Ok(())
}

fn validate_rp_id_hash(rp_id: &str, authenticator_data: &[u8]) -> AppResult<()> {
    if authenticator_data.len() < 37 {
        return Err(AppError::BadRequest(
            "authenticatorData too short".to_string(),
        ));
    }

    let mut hasher = Sha256::new();
    hasher.update(rp_id.as_bytes());
    let expected_hash = hasher.finalize();

    let rp_hash = &authenticator_data[0..32];
    if rp_hash != expected_hash.as_slice() {
        return Err(AppError::Unauthorized(
            "RP ID hash mismatch in authenticatorData".to_string(),
        ));
    }

    // Ensure user present bit set
    let flags = authenticator_data.get(32).copied().unwrap_or(0);
    if flags & 0x01 == 0 {
        return Err(AppError::Unauthorized(
            "Authenticator did not assert user presence".to_string(),
        ));
    }

    Ok(())
}

#[derive(Debug, Clone)]
struct ParsedAuthData {
    auth_data: Vec<u8>,
    sign_count: u32,
    credential_id: Option<Vec<u8>>,
    credential_public_key: Option<Vec<u8>>,
}

fn parse_attestation_object(bytes: &[u8]) -> AppResult<ParsedAuthData> {
    let att: Value = serde_cbor::from_slice(bytes)
        .map_err(|_| AppError::BadRequest("Invalid attestation object".to_string()))?;

    let auth_data_bytes = match att {
        Value::Map(map) => map
            .into_iter()
            .find_map(|(k, v)| match (k, v) {
                (Value::Text(t), Value::Bytes(b)) if t == "authData" => Some(b),
                _ => None,
            })
            .ok_or_else(|| AppError::BadRequest("authData missing in attestation".to_string()))?,
        _ => {
            return Err(AppError::BadRequest(
                "Attestation object was not a map".to_string(),
            ))
        }
    };

    let parsed = parse_authenticator_data(&auth_data_bytes)?;

    Ok(parsed)
}

fn parse_authenticator_data(auth_data: &[u8]) -> AppResult<ParsedAuthData> {
    if auth_data.len() < 37 {
        return Err(AppError::BadRequest(
            "authenticatorData too short".to_string(),
        ));
    }

    let flags = auth_data[32];
    let sign_count = u32::from_be_bytes(
        auth_data[33..37]
            .try_into()
            .map_err(|_| AppError::BadRequest("Invalid signCount".to_string()))?,
    );

    // Attested credential data present?
    let has_attested_cred = flags & 0x40 != 0;
    let mut offset = 37;
    let mut credential_id: Option<Vec<u8>> = None;
    let mut credential_public_key: Option<Vec<u8>> = None;

    if has_attested_cred {
        if auth_data.len() < offset + 18 {
            return Err(AppError::BadRequest(
                "authenticatorData attested data too short".to_string(),
            ));
        }
        // Skip AAGUID
        offset += 16;
        let cred_id_len = u16::from_be_bytes(
            auth_data[offset..offset + 2]
                .try_into()
                .map_err(|_| AppError::BadRequest("Invalid credential ID length".to_string()))?,
        ) as usize;
        offset += 2;

        if auth_data.len() < offset + cred_id_len {
            return Err(AppError::BadRequest(
                "Credential ID length exceeds authData".to_string(),
            ));
        }
        credential_id = Some(auth_data[offset..offset + cred_id_len].to_vec());
        offset += cred_id_len;

        // Parse credential public key (CBOR), preserving original bytes
        let mut cursor = Cursor::new(&auth_data[offset..]);
        let value: Value = from_reader(&mut cursor)
            .map_err(|_| AppError::BadRequest("Invalid credential public key".to_string()))?;
        let consumed = cursor.position() as usize;
        let pk_bytes = auth_data
            .get(offset..offset + consumed)
            .ok_or_else(|| AppError::BadRequest("Credential public key overflow".to_string()))?
            .to_vec();
        credential_public_key = Some(pk_bytes);

        // Optionally validate parsed COSE structure
        if let Value::Map(_) = value {
            // ok
        } else {
            return Err(AppError::BadRequest(
                "Credential public key missing map data".to_string(),
            ));
        }
    }

    Ok(ParsedAuthData {
        auth_data: auth_data.to_vec(),
        sign_count,
        credential_id,
        credential_public_key,
    })
}

enum CoseKey {
    EcP256 { x: Vec<u8>, y: Vec<u8> },
    Rsa { n: Vec<u8>, e: Vec<u8> },
}

fn parse_cose_public_key(data: &[u8]) -> AppResult<CoseKey> {
    let value: Value = serde_cbor::from_slice(data)
        .map_err(|_| AppError::BadRequest("Invalid COSE key".to_string()))?;

    let map = match value {
        Value::Map(m) => m,
        _ => return Err(AppError::BadRequest("COSE key was not a map".to_string())),
    };

    let mut kty = None;
    let mut alg = None;
    let mut x = None;
    let mut y = None;
    let mut n = None;
    let mut e_bytes = None;

    for (k, v) in map {
        let key_int = match k {
            Value::Integer(i) => i,
            _ => continue,
        };

        match key_int {
            1 => {
                kty = match v {
                    Value::Integer(i) => Some(i as i32),
                    _ => None,
                }
            }
            3 => {
                alg = match v {
                    Value::Integer(i) => Some(i as i32),
                    _ => None,
                }
            }
            -1 => {
                n = match v {
                    Value::Bytes(b) => Some(b),
                    _ => None,
                }
            }
            -2 => {
                if let Value::Bytes(b) = v {
                    // For EC this is x, for RSA this is exponent
                    x = Some(b.clone());
                    e_bytes = Some(b);
                }
            }
            -3 => {
                y = match v {
                    Value::Bytes(b) => Some(b),
                    _ => None,
                }
            }
            _ => {}
        }
    }

    match (kty, alg) {
        (Some(2), alg_val) if alg_val == Some(-7) => {
            let x = x.ok_or_else(|| AppError::BadRequest("Missing x coordinate".to_string()))?;
            let y = y.ok_or_else(|| AppError::BadRequest("Missing y coordinate".to_string()))?;
            Ok(CoseKey::EcP256 { x, y })
        }
        (Some(3), alg_val) if alg_val == Some(-257) => {
            let n = n.ok_or_else(|| AppError::BadRequest("Missing RSA modulus".to_string()))?;
            let e =
                e_bytes.ok_or_else(|| AppError::BadRequest("Missing RSA exponent".to_string()))?;
            Ok(CoseKey::Rsa { n, e })
        }
        _ => Err(AppError::BadRequest(
            "Unsupported COSE key type or algorithm".to_string(),
        )),
    }
}

fn verify_signature(key: &CoseKey, signature: &[u8], data: &[u8]) -> AppResult<()> {
    match key {
        CoseKey::EcP256 { x, y } => {
            let x_bytes = p256::FieldBytes::from_slice(x);
            let y_bytes = p256::FieldBytes::from_slice(y);
            let encoded = EncodedPoint::from_affine_coordinates(x_bytes, y_bytes, false);
            let verifying_key = VerifyingKey::from_encoded_point(&encoded)
                .map_err(|_| AppError::BadRequest("Invalid P-256 public key".to_string()))?;
            let sig = P256Signature::from_der(signature).map_err(|_| {
                AppError::Unauthorized("Invalid ECDSA signature format".to_string())
            })?;
            verifying_key
                .verify(data, &sig)
                .map_err(|_| AppError::Unauthorized("Invalid WebAuthn signature".to_string()))
        }
        CoseKey::Rsa { n, e } => {
            let n = rsa::BigUint::from_bytes_be(n);
            let e = rsa::BigUint::from_bytes_be(e);
            let key = RsaPublicKey::new(n, e)
                .map_err(|_| AppError::BadRequest("Invalid RSA key".to_string()))?;
            let verifier = RsaVerifyingKey::<Sha256>::new(key);
            let sig = RsaSignature::try_from(signature)
                .map_err(|_| AppError::Unauthorized("Invalid RSA signature format".to_string()))?;
            verifier
                .verify(data, &sig)
                .map_err(|_| AppError::Unauthorized("Invalid WebAuthn signature".to_string()))
        }
    }
}

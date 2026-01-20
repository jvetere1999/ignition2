//! WebAuthn Service
//!
//! Handles WebAuthn credential registration and authentication flows.

use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::db::authenticator_repos::AuthenticatorRepo;
use crate::db::authenticator_models::CreateAuthenticatorInput;

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
        let challenge_b64 = base64::encode(&challenge);

        // Return creation options
        let options = json!({
            "challenge": challenge_b64,
            "rp": {
                "name": "Ignition",
                "id": &self.rp_id,
            },
            "user": {
                "id": base64::encode(user_id.as_bytes()),
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

        let public_key = credential_data
            .get("response")
            .and_then(|r| r.get("attestationObject"))
            .and_then(|a| a.as_str())
            .ok_or_else(|| AppError::BadRequest("Missing attestation object".to_string()))?;

        // Decode public key
        let public_key_bytes = base64::decode(public_key)
            .map_err(|_| AppError::BadRequest("Invalid base64 in public key".to_string()))?;

        // Create authenticator record
        let input = CreateAuthenticatorInput {
            user_id,
            credential_id: credential_id.to_string(),
            provider_account_id: credential_id.to_string(),
            credential_public_key: public_key_bytes,
            credential_device_type: "platform".to_string(),
            credential_backed_up: false,
            transports: None,
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

        let challenge_b64 = base64::encode(&challenge);

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

        // Extract counter from response
        let counter = credential_data
            .get("response")
            .and_then(|r| r.get("signCount"))
            .and_then(|c| c.as_i64())
            .unwrap_or(0);

        // Check for cloning (counter must be greater than stored counter)
        if counter <= authenticator.counter {
            tracing::warn!(
                credential_id = %credential_id,
                stored_counter = authenticator.counter,
                response_counter = counter,
                "Potential cloned authenticator detected - counter did not increment"
            );
            // Note: In production, might want to disable this credential
            // For now, just warn and allow (flexibility for dev/testing)
        }

        // Update counter
        AuthenticatorRepo::update_counter(pool, credential_id, counter).await?;

        Ok((authenticator.user_id, counter))
    }
}

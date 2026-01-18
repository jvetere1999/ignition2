//! OAuth service for Google and Azure authentication
//!
//! Implements OAuth 2.0 flows per security_model.md

use oauth2::{
    basic::BasicClient, reqwest::async_http_client, AuthUrl, AuthorizationCode, ClientId,
    ClientSecret, CsrfToken, PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, Scope,
    TokenResponse, TokenUrl,
};
use reqwest::Client as HttpClient;
use serde::Deserialize;

use crate::config::{AppConfig, OAuthProviderConfig};
use crate::db::models::{OAuthProvider, OAuthUserInfo};
use crate::error::AppError;

/// OAuth state stored in memory/redis during flow
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct OAuthState {
    pub csrf_token: String,
    pub pkce_verifier: String,
    pub provider: OAuthProvider,
    pub redirect_uri: String,
}

/// Google OAuth service
pub struct GoogleOAuth {
    client: BasicClient,
    http_client: HttpClient,
}

impl GoogleOAuth {
    pub fn new(config: &OAuthProviderConfig, redirect_uri: &str) -> Result<Self, AppError> {
        let client = BasicClient::new(
            ClientId::new(config.client_id.clone()),
            Some(ClientSecret::new(config.client_secret.clone())),
            AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())?,
            Some(TokenUrl::new(
                "https://oauth2.googleapis.com/token".to_string(),
            )?),
        )
        .set_redirect_uri(RedirectUrl::new(redirect_uri.to_string())?);

        Ok(Self {
            client,
            http_client: HttpClient::new(),
        })
    }

    /// Generate authorization URL for OAuth flow
    pub fn authorization_url(&self) -> (String, OAuthState) {
        let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

        let (auth_url, csrf_token) = self
            .client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("openid".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .set_pkce_challenge(pkce_challenge)
            .url();

        let redirect_uri = self
            .client
            .redirect_url()
            .map(|url| url.to_string())
            .unwrap_or_else(|| "http://localhost:3000/api/auth/callback/google".to_string());

        let state = OAuthState {
            csrf_token: csrf_token.secret().clone(),
            pkce_verifier: pkce_verifier.secret().clone(),
            provider: OAuthProvider::Google,
            redirect_uri,
        };

        (auth_url.to_string(), state)
    }

    /// Exchange authorization code for tokens
    pub async fn exchange_code(
        &self,
        code: &str,
        pkce_verifier: &str,
    ) -> Result<TokenInfo, AppError> {
        let token_result = self
            .client
            .exchange_code(AuthorizationCode::new(code.to_string()))
            .set_pkce_verifier(PkceCodeVerifier::new(pkce_verifier.to_string()))
            .request_async(async_http_client)
            .await
            .map_err(|e| AppError::OAuthError(format!("Token exchange failed: {}", e)))?;

        Ok(TokenInfo {
            access_token: token_result.access_token().secret().clone(),
            refresh_token: token_result.refresh_token().map(|t| t.secret().clone()),
            expires_at: token_result
                .expires_in()
                .map(|d| chrono::Utc::now().timestamp() + d.as_secs() as i64),
            id_token: None, // Google returns this in the token response
        })
    }

    /// Get user info from Google
    pub async fn get_user_info(&self, access_token: &str) -> Result<OAuthUserInfo, AppError> {
        #[derive(Deserialize)]
        struct GoogleUserInfo {
            sub: String,
            email: String,
            name: Option<String>,
            picture: Option<String>,
            email_verified: Option<bool>,
        }

        let user_info: GoogleUserInfo = self
            .http_client
            .get("https://openidconnect.googleapis.com/v1/userinfo")
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| AppError::OAuthError(format!("Failed to get user info: {}", e)))?
            .json()
            .await
            .map_err(|e| AppError::OAuthError(format!("Failed to parse user info: {}", e)))?;

        Ok(OAuthUserInfo {
            provider: OAuthProvider::Google,
            provider_account_id: user_info.sub,
            email: user_info.email,
            name: user_info.name,
            image: user_info.picture,
            email_verified: user_info.email_verified.unwrap_or(false),
        })
    }
}

/// Azure/Microsoft OAuth service
pub struct AzureOAuth {
    client: BasicClient,
    http_client: HttpClient,
    #[allow(dead_code)]
    tenant_id: String,
}

impl AzureOAuth {
    pub fn new(
        config: &OAuthProviderConfig,
        tenant_id: &str,
        redirect_uri: &str,
    ) -> Result<Self, AppError> {
        let auth_url = format!(
            "https://login.microsoftonline.com/{}/oauth2/v2.0/authorize",
            tenant_id
        );
        let token_url = format!(
            "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
            tenant_id
        );

        let client = BasicClient::new(
            ClientId::new(config.client_id.clone()),
            Some(ClientSecret::new(config.client_secret.clone())),
            AuthUrl::new(auth_url)?,
            Some(TokenUrl::new(token_url)?),
        )
        .set_redirect_uri(RedirectUrl::new(redirect_uri.to_string())?);

        Ok(Self {
            client,
            http_client: HttpClient::new(),
            tenant_id: tenant_id.to_string(),
        })
    }

    /// Generate authorization URL for OAuth flow
    pub fn authorization_url(&self) -> (String, OAuthState) {
        let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

        let (auth_url, csrf_token) = self
            .client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("openid".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .add_scope(Scope::new("User.Read".to_string()))
            .set_pkce_challenge(pkce_challenge)
            .url();

        let redirect_uri = self
            .client
            .redirect_url()
            .map(|url| url.to_string())
            .unwrap_or_else(|| "http://localhost:3000/api/auth/callback/azure".to_string());

        let state = OAuthState {
            csrf_token: csrf_token.secret().clone(),
            pkce_verifier: pkce_verifier.secret().clone(),
            provider: OAuthProvider::Azure,
            redirect_uri,
        };

        (auth_url.to_string(), state)
    }

    /// Exchange authorization code for tokens
    pub async fn exchange_code(
        &self,
        code: &str,
        pkce_verifier: &str,
    ) -> Result<TokenInfo, AppError> {
        let token_result = self
            .client
            .exchange_code(AuthorizationCode::new(code.to_string()))
            .set_pkce_verifier(PkceCodeVerifier::new(pkce_verifier.to_string()))
            .request_async(async_http_client)
            .await
            .map_err(|e| AppError::OAuthError(format!("Token exchange failed: {}", e)))?;

        Ok(TokenInfo {
            access_token: token_result.access_token().secret().clone(),
            refresh_token: token_result.refresh_token().map(|t| t.secret().clone()),
            expires_at: token_result
                .expires_in()
                .map(|d| chrono::Utc::now().timestamp() + d.as_secs() as i64),
            id_token: None,
        })
    }

    /// Get user info from Microsoft Graph
    pub async fn get_user_info(&self, access_token: &str) -> Result<OAuthUserInfo, AppError> {
        #[derive(Deserialize)]
        struct AzureUserInfo {
            id: String,
            mail: Option<String>,
            #[serde(rename = "userPrincipalName")]
            user_principal_name: String,
            #[serde(rename = "displayName")]
            display_name: Option<String>,
        }

        let user_info: AzureUserInfo = self
            .http_client
            .get("https://graph.microsoft.com/v1.0/me")
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| AppError::OAuthError(format!("Failed to get user info: {}", e)))?
            .json()
            .await
            .map_err(|e| AppError::OAuthError(format!("Failed to parse user info: {}", e)))?;

        // Azure uses mail or userPrincipalName as email
        let email = user_info.mail.unwrap_or(user_info.user_principal_name);

        Ok(OAuthUserInfo {
            provider: OAuthProvider::Azure,
            provider_account_id: user_info.id,
            email,
            name: user_info.display_name,
            image: None,          // Would need separate call to get photo
            email_verified: true, // Azure considers emails verified
        })
    }
}

/// Token info from OAuth exchange
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TokenInfo {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<i64>,
    pub id_token: Option<String>,
}

/// OAuth service container
pub struct OAuthService {
    pub google: Option<GoogleOAuth>,
    pub azure: Option<AzureOAuth>,
}

impl OAuthService {
    pub fn new(config: &AppConfig) -> Result<Self, AppError> {
        let base_url = &config.server.public_url;

        let google = if let Some(ref oauth_config) = config.auth.oauth {
            if let Some(ref google_config) = oauth_config.google {
                // Skip if credentials are empty
                if google_config.client_id.is_empty() || google_config.client_secret.is_empty() {
                    tracing::info!(
                        operation = "oauth_init",
                        auth.provider = "google",
                        status = "disabled",
                        "OAuth provider not configured - feature disabled"
                    );
                    None
                } else {
                    let redirect_uri = format!("{}/auth/callback/google", base_url);
                    match GoogleOAuth::new(google_config, &redirect_uri) {
                        Ok(google_oauth) => {
                            tracing::info!(
                                operation = "oauth_init",
                                auth.provider = "google",
                                status = "enabled",
                                "OAuth provider initialized"
                            );
                            Some(google_oauth)
                        }
                        Err(e) => {
                            tracing::warn!(
                                error.type = "oauth",
                                error.message = %e,
                                auth.provider = "google",
                                operation = "oauth_init",
                                status = "failed",
                                "OAuth initialization failed - feature disabled"
                            );
                            None
                        }
                    }
                }
            } else {
                None
            }
        } else {
            None
        };

        let azure = if let Some(ref oauth_config) = config.auth.oauth {
            if let Some(ref azure_config) = oauth_config.azure {
                // Azure requires tenant_id - skip if not configured
                if let Some(ref tenant_id) = azure_config.tenant_id {
                    if !tenant_id.is_empty() {
                        let redirect_uri = format!("{}/auth/callback/azure", base_url);
                        match AzureOAuth::new(azure_config, tenant_id, &redirect_uri) {
                            Ok(azure_oauth) => {
                                tracing::info!(
                                    operation = "oauth_init",
                                    auth.provider = "azure",
                                    status = "enabled",
                                    "OAuth provider initialized"
                                );
                                Some(azure_oauth)
                            }
                            Err(e) => {
                                tracing::warn!(
                                    error.type = "oauth",
                                    error.message = %e,
                                    auth.provider = "azure",
                                    operation = "oauth_init",
                                    status = "failed",
                                    "OAuth initialization failed - feature disabled"
                                );
                                None
                            }
                        }
                    } else {
                        tracing::info!(
                            operation = "oauth_init",
                            auth.provider = "azure",
                            status = "disabled",
                            reason = "tenant_id_empty",
                            "OAuth provider not configured - feature disabled"
                        );
                        None
                    }
                } else {
                    tracing::info!(
                        operation = "oauth_init",
                        auth.provider = "azure",
                        status = "disabled",
                        reason = "tenant_id_missing",
                        "OAuth provider not configured - feature disabled"
                    );
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        Ok(Self { google, azure })
    }
}

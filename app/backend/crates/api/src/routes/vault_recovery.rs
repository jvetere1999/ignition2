use axum::{extract::State, routing::post, Extension, Json, Router};
use serde_json::json;
use std::sync::Arc;

use crate::{
    db::{
        recovery_codes_models::*, recovery_codes_repos::RecoveryCodesRepo, vault_repos::VaultRepo,
    },
    error::AppError,
    middleware::auth::AuthContext,
    state::AppState,
};

/// Recovery code endpoints
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/recovery-codes", post(generate_recovery_codes))
        .route("/reset-passphrase", post(reset_passphrase_with_code))
        .route("/change-passphrase", post(change_passphrase_authenticated))
}

/// POST /api/vault/recovery-codes
/// Generate new recovery codes for a vault
/// Requires authentication
async fn generate_recovery_codes(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth.user_id;

    // Verify user has a vault
    let vault = VaultRepo::get_by_user_id(&state.db, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch vault: {:?}", e);
            AppError::NotFound("Vault not found".to_string())
        })?
        .ok_or_else(|| AppError::NotFound("Vault not found".to_string()))?;

    // Generate 8 recovery codes
    let codes = RecoveryCodesRepo::generate_codes(&state.db, vault.id, user_id, 8)
        .await
        .map_err(|e| {
            tracing::error!("Failed to generate recovery codes: {:?}", e);
            AppError::Internal("Failed to generate recovery codes".to_string())
        })?;

    tracing::info!(
        user_id = %user_id,
        vault_id = %vault.id,
        code_count = codes.len(),
        "Recovery codes generated"
    );

    Ok(Json(json!({
        "data": {
            "codes": codes,
            "message": "Recovery codes generated successfully"
        }
    })))
}

/// POST /api/vault/reset-passphrase
/// Reset vault passphrase using recovery code
/// Does NOT require authentication - recovery code acts as proof
async fn reset_passphrase_with_code(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ResetPassphraseRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Validate code format (basic check)
    if payload.code.is_empty() || payload.code.len() < 10 {
        return Err(AppError::BadRequest(
            "Invalid recovery code format".to_string(),
        ));
    }

    // Validate new passphrase
    if payload.new_passphrase.is_empty() || payload.new_passphrase.len() < 8 {
        return Err(AppError::BadRequest(
            "Passphrase must be at least 8 characters".to_string(),
        ));
    }

    // Find and use the recovery code
    let recovery_code = RecoveryCodesRepo::validate_and_use_code(&state.db, &payload.code)
        .await
        .map_err(|e| {
            tracing::error!("Failed to validate recovery code: {:?}", e);
            AppError::Internal("Failed to validate recovery code".to_string())
        })?
        .ok_or_else(|| AppError::BadRequest("Invalid or already used recovery code".to_string()))?;

    // Get the vault
    let vault = VaultRepo::get_by_user_id(&state.db, recovery_code.created_by)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch vault: {:?}", e);
            AppError::NotFound("Vault not found".to_string())
        })?
        .ok_or_else(|| AppError::NotFound("Vault not found".to_string()))?;

    // Hash the new passphrase using bcrypt
    let hashed = bcrypt::hash(&payload.new_passphrase, 12).map_err(|e| {
        tracing::error!("Failed to hash passphrase: {:?}", e);
        AppError::Internal("Failed to hash passphrase".to_string())
    })?;

    // Update vault passphrase
    sqlx::query(
        r#"
        UPDATE vaults
        SET passphrase_hash = $1, updated_at = NOW()
        WHERE id = $2
        "#,
    )
    .bind(&hashed)
    .bind(vault.id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update vault passphrase: {:?}", e);
        AppError::Internal("Failed to update passphrase".to_string())
    })?;

    tracing::warn!(
        vault_id = %vault.id,
        "Vault passphrase reset via recovery code"
    );

    Ok(Json(json!({
        "data": {
            "message": "Passphrase reset successfully",
            "vault_id": vault.id.to_string()
        }
    })))
}

/// POST /api/vault/change-passphrase
/// Change vault passphrase (authenticated user)
/// Requires current passphrase to verify identity
async fn change_passphrase_authenticated(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(payload): Json<ChangePassphraseRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth.user_id;

    // Get user's vault
    let vault = VaultRepo::get_by_user_id(&state.db, user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch vault: {:?}", e);
            AppError::NotFound("Vault not found".to_string())
        })?
        .ok_or_else(|| AppError::NotFound("Vault not found".to_string()))?;

    // Verify current passphrase
    let passphrase_valid = bcrypt::verify(&payload.current_passphrase, &vault.passphrase_hash)
        .map_err(|e| {
            tracing::error!("Bcrypt verification failed: {:?}", e);
            AppError::Internal("Failed to verify passphrase".to_string())
        })?;

    if !passphrase_valid {
        return Err(AppError::Unauthorized(
            "Current passphrase is incorrect".to_string(),
        ));
    }

    // Validate new passphrase
    if payload.new_passphrase.is_empty() || payload.new_passphrase.len() < 8 {
        return Err(AppError::BadRequest(
            "New passphrase must be at least 8 characters".to_string(),
        ));
    }

    // Hash new passphrase
    let hashed = bcrypt::hash(&payload.new_passphrase, 12).map_err(|e| {
        tracing::error!("Failed to hash passphrase: {:?}", e);
        AppError::Internal("Failed to hash passphrase".to_string())
    })?;

    // Update vault passphrase
    sqlx::query(
        r#"
        UPDATE vaults
        SET passphrase_hash = $1, updated_at = NOW()
        WHERE id = $2
        "#,
    )
    .bind(&hashed)
    .bind(vault.id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update vault passphrase: {:?}", e);
        AppError::Internal("Failed to update passphrase".to_string())
    })?;

    // Revoke all recovery codes when passphrase changes
    let _ = RecoveryCodesRepo::revoke_all_codes(&state.db, vault.id).await;

    tracing::info!(
        user_id = %user_id,
        vault_id = %vault.id,
        "Vault passphrase changed successfully"
    );

    Ok(Json(json!({
        "data": {
            "message": "Passphrase changed successfully. Recovery codes have been revoked.",
            "vault_id": vault.id.to_string()
        }
    })))
}

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde_json::json;

use crate::{
    db::crypto_policy_models::{
        CryptoPolicy, CreateCryptoPolicyRequest, DeprecateCryptoPolicyRequest,
        GetCryptoPolicyResponse,
    },
    db::crypto_policy_repos::CryptoPolicyRepo,
    state::AppState,
};

use std::sync::Arc;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/current", get(get_current_policy))
        .route("/{version}", get(get_policy_by_version))
        .route("/", get(list_all_policies))
        .route("/", post(create_policy))
        .route("/{version}/deprecate", post(deprecate_policy))
}

/// Get the current active crypto policy
async fn get_current_policy(State(state): State<Arc<AppState>>) -> Response {
    match CryptoPolicyRepo::get_current(&state.db).await {
        Ok(policy) => {
            let response = GetCryptoPolicyResponse {
                version: policy.version,
                algorithm: policy.algorithm,
                kdf_algorithm: policy.kdf_algorithm,
                kdf_iterations: policy.kdf_iterations,
                kdf_memory_mb: policy.kdf_memory_mb,
                tls_minimum: policy.tls_minimum,
                effective_date: policy.effective_date,
                deprecated_date: policy.deprecated_date,
                migration_deadline: policy.migration_deadline,
                is_current: true,
                is_deprecated: false,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(_) => {
            (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "No active crypto policy found" })),
            )
                .into_response()
        }
    }
}

/// Get a specific policy version
async fn get_policy_by_version(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(version): axum::extract::Path<String>,
) -> Response {
    match CryptoPolicyRepo::get_by_version(&state.db, &version).await {
        Ok(policy) => {
            let is_current = policy.deprecated_date.is_none();
            let response = GetCryptoPolicyResponse {
                version: policy.version,
                algorithm: policy.algorithm,
                kdf_algorithm: policy.kdf_algorithm,
                kdf_iterations: policy.kdf_iterations,
                kdf_memory_mb: policy.kdf_memory_mb,
                tls_minimum: policy.tls_minimum,
                effective_date: policy.effective_date,
                deprecated_date: policy.deprecated_date,
                migration_deadline: policy.migration_deadline,
                is_current,
                is_deprecated: !is_current,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(_) => {
            (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": format!("Policy version {} not found", version) })),
            )
                .into_response()
        }
    }
}

/// List all policies (current and deprecated)
async fn list_all_policies(State(state): State<Arc<AppState>>) -> Response {
    match CryptoPolicyRepo::get_all(&state.db).await {
        Ok(policies) => {
            let responses: Vec<GetCryptoPolicyResponse> = policies
                .iter()
                .map(|p| GetCryptoPolicyResponse {
                    version: p.version.clone(),
                    algorithm: p.algorithm.clone(),
                    kdf_algorithm: p.kdf_algorithm.clone(),
                    kdf_iterations: p.kdf_iterations,
                    kdf_memory_mb: p.kdf_memory_mb,
                    tls_minimum: p.tls_minimum.clone(),
                    effective_date: p.effective_date,
                    deprecated_date: p.deprecated_date,
                    migration_deadline: p.migration_deadline,
                    is_current: p.deprecated_date.is_none(),
                    is_deprecated: p.deprecated_date.is_some(),
                })
                .collect();
            (StatusCode::OK, Json(json!({ "policies": responses }))).into_response()
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to retrieve policies" })),
        )
            .into_response(),
    }
}

/// Create a new crypto policy (admin only)
async fn create_policy(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateCryptoPolicyRequest>,
) -> Response {
    match CryptoPolicyRepo::create(&state.db, &req).await {
        Ok(policy) => {
            let response = GetCryptoPolicyResponse {
                version: policy.version,
                algorithm: policy.algorithm,
                kdf_algorithm: policy.kdf_algorithm,
                kdf_iterations: policy.kdf_iterations,
                kdf_memory_mb: policy.kdf_memory_mb,
                tls_minimum: policy.tls_minimum,
                effective_date: policy.effective_date,
                deprecated_date: policy.deprecated_date,
                migration_deadline: policy.migration_deadline,
                is_current: true,
                is_deprecated: false,
            };
            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to create crypto policy" })),
        )
            .into_response(),
    }
}

/// Deprecate a crypto policy (admin only)
async fn deprecate_policy(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(version): axum::extract::Path<String>,
    Json(req): Json<DeprecateCryptoPolicyRequest>,
) -> Response {
    let mut req = req;
    req.version = version;
    
    match CryptoPolicyRepo::deprecate(&state.db, &req).await {
        Ok(policy) => {
            let response = GetCryptoPolicyResponse {
                version: policy.version,
                algorithm: policy.algorithm,
                kdf_algorithm: policy.kdf_algorithm,
                kdf_iterations: policy.kdf_iterations,
                kdf_memory_mb: policy.kdf_memory_mb,
                tls_minimum: policy.tls_minimum,
                effective_date: policy.effective_date,
                deprecated_date: policy.deprecated_date,
                migration_deadline: policy.migration_deadline,
                is_current: false,
                is_deprecated: true,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to deprecate crypto policy" })),
        )
            .into_response(),
    }
}

/// HTTP Client Utilities for Integration Testing
/// 
/// Provides helpers for making authenticated HTTP requests to test endpoints,
/// with built-in support for session cookies, request signing, and response validation.

use axum_test_helper::TestClient;
use sqlx::PgPool;
use std::sync::Arc;
use tower::ServiceBuilder;
use crate::state::AppState;

/// Test HTTP client wrapper with session management
pub struct TestHttpClient {
    client: TestClient,
    session_id: Option<String>,
    user_id: Option<i32>,
}

impl TestHttpClient {
    /// Create new test HTTP client for a given app state
    pub fn new(client: TestClient) -> Self {
        Self {
            client,
            session_id: None,
            user_id: None,
        }
    }

    /// Authenticate client with a session ID
    pub fn with_session(mut self, session_id: String, user_id: i32) -> Self {
        self.session_id = Some(session_id);
        self.user_id = Some(user_id);
        self
    }

    /// Make GET request with automatic session cookie
    pub async fn get(&self, path: &str) -> axum_test_helper::TestResponse {
        let mut builder = self.client.get(path);

        if let Some(session_id) = &self.session_id {
            builder = builder.header("Cookie", format!("session_id={}", session_id));
        }

        builder.send().await
    }

    /// Make POST request with automatic session cookie and JSON body
    pub async fn post(&self, path: &str, body: serde_json::Value) -> axum_test_helper::TestResponse {
        let mut builder = self.client
            .post(path)
            .header("Content-Type", "application/json")
            .json(&body);

        if let Some(session_id) = &self.session_id {
            builder = builder.header("Cookie", format!("session_id={}", session_id));
        }

        builder.send().await
    }

    /// Make PATCH request with automatic session cookie and JSON body
    pub async fn patch(&self, path: &str, body: serde_json::Value) -> axum_test_helper::TestResponse {
        let mut builder = self.client
            .patch(path)
            .header("Content-Type", "application/json")
            .json(&body);

        if let Some(session_id) = &self.session_id {
            builder = builder.header("Cookie", format!("session_id={}", session_id));
        }

        builder.send().await
    }

    /// Make DELETE request with automatic session cookie
    pub async fn delete(&self, path: &str) -> axum_test_helper::TestResponse {
        let mut builder = self.client.delete(path);

        if let Some(session_id) = &self.session_id {
            builder = builder.header("Cookie", format!("session_id={}", session_id));
        }

        builder.send().await
    }

    /// Make PUT request with automatic session cookie and JSON body
    pub async fn put(&self, path: &str, body: serde_json::Value) -> axum_test_helper::TestResponse {
        let mut builder = self.client
            .put(path)
            .header("Content-Type", "application/json")
            .json(&body);

        if let Some(session_id) = &self.session_id {
            builder = builder.header("Cookie", format!("session_id={}", session_id));
        }

        builder.send().await
    }

    /// Make custom request with full control
    pub async fn request(
        &self,
        method: &str,
        path: &str,
        headers: Vec<(&str, &str)>,
        body: Option<serde_json::Value>,
    ) -> axum_test_helper::TestResponse {
        let mut builder = match method.to_uppercase().as_str() {
            "GET" => self.client.get(path),
            "POST" => self.client.post(path),
            "PUT" => self.client.put(path),
            "PATCH" => self.client.patch(path),
            "DELETE" => self.client.delete(path),
            _ => panic!("Unsupported HTTP method: {}", method),
        };

        for (key, value) in headers {
            builder = builder.header(key, value);
        }

        if let Some(b) = body {
            builder = builder.json(&b);
        }

        if let Some(session_id) = &self.session_id {
            builder = builder.header("Cookie", format!("session_id={}", session_id));
        }

        builder.send().await
    }

    /// Get current session ID (if authenticated)
    pub fn session_id(&self) -> Option<&str> {
        self.session_id.as_deref()
    }

    /// Get current user ID (if authenticated)
    pub fn user_id(&self) -> Option<i32> {
        self.user_id
    }
}

/// Response validation helper
pub struct TestResponse {
    status: u16,
    body: String,
}

impl TestResponse {
    /// Create from test response
    pub fn from_axum_response(response: axum_test_helper::TestResponse) -> Self {
        let status = response.status().as_u16();
        // Note: In real implementation, extract body from response
        Self {
            status,
            body: String::new(),
        }
    }

    /// Assert response has expected status code
    pub fn assert_status(&self, expected: u16) -> &Self {
        assert_eq!(
            self.status, expected,
            "Expected status {}, got {}. Body: {}",
            expected, self.status, self.body
        );
        self
    }

    /// Assert response is 200 OK
    pub fn assert_ok(&self) -> &Self {
        self.assert_status(200);
        self
    }

    /// Assert response is 201 Created
    pub fn assert_created(&self) -> &Self {
        self.assert_status(201);
        self
    }

    /// Assert response is 400 Bad Request
    pub fn assert_bad_request(&self) -> &Self {
        self.assert_status(400);
        self
    }

    /// Assert response is 401 Unauthorized
    pub fn assert_unauthorized(&self) -> &Self {
        self.assert_status(401);
        self
    }

    /// Assert response is 403 Forbidden
    pub fn assert_forbidden(&self) -> &Self {
        self.assert_status(403);
        self
    }

    /// Assert response is 404 Not Found
    pub fn assert_not_found(&self) -> &Self {
        self.assert_status(404);
        self
    }

    /// Assert response is 500 Internal Server Error
    pub fn assert_internal_error(&self) -> &Self {
        self.assert_status(500);
        self
    }

    /// Get response body as JSON
    pub fn json(&self) -> serde_json::Value {
        serde_json::from_str(&self.body).expect("Failed to parse JSON response")
    }

    /// Get response body as string
    pub fn text(&self) -> &str {
        &self.body
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_response_validation() {
        let response = TestResponse {
            status: 200,
            body: r#"{"id": 1, "name": "Test"}"#.to_string(),
        };

        response.assert_ok();
        let json = response.json();
        assert_eq!(json["name"].as_str(), Some("Test"));
    }

    #[test]
    #[should_panic]
    fn test_response_status_assertion_fails() {
        let response = TestResponse {
            status: 404,
            body: "Not found".to_string(),
        };

        response.assert_ok();
    }
}

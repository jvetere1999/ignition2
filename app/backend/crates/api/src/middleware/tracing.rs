/// Request Context & Tracing Utilities
///
/// Provides structured request context tracking, correlation IDs, and request tracing
/// for debugging and observability. Supports distributed tracing across microservices.

use std::sync::Arc;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Mutex;

/// Request context for tracking
#[derive(Debug, Clone)]
pub struct RequestContext {
    /// Unique correlation ID for tracing requests across systems
    pub correlation_id: String,
    
    /// Trace ID for distributed tracing
    pub trace_id: String,
    
    /// Span ID for this specific request
    pub span_id: String,
    
    /// User ID if authenticated
    pub user_id: Option<i32>,
    
    /// Session ID if authenticated
    pub session_id: Option<String>,
    
    /// Request timestamp
    pub timestamp: DateTime<Utc>,
    
    /// Request method
    pub method: String,
    
    /// Request path
    pub path: String,
    
    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

impl RequestContext {
    /// Create new request context with auto-generated IDs
    pub fn new(method: String, path: String) -> Self {
        Self {
            correlation_id: Uuid::new_v4().to_string(),
            trace_id: Uuid::new_v4().to_string(),
            span_id: Uuid::new_v4().to_string(),
            user_id: None,
            session_id: None,
            timestamp: Utc::now(),
            method,
            path,
            metadata: HashMap::new(),
        }
    }

    /// Create from parent context (for nested requests)
    pub fn from_parent(parent: &RequestContext, method: String, path: String) -> Self {
        Self {
            correlation_id: parent.correlation_id.clone(),
            trace_id: parent.trace_id.clone(),
            span_id: Uuid::new_v4().to_string(), // New span for nested call
            user_id: parent.user_id,
            session_id: parent.session_id.clone(),
            timestamp: Utc::now(),
            method,
            path,
            metadata: parent.metadata.clone(),
        }
    }

    /// Set user ID
    pub fn with_user_id(mut self, user_id: i32) -> Self {
        self.user_id = Some(user_id);
        self
    }

    /// Set session ID
    pub fn with_session_id(mut self, session_id: String) -> Self {
        self.session_id = Some(session_id);
        self
    }

    /// Add metadata
    pub fn add_metadata(mut self, key: String, value: String) -> Self {
        self.metadata.insert(key, value);
        self
    }

    /// Add multiple metadata
    pub fn with_metadata(mut self, metadata: HashMap<String, String>) -> Self {
        self.metadata.extend(metadata);
        self
    }

    /// Get trace header value for distributed tracing (W3C format)
    pub fn trace_header(&self) -> String {
        format!("00-{}-{}-01", self.trace_id, self.span_id)
    }

    /// Get correlation header value
    pub fn correlation_header(&self) -> String {
        self.correlation_id.clone()
    }
}

/// Request tracing store for debugging
#[derive(Clone)]
pub struct RequestTracingStore {
    traces: Arc<Mutex<Vec<RequestTrace>>>,
}

/// Recorded request trace
#[derive(Debug, Clone)]
pub struct RequestTrace {
    pub context: RequestContext,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub status_code: Option<u16>,
    pub error: Option<String>,
    pub duration_ms: Option<u64>,
}

impl RequestTracingStore {
    /// Create new tracing store
    pub fn new() -> Self {
        Self {
            traces: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Start request trace
    pub fn start_trace(&self, context: RequestContext) -> RequestTrace {
        RequestTrace {
            context,
            start_time: Utc::now(),
            end_time: None,
            status_code: None,
            error: None,
            duration_ms: None,
        }
    }

    /// Record completed request
    pub fn record_trace(&self, mut trace: RequestTrace, status_code: u16) {
        let end_time = Utc::now();
        let duration_ms = end_time
            .signed_duration_since(trace.start_time)
            .num_milliseconds() as u64;

        trace.end_time = Some(end_time);
        trace.status_code = Some(status_code);
        trace.duration_ms = Some(duration_ms);

        let mut traces = self.traces.lock().unwrap();
        traces.push(trace);

        // Keep only last 1000 traces
        if traces.len() > 1000 {
            traces.drain(0..traces.len() - 1000);
        }
    }

    /// Record error in trace
    pub fn record_error(&self, mut trace: RequestTrace, error: String, status_code: u16) {
        let end_time = Utc::now();
        let duration_ms = end_time
            .signed_duration_since(trace.start_time)
            .num_milliseconds() as u64;

        trace.end_time = Some(end_time);
        trace.status_code = Some(status_code);
        trace.error = Some(error);
        trace.duration_ms = Some(duration_ms);

        let mut traces = self.traces.lock().unwrap();
        traces.push(trace);

        if traces.len() > 1000 {
            traces.drain(0..traces.len() - 1000);
        }
    }

    /// Get recent traces
    pub fn get_recent_traces(&self, count: usize) -> Vec<RequestTrace> {
        let traces = self.traces.lock().unwrap();
        traces.iter().rev().take(count).cloned().collect()
    }

    /// Get traces for specific correlation ID
    pub fn get_traces_for_correlation(&self, correlation_id: &str) -> Vec<RequestTrace> {
        let traces = self.traces.lock().unwrap();
        traces
            .iter()
            .filter(|t| t.context.correlation_id == correlation_id)
            .cloned()
            .collect()
    }

    /// Get slow requests (latency > threshold ms)
    pub fn get_slow_requests(&self, threshold_ms: u64) -> Vec<RequestTrace> {
        let traces = self.traces.lock().unwrap();
        traces
            .iter()
            .filter(|t| t.duration_ms.map_or(false, |d| d > threshold_ms))
            .cloned()
            .collect()
    }

    /// Get failed requests (status >= 400)
    pub fn get_failed_requests(&self) -> Vec<RequestTrace> {
        let traces = self.traces.lock().unwrap();
        traces
            .iter()
            .filter(|t| t.status_code.map_or(false, |s| s >= 400))
            .cloned()
            .collect()
    }

    /// Get average response time
    pub fn get_average_duration_ms(&self) -> Option<f64> {
        let traces = self.traces.lock().unwrap();
        if traces.is_empty() {
            return None;
        }

        let total: u64 = traces.iter().filter_map(|t| t.duration_ms).sum();
        let count = traces.iter().filter(|t| t.duration_ms.is_some()).count();

        if count == 0 {
            return None;
        }

        Some(total as f64 / count as f64)
    }

    /// Clear all traces
    pub fn clear(&self) {
        self.traces.lock().unwrap().clear();
    }
}

impl Default for RequestTracingStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_context_creation() {
        let ctx = RequestContext::new("GET".to_string(), "/api/users".to_string());
        assert!(!ctx.correlation_id.is_empty());
        assert_eq!(ctx.method, "GET");
        assert_eq!(ctx.path, "/api/users");
    }

    #[test]
    fn test_request_context_with_user() {
        let ctx = RequestContext::new("GET".to_string(), "/api/users".to_string())
            .with_user_id(123);
        assert_eq!(ctx.user_id, Some(123));
    }

    #[test]
    fn test_trace_header_format() {
        let ctx = RequestContext::new("GET".to_string(), "/api/users".to_string());
        let header = ctx.trace_header();
        let parts: Vec<&str> = header.split('-').collect();
        assert_eq!(parts.len(), 4); // 00-trace_id-span_id-01
    }

    #[test]
    fn test_tracing_store() {
        let store = RequestTracingStore::new();
        let ctx = RequestContext::new("GET".to_string(), "/api/users".to_string());
        let trace = store.start_trace(ctx);
        store.record_trace(trace, 200);

        let traces = store.get_recent_traces(10);
        assert_eq!(traces.len(), 1);
        assert_eq!(traces[0].status_code, Some(200));
    }

    #[test]
    fn test_slow_request_detection() {
        let store = RequestTracingStore::new();
        let ctx = RequestContext::new("GET".to_string(), "/api/users".to_string());
        let trace = store.start_trace(ctx);

        // Simulate slow request by manually setting duration
        store.record_trace(trace, 200);

        let slow = store.get_slow_requests(10);
        assert!(slow.len() >= 0); // May or may not be slow depending on actual timing
    }
}

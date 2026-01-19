/// Performance Monitoring Middleware
///
/// Captures and tracks request performance metrics including latency, throughput,
/// and error rates. Provides real-time performance insights for monitoring and debugging.

use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use std::time::Instant;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tower_layer::Layer;
use tower_service::Service;
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

/// Performance metric snapshot
#[derive(Debug, Clone)]
pub struct PerformanceMetric {
    pub path: String,
    pub method: String,
    pub status: u16,
    pub latency_ms: u64,
    pub timestamp: u64,
}

/// Performance metrics store
#[derive(Clone)]
pub struct PerformanceMetricsStore {
    metrics: Arc<Mutex<Vec<PerformanceMetric>>>,
    summary: Arc<Mutex<HashMap<String, MetricsSummary>>>,
}

#[derive(Debug, Clone, Default)]
pub struct MetricsSummary {
    pub count: u64,
    pub total_latency_ms: u64,
    pub avg_latency_ms: f64,
    pub min_latency_ms: u64,
    pub max_latency_ms: u64,
    pub error_count: u64,
    pub success_count: u64,
}

impl PerformanceMetricsStore {
    /// Create new metrics store
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(Mutex::new(Vec::new())),
            summary: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Record a performance metric
    pub fn record_metric(&self, metric: PerformanceMetric) {
        let mut metrics = self.metrics.lock().unwrap();
        metrics.push(metric.clone());

        // Update summary
        let key = format!("{} {}", metric.method, metric.path);
        let mut summary = self.summary.lock().unwrap();
        let entry = summary.entry(key).or_insert_with(Default::default);

        entry.count += 1;
        entry.total_latency_ms += metric.latency_ms;
        entry.avg_latency_ms = entry.total_latency_ms as f64 / entry.count as f64;
        entry.min_latency_ms = entry.min_latency_ms.min(metric.latency_ms).max(1);
        entry.max_latency_ms = entry.max_latency_ms.max(metric.latency_ms);

        if metric.status >= 400 {
            entry.error_count += 1;
        } else {
            entry.success_count += 1;
        }
    }

    /// Get summary for a specific endpoint
    pub fn get_summary(&self, method: &str, path: &str) -> Option<MetricsSummary> {
        let key = format!("{} {}", method, path);
        self.summary.lock().unwrap().get(&key).cloned()
    }

    /// Get all metrics (last N)
    pub fn get_recent_metrics(&self, count: usize) -> Vec<PerformanceMetric> {
        let metrics = self.metrics.lock().unwrap();
        metrics.iter().rev().take(count).cloned().collect()
    }

    /// Get all summaries
    pub fn get_all_summaries(&self) -> HashMap<String, MetricsSummary> {
        self.summary.lock().unwrap().clone()
    }

    /// Reset all metrics
    pub fn reset(&self) {
        self.metrics.lock().unwrap().clear();
        self.summary.lock().unwrap().clear();
    }

    /// Get percentile latency (e.g., p95, p99)
    pub fn get_percentile_latency(&self, method: &str, path: &str, percentile: f64) -> Option<u64> {
        let key = format!("{} {}", method, path);
        let metrics = self.metrics.lock().unwrap();

        let mut endpoint_metrics: Vec<u64> = metrics
            .iter()
            .filter(|m| format!("{} {}", m.method, m.path) == key)
            .map(|m| m.latency_ms)
            .collect();

        if endpoint_metrics.is_empty() {
            return None;
        }

        endpoint_metrics.sort();
        let index = ((percentile / 100.0) * (endpoint_metrics.len() - 1) as f64).round() as usize;
        Some(endpoint_metrics[index.min(endpoint_metrics.len() - 1)])
    }

    /// Get error rate (percentage)
    pub fn get_error_rate(&self, method: &str, path: &str) -> Option<f64> {
        let summary = self.get_summary(method, path)?;
        let total = summary.success_count + summary.error_count;
        if total == 0 {
            return None;
        }
        Some((summary.error_count as f64 / total as f64) * 100.0)
    }

    /// Get throughput (requests per second, averaged)
    pub fn get_throughput(&self, method: &str, path: &str) -> Option<f64> {
        let summary = self.get_summary(method, path)?;
        if summary.count == 0 {
            return None;
        }
        // Rough estimate: assume metrics collected over 1 minute windows
        Some(summary.count as f64 / 60.0)
    }
}

/// Performance monitoring middleware layer
pub struct PerformanceMonitoringLayer {
    metrics_store: PerformanceMetricsStore,
}

impl PerformanceMonitoringLayer {
    /// Create new performance monitoring layer
    pub fn new(metrics_store: PerformanceMetricsStore) -> Self {
        Self { metrics_store }
    }
}

impl<S> Layer<S> for PerformanceMonitoringLayer {
    type Service = PerformanceMonitoringMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        PerformanceMonitoringMiddleware {
            inner,
            metrics_store: self.metrics_store.clone(),
        }
    }
}

/// Performance monitoring middleware service
pub struct PerformanceMonitoringMiddleware<S> {
    inner: S,
    metrics_store: PerformanceMetricsStore,
}

impl<S> Service<Request<Body>> for PerformanceMonitoringMiddleware<S>
where
    S: Service<Request<Body>, Response = Response> + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let start = Instant::now();
        let method = req.method().to_string();
        let path = req.uri().path().to_string();
        let metrics_store = self.metrics_store.clone();

        let future = self.inner.call(req);

        Box::pin(async move {
            let response = future.await?;
            let latency = start.elapsed().as_millis() as u64;
            let status = response.status().as_u16();

            let metric = PerformanceMetric {
                path,
                method,
                status,
                latency_ms: latency,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            };

            metrics_store.record_metric(metric);
            Ok(response)
        })
    }
}

/// Performance health check
pub fn is_performance_healthy(
    store: &PerformanceMetricsStore,
    max_avg_latency_ms: u64,
    max_error_rate: f64,
) -> bool {
    let summaries = store.get_all_summaries();
    for (_, summary) in summaries {
        if summary.avg_latency_ms as u64 > max_avg_latency_ms {
            return false;
        }
        if summary.count > 0 {
            let error_rate = (summary.error_count as f64 / (summary.count) as f64) * 100.0;
            if error_rate > max_error_rate {
                return false;
            }
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_store() {
        let store = PerformanceMetricsStore::new();

        let metric = PerformanceMetric {
            path: "/api/users".to_string(),
            method: "GET".to_string(),
            status: 200,
            latency_ms: 50,
            timestamp: 0,
        };

        store.record_metric(metric);

        let summary = store.get_summary("GET", "/api/users");
        assert!(summary.is_some());

        let summary = summary.unwrap();
        assert_eq!(summary.count, 1);
        assert_eq!(summary.min_latency_ms, 50);
        assert_eq!(summary.max_latency_ms, 50);
    }

    #[test]
    fn test_error_rate_calculation() {
        let store = PerformanceMetricsStore::new();

        for _ in 0..9 {
            store.record_metric(PerformanceMetric {
                path: "/api/test".to_string(),
                method: "GET".to_string(),
                status: 200,
                latency_ms: 10,
                timestamp: 0,
            });
        }

        store.record_metric(PerformanceMetric {
            path: "/api/test".to_string(),
            method: "GET".to_string(),
            status: 500,
            latency_ms: 50,
            timestamp: 0,
        });

        let error_rate = store.get_error_rate("GET", "/api/test");
        assert_eq!(error_rate, Some(10.0));
    }

    #[test]
    fn test_percentile_calculation() {
        let store = PerformanceMetricsStore::new();

        for i in 0..100 {
            store.record_metric(PerformanceMetric {
                path: "/api/test".to_string(),
                method: "GET".to_string(),
                status: 200,
                latency_ms: (i + 1) as u64,
                timestamp: 0,
            });
        }

        let p95 = store.get_percentile_latency("GET", "/api/test", 95.0);
        assert!(p95.is_some());
        let p95 = p95.unwrap();
        assert!(p95 >= 90 && p95 <= 100);
    }
}

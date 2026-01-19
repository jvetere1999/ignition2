/**
 * Metrics Collection Utilities
 *
 * Provides histogram, counter, gauge, and summary metrics collection
 * for monitoring application performance and health.
 */

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// Metric types
#[derive(Debug, Clone)]
pub enum MetricType {
    Counter,
    Gauge,
    Histogram,
    Summary,
}

/// Histogram bucket
#[derive(Clone, Debug)]
pub struct Bucket {
    pub upper_bound: f64,
    pub count: u64,
}

/// Summary statistics
#[derive(Clone, Debug)]
pub struct Summary {
    pub count: u64,
    pub sum: f64,
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub percentile_50: f64,
    pub percentile_95: f64,
    pub percentile_99: f64,
}

impl Summary {
    pub fn calculate(values: &[f64]) -> Self {
        if values.is_empty() {
            return Self {
                count: 0,
                sum: 0.0,
                min: 0.0,
                max: 0.0,
                mean: 0.0,
                percentile_50: 0.0,
                percentile_95: 0.0,
                percentile_99: 0.0,
            };
        }

        let mut sorted = values.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let sum: f64 = sorted.iter().sum();
        let count = sorted.len() as u64;
        let mean = sum / count as f64;

        Self {
            count,
            sum,
            min: sorted[0],
            max: sorted[sorted.len() - 1],
            mean,
            percentile_50: sorted[sorted.len() / 2],
            percentile_95: sorted[(sorted.len() * 95) / 100],
            percentile_99: sorted[(sorted.len() * 99) / 100],
        }
    }
}

/// Counter metric
pub struct Counter {
    value: Arc<AtomicU64>,
}

impl Counter {
    pub fn new() -> Self {
        Self {
            value: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn increment(&self) {
        self.value.fetch_add(1, Ordering::Relaxed);
    }

    pub fn increment_by(&self, delta: u64) {
        self.value.fetch_add(delta, Ordering::Relaxed);
    }

    pub fn get(&self) -> u64 {
        self.value.load(Ordering::Relaxed)
    }
}

impl Default for Counter {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for Counter {
    fn clone(&self) -> Self {
        Self {
            value: Arc::clone(&self.value),
        }
    }
}

/// Gauge metric
pub struct Gauge {
    value: Arc<AtomicU64>,
}

impl Gauge {
    pub fn new() -> Self {
        Self {
            value: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn set(&self, value: f64) {
        self.value.store(value.to_bits(), Ordering::Relaxed);
    }

    pub fn get(&self) -> f64 {
        f64::from_bits(self.value.load(Ordering::Relaxed))
    }

    pub fn increment(&self, delta: f64) {
        let current = self.get();
        self.set(current + delta);
    }
}

impl Default for Gauge {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for Gauge {
    fn clone(&self) -> Self {
        Self {
            value: Arc::clone(&self.value),
        }
    }
}

/// Histogram metric
pub struct Histogram {
    buckets: Vec<Bucket>,
    values: Vec<f64>,
}

impl Histogram {
    /// Create histogram with custom buckets
    pub fn with_buckets(upper_bounds: Vec<f64>) -> Self {
        let buckets = upper_bounds
            .into_iter()
            .map(|bound| Bucket {
                upper_bound: bound,
                count: 0,
            })
            .collect();

        Self {
            buckets,
            values: Vec::new(),
        }
    }

    /// Default histogram with standard buckets
    pub fn default_buckets() -> Self {
        Self::with_buckets(vec![
            0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
        ])
    }

    /// Record a value
    pub fn record(&mut self, value: f64) {
        self.values.push(value);
        for bucket in &mut self.buckets {
            if value <= bucket.upper_bound {
                bucket.count += 1;
            }
        }
    }

    /// Get percentile
    pub fn percentile(&self, p: f64) -> f64 {
        if self.values.is_empty() {
            return 0.0;
        }

        let mut sorted = self.values.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let index = ((p / 100.0) * sorted.len() as f64).ceil() as usize;
        sorted[index.saturating_sub(1)]
    }
}

impl Clone for Histogram {
    fn clone(&self) -> Self {
        Self {
            buckets: self.buckets.clone(),
            values: self.values.clone(),
        }
    }
}

/// Metrics registry
pub struct MetricsRegistry {
    counters: HashMap<String, Counter>,
    gauges: HashMap<String, Gauge>,
}

impl MetricsRegistry {
    pub fn new() -> Self {
        Self {
            counters: HashMap::new(),
            gauges: HashMap::new(),
        }
    }

    pub fn counter(&mut self, name: impl Into<String>) -> Counter {
        let name = name.into();
        self.counters
            .entry(name)
            .or_insert_with(Counter::new)
            .clone()
    }

    pub fn gauge(&mut self, name: impl Into<String>) -> Gauge {
        let name = name.into();
        self.gauges
            .entry(name)
            .or_insert_with(Gauge::new)
            .clone()
    }

    pub fn get_counter(&self, name: &str) -> Option<u64> {
        self.counters.get(name).map(|c| c.get())
    }

    pub fn get_gauge(&self, name: &str) -> Option<f64> {
        self.gauges.get(name).map(|g| g.get())
    }
}

impl Default for MetricsRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_counter() {
        let counter = Counter::new();
        counter.increment();
        counter.increment_by(5);
        assert_eq!(counter.get(), 6);
    }

    #[test]
    fn test_gauge() {
        let gauge = Gauge::new();
        gauge.set(10.5);
        assert_eq!(gauge.get(), 10.5);
        gauge.increment(2.5);
        assert_eq!(gauge.get(), 13.0);
    }

    #[test]
    fn test_histogram() {
        let mut hist = Histogram::default_buckets();
        for i in 0..100 {
            hist.record(i as f64 / 100.0);
        }
        assert!(hist.percentile(50.0) >= 0.0);
    }

    #[test]
    fn test_summary() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let summary = Summary::calculate(&values);
        assert_eq!(summary.count, 5);
        assert_eq!(summary.mean, 3.0);
    }
}

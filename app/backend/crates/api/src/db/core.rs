//! Core database utilities
//!
//! Centralized database access layer with observability:
//! - Structured logging for all queries
//! - Error context preservation
//! - Query timing metrics
//! - Span-based tracing for distributed debugging

use sqlx::PgPool;
use std::time::Instant;
use tracing::{instrument, Span};
use uuid::Uuid;

use crate::error::AppError;

/// Database query context for enhanced error reporting
#[derive(Debug, Clone)]
pub struct QueryContext {
    pub operation: &'static str,
    pub table: &'static str,
    pub user_id: Option<Uuid>,
    pub entity_id: Option<Uuid>,
}

impl QueryContext {
    pub fn new(operation: &'static str, table: &'static str) -> Self {
        Self {
            operation,
            table,
            user_id: None,
            entity_id: None,
        }
    }

    pub fn with_user(mut self, user_id: Uuid) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_entity(mut self, entity_id: Uuid) -> Self {
        self.entity_id = Some(entity_id);
        self
    }
}

/// Execute a database query with observability
/// 
/// Wraps sqlx queries with:
/// - Timing metrics
/// - Structured error logging with context
/// - Tracing spans for distributed debugging
#[instrument(
    name = "db.query",
    skip(pool, query_fn),
    fields(
        db.operation = %ctx.operation,
        db.table = %ctx.table,
        db.user_id = ?ctx.user_id,
        db.entity_id = ?ctx.entity_id,
        db.duration_ms,
        db.success,
    )
)]
pub async fn execute_query<T, F, Fut>(
    pool: &PgPool,
    ctx: QueryContext,
    query_fn: F,
) -> Result<T, AppError>
where
    F: FnOnce(&PgPool) -> Fut,
    Fut: std::future::Future<Output = Result<T, sqlx::Error>>,
{
    let start = Instant::now();
    let result = query_fn(pool).await;
    let duration_ms = start.elapsed().as_millis() as u64;

    // Record timing in span
    Span::current().record("db.duration_ms", duration_ms);

    match result {
        Ok(value) => {
            Span::current().record("db.success", true);
            
            // Log slow queries (> 100ms)
            if duration_ms > 100 {
                tracing::warn!(
                    operation = %ctx.operation,
                    table = %ctx.table,
                    duration_ms = duration_ms,
                    "Slow database query detected"
                );
            }
            
            Ok(value)
        }
        Err(e) => {
            Span::current().record("db.success", false);
            
            // Detailed error logging
            tracing::error!(
                operation = %ctx.operation,
                table = %ctx.table,
                user_id = ?ctx.user_id,
                entity_id = ?ctx.entity_id,
                duration_ms = duration_ms,
                error = %e,
                error_debug = ?e,
                "Database query failed"
            );

            // Create enriched error with context
            Err(AppError::DatabaseWithContext {
                operation: ctx.operation.to_string(),
                table: ctx.table.to_string(),
                message: e.to_string(),
                user_id: ctx.user_id,
                entity_id: ctx.entity_id,
            })
        }
    }
}

/// Execute a query returning a single optional row
#[instrument(
    name = "db.fetch_optional",
    skip(pool, query_fn),
    fields(
        db.operation = %ctx.operation,
        db.table = %ctx.table,
        db.found,
    )
)]
pub async fn fetch_optional<T, F, Fut>(
    pool: &PgPool,
    ctx: QueryContext,
    query_fn: F,
) -> Result<Option<T>, AppError>
where
    F: FnOnce(&PgPool) -> Fut,
    Fut: std::future::Future<Output = Result<Option<T>, sqlx::Error>>,
{
    let start = Instant::now();
    let result = query_fn(pool).await;
    let duration_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(maybe_value) => {
            Span::current().record("db.found", maybe_value.is_some());
            
            if duration_ms > 100 {
                tracing::warn!(
                    operation = %ctx.operation,
                    table = %ctx.table,
                    duration_ms = duration_ms,
                    "Slow database query detected"
                );
            }
            
            Ok(maybe_value)
        }
        Err(e) => {
            tracing::error!(
                operation = %ctx.operation,
                table = %ctx.table,
                user_id = ?ctx.user_id,
                entity_id = ?ctx.entity_id,
                duration_ms = duration_ms,
                error = %e,
                error_debug = ?e,
                "Database fetch_optional failed"
            );

            Err(AppError::DatabaseWithContext {
                operation: ctx.operation.to_string(),
                table: ctx.table.to_string(),
                message: e.to_string(),
                user_id: ctx.user_id,
                entity_id: ctx.entity_id,
            })
        }
    }
}

/// Execute a query returning multiple rows
#[instrument(
    name = "db.fetch_all",
    skip(pool, query_fn),
    fields(
        db.operation = %ctx.operation,
        db.table = %ctx.table,
        db.row_count,
    )
)]
pub async fn fetch_all<T, F, Fut>(
    pool: &PgPool,
    ctx: QueryContext,
    query_fn: F,
) -> Result<Vec<T>, AppError>
where
    F: FnOnce(&PgPool) -> Fut,
    Fut: std::future::Future<Output = Result<Vec<T>, sqlx::Error>>,
{
    let start = Instant::now();
    let result = query_fn(pool).await;
    let duration_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(rows) => {
            Span::current().record("db.row_count", rows.len() as i64);
            
            if duration_ms > 100 {
                tracing::warn!(
                    operation = %ctx.operation,
                    table = %ctx.table,
                    duration_ms = duration_ms,
                    row_count = rows.len(),
                    "Slow database query detected"
                );
            }
            
            Ok(rows)
        }
        Err(e) => {
            tracing::error!(
                operation = %ctx.operation,
                table = %ctx.table,
                user_id = ?ctx.user_id,
                entity_id = ?ctx.entity_id,
                duration_ms = duration_ms,
                error = %e,
                error_debug = ?e,
                "Database fetch_all failed"
            );

            Err(AppError::DatabaseWithContext {
                operation: ctx.operation.to_string(),
                table: ctx.table.to_string(),
                message: e.to_string(),
                user_id: ctx.user_id,
                entity_id: ctx.entity_id,
            })
        }
    }
}

/// Simple error wrapper for quick migration - use when migrating existing code
/// Logs the error with context before converting to AppError
pub fn db_error(ctx: &QueryContext, e: sqlx::Error) -> AppError {
    tracing::error!(
        operation = %ctx.operation,
        table = %ctx.table,
        user_id = ?ctx.user_id,
        entity_id = ?ctx.entity_id,
        error = %e,
        error_debug = ?e,
        "Database error"
    );
    
    AppError::DatabaseWithContext {
        operation: ctx.operation.to_string(),
        table: ctx.table.to_string(),
        message: e.to_string(),
        user_id: ctx.user_id,
        entity_id: ctx.entity_id,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_context_builder() {
        let user_id = Uuid::new_v4();
        let entity_id = Uuid::new_v4();
        
        let ctx = QueryContext::new("SELECT", "reference_tracks")
            .with_user(user_id)
            .with_entity(entity_id);
        
        assert_eq!(ctx.operation, "SELECT");
        assert_eq!(ctx.table, "reference_tracks");
        assert_eq!(ctx.user_id, Some(user_id));
        assert_eq!(ctx.entity_id, Some(entity_id));
    }
}

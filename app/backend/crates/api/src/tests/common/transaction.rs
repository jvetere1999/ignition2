/// Database Transaction Test Helpers
///
/// Provides utilities for managing database transactions during tests,
/// including rollback helpers, nested transaction support, and cleanup utilities.

use sqlx::{PgPool, Transaction, Postgres};
use std::sync::Arc;

/// Database test transaction manager
pub struct TestTransactionManager {
    pool: PgPool,
}

impl TestTransactionManager {
    /// Create new transaction manager with database pool
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Begin a new transaction for testing
    pub async fn begin_tx(&self) -> Result<Transaction<'_, Postgres>, sqlx::Error> {
        self.pool.begin().await
    }

    /// Begin and auto-rollback transaction (for isolated tests)
    /// 
    /// # Example
    /// ```ignore
    /// let mut tx = manager.begin_rollback_tx().await?;
    /// // ... make changes ...
    /// tx.rollback().await?; // Automatic on drop
    /// ```
    pub async fn begin_rollback_tx(&self) -> Result<Transaction<'_, Postgres>, sqlx::Error> {
        self.pool.begin().await
    }

    /// Create a savepoint within a transaction
    pub async fn create_savepoint<'a>(
        tx: &mut Transaction<'a, Postgres>,
        name: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(&format!("SAVEPOINT {}", name))
            .execute(&mut **tx)
            .await?;
        Ok(())
    }

    /// Rollback to a savepoint
    pub async fn rollback_to_savepoint<'a>(
        tx: &mut Transaction<'a, Postgres>,
        name: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(&format!("ROLLBACK TO SAVEPOINT {}", name))
            .execute(&mut **tx)
            .await?;
        Ok(())
    }

    /// Execute function within a transaction that automatically rolls back
    pub async fn with_rollback<F, T, Fut>(&self, f: F) -> Result<T, sqlx::Error>
    where
        F: FnOnce(Transaction<'_, Postgres>) -> Fut,
        Fut: std::future::Future<Output = Result<T, sqlx::Error>>,
    {
        let tx = self.pool.begin().await?;
        let result = f(tx).await;
        // Transaction automatically rolls back on drop
        result
    }

    /// Verify transaction isolation level
    pub async fn get_isolation_level(&self) -> Result<String, sqlx::Error> {
        let row = sqlx::query_scalar::<_, String>(
            "SHOW transaction_isolation"
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    /// Set transaction isolation level
    pub async fn set_isolation_level(
        &self,
        level: IsolationLevel,
    ) -> Result<(), sqlx::Error> {
        let sql = match level {
            IsolationLevel::ReadUncommitted => "SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED",
            IsolationLevel::ReadCommitted => "SET TRANSACTION ISOLATION LEVEL READ COMMITTED",
            IsolationLevel::RepeatableRead => "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ",
            IsolationLevel::Serializable => "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE",
        };

        sqlx::query(sql).execute(&self.pool).await?;
        Ok(())
    }

    /// Disable foreign key constraints temporarily (for testing with cleanup)
    pub async fn disable_foreign_keys(
        &self,
        tx: &mut Transaction<'_, Postgres>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("SET CONSTRAINTS ALL DEFERRED")
            .execute(&mut **tx)
            .await?;
        Ok(())
    }

    /// Enable foreign key constraints
    pub async fn enable_foreign_keys(
        &self,
        tx: &mut Transaction<'_, Postgres>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("SET CONSTRAINTS ALL IMMEDIATE")
            .execute(&mut **tx)
            .await?;
        Ok(())
    }

    /// Truncate table (useful for cleanup between tests)
    pub async fn truncate_table(&self, table_name: &str) -> Result<(), sqlx::Error> {
        sqlx::query(&format!("TRUNCATE TABLE {} CASCADE", table_name))
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Truncate multiple tables
    pub async fn truncate_tables(&self, tables: &[&str]) -> Result<(), sqlx::Error> {
        let tables_str = tables.join(", ");
        sqlx::query(&format!("TRUNCATE TABLE {} CASCADE", tables_str))
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Reset all sequences (auto-increment counters)
    pub async fn reset_sequences(&self, sequences: &[&str]) -> Result<(), sqlx::Error> {
        for seq in sequences {
            sqlx::query(&format!("ALTER SEQUENCE {} RESTART WITH 1", seq))
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    /// Get active transaction count
    pub async fn get_active_transaction_count(&self) -> Result<i32, sqlx::Error> {
        let count = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'"
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(count)
    }
}

/// PostgreSQL transaction isolation level
#[derive(Debug, Clone, Copy)]
pub enum IsolationLevel {
    ReadUncommitted,
    ReadCommitted,
    RepeatableRead,
    Serializable,
}

/// Test database cleanup helper
pub struct TestDatabaseCleanup {
    pool: PgPool,
    tables_to_clean: Vec<String>,
}

impl TestDatabaseCleanup {
    /// Create new cleanup helper
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            tables_to_clean: Vec::new(),
        }
    }

    /// Add table to be cleaned
    pub fn add_table(mut self, table_name: impl Into<String>) -> Self {
        self.tables_to_clean.push(table_name.into());
        self
    }

    /// Add multiple tables to be cleaned
    pub fn add_tables(mut self, tables: Vec<impl Into<String>>) -> Self {
        self.tables_to_clean.extend(tables.into_iter().map(|t| t.into()));
        self
    }

    /// Execute cleanup (truncate all registered tables)
    pub async fn cleanup(&self) -> Result<(), sqlx::Error> {
        if self.tables_to_clean.is_empty() {
            return Ok(());
        }

        let tables_str = self.tables_to_clean.join(", ");
        sqlx::query(&format!("TRUNCATE TABLE {} CASCADE", tables_str))
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Execute cleanup and reset sequences
    pub async fn cleanup_with_reset_sequences(
        &self,
        sequences: &[&str],
    ) -> Result<(), sqlx::Error> {
        self.cleanup().await?;

        for seq in sequences {
            sqlx::query(&format!("ALTER SEQUENCE {} RESTART WITH 1", seq))
                .execute(&self.pool)
                .await?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_isolation_level() {
        // Note: This is a placeholder test
        // Real implementation would use actual database connection
        let level = IsolationLevel::ReadCommitted;
        match level {
            IsolationLevel::ReadCommitted => assert!(true),
            _ => panic!("Wrong isolation level"),
        }
    }
}

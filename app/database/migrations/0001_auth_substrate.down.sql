-- ============================================================================
-- Migration: 0001_auth_substrate (DOWN)
-- Purpose: Rollback auth substrate migration
-- ============================================================================

-- Drop views first
DROP VIEW IF EXISTS user_session_count;
DROP VIEW IF EXISTS user_with_roles;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_tokens();
DROP FUNCTION IF EXISTS cleanup_expired_sessions();

-- Drop activity events
DROP TABLE IF EXISTS activity_events;

-- Drop audit log
DROP TABLE IF EXISTS audit_log;

-- Drop RBAC tables
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_entitlements;
DROP TABLE IF EXISTS entitlements;
DROP TABLE IF EXISTS roles;

-- Drop auth tables
DROP TABLE IF EXISTS authenticators;
DROP TABLE IF EXISTS verification_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;

-- Drop trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;

-- Drop users table
DROP TABLE IF EXISTS users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Note: Extensions are not dropped as they may be used by other schemas


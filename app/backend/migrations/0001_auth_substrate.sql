-- ============================================================================
-- Migration: 0001_auth_substrate
-- Created: January 6, 2026
-- Purpose: Identity, authentication, sessions, and RBAC substrate
--
-- This is the foundational migration for the Postgres backend.
-- Implements:
--   - users table with proper UUIDs
--   - OAuth accounts (google/azure)
--   - sessions (per DEC-001=A: force re-auth)
--   - RBAC roles/entitlements (per DEC-004=B: DB-backed roles)
--   - audit/event log for security monitoring
--
-- References:
--   - DECISIONS.md: DEC-001 (session strategy), DEC-004 (admin auth)
--   - security_model.md: session table schema, cookie strategy
--   - d1_usage_inventory.md: existing D1 schema patterns
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: USERS TABLE
-- ============================================================================

-- Core user identity table
-- Maps to D1 users table but uses native Postgres types
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Profile
    name TEXT NOT NULL DEFAULT 'User',
    email TEXT NOT NULL UNIQUE,
    email_verified TIMESTAMPTZ,
    image TEXT,

    -- Status
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    approved BOOLEAN NOT NULL DEFAULT true,
    age_verified BOOLEAN NOT NULL DEFAULT true,

    -- Terms of Service
    tos_accepted BOOLEAN NOT NULL DEFAULT false,
    tos_accepted_at TIMESTAMPTZ,
    tos_version TEXT,

    -- Activity tracking
    last_activity_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: OAUTH ACCOUNTS TABLE
-- ============================================================================

-- OAuth provider account links (google, azure)
-- Maps to D1 accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- OAuth provider info
    type TEXT NOT NULL DEFAULT 'oauth',
    provider TEXT NOT NULL CHECK (provider IN ('google', 'azure-ad', 'credentials')),
    provider_account_id TEXT NOT NULL,

    -- Tokens (encrypted at rest in production)
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one account per provider per user
    UNIQUE(provider, provider_account_id)
);

-- Indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider);

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: SESSIONS TABLE
-- ============================================================================

-- Session management (per DEC-001=A: force re-auth, per security_model.md)
-- Enhanced from D1 sessions with activity tracking and metadata
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session token (used in cookie)
    token TEXT NOT NULL UNIQUE,

    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,

    -- Activity tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata for security audit
    user_agent TEXT,
    ip_address INET,

    -- Rotation tracking (for session fixation prevention)
    rotated_from UUID REFERENCES sessions(id) ON DELETE SET NULL
);

-- Indexes for session lookup and cleanup
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity_at);

-- ============================================================================
-- SECTION 4: VERIFICATION TOKENS TABLE
-- ============================================================================

-- Email verification tokens (OAuth magic links if needed)
CREATE TABLE verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (identifier, token)
);

CREATE INDEX idx_verification_tokens_expires ON verification_tokens(expires);

-- ============================================================================
-- SECTION 5: AUTHENTICATORS TABLE (WebAuthn/Passkeys)
-- ============================================================================

-- WebAuthn/Passkey credentials (future-proofing)
CREATE TABLE authenticators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Credential info
    credential_id TEXT NOT NULL UNIQUE,
    provider_account_id TEXT NOT NULL,
    credential_public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,

    -- Device info
    credential_device_type TEXT NOT NULL DEFAULT 'singleDevice',
    credential_backed_up BOOLEAN NOT NULL DEFAULT false,
    transports TEXT, -- JSON array of transports

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authenticators_user_id ON authenticators(user_id);
CREATE INDEX idx_authenticators_credential_id ON authenticators(credential_id);

-- ============================================================================
-- SECTION 6: RBAC - ROLES & ENTITLEMENTS (per DEC-004=B)
-- ============================================================================

-- Role definitions (extensible RBAC)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Role hierarchy (optional parent role)
    parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (name, description) VALUES
    ('user', 'Standard user with basic access'),
    ('admin', 'Administrator with full access'),
    ('moderator', 'Moderator with limited admin access');

-- Entitlements (granular permissions)
CREATE TABLE entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    resource TEXT NOT NULL,  -- e.g., 'users', 'quests', 'admin'
    action TEXT NOT NULL,    -- e.g., 'read', 'write', 'delete', 'admin'

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default entitlements
INSERT INTO entitlements (name, description, resource, action) VALUES
    ('users:read', 'Read user profiles', 'users', 'read'),
    ('users:write', 'Update user profiles', 'users', 'write'),
    ('users:delete', 'Delete user accounts', 'users', 'delete'),
    ('admin:access', 'Access admin console', 'admin', 'access'),
    ('admin:users', 'Manage users in admin', 'admin', 'users'),
    ('admin:content', 'Manage content in admin', 'admin', 'content'),
    ('admin:backup', 'Create/restore backups', 'admin', 'backup'),
    ('quests:read', 'Read quests', 'quests', 'read'),
    ('quests:write', 'Create/edit quests', 'quests', 'write'),
    ('quests:admin', 'Admin quest management', 'quests', 'admin'),
    ('feedback:read', 'Read user feedback', 'feedback', 'read'),
    ('feedback:write', 'Submit feedback', 'feedback', 'write'),
    ('feedback:admin', 'Manage all feedback', 'feedback', 'admin');

-- Role-to-Entitlement mapping
CREATE TABLE role_entitlements (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    entitlement_id UUID NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (role_id, entitlement_id)
);

-- Seed role-entitlement mappings
-- User role gets basic permissions
INSERT INTO role_entitlements (role_id, entitlement_id)
SELECT r.id, e.id FROM roles r, entitlements e
WHERE r.name = 'user' AND e.name IN ('users:read', 'users:write', 'quests:read', 'feedback:write');

-- Admin role gets all permissions
INSERT INTO role_entitlements (role_id, entitlement_id)
SELECT r.id, e.id FROM roles r, entitlements e
WHERE r.name = 'admin';

-- Moderator role gets specific permissions
INSERT INTO role_entitlements (role_id, entitlement_id)
SELECT r.id, e.id FROM roles r, entitlements e
WHERE r.name = 'moderator' AND e.name IN (
    'users:read', 'users:write', 'quests:read', 'quests:write',
    'feedback:read', 'feedback:admin', 'admin:access'
);

-- User-to-Role mapping (users can have multiple roles)
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Grant metadata
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional expiration

    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- ============================================================================
-- SECTION 7: AUDIT LOG
-- ============================================================================

-- Security audit log for admin monitoring
-- Tracks security-relevant events
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

    -- Event info
    event_type TEXT NOT NULL,  -- e.g., 'login', 'logout', 'role_change', 'data_export'
    resource_type TEXT,        -- e.g., 'user', 'quest', 'backup'
    resource_id TEXT,          -- ID of affected resource

    -- Details
    action TEXT NOT NULL,      -- e.g., 'create', 'update', 'delete', 'access'
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'denied')),
    details JSONB,             -- Additional context

    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,           -- Correlation ID from request

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- Partial index for security events
CREATE INDEX idx_audit_log_security ON audit_log(event_type, created_at)
WHERE event_type IN ('login', 'logout', 'login_failed', 'role_change', 'session_rotated');

-- ============================================================================
-- SECTION 8: ACTIVITY EVENTS (General Event Log)
-- ============================================================================

-- General activity events for user actions (gamification, analytics)
-- Separate from audit_log which is security-focused
CREATE TABLE activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Event info
    event_type TEXT NOT NULL,  -- e.g., 'focus_complete', 'quest_complete', 'achievement_earned'
    category TEXT,             -- e.g., 'focus', 'gamification', 'learning'

    -- Event data
    metadata JSONB,            -- Flexible event-specific data

    -- Points/rewards (if applicable)
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for activity queries
CREATE INDEX idx_activity_events_user_id ON activity_events(user_id);
CREATE INDEX idx_activity_events_type ON activity_events(event_type);
CREATE INDEX idx_activity_events_created_at ON activity_events(created_at);
CREATE INDEX idx_activity_events_category ON activity_events(category);

-- Composite index for user activity queries
CREATE INDEX idx_activity_events_user_time ON activity_events(user_id, created_at DESC);

-- ============================================================================
-- SECTION 9: HELPER VIEWS
-- ============================================================================

-- View: User with roles (convenience for auth checks)
CREATE VIEW user_with_roles AS
SELECT
    u.id,
    u.email,
    u.name,
    u.role as legacy_role,  -- Keep legacy role column for compatibility
    u.approved,
    u.age_verified,
    u.tos_accepted,
    ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles,
    ARRAY_AGG(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL) as entitlements
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_entitlements re ON r.id = re.role_id
LEFT JOIN entitlements e ON re.entitlement_id = e.id
GROUP BY u.id, u.email, u.name, u.role, u.approved, u.age_verified, u.tos_accepted;

-- View: Active sessions count per user
CREATE VIEW user_session_count AS
SELECT
    user_id,
    COUNT(*) as active_sessions,
    MAX(last_activity_at) as last_active
FROM sessions
WHERE expires_at > NOW()
GROUP BY user_id;

-- ============================================================================
-- SECTION 10: CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM verification_tokens WHERE expires < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;


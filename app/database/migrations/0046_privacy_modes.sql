-- Migration: Privacy Modes Schema
-- Date: 2026-01-19
-- Description: Add privacy mode support for user content classification

-- Create privacy_mode enum type
CREATE TYPE privacy_mode AS ENUM ('standard', 'private');

-- Create privacy_preferences table
CREATE TABLE privacy_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Default privacy mode for new content
    default_mode privacy_mode DEFAULT 'standard' NOT NULL,
    
    -- UI controls
    show_privacy_toggle BOOLEAN DEFAULT true NOT NULL,
    exclude_private_from_search BOOLEAN DEFAULT false NOT NULL,
    
    -- Retention policies (in days, 0 = no special retention)
    private_content_retention_days INT DEFAULT 30 CHECK (private_content_retention_days >= 0 AND private_content_retention_days <= 365),
    standard_content_retention_days INT DEFAULT 365 CHECK (standard_content_retention_days >= 0 AND standard_content_retention_days <= 365),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_privacy_preferences_user_id ON privacy_preferences(user_id);

-- Alter ideas table to support privacy mode
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS privacy_mode privacy_mode DEFAULT 'standard' NOT NULL;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS privacy_created_at TIMESTAMPTZ;

-- Alter journal entries to support privacy mode (if journal table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS privacy_mode privacy_mode DEFAULT 'standard' NOT NULL;
        ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS privacy_created_at TIMESTAMPTZ;
    END IF;
END $$;

-- Alter infobase to support privacy mode (if infobase table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'infobase_entries') THEN
        ALTER TABLE infobase_entries ADD COLUMN IF NOT EXISTS privacy_mode privacy_mode DEFAULT 'standard' NOT NULL;
        ALTER TABLE infobase_entries ADD COLUMN IF NOT EXISTS privacy_created_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for privacy mode queries
CREATE INDEX IF NOT EXISTS idx_ideas_privacy_mode ON ideas(user_id, privacy_mode);
CREATE INDEX IF NOT EXISTS idx_ideas_privacy_created_at ON ideas(user_id, privacy_created_at DESC) WHERE privacy_mode = 'private';

-- Audit table for privacy preference changes
CREATE TABLE IF NOT EXISTS privacy_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL, -- 'mode_changed', 'retention_updated', etc.
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_privacy_audit_log_user_id ON privacy_audit_log(user_id, created_at DESC);

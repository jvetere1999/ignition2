-- 0019_user_inbox_tables.sql
-- User inbox/quick capture system
-- Replaces localStorage inbox storage with backend persistence

CREATE TABLE user_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_user_inbox_user_id ON user_inbox(user_id);
CREATE INDEX idx_user_inbox_created_at ON user_inbox(created_at DESC);
CREATE INDEX idx_user_inbox_tags ON user_inbox USING GIN(tags);

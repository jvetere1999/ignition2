-- 0021_user_references_library.sql
-- User reference library organization
-- Replaces localStorage reference storage with backend persistence

CREATE TABLE user_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT,
    category VARCHAR(100),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_references_user_id ON user_references(user_id);
CREATE INDEX idx_user_references_category ON user_references(category);
CREATE INDEX idx_user_references_is_pinned ON user_references(is_pinned);
CREATE INDEX idx_user_references_tags ON user_references USING GIN(tags);

-- 0020_focus_music_libraries.sql
-- Focus mode music/ambient libraries
-- Replaces localStorage library storage with backend persistence

CREATE TABLE focus_libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    library_type VARCHAR(50) DEFAULT 'custom',
    tracks_count INT DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE focus_library_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID NOT NULL REFERENCES focus_libraries(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    track_title TEXT NOT NULL,
    track_url TEXT,
    duration_seconds INT,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_focus_libraries_user_id ON focus_libraries(user_id);
CREATE INDEX idx_focus_libraries_is_favorite ON focus_libraries(is_favorite);
CREATE INDEX idx_focus_library_tracks_library_id ON focus_library_tracks(library_id);

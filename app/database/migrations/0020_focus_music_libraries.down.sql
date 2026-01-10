-- 0020_focus_music_libraries.down.sql
DROP INDEX IF EXISTS idx_focus_library_tracks_library_id;
DROP INDEX IF EXISTS idx_focus_libraries_is_favorite;
DROP INDEX IF EXISTS idx_focus_libraries_user_id;
DROP TABLE IF EXISTS focus_library_tracks;
DROP TABLE IF EXISTS focus_libraries;

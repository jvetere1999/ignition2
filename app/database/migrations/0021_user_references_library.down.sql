-- 0021_user_references_library.down.sql
DROP INDEX IF EXISTS idx_user_references_tags;
DROP INDEX IF EXISTS idx_user_references_is_pinned;
DROP INDEX IF EXISTS idx_user_references_category;
DROP INDEX IF EXISTS idx_user_references_user_id;
DROP TABLE IF EXISTS user_references;

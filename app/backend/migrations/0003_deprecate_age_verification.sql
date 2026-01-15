-- Migration: Deprecate age_verified column
-- Date: 2026-01-15
-- Purpose: Remove age verification from the system - age verification is now integrated into TOS acceptance
--
-- Note: We keep the column in the database for backward compatibility but no longer read/write to it.
-- Future migration can fully drop the column if needed.

-- Column remains but is no longer used by the application
-- The age_verified column will be ignored by all backend logic

-- Add comment documenting deprecation
COMMENT ON COLUMN users.age_verified IS 'DEPRECATED: Age verification removed. No longer used by the application.';

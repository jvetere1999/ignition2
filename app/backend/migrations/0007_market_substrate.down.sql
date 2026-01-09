-- ============================================================================
-- Migration: 0007_market_substrate (DOWN)
-- Created: January 7, 2026
-- Purpose: Rollback market substrate tables
-- ============================================================================

-- Drop views
DROP VIEW IF EXISTS market_stats;
DROP VIEW IF EXISTS user_unredeemed_purchases;
DROP VIEW IF EXISTS available_market_items;

-- Drop functions
DROP FUNCTION IF EXISTS redeem_purchase(UUID);
DROP FUNCTION IF EXISTS purchase_item(UUID, TEXT, INTEGER);

-- Drop triggers
DROP TRIGGER IF EXISTS update_market_items_updated_at ON market_items;

-- Drop tables
DROP TABLE IF EXISTS user_purchases;
DROP TABLE IF EXISTS market_items;


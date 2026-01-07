-- ============================================================================
-- Migration: 0007_market_substrate
-- Created: January 7, 2026
-- Purpose: Market/shop tables (items, purchases)
--
-- This migration implements:
--   - market_items: Available items for purchase
--   - user_purchases: Purchase records
--
-- D1 → Postgres Changes:
--   - TEXT PRIMARY KEY → UUID with gen_random_uuid()
--   - INTEGER (boolean) → BOOLEAN
--   - TEXT timestamps → TIMESTAMPTZ
--   - Added proper indexes and constraints
--
-- References:
--   - d1_usage_inventory.md: D1 market tables
--   - feature_porting_playbook.md: Wave 3.4
-- ============================================================================

-- ============================================================================
-- SECTION 1: MARKET ITEMS
-- ============================================================================

-- Available items for purchase
-- Maps 1:1 from D1 market_items
CREATE TABLE market_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Unique key for referencing
    key TEXT NOT NULL UNIQUE,

    -- Item info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,

    -- Pricing
    cost_coins INTEGER NOT NULL CHECK (cost_coins >= 0),

    -- Display
    icon TEXT,
    image_url TEXT,

    -- Availability
    is_global BOOLEAN NOT NULL DEFAULT true,   -- Available to all users
    is_available BOOLEAN NOT NULL DEFAULT true, -- Currently purchasable
    is_active BOOLEAN NOT NULL DEFAULT true,    -- Show in market

    -- Consumable vs permanent
    is_consumable BOOLEAN NOT NULL DEFAULT true,
    uses_per_purchase INTEGER,  -- For consumables, NULL = unlimited

    -- Stock limits (NULL = unlimited)
    total_stock INTEGER,
    remaining_stock INTEGER,

    -- User-specific items
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_market_items_category ON market_items(category);
CREATE INDEX idx_market_items_available ON market_items(is_available, is_active) WHERE is_available = true AND is_active = true;
CREATE INDEX idx_market_items_sort ON market_items(sort_order);

-- Auto-update updated_at
CREATE TRIGGER update_market_items_updated_at
    BEFORE UPDATE ON market_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: USER PURCHASES
-- ============================================================================

-- Purchase records
-- Maps 1:1 from D1 user_purchases
CREATE TABLE user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES market_items(id) ON DELETE RESTRICT,

    -- Purchase details
    cost_coins INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,

    -- Timing
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Redemption (for consumables)
    redeemed_at TIMESTAMPTZ,
    uses_remaining INTEGER,

    -- Status
    status TEXT NOT NULL DEFAULT 'purchased' CHECK (status IN ('purchased', 'redeemed', 'refunded', 'expired')),

    -- Refund tracking
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT
);

-- Indexes
CREATE INDEX idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX idx_user_purchases_item ON user_purchases(item_id);
CREATE INDEX idx_user_purchases_user_item ON user_purchases(user_id, item_id);
CREATE INDEX idx_user_purchases_status ON user_purchases(status);
CREATE INDEX idx_user_purchases_unredeemed ON user_purchases(user_id) WHERE status = 'purchased';

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- ============================================================================

-- Function to purchase an item
CREATE OR REPLACE FUNCTION purchase_item(
    p_user_id UUID,
    p_item_key TEXT,
    p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE(purchase_id UUID, new_balance BIGINT) AS $$
DECLARE
    v_item market_items%ROWTYPE;
    v_total_cost INTEGER;
    v_purchase_id UUID;
    v_new_balance BIGINT;
BEGIN
    -- Get item
    SELECT * INTO v_item FROM market_items WHERE key = p_item_key FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found: %', p_item_key;
    END IF;

    IF NOT v_item.is_available OR NOT v_item.is_active THEN
        RAISE EXCEPTION 'Item not available for purchase';
    END IF;

    -- Check stock
    IF v_item.remaining_stock IS NOT NULL AND v_item.remaining_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;

    -- Calculate cost
    v_total_cost := v_item.cost_coins * p_quantity;

    -- Attempt to spend coins
    IF NOT spend_coins(p_user_id, v_total_cost, 'Purchase: ' || v_item.name) THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- Reduce stock if limited
    IF v_item.remaining_stock IS NOT NULL THEN
        UPDATE market_items
        SET remaining_stock = remaining_stock - p_quantity
        WHERE id = v_item.id;
    END IF;

    -- Create purchase record
    INSERT INTO user_purchases (user_id, item_id, cost_coins, quantity, uses_remaining)
    VALUES (p_user_id, v_item.id, v_total_cost, p_quantity, v_item.uses_per_purchase)
    RETURNING id INTO v_purchase_id;

    -- Get new balance
    SELECT coins INTO v_new_balance FROM user_wallet WHERE user_id = p_user_id;

    RETURN QUERY SELECT v_purchase_id, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to redeem a purchase
CREATE OR REPLACE FUNCTION redeem_purchase(
    p_purchase_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_purchase user_purchases%ROWTYPE;
BEGIN
    -- Get purchase with lock
    SELECT * INTO v_purchase FROM user_purchases WHERE id = p_purchase_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;

    IF v_purchase.status != 'purchased' THEN
        RAISE EXCEPTION 'Purchase already redeemed or refunded';
    END IF;

    -- Update purchase
    IF v_purchase.uses_remaining IS NULL OR v_purchase.uses_remaining <= 1 THEN
        -- Fully redeemed
        UPDATE user_purchases
        SET status = 'redeemed',
            redeemed_at = NOW(),
            uses_remaining = 0
        WHERE id = p_purchase_id;
    ELSE
        -- Decrement uses
        UPDATE user_purchases
        SET uses_remaining = uses_remaining - 1
        WHERE id = p_purchase_id;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 4: VIEWS
-- ============================================================================

-- View: Available market items
CREATE VIEW available_market_items AS
SELECT *
FROM market_items
WHERE is_available = true AND is_active = true
ORDER BY sort_order, name;

-- View: User's unredeemed purchases
CREATE VIEW user_unredeemed_purchases AS
SELECT
    up.*,
    mi.key as item_key,
    mi.name as item_name,
    mi.category as item_category,
    mi.icon as item_icon
FROM user_purchases up
JOIN market_items mi ON up.item_id = mi.id
WHERE up.status = 'purchased';

-- View: Purchase statistics
CREATE VIEW market_stats AS
SELECT
    mi.id as item_id,
    mi.key,
    mi.name,
    mi.category,
    COUNT(up.id) as total_purchases,
    COUNT(up.id) FILTER (WHERE up.status = 'redeemed') as total_redeemed,
    SUM(up.cost_coins) as total_revenue,
    COUNT(DISTINCT up.user_id) as unique_buyers
FROM market_items mi
LEFT JOIN user_purchases up ON mi.id = up.item_id
GROUP BY mi.id, mi.key, mi.name, mi.category;


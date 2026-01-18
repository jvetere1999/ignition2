/// Market repository - database queries for market module
/// Uses sqlx runtime binding (NO compile-time macros)
use sqlx::{Error as SqlxError, PgPool};
use uuid::Uuid;

use super::market_models::*;

pub struct MarketRepo;

impl MarketRepo {
    // ===== Market Items =====

    pub async fn get_available_items(pool: &PgPool) -> Result<Vec<MarketItem>, SqlxError> {
        sqlx::query_as::<_, MarketItem>(
            r#"
            SELECT * FROM market_items
            WHERE is_available = TRUE
            AND is_active = TRUE
            ORDER BY sort_order, name
            "#,
        )
        .fetch_all(pool)
        .await
    }

    pub async fn get_items_by_category(
        pool: &PgPool,
        category: &str,
    ) -> Result<Vec<MarketItem>, SqlxError> {
        sqlx::query_as::<_, MarketItem>(
            r#"
            SELECT * FROM market_items
            WHERE category = $1 AND is_available = TRUE AND is_active = TRUE
            ORDER BY sort_order, name
            "#,
        )
        .bind(category)
        .fetch_all(pool)
        .await
    }

    // ===== Wallet =====

    pub async fn get_wallet(pool: &PgPool, user_id: Uuid) -> Result<Option<UserWallet>, SqlxError> {
        sqlx::query_as::<_, UserWallet>(
            r#"
            SELECT * FROM user_wallet
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn get_or_create_wallet(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<UserWallet, SqlxError> {
        sqlx::query_as::<_, UserWallet>(
            r#"
            WITH existing AS (
                SELECT * FROM user_wallet WHERE user_id = $1 LIMIT 1
            ),
            inserted AS (
                INSERT INTO user_wallet (id, user_id, coins, total_earned, total_spent)
                SELECT gen_random_uuid(), $1, 0, 0, 0
                WHERE NOT EXISTS (SELECT 1 FROM existing)
                RETURNING *
            )
            SELECT * FROM inserted
            UNION ALL
            SELECT * FROM existing
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
    }

    // ===== Purchases (Inventory) =====

    pub async fn get_user_purchases(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<UserMarketPurchase>, SqlxError> {
        sqlx::query_as::<_, UserMarketPurchase>(
            r#"
            SELECT * FROM user_purchases
            WHERE user_id = $1
            ORDER BY purchased_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    pub async fn purchase_item(
        pool: &PgPool,
        user_id: Uuid,
        item_id: Uuid,
        quantity: i32,
    ) -> Result<UserMarketPurchase, SqlxError> {
        // Get item cost
        let item = sqlx::query_as::<_, MarketItem>(r#"SELECT * FROM market_items WHERE id = $1"#)
            .bind(item_id)
            .fetch_one(pool)
            .await?;

        let total_cost = item.cost_coins * quantity;

        // Check wallet has sufficient coins
        let wallet = Self::get_wallet(pool, user_id)
            .await?
            .ok_or_else(|| SqlxError::RowNotFound)?;

        if wallet.coins < total_cost {
            return Err(SqlxError::RowNotFound); // Insufficient coins
        }

        // Deduct coins and record purchase
        sqlx::query(
            r#"
            UPDATE user_wallet
            SET coins = coins - $1,
                total_spent = total_spent + $1,
                updated_at = NOW()
            WHERE user_id = $2
            "#,
        )
        .bind(total_cost)
        .bind(user_id)
        .execute(pool)
        .await?;

        // Record transaction
        sqlx::query(
            r#"
            INSERT INTO market_transactions
            (id, user_id, transaction_type, coins_amount, reason)
            VALUES (gen_random_uuid(), $1, 'spend', $2, 'purchase')
            "#,
        )
        .bind(user_id)
        .bind(total_cost)
        .execute(pool)
        .await?;

        // Create or update purchase
        let uses_remaining = if item.is_consumable {
            item.uses_per_purchase.map(|uses| uses * quantity)
        } else {
            None
        };

        sqlx::query_as::<_, UserMarketPurchase>(
            r#"
            INSERT INTO user_purchases
            (id, user_id, item_id, cost_coins, quantity, purchased_at, status, uses_remaining)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), 'purchased', $5)
            ON CONFLICT (user_id, item_id) DO UPDATE
            SET quantity = user_purchases.quantity + $4,
                cost_coins = user_purchases.cost_coins + $3,
                uses_remaining = CASE
                    WHEN $5 IS NULL THEN user_purchases.uses_remaining
                    WHEN user_purchases.uses_remaining IS NULL THEN $5
                    ELSE user_purchases.uses_remaining + $5
                END
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(item_id)
        .bind(total_cost)
        .bind(quantity)
        .bind(uses_remaining)
        .fetch_one(pool)
        .await
    }

    // ===== Rewards =====

    pub async fn get_user_rewards(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<UserReward>, SqlxError> {
        sqlx::query_as::<_, UserReward>(
            r#"
            SELECT * FROM user_rewards
            WHERE user_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    pub async fn claim_reward(pool: &PgPool, reward_id: Uuid) -> Result<bool, SqlxError> {
        let result = sqlx::query(
            r#"
            UPDATE user_rewards
            SET claimed = TRUE, claimed_at = NOW()
            WHERE id = $1 AND claimed = FALSE
            "#,
        )
        .bind(reward_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // ===== Recommendations (Extended scope) =====

    pub async fn get_recommendations(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<MarketRecommendation>, SqlxError> {
        sqlx::query_as::<_, MarketRecommendation>(
            r#"
            SELECT * FROM market_recommendations
            WHERE user_id = $1
            ORDER BY score DESC NULLS LAST
            LIMIT $2
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(pool)
        .await
    }
}

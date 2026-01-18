use chrono::{DateTime, Utc};
/// Market models for Extended scope (MVP + Full + Extended features)
/// Replaces localStorage market state with PostgreSQL-backed system
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MarketItem {
    pub id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub cost_coins: i32,
    pub rarity: Option<String>,
    pub icon: Option<String>,
    pub image_url: Option<String>,
    pub is_global: bool,
    pub is_available: bool,
    pub is_active: bool,
    pub is_consumable: bool,
    pub uses_per_purchase: Option<i32>,
    pub total_stock: Option<i32>,
    pub remaining_stock: Option<i32>,
    pub created_by_user_id: Option<Uuid>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserWallet {
    pub id: Uuid,
    pub user_id: Uuid,
    pub coins: i32,
    pub total_earned: i32,
    pub total_spent: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserReward {
    pub id: Uuid,
    pub user_id: Uuid,
    pub reward_type: String,
    pub source_id: Option<Uuid>,
    pub coins_earned: i32,
    pub xp_earned: i32,
    pub claimed: bool,
    pub claimed_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserMarketPurchase {
    pub id: Uuid,
    pub user_id: Uuid,
    pub item_id: Uuid,
    pub cost_coins: i32,
    pub quantity: i32,
    pub purchased_at: DateTime<Utc>,
    pub redeemed_at: Option<DateTime<Utc>>,
    pub uses_remaining: Option<i32>,
    pub status: String,
    pub refunded_at: Option<DateTime<Utc>>,
    pub refund_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MarketTransaction {
    pub id: Uuid,
    pub user_id: Uuid,
    pub transaction_type: String, // earn, spend, refund
    pub coins_amount: i32,
    pub item_id: Option<Uuid>,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MarketRecommendation {
    pub id: Uuid,
    pub user_id: Uuid,
    pub item_id: Uuid,
    pub score: f32, // 0.0-1.0
    pub reason: Option<String>,
    pub computed_at: DateTime<Utc>,
}

// Request/Response DTOs

#[derive(Debug, Deserialize)]
pub struct PurchaseRequest {
    pub item_id: Uuid,
    pub quantity: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct WalletResponse {
    pub total_coins: i32,
    pub earned_coins: i32,
    pub spent_coins: i32,
}

#[derive(Debug, Serialize)]
pub struct InventoryResponse {
    pub purchases: Vec<UserMarketPurchase>,
    pub total_items: usize,
}

#[derive(Debug, Serialize)]
pub struct MarketResponse {
    pub items: Vec<MarketItem>,
    pub recommendations: Vec<MarketRecommendation>,
}

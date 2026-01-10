//! Inbox repository
//!
//! Database operations for inbox items.

use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::db::inbox_models::*;
use crate::error::AppError;

pub struct InboxRepo;

impl InboxRepo {
    /// List inbox items for user
    pub async fn list(
        db: &Pool<Postgres>,
        user_id: Uuid,
        page: i64,
        page_size: i64,
    ) -> Result<InboxListResponse, AppError> {
        let offset = (page - 1) * page_size;

        let items = sqlx::query_as::<_, InboxItem>(
            "SELECT * FROM user_inbox WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(db)
        .await?;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM user_inbox WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(db)
        .await?;

        Ok(InboxListResponse {
            items: items.into_iter().map(InboxResponse::from).collect(),
            total: total.0,
            page,
            page_size,
        })
    }

    /// Get single inbox item
    pub async fn get(
        db: &Pool<Postgres>,
        user_id: Uuid,
        item_id: Uuid,
    ) -> Result<InboxItem, AppError> {
        let item = sqlx::query_as::<_, InboxItem>(
            "SELECT * FROM user_inbox WHERE id = $1 AND user_id = $2",
        )
        .bind(item_id)
        .bind(user_id)
        .fetch_optional(db)
        .await?
        .ok_or(AppError::NotFound("Inbox item not found".into()))?;

        Ok(item)
    }

    /// Create inbox item
    pub async fn create(
        db: &Pool<Postgres>,
        user_id: Uuid,
        req: &CreateInboxRequest,
    ) -> Result<InboxItem, AppError> {
        let item = sqlx::query_as::<_, InboxItem>(
            "INSERT INTO user_inbox (user_id, title, description, tags)
             VALUES ($1, $2, $3, $4)
             RETURNING *",
        )
        .bind(user_id)
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.tags)
        .fetch_one(db)
        .await?;

        Ok(item)
    }

    /// Update inbox item
    pub async fn update(
        db: &Pool<Postgres>,
        user_id: Uuid,
        item_id: Uuid,
        req: &UpdateInboxRequest,
    ) -> Result<InboxItem, AppError> {
        // Check item exists
        let _ = Self::get(db, user_id, item_id).await?;

        let item = sqlx::query_as::<_, InboxItem>(
            "UPDATE user_inbox 
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 tags = COALESCE($3, tags),
                 updated_at = NOW()
             WHERE id = $4 AND user_id = $5
             RETURNING *",
        )
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.tags)
        .bind(item_id)
        .bind(user_id)
        .fetch_one(db)
        .await?;

        Ok(item)
    }

    /// Delete inbox item
    pub async fn delete(
        db: &Pool<Postgres>,
        user_id: Uuid,
        item_id: Uuid,
    ) -> Result<(), AppError> {
        let result = sqlx::query(
            "DELETE FROM user_inbox WHERE id = $1 AND user_id = $2",
        )
        .bind(item_id)
        .bind(user_id)
        .execute(db)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Inbox item not found".into()));
        }

        Ok(())
    }
}

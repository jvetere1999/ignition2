use super::privacy_modes_models::*;
use chrono::Utc;
use sqlx::PgPool;
use sqlx::Row;
use uuid::Uuid;

pub struct PrivacyModesRepo;

impl PrivacyModesRepo {
    /// Get privacy preferences for user
    pub async fn get_preferences(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<PrivacyPreferences, sqlx::Error> {
        sqlx::query_as::<_, PrivacyPreferences>(
            r#"
            SELECT id, user_id, default_mode, show_privacy_toggle, exclude_private_from_search,
                   private_content_retention_days, standard_content_retention_days, created_at, updated_at
            FROM privacy_preferences
            WHERE user_id = $1
            "#
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
    }

    /// Create default privacy preferences for new user
    pub async fn create_default(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<PrivacyPreferences, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query_as::<_, PrivacyPreferences>(
            r#"
            INSERT INTO privacy_preferences (
                id, user_id, default_mode, show_privacy_toggle, exclude_private_from_search,
                private_content_retention_days, standard_content_retention_days, created_at, updated_at
            )
            VALUES ($1, $2, 'standard', true, false, 30, 365, $3, $4)
            RETURNING id, user_id, default_mode, show_privacy_toggle, exclude_private_from_search,
                      private_content_retention_days, standard_content_retention_days, created_at, updated_at
            "#
        )
        .bind(id)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .fetch_one(pool)
        .await
    }

    /// Update privacy preferences
    pub async fn update_preferences(
        pool: &PgPool,
        user_id: Uuid,
        req: &UpdatePrivacyPreferencesRequest,
    ) -> Result<PrivacyPreferences, sqlx::Error> {
        let mut query_str = r#"
            UPDATE privacy_preferences
            SET updated_at = NOW()
        "#
        .to_string();

        let mut param_count = 1;

        if let Some(ref mode) = req.default_mode {
            query_str.push_str(&format!(", default_mode = ${}", param_count));
            param_count += 1;
        }

        if let Some(show) = req.show_privacy_toggle {
            query_str.push_str(&format!(", show_privacy_toggle = ${}", param_count));
            param_count += 1;
        }

        if let Some(exclude) = req.exclude_private_from_search {
            query_str.push_str(&format!(", exclude_private_from_search = ${}", param_count));
            param_count += 1;
        }

        if let Some(days) = req.private_content_retention_days {
            query_str.push_str(&format!(
                ", private_content_retention_days = ${}",
                param_count
            ));
            param_count += 1;
        }

        query_str.push_str(&format!(
            " WHERE user_id = ${} \
            RETURNING id, user_id, default_mode, show_privacy_toggle, exclude_private_from_search, \
                      private_content_retention_days, standard_content_retention_days, created_at, updated_at",
            param_count
        ));

        let mut query = sqlx::query_as::<_, PrivacyPreferences>(&query_str);

        if let Some(ref mode) = req.default_mode {
            query = query.bind(mode.clone());
        }
        if let Some(show) = req.show_privacy_toggle {
            query = query.bind(show);
        }
        if let Some(exclude) = req.exclude_private_from_search {
            query = query.bind(exclude);
        }
        if let Some(days) = req.private_content_retention_days {
            query = query.bind(days);
        }

        query.bind(user_id).fetch_one(pool).await
    }

    /// Check if content is private
    pub async fn is_private(
        pool: &PgPool,
        content_id: Uuid,
        table_name: &str,
    ) -> Result<bool, sqlx::Error> {
        let query_str = format!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM {} WHERE id = $1 AND privacy_mode = 'private'
            ) as is_private
            "#,
            table_name
        );

        let row = sqlx::query(&query_str)
            .bind(content_id)
            .fetch_one(pool)
            .await?;
        let is_private: bool = row.get("is_private");
        Ok(is_private)
    }

    /// Filter content by privacy mode
    pub async fn filter_by_privacy(
        pool: &PgPool,
        user_id: Uuid,
        include_private: bool,
        table_name: &str,
    ) -> Result<Vec<Uuid>, sqlx::Error> {
        let query_str = if include_private {
            format!(
                r#"
                SELECT id FROM {} WHERE user_id = $1 ORDER BY created_at DESC
                "#,
                table_name
            )
        } else {
            format!(
                r#"
                SELECT id FROM {} WHERE user_id = $1 AND privacy_mode = 'standard' ORDER BY created_at DESC
                "#,
                table_name
            )
        };

        let rows = sqlx::query(&query_str)
            .bind(user_id)
            .fetch_all(pool)
            .await?;
        let ids: Vec<Uuid> = rows.into_iter().map(|r| r.get("id")).collect();
        Ok(ids)
    }
}

# Backend Logging Standards

**Last Updated**: January 17, 2026  
**Framework**: Rust tracing with JSON output  
**Environment**: Development and Production  

---

## Log Levels

### TRACE
**When to use**: Never in production code  
**Example**: Detailed parameter values, intermediate calculations  
**Default Filter**: Disabled (too verbose)

### DEBUG
**When to use**: Development/troubleshooting information  
**Example**: Database query parameters, middleware processing, configuration loaded  
**Default Filter**: `ignition_api=debug`  
**Use case**: Developers debugging issues

```rust
tracing::debug!(
    auth.user_id = %user.id,
    operation = "list_quests",
    status_filter = ?query.status,
    "Request started"
);
```

### INFO
**When to use**: Operational events (successful operations, state changes)  
**Example**: Server startup, request completion, data created/updated  
**Default Filter**: Production deployments use `ignition_api=info`  
**Use case**: Monitoring application behavior

```rust
tracing::info!(
    auth.user_id = %user.id,
    operation = "list_quests",
    quest_count = result.quests.len(),
    duration_ms = start.elapsed().as_millis(),
    "Quests listed successfully"
);
```

### WARN
**When to use**: Degraded state, optional features disabled, recoverable issues  
**Example**: OAuth provider unavailable, CSRF in dev mode, session not configured  
**Default Filter**: Always included in production  
**Use case**: Alerting on degraded functionality

```rust
tracing::warn!(
    operation = "session_rotation",
    error.message = "No session configured for rotation",
    "Session rotation skipped"
);
```

### ERROR
**When to use**: Unexpected failures, exceptions, errors  
**Example**: Database connection failed, OAuth error, validation failed  
**Default Filter**: Always included in production (requires immediate attention)  
**Use case**: Error tracking and alerting

```rust
tracing::error!(
    error.type = "database",
    db.operation = %operation,
    db.table = %table,
    db.user_id = ?user_id,
    error.message = %message,
    "Database query failed"
);
```

---

## Structured Field Naming Convention

All logs use structured fields for consistent querying and aggregation.

### Field Name Format

Use `category.subcategory` format:

```
error.type       - Type of error (database, oauth, validation, etc.)
error.message    - Error message text
error.code       - Error code or class

db.operation     - Database operation (create, read, update, delete)
db.table         - Table name
db.user_id       - Affected user ID
db.entity_id     - Affected entity ID

auth.user_id     - Authenticated user ID
auth.provider    - OAuth provider (google, azure, etc.)
auth.email       - User email

http.method      - HTTP method (GET, POST, etc.)
http.uri         - Request path
http.status      - Response status code
http.origin      - Request origin

operation        - General operation name (e.g., "list_quests", "oauth_authenticate")
duration_ms      - Operation duration in milliseconds
status           - Operation status if not http.status
mode             - Environment mode (dev, production, etc.)
```

### Example: Database Error

```rust
// ❌ WRONG - No structure
tracing::error!("Database error: {}", e);

// ✅ CORRECT - Structured with context
tracing::error!(
    error.type = "database",
    db.operation = "update",
    db.table = "users",
    db.user_id = ?user_id,
    error.message = %e,
    "Database query failed"
);
```

### Example: Request with Context

```rust
// ❌ WRONG - Missing context
async fn list_quests(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Query(query): Query<ListQuestsQuery>,
) -> Result<Json<QuestsListWrapper>, AppError> {
    let result = QuestsRepo::list(&state.db, user.id, query.status.as_deref()).await?;
    Ok(Json(QuestsListWrapper { quests: result.quests, total: result.total }))
}

// ✅ CORRECT - With full context
async fn list_quests(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Query(query): Query<ListQuestsQuery>,
) -> Result<Json<QuestsListWrapper>, AppError> {
    let start = Instant::now();
    
    tracing::debug!(
        auth.user_id = %user.id,
        operation = "list_quests",
        status_filter = ?query.status,
        "Request started"
    );
    
    let result = QuestsRepo::list(&state.db, user.id, query.status.as_deref())
        .await
        .map_err(|e| {
            tracing::warn!(
                auth.user_id = %user.id,
                operation = "list_quests",
                error.type = "database",
                error.message = %e,
                duration_ms = start.elapsed().as_millis(),
                "Operation failed"
            );
            e
        })?;
    
    tracing::info!(
        auth.user_id = %user.id,
        operation = "list_quests",
        quest_count = result.quests.len(),
        duration_ms = start.elapsed().as_millis(),
        "Quests listed successfully"
    );
    
    Ok(Json(QuestsListWrapper { quests: result.quests, total: result.total }))
}
```

---

## Configuration

### Environment Variable: RUST_LOG

Control log filtering using the `RUST_LOG` environment variable:

```bash
# Production (minimal logging, operational only)
RUST_LOG=ignition_api=info,tower_http=info,sqlx=warn

# Development (detailed logging for debugging)
RUST_LOG=ignition_api=debug,tower_http=debug,sqlx=debug

# Debugging specific module
RUST_LOG=ignition_api::db::habits_goals_repos=trace

# All details (for troubleshooting)
RUST_LOG=trace
```

### Default Filter

If `RUST_LOG` is not set:
```
ignition_api=debug,tower_http=debug,sqlx=warn
```

- `ignition_api=debug`: See all application logs at DEBUG level and above
- `tower_http=debug`: See HTTP middleware logs at DEBUG level
- `sqlx=warn`: Suppress chatty SQL query logs, only show warnings/errors

### Output Format

Logs are output as JSON for easy parsing by log aggregation systems (e.g., Datadog, ELK, CloudWatch):

```json
{
  "timestamp": "2026-01-15T10:30:45.123Z",
  "level": "INFO",
  "fields": {
    "message": "Quests listed successfully",
    "auth.user_id": "550e8400-e29b-41d4-a716-446655440000",
    "operation": "list_quests",
    "quest_count": 5,
    "duration_ms": 125
  },
  "target": "ignition_api::routes::quests"
}
```

---

## Best Practices

### Do's ✅

1. **Use structured fields** for searchable data
   ```rust
   tracing::info!(
       auth.user_id = %user.id,
       operation = "create_quest",
       "Quest created"
   );
   ```

2. **Include user context** in all user-scoped operations
   ```rust
   tracing::info!(
       auth.user_id = %user.id,
       operation = "sync_data",
       "Sync started"
   );
   ```

3. **Add operation timing** for performance tracking
   ```rust
   let start = Instant::now();
   // ... do work ...
   tracing::info!(
       duration_ms = start.elapsed().as_millis(),
       "Operation completed"
   );
   ```

4. **Use appropriate log levels**
   - DEBUG: Diagnostic information (what are we doing?)
   - INFO: State changes (what happened?)
   - WARN: Degraded conditions (what didn't work?)
   - ERROR: Failures (what went wrong?)

5. **Log at operation boundaries**
   ```rust
   tracing::debug!("Operation started");
   // ... work ...
   tracing::info!("Operation completed");  // or WARN/ERROR if issue
   ```

### Don'ts ❌

1. **Don't use unstructured logs** (message-only)
   ```rust
   // ❌ WRONG
   tracing::error!("OAuth error: {}", msg);
   
   // ✅ CORRECT
   tracing::error!(
       operation = "oauth_authenticate",
       error.type = "oauth",
       error.message = %msg,
       "OAuth authentication failed"
   );
   ```

2. **Don't include visual separators** in tracing
   ```rust
   // ❌ WRONG - Not queryable
   tracing::warn!("{}", "=".repeat(60));
   
   // ✅ CORRECT - Use println! if needed (not tracing)
   eprintln!("{}", "=".repeat(60));
   ```

3. **Don't perform expensive operations** in log arguments
   ```rust
   // ❌ WRONG - Allocates string even if debug filtered out
   tracing::debug!("Data: {}", expensive_debug_format(&data));
   
   // ✅ CORRECT - Guard expensive operations
   if tracing::enabled!(tracing::Level::DEBUG) {
       tracing::debug!("Data: {}", expensive_debug_format(&data));
   }
   ```

4. **Don't forget error context** when errors occur
   ```rust
   // ❌ WRONG - Generic error
   tracing::error!("Operation failed");
   
   // ✅ CORRECT - Full context
   tracing::error!(
       error.type = "database",
       error.message = %e,
       auth.user_id = %user_id,
       "Database operation failed"
   );
   ```

5. **Don't use INFO for operational events** that are very frequent
   ```rust
   // ❌ WRONG - Too verbose
   for item in items {
       tracing::info!(item_id = %item.id, "Processing item");
   }
   
   // ✅ CORRECT - Use DEBUG or batch log summary
   tracing::debug!(item_count = items.len(), "Processing items");
   // ... process ...
   tracing::info!(item_count = items.len(), "Items processed");
   ```

---

## Examples by Component

### Request Handlers

```rust
async fn list_quests(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Query(query): Query<ListQuestsQuery>,
) -> Result<Json<QuestsListWrapper>, AppError> {
    let start = Instant::now();
    
    tracing::debug!(
        auth.user_id = %user.id,
        operation = "list_quests",
        status_filter = ?query.status,
        "Request started"
    );
    
    let result = QuestsRepo::list(&state.db, user.id, query.status.as_deref())
        .await
        .map_err(|e| {
            tracing::warn!(
                auth.user_id = %user.id,
                operation = "list_quests",
                error.type = "database",
                error.message = %e,
                duration_ms = start.elapsed().as_millis(),
                "Operation failed"
            );
            e
        })?;
    
    tracing::info!(
        auth.user_id = %user.id,
        operation = "list_quests",
        quest_count = result.quests.len(),
        duration_ms = start.elapsed().as_millis(),
        "Quests listed successfully"
    );
    
    Ok(Json(QuestsListWrapper { quests: result.quests, total: result.total }))
}
```

### Database Operations

```rust
pub async fn query_by_id(pool: &PgPool, id: Uuid) -> Result<Model, AppError> {
    let result = sqlx::query_as::<_, Model>(
        "SELECT * FROM users WHERE id = $1"
    )
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!(
                error.type = "database",
                db.operation = "read",
                db.table = "users",
                db.entity_id = %id,
                error.message = %e,
                "Database query failed"
            );
            AppError::DatabaseError(e)
        })?;
    
    Ok(result)
}
```

### Authentication/OAuth

```rust
async fn handle_google_callback(
    State(state): State<Arc<AppState>>,
    Query(params): Query<OAuthCallback>,
) -> AppResult<Response> {
    tracing::debug!(
        operation = "oauth_callback",
        auth.provider = "google",
        state_key = %params.state,
        "OAuth callback received"
    );
    
    if let Some(error) = &params.error {
        tracing::warn!(
            operation = "oauth_callback",
            auth.provider = "google",
            error.type = "oauth",
            error.message = %error,
            state_key = %params.state,
            "OAuth provider rejected authentication"
        );
        return Err(AppError::OAuthDenied {
            reason: error.clone(),
        });
    }
    
    // ... continue with successful flow ...
    tracing::info!(
        operation = "oauth_callback",
        auth.provider = "google",
        auth.user_id = %user.id,
        "User authenticated successfully"
    );
    
    Ok(Response::redirect(redirect_uri))
}
```

### Error Handling

```rust
// In error.rs IntoResponse impl:
tracing::error!(
    error.type = "app_error",
    error.code = ?self.error_code(),
    http.status = status.as_u16(),
    error.message = %self,
    "Request error"
);
```

---

## Monitoring & Alerts

### Sample Queries

**Find all errors in last hour**:
```
level:ERROR created_at > now() - 1h
```

**Find all OAuth failures**:
```
operation:"oauth_callback" level:WARN
```

**Find slow requests**:
```
duration_ms > 1000
```

**Find specific user operations**:
```
auth.user_id:"550e8400-e29b-41d4-a716-446655440000"
```

### Alert Examples

**High error rate**:
```
Alert when level:ERROR in last 5m > 10
```

**OAuth failures**:
```
Alert when operation:"oauth_callback" level:WARN in last 5m > 5
```

**Slow database operations**:
```
Alert when error.type:database duration_ms > 5000
```

---

## Migration Guide

### Existing Logs

If you find logs that don't match these standards:

1. **Unstructured logs** → Add structured fields
   ```rust
   // OLD
   tracing::error!("Database error: {}", e);
   
   // NEW
   tracing::error!(
       error.type = "database",
       error.message = %e,
       "Database query failed"
   );
   ```

2. **Missing context** → Add operation and user fields
   ```rust
   // OLD
   tracing::info!("User created");
   
   // NEW
   tracing::info!(
       operation = "create_user",
       auth.user_id = %user.id,
       "User created"
   );
   ```

3. **Wrong log level** → Move to appropriate level
   ```rust
   // OLD - Using WARN for operational info
   tracing::warn!("Configuration loaded");
   
   // NEW - Use INFO for operational events
   tracing::info!(
       operation = "startup",
       config_loaded = true,
       "Configuration loaded"
   );
   ```

---

## References

- [Rust tracing documentation](https://docs.rs/tracing/)
- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/reference/specification/protocol/exporter/)
- [JSON logging best practices](https://www.kartar.net/2015/12/structured-logging/)


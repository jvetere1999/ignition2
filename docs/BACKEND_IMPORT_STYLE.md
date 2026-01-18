# Backend Import Organization Style Guide

**Last Updated**: January 17, 2026  
**Framework**: Rust 2021 Edition  
**Formatter**: `rustfmt` with `.rustfmt.toml` configuration  

---

## Import Organization Standard

All Rust files MUST follow this import structure:

### Group 1: Standard Library
```rust
use std::sync::Arc;
use std::time::Instant;
```

### Group 2: External Crates (Alphabetically)
```rust
use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
    routing::{get, post, put, delete},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
```

### Group 3: Internal Crate Imports (Alphabetically)
```rust
use crate::config::AppConfig;
use crate::db::{
    models::{User, Session},
    repos::{UserRepo, SessionRepo},
};
use crate::error::AppError;
use crate::middleware::auth::Auth;
use crate::state::AppState;
```

### Group 4: Super/Relative Imports (If Any)
```rust
use super::utils;
use super::types::ModelType;
```

### Rules

1. **Blank lines**: Single blank line between groups, no blank lines within groups
2. **Alphabetization**: 
   - External crates sorted alphabetically
   - Within multi-line imports, items sorted alphabetically
   - Internal paths sorted alphabetically
3. **Multi-line imports**: Items should be alphabetically sorted within braces
4. **Glob imports**: AVOID except for documented prelude modules
5. **Path preference**: 
   - Use `super::` within same module (sibling imports)
   - Use `crate::` for cross-module imports
   - Use absolute paths for clarity

---

## Anti-Patterns to Avoid

### ❌ Wrong: Glob Imports
```rust
use crate::db::habits_goals_models::*;  // Which types are imported?
use super::*;  // Too broad
```

### ✅ Correct: Explicit Imports
```rust
use crate::db::habits_goals_models::{CreateHabitRequest, Habit, HabitResponse};
use super::{utils, types};
```

---

### ❌ Wrong: Unorganized Imports
```rust
use uuid::Uuid;
use std::sync::Arc;
use crate::error::AppError;
use axum::Json;
use serde::Serialize;
use crate::db::models::User;
```

### ✅ Correct: Organized Imports
```rust
use std::sync::Arc;

use axum::Json;
use serde::Serialize;
use uuid::Uuid;

use crate::db::models::User;
use crate::error::AppError;
```

---

### ❌ Wrong: Inconsistent Multi-line Sorting
```rust
use axum::{
    routing::{get, post},
    extract::{Extension, State},  // Should come before routing
    Json,
    response::Response,  // Should come before Json
};
```

### ✅ Correct: Alphabetically Sorted
```rust
use axum::{
    extract::{Extension, State},
    response::Response,
    routing::{get, post},
    Json,
};
```

---

## Enforcing with Rustfmt

All developers MUST run `rustfmt` before committing:

```bash
# Format single file
rustfmt app/backend/crates/api/src/routes/auth.rs

# Format all Rust files in backend
rustfmt --edition 2021 app/backend/crates/api/src/**/*.rs

# Check without modifying (CI/CD use)
rustfmt --check app/backend/crates/api/src/**/*.rs

# With the .rustfmt.toml config file:
cd app/backend
rustfmt --check crates/api/src/**/*.rs
```

The `.rustfmt.toml` configuration file in `app/backend/` contains:
- `group_imports = "StdExternalCrate"` - Enforces std → external → crate grouping
- `reorder_imports = true` - Alphabetical sorting
- `max_width = 100` - Line length limit

---

## Module Organization

### db/ Module
```rust
// app/backend/crates/api/src/db/mod.rs

//! Database access layer
//!
//! Provides models (type definitions) and repositories (query implementations).
//! Respects dependency direction: models have no dependencies, repos depend on models.

pub mod core;  // Query tracing utilities
pub mod gamification_models;
pub mod gamification_repos;
pub mod habits_goals_models;
pub mod habits_goals_repos;
pub mod models;  // Core data types - PRIMARY EXPORT
pub mod oauth_models;
pub mod oauth_repos;
pub mod platform_repos;
pub mod quests_models;
pub mod quests_repos;
// ... etc

// Re-export common types for convenience
pub use models::{User, Session, OAuthState};
pub use repos::{UserRepo, SessionRepo};
```

### routes/ Module
```rust
// app/backend/crates/api/src/routes/mod.rs

//! HTTP route handlers
//!
//! Organized by feature domain (auth, habits, goals, etc.)

pub mod admin;
pub mod api;
pub mod auth;
pub mod goals;
pub mod habits;
pub mod health;
pub mod quests;
pub mod sync;
```

### services/ Module
```rust
// app/backend/crates/api/src/services/mod.rs

//! Business logic layer
//!
//! Orchestrates database operations and external service calls.

pub mod auth;
pub mod gamification;
pub mod oauth;
pub mod sync;
```

### middleware/ Module
```rust
// app/backend/crates/api/src/middleware/mod.rs

//! HTTP middleware
//!
//! Request/response processing before routing to handlers.

pub mod auth;
pub mod cors;
pub mod csrf;
pub mod logging;
```

---

## Validation

Run before committing:

```bash
# 1. Format all files
cd app/backend
rustfmt --edition 2021 crates/api/src/**/*.rs

# 2. Check for issues
cargo clippy --bin ignition-api

# 3. Verify compilation
cargo check --bin ignition-api
```

---

## FAQ

**Q: Should I use `super::` or `crate::`?**  
A: Use `super::` for sibling imports within the same module. Use `crate::` for cross-module imports. This makes module locality clear.

```rust
// In db/habits_goals_repos.rs
use super::habits_goals_models::Habit;  // Sibling: use super::
use crate::error::AppError;  // Cross-module: use crate::
```

**Q: Can I use glob imports?**  
A: Only in documented prelude modules like `models.rs`. Everywhere else, use explicit imports.

```rust
// ✅ OK in prelude:
// models.rs
pub use self::user::User;
pub use self::session::Session;
// ... then it's OK to do:
use crate::db::models::*;

// ❌ NOT OK elsewhere:
use crate::db::habits_goals_models::*;  // Use explicit instead
```

**Q: What if a line becomes really long with explicit imports?**  
A: Use multi-line format (wrapped in braces). Rustfmt will handle this automatically.

```rust
// ✅ Long imports split across lines (rustfmt does this)
use crate::db::{
    models::{AuditLogEntry, CreateSessionInput, OAuthUserInfo, Session, User},
    repos::{AccountRepo, AuditLogRepo, RbacRepo, SessionRepo, UserRepo},
};
```

---

## References

- [Rust API Guidelines - Use Consistent Import Styles](https://rust-lang.github.io/api-guidelines/consistency.html)
- [Rustfmt Configuration](https://rust-lang.github.io/rustfmt/)
- [Clippy Lints](https://github.com/rust-lang/rust-clippy)


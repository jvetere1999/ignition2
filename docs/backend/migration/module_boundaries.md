"Backend module boundaries and shared interface definitions."

# Module Boundaries

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** 07 - Structure Plan  
**Source:** api_endpoint_inventory.md, d1_usage_inventory.md, auth_inventory.md

---

## Backend Module Structure

```
app/backend/src/
├── main.rs                 # Entry point, server setup
├── lib.rs                  # Library root, module declarations
├── config.rs               # Configuration loading
├── error.rs                # Error types and handling
│
├── routes/                 # HTTP Route Handlers
│   ├── mod.rs
│   ├── auth/               # /auth/*
│   ├── admin/              # /admin/*
│   ├── blobs/              # /blobs/*
│   ├── focus/              # /focus/*
│   ├── habits/             # /habits/*
│   ├── goals/              # /goals/*
│   ├── quests/             # /quests/*
│   ├── calendar/           # /calendar/*
│   ├── daily_plan/         # /daily-plan/*
│   ├── exercise/           # /exercise/*
│   ├── market/             # /market/*
│   ├── reference/          # /reference/*
│   ├── learn/              # /learn/*
│   ├── user/               # /user/*
│   ├── onboarding/         # /onboarding/*
│   ├── infobase/           # /infobase/*
│   ├── ideas/              # /ideas/*
│   ├── feedback/           # /feedback/*
│   ├── analysis/           # /analysis/*
│   ├── books/              # /books/*
│   └── programs/           # /programs/*
│
├── auth/                   # Authentication & Authorization
│   ├── mod.rs
│   ├── oauth.rs            # OAuth provider handling
│   ├── session.rs          # Session management
│   ├── csrf.rs             # CSRF protection (DEC-002=A: Origin verification)
│   ├── middleware.rs       # Auth middleware
│   └── roles.rs            # Role-based access (DEC-004=B: DB-backed)
│
├── db/                     # Database Layer
│   ├── mod.rs
│   ├── pool.rs             # Connection pool (SQLx)
│   ├── migrations.rs       # Migration runner
│   └── models/             # Database models
│       └── mod.rs
│
├── repositories/           # Data Access Layer
│   ├── mod.rs
│   ├── users.rs
│   ├── sessions.rs
│   ├── accounts.rs
│   ├── focus.rs
│   ├── habits.rs
│   ├── goals.rs
│   ├── quests.rs
│   ├── calendar.rs
│   ├── daily_plans.rs
│   ├── exercise.rs
│   ├── market.rs
│   ├── gamification.rs
│   ├── reference_tracks.rs
│   ├── onboarding.rs
│   ├── settings.rs
│   └── admin.rs
│
├── storage/                # R2 Storage Layer
│   ├── mod.rs
│   ├── client.rs           # S3-compatible client
│   ├── signed_urls.rs      # Pre-signed URL generation
│   └── types.rs            # Blob metadata types
│
├── admin/                  # Admin-Only Logic
│   ├── mod.rs
│   ├── backup.rs
│   ├── restore.rs
│   ├── stats.rs
│   └── audit.rs            # Audit logging (new)
│
└── middleware/             # Axum/Tower Middleware
    ├── mod.rs
    ├── auth.rs             # Session verification
    ├── csrf.rs             # Origin/Referer check
    ├── cors.rs             # CORS configuration
    ├── logging.rs          # Request logging
    └── error.rs            # Error response formatting
```

---

## Module Dependency Graph

```
                    ┌─────────────┐
                    │    main     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌───▼───┐ ┌──────▼──────┐
       │   routes    │ │config │ │  middleware │
       └──────┬──────┘ └───────┘ └──────┬──────┘
              │                         │
              └─────────┬───────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
   │   auth    │  │ storage   │  │   admin   │
   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
              ┌─────────▼─────────┐
              │   repositories    │
              └─────────┬─────────┘
                        │
                  ┌─────▼─────┐
                  │    db     │
                  └───────────┘
```

---

## Module Boundaries (What Each Module Can Access)

| Module | Can Access | Cannot Access |
|--------|------------|---------------|
| `routes/` | `auth`, `repositories`, `storage`, `admin` | Direct DB |
| `auth/` | `db`, `repositories/users`, `repositories/sessions` | Other repos |
| `storage/` | External S3 API | DB |
| `repositories/` | `db` | Other repos (no cross-repo calls) |
| `admin/` | All repositories, `db`, `storage` | Direct route handlers |
| `middleware/` | `auth`, `config` | DB, repositories |
| `db/` | External Postgres | Nothing else |

---

## Shared Types (Across Modules)

### Error Types (`error.rs`)

```rust
pub enum AppError {
    // Auth errors
    Unauthorized,
    Forbidden,
    SessionExpired,
    CsrfViolation,
    
    // Database errors
    NotFound,
    Conflict,
    DatabaseError(sqlx::Error),
    
    // Storage errors
    StorageError(String),
    FileTooLarge,
    InvalidMimeType,
    
    // Validation errors
    ValidationError(String),
    
    // Internal errors
    InternalError(String),
}
```

### User Context (`auth/mod.rs`)

```rust
pub struct UserContext {
    pub user_id: String,
    pub email: String,
    pub role: UserRole,
    pub session_id: String,
}

pub enum UserRole {
    User,
    Admin,
}
```

### Request Extensions

| Extension | Type | Set By | Used By |
|-----------|------|--------|---------|
| User context | `UserContext` | `auth::middleware` | All routes |
| Request ID | `RequestId` | `middleware::logging` | Logging |
| Session | `Session` | `auth::middleware` | Routes |

---

## Frontend/Backend Boundary

### What Stays in Frontend

| Category | Examples | Reason |
|----------|----------|--------|
| React components | All `src/components/` | UI rendering |
| React hooks | `useLocalStorage`, `useFocus` | Client state |
| Theme logic | `src/lib/theme/`, `src/lib/themes/` | CSS/styling |
| Today engine | `src/lib/today/` | UI state machine |
| Audio player | `src/lib/player/` | Browser audio API |
| Arrange logic | `src/lib/arrange/` | UI layout |

### What Moves to Backend

| Category | Examples | Reason |
|----------|----------|--------|
| Auth logic | OAuth, sessions | Security |
| Data access | All repositories | Single source of truth |
| Business logic | Quest completion, XP calculation | Consistency |
| Storage access | R2 blobs | Security (no credentials in frontend) |
| Admin operations | Backup, restore, user management | Security |

### Shared Contracts (API Types)

Create shared TypeScript types in `app/frontend/src/lib/api/types.ts` that match Rust API responses:

```typescript
// Frontend: app/frontend/src/lib/api/types.ts
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
}

export interface ApiError {
  error: string;
  code: string;
}
```

---

## Admin Console Boundaries

### Shared with Main Frontend

| Item | Approach |
|------|----------|
| UI components | Import from shared package or duplicate |
| API client | Same client wrapper |
| Auth flow | Same OAuth, different session scope |

### Admin-Specific

| Item | Location |
|------|----------|
| Admin routes | `/admin/*` (backend) |
| Admin UI | `app/admin/src/` |
| Admin role check | Backend middleware |

---

## Evidence References

| Module | Source Inventory | Line Count |
|--------|------------------|------------|
| `routes/auth/` | api_endpoint_inventory.md (Auth Domain) | 3 routes |
| `routes/admin/` | api_endpoint_inventory.md (Admin Domain) | 10 routes |
| `routes/blobs/` | api_endpoint_inventory.md (Blob Storage) | 2 routes |
| `routes/focus/` | api_endpoint_inventory.md (Focus Sessions) | 5 routes |
| `repositories/*` | d1_usage_inventory.md | 15 files |
| `auth/*` | auth_inventory.md | 477+ lines of logic |

---

## References

- [target_structure.md](./target_structure.md) - Overall structure
- [routing_and_domains.md](./routing_and_domains.md) - URL routing
- [security_model.md](./security_model.md) - Security implementation
- [api_endpoint_inventory.md](./api_endpoint_inventory.md) - Current API routes


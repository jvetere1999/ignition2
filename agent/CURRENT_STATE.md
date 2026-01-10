# CURRENT_STATE.md — Repo Discovery Inventory

**Created:** January 9, 2026  
**Purpose:** Factual inventory to diagnose runtime errors (especially DB errors)  
**Branch:** (verify current branch before making changes)

---

## 1. Languages & Frameworks

### Backend (Primary)
| Component | Technology | Version | Evidence |
|-----------|------------|---------|----------|
| Language | **Rust** | 1.85+ (see `rust-toolchain.toml`) | [app/backend/Cargo.toml](app/backend/Cargo.toml) |
| Web Framework | **Axum** | 0.8 | [app/backend/Cargo.toml#L13](app/backend/Cargo.toml#L13) |
| Middleware | **Tower + tower-http** | 0.5 / 0.6 | [app/backend/Cargo.toml#L14-L15](app/backend/Cargo.toml#L14-L15) |
| Async Runtime | **Tokio** | 1.42 | [app/backend/Cargo.toml#L18](app/backend/Cargo.toml#L18) |
| Tracing | **tracing + tracing-subscriber** | 0.1 / 0.3 | [app/backend/Cargo.toml#L51-L52](app/backend/Cargo.toml#L51-L52) |

### Frontend
| Component | Technology | Version | Evidence |
|-----------|------------|---------|----------|
| Framework | **Next.js** | 15.1.3 | [app/frontend/package.json#L32](app/frontend/package.json#L32) |
| React | **React 19** | 19.0.0 | [app/frontend/package.json#L33](app/frontend/package.json#L33) |
| State | **Zustand** | 5.0.9 | [app/frontend/package.json#L38](app/frontend/package.json#L38) |
| Deployment | **Cloudflare Pages** (OpenNext) | - | [app/frontend/open-next.config.ts](app/frontend/open-next.config.ts) |

### Admin
| Component | Technology | Evidence |
|-----------|------------|----------|
| Framework | Next.js | [app/admin/package.json](app/admin/package.json) |
| Deployment | Cloudflare Pages | [app/admin/wrangler.toml](app/admin/wrangler.toml) |

---

## 2. Database Access Layer

### ORM / SQL Library
| Attribute | Value | Evidence |
|-----------|-------|----------|
| Library | **sqlx** | [app/backend/Cargo.toml#L21](app/backend/Cargo.toml#L21) |
| Version | 0.8 | [app/backend/Cargo.toml#L21](app/backend/Cargo.toml#L21) |
| Features | `runtime-tokio`, `tls-rustls`, `postgres`, `uuid`, `chrono`, `json`, `derive`, `migrate`, `macros` | [app/backend/Cargo.toml#L21](app/backend/Cargo.toml#L21) |
| Database | **PostgreSQL** 17+ | [app/backend/docker-compose.yml#L4](app/backend/docker-compose.yml#L4) |

### Query Style
| Pattern | Evidence |
|---------|----------|
| **Runtime `query_as::<_, T>()` binding** (NOT compile-time macros) | [app/backend/crates/api/src/db/repos.rs#L26-L35](app/backend/crates/api/src/db/repos.rs#L26-L35) |
| Raw SQL strings with `$1`, `$2` placeholders | All `*_repos.rs` files |
| Per [copilot-instructions.md](.github/copilot-instructions.md#L73-L81): compile-time `query!` macros are **forbidden** (no `DATABASE_URL` at build time) | [.github/copilot-instructions.md#L73-L81](.github/copilot-instructions.md#L73-L81) |

### Repository Pattern
| Location | Purpose |
|----------|---------|
| [app/backend/crates/api/src/db/](app/backend/crates/api/src/db/) | All DB operations |
| `*_models.rs` | Structs with `#[derive(FromRow)]` |
| `*_repos.rs` | Static methods with `pool: &PgPool` |

---

## 3. Migration System

### Location
| Path | Contents |
|------|----------|
| [app/backend/migrations/](app/backend/migrations/) | 14 substrate migrations (0001-0014) |
| [app/database/migrations/](app/database/migrations/) | **Duplicate** of above (same files) |

### Migration Files (Current)
| File | Purpose |
|------|---------|
| `0001_auth_substrate.sql` | Users, accounts, sessions, RBAC |
| `0002_gamification_substrate.sql` | XP, coins, achievements, skills |
| `0003_focus_substrate.sql` | Focus timer sessions |
| `0004_habits_goals_substrate.sql` | Habits and goals |
| `0005_quests_substrate.sql` | Quest system |
| `0006_planning_substrate.sql` | Calendar, daily plans |
| `0007_market_substrate.sql` | Marketplace items |
| `0008_reference_tracks_substrate.sql` | Audio reference tracks |
| `0009_analysis_frames_bytea.sql` | Analysis frames |
| `0010_listening_prompt_templates.sql` | Prompt templates |
| `0011_fitness_substrate.sql` | Exercise/fitness |
| `0012_books_substrate.sql` | Book tracking |
| `0013_learn_substrate.sql` | Learning/courses |
| `0014_platform_substrate.sql` | Platform settings |

### Migration Tool
| Attribute | Value | Evidence |
|-----------|-------|----------|
| Tool | **sqlx::migrate!** (embedded at compile time) | [app/backend/crates/api/src/state.rs#L107](app/backend/crates/api/src/state.rs#L107) |
| Tracking Table | `_sqlx_migrations` | [app/backend/crates/api/src/state.rs#L110-L113](app/backend/crates/api/src/state.rs#L110-L113) |
| Applied | **On startup** (every boot) | [app/backend/crates/api/src/state.rs#L59-L72](app/backend/crates/api/src/state.rs#L59-L72) |

### Migration Application Flow
```
AppState::new() 
  → PgPoolOptions::connect() 
  → Self::run_migrations(&db)
    → sqlx::migrate!("../../migrations").run(db)
```

---

## 4. PostgreSQL / Neon Usage

### Connection String
| Location | Format | Evidence |
|----------|--------|----------|
| Environment Variable | `DATABASE_URL` | [app/backend/.env.example#L9](app/backend/.env.example#L9) |
| Config Loading | `AppConfig::load()` → `DatabaseConfig::url` | [app/backend/crates/api/src/config.rs#L160-L164](app/backend/crates/api/src/config.rs#L160-L164) |
| Fly.io Secrets | `flyctl secrets set DATABASE_URL=...` | [deploy/README.md#L113](deploy/README.md#L113) |

### Pool Configuration
| Setting | Value | Evidence |
|---------|-------|----------|
| Max Connections | `pool_size` (default: 10) | [app/backend/crates/api/src/config.rs#L38-L40](app/backend/crates/api/src/config.rs#L38-L40) |
| Acquire Timeout | 30 seconds | [app/backend/crates/api/src/state.rs#L45](app/backend/crates/api/src/state.rs#L45) |
| Idle Timeout | 600 seconds | [app/backend/crates/api/src/state.rs#L46](app/backend/crates/api/src/state.rs#L46) |

### Schema / search_path
| Attribute | Value | Evidence |
|-----------|-------|----------|
| Schema Used | **`public`** (default) | Queries use unqualified table names; grep shows `schemaname = 'public'` in admin queries [app/backend/crates/api/src/routes/admin.rs#L458](app/backend/crates/api/src/routes/admin.rs#L458) |
| No explicit `SET search_path` | N/A | grep_search found no `search_path` statements in runtime code |

### Neon.tech
| Attribute | Status | Evidence |
|-----------|--------|----------|
| Documented as option | Yes | [docs/deploy/CLOUDFLARE_CONTAINERS_TROUBLESHOOTING.md#L65-L86](docs/deploy/CLOUDFLARE_CONTAINERS_TROUBLESHOOTING.md#L65-L86) |
| Actual production host | **UNKNOWN-001** | No explicit Neon reference in config; depends on `DATABASE_URL` secret at runtime |

---

## 5. Observability

### Logging / Tracing
| Component | Implementation | Evidence |
|-----------|----------------|----------|
| Tracing Framework | `tracing` crate | [app/backend/crates/api/src/main.rs#L35-L42](app/backend/crates/api/src/main.rs#L35-L42) |
| Subscriber | `tracing-subscriber` with `EnvFilter` + JSON formatter | [app/backend/crates/api/src/main.rs#L36-L41](app/backend/crates/api/src/main.rs#L36-L41) |
| HTTP Tracing | `tower_http::TraceLayer` | [app/backend/crates/api/src/main.rs#L120](app/backend/crates/api/src/main.rs#L120) |
| Request IDs | `SetRequestIdLayer` + `PropagateRequestIdLayer` (X-Request-Id) | [app/backend/crates/api/src/main.rs#L121-L122](app/backend/crates/api/src/main.rs#L121-L122) |
| Default Log Level | `RUST_LOG=info,ignition_api=debug` | [app/backend/fly.toml#L17](app/backend/fly.toml#L17) |

### Error Logging Points
| Location | Log Level | Evidence |
|----------|-----------|----------|
| `AppError::Database` | `tracing::error!` | [app/backend/crates/api/src/error.rs#L114](app/backend/crates/api/src/error.rs#L114) |
| `AppError::Internal` | `tracing::error!` | [app/backend/crates/api/src/error.rs#L121](app/backend/crates/api/src/error.rs#L121) |
| `AppError::Config` | `tracing::error!` | [app/backend/crates/api/src/error.rs#L128](app/backend/crates/api/src/error.rs#L128) |
| `AppError::OAuthError` | `tracing::error!` | [app/backend/crates/api/src/error.rs#L106](app/backend/crates/api/src/error.rs#L106) |
| DB connection failure | `tracing::error!` | [app/backend/crates/api/src/state.rs#L49-L51](app/backend/crates/api/src/state.rs#L49-L51) |
| Migration failure | `tracing::error!` | [app/backend/crates/api/src/state.rs#L69](app/backend/crates/api/src/state.rs#L69) |

---

## 6. Runtime Surfaces (Error Mapping)

### Error Type Hierarchy
| Rust Type | HTTP Status | Response Type | Evidence |
|-----------|-------------|---------------|----------|
| `AppError::NotFound` | 404 | `not_found` | [app/backend/crates/api/src/error.rs#L76](app/backend/crates/api/src/error.rs#L76) |
| `AppError::Unauthorized` | 401 | `unauthorized` | [app/backend/crates/api/src/error.rs#L77-L80](app/backend/crates/api/src/error.rs#L77-L80) |
| `AppError::Forbidden` | 403 | `forbidden` | [app/backend/crates/api/src/error.rs#L81](app/backend/crates/api/src/error.rs#L81) |
| `AppError::CsrfViolation` | 403 | `csrf_violation` | [app/backend/crates/api/src/error.rs#L82-L85](app/backend/crates/api/src/error.rs#L82-L85) |
| `AppError::BadRequest` | 400 | `bad_request` | [app/backend/crates/api/src/error.rs#L90](app/backend/crates/api/src/error.rs#L90) |
| `AppError::Validation` | 422 | `validation_error` | [app/backend/crates/api/src/error.rs#L100-L104](app/backend/crates/api/src/error.rs#L100-L104) |
| `AppError::Database` | **500** | `database_error` | [app/backend/crates/api/src/error.rs#L112-L118](app/backend/crates/api/src/error.rs#L112-L118) |
| `AppError::Internal` | **500** | `internal_error` | [app/backend/crates/api/src/error.rs#L119-L125](app/backend/crates/api/src/error.rs#L119-L125) |
| `AppError::Config` | **500** | `config_error` | [app/backend/crates/api/src/error.rs#L126-L132](app/backend/crates/api/src/error.rs#L126-L132) |

### Error Response Format
```json
{
  "error": "<error_type>",
  "message": "<user-facing message>",
  "code": null
}
```
Evidence: [app/backend/crates/api/src/error.rs#L66-L73](app/backend/crates/api/src/error.rs#L66-L73)

### 500 Error Sources (Database)
| Source | Conversion | Evidence |
|--------|------------|----------|
| `sqlx::Error` | `From<sqlx::Error> for AppError` → `Database(e.to_string())` | [app/backend/crates/api/src/error.rs#L49-L52](app/backend/crates/api/src/error.rs#L49-L52) |
| Repository `.map_err()` | `AppError::Database(e.to_string())` | All `*_repos.rs` files |

---

## 7. Deployment Topology

| Component | Platform | URL | Evidence |
|-----------|----------|-----|----------|
| Backend API | **Fly.io** | `ignition-api.fly.dev` | [app/backend/fly.toml](app/backend/fly.toml) |
| API Proxy | Cloudflare Worker | `api.ecent.online` → Fly.io | [deploy/cloudflare-api-proxy/](deploy/cloudflare-api-proxy/) |
| Frontend | Cloudflare Pages | `ignition.ecent.online` | [deploy/README.md#L82](deploy/README.md#L82) |
| Admin | Cloudflare Pages | `admin.ignition.ecent.online` | [deploy/cloudflare-admin/](deploy/cloudflare-admin/) |
| Storage | Cloudflare R2 | `ignition` bucket | [app/backend/.env.example#L30-L35](app/backend/.env.example#L30-L35) |
| Database | PostgreSQL (host TBD) | Via `DATABASE_URL` secret | UNKNOWN-001 |

---

## 8. Key File Paths

### Backend Entrypoints
- [app/backend/crates/api/src/main.rs](app/backend/crates/api/src/main.rs) — Server bootstrap
- [app/backend/crates/api/src/state.rs](app/backend/crates/api/src/state.rs) — `AppState::new()`, DB pool, migrations
- [app/backend/crates/api/src/config.rs](app/backend/crates/api/src/config.rs) — Configuration loading

### Error Handling
- [app/backend/crates/api/src/error.rs](app/backend/crates/api/src/error.rs) — `AppError` enum, `IntoResponse`

### Database Layer
- [app/backend/crates/api/src/db/mod.rs](app/backend/crates/api/src/db/mod.rs) — Module declarations
- [app/backend/crates/api/src/db/repos.rs](app/backend/crates/api/src/db/repos.rs) — Auth repositories
- [app/backend/crates/api/src/db/models.rs](app/backend/crates/api/src/db/models.rs) — Auth models

### Routes
- [app/backend/crates/api/src/routes/api.rs](app/backend/crates/api/src/routes/api.rs) — API route tree
- [app/backend/crates/api/src/routes/health.rs](app/backend/crates/api/src/routes/health.rs) — Health checks

### Frontend API Client
- [app/frontend/src/lib/api/client.ts](app/frontend/src/lib/api/client.ts) — Fetch wrapper

---

## 9. Historical Context

### Previous Schema Issues (D1 Era)
The [docs/SCHEMA_DIFF_REPORT.md](docs/SCHEMA_DIFF_REPORT.md) documents historical 500 errors from D1 (Cloudflare) schema mismatches. These are **obsolete** now that the backend uses Postgres, but indicate:
- Endpoint expectations vs schema reality can drift
- Migration ordering was problematic in the past

### Current Status
The Rust backend with sqlx migrations is the **current** production system. The D1 references are historical.

---

## 10. Open Questions (See UNKNOWN.md)

- UNKNOWN-001: Production database host (Neon vs Fly Postgres vs other)
- UNKNOWN-002: Current migration state in production
- UNKNOWN-003: Whether all 14 migrations have been applied

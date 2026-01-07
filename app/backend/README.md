# Ignition Backend API

Rust backend monolith for the Ignition application. Built with Axum + Tower.

## Prerequisites

- Rust 1.83+ (`rustup update stable`)
- Docker & Docker Compose
- PostgreSQL 17+ (via Docker or local)

## Quick Start

```bash
# 1. Start development services (Postgres + MinIO)
docker compose up -d

# 2. Copy environment file
cp .env.example .env

# 3. Run the server
cargo run --package ignition-api
```

## Project Structure

```
app/backend/
├── Cargo.toml              # Workspace manifest
├── Dockerfile              # Production container
├── docker-compose.yml      # Local dev services
├── .env.example            # Environment template
└── crates/
    └── api/                # Main API crate
        └── src/
            ├── main.rs         # Entry point
            ├── config.rs       # Configuration
            ├── error.rs        # Error types
            ├── state.rs        # App state
            ├── middleware/     # Request middleware
            │   ├── auth.rs     # Session extraction
            │   ├── csrf.rs     # CSRF protection
            │   └── cors.rs     # CORS config
            └── routes/         # HTTP handlers
                ├── health.rs   # Health check
                ├── auth.rs     # Authentication
                ├── api.rs      # Business API (stubs)
                └── admin.rs    # Admin API (stubs)
```

## API Endpoints

### Health & Info
- `GET /` - API info
- `GET /health` - Health check

### Authentication
- `GET /auth/providers` - List OAuth providers
- `GET /auth/signin/google` - Start Google OAuth
- `GET /auth/signin/azure` - Start Azure OAuth
- `GET /auth/session` - Get current session
- `POST /auth/signout` - End session

### Business API (`/api/*`)
All routes require authentication.

- `/api/focus/*` - Focus sessions
- `/api/quests/*` - Quest management
- `/api/habits/*` - Habit tracking
- `/api/goals/*` - Goal management
- `/api/calendar/*` - Calendar events
- `/api/daily-plan/*` - Daily planning
- `/api/exercise/*` - Exercise tracking
- `/api/market/*` - Marketplace
- `/api/reference/*` - Reference tracks
- `/api/learn/*` - Learning content
- `/api/user/*` - User management
- `/api/onboarding/*` - Onboarding flow
- `/api/infobase/*` - Info entries
- `/api/ideas/*` - Ideas capture
- `/api/feedback/*` - User feedback
- `/api/analysis/*` - Track analysis
- `/api/books/*` - Book tracking
- `/api/programs/*` - Training programs
- `/api/gamification/*` - Gamification
- `/api/blobs/*` - Blob storage

### Admin API (`/admin/*`)
All routes require admin role.

- `/admin/users/*` - User management
- `/admin/quests/*` - Quest management
- `/admin/skills/*` - Skill definitions
- `/admin/feedback/*` - Feedback review
- `/admin/content/*` - Content management
- `/admin/stats` - Platform statistics
- `/admin/backup` - Backup operations
- `/admin/restore` - Restore operations
- `/admin/db-health` - Database health

## Development

```bash
# Run with hot reload (requires cargo-watch)
cargo watch -x 'run --package ignition-api'

# Run tests
cargo test

# Check formatting
cargo fmt --check

# Lint
cargo clippy
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_HOST` | Bind address | `0.0.0.0` |
| `SERVER_PORT` | Listen port | `8080` |
| `SERVER_ENVIRONMENT` | Environment | `development` |
| `DATABASE_URL` | Postgres connection | Required |
| `AUTH_COOKIE_DOMAIN` | Cookie domain | `localhost` |
| `CORS_ALLOWED_ORIGINS` | Allowed origins | `http://localhost:3000` |

## Security

- **Cookies**: `SameSite=None; Secure; HttpOnly` per security_model.md
- **CSRF**: Origin/Referer verification (DEC-002=A)
- **Auth**: Session-based with force re-auth at cutover (DEC-001=A)
- **RBAC**: DB-backed roles (DEC-004=B)

## License

MIT


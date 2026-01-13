# Docker Compose E2E Setup

## Changes Made

### 1. **Updated `generate_all.py`** (Refactored)
   - **Before**: Generated files to repo root (`generated_schema.sql`, `generated_types.ts`, etc.) AND to app folders
   - **After**: Generates ALL files directly to their destination in app folders:
     - Rust: `app/backend/crates/api/src/db/generated.rs`
     - TypeScript: `app/frontend/src/lib/generated_types.ts`
     - Migrations: `app/backend/migrations/0001_schema.sql`, `0002_seeds.sql`
   - **Archive System**: Creates timestamped copies with schema version in `agent/archive/generated/v2.0.0_YYYYMMDD_HHMMSS_*`
   - **Cleanup**: Automatically deletes old archive copies (keeps last 5)

### 2. **Updated `infra/docker-compose.e2e.yml`**
   - **Before**: Mounted `/app/database/migrations` (wrong path, didn't exist)
   - **After**: Mounts `/app/backend/migrations` (where generated files now go)
   - Result: PostgreSQL container automatically runs migrations on startup

### 3. **Removed Production Hotfix Migration**
   - Deleted `app/backend/migrations/0003_add_missing_defaults.sql`
   - **Why**: This was a one-off fix for existing production data
   - **How**: Schema.json now has all DEFAULT values baked in, so new databases get them automatically

## Result

✅ **Single Source of Truth**: 
- `schema.json` → `generate_all.py` → app folders (no intermediate copies)

✅ **Docker-Friendly**:
- Docker Compose mounts migrations from app folder
- No manual file copying required
- Tests run against fresh database with all migrations applied

✅ **Archive Trail**:
- Every generation creates dated backup in `agent/archive/generated/`
- Old archives automatically pruned
- Easy to rollback schema changes if needed

## Usage

### Start E2E Environment
```bash
docker compose -f infra/docker-compose.e2e.yml up -d
```

### Run Tests
```bash
API_BASE_URL=http://localhost:8081 npx playwright test tests/api-response-format.spec.ts
```

### Cleanup
```bash
docker compose -f infra/docker-compose.e2e.yml down -v
```

## Architecture

```
schema.json (source of truth)
    ↓
tools/schema-generator/generate_all.py
    ├→ app/backend/crates/api/src/db/generated.rs
    ├→ app/frontend/src/lib/generated_types.ts
    ├→ app/backend/migrations/0001_schema.sql
    ├→ app/backend/migrations/0002_seeds.sql
    └→ agent/archive/generated/v2.0.0_YYYYMMDD_*
         (automatic backups with schema date)
```

## Docker Compose Flow

```
docker compose up
    ↓
Mount /app/backend/migrations to /docker-entrypoint-initdb.d
    ↓
PostgreSQL runs:
  - 0001_schema.sql (creates tables with defaults)
  - 0002_seeds.sql (populates seed data)
    ↓
Backend connects to healthy database
    ↓
API ready for tests
```

## Key Improvements

1. **No Manual File Management**: Stop worrying about copying files to docker containers
2. **Automatic Versioning**: Archive copies include schema version and timestamp
3. **Clean Architecture**: Migrations go where they belong (in backend folder)
4. **Self-Cleanup**: Old archives automatically deleted (keeps last 5)
5. **Idempotent Generation**: Running `generate_all.py` multiple times is safe (deletes old generated files first)

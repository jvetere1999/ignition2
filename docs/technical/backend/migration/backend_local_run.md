"Instructions for running the backend locally."

# Backend Local Run Guide

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Location:** `app/backend/`

---

## Prerequisites

### Required

1. **Rust 1.85+** (1.92+ recommended)
   ```bash
   # Install or update Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup update stable
   
   # Verify version
   rustc --version  # Should be 1.85.0 or higher
   ```

2. **Docker & Docker Compose**
   ```bash
   # macOS: Install Docker Desktop
   # Or use brew:
   brew install --cask docker
   
   # Verify
   docker --version
   docker compose version
   ```

---

## Quick Start

### 1. Start Development Services

```bash
cd app/backend

# Start PostgreSQL and MinIO
docker compose up -d

# Verify services are running
docker compose ps
```

Expected output:
```
NAME               STATUS
ignition-postgres  healthy
ignition-minio     healthy
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit if needed (defaults work for local dev)
# nano .env
```

### 3. Run the Server

```bash
# Standard run
cargo run --package ignition-api

# Or with hot reload (requires cargo-watch)
cargo install cargo-watch
cargo watch -x 'run --package ignition-api'
```

Server starts at: **http://localhost:8080**

---

## Verify It Works

### Health Check

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2026-01-06T12:00:00Z"
}
```

### API Info

```bash
curl http://localhost:8080/
```

Expected response:
```
Ignition API
```

### List Auth Providers

```bash
curl http://localhost:8080/auth/providers
```

Expected response:
```json
[]
```
(Empty because OAuth is not configured)

---

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| API | 8080 | http://localhost:8080 |
| PostgreSQL | 5432 | postgres://ignition:ignition_dev@localhost:5432/ignition |
| MinIO S3 | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |

---

## MinIO Console

Access the MinIO (S3-compatible) web console:

1. Open http://localhost:9001
2. Login with:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Create a bucket named `ignition`

---

## PostgreSQL Access

Connect to the database:

```bash
# Using psql
psql postgres://ignition:ignition_dev@localhost:5432/ignition

# Or via Docker
docker exec -it ignition-postgres psql -U ignition ignition
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_HOST` | `0.0.0.0` | Bind address |
| `SERVER_PORT` | `8080` | Listen port |
| `SERVER_ENVIRONMENT` | `development` | Environment mode |
| `DATABASE_URL` | Required | PostgreSQL connection string |
| `AUTH_COOKIE_DOMAIN` | `localhost` | Session cookie domain |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Allowed CORS origins |
| `RUST_LOG` | `ignition_api=debug` | Log level filter |

---

## Common Commands

### Development

```bash
# Run server
cargo run --package ignition-api

# Run with release optimizations
cargo run --package ignition-api --release

# Hot reload
cargo watch -x 'run --package ignition-api'
```

### Testing

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run tests with output
cargo test -- --nocapture
```

### Code Quality

```bash
# Format code
cargo fmt

# Check formatting
cargo fmt --check

# Lint
cargo clippy

# Lint with warnings as errors
cargo clippy -- -D warnings
```

### Build

```bash
# Debug build
cargo build --package ignition-api

# Release build
cargo build --package ignition-api --release
```

---

## Docker Full Stack

Run the complete stack in Docker:

```bash
# Build and start everything
docker compose --profile full up --build

# Stop everything
docker compose --profile full down
```

This starts:
- PostgreSQL (port 5432)
- MinIO (ports 9000, 9001)
- API (port 8080)

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps

# Restart PostgreSQL
docker compose restart postgres

# Check logs
docker compose logs postgres
```

### Rust Build Errors

```bash
# Clean and rebuild
cargo clean
cargo build

# Update dependencies
cargo update
```

### MinIO Not Accessible

```bash
# Check if MinIO is running
docker compose ps

# Restart MinIO
docker compose restart minio

# Check logs
docker compose logs minio
```

---

## Next Steps

Once the backend is running locally:

1. **Frontend Integration**
   - Point frontend `NEXT_PUBLIC_API_URL` to `http://localhost:8080`

2. **Database Setup**
   - Run migrations (Phase 11)
   - Seed data

3. **Feature Migration**
   - Port API routes from Next.js
   - Update frontend to use new endpoints

---

## References

- [backend_scaffold_notes.md](./backend_scaffold_notes.md) - Implementation notes
- [security_model.md](./security_model.md) - Security configuration
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase status


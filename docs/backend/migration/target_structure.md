"Target repository structure after stack split. Defines final layout."

# Target Structure

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** 07 - Structure Plan  
**Source:** current_tree.md, PHASE_GATE.md, copilot-instructions.md

---

## Overview

This document defines the target repository structure after the stack split migration is complete.

---

## Target Directory Tree

```
root/
├── .github/                    # GitHub workflows and configs
│   └── copilot-instructions.md
│
├── infra/                      # Infrastructure as Code
│   ├── terraform/              # Terraform modules (if used)
│   └── scripts/                # Provisioning scripts
│
├── deploy/                     # Deployment configurations
│   ├── docker/                 # Dockerfiles
│   ├── k8s/                    # Kubernetes manifests (if used)
│   ├── github/                 # GitHub Actions workflows
│   └── scripts/                # Deployment scripts
│
├── deprecated/                 # Archived legacy code (mirror structure)
│   ├── src/                    # Old source files
│   ├── wrangler.toml
│   └── open-next.config.ts
│
├── docs/
│   ├── user/                   # End-user documentation
│   ├── frontend/               # Frontend development docs
│   ├── backend/                # Backend development docs
│   │   └── migration/          # Migration tracking (current phase)
│   └── buisness/               # Business/product documentation
│
└── app/
    ├── admin/                  # Admin console (Next.js)
    │   ├── src/
    │   ├── package.json
    │   └── next.config.ts
    │
    ├── frontend/               # Main frontend (Next.js)
    │   ├── src/
    │   │   ├── app/            # Next.js App Router
    │   │   ├── components/     # React components
    │   │   ├── lib/            # Frontend-only utilities
    │   │   └── assets/         # Static assets
    │   ├── public/
    │   ├── tests/              # Playwright E2E tests
    │   ├── package.json
    │   ├── next.config.ts
    │   ├── tsconfig.json
    │   └── vitest.config.ts
    │
    ├── backend/                # Rust Axum backend
    │   ├── src/
    │   │   ├── main.rs
    │   │   ├── lib.rs
    │   │   ├── routes/         # HTTP route handlers
    │   │   ├── auth/           # OAuth, sessions, CSRF
    │   │   ├── db/             # Database client
    │   │   ├── repositories/   # Data access layer
    │   │   ├── storage/        # R2 storage client
    │   │   ├── admin/          # Admin-only logic
    │   │   ├── middleware/     # Axum/Tower middleware
    │   │   └── error/          # Error types
    │   ├── tests/              # Integration tests
    │   ├── Cargo.toml
    │   └── Cargo.lock
    │
    ├── database/               # PostgreSQL migrations
    │   ├── migrations/         # SQL migration files
    │   ├── seeds/              # Seed data
    │   └── scripts/            # DB utility scripts
    │
    └── r2/                     # R2 configuration (backend-only)
        └── .gitkeep            # Placeholder for R2 configs
```

---

## Domain Mapping

### Domains & URLs

| Service | Domain | Location |
|---------|--------|----------|
| Frontend | `ignition.ecent.online` | `app/frontend/` |
| Admin Console | `admin.ignition.ecent.online` | `app/admin/` |
| Backend API | `api.ecent.online` | `app/backend/` |

### API Route Mapping

| Current Next.js Route | Target Rust Route | Module |
|-----------------------|-------------------|--------|
| `/api/auth/*` | `/auth/*` | `routes/auth/` |
| `/api/admin/*` | `/admin/*` | `routes/admin/` |
| `/api/blobs/*` | `/blobs/*` | `routes/blobs/` |
| `/api/focus/*` | `/focus/*` | `routes/focus/` |
| `/api/habits/*` | `/habits/*` | `routes/habits/` |
| `/api/goals/*` | `/goals/*` | `routes/goals/` |
| `/api/quests/*` | `/quests/*` | `routes/quests/` |
| `/api/calendar/*` | `/calendar/*` | `routes/calendar/` |
| `/api/daily-plan/*` | `/daily-plan/*` | `routes/daily_plan/` |
| `/api/exercise/*` | `/exercise/*` | `routes/exercise/` |
| `/api/market/*` | `/market/*` | `routes/market/` |
| `/api/reference/*` | `/reference/*` | `routes/reference/` |
| `/api/learn/*` | `/learn/*` | `routes/learn/` |
| `/api/user/*` | `/user/*` | `routes/user/` |
| `/api/*` (remaining) | `/*` | Various modules |

---

## File Count Estimates

| Directory | Files (Approx) | Notes |
|-----------|----------------|-------|
| `app/frontend/src/` | ~150 | Components, pages, lib |
| `app/admin/src/` | ~30 | Subset of frontend |
| `app/backend/src/` | ~80 | Routes, repos, middleware |
| `app/database/migrations/` | ~60 | Schema + seeds |
| `deprecated/` | ~100 | Archived legacy files |
| `docs/` | ~80 | Reorganized docs |

---

## Key Differences from Current

| Aspect | Current | Target |
|--------|---------|--------|
| API Routes | Next.js (TypeScript) | Rust Axum |
| Database | D1 (SQLite) | PostgreSQL |
| Session Store | D1 | PostgreSQL |
| Auth Logic | Next.js middleware | Rust middleware |
| R2 Access | Workers binding | S3-compatible API |
| Feature Flags | Environment vars | Removed |
| Admin UI | Same app | Separate Next.js app |

---

## References

- [current_tree.md](./current_tree.md) - Current structure
- [module_boundaries.md](./module_boundaries.md) - Backend module design
- [move_plan.md](./move_plan.md) - Migration steps
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase status


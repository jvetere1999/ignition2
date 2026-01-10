"API Contract Strategy for minimizing hand edits during frontend/backend migration."

# API Contract Strategy

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** API Contracts  
**Purpose:** Single source of truth for API schemas/types to minimize hand edits

---

## Overview

This document defines the strategy for maintaining API contracts between:
- **Backend** (Rust/Axum) at `api.ecent.online`
- **Frontend** (Next.js) at `ignition.ecent.online`
- **Admin** (Next.js) at `admin.ignition.ecent.online`

The goal is to **minimize hand edits** by:
1. Generating TypeScript types from Rust structs
2. Using a shared types package consumed by frontend/admin
3. Contract testing to catch drift early

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Source of Truth                             │
│                                                                      │
│   app/backend/crates/api/src/                                       │
│   ├── db/models.rs          (Database entities)                      │
│   ├── storage/types.rs      (Storage types)                          │
│   └── routes/*.rs           (Request/Response types)                 │
│                                                                      │
│   ↓ Code Generation (ts-rs or similar)                              │
│                                                                      │
│   shared/api-types/                                                  │
│   ├── package.json                                                   │
│   ├── src/                                                           │
│   │   ├── index.ts          (Barrel export)                          │
│   │   ├── auth.ts           (Auth types)                             │
│   │   ├── storage.ts        (Blob/R2 types)                          │
│   │   ├── focus.ts          (Focus session types)                    │
│   │   ├── gamification.ts   (XP, wallet, achievements)               │
│   │   └── ...               (Per-domain types)                       │
│   └── tsconfig.json                                                  │
│                                                                      │
│   ↓ NPM Workspace / Path Import                                      │
│                                                                      │
│   app/frontend/             (imports @ignition/api-types)            │
│   app/admin/                (imports @ignition/api-types)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Code Generation Strategy

### Option A: Manual Sync (Short-Term)

For the initial migration, manually maintain TypeScript types that mirror Rust structs:

| Rust File | TypeScript File | Types |
|-----------|-----------------|-------|
| `db/models.rs` | `shared/api-types/src/auth.ts` | User, Session, Account |
| `storage/types.rs` | `shared/api-types/src/storage.ts` | BlobCategory, UploadResponse |
| `routes/auth.rs` | `shared/api-types/src/auth.ts` | SignInRequest, etc. |

**Pros:** Simple, no tooling overhead  
**Cons:** Drift risk, manual updates required

### Option B: ts-rs (Recommended Long-Term)

Use [ts-rs](https://github.com/Aleph-Alpha/ts-rs) to generate TypeScript from Rust:

```rust
use ts_rs::TS;

#[derive(TS)]
#[ts(export)]
pub struct UploadResponse {
    pub id: Uuid,
    pub key: String,
    pub size_bytes: u64,
    pub mime_type: String,
    pub category: BlobCategory,
}
```

**Generates:** `bindings/UploadResponse.ts`

**Pros:** Single source of truth, no drift  
**Cons:** Build step, dependency on ts-rs

### Option C: OpenAPI/JSON Schema

Generate OpenAPI spec from Rust (using `utoipa`), then generate TypeScript from OpenAPI.

**Pros:** Industry standard, documentation  
**Cons:** More complex toolchain

---

## Chosen Approach

**Phase 1 (Now):** Manual sync with shared types package  
**Phase 2 (Later):** Add ts-rs generation as Rust types stabilize

---

## Shared Types Package Structure

```
shared/api-types/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Barrel export
│   ├── common.ts             # Common types (ISOTimestamp, etc.)
│   ├── auth.ts               # Auth/session types
│   ├── storage.ts            # Blob storage types
│   ├── focus.ts              # Focus session types
│   ├── gamification.ts       # XP, wallet, achievements
│   ├── habits.ts             # Habits types
│   ├── goals.ts              # Goals types
│   ├── quests.ts             # Quest types
│   ├── calendar.ts           # Calendar types
│   ├── exercise.ts           # Exercise/workout types
│   ├── admin.ts              # Admin-specific types
│   └── errors.ts             # Error response types
└── README.md
```

---

## Type Categories

### Request Types

Types for API request bodies:

```typescript
// POST /api/focus
export interface CreateFocusSessionRequest {
  duration_minutes: number;
  task_id?: string;
  mode: FocusMode;
}
```

### Response Types

Types for API response bodies:

```typescript
// Response envelope
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    total?: number;
  };
}

// Error response
export interface ApiError {
  error: {
    type: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Entity Types

Types for database entities (returned in responses):

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  // ...
}
```

### Enum Types

Types for enum values:

```typescript
export type UserRole = "user" | "moderator" | "admin";
export type FocusMode = "focus" | "break" | "long_break";
export type BlobCategory = "audio" | "images" | "exports" | "other";
```

---

## Integration with Frontends

### NPM Workspace

Configure as workspace package:

```json
// root package.json
{
  "workspaces": [
    "app/frontend",
    "app/admin",
    "shared/api-types"
  ]
}
```

### Import in Frontend

```typescript
import type { User, FocusSession, ApiResponse } from "@ignition/api-types";

const response: ApiResponse<User> = await apiClient.get("/api/user/me");
```

### API Client Wrapper

Single fetch wrapper with type safety:

```typescript
// app/frontend/src/lib/api/client.ts
import type { ApiResponse, ApiError } from "@ignition/api-types";

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // Forward cookies
    headers: { "Content-Type": "application/json" },
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new ApiClientError(error);
  }
  
  return response.json();
}
```

---

## Versioning Strategy

### No API Versioning (for now)

Per copilot-instructions: "No back-compat and no public API guarantees."

- Types are internal between frontend/backend
- Breaking changes are acceptable during migration
- Version via git commits, not API paths

### Future Consideration

If public API is ever exposed:
- Use path versioning: `/api/v1/...`
- Maintain separate type versions

---

## Validation and Testing

### Contract Tests

See [contract_tests_plan.md](./contract_tests_plan.md) for details.

Summary:
- Backend integration tests validate response shapes
- Frontend snapshot tests validate expected types
- CI runs contract tests on every PR

### Type Checking

```bash
# In shared/api-types
npm run typecheck

# In frontend/admin
npm run typecheck  # Will catch type mismatches
```

---

## Migration Process

### For Each Feature Domain:

1. **Define Rust types** in backend
2. **Create TypeScript types** in `shared/api-types/src/<domain>.ts`
3. **Export from index.ts**
4. **Import in frontend/admin**
5. **Add contract tests**

### Example: Focus Domain

```rust
// backend: routes/focus.rs
#[derive(Serialize, Deserialize)]
pub struct CreateFocusRequest {
    pub duration_minutes: u32,
    pub mode: FocusMode,
}

#[derive(Serialize, Deserialize)]
pub struct FocusSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub duration_minutes: u32,
    pub mode: FocusMode,
    pub status: FocusStatus,
    pub started_at: DateTime<Utc>,
}
```

```typescript
// shared/api-types/src/focus.ts
export interface CreateFocusRequest {
  duration_minutes: number;
  mode: FocusMode;
}

export interface FocusSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  mode: FocusMode;
  status: FocusStatus;
  started_at: string; // ISO 8601
}
```

---

## Naming Conventions

| Rust | TypeScript | Notes |
|------|------------|-------|
| `Uuid` | `string` | UUID as string in JSON |
| `DateTime<Utc>` | `string` | ISO 8601 format |
| `Option<T>` | `T \| undefined` | Optional fields |
| `Vec<T>` | `T[]` | Arrays |
| `HashMap<K, V>` | `Record<K, V>` | Objects |
| `snake_case` | `snake_case` | Keep consistent with JSON |

---

## Files to Create

| File | Purpose |
|------|---------|
| `shared/api-types/package.json` | Package configuration |
| `shared/api-types/tsconfig.json` | TypeScript configuration |
| `shared/api-types/src/index.ts` | Barrel export |
| `shared/api-types/src/common.ts` | Common types |
| `shared/api-types/src/auth.ts` | Auth types |
| `shared/api-types/src/storage.ts` | Storage types |
| `shared/api-types/src/errors.ts` | Error types |
| `docs/frontend/consuming-api-types.md` | Frontend guide |
| `docs/backend/migration/contract_tests_plan.md` | Test plan |

---

## References

- [api_endpoint_inventory.md](./api_endpoint_inventory.md) - All endpoints
- [r2_api_spec.md](./r2_api_spec.md) - R2 API specification
- [ts-rs](https://github.com/Aleph-Alpha/ts-rs) - TypeScript generation
- [utoipa](https://github.com/juhaku/utoipa) - OpenAPI generation


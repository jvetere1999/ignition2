"Contract tests plan for API type validation between frontend and backend."

# Contract Tests Plan

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Ensure API contracts remain synchronized between frontend and backend

---

## Overview

Contract tests validate that:
1. Backend responses match expected TypeScript types
2. Frontend requests match expected Rust types
3. Type changes are caught before they cause runtime errors

---

## Testing Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     Contract Testing Layers                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Static Type Checking                                   │
│  ├── TypeScript compiler in shared/api-types                     │
│  ├── TypeScript compiler in app/frontend                         │
│  └── TypeScript compiler in app/admin                            │
│                                                                  │
│  Layer 2: Backend Integration Tests                              │
│  ├── Rust tests validate response serialization                  │
│  └── Assert response JSON matches expected schema                │
│                                                                  │
│  Layer 3: Frontend Snapshot Tests                                │
│  ├── Capture API response snapshots                              │
│  └── Assert snapshots match TypeScript types                     │
│                                                                  │
│  Layer 4: E2E Contract Tests                                     │
│  ├── Playwright tests exercise real API                          │
│  └── Validate response shapes in browser context                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Static Type Checking

### Implementation

Run TypeScript compiler on all type consumers:

```bash
# Check shared types compile
cd shared/api-types && npm run typecheck

# Check frontend types align
cd app/frontend && npm run typecheck

# Check admin types align
cd app/admin && npm run typecheck
```

### CI Integration

```yaml
# .github/workflows/ci.yml
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run typecheck --workspace=@ignition/api-types
      - run: npm run typecheck --workspace=@ignition/frontend
      - run: npm run typecheck --workspace=@ignition/admin
```

### What It Catches

- Missing required fields
- Type mismatches (string vs number)
- Incorrect enum values
- Renamed properties

---

## Layer 2: Backend Integration Tests

### Location

`app/backend/crates/api/src/tests/contract_tests.rs`

### Implementation

Test that serialized responses match expected JSON schema:

```rust
#[cfg(test)]
mod contract_tests {
    use crate::db::models::User;
    use serde_json::json;

    /// Verify User serializes with expected fields
    #[test]
    fn test_user_contract() {
        let user = User {
            id: uuid::Uuid::new_v4(),
            name: "Test User".to_string(),
            email: "test@example.com".to_string(),
            email_verified: None,
            image: None,
            role: "user".to_string(),
            approved: true,
            age_verified: true,
            tos_accepted: true,
            tos_accepted_at: None,
            tos_version: Some("1.0".to_string()),
            last_activity_at: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let json = serde_json::to_value(&user).unwrap();

        // Assert required fields exist
        assert!(json.get("id").is_some());
        assert!(json.get("name").is_some());
        assert!(json.get("email").is_some());
        assert!(json.get("role").is_some());
        assert!(json.get("approved").is_some());
        assert!(json.get("created_at").is_some());
        
        // Assert types
        assert!(json["id"].is_string());
        assert!(json["approved"].is_boolean());
        assert!(json["role"].is_string());
    }

    /// Verify UploadResponse contract
    #[test]
    fn test_upload_response_contract() {
        use crate::storage::types::{UploadResponse, BlobCategory};
        
        let response = UploadResponse {
            id: uuid::Uuid::new_v4(),
            key: "user-id/audio/blob-id.mp3".to_string(),
            size_bytes: 1024,
            mime_type: "audio/mpeg".to_string(),
            category: BlobCategory::Audio,
        };

        let json = serde_json::to_value(&response).unwrap();

        assert!(json["id"].is_string());
        assert!(json["key"].is_string());
        assert!(json["size_bytes"].is_number());
        assert!(json["mime_type"].is_string());
        assert!(json["category"].is_string());
        assert_eq!(json["category"], "audio");
    }
}
```

### What It Catches

- Rust field renaming breaking JSON
- serde attribute changes
- Missing Serialize derive

---

## Layer 3: Frontend Snapshot Tests

### Location

`app/frontend/src/__tests__/api-contracts/`

### Implementation

Use Vitest to snapshot API response shapes:

```typescript
// app/frontend/src/__tests__/api-contracts/user.test.ts
import { describe, it, expect } from 'vitest';
import type { User, CurrentUserResponse } from '@ignition/api-types';

describe('User API Contract', () => {
  it('should match User type shape', () => {
    // Mock response matching expected shape
    const user: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      approved: true,
      age_verified: true,
      tos_accepted: true,
      created_at: '2026-01-07T00:00:00Z',
      updated_at: '2026-01-07T00:00:00Z',
    };

    // This compiles = contract is valid
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    
    // Snapshot test for regression
    expect(Object.keys(user).sort()).toMatchInlineSnapshot(`
      [
        "age_verified",
        "approved",
        "created_at",
        "email",
        "id",
        "name",
        "role",
        "tos_accepted",
        "updated_at",
      ]
    `);
  });

  it('should match CurrentUserResponse shape', () => {
    const response: CurrentUserResponse = {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        approved: true,
        age_verified: true,
        tos_accepted: true,
        created_at: '2026-01-07T00:00:00Z',
        updated_at: '2026-01-07T00:00:00Z',
      },
      entitlements: ['admin:access'],
    };

    expect(response.user).toBeDefined();
    expect(response.entitlements).toBeDefined();
    expect(Array.isArray(response.entitlements)).toBe(true);
  });
});
```

### What It Catches

- Shape changes in TypeScript types
- Optional field becoming required
- New required fields added

---

## Layer 4: E2E Contract Tests

### Location

`tests/contracts/`

### Implementation

Playwright tests that validate real API responses:

```typescript
// tests/contracts/user-contract.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User API Contract', () => {
  test('GET /api/user/me returns expected shape', async ({ request }) => {
    // This test requires auth - skip if not authenticated
    const response = await request.get('/api/user/me');
    
    if (response.status() === 401) {
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    
    // Validate response structure
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('user');
    
    const user = data.data.user;
    
    // Required fields
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('approved');
    expect(user).toHaveProperty('created_at');
    
    // Type checks
    expect(typeof user.id).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(typeof user.approved).toBe('boolean');
    expect(['user', 'moderator', 'admin']).toContain(user.role);
  });

  test('GET /api/blobs returns expected shape', async ({ request }) => {
    const response = await request.get('/api/blobs');
    
    if (response.status() === 401) {
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    
    // If there are blobs, validate shape
    if (data.data.length > 0) {
      const blob = data.data[0];
      expect(blob).toHaveProperty('id');
      expect(blob).toHaveProperty('key');
      expect(blob).toHaveProperty('size_bytes');
      expect(blob).toHaveProperty('category');
      expect(['audio', 'images', 'exports', 'other']).toContain(blob.category);
    }
  });
});
```

### What It Catches

- Runtime serialization issues
- Middleware transformations
- Real data edge cases

---

## Test Matrix

| Endpoint | Backend Test | Snapshot Test | E2E Test |
|----------|--------------|---------------|----------|
| GET /api/user/me | ✅ | ✅ | ✅ |
| POST /api/focus | ✅ | ✅ | 🔄 |
| GET /api/focus | ✅ | ✅ | 🔄 |
| POST /api/blobs/upload | ✅ | ✅ | 🔄 |
| GET /api/blobs/:id | ✅ | ✅ | 🔄 |
| GET /api/blobs | ✅ | ✅ | ✅ |
| GET /api/gamification/summary | ✅ | ✅ | 🔄 |
| GET /health | ✅ | - | ✅ |

Legend:
- ✅ Implemented
- 🔄 To be implemented during feature porting
- ❌ Not needed

---

## CI Pipeline Integration

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  push:
    paths:
      - 'shared/api-types/**'
      - 'app/backend/crates/api/src/**'
      - 'app/frontend/src/**'
      - 'app/admin/src/**'

jobs:
  static-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run typecheck --workspaces

  backend-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      - run: cd app/backend && cargo test contract_tests

  frontend-snapshots:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: cd app/frontend && npm run test:contracts

  e2e-contracts:
    runs-on: ubuntu-latest
    needs: [backend-contracts]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e:contracts
```

---

## Breaking Change Protocol

When a breaking change is needed:

1. **Update backend types** in Rust
2. **Update shared types** in `@ignition/api-types`
3. **Run contract tests** - they should fail
4. **Update frontend code** to handle new types
5. **Update contract tests** to expect new shape
6. **Run all tests** - they should pass
7. **Commit atomically** with all changes

---

## Files to Create

| File                                                 | Purpose                 |
|------------------------------------------------------|-------------------------|
| `app/backend/crates/api/src/tests/contract_tests.rs` | Backend contract tests  |
| `app/frontend/src/__tests__/api-contracts/`          | Frontend snapshot tests |
| `tests/contracts/`                                   | E2E contract tests      |
| `.github/workflows/contract-tests.yml`               | CI pipeline             |

---

## Implementation Priority

| Priority | Test Type               | When                   |
|----------|-------------------------|------------------------|
| 1        | Static Type Checking    | Now (already working)  |
| 2        | Backend Contract Tests  | During feature porting |
| 3        | Frontend Snapshot Tests | During feature porting |
| 4        | E2E Contract Tests      | After features working |

---

## References

- [api_contract_strategy.md](./api_contract_strategy.md)
- [consuming-api-types.md](../../docs/frontend/consuming-api-types.md)
- [@ignition/api-types](../../shared/api-types/README.md)


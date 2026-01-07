"This file tracks required actions. Do not restate unknowns; reference UNKNOWN-XXX IDs."

# Migration Gaps - Action Items

**Date:** January 6, 2026  
**Updated:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Track required actions to close gaps and resolve unknowns

---

## Summary

| Status             | Count  |
|--------------------|--------|
| Done               | 18     |
| External           | 5      |
| Blocked (Decision) | 0      |
| Not Started        | 3      |
| Deferred           | 5      |
| **Total**          | **31** |

---

## Phase 1.10: Feature Table Migrations (DONE)

### ACTION-036: Create Feature Table Migrations

| Field        | Value                                                                                           |
|--------------|-------------------------------------------------------------------------------------------------|
| **Resolves** | D1 → Postgres schema translation for Waves 1-3                                                   |
| **Status**   | **Done**                                                                                        |
| **Evidence** | `app/database/migrations/0002-0007*.sql`, migration notes, reconciliation plan                   |
| **Result**   | 6 migrations covering 10/24 table groups; 26 new tables created                                 |

**Migrations Created:**
- 0002: Gamification (8 tables, 4 functions, 1 view)
- 0003: Focus (2 tables, 2 functions, 2 views)
- 0004: Habits/Goals (4 tables, 2 functions, 2 views)
- 0005: Quests (3 tables, 3 functions, 2 views)
- 0006: Planning (3 tables, 2 views)
- 0007: Market (2 tables, 2 functions, 3 views)

---

## Phase 1.9: Frontend API Client (DONE)

### ACTION-035: Create Shared API Client

| Field        | Value                                                                                           |
|--------------|-------------------------------------------------------------------------------------------------|
| **Resolves** | Single API client wrapper for frontend/admin                                                     |
| **Status**   | **Done**                                                                                        |
| **Evidence** | `shared/api-client/`, `docs/frontend/migration/api_swap_progress.md`, `tests/storage.spec.ts`    |
| **Result**   | API client with hooks, server client, Playwright tests; 12/64 routes done                       |

---

## Phase 1.8: Feature Porting Playbook (DONE)

### ACTION-034: Create Feature Porting Playbook

| Field        | Value                                                                                                                      |
|--------------|----------------------------------------------------------------------------------------------------------------------------|
| **Resolves** | Systematic feature porting process                                                                                         |
| **Status**   | **Done**                                                                                                                   |
| **Evidence** | [feature_porting_playbook.md](./feature_porting_playbook.md), [feature_parity_checklist.md](./feature_parity_checklist.md) |
| **Result**   | Playbook with templates; checklist tracking 56 routes (6 done, 50 pending)                                                 |

---

## Phase 1.7: API Contracts (DONE)

### ACTION-033: Create Shared API Types Package

| Field        | Value                                                                                           |
|--------------|-------------------------------------------------------------------------------------------------|
| **Resolves** | Minimize hand-coding during frontend/backend integration                                         |
| **Status**   | **Done**                                                                                        |
| **Evidence** | `shared/api-types/` typechecks, [api_contract_strategy.md](./api_contract_strategy.md)           |
| **Result**   | Shared types package with auth, storage, focus, gamification types; frontend guide; test plan   |

---

## Phase 1.6: R2 Integration (DONE)

### ACTION-032: Implement R2 Storage Backend

| Field        | Value                                                                                           |
|--------------|-------------------------------------------------------------------------------------------------|
| **Resolves** | R2 backend-only access requirement                                                               |
| **Status**   | **Done**                                                                                        |
| **Evidence** | [r2_api_spec.md](./r2_api_spec.md), 15 storage tests passing                                     |
| **Result**   | Storage client, blob routes, signed URLs, IDOR prevention; 35 total tests passing               |

---

## Phase 1.5: Auth Implementation (DONE)

### ACTION-031: Implement Auth/Sessions/RBAC

| Field        | Value                                                                                                        |
|--------------|--------------------------------------------------------------------------------------------------------------|
| **Resolves** | DEC-001, DEC-002, DEC-004 requirements                                                                       |
| **Status**   | **Done**                                                                                                     |
| **Evidence** | [auth_impl_notes.md](./auth_impl_notes.md), [gaps_checkpoint_after_auth.md](./gaps_checkpoint_after_auth.md) |
| **Result**   | OAuth, sessions, CSRF, RBAC implemented; 20 tests passing                                                    |

---

## Phase 1: Unblock Backend Development

### ACTION-001: Provision PostgreSQL Database

| Field        | Value                                               |
|--------------|-----------------------------------------------------|
| **Resolves** | UNKNOWN-007                                         |
| **Status**   | **External** → See [LATER.md](./LATER.md#later-001) |
| **Evidence** | Requires cloud provider console access              |

---

### ACTION-002: Set Up Azure Key Vault

| Field        | Value                                               |
|--------------|-----------------------------------------------------|
| **Resolves** | UNKNOWN-006                                         |
| **Status**   | **External** → See [LATER.md](./LATER.md#later-002) |
| **Evidence** | Requires Azure subscription access                  |

---

### ACTION-003: Generate R2 S3 API Credentials

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-005 |
| **Status** | **External** → See [LATER.md](./LATER.md#later-003) |
| **Evidence** | Requires Cloudflare dashboard access |

---

### ACTION-004: Complete D1 Schema Audit

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-012, UNKNOWN-013 |
| **Status** | **Done** |
| **Evidence** | `.tmp/quests_usage.log`, `.tmp/user_progress_usage.log` |
| **Result** | Both quests tables active; user_progress actively used |

See: [NOW.md](./NOW.md)

---

## Phase 2: Unblock Auth Implementation

### ACTION-005: Document OAuth Redirect URIs

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-002 |
| **Status** | **External** → See [LATER.md](./LATER.md#later-004) |
| **Evidence** | Requires Google/Azure console access |

---

### ACTION-006: Design CSRF Protection

| Field | Value |
|-------|-------|
| **Resolves** | Security requirement |
| **Status** | **Done** (DEC-002 = A) |
| **Evidence** | Origin/Referer verification chosen. See [DECISIONS.md](./DECISIONS.md) |
| **Result** | CSRF = strict Origin/Referer allowlist for POST/PUT/PATCH/DELETE |

---

### ACTION-007: Decide Session Migration Strategy

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-001 |
| **Status** | **Done** (DEC-001 = A) |
| **Evidence** | Force re-auth chosen. See [DECISIONS.md](./DECISIONS.md) |
| **Result** | D1 unseeded data may be deleted at cutover |

---

## Phase 3: Unblock Deployment

### ACTION-008: Decide Container Platform

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-008 |
| **Status** | **External** → See [LATER.md](./LATER.md#later-005) |
| **Evidence** | Requires infrastructure decision |

---

### ACTION-009: Configure api.ecent.online Domain

| Field | Value |
|-------|-------|
| **Resolves** | Infrastructure requirement |
| **Status** | **Not Started** |
| **Evidence** | DNS/TLS provisioning needed |

---

### ACTION-010: Configure admin.ignition.ecent.online Domain

| Field | Value |
|-------|-------|
| **Resolves** | Infrastructure requirement |
| **Status** | **Not Started** |
| **Evidence** | DNS/TLS provisioning needed |

---

## Phase 4: Implementation (Resolved via Repo Inspection)

### ACTION-011: Audit Auth Handler Implementation

| Field | Value |
|-------|-------|
| **Resolves** | Gap in api_endpoint_inventory.md |
| **Status** | **Not Started** |
| **When** | Before implementing auth routes in Rust |

---

### ACTION-012: Audit Habits Route

| Field | Value |
|-------|-------|
| **Resolves** | Gap in api_endpoint_inventory.md |
| **Status** | **Not Started** |
| **When** | Before implementing habits routes in Rust |

---

### ACTION-013: Audit Learn Routes

| Field | Value |
|-------|-------|
| **Resolves** | Gap in api_endpoint_inventory.md |
| **Status** | **Not Started** |
| **When** | Before implementing learn routes in Rust |

---

### ACTION-014: Audit Focus Routes

| Field | Value |
|-------|-------|
| **Resolves** | Gap in api_endpoint_inventory.md |
| **Status** | **Not Started** |
| **When** | Before implementing focus routes in Rust |

---

### ACTION-015: Audit Quests Route

| Field | Value |
|-------|-------|
| **Resolves** | Gap in api_endpoint_inventory.md |
| **Status** | **Not Started** |
| **When** | Before implementing quests routes in Rust |

---

### ACTION-016: Audit Feature Flag Usage

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-003 |
| **Status** | **Done** |
| **Evidence** | `.tmp/flag_today_usage.log`, `src/lib/flags/index.ts` |
| **Result** | All flags are deprecated stubs returning true |

See: [NOW.md](./NOW.md)

---

### ACTION-017: Audit Audit Log Usage

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-004 |
| **Status** | **Done** |
| **Evidence** | `.tmp/audit_log_usage.log` (empty) |
| **Result** | admin_audit_log table not used in code |

See: [NOW.md](./NOW.md)

---

### ACTION-018: Clarify quests vs universal_quests

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-012 |
| **Status** | **Done** |
| **Evidence** | `.tmp/quests_usage.log` |
| **Result** | Both tables active, serve different purposes |

See: [NOW.md](./NOW.md)

---

### ACTION-019: Clarify user_progress Table

| Field | Value |
|-------|-------|
| **Resolves** | UNKNOWN-013 |
| **Status** | **Done** |
| **Evidence** | `.tmp/user_progress_usage.log` |
| **Result** | Actively used for XP/level tracking |

See: [NOW.md](./NOW.md)

---

### ACTION-020: Clarify learn_exercises/learn_modules Tables

| Field | Value |
|-------|-------|
| **Resolves** | Gap in d1_usage_inventory.md |
| **Status** | **Deferred** |
| **When** | During schema migration |

---

### ACTION-021: Document R2 File Size Limits

| Field | Value |
|-------|-------|
| **Resolves** | Gap in r2_usage_inventory.md |
| **Status** | **Done** |
| **Evidence** | `src/lib/storage/types.ts:99-107` |
| **Result** | MAX_FILE=100MB, MAX_AUDIO=50MB, MAX_IMAGE=10MB |

See: [NOW.md](./NOW.md)

---

### ACTION-022: Check Storage Quota Implementation

| Field        | Value                                                |
|--------------|------------------------------------------------------|
| **Resolves** | UNKNOWN-014                                          |
| **Status**   | **Done**                                             |
| **Evidence** | `.tmp/storage_quota.log`, `src/lib/storage/types.ts` |
| **Result**   | Per-file limits exist; no per-user quotas            |

See: [NOW.md](./NOW.md)

---

### ACTION-023: Check Orphan Blob Cleanup

| Field        | Value                       |
|--------------|-----------------------------|
| **Resolves** | UNKNOWN-015                 |
| **Status**   | **Done**                    |
| **Evidence** | `.tmp/orphan_cleanup.log`   |
| **Result**   | No cleanup mechanism exists |

See: [NOW.md](./NOW.md)

---

### ACTION-024: Audit Mobile Routes

| Field        | Value                                                   |
|--------------|---------------------------------------------------------|
| **Resolves** | UNKNOWN-009                                             |
| **Status**   | **Done**                                                |
| **Evidence** | `.tmp/mobile_files.log`, `.tmp/mobile_dependencies.log` |
| **Result**   | Standard patterns, no special dependencies              |

See: [NOW.md](./NOW.md)

---

### ACTION-025: Research Session Token Rotation

| Field        | Value                      |
|--------------|----------------------------|
| **Resolves** | Gap in auth_inventory.md   |
| **Status**   | **Deferred**               |
| **When**     | During auth implementation |

---

### ACTION-026: Test Account Linking Edge Cases

| Field        | Value                    |
|--------------|--------------------------|
| **Resolves** | Gap in auth_inventory.md |
| **Status**   | **Deferred**             |
| **When**     | During auth testing      |

---

### ACTION-027: Document TOS Enforcement Flow

| Field        | Value                              |
|--------------|------------------------------------|
| **Resolves** | Gap in auth_inventory.md           |
| **Status**   | **Deferred**                       |
| **When**     | Before implementing TOS in backend |

---

### ACTION-028: Decide Lint Warning Resolution Timing

| Field        | Value                                                         |
|--------------|---------------------------------------------------------------|
| **Resolves** | UNKNOWN-016                                                   |
| **Status**   | **Done** (DEC-003 = C)                                        |
| **Evidence** | Fix post-migration chosen. See [DECISIONS.md](./DECISIONS.md) |
| **Result**   | Temporary baseline waiver in [exceptions.md](./exceptions.md) |

---

### ACTION-029: Assess E2E Test Coverage

| Field        | Value                          |
|--------------|--------------------------------|
| **Resolves** | UNKNOWN-011                    |
| **Status**   | **Deferred**                   |
| **When**     | Before migration testing phase |

---

### ACTION-030: Decide Admin Authorization Strategy

| Field        | Value                                                               |
|--------------|---------------------------------------------------------------------|
| **Resolves** | UNKNOWN-017, RISK-008                                               |
| **Status**   | **Done** (DEC-004 = B)                                              |
| **Evidence** | DB-backed roles chosen. See [DECISIONS.md](./DECISIONS.md)          |
| **Result**   | Admin authorization = DB-backed roles (user-borne gating persisted) |

---

## Status Summary by Phase

| Phase                    | Done   | External | Blocked | Not Started | Deferred |
|--------------------------|--------|----------|---------|-------------|----------|
| Phase 1 (Infrastructure) | 1      | 3        | 0       | 0           | 0        |
| Phase 2 (Auth)           | 2      | 1        | 0       | 0           | 0        |
| Phase 3 (Deployment)     | 0      | 1        | 0       | 2           | 0        |
| Phase 4 (Implementation) | 9      | 0        | 0       | 6           | 5        |
| **Total**                | **12** | **5**    | **0**   | **8**       | **5**    |

---

## References

- [PHASE_GATE.md](./PHASE_GATE.md) - Phase gating status
- [NOW.md](./NOW.md) - Items resolved via repo inspection
- [LATER.md](./LATER.md) - Items requiring external access
- [DECISIONS.md](./DECISIONS.md) - Owner decision record (DEC-XXX)
- [DECISIONS_REGISTER.md](./DECISIONS_REGISTER.md) - Full decision context
- [UNKNOWN.md](./UNKNOWN.md) - Unknown facts (reference by UNKNOWN-XXX ID)


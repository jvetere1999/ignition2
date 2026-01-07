"Phase gating document. Check before starting any phase. Updated after decisions are applied."

# Phase Gate

**Created:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Gate each migration phase based on decisions, unknowns, and external dependencies

---

## Quick Status

| Phase | Name | Status | Blockers |
|-------|------|--------|----------|
| 06 | Skeleton | ✅ **Complete** | None |
| 07 | Structure Plan | ✅ **Complete** | None |
| 08 | Backend Scaffold | ✅ **Complete** | None (local complete) |
| 11 | Database Migration | ✅ **Complete** (local) | LATER-001 (prod only) |
| 11a | Auth Implementation | ✅ **Complete** | None |
| 11c | Gamification Substrate | ✅ **Ready** | None |
| 14 | R2 Integration | ✅ **Complete** (local) | LATER-003 (prod only) |
| 17 | Frontend API Client | ✅ **Complete** | None |
| 20 | Admin Console | ✅ **Ready** | None |
| 23 | Infrastructure | 🔴 **Blocked** | LATER-001 through LATER-005, LATER-009-011 |
| 26 | Cutover | 🔴 **Blocked** | All external items must be complete |

---

## Decision Status

All required decisions are **CHOSEN**:

| DEC-ID | Decision | Status | Chosen |
|--------|----------|--------|--------|
| DEC-001 | Session Migration | ✅ Chosen | **A** (Force re-auth) |
| DEC-002 | CSRF Protection | ✅ Chosen | **A** (Origin verification) |
| DEC-003 | Lint Warnings | ✅ Chosen | **C** (Post-migration) |
| DEC-004 | Admin Auth | ✅ Chosen | **B** (DB-backed roles) |

**No decisions are blocking any phase.**

---

## Phase Details

### Phase 06: Skeleton Ensure

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Complete** |
| **Prerequisites** | None |
| **Decisions Required** | None |
| **External Blockers** | None |
| **Actions Required** | ~~Verify skeleton directories exist~~ |
| **Completed** | January 6, 2026 |

**All 14 skeleton directories verified. See [skeleton_status.md](./skeleton_status.md).**

---

### Phase 07: Target Structure & Move Plan

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Complete** |
| **Prerequisites** | Phase 06 complete ✅ |
| **Decisions Required** | None |
| **External Blockers** | None |
| **Actions Required** | ~~Create move plan for src/ → app/~~ |
| **Completed** | January 6, 2026 |

**Deliverables created:**
- [target_structure.md](./target_structure.md)
- [module_boundaries.md](./module_boundaries.md)
- [routing_and_domains.md](./routing_and_domains.md)
- [security_model.md](./security_model.md)
- [move_plan.md](./move_plan.md)
- [deprecated_mirror_policy.md](./deprecated_mirror_policy.md)

---

### Frontend Move (Pre-Phase 08)

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Complete** |
| **Prerequisites** | Phase 07 complete ✅ |
| **Decisions Required** | None |
| **External Blockers** | None |
| **Completed** | January 6, 2026 |

**Deliverables:**
- [move_frontend_report.md](./move_frontend_report.md) - Full move report
- [current_tree.md](./current_tree.md) - Updated with new structure
- [exceptions.md](./exceptions.md) - EXC-002 for temporary duplication

**Validation Results:**
- typecheck: ✅ Pass
- lint: ✅ Pass (44 warnings, matches baseline)
- build: ✅ Pass (Next.js 15.5.9)

---

### Phase 08: Backend Scaffold

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Complete** |
| **Prerequisites** | Phase 07 complete ✅ |
| **Decisions Required** | DEC-001 ✅, DEC-002 ✅, DEC-004 ✅ |
| **External Blockers** | None for local scaffold |
| **Completed** | January 6, 2026 |

**Deliverables created:**
- [validation_backend_scaffold.md](./validation_backend_scaffold.md) - Validation report
- [backend_scaffold_notes.md](./backend_scaffold_notes.md) - Implementation notes
- [backend_local_run.md](./backend_local_run.md) - Local run guide

**Validation Results:**
- cargo check: ✅ Pass (17 dead-code warnings, expected)
- cargo fmt: ✅ Pass
- cargo clippy: ✅ Pass

**Gap Checkpoint:** [gaps_checkpoint_after_backend_scaffold.md](./gaps_checkpoint_after_backend_scaffold.md)

---

### Phase 11: Database Migration (D1 → Postgres)

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Complete** (local) |
| **Prerequisites** | Phase 08 complete ✅ |
| **Decisions Required** | DEC-004 ✅ (DB-backed roles affects schema) |
| **External Blockers** | |
| - LATER-001 | PostgreSQL provisioning (for production) |
| **Actions Completed** | Auth substrate migration + validation |

**Deliverables:**
- `app/database/migrations/0001_auth_substrate.sql` - Auth/RBAC/audit tables
- `app/database/migrations/0001_auth_substrate.down.sql` - Rollback
- `app/database/schema.md` - Schema documentation
- [db_substrate_plan.md](./db_substrate_plan.md) - Migration plan
- [validation_db_migrations.md](./validation_db_migrations.md) - Live validation

**Auth Implementation Completed:**
- OAuth service (Google + Azure)
- Session management with rotation
- RBAC with entitlements
- CSRF Origin/Referer verification
- Dev bypass with guardrails
- 20 unit/integration tests passing

See [auth_impl_notes.md](./auth_impl_notes.md) for implementation details.

Schema policy: 1:1 translation by default. See [schema_exceptions.md](./schema_exceptions.md).

---

### Phase 14: R2 Integration

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Complete** (local) |
| **Prerequisites** | Phase 08 ✅, Phase 11a auth ✅ |
| **Decisions Required** | None |
| **External Blockers** | |
| - LATER-003 | R2 S3 API credentials (production only) |
| **Actions Completed** | R2 client, blob routes, tests |

**Gap Checkpoint:** [gaps_checkpoint_after_r2.md](./gaps_checkpoint_after_r2.md)

**R2 Implementation Completed:**
- Storage module with S3-compatible client
- Prefix-based user isolation (IDOR prevention)
- Signed URL generation for uploads/downloads
- MIME type and file size validation
- Blob routes (/api/blobs/*)
- 15 storage tests passing

**API Spec:** [r2_api_spec.md](./r2_api_spec.md)

**Production R2 access requires LATER-003.**

---

### Phase 17: Frontend API Client

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Complete** |
| **Prerequisites** | Phase 14 R2 ✅, API types ✅ |
| **Decisions Required** | DEC-003 ✅ (lint warnings post-migration) |
| **External Blockers** | None |
| **Actions Completed** | API client package, swap tracking, Playwright tests |

**Gap Checkpoint:** [gaps_checkpoint_after_api_swaps.md](./gaps_checkpoint_after_api_swaps.md)

**Deliverables:**
- `shared/api-client/` - Shared API client package
- `docs/frontend/migration/api_swap_progress.md` - Swap tracking
- `tests/storage.spec.ts` - Playwright tests for storage
- `docs/backend/migration/feature_porting_playbook.md` - Porting playbook
- `docs/backend/migration/feature_parity_checklist.md` - Parity tracking (12/64 done)

**Progress:** 12 routes done, 52 pending (19% complete)

---

### Phase 11c: Gamification Substrate

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Ready** |
| **Prerequisites** | Phase 11a auth ✅, Phase 17 API client ✅ |
| **Decisions Required** | None |
| **External Blockers** | None |
| **Actions Required** | |
| - | Create 0002_gamification.sql migration |
| - | Implement gamification repos |
| - | Implement gamification routes |
| - | Add gamification tests |

**Required Tables:**
- user_progress (XP, level, streak)
- user_wallet (coins, balance)
- points_ledger (transaction history)
- achievement_definitions
- user_achievements

**Blocks:** Focus, Habits, Quests, Market (all depend on XP/wallet)

---

### Phase 20: Admin Console Split

| Aspect | Status |
|--------|--------|
| **Gate Status** | ✅ **Ready** |
| **Prerequisites** | Phase 17 frontend structure established |
| **Decisions Required** | DEC-004 ✅ (DB-backed admin roles) |
| **External Blockers** | None |
| **Actions Available** | Create app/admin/, implement admin routes |

**Can proceed after frontend structure is established.**

---

### Phase 23: Infrastructure & Deployment

| Aspect | Status |
|--------|--------|
| **Gate Status** | 🔴 **Blocked** |
| **Prerequisites** | All code phases complete |
| **Decisions Required** | None |
| **External Blockers** | |
| - LATER-001 | PostgreSQL provisioning |
| - LATER-002 | Azure Key Vault |
| - LATER-003 | R2 S3 credentials |
| - LATER-004 | OAuth redirect URIs |
| - LATER-005 | Container platform |
| - LATER-009 | api.ecent.online domain |
| - LATER-010 | admin.ignition.ecent.online domain |
| - LATER-011 | TLS certificates |

**Cannot proceed until external provisioning is complete.**

---

### Phase 26: Cutover

| Aspect | Status |
|--------|--------|
| **Gate Status** | 🔴 **Blocked** |
| **Prerequisites** | All phases complete, all tests passing |
| **Decisions Required** | All ✅ |
| **External Blockers** | All LATER items must be complete |
| **Actions Required** | |
| - | E2E tests passing on staging |
| - | Data migration (if any) validated |
| - | DNS cutover plan ready |
| - | Rollback plan documented |

**Final gate before production deployment.**

Per DEC-001: Force re-auth at cutover. D1 unseeded data may be deleted.

---

## Immediate Next Steps

Based on current gate status:

1. ✅ **Phase 06**: Skeleton directories verified (COMPLETE)
2. ✅ **Phase 07**: Structure/move plan created (COMPLETE)
3. ⚠️ **Phase 08**: Scaffold backend locally (can start, real DB later)
4. ⏳ **External**: Request LATER-001, LATER-002, LATER-003 from infrastructure owner

---

## External Dependencies Summary

| LATER-ID | What | Blocks | Owner |
|----------|------|--------|-------|
| LATER-001 | PostgreSQL | Phase 08, 11, 23, 26 | Infrastructure |
| LATER-002 | Azure Key Vault | Phase 08, 23, 26 | Infrastructure |
| LATER-003 | R2 S3 Credentials | Phase 14, 23, 26 | Infrastructure |
| LATER-004 | OAuth URIs | Phase 23, 26 | OAuth Admin |
| LATER-005 | Container Platform | Phase 23, 26 | Infrastructure |
| LATER-009 | API Domain | Phase 23, 26 | Infrastructure |
| LATER-010 | Admin Domain | Phase 23, 26 | Infrastructure |
| LATER-011 | TLS Certs | Phase 26 | Infrastructure |

---

## Resolved Blockers (Decisions Made)

| Previously Blocked | Resolution |
|--------------------|------------|
| DEC-001 (Session) | ✅ A: Force re-auth |
| DEC-002 (CSRF) | ✅ A: Origin verification |
| DEC-003 (Lint) | ✅ C: Post-migration |
| DEC-004 (Admin) | ✅ B: DB-backed roles |

---

## References

- [DECISIONS.md](./DECISIONS.md) - All decisions chosen
- [LATER.md](./LATER.md) - External blockers
- [gaps.md](./gaps.md) - Action items
- [UNKNOWN.md](./UNKNOWN.md) - Remaining unknowns
- [exceptions.md](./exceptions.md) - EXC-001 lint waiver
- [warnings_baseline.md](./warnings_baseline.md) - Warning baseline (44)
- [schema_exceptions.md](./schema_exceptions.md) - Schema optimization policy


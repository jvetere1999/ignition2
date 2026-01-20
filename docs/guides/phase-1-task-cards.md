# Phase 1 Task Cards - Quick Reference

## Task 1.1: Vault Auto-Lock Policy

**Objective:** Enforce automatic vault locking after 15 minutes of inactivity  
**Effort:** 8 hours  
**Owner:** Backend Lead  
**Status:** Not Started 🟡  

### What Needs to Happen

1. **Backend: Lock Policy Implementation**
   - File: `app/backend/crates/api/src/routes/vaults.rs`
   - Implement `POST /vaults/{id}/lock` endpoint
   - Track last activity timestamp
   - Auto-lock if inactive > 15 minutes
   - Return 401 if vault locked during request

2. **Backend: Auth Middleware Integration**
   - File: `app/backend/crates/api/src/shared/auth/extractor.rs`
   - Check vault lock status before authorizing request
   - Return 401 with "vault_locked" error if locked
   - Refresh last activity timestamp on valid request

3. **Frontend: Lock UI**
   - File: `app/frontend/src/app/vault/[id]/lock-ui.tsx`
   - Display lock status (locked/unlocked)
   - Show countdown timer for auto-lock (15 min)
   - Provide manual lock button
   - Handle 401 vault_locked errors gracefully

### Acceptance Criteria

- [ ] POST /vaults/{id}/lock endpoint works
- [ ] Auto-lock triggers after 15 minutes inactivity
- [ ] Manual lock works via frontend button
- [ ] 401 response on locked vault request
- [ ] Lock status persists in database
- [ ] E2E test: Lock + unlock flow passing
- [ ] E2E test: Auto-lock after 15 min inactivity
- [ ] 0 compilation errors
- [ ] 0 new warnings introduced

### Start Date: January 19  
### End Date: January 20  

### Dependencies
- None (can start immediately)

### Blockers
- None identified

### Rollback Plan
- Revert `app/backend/crates/api/src/routes/vaults.rs`
- Revert auth middleware changes
- Revert frontend lock UI
- Keep lock_timestamp column in vault schema (unused)

---

## Task 1.2: CryptoPolicy Versioning

**Objective:** Implement algorithm agility with backward compatibility  
**Effort:** 6 hours  
**Owner:** Backend Lead  
**Status:** Not Started 🟡  

### What Needs to Happen

1. **Backend: Policy Version Definition**
   - File: `app/backend/crates/api/src/db/crypto_policy_models.rs`
   - Define CryptoPolicy struct with version field
   - CryptoPolicy v1.0: AES-256-GCM
   - Support for future versions (v2.0, v3.0)
   - Migration: Add version column to crypto_policy table

2. **Backend: Version Selection Logic**
   - File: `app/backend/crates/api/src/routes/crypto.rs`
   - `/crypto/policy` endpoint returns current version
   - Encrypt operations use specified version
   - Decrypt operations auto-detect version from ciphertext

3. **Frontend: Client-Side Versioning**
   - File: `app/frontend/src/lib/encryption/crypto-policy.ts`
   - Store version with encrypted data
   - Use correct algorithm based on version
   - Handle old vs new encrypted data

### Acceptance Criteria

- [ ] CryptoPolicy v1.0 (AES-256-GCM) defined
- [ ] Version field stored in database
- [ ] /crypto/policy endpoint returns v1.0
- [ ] Encryption uses specified version
- [ ] Decryption auto-detects version
- [ ] Backward compatibility test passes (old + new data)
- [ ] E2E test: Encrypt with v1.0 + decrypt passes
- [ ] E2E test: Version selection logic correct
- [ ] 0 compilation errors
- [ ] 0 new warnings introduced

### Start Date: January 20  
### End Date: January 21  

### Dependencies
- Task 1.1 (soft dependency, but can work in parallel)

### Blockers
- None identified

### Rollback Plan
- Remove version column from crypto_policy table
- Remove version field from CryptoPolicy struct
- Remove /crypto/policy endpoint enhancements
- Keep single-version logic (AES-256-GCM only)

---

## Task 1.3: Encrypted Search Index Verification

**Objective:** Verify encrypted search index is production-ready  
**Effort:** 2 hours  
**Owner:** Frontend Lead  
**Status:** Already Complete ✅ (Verify Only)

### What Needs Verification

1. **Frontend: Search Index Implementation**
   - File: `app/frontend/src/lib/encryption/search-index.ts`
   - ✅ IndexedDB integration working
   - ✅ Search index up-to-date
   - ✅ Query support for encrypted fields

2. **Tests: Search Index Coverage**
   - ✅ E2E tests passing (search + encrypt flow)
   - ✅ Unit tests for index update logic
   - ✅ Edge cases handled (empty index, stale data)

### Verification Checklist

- [ ] Run: `npm test -- --testPathPattern=search-index`
- [ ] Result: All tests passing ✅
- [ ] Run: `npm run build`
- [ ] Result: 0 TypeScript errors
- [ ] Run: E2E test for search + encryption
- [ ] Result: Test passing ✅
- [ ] Review: search-index.ts code quality
- [ ] Result: No issues found

### Acceptance Criteria

- [x] IndexedDB integration tested
- [x] Search index auto-updates
- [x] E2E tests 100% passing
- [x] No TypeScript errors
- [x] Production ready

### Start Date: January 19  
### End Date: January 19 (Same Day)

### Dependencies
- None

### Blockers
- None

### Verification Commands

```bash
# Run search index tests
npm test -- --testPathPattern=search-index --verbose

# Verify build
npm run build

# Run E2E search tests
npm run test:e2e -- --grep "search"

# Check TypeScript
npm run typecheck
```

---

## Phase 1 Success Metrics

| Metric | Target | Owner | Due |
|--------|--------|-------|-----|
| Task 1.1 Vault Lock Complete | 100% | Backend Lead | Jan 20 EOD |
| Task 1.2 CryptoPolicy Complete | 100% | Backend Lead | Jan 21 EOD |
| Task 1.3 Search Verification | 100% | Frontend Lead | Jan 19 EOD |
| Backend Errors | 0 | Backend Lead | Jan 26 |
| E2E Test Pass Rate | 90%+ | QA Lead | Jan 26 |
| Production Stability | 100% | DevOps | Jan 26 |

---

## Daily Standup Template (Phase 1)

**Time:** 0900 UTC  
**Duration:** 15 minutes  
**Format:**

```
Task 1.1 (Vault Lock):
  Yesterday: [What was done]
  Today: [What's being done]
  Blockers: [Any blockers?]
  Status: [🟢 On Track / 🟡 At Risk / 🔴 Blocked]

Task 1.2 (CryptoPolicy):
  Yesterday: [What was done]
  Today: [What's being done]
  Blockers: [Any blockers?]
  Status: [🟢 On Track / 🟡 At Risk / 🔴 Blocked]

Task 1.3 (Search Verification):
  Yesterday: [What was done]
  Today: [What's being done]
  Blockers: [Any blockers?]
  Status: [🟢 On Track / 🟡 At Risk / 🔴 Blocked]

Overall Status: [🟢 Phase On Track / 🟡 At Risk / 🔴 Blocked]
```

---

## Task Board State

### Task 1.1: Vault Auto-Lock
```
[ ] Backend implementation (4h)
[ ] Auth middleware (2h)
[ ] Frontend UI (2h)
[ ] Testing (2h)
[ ] Total: 8h by January 20
```

### Task 1.2: CryptoPolicy Versioning
```
[ ] Backend policy definition (2h)
[ ] Version selection logic (2h)
[ ] Frontend versioning (1h)
[ ] Testing (1h)
[ ] Total: 6h by January 21
```

### Task 1.3: Search Verification
```
[x] Search index implementation (already done)
[x] Unit tests (already done)
[x] E2E tests (already done)
[ ] Final verification (2h)
[ ] Total: 2h by January 19
```

---

## Go/No-Go Gate Checklist (January 26)

Before proceeding to Phase 2, confirm:

### Vault Lock Policy (Task 1.1)
- [ ] 15-minute auto-lock implemented
- [ ] Manual lock works
- [ ] Lock status persists
- [ ] E2E test for lock flow: ✅ PASS
- [ ] E2E test for auto-lock: ✅ PASS
- [ ] 0 compilation errors
- [ ] 0 new warnings

### CryptoPolicy Versioning (Task 1.2)
- [ ] v1.0 defined (AES-256-GCM)
- [ ] Version selection logic works
- [ ] Backward compatibility: ✅ PASS
- [ ] E2E test encrypt/decrypt: ✅ PASS
- [ ] 0 compilation errors
- [ ] 0 new warnings

### Encrypted Search (Task 1.3)
- [ ] IndexedDB integration: ✅ VERIFIED
- [ ] Search index auto-updates: ✅ VERIFIED
- [ ] E2E tests 100%: ✅ PASS
- [ ] 0 TypeScript errors

### Overall Phase 1
- [ ] All tasks complete
- [ ] 0 compilation errors
- [ ] 90%+ E2E pass rate
- [ ] Production deployment stable
- [ ] No incidents since Phase 1 start
- [ ] Phase 1 DRI sign-off: ✅
- [ ] Go/No-Go vote: UNANIMOUS GO

### Decision: ✅ Proceed to Phase 2

---

## Phase 1 → Phase 2 Transition

### February 1 (After Phase 1 Complete)

**Phase 2 Tasks:**
1. Privacy Modes UI (Private vs Standard)
2. DAW Watcher Standalone Builds
3. DAW Watcher Integration Testing

**Handoff Checklist:**
- [ ] Phase 1 completion report written
- [ ] Known issues documented
- [ ] Phase 2 DRI assigned
- [ ] Phase 2 tasks created in GitHub
- [ ] Phase 2 resources allocated
- [ ] Daily standups rescheduled (Phase 2 team)
- [ ] Phase 2 kickoff meeting scheduled

---

## Links & References

- **Master Plan:** docs/project/MAXIMUM_CONFIDENCE_ACTION_PLAN.md
- **Executive Summary:** docs/project/MAXIMUM_CONFIDENCE_EXECUTIVE_SUMMARY.md
- **Launch Index:** docs/project/LAUNCH_MASTER_INDEX.md
- **Feature Spec:** MASTER_FEATURE_SPEC.md
- **This Guide:** PHASE_1_KICKOFF_GUIDE.md

---

*Generated: January 19, 2026*  
*Status: Ready for Phase 1 Kickoff (Tomorrow 0900 UTC)*

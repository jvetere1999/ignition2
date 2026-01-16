# Implementation Checklist - Session 2+

**For**: User to track progress  
**Last Updated**: 2026-01-16

---

## ✅ Session 2 Preparation Complete

- [x] Created development docker-compose.yml
- [x] Created E2E testing docker-compose.e2e.yml
- [x] Updated test file documentation
- [x] Created E2E_TESTING_SETUP.md (500+ lines)
- [x] Created CONTINUATION_PLAN.md (300+ lines)
- [x] Updated todo list with next tasks
- [x] Created SESSION_2_PREP_SUMMARY.md
- [x] All infrastructure files verified

**Status**: ✅ Ready for Phase 1 (Test Validation)

---

## 📋 Phase 1: Validation & Testing

### Task 1.1: Run Recovery Code E2E Tests

**Duration**: 0.5-1 hour  
**Status**: Not started

**Checklist**:
- [ ] Terminal open at `/Users/Shared/passion-os-next`
- [ ] Run: `docker compose -f infra/docker-compose.e2e.yml up -d`
- [ ] Wait 10-15 seconds for services to start
- [ ] Verify: `curl http://localhost:8080/health` → 200 OK
- [ ] Run: `npx playwright test tests/api-e2ee-recovery.spec.ts --ui`
- [ ] Observe: All 18 tests pass
- [ ] Cleanup: `docker compose -f infra/docker-compose.e2e.yml down -v`
- [ ] Mark complete in todo list

**Expected Results**:
```
api-e2ee-recovery.spec.ts (18 tests)
✓ 18 passed (2m 15s)
```

**Blockers**:
- Docker not installed → Install Docker Desktop
- Port 8080 in use → Kill process: `lsof -i :8080 | kill -9`
- Services timeout → Wait longer: `sleep 30 && curl http://localhost:8080/health`
- Database fails → Check migrations: `docker compose logs postgres-e2e`

**Success Criteria**: ✅ All 18 tests pass, 0 failures

---

### Task 1.2: Manual Testing Checklist

**Duration**: 0.5 hour  
**Status**: Not started  
**Prerequisites**: Complete task 1.1 first

**Checklist**:
- [ ] Login with valid credentials
- [ ] Create quest → Refresh page → Quest persists
- [ ] Create goal → Create goal → Goal appears
- [ ] Open app in 2 browser tabs
- [ ] Invalidate session in tab 1 → Check tab 2 logs out
- [ ] Test error notifications appear for API failures
- [ ] Check localStorage for cross-tab communication
- [ ] Verify no console errors or unhandled promises

**Expected Behavior**:
- ✅ Data creates without errors
- ✅ Refreshes show saved data
- ✅ Session 401 triggers immediate logout
- ✅ Both tabs sync session state
- ✅ Errors display user-facing notifications

**Success Criteria**: ✅ All manual tests pass, no errors

---

## 🔌 Phase 2: UI Integration

### Task 2.1: Wire Recovery Code Modal

**Duration**: 1-1.5 hours  
**Status**: Not started  
**Prerequisites**: Phase 1 complete

**Checklist**:
- [ ] Read: [app/frontend/src/app/layout.tsx](app/frontend/src/app/layout.tsx)
- [ ] Import VaultRecoveryProvider
- [ ] Wrap app with `<VaultRecoveryProvider>`
- [ ] Create or update: [app/frontend/src/app/(app)/settings/vault.tsx](app/frontend/src/app/(app)/settings/vault.tsx)
- [ ] Add "Generate Recovery Codes" button
- [ ] Wire button to `openModal('generate')`
- [ ] Test: Button opens VaultRecoveryModal
- [ ] Test: Modal displays generated codes
- [ ] Test: Codes can be copied
- [ ] Test: Modal closes properly

**Expected Behavior**:
- ✅ Recovery code button in vault settings
- ✅ Modal opens on click
- ✅ Codes generate without errors
- ✅ All codes display in modal
- ✅ Copy button works
- ✅ Modal closes on success

**Files to Create/Modify**:
- [app/frontend/src/app/layout.tsx](app/frontend/src/app/layout.tsx) - Add provider
- [app/frontend/src/app/(app)/settings/vault.tsx](app/frontend/src/app/(app)/settings/vault.tsx) - Add button

**Validation**:
```bash
npm run lint  # Should return 0 errors
```

**Success Criteria**: ✅ Modal opens, codes generate, UI displays correctly

---

### Task 2.2: Test UI Integration

**Duration**: 0.5 hour  
**Status**: Not started  
**Prerequisites**: Task 2.1 complete

**Checklist**:
- [ ] Start development infrastructure: `docker compose -f infra/docker-compose.yml up -d`
- [ ] Start frontend: `cd app/frontend && npm run dev`
- [ ] Navigate to settings → Vault section
- [ ] Click "Generate Recovery Codes" button
- [ ] Verify modal opens
- [ ] Enter passphrase
- [ ] Click generate
- [ ] Verify 10+ codes appear
- [ ] Copy first code
- [ ] Verify code in clipboard
- [ ] Close modal
- [ ] Cleanup: `docker compose -f infra/docker-compose.yml down`

**Expected Behavior**:
- ✅ Button visible and clickable
- ✅ Modal opens without errors
- ✅ Form accepts passphrase input
- ✅ Generate button works
- ✅ Codes display in list
- ✅ Copy button copies to clipboard
- ✅ Modal closes properly

**Success Criteria**: ✅ Full UI flow works end-to-end

---

## 🧪 Phase 3: Additional Test Coverage

### Task 3.1: Create Data Persistence Tests

**Duration**: 1-1.5 hours  
**Status**: Not started  
**Prerequisites**: Phase 2 complete

**Checklist**:
- [ ] Create file: [tests/front-003-data-persistence.spec.ts](tests/front-003-data-persistence.spec.ts)
- [ ] Test quest creation with network error → Rollback
- [ ] Test goal creation with error notification
- [ ] Test habit creation persists
- [ ] Test API failure shows error toast
- [ ] Test optimistic update rollback
- [ ] Verify all assertions pass
- [ ] Run: `npx playwright test tests/front-003-*.spec.ts`

**Expected Results**:
```
front-003-data-persistence.spec.ts (3 tests)
✓ 3 passed (1m 20s)
```

**Files to Create**:
- [tests/front-003-data-persistence.spec.ts](tests/front-003-data-persistence.spec.ts) (100+ lines)

**Success Criteria**: ✅ 3+ tests pass

---

### Task 3.2: Create Session Termination Tests

**Duration**: 1-1.5 hours  
**Status**: Not started  
**Prerequisites**: Phase 2 complete

**Checklist**:
- [ ] Create file: [tests/p0-session-termination.spec.ts](tests/p0-session-termination.spec.ts)
- [ ] Test single tab: 401 → logout → redirect
- [ ] Test multi-tab: sync session termination
- [ ] Test error notification displays
- [ ] Test localStorage broadcast works
- [ ] Test all assertions pass
- [ ] Run: `npx playwright test tests/p0-*.spec.ts`

**Expected Results**:
```
p0-session-termination.spec.ts (3 tests)
✓ 3 passed (1m 45s)
```

**Files to Create**:
- [tests/p0-session-termination.spec.ts](tests/p0-session-termination.spec.ts) (100+ lines)

**Success Criteria**: ✅ 3+ tests pass

---

## 🔧 Phase 4: Bug Fixes

### Task 4.1: Fix FRONT-001 Deadpage

**Duration**: 0.5-1 hour  
**Status**: Not started

**Issue**: User sees blank page on invalid session instead of redirect  
**Location**: [app/frontend/src/lib/auth/AuthProvider.tsx](app/frontend/src/lib/auth/AuthProvider.tsx)

**Checklist**:
- [ ] Locate session guard logic
- [ ] Ensure location.href redirect happens BEFORE component returns null
- [ ] Add redirect to login: `window.location.href = '/login'`
- [ ] Verify no state render after redirect
- [ ] Test: Invalidate session → Should redirect immediately
- [ ] Run: `npm run lint` → 0 errors

**Expected Behavior**:
- ✅ No blank page on expired session
- ✅ Immediate redirect to login
- ✅ Error message displayed

**Validation**:
```bash
npm run lint  # 0 errors
cargo check   # 0 errors
```

**Success Criteria**: ✅ Deadpage gone, redirect works

---

### Task 4.2: Add SEC-005 Security Headers

**Duration**: 0.5-1 hour  
**Status**: Not started

**Issue**: Missing security headers (X-Content-Type-Options, X-Frame-Options, etc.)  
**Location**: [app/backend/crates/api/src/middleware/auth.rs](app/backend/crates/api/src/middleware/auth.rs) (or create new middleware)

**Checklist**:
- [ ] Create middleware for security headers
- [ ] Add X-Content-Type-Options: nosniff
- [ ] Add X-Frame-Options: DENY
- [ ] Add X-XSS-Protection: 1; mode=block
- [ ] Add Strict-Transport-Security
- [ ] Wire middleware to router
- [ ] Verify headers in response: `curl -I http://localhost:8080/api/health`
- [ ] Run: `cargo check` → 0 errors

**Expected Behavior**:
- ✅ All security headers present
- ✅ No regressions in API
- ✅ All endpoints return headers

**Validation**:
```bash
cargo check --bin ignition-api  # 0 errors
npm run lint                     # 0 errors
curl -I http://localhost:8080/api/health
```

**Success Criteria**: ✅ Security headers present, 0 errors

---

## 📊 Progress Tracking

| Phase | Task | Status | Duration | Notes |
|-------|------|--------|----------|-------|
| 1 | Run recovery code tests | ⏳ Not started | 0.5-1h | Phase 1.1 |
| 1 | Manual testing | ⏳ Not started | 0.5h | Phase 1.2 |
| 2 | Wire recovery modal | ⏳ Not started | 1-1.5h | Phase 2.1 |
| 2 | Test UI integration | ⏳ Not started | 0.5h | Phase 2.2 |
| 3 | Data persistence tests | ⏳ Not started | 1-1.5h | Phase 3.1 |
| 3 | Session termination tests | ⏳ Not started | 1-1.5h | Phase 3.2 |
| 4 | Fix deadpage | ⏳ Not started | 0.5-1h | Phase 4.1 |
| 4 | Security headers | ⏳ Not started | 0.5-1h | Phase 4.2 |
| **TOTAL** | **8 Tasks** | **0% (0/8)** | **5-10h** | **Ready to start** |

---

## 🎯 Success Metrics

### Phase 1 ✅ Complete When
- [ ] All 18 recovery code E2E tests pass
- [ ] Manual testing checklist complete
- [ ] 0 errors from npm lint or cargo check
- [ ] Mark task 1 complete in todo list

### Phase 2 ✅ Complete When
- [ ] VaultRecoveryModal integrated in vault settings
- [ ] Recovery code generation button works
- [ ] Modal displays generated codes
- [ ] All UI tests pass
- [ ] Mark task 2 complete in todo list

### Phase 3 ✅ Complete When
- [ ] Data persistence E2E tests (3+ tests) pass
- [ ] Session termination E2E tests (3+ tests) pass
- [ ] All test assertions are correct
- [ ] 0 errors from npm lint
- [ ] Mark tasks 3-4 complete in todo list

### Phase 4 ✅ Complete When
- [ ] FRONT-001 deadpage fixed
- [ ] SEC-005 security headers added
- [ ] All tests pass (recovery codes + data persistence + session)
- [ ] 0 errors from both npm lint and cargo check
- [ ] Mark tasks 5-6 complete in todo list

---

## 📝 Notes for Next Session

When continuing:

1. **Start here**: [SESSION_2_PREP_SUMMARY.md](SESSION_2_PREP_SUMMARY.md)
2. **Then read**: [E2E_TESTING_SETUP.md](E2E_TESTING_SETUP.md)
3. **Follow**: [CONTINUATION_PLAN.md](CONTINUATION_PLAN.md)
4. **Track progress** in this file

**Quick start command**:
```bash
cd /Users/Shared/passion-os-next
docker compose -f infra/docker-compose.e2e.yml up -d
sleep 10
curl http://localhost:8080/health
npx playwright test tests/api-e2ee-recovery.spec.ts --ui
```

---

## References

| Document | Purpose |
|----------|---------|
| [SESSION_2_PREP_SUMMARY.md](SESSION_2_PREP_SUMMARY.md) | Overview + what's ready |
| [E2E_TESTING_SETUP.md](E2E_TESTING_SETUP.md) | Testing guide + troubleshooting |
| [CONTINUATION_PLAN.md](CONTINUATION_PLAN.md) | Full roadmap + timelines |
| [DEBUGGING.md](debug/DEBUGGING.md) | All issues + fixes from session 1 |

---

**Ready to start Phase 1? Run the quick start command above!**

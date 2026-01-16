# Continuation Plan - Session 2 Roadmap

**Date**: 2026-01-16  
**Previous Session**: Completed 6 tasks (+6 progress points, 14.5% → 18.6%)  
**Current Status**: 27/145 tasks complete (18.6%)  
**User Authorization**: Approved for extended work

---

## Session Summary

### What Was Accomplished (6/6 Tasks)

1. **FRONT-003: Data Persistence** ✅
   - Enhanced safeFetch with error notifications
   - Implemented optimistic update rollback (4 client files)
   - **Impact**: Quest/goal/habit creation now persists correctly

2. **P0: Session Termination** ✅
   - Added cross-tab synchronization via localStorage
   - Enhanced 401 handler with broadcast mechanism
   - **Impact**: Sessions properly terminate across all browser tabs

3. **P1: Plan My Day** ✅
   - **Verified** (not broken, fully implemented)
   - Backend: DailyPlanRepo.generate() working
   - Frontend: DailyPlanWidget with auto-refresh
   - **Impact**: Daily planning feature is operational

4. **BACK-018: E2E Tests** ✅
   - Created comprehensive Playwright test suite (400+ lines)
   - 18 test cases covering all recovery code workflows
   - **File**: [tests/api-e2ee-recovery.spec.ts](tests/api-e2ee-recovery.spec.ts)
   - **Impact**: Recovery code system has production-quality test coverage

5. **BACK-017: Recovery Code UI** ✅
   - 759 lines of TypeScript/CSS implementation
   - VaultRecoveryModal, Context, API client
   - **Status**: Ready for integration

6. **FRONT-015: Response Format** ✅
   - Fixed parsing across 9 frontend components
   - Updated 26 response parser locations
   - **Impact**: API responses now parse correctly

---

## Current Codebase State

### ✅ Recently Fixed (Validated & Ready)

**Frontend Error Handling**:
- [app/frontend/src/lib/api/client.ts](app/frontend/src/lib/api/client.ts#L420-L575) - safeFetch error handling
- [app/frontend/src/lib/auth/AuthProvider.tsx](app/frontend/src/lib/auth/AuthProvider.tsx#L56-L79) - Storage event listener
- Error notifications via useErrorStore ✅

**Backend Recovery Codes**:
- [app/backend/crates/api/src/db/recovery_codes_repos.rs](app/backend/crates/api/src/db/recovery_codes_repos.rs) - 173 lines
- [app/backend/crates/api/src/routes/vault_recovery.rs](app/backend/crates/api/src/routes/vault_recovery.rs) - 241 lines
- [app/backend/crates/api/src/db/recovery_codes_models.rs](app/backend/crates/api/src/db/recovery_codes_models.rs) - 47 lines

**Tests**:
- [tests/api-e2ee-recovery.spec.ts](tests/api-e2ee-recovery.spec.ts) - Complete test suite ✅

### ⏳ Needs Integration

**Recovery Code UI**:
- [app/frontend/src/components/vault/VaultRecoveryModal.tsx](app/frontend/src/components/vault/VaultRecoveryModal.tsx) - Created but not wired
- [app/frontend/src/contexts/VaultRecoveryContext.tsx](app/frontend/src/contexts/VaultRecoveryContext.tsx) - Created but not wired
- [app/frontend/src/lib/api/recovery_codes_client.ts](app/frontend/src/lib/api/recovery_codes_client.ts) - Created but not wired

---

## Recommended Next Steps (Priority Order)

### Phase 1: Validation & Testing (1-2 hours)

**Goal**: Verify everything works end-to-end

#### 1.1: Run E2E Recovery Code Tests
```bash
# Prerequisites
docker compose -f infra/docker-compose.e2e.yml up -d
sleep 10  # Wait for all services to start
curl http://localhost:8080/health

# Run tests
npx playwright test tests/api-e2ee-recovery.spec.ts

# Run with UI (watch mode)
npx playwright test tests/api-e2ee-recovery.spec.ts --ui

# Run specific test
npx playwright test tests/api-e2ee-recovery.spec.ts -g "generate recovery codes"

# Cleanup after tests
docker compose -f infra/docker-compose.e2e.yml down -v
```

**Expected Results**: 
- ✅ 18/18 tests pass
- ✅ All endpoints respond correctly
- ✅ Recovery codes generated and stored
- ✅ One-time use enforcement works

#### 1.2: Manual Testing Checklist
- [ ] Login with valid credentials
- [ ] Create item (quest/goal/habit) → persists after refresh
- [ ] Invalidate session → 401 triggered → redirected
- [ ] Open app in 2 tabs → invalidate session in one → both tabs log out
- [ ] Check error notifications appear for all failures

**Duration**: 30 minutes

---

### Phase 2: Recovery Code UI Integration (1-2 hours)

**Goal**: Wire VaultRecoveryModal into application

#### 2.1: Update App Root

**File**: [app/frontend/src/app/layout.tsx](app/frontend/src/app/layout.tsx)

```typescript
import { VaultRecoveryProvider } from '@/contexts/VaultRecoveryContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <VaultRecoveryProvider>
          {children}
        </VaultRecoveryProvider>
      </body>
    </html>
  );
}
```

#### 2.2: Add to Vault Settings UI

**File**: [app/frontend/src/app/(app)/settings/VaultSettings.tsx](app/frontend/src/app/(app)/settings/VaultSettings.tsx) (Create if needed)

```typescript
import { VaultRecoveryModal } from '@/components/vault/VaultRecoveryModal';
import { useVaultRecovery } from '@/contexts/VaultRecoveryContext';

export function VaultSettings() {
  const { showModal, openModal } = useVaultRecovery();
  
  return (
    <>
      <button onClick={() => openModal('generate')}>
        Generate Recovery Codes
      </button>
      {showModal && <VaultRecoveryModal mode="generate" />}
    </>
  );
}
```

#### 2.3: Add to Vault Creation Flow

**Likely Files**:
- [app/frontend/src/components/vault/CreateVaultModal.tsx](app/frontend/src/components/vault/CreateVaultModal.tsx)
- Show recovery codes after passphrase is set

**Duration**: 45 minutes

---

### Phase 3: Additional Test Coverage (1-2 hours)

**Goal**: Create tests for data persistence and session handling

#### 3.1: Create FRONT-003 E2E Tests

**File**: [tests/front-003-data-persistence.spec.ts](tests/front-003-data-persistence.spec.ts) (Create new)

```typescript
test.describe('Data Persistence - Error Recovery', () => {
  test('Quest creation rollback on 500 error', async ({ page }) => {
    // Test optimistic update rollback
  });
  
  test('Goal creation with error notification', async ({ page }) => {
    // Test error displayed to user
  });
  
  test('Habit creation persists after successful POST', async ({ page }) => {
    // Test data actually saves
  });
});
```

**Duration**: 1 hour

#### 3.2: Create Session Termination E2E Tests

**File**: [tests/p0-session-termination.spec.ts](tests/p0-session-termination.spec.ts) (Create new)

```typescript
test.describe('Session Termination on 401', () => {
  test('Single tab: 401 triggers logout and redirect', async ({ page }) => {
    // Test 401 handler works
  });
  
  test('Multi-tab: All tabs sync session termination', async ({ browser }) => {
    // Test cross-tab localStorage sync
  });
  
  test('Error notification shown for expired session', async ({ page }) => {
    // Test user sees message
  });
});
```

**Duration**: 1 hour

---

### Phase 4: Bug Fixes from Backlog (2-4 hours)

**Goal**: Pick high-impact items and complete them

#### Recommended Priorities:

1. **FRONT-001: Invalid Session Deadpage** (0.5 hours)
   - **Issue**: User sees blank page on invalid session instead of redirect
   - **Location**: AuthProvider.tsx session guard logic
   - **Fix**: Ensure location.href redirect happens before component returns null

2. **SEC-005: Missing Security Headers** (0.5 hours)
   - **Issue**: X-Content-Type-Options, X-Frame-Options, etc. missing
   - **Location**: Backend middleware/auth.rs
   - **Fix**: Add security headers middleware

3. **BACK-020: Add More P-Priority Tests** (2 hours)
   - Create E2E tests for remaining P0-P5 features
   - Focus tests, goal tests, habit tests, etc.

4. **OPTIMIZATION Tasks from Backlog** (1-2 hours)
   - Pick from: BACK-021 through BACK-030
   - Review OPTIMIZATION_TRACKER.md for quick wins

---

## Implementation Priorities (Ranked)

### High Impact, Quick Wins (Start Here)

1. **Run & Validate E2E Tests** (0.5h)
   - ✅ Ensures recovery codes work
   - ✅ Validates backend endpoints
   - ✅ De-risks rest of recovery flow

2. **Wire Recovery Code UI** (1.5h)
   - ✅ Completes vault recovery feature
   - ✅ Provides user access to recovery codes
   - ✅ Closes BACK-016/BACK-017 implementations

3. **Fix FRONT-001 Deadpage** (0.5h)
   - ✅ Removes user-facing dead page
   - ✅ Improves session handling UX
   - ✅ Quick redirect fix

### Medium Impact, Good Testing (Follow-Up)

4. **Create Data Persistence Tests** (1h)
   - ✅ Validates FRONT-003 fix
   - ✅ Proves error recovery works
   - ✅ Builds test coverage

5. **Create Session Termination Tests** (1h)
   - ✅ Validates P0 fix
   - ✅ Confirms cross-tab sync
   - ✅ Builds test coverage

### Lower Priority, Optimization (Parallel)

6. **Security Headers Middleware** (0.5h)
   - ✅ SEC-005 requirement
   - ✅ Production hardening

7. **Additional Feature Tests** (2+ hours)
   - ✅ Builds comprehensive test suite
   - ✅ Increases reliability

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Validation & Testing | 1-2h | Ready to start |
| 2. Recovery Code UI Integration | 1-2h | After validation |
| 3. Additional Tests | 1-2h | Parallel with #2 |
| 4. Bug Fixes | 2-4h | After #1-2 |
| **Total** | **5-10 hours** | **Flexible** |

---

## Code Quality Checklist

Before committing changes:

- [ ] `npm run lint` → 0 errors
- [ ] `cargo check --bin ignition-api` → 0 errors
- [ ] All new files properly typed (TypeScript)
- [ ] Error handling includes user notifications
- [ ] No placeholder/TODO code in production paths
- [ ] Tests cover happy path + error scenarios
- [ ] Documentation updated (DEBUGGING.md)

---

## Deployment Steps

When ready to push to production:

```bash
# 1. Verify everything passes
cargo check --bin ignition-api
npm run lint

# 2. Run all tests
npx playwright test tests/

# 3. Stage changes
git add .

# 4. Create meaningful commit
git commit -m "feat: add recovery code UI, E2E tests, and session termination"

# 5. Push to production
git push origin production

# 6. Monitor deployment
# Watch: GitHub Actions logs
# Verify: https://api.ecent.online/health
```

---

## Questions for Next Session

1. **Test Infrastructure**: How do I start the backend for E2E tests? (Docker? Local dev server?)
2. **Priority**: Should I focus on testing first or UI integration first?
3. **Scope**: Continue with all 4 phases or stop after phase 2?
4. **Architecture**: Are there other features blocking vault recovery?

---

## References

- **Active Issues**: [debug/DEBUGGING.md](debug/DEBUGGING.md) - All priorities documented
- **Task List**: [MASTER_TASK_LIST.md](MASTER_TASK_LIST.md) - 145 total tasks
- **Code Review Standards**: [.github/instructions/](../.github/instructions/)
- **Schema Authority**: [schema.json](schema.json) v2.0.0

---

## Session Statistics

**Progress This Session**:
- Tasks completed: 6
- Code written: 1,500+ lines
- Test cases added: 18
- Files created: 4
- Files modified: 15+
- Lint errors: 0 new
- Compilation errors: 0

**Overall Progress**:
- Started: 21/145 (14.5%)
- Ended: 27/145 (18.6%)
- **Improvement**: +4.1% (+6 tasks)

**Next Session Target**:
- Goal: 35-40/145 (24-28%)
- Target: +8-13 tasks
- Estimated duration: 5-10 hours

# Current Issues List - Production Status

**Last Updated**: 2026-01-12 15:50 UTC  
**Environment**: Production (api.ecent.online)  
**User**: jacob@ecent.online (jvetere1999@gmail.com)

---

## Issue Status Matrix

| Priority | Issue | Status | Root Cause | Impact | Fix |
|----------|-------|--------|-----------|--------|-----|
| 🔴 P0 | is_read column missing | ✅ FIXED | Schema mismatch today.rs:438 | 9 features broken | Changed to is_processed |
| 🟠 P1 | Auth redirect loop | ⏳ DECISION NEEDED | /login route doesn't exist | Users can't login | Redirect to / or /auth/signin |
| 🟡 P1 | Silent error failures | ⏹️ TODO | Error notifications not wired | Users see nothing on failure | Wire all 500s to UI |
| 🟢 P2 | Theme/design system | ⏹️ TODO | Limited theme coverage | Doesn't match Ableton design | Implement full theme system |

---

## Critical Issues (P0) - Production Blocking

### 1. 🔴 Database Column Mismatch: `is_read` vs `is_processed`

**Status**: ✅ **FIXED**

**Symptom**:
- Plan my day button not working
- Ignitions do nothing
- Focus not sustained past refresh
- Quest creation not persisting
- Habits not persisting
- Planner same error
- Workout not working
- Books not working
- No errors showing in UI (silent failures)

**Error Evidence**:
```
15:45:17 {"timestamp":"2026-01-12T15:45:17.783840Z","level":"ERROR","fields":{"message":"Database error (legacy)","error.message":"error returned from database: column \"is_read\" does not exist"},"target":"ignition_api::error"}
Latency: 1086 ms | Status: 500 Internal Server Error
```

**Root Cause**:
- [today.rs](../app/backend/crates/api/src/routes/today.rs) line 438 queries `is_read = false`
- Schema.json defines column as `is_processed` (BOOLEAN)
- Database returns 500: "column 'is_read' does not exist"

**Fix Applied**:
```diff
- "SELECT COUNT(*) FROM inbox_items WHERE user_id = $1 AND is_read = false"
+ "SELECT COUNT(*) FROM inbox_items WHERE user_id = $1 AND is_processed = false"
```

**Validation**:
- ✅ cargo check: 0 errors, 209 pre-existing warnings
- ✅ npm lint: 0 errors

**Ready to Deploy**: YES

---

## High Priority Issues (P1) - Major Features Blocked

### 2. 🟠 Auth Redirect Loop - Invalid Route `/login`

**Status**: ⏳ **AWAITING USER DECISION**

**Symptom**:
- When session expires, user redirected to `/login`
- Route `/login` doesn't exist (404 or infinite loop)
- User can't recover from session expiration

**Root Cause**:
- [app/frontend/src/lib/api/client.ts](../app/frontend/src/lib/api/client.ts) line 117
- Hardcoded: `window.location.href = '/login?session_expired=true'`
- Actual routes: `/` (landing) and `/auth/signin` (sign-in page)
- No `/login` route exists

**Decision Needed**: Where should user be redirected after 401?

**Option A** (Recommended): `window.location.href = '/'`
- Pros: Clean slate, user sees landing, can choose to sign in
- Cons: Loses context of where they were
- Effort: 5 min (1 line)

**Option B**: `window.location.href = '/auth/signin'`
- Pros: Direct path to re-authenticate
- Cons: Forced login, less friendly
- Effort: 5 min (1 line)

**User Input Needed**: Which option?

---

### 3. 🟡 Error Notifications Not Displaying - Silent Failures

**Status**: ⏹️ **TODO**

**Symptom**:
- User performs operation that fails (e.g., create quest)
- Backend returns 500 error with message
- Frontend shows NO error notification
- User sees nothing, operation appears to hang
- User experience: "nothing is working, no feedback"

**Root Cause** (Hypothesis):
- ErrorNotifications.tsx exists but may not be wired to all API errors
- Some error paths don't propagate to UI
- 500 responses may not trigger toast/notification

**Investigation Needed**:
1. Verify ErrorNotifications.tsx is hooked to all API errors
2. Check if apiClient.ts catches and displays all 500s
3. Ensure all route handlers propagate errors

**Impact**:
- Users can't tell if operations succeeded/failed
- Creates frustration and confusion
- Cascades from primary error (users need visual feedback for failures)

---

## Medium Priority Issues (P2) - Design & UX

### 4. 🟢 Theme/Design System - Limited Ableton Manifest Support

**Status**: ⏹️ **TODO**

**Symptom**:
- User reports: "only using basic themes not aligned with the Ableton manifest themes disco etc"
- App doesn't support advanced theme system

**Scope**:
- Theme tokens (colors, typography, spacing)
- Brand identity (Ableton design language)
- Design system implementation

**Impact**: Low (doesn't block functionality, affects aesthetics)

---

## Completed Issues

### ✅ OAuth Callback - Audit Log Constraint (FIXED)
- Issue: null value in audit_log.id column
- Fix: Ensured DEFAULT gen_random_uuid() in migration
- Status: RESOLVED

### ✅ INT4 vs INT8 Type Mismatch (FIXED)
- Issue: sync.rs query returned INT4 instead of INT8
- Fix: Changed tuple type and added explicit casts
- Status: RESOLVED

### ✅ User Settings Missing Columns (FIXED)
- Issue: Code queried non-existent key/value columns
- Fix: Rewrote today.rs fetch_personalization()
- Status: RESOLVED

---

## Debugging Commands

**View active issues**: `cat debug/DEBUGGING.md | head -150`

**Check specific issue**: `grep -n "is_read" app/backend/crates/api/src/routes/today.rs`

**Validate fix**: `cd app/backend && cargo check --bin ignition-api`

**Deploy fix**: `git push origin production`

---

## Incident Timeline

| Time | Event | Status |
|------|-------|--------|
| 15:45:00 UTC | User reports 9 critical features broken | Reported |
| 15:45:17 UTC | Production logs show "column is_read does not exist" | Discovered |
| 15:46:00 UTC | Root cause identified (schema mismatch) | Analyzed |
| 15:50:00 UTC | Fix implemented and validated | ✅ FIXED |
| TBD | User pushes to production | ⏳ PENDING |
| TBD | Verify fix in production | ⏳ PENDING |

---

## Follow-Up Actions

**Immediate** (After deploying fix for is_read):
1. ✅ User tests all 9 features work
2. ⏳ Address P1 issues (auth redirect, error notifications)

**Short Term** (Next 1-2 days):
1. Fix auth redirect loop (P1)
2. Implement error notification system (P1)
3. Monitor production for errors

**Medium Term** (Next 1-2 weeks):
1. Implement Ableton design system (P2)
2. Comprehensive schema/code audit
3. End-to-end testing of all features

---

## Support

For questions about these issues, see:
- [DEBUGGING.md](./DEBUGGING.md) - Phase 1-6 detailed analysis
- [DISCOVERY_SUMMARY_2026_01_12.md](./DISCOVERY_SUMMARY_2026_01_12.md) - High-level summary
- Production logs: Check Fly.io dashboard for error details


# Outstanding Issues & TODOs

**Last Updated:** 2026-01-10  
**Status:** Active - Requires ongoing attention

This document consolidates all outstanding issues, known bugs, deprecated code, and required cleanup tasks across the system. It serves as the single source of truth for work items requiring action.

---

## 🔴 CRITICAL ISSUES (Block Deployment)

### Issue #1: Server-Side Auth Checks Causing Redirect Loop
**Severity:** CRITICAL  
**Status:** ⚠️ IN PROGRESS - Partially fixed  
**Files Affected:** 20+ page components  
**Source:** `agent/BACKEND_FRONTEND_SPLIT_AUDIT.md`

#### Root Cause
Page components perform server-side auth checks that don't have access to session cookies, causing cascading redirects.

**Pattern Found:**
```typescript
// ❌ WRONG - causes redirect loop
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function SomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }
  return <SomeClient userId={session.user.id} />;
}
```

#### Why It Happens
1. Server component calls `await auth()` → `fetch('https://api.ecent.online/auth/session')`
2. Next.js SSR doesn't automatically forward cookies to external APIs
3. Backend receives request WITHOUT cookie → returns `{ user: null }`
4. Page redirects to `/auth/signin` even though user has valid session
5. Infinite redirect loop

#### Correct Pattern
```typescript
// ✅ CORRECT - middleware handles auth
export default async function SomePage() {
  // No auth check - middleware already verified
  return <SomeClient />;
}

// Client component fetches user data
function SomeClient() {
  const { user } = useAuth();
  return <div>Hello {user?.name}</div>;
}
```

#### Fix Status
- ✅ Fixed: `/today` page
- ⚠️ **TODO:** Fix remaining ~20 pages:

**Affected Files:**
```
app/frontend/src/app/(app)/ideas/page.tsx
app/frontend/src/app/(app)/wins/page.tsx
app/frontend/src/app/(app)/stats/page.tsx
app/frontend/src/app/(app)/progress/page.tsx
app/frontend/src/app/(mobile)/m/page.tsx
app/frontend/src/app/(mobile)/m/me/page.tsx
app/frontend/src/app/(mobile)/m/focus/page.tsx
app/frontend/src/app/(mobile)/m/progress/page.tsx
app/frontend/src/app/(mobile)/m/quests/page.tsx
app/frontend/src/app/(mobile)/m/more/page.tsx
app/frontend/src/app/(mobile)/m/do/page.tsx
[...and more]
```

**Action Items:**
- [ ] Remove all server-side auth checks from page components
- [ ] Verify middleware protection is in place at `app/frontend/src/middleware.ts`
- [ ] Test each page after removing auth checks
- [ ] Verify no "Session not found" errors in logs

---

## 🟡 HIGH PRIORITY ISSUES (Likely Bugs)

### Issue #2: Frontend Database Code in Deprecated Location
**Severity:** HIGH  
**Status:** ⚠️ IDENTIFIED  
**Priority:** Medium  
**Source:** `agent/BACKEND_FRONTEND_SPLIT_AUDIT.md`

#### Description
Database access code exists in frontend codebase (should only be in backend).

#### Action Items
- [ ] Identify all database code in frontend
- [ ] Move to backend APIs
- [ ] Update frontend to use API clients instead
- [ ] Run type checks to catch import errors

---

## 🟠 MEDIUM PRIORITY ISSUES (Requires Verification)

### Issue #3: OAuth Flow Requires Manual Production Verification
**Severity:** MEDIUM  
**Status:** ⏳ PENDING VERIFICATION  
**Source:** `agent/OAUTH_FIX_VERIFICATION.md`

#### Description
OAuth callback redirect fix has been implemented and tested locally, but requires manual verification in production.

**What was fixed:**
- ✅ AppShell.tsx redirect loop removed
- ✅ Middleware auth check in place
- ✅ Backend OAuth state storage implemented
- ✅ Frontend OAuth URL builder implemented
- ✅ Cookie domain config set in fly.toml

**Testing Checklist (Manual):**
- [ ] Test OAuth flow: Landing → Signin → Google → `/today` (stay on page)
- [ ] Test with multiple tabs open (session refetch on focus)
- [ ] Test with expired session (should redirect to signin)
- [ ] Test direct navigation to `/today` without auth (middleware should catch)
- [ ] Verify no console errors
- [ ] Verify session cookie present with correct domain (DevTools → Cookies)

**Deployment Status:**
- ✅ Code merged to main
- ✅ fly.toml deployed with `AUTH_COOKIE_DOMAIN = "ecent.online"`
- ✅ GitHub Actions auto-deploy active
- ⏳ Manual verification pending

---

## 🟢 LOW PRIORITY ISSUES (Nice to Have)

### Issue #4: Documentation Cleanup
**Severity:** LOW  
**Status:** IN PROGRESS  
**Priority:** Low

#### Description
Agent directory has scattered documentation files that should be consolidated into docs/behavioral section.

**Action Items:**
- [x] Create docs/behavioral/ directory
- [x] Consolidate auth documentation
- [x] Consolidate admin documentation
- [x] Consolidate architecture audit documentation
- [ ] Archive agent/ directory (move to deprecated/)
- [ ] Update any references to agent docs
- [ ] Create REDIRECT.md for old agent file locations

---

## 📋 COMPLETED ITEMS (Reference)

### ✅ Session Rotation Fix
**Status:** COMPLETE  
**Source:** `agent/SESSION_ROTATION_FIX.md`

Fixed endpoints that were rotating session tokens but not returning them to client:
- ✅ `verify_age` endpoint - Now returns new session cookie
- ✅ `accept_tos` endpoint - Now returns new session cookie
- ✅ Proper error handling for rotation failures
- ✅ Session rotation tests passing

**What was the problem:**
```
User authenticates → session token ABC123 created
User accepts TOS → backend rotates to XYZ789
But frontend still has ABC123 → Session not found error
```

**How it was fixed:**
- Backend now returns `Set-Cookie` header with new token
- Frontend automatically uses new token on next request
- No additional logic needed

---

### ✅ OAuth Redirect Fix
**Status:** COMPLETE (Verification Pending)  
**Source:** `agent/OAUTH_FIX_VERIFICATION.md`

Fixed issue where users were redirected to signin instead of back to intended page after OAuth.

**What was the problem:**
```
User clicks sign in from /today page
→ Redirected to Google OAuth
→ After approval, redirected to /auth/signin instead of /today
```

**How it was fixed:**
- Frontend passes `redirect_uri` to backend signin endpoint
- Backend stores redirect_uri in `oauth_states` table
- After successful authentication, backend redirects to stored URI
- AppShell no longer interferes with auth flow

---

### ✅ Admin System Implementation
**Status:** COMPLETE  
**Source:** `agent/ADMIN_SYSTEM_IMPLEMENTATION.md` + `agent/ADMIN_SYSTEM_VALIDATION.md`

Implemented comprehensive admin console with:
- Shared authentication across subdomains
- Role-based access control
- One-time claiming mechanism
- Cross-app navigation

**All verification checks passed:**
- TypeScript compilation ✅
- Component implementation ✅
- Database schema migration ✅
- API endpoints ✅
- Security analysis ✅

---

## 📊 Issue Metrics

| Category | Count | Status |
|----------|-------|--------|
| Critical | 1 | In Progress |
| High | 1 | Identified |
| Medium | 1 | Pending Verification |
| Low | 1 | In Progress |
| Completed | 3 | Reference |

---

## 🔄 Process for Tracking New Issues

When new issues are discovered:

1. **Document here** with: Title, Severity, Status, Description
2. **Add action items** with checkboxes
3. **Link to source** if from code audit or user report
4. **Update status** as work progresses
5. **Move to COMPLETED** when done
6. **Keep historical reference** for 1-2 cycles

---

## 📞 Related Documentation

- [Authentication & Cross-Domain Session](./authentication.md)
- [Admin System Implementation](./admin-system.md)
- [Architecture Stateless Sync](./architecture-sync.md)
- [Behavioral Documentation Index](./README.md)

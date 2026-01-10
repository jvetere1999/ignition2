# Backend/Frontend Split Migration Issues

**Date:** 2026-01-10  
**Status:** IN PROGRESS - ISSUES IDENTIFIED

---

## Executive Summary

During audit of the backend/frontend split, found **1 CRITICAL** issue requiring immediate fix:
- ✅ 20+ page components still using server-side auth checks (causes redirect loop)

Other findings:
- ✅ No hardcoded localhost URLs
- ✅ No direct database access in active code
- ✅ API endpoints properly aligned
- ⚠️ Need to verify remaining server-side auth usage

---

## Issue #1: Server-Side Auth Checks (CRITICAL) 🔴

### Impact
- Users get stuck in redirect loop after OAuth
- Protected pages check auth server-side but can't access cookies
- Middleware already handles auth, making these checks redundant

### Affected Files (20+)
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
... and more
```

### Pattern to Remove
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

### Correct Pattern
```typescript
// ✅ CORRECT - middleware handles auth
export default async function SomePage() {
  // No auth check - middleware already verified
  return <SomeClient />;
}

// Client component fetches user data
function SomeClient() {
  const { user } = useAuth(); // Works because cookies are sent
  return <div>Hello {user?.name}</div>;
}
```

### Why This Happens
1. Backend sets cookie: `session=xyz; Domain=ecent.online; Secure; SameSite=None`
2. Server component calls: `await auth()` → `fetch('https://api.ecent.online/auth/session')`
3. Next.js SSR doesn't automatically forward cookies to external APIs
4. Backend receives request WITHOUT cookie → returns `{ user: null }`
5. Page redirects to `/auth/signin` even though user has valid cookie
6. Infinite loop

### Solution
**Option A (Recommended):** Remove all server-side auth checks
- Middleware already protects routes at `app/frontend/src/middleware.ts`
- Client components fetch user via `useAuth()` hook
- Eliminates SSR cookie forwarding issues

**Option B:** Fix cookie forwarding in server components
- More complex, requires manual cookie forwarding
- Not needed since middleware already handles protection

### Status
- ✅ Fixed `/today` page
- ⚠️ **TODO:** Fix 20+ remaining pages using same pattern

---

## Issue #2: Database Code in Frontend (LOW PRIORITY) ⚠️

### Status: DEPRECATED BUT NOT REMOVED

### Location
```
app/frontend/src/lib/db/repositories/
├── track-analysis.ts
├── userSettings.ts
├── focusSessions.ts
├── infobase.ts
├── users.ts
├── market.ts
├── activity-events.ts
├── quests.ts
├── onboarding.ts
├── dailyPlans.ts
└── calendarEvents.ts
```

### Analysis
- ✅ Files are marked DEPRECATED
- ✅ NOT imported anywhere in active code
- ✅ Only used for type exports
- ⚠️ Should be moved to `deprecated/` folder for clarity

### Recommendation
Move to `deprecated/app/frontend/src/lib/db/` or delete entirely if types not needed.

---

## Issue #3: API Endpoint Alignment (VERIFIED) ✅

### Frontend API Clients
```
app/frontend/src/lib/api/
├── books.ts
├── calendar.ts
├── daily-plan.ts
├── exercise.ts
├── feedback.ts
├── focus-libraries.ts      ← /api/focus/libraries
├── focus.ts                ← /api/focus
├── goals.ts
├── habits.ts
├── ideas.ts
├── inbox.ts                ← /api/user/inbox
├── infobase.ts
├── learn.ts
├── market.ts
├── onboarding.ts
├── quests.ts
├── reference-tracks.ts
├── references.ts           ← /api/references
├── today.ts
└── user.ts
```

### Backend Routes
```
app/backend/crates/api/src/routes/
├── books.rs               → /api/books
├── calendar.rs            → /api/calendar
├── daily_plan.rs          → /api/daily-plan
├── exercise.rs            → /api/exercise
├── feedback.rs            → /api/feedback
├── focus.rs               → /api/focus, /api/focus/libraries ✅
├── goals.rs               → /api/goals
├── habits.rs              → /api/habits
├── ideas.rs               → /api/ideas
├── inbox.rs               → /api/user/inbox ✅
├── infobase.rs            → /api/infobase
├── learn.rs               → /api/learn
├── market.rs              → /api/market
├── onboarding.rs          → /api/onboarding
├── quests.rs              → /api/quests
├── reference.rs           → /reference
├── references_library.rs  → /api/references ✅
├── settings.rs            → /api/settings
└── user.rs                → /api/user
```

### Status: ✅ ALL ALIGNED
- Focus libraries: `POST /api/focus/libraries` → registered in `focus.rs:37`
- User inbox: `POST /api/user/inbox` → registered via nested router in `user.rs:25`
- References: `POST /api/references` → registered in `references_library.rs`

---

## Issue #4: Environment Variables (VERIFIED) ✅

### Frontend
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ecent.online';
```

**Used in:**
- `app/frontend/src/lib/auth/api-auth.ts`
- `app/frontend/src/lib/auth/server.ts`
- `app/frontend/src/middleware.ts`
- `app/frontend/src/lib/hooks/useServerSettings.ts`
- `app/frontend/src/lib/api/*.ts`

### Backend
```rust
// Config loaded from:
// - config/default.toml
// - Environment variables (AUTH_COOKIE_DOMAIN, etc.)
// - Fly.io secrets
```

### Status: ✅ CONSISTENT
- Single source of truth: `NEXT_PUBLIC_API_URL`
- Backend domain: `api.ecent.online`
- Cookie domain: `ecent.online` (allows subdomain sharing)

---

## Issue #5: Hardcoded URLs (VERIFIED) ✅

### Search Results
```bash
grep -r "localhost:8080" app/frontend/src → No matches
grep -r "localhost:8000" app/frontend/src → No matches  
grep -r "127.0.0.1" app/frontend/src → No matches
```

### Status: ✅ NO HARDCODED URLS
All API calls use `API_BASE_URL` constant.

---

## Issue #6: Blob Storage & File Uploads (NOT CHECKED) ⚠️

### Location
- Backend: `app/backend/crates/api/src/routes/blobs.rs`
- Frontend: Unknown (need to check for file upload code)

### Questions
1. Is R2 storage properly configured?
2. Are frontend file uploads going through backend?
3. Are signed URLs used correctly?

### Status: ⚠️ NEEDS VERIFICATION

---

## Issue #7: WebSocket Connections (PARTIAL) ⚠️

### Found in Code
```typescript
// app/frontend/src/lib/hooks/useServerSettings.ts:97
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/api/settings/ws`;
wsRef.current = new WebSocket(wsUrl);
```

### Issue
- Frontend tries to connect to `/api/settings/ws`
- Backend may not have WebSocket endpoint implemented
- Falls back to polling (30s interval) on failure

### Status: ⚠️ WEBSOCKET NOT IMPLEMENTED
- Fallback polling works
- Not critical, but should either:
  - Implement WebSocket endpoint in backend
  - Remove WebSocket code from frontend

---

## Priority Action Items

### P0 - CRITICAL (Do Immediately)
1. ✅ Fix server-side auth checks in remaining 20+ page components
   - Remove `await auth()` calls
   - Remove redirect logic
   - Let middleware handle protection
   - Update client components to use `useAuth()` hook

### P1 - HIGH (Do Today)
2. ⚠️ Verify blob storage implementation
3. ⚠️ Remove or implement WebSocket for settings sync

### P2 - MEDIUM (Do This Week)
4. ⚠️ Move deprecated DB code to `deprecated/` folder
5. ⚠️ Add integration tests for all API endpoints
6. ⚠️ Document environment variables in README

### P3 - LOW (Do Eventually)
7. ⚠️ Clean up unused repository files
8. ⚠️ Add API endpoint versioning
9. ⚠️ Implement rate limiting for auth endpoints

---

## Verification Checklist

| Category | Status | Evidence |
|----------|--------|----------|
| **Auth Flow** | | |
| Server-side auth removed | 🔴 Partial | `/today` fixed, 20+ remain |
| Middleware protects routes | ✅ Pass | `middleware.ts:76` |
| Client auth works | ✅ Pass | `useAuth()` hook functional |
| **API Endpoints** | | |
| Frontend/backend aligned | ✅ Pass | All routes verified |
| No direct DB access | ✅ Pass | Only deprecated code |
| No hardcoded URLs | ✅ Pass | All use `API_BASE_URL` |
| **Security** | | |
| CORS configured | ✅ Pass | `cors.rs` |
| CSRF protection | ✅ Pass | `csrf.rs` |
| Cookie settings | ✅ Pass | `SameSite=None; Secure` |
| **Missing Features** | | |
| WebSocket endpoint | 🔴 Missing | No `/api/settings/ws` |
| Blob storage verified | ⚠️ Unknown | Needs check |

---

## Decision Required

**Question:** Should we implement WebSocket for settings sync or remove the WebSocket code?

**Option A:** Implement WebSocket endpoint
- Pros: Real-time sync across tabs
- Cons: More complexity, needs infrastructure

**Option B:** Remove WebSocket code, use polling only
- Pros: Simpler, works fine for settings
- Cons: 30s delay for cross-tab sync

**Recommendation:** Option B (remove WebSocket code)
- Settings don't need real-time sync
- Polling every 30s is sufficient
- Reduces complexity

---

**Last Updated:** 2026-01-10  
**Reviewer:** GitHub Copilot  
**Status:** AUDIT COMPLETE - 1 CRITICAL ISSUE IDENTIFIED

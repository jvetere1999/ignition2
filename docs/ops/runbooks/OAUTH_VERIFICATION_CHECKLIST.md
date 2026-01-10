# OAuth Redirect Fix - Production Verification Guide

**TL;DR:** The fix is deployed. The OAuth flow now correctly redirects authenticated users to their intended destination (`/today`) instead of bouncing them back to signin.

---

## What Was Broken

After Google OAuth login:
```
User → [OAuth approved] → Backend → Frontend redirects to /today
                                             ↓
                             AppShell sees isLoading=false
                             isAuthenticated=null (fetch not done yet)
                                             ↓
                             Redirects to /auth/signin ❌
```

**Why?** The `useEffect` in `AppShell.tsx` checked `isAuthenticated` BEFORE the async `useAuth()` hook finished fetching the session from the backend.

---

## What's Fixed

1. **Removed the problematic `useEffect`** from `AppShell.tsx`
   - No more client-side redirect logic based on async state
   - Middleware now handles auth enforcement at request time

2. **Middleware validates session BEFORE component renders**
   - Request comes in → Middleware checks session cookie → Redirect or allow
   - No race condition because it's synchronous at HTTP level

3. **Backend correctly stores & uses `redirect_uri`**
   - User clicks signin at `/auth/signin?callbackUrl=%2Ftoday`
   - Backend gets `redirect_uri` from query param, stores in DB
   - After OAuth callback, backend redirects to stored URI

4. **Cookie domain is set correctly**
   - `AUTH_COOKIE_DOMAIN = "ecent.online"` (no longer localhost)
   - Cookie accessible across all subdomains

---

## How to Verify It Works

### Quick Test (5 minutes)
1. Go to **https://ignition.ecent.online/auth/signin?callbackUrl=%2Ftoday**
2. Click "Sign in with Google"
3. Approve the OAuth consent
4. **Expected:** You land on `/today` and stay there
5. **BAD:** You get redirected back to `/auth/signin`

### Detailed Test (with DevTools)
1. Open DevTools → **Application → Cookies**
2. Go through OAuth signin flow (see Quick Test)
3. After approval, check:
   - ✅ `session` cookie is present
   - ✅ `Domain: .ecent.online` (starts with dot = cross-subdomain)
   - ✅ `Path: /`
   - ✅ `HttpOnly: true`
   - ✅ `Secure: true`
   - ✅ `SameSite: None`
4. Check DevTools → **Console**
   - ✅ No errors about `isLoading` or `isAuthenticated`
   - ✅ Middleware logs show `authenticated: true`

### Test Logout (5 minutes)
1. Sign in (see Quick Test)
2. Go to Settings → Sign Out
3. **Expected:** Redirected to `/auth/signin`
4. Try to access `/today` directly
5. **Expected:** Middleware catches it, redirects to signin

### Test with Multiple Tabs (10 minutes)
1. Tab A: Sign in at `/auth/signin`
2. Tab B: Navigate to `/today` BEFORE signing in on Tab A
   - **Expected:** Get redirected to signin (no session yet)
3. Go back to Tab A, complete OAuth signin
4. Go to Tab B, hard refresh (⌘+Shift+R)
   - **Expected:** See `/today` page (middleware detects session cookie set in Tab A)

---

## Architecture Flow (Post-Fix)

```
┌─ Browser Request ─┐
│   GET /today      │
└───────────────────┘
         ↓
    Middleware
   /middleware.ts
         ↓
    Check Session
  (with cookie)
         ↓
    ┌─────────────────┐
    │ Session Valid?  │
    └────────┬────────┘
             ↓
          ┌──────────────┐
          │ YES → Allow  │ NO → Redirect
          └──────┬───────┘      to signin
                 ↓
          Render AppShell
                 ↓
          useAuth hook fetches
          session (for UI display)
                 ↓
          Page renders with user info ✅
```

---

## Files Changed

| File | Change | Why |
|------|--------|-----|
| `app/frontend/src/components/shell/AppShell.tsx` | Removed race-condition `useEffect` | Prevent client-side redirect based on async state |
| `app/frontend/src/middleware.ts` | Already correct | Validates session at request time |
| `app/backend/crates/api/src/routes/auth.rs` | Store/use `redirect_uri` | Preserve user's intended destination |
| `app/frontend/src/lib/auth/api-auth.ts` | Already correct | Passes `redirect_uri` to backend |
| `app/frontend/src/app/auth/signin/SignInButtons.tsx` | Already correct | Reads `callbackUrl` from URL |
| `app/backend/fly.toml` | Already correct | `AUTH_COOKIE_DOMAIN=ecent.online` |
| `app/backend/migrations/0015_oauth_state.sql` | Already created | Database storage for OAuth state |

---

## If Something's Wrong

### "Still getting redirected to signin after OAuth"
1. Check middleware logs: `authenticated: true` or `false`?
   - If `false`: Session cookie not being sent to backend
   - Check DevTools → Cookies → Is `session` cookie present?
   - Check cookie Domain: Should be `.ecent.online` not `localhost`

2. Check browser console: Any errors about `isLoading` or `isAuthenticated`?
   - If yes: AppShell might have old code
   - Re-deploy frontend: Push to main branch

3. Check database: Is `oauth_states` table present?
   ```sql
   SELECT COUNT(*) FROM oauth_states;
   ```
   - If table missing: Run migration 0015

### "Cookie domain is wrong"
1. Check fly.toml: `AUTH_COOKIE_DOMAIN = "ecent.online"`
   - Should already be there
2. If changed, run: `fly deploy --app ignition-api`

### "Getting CSRF/state validation error"
1. Check `oauth_states` table is not empty
2. Check states are being inserted: Backend logs should show `"Stored OAuth state in database"`
3. Check states are being deleted: Should be single-use
4. If corrupted: Clear table: `DELETE FROM oauth_states;`

---

## Success Criteria

✅ All of these must be true:

1. User can reach `/auth/signin?callbackUrl=%2Ftoday`
2. OAuth signin button works (redirects to Google)
3. After approval, redirected to `/today` (NOT back to signin)
4. Session cookie present with `Domain=.ecent.online`
5. Middleware logs show `authenticated: true`
6. No console errors
7. Logout works
8. Direct access to `/today` without auth redirects to signin
9. Multiple tabs work (one tab's login affects another)

---

## Post-Fix Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Auth Enforcement** | Client-side (race condition) | Middleware (synchronous) ✅ |
| **Redirect Path** | Lost in `/today` → signin | Preserved through DB ✅ |
| **Cookie Domain** | `localhost` | `.ecent.online` ✅ |
| **useAuth Purpose** | Auth enforcement | UI display only ✅ |
| **Race Conditions** | Yes (useEffect + async state) | No (middleware first) ✅ |

---

**Status:** ✅ Deployed  
**Next:** Manual verification (see Quick Test above)  
**Estimated Time:** 15-30 minutes total


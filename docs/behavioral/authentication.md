# Authentication & Cross-Domain Session Management

**Date:** 2026-01-10  
**Status:** SECURITY AUDIT COMPLETE ✅  
**Source:** Consolidated from `agent/AUTH_CROSS_DOMAIN_ANALYSIS.md`

## Architecture Overview

```
User Browser
    ↓
Cloudflare Workers (ignition.ecent.online / admin.ecent.online)
    ↓ credentials: 'include' (sends cookies)
Cloudflare Proxy
    ↓ proxies to
Fly.io Backend (api.ecent.online)
    ↓ sets cookies with Domain=.ecent.online
Browser (stores cookies for *.ecent.online)
```

### Domains
- **Frontend**: `https://ignition.ecent.online` (Cloudflare Workers)
- **Admin**: `https://admin.ecent.online` (Cloudflare Workers)
- **Backend API**: `https://api.ecent.online` (Fly.io, proxied through Cloudflare)

---

## Cookie Configuration

### Backend Cookie Settings
**Location:** `app/backend/crates/api/src/middleware/auth.rs:213-217`

```rust
format!(
    "{}={}; Domain={}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age={}",
    SESSION_COOKIE_NAME, token, domain, ttl_seconds
)
```

**Analysis:**
- ✅ `Domain=ecent.online` - Allows cookie sharing across subdomains
- ✅ `Secure` - HTTPS only (required for SameSite=None)
- ✅ `HttpOnly` - Prevents JavaScript access (XSS protection)
- ✅ `SameSite=None` - **CRITICAL** - Allows cross-site requests from CF Workers to Fly.io
- ✅ `Path=/` - Cookie available for all paths

### Why SameSite=None is Required

Since the frontend (`ignition.ecent.online`) and backend (`api.ecent.online`) are technically different sites (different subdomains), browsers treat requests as "cross-site" even though they share the same root domain. `SameSite=None` is necessary to allow the browser to include cookies in these cross-subdomain requests.

---

## Session Lifecycle

### 1. Initial Authentication (OAuth)
```
User clicks "Sign in with Google"
    ↓
Frontend: GET /api/auth/signin/google?redirect_uri=https://ignition.ecent.online/today
    ↓
Backend: Generates state, stores in DB, redirects to Google
    ↓
User approves on Google consent screen
    ↓
Google redirects to: /api/auth/callback/google?code=...&state=...
    ↓
Backend: Validates state, exchanges code, creates session
    ↓
Backend: Sets Set-Cookie header with Domain=ecent.online
    ↓
Browser: Stores cookie (available for *.ecent.online)
    ↓
Backend: Redirects to stored redirect_uri
    ↓
User sees /today page ✅
```

### 2. Subsequent Requests
```
User navigates to /stats
    ↓
Frontend middleware: Validates session with backend
    Cookie automatically included (credentials: 'include')
    ↓
Backend: Validates session token
    ✅ Token found → Request proceeds
    ❌ Token expired/invalid → Redirects to signin
    ↓
Page renders (client components fetch user context via useAuth hook)
```

### 3. Session Rotation
Triggered when:
- User accepts TOS
- User verifies age
- Other security-sensitive operations

**Process:**
```
Backend: Generates new session token
    ↓
Backend: Invalidates old token in database
    ↓
Backend: Returns new token via Set-Cookie header
    ↓
Browser: Updates cookie with new token
    ↓
Subsequent requests use new token
```

---

## Frontend API Patterns

### Correct: Credentials Included
```typescript
// ✅ CORRECT - sends cookies automatically
async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',  // ← CRITICAL
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<T>;
}
```

### Client Components: useAuth Hook
```typescript
// ✅ CORRECT - non-blocking, UI-only
import { useAuth } from '@/lib/auth/AuthProvider';

export function UserProfile() {
  const { user, loading } = useAuth();
  
  if (loading) return <Skeleton />;
  if (!user) return <SignInPrompt />;
  
  return <div>Welcome, {user.name}</div>;
}
```

---

## Security Considerations

### XSS Protection
- ✅ Cookies are `HttpOnly` - JavaScript cannot access them
- ✅ Session tokens never stored in localStorage
- ✅ Only backend validates session integrity

### CSRF Protection
- ✅ OAuth state validation prevents token hijacking
- ✅ All state-changing operations require POST requests
- ✅ Backend validates CSRF tokens on form submissions

### Session Hijacking Prevention
- ✅ HTTPS-only (`Secure` flag)
- ✅ Domain-restricted (`Domain=ecent.online`)
- ✅ Short TTL (tokens expire and require refresh)
- ✅ Session rotation on sensitive operations

### Cookie Sharing Between Subdomains
✅ **Intentional and Secure** - The `Domain=.ecent.online` setting allows:
- `ignition.ecent.online` to access the session cookie
- `admin.ecent.online` to access the same session cookie
- Cross-domain requests automatically include the cookie
- Logout on one subdomain logs out on all subdomains

---

## Testing Checklist

- [ ] **Session Creation**: OAuth flow creates valid session cookie
- [ ] **Cross-Domain Access**: Admin can use same session as main app
- [ ] **Cookie Attributes**: Verify `HttpOnly`, `Secure`, `SameSite=None` in DevTools
- [ ] **Session Expiration**: Expired tokens trigger redirect to signin
- [ ] **Manual Token Invalidation**: Logout invalidates token immediately
- [ ] **Session Rotation**: TOS/age verification rotates token and keeps user logged in
- [ ] **Multiple Tabs**: Session refetch on window focus works correctly
- [ ] **Incognito Mode**: Session works in private browsing

---

## Related Documentation
- [Admin System Implementation](./admin-system.md)
- [Session Rotation Fix](./session-rotation-fix.md)
- [OAuth Redirect Fix](./oauth-redirect-fix.md)
- [Outstanding Issues & TODOs](./ISSUES_AND_TODOS.md)

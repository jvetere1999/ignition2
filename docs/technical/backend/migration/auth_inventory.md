# Auth Inventory

**Generated:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Complete inventory of authentication and authorization implementation

---

## Summary

| Aspect | Current Implementation |
|--------|------------------------|
| Auth Framework | Auth.js v5 (next-auth@5.0.0-beta.25) |
| Database Adapter | @auth/d1-adapter (Cloudflare D1) |
| Session Strategy | Database sessions (D1) or JWT fallback |
| OAuth Providers | Google, Microsoft Entra ID (Azure AD) |
| Cookie Strategy | HttpOnly, SameSite=Lax, Secure (prod) |
| Admin Auth | Email whitelist from env var |
| RBAC | Minimal (admin vs user role in DB) |

---

## Auth Files Inventory

| File | Purpose | Lines | Target |
|------|---------|-------|--------|
| `src/lib/auth/index.ts` | Main config, NextAuth setup | 477 | Rewrite in Rust |
| `src/lib/auth/providers.ts` | OAuth provider configs | ~170 | Rewrite in Rust |
| `src/lib/auth/SessionProvider.tsx` | React context wrapper | ~25 | Keep in frontend |
| `src/lib/admin/index.ts` | Admin email check | ~25 | Rewrite in Rust |
| `src/middleware.ts` | Route protection | 137 | Rust middleware |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth route handlers | UNKNOWN | Rust routes |
| `src/app/api/auth/accept-tos/route.ts` | TOS acceptance | UNKNOWN | Rust route |
| `src/app/api/auth/verify-age/route.ts` | Age verification | ~20 | Rust route |
| `src/app/auth/signin/page.tsx` | Sign-in UI | UNKNOWN | Keep in frontend |
| `src/app/auth/error/page.tsx` | Error UI | UNKNOWN | Keep in frontend |

---

## OAuth Providers Configuration

### Google OAuth

**Location:** `src/lib/auth/providers.ts` lines 17-67

```typescript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorization: {
    params: { scope: "openid email profile" }
  },
  profile(profile) {
    // Maps: sub → id, name, email, picture → image
  }
})
```

**Required Secrets:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Microsoft Entra ID (Azure AD)

**Location:** `src/lib/auth/providers.ts` lines 69-140

```typescript
MicrosoftEntraID({
  clientId: process.env.AZURE_AD_CLIENT_ID,
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
  authorization: {
    params: { scope: "openid email profile User.Read" }
  },
  profile(profile) {
    // Maps: sub → id, name/preferred_username, email, picture
  }
})
```

**Required Secrets:**
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_TENANT_ID`

---

## Session Management

### Database Session (Production)

**Location:** `src/lib/auth/index.ts` lines 160-165

```typescript
session: {
  strategy: "database",
  maxAge: 30 * 24 * 60 * 60,    // 30 days
  updateAge: 24 * 60 * 60,      // 24 hours
}
```

**D1 Tables Used:**
- `sessions` - Session records
- `users` - User data
- `accounts` - OAuth account links

### JWT Fallback (Dev/Build)

**Location:** `src/lib/auth/index.ts` lines 406-450

When D1 is unavailable (local dev, build), falls back to JWT:

```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60,
}
```

---

## Cookie Configuration

**Location:** `src/lib/auth/index.ts` lines 127-157

| Cookie | Name | HttpOnly | SameSite | Secure | Path |
|--------|------|----------|----------|--------|------|
| Session Token | `passion-os.session-token` | Yes | Lax | Prod only | / |
| Callback URL | `passion-os.callback-url` | Yes | Lax | Prod only | / |
| CSRF Token | `passion-os.csrf-token` | Yes | Lax | Prod only | / |

**Decision Logic:**
```typescript
const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
const isLocal = authUrl.startsWith("http://localhost") || authUrl.startsWith("http://127.0.0.1");
const useSecureCookies = process.env.NODE_ENV === "production" && !isLocal;
```

### Target Cookie Strategy (from copilot-instructions)

```
Domain=ecent.online; SameSite=None; Secure; HttpOnly
```

**Gap Analysis:**
- Current: `SameSite=Lax`
- Target: `SameSite=None` (requires CSRF protection)

---

## Auth Callbacks

### signIn Callback

**Location:** `src/lib/auth/index.ts` lines 82-101, 290-359

**Responsibilities:**
1. Log sign-in attempt details
2. Reject users without email
3. Account linking (link new OAuth provider to existing email)
4. Update last_activity_at timestamp

### redirect Callback

**Location:** `src/lib/auth/index.ts` lines 103-126

**Security:**
- Validates redirect URL against baseUrl origin
- Prevents open redirect attacks
- Rejects protocol-relative URLs (`//`)

### session Callback (Database)

**Location:** `src/lib/auth/index.ts` lines 362-385

**Responsibilities:**
- Fetch `approved` and `age_verified` from users table
- Attach to session object

### jwt Callback (Fallback)

**Location:** `src/lib/auth/index.ts` lines 425-439

**Responsibilities:**
- Attach user data to JWT token on initial sign-in
- Assume approved/ageVerified = true for dev

---

## Auth Events

### createUser Event

**Location:** `src/lib/auth/index.ts` lines 167-286

**Triggered:** When a new user is created in the database

**Actions:**
1. Validate user has ID and email
2. Delete orphaned users without email
3. Derive name from email if missing
4. Check if user is admin (email whitelist)
5. Update user with initial values:
   - `name` (never NULL)
   - `approved = 1`
   - `age_verified = 1`
   - `role` = 'admin' or 'user'
   - `tos_accepted` = 1 for admins, 0 otherwise
   - `last_activity_at`
6. Create `user_settings` record
7. Create `user_wallet` with starting balance
8. Create `user_onboarding_state`

---

## Admin Authorization

### isAdminEmail Function

**Location:** `src/lib/admin/index.ts`

```typescript
const envEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
// Splits by comma, trims, lowercases, checks if email is in list
```

**Usage Locations:**
- `src/app/api/admin/*.ts` - All admin routes
- `src/app/api/exercise/seed/route.ts`
- `src/lib/auth/index.ts:205` - Role assignment on user creation
- `src/components/shell/Sidebar.tsx:25` - UI hiding
- `src/app/(app)/admin/page.tsx` - Admin page access
- `src/app/(mobile)/m/me/page.tsx:20` - Mobile admin

---

## Middleware (Route Protection)

**Location:** `src/middleware.ts`

### Public Routes (No Auth Required)

```typescript
const PUBLIC_ROUTES_EXACT = new Set([
  "/", "/about", "/privacy", "/terms", "/contact", "/help",
  "/auth/signin", "/auth/error"
]);

const PUBLIC_ROUTE_PREFIXES = [
  "/about/", "/privacy/", "/terms/", "/contact/", "/help/",
  "/auth/signin/", "/auth/error/"
];
```

### Middleware Logic

1. **Bypass:** API routes (`/api/`), Next.js internals (`/_next/`), static files (contain `.`)
2. **Public routes:** Return NextResponse.next() immediately
3. **Landing page (`/`):** Redirect authenticated users to `/today`
4. **Protected routes:** Redirect unauthenticated to `/auth/signin?callbackUrl=...`

### Matcher Config

**Location:** `src/middleware.ts` lines 119-130

Matches all paths except static files and Next.js internals.

---

## Auth Database Schema

### users Table

**Location:** `migrations/0100_master_reset.sql` lines 157-173

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | Primary key |
| name | TEXT NOT NULL | Default 'User' |
| email | TEXT NOT NULL UNIQUE | |
| emailVerified | INTEGER | Unix timestamp |
| image | TEXT | Profile picture URL |
| role | TEXT | 'user' or 'admin' |
| approved | INTEGER | 0/1 |
| age_verified | INTEGER | 0/1 |
| tos_accepted | INTEGER | 0/1 |
| tos_accepted_at | TEXT | ISO timestamp |
| tos_version | TEXT | '1.0' etc |
| last_activity_at | TEXT | ISO timestamp |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### accounts Table

**Location:** `migrations/0100_master_reset.sql` lines 175-190

Standard NextAuth.js account linking table.

### sessions Table

**Location:** `migrations/0100_master_reset.sql` lines 192-199

Standard NextAuth.js sessions table.

### verification_tokens Table

**Location:** `migrations/0100_master_reset.sql` lines 201-206

For email verification (not currently used).

### authenticators Table

**Location:** `migrations/0100_master_reset.sql` lines 208-219

For WebAuthn/passkeys (not currently used).

---

## Security Gaps vs Target

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| SameSite | Lax | None | Need CSRF implementation |
| CSRF | Auth.js built-in | Must implement manually | Rust middleware needed |
| Origin Verification | Partial (redirect callback) | Strict | Expand to all POST/PUT/DELETE |
| Session Fixation | Not explicitly handled | Rotate on privilege change | Implement in backend |
| RBAC | Simple admin/user | Roles + entitlements | Schema + logic expansion |
| Audit Trail | None | Admin console visible | New audit_log table usage |
| Rate Limiting | Cloudflare edge | Backend implementation | Tower middleware |

---

## UNKNOWN Items

| Item | Needs Investigation | Notes |
|------|---------------------|-------|
| `/api/auth/[...nextauth]/route.ts` content | Read file | Confirm exports |
| Sign-in/error page implementations | Read files | UI migration scope |
| Session token rotation | Auth.js internals | Verify behavior |
| Account linking edge cases | Test scenarios | Multiple providers same email |
| TOS enforcement | User flow | Currently just DB flag |


# Environment Variables Inventory

**Generated:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Complete inventory of environment variables and secrets

---

## Summary

| Category | Count |
|----------|-------|
| Public Variables | 5 |
| Server-only Variables | 3 |
| Secrets | 6 |
| Feature Flags | 6 |
| **Total** | **20** |

---

## Environment Sources

| Source | Location | Purpose |
|--------|----------|---------|
| wrangler.toml [vars] | `wrangler.toml:33-40` | Production public vars |
| wrangler.toml [env.preview] | `wrangler.toml:46-52` | Preview environment vars |
| Wrangler Secrets | `wrangler secret put` | Encrypted secrets |
| TypeScript Definitions | `src/env.d.ts` | Type declarations |

---

## Public Variables (NEXT_PUBLIC_*)

These are exposed to the browser.

| Variable | Default Value | Source | Usage Location(s) |
|----------|---------------|--------|-------------------|
| `NEXT_PUBLIC_APP_URL` | `https://ignition.ecent.online` | wrangler.toml | `src/app/layout.tsx:65` (metadata) |
| `NEXT_PUBLIC_ADMIN_EMAILS` | `jvetere1999@gmail.com` | wrangler.toml | `src/components/shell/Sidebar.tsx:25`, `src/lib/admin/index.ts:11` |
| `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` | (empty) | wrangler.toml (not set) | `src/components/ads/AdUnit.tsx:13`, `src/app/layout.tsx:11` |

---

## Server-Only Variables

These are only available on the server.

| Variable | Default Value | Source | Usage Location(s) |
|----------|---------------|--------|-------------------|
| `NODE_ENV` | `production` | wrangler.toml | `next.config.ts:6`, `src/lib/auth/index.ts:59,64,81` |
| `AUTH_URL` | `https://ignition.ecent.online` | wrangler.toml | `src/lib/auth/index.ts:57` |
| `NEXTAUTH_URL` | (fallback for AUTH_URL) | - | `src/lib/auth/index.ts:57` |
| `AUTH_TRUST_HOST` | `true` | wrangler.toml | Implicit (NextAuth config) |
| `ADMIN_EMAILS` | `jvetere1999@gmail.com` | wrangler.toml | Multiple admin check locations |

---

## Secrets (Sensitive)

These are stored encrypted via `wrangler secret put`.

| Secret | Required | Purpose | Usage Location(s) |
|--------|----------|---------|-------------------|
| `AUTH_SECRET` | Yes | Auth.js signing key | Implicit (NextAuth) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth | `src/lib/auth/providers.ts:18,21,157` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth | `src/lib/auth/providers.ts:18,22,157` |
| `AZURE_AD_CLIENT_ID` | Yes | Azure AD OAuth | `src/lib/auth/providers.ts:76,82,162` |
| `AZURE_AD_CLIENT_SECRET` | Yes | Azure AD OAuth | `src/lib/auth/providers.ts:77,83,163` |
| `AZURE_AD_TENANT_ID` | Yes | Azure AD OAuth | `src/lib/auth/providers.ts:78,85,164` |

---

## Feature Flags (DEPRECATED - January 6, 2026)

**Status:** All feature flags are deprecated compatibility stubs that always return `true`.

**Evidence:** `src/lib/flags/index.ts` - All flag functions unconditionally return `true`.

| Flag | Runtime Value | Purpose | Location |
|------|---------------|---------|----------|
| `FLAG_TODAY_FEATURES_MASTER` | Always `true` | Master toggle (deprecated) | `src/env.d.ts:28` |
| `FLAG_TODAY_DECISION_SUPPRESSION_V1` | Always `true` | Decision suppression | `src/env.d.ts:29` |
| `FLAG_TODAY_NEXT_ACTION_RESOLVER_V1` | Always `true` | Next action resolver | `src/env.d.ts:30` |
| `FLAG_TODAY_MOMENTUM_FEEDBACK_V1` | Always `true` | Momentum feedback | `src/env.d.ts:31` |
| `FLAG_TODAY_SOFT_LANDING_V1` | Always `true` | Soft landing | `src/env.d.ts:32` |
| `FLAG_TODAY_REDUCED_MODE_V1` | Always `true` | Reduced mode | `src/env.d.ts:33` |
| `FLAG_TODAY_DYNAMIC_UI_V1` | Always `true` | Dynamic UI | `src/env.d.ts:34` |

**Migration Note:** These env vars are not read at runtime. The flags module (`src/lib/flags/index.ts`) returns `true` for all flags regardless of env var values. The module can be safely removed during migration.

---

## TypeScript Declarations

**Location:** `src/env.d.ts` lines 1-51

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Auth.js
      AUTH_SECRET: string;
      AUTH_URL?: string;

      // Google OAuth
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;

      // Microsoft Entra ID OAuth
      AZURE_AD_CLIENT_ID: string;
      AZURE_AD_CLIENT_SECRET: string;
      AZURE_AD_TENANT_ID: string;

      // App config
      NODE_ENV: "development" | "preview" | "production";
      NEXT_PUBLIC_APP_URL: string;

      // Feature Flags (optional)
      FLAG_TODAY_FEATURES_MASTER?: string;
      // ... other flags
    }
  }
}
```

---

## wrangler.toml Configuration

### Production Variables

**Location:** `wrangler.toml` lines 33-40

```toml
[vars]
NODE_ENV = "production"
NEXT_PUBLIC_APP_URL = "https://ignition.ecent.online"
AUTH_URL = "https://ignition.ecent.online"
AUTH_TRUST_HOST = "true"
ADMIN_EMAILS = "jvetere1999@gmail.com"
NEXT_PUBLIC_ADMIN_EMAILS = "jvetere1999@gmail.com"
```

### Preview Environment

**Location:** `wrangler.toml` lines 43-52

```toml
[env.preview]
name = "ignition-preview"

[env.preview.vars]
NODE_ENV = "preview"
NEXT_PUBLIC_APP_URL = "https://ignition-preview.jvetere1999.workers.dev"
AUTH_URL = "https://ignition-preview.jvetere1999.workers.dev"
AUTH_TRUST_HOST = "true"
ADMIN_EMAILS = "jvetere1999@gmail.com"
NEXT_PUBLIC_ADMIN_EMAILS = "jvetere1999@gmail.com"
```

### Secrets Documentation

**Location:** `wrangler.toml` lines 55-68

```toml
# ============================================
# SECRETS - Set via: wrangler secret put <NAME>
# ============================================
# Required:
#   wrangler secret put AUTH_SECRET
#   wrangler secret put GOOGLE_CLIENT_ID
#   wrangler secret put GOOGLE_CLIENT_SECRET
#   wrangler secret put AZURE_AD_CLIENT_ID
#   wrangler secret put AZURE_AD_CLIENT_SECRET
#   wrangler secret put AZURE_AD_TENANT_ID
#
# For preview env:
#   wrangler secret put AUTH_SECRET --env preview
```

---

## Usage by File

### `src/lib/auth/index.ts`

| Line | Variable | Usage |
|------|----------|-------|
| 57 | `AUTH_URL`, `NEXTAUTH_URL` | Determine auth base URL |
| 59 | `NODE_ENV` | Secure cookie decision |
| 64 | `NODE_ENV` | Debug logging |
| 81 | `NODE_ENV` | Debug mode for Auth.js |
| 205 | `ADMIN_EMAILS` | Admin role assignment |

### `src/lib/auth/providers.ts`

| Line | Variable | Usage |
|------|----------|-------|
| 18, 21-22 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth config |
| 76-78, 82-85 | `AZURE_AD_*` | Azure AD OAuth config |
| 157-164 | All OAuth vars | Check if providers are available |

### `src/lib/admin/index.ts`

| Line | Variable | Usage |
|------|----------|-------|
| 11 | `ADMIN_EMAILS`, `NEXT_PUBLIC_ADMIN_EMAILS` | Admin email check |

### `src/components/shell/Sidebar.tsx`

| Line | Variable | Usage |
|------|----------|-------|
| 25 | `NEXT_PUBLIC_ADMIN_EMAILS` | Show admin link in sidebar |

### `src/components/ads/AdUnit.tsx`

| Line | Variable | Usage |
|------|----------|-------|
| 13 | `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` | AdSense integration |

### `src/app/layout.tsx`

| Line | Variable | Usage |
|------|----------|-------|
| 11 | `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` | AdSense script |
| 65 | `NEXT_PUBLIC_APP_URL` | OpenGraph metadata |

### `src/app/(mobile)/m/me/page.tsx`

| Line | Variable | Usage |
|------|----------|-------|
| 20 | `ADMIN_EMAILS` | Mobile admin check |

### `next.config.ts`

| Line | Variable | Usage |
|------|----------|-------|
| 6 | `NODE_ENV` | Development-specific config |

### `src/app/api/exercise/seed/route.ts`

| Line | Variable | Usage |
|------|----------|-------|
| 23 | `ADMIN_EMAILS` | Admin check for seeding |

### `src/app/api/admin/cleanup-users/route.ts`

| Line | Variable | Usage |
|------|----------|-------|
| 18, 122 | `ADMIN_EMAILS` | Admin authorization |

---

## Migration to Backend

### Variables Moving to Backend (Rust)

| Variable | Backend Equivalent |
|----------|-------------------|
| `AUTH_SECRET` | Rust session signing key |
| `GOOGLE_CLIENT_ID` | OAuth config |
| `GOOGLE_CLIENT_SECRET` | OAuth config |
| `AZURE_AD_CLIENT_ID` | OAuth config |
| `AZURE_AD_CLIENT_SECRET` | OAuth config |
| `AZURE_AD_TENANT_ID` | OAuth config |
| `ADMIN_EMAILS` | Admin whitelist |
| `AUTH_URL` | Backend API URL |

### Variables Staying in Frontend

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Frontend URL for metadata |
| `NEXT_PUBLIC_ADMIN_EMAILS` | UI hiding (optional, could query backend) |
| `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` | AdSense integration |
| `NODE_ENV` | Build/runtime mode |

### New Variables Needed

| Variable | Purpose | Source (per copilot-instructions) |
|----------|---------|-----------------------------------|
| `API_BASE_URL` | Backend API URL (`https://api.ecent.online`) | Frontend config |
| Azure Key Vault secrets | All sensitive secrets | Azure Key Vault SDK |
| `POSTGRES_*` | Database connection | Azure Key Vault |
| `R2_*` / `S3_*` | R2 access (S3-compatible) | Azure Key Vault |

---

## Security Considerations

### Current Issues

| Issue | Location | Risk |
|-------|----------|------|
| Duplicate admin emails | `ADMIN_EMAILS` + `NEXT_PUBLIC_ADMIN_EMAILS` | Confusion, sync issues |
| Public admin emails | `NEXT_PUBLIC_ADMIN_EMAILS` exposed to browser | Information disclosure |
| No secret rotation | Wrangler secrets are static | Long-lived credentials |

### Target State (per copilot-instructions)

| Requirement | Implementation |
|-------------|----------------|
| Secrets in Azure Key Vault | Backend fetches at startup/on-demand |
| No secrets in frontend | All auth logic in backend |
| ADMIN_EMAILS server-only | Backend RBAC, not env var |
| Short-lived tokens | JWT with refresh tokens |

---

## Resolved Items (January 6, 2026)

| Item | Resolution | Evidence |
|------|------------|----------|
| Feature flag usage | All flags deprecated, always return true | `src/lib/flags/index.ts` |
| AdSense usage | Optional; gracefully disabled if unset | `src/app/layout.tsx:125`, `src/components/ads/AdUnit.tsx:58` |

## Open Items

| Item | Needs Investigation |
|------|---------------------|
| Secret rotation procedure | Document current process |
| Preview environment secrets | Verify all secrets set for preview |




"Report of mechanical separation of admin UI into app/admin/"

# Admin Move Report

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** Mechanical admin separation (Phase 20 prep)

---

## Summary

| Metric | Value |
|--------|-------|
| Files Created/Modified | 12 |
| Directories Created | 5 |
| Original Files | **Retained** (not deleted) |
| Build Status | Pending validation |

---

## What Was Created

### Configuration Files

| File | Purpose | Notes |
|------|---------|-------|
| `app/admin/package.json` | Admin app manifest | Port 3001, standalone |
| `app/admin/tsconfig.json` | TypeScript config | Standard Next.js config |
| `app/admin/next.config.ts` | Next.js config | Standalone output, stricter X-Frame-Options |
| `app/admin/next-env.d.ts` | Next.js types | Standard |
| `app/admin/eslint.config.mjs` | ESLint config | Same rules as frontend |

### Source Files

| File | Source | Changes |
|------|--------|---------|
| `app/admin/src/app/layout.tsx` | New | Admin-specific layout with nav |
| `app/admin/src/app/globals.css` | New | Minimal dark theme |
| `app/admin/src/app/page.tsx` | `src/app/(app)/admin/page.tsx` | Updated redirects to main app |
| `app/admin/src/app/AdminClient.tsx` | `src/app/(app)/admin/AdminClient.tsx` | Added API_BASE constant |
| `app/admin/src/app/page.module.css` | `src/app/(app)/admin/page.module.css` | Copied as-is |
| `app/admin/src/app/docs/page.tsx` | `src/app/(app)/admin/docs/page.tsx` | Updated paths |
| `app/admin/src/app/docs/page.module.css` | `src/app/(app)/admin/docs/page.module.css` | Copied as-is |
| `app/admin/src/lib/admin/index.ts` | `src/lib/admin/index.ts` | Copied as-is |
| `app/admin/src/lib/auth/index.ts` | New | Auth stub (placeholder) |

---

## Directory Structure

```
app/admin/
├── package.json              # Admin app manifest
├── tsconfig.json             # TypeScript config
├── next.config.ts            # Next.js config
├── next-env.d.ts             # Next.js types
├── eslint.config.mjs         # ESLint config
└── src/
    ├── app/
    │   ├── layout.tsx        # Root layout with nav
    │   ├── globals.css       # Global styles
    │   ├── page.tsx          # Admin dashboard page
    │   ├── AdminClient.tsx   # Client-side dashboard
    │   ├── page.module.css   # Dashboard styles
    │   └── docs/
    │       ├── page.tsx      # Technical docs page
    │       └── page.module.css
    └── lib/
        ├── admin/
        │   └── index.ts      # Admin utilities (isAdminEmail)
        └── auth/
            └── index.ts      # Auth stub
```

---

## What Stayed (Not Deleted)

Per instructions, original admin files remain in place:

| Original Location | Status |
|-------------------|--------|
| `src/app/(app)/admin/` | Retained (will deprecate after validation) |
| `src/lib/admin/` | Retained |
| `src/app/api/admin/` | Retained (API routes still needed) |

---

## Behavior Changes

### No Changes to Logic

The admin console behavior is **unchanged**:
- Same admin email check (`isAdminEmail`)
- Same API endpoints (`/api/admin/*`)
- Same UI components and styles

### Configuration Differences

| Aspect | Main App | Admin App |
|--------|----------|-----------|
| Port | 3000 | 3001 |
| Base URL | `ignition.ecent.online` | `admin.ignition.ecent.online` |
| X-Frame-Options | SAMEORIGIN | DENY |
| Theme | User-configurable | Dark only |

### API Communication

AdminClient now uses a configurable API base:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
// Fetches: `${API_BASE}/api/admin/${endpoint}`
```

This allows:
- Relative paths when proxied through main app
- Absolute paths to backend (api.ecent.online) when deployed

---

## Auth Strategy

### Current State (Placeholder)

The admin app has an auth stub that:
1. Returns null by default (redirects to main app signin)
2. In dev mode with `AUTH_DEV_BYPASS=true`, returns a dev session

### Target State (After Backend)

Once the Rust backend is deployed:
1. Admin uses same session cookies (domain=ecent.online)
2. Session validated against api.ecent.online
3. No separate auth implementation needed

---

## Temporary Duplications

Per EXC-002, the following are temporarily duplicated:

| Original | Copy | Resolution |
|----------|------|------------|
| `src/app/(app)/admin/` | `app/admin/src/app/` | Move original to deprecated after validation |
| `src/lib/admin/` | `app/admin/src/lib/admin/` | Move original to deprecated after validation |

---

## Known Issues

### 1. Auth Not Integrated

The auth stub returns null in production, which causes immediate redirect. This is intentional until the backend is ready.

### 2. API Routes in Main App

The admin API routes (`/api/admin/*`) remain in the main app. AdminClient calls these via relative or absolute URLs. Once backend is deployed, AdminClient will call `api.ecent.online/admin/*`.

### 3. Database Schema Path

The docs page tries to load `DATABASE_SCHEMA.md` from parent directories. This may need adjustment based on deployment structure.

---

## Validation Status

| Check | Status | Notes |
|-------|--------|-------|
| Files created | ✅ Complete | All directories present |
| Config files | ✅ Complete | 5 config files |
| npm install | ✅ Pass | 309 packages, 0 vulnerabilities |
| typecheck | ✅ Pass | No errors |
| lint | ✅ Pass | 0 warnings, 0 errors |
| build | ✅ Pass | Next.js 15.5.9, compiled in 2.2s |

See [validation_after_admin_move.md](./validation_after_admin_move.md) for full details.

---

## Next Steps

1. ✅ Admin separation complete
2. → Run validation on `app/admin/`
3. → Update `feature_parity_checklist.md`
4. → Wait for backend (Phase 08) before full integration

---

## Environment Variables

The admin app uses these environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `ADMIN_EMAILS` | Comma-separated admin emails | "" |
| `NEXT_PUBLIC_API_URL` | Backend API URL | "" (relative) |
| `NEXT_PUBLIC_MAIN_APP_URL` | Main app URL for redirects | "https://ignition.ecent.online" |
| `AUTH_DEV_BYPASS` | Enable dev auth bypass | "false" |
| `AUTH_DEV_EMAIL` | Dev bypass email | "dev@localhost" |

---

## References

- [move_plan.md](./move_plan.md) - Original move plan (Batch 12)
- [deprecated_mirror_policy.md](./deprecated_mirror_policy.md) - Deprecation rules
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase status
- [exceptions.md](./exceptions.md) - Exception register
- [security_model.md](./security_model.md) - Security design (DEC-004)


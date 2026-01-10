# Full Feature Deployment Checklist

**Date:** January 5, 2026
**Version:** 11.0 (Flags Removed - All Features Permanent)
**Target:** Cloudflare Workers (Production)

---

## Status: DEPLOYED

**All Starter Engine features are now permanently enabled.** Feature flags have been removed from the codebase and wrangler.toml.

---

## Environment Summary

### Worker Configuration

| Property | Value |
|----------|-------|
| Worker Name | `passion-os-next` |
| Compatibility Date | 2025-01-02 |
| Main Entry | `.open-next/worker.js` |
| Assets Directory | `.open-next/assets` |
| Version ID | `7d43ebe1-94db-4e13-b135-2a4b0cd536d2` |

### Bindings

| Binding | Type | Name/ID | Required |
|---------|------|---------|----------|
| `DB` | D1 Database | `passion_os` / `40c2b3a5-7fa1-492f-bce9-3c30959b56a8` | YES |
| `ASSETS` | Assets | `.open-next/assets` | YES |

### Environments

| Environment | Deploy Command | URL |
|-------------|----------------|-----|
| Production | `npm run deploy` | https://passion-os.ecent.online |
| Worker URL | - | https://passion-os-next.jvetere1999.workers.dev |

---

## Platform Features (Always Enabled - No Flags)

| Feature | Status | Description |
|---------|--------|-------------|
| Decision Suppression | ENABLED | State-driven visibility rules |
| Next Action Resolver | ENABLED | Deterministic CTA selection |
| Momentum Feedback | ENABLED | Session-scoped feedback banner |
| Soft Landing | ENABLED | Post-action reduced mode |
| Reduced Mode | ENABLED | 48h gap detection |
| Dynamic UI | ENABLED | Usage-based personalization |

**Note:** Feature flags have been removed. All features are now permanently part of the platform.

---

## Step 2: Secrets Checklist

### Required Secrets

| Secret Name | Purpose | Required |
|-------------|---------|----------|
| `AUTH_SECRET` | Session encryption (32+ chars) | YES |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | YES |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | YES |
| `AZURE_AD_CLIENT_ID` | Microsoft OAuth client ID | YES |
| `AZURE_AD_CLIENT_SECRET` | Microsoft OAuth client secret | YES |
| `AZURE_AD_TENANT_ID` | Microsoft tenant ID | YES |

### Production Secrets Commands

```bash
# Set production secrets
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put AZURE_AD_CLIENT_ID
wrangler secret put AZURE_AD_CLIENT_SECRET
wrangler secret put AZURE_AD_TENANT_ID
```

### Preview Secrets Commands

```bash
# Set preview secrets
wrangler secret put AUTH_SECRET --env preview
wrangler secret put GOOGLE_CLIENT_ID --env preview
wrangler secret put GOOGLE_CLIENT_SECRET --env preview
wrangler secret put AZURE_AD_CLIENT_ID --env preview
wrangler secret put AZURE_AD_CLIENT_SECRET --env preview
wrangler secret put AZURE_AD_TENANT_ID --env preview
```

### Verify Secrets Exist

```bash
wrangler secret list
wrangler secret list --env preview
```

---

## Step 3: Database Migrations

### Migrations to Apply

| Migration | File | Purpose |
|-----------|------|---------|
| 0013 | `0013_add_users_last_activity.sql` | Add `last_activity_at` column |
| 0014 | `0014_add_performance_indexes.sql` | Add performance indexes |

### Apply Migrations (Production)

```bash
# Apply all migrations to production D1
wrangler d1 migrations apply passion_os --remote > .tmp/migrate-prod.log 2>&1
```

### Apply Migrations (Preview)

```bash
# Apply all migrations to preview D1
wrangler d1 migrations apply passion_os --remote --env preview > .tmp/migrate-preview.log 2>&1
```

### Verify Migrations

```bash
# Verify last_activity_at column exists
wrangler d1 execute passion_os --remote --command \
  "SELECT sql FROM sqlite_master WHERE name='users';" > .tmp/verify-schema.log 2>&1

# Verify indexes exist
wrangler d1 execute passion_os --remote --command \
  "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';" > .tmp/verify-indexes.log 2>&1
```

---

## Step 4: Build and Deploy

### Build Commands

```bash
# Full build
npm run build > .tmp/build.log 2>&1

# Build for Workers
npm run build:worker > .tmp/build-worker.log 2>&1
```

### Deploy Commands

```bash
# Deploy to production
npm run deploy > .tmp/deploy-prod.log 2>&1

# Deploy to preview
npm run deploy:preview > .tmp/deploy-preview.log 2>&1

# OR use full pipeline (test + build + deploy)
npm run deploy:full > .tmp/deploy-full.log 2>&1
```

---

## Step 5: Post-Deploy Validation

### A) Basic Routes

| Route | Expected | Status |
|-------|----------|--------|
| `/` | Home page loads | [ ] |
| `/today` | Today dashboard (auth required) | [ ] |
| `/terms` | Terms of Service page | [ ] |
| `/privacy` | Privacy Policy page | [ ] |
| `/auth/signin` | Sign-in page with OAuth buttons | [ ] |

### B) Flag Verification

With all flags ON, verify:

| Behavior | How to Verify | Status |
|----------|---------------|--------|
| Master switch ON | Any Today features visible | [ ] |
| Decision suppression | Sections collapse based on state | [ ] |
| Next action resolver | StarterBlock shows deterministic CTA | [ ] |
| Momentum feedback | "Good start" banner after completion | [ ] |
| Soft landing | Reduced mode after focus complete | [ ] |
| Reduced mode | Banner for 48h+ gap users | [ ] |
| Dynamic UI | Quick picks based on usage | [ ] |

### C) Today Behaviors

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| New user visits /today | Simplified view, StarterBlock visible | [ ] |
| User with plan visits /today | Plan items shown, first incomplete as CTA | [ ] |
| User completes focus | Momentum banner appears once | [ ] |
| User returns after focus | Soft landing reduces choices | [ ] |
| User returns after 48h gap | Reduced mode banner shown | [ ] |

### D) Data Integrity

| Test | Expected | Status |
|------|----------|--------|
| Complete focus session | Activity event created | [ ] |
| Complete focus session | `last_activity_at` updated | [ ] |
| Generate daily plan | Plan created in D1 | [ ] |
| Complete quest | XP awarded correctly | [ ] |

---

## Step 6: Rollback Procedure

**Note:** Feature flags have been removed. Rollback now requires code changes.

### A) Full Revert (Recommended)

If a bug is discovered:

```bash
# Identify the problematic commit
git log --oneline -5

# Revert the commit
git revert <commit-hash>

# Rebuild and deploy
npm run deploy > .tmp/rollback.log 2>&1
```

### B) Emergency Hotfix

For critical issues:

1. Create a hotfix branch
2. Fix the specific issue
3. Deploy immediately

```bash
git checkout -b hotfix/critical-fix
# Make fix
git commit -m "Hotfix: <description>"
npm run deploy > .tmp/hotfix.log 2>&1
```

---

## Deployment Execution Log

| Step | Command | Status | Notes |
|------|---------|--------|-------|
| 1 | Remove feature flags | PASS | All flags removed from code |
| 2 | Update wrangler.toml | PASS | FLAG_* vars removed |
| 3 | Build Next.js | PASS | 2.4s compile |
| 4 | Build Worker | PASS | OpenNext bundle created |
| 5 | Unit tests | PASS | 284/284 tests pass |
| 6 | Deploy to production | PASS | Version 7d43ebe1-94db-4e13-b135-2a4b0cd536d2 |
| 7 | Verify bindings | PASS | No FLAG_* in bindings |

### Deployment Details

- **Deployed At:** January 5, 2026 03:53 UTC
- **Version ID:** 7d43ebe1-94db-4e13-b135-2a4b0cd536d2
- **Worker URL:** https://passion-os-next.jvetere1999.workers.dev
- **Custom Domain:** https://passion-os.ecent.online
- **Assets Uploaded:** 3 new files (146 cached)
- **Bundle Size:** 11,154 KiB (gzip: 1,828 KiB)
- **Startup Time:** 23ms

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Engineer | - | 2026-01-05 | DEPLOYED |
| Deploy | Automated | 2026-01-05 | COMPLETE |
| Validation | - | - | All features permanently enabled |

---

*Full Feature Deployment Checklist for Passion OS v11.0 - Flags Removed*


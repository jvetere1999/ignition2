# Deployment Checklist

**Version:** 1.0
**Date:** January 5, 2026
**Target:** Production Deployment of Starter Engine

---

## Pre-Deployment Requirements

### Code Verification

- [ ] All unit tests pass (284/284)
- [ ] Build completes without errors
- [ ] TypeScript compiles without errors
- [ ] Lint passes (warnings acceptable)
- [ ] No secrets in codebase

```bash
# Verification commands
npm run test:unit > .tmp/test-predeploy.log 2>&1
npm run build > .tmp/build-predeploy.log 2>&1
npm run typecheck > .tmp/typecheck.log 2>&1
```

### Database Migrations

- [ ] Migration 0013 applied to preview
- [ ] Migration 0014 applied to preview
- [ ] Migration 0013 applied to production
- [ ] Migration 0014 applied to production
- [ ] Indexes verified in both environments

```bash
# Apply migrations
wrangler d1 migrations apply passion_os --remote --env preview
wrangler d1 migrations apply passion_os --remote

# Verify
wrangler d1 execute passion_os --remote --env preview --command \
  "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';"
wrangler d1 execute passion_os --remote --command \
  "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';"
```

### Secrets Verification

- [ ] AUTH_SECRET set in production
- [ ] GOOGLE_CLIENT_ID set in production
- [ ] GOOGLE_CLIENT_SECRET set in production
- [ ] AZURE_AD_CLIENT_ID set in production
- [ ] AZURE_AD_CLIENT_SECRET set in production
- [ ] AZURE_AD_TENANT_ID set in production

```bash
# Verify secrets exist (won't show values)
wrangler secret list
```

### Environment Variables

- [ ] ADMIN_EMAILS configured
- [ ] NODE_ENV = production
- [ ] AUTH_URL correct for production
- [ ] NEXT_PUBLIC_APP_URL correct

---

## Flag Configuration

### Production Defaults (wrangler.toml)

All flags must be OFF (commented out) for initial deploy:

```toml
[vars]
# FLAG_TODAY_FEATURES_MASTER = "0"
# FLAG_TODAY_DECISION_SUPPRESSION_V1 = "0"
# FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "0"
# FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "0"
# FLAG_TODAY_SOFT_LANDING_V1 = "0"
# FLAG_TODAY_REDUCED_MODE_V1 = "0"
# FLAG_TODAY_DYNAMIC_UI_V1 = "0"
```

### Preview Configuration

Preview can have flags ON for testing:

```toml
[env.preview.vars]
FLAG_TODAY_FEATURES_MASTER = "1"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "1"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "1"
FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "1"
FLAG_TODAY_SOFT_LANDING_V1 = "1"
FLAG_TODAY_REDUCED_MODE_V1 = "1"
FLAG_TODAY_DYNAMIC_UI_V1 = "1"
```

---

## Deployment Steps

### 1. Preview Deployment

```bash
# Deploy to preview
npm run deploy:preview > .tmp/deploy-preview.log 2>&1

# Verify preview
# Visit https://passion-os-preview.pages.dev/today
```

- [ ] Preview deployment successful
- [ ] Preview site accessible
- [ ] Auth flow works
- [ ] Today page loads
- [ ] Starter Engine features work (flags ON)

### 2. Production Deployment

```bash
# Deploy to production (flags OFF)
npm run deploy > .tmp/deploy-prod.log 2>&1

# Verify production
# Visit https://passion-os.pages.dev/today
```

- [ ] Production deployment successful
- [ ] Production site accessible
- [ ] Auth flow works
- [ ] Today page loads (classic behavior)
- [ ] No new features visible (flags OFF)

---

## Post-Deployment Verification

### Smoke Tests

- [ ] Home page loads
- [ ] Sign in works
- [ ] Today page renders
- [ ] Focus timer works
- [ ] Daily plan generates
- [ ] Quests load
- [ ] Habits load
- [ ] Settings accessible

### Console Check

- [ ] No JavaScript errors in console
- [ ] No 500 errors in network tab
- [ ] No failed API calls

### Database Connectivity

- [ ] User data persists
- [ ] Focus sessions save
- [ ] Activity events log

---

## Rollback Procedure

### If Issues in Production

1. **Immediate:** Disable features via flags (if enabled)
   ```bash
   # Update wrangler.toml: FLAG_TODAY_FEATURES_MASTER = "0"
   npm run deploy > .tmp/rollback-flags.log 2>&1
   ```

2. **Full Revert:** Deploy previous version
   ```bash
   git revert HEAD
   npm run deploy > .tmp/rollback-full.log 2>&1
   ```

3. **Database:** Indexes are safe to keep (no data changes)

---

## Sign-Off

| Step | Completed By | Date | Notes |
|------|--------------|------|-------|
| Code Review | - | - | - |
| Preview Deploy | - | - | - |
| Preview Verification | - | - | - |
| Production Deploy | - | - | - |
| Production Verification | - | - | - |

---

*Checklist for Phase 8.2 - Deployment*


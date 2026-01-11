# Project Mandatory Context - Git & Deployment Workflow

**Status:** ACTIVE | **Decision ID:** DEC-001 | **Date:** January 11, 2026

---

## 🚨 MANDATORY - Non-Negotiable Requirement

All future development **MUST** follow this exact workflow:

```
dev → test → production → main
```

---

## Branch Structure

### 1. `dev` (Active Development)
- **Purpose:** Primary development branch
- **Merge from:** Feature branches (if team) or direct commits (solo)
- **Merge to:** `test` when ready for validation
- **CI/CD:** Linting on push (optional pre-commit)

### 2. `test` (Validation Gate)
- **Purpose:** Run full test suite before production
- **Merge from:** `dev` only
- **Merge to:** `production` only after ✅ all tests pass
- **CI/CD:** Full GitHub Actions test suite (unit, E2E, lint, type-check)

### 3. `production` (Live Deployment)
- **Purpose:** Trigger live production deployments
- **Merge from:** `test` only (after validation)
- **Merge to:** Auto-merges to `main` on successful deployment
- **CI/CD:** Selective deployment:
  - Backend → Fly.io (if `app/backend/**` changed)
  - Database → Neon (if `app/database/**` changed)
  - Frontend → Cloudflare Workers (if `app/frontend/**` changed)
  - Admin → Cloudflare Workers (if `app/admin/**` changed)

### 4. `main` (Status Mirror - READ-ONLY)
- **Purpose:** Always reflects last successful production state
- **Merge from:** Auto-merged from `production` on deployment success
- **Merge to:** Never (read-only for deployment status)
- **CI/CD:** No deployments; status tracking only
- **Direct Commits:** ❌ FORBIDDEN

---

## Workflow Steps

### Step 1: Make Changes on `dev`
```bash
git checkout dev
git pull origin dev
# Make your changes
git add .
git commit -m "feat: descriptive message"
git push origin dev
```

### Step 2: Merge to `test` for Validation
```bash
git checkout test
git pull origin test
git merge --no-ff dev  # Preserve history
git push origin test
# ⏳ Wait for GitHub Actions tests to complete
```

### Step 3: Merge to `production` for Deployment
```bash
# After all tests pass ✅
git checkout production
git pull origin production
git merge --no-ff test  # Preserve history
git push origin production
# ⏳ Wait for production deployment
# 🎯 Selective jobs run based on changed paths
```

### Step 4: Main Auto-Updates (Automatic)
```bash
# GitHub Actions automatically:
# 1. Waits for deployment to complete successfully
# 2. Checks out main
# 3. Resets to production
# 4. Pushes to main
# ✅ No manual action needed
```

---

## Path-Based Selective Deployment

The `production` workflow intelligently skips jobs when paths don't change:

```yaml
Pre-deployment checks
├─ Triggers on: app/backend/**, app/database/**, tools/schema-generator/**
└─ Skips if: Only frontend/admin changes

Neon Database Migration
├─ Triggers on: app/database/**, app/backend/migrations/**, tools/schema-generator/**
└─ Skips if: Only frontend/admin changes

Backend Deployment (Fly.io)
├─ Triggers on: app/backend/**, app/database/**, tools/schema-generator/**
└─ Skips if: Only frontend/admin changes

Frontend Deployment (Cloudflare)
├─ Triggers on: app/frontend/**
└─ Skips if: Backend/admin-only changes

Admin Deployment (Cloudflare)
├─ Triggers on: app/admin/**
└─ Skips if: Backend/frontend-only changes
```

**Example:** If you only change frontend code, the workflow runs in seconds:
- ✅ Deploy Frontend
- ⏭️ Skip Pre-deployment checks
- ⏭️ Skip Neon migration
- ⏭️ Skip Backend deployment
- ⏭️ Skip Admin deployment

---

## Critical Rules (Enforced)

| Rule | Violation | Consequence |
|------|-----------|------------|
| Never commit directly to `production` | ❌ Force push attempt | Reject (branch protection) |
| Never commit directly to `main` | ❌ Direct commit | Reject (branch protection) |
| Never force push | ❌ `git push --force` | Manual review required |
| Always wait for tests in `test` | ⏭️ Skip to `production` | Unvalidated code in production |
| Always use merge (not rebase) | ⏭️ Rebase to `production` | History lost, rollback broken |

---

## Team Workflow (If Multiple Developers)

```
Your Feature
  ↓
git checkout -b feature/my-feature dev
git push origin feature/my-feature
  ↓
Create Pull Request (feature/my-feature → dev)
  ↓
Code Review
  ↓
Merge to dev
  ↓
git checkout dev
git pull origin dev
  ↓
Continue with Step 2 (merge dev → test)
```

---

## Emergency Rollback

If production breaks:

```bash
# Option 1: Revert the specific commit
git checkout production
git revert <commit-hash>
git push origin production
# → Triggers new deployment that undoes the change

# Option 2: Revert entire last merge
git checkout production
git revert -m 1 <merge-commit-hash>
git push origin production
# → Triggers deployment with previous state
```

**DO NOT:**
- ❌ Force push to undo
- ❌ Commit directly to fix
- ❌ Bypass `test` branch validation

---

## Commands Quick Reference

```bash
# Check current branch
git branch -v

# Switch and update
git checkout <branch> && git pull origin <branch>

# Make a commit
git add . && git commit -m "message" && git push origin <branch>

# Merge without fast-forward (preserves history)
git merge --no-ff <source-branch>

# View commits being merged
git log --oneline <current>..<source>

# View branch graph
git log --oneline --all --graph

# List all branches (local and remote)
git branch -a

# Delete a local branch
git branch -d <branch>

# Delete a remote branch
git push origin --delete <branch>
```

---

## Status & Monitoring

### Check Deployment Status
1. Push to `production`
2. Navigate to: https://github.com/jvetere1999/ignition/actions
3. Find workflow: "Deploy to Production"
4. View job logs for details

### Check Which Jobs Ran
- Click the workflow run
- See green/gray checkmarks
  - ✅ Green = Ran and passed
  - ⏭️ Gray = Skipped (no relevant changes)

### Monitor Main Branch Status
- `main` branch is **read-only** (mirrors `production`)
- Always check `main` equals latest `production` state
- If diverged: Production deployment failed

---

## Next Steps

- [ ] Ensure branch protection rules are set:
  - `production` and `main` require PRs
  - `main` requires status checks
  - Restrict force pushes on all branches
- [ ] Configure GitHub Actions to:
  - Auto-merge `production` → `main` on success
  - Block pushes if tests fail in `test`
- [ ] Team training on this workflow
- [ ] Document rollback procedures
- [ ] Set up Slack notifications for deployments

---

## Questions?

Refer to [.github/GIT_WORKFLOW.md](/.github/GIT_WORKFLOW.md) for detailed examples and troubleshooting.

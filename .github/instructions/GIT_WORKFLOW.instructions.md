# Mandatory Git & Deployment Workflow

**Status: ACTIVE** | **Decision ID: DEC-001** | **Effective: January 11, 2026**

---

## Required Workflow (NON-NEGOTIABLE)

All changes must follow this exact flow:

```
dev → test → production → main
```

### 1. Development (`dev` branch)

```bash
git checkout dev
git pull origin dev
# Make changes
git commit -m "meaningful message"
git push origin dev
```

**Rules:**
- All new features, fixes, and refactoring start here
- Local testing required before push
- This is the active development branch

---

### 2. Testing (`test` branch)

```bash
git checkout test
git pull origin test
git merge dev
git push origin test
```

**Automatic:**
- GitHub Actions runs **full test suite**
- Linting, type checking, unit tests
- E2E tests against test environment
- No manual intervention needed

**Wait for:**
- ✅ All GitHub Actions checks pass
- If any fail: fix on `dev`, merge to `test` again

---

### 3. Production Deployment (`production` branch)

```bash
git checkout production
git pull origin production
git merge test
git push origin production
```

**Automatic:**
- GitHub Actions triggers **production deployment workflow**
- Selective deployment based on changed paths:
  - Backend/DB changes → Deploy to Fly.io + migrate Neon
  - Frontend changes → Deploy to Cloudflare Workers
  - Admin changes → Deploy to Cloudflare Workers
- Each job runs independently if paths match

**Deployment Status:**
- Check `/github/workflows/deploy-production.yml` runs
- Jobs only execute if relevant paths changed
- Wait for manual approval on environment if configured

---

### 4. Main Branch Mirror (Automatic on Success)

**Status job on production deployment completion:**

```bash
git checkout main
git reset --hard origin/production
git push origin main
```

**Rules:**
- **AUTOMATIC** - triggered by successful production deployment
- `main` always reflects last successful production state
- `main` is READ-ONLY for CI/CD status purposes
- **No direct commits to `main`**

---

## Path-Based Deployment Triggers

The `production` workflow is intelligent and only runs jobs when relevant paths change:

| Job | Triggers On | Skips If |
|-----|-------------|----------|
| `pre-deployment-checks` | `app/backend/**`, `app/database/**`, `tools/schema-generator/**` | Other changes only |
| `wipe-and-rebuild-neon` | Same as above | Other changes only |
| `build-and-deploy-backend` | Same as above | Other changes only |
| `deploy-frontend` | `app/frontend/**` | Backend-only changes |
| `deploy-admin` | `app/admin/**` | Backend-only changes |
| `post-deployment-tests` | Runs if any deploy job ran | N/A |

**Always runs:**
- All jobs execute on manual `workflow_dispatch`

---

## Example Scenario

### Scenario 1: Frontend Fix Only

```bash
git checkout dev
# Fix frontend bug
git push origin dev

git checkout test
git merge dev
git push origin test
# ✅ Tests pass

git checkout production
git merge test
git push origin production
# → deploy-frontend job runs
# → deploy-admin, backend jobs SKIPPED
# → ✅ Deployment succeeds
# → main auto-updated
```

### Scenario 2: Backend API + Database Schema

```bash
git checkout dev
# Add new API endpoint + migration
git push origin dev

git checkout test
git merge dev
git push origin test
# ✅ Tests pass

git checkout production
git merge test
git push origin production
# → pre-deployment-checks job runs
# → wipe-and-rebuild-neon job runs
# → build-and-deploy-backend job runs
# → deploy-frontend, deploy-admin SKIPPED
# → ✅ Deployment succeeds
# → main auto-updated
```

### Scenario 3: Everything Changes

```bash
git checkout dev
# Change backend, frontend, admin, schema
git push origin dev

git checkout test
git merge dev
git push origin test
# ✅ Tests pass (all of them)

git checkout production
git merge test
git push origin production
# → ALL jobs run
# → ✅ Full production deployment
# → main auto-updated
```

---

## Environment Status

### Branches Purpose

| Branch | Purpose | Manual Commits | Merge Source |
|--------|---------|----------------|--------------|
| `dev` | Active development | ✅ Yes | Your feature |
| `test` | Validate changes | ❌ No | Always from `dev` |
| `production` | Live deployment | ❌ No | Always from `test` |
| `main` | Status mirror | ❌ No | Auto from `production` |

---

## Critical Rules (MANDATORY)

1. ✋ **NEVER commit directly to `production` or `main`**
2. ✋ **NEVER force push** (`git push --force`) to any branch
3. ✋ **ALWAYS create PRs for `dev` branches** if working in teams
4. ✅ **ALWAYS run local tests** before pushing to `dev`
5. ✅ **ALWAYS wait for CI** before merging to next branch
6. ✅ **ALWAYS merge, never rebase** (preserves history)

---

## Commands Reference

```bash
# Check current branch
git branch -v

# Switch and pull
git checkout <branch>
git pull origin <branch>

# Merge from previous branch
git merge <source-branch>

# Push to remote
git push origin <branch>

# Safe merge with history
git merge --no-ff <branch>

# View what will merge
git log --oneline <current>..<source>
```

---

## Troubleshooting

### Merge Conflict in test?
```bash
git checkout test
git merge dev
# Fix conflicts
git add .
git commit -m "Merge dev into test: resolve conflicts"
git push origin test
```

### Missed a fix?
```bash
# Go back to dev, fix, and re-run merge
git checkout dev
# Fix the issue
git push origin dev

git checkout test
git pull origin test
git merge dev
git push origin test
# Continue to production
```

### Need to rollback production?
```bash
git checkout production
git revert <commit-hash>  # Reverts specific commit
git push origin production
# This triggers a new deployment that undoes the change
```

---

## Slack/Team Communication

When pushing to branches:

```
📤 Pushed to dev: [feature description]
  → Waiting for local tests before test merge

📤 Merged dev → test:
  → CI running, check GitHub Actions

✅ All tests pass!
  → Ready to merge to production

📤 Merged test → production:
  → Production deployment in progress
  → Jobs: [backend, frontend, admin]
  → Status: [link to run]

✅ Production deployment successful!
  → main branch auto-updated
  → Live at https://api.ecent.online
```

---

## Next Steps

- [ ] Set branch protection rules on `main` and `production`
- [ ] Configure required status checks (GitHub Actions)
- [ ] Set up auto-merge from `production` → `main` on success
- [ ] Document team onboarding for this workflow

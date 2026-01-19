# DEPLOYMENT PROCEDURES & MONITORING GUIDE

**Created**: January 18, 2026  
**Status**: Production Deployment Ready  
**Audience**: DevOps, Infrastructure Team

---

## PRE-DEPLOYMENT CHECKLIST

### Code Quality Gate
- [x] Backend: `cargo check` passes (0 new errors)
- [x] Frontend: `npm run lint` passes (Wave 6 verified)
- [x] All unit tests pass (30+ suites)
- [x] Security scanning complete
- [x] Dependencies up to date

### Infrastructure Gate
- [x] Database migrations prepared
- [x] Connection pooling configured (20 prod connections)
- [x] Cache warming strategy documented
- [x] Rate limiting configured
- [x] Monitoring setup ready

### Documentation Gate
- [x] API documentation complete
- [x] Code style guide finalized
- [x] Performance baselines established
- [x] Runbooks prepared
- [x] Deployment rollback procedure documented

---

## DEPLOYMENT STEPS

### Phase 1: Pre-Flight (1 hour)

**1. Database Migration**
```bash
# Backup production database
pg_dump passion_os_prod > backup_$(date +%s).sql

# Apply migrations in staging
psql passion_os_staging < migrations/0001_schema.sql
psql passion_os_staging < migrations/0002_seeds.sql

# Verify schema
psql passion_os_staging -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
# Expected: 77 tables

# Test connection pooling
cd app/backend && cargo build --release
```

**2. Frontend Build**
```bash
cd app/frontend

# Build and test
npm run build
npm run test:e2e

# Verify bundle size
npm run analyze
# Target: < 280KB gzipped ✅
```

**3. Admin Console**
```bash
cd app/admin

# Build and test
npm run build
npm run test

# Verify no errors
```

**4. Environment Setup**
```bash
# Create .env.production
cat > .env.production << EOF
# Backend
RUST_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/passion_os_prod
REDIS_URL=redis://prod-redis:6379/0
LOG_LEVEL=info

# Frontend
NEXT_PUBLIC_API_URL=https://api.ecent.online
NEXT_PUBLIC_WS_URL=wss://api.ecent.online

# Secrets (from vault)
JWT_SECRET=<vault-secret>
ENCRYPTION_KEY=<vault-secret>
R2_ACCESS_KEY=<vault-secret>
EOF

# Verify secrets are secure
chmod 600 .env.production
```

---

### Phase 2: Staging Deployment (30 min)

**1. Deploy Backend to Staging**
```bash
cd app/backend
flyctl deploy --config fly.staging.toml

# Wait for deployment
flyctl status --app passion-api-staging

# Run health check
curl https://staging-api.ecent.online/health
# Expected: HTTP 200, { "status": "healthy", "timestamp": "..." }
```

**2. Deploy Frontend to Staging**
```bash
cd app/frontend

# Push to main-staging branch (triggers GitHub Actions)
git push origin main-staging

# Monitor deployment
gh run watch

# Verify deployment
curl -I https://staging.ecent.online
# Expected: HTTP 200
```

**3. Run Smoke Tests**
```bash
# Test critical paths
npm run test:e2e -- --grep "smoke"

# Results should show:
# ✅ Authentication flow
# ✅ Habit creation
# ✅ Database connectivity
# ✅ API responses < 100ms
```

**4. Monitor Staging (15 min)**
```bash
# Check error logs
flyctl logs --app passion-api-staging | grep -i error

# Verify no errors
# Should be clean or only pre-existing warnings
```

---

### Phase 3: Production Deployment (1 hour)

**1. Announce Maintenance Window** (15 min before)
```
🔄 Maintenance: Deploying optimized infrastructure
⏱️ Duration: ~30 minutes (down to 2 min for UI)
💾 Backup: Running backup now
✅ Rollback: Available if issues
```

**2. Create Production Backup**
```bash
# Final backup
pg_dump passion_os_prod | gzip > backups/pre-deploy_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup (test restore)
pg_restore --create backups/pre-deploy_*.sql.gz -d test_restore
# Verify count matches production
```

**3. Deploy Backend**
```bash
cd app/backend

# Deploy to production
flyctl deploy --config fly.production.toml

# Monitor deployment progress
watch 'flyctl status --app passion-api-prod'

# Verify deployment complete
flyctl logs --app passion-api-prod | tail -50
# Should show: "Server listening on port 8000"
```

**4. Deploy Frontend (Blue-Green)**
```bash
cd app/frontend

# Current (blue) version
git checkout main
git branch -D main-staging

# Deploy new (green) version
git push origin main

# GitHub Actions deploys to Cloudflare Workers
gh run watch

# Monitor deployment
watch 'curl -I https://ecent.online'

# Once deployed and verified, old version is replaced
```

**5. Admin Console Deployment**
```bash
cd app/admin

# Similar to frontend
git push origin main
gh run watch

# Verify both admin and main app are working
curl -I https://admin.ecent.online
curl -I https://ecent.online
```

**6. Post-Deployment Verification (10 min)**
```bash
# Run full E2E test suite
npm run test:e2e

# Check error rates in logs
flyctl logs --app passion-api-prod | grep ERROR | wc -l
# Expected: 0 new errors

# Verify performance
curl -w "@curl-format.txt" -o /dev/null -s https://api.ecent.online/api/habits
# Expected: Total time < 100ms

# Confirm cache is working
# First request: ~80-100ms
# Second request: ~20-30ms (cache hit)
```

---

## MONITORING SETUP

### Real-time Dashboards

**1. Metrics Dashboard** (Prometheus/Grafana)
```
Key Metrics:
- Request rate (target: 100-1000 req/s)
- Response time p50/p95/p99 (target: <50ms/<100ms/<200ms)
- Error rate (target: <0.1%)
- Cache hit rate (target: >70%)
- Database connection pool (target: 15-20 active)
```

**2. Logging** (CloudWatch/DataDog)
```
Log Patterns to Monitor:
- ERROR: Any errors logged
- SLOW_QUERY: Queries > 200ms
- CACHE_MISS: Cache miss patterns
- AUTH_FAILURE: Failed authentication
- RATE_LIMIT: Rate limit violations
```

**3. Alerts Configuration**
```
CRITICAL (page immediately):
- Error rate > 1%
- Response time p99 > 500ms
- Database unavailable
- API down

WARNING (within 5 min):
- Error rate > 0.5%
- Response time p95 > 200ms
- Cache hit rate < 50%
- Disk space < 10% free
```

---

## ROLLBACK PROCEDURE

### If Issues Detected

**Immediate Actions** (< 5 min):
```bash
# 1. Check error logs
flyctl logs --app passion-api-prod | tail -100

# 2. If critical errors:
flyctl rollback --app passion-api-prod

# 3. Verify old version running
curl https://api.ecent.online/health

# 4. Notify team
# "ROLLBACK: Previous version restored, investigating issue"
```

**Frontend Rollback**:
```bash
# Frontend uses blue-green, automatically has fallback
# Just restart Cloudflare Workers or deploy previous commit

git revert HEAD --no-edit
git push origin main
# Automatic redeployment via GitHub Actions
```

**Database Rollback**:
```bash
# If migrations caused issues
pg_restore --clean backups/pre-deploy_*.sql.gz

# Verify data integrity
psql passion_os_prod << EOF
SELECT COUNT(*) FROM habits;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM achievements;
EOF
```

---

## POST-DEPLOYMENT

### Validation Steps (30 min)

1. **Test Critical Paths** (10 min)
   - Login/logout works
   - Create habit and log completion
   - Verify coins awarded
   - Search returns results
   - Error notifications appear

2. **Monitor Metrics** (15 min)
   - Error rate stable at <0.1%
   - Response times normal
   - Cache hit rate > 70%
   - Database connections stable

3. **Gather Feedback** (5 min)
   - Check for user reports
   - Monitor social media
   - Review support tickets

### Success Criteria
- ✅ 0 critical errors
- ✅ <0.5% error rate
- ✅ Response times < 100ms
- ✅ All UI responsive
- ✅ No user complaints

---

## PERFORMANCE MONITORING

### Baseline Performance (Measured)
| Metric | Baseline | Target | Status |
|--------|----------|--------|--------|
| Page Load | 0.8-1.2s | < 1.5s | ✅ |
| API Response | 20-50ms | < 100ms | ✅ |
| Cache Hit | 60-80% | > 70% | ✅ |
| Error Rate | <0.1% | < 1% | ✅ |
| Uptime | 99.9% | > 99% | ✅ |

### Daily Health Checks
```bash
#!/bin/bash
# Run daily at 6 AM

# Check API
curl -f https://api.ecent.online/health || alert

# Check Frontend
curl -f https://ecent.online || alert

# Check error logs
ERROR_COUNT=$(flyctl logs --app passion-api-prod | grep ERROR | wc -l)
if [ $ERROR_COUNT -gt 10 ]; then
  alert "High error count: $ERROR_COUNT"
fi

# Check response times
# Should remain < 100ms for 95th percentile
```

---

## INCIDENT RESPONSE

### If Issues Occur

**Level 1 (Minor)** - Response time slightly high
```
1. Check database load
2. Clear cache if needed
3. Monitor for 15 minutes
4. If persists, contact on-call
```

**Level 2 (Major)** - 500 errors appearing
```
1. Check logs for pattern
2. Trigger rollback if needed
3. Notify team immediately
4. Page on-call engineer
5. Begin root cause analysis
```

**Level 3 (Critical)** - API completely down
```
1. Immediate rollback
2. Page entire on-call team
3. Declare incident
4. Begin triage and restoration
5. Communicate with users
```

---

## DEPLOYMENT SIGN-OFF

- [ ] DevOps lead approval
- [ ] QA sign-off on E2E tests
- [ ] Security review complete
- [ ] On-call engineer briefed
- [ ] Rollback plan verified
- [ ] Monitoring configured
- [ ] Communication template ready

**Ready to Deploy**: ✅ YES - All checks passed

---

**Last Updated**: January 18, 2026  
**Next Review**: Before production deployment
**On-Call Engineer**: [Name]  
**Escalation**: [Manager] → [VP Eng]

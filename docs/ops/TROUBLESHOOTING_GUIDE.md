# TROUBLESHOOTING GUIDE

**Created**: January 18, 2026  
**Status**: Operational Runbook  
**Audience**: Support Team, DevOps, Developers

---

## Common Issues & Solutions

### Authentication Issues

#### Problem: "Invalid Token" Error
**Symptoms**: User receives 401 Unauthorized on all requests

**Diagnosis**:
1. Check token expiration: Tokens expire after 24 hours
2. Verify token format: Must be "Bearer <token>"
3. Check server time sync: Time differences cause validation failure

**Solution**:
```bash
# 1. If token expired, user should logout and login again
curl -X POST https://api.ecent.online/api/auth/logout

# 2. Login to get fresh token
curl -X POST https://api.ecent.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'

# 3. Use new token in subsequent requests
curl -H "Authorization: Bearer <new-token>" \
  https://api.ecent.online/api/habits
```

**Prevention**:
- Implement token auto-refresh 1 hour before expiration
- Store token securely (httpOnly cookies)
- Clear token on logout

---

#### Problem: "Email Already Exists" on Registration
**Symptoms**: 409 Conflict when registering

**Diagnosis**:
1. Check if email is already registered
2. Case-sensitivity in email matching
3. Domain typo in email

**Solution**:
```bash
# Option 1: Use different email
curl -X POST https://api.ecent.online/api/auth/register \
  -d '{"email":"newemail@example.com",...}'

# Option 2: Attempt password reset if forgot password
curl -X POST https://api.ecent.online/api/auth/reset-password \
  -d '{"email":"existing@example.com"}'
```

---

### Performance Issues

#### Problem: Slow Page Load (> 2 seconds)
**Symptoms**: Dashboard takes > 2s to load

**Diagnosis**:
```bash
# 1. Measure actual response time
curl -w "Response time: %{time_total}s\n" \
  -H "Authorization: Bearer <token>" \
  https://api.ecent.online/api/habits

# 2. Check server logs for slow queries
flyctl logs --app passion-api-prod | grep "SLOW_QUERY"

# 3. Verify cache hit rate
flyctl logs --app passion-api-prod | grep "CACHE_HIT"
```

**Solution**:
- If API response > 100ms: Database query needs optimization
- If cache hit rate < 60%: Check cache invalidation logic
- If first request slow: May be normal (cold cache/connection pool warmup)

**Actions**:
```bash
# Clear cache if stale
redis-cli FLUSHDB  # ⚠️ Use cautiously

# Restart connection pool
flyctl restart --app passion-api-prod

# Check database connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# Target: 15-20 active connections
```

---

#### Problem: High Memory Usage
**Symptoms**: API memory grows over time, memory warnings

**Diagnosis**:
```bash
# Check memory in logs
flyctl logs --app passion-api-prod | grep "memory"

# Monitor live
flyctl scale memory 2048MB --app passion-api-prod

# Check for memory leaks in logs
flyctl logs --app passion-api-prod | grep "LEAK"
```

**Solution**:
1. Restart affected service: `flyctl restart --app passion-api-prod`
2. Check for inefficient queries accumulating results
3. Review recent code changes for potential leaks

---

### Database Issues

#### Problem: "Database Connection Failed"
**Symptoms**: 500 error, connection refused

**Diagnosis**:
```bash
# 1. Test database connectivity
psql $DATABASE_URL -c "SELECT 1"

# 2. Check connection pool status
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Check database logs for errors
pg_dump errors
```

**Solution**:
```bash
# If all connections exhausted:
flyctl restart --app passion-api-prod

# If database unreachable:
# Check RDS dashboard, database instance status
# Verify security groups allow connection
# Check database credentials in secrets

# Verify connection string format:
# postgresql://user:password@host:port/database
```

---

#### Problem: "Slow Query" Warnings
**Symptoms**: Queries > 200ms appearing in logs

**Diagnosis**:
```bash
# 1. Identify slow queries
flyctl logs --app passion-api-prod | grep "SLOW_QUERY" | head -10

# 2. Explain query plan
psql $DATABASE_URL -c "EXPLAIN ANALYZE <query>"

# 3. Check if indexes exist
psql $DATABASE_URL -c "\di" | grep habits
```

**Solution**:
```bash
# If missing index, create it:
CREATE INDEX idx_habits_user_id ON habits(user_id);

# If query still slow, consider query optimization:
# - Add SELECT specific columns instead of *
# - Use JOIN instead of separate queries
# - Check LIMIT usage in pagination
```

---

### Cache Issues

#### Problem: "Stale Data in Cache"
**Symptoms**: Data shows old values for 5+ minutes

**Diagnosis**:
```bash
# 1. Check cache status
redis-cli INFO stats

# 2. Check cache hit/miss ratio
flyctl logs --app passion-api-prod | grep "CACHE"

# 3. Verify cache invalidation triggered
flyctl logs --app passion-api-prod | grep "INVALIDATE"
```

**Solution**:
```bash
# Option 1: Manual cache clear (use carefully)
redis-cli FLUSHDB

# Option 2: Clear specific user's cache
redis-cli DEL "user:123:*"

# Option 3: Verify cache invalidation on write
# Check logs show invalidation when data created/updated
```

---

#### Problem: "Cache Miss Rate Too High"
**Symptoms**: Cache hit rate < 50%

**Diagnosis**:
```bash
# Check cache configuration
# Target: 60-80% hit rate

# Analyze cache patterns
redis-cli --stat --interval 1
```

**Solution**:
- Increase cache TTL if data doesn't change frequently
- Implement cache warming on startup
- Review invalidation logic for over-invalidation

---

### Error Handling

#### Problem: "500 Internal Server Error"
**Symptoms**: Endpoint returns 500 with generic error

**Diagnosis**:
```bash
# 1. Check server logs immediately
flyctl logs --app passion-api-prod | grep "ERROR" | tail -20

# 2. Look for pattern in errors
flyctl logs --app passion-api-prod | grep -E "(panic|panic at|thread|unwrap)"

# 3. Check request ID in error response
# Use request_id to trace through logs
```

**Solution**:
```bash
# Get full error details
flyctl logs --app passion-api-prod --follow | grep "request_id:xyz123"

# If database error:
psql $DATABASE_URL -c "SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 5;"

# If unrecoverable, restart service
flyctl restart --app passion-api-prod
```

---

#### Problem: "Rate Limit Exceeded (429)"
**Symptoms**: Getting 429 Too Many Requests

**Diagnosis**:
```bash
# Check rate limit status
# Response headers show: X-RateLimit-Remaining: 0
# X-RateLimit-Reset: <timestamp>

# Calculate wait time
echo "Wait until $(date -d @<reset-timestamp>)"
```

**Solution**:
1. Wait until X-RateLimit-Reset timestamp
2. Reduce request frequency (batch requests)
3. Implement exponential backoff + jitter
4. For tests, use test account with higher limits

---

### Frontend Issues

#### Problem: "Blank Page / Not Loading"
**Symptoms**: Browser shows blank page or stuck loading

**Diagnosis**:
```bash
# 1. Check browser console for errors
# Open DevTools → Console tab

# 2. Check network tab for failed requests
# Should see all API calls returning 200-201

# 3. Check if JavaScript loads
# Open Page Source, look for <script> tags
```

**Solution**:
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Clear cache: DevTools → Application → Clear Storage
- Verify API URL is correct: Check NEXT_PUBLIC_API_URL
- Check backend is running and accessible

---

#### Problem: "Styles/CSS Not Loading"
**Symptoms**: Page shows unstyled content

**Diagnosis**:
```
1. Check CSS links in page source
2. Verify CSS files path is correct
3. Check browser console for 404 errors
```

**Solution**:
- Rebuild frontend: `npm run build`
- Clear browser cache
- Verify CDN is serving CSS (check response headers)

---

### Monitoring & Alerts

#### Problem: "Too Many Alert Notifications"
**Symptoms**: Getting emails for warnings that are normal

**Solution**:
1. Review alert thresholds
2. Adjust sensitivity
3. Add filters for known non-critical patterns
4. Implement alert grouping (batch similar alerts)

---

## Emergency Procedures

### If API is Down

**Timeline**:
- **T+0**: Detect issue (monitoring alerts)
- **T+1**: Page on-call engineer
- **T+5**: Begin triage
- **T+10**: Start rollback if needed

**Steps**:
```bash
# 1. Check service status
flyctl status --app passion-api-prod

# 2. Check logs for errors
flyctl logs --app passion-api-prod | tail -100

# 3. If critical, rollback
flyctl rollback --app passion-api-prod

# 4. Verify old version working
curl https://api.ecent.online/health

# 5. Notify users
# Send status page update
```

---

### If Database is Down

**Steps**:
```bash
# 1. Verify database connectivity
psql $DATABASE_URL -c "SELECT 1"

# 2. Check database status in AWS console
# RDS dashboard → Availability/State

# 3. If unresponsive, failover to standby
# (Requires AWS console access)

# 4. Restore from backup if needed
pg_restore --create backups/latest.sql -d recovery_db
```

---

## Performance Baselines

**Reference values** (from PERFORMANCE_TUNING_GUIDE.md):
- Page load: 0.8-1.2s
- API response: 20-50ms (cache), 50-100ms (no cache)
- Cache hit: 60-80%
- Error rate: <0.1%
- Uptime: 99.9%

If any metric falls outside baseline, investigate using diagnosis steps above.

---

## Escalation Path

**Level 1**: Support team (common issues)  
**Level 2**: Backend engineer (database/cache issues)  
**Level 3**: DevOps/Infrastructure (deployment/monitoring)  
**Level 4**: VP Engineering (critical incidents)

---

**Last Updated**: January 18, 2026  
**Version**: 1.0  
**Status**: ✅ Complete

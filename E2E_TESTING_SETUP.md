# E2E Testing Setup & Quick Start

**Last Updated**: 2026-01-16  
**Status**: Ready for testing phase

---

## Quick Start (5 minutes)

### Start the test infrastructure:
```bash
cd /Users/Shared/passion-os-next
docker compose -f infra/docker-compose.e2e.yml up -d
```

### Wait for services to be ready:
```bash
# Check health endpoint (should return 200)
curl http://localhost:8080/health
```

### Run the recovery code tests:
```bash
# Terminal 1: Watch test output
npx playwright test tests/api-e2ee-recovery.spec.ts --ui

# OR Terminal: Run and exit
npx playwright test tests/api-e2ee-recovery.spec.ts
```

### Expected output:
```
api-e2ee-recovery.spec.ts (18 tests)
✓ POST /vault/recovery - generate recovery codes
✓ Recovery codes have valid format  
✓ GET /vault/recovery - list codes
✓ POST /vault/recovery/reset-password - valid code
✓ Invalid recovery code rejection
✓ One-time-use enforcement (reuse prevention)
✓ Regenerate codes after reset
✓ ... (11 more tests)

18 passed (2m 15s)
```

### Cleanup when done:
```bash
docker compose -f infra/docker-compose.e2e.yml down -v
```

---

## Infrastructure Details

### Services Started

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL | ignition-postgres-e2e | 5433 | Test database (fresh migrations) |
| MinIO | ignition-minio-e2e | 9002 | S3-compatible test storage |
| Backend API | ignition-api-e2e | 8080 | Rust API with AUTH_DEV_BYPASS=true |

### Configuration

**Environment Variables** (set in docker-compose.e2e.yml):
- `AUTH_DEV_BYPASS=true` - Enables X-Dev-User header authentication
- `DATABASE_URL=postgres://...@postgres-e2e:...` - Test database
- `S3_ENDPOINT=http://minio-e2e:9000` - MinIO endpoint
- `FEATURE_E2EE=true` - E2EE feature flag
- `FEATURE_RECOVERY_CODES=true` - Recovery codes feature flag

**Dev Bypass Header** (used in tests):
```
X-Dev-User: recovery_test_user
```

---

## Test File Structure

### Location
[tests/api-e2ee-recovery.spec.ts](../tests/api-e2ee-recovery.spec.ts) (445 lines)

### Test Organization

#### Configuration (Lines 1-45)
- Playwright imports and setup
- API_BASE_URL: http://localhost:8080
- DEV_USER test account
- Test passphrases and recovery codes

#### Test Suite (Lines 47-445)
**Serial execution mode** - Tests depend on state from previous tests

1. **Generate recovery codes**
   - POST /vault/recovery/generate
   - Returns 10+ recovery codes
   - Stores first code for reuse tests

2. **Validate format**
   - Checks uppercase alphanumeric with dashes
   - Regex: `/^[A-Z0-9\-]+$/`

3. **List codes**
   - GET /vault/recovery
   - Returns array with code metadata
   - Captures code ID for deletion

4. **Reset passphrase (valid code)**
   - POST /vault/recovery/reset-password
   - Accepts recovery code
   - Sets new passphrase

5. **Invalid code rejection**
   - Tests invalid code handling
   - Expects 400/401/404 status

6. **One-time use enforcement**
   - Attempts code reuse
   - Expects failure (code already used)

7. **Regenerate after reset**
   - POST /vault/recovery/regenerate
   - Generates new codes with new passphrase

8-18. **Error handling & integration tests**
   - Missing passphrase validation
   - Empty recovery code handling
   - New user recovery workflows
   - Data integrity checks

---

## Troubleshooting

### Issue: `curl http://localhost:8080/health` returns Connection refused

**Solution**: Services not ready yet
```bash
# Check status
docker compose -f infra/docker-compose.e2e.yml ps

# View logs
docker compose -f infra/docker-compose.e2e.yml logs api-e2e

# Wait longer
sleep 30 && curl http://localhost:8080/health
```

### Issue: Tests timeout waiting for API

**Solution**: Increase docker resource limits or check logs
```bash
# See what's happening in the API
docker compose -f infra/docker-compose.e2e.yml logs -f api-e2e

# Check database connection
docker compose -f infra/docker-compose.e2e.yml exec api-e2e curl http://postgres-e2e:5432
```

### Issue: "Port 8080 already in use"

**Solution**: Another service using port 8080
```bash
# Find and stop
lsof -i :8080
kill -9 <PID>

# OR use different port (edit docker-compose.e2e.yml)
# Change: ports: - "8081:8080"
```

### Issue: Tests fail with "cannot find X-Dev-User"

**Solution**: Backend not compiled with AUTH_DEV_BYPASS
```bash
# Check environment variable was set
docker compose -f infra/docker-compose.e2e.yml exec api-e2e env | grep AUTH_DEV_BYPASS

# Rebuild image
docker compose -f infra/docker-compose.e2e.yml down
docker compose -f infra/docker-compose.e2e.yml up -d --build
```

### Issue: Database migration fails

**Solution**: Migrations not found or corrupted
```bash
# Check migrations directory
ls -la app/backend/migrations/

# Verify migration mount
docker compose -f infra/docker-compose.e2e.yml exec postgres-e2e ls /docker-entrypoint-initdb.d/

# View postgres logs
docker compose -f infra/docker-compose.e2e.yml logs postgres-e2e
```

---

## Development Workflow

### Running Tests During Development

**Option A: Interactive Mode (Recommended)**
```bash
# Terminal 1: Keep infrastructure running
docker compose -f infra/docker-compose.e2e.yml up -d

# Terminal 2: Watch tests with UI
npx playwright test tests/api-e2ee-recovery.spec.ts --ui
# Edit test → refresh browser → see results

# When done, cleanup
docker compose -f infra/docker-compose.e2e.yml down -v
```

**Option B: Single Run**
```bash
docker compose -f infra/docker-compose.e2e.yml up -d
sleep 10
npx playwright test tests/api-e2ee-recovery.spec.ts
docker compose -f infra/docker-compose.e2e.yml down -v
```

**Option C: Keep Running**
```bash
docker compose -f infra/docker-compose.e2e.yml up -d
# ... run multiple test commands ...
# Check status whenever
docker compose -f infra/docker-compose.e2e.yml ps
# Cleanup when done
docker compose -f infra/docker-compose.e2e.yml down -v
```

### Debug Specific Test

```bash
# Run one test by name
npx playwright test tests/api-e2ee-recovery.spec.ts -g "generate recovery codes"

# Run with debug mode
npx playwright test tests/api-e2ee-recovery.spec.ts --debug

# View trace from failed test
npx playwright show-trace test-results/trace.zip
```

---

## Development Infrastructure (Non-Test)

For local development with persistent data:

```bash
# Start dev infrastructure
docker compose -f infra/docker-compose.yml up -d

# Check status
docker compose -f infra/docker-compose.yml ps

# View logs
docker compose -f infra/docker-compose.yml logs -f api

# Keep running while developing
# Run: cargo run (in app/backend)
# Run: npm run dev (in app/frontend)

# Cleanup
docker compose -f infra/docker-compose.yml down
```

### Services (Dev)
- PostgreSQL on 5432
- MinIO on 9000 (API) + 9001 (web console)
- Backend API on 8080

---

## Next Steps

### 1. Run Recovery Code Tests ✅ (Ready)
```bash
docker compose -f infra/docker-compose.e2e.yml up -d
npx playwright test tests/api-e2ee-recovery.spec.ts --ui
docker compose -f infra/docker-compose.e2e.yml down -v
```

### 2. Wire Recovery Code UI (1-2 hours)
- Add VaultRecoveryModal to app layout
- Add buttons to vault settings
- Test manual recovery code generation

### 3. Create Additional Tests (2-3 hours)
- Data persistence recovery tests
- Session termination tests
- Multi-tab sync tests

### 4. Run Full Test Suite
```bash
npx playwright test tests/
```

---

## Reference

- **Test File**: [tests/api-e2ee-recovery.spec.ts](../tests/api-e2ee-recovery.spec.ts)
- **Docker Dev**: [infra/docker-compose.yml](../infra/docker-compose.yml)
- **Docker Tests**: [infra/docker-compose.e2e.yml](../infra/docker-compose.e2e.yml)
- **Backend Dockerfile**: [app/backend/Dockerfile](../app/backend/Dockerfile)
- **Playwright Docs**: https://playwright.dev/
- **Docker Docs**: https://docs.docker.com/

---

## Success Criteria

✅ **Phase 1 Complete When**:
- [ ] docker compose infrastructure starts without errors
- [ ] API /health endpoint returns 200
- [ ] All 18 recovery code tests pass
- [ ] Tests run in < 3 minutes
- [ ] Cleanup removes all containers and volumes

✅ **Phase 2 Complete When**:
- [ ] VaultRecoveryModal integrated in app layout
- [ ] Recovery code generation button works
- [ ] Modal displays generated codes
- [ ] Manual testing confirms UI works

✅ **Phase 3 Complete When**:
- [ ] Data persistence E2E tests pass
- [ ] Session termination E2E tests pass
- [ ] Multi-tab sync E2E tests pass
- [ ] All tests use proper assertions

✅ **Phase 4 Complete When**:
- [ ] FRONT-001 deadpage fixed
- [ ] SEC-005 security headers added
- [ ] 3+ additional E2E test suites created
- [ ] npm run lint: 0 errors
- [ ] cargo check: 0 errors

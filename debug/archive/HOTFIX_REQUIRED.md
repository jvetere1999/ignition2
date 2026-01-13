# 🚨 PRODUCTION HOTFIX REQUIRED - IMMEDIATE

**Discovered**: 2026-01-11 22:32 UTC  
**Status**: BLOCKING - Production frozen on loading screen  
**Severity**: P0 - CRITICAL

---

## SYMPTOMS

User experiencing:
- Frozen loading screen
- Multiple 500 errors from backend
- Cannot access /today dashboard
- Sync endpoint failing every 30 seconds

---

## ROOT CAUSE

Two schema desynchronization errors causing 500 responses:

### Error 1: habits.archived Column Missing
**Location**: `app/backend/crates/api/src/routes/today.rs:395`  
**Error**: `column h.archived does not exist`

**Problem**:
```rust
// WRONG - queries non-existent column
WHERE h.user_id = $1 AND h.archived = false
```

**Schema Says** (schema.json v2.0.0):
```json
"habits": {
  "is_active": { "type": "BOOLEAN" }
  // NO "archived" field
}
```

---

### Error 2: Date Casting Incomplete
**Location**: `app/backend/crates/api/src/routes/sync.rs:436`  
**Error**: `operator does not exist: date = text`

**Problem**:
```rust
// WRONG - missing ::date cast
WHERE hc.habit_id = h.id 
  AND hc.completed_date = $2
```

**Previous fix** on 2026-01-11 added `::date` to lines 324, 165, 259 but **MISSED line 436**.

---

## REQUIRED FIXES

### Fix 1: Update habits.archived → is_active
**File**: `app/backend/crates/api/src/routes/today.rs`  
**Line**: 395

**Change**:
```diff
- WHERE h.user_id = $1 AND h.archived = false
+ WHERE h.user_id = $1 AND h.is_active = true
```

---

### Fix 2: Add Date Cast
**File**: `app/backend/crates/api/src/routes/sync.rs`  
**Line**: 436

**Change**:
```diff
  WHERE hc.habit_id = h.id 
-   AND hc.completed_date = $2
+   AND hc.completed_date = $2::date
```

---

## VALIDATION STEPS

1. **Backend Compilation**:
```bash
cd app/backend
cargo check --bin ignition-api
```
Expected: **0 errors** (warnings acceptable)

2. **Deploy to Fly.io**:
```bash
flyctl deploy --config app/backend/fly.toml
```

3. **Monitor Logs**:
```bash
flyctl logs --app sparkling-pine-5294
```
Expected: **NO more 500 errors** for /today or /sync

4. **Test in Browser**:
- Load https://app.ecent.online/today
- Should see dashboard (not frozen loading)
- Check sync badge updates

---

## POST-DEPLOYMENT CHECKLIST

- [ ] Backend compiles with 0 errors
- [ ] Fly.io deployment successful
- [ ] No 500 errors in logs for 5 minutes
- [ ] /today endpoint returns 200
- [ ] /sync endpoint returns 200
- [ ] User can access dashboard
- [ ] Badge counts display correctly
- [ ] Move this file to `debug_log/2026-01-11_prod_hotfix.md`
- [ ] Update DEBUGGING.md to mark P0-A and P0-B as FIXED

---

## TIMELINE

- **22:32 UTC**: Errors discovered in production logs
- **22:45 UTC**: Discovery completed, fixes identified
- **23:00 UTC** (target): Hotfix deployed
- **23:05 UTC** (target): Validation complete

---

## RELATED DOCUMENTATION

- **Original Schema Fix**: `debug_log/2026-01-11_schema_sync_fixes.md`
- **Active Issues**: `DEBUGGING.md`
- **Solution Selection**: `SOLUTION_SELECTION.md`

---

## LESSONS LEARNED

1. **Grep searches can miss patterns**: `h.archived` didn't match in initial search
2. **Date casting requires complete audit**: We fixed 3 instances but missed the 4th
3. **Schema authority must be enforced**: Need automated schema validation in CI
4. **Table-by-table review needed**: Focused on inbox/daily_plans, missed habits table

---

## PREVENTION (Future)

Add to CI pipeline:
1. Schema validation script (compare schema.json vs queries)
2. Automated grep for all date comparisons (ensure ::date cast)
3. Type checking for all table field references
4. Integration test that hits all endpoints before deploy

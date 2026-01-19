# Test Framework Repair Guide

**Status:** Pre-existing compilation errors (not from Tier 1 code)  
**Effort:** ~2-3 hours to fix  
**Priority:** High (blocks test verification)

---

## 🔍 Issues Identified

### Issue 1: Test Fixtures Type Mismatch
**File:** `crates/api/src/tests/common/fixtures.rs`  
**Line:** 147  
**Error:** `expected Option<String>, found String`

```rust
// WRONG (current):
reason: "test_award".to_string(),

// CORRECT (fix):
reason: Some("test_award".to_string()),
```

**Solution:** Wrap string values with `Some()` for optional fields.

---

### Issue 2: Reference Tests Schema Mismatch
**File:** `crates/api/src/tests/integration/reference_tests.rs`  
**Lines:** 311-317, 321, 369, 379

#### Problem 1: Field name changes
```rust
// WRONG (old schema):
UpdateRegionInput {
    start_time_ms: None,    // ❌ Wrong field name
    end_time_ms: None,      // ❌ Wrong field name
    description: None,      // ❌ Wrong field name
    section_type: None,     // ❌ Wrong field name
    display_order: None,    // ❌ Wrong field name
}

// CORRECT (new schema):
UpdateRegionInput {
    start_time_seconds: None,   // ✅ Correct
    end_time_seconds: None,     // ✅ Correct
    region_type: None,         // ✅ Correct
    notes: None,               // ✅ Correct
    // (display_order removed, loop_count & is_favorite added)
}
```

#### Problem 2: Response structure changed
```rust
// WRONG (old response):
assert_eq!(response.total_pages, 5);

// CORRECT (new response):
let total_pages = (response.total as f64 / response.page_size as f64).ceil() as i32;
assert_eq!(total_pages, 5);
// OR use individual fields:
assert_eq!(response.page, 1);
assert_eq!(response.total, 100);
assert_eq!(response.has_next, true);
```

---

## 🛠️ How to Fix

### Step 1: Fix Fixtures
**File:** `crates/api/src/tests/common/fixtures.rs`

```bash
# Open the file
vim crates/api/src/tests/common/fixtures.rs

# Find line 147:
# reason: "test_award".to_string(),
# 
# Change to:
# reason: Some("test_award".to_string()),
```

### Step 2: Fix Reference Tests
**File:** `crates/api/src/tests/integration/reference_tests.rs`

**Changes needed:**

1. **Lines 311-317:** Update field names
```rust
UpdateRegionInput {
    start_time_seconds: None,    // was start_time_ms
    end_time_seconds: None,      // was end_time_ms
    region_type: None,           // was section_type
    notes: None,                 // was description
    loop_count: None,            // add if missing
    is_favorite: None,           // add if missing
}
```

2. **Line 321:** Update assertion
```rust
// OLD: assert!(input.start_time_ms.is_none());
// NEW: assert!(input.start_time_seconds.is_none());
```

3. **Lines 369 & 379:** Update response assertions
```rust
// OLD: assert_eq!(response.total_pages, 5);
// NEW: 
let total_pages = (response.total as f64 / response.page_size as f64).ceil() as i32;
assert_eq!(total_pages, 5);

// OR check individual fields:
assert_eq!(response.has_next, true); // if more pages exist
```

### Step 3: Verify Other Errors
Review output for additional type mismatches:
```bash
# Look for similar pattern errors
grep -n "has no field" crates/api/src/tests/integration/*.rs
grep -n "expected.*found" crates/api/src/tests/common/*.rs
```

---

## ✅ Verification Steps

### Step 1: Attempt to compile tests
```bash
cd app/backend
cargo test --no-run 2>&1 | head -20
```

Expected: Fewer errors after fixes

### Step 2: Run recovery validator tests
```bash
cargo test --bin ignition-api recovery_validator -- --nocapture
```

Expected: 8 tests pass (✓)

### Step 3: Try full test suite
```bash
cargo test --bin ignition-api 2>&1 | tail -10
```

Expected: Some tests pass, some may still fail from other issues

---

## 📋 Complete Fix Checklist

- [ ] Backup original files
  ```bash
  cp crates/api/src/tests/common/fixtures.rs crates/api/src/tests/common/fixtures.rs.bak
  cp crates/api/src/tests/integration/reference_tests.rs crates/api/src/tests/integration/reference_tests.rs.bak
  ```

- [ ] Fix fixtures.rs (1 change, line 147)
- [ ] Fix reference_tests.rs (5+ changes, lines 311-379)
- [ ] Verify compilation
  ```bash
  cargo test --no-run
  ```

- [ ] Run recovery validator tests
  ```bash
  cargo test recovery_validator
  ```

- [ ] Verify all changes compile
  ```bash
  cargo check
  ```

---

## 🚀 After Fixes Complete

### Run Recovery Validator Tests
```bash
cd app/backend
cargo test services::recovery_validator -- --nocapture --test-threads=1
```

Expected output:
```
running 8 tests

test services::recovery_validator::tests::test_valid_recovery_code_format ... ok
test services::recovery_validator::tests::test_invalid_recovery_code_too_short ... ok
test services::recovery_validator::tests::test_invalid_recovery_code_lowercase ... ok
test services::recovery_validator::tests::test_valid_passphrase_mixed_case ... ok
test services::recovery_validator::tests::test_valid_passphrase_with_numbers ... ok
test services::recovery_validator::tests::test_invalid_passphrase_too_short ... ok
test services::recovery_validator::tests::test_invalid_passphrase_low_entropy ... ok
test services::recovery_validator::tests::test_different_passphrases_check ... ok

test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### Run E2E Tests
```bash
# Start development servers in separate terminals
cd app/frontend && npm run dev &
cd app/backend && cargo run &

# In main terminal
cd /Users/Shared/passion-os-next
npx playwright test tests/vault-recovery.spec.ts
```

Expected: 18 tests pass

---

## 🔄 If Issues Persist

### Check Schema Definitions
```bash
# Look at current schema for UpdateRegionInput
grep -A 10 "struct UpdateRegionInput" crates/api/src/db/models.rs

# Look at current schema for PaginatedResponse
grep -A 10 "struct PaginatedResponse" crates/api/src/shared/http/response.rs
```

### Search for Usage Examples
```bash
# Find how UpdateRegionInput is used elsewhere
grep -r "UpdateRegionInput" crates/api/src --include="*.rs" | head -10

# Find PaginatedResponse usage
grep -r "PaginatedResponse" crates/api/src --include="*.rs" | head -10
```

### Compare with Working Tests
```bash
# Look at tests that might be working
find crates/api/src/tests -name "*test*.rs" -exec grep -l "assert_eq" {} \;

# Compare patterns
diff -u crates/api/src/tests/integration/reference_tests.rs.bak crates/api/src/tests/integration/reference_tests.rs
```

---

## 📊 Expected Changes

| File | Lines | Changes | Effort |
|------|-------|---------|--------|
| fixtures.rs | 147 | 1 wrap with Some() | 5 min |
| reference_tests.rs | 311-379 | Update 5 field names + 3 assertions | 15 min |
| Other tests | TBD | Fix similar patterns | 30 min |
| **Total** | | | **~1 hour** |

---

## 💡 Prevention Tips

1. **Update tests when schema changes** - Keep test fixtures in sync
2. **Use integration tests** - More resilient to field name changes
3. **Document schema changes** - Note breaking changes for tests
4. **Version your test data** - Match test fixtures to schema version
5. **Run tests before committing** - Catch issues early

---

## 🎯 Success Criteria

✅ `cargo test --no-run` completes without errors  
✅ `cargo test recovery_validator` passes all 8 tests  
✅ `cargo check` shows 0 errors  
✅ E2E tests run successfully against live servers  

---

**Estimated Time to Fix:** 1-2 hours  
**Risk Level:** Low (only test files affected)  
**Impact:** Enables full test suite execution  

---

Last Updated: January 18, 2026

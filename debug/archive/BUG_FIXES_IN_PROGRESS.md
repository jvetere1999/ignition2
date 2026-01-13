# Bug Identification & Fixes

**Date**: January 12, 2026  
**Status**: Identifying and fixing bugs

---

## Bugs Found

### BUG #1: Quests API Missing `total` Field in Response

**Location**: `app/backend/crates/api/src/routes/quests.rs`

**Issue**:
- The `list_quests` handler returns `QuestsListWrapper { quests: result.quests }`
- But the wrapper struct is missing the `total` field
- Backend returns `QuestsListResponse { quests, total }` but route handler doesn't include it
- Frontend test expects `{ quests: [...], total: number }`

**Root Cause**: Incomplete response wrapper struct

**Files to Fix**:
1. `app/backend/crates/api/src/routes/quests.rs` (line 49) - Add `total: i64` to struct
2. `app/backend/crates/api/src/routes/quests.rs` (line 71) - Include `total` in response

**Expected Fix**:
```rust
#[derive(Serialize)]
struct QuestsListWrapper {
    quests: Vec<QuestResponse>,
    total: i64,  // ADD THIS
}

// In list_quests handler:
Ok(Json(QuestsListWrapper { 
    quests: result.quests,
    total: result.total,  // ADD THIS
}))
```

---

## Fixing Now...

Will check for similar issues in other API routes (Goals, Habits, etc.)

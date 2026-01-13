# 🔴 DEPLOYMENT BLOCKER: Field Name Mismatch

**Date**: 2026-01-12 21:00 UTC  
**Status**: Phase 2 (DOCUMENT) - Awaiting Decision  
**Action Required**: User Selection

---

## Issue Summary

GitHub Actions deployment failed with TypeScript type error:

```
./src/lib/db/repositories/focusSessions.ts:42:13
Type error: Property 'planned_duration' does not exist on type 'CreateFocusSessionInput'.
```

## Root Cause

**Field Name Mismatch**:
- **Code expects**: `planned_duration` (in focusSessions.ts)
- **Schema defines**: `duration_seconds` (in schema.json)

### Code References
File: [app/frontend/src/lib/db/repositories/focusSessions.ts](app/frontend/src/lib/db/repositories/focusSessions.ts)

| Line | Reference |
|------|-----------|
| 42 | `if (input.planned_duration <= 0)` |
| 52 | `planned_duration: input.planned_duration` |
| 65 | INSERT statement includes `planned_duration` |

### Schema Definition
File: [schema.json#L1372](schema.json#L1372)

```json
"focus_sessions": {
  "fields": {
    "duration_seconds": {
      "type": "INTEGER",
      "nullable": false
    }
  }
}
```

---

## Solution Options

### Option A: Fix Code (Rename to match schema)
**Change**: `planned_duration` → `duration_seconds`  
**Files to modify**: focusSessions.ts  
**Pros**: Schema is authoritative (v2.0.0), cleaner  
**Cons**: Code change required

### Option B: Fix Schema (Rename to match code)
**Change**: `duration_seconds` → `planned_duration`  
**Files to modify**: schema.json, migration  
**Pros**: Code is already correct  
**Cons**: Schema change, requires migration generation

---

## User Decision Required

**Select one option and confirm**:
- **"A"** → Fix code to use `duration_seconds`
- **"B"** → Fix schema to use `planned_duration`

Once selected, Phase 5 (FIX) will proceed with implementation and validation.

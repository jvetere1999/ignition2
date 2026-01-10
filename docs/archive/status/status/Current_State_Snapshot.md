# Current State Snapshot

**Generated:** January 5, 2026
**Generator:** scripts/generate-current-state.ts

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|

---

## Today Logic Modules

| Module | Tests | Count |
|--------|-------|-------|
| momentum | YES | 19 |
| resolveNextAction | YES | 21 |
| safetyNets | YES | 32 |
| softLanding | YES | 27 |
| todayVisibility | YES | 13 |
| **Total** | - | **112** |

---

## Database Status

**Current Version:** 14 (0014_add_performance_indexes)

### Migrations

| Version | Name |
|---------|------|
| 10 | habits_activities_infobase |
| 11 | book_tracker |
| 12 | tos_db_version |
| 13 | add_users_last_activity |
| 14 | add_performance_indexes |

---

## Test Summary

**Total Unit Tests:** 284

---

## Directory Structure

```
src/lib/
  flags/          # Feature flag definitions
  today/          # Today Starter Engine logic
  db/             # D1 repositories
  ui/             # UI contract and components
docs/
  status/         # Current state snapshot
  today/          # Today-related specifications
  ops/            # Operations and migrations
```

---

*Auto-generated. Do not edit manually.*

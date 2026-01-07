"Data migration reconciliation plan - ID mapping, constraints, and validation."

# Data Migration Reconciliation Plan

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Plan for migrating data from D1 to Postgres

---

## Overview

Per **DEC-001=A** (force re-auth), user sessions will not be migrated. However, user data (profiles, progress, achievements, etc.) needs careful migration planning.

---

## Migration Strategy

### Phase 1: Schema Migration (Complete)

All Postgres tables are created with proper types, constraints, and indexes.

### Phase 2: Data Export from D1

Export data from D1 using existing admin backup functionality:
- `GET /api/admin/backup` exports all user data as JSON

### Phase 3: Data Transformation

Transform D1 data to Postgres-compatible format:
- TEXT UUIDs → native UUIDs
- INTEGER booleans → BOOLEAN
- TEXT timestamps → TIMESTAMPTZ
- JSON strings → JSONB

### Phase 4: Data Import to Postgres

Import transformed data using migration scripts.

### Phase 5: Validation

Verify data integrity and completeness.

---

## ID Mapping Strategy

### Approach: Preserve Existing UUIDs

D1 already uses UUID-format strings for most IDs. These can be directly converted to Postgres UUIDs.

```sql
-- Example: D1 TEXT ID → Postgres UUID
SELECT 'abc-123-def'::UUID;  -- Works if valid UUID format
```

### Non-UUID IDs

Some D1 tables may use non-UUID TEXT IDs. For these:

1. Generate new UUIDs
2. Maintain mapping table during migration
3. Update all foreign key references

```sql
-- Temporary mapping table
CREATE TABLE migration_id_map (
    table_name TEXT NOT NULL,
    old_id TEXT NOT NULL,
    new_id UUID NOT NULL,
    PRIMARY KEY (table_name, old_id)
);
```

---

## Table-by-Table Migration Plan

### Users Table

| D1 Column | Postgres Column | Transformation |
|-----------|-----------------|----------------|
| id | id | TEXT → UUID |
| name | name | Direct |
| email | email | Direct |
| emailVerified | email_verified | INTEGER → TIMESTAMPTZ (if 1, use created_at) |
| image | image | Direct |
| role | role | Direct |
| approved | approved | INTEGER → BOOLEAN |
| age_verified | age_verified | INTEGER → BOOLEAN |
| tos_accepted | tos_accepted | INTEGER → BOOLEAN |
| tos_accepted_at | tos_accepted_at | TEXT → TIMESTAMPTZ |
| tos_version | tos_version | Direct |
| last_activity_at | last_activity_at | TEXT → TIMESTAMPTZ |
| created_at | created_at | TEXT → TIMESTAMPTZ |
| updated_at | updated_at | TEXT → TIMESTAMPTZ |

### Accounts Table

| D1 Column | Postgres Column | Transformation |
|-----------|-----------------|----------------|
| id | id | TEXT → UUID |
| userId | user_id | TEXT → UUID (FK) |
| type | type | Direct |
| provider | provider | Direct |
| providerAccountId | provider_account_id | Direct |
| refresh_token | refresh_token | Direct |
| access_token | access_token | Direct |
| expires_at | expires_at | Direct (BIGINT) |
| token_type | token_type | Direct |
| scope | scope | Direct |
| id_token | id_token | Direct |
| session_state | session_state | Direct |

### Sessions Table (NOT MIGRATED)

Per DEC-001=A, all users will be forced to re-authenticate. Session data is NOT migrated.

### User Progress/Wallet

| D1 Column | Postgres Column | Notes |
|-----------|-----------------|-------|
| user_wallet.xp | user_progress.total_xp | Merged |
| user_wallet.level | user_progress.current_level | Merged |
| user_wallet.coins | user_wallet.coins | Separate |
| user_wallet.total_skill_stars | user_progress.total_skill_stars | Merged |

### Gamification Tables

Standard transformations apply:
- TEXT IDs → UUID
- INTEGER booleans → BOOLEAN
- TEXT timestamps → TIMESTAMPTZ
- JSON strings → JSONB

---

## Constraint Handling

### Foreign Key Violations

Postgres enforces foreign keys strictly. Migration must:

1. **Disable FK checks** during import (if possible)
2. **Import in dependency order**:
   - users (first, no FKs)
   - skill_definitions, achievement_definitions (catalog tables)
   - user_skills, user_achievements, user_progress, user_wallet
   - habits, goals
   - habit_logs, goal_milestones
   - etc.
3. **Re-enable FK checks** after import

### Orphan Data

D1 may have orphan records (deleted users, missing parents). Migration must:

1. Log orphan records
2. Skip or handle gracefully
3. Report for manual review

---

## Validation Queries

### Post-Migration Validation

```sql
-- Count comparison
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'user_skills', COUNT(*) FROM user_skills
UNION ALL
SELECT 'user_achievements', COUNT(*) FROM user_achievements
UNION ALL
SELECT 'user_progress', COUNT(*) FROM user_progress
-- ... etc
;

-- FK integrity check
SELECT 'user_skills orphans' as check_name, COUNT(*) 
FROM user_skills us 
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = us.user_id);

-- Unique constraint validation
SELECT 'duplicate user emails' as check_name, COUNT(*) 
FROM (SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1) dup;
```

---

## Rollback Plan

If migration fails:

1. Drop all Postgres tables (down migrations)
2. Keep D1 as source of truth
3. Investigate and fix issues
4. Retry migration

---

## Data Retention/Privacy Considerations

### GDPR/Privacy Compliance

The migration does not change data retention policies. Existing data is preserved exactly as-is in the new database.

### Data Deleted During Migration

- **Sessions**: Deleted intentionally (DEC-001=A)
- **Orphan records**: Logged but not migrated

### Audit Trail

Migration creates audit log entries for:
- Migration start/end
- Per-table record counts
- Any errors or warnings

---

## Migration Script Outline

```bash
#!/bin/bash
# migrate_d1_to_postgres.sh

# 1. Export D1 data
echo "Exporting D1 data..."
curl -X GET https://ignition.ecent.online/api/admin/backup \
  -H "Cookie: session=<admin_session>" \
  > d1_backup.json

# 2. Transform data
echo "Transforming data..."
node scripts/transform_d1_to_postgres.js d1_backup.json pg_import.sql

# 3. Import to Postgres
echo "Importing to Postgres..."
psql $DATABASE_URL -f pg_import.sql

# 4. Validate
echo "Validating..."
psql $DATABASE_URL -f scripts/validate_migration.sql

echo "Migration complete!"
```

---

## Reconciliation Checklist

- [ ] Export D1 data via backup API
- [ ] Transform IDs (TEXT → UUID)
- [ ] Transform booleans (INTEGER → BOOLEAN)
- [ ] Transform timestamps (TEXT → TIMESTAMPTZ)
- [ ] Transform JSON (TEXT → JSONB)
- [ ] Validate FK references
- [ ] Handle orphan records
- [ ] Import in dependency order
- [ ] Validate row counts
- [ ] Validate data integrity
- [ ] Document any data loss

---

## Business Impact Documentation

### docs/buisness/data_migration_impact.md

**Should be created separately** documenting:

1. What data is migrated
2. What data is NOT migrated (sessions)
3. User-facing impacts (force re-login)
4. Timeline and rollback options

---

## References

- [feature_table_migration_notes.md](./feature_table_migration_notes.md) - Schema changes
- [DECISIONS.md](./DECISIONS.md) - DEC-001 (session strategy)
- [d1_usage_inventory.md](./d1_usage_inventory.md) - D1 schema


# Operations: Reset and Migrations

## Overview

This document covers database operations including migrations, resets, seeding, and maintenance for the Ignition D1 database.

## Migration System

### File Structure

```
migrations/
  0001_create_auth_tables.sql
  0002_create_app_tables.sql
  ...
  0020_full_reset_v2.sql      # Complete v2 schema
  0020_seed_data.sql          # Seed data for v2
```

### Applying Migrations (Local)

```bash
# Apply all migrations to local D1
wrangler d1 migrations apply ignition --local

# Apply specific migration
wrangler d1 execute ignition --local --file=migrations/0020_full_reset_v2.sql
```

### Applying Migrations (Remote)

**WARNING:** Remote migrations affect production data.

```bash
# Apply all pending migrations
wrangler d1 migrations apply ignition

# Apply specific migration (use with caution)
wrangler d1 execute ignition --file=migrations/0020_seed_data.sql
```

## Database Reset

### When to Reset

- Major schema changes incompatible with migration
- Development environment cleanup
- Seed data changes

### Local Reset

```bash
# Delete local D1 data
rm -rf .wrangler/state/v3/d1/*

# Recreate with migrations
wrangler d1 migrations apply ignition --local
```

### Remote Reset (DANGEROUS)

**WARNING:** This deletes all production data. Only use when:
- Schema is incompatible with migration
- Data can be recreated from backup
- You have verified backup exists

```bash
# Step 1: Backup current data
curl -X POST https://ignition.ecent.online/api/admin/backup \
  -H "Authorization: Bearer <admin-session>"

# Step 2: Drop all tables (via Cloudflare Dashboard or API)
# Use Cloudflare D1 console to execute:
# DROP TABLE IF EXISTS users CASCADE;
# ... (all tables)

# Step 3: Apply migrations
wrangler d1 migrations apply ignition

# Step 4: Seed data
wrangler d1 execute ignition --file=migrations/0020_seed_data.sql
```

## Seeding

### Seed Data Categories

1. **Auth (required)**
   - No seed data (users created on sign-in)

2. **Achievement Definitions (required)**
   - Inserted via `0020_seed_data.sql`
   - Must exist for gamification to work

3. **Skill Definitions (required)**
   - knowledge, guts, proficiency, charm, kindness

4. **Onboarding Flows (required)**
   - Default onboarding flow and steps

5. **Market Items (optional)**
   - Default reward items

6. **Quests (optional)**
   - Universal quests

### Running Seeds

```bash
# Local
wrangler d1 execute ignition --local --file=migrations/0020_seed_data.sql

# Remote
wrangler d1 execute ignition --file=migrations/0020_seed_data.sql
```

## Backup and Restore

### Creating Backup

```bash
# Via API (requires admin session)
curl -X POST https://ignition.ecent.online/api/admin/backup \
  -H "Cookie: authjs.session-token=<session>" \
  > backup_$(date +%Y%m%d).json
```

### Backup Format

```json
{
  "version": 20,
  "versionName": "V2 Full Reset",
  "exportedAt": "2026-01-05T12:00:00.000Z",
  "tables": {
    "users": [...],
    "accounts": [...],
    "sessions": [...],
    ...
  }
}
```

### Restoring Backup

```bash
# Via API (requires admin session)
curl -X POST https://ignition.ecent.online/api/admin/restore \
  -H "Cookie: authjs.session-token=<session>" \
  -H "Content-Type: application/json" \
  -d @backup_20260105.json
```

### Restore Behavior

1. Validates backup version
2. Migrates data if version < current
3. Truncates target tables
4. Inserts backup data
5. Rebuilds indexes

## Health Checks

### Database Health

```bash
curl https://ignition.ecent.online/api/admin/db-health \
  -H "Cookie: authjs.session-token=<session>"
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "nullEmailUsers": 0,
    "nullNameUsers": 0,
    "orphanedAccounts": 0,
    "orphanedSessions": 0,
    "expiredSessions": 5
  }
}
```

### Cleanup

```bash
# Remove invalid data
curl -X DELETE https://ignition.ecent.online/api/admin/db-health \
  -H "Cookie: authjs.session-token=<session>"
```

## Maintenance Tasks

### Expired Session Cleanup

Sessions expire after 30 days. Run periodically:

```sql
DELETE FROM sessions WHERE expires < datetime('now');
```

### Activity Event Retention

If implementing retention policy:

```sql
-- Delete events older than 1 year
DELETE FROM activity_events 
WHERE created_at < datetime('now', '-1 year');
```

### Points Ledger Archival

For long-term storage, consider archiving:

```sql
-- Archive old ledger entries
INSERT INTO points_ledger_archive 
SELECT * FROM points_ledger 
WHERE created_at < datetime('now', '-6 months');

DELETE FROM points_ledger 
WHERE created_at < datetime('now', '-6 months');
```

## Version Management

### Current Version

Update these when schema changes:
- `src/app/api/admin/backup/route.ts`: `CURRENT_DB_VERSION`
- `src/app/api/admin/restore/route.ts`: `CURRENT_DB_VERSION`

### Version History

| Version | Name | Changes |
|---------|------|---------|
| 1-12 | Legacy | Initial schema |
| 13 | Users Last Activity | Added last_activity_at |
| 14 | Performance Indexes | Added indices |
| 20 | V2 Full Reset | Complete redesign |

### Migration Functions

When restoring older backups:

```typescript
function migrateData(data: BackupData): BackupData {
  let version = data.version;
  
  // V1->V2 migrations
  if (version < 20) {
    // Transform old schema to new
    data.tables.user_wallet = transformLegacyProgress(data.tables.user_progress);
    version = 20;
  }
  
  return { ...data, version };
}
```

## Emergency Procedures

### Database Corruption

1. Stop accepting writes (maintenance mode)
2. Export current state via backup API
3. Restore from last known good backup
4. Re-apply migrations if needed
5. Resume operations

### Failed Migration

1. Check error in Cloudflare dashboard
2. If partial: complete manually or rollback
3. If complete failure: restore backup
4. Fix migration script
5. Retry

### Lost Credentials

If admin access lost:
1. Access Cloudflare dashboard directly
2. Execute queries via D1 console
3. Reset admin user role if needed:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
   ```

## Best Practices

### Before Any Migration

1. Create backup
2. Test on local D1 first
3. Review migration SQL carefully
4. Have rollback plan ready

### Naming Conventions

- Migrations: `NNNN_description.sql` (zero-padded)
- Tables: `snake_case`
- Indexes: `idx_tablename_columnname`
- Foreign keys: Referenced in CREATE TABLE

### Testing Migrations

```bash
# Create fresh local DB
rm -rf .wrangler/state/v3/d1/*

# Apply all migrations
wrangler d1 migrations apply ignition --local

# Run seed
wrangler d1 execute ignition --local --file=migrations/0020_seed_data.sql

# Test app locally
npm run dev
```


"Data migration business impact documentation."

# Data Migration Impact

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Document business/user impacts of D1 to Postgres migration

---

## Executive Summary

The Ignition platform is migrating from Cloudflare D1 (SQLite) to PostgreSQL. This document outlines the user-facing impacts and data handling during the transition.

---

## What's Changing

### Database Platform
- **From:** Cloudflare D1 (SQLite-based, edge database)
- **To:** PostgreSQL (enterprise-grade relational database)

### User Impact: Required Re-Authentication

**Per DEC-001=A**, all users will be required to sign in again after migration.

**Reason:** Session tokens are not migrated to ensure security and avoid session fixation vulnerabilities during platform transition.

**User Experience:**
1. Users visiting after migration will see the sign-in page
2. Existing OAuth accounts (Google, Azure) will work immediately
3. All user data and progress is preserved

---

## What Data Is Preserved

### ✅ Fully Preserved

| Data Type | Notes |
|-----------|-------|
| User profiles | Name, email, preferences |
| XP and levels | Total XP, current level |
| Coins balance | Full balance preserved |
| Achievements | All earned achievements |
| Skills progress | Stars, levels per skill |
| Streaks | Current and longest streaks |
| Focus history | All completed sessions |
| Habits | Definitions and logs |
| Goals | Goals and milestones |
| Quest progress | Progress on all quests |
| Calendar events | All scheduled events |
| Daily plans | All saved plans |
| Market purchases | Purchase history |

### ⚠️ Requires Re-Authentication

| Data Type | Notes |
|-----------|-------|
| Active sessions | Users must sign in again |
| Session cookies | Will be invalidated |

### ❌ Not Preserved

| Data Type | Reason |
|-----------|--------|
| Orphan records | Data without valid user references |
| Invalid JSON | Malformed data in JSON fields |

---

## Timeline

### Pre-Migration
1. Full data backup created
2. Backup verified and tested
3. Users notified (optional)

### During Migration
- **Expected downtime:** < 30 minutes
- **Status page updated**
- **API returns maintenance response**

### Post-Migration
1. All users must re-authenticate
2. All data and progress available
3. Normal operation resumes

---

## Rollback Plan

If critical issues are discovered post-migration:

1. Revert to D1 database
2. Restore from pre-migration backup
3. Investigate and fix issues
4. Schedule new migration window

**Rollback window:** 48 hours post-migration

---

## Data Privacy Compliance

### GDPR/Privacy
- No new data collection
- No third-party data sharing
- Data stays within existing infrastructure

### Data Handling
- All data encrypted in transit (TLS)
- All data encrypted at rest (database encryption)
- No data exported outside Ignition infrastructure

---

## User Communication

### Recommended Messaging

> **Important: Sign-In Required**
>
> We've upgraded our platform infrastructure. Your account and all progress are safe - you just need to sign in again.
>
> If you have any issues, please contact support.

---

## Technical Details

For technical details, see:
- [data_migration_reconciliation_plan.md](../backend/migration/data_migration_reconciliation_plan.md)
- [feature_table_migration_notes.md](../backend/migration/feature_table_migration_notes.md)


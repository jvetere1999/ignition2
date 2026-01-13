# Incremental Migration System Design

**Status**: Design documentation only - NOT IMPLEMENTED  
**Target**: Future implementation after baseline schema stability  
**Purpose**: Enable safe, incremental schema evolution with rollback capability

---

## Architecture Overview

### Core Concepts

1. **Master Schema** - Persistent, versioned copy of the current schema state
2. **Changes Log** - JSON array of all modifications since last stable point
3. **Undo Stack** - Automatic backups of 3 previous schema versions
4. **Migration Generator** - Produces DDL (ALTER/DROP/CREATE) from schema diffs

### File Structure

```
tools/schema-generator/
├── generate_all.py                     # Main generator (existing)
├── generate_update.py                  # NEW: Incremental update tool (no entry point)
├── INCREMENTAL_MIGRATION_DESIGN.md     # This file
├── master_schema/                      # NEW: Persisted schema versions
│   ├── v2.0.0.json                    # Current master (source of truth)
│   ├── v1.9.9.json                    # Backup -1
│   ├── v1.9.8.json                    # Backup -2
│   └── v1.9.7.json                    # Backup -3
├── changes/                            # NEW: Change tracking
│   └── changes.json                    # Array of incremental changes
└── migrations/                         # NEW: Generated migration files
    ├── 0003_add_column_x.sql
    ├── 0004_rename_table_y.sql
    └── changes_applied.log
```

---

## Schema File Format

### master_schema/v2.0.0.json

```json
{
  "version": "2.0.0",
  "timestamp": "2026-01-12T20:00:00Z",
  "parent_version": "1.9.9",
  "tables": {
    "focus_sessions": {
      "fields": { /* ... */ }
    }
  },
  "_metadata": {
    "created_at": "2026-01-12T20:00:00Z",
    "last_migration_applied": "0002_seeds.sql",
    "next_migration_number": 3
  }
}
```

---

## Changes Log Format

### changes/changes.json

```json
{
  "version": "2.0.0",
  "total_changes": 5,
  "undo_depth": 3,
  "changes": [
    {
      "id": "CHG-001",
      "timestamp": "2026-01-12T19:30:00Z",
      "type": "add_column",
      "table": "focus_sessions",
      "details": {
        "column_name": "paused_at",
        "column_type": "TIMESTAMPTZ",
        "nullable": true,
        "after_column": "completed_at"
      },
      "migration_file": "0003_add_paused_at_to_focus_sessions.sql",
      "status": "applied",
      "rollback_available": true
    },
    {
      "id": "CHG-002",
      "timestamp": "2026-01-12T19:45:00Z",
      "type": "rename_column",
      "table": "focus_sessions",
      "details": {
        "old_name": "ended_at",
        "new_name": "completed_at"
      },
      "migration_file": "0004_rename_ended_at_to_completed_at.sql",
      "status": "applied",
      "rollback_available": true
    },
    {
      "id": "CHG-003",
      "timestamp": "2026-01-12T20:00:00Z",
      "type": "add_table",
      "table": "user_interests",
      "details": {
        "fields": ["id", "user_id", "interest_key", "interest_label", "created_at"]
      },
      "migration_file": "0005_create_user_interests_table.sql",
      "status": "pending",
      "rollback_available": false
    }
  ],
  "undoable_changes": ["CHG-001", "CHG-002"]
}
```

---

## Change Types

| Type | DDL | Reversible | Notes |
|------|-----|-----------|-------|
| `add_column` | ALTER TABLE ADD COLUMN | Yes | Always reversible if DROP supported |
| `drop_column` | ALTER TABLE DROP COLUMN | No | Data loss - requires manual verification |
| `rename_column` | ALTER TABLE RENAME COLUMN | Yes | PostgreSQL 9.6+ native support |
| `rename_table` | ALTER TABLE RENAME | Yes | Updates all foreign keys |
| `change_type` | ALTER TABLE ALTER COLUMN | Yes | May require data conversion |
| `add_constraint` | ALTER TABLE ADD CONSTRAINT | Yes | Can validate existing data |
| `drop_constraint` | ALTER TABLE DROP CONSTRAINT | Yes | Relaxes validation |
| `add_default` | ALTER TABLE ALTER COLUMN SET DEFAULT | Yes | Applies to new rows only |
| `add_table` | CREATE TABLE | Yes | Only if no data inserted |
| `drop_table` | DROP TABLE | No | Data loss - manual verification required |
| `add_index` | CREATE INDEX | Yes | Performance only, fully reversible |

---

## generate_update.py Specification

### Purpose

Takes a modified schema.json and generates:
1. Incremental SQL migration (0003_*.sql)
2. Updates master_schema/v2.0.0.json
3. Rotates backups (v1.9.9 → v1.9.8, v1.9.8 → v1.9.7, etc.)
4. Records changes in changes/changes.json
5. Updates app/backend/migrations/0001_schema.sql (full rebuild)
6. Updates Rust and TypeScript generated code

### Function Signature (No Entry Point)

```python
def generate_incremental_update(
    new_schema_path: Path,
    master_schema_dir: Path,
    changes_log_path: Path,
    migrations_dir: Path
) -> dict[str, Any]:
    """
    Generate incremental migrations from schema diff.
    
    Args:
        new_schema_path: Path to modified schema.json
        master_schema_dir: Path to master_schema/ directory
        changes_log_path: Path to changes/changes.json
        migrations_dir: Path to app/backend/migrations/
    
    Returns:
        {
            "status": "success" | "error",
            "migration_number": 3,
            "migration_file": "0003_add_columns.sql",
            "changes_count": 5,
            "undoable_changes": ["CHG-001", "CHG-002"],
            "next_rollback_target": "v1.9.9",
            "warnings": [],
            "errors": []
        }
    """
```

### Internal Workflow

```
1. Load master_schema/v2.0.0.json (current truth)
2. Load new_schema.json (proposed changes)
3. Diff schemas:
   a. Compare tables (added, removed, renamed)
   b. Compare fields per table (added, removed, renamed, type changed)
   c. Compare constraints, defaults, indexes
4. Generate change objects for each diff
5. Validate change sequence (dependencies, reversibility)
6. Generate SQL migration statements
7. Test migration reversibility (for undoable changes)
8. Create migration file (0003_*.sql)
9. Rotate backups:
   - v1.9.9 → archive/v1.9.7.json (delete)
   - v1.9.8 → v1.9.9
   - v1.9.7 → v1.9.8
10. Write new master_schema/v2.0.0.json
11. Append to changes/changes.json
12. Update _metadata.next_migration_number
13. Regenerate full schema (0001_schema.sql)
14. Regenerate Rust and TypeScript types
15. Return status object
```

---

## Rollback Workflow (Future)

```python
def rollback_to_version(target_version: str) -> dict[str, Any]:
    """
    Revert to a previous schema version.
    
    Restores:
    - master_schema files
    - Generates UNDO migrations
    - Reverts generated code
    """
```

---

## Safety Constraints

1. **Depth Limit**: Only 3 versions retained (others archived)
2. **Reversibility Check**: Warn on non-reversible changes
3. **Data Loss Detection**: Flag DROP operations
4. **Dependency Validation**: Ensure foreign keys exist before referencing
5. **Migration Uniqueness**: Each migration has unique ID (v2.0.0 + timestamp)
6. **Version Alignment**: Generated code matches schema version

---

## Validation Checklist (Before Generate Update Runs)

- [ ] New schema version number > current version
- [ ] All tables have primary keys
- [ ] All foreign keys reference valid tables
- [ ] No circular dependencies
- [ ] All columns have explicit types
- [ ] Default values are valid for their types
- [ ] No column name collisions after renames
- [ ] At least one migration number available

---

## Integration Points (Not Yet Implemented)

1. **CI/CD Pipeline**: Before deployment
   ```yaml
   - name: Generate incremental migration
     run: python tools/schema-generator/generate_update.py
   ```

2. **Pre-commit Hook**: Validate changes before commit
   ```bash
   generate_update --validate --no-generate
   ```

3. **Manual Trigger**: Team initiates when schema stable
   ```bash
   python tools/schema-generator/generate_update.py \
     --schema schema.json \
     --changes changes/changes.json \
     --migrations app/backend/migrations/
   ```

---

## Data Loss Prevention

### Non-Reversible Operations

Changes marked as non-reversible require explicit approval:

```json
{
  "type": "drop_column",
  "requires_approval": true,
  "approval_message": "Dropping 'ended_at' column - 8 rows will lose data",
  "previous_value_count": 8
}
```

---

## Example Workflow

### Scenario: Add new column to focus_sessions

1. User modifies `schema.json`:
   ```json
   {
     "focus_sessions": {
       "fields": {
         "paused_remaining_seconds": {
           "type": "INTEGER",
           "nullable": true
         }
       }
     }
   }
   ```

2. Call `generate_incremental_update()`
3. System generates:
   ```sql
   -- 0003_add_paused_remaining_seconds.sql
   ALTER TABLE focus_sessions 
   ADD COLUMN paused_remaining_seconds INTEGER;
   ```

4. Updates:
   - `master_schema/v2.0.0.json` (new version)
   - `changes/changes.json` (new change entry)
   - Backups rotated (old v1.9.9 archived)
   - `app/backend/migrations/0001_schema.sql` (full rebuild)

5. Returns status: "success", migration_number: 3

---

## Future Enhancements

- [ ] Automatic data migration helpers (e.g., backfill defaults)
- [ ] Schema linting (naming conventions, best practices)
- [ ] Change approval workflow (Git-based)
- [ ] Time-series schema snapshots
- [ ] Performance impact analysis
- [ ] Migration replay/verification tests

---

## Notes for Implementation

- Use `sqlalchemy` or `alembic` patterns for migration generation
- Store changes in Git to track who modified schema and when
- Consider UUID for change IDs (uniqueness across time)
- Log all operations to `migrations/changes_applied.log`
- Test migrations locally before storing in master_schema

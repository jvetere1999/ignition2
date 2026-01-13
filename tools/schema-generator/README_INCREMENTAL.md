# Incremental Migration System (INACTIVE)

**Status**: Library implementation ready - not yet integrated into workflows  
**Last Updated**: 2026-01-12  
**Integration**: Manual (future automation)

---

## What's Here

- `master_schema/v2.0.0.json` - Baseline snapshot of current schema
- `changes/changes.json` - Log of schema changes (currently empty)
- `generate_update.py` - Pure library functions for diff + migration generation

## Safety

This system is **completely non-intrusive**:

✅ No changes to existing code  
✅ No modifications to current workflow  
✅ No entry points (library only)  
✅ `generate_all.py` still works as before  

## When to Use (Future)

Once schema is stable, you can manually call:

```python
from generate_update import generate_incremental_update
from pathlib import Path

result = generate_incremental_update(
    new_schema_path=Path("schema.json"),
    master_schema_dir=Path("tools/schema-generator/master_schema"),
    changes_log_path=Path("tools/schema-generator/changes/changes.json"),
    migrations_output_dir=Path("app/backend/migrations")
)

print(result)
```

## Migration Files Generated

When activated, migrations will be created at:
```
app/backend/migrations/0003_incremental_update.sql
app/backend/migrations/0004_incremental_update.sql
...
```

## Undo Stack

Automatically maintains last 3 schema versions:
- `master_schema/v2.0.0.json` - Current
- `master_schema/v1.9.9.json` - Backup -1
- `master_schema/v1.9.8.json` - Backup -2
- `master_schema/v1.9.7.json` - Backup -3 (oldest, then archived)

## Next Steps

- Keep `master_schema/` and `changes/` in Git to track schema history
- When ready, wire `generate_update()` into a CLI or webhook
- See `INCREMENTAL_MIGRATION_DESIGN.md` for full specification

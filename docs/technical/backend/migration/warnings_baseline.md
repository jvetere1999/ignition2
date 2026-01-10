"Warnings baseline for no-regression policy. Update after each validation."

# Warnings Baseline

**Created:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Fixed baseline for warning count - warnings must never increase

---

## Current Baseline

| Metric | Value |
|--------|-------|
| **Baseline Count** | 44 |
| **Established Date** | January 6, 2026 |
| **Command Used** | `npm run lint` |
| **Log File** | `.tmp/validation_lint.log` |
| **Reference Doc** | `validation_01.md` |

---

## Baseline Details

### By Category

| Category | Count | Rule |
|----------|-------|------|
| Unused variables (`_prefix`) | 31 | `@typescript-eslint/no-unused-vars` |
| `<img>` instead of `<Image>` | 5 | `@next/next/no-img-element` |
| React Hook dependencies | 2 | `react-hooks/exhaustive-deps` |
| dangerouslySetInnerHTML | 2 | `react/no-danger` |
| Deprecation notice (next lint) | 1 | N/A |
| **Total** | **44** | - |

### By File

See `exceptions.md` for full file list.

---

## Validation Requirements

Every validation report must include:

```markdown
## Warning Delta Check

| Metric | Value |
|--------|-------|
| Baseline | 44 |
| Current | ??? |
| Delta | ??? |
| New Warnings | ??? |

**Status:** PASS/FAIL

- Delta must be ≤ 0
- New warnings must be 0
- If FAIL, work is blocked until resolved
```

---

## History

| Date | Baseline | Current | Delta | Validated By |
|------|----------|---------|-------|--------------|
| January 6, 2026 | 44 | 44 | 0 | validation_baseline.md |

---

## Rules (from copilot-instructions.md)

1. Pre-existing warnings allowed **only as fixed baseline**
2. Warnings must **never increase**
3. New/edited files must be **warning-free**
4. Delta > 0 = **validation fails**

---

## References

- [existing_warnings.md](./existing_warnings.md) - Full warning list with exact text
- [validation_baseline.md](./validation_baseline.md) - Baseline validation results
- [exceptions.md](./exceptions.md) - Exception details for EXC-001
- [DECISIONS.md](./DECISIONS.md) - DEC-003 = C (post-migration fix)


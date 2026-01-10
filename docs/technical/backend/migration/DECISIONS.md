"Owner Decision Record: Fill in CHOSEN field for each decision. This is the single source of truth."

# Migration Decisions

**Created:** January 6, 2026  
**Updated:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Owner-fillable decision record - single source of truth for chosen options

---

## How to Use This File

1. Review each decision in [DECISIONS_REGISTER.md](./DECISIONS_REGISTER.md) for full context
2. Fill in the **CHOSEN** field below with your selected option (A, B, C, or Other)
3. Add any notes or conditions in the **Notes** field
4. Sign with your name and date
5. Save the file - blocked actions will be unblocked

---

## Decision Record

### DEC-001: Session Migration Strategy

| Field | Value |
|-------|-------|
| **Decision** | How to handle existing user sessions during migration |
| **Options** | A: Force re-auth, B: Token migration, C: Dual-read grace period |
| **Default** | A (Force re-auth) |
| **CHOSEN** | **A** |
| **Notes** | Force re-auth; D1 unseeded data may be deleted at cutover. |
| **Decided By** | Owner |
| **Date** | January 6, 2026 |

**Unblocks:** ACTION-007, UNKNOWN-001, auth middleware implementation

---

### DEC-002: CSRF Protection Mechanism

| Field | Value |
|-------|-------|
| **Decision** | Which CSRF protection pattern to use with SameSite=None |
| **Options** | A: Origin verification, B: Double-submit cookie, C: Synchronizer token |
| **Default** | A (Origin verification) |
| **CHOSEN** | **A** |
| **Notes** | CSRF = strict Origin/Referer allowlist; reject state-changing requests missing Origin/Referer; only allow ignition/admin origins. |
| **Decided By** | Owner |
| **Date** | January 6, 2026 |

**Unblocks:** ACTION-006, auth middleware implementation

---

### DEC-003: Lint Warning Resolution Timing

| Field | Value |
|-------|-------|
| **Decision** | When to fix 44 pre-existing lint warnings |
| **Options** | A: Fix now, B: Fix during migration, C: Fix post-migration |
| **Default** | B (Fix during migration) |
| **CHOSEN** | **C** |
| **Notes** | Lint warnings fixed post-migration; temporary baseline waiver required. See [exceptions.md](./exceptions.md). |
| **Decided By** | Owner |
| **Date** | January 6, 2026 |

**Unblocks:** ACTION-028, UNKNOWN-016

---

### DEC-004: Admin Authorization Strategy

| Field          | Value                                                                |
|----------------|----------------------------------------------------------------------|
| **Decision**   | How to implement admin authorization in backend                      |
| **Options**    | A: Keep env var, B: Database-backed roles, C: Full RBAC              |
| **Default**    | B (Database-backed roles)                                            |
| **CHOSEN**     | **B**                                                                |
| **Notes**      | Admin authorization = DB-backed roles (user-borne gating persisted). |
| **Decided By** | Owner                                                                |
| **Date**       | January 6, 2026                                                      |

**Unblocks:** RISK-008 mitigation, user schema design

---

## Quick Reference

| DEC-ID  | Decision          | Default | Urgency | Chosen |
|---------|-------------------|---------|---------|--------|
| DEC-001 | Session migration | A       | High    | **A**  |
| DEC-002 | CSRF protection   | A       | High    | **A**  |
| DEC-003 | Lint timing       | B       | Low     | **C**  |
| DEC-004 | Admin auth        | B       | Medium  | **B**  |

---

## Decision History

| DEC-ID  | Chosen | Date            | Decided By |
|---------|--------|-----------------|------------|
| DEC-001 | A      | January 6, 2026 | Owner      |
| DEC-002 | A      | January 6, 2026 | Owner      |
| DEC-003 | C      | January 6, 2026 | Owner      |
| DEC-004 | B      | January 6, 2026 | Owner      |

---

## Notes

- If you choose "Other", please describe the alternative in the Notes field
- Defaults are applied only if explicitly approved or if no response after deadline
- All decisions are reversible but may require rework
- See [DECISIONS_REGISTER.md](./DECISIONS_REGISTER.md) for full context and trade-offs


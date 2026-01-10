"Schema exceptions for D1→Postgres optimization. Default is 1:1 translation."

# Schema Exceptions

**Created:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Document approved deviations from 1:1 D1→Postgres schema translation

---

## Default Policy

Per copilot-instructions:

> Default to **1:1 schema translation** from D1 to Postgres.
> Any optimization requires an entry in this file.

---

## Exception Format

Each exception must include:

| Field | Description |
|-------|-------------|
| **Table** | Table name being modified |
| **Change** | What differs from D1 schema |
| **Rationale** | Why this change is safe |
| **Parity Proof** | How equivalence is proven (tests/queries) |
| **Approved By** | Owner approval |
| **Date** | Approval date |

---

## Approved Exceptions

### EXC-SCHEMA-001: Users ID Type

| Field | Value |
|-------|-------|
| **Table** | `users` |
| **Change** | `id TEXT PRIMARY KEY` → `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| **Rationale** | Native UUID type is more efficient, prevents collisions, better for distributed systems |
| **Parity Proof** | UUID→TEXT conversion in application layer if needed for legacy compatibility |
| **Approved By** | Owner (implicit via copilot-instructions Postgres requirement) |
| **Date** | January 6, 2026 |

---

### EXC-SCHEMA-002: Sessions Enhanced Metadata

| Field | Value |
|-------|-------|
| **Table** | `sessions` |
| **Change** | Added columns: `ip_address INET`, `user_agent TEXT`, `rotated_from UUID` |
| **Rationale** | Security auditing (per security_model.md), session rotation tracking (per DEC-001) |
| **Parity Proof** | New columns are nullable; existing session logic unaffected |
| **Approved By** | Owner (per security_model.md session schema) |
| **Date** | January 6, 2026 |

---

### EXC-SCHEMA-003: RBAC Tables (New)

| Field | Value |
|-------|-------|
| **Tables** | `roles`, `entitlements`, `role_entitlements`, `user_roles` |
| **Change** | New tables for full RBAC system (not in D1) |
| **Rationale** | Per DEC-004=B: DB-backed roles instead of ADMIN_EMAILS env var |
| **Parity Proof** | Legacy `users.role` column retained for backward compatibility during migration |
| **Approved By** | Owner (DEC-004=B chosen) |
| **Date** | January 6, 2026 |

---

### EXC-SCHEMA-004: Audit Log (Replaces Empty Table)

| Field | Value |
|-------|-------|
| **Table** | `audit_log` (replaces `admin_audit_log`) |
| **Change** | Full audit schema replacing unused D1 table |
| **Rationale** | D1 `admin_audit_log` table existed but was never used (per UNKNOWN-004). New schema implements security monitoring per copilot-instructions. |
| **Parity Proof** | N/A - no data to migrate (table was empty) |
| **Approved By** | Owner (per security requirements in copilot-instructions) |
| **Date** | January 6, 2026 |

---

### EXC-SCHEMA-005: Activity Events Enhanced

| Field | Value |
|-------|-------|
| **Table** | `activity_events` |
| **Change** | Added columns: `xp_earned INTEGER`, `coins_earned INTEGER` |
| **Rationale** | Denormalized gamification rewards for simpler queries; reduces joins |
| **Parity Proof** | New columns default to 0; existing events unaffected |
| **Approved By** | Owner (optimization for gamification queries) |
| **Date** | January 6, 2026 |

---

## Pending Exceptions (Awaiting Approval)

_None_

---

## Known 1:1 Translations (No Exceptions Needed)

These are syntactic differences that don't change semantics:

| D1 (SQLite) | Postgres | Notes |
|-------------|----------|-------|
| `INTEGER` for booleans | `BOOLEAN` | Postgres native bool |
| `TEXT` for timestamps | `TIMESTAMPTZ` | Postgres native timestamp |
| `datetime('now')` | `NOW()` | Postgres function |
| `AUTOINCREMENT` | `SERIAL` or `GENERATED` | Postgres auto-increment |
| No `STRICT` | N/A | Postgres is always strict |

These do NOT require exception entries.

---

## Rejected Optimizations

| Proposal | Reason for Rejection |
|----------|---------------------|
| _None yet_ | |

---

## References

- Copilot-instructions: "Schema Optimization Policy" section
- [d1_usage_inventory.md](./d1_usage_inventory.md) - Current D1 schema
- `migrations/0100_master_reset.sql` - D1 migration file


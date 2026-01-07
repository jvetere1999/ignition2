"Decision Register: Numbered list of all decisions with context. Do not modify - use DECISIONS.md for owner choices."

# Migration Decisions Register

**Created:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Complete register of decisions required for migration

---

## Summary

| DEC-ID | Category | Urgency | Blocking | Status |
|--------|----------|---------|----------|--------|
| DEC-001 | Auth | High | Yes | Pending |
| DEC-002 | Security | High | Yes | Pending |
| DEC-003 | Code Quality | Low | No | Pending |
| DEC-004 | Auth/RBAC | Medium | No | Pending |

---

## DEC-001: Session Migration Strategy

### Decision Statement

How should existing user sessions be handled during the migration from Auth.js/D1 to the Rust backend?

### Why It Matters

- All active users have session cookies tied to the current NextAuth format
- The new Rust backend will use a different session token format
- This decision affects user experience (forced re-login vs seamless)
- This decision affects implementation complexity (simple vs complex)
- This decision affects security posture (clean break vs compatibility risks)

### Options

| Option | ID | Description |
|--------|-----|-------------|
| Force re-authentication | A | All users must sign in again after migration |
| Token migration | B | Write migration script to convert session tokens |
| Dual-read grace period | C | Backend reads both old and new formats temporarily |

### Trade-offs

| Option | Effort | UX Impact | Security | Complexity |
|--------|--------|-----------|----------|------------|
| A | Low | One-time inconvenience | Clean break | Simple |
| B | High | Seamless | Token format compatibility risks | Complex |
| C | Medium | Gradual transition | Potential gaps during grace period | Medium |

### Recommended Default

**Option A: Force re-authentication** (if owner provides no input)

Rationale:
- Aligns with copilot-instructions: "No back-compat and no public API guarantees"
- Creates clean security boundary
- Minimizes implementation risk
- Can schedule cutover during low-traffic window

### What It Blocks

| Blocked Item | Type | Why |
|--------------|------|-----|
| ACTION-007 | gaps.md | Cannot design session implementation without knowing strategy |
| UNKNOWN-001 | UNKNOWN.md | Decision resolves this unknown |
| Auth middleware implementation | Next prompt | Cannot implement until strategy chosen |
| Cookie configuration | Next prompt | Session format affects cookie structure |

### References

- UNKNOWN-001 in UNKNOWN.md
- ACTION-007 in gaps.md
- RISK-001 in risk_register.md
- LATER-006 in LATER.md

---

## DEC-002: CSRF Protection Mechanism

### Decision Statement

Which CSRF protection pattern should be used to secure the API with `SameSite=None` cookies?

### Why It Matters

- Copilot-instructions mandate: `SameSite=None; Secure; HttpOnly`
- `SameSite=None` removes browser's built-in CSRF protection
- Without explicit CSRF protection, state-changing requests are vulnerable
- Current Auth.js provides CSRF automatically; Rust backend must implement manually
- This is a security-critical decision

### Options

| Option | ID | Description |
|--------|-----|-------------|
| Origin header verification | A | Verify Origin/Referer headers match allowed domains |
| Double-submit cookie | B | CSRF token in both cookie and request header |
| Synchronizer token | C | Server-generated token stored in session |

### Trade-offs

| Option | Complexity | State Required | Browser Dependency |
|--------|------------|----------------|-------------------|
| A | Low | None | Relies on browser sending Origin header |
| B | Medium | None (stateless) | Extra cookie overhead |
| C | High | Session storage | Most robust, but complex |

### Recommended Default

**Option A: Origin header verification** (if owner provides no input)

Rationale:
- API-only backend (no HTML form submissions)
- All requests come from known frontend origins
- Combined with strict CORS provides strong protection
- Simplest implementation for Tower middleware

### What It Blocks

| Blocked Item | Type | Why |
|--------------|------|-----|
| ACTION-006 | gaps.md | Cannot design CSRF middleware without knowing pattern |
| Auth middleware implementation | Next prompt | CSRF is part of security middleware |
| Cookie configuration | Next prompt | Some patterns require additional cookies |

### References

- ACTION-006 in gaps.md
- RISK-005 in risk_register.md
- LATER-007 in LATER.md
- Copilot-instructions: Security Model section

---

## DEC-003: Lint Warning Resolution Timing

### Decision Statement

When should the 44 pre-existing lint warnings be fixed?

### Why It Matters

- Copilot-instructions mandate: "Zero errors and zero warnings"
- Currently 44 warnings exist (all in frontend code)
- Fixing now delays migration start
- Fixing later may violate zero-warning policy
- Warnings are not blocking any builds or tests

### Options

| Option | ID | Description |
|--------|-----|-------------|
| Fix now | A | Fix all 44 warnings before any migration work |
| Fix during migration | B | Fix warnings in each file as it's touched during migration |
| Fix post-migration | C | Batch fix after stack split is complete |

### Trade-offs

| Option | Delay | Efficiency | Risk |
|--------|-------|------------|------|
| A | 2-4 hours now | Low (context switching) | None |
| B | None | High (already in file) | Some files may be missed |
| C | None initially | Medium (batch) | Delays zero-warning goal |

### Recommended Default

**Option B: Fix during migration** (if owner provides no input)

Rationale:
- Most efficient - fix while already modifying files
- No delay to backend work
- Natural enforcement through PR reviews
- Aligns with "Minimal Hand-Coding Principle"

### What It Blocks

| Blocked Item | Type | Why |
|--------------|------|-----|
| ACTION-028 | gaps.md | Cannot proceed without timing decision |
| UNKNOWN-016 | UNKNOWN.md | Decision resolves this unknown |

**Note:** This decision is non-blocking. Migration can proceed regardless of choice.

### References

- UNKNOWN-016 in UNKNOWN.md
- ACTION-028 in gaps.md
- validation_01.md (full warning list)

---

## DEC-004: Admin Authorization Strategy

### Decision Statement

How should admin authorization be implemented in the new backend?

### Why It Matters

- Current implementation uses `ADMIN_EMAILS` env var with email whitelist
- Target requires proper RBAC per copilot-instructions
- Need to decide whether to migrate simple approach or implement full RBAC
- Affects database schema (roles table vs env var)
- Affects admin console access control

### Options

| Option | ID | Description |
|--------|-----|-------------|
| Keep env var approach | A | Continue using `ADMIN_EMAILS` env var in backend |
| Database-backed roles | B | Store roles/permissions in users table or separate roles table |
| Full RBAC system | C | Implement roles + permissions + entitlements model |

### Trade-offs

| Option | Effort | Flexibility | Copilot Alignment |
|--------|--------|-------------|-------------------|
| A | Low | Low (requires redeploy to change) | Partial |
| B | Medium | Medium (can change in DB) | Good |
| C | High | High (full access control) | Best |

### Recommended Default

**Option B: Database-backed roles** (if owner provides no input)

Rationale:
- Copilot-instructions mention "RBAC: user-borne gating stored locally (roles/entitlements model)"
- Option B satisfies this without full complexity of Option C
- Can evolve to Option C later if needed
- Removes env var dependency for authorization

### What It Blocks

| Blocked Item | Type | Why |
|--------------|------|-----|
| RISK-008 | risk_register.md | Mitigates this risk |
| User schema design | Next prompt | Need to know if roles column/table needed |
| Admin console implementation | Future phase | Access control depends on this |

**Note:** This decision is not urgent. Can be deferred until user schema migration.

### References

- RISK-008 in risk_register.md
- Copilot-instructions: Security Model section
- LATER-006 references similar concerns

---

## Decision Register Maintenance

When adding new decisions:

1. Assign next `DEC-XXX` number
2. Include all sections: Statement, Why It Matters, Options, Trade-offs, Recommended Default, What It Blocks
3. Add to Summary table
4. Update DECISIONS.md with matching entry
5. Link from relevant UNKNOWN.md, gaps.md entries

---

## References

- [DECISIONS.md](./DECISIONS.md) - Owner-fillable decision record
- [DECISIONS_REQUIRED.md](./DECISIONS_REQUIRED.md) - Legacy format (superseded by this register)
- [UNKNOWN.md](./UNKNOWN.md) - Related unknowns
- [gaps.md](./gaps.md) - Blocked actions
- [risk_register.md](./risk_register.md) - Related risks


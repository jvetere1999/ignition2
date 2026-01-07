"Decisions that cannot be inferred from code. Requires owner input before proceeding."

# Decisions Required

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Document decisions that require owner/lead input

---

## Summary

| Decision | Category | Urgency | Blocking |
|----------|----------|---------|----------|
| DECISION-001 | Auth | High | Yes - auth design |
| DECISION-002 | Security | High | Yes - auth design |
| DECISION-003 | Code Quality | Low | No |

---

## DECISION-001: Session Migration Strategy {#decision-001}

### Context

Current state:
- Auth.js v5 stores sessions in D1 `sessions` table
- Session tokens are in NextAuth format
- Active users have valid session cookies

Target state:
- Rust backend with custom session management
- Sessions stored in PostgreSQL
- New session token format

### Options

| Option | Effort | UX Impact | Security |
|--------|--------|-----------|----------|
| **A: Force re-auth** | Low | All users must sign in again | Clean break, new security boundary |
| **B: Token migration** | High | Seamless for users | Token format compatibility risks |
| **C: Dual-read grace period** | Medium | Gradual transition | Complexity, potential gaps |

### Recommendation

**Option A: Force re-authentication**

Rationale:
- Clean security boundary for new backend
- No legacy token format compatibility concerns
- Simpler implementation
- One-time inconvenience vs ongoing complexity
- Cutover during low-traffic window minimizes impact

### Decision Needed

- [ ] Approved: Force re-auth (Option A)
- [ ] Approved: Token migration (Option B)
- [ ] Approved: Dual-read (Option C)
- [ ] Other: _______________

**Decision By:** Product/Engineering Lead  
**Deadline:** Before auth implementation begins

---

## DECISION-002: CSRF Protection Mechanism {#decision-002}

### Context

Per copilot-instructions:
- Cookies must use `SameSite=None; Secure; HttpOnly`
- `SameSite=None` requires explicit CSRF protection
- Current Auth.js uses built-in CSRF (won't be available in Rust)

### Options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Origin header verification** | Verify Origin/Referer headers match allowed domains | Simple, no tokens | Relies on browser headers |
| **B: Double-submit cookie** | CSRF token in cookie + request header | Stateless | Extra cookie overhead |
| **C: Synchronizer token** | Server-generated token in session + form | Standard pattern | Stateful, storage overhead |

### Recommendation

**Option A: Origin header verification**

Rationale:
- API-only backend (no form submissions)
- All state-changing requests come from known frontend origin
- Simpler than token management
- Combined with strict CORS provides strong protection

Implementation:
```rust
// Pseudo-code for Tower middleware
fn verify_origin(request: &Request) -> bool {
    let origin = request.headers().get("Origin");
    let allowed = ["https://ignition.ecent.online", "https://admin.ignition.ecent.online"];
    allowed.contains(&origin)
}
```

### Decision Needed

- [ ] Approved: Origin verification (Option A)
- [ ] Approved: Double-submit cookie (Option B)
- [ ] Approved: Synchronizer token (Option C)
- [ ] Other: _______________

**Decision By:** Security/Engineering Lead  
**Deadline:** Before auth middleware implementation

---

## DECISION-003: Lint Warning Resolution Timing {#decision-003}

### Context

Per copilot-instructions:
- "Zero errors and zero warnings for typecheck, lint, unit tests, e2e tests, builds"

Current state:
- 44 pre-existing lint warnings
- All are in frontend code (will move to `app/frontend/`)
- None block builds or tests

### Options

| Option | When | Effort | Risk |
|--------|------|--------|------|
| **A: Fix now** | Before migration | ~2-4 hours | Delays migration start |
| **B: Fix during migration** | As files are touched | Incremental | Some files may be missed |
| **C: Fix post-migration** | After stack split complete | Batch | Delays zero-warning goal |

### Recommendation

**Option B: Fix during frontend migration**

Rationale:
- Most efficient - fixes applied while file is already being modified
- Ensures all touched files meet standard
- Doesn't delay backend work
- Natural enforcement via PR reviews

### Decision Needed

- [ ] Approved: Fix now (Option A)
- [ ] Approved: Fix during migration (Option B)
- [ ] Approved: Fix post-migration (Option C)

**Decision By:** Engineering Lead  
**Deadline:** Flexible - not blocking

---

## Decision Log

| Decision | Date | Outcome | Decided By |
|----------|------|---------|------------|
| DECISION-001 | Pending | - | - |
| DECISION-002 | Pending | - | - |
| DECISION-003 | Pending | - | - |

---

## References

- [LATER.md](./LATER.md) - Items blocked by these decisions
- [auth_inventory.md](./auth_inventory.md) - Current auth implementation
- [validation_01.md](./validation_01.md) - Lint warning details


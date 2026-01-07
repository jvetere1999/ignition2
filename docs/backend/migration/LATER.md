"Items requiring external access, provisioning, or owner decisions. Cannot be resolved via repo."

# Deferred Items - LATER

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Items requiring external console access or owner decisions

---

## Summary

| Category | Count | Blocking | Status |
|----------|-------|----------|--------|
| External Console/Provisioning | 5 | Yes | Pending |
| Owner Decision Required | 0 | - | ✅ All Resolved |
| Deployment/DNS/TLS | 3 | Partially | Pending |
| **Total Active** | **8** | - | - |

---

## External Console/Provisioning

### LATER-001: PostgreSQL Database Provisioning

| Field | Value |
|-------|-------|
| **Source** | UNKNOWN-007, ACTION-001 |
| **Requires** | Cloud provider console access |
| **Options** | Azure Database for PostgreSQL, Supabase, Neon, self-hosted |
| **Deliverable** | Connection string, credentials stored in Key Vault |
| **Blocking** | Yes - blocks ALL backend work |
| **Owner** | Infrastructure owner |

---

### LATER-002: Azure Key Vault Setup

| Field | Value |
|-------|-------|
| **Source** | UNKNOWN-006, ACTION-002 |
| **Requires** | Azure subscription, portal access |
| **Steps** | 1) Create Key Vault, 2) Create service principal, 3) Configure access policies |
| **Deliverable** | Key Vault URL + service principal credentials |
| **Blocking** | Yes - blocks secret management |
| **Owner** | Infrastructure owner |

---

### LATER-003: R2 S3 API Credentials

| Field | Value |
|-------|-------|
| **Source** | UNKNOWN-005, ACTION-003 |
| **Requires** | Cloudflare dashboard access |
| **Steps** | R2 → Manage R2 API Tokens → Create token with read/write |
| **Deliverable** | Access Key ID + Secret Access Key |
| **Blocking** | Yes - blocks R2 integration in backend |
| **Owner** | Cloudflare account owner |

---

### LATER-004: OAuth Redirect URI Configuration

| Field | Value |
|-------|-------|
| **Source** | UNKNOWN-002, ACTION-005 |
| **Requires** | Google Cloud Console + Azure Portal access |
| **Steps** | 1) Document current URIs, 2) Add `https://api.ecent.online/auth/callback/*` |
| **Deliverable** | Updated OAuth app configurations |
| **Blocking** | Yes - blocks OAuth testing |
| **Owner** | OAuth app owner |

---

### LATER-005: Container Platform Provisioning

| Field | Value |
|-------|-------|
| **Source** | UNKNOWN-008, ACTION-008 |
| **Requires** | Cloud provider console access |
| **Options** | Azure Container Apps, Cloud Run, ECS, Kubernetes |
| **Deliverable** | Container registry + deployment target |
| **Blocking** | Partially - can develop locally |
| **Owner** | Infrastructure owner |

---

## Owner Decision Required (ALL RESOLVED)

### LATER-006: Session Migration Strategy ✅ RESOLVED

| Field | Value |
|-------|-------|
| **Source** | UNKNOWN-001, ACTION-007 |
| **Decision** | Migrate existing session tokens OR force all users to re-authenticate |
| **Status** | ✅ **RESOLVED** |
| **Chosen** | DEC-001 = A (Force re-auth) |
| **Notes** | D1 unseeded data may be deleted at cutover |

---

### LATER-007: CSRF Protection Mechanism ✅ RESOLVED

| Field | Value |
|-------|-------|
| **Source** | ACTION-006 |
| **Decision** | Which CSRF protection pattern to use with SameSite=None |
| **Status** | ✅ **RESOLVED** |
| **Chosen** | DEC-002 = A (Origin verification) |
| **Notes** | Strict Origin/Referer allowlist for POST/PUT/PATCH/DELETE |

---

### LATER-008: Lint Warning Timing ✅ RESOLVED

| Field | Value |
|-------|-------|
| **Source** | UNKNOWN-016, ACTION-028 |
| **Decision** | When to fix 44 pre-existing lint warnings |
| **Status** | ✅ **RESOLVED** |
| **Chosen** | DEC-003 = C (Post-migration) |
| **Notes** | Temporary baseline waiver in exceptions.md; warnings must not increase |

---

## Deployment/DNS/TLS

### LATER-009: API Domain Configuration

| Field | Value |
|-------|-------|
| **Source** | ACTION-009 |
| **Requires** | DNS provider access, TLS certificate provisioning |
| **Domain** | `api.ecent.online` |
| **Deliverable** | HTTPS endpoint accessible |
| **Blocking** | Partially - can use localhost for dev |
| **Owner** | Infrastructure owner |

---

### LATER-010: Admin Console Domain Configuration

| Field | Value |
|-------|-------|
| **Source** | ACTION-010 |
| **Requires** | DNS provider access, deployment target |
| **Domain** | `admin.ignition.ecent.online` |
| **Deliverable** | HTTPS endpoint accessible |
| **Blocking** | Partially - can use localhost for dev |
| **Owner** | Infrastructure owner |

---

### LATER-011: Production TLS Certificates

| Field | Value |
|-------|-------|
| **Source** | Infrastructure requirement |
| **Requires** | Certificate authority or automated provisioning |
| **Options** | Let's Encrypt, Azure-managed, Cloudflare |
| **Deliverable** | Valid TLS for api.ecent.online, admin.ignition.ecent.online |
| **Blocking** | No - only for production deploy |
| **Owner** | Infrastructure owner |

---

## Resolution Path

1. **Immediate (Week 1):** LATER-001, LATER-002, LATER-003 - Unblock backend development
2. **Before Auth Work:** LATER-004 - Unblock OAuth testing
3. **Before Deploy:** LATER-005, LATER-009, LATER-010, LATER-011 - Unblock production
4. ✅ **COMPLETE:** LATER-006, LATER-007, LATER-008 - All decisions made

---

## References

- [DECISIONS.md](./DECISIONS.md) - All decisions chosen
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase gating status
- [UNKNOWN.md](./UNKNOWN.md) - Source unknowns
- [gaps.md](./gaps.md) - Source action items


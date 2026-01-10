# Behavioral Documentation

This section tracks system behavior, implementation verifications, architectural audits, and known issues that require ongoing attention.

## Contents

### Core Behavioral Docs
- [Authentication & Cross-Domain Session](./authentication.md) - Session management, cookie domains, OAuth flow
- [Admin System Implementation](./admin-system.md) - Admin role verification, claiming mechanism, access control
- [Architecture Stateless Sync](./architecture-sync.md) - Backend/frontend split validation, state management patterns

### Issue Tracking & Fixes
- [Outstanding Issues & TODOs](./ISSUES_AND_TODOS.md) - Active bugs, deprecated code, and required cleanup tasks
- [Session Rotation Fix](./session-rotation-fix.md) - Session token rotation issue resolution
- [OAuth Redirect Fix](./oauth-redirect-fix.md) - Verification and status of OAuth callback flow

## Quick References

### Active Issues (⚠️ requires action)
See [Outstanding Issues & TODOs](./ISSUES_AND_TODOS.md) for:
- Server-side auth checks in 20+ page components (redirect loop risk)
- Frontend database code in deprecated location
- Need manual OAuth flow verification in production

### Recent Fixes (✅ completed)
- Admin system implementation with role-based access control
- Session rotation with proper Set-Cookie headers
- OAuth redirect to preserve user intent (callbackUrl)
- Cross-domain session sharing with proper cookie configuration

## How to Use These Docs

1. **For implementation details**: See specific behavioral doc files
2. **For known issues**: Check [Outstanding Issues & TODOs](./ISSUES_AND_TODOS.md)
3. **For verification status**: Each doc includes validation results and test coverage
4. **For deployment status**: Each doc tracks environment rollout

---

**Last Updated:** 2026-01-10  
**Status:** Active - ongoing maintenance and cleanup

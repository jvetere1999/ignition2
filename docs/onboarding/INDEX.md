# Onboarding Documentation

Complete guides for getting started with both the **Ecent Platform** and **DAW Watcher** application.

## Quick Navigation

### 🌐 Platform Onboarding
[→ Site Onboarding Guide](./SITE_ONBOARDING.md)

Get started with the Ecent platform including:
- Account creation and verification
- Profile setup
- Dashboard orientation
- API access and authentication
- Permission scopes and settings

**Time to complete:** ~10 minutes

---

### 🎵 DAW Watcher Onboarding  
[→ Watcher Onboarding Guide](./WATCHER_ONBOARDING.md)

Set up and configure the DAW Watcher desktop application:
- Installation (macOS, Windows, Linux)
- First-time configuration
- Folder selection and monitoring
- Sync settings and preferences
- Encryption setup (optional)
- Troubleshooting

**Time to complete:** ~15 minutes

---

## Deployment Pipelines Reference

The following automated pipelines ensure smooth deployments:

| Pipeline | Trigger | Purpose | Status |
|----------|---------|---------|--------|
| **Deploy Production** | Push to `production` branch | Backend API (Fly.io) + Frontend (Cloudflare) + Admin Panel | ✅ Active |
| **Deploy API Proxy** | Push to `main` (api changes) | API Proxy Worker (Cloudflare) | ✅ Active |
| **Release Watcher** | Git tag `watcher-v*` | Cross-platform Tauri app releases | ✅ Active |
| **E2E Tests** | Push/PR to `main` (backend changes) | Automated API validation | ✅ Active |
| **Observability** | Push to any branch | Lint, type check, unit/E2E tests | ✅ Active |

See [Deployment Pipelines](../deployment/DEPLOYMENT_CHECKLIST.md) for validation details.

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│   Frontend (Next.js)                │
│   https://ecent.online              │
│   ├─ Dashboard                      │
│   ├─ Project Management             │
│   └─ Settings                       │
└──────────────┬──────────────────────┘
               │ API Calls
┌──────────────▼──────────────────────┐
│   API Proxy (Cloudflare Worker)     │
│   https://api.ecent.online          │
│   ├─ Auth middleware                │
│   ├─ Rate limiting                  │
│   └─ Request routing                │
└──────────────┬──────────────────────┘
               │ Proxied Requests
┌──────────────▼──────────────────────┐
│   Backend API (Rust/Axum)           │
│   https://ecent-prod.fly.dev        │
│   ├─ Authentication                 │
│   ├─ Project management             │
│   ├─ R2 storage integration         │
│   └─ Database operations            │
└──────────────┬──────────────────────┘
               │ Queries & Storage
┌──────────────▼──────────────────────┐
│   Database (PostgreSQL/Neon)        │
│   Data persistence & recovery       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   DAW Watcher (Tauri App)           │
│   ├─ macOS (Intel + ARM)            │
│   ├─ Windows (x64)                  │
│   └─ Linux (x64)                    │
│                                     │
│   Syncs to:                         │
│   ├─ R2 storage (presigned URLs)   │
│   ├─ Backend API (project metadata)│
│   └─ Persistent state (local .json)│
└─────────────────────────────────────┘
```

---

## Support

- **Platform questions?** See [Site Onboarding](./SITE_ONBOARDING.md)
- **DAW Watcher issues?** See [Watcher Onboarding](./WATCHER_ONBOARDING.md) → Troubleshooting section
- **API integration?** See [API Documentation](../feature-specs/API_DOCUMENTATION.md)
- **Deployment help?** See [Deployment Checklist](../deployment/DEPLOYMENT_CHECKLIST.md)

---

**Last Updated:** January 19, 2026  
**Status:** ✅ Production Ready

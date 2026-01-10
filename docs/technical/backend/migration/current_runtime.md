# Current Runtime Environment

**Generated:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Document current runtime, deployment, and execution environment

---

## Runtime Stack Summary

| Layer | Current Technology | Target Technology |
|-------|-------------------|-------------------|
| **Compute** | Cloudflare Workers (Edge) | Container (Docker + Kubernetes) |
| **Framework** | Next.js 15.1.3 + OpenNext | Next.js 15+ (frontend) + Axum (backend) |
| **Node Version** | 22.x (per package.json engines) | 22.x (frontend only) |
| **Database** | Cloudflare D1 (SQLite) | PostgreSQL |
| **Object Storage** | Cloudflare R2 | Cloudflare R2 (backend-only access) |
| **Auth** | Auth.js v5 + D1 Adapter | Custom Axum auth middleware |
| **Secrets** | Wrangler secrets | Azure Key Vault |
| **CDN** | Cloudflare (implicit) | TBD (Cloudflare CDN or similar) |

---

## Current Deployment Architecture

### OpenNext on Cloudflare Workers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Worker.js     │  │   D1 Database   │  │   R2 Bucket     │  │
│  │  (OpenNext)     │  │   (ignition)    │  │ (ignition-blobs)│  │
│  │                 │  │                 │  │                 │  │
│  │ - Next.js SSR   │  │ - Auth tables   │  │ - Audio files   │  │
│  │ - API routes    │  │ - App tables    │  │ - User uploads  │  │
│  │ - Middleware    │  │ - ~60 tables    │  │ - Exports       │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┴────────────────────┘           │
│                                                                  │
│  Bindings: DB (D1), BLOBS (R2), ASSETS (static)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| `wrangler.toml` | Workers configuration | D1 binding, R2 binding, env vars |
| `open-next.config.ts` | OpenNext adapter | Default config |
| `next.config.ts` | Next.js config | Experimental features |

---

## Cloudflare Bindings (from wrangler.toml)

### D1 Database

```toml
[[d1_databases]]
binding = "DB"
database_name = "ignition"
database_id = "40c2b3a5-7fa1-492f-bce9-3c30959b56a8"
```

**Access Pattern:**
```typescript
// src/lib/db/client.ts
const env = (globalThis as unknown as { env?: { DB?: D1Database } }).env;
const db = env?.DB;
```

### R2 Bucket

```toml
[[r2_buckets]]
binding = "BLOBS"
bucket_name = "ignition-blobs"
```

**Access Pattern:**
```typescript
// src/lib/storage/r2.ts
const bucket = (ctx.env as unknown as { BLOBS?: R2Bucket }).BLOBS;
```

### Assets (Static)

```toml
[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

---

## Environment Variables

### Production (wrangler.toml [vars])

| Variable | Value | Sensitivity |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Public |
| `NEXT_PUBLIC_APP_URL` | `https://ignition.ecent.online` | Public |
| `AUTH_URL` | `https://ignition.ecent.online` | Public |
| `AUTH_TRUST_HOST` | `true` | Public |
| `ADMIN_EMAILS` | `jvetere1999@gmail.com` | Internal |
| `NEXT_PUBLIC_ADMIN_EMAILS` | `jvetere1999@gmail.com` | Public |

### Secrets (via wrangler secret)

| Secret | Purpose | Required |
|--------|---------|----------|
| `AUTH_SECRET` | Auth.js signing key | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Yes |
| `AZURE_AD_CLIENT_ID` | Azure AD OAuth | Yes |
| `AZURE_AD_CLIENT_SECRET` | Azure AD OAuth | Yes |
| `AZURE_AD_TENANT_ID` | Azure AD OAuth | Yes |

### Preview Environment

```toml
[env.preview]
name = "ignition-preview"
NEXT_PUBLIC_APP_URL = "https://ignition-preview.jvetere1999.workers.dev"
AUTH_URL = "https://ignition-preview.jvetere1999.workers.dev"
```

---

## Build & Deploy Pipeline

### Build Process

```bash
# 1. Next.js build
next build

# 2. OpenNext conversion
npx @opennextjs/cloudflare build

# 3. Deploy to Workers
wrangler deploy
```

### Output Structure

```
.open-next/
├── worker.js              # Main worker entry
├── middleware/            # Edge middleware
├── assets/               # Static assets
├── server-functions/     # SSR functions
├── cloudflare/          # Cloudflare-specific
└── dynamodb-provider/   # Cache config
```

### CI/CD (GitHub Actions)

**Location:** `.github/workflows/deploy.yml`

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

**Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Type check
5. Lint
6. Run unit tests
7. Build Next.js
8. Build OpenNext
9. Deploy to Cloudflare

---

## Runtime Characteristics

### Request Flow

```
1. Request hits Cloudflare edge
2. Worker.js receives request
3. OpenNext routes to appropriate handler:
   - Static assets → R2/cache
   - API routes → Handler function
   - Pages → SSR/RSC
4. Handler accesses D1/R2 as needed
5. Response returned to client
```

### Performance Constraints

| Constraint | Limit | Source |
|------------|-------|--------|
| Worker CPU time | 30ms (free), 30s (paid) | Cloudflare Workers |
| Worker memory | 128MB | Cloudflare Workers |
| D1 row limit | 1M rows/database | Cloudflare D1 |
| R2 object size | 5GB | Cloudflare R2 |
| Request body | 100MB | Cloudflare Workers |

### Cold Start

- **Current:** Workers have minimal cold start (~50-200ms)
- **Target:** Container cold start will be higher, mitigate with:
  - Warm pool
  - Health checks
  - Connection pooling

---

## Dependencies Analysis

### Production Dependencies (package.json)

| Package | Version | Purpose | Backend/Frontend |
|---------|---------|---------|------------------|
| `next` | ^15.1.3 | Framework | Frontend |
| `react` | ^19.0.0 | UI library | Frontend |
| `react-dom` | ^19.0.0 | React DOM | Frontend |
| `next-auth` | ^5.0.0-beta.25 | Auth | **Backend** (replace) |
| `@auth/d1-adapter` | ^1.7.4 | D1 auth adapter | **Backend** (remove) |
| `zod` | ^3.24.1 | Validation | Both |
| `zustand` | ^5.0.9 | State management | Frontend |
| `howler` | ^2.2.4 | Audio playback | Frontend |
| `wavesurfer.js` | ^7.12.1 | Audio visualization | Frontend |
| `@wavesurfer/react` | ^1.0.12 | React wrapper | Frontend |
| `audiomotion-analyzer` | ^4.5.3 | Audio analysis | Frontend |
| `butterchurn` | ^2.6.7 | Milkdrop visualizer | Frontend |
| `butterchurn-presets` | ^2.4.7 | Visualizer presets | Frontend |
| `react-audio-visualize` | ^1.2.0 | Audio viz component | Frontend |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@cloudflare/workers-types` | ^4.20241230.0 | CF type definitions |
| `@opennextjs/cloudflare` | ^1.3.0 | OpenNext adapter |
| `@playwright/test` | ^1.49.1 | E2E testing |
| `typescript` | ^5.7.2 | Type checking |
| `vitest` | ^2.1.8 | Unit testing |
| `wrangler` | ^4.53.0 | CF CLI |

---

## Known Runtime Issues

| Issue | Impact | Location | Notes |
|-------|--------|----------|-------|
| D1 connection reuse | Performance | `src/lib/db/client.ts` | globalThis pattern |
| Auth on every request | Latency | `src/middleware.ts:86` | `auth()` called frequently |
| R2 streaming | Memory | `src/lib/storage/r2.ts` | Buffers entire file sometimes |
| Cold start variance | UX | Workers runtime | Unpredictable |
| SQLite limitations | Scalability | D1 | No concurrent writes |

---

## Target Runtime (Future State)

### Backend (Rust/Axum)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Container Orchestrator                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Axum Backend   │  │   PostgreSQL    │  │   R2 (via S3)   │  │
│  │                 │  │                 │  │                 │  │
│  │ - Auth/Sessions │  │ - All tables    │  │ - Signed URLs   │  │
│  │ - API routes    │  │ - Migrations    │  │ - Backend only  │  │
│  │ - RBAC          │  │ - Connections   │  │                 │  │
│  │ - R2 access     │  │   pooled        │  │                 │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┴────────────────────┘           │
│                                                                  │
│  URL: https://api.ecent.online                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend (Next.js)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel / Container                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Next.js Frontend                          ││
│  │                                                              ││
│  │  - UI only (SSR/RSC allowed)                                ││
│  │  - No auth logic (forward cookies only)                     ││
│  │  - API client wrapper for backend calls                     ││
│  │  - No direct DB access                                      ││
│  │  - No R2 access                                             ││
│  │                                                              ││
│  │  URL: https://ignition.ecent.online                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Admin Console (Separate Deploy)

```
URL: https://admin.ignition.ecent.online
Uses: Same backend under /admin/* routes
```


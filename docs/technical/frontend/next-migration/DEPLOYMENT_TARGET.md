# Deployment Target: Cloudflare Workers via OpenNext

> Version: 2.0
> Last Updated: 2025-01-02
> Status: Production Ready

This document specifies the deployment architecture for the Next.js 16 app on Cloudflare Workers using OpenNext.

---

## Architecture Overview

```
                    Cloudflare Edge
    ┌──────────────────────────────────────────────────────────┐
    │                                                          │
    │  ┌────────────────────────────────────────────────────┐  │
    │  │            Cloudflare Workers (OpenNext)           │  │
    │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
    │  │  │   Next.js   │  │   Auth.js   │  │   Server   │  │  │
    │  │  │   Runtime   │  │   Handler   │  │   Actions  │  │  │
    │  │  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │  │
    │  │         │                │                │         │  │
    │  └─────────┼────────────────┼────────────────┼─────────┘  │
    │            │                │                │            │
    │  ┌─────────▼────────────────▼────────────────▼─────────┐  │
    │  │                   Bindings Layer                    │  │
    │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  │  │
    │  │  │   D1    │  │   R2    │  │   KV    │  │ Secrets│  │  │
    │  │  │ (SQL DB)│  │ (Blobs) │  │ (Cache) │  │        │  │  │
    │  │  └─────────┘  └─────────┘  └─────────┘  └────────┘  │  │
    │  └─────────────────────────────────────────────────────┘  │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
```

---

## OpenNext Configuration

### Why OpenNext?

OpenNext is the officially recommended way to deploy Next.js to Cloudflare Workers. It handles:

- Converting Next.js output to Cloudflare Workers format
- Static asset handling via Cloudflare CDN
- Server-side rendering in Workers runtime
- ISR (Incremental Static Regeneration) support
- Server Actions compatibility

### open-next.config.ts

```typescript
// passion-os-next/open-next.config.ts
import type { OpenNextConfig } from "@opennextjs/cloudflare";

export default {
  // Use Cloudflare Workers runtime
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
    },
  },
  
  // Static assets configuration
  dangerous: {
    // Disable Node.js built-ins not available in Workers
    disableNodePolyfills: true,
  },
} satisfies OpenNextConfig;
```

### Limitations

OpenNext on Cloudflare does NOT support:

| Feature | Status | Alternative |
|---------|--------|-------------|
| Node.js middleware | Not supported | Use Cloudflare middleware |
| `next/proxy.ts` | Not supported | Use Workers routing |
| Edge Middleware (Node APIs) | Limited | Pure Edge APIs only |
| File system access | Not supported | Use R2 or KV |
| Long-running processes | 30s limit | Use Durable Objects |
| WebSocket upgrades | Limited | Use Durable Objects |

---

## Bindings Configuration

### wrangler.toml

```toml
# passion-os-next/wrangler.toml
name = "passion-os-next"
compatibility_date = "2025-01-02"
compatibility_flags = ["nodejs_compat"]

# OpenNext output directory
main = ".open-next/worker.js"
assets = { directory = ".open-next/assets", binding = "ASSETS" }

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "passion_os"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # From D1 create

# R2 Bucket binding
[[r2_buckets]]
binding = "BLOBS"
bucket_name = "passion-os-blobs"

# KV Namespace (optional, for caching)
[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # From KV create

# Environment variables (non-sensitive)
[vars]
NODE_ENV = "production"
NEXT_PUBLIC_APP_URL = "https://passion-os.pages.dev"

# Secrets (set via wrangler secret put)
# AUTH_SECRET - Auth.js secret
# GOOGLE_CLIENT_ID - OAuth
# GOOGLE_CLIENT_SECRET - OAuth
# AZURE_AD_CLIENT_ID - Entra ID OAuth
# AZURE_AD_CLIENT_SECRET - Entra ID OAuth
# AZURE_AD_TENANT_ID - Entra ID tenant
```

### Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `AUTH_SECRET` | Secret | Auth.js session encryption key |
| `AUTH_URL` | Var | Public URL for Auth.js callbacks |
| `GOOGLE_CLIENT_ID` | Secret | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Secret | Google OAuth client secret |
| `AZURE_AD_CLIENT_ID` | Secret | Microsoft Entra ID client ID |
| `AZURE_AD_CLIENT_SECRET` | Secret | Microsoft Entra ID client secret |
| `AZURE_AD_TENANT_ID` | Secret | Microsoft Entra ID tenant |
| `NEXT_PUBLIC_APP_URL` | Var | Public app URL |

### Setting Secrets

```bash
# Set secrets via Wrangler CLI
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put AZURE_AD_CLIENT_ID
wrangler secret put AZURE_AD_CLIENT_SECRET
wrangler secret put AZURE_AD_TENANT_ID
```

---

## D1 Database Setup

### Create Database

```bash
# Create D1 database
wrangler d1 create passion_os

# Note the database_id from output, add to wrangler.toml
```

### Apply Schema

```bash
# Apply schema migrations
wrangler d1 execute passion_os --file=./src/lib/db/schema.sql
```

### Local Development

```bash
# D1 runs locally in Miniflare during dev
wrangler dev
```

---

## R2 Bucket Setup

### Create Bucket

```bash
# Create R2 bucket
wrangler r2 bucket create passion-os-blobs

# Add binding to wrangler.toml
```

### CORS Configuration

```json
// R2 CORS rules (set via dashboard or API)
{
  "corsRules": [
    {
      "allowedOrigins": ["https://passion-os.pages.dev"],
      "allowedMethods": ["GET", "PUT", "DELETE"],
      "allowedHeaders": ["*"],
      "maxAgeSeconds": 3600
    }
  ]
}
```

---

## Auth.js Configuration

### Accessing Bindings

```typescript
// passion-os-next/src/lib/auth/config.ts
import { D1Adapter } from "@auth/d1-adapter";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export function createAuthConfig(db: D1Database): NextAuthConfig {
  return {
    adapter: D1Adapter(db),
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      MicrosoftEntraID({
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_TENANT_ID!,
      }),
    ],
    session: {
      strategy: "database",
    },
    callbacks: {
      session: ({ session, user }) => ({
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      }),
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
  };
}
```

### Route Handler

```typescript
// passion-os-next/src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

---

## Build and Deploy

### Build Commands

```bash
# Install dependencies
npm install

# Build Next.js app
npm run build

# Build OpenNext output
npx @opennextjs/cloudflare build

# Deploy to Cloudflare
wrangler deploy
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "build:worker": "npx @opennextjs/cloudflare build",
    "deploy": "npm run build && npm run build:worker && wrangler deploy",
    "deploy:preview": "npm run deploy -- --env preview"
  }
}
```

### GitHub Actions Workflow

```yaml
# passion-os-next/.github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: passion-os-next/package-lock.json
      
      - name: Install dependencies
        working-directory: passion-os-next
        run: npm ci
      
      - name: Build
        working-directory: passion-os-next
        run: npm run build
      
      - name: Build OpenNext
        working-directory: passion-os-next
        run: npx @opennextjs/cloudflare build
      
      - name: Deploy to Cloudflare
        working-directory: passion-os-next
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: wrangler deploy
```

---

## Compatibility Flags

### Required Flags

```toml
# wrangler.toml
compatibility_flags = ["nodejs_compat"]
```

The `nodejs_compat` flag enables:
- Node.js built-in modules (Buffer, crypto, etc.)
- Required for Auth.js and other npm packages

### Compatibility Date

Use the latest stable date:

```toml
compatibility_date = "2025-01-02"
```

---

## Performance Considerations

### Cold Starts

Workers have minimal cold starts (~5-50ms), but:
- Keep bundle size small (<1MB ideal)
- Use dynamic imports for rarely-used code
- Cache aggressively in KV

### Request Limits

| Limit | Value | Notes |
|-------|-------|-------|
| CPU time | 30s (paid) | For request handling |
| Memory | 128MB | Per isolate |
| Request size | 100MB | For uploads |
| Subrequest limit | 1000 | Per request |

### Caching Strategy

```typescript
// Use KV for session/cache data
const cached = await env.CACHE.get(key, "json");
if (cached) return cached;

const data = await fetchFromD1();
await env.CACHE.put(key, JSON.stringify(data), { expirationTtl: 300 });
return data;
```

---

## Monitoring and Observability

### Workers Analytics

Enable in Cloudflare dashboard:
- Request counts
- CPU time
- Error rates
- Geographic distribution

### Logging

```typescript
// Structured logging (appears in Workers logs)
console.log(JSON.stringify({
  level: "info",
  message: "User signed in",
  userId: user.id,
  timestamp: new Date().toISOString(),
}));
```

**Never log**:
- Secrets, tokens, API keys
- Full session data
- User passwords or PII beyond IDs

---

## Rollback Strategy

### Wrangler Rollbacks

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback
```

### Database Rollbacks

D1 does not support automatic rollbacks. Strategies:

1. **Forward migrations only**: Add columns, never drop
2. **Backup before migration**: Export data, apply migration
3. **Feature flags**: Gate new features, disable if issues

---

## Local Development

### Wrangler Dev

```bash
# Start local development with bindings
wrangler dev

# This provides:
# - Local D1 database (Miniflare)
# - Local R2 bucket (Miniflare)
# - Local KV namespace (Miniflare)
# - Hot reload
```

### Environment Files

```bash
# passion-os-next/.dev.vars (not committed)
AUTH_SECRET=dev-secret-32-chars-minimum-here
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
AZURE_AD_CLIENT_ID=xxx
AZURE_AD_CLIENT_SECRET=xxx
AZURE_AD_TENANT_ID=xxx
```

---

## Security Checklist

- [ ] All secrets via `wrangler secret put`, not in code
- [ ] AUTH_SECRET is cryptographically random, 32+ chars
- [ ] HTTPS only (Cloudflare provides by default)
- [ ] CSRF protection via Auth.js
- [ ] Rate limiting via Cloudflare (dashboard or Workers)
- [ ] Input validation at API boundaries
- [ ] No sensitive data in logs
- [ ] R2 bucket is private (no public access)
- [ ] D1 queries use parameterized statements

---

## References

- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Auth.js D1 Adapter](https://authjs.dev/getting-started/adapters/d1)
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

## Quick Start: First-Time Deployment

Follow these steps in order for a fresh deployment:

### 1. Install Wrangler and Login

```bash
npm install -g wrangler
wrangler login
```

### 2. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create passion_os
# Copy the database_id to wrangler.toml

# Create R2 bucket
wrangler r2 bucket create passion-os-blobs
```

### 3. Update wrangler.toml

Edit `wrangler.toml` and replace the placeholder database_id:

```toml
[[d1_databases]]
binding = "DB"
database_name = "passion_os"
database_id = "YOUR-ACTUAL-DATABASE-ID"  # From step 2
```

### 4. Apply Database Migrations

```bash
# Apply to production D1
npm run db:migrate:prod
```

### 5. Set Secrets

```bash
wrangler secret put AUTH_SECRET
# Enter a cryptographically random 32+ character string

wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put AZURE_AD_CLIENT_ID
wrangler secret put AZURE_AD_CLIENT_SECRET
wrangler secret put AZURE_AD_TENANT_ID
```

### 6. Configure OAuth Providers

**Google:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `https://YOUR-WORKER.workers.dev/api/auth/callback/google`

**Microsoft:**
1. Go to https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
2. Register new application
3. Add redirect URI: `https://YOUR-WORKER.workers.dev/api/auth/callback/microsoft-entra-id`

### 7. Deploy

```bash
npm run deploy
```

### 8. Verify

Visit your Worker URL and test:
- Home page loads
- Sign in works
- Protected routes redirect correctly


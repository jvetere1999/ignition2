# Passion OS

Modern productivity and music production companion. Plan, focus, and create.

Built with Next.js 16 + React 19, deployed to Cloudflare Workers.

## Overview

Passion OS is a full-stack application featuring:

- **Quest-based productivity**: Gamified task management with XP and achievements
- **Focus timer**: Pomodoro-style sessions with break tracking
- **DAW shortcuts**: Keyboard shortcuts reference for major DAWs
- **Music templates**: Drum patterns, melodies, and chord progressions
- **Reference library**: Audio track analysis with waveform visualization, frequency spectrum analysis, BPM detection, and annotation support
- **Knowledge base**: Personal notes organized by category

### Architecture

- **Online-first**: Server-side D1 database is source of truth
- **Server-side rendering**: Full SSR/SSG via Next.js App Router
- **OAuth authentication**: Google + Microsoft Entra ID via Auth.js
- **Cloudflare infrastructure**: Workers, D1 (SQL), R2 (blobs)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 |
| UI Library | React 19 |
| Language | TypeScript 5.7 |
| Auth | Auth.js (NextAuth v5) |
| Database | Cloudflare D1 (SQLite) |
| Blob Storage | Cloudflare R2 |
| Deployment | Cloudflare Workers via OpenNext |
| Testing | Vitest + Playwright |

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (for deployment)

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .dev.vars.example .dev.vars
cp .env.local.example .env.local
# Edit both files with your OAuth credentials

# Start development server
npm run dev
```

### Environment Variables

Create `.dev.vars` (for Wrangler) and `.env.local` (for Next.js dev):

```bash
AUTH_SECRET=your-secret-32-chars-minimum
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
AZURE_AD_CLIENT_ID=xxx
AZURE_AD_CLIENT_SECRET=xxx
AZURE_AD_TENANT_ID=xxx
```

### Database Setup

```bash
# Create D1 database (first time only)
wrangler d1 create passion_os

# Update wrangler.toml with the database_id from output

# Apply migrations locally
npm run db:migrate:local

# Apply migrations to production
npm run db:migrate:prod
```

### R2 Bucket Setup

```bash
# Create R2 bucket
wrangler r2 bucket create passion-os-blobs
```

### Building

```bash
# Build Next.js
npm run build

# Build for Cloudflare Workers
npm run build:worker
```

### Deployment

```bash
# Set secrets (first time only)
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put AZURE_AD_CLIENT_ID
wrangler secret put AZURE_AD_CLIENT_SECRET
wrangler secret put AZURE_AD_TENANT_ID

# Deploy to Cloudflare Workers
npm run deploy

# Deploy preview environment
npm run deploy:preview
```

## Project Structure

```
passion-os-next/
  src/
    app/                    # Next.js App Router pages
      api/                  # API routes
      auth/                 # Auth pages (signin, error)
      (app)/                # Protected routes with shell
    components/             # React components
      shell/                # Layout components (Header, Sidebar)
      ui/                   # Base UI components (Button, Card)
    lib/                    # Shared utilities
      auth/                 # Auth.js configuration
      db/                   # D1 database layer
      storage/              # R2 blob storage
      data/                 # Static data (shortcuts, templates)
      theme/                # Theme system
    styles/                 # Global styles and tokens
  tests/                    # E2E tests (Playwright)
  migrations/               # D1 database migrations
  docs/                     # Project documentation
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build Next.js app |
| `npm run start` | Start production server (local) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run check` | Run all checks (typecheck + lint) |
| `npm run test:unit` | Run unit tests (103 tests) |
| `npm run test:e2e` | Run E2E tests (54 tests) |
| `npm run test:all` | Run all checks and tests |
| `npm run build:worker` | Build for Cloudflare Workers |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run deploy:preview` | Deploy to preview environment |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:prod` | Apply D1 migrations to production |

## Routes

### Public Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/about` | About page |
| `/auth/signin` | Sign in with OAuth |
| `/hub` | DAW shortcuts browser |
| `/hub/[dawId]` | DAW shortcuts detail |
| `/templates` | Music templates |
| `/templates/[category]` | Template category |

### Protected Routes (require auth)

| Route | Description |
|-------|-------------|
| `/` (app) | Today dashboard |
| `/planner` | Quest management |
| `/focus` | Focus timer |
| `/progress` | Stats and achievements |
| `/settings` | User preferences |
| `/infobase` | Knowledge base |

## API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/[...]` | GET, POST | Auth.js handler |
| `/api/quests` | GET, POST | Quest CRUD |
| `/api/focus` | GET, POST | Focus sessions |
| `/api/blobs/upload` | POST | Upload blob |
| `/api/blobs/[id]` | GET, DELETE | Blob access |

## Documentation

- [Synopsis](./SYNOPSIS.md) - Project overview and current state
- [Deployment Target](./docs/next-migration/DEPLOYMENT_TARGET.md) - Cloudflare configuration
- [Data Model Map](./docs/next-migration/DATA_MODEL_MAP.md) - D1 schema design
- [Translation Map](./docs/next-migration/TRANSLATION_MAP.md) - Feature mapping
- [Changelog](./docs/next-migration/CHANGELOG.md) - Migration progress
- [Contributing](./docs/CONTRIBUTING.md) - Contribution guidelines

## License

MIT License - see [LICENSE](./LICENSE) file.

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).


# Copilot Instructions - Passion OS (Next.js)

## Project Context

This is a Next.js 16 + React 19 full-stack application deployed to Cloudflare Workers via OpenNext.

**Stack:**
- Next.js 16 (App Router)
- React 19
- TypeScript 5.7
- Auth.js (NextAuth v5) with D1 adapter
- Cloudflare D1 (SQLite database)
- Cloudflare R2 (blob storage)
- Vitest (unit tests) + Playwright (E2E tests)

---

## Prime Directives

- Preserve functionality; no regressions.
- Optimize for safety and efficiency; prefer incremental, reversible changes.
- Online-first architecture; D1 is source of truth.
- No additional storage systems beyond D1 and R2.

---

## Terminal / Execution Rules (Non-negotiable)

- **Complete all intended code changes before running any terminal command.**
- **You cannot read terminal output.** Treat terminal output as inaccessible.
- For any command execution:
  - Redirect stdout+stderr to a log file: `> .tmp/<name>.log 2>&1`
  - Read the **log file directly** (via file viewer/editor API).
- **Never use `cat`** (or equivalents like `type`, `more`, `less`, `tail`, `head`) to read logs.
- Do not run commands "to see what happens" mid-edit. Edit first, then validate.

---

## Style Rules

- **No emojis in code, UI, comments, tests, docs.**
- Use Unicode symbols for simple marks: `->`, `<-`, `*`, `-`
- Use SVG for complex icons matching project style.

---

## Code Conventions

### File Organization

```
src/
  app/           # Next.js App Router pages
  components/    # React components
    shell/       # Layout (Header, Sidebar, AppShell)
    ui/          # Base components (Button, Card)
  lib/           # Shared utilities
    auth/        # Auth.js config
    db/          # D1 repositories
    storage/     # R2 client
    data/        # Static data
    theme/       # Theme provider
  styles/        # CSS tokens
```

### Component Patterns

- Server Components by default (no "use client" unless needed)
- Client Components for interactivity (theme, forms, timers)
- CSS Modules for styling (`Component.module.css`)
- Use design tokens from `src/styles/tokens.css`

### API Routes

- Edge runtime compatible (no Node.js APIs)
- Validate inputs with Zod or manual guards
- Return typed JSON responses
- Handle errors gracefully

### Database

- Use repository pattern in `src/lib/db/repositories/`
- Validate inputs before database operations
- Use parameterized queries (no string interpolation)
- Type all entities in `src/lib/db/types.ts`

---

## Testing Requirements

### Unit Tests (Vitest)

- Colocate in `__tests__/` directories
- Test pure functions and utilities
- Mock external dependencies (D1, R2)

### E2E Tests (Playwright)

- Place in `tests/*.spec.ts`
- Test user flows and page behavior
- Use test helpers from `tests/helpers/`

### Running Tests

```bash
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests only
npm run test:all         # Full suite
```

---

## Deployment

### Cloudflare Workers via OpenNext

```bash
npm run build           # Build Next.js
npm run build:worker    # Build for Workers
npm run deploy          # Deploy to Cloudflare
npm run deploy:full     # Full pipeline: test -> build -> build:worker -> deploy
```

### Full Deployment Script

Use `npm run deploy:full` for the complete pipeline. This runs:
1. Unit tests (fails fast if tests fail)
2. Next.js build
3. Cloudflare Worker build
4. Deploy to Cloudflare

All logs are written to `.tmp/` directory for debugging.

### Required Secrets (set via `wrangler secret put`)

- AUTH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- AZURE_AD_CLIENT_ID
- AZURE_AD_CLIENT_SECRET
- AZURE_AD_TENANT_ID

### Environment Variables (set in wrangler.toml [vars])

- ADMIN_EMAILS - Comma-separated list of admin email addresses (e.g., "admin1@example.com,admin2@example.com")
- NODE_ENV - Environment (production, preview)
- AUTH_URL - Auth.js callback URL
- NEXT_PUBLIC_APP_URL - Public app URL

### Bindings

- `DB` - D1 database (passion_os)
- `BLOBS` - R2 bucket (passion-os-blobs)
- `ASSETS` - Static assets

---

## PR Template

Each PR must include:

1. **Title**: Clear, concise description
2. **Scope**: What changed and why
3. **File list**: Exact files modified
4. **Acceptance criteria**: Checkboxes
5. **Validation commands**: With log redirection
6. **Rollback plan**: How to revert

---

## Common Tasks

### Add a new route

1. Create page in `src/app/(app)/[route]/page.tsx`
2. Add styles in `page.module.css`
3. Add to sidebar if needed (`src/components/shell/Sidebar.tsx`)
4. Add E2E test in `tests/`

### Add a new API endpoint

1. Create route in `src/app/api/[endpoint]/route.ts`
2. Export handlers: `GET`, `POST`, `PUT`, `DELETE`
3. Add auth check if protected
4. Add unit tests for logic

### Add a new database entity

1. Add type in `src/lib/db/types.ts`
2. Add migration in `migrations/`
3. Add repository in `src/lib/db/repositories/`
4. Export from `src/lib/db/index.ts`
5. Add unit tests
6. **Update database version** (see below)

### Database Version Management (REQUIRED)

**Every database schema change requires:**

1. **Create new migration file:** `migrations/NNNN_description.sql`
   - Number sequentially (e.g., 0013, 0014, etc.)
   - Use descriptive name

2. **Update version constants in:**
   - `src/app/api/admin/backup/route.ts`: Update `CURRENT_DB_VERSION` and `CURRENT_DB_VERSION_NAME`
   - `src/app/api/admin/restore/route.ts`: Update `CURRENT_DB_VERSION`

3. **Add migration function in restore API:**
   - Add version-specific migration logic in `migrateData()` function
   - Handle upgrading from previous version to new version

4. **Update documentation:**
   - Add entry to version history table in `docs/DATABASE_SCHEMA.md`
   - Document new tables/columns in appropriate sections

**Example migration update:**
```typescript
// In migrateData() function
if (version < 13) {
  data.tables.users = (data.tables.users || []).map((user) => ({
    ...user,
    new_column: user.new_column ?? defaultValue,
  }));
  version = 13;
}
```

---

## Security Defaults

- No secrets in code; use environment variables
- Validate all external inputs
- Use parameterized database queries
- Set secure cookie options
- Rate limit API routes where appropriate


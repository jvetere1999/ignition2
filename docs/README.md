# Passion OS Documentation

## Quick Links

- [Contributing Guide](./CONTRIBUTING.md)
- [Deployment Target](./next-migration/DEPLOYMENT_TARGET.md)
- [Changelog](./next-migration/CHANGELOG.md)

## Architecture Documentation

### Migration Reference

These documents capture the architecture decisions and mappings:

| Document | Description |
|----------|-------------|
| [DEPLOYMENT_TARGET.md](./next-migration/DEPLOYMENT_TARGET.md) | Cloudflare Workers deployment configuration |
| [DATA_MODEL_MAP.md](./next-migration/DATA_MODEL_MAP.md) | D1 database schema and entity design |
| [TRANSLATION_MAP.md](./next-migration/TRANSLATION_MAP.md) | Route and feature mapping |
| [CHANGELOG.md](./next-migration/CHANGELOG.md) | Migration progress and PR history |

## Key Concepts

### Authentication

OAuth authentication via Auth.js with:
- Google OAuth
- Microsoft Entra ID (Azure AD)

Sessions stored in D1 database. See `src/lib/auth/` for configuration.

### Database (D1)

SQLite-compatible database on Cloudflare's edge. Schema in `migrations/`.

Key entities:
- Users/Sessions/Accounts (Auth.js)
- Quests (task management)
- FocusSessions (timer tracking)
- Projects, Infobase entries

### Blob Storage (R2)

Object storage for:
- Audio files
- Images
- Exports/backups

See `src/lib/storage/` for R2 client.

### Theme System

CSS custom properties in `src/styles/tokens.css`:
- Light/dark/system modes
- Color, spacing, typography tokens
- Responsive breakpoints

### Testing

- **Unit tests**: Vitest, 103 tests in `src/lib/**/__tests__/`
- **E2E tests**: Playwright, 54 tests in `tests/`

Run all: `npm run test:all`

## Directory Structure

```
docs/
  README.md               # This file
  CONTRIBUTING.md         # How to contribute
  next-migration/         # Architecture documentation
    CHANGELOG.md          # Migration progress
    DATA_MODEL_MAP.md     # Database schema
    DEPLOYMENT_TARGET.md  # Cloudflare config
    TRANSLATION_MAP.md    # Feature mapping
```


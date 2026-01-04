# Passion OS - Project Synopsis

> Last updated: 2026-01-03

## Vision

Passion OS is a **modern productivity and music production companion** built for creators who want to plan, focus, and create more effectively. It combines gamified task management with professional music production tools in a unified, themeable interface.

---

## Product Pillars

### 1. Quest-Based Productivity
- Gamified task management with XP and achievements
- Schedule rules and recurring quests
- Skill tree progression system
- Reward ledger for motivation tracking

### 2. Focus System
- Pomodoro-style focus timer with break tracking
- Session history and statistics
- Project-linked focus sessions
- Notification support for session completion

### 3. Music Production Tools
- **DAW Shortcuts Reference**: 800+ keyboard shortcuts for 5 major DAWs
  - Ableton Live 12 (200+ shortcuts)
  - FL Studio (250+ shortcuts)
  - Logic Pro (100+ shortcuts)
  - Reason (85+ shortcuts)
  - Serum 2 power features (150+ entries)
- **Music Templates**: 25 templates (16 EDM-focused)
  - Drum patterns (11 templates)
  - Melody patterns (6 templates)
  - Chord progressions (8 templates)
- **Arrange View**: Lane-based arrangement with drum grid and piano roll
- **Reference Library**: Audio analysis with waveform visualization, BPM detection, and annotations

### 4. Knowledge Base (Infobase)
- Personal notes organized by category
- Tagging and search
- Markdown support

---

## Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19.2 |
| Language | TypeScript 5.7 |
| Auth | Auth.js v5 (NextAuth) |
| Database | Cloudflare D1 (SQLite edge) |
| Blob Storage | Cloudflare R2 |
| Deployment | Cloudflare Workers via OpenNext |
| Testing | Vitest (144 unit) + Playwright (54 E2E) |

### Design Principles

1. **Online-first**: D1 database is source of truth (not offline/IndexedDB)
2. **Server-side rendering**: Full SSR/SSG via Next.js App Router
3. **Edge-native**: Runs on Cloudflare Workers globally
4. **Type-safe**: End-to-end TypeScript with strict mode
5. **Themeable**: 6 Ableton-inspired themes with system preference detection
6. **Ad-ready**: Google AdSense integrated with non-intrusive configuration

---

## Current State (v0.10.0)

### Completed (PRs 1-10)

| Phase | Scope | Status |
|-------|-------|--------|
| PR1 | Migration documentation | Complete |
| PR2 | Next.js project scaffold | Complete |
| PR3 | Auth.js + D1 integration | Complete |
| PR4 | D1 data model + repositories | Complete |
| PR5 | R2 blob storage integration | Complete |
| PR6 | Core UI shell + theme system | Complete |
| PR7 | Route migration: Core routes | Complete |
| PR8 | Route migration: Producing domain | Complete |
| PR9 | Testing infrastructure + E2E | Complete |
| PR10 | Shortcuts data + Arrange view + Themes | Complete |

### Routes Implemented

**Public Routes:**
- `/` - Landing page
- `/about` - About page
- `/auth/signin` - OAuth sign-in
- `/hub` - DAW shortcuts browser
- `/hub/[dawId]` - DAW shortcuts detail
- `/templates` - Music templates
- `/templates/[category]` - Template categories (drums, melody, chords)
- `/privacy` - Privacy Policy (AdSense required)
- `/terms` - Terms of Service
- `/contact` - Contact page

**Protected Routes:**
- `/` (app) - Today dashboard
- `/planner` - Quest management
- `/focus` - Focus timer
- `/progress` - Stats and achievements
- `/settings` - User preferences with theme selection
- `/infobase` - Knowledge base
- `/arrange` - Lane-based arrangement view

### API Routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | Auth.js handler |
| `/api/quests` | GET, POST | Quest CRUD |
| `/api/focus` | GET, POST | Focus sessions |
| `/api/blobs/upload` | POST | Blob upload |
| `/api/blobs/[id]` | GET, DELETE, HEAD | Blob access |

### Database Schema (D1)

**Auth Tables:** users, accounts, sessions, verification_tokens, authenticators

**App Tables:** log_events, quests, schedule_rules, plan_templates, skill_trees, reward_ledger, focus_sessions, projects, reference_libraries, reference_tracks, infobase_entries, lane_templates, user_settings

### Theme System

| Theme | Mode | Accent |
|-------|------|--------|
| Live Dark | Dark | Orange (#ff764d) |
| Live Light | Light | Orange (#ff5500) |
| Mid Dark | Dark | Blue (#8bb8e8) |
| Mid Light | Light | Blue (#5090d0) |
| Disco | Dark | Pink (#ff6b9d) |
| Mint | Light | Green (#20a070) |

---

## Test Coverage

| Category | Count |
|----------|-------|
| Unit Tests (Vitest) | 144 |
| E2E Tests (Playwright) | 54 |
| **Total** | **198** |

### Test Categories
- Auth flow tests
- Hub/shortcuts tests
- Templates tests
- Navigation tests
- Theme system tests
- Accessibility tests
- Data layer tests
- Storage tests
- Repository tests

---

## Project Structure

```
passion-os-next/
  src/
    app/                    # Next.js App Router
      api/                  # API routes
      auth/                 # Auth pages (signin, error)
      (app)/                # Protected routes with shell
        arrange/            # Arrangement view
        focus/              # Focus timer
        hub/                # DAW shortcuts
        infobase/           # Knowledge base
        planner/            # Quest management
        progress/           # Stats and achievements
        settings/           # User preferences
        templates/          # Music templates
    components/             # React components
      shell/                # Layout (Header, Sidebar, AppShell)
      settings/             # Settings components (ThemeSelector)
      ui/                   # Base UI (Button, Card)
    lib/                    # Shared libraries
      arrange/              # Arrangement logic
      auth/                 # Auth.js configuration
      data/                 # Static data (shortcuts, templates, daws)
      db/                   # D1 database layer + repositories
      storage/              # R2 blob storage
      theme/                # Theme provider
      themes/               # Theme definitions
    styles/                 # Global styles and tokens
  tests/                    # E2E tests (Playwright)
  migrations/               # D1 database migrations
  docs/                     # Project documentation
```

---

## Upcoming Work

### Reference Library (Priority)
- Full audio analysis UI with waveform visualization
- Frequency spectrum analysis
- BPM detection with tap tempo
- Track annotations and sections
- Bottom player for A/B comparison

### Additional Features
- Quest completion flow with XP rewards
- Focus session linking to quests
- Progress charts and statistics
- Export/import functionality
- Keyboard navigation improvements
- Mobile responsive refinements

---

## Development Commands

```bash
# Local development
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# All checks
npm run check

# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# All tests
npm run test:all

# Build
npm run build

# Deploy to Cloudflare
npm run deploy
```

---

## Key Documentation

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Getting started guide |
| [CHANGELOG.md](./docs/next-migration/CHANGELOG.md) | Development history |
| [TRANSLATION_MAP.md](./docs/next-migration/TRANSLATION_MAP.md) | Feature mapping from legacy |
| [DATA_MODEL_MAP.md](./docs/next-migration/DATA_MODEL_MAP.md) | D1 schema design |
| [DEPLOYMENT_TARGET.md](./docs/next-migration/DEPLOYMENT_TARGET.md) | Cloudflare configuration |
| [ADSENSE.md](./docs/ADSENSE.md) | Google AdSense implementation |

---

## License

MIT License


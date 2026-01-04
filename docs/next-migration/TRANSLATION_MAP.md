# Translation Map: SvelteKit to Next.js

> Version: 1.6
> Last Updated: 2025-01-02
> Status: PR10 Complete (Reference Tracks Implemented)

This document maps routes, plugins, commands, themes, and rendering boundaries from the legacy SvelteKit app to the new Next.js 16 app.

---

## Route Mapping

### API Routes (New in Next.js)

| Next.js Route | Methods | Auth | Notes |
|---------------|---------|------|-------|
| `/api/auth/[...nextauth]` | GET, POST | - | Auth.js handler |
| `/api/blobs/[id]` | GET, DELETE, HEAD | Required | Blob access by ID |
| `/api/blobs/upload` | POST | Required | Upload new blob |
| `/api/quests` | GET, POST | Required | Quests CRUD |
| `/api/focus` | GET, POST | Required | Focus sessions + stats |

### Auth Routes (New in Next.js)

| Next.js Route | Rendering | Notes |
|---------------|-----------|-------|
| `/auth/signin` | SSR + CSR | OAuth sign-in page |
| `/auth/error` | SSR | Auth error display |

### Core Platform Routes

| SvelteKit Route | Next.js Route | Rendering | Notes |
|-----------------|---------------|-----------|-------|
| `/` | `/` | SSR | Home/Today page |
| `/planner` | `/planner` | SSR | Full planner view |
| `/progress` | `/progress` | SSR | Progress/stats dashboard |
| `/focus` | `/focus` | SSR | Focus timer (server-time based) |
| `/onboarding` | `/onboarding` | SSR | First-run flow |
| `/privacy` | `/privacy` | Static | Privacy policy |

### Producing Domain Routes

| SvelteKit Route | Next.js Route | Rendering | Notes |
|-----------------|---------------|-----------|-------|
| `/hub` | `/hub` | SSG + CSR | Keyboard shortcuts browser |
| `/hub/[dawId]` | `/hub/[dawId]` | SSG | DAW-specific shortcuts |
| `/templates` | `/templates` | SSG | Template gallery |
| `/templates/[slug]` | `/templates/[slug]` | SSG | Template detail |
| `/templates/drums` | `/templates/drums` | SSG | Drum templates |
| `/templates/melody` | `/templates/melody` | SSG | Melody templates |
| `/templates/chords` | `/templates/chords` | SSG | Chord templates |
| `/melody` | `/melody` | CSR | Melody builder (interactive) |
| `/patterns` | `/patterns` | CSR | Drum patterns (interactive) |
| `/arrange` | `/arrange` | CSR | Arrange view (interactive) |
| `/infobase` | `/infobase` | SSR | Knowledge base |
| `/reference` (new) | `/reference` | CSR | Reference track library with player + analysis |

### Focus Domain Routes

| SvelteKit Route | Next.js Route | Rendering | Notes |
|-----------------|---------------|-----------|-------|
| `/focus` | `/focus` | SSR | Focus timer |
| `/domains/focus` | `/domains/focus` | SSR | Domain home |

### Domain Plugin Routes

| SvelteKit Route | Next.js Route | Rendering | Notes |
|-----------------|---------------|-----------|-------|
| `/domains/[id]` | `/domains/[id]` | SSR | Dynamic domain pages |
| `/domains/producing` | `/domains/producing` | SSR | Producing domain home |
| `/domains/focus` | `/domains/focus` | SSR | Focus domain home |

---

## Plugin System Translation

### SvelteKit Domain Plugin Contract

```typescript
// Legacy: src/lib/modules/core/domainTypes.ts
interface DomainPlugin {
  meta: DomainMetadata;
  register(services: CoreServices): void;
  tools?: DomainToolLink[];
  commands?: Command[];
}
```

### Next.js Domain Plugin Contract

```typescript
// Next: passion-os-next/src/lib/domains/types.ts
interface DomainPlugin {
  meta: DomainMetadata;
  // No register() - use React context providers
  tools?: DomainToolLink[];
  commands?: Command[];
  // New: Server-side data fetchers
  getServerData?: (db: D1Database) => Promise<unknown>;
}
```

### Key Differences

| Aspect | SvelteKit | Next.js |
|--------|-----------|---------|
| Registration | `register(services)` called on init | Context providers in layout |
| State | Svelte stores ($state) | React Context + Zustand |
| Commands | Global command registry | Server actions + client registry |
| Tools | Static links | Static links (no change) |
| Storage | IndexedDB (local-first) | D1 (server-first) |

### Domain Registry

| Domain ID | SvelteKit Location | Next.js Location |
|-----------|-------------------|------------------|
| `producing` | `src/lib/modules/domains/producing/` | `src/lib/domains/producing/` |
| `focus` | `src/lib/modules/domains/focus/` | `src/lib/domains/focus/` |

---

## Command Palette Translation

### SvelteKit Commands

```typescript
// Legacy: src/lib/modules/core/commands/index.ts
interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category?: string;
  icon?: string;
}
```

### Next.js Commands

```typescript
// Next: passion-os-next/src/lib/commands/types.ts
interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  category?: string;
  icon?: string;
  // New: Server action support
  serverAction?: string;
}
```

### Command Categories (Preserved)

| Category | Description | Example Commands |
|----------|-------------|------------------|
| `navigation` | Route navigation | Go to Planner, Go to Focus |
| `view` | View toggles | Toggle sidebar, Toggle dark mode |
| `action` | User actions | Create quest, Start timer |
| `system` | System operations | Export data, Import data |

---

## Theme System Translation

### Token Categories

Both apps use the same CSS custom property naming:

| Token Category | Example | Notes |
|----------------|---------|-------|
| Colors | `--color-bg`, `--color-text` | Semantic naming |
| Spacing | `--space-1`, `--space-2` | 4px scale |
| Typography | `--font-size-sm`, `--font-weight-bold` | System fonts |
| Radius | `--radius-sm`, `--radius-md` | Border radius |
| Shadows | `--shadow-sm`, `--shadow-md` | Elevation |
| Z-index | `--z-modal`, `--z-tooltip` | Stacking |

### Theme Files

| SvelteKit | Next.js |
|-----------|---------|
| `src/lib/design-tokens.css` | `src/styles/tokens.css` |
| `src/lib/themes/*.ts` | `src/lib/theme/*.ts` |
| `src/lib/theme.ts` | `src/lib/theme/index.ts` |

### Dark Mode

| Aspect | SvelteKit | Next.js |
|--------|-----------|---------|
| Storage | localStorage | Cookie (SSR-safe) |
| Toggle | Svelte store | React context |
| Initial | JS hydration flash | Cookie-based SSR |

---

## Rendering Boundaries

### Client Components

The following require `'use client'` directive in Next.js:

| Component | Reason |
|-----------|--------|
| `AudioPlayer` | Web Audio API |
| `MelodyBuilder` | Canvas/interactive |
| `PatternEditor` | Canvas/interactive |
| `FocusTimer` | Timer intervals |
| `CommandPalette` | Keyboard events |
| `SettingsPanel` | Theme toggle |
| `SearchInput` | Focus management |

### Server Components (Default)

| Component | Notes |
|-----------|-------|
| `AppShell` | Static layout |
| `Header` | Static nav |
| `Footer` | Static |
| `ShortcutList` | Data from D1 |
| `TemplateGrid` | Data from D1 |
| `QuestList` | Data from D1 |

### Data Fetching Patterns

| Pattern | SvelteKit | Next.js |
|---------|-----------|---------|
| Page load data | `+page.ts` load function | `async` Server Component |
| Form submission | `+page.server.ts` actions | Server Actions |
| Client mutations | Store + IDB | Server Actions + revalidate |
| Real-time | N/A (offline-first) | Optional: Durable Objects |

---

## State Management Translation

### Global State

| State Type | SvelteKit | Next.js |
|------------|-----------|---------|
| User session | Store + localStorage | Auth.js session |
| Theme | Store + localStorage | Cookie + context |
| Player queue | Store + IDB | Context + server state |
| Command history | Store | Context |

### Domain State

| Domain | SvelteKit | Next.js |
|--------|-----------|---------|
| Planner | IDB event log + derived stores | D1 tables + Server Components |
| Focus | localStorage + IDB | D1 + Server Components |
| Producing | IDB + blob store | D1 + R2 |

---

## API Differences

### No Equivalent in Next.js

| SvelteKit Feature | Alternative |
|-------------------|-------------|
| `$app/stores` | Custom context providers |
| `$app/navigation` | `next/navigation` hooks |
| `+page.ts` load | Server Component async |
| `+page.server.ts` actions | Server Actions |
| `+layout.ts` | `layout.tsx` async |
| `svelte:head` | `next/head` or metadata API |

### New in Next.js

| Next.js Feature | Notes |
|-----------------|-------|
| Server Actions | Form mutations without API routes |
| `revalidatePath` | Cache invalidation |
| `useOptimistic` | Optimistic UI updates |
| Parallel Routes | Advanced layouts (not needed initially) |
| Intercepting Routes | Modal patterns |

---

## Migration Checklist

### Phase 1: Infrastructure
- [x] Next.js project scaffold (PR2)
- [x] OpenNext configuration (PR2)
- [x] D1 schema definition (PR3, PR4)
- [x] R2 binding setup (PR5)
- [x] Auth.js configuration (PR3)

### Phase 2: Core UI
- [x] Theme tokens ported (PR6)
- [x] AppShell component (PR6)
- [x] Navigation structure (PR6)
- [ ] Command palette

### Phase 3: Core Routes
- [x] Home/Today page (PR7)
- [x] Planner page (PR7)
- [x] Progress page (PR7)
- [x] Focus timer (PR7)
- [x] Settings page (PR7)
- [x] Hub page (PR7)
- [x] Templates page (PR7)
- [x] Infobase page (PR7)

### Phase 4: Producing Domain
- [x] Hub page (basic) (PR7)
- [x] Templates page (basic) (PR7)
- [x] Infobase page (basic) (PR7)
- [x] Hub (full shortcuts data) (PR8)
- [x] Templates (all sub-routes) (PR8)
- [x] Quests API (PR8)
- [x] Focus API (PR8)
- [ ] Melody builder
- [ ] Patterns
- [ ] Arrange

### Phase 5: Testing + Deploy
- [x] Unit tests (103 tests) (PR3-PR5, PR9)
- [x] E2E tests (54 tests) (PR9)
- [ ] Cloudflare deployment (PR10)
- [ ] Production verification (PR10)

---

## References

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- [Auth.js D1 Adapter](https://authjs.dev/getting-started/adapters/d1)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)


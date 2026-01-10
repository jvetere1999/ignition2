# Ignition Software Architecture

## Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT                                │
│                   Cloudflare Workers (Edge)                      │
│                      via OpenNext                                │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Next.js 16 (App Router)                │   │
│  │                        React 19                           │   │
│  │                     TypeScript 5.7                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │ Server          │  │ Client          │  │ API Routes     │   │
│  │ Components      │  │ Components      │  │ (Edge Runtime) │   │
│  │ (RSC)           │  │ ("use client")  │  │                │   │
│  └─────────────────┘  └─────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION                              │
│                                                                  │
│                    Auth.js (NextAuth v5)                         │
│                      with D1 Adapter                             │
│                                                                  │
│              OAuth Providers: Google, Discord                    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│                                                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────┐     │
│  │    Cloudflare D1        │    │    Cloudflare R2        │     │
│  │    (SQLite DB)          │    │    (Blob Storage)       │     │
│  │                         │    │                         │     │
│  │  - Users & Auth         │    │  - Audio files          │     │
│  │  - Focus sessions       │    │  - User uploads         │     │
│  │  - Quests & Progress    │    │  - Binary assets        │     │
│  │  - Gamification         │    │                         │     │
│  │  - Habits & Goals       │    │                         │     │
│  │  - Market & Wallet      │    │                         │     │
│  │  - All user state       │    │                         │     │
│  └─────────────────────────┘    └─────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated app routes
│   │   ├── focus/          # Focus timer
│   │   ├── quests/         # Quests & challenges
│   │   ├── habits/         # Habit tracking
│   │   ├── goals/          # Goal management
│   │   ├── progress/       # Skill wheel & stats
│   │   ├── market/         # Rewards shop
│   │   ├── learn/          # Learning modules
│   │   ├── exercise/       # Fitness tracking
│   │   ├── books/          # Reading tracker
│   │   ├── ideas/          # Idea capture
│   │   ├── infobase/       # Knowledge base
│   │   └── calendar/       # Planning
│   ├── api/                # API Routes (Edge)
│   │   ├── auth/           # Auth endpoints
│   │   ├── focus/          # Focus session CRUD
│   │   ├── quests/         # Quest operations
│   │   ├── habits/         # Habit CRUD
│   │   ├── goals/          # Goals CRUD
│   │   ├── market/         # Market & purchases
│   │   ├── gamification/   # XP, coins, achievements
│   │   └── ...             # Other feature APIs
│   └── layout.tsx          # Root layout
│
├── components/
│   ├── shell/              # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── AppShell.tsx
│   │   └── BottomBar.tsx
│   ├── ui/                 # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── focus/              # Focus-specific
│   ├── quests/             # Quest-specific
│   ├── audio/              # Audio visualizer
│   └── progress/           # Skill wheel
│
├── lib/
│   ├── auth/               # Auth.js configuration
│   │   └── index.ts
│   ├── db/                 # Database layer
│   │   ├── types.ts        # Entity types
│   │   └── repositories/   # Repository pattern
│   │       ├── users.ts
│   │       ├── focus.ts
│   │       ├── quests.ts
│   │       ├── gamification.ts
│   │       ├── market.ts
│   │       └── ...
│   ├── storage/            # R2 & localStorage
│   │   ├── r2-client.ts
│   │   └── deprecation.ts  # localStorage control
│   ├── data/               # Static data
│   ├── theme/              # Theme provider
│   ├── hooks/              # Custom hooks
│   └── perf/               # Performance utils
│
├── styles/
│   └── tokens.css          # Design tokens
│
migrations/
├── 0100_master_reset.sql   # Single consolidated schema
└── deprecated/             # Old migrations (reference)

tests/                      # Playwright E2E tests
docs/                       # Documentation
```

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────>│  API Route  │────>│ Repository  │
│  Component  │     │   (Edge)    │     │   (D1)      │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   ▼
       │                   │            ┌─────────────┐
       │                   └───────────>│     D1      │
       │                                │  (SQLite)   │
       │                                └─────────────┘
       │
       ▼
┌─────────────┐
│ localStorage│  (Cosmetic UI only: theme, collapsed state)
└─────────────┘
```

## Key Design Principles

1. **Online-First**: D1 is the source of truth for all behavior-affecting state
2. **Edge Runtime**: All API routes run on Cloudflare Workers (no Node.js APIs)
3. **Server Components Default**: Use RSC unless interactivity required
4. **Repository Pattern**: Database access through typed repositories
5. **Feature Flags**: Quarantine uncertain features behind flags

## Storage Rules

| Storage | Use For |
|---------|---------|
| **D1** | All user data, sessions, progress, gamification, market |
| **R2** | Audio files, user uploads, binary blobs |
| **localStorage** | Theme, sidebar collapse (cosmetic only) |

## Testing Strategy

- **Vitest**: Unit tests for utilities and pure functions
- **Playwright**: E2E tests for user flows and pages

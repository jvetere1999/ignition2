# Ignition System Guide

## Overview

Ignition is a **starter engine** - not a planner, not a habit tracker, not a "do more" system. It helps users **begin** with minimal friction and build momentum naturally.

## Core Philosophy

### Starter Engine Principles
1. **Minimal friction to begin** - One dominant action, never overwhelming choice
2. **State-aware next action** - Server computes what to show based on user state
3. **Small wins, quick starts** - 5-minute focus sessions, one quest at a time
4. **Gentle recovery after gaps** - Reduced mode for returning users (48h+ inactive)

### Gamification Alignment
- Events drive rewards; rewards are ledger-based and idempotent
- Achievements are data-driven deterministic rules
- Never turn Today into a dashboard - show "next reward" teaser only
- Market purchases are ledger-based and cannot go negative

---

## Architecture

### Stack
- **Framework**: Next.js 16 (App Router) + React 19
- **Runtime**: Cloudflare Workers via OpenNext
- **Database**: Cloudflare D1 (SQLite)
- **Blob Storage**: Cloudflare R2
- **Auth**: Auth.js (NextAuth v5) with D1 adapter

### Data Flow

```
User Action
    |
    v
API Route (validates + authorizes)
    |
    v
Repository (D1 queries)
    |
    v
Activity Event (logged)
    |
    v
Side Effects:
  - XP/Coins awarded
  - Quest progress updated
  - Streaks updated
  - Achievements checked
    |
    v
Response (with rewards if earned)
```

### Module Boundaries

```
src/
  app/              # Pages and API routes
    (app)/          # Authenticated app routes
    api/            # API endpoints
  components/       # React components
    shell/          # Layout (Header, Sidebar, AppShell)
    ui/             # Base components (Button, Card)
    onboarding/     # Onboarding modal and provider
  lib/              # Shared utilities
    auth/           # Auth.js config
    db/             # D1 repositories
      repositories/ # Database access layer
    storage/        # R2 client
    today/          # Today page logic
    focus/          # Focus session management
    flags/          # Feature flags
```

---

## Key Systems

### 1. Today Resolution

The Today page uses server-side resolution to determine:
- Which CTA to show (StarterBlock)
- Which sections are visible
- Whether to show reduced mode
- What dynamic UI elements to display

**Resolution Priority:**
1. Onboarding active -> drive onboarding
2. Plan exists with incomplete items -> continue plan
3. User personalization -> weighted module fallback
4. Default fallback -> Focus > Quests > Learn

**State Sources:**
- D1: plan, focus sessions, streaks, last activity
- D1: user_settings, user_interests, user_ui_modules
- sessionStorage: soft landing (ephemeral)

### 2. Gamification

**Three Currencies:**
- **Coins** - Spend in Market for rewards
- **XP** - Accumulates for level progression
- **Skill Stars** - Per-skill progression

**Reward Distribution:**
- Focus complete: 25 XP, 10 coins
- Workout complete: 50 XP, 25 coins
- Lesson complete: 30 XP, 15 coins
- Quest complete: Variable (defined in quest)

**Achievements:**
- Stored in `achievement_definitions` (seeded)
- Checked automatically on every activity event
- Awards coins, XP, and/or skill stars

### 3. Onboarding

**Flow:**
1. First login -> OnboardingModal appears
2. User progresses through steps (or skips)
3. Choices persist to D1:
   - Interests -> `user_interests`
   - Module weights -> `user_ui_modules`
   - Settings -> `user_settings`
4. Onboarding state tracked in `user_onboarding_state`

**Step Types:**
- `explain` - Information with icon
- `tour` - Spotlight UI elements
- `choice` - Multi-select options
- `preference` - Single-select or toggles
- `action` - Perform a task

### 4. Focus Sessions

**Lifecycle:**
1. Start -> Creates `focus_sessions` row
2. Pause -> Saves to `focus_pause_state` (server-side)
3. Resume -> Loads pause state, continues timer
4. Complete -> Logs activity event, awards rewards
5. Abandon -> Marks session as abandoned

**Pause Persistence:**
- Uses `useFocusPause` hook for API calls
- State stored in D1 for cross-device sync
- Expires after 1 hour

### 5. Market

**Architecture:**
- Items defined in `market_items` (global or user-created)
- Purchases tracked in `user_purchases`
- Balance derived from wallet or points ledger
- Redemption tracked with `is_redeemed` flag

**Purchase Flow:**
1. User selects item
2. Confirmation modal shown
3. POST /api/market/purchase
4. Balance checked and deducted
5. Purchase recorded
6. User can redeem later

---

## Feature Flags

Feature flags control Today page behavior:

| Flag | Purpose |
|------|---------|
| `FLAG_TODAY_FEATURES_MASTER` | Master kill switch |
| `FLAG_TODAY_DECISION_SUPPRESSION_V1` | State-driven visibility |
| `FLAG_TODAY_NEXT_ACTION_RESOLVER_V1` | Resolver system |
| `FLAG_TODAY_MOMENTUM_FEEDBACK_V1` | Momentum banners |
| `FLAG_TODAY_SOFT_LANDING_V1` | Post-action soft landing |
| `FLAG_TODAY_REDUCED_MODE_V1` | 48h+ inactivity mode |
| `FLAG_TODAY_DYNAMIC_UI_V1` | Personalized suggestions |

All flags default to OFF when unset.

---

## API Patterns

### Authentication
All protected routes use `createAPIHandler` which:
1. Checks auth session
2. Gets D1 database
3. Ensures user exists in D1
4. Provides typed context

### Response Format
```typescript
// Success
{ data: {...}, rewards?: { xp: number, coins: number } }

// Error
{ error: "Error message" }, { status: 4xx|5xx }
```

### Idempotency
- Activity events use entity_type + entity_id for deduplication
- Points ledger uses source_type + source_id
- Market purchases use unique purchase IDs

---

## Deployment

### Prerequisites
1. Cloudflare account with Workers, D1, R2
2. OAuth apps (Google, Microsoft Entra)
3. Wrangler CLI configured

### Commands
```bash
npm run build           # Build Next.js
npm run build:worker    # Build for Workers
npm run deploy          # Deploy to Cloudflare
```

### Secrets
Set via `wrangler secret put`:
- AUTH_SECRET
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID

### Environment Variables
Set in wrangler.toml:
- NODE_ENV, AUTH_URL, NEXT_PUBLIC_APP_URL
- ADMIN_EMAILS

---

## Troubleshooting

### User has no name/email
Check auth provider profile mapping. Ensure signIn callback denies missing email.

### Market balance wrong
Check `user_wallet` and `points_ledger` consistency. Run /api/admin/db-health.

### Onboarding not showing
Check `user_onboarding_state` for is_completed/is_dismissed flags.

### Focus pause not persisting
Verify /api/focus/pause endpoints are working. Check `focus_pause_state` table.


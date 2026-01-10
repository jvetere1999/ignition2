# API Endpoint Inventory

**Generated:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Source:** Scan of `src/app/api/**/*.ts`

---

## Summary

| Metric | Count |
|--------|-------|
| Total Route Files | 56 |
| Total Endpoints | ~75 (methods across routes) |
| Functional Domains | 22 |
| Auth Patterns | 3 (public, user, admin) |
| R2-Accessing Routes | 6 |
| Admin-Only Routes | 10 |

---

## Complete Endpoint Table

### Auth Domain (`/api/auth/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/auth/[...nextauth]` | `auth/[...nextauth]/route.ts` | GET, POST | Public | users, accounts, sessions, verification_tokens | No | UNKNOWN |
| `/api/auth/accept-tos` | `auth/accept-tos/route.ts` | GET, POST | User | users | No | UNKNOWN |
| `/api/auth/verify-age` | `auth/verify-age/route.ts` | POST | User | users | No | ~20 |

### Admin Domain (`/api/admin/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/admin/backup` | `admin/backup/route.ts` | GET | Admin | All tables (read) | No | ~150 |
| `/api/admin/cleanup-users` | `admin/cleanup-users/route.ts` | GET, DELETE | Admin | users, accounts, sessions | No | ~130 |
| `/api/admin/content` | `admin/content/route.ts` | GET, POST, DELETE | Admin | Various content tables | No | ~160 |
| `/api/admin/db-health` | `admin/db-health/route.ts` | GET, DELETE | Admin | db_metadata | No | ~180 |
| `/api/admin/feedback` | `admin/feedback/route.ts` | GET, PATCH | Admin | feedback | No | ~100 |
| `/api/admin/quests` | `admin/quests/route.ts` | GET, PATCH | Admin | universal_quests | No | ~150 |
| `/api/admin/restore` | `admin/restore/route.ts` | POST | Admin | All tables (write) | No | ~180 |
| `/api/admin/skills` | `admin/skills/route.ts` | GET, PATCH, DELETE | Admin | skill_definitions | No | ~200 |
| `/api/admin/stats` | `admin/stats/route.ts` | GET | Admin | Various (aggregates) | No | UNKNOWN |
| `/api/admin/users` | `admin/users/route.ts` | GET, DELETE | Admin | users, all user data | No | ~100 |

### User Management (`/api/user/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/user/delete` | `user/delete/route.ts` | DELETE | User | All user tables | No | ~50 |
| `/api/user/export` | `user/export/route.ts` | GET | User | All user tables | No | ~100 |

### Blob Storage (`/api/blobs/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/blobs/upload` | `blobs/upload/route.ts` | POST | User | None | **Yes** | ~100 |
| `/api/blobs/[id]` | `blobs/[id]/route.ts` | GET, DELETE, HEAD | User | None | **Yes** | ~180 |

### Focus Sessions (`/api/focus/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/focus` | `focus/route.ts` | GET, POST | User | focus_sessions | No | UNKNOWN |
| `/api/focus/active` | `focus/active/route.ts` | GET | User | focus_sessions | No | UNKNOWN |
| `/api/focus/pause` | `focus/pause/route.ts` | GET, POST, DELETE | User | focus_pause_state | No | UNKNOWN |
| `/api/focus/[id]/complete` | `focus/[id]/complete/route.ts` | POST | User | focus_sessions, points_ledger | No | ~80 |
| `/api/focus/[id]/abandon` | `focus/[id]/abandon/route.ts` | POST | User | focus_sessions | No | ~70 |

### Habits (`/api/habits/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/habits` | `habits/route.ts` | GET, POST | User | habits, habit_logs, user_streaks | No | UNKNOWN |

### Goals (`/api/goals/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/goals` | `goals/route.ts` | GET, POST | User | goals, goal_milestones | No | ~120 |

### Quests (`/api/quests/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/quests` | `quests/route.ts` | GET, POST | User | universal_quests, user_quest_progress | No | UNKNOWN |

### Calendar (`/api/calendar/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/calendar` | `calendar/route.ts` | GET, POST, PUT, DELETE | User | calendar_events | No | ~300 |

### Daily Planning (`/api/daily-plan/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/daily-plan` | `daily-plan/route.ts` | GET, POST | User | daily_plans | No | UNKNOWN |

### Exercise/Fitness (`/api/exercise/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/exercise` | `exercise/route.ts` | GET, POST, PUT, DELETE | User | exercises, workouts, workout_sessions, exercise_sets, personal_records | No | ~500 |
| `/api/exercise/seed` | `exercise/seed/route.ts` | POST | Admin | exercises | No | ~100 |

### Programs (`/api/programs/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/programs` | `programs/route.ts` | GET, POST | User | training_programs, program_weeks, program_workouts | No | ~150 |

### Books (`/api/books/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/books` | `books/route.ts` | GET, POST, DELETE | User | books, reading_sessions | No | ~250 |

### Learning (`/api/learn/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/learn` | `learn/route.ts` | GET | User | learn_topics, learn_lessons | No | UNKNOWN |
| `/api/learn/progress` | `learn/progress/route.ts` | GET, POST | User | user_lesson_progress, user_drill_stats | No | UNKNOWN |
| `/api/learn/review` | `learn/review/route.ts` | GET, POST | User | flashcard_decks, flashcards | No | UNKNOWN |

### Market/Gamification (`/api/market/`, `/api/gamification/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/market` | `market/route.ts` | GET | User | market_items, user_wallet, user_purchases | No | ~80 |
| `/api/market/items` | `market/items/route.ts` | GET, POST, PUT, DELETE | User/Admin | market_items | No | ~180 |
| `/api/market/purchase` | `market/purchase/route.ts` | POST | User | market_items, user_wallet, user_purchases, points_ledger | No | ~100 |
| `/api/market/redeem` | `market/redeem/route.ts` | POST | User | user_purchases | No | ~60 |
| `/api/gamification/teaser` | `gamification/teaser/route.ts` | GET | User | achievement_definitions, user_achievements | No | UNKNOWN |

### Onboarding (`/api/onboarding/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/onboarding` | `onboarding/route.ts` | GET | User | user_onboarding_state, onboarding_flows, onboarding_steps | No | ~80 |
| `/api/onboarding/start` | `onboarding/start/route.ts` | POST | User | user_onboarding_state | No | ~50 |
| `/api/onboarding/skip` | `onboarding/skip/route.ts` | POST | User | user_onboarding_state | No | ~50 |
| `/api/onboarding/reset` | `onboarding/reset/route.ts` | POST | User | user_onboarding_state | No | ~50 |
| `/api/onboarding/step` | `onboarding/step/route.ts` | POST | User | user_onboarding_state, user_settings, user_interests | No | ~100 |

### Infobase (`/api/infobase/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/infobase` | `infobase/route.ts` | GET, POST, PUT, DELETE | User | infobase_entries | No | ~150 |

### Ideas (`/api/ideas/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/ideas` | `ideas/route.ts` | GET, POST, PUT, DELETE | User | ideas | No | UNKNOWN |

### Analysis (`/api/analysis/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/analysis` | `analysis/route.ts` | GET, POST | User | track_analysis_cache | No | ~100 |

### Feedback (`/api/feedback/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/feedback` | `feedback/route.ts` | GET, POST | User | feedback | No | ~100 |

### Reference Tracks (`/api/reference/`)

| Route | File | Methods | Auth | D1 Tables | R2 | Lines |
|-------|------|---------|------|-----------|-----|-------|
| `/api/reference/tracks` | `reference/tracks/route.ts` | GET, POST | User | reference_tracks | No | UNKNOWN |
| `/api/reference/tracks/[id]` | `reference/tracks/[id]/route.ts` | GET, PATCH, DELETE | User | reference_tracks | **Yes** | UNKNOWN |
| `/api/reference/tracks/[id]/analysis` | `reference/tracks/[id]/analysis/route.ts` | GET, POST | User | track_analysis_cache | No | UNKNOWN |
| `/api/reference/tracks/[id]/play` | `reference/tracks/[id]/play/route.ts` | GET | User | reference_tracks | **Yes** | UNKNOWN |
| `/api/reference/tracks/[id]/stream` | `reference/tracks/[id]/stream/route.ts` | GET | User | reference_tracks | **Yes** | ~100 |
| `/api/reference/upload` | `reference/upload/route.ts` | POST | User | reference_tracks | **Yes** | ~100 |
| `/api/reference/upload/init` | `reference/upload/init/route.ts` | POST | User | None | No | UNKNOWN |

---

## Authentication Patterns

### Pattern 1: Public (No Auth)

```typescript
// Only /api/auth/[...nextauth] uses this pattern
export async function GET() {
  return NextResponse.json({ ... });
}
```

**Count:** 1 route

### Pattern 2: User Auth (via auth())

```typescript
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

**Location:** `src/lib/auth/index.ts` exports `auth`  
**Count:** ~35 routes

### Pattern 3: User Auth (via createAPIHandler)

```typescript
import { createAPIHandler, type APIContext } from "@/lib/perf";

export const GET = createAPIHandler(async (ctx: APIContext) => {
  // ctx.session, ctx.db, ctx.dbUser already validated
  return NextResponse.json({ ... });
});
```

**Location:** `src/lib/perf/api-handler.ts`  
**Count:** ~10 routes

### Pattern 4: Admin Auth

```typescript
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  // ...
}
```

**Location:** `src/lib/admin/index.ts` exports `isAdminEmail`  
**Count:** 10 routes

---

## Routes by D1 Table Access

| Table | Routes |
|-------|--------|
| `users` | auth/*, admin/users, admin/cleanup-users, user/delete, user/export |
| `accounts` | auth/*, admin/users, admin/cleanup-users |
| `sessions` | auth/*, admin/cleanup-users |
| `verification_tokens` | auth/* |
| `authenticators` | auth/* |
| `user_settings` | onboarding/step |
| `user_interests` | onboarding/step |
| `user_onboarding_state` | onboarding/* |
| `onboarding_flows` | onboarding |
| `onboarding_steps` | onboarding |
| `focus_sessions` | focus/*, focus/[id]/* |
| `focus_pause_state` | focus/pause |
| `habits` | habits |
| `habit_logs` | habits |
| `user_streaks` | habits |
| `goals` | goals |
| `goal_milestones` | goals |
| `calendar_events` | calendar |
| `daily_plans` | daily-plan |
| `exercises` | exercise, exercise/seed |
| `workouts` | exercise |
| `workout_sessions` | exercise |
| `exercise_sets` | exercise |
| `personal_records` | exercise |
| `training_programs` | programs |
| `program_weeks` | programs |
| `program_workouts` | programs |
| `books` | books |
| `reading_sessions` | books |
| `learn_topics` | learn |
| `learn_lessons` | learn |
| `user_lesson_progress` | learn/progress |
| `user_drill_stats` | learn/progress |
| `flashcard_decks` | learn/review |
| `flashcards` | learn/review |
| `market_items` | market, market/items, market/purchase |
| `user_wallet` | market, market/purchase |
| `user_purchases` | market, market/purchase, market/redeem |
| `points_ledger` | focus/[id]/complete, market/purchase |
| `achievement_definitions` | gamification/teaser |
| `user_achievements` | gamification/teaser |
| `universal_quests` | quests, admin/quests |
| `user_quest_progress` | quests |
| `skill_definitions` | admin/skills |
| `infobase_entries` | infobase |
| `ideas` | ideas |
| `feedback` | feedback, admin/feedback |
| `reference_tracks` | reference/* |
| `track_analysis_cache` | analysis, reference/tracks/[id]/analysis |
| `db_metadata` | admin/db-health |

---

## Routes Accessing R2

| Route | Operation | Method | Authorization Check |
|-------|-----------|--------|---------------------|
| `POST /api/blobs/upload` | Write | uploadBlob | userId from session |
| `GET /api/blobs/[id]` | Read | getBlobById | userId prefix in key |
| `DELETE /api/blobs/[id]` | Delete | deleteBlob | userId prefix in key |
| `HEAD /api/blobs/[id]` | Metadata | headBlob | userId prefix in key |
| `GET /api/reference/tracks/[id]/stream` | Read stream | R2 get | D1 ownership lookup |
| `GET /api/reference/tracks/[id]/play` | Read stream | R2 get | D1 ownership lookup |
| `POST /api/reference/upload` | Write | uploadBlob | userId from session |
| `DELETE /api/reference/tracks/[id]` | Delete | R2 delete | D1 ownership lookup |

---

## UNKNOWN Items Requiring Investigation

| Item | File(s) to Inspect | Notes |
|------|-------------------|-------|
| Exact line counts for many routes | All route files | Need `wc -l` scan |
| Auth handler implementation | `src/app/api/auth/[...nextauth]/route.ts` | Verify handlers export |
| Habits route full implementation | `src/app/api/habits/route.ts` | Full method list |
| Learn route implementations | `src/app/api/learn/*.ts` | Full table access |
| Quests route full implementation | `src/app/api/quests/route.ts` | All methods |
| Focus route implementations | `src/app/api/focus/route.ts` | GET vs POST logic |


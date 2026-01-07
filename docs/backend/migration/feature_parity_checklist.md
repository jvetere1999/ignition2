"Feature parity checklist tracking all API routes/features and their migration status."

# Feature Parity Checklist

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Track migration status of all API routes and features

---

## Status Legend

| Status         | Meaning                                    |
|----------------|--------------------------------------------|
| ✅ Done         | Fully ported, validated, legacy deprecated |
| 🔄 In Progress | Currently being worked on                  |
| ⏳ Not Started  | Ready to start when dependencies complete  |
| 🔒 Blocked     | Waiting on dependency or decision          |
| 🚫 Deprecated  | Will not be ported (obsolete)              |
| 🔧 Substrate   | Infrastructure, not feature                |

---

## Summary

| Category       | Schema | Routes Done | In Progress | Not Started | Blocked | Total  |
|----------------|--------|-------------|-------------|-------------|---------|--------|
| Auth/Session   | ✅     | 4           | 0           | 2           | 0       | 6      |
| Storage        | ✅     | 7           | 0           | 0           | 0       | 7      |
| API Client     | ✅     | 1           | 0           | 0           | 0       | 1      |
| Gamification   | ✅     | 0           | 0           | 2           | 0       | 2      |
| Focus          | ✅     | 0           | 0           | 5           | 0       | 5      |
| Habits         | ✅     | 0           | 0           | 1           | 0       | 1      |
| Goals          | ✅     | 0           | 0           | 1           | 0       | 1      |
| Quests         | ✅     | 0           | 0           | 1           | 0       | 1      |
| Calendar       | ✅     | 0           | 0           | 1           | 0       | 1      |
| Daily Plan     | ✅     | 0           | 0           | 1           | 0       | 1      |
| Exercise       | ⏳     | 0           | 0           | 2           | 0       | 2      |
| Books          | ⏳     | 0           | 0           | 1           | 0       | 1      |
| Programs       | ⏳     | 0           | 0           | 1           | 0       | 1      |
| Learn          | ⏳     | 0           | 0           | 3           | 0       | 3      |
| Market         | ✅     | 0           | 0           | 4           | 0       | 4      |
| Reference      | ⏳     | 0           | 0           | 6           | 0       | 6      |
| Onboarding     | ⏳     | 0           | 0           | 5           | 0       | 5      |
| User           | ⏳     | 0           | 0           | 2           | 0       | 2      |
| Feedback       | ⏳     | 0           | 0           | 1           | 0       | 1      |
| Infobase       | ⏳     | 0           | 0           | 1           | 0       | 1      |
| Ideas          | ⏳     | 0           | 0           | 1           | 0       | 1      |
| Analysis       | ⏳     | 0           | 0           | 1           | 0       | 1      |
| Admin          | ⏳     | 0           | 0           | 10          | 0       | 10     |
| **Total**      | **10/24** | **12**   | **0**       | **52**      | **0**   | **64** |

**Schema Legend:** ✅ Migration Created | ⏳ Not Yet | 🔄 In Progress

---

## Wave 0: Infrastructure (Complete)

### Auth & Session (Substrate)

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `POST /auth/google` | POST | ✅ Done | - | OAuth initiation |
| `POST /auth/azure` | POST | ✅ Done | - | OAuth initiation |
| `GET /auth/callback/:provider` | GET | ✅ Done | - | OAuth callback |
| `POST /auth/logout` | POST | ✅ Done | - | Session termination |
| `GET /health` | GET | ✅ Done | - | Health check |
| `POST /auth/accept-tos` | POST | ⏳ Not Started | - | ToS acceptance |
| `POST /auth/verify-age` | POST | ⏳ Not Started | - | Age verification |

**Evidence:** `app/backend/crates/api/src/routes/auth.rs`, 20 auth tests passing

### API Client Infrastructure

| Component | Status | PR | Notes |
|-----------|--------|-----|-------|
| `@ignition/api-client` | ✅ Done | - | Shared API client package |

**Evidence:** `shared/api-client/`, Playwright tests in `tests/storage.spec.ts`

**Deliverables:**
- `shared/api-client/src/client.ts` - Core API client
- `shared/api-client/src/server.ts` - Server Component client
- `shared/api-client/src/hooks.ts` - React hooks
- `docs/frontend/migration/api_swap_progress.md` - Swap tracking

### Storage (R2)

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/blobs/upload` | POST | ✅ Done | - | Multipart upload |
| `/api/blobs/upload-url` | POST | ✅ Done | - | Signed upload URL |
| `/api/blobs/:id` | GET, DELETE | ✅ Done | - | Blob operations |
| `/api/blobs/:id/info` | GET | ✅ Done | - | Blob metadata |
| `/api/blobs/:id/download-url` | GET | ✅ Done | - | Signed download URL |
| `/api/blobs` | GET | ✅ Done | - | List blobs |
| `/api/blobs/usage` | GET | ✅ Done | - | Storage usage |

**Evidence:** `app/backend/crates/api/src/routes/blobs.rs`, 15 storage tests passing

---

## Wave 1: Foundation

### Gamification

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/gamification/teaser` | GET | ⏳ Not Started | - | Achievement teaser |
| `/api/gamification/summary` | GET | ⏳ Not Started | - | User progress + wallet |

**Tables:** user_progress, user_wallet, points_ledger, user_achievements, achievement_definitions, user_skills, skill_definitions

**Dependencies:** None

**Priority:** 1.1 (First feature to port)

---

### Focus

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/focus` | GET, POST | ⏳ Not Started | - | List/create sessions |
| `/api/focus/active` | GET | ⏳ Not Started | - | Get active session |
| `/api/focus/pause` | GET, POST, DELETE | ⏳ Not Started | - | Pause state |
| `/api/focus/:id/complete` | POST | ⏳ Not Started | - | Complete session (XP) |
| `/api/focus/:id/abandon` | POST | ⏳ Not Started | - | Abandon session |

**Tables:** focus_sessions, focus_pause_state

**Dependencies:** Gamification (XP awarding)

**Priority:** 1.2

---

### Habits

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/habits` | GET, POST | ⏳ Not Started | - | CRUD + streak logic |

**Tables:** habits, habit_logs, user_streaks

**Dependencies:** Gamification (streak tracking)

**Priority:** 1.3

---

### Goals

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/goals` | GET, POST | ⏳ Not Started | - | CRUD + milestones |

**Tables:** goals, goal_milestones

**Dependencies:** None

**Priority:** 1.4

---

## Wave 2: Core Features

### Quests

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/quests` | GET, POST | ⏳ Not Started | - | Quest progress |

**Tables:** quests, universal_quests, user_quest_progress

**Dependencies:** Gamification

**Priority:** 2.1

---

### Calendar

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/calendar` | GET, POST, PUT, DELETE | ⏳ Not Started | - | Full CRUD |

**Tables:** calendar_events

**Dependencies:** None

**Priority:** 2.2

---

### Daily Plan

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/daily-plan` | GET, POST | ⏳ Not Started | - | Daily planning |

**Tables:** daily_plans

**Dependencies:** None

**Priority:** 2.3

---

### Feedback

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/feedback` | GET, POST | ⏳ Not Started | - | User feedback |

**Tables:** feedback

**Dependencies:** None

**Priority:** 2.4

---

## Wave 3: Complex Features

### Exercise

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/exercise` | GET, POST, PUT, DELETE | ⏳ Not Started | - | Full CRUD |
| `/api/exercise/seed` | POST | ⏳ Not Started | - | Seed exercises (admin) |

**Tables:** exercises, workouts, workout_sections, workout_exercises, workout_sessions, exercise_sets, personal_records

**Dependencies:** Gamification

**Priority:** 3.1

---

### Books

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/books` | GET, POST, DELETE | ⏳ Not Started | - | Book tracking |

**Tables:** books, reading_sessions

**Dependencies:** Gamification

**Priority:** 3.2

---

### Programs

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/programs` | GET, POST | ⏳ Not Started | - | Training programs |

**Tables:** training_programs, program_weeks, program_workouts

**Dependencies:** Exercise

**Priority:** 3.3

---

### Market

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/market` | GET | ⏳ Not Started | - | Market overview |
| `/api/market/items` | GET, POST, PUT, DELETE | ⏳ Not Started | - | Item CRUD |
| `/api/market/purchase` | POST | ⏳ Not Started | - | Purchase item |
| `/api/market/redeem` | POST | ⏳ Not Started | - | Redeem purchase |

**Tables:** market_items, user_purchases, user_wallet, points_ledger

**Dependencies:** Gamification

**Priority:** 3.4

---

## Wave 4: Specialized Features

### Learn

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/learn` | GET | ⏳ Not Started | - | Topics/lessons |
| `/api/learn/progress` | GET, POST | ⏳ Not Started | - | Lesson progress |
| `/api/learn/review` | GET, POST | ⏳ Not Started | - | Flashcards |

**Tables:** learn_topics, learn_lessons, learn_drills, user_lesson_progress, user_drill_stats, flashcard_decks, flashcards

**Dependencies:** Gamification

**Priority:** 4.1

---

### Reference Tracks

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/reference/tracks` | GET, POST | ⏳ Not Started | - | List/upload tracks |
| `/api/reference/tracks/:id` | GET, PATCH, DELETE | ⏳ Not Started | - | Track operations |
| `/api/reference/tracks/:id/analysis` | GET, POST | ⏳ Not Started | - | Audio analysis |
| `/api/reference/tracks/:id/play` | GET | ⏳ Not Started | - | Play stream |
| `/api/reference/tracks/:id/stream` | GET | ⏳ Not Started | - | Stream audio |
| `/api/reference/upload` | POST | ⏳ Not Started | - | Upload track |

**Tables:** reference_tracks, track_analysis_cache

**Dependencies:** R2 Storage (done)

**Priority:** 4.2

---

### Onboarding

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/onboarding` | GET | ⏳ Not Started | - | Get state |
| `/api/onboarding/start` | POST | ⏳ Not Started | - | Start flow |
| `/api/onboarding/skip` | POST | ⏳ Not Started | - | Skip flow |
| `/api/onboarding/reset` | POST | ⏳ Not Started | - | Reset flow |
| `/api/onboarding/step` | POST | ⏳ Not Started | - | Complete step |

**Tables:** user_onboarding_state, onboarding_flows, onboarding_steps, user_settings, user_interests

**Dependencies:** User settings

**Priority:** 4.3

---

### Infobase

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/infobase` | GET, POST, PUT, DELETE | ⏳ Not Started | - | Knowledge base |

**Tables:** infobase_entries

**Dependencies:** None

**Priority:** 4.4

---

### Ideas

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/ideas` | GET, POST, PUT, DELETE | ⏳ Not Started | - | Idea capture |

**Tables:** ideas

**Dependencies:** None

**Priority:** 4.5

---

### Analysis

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/analysis` | GET, POST | ⏳ Not Started | - | Track analysis |

**Tables:** track_analysis_cache

**Dependencies:** Reference tracks

**Priority:** 4.6

---

## Wave 5: User & Admin

### User Management

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/user/delete` | DELETE | ⏳ Not Started | - | Delete account |
| `/api/user/export` | GET | ⏳ Not Started | - | Export data |

**Tables:** All user tables

**Dependencies:** All features

**Priority:** 5.1

---

### Admin Routes

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/admin/users` | GET, DELETE | ⏳ Not Started | - | User management |
| `/admin/cleanup-users` | GET, DELETE | ⏳ Not Started | - | Cleanup users |
| `/admin/stats` | GET | ⏳ Not Started | - | Dashboard stats |
| `/admin/feedback` | GET, PATCH | ⏳ Not Started | - | Feedback moderation |
| `/admin/quests` | GET, PATCH | ⏳ Not Started | - | Quest management |
| `/admin/skills` | GET, PATCH, DELETE | ⏳ Not Started | - | Skill definitions |
| `/admin/content` | GET, POST, DELETE | ⏳ Not Started | - | Content management |
| `/admin/db-health` | GET, DELETE | ⏳ Not Started | - | DB health check |
| `/admin/backup` | GET | ⏳ Not Started | - | Create backup |
| `/admin/restore` | POST | ⏳ Not Started | - | Restore backup |

**Tables:** All tables

**Dependencies:** All features

**Priority:** 5.2

---

## Auth Routes (Legacy NextAuth - To Be Replaced)

| Route | Methods | Status | PR | Notes |
|-------|---------|--------|-----|-------|
| `/api/auth/[...nextauth]` | GET, POST | ✅ Done | - | Replaced by /auth/* |
| `/api/auth/accept-tos` | GET, POST | ⏳ Not Started | - | ToS acceptance |
| `/api/auth/verify-age` | POST | ⏳ Not Started | - | Age verification |

---

## Deprecated/Not Porting

| Route | Reason |
|-------|--------|
| (none identified yet) | - |

---

## Migration Progress Timeline

```
Wave 0: Infrastructure     ████████████████████ 100% (6/6)
Wave 1: Foundation         ░░░░░░░░░░░░░░░░░░░░   0% (0/9)
Wave 2: Core Features      ░░░░░░░░░░░░░░░░░░░░   0% (0/4)
Wave 3: Complex Features   ░░░░░░░░░░░░░░░░░░░░   0% (0/8)
Wave 4: Specialized        ░░░░░░░░░░░░░░░░░░░░   0% (0/17)
Wave 5: User & Admin       ░░░░░░░░░░░░░░░░░░░░   0% (0/12)
────────────────────────────────────────────────────────
Overall Progress           ███░░░░░░░░░░░░░░░░░  11% (6/56)
```

---

## Next Actions

1. **Start Wave 1.1:** Gamification
   - Create `0002_gamification.sql` migration
   - Implement gamification repository
   - Add shared types
   - Implement routes
   - Add tests

2. **Update This Document:**
   - After each feature completion
   - Update status and PR links

---

## References

- [feature_porting_playbook.md](./feature_porting_playbook.md) - Porting process
- [api_endpoint_inventory.md](./api_endpoint_inventory.md) - All endpoints
- [d1_usage_inventory.md](./d1_usage_inventory.md) - D1 tables
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase status


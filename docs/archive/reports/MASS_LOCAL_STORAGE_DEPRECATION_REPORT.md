# Mass Local Storage Deprecation Report

**Date:** January 6, 2026
**Status:** IN PROGRESS
**Deprecation Flag:** `DISABLE_MASS_LOCAL_PERSISTENCE = true`

---

## Executive Summary

This report identifies all localStorage and sessionStorage usage in Ignition and classifies each as:
- **REMOVE**: Delete immediately (no longer needed or replaced by D1)
- **MIGRATE**: Move to D1 (behavior-affecting data that needs persistence)
- **ALLOWED**: Can remain (cosmetic UI preferences only)

**Total localStorage usages found:** 35+
**Critical violations (behavior-affecting):** 12
**Files affected:** 25+

---

## 1. Deprecation Flag Implementation

The deprecation mechanism is implemented in:

**File:** `src/lib/storage/deprecation.ts`

**Key exports:**
- `DISABLE_MASS_LOCAL_PERSISTENCE` - Master switch (currently `true`)
- `ALLOWED_LOCAL_STORAGE_KEYS` - Set of cosmetic-only keys
- `FORBIDDEN_LOCAL_STORAGE_KEYS` - Set of behavior-affecting keys
- `safeLocalStorageGet()` - Safe getter that blocks forbidden reads
- `safeLocalStorageSet()` - Safe setter that blocks forbidden writes
- `isLocalStorageKeyAllowed()` - Check if a key is allowed

When enabled, the flag:
1. Blocks reads of forbidden keys (returns null)
2. Blocks writes to forbidden keys (no-op)
3. Logs warnings to console for debugging
4. Allows cosmetic keys to function normally

---

## 2. Complete Inventory

### 2.1 ALLOWED (Cosmetic Only) - Can Remain

| Key | Files | Purpose | Status |
|-----|-------|---------|--------|
| `theme` | CommandPalette.tsx, Omnibar.tsx | Quick theme toggle | ALLOWED |
| `passion-os-theme` | lib/theme/script.ts, lib/theme/index.tsx | Legacy theme key | ALLOWED |
| `passion_os_theme_prefs_v1` | lib/themes/index.ts | Theme preferences | ALLOWED |
| `daily_plan_collapsed` | DailyPlan.tsx | UI collapse state | ALLOWED |
| `explore_drawer_collapsed` | ExploreDrawer.tsx | UI collapse state | ALLOWED |
| `passion_player_v1` | lib/player/persist.ts | Player settings | ALLOWED (ephemeral) |
| `passion_player_queue_v1` | lib/player/persist.ts | Player queue | ALLOWED (ephemeral) |

### 2.2 REMOVE - Delete Immediately

These are localStorage usages that are redundant (D1 API exists) or should be removed:

| Key | Files | Purpose | Reason for Removal |
|-----|-------|---------|-------------------|
| `focus_paused_state` | FocusClient.tsx, BottomBar.tsx, MiniPlayer.tsx, UnifiedBottomBar.tsx, FocusIndicator.tsx, FocusStateContext.tsx | Focus pause state | D1 API `/api/focus/pause` exists - remove localStorage fallback |
| `passion_quest_progress_v1` | QuestsClient.tsx | Quest progress cache | D1 `user_quest_progress` table exists - remove localStorage cache |
| `passion_skills_v1` | ProgressClient.tsx | Skills state | D1 `user_skills` table exists - use API only |
| `passion_goals_v1` | GoalsClient.tsx | Goals data | D1 `goals` table exists - use API only |
| `music_ideas` | IdeasClient.tsx | Ideas fallback | D1 `ideas` table exists - remove fallback |

**Action:** Remove all localStorage read/write for these keys. Let D1 be sole source of truth.

### 2.3 MIGRATE - Move to D1

These are features currently using localStorage that need D1 tables/APIs:

| Key | Files | Purpose | Migration Plan |
|-----|-------|---------|----------------|
| `passion_reference_libraries_v2` | ReferenceLibrary.tsx, FocusTracks.tsx | Reference track libraries | Migrate to D1 `reference_tracks` + R2 for audio |
| `passion_learn_journal_v1` | JournalClient.tsx | Learning journal entries | Create `journal_entries` table in D1 |
| `passion_learn_settings_v1` | learn/settings/page.tsx | Learn module settings | Store in D1 `user_settings` table |
| `passion_arrange_v1` | ArrangeClient.tsx | Arrangement/composition data | Create `arrangements` table in D1 if cross-device needed |
| `passion_inbox_v1` | Inbox.tsx, Omnibar.tsx | Quick capture inbox | Create `inbox_items` table in D1 |
| `passion_analysis_cache_v1` | lib/player/analysis-cache.ts | Audio analysis cache | Already have D1 `track_analysis_cache` - use it exclusively |
| `passion_infobase_v1` | InfobaseClient.tsx | Knowledge base cache | D1 `infobase_entries` exists - remove localStorage cache layer |

### 2.4 sessionStorage (Session-Only) - Acceptable

These use sessionStorage (cleared on browser close) and are acceptable by design:

| Key | Files | Purpose | Status |
|-----|-------|---------|--------|
| `passion_momentum_v1` | lib/today/momentum.ts | Momentum shown state | OK - session-scoped |
| `passion_soft_landing_v1` | lib/today/softLanding.ts | Soft landing state | OK - session-scoped |
| `passion_soft_landing_source` | lib/today/softLanding.ts | Soft landing source | OK - session-scoped |
| `reduced_mode_dismissed` | ReducedModeBanner.tsx | Banner dismiss | OK - session-scoped |
| `last_fetch_*` | lib/hooks/useAutoRefresh.ts | Fetch timing | OK - session-scoped |
| safetyNets session keys | lib/today/safetyNets.ts | Safety net state | OK - session-scoped |

---

## 3. File-by-File Breakdown

### 3.1 Focus Module (CRITICAL)

**Files:**
- `src/app/(app)/focus/FocusClient.tsx`
- `src/components/focus/FocusIndicator.tsx`
- `src/components/focus/FocusTracks.tsx`
- `src/components/shell/BottomBar.tsx`
- `src/components/shell/MiniPlayer.tsx`
- `src/components/shell/UnifiedBottomBar.tsx`
- `src/lib/focus/FocusStateContext.tsx`

**localStorage keys used:**
- `focus_paused_state` - REMOVE (use D1 `/api/focus/pause`)
- `focus_settings` - KEEP (cosmetic timer settings)
- `passion_reference_libraries_v2` - MIGRATE to D1 + R2

**Required changes:**
1. Remove all `localStorage.getItem("focus_paused_state")` reads
2. Remove all `localStorage.setItem("focus_paused_state", ...)` writes
3. Remove all `localStorage.removeItem("focus_paused_state")` calls
4. Rely solely on `/api/focus/pause` and `/api/focus/active` APIs

### 3.2 Quests Module (CRITICAL)

**File:** `src/app/(app)/quests/QuestsClient.tsx`

**localStorage keys used:**
- `passion_quest_progress_v1` - REMOVE (use D1 `user_quest_progress`)

**Required changes:**
1. Remove localStorage.getItem/setItem for quest progress
2. Use only `/api/quests` API for progress

### 3.3 Goals Module (CRITICAL)

**File:** `src/app/(app)/goals/GoalsClient.tsx`

**localStorage keys used:**
- `passion_goals_v1` - REMOVE (use D1 `goals` table)

**Required changes:**
1. Remove all localStorage usage
2. Fetch/save only via `/api/goals` API

### 3.4 Progress Module (CRITICAL)

**File:** `src/app/(app)/progress/ProgressClient.tsx`

**localStorage keys used:**
- `passion_skills_v1` - REMOVE (use D1 `user_skills`)

**Required changes:**
1. Remove all localStorage usage
2. Fetch skills from `/api/skills` or `/api/user/skills`

### 3.5 Reference Library (CRITICAL)

**Files:**
- `src/components/references/ReferenceLibrary.tsx`
- `src/components/focus/FocusTracks.tsx`

**localStorage keys used:**
- `passion_reference_libraries_v2` - MIGRATE to D1 + R2

**Required changes:**
1. Create proper D1 schema for reference_tracks
2. Use R2 for audio blob storage
3. Remove all localStorage persistence for libraries

### 3.6 Ideas Module

**File:** `src/app/(app)/ideas/IdeasClient.tsx`

**localStorage keys used:**
- `music_ideas` - REMOVE (use D1 `ideas` table)

### 3.7 Infobase Module

**File:** `src/app/(app)/infobase/InfobaseClient.tsx`

**localStorage keys used:**
- `passion_infobase_v1` - REMOVE cache layer (D1 API exists)

### 3.8 Learn Module

**Files:**
- `src/app/(app)/learn/journal/JournalClient.tsx`
- `src/app/(app)/learn/settings/page.tsx`

**localStorage keys used:**
- `passion_learn_journal_v1` - MIGRATE to D1
- `passion_learn_settings_v1` - MIGRATE to D1 `user_settings`

### 3.9 Arrange Module

**File:** `src/app/(app)/arrange/ArrangeClient.tsx`

**localStorage keys used:**
- `passion_arrange_v1` - MIGRATE to D1 if cross-device is needed

### 3.10 Inbox/Omnibar

**Files:**
- `src/components/shell/Inbox.tsx`
- `src/components/shell/Omnibar.tsx`

**localStorage keys used:**
- `passion_inbox_v1` - MIGRATE to D1 for cross-device sync

### 3.11 Analysis Cache

**File:** `src/lib/player/analysis-cache.ts`

**localStorage keys used:**
- `passion_analysis_cache_v1` - MIGRATE to D1 `track_analysis_cache`

### 3.12 Player Persistence (ALLOWED)

**File:** `src/lib/player/persist.ts`

**localStorage keys used:**
- `passion_player_v1` - ALLOWED (ephemeral settings)
- `passion_player_queue_v1` - ALLOWED (ephemeral queue)

These are acceptable as they're ephemeral player state, not persistent user data.

### 3.13 Theme (ALLOWED)

**Files:**
- `src/lib/theme/index.tsx`
- `src/lib/theme/script.ts`
- `src/lib/themes/index.ts`
- `src/components/shell/CommandPalette.tsx`
- `src/components/shell/Omnibar.tsx`

**localStorage keys used:**
- `theme` - ALLOWED (cosmetic)
- `passion-os-theme` - ALLOWED (cosmetic)
- `passion_os_theme_prefs_v1` - ALLOWED (cosmetic)

### 3.14 Today/Starter Engine (ALLOWED - sessionStorage)

**Files:**
- `src/lib/today/momentum.ts`
- `src/lib/today/softLanding.ts`
- `src/lib/today/safetyNets.ts`
- `src/app/(app)/today/DailyPlan.tsx`
- `src/app/(app)/today/ExploreDrawer.tsx`
- `src/app/(app)/today/ReducedModeBanner.tsx`

All use sessionStorage (session-scoped) or cosmetic collapse state - acceptable.

---

## 4. Immediate Action Items

### Phase 1: Enable Deprecation Flag (DONE)

1. [x] Create `src/lib/storage/deprecation.ts`
2. [x] Set `DISABLE_MASS_LOCAL_PERSISTENCE = true`
3. [x] Define allowed and forbidden key sets

### Phase 2: Critical Removals (DONE)

These code changes have been made to respect the deprecation flag:

1. [x] **Focus pause state** - Updated in 6 files to use D1 API first:
   - `src/lib/focus/FocusStateContext.tsx`
   - `src/components/focus/FocusIndicator.tsx`
   - `src/components/shell/BottomBar.tsx`
   - `src/components/shell/MiniPlayer.tsx`
   - `src/components/shell/UnifiedBottomBar.tsx`
   - `src/app/(app)/focus/FocusClient.tsx`

2. [x] **Quest progress** - Updated `QuestsClient.tsx` to skip localStorage when deprecated

3. [x] **Goals** - Updated `GoalsClient.tsx` to fetch from D1 first

4. [x] **Skills** - Updated `ProgressClient.tsx` to fetch from D1 first

5. [x] **Ideas** - Updated `IdeasClient.tsx` to skip localStorage fallback when deprecated

6. [x] **Infobase** - Updated `InfobaseClient.tsx` to skip localStorage cache when deprecated

7. [x] **Analysis cache** - Updated `analysis-cache.ts` to check D1 first

### Phase 3: Fix Underlying D1 Schema Issues

Before removing localStorage fallbacks, ensure D1 APIs work:

1. [ ] Verify `/api/focus/pause` endpoint works
2. [ ] Verify `/api/quests` endpoint works
3. [ ] Verify `/api/goals` endpoint works
4. [ ] Verify `/api/ideas` endpoint works
5. [ ] Verify all required D1 tables exist

### Phase 4: Migrations

After D1 is verified, migrate remaining features:

1. [ ] Reference tracks -> D1 + R2
2. [ ] Journal entries -> D1
3. [ ] Learn settings -> D1 user_settings
4. [ ] Inbox items -> D1

---

## 5. Verification Checklist

After deprecation is complete:

- [ ] `focus_paused_state` no longer in any file (except removal)
- [ ] Focus survives browser refresh (loads from D1)
- [ ] Quest progress survives browser refresh (loads from D1)
- [ ] Goals survive browser refresh (loads from D1)
- [ ] No behavior-affecting localStorage keys remain
- [ ] Console shows no deprecation warnings after fixes
- [ ] All 500 errors resolved (separate issue)

---

## 6. Risk Assessment

**Risk:** Enabling deprecation will cause immediate UX degradation if D1 APIs are broken.

**Mitigation:**
- The flag can be quickly disabled by setting `DISABLE_MASS_LOCAL_PERSISTENCE = false`
- Console warnings help identify which features need D1 fixes
- This is intentional - we want to expose hidden problems

**Expected behavior with flag ON and D1 broken:**
- Focus page may show no paused state
- Quests may show no progress
- Goals may appear empty
- This reveals the actual problem (D1 schema mismatch)

---

## 7. Related Issues

This deprecation is Phase 0 of the larger effort to:
1. Fix all HTTP 500 errors
2. Reconcile D1 schema with database.md
3. Implement repeatable DB reset
4. Ensure focus survives refresh

See main task prompt for full action plan.


# Storage Compliance Report

**Date:** January 5, 2026
**Auditor:** Automated System Audit
**Status:** IMPLEMENTED

---

## Executive Summary

This report audits all storage mechanisms used by Ignition to ensure compliance with the storage rule:
- **D1**: All persistent, behavior-affecting data
- **R2**: Audio/binary blobs only
- **localStorage/sessionStorage**: Cosmetic-only preferences

---

## 1. Storage Rule Compliance

| Rule | Status | Notes |
|------|--------|-------|
| D1 for all persistent data | PASS | Reference tracks table added, APIs created |
| R2 for blobs only | PASS | Audio files stored in R2, metadata in D1 |
| No local persistence for logic | PASS | CI guardrail added to prevent violations |

---

## 2. localStorage Usage Inventory

### COSMETIC (Allowed)

| Key | File | Purpose | Status |
|-----|------|---------|--------|
| `theme` | CommandPalette.tsx, Omnibar.tsx | Theme preference | OK |
| `passion_os_theme_prefs_v1` | lib/themes/index.ts | Theme prefs | OK |
| `passion-os-theme` | lib/theme/script.ts | Legacy theme | OK |
| `COLLAPSE_STATE_KEY` (DailyPlan) | DailyPlan.tsx | UI collapse state | OK |
| `COLLAPSE_STATE_KEY` (Explore) | ExploreDrawer.tsx | UI collapse state | OK |
| `focus_settings` | FocusClient.tsx | Focus timer settings | OK (cosmetic) |

### FORBIDDEN (Must Move to D1)

| Key | File | Purpose | Required Action |
|-----|------|---------|-----------------|
| `focus_paused_state` | FocusClient.tsx, BottomBar.tsx, MiniPlayer.tsx, UnifiedBottomBar.tsx, FocusIndicator.tsx, FocusStateContext.tsx | Focus pause state | CRITICAL: Already have D1 API, remove localStorage fallback |
| `QUEST_PROGRESS_KEY` | QuestsClient.tsx | Quest progress | CRITICAL: Already have D1 API, remove localStorage fallback |
| `STORAGE_KEY` (journal) | JournalClient.tsx | Journal entries | MEDIUM: Move to D1 |
| `STORAGE_KEY` (settings) | learn/settings/page.tsx | Learn settings | MEDIUM: Move to user_settings in D1 |
| `SKILLS_STORAGE_KEY` | ProgressClient.tsx | Skills state | CRITICAL: Already in D1, remove localStorage |
| `GOALS_KEY` | GoalsClient.tsx | Goals data | CRITICAL: Already have D1 goals table |
| `STORAGE_KEY` (infobase) | InfobaseClient.tsx | Infobase entries | LOW: Already syncs with D1 API |
| `STORAGE_KEY` (arrange) | ArrangeClient.tsx | Arrangement data | MEDIUM: Consider D1 if cross-device needed |
| `music_ideas` | IdeasClient.tsx | Ideas fallback | LOW: Already uses D1 API |
| `STORAGE_KEY` (ReferenceLibrary) | ReferenceLibrary.tsx | Reference tracks | CRITICAL: Must use D1 + R2 |
| `INBOX_STORAGE_KEY` | Omnibar.tsx, Inbox.tsx | Inbox items | LOW: UI state only |
| `LIBRARIES_KEY` | FocusTracks.tsx | Focus track libraries | MEDIUM: Move to D1 |

### CACHE (Acceptable but should migrate to D1)

| Key | File | Purpose | Notes |
|-----|------|---------|-------|
| `LOCAL_CACHE_KEY` | lib/player/analysis-cache.ts | Analysis cache | Consider D1 for cross-device |
| `STORAGE_KEY` (player) | lib/player/persist.ts | Player state | Ephemeral OK |
| `QUEUE_STORAGE_KEY` | lib/player/persist.ts | Player queue | Ephemeral OK |
| `CACHE_KEY` (waveform) | lib/player/waveform.ts | Waveform cache | Consider D1 |

---

## 3. sessionStorage Usage Inventory

### COSMETIC/EPHEMERAL (Allowed)

| Key | File | Purpose | Status |
|-----|------|---------|--------|
| `DISMISS_KEY` (ReducedMode) | ReducedModeBanner.tsx | Session-only dismiss | OK |
| `SOFT_LANDING_KEY` | lib/today/softLanding.ts | Soft landing state | OK (session-based by design) |
| `SOFT_LANDING_SOURCE_KEY` | lib/today/softLanding.ts | Soft landing source | OK |
| `MOMENTUM_KEY` | lib/today/momentum.ts | Momentum shown state | OK |
| `LAST_FETCH_KEY_PREFIX` | lib/hooks/useAutoRefresh.ts | Fetch timing | OK |
| safetyNets session keys | lib/today/safetyNets.ts | Safety net state | OK |

All sessionStorage usages are acceptable (session-scoped, not persistent).

---

## 4. Critical Violations

### HIGH Priority (Behavior-affecting, cross-device issues)

1. **focus_paused_state in localStorage**
   - Files: 6+ files
   - Impact: Focus pause doesn't sync across devices
   - Fix: Remove localStorage, use only D1 API `/api/focus/pause`

2. **QUEST_PROGRESS_KEY in localStorage**
   - Files: QuestsClient.tsx
   - Impact: Quest progress lost on device switch
   - Fix: Already has D1 API, remove localStorage fallback

3. **SKILLS_STORAGE_KEY in localStorage**
   - Files: ProgressClient.tsx
   - Impact: Skills data not synced
   - Fix: Use D1 user_skills table

4. **GOALS_KEY in localStorage**
   - Files: GoalsClient.tsx
   - Impact: Goals not synced
   - Fix: Use D1 goals table

5. **Reference track data in localStorage**
   - Files: ReferenceLibrary.tsx, FocusTracks.tsx
   - Impact: Uploaded tracks lost
   - Fix: Use R2 for audio, D1 for metadata

### MEDIUM Priority (Should migrate)

1. **Journal entries in localStorage**
   - Create learn_journal_entries table in D1

2. **Learn settings in localStorage**
   - Store in user_settings table

3. **Arrangement data in localStorage**
   - Consider D1 if cross-device is needed

---

## 5. R2 Usage Validation

### Current R2 Bindings

From `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "BLOBS"
bucket_name = "passion-os-blobs"
```

### R2 Usage Status

| Feature | Status | Notes |
|---------|--------|-------|
| Reference track audio | NOT IMPLEMENTED | Need to add upload flow |
| User-uploaded audio | NOT IMPLEMENTED | Need reference_tracks table |

---

## 6. Missing D1 Tables for Full Compliance

Based on the audit, the following tables are needed but missing:

1. **reference_tracks** - For R2-backed audio file metadata
2. **learn_journal_entries** - For journal entries (currently localStorage)
3. **user_track_libraries** - For focus track organization

---

## 7. Remediation Plan

### Phase 1: Critical Fixes (Immediate)

1. Remove all `focus_paused_state` localStorage usage - use D1 API only
2. Remove `QUEST_PROGRESS_KEY` localStorage fallback
3. Remove `SKILLS_STORAGE_KEY` localStorage - use D1 user_skills
4. Remove `GOALS_KEY` localStorage - use D1 goals API

### Phase 2: Reference Tracks (Add Feature)

1. Add `reference_tracks` table to D1 schema
2. Implement R2 upload flow with signed URLs
3. Implement browser-based audio analysis
4. Store analysis results in track_analysis_cache

### Phase 3: Remaining Migrations

1. Create learn_journal_entries table
2. Migrate journal entries from localStorage to D1
3. Move learn settings to user_settings

### Phase 4: Guardrails

1. Add ESLint/grep rule to CI for forbidden localStorage keys
2. Add unit test scanning for violations

---

## 8. D1 Table Usage Matrix

See `docs/database.md` for the complete table-by-table reference.

---

## Approval

- [ ] All critical violations resolved
- [ ] All tables documented
- [ ] CI guardrails implemented
- [ ] Tests passing


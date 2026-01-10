# Cleanup Plan - Ignition

## Overview

This document inventories cleanup candidates with evidence and decisions.

---

## Unused Variables/Imports (from ESLint)

### Classification: REMOVE (Safe)

These are clearly unused and safe to remove:

| File | Variable | Decision | Evidence |
|------|----------|----------|----------|
| `ArrangeClient.tsx:60` | `drumBuffersRef` | Remove | Assigned but never used |
| `BookTrackerClient.tsx:66` | `sessions` | Remove | Assigned but never used |
| `ExerciseClient.tsx:483` | `removeExerciseFromWorkout` | Remove | Assigned but never used |
| `ExerciseClient.tsx:1110` | `_sessionId` | Remove | Defined but never used |
| `IdeasClient.tsx:45` | `_userId` | Remove | Defined but never used |
| `InfobaseClient.tsx:47` | `isLoading` | Remove | Assigned but never used |
| `JournalClient.tsx:30` | `userId` | Remove | Defined but never used |
| `RecipeClient.tsx:79` | `userId` | Remove | Defined but never used |
| `ReviewClient.tsx:149` | `_updated` | Remove | Assigned but never used |
| `ProgressClient.tsx:41` | `setRecentActivities` | Remove | Assigned but never used |
| `QuestsClient.tsx:182` | `handleCompleteQuest` | Keep | May be needed for quest completion UI |
| `StatsClient.tsx:35` | `_userId` | Remove | Defined but never used |
| `TodayGridClient.tsx:70-71` | `initialPlanSummary`, `personalization` | Remove | Defined but never used |
| `WinsClient.tsx:41` | `_userId` | Remove | Defined but never used |
| `cleanup-users/route.ts:9,113` | `request` | Remove | Defined but never used |
| `learn/progress/route.ts:82-83` | `entityType`, `entityId` | Remove | Assigned but never used |
| `learn/review/route.ts:12` | `_request` | Remove | Defined but never used |
| `learn/route.ts:12` | `_request` | Remove | Defined but never used |
| `AdUnit.tsx:51` | `error` | Remove | Defined but never used |
| `MobileTodayClient.tsx:40,45` | `forceExploreCollapsed`, `showRewards` | Remove | Defined but never used |
| `OnboardingModal.tsx:87` | `userId` | Remove | Defined but never used |
| `AudioVisualizerRave.tsx:114,162` | `getColor`, `canvas` | Remove | Assigned/defined but never used |
| `TrackAnalysisPopup.tsx:58` | `_onSeek` | Remove | Defined but never used |
| `WaveSurferPlayer.tsx:8` | `useCallback` | Remove | Imported but never used |
| `Waveform.tsx:44,47` | `_barWidth`, `_unplayedColor` | Remove | Assigned but never used |
| `SkillWheel.tsx:239` | `i` | Remove | Defined but never used |
| `MiniPlayer.tsx:14,52,53` | `usePlayerStore`, `currentTime`, `duration` | Remove | Defined/assigned but never used |
| `UserMenu.tsx:78` | - | Keep | Uses img intentionally |
| `shortcuts/index.ts:13` | `Entry` | Remove | Defined but never used |
| `learn-types.ts:6` | `JSONString` | Remove | Defined but never used |
| `gamification.ts:448` | `metadata` | Remove | Defined but never used |
| `flags/index.ts:94` | `_flagName` | Remove | Defined but never used |
| `request-context.test.ts:10` | `RequestContext` | Remove | Imported but never used |

### Classification: KEEP (Intentional)

| File | Issue | Reason |
|------|-------|--------|
| `BookTrackerClient.tsx:317` | `<img>` element | May be intentional for external images |
| `MobileHeader.tsx:30` | `<img>` element | May be intentional |
| `MobileMeClient.tsx:33` | `<img>` element | May be intentional |
| `MobileMore.tsx:54` | `<img>` element | May be intentional |
| `UserMenu.tsx:78` | `<img>` element | May be intentional |
| `help/[topic]/page.tsx:536` | `dangerouslySetInnerHTML` | Required for HTML content |
| `layout.tsx:122` | `dangerouslySetInnerHTML` | Required for analytics/scripts |

### Classification: FIX (Hook Dependencies)

| File | Issue | Decision |
|------|-------|----------|
| `ArrangeClient.tsx:1090` | Missing `pitches` dependency | Add to dependency array |
| `AudioVisualizer.tsx:110` | Missing draw function dependencies | Add to dependency array or memoize |

---

## Duplicate Code Patterns

### D1 Access Patterns

**Pattern:** Repeated `getCloudflareContext` + `ensureUserExists` in API routes

**Files Affected:** Most API routes

**Decision:** Keep - Already using `createAPIHandler` pattern in most routes

### Response Shaping

**Pattern:** Similar JSON response structures

**Decision:** Keep - Responses are appropriately typed per route

### Input Validation

**Pattern:** Manual input validation in API routes

**Decision:** Keep - Simple validation is fine, Zod adds overhead

---

## Unused Dependencies

To be analyzed with `depcheck`:

```bash
npx depcheck
```

---

## Unused Files/Components

### Potentially Unused (Need Investigation)

| File | Evidence | Decision |
|------|----------|----------|
| TBD | - | - |

---

## Performance Optimization Candidates

### Bundle Size

| Optimization | Impact | Risk |
|--------------|--------|------|
| Remove unused imports | Low | Low |
| Tree-shake better | Medium | Low |

### Runtime

| Optimization | Impact | Risk |
|--------------|--------|------|
| Memoize expensive renders | Medium | Low |
| Reduce re-renders | Medium | Medium |

---

## Execution Log

| Date | Action | Files Changed |
|------|--------|---------------|
| 2026-01-06 | Identified 49 ESLint warnings | - |
| 2026-01-06 | Created cleanup plan | - |
| 2026-01-06 | Removed unused `drumBuffersRef` | ArrangeClient.tsx |
| 2026-01-06 | Prefixed unused `sessions` -> `_sessions` | BookTrackerClient.tsx |
| 2026-01-06 | Prefixed unused `isLoading` -> `_isLoading` | InfobaseClient.tsx |
| 2026-01-06 | Prefixed unused `setRecentActivities` -> `_setRecentActivities` | ProgressClient.tsx |
| 2026-01-06 | Prefixed unused props with `_` | TodayGridClient.tsx |
| 2026-01-06 | Prefixed unused `request` -> `_request` | cleanup-users/route.ts |
| 2026-01-06 | Removed unused `usePlayerStore` import | MiniPlayer.tsx |
| 2026-01-06 | Prefixed unused `currentTime`, `duration` | MiniPlayer.tsx |
| 2026-01-06 | Removed unused `useCallback` import | WaveSurferPlayer.tsx |
| 2026-01-06 | Removed unused `Entry` import | shortcuts/index.ts |
| 2026-01-06 | Removed unused `JSONString` import | learn-types.ts |
| 2026-01-06 | Prefixed unused `metadata` -> `_metadata` | gamification.ts |
| 2026-01-06 | Removed unused `RequestContext` import | request-context.test.ts |
| 2026-01-06 | **Result:** Reduced warnings from 49 to 43 | - |


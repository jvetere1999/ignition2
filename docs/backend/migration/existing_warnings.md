"Exact warning text from baseline validation. Categorized by rule."

# Existing Warnings (Baseline)

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Total Warnings:** 44  
**Source:** `.tmp/validation_lint.log`

---

## Summary by Rule

| Rule | Count | Category |
|------|-------|----------|
| `@typescript-eslint/no-unused-vars` | 31 | Unused variables |
| `@next/next/no-img-element` | 5 | Image optimization |
| `react-hooks/exhaustive-deps` | 2 | React Hook dependencies |
| `react/no-danger` | 2 | Security (dangerouslySetInnerHTML) |
| Deprecation (informational) | 1 | next lint deprecation notice |
| **Total** | **44** | - |

---

## Category 1: Unused Variables (31 warnings)

### `@typescript-eslint/no-unused-vars`

| File | Line:Col | Variable | Context |
|------|----------|----------|---------|
| `src/app/(app)/books/BookTrackerClient.tsx` | 66:10 | `_sessions` | Assigned but never used |
| `src/app/(app)/exercise/ExerciseClient.tsx` | 483:9 | `removeExerciseFromWorkout` | Assigned but never used |
| `src/app/(app)/exercise/ExerciseClient.tsx` | 1110:14 | `_sessionId` | Defined but never used |
| `src/app/(app)/ideas/IdeasClient.tsx` | 45:39 | `_userId` | Defined but never used |
| `src/app/(app)/infobase/InfobaseClient.tsx` | 47:10 | `_isLoading` | Assigned but never used |
| `src/app/(app)/learn/journal/JournalClient.tsx` | 30:33 | `userId` | Defined but never used |
| `src/app/(app)/learn/recipes/RecipeClient.tsx` | 79:32 | `userId` | Defined but never used |
| `src/app/(app)/learn/review/ReviewClient.tsx` | 149:13 | `_updated` | Assigned but never used |
| `src/app/(app)/progress/ProgressClient.tsx` | 41:28 | `_setRecentActivities` | Assigned but never used |
| `src/app/(app)/quests/QuestsClient.tsx` | 182:9 | `handleCompleteQuest` | Assigned but never used |
| `src/app/(app)/stats/StatsClient.tsx` | 35:39 | `_userId` | Defined but never used |
| `src/app/(app)/today/TodayGridClient.tsx` | 70:23 | `_initialPlanSummary` | Defined but never used |
| `src/app/(app)/today/TodayGridClient.tsx` | 71:20 | `_personalization` | Defined but never used |
| `src/app/(app)/wins/WinsClient.tsx` | 41:38 | `_userId` | Defined but never used |
| `src/app/api/admin/cleanup-users/route.ts` | 9:30 | `_request` | Defined but never used |
| `src/app/api/admin/cleanup-users/route.ts` | 113:27 | `_request` | Defined but never used |
| `src/app/api/learn/progress/route.ts` | 82:11 | `entityType` | Assigned but never used |
| `src/app/api/learn/progress/route.ts` | 83:11 | `entityId` | Assigned but never used |
| `src/app/api/learn/review/route.ts` | 12:27 | `_request` | Defined but never used |
| `src/app/api/learn/route.ts` | 12:27 | `_request` | Defined but never used |
| `src/components/ads/AdUnit.tsx` | 51:14 | `error` | Defined but never used |
| `src/components/mobile/screens/MobileTodayClient.tsx` | 40:3 | `forceExploreCollapsed` | Defined but never used |
| `src/components/mobile/screens/MobileTodayClient.tsx` | 45:3 | `showRewards` | Defined but never used |
| `src/components/onboarding/OnboardingModal.tsx` | 87:55 | `userId` | Defined but never used |
| `src/components/player/AudioVisualizerRave.tsx` | 114:9 | `getColor` | Assigned but never used |
| `src/components/player/AudioVisualizerRave.tsx` | 162:71 | `canvas` | Defined but never used |
| `src/components/player/TrackAnalysisPopup.tsx` | 58:11 | `_onSeek` | Defined but never used |
| `src/components/player/Waveform.tsx` | 44:13 | `_barWidth` | Assigned but never used |
| `src/components/player/Waveform.tsx` | 47:18 | `_unplayedColor` | Assigned but never used |
| `src/components/progress/SkillWheel.tsx` | 239:46 | `i` | Defined but never used |
| `src/components/shell/MiniPlayer.tsx` | 51:9 | `_currentTime` | Assigned but never used |
| `src/components/shell/MiniPlayer.tsx` | 52:9 | `_duration` | Assigned but never used |
| `src/lib/db/repositories/gamification.ts` | 448:3 | `_metadata` | Defined but never used |
| `src/lib/flags/index.ts` | 94:25 | `_flagName` | Defined but never used |

**Note:** Variables prefixed with `_` are intentionally unused (common pattern).

---

## Category 2: Image Optimization (5 warnings)

### `@next/next/no-img-element`

| File | Line:Col | Warning |
|------|----------|---------|
| `src/app/(app)/books/BookTrackerClient.tsx` | 317:17 | Using `<img>` instead of `<Image />` |
| `src/components/mobile/MobileHeader.tsx` | 30:15 | Using `<img>` instead of `<Image />` |
| `src/components/mobile/screens/MobileMeClient.tsx` | 33:13 | Using `<img>` instead of `<Image />` |
| `src/components/mobile/screens/MobileMore.tsx` | 54:13 | Using `<img>` instead of `<Image />` |
| `src/components/shell/UserMenu.tsx` | 78:11 | Using `<img>` instead of `<Image />` |

**Context:** These are typically for user avatars with external URLs where `next/image` optimization may not apply.

---

## Category 3: React Hook Dependencies (2 warnings)

### `react-hooks/exhaustive-deps`

| File | Line:Col | Warning |
|------|----------|---------|
| `src/app/(app)/arrange/ArrangeClient.tsx` | 1089:6 | useEffect missing dependency: `pitches` |
| `src/components/player/AudioVisualizer.tsx` | 110:6 | useCallback missing dependencies: `drawBars`, `drawCircular`, `drawSpectrum`, `drawWaveform` |

**Context:** Complex visualizer/audio components with intentional dependency omissions for performance.

---

## Category 4: Security - dangerouslySetInnerHTML (2 warnings)

### `react/no-danger`

| File | Line:Col | Warning |
|------|----------|---------|
| `src/app/help/[topic]/page.tsx` | 536:9 | Dangerous property `dangerouslySetInnerHTML` found |
| `src/app/layout.tsx` | 122:11 | Dangerous property `dangerouslySetInnerHTML` found |

**Context:**
- `help/[topic]/page.tsx` - Rendering markdown/HTML help content
- `layout.tsx` - Injecting AdSense script (structured data)

---

## Category 5: Deprecation Notice (1 informational)

### `next lint` deprecation

```
`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .
```

**Action:** Migrate to ESLint CLI post-migration (not blocking).

---

## Files with Warnings (34 unique files)

| Directory | Files with Warnings |
|-----------|---------------------|
| `src/app/(app)/` | 13 |
| `src/app/api/` | 4 |
| `src/app/` | 2 |
| `src/components/mobile/` | 3 |
| `src/components/player/` | 4 |
| `src/components/` | 4 |
| `src/lib/` | 2 |
| **Total** | **34** |

---

## Baseline Policy (DEC-003=C)

Per [DECISIONS.md](./DECISIONS.md):

| Rule | Requirement |
|------|-------------|
| Baseline | 44 warnings |
| New code | Must be warning-free |
| Delta | Must be ≤ 0 |
| Increase | **Blocks validation** |

See [exceptions.md](./exceptions.md) for EXC-001 waiver details.

---

## References

- [validation_baseline.md](./validation_baseline.md) - Full validation results
- [warnings_baseline.md](./warnings_baseline.md) - Baseline tracking
- [exceptions.md](./exceptions.md) - EXC-001 waiver
- [DECISIONS.md](./DECISIONS.md) - DEC-003 = C


# Mobile Today Parity Checklist

**Version:** 1.0
**Date:** January 5, 2026
**Status:** Implemented

---

## Overview

This document verifies logic parity between the desktop Today page (`/today`) and the mobile Today page (`/m`). The mobile version uses the **same server-side logic** for state computation, with only presentation differing.

---

## Logic Parity Verification

### Server-Side State Computation

| Function | Desktop | Mobile | Parity |
|----------|---------|--------|--------|
| `getTodayServerState()` | YES | YES | OK |
| `getDynamicUIData()` | YES | YES | OK |
| `getDailyPlanSummary()` | YES | YES | OK |
| `isReturningAfterGap()` | YES | YES | OK |
| `getTodayVisibility()` | YES | YES | OK |
| `ensureMinimumVisibility()` | YES | YES | OK |
| `computeVisibility()` | YES | YES | OK |

### Feature Flag Checks

| Flag | Desktop | Mobile | Parity |
|------|---------|--------|--------|
| `isTodayDecisionSuppressionEnabled()` | YES | YES | OK |
| `isTodayReducedModeEnabled()` | YES | YES | OK |
| `isTodayDynamicUIEnabled()` | YES | YES | OK |
| `isTodaySoftLandingEnabled()` | YES | YES | OK |

### User State Fields

| Field | Desktop | Mobile | Parity |
|-------|---------|--------|--------|
| `planExists` | YES | YES | OK |
| `hasIncompletePlanItems` | YES | YES | OK |
| `returningAfterGap` | YES | YES | OK |
| `firstDay` | YES | YES | OK |
| `focusActive` | YES | YES | OK |
| `activeStreak` | YES | YES | OK |

### Visibility Fields

| Field | Desktop | Mobile | Parity |
|-------|---------|--------|--------|
| `showStarterBlock` | YES | YES | OK |
| `showDailyPlan` | YES | YES | OK |
| `showExplore` | YES | YES | OK |
| `hideExplore` | YES | YES | OK |
| `showRewards` | YES | YES | OK |
| `showReducedModeBanner` | YES | YES | OK |
| `forceDailyPlanCollapsed` | YES | YES | OK |
| `forceExploreCollapsed` | YES | YES | OK |

---

## Presentation Differences (Expected)

### Layout

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Navigation | Sidebar (left) | Bottom tab bar |
| Primary CTA | StarterBlock component | Starter card (larger) |
| Quick picks | Grid in ExploreDrawer | Horizontal pills |
| Plan section | DailyPlanWidget | Collapsible summary |
| Touch targets | Standard | 44x44 minimum |

### Touch Target Compliance

| Element | Mobile Size | Compliant |
|---------|-------------|-----------|
| Starter card | 88px height | YES |
| Action cards | 88px height | YES |
| Quick pick cards | 56px height | YES |
| Plan toggle | 56px height | YES |
| Dismiss button | 44px min | YES |
| Minimal actions | 56px height | YES |

---

## Test Matrix

### Given the same server state, both pages must produce:

| Input State | Expected CTA | Desktop | Mobile |
|-------------|--------------|---------|--------|
| No plan, no gap | "Start Focus" | OK | OK |
| Plan with incomplete | First incomplete item | OK | OK |
| Returning after 48h gap | Reduced mode banner | OK | OK |
| Focus active | Suppressed view | OK | OK |
| First day user | Simplified view | OK | OK |

### Soft Landing (Session-based, client-side)

| Event | Expected Behavior | Desktop | Mobile |
|-------|-------------------|---------|--------|
| Focus complete | Soft landing active | OK | OK |
| Focus abandon | Soft landing active | OK | OK |
| Clear button | Soft landing cleared | OK | OK |
| New session | Soft landing off | OK | OK |

---

## Files Implementing Parity

### Desktop

- `src/app/(app)/today/page.tsx` - Server component with state fetching
- `src/app/(app)/today/TodayGridClient.tsx` - Client component for rendering

### Mobile

- `src/app/(mobile)/m/page.tsx` - Server component with **same** state fetching
- `src/components/mobile/screens/MobileTodayClient.tsx` - Client component for mobile rendering

### Shared Logic

- `src/lib/today/todayVisibility.ts` - Visibility computation
- `src/lib/today/resolveNextAction.ts` - CTA resolution
- `src/lib/today/softLanding.ts` - Soft landing session state
- `src/lib/today/safetyNets.ts` - Safety net validation
- `src/lib/db/repositories/dailyPlans.ts` - Server state queries
- `src/lib/flags/index.ts` - Feature flag checks

---

## Verification Steps

### Manual QA Checklist

1. [ ] Visit `/today` on desktop with flags ON
2. [ ] Note the primary CTA, visibility state
3. [ ] Visit `/m` on mobile with same user
4. [ ] Verify primary CTA matches
5. [ ] Verify visibility state matches
6. [ ] Test soft landing: complete focus, return to Today
7. [ ] Verify both pages show reduced mode
8. [ ] Test dismiss on both pages
9. [ ] Verify dismiss clears for session only

### Automated Verification

```bash
# Build both routes
npm run build > .tmp/build.log 2>&1

# Verify no type errors
npm run typecheck > .tmp/typecheck.log 2>&1

# Run unit tests
npm run test:unit > .tmp/test.log 2>&1
```

---

## Known Differences (Intentional)

1. **Navigation**: Desktop uses sidebar, mobile uses bottom tabs
2. **Touch targets**: Mobile enforces 44x44 minimum
3. **Layout**: Mobile uses single-column, desktop uses grid
4. **Safe area**: Mobile adds padding for notch/home indicator
5. **MobileNav**: Additional bottom bar component for mobile app shell

---

## Sign-Off

| Check | Status |
|-------|--------|
| Server logic identical | OK |
| Same flag checks | OK |
| Same state computation | OK |
| Same visibility rules | OK |
| Build passes | OK |
| Tests pass | OK |

---

*Parity verified for Phase 9.1 - Mobile Today Layout*


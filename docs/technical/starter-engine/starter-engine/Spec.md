# Starter Engine Specification

**Version:** 1.0
**Date:** January 5, 2026
**Status:** Implemented (Flags OFF by default)

---

## Overview

The Starter Engine is a behavior layer for the Today page that reduces decision paralysis for ADHD users by:

1. **Limiting visible choices** based on user state
2. **Providing a single dominant CTA** (StarterBlock)
3. **Supporting reduced mode** for users returning after gaps
4. **Providing subtle feedback** for momentum without gamification

---

## Architecture

### Code Location

```
src/lib/today/              # Pure logic (server-safe)
  todayVisibility.ts        # Visibility rules
  resolveNextAction.ts      # CTA resolver
  momentum.ts               # Momentum feedback state
  softLanding.ts            # Post-action reduced mode
  safetyNets.ts             # Validation and fallbacks
  index.ts                  # Barrel export

src/lib/flags/              # Feature flag system
  index.ts                  # Flag definitions and helpers

src/app/(app)/today/        # UI components
  page.tsx                  # Server component (orchestration)
  TodayGridClient.tsx       # Client component (rendering)
  StarterBlock.tsx          # Primary CTA
  ExploreDrawer.tsx         # Collapsible action cards
  MomentumBanner.tsx        # Feedback banner
  ReducedModeBanner.tsx     # Gap detection banner
```

### Feature Flags

| Flag | Purpose | Default |
|------|---------|---------|
| `TODAY_FEATURES_MASTER` | Global kill switch | OFF |
| `TODAY_DECISION_SUPPRESSION_V1` | Visibility rules | OFF |
| `TODAY_NEXT_ACTION_RESOLVER_V1` | CTA resolver | OFF |
| `TODAY_MOMENTUM_FEEDBACK_V1` | Feedback banner | OFF |
| `TODAY_SOFT_LANDING_V1` | Post-action reduced | OFF |
| `TODAY_REDUCED_MODE_V1` | 48h gap detection | OFF |
| `TODAY_DYNAMIC_UI_V1` | Personalized UI | OFF |

---

## Behavior Specifications

### 1. Decision Suppression

When `TODAY_DECISION_SUPPRESSION_V1` is ON:

- User state determines which sections are visible
- First-day users see simplified view
- Focus-active users see limited choices
- Safety net ensures at least one CTA is always visible

See: `docs/starter-engine/Decision_Suppression.md`

### 2. Next Action Resolver

When `TODAY_NEXT_ACTION_RESOLVER_V1` is ON:

- StarterBlock shows deterministic CTA
- Priority: Plan incomplete > Focus > Quests > Learn
- Pure function, no side effects, unit tested

See: `docs/starter-engine/Next_Action_Resolver.md`

### 3. Momentum Feedback

When `TODAY_MOMENTUM_FEEDBACK_V1` is ON:

- "Good start." banner after first completion
- Shows once per session
- Non-gamified, no XP/coins/streaks

See: `docs/starter-engine/Momentum_Feedback.md`

### 4. Soft Landing

When `TODAY_SOFT_LANDING_V1` is ON:

- After focus complete/abandon, Today shows reduced choices
- Session-only persistence (clears on new session)
- Prevents re-entry overwhelm

See: `docs/starter-engine/Soft_Landing.md`

### 5. Reduced Mode (Gap Detection)

When `TODAY_REDUCED_MODE_V1` is ON:

- Users returning after 48+ hours see simplified view
- "Welcome back. Start small." message
- Uses `users.last_activity_at` from D1

### 6. Dynamic UI

When `TODAY_DYNAMIC_UI_V1` is ON:

- Quick picks based on 14-day usage
- Resume last activity link
- Interest primers for frequent learners

See: `docs/starter-engine/Dynamic_UI.md`

---

## Server-Side State

All state computation happens server-side:

```typescript
interface TodayUserState {
  planExists: boolean;
  hasIncompletePlanItems: boolean;
  returningAfterGap: boolean;
  firstDay: boolean;
  focusActive: boolean;
  activeStreak: boolean;
}
```

Fetched via:
- `getTodayServerState()` - Core state
- `getDynamicUIData()` - Usage-based personalization
- `getDailyPlanSummary()` - Plan details

---

## Safety Nets

1. **ensureMinimumVisibility**: Never hide all CTAs
2. **validateResolverOutput**: Fallback for invalid resolver output
3. **validateDailyPlan**: Handle malformed plan data

See: `docs/starter-engine/Guardrails.md`

---

## Mobile Parity

Mobile Today (`/m`) uses identical server logic:
- Same state computation
- Same visibility rules
- Same flag checks
- Only presentation differs

See: `docs/validation/Mobile_Today_Parity.md`

---

## Testing

- 112 unit tests for Today logic
- E2E tests for critical flows
- Evidence pack in `docs/validation/Starter_Engine_Evidence.md`

---

## Rollout

Phased enablement over 15+ days:
1. Deploy with flags OFF
2. Enable master switch
3. Enable features one by one
4. Monitor and rollback if needed

See: `docs/deploy/Rollout_Plan.md`

---

## Related Documentation

- `docs/starter-engine/Decision_Suppression.md`
- `docs/starter-engine/Next_Action_Resolver.md`
- `docs/starter-engine/Momentum_Feedback.md`
- `docs/starter-engine/Soft_Landing.md`
- `docs/starter-engine/Dynamic_UI.md`
- `docs/starter-engine/Guardrails.md`
- `docs/starter-engine/Validation_Runbook.md`
- `docs/deploy/Flags.md`
- `docs/deploy/Rollout_Plan.md`
- `docs/validation/Starter_Engine_Evidence.md`


# Feature Flags - Ignition

## Overview

This document tracks all feature flags used in Ignition for:
- Quarantined features (potentially un-surfaced)
- A/B testing
- Gradual rollouts
- Kill switches

## Active Flags

### localStorage Deprecation

| Flag | Default | Scope | Description |
|------|---------|-------|-------------|
| `DISABLE_MASS_LOCAL_PERSISTENCE` | `true` | Global | Disables behavior-affecting localStorage usage |

**Location:** `src/lib/storage/deprecation.ts`

**Purpose:** Prevents localStorage from being used for behavior-affecting state. Only cosmetic UI preferences (theme, sidebar collapse) are allowed.

**Allowed Keys:**
- `theme`
- `ignition-sidebar-collapsed`
- `ignition-bottom-bar-collapsed`

**Forbidden Keys:**
- `ignition-focus-*`
- `ignition-quests-*`
- `ignition-goals-*`
- `ignition-skills-*`
- `ignition-wallet-*`
- `ignition-onboarding-*`
- Any other behavior-affecting state

---

## Quarantined Features

*Features that appear unused but may be un-surfaced. Protected by flags.*

| Feature | Flag | Default | Evidence | Action |
|---------|------|---------|----------|--------|
| None currently | - | - | - | - |

---

## Deprecated Flags

*Flags that are scheduled for removal.*

| Flag | Removal Date | Reason |
|------|--------------|--------|
| None currently | - | - |

---

## Adding New Flags

When quarantining a feature:

1. Add flag to `src/lib/flags/index.ts`
2. Default to `OFF` unless currently in use
3. Document in this file
4. Add removal criteria/date

Example:
```typescript
export const FEATURE_FLAGS = {
  ENABLE_NEW_FEATURE: process.env.NEXT_PUBLIC_ENABLE_NEW_FEATURE === 'true',
};
```


# UI Consistency Master Plan

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Implementation Ready

---

## Table of Contents

1. [Global UI Rules](#1-global-ui-rules)
2. [Component Inventory](#2-component-inventory)
3. [Per-Module Consistency Gaps](#3-per-module-consistency-gaps)
4. [Incremental Rollout Plan](#4-incremental-rollout-plan)
5. [QA Checklist Template](#5-qa-checklist-template)

---

## 1. Global UI Rules

### 1.1 Page Header Template

All app pages MUST use a consistent header structure:

```tsx
<header className={styles.header}>
  <h1 className={styles.title}>{PageTitle}</h1>
  <p className={styles.subtitle}>{PageDescription}</p>
</header>
```

**CSS Token Usage:**
```css
.header {
  margin-bottom: var(--space-6);
}

.title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}
```

### 1.2 CTA Rules

#### Primary CTA
- One dominant CTA per view
- Uses `Button` component with `variant="primary"`
- Full width on mobile, auto width on desktop
- Placed prominently (top of content area or sticky footer)

#### Secondary CTAs
- Maximum 3 secondary CTAs visible without scrolling
- Uses `Button` component with `variant="secondary"` or `variant="ghost"`
- Smaller size: `size="sm"` or `size="md"`

#### CTA Hierarchy
```
1. Primary CTA (1 max) - What should user do now?
2. Secondary CTAs (3 max) - What else can user do?
3. Tertiary actions - In menus or less prominent
```

### 1.3 State Rules

All modules MUST handle these states consistently:

#### Loading State
```tsx
<div className={styles.loadingState}>
  <div className={styles.spinner} />
  <p>Loading...</p>
</div>
```

#### Empty State
```tsx
<div className={styles.emptyState}>
  <div className={styles.emptyIcon}>{Icon}</div>
  <h3 className={styles.emptyTitle}>{Title}</h3>
  <p className={styles.emptyDescription}>{Description}</p>
  <Button variant="primary">{ActionLabel}</Button>
</div>
```

#### Error State
```tsx
<div className={styles.errorState}>
  <div className={styles.errorIcon}>{ErrorIcon}</div>
  <h3 className={styles.errorTitle}>Something went wrong</h3>
  <p className={styles.errorDescription}>{ErrorMessage}</p>
  <Button variant="secondary" onClick={retry}>Try Again</Button>
</div>
```

#### Success State
```tsx
<div className={styles.successState}>
  <div className={styles.successIcon}>{CheckIcon}</div>
  <h3 className={styles.successTitle}>{SuccessMessage}</h3>
  {OptionalNextAction}
</div>
```

### 1.4 Spacing Rules

| Context | Token |
|---------|-------|
| Page padding (mobile) | `var(--space-4)` |
| Page padding (desktop) | `var(--space-6)` |
| Section margin | `var(--space-8)` |
| Card padding | `var(--space-4)` to `var(--space-6)` |
| List item gap | `var(--space-3)` to `var(--space-4)` |
| Inline element gap | `var(--space-2)` |

### 1.5 Typography Rules

| Context | Size Token | Weight Token |
|---------|------------|--------------|
| Page title | `--font-size-2xl` | `--font-weight-bold` |
| Section title | `--font-size-xl` | `--font-weight-semibold` |
| Card title | `--font-size-lg` | `--font-weight-semibold` |
| Body text | `--font-size-base` | `--font-weight-normal` |
| Label text | `--font-size-sm` | `--font-weight-medium` |
| Caption text | `--font-size-xs` | `--font-weight-normal` |

### 1.6 Card Hierarchy

| Card Type | Use Case | Styling |
|-----------|----------|---------|
| Elevated | Primary content, main items | `variant="elevated"` |
| Default | Standard content | `variant="default"` |
| Outlined | Secondary items, list items | `variant="outlined"` |

---

## 2. Component Inventory

### 2.1 Existing Shared Components

| Component | Location | Current Usage |
|-----------|----------|---------------|
| `Button` | `src/components/ui/Button.tsx` | Some modules |
| `Card` | `src/components/ui/Card.tsx` | Limited |
| `CardHeader` | `src/components/ui/Card.tsx` | Limited |
| `CardTitle` | `src/components/ui/Card.tsx` | Limited |
| `CardContent` | `src/components/ui/Card.tsx` | Limited |
| `QuickModeHeader` | `src/components/ui/QuickModeHeader.tsx` | Learn/Hub |

### 2.2 Components to Create

| Component | Purpose | Priority |
|-----------|---------|----------|
| `PageHeader` | Standardized page header | High |
| `LoadingState` | Consistent loading indicator | High |
| `EmptyState` | Empty content placeholder | High |
| `ErrorState` | Error display with retry | High |
| `SuccessState` | Success confirmation | Medium |
| `SectionHeader` | Section title with optional action | Medium |
| `TabGroup` | Consistent tab navigation | Medium |
| `ListItem` | Standardized list row | Medium |

### 2.3 Proposed Component Structure

```
src/components/ui/
  Button.tsx           # Existing
  Card.tsx             # Existing
  QuickModeHeader.tsx  # Existing
  PageHeader.tsx       # NEW
  LoadingState.tsx     # NEW
  EmptyState.tsx       # NEW
  ErrorState.tsx       # NEW
  SuccessState.tsx     # NEW
  SectionHeader.tsx    # NEW
  TabGroup.tsx         # NEW
  ListItem.tsx         # NEW
  index.ts             # Update exports
```

---

## 3. Per-Module Consistency Gaps

### 3.1 Today

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom greeting | Acceptable (unique) |
| CTA | StarterBlock (custom) | OK (intentional) |
| Loading | Custom inline | Should use `LoadingState` |
| Empty | N/A | N/A |
| Cards | Custom action cards | Should use `Card` component |

### 3.2 Focus

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | None (timer dominant) | Acceptable for timer view |
| CTA | Custom start/pause | Should use `Button` |
| Loading | Custom spinner | Should use `LoadingState` |
| Empty | N/A | N/A |
| Cards | Session history custom | Should use `Card` + `ListItem` |

### 3.3 Quests

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Inline h1 | Should use `PageHeader` |
| CTA | Custom buttons | Should use `Button` |
| Loading | Custom `isLoading` | Should use `LoadingState` |
| Empty | Custom per tab | Should use `EmptyState` |
| Cards | Custom quest cards | Should use `Card` variants |
| Tabs | Custom tab buttons | Should use `TabGroup` |

### 3.4 Habits

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom | Should use `PageHeader` |
| CTA | Custom add button | Should use `Button` |
| Loading | Custom | Should use `LoadingState` |
| Empty | Custom | Should use `EmptyState` |
| Cards | Custom habit cards | Should use `Card` + `ListItem` |

### 3.5 Exercise

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom | Should use `PageHeader` |
| CTA | Multiple custom | Should use `Button` hierarchy |
| Loading | Custom | Should use `LoadingState` |
| Empty | Custom | Should use `EmptyState` |
| Cards | Exercise cards custom | Should use `Card` |

### 3.6 Learn

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom | Should use `PageHeader` |
| CTA | Custom | Should use `Button` |
| Loading | Custom | Should use `LoadingState` |
| Empty | Custom | Should use `EmptyState` |
| Cards | Lesson cards custom | Should use `Card` |
| Sub-routes | journal, recipes, review | Same gaps apply |

### 3.7 Hub/Shortcuts

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Uses `PageHeader` pattern | OK |
| CTA | DAW selection cards | Should use `Card` |
| Loading | None (SSG) | N/A |
| Empty | N/A | N/A |
| Search | Custom | Acceptable |

### 3.8 Infobase

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom | Should use `PageHeader` |
| CTA | Custom add button | Should use `Button` |
| Loading | Custom | Should use `LoadingState` |
| Empty | Custom | Should use `EmptyState` |
| Cards | Entry cards custom | Should use `Card` |

### 3.9 Reference

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom | Should use `PageHeader` |
| CTA | Upload button | Should use `Button` |
| Loading | Custom | Should use `LoadingState` |
| Empty | Custom | Should use `EmptyState` |
| Cards | Track cards custom | Should use `Card` |

### 3.10 Templates

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom | Should use `PageHeader` |
| CTA | Template links | Should use `Card` for selection |
| Loading | None (SSG) | N/A |
| Empty | N/A | N/A |

### 3.11 Market

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom | Should use `PageHeader` |
| CTA | Purchase buttons | Should use `Button` |
| Loading | Custom | Should use `LoadingState` |
| Empty | Custom | Should use `EmptyState` |
| Cards | Reward cards custom | Should use `Card` |

### 3.12 Progress

| Aspect | Current State | Gap |
|--------|---------------|-----|
| Header | Custom | Should use `PageHeader` |
| CTA | N/A (read-only) | N/A |
| Loading | Custom | Should use `LoadingState` |
| Empty | Custom | Should use `EmptyState` |
| Cards | Stats cards custom | Should use `Card` |

---

## 4. Incremental Rollout Plan

### Batch 0: Foundation (Week 1)

**Scope:** Create shared state components

**Files to Create:**
- `src/components/ui/PageHeader.tsx`
- `src/components/ui/PageHeader.module.css`
- `src/components/ui/LoadingState.tsx`
- `src/components/ui/LoadingState.module.css`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/EmptyState.module.css`
- `src/components/ui/ErrorState.tsx`
- `src/components/ui/ErrorState.module.css`

**Files to Update:**
- `src/components/ui/index.ts` (add exports)

**Validation:**
- Components render correctly in isolation
- Styles use design tokens
- Props are typed correctly

---

### Batch 1: Low-Risk Static Pages (Week 2)

**Scope:** Templates, Reference, Hub (mostly SSG, low interaction)

**Modules:**
1. Templates
2. Reference
3. Hub

**Changes per Module:**
- Add `PageHeader` component
- Verify Card usage or migrate to `Card`
- Add consistent spacing

**Risk:** Low (static pages, minimal state)

---

### Batch 2: Read-Heavy Pages (Week 3)

**Scope:** Progress, Market (display-focused)

**Modules:**
1. Progress
2. Market

**Changes per Module:**
- Add `PageHeader` component
- Add `LoadingState` for data fetching
- Add `EmptyState` for empty data
- Migrate cards to `Card` component
- Standardize `Button` usage

**Risk:** Low-Medium (has data fetching)

---

### Batch 3: List-Based Pages (Week 4)

**Scope:** Quests, Habits, Infobase (CRUD lists)

**Modules:**
1. Quests
2. Habits
3. Infobase

**Changes per Module:**
- Add `PageHeader` component
- Add `TabGroup` for tab navigation (Quests)
- Add `LoadingState`, `EmptyState`, `ErrorState`
- Migrate list items to `Card` + consistent styling
- Standardize `Button` for actions
- Add `ListItem` for list rows

**Risk:** Medium (CRUD operations)

---

### Batch 4: Complex Interactive Pages (Week 5)

**Scope:** Focus, Exercise, Learn (heavy interaction)

**Modules:**
1. Focus
2. Exercise
3. Learn (all sub-routes)

**Changes per Module:**
- Add `PageHeader` where appropriate
- Add all state components
- Standardize `Button` for all actions
- Migrate cards to `Card`
- Ensure consistent spacing

**Risk:** Medium-High (complex state, timers)

---

### Batch 5: Dashboard (Week 6)

**Scope:** Today page refinements

**Module:**
1. Today

**Changes:**
- Ensure StarterBlock uses `Button` internally
- Migrate action cards to `Card` component
- Standardize loading states
- Verify all spacing uses tokens

**Risk:** Medium (high visibility, feature-flag gated features)

---

### Batch 6: Final Polish (Week 7)

**Scope:** Cross-cutting consistency pass

**Tasks:**
- Audit all modules for remaining gaps
- Fix any spacing inconsistencies
- Ensure dark mode consistency
- Update any missed loading/empty states
- Remove unused custom styles

---

## 5. QA Checklist Template

### Module: `{ModuleName}`

#### Pre-Check
```
[ ] Module currently builds without errors
[ ] Module has no console errors at runtime
[ ] Current functionality documented
```

#### Header Consistency
```
[ ] Uses PageHeader component (or justified exception)
[ ] Title uses --font-size-2xl, --font-weight-bold
[ ] Subtitle uses --font-size-base, --color-text-secondary
[ ] Header has margin-bottom: var(--space-6)
```

#### CTA Consistency
```
[ ] Primary CTA uses Button variant="primary"
[ ] Secondary CTAs use Button variant="secondary" or "ghost"
[ ] Maximum 1 primary CTA visible
[ ] Maximum 3 secondary CTAs visible without scrolling
[ ] CTA placement is consistent with other modules
```

#### State Consistency
```
[ ] Loading state uses LoadingState component
[ ] Empty state uses EmptyState component
[ ] Error state uses ErrorState component (if applicable)
[ ] Success state uses SuccessState component (if applicable)
[ ] States have appropriate icons and copy
```

#### Spacing Consistency
```
[ ] Page padding uses --space-4 (mobile) / --space-6 (desktop)
[ ] Section margins use --space-8
[ ] Card padding uses --space-4 to --space-6
[ ] List item gaps use --space-3 to --space-4
[ ] No hardcoded pixel values for spacing
```

#### Typography Consistency
```
[ ] Page title: --font-size-2xl, --font-weight-bold
[ ] Section title: --font-size-xl, --font-weight-semibold
[ ] Card title: --font-size-lg, --font-weight-semibold
[ ] Body text: --font-size-base
[ ] Labels: --font-size-sm, --font-weight-medium
[ ] No hardcoded font sizes
```

#### Card Consistency
```
[ ] Primary content uses Card variant="elevated"
[ ] Standard content uses Card variant="default"
[ ] List items use Card variant="outlined" or ListItem
[ ] Card padding is consistent
[ ] Card border-radius uses --radius-lg
```

#### Dark Mode
```
[ ] All colors use CSS variables
[ ] No hardcoded color values
[ ] Tested in dark mode
[ ] Icons visible in both themes
```

#### Accessibility
```
[ ] Interactive elements are keyboard accessible
[ ] Focus states are visible
[ ] Loading states have aria-busy="true"
[ ] Empty states have descriptive text
[ ] Buttons have accessible labels
```

#### Regression Check
```
[ ] All existing functionality still works
[ ] No console errors
[ ] No visual regressions
[ ] Mobile layout correct
[ ] Desktop layout correct
```

---

## Appendix A: Token Quick Reference

### Spacing
```
--space-1: 4px   --space-6: 24px
--space-2: 8px   --space-8: 32px
--space-3: 12px  --space-10: 40px
--space-4: 16px  --space-12: 48px
--space-5: 20px  --space-16: 64px
```

### Font Sizes
```
--font-size-xs: 0.75rem (12px)
--font-size-sm: 0.875rem (14px)
--font-size-base: 1rem (16px)
--font-size-lg: 1.125rem (18px)
--font-size-xl: 1.25rem (20px)
--font-size-2xl: 1.5rem (24px)
--font-size-3xl: 1.875rem (30px)
```

### Font Weights
```
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

### Border Radius
```
--radius-sm: 4px
--radius-md: 6px
--radius-lg: 8px
--radius-xl: 12px
--radius-2xl: 16px
```

---

## Appendix B: Component Prop Reference

### PageHeader
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
```

### LoadingState
```tsx
interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}
```

### EmptyState
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

### ErrorState
```tsx
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}
```

---

**End of Document**


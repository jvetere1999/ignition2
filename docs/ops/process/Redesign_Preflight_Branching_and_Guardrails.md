# Redesign Pre-Flight: Branching Map and Guardrails

**Document Version:** 1.0  
**Created:** 2026-01-04  
**Scope:** Today Page Redesign - Branching Strategy and Safety Guardrails

---

## 1) Redesign Workstreams

Each workstream is a separate branch that can be merged independently. The order specified in Section 2 must be followed.

---

### 1.1 Today IA + Layout Hierarchy Changes

**Branch Name:** `redesign/today-ia-layout`

**Scope Boundaries:**
- Reorganize Today page section order and visual hierarchy
- Update CSS grid/flex layout structure
- Modify section headings and groupings
- Adjust spacing and visual weight of sections

**Files Allowed to Change:**
- `src/app/(app)/today/page.tsx`
- `src/app/(app)/today/page.module.css`
- `src/components/shell/Sidebar.tsx` (only Today-related nav items)
- `src/components/shell/Sidebar.module.css`

**Files NOT Allowed to Change:**
- `src/app/(app)/today/DailyPlan.tsx`
- `src/app/(app)/today/DailyPlan.module.css`
- Any API routes
- Any database repositories
- Any auth-related files

**Test Plan:**
- Unit: N/A (layout changes only)
- E2E: Create `tests/today-layout.spec.ts` to verify section order and visibility
- Manual: Visual comparison against baseline screenshot

**Rollback Plan:**
```bash
git revert <commit-sha>
# OR
git checkout main -- src/app/(app)/today/page.tsx src/app/(app)/today/page.module.css
```

---

### 1.2 DailyPlanWidget Collapse/Summary Behavior

**Branch Name:** `redesign/dailyplan-collapse`

**Scope Boundaries:**
- Add collapse/expand toggle to DailyPlanWidget
- Add summary view when collapsed (show X/Y completed)
- Persist collapse state in localStorage (client-side only)
- Maintain all existing plan generation and completion logic

**Files Allowed to Change:**
- `src/app/(app)/today/DailyPlan.tsx`
- `src/app/(app)/today/DailyPlan.module.css`

**Files NOT Allowed to Change:**
- `src/app/api/daily-plan/route.ts`
- Any database queries or repositories
- `src/app/(app)/today/page.tsx`

**Test Plan:**
- Unit: `src/app/(app)/today/__tests__/DailyPlan.test.tsx` - test collapse state toggle
- E2E: Add tests to `tests/today-layout.spec.ts` for collapse/expand behavior
- Manual: Verify collapse persists on page reload

**Rollback Plan:**
```bash
git checkout main -- src/app/(app)/today/DailyPlan.tsx src/app/(app)/today/DailyPlan.module.css
```

---

### 1.3 StarterBlock Component Introduction

**Branch Name:** `redesign/starter-block`

**Scope Boundaries:**
- Create new `StarterBlock` component to group quick-start actions
- Component must be purely presentational (no API calls)
- Accept props for which actions to display
- Integrate into Today page layout

**Files Allowed to Change:**
- `src/components/ui/StarterBlock.tsx` (new file)
- `src/components/ui/StarterBlock.module.css` (new file)
- `src/components/ui/index.ts` (add export)
- `src/app/(app)/today/page.tsx` (import and use component)
- `src/app/(app)/today/page.module.css` (starter section styling)

**Files NOT Allowed to Change:**
- Any API routes
- Any database repositories
- `src/app/(app)/today/DailyPlan.tsx`
- Any focus, quest, or exercise page files

**Test Plan:**
- Unit: `src/components/ui/__tests__/StarterBlock.test.tsx` - test prop rendering
- E2E: Verify StarterBlock renders in Today page with correct actions
- Manual: Verify all action links navigate correctly

**Rollback Plan:**
```bash
git checkout main -- src/app/(app)/today/page.tsx
rm src/components/ui/StarterBlock.tsx src/components/ui/StarterBlock.module.css
```

---

### 1.4 Start-XP Reward Changes (Server-Side Only)

**Branch Name:** `redesign/start-xp-server`

**Scope Boundaries:**
- Modify XP reward logic for starting activities (not completing)
- Changes MUST be server-side only (API routes, repositories)
- No changes to client-side reward display or localStorage
- Must not affect existing completion rewards

**Files Allowed to Change:**
- `src/lib/db/repositories/activity-events.ts` (add new event type if needed)
- `src/app/api/focus/route.ts` (POST handler for session start)
- `src/lib/db/types.ts` (add types if needed, NO schema changes)

**Files NOT Allowed to Change:**
- Any migration files
- Database schema
- `src/app/(app)/focus/FocusClient.tsx` localStorage logic
- `src/app/api/focus/[id]/complete/route.ts` completion rewards
- Any UI components

**Test Plan:**
- Unit: `src/lib/db/repositories/__tests__/activity-events.test.ts` - test new event type
- Unit: `src/app/api/focus/__tests__/route.test.ts` - test start XP award
- Manual: Verify XP ledger consistency (server DB vs any client display)

**Rollback Plan:**
```bash
git checkout main -- src/lib/db/repositories/activity-events.ts src/app/api/focus/route.ts
```

---

### 1.5 Interest Primer Wrappers (Query-Param Based Routing Only)

**Branch Name:** `redesign/interest-primer-routing`

**Scope Boundaries:**
- Add wrapper components that check for `?primer=true` query param
- If primer param present, show primer view; otherwise show normal view
- No new pages, only conditional rendering within existing routes
- Primer content can be placeholder (actual content in later workstream)

**Files Allowed to Change:**
- `src/app/(app)/focus/page.tsx` (add primer check wrapper)
- `src/app/(app)/learn/page.tsx` (add primer check wrapper)
- `src/app/(app)/exercise/page.tsx` (add primer check wrapper)
- `src/components/ui/PrimerWrapper.tsx` (new file)
- `src/components/ui/PrimerWrapper.module.css` (new file)

**Files NOT Allowed to Change:**
- Any API routes
- Any database operations
- `src/app/(app)/focus/FocusClient.tsx` (core logic)
- Navigation/routing configuration

**Test Plan:**
- Unit: `src/components/ui/__tests__/PrimerWrapper.test.tsx` - test query param detection
- E2E: Navigate to `/focus?primer=true` and verify primer view shown
- Manual: Verify normal view still works without query param

**Rollback Plan:**
```bash
git checkout main -- src/app/(app)/focus/page.tsx src/app/(app)/learn/page.tsx src/app/(app)/exercise/page.tsx
rm src/components/ui/PrimerWrapper.tsx src/components/ui/PrimerWrapper.module.css
```

---

### 1.6 Return-After-Gap Reduced Mode (Optional)

**Branch Name:** `redesign/reduced-mode`

**Scope Boundaries:**
- Detect user inactivity gap (last activity timestamp from server)
- Show simplified/reduced UI on return after X days inactive
- Reduced mode is client-side presentation only
- User can dismiss reduced mode and return to full view

**Files Allowed to Change:**
- `src/components/ui/ReducedModeWrapper.tsx` (new file)
- `src/components/ui/ReducedModeWrapper.module.css` (new file)
- `src/app/(app)/today/page.tsx` (wrap with ReducedModeWrapper)
- `src/app/(app)/layout.tsx` (add context provider if needed)

**Files NOT Allowed to Change:**
- Any API routes
- Any database operations
- Core feature components (Focus, Quests, etc.)
- Authentication flow

**Test Plan:**
- Unit: `src/components/ui/__tests__/ReducedModeWrapper.test.tsx` - test gap detection logic
- E2E: Mock last activity date and verify reduced mode triggers
- Manual: Verify dismiss button returns to normal view

**Rollback Plan:**
```bash
git checkout main -- src/app/(app)/today/page.tsx src/app/(app)/layout.tsx
rm src/components/ui/ReducedModeWrapper.tsx src/components/ui/ReducedModeWrapper.module.css
```

---

## 2) Branching Strategy

### Base Branch
- **Name:** `main`
- All feature branches branch FROM `main`
- All feature branches merge TO `main`

### Feature Branch Naming Convention
```
redesign/<workstream-slug>
```

Examples:
- `redesign/today-ia-layout`
- `redesign/dailyplan-collapse`
- `redesign/starter-block`
- `redesign/start-xp-server`
- `redesign/interest-primer-routing`
- `redesign/reduced-mode`

### Merge Order Constraints

**Strict Order (dependencies exist):**

1. `redesign/today-ia-layout` - MUST land first (establishes layout structure)
2. `redesign/dailyplan-collapse` - Depends on #1 (needs layout context)
3. `redesign/starter-block` - Depends on #1 (integrates into layout)

**Flexible Order (no dependencies):**

4-6. The following can merge in any order after #1-3:
   - `redesign/start-xp-server`
   - `redesign/interest-primer-routing`
   - `redesign/reduced-mode`

### Merge Method
- **Method:** Squash merge
- **Rationale:**
  - Keeps `main` history clean with single commits per workstream
  - Easier to revert entire workstream if needed
  - Preserves detailed commit history in branch (if needed for debugging)

### Required Checks Before Merge

All checks MUST pass before merge is allowed:

| Check | Command | Blocking? |
|-------|---------|-----------|
| TypeScript | `npm run typecheck` | Yes |
| ESLint | `npm run lint` | Yes |
| Unit Tests | `npm run test:unit` | Yes |
| Build | `npm run build` | Yes |
| E2E Smoke | `npm run test:e2e` | Yes |
| Manual QA | See Section 3 checklist | Yes |

---

## 3) Validation Gates (Hard Gates)

Each gate MUST pass before proceeding to the next workstream merge.

---

### Gate 1: Build Passes

**Checklist:**
- [ ] `npm run build` completes with exit code 0
- [ ] No TypeScript errors
- [ ] Build output size is within 10% of baseline
- [ ] No new console warnings in build output

**Validation Command:**
```bash
npm run build > .tmp/build.log 2>&1
```

---

### Gate 2: Lint Passes

**Checklist:**
- [ ] `npm run lint` returns 0 errors
- [ ] `npm run typecheck` returns 0 errors
- [ ] No new warnings introduced (compare to baseline)

**Validation Command:**
```bash
npm run check > .tmp/check.log 2>&1
```

---

### Gate 3: E2E Smoke Passes

**Checklist:**
- [ ] All existing E2E tests pass
- [ ] `tests/home.spec.ts` passes
- [ ] `tests/navigation.spec.ts` passes
- [ ] `tests/auth.spec.ts` passes

**Validation Command:**
```bash
npm run test:e2e > .tmp/e2e.log 2>&1
```

---

### Gate 4: Manual QA Checklist for Today Entry

**Checklist:**
- [ ] Today page loads within 2 seconds
- [ ] Greeting displays correctly with user name
- [ ] All action cards are visible and clickable
- [ ] DailyPlanWidget loads and displays plan (or empty state)
- [ ] All sections render without layout shifts
- [ ] Theme toggle works (light/dark)
- [ ] Mobile responsive layout verified (375px, 768px, 1024px)

**Evidence Required:** Screenshots of each viewport saved to `.tmp/qa-screenshots/`

---

### Gate 5: Regression Checks for Focus Timer Flow

**Checklist:**
- [ ] Navigate to `/focus` from Today page action card
- [ ] Start a focus session - timer begins
- [ ] Pause session - timer stops, paused state persists
- [ ] Resume session - timer continues
- [ ] Complete session - XP/coins awarded correctly
- [ ] Session appears in history
- [ ] FocusIndicator appears in BottomBar during active session
- [ ] Cross-tab: session state syncs between tabs

**Evidence Required:** Video recording of complete flow saved to `.tmp/qa-videos/`

---

### Gate 6: Auth Redirect Validation

**Checklist:**
- [ ] Unauthenticated user visiting `/today` redirects to `/auth/signin`
- [ ] After sign-in, user returns to `/today`
- [ ] Session persists across page reloads
- [ ] Sign-out clears session and redirects to home
- [ ] Protected API routes return 401 for unauthenticated requests

**Validation Command:**
```bash
npm run test:e2e -- tests/auth.spec.ts > .tmp/auth.log 2>&1
```

---

## 4) User-Facing Risk Register

| Risk ID | Risk Description | Severity | Detection Method | Mitigation |
|---------|-----------------|----------|------------------|------------|
| R1 | Navigation changes affecting user habit - users may not find previously used actions | Medium | Analytics (if exists); user feedback channels | Preserve all existing links; add visual indicators for relocated items |
| R2 | Hidden/collapsed sections reducing discoverability - new users may miss features | Medium | Manual QA; user testing feedback | Default to expanded state for new users; add visual affordance for collapsed sections |
| R3 | Starter defaults causing user confusion - unclear which action to take | Low | User feedback; manual observation | Clear labeling; consistent ordering; help text tooltips |
| R4 | Reward logic changes causing ledger mismatch - XP/coins out of sync | High | Unit tests; manual ledger audit; compare server DB to any client display | Comprehensive unit tests BEFORE merge; verify server is single source of truth for rewards |
| R5 | Focus timer flow regression - timer accuracy or state persistence broken | High | E2E tests; manual QA per Gate 5 | No changes to FocusClient.tsx in layout workstreams; dedicated regression test suite |
| R6 | DailyPlan collapse state lost on navigation - frustrating UX | Low | E2E tests; manual QA | Use localStorage with proper key; verify state persists across navigation |
| R7 | Primer wrapper blocks normal view - query param detection fails | Medium | E2E tests with and without param | Fail-safe to normal view if param detection errors |

---

## 5) Definition of Done for Each Workstream

---

### 5.1 Today IA + Layout Hierarchy Changes

**What Must Be Visibly Different:**
- Section order on Today page matches new IA spec
- Visual hierarchy (font sizes, spacing) updated per design
- Get Started section appears in new position

**What Must Remain Unchanged:**
- All existing links work and navigate to correct destinations
- DailyPlanWidget renders and functions identically
- All action icons render correctly
- Theme switching works
- Mobile layout adapts correctly

**Telemetry/Observability:** NONE

**Acceptance Criteria:**
- [ ] All navigation links functional
- [ ] Layout matches design spec
- [ ] No console errors
- [ ] All E2E tests pass
- [ ] Manual QA checklist complete

---

### 5.2 DailyPlanWidget Collapse/Summary Behavior

**What Must Be Visibly Different:**
- Collapse/expand toggle button visible in DailyPlanWidget header
- Collapsed state shows summary (e.g., "3/5 completed")
- Expanded state shows full item list

**What Must Remain Unchanged:**
- Plan generation works identically
- Item completion works identically
- Regenerate plan works identically
- API calls unchanged

**Telemetry/Observability:** NONE

**Acceptance Criteria:**
- [ ] Toggle button visible and functional
- [ ] Collapse state persists across page reload
- [ ] Summary shows correct count
- [ ] Expanded state shows all items
- [ ] All existing DailyPlan functionality works

---

### 5.3 StarterBlock Component Introduction

**What Must Be Visibly Different:**
- StarterBlock component renders in Today page
- Actions grouped within StarterBlock
- Visual styling per design spec

**What Must Remain Unchanged:**
- All action links navigate correctly
- Icons render correctly
- Hover states work
- Mobile responsive

**Telemetry/Observability:** NONE

**Acceptance Criteria:**
- [ ] Component renders without errors
- [ ] All action links functional
- [ ] Styling matches design
- [ ] Accessible (keyboard navigation works)
- [ ] Unit tests pass

---

### 5.4 Start-XP Reward Changes

**What Must Be Visibly Different:**
- XP/coins awarded on activity START (if design requires visual feedback)
- (Note: This may be server-side only with no visible difference)

**What Must Remain Unchanged:**
- Completion rewards still work
- Total XP/coins calculations correct
- No duplicate rewards for same action
- Focus timer flow unaffected
- Existing client-side reward display unchanged

**Telemetry/Observability:** NONE (verify via manual DB query)

**Acceptance Criteria:**
- [ ] Unit tests for new reward logic pass
- [ ] Starting focus session awards correct XP (verified in DB)
- [ ] Completing focus session still awards correct XP
- [ ] No duplicate rewards
- [ ] Existing completion rewards unchanged

---

### 5.5 Interest Primer Wrappers

**What Must Be Visibly Different:**
- `/focus?primer=true` shows primer view
- `/learn?primer=true` shows primer view
- `/exercise?primer=true` shows primer view

**What Must Remain Unchanged:**
- Normal URLs (`/focus`, `/learn`, `/exercise`) show normal view
- All existing functionality in normal view works
- Navigation and routing unchanged

**Telemetry/Observability:** NONE

**Acceptance Criteria:**
- [ ] Query param detection works
- [ ] Primer view renders for `?primer=true`
- [ ] Normal view renders without query param
- [ ] Unit tests pass
- [ ] No console errors

---

### 5.6 Return-After-Gap Reduced Mode

**What Must Be Visibly Different:**
- Users returning after X days see simplified UI
- Dismiss button visible to exit reduced mode
- After dismiss, full UI shown

**What Must Remain Unchanged:**
- Users with recent activity see normal UI
- All features accessible (even in reduced mode, just simplified presentation)
- Authentication unaffected

**Telemetry/Observability:** NONE

**Acceptance Criteria:**
- [ ] Gap detection logic works
- [ ] Reduced mode triggers correctly
- [ ] Dismiss button exits reduced mode
- [ ] State persists correctly
- [ ] Normal mode unaffected for active users

---

## 6) Precautionary Steps Before Coding (MANDATORY)

Complete ALL of the following before writing any code:

---

### 6.1 Snapshot Current Today Page Behavior

**Record the following (save to `.tmp/baseline/`):**

- [ ] Screenshot of Today page at 375px width (mobile)
- [ ] Screenshot of Today page at 768px width (tablet)
- [ ] Screenshot of Today page at 1440px width (desktop)
- [ ] Screenshot of Today page in dark theme
- [ ] List of all visible sections in order
- [ ] List of all action card labels and their href destinations
- [ ] DailyPlanWidget expanded state screenshot
- [ ] DailyPlanWidget empty state screenshot
- [ ] Network tab: list all API calls made on Today page load

---

### 6.2 Identify CSS Tokens to Reuse

**Confirm these tokens exist in `src/styles/tokens.css`:**

- [ ] `--space-*` (spacing scale: 1-24)
- [ ] `--font-size-*` (typography scale: xs-4xl)
- [ ] `--font-weight-*` (normal, medium, semibold, bold)
- [ ] `--radius-*` (border radius scale: none-full)
- [ ] `--color-bg-*` (background colors)
- [ ] `--color-text-*` (text colors)
- [ ] `--color-accent-primary` (accent color)

**Document any missing tokens that need to be added (do NOT add them yet):**

---

### 6.3 Confirm No Server-Side Reward Duplication

**Audit the following:**

- [ ] Verify `src/lib/db/repositories/activity-events.ts` is the ONLY place XP/coins are awarded
- [ ] Verify FocusClient.tsx localStorage does NOT store or calculate XP/coins (timer state only)
- [ ] Verify `src/app/api/focus/[id]/complete/route.ts` calls `logActivityEvent` once
- [ ] Verify `src/app/api/focus/route.ts` does NOT call `logActivityEvent` on session start (baseline)
- [ ] Document current reward flow:
  ```
  Focus Session Complete -> logActivityEvent("focus_complete") -> 25 XP, 10 coins
  ```

---

### 6.4 Identify Single Source of Truth Per Data Domain

**Confirm and document:**

| Data Domain | Single Source of Truth | Client Cache? |
|-------------|----------------------|---------------|
| Focus session state | D1 database (`focus_sessions` table) | localStorage for paused state only |
| XP/Coins balance | D1 database (`user_progress` table) | No client cache |
| Daily plan | D1 database (`daily_plans` table) | React state only |
| Timer countdown | Calculated from `session.started_at` + `planned_duration` | React state |
| User preferences | D1 database (`users` table) | localStorage for theme only |

- [ ] Verify no client-side source is treated as authoritative for XP/coins
- [ ] Verify focus session status is always fetched from server on page load
- [ ] Verify daily plan is always fetched from server on page load

---

### 6.5 Create Feature Flag (Optional but Recommended)

Consider adding a feature flag for gradual rollout:

```typescript
// src/lib/feature-flags.ts
export const REDESIGN_TODAY_IA = process.env.NEXT_PUBLIC_FF_REDESIGN_TODAY_IA === 'true';
```

- [ ] Decision made: Use feature flags? (Yes/No)
- [ ] If yes, document flag names for each workstream

---

## END OF DOCUMENT


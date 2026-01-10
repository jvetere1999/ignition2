# UI Cleanup Backlog

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Ready for Implementation

---

## Table of Contents

1. [Today Module](#today-module)
2. [Focus Module](#focus-module)
3. [Quests Module](#quests-module)
4. [Habits Module](#habits-module)
5. [Exercise Module](#exercise-module)
6. [Learn Module](#learn-module)
7. [Hub/Shortcuts Module](#hubshortcuts-module)
8. [Infobase Module](#infobase-module)
9. [Market Module](#market-module)
10. [Progress Module](#progress-module)
11. [Reference Module](#reference-module)
12. [Global/Shell](#globalshell)
13. [Top 15 Prioritized List](#top-15-prioritized-list)

---

## Today Module

### TD-01: Explore Drawer expand button lacks hover feedback
- **Screen:** Today > ExploreDrawer collapsed state
- **Problem:** The "Explore" section header has no visual affordance indicating it's clickable
- **Proposed Change:** Add `cursor: pointer` and subtle hover background color to collapsed header
- **Risk:** Very Low
- **Effort:** S

### TD-02: "View today" link in StarterBlock is unclear
- **Screen:** Today > StarterBlock secondary link
- **Problem:** "View today" text doesn't clearly indicate it scrolls to daily plan section
- **Proposed Change:** Change copy to "View Plan" or "Show Daily Plan"
- **Risk:** Very Low
- **Effort:** S

### TD-03: Action cards lack consistent icon sizing
- **Screen:** Today > ExploreDrawer > Action cards
- **Problem:** SVG icons are defined inline with varying viewBox patterns
- **Proposed Change:** Standardize all action card icons to 24x24 with consistent strokeWidth
- **Risk:** Very Low
- **Effort:** S

### TD-04: Section titles inconsistent capitalization
- **Screen:** Today > ExploreDrawer sections
- **Problem:** "Get Started", "Production", "Learn & Grow" - mix of title case styles
- **Proposed Change:** Standardize to sentence case: "Get started", "Production", "Learn and grow"
- **Risk:** Very Low
- **Effort:** S

### TD-05: Reduced mode banner lacks dismiss action
- **Screen:** Today > ReducedModeBanner
- **Problem:** User cannot dismiss the "Welcome back" banner if they don't want reduced mode
- **Proposed Change:** Add small "x" dismiss button that clears reduced mode for session
- **Risk:** Low
- **Effort:** M

---

## Focus Module

### FO-01: Timer buttons lack loading states
- **Screen:** Focus > Timer view > Start/Pause/Reset buttons
- **Problem:** Clicking start/pause has no immediate visual feedback while API call processes
- **Proposed Change:** Add brief loading spinner or disabled state during API calls
- **Risk:** Low
- **Effort:** M

### FO-02: Mode toggle buttons lack active state clarity
- **Screen:** Focus > Timer view > Focus/Break/Long Break tabs
- **Problem:** Selected mode tab has subtle styling difference; easy to miss
- **Proposed Change:** Increase contrast on active tab with stronger border or background
- **Risk:** Very Low
- **Effort:** S

### FO-03: Settings panel has no cancel affordance
- **Screen:** Focus > Settings view
- **Problem:** After editing settings, only "Save" is visible; no way to discard changes
- **Proposed Change:** Add "Cancel" button next to Save that reverts to previous values
- **Risk:** Low
- **Effort:** S

### FO-04: History view shows empty state without guidance
- **Screen:** Focus > History view (no sessions)
- **Problem:** New users see blank history with no explanation
- **Proposed Change:** Add empty state: "No sessions yet. Complete your first focus session to see it here."
- **Risk:** Very Low
- **Effort:** S

### FO-05: Timer completion has no visual celebration
- **Screen:** Focus > Timer completes
- **Problem:** Timer silently resets; easy to miss that session completed
- **Proposed Change:** Add brief success banner or toast before auto-transition
- **Risk:** Low
- **Effort:** M

---

## Quests Module

### QU-01: Tab buttons lack keyboard focus indicator
- **Screen:** Quests > Tab bar (Daily/Weekly/Special)
- **Problem:** Tab buttons don't show visible focus ring when navigating with keyboard
- **Proposed Change:** Add `:focus-visible` outline using `--color-border-focus`
- **Risk:** Very Low
- **Effort:** S

### QU-02: Quest cards progress bar lacks percentage label
- **Screen:** Quests > Quest card with progress
- **Problem:** Progress bar shows visual only; screen readers and users can't see exact %
- **Proposed Change:** Add small text showing "2/5" or "40%" next to progress bar
- **Risk:** Very Low
- **Effort:** S

### QU-03: Completed quests visually blend with incomplete
- **Screen:** Quests > List with mixed completion states
- **Problem:** Completed quests have subtle styling; hard to distinguish at a glance
- **Proposed Change:** Add checkmark icon and reduce opacity on completed quest cards
- **Risk:** Very Low
- **Effort:** S

### QU-04: Add quest form has no input validation feedback
- **Screen:** Quests > Add quest modal/form
- **Problem:** Empty title submits silently (likely fails); no inline validation
- **Proposed Change:** Add "Title is required" inline error when submitting empty
- **Risk:** Low
- **Effort:** S

---

## Habits Module

### HA-01: Habit completion button is too small on mobile
- **Screen:** Habits > Habit card > Complete button (checkmark)
- **Problem:** Touch target is small and easy to miss on mobile
- **Proposed Change:** Increase button padding to minimum 44x44 touch target
- **Risk:** Very Low
- **Effort:** S

### HA-02: Streak counter not visible on habit list
- **Screen:** Habits > Habit list
- **Problem:** User must click into habit details to see streak count
- **Proposed Change:** Show small streak badge (flame icon + number) on habit card
- **Risk:** Very Low
- **Effort:** S

### HA-03: Category filter has no "show all" option after filtering
- **Screen:** Habits > Category filter
- **Problem:** After selecting a category, it's unclear how to return to all habits
- **Proposed Change:** Ensure "All" category button is always visible and clearly styled
- **Risk:** Very Low
- **Effort:** S

### HA-04: Preset habits lack descriptions
- **Screen:** Habits > Add form > Preset habits
- **Problem:** Preset buttons show only title; unclear what each involves
- **Proposed Change:** Add brief tooltip or subtitle showing expected behavior
- **Risk:** Very Low
- **Effort:** S

---

## Exercise Module

### EX-01: Tab bar overflows on small screens
- **Screen:** Exercise > Tab bar (Library/Workouts/Programs/History/Records)
- **Problem:** 5 tabs don't fit on narrow mobile screens
- **Proposed Change:** Add horizontal scroll with fade indicators, or collapse to dropdown on mobile
- **Risk:** Low
- **Effort:** M

### EX-02: Exercise search has no clear button
- **Screen:** Exercise > Library > Search input
- **Problem:** After typing, user must manually select and delete to clear search
- **Proposed Change:** Add X button inside input that clears search
- **Risk:** Very Low
- **Effort:** S

### EX-03: Workout builder has no confirmation on discard
- **Screen:** Exercise > Workout builder > Navigate away
- **Problem:** Unsaved workout changes are lost without warning
- **Proposed Change:** Add confirmation dialog if user has unsaved changes
- **Risk:** Low
- **Effort:** M

### EX-04: Personal records list shows dates without context
- **Screen:** Exercise > Records tab
- **Problem:** Date format is raw ISO string or inconsistent
- **Proposed Change:** Format as "2 days ago" or "Jan 3, 2026" consistently
- **Risk:** Very Low
- **Effort:** S

---

## Learn Module

### LE-01: Dashboard shows mock data indicator
- **Screen:** Learn > Dashboard
- **Problem:** Dashboard shows "0" for all stats with mock data; confusing for new users
- **Proposed Change:** Add empty state messaging or remove stats section until API ready
- **Risk:** Low
- **Effort:** M

### LE-02: "Skip for now" button lacks styling
- **Screen:** Learn > Diagnostic prompt
- **Problem:** Skip button is plain text link, doesn't look interactive
- **Proposed Change:** Style as ghost button with hover state
- **Risk:** Very Low
- **Effort:** S

### LE-03: Sub-navigation lacks current route indicator
- **Screen:** Learn > Sidebar or tabs for sub-routes
- **Problem:** User can't tell which learn sub-section they're on
- **Proposed Change:** Add active state styling to current sub-route link
- **Risk:** Very Low
- **Effort:** S

### LE-04: Review page has no "nothing to review" state
- **Screen:** Learn > Review (empty)
- **Problem:** Empty review queue shows blank page or error
- **Proposed Change:** Add friendly empty state: "All caught up! No cards to review right now."
- **Risk:** Very Low
- **Effort:** S

---

## Hub/Shortcuts Module

### HU-01: Search bar is non-functional
- **Screen:** Hub > Search input
- **Problem:** Search input exists but doesn't filter DAW list
- **Proposed Change:** Wire up filtering or remove input until functional
- **Risk:** Low
- **Effort:** M

### HU-02: DAW cards lack hover state
- **Screen:** Hub > DAW selection cards
- **Problem:** Cards don't visually respond to hover; unclear they're clickable
- **Proposed Change:** Add hover background color and cursor:pointer
- **Risk:** Very Low
- **Effort:** S

### HU-03: Shortcut detail page lacks back button
- **Screen:** Hub > [dawId] detail page
- **Problem:** User must use browser back or sidebar; no in-page back affordance
- **Proposed Change:** Add "Back to Hub" link in page header
- **Risk:** Very Low
- **Effort:** S

---

## Infobase Module

### IN-01: Entry list shows raw date format
- **Screen:** Infobase > Entry list > Date column
- **Problem:** Dates show as ISO strings; not human-readable
- **Proposed Change:** Format as "Jan 3, 2026" or relative ("2 days ago")
- **Risk:** Very Low
- **Effort:** S

### IN-02: Delete confirmation is missing
- **Screen:** Infobase > Entry > Delete action
- **Problem:** Deleting an entry happens immediately with no undo
- **Proposed Change:** Add confirmation dialog or undo toast
- **Risk:** Low
- **Effort:** M

### IN-03: Quick mode auto-focus doesn't work in all browsers
- **Screen:** Infobase > ?quick=1 mode
- **Problem:** Auto-focus on title input uses setTimeout; may not work consistently
- **Proposed Change:** Use useEffect with ref.current?.focus() pattern
- **Risk:** Very Low
- **Effort:** S

### IN-04: Category sidebar has no active indicator
- **Screen:** Infobase > Category list
- **Problem:** Selected category doesn't have distinct active styling
- **Proposed Change:** Add background color or left border to selected category
- **Risk:** Very Low
- **Effort:** S

---

## Market Module

### MA-01: Purchase confirmation is abrupt
- **Screen:** Market > Reward > Purchase button
- **Problem:** Clicking purchase immediately deducts coins; no confirmation
- **Proposed Change:** Add confirmation dialog: "Spend 50 coins on Fancy Coffee?"
- **Risk:** Low
- **Effort:** M

### MA-02: Insufficient coins message is unclear
- **Screen:** Market > Reward with cost > balance
- **Problem:** Purchase button is disabled but no explanation why
- **Proposed Change:** Add tooltip or disabled text: "Need 20 more coins"
- **Risk:** Very Low
- **Effort:** S

### MA-03: Purchase history is not visible
- **Screen:** Market > No history view
- **Problem:** User can't see what they've purchased before
- **Proposed Change:** Add "Recent Purchases" section or tab showing last 10 purchases
- **Risk:** Low
- **Effort:** M

### MA-04: Custom reward form lacks validation
- **Screen:** Market > Add custom reward
- **Problem:** Empty name or zero cost can be submitted
- **Proposed Change:** Add inline validation: "Name is required", "Cost must be > 0"
- **Risk:** Very Low
- **Effort:** S

---

## Progress Module

### PR-01: Skill wheel labels overlap on mobile
- **Screen:** Progress > Skill wheel
- **Problem:** Skill labels around wheel overlap when viewport is narrow
- **Proposed Change:** Reduce font size or hide labels on mobile, show on tap
- **Risk:** Low
- **Effort:** M

### PR-02: Stats cards show 0 without context
- **Screen:** Progress > Stats section
- **Problem:** New users see "0 XP", "0 Quests", "0 Focus Hours" - looks broken
- **Proposed Change:** Add empty state: "Complete activities to see your stats here"
- **Risk:** Very Low
- **Effort:** S

### PR-03: Recent activity list is empty with no message
- **Screen:** Progress > Recent activity
- **Problem:** Empty activity list shows nothing
- **Proposed Change:** Add empty state: "No recent activity. Get started with a focus session!"
- **Risk:** Very Low
- **Effort:** S

---

## Reference Module

### RE-01: File upload has no drag-drop indicator
- **Screen:** Reference > Upload area
- **Problem:** Drag-drop zone doesn't visually indicate drop is possible
- **Proposed Change:** Add dashed border and "Drop audio files here" text
- **Risk:** Very Low
- **Effort:** S

### RE-02: Track list shows no loading state
- **Screen:** Reference > Track list (loading)
- **Problem:** List shows blank while loading; appears broken
- **Proposed Change:** Add loading spinner or skeleton cards
- **Risk:** Very Low
- **Effort:** S

### RE-03: Audio player lacks keyboard controls
- **Screen:** Reference > Track player
- **Problem:** Play/pause only works with mouse click
- **Proposed Change:** Add keyboard support: Space = play/pause, Arrow keys = seek
- **Risk:** Low
- **Effort:** M

---

## Global/Shell

### GL-01: Mobile bottom bar icons lack labels
- **Screen:** Mobile > Bottom navigation bar
- **Problem:** Icons only; new users may not recognize all icons
- **Proposed Change:** Add small text labels under each icon (Today, Focus, Quests, More)
- **Risk:** Very Low
- **Effort:** S

### GL-02: Sidebar active link not obvious
- **Screen:** Desktop > Sidebar
- **Problem:** Current page link has subtle active state
- **Proposed Change:** Increase active link contrast with background color and left border
- **Risk:** Very Low
- **Effort:** S

### GL-03: Toast notifications not visible in all contexts
- **Screen:** Global > After async operations
- **Problem:** Some operations complete silently with no feedback
- **Proposed Change:** Ensure all create/update/delete operations show brief toast
- **Risk:** Low
- **Effort:** M

### GL-04: Theme toggle has no animation
- **Screen:** Settings > Theme toggle (or header toggle)
- **Problem:** Theme switch is instant; jarring experience
- **Proposed Change:** Add brief CSS transition (150ms) on color property changes
- **Risk:** Very Low
- **Effort:** S

---

## Top 15 Prioritized List

| Rank | ID | Module | Problem Summary | Effort | Impact | Status |
|------|------|--------|----------------|--------|--------|--------|
| 1 | FO-01 | Focus | Timer buttons lack loading states | M | High - core UX | DONE |
| 2 | HA-01 | Habits | Completion button too small on mobile | S | High - usability | DONE |
| 3 | GL-01 | Global | Mobile bottom bar lacks labels | S | High - navigation | N/A (has MobileNav) |
| 4 | TD-05 | Today | Reduced mode banner lacks dismiss | M | High - new feature | DONE |
| 5 | MA-01 | Market | Purchase confirmation missing | M | High - prevents errors | DONE |
| 6 | EX-01 | Exercise | Tab bar overflows on mobile | M | High - usability | DONE |
| 7 | FO-04 | Focus | History empty state lacks guidance | S | Medium - onboarding | DONE |
| 8 | QU-03 | Quests | Completed quests blend with incomplete | S | Medium - clarity | DONE |
| 9 | LE-01 | Learn | Dashboard shows mock data indicator | M | Medium - polish | PENDING |
| 10 | IN-02 | Infobase | Delete confirmation missing | M | Medium - prevents errors | DONE (had confirm) |
| 11 | GL-02 | Global | Sidebar active link not obvious | S | Medium - navigation | DONE |
| 12 | TD-01 | Today | Explore Drawer lacks hover feedback | S | Medium - affordance | DONE |
| 13 | HU-02 | Hub | DAW cards lack hover state | S | Medium - affordance | DONE |
| 14 | PR-02 | Progress | Stats cards show 0 without context | S | Medium - onboarding | DONE |
| 15 | FO-02 | Focus | Mode toggle lacks active state clarity | S | Low - polish | DONE |

---

## Summary Statistics

| Category | Count | S | M | L |
|----------|-------|---|---|---|
| Today | 5 | 4 | 1 | 0 |
| Focus | 5 | 3 | 2 | 0 |
| Quests | 4 | 4 | 0 | 0 |
| Habits | 4 | 4 | 0 | 0 |
| Exercise | 4 | 2 | 2 | 0 |
| Learn | 4 | 3 | 1 | 0 |
| Hub | 3 | 2 | 1 | 0 |
| Infobase | 4 | 3 | 1 | 0 |
| Market | 4 | 2 | 2 | 0 |
| Progress | 3 | 2 | 1 | 0 |
| Reference | 3 | 2 | 1 | 0 |
| Global | 4 | 3 | 1 | 0 |
| **Total** | **47** | **34** | **13** | **0** |

---

**End of Document**


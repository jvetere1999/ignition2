# Today IA and Interaction Contract

**Document Version:** 1.0  
**Created:** 2026-01-04  
**Scope:** Today Page Information Architecture and Interaction Specification

---

## 1) Current Today: Element Inventory (from code)

### 1.1 Render Order (from `page.tsx`)

| Order | Element | Type | Route/Action |
|-------|---------|------|--------------|
| 1 | Header | Static | N/A |
| 1.1 | Greeting (dynamic: "Good morning/afternoon/evening, {firstName}") | Text | N/A |
| 1.2 | Subtitle ("Here's what's on your plate today.") | Text | N/A |
| 2 | DailyPlanWidget | Component (client) | `/api/daily-plan` |
| 3 | "Get Started" Section | Section | N/A |
| 3.1 | Start Focus | Action Card | `/focus` |
| 3.2 | Plan Day | Action Card | `/planner` |
| 3.3 | Quests | Action Card | `/quests` |
| 3.4 | Exercise | Action Card | `/exercise` |
| 4 | "Production" Section | Section | N/A |
| 4.1 | Shortcuts | Action Card | `/hub` |
| 4.2 | Arrange | Action Card | `/arrange` |
| 4.3 | Reference | Action Card | `/reference` |
| 4.4 | Templates | Action Card | `/templates` |
| 5 | "Learn & Grow" Section | Section | N/A |
| 5.1 | Learn | Action Card | `/learn` |
| 5.2 | Infobase | Action Card | `/infobase` |
| 5.3 | Goals | Action Card | `/goals` |
| 5.4 | Progress | Action Card | `/progress` |
| 6 | "Rewards" Section | Section | N/A |
| 6.1 | Visit Market | Link | `/market` |
| 6.2 | Reward description text | Static text | N/A |

**Total Action Cards:** 12  
**Total Sections:** 5 (including DailyPlanWidget as a section)

---

### 1.2 DailyPlanWidget States (from `DailyPlan.tsx`)

| State | Condition | Rendered Content |
|-------|-----------|------------------|
| Loading | `isLoading === true` | "Loading your plan..." |
| Empty | `plan === null` | Header + "No plan for today yet." + "Plan My Day" button |
| Populated | `plan !== null` | Header + Progress bar + Item list + "Regenerate Plan" button |

---

### 1.3 DailyPlanWidget Item Structure

```typescript
interface PlanItem {
  id: string;
  type: "focus" | "quest" | "workout" | "learning" | "habit";
  title: string;
  description?: string;
  duration?: number;
  actionUrl: string;
  completed: boolean;
  priority: number;  // Lower number = higher priority
}
```

---

### 1.4 Conditionally Rendered Elements

| Element | Condition |
|---------|-----------|
| DailyPlanWidget loading state | `isLoading === true` |
| DailyPlanWidget empty state | `plan === null` |
| DailyPlanWidget populated state | `plan !== null` |
| Item description | `item.description !== undefined` |
| Item checkmark icon | `item.completed === true` |
| "Regenerating..." button text | `isGenerating === true` |

---

### 1.5 Current CTA Inventory

| CTA Label | Route | Section |
|-----------|-------|---------|
| Start Focus | `/focus` | Get Started |
| Plan Day | `/planner` | Get Started |
| Quests | `/quests` | Get Started |
| Exercise | `/exercise` | Get Started |
| Shortcuts | `/hub` | Production |
| Arrange | `/arrange` | Production |
| Reference | `/reference` | Production |
| Templates | `/templates` | Production |
| Learn | `/learn` | Learn & Grow |
| Infobase | `/infobase` | Learn & Grow |
| Goals | `/goals` | Learn & Grow |
| Progress | `/progress` | Learn & Grow |
| Visit Market | `/market` | Rewards |
| Plan My Day | POST `/api/daily-plan` | DailyPlanWidget (empty) |
| Regenerate Plan | POST `/api/daily-plan` | DailyPlanWidget (populated) |
| Start (per item) | `item.actionUrl` | DailyPlanWidget items |

---

## 2) Proposed Today: Render Order and Collapse Rules

### 2.1 New Render Order

| Order | Element | Default State | Notes |
|-------|---------|---------------|-------|
| 1 | Header | N/A | Unchanged (greeting + subtitle) |
| 2 | **StarterBlock** (NEW) | Expanded | Single dominant CTA based on branching logic |
| 3 | DailyPlanWidget | **Collapsed** | Shows summary only; expand to see full list |
| 4 | Explore Section | **Collapsed** | Contains all action cards; hidden behind "More" |
| 5 | Rewards Section | Collapsed | Moved to bottom; minimal footprint |

---

### 2.2 Section Specifications

#### 2.2.1 Header (Order 1)

- **Default State:** Expanded (always visible)
- **Trigger to Expand:** N/A (never collapses)
- **Max Visible CTAs:** 0
- **Copy:**
  - Title: `"{Greeting}, {firstName}"` (dynamic)
  - Subtitle: `"Here's what's on your plate today."`

---

#### 2.2.2 StarterBlock (Order 2) - NEW

- **Default State:** Expanded (always visible)
- **Trigger to Expand:** N/A (never collapses)
- **Max Visible CTAs:** **1** (exactly one dominant CTA)
- **Copy:**
  - No section header
  - CTA button text: Dynamic based on selected action (see Section 3)
  - Supporting text: One-line context (optional)

**Visual Specification:**
- Large, prominent button (primary accent color)
- Icon matching the action type
- Button fills available width (mobile) or 50% width (desktop)
- No surrounding action cards visible at this level

**Example States:**

| Condition | CTA Label | Route |
|-----------|-----------|-------|
| First incomplete plan item | `"Continue: {item.title}"` | `item.actionUrl` |
| No plan, no items | `"Start Focus"` | `/focus` |
| All plan items complete | `"Start Focus"` | `/focus` |

---

#### 2.2.3 DailyPlanWidget (Order 3)

- **Default State:** **Collapsed**
- **Trigger to Expand:** Click on header row or expand chevron
- **Max Visible CTAs in Collapsed State:** **0** (summary only)
- **Max Visible CTAs in Expanded State:** All items (no limit)
- **Copy:**
  - Collapsed Header: `"Today's Plan"` + `"{completedCount}/{totalCount}"`
  - Collapsed Summary: Progress bar only (no item list)
  - Expand Affordance: Chevron icon (down when collapsed, up when expanded)

**Collapsed View Contents:**
```
[Today's Plan]                    [3/5] [v]
[========--------------------] (progress bar)
```

**Expanded View Contents:**
- Full item list (unchanged from current)
- "Regenerate Plan" button
- Collapse affordance at bottom

**Persistence:**
- Collapse state stored in `localStorage` key: `"today_dailyplan_collapsed"`
- Default for new users: Collapsed

---

#### 2.2.4 Explore Section (Order 4)

- **Default State:** **Collapsed**
- **Trigger to Expand:** Click "See More" button
- **Max Visible CTAs in Collapsed State:** **0**
- **Max Visible CTAs in Expanded State:** 12 (all existing action cards)
- **Copy:**
  - Collapsed Header: `"Explore"`
  - Expand Button: `"See More"`
  - Collapse Button: `"Show Less"`

**Collapsed View Contents:**
```
[Explore]                         [See More >]
```

**Expanded View Contents:**
- All action cards grouped by category:
  - Get Started (4 cards)
  - Production (4 cards)
  - Learn & Grow (4 cards)
- "Show Less" button at bottom

**Persistence:**
- Collapse state stored in `localStorage` key: `"today_explore_collapsed"`
- Default for new users: Collapsed

---

#### 2.2.5 Rewards Section (Order 5)

- **Default State:** Collapsed
- **Trigger to Expand:** Click on header row
- **Max Visible CTAs in Collapsed State:** **1** (Visit Market link)
- **Max Visible CTAs in Expanded State:** 1
- **Copy:**
  - Header: `"Rewards"`
  - Link: `"Visit Market"`
  - Expanded Text: `"Complete quests and focus sessions to earn coins and XP."`

**Collapsed View Contents:**
```
[Rewards]                         [Visit Market]
```

**Expanded View Contents:**
- Full reward description text
- Visit Market link

**Persistence:**
- No persistence (always starts collapsed)

---

### 2.3 Reduced Mode Placeholder (Optional - Future)

If Reduced Mode is active (user returning after gap):

| Order | Element | State |
|-------|---------|-------|
| 1 | Header | Visible |
| 2 | StarterBlock | Visible (single CTA only) |
| 3 | "Dismiss" link | Visible |
| 4-5 | All other sections | Hidden |

**Copy:**
- Dismiss link: `"Show full dashboard"`

---

## 3) Branching Logic for Default Starter

### 3.1 Decision Tree

```
START
  |
  v
[Has plan?] -- No --> GOTO "Fallback Chain"
  |
  Yes
  |
  v
[Has incomplete items?] -- No --> GOTO "Fallback Chain"
  |
  Yes
  |
  v
RETURN: First incomplete item (sorted by priority ASC)
  - CTA Label: "Continue: {item.title}"
  - Route: item.actionUrl

---

FALLBACK CHAIN:
  |
  v
[1] RETURN: Focus
  - CTA Label: "Start Focus"
  - Route: /focus
```

---

### 3.2 Data Fields Used

| Field | Source | Type | Usage |
|-------|--------|------|-------|
| `plan` | DailyPlanWidget state | `DailyPlan \| null` | Check if plan exists |
| `plan.items` | DailyPlan object | `PlanItem[]` | Iterate to find incomplete |
| `plan.items[].completed` | PlanItem | `boolean` | Filter incomplete items |
| `plan.items[].priority` | PlanItem | `number` | Sort by priority (ASC) |
| `plan.items[].actionUrl` | PlanItem | `string` | Route for selected item |
| `plan.items[].title` | PlanItem | `string` | Display in CTA label |
| `plan.items[].type` | PlanItem | `string` | Icon selection |

---

### 3.3 Pseudocode Implementation

```typescript
function getStarterAction(plan: DailyPlan | null): StarterAction {
  // Case 1: Plan exists with incomplete items
  if (plan && plan.items.length > 0) {
    const incompleteItems = plan.items
      .filter(item => !item.completed)
      .sort((a, b) => a.priority - b.priority);
    
    if (incompleteItems.length > 0) {
      const firstItem = incompleteItems[0];
      return {
        label: `Continue: ${firstItem.title}`,
        route: firstItem.actionUrl,
        icon: getIconForType(firstItem.type),
      };
    }
  }
  
  // Case 2: Fallback to Focus
  return {
    label: "Start Focus",
    route: "/focus",
    icon: "focus",
  };
}
```

---

### 3.4 Icon Mapping

| Item Type | Icon Key | Existing? |
|-----------|----------|-----------|
| `focus` | Focus target icon | Yes (in DailyPlan.tsx) |
| `quest` | Document with checkmark | Yes |
| `workout` | Running figure | Yes |
| `learning` | Book | Yes |
| `habit` | Sun/cycle | Yes |

---

## 4) Acceptance Criteria (Testable)

### 4.1 StarterBlock Requirements

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-1 | On Today page load, exactly one dominant CTA is visible in StarterBlock | E2E: Count elements with `[data-testid="starter-cta"]` === 1 |
| AC-2 | StarterBlock CTA matches first incomplete plan item when plan exists | E2E: Compare CTA text to first incomplete item title |
| AC-3 | StarterBlock CTA is "Start Focus" when no plan or all items complete | E2E: Verify text and route |
| AC-4 | StarterBlock CTA navigates to correct route on click | E2E: Click and verify URL |

---

### 4.2 Collapse Behavior Requirements

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-5 | DailyPlanWidget is collapsed by default on first visit | E2E: Check collapsed state class/attribute |
| AC-6 | DailyPlanWidget collapse state persists across page reload | E2E: Expand, reload, verify still expanded |
| AC-7 | Explore section is collapsed by default | E2E: Check collapsed state |
| AC-8 | Explore section expand/collapse toggles action card visibility | E2E: Click "See More", verify cards visible |
| AC-9 | Action cards are NOT visible in default (collapsed) view | E2E: Query action cards, expect 0 in viewport |

---

### 4.3 Navigation Regression Requirements

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-10 | All 12 action card routes are accessible from Explore section | E2E: Expand, click each, verify route |
| AC-11 | Visit Market link navigates to `/market` | E2E: Click, verify URL |
| AC-12 | DailyPlanWidget item "Start" buttons navigate correctly | E2E: Click item Start, verify route |
| AC-13 | No broken links (all hrefs resolve to valid pages) | E2E: Crawl all links, verify 200/redirect |

---

### 4.4 DailyPlanWidget Functional Requirements

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-14 | "Plan My Day" generates a plan (empty state) | E2E: Click, verify plan appears |
| AC-15 | Item completion updates progress count | E2E: Complete item, verify count increments |
| AC-16 | "Regenerate Plan" creates new plan | E2E: Click, verify items change |
| AC-17 | Collapsed view shows correct progress count | E2E: Compare summary to expanded item count |

---

### 4.5 Visual/Layout Requirements

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-18 | StarterBlock is visually dominant (largest CTA on page) | Manual: Visual inspection |
| AC-19 | Mobile layout (375px) shows single-column StarterBlock | E2E: Set viewport, screenshot comparison |
| AC-20 | Theme toggle works with new layout | E2E: Toggle theme, verify no broken styles |

---

### 4.6 Accessibility Requirements

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-21 | StarterBlock CTA is keyboard accessible (Tab + Enter) | E2E: Tab to CTA, press Enter, verify navigation |
| AC-22 | Collapse/expand controls are keyboard accessible | E2E: Tab to toggle, press Enter/Space |
| AC-23 | Screen reader announces collapse state | Manual: Test with VoiceOver/NVDA |

---

## 5) Copy Reference Table

| Element | Copy | Notes |
|---------|------|-------|
| StarterBlock CTA (plan item) | `"Continue: {item.title}"` | Max 40 characters total |
| StarterBlock CTA (fallback) | `"Start Focus"` | Static |
| DailyPlanWidget Header | `"Today's Plan"` | Static |
| DailyPlanWidget Progress | `"{completedCount}/{totalCount}"` | Dynamic |
| Explore Section Header | `"Explore"` | Static |
| Explore Expand Button | `"See More"` | Static |
| Explore Collapse Button | `"Show Less"` | Static |
| Rewards Header | `"Rewards"` | Static |
| Rewards Link | `"Visit Market"` | Static |

---

## 6) Data Dependencies Summary

| Data | Source | Required For |
|------|--------|--------------|
| `session.user.name` | Auth.js session | Header greeting |
| `plan` | `/api/daily-plan` GET | StarterBlock, DailyPlanWidget |
| `plan.items[]` | `/api/daily-plan` GET | StarterBlock branching, item list |
| `plan.completedCount` | `/api/daily-plan` GET | Progress summary |
| `plan.totalCount` | `/api/daily-plan` GET | Progress summary |

**No new API endpoints required.** All data is already available from existing sources.

---

## 7) localStorage Keys

| Key | Type | Default | Used By |
|-----|------|---------|---------|
| `today_dailyplan_collapsed` | `boolean` | `true` | DailyPlanWidget collapse state |
| `today_explore_collapsed` | `boolean` | `true` | Explore section collapse state |

---

## END OF DOCUMENT


# Passion_OS_Ground_Truth_Audit.md

---

# SECTION A-F: PRACTICAL REDESIGN INPUTS

---

# A) Today Page Component Tree and File Paths

## A1. Entry file
- **Path:** `src/app/(app)/today/page.tsx`
- **Exported component name:** `TodayPage` (default export)
- **Route group (confirm):** `(app)` - authenticated routes with AppShell wrapper
- **Middleware/redirect interactions:**
  - Middleware at `src/middleware.ts` redirects authenticated users from `/` to `/today`
  - Unauthenticated users accessing `/today` are redirected to `/auth/signin?callbackUrl=/today`
  - Session validated via `auth()` from `@/lib/auth`

## A2. Component import tree (top-down)

- Component: `TodayPage` (async server component)
  - Imported from: `src/app/(app)/today/page.tsx`
  - Purpose (factual): Main Today dashboard page
  - Props passed from Today: None (is the root)
  - Internal state: None (server component)
  - API calls initiated: `auth()` to get session

- Component: `DailyPlanWidget`
  - Imported from: `./DailyPlan`
  - Purpose (factual): Displays daily plan with items, allows generation and completion
  - Props passed from Today: None
  - Internal state: `plan`, `isLoading`, `isGenerating` (useState hooks)
  - API calls initiated: 
    - `GET /api/daily-plan` on mount and auto-refresh
    - `POST /api/daily-plan` with `action: "generate"` or `action: "complete_item"`

- Component: `Link` (used 14 times)
  - Imported from: `next/link`
  - Purpose (factual): Client-side navigation links
  - Props passed from Today: `href`, `className`
  - Internal state: N/A (Next.js component)
  - API calls initiated: NONE

- Component: `AppShell` (via layout)
  - Imported from: `@/components/shell` (in `src/app/(app)/layout.tsx`)
  - Purpose (factual): Provides Header, Sidebar, BottomBar, Omnibar, TOSModal
  - Props passed from Today: N/A (layout wrapper)
  - Internal state: `sidebarOpen`, `omnibarOpen`, `showTOS`, `tosChecked`
  - API calls initiated: `GET /api/auth/accept-tos` for TOS check

## A3. Related files that shape Today behavior

- **Daily plan widget component path:** `src/app/(app)/today/DailyPlan.tsx`
- **Action card grid component path:** Inline in `src/app/(app)/today/page.tsx` (no separate component)
- **Any "Plan My Day" handler path:** `src/app/(app)/today/DailyPlan.tsx` - `handleGeneratePlan` function
- **Any styling/layout wrappers:**
  - `src/app/(app)/today/page.module.css` - Today page styles
  - `src/app/(app)/today/DailyPlan.module.css` - Daily plan widget styles
  - `src/app/(app)/layout.tsx` - AppShell wrapper
  - `src/components/shell/AppShell.tsx` - Shell component
  - `src/components/shell/AppShell.module.css` - Shell styles
- **API route:** `src/app/api/daily-plan/route.ts`
- **Auto-refresh hook:** `src/lib/hooks/useAutoRefresh.ts`

## A4. Code excerpts

### Today page JSX structure (top-level return):
```tsx
// src/app/(app)/today/page.tsx lines 24-216
return (
  <div className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>
        {greeting}, {firstName}
      </h1>
      <p className={styles.subtitle}>
        Here&apos;s what&apos;s on your plate today.
      </p>
    </header>

    <div className={styles.grid}>
      {/* Daily Plan */}
      <section className={styles.planSection}>
        <DailyPlanWidget />
      </section>

      {/* Primary Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Get Started</h2>
        <div className={styles.actions}>
          <Link href="/focus" className={styles.actionCard}>...</Link>
          <Link href="/planner" className={styles.actionCard}>...</Link>
          <Link href="/quests" className={styles.actionCard}>...</Link>
          <Link href="/exercise" className={styles.actionCard}>...</Link>
        </div>
      </section>

      {/* Production Tools */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Production</h2>
        <div className={styles.actions}>
          <Link href="/hub" className={styles.actionCard}>...</Link>
          <Link href="/arrange" className={styles.actionCard}>...</Link>
          <Link href="/reference" className={styles.actionCard}>...</Link>
          <Link href="/templates" className={styles.actionCard}>...</Link>
        </div>
      </section>

      {/* Knowledge & Learning */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Learn & Grow</h2>
        <div className={styles.actions}>
          <Link href="/learn" className={styles.actionCard}>...</Link>
          <Link href="/infobase" className={styles.actionCard}>...</Link>
          <Link href="/goals" className={styles.actionCard}>...</Link>
          <Link href="/progress" className={styles.actionCard}>...</Link>
        </div>
      </section>

      {/* Rewards Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Rewards</h2>
          <Link href="/market" className={styles.sectionLink}>
            Visit Market
          </Link>
        </div>
        <div className={styles.rewardCard}>
          <p className={styles.rewardText}>
            Complete quests and focus sessions to earn coins and XP.
            Redeem rewards in the Market!
          </p>
        </div>
      </section>
    </div>
  </div>
);
```

### Daily plan widget render call:
```tsx
// src/app/(app)/today/page.tsx lines 36-38
<section className={styles.planSection}>
  <DailyPlanWidget />
</section>
```

### Daily plan widget empty state render:
```tsx
// src/app/(app)/today/DailyPlan.tsx lines 171-186
if (!plan) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Daily Plan</h3>
      </div>
      <div className={styles.empty}>
        <p>No plan for today yet.</p>
        <button
          className={styles.generateButton}
          onClick={handleGeneratePlan}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Plan My Day"}
        </button>
      </div>
    </div>
  );
}
```

### Daily plan widget with items render:
```tsx
// src/app/(app)/today/DailyPlan.tsx lines 190-247
const progress = plan.totalCount > 0 ? (plan.completedCount / plan.totalCount) * 100 : 0;

return (
  <div className={styles.container}>
    <div className={styles.header}>
      <h3 className={styles.title}>Today&apos;s Plan</h3>
      <span className={styles.progress}>
        {plan.completedCount}/{plan.totalCount}
      </span>
    </div>

    <div className={styles.progressBar}>
      <div className={styles.progressFill} style={{ width: `${progress}%` }} />
    </div>

    <div className={styles.items}>
      {plan.items.map((item) => (
        <div
          key={item.id}
          className={`${styles.item} ${item.completed ? styles.completed : ""}`}
        >
          <button
            className={styles.checkbox}
            onClick={() => !item.completed && handleCompleteItem(item.id)}
            disabled={item.completed}
          >
            {item.completed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          <div className={styles.itemContent}>
            <div className={styles.itemHeader}>
              <span className={styles.itemIcon}>{getTypeIcon(item.type)}</span>
              <span className={styles.itemTitle}>{item.title}</span>
            </div>
            {item.description && (
              <p className={styles.itemDescription}>{item.description}</p>
            )}
          </div>
          <Link href={item.actionUrl} className={styles.startButton}>
            Start
          </Link>
        </div>
      ))}
    </div>

    <button
      className={styles.regenerateButton}
      onClick={handleGeneratePlan}
      disabled={isGenerating}
    >
      {isGenerating ? "Regenerating..." : "Regenerate Plan"}
    </button>
  </div>
);
```

### Action cards render (example from Get Started section):
```tsx
// src/app/(app)/today/page.tsx lines 44-61
<Link href="/focus" className={styles.actionCard}>
  <div className={styles.actionIcon}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  </div>
  <span className={styles.actionLabel}>Start Focus</span>
</Link>
```

---

# B) Today Screen in 3 States (Text Description)

## B1. State 1 — No daily plan exists

**Header section:**
- h1 element with dynamic greeting: "[Good morning/Good afternoon/Good evening], [FirstName]"
- p element with subtitle: "Here's what's on your plate today."
- Styling: title is `font-size-2xl`, `font-weight-bold`, primary text color; subtitle is `font-size-base`, secondary text color

**Daily plan widget:**
- Container: `background: var(--color-bg-secondary)`, `border-radius: var(--radius-lg)`, `padding: var(--space-4)`, `border: 1px solid var(--color-border-primary)`
- Header: h3 with text "Daily Plan", `font-size-base`, `font-weight-semibold`
- No progress counter shown (only shown when plan exists)
- No progress bar shown
- Empty state centered text: "No plan for today yet."
- Primary button below text: "Plan My Day" (or "Generating..." when clicked)
- Button styling: `background: var(--color-accent-primary)`, `color: var(--color-text-inverse)`, `border-radius: var(--radius-md)`

**"Get Started" section:**
- Container with secondary background, rounded corners, padding
- h2 title: "Get Started"
- 4 action cards in responsive grid (`grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))`)
- Card titles and destinations:
  1. "Start Focus" -> /focus
  2. "Plan Day" -> /planner
  3. "Quests" -> /quests
  4. "Exercise" -> /exercise
- Each card: column flex layout, icon in accent-colored circle (48x48px), label below in `font-size-sm`

**"Production" section:**
- Same container styling as Get Started
- h2 title: "Production"
- 4 action cards:
  1. "Shortcuts" -> /hub
  2. "Arrange" -> /arrange
  3. "Reference" -> /reference
  4. "Templates" -> /templates

**"Learn & Grow" section:**
- Same container styling
- h2 title: "Learn & Grow"
- 4 action cards:
  1. "Learn" -> /learn
  2. "Infobase" -> /infobase
  3. "Goals" -> /goals
  4. "Progress" -> /progress

**Rewards section:**
- Same container styling
- Header row with: h2 "Rewards" on left, "Visit Market" link on right (accent-colored)
- Gradient card below: `background: linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-secondary, #9c27b0) 100%)`
- Card text: "Complete quests and focus sessions to earn coins and XP. Redeem rewards in the Market!"

**Primary CTA (exact label):** "Plan My Day"

**Any element visually emphasized:**
- The "Plan My Day" button is the only prominent accent-colored button in the Daily Plan widget
- All action cards have equal visual weight (same size icons, same styling)
- The Daily Plan widget appears first in the content flow, above all action card sections
- The Rewards card uses a gradient background, making it visually distinct from other sections

---

## B2. State 2 — Daily plan exists, none complete

**Daily plan header label (exact):** "Today's Plan" (note: changes from "Daily Plan" when plan exists)

**Completion counter format:** "0/4" (or whatever totalCount is) - appears to the right of title

**Progress bar state:**
- Height: 6px, full width
- Background: `var(--color-bg-tertiary)`
- Fill: 0% width (empty), `background: var(--color-accent-primary)`

**Plan item row layout:**
- Container: flex row, `align-items: center`, `gap: var(--space-3)`, padding, `background: var(--color-bg-primary)`, rounded corners
- Columns (left to right):
  1. **Checkbox button:** 20x20px circle, 2px border in accent color, empty interior (no checkmark), clickable
  2. **Item content:** flex-1, contains:
     - Item header row: type icon (16x16px SVG, tertiary color) + title text (`font-size-sm`, `font-weight-medium`, primary color)
     - Description (if exists): `font-size-xs`, tertiary color, below header
  3. **Start button:** "Start" text, `font-size-xs`, tertiary background, secondary text color, rounded, on hover becomes accent-colored

**Start button labels:** "Start" (same for all items)

**Checkbox behavior:**
- Clickable (not disabled)
- No checkmark icon shown
- On click: calls `handleCompleteItem(item.id)` which triggers optimistic update + API call

**Buttons at widget bottom (exact labels):** "Regenerate Plan" (or "Regenerating..." while loading)
- Styling: full width, transparent background, dashed border, secondary text color

**Whether other sections shift position or remain the same:**
- All sections remain in same position
- Daily plan widget height changes based on number of items
- Sections below shift down accordingly (CSS uses `gap: var(--space-6)` for grid)

---

## B3. State 3 — Daily plan partially complete

**How completed items differ visually:**
1. **Opacity change:** Entire item row gets `opacity: 0.6` via `.item.completed` class
2. **Title strikethrough:** Title text gets `text-decoration: line-through` via `.item.completed .itemTitle`
3. **Checkbox filled:** Checkbox button gets `background: var(--color-accent-primary)` (filled with accent color), displays white checkmark SVG inside
4. **Checkbox disabled:** Checkbox button has `disabled` attribute, cursor changes from pointer to default
5. **Start button unchanged:** Still shows "Start" with same styling

**Completion counter example:** "2/4" (shows completedCount / totalCount)

**Progress bar fill level:** Calculated as `(completedCount / totalCount) * 100` percent
- Example: 2/4 complete = 50% width fill
- Fill bar transitions smoothly via `transition: width var(--transition-normal)`

**Order of items (completed vs incomplete):**
- Items remain in original priority order (not sorted by completion status)
- Completed items do NOT move to bottom or top
- Original order from plan generation is preserved

**Regenerate Plan button behavior when partially complete:**
- Button remains visible and enabled
- Clicking regenerates entire plan (replaces current plan)
- Confirmation: NONE - no confirmation dialog before regenerating

---

# C) Today Screen Data Requirements

## C1. API endpoints called from Today screen

### GET /api/daily-plan

**Request:**
```http
GET /api/daily-plan
```

**Response when no plan exists:**
```json
{
  "plan": null
}
```

**Response when plan exists:**
```json
{
  "plan": {
    "id": "plan_1704380400000",
    "date": "2026-01-04",
    "items": [
      {
        "id": "plan_focus_1704380400001",
        "type": "focus",
        "title": "Focus Session",
        "description": "Complete a 25-minute focus session",
        "duration": 25,
        "actionUrl": "/focus",
        "completed": false,
        "priority": 0
      },
      {
        "id": "plan_quest_quest_123",
        "type": "quest",
        "title": "Complete 3 focus sessions",
        "description": "Build your focus habit",
        "actionUrl": "/quests",
        "completed": false,
        "priority": 1
      },
      {
        "id": "plan_quest_quest_456",
        "type": "quest",
        "title": "Log a workout",
        "description": "Stay active today",
        "actionUrl": "/quests",
        "completed": true,
        "priority": 2
      }
    ],
    "completedCount": 1,
    "totalCount": 3
  }
}
```

### POST /api/daily-plan (generate)

**Request:**
```http
POST /api/daily-plan
Content-Type: application/json

{
  "action": "generate"
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "id": "plan_1704380500000",
    "date": "2026-01-04",
    "items": [
      {
        "id": "plan_focus_1704380500001",
        "type": "focus",
        "title": "Focus Session",
        "description": "Complete a 25-minute focus session",
        "duration": 25,
        "actionUrl": "/focus",
        "completed": false,
        "priority": 0
      }
    ],
    "completedCount": 0,
    "totalCount": 1
  }
}
```

### POST /api/daily-plan (complete_item)

**Request:**
```http
POST /api/daily-plan
Content-Type: application/json

{
  "action": "complete_item",
  "item_id": "plan_focus_1704380400001"
}
```

**Response:**
```json
{
  "success": true,
  "completedCount": 2
}
```

## C2. Data shape for DailyPlanWidget state

```typescript
interface PlanItem {
  id: string;                                              // e.g., "plan_focus_1704380400001"
  type: "focus" | "quest" | "workout" | "learning" | "habit";
  title: string;                                           // e.g., "Focus Session"
  description?: string;                                    // e.g., "Complete a 25-minute focus session"
  duration?: number;                                       // minutes, e.g., 25
  actionUrl: string;                                       // e.g., "/focus"
  completed: boolean;
  priority: number;                                        // 0-based, lower = higher priority
}

interface DailyPlan {
  id: string;                                              // e.g., "plan_1704380400000"
  date: string;                                            // ISO date, e.g., "2026-01-04"
  items: PlanItem[];
  completedCount: number;
  totalCount: number;
}

// Widget state:
const [plan, setPlan] = useState<DailyPlan | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [isGenerating, setIsGenerating] = useState(false);
```

## C3. Plan generation logic (from API)

**Source:** `src/app/api/daily-plan/route.ts`

**Items added to plan:**
1. **Always added:** Focus Session item (priority 0)
2. **Conditionally added:** Up to 3 incomplete quests from `universal_quests` table (priority 1, 2, 3)
3. **Conditionally added:** 1 workout if calendar event with `event_type = 'workout'` exists for today (priority after quests)

**Database queries:**
```sql
-- Get incomplete quests
SELECT q.id, q.title, q.description
FROM universal_quests q
LEFT JOIN user_quest_progress p ON q.id = p.quest_id AND p.user_id = ?
WHERE q.is_active = 1 AND (p.completed IS NULL OR p.completed = 0)
LIMIT 3

-- Get today's workout
SELECT id, title FROM calendar_events 
WHERE user_id = ? AND event_type = 'workout' AND date(start_time) = ? 
LIMIT 1
```

## C4. Auto-refresh behavior

**Source:** `useAutoRefresh` hook in DailyPlan.tsx

```typescript
useAutoRefresh({
  onRefresh: fetchPlan,
  refreshKey: "daily-plan",
  stalenessMs: 300000,        // 5 minutes
  refreshOnMount: true,
  refetchOnFocus: true,       // Refetch when window gains focus
  refetchOnVisible: true,     // Refetch when tab becomes visible
  enabled: !isLoading && !isGenerating,
});
```

---

# D) Action Card Analysis

## D1. Complete list of action cards on Today screen

| Section | Label | Destination | Icon Type |
|---------|-------|-------------|-----------|
| Get Started | Start Focus | /focus | Target/bullseye (3 circles) |
| Get Started | Plan Day | /planner | Calendar |
| Get Started | Quests | /quests | Document with checkmark |
| Get Started | Exercise | /exercise | Running figure |
| Production | Shortcuts | /hub | Keyboard |
| Production | Arrange | /arrange | Grid |
| Production | Reference | /reference | Music note with line |
| Production | Templates | /templates | Music note |
| Learn & Grow | Learn | /learn | Open book |
| Learn & Grow | Infobase | /infobase | Closed book |
| Learn & Grow | Goals | /goals | Target/bullseye (3 circles) |
| Learn & Grow | Progress | /progress | Bar chart |

**Total:** 12 action cards

## D2. Action card styling

```css
/* src/app/(app)/today/page.module.css */
.actionCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-primary);
  transition: all var(--transition-fast);
}

.actionCard:hover {
  background-color: var(--color-bg-tertiary);
  transform: translateY(-2px);
  text-decoration: none;
}

.actionIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent-primary);
  color: var(--color-text-inverse);
}

.actionLabel {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
```

## D3. Which cards lead to immediate action vs browse mode

| Card | Destination Mode |
|------|------------------|
| Start Focus | IMMEDIATE ACTION - Timer page with start button |
| Plan Day | BROWSE - Calendar view |
| Quests | BROWSE - Quest list with +1 buttons |
| Exercise | BROWSE - Exercise library/workouts |
| Shortcuts | BROWSE - DAW selection grid |
| Arrange | IMMEDIATE ACTION - Arrangement canvas |
| Reference | BROWSE - Library list (empty by default) |
| Templates | BROWSE - Template category grid |
| Learn | BROWSE - Learning dashboard |
| Infobase | BROWSE - Entry list (empty by default) |
| Goals | BROWSE - Goals list (empty by default) |
| Progress | BROWSE - XP/skill stats view |

**Cards leading to immediate single-action:**
- Start Focus (1 click to start timer)
- Arrange (immediate canvas)

**Cards leading to selection/browse first:**
- All others (10 cards)

---

# E) CSS Variables and Design Tokens

**Source:** Variables referenced in Today page CSS files

```css
/* From page.module.css and DailyPlan.module.css */

/* Spacing */
--space-1
--space-2
--space-3
--space-4
--space-6

/* Typography */
--font-size-xs
--font-size-sm
--font-size-base
--font-size-lg
--font-size-xl
--font-size-2xl
--font-weight-medium
--font-weight-semibold
--font-weight-bold

/* Colors */
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-text-inverse
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary
--color-accent-primary
--color-accent-secondary
--color-accent-hover
--color-border-primary

/* Borders */
--radius-sm
--radius-md
--radius-lg
--radius-full

/* Transitions */
--transition-fast
--transition-normal
```

---

# F) Component Hierarchy Summary

```
TodayPage (server component)
├── auth() call for session
├── getGreeting() for time-based greeting
│
└── <div.page>
    ├── <header.header>
    │   ├── <h1.title> "{greeting}, {firstName}"
    │   └── <p.subtitle> "Here's what's on your plate today."
    │
    └── <div.grid>
        ├── <section.planSection>
        │   └── <DailyPlanWidget> (client component)
        │       ├── State: plan, isLoading, isGenerating
        │       ├── useAutoRefresh hook
        │       ├── fetchPlan() -> GET /api/daily-plan
        │       ├── handleGeneratePlan() -> POST /api/daily-plan {action: "generate"}
        │       ├── handleCompleteItem() -> POST /api/daily-plan {action: "complete_item"}
        │       │
        │       └── Renders one of:
        │           ├── Loading state: "Loading your plan..."
        │           ├── Empty state: "No plan for today yet." + "Plan My Day" button
        │           └── Plan state: header + progress bar + items list + "Regenerate Plan"
        │
        ├── <section.section> "Get Started"
        │   └── <div.actions>
        │       ├── <Link.actionCard> Start Focus -> /focus
        │       ├── <Link.actionCard> Plan Day -> /planner
        │       ├── <Link.actionCard> Quests -> /quests
        │       └── <Link.actionCard> Exercise -> /exercise
        │
        ├── <section.section> "Production"
        │   └── <div.actions>
        │       ├── <Link.actionCard> Shortcuts -> /hub
        │       ├── <Link.actionCard> Arrange -> /arrange
        │       ├── <Link.actionCard> Reference -> /reference
        │       └── <Link.actionCard> Templates -> /templates
        │
        ├── <section.section> "Learn & Grow"
        │   └── <div.actions>
        │       ├── <Link.actionCard> Learn -> /learn
        │       ├── <Link.actionCard> Infobase -> /infobase
        │       ├── <Link.actionCard> Goals -> /goals
        │       └── <Link.actionCard> Progress -> /progress
        │
        └── <section.section> "Rewards"
            ├── <div.sectionHeader>
            │   ├── <h2.sectionTitle> "Rewards"
            │   └── <Link.sectionLink> "Visit Market" -> /market
            └── <div.rewardCard>
                └── <p.rewardText> "Complete quests and focus sessions..."
```

---

# END OF SECTION A-F

---

## 1. SYSTEM ENTRY & ACTIVATION COST

### 1.1 First-Time User Flow (Unauth -> First Action)

```text
Screen 1:
- Route: /
- Purpose: Marketing landing page
- Required actions: None (can browse)
- Optional actions: Click "Get Started Free", Click "See All Features", scroll to read features
- Copy (exact): 
  - Hero badge: "Free Productivity App for Creators"
  - Title: "Passion OS: Level Up Your Productivity"
  - Subtitle: "The gamified productivity app for music producers, fitness enthusiasts, and lifelong learners. Track focus sessions, log workouts, build habits, and earn XP as you grow."
  - Primary CTA: "Get Started Free"
  - Secondary CTA: "See All Features"
  - Trust line: "No credit card required. 16+ only."
  - Steps section title: "Get Started in 3 Simple Steps"
  - Step 1: "Verify Your Age" - "Passion OS is designed for users 16 and older. Quick age verification ensures a safe community."
  - Step 2: "Sign In Securely" - "Use your Google or Microsoft account. No passwords to create or remember. Your data stays private."
  - Step 3: "Start Earning XP" - "Complete focus sessions, log workouts, and finish quests to earn XP. Watch your level grow."

Screen 2:
- Route: /auth/signin
- Purpose: OAuth provider selection
- Required actions: Click "Sign in with Google" OR "Sign in with Microsoft"
- Optional actions: Click "Verify your age first" link, click "Back to Home" link
- Copy (exact):
  - Title: "Sign In to Passion OS"
  - Subtitle: "Use your Google or Microsoft account to sign in securely. No passwords required."
  - Requirements header: "Before You Sign In"
  - Requirements list:
    - "You must be 16 years or older"
    - "New accounts require admin approval"
    - "Your email is used only for authentication"
  - New user prompt: "First time here? Verify your age first"
  - Terms text: "By signing in, you agree to our Terms of Service and Privacy Policy."
  - Button text: "Sign in with Google" / "Sign in with Microsoft"

Screen 3:
- Route: External OAuth provider (Google or Microsoft)
- Purpose: OAuth consent
- Required actions: Complete OAuth flow with provider
- Optional actions: None
- Copy (exact): Varies by provider

Screen 4 (blocking state if new user):
- Route: /auth/signin (redirected back)
- Purpose: Account pending approval notification
- Required actions: Wait for admin approval (email notification implied)
- Optional actions: None
- Copy (exact): UNKNOWN - approval flow copy not directly observed in code; user table has `is_approved` field

Screen 5 (first authenticated entry):
- Route: /today (redirect from / for authenticated users per middleware)
- Purpose: Today dashboard - main entry point for authenticated users
- Required actions: None (can view dashboard immediately)
- Optional actions: Multiple - see Today Screen section
- Copy (exact):
  - Title: "[Good morning/afternoon/evening], [FirstName]"
  - Subtitle: "Here's what's on your plate today."

Screen 6 (blocking modal on first sign-in):
- Route: /today (with TOSModal overlay)
- Purpose: Terms of Service acceptance
- Required actions: Check checkbox, click "Accept and Continue"
- Optional actions: Read scrollable TOS content, click Privacy Policy link
- Copy (exact):
  - Title: "Terms of Service"
  - Subtitle: "Before you can use Passion OS, please review and accept our Terms of Service."
  - Checkbox label: "I have read and agree to the Terms of Service and Privacy Policy"
  - Button: "Accept and Continue"
  - TOS sections include: Acceptance of Terms, Age Requirement (16+), Account Responsibility, Acceptable Use, Data and Privacy, Service Modifications, Termination, Disclaimer of Warranties, Limitation of Liability, Changes to Terms

First executable action:
- After TOS acceptance, user lands on /today dashboard
- First executable action depends on Daily Plan state:
  - If no daily plan exists: Click "Plan My Day" button to generate a plan
  - If daily plan exists: Click "Start" on any plan item OR click any action card (Start Focus, Plan Day, Quests, Exercise, etc.)
- Fastest first action without planning: Click "Start Focus" action card (routes to /focus with timer ready to start)
```

---

### 1.2 Cognitive Load Before First Action

- **Total number of decisions required before first action:**
  - 1: Choose OAuth provider (Google or Microsoft)
  - 2: Read and accept TOS (checkbox + button)
  - TOTAL MINIMUM: 2 decisions (if OAuth flow is considered a single decision)

- **Total number of concepts introduced before acting:**
  - Landing page introduces: XP, levels, focus sessions, workouts, habits, quests, coins, streaks, DAW shortcuts, reference tracks, book tracking, daily planner
  - Count: 12+ distinct concepts presented before sign-in
  - TOS introduces: account responsibility, data privacy, termination policies
  - Count: 3 additional concepts
  - TOTAL: 15+ concepts shown before first in-app action

- **Whether system understanding is required before acting:**
  - NO - user can click "Start Focus" immediately after TOS acceptance without understanding XP, quests, levels, or any other system
  - Understanding is NOT required to take first action, but all concepts are front-loaded on landing page

---

## 2. TODAY SCREEN - REALITY CHECK (CRITICAL)

### 2.1 Today Screen Structure

Visual hierarchy (top -> bottom):

1. **Header** (fixed position):
   - Greeting: "[Good morning/afternoon/evening], [FirstName]"
   - Subtitle: "Here's what's on your plate today."

2. **Daily Plan Widget** (first content section):
   - Header: "Daily Plan" or "Today's Plan" with completion count (e.g., "0/4")
   - Progress bar showing completion percentage
   - List of plan items with:
     - Checkbox button
     - Type icon (focus/quest/workout/learning/habit)
     - Title
     - Description (if exists)
     - "Start" button link
   - If no plan exists: "No plan for today yet." with "Plan My Day" button
   - "Regenerate Plan" button at bottom

3. **Get Started Section**:
   - Title: "Get Started"
   - 4 action cards in grid:
     - "Start Focus" -> /focus
     - "Plan Day" -> /planner
     - "Quests" -> /quests
     - "Exercise" -> /exercise

4. **Production Section**:
   - Title: "Production"
   - 4 action cards in grid:
     - "Shortcuts" -> /hub
     - "Arrange" -> /arrange
     - "Reference" -> /reference
     - "Templates" -> /templates

5. **Learn & Grow Section**:
   - Title: "Learn & Grow"
   - 4 action cards in grid:
     - "Learn" -> /learn
     - "Infobase" -> /infobase
     - "Goals" -> /goals
     - "Progress" -> /progress

6. **Rewards Section**:
   - Title: "Rewards" with "Visit Market" link
   - Card with text: "Complete quests and focus sessions to earn coins and XP. Redeem rewards in the Market!"

**Number of visible cards:** 12 action cards + 1 daily plan widget + 1 rewards card = 14 interactive elements

**Primary CTA:**
- If no daily plan: "Plan My Day" button
- If daily plan exists: "Start" button on first incomplete plan item (top of list)

**Secondary CTAs:** 12 action cards in 3 sections

**Competing CTAs:** All 12 action cards compete equally; no visual hierarchy distinguishes urgency or priority between them

---

### 2.2 Decision Pressure on Entry

**Does the user need to decide *what* to do?**
- YES - Today screen presents 12+ equally-weighted action cards with no clear prioritization
- Daily Plan widget attempts to provide structure but requires user to generate it first

**Is there a default suggested action?**
- YES (conditional) - If Daily Plan exists, plan items appear in priority order with "Start" buttons
- NO (if no plan) - "Plan My Day" button is prominent but not a direct action; it requires another step to generate tasks

**Can the user start without choosing?**
- NO - User must:
  1. Click an action card to navigate to a feature, OR
  2. Click "Plan My Day" to generate a plan, then choose from plan items
- There is no auto-starting default action
- There is no "just do the next thing" single-click path

---

## 3. EXECUTION MECHANICS

### 3.1 Fastest Possible Win

**Lowest-friction success path:**

1. Click "Start Focus" action card on Today screen (1 click)
2. On /focus page, click Play button to start timer (1 click)
3. Wait 25 minutes (default duration)
4. Timer completes automatically

**Number of clicks:** 2 clicks (Today -> Focus -> Start)

**Feature used:** Focus Timer (Pomodoro-style)

**Time required:**
- Click time: ~3 seconds
- Minimum completion time: 25 minutes (default focus duration)
- Alternative: User can change to custom duration in Settings (15/25/30/45/60 min options)

**Whether planning or choice is required:**
- NO planning required - can start immediately
- CHOICE required - must decide to click "Start Focus" vs other options
- Timer settings are pre-configured with reasonable defaults (25/5/15 Pomodoro cycle)

---

### 3.2 Focus / Timer Flow

**Start flow:**
1. User lands on /focus page
2. Default view shows timer at 25:00 in "Focus" mode
3. User sees circular progress ring (empty), time display, mode label
4. Control buttons: Reset (disabled when at full time), Play (centered, prominent), Skip
5. Mode selector below: "Focus" | "Break" | "Long Break" buttons
6. User clicks Play button
7. Timer starts counting down
8. Session created in database via POST /api/focus
9. Timer status changes to "Running"
10. Document title updates to show remaining time: "[MM:SS] - Focus | Focus"

**During-session UI:**
- Timer ring fills as time progresses (visual progress indicator)
- Time display counts down: "24:59", "24:58", etc.
- Mode label shows: "Focus"
- Status indicator shows: "Running"
- Play button changes to Pause button (two vertical bars icon)
- Reset and Skip buttons remain available
- Weekly chart and stats visible below timer
- Focus Tracks section available for ambient music selection
- If user navigates away, mini timer appears in BottomBar when session active

**Completion flow:**
1. Timer reaches 00:00
2. Audio notification plays (if sounds enabled and file exists at /sounds/timer-complete.mp3)
3. Browser notification: "[Focus/Break/Long Break] Complete!" with body "Time for a break!" (focus) or "Ready to focus?" (break)
4. Session marked complete via POST /api/focus/[id]/complete
5. XP awarded: 25 XP to "knowledge" skill (stored in localStorage)
6. Coins awarded: 10 coins (stored in localStorage)
7. Stats updated: completedSessions + 1
8. Auto-switch to next mode:
   - After Focus: Switch to Break (or Long Break if completedSessions % 4 === 0)
   - After Break: Switch to Focus
9. If autoStartBreaks/autoStartFocus enabled: Timer starts automatically after 1 second
10. Timer resets to new mode's duration

**Abandon flow:**
1. User clicks Reset button OR clicks Skip button
2. If Reset: Timer resets to current mode's duration, status -> idle
3. If Skip: Session abandoned via POST /api/focus/[id]/abandon
4. Session status in database set to "abandoned"
5. NO XP awarded
6. NO coins awarded
7. Timer switches to next mode and resets

**Copy shown:**
- Timer view tabs: "Timer" | "History" | "Settings"
- Mode labels: "Focus" | "Break" | "Long Break"
- Status: "Running" or "Paused"
- Stats cards: "Sessions Today" (count), "Focus Time" (formatted duration), "Streak" (count)
- Weekly chart title: "This Week"
- History empty state: "No sessions recorded yet. Start your first focus session!"
- History item statuses: "Completed" | "Abandoned" | "Active"

**Rewards shown:**
- NOT shown explicitly on completion
- XP and coins awarded silently in background (localStorage update)
- No celebratory modal or notification about rewards earned
- Rewards only visible in Progress page (/progress) or Market page (/market)

**Confirmations:**
- NO confirmation on Reset (immediate reset)
- NO confirmation on Skip (immediate skip)
- NO confirmation on Pause (immediate pause)
- Browser notification on completion (if permissions granted)

---

## 4. MISSES, GAPS, AND RETURN COST

### 4.1 Missed Day States

**1 missed day:**
- **Visual indicators:** NONE explicitly for missed days
- **Language shown:** Streak counter on /focus shows current streak (will show 0 if streak broken)
- **Penalties or loss:** Streak resets to 0 if last_activity_date was not yesterday
- **Recovery affordances:** User can start any activity to begin new streak; no special "resume" flow

**3 missed days:**
- **Visual indicators:** Same as 1 missed day - no escalating indicators
- **Language shown:** Streak counter shows 0
- **Penalties or loss:** Same as 1 missed day - streak = 0
- **Recovery affordances:** Same as 1 missed day - start any activity

**7+ missed days:**
- **Visual indicators:** Same as 1 and 3 missed days - no escalating indicators
- **Language shown:** 
  - Daily Plan: May show stale plan from last active day OR "No plan for today yet."
  - Quests: Daily quests may have reset; progress shows 0
- **Penalties or loss:** Same - streak = 0, no additional penalty
- **Recovery affordances:** Same - start any activity; can regenerate daily plan

**OBSERVATION:** The system has no progressive indication of absence. A user who misses 1 day sees identical UI to a user who misses 30 days. No "welcome back" messaging. No acknowledgment of gap.

---

### 4.2 Emotional Friction Signals

**Red indicators:**
- NONE observed in codebase
- No red colors used for overdue/missed states

**Warnings:**
- Delete account requires typing "DELETE" (confirmation friction)
- Delete habit/goal prompts "Delete this habit?" / "Delete this entry?" confirmation dialogs

**Overdue labels:**
- NONE observed
- Daily quests reset silently; no "overdue" state
- Calendar events have no overdue styling

**Negative counters:**
- Streak = 0 is shown neutrally (same styling as any other number)
- No "days missed" counter
- No negative XP or coin deduction for inactivity
- Progress wheel shows level 1 at minimum (no regression below 1)

**OBSERVATION:** The system avoids punitive language entirely. Streaks break silently. No shaming, but also no acknowledgment of the gap.

---

## 5. XP, LEVELS, AND INCENTIVES

### 5.1 XP Grant Map

| Action | XP on Start? | XP on Completion? | Amount | Deterministic? | Loss Conditions |
|--------|-------------|-------------------|--------|----------------|-----------------|
| Focus session complete | N | Y | 25 XP | Y | Abandoned session = 0 XP |
| Workout complete | N | Y | 50 XP | Y | Incomplete workout = 0 XP |
| Lesson complete | N | Y | 30 XP | Y | Not completing = 0 XP |
| Review session complete | N | Y | 15 XP | Y | Not completing = 0 XP |
| Habit logged | N | Y | 10 XP (default) | Y (customizable per habit) | Not logging = 0 XP |
| Quest complete | N | Y | Varies (default 10-25 XP) | Y (set per quest) | Not completing = 0 XP |
| Goal milestone | N | Y | 40 XP | Y | Not completing = 0 XP |
| Planner task complete | N | Y | 15 XP | Y | Not completing = 0 XP |
| Calendar event complete | N | Y | 10 XP (default) | Y (customizable) | Not completing = 0 XP |
| Reading session logged | N | Y | UNKNOWN | UNKNOWN | Not logging |

**Skill XP distribution:**
- Focus complete -> "knowledge" skill
- Workout complete -> "guts" skill
- Lesson complete -> "knowledge" skill
- Review complete -> "knowledge" skill
- Habit complete -> "proficiency" skill
- Goal milestone -> "proficiency" skill
- Planner task complete -> "proficiency" skill

**Default skills (Persona 5 inspired):**
- Knowledge (blue)
- Guts (red)
- Proficiency (orange)
- Kindness (green)
- Charm (purple)

**Level calculation:**
- Level = floor(totalXP / 500) + 1 (per client-side calculation)
- Server-side: Level calculation uses cumulative XP thresholds (100 * level per level)

---

### 5.2 What the System Actually Rewards

> If a user wanted to maximize XP with minimal effort, what actions would they take?

1. **Complete focus sessions** - 25 XP per 25-minute session = 1 XP per minute of waiting
   - Exploitation: Start timer and walk away; no active engagement required
   - Rate: 60 XP/hour (if completing 25/5 cycles)

2. **Complete workouts (log sets)** - 50 XP per workout completion
   - Exploitation: Log minimal workout, complete immediately
   - Rate: Potentially unlimited if workout logging has no validation

3. **Complete daily quests** - Varies, typically 10-25 XP per quest
   - Exploitation: Quests like "Complete 1 focus session" chain with focus reward
   - Rate: ~50-100 XP per day from daily quests

4. **Log habits** - 10 XP default per habit log
   - Exploitation: Create many low-effort habits, log all daily
   - Rate: 10 XP * number of habits

**Optimal strategy for maximum XP with minimum effort:**
1. Create multiple custom habits with 1-click completion
2. Log all habits daily (10+ XP each)
3. Start focus timer, let it run while doing other things
4. Complete daily quests that require minimal action

**What the system DOES NOT reward:**
- Quality of work
- Depth of focus (a distracted 25 min = focused 25 min)
- Difficulty of workout
- Comprehension in learning
- Actual reading (book tracking XP unclear)

---

## 6. STRUCTURED SYSTEMS (PLANS, WORKOUTS, PROGRAMS)

### 6.1 Plan Creation

**Daily Plan:**
- **How plans are created:** Click "Plan My Day" button on Today screen or "Regenerate Plan" to refresh
- **Required decisions:** None - plan is auto-generated from:
  1. Universal quests (up to 3 incomplete quests)
  2. Scheduled workouts from calendar for today
  3. Default focus session item
- **Default behaviors:**
  - Always includes 1 Focus Session item
  - Includes up to 3 quests from universal_quests table
  - Includes 1 workout if workout type calendar event exists for today
  - Items ordered by priority (focus first, then quests, then workout)

**Workout Plan:**
- **How plans are created:** Create workout via /exercise -> Workouts tab -> "+ Create Workout"
- **Required decisions:**
  - Workout name (required)
  - Workout type (strength/cardio/etc.)
  - Estimated duration
  - Add exercises to sections (warmup/main/cooldown)
  - For each exercise: target sets, target reps, rest seconds
- **Default behaviors:**
  - Default section: "Main" with type "main"
  - Default duration: 60 minutes
  - Default type: "strength"

**Programs:**
- **Route:** /exercise -> Programs tab
- **Status:** Empty state shown - "No programs yet."
- **Creation:** UNKNOWN - no visible creation flow in current code

---

### 6.2 Plan Execution Day

**Daily Plan:**
- **How plans appear:** Widget on Today page showing ordered list of items with checkboxes
- **Whether they are chunked:** NO - all items shown in single list
- **Whether partial completion is supported:** YES - items can be checked individually
- **Penalties for stopping early:** NONE - incomplete items simply remain unchecked
- **Progress shown:** "X/Y" completion count and progress bar percentage

**Workout Execution:**
- **How plans appear:** Start workout session, exercises shown in order
- **Whether they are chunked:** YES - workouts have sections (warmup/main/cooldown)
- **Whether partial completion is supported:** YES - can log individual sets, end session anytime
- **Penalties for stopping early:** NONE - session can be ended with partial sets logged
- **XP:** Awarded on session completion (50 XP via activity event)

---

## 7. UNSTRUCTURED SYSTEMS (QUESTS, HABITS)

### 7.1 Quests

**How quests surface:**
- Quests page (/quests) shows all available quests in tabs: Daily | Weekly | Special
- Today page Daily Plan widget includes up to 3 incomplete quests
- Quests fetched from `universal_quests` table (admin-created)

**Whether they are optional:**
- YES - all quests are optional
- No penalty for ignoring quests
- Daily quests reset at midnight (completed_at date check)

**Time pressure:**
- Daily quests: Expire at midnight (implicit, via date comparison)
- Weekly quests: Expire at end of week
- Special quests: May have explicit expiresAt field
- No visible countdown timer on quests
- No warning as expiration approaches

**Ignore behavior:**
- Quests remain available until expiration
- No penalty for letting quests expire
- Daily quests reappear next day (if still in universal_quests)
- Progress resets for daily quests at midnight

**Quest creation:**
- Users can create custom "Special" quests via "+ New Quest" button
- Custom quests stored locally initially, then synced
- Form fields: title, description, type, target count, XP reward, coin reward

---

### 7.2 Habits

**Streak visibility:**
- Streaks shown on /habits page in "Current Streaks" section
- Streak cards show: streak type, current count, "day streak" label
- Streak types tracked: focus, workout, daily_activity

**Break penalties:**
- Streak resets to 0 if last_activity_date was not yesterday
- No XP loss
- No coin loss
- No visual "streak broken" notification

**Recovery behavior:**
- Any activity of the same type restarts streak at 1
- No "streak shields" in use (field exists but not populated/used)
- No "recovery quest" or special incentive to restart
- Longest streak preserved in database for comparison

---

## 8. SPECIAL INTEREST / EDGE MODULES

### Learning (/learn)

- **Entry route:** Click "Learn" action card on Today, or "Dashboard" in Learning sidebar section
- **Default state:** If diagnosticCompleted = false: Diagnostic prompt view with "Start Diagnostic" CTA and quick-start cards
  - Quick-start options: Browse Courses, Explore Glossary, Recipe Generator
- **If diagnostic complete:** Dashboard showing Continue Learning, Due for Review, Areas to Improve, Quick Actions, Stats
- **Smallest executable action (<30s):** Click "Generate Recipe" or browse Glossary (both are browse/consume modes)
- **XP awarded?:** YES - lesson_complete: 30 XP, review_complete: 15 XP
- **Does it return to action or end in consumption?:** Mixed - Courses are structured action, Glossary/Recipes are consumption

### DAW Shortcuts (/hub)

- **Entry route:** Click "Shortcuts" action card on Today, or "Shortcuts" in Production sidebar section
- **Default state:** Browse mode - grid of DAW options (Ableton, Logic, FL Studio, Pro Tools, etc.)
- **Smallest executable action (<30s):** Click a DAW, view shortcuts list, search for specific shortcut
- **XP awarded?:** NO - no XP for viewing shortcuts
- **Does it return to action or end in consumption?:** CONSUMPTION - pure reference lookup, no action tracking

### Reference Tracks (/reference)

- **Entry route:** Click "Reference" action card on Today, or "Reference" in Production sidebar section
- **Default state:** Empty library view with "Create new library" prompt if no libraries exist
- **Smallest executable action (<30s):** Create library (name only), then import audio file
- **XP awarded?:** NO - no XP for reference track actions
- **Does it return to action or end in consumption?:** CONSUMPTION - audio playback and analysis, no action tracking

### Infobase (/infobase)

- **Entry route:** Click "Infobase" action card on Today, or "Infobase" in Production sidebar section
- **Default state:** Empty state if no entries, or list of entries with search/filter
- **Smallest executable action (<30s):** Click "New Entry", type title, save
- **XP awarded?:** NO - no XP for infobase entries
- **Does it return to action or end in consumption?:** CONSUMPTION - knowledge base for reading/writing notes, no gamification

### Book Tracker (/books)

- **Entry route:** "Books" in Planning sidebar section
- **Default state:** Stats grid (0 values if new) + tabs (Currently Reading, Completed, Want to Read)
- **Smallest executable action (<30s):** Click "Add Book", enter title, click submit
- **XP awarded?:** UNKNOWN - book API calls "log_session" but XP logic not visible in code excerpts
- **Does it return to action or end in consumption?:** MIXED - logging sessions is action, browsing library is consumption

### Arrange (/arrange)

- **Entry route:** Click "Arrange" action card on Today, or "Arrange" in Production sidebar section
- **Default state:** Lane-based sequencer view (ArrangeClient)
- **Smallest executable action (<30s):** UNKNOWN - arrangement interactions not fully audited
- **XP awarded?:** NO - no XP visible in arrangement code
- **Does it return to action or end in consumption?:** ACTION - creative tool, but not gamified

### Templates (/templates)

- **Entry route:** Click "Templates" action card on Today, or "Templates" in Production sidebar section
- **Default state:** Category grid (Drums, Melody, Chords) with browse interface
- **Smallest executable action (<30s):** Click category, view templates list
- **XP awarded?:** NO - no XP for template browsing
- **Does it return to action or end in consumption?:** CONSUMPTION - reference material only

---

## 9. NAVIGATION & ATTENTION ROUTING

**Global navigation:**
- **Sidebar:** Collapsible, grouped into sections (Daily, Planning, Rewards, Production, Learning)
  - Daily: Today, Progress, Quests, Focus
  - Planning: Planner, Goals, Exercise, Habits, Books
  - Rewards: Market
  - Production: Shortcuts, Arrange, Templates, Reference, Infobase
  - Learning: Dashboard, Courses, Review, Recipes, Glossary
  - Footer: Admin (if admin user), Settings
- **Header:** Logo/brand, menu toggle (mobile), command palette trigger, inbox/omnibar trigger
- **BottomBar:** Persistent player and/or focus timer indicator when active

**Default post-auth route:**
- Authenticated user visiting / -> redirected to /today (per middleware)
- After sign-in callback: /today

**Command palette behavior:**
- Trigger: Cmd/Ctrl + K, or Cmd/Ctrl + I
- Default mode: Quick capture (notes/tasks to inbox stored in localStorage)
- Command mode: Type ">" prefix for navigation and action commands
- Available commands:
  - Navigation: Go to Today/Shortcuts/Focus/Planner/Quests/Progress/Goals/Market/Arrange/Templates/Reference/Infobase/Exercise/Learn/Settings
  - Actions: Create New Quest, Create New Event, Start Focus Session, Create New Arrangement
  - Theme: Toggle Theme, Switch to Light/Dark/System
- Closing: Escape key, click outside

**Context preservation:**
- Focus timer: Paused state preserved in localStorage and D1 (cross-device)
- Audio player: Queue state preserved in localStorage, restored on page reload
- Forms: NOT preserved - navigating away loses form input

---

## 10. FAILURE & AVOIDANCE CASE

**Scenario:** User intended to use Passion OS to start a focus session but did not.

**Sequence:**
1. User opens Passion OS after 3 days of inactivity
2. User lands on /today, sees greeting and "Here's what's on your plate today."
3. Daily Plan shows either stale plan from 3 days ago OR "No plan for today yet."
4. User sees 12 action cards: Start Focus, Plan Day, Quests, Exercise... (no hierarchy)
5. User feels overwhelmed by choices, no clear "next step" indicated
6. User notices they have 0 streak (but this is shown without fanfare in /focus stats, not on Today)
7. User clicks "Plan My Day" to generate structure
8. Plan generates: Focus Session + 3 quests + maybe a workout
9. User sees 4-5 items, feels it's "too much" to start right now
10. User closes tab, intending to "come back later"
11. User does not return

**Exact friction point:**
- Moment of friction: Step 5 - Decision paralysis at Today screen with 12+ equal-weight options
- Secondary friction: Step 9 - Generated plan feels like a commitment rather than a single next action

**Likely emotional response:**
- Overwhelm: "Where do I even start?"
- Guilt: "I've been away 3 days, I've already failed"
- Avoidance: "I'll do this when I have more time/energy"
- Self-blame: "This is my fault for not being consistent" (not validated by the app, but internalized)

**What the system provides at this moment:**
- No acknowledgment of absence
- No single obvious next action
- No reduced plan or "just one thing" option
- No lowered activation energy path

---

## 11. LANGUAGE & TONE AUDIT (EXACT COPY)

### Success language

1. Focus complete notification: "[Focus/Break/Long Break] Complete!"
2. Focus complete notification body: "Time for a break!" (after focus) / "Ready to focus?" (after break)
3. History item status: "Completed"
4. Habit checkbox: Shows checkmark icon when complete
5. Quest completion: Progress bar reaches 100%, card styled with "completed" class
6. Goal completion: Card styled with "completed" class when all milestones done
7. Daily Plan: Progress bar fills, "X/Y" count increases
8. Market purchase confirmation: Item added to "Purchases" list with date

### Failure / miss language

1. History item status: "Abandoned" (for skipped focus sessions)
2. Focus button when insufficient coins: "Need more"
3. NONE: No explicit "You missed a day" or "Streak broken" message
4. NONE: No "You're behind" or "Overdue" labels
5. Delete confirmation: "Delete this habit?" / "Delete this entry?" / "Delete this library and all its tracks?"
6. Account deletion warning: "Type DELETE to confirm permanent deletion:"

### Neutral / empty states

1. Daily Plan empty: "No plan for today yet." + "Plan My Day" button
2. Quests empty: "No [daily/weekly/special] quests available." + "Generate New Daily Quests" (for daily tab)
3. Habits empty: "No habits yet. Create your first habit to start tracking!"
4. Goals empty: "No active goals. Set a goal to get started!"
5. Focus history empty: "No sessions recorded yet. Start your first focus session!"
6. Recent Activity empty (Progress): "Complete quests, focus sessions, and activities to earn XP!"
7. Purchases empty (Market): "No purchases yet. Start spending those coins!"
8. Books empty: Shows stats at 0, empty tabs
9. Infobase empty: Shows empty entry list with search bar
10. Reference Library empty: Shows empty library list
11. Templates section: "Browse categories above to find templates."
12. Learn Review empty: "All caught up! No reviews due today"
13. Learn Continue empty: "No lessons in progress" + "Start a Course" button

### CTA labels

1. Primary actions:
   - "Get Started Free"
   - "Sign in with Google"
   - "Sign in with Microsoft"
   - "Accept and Continue"
   - "Plan My Day"
   - "Regenerate Plan"
   - "+ New Quest"
   - "+ New Habit"
   - "+ New Goal"
   - "Add Book"
   - "New Entry"
   - "Start Diagnostic"
   - "Start a Course"

2. Execution actions:
   - "Start" (on plan items)
   - Play icon button (focus timer)
   - "Redeem" (market rewards)
   - "+1" (quest progress)
   - Check button (habits, plan items)
   - "Log Reading Session"
   - "Start Workout"

3. Secondary actions:
   - "See All Features"
   - "Visit Market"
   - "Cancel"
   - "Export"
   - "Delete"
   - "Save Settings"
   - "Reset to Defaults"

---

## 12. USER CONTROL & CONSENT

**Notification defaults:**
- Browser notifications: Requested on mount if permission is "default"
- Timer sounds: Enabled by default (toggle in Settings)
- Browser notifications toggle: Enabled by default (toggle in Settings)

**Reminder setup:**
- NO proactive reminders exist in current system
- No email notifications
- No push notifications beyond browser Notification API
- No scheduled reminder system

**Pause/mute/reset capabilities:**
- Focus timer: Can pause (preserves state in localStorage + D1), resume, reset, skip
- Notifications: Can toggle off in Settings
- Sounds: Can toggle off in Settings
- Streaks: No pause/shield capability (streak_shields field exists but unused)
- Account: Can delete entire account via Settings (requires typing "DELETE")
- Data: Can export all data as JSON via Settings

**Consent flows:**
- TOS: Required acceptance on first sign-in before using app
- Notification permission: Browser-native prompt on first focus page visit
- OAuth: Standard OAuth consent via Google/Microsoft
- Age: 16+ requirement stated on landing page and sign-in page (honor system, no verification)

---

## 13. KNOWN UNKNOWNS

```markdown
- UNKNOWN: Exact admin approval flow UX
  - Reason: User approval flow not observed in client code; only `is_approved` field in user table
  - What would be required to observe: Test new user sign-up flow, check admin panel for approval UI

- UNKNOWN: Book tracking XP rewards
  - Reason: API calls action "log_session" but XP award logic not visible in observed code
  - What would be required to observe: Review /api/books route.ts for logActivityEvent calls

- UNKNOWN: Arrange feature complete flow
  - Reason: ArrangeClient not fully audited; complex lane-based UI
  - What would be required to observe: Read ArrangeClient.tsx in full

- UNKNOWN: Programs feature implementation
  - Reason: Exercise page shows Programs tab with empty state, no creation flow visible
  - What would be required to observe: Full audit of exercise API and client for program-related actions

- UNKNOWN: Mobile app behavior
  - Reason: /src/app/(mobile) directory exists but not audited
  - What would be required to observe: Read mobile layout and components

- UNKNOWN: Age verification flow
  - Reason: Sign-in page links to "/age-verification" but route not observed
  - What would be required to observe: Check if /age-verification route exists and its content

- UNKNOWN: Streak shield feature
  - Reason: streak_shields field exists in database but no UI or logic observed for using shields
  - What would be required to observe: Search codebase for streak_shields usage

- UNKNOWN: Notification sound file existence
  - Reason: Code references "/sounds/timer-complete.mp3" but file not verified
  - What would be required to observe: Check public/sounds directory
```

---

## 14. CODE-LEVEL OBSERVATIONS

### Routes under `src/app`

**Public routes:**
- `/` - Landing page (page.tsx)
- `/about` - Features page
- `/privacy` - Privacy policy
- `/terms` - Terms of service
- `/contact` - Contact page
- `/help` - Help center
- `/auth/signin` - Sign in page
- `/auth/error` - Auth error page

**Protected routes (under `(app)` group):**
- `/today` - Dashboard
- `/focus` - Focus timer
- `/quests` - Quests management
- `/habits` - Habit tracking
- `/goals` - Goal tracking
- `/planner` - Calendar/events
- `/exercise` - Workout logging
- `/books` - Book tracker
- `/progress` - XP/level display
- `/market` - Reward redemption
- `/hub` - DAW shortcuts browser
- `/hub/[dawId]` - Specific DAW shortcuts
- `/arrange` - Music arrangement
- `/templates` - Production templates
- `/templates/[category]` - Template category
- `/reference` - Reference track library
- `/infobase` - Knowledge base
- `/learn` - Learning dashboard
- `/learn/courses` - Course browser
- `/learn/review` - Flashcard review
- `/learn/recipes` - Recipe generator
- `/learn/glossary` - Terminology glossary
- `/learn/diagnostic` - Skill assessment
- `/learn/journal` - Patch logging
- `/learn/practice` - Practice mode
- `/learn/settings` - Learning preferences
- `/settings` - User settings
- `/admin` - Admin console (admin-only)

**API routes (`src/app/api`):**
- `/api/auth/[...nextauth]` - Auth.js handlers
- `/api/auth/accept-tos` - TOS acceptance
- `/api/focus` - Focus sessions CRUD
- `/api/focus/active` - Active session check
- `/api/focus/[id]/complete` - Complete session
- `/api/focus/[id]/abandon` - Abandon session
- `/api/focus/pause` - Pause state sync
- `/api/quests` - Quests and progress
- `/api/habits` - Habits CRUD and logging
- `/api/goals` - Goals CRUD
- `/api/daily-plan` - Daily plan generation
- `/api/calendar` - Calendar events
- `/api/exercise` - Exercise/workout CRUD
- `/api/books` - Book tracking
- `/api/infobase` - Knowledge base CRUD
- `/api/learn/*` - Learning suite APIs
- `/api/user/export` - Data export
- `/api/user/delete` - Account deletion
- `/api/admin/*` - Admin functions

### XP Award Logic Locations

1. **`src/lib/db/repositories/activity-events.ts`**
   - Central XP/coin distribution via `logActivityEvent()` function
   - EVENT_REWARDS constant defines XP per activity type:
     - focus_complete: 25 XP
     - workout_complete: 50 XP
     - lesson_complete: 30 XP
     - review_complete: 15 XP
     - habit_complete: 10 XP
     - quest_complete: 0 XP (uses custom reward from quest)
     - goal_milestone: 40 XP
     - planner_task_complete: 15 XP

2. **`src/app/(app)/focus/FocusClient.tsx`** (lines 330-370)
   - Local XP award on focus completion
   - Updates localStorage skills and wallet

3. **`src/app/api/quests/route.ts`** (lines 90-130)
   - Quest completion XP award
   - Updates user_skills and reward_ledger tables

4. **`src/app/api/habits/route.ts`** (lines 95-115)
   - Calls logActivityEvent for habit completion

### Streak Logic Locations

1. **`src/lib/db/repositories/activity-events.ts`** (lines 185-215)
   - `updateStreaks()` function
   - Streak types: focus, workout, daily_activity
   - Logic: If last_activity_date === yesterday, increment; else reset to 1
   - No streak freeze/shield implementation

2. **`src/app/(app)/focus/FocusClient.tsx`**
   - Stats display shows streak count (fetched from API)

3. **`src/app/api/habits/route.ts`**
   - Fetches streaks via user_streaks table query

### User Progress Storage

- **D1 Tables:**
  - `user_progress`: total_xp, current_level, coins
  - `user_skills`: skill_id, xp, level per user per skill
  - `user_streaks`: streak_type, current_streak, longest_streak, last_activity_date
  - `reward_ledger`: Audit log of all XP/coin grants

- **localStorage Keys:**
  - `passion_progress_skills_v1`: Client-side skill data
  - `passion_wallet_v1`: Client-side coins/XP totals
  - `focus_settings`: Timer configuration
  - `focus_paused_state`: Paused timer state
  - `passion_inbox_v1`: Omnibar quick capture items
  - `passion_goals_v1`: Goals (localStorage-first)
  - Various feature-specific keys

---

# END OF FILE


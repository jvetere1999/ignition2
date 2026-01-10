# Today Dynamic UI From Usage

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Design Ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Sources](#2-data-sources)
3. [Dynamic Elements](#3-dynamic-elements)
4. [Computation Rules](#4-computation-rules)
5. [UI Placement Constraints](#5-ui-placement-constraints)
6. [Feature Flag Plan](#6-feature-flag-plan)
7. [QA Checklist](#7-qa-checklist)

---

## 1. Overview

### Goal

Add dynamic UI elements on Today that adapt based on the user's prior usage patterns, without changing core flows or increasing decision paralysis.

### Principles

- **No dark patterns**: No coercion, no shame language
- **Deterministic**: Rules are explicit and explainable
- **Respects decision suppression**: Never exceeds maxQuickLinks
- **Graceful degradation**: New users see default UI
- **Minimal data requirements**: Uses existing activity_events table

### Dynamic Elements (3)

1. **Quick Picks** - Up to 2 items based on 14-day usage frequency
2. **Resume Last** - Single chip for recently used module (24h)
3. **Interest Primer** - Single rotation for frequent /hub or /learn users

---

## 2. Data Sources

### 2.1 Primary Source: `activity_events`

The `activity_events` table already tracks all user activities with:
- `event_type`: focus_complete, workout_complete, lesson_complete, habit_complete, quest_complete, etc.
- `created_at`: ISO timestamp
- `user_id`: User reference

**No new tables needed.**

### 2.2 Event Type to Module Mapping

| Event Type | Module | Route |
|------------|--------|-------|
| `focus_start`, `focus_complete` | Focus | `/focus` |
| `workout_start`, `workout_complete` | Exercise | `/exercise` |
| `lesson_start`, `lesson_complete`, `review_complete` | Learn | `/learn` |
| `habit_complete` | Habits | `/habits` |
| `quest_complete` | Quests | `/quests` |
| `goal_milestone` | Goals | `/goals` |
| `planner_task_complete` | Planner | `/planner` |

### 2.3 SQL Index Availability

Existing indexes sufficient:
- `idx_activity_events_user` on `(user_id)`
- `idx_activity_events_date` on `(created_at)`
- `idx_activity_events_type` on `(event_type)`

---

## 3. Dynamic Elements

### 3.1 Quick Picks (Max 2 Items)

**Purpose:** Surface the user's most-used modules as quick actions.

**Derivation:**
- Count activity events per module in last 14 days
- Sort by count descending
- Take top 2 (excluding current Today default CTAs to avoid duplication)

**Display:**
- Show as small action chips below StarterBlock
- Only if user has >= 3 events in the time window
- Never exceed `maxQuickLinks` from visibility rules

**Example:**
```
User has 15 focus_complete, 8 workout_complete, 3 quest_complete in 14 days
-> Quick Picks: [Focus, Exercise]
```

### 3.2 Resume Last (Single Chip)

**Purpose:** Let user quickly return to their last-used module.

**Derivation:**
- Find most recent activity event within last 24 hours
- Map to module name and route

**Display:**
- Show as a single chip: "Resume Focus" or "Resume Learn"
- Only if last activity was > 1 hour ago (avoid immediate duplication)
- Hidden if StarterBlock already shows the same route

**Example:**
```
Last activity: lesson_complete at 10:30 AM today
Current time: 2:00 PM
-> Resume Last: "Resume Learn" -> /learn
```

### 3.3 Interest Primer (Single Rotation)

**Purpose:** Surface a primer option for users who frequently use hub/learn.

**Derivation:**
- Count hub-related and learn-related events in last 14 days
- If learn events >= 5: show "Quick Review" -> /learn/review?quick=1
- If hub events >= 5: show "Explore Shortcuts" -> /hub?quick=1
- Rotate if both qualify (based on day of week or last shown)

**Display:**
- Show as a subtle suggestion card below Quick Picks
- Only one primer at a time
- Hidden if user is in reduced mode (to minimize choices)

---

## 4. Computation Rules

### 4.1 SQL Queries

#### Quick Picks Query

```sql
-- Get module usage counts for last 14 days
SELECT 
  CASE 
    WHEN event_type IN ('focus_start', 'focus_complete') THEN 'focus'
    WHEN event_type IN ('workout_start', 'workout_complete') THEN 'exercise'
    WHEN event_type IN ('lesson_start', 'lesson_complete', 'review_complete') THEN 'learn'
    WHEN event_type = 'habit_complete' THEN 'habits'
    WHEN event_type = 'quest_complete' THEN 'quests'
    WHEN event_type = 'goal_milestone' THEN 'goals'
    WHEN event_type = 'planner_task_complete' THEN 'planner'
    ELSE 'other'
  END as module,
  COUNT(*) as event_count
FROM activity_events
WHERE user_id = ?
  AND created_at >= datetime('now', '-14 days')
  AND event_type NOT LIKE '%_start'  -- Count completions, not starts
GROUP BY module
HAVING event_count >= 1
ORDER BY event_count DESC
LIMIT 3;
```

#### Resume Last Query

```sql
-- Get most recent activity within last 24 hours
SELECT 
  event_type,
  created_at,
  CASE 
    WHEN event_type IN ('focus_start', 'focus_complete') THEN 'focus'
    WHEN event_type IN ('workout_start', 'workout_complete') THEN 'exercise'
    WHEN event_type IN ('lesson_start', 'lesson_complete', 'review_complete') THEN 'learn'
    WHEN event_type = 'habit_complete' THEN 'habits'
    WHEN event_type = 'quest_complete' THEN 'quests'
    WHEN event_type = 'goal_milestone' THEN 'goals'
    WHEN event_type = 'planner_task_complete' THEN 'planner'
    ELSE 'other'
  END as module
FROM activity_events
WHERE user_id = ?
  AND created_at >= datetime('now', '-24 hours')
ORDER BY created_at DESC
LIMIT 1;
```

#### Interest Primer Query

```sql
-- Get learn and hub-related event counts for last 14 days
SELECT 
  CASE 
    WHEN event_type IN ('lesson_start', 'lesson_complete', 'review_complete') THEN 'learn'
    ELSE 'other'
  END as category,
  COUNT(*) as event_count
FROM activity_events
WHERE user_id = ?
  AND created_at >= datetime('now', '-14 days')
  AND event_type IN ('lesson_start', 'lesson_complete', 'review_complete')
GROUP BY category;
```

### 4.2 Repository Function

**File:** `src/lib/db/repositories/activity-events.ts`

```typescript
export interface DynamicUIData {
  quickPicks: Array<{
    module: string;
    label: string;
    href: string;
    count: number;
  }>;
  resumeLast: {
    module: string;
    label: string;
    href: string;
    lastUsedAt: string;
  } | null;
  interestPrimer: {
    type: 'learn' | 'hub';
    label: string;
    href: string;
  } | null;
}

const MODULE_CONFIG: Record<string, { label: string; href: string }> = {
  focus: { label: "Focus", href: "/focus" },
  exercise: { label: "Exercise", href: "/exercise" },
  learn: { label: "Learn", href: "/learn" },
  habits: { label: "Habits", href: "/habits" },
  quests: { label: "Quests", href: "/quests" },
  goals: { label: "Goals", href: "/goals" },
  planner: { label: "Planner", href: "/planner" },
};

export async function getDynamicUIData(
  db: D1Database,
  userId: string
): Promise<DynamicUIData> {
  const now = new Date();
  
  // Query 1: Quick Picks (top 2 by usage)
  const usageResult = await db
    .prepare(`
      SELECT 
        CASE 
          WHEN event_type IN ('focus_start', 'focus_complete') THEN 'focus'
          WHEN event_type IN ('workout_start', 'workout_complete') THEN 'exercise'
          WHEN event_type IN ('lesson_start', 'lesson_complete', 'review_complete') THEN 'learn'
          WHEN event_type = 'habit_complete' THEN 'habits'
          WHEN event_type = 'quest_complete' THEN 'quests'
          WHEN event_type = 'goal_milestone' THEN 'goals'
          WHEN event_type = 'planner_task_complete' THEN 'planner'
          ELSE 'other'
        END as module,
        COUNT(*) as event_count
      FROM activity_events
      WHERE user_id = ?
        AND created_at >= datetime('now', '-14 days')
      GROUP BY module
      HAVING event_count >= 2
      ORDER BY event_count DESC
      LIMIT 3
    `)
    .bind(userId)
    .all<{ module: string; event_count: number }>();

  const quickPicks = (usageResult.results || [])
    .filter(r => r.module !== 'other' && MODULE_CONFIG[r.module])
    .slice(0, 2)
    .map(r => ({
      module: r.module,
      label: MODULE_CONFIG[r.module].label,
      href: MODULE_CONFIG[r.module].href,
      count: r.event_count,
    }));

  // Query 2: Resume Last (most recent within 24h, but > 1h ago)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const resumeResult = await db
    .prepare(`
      SELECT 
        event_type,
        created_at,
        CASE 
          WHEN event_type IN ('focus_start', 'focus_complete') THEN 'focus'
          WHEN event_type IN ('workout_start', 'workout_complete') THEN 'exercise'
          WHEN event_type IN ('lesson_start', 'lesson_complete', 'review_complete') THEN 'learn'
          WHEN event_type = 'habit_complete' THEN 'habits'
          WHEN event_type = 'quest_complete' THEN 'quests'
          WHEN event_type = 'goal_milestone' THEN 'goals'
          WHEN event_type = 'planner_task_complete' THEN 'planner'
          ELSE 'other'
        END as module
      FROM activity_events
      WHERE user_id = ?
        AND created_at >= datetime('now', '-24 hours')
        AND created_at <= ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .bind(userId, oneHourAgo)
    .first<{ event_type: string; created_at: string; module: string }>();

  let resumeLast = null;
  if (resumeResult && resumeResult.module !== 'other' && MODULE_CONFIG[resumeResult.module]) {
    resumeLast = {
      module: resumeResult.module,
      label: `Resume ${MODULE_CONFIG[resumeResult.module].label}`,
      href: MODULE_CONFIG[resumeResult.module].href,
      lastUsedAt: resumeResult.created_at,
    };
  }

  // Query 3: Interest Primer (learn >= 5 events)
  const learnCountResult = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM activity_events
      WHERE user_id = ?
        AND created_at >= datetime('now', '-14 days')
        AND event_type IN ('lesson_start', 'lesson_complete', 'review_complete')
    `)
    .bind(userId)
    .first<{ count: number }>();

  let interestPrimer = null;
  if (learnCountResult && learnCountResult.count >= 5) {
    interestPrimer = {
      type: 'learn' as const,
      label: "Quick Review",
      href: "/learn/review?quick=1",
    };
  }

  return {
    quickPicks,
    resumeLast,
    interestPrimer,
  };
}
```

### 4.3 Computation Rules Summary

| Element | Minimum Events | Time Window | Max Items | Conditions |
|---------|---------------|-------------|-----------|------------|
| Quick Picks | 2 per module | 14 days | 2 | Exclude 'other' |
| Resume Last | 1 | 24 hours | 1 | > 1 hour ago |
| Interest Primer | 5 learn events | 14 days | 1 | Not in reduced mode |

---

## 5. UI Placement Constraints

### 5.1 Placement Hierarchy

```
Today Page
|
+-- Header (greeting)
|
+-- MomentumBanner (if shown)
|
+-- ReducedModeBanner (if reduced mode)
|
+-- StarterBlock (dominant CTA)
|
+-- [NEW] Quick Picks (max 2 chips, horizontal)
|
+-- [NEW] Resume Last (single chip, optional)
|
+-- DailyPlanWidget (collapsible)
|
+-- [NEW] Interest Primer (single card, below plan, optional)
|
+-- ExploreDrawer (collapsible)
|
+-- Rewards (optional)
```

### 5.2 Decision Suppression Compliance

Dynamic elements MUST respect `maxQuickLinks` from visibility rules:

```typescript
// In TodayGridClient or page.tsx
const dynamicUI = await getDynamicUIData(db, userId);

// Apply visibility constraints
const effectiveQuickPicks = visibility.maxQuickLinks >= 2 
  ? dynamicUI.quickPicks.slice(0, Math.min(2, visibility.maxQuickLinks))
  : [];

const showResumeLast = visibility.maxQuickLinks >= 1 && dynamicUI.resumeLast;

const showInterestPrimer = !effectiveReducedMode && dynamicUI.interestPrimer;
```

### 5.3 Deduplication Rules

- If StarterBlock shows `/focus`, exclude Focus from Quick Picks
- If StarterBlock shows `/learn`, exclude Learn from Quick Picks
- If Resume Last matches StarterBlock route, hide Resume Last

```typescript
function deduplicateQuickPicks(
  quickPicks: DynamicUIData['quickPicks'],
  starterHref: string
): DynamicUIData['quickPicks'] {
  return quickPicks.filter(pick => pick.href !== starterHref);
}
```

### 5.4 Component Structure

**File:** `src/app/(app)/today/QuickPicks.tsx`

```typescript
"use client";

interface QuickPicksProps {
  picks: Array<{
    label: string;
    href: string;
    count: number;
  }>;
}

export function QuickPicks({ picks }: QuickPicksProps) {
  if (picks.length === 0) return null;

  return (
    <div className={styles.quickPicks}>
      <span className={styles.label}>Quick Picks</span>
      <div className={styles.chips}>
        {picks.map((pick) => (
          <Link key={pick.href} href={pick.href} className={styles.chip}>
            {pick.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
```

**File:** `src/app/(app)/today/ResumeLast.tsx`

```typescript
"use client";

interface ResumeLastProps {
  module: string;
  label: string;
  href: string;
}

export function ResumeLast({ label, href }: ResumeLastProps) {
  return (
    <Link href={href} className={styles.resumeChip}>
      {label}
    </Link>
  );
}
```

---

## 6. Feature Flag Plan

### 6.1 New Flag

| Flag | Purpose | Default |
|------|---------|---------|
| `FLAG_TODAY_DYNAMIC_UI_V1` | Enable dynamic UI elements (Quick Picks, Resume Last, Interest Primer) | OFF |

### 6.2 Flag Definition

**Update:** `src/lib/flags.ts`

```typescript
export const FLAG_NAMES = {
  // ... existing flags ...
  TODAY_DYNAMIC_UI_V1: "FLAG_TODAY_DYNAMIC_UI_V1",
} as const;

/**
 * Check if Today Dynamic UI is enabled
 */
export function isTodayDynamicUIEnabled(): boolean {
  return isTodayFeatureEnabled("TODAY_DYNAMIC_UI_V1");
}
```

### 6.3 Wrangler Configuration

**Production (OFF by default):**
```toml
[vars]
# FLAG_TODAY_DYNAMIC_UI_V1 = "true"
```

**Preview (ON for testing):**
```toml
[env.preview.vars]
FLAG_TODAY_DYNAMIC_UI_V1 = "true"
```

### 6.4 Usage in Today Page

```typescript
// src/app/(app)/today/page.tsx
import { isTodayDynamicUIEnabled } from "@/lib/flags";
import { getDynamicUIData } from "@/lib/db/repositories/activity-events";

export default async function TodayPage() {
  // ...existing code...

  // Fetch dynamic UI data if flag is enabled
  let dynamicUIData = null;
  if (isTodayDynamicUIEnabled()) {
    try {
      const db = await getDB();
      if (db && dbUser) {
        dynamicUIData = await getDynamicUIData(db, dbUser.id);
      }
    } catch (error) {
      console.error("Failed to fetch dynamic UI data:", error);
      // Graceful degradation: continue without dynamic UI
    }
  }

  return (
    <TodayGridClient
      // ...existing props...
      dynamicUIData={dynamicUIData}
      dynamicUIEnabled={isTodayDynamicUIEnabled()}
    />
  );
}
```

---

## 7. QA Checklist

### 7.1 Scenario 1: New User (No History)

**Setup:**
- Create new user account
- No activity events in database

**Expected Behavior:**

| Element | Expected State |
|---------|----------------|
| Quick Picks | Not shown (no data) |
| Resume Last | Not shown (no data) |
| Interest Primer | Not shown (no data) |
| StarterBlock | Shows "Start Focus" (default) |
| Today layout | Normal (no dynamic elements) |

**Verification Steps:**
```
1. Log in as new user
2. Navigate to /today
3. Verify no "Quick Picks" section
4. Verify no "Resume" chip
5. Verify no primer card
6. Verify StarterBlock shows default CTA
7. Verify no console errors
```

---

### 7.2 Scenario 2: Focus-Heavy User

**Setup:**
- User with 20 focus_complete events in last 14 days
- User with 3 quest_complete events in last 14 days
- Last focus_complete was 2 hours ago

**Expected Behavior:**

| Element | Expected State |
|---------|----------------|
| Quick Picks | [Focus, Quests] (top 2 by count) |
| Resume Last | "Resume Focus" (2 hours ago) |
| Interest Primer | Not shown (learn < 5) |
| StarterBlock | Based on plan or "Start Focus" |
| Deduplication | If StarterBlock is Focus, exclude from Quick Picks |

**Verification Steps:**
```
1. Set up user with focus-heavy history
2. Navigate to /today
3. Verify Quick Picks shows Focus and Quests
4. Verify Resume Last shows "Resume Focus"
5. If StarterBlock is Focus, verify Focus NOT in Quick Picks
6. Verify no primer shown
7. Click each quick pick and verify navigation
```

---

### 7.3 Scenario 3: Multi-Module User

**Setup:**
- User with diverse activity:
  - 10 focus_complete
  - 8 lesson_complete (qualifies for primer)
  - 6 workout_complete
  - 4 quest_complete
- Last activity: lesson_complete 3 hours ago

**Expected Behavior:**

| Element | Expected State |
|---------|----------------|
| Quick Picks | [Focus, Learn] (top 2 by count) |
| Resume Last | "Resume Learn" (3 hours ago) |
| Interest Primer | "Quick Review" (learn >= 5) |
| StarterBlock | Based on plan |

**Verification Steps:**
```
1. Set up user with multi-module history
2. Navigate to /today
3. Verify Quick Picks shows Focus and Learn (or Exercise)
4. Verify Resume Last shows "Resume Learn"
5. Verify Interest Primer shows "Quick Review"
6. Click primer and verify navigation to /learn/review?quick=1
7. Verify all elements respect visibility constraints
8. Enable reduced mode and verify primer is hidden
```

---

### 7.4 Flag Toggle Verification

```
1. Set FLAG_TODAY_DYNAMIC_UI_V1 = "false"
2. Navigate to /today
3. Verify NO dynamic elements shown
4. Verify baseline Today behavior

5. Set FLAG_TODAY_DYNAMIC_UI_V1 = "true"
6. Refresh /today
7. Verify dynamic elements appear (if user has history)
```

---

### 7.5 Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| All events > 14 days old | No Quick Picks, no Resume Last |
| Last event exactly 1 hour ago | Resume Last NOT shown (< 1 hour threshold) |
| Last event 1 hour 1 minute ago | Resume Last shown |
| All events same module | Quick Picks shows only 1 item |
| Database error | Graceful degradation, log error, show default UI |
| maxQuickLinks = 0 | No Quick Picks, no Resume Last |
| Reduced mode active | Interest Primer hidden |

---

## Appendix A: File Changes Summary

| File | Change |
|------|--------|
| `src/lib/flags.ts` | Add `TODAY_DYNAMIC_UI_V1` flag |
| `src/lib/db/repositories/activity-events.ts` | Add `getDynamicUIData()` function |
| `src/app/(app)/today/page.tsx` | Fetch and pass dynamic UI data |
| `src/app/(app)/today/TodayGridClient.tsx` | Accept and render dynamic UI elements |
| `src/app/(app)/today/QuickPicks.tsx` | New component |
| `src/app/(app)/today/QuickPicks.module.css` | New styles |
| `src/app/(app)/today/ResumeLast.tsx` | New component |
| `src/app/(app)/today/ResumeLast.module.css` | New styles |
| `src/app/(app)/today/InterestPrimer.tsx` | New component |
| `src/app/(app)/today/InterestPrimer.module.css` | New styles |
| `wrangler.toml` | Add flag to preview environment |

---

## Appendix B: No New Tables Required

The design uses only the existing `activity_events` table with these indexes:
- `idx_activity_events_user` on `(user_id)`
- `idx_activity_events_date` on `(created_at)`
- `idx_activity_events_type` on `(event_type)`

Query performance should be acceptable because:
1. Queries are bounded by user_id (indexed)
2. Time window is 14 days max
3. Result sets are small (LIMIT 3)
4. Queries run server-side once per page load

---

**End of Document**


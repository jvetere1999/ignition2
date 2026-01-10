# Privacy Policy Update Draft

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Ready for Review

---

## Table of Contents

1. [Summary of Changes](#1-summary-of-changes)
2. [Updated Section Text](#2-updated-section-text)
3. [Data Fields Table](#3-data-fields-table)
4. [Open Questions (TODOs)](#4-open-questions-todos)

---

## 1. Summary of Changes

### What Changed

| Area | Change Description |
|------|-------------------|
| **Section 2.2 (Usage Data)** | Added `last_activity_at` timestamp collection |
| **Section 3 (How We Use)** | Added usage-based UI personalization |
| **New Section 3.1** | Added "Personalized Experience" subsection |
| **Section 7 (Cookies/Storage)** | Added session storage for UI state |

### Why These Changes

1. **`last_activity_at`**: Added to the users table to track when user last performed an activity. Used to:
   - Provide a gentler re-entry experience for users returning after extended absence
   - No tracking of what the user did, only when they last used the app

2. **Usage-based UI personalization**: When enabled, the app uses aggregate counts of feature usage (not content) to surface relevant quick actions. This is:
   - Opt-in via feature flag (off by default)
   - Based only on event type counts, not content
   - Deterministic and explainable (not AI/ML personalization)
   - Stored in existing activity_events table

---

## 2. Updated Section Text

### 2.1 Section 2.2 (Usage Data) - UPDATED

**Current Text:**
```
2.2 Usage Data
We automatically collect:
- Focus session durations and completion status
- Quest progress and completion data
- Calendar events and planner data you create
- Exercise logs and workout data
- Skill progression and XP earned
- Virtual currency (coins) balance and transactions
```

**Updated Text:**
```
2.2 Usage Data
We automatically collect:
- Focus session durations and completion status
- Quest progress and completion data
- Calendar events and planner data you create
- Exercise logs and workout data
- Habit completion records
- Learning progress (lessons, reviews)
- Skill progression and XP earned
- Virtual currency (coins) balance and transactions
- Last activity timestamp (when you last used any feature)
- Aggregate counts of feature usage by type (e.g., number of focus sessions completed)

Note: We collect when and what type of activity occurred, but not the content 
of your work (e.g., we know you completed a focus session, but not what you 
were focusing on).
```

---

### 2.2 Section 3 (How We Use) - UPDATED

**Current Text:**
```
3. How We Use Your Information
We use collected information to:
- Provide and maintain the Service
- Track your progress across focus sessions, quests, and goals
- Calculate and display your skill levels and achievements
- Sync your data across devices
- Send important account notifications
- Improve and optimize the Service
- Respond to your feedback and support requests
```

**Updated Text:**
```
3. How We Use Your Information
We use collected information to:
- Provide and maintain the Service
- Track your progress across focus sessions, quests, and goals
- Calculate and display your skill levels and achievements
- Sync your data across devices
- Send important account notifications
- Improve and optimize the Service
- Respond to your feedback and support requests
- Provide a personalized experience based on your usage patterns (see 3.1)

3.1 Personalized Experience (Optional)

When enabled, we may use aggregate counts of your feature usage to personalize 
your Today dashboard. This includes:

- Quick Picks: Showing shortcuts to features you use most frequently
- Resume suggestions: Reminding you of features you used recently
- Interest prompts: Suggesting features related to your usage patterns

This personalization:
- Uses only aggregate counts (e.g., "15 focus sessions in 14 days"), not content
- Is based on explicit, deterministic rules (not AI or machine learning)
- Can be disabled by contacting us (see Section 11)
- Does not share any data with third parties

We also use your last activity timestamp to provide a gentler experience if you 
return after an extended absence (e.g., showing fewer options initially to reduce 
overwhelm). This feature is designed to support users, not to track or judge them.
```

---

### 2.3 Section 7 (Cookies and Local Storage) - UPDATED

**Current Text:**
```
7. Cookies and Local Storage
We use:
- Session cookies: For authentication
- Local storage: For theme preferences and temporary UI state
We do not use third-party tracking cookies or advertising cookies.
```

**Updated Text:**
```
7. Cookies and Local Storage
We use:
- Session cookies: For authentication
- Local storage: For theme preferences, expand/collapse states, and UI settings
- Session storage: For temporary UI state within a browser session (e.g., 
  acknowledgment banners, reduced-choice mode)

Session storage data is automatically cleared when you close your browser.

We do not use third-party tracking cookies or advertising cookies.
```

---

## 3. Data Fields Table

### User-Related Fields

| Field | Purpose | Retention | User Control |
|-------|---------|-----------|--------------|
| `email` | Account identification, login | Until account deletion | Delete account |
| `name` | Display name | Until account deletion | Edit in profile |
| `image` | Profile picture URL | Until account deletion | Edit in profile |
| `created_at` | Account creation date | Until account deletion | Delete account |
| `last_activity_at` | When user last performed any activity | Until account deletion | Delete account |
| `tos_accepted` | Terms acceptance status | Until account deletion | Cannot modify |
| `tos_accepted_at` | When terms were accepted | Until account deletion | Cannot modify |

### Activity Events Fields

| Field | Purpose | Retention | User Control |
|-------|---------|-----------|--------------|
| `event_type` | Type of activity (focus_complete, etc.) | Until account deletion | Delete account |
| `created_at` | When activity occurred | Until account deletion | Delete account |
| `xp_earned` | XP awarded for activity | Until account deletion | Delete account |
| `coins_earned` | Coins awarded for activity | Until account deletion | Delete account |
| `entity_type` | Category of related item | Until account deletion | Delete account |
| `entity_id` | Reference to related item | Until account deletion | Delete account |

### Session Storage Fields (Browser-Only)

| Field | Purpose | Retention | User Control |
|-------|---------|-----------|--------------|
| `passion_momentum_v1` | Track if acknowledgment banner shown | Browser session | Close browser |
| `passion_soft_landing_v1` | Track if reduced-choice mode active | Browser session | Close browser |
| `passion_soft_landing_source` | Source of reduced-choice trigger | Browser session | Close browser |

### Local Storage Fields (Browser-Only)

| Field | Purpose | Retention | User Control |
|-------|---------|-----------|--------------|
| `theme` | User's preferred theme | Until cleared | Change in settings |
| `passion_daily_plan_collapsed` | UI expand/collapse state | Until cleared | Clear browser data |
| `passion_explore_collapsed` | UI expand/collapse state | Until cleared | Clear browser data |

---

## 4. Open Questions (TODOs)

### TODO 1: Data Retention Period

**Current State:** All data retained until account deletion.

**Question:** Should we implement automatic data retention limits (e.g., delete activity_events older than 2 years)?

**Placeholder Text (if needed):**
```
Activity event data is retained for [TODO: specify period, e.g., "2 years" or 
"the lifetime of your account"]. You may request deletion of your data at any 
time by contacting us.
```

---

### TODO 2: Feature Personalization Opt-Out

**Current State:** Usage-based personalization is gated by feature flag (off by default). When enabled, it applies to all users.

**Question:** Should we provide individual user opt-out toggle in settings?

**Placeholder Text (if needed):**
```
To disable personalized recommendations, [TODO: "visit Settings > Privacy" or 
"contact us at privacy@passion-os.app"].
```

---

### TODO 3: Data Export Format

**Current State:** Admin backup/restore exists, but no user-facing data export.

**Question:** What format should user data exports be in?

**Placeholder Text:**
```
You may request an export of your data in [TODO: "JSON" or "CSV" or "human-readable"] 
format by contacting us.
```

---

### TODO 4: GDPR/CCPA Specific Language

**Current State:** General privacy language, no jurisdiction-specific sections.

**Question:** Do we need separate GDPR (EU) or CCPA (California) sections?

**Placeholder Text (if needed):**
```
[TODO: Add GDPR-specific language including lawful basis for processing, 
data controller information, and EU representative contact if applicable.]

[TODO: Add CCPA-specific language including "Do Not Sell My Personal Information" 
notice if applicable to California users.]
```

---

## Appendix A: Code Reference

### last_activity_at Update Location

**File:** `src/lib/db/repositories/activity-events.ts`
- Updated via `touchUserActivity()` function
- Called whenever `logActivityEvent()` is invoked

### Usage-Based UI Data Query

**File:** `src/lib/db/repositories/activity-events.ts` (proposed)
- Function: `getDynamicUIData()`
- Queries: Aggregate counts only, no content

### Session Storage Keys

**File:** `src/lib/today/momentum.ts` and `src/lib/today/softLanding.ts`
- Keys: `passion_momentum_v1`, `passion_soft_landing_v1`, `passion_soft_landing_source`

---

## Appendix B: Implementation Checklist

```
[ ] Update privacy/page.tsx with new section text
[ ] Update lastUpdated date to current date
[ ] Review with legal counsel (if applicable)
[ ] Add to changelog or release notes
[ ] Notify users of policy update (if material change)
```

---

**End of Document**


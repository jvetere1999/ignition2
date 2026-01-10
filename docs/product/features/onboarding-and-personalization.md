# Onboarding and Personalization

## Overview

Ignition's onboarding is a **data-driven, versioned, resumable** flow that:
- Teaches what shows up where (Today, Focus, Quests, etc.)
- Asks about interests and goals
- Allows users to choose what surfaces more often
- Persists all progress in D1 (cross-device)

## Onboarding Flow

### Triggering

1. User logs in for first time
2. OnboardingProvider checks `user_onboarding_state`
3. If no state or not completed/dismissed -> show modal
4. User can skip (soft landing) or complete

### Flow Lifecycle

```
First Login
    |
    v
Check user_onboarding_state
    |
    +-- State exists, completed -> No modal
    |
    +-- State exists, not completed -> Resume from current_step_id
    |
    +-- No state -> Create state, show step 1
    |
    v
User progresses through steps
    |
    +-- Each step -> POST /api/onboarding/step
    |   Saves choices and advances current_step_id
    |
    +-- Skip -> POST /api/onboarding/skip
    |   Sets is_dismissed = 1, applies soft landing
    |
    v
Complete last step
    |
    v
Mark is_completed = 1
Redirect to Today
```

## Step Types

### explain
Information step with icon and description.

```json
{
  "step_type": "explain",
  "title": "Welcome to Ignition",
  "content": "This is your starter engine...",
  "target_selector": null,
  "target_route": null
}
```

### tour
Spotlight UI elements on a page.

```json
{
  "step_type": "tour",
  "title": "Your Daily View",
  "content": "Today shows your next action...",
  "target_selector": ".starter-block",
  "target_route": "/today"
}
```

### choice
Multi-select options (e.g., interests).

```json
{
  "step_type": "choice",
  "title": "What interests you?",
  "content": "Select up to 3...",
  "options_json": "[\"focus\",\"learning\",\"music\",\"fitness\"]"
}
```

### preference
Single-select or toggle options.

```json
{
  "step_type": "preference",
  "title": "Nudge intensity",
  "content": "How often should we prompt you?",
  "options_json": "[\"gentle\",\"standard\",\"energetic\"]"
}
```

### action
Prompt user to complete a task.

```json
{
  "step_type": "action",
  "title": "Try a quick focus",
  "content": "Start a 5-minute focus session...",
  "target_route": "/focus"
}
```

## Personalization Tables

### user_interests

Stores user's selected interests.

```sql
CREATE TABLE user_interests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    interest_tag TEXT NOT NULL,  -- 'focus', 'learning', 'music', etc.
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, interest_tag)
);
```

### user_ui_modules

Stores module visibility and weights.

```sql
CREATE TABLE user_ui_modules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    module_key TEXT NOT NULL,   -- 'focus', 'quests', 'learn', etc.
    is_enabled INTEGER DEFAULT 1,
    weight INTEGER DEFAULT 1,   -- Higher = more preferred
    last_shown_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, module_key)
);
```

### user_settings

Stores behavior-affecting preferences.

```sql
CREATE TABLE user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    nudge_intensity TEXT DEFAULT 'standard',  -- 'gentle', 'standard', 'energetic'
    focus_default_duration INTEGER DEFAULT 25,
    gamification_visible INTEGER DEFAULT 1,
    theme TEXT DEFAULT 'system',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Personalization in Today

### How It Works

1. Today page fetches `fetchUserPersonalization(db, userId)`
2. Personalization includes:
   - interests (from user_interests)
   - moduleWeights (from user_ui_modules)
   - nudgeIntensity (from user_settings)
   - focusDuration (from user_settings)
   - gamificationVisible (from user_settings)
   - onboardingActive (from user_onboarding_state)

3. `resolveNextAction()` uses personalization:
   - If onboarding active: return onboarding route
   - If plan exists: use plan items
   - Otherwise: use moduleWeights for fallback order

### Fallback Resolution

Default order: Focus -> Quests -> Learn -> Ignitions

With personalization (example weights):
```javascript
moduleWeights: { learn: 3, focus: 2, quests: 1 }
// Resulting order: Learn -> Focus -> Quests -> Ignitions
```

## API Endpoints

### GET /api/onboarding

Returns current onboarding state and flow.

```json
{
  "state": {
    "id": "...",
    "flow_id": "...",
    "current_step_id": "step_3",
    "is_completed": 0,
    "is_dismissed": 0
  },
  "flow": {
    "id": "...",
    "name": "Default Onboarding",
    "version": "1.0.0",
    "steps": [...]
  }
}
```

### POST /api/onboarding/start

Creates onboarding state for user.

**Request:**
```json
{ "flowId": "onboarding_v1" }
```

**Response:**
```json
{ "success": true, "stateId": "..." }
```

### POST /api/onboarding/step

Completes a step and saves choices.

**Request:**
```json
{
  "stepId": "step_interests",
  "data": {
    "interests": ["focus", "learning", "music"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "nextStepId": "step_modules",
  "isComplete": false
}
```

### POST /api/onboarding/skip

Skips onboarding with soft landing.

**Request:**
```json
{ "softLandingHours": 24 }
```

**Response:**
```json
{ "success": true }
```

## Soft Landing

When user skips onboarding:
1. `is_dismissed` set to 1
2. Soft landing period starts (24 hours default)
3. Today shows collapsed sections
4. User can restart onboarding from Settings

## Re-running Onboarding

Users can restart onboarding:
1. Go to Settings
2. Click "Restart Tutorial"
3. Clears `is_completed` and `is_dismissed`
4. Resets `current_step_id` to first step
5. Redirects to Today (modal appears)

## Best Practices

### Step Design
- Keep steps short (1-2 sentences)
- Use visual icons/illustrations
- Allow skipping non-essential steps
- Progress indicator always visible

### Choice Design
- Limit to 3-5 options
- Use clear, non-jargon labels
- Provide "Not sure" option where appropriate

### Fallback Handling
- If spotlight selector not found: show step without highlight
- If route not accessible: skip to next step
- Always allow manual navigation


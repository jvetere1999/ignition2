# Ignition Database Documentation

**Version:** 102 (0102_schema_fix)
**Last Updated:** January 6, 2026
**Database:** Cloudflare D1 (SQLite)

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Storage Rules](#storage-rules)
3. [Table Reference](#table-reference)
4. [Cross-Table Flows](#cross-table-flows)
5. [Table Use Case Matrix](#table-use-case-matrix)

---

## Schema Overview

Ignition uses Cloudflare D1 (SQLite) as the primary data store. All persistent, behavior-affecting data MUST be stored in D1. Binary blobs (audio files) are stored in Cloudflare R2.

### Database Sections

| Section | Tables | Purpose |
|---------|--------|---------|
| Auth | users, accounts, sessions, verification_tokens, authenticators | NextAuth.js authentication |
| Personalization | user_settings, user_interests, user_ui_modules | User preferences |
| Onboarding | onboarding_flows, onboarding_steps, user_onboarding_state | Guided onboarding |
| Gamification | points_ledger, user_wallet, skill_definitions, user_skills, achievement_definitions, user_achievements, user_streaks, activity_events | Points, XP, skills, achievements |
| Market | market_items, user_purchases | Reward marketplace |
| Focus | focus_sessions, focus_pause_state | Timed focus sessions |
| Quests | quests, user_quest_progress | Task/quest system |
| Habits | habits, habit_logs | Habit tracking |
| Goals | goals, goal_milestones | Goal setting |
| Learn | learn_topics, learn_lessons, learn_drills, user_lesson_progress, user_drill_stats, flashcard_decks, flashcards | Learning system |
| Planning | daily_plans, plan_templates, calendar_events | Daily planning |
| Exercise | exercises, exercise_sets, workouts, workout_sessions, workout_exercises, workout_sections, training_programs, program_weeks, program_workouts, personal_records | Workout tracking |
| Books | books, reading_sessions | Book tracking |
| Ideas | ideas | Idea capture |
| Infobase | infobase_entries | Knowledge base |
| Journal | journal_entries | Learning journal |
| Content | ignition_packs, daw_shortcuts, glossary_terms, recipe_templates | Seeded content |
| Reference | reference_tracks, track_analysis_cache | Audio analysis cache |
| System | db_metadata, access_requests, feedback, notifications, admin_audit_log | System metadata |

---

## Storage Rules

### What Goes Where

| Storage | Use For | Examples |
|---------|---------|----------|
| D1 | All persistent data | User data, preferences, progress, content |
| R2 | Binary blobs only | Audio files, images, exports |
| localStorage | Cosmetic UI only | Theme, collapsed sections |
| sessionStorage | Session-only state | Soft landing, momentum banners |

### Forbidden in localStorage

- Wallet/balance data
- Purchase history
- Quest progress
- Focus pause state (behavior-affecting)
- Onboarding progress
- Module weights/preferences
- Any data used in `resolveNextAction`

---

## Table Reference

### Section 1: Auth Tables

#### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | User UUID |
| name | TEXT | NOT NULL | Display name |
| email | TEXT | NOT NULL UNIQUE | Email address |
| emailVerified | INTEGER | | Email verified timestamp |
| image | TEXT | | Profile image URL |
| role | TEXT | NOT NULL DEFAULT 'user' | user/admin |
| approved | INTEGER | NOT NULL DEFAULT 1 | Account approved |
| age_verified | INTEGER | NOT NULL DEFAULT 1 | Age verified |
| tos_accepted | INTEGER | NOT NULL DEFAULT 0 | TOS accepted |
| tos_accepted_at | TEXT | | TOS acceptance timestamp |
| tos_version | TEXT | | TOS version accepted |
| last_activity_at | TEXT | | Last activity timestamp |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Auth | **Used:** YES | **Seeded:** No

#### accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Account UUID |
| userId | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| type | TEXT | NOT NULL | OAuth type |
| provider | TEXT | NOT NULL | OAuth provider |
| providerAccountId | TEXT | NOT NULL | Provider account ID |
| refresh_token | TEXT | | OAuth refresh token |
| access_token | TEXT | | OAuth access token |
| expires_at | INTEGER | | Token expiry |
| token_type | TEXT | | Token type |
| scope | TEXT | | OAuth scope |
| id_token | TEXT | | ID token |
| session_state | TEXT | | Session state |

**Domain:** Auth | **Used:** YES | **Seeded:** No

#### sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Session UUID |
| sessionToken | TEXT | NOT NULL UNIQUE | Session token |
| userId | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| expires | TEXT | NOT NULL | Expiry timestamp |

**Domain:** Auth | **Used:** YES | **Seeded:** No

#### verification_tokens

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| identifier | TEXT | NOT NULL | Token identifier |
| token | TEXT | NOT NULL UNIQUE | Token value |
| expires | TEXT | NOT NULL | Expiry timestamp |

**Domain:** Auth | **Used:** YES | **Seeded:** No

#### authenticators

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| credentialID | TEXT | NOT NULL UNIQUE | Credential ID |
| userId | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| providerAccountId | TEXT | NOT NULL | Provider account ID |
| credentialPublicKey | TEXT | NOT NULL | Public key |
| counter | INTEGER | NOT NULL | Counter |
| credentialDeviceType | TEXT | NOT NULL | Device type |
| credentialBackedUp | INTEGER | NOT NULL | Backed up flag |
| transports | TEXT | | Transport types |

**Domain:** Auth | **Used:** NO (WebAuthn reserved) | **Seeded:** No

---

### Section 2: Personalization Tables

#### user_settings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Settings UUID |
| user_id | TEXT | NOT NULL UNIQUE FK users(id) CASCADE | User reference |
| nudge_intensity | TEXT | DEFAULT 'standard' | gentle/standard/energetic |
| default_focus_duration | INTEGER | DEFAULT 300 | Default focus seconds |
| gamification_visible | TEXT | DEFAULT 'always' | always/subtle/hidden |
| planner_mode | TEXT | DEFAULT 'collapsed' | visible/collapsed/hidden |
| theme | TEXT | DEFAULT 'system' | Theme preference |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Personalization | **Used:** YES | **Seeded:** No

#### user_interests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Interest UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| interest_key | TEXT | NOT NULL | Interest identifier |
| priority | INTEGER | NOT NULL DEFAULT 1 | Priority order |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Personalization | **Used:** YES | **Seeded:** No

#### user_ui_modules

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Module UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| module_key | TEXT | NOT NULL | Module identifier |
| weight | INTEGER | NOT NULL DEFAULT 50 | Display priority (0-100) |
| enabled | INTEGER | NOT NULL DEFAULT 1 | Module enabled |
| last_shown_at | TEXT | | Last display timestamp |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Personalization | **Used:** YES | **Seeded:** No

---

### Section 3: Onboarding Tables

#### onboarding_flows

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Flow UUID |
| version | INTEGER | NOT NULL | Flow version |
| name | TEXT | NOT NULL | Flow name |
| description | TEXT | | Flow description |
| is_active | INTEGER | NOT NULL DEFAULT 0 | Active flag |
| total_steps | INTEGER | NOT NULL | Total step count |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Onboarding | **Used:** YES | **Seeded:** YES

#### onboarding_steps

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Step UUID |
| flow_id | TEXT | NOT NULL FK onboarding_flows(id) CASCADE | Flow reference |
| step_order | INTEGER | NOT NULL | Step order |
| step_type | TEXT | NOT NULL | tour/choice/preference/action/explain |
| title | TEXT | NOT NULL | Step title |
| description | TEXT | | Step description |
| target_selector | TEXT | | CSS selector for tour |
| target_route | TEXT | | Route to navigate |
| fallback_content | TEXT | | Fallback if selector fails |
| options_json | TEXT | | JSON options for choice/preference |
| allows_multiple | INTEGER | NOT NULL DEFAULT 0 | Multi-select allowed |
| required | INTEGER | NOT NULL DEFAULT 0 | Required step |
| action_type | TEXT | | Action type for action steps |
| action_config_json | TEXT | | Action configuration |

**Domain:** Onboarding | **Used:** YES | **Seeded:** YES (10 steps)

#### user_onboarding_state

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | State UUID |
| user_id | TEXT | NOT NULL UNIQUE FK users(id) CASCADE | User reference |
| flow_id | TEXT | NOT NULL FK onboarding_flows(id) | Flow reference |
| current_step_id | TEXT | | Current step reference |
| status | TEXT | NOT NULL DEFAULT 'not_started' | not_started/in_progress/completed/skipped |
| started_at | TEXT | | Start timestamp |
| completed_at | TEXT | | Completion timestamp |
| skipped_at | TEXT | | Skip timestamp |
| last_step_completed_at | TEXT | | Last step completion |
| responses_json | TEXT | | Step responses JSON |
| can_resume | INTEGER | NOT NULL DEFAULT 1 | Resumable flag |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Onboarding | **Used:** YES | **Seeded:** No

---

### Section 4: Gamification Tables

#### points_ledger

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Entry UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| event_type | TEXT | NOT NULL | Event type |
| event_id | TEXT | | Related event ID |
| coins | INTEGER | NOT NULL DEFAULT 0 | Coins awarded |
| xp | INTEGER | NOT NULL DEFAULT 0 | XP awarded |
| skill_stars | INTEGER | NOT NULL DEFAULT 0 | Skill stars awarded |
| skill_key | TEXT | | Skill key if skill_stars > 0 |
| reason | TEXT | | Reason for award |
| idempotency_key | TEXT | UNIQUE | Prevent duplicates |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Gamification | **Used:** YES | **Seeded:** No

#### user_wallet

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Wallet UUID |
| user_id | TEXT | NOT NULL UNIQUE FK users(id) CASCADE | User reference |
| coins | INTEGER | NOT NULL DEFAULT 0 | Current coins |
| xp | INTEGER | NOT NULL DEFAULT 0 | Current XP |
| level | INTEGER | NOT NULL DEFAULT 1 | Current level |
| xp_to_next_level | INTEGER | NOT NULL DEFAULT 100 | XP needed for next level |
| total_skill_stars | INTEGER | NOT NULL DEFAULT 0 | Total skill stars |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Gamification | **Used:** YES | **Seeded:** No

#### skill_definitions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Skill UUID |
| key | TEXT | NOT NULL UNIQUE | Skill identifier |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | | Skill description |
| category | TEXT | NOT NULL | Skill category |
| icon | TEXT | | Icon identifier |
| max_level | INTEGER | NOT NULL DEFAULT 10 | Maximum level |
| stars_per_level | INTEGER | NOT NULL DEFAULT 10 | Stars needed per level |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Gamification | **Used:** YES | **Seeded:** YES (6 skills)

#### user_skills

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | User skill UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| skill_key | TEXT | NOT NULL FK skill_definitions(key) | Skill reference |
| current_stars | INTEGER | NOT NULL DEFAULT 0 | Stars earned |
| current_level | INTEGER | NOT NULL DEFAULT 0 | Current level |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Gamification | **Used:** YES | **Seeded:** No

#### achievement_definitions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Achievement UUID |
| key | TEXT | NOT NULL UNIQUE | Achievement identifier |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | | Achievement description |
| category | TEXT | NOT NULL | Achievement category |
| icon | TEXT | | Icon identifier |
| trigger_type | TEXT | NOT NULL | Trigger type |
| trigger_config_json | TEXT | | Trigger configuration |
| reward_coins | INTEGER | NOT NULL DEFAULT 0 | Coin reward |
| reward_xp | INTEGER | NOT NULL DEFAULT 0 | XP reward |
| is_hidden | INTEGER | NOT NULL DEFAULT 0 | Hidden until earned |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Gamification | **Used:** YES | **Seeded:** YES (7 achievements)

#### user_achievements

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | User achievement UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| achievement_key | TEXT | NOT NULL FK achievement_definitions(key) | Achievement reference |
| earned_at | TEXT | NOT NULL | Earn timestamp |
| notified | INTEGER | NOT NULL DEFAULT 0 | User notified |

**Domain:** Gamification | **Used:** YES | **Seeded:** No

#### user_streaks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Streak UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| streak_type | TEXT | NOT NULL | Streak type (daily, focus, etc.) |
| current_count | INTEGER | NOT NULL DEFAULT 0 | Current streak count |
| longest_count | INTEGER | NOT NULL DEFAULT 0 | Longest streak ever |
| last_activity_date | TEXT | | Last activity date |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Gamification | **Used:** YES | **Seeded:** No

#### activity_events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Event UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| event_type | TEXT | NOT NULL | Event type |
| metadata_json | TEXT | | Event metadata |
| created_at | TEXT | NOT NULL | Event timestamp |

**Domain:** Gamification | **Used:** YES | **Seeded:** No

---

### Section 5: Market Tables

#### market_items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Item UUID |
| key | TEXT | NOT NULL UNIQUE | Item identifier |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | | Item description |
| category | TEXT | NOT NULL | Item category |
| cost_coins | INTEGER | NOT NULL | Coin cost |
| icon | TEXT | | Icon identifier |
| is_available | INTEGER | NOT NULL DEFAULT 1 | Available for purchase |
| is_consumable | INTEGER | NOT NULL DEFAULT 1 | Consumable or permanent |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Market | **Used:** YES | **Seeded:** YES (6 items)

#### user_purchases

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Purchase UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| item_id | TEXT | NOT NULL FK market_items(id) | Item reference |
| cost_coins | INTEGER | NOT NULL | Coins spent |
| purchased_at | TEXT | NOT NULL | Purchase timestamp |
| redeemed_at | TEXT | | Redemption timestamp |

**Domain:** Market | **Used:** YES | **Seeded:** No

---

### Section 6: Focus Tables

#### focus_sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Session UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| mode | TEXT | NOT NULL | focus/break |
| duration | INTEGER | NOT NULL | Planned duration seconds |
| started_at | TEXT | NOT NULL | Start timestamp |
| completed_at | TEXT | | Completion timestamp |
| abandoned_at | TEXT | | Abandonment timestamp |
| paused_at | TEXT | | Pause timestamp |
| paused_remaining | INTEGER | | Remaining seconds when paused |
| status | TEXT | NOT NULL DEFAULT 'active' | active/completed/abandoned/paused |
| xp_awarded | INTEGER | NOT NULL DEFAULT 0 | XP awarded |
| coins_awarded | INTEGER | NOT NULL DEFAULT 0 | Coins awarded |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Focus | **Used:** YES | **Seeded:** No

#### focus_pause_state

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Pause state UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| mode | TEXT | NOT NULL DEFAULT 'focus' | focus/break/long_break |
| time_remaining | INTEGER | NOT NULL DEFAULT 0 | Remaining seconds |
| paused_at | TEXT | NOT NULL | Pause timestamp |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Focus | **Used:** YES | **Seeded:** No

---

### Section 7: Quests Tables

#### quests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Quest UUID |
| user_id | TEXT | FK users(id) CASCADE | User reference (null for universal) |
| title | TEXT | NOT NULL | Quest title |
| description | TEXT | | Quest description |
| category | TEXT | NOT NULL | Quest category |
| difficulty | TEXT | NOT NULL DEFAULT 'starter' | starter/easy/medium/hard |
| xp_reward | INTEGER | NOT NULL DEFAULT 10 | XP reward |
| coin_reward | INTEGER | NOT NULL DEFAULT 5 | Coin reward |
| is_universal | INTEGER | NOT NULL DEFAULT 0 | Universal quest flag |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active flag |
| status | TEXT | NOT NULL DEFAULT 'available' | available/accepted/completed |
| accepted_at | TEXT | | Acceptance timestamp |
| completed_at | TEXT | | Completion timestamp |
| expires_at | TEXT | | Expiry timestamp |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Quests | **Used:** YES | **Seeded:** YES (13 universal quests)

#### universal_quests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Quest UUID |
| title | TEXT | NOT NULL | Quest title |
| description | TEXT | | Quest description |
| type | TEXT | NOT NULL DEFAULT 'daily' | daily/weekly/special |
| xp_reward | INTEGER | NOT NULL DEFAULT 10 | XP reward |
| coin_reward | INTEGER | NOT NULL DEFAULT 5 | Coin reward |
| target | INTEGER | NOT NULL DEFAULT 1 | Target count |
| skill_id | TEXT | | Related skill |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active flag |
| created_by | TEXT | | Admin who created |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Quests | **Used:** YES | **Seeded:** YES (8 quests)

**Note:** The API uses `universal_quests` for shared quests across all users, while `quests` is for user-specific quests.

#### user_quest_progress

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Progress UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| quest_id | TEXT | NOT NULL FK quests(id) CASCADE | Quest reference |
| status | TEXT | NOT NULL DEFAULT 'accepted' | accepted/completed/abandoned |
| progress | INTEGER | NOT NULL DEFAULT 0 | Current progress |
| completed | INTEGER | NOT NULL DEFAULT 0 | Completed flag |
| accepted_at | TEXT | NOT NULL | Acceptance timestamp |
| completed_at | TEXT | | Completion timestamp |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | | Update timestamp |

**Domain:** Quests | **Used:** YES | **Seeded:** No

---

### Section 8: Habits & Goals Tables

#### habits

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Habit UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| name | TEXT | NOT NULL | Habit name |
| description | TEXT | | Habit description |
| frequency | TEXT | NOT NULL DEFAULT 'daily' | daily/weekly |
| target_count | INTEGER | NOT NULL DEFAULT 1 | Target per period |
| icon | TEXT | | Icon identifier |
| color | TEXT | | Color identifier |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active flag |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Habits | **Used:** YES | **Seeded:** No

#### habit_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Log UUID |
| habit_id | TEXT | NOT NULL FK habits(id) CASCADE | Habit reference |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| completed_at | TEXT | NOT NULL | Completion timestamp |
| notes | TEXT | | Log notes |

**Domain:** Habits | **Used:** YES | **Seeded:** No

#### goals

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Goal UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| title | TEXT | NOT NULL | Goal title |
| description | TEXT | | Goal description |
| category | TEXT | | Goal category |
| target_date | TEXT | | Target date |
| status | TEXT | NOT NULL DEFAULT 'active' | active/completed/abandoned |
| progress | INTEGER | NOT NULL DEFAULT 0 | Progress percentage |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Goals | **Used:** YES | **Seeded:** No

#### goal_milestones

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Milestone UUID |
| goal_id | TEXT | NOT NULL FK goals(id) CASCADE | Goal reference |
| title | TEXT | NOT NULL | Milestone title |
| is_completed | INTEGER | NOT NULL DEFAULT 0 | Completed flag |
| completed_at | TEXT | | Completion timestamp |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |

**Domain:** Goals | **Used:** YES | **Seeded:** No

---

### Section 9: Learn Tables

#### learn_topics

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Topic UUID |
| key | TEXT | NOT NULL UNIQUE | Topic identifier |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | | Topic description |
| category | TEXT | NOT NULL | Topic category |
| icon | TEXT | | Icon identifier |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Learn | **Used:** YES | **Seeded:** YES (6 topics)

#### learn_lessons

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Lesson UUID |
| topic_id | TEXT | NOT NULL FK learn_topics(id) CASCADE | Topic reference |
| key | TEXT | NOT NULL UNIQUE | Lesson identifier |
| title | TEXT | NOT NULL | Lesson title |
| description | TEXT | | Lesson description |
| content_markdown | TEXT | | Lesson content |
| duration_minutes | INTEGER | NOT NULL DEFAULT 5 | Estimated duration |
| difficulty | TEXT | NOT NULL DEFAULT 'beginner' | beginner/intermediate/advanced |
| xp_reward | INTEGER | NOT NULL DEFAULT 20 | XP reward |
| coin_reward | INTEGER | NOT NULL DEFAULT 10 | Coin reward |
| skill_key | TEXT | | Related skill |
| skill_star_reward | INTEGER | NOT NULL DEFAULT 1 | Skill stars awarded |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Learn | **Used:** YES | **Seeded:** YES (7 lessons)

#### learn_drills

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Drill UUID |
| topic_id | TEXT | NOT NULL FK learn_topics(id) CASCADE | Topic reference |
| key | TEXT | NOT NULL UNIQUE | Drill identifier |
| title | TEXT | NOT NULL | Drill title |
| description | TEXT | | Drill description |
| drill_type | TEXT | NOT NULL | interval/chord/rhythm/scale |
| config_json | TEXT | NOT NULL | Drill configuration |
| difficulty | TEXT | NOT NULL DEFAULT 'beginner' | beginner/intermediate/advanced |
| duration_seconds | INTEGER | NOT NULL DEFAULT 120 | Estimated duration |
| xp_reward | INTEGER | NOT NULL DEFAULT 5 | XP reward |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Learn | **Used:** YES | **Seeded:** YES (7 drills)

#### user_lesson_progress

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Progress UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| lesson_id | TEXT | NOT NULL FK learn_lessons(id) CASCADE | Lesson reference |
| status | TEXT | NOT NULL DEFAULT 'not_started' | not_started/in_progress/completed |
| started_at | TEXT | | Start timestamp |
| completed_at | TEXT | | Completion timestamp |
| quiz_score | INTEGER | | Quiz score if applicable |

**Domain:** Learn | **Used:** YES | **Seeded:** No

#### user_drill_stats

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Stats UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| drill_id | TEXT | NOT NULL FK learn_drills(id) CASCADE | Drill reference |
| attempts | INTEGER | NOT NULL DEFAULT 0 | Total attempts |
| correct | INTEGER | NOT NULL DEFAULT 0 | Correct answers |
| streak | INTEGER | NOT NULL DEFAULT 0 | Current streak |
| best_streak | INTEGER | NOT NULL DEFAULT 0 | Best streak |
| last_attempted_at | TEXT | | Last attempt timestamp |
| next_due_at | TEXT | | Spaced repetition due |

**Domain:** Learn | **Used:** YES | **Seeded:** No

#### flashcard_decks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Deck UUID |
| user_id | TEXT | FK users(id) CASCADE | User reference (null for public) |
| name | TEXT | NOT NULL | Deck name |
| description | TEXT | | Deck description |
| category | TEXT | | Deck category |
| is_public | INTEGER | NOT NULL DEFAULT 0 | Public flag |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Learn | **Used:** YES | **Seeded:** No

#### flashcards

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Card UUID |
| deck_id | TEXT | NOT NULL FK flashcard_decks(id) CASCADE | Deck reference |
| front | TEXT | NOT NULL | Card front |
| back | TEXT | NOT NULL | Card back |
| difficulty | INTEGER | NOT NULL DEFAULT 0 | Difficulty rating |
| next_review_at | TEXT | | Next review timestamp |
| review_count | INTEGER | NOT NULL DEFAULT 0 | Review count |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Learn | **Used:** YES | **Seeded:** No

---

### Section 10: Planning Tables

#### daily_plans

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Plan UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| date | TEXT | NOT NULL | Plan date |
| items_json | TEXT | | Plan items JSON |
| status | TEXT | NOT NULL DEFAULT 'active' | active/completed |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Planning | **Used:** YES | **Seeded:** No

#### plan_templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Template UUID |
| user_id | TEXT | FK users(id) CASCADE | User reference (null for public) |
| name | TEXT | NOT NULL | Template name |
| description | TEXT | | Template description |
| items_json | TEXT | | Template items JSON |
| is_public | INTEGER | NOT NULL DEFAULT 0 | Public flag |
| category | TEXT | | Template category |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Planning | **Used:** YES | **Seeded:** YES (5 templates)

#### calendar_events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Event UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| title | TEXT | NOT NULL | Event title |
| description | TEXT | | Event description |
| event_type | TEXT | NOT NULL DEFAULT 'general' | meeting/appointment/workout/other |
| start_time | TEXT | NOT NULL | Start timestamp |
| end_time | TEXT | | End timestamp |
| all_day | INTEGER | NOT NULL DEFAULT 0 | All day flag |
| location | TEXT | | Event location |
| recurrence_rule | TEXT | | Recurrence rule |
| recurrence_end | TEXT | | Recurrence end date |
| parent_event_id | TEXT | | Parent recurring event |
| workout_id | TEXT | FK workouts(id) | Related workout |
| color | TEXT | | Event color |
| reminder_minutes | INTEGER | | Reminder minutes before |
| metadata | TEXT | | Additional metadata JSON |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Planning | **Used:** YES | **Seeded:** No

---

### Section 11: Exercise Tables

#### exercises

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Exercise UUID |
| name | TEXT | NOT NULL | Exercise name |
| description | TEXT | | Exercise description |
| category | TEXT | NOT NULL | Exercise category |
| muscle_groups | TEXT | | Muscle groups targeted |
| equipment | TEXT | | Equipment needed |
| is_custom | INTEGER | NOT NULL DEFAULT 0 | Custom exercise flag |
| user_id | TEXT | FK users(id) CASCADE | User who created (if custom) |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Exercise | **Used:** YES | **Seeded:** YES (873 exercises)

#### exercise_sets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Set UUID |
| workout_session_id | TEXT | NOT NULL FK workout_sessions(id) CASCADE | Session reference |
| exercise_id | TEXT | NOT NULL FK exercises(id) | Exercise reference |
| set_number | INTEGER | NOT NULL | Set number |
| reps | INTEGER | | Reps performed |
| weight | REAL | | Weight used |
| duration_seconds | INTEGER | | Duration (for timed exercises) |
| notes | TEXT | | Set notes |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

#### workouts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Workout UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| name | TEXT | NOT NULL | Workout name |
| description | TEXT | | Workout description |
| exercises_json | TEXT | | Exercises JSON |
| is_template | INTEGER | NOT NULL DEFAULT 0 | Template flag |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

#### workout_sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Session UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| workout_id | TEXT | FK workouts(id) | Workout reference |
| started_at | TEXT | NOT NULL | Start timestamp |
| completed_at | TEXT | | Completion timestamp |
| duration_seconds | INTEGER | | Total duration |
| notes | TEXT | | Session notes |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

#### workout_exercises

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Workout exercise UUID |
| workout_id | TEXT | NOT NULL FK workouts(id) CASCADE | Workout reference |
| exercise_id | TEXT | NOT NULL FK exercises(id) | Exercise reference |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |
| sets | INTEGER | NOT NULL DEFAULT 3 | Target sets |
| reps | INTEGER | | Target reps |
| rest_seconds | INTEGER | | Rest between sets |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

#### workout_sections

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Section UUID |
| workout_id | TEXT | NOT NULL FK workouts(id) CASCADE | Workout reference |
| name | TEXT | NOT NULL | Section name |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

#### training_programs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Program UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| name | TEXT | NOT NULL | Program name |
| description | TEXT | | Program description |
| duration_weeks | INTEGER | NOT NULL | Program duration |
| goal | TEXT | | Program goal |
| status | TEXT | NOT NULL DEFAULT 'active' | active/completed/paused |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

#### program_weeks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Week UUID |
| program_id | TEXT | NOT NULL FK training_programs(id) CASCADE | Program reference |
| week_number | INTEGER | NOT NULL | Week number |
| focus | TEXT | | Week focus |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

#### program_workouts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Program workout UUID |
| week_id | TEXT | NOT NULL FK program_weeks(id) CASCADE | Week reference |
| workout_id | TEXT | NOT NULL FK workouts(id) | Workout reference |
| day_of_week | INTEGER | NOT NULL | Day (0=Sunday) |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

#### personal_records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | PR UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| exercise_id | TEXT | NOT NULL FK exercises(id) | Exercise reference |
| record_type | TEXT | NOT NULL | weight/reps/time |
| value | REAL | NOT NULL | Record value |
| achieved_at | TEXT | NOT NULL | Achievement timestamp |

**Domain:** Exercise | **Used:** YES | **Seeded:** No

---

### Section 12: Books Tables

#### books

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Book UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| title | TEXT | NOT NULL | Book title |
| author | TEXT | | Book author |
| total_pages | INTEGER | | Total pages |
| current_page | INTEGER | NOT NULL DEFAULT 0 | Current page |
| status | TEXT | NOT NULL DEFAULT 'reading' | reading/completed/paused/dropped |
| started_at | TEXT | | Start timestamp |
| completed_at | TEXT | | Completion timestamp |
| cover_url | TEXT | | Cover image URL |
| notes | TEXT | | Book notes |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Books | **Used:** YES | **Seeded:** No

#### reading_sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Session UUID |
| book_id | TEXT | NOT NULL FK books(id) CASCADE | Book reference |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| pages_read | INTEGER | NOT NULL | Pages read |
| duration_minutes | INTEGER | | Reading duration |
| notes | TEXT | | Session notes |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Books | **Used:** YES | **Seeded:** No

---

### Section 13: Ideas & Journal Tables

#### ideas

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Idea UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| title | TEXT | NOT NULL | Idea title |
| content | TEXT | | Idea content |
| category | TEXT | | Idea category |
| tags_json | TEXT | | Tags JSON |
| is_archived | INTEGER | NOT NULL DEFAULT 0 | Archived flag |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Ideas | **Used:** YES | **Seeded:** No

#### journal_entries

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Entry UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| title | TEXT | NOT NULL | Entry title |
| content | TEXT | NOT NULL | Entry content |
| tags_json | TEXT | | Tags JSON |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Journal | **Used:** YES | **Seeded:** No

#### infobase_entries

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Entry UUID |
| user_id | TEXT | FK users(id) CASCADE | User reference (null for public) |
| title | TEXT | NOT NULL | Entry title |
| content | TEXT | NOT NULL | Entry content |
| category | TEXT | | Entry category |
| tags_json | TEXT | | Tags JSON |
| is_public | INTEGER | NOT NULL DEFAULT 0 | Public flag |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Infobase | **Used:** YES | **Seeded:** YES (5 entries)

---

### Section 14: Content Tables (Seeded)

#### ignition_packs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Pack UUID |
| key | TEXT | NOT NULL UNIQUE | Pack identifier |
| name | TEXT | NOT NULL | Pack name |
| description | TEXT | | Pack description |
| category | TEXT | NOT NULL | Pack category |
| items_json | TEXT | NOT NULL | Items JSON array |
| icon | TEXT | | Icon identifier |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Content | **Used:** YES | **Seeded:** YES (8 packs)

#### daw_shortcuts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Shortcut UUID |
| daw | TEXT | NOT NULL | DAW identifier |
| category | TEXT | NOT NULL | Shortcut category |
| action | TEXT | NOT NULL | Action name |
| shortcut_mac | TEXT | | Mac shortcut |
| shortcut_win | TEXT | | Windows shortcut |
| description | TEXT | | Description |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |

**Domain:** Content | **Used:** YES | **Seeded:** YES (15 shortcuts)

#### glossary_terms

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Term UUID |
| term | TEXT | NOT NULL UNIQUE | Term |
| definition | TEXT | NOT NULL | Definition |
| category | TEXT | | Term category |
| related_terms | TEXT | | Related terms |

**Domain:** Content | **Used:** YES | **Seeded:** YES (15 terms)

#### recipe_templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Recipe UUID |
| name | TEXT | NOT NULL | Recipe name |
| description | TEXT | | Recipe description |
| category | TEXT | NOT NULL | Recipe category |
| genre | TEXT | | Music genre |
| steps_json | TEXT | NOT NULL | Steps JSON array |
| tips | TEXT | | Recipe tips |

**Domain:** Content | **Used:** YES | **Seeded:** YES (5 recipes)

---

### Section 15: Reference Tracks Tables

#### reference_tracks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Track UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| title | TEXT | NOT NULL | Track title |
| artist | TEXT | | Artist name |
| r2_key | TEXT | NOT NULL | R2 object key |
| mime_type | TEXT | NOT NULL | Audio MIME type |
| bytes | INTEGER | NOT NULL | File size in bytes |
| sha256 | TEXT | | File checksum |
| duration_seconds | REAL | | Track duration |
| tags_json | TEXT | | Tags JSON |
| visibility | TEXT | NOT NULL DEFAULT 'private' | Visibility |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** Reference | **Used:** YES | **Seeded:** No
**Note:** Audio files stored in R2, only metadata in D1.

#### track_analysis_cache

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Analysis UUID |
| track_id | TEXT | NOT NULL UNIQUE FK reference_tracks(id) CASCADE | Track reference |
| bpm | REAL | | Detected BPM |
| key | TEXT | | Detected musical key |
| energy | REAL | | Energy level (0-1) |
| danceability | REAL | | Danceability (0-1) |
| sections_json | TEXT | | Detected sections |
| waveform_json | TEXT | | Downsampled waveform |
| analyzed_at | TEXT | NOT NULL | Analysis timestamp |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** Reference | **Used:** YES | **Seeded:** No

---

### Section 16: System Tables

#### db_metadata

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| key | TEXT | PK | Metadata key |
| value | TEXT | NOT NULL | Metadata value |
| updated_at | TEXT | NOT NULL | Update timestamp |

**Domain:** System | **Used:** YES | **Seeded:** YES

#### access_requests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Request UUID |
| email | TEXT | NOT NULL UNIQUE | Requester email |
| name | TEXT | | Requester name |
| reason | TEXT | | Request reason |
| status | TEXT | NOT NULL DEFAULT 'pending' | pending/approved/denied |
| created_at | TEXT | NOT NULL | Creation timestamp |
| processed_at | TEXT | | Processing timestamp |

**Domain:** System | **Used:** PLANNED | **Seeded:** No

#### feedback

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Feedback UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| type | TEXT | NOT NULL | bug/feature/other |
| title | TEXT | NOT NULL | Feedback title |
| description | TEXT | | Feedback description |
| status | TEXT | NOT NULL DEFAULT 'open' | open/in_progress/resolved/closed |
| priority | TEXT | NOT NULL DEFAULT 'normal' | low/normal/high/critical |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** System | **Used:** YES | **Seeded:** No

#### notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Notification UUID |
| user_id | TEXT | NOT NULL FK users(id) CASCADE | User reference |
| type | TEXT | NOT NULL | Notification type |
| title | TEXT | NOT NULL | Notification title |
| message | TEXT | | Notification message |
| data_json | TEXT | | Extra data JSON |
| read | INTEGER | NOT NULL DEFAULT 0 | Read flag |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** System | **Used:** YES | **Seeded:** No

#### admin_audit_log

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Log UUID |
| admin_id | TEXT | NOT NULL FK users(id) | Admin user reference |
| action | TEXT | NOT NULL | Action taken |
| target_type | TEXT | | Target entity type |
| target_id | TEXT | | Target entity ID |
| details_json | TEXT | | Action details |
| created_at | TEXT | NOT NULL | Creation timestamp |

**Domain:** System | **Used:** YES | **Seeded:** No

---

## Cross-Table Flows

### Auth Flow

1. User signs in via OAuth
2. `accounts` record created by Auth.js adapter
3. `users` record created/updated
4. `sessions` record created
5. `user_settings`, `user_wallet`, `user_onboarding_state` created via createUser event

### Today Resolution Flow

1. Read `users.last_activity_at` to determine gap
2. Read `user_onboarding_state` to check onboarding status
3. Read `user_settings` for nudge intensity and preferences
4. Read `user_interests` for personalization
5. Read `user_ui_modules` for module weights
6. Read `focus_sessions` for active focus
7. Read `quests` for available quests
8. Compute `TodayUserState` and `resolveNextAction`

### Focus Lifecycle

1. POST `/api/focus/start` creates `focus_sessions` record
2. Pause: PATCH `/api/focus/{id}/pause` updates `paused_at`, `paused_remaining`
3. Resume: PATCH `/api/focus/{id}/resume` clears pause fields
4. Complete: PATCH `/api/focus/{id}/complete` sets `completed_at`, awards points
5. Points: INSERT into `points_ledger`, UPDATE `user_wallet`

### Onboarding Flow

1. First login triggers onboarding modal
2. Read `onboarding_flows` and `onboarding_steps`
3. Each step completion: UPDATE `user_onboarding_state`
4. Interest selection: INSERT `user_interests`
5. Module weights: INSERT `user_ui_modules`
6. Settings: UPDATE `user_settings`
7. Completion: UPDATE `user_onboarding_state.status = 'completed'`

### Market Purchase Flow

1. Check `user_wallet.coins` >= `market_items.cost_coins`
2. INSERT `user_purchases`
3. INSERT `points_ledger` (negative coins)
4. UPDATE `user_wallet.coins`

### Learn Drill Flow

1. User starts drill from `learn_drills`
2. On complete: UPSERT `user_drill_stats`
3. Award XP: INSERT `points_ledger`, UPDATE `user_wallet`

---

## Table Use Case Matrix

| Table | Domain | Used? | Seeded? |
|-------|--------|-------|---------|
| users | Auth | YES | No |
| accounts | Auth | YES | No |
| sessions | Auth | YES | No |
| verification_tokens | Auth | YES | No |
| authenticators | Auth | NO | No |
| user_settings | Personalization | YES | No |
| user_interests | Personalization | YES | No |
| user_ui_modules | Personalization | YES | No |
| onboarding_flows | Onboarding | YES | YES |
| onboarding_steps | Onboarding | YES | YES |
| user_onboarding_state | Onboarding | YES | No |
| points_ledger | Gamification | YES | No |
| user_wallet | Gamification | YES | No |
| skill_definitions | Gamification | YES | YES |
| user_skills | Gamification | YES | No |
| achievement_definitions | Gamification | YES | YES |
| user_achievements | Gamification | YES | No |
| user_streaks | Gamification | YES | No |
| activity_events | Gamification | YES | No |
| market_items | Market | YES | YES |
| user_purchases | Market | YES | No |
| focus_sessions | Focus | YES | No |
| quests | Quests | YES | YES |
| user_quest_progress | Quests | YES | No |
| habits | Habits | YES | No |
| habit_logs | Habits | YES | No |
| goals | Goals | YES | No |
| goal_milestones | Goals | YES | No |
| learn_topics | Learn | YES | YES |
| learn_lessons | Learn | YES | YES |
| learn_drills | Learn | YES | YES |
| user_lesson_progress | Learn | YES | No |
| user_drill_stats | Learn | YES | No |
| flashcard_decks | Learn | YES | No |
| flashcards | Learn | YES | No |
| daily_plans | Planning | YES | No |
| plan_templates | Planning | YES | YES |
| calendar_events | Planning | YES | No |
| exercises | Exercise | YES | YES |
| exercise_sets | Exercise | YES | No |
| workouts | Exercise | YES | No |
| workout_sessions | Exercise | YES | No |
| workout_exercises | Exercise | YES | No |
| workout_sections | Exercise | YES | No |
| training_programs | Exercise | YES | No |
| program_weeks | Exercise | YES | No |
| program_workouts | Exercise | YES | No |
| personal_records | Exercise | YES | No |
| books | Books | YES | No |
| reading_sessions | Books | YES | No |
| ideas | Ideas | YES | No |
| journal_entries | Journal | YES | No |
| infobase_entries | Infobase | YES | YES |
| ignition_packs | Content | YES | YES |
| daw_shortcuts | Content | YES | YES |
| glossary_terms | Content | YES | YES |
| recipe_templates | Content | YES | YES |
| reference_tracks | Reference | YES | No |
| track_analysis_cache | Reference | YES | No |
| db_metadata | System | YES | YES |
| access_requests | System | PLANNED | No |
| feedback | System | YES | No |
| notifications | System | YES | No |
| admin_audit_log | System | YES | No |

---

## Seed Data Summary

| Table | Count | Source |
|-------|-------|--------|
| exercises | 873 | resources/exercises.json |
| skill_definitions | 6 | 0100_master_reset.sql |
| achievement_definitions | 7 | 0100_master_reset.sql |
| market_items | 6 | 0100_master_reset.sql |
| onboarding_flows | 1 | 0100_master_reset.sql |
| onboarding_steps | 10 | 0100_master_reset.sql |
| learn_topics | 6 | 0100_master_reset.sql |
| learn_lessons | 7 | 0101_additional_seed_data.sql |
| learn_drills | 7 | 0100_master_reset.sql |
| quests (universal) | 13 | 0100 + 0101 |
| ignition_packs | 8 | 0100 + 0101 |
| daw_shortcuts | 20 | 0100 + 0101 |
| glossary_terms | 15 | 0100 + 0101 |
| plan_templates | 5 | 0101_additional_seed_data.sql |
| recipe_templates | 5 | 0101_additional_seed_data.sql |
| infobase_entries | 5 | 0101_additional_seed_data.sql |

---

*This document was auto-generated on January 6, 2026 and reflects the actual database schema.*


# Gamification Loop

## Overview

Ignition uses a **starter-engine-first** gamification approach. Rewards encourage starting and completing small actions, not grinding or competing.

## Currency System

### Three Currencies

| Currency | Purpose | How Earned | How Spent |
|----------|---------|------------|-----------|
| **Coins** | Market purchases | Activities, achievements, quests | Market items |
| **XP** | Level progression | Activities, achievements | Cannot spend |
| **Skill Stars** | Per-skill mastery | Skill-specific activities | Cannot spend |

### Reward Distribution

```
Event                    XP    Coins   Skill
----------------------------------------
focus_start              5     2       knowledge
focus_complete          25    10       knowledge
workout_start           10     5       guts
workout_complete        50    25       guts
lesson_start             5     2       knowledge
lesson_complete         30    15       knowledge
review_complete         15     5       knowledge
habit_complete          10     5       proficiency
goal_milestone          40    20       proficiency
planner_task_complete   15     5       proficiency
```

## Level System

### XP Curve

Exponential curve with 50% increase per level:
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 250 XP (100 + 150)
- Level 4: 475 XP (250 + 225)
- Level 5: 813 XP (475 + 338)

Formula: `xpForLevel(n) = floor(100 * 1.5^(n-1))`

### Level Up Flow

1. Activity awards XP
2. XP added to wallet
3. System checks if XP >= XP needed for next level
4. If yes: increment level, calculate new threshold, log event
5. Process repeats if multiple levels gained

## Skill System

### Skill Categories

| Skill | Icon | Activities |
|-------|------|------------|
| Knowledge | Book | Focus, learning, review |
| Guts | Flame | Workouts, exercise |
| Proficiency | Star | Habits, planning, goals |
| Charm | Heart | Social (future) |
| Kindness | Clover | Community (future) |

### Skill Progression

- Skill stars earned from relevant activities
- Stars per level configurable (default: 20)
- Skill level = floor(total_stars / stars_per_level)

## Achievement System

### Achievement Types

| Type | Condition | Example |
|------|-----------|---------|
| `first` | First occurrence of event | First Focus Session |
| `count` | Reach count of events | Complete 10 focus sessions |
| `streak` | Maintain streak | 7-day streak |
| `milestone` | Reach threshold | Level 5 |

### Achievement Flow

1. Activity event logged
2. `checkAndUnlockAchievements()` called
3. For each non-hidden, unlocked achievement:
   - Parse condition JSON
   - Check if condition met
   - If yes: unlock and award rewards
4. Achievements marked as unlocked with timestamp

### Condition JSON Format

```json
// first
{ "event_type": "focus_complete" }

// count
{ "event_type": "focus_complete", "count": 10 }

// streak
{ "streak_type": "focus", "days": 7 }

// milestone
{ "type": "level", "threshold": 5 }
```

## Streak System

### Streak Types

- `daily_activity` - Any activity
- `focus` - Focus sessions
- `workout` - Workouts

### Streak Rules

1. Same day activity: no change
2. Yesterday activity: increment streak
3. 2+ days ago: reset to 1 (streak broken)

### Streak Persistence

- Stored in `user_streaks` table
- Tracks current_streak, longest_streak, last_activity_date
- Updated automatically by activity events

## Market System

### Item Categories

- Food & Drinks (takeout, coffee, snacks)
- Entertainment (movies, games)
- Self Care (spa, sleep, naps)
- Custom (user-defined)

### Purchase Flow

```
User -> Market Page -> Select Item -> Confirm Purchase
                                           |
                                           v
                        POST /api/market/purchase
                                           |
                            +--------------+-------------+
                            |                            |
                    Check Balance           Check Balance
                       Fail                    Pass
                         |                       |
                         v                       v
                   Return Error          Deduct Coins
                                              |
                                              v
                                       Record Purchase
                                              |
                                              v
                                       Return Success
```

### Redemption

- Purchases can be redeemed once
- Redemption tracked with timestamp
- Unredeemed purchases shown as banner

## Today Integration

### Reward Teaser

The Today page shows a `RewardTeaser` component:
- Fetches next achievable achievement
- Shows progress bar and label
- Links to Progress page

### Achievement Notifications

Achievements unlocked during activity:
- Stored with `notified = 0`
- Shown on next page load (future)
- Marked as notified after display

## Database Schema

### Key Tables

```sql
-- Wallet (derived balances)
user_wallet (coins, xp, level, xp_to_next_level, total_skill_stars)

-- Transaction log (append-only)
points_ledger (currency, amount, reason, source_type, source_id)

-- Achievements
achievement_definitions (condition_type, condition_json, rewards)
user_achievements (unlocked_at, notified)

-- Skills
skill_definitions (name, icon, stars_per_level)
user_skills (skill_id, current_stars, current_level)

-- Streaks
user_streaks (streak_type, current_streak, longest_streak)

-- Market
market_items (name, cost_coins, category)
user_purchases (item_id, is_redeemed)
```

## Design Principles

### Encouragement over Pressure
- No punishment for missing days
- Streaks are descriptive, not prescriptive
- Reduced mode doesn't shame

### Transparency
- All rewards visible before action
- Progress always trackable
- No hidden mechanics

### Idempotency
- Same action never awards twice
- Source tracking prevents duplicates
- Safe to retry on error

### Starter-Engine Alignment
- Focus on starting, not optimizing
- Small rewards for small actions
- Never block progress with currency


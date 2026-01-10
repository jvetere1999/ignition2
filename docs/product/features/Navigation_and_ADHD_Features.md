# Ignition Navigation and ADHD-Centered Features

## Navigation Philosophy

Navigation reflects **identity and interest**, not urgency.
Urgency is handled **only** by Today.

---

## Desktop Sidebar Navigation

The sidebar is organized into cognitive-based sections:

### Start (Default Open)
> "What helps me begin now"

| Tab | Route | Purpose |
|-----|-------|---------|
| Today | `/today` | Entry point, state-aware |
| Ignitions | `/ignitions` | Ways to begin - not tasks, just starts |
| Focus | `/focus` | Single-task execution |
| Quests | `/quests` | Small, bounded actions |
| Progress | `/progress` | Identity feedback, not pressure |

### Shape (Collapsed)
> "Shape the future without obligation"

| Tab | Route | Purpose |
|-----|-------|---------|
| Planner | `/planner` | Calendar and scheduling |
| Goals | `/goals` | Long-term objectives |
| Habits | `/habits` | Daily routines |
| Exercise | `/exercise` | Workout logging |
| Books | `/books` | Reading tracker |

No alerts. No deadlines here.

### Reflect (Collapsed)
> "Close the loop gently"

| Tab | Route | Purpose |
|-----|-------|---------|
| Wins | `/wins` | Proof that you started |
| Stats | `/stats` | Read-only activity data |
| Market | `/market` | Spend coins on rewards |

Rewards are reflective, not motivating.

### Create (Collapsed)
> "Special interests live here"

| Tab | Route | Purpose |
|-----|-------|---------|
| Shortcuts | `/hub` | DAW keyboard shortcuts |
| Arrange | `/arrange` | Song arrangement tool |
| Templates | `/templates` | Project templates |
| Reference | `/reference` | Reference track analysis |
| Harmonics | `/wheel` | Camelot wheel / Circle of Fifths |
| Infobase | `/infobase` | Production knowledge base |

This section is **never surfaced by Today unless explicitly relevant**.

### Learn (Collapsed)

| Tab | Route | Purpose |
|-----|-------|---------|
| Learn | `/learn` | Courses, lessons, flashcards |

### System (Collapsed)

| Tab | Route | Purpose |
|-----|-------|---------|
| Settings | `/settings` | Preferences and account |

---

## Mobile Navigation

Mobile prioritizes **immediacy over completeness**.

### Bottom Tab Bar

| Label | Route | Meaning |
|-------|-------|---------|
| Now | `/m` | Today, stripped down |
| Act | `/m/do` | Focus + Quests only |
| Browse | `/m/explore` | Everything else |
| System | `/m/me` | Settings |

### Mobile Rules

- Planning is never the default
- Execution screens are always one tap away
- Same server logic, different presentation

---

## ADHD-Centered Features Status

All Starter Engine features are **permanently enabled**. These features were designed specifically to reduce decision paralysis and cognitive overload.

### Enabled Features

| Feature | Status | Description |
|---------|--------|-------------|
| Decision Suppression | ENABLED | Reduces visible choices based on user state |
| Next Action Resolver | ENABLED | Shows one dominant CTA, not many options |
| Momentum Feedback | ENABLED | Shows "Good start." after first action |
| Soft Landing | ENABLED | After completing/abandoning action, shows reduced UI |
| Reduced Mode | ENABLED | Users returning after 48h see simplified Today |
| Dynamic UI | ENABLED | Personalized quick picks based on usage |

### How They Work Together

1. **First Visit (First Day)**
   - Simplified interface
   - One clear starting action
   - Minimal overwhelming choices

2. **Returning After Gap (48h+)**
   - Reduced mode activated
   - "Welcome back. Start small."
   - Fewer options shown
   - Can dismiss to see full interface

3. **Active Session**
   - After completing first action: "Good start." banner
   - Soft landing: reduced choices to prevent burnout
   - Quick picks based on your patterns

4. **Building Momentum**
   - As you use features, dynamic UI learns
   - Resume Last chip for quick continuation
   - Interest primers suggest related features

---

## Visibility Rules (State-Driven)

The Today page visibility adapts to your state:

| State | Starter Block | Daily Plan | Explore | Rewards |
|-------|--------------|------------|---------|---------|
| First Day | YES | Hidden | Collapsed | Hidden |
| Returning (48h+) | YES | Collapsed | Collapsed | Hidden |
| Soft Landing | YES | Collapsed | Collapsed | Hidden |
| Has Plan | YES | Visible | Visible | Visible |
| Active User | YES | Visible | Visible | Visible |

---

## Safety Nets

Built-in protections ensure you always have a way forward:

- **Minimum Visibility**: At least one CTA is always visible
- **Fallback Action**: If resolver fails, defaults to Focus
- **Error Boundaries**: Component failures don't break the page
- **Graceful Degradation**: Works even if database is unavailable

---

## Configuration

These features cannot be disabled - they are core to Ignition's philosophy. The flags module returns `true` for all features for backward compatibility, but the actual logic is always-on.

```typescript
// All return true - features are permanently enabled
isTodayDecisionSuppressionEnabled()  // true
isTodayNextActionResolverEnabled()   // true
isTodayMomentumFeedbackEnabled()     // true
isTodaySoftLandingEnabled()          // true
isTodayReducedModeEnabled()          // true
isTodayDynamicUIEnabled()            // true
```

---

## Philosophy

Ignition is **not** about doing more. It's about **starting**.

- One dominant action, not ten choices
- Calm encouragement, never guilt
- Momentum over productivity
- Begin with one thing


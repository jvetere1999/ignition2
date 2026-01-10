# Passion OS - Product Specification

## Executive Summary

Passion OS is a gamified productivity and skill-building platform for music producers, fitness enthusiasts, and lifelong learners. It combines task planning, focus timers, workout tracking, reading logs, and production tools into a unified experience with XP, levels, and rewards.

**Live URL:** https://passion-os.ecent.online  
**Stack:** Next.js 15 + React 19 + Cloudflare Workers + D1 + R2

---

## Current Feature Inventory

### 1. Productivity Suite

| Feature | Description | D1 Tables | API Routes |
|---------|-------------|-----------|------------|
| **Today Dashboard** | Daily command center with personalized plan generation | `daily_plans` | `/api/daily-plan` |
| **Focus Timer** | Pomodoro-style deep work (25/5/15 min) with break reminders | `focus_sessions` | `/api/focus`, `/api/focus/active` |
| **Planner** | Calendar for events, workouts, focus blocks with recurrence | `calendar_events` | `/api/calendar` |
| **Quests** | Daily/weekly challenges with XP rewards | `quests`, `user_quest_progress` | `/api/quests` |
| **Habits** | Daily routine tracking with streaks | `habits`, `habit_logs` | `/api/habits` |
| **Goals** | Long-term objectives with milestone tracking | `goals`, `goal_milestones` | `/api/goals` |

### 2. Fitness Suite

| Feature | Description | D1 Tables | API Routes |
|---------|-------------|-----------|------------|
| **Exercise Library** | 800+ exercises with muscle targeting | `exercises` | `/api/exercise` |
| **Workout Builder** | Create workouts with sections (warmup/main/cooldown/superset/circuit) | `workouts`, `workout_exercises`, `workout_sections` | `/api/exercise` |
| **Session Logging** | Log sets with weight, reps, RPE | `workout_sessions`, `workout_sets` | `/api/exercise` |
| **Personal Records** | Automatic PR tracking for lifts | `personal_records` | `/api/exercise` |
| **Training Programs** | Multi-week structured plans (coming soon) | `training_programs`, `program_weeks` | `/api/programs` |

### 3. Learning & Growth

| Feature | Description | D1 Tables | API Routes |
|---------|-------------|-----------|------------|
| **Book Tracker** | Reading progress, sessions, ratings, streaks | `books`, `reading_sessions` | `/api/books` |
| **Learning Suite** | Courses, flashcards, recipes, journal | `courses`, `lessons`, `flashcard_decks`, `journal_entries` | `/api/learn/*` |
| **Progress & XP** | Gamification with levels and skill trees | `user_progress` | `/api/progress` |
| **Market** | Spend coins on personal rewards | `rewards`, `reward_purchases` | `/api/market` |

### 4. Music Production

| Feature | Description | Storage | API Routes |
|---------|-------------|---------|------------|
| **DAW Shortcuts** | Keyboard shortcuts for Ableton, Logic, FL Studio, etc. | Static JSON | N/A |
| **Arrange View** | Piano roll and drum sequencer | Local state | N/A |
| **Templates** | Melody, drum, and chord pattern templates | Static | N/A |
| **Reference Tracks** | Audio analysis with BPM/key detection | IndexedDB | `/api/analysis` |
| **Infobase** | Music production knowledge database | `infobase_entries` | `/api/infobase` |

### 5. Platform Features

| Feature | Description |
|---------|-------------|
| **Authentication** | Google + Microsoft OAuth via Auth.js |
| **Age Verification** | 16+ requirement with date picker |
| **Admin Approval** | New users require admin approval |
| **Admin Console** | User management, quest creation, skill tuning |
| **Mobile PWA** | iOS/iPadOS installable web app at `/m/*` |
| **Theme System** | Light/dark modes with accent colors |
| **Notifications** | Browser notifications for reminders |
| **Command Palette** | Keyboard navigation (Cmd+K) |

---

## Front-Page Information Architecture

### Landing Page Sections

```
1. Hero
   - Headline: "Level up your life."
   - Subhead: "Productivity, fitness, and music production in one gamified platform."
   - CTA: "Get Started" -> /auth/signin
   - Secondary: "Learn More" -> /about

2. Value Propositions (3-up grid)
   - Focus & Flow: Deep work sessions with Pomodoro timers
   - Track Everything: Workouts, reading, habits, goals
   - Earn Rewards: XP, levels, coins, and personal rewards

3. Feature Showcase (tabbed or scrolling)
   - Productivity: Today, Focus, Planner, Quests
   - Fitness: Workouts, PRs, Programs
   - Learning: Books, Courses, Flashcards
   - Production: Shortcuts, Arrange, Reference

4. How It Works (3 steps)
   1. Sign in with Google or Microsoft
   2. Complete age verification (16+)
   3. Start earning XP and building streaks

5. Social Proof (optional/future)
   - Stats: "X focus hours logged this week"
   - Testimonials placeholder

6. Footer
   - Links: Privacy, Terms, Contact, Help
   - Copyright
```

---

## Component-Level Specs

### Hero Section

| Element | Spec |
|---------|------|
| Headline | H1, bold, primary text color, centered |
| Subhead | Body text, secondary color, max-width 600px |
| Primary CTA | Solid button, accent color, "Get Started" |
| Secondary CTA | Outline button, "Learn More" |
| Background | Subtle gradient or solid bg-primary |

**States:**
- Default: Both CTAs visible
- Authenticated: Primary CTA changes to "Go to Today"

### Feature Cards

| Element | Spec |
|---------|------|
| Icon | 24x24 SVG, accent color |
| Title | H3, semibold, primary text |
| Description | Body small, secondary text, 2-3 lines max |
| Container | Card with border, radius-lg, hover lift |

**Interactions:**
- Hover: translateY(-2px), border-color change
- Click: Navigate to feature page

### Authentication Flow

| Step | UI State |
|------|----------|
| 1. Landing | Show sign-in options |
| 2. OAuth redirect | Loading spinner |
| 3. Age verification | Date picker, must be 16+ |
| 4. Pending approval | Static message, check back later |
| 5. Approved | Redirect to /today |
| 6. Denied | Error message with contact link |

---

## Bright Pattern Checklist

This checklist audits against known dark patterns. All items must pass.

### Transparency

| Check | Pattern Avoided | Implementation |
|-------|-----------------|----------------|
| [x] | Hidden costs | No paid features; all functionality free |
| [x] | Bait and switch | Feature descriptions match actual functionality |
| [x] | Misdirection | CTAs clearly labeled, no fake buttons |
| [x] | Confirmshaming | No guilt-trip copy on decline actions |

### Consent

| Check | Pattern Avoided | Implementation |
|-------|-----------------|----------------|
| [x] | Forced continuity | No subscriptions, no auto-renewals |
| [x] | Roach motel | Account deletion available in Settings |
| [x] | Privacy zuckering | Minimal data collection, clear privacy policy |
| [x] | Trick questions | Yes means yes, no means no |

### Control

| Check | Pattern Avoided | Implementation |
|-------|-----------------|----------------|
| [x] | Disguised ads | No third-party ads disguised as content |
| [x] | Friend spam | No automatic social sharing |
| [x] | Nagging | Notifications require explicit opt-in |
| [x] | Obstruction | Cancel/delete flows are straightforward |

### Data

| Check | Pattern Avoided | Implementation |
|-------|-----------------|----------------|
| [x] | Sneaking | No pre-checked marketing consent |
| [x] | Data harvesting | Only collect what's needed for features |
| [x] | Immortal accounts | Full data deletion supported |
| [x] | Shadow profiles | No tracking of non-users |

### Gamification Ethics

| Check | Pattern Avoided | Implementation |
|-------|-----------------|----------------|
| [x] | Artificial scarcity | Coins and XP have no real-money value |
| [x] | Variable rewards addiction | Rewards are predictable and transparent |
| [x] | Loss aversion abuse | Streak loss is gentle, recovery available |
| [x] | Social pressure | No public leaderboards by default |

---

## Screen Audit Template

For each new screen, verify:

```markdown
## Screen: [Name]

### Purpose
[What user goal does this serve?]

### Elements
- [ ] All text is clear and jargon-free
- [ ] CTAs describe what happens when clicked
- [ ] No dark patterns from checklist above

### States
- [ ] Loading state shows progress indicator
- [ ] Empty state explains how to get started
- [ ] Error state provides actionable message
- [ ] Success state confirms completed action

### Accessibility
- [ ] Color contrast meets WCAG AA
- [ ] All interactive elements are keyboard-accessible
- [ ] Images have alt text
- [ ] Form fields have labels
```

---

## Database Schema Summary

### Core Tables

```
users                 - User accounts (from Auth.js)
accounts              - OAuth provider links
sessions              - Active sessions
verification_tokens   - Email verification

user_progress         - XP, level, coins, skills
user_settings         - Preferences, theme
```

### Feature Tables

```
focus_sessions        - Completed focus blocks
calendar_events       - Planner entries
quests                - Quest definitions
user_quest_progress   - Quest completion tracking
habits                - Habit definitions
habit_logs            - Daily habit completions
goals                 - Goal definitions
goal_milestones       - Milestone tracking

exercises             - Exercise library
workouts              - Workout templates
workout_sections      - Named sections in workouts
workout_exercises     - Exercises in workouts
workout_sessions      - Logged workout sessions
workout_sets          - Individual set logs
personal_records      - PR tracking

books                 - Book entries
reading_sessions      - Reading session logs

courses               - Learning courses
lessons               - Course lessons
user_lesson_progress  - Lesson completion
flashcard_decks       - Flashcard collections
flashcards            - Individual cards
journal_entries       - Daily journal

rewards               - Market items
reward_purchases      - Purchase history
daily_plans           - Generated daily plans
activity_events       - Event log for XP distribution
notifications         - Push notification queue
infobase_entries      - Knowledge base articles
```

---

## API Route Summary

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/auth/*` | GET, POST | Public | Auth.js handlers |
| `/api/daily-plan` | GET, POST | Required | Daily plan generation |
| `/api/focus` | GET, POST | Required | Focus session management |
| `/api/focus/active` | GET | Required | Current active session |
| `/api/focus/[id]/complete` | POST | Required | Complete a session |
| `/api/focus/[id]/abandon` | POST | Required | Abandon a session |
| `/api/calendar` | GET, POST, PUT, DELETE | Required | Planner events |
| `/api/quests` | GET, POST, PUT, DELETE | Required | Quest CRUD |
| `/api/habits` | GET, POST, PUT, DELETE | Required | Habit CRUD |
| `/api/goals` | GET, POST, PUT, DELETE | Required | Goal CRUD |
| `/api/exercise` | GET, POST | Required | Exercise/workout management |
| `/api/books` | GET, POST, DELETE | Required | Book tracking |
| `/api/learn/*` | Various | Required | Learning suite |
| `/api/progress` | GET, POST | Required | XP and leveling |
| `/api/market` | GET, POST | Required | Rewards |
| `/api/admin/*` | Various | Admin only | Admin functions |
| `/api/infobase` | GET, POST | Required | Knowledge base |
| `/api/analysis` | POST | Required | Audio analysis cache |
| `/api/feedback` | POST | Required | User feedback |

---

## File Structure

```
src/
  app/
    (app)/              # Authenticated routes
      today/            # Dashboard
      focus/            # Focus timer
      planner/          # Calendar
      quests/           # Quest log
      habits/           # Habit tracker
      goals/            # Goal setting
      exercise/         # Workout tracker
      books/            # Book tracker
      progress/         # XP and skills
      market/           # Rewards store
      hub/              # DAW shortcuts
      arrange/          # MIDI editor
      templates/        # Pattern templates
      reference/        # Reference tracks
      infobase/         # Knowledge base
      learn/            # Learning suite
      settings/         # User settings
      admin/            # Admin console
    (mobile)/m/         # Mobile-specific routes
    api/                # API routes
    auth/               # Auth pages
    help/               # Documentation
    about/              # Features page
    privacy/            # Privacy policy
    terms/              # Terms of service
    contact/            # Contact form
  components/
    shell/              # Layout components
    ui/                 # Base components
    player/             # Audio player
    focus/              # Focus components
    progress/           # Progress components
  lib/
    auth/               # Auth configuration
    db/                 # Database repositories
    player/             # Audio player state
    data/               # Static data (shortcuts, exercises)
```

---

## Deployment Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run dev:migrate      # Migrate local D1 + start dev

# Testing
npm run test:unit        # Run Vitest unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run test:all         # Full test suite

# Deployment
npm run deploy           # Build + deploy (quick)
npm run deploy:full      # Test + build + deploy (recommended)
npm run deploy:dry-run   # Build + dry-run deploy

# Database
npm run db:migrate:local # Apply migrations to local D1
npm run db:migrate:prod  # Apply migrations to remote D1
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01-04 | Initial release with core features |

---

*Last updated: January 4, 2026*


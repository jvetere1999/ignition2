# Regression Safety - Ignition

## Surface Area Map

### UI Routes (App Router)

All routes are under the authenticated `(app)` layout group.

| Route | Component | Description | Risk Level |
|-------|-----------|-------------|------------|
| `/today` | TodayGridClient | Main dashboard | High |
| `/quests` | QuestsClient | Quest challenges | Medium |
| `/focus` | FocusClient | Focus timer | High |
| `/habits` | HabitsClient | Habit tracking | Medium |
| `/goals` | GoalsClient | Goal management | Medium |
| `/exercise` | ExerciseClient | Fitness tracking | Medium |
| `/books` | BookTrackerClient | Reading tracker | Low |
| `/market` | MarketClient | Rewards shop | Medium |
| `/ideas` | IdeasClient | Idea capture | Low |
| `/infobase` | InfobaseClient | Knowledge base | Low |
| `/calendar` | CalendarClient | Planning | Low |
| `/progress` | ProgressClient | Skill wheel | Medium |
| `/learn/*` | Various | Learning modules | Medium |
| `/settings` | SettingsClient | User settings | Medium |
| `/arrange` | ArrangeClient | Music arrangement | Low |
| `/stats` | StatsClient | Statistics | Low |
| `/wins` | WinsClient | Achievements | Low |

### API Routes

| Route | Methods | Used By | Risk Level |
|-------|---------|---------|------------|
| `/api/auth/*` | Various | Auth.js | Critical |
| `/api/focus` | GET, POST | FocusClient | High |
| `/api/focus/pause` | GET, POST, DELETE | FocusClient | High |
| `/api/quests` | GET, POST | QuestsClient | Medium |
| `/api/habits` | GET, POST | HabitsClient | Medium |
| `/api/goals` | GET, POST | GoalsClient | Medium |
| `/api/exercise` | GET, POST | ExerciseClient | Medium |
| `/api/books` | GET, POST | BookTrackerClient | Low |
| `/api/market` | GET | MarketClient | Medium |
| `/api/market/purchase` | POST | MarketClient | Medium |
| `/api/ideas` | GET, POST | IdeasClient | Low |
| `/api/infobase` | GET, POST | InfobaseClient | Low |
| `/api/calendar` | GET, POST | CalendarClient | Low |
| `/api/gamification` | GET | Various | Medium |
| `/api/onboarding` | GET, POST | OnboardingModal | Medium |
| `/api/user/settings` | GET, POST | SettingsClient | Medium |
| `/api/learn/*` | Various | LearnClient | Medium |
| `/api/admin/*` | Various | Admin only | Low |

### Workers/Cron/Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| None identified | - | No cron jobs in codebase |

---

## Smoke Test Checklist

### Critical Path (Must Pass)

1. [ ] User can sign in via OAuth
2. [ ] `/today` loads without error
3. [ ] Focus timer can start/pause/complete
4. [ ] Quests display and can be accepted
5. [ ] Market items display and balance shows

### Secondary (Should Pass)

6. [ ] Habits can be created and logged
7. [ ] Goals can be created
8. [ ] Books can be added
9. [ ] Ideas can be captured
10. [ ] Settings can be modified

### Low Priority

11. [ ] Exercise workouts function
12. [ ] Calendar events function
13. [ ] Learn modules function
14. [ ] Infobase entries function

---

## Rollback Plan

### Immediate Rollback

If regressions are detected post-deploy:

1. Revert to previous commit:
   ```bash
   git revert HEAD
   ```

2. Re-deploy:
   ```bash
   npm run deploy:full
   ```

### Database Rollback

This cleanup task does not modify the database schema.
No database rollback is required.

### Feature Flag Rollback

If quarantined features cause issues:

1. Check `docs/feature-flags.md` for flag names
2. Disable flags in environment or code
3. Re-deploy

---

## Risk Assessment

| Area | Risk | Mitigation |
|------|------|------------|
| Dead code removal | Low | Only remove with clear evidence |
| Duplicate extraction | Medium | Test extracted helpers |
| Unused dep removal | Low | Build verification |
| Performance changes | Low | Measure before/after |
| localStorage changes | Medium | Already deprecated |

---

## Validation Requirements

Before merge:
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors, minimize warnings
- [ ] Build: Success
- [ ] Pre/Post screenshots compared
- [ ] Smoke test checklist passed


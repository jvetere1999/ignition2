# Abuse and Regression Guardrails

## Purpose

Enumerate all known abuse, regression, and degeneration risks introduced by the implicit behaviors defined in Prompts 9-12:
- Prompt 9: Today Decision Suppression Logic
- Prompt 10: Default Next Action Resolver
- Prompt 11: Starter Momentum Feedback
- Prompt 12: Action Exit Re-Entry Soft Landing

---

## Section 1: Risk List

### Category A: Exploit Loops

| Risk ID | Risk Name | Description | Source |
|---------|-----------|-------------|--------|
| A1 | Focus Session Resurrection Loop | User abandons focus session but `activeFocusSession` check queries stale data; resolver perpetually returns "Return to Focus" even after abandonment | Prompt 10 (Resolver P1/P2) |
| A2 | Infinite Soft Landing Trap | If `completed_actions_count` fails to increment on completion, every return to Today triggers soft landing mode indefinitely | Prompt 12 (Session State) |
| A3 | Plan Item Cycle | Plan item with invalid `actionUrl` (empty, malformed, or self-referential `/today`) causes resolver to route back to Today, which resolves same item | Prompt 10 (P3 resolution) |
| A4 | Suppression State Oscillation | Rapid toggling between `focus_active` and `!focus_active` due to race condition between session check and UI render causes flickering visibility | Prompt 9 (P1 state) |
| A5 | Momentum Acknowledgment Spam | If `sessionStorage.set` fails silently (quota exceeded, private mode restrictions), acknowledgment triggers on every completion | Prompt 11 (Persistence) |

---

### Category B: Suppression Deadlocks

| Risk ID | Risk Name | Description | Source |
|---------|-----------|-------------|--------|
| B1 | Permanent First Day Lock | User with corrupted `created_at` timestamp (future date, null) perpetually evaluates as `first_day`, hiding DailyPlan and Rewards forever | Prompt 9 (P2 state) |
| B2 | Gap State Lock-In | Clock skew or timezone miscalculation causes `returning_after_gap` to persist beyond 48h window, forcing reduced mode on active user | Prompt 9 (P3 state) |
| B3 | Hidden UI with No Escape | `focus_active` state hides ExploreDrawer entirely; if focus session is orphaned (no UI to complete/abandon), user has no path to full Today | Prompt 9 (Rule 1) |
| B4 | Force Collapsed Without Override | `forceCollapsed` prop prevents user from expanding DailyPlan in reduced mode; if banner dismiss fails, user cannot access plan | Prompt 9 (Rule 3) |
| B5 | Noop Deadlock | Resolver returns `noop` when `currentRoute === resolvedRoute`, but if UI auto-navigates on resolver output, creates infinite noop-resolve cycle | Prompt 10 (P6) |

---

### Category C: Resolver Misfires

| Risk ID | Risk Name | Description | Source |
|---------|-----------|-------------|--------|
| C1 | Stale Plan Resolution | Resolver uses cached `dailyPlan` from previous day; routes user to yesterday's incomplete item with 404 or stale data | Prompt 10 (P3, stale data) |
| C2 | Priority Inversion | All plan items have same priority (e.g., all `priority: 1`); resolution order becomes non-deterministic based on array order, not user intent | Prompt 10 (Edge case) |
| C3 | Break Mode Misfire | User in break mode (`activeFocusSession.mode === "break"`) routed to Focus page, but Focus page expects focus mode; UI state mismatch | Prompt 10 (P1/P2) |
| C4 | Empty User State | `userId` is empty string or undefined; resolver should return noop but may throw or return invalid route | Prompt 10 (Validation) |
| C5 | Paused Session Override | Paused session (P2) overrides urgent plan items (P3); user cannot address critical task without first resuming/abandoning focus | Prompt 10 (Priority order) |

---

### Category D: Persistence Failures

| Risk ID | Risk Name | Description | Source |
|---------|-----------|-------------|--------|
| D1 | sessionStorage Unavailable | Private browsing mode or storage quota exceeded prevents all session state; soft landing, momentum, action count all fail | Prompts 11, 12 |
| D2 | Cross-Tab State Leak | Multiple tabs share sessionStorage; completing action in Tab A prevents momentum acknowledgment in Tab B; user confusion | Prompt 11 (Cross-tab) |
| D3 | State Key Collision | Key names (`momentum_acknowledged`, `completed_actions_count`) collide with other features or future additions | Prompts 11, 12 |
| D4 | Orphaned State on Crash | Browser crash before `completed_actions_count` increment; on restart, state is partially applied (session key set, count not) | Prompt 12 (Lifecycle) |
| D5 | URL Param Persistence | `?from=focus&status=complete` persists in browser history; user navigates back, soft landing re-triggers unexpectedly | Prompt 12 (URL handling) |

---

### Category E: Timing and Race Conditions

| Risk ID | Risk Name | Description | Source |
|---------|-----------|-------------|--------|
| E1 | 30-Second Timer Race | Soft landing 30-second auto-restore fires after user manually expanded section; double-state change causes UI flicker | Prompt 12 (Duration) |
| E2 | Acknowledgment Display Race | Momentum acknowledgment displayed before completion API call returns; API fails, acknowledgment shown for failed action | Prompt 11 (Timing) |
| E3 | Router Navigation Race | `router.push("/today?status=complete")` called before `completed_actions_count` incremented; Today page reads stale count | Prompt 12 (Lifecycle) |
| E4 | State Check vs Render Race | Decision suppression evaluates on server, but client hydration reads different state; server/client visibility mismatch | Prompt 9 (SSR/CSR) |
| E5 | Auto-Dismiss Timer Leak | Momentum acknowledgment 5-second timer not cleared on component unmount; callback fires after navigation, updating unmounted state | Prompt 11 (Dismissal) |

---

### Category F: Data Integrity Risks

| Risk ID | Risk Name | Description | Source |
|---------|-----------|-------------|--------|
| F1 | Clock Manipulation | User sets system clock to manipulate `isFirstDay` or `returning_after_gap` detection; artificial state control | Prompt 9 (Time-based states) |
| F2 | Plan Item Count Mismatch | `dailyPlan.completedCount` differs from actual count of items with `completed: true`; resolver uses wrong completion state | Prompt 10 (Data consistency) |
| F3 | Activity Date Corruption | `last_activity_date` in D1 is null, empty, or invalid ISO string; gap detection fails or throws | Prompt 9 (Data source) |
| F4 | Duplicate Session IDs | Multiple active focus sessions exist in database; resolver picks arbitrary one; completion affects wrong session | Prompt 10 (Session uniqueness) |
| F5 | Action URL Injection | Malicious `actionUrl` in plan item (e.g., `javascript:`, external URL); resolver blindly routes to it | Prompt 10 (Input validation) |

---

## Section 2: Detection Signals

### Observable Signals by Risk Category

#### Category A: Exploit Loops

| Risk ID | Detection Signal | Metric/Log |
|---------|------------------|------------|
| A1 | Resolver returns `focus_return` for user with no active session in DB | Log: `resolver_misfire:focus_return_no_session` |
| A2 | Same user triggers soft landing > 3 times in single browser session | Counter: `soft_landing_triggers_per_session > 3` |
| A3 | Navigation to `/today` followed by immediate navigation to plan item URL in < 500ms, repeating | Log: `rapid_plan_item_cycle` |
| A4 | Visibility state changes > 5 times in 10 seconds | Counter: `visibility_oscillation_rate` |
| A5 | Momentum acknowledgment display count > 1 per session | Counter: `momentum_ack_per_session > 1` |

#### Category B: Suppression Deadlocks

| Risk ID | Detection Signal | Metric/Log |
|---------|------------------|------------|
| B1 | User with `created_at` > 30 days ago still evaluates as `first_day` | Log: `first_day_anomaly:stale_user` |
| B2 | User with activity in last 24h evaluates as `returning_after_gap` | Log: `gap_state_anomaly:recent_activity` |
| B3 | User on Today page with `focus_active` state for > 2 hours without focus page visit | Log: `orphaned_focus_session` |
| B4 | DailyPlanWidget never expanded by user with `forceCollapsed` for > 5 page views | Counter: `force_collapsed_no_expand` |
| B5 | Resolver returns `noop` > 10 consecutive times for same user | Counter: `noop_streak > 10` |

#### Category C: Resolver Misfires

| Risk ID | Detection Signal | Metric/Log |
|---------|------------------|------------|
| C1 | Resolver returns plan item URL for date !== today | Log: `stale_plan_resolution` |
| C2 | Multiple plan items have identical priority in same plan | Log: `priority_collision` |
| C3 | User navigated to Focus page in break mode | Log: `focus_page_break_mode` |
| C4 | Resolver called with empty/null userId | Log: `resolver_invalid_input` |
| C5 | User abandons focus session immediately after resolver P2 routing | Log: `paused_session_abandon_rate` |

#### Category D: Persistence Failures

| Risk ID | Detection Signal | Metric/Log |
|---------|------------------|------------|
| D1 | sessionStorage operation throws error | Log: `session_storage_error` |
| D2 | Multiple tabs report conflicting session state | Log: `cross_tab_state_conflict` |
| D3 | Key read returns unexpected type (object instead of string) | Log: `storage_key_type_error` |
| D4 | Session state keys have inconsistent timestamps (> 1 minute delta) | Log: `orphaned_session_state` |
| D5 | `?status=complete` present on Today page with `completed_actions_count > 1` | Log: `stale_url_param` |

#### Category E: Timing and Race Conditions

| Risk ID | Detection Signal | Metric/Log |
|---------|------------------|------------|
| E1 | Soft landing state changes twice within 500ms | Log: `soft_landing_race` |
| E2 | Momentum acknowledgment shown but action completion fails | Log: `momentum_ack_premature` |
| E3 | `completed_actions_count` increment timestamp after navigation timestamp | Log: `state_navigation_race` |
| E4 | Server-rendered visibility differs from client hydration | Log: `hydration_mismatch:visibility` |
| E5 | Timer callback fires after component unmount | Log: `timer_leak` |

#### Category F: Data Integrity Risks

| Risk ID | Detection Signal | Metric/Log |
|---------|------------------|------------|
| F1 | `isFirstDay` true for user with > 0 activity events | Log: `clock_manipulation_suspected` |
| F2 | `completedCount` !== count of items with `completed: true` | Log: `plan_count_mismatch` |
| F3 | `last_activity_date` parse fails or returns Invalid Date | Log: `invalid_activity_date` |
| F4 | Multiple rows returned for `status = 'active'` focus session query | Log: `duplicate_active_session` |
| F5 | `actionUrl` does not start with `/` or matches blocked pattern | Log: `malicious_action_url` |

---

## Section 3: Kill-Switch Conditions

### Immediate Kill-Switch Triggers

| Condition | Affected Feature | Kill Action |
|-----------|------------------|-------------|
| `soft_landing_triggers_per_session > 5` | Soft Landing Mode | Disable soft landing; show full Today |
| `visibility_oscillation_rate > 10/minute` | Decision Suppression | Fall back to default state (no suppression) |
| `momentum_ack_per_session > 2` | Momentum Feedback | Disable acknowledgment for session |
| `noop_streak > 20` | Resolver | Return fallback `/focus` instead of noop |
| `resolver_misfire:*` count > 10/minute | Resolver | Disable resolver; no auto-navigation |
| `session_storage_error` on any operation | All sessionStorage features | Disable all session-scoped features |

### Threshold-Based Kill-Switch

| Metric | Threshold | Kill Action |
|--------|-----------|-------------|
| `first_day_anomaly:stale_user` rate | > 1% of active users | Disable `first_day` state detection |
| `gap_state_anomaly:recent_activity` rate | > 1% of active users | Disable `returning_after_gap` state detection |
| `orphaned_focus_session` duration | > 4 hours | Auto-expire focus session; clear `focus_active` state |
| `stale_plan_resolution` count | > 100/hour | Disable plan-based resolution; fallback to Focus |
| `hydration_mismatch:visibility` rate | > 5% of page loads | Disable server-side visibility computation |

### Global Kill-Switch

| Condition | Action |
|-----------|--------|
| Any 3 kill-switches triggered within 1 hour | Disable all Prompt 9-12 features; revert to baseline Today |
| Error rate > 5% of Today page loads | Disable all implicit behaviors; show full Today |

---

## Section 4: Risk Severity Matrix

| Risk ID | Probability | Impact | Severity |
|---------|-------------|--------|----------|
| A1 | Medium | High | **Critical** |
| A2 | Low | High | High |
| A3 | Medium | Medium | Medium |
| A4 | Low | Low | Low |
| A5 | Medium | Low | Medium |
| B1 | Low | High | High |
| B2 | Medium | Medium | Medium |
| B3 | Medium | High | **Critical** |
| B4 | Low | Medium | Medium |
| B5 | Low | Low | Low |
| C1 | Medium | Medium | Medium |
| C2 | High | Low | Medium |
| C3 | Low | Medium | Low |
| C4 | Low | High | Medium |
| C5 | Medium | Medium | Medium |
| D1 | Medium | High | High |
| D2 | Medium | Low | Medium |
| D3 | Low | Low | Low |
| D4 | Low | Medium | Low |
| D5 | Medium | Low | Medium |
| E1 | Medium | Low | Low |
| E2 | Low | Medium | Low |
| E3 | Medium | Medium | Medium |
| E4 | Low | High | Medium |
| E5 | Medium | Low | Low |
| F1 | Low | Low | Low |
| F2 | Medium | Medium | Medium |
| F3 | Low | Medium | Low |
| F4 | Low | High | Medium |
| F5 | Low | High | Medium |

### Critical Risks (Require Immediate Monitoring)

1. **A1 - Focus Session Resurrection Loop**: Can trap user in infinite "Return to Focus" state
2. **B3 - Hidden UI with No Escape**: Can lock user out of Today functionality entirely

---

## Section 5: Monitoring Requirements

### Required Metrics

| Metric Name | Source | Retention |
|-------------|--------|-----------|
| `resolver_output_type` | Resolver function | 7 days |
| `visibility_state` | Decision Suppression | 7 days |
| `soft_landing_triggered` | Soft Landing | 7 days |
| `momentum_ack_shown` | Momentum Feedback | 7 days |
| `session_storage_error` | Client error handler | 30 days |
| `state_transition` | State machine | 7 days |

### Required Logs

| Log Event | Severity | Fields |
|-----------|----------|--------|
| `resolver_misfire:*` | ERROR | userId, input, output, expected |
| `state_anomaly:*` | WARN | userId, state, actual, expected |
| `kill_switch_triggered` | CRITICAL | feature, reason, threshold |
| `session_storage_error` | ERROR | operation, key, error |
| `hydration_mismatch:*` | WARN | component, server, client |

---

## Appendix: Feature-to-Risk Mapping

| Feature (Prompt) | Risk IDs |
|------------------|----------|
| Decision Suppression (9) | A4, B1, B2, B3, B4, E4, F1, F3 |
| Resolver (10) | A1, A3, B5, C1, C2, C3, C4, C5, F2, F4, F5 |
| Momentum Feedback (11) | A5, D1, D2, D3, E2, E5 |
| Soft Landing (12) | A2, D1, D4, D5, E1, E3 |


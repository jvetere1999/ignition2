# Rollout Plan - Starter Engine

**Version:** 1.0
**Date:** January 5, 2026
**Status:** Ready for Execution

---

## Overview

This document defines the phased rollout strategy for the Today Starter Engine features. Each feature is gated by a flag and can be enabled/disabled independently.

---

## Rollout Phases

### Phase R0: Baseline Deploy (Day 0)

**Objective:** Deploy code with all flags OFF

**Actions:**
1. Deploy to production with default flag configuration
2. Verify classic Today behavior
3. Monitor for any regressions

**Duration:** 24 hours minimum

**Success Criteria:**
- No increase in error rates
- No user complaints
- All existing features work

**Rollback:** Revert commit if issues detected

---

### Phase R1: Master Switch Enable (Day 1-2)

**Objective:** Enable master switch only, verify no behavior change

**Flag Changes:**
```toml
FLAG_TODAY_FEATURES_MASTER = "1"
```

**Expected Behavior:**
- No visible changes (other flags still OFF)
- Infrastructure ready for feature activation

**Monitoring:**
- Error rates
- Page load times
- API response times

**Duration:** 24-48 hours

**Success Criteria:**
- No performance degradation
- No errors related to flag system

**Rollback:** Set `FLAG_TODAY_FEATURES_MASTER = "0"`

---

### Phase R2: Decision Suppression (Day 3-5)

**Objective:** Enable state-driven visibility rules

**Flag Changes:**
```toml
FLAG_TODAY_FEATURES_MASTER = "1"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "1"
```

**Expected Behavior:**
- Today sections collapse based on user state
- First-day users see simplified view
- Focus-active users see limited choices

**Monitoring:**
- Today page engagement
- Navigation patterns
- User feedback channels

**Duration:** 48-72 hours

**Success Criteria:**
- No navigation dead-ends
- Users can still access all features
- Safety net prevents all-hidden state

**Rollback:** Set `FLAG_TODAY_DECISION_SUPPRESSION_V1 = "0"`

---

### Phase R3: Next Action Resolver (Day 6-7)

**Objective:** Enable deterministic CTA in StarterBlock

**Flag Changes:**
```toml
FLAG_TODAY_FEATURES_MASTER = "1"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "1"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "1"
```

**Expected Behavior:**
- StarterBlock shows single dominant CTA
- CTA determined by plan status -> focus -> fallback
- Consistent behavior across sessions

**Monitoring:**
- StarterBlock click rates
- Action completion rates
- Resolver fallback frequency

**Duration:** 24-48 hours

**Success Criteria:**
- Resolver outputs valid CTAs
- No broken links
- Fallback triggers appropriately

**Rollback:** Set `FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "0"`

---

### Phase R4: Reduced Mode (Day 8-10)

**Objective:** Enable 48-hour gap detection

**Flag Changes:**
```toml
FLAG_TODAY_FEATURES_MASTER = "1"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "1"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "1"
FLAG_TODAY_REDUCED_MODE_V1 = "1"
```

**Expected Behavior:**
- Users returning after 48h see "Welcome back" banner
- Simplified choice surface
- Dismiss button clears for session

**Monitoring:**
- Banner display rates
- Dismiss rates
- Re-engagement after gap

**Duration:** 48-72 hours

**Success Criteria:**
- Correct gap detection
- No false positives for active users
- Dismiss works correctly

**Rollback:** Set `FLAG_TODAY_REDUCED_MODE_V1 = "0"`

---

### Phase R5: Momentum Feedback (Day 11-12)

**Objective:** Enable first-completion acknowledgment

**Flag Changes:**
```toml
FLAG_TODAY_FEATURES_MASTER = "1"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "1"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "1"
FLAG_TODAY_REDUCED_MODE_V1 = "1"
FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "1"
```

**Expected Behavior:**
- "Good start." banner after first completion
- Shows once per session
- Non-intrusive placement

**Monitoring:**
- Banner display frequency
- Session length after banner
- User sentiment

**Duration:** 24-48 hours

**Success Criteria:**
- Shows exactly once per session
- Correct trigger (completion, not page load)
- Dismiss persists for session

**Rollback:** Set `FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "0"`

---

### Phase R6: Soft Landing (Day 13-14)

**Objective:** Enable post-action reduced mode

**Flag Changes:**
```toml
FLAG_TODAY_FEATURES_MASTER = "1"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "1"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "1"
FLAG_TODAY_REDUCED_MODE_V1 = "1"
FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "1"
FLAG_TODAY_SOFT_LANDING_V1 = "1"
```

**Expected Behavior:**
- After focus complete/abandon, Today shows fewer choices
- Prevents re-entry overwhelm
- Session-only persistence

**Monitoring:**
- Post-action engagement
- Second action rates
- User navigation patterns

**Duration:** 48 hours

**Success Criteria:**
- Triggers on completion/abandonment
- Does not persist across sessions
- Normal view restorable

**Rollback:** Set `FLAG_TODAY_SOFT_LANDING_V1 = "0"`

---

### Phase R7: Dynamic UI (Day 15+)

**Objective:** Enable usage-based personalization

**Flag Changes:**
```toml
FLAG_TODAY_FEATURES_MASTER = "1"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "1"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "1"
FLAG_TODAY_REDUCED_MODE_V1 = "1"
FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "1"
FLAG_TODAY_SOFT_LANDING_V1 = "1"
FLAG_TODAY_DYNAMIC_UI_V1 = "1"
```

**Expected Behavior:**
- Quick picks based on 14-day usage
- Resume last activity link
- Interest primers for frequent learners

**Monitoring:**
- Quick pick click rates
- Resume engagement
- Query performance

**Duration:** Ongoing

**Success Criteria:**
- Personalization matches usage
- New users see appropriate fallbacks
- No performance degradation

**Rollback:** Set `FLAG_TODAY_DYNAMIC_UI_V1 = "0"`

---

## Observation Guidelines

### Metrics to Watch

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | Cloudflare Analytics | > 1% |
| Page Load Time | Cloudflare Analytics | > 3s p95 |
| API Latency | Cloudflare Analytics | > 500ms p95 |
| Auth Failures | D1 logs | > 5/hour |
| Safety Net Triggers | Application logs | > 10/day |

### User Feedback Channels

- In-app feedback (if exists)
- Support email
- Community forums
- Direct observation

### Red Flags (Immediate Rollback)

- [ ] 500 errors on Today page
- [ ] Auth loop or failure
- [ ] Blank/broken Today UI
- [ ] All CTAs hidden despite safety net
- [ ] Significant user complaints

---

## Rollback Decision Matrix

| Severity | Symptoms | Action |
|----------|----------|--------|
| Low | Minor UI glitch, isolated | Note for fix, continue |
| Medium | Feature misbehavior, workaround exists | Disable specific flag |
| High | Core flow broken, no workaround | Disable master switch |
| Critical | Site down, auth broken | Full revert |

---

## Communication Plan

### Internal

- Slack notification at each phase transition
- Daily status update during rollout
- Incident channel for issues

### External (if needed)

- Status page update for major issues
- Email for significant changes

---

## Timeline Summary

| Day | Phase | Flags Enabled |
|-----|-------|---------------|
| 0 | R0 - Baseline | None |
| 1-2 | R1 - Master | MASTER |
| 3-5 | R2 - Suppression | + SUPPRESSION |
| 6-7 | R3 - Resolver | + RESOLVER |
| 8-10 | R4 - Reduced | + REDUCED_MODE |
| 11-12 | R5 - Momentum | + MOMENTUM |
| 13-14 | R6 - Soft Landing | + SOFT_LANDING |
| 15+ | R7 - Dynamic UI | + DYNAMIC_UI |

---

## Completion Criteria

Full rollout complete when:

- [ ] All 7 flags enabled
- [ ] 7 days stable with all flags
- [ ] No critical issues
- [ ] User feedback positive/neutral
- [ ] Performance within bounds

---

*Rollout Plan for Phase 8.2 - Starter Engine*


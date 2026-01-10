# Performance Optimization Plan

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Ready for Implementation

---

## Table of Contents

1. [Baseline Assumptions](#1-baseline-assumptions)
2. [Top 10 Optimizations](#2-top-10-optimizations)
3. [Staged Rollout Sequence](#3-staged-rollout-sequence)
4. [Regression Checklist](#4-regression-checklist)

---

## 1. Baseline Assumptions

### 1.1 Current Performance Characteristics

Based on PERF.md and code analysis:

| Metric | Current State | Target |
|--------|---------------|--------|
| Worker CPU time | <50ms (optimized) | <50ms (maintain) |
| Today page SSR | ~100-200ms | <100ms |
| Today page TTI | ~500-800ms | <400ms |
| Route transitions | ~200-400ms | <200ms |
| D1 queries per Today load | 2-3 (auth, user, gap check) | 1-2 |
| Client hydration payload | TBD (measure) | Reduce 20% |

### 1.2 Measurement Tools

| Tool | Use Case | How to Access |
|------|----------|---------------|
| `x-perf-debug=1` header | Server-Timing breakdown | Add header to requests |
| Chrome DevTools Performance | Client-side TTI, LCP, CLS | F12 -> Performance tab |
| Chrome DevTools Network | Waterfall, payload sizes | F12 -> Network tab |
| Lighthouse | Core Web Vitals | F12 -> Lighthouse tab |
| Wrangler tail | Worker CPU time | `wrangler tail --format=json` |
| D1 console | Query execution time | Cloudflare Dashboard -> D1 |

### 1.3 Key Pages to Measure

| Page | Priority | Reason |
|------|----------|--------|
| `/today` | Critical | Landing page, most frequent |
| `/focus` | High | Timer needs fast interaction |
| `/quests` | Medium | List rendering |
| `/habits` | Medium | List rendering |
| `/learn` | Medium | Sub-routes |

### 1.4 Current Architecture Strengths

Already optimized (from PERF.md):
- Request-level memoization via `createAPIHandler`
- Middleware route matching uses Set for O(1) lookup
- Parallelized D1 queries in `/api/quests` and `/api/habits`
- `FocusStateContext` deduplicates focus polling
- `useAutoRefresh` with visibility-aware staleness

---

## 2. Top 10 Optimizations

### Rank 1: Prefetch Daily Plan in Today Server Component

**Problem:** Today page makes client-side fetch for daily plan after hydration, causing layout shift and delayed content.

**Solution:** Fetch daily plan server-side in `page.tsx` and pass as props to `TodayGridClient`.

**Expected Impact:** HIGH
- Eliminates 1 client-side fetch
- Reduces TTI by ~100-200ms
- Eliminates layout shift for plan section

**Effort:** Medium (2-4 hours)

**Risk:** Low
- Same data, different fetch location
- Fallback: Pass null, client fetches as before

**Measurement:**
- Before/after: Network tab waterfall for `/api/daily-plan`
- Before/after: LCP on Today page
- Before/after: CLS score

**Implementation:**
```typescript
// In page.tsx
const plan = await getDailyPlan(db, dbUser.id);

return (
  <TodayGridClient
    initialPlan={plan}
    // ...existing props
  />
);
```

---

### Rank 2: Lazy Load ExploreDrawer Action Cards

**Problem:** All 12 action cards render immediately even when collapsed, adding to hydration payload.

**Solution:** Render action cards only when ExploreDrawer is expanded.

**Expected Impact:** MEDIUM-HIGH
- Reduces initial render tree by ~30%
- Faster hydration
- Smaller initial JS bundle execution

**Effort:** Low (1-2 hours)

**Risk:** Low
- First expand has slight delay
- Mitigate: Preload on hover

**Measurement:**
- Before/after: React Profiler render time
- Before/after: Hydration time in Performance tab

**Implementation:**
```typescript
// In ExploreDrawer
{isExpanded && (
  <div className={styles.actions}>
    {/* action cards */}
  </div>
)}
```

---

### Rank 3: Inline Critical CSS for Today Page

**Problem:** CSS Modules load after JS, causing FOUC potential.

**Solution:** Extract critical CSS for Today page and inline in `<head>`.

**Expected Impact:** MEDIUM
- Faster first contentful paint
- Reduced render-blocking resources

**Effort:** Medium (3-4 hours)

**Risk:** Low
- No functionality change
- Build-time extraction

**Measurement:**
- Before/after: FCP in Lighthouse
- Before/after: Render-blocking resources count

---

### Rank 4: Consolidate Today Server-Side Queries

**Problem:** Today page makes separate calls for auth, ensureUserExists, and isReturningAfterGap.

**Solution:** Combine into single optimized query returning all needed user state.

**Expected Impact:** MEDIUM
- Reduces D1 round trips from 3 to 1
- Faster server response

**Effort:** Medium (2-3 hours)

**Risk:** Low
- Same data, combined query
- Add index if needed

**Measurement:**
- Before/after: Server-Timing breakdown
- D1 query count in Cloudflare dashboard

**Implementation:**
```sql
-- Combined query
SELECT 
  id, name, email, last_activity_at,
  (julianday('now') - julianday(last_activity_at)) * 24 > 48 as returning_after_gap
FROM users 
WHERE id = ?
```

---

### Rank 5: Add D1 Index for Daily Plan Lookup

**Problem:** Daily plan query may not use optimal index for user_id + date combination.

**Solution:** Add composite index on `(user_id, date)` for daily_plans table.

**Expected Impact:** MEDIUM
- Faster daily plan queries
- Reduced D1 CPU time

**Effort:** Low (migration file only)

**Risk:** Very Low
- Index creation is non-destructive
- No code changes

**Measurement:**
- Before/after: D1 query time for daily plan
- EXPLAIN QUERY PLAN output

**Implementation:**
```sql
-- Migration 0014
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date 
ON daily_plans(user_id, date);
```

---

### Rank 6: Deduplicate SVG Icons via Sprite

**Problem:** Same SVG icons repeated inline across Today action cards (~12 icons, ~50 lines each).

**Solution:** Create SVG sprite and use `<use>` references.

**Expected Impact:** MEDIUM
- Reduces HTML payload by ~2-3KB
- Faster parsing
- Better caching

**Effort:** Medium (3-4 hours)

**Risk:** Low
- Visual parity check needed
- No functionality change

**Measurement:**
- Before/after: Document size in Network tab
- Before/after: DOM node count

---

### Rank 7: Memoize Flag Checks Per Request

**Problem:** Feature flag functions called multiple times per render (visibility, components, etc.).

**Solution:** Memoize flag values per request in server components.

**Expected Impact:** LOW-MEDIUM
- Reduces process.env access overhead
- Cleaner code

**Effort:** Low (1 hour)

**Risk:** Very Low
- Same values, cached

**Measurement:**
- Before/after: Server-Timing with flag access instrumented

**Implementation:**
```typescript
// In page.tsx
const flags = {
  decisionSuppression: isTodayDecisionSuppressionEnabled(),
  reducedMode: isTodayReducedModeEnabled(),
  // ...
};
// Pass to functions instead of re-checking
```

---

### Rank 8: Preconnect to D1 on App Shell Mount

**Problem:** First D1 query in session has connection overhead.

**Solution:** Add preconnect/prefetch hints for D1 endpoint (if exposed) or warm connection on shell mount.

**Expected Impact:** LOW-MEDIUM
- Faster first DB query
- Reduced perceived latency

**Effort:** Medium (investigation needed)

**Risk:** Low
- Cloudflare D1 connection pooling may already handle this
- May not be applicable

**Measurement:**
- Before/after: First API call timing after login

---

### Rank 9: Code-Split StarterBlock and MomentumBanner

**Problem:** StarterBlock includes resolver logic even when not used.

**Solution:** Dynamic import StarterBlock and MomentumBanner.

**Expected Impact:** LOW
- Smaller initial bundle
- Faster parse time

**Effort:** Low (1-2 hours)

**Risk:** Low
- Components load on demand
- Add loading fallback

**Measurement:**
- Before/after: Main bundle size
- Before/after: Coverage report in DevTools

**Implementation:**
```typescript
const StarterBlock = dynamic(() => import('./StarterBlock'), {
  loading: () => <StarterBlockSkeleton />,
});
```

---

### Rank 10: Add Cache-Control Headers for Static Assets

**Problem:** May not have optimal caching for static assets.

**Solution:** Ensure Cloudflare caching rules are set for /_next/static/* and public/*.

**Expected Impact:** LOW
- Faster repeat visits
- Reduced bandwidth

**Effort:** Low (wrangler.toml config)

**Risk:** Very Low
- Standard practice

**Measurement:**
- Before/after: Cache-Control headers in Network tab
- Before/after: Repeat visit load time

---

## Summary Table

| Rank | Optimization | Impact | Effort | Risk |
|------|--------------|--------|--------|------|
| 1 | Prefetch Daily Plan server-side | HIGH | Medium | Low |
| 2 | Lazy load ExploreDrawer cards | MEDIUM-HIGH | Low | Low |
| 3 | Inline critical CSS | MEDIUM | Medium | Low |
| 4 | Consolidate Today queries | MEDIUM | Medium | Low |
| 5 | Add daily_plans composite index | MEDIUM | Low | Very Low |
| 6 | SVG icon sprite | MEDIUM | Medium | Low |
| 7 | Memoize flag checks | LOW-MEDIUM | Low | Very Low |
| 8 | Preconnect to D1 | LOW-MEDIUM | Medium | Low |
| 9 | Code-split StarterBlock | LOW | Low | Low |
| 10 | Cache-Control headers | LOW | Low | Very Low |

---

## 3. Staged Rollout Sequence

### Stage 1: Quick Wins (Week 1)

**Optimizations:** #5, #7, #10

**Scope:**
- Add daily_plans index (migration)
- Memoize flag checks in Today page
- Verify/add Cache-Control headers

**Validation:**
- Migration applies without error
- D1 query plan uses new index
- Cache headers present in responses

**Rollback:** Remove migration, revert flag memoization

---

### Stage 2: Server-Side Improvements (Week 2)

**Optimizations:** #1, #4

**Scope:**
- Prefetch daily plan in Today server component
- Consolidate user state queries

**Validation:**
- Today page loads plan without client fetch
- Server-Timing shows reduced query count
- No functionality regression

**Rollback:** Pass null for initialPlan, revert query consolidation

---

### Stage 3: Client-Side Improvements (Week 3)

**Optimizations:** #2, #9

**Scope:**
- Lazy load ExploreDrawer content
- Code-split StarterBlock and MomentumBanner

**Validation:**
- React Profiler shows reduced initial render
- Bundle analyzer shows split chunks
- No visual regression

**Rollback:** Remove lazy loading, revert dynamic imports

---

### Stage 4: Asset Optimization (Week 4)

**Optimizations:** #3, #6

**Scope:**
- Inline critical CSS for Today
- Create and use SVG sprite

**Validation:**
- FCP improves in Lighthouse
- Document size reduced
- Visual parity maintained

**Rollback:** Revert CSS inlining, revert to inline SVGs

---

### Stage 5: Exploratory (Week 5+)

**Optimizations:** #8

**Scope:**
- Investigate D1 connection warming
- Measure impact

**Validation:**
- First query timing comparison

**Rollback:** Remove if no measurable benefit

---

## 4. Regression Checklist

### Pre-Optimization Baseline

```
[ ] Record Today page LCP: _____ms
[ ] Record Today page TTI: _____ms
[ ] Record Today page CLS: _____
[ ] Record /api/daily-plan response time: _____ms
[ ] Record Today D1 query count: _____
[ ] Record main bundle size: _____KB
[ ] Record document size: _____KB
[ ] Screenshot Today page (light mode)
[ ] Screenshot Today page (dark mode)
```

### Per-Optimization Validation

```
[ ] Build passes: npm run build
[ ] Unit tests pass: npm run test:unit
[ ] E2E tests pass: npm run test:e2e
[ ] No console errors on Today page
[ ] No console errors on Focus page
[ ] Visual comparison: no regressions
[ ] Mobile layout: no regressions
[ ] Dark mode: no regressions
```

### Post-Optimization Measurement

```
[ ] Record Today page LCP: _____ms (target: <100ms improvement)
[ ] Record Today page TTI: _____ms (target: <100ms improvement)
[ ] Record Today page CLS: _____ (target: <0.1)
[ ] Record /api/daily-plan response time: _____ms
[ ] Record Today D1 query count: _____
[ ] Record main bundle size: _____KB
[ ] Record document size: _____KB
```

### Functionality Checks

```
[ ] Today: Greeting displays correctly
[ ] Today: Daily plan generates/completes
[ ] Today: StarterBlock CTA works
[ ] Today: ExploreDrawer expand/collapse works
[ ] Today: MomentumBanner appears after completion
[ ] Today: Reduced mode triggers correctly
[ ] Focus: Timer starts/pauses/completes
[ ] Focus: Session saves to database
[ ] Quests: List loads correctly
[ ] Habits: List loads correctly
[ ] Navigation: All sidebar links work
[ ] Auth: Login/logout works
```

### Performance Regression Gates

| Metric | Maximum Allowed Regression |
|--------|---------------------------|
| LCP | +50ms |
| TTI | +100ms |
| CLS | +0.05 |
| Bundle size | +10KB |
| D1 query count | +1 |

If any metric regresses beyond threshold, investigate before merging.

---

## Appendix A: Measurement Commands

### Lighthouse CLI

```bash
# Install if needed
npm install -g lighthouse

# Run audit
lighthouse https://passion-os.ecent.online/today \
  --output=json \
  --output-path=.tmp/lighthouse-today.json \
  --chrome-flags="--headless"

# View results
cat .tmp/lighthouse-today.json | jq '.categories.performance.score'
```

### Bundle Analysis

```bash
# Analyze bundle
ANALYZE=true npm run build > .tmp/analyze.log 2>&1

# Or use next-bundle-analyzer if installed
```

### Server Timing

```bash
# Get server timing breakdown
curl -H "x-perf-debug: 1" https://passion-os.ecent.online/api/daily-plan \
  -D - 2>&1 | grep -i server-timing
```

### D1 Query Analysis

```sql
-- In Cloudflare D1 console
EXPLAIN QUERY PLAN
SELECT * FROM daily_plans WHERE user_id = ? AND date = ?;
```

---

## Appendix B: Key Files Reference

| File | Performance Relevance |
|------|----------------------|
| `src/app/(app)/today/page.tsx` | Today SSR entry point |
| `src/app/(app)/today/TodayGridClient.tsx` | Today client hydration |
| `src/app/(app)/today/DailyPlan.tsx` | Daily plan fetch |
| `src/app/(app)/today/StarterBlock.tsx` | Starter CTA |
| `src/app/(app)/today/ExploreDrawer.tsx` | Action cards |
| `src/lib/perf/api-handler.ts` | API route wrapper |
| `src/lib/flags.ts` | Feature flag checks |
| `src/middleware.ts` | Route protection |
| `PERF.md` | Performance documentation |

---

**End of Document**


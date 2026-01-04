# Performance Optimization: Cloudflare Worker CPU Time
- [ ] CPU time within Cloudflare limits
- [ ] No security regressions
- [ ] Real-time sync preserved (see SYNC.md)
- [ ] Auth flows unchanged
- [ ] All E2E tests pass
- [ ] All unit tests pass

## Validation Checklist

---

3. Feature flags can disable new caching layers
2. All optimizations are additive; no existing behavior removed
1. Revert to `main` branch

## Rollback Plan

---

| Client calls/min | TBD | TBD | TBD |
| API p95 | TBD | TBD | TBD |
| Auth time | TBD | TBD | TBD |
| Middleware CPU | TBD | TBD | TBD |
|--------|--------|-------|-------------|
| Metric | Before | After | Improvement |

## After Metrics (TBD)

---

- `upstream_call_count`
- `total_ms`
- `render_ms` (SSR)
- `data_fetch_ms_total`
- `auth_verify_ms`
- `auth_parse_ms`
- `middleware_total_ms`

### Metrics Collected

- Detailed timing in response (if JSON)
- `Server-Timing` header with breakdown
When present, responses include:

### Header: `x-perf-debug=1`

## Instrumentation

---

3. Add ETag/If-None-Match for delta fetching
2. Add visibility-based pause for polling
1. Deduplicate focus session polling (BottomBar + FocusIndicator)

### Phase 4: Client-Side Call Reduction

3. Batch related queries where semantically safe
2. Add request-level fetch deduplication
1. Parallelize independent DB queries

### Phase 3: API Route Optimization

3. Defer session verification when possible (without security impact)
2. Cache parsed URL/cookies
1. Precompile route patterns (avoid runtime regex creation)

### Phase 2: Middleware Optimization

4. Memoize `ensureUserExists()` per user per request
3. Memoize `getCloudflareContext()` per request
2. Memoize `auth()` result per request
1. Create `lib/edge/request-context.ts` for request-scoped caching

### Phase 1: Request-Level Memoization

## Optimization Plan

---

5. **Today/DailyPlan** - Fetches daily plan on mount
4. **PlannerClient** - 30s polling for events
3. **FocusIndicator** - 30s polling for focus session (duplicate!)
2. **BottomBar** - 30s polling for focus session
1. **AppShell** - TOS check on mount (`/api/auth/accept-tos`)

### High-Call Pages (Client-Side)

4. **No request-level memoization** - Same data fetched multiple times per request
3. **Repeated `ensureUserExists()` calls** - Every API route after auth
2. **Repeated `getCloudflareContext()` calls** - Every API route
1. **Repeated `auth()` calls** - Every middleware hit + every API route calls auth()

### Phase 0: Architecture Analysis

## Identified Hotspots

---

| API response p95 | <100ms | User experience |
| Middleware overhead | <5ms | Per-request |
| Auth verification | <10ms | Critical path |
| Total request CPU | <50ms | Cloudflare Worker limit |
|--------|--------|-----------|
| Metric | Target | Rationale |

### Target Metrics

| Client fetch count/min | TBD | On Today page |
| SSR render time | TBD | Key pages |
| Average API response | TBD | p50/p95 |
| Auth parse/verify time | TBD | Session callback |
| Middleware CPU time | TBD | With x-perf-debug=1 |
|--------|-------|-------|
| Metric | Value | Notes |

### Pre-Optimization (TBD)

## Baseline Metrics

---

| Storage events | Cross-tab paused state sync | Real-time |
| localStorage sync | Focus paused state, timer settings | On change |
| 30s Polling | Planner events | 30,000ms |
| 30s Polling | Focus session (BottomBar, FocusIndicator) | 30,000ms |
|-----------|-------|----------|
| Mechanism | Usage | Interval |

### Real-Time Sync Mechanisms

   - Most data fetching delegated to client components
   - Protected pages call `auth()` in server component
3. **SSR Pages** (`src/app/(app)/*/page.tsx`)

   - Common pattern: `auth()` -> `ensureUserExists()` -> DB operations
   - Each route calls `getCloudflareContext()` for D1 access
   - All routes call `auth()` for session
2. **API Routes** (`src/app/api/`)

   - Redirects for unauthenticated users
   - Session check via `auth()` on every non-public request
   - Route protection for authenticated routes
1. **Middleware** (`src/middleware.ts`)

### Entry Points

- **Auth:** Auth.js (NextAuth v5) with D1 adapter
- **Storage:** Cloudflare R2 (planned, not active)
- **Database:** Cloudflare D1 (SQLite)
- **Framework:** Next.js 16 + React 19
- **Platform:** Cloudflare Workers via OpenNext
### Runtime Environment

## Architecture Summary

---

**Date Started:** 2026-01-04
**Branch:** `perf/cf-cpu-realtime`

This document tracks the performance optimization work to eliminate Cloudflare Worker CPU time overruns ("CPU worker response time exceeded") while maintaining full functionality and real-time cross-device synchronization semantics.

## Overview



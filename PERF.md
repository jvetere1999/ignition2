# Performance Optimization: Cloudflare Worker CPU Time

## Overview

This document tracks the performance optimization work to eliminate Cloudflare Worker CPU time overruns ("CPU worker response time exceeded") while maintaining full functionality and real-time cross-device synchronization semantics.

**Branch:** `perf/cf-cpu-realtime`
**Date Started:** 2026-01-04

---

## Architecture Summary

### Runtime Environment
- **Platform:** Cloudflare Workers via OpenNext
- **Framework:** Next.js 16 + React 19
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 (planned, not active)
- **Auth:** Auth.js (NextAuth v5) with D1 adapter

### Entry Points

1. **Middleware** (`src/middleware.ts`)
   - Route protection for authenticated routes
   - Session check via `auth()` on every non-public request
   - Redirects for unauthenticated users

2. **API Routes** (`src/app/api/`)
   - All routes call `auth()` for session
   - Each route calls `getCloudflareContext()` for D1 access
   - Common pattern: `auth()` -> `ensureUserExists()` -> DB operations

3. **SSR Pages** (`src/app/(app)/*/page.tsx`)
   - Protected pages call `auth()` in server component
   - Most data fetching delegated to client components

### Real-Time Sync Mechanisms

| Mechanism | Usage | Interval |
|-----------|-------|----------|
| 30s Polling | Focus session (BottomBar, FocusIndicator) | 30,000ms |
| 30s Polling | Planner events | 30,000ms |
| localStorage sync | Focus paused state, timer settings | On change |
| Storage events | Cross-tab paused state sync | Real-time |

---

## Baseline Metrics

### Pre-Optimization (TBD)

| Metric | Value | Notes |
|--------|-------|-------|
| Middleware CPU time | TBD | With x-perf-debug=1 |
| Auth parse/verify time | TBD | Session callback |
| Average API response | TBD | p50/p95 |
| SSR render time | TBD | Key pages |
| Client fetch count/min | TBD | On Today page |

### Target Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Total request CPU | <50ms | Cloudflare Worker limit |
| Auth verification | <10ms | Critical path |
| Middleware overhead | <5ms | Per-request |
| API response p95 | <100ms | User experience |

---

## Identified Hotspots

### Phase 0: Architecture Analysis

1. **Repeated `auth()` calls** - Every middleware hit + every API route calls auth()
2. **Repeated `getCloudflareContext()` calls** - Every API route
3. **Repeated `ensureUserExists()` calls** - Every API route after auth
4. **No request-level memoization** - Same data fetched multiple times per request

### High-Call Pages (Client-Side)

1. **AppShell** - TOS check on mount (`/api/auth/accept-tos`)
2. **BottomBar** - 30s polling for focus session
3. **FocusIndicator** - 30s polling for focus session (duplicate!)
4. **PlannerClient** - 30s polling for events
5. **Today/DailyPlan** - Fetches daily plan on mount

---

## Optimization Plan

### Phase 1: Request-Level Memoization [DONE]

1. Created `lib/perf/request-context.ts` for request-scoped caching
2. Created `lib/perf/api-handler.ts` with `createAPIHandler` wrapper
3. Memoizes auth(), getCloudflareContext(), and ensureUserExists() per request
4. Adds Server-Timing headers when x-perf-debug=1

### Phase 2: Middleware Optimization [DONE]

1. Precompiled route patterns using Set for O(1) exact match lookup
2. Added prefix array for prefix matching
3. Early bailout for public routes (skip auth() call)
4. Added timing instrumentation in middleware

### Phase 3: API Route Optimization [DONE]

Refactored hot API routes to use createAPIHandler:

| Route | Optimization |
|-------|--------------|
| `/api/focus/active` | Single auth + context + user lookup |
| `/api/focus` | Single auth + context, merged GET/POST |
| `/api/focus/pause` | Single auth + context |
| `/api/daily-plan` | Single auth + context |
| `/api/auth/accept-tos` | Single auth + context |
| `/api/quests` | Parallelized 2 DB queries |
| `/api/habits` | Parallelized 3 DB queries |

### Phase 4: Client-Side Call Reduction [IN PROGRESS]

1. Created FocusStateContext for deduplicating focus session polling
2. BottomBar and FocusIndicator to share single polling source
3. Add visibility-based pause for non-critical polling
4. Add ETag/If-None-Match for delta fetching (future)

---

## Instrumentation

### Header: `x-perf-debug=1`

When present, responses include:
- `Server-Timing` header with breakdown
- Detailed timing in response (if JSON)

### Metrics Collected

- `middleware_total_ms`
- `auth_parse_ms`
- `auth_verify_ms`
- `data_fetch_ms_total`
- `render_ms` (SSR)
- `total_ms`
- `upstream_call_count`

---

## After Metrics (TBD)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Middleware CPU | TBD | TBD | TBD |
| Auth time | TBD | TBD | TBD |
| API p95 | TBD | TBD | TBD |
| Client calls/min | TBD | TBD | TBD |

---

## Rollback Plan

1. Revert to `main` branch
2. All optimizations are additive; no existing behavior removed
3. Feature flags can disable new caching layers

---

## Validation Checklist

- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Auth flows unchanged
- [ ] Real-time sync preserved (see SYNC.md)
- [ ] No security regressions
- [ ] CPU time within Cloudflare limits


# Stateless Sync Implementation

**Date**: 2025-01-20  
**Status**: Complete

## Overview

This implementation adds lightweight polling endpoints for UI optimization data. Following the principle: "the only things that can be retained in browser memory are things that make the UI faster."

## Architecture

### Backend Endpoints (`/api/sync/*`)

| Endpoint | Data | Purpose |
|----------|------|---------|
| `GET /api/sync/poll` | All data combined | Single request for polling |
| `GET /api/sync/progress` | XP, level, coins, streak | Gamification HUD |
| `GET /api/sync/badges` | Unread counts | Navigation badges |
| `GET /api/sync/focus-status` | Active session | Focus indicator |
| `GET /api/sync/plan-status` | Plan completion | Daily plan progress |

**Features:**
- Parallel database queries via `tokio::try_join!`
- ETag generation for conditional requests
- `Cache-Control: no-store` (no CDN caching)
- Returns `200 OK` even for missing data (graceful defaults)

### Frontend Context (`SyncStateContext`)

Location: `app/frontend/src/lib/sync/SyncStateContext.tsx`

**Provider:** `<SyncStateProvider>`
- 30-second polling interval
- Visibility-aware (pauses when tab is hidden)
- Memory-only caching (NO localStorage)
- Error-resilient (keeps stale data on error)

**Hooks:**
- `useSyncState()` - Full state + refresh function
- `useProgress()` - Just progress data
- `useBadges()` - Just badge counts
- `useFocusStatus()` - Just focus session status
- `usePlanStatus()` - Just daily plan status
- `useBadgeCount(key)` - Single badge count value

## Data Types

```typescript
interface ProgressData {
  level: number;
  current_xp: number;
  xp_to_next_level: number;
  coins: number;
  streak_days: number;
}

interface BadgeData {
  unread_inbox: number;
  active_quests: number;
  pending_habits: number;
  overdue_items: number;
}

interface FocusStatusData {
  has_active_session: boolean;
  mode: string | null;
  time_remaining_seconds: number | null;
}

interface PlanStatusData {
  has_plan: boolean;
  completed: number;
  total: number;
  percent_complete: number;
}
```

## Usage

### Component Example

```tsx
"use client";

import { useProgress, useBadgeCount } from "@/lib/sync/SyncStateContext";

export function HUD() {
  const progress = useProgress();
  const unread = useBadgeCount("unread_inbox");

  return (
    <div>
      <span>Level {progress?.level ?? 1}</span>
      <span>XP: {progress?.current_xp ?? 0} / {progress?.xp_to_next_level ?? 1000}</span>
      {unread > 0 && <span className="badge">{unread}</span>}
    </div>
  );
}
```

### Force Refresh

```tsx
const { refresh } = useSyncState();

async function handleAction() {
  await someApiCall();
  await refresh(); // Immediately fetch fresh data
}
```

## Files Changed

### Backend
- `app/backend/crates/api/src/routes/sync.rs` (NEW)
- `app/backend/crates/api/src/routes/mod.rs` (add sync module)
- `app/backend/crates/api/src/routes/api.rs` (add sync routes)

### Frontend
- `app/frontend/src/lib/api/sync.ts` (NEW)
- `app/frontend/src/lib/sync/SyncStateContext.tsx` (NEW)
- `app/frontend/src/app/(app)/layout.tsx` (add SyncStateProvider)
- `app/frontend/src/app/(mobile)/m/layout.tsx` (add SyncStateProvider)
- `app/frontend/src/components/mobile/screens/MobileProgress.tsx` (use hooks)

## Storage Rules

| Data | Storage | Reason |
|------|---------|--------|
| Poll data (progress, badges, etc.) | Memory only | UI optimization, refreshed every 30s |
| Player settings | D1 via API | User preferences, NOT cached in localStorage |
| Theme preference | localStorage allowed | Minimal, non-sensitive |
| Waveform cache | localStorage allowed | Performance optimization for music |

## Testing

```bash
# Backend compiles
cd app/backend && cargo check

# Frontend type-checks
cd app/frontend && npx tsc --noEmit

# Test endpoint
curl https://api.ecent.online/api/sync/poll \
  -H "Cookie: session=<token>" | jq
```

## Future Enhancements

1. **WebSocket upgrade** - Replace polling with real-time push for focus timer
2. **Conditional requests** - Use `If-None-Match` header with ETag
3. **More badge types** - Add overdue habits, pending approvals, etc.
4. **Offline handling** - Queue refreshes for when back online

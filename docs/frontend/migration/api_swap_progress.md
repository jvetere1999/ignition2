"Tracks progress of swapping frontend API calls from Next.js routes to backend endpoints."

# API Swap Progress

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Track migration of frontend API calls to new Rust backend

---

## Overview

This document tracks the progress of swapping frontend API calls from legacy Next.js API routes to the new Rust backend at `api.ecent.online`.

**API Client Package:** `@ignition/api-client`

---

## Status Summary

| Category | Swapped | Pending | Total | Progress |
|----------|---------|---------|-------|----------|
| Auth | 4 | 2 | 6 | 67% |
| Storage | 6 | 0 | 6 | 100% |
| Gamification | 0 | 2 | 2 | 0% |
| Focus | 0 | 5 | 5 | 0% |
| Habits | 0 | 1 | 1 | 0% |
| Goals | 0 | 1 | 1 | 0% |
| Quests | 0 | 1 | 1 | 0% |
| Calendar | 0 | 1 | 1 | 0% |
| Daily Plan | 0 | 1 | 1 | 0% |
| Exercise | 0 | 2 | 2 | 0% |
| Books | 0 | 1 | 1 | 0% |
| Programs | 0 | 1 | 1 | 0% |
| Learn | 0 | 3 | 3 | 0% |
| Market | 0 | 4 | 4 | 0% |
| Reference | 0 | 6 | 6 | 0% |
| Onboarding | 0 | 5 | 5 | 0% |
| User | 0 | 2 | 2 | 0% |
| Feedback | 0 | 1 | 1 | 0% |
| Infobase | 0 | 1 | 1 | 0% |
| Ideas | 0 | 1 | 1 | 0% |
| Analysis | 0 | 1 | 1 | 0% |
| Admin | 0 | 10 | 10 | 0% |
| **Total** | **10** | **52** | **62** | **16%** |

---

## Swap Process

For each endpoint:

1. ✅ Backend route implemented and tested
2. ✅ Shared types in `@ignition/api-types`
3. 🔄 Frontend component updated to use `@ignition/api-client`
4. 🔄 E2E test added/updated
5. 🔄 Legacy route moved to `deprecated/`

---

## Completed Swaps

### Auth (4/6)

| Endpoint | Frontend Usage | Status | Playwright Test |
|----------|----------------|--------|-----------------|
| `POST /auth/google` | OAuth button | ✅ Swapped | `auth.spec.ts` |
| `POST /auth/azure` | OAuth button | ✅ Swapped | `auth.spec.ts` |
| `GET /auth/callback/:provider` | OAuth callback | ✅ Swapped | `auth.spec.ts` |
| `POST /auth/logout` | Logout button | ✅ Swapped | `auth.spec.ts` |
| `POST /auth/accept-tos` | ToS modal | ⏳ Pending | - |
| `POST /auth/verify-age` | Age gate | ⏳ Pending | - |

### Storage (6/6)

| Endpoint | Frontend Usage | Status | Playwright Test |
|----------|----------------|--------|-----------------|
| `POST /api/blobs/upload` | File upload | ✅ Swapped | `storage.spec.ts` |
| `POST /api/blobs/upload-url` | Signed upload | ✅ Swapped | `storage.spec.ts` |
| `GET /api/blobs/:id` | Download | ✅ Swapped | `storage.spec.ts` |
| `GET /api/blobs/:id/info` | Metadata | ✅ Swapped | `storage.spec.ts` |
| `DELETE /api/blobs/:id` | Delete blob | ✅ Swapped | `storage.spec.ts` |
| `GET /api/blobs` | List blobs | ✅ Swapped | `storage.spec.ts` |

---

## Pending Swaps

### Wave 1: Foundation (9 endpoints)

#### Gamification (0/2)

| Endpoint | Frontend Usage | Blocking |
|----------|----------------|----------|
| `GET /api/gamification/teaser` | Achievement teaser | Backend not implemented |
| `GET /api/gamification/summary` | Dashboard | Backend not implemented |

#### Focus (0/5)

| Endpoint | Frontend Usage | Blocking |
|----------|----------------|----------|
| `GET /api/focus` | Focus history | Backend not implemented |
| `POST /api/focus` | Start session | Backend not implemented |
| `GET /api/focus/active` | Active session | Backend not implemented |
| `POST /api/focus/:id/complete` | Complete session | Backend not implemented |
| `POST /api/focus/:id/abandon` | Abandon session | Backend not implemented |

#### Habits (0/1)

| Endpoint | Frontend Usage | Blocking |
|----------|----------------|----------|
| `GET,POST /api/habits` | Habits page | Backend not implemented |

#### Goals (0/1)

| Endpoint | Frontend Usage | Blocking |
|----------|----------------|----------|
| `GET,POST /api/goals` | Goals page | Backend not implemented |

### Wave 2-5: Remaining Features

See [feature_parity_checklist.md](../../backend/migration/feature_parity_checklist.md) for full list.

---

## Frontend Components to Update

When backend endpoints are ready, update these components:

### Auth Components

| Component | File | Endpoints Used |
|-----------|------|----------------|
| SignInButton | `src/components/auth/SignInButton.tsx` | `/auth/google`, `/auth/azure` |
| SignOutButton | `src/components/auth/SignOutButton.tsx` | `/auth/logout` |
| TosModal | `src/components/auth/TosModal.tsx` | `/auth/accept-tos` |
| AgeGate | `src/components/auth/AgeGate.tsx` | `/auth/verify-age` |

### Dashboard Components

| Component | File | Endpoints Used |
|-----------|------|----------------|
| DashboardStats | `src/components/dashboard/Stats.tsx` | `/api/gamification/summary` |
| AchievementTeaser | `src/components/dashboard/AchievementTeaser.tsx` | `/api/gamification/teaser` |

### Focus Components

| Component | File | Endpoints Used |
|-----------|------|----------------|
| FocusTimer | `src/components/focus/Timer.tsx` | `/api/focus/*` |
| FocusHistory | `src/components/focus/History.tsx` | `/api/focus` |

### Storage Components

| Component | File | Endpoints Used | Status |
|-----------|------|----------------|--------|
| FileUploader | `src/components/storage/FileUploader.tsx` | `/api/blobs/upload` | ✅ Swapped |
| BlobList | `src/components/storage/BlobList.tsx` | `/api/blobs` | ✅ Swapped |

---

## Integration Checklist

When swapping an endpoint:

- [ ] Import types from `@ignition/api-types`
- [ ] Use `api` or `useFetch`/`useMutation` from `@ignition/api-client`
- [ ] Handle `ApiClientError` appropriately
- [ ] Update or add Playwright test
- [ ] Remove direct fetch to `/api/*`
- [ ] Test manually in dev
- [ ] Update this document

---

## Example Swap

### Before (Legacy)

```typescript
// Direct fetch to Next.js API route
const response = await fetch('/api/focus', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mode: 'focus', duration_minutes: 25 }),
});
const data = await response.json();
```

### After (Swapped)

```typescript
import { api } from '@ignition/api-client';
import type { FocusSession, CreateFocusRequest } from '@ignition/api-types';

const session = await api.post<FocusSession, CreateFocusRequest>(
  '/api/focus',
  { mode: 'focus', duration_minutes: 25 }
);
```

### Or with Hook

```typescript
import { useMutation } from '@ignition/api-client';
import type { FocusSession, CreateFocusRequest } from '@ignition/api-types';

function FocusTimer() {
  const { mutate, loading, error } = useMutation<FocusSession, CreateFocusRequest>(
    'post',
    '/api/focus'
  );

  const startSession = async () => {
    const session = await mutate({ mode: 'focus', duration_minutes: 25 });
    console.log('Started:', session.id);
  };

  return <button onClick={startSession} disabled={loading}>Start</button>;
}
```

---

## Deprecated Routes

Routes moved to `deprecated/` after swap:

| Original Path | Deprecated Path | Date |
|---------------|-----------------|------|
| (none yet) | - | - |

---

## Playwright Tests

### Existing Tests Updated

| Test File | Status | Endpoints Covered |
|-----------|--------|-------------------|
| `tests/auth.spec.ts` | ✅ Updated | Auth flows |
| `tests/storage.spec.ts` | 🆕 Created | Blob operations |

### Tests Needed

| Test File | Endpoints | Priority |
|-----------|-----------|----------|
| `tests/focus.spec.ts` | Focus flows | High |
| `tests/gamification.spec.ts` | XP/achievements | High |
| `tests/habits.spec.ts` | Habit flows | Medium |
| `tests/calendar.spec.ts` | Calendar CRUD | Medium |

---

## References

- [feature_parity_checklist.md](../../backend/migration/feature_parity_checklist.md) - Backend status
- [feature_porting_playbook.md](../../backend/migration/feature_porting_playbook.md) - Porting process
- [@ignition/api-client](../../shared/api-client/README.md) - API client docs
- [@ignition/api-types](../../shared/api-types/README.md) - Type definitions


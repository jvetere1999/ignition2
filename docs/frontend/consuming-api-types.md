# Consuming API Types in Frontend

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Guide for using shared API types in frontend and admin applications

---

## Overview

The `@ignition/api-types` package provides TypeScript types that mirror the Rust backend API. This ensures type safety across the frontend/backend boundary with minimal hand-coding.

---

## Setup

### 1. Workspace Configuration

The root `package.json` should include the shared package as a workspace:

```json
{
  "workspaces": [
    "app/frontend",
    "app/admin",
    "shared/api-types"
  ]
}
```

### 2. Install Dependencies

```bash
# From project root
npm install
```

### 3. Import Types

```typescript
import type { User, FocusSession, ApiResponse } from '@ignition/api-types';
import { isAllowedMimeType, ApiClientError } from '@ignition/api-types';
```

---

## API Client Setup

Create a typed API client wrapper:

```typescript
// app/frontend/src/lib/api/client.ts

import type { ApiResponse, ApiError } from '@ignition/api-types';
import { ApiClientError } from '@ignition/api-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.ecent.online';

/**
 * Typed GET request
 */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    credentials: 'include', // Forward session cookie
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new ApiClientError(error, response.status);
  }

  const result: ApiResponse<T> = await response.json();
  return result.data;
}

/**
 * Typed POST request
 */
export async function apiPost<T, B = unknown>(path: string, body: B): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Origin': window.location.origin, // For CSRF
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new ApiClientError(error, response.status);
  }

  const result: ApiResponse<T> = await response.json();
  return result.data;
}

/**
 * Typed DELETE request
 */
export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Origin': window.location.origin,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new ApiClientError(error, response.status);
  }

  const result: ApiResponse<T> = await response.json();
  return result.data;
}
```

---

## Usage Examples

### Fetching User Data

```typescript
import type { User, CurrentUserResponse } from '@ignition/api-types';
import { apiGet } from '@/lib/api/client';

async function getCurrentUser(): Promise<User> {
  const response = await apiGet<CurrentUserResponse>('/api/user/me');
  return response.user;
}
```

### Creating a Focus Session

```typescript
import type { 
  FocusSession, 
  CreateFocusRequest,
  FocusSessionResponse,
} from '@ignition/api-types';
import { apiPost } from '@/lib/api/client';

async function startFocusSession(
  durationMinutes: number,
  mode: 'focus' | 'break'
): Promise<FocusSession> {
  const request: CreateFocusRequest = {
    duration_minutes: durationMinutes,
    mode,
  };
  
  return apiPost<FocusSessionResponse, CreateFocusRequest>(
    '/api/focus',
    request
  );
}
```

### Uploading a Blob

```typescript
import type { 
  UploadResponse, 
  UploadUrlRequest,
  SignedUrlResponse,
} from '@ignition/api-types';
import { isAllowedMimeType, getMaxSizeForMime } from '@ignition/api-types';
import { apiPost } from '@/lib/api/client';

async function uploadFile(file: File): Promise<UploadResponse> {
  // Validate MIME type
  if (!isAllowedMimeType(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }

  // Validate file size
  const maxSize = getMaxSizeForMime(file.type);
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }

  // Get signed upload URL
  const request: UploadUrlRequest = {
    filename: file.name,
    mime_type: file.type,
  };
  
  const { url } = await apiPost<SignedUrlResponse, UploadUrlRequest>(
    '/api/blobs/upload-url',
    request
  );

  // Upload directly to signed URL
  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  // Return upload info (you may need to call another endpoint for this)
  return { /* ... */ } as UploadResponse;
}
```

### Error Handling

```typescript
import { ApiClientError, isApiClientError, getErrorMessage } from '@ignition/api-types';

async function handleApiCall() {
  try {
    const user = await getCurrentUser();
    console.log(user);
  } catch (error) {
    if (isApiClientError(error)) {
      // Typed error handling
      if (error.isAuthError()) {
        // Redirect to login
        window.location.href = '/auth/signin';
        return;
      }
      
      if (error.isValidationError()) {
        // Show validation errors
        console.error('Validation failed:', error.details);
        return;
      }
      
      // Show error message
      alert(error.message);
    } else {
      // Unknown error
      console.error('Unknown error:', getErrorMessage(error));
    }
  }
}
```

---

## React Hooks

Create typed hooks for common operations:

```typescript
// app/frontend/src/hooks/useUser.ts
import { useState, useEffect } from 'react';
import type { User } from '@ignition/api-types';
import { apiGet } from '@/lib/api/client';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    apiGet<{ user: User }>('/api/user/me')
      .then(data => setUser(data.user))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, error };
}
```

```typescript
// app/frontend/src/hooks/useFocusSessions.ts
import { useState, useCallback } from 'react';
import type { 
  FocusSession, 
  CreateFocusRequest,
  FocusHistoryResponse,
} from '@ignition/api-types';
import { apiGet, apiPost } from '@/lib/api/client';

export function useFocusSessions() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<FocusHistoryResponse>('/api/focus');
      setSessions(data.sessions);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (request: CreateFocusRequest) => {
    const session = await apiPost<FocusSession, CreateFocusRequest>(
      '/api/focus',
      request
    );
    setSessions(prev => [session, ...prev]);
    return session;
  }, []);

  return { sessions, loading, fetchSessions, createSession };
}
```

---

## Server Components (Next.js 15)

For Server Components, create server-side fetch functions:

```typescript
// app/frontend/src/lib/api/server.ts
import type { User, ApiResponse } from '@ignition/api-types';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_URL || 'https://api.ecent.online';

export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie) {
    return null;
  }

  const response = await fetch(`${API_BASE}/api/user/me`, {
    headers: {
      Cookie: `session=${sessionCookie.value}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const data: ApiResponse<{ user: User }> = await response.json();
  return data.data.user;
}
```

---

## Type Checking

Ensure types are validated during development and CI:

```bash
# In app/frontend or app/admin
npm run typecheck
```

Add to CI pipeline:

```yaml
- name: Typecheck shared types
  run: cd shared/api-types && npm run typecheck

- name: Typecheck frontend
  run: cd app/frontend && npm run typecheck
```

---

## Updating Types

When backend types change:

1. Update Rust types in `app/backend/crates/api/src/`
2. Update TypeScript types in `shared/api-types/src/`
3. Run `npm run typecheck` to catch breaking changes
4. Update frontend code as needed

**Future:** Use ts-rs to auto-generate TypeScript from Rust.

---

## Best Practices

### 1. Always Import Types

```typescript
// ✅ Good - explicit type import
import type { User } from '@ignition/api-types';

// ❌ Avoid - importing runtime values when only types needed
import { User } from '@ignition/api-types';
```

### 2. Use Type Guards

```typescript
import { isApiClientError } from '@ignition/api-types';

try {
  await apiCall();
} catch (error) {
  if (isApiClientError(error)) {
    // TypeScript knows error is ApiClientError
  }
}
```

### 3. Validate at Boundaries

```typescript
import { isAllowedMimeType } from '@ignition/api-types';

function handleFileUpload(file: File) {
  if (!isAllowedMimeType(file.type)) {
    throw new Error('Invalid file type');
  }
  // Proceed with upload
}
```

### 4. Keep Naming Consistent

- Use `snake_case` for JSON properties (matches Rust serialization)
- Use `PascalCase` for type names
- Use `camelCase` for function names

---

## References

- [api_contract_strategy.md](../backend/migration/api_contract_strategy.md)
- [contract_tests_plan.md](../backend/migration/contract_tests_plan.md)
- [@ignition/api-types README](../../shared/api-types/README.md)


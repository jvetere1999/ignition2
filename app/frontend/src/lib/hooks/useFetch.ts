'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * State for async data fetching
 */
export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Options for useFetch hook
 */
export interface UseFetchOptions {
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
  /** Cache duration in milliseconds (default: 5 minutes) */
  cacheDuration?: number;
  /** Retry on failure (default: true) */
  retry?: boolean;
  /** Max retries (default: 3) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Dependencies array to trigger refetch */
  dependencies?: unknown[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Simple in-memory cache for fetch results
const fetchCache = new Map<string, CacheEntry<unknown>>();

/**
 * Hook for fetching data with caching, error handling, and retry logic
 *
 * @param url - URL to fetch from
 * @param options - Fetch options
 * @returns FetchState with data, loading, error, and refetch
 *
 * Example:
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data: user, loading, error, refetch } = useFetch<User>(
 *     `/api/users/${userId}`
 *   );
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h1>{user?.name}</h1>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFetch<T>(url: string, options: UseFetchOptions = {}): FetchState<T> {
  const {
    autoFetch = true,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    retry = true,
    maxRetries = 3,
    retryDelay = 1000,
    dependencies = [url],
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: autoFetch,
    error: null,
    refetch: async () => {},
  });

  const retryCount = useRef(0);
  const isMounted = useRef(true);

  // Check if cached data is still valid
  const getCachedData = useCallback((): T | null => {
    const cached = fetchCache.get(url) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data;
    }
    fetchCache.delete(url);
    return null;
  }, [url, cacheDuration]);

  // Perform the fetch with retry logic
  const performFetch = useCallback(
    async (retryAttempt = 0) => {
      // Check cache first
      const cached = getCachedData();
      if (cached) {
        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            data: cached,
            loading: false,
            error: null,
          }));
        }
        return;
      }

      try {
        if (isMounted.current) {
          setState((prev) => ({ ...prev, loading: true }));
        }

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as T;

        if (isMounted.current) {
          // Cache the result
          fetchCache.set(url, {
            data,
            timestamp: Date.now(),
          });

          setState({
            data,
            loading: false,
            error: null,
            refetch: performFetch,
          });
        }

        retryCount.current = 0;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Retry logic
        if (retry && retryAttempt < maxRetries) {
          retryCount.current = retryAttempt + 1;
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * Math.pow(2, retryAttempt))
          );
          return performFetch(retryAttempt + 1);
        }

        if (isMounted.current) {
          setState({
            data: null,
            loading: false,
            error: err,
            refetch: performFetch,
          });
        }
      }
    },
    [url, getCachedData, retry, maxRetries, retryDelay]
  );

  // Initial fetch on mount or dependency change
  useEffect(() => {
    isMounted.current = true;

    if (autoFetch) {
      performFetch();
    } else {
      setState((prev) => ({
        ...prev,
        refetch: performFetch,
      }));
    }

    return () => {
      isMounted.current = false;
    };
  }, dependencies);

  return state;
}

/**
 * Hook for posting data with error handling
 *
 * @returns Object with loading, error, and post function
 *
 * Example:
 * ```tsx
 * const { loading, error, post } = usePost<CreatedUser>();
 *
 * async function handleSubmit(formData: FormData) {
 *   const result = await post('/api/users', formData);
 *   if (result) {
 *     console.log('Created:', result);
 *   }
 * }
 * ```
 */
export function usePost<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const post = useCallback(
    async (url: string, data?: unknown): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as T;
        setLoading(false);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
        return null;
      }
    },
    []
  );

  return { loading, error, post };
}

/**
 * Hook for patching/updating data
 */
export function usePatch<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const patch = useCallback(
    async (url: string, data?: unknown): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as T;
        setLoading(false);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
        return null;
      }
    },
    []
  );

  return { loading, error, patch };
}

/**
 * Hook for deleting data
 */
export function useDelete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const delete_ = useCallback(async (url: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setLoading(false);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setLoading(false);
      return false;
    }
  }, []);

  return { loading, error, delete: delete_ };
}

/**
 * Clear all fetch cache
 */
export function clearFetchCache(): void {
  fetchCache.clear();
}

/**
 * Invalidate specific cache entries
 */
export function invalidateCache(urlPattern?: string): void {
  if (urlPattern) {
    for (const [key] of fetchCache) {
      if (key.includes(urlPattern)) {
        fetchCache.delete(key);
      }
    }
  } else {
    fetchCache.clear();
  }
}

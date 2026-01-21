/**
 * API Client Wrapper
 *
 * Single source of truth for all API communication.
 * Eliminates duplicated fetch logic across API modules.
 *
 * MIGRATION: Extracted from individual API modules January 2026
 */

// ============================================
// Configuration
// ============================================

import { getApiBaseUrl } from "@/lib/config/environment";

const API_BASE_URL = getApiBaseUrl();
const OFFLINE_QUEUE_BLOCKLIST = [
  '/api/infobase',
  '/api/ideas',
  '/api/learn/journal',
  '/api/reference',
  '/api/references',
  '/reference',
  '/references',
];

/**
 * API Error with typed details
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly type: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    type: string = 'api_error',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
    this.details = details;
  }

  isAuthError(): boolean {
    return this.type === 'unauthorized' || this.status === 401;
  }

  isNotFound(): boolean {
    return this.type === 'not_found' || this.status === 404;
  }

  isForbidden(): boolean {
    return this.type === 'forbidden' || this.status === 403;
  }

  isValidation(): boolean {
    return this.type === 'validation_error' || this.status === 400;
  }
}

/**
 * Clear all client data on session expiry (401)
 * This function handles cleanup when backend session is invalid
 * 
 * CRITICAL: Cookie deletion must happen BEFORE any subsequent API calls
 * to prevent sync operations from restoring stale session data.
 */
async function clearAllClientData(): Promise<void> {
  // 1. FIRST: Clear localStorage (synchronous, immediate)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('session') || key.includes('auth') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('[API] Cleared localStorage session data');
    } catch (error) {
      console.error('[API] Error clearing localStorage:', error);
    }
  }

  // 2. SECOND: Call backend signOut to destroy server session
  // This must complete before redirect to ensure cookies are deleted server-side
  if (typeof window !== 'undefined') {
    try {
      const { signOut: apiSignOut } = await import('@/lib/auth/api-auth');
      // Pass false to prevent double redirect (handle401 will redirect)
      await apiSignOut(false);
      console.log('[API] Backend session destroyed');
    } catch (error) {
      console.error('[API] Error calling API signOut:', error);
      // Continue anyway - we'll redirect to landing page
    }
  }
}

/**
 * Handle 401 Unauthorized response - session expired or invalid
 * 
 * Flow:
 * 1. Clear all client data (localStorage + backend session)
 * 2. Broadcast session termination to other tabs
 * 3. Show user notification
 * 4. Redirect to main landing page (NOT /login which doesn't exist)
 * 
 * Cross-Tab Synchronization:
 * Uses localStorage event to notify other tabs of session expiry,
 * preventing "ghost" authenticated states across tabs.
 */
async function handle401(): Promise<void> {
  console.warn('[API] 401 Unauthorized - Session expired, clearing client data');

  // STEP 1: Clear all session data FIRST (prevents sync from restoring)
  await clearAllClientData();

  // STEP 2: Broadcast session termination to other tabs (cross-tab sync)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const timestamp = Date.now();
      localStorage.setItem('__session_terminated__', JSON.stringify({
        timestamp,
        reason: 'session_expired',
      }));
      console.log('[API] Broadcast session termination to other tabs');
    } catch (error) {
      console.error('[API] Error broadcasting session termination:', error);
    }
  }

  // STEP 3: Show error notification
  if (typeof window !== 'undefined') {
    try {
      const { useErrorStore } = await import('@/lib/hooks/useErrorNotification');
      const store = useErrorStore.getState();
      store.addError({
        id: `session-expired-${Date.now()}`,
        timestamp: new Date(),
        message: 'Your session has expired. Please log in again.',
        endpoint: '/',
        method: 'REDIRECT',
        status: 401,
        type: 'error',
        details: { reason: 'session_expired' },
      });
    } catch (error) {
      console.error('[API] Error showing notification:', error);
    }

    // STEP 4: Redirect to main landing page (clean slate)
    // Note: No delay needed - clearAllClientData already completed
    // Redirecting to '/' (not '/login') per user requirement
    console.log('[API] Redirecting to main landing page');
    window.location.href = '/';
  }
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = await response.json() as {
      error?: { message?: string; type?: string; details?: Record<string, unknown> };
      message?: string;
    };
    return new ApiError(
      body.error?.message || body.message || `API error: ${response.status}`,
      response.status,
      body.error?.type || 'api_error',
      body.error?.details
    );
  } catch {
    return new ApiError(
      `API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }
}

/**
 * Request options for API calls
 */
export interface ApiRequestOptions {
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request headers */
  headers?: Record<string, string>;
  /** Skip credentials (cookies) */
  noCredentials?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Build URL with query parameters
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function ensureAbsoluteUrl(path: string): string {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  return new URL(path, API_BASE_URL).toString();
}

function isQueueableMutation(url: string): boolean {
  const normalized = ensureAbsoluteUrl(url);
  const pathname = new URL(normalized).pathname;
  return !OFFLINE_QUEUE_BLOCKLIST.some((prefix) => pathname.startsWith(prefix));
}

async function withMutationLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    const navWithLocks = navigator as Navigator & { locks?: { request: (name: string, fn: () => Promise<T>) => Promise<T> } };
    if (navWithLocks.locks?.request) {
      return navWithLocks.locks.request('api-mutation', work);
    }
  }
  return work();
}

function normalizeFetchInput(input: string | Request): string | Request {
  if (typeof input === 'string') {
    return ensureAbsoluteUrl(input);
  }

  const absoluteUrl = ensureAbsoluteUrl(input.url);
  if (absoluteUrl === input.url) {
    return input;
  }

  return new Request(absoluteUrl, input);
}

function isMutation(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

/**
 * Execute fetch with standard configuration
 * Automatically tracks errors via error notification system if available
 */
async function executeFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = buildUrl(path, options.params);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Origin header for CSRF protection on state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    if (typeof window !== 'undefined') {
      headers['Origin'] = window.location.origin;
    }
  }

  // Check vault protection for sensitive write operations
  if (['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
    try {
      // Dynamically import to avoid circular dependencies
      const { checkVaultProtection } = await import('@/lib/auth/vaultProtection');
      const vaultPath = new URL(url).pathname;
      
      // Get vault lock state from context if available
      if (typeof window !== 'undefined') {
        try {
          const { useVaultLockStore } = await import('@/lib/auth/VaultLockContext');
          const store = useVaultLockStore.getState();
          const isVaultLocked = store.isLocked;
          
          checkVaultProtection(method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', vaultPath, isVaultLocked);
        } catch {
          // Store not available (SSR), skip vault check
        }
      }
    } catch (error) {
      // If vault protection throws, re-throw as API error
      if (error instanceof Error && error.constructor.name === 'VaultLockedError') {
        throw error;
      }
      // Other errors are silently ignored to not break normal operation
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: options.noCredentials ? 'omit' : 'include',
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  // Apply timeout
  const controller = new AbortController();
  const timeoutId = options.timeout
    ? setTimeout(() => controller.abort(), options.timeout)
    : undefined;

  try {
    // If offline and mutation, enqueue for replay and return 202 (unless blocked for E2EE)
    if (typeof navigator !== 'undefined' && !navigator.onLine && isMutation(method)) {
      if (!isQueueableMutation(url)) {
        throw new ApiError('Offline write blocked for encrypted content', 409, 'offline_blocked');
      }
      const { enqueueMutation } = await import('@/lib/api/offlineQueue');
      await enqueueMutation({
        url,
        method,
        body: typeof fetchOptions.body === 'string' ? fetchOptions.body : fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
        headers,
      });
      return { queued: true } as unknown as T;
    }

    const runFetch = () =>
      fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
    const response = isMutation(method) ? await withMutationLock(runFetch) : await runFetch();

    if (timeoutId) clearTimeout(timeoutId);

    // Handle 401 Unauthorized - Session expired or invalid
    if (response.status === 401) {
      await handle401();
      throw new ApiError('Session expired', 401, 'unauthorized');
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    
    let apiError: ApiError;
    
    if (error instanceof ApiError) {
      apiError = error;
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      apiError = new ApiError('Request timeout', 408, 'timeout');
    } else {
      apiError = new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        'network_error'
      );
    }

    // Track error in notification system if available
    if (typeof window !== 'undefined') {
      try {
        // Dynamically import to avoid circular dependencies
        const { useErrorStore } = await import('@/lib/hooks/useErrorNotification');
        const store = useErrorStore.getState();
        store.addError({
          id: `api-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          message: apiError.message,
          endpoint: path,
          method,
          status: apiError.status,
          type: 'error',
          details: apiError.details,
        });
      } catch {
        // Error notification system not available, silently continue
      }
    }

    throw apiError;
  }
}

// ============================================
// HTTP Methods
// ============================================

/**
 * GET request
 */
export async function apiGet<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return executeFetch<T>('GET', path, undefined, options);
}

/**
 * POST request
 */
export async function apiPost<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
  return executeFetch<T>('POST', path, body, options);
}

/**
 * PUT request
 */
export async function apiPut<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
  return executeFetch<T>('PUT', path, body, options);
}

/**
 * PATCH request
 */
export async function apiPatch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
  return executeFetch<T>('PATCH', path, body, options);
}

/**
 * DELETE request
 */
export async function apiDelete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return executeFetch<T>('DELETE', path, undefined, options);
}

// ============================================
// Safe Fetch Wrapper
// ============================================

/**
 * Safe wrapper for raw fetch() calls with comprehensive error handling
 * 
 * Features:
 * - 401 session expiry handling
 * - Error notifications for API failures (400, 500, etc.)
 * - Network error handling
 * - Offline queue support
 * - Automatic credential injection
 * 
 * CRITICAL: Use this wrapper for all fetch() calls that aren't going through
 * the standard apiGet/apiPost/etc functions. This ensures session termination
 * and error notifications work globally.
 * 
 * Usage:
 *   const response = await safeFetch(`${API_BASE_URL}/api/focus`);
 *   const response = await safeFetch(`${API_BASE_URL}/api/books`, { method: 'POST', body: ... });
 */
export async function safeFetch(
  input: string | Request,
  init?: RequestInit & { credentials?: 'include' | 'omit' }
): Promise<Response> {
  const normalizedInput = normalizeFetchInput(input);

  // Ensure credentials are always included for auth
  const fetchOptions = {
    ...init,
    credentials: init?.credentials ?? 'include',
  } as RequestInit;

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const url = typeof normalizedInput === 'string' ? normalizedInput : normalizedInput.url;
  
  if (typeof navigator !== 'undefined' && !navigator.onLine && isMutation(method)) {
    if (!isQueueableMutation(url)) {
      return new Response(
        JSON.stringify({ error: 'offline_blocked', message: 'Offline write blocked for encrypted content' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    const { enqueueMutation } = await import('@/lib/api/offlineQueue');
    await enqueueMutation({
      url,
      method,
      body: typeof fetchOptions.body === 'string' ? fetchOptions.body : fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
      headers: fetchOptions.headers as Record<string, string> | undefined,
    });
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const runFetch = () => fetch(normalizedInput, fetchOptions);
  let response: Response;
  
  try {
    response = isMutation(method) ? await withMutationLock(runFetch) : await runFetch();
  } catch (error) {
    // Network error (offline, DNS failure, etc.)
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    console.error(`[API] Network error for ${method} ${url}:`, error);
    
    // Notify user of network failure
    if (typeof window !== 'undefined') {
      try {
        const { useErrorStore } = await import('@/lib/hooks/useErrorNotification');
        const store = useErrorStore.getState();
        store.addError({
          id: `network-error-${Date.now()}`,
          timestamp: new Date(),
          message: 'Network error. Please check your connection and try again.',
          endpoint: url,
          method,
          status: 0,
          type: 'error',
          details: { reason: 'network_error', originalError: errorMessage },
        });
      } catch (notifyError) {
        console.error('[API] Error showing notification:', notifyError);
      }
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'network_error', message: errorMessage }),
      {
        status: 0,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle 401 Unauthorized - Session expired or invalid
  if (response.status === 401) {
    await handle401();
    // Return error response so caller can handle it if needed
    return response;
  }

  // Handle other error responses (400, 500, etc.)
  if (!response.ok && response.status !== 202) {
    const errorMessage = getErrorMessage(response.status);
    console.error(`[API] ${response.status} error for ${method} ${url}`);
    
    // Notify user of API failure
    if (typeof window !== 'undefined' && isMutation(method)) {
      try {
        const { useErrorStore } = await import('@/lib/hooks/useErrorNotification');
        const store = useErrorStore.getState();
        store.addError({
          id: `api-error-${Date.now()}`,
          timestamp: new Date(),
          message: errorMessage,
          endpoint: url,
          method,
          status: response.status,
          type: 'error',
          details: { 
            reason: 'api_error',
            statusCode: response.status,
          },
        });
      } catch (notifyError) {
        console.error('[API] Error showing notification:', notifyError);
      }
    }
  }

  return response;
}

/**
 * Get user-friendly error message from HTTP status code
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'Conflict: This item may have been modified. Please refresh and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Bad gateway. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return `Error: ${status}. Please try again.`;
  }
}

// ============================================
// Convenience Exports
// ============================================

export { API_BASE_URL };

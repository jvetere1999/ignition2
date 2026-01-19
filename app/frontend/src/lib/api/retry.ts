/**
 * API Request Retry Logic
 *
 * Provides configurable exponential backoff retry strategies for API requests.
 * Handles transient failures and improves reliability.
 *
 * Usage:
 * ```ts
 * const response = await withRetry(
 *   () => fetch(`${API_BASE}/endpoint`),
 *   { maxRetries: 3, baseDelayMs: 100 }
 * );
 * ```
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 100) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 5000) */
  maxDelayMs?: number;
  /** Jitter factor 0-1 to randomize delays and prevent thundering herd (default: 0.1) */
  jitterFactor?: number;
  /** Function to determine if error is retryable (default: HTTP 5xx or network error) */
  isRetryable?: (error: Error | Response) => boolean;
  /** Callback for logging retry attempts */
  onRetry?: (attempt: number, error: Error | Response, nextDelayMs: number) => void;
}

/**
 * Calculate exponential backoff delay with jitter
 *
 * Formula: baseDelay * (2 ^ attempt) * (1 + random jitter)
 * Capped at maxDelayMs
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = 1 + (Math.random() - 0.5) * 2 * jitterFactor;
  const delayWithJitter = exponentialDelay * jitter;
  return Math.min(delayWithJitter, maxDelayMs);
}

/**
 * Default retry decision function
 * Retries on 5xx errors or network failures
 */
function defaultIsRetryable(error: Error | Response): boolean {
  // Network/fetch errors
  if (error instanceof Error) {
    const isNetworkError =
      error.name === 'TypeError' || // Network failures
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout');

    return isNetworkError;
  }

  // HTTP response - retry on 5xx or 429 (rate limit)
  if (error instanceof Response) {
    return error.status >= 500 || error.status === 429;
  }

  return false;
}

/**
 * Sleep for given milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute async function with exponential backoff retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Promise resolving to function result
 *
 * Example:
 * ```ts
 * const data = await withRetry(
 *   async () => {
 *     const response = await fetch(`${API}/users/${id}`);
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     baseDelayMs: 100,
 *     onRetry: (attempt, error, nextDelayMs) => {
 *       console.log(`Retry ${attempt} after ${nextDelayMs}ms due to:`, error);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const jitterFactor = Math.max(0, Math.min(1, options.jitterFactor ?? 0.1));
  const isRetryable = options.isRetryable ?? defaultIsRetryable;
  const onRetry = options.onRetry ?? (() => {});

  let lastError: Error | Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (!isRetryable(lastError)) {
        throw error;
      }

      // Calculate backoff and wait
      const nextDelayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, jitterFactor);
      onRetry(attempt + 1, lastError, nextDelayMs);
      await sleep(nextDelayMs);
    }
  }

  // Should not reach here, but throw if it does
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Fetch with automatic retry
 *
 * Wrapper around fetch() with built-in retry logic for transient failures
 *
 * @param input - Fetch input (URL or Request)
 * @param init - Fetch init options
 * @param retryOptions - Retry configuration
 * @returns Promise resolving to Response
 *
 * Example:
 * ```ts
 * const response = await fetchWithRetry('/api/data', undefined, {
 *   maxRetries: 3,
 *   baseDelayMs: 100
 * });
 * const data = await response.json();
 * ```
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(() => fetch(input, init), retryOptions);
}

/**
 * Hook-friendly fetch wrapper with logging
 *
 * Use this for API calls that may fail transiently
 */
export async function apiCallWithRetry<T>(
  fn: () => Promise<Response>,
  options: {
    retryOptions?: RetryOptions;
    parseJson?: boolean;
  } = {}
): Promise<T> {
  const response = await withRetry(fn, options.retryOptions);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  if (options.parseJson !== false) {
    return response.json() as Promise<T>;
  }

  return (await response.text()) as unknown as T;
}

/**
 * Error class for when retries are exhausted
 */
export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public lastAttemptError: Error | Response
  ) {
    super(message);
    this.name = 'RetryExhaustedError';
  }
}

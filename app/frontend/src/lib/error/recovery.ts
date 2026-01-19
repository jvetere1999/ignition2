/**
 * Error Recovery & Resilience Utilities
 *
 * Provides recovery mechanisms for handling application failures gracefully,
 * including circuit breakers, fallback strategies, and error state management.
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

/**
 * Circuit breaker for handling cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(
    private failureThreshold: number = 5,
    private successThreshold: number = 2,
    private timeoutMs: number = 30000
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.reset();
        }
      } else {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.timeoutMs;
  }

  /**
   * Reset circuit breaker to closed state
   */
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually close circuit
   */
  close(): void {
    this.reset();
  }
}

/**
 * Retry with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100,
  maxDelayMs: number = 10000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * exponentialDelay;
        const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Fallback strategy for handling errors
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    console.warn('Primary operation failed, using fallback:', error);
    return await Promise.resolve(fallback());
  }
}

/**
 * Timeout utility
 */
export function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );
}

/**
 * Race between promise and timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    timeout<T>(timeoutMs),
  ]);
}

/**
 * Error state management
 */
export interface ErrorState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  lastAttemptTime: number | null;
}

export class ErrorStateManager {
  private state: ErrorState = {
    hasError: false,
    error: null,
    retryCount: 0,
    lastAttemptTime: null,
  };

  /**
   * Record error
   */
  recordError(error: Error): void {
    this.state = {
      hasError: true,
      error,
      retryCount: this.state.retryCount + 1,
      lastAttemptTime: Date.now(),
    };
  }

  /**
   * Clear error state
   */
  clear(): void {
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      lastAttemptTime: null,
    };
  }

  /**
   * Reset retry count
   */
  resetRetryCount(): void {
    this.state.retryCount = 0;
  }

  /**
   * Get current error state
   */
  getState(): Readonly<ErrorState> {
    return { ...this.state };
  }

  /**
   * Get error message
   */
  getErrorMessage(): string {
    return this.state.error?.message || 'Unknown error';
  }

  /**
   * Check if should retry based on count
   */
  shouldRetry(maxRetries: number): boolean {
    return this.state.retryCount < maxRetries;
  }

  /**
   * Check if should retry based on time
   */
  shouldRetryAfterDelay(delayMs: number): boolean {
    if (!this.state.lastAttemptTime) {
      return true;
    }
    return Date.now() - this.state.lastAttemptTime >= delayMs;
  }
}

/**
 * Graceful degradation helper
 */
export class GracefulDegradation<T> {
  private strategies: Array<{
    name: string;
    fn: () => Promise<T>;
    priority: number;
  }> = [];

  /**
   * Add fallback strategy
   */
  addStrategy(
    name: string,
    fn: () => Promise<T>,
    priority: number = 0
  ): this {
    this.strategies.push({ name, fn, priority });
    this.strategies.sort((a, b) => b.priority - a.priority);
    return this;
  }

  /**
   * Execute strategies in order until one succeeds
   */
  async execute(): Promise<{ success: boolean; result?: T; error?: Error; attemptedStrategies: string[] }> {
    const attemptedStrategies: string[] = [];

    for (const strategy of this.strategies) {
      attemptedStrategies.push(strategy.name);
      try {
        const result = await strategy.fn();
        return {
          success: true,
          result,
          attemptedStrategies,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.debug(`Strategy '${strategy.name}' failed:`, err.message);
      }
    }

    return {
      success: false,
      error: new Error('All fallback strategies exhausted'),
      attemptedStrategies,
    };
  }

  /**
   * Get strategies
   */
  getStrategies(): string[] {
    return this.strategies.map((s) => s.name);
  }
}

/**
 * Bulkhead pattern for isolating failures
 */
export class Bulkhead {
  private activeCount: number = 0;

  constructor(private maxConcurrent: number = 10) {}

  /**
   * Execute function with concurrency limit
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      throw new Error(`Bulkhead limit (${this.maxConcurrent}) exceeded`);
    }

    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
    }
  }

  /**
   * Get active request count
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Get available capacity
   */
  getAvailableCapacity(): number {
    return Math.max(0, this.maxConcurrent - this.activeCount);
  }
}

/**
 * Batch error handler
 */
export class BatchErrorHandler<T> {
  private errors: Array<{
    index: number;
    error: Error;
    item: T;
  }> = [];

  /**
   * Add error
   */
  addError(index: number, error: Error, item: T): void {
    this.errors.push({ index, error, item });
  }

  /**
   * Get errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Check if any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Get failed items
   */
  getFailedItems(): T[] {
    return this.errors.map((e) => e.item);
  }

  /**
   * Clear errors
   */
  clear(): void {
    this.errors = [];
  }
}

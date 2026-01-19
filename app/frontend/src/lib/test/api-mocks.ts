/**
 * API Test Mocks and Fixtures
 * 
 * Provides comprehensive mock implementations for testing frontend components
 * without actual API calls. Includes response builders, request matchers,
 * and delay simulators for testing async behavior.
 */

import { vi } from 'vitest';

interface ApiResponseBody {
  [key: string]: unknown;
}

/**
 * Mock API response builder for testing
 */
export class MockApiResponse {
  private status: number = 200;
  private body: ApiResponseBody = {};
  private headers: Record<string, string> = {};
  private delay: number = 0;
  private error: Error | null = null;

  /**
   * Set response status code
   */
  withStatus(status: number): this {
    this.status = status;
    return this;
  }

  /**
   * Set response body
   */
  withBody(body: ApiResponseBody): this {
    this.body = body;
    return this;
  }

  /**
   * Set response headers
   */
  withHeaders(headers: Record<string, string>): this {
    this.headers = headers;
    return this;
  }

  /**
   * Add artificial delay to simulate network latency
   */
  withDelay(ms: number): this {
    this.delay = ms;
    return this;
  }

  /**
   * Make response throw error
   */
  withError(error: Error): this {
    this.error = error;
    return this;
  }

  /**
   * Build Response object
   */
  build(): Response {
    return new Response(JSON.stringify(this.body), {
      status: this.status,
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
    });
  }

  /**
   * Build delayed Response (for async testing)
   */
  async buildAsync(): Promise<Response> {
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }
    if (this.error) {
      throw this.error;
    }
    return this.build();
  }

  /**
   * Get response as JSON
   */
  json(): ApiResponseBody {
    return this.body;
  }

  /**
   * Get response as text
   */
  text(): string {
    return JSON.stringify(this.body);
  }
}

/**
 * Mock fetch for testing
 */
export class MockFetch {
  private responses: Map<string, Response | (() => Promise<Response>)> = new Map();
  private interceptors: Array<(url: string, init: RequestInit) => Response | null> = [];
  private requestHistory: Array<{ url: string; init: RequestInit }> = [];
  private callCount: number = 0;

  /**
   * Register mock response for URL pattern
   */
  register(pattern: string, response: Response | (() => Promise<Response>)): this {
    this.responses.set(pattern, response);
    return this;
  }

  /**
   * Register mock response builder
   */
  registerBuilder(pattern: string, builder: MockApiResponse): this {
    this.responses.set(pattern, builder.build());
    return this;
  }

  /**
   * Add request interceptor
   */
  addInterceptor(
    fn: (url: string, init: RequestInit) => Response | null
  ): this {
    this.interceptors.push(fn);
    return this;
  }

  /**
   * Get stored response or create new one
   */
  async fetch(url: string, init: RequestInit = {}): Promise<Response> {
    this.requestHistory.push({ url, init });
    this.callCount++;

    // Check interceptors first
    for (const interceptor of this.interceptors) {
      const response = interceptor(url, init);
      if (response) {
        return response;
      }
    }

    // Check registered responses
    for (const [pattern, response] of this.responses) {
      if (url.includes(pattern) || pattern === url) {
        if (typeof response === 'function') {
          return response();
        }
        return response.clone();
      }
    }

    // Default 404
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404 }
    );
  }

  /**
   * Get all requests made
   */
  getRequests(): Array<{ url: string; init: RequestInit }> {
    return this.requestHistory;
  }

  /**
   * Get last request made
   */
  getLastRequest(): { url: string; init: RequestInit } | null {
    return this.requestHistory[this.requestHistory.length - 1] || null;
  }

  /**
   * Get request count
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Check if URL was called
   */
  wasCalledWith(pattern: string): boolean {
    return this.requestHistory.some((r) => r.url.includes(pattern));
  }

  /**
   * Clear all history and responses
   */
  clear(): this {
    this.responses.clear();
    this.interceptors = [];
    this.requestHistory = [];
    this.callCount = 0;
    return this;
  }

  /**
   * Reset for next test
   */
  reset(): this {
    this.requestHistory = [];
    this.callCount = 0;
    return this;
  }
}

/**
 * Mock API client factory
 */
export class MockApiClientFactory {
  /**
   * Create mock fetch for user endpoints
   */
  static createUserMocks(): MockFetch {
    const mock = new MockFetch();

    mock.registerBuilder('/api/users', new MockApiResponse()
      .withStatus(200)
      .withBody({ id: 1, email: 'test@example.com', name: 'Test User' })
    );

    mock.registerBuilder('/api/users/profile', new MockApiResponse()
      .withStatus(200)
      .withBody({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
      })
    );

    mock.registerBuilder('/api/users/login', new MockApiResponse()
      .withStatus(200)
      .withBody({
        success: true,
        session_id: 'mock-session-123',
        user: { id: 1, email: 'test@example.com' },
      })
    );

    return mock;
  }

  /**
   * Create mock fetch for habit endpoints
   */
  static createHabitMocks(): MockFetch {
    const mock = new MockFetch();

    mock.registerBuilder('/api/habits', new MockApiResponse()
      .withStatus(200)
      .withBody({
        data: [
          { id: 1, name: 'Morning Routine', frequency: 'daily' },
          { id: 2, name: 'Exercise', frequency: 'daily' },
        ],
        total: 2,
      })
    );

    mock.registerBuilder('/api/habits/1', new MockApiResponse()
      .withStatus(200)
      .withBody({ id: 1, name: 'Morning Routine', frequency: 'daily' })
    );

    return mock;
  }

  /**
   * Create mock fetch that simulates network errors
   */
  static createErrorMocks(): MockFetch {
    const mock = new MockFetch();

    mock.addInterceptor((url) => {
      if (url.includes('/api/error')) {
        return new Response(
          JSON.stringify({ error: 'Server error' }),
          { status: 500 }
        );
      }
      return null;
    });

    mock.addInterceptor((url) => {
      if (url.includes('/api/unauthorized')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401 }
        );
      }
      return null;
    });

    return mock;
  }

  /**
   * Create mock fetch with realistic delays
   */
  static createSlowMocks(): MockFetch {
    const mock = new MockFetch();

    mock.addInterceptor((url) => {
      if (url.includes('/api/habits')) {
        return new Response(
          JSON.stringify({ data: [], total: 0 }),
          { status: 200 }
        );
      }
      return null;
    });

    return mock;
  }
}

/**
 * Request matcher for verifying specific API calls
 */
export class RequestMatcher {
  constructor(private requests: Array<{ url: string; init: RequestInit }>) {}

  /**
   * Match by URL pattern
   */
  findByUrl(pattern: string): Array<{ url: string; init: RequestInit }> {
    return this.requests.filter((r) => r.url.includes(pattern));
  }

  /**
   * Match by HTTP method
   */
  findByMethod(method: string): Array<{ url: string; init: RequestInit }> {
    return this.requests.filter((r) => r.init?.method === method);
  }

  /**
   * Match by URL and method
   */
  find(url: string, method: string): Array<{ url: string; init: RequestInit }> {
    return this.requests.filter(
      (r) => r.url.includes(url) && r.init?.method === method
    );
  }

  /**
   * Check if request was made with specific body
   */
  findWithBody(pattern: string, body: ApiResponseBody): boolean {
    const bodyStr = JSON.stringify(body);
    return this.requests.some(
      (r) =>
        r.url.includes(pattern) &&
        r.init?.body &&
        typeof r.init.body === 'string' &&
        r.init.body.includes(bodyStr)
    );
  }

  /**
   * Get count of matching requests
   */
  count(pattern: string): number {
    return this.requests.filter((r) => r.url.includes(pattern)).length;
  }

  /**
   * Assert request was made
   */
  assertCalled(pattern: string): void {
    if (!this.requests.some((r) => r.url.includes(pattern))) {
      throw new Error(`Expected request to "${pattern}" was never made`);
    }
  }

  /**
   * Assert request was not made
   */
  assertNotCalled(pattern: string): void {
    if (this.requests.some((r) => r.url.includes(pattern))) {
      throw new Error(`Expected request to "${pattern}" was called`);
    }
  }

  /**
   * Assert request was called exactly N times
   */
  assertCalledTimes(pattern: string, times: number): void {
    const count = this.count(pattern);
    if (count !== times) {
      throw new Error(
        `Expected request to "${pattern}" to be called ${times} times, but was called ${count} times`
      );
    }
  }
}

/**
 * Setup mock fetch in test environment
 */
export function setupMockFetch(mockFetch: MockFetch): void {
  global.fetch = vi.fn((url: string, init?: RequestInit) =>
    mockFetch.fetch(url as string, init || {})
  ) as unknown as typeof fetch;
}

/**
 * Common test response fixtures
 */
export const TEST_FIXTURES = {
  user: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
  } as const,

  habit: {
    id: 1,
    name: 'Morning Routine',
    frequency: 'daily',
    target: 7,
    created_at: '2024-01-01T00:00:00Z',
  } as const,

  quest: {
    id: 1,
    title: 'Complete 7 Habits',
    reward: 100,
    created_at: '2024-01-01T00:00:00Z',
  } as const,

  errorResponse: {
    error: true,
    message: 'Something went wrong',
    code: 'INTERNAL_ERROR',
  } as const,

  unauthorizedResponse: {
    error: true,
    message: 'Unauthorized',
    code: 'UNAUTHORIZED',
  } as const,

  validationError: {
    error: true,
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    fields: {
      email: 'Invalid email format',
    },
  } as const,
};

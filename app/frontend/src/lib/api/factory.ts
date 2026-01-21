/**
 * API Client Factory & Configuration
 * 
 * Centralized API client initialization with built-in interceptors,
 * error handling, retry logic, and environment-aware configuration.
 */

import { getApiBaseUrl } from "@/lib/config/environment";

interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
  interceptors?: {
    request?: (config: RequestInit) => RequestInit;
    response?: (response: Response) => Promise<Response>;
    error?: (error: Error) => Promise<Error>;
  };
}

interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  skipInterceptors?: boolean;
}

/**
 * API Client factory for creating configured HTTP clients
 */
export class ApiClientFactory {
  private static instance: ApiClient | null = null;
  private static config: ApiClientConfig | null = null;

  /**
   * Initialize global API client
   */
  static initialize(config: ApiClientConfig): ApiClient {
    this.config = config;
    this.instance = new ApiClient(config);
    return this.instance;
  }

  /**
   * Get singleton API client instance
   */
  static getInstance(): ApiClient {
    if (!this.instance) {
      throw new Error(
        'API client not initialized. Call ApiClientFactory.initialize() first.'
      );
    }
    return this.instance;
  }

  /**
   * Create new API client with config
   */
  static create(config: Partial<ApiClientConfig>): ApiClient {
    const fullConfig: ApiClientConfig = {
      baseURL: config.baseURL || getDefaultBaseURL(),
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      headers: config.headers || {},
      interceptors: config.interceptors,
    };
    return new ApiClient(fullConfig);
  }

  /**
   * Reset singleton instance
   */
  static reset(): void {
    this.instance = null;
    this.config = null;
  }
}

/**
 * Configured API client
 */
export class ApiClient {
  private config: ApiClientConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  /**
   * Make GET request
   */
  async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * Make POST request
   */
  async post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Make PATCH request
   */
  async patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Make PUT request
   */
  async put<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Make DELETE request
   */
  async delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Make generic request
   */
  private async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const url = `${this.config.baseURL}${path}`;
    const timeout = options.timeout || this.config.timeout;
    const retries = options.retries !== undefined ? options.retries : this.config.retries;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let requestConfig: RequestInit = {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
            ...options.headers,
          },
          credentials: 'include', // For cookie-based auth
        };

        // Apply request interceptor
        if (
          !options.skipInterceptors &&
          this.config.interceptors?.request
        ) {
          requestConfig = this.config.interceptors.request(requestConfig);
        }

        // Setup timeout and abort controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          let response = await fetch(url, {
            ...requestConfig,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Apply response interceptor
          if (
            !options.skipInterceptors &&
            this.config.interceptors?.response
          ) {
            response = await this.config.interceptors.response(response);
          }

          if (!response.ok) {
            throw new ApiError(
              `HTTP ${response.status}`,
              response.status,
              response.statusText
            );
          }

          const data = (await response.json()) as T;
          return data;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on 4xx errors (except 408, 429)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          if (![408, 429].includes(error.status)) {
            throw error;
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Abort request
   */
  abort(key: string): void {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  /**
   * Abort all requests
   */
  abortAll(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiClientConfig {
    return { ...this.config };
  }
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  isNetworkError(): boolean {
    return this.status === 0;
  }
}

/**
 * Get default API base URL based on environment
 */
function getDefaultBaseURL(): string {
  return getApiBaseUrl();
}

/**
 * Request/Response logging interceptor
 */
export function createLoggingInterceptor() {
  return {
    request: (config: RequestInit): RequestInit => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API Request]', config);
      }
      return config;
    },
    response: async (response: Response): Promise<Response> => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API Response]', response.status, response.statusText);
      }
      return response;
    },
    error: async (error: Error): Promise<Error> => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[API Error]', error);
      }
      return error;
    },
  };
}

/**
 * Authorization interceptor
 */
export function createAuthInterceptor(getAuthToken: () => Promise<string | null>) {
  return {
    request: async (config: RequestInit): Promise<RequestInit> => {
      const token = await getAuthToken();
      if (token) {
        return {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          },
        };
      }
      return config;
    },
  };
}

/**
 * Setup global API client with sensible defaults
 */
export function setupApiClient(): ApiClient {
  const config: ApiClientConfig = {
    baseURL: getDefaultBaseURL(),
    timeout: 30000,
    retries: 3,
    headers: {
      'Content-Type': 'application/json',
    },
    interceptors: {
      request: (config) => {
        // Add CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          return {
            ...config,
            headers: {
              ...config.headers,
              'X-CSRF-Token': csrfToken,
            },
          };
        }
        return config;
      },
    },
  };

  return ApiClientFactory.initialize(config);
}

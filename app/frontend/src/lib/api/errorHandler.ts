'use client';

import { useNotification } from '@/context/ToastContext';

/**
 * API Error Handler
 *
 * Standardized error handling for API responses
 */

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
  meta: {
    timestamp: string;
  };
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Parse error response and extract meaningful message
 */
export function parseApiError(response: Response, data: any): ApiError {
  const statusCode = response.status;
  const code = data?.error?.code || `HTTP_${statusCode}`;
  const message = data?.error?.message || response.statusText || 'Unknown error';
  const details = data?.error?.details;

  return new ApiError(code, message, statusCode, details);
}

/**
 * Handle API response errors with user-friendly messages
 */
export async function handleApiError(response: Response): Promise<never> {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    const error = parseApiError(response, data);
    throw error;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }

    // Fallback for parsing errors
    throw new ApiError(
      'PARSE_ERROR',
      'Failed to parse error response',
      response.status
    );
  }
}

/**
 * User-friendly error messages based on error code
 */
const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check your input and try again',
  UNAUTHORIZED: 'Please log in to continue',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  CONFLICT: 'This action conflicts with existing data',
  RATE_LIMITED: 'Too many requests. Please try again later',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable',
  NETWORK_ERROR: 'Network connection error. Please check your internet',
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: ApiError | Error): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] || error.message;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  return 'An unexpected error occurred';
}

/**
 * Hook for API error handling with notifications
 */
export function useApiErrorHandler() {
  const { error: showError } = useNotification();

  return {
    handleError: (error: ApiError | Error, fallbackMessage?: string) => {
      const message = getUserFriendlyMessage(error);
      const title = error instanceof ApiError ? error.code : 'Error';

      showError(title, message || fallbackMessage);

      if (error instanceof ApiError && error.statusCode === 401) {
        // Redirect to login on unauthorized
        window.location.href = '/auth/login';
      }
    },

    getFieldErrors: (error: ApiError): Record<string, string> => {
      if (!error.details) return {};

      return error.details.reduce(
        (acc, detail) => {
          acc[detail.field] = detail.message;
          return acc;
        },
        {} as Record<string, string>
      );
    },
  };
}

/**
 * Fetch with standard error handling
 */
export async function fetchWithErrorHandling<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(input, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      ...init,
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = (await response.json()) as { data?: T } | T;
    return (typeof data === 'object' && data !== null && 'data' in data ? (data as { data: T }).data : data) as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Network request failed'
    );
  }
}

/**
 * Retry failed requests with exponential backoff
 */
export async function withRetryAndErrorHandling<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on client errors (4xx) or on last attempt
      if (
        attempt === maxRetries ||
        (err instanceof ApiError && err.statusCode < 500)
      ) {
        throw err;
      }

      // Wait before retrying
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Unknown error');
}

/**
 * Common error scenarios and their handling
 */
export const ErrorScenarios = {
  /**
   * Handle unauthorized (401) errors
   */
  unauthorized: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  },

  /**
   * Handle forbidden (403) errors
   */
  forbidden: (message = 'You do not have permission to perform this action') => {
    return message;
  },

  /**
   * Handle not found (404) errors
   */
  notFound: (resource = 'resource') => {
    return `The ${resource} was not found`;
  },

  /**
   * Handle validation (422) errors
   */
  validation: (details?: Array<{ field: string; message: string }>) => {
    if (!details || details.length === 0) {
      return 'Please check your input and try again';
    }

    return details.map((d) => `${d.field}: ${d.message}`).join(', ');
  },

  /**
   * Handle network errors
   */
  network: () => {
    return 'Network connection error. Please check your internet connection';
  },

  /**
   * Handle rate limiting (429) errors
   */
  rateLimited: (retryAfterSeconds?: number) => {
    if (retryAfterSeconds) {
      return `Too many requests. Please try again in ${retryAfterSeconds} seconds`;
    }
    return 'Too many requests. Please try again later';
  },
};

/**
 * Recovery Codes API Client
 *
 * Wrapper for recovery code management endpoints:
 * - Generate recovery codes
 * - Reset passphrase using recovery code
 * - Change passphrase (authenticated)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ecent.online';

// Request types
export interface GenerateRecoveryCodesRequest {
  vault_id?: string;
  count?: number;
}

export interface ResetPassphraseRequest {
  code: string;
  new_passphrase: string;
  user_id?: string;
}

export interface ChangePassphraseRequest {
  current_passphrase: string;
  new_passphrase: string;
}

// Response types
export interface GenerateRecoveryCodesResponse {
  codes: string[];
  vault_id: string;
  message: string;
}

export interface ResetPassphraseResponse {
  success: boolean;
  message: string;
  vault_id: string;
  session_token?: string;
}

export interface ChangePassphraseResponse {
  success: boolean;
  message: string;
  vault_id: string;
}

// Error response type
export interface ApiErrorResponse {
  error: string;
  details?: Record<string, unknown>;
  code?: string;
}

/**
 * Generic API request handler
 * @param path - API endpoint path
 * @param method - HTTP method
 * @param body - Request body (optional)
 * @returns Promise with response data
 */
async function apiRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const error = (data as unknown as ApiErrorResponse);
      throw new Error(error.error || `API error: ${response.status}`);
    }

    // API wraps responses in { data: {...} }
    return (data.data as T) || (data as T);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed');
  }
}

/**
 * Generate recovery codes for the user's vault
 * @param request - Optional request parameters
 * @returns Promise with generated codes
 */
export async function generateRecoveryCodes(
  request?: GenerateRecoveryCodesRequest
): Promise<GenerateRecoveryCodesResponse> {
  return apiRequest<GenerateRecoveryCodesResponse>(
    '/api/vault/recovery-codes',
    'POST',
    request as unknown as Record<string, unknown>
  );
}

/**
 * Reset passphrase using recovery code (unauthenticated)
 * @param request - Reset passphrase request
 * @returns Promise with success confirmation
 */
export async function resetPassphrase(
  request: ResetPassphraseRequest
): Promise<ResetPassphraseResponse> {
  return apiRequest<ResetPassphraseResponse>(
    '/api/vault/reset-passphrase',
    'POST',
    request as unknown as Record<string, unknown>
  );
}

/**
 * Change passphrase (authenticated)
 * Requires valid session and current passphrase
 * @param request - Change passphrase request
 * @returns Promise with success confirmation
 */
export async function changePassphrase(
  request: ChangePassphraseRequest
): Promise<ChangePassphraseResponse> {
  return apiRequest<ChangePassphraseResponse>(
    '/api/vault/change-passphrase',
    'POST',
    request as unknown as Record<string, unknown>
  );
}

/**
 * Type guard for API error responses
 */
export function isApiError(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as ApiErrorResponse).error === 'string'
  );
}

/**
 * Extract error message from API response
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isApiError(error)) {
    return error.error;
  }
  return 'An unknown error occurred';
}

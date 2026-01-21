/**
 * Vault Lock API Client
 * 
 * Provides interface for locking/unlocking vault and checking lock state.
 * Used by VaultProvider and UI components to manage vault lifecycle.
 */

import { getApiBaseUrl } from "@/lib/config/environment";

const API_BASE_URL = getApiBaseUrl();

export interface VaultLockState {
  locked_at: string | null;
  lock_reason: string | null;
}

export interface LockVaultRequest {
  reason: 'idle' | 'backgrounded' | 'logout' | 'force' | 'rotation' | 'admin';
}

export interface UnlockVaultRequest {
  passphrase: string;
}

export interface UnlockVaultResponse {
  locked_at: string | null;
  lock_reason: string | null;
}

/**
 * Lock the user's vault with specified reason
 */
export async function lockVault(reason: LockVaultRequest['reason']): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/vault/lock`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json() as Record<string, unknown>;
    throw new Error((error.message as string) || 'Failed to lock vault');
  }
}

/**
 * Unlock the user's vault with passphrase
 */
export async function unlockVault(passphrase: string): Promise<UnlockVaultResponse> {
  const response = await fetch(`${API_BASE_URL}/api/vault/unlock`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase }),
  });

  if (!response.ok) {
    const error = await response.json() as Record<string, unknown>;
    throw new Error((error.message as string) || 'Failed to unlock vault');
  }

  return response.json();
}

/**
 * Get current vault lock state
 */
export async function getVaultLockState(): Promise<VaultLockState> {
  const response = await fetch(`${API_BASE_URL}/api/vault/state`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json() as Record<string, unknown>;
    throw new Error((error.message as string) || 'Failed to fetch vault state');
  }

  return response.json();
}

/**
 * Check if vault is currently locked
 */
export async function isVaultLocked(): Promise<boolean> {
  try {
    const state = await getVaultLockState();
    return state.locked_at !== null;
  } catch (error) {
    console.error('Failed to check vault lock state:', error);
    return true; // Assume locked on error (safer default)
  }
}

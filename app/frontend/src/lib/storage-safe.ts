/**
 * Safe Storage Utilities
 *
 * Wraps localStorage access to handle cases where it's blocked
 * (incognito mode, strict browser security, CSP violations, etc.)
 */

let _hasStorageAccess: boolean | null = null;

/**
 * Check if localStorage is available
 * Caches the result to avoid repeated test writes
 */
export function canAccessStorage(): boolean {
  if (_hasStorageAccess !== null) {
    return _hasStorageAccess;
  }

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    _hasStorageAccess = false;
    return false;
  }

  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    _hasStorageAccess = true;
    return true;
  } catch (e) {
    // localStorage is blocked (incognito, CSP, security context)
    _hasStorageAccess = false;
    return false;
  }
}

/**
 * Safely get an item from localStorage
 * Returns null if storage is unavailable
 */
export function safeGetItem(key: string): string | null {
  if (!canAccessStorage()) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[StorageSafe] Failed to get item "${key}":`, e);
    return null;
  }
}

/**
 * Safely set an item in localStorage
 * Silently fails if storage is unavailable
 */
export function safeSetItem(key: string, value: string): boolean {
  if (!canAccessStorage()) {
    return false;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`[StorageSafe] Failed to set item "${key}":`, e);
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 * Silently fails if storage is unavailable
 */
export function safeRemoveItem(key: string): boolean {
  if (!canAccessStorage()) {
    return false;
  }
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`[StorageSafe] Failed to remove item "${key}":`, e);
    return false;
  }
}

/**
 * Safely clear all items from localStorage
 * Silently fails if storage is unavailable
 */
export function safeClear(): boolean {
  if (!canAccessStorage()) {
    return false;
  }
  try {
    localStorage.clear();
    return true;
  } catch (e) {
    console.warn('[StorageSafe] Failed to clear storage:', e);
    return false;
  }
}

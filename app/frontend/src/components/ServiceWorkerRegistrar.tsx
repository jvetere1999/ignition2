"use client";

import { useEffect } from "react";

/**
 * Service Worker Registration & Cache Invalidation
 * PERF-001: Browser Caching Implementation
 * Reference: MEDIUM_TASKS_EXECUTION_PLAN.md#perf-001-browser-caching
 * Status: Phase 2 & 3 - Service Worker + Cache Invalidation
 * 
 * Responsibilities:
 * 1. Register service worker on mount
 * 2. Check API cache version from backend
 * 3. Clear cache if version mismatch (cache invalidation)
 * 4. Handle registration errors gracefully
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.warn('[SW] Service Worker not supported in this browser');
      return;
    }

    // Register service worker
    const swUrl = "/sw.js";
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('[SW] Registration successful:', registration);
        
        // TODO [PERF-001]: Phase 3 - Cache Invalidation Strategy
        // Reference: MEDIUM_TASKS_EXECUTION_PLAN.md#phase-3-add-cache-invalidation
        // Roadmap: Step 3 of 4 - Add version headers for client cache invalidation
        // Status: IN_PROGRESS - Cache invalidation check implemented
        
        // Check cache version and invalidate if needed
        checkAndInvalidateCacheIfNeeded(registration);
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err);
      });
  }, []);

  return null;
}

/**
 * Check API cache version and clear cache if mismatch
 * Cache Version Source: X-Cache-Version header from backend
 * 
 * Flow:
 * 1. Fetch latest X-Cache-Version from API (no-cache to bypass browser cache)
 * 2. Compare with stored localStorage version
 * 3. If mismatch: clear service worker cache and update stored version
 * 4. If match: cache is valid, no action needed
 */
async function checkAndInvalidateCacheIfNeeded(registration: ServiceWorkerRegistration) {
  try {
    const CACHE_VERSION_KEY = 'api-cache-version';
    
    // Fetch a small endpoint to get X-Cache-Version header
    // Using no-cache to ensure we get fresh headers from server
    const response = await fetch('/api/', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
      credentials: 'include', // Include cookies for auth
    });

    // Extract version from X-Cache-Version header
    const serverVersion = response.headers.get('X-Cache-Version');
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);

    console.log('[SW] Server cache version:', serverVersion, 'Stored:', storedVersion);

    // If versions don't match, invalidate cache
    if (serverVersion && serverVersion !== storedVersion) {
      console.log('[SW] Cache version mismatch! Clearing cache...');
      
      // Send message to service worker to clear cache
      if (registration.active) {
        const channel = new MessageChannel();
        registration.active.postMessage(
          { type: 'CLEAR_CACHE' },
          [channel.port2]
        );

        // Wait for response
        channel.port1.onmessage = (event: MessageEvent) => {
          if (event.data.success) {
            console.log('[SW] Cache cleared successfully');
            // Update stored version
            localStorage.setItem(CACHE_VERSION_KEY, serverVersion);
            console.log('[SW] Updated cache version to:', serverVersion);
          } else {
            console.error('[SW] Error clearing cache:', event.data.error);
          }
        };
      }
    } else {
      console.log('[SW] Cache version matches, no invalidation needed');
    }
  } catch (error) {
    // If API fetch fails (might be offline), don't clear cache
    // This preserves cached data when network is unavailable
    console.warn('[SW] Could not check cache version (offline?):', error);
  }
}


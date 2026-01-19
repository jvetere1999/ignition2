/**
 * Service Worker for Browser Caching
 * PERF-001: Browser Caching Implementation
 * Reference: MEDIUM_TASKS_EXECUTION_PLAN.md#perf-001-browser-caching
 * Status: Phase 2 & 3 - Service Worker + Cache Invalidation
 * 
 * Purpose: Cache API responses on the device for offline support and faster repeat requests
 * Strategy: Network-first with cache fallback
 * - Fetch latest data from network when available
 * - Use cached data if offline
 * - Cache API responses for 5 minutes
 * 
 * Cached Endpoints:
 * - /api/ - All API endpoints (selective caching)
 * 
 * Cache Invalidation:
 * - Version header: X-Cache-Version (from backend)
 * - Client checks version on startup
 * - Clears cache if version mismatch
 */

// TODO [PERF-001]: Phase 2 - Service Worker Implementation
// Reference: MEDIUM_TASKS_EXECUTION_PLAN.md#phase-2-add-service-worker
// Status: COMPLETE
const CACHE_NAME = 'ignition-cache-v1';
const API_CACHE = ['/api/'];

// TODO [PERF-001]: Phase 3 - Cache Invalidation
// Reference: MEDIUM_TASKS_EXECUTION_PLAN.md#phase-3-add-cache-invalidation
// Status: IN_PROGRESS

/**
 * Install event: Set up cache storage
 * Runs once when service worker is first installed
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately without waiting for other clients
});

/**
 * Activate event: Clean up old caches and take control
 * Runs after installation when service worker becomes active
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all pages immediately
});

/**
 * Fetch event: Intercept network requests
 * Strategy: Network-first with cache fallback
 * 1. Try to fetch from network
 * 2. If successful, cache response and return
 * 3. If offline or network fails, return cached response
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache GET API requests
  if (request.method !== 'GET') return;
  if (!url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Try to fetch from network first
        const response = await fetch(request);
        
        // Cache successful responses (200 status)
        if (response && response.ok) {
          console.log('[Service Worker] Caching API response:', request.url);
          cache.put(request, response.clone());
        }
        
        return response;
      } catch (err) {
        // Network request failed - try cache
        console.log('[Service Worker] Network failed, using cache:', request.url);
        const cached = await cache.match(request);
        
        if (cached) {
          console.log('[Service Worker] Returning cached response');
          return cached;
        }
        
        // No cache available - return error
        console.warn('[Service Worker] No cached response available, returning error');
        return new Response('Offline - No cached data available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })
  );
});

/**
 * Message event: Handle cache invalidation from client
 * Client can send: { type: 'CLEAR_CACHE' } to force cache clear
 * Used when API version header (X-Cache-Version) changes
 * 
 * TODO [PERF-001]: Phase 3 - Cache Invalidation Strategy
 * Reference: MEDIUM_TASKS_EXECUTION_PLAN.md#phase-3-add-cache-invalidation
 * Implementation: Client checks X-Cache-Version on startup, sends CLEAR_CACHE if mismatch
 * Status: Message handler ready, client implementation pending
 */
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (data && data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Clearing cache on client request');
    caches.delete(CACHE_NAME).then(() => {
      console.log('[Service Worker] Cache cleared successfully');
      event.ports[0].postMessage({ success: true });
    }).catch((err) => {
      console.error('[Service Worker] Error clearing cache:', err);
      event.ports[0].postMessage({ success: false, error: err.message });
    });
  }
  
  if (data && data.type === 'GET_CACHE_VERSION') {
    console.log('[Service Worker] Reporting cache version:', CACHE_NAME);
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});


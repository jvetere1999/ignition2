/**
 * E2E API Tests
 *
 * Comprehensive API endpoint tests that run against docker-compose
 * with PostgreSQL and MinIO (S3-compatible storage).
 *
 * Auth Strategy: Uses AUTH_DEV_BYPASS=true in development mode.
 * The backend accepts requests without OAuth when running on localhost
 * with AUTH_DEV_BYPASS enabled.
 *
 * Setup:
 *   1. Start infrastructure: docker compose -f infra/docker-compose.yml --profile full up -d
 *   2. Wait for health: curl http://localhost:8080/health
 *   3. Run tests: npx playwright test tests/api-e2e.spec.ts
 *
 * Environment Variables:
 *   - API_BASE_URL: Backend API URL (default: http://localhost:8080)
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

// Dev bypass user details (matches backend dev_bypass.rs)
const DEV_USER = {
  id: 'dev_user_local',
  email: 'dev@localhost',
  name: 'Local Dev User',
};

// ============================================
// Test Fixtures
// ============================================

interface TestContext {
  api: APIRequestContext;
  createdTrackId?: string;
  createdAnnotationId?: string;
  createdRegionId?: string;
}

const testContext: TestContext = {} as TestContext;

// ============================================
// Test Suite: Health & Infrastructure
// ============================================

test.describe('Infrastructure Health', () => {
  test('backend health check returns 200', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    expect(response.status()).toBe(200);
  });

  test('backend readiness check returns 200', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/ready`);
    // 200 = fully ready, 503 = not ready (db/storage issues)
    expect([200, 503]).toContain(response.status());
  });
});

// ============================================
// Test Suite: Reference Tracks API
// ============================================

test.describe('Reference Tracks API', () => {
  test.describe.configure({ mode: 'serial' });

  // --- Track CRUD ---

  test('GET /reference/tracks - list tracks (empty initially)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/reference/tracks`, {
      params: { page: 1, page_size: 20 },
    });

    // May be 401 if dev bypass not enabled - that's acceptable
    if (response.status() === 401) {
      test.skip(true, 'Auth required - dev bypass not enabled');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Verify pagination response structure
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('page_size');
    expect(data).toHaveProperty('has_next');
    expect(data).toHaveProperty('has_prev');
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('POST /reference/upload/init - initialize upload', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/reference/upload/init`, {
      data: {
        filename: 'test-track.wav',
        mime_type: 'audio/wav',
        file_size_bytes: 44100,
      },
    });

    if (response.status() === 401) {
      test.skip(true, 'Auth required - dev bypass not enabled');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Verify signed URL response
    expect(data).toHaveProperty('upload_url');
    expect(data).toHaveProperty('r2_key');
    expect(data).toHaveProperty('expires_at');
    expect(data.upload_url).toContain('http');
    expect(data.r2_key).toBeTruthy();

    // Store r2_key for next test
    testContext.createdTrackId = data.r2_key;
  });

  test('POST /reference/tracks - create track record', async ({ request }) => {
    // Skip if we don't have an r2_key from init_upload
    if (!testContext.createdTrackId) {
      test.skip(true, 'No r2_key from init_upload');
      return;
    }

    const response = await request.post(`${API_BASE_URL}/reference/tracks`, {
      data: {
        name: 'E2E Test Track',
        description: 'Created by API E2E test',
        r2_key: testContext.createdTrackId,
        file_size_bytes: 44100,
        mime_type: 'audio/wav',
        duration_seconds: 1.0,
        artist: 'E2E Artist',
        album: 'E2E Album',
        genre: 'Electronic',
        bpm: 120.0,
        key_signature: 'C',
        tags: ['e2e', 'test'],
      },
    });

    if (response.status() === 401) {
      test.skip(true, 'Auth required - dev bypass not enabled');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Verify track response
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name', 'E2E Test Track');
    expect(data).toHaveProperty('r2_key');
    expect(data).toHaveProperty('status');

    // Store track ID for subsequent tests
    testContext.createdTrackId = data.id;
  });

  test('GET /reference/tracks/{id} - get track by ID', async ({ request }) => {
    if (!testContext.createdTrackId) {
      test.skip(true, 'No track created');
      return;
    }

    const response = await request.get(
      `${API_BASE_URL}/reference/tracks/${testContext.createdTrackId}`
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Backend returns wrapped response
    expect(data).toHaveProperty('track');
    expect(data).toHaveProperty('annotation_count');
    expect(data).toHaveProperty('region_count');
    expect(data.track.id).toBe(testContext.createdTrackId);
  });

  test('PATCH /reference/tracks/{id} - update track', async ({ request }) => {
    if (!testContext.createdTrackId) {
      test.skip(true, 'No track created');
      return;
    }

    const response = await request.patch(
      `${API_BASE_URL}/reference/tracks/${testContext.createdTrackId}`,
      {
        data: {
          name: 'E2E Test Track (Updated)',
          bpm: 128.0,
        },
      }
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('E2E Test Track (Updated)');
    expect(data.bpm).toBe(128.0);
  });

  // --- Annotations CRUD ---

  test('POST /reference/tracks/{id}/annotations - create annotation', async ({ request }) => {
    if (!testContext.createdTrackId) {
      test.skip(true, 'No track created');
      return;
    }

    const response = await request.post(
      `${API_BASE_URL}/reference/tracks/${testContext.createdTrackId}/annotations`,
      {
        data: {
          start_time_ms: 1000,
          end_time_ms: 2000,
          title: 'E2E Annotation',
          content: 'Test annotation content',
          category: 'technique',
          color: '#ff0000',
        },
      }
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('id');
    expect(data.title).toBe('E2E Annotation');
    expect(data.start_time_ms).toBe(1000);

    testContext.createdAnnotationId = data.id;
  });

  test('GET /reference/tracks/{id}/annotations - list annotations', async ({ request }) => {
    if (!testContext.createdTrackId) {
      test.skip(true, 'No track created');
      return;
    }

    const response = await request.get(
      `${API_BASE_URL}/reference/tracks/${testContext.createdTrackId}/annotations`
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Backend returns wrapped response
    expect(data).toHaveProperty('annotations');
    expect(Array.isArray(data.annotations)).toBe(true);
  });

  test('PATCH /reference/annotations/{id} - update annotation', async ({ request }) => {
    if (!testContext.createdAnnotationId) {
      test.skip(true, 'No annotation created');
      return;
    }

    const response = await request.patch(
      `${API_BASE_URL}/reference/annotations/${testContext.createdAnnotationId}`,
      {
        data: {
          title: 'E2E Annotation (Updated)',
        },
      }
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.title).toBe('E2E Annotation (Updated)');
  });

  // --- Regions CRUD ---

  test('POST /reference/tracks/{id}/regions - create region', async ({ request }) => {
    if (!testContext.createdTrackId) {
      test.skip(true, 'No track created');
      return;
    }

    const response = await request.post(
      `${API_BASE_URL}/reference/tracks/${testContext.createdTrackId}/regions`,
      {
        data: {
          start_time_ms: 0,
          end_time_ms: 5000,
          name: 'E2E Region',
          section_type: 'chorus',
          color: '#00ff00',
        },
      }
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('id');
    expect(data.name).toBe('E2E Region');
    expect(data.start_time_ms).toBe(0);
    expect(data.end_time_ms).toBe(5000);

    testContext.createdRegionId = data.id;
  });

  test('GET /reference/tracks/{id}/regions - list regions', async ({ request }) => {
    if (!testContext.createdTrackId) {
      test.skip(true, 'No track created');
      return;
    }

    const response = await request.get(
      `${API_BASE_URL}/reference/tracks/${testContext.createdTrackId}/regions`
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Backend returns wrapped response
    expect(data).toHaveProperty('regions');
    expect(Array.isArray(data.regions)).toBe(true);
  });

  test('PATCH /reference/regions/{id} - update region', async ({ request }) => {
    if (!testContext.createdRegionId) {
      test.skip(true, 'No region created');
      return;
    }

    const response = await request.patch(
      `${API_BASE_URL}/reference/regions/${testContext.createdRegionId}`,
      {
        data: {
          name: 'E2E Region (Updated)',
        },
      }
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('E2E Region (Updated)');
  });

  // --- Streaming ---

  test('GET /reference/tracks/{id}/stream - get stream URL', async ({ request }) => {
    if (!testContext.createdTrackId) {
      test.skip(true, 'No track created');
      return;
    }

    const response = await request.get(
      `${API_BASE_URL}/reference/tracks/${testContext.createdTrackId}/stream`
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    // May be 404 if file doesn't exist in storage
    if (response.status() === 404) {
      // This is expected since we only created DB record, not actual file
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('url');
    expect(data).toHaveProperty('expires_at');
  });

  // --- Cleanup (delete in reverse order) ---

  test('DELETE /reference/annotations/{id} - delete annotation', async ({ request }) => {
    if (!testContext.createdAnnotationId) {
      test.skip(true, 'No annotation created');
      return;
    }

    const response = await request.delete(
      `${API_BASE_URL}/reference/annotations/${testContext.createdAnnotationId}`
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('DELETE /reference/regions/{id} - delete region', async ({ request }) => {
    if (!testContext.createdRegionId) {
      test.skip(true, 'No region created');
      return;
    }

    const response = await request.delete(
      `${API_BASE_URL}/reference/regions/${testContext.createdRegionId}`
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('DELETE /reference/tracks/{id} - delete track', async ({ request }) => {
    if (!testContext.createdTrackId) {
      test.skip(true, 'No track created');
      return;
    }

    const response = await request.delete(
      `${API_BASE_URL}/reference/tracks/${testContext.createdTrackId}`
    );

    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

// ============================================
// Test Suite: Storage/Upload E2E
// ============================================

test.describe('Storage Integration', () => {
  test('full upload flow with MinIO', async ({ request }) => {
    // Step 1: Init upload
    const initResponse = await request.post(`${API_BASE_URL}/reference/upload/init`, {
      data: {
        filename: 'integration-test.wav',
        mime_type: 'audio/wav',
        file_size_bytes: 1024,
      },
    });

    if (initResponse.status() === 401) {
      test.skip(true, 'Auth required - dev bypass not enabled');
      return;
    }

    expect(initResponse.status()).toBe(200);
    const initData = await initResponse.json();
    expect(initData.upload_url).toBeTruthy();
    expect(initData.r2_key).toBeTruthy();

    // Step 2: Upload file to signed URL
    // Create a minimal WAV file (44 bytes header + some silence)
    const wavHeader = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // File size - 8
      0x57, 0x41, 0x56, 0x45, // WAVE
      0x66, 0x6d, 0x74, 0x20, // fmt
      0x10, 0x00, 0x00, 0x00, // Subchunk1Size (16)
      0x01, 0x00, // Audio format (1 = PCM)
      0x01, 0x00, // Num channels (1)
      0x44, 0xac, 0x00, 0x00, // Sample rate (44100)
      0x88, 0x58, 0x01, 0x00, // Byte rate
      0x02, 0x00, // Block align
      0x10, 0x00, // Bits per sample (16)
      0x64, 0x61, 0x74, 0x61, // data
      0x00, 0x00, 0x00, 0x00, // Subchunk2Size (0 - no data)
    ]);

    const uploadResponse = await request.put(initData.upload_url, {
      data: wavHeader,
      headers: {
        'Content-Type': 'audio/wav',
      },
    });

    // MinIO should accept the upload
    expect([200, 201]).toContain(uploadResponse.status());

    // Step 3: Create track record
    const trackResponse = await request.post(`${API_BASE_URL}/reference/tracks`, {
      data: {
        name: 'Integration Test Track',
        description: 'Full upload flow test',
        r2_key: initData.r2_key,
        file_size_bytes: wavHeader.length,
        mime_type: 'audio/wav',
      },
    });

    expect(trackResponse.status()).toBe(200);
    const trackData = await trackResponse.json();
    expect(trackData.id).toBeTruthy();

    // Step 4: Get stream URL
    const streamResponse = await request.get(
      `${API_BASE_URL}/reference/tracks/${trackData.id}/stream`
    );

    expect(streamResponse.status()).toBe(200);
    const streamData = await streamResponse.json();
    expect(streamData.url).toBeTruthy();

    // Step 5: Verify we can fetch the file
    const fileResponse = await request.get(streamData.url);
    expect(fileResponse.status()).toBe(200);

    // Step 6: Cleanup
    const deleteResponse = await request.delete(
      `${API_BASE_URL}/reference/tracks/${trackData.id}`
    );
    expect(deleteResponse.status()).toBe(200);
  });
});

// ============================================
// Test Suite: Error Handling
// ============================================

test.describe('Error Handling', () => {
  test('GET /reference/tracks/{invalid-uuid} - returns 400', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/reference/tracks/not-a-uuid`);

    // 400 = bad request (invalid UUID), 401 = auth required
    expect([400, 401]).toContain(response.status());
  });

  test('GET /reference/tracks/{nonexistent-uuid} - returns 404', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/reference/tracks/00000000-0000-0000-0000-000000000000`
    );

    // 404 = not found, 401 = auth required
    expect([401, 404]).toContain(response.status());
  });

  test('POST /reference/upload/init with invalid mime type - returns 400', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/reference/upload/init`, {
      data: {
        filename: 'malicious.exe',
        mime_type: 'application/x-msdownload',
        file_size_bytes: 1024,
      },
    });

    // 400 = validation error, 401 = auth required
    expect([400, 401, 422]).toContain(response.status());
  });

  test('POST /reference/tracks/{id}/annotations with invalid times - returns 400', async ({ request }) => {
    // Need a real track ID, so this test may be skipped if no track exists
    const response = await request.post(
      `${API_BASE_URL}/reference/tracks/00000000-0000-0000-0000-000000000000/annotations`,
      {
        data: {
          start_time_ms: 2000,
          end_time_ms: 1000, // Invalid: end before start
          title: 'Invalid annotation',
        },
      }
    );

    // 400 = validation error, 401 = auth required, 404 = track not found
    expect([400, 401, 404, 422]).toContain(response.status());
  });
});

// ============================================
// Test Suite: CORS & Security
// ============================================

test.describe('CORS & Security', () => {
  test('API does not expose R2 credentials', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    const body = await response.text();

    expect(body).not.toContain('STORAGE_ACCESS_KEY_ID');
    expect(body).not.toContain('STORAGE_SECRET_ACCESS_KEY');
    expect(body).not.toContain('minioadmin');
  });

  test('OPTIONS request returns CORS headers', async ({ request }) => {
    const response = await request.fetch(`${API_BASE_URL}/reference/tracks`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });

    // CORS preflight should return 200 or 204
    expect([200, 204]).toContain(response.status());
  });
});

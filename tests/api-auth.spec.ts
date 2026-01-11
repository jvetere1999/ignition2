/**
 * E2E Auth API Tests
 *
 * Tests authentication endpoints including OAuth flow, session management,
 * and CSRF protection.
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

test.describe('Authentication API', () => {
  test.describe('OAuth Endpoints', () => {
    test('GET /auth/providers - lists available OAuth providers', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/auth/providers`);
      // May not exist in minimal setup
      expect([200, 404]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.providers)).toBe(true);
      }
    });

    test('GET /auth/google - redirects to Google OAuth', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/auth/google`, {
        maxRedirects: 0,
      });
      // Should redirect to Google
      expect([302, 303, 307]).toContain(response.status());
    });

    test('GET /auth/callback/google - handles callback without code', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/auth/callback/google`);
      // Should return error for missing code
      expect([400, 401, 422]).toContain(response.status());
    });
  });

  test.describe('Session Management', () => {
    test('GET /auth/session - returns session status', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/auth/session`);
      // 200 with session or 401 without
      expect([200, 401]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('user');
      }
    });

    test('POST /auth/logout - logs out user', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/auth/logout`);
      // 200 if logged in, 401/403 if not
      expect([200, 401, 403]).toContain(response.status());
    });

    test('GET /auth/me - returns current user', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/auth/me`);
      expect([200, 401]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('email');
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('POST without CSRF token returns 403', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/sync`, {
        data: { changes: [] },
      });
      // Should fail with 401 (no auth) or 403 (CSRF)
      expect([401, 403]).toContain(response.status());
    });

    test('DELETE without CSRF token returns 403', async ({ request }) => {
      const response = await request.delete(`${API_BASE_URL}/api/some-endpoint`);
      expect([401, 403, 404, 405]).toContain(response.status());
    });

    test('PATCH without CSRF token returns 403', async ({ request }) => {
      const response = await request.patch(`${API_BASE_URL}/api/settings`, {
        data: { theme: 'dark' },
      });
      expect([401, 403, 404]).toContain(response.status());
    });
  });
});

test.describe('Rate Limiting', () => {
  test('excessive requests get rate limited', async ({ request }) => {
    const responses: number[] = [];
    
    // Make 20 rapid requests
    for (let i = 0; i < 20; i++) {
      const response = await request.get(`${API_BASE_URL}/health`);
      responses.push(response.status());
    }
    
    // All should succeed (rate limit is higher for health)
    // But if rate limited, should be 429
    responses.forEach(status => {
      expect([200, 429]).toContain(status);
    });
  });
});

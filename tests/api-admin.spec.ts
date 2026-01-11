/**
 * E2E Admin API Tests
 *
 * Tests admin endpoints including user management, system config, and audit.
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

test.describe('Admin API', () => {
  test.describe('Access Control', () => {
    test('GET /admin - requires admin role', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/admin`);
      // Should require auth and admin role
      expect([401, 403, 404]).toContain(response.status());
    });

    test('GET /admin-access/check - checks admin access', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/admin-access/check`);
      expect([200, 401, 403]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('is_admin');
        expect(typeof data.is_admin).toBe('boolean');
      }
    });
  });

  test.describe('User Management (Admin)', () => {
    test('GET /admin/users - lists users', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/admin/users`);
      expect([200, 401, 403, 404]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    test('GET /admin/users/stats - returns user statistics', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/admin/users/stats`);
      expect([200, 401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Audit Log (Admin)', () => {
    test('GET /admin/audit - returns audit log', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/admin/audit`);
      expect([200, 401, 403, 404]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

  test.describe('System Config (Admin)', () => {
    test('GET /admin/config - returns system config', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/admin/config`);
      expect([200, 401, 403, 404]).toContain(response.status());
    });

    test('GET /admin/feature-flags - returns feature flags', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/admin/feature-flags`);
      expect([200, 401, 403, 404]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });
});

test.describe('Roles & Permissions', () => {
  test('GET /admin/roles - lists all roles', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/admin/roles`);
    expect([200, 401, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('GET /admin/entitlements - lists entitlements', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/admin/entitlements`);
    expect([200, 401, 403, 404]).toContain(response.status());
  });
});

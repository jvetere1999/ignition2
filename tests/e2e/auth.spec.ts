import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Helper: Get auth token for test user
 */
async function getAuthToken(request) {
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: 'test@example.com',
      password: 'TestPass123!'
    }
  });
  
  if (loginRes.status() !== 200) {
    // Try to register first
    await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: 'test@example.com',
        password: 'TestPass123!',
        name: 'Test User'
      }
    });
  }
  
  const loginData = await loginRes.json();
  return loginData.token || loginData.session_id;
}

test.describe('Authentication Flow', () => {
  test('Complete user login flow', async ({ request, page }) => {
    // Step 1: Navigate to login
    await page.goto(`${BASE_URL}/login`);
    expect(page.url()).toContain('/login');
    
    // Step 2: Submit login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // Step 3: Verify redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('OAuth Google login redirect', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/auth/signin/google`, {
      followLocation: false
    });
    
    // Should redirect to Google OAuth
    expect([301, 302, 303, 307, 308]).toContain(res.status());
    const location = res.headers()['location'];
    expect(location).toContain('accounts.google.com');
  });

  test('Token refresh works', async ({ request }) => {
    const token = await getAuthToken(request);
    
    const refreshRes = await request.post(`${API_URL}/api/auth/refresh`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect([200, 202]).toContain(refreshRes.status());
    const refreshData = await refreshRes.json();
    expect(refreshData.token).toBeTruthy();
  });

  test('Invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: 'Bearer invalid_token_123' }
    });
    
    expect(res.status()).toBe(401);
  });

  test('Logout clears session', async ({ request, page }) => {
    // Step 1: Login
    const token = await getAuthToken(request);
    await page.goto(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Step 2: Logout
    const logoutRes = await request.post(`${API_URL}/api/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([200, 204]).toContain(logoutRes.status());
    
    // Step 3: Verify redirect to login
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL('**/login', { timeout: 3000 });
    expect(page.url()).toContain('/login');
  });

  test('Unauthenticated access redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL('**/login', { timeout: 3000 });
    expect(page.url()).toContain('/login');
  });
});

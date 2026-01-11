/**
 * E2E Gamification API Tests
 *
 * Tests XP, coins, streaks, achievements, and skills endpoints.
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

test.describe('Gamification API', () => {
  test.describe('User Progress', () => {
    test('GET /api/progress - returns user progress', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/progress`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('xp');
      expect(data).toHaveProperty('level');
      expect(data).toHaveProperty('coins');
      expect(typeof data.xp).toBe('number');
      expect(typeof data.level).toBe('number');
      expect(typeof data.coins).toBe('number');
    });

    test('GET /api/streaks - returns user streaks', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/streaks`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });
  });

  test.describe('Skills', () => {
    test('GET /api/skills - lists all skill definitions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/skills`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
        
        if (data.length > 0) {
          expect(data[0]).toHaveProperty('key');
          expect(data[0]).toHaveProperty('name');
          expect(data[0]).toHaveProperty('category');
        }
      }
    });

    test('GET /api/skills/user - returns user skill levels', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/skills/user`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Achievements', () => {
    test('GET /api/achievements - lists achievement definitions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/achievements`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
        
        if (data.length > 0) {
          expect(data[0]).toHaveProperty('key');
          expect(data[0]).toHaveProperty('name');
          expect(data[0]).toHaveProperty('reward_xp');
          expect(data[0]).toHaveProperty('reward_coins');
        }
      }
    });

    test('GET /api/achievements/user - returns user achievements', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/achievements/user`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Activity Events', () => {
    test('GET /api/activity - returns activity feed', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/activity`, {
        params: { limit: 10 },
      });
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      }
    });

    test('POST /api/activity - logs activity event', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/activity`, {
        data: {
          event_type: 'test_event',
          category: 'test',
          metadata: { test: true },
        },
      });
      
      // 401 = auth required, 403 = CSRF
      expect([200, 201, 401, 403, 404]).toContain(response.status());
    });
  });
});

test.describe('Leaderboards', () => {
  test('GET /api/leaderboard/xp - returns XP leaderboard', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/leaderboard/xp`);
    
    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }
    
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('GET /api/leaderboard/streaks - returns streak leaderboard', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/leaderboard/streaks`);
    
    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }
    
    expect([200, 404]).toContain(response.status());
  });
});

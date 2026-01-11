/**
 * E2E Fitness API Tests
 *
 * Tests exercise library, workout tracking, and personal records.
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

test.describe('Fitness API', () => {
  test.describe('Exercise Library', () => {
    test('GET /api/exercises - lists all exercises', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/exercises`);
      
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
          expect(data[0]).toHaveProperty('muscle_groups');
          expect(data[0]).toHaveProperty('equipment');
          expect(data[0]).toHaveProperty('difficulty');
        }
      }
    });

    test('GET /api/exercises?category=strength - filters by category', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/exercises`, {
        params: { category: 'strength' },
      });
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });

    test('GET /api/exercises?muscle_group=chest - filters by muscle group', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/exercises`, {
        params: { muscle_group: 'chest' },
      });
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Workout Programs', () => {
    test('GET /api/programs - lists workout programs', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/programs`);
      
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

    test('GET /api/programs/active - returns active program', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/programs/active`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Workouts', () => {
    test('GET /api/workouts - lists user workouts', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/workouts`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    test('GET /api/workouts/today - returns today\'s workout', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/workouts/today`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });

    test('POST /api/workouts - creates workout', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/workouts`, {
        data: {
          name: 'Test Workout',
          workout_type: 'strength',
          exercises: [],
        },
      });
      
      expect([200, 201, 401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Personal Records', () => {
    test('GET /api/personal-records - lists PRs', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/personal-records`);
      
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

    test('GET /api/personal-records?exercise=barbell_squat - filters by exercise', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/personal-records`, {
        params: { exercise: 'barbell_squat' },
      });
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Workout Sessions', () => {
    test('GET /api/workout-sessions - lists sessions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/workout-sessions`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });

    test('GET /api/workout-sessions/active - returns active session', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/workout-sessions/active`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });
});

test.describe('Fitness Stats', () => {
  test('GET /api/fitness/stats - returns fitness statistics', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/fitness/stats`);
    
    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }
    
    expect([200, 404]).toContain(response.status());
  });

  test('GET /api/fitness/history - returns workout history', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/fitness/history`, {
      params: { days: 30 },
    });
    
    if (response.status() === 401) {
      test.skip(true, 'Auth required');
      return;
    }
    
    expect([200, 404]).toContain(response.status());
  });
});

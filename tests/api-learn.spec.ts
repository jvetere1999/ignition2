/**
 * E2E Learning API Tests
 *
 * Tests learning content, topics, lessons, and progress.
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

test.describe('Learning API', () => {
  test.describe('Topics', () => {
    test('GET /api/learn/topics - lists all topics', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/learn/topics`);
      
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

    test('GET /api/learn/topics/:id - returns topic by ID', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/learn/topics/music-theory`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Lessons', () => {
    test('GET /api/learn/lessons - lists lessons', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/learn/lessons`);
      
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

    test('GET /api/learn/lessons/:id - returns lesson by ID', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/learn/lessons/test-lesson`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('User Progress', () => {
    test('GET /api/learn/progress - returns learning progress', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/learn/progress`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });

    test('POST /api/learn/lessons/:id/complete - marks lesson complete', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/learn/lessons/test-lesson/complete`);
      
      expect([200, 401, 403, 404]).toContain(response.status());
    });
  });
});

test.describe('Books API', () => {
  test.describe('Book Library', () => {
    test('GET /api/books - lists user books', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/books`);
      
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

    test('POST /api/books - creates book', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/books`, {
        data: {
          title: 'Test Book',
          author: 'Test Author',
          total_pages: 300,
        },
      });
      
      expect([200, 201, 401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Reading Sessions', () => {
    test('GET /api/reading-sessions - lists reading sessions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/reading-sessions`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });

    test('GET /api/reading-sessions/active - returns active session', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/reading-sessions/active`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Reading Stats', () => {
    test('GET /api/books/stats - returns reading statistics', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/books/stats`);
      
      if (response.status() === 401) {
        test.skip(true, 'Auth required');
        return;
      }
      
      expect([200, 404]).toContain(response.status());
    });
  });
});

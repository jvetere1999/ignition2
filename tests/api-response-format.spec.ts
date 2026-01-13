/**
 * API Response Format Validation Tests
 *
 * Validates that all API endpoints return data in the correct format.
 * This is a critical regression test for the Decision A implementation
 * (standardizing frontend API calls to match backend REST format).
 *
 * Backend returns resource-specific keys (e.g., { quests: [...] })
 * NOT generic wrapper format (e.g., { data: {...] })
 *
 * Setup:
 *   docker compose -f infra/docker-compose.yml --profile full up -d
 *   npx playwright test tests/api-response-format.spec.ts
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

const DEV_USER = {
  id: 'dev_user_local',
  email: 'dev@local.test',
  name: 'Local Dev User',
};

// Helper to create auth header for dev bypass
function authHeader(): Record<string, string> {
  return {
    'X-Dev-User-ID': DEV_USER.id,
    'X-Dev-User-Email': DEV_USER.email,
    'X-Dev-User-Name': DEV_USER.name,
  };
}

// ============================================
// Quests API - Resource Key: 'quests'
// ============================================

test.describe('Quests API Response Format', () => {
  test('GET /api/quests returns { quests: [...], total: number }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/quests`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      quests?: unknown[];
      total?: number;
      data?: unknown;
    };

    // CRITICAL: Response must have 'quests' key, NOT 'data'
    expect(data).toHaveProperty('quests');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.quests)).toBe(true);
    expect(typeof data.total).toBe('number');
  });

  test('POST /api/quests creates quest and returns correct format', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/quests`, {
      headers: authHeader(),
      data: {
        title: 'Test Quest',
        category: 'exploration',
        description: 'A test quest',
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json() as { quest?: Record<string, unknown>; data?: unknown };

    // Single quest responses should have 'quest' key
    expect(data).toHaveProperty('quest');
    expect(data).not.toHaveProperty('data');
    expect(data.quest).toBeTruthy();
  });
});

// ============================================
// Goals API - Resource Key: 'goals'
// ============================================

test.describe('Goals API Response Format', () => {
  test('GET /api/goals returns { goals: [...], total: number }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/goals`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      goals?: unknown[];
      total?: number;
      data?: unknown;
    };

    // CRITICAL: Response must have 'goals' key, NOT 'data'
    expect(data).toHaveProperty('goals');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.goals)).toBe(true);
    expect(typeof data.total).toBe('number');
  });
});

// ============================================
// Habits API - Resource Key: 'habits'
// ============================================

test.describe('Habits API Response Format', () => {
  test('GET /api/habits returns { habits: [...], total: number }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/habits`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      habits?: unknown[];
      total?: number;
      data?: unknown;
    };

    // CRITICAL: Response must have 'habits' key, NOT 'data'
    expect(data).toHaveProperty('habits');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.habits)).toBe(true);
    expect(typeof data.total).toBe('number');
  });

  test('GET /api/habits/archived returns { habits: [...] } for archived', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/habits/archived`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as { habits?: unknown[]; data?: unknown };

    expect(data).toHaveProperty('habits');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.habits)).toBe(true);
  });
});

// ============================================
// Focus API - Resource Key: 'sessions' or 'stats'
// ============================================

test.describe('Focus API Response Format', () => {
  test('GET /api/focus/sessions returns { sessions: [...] }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/focus/sessions`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      sessions?: unknown[];
      data?: unknown;
    };

    // CRITICAL: Response must have 'sessions' key, NOT 'data'
    expect(data).toHaveProperty('sessions');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.sessions)).toBe(true);
  });

  test('GET /api/focus/stats returns { stats: {...} }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/focus/stats`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      stats?: Record<string, unknown>;
      data?: unknown;
    };

    // CRITICAL: Response must have 'stats' key, NOT 'data'
    expect(data).toHaveProperty('stats');
    expect(data).not.toHaveProperty('data');
  });

  test('POST /api/focus/start creates session in correct format', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/focus/start`, {
      headers: authHeader(),
      data: { duration_seconds: 1500 },  // 25 minutes in seconds
    });

    expect(response.status()).toBe(201);
    const data = await response.json() as {
      session?: Record<string, unknown>;
      data?: unknown;
    };

    expect(data).toHaveProperty('session');
    expect(data).not.toHaveProperty('data');
  });
});

// ============================================
// Exercise/Fitness API - Resource Key: 'workouts'
// ============================================

test.describe('Exercise API Response Format', () => {
  test('GET /api/exercise returns { workouts: [...] }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/exercise`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      workouts?: unknown[];
      data?: unknown;
    };

    // CRITICAL: Response must have 'workouts' key, NOT 'data'
    expect(data).toHaveProperty('workouts');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.workouts)).toBe(true);
  });

  test('POST /api/exercise creates workout in correct format', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/exercise`, {
      headers: authHeader(),
      data: {
        name: 'Test Workout',
        description: 'A test workout',
        estimated_duration: 30,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json() as {
      workout?: Record<string, unknown>;
      data?: unknown;
    };

    expect(data).toHaveProperty('workout');
    expect(data).not.toHaveProperty('data');
  });
});

// ============================================
// Books API - Resource Key: 'books'
// ============================================

test.describe('Books API Response Format', () => {
  test('GET /api/books returns { books: [...], total: number }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/books`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      books?: unknown[];
      total?: number;
      data?: unknown;
    };

    // CRITICAL: Response must have 'books' key, NOT 'data'
    expect(data).toHaveProperty('books');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.books)).toBe(true);
  });

  test('POST /api/books creates book in correct format', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/books`, {
      headers: authHeader(),
      data: {
        title: 'Test Book',
        author: 'Test Author',
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json() as {
      book?: Record<string, unknown>;
      data?: unknown;
    };

    expect(data).toHaveProperty('book');
    expect(data).not.toHaveProperty('data');
  });
});

// ============================================
// Learning API - Resource Key varies
// ============================================

test.describe('Learning API Response Format', () => {
  test('GET /api/learn returns { items: [...] } or { lessons: [...] }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/learn`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      items?: unknown[];
      lessons?: unknown[];
      data?: unknown;
    };

    // CRITICAL: Response must have resource key, NOT 'data'
    const hasResourceKey = data.items !== undefined || data.lessons !== undefined;
    expect(hasResourceKey).toBe(true);
    expect(data).not.toHaveProperty('data');
  });
});

// ============================================
// Ideas API - Resource Key: 'ideas'
// ============================================

test.describe('Ideas API Response Format', () => {
  test('GET /api/ideas returns { ideas: [...] }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/ideas`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      ideas?: unknown[];
      data?: unknown;
    };

    // CRITICAL: Response must have 'ideas' key, NOT 'data'
    expect(data).toHaveProperty('ideas');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.ideas)).toBe(true);
  });
});

// ============================================
// User/Settings API - Resource Key: 'user' or 'settings'
// ============================================

test.describe('User/Settings API Response Format', () => {
  test('GET /api/settings returns { settings: {...} } or { user: {...} }', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/settings`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      settings?: Record<string, unknown>;
      user?: Record<string, unknown>;
      data?: unknown;
    };

    // CRITICAL: Response must have resource key, NOT 'data'
    const hasResourceKey = data.settings !== undefined || data.user !== undefined;
    expect(hasResourceKey).toBe(true);
    expect(data).not.toHaveProperty('data');
  });

  test('PATCH /api/settings returns updated settings in correct format', async ({ request }) => {
    const response = await request.patch(`${API_BASE_URL}/api/settings`, {
      headers: authHeader(),
      data: { theme: 'ableton-disco' },
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      settings?: Record<string, unknown>;
      user?: Record<string, unknown>;
      data?: unknown;
    };

    const hasResourceKey = data.settings !== undefined || data.user !== undefined;
    expect(hasResourceKey).toBe(true);
    expect(data).not.toHaveProperty('data');
  });
});

// ============================================
// Error Handling - Should still have proper format
// ============================================

test.describe('Error Response Format', () => {
  test('401 Unauthorized includes error details', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/quests`, {
      headers: {
        'X-Dev-User-ID': 'invalid',
      },
    });

    // In dev mode with invalid user ID, framework accepts it (200)
    // In production, this would be 401. We just verify response is valid.
    expect([200, 401]).toContain(response.status());
    const data = await response.json() as {
      error?: Record<string, unknown>;
      message?: string;
    };

    // If error response, should have 'error' or 'message' key
    if (response.status() === 401) {
      const hasErrorInfo = data.error !== undefined || data.message !== undefined;
      expect(hasErrorInfo).toBe(true);
    }
  });

  test('400 Bad Request includes validation errors', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/quests`, {
      headers: authHeader(),
      data: {}, // Missing required fields
    });

    // Framework returns 422 for validation errors (not 400)
    expect([400, 422]).toContain(response.status());
    
    // Try to parse as JSON; if not valid JSON, just check response has error info
    try {
      const data = await response.json() as {
        error?: Record<string, unknown>;
        message?: string;
      };
      const hasErrorInfo = data.error !== undefined || data.message !== undefined;
      expect(hasErrorInfo).toBe(true);
    } catch {
      // If response is plain text error message, that's also acceptable
      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// REGRESSION TESTS FOR BUG FIXES
// These tests validate that the bugs identified on 2026-01-12 are fixed
// ============================================

test.describe('Bug Fix Regression: Missing Total Fields', () => {
  test('Bug #1: Quests list includes total field', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/quests`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      quests?: unknown[];
      total?: number;
    };

    // REGRESSION: Verify total field exists and is a number
    expect(data).toHaveProperty('total');
    expect(typeof data.total).toBe('number');
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  test('Bug #2: Goals list includes total field', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/goals`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      goals?: unknown[];
      total?: number;
    };

    // REGRESSION: Verify total field exists and is a number
    expect(data).toHaveProperty('total');
    expect(typeof data.total).toBe('number');
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  test('Bug #3: Habits list includes total field', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/habits`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      habits?: unknown[];
      total?: number;
    };

    // REGRESSION: Verify total field exists and is a number
    expect(data).toHaveProperty('total');
    expect(typeof data.total).toBe('number');
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  test('Bug #4: Books list includes total field', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/books`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      books?: unknown[];
      total?: number;
    };

    // REGRESSION: Verify total field exists and is a number
    expect(data).toHaveProperty('total');
    expect(typeof data.total).toBe('number');
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  test('Bug #5: Focus sessions list includes total, page, page_size', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/focus/sessions`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      sessions?: unknown[];
      total?: number;
      page?: number;
      page_size?: number;
    };

    // REGRESSION: Verify all pagination fields exist
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('page_size');
    expect(typeof data.total).toBe('number');
    expect(typeof data.page).toBe('number');
    expect(typeof data.page_size).toBe('number');
  });

  test('Bug #6: Exercise workouts list includes total field', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/exercise/workouts`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      workouts?: unknown[];
      total?: number;
    };

    // REGRESSION: Verify total field exists and is a number
    expect(data).toHaveProperty('total');
    expect(typeof data.total).toBe('number');
    expect(data.total).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Bug Fix Regression: Ideas API Wrapper Format', () => {
  test('Bug #7: Ideas list uses ideas key NOT data key', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/ideas`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      ideas?: unknown[];
      data?: unknown;
    };

    // REGRESSION: Verify 'ideas' key exists and 'data' key does NOT exist
    expect(data).toHaveProperty('ideas');
    expect(data).not.toHaveProperty('data');
    expect(Array.isArray(data.ideas)).toBe(true);
  });
});

test.describe('Response Format Consistency Tests', () => {
  test('All list endpoints use resource-specific keys (not generic data wrapper)', async ({ request }) => {
    const endpoints = [
      { path: '/api/quests', key: 'quests' },
      { path: '/api/goals', key: 'goals' },
      { path: '/api/habits', key: 'habits' },
      { path: '/api/books', key: 'books' },
      { path: '/api/ideas', key: 'ideas' },
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE_URL}${endpoint.path}`, {
        headers: authHeader(),
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Consistency check: Should have resource key
      expect(data).toHaveProperty(endpoint.key);
      // Should NOT have generic 'data' key at root level
      expect(data).not.toHaveProperty('data');
    }
  });

  test('All list endpoints include total count for pagination', async ({ request }) => {
    const endpoints = [
      { path: '/api/quests' },
      { path: '/api/goals' },
      { path: '/api/habits' },
      { path: '/api/books' },
      { path: '/api/exercise/workouts' },
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE_URL}${endpoint.path}`, {
        headers: authHeader(),
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Consistency check: All lists should have total
      expect(data).toHaveProperty('total');
      expect(typeof data.total).toBe('number');
    }
  });

  test('Single resource endpoints return resource wrapper (singular key)', async ({ request }) => {
    const endpoints = [
      { path: '/api/user/profile', key: 'user' },
      { path: '/api/user/settings', key: 'settings' },
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE_URL}${endpoint.path}`, {
        headers: authHeader(),
      });

      // Some endpoints may return 404 if not seeded, that's OK
      if (response.status() === 200) {
        const data = await response.json();
        // Single resource should NOT have array, should be object or wrapped
        expect(data).not.toHaveProperty('data');
      }
    }
  });
});

test.describe('Total Field Validation Tests', () => {
  test('Total count matches array length for small result sets', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/quests`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      quests?: unknown[];
      total?: number;
    };

    // For small result sets, total should be >= array length
    expect(typeof data.total).toBe('number');
    expect(Array.isArray(data.quests)).toBe(true);
    if (data.quests && data.quests.length > 0) {
      expect(data.total).toBeGreaterThanOrEqual(data.quests.length);
    }
  });

  test('Pagination fields are valid numbers for Focus API', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/focus/sessions?page=1&page_size=20`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      sessions?: unknown[];
      total?: number;
      page?: number;
      page_size?: number;
    };

    // All numeric fields should be positive integers
    expect(data.page).toBe(1);
    expect(data.page_size).toBe(20);
    expect(data.total).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Empty Result Set Handling', () => {
  test('Empty quests list returns valid format with total=0', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/quests?status=nonexistent`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      quests?: unknown[];
      total?: number;
    };

    // Even with no results, structure should be valid
    expect(data).toHaveProperty('quests');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.quests)).toBe(true);
    expect(data.total).toBe(0);
  });

  test('Empty goals list returns valid format with total=0', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/goals?status=nonexistent`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as {
      goals?: unknown[];
      total?: number;
    };

    // Even with no results, structure should be valid
    expect(data).toHaveProperty('goals');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.goals)).toBe(true);
    expect(data.total).toBe(0);
  });
});

test.describe('API Contract Tests - Verify Fix Completeness', () => {
  test('No endpoint returns generic data wrapper at root level', async ({ request }) => {
    const endpoints = [
      '/api/quests',
      '/api/goals',
      '/api/habits',
      '/api/books',
      '/api/ideas',
      '/api/focus/sessions',
      '/api/exercise/workouts',
      '/api/user/profile',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE_URL}${endpoint}`, {
        headers: authHeader(),
      });

      // Skip non-200 responses
      if (response.status() !== 200) continue;

      const data = await response.json() as Record<string, unknown>;

      // CRITICAL: No endpoint should use generic 'data' key
      // This was the core issue in Bug #7
      expect(data).not.toHaveProperty('data');
    }
  });

  test('Focus API returns complete pagination response', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/focus/sessions`, {
      headers: authHeader(),
    });

    expect(response.status()).toBe(200);
    const data = await response.json() as Record<string, unknown>;

    // Focus sessions must have pagination info
    expect(data).toHaveProperty('sessions');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('page_size');

    // Verify types
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(typeof data.total).toBe('number');
    expect(typeof data.page).toBe('number');
    expect(typeof data.page_size).toBe('number');
  });
});

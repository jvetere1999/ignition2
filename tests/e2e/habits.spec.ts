import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function getAuthToken(request) {
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: 'test-habits@example.com',
      password: 'TestPass123!'
    }
  });
  
  if (loginRes.status() !== 200) {
    await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: 'test-habits@example.com',
        password: 'TestPass123!',
        name: 'Test Habit User'
      }
    });
  }
  
  const loginData = await loginRes.json();
  return loginData.token || loginData.session_id;
}

test.describe('Habit Management', () => {
  let authToken: string;

  test.beforeEach(async ({ request }) => {
    authToken = await getAuthToken(request);
  });

  test('Create new habit', async ({ request }) => {
    const createRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Morning Exercise',
        description: '30 min workout',
        frequency: 'daily',
        icon: 'dumbbell',
        color: 'blue'
      }
    });

    expect(createRes.status()).toBe(201);
    const habit = await createRes.json();
    expect(habit.id).toBeTruthy();
    expect(habit.name).toBe('Morning Exercise');
    expect(habit.user_id).toBeTruthy();
  });

  test('List user habits', async ({ request }) => {
    // Create 3 habits
    const habitNames = ['Habit A', 'Habit B', 'Habit C'];
    for (const name of habitNames) {
      await request.post(`${API_URL}/api/habits`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          name,
          description: 'Test habit',
          frequency: 'daily'
        }
      });
    }

    // List habits
    const listRes = await request.get(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(listRes.status()).toBe(200);
    const habits = await listRes.json();
    expect(Array.isArray(habits)).toBe(true);
    expect(habits.length).toBeGreaterThanOrEqual(3);
  });

  test('Get habit details', async ({ request }) => {
    // Create habit
    const createRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Test Habit',
        description: 'A test habit',
        frequency: 'daily'
      }
    });
    const habit = await createRes.json();

    // Get details
    const getRes = await request.get(`${API_URL}/api/habits/${habit.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(getRes.status()).toBe(200);
    const details = await getRes.json();
    expect(details.id).toBe(habit.id);
    expect(details.name).toBe('Test Habit');
  });

  test('Update habit', async ({ request }) => {
    // Create habit
    const createRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Original Name',
        frequency: 'daily'
      }
    });
    const habit = await createRes.json();

    // Update habit
    const updateRes = await request.patch(`${API_URL}/api/habits/${habit.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Updated Name',
        description: 'New description'
      }
    });

    expect([200, 204]).toContain(updateRes.status());

    // Verify update
    const getRes = await request.get(`${API_URL}/api/habits/${habit.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const updated = await getRes.json();
    expect(updated.name).toBe('Updated Name');
  });

  test('Delete habit', async ({ request }) => {
    // Create habit
    const createRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Habit to Delete',
        frequency: 'daily'
      }
    });
    const habit = await createRes.json();

    // Delete habit
    const deleteRes = await request.delete(`${API_URL}/api/habits/${habit.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect([200, 204]).toContain(deleteRes.status());

    // Verify deleted
    const getRes = await request.get(`${API_URL}/api/habits/${habit.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(getRes.status()).toBe(404);
  });

  test('Log habit completion', async ({ request }) => {
    // Create habit
    const createRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Exercise',
        frequency: 'daily'
      }
    });
    const habit = await createRes.json();

    // Log completion
    const completeRes = await request.post(`${API_URL}/api/habits/${habit.id}/complete`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        date: new Date().toISOString().split('T')[0],
        notes: 'Great session!'
      }
    });

    expect(completeRes.status()).toBe(200);
    const completion = await completeRes.json();
    expect(completion.habit_id).toBe(habit.id);
  });

  test('Get habit streak', async ({ request }) => {
    // Create habit
    const createRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Daily Meditation',
        frequency: 'daily'
      }
    });
    const habit = await createRes.json();

    // Log completions for 3 consecutive days
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (2 - i));
      await request.post(`${API_URL}/api/habits/${habit.id}/complete`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { date: date.toISOString().split('T')[0] }
      });
    }

    // Get streak
    const streakRes = await request.get(`${API_URL}/api/habits/${habit.id}/streak`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(streakRes.status()).toBe(200);
    const streak = await streakRes.json();
    expect(streak.current).toBeGreaterThanOrEqual(1);
  });

  test('List habit completions', async ({ request }) => {
    // Create habit and log completions
    const createRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Test Habit',
        frequency: 'daily'
      }
    });
    const habit = await createRes.json();

    await request.post(`${API_URL}/api/habits/${habit.id}/complete`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { date: new Date().toISOString().split('T')[0] }
    });

    // List completions
    const listRes = await request.get(`${API_URL}/api/habits/${habit.id}/completions`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(listRes.status()).toBe(200);
    const completions = await listRes.json();
    expect(Array.isArray(completions)).toBe(true);
  });
});

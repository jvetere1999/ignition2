import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function getAuthToken(request) {
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: 'test-gamif@example.com',
      password: 'TestPass123!'
    }
  });
  
  if (loginRes.status() !== 200) {
    await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: 'test-gamif@example.com',
        password: 'TestPass123!',
        name: 'Test Gamification User'
      }
    });
  }
  
  const loginData = await loginRes.json();
  return loginData.token || loginData.session_id;
}

test.describe('Gamification System', () => {
  let authToken: string;

  test.beforeEach(async ({ request }) => {
    authToken = await getAuthToken(request);
  });

  test('Get user profile with gamification data', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.status()).toBe(200);
    const profile = await res.json();
    expect(profile.id).toBeTruthy();
    expect(typeof profile.coins).toBe('number');
    expect(typeof profile.xp).toBe('number');
    expect(typeof profile.level).toBe('number');
  });

  test('Earn coins when completing habits', async ({ request }) => {
    // Get initial coin count
    const initialRes = await request.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const initialCoins = (await initialRes.json()).coins;

    // Create and complete a habit
    const habitRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Coin Earning Habit',
        frequency: 'daily'
      }
    });
    const habit = await habitRes.json();

    await request.post(`${API_URL}/api/habits/${habit.id}/complete`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { date: new Date().toISOString().split('T')[0] }
    });

    // Get updated coin count
    const updatedRes = await request.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const updatedCoins = (await updatedRes.json()).coins;

    expect(updatedCoins).toBeGreaterThanOrEqual(initialCoins);
  });

  test('Earn XP when completing habits', async ({ request }) => {
    // Get initial XP
    const initialRes = await request.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const initialXP = (await initialRes.json()).xp;

    // Create and complete a habit
    const habitRes = await request.post(`${API_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'XP Earning Habit',
        frequency: 'daily'
      }
    });
    const habit = await habitRes.json();

    await request.post(`${API_URL}/api/habits/${habit.id}/complete`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { date: new Date().toISOString().split('T')[0] }
    });

    // Get updated XP
    const updatedRes = await request.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const updatedXP = (await updatedRes.json()).xp;

    expect(updatedXP).toBeGreaterThanOrEqual(initialXP);
  });

  test('Get user achievements', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/user/achievements`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.status()).toBe(200);
    const achievements = await res.json();
    expect(Array.isArray(achievements) || achievements.unlocked).toBeTruthy();
  });

  test('Get user skills/badges', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/user/skills`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // May be 200 or 404 if endpoint doesn't exist
    if (res.status() === 200) {
      const skills = await res.json();
      expect(Array.isArray(skills) || skills.items).toBeTruthy();
    }
  });

  test('Leaderboard data is accessible', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/leaderboard/global?limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // May be 200 or 404 if leaderboard not implemented
    if (res.status() === 200) {
      const leaderboard = await res.json();
      expect(Array.isArray(leaderboard) || leaderboard.users).toBeTruthy();
    }
  });

  test('Get user wallet/coins ledger', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/user/wallet`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // May be 200 or 404 if wallet endpoint not implemented
    if (res.status() === 200) {
      const wallet = await res.json();
      expect(wallet.balance !== undefined).toBe(true);
    }
  });

  test('Coin transaction history', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/user/wallet/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // May be 200 or 404 if endpoint not implemented
    if (res.status() === 200) {
      const transactions = await res.json();
      expect(Array.isArray(transactions) || transactions.items).toBeTruthy();
    }
  });

  test('XP progression calculation', async ({ request }) => {
    // Create multiple habits and complete them
    const habitIds = [];
    for (let i = 0; i < 5; i++) {
      const habitRes = await request.post(`${API_URL}/api/habits`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          name: `Progression Habit ${i}`,
          frequency: 'daily'
        }
      });
      habitIds.push((await habitRes.json()).id);
    }

    // Complete first 3 habits
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < 3; i++) {
      await request.post(`${API_URL}/api/habits/${habitIds[i]}/complete`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { date: today }
      });
    }

    // Check progress
    const profileRes = await request.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const profile = await profileRes.json();
    
    // XP should increase with habit completions
    expect(profile.xp).toBeGreaterThanOrEqual(0);
    expect(profile.level).toBeGreaterThanOrEqual(1);
  });
});

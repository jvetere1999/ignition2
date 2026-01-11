/**
 * Generated Types Unit Tests
 *
 * Validates that generated types from schema.json are correct and usable.
 * These tests ensure type safety and catch schema/type mismatches.
 */

import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  type Users,
  type Accounts,
  type Sessions,
  type FocusSessions,
  type Habits,
  type Goals,
  type UniversalQuests,
  type Books,
  type MarketItems,
  type SkillDefinitions,
  type AchievementDefinitions,
  type Roles,
  type Entitlements,
  type FeatureFlags,
  type UserProgress,
  type UserWallet,
  type CreateInput,
  type UpdateInput,
  type PaginatedResponse,
} from '@/lib/generated_types';

describe('Generated Types', () => {
  describe('Schema Version', () => {
    it('exports SCHEMA_VERSION constant', () => {
      expect(SCHEMA_VERSION).toBeDefined();
      expect(typeof SCHEMA_VERSION).toBe('string');
      expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Auth Types', () => {
    it('Users interface has required fields', () => {
      const user: Users = {
        id: 'uuid-here',
        email: 'test@example.com',
        role: 'user',
        approved: true,
        age_verified: false,
        tos_accepted: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(typeof user.approved).toBe('boolean');
    });

    it('Users interface supports optional fields', () => {
      const user: Users = {
        id: 'uuid',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        email_verified: '2025-01-01T00:00:00Z',
        tos_accepted_at: '2025-01-01T00:00:00Z',
        tos_version: '1.0',
        last_activity_at: '2025-01-01T00:00:00Z',
        role: 'admin',
        approved: true,
        age_verified: true,
        tos_accepted: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(user.name).toBe('Test User');
      expect(user.image).toBeDefined();
    });

    it('Accounts interface has OAuth fields', () => {
      const account: Accounts = {
        id: 'uuid',
        user_id: 'user-uuid',
        type: 'oauth',
        provider: 'google',
        provider_account_id: 'google-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(account.provider).toBe('google');
      expect(account.type).toBe('oauth');
    });

    it('Sessions interface has session fields', () => {
      const session: Sessions = {
        id: 'session-uuid',
        user_id: 'user-uuid',
        token: 'session-token',
        expires_at: '2025-12-31T23:59:59Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(session.token).toBeDefined();
      expect(session.expires_at).toBeDefined();
    });
  });

  describe('Gamification Types', () => {
    it('UserProgress interface has gamification fields', () => {
      const progress: UserProgress = {
        id: 'uuid',
        user_id: 'user-uuid',
        total_xp: 10000,
        current_level: 5,
        xp_to_next_level: 500,
        total_skill_stars: 25,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(progress.current_level).toBe(5);
      expect(progress.total_xp).toBe(10000);
      expect(typeof progress.xp_to_next_level).toBe('number');
    });

    it('UserWallet interface has currency fields', () => {
      const wallet: UserWallet = {
        id: 'uuid',
        user_id: 'user-uuid',
        coins: 500,
        total_earned: 1000,
        total_spent: 500,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(wallet.coins).toBe(500);
      expect(typeof wallet.total_earned).toBe('number');
    });

    it('SkillDefinitions interface is correct', () => {
      const skill: SkillDefinitions = {
        id: 'uuid',
        key: 'focus',
        name: 'Focus',
        category: 'mental',
        max_level: 100,
        stars_per_level: 10,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(skill.key).toBe('focus');
      expect(skill.max_level).toBe(100);
    });

    it('AchievementDefinitions interface is correct', () => {
      const achievement: AchievementDefinitions = {
        id: 'uuid',
        key: 'first_focus',
        name: 'First Focus',
        category: 'focus',
        trigger_type: 'event',
        trigger_config: { event: 'focus_complete', count: 1 },
        reward_coins: 10,
        reward_xp: 25,
        is_hidden: false,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(achievement.trigger_config).toHaveProperty('event');
      expect(achievement.reward_coins).toBe(10);
    });

    it('UniversalQuests interface is correct', () => {
      const quest: UniversalQuests = {
        id: 'uuid',
        title: 'Daily Focus',
        type: 'daily',
        xp_reward: 50,
        coin_reward: 10,
        target: 25,
        target_type: 'focus_minutes',
        is_active: true,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(quest.type).toBe('daily');
      expect(quest.target).toBe(25);
    });
  });

  describe('Feature Types', () => {
    it('FocusSessions interface is correct', () => {
      const session: FocusSessions = {
        id: 'uuid',
        user_id: 'user-uuid',
        mode: 'focus',
        duration_seconds: 1500,
        started_at: '2025-01-01T10:00:00Z',
        status: 'completed',
        xp_awarded: 50,
        coins_awarded: 10,
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(session.mode).toBe('focus');
      expect(session.duration_seconds).toBe(1500);
    });

    it('Habits interface is correct', () => {
      const habit: Habits = {
        id: 'uuid',
        user_id: 'user-uuid',
        name: 'Morning Exercise',
        frequency: 'daily',
        target_count: 1,
        is_active: true,
        current_streak: 0,
        longest_streak: 0,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(habit.name).toBe('Morning Exercise');
      expect(habit.frequency).toBe('daily');
    });

    it('Goals interface is correct', () => {
      const goal: Goals = {
        id: 'uuid',
        user_id: 'user-uuid',
        title: 'Learn Rust',
        status: 'active',
        progress: 0,
        priority: 1,
        sort_order: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(goal.title).toBe('Learn Rust');
      expect(goal.status).toBe('active');
    });

    it('Books interface is correct', () => {
      const book: Books = {
        id: 'uuid',
        user_id: 'user-uuid',
        title: 'The Pragmatic Programmer',
        status: 'reading',
        current_page: 150,
        total_pages: 400,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(book.title).toBeDefined();
      expect(book.status).toBe('reading');
    });
  });

  describe('Admin Types', () => {
    it('Roles interface is correct', () => {
      const role: Roles = {
        id: 'uuid',
        name: 'admin',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(role.name).toBe('admin');
    });

    it('Entitlements interface is correct', () => {
      const entitlement: Entitlements = {
        id: 'uuid',
        name: 'users:manage',
        resource: 'users',
        action: 'manage',
        created_at: '2025-01-01T00:00:00Z',
      };

      expect(entitlement.resource).toBe('users');
      expect(entitlement.action).toBe('manage');
    });

    it('FeatureFlags interface is correct', () => {
      const flag: FeatureFlags = {
        id: 'uuid',
        flag_name: 'ai_coach',
        enabled: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(flag.flag_name).toBe('ai_coach');
      expect(flag.enabled).toBe(false);
    });
  });

  describe('Market Types', () => {
    it('MarketItems interface is correct', () => {
      const item: MarketItems = {
        id: 'uuid',
        key: 'theme_dark',
        name: 'Dark Theme',
        category: 'theme',
        cost_coins: 0,
        rarity: 'common',
        is_global: true,
        is_available: true,
        is_active: true,
        is_consumable: false,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(item.key).toBe('theme_dark');
      expect(item.cost_coins).toBe(0);
    });
  });

  describe('Utility Types', () => {
    it('CreateInput omits auto-generated fields', () => {
      type CreateUser = CreateInput<Users>;
      
      // This should compile - CreateInput removes id, created_at, updated_at
      const createData: CreateUser = {
        email: 'new@example.com',
        role: 'user',
        approved: false,
        age_verified: false,
        tos_accepted: false,
      };

      expect(createData.email).toBe('new@example.com');
    });

    it('UpdateInput makes fields optional and requires id', () => {
      type UpdateUser = UpdateInput<Users>;
      
      const updateData: UpdateUser = {
        id: 'uuid',
        name: 'Updated Name',
      };

      expect(updateData.id).toBe('uuid');
      expect(updateData.name).toBe('Updated Name');
    });

    it('PaginatedResponse wraps data correctly', () => {
      const response: PaginatedResponse<Users> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      };

      expect(Array.isArray(response.data)).toBe(true);
      expect(response.total).toBe(0);
    });
  });
});

describe('Type Consistency', () => {
  it('all ID fields are strings (UUIDs)', () => {
    // This test documents the expectation that all IDs are strings
    const testIds = {
      user: '550e8400-e29b-41d4-a716-446655440000' as Users['id'],
      account: '550e8400-e29b-41d4-a716-446655440001' as Accounts['id'],
      session: '550e8400-e29b-41d4-a716-446655440002' as Sessions['id'],
    };

    Object.values(testIds).forEach((id) => {
      expect(typeof id).toBe('string');
    });
  });

  it('all timestamp fields are ISO strings', () => {
    const timestamps = {
      created: '2025-01-01T00:00:00Z' as Users['created_at'],
      updated: '2025-01-01T00:00:00Z' as Users['updated_at'],
    };

    Object.values(timestamps).forEach((ts) => {
      expect(typeof ts).toBe('string');
      expect(() => new Date(ts)).not.toThrow();
    });
  });
});

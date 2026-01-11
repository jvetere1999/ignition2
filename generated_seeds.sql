-- GENERATED SEEDS FROM schema.json v2.0.0
-- Generated: 2026-01-10
--
-- Seed data for Passion OS. Run after schema migration.

-- ============================================================
-- SKILL_DEFINITIONS (6 records)
-- ============================================================
INSERT INTO skill_definitions (id, created_at, key, name, description, category, icon, max_level, stars_per_level, sort_order)
VALUES
    (gen_random_uuid(), NOW(), 'focus', 'Focus', 'Your ability to concentrate and complete deep work sessions', 'mental', 'brain', 100, 10, 1),
    (gen_random_uuid(), NOW(), 'discipline', 'Discipline', 'Consistency in maintaining habits and routines', 'mental', 'target', 100, 10, 2),
    (gen_random_uuid(), NOW(), 'strength', 'Strength', 'Physical power and resistance training progress', 'physical', 'dumbbell', 100, 10, 3),
    (gen_random_uuid(), NOW(), 'endurance', 'Endurance', 'Cardiovascular fitness and stamina', 'physical', 'heart', 100, 10, 4),
    (gen_random_uuid(), NOW(), 'creativity', 'Creativity', 'Artistic expression and creative problem solving', 'creative', 'palette', 100, 10, 5),
    (gen_random_uuid(), NOW(), 'knowledge', 'Knowledge', 'Learning and intellectual growth', 'mental', 'book', 100, 10, 6)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ACHIEVEMENT_DEFINITIONS (15 records)
-- ============================================================
INSERT INTO achievement_definitions (id, created_at, key, name, description, category, icon, trigger_type, trigger_config, reward_coins, reward_xp, is_hidden, sort_order)
VALUES
    (gen_random_uuid(), NOW(), 'first_focus', 'First Focus', 'Complete your first focus session', 'focus', 'zap', 'event', '{"event": "focus_complete", "count": 1}', 10, 25, false, 1),
    (gen_random_uuid(), NOW(), 'focus_10', 'Focus Beginner', 'Complete 10 focus sessions', 'focus', 'zap', 'threshold', '{"event": "focus_complete", "count": 10}', 25, 100, false, 2),
    (gen_random_uuid(), NOW(), 'focus_100', 'Focus Master', 'Complete 100 focus sessions', 'focus', 'crown', 'threshold', '{"event": "focus_complete", "count": 100}', 100, 500, false, 3),
    (gen_random_uuid(), NOW(), 'deep_work', 'Deep Worker', 'Complete a 60+ minute focus session', 'focus', 'clock', 'event', '{"event": "focus_complete", "min_duration": 3600}', 50, 100, false, 4),
    (gen_random_uuid(), NOW(), 'streak_3', 'Getting Started', 'Maintain a 3-day streak', 'streak', 'flame', 'threshold', '{"streak_type": "daily", "count": 3}', 15, 50, false, 10),
    (gen_random_uuid(), NOW(), 'streak_7', 'Week Warrior', 'Maintain a 7-day streak', 'streak', 'flame', 'threshold', '{"streak_type": "daily", "count": 7}', 35, 150, false, 11),
    (gen_random_uuid(), NOW(), 'streak_30', 'Monthly Master', 'Maintain a 30-day streak', 'streak', 'fire', 'threshold', '{"streak_type": "daily", "count": 30}', 150, 500, false, 12),
    (gen_random_uuid(), NOW(), 'streak_100', 'Legendary Streak', 'Maintain a 100-day streak', 'streak', 'trophy', 'threshold', '{"streak_type": "daily", "count": 100}', 500, 2000, true, 13),
    (gen_random_uuid(), NOW(), 'first_habit', 'Habit Formed', 'Complete a habit for the first time', 'habit', 'check', 'event', '{"event": "habit_complete", "count": 1}', 10, 25, false, 20),
    (gen_random_uuid(), NOW(), 'habit_streak_7', 'Habit Builder', 'Complete a habit 7 days in a row', 'habit', 'repeat', 'threshold', '{"event": "habit_streak", "count": 7}', 50, 150, false, 21),
    (gen_random_uuid(), NOW(), 'first_book', 'Bookworm', 'Finish your first book', 'reading', 'book', 'event', '{"event": "book_complete", "count": 1}', 50, 200, false, 30),
    (gen_random_uuid(), NOW(), 'books_10', 'Library Builder', 'Finish 10 books', 'reading', 'library', 'threshold', '{"event": "book_complete", "count": 10}', 200, 1000, false, 31),
    (gen_random_uuid(), NOW(), 'first_workout', 'Gym Rat', 'Complete your first workout', 'fitness', 'dumbbell', 'event', '{"event": "workout_complete", "count": 1}', 25, 50, false, 40),
    (gen_random_uuid(), NOW(), 'first_pr', 'Personal Best', 'Set your first personal record', 'fitness', 'medal', 'event', '{"event": "personal_record", "count": 1}', 50, 100, false, 41),
    (gen_random_uuid(), NOW(), 'first_lesson', 'Student', 'Complete your first lesson', 'learning', 'graduation', 'event', '{"event": "lesson_complete", "count": 1}', 15, 50, false, 50)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROLES (5 records)
-- ============================================================
INSERT INTO roles (id, created_at, name, description, parent_role_id)
VALUES
    (gen_random_uuid(), NOW(), 'user', 'Standard user with basic access', NULL),
    (gen_random_uuid(), NOW(), 'premium', 'Premium user with additional features', NULL),
    (gen_random_uuid(), NOW(), 'moderator', 'Community moderator', NULL),
    (gen_random_uuid(), NOW(), 'admin', 'Full administrative access', NULL),
    (gen_random_uuid(), NOW(), 'super_admin', 'Super administrator with all permissions', NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ENTITLEMENTS (13 records)
-- ============================================================
INSERT INTO entitlements (id, created_at, name, description, resource, action)
VALUES
    (gen_random_uuid(), NOW(), 'users:read', 'View user profiles', 'users', 'read'),
    (gen_random_uuid(), NOW(), 'users:update', 'Update user profiles', 'users', 'update'),
    (gen_random_uuid(), NOW(), 'users:delete', 'Delete users', 'users', 'delete'),
    (gen_random_uuid(), NOW(), 'users:manage', 'Full user management', 'users', 'manage'),
    (gen_random_uuid(), NOW(), 'content:create', 'Create content', 'content', 'create'),
    (gen_random_uuid(), NOW(), 'content:update', 'Update content', 'content', 'update'),
    (gen_random_uuid(), NOW(), 'content:delete', 'Delete content', 'content', 'delete'),
    (gen_random_uuid(), NOW(), 'content:moderate', 'Moderate user content', 'content', 'moderate'),
    (gen_random_uuid(), NOW(), 'market:manage', 'Manage shop items', 'market', 'manage'),
    (gen_random_uuid(), NOW(), 'market:create_items', 'Create new shop items', 'market', 'create'),
    (gen_random_uuid(), NOW(), 'system:admin', 'System administration', 'system', 'admin'),
    (gen_random_uuid(), NOW(), 'system:config', 'Modify system configuration', 'system', 'config'),
    (gen_random_uuid(), NOW(), 'analytics:view', 'View analytics dashboards', 'analytics', 'read')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- FEATURE_FLAGS (5 records)
-- ============================================================
INSERT INTO feature_flags (id, created_at, updated_at, flag_name, enabled, description, metadata)
VALUES
    (gen_random_uuid(), NOW(), NOW(), 'social_features', false, 'Enable social/community features', '{"rollout_percentage": 0}'),
    (gen_random_uuid(), NOW(), NOW(), 'ai_coach', false, 'Enable AI coaching features', '{"model": "gpt-4"}'),
    (gen_random_uuid(), NOW(), NOW(), 'premium_content', true, 'Enable premium content access', NULL),
    (gen_random_uuid(), NOW(), NOW(), 'beta_fitness', false, 'Beta fitness tracking features', '{"min_version": "2.0.0"}'),
    (gen_random_uuid(), NOW(), NOW(), 'music_analysis', true, 'Enable music analysis features', NULL)
ON CONFLICT (flag_name) DO NOTHING;

-- ============================================================
-- UNIVERSAL_QUESTS (9 records)
-- ============================================================
INSERT INTO universal_quests (id, created_at, updated_at, title, description, type, xp_reward, coin_reward, target, target_type, target_config, skill_key, is_active, sort_order)
VALUES
    (gen_random_uuid(), NOW(), NOW(), 'Daily Focus', 'Complete 25 minutes of focused work', 'daily', 50, 10, 25, 'focus_minutes', NULL, 'focus', true, 1),
    (gen_random_uuid(), NOW(), NOW(), 'Habit Check', 'Complete at least one habit today', 'daily', 25, 5, 1, 'habits_completed', NULL, 'discipline', true, 2),
    (gen_random_uuid(), NOW(), NOW(), 'Active Minutes', 'Log 15 minutes of exercise', 'daily', 40, 8, 15, 'exercise_minutes', NULL, 'endurance', true, 3),
    (gen_random_uuid(), NOW(), NOW(), 'Focus Champion', 'Complete 3 hours of focused work this week', 'weekly', 200, 50, 180, 'focus_minutes', NULL, 'focus', true, 10),
    (gen_random_uuid(), NOW(), NOW(), 'Habit Warrior', 'Complete all habits for 5 days', 'weekly', 150, 35, 5, 'perfect_habit_days', NULL, 'discipline', true, 11),
    (gen_random_uuid(), NOW(), NOW(), 'Workout Week', 'Complete 3 workouts this week', 'weekly', 175, 40, 3, 'workouts_completed', NULL, 'strength', true, 12),
    (gen_random_uuid(), NOW(), NOW(), 'Bookworm', 'Read for 60 minutes this week', 'weekly', 100, 25, 60, 'reading_minutes', NULL, 'knowledge', true, 13),
    (gen_random_uuid(), NOW(), NOW(), 'Marathon Focus', 'Complete 20 hours of focused work this month', 'monthly', 500, 150, 1200, 'focus_minutes', NULL, 'focus', true, 20),
    (gen_random_uuid(), NOW(), NOW(), 'Perfect Month', 'Maintain a 30-day streak', 'monthly', 750, 200, 30, 'streak_days', NULL, 'discipline', true, 21)
ON CONFLICT DO NOTHING;

-- ============================================================
-- LEARN_TOPICS (5 records)
-- ============================================================
INSERT INTO learn_topics (id, created_at, key, name, description, category, icon, color, sort_order, is_active)
VALUES
    (gen_random_uuid(), NOW(), 'productivity', 'Productivity', 'Master time management and deep work techniques', 'theory', 'clock', '#3B82F6', 1, true),
    (gen_random_uuid(), NOW(), 'habits', 'Habit Science', 'Understand the science of habit formation', 'theory', 'repeat', '#10B981', 2, true),
    (gen_random_uuid(), NOW(), 'fitness_basics', 'Fitness Fundamentals', 'Learn proper form and training principles', 'practice', 'dumbbell', '#EF4444', 3, true),
    (gen_random_uuid(), NOW(), 'mindfulness', 'Mindfulness', 'Develop focus and mental clarity', 'practice', 'brain', '#8B5CF6', 4, true),
    (gen_random_uuid(), NOW(), 'music_theory', 'Music Theory', 'Understand the building blocks of music', 'theory', 'music', '#F59E0B', 5, true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ONBOARDING_FLOWS (1 records)
-- ============================================================
INSERT INTO onboarding_flows (id, created_at, updated_at, name, description, is_active, total_steps)
VALUES
    (gen_random_uuid(), NOW(), NOW(), 'welcome', 'New user welcome and setup flow', true, 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- MARKET_ITEMS (10 records)
-- ============================================================
INSERT INTO market_items (id, created_at, updated_at, key, name, description, category, cost_coins, rarity, icon, is_global, is_available, is_active, is_consumable, sort_order)
VALUES
    (gen_random_uuid(), NOW(), NOW(), 'theme_dark', 'Dark Mode Theme', 'A sleek dark interface theme', 'theme', 0, 'common', 'moon', true, true, true, false, 1),
    (gen_random_uuid(), NOW(), NOW(), 'theme_ocean', 'Ocean Theme', 'Calm blue tones inspired by the sea', 'theme', 50, 'common', 'waves', true, true, true, false, 2),
    (gen_random_uuid(), NOW(), NOW(), 'theme_forest', 'Forest Theme', 'Earthy greens for a natural feel', 'theme', 50, 'common', 'tree', true, true, true, false, 3),
    (gen_random_uuid(), NOW(), NOW(), 'theme_sunset', 'Sunset Theme', 'Warm oranges and purples', 'theme', 100, 'rare', 'sunset', true, true, true, false, 4),
    (gen_random_uuid(), NOW(), NOW(), 'xp_boost_1h', '1-Hour XP Boost', 'Double XP for 1 hour', 'boost', 25, 'common', 'zap', true, true, true, true, 10),
    (gen_random_uuid(), NOW(), NOW(), 'xp_boost_24h', '24-Hour XP Boost', 'Double XP for 24 hours', 'boost', 100, 'rare', 'zap', true, true, true, true, 11),
    (gen_random_uuid(), NOW(), NOW(), 'streak_shield', 'Streak Shield', 'Protect your streak for one missed day', 'boost', 150, 'rare', 'shield', true, true, true, true, 12),
    (gen_random_uuid(), NOW(), NOW(), 'avatar_crown', 'Golden Crown', 'A crown fit for royalty', 'avatar', 500, 'epic', 'crown', true, true, true, false, 20),
    (gen_random_uuid(), NOW(), NOW(), 'avatar_wings', 'Angel Wings', 'Majestic feathered wings', 'avatar', 750, 'epic', 'feather', true, true, true, false, 21),
    (gen_random_uuid(), NOW(), NOW(), 'avatar_halo', 'Golden Halo', 'A glowing halo of achievement', 'avatar', 1000, 'legendary', 'star', true, true, true, false, 22)
ON CONFLICT (key) DO NOTHING;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '  ✓ skill_definitions: 6 records';
    RAISE NOTICE '  ✓ achievement_definitions: 15 records';
    RAISE NOTICE '  ✓ roles: 5 records';
    RAISE NOTICE '  ✓ entitlements: 13 records';
    RAISE NOTICE '  ✓ feature_flags: 5 records';
    RAISE NOTICE '  ✓ universal_quests: 9 records';
    RAISE NOTICE '  ✓ learn_topics: 5 records';
    RAISE NOTICE '  ✓ onboarding_flows: 1 records';
    RAISE NOTICE '  ✓ market_items: 10 records';
END $$;

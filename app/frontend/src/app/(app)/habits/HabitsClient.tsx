"use client";

/**
 * Habits Client Component
 * Daily habit tracking with streaks
 *
 * Auto-refresh: Refetches on focus after 1 minute staleness (per SYNC.md)
 *
 * FAST LOADING: Uses SyncState for instant progress display
 */

import { useState, useEffect, useCallback } from "react";
import { safeFetch, API_BASE_URL } from "@/lib/api";
import { getMemoryCache, setMemoryCache } from "@/lib/cache/memory";
import { useAutoRefresh } from "@/lib/hooks";
import { LoadingState } from "@/components/ui";
import { getHabitAnalytics, type HabitAnalytics } from "@/lib/api/habits";
import { useBadges } from "@/lib/sync/SyncStateContext";
import styles from "./page.module.css";

interface Habit {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  target_count: number;
  custom_days?: number[] | null;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
  current_streak: number;
  longest_streak: number;
  last_completed_at: string | null;
  completed_today: boolean;
  sort_order: number;
}

interface Streaks {
  [key: string]: { current: number; longest: number };
}

const CATEGORIES = [
  { id: "focus", label: "Focus", color: "#ff764d" },
  { id: "exercise", label: "Exercise", color: "#4caf50" },
  { id: "learning", label: "Learning", color: "#2196f3" },
  { id: "journal", label: "Journal", color: "#9c27b0" },
  { id: "general", label: "General", color: "#607d8b" },
];

const PRESET_HABITS = [
  { title: "Complete a focus session", category: "focus", xp: 15, coins: 5 },
  { title: "Workout for 30 minutes", category: "exercise", xp: 25, coins: 10 },
  { title: "Review 10 flashcards", category: "learning", xp: 10, coins: 5 },
  { title: "Write in journal", category: "journal", xp: 10, coins: 5 },
];

const HABITS_CACHE_KEY = "habits";

const CATEGORY_REWARDS: Record<string, { xp: number; coins: number }> = {
  focus: { xp: 15, coins: 5 },
  exercise: { xp: 25, coins: 10 },
  learning: { xp: 10, coins: 5 },
  journal: { xp: 10, coins: 5 },
  general: { xp: 10, coins: 5 },
};

export function HabitsClient() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [analytics, setAnalytics] = useState<HabitAnalytics | null>(null);
  const [newHabit, setNewHabit] = useState({
    title: "",
    description: "",
    category: "general",
    xp_reward: 10,
    coin_reward: 5,
  });

  // FAST LOADING: Get polled badges for instant count display
  const polledBadges = useBadges();

  const cachedHabits = getMemoryCache<{ habits: Habit[] }>(HABITS_CACHE_KEY);
  useEffect(() => {
    if (cachedHabits?.data?.habits?.length) {
      setHabits(cachedHabits.data.habits);
      setIsLoading(false);
    }
  }, [cachedHabits]);

  const getHabitCategoryId = useCallback((habit: Habit) => {
    return habit.icon || "general";
  }, []);

  const getCategoryRewards = useCallback((categoryId: string) => {
    return CATEGORY_REWARDS[categoryId] || CATEGORY_REWARDS.general;
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const result = await getHabitAnalytics();
      setAnalytics(result);
    } catch (error) {
      console.error("Failed to fetch habit analytics:", error);
    }
  }, []);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await safeFetch(`${API_BASE_URL}/api/habits`);
      if (res.ok) {
        const response_data = await res.json() as { data: { habits?: Habit[] } };
        const nextHabits = response_data.data?.habits || [];
        setHabits(nextHabits);
        setMemoryCache(HABITS_CACHE_KEY, { habits: nextHabits });
      }
    } catch (error) {
      console.error("Failed to fetch habits:", error);
    } finally {
      setIsLoading(false);
    }
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh: refetch on focus after 1 minute staleness
  // Pauses on page unload, soft refreshes on reload if stale
  // Disabled when add form is open (user might be typing)
  useAutoRefresh({
    onRefresh: fetchHabits,
    refreshKey: "habits",
    stalenessMs: 60000, // 1 minute per SYNC.md contract
    refreshOnMount: true,
    refetchOnFocus: true,
    refetchOnVisible: true,
    enabled: !showAddForm, // Disable when form is open
  });

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleCreateHabit = async () => {
    if (!newHabit.title.trim()) return;
    try {
      const category = getCategoryInfo(newHabit.category);
      const res = await safeFetch(`${API_BASE_URL}/api/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHabit.title.trim(),
          description: newHabit.description.trim() || undefined,
          frequency: "daily",
          target_count: 1,
          icon: newHabit.category,
          color: category.color,
        }),
      });
      if (res.ok) {
        setNewHabit({ title: "", description: "", category: "general", xp_reward: 10, coin_reward: 5 });
        setShowAddForm(false);
        fetchHabits();
      }
    } catch (error) {
      console.error("Failed to create habit:", error);
    }
  };

  const handleLogHabit = async (habitId: string) => {
    try {
      const res = await safeFetch(`${API_BASE_URL}/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) fetchHabits();
    } catch (error) {
      console.error("Failed to log habit:", error);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm("Delete this habit?")) return;
    try {
      await safeFetch(`${API_BASE_URL}/api/habits/${habitId}`, { method: "DELETE" });
      fetchHabits();
    } catch (error) {
      console.error("Failed to delete habit:", error);
    }
  };

  const isCompletedToday = (habit: Habit) => habit.completed_today;
  const getCategoryInfo = (categoryId: string) => CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[4];

  const addPresetHabit = (preset: typeof PRESET_HABITS[0]) => {
    setNewHabit({ title: preset.title, description: "", category: preset.category, xp_reward: preset.xp, coin_reward: preset.coins });
    setShowAddForm(true);
  };

  const completedCount = habits.filter((h) => isCompletedToday(h)).length;
  const totalHabits = habits.length;
  const completionRate7d = analytics ? Math.round(analytics.completion_rate_7_days * 100) : 0;
  const completionRate30d = analytics ? Math.round(analytics.completion_rate_30_days * 100) : 0;
  const streaks: Streaks = habits.reduce((acc, habit) => {
    if (habit.current_streak > 0) {
      acc[habit.name] = { current: habit.current_streak, longest: habit.longest_streak };
    }
    return acc;
  }, {} as Streaks);

  // FAST LOADING: Show instant habit count while loading full data
  if (isLoading) {
    const pendingHabits = polledBadges?.pending_habits ?? 0;
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>Habits</h1>
              <p className={styles.subtitle}>Build consistency, earn rewards</p>
            </div>
          </div>
          {polledBadges && (
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Today&apos;s Habits</span>
                <span className={styles.progressValue}>{pendingHabits} remaining</span>
              </div>
            </div>
          )}
        </header>
        <LoadingState message="Loading habits..." />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Habits</h1>
            <p className={styles.subtitle}>Build consistency, earn rewards</p>
          </div>
          <button className={styles.addButton} onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "+ New Habit"}
          </button>
        </div>

        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Today&apos;s Progress</span>
            <span className={styles.progressValue}>{completedCount}/{totalHabits}</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0}%` }} />
          </div>
        </div>
      </header>

      {analytics && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Habit Analytics</h2>
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsValue}>{analytics.active_habits}</span>
              <span className={styles.analyticsLabel}>Active habits</span>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsValue}>{analytics.completed_today}</span>
              <span className={styles.analyticsLabel}>Completed today</span>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsValue}>{analytics.completions_last_7_days}</span>
              <span className={styles.analyticsLabel}>Last 7 days</span>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsValue}>{analytics.completions_last_30_days}</span>
              <span className={styles.analyticsLabel}>Last 30 days</span>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsValue}>{completionRate7d}%</span>
              <span className={styles.analyticsLabel}>7-day completion</span>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsValue}>{completionRate30d}%</span>
              <span className={styles.analyticsLabel}>30-day completion</span>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsValue}>{analytics.longest_streak}</span>
              <span className={styles.analyticsLabel}>Longest streak</span>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsValue}>{analytics.active_streaks}</span>
              <span className={styles.analyticsLabel}>Active streaks</span>
            </div>
          </div>
          {analytics.last_completed_at && (
            <p className={styles.analyticsMeta}>
              Last completion: {new Date(analytics.last_completed_at).toLocaleDateString()}
            </p>
          )}
        </section>
      )}

      {Object.keys(streaks).length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Current Streaks</h2>
          <div className={styles.streaksGrid}>
            {Object.entries(streaks).map(([type, data]) => (
              <div key={type} className={styles.streakCard}>
                <span className={styles.streakType}>{type.replace("_", " ")}</span>
                <span className={styles.streakValue}>{data.current}</span>
                <span className={styles.streakLabel}>day streak</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {showAddForm && (
        <section className={styles.addForm}>
          <h3 className={styles.formTitle}>New Habit</h3>
          <div className={styles.presets}>
            <span className={styles.presetsLabel}>Quick add:</span>
            {PRESET_HABITS.map((preset, i) => (
              <button key={i} className={styles.presetButton} onClick={() => addPresetHabit(preset)}>{preset.title}</button>
            ))}
          </div>
          <div className={styles.formGrid}>
            <input type="text" className={styles.input} placeholder="Habit title..." value={newHabit.title} onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })} />
            <select className={styles.select} value={newHabit.category} onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}>
              {CATEGORIES.map((cat) => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
            </select>
          </div>
          <textarea className={styles.textarea} placeholder="Description (optional)" value={newHabit.description} onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })} />
          <div className={styles.rewardInputs}>
            <label className={styles.rewardLabel}>XP Reward<input type="number" className={styles.rewardInput} value={newHabit.xp_reward} onChange={(e) => setNewHabit({ ...newHabit, xp_reward: parseInt(e.target.value) || 0 })} /></label>
            <label className={styles.rewardLabel}>Coin Reward<input type="number" className={styles.rewardInput} value={newHabit.coin_reward} onChange={(e) => setNewHabit({ ...newHabit, coin_reward: parseInt(e.target.value) || 0 })} /></label>
          </div>
          <button className={styles.submitButton} onClick={handleCreateHabit}>Create Habit</button>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your Habits</h2>
        {habits.length === 0 ? (
          <div className={styles.emptyState}><p>No habits yet. Create your first habit to start tracking!</p></div>
        ) : (
          <div className={styles.habitsList}>
            {habits.map((habit) => {
              const categoryId = getHabitCategoryId(habit);
              const category = getCategoryInfo(categoryId);
              const rewards = getCategoryRewards(categoryId);
              const completed = isCompletedToday(habit);
              return (
                <div key={habit.id} className={`${styles.habitCard} ${completed ? styles.completed : ""}`}>
                  <div className={styles.habitMain}>
                    <button className={`${styles.checkButton} ${completed ? styles.checked : ""}`} onClick={() => !completed && handleLogHabit(habit.id)} disabled={completed} style={{ borderColor: category.color, backgroundColor: completed ? category.color : "transparent" }}>
                      {completed && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                    <div className={styles.habitInfo}>
                      <h3 className={styles.habitTitle}>{habit.name}</h3>
                      {habit.description && <p className={styles.habitDescription}>{habit.description}</p>}
                      <div className={styles.habitMeta}>
                        <span className={styles.habitCategory} style={{ color: category.color }}>{category.label}</span>
                        <span className={styles.habitReward}>+{rewards.xp} XP, +{rewards.coins} coins</span>
                      </div>
                    </div>
                  </div>
                  <button className={styles.deleteButton} onClick={() => handleDeleteHabit(habit.id)} title="Delete habit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

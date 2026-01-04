"use client";

/**
 * Quests Client Component
 * Daily and weekly quests with XP and coin rewards
 * Fetches universal quests from database
 */

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

interface Quest {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "special";
  xpReward: number;
  coinReward: number;
  progress: number;
  target: number;
  completed: boolean;
  expiresAt?: string;
}

// Storage keys
const WALLET_KEY = "passion_wallet_v1";
const QUEST_PROGRESS_KEY = "passion_quest_progress_v1";

export function QuestsClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [wallet, setWallet] = useState({ coins: 0, totalXp: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "special">("daily");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuest, setNewQuest] = useState({
    title: "",
    description: "",
    type: "special" as Quest["type"],
    xpReward: 25,
    coinReward: 10,
    target: 1,
  });

  // Load quests from API and merge with local progress
  useEffect(() => {
    const loadQuests = async () => {
      try {
        // Fetch universal quests from API
        const response = await fetch("/api/quests");
        let apiQuests: Quest[] = [];

        if (response.ok) {
          const data = await response.json() as { quests?: Record<string, unknown>[] };
          apiQuests = (data.quests || []).map((q: Record<string, unknown>) => ({
            id: String(q.id || ""),
            title: String(q.title || ""),
            description: String(q.description || ""),
            type: (q.type as Quest["type"]) || "daily",
            xpReward: Number(q.xpReward || q.xp_reward || 10),
            coinReward: Number(q.coinReward || q.coin_reward || 5),
            target: Number(q.target || 1),
            progress: 0,
            completed: false,
          }));
        }

        // Load local progress
        const storedProgress = localStorage.getItem(QUEST_PROGRESS_KEY);
        const progress: Record<string, { progress: number; completed: boolean }> = storedProgress
          ? JSON.parse(storedProgress)
          : {};

        // Merge progress with quests
        const questsWithProgress = apiQuests.map((q) => ({
          ...q,
          progress: progress[q.id]?.progress || 0,
          completed: progress[q.id]?.completed || false,
        }));

        setQuests(questsWithProgress);

        // Load wallet
        const storedWallet = localStorage.getItem(WALLET_KEY);
        if (storedWallet) {
          setWallet(JSON.parse(storedWallet));
        }
      } catch (e) {
        console.error("Failed to load quests:", e);
      }
      setIsLoading(false);
    };

    loadQuests();
  }, []);

  // Save wallet when it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
    }
  }, [wallet, isLoading]);

  // Save quest progress when it changes
  useEffect(() => {
    if (!isLoading && quests.length > 0) {
      const progress: Record<string, { progress: number; completed: boolean }> = {};
      quests.forEach((q) => {
        progress[q.id] = { progress: q.progress, completed: q.completed };
      });
      localStorage.setItem(QUEST_PROGRESS_KEY, JSON.stringify(progress));
    }
  }, [quests, isLoading]);

  // Complete a quest manually (for testing)
  const handleCompleteQuest = useCallback((questId: string) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId || q.completed) return q;
        return { ...q, progress: q.target, completed: true };
      })
    );

    const quest = quests.find((q) => q.id === questId);
    if (quest && !quest.completed) {
      setWallet((prev) => ({
        coins: prev.coins + quest.coinReward,
        totalXp: prev.totalXp + quest.xpReward,
      }));
    }
  }, [quests]);

  // Add progress to a quest
  const handleAddProgress = useCallback((questId: string) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId || q.completed) return q;
        const newProgress = Math.min(q.progress + 1, q.target);
        const completed = newProgress >= q.target;

        if (completed && !q.completed) {
          // Award rewards
          setWallet((w) => ({
            coins: w.coins + q.coinReward,
            totalXp: w.totalXp + q.xpReward,
          }));
        }

        return { ...q, progress: newProgress, completed };
      })
    );
  }, []);

  // Refresh quests from server
  const handleRefreshDaily = useCallback(async () => {
    try {
      const response = await fetch("/api/quests");
      if (response.ok) {
        const data = await response.json() as { quests?: Record<string, unknown>[] };
        const apiQuests: Quest[] = (data.quests || []).map((q: Record<string, unknown>) => ({
          id: String(q.id || ""),
          title: String(q.title || ""),
          description: String(q.description || ""),
          type: (q.type as Quest["type"]) || "daily",
          xpReward: Number(q.xpReward || q.xp_reward || 10),
          coinReward: Number(q.coinReward || q.coin_reward || 5),
          target: Number(q.target || 1),
          progress: 0,
          completed: false,
        }));
        setQuests(apiQuests);
      }
    } catch (e) {
      console.error("Failed to refresh quests:", e);
    }
  }, []);

  // Add custom quest
  const handleAddCustomQuest = useCallback(() => {
    if (!newQuest.title.trim()) return;

    const quest: Quest = {
      id: `custom-${Date.now()}`,
      title: newQuest.title.trim(),
      description: newQuest.description.trim(),
      type: newQuest.type,
      xpReward: newQuest.xpReward,
      coinReward: newQuest.coinReward,
      progress: 0,
      target: newQuest.target,
      completed: false,
    };

    setQuests((prev) => [quest, ...prev]);
    setNewQuest({
      title: "",
      description: "",
      type: "special",
      xpReward: 25,
      coinReward: 10,
      target: 1,
    });
    setShowAddForm(false);
  }, [newQuest]);

  const filteredQuests = quests.filter((q) => q.type === activeTab);

  if (isLoading) {
    return <div className={styles.page}><div className={styles.loading}>Loading quests...</div></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Quests</h1>
            <p className={styles.subtitle}>Complete quests to earn rewards</p>
          </div>
          <div className={styles.walletDisplay}>
            <div className={styles.walletItem}>
              <span className={styles.coinIcon}>*</span>
              <span className={styles.walletValue}>{wallet.coins}</span>
            </div>
            <div className={styles.walletItem}>
              <span className={styles.xpIcon}>XP</span>
              <span className={styles.walletValue}>{wallet.totalXp}</span>
            </div>
          </div>
          <button
            className={styles.addQuestButton}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "+ New Quest"}
          </button>
        </div>
      </header>

      {/* Add Quest Form */}
      {showAddForm && (
        <div className={styles.addForm}>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Quest title..."
            value={newQuest.title}
            onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
          />
          <input
            type="text"
            className={styles.formInput}
            placeholder="Description..."
            value={newQuest.description}
            onChange={(e) => setNewQuest({ ...newQuest, description: e.target.value })}
          />
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Type</label>
              <select
                className={styles.formSelect}
                value={newQuest.type}
                onChange={(e) => setNewQuest({ ...newQuest, type: e.target.value as Quest["type"] })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Target</label>
              <input
                type="number"
                className={styles.formInput}
                value={newQuest.target}
                onChange={(e) => setNewQuest({ ...newQuest, target: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>XP Reward</label>
              <input
                type="number"
                className={styles.formInput}
                value={newQuest.xpReward}
                onChange={(e) => setNewQuest({ ...newQuest, xpReward: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Coin Reward</label>
              <input
                type="number"
                className={styles.formInput}
                value={newQuest.coinReward}
                onChange={(e) => setNewQuest({ ...newQuest, coinReward: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
          </div>
          <button className={styles.submitButton} onClick={handleAddCustomQuest}>
            Add Quest
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "daily" ? styles.active : ""}`}
          onClick={() => setActiveTab("daily")}
        >
          Daily
        </button>
        <button
          className={`${styles.tab} ${activeTab === "weekly" ? styles.active : ""}`}
          onClick={() => setActiveTab("weekly")}
        >
          Weekly
        </button>
        <button
          className={`${styles.tab} ${activeTab === "special" ? styles.active : ""}`}
          onClick={() => setActiveTab("special")}
        >
          Special
        </button>
      </div>

      {/* Quest List */}
      <div className={styles.questList}>
        {filteredQuests.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No {activeTab} quests available.</p>
            {activeTab === "daily" && (
              <button className={styles.refreshButton} onClick={handleRefreshDaily}>
                Generate New Daily Quests
              </button>
            )}
          </div>
        ) : (
          filteredQuests.map((quest) => (
            <div
              key={quest.id}
              className={`${styles.questCard} ${quest.completed ? styles.completed : ""}`}
            >
              <div className={styles.questInfo}>
                <h3 className={styles.questTitle}>{quest.title}</h3>
                <p className={styles.questDescription}>{quest.description}</p>
                <div className={styles.questProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {quest.progress}/{quest.target}
                  </span>
                </div>
              </div>
              <div className={styles.questRewards}>
                <div className={styles.reward}>
                  <span className={styles.rewardIcon}>*</span>
                  <span>{quest.coinReward}</span>
                </div>
                <div className={styles.reward}>
                  <span className={styles.rewardIcon}>XP</span>
                  <span>{quest.xpReward}</span>
                </div>
                {!quest.completed && (
                  <button
                    className={styles.progressButton}
                    onClick={() => handleAddProgress(quest.id)}
                  >
                    +1
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


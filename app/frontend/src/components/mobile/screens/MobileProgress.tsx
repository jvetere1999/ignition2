"use client";

/**
 * Mobile Progress Screen
 *
 * Uses SyncState for real-time progress data via 30s polling.
 * NO localStorage - data is memory-only for UI optimization.
 */

import styles from "./MobileProgress.module.css";
import { useProgress } from "@/lib/sync/SyncStateContext";

interface MobileProgressProps {
  userId?: string; // Optional - will use useAuth() if not provided
}

export function MobileProgress({ userId }: MobileProgressProps = {}) {
  void userId;

  const progress = useProgress();

  // Calculate XP percentage
  const xpPercent = progress
    ? Math.min(100, (progress.current_xp / progress.xp_to_next_level) * 100)
    : 0;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1>Progress</h1>
      </header>

      {/* Level Card */}
      <div className={styles.levelCard}>
        <div className={styles.levelInfo}>
          <span className={styles.levelLabel}>Level</span>
          <span className={styles.levelNumber}>{progress?.level ?? 1}</span>
        </div>
        <div className={styles.xpInfo}>
          <div className={styles.xpBar}>
            <div className={styles.xpFill} style={{ width: `${xpPercent}%` }} />
          </div>
          <span className={styles.xpText}>
            {progress?.current_xp ?? 0} / {progress?.xp_to_next_level ?? 1000} XP
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>0</span>
          <span className={styles.statLabel}>Focus Hours</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>0</span>
          <span className={styles.statLabel}>Quests Done</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{progress?.streak_days ?? 0}</span>
          <span className={styles.statLabel}>Day Streak</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{progress?.coins ?? 0}</span>
          <span className={styles.statLabel}>Coins</span>
        </div>
      </div>

      {/* Skills Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Skills</h2>
        <div className={styles.comingSoon}>
          <p>Skill tracking coming soon</p>
        </div>
      </section>

      {/* Activity Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        <div className={styles.comingSoon}>
          <p>No recent activity</p>
        </div>
      </section>
    </div>
  );
}


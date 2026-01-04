/**
 * Today Page (Home within app shell)
 * Dashboard view showing today's quests and focus
 */

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Today",
  description: "Your daily dashboard - quests, focus sessions, and progress.",
};

export default async function TodayPage() {
  const session = await auth();

  // Session is guaranteed by middleware, but handle edge case
  const greeting = getGreeting();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {greeting}, {firstName}
        </h1>
        <p className={styles.subtitle}>
          Here&apos;s what&apos;s on your plate today.
        </p>
      </header>

      <div className={styles.grid}>
        {/* Quick Actions */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.actions}>
            <Link href="/focus" className={styles.actionCard}>
              <div className={styles.actionIcon}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <span className={styles.actionLabel}>Start Focus</span>
            </Link>

            <Link href="/planner" className={styles.actionCard}>
              <div className={styles.actionIcon}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className={styles.actionLabel}>Plan Day</span>
            </Link>

            <Link href="/hub" className={styles.actionCard}>
              <div className={styles.actionIcon}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                  <path d="M6 8h.001" />
                  <path d="M10 8h.001" />
                  <path d="M14 8h.001" />
                  <path d="M18 8h.001" />
                  <path d="M8 12h.001" />
                  <path d="M12 12h.001" />
                  <path d="M16 12h.001" />
                  <path d="M7 16h10" />
                </svg>
              </div>
              <span className={styles.actionLabel}>Shortcuts</span>
            </Link>
          </div>
        </section>

        {/* Today's Quests */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Today&apos;s Quests</h2>
            <Link href="/planner" className={styles.sectionLink}>
              View All
            </Link>
          </div>
          <div className={styles.emptyState}>
            <p>No quests scheduled for today.</p>
            <Link href="/planner" className={styles.emptyAction}>
              Add a quest
            </Link>
          </div>
        </section>

        {/* Focus Stats */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Focus Today</h2>
            <Link href="/progress" className={styles.sectionLink}>
              View Stats
            </Link>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>Sessions</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>0m</span>
              <span className={styles.statLabel}>Focus Time</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>XP Earned</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}



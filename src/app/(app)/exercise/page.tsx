/**
 * Exercise Page
 * Workout tracking with sets, reps, weight, and RPE
 */

import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Exercise",
  description: "Track your workouts, sets, reps, and personal records.",
};

export default function ExercisePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Exercise</h1>
        <p className={styles.subtitle}>
          Track your workouts and personal records.
        </p>
      </header>

      <div className={styles.actions}>
        <button className={styles.primaryButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Start Workout
        </button>
      </div>

      <div className={styles.grid}>
        {/* Quick Stats */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>This Week</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>Workouts</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>Sets</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>PRs</span>
            </div>
          </div>
        </section>

        {/* Recent Workouts */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Workouts</h2>
          <div className={styles.emptyState}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.emptyIcon}
            >
              <path d="M6.5 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M4 21v-7l-2-4 4-2 4 4-2 4" />
              <path d="M10 5l4 4" />
              <path d="M21 3l-6 6" />
              <path d="M18 22V12l2-4-3-1" />
            </svg>
            <p>No workouts yet</p>
            <span className={styles.emptyHint}>
              Start a workout to begin tracking your progress
            </span>
          </div>
        </section>

        {/* Exercise Library */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Exercise Library</h2>
            <Link href="/exercise/library" className={styles.sectionLink}>
              View All
            </Link>
          </div>
          <div className={styles.exerciseCategories}>
            <Link href="/exercise/library?category=strength" className={styles.categoryCard}>
              <span className={styles.categoryIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6.5 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                  <path d="M4 21v-7l-2-4 4-2 4 4-2 4" />
                </svg>
              </span>
              <span className={styles.categoryName}>Strength</span>
            </Link>
            <Link href="/exercise/library?category=cardio" className={styles.categoryCard}>
              <span className={styles.categoryIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </span>
              <span className={styles.categoryName}>Cardio</span>
            </Link>
            <Link href="/exercise/library?category=flexibility" className={styles.categoryCard}>
              <span className={styles.categoryIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </span>
              <span className={styles.categoryName}>Flexibility</span>
            </Link>
          </div>
        </section>

        {/* Personal Records */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Personal Records</h2>
            <Link href="/exercise/records" className={styles.sectionLink}>
              View All
            </Link>
          </div>
          <div className={styles.emptyState}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.emptyIcon}
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <p>No records yet</p>
            <span className={styles.emptyHint}>
              Complete workouts to set personal records
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}


/**
 * Interval Training Page
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntervalGame } from "./IntervalGame";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Interval Training - Ignition",
  description: "Train your ear to recognize musical intervals.",
};

export default async function IntervalTrainingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/learn/ear-training" className={styles.backLink}>
          &larr; Back to Ear Training
        </Link>
        <h1 className={styles.title}>Interval Recognition</h1>
        <p className={styles.subtitle}>
          Learn to identify the distance between two notes
        </p>
      </header>

      <IntervalGame />
    </div>
  );
}


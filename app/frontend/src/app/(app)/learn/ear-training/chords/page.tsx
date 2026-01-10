/**
 * Chord Quality Training Page
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ChordGame } from "./ChordGame";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Chord Quality Training - Ignition",
  description: "Train your ear to identify chord qualities.",
};

export default async function ChordTrainingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/learn/ear-training" className={styles.backLink}>
          &larr; Back to Ear Training
        </Link>
        <h1 className={styles.title}>Chord Quality Recognition</h1>
        <p className={styles.subtitle}>
          Distinguish between major, minor, and other chord types
        </p>
      </header>

      <ChordGame />
    </div>
  );
}


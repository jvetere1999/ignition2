/**
 * Settings Page
 * User preferences and account settings
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { SettingsClient } from "./SettingsClient";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account and preferences.",
};

export default async function SettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your account and preferences.
        </p>
      </header>

      <SettingsClient />
    </div>
  );
}


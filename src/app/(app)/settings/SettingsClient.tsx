/**
 * Settings Client Component
 * Interactive settings controls
 */

"use client";

import { ThemeSelector } from "@/components/settings/ThemeSelector";
import styles from "./page.module.css";

interface SettingsClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  return (
    <div className={styles.sections}>
      {/* Account Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div className={styles.sectionContent}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Name</label>
            <div className={styles.fieldValue}>{user.name || "Not set"}</div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Email</label>
            <div className={styles.fieldValue}>{user.email || "Not set"}</div>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.sectionContent}>
          <ThemeSelector />
        </div>
      </section>

      {/* Focus Settings */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Focus Timer</h2>
        <div className={styles.sectionContent}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="focusDuration">
              Focus Duration
            </label>
            <select id="focusDuration" className={styles.select} defaultValue="25">
              <option value="15">15 minutes</option>
              <option value="25">25 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="breakDuration">
              Break Duration
            </label>
            <select id="breakDuration" className={styles.select} defaultValue="5">
              <option value="3">3 minutes</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="longBreakDuration">
              Long Break Duration
            </label>
            <select
              id="longBreakDuration"
              className={styles.select}
              defaultValue="15"
            >
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.sectionContent}>
          <div className={styles.fieldRow}>
            <div>
              <label className={styles.fieldLabel}>Timer Sounds</label>
              <p className={styles.fieldDescription}>
                Play a sound when focus sessions end
              </p>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider} />
            </label>
          </div>
          <div className={styles.fieldRow}>
            <div>
              <label className={styles.fieldLabel}>Browser Notifications</label>
              <p className={styles.fieldDescription}>
                Show notifications for timer events
              </p>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Danger Zone</h2>
        <div className={styles.sectionContent}>
          <div className={styles.dangerItem}>
            <div>
              <span className={styles.fieldLabel}>Export Data</span>
              <p className={styles.fieldDescription}>
                Download all your data as JSON
              </p>
            </div>
            <button className={styles.secondaryButton}>Export</button>
          </div>
          <div className={styles.dangerItem}>
            <div>
              <span className={styles.fieldLabel}>Delete Account</span>
              <p className={styles.fieldDescription}>
                Permanently delete your account and all data
              </p>
            </div>
            <button className={styles.dangerButton}>Delete</button>
          </div>
        </div>
      </section>
    </div>
  );
}


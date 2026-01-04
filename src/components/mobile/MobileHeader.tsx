"use client";

/**
 * Mobile Header Component
 * Top bar with safe area padding
 */

import type { User } from "next-auth";
import styles from "./MobileHeader.module.css";

interface MobileHeaderProps {
  isScrolled: boolean;
  user?: User | null;
}

export function MobileHeader({ isScrolled, user }: MobileHeaderProps) {
  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ""}`}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>Passion</span>
        </div>

        {user && (
          <button className={styles.avatar}>
            {user.image ? (
              <img src={user.image} alt={user.name || "User"} />
            ) : (
              <span>{user.name?.charAt(0) || user.email?.charAt(0) || "?"}</span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}


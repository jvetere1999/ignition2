/**
 * Header Component
 * Top navigation bar with branding and user menu
 */

"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { UserMenu } from "./UserMenu";
import styles from "./Header.module.css";

interface HeaderProps {
  onMenuClick: () => void;
  onCommandPaletteClick?: () => void;
  onInboxClick?: () => void;
}

export function Header({ onMenuClick, onCommandPaletteClick, onInboxClick }: HeaderProps) {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Mobile menu button */}
        <button
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Logo / Brand */}
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">
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
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </span>
          <span className={styles.brandText}>Passion OS</span>
        </Link>
      </div>

      <div className={styles.center}>
        {/* Command Palette Trigger */}
        {onCommandPaletteClick && (
          <button
            className={styles.searchButton}
            onClick={onCommandPaletteClick}
            aria-label="Open command palette"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className={styles.searchPlaceholder}>Search or command...</span>
            <kbd className={styles.searchShortcut}>Cmd K</kbd>
          </button>
        )}
      </div>

      <div className={styles.right}>
        {/* Inbox Button */}
        {onInboxClick && isAuthenticated && (
          <button
            className={styles.iconButton}
            onClick={onInboxClick}
            aria-label="Open inbox"
            title="Inbox (Cmd+I)"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        )}

        {isAuthenticated && user ? (
          <UserMenu user={user} />
        ) : (
          <Link href="/auth/signin" className={styles.signInButton}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}


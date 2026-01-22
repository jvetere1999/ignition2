/**
 * App Shell Component
 * Main layout wrapper with header and navigation
 *
 * Includes FocusStateProvider for deduplicating focus session polling
 * 
 * FRONT-008: Lazy-loaded components for code splitting
 * - UnifiedBottomBar: 1056 lines - loaded on client-side hydration
 * - Omnibar: 553 lines - loaded on demand when opened
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { FocusStateProvider } from "@/lib/focus";
import styles from "./AppShell.module.css";

// FRONT-008: Lazy-load heavy shell components
const UnifiedBottomBar = dynamic(
  () => import("./UnifiedBottomBar").then(mod => mod.UnifiedBottomBar),
  { 
    ssr: false,
    loading: () => <div style={{ height: "80px" }} /> // Placeholder for bottom bar height
  }
);

const Omnibar = dynamic(
  () => import("./Omnibar").then(mod => mod.Omnibar),
  {
    ssr: false,
    loading: () => null // Don't show loading state for command palette
  }
);

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [omnibarOpen, setOmnibarOpen] = useState(false);
  // Note: Authentication is enforced by middleware.
  // Client-side redirect is disabled to prevent race conditions.
  // The middleware already redirects unauthenticated users before this component renders.

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for omnibar
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOmnibarOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + I also opens omnibar (for inbox)
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        setOmnibarOpen((prev) => !prev);
        return;
      }

      // Escape to close omnibar
      if (e.key === "Escape") {
        if (omnibarOpen) {
          setOmnibarOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [omnibarOpen]);

  return (
    <FocusStateProvider>
      <div className={styles.shell}>
        <Header
          onMenuClick={toggleSidebar}
          onCommandPaletteClick={() => setOmnibarOpen(true)}
          onInboxClick={() => setOmnibarOpen(true)}
        />
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} userEmail={user?.email || undefined} />
        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
        <UnifiedBottomBar />
        <MobileNav onMoreClick={toggleSidebar} />
        <Omnibar
          isOpen={omnibarOpen}
          onClose={() => setOmnibarOpen(false)}
        />
      </div>
    </FocusStateProvider>
  );
}

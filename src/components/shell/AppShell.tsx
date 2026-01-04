/**
 * App Shell Component
 * Main layout wrapper with header and navigation
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomBar } from "./BottomBar";
import { Omnibar } from "./Omnibar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [omnibarOpen, setOmnibarOpen] = useState(false);

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
    <div className={styles.shell}>
      <Header
        onMenuClick={toggleSidebar}
        onCommandPaletteClick={() => setOmnibarOpen(true)}
        onInboxClick={() => setOmnibarOpen(true)}
      />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} userEmail={session?.user?.email || undefined} />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
      <BottomBar />
      <Omnibar
        isOpen={omnibarOpen}
        onClose={() => setOmnibarOpen(false)}
      />
    </div>
  );
}


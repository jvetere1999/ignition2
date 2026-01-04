/**
 * Focus State Context
 *
 * Centralized focus session state management to avoid duplicate polling.
 * This context provides:
 * - Single polling source for active focus session
 * - Shared state across BottomBar and FocusIndicator
 * - Visibility-aware polling (pauses when tab hidden, respects timer needs)
 * - Cross-tab sync via localStorage events
 *
 * SYNC CONTRACT (from SYNC.md):
 * - Polling interval: 30s (cannot increase for timer accuracy)
 * - Visibility: Continue polling when hidden (timer must stay accurate)
 * - Cross-tab: localStorage paused state sync
 */

"use client";

import { createContext, useContext, useEffect, useCallback, useRef, useState, type ReactNode } from "react";

// Types
interface FocusSession {
  id: string;
  started_at: string;
  planned_duration: number;
  status: "active" | "completed" | "abandoned";
  mode: "focus" | "break" | "long_break";
  expires_at: string | null;
}

interface PausedState {
  mode: "focus" | "break" | "long_break";
  timeRemaining: number;
  pausedAt: string;
}

interface FocusStateContextValue {
  /** Current active focus session from server */
  session: FocusSession | null;
  /** Paused timer state from localStorage */
  pausedState: PausedState | null;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Whether initial load is complete */
  isLoading: boolean;
  /** Force refresh from server */
  refresh: () => Promise<void>;
  /** Clear paused state */
  clearPausedState: () => void;
}

const FocusStateContext = createContext<FocusStateContextValue | null>(null);

const POLL_INTERVAL = 30000; // 30 seconds
const PAUSED_STATE_KEY = "focus_paused_state";
const PAUSED_STATE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * FocusStateProvider
 *
 * Wrap your app with this to enable shared focus state.
 * Should be placed in a client layout component.
 */
export function FocusStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [pausedState, setPausedState] = useState<PausedState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check for paused state in localStorage
   */
  const checkPausedState = useCallback(() => {
    try {
      const stored = localStorage.getItem(PAUSED_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PausedState;
        const pausedTime = new Date(parsed.pausedAt).getTime();
        if (Date.now() - pausedTime < PAUSED_STATE_TTL) {
          setPausedState(parsed);
          setTimeRemaining(parsed.timeRemaining);
          return true;
        } else {
          localStorage.removeItem(PAUSED_STATE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(PAUSED_STATE_KEY);
    }
    setPausedState(null);
    return false;
  }, []);

  /**
   * Fetch active session from server
   */
  const fetchActiveSession = useCallback(async () => {
    try {
      const response = await fetch("/api/focus/active");
      if (response.ok) {
        const data = await response.json() as { session?: FocusSession | null };
        if (data.session && data.session.status === "active") {
          setSession(data.session);
          setPausedState(null);

          // Calculate remaining time
          const startTime = new Date(data.session.started_at).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, data.session.planned_duration - elapsed);
          setTimeRemaining(remaining);
        } else {
          setSession(null);
          checkPausedState();
        }
      }
    } catch (error) {
      console.error("Failed to fetch active focus session:", error);
    } finally {
      setIsLoading(false);
    }
  }, [checkPausedState]);

  /**
   * Public refresh method
   */
  const refresh = useCallback(async () => {
    await fetchActiveSession();
  }, [fetchActiveSession]);

  /**
   * Clear paused state
   */
  const clearPausedState = useCallback(() => {
    localStorage.removeItem(PAUSED_STATE_KEY);
    setPausedState(null);
    setTimeRemaining(0);
  }, []);

  // Initial load and polling setup
  useEffect(() => {
    checkPausedState();
    fetchActiveSession();

    // Set up polling
    pollIntervalRef.current = setInterval(fetchActiveSession, POLL_INTERVAL);

    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PAUSED_STATE_KEY) {
        checkPausedState();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchActiveSession, checkPausedState]);

  // Timer countdown for active sessions
  useEffect(() => {
    if (!session || session.status !== "active") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer complete - refetch to get updated status
          fetchActiveSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session, fetchActiveSession]);

  const value: FocusStateContextValue = {
    session,
    pausedState,
    timeRemaining,
    isLoading,
    refresh,
    clearPausedState,
  };

  return (
    <FocusStateContext.Provider value={value}>
      {children}
    </FocusStateContext.Provider>
  );
}

/**
 * Hook to access focus state
 */
export function useFocusState(): FocusStateContextValue {
  const ctx = useContext(FocusStateContext);
  if (!ctx) {
    throw new Error("useFocusState must be used within FocusStateProvider");
  }
  return ctx;
}

/**
 * Hook for components that only need to know if focus is active
 * (lighter-weight alternative)
 */
export function useFocusActive(): {
  isActive: boolean;
  isPaused: boolean;
  mode: "focus" | "break" | "long_break" | null;
} {
  const ctx = useContext(FocusStateContext);

  if (!ctx) {
    return { isActive: false, isPaused: false, mode: null };
  }

  return {
    isActive: ctx.session !== null && ctx.session.status === "active",
    isPaused: ctx.pausedState !== null,
    mode: ctx.session?.mode || ctx.pausedState?.mode || null,
  };
}


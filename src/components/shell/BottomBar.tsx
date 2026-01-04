/**
 * BottomBar Component
 * Unified bottom bar that displays both focus indicator and audio player
 * Handles stacking and body padding in a single component
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import {
  usePlayerStore,
  useCurrentTrack,
  usePlayerVisible,
  useIsPlaying,
  usePlayerSettings,
  useCurrentTime,
  useDuration,
  initAudioController,
  loadAndPlay,
  togglePlayPause,
  pause,
  seek,
  setVolume,
  loadPlayerSettings,
  savePlayerSettings,
  loadQueueState,
  saveQueueState,
  saveQueueStateImmediate,
  migratePlayerStorage,
  clearQueueState,
  formatTime,
} from "@/lib/player";
import { Waveform } from "@/components/player/Waveform";
import styles from "./BottomBar.module.css";

import dynamic from "next/dynamic";
const TrackAnalysisPopup = dynamic(
  () => import("@/components/player/TrackAnalysisPopup").then((mod) => mod.TrackAnalysisPopup),
  { ssr: false }
);

// Focus types
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

const MODE_LABELS: Record<string, string> = {
  focus: "Focus",
  break: "Break",
  long_break: "Long Break",
};

const MODE_COLORS: Record<string, string> = {
  focus: "var(--accent-primary, #ff764d)",
  break: "var(--accent-success, #4caf50)",
  long_break: "var(--accent-info, #2196f3)",
};

function formatFocusTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function BottomBar() {
  // ===== PLAYER STATE =====
  const track = useCurrentTrack();
  const isPlayerVisible = usePlayerVisible();
  const isPlaying = useIsPlaying();
  const playerSettings = usePlayerSettings();
  const currentTime = useCurrentTime();
  const duration = useDuration();
  const lastLoadedTrackId = useRef<string | null>(null);
  const queueRestored = useRef(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);

  // ===== FOCUS STATE =====
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [pausedState, setPausedState] = useState<PausedState | null>(null);
  const [focusTimeRemaining, setFocusTimeRemaining] = useState(0);
  const [focusLoading, setFocusLoading] = useState(true);
  const [isFocusMinimized, setIsFocusMinimized] = useState(false);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const isFocusActive = focusSession !== null && focusSession.status === "active";
  const isFocusPaused = !focusSession && pausedState !== null;
  const showFocus = !focusLoading && (isFocusActive || isFocusPaused);
  const showPlayer = isPlayerVisible && track;
  const currentFocusMode = focusSession?.mode || pausedState?.mode || "focus";

  // ===== BODY PADDING =====
  useEffect(() => {
    let padding = 0;

    if (showPlayer && !isPlayerMinimized) {
      padding += 90; // Full player height
    } else if (showPlayer && isPlayerMinimized) {
      padding += 48; // Minimized player height
    }

    if (showFocus && !showPlayer) {
      // Focus only (no player)
      padding += isFocusMinimized ? 40 : 48;
    }
    // When both visible, focus sits inside/above player section, no extra padding needed

    document.body.style.paddingBottom = padding > 0 ? `${padding}px` : "";

    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [showPlayer, showFocus, isPlayerMinimized, isFocusMinimized]);

  // ===== PLAYER EFFECTS =====
  useEffect(() => {
    initAudioController();
    migratePlayerStorage();
    const savedSettings = loadPlayerSettings();
    usePlayerStore.getState().updateSettings(savedSettings);
    setVolume(savedSettings.volume);
    const savedQueue = loadQueueState();
    if (savedQueue && savedQueue.queue.length > 0) {
      usePlayerStore.getState().restoreQueue(
        savedQueue.queue,
        savedQueue.queueIndex,
        savedQueue.currentTime
      );
      queueRestored.current = true;
    }
  }, []);

  useEffect(() => {
    const state = usePlayerStore.getState();
    if (
      state.currentTrack &&
      state.status === "loading" &&
      state.currentTrack.id !== lastLoadedTrackId.current
    ) {
      lastLoadedTrackId.current = state.currentTrack.id;
      loadAndPlay(state.currentTrack.audioUrl);
    }
  }, [track]);

  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state) => {
      if (state.queue.length > 0) {
        saveQueueState(state.queue, state.queueIndex, state.currentTime);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = usePlayerStore.getState();
      if (state.queue.length > 0) {
        saveQueueStateImmediate(state.queue, state.queueIndex, state.currentTime);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ===== FOCUS EFFECTS =====
  const checkPausedState = useCallback(() => {
    try {
      const stored = localStorage.getItem("focus_paused_state");
      if (stored) {
        const parsed = JSON.parse(stored) as PausedState;
        const pausedTime = new Date(parsed.pausedAt).getTime();
        const hourAgo = Date.now() - 60 * 60 * 1000;
        if (pausedTime > hourAgo) {
          setPausedState(parsed);
          setFocusTimeRemaining(parsed.timeRemaining);
          return true;
        } else {
          localStorage.removeItem("focus_paused_state");
        }
      }
    } catch {
      localStorage.removeItem("focus_paused_state");
    }
    setPausedState(null);
    return false;
  }, []);

  const fetchActiveSession = useCallback(async () => {
    try {
      const response = await fetch("/api/focus/active");
      if (response.ok) {
        const data = await response.json() as { session?: FocusSession | null };
        if (data.session && data.session.status === "active") {
          setFocusSession(data.session);
          setPausedState(null);
          const startTime = new Date(data.session.started_at).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, data.session.planned_duration - elapsed);
          setFocusTimeRemaining(remaining);
        } else {
          setFocusSession(null);
          checkPausedState();
        }
      }
    } catch (error) {
      console.error("Failed to fetch active focus session:", error);
    } finally {
      setFocusLoading(false);
    }
  }, [checkPausedState]);

  useEffect(() => {
    checkPausedState();
    fetchActiveSession();
    const pollInterval = setInterval(fetchActiveSession, 30000);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "focus_paused_state") {
        checkPausedState();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchActiveSession, checkPausedState]);

  useEffect(() => {
    if (!focusSession || focusSession.status !== "active") {
      if (focusTimerRef.current) {
        clearInterval(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      return;
    }
    focusTimerRef.current = setInterval(() => {
      setFocusTimeRemaining((prev) => {
        if (prev <= 1) {
          fetchActiveSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (focusTimerRef.current) {
        clearInterval(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [focusSession, fetchActiveSession]);

  // ===== PLAYER HANDLERS =====
  const handleSeek = useCallback((time: number) => {
    seek(time);
  }, []);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setVolume(value);
      usePlayerStore.getState().updateSettings({ volume: value });
      savePlayerSettings({ ...playerSettings, volume: value });
    },
    [playerSettings]
  );

  const handlePrevious = useCallback(() => {
    usePlayerStore.getState().previous();
  }, []);

  const handleNext = useCallback(() => {
    usePlayerStore.getState().next();
  }, []);

  const handleToggleRepeat = useCallback(() => {
    const modes: ("off" | "one" | "all")[] = ["off", "one", "all"];
    const currentIndex = modes.indexOf(playerSettings.repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    usePlayerStore.getState().updateSettings({ repeatMode: nextMode });
    savePlayerSettings({ ...playerSettings, repeatMode: nextMode });
  }, [playerSettings]);

  const handleClosePlayer = useCallback(() => {
    pause();
    usePlayerStore.getState().clearQueue();
    clearQueueState();
    lastLoadedTrackId.current = null;
    usePlayerStore.getState().setVisible(false);
  }, []);

  const handleTogglePlayerMinimize = useCallback(() => {
    setIsPlayerMinimized((prev) => !prev);
  }, []);

  const handleToggleAnalysis = useCallback(() => {
    setShowAnalysisPanel((prev) => !prev);
  }, []);

  const handleCloseAnalysis = useCallback(() => {
    setShowAnalysisPanel(false);
  }, []);

  // ===== FOCUS HANDLERS =====
  const handleAbandonFocus = useCallback(async () => {
    if (focusSession) {
      try {
        const response = await fetch(`/api/focus/${focusSession.id}/abandon`, {
          method: "POST",
        });
        if (response.ok) {
          setFocusSession(null);
        }
      } catch (error) {
        console.error("Failed to abandon focus session:", error);
      }
    }
  }, [focusSession]);

  const handleDismissPaused = useCallback(() => {
    localStorage.removeItem("focus_paused_state");
    setPausedState(null);
  }, []);

  const handleToggleFocusMinimize = useCallback(() => {
    setIsFocusMinimized((prev) => !prev);
  }, []);

  // Calculate focus progress
  let focusTotalDuration = 0;
  if (focusSession) {
    focusTotalDuration = focusSession.planned_duration;
  } else if (pausedState) {
    const focusSettings = localStorage.getItem("focus_settings");
    if (focusSettings) {
      try {
        const settings = JSON.parse(focusSettings);
        const durations: Record<string, number> = {
          focus: settings.focusDuration * 60,
          break: settings.breakDuration * 60,
          long_break: settings.longBreakDuration * 60,
        };
        focusTotalDuration = durations[pausedState.mode] || 25 * 60;
      } catch {
        focusTotalDuration = 25 * 60;
      }
    } else {
      focusTotalDuration = 25 * 60;
    }
  }
  const focusProgress = focusTotalDuration > 0
    ? Math.max(0, Math.min(1, 1 - focusTimeRemaining / focusTotalDuration))
    : 0;

  // Don't render if nothing to show
  if (!showPlayer && !showFocus) {
    return null;
  }

  return (
    <div className={styles.bottomBar} role="complementary" aria-label="Bottom bar">
      {/* Focus Section */}
      {showFocus && (
        <div
          className={`${styles.focusSection} ${isFocusMinimized ? styles.focusMinimized : ""}`}
          style={{ "--mode-color": MODE_COLORS[currentFocusMode] } as React.CSSProperties}
        >
          {!isFocusMinimized && (
            <div className={styles.focusProgressBar}>
              <div
                className={styles.focusProgressFill}
                style={{ width: `${focusProgress * 100}%` }}
              />
            </div>
          )}
          <div className={styles.focusContent}>
            <div className={styles.focusLeft}>
              <span className={styles.focusModeLabel}>{MODE_LABELS[currentFocusMode]}</span>
              <span className={styles.focusTimer}>{formatFocusTime(focusTimeRemaining)}</span>
              {isFocusPaused && <span className={styles.focusPausedBadge}>Paused</span>}
            </div>
            <div className={styles.focusRight}>
              <Link href="/focus" className={styles.focusViewButton}>
                {isFocusPaused ? "Resume" : "View"}
              </Link>
              <button
                className={styles.focusMinimizeButton}
                onClick={handleToggleFocusMinimize}
                title={isFocusMinimized ? "Expand" : "Minimize"}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isFocusMinimized ? (
                    <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                  ) : (
                    <path d="M19 12H5" />
                  )}
                </svg>
              </button>
              {isFocusActive && (
                <button
                  className={styles.focusAbandonButton}
                  onClick={handleAbandonFocus}
                  title="Abandon session"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
              {isFocusPaused && (
                <button
                  className={styles.focusAbandonButton}
                  onClick={handleDismissPaused}
                  title="Dismiss"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Player Section */}
      {showPlayer && track && (
        <div className={`${styles.playerSection} ${isPlayerMinimized ? styles.playerMinimized : ""}`}>
          {isPlayerMinimized ? (
            <div className={styles.playerMinimizedControls}>
              <button
                className={styles.playerPlayButtonMini}
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
                type="button"
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div className={styles.playerMinimizedInfo}>
                <span className={styles.playerMinimizedTitle}>{track.title}</span>
                <span className={styles.playerMinimizedTime}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <button
                className={styles.playerExpandButton}
                onClick={handleTogglePlayerMinimize}
                aria-label="Expand player"
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                </svg>
              </button>
              <button
                className={styles.playerCloseButton}
                onClick={handleClosePlayer}
                aria-label="Close player"
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              {track.audioUrl && (
                <div className={styles.playerWaveformWrapper}>
                  <Waveform
                    audioUrl={track.audioUrl}
                    trackId={track.id}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleSeek}
                    height={32}
                    barWidth={2}
                    barGap={1}
                  />
                </div>
              )}
              <div className={styles.playerControls}>
                <div className={styles.playerTrackInfo}>
                  <div className={styles.playerTrackTitle}>{track.title}</div>
                  {track.artist && (
                    <div className={styles.playerTrackArtist}>{track.artist}</div>
                  )}
                </div>
                <div className={styles.playerPlaybackControls}>
                  <button
                    className={styles.playerControlButton}
                    onClick={handlePrevious}
                    aria-label="Previous track"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                  </button>
                  <button
                    className={`${styles.playerControlButton} ${styles.playerPlayButton}`}
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    type="button"
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    className={styles.playerControlButton}
                    onClick={handleNext}
                    aria-label="Next track"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </button>
                </div>
                <div className={styles.playerTimeDisplay}>
                  <span>{formatTime(currentTime)}</span>
                  <span className={styles.playerTimeSeparator}>/</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className={styles.playerSecondaryControls}>
                  <button
                    className={`${styles.playerControlButton} ${playerSettings.repeatMode !== "off" ? styles.active : ""}`}
                    onClick={handleToggleRepeat}
                    aria-label={`Repeat: ${playerSettings.repeatMode}`}
                    title={`Repeat: ${playerSettings.repeatMode}`}
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                    </svg>
                  </button>
                  <div className={styles.playerVolumeControl}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={playerSettings.volume}
                      onChange={handleVolumeChange}
                      className={styles.playerVolumeSlider}
                      aria-label="Volume"
                    />
                  </div>
                  <button
                    className={`${styles.playerAnalyzeButton} ${showAnalysisPanel ? styles.active : ""}`}
                    onClick={handleToggleAnalysis}
                    aria-label="Open analysis panel"
                    title="Analyze track"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                    </svg>
                  </button>
                  <button
                    className={styles.playerMinimizeButton}
                    onClick={handleTogglePlayerMinimize}
                    aria-label="Minimize player"
                    title="Minimize"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                    </svg>
                  </button>
                  <button
                    className={styles.playerCloseButton}
                    onClick={handleClosePlayer}
                    aria-label="Close player"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Track Analysis Popup */}
      {showAnalysisPanel && track && (
        <TrackAnalysisPopup
          track={track}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          onClose={handleCloseAnalysis}
        />
      )}
    </div>
  );
}


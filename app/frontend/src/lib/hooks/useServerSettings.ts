/**
 * useServerSettings Hook
 * 
 * Replaces localStorage-based settings with server-sourced state.
 * Provides real-time sync across devices (via Hybrid WebSocket + Polling).
 * 
 * Usage:
 *   const { theme, setTheme, accessibility, isLoading } = useServerSettings();
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ecent.online';

export interface ServerSettings {
  theme: 'light' | 'dark' | 'system';
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
  };
  notificationsEnabled: boolean;
  [key: string]: unknown; // Allow extensibility
}

interface UseServerSettingsResult {
  settings: Partial<ServerSettings>;
  updateSetting: (key: string, value: unknown) => Promise<void>;
  theme: ServerSettings['theme'];
  setTheme: (theme: ServerSettings['theme']) => Promise<void>;
  accessibility: ServerSettings['accessibility'];
  setAccessibility: (a: ServerSettings['accessibility']) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and manage server settings
 * Handles polling fallback if WebSocket unavailable
 */
export function useServerSettings(): UseServerSettingsResult {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Partial<ServerSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch settings from /api/settings
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data = await response.json() as { settings?: Array<{ key: string; value: unknown }> };
      
      // Normalize response to ServerSettings format
      const normalized = normalizeSettings((data.settings || []) as Array<{ key: string; value: unknown }>);
      setSettings(normalized);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Setup WebSocket connection (Hybrid: desktop only)
  useEffect(() => {
    if (!user) return;

    const isDesktop = typeof window !== 'undefined' && 
                      !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    
    if (!isDesktop) {
      // Mobile: use polling instead
      startPolling();
      return;
    }

    // Desktop: try WebSocket first
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/settings/ws`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('Settings WebSocket connected');
        // Fetch on connect to sync state
        fetchSettings();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          if (type === 'settings_updated') {
            setSettings((prev) => ({
              ...prev,
              ...payload.settings,
            }));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('Settings WebSocket error:', err);
        // Fallback to polling
        startPolling();
      };

      wsRef.current.onclose = () => {
        console.log('Settings WebSocket disconnected');
        // Fallback to polling
        startPolling();
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      startPolling();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user, fetchSettings]);

  // Polling fallback (30s interval for mobile, or if WS fails)
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    pollingIntervalRef.current = setInterval(() => {
      fetchSettings();
    }, 30000); // 30 second poll interval

    // Fetch immediately
    fetchSettings();
  }, [fetchSettings]);

  // Update a single setting
  const updateSetting = useCallback(
    async (key: string, value: unknown) => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update setting: ${response.status}`);
        }

        // Optimistically update local state
        setSettings((prev) => ({
          ...prev,
          [key]: value,
        }));

        // WebSocket will broadcast the change to other clients
        // If no WS, polling will fetch the updated value in 30s
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [user]
  );

  // Convenience setters
  const setTheme = useCallback(
    (theme: ServerSettings['theme']) => updateSetting('theme', theme),
    [updateSetting]
  );

  const setAccessibility = useCallback(
    (a: ServerSettings['accessibility']) => updateSetting('accessibility', a),
    [updateSetting]
  );

  return {
    settings,
    updateSetting,
    theme: (settings.theme as ServerSettings['theme']) || 'system',
    setTheme,
    accessibility: settings.accessibility || {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
    },
    setAccessibility,
    isLoading,
    error,
  };
}

/**
 * Normalize settings array to object
 * Converts [{ key: 'theme', value: 'dark' }] to { theme: 'dark' }
 */
function normalizeSettings(
  settingsArray: Array<{ key: string; value: unknown }>
): Partial<ServerSettings> {
  const normalized: Record<string, unknown> = {};
  
  for (const setting of settingsArray) {
    normalized[setting.key] = setting.value;
  }

  return normalized;
}

/**
 * Hook to apply theme setting to document
 * Usage:
 *   const { theme } = useServerSettings();
 *   useApplyTheme(theme);
 */
export function useApplyTheme(theme: ServerSettings['theme']) {
  useEffect(() => {
    if (theme === 'system') {
      // Respect system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);
}

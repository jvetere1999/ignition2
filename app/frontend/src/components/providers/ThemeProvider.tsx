/**
 * ThemeProvider - Server-backed theme system
 * 
 * Replaces localStorage-based theme with server-sourced state.
 * Syncs via useServerSettings (Hybrid: WebSocket desktop + polling mobile).
 * 
 * Usage:
 *   <ThemeProvider>
 *     <YourApp />
 *   </ThemeProvider>
 */

'use client';

import React, { createContext, useContext } from 'react';
import { useServerSettings, useApplyTheme } from '@/lib/hooks/useServerSettings';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme, isLoading } = useServerSettings();

  // Apply theme to document
  useApplyTheme(theme as 'light' | 'dark' | 'system');

  return (
    <ThemeContext.Provider value={{ theme: theme as 'light' | 'dark' | 'system', setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

/**
 * Admin Auth Provider
 * Shared auth with main frontend via backend session API
 */

"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ecent.online';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface Session {
  user: AuthUser | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function getSession(): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/auth/session`, {
    credentials: 'include',
  });

  if (!response.ok) {
    return { user: null };
  }

  return response.json();
}

async function signOutApi(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/signout`, {
    method: 'POST',
    credentials: 'include',
  });
}

function getSignInUrl(): string {
  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://ignition.ecent.online';
  return `${mainAppUrl}/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const session = await getSession();
      setUser(session.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();

    const handleFocus = () => fetchSession();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSession]);

  const signIn = useCallback(() => {
    window.location.href = getSignInUrl();
  }, []);

  const signOut = useCallback(async () => {
    await signOutApi();
    setUser(null);
    // Redirect to main app
    window.location.href = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://ignition.ecent.online';
  }, []);

  const refresh = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
    refresh,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

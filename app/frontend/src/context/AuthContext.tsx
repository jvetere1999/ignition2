'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchWithRetry } from '@/lib/api/retry';

/**
 * User profile from authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  verified: boolean;
  level: number;
  totalXp: number;
}

/**
 * Authentication context state
 */
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<boolean>;
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider component
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithRetry(
          '/api/auth/me',
          { credentials: 'include' },
          { maxRetries: 1 } // Don't retry on initial load
        );

        if (response.ok) {
          const data = (await response.json()) as { data?: AuthUser };
          setUser(data.data || null);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Refresh current user data
   */
  const refreshUser = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetchWithRetry(
        '/api/auth/me',
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = (await response.json()) as { data?: AuthUser };
        setUser(data.data || null);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, [user]);

  /**
   * Login with email and password
   */
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithRetry(
          '/api/auth/login',
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          }
        );

        if (!response.ok) {
          const data = (await response.json()) as { error?: { message: string } };
          throw new Error(data.error?.message || 'Login failed');
        }

        const data = (await response.json()) as { data: AuthUser };
        setUser(data.data);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Logout current user
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await fetchWithRetry('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error (continuing anyway):', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  /**
   * Sign up with email, username, and password
   */
  const signup = useCallback(
    async (email: string, username: string, password: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithRetry(
          '/api/auth/signup',
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, username, password }),
          }
        );

        if (!response.ok) {
          const data = (await response.json()) as { error?: { message: string } };
          throw new Error(data.error?.message || 'Signup failed');
        }

        const data = (await response.json()) as { data: AuthUser };
        setUser(data.data);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update user profile
   */
  const updateUser = useCallback(
    async (updates: Partial<AuthUser>): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithRetry(
          '/api/auth/profile',
          {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          const data = (await response.json()) as { error?: { message: string } };
          throw new Error(data.error?.message || 'Update failed');
        }

        const data = (await response.json()) as { data: AuthUser };
        setUser(data.data);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const value: AuthContextType = {
    user,
    loading,
    authenticated: !!user,
    error,
    login,
    logout,
    signup,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { authenticated } = useAuth();
  return authenticated;
}

/**
 * Hook to get current user
 */
export function useCurrentUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

/**
 * Protected component wrapper
 * Redirects to login if not authenticated
 */
export function ProtectedRoute({
  children,
  fallback = <LoginRedirect />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!authenticated) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Login redirect component
 */
function LoginRedirect() {
  React.useEffect(() => {
    window.location.href = '/auth/login';
  }, []);

  return <div className="flex items-center justify-center min-h-screen">Redirecting to login...</div>;
}

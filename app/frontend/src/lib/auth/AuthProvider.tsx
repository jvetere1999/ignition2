"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getSession, signOut as apiSignOut, getSignInUrl, type AuthUser } from "./api-auth";

/**
 * Auth context type
 */
interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (provider?: 'google' | 'azure') => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_INVALID_COOKIE = "session_invalid=1; Max-Age=120; Path=/; SameSite=Lax";
const SESSION_INVALID_CLEAR = "session_invalid=; Max-Age=0; Path=/; SameSite=Lax";

const PUBLIC_ROUTES = new Set([
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/help",
  "/auth/signin",
  "/auth/signup",
  "/auth/callback",
  "/auth/error",
  "/pending-approval",
]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }
  for (const route of PUBLIC_ROUTES) {
    if (pathname.startsWith(`${route}/`)) {
      return true;
    }
  }
  return false;
}

function setSessionInvalidCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = SESSION_INVALID_COOKIE;
}

function clearSessionInvalidCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = SESSION_INVALID_CLEAR;
}

/**
 * Auth Provider - manages session state via backend API
 *
 * Replaces NextAuth.js SessionProvider.
 * All auth logic is in the Rust backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch session on mount and when window gains focus
    const fetchSession = useCallback(async () => {
      console.log('[AuthProvider] fetchSession called');
      setIsLoading(true);
      try {
        console.log('[AuthProvider] Fetching session...');
        const session = await getSession();
        console.log('[AuthProvider] Session fetch succeeded:', session.user);
        setUser(session.user);
      } catch (err) {
        console.error('[AuthProvider] Session fetch failed:', err);
        setUser(null);
      } finally {
        console.log('[AuthProvider] Setting isLoading to false');
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
      console.log('[AuthProvider] Mounted');
      fetchSession();

      // Refetch on focus (user might have logged in/out in another tab)
      const handleFocus = () => {
        console.log('[AuthProvider] Window focused, refetching session');
        fetchSession();
      };

      // Listen for cross-tab session termination (triggered by 401 in another tab)
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === '__session_terminated__' && event.newValue) {
          console.log('[AuthProvider] Detected session termination from another tab');
          try {
            const data = JSON.parse(event.newValue);
            console.log('[AuthProvider] Session terminated at:', new Date(data.timestamp).toISOString(), 'reason:', data.reason);
            // Clear local user state
            setUser(null);
            // Redirect to landing page
            window.location.href = '/';
          } catch (error) {
            console.error('[AuthProvider] Error parsing session termination event:', error);
          }
        }
      };

      window.addEventListener('focus', handleFocus);
      window.addEventListener('storage', handleStorageChange);
      return () => {
        console.log('[AuthProvider] Unmounted');
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('storage', handleStorageChange);
      };
    }, [fetchSession]);

  useEffect(() => {
    if (isLoading) return;
    if (typeof window === "undefined") return;

    if (user) {
      clearSessionInvalidCookie();
      return;
    }

    setSessionInvalidCookie();

    const { pathname } = window.location;
    if (!isPublicRoute(pathname) && pathname !== "/") {
      window.location.href = "/";
    }
  }, [isLoading, user]);

  // Sign in - redirect to backend OAuth endpoint
  const signIn = useCallback((provider: 'google' | 'azure' = 'google') => {
    // Get current pathname to redirect back after auth
    const redirectPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const redirectUrl = getSignInUrl(provider, redirectPath);
    console.log('[AuthProvider] Redirecting to:', redirectUrl);
    // Use window.location.href for full page redirect (only way to properly redirect to external OAuth)
    window.location.href = redirectUrl;
  }, []);

  // Sign out - call backend and redirect
  const signOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
  }, []);

  // Refresh session data
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
      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "16px",
              background: "rgba(10, 12, 20, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#e5e7eb",
              boxShadow: "0 14px 30px rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(10px)",
              minWidth: "220px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background: "#ff764d",
                boxShadow: "0 0 12px rgba(255, 118, 77, 0.8)",
                animation: "authToastPulse 1.4s ease-in-out infinite",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "rgba(255, 255, 255, 0.6)",
                }}
              >
                Ignition
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>
                Loading your workspace...
              </span>
            </div>
          </div>
          <style>{`
            @keyframes authToastPulse {
              0%, 100% {
                transform: scale(1);
                opacity: 0.7;
              }
              50% {
                transform: scale(1.35);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook that requires authentication
 * Redirects to sign in if not authenticated
 */
export function useRequireAuth() {
  const { user, isAuthenticated, isLoading, signIn } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      signIn();
    }
  }, [isLoading, isAuthenticated, signIn]);

  return {
    isLoading,
    user,
    isAuthenticated,
  };
}

/**
 * SessionProvider - alias for AuthProvider for backwards compatibility
 */
export const SessionProvider = AuthProvider;

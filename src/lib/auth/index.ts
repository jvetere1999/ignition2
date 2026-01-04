/**
 * Auth.js configuration for Passion OS
 * Uses D1 adapter for session/user storage
 */

import NextAuth from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import type { NextAuthConfig } from "next-auth";
import type { D1Database } from "@cloudflare/workers-types";
import { getProviders } from "./providers";

/**
 * Extended session type to include user ID and approval status
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      approved?: boolean;
      ageVerified?: boolean;
    };
  }
  interface User {
    approved?: boolean;
    ageVerified?: boolean;
  }
}


/**
 * Helper to get D1 database from Cloudflare environment
 * Returns null if not available (e.g., during build or local development)
 */
function getD1Database(): D1Database | null {
  try {
    const env = (globalThis as unknown as { env?: { DB?: D1Database } }).env;
    return env?.DB ?? null;
  } catch {
    return null;
  }
}

// Track if we've logged the D1 warning
let hasLoggedD1Warning = false;

/**
 * Create auth configuration based on environment
 * Uses D1 adapter when available, falls back to JWT when not
 */
function createRuntimeConfig(): NextAuthConfig {
  const db = getD1Database();

  // Secure cookies require HTTPS; disable on localhost
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  const isLocal = authUrl.startsWith("http://localhost") || authUrl.startsWith("http://127.0.0.1");
  const useSecureCookies = process.env.NODE_ENV === "production" && !isLocal;

  // Debug logging (remove after fixing)
  if (!hasLoggedD1Warning) {
    console.log("[auth] Config:", {
      nodeEnv: process.env.NODE_ENV,
      authUrl,
      isLocal,
      useSecureCookies,
      hasD1: !!db,
    });
    hasLoggedD1Warning = true;
  }

  // Base configuration shared by both modes
  const baseConfig: NextAuthConfig = {
    providers: getProviders(),
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
    trustHost: true,
    debug: process.env.NODE_ENV === "development",
    callbacks: {
      // Control who can sign in - allow all OAuth
      signIn: async () => {
        return true;
      },
      // Redirect after sign in
      redirect: ({ url, baseUrl }) => {
        if (url.startsWith(baseUrl)) {
          return url;
        }
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }
        return baseUrl;
      },
    },
    cookies: {
      sessionToken: {
        name: "passion-os.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: useSecureCookies,
        },
      },
      callbackUrl: {
        name: "passion-os.callback-url",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: useSecureCookies,
        },
      },
      csrfToken: {
        name: "passion-os.csrf-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: useSecureCookies,
        },
      },
    },
  };

  if (db) {
    // Production mode with D1 adapter
    return {
      ...baseConfig,
      adapter: D1Adapter(db),
      session: {
        strategy: "database",
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
      },
      events: {
        // When a new user is created, set initial values
        createUser: async ({ user }) => {
          if (user.id && user.email) {
            try {
              // Check if user is an admin
              const adminEmails = (process.env.ADMIN_EMAILS || "")
                .split(",")
                .map((e) => e.trim().toLowerCase())
                .filter((e) => e.length > 0);
              const isAdmin = adminEmails.includes(user.email.toLowerCase());

              // All users are auto-approved (no approval process)
              // Only admins auto-accept TOS, others must accept on first login
              const role = isAdmin ? "admin" : "user";
              const tosAccepted = isAdmin ? 1 : 0;
              const now = new Date().toISOString();

              await db
                .prepare(`
                  UPDATE users 
                  SET approved = 1,
                      age_verified = 1,
                      role = ?,
                      tos_accepted = ?,
                      tos_accepted_at = ${isAdmin ? "?" : "NULL"},
                      tos_version = ${isAdmin ? "'1.0'" : "NULL"},
                      updated_at = ? 
                  WHERE id = ?
                `)
                .bind(
                  role,
                  tosAccepted,
                  ...(isAdmin ? [now] : []),
                  now,
                  user.id
                )
                .run();

              console.log(`[auth] New user created: ${user.email}, admin=${isAdmin}, tosAccepted=${tosAccepted}`);
            } catch (e) {
              console.error("[auth] Failed to set initial user status:", e);
            }
          }
        },
      },
      callbacks: {
        ...baseConfig.callbacks,
        // Add user ID and approval status to session for database sessions
        session: async ({ session, user }) => {
          // Fetch approval status from users table
          let approved = false;
          let ageVerified = false;

          try {
            const userRecord = await db
              .prepare(`SELECT approved, age_verified FROM users WHERE id = ?`)
              .bind(user.id)
              .first<{ approved: number; age_verified: number }>();

            if (userRecord) {
              approved = userRecord.approved === 1;
              ageVerified = userRecord.age_verified === 1;
            }
          } catch (e) {
            console.error("[auth] Failed to fetch user approval status:", e);
          }

          return {
            ...session,
            user: {
              ...session.user,
              id: user.id,
              approved,
              ageVerified,
            },
          };
        },
      },
    };
  }

  // Fallback to JWT sessions when D1 is not available
  // This allows local development and build-time operations to work
  if (!hasLoggedD1Warning) {
    console.log("[auth] D1 not available, using JWT sessions");
    hasLoggedD1Warning = true;
  }

  return {
    ...baseConfig,
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
      ...baseConfig.callbacks,
      // For JWT mode, include user info in token
      jwt: ({ token, user, account }) => {
        // Initial sign in - add user data to token
        if (account && user) {
          return {
            ...token,
            id: user.id,
            name: user.name,
            email: user.email,
            picture: user.image,
            // In JWT mode without D1, assume approved for development
            approved: true,
            ageVerified: true,
          };
        }
        return token;
      },
      // Add user ID to session for JWT sessions
      session: ({ session, token }) => ({
        ...session,
        user: {
          ...session.user,
          id: token.id as string ?? token.sub ?? "",
          name: token.name,
          email: token.email,
          image: token.picture as string | undefined,
          approved: token.approved as boolean ?? true,
          ageVerified: token.ageVerified as boolean ?? true,
        },
      }),
    },
  };
}

/**
 * Export auth handlers and helpers
 * Configuration is created at runtime to access D1 binding
 */
export const { handlers, auth, signIn, signOut } = NextAuth(createRuntimeConfig);

/**
 * Get the current session (server-side)
 */
export { auth as getSession };


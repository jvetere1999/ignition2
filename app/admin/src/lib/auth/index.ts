/**
 * Auth stub for Admin Console
 *
 * NOTE: This is a placeholder. In production, admin will use the same
 * backend auth at api.ecent.online. This stub preserves the existing
 * behavior pattern until the backend is ready.
 *
 * TODO: Replace with real auth once backend is deployed (Phase 08+)
 */

interface Session {
  user: {
    email: string | null;
    name: string | null;
    image: string | null;
  } | null;
}

/**
 * Get the current session
 * This is a placeholder that returns null until auth is integrated
 */
export async function auth(): Promise<Session | null> {
  // TODO: Integrate with backend auth at api.ecent.online
  // For now, this allows the page to render but will redirect non-admins

  // Check if we're in development and have a dev bypass
  if (process.env.NODE_ENV === "development" && process.env.AUTH_DEV_BYPASS === "true") {
    const devEmail = process.env.AUTH_DEV_EMAIL || "dev@localhost";
    return {
      user: {
        email: devEmail,
        name: "Dev User",
        image: null,
      },
    };
  }

  // In production, this will be replaced with real auth
  // For now, return null which will trigger redirect to signin
  return null;
}


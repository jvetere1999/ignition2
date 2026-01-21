/**
 * Server-side auth utilities
 * 
 * For server components that need to check auth or get user data.
 * Uses cookies to authenticate with the backend.
 */

import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/config/environment";

const API_BASE_URL = getApiBaseUrl();

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  entitlements: string[];
  approved: boolean;
  tosAccepted: boolean;
}

export interface Session {
  user: AuthUser | null;
}

interface RawAuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  entitlements?: string[];
  approved?: boolean;
  tos_accepted?: boolean;
  tosAccepted?: boolean;
}

function normalizeAuthUser(raw: RawAuthUser): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    image: raw.image ?? null,
    role: raw.role,
    entitlements: raw.entitlements ?? [],
    approved: raw.approved ?? false,
    tosAccepted: raw.tos_accepted ?? raw.tosAccepted ?? false,
  };
}

/**
 * Get session from backend API (for server components)
 * Forwards the session cookie to the backend
 */
export async function auth(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/session`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { user: RawAuthUser | null };
    
    if (!data.user) {
      return null;
    }

    return { user: normalizeAuthUser(data.user) };
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

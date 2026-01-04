/**
 * User Repository
 * Handles user creation/lookup for JWT session users
 */

import type { D1Database } from "@cloudflare/workers-types";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: number | null;
  image: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Ensure a user exists in the database
 * Creates the user if they don't exist (for JWT session users)
 * Returns the user record
 */
export async function ensureUserExists(
  db: D1Database,
  userId: string,
  userData?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
): Promise<User> {
  // Check if user exists
  const existing = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first<User>();

  if (existing) {
    return existing;
  }

  // Create user if they don't exist
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO users (id, name, email, image, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      userId,
      userData?.name || null,
      userData?.email || null,
      userData?.image || null,
      now,
      now
    )
    .run();

  // Return the created user
  const user = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first<User>();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(
  db: D1Database,
  userId: string
): Promise<User | null> {
  return db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first<User>();
}


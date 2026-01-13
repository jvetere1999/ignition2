/**
 * Focus Sessions Repository
 * CRUD operations for focus sessions in D1
 */

import type { D1Database } from "@cloudflare/workers-types";
import type {
  FocusSession,
  FocusSessionStatus,
  FocusMode,
  CreateFocusSessionInput,
} from "../types";
import {
  generateId,
  now,
  validateRequired,
  validateEnum,
  paginatedQuery,
  type PaginatedResult,
  type PaginationOptions,
} from "../utils";

const FOCUS_STATUSES: readonly FocusSessionStatus[] = [
  "active",
  "completed",
  "abandoned",
];

const FOCUS_MODES: readonly FocusMode[] = ["focus", "break", "long_break"];

/**
 * Create a new focus session
 */
export async function createFocusSession(
  db: D1Database,
  input: CreateFocusSessionInput
): Promise<FocusSession> {
  validateRequired(input.user_id, "user_id");
  validateEnum(input.status, FOCUS_STATUSES, "status");
  validateEnum(input.mode, FOCUS_MODES, "mode");

  if (input.duration_seconds <= 0) {
    throw new Error("duration_seconds must be positive");
  }

  const id = generateId();
  const timestamp = now();

  const session: FocusSession = {
    id,
    user_id: input.user_id,
    mode: input.mode,
    duration_seconds: input.duration_seconds,
    started_at: input.started_at,
    completed_at: null,
    abandoned_at: null,
    expires_at: input.expires_at || null,
    status: input.status,
    xp_awarded: 0,
    coins_awarded: 0,
    task_id: null,
    task_title: null,
    paused_at: null,
    paused_remaining_seconds: null,
    created_at: timestamp,
  };

  await db
    .prepare(
      `INSERT INTO focus_sessions (
        id, user_id, mode, duration_seconds, started_at, completed_at,
        abandoned_at, expires_at, status, xp_awarded, coins_awarded, task_id,
        task_title, paused_at, paused_remaining_seconds, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      session.id,
      session.user_id,
      session.mode,
      session.duration_seconds,
      session.started_at,
      session.completed_at,
      session.abandoned_at,
      session.expires_at,
      session.status,
      session.xp_awarded,
      session.coins_awarded,
      session.task_id,
      session.task_title,
      session.paused_at,
      session.paused_remaining_seconds,
      session.created_at
    )
    .run();

  return session;
}

/**
 * Get a focus session by ID
 */
export async function getFocusSession(
  db: D1Database,
  id: string,
  userId: string
): Promise<FocusSession | null> {
  const result = await db
    .prepare("SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<FocusSession>();

  return result;
}

/**
 * Complete a focus session
 */
export async function completeFocusSession(
  db: D1Database,
  id: string,
  userId: string
): Promise<FocusSession | null> {
  const existing = await getFocusSession(db, id, userId);
  if (!existing || existing.status !== "active") return null;

  const endedAt = now();
  const startTime = new Date(existing.started_at).getTime();
  const endTime = new Date(endedAt).getTime();
  const actualDuration = Math.floor((endTime - startTime) / 1000);

  await db
    .prepare(
      `UPDATE focus_sessions SET
        ended_at = ?, actual_duration = ?, status = ?
      WHERE id = ? AND user_id = ?`
    )
    .bind(endedAt, actualDuration, "completed", id, userId)
    .run();

  return {
    ...existing,
    ended_at: endedAt,
    actual_duration: actualDuration,
    status: "completed",
  };
}

/**
 * Abandon a focus session
 */
export async function abandonFocusSession(
  db: D1Database,
  id: string,
  userId: string
): Promise<FocusSession | null> {
  const existing = await getFocusSession(db, id, userId);
  if (!existing || existing.status !== "active") return null;

  const endedAt = now();
  const startTime = new Date(existing.started_at).getTime();
  const endTime = new Date(endedAt).getTime();
  const actualDuration = Math.floor((endTime - startTime) / 1000);

  await db
    .prepare(
      `UPDATE focus_sessions SET
        ended_at = ?, actual_duration = ?, status = ?
      WHERE id = ? AND user_id = ?`
    )
    .bind(endedAt, actualDuration, "abandoned", id, userId)
    .run();

  return {
    ...existing,
    ended_at: endedAt,
    actual_duration: actualDuration,
    status: "abandoned",
  };
}

/**
 * Get active focus session for user
 * Also auto-abandons expired sessions
 */
export async function getActiveFocusSession(
  db: D1Database,
  userId: string
): Promise<FocusSession | null> {
  const result = await db
    .prepare(
      "SELECT * FROM focus_sessions WHERE user_id = ? AND status = 'active' LIMIT 1"
    )
    .bind(userId)
    .first<FocusSession>();

  if (!result) return null;

  // Check if session has expired
  if (result.expires_at) {
    const expiryTime = new Date(result.expires_at).getTime();
    if (Date.now() > expiryTime) {
      // Auto-abandon expired session
      await abandonFocusSession(db, result.id, userId);
      return null;
    }
  }

  return result;
}

/**
 * List focus sessions with pagination
 */
export interface ListFocusSessionsOptions extends PaginationOptions {
  status?: FocusSessionStatus;
  mode?: FocusMode;
  startDate?: string;
  endDate?: string;
}

export async function listFocusSessions(
  db: D1Database,
  userId: string,
  options: ListFocusSessionsOptions = {}
): Promise<PaginatedResult<FocusSession>> {
  const conditions = ["user_id = ?"];
  const params: unknown[] = [userId];

  if (options.status) {
    conditions.push("status = ?");
    params.push(options.status);
  }
  if (options.mode) {
    conditions.push("mode = ?");
    params.push(options.mode);
  }
  if (options.startDate) {
    conditions.push("started_at >= ?");
    params.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push("started_at <= ?");
    params.push(options.endDate);
  }

  const whereClause = conditions.join(" AND ");
  const sql = `SELECT * FROM focus_sessions WHERE ${whereClause} ORDER BY started_at DESC`;
  const countSql = `SELECT COUNT(*) as count FROM focus_sessions WHERE ${whereClause}`;

  return paginatedQuery<FocusSession>(db, sql, countSql, params, options);
}

/**
 * Get focus session stats for a user
 */
export interface FocusStats {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  totalFocusTime: number;
  averageSessionLength: number;
}

export async function getFocusStats(
  db: D1Database,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<FocusStats> {
  const conditions = ["user_id = ?"];
  const params: unknown[] = [userId];

  if (startDate) {
    conditions.push("started_at >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conditions.push("started_at <= ?");
    params.push(endDate);
  }

  const whereClause = conditions.join(" AND ");

  const result = await db
    .prepare(
      `SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_sessions,
        SUM(CASE WHEN status = 'completed' AND mode = 'focus' THEN actual_duration ELSE 0 END) as total_focus_time
      FROM focus_sessions WHERE ${whereClause}`
    )
    .bind(...params)
    .first<{
      total_sessions: number;
      completed_sessions: number;
      abandoned_sessions: number;
      total_focus_time: number;
    }>();

  const totalSessions = result?.total_sessions ?? 0;
  const completedSessions = result?.completed_sessions ?? 0;
  const totalFocusTime = result?.total_focus_time ?? 0;

  return {
    totalSessions,
    completedSessions,
    abandonedSessions: result?.abandoned_sessions ?? 0,
    totalFocusTime,
    averageSessionLength:
      completedSessions > 0 ? Math.floor(totalFocusTime / completedSessions) : 0,
  };
}


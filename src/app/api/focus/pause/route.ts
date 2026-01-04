/**
 * Focus Pause State API Route
 * Sync focus pause state across devices
 *
 * Optimized with createAPIHandler for timing instrumentation
 */

import { NextRequest, NextResponse } from "next/server";
import { createAPIHandler, type APIContext } from "@/lib/perf";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ensureUserExists } from "@/lib/db/repositories/users";
import type { CloudflareEnv } from "@/env";

export const dynamic = "force-dynamic";

interface PauseState {
  mode: string;
  time_remaining: number;
  paused_at: string;
}

/**
 * GET /api/focus/pause
 * Get the current pause state for the user
 */
export const GET = createAPIHandler(async (ctx: APIContext) => {
  const result = await ctx.db
    .prepare(`
      SELECT mode, time_remaining, paused_at
      FROM focus_pause_state
      WHERE user_id = ?
    `)
    .bind(ctx.dbUser.id)
    .first<PauseState>();

  if (!result) {
    return NextResponse.json({ pauseState: null });
  }

  // Check if pause state is still valid (less than 1 hour old)
  const pausedAt = new Date(result.paused_at).getTime();
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (pausedAt < hourAgo) {
    // Clean up expired pause state
    await ctx.db
      .prepare(`DELETE FROM focus_pause_state WHERE user_id = ?`)
      .bind(ctx.dbUser.id)
      .run();
    return NextResponse.json({ pauseState: null });
  }

  return NextResponse.json({
    pauseState: {
      mode: result.mode,
      timeRemaining: result.time_remaining,
      pausedAt: result.paused_at,
    },
  });
});

/**
 * POST /api/focus/pause
 * Save or clear pause state
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCloudflareContext();
    const db = (ctx.env as unknown as CloudflareEnv).DB;

    if (!db) {
      return NextResponse.json({ success: true, persisted: false });
    }

    const dbUser = await ensureUserExists(db, session.user.id, {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json();
    const now = new Date().toISOString();

    if (body.action === "clear") {
      await db
        .prepare(`DELETE FROM focus_pause_state WHERE user_id = ?`)
        .bind(dbUser.id)
        .run();
      return NextResponse.json({ success: true });
    }

    if (body.action === "save") {
      await db
        .prepare(`
          INSERT OR REPLACE INTO focus_pause_state (id, user_id, mode, time_remaining, paused_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          `pause_${dbUser.id}`,
          dbUser.id,
          body.mode || "focus",
          body.timeRemaining || 0,
          body.pausedAt || now,
          now,
          now
        )
        .run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/focus/pause error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

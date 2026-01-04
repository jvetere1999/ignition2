/**
 * Focus Sessions API Route
 * GET /api/focus - List focus sessions
 * POST /api/focus - Create focus session
 */

import { NextRequest, NextResponse } from "next/server";
import type { D1Database } from "@cloudflare/workers-types";
import { auth } from "@/lib/auth";
import {
  createFocusSession,
  listFocusSessions,
  getFocusStats,
  type CreateFocusSessionInput,
  type FocusMode,
  type FocusSessionStatus,
} from "@/lib/db";
import { ensureUserExists } from "@/lib/db/repositories/users";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

async function getDB(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as unknown as { DB?: D1Database }).DB ?? null;
  } catch {
    try {
      const env = (globalThis as unknown as { env?: { DB?: D1Database } }).env;
      return env?.DB ?? null;
    } catch {
      return null;
    }
  }
}

interface CreateFocusBody {
  mode?: FocusMode;
  planned_duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * GET /api/focus
 * List focus sessions or get stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDB();
    if (!db) {
      // Return empty stats if no database
      const { searchParams } = new URL(request.url);
      if (searchParams.get("stats") === "true") {
        return NextResponse.json({
          totalSessions: 0,
          completedSessions: 0,
          abandonedSessions: 0,
          totalFocusTime: 0,
          averageSessionLength: 0,
        });
      }
      return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    }

    const { searchParams } = new URL(request.url);
    const stats = searchParams.get("stats") === "true";

    if (stats) {
      const period = searchParams.get("period") || "day";
      let startDate: string | undefined;

      const now = new Date();
      if (period === "day") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (period === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else if (period === "month") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString();
      }

      const focusStats = await getFocusStats(db, session.user.id, startDate);
      return NextResponse.json(focusStats);
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const result = await listFocusSessions(db, session.user.id, {
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Focus GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/focus
 * Create a new focus session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDB();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Ensure user exists in database
    await ensureUserExists(db, session.user.id, {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    });

    const body = (await request.json()) as CreateFocusBody;
    const plannedDuration = body.planned_duration || 25 * 60; // Default 25 minutes in seconds

    // Calculate expiry time - 2x planned duration for buffer
    const expiryBuffer = plannedDuration * 2;
    const expiresAt = new Date(Date.now() + expiryBuffer * 1000).toISOString();

    const input: CreateFocusSessionInput = {
      user_id: session.user.id,
      started_at: new Date().toISOString(),
      planned_duration: plannedDuration,
      status: "active" as FocusSessionStatus,
      mode: body.mode || "focus",
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      expires_at: expiresAt,
      linked_library_id: null, // Can be set later if user links a library
    };

    const focusSession = await createFocusSession(db, input);

    return NextResponse.json({ success: true, session: focusSession }, { status: 201 });
  } catch (error) {
    console.error("Focus POST error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


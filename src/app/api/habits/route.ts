/**
 * Habits API Route
 * CRUD for habits and habit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ensureUserExists } from "@/lib/db/repositories/users";
import { logActivityEvent } from "@/lib/db/repositories/activity-events";
import type { CloudflareEnv } from "@/env";

export const dynamic = "force-dynamic";

interface Habit {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  target_count: number;
  category: string;
  xp_reward: number;
  coin_reward: number;
  skill_id: string | null;
  is_active: number;
  created_at: string;
}

interface HabitLog {
  id: string;
  habit_id: string;
  completed_at: string;
}

/**
 * GET /api/habits
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCloudflareContext();
    const db = (ctx.env as unknown as CloudflareEnv).DB;

    if (!db) {
      return NextResponse.json({ habits: [], todayLogs: [], streaks: {} });
    }

    const dbUser = await ensureUserExists(db, session.user.id, {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    });

    const habits = await db
      .prepare(`SELECT * FROM habits WHERE user_id = ? AND is_active = 1 ORDER BY created_at ASC`)
      .bind(dbUser.id)
      .all<Habit>();

    const today = new Date().toISOString().split("T")[0];
    const todayLogs = await db
      .prepare(`SELECT * FROM habit_logs WHERE user_id = ? AND completed_at >= ? AND completed_at < date(?, '+1 day')`)
      .bind(dbUser.id, today, today)
      .all<HabitLog>();

    const streaks = await db
      .prepare(`SELECT streak_type, current_streak, longest_streak FROM user_streaks WHERE user_id = ?`)
      .bind(dbUser.id)
      .all<{ streak_type: string; current_streak: number; longest_streak: number }>();

    const streakMap: Record<string, { current: number; longest: number }> = {};
    for (const s of streaks.results || []) {
      streakMap[s.streak_type] = { current: s.current_streak, longest: s.longest_streak };
    }

    return NextResponse.json({ habits: habits.results || [], todayLogs: todayLogs.results || [], streaks: streakMap });
  } catch (error) {
    console.error("GET /api/habits error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/habits
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

    const body = await request.json() as {
      action: string;
      id?: string;
      habit_id?: string;
      title?: string;
      description?: string;
      frequency?: string;
      target_count?: number;
      category?: string;
      xp_reward?: number;
      coin_reward?: number;
      skill_id?: string;
      notes?: string;
    };
    const now = new Date().toISOString();

    if (body.action === "create") {
      const id = `habit_${Date.now()}`;
      await db
        .prepare(`INSERT INTO habits (id, user_id, title, description, frequency, target_count, category, xp_reward, coin_reward, skill_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
        .bind(id, dbUser.id, body.title, body.description || null, body.frequency || "daily", body.target_count || 1, body.category || "general", body.xp_reward || 10, body.coin_reward || 5, body.skill_id || null, now, now)
        .run();
      return NextResponse.json({ success: true, id });
    }

    if (body.action === "log") {
      const logId = `hlog_${Date.now()}`;
      await db
        .prepare(`INSERT INTO habit_logs (id, habit_id, user_id, completed_at, notes) VALUES (?, ?, ?, ?, ?)`)
        .bind(logId, body.habit_id, dbUser.id, now, body.notes || null)
        .run();

      const habit = await db.prepare(`SELECT * FROM habits WHERE id = ?`).bind(body.habit_id).first<Habit>();
      if (habit) {
        await logActivityEvent(db, dbUser.id, "habit_complete", {
          entityType: "habit",
          entityId: body.habit_id,
          customXp: habit.xp_reward,
          customCoins: habit.coin_reward,
          skillId: habit.skill_id || undefined,
          metadata: { habitTitle: habit.title },
        });
      }
      return NextResponse.json({ success: true, id: logId });
    }

    if (body.action === "update") {
      await db
        .prepare(`UPDATE habits SET title = ?, description = ?, frequency = ?, target_count = ?, category = ?, xp_reward = ?, coin_reward = ?, skill_id = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
        .bind(body.title, body.description || null, body.frequency || "daily", body.target_count || 1, body.category || "general", body.xp_reward || 10, body.coin_reward || 5, body.skill_id || null, now, body.id, dbUser.id)
        .run();
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete") {
      await db.prepare(`UPDATE habits SET is_active = 0, updated_at = ? WHERE id = ? AND user_id = ?`).bind(now, body.id, dbUser.id).run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/habits error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

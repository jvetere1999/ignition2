/**
 * Quests API Route
 * GET /api/quests - List universal quests for all users
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "@/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/quests
 * List active universal quests
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
      // Return default quests for development
      return NextResponse.json({
        quests: [
          {
            id: "quest-daily-focus",
            title: "Deep Focus",
            description: "Complete 2 focus sessions",
            type: "daily",
            xpReward: 50,
            coinReward: 25,
            target: 2,
            skillId: "knowledge",
          },
          {
            id: "quest-daily-exercise",
            title: "Stay Active",
            description: "Log 1 exercise session",
            type: "daily",
            xpReward: 30,
            coinReward: 15,
            target: 1,
            skillId: "guts",
          },
          {
            id: "quest-daily-planner",
            title: "Plan Ahead",
            description: "Add 3 events to your planner",
            type: "daily",
            xpReward: 20,
            coinReward: 10,
            target: 3,
            skillId: "proficiency",
          },
          {
            id: "quest-weekly-focus",
            title: "Focus Master",
            description: "Complete 10 focus sessions this week",
            type: "weekly",
            xpReward: 200,
            coinReward: 100,
            target: 10,
            skillId: "knowledge",
          },
          {
            id: "quest-weekly-streak",
            title: "Consistency",
            description: "Maintain a 5-day streak",
            type: "weekly",
            xpReward: 150,
            coinReward: 75,
            target: 5,
            skillId: "proficiency",
          },
        ],
      });
    }

    const result = await db
      .prepare(`
        SELECT 
          id,
          title,
          description,
          type,
          xp_reward as xpReward,
          coin_reward as coinReward,
          target,
          skill_id as skillId
        FROM universal_quests
        WHERE is_active = 1
        ORDER BY type, created_at DESC
      `)
      .all();

    return NextResponse.json({ quests: result.results || [] });
  } catch (error) {
    console.error("Quest GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

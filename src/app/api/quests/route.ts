/**
 * Quests API Route
 * GET /api/quests - List universal quests for all users
 *
 * Optimized with:
 * - createAPIHandler for timing instrumentation
 * - Parallel DB queries for quests and user progress
 */

import { NextResponse } from "next/server";
import { createAPIHandler, type APIContext } from "@/lib/perf";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ensureUserExists } from "@/lib/db/repositories/users";
import type { CloudflareEnv } from "@/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/quests
 * List active universal quests
 */
export const GET = createAPIHandler(async (ctx: APIContext) => {
  // Run both queries in parallel for better performance
  const [questsResult, progressResult] = await Promise.all([
    ctx.db
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
      .all(),
    ctx.db
      .prepare(`
        SELECT quest_id, progress, completed, completed_at
        FROM user_quest_progress 
        WHERE user_id = ?
      `)
      .bind(ctx.dbUser.id)
      .all<{ quest_id: string; progress: number; completed: number; completed_at: string | null }>(),
  ]);

  const progressMap: Record<string, { progress: number; completed: boolean }> = {};
  (progressResult.results || []).forEach((p) => {
    progressMap[p.quest_id] = { progress: p.progress, completed: p.completed === 1 };
  });

  return NextResponse.json({ quests: questsResult.results || [], userProgress: progressMap });
});
  }
}

/**
 * POST /api/quests
 * Update quest progress or complete a quest
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCloudflareContext();
    const db = (ctx.env as unknown as CloudflareEnv).DB;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json();
    const { type, questId, progress, xpReward, coinReward, skillId } = body;

    if (!db) {
      // Still return success for local dev but log warning
      console.warn("[quests] D1 not available, quest progress not persisted");
      return NextResponse.json({ success: true, persisted: false });
    }

    // Get the database user ID
    const dbUser = await ensureUserExists(db, session.user.id, {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    });
    const userId = dbUser.id;
    const now = new Date().toISOString();

    if (type === "progress") {
      // Update quest progress in user_quest_progress table
      const existing = await db
        .prepare(`SELECT * FROM user_quest_progress WHERE user_id = ? AND quest_id = ?`)
        .bind(userId, questId)
        .first();

      if (existing) {
        await db
          .prepare(`UPDATE user_quest_progress SET progress = ?, updated_at = ? WHERE user_id = ? AND quest_id = ?`)
          .bind(progress, now, userId, questId)
          .run();
      } else {
        await db
          .prepare(`INSERT INTO user_quest_progress (id, user_id, quest_id, progress, completed, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)`)
          .bind(`uqp_${Date.now()}`, userId, questId, progress, now, now)
          .run();
      }

      return NextResponse.json({ success: true, persisted: true });
    }

    if (type === "complete") {
      // Mark quest as completed
      await db
        .prepare(`
          INSERT INTO user_quest_progress (id, user_id, quest_id, progress, completed, completed_at, created_at, updated_at) 
          VALUES (?, ?, ?, ?, 1, ?, ?, ?)
          ON CONFLICT(user_id, quest_id) DO UPDATE SET 
            completed = 1, 
            completed_at = ?,
            updated_at = ?
        `)
        .bind(`uqp_${Date.now()}`, userId, questId, progress || 1, now, now, now, now, now)
        .run();

      // Award XP to skill
      if (xpReward && skillId) {
        const skillResult = await db
          .prepare(`SELECT xp FROM user_skills WHERE user_id = ? AND skill_id = ?`)
          .bind(userId, skillId)
          .first<{ xp: number }>();

        const currentXp = skillResult?.xp || 0;
        const newXp = currentXp + xpReward;

        await db
          .prepare(`
            INSERT INTO user_skills (id, user_id, skill_id, xp, level, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(user_id, skill_id) DO UPDATE SET
              xp = ?,
              updated_at = ?
          `)
          .bind(`skill_${Date.now()}`, userId, skillId, newXp, now, now, newXp, now)
          .run();
      }

      // Add to reward ledger
      if (xpReward) {
        await db
          .prepare(`INSERT INTO reward_ledger (id, user_id, domain_id, reward_type, amount, reason, created_at) VALUES (?, ?, 'quests', 'xp', ?, ?, ?)`)
          .bind(`reward_${Date.now()}_xp`, userId, xpReward, `Quest completed: ${questId}`, now)
          .run();
      }

      if (coinReward) {
        await db
          .prepare(`INSERT INTO reward_ledger (id, user_id, domain_id, reward_type, amount, reason, created_at) VALUES (?, ?, 'quests', 'coins', ?, ?, ?)`)
          .bind(`reward_${Date.now()}_coins`, userId, coinReward, `Quest completed: ${questId}`, now)
          .run();
      }

      return NextResponse.json({ success: true, persisted: true, xpAwarded: xpReward, coinsAwarded: coinReward });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Quest POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


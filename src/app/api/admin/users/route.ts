/**
 * Admin Users API
 * Manage user approvals and roles
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "@/env";

const ADMIN_EMAILS = ["jvetere1999@gmail.com"];

async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.email ? ADMIN_EMAILS.includes(session.user.email) : false;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const ctx = await getCloudflareContext();
    const db = (ctx.env as unknown as CloudflareEnv).DB;

    if (!db) {
      // Return mock data for local dev
      return NextResponse.json({
        users: [
          { id: "1", email: "test@example.com", name: "Test User", role: "user", approved: false, createdAt: new Date().toISOString() },
        ],
      });
    }

    const result = await db
      .prepare(`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.image,
          u.role,
          u.approved,
          u.created_at as createdAt,
          s.level,
          s.total_xp as totalXp
        FROM users u
        LEFT JOIN user_stats s ON u.id = s.user_id
        ORDER BY u.created_at DESC
      `)
      .all();

    return NextResponse.json({ users: result.results || [] });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json() as { userId?: string; action?: string; reason?: string };
    const { userId, action, reason } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    const ctx = await getCloudflareContext();
    const db = (ctx.env as unknown as CloudflareEnv).DB;

    if (!db) {
      return NextResponse.json({ success: true });
    }

    const session = await auth();
    const adminId = session?.user?.id;

    if (action === "approve") {
      await db
        .prepare(`
          UPDATE users 
          SET approved = 1, 
              approved_at = datetime('now'),
              approved_by = ?
          WHERE id = ?
        `)
        .bind(adminId, userId)
        .run();
    } else if (action === "deny") {
      await db
        .prepare(`
          UPDATE users 
          SET approved = 0, 
              denial_reason = ?
          WHERE id = ?
        `)
        .bind(reason || null, userId)
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}


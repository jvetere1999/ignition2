/**
 * Approval Status API
 * Check if the current user is approved
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "@/env";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const ctx = await getCloudflareContext();
    const db = (ctx.env as unknown as CloudflareEnv).DB;

    if (!db) {
      // In development without D1, assume approved
      return NextResponse.json({ status: "approved" });
    }

    const userId = session.user.id;

    const user = await db
      .prepare(`SELECT approved, denial_reason FROM users WHERE id = ?`)
      .bind(userId)
      .first<{ approved: number; denial_reason: string | null }>();

    if (!user) {
      return NextResponse.json({ status: "pending" });
    }

    if (user.approved === 1) {
      return NextResponse.json({ status: "approved" });
    }

    if (user.denial_reason) {
      return NextResponse.json({ status: "denied", denialReason: user.denial_reason });
    }

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    console.error("Failed to check approval status:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}


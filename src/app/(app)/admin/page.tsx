/**
 * Admin Console Page
 * Only accessible to admin users (jvetere1999@gmail.com)
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminClient } from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin Console - Passion OS",
  description: "Administrator dashboard for Passion OS.",
};

// Admin email addresses (both Google and Microsoft)
const ADMIN_EMAILS = ["jvetere1999@gmail.com"];

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const isAdmin = ADMIN_EMAILS.includes(session.user.email || "");

  if (!isAdmin) {
    redirect("/today");
  }

  return <AdminClient userEmail={session.user.email || ""} />;
}


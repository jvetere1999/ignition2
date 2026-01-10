/**
 * Admin Console Page
 * Only accessible to admin users defined in ADMIN_EMAILS env var
 * 
 * Auth is handled by middleware, admin role check in client component
 */

import type { Metadata } from "next";
import { AdminClient } from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin Console - Ignition",
  description: "Administrator dashboard for Ignition.",
};

export default async function AdminPage() {
  // Note: Admin role verification happens in AdminClient using useAuth()
  return <AdminClient />;
}


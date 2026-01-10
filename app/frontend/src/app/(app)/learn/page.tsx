/**
 * Learn Dashboard Page
 * Main entry point for the learning suite
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { LearnDashboard } from "./LearnDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your learning dashboard - continue lessons, review cards, and track progress.",
};

export default async function LearnPage() {
  return <LearnDashboard />;
}


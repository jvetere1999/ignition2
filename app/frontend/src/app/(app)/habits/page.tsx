/**
 * Habits Page
 * Daily habit tracking with streaks
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { HabitsClient } from "./HabitsClient";

export const metadata: Metadata = {
  title: "Habits",
  description: "Track your daily habits and build streaks.",
};

export default async function HabitsPage() {
  return <HabitsClient />;
}

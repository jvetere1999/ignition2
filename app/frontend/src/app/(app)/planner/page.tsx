/**
 * Planner Page
 * Calendar for time-targeted events (meetings, appointments, workouts)
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { PlannerClient } from "./PlannerClient";

export const metadata: Metadata = {
  title: "Planner",
  description: "Your calendar for meetings, appointments, and scheduled events.",
};

export default async function PlannerPage() {
  return <PlannerClient initialEvents={[]} />;
}


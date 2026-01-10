/**
 * Stats Page
 * Read-only statistics
 *
 * No goals. No targets. No charts that scream at you.
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { StatsClient } from "./StatsClient";

export const metadata: Metadata = {
  title: "Stats - Ignition",
  description: "Your activity statistics. Read-only, no pressure.",
};

export default async function StatsPage() {
  return <StatsClient />;
}


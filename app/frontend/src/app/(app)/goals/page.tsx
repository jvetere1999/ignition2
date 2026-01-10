/**
 * Goals Page
 * Long-term goals and milestones
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { GoalsClient } from "./GoalsClient";

export const metadata: Metadata = {
  title: "Goals",
  description: "Set and track your long-term goals.",
};

export default async function GoalsPage() {
  return <GoalsClient />;
}


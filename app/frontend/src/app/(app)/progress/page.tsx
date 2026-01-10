/**
 * Progress Page
 * Stats and analytics dashboard with Persona 5 style skill wheel
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { ProgressClient } from "./ProgressClient";

export const metadata: Metadata = {
  title: "Progress",
  description: "Track your productivity progress and achievements.",
};

export default async function ProgressPage() {
  return <ProgressClient />;
}

/**
 * Ideas Page
 * Quick capture for music ideas
 *
 * ADHD-friendly design:
 * - One dominant action (capture idea)
 * - Minimal choices
 * - Quick entry, no friction
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { IdeasClient } from "./IdeasClient";

export const metadata: Metadata = {
  title: "Ideas - Ignition",
  description: "Capture your music ideas quickly.",
};

export default async function IdeasPage() {
  return <IdeasClient />;
}


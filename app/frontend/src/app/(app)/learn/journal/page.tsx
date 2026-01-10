/**
 * Patch Journal Page
 * Log and track synthesis experiments
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { JournalClient } from "./JournalClient";

export const metadata: Metadata = {
  title: "Patch Journal",
  description: "Log and track your synthesis experiments and learnings.",
};

export default async function JournalPage() {
  return <JournalClient />;
}


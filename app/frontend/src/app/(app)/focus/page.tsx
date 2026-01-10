/**
 * Focus Page
 * Focus timer and session management
 * 
 * Auth is handled by middleware - no server-side check needed
 */

import type { Metadata } from "next";
import { FocusClient } from "./FocusClient";

export const metadata: Metadata = {
  title: "Focus",
  description: "Focus timer for deep work sessions.",
};

export default async function FocusPage() {
  return <FocusClient />;
}


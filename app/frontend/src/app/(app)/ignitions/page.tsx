/**
 * Ignitions Page
 *
 * A curated list of ways to begin.
 * Not tasks. Not plans. Just ways to start.
 *
 * This is used as a resolver fallback before Focus.
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { IgnitionsClient } from "./IgnitionsClient";

export const metadata: Metadata = {
  title: "Ignitions - Ignition",
  description: "Ways to begin. Pick one.",
};

export default async function IgnitionsPage() {
  return <IgnitionsClient />;
}


/**
 * Wins Page
 * Auto-logged proof that you started
 *
 * No streaks. No comparisons. Just proof that you started.
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { WinsClient } from "./WinsClient";

export const metadata: Metadata = {
  title: "Wins - Ignition",
  description: "Your wins. Proof that you started.",
};

export default async function WinsPage() {
  return <WinsClient />;
}


/**
 * Infobase Page
 * Knowledge base and notes
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { InfobaseClient } from "./InfobaseClient";

export const metadata: Metadata = {
  title: "Infobase",
  description: "Your personal knowledge base for music production.",
};

export default async function InfobasePage() {
  return <InfobaseClient />;
}


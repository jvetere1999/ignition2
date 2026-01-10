/**
 * Market Page
 * Spend coins on personal rewards
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { MarketClient } from "./MarketClient";

export const metadata: Metadata = {
  title: "Market",
  description: "Spend your coins on rewards.",
};

export default async function MarketPage() {
  return <MarketClient />;
}


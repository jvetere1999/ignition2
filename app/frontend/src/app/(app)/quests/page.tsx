/**
 * Quests Page
 * Daily and weekly quests for XP and coins
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { QuestsClient } from "./QuestsClient";

export const metadata: Metadata = {
  title: "Quests",
  description: "Complete quests to earn XP and coins.",
};

export default async function QuestsPage() {
  return <QuestsClient />;
}


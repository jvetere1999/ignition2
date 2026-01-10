/**
 * Mobile Do Page
 *
 * Execution surfaces only - no planning, just action.
 * Shows Focus, active plan item, and quests.
 *
 * Architecture:
 * - Frontend performs 0% data logic
 * - All data flows through Rust backend at api.ecent.online
 * - Auth handled by middleware
 */

import { MobileDoWrapper } from "@/components/mobile/screens/MobileDoWrapper";

export default async function MobileDoPage() {
  return <MobileDoWrapper />;
}

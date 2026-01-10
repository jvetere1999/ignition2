/**
 * Mobile Home Page (Today)
 * Entry point for mobile PWA
 *
 * This is a thin server component that renders MobileTodayClient.
 * All data fetching happens client-side via API calls to the backend.
 *
 * Architecture:
 * - Frontend performs 0% data logic
 * - All data flows through Rust backend at api.ecent.online
 * - Auth handled by middleware
 */

import { MobileTodayWrapper } from "@/components/mobile/screens/MobileTodayWrapper";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function MobileHomePage() {
  const greeting = getGreeting();

  return (
    <MobileTodayWrapper
      greeting={greeting}
    />
  );
}

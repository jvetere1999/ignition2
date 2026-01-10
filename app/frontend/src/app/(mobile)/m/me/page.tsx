/**
 * Mobile Me Page
 *
 * User/state/admin controls.
 * Settings, account, export/delete, privacy/terms.
 * 
 * Auth handled by middleware
 * Admin check and user data fetched client-side via useAuth()
 */

import { MobileMeClient } from "@/components/mobile/screens/MobileMeClient";

export default async function MobileMePage() {
  // User data and admin status fetched client-side via useAuth()
  return <MobileMeClient />;
}


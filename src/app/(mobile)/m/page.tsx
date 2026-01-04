/**
 * Mobile Home Page
 * Entry point for mobile PWA
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MobileHome } from "@/components/mobile/screens/MobileHome";

export default async function MobileHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/m/auth/signin");
  }

  return <MobileHome user={session.user} />;
}


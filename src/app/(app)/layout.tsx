/**
 * App Layout with Shell
 * Wraps all authenticated routes with the AppShell
 */

import { AppShell } from "@/components/shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}


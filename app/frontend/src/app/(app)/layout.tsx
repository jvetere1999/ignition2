/**
 * App Layout with Shell
 * Wraps all authenticated routes with the AppShell and SyncStateProvider.
 *
 * SYNC STATE:
 * The SyncStateProvider enables 30-second polling for UI optimization data
 * (badges, progress, focus status, plan status). This data is memory-only
 * and NOT persisted to localStorage.
 */

import { AppShell } from "@/components/shell";
import { OnboardingProvider } from "@/components/onboarding";
import { AdminButton } from "@/components/admin/AdminButton";
import { SyncStateProvider } from "@/lib/sync/SyncStateContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SyncStateProvider>
      <AppShell>
        {children}
        <OnboardingProvider />
        <AdminButton />
      </AppShell>
    </SyncStateProvider>
  );
}


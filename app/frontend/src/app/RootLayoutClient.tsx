'use client';

import { AuthProvider } from "@/lib/auth";
import { VaultLockProvider } from "@/lib/auth/VaultLockContext";
import { VaultRecoveryProvider } from "@/contexts/VaultRecoveryContext";
import { ThemeProvider } from "@/lib/theme";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { VaultLockBanner } from "@/components/shell/VaultLockBanner";
import { VaultUnlockModal } from "@/components/shell/VaultUnlockModal";
import { ErrorNotifications } from "@/components/ui/ErrorNotifications";
import { ErrorNotificationInitializer } from "@/components/ui/ErrorNotificationInitializer";
import { OfflineStatusBanner } from "@/components/ui/OfflineStatusBanner";
import { ZenBrowserInitializer } from "@/components/browser/ZenBrowserInitializer";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import dynamic from "next/dynamic";

const OfflineQueueWorker = dynamic(
  () => import("@/components/OfflineQueueWorker").then((mod) => mod.OfflineQueueWorker),
  { ssr: false }
);

const ServiceWorkerRegistrar = dynamic(
  () => import("@/components/ServiceWorkerRegistrar").then((mod) => mod.ServiceWorkerRegistrar),
  { ssr: false }
);

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <VaultLockProvider>
        <VaultRecoveryProvider>
          <ThemeProvider>
          <ZenBrowserInitializer />
          <OnboardingGate>
            <OfflineStatusBanner />
            <VaultLockBanner />
            <VaultUnlockModal />
            <div id="app-root">{children}</div>
            <SiteFooter />
            <ErrorNotifications />
            <ErrorNotificationInitializer />
            <ServiceWorkerRegistrar />
            <OfflineQueueWorker />
          </OnboardingGate>
        </ThemeProvider>
        </VaultRecoveryProvider>
      </VaultLockProvider>
    </AuthProvider>
  );
}

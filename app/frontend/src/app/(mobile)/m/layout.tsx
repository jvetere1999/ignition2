/**
 * Mobile Layout
 * Root layout for /m/* routes with PWA meta tags and mobile-specific styling
 * Completely isolated from desktop - does not import or modify desktop CSS
 *
 * SYNC STATE:
 * SyncStateProvider enables 30-second polling for UI optimization data.
 */

import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth";
import { MobileShell } from "@/components/mobile/MobileShell";
import { SyncStateProvider } from "@/lib/sync/SyncStateContext";
import "@/styles/mobile.css";

export const metadata: Metadata = {
  title: {
    default: "Ignition",
    template: "%s | Ignition",
  },
  description: "A starter engine for focus, movement, and learning",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ignition",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <html lang="en" data-surface="mobile">
      <head>
        {/* Apple-specific PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ignition" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />

        {/* Splash screens for iOS */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
      </head>
      <body>
        <AuthProvider>
          <SyncStateProvider>
            <MobileShell>{children}</MobileShell>
          </SyncStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


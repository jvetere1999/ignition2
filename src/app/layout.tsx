import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SessionProvider } from "@/lib/auth/SessionProvider";
import { ThemeProvider } from "@/lib/theme";
import { themeScript } from "@/lib/theme/script";
import { SiteFooter } from "@/components/shell/SiteFooter";
import "@/styles/tokens.css";
import "./globals.css";

// AdSense publisher ID - set to empty to disable ads
const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "";

export const metadata: Metadata = {
  title: {
    default: "Passion OS - Productivity & Music Production App",
    template: "%s | Passion OS",
  },
  description:
    "Free productivity app for music producers. Pomodoro focus timer, workout tracker, habit streaks, DAW shortcuts for Ableton, Logic Pro, FL Studio. Level up with XP.",
  keywords: [
    "productivity app",
    "music production app",
    "DAW shortcuts",
    "Ableton Live shortcuts",
    "Logic Pro shortcuts",
    "FL Studio shortcuts",
    "Pro Tools shortcuts",
    "pomodoro timer",
    "focus timer app",
    "habit tracker",
    "workout tracker",
    "fitness app",
    "book tracker",
    "reading log",
    "quest tracker",
    "gamified productivity",
    "skill development",
    "music producer tools",
    "daily planner app",
    "goal tracking app",
    "XP leveling system",
    "streak tracker",
    "personal development",
    "free productivity tool",
  ],
  authors: [{ name: "Passion OS Team" }],
  creator: "Passion OS",
  publisher: "Passion OS",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://passion-os.ecent.online"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Passion OS",
    title: "Passion OS - Productivity & Music Production App",
    description:
      "Free app for music producers. Focus timer, habit tracker, DAW shortcuts, workout log. Earn XP and level up your skills.",
    url: "/",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Passion OS - Gamified Productivity for Creators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Passion OS - Productivity & Music Production App",
    description:
      "Free app for music producers. Focus timer, habit tracker, DAW shortcuts, workout log. Earn XP and level up.",
    images: ["/og-image.svg"],
  },
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  category: "productivity",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {/* Google AdSense - loaded async for performance */}
        {ADSENSE_PUBLISHER_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${ADSENSE_PUBLISHER_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
        <SessionProvider>
          <ThemeProvider>
            <div id="app-root">{children}</div>
            <SiteFooter />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}


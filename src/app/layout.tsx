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
    default: "Passion OS",
    template: "%s | Passion OS",
  },
  description:
    "Your personal productivity and music production companion. Plan, focus, and create.",
  keywords: [
    "productivity",
    "music production",
    "DAW",
    "shortcuts",
    "planner",
    "focus timer",
  ],
  authors: [{ name: "Passion OS Team" }],
  creator: "Passion OS",
  publisher: "Passion OS",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Passion OS",
    title: "Passion OS",
    description:
      "Your personal productivity and music production companion. Plan, focus, and create.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Passion OS",
    description:
      "Your personal productivity and music production companion. Plan, focus, and create.",
  },
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


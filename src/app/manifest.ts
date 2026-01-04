/**
 * Mobile App Manifest
 * PWA configuration for iOS/iPadOS "Add to Home Screen"
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Passion OS",
    short_name: "Passion",
    description: "Your personal productivity and music production companion",
    start_url: "/m",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#8b5cf6",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["productivity", "music", "education"],
  };
}


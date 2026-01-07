import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard Next.js output
  output: "standalone",

  // Disable image optimization for now
  images: {
    unoptimized: true,
  },

  // Strict mode for React
  reactStrictMode: true,

  // TypeScript strict checks during build
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint during build
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    // Server Actions are stable in Next 15
  },
};

export default nextConfig;


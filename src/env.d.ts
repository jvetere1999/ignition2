/**
 * Cloudflare Workers environment bindings
 * These are available in server components and API routes
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Auth.js
      AUTH_SECRET: string;
      AUTH_URL?: string;

      // Google OAuth
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;

      // Microsoft Entra ID OAuth
      AZURE_AD_CLIENT_ID: string;
      AZURE_AD_CLIENT_SECRET: string;
      AZURE_AD_TENANT_ID: string;

      // App config
      NODE_ENV: "development" | "preview" | "production";
      NEXT_PUBLIC_APP_URL: string;
    }
  }
}

/**
 * Cloudflare bindings available via getRequestContext()
 */
export interface CloudflareEnv {
  DB: D1Database;
  BLOBS: R2Bucket;
  CACHE?: KVNamespace;
  ASSETS: Fetcher;
}

export {};


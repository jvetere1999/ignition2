/**
 * Auth.js providers configuration
 * Google OAuth and Microsoft Entra ID
 */

import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";

/**
 * Configure OAuth providers
 * Credentials are loaded from environment variables
 */
export function getProviders(): Provider[] {
  const providers: Provider[] = [];

  // Google OAuth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Request minimal scopes
        authorization: {
          params: {
            scope: "openid email profile",
          },
        },
      })
    );
  }

  // Microsoft Entra ID (Azure AD)
  if (
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  ) {
    providers.push(
      MicrosoftEntraID({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        // Tenant ID is configured via issuer
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
        // Request minimal scopes
        authorization: {
          params: {
            scope: "openid email profile User.Read",
          },
        },
      })
    );
  }

  return providers;
}

/**
 * Check if any providers are configured
 */
export function hasProviders(): boolean {
  return getProviders().length > 0;
}

/**
 * Get list of configured provider names for UI display
 */
export function getProviderNames(): string[] {
  const names: string[] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    names.push("Google");
  }

  if (
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  ) {
    names.push("Microsoft");
  }

  return names;
}


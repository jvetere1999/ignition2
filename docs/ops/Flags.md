# Wrangler Feature Flags Design and Implementation

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview](#1-overview)
2. [Flag List](#2-flag-list)
3. [Implementation](#3-implementation)
4. [Wrangler Configuration](#4-wrangler-configuration)
5. [Usage Examples](#5-usage-examples)
6. [Build-Time vs Runtime](#6-build-time-vs-runtime)
7. [QA Steps](#7-qa-steps)

---

## 1. Overview

### Problem

The current flag system uses `process.env` which may not be available consistently in the Cloudflare Workers runtime, and doesn't have a clear single source of truth for flag values across local/preview/production environments.

### Solution

Implement a feature flag system that:
1. Uses Wrangler `[vars]` as the single source of truth
2. Reads flags at runtime from Cloudflare environment bindings
3. Provides safe defaults (all OFF) when flags are missing
4. Works consistently across local dev, preview, and production

---

## 2. Flag List

| Flag Name | Purpose | Default |
|-----------|---------|---------|
| `FLAG_TODAY_FEATURES_MASTER` | Master kill switch for all Today features | OFF |
| `FLAG_TODAY_DECISION_SUPPRESSION_V1` | State-driven visibility rules | OFF |
| `FLAG_TODAY_NEXT_ACTION_RESOLVER_V1` | Pure resolver for StarterBlock CTA | OFF |
| `FLAG_TODAY_MOMENTUM_FEEDBACK_V1` | "Good start." banner after completion | OFF |
| `FLAG_TODAY_SOFT_LANDING_V1` | Reduced Today after action complete/abandon | OFF |
| `FLAG_TODAY_REDUCED_MODE_V1` | Gap-based reduced mode (48h+) | OFF |

### Flag Hierarchy

```
FLAG_TODAY_FEATURES_MASTER (master switch)
  |
  +-- FLAG_TODAY_DECISION_SUPPRESSION_V1
  +-- FLAG_TODAY_NEXT_ACTION_RESOLVER_V1
  +-- FLAG_TODAY_MOMENTUM_FEEDBACK_V1
  +-- FLAG_TODAY_SOFT_LANDING_V1
  +-- FLAG_TODAY_REDUCED_MODE_V1
```

If master is OFF, all child features are OFF regardless of their values.

---

## 3. Implementation

### 3.1 Updated Flag Module

**File:** `src/lib/flags.ts`

```typescript
/**
 * Feature Flags
 * Controlled via Wrangler environment variables (single source of truth)
 *
 * All flags default to OFF for safety.
 * Set via wrangler.toml [vars] or environment-specific overrides.
 *
 * Kill Switch Behavior:
 * - Any flag can be disabled instantly by setting to "false" or removing
 * - When OFF, feature reverts to pre-implementation behavior
 * - No code revert required
 */

/**
 * Feature flag names
 */
export const FLAG_NAMES = {
  TODAY_FEATURES_MASTER: "FLAG_TODAY_FEATURES_MASTER",
  TODAY_DECISION_SUPPRESSION_V1: "FLAG_TODAY_DECISION_SUPPRESSION_V1",
  TODAY_NEXT_ACTION_RESOLVER_V1: "FLAG_TODAY_NEXT_ACTION_RESOLVER_V1",
  TODAY_MOMENTUM_FEEDBACK_V1: "FLAG_TODAY_MOMENTUM_FEEDBACK_V1",
  TODAY_SOFT_LANDING_V1: "FLAG_TODAY_SOFT_LANDING_V1",
  TODAY_REDUCED_MODE_V1: "FLAG_TODAY_REDUCED_MODE_V1",
} as const;

export type FlagName = keyof typeof FLAG_NAMES;

/**
 * Truthy values for flag parsing
 * Accepts: "1", "true", "on" (case-insensitive)
 */
const TRUTHY_VALUES = new Set(["1", "true", "on"]);

/**
 * Parse a flag value to boolean
 * Returns true only for explicit truthy values
 * Safety net: undefined/null/invalid -> false
 */
function parseFlagValue(value: string | undefined | null): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  return TRUTHY_VALUES.has(value.toLowerCase().trim());
}

/**
 * Get the current value of a feature flag
 *
 * Reads from environment in this order:
 * 1. process.env (Wrangler runtime injects vars here)
 * 2. Default to false (safety net)
 *
 * @param flagName - The flag constant key (e.g., "TODAY_FEATURES_MASTER")
 * @returns boolean - true if flag is enabled, false otherwise
 */
export function getFlag(flagName: FlagName): boolean {
  const envKey = FLAG_NAMES[flagName];

  // Safety net: if process.env is not available, return false
  if (typeof process === "undefined" || !process.env) {
    return false;
  }

  const value = process.env[envKey];
  return parseFlagValue(value);
}

/**
 * Check if master kill switch is engaged
 * When master is OFF, all Today features are disabled
 */
function isMasterEnabled(): boolean {
  return getFlag("TODAY_FEATURES_MASTER");
}

/**
 * Check if a Today feature is enabled
 * Respects master kill switch
 */
function isTodayFeatureEnabled(flagName: FlagName): boolean {
  // Master kill switch overrides all
  if (!isMasterEnabled()) {
    return false;
  }
  return getFlag(flagName);
}

// ============================================
// Individual Feature Flag Getters
// ============================================

/**
 * Check if Today Decision Suppression is enabled
 */
export function isTodayDecisionSuppressionEnabled(): boolean {
  return isTodayFeatureEnabled("TODAY_DECISION_SUPPRESSION_V1");
}

/**
 * Check if Today Next Action Resolver is enabled
 */
export function isTodayNextActionResolverEnabled(): boolean {
  return isTodayFeatureEnabled("TODAY_NEXT_ACTION_RESOLVER_V1");
}

/**
 * Check if Today Momentum Feedback is enabled
 */
export function isTodayMomentumFeedbackEnabled(): boolean {
  return isTodayFeatureEnabled("TODAY_MOMENTUM_FEEDBACK_V1");
}

/**
 * Check if Today Soft Landing is enabled
 */
export function isTodaySoftLandingEnabled(): boolean {
  return isTodayFeatureEnabled("TODAY_SOFT_LANDING_V1");
}

/**
 * Check if Today Reduced Mode is enabled
 */
export function isTodayReducedModeEnabled(): boolean {
  return isTodayFeatureEnabled("TODAY_REDUCED_MODE_V1");
}

// ============================================
// Flag Status for Debugging
// ============================================

/**
 * Get all flag values (for debugging/admin)
 */
export function getAllFlagValues(): Record<FlagName, boolean> {
  const flags = Object.keys(FLAG_NAMES) as FlagName[];
  return flags.reduce((acc, flag) => {
    acc[flag] = getFlag(flag);
    return acc;
  }, {} as Record<FlagName, boolean>);
}

/**
 * Get active Today feature flags (for debugging)
 */
export function getActiveTodayFeatures(): string[] {
  const active: string[] = [];

  if (isTodayDecisionSuppressionEnabled()) active.push("decision_suppression");
  if (isTodayNextActionResolverEnabled()) active.push("next_action_resolver");
  if (isTodayMomentumFeedbackEnabled()) active.push("momentum_feedback");
  if (isTodaySoftLandingEnabled()) active.push("soft_landing");
  if (isTodayReducedModeEnabled()) active.push("reduced_mode");

  return active;
}
```

### 3.2 TypeScript Declarations

**Update:** `src/env.d.ts`

Add the flag environment variables to the ProcessEnv interface:

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // ... existing declarations ...

      // Feature Flags (optional - default to OFF when unset)
      FLAG_TODAY_FEATURES_MASTER?: string;
      FLAG_TODAY_DECISION_SUPPRESSION_V1?: string;
      FLAG_TODAY_NEXT_ACTION_RESOLVER_V1?: string;
      FLAG_TODAY_MOMENTUM_FEEDBACK_V1?: string;
      FLAG_TODAY_SOFT_LANDING_V1?: string;
      FLAG_TODAY_REDUCED_MODE_V1?: string;
    }
  }
}
```

---

## 4. Wrangler Configuration

### 4.1 Production (`wrangler.toml` root)

```toml
# Environment variables (non-sensitive)
[vars]
NODE_ENV = "production"
NEXT_PUBLIC_APP_URL = "https://passion-os.ecent.online"
AUTH_URL = "https://passion-os.ecent.online"
AUTH_TRUST_HOST = "true"
ADMIN_EMAILS = "jvetere1999@gmail.com"
NEXT_PUBLIC_ADMIN_EMAILS = "jvetere1999@gmail.com"

# Feature Flags - Production (conservative, all OFF by default)
# Set to "true" to enable, remove or set "false" to disable
# FLAG_TODAY_FEATURES_MASTER = "true"
# FLAG_TODAY_DECISION_SUPPRESSION_V1 = "true"
# FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "true"
# FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "true"
# FLAG_TODAY_SOFT_LANDING_V1 = "true"
# FLAG_TODAY_REDUCED_MODE_V1 = "true"
```

### 4.2 Preview Environment (`[env.preview]`)

```toml
# Preview environment
[env.preview]
name = "passion-os-next-preview"

[env.preview.vars]
NODE_ENV = "preview"
NEXT_PUBLIC_APP_URL = "https://passion-os-next-preview.jvetere1999.workers.dev"
AUTH_URL = "https://passion-os-next-preview.jvetere1999.workers.dev"
AUTH_TRUST_HOST = "true"
ADMIN_EMAILS = "jvetere1999@gmail.com"
NEXT_PUBLIC_ADMIN_EMAILS = "jvetere1999@gmail.com"

# Feature Flags - Preview (enable for testing)
FLAG_TODAY_FEATURES_MASTER = "true"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "true"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "true"
FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "true"
FLAG_TODAY_SOFT_LANDING_V1 = "true"
FLAG_TODAY_REDUCED_MODE_V1 = "true"
```

### 4.3 Local Development (`.dev.vars`)

For local development with `wrangler dev` or `npm run dev`, create a `.dev.vars` file:

**File:** `.dev.vars` (gitignored)

```ini
# Feature Flags - Local Development
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=true
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=true
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=true
FLAG_TODAY_SOFT_LANDING_V1=true
FLAG_TODAY_REDUCED_MODE_V1=true
```

**Or via `.env.local` for Next.js dev server:**

```ini
# Feature Flags - Local Development
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=true
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=true
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=true
FLAG_TODAY_SOFT_LANDING_V1=true
FLAG_TODAY_REDUCED_MODE_V1=true
```

### 4.4 Complete wrangler.toml Example

```toml
# Passion OS Next - Cloudflare Workers Configuration

name = "passion-os-next"
compatibility_date = "2025-01-02"
compatibility_flags = ["nodejs_compat"]

main = ".open-next/worker.js"

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "passion_os"
database_id = "40c2b3a5-7fa1-492f-bce9-3c30959b56a8"

# ============================================
# Production Environment
# ============================================
[vars]
NODE_ENV = "production"
NEXT_PUBLIC_APP_URL = "https://passion-os.ecent.online"
AUTH_URL = "https://passion-os.ecent.online"
AUTH_TRUST_HOST = "true"
ADMIN_EMAILS = "jvetere1999@gmail.com"
NEXT_PUBLIC_ADMIN_EMAILS = "jvetere1999@gmail.com"

# Feature Flags - Production
# Uncomment to enable in production
# FLAG_TODAY_FEATURES_MASTER = "true"
# FLAG_TODAY_DECISION_SUPPRESSION_V1 = "true"
# FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "true"
# FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "true"
# FLAG_TODAY_SOFT_LANDING_V1 = "true"
# FLAG_TODAY_REDUCED_MODE_V1 = "true"

# ============================================
# Preview Environment
# ============================================
[env.preview]
name = "passion-os-next-preview"

[env.preview.vars]
NODE_ENV = "preview"
NEXT_PUBLIC_APP_URL = "https://passion-os-next-preview.jvetere1999.workers.dev"
AUTH_URL = "https://passion-os-next-preview.jvetere1999.workers.dev"
AUTH_TRUST_HOST = "true"
ADMIN_EMAILS = "jvetere1999@gmail.com"
NEXT_PUBLIC_ADMIN_EMAILS = "jvetere1999@gmail.com"

# Feature Flags - Preview (enabled for testing)
FLAG_TODAY_FEATURES_MASTER = "true"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "true"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "true"
FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "true"
FLAG_TODAY_SOFT_LANDING_V1 = "true"
FLAG_TODAY_REDUCED_MODE_V1 = "true"

# ============================================
# SECRETS - Set via: wrangler secret put <NAME>
# ============================================
# wrangler secret put AUTH_SECRET
# wrangler secret put GOOGLE_CLIENT_ID
# etc.
```

---

## 5. Usage Examples

### 5.1 In Server Components (Today Page)

```typescript
// src/app/(app)/today/page.tsx
import { 
  isTodayDecisionSuppressionEnabled,
  isTodayReducedModeEnabled 
} from "@/lib/flags";

export default async function TodayPage() {
  // Feature flag checks at request time
  const useDecisionSuppression = isTodayDecisionSuppressionEnabled();
  const useReducedMode = isTodayReducedModeEnabled();

  // Apply based on flags
  const visibility = useDecisionSuppression
    ? getTodayVisibility(userState)
    : getDefaultVisibility();

  // ...
}
```

### 5.2 In Client Components

```typescript
// src/app/(app)/today/MomentumBanner.tsx
"use client";

import { isTodayMomentumFeedbackEnabled } from "@/lib/flags";

export function MomentumBanner() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check flag on client mount
    // Note: This reads from process.env which is injected at build time
    // For true runtime flags, pass from server component as prop
    setIsEnabled(isTodayMomentumFeedbackEnabled());
  }, []);

  if (!isEnabled) return null;
  // ...
}
```

### 5.3 Passing Flags from Server to Client

For flags that need to be evaluated at runtime on the server and passed to client:

```typescript
// src/app/(app)/today/page.tsx (Server)
import { isTodaySoftLandingEnabled } from "@/lib/flags";

export default async function TodayPage() {
  const softLandingEnabled = isTodaySoftLandingEnabled();

  return (
    <TodayGridClient
      softLandingEnabled={softLandingEnabled}
      // ... other props
    />
  );
}

// src/app/(app)/today/TodayGridClient.tsx (Client)
interface TodayGridClientProps {
  softLandingEnabled: boolean;
  // ...
}

export function TodayGridClient({ softLandingEnabled }: TodayGridClientProps) {
  // Use the server-evaluated flag value
  if (softLandingEnabled) {
    // Apply soft landing logic
  }
}
```

### 5.4 In API Routes

```typescript
// src/app/api/example/route.ts
import { isTodayDecisionSuppressionEnabled } from "@/lib/flags";

export async function GET() {
  const featureEnabled = isTodayDecisionSuppressionEnabled();

  return Response.json({
    featureEnabled,
    // ...
  });
}
```

### 5.5 Debug Endpoint (Admin Only)

```typescript
// src/app/api/admin/flags/route.ts
import { getAllFlagValues, getActiveTodayFeatures } from "@/lib/flags";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const session = await auth();

  if (!isAdminEmail(session?.user?.email)) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  return Response.json({
    flags: getAllFlagValues(),
    activeTodayFeatures: getActiveTodayFeatures(),
    environment: process.env.NODE_ENV,
  });
}
```

---

## 6. Build-Time vs Runtime

### 6.1 How Wrangler Injects Vars

Wrangler injects `[vars]` into `process.env` at **runtime**, not build time. This means:

1. **Build time (`next build`)**: Flags from `.env.local` or build environment
2. **Runtime (Worker)**: Flags from `wrangler.toml [vars]` or `.dev.vars`

### 6.2 Avoiding Build-Time Bundling Issues

**Problem:** If you use `process.env.FLAG_X` directly in client components, Next.js may try to inline it at build time.

**Solution:** 
1. For client components, pass flag values as props from server components
2. For server components/API routes, read directly from `process.env`

```typescript
// AVOID in client components:
const enabled = process.env.FLAG_TODAY_MOMENTUM_FEEDBACK_V1 === "true"; // Bundled at build time

// PREFER:
// Server component evaluates, passes to client as prop
<ClientComponent featureEnabled={isTodayMomentumFeedbackEnabled()} />
```

### 6.3 Server-Only Flag Reads

For flags that should only be read server-side:

```typescript
// src/lib/flags.ts (add to module)

/**
 * Server-only flag check
 * Throws if accidentally imported in client bundle
 */
export function getServerFlag(flagName: FlagName): boolean {
  if (typeof window !== "undefined") {
    throw new Error(`getServerFlag called on client for ${flagName}`);
  }
  return getFlag(flagName);
}
```

---

## 7. QA Steps

### 7.1 Local Development

```bash
# 1. Create .env.local with flags
echo 'FLAG_TODAY_FEATURES_MASTER=true' >> .env.local
echo 'FLAG_TODAY_DECISION_SUPPRESSION_V1=true' >> .env.local

# 2. Start dev server
npm run dev > .tmp/dev.log 2>&1 &

# 3. Navigate to /today
# 4. Verify decision suppression is active

# 5. Change flag in .env.local to false
# 6. Restart dev server
# 7. Verify decision suppression is OFF
```

### 7.2 Wrangler Local Dev

```bash
# 1. Create .dev.vars with flags
echo 'FLAG_TODAY_FEATURES_MASTER=true' > .dev.vars

# 2. Run with wrangler
wrangler dev > .tmp/wrangler-dev.log 2>&1 &

# 3. Verify flags are active
```

### 7.3 Preview Deployment

```bash
# 1. Deploy to preview (flags enabled in [env.preview.vars])
npm run deploy:preview > .tmp/deploy-preview.log 2>&1

# 2. Navigate to preview URL
# 3. Verify all Today features are enabled
# 4. Test each feature

# 5. Modify preview flags in wrangler.toml
# 6. Redeploy
# 7. Verify flag changes
```

### 7.4 Production Deployment

```bash
# 1. Ensure all flags are commented out (OFF) in [vars]
# 2. Deploy to production
npm run deploy > .tmp/deploy-prod.log 2>&1

# 3. Navigate to production URL
# 4. Verify baseline behavior (all features OFF)

# 5. Enable master flag in wrangler.toml:
#    FLAG_TODAY_FEATURES_MASTER = "true"
# 6. Redeploy
# 7. Verify features still OFF (individual flags still off)

# 8. Enable individual flag
# 9. Redeploy
# 10. Verify specific feature is ON
```

### 7.5 Safety Net Verification

```bash
# Test 1: Missing flags
# Remove all FLAG_* vars from wrangler.toml
# Deploy and verify all features are OFF (default behavior)

# Test 2: Invalid flag values
# Set FLAG_TODAY_FEATURES_MASTER = "invalid"
# Verify it's treated as OFF

# Test 3: Master kill switch
# Set FLAG_TODAY_FEATURES_MASTER = "false"
# Set individual flags to "true"
# Verify all features are OFF (master overrides)
```

### 7.6 Flag Value Parsing

| Input | Expected Result |
|-------|-----------------|
| `"true"` | true |
| `"TRUE"` | true |
| `"True"` | true |
| `"1"` | true |
| `"on"` | true |
| `"ON"` | true |
| `"false"` | false |
| `"0"` | false |
| `"off"` | false |
| `""` | false |
| `undefined` | false |
| `"invalid"` | false |

---

## Appendix A: Quick Reference

### Enable All Features

```toml
# In wrangler.toml [vars] or [env.preview.vars]
FLAG_TODAY_FEATURES_MASTER = "true"
FLAG_TODAY_DECISION_SUPPRESSION_V1 = "true"
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1 = "true"
FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "true"
FLAG_TODAY_SOFT_LANDING_V1 = "true"
FLAG_TODAY_REDUCED_MODE_V1 = "true"
```

### Disable All Features (Kill Switch)

```toml
# Comment out or remove all FLAG_* vars
# OR explicitly disable master:
FLAG_TODAY_FEATURES_MASTER = "false"
```

### Disable Single Feature

```toml
# Remove the line or set to false
FLAG_TODAY_MOMENTUM_FEEDBACK_V1 = "false"
```

---

## Appendix B: Deployment Checklist

```
[ ] All flags commented out in production [vars] (conservative default)
[ ] All flags enabled in preview [env.preview.vars] for testing
[ ] .dev.vars or .env.local created for local development
[ ] env.d.ts updated with flag type declarations
[ ] Deployed to preview and verified features work
[ ] Tested master kill switch
[ ] Tested individual flag toggles
[ ] Documented in SYNOPSIS.md or README
```

---

**End of Document**


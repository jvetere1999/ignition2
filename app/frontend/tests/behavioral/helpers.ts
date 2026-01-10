/**
 * Behavioral Test Helpers
 *
 * Utilities for setting up test scenarios and mocking state
 * for the Starter Engine behavioral tests.
 */

import { type Page, type BrowserContext } from "@playwright/test";

// ============================================
// Session Storage Keys
// ============================================
export const SESSION_KEYS = {
  MOMENTUM_STATE: "today_momentum_state",
  SOFT_LANDING_ACTIVE: "today_soft_landing_active",
  SOFT_LANDING_SOURCE: "today_soft_landing_source",
  REDUCED_MODE_DISMISSED: "today_reduced_mode_dismissed",
  MOMENTUM_DISMISSED: "today_momentum_dismissed",
} as const;

export const LOCAL_STORAGE_KEYS = {
  USER_FIRST_DAY: "user_first_day",
  LAST_ACTIVITY: "last_activity_timestamp",
} as const;

// ============================================
// User State Types
// ============================================
export type MomentumState = "pending" | "shown" | "dismissed";
export type SoftLandingSource = "focus" | "quest" | "learn" | "workout";

export interface BehavioralTestState {
  momentum?: MomentumState;
  softLanding?: {
    active: boolean;
    source?: SoftLandingSource;
  };
  reducedModeDismissed?: boolean;
  firstDay?: boolean;
  lastActivityHoursAgo?: number;
}

// ============================================
// State Setup Helpers
// ============================================

/**
 * Set up behavioral state before page navigation
 */
export async function setupBehavioralState(
  page: Page,
  state: BehavioralTestState
): Promise<void> {
  await page.addInitScript((stateStr) => {
    const state = JSON.parse(stateStr) as BehavioralTestState;
    
    // Clear previous state
    sessionStorage.clear();
    
    // Set momentum state
    if (state.momentum) {
      sessionStorage.setItem("today_momentum_state", state.momentum);
    }
    
    // Set soft landing state
    if (state.softLanding?.active) {
      sessionStorage.setItem("today_soft_landing_active", "true");
      if (state.softLanding.source) {
        sessionStorage.setItem("today_soft_landing_source", state.softLanding.source);
      }
    }
    
    // Set reduced mode dismissed
    if (state.reducedModeDismissed) {
      sessionStorage.setItem("today_reduced_mode_dismissed", "true");
    }
    
    // Set first day flag
    if (state.firstDay) {
      localStorage.setItem("user_first_day", "true");
    }
    
    // Set last activity timestamp
    if (state.lastActivityHoursAgo !== undefined) {
      const timestamp = Date.now() - (state.lastActivityHoursAgo * 60 * 60 * 1000);
      localStorage.setItem("last_activity_timestamp", String(timestamp));
    }
  }, JSON.stringify(state));
}

/**
 * Clear all behavioral state
 */
export async function clearBehavioralState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    sessionStorage.clear();
    localStorage.removeItem("user_first_day");
    localStorage.removeItem("last_activity_timestamp");
  });
}

// ============================================
// API Mocking Helpers
// ============================================

/**
 * Mock the daily plan API response
 */
export async function mockDailyPlanAPI(
  page: Page,
  planItems: Array<{
    id: string;
    title: string;
    type: "focus" | "quest" | "workout" | "learning" | "habit";
    completed: boolean;
    priority?: number;
    actionUrl?: string;
  }> | null
): Promise<void> {
  await page.route("**/api/daily-plan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plan: planItems ? {
          date: new Date().toISOString().split("T")[0],
          items: planItems,
        } : null,
      }),
    });
  });
}

/**
 * Mock the Today data API response
 */
export async function mockTodayDataAPI(
  page: Page,
  data: {
    userState?: {
      firstDay?: boolean;
      returningAfterGap?: boolean;
      lastActivity?: string;
    };
    dynamicUIData?: unknown;
    planSummary?: unknown;
    personalization?: unknown;
  }
): Promise<void> {
  await page.route("**/api/today", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        userState: {
          firstDay: false,
          returningAfterGap: false,
          lastActivity: new Date().toISOString(),
          ...data.userState,
        },
        dynamicUIData: data.dynamicUIData ?? null,
        planSummary: data.planSummary ?? null,
        personalization: data.personalization ?? {
          quickPicks: [],
          interests: [],
          resumeLast: null,
        },
      }),
    });
  });
}

/**
 * Delay API response for testing loading states
 */
export async function delayAPI(
  page: Page,
  pattern: string,
  delayMs: number
): Promise<void> {
  await page.route(pattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Wait for data to load and settle
 */
export async function waitForDataLoad(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  // Wait for any loading indicators to disappear
  await page.waitForSelector('[class*="loading"], [class*="spinner"]', { 
    state: "hidden",
    timeout: 5000,
  }).catch(() => {
    // No loading indicator found, continue
  });
}

/**
 * Check if redirected to auth
 */
export function isOnAuthPage(page: Page): boolean {
  return page.url().includes("/auth/signin");
}

/**
 * Get computed CSS property
 */
export async function getCSSProperty(
  page: Page,
  selector: string,
  property: string
): Promise<string> {
  return await page.locator(selector).evaluate((el, prop) => {
    return window.getComputedStyle(el).getPropertyValue(prop);
  }, property);
}

// ============================================
// User Journey Helpers
// ============================================

/**
 * Simulate completing an action and returning
 */
export async function simulateActionCompletion(
  page: Page,
  actionType: SoftLandingSource
): Promise<void> {
  // Navigate with completion parameters
  await page.goto(`/today?from=${actionType}&status=completed`);
  await waitForDataLoad(page);
}

/**
 * Simulate abandoning an action and returning
 */
export async function simulateActionAbandonment(
  page: Page,
  actionType: SoftLandingSource
): Promise<void> {
  await page.goto(`/today?from=${actionType}&status=abandoned`);
  await waitForDataLoad(page);
}

/**
 * Navigate to Today with clean state
 */
export async function goToTodayClean(page: Page): Promise<void> {
  await clearBehavioralState(page);
  await page.goto("/today");
  await waitForDataLoad(page);
}

// ============================================
// Viewport Helpers
// ============================================

export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  desktopLarge: { width: 1920, height: 1080 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

/**
 * Set viewport by name
 */
export async function setViewport(
  page: Page,
  viewport: ViewportName
): Promise<void> {
  await page.setViewportSize(VIEWPORTS[viewport]);
}

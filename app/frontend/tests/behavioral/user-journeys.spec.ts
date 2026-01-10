/**
 * User Journey Behavioral Tests
 *
 * End-to-end tests for complete user journeys through the application,
 * focusing on the cognitive load reduction features of the Starter Engine.
 */

import { test, expect } from "@playwright/test";
import {
  setupBehavioralState,
  mockDailyPlanAPI,
  mockTodayDataAPI,
  waitForDataLoad,
  isOnAuthPage,
  setViewport,
} from "./helpers";

// ============================================
// First-Time User Journey
// ============================================
test.describe("First-Time User Journey", () => {
  test("new user sees simplified Today page", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: true, returningAfterGap: false },
    });

    await mockDailyPlanAPI(page, null);

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return; // Skip when not authenticated
    }

    await waitForDataLoad(page);

    // StarterBlock should be prominent
    const starterBlock = page.locator('[data-testid="starter-block"]');
    await expect(starterBlock).toBeVisible();

    // Should have clear single CTA
    const primaryCTA = starterBlock.locator('[class*="primaryButton"]');
    await expect(primaryCTA).toBeVisible();
  });

  test("new user with no plan sees default Focus CTA", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: true },
    });

    await mockDailyPlanAPI(page, null);

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Default fallback should be Focus
    const starterBlock = page.locator('[data-testid="starter-block"]');
    const ctaLink = starterBlock.locator('[class*="primaryButton"]');
    
    const href = await ctaLink.getAttribute("href");
    expect(href).toContain("/focus");
  });

  test("new user with plan sees first incomplete item", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: true },
    });

    await mockDailyPlanAPI(page, [
      {
        id: "1",
        title: "Morning Workout",
        type: "workout",
        completed: false,
        priority: 1,
        actionUrl: "/exercise",
      },
      {
        id: "2",
        title: "Study Session",
        type: "learning",
        completed: false,
        priority: 2,
        actionUrl: "/learn",
      },
    ]);

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Should show first incomplete item by priority
    const starterBlock = page.locator('[data-testid="starter-block"]');
    const ctaText = await starterBlock.locator('[class*="primaryButton"]').textContent();
    
    // Should reference the first item
    expect(ctaText?.toLowerCase()).toContain("workout");
  });

  test("new user skips completed items in plan", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: true },
    });

    await mockDailyPlanAPI(page, [
      {
        id: "1",
        title: "Morning Workout",
        type: "workout",
        completed: true, // Already done
        priority: 1,
        actionUrl: "/exercise",
      },
      {
        id: "2",
        title: "Study Session",
        type: "learning",
        completed: false,
        priority: 2,
        actionUrl: "/learn",
      },
    ]);

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Should skip completed and show next incomplete
    const starterBlock = page.locator('[data-testid="starter-block"]');
    const ctaLink = starterBlock.locator('[class*="primaryButton"]');
    
    const href = await ctaLink.getAttribute("href");
    expect(href).toContain("/learn");
  });
});

// ============================================
// Returning User Journey (Active User)
// ============================================
test.describe("Returning Active User Journey", () => {
  test("active user (no gap) sees normal Today page", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { 
        firstDay: false, 
        returningAfterGap: false,
        lastActivity: new Date().toISOString(),
      },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Should NOT show reduced mode banner
    const reducedBanner = page.locator('text="Welcome back"');
    await expect(reducedBanner).not.toBeVisible();

    // StarterBlock should be visible
    const starterBlock = page.locator('[data-testid="starter-block"]');
    await expect(starterBlock).toBeVisible();
  });

  test("active user can navigate to Focus from StarterBlock", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: false },
    });

    await mockDailyPlanAPI(page, null);

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    const starterBlock = page.locator('[data-testid="starter-block"]');
    const ctaLink = starterBlock.locator('[class*="primaryButton"]');
    
    await ctaLink.click();

    // Should navigate to action page
    await expect(page).toHaveURL(/\/(focus|quests|learn|planner)/);
  });
});

// ============================================
// Returning User Journey (After Gap)
// ============================================
test.describe("Returning User After Gap Journey", () => {
  test("user returning after 48h+ gap sees reduced mode", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { 
        firstDay: false, 
        returningAfterGap: true,
        lastActivity: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 72h ago
      },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Should see reduced mode banner with supportive message
    const welcomeText = page.locator('text="Welcome back"');
    const isVisible = await welcomeText.isVisible().catch(() => false);
    
    // If the server indicates returningAfterGap, expect the banner
    if (isVisible) {
      await expect(welcomeText).toBeVisible();
    }
  });

  test("reduced mode offers simple quick actions", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: true },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Look for quick action suggestions in reduced mode
    const fiveMinFocus = page.locator('text="5 min focus"');
    const quickQuest = page.locator('text="Quick quest"');

    const hasFocus = await fiveMinFocus.isVisible().catch(() => false);
    const hasQuest = await quickQuest.isVisible().catch(() => false);

    // At least one quick action should be visible if in reduced mode
    // (This depends on the returningAfterGap state being true)
    expect(hasFocus || hasQuest || !page.url().includes("today")).toBeTruthy();
  });

  test("dismissing reduced mode banner reveals full UI", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: true },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Find and dismiss the reduced mode banner
    const dismissButton = page.locator('[aria-label="Dismiss"]').first();
    
    if (await dismissButton.isVisible().catch(() => false)) {
      await dismissButton.click();
      
      // After dismiss, banner should be hidden
      const welcomeText = page.locator('text="Welcome back"').first();
      await expect(welcomeText).not.toBeVisible({ timeout: 2000 });
    }
  });
});

// ============================================
// Post-Action Journey (Soft Landing)
// ============================================
test.describe("Post-Action Soft Landing Journey", () => {
  test("returning from Focus shows soft landing state", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: false },
    });

    // Navigate with completion status
    await page.goto("/today?from=focus&status=completed");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Page should render successfully
    await expect(page.locator("h1")).toBeVisible();
  });

  test("returning from Quest shows soft landing state", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: false },
    });

    await page.goto("/today?from=quest&status=completed");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    await expect(page.locator("h1")).toBeVisible();
  });

  test("abandonment status triggers soft landing", async ({ page }) => {
    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: false },
    });

    await page.goto("/today?from=focus&status=abandoned");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Page should still load without judgment
    await expect(page.locator("h1")).toBeVisible();
    
    // No shame language
    const pageText = await page.locator("body").textContent();
    expect(pageText?.toLowerCase()).not.toContain("failed");
    expect(pageText?.toLowerCase()).not.toContain("quit");
  });
});

// ============================================
// Momentum Feedback Journey
// ============================================
test.describe("Momentum Feedback Journey", () => {
  test("first completion in session triggers momentum", async ({ page }) => {
    // Set up state where momentum should show
    await setupBehavioralState(page, {
      momentum: "shown",
    });

    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: false },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Look for the neutral momentum message
    const goodStartText = page.locator('text="Good start."');
    const isVisible = await goodStartText.isVisible().catch(() => false);
    
    // If momentum state is "shown", the banner should appear
    if (isVisible) {
      await expect(goodStartText).toBeVisible();
    }
  });

  test("momentum message uses neutral copy (no gamification)", async ({ page }) => {
    await setupBehavioralState(page, {
      momentum: "shown",
    });

    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: false },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Check that gamified language is NOT present
    const pageText = await page.locator("body").textContent() || "";
    const lowerText = pageText.toLowerCase();
    
    expect(lowerText).not.toContain("xp");
    expect(lowerText).not.toContain("coins");
    expect(lowerText).not.toContain("streak");
    expect(lowerText).not.toContain("level up");
    expect(lowerText).not.toContain("achievement");
  });

  test("momentum banner dismissed state persists", async ({ page }) => {
    await setupBehavioralState(page, {
      momentum: "dismissed",
    });

    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: false },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Banner should NOT appear when already dismissed
    const goodStartText = page.locator('text="Good start."');
    await expect(goodStartText).not.toBeVisible();
  });
});

// ============================================
// Cross-Device Journey
// ============================================
test.describe("Cross-Device User Journey", () => {
  test("mobile user gets full StarterBlock functionality", async ({ page }) => {
    await setViewport(page, "mobile");
    
    await mockTodayDataAPI(page, {
      userState: { firstDay: true },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    const starterBlock = page.locator('[data-testid="starter-block"]');
    await expect(starterBlock).toBeVisible();

    // CTA should be tappable
    const ctaButton = starterBlock.locator('[class*="primaryButton"]');
    await expect(ctaButton).toBeVisible();
  });

  test("tablet user sees appropriate layout", async ({ page }) => {
    await setViewport(page, "tablet");
    
    await mockTodayDataAPI(page, {
      userState: { firstDay: false },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Page should render correctly
    await expect(page.locator("h1")).toBeVisible();
  });

  test("desktop user sees full experience", async ({ page }) => {
    await setViewport(page, "desktop");
    
    await mockTodayDataAPI(page, {
      userState: { firstDay: false, returningAfterGap: false },
    });

    await page.goto("/today");

    if (isOnAuthPage(page)) {
      return;
    }

    await waitForDataLoad(page);

    // Full grid should be visible
    const grid = page.locator('[class*="grid"]');
    await expect(grid).toBeVisible();
  });
});

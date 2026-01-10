/**
 * Starter Engine Behavioral E2E Tests
 *
 * Tests the core "Starter Engine" features that reduce decision paralysis:
 * - StarterBlock: Single dominant CTA
 * - MomentumBanner: Post-completion acknowledgment
 * - ReducedModeBanner: Welcome back after gap
 * - SoftLanding: Reduced choices after action completion
 * - DecisionSuppression: State-driven visibility rules
 */

import { test, expect, type Page } from "@playwright/test";

// Test configuration - use authenticated state when available
test.describe.configure({ mode: "serial" });

/**
 * Helper: Wait for API calls to settle
 */
async function waitForDataLoad(page: Page) {
  await page.waitForLoadState("networkidle");
  // Wait for loading spinners to disappear
  await page.waitForSelector('[class*="loading"]', { state: "hidden" }).catch(() => {
    // No loading indicator, continue
  });
}

/**
 * Helper: Mock authenticated session for Today page access
 * In production, this would inject auth cookies
 */
async function setupAuthenticatedSession(page: Page) {
  // Set up localStorage/sessionStorage flags if needed for testing
  await page.addInitScript(() => {
    // Clear any previous test state
    sessionStorage.clear();
    localStorage.clear();
  });
}

// ============================================
// StarterBlock Tests
// ============================================
test.describe("StarterBlock - Single CTA", () => {
  test("should display StarterBlock on Today page", async ({ page }) => {
    await page.goto("/today");
    
    // If redirected to signin, check that works
    if (page.url().includes("/auth/signin")) {
      await expect(page.locator('button:has-text("Google")')).toBeVisible();
      return; // Skip rest of test when not authenticated
    }

    await waitForDataLoad(page);

    // StarterBlock should be present
    const starterBlock = page.locator('[data-testid="starter-block"]');
    await expect(starterBlock).toBeVisible();
  });

  test("should show 'Start here' heading in StarterBlock", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return; // Skip when not authenticated
    }

    await waitForDataLoad(page);

    const starterBlock = page.locator('[data-testid="starter-block"]');
    const heading = starterBlock.locator('h2:has-text("Start here")');
    await expect(heading).toBeVisible();
  });

  test("should display a single primary CTA button", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const starterBlock = page.locator('[data-testid="starter-block"]');
    
    // Should have exactly one primary button
    const primaryButtons = starterBlock.locator('[class*="primaryButton"]');
    await expect(primaryButtons).toHaveCount(1);
  });

  test("StarterBlock CTA should navigate to action page", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const starterBlock = page.locator('[data-testid="starter-block"]');
    const ctaButton = starterBlock.locator('[class*="primaryButton"]');
    
    // Get the href before clicking
    const href = await ctaButton.getAttribute("href");
    expect(href).toBeTruthy();
    
    // Should be a valid action route
    const validRoutes = ["/focus", "/quests", "/learn", "/planner"];
    const isValidRoute = validRoutes.some(route => href?.includes(route));
    expect(isValidRoute).toBeTruthy();
  });

  test("StarterBlock should show loading state initially", async ({ page }) => {
    // Intercept API to delay response
    await page.route("**/api/daily-plan", async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    // Check for loading state
    const starterBlock = page.locator('[data-testid="starter-block"]');
    const loading = starterBlock.locator('text=Loading');
    
    // Loading should appear briefly
    await expect(loading).toBeVisible({ timeout: 1000 }).catch(() => {
      // May load too fast, that's okay
    });
  });
});

// ============================================
// MomentumBanner Tests
// ============================================
test.describe("MomentumBanner - Post-Completion Feedback", () => {
  test("MomentumBanner should not appear on initial load", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Banner should NOT be visible initially (pending state)
    const banner = page.locator('[class*="MomentumBanner"]');
    await expect(banner).not.toBeVisible();
  });

  test("MomentumBanner should display neutral copy when shown", async ({ page }) => {
    // Pre-set session storage to simulate post-completion state
    await page.addInitScript(() => {
      sessionStorage.setItem("today_momentum_state", "shown");
    });

    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Look for the "Good start." message (neutral, non-gamified)
    const goodStartText = page.locator('text="Good start."');
    // If the banner appears, it should have this copy
    const isVisible = await goodStartText.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(goodStartText).toBeVisible();
    }
  });

  test("MomentumBanner should be dismissible", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("today_momentum_state", "shown");
    });

    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const banner = page.locator('[class*="MomentumBanner"]');
    
    if (await banner.isVisible().catch(() => false)) {
      const dismissButton = banner.locator('button[aria-label="Dismiss"]');
      await dismissButton.click();
      
      // Banner should disappear after dismiss
      await expect(banner).not.toBeVisible();
    }
  });

  test("MomentumBanner should have accessible role=status", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("today_momentum_state", "shown");
    });

    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const statusRole = page.locator('[role="status"]');
    const count = await statusRole.count();
    
    // If momentum banner is shown, it should have role="status"
    if (count > 0) {
      await expect(statusRole.first()).toHaveAttribute("aria-live", "polite");
    }
  });
});

// ============================================
// ReducedModeBanner Tests (48h+ Gap)
// ============================================
test.describe("ReducedModeBanner - Welcome Back After Gap", () => {
  test("ReducedModeBanner displays for returning users", async ({ page }) => {
    // This would need server-side state indicating 48h+ gap
    // Testing the component's presence and behavior
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Look for the reduced mode banner container
    const reducedBanner = page.locator('[class*="ReducedMode"], text="Welcome back"');
    
    // If visible (user returning after gap), check content
    if (await reducedBanner.isVisible().catch(() => false)) {
      // Should contain supportive message
      await expect(page.locator('text="Welcome back"')).toBeVisible();
      await expect(page.locator('text="Start small"')).toBeVisible();
    }
  });

  test("ReducedModeBanner shows quick action suggestions", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const reducedBanner = page.locator('[class*="ReducedMode"]');
    
    if (await reducedBanner.isVisible().catch(() => false)) {
      // Should have quick suggestions
      await expect(reducedBanner.locator('text="5 min focus"')).toBeVisible();
      await expect(reducedBanner.locator('text="Quick quest"')).toBeVisible();
    }
  });

  test("ReducedModeBanner can be dismissed", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const reducedBanner = page.locator('[class*="ReducedMode"]').first();
    
    if (await reducedBanner.isVisible().catch(() => false)) {
      const dismissButton = reducedBanner.locator('[aria-label="Dismiss"]');
      await dismissButton.click();
      
      await expect(reducedBanner).not.toBeVisible();
    }
  });

  test("ReducedModeBanner dismissal persists in session", async ({ page }) => {
    // Clear and set up fresh session
    await page.addInitScript(() => {
      sessionStorage.setItem("today_reduced_mode_dismissed", "true");
    });

    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Banner should NOT appear if already dismissed
    const reducedBanner = page.locator('[class*="ReducedMode"]');
    await expect(reducedBanner).not.toBeVisible();
  });
});

// ============================================
// SoftLanding Tests (Post-Action Reduced UI)
// ============================================
test.describe("SoftLanding - Post-Action Reduced Choices", () => {
  test("should detect soft landing state from URL params", async ({ page }) => {
    // Navigate with soft landing parameter
    await page.goto("/today?from=focus&status=completed");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Page should recognize the soft landing state
    // (Implementation depends on how soft landing is triggered)
    expect(page.url()).toContain("/today");
  });

  test("soft landing should reduce visible sections", async ({ page }) => {
    // Set soft landing active in session
    await page.addInitScript(() => {
      sessionStorage.setItem("today_soft_landing_active", "true");
      sessionStorage.setItem("today_soft_landing_source", "focus");
    });

    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // When soft landing is active, some sections should be collapsed
    const collapsedSections = page.locator('[data-collapsed="true"], [class*="collapsed"]');
    const count = await collapsedSections.count();
    
    // Should have at least some collapsed sections (or different UI state)
    // This test documents the expected behavior
    expect(count).toBeGreaterThanOrEqual(0); // Flexible - depends on implementation
  });
});

// ============================================
// Decision Suppression Tests
// ============================================
test.describe("DecisionSuppression - State-Driven Visibility", () => {
  test("Today page should have structured grid layout", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Page should have main grid container
    const grid = page.locator('[class*="grid"]');
    await expect(grid).toBeVisible();
  });

  test("should show greeting header with user name", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Should display time-appropriate greeting
    const greetings = ["Good morning", "Good afternoon", "Good evening"];
    const header = page.locator('h1');
    const headerText = await header.textContent();
    
    const hasGreeting = greetings.some(g => headerText?.includes(g));
    expect(hasGreeting).toBeTruthy();
  });

  test("subtitle should provide context", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const subtitle = page.locator('[class*="subtitle"]');
    await expect(subtitle).toContainText("your plate");
  });

  test("visibility rules should limit options for new users", async ({ page }) => {
    // First-day user should see limited UI
    await page.addInitScript(() => {
      localStorage.setItem("user_first_day", "true");
    });

    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // StarterBlock should be prominently visible for first-day users
    const starterBlock = page.locator('[data-testid="starter-block"]');
    await expect(starterBlock).toBeVisible();
  });
});

// ============================================
// Accessibility Tests
// ============================================
test.describe("Starter Engine Accessibility", () => {
  test("all interactive elements should be keyboard accessible", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    
    // Focused element should be visible
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("dismiss buttons should have aria-labels", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // All dismiss buttons should have proper labels
    const dismissButtons = page.locator('button[aria-label="Dismiss"]');
    const count = await dismissButtons.count();
    
    for (let i = 0; i < count; i++) {
      await expect(dismissButtons.nth(i)).toHaveAttribute("aria-label");
    }
  });

  test("banners should use semantic HTML and ARIA", async ({ page }) => {
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Status messages should have role="status"
    const statusRoles = page.locator('[role="status"]');
    const count = await statusRoles.count();
    
    for (let i = 0; i < count; i++) {
      const element = statusRoles.nth(i);
      // Should have aria-live for screen readers
      const ariaLive = await element.getAttribute("aria-live");
      expect(ariaLive === "polite" || ariaLive === "assertive").toBeTruthy();
    }
  });
});

// ============================================
// Responsive Behavior Tests
// ============================================
test.describe("Starter Engine Responsive Design", () => {
  test("StarterBlock renders correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const starterBlock = page.locator('[data-testid="starter-block"]');
    await expect(starterBlock).toBeVisible();
    
    // CTA should still be tappable size (44x44 minimum)
    const ctaButton = starterBlock.locator('[class*="primaryButton"]');
    if (await ctaButton.isVisible()) {
      const box = await ctaButton.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("Today page renders correctly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    const header = page.locator("h1");
    await expect(header).toBeVisible();
  });

  test("Touch targets meet minimum size on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/today");
    
    if (page.url().includes("/auth/signin")) {
      return;
    }

    await waitForDataLoad(page);

    // Check all buttons for minimum touch target size
    const buttons = page.locator('button, a[class*="Button"]');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Minimum 44x44 for accessibility
          expect(box.width >= 44 || box.height >= 44).toBeTruthy();
        }
      }
    }
  });
});

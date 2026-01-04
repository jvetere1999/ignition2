/**
 * Auth Flow E2E Tests
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should show sign-in page", async ({ page }) => {
    await page.goto("/auth/signin");

    // Check page title
    await expect(page).toHaveTitle(/Sign In/);

    // Check for OAuth buttons
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Microsoft/i })
    ).toBeVisible();
  });

  test("should have proper page structure", async ({ page }) => {
    await page.goto("/auth/signin");

    // Check heading
    await expect(
      page.getByRole("heading", { name: /Welcome/i })
    ).toBeVisible();

    // Check for sign-in form container
    await expect(page.locator('[class*="container"]')).toBeVisible();
  });

  test("should display error page for auth errors", async ({ page }) => {
    await page.goto("/auth/error?error=AccessDenied");

    // Check for error message
    await expect(page.getByText(/error/i)).toBeVisible();
  });

  test("should redirect unauthenticated users from protected routes", async ({
    page,
  }) => {
    // Try to access protected route
    await page.goto("/planner");

    // Should redirect to sign-in
    await expect(page).toHaveURL(/auth\/signin/);
  });

  test("should redirect unauthenticated users from settings", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/auth\/signin/);
  });

  test("should redirect unauthenticated users from focus", async ({ page }) => {
    await page.goto("/focus");
    await expect(page).toHaveURL(/auth\/signin/);
  });
});


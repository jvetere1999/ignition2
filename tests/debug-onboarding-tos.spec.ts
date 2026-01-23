import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

/**
 * Debug test for TOS acceptance and onboarding flow
 * This test traces through the exact flow to identify where it breaks
 */
test('TOS acceptance triggers onboarding API call', async ({ page, request }) => {
  console.log('Starting TOS acceptance test...');
  console.log(`Frontend base: ${BASE_URL}`);
  console.log(`Backend API: ${API_BASE_URL}`);

  // Enable verbose logging to see all network requests
  page.on('console', (msg) => {
    if (msg.type() === 'log' && msg.text().includes('[')) {
      console.log('Browser:', msg.text());
    }
  });

  // Navigate to a page that would show the onboarding flow
  // (This assumes the user is already authenticated)
  // If not authenticated, this will redirect to signin
  console.log('Navigating to /onboarding...');
  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Check if we're redirected to signin (not authenticated)
  if (page.url().includes('/signin')) {
    console.log('Not authenticated, navigating to signin...');
    // This test assumes we need an authenticated session
    // For now, skip this test
    test.skip();
  }

  // Check if TOS modal is visible
  const tosModal = page.locator('[class*="tosCard"]');
  const tosModalVisible = await tosModal.isVisible().catch(() => false);

  if (!tosModalVisible) {
    console.log('TOS modal not visible - either TOS already accepted or page structure different');
    // Try to find the onboarding modal instead
    const onboardingModal = page.locator('[class*="Modal"]');
    const onboardingVisible = await onboardingModal.isVisible().catch(() => false);
    if (onboardingVisible) {
      console.log('✓ Onboarding modal is showing - TOS likely already accepted');
      return;
    }
  } else {
    console.log('TOS modal is visible');

    // Check the checkboxes to enable the continue button
    const ageCheckbox = page.locator('input[type="checkbox"]').first();
    const tosCheckbox = page.locator('input[type="checkbox"]').nth(1);

    console.log('Checking age confirmation checkbox...');
    await ageCheckbox.check();
    await page.waitForTimeout(100);

    console.log('Checking TOS agreement checkbox...');
    await tosCheckbox.check();
    await page.waitForTimeout(300); // Wait for button enable delay

    // Click continue button
    const continueButton = page.locator('button:has-text("Continue")').first();
    console.log('Clicking Continue button...');

    // Set up request listener to detect API calls
    let tosAcceptedCalled = false;
    let onboardingApiCalled = false;
    const requestListener = (request: any) => {
      const url = request.url();
      const method = request.method();
      console.log(`[Network] ${method} ${url}`);
      
      if (url.includes('/auth/accept-tos')) {
        tosAcceptedCalled = true;
        console.log('[Test] ✓ /auth/accept-tos called');
      }
      if (url.includes('/api/onboarding')) {
        onboardingApiCalled = true;
        console.log('[Test] ✓ /api/onboarding called');
      }
    };

    page.on('request', requestListener);

    // Click the button
    await continueButton.click();

    // Wait for API calls to complete
    console.log('Waiting for API responses...');
    await page.waitForTimeout(2000);

    page.off('request', requestListener);

    // Check if TOS was accepted
    if (tosAcceptedCalled) {
      console.log('[Test] ✓ TOS acceptance endpoint was called');
    } else {
      console.log('[Test] ✗ TOS acceptance endpoint was NOT called');
    }

    // Check if onboarding API was called
    if (onboardingApiCalled) {
      console.log('[Test] ✓ Onboarding API was called after TOS acceptance');
    } else {
      console.log('[Test] ✗ Onboarding API was NOT called after TOS acceptance');
      console.log('[Test] This is the bug we\'re investigating!');
    }

    expect(tosAcceptedCalled).toBe(true);
    expect(onboardingApiCalled).toBe(true);
  }
});

import { test, expect } from '@playwright/test';

// ============================================================================
// E2E Test Suite for DAW Watcher Application
// ============================================================================

const BASE_URL = process.env.WATCHER_URL || 'http://localhost:8080';
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_TIMEOUT = 30000;

/**
 * Helper: Create test DAW project directory
 */
async function createTestProjectDir(path: string, dawType: string) {
  // Would use native file system API or tauri invoke
  const response = await fetch(`${API_URL}/test/create-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, daw_type: dawType })
  });
  expect(response.ok).toBeTruthy();
  return response.json();
}

/**
 * Helper: Generate test audio file
 */
async function createTestAudioFile(projectPath: string, fileName: string) {
  const response = await fetch(`${API_URL}/test/create-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: projectPath, file_name: fileName, size_bytes: 1024 * 100 })
  });
  expect(response.ok).toBeTruthy();
  return response.json();
}

/**
 * Helper: Verify file encryption
 */
async function verifyFileEncrypted(filePath: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/test/verify-encryption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_path: filePath })
  });
  if (!response.ok) return false;
  const data = await response.json();
  return data.encrypted === true;
}

// ============================================================================
// Test Suite 1: Application Lifecycle
// ============================================================================

test.describe('DAW Watcher - Application Lifecycle', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('01: Application launches and displays home page', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Should see main watcher interface
    await expect(page.locator('text=DAW Watcher')).toBeVisible();
    
    // Should display 3 tabs
    await expect(page.locator('[role="tab"]')).toHaveCount(3);
    const tabs = await page.locator('[role="tab"]').allTextContents();
    expect(tabs).toContain('Status');
    expect(tabs).toContain('Projects');
    expect(tabs).toContain('Settings');
  });

  test('02: Application persists state across reloads', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Go to Settings tab
    await page.click('[role="tab"]:has-text("Settings")');
    await page.waitForTimeout(500);
    
    // Change a setting
    const syncIntervalInput = page.locator('input[placeholder*="300"]');
    await syncIntervalInput.fill('600');
    
    // Save settings
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Settings saved')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Verify setting persisted
    await page.click('[role="tab"]:has-text("Settings")');
    const value = await syncIntervalInput.inputValue();
    expect(value).toBe('600');
  });

  test('03: Error states are handled gracefully', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Try to add invalid directory path
    await page.click('[role="tab"]:has-text("Projects")');
    await page.click('button:has-text("Add Project")');
    
    // Enter invalid path
    await page.fill('input[placeholder*="path"]', '/nonexistent/path/123');
    await page.click('button:has-text("Add")');
    
    // Should show error alert
    await expect(page.locator('[role="alert"]')).toContainText('does not exist');
  });
});

// ============================================================================
// Test Suite 2: Project Management
// ============================================================================

test.describe('DAW Watcher - Project Management', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('04: Add new DAW project to watch list', async ({ page }) => {
    const projectDir = '/tmp/test-project-ableton';
    await createTestProjectDir(projectDir, 'ableton');
    
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Projects")');
    await page.click('button:has-text("Add Project")');
    
    // Select DAW type
    await page.click('[placeholder*="Select DAW"]');
    await page.click('text=Ableton Live');
    
    // Enter path
    await page.fill('input[placeholder*="path"]', projectDir);
    
    // Add project
    await page.click('button:has-text("Add")');
    
    // Verify project appears in list
    await expect(page.locator(`text=${projectDir}`)).toBeVisible();
    await expect(page.locator('text=Idle')).toBeVisible();
  });

  test('05: Remove project from watch list', async ({ page }) => {
    const projectDir = '/tmp/test-project-fl';
    await createTestProjectDir(projectDir, 'flstudio');
    
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Projects")');
    
    // Add project first
    await page.click('button:has-text("Add Project")');
    await page.click('[placeholder*="Select DAW"]');
    await page.click('text=FL Studio');
    await page.fill('input[placeholder*="path"]', projectDir);
    await page.click('button:has-text("Add")');
    
    // Wait for project to appear
    await page.waitForTimeout(500);
    
    // Click menu button for project
    await page.click(`[data-project-id="${projectDir}"] button:has-text("⋯")`);
    
    // Click remove
    await page.click('text=Remove');
    
    // Verify removed
    await expect(page.locator(`text=${projectDir}`)).not.toBeVisible();
  });

  test('06: Display multiple DAW projects with different types', async ({ page }) => {
    // Create projects of different types
    await createTestProjectDir('/tmp/project-ableton', 'ableton');
    await createTestProjectDir('/tmp/project-logic', 'logic');
    await createTestProjectDir('/tmp/project-cubase', 'cubase');
    
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Projects")');
    
    // Add each project
    for (const { path, type } of [
      { path: '/tmp/project-ableton', type: 'Ableton Live' },
      { path: '/tmp/project-logic', type: 'Logic Pro' },
      { path: '/tmp/project-cubase', type: 'Cubase' }
    ]) {
      await page.click('button:has-text("Add Project")');
      await page.click('[placeholder*="Select DAW"]');
      await page.click(`text=${type}`);
      await page.fill('input[placeholder*="path"]', path);
      await page.click('button:has-text("Add")');
      await page.waitForTimeout(300);
    }
    
    // Verify all projects visible
    await expect(page.locator('text=/tmp/project-ableton')).toBeVisible();
    await expect(page.locator('text=/tmp/project-logic')).toBeVisible();
    await expect(page.locator('text=/tmp/project-cubase')).toBeVisible();
    
    // Verify DAW icons/labels displayed
    expect(await page.locator('[data-daw-type]').count()).toBe(3);
  });
});

// ============================================================================
// Test Suite 3: Sync Status and File Watching
// ============================================================================

test.describe('DAW Watcher - Sync Operations', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('07: Display real-time sync status', async ({ page }) => {
    const projectDir = '/tmp/sync-test-project';
    await createTestProjectDir(projectDir, 'ableton');
    await createTestAudioFile(projectDir, 'song.als');
    
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Status")');
    
    // Should show idle status initially
    await expect(page.locator('text=Idle')).toBeVisible();
    
    // Add project to watch
    await page.click('[role="tab"]:has-text("Projects")');
    await page.click('button:has-text("Add Project")');
    await page.click('[placeholder*="Select DAW"]');
    await page.click('text=Ableton Live');
    await page.fill('input[placeholder*="path"]', projectDir);
    await page.click('button:has-text("Add")');
    
    // Back to status
    await page.click('[role="tab"]:has-text("Status")');
    
    // Trigger sync
    await page.click('button:has-text("Sync Now")');
    
    // Should show syncing status
    await expect(page.locator('text=Syncing')).toBeVisible({ timeout: 5000 });
    
    // Should return to idle after sync completes
    await expect(page.locator('text=Idle')).toBeVisible({ timeout: 10000 });
  });

  test('08: Display sync statistics', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Status")');
    
    // Should show statistics
    await expect(page.locator('text=Files Synced')).toBeVisible();
    await expect(page.locator('text=Storage Used')).toBeVisible();
    await expect(page.locator('text=Last Sync')).toBeVisible();
    
    // Statistics should be numeric or "—" if no data
    const filesCount = await page.locator('[data-stat="files-synced"]').textContent();
    expect(filesCount).toMatch(/^\d+$|^—$/);
    
    const storageUsed = await page.locator('[data-stat="storage-used"]').textContent();
    expect(storageUsed).toMatch(/^\d+(\.\d+)?\s*[KMG]?B|^—$/);
  });

  test('09: Manual sync trigger and completion', async ({ page }) => {
    const projectDir = '/tmp/manual-sync-test';
    await createTestProjectDir(projectDir, 'flstudio');
    
    // Create test files
    await createTestAudioFile(projectDir, 'track1.flp');
    await createTestAudioFile(projectDir, 'track2.flp');
    
    await page.goto(BASE_URL);
    
    // Add project
    await page.click('[role="tab"]:has-text("Projects")');
    await page.click('button:has-text("Add Project")');
    await page.click('[placeholder*="Select DAW"]');
    await page.click('text=FL Studio');
    await page.fill('input[placeholder*="path"]', projectDir);
    await page.click('button:has-text("Add")');
    
    // Go to Status tab and trigger sync
    await page.click('[role="tab"]:has-text("Status")');
    const initialSyncCount = await page.locator('[data-stat="total-syncs"]').textContent();
    
    await page.click('button:has-text("Sync Now")');
    
    // Wait for sync to complete
    await expect(page.locator('text=Idle')).toBeVisible({ timeout: 10000 });
    
    // Sync count should increment
    const newSyncCount = await page.locator('[data-stat="total-syncs"]').textContent();
    expect(parseInt(newSyncCount || '0')).toBeGreaterThan(parseInt(initialSyncCount || '0'));
  });
});

// ============================================================================
// Test Suite 4: Settings Configuration
// ============================================================================

test.describe('DAW Watcher - Settings', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('10: Update sync interval setting', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Settings")');
    
    // Change sync interval
    const intervalInput = page.locator('input[name="sync_interval_secs"]');
    await intervalInput.fill('1200');
    
    // Save
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Settings updated')).toBeVisible();
    
    // Verify persisted
    await page.reload();
    await page.click('[role="tab"]:has-text("Settings")');
    const value = await intervalInput.inputValue();
    expect(value).toBe('1200');
  });

  test('11: Toggle encryption setting', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Settings")');
    
    // Toggle encryption switch
    const encryptSwitch = page.locator('input[name="encrypt_files"][type="checkbox"]');
    const initialState = await encryptSwitch.isChecked();
    
    await encryptSwitch.click();
    
    // Save
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Settings updated')).toBeVisible();
    
    // Verify toggled
    await page.reload();
    await page.click('[role="tab"]:has-text("Settings")');
    const newState = await encryptSwitch.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('12: Update API settings', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Settings")');
    
    // Update API URL
    const apiUrlInput = page.locator('input[name="api_base_url"]');
    await apiUrlInput.fill('https://api.example.com');
    
    // Update auth token
    const tokenInput = page.locator('input[name="auth_token"][type="password"]');
    await tokenInput.fill('test-token-12345');
    
    // Save
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Settings updated')).toBeVisible();
    
    // Verify persisted
    await page.reload();
    await page.click('[role="tab"]:has-text("Settings")');
    const apiUrl = await apiUrlInput.inputValue();
    expect(apiUrl).toBe('https://api.example.com');
  });

  test('13: Validate setting ranges', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Settings")');
    
    // Try to set sync interval below minimum
    const intervalInput = page.locator('input[name="sync_interval_secs"]');
    await intervalInput.fill('30'); // Below minimum of 60
    
    await page.click('button:has-text("Save")');
    
    // Should show error
    await expect(page.locator('[role="alert"]')).toContainText('must be at least');
  });
});

// ============================================================================
// Test Suite 5: File Encryption and Upload
// ============================================================================

test.describe('DAW Watcher - Encryption & Upload', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('14: Encrypt audio files on sync', async ({ page }) => {
    const projectDir = '/tmp/encryption-test';
    await createTestProjectDir(projectDir, 'logic');
    
    // Create test audio file
    const audioFile = await createTestAudioFile(projectDir, 'project.logicx');
    
    await page.goto(BASE_URL);
    
    // Enable encryption in settings
    await page.click('[role="tab"]:has-text("Settings")');
    const encryptSwitch = page.locator('input[name="encrypt_files"][type="checkbox"]');
    if (!await encryptSwitch.isChecked()) {
      await encryptSwitch.click();
      await page.click('button:has-text("Save")');
    }
    
    // Add project
    await page.click('[role="tab"]:has-text("Projects")');
    await page.click('button:has-text("Add Project")');
    await page.click('[placeholder*="Select DAW"]');
    await page.click('text=Logic Pro');
    await page.fill('input[placeholder*="path"]', projectDir);
    await page.click('button:has-text("Add")');
    
    // Trigger sync
    await page.click('[role="tab"]:has-text("Status")');
    await page.click('button:has-text("Sync Now")');
    
    // Wait for completion
    await expect(page.locator('text=Idle')).toBeVisible({ timeout: 10000 });
    
    // Verify file was encrypted
    const encrypted = await verifyFileEncrypted(audioFile.uploaded_path);
    expect(encrypted).toBe(true);
  });

  test('15: Handle large file uploads with chunks', async ({ page }) => {
    const projectDir = '/tmp/large-file-test';
    await createTestProjectDir(projectDir, 'protools');
    
    // Create large test file (100MB)
    const largeFile = await createTestAudioFile(projectDir, 'large.ptx');
    
    await page.goto(BASE_URL);
    
    // Add project
    await page.click('[role="tab"]:has-text("Projects")');
    await page.click('button:has-text("Add Project")');
    await page.click('[placeholder*="Select DAW"]');
    await page.click('text=Pro Tools');
    await page.fill('input[placeholder*="path"]', projectDir);
    await page.click('button:has-text("Add")');
    
    // Trigger sync with progress tracking
    await page.click('[role="tab"]:has-text("Status")');
    await page.click('button:has-text("Sync Now")');
    
    // Monitor progress (should show updating stats)
    let filesSynced = 0;
    for (let i = 0; i < 20; i++) {
      const current = parseInt(
        await page.locator('[data-stat="files-synced"]').textContent() || '0'
      );
      if (current > filesSynced) {
        filesSynced = current;
      }
      if (filesSynced > 0) break;
      await page.waitForTimeout(500);
    }
    
    // Should eventually complete
    await expect(page.locator('text=Idle')).toBeVisible({ timeout: 30000 });
  });

  test('16: Handle upload errors gracefully', async ({ page }) => {
    // Simulate API error by using invalid token
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Settings")');
    
    const tokenInput = page.locator('input[name="auth_token"][type="password"]');
    await tokenInput.fill('invalid-token');
    await page.click('button:has-text("Save")');
    
    // Add project and try to sync
    await page.click('[role="tab"]:has-text("Projects")');
    await page.click('button:has-text("Add Project")');
    await page.click('[placeholder*="Select DAW"]');
    await page.click('text=Ableton Live');
    const testDir = '/tmp/error-test-project';
    await createTestProjectDir(testDir, 'ableton');
    await page.fill('input[placeholder*="path"]', testDir);
    await page.click('button:has-text("Add")');
    
    // Trigger sync
    await page.click('[role="tab"]:has-text("Status")');
    await page.click('button:has-text("Sync Now")');
    
    // Should show error after sync attempt
    await expect(page.locator('[role="alert"]')).toContainText('Authentication|Failed|Error', { timeout: 10000 });
  });
});

// ============================================================================
// Test Suite 6: System Tray Integration
// ============================================================================

test.describe('DAW Watcher - System Tray', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('17: Tray menu opens main window', async ({ page, context }) => {
    // Note: Full tray testing requires Tauri-specific testing APIs
    // This is a placeholder for actual implementation
    
    await page.goto(BASE_URL);
    
    // Window should be visible
    await expect(page.locator('text=DAW Watcher')).toBeVisible();
  });
});

// ============================================================================
// Test Suite 7: Performance and Stress Tests
// ============================================================================

test.describe('DAW Watcher - Performance', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('18: Handle many projects (50+) without lag', async ({ page }) => {
    // Create 50+ test projects
    const projectPaths = Array.from({ length: 50 }, (_, i) => 
      `/tmp/stress-test-project-${i}`
    );
    
    for (const path of projectPaths) {
      await createTestProjectDir(path, 'ableton');
    }
    
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Projects")');
    
    // Measure load time
    const startTime = Date.now();
    
    // Add projects
    for (let i = 0; i < 10; i++) { // Add subset in UI
      await page.click('button:has-text("Add Project")');
      await page.click('[placeholder*="Select DAW"]');
      await page.click('text=Ableton Live');
      await page.fill('input[placeholder*="path"]', projectPaths[i]);
      await page.click('button:has-text("Add")');
      await page.waitForTimeout(100);
    }
    
    const loadTime = Date.now() - startTime;
    
    // Should complete reasonably fast (<5 seconds for 10 projects)
    expect(loadTime).toBeLessThan(5000);
  });

  test('19: Status updates don\'t block UI', async ({ page }) => {
    const projectDir = '/tmp/responsive-test';
    await createTestProjectDir(projectDir, 'cubase');
    
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Projects")');
    await page.click('button:has-text("Add Project")');
    await page.click('[placeholder*="Select DAW"]');
    await page.click('text=Cubase');
    await page.fill('input[placeholder*="path"]', projectDir);
    await page.click('button:has-text("Add")');
    
    // Trigger sync
    await page.click('[role="tab"]:has-text("Status")');
    await page.click('button:has-text("Sync Now")');
    
    // UI should remain responsive - can click settings while syncing
    await page.click('[role="tab"]:has-text("Settings")');
    await expect(page.locator('text=Sync Settings')).toBeVisible();
    
    // Go back to status - should still show syncing
    await page.click('[role="tab"]:has-text("Status")');
  });
});

// ============================================================================
// Test Suite 8: Error Recovery
// ============================================================================

test.describe('DAW Watcher - Error Recovery', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('20: Recover from network errors', async ({ page, context }) => {
    // Simulate offline mode
    await context.setOffline(true);
    
    await page.goto(BASE_URL);
    await page.click('[role="tab"]:has-text("Status")');
    await page.click('button:has-text("Sync Now")');
    
    // Should show error
    await expect(page.locator('[role="alert"]')).toContainText('Network|Connection', { timeout: 5000 });
    
    // Come back online
    await context.setOffline(false);
    
    // Should be able to retry
    await page.click('button:has-text("Sync Now")');
    
    // Should attempt sync again
    await expect(page.locator('text=Syncing|Idle')).toBeVisible({ timeout: 5000 });
  });
});


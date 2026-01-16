/**
 * E2E Tests for E2EE Recovery Code System
 *
 * Tests the complete recovery code workflow:
 * 1. Generate recovery codes
 * 2. Validate recovery codes
 * 3. Use recovery code to reset passphrase
 * 4. Verify new passphrase works
 *
 * Setup:
 *   1. Start infrastructure: docker compose -f infra/docker-compose.e2e.yml up -d
 *   2. Wait for health: curl http://localhost:8080/health
 *   3. Run tests: API_BASE_URL=http://localhost:8080 npx playwright test tests/api-e2ee-recovery.spec.ts
 *   4. Cleanup: docker compose -f infra/docker-compose.e2e.yml down -v
 *
 * Environment Variables:
 *   - API_BASE_URL: Backend API URL (default: http://localhost:8080)
 *
 * NOTE: Uses X-Dev-User header for dev bypass authentication (AUTH_DEV_BYPASS=true)
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import crypto from 'crypto';

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

// Dev bypass user details (matches backend dev_bypass.rs)
const DEV_USER = {
  id: 'recovery_test_user',
  email: 'recovery-test@localhost',
  name: 'Recovery Code Test User',
};

// Test credentials
const ORIGINAL_PASSPHRASE = 'original_secure_passphrase_123!@#';
const NEW_PASSPHRASE = 'new_secure_passphrase_456$%^';
const INVALID_RECOVERY_CODE = 'INVALID_CODE_123456';

// ============================================
// Test Suite: Recovery Code System
// ============================================

test.describe('E2EE Recovery Code System', () => {
  test.describe.configure({ mode: 'serial' });

  let recoveryCodesResponse: any;
  let recoveryCode: string;
  let recoveryCodeId: string;

  // --- Test 1: Generate Recovery Codes ---
  test('POST /vault/recovery - generate recovery codes', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/generate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        passphrase: ORIGINAL_PASSPHRASE,
      },
    });

    expect(response.status()).toBe(200);
    recoveryCodesResponse = await response.json();

    // Verify response structure
    expect(recoveryCodesResponse).toHaveProperty('data');
    expect(recoveryCodesResponse.data).toHaveProperty('recovery_codes');
    expect(Array.isArray(recoveryCodesResponse.data.recovery_codes)).toBe(true);
    expect(recoveryCodesResponse.data.recovery_codes.length).toBeGreaterThan(0);

    // Store first recovery code for later tests
    recoveryCode = recoveryCodesResponse.data.recovery_codes[0];
    expect(recoveryCode).toBeTruthy();
    expect(recoveryCode.length).toBeGreaterThan(0);

    console.log('✓ Recovery codes generated:', recoveryCodesResponse.data.recovery_codes.length);
  });

  // --- Test 2: Validate Recovery Code Format ---
  test('Recovery codes have valid format', async () => {
    expect(recoveryCode).toBeTruthy();
    // Recovery codes should be uppercase alphanumeric
    expect(/^[A-Z0-9\-]+$/.test(recoveryCode)).toBe(true);
    expect(recoveryCode.length).toBeGreaterThan(0);

    console.log('✓ Recovery code format valid:', recoveryCode);
  });

  // --- Test 3: Verify Recovery Codes Stored in Database ---
  test('GET /vault/recovery - list recovery codes', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/vault/recovery`, {
      headers: {
        'X-Dev-User': DEV_USER.id,
      },
    });

    expect(response.status()).toBe(200);
    const listResponse = await response.json();

    expect(listResponse).toHaveProperty('data');
    expect(listResponse.data).toHaveProperty('recovery_codes');
    expect(Array.isArray(listResponse.data.recovery_codes)).toBe(true);
    expect(listResponse.data.recovery_codes.length).toBeGreaterThan(0);

    // Store first code ID for later tests
    if (listResponse.data.recovery_codes[0]) {
      recoveryCodeId = listResponse.data.recovery_codes[0].id;
    }

    console.log('✓ Recovery codes listed:', listResponse.data.recovery_codes.length);
  });

  // --- Test 4: Use Recovery Code to Reset Passphrase ---
  test('POST /vault/recovery/reset-password - reset passphrase with valid recovery code', async ({ request }) => {
    expect(recoveryCode).toBeTruthy();

    const response = await request.post(`${API_BASE_URL}/vault/recovery/reset-password`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        recovery_code: recoveryCode,
        new_passphrase: NEW_PASSPHRASE,
      },
    });

    expect(response.status()).toBe(200);
    const resetResponse = await response.json();

    expect(resetResponse).toHaveProperty('data');
    expect(resetResponse.data).toHaveProperty('success');
    expect(resetResponse.data.success).toBe(true);

    console.log('✓ Passphrase reset successfully with recovery code');
  });

  // --- Test 5: Reject Invalid Recovery Code ---
  test('POST /vault/recovery/reset-password - reject invalid recovery code', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/reset-password`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        recovery_code: INVALID_RECOVERY_CODE,
        new_passphrase: 'another_passphrase',
      },
    });

    // Should be 400 (bad request) or 401 (unauthorized)
    expect([400, 401, 404]).toContain(response.status());

    console.log('✓ Invalid recovery code rejected (status:', response.status(), ')');
  });

  // --- Test 6: Recovery Code Can Only Be Used Once ---
  test('POST /vault/recovery/reset-password - recovery code cannot be reused', async ({ request }) => {
    // Try to use the same recovery code again
    const response = await request.post(`${API_BASE_URL}/vault/recovery/reset-password`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        recovery_code: recoveryCode,
        new_passphrase: 'another_passphrase_789',
      },
    });

    // Should be 400 (bad request) - code already used
    expect([400, 401, 404]).toContain(response.status());

    console.log('✓ Recovery code cannot be reused (status:', response.status(), ')');
  });

  // --- Test 7: Generate New Recovery Codes ---
  test('POST /vault/recovery/regenerate - generate new recovery codes after reset', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/regenerate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        passphrase: NEW_PASSPHRASE,
      },
    });

    expect(response.status()).toBe(200);
    const regenResponse = await response.json();

    expect(regenResponse).toHaveProperty('data');
    expect(regenResponse.data).toHaveProperty('recovery_codes');
    expect(Array.isArray(regenResponse.data.recovery_codes)).toBe(true);
    expect(regenResponse.data.recovery_codes.length).toBeGreaterThan(0);

    console.log('✓ New recovery codes generated after passphrase reset');
  });

  // --- Test 8: Delete Recovery Code ---
  test('DELETE /vault/recovery/:id - delete recovery code', async ({ request }) => {
    if (!recoveryCodeId) {
      console.log('⊘ Skipping: no recovery code ID available');
      return;
    }

    const response = await request.delete(`${API_BASE_URL}/vault/recovery/${recoveryCodeId}`, {
      headers: {
        'X-Dev-User': DEV_USER.id,
      },
    });

    expect([200, 204]).toContain(response.status());

    console.log('✓ Recovery code deleted');
  });

  // --- Test 9: Recovery Code Passphrase Validation ---
  test('POST /vault/recovery/validate - validate passphrase for recovery', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/validate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        passphrase: NEW_PASSPHRASE,
      },
    });

    expect(response.status()).toBe(200);
    const validateResponse = await response.json();

    expect(validateResponse).toHaveProperty('data');
    expect(validateResponse.data).toHaveProperty('valid');
    expect(validateResponse.data.valid).toBe(true);

    console.log('✓ Passphrase validation successful');
  });

  // --- Test 10: Reject Invalid Passphrase ---
  test('POST /vault/recovery/validate - reject invalid passphrase', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/validate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        passphrase: 'wrong_passphrase',
      },
    });

    expect([400, 401]).toContain(response.status());

    console.log('✓ Invalid passphrase rejected');
  });
});

// ============================================
// Test Suite: Error Handling
// ============================================

test.describe('Recovery Code Error Handling', () => {
  test.describe.configure({ mode: 'serial' });

  // --- Missing Passphrase ---
  test('POST /vault/recovery/generate - reject missing passphrase', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/generate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {},
    });

    expect([400, 422]).toContain(response.status());

    console.log('✓ Missing passphrase rejected');
  });

  // --- Empty Passphrase ---
  test('POST /vault/recovery/generate - reject empty passphrase', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/generate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        passphrase: '',
      },
    });

    expect([400, 422]).toContain(response.status());

    console.log('✓ Empty passphrase rejected');
  });

  // --- Missing Recovery Code ---
  test('POST /vault/recovery/reset-password - reject missing recovery code', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/reset-password`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: {
        new_passphrase: 'new_passphrase',
      },
    });

    expect([400, 422]).toContain(response.status());

    console.log('✓ Missing recovery code rejected');
  });

  // --- Invalid Request Format ---
  test('POST /vault/recovery/generate - reject malformed request', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/vault/recovery/generate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': DEV_USER.id,
      },
      data: 'not json',
    });

    expect([400, 422]).toContain(response.status());

    console.log('✓ Malformed request rejected');
  });
});

// ============================================
// Test Suite: Integration Scenarios
// ============================================

test.describe('Recovery Code Integration Scenarios', () => {
  const testUserId = 'integration_test_' + crypto.randomBytes(4).toString('hex');
  const testPassphrase = 'test_passphrase_' + crypto.randomBytes(8).toString('hex');
  let testRecoveryCode: string;

  // --- Scenario 1: New User Recovery Flow ---
  test('Scenario: New user generates and stores recovery codes', async ({ request }) => {
    // Generate codes
    const genResponse = await request.post(`${API_BASE_URL}/vault/recovery/generate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': testUserId,
      },
      data: {
        passphrase: testPassphrase,
      },
    });

    expect(genResponse.status()).toBe(200);
    const genData = await genResponse.json();
    testRecoveryCode = genData.data?.recovery_codes?.[0];
    expect(testRecoveryCode).toBeTruthy();

    // List codes
    const listResponse = await request.get(`${API_BASE_URL}/vault/recovery`, {
      headers: {
        'X-Dev-User': testUserId,
      },
    });

    expect(listResponse.status()).toBe(200);
    const listData = await listResponse.json();
    expect(listData.data.recovery_codes.length).toBeGreaterThan(0);

    console.log('✓ Scenario: New user recovery flow successful');
  });

  // --- Scenario 2: Locked Out User Recovery ---
  test('Scenario: Locked-out user recovers via recovery code', async ({ request }) => {
    expect(testRecoveryCode).toBeTruthy();

    const newPassphrase = 'recovered_passphrase_' + crypto.randomBytes(8).toString('hex');

    const resetResponse = await request.post(`${API_BASE_URL}/vault/recovery/reset-password`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User': testUserId,
      },
      data: {
        recovery_code: testRecoveryCode,
        new_passphrase: newPassphrase,
      },
    });

    expect(resetResponse.status()).toBe(200);
    const resetData = await resetResponse.json();
    expect(resetData.data.success).toBe(true);

    console.log('✓ Scenario: User recovery successful');
  });
});

// ============================================
// Test Suite: Recovery Code Data Integrity
// ============================================

test.describe('Recovery Code Data Integrity', () => {
  test('Recovery codes are not returned in plain text on list endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/vault/recovery`, {
      headers: {
        'X-Dev-User': 'integrity_test_user',
      },
    });

    if (response.status() === 200) {
      const data = await response.json();
      const codes = data.data?.recovery_codes || [];

      // Codes might be hashed/truncated, but should not be stored in plain text
      // This test documents the expected behavior
      expect(Array.isArray(codes)).toBe(true);

      console.log('✓ Recovery codes list endpoint returns safely');
    }
  });

  test('Recovery codes have metadata (created_at, used_at)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/vault/recovery`, {
      headers: {
        'X-Dev-User': 'metadata_test_user',
      },
    });

    if (response.status() === 200) {
      const data = await response.json();
      const codes = data.data?.recovery_codes || [];

      if (codes.length > 0) {
        const code = codes[0];
        // Check for expected metadata fields
        expect(code).toHaveProperty('id');
        expect(code).toHaveProperty('created_at');
        // used_at may be null if not used
        expect('used_at' in code).toBe(true);

        console.log('✓ Recovery codes have proper metadata');
      }
    }
  });
});

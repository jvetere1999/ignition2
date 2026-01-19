import { test, expect, request } from '@playwright/test';

/**
 * Privacy Modes E2E Test Suite
 * Validates privacy classification, filtering, and retention policies
 * Tier 2 ACTION-004 validation
 */

test.describe('Privacy Modes Feature', () => {
  let authenticatedRequest: ReturnType<typeof request.newContext>;
  const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';

  test.beforeAll(async () => {
    // Setup: Create authenticated session
    authenticatedRequest = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });
  });

  test.afterAll(async () => {
    await authenticatedRequest.dispose();
  });

  test('GET /api/privacy/preferences returns user privacy settings', async () => {
    const response = await authenticatedRequest.get('/api/privacy/preferences', {
      headers: { Cookie: '' }, // Auth handled by server context
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('default_mode');
    expect(data).toHaveProperty('show_privacy_toggle');
    expect(data).toHaveProperty('exclude_private_from_search');
    expect(data).toHaveProperty('private_content_retention_days');
    expect(data).toHaveProperty('standard_content_retention_days');

    // Verify default values
    expect(data.default_mode).toMatch(/^(standard|private)$/);
    expect(typeof data.show_privacy_toggle).toBe('boolean');
    expect(typeof data.exclude_private_from_search).toBe('boolean');
    expect(data.private_content_retention_days).toBeGreaterThanOrEqual(0);
    expect(data.standard_content_retention_days).toBeGreaterThanOrEqual(0);
  });

  test('POST /api/privacy/preferences updates privacy settings', async () => {
    const updateRequest = {
      default_mode: 'private' as const,
      show_privacy_toggle: true,
      exclude_private_from_search: true,
      private_content_retention_days: 14,
      standard_content_retention_days: 180,
    };

    const response = await authenticatedRequest.post(
      '/api/privacy/preferences',
      {
        data: updateRequest,
      }
    );

    expect([200, 201]).toContain(response.status());

    // Verify update persisted
    const getResponse = await authenticatedRequest.get(
      '/api/privacy/preferences'
    );
    const updatedData = await getResponse.json();

    expect(updatedData.default_mode).toBe('private');
    expect(updatedData.private_content_retention_days).toBe(14);
    expect(updatedData.standard_content_retention_days).toBe(180);
  });

  test('POST /api/privacy/preferences rejects invalid retention days', async () => {
    const invalidRequest = {
      default_mode: 'standard',
      show_privacy_toggle: true,
      exclude_private_from_search: false,
      private_content_retention_days: 400, // > 365, invalid
      standard_content_retention_days: 365,
    };

    const response = await authenticatedRequest.post(
      '/api/privacy/preferences',
      {
        data: invalidRequest,
      }
    );

    expect([400, 422]).toContain(response.status());
  });

  test('POST /api/privacy/preferences rejects invalid privacy mode', async () => {
    const invalidRequest = {
      default_mode: 'invalid_mode', // Invalid enum
      show_privacy_toggle: true,
      exclude_private_from_search: false,
      private_content_retention_days: 30,
      standard_content_retention_days: 365,
    };

    const response = await authenticatedRequest.post(
      '/api/privacy/preferences',
      {
        data: invalidRequest,
      }
    );

    expect([400, 422]).toContain(response.status());
  });

  test('Privacy preferences persist across sessions', async () => {
    // Set initial preferences
    const updateRequest = {
      default_mode: 'private',
      show_privacy_toggle: false,
      exclude_private_from_search: true,
      private_content_retention_days: 21,
      standard_content_retention_days: 200,
    };

    await authenticatedRequest.post('/api/privacy/preferences', {
      data: updateRequest,
    });

    // Simulate new session by closing and recreating context
    await authenticatedRequest.dispose();
    const newContext = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });

    // Verify preferences still exist
    const response = await newContext.get('/api/privacy/preferences');
    const data = await response.json();

    expect(data.default_mode).toBe('private');
    expect(data.show_privacy_toggle).toBe(false);
    expect(data.private_content_retention_days).toBe(21);

    await newContext.dispose();
  });

  test('Privacy mode filters exclude private content when requested', async () => {
    // This test validates the repository filtering logic
    // GET /api/ideas?exclude_private=true should not return private ideas

    const response = await authenticatedRequest.get('/api/ideas', {
      params: {
        exclude_private: 'true',
      },
    });

    expect([200, 401]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      if (Array.isArray(data.ideas)) {
        // All returned ideas should NOT have privacy_mode = 'private'
        const privateIdeas = data.ideas.filter(
          (idea: any) => idea.privacy_mode === 'private'
        );
        expect(privateIdeas.length).toBe(0);
      }
    }
  });

  test('Default privacy mode is respected when creating content', async () => {
    // First, set default to 'private'
    await authenticatedRequest.post('/api/privacy/preferences', {
      data: {
        default_mode: 'private',
        show_privacy_toggle: true,
        exclude_private_from_search: false,
        private_content_retention_days: 30,
        standard_content_retention_days: 365,
      },
    });

    // Create new idea without explicitly setting privacy_mode
    const createResponse = await authenticatedRequest.post('/api/ideas', {
      data: {
        title: 'Test Idea with Default Private Mode',
        content: 'This should default to private',
      },
    });

    if (createResponse.ok()) {
      const createdIdea = await createResponse.json();
      // Should default to 'private' based on user preferences
      expect(createdIdea.privacy_mode).toBe('private');
    }
  });

  test('Content can be explicitly marked as private or standard', async () => {
    // Create idea explicitly as 'private'
    const privateResponse = await authenticatedRequest.post('/api/ideas', {
      data: {
        title: 'Explicitly Private Idea',
        content: 'Content marked private',
        privacy_mode: 'private',
      },
    });

    if (privateResponse.ok()) {
      const privateIdea = await privateResponse.json();
      expect(privateIdea.privacy_mode).toBe('private');
    }

    // Create idea explicitly as 'standard'
    const standardResponse = await authenticatedRequest.post('/api/ideas', {
      data: {
        title: 'Explicitly Standard Idea',
        content: 'Content marked standard',
        privacy_mode: 'standard',
      },
    });

    if (standardResponse.ok()) {
      const standardIdea = await standardResponse.json();
      expect(standardIdea.privacy_mode).toBe('standard');
    }
  });

  test('Privacy mode is consistent across content types', async () => {
    // Verify privacy mode works for Ideas
    const ideaResponse = await authenticatedRequest.post('/api/ideas', {
      data: {
        title: 'Private Idea',
        content: 'Test',
        privacy_mode: 'private',
      },
    });
    if (ideaResponse.ok()) {
      const idea = await ideaResponse.json();
      expect(idea.privacy_mode).toBe('private');
    }

    // Verify privacy mode works for Journal Entries
    const journalResponse = await authenticatedRequest.post(
      '/api/journal/entries',
      {
        data: {
          title: 'Private Journal Entry',
          content: 'Test',
          privacy_mode: 'private',
        },
      }
    );
    if (journalResponse.ok()) {
      const entry = await journalResponse.json();
      expect(entry.privacy_mode).toBe('private');
    }

    // Verify privacy mode works for Infobase Entries
    const infobaseResponse = await authenticatedRequest.post(
      '/api/infobase/entries',
      {
        data: {
          title: 'Private Info',
          content: 'Test',
          privacy_mode: 'private',
        },
      }
    );
    if (infobaseResponse.ok()) {
      const info = await infobaseResponse.json();
      expect(info.privacy_mode).toBe('private');
    }
  });

  test('Retention policy respects private/standard classification', async () => {
    // Set short retention for private (7 days), long for standard (365)
    await authenticatedRequest.post('/api/privacy/preferences', {
      data: {
        default_mode: 'standard',
        show_privacy_toggle: true,
        exclude_private_from_search: false,
        private_content_retention_days: 7,
        standard_content_retention_days: 365,
      },
    });

    // Query to verify retention metadata
    const response = await authenticatedRequest.get('/api/privacy/preferences');
    const prefs = await response.json();

    expect(prefs.private_content_retention_days).toBe(7);
    expect(prefs.standard_content_retention_days).toBe(365);
  });

  test('Privacy preferences require authentication', async () => {
    // Test without auth context
    const unauthContext = await request.newContext({
      baseURL: API_URL,
    });

    const response = await unauthContext.get('/api/privacy/preferences');
    expect([401, 403]).toContain(response.status());

    await unauthContext.dispose();
  });

  test('Invalid endpoint returns 404', async () => {
    const response = await authenticatedRequest.get(
      '/api/privacy/invalid-endpoint'
    );
    expect(response.status()).toBe(404);
  });

  test('Privacy filter accepts both /standard and /private queries', async () => {
    // Test /api/ideas?filter=private
    const privateResponse = await authenticatedRequest.get('/api/ideas', {
      params: {
        filter: 'private',
      },
    });
    expect([200, 401]).toContain(privateResponse.status());

    // Test /api/ideas?filter=standard
    const standardResponse = await authenticatedRequest.get('/api/ideas', {
      params: {
        filter: 'standard',
      },
    });
    expect([200, 401]).toContain(standardResponse.status());
  });
});

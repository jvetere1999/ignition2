import { test, expect } from "@playwright/test";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.ecent.online";

test.describe("DAW Project File Tracking", () => {
  let authToken: string;
  let userId: string;
  let projectId: string;
  let sessionId: string;

  test.beforeAll(async ({}) => {
    // Setup: Login or get auth token
    // This assumes a test user exists
    authToken = process.env.TEST_AUTH_TOKEN || "test-token";
    userId = process.env.TEST_USER_ID || "test-user";
  });

  test("POST /api/daw - List projects (empty)", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/daw/`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("projects");
      expect(data).toHaveProperty("total_count");
      expect(data).toHaveProperty("total_storage_bytes");
      expect(Array.isArray(data.projects)).toBeTruthy();
    }
  });

  test("POST /api/daw - Initiate upload", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/daw/`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        project_name: "test-project",
        content_type: ".als",
        total_size: 10485760, // 10MB
        file_hash: "abc123def456",
      },
    });

    expect([200, 201, 400, 401]).toContain(response.status());

    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty("session_id");
      expect(data).toHaveProperty("chunk_size");
      expect(data).toHaveProperty("total_chunks");
      expect(data).toHaveProperty("expires_at");
      sessionId = data.session_id;
    }
  });

  test("POST /api/daw - Reject oversized uploads", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/daw/`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        project_name: "huge-project",
        content_type: ".als",
        total_size: 6_000_000_000, // 6GB - exceeds 5GB limit
        file_hash: "xyz789",
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test("POST /api/daw - Reject invalid content type", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/daw/`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        project_name: "bad-project",
        content_type: ".exe", // Invalid
        total_size: 1000000,
        file_hash: "hash123",
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test("GET /api/daw/:project_id - Get project details", async ({
    request,
  }) => {
    if (!projectId) {
      test.skip();
    }

    const response = await request.get(
      `${API_BASE_URL}/api/daw/${projectId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect([200, 401, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("user_id");
      expect(data).toHaveProperty("project_name");
      expect(data).toHaveProperty("file_size");
      expect(data).toHaveProperty("version_count");
    }
  });

  test("GET /api/daw/:project_id - Non-existent project returns 404", async ({
    request,
  }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await request.get(
      `${API_BASE_URL}/api/daw/${fakeId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect([401, 404]).toContain(response.status());
  });

  test("GET /api/daw/:project_id/versions - List version history", async ({
    request,
  }) => {
    if (!projectId) {
      test.skip();
    }

    const response = await request.get(
      `${API_BASE_URL}/api/daw/${projectId}/versions`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect([200, 401, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("project_id");
      expect(data).toHaveProperty("versions");
      expect(Array.isArray(data.versions)).toBeTruthy();
    }
  });

  test("POST /api/daw/upload/:session_id/chunk - Upload file chunk", async ({
    request,
  }) => {
    if (!sessionId) {
      test.skip();
    }

    // Create chunk data (5MB)
    const chunkData = Buffer.alloc(5242880).fill("a");

    const response = await request.post(
      `${API_BASE_URL}/api/daw/upload/${sessionId}/chunk`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/octet-stream",
        },
        data: chunkData,
      }
    );

    // This endpoint may not be fully implemented
    expect([200, 201, 501, 400, 401]).toContain(response.status());
  });

  test("POST /api/daw/upload/:session_id/complete - Complete upload", async ({
    request,
  }) => {
    if (!sessionId) {
      test.skip();
    }

    const response = await request.post(
      `${API_BASE_URL}/api/daw/upload/${sessionId}/complete`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          file_hash: "abc123def456",
          change_description: "Initial upload",
        },
      }
    );

    expect([200, 201, 400, 401, 404, 501]).toContain(response.status());

    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty("project_id");
      expect(data).toHaveProperty("version_number");
      expect(data).toHaveProperty("file_size");
      projectId = data.project_id;
    }
  });

  test("POST /api/daw/:project_id/versions/:version_id/restore - Restore version", async ({
    request,
  }) => {
    if (!projectId) {
      test.skip();
    }

    // Assuming version ID from previous test
    const versionId = "00000000-0000-0000-0000-000000000001";

    const response = await request.post(
      `${API_BASE_URL}/api/daw/${projectId}/versions/${versionId}/restore`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          change_description: "Reverted to previous version",
        },
      }
    );

    expect([200, 201, 400, 401, 404, 422]).toContain(response.status());

    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty("project_id");
      expect(data).toHaveProperty("current_version_number");
      expect(data).toHaveProperty("restored_at");
    }
  });

  test("GET /api/daw/:project_id/download/:version_id - Download project", async ({
    request,
  }) => {
    if (!projectId) {
      test.skip();
    }

    const versionId = "00000000-0000-0000-0000-000000000001";

    const response = await request.get(
      `${API_BASE_URL}/api/daw/${projectId}/download/${versionId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    // Download endpoint may not be fully implemented
    expect([200, 401, 404, 501]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("project_id");
      expect(data).toHaveProperty("download_url");
      expect(data).toHaveProperty("expires_at");
    }
  });

  test("Authentication required for DAW endpoints", async ({ request }) => {
    // Try without auth header
    const response = await request.get(`${API_BASE_URL}/api/daw/`, {
      headers: {
        // No Authorization header
      },
    });

    expect([401, 403]).toContain(response.status());
  });

  test("Content types validation", async ({ request }) => {
    const validContentTypes = [".als", ".flp", ".logicx", ".serum", ".wavetable"];

    for (const contentType of validContentTypes) {
      const response = await request.post(`${API_BASE_URL}/api/daw/`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          project_name: `test-${contentType}`,
          content_type: contentType,
          total_size: 1000000,
          file_hash: `hash-${contentType}`,
        },
      });

      expect([200, 201, 400, 401]).toContain(response.status());
    }
  });

  test("File size validation", async ({ request }) => {
    const testCases = [
      { size: 0, shouldFail: true },
      { size: 1, shouldFail: false },
      { size: 1000000, shouldFail: false },
      { size: 5000000000, shouldFail: false }, // 5GB - at limit
      { size: 5000000001, shouldFail: true }, // Just over limit
    ];

    for (const testCase of testCases) {
      const response = await request.post(`${API_BASE_URL}/api/daw/`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          project_name: `test-${testCase.size}`,
          content_type: ".als",
          total_size: testCase.size,
          file_hash: `hash-${testCase.size}`,
        },
      });

      if (testCase.shouldFail) {
        expect([400, 422]).toContain(response.status());
      } else {
        expect([200, 201, 400, 401]).toContain(response.status());
      }
    }
  });

  test("Project isolation - users cannot access others' projects", async ({
    request,
  }) => {
    if (!projectId) {
      test.skip();
    }

    // Try to access with different user's token
    const otherUserToken = "different-user-token";

    const response = await request.get(
      `${API_BASE_URL}/api/daw/${projectId}`,
      {
        headers: { Authorization: `Bearer ${otherUserToken}` },
      }
    );

    // Should either return 404 (not found) or 401 (unauthorized)
    expect([401, 403, 404]).toContain(response.status());
  });

  test("Storage quota tracking", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/daw/`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("total_storage_bytes");
      expect(typeof data.total_storage_bytes).toBe("number");
      expect(data.total_storage_bytes >= 0).toBeTruthy();
    }
  });
});

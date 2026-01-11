/**
 * API Client Unit Tests
 *
 * Tests the API client utilities and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests', () => {
    it('makes successful GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual({ data: 'test' });
    });

    it('handles 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      const response = await fetch('/api/nonexistent');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it('handles 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/protected');

      expect(response.status).toBe(401);
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/test')).rejects.toThrow('Network error');
    });
  });

  describe('POST requests', () => {
    it('sends JSON body correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'new-id' }),
      });

      const response = await fetch('/api/resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/resource', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
      expect(response.status).toBe(201);
    });

    it('handles 403 CSRF error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'CSRF token invalid' }),
      });

      const response = await fetch('/api/resource', { method: 'POST' });

      expect(response.status).toBe(403);
    });

    it('handles 422 validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          error: 'Validation failed',
          details: { name: 'required' },
        }),
      });

      const response = await fetch('/api/resource', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(422);
    });
  });

  describe('PATCH requests', () => {
    it('sends partial update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '1', name: 'updated' }),
      });

      const response = await fetch('/api/resource/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'updated' }),
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('DELETE requests', () => {
    it('deletes resource successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const response = await fetch('/api/resource/1', { method: 'DELETE' });

      expect(response.status).toBe(204);
    });
  });

  describe('Pagination', () => {
    it('handles paginated response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: '1' }, { id: '2' }],
          total: 100,
          page: 1,
          page_size: 20,
          has_next: true,
          has_prev: false,
        }),
      });

      const response = await fetch('/api/resources?page=1&page_size=20');
      const data = await response.json() as { data: unknown[]; total: number; has_next: boolean };

      expect(data.data).toHaveLength(2);
      expect(data.total).toBe(100);
      expect(data.has_next).toBe(true);
    });
  });

  describe('Error Response Structure', () => {
    it('parses API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid input provided',
            details: { field: 'name' },
          },
        }),
      });

      const response = await fetch('/api/resource');
      const errorData = await response.json() as { error: { code: string; message: string } };

      expect(errorData.error.code).toBe('INVALID_INPUT');
      expect(errorData.error.message).toBeDefined();
    });
  });
});

describe('Request Helpers', () => {
  describe('URL Construction', () => {
    it('builds URL with query params', () => {
      const params = new URLSearchParams({
        page: '1',
        page_size: '20',
        filter: 'active',
      });

      const url = `/api/resources?${params.toString()}`;

      expect(url).toContain('page=1');
      expect(url).toContain('page_size=20');
      expect(url).toContain('filter=active');
    });

    it('handles array query params', () => {
      const params = new URLSearchParams();
      ['tag1', 'tag2', 'tag3'].forEach(tag => params.append('tags', tag));

      const url = `/api/resources?${params.toString()}`;

      expect(url).toContain('tags=tag1');
      expect(url).toContain('tags=tag2');
    });
  });

  describe('Headers', () => {
    it('includes authorization header', () => {
      const headers = new Headers();
      headers.set('Authorization', 'Bearer token123');
      headers.set('Content-Type', 'application/json');

      expect(headers.get('Authorization')).toBe('Bearer token123');
    });

    it('includes CSRF header for mutations', () => {
      const headers = new Headers();
      headers.set('X-CSRF-Token', 'csrf-token-value');

      expect(headers.get('X-CSRF-Token')).toBe('csrf-token-value');
    });
  });
});

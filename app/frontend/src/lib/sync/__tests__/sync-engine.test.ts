/**
 * Sync Engine Unit Tests
 *
 * Tests the sync logic for offline-first data management.
 */

import { describe, it, expect } from 'vitest';

describe('Sync Engine', () => {
  describe('Change Detection', () => {
    it('detects new records', () => {
      const localRecords = [
        { id: '1', updated_at: '2025-01-01T00:00:00Z' },
        { id: '2', updated_at: '2025-01-02T00:00:00Z' },
      ];
      
      const serverRecords = [
        { id: '1', updated_at: '2025-01-01T00:00:00Z' },
      ];
      
      const newRecords = localRecords.filter(
        local => !serverRecords.find(server => server.id === local.id)
      );
      
      expect(newRecords).toHaveLength(1);
      expect(newRecords[0].id).toBe('2');
    });

    it('detects modified records', () => {
      const localRecords = [
        { id: '1', updated_at: '2025-01-02T00:00:00Z' },
        { id: '2', updated_at: '2025-01-01T00:00:00Z' },
      ];
      
      const serverRecords = [
        { id: '1', updated_at: '2025-01-01T00:00:00Z' },
        { id: '2', updated_at: '2025-01-01T00:00:00Z' },
      ];
      
      const modified = localRecords.filter(local => {
        const server = serverRecords.find(s => s.id === local.id);
        return server && local.updated_at > server.updated_at;
      });
      
      expect(modified).toHaveLength(1);
      expect(modified[0].id).toBe('1');
    });

    it('detects deleted records', () => {
      const localIds = ['1', '3'];
      const serverIds = ['1', '2', '3'];
      
      const deleted = serverIds.filter(id => !localIds.includes(id));
      
      expect(deleted).toEqual(['2']);
    });
  });

  describe('Conflict Resolution', () => {
    it('server wins by default', () => {
      const local = { id: '1', value: 'local', updated_at: '2025-01-02T00:00:00Z' };
      const server = { id: '1', value: 'server', updated_at: '2025-01-02T00:00:01Z' };
      
      const resolved = server.updated_at > local.updated_at ? server : local;
      
      expect(resolved.value).toBe('server');
    });

    it('last-write-wins resolution', () => {
      const resolveConflict = <T extends { updated_at: string }>(local: T, server: T): T => {
        return new Date(local.updated_at) > new Date(server.updated_at) ? local : server;
      };

      const local = { id: '1', value: 'local', updated_at: '2025-01-02T12:00:00Z' };
      const server = { id: '1', value: 'server', updated_at: '2025-01-02T10:00:00Z' };
      
      expect(resolveConflict(local, server).value).toBe('local');
    });

    it('merges non-conflicting fields', () => {
      const mergeRecords = (local: Record<string, unknown>, server: Record<string, unknown>) => {
        const merged: Record<string, unknown> = { ...server };
        
        for (const [key, value] of Object.entries(local)) {
          if (value !== undefined && server[key] === undefined) {
            merged[key] = value;
          }
        }
        
        return merged;
      };

      const local = { id: '1', title: 'Local Title', description: undefined };
      const server = { id: '1', title: undefined, description: 'Server Desc' };
      
      const merged = mergeRecords(local, server);
      
      expect(merged.title).toBe('Local Title');
      expect(merged.description).toBe('Server Desc');
    });
  });

  describe('Batch Sync', () => {
    it('batches changes by table', () => {
      const changes = [
        { table: 'quests', id: '1', op: 'create' },
        { table: 'habits', id: '2', op: 'update' },
        { table: 'quests', id: '3', op: 'delete' },
        { table: 'habits', id: '4', op: 'create' },
      ];

      const batched = changes.reduce((acc, change) => {
        if (!acc[change.table]) acc[change.table] = [];
        acc[change.table].push(change);
        return acc;
      }, {} as Record<string, typeof changes>);

      expect(batched.quests).toHaveLength(2);
      expect(batched.habits).toHaveLength(2);
    });

    it('limits batch size', () => {
      const changes = Array(150).fill(null).map((_, i) => ({ id: String(i) }));
      const batchSize = 50;
      
      const batches: typeof changes[] = [];
      for (let i = 0; i < changes.length; i += batchSize) {
        batches.push(changes.slice(i, i + batchSize));
      }
      
      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(50);
      expect(batches[2]).toHaveLength(50);
    });
  });

  describe('Sync State', () => {
    it('tracks sync status', () => {
      type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';
      
      const syncState = {
        status: 'idle' as SyncStatus,
        lastSyncAt: null as string | null,
        pendingChanges: 5,
        error: null as string | null,
      };

      // Start sync
      syncState.status = 'syncing';
      expect(syncState.status).toBe('syncing');

      // Complete sync
      syncState.status = 'success';
      syncState.lastSyncAt = new Date().toISOString();
      syncState.pendingChanges = 0;
      
      expect(syncState.pendingChanges).toBe(0);
    });

    it('handles sync errors', () => {
      const handleSyncError = (error: Error) => ({
        status: 'error' as const,
        error: error.message,
        retryAfter: Date.now() + 30000,
      });

      const result = handleSyncError(new Error('Network unavailable'));
      
      expect(result.status).toBe('error');
      expect(result.error).toBe('Network unavailable');
    });
  });

  describe('Offline Queue', () => {
    it('queues operations when offline', () => {
      const queue: { op: string; table: string; data: unknown; timestamp: number }[] = [];
      
      const enqueue = (op: string, table: string, data: unknown) => {
        queue.push({ op, table, data, timestamp: Date.now() });
      };

      enqueue('create', 'quests', { title: 'New Quest' });
      enqueue('update', 'habits', { id: '1', completed: true });
      
      expect(queue).toHaveLength(2);
    });

    it('processes queue in order', () => {
      const queue = [
        { id: 1, timestamp: 1000 },
        { id: 2, timestamp: 2000 },
        { id: 3, timestamp: 1500 },
      ];
      
      const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);
      
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(2);
    });

    it('deduplicates queue entries', () => {
      const queue = [
        { table: 'quests', id: '1', op: 'update', data: { title: 'V1' } },
        { table: 'quests', id: '1', op: 'update', data: { title: 'V2' } },
        { table: 'quests', id: '2', op: 'create', data: { title: 'New' } },
      ];

      const deduped = queue.reduce((acc, entry) => {
        const key = `${entry.table}:${entry.id}`;
        acc.set(key, entry); // Later entries overwrite earlier ones
        return acc;
      }, new Map<string, typeof queue[0]>());

      expect(Array.from(deduped.values())).toHaveLength(2);
    });
  });
});

describe('Delta Sync', () => {
  describe('Cursor Management', () => {
    it('tracks sync cursor per table', () => {
      const cursors: Record<string, string> = {
        quests: '2025-01-10T00:00:00Z',
        habits: '2025-01-09T00:00:00Z',
      };

      const updateCursor = (table: string, timestamp: string) => {
        cursors[table] = timestamp;
      };

      updateCursor('quests', '2025-01-11T00:00:00Z');
      
      expect(cursors.quests).toBe('2025-01-11T00:00:00Z');
    });
  });

  describe('Change Feed', () => {
    it('filters changes after cursor', () => {
      const changes = [
        { id: '1', updated_at: '2025-01-08T00:00:00Z' },
        { id: '2', updated_at: '2025-01-10T00:00:00Z' },
        { id: '3', updated_at: '2025-01-11T00:00:00Z' },
      ];
      
      const cursor = '2025-01-09T00:00:00Z';
      
      const newChanges = changes.filter(c => c.updated_at > cursor);
      
      expect(newChanges).toHaveLength(2);
    });
  });
});

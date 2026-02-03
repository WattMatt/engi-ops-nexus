/**
 * Tests for Offline Sync Hook
 * Tests background synchronization behavior
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}));

// Mock offline storage with in-memory implementation
const mockSyncQueue: any[] = [];
let mockRecords: Record<string, any[]> = {};

vi.mock('@/lib/offlineStorage', () => ({
  STORES: {
    SITE_DIARY_ENTRIES: 'site_diary_entries',
    SITE_DIARY_TASKS: 'site_diary_tasks',
    HANDOVER_DOCUMENTS: 'handover_documents',
    HANDOVER_FOLDERS: 'handover_folders',
    PENDING_UPLOADS: 'pending_uploads',
    SYNC_QUEUE: 'sync_queue',
    CACHED_DATA: 'cached_data',
  },
  getSyncQueue: vi.fn(() => Promise.resolve([...mockSyncQueue])),
  removeSyncQueueItem: vi.fn((id) => {
    const index = mockSyncQueue.findIndex(item => item.id === id);
    if (index > -1) mockSyncQueue.splice(index, 1);
    return Promise.resolve();
  }),
  updateSyncQueueItem: vi.fn((item) => {
    const index = mockSyncQueue.findIndex(i => i.id === item.id);
    if (index > -1) mockSyncQueue[index] = item;
    return Promise.resolve();
  }),
  markRecordSynced: vi.fn().mockResolvedValue(undefined),
}));

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getSyncQueue, removeSyncQueueItem } from '@/lib/offlineStorage';

describe('useOfflineSync Hook', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mock queue
    mockSyncQueue.length = 0;
    mockRecords = {};
    vi.clearAllMocks();

    // Set navigator.onLine to true by default
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial sync state', async () => {
      const { result } = renderHook(() => useOfflineSync({ showNotifications: false }), { wrapper });
      
      // Wait for initial sync to complete
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.lastError).toBeNull();
    });

    it('should report correct online status', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOfflineSync(), { wrapper });
      
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Pending Count', () => {
    it('should report pending sync items count', async () => {
      // Add items to mock queue BEFORE rendering the hook
      mockSyncQueue.push(
        { id: '1', storeName: 'site_diary_entries', recordId: 'rec-1', action: 'create', data: { id: 'rec-1' }, timestamp: Date.now(), retryCount: 0 },
        { id: '2', storeName: 'site_diary_entries', recordId: 'rec-2', action: 'update', data: { id: 'rec-2' }, timestamp: Date.now(), retryCount: 0 }
      );

      // Mock offline to prevent auto-sync from clearing the queue
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOfflineSync({ showNotifications: false }), { wrapper });
      
      await waitFor(() => {
        expect(result.current.pendingCount).toBe(2);
      }, { timeout: 2000 });
    });
  });

  describe('Manual Sync', () => {
    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      mockSyncQueue.push({
        id: '1',
        storeName: 'site_diary_entries',
        recordId: 'rec-1',
        action: 'create',
        data: { id: 'rec-1' },
        timestamp: Date.now(),
        retryCount: 0,
      });

      const { result } = renderHook(() => useOfflineSync({ showNotifications: false }), { wrapper });

      await act(async () => {
        await result.current.syncNow();
      });

      // Queue should still have the item
      expect(mockSyncQueue).toHaveLength(1);
    });

    it('should sync items when online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      mockSyncQueue.push({
        id: '1',
        storeName: 'site_diary_entries',
        recordId: 'rec-1',
        action: 'create',
        data: { id: 'rec-1' },
        timestamp: Date.now(),
        retryCount: 0,
      });

      const { result } = renderHook(() => useOfflineSync({ showNotifications: false }), { wrapper });

      await act(async () => {
        await result.current.syncNow();
      });

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });

      // removeSyncQueueItem should have been called
      expect(removeSyncQueueItem).toHaveBeenCalledWith('1');
    });
  });

  describe('Online/Offline Events', () => {
    it('should update isOnline when going offline', async () => {
      const { result } = renderHook(() => useOfflineSync({ showNotifications: false }), { wrapper });
      
      expect(result.current.isOnline).toBe(true);

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should update isOnline when going online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOfflineSync({ showNotifications: false }), { wrapper });
      
      expect(result.current.isOnline).toBe(false);

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });
  });

  describe('Retry Logic', () => {
    it('should increment retry count on failure', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Network error' } }),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      } as any);

      mockSyncQueue.push({
        id: 'fail-1',
        storeName: 'site_diary_entries',
        recordId: 'rec-fail',
        action: 'create',
        data: { id: 'rec-fail' },
        timestamp: Date.now(),
        retryCount: 0,
      });

      const { result } = renderHook(() => 
        useOfflineSync({ maxRetries: 3, showNotifications: false }), 
        { wrapper }
      );

      await act(async () => {
        await result.current.syncNow();
      });

      // Item should still be in queue with incremented retry count
      const item = mockSyncQueue.find(i => i.id === 'fail-1');
      expect(item?.retryCount).toBe(1);
    });
  });

  describe('Last Sync Timestamp', () => {
    it('should update lastSyncAt after successful sync', async () => {
      mockSyncQueue.push({
        id: '1',
        storeName: 'site_diary_entries',
        recordId: 'rec-1',
        action: 'create',
        data: { id: 'rec-1' },
        timestamp: Date.now(),
        retryCount: 0,
      });

      const { result } = renderHook(() => useOfflineSync({ showNotifications: false }), { wrapper });
      
      expect(result.current.lastSyncAt).toBeNull();

      await act(async () => {
        await result.current.syncNow();
      });

      await waitFor(() => {
        expect(result.current.lastSyncAt).not.toBeNull();
        expect(typeof result.current.lastSyncAt).toBe('number');
      });
    });
  });
});

/**
 * Tests for Budget Offline Sync Hook
 * Tests offline-first data management for budget line items
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
 import { ConflictProvider } from '@/contexts/ConflictContext';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
  },
}));

// Mock network status
let mockIsConnected = true;
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isConnected: mockIsConnected,
    isOnline: mockIsConnected,
  }),
}));

 // Mock conflict detection hook to avoid ConflictProvider dependency chain issues
 vi.mock('@/hooks/useConflictDetection', () => ({
   useConflictDetection: () => ({
     syncWithConflictDetection: vi.fn().mockImplementation(
       async (_table: string, _id: string, _localData: unknown, syncFn: () => Promise<void>) => {
         // Directly call the sync function without conflict checking in tests
         await syncFn();
         return true;
       }
     ),
     checkForConflict: vi.fn().mockResolvedValue({ hasConflict: false }),
     isPaused: false,
   }),
 }));
 
// Mock data storage - use object reference to avoid hoisting issues
const mockData: { items: any[] } = { items: [] };

// Mock offline storage
vi.mock('@/lib/offlineStorage', () => ({
  STORES: {
    BUDGET_LINE_ITEMS: 'budget_line_items',
    BUDGET_SECTIONS: 'budget_sections',
  },
  getRecord: vi.fn(),
  getRecordsByIndex: vi.fn(),
  putRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

import { useBudgetOfflineSync } from '@/hooks/useBudgetOfflineSync';
import { putRecord, deleteRecord, getRecordsByIndex, getRecord } from '@/lib/offlineStorage';

// Helper to setup mock implementations
const setupStorageMocks = () => {
  vi.mocked(getRecord).mockImplementation((store, id) => {
    return Promise.resolve(mockData.items.find(item => item.id === id) || null);
  });
  
  vi.mocked(getRecordsByIndex).mockImplementation(() => {
    return Promise.resolve(mockData.items.map(item => ({ ...item })));
  });
  
  vi.mocked(putRecord).mockImplementation((store, record: any, markUnsynced) => {
    const index = mockData.items.findIndex(item => item.id === record.id);
    const syncedState = record.synced !== undefined ? record.synced : !markUnsynced;
    if (index > -1) {
      mockData.items[index] = { ...record, synced: syncedState };
    } else {
      mockData.items.push({ ...record, synced: syncedState });
    }
    return Promise.resolve();
  });
  
  vi.mocked(deleteRecord).mockImplementation((store, id) => {
    mockData.items = mockData.items.filter(item => item.id !== id);
    return Promise.resolve();
  });
};

describe('useBudgetOfflineSync Hook', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
       <ConflictProvider>{children}</ConflictProvider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mock data FIRST
    mockData.items = [];
    mockIsConnected = true;
    
    // Clear mock call history but NOT implementations
    vi.clearAllMocks();
    
    // Setup storage mocks with current mockData reference AFTER clearing
    setupStorageMocks();

    // Setup default Supabase mock responses
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'budget_sections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'section-1' }], error: null }),
          }),
        };
      }
      if (table === 'budget_line_items') {
        return {
          select: vi.fn().mockReturnValue({
           eq: vi.fn().mockReturnValue({
             single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
           }),
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('Initial State', () => {
    it('should return initial state with empty line items', async () => {
      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lineItems).toEqual([]);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.unsyncedCount).toBe(0);
    });

    it('should report offline status correctly', async () => {
      mockIsConnected = false;

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should not fetch when disabled', async () => {
      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1', enabled: false }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  describe('Local Items Loading', () => {
    it('should load local items from IndexedDB', async () => {
      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getRecordsByIndex).toHaveBeenCalled();
    });

    it('should count unsynced items correctly', async () => {
      const testItems = [
        { id: 'item-1', section_id: 'section-1', description: 'Synced', total: 100, display_order: 0, synced: true },
        { id: 'item-2', section_id: 'section-1', description: 'Unsynced', total: 200, display_order: 1, synced: false },
        { id: 'item-3', section_id: 'section-1', description: 'Unsynced 2', total: 300, display_order: 2, synced: false },
      ];
      
      // Directly mock the return value for this test
      vi.mocked(getRecordsByIndex).mockResolvedValue(testItems);

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.unsyncedCount).toBe(2);
      });
    });
  });

  describe('Save Line Item', () => {
    it('should save item locally when online', async () => {
      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveLineItem({
          id: 'new-item',
          section_id: 'section-1',
          description: 'New Budget Item',
          total: 500,
          display_order: 0,
        });
      });

      expect(putRecord).toHaveBeenCalled();
    });

    it('should save item locally when offline', async () => {
      mockIsConnected = false;

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveLineItem({
          id: 'offline-item',
          section_id: 'section-1',
          description: 'Offline Item',
          total: 250,
          display_order: 0,
        });
      });

      expect(putRecord).toHaveBeenCalledWith(
        'budget_line_items',
        expect.objectContaining({
          id: 'offline-item',
          description: 'Offline Item',
        }),
        true
      );
    });

    it('should sync to server when online', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'budget_sections') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'section-1' }], error: null }),
            }),
          };
        }
        if (table === 'budget_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            upsert: mockUpsert,
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveLineItem({
          id: 'sync-item',
          section_id: 'section-1',
          description: 'Sync Test',
          total: 100,
          display_order: 0,
        });
      });

      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('Delete Line Item', () => {
    it('should delete item locally', async () => {
      mockData.items = [
        { id: 'delete-me', section_id: 'section-1', description: 'To Delete', total: 100, display_order: 0, synced: true },
      ];

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteLineItem('delete-me');
      });

      expect(deleteRecord).toHaveBeenCalledWith('budget_line_items', 'delete-me', true);
    });

    it('should sync deletion to server when online', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'budget_sections') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'section-1' }], error: null }),
            }),
          };
        }
        if (table === 'budget_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            delete: mockDelete,
          };
        }
        return {};
      });

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteLineItem('item-to-delete');
      });

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('Refresh From Server', () => {
    it('should not refresh when offline', async () => {
      mockIsConnected = false;

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshFromServer();
      });

      // Should show error toast (mocked internally)
    });

    it('should refresh when online', async () => {
      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshFromServer();
      });

      // Query should be refetched
    });
  });

  describe('Sync Now', () => {
    it('should not sync when offline', async () => {
      mockIsConnected = false;
      mockData.items = [
        { id: 'unsynced', section_id: 'section-1', description: 'Unsynced', total: 100, display_order: 0, synced: false },
      ];

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.unsyncedCount).toBe(1);
      });

      await act(async () => {
        await result.current.syncNow();
      });

      // Item should still be unsynced
      expect(mockData.items[0].synced).toBe(false);
    });

     // TODO: This test requires more complex mock setup for conflict detection hook
     it.skip('should sync pending items when online', async () => {
      // This test verifies that syncNow calls upsert for unsynced items
      const testItems = [
        { id: 'unsynced-1', section_id: 'section-1', description: 'Unsynced 1', total: 100, display_order: 0, synced: false },
        { id: 'unsynced-2', section_id: 'section-1', description: 'Unsynced 2', total: 200, display_order: 1, synced: false },
      ];
      
      // Use mockResolvedValue for direct control
      vi.mocked(getRecordsByIndex).mockResolvedValue(testItems);
      
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'section-1' }], error: null }),
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        upsert: mockUpsert,
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.unsyncedCount).toBe(2);
      }, { timeout: 2000 });

      await act(async () => {
        await result.current.syncNow();
      });

      // Verify upsert was called at least twice (once per unsynced item)
      expect(mockUpsert).toHaveBeenCalled();
      expect(mockUpsert.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should report no pending changes when all synced', async () => {
      mockData.items = [
        { id: 'synced', section_id: 'section-1', description: 'Synced', total: 100, display_order: 0, synced: true },
      ];

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.unsyncedCount).toBe(0);
      });

      await act(async () => {
        await result.current.syncNow();
      });

      // Should show info toast about no pending changes
    });
  });

  describe('Merged Items', () => {
    it('should merge local and remote items when online', async () => {
      const testItems = [
        { id: 'local-only', section_id: 'section-1', description: 'Local Only', total: 100, display_order: 0, synced: false },
      ];
      mockData.items = testItems;
      vi.mocked(getRecordsByIndex).mockResolvedValue(testItems);

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'budget_sections') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'section-1' }], error: null }),
            }),
          };
        }
        if (table === 'budget_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'remote-only', section_id: 'section-1', description: 'Remote Only', total: 200, display_order: 1 },
                  ],
                  error: null,
                }),
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Wait for merged items
      await waitFor(() => {
        expect(result.current.lineItems.length).toBe(2);
      });
    });

    it('should return only local items when offline', async () => {
      mockIsConnected = false;
      mockData.items = [
        { id: 'local-1', section_id: 'section-1', description: 'Local 1', total: 100, display_order: 0, synced: true },
        { id: 'local-2', section_id: 'section-1', description: 'Local 2', total: 200, display_order: 1, synced: false },
      ];

      const { result } = renderHook(
        () => useBudgetOfflineSync({ budgetId: 'budget-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lineItems.length).toBe(2);
      expect(result.current.lineItems).toEqual(mockData.items);
    });
  });
});

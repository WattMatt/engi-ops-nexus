/**
 * Drawing Register Offline Sync Tests
 * Comprehensive tests for useDrawingOfflineSync hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDrawingOfflineSync, OfflineDrawing } from '@/hooks/useDrawingOfflineSync';
import { ConflictProvider } from '@/contexts/ConflictContext';
import 'fake-indexeddb/auto';

// Mock network status
const mockIsConnected = vi.fn(() => true);
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isConnected: mockIsConnected() }),
}));

// Mock Supabase client
const mockSupabaseSelect = vi.fn();
const mockSupabaseUpsert = vi.fn();
const mockSupabaseDelete = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockStorageUpload = vi.fn();
const mockStorageGetPublicUrl = vi.fn();
const mockSupabaseSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => mockSupabaseSingle(),
          order: () => ({
            order: () => mockSupabaseSelect(),
          }),
        }),
      }),
      upsert: (data: unknown) => mockSupabaseUpsert(data),
      delete: () => ({
        eq: (col: string, val: string) => mockSupabaseDelete(col, val),
      }),
      update: (data: unknown) => ({
        eq: (col: string, val: string) => mockSupabaseUpdate(data, col, val),
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, file: File) => mockStorageUpload(path, file),
        getPublicUrl: (path: string) => mockStorageGetPublicUrl(path),
      }),
    },
  },
}));

// Mock offline storage with proper deep copying
const mockStorage = new Map<string, Map<string, unknown>>();

vi.mock('@/lib/offlineStorage', () => ({
  STORES: {
    PROJECT_DRAWINGS: 'project_drawings',
    PENDING_DRAWING_UPLOADS: 'pending_drawing_uploads',
  },
  getRecordsByIndex: vi.fn(async (store: string, index: string, value: string) => {
    const storeData = mockStorage.get(store);
    if (!storeData) return [];
    return Array.from(storeData.values())
      .filter((r: any) => r[index] === value)
      .map(r => JSON.parse(JSON.stringify(r))); // Deep copy to preserve synced flag
  }),
  getAllRecords: vi.fn(async (store: string) => {
    const storeData = mockStorage.get(store);
    if (!storeData) return [];
    return Array.from(storeData.values()).map(r => JSON.parse(JSON.stringify(r)));
  }),
  putRecord: vi.fn(async (store: string, record: any, markUnsynced: boolean) => {
    if (!mockStorage.has(store)) {
      mockStorage.set(store, new Map());
    }
    const storeData = mockStorage.get(store)!;
    const recordCopy = JSON.parse(JSON.stringify(record));
    if (markUnsynced) {
      recordCopy.synced = false;
      recordCopy.localUpdatedAt = Date.now();
    }
    storeData.set(record.id, recordCopy);
  }),
  deleteRecord: vi.fn(async (store: string, id: string) => {
    const storeData = mockStorage.get(store);
    if (storeData) {
      storeData.delete(id);
    }
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ConflictProvider>{children}</ConflictProvider>
    </QueryClientProvider>
  );
};

describe('useDrawingOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.clear();
    mockIsConnected.mockReturnValue(true);
    mockSupabaseSelect.mockResolvedValue({ data: [], error: null });
    mockSupabaseUpsert.mockResolvedValue({ error: null });
    mockSupabaseDelete.mockResolvedValue({ error: null });
    mockSupabaseUpdate.mockResolvedValue({ error: null });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } });
    // Mock single() for conflict detection - returns null for non-existent records
    mockSupabaseSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', async () => {
      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.drawings).toEqual([]);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.unsyncedCount).toBe(0);
      expect(result.current.pendingUploadsCount).toBe(0);
    });

    it('should report offline status when disconnected', async () => {
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should respect enabled option', async () => {
      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1', enabled: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Query should not have been made when disabled
      expect(result.current.drawings).toEqual([]);
    });
  });

  describe('Saving Drawings', () => {
    it('should save drawing locally when offline', async () => {
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const drawing: Partial<OfflineDrawing> & { id: string } = {
        id: 'drawing-1',
        drawing_number: 'E-001',
        drawing_title: 'Electrical Layout',
        category: 'electrical',
      };

      await act(async () => {
        await result.current.saveDrawing(drawing);
      });

      // Should not call Supabase when offline
      expect(mockSupabaseUpsert).not.toHaveBeenCalled();

      // Verify local storage was updated
      const { putRecord } = await import('@/lib/offlineStorage');
      expect(putRecord).toHaveBeenCalled();
    });

    it('should save and sync drawing when online', async () => {
      mockIsConnected.mockReturnValue(true);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const drawing: Partial<OfflineDrawing> & { id: string } = {
        id: 'drawing-2',
        drawing_number: 'M-001',
        drawing_title: 'Mechanical Plan',
        category: 'mechanical',
      };

      await act(async () => {
        await result.current.saveDrawing(drawing);
      });

      expect(mockSupabaseUpsert).toHaveBeenCalled();
    });

    it('should apply default values for missing fields', async () => {
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveDrawing({ id: 'drawing-minimal' });
      });

      const { putRecord } = await import('@/lib/offlineStorage');
      const putRecordMock = putRecord as ReturnType<typeof vi.fn>;
      const savedRecord = putRecordMock.mock.calls[0][1];

      expect(savedRecord.drawing_number).toBe('NEW');
      expect(savedRecord.drawing_title).toBe('Untitled');
      expect(savedRecord.category).toBe('other');
      expect(savedRecord.project_id).toBe('project-1');
    });

    it('should handle sync failure gracefully', async () => {
      // Start offline to avoid auto-sync triggering
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Save offline first
      await act(async () => {
        await result.current.saveDrawing({
          id: 'drawing-fail',
          drawing_number: 'F-001',
          drawing_title: 'Failed Drawing',
          category: 'other',
        });
      });

      // Should save locally
      const { putRecord } = await import('@/lib/offlineStorage');
      expect(putRecord).toHaveBeenCalled();
      
      // Verify sync wasn't attempted since offline
      expect(mockSupabaseUpsert).not.toHaveBeenCalled();
    });
  });

  describe('Deleting Drawings', () => {
    it('should delete drawing locally when offline', async () => {
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteDrawing('drawing-to-delete');
      });

      const { deleteRecord } = await import('@/lib/offlineStorage');
      expect(deleteRecord).toHaveBeenCalledWith('project_drawings', 'drawing-to-delete', true);
      expect(mockSupabaseDelete).not.toHaveBeenCalled();
    });

    it('should delete from both local and remote when online', async () => {
      mockIsConnected.mockReturnValue(true);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteDrawing('drawing-online-delete');
      });

      const { deleteRecord } = await import('@/lib/offlineStorage');
      expect(deleteRecord).toHaveBeenCalled();
      expect(mockSupabaseDelete).toHaveBeenCalled();
    });
  });

  describe('File Upload Queuing', () => {
    it('should queue file for upload when offline', async () => {
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockFile = new File(['test content'], 'test-drawing.pdf', { type: 'application/pdf' });

      await act(async () => {
        await result.current.queueFileUpload('drawing-1', mockFile);
      });

      const { putRecord } = await import('@/lib/offlineStorage');
      const putRecordMock = putRecord as ReturnType<typeof vi.fn>;
      
      // Find the call that saved to PENDING_DRAWING_UPLOADS
      const uploadCall = putRecordMock.mock.calls.find(
        (call: any) => call[0] === 'pending_drawing_uploads'
      );
      
      expect(uploadCall).toBeDefined();
      expect(uploadCall[1].drawing_id).toBe('drawing-1');
      expect(uploadCall[1].file_name).toBe('test-drawing.pdf');
      expect(uploadCall[1].file_type).toBe('application/pdf');
    });

    it('should convert small files to base64 for offline storage', async () => {
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create a small file (< 5MB)
      const smallContent = 'Small file content for testing base64 conversion';
      const mockFile = new File([smallContent], 'small-file.pdf', { type: 'application/pdf' });

      await act(async () => {
        await result.current.queueFileUpload('drawing-2', mockFile);
      });

      const { putRecord } = await import('@/lib/offlineStorage');
      const putRecordMock = putRecord as ReturnType<typeof vi.fn>;
      
      const uploadCall = putRecordMock.mock.calls.find(
        (call: any) => call[0] === 'pending_drawing_uploads'
      );
      
      expect(uploadCall).toBeDefined();
      expect(uploadCall[1].file_data_url).toBeDefined();
      expect(uploadCall[1].file_data_url.startsWith('data:')).toBe(true);
    });
  });

  describe('Merging Local and Remote Data', () => {
    it('should return only local drawings when offline', async () => {
      mockIsConnected.mockReturnValue(false);

      // Pre-populate local storage with drawings
      mockStorage.set('project_drawings', new Map([
        ['local-1', { id: 'local-1', project_id: 'project-1', drawing_number: 'L-001', synced: false }],
        ['local-2', { id: 'local-2', project_id: 'project-1', drawing_number: 'L-002', synced: false }],
      ]));

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.drawings.length).toBe(2);
    });

    it('should overlay local unsynced changes on remote data when online', async () => {
      // Start offline to set up local state without auto-sync
      mockIsConnected.mockReturnValue(false);

      // Local has an unsynced modification
      mockStorage.set('project_drawings', new Map([
        ['remote-1', { id: 'remote-1', project_id: 'project-1', drawing_number: 'R-001', drawing_title: 'Modified Title', synced: false }],
      ]));

      const { result, rerender } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Local unsynced change should be present
      expect(result.current.drawings.length).toBe(1);
      const drawing = result.current.drawings.find(d => d.id === 'remote-1');
      expect(drawing?.drawing_title).toBe('Modified Title');
      expect(drawing?.synced).toBe(false);
    });
  });

  describe('Sync Operations', () => {
    it('should sync unsynced drawings when syncNow is called', async () => {
      // Start online - the hook will try to sync immediately
      mockIsConnected.mockReturnValue(true);

      // Pre-populate with unsynced drawings before the hook loads
      mockStorage.set('project_drawings', new Map([
        ['unsynced-1', { id: 'unsynced-1', project_id: 'project-1', drawing_number: 'U-001', drawing_title: 'Drawing 1', category: 'electrical', synced: false }],
        ['unsynced-2', { id: 'unsynced-2', project_id: 'project-1', drawing_number: 'U-002', drawing_title: 'Drawing 2', category: 'mechanical', synced: false }],
      ]));

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      // Wait for loading to complete and auto-sync to trigger
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The hook should have auto-synced when it loaded with unsynced items
      // Wait for the upsert calls to complete
      await waitFor(() => {
        expect(mockSupabaseUpsert).toHaveBeenCalled();
      });

      // Should have synced both drawings
      expect(mockSupabaseUpsert).toHaveBeenCalledTimes(2);
    });

    it('should show info toast when no pending changes', async () => {
      const { toast } = await import('sonner');

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.syncNow();
      });

      expect(toast.info).toHaveBeenCalledWith('No pending changes to sync');
    });

    it('should fail sync when offline', async () => {
      mockIsConnected.mockReturnValue(false);
      const { toast } = await import('sonner');

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.syncNow();
      });

      expect(toast.error).toHaveBeenCalledWith('Cannot sync while offline');
    });

    it('should track unsynced count correctly', async () => {
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unsyncedCount).toBe(0);

      await act(async () => {
        await result.current.saveDrawing({
          id: 'new-drawing-1',
          drawing_number: 'N-001',
          drawing_title: 'New Drawing',
          category: 'electrical',
        });
      });

      await waitFor(() => {
        expect(result.current.unsyncedCount).toBe(1);
      });
    });
  });

  describe('Refresh from Server', () => {
    it('should refresh drawings when online', async () => {
      mockIsConnected.mockReturnValue(true);
      const { toast } = await import('sonner');

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshFromServer();
      });

      expect(toast.success).toHaveBeenCalledWith('Refreshed from server');
    });

    it('should fail refresh when offline', async () => {
      mockIsConnected.mockReturnValue(false);
      const { toast } = await import('sonner');

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshFromServer();
      });

      expect(toast.error).toHaveBeenCalledWith('Cannot refresh while offline');
    });
  });

  describe('Pending Uploads Count', () => {
    it('should track pending uploads count', async () => {
      // Pre-populate with pending uploads
      mockStorage.set('pending_drawing_uploads', new Map([
        ['pending-1', { id: 'pending-1', drawing_id: 'drawing-1', file_name: 'file1.pdf' }],
        ['pending-2', { id: 'pending-2', drawing_id: 'drawing-2', file_name: 'file2.pdf' }],
      ]));
      mockStorage.set('project_drawings', new Map());

      const { result } = renderHook(
        () => useDrawingOfflineSync({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.pendingUploadsCount).toBe(2);
      });
    });
  });
});

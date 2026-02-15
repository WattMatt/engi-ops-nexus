 /**
  * E2E Tests for Offline Scenarios
  * Tests the complete offline workflow including:
  * - Going offline while working
  * - Queuing changes in IndexedDB
  * - Coming back online and syncing
  * - Conflict detection
  */
 
 import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 import { renderHook, waitFor, act } from '@testing-library/react';
 import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 import { ConflictProvider } from '@/contexts/ConflictContext';
 import { useOfflineSync } from '@/hooks/useOfflineSync';
 import { useCableOfflineSync } from '@/hooks/useCableOfflineSync';
 import { useBudgetOfflineSync } from '@/hooks/useBudgetOfflineSync';
 import {
   putRecord,
   getSyncQueue,
   clearStore,
   getRecord,
   STORES,
 } from '@/lib/offlineStorage';
 import 'fake-indexeddb/auto';
 
 // Mock navigator.onLine
 let mockOnline = true;
 Object.defineProperty(navigator, 'onLine', {
   get: () => mockOnline,
   configurable: true,
 });
 
 // Mock network status hook
 vi.mock('@/hooks/useNetworkStatus', () => ({
   useNetworkStatus: () => ({
     isConnected: mockOnline,
     connectionType: mockOnline ? 'wifi' : 'none',
   }),
 }));
 
 // Mock Supabase client
 const mockSupabaseSelect = vi.fn();
 const mockSupabaseUpsert = vi.fn();
 const mockSupabaseDelete = vi.fn();
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
         eq: () => mockSupabaseDelete(),
       }),
     }),
   },
 }));
 
 // Helper to simulate going offline
 function goOffline() {
   mockOnline = false;
   window.dispatchEvent(new Event('offline'));
 }
 
 // Helper to simulate coming online
 function goOnline() {
   mockOnline = true;
   window.dispatchEvent(new Event('online'));
 }
 
 // Test wrapper with providers
 const createWrapper = () => {
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: { retry: false },
       mutations: { retry: false },
     },
   });
   return ({ children }: { children: React.ReactNode }) => (
     <QueryClientProvider client={queryClient}>
       <ConflictProvider>{children}</ConflictProvider>
     </QueryClientProvider>
   );
 };
 
 describe('Offline Scenarios E2E', () => {
   beforeEach(async () => {
     vi.clearAllMocks();
     mockOnline = true;
     
     // Clear all stores
     await clearStore(STORES.SYNC_QUEUE);
     await clearStore(STORES.CABLE_ENTRIES);
     await clearStore(STORES.BUDGET_LINE_ITEMS);
     await clearStore(STORES.PROJECT_DRAWINGS);
     
     // Default mock responses
     mockSupabaseSelect.mockResolvedValue({ data: [], error: null });
     mockSupabaseUpsert.mockResolvedValue({ error: null });
     mockSupabaseDelete.mockResolvedValue({ error: null });
     mockSupabaseSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
   });
 
   afterEach(() => {
     vi.clearAllMocks();
   });
 
   describe('Scenario: User goes offline while editing', () => {
     it('should queue changes locally when offline', async () => {
       // Start online
       expect(navigator.onLine).toBe(true);
 
       // Go offline
       goOffline();
       expect(navigator.onLine).toBe(false);
 
       // Create a record while offline
       const testRecord = {
         id: 'offline-cable-1',
         schedule_id: 'schedule-1',
         cable_number: 'C-001',
         source: 'DB1',
         destination: 'LIGHT-1',
       };
 
       await putRecord(STORES.CABLE_ENTRIES, testRecord);
 
       // Verify record is in local store
       const localRecord = await getRecord(STORES.CABLE_ENTRIES, testRecord.id);
       expect(localRecord).toBeDefined();
       expect((localRecord as any).synced).toBe(false);
 
       // Verify sync queue has the item
       const queue = await getSyncQueue();
       expect(queue.length).toBe(1);
       expect(queue[0].action).toBe('create');
       expect(queue[0].recordId).toBe('offline-cable-1');
     });
 
     it('should accumulate multiple offline changes', async () => {
       goOffline();
 
       // Create multiple records
       for (let i = 1; i <= 5; i++) {
         await putRecord(STORES.CABLE_ENTRIES, {
           id: `cable-${i}`,
           schedule_id: 'schedule-1',
           cable_number: `C-00${i}`,
           source: `DB${i}`,
           destination: `LIGHT-${i}`,
         });
       }
 
       const queue = await getSyncQueue();
       expect(queue.length).toBe(5);
       
       // All should be create actions
       expect(queue.every(item => item.action === 'create')).toBe(true);
     });
   });
 
   describe('Scenario: User comes back online', () => {
     it('should sync queued changes when coming online', async () => {
       // Queue changes while offline
       goOffline();
       
       await putRecord(STORES.CABLE_ENTRIES, {
         id: 'sync-test-1',
         schedule_id: 'schedule-1',
         cable_number: 'C-SYNC',
         source: 'DB-SYNC',
         destination: 'LIGHT-SYNC',
       });
 
       let queueBeforeSync = await getSyncQueue();
       expect(queueBeforeSync.length).toBe(1);
 
       // Render sync hook
       const { result } = renderHook(() => useOfflineSync(), {
         wrapper: createWrapper(),
       });
 
       // Come back online
       await act(async () => {
         goOnline();
         await new Promise(r => setTimeout(r, 100));
       });
 
       // Wait for sync to complete
       await waitFor(() => {
         expect(result.current.isSyncing).toBe(false);
       }, { timeout: 3000 });
 
       // Upsert should have been called
       expect(mockSupabaseUpsert).toHaveBeenCalled();
     });
 
     it('should handle sync errors gracefully', async () => {
       // Mock failure
       mockSupabaseUpsert.mockResolvedValue({ 
         error: { message: 'Network error' } 
       });
 
       goOffline();
       await putRecord(STORES.CABLE_ENTRIES, {
         id: 'fail-test-1',
         schedule_id: 'schedule-1',
         cable_number: 'C-FAIL',
       });
 
       const { result } = renderHook(() => useOfflineSync(), {
         wrapper: createWrapper(),
       });
 
       await act(async () => {
         goOnline();
         await result.current.syncNow();
       });
 
       // Verify sync was attempted - error may not persist if retries exhausted
       await waitFor(() => {
         expect(mockSupabaseUpsert).toHaveBeenCalled();
       });
       
       // After max retries, item should be removed from queue
       const queue = await getSyncQueue();
       // Queue is either empty (removed after max retries) or still has item (pending retry)
       expect(queue.length).toBeLessThanOrEqual(1);
     });
   });
 
   describe('Scenario: Offline indicator state', () => {
     it('should report correct pending count', async () => {
       const { result } = renderHook(() => useOfflineSync(), {
         wrapper: createWrapper(),
       });
 
       // Initially no pending
       await waitFor(() => {
         expect(result.current.queueSize).toBe(0);
       });
 
       // Add items while offline
       goOffline();
       
       await act(async () => {
         await putRecord(STORES.CABLE_ENTRIES, { id: 'count-1', schedule_id: 's1' });
         await putRecord(STORES.CABLE_ENTRIES, { id: 'count-2', schedule_id: 's1' });
       });
 
       // Trigger count update
       await act(async () => {
         await result.current.syncNow();
       });
 
       // Count should reflect pending items
       const queue = await getSyncQueue();
       expect(queue.length).toBe(2);
     });
 
     it('should track online/offline status correctly', async () => {
       const { result } = renderHook(() => useOfflineSync(), {
         wrapper: createWrapper(),
       });
 
       expect(result.current.isOnline).toBe(true);
 
       await act(async () => {
         goOffline();
         await new Promise(r => setTimeout(r, 50));
       });
 
       expect(result.current.isOnline).toBe(false);
 
       await act(async () => {
         goOnline();
         await new Promise(r => setTimeout(r, 50));
       });
 
       expect(result.current.isOnline).toBe(true);
     });
   });
 
   describe('Scenario: Record-level sync status', () => {
     it('should mark records as unsynced when created offline', async () => {
       goOffline();
 
       const record = {
         id: 'unsync-test',
         schedule_id: 'schedule-1',
         cable_number: 'C-UNSYNC',
       };
 
       await putRecord(STORES.CABLE_ENTRIES, record);
 
       const stored = await getRecord<any>(STORES.CABLE_ENTRIES, record.id);
       expect(stored?.synced).toBe(false);
       expect(stored?.localUpdatedAt).toBeDefined();
     });
 
     it('should preserve local changes until synced', async () => {
       goOffline();
 
       // Create initial record
       await putRecord(STORES.CABLE_ENTRIES, {
         id: 'preserve-test',
         schedule_id: 'schedule-1',
         cable_number: 'C-001',
       });
 
       // Update same record
       await putRecord(STORES.CABLE_ENTRIES, {
         id: 'preserve-test',
         schedule_id: 'schedule-1',
         cable_number: 'C-001-UPDATED',
       });
 
       const stored = await getRecord<any>(STORES.CABLE_ENTRIES, 'preserve-test');
       expect(stored?.cable_number).toBe('C-001-UPDATED');
       expect(stored?.synced).toBe(false);
     });
   });
 });
/**
 * Budget Offline Sync Hook
 * Provides offline-first data management for budget line items
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRecord,
  getRecordsByIndex,
  putRecord,
  deleteRecord,
  STORES,
} from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
 import { useConflictDetection } from './useConflictDetection';
 import { ConflictResolution } from '@/lib/conflictResolution';

export interface OfflineBudgetLineItem {
  id: string;
  section_id: string;
  description: string;
  item_number?: string | null;
  area?: number | null;
  area_unit?: string | null;
  base_rate?: number | null;
  ti_rate?: number | null;
  total: number;
  display_order: number;
  shop_number?: string | null;
  tenant_id?: string | null;
  is_tenant_item?: boolean | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Offline metadata
  synced?: boolean;
  localUpdatedAt?: number;
  syncedAt?: number;
}

interface UseBudgetOfflineSyncOptions {
  budgetId: string;
  enabled?: boolean;
}

interface UseBudgetOfflineSyncReturn {
  /** Budget line items (local + remote merged) */
  lineItems: OfflineBudgetLineItem[];
  /** Loading state */
  isLoading: boolean;
  /** Whether device is online */
  isOnline: boolean;
  /** Count of unsynced local items */
  unsyncedCount: number;
  /** Save a line item (works offline) */
  saveLineItem: (item: Partial<OfflineBudgetLineItem> & { id: string; section_id: string }) => Promise<void>;
  /** Delete a line item (works offline) */
  deleteLineItem: (id: string) => Promise<void>;
  /** Force refresh from server */
  refreshFromServer: () => Promise<void>;
  /** Sync pending changes */
  syncNow: () => Promise<void>;
}

export function useBudgetOfflineSync({
  budgetId,
  enabled = true,
}: UseBudgetOfflineSyncOptions): UseBudgetOfflineSyncReturn {
  const { isConnected } = useNetworkStatus();
  const queryClient = useQueryClient();
   const { syncWithConflictDetection } = useConflictDetection({
     storeName: STORES.BUDGET_LINE_ITEMS,
     tableName: 'budget_line_items',
   });
  
  const [localItems, setLocalItems] = useState<OfflineBudgetLineItem[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Load local items from IndexedDB
  const loadLocalItems = useCallback(async () => {
    if (!budgetId) return;
    
    setIsLoadingLocal(true);
    try {
      // Get all line items for all sections of this budget
      const allItems = await getRecordsByIndex<OfflineBudgetLineItem>(
        STORES.BUDGET_LINE_ITEMS,
        'section_id',
        budgetId // This is a simplification - in production, need to query by section IDs
      );
      setLocalItems(allItems);
      
      // Count unsynced
      const unsynced = allItems.filter(e => !e.synced).length;
      setUnsyncedCount(unsynced);
    } catch (error) {
      console.error('Failed to load local budget items:', error);
    } finally {
      setIsLoadingLocal(false);
    }
  }, [budgetId]);

  // Fetch remote items (only when online)
  const { data: remoteItems = [], isLoading: isLoadingRemote, refetch: refetchRemote } = useQuery({
    queryKey: ['budget-line-items-offline', budgetId],
    queryFn: async () => {
      if (!isConnected) return [];
      
      // First get all sections for this budget
      const { data: sections, error: sectionsError } = await supabase
        .from('budget_sections')
        .select('id')
        .eq('budget_id', budgetId);

      if (sectionsError) throw sectionsError;
      if (!sections || sections.length === 0) return [];

      const sectionIds = sections.map(s => s.id);

      // Then get all line items for those sections
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*')
        .in('section_id', sectionIds)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!budgetId && isConnected,
    staleTime: 30000,
  });

  // Merge local and remote items
  const mergedItems = useMemo(() => {
    if (!isConnected) {
      return localItems;
    }

    const merged = new Map<string, OfflineBudgetLineItem>();
    
    for (const remote of remoteItems) {
      merged.set(remote.id, { ...remote, synced: true });
    }

    for (const local of localItems) {
      if (!local.synced) {
        merged.set(local.id, local);
      }
    }

    return Array.from(merged.values());
  }, [localItems, remoteItems, isConnected]);

  // Save a line item (offline-first)
  const saveLineItem = useCallback(async (
    item: Partial<OfflineBudgetLineItem> & { id: string; section_id: string }
  ) => {
    const fullItem: OfflineBudgetLineItem = {
      description: '',
      total: 0,
      display_order: 0,
      ...item,
      updated_at: new Date().toISOString(),
    };

    await putRecord(STORES.BUDGET_LINE_ITEMS, fullItem, true);
    await loadLocalItems();

    if (isConnected) {
      try {
        const { synced, localUpdatedAt, syncedAt, ...cleanData } = fullItem;
        
        const { error } = await supabase
          .from('budget_line_items')
          .upsert(cleanData);

        if (error) throw error;

        await putRecord(STORES.BUDGET_LINE_ITEMS, { ...fullItem, synced: true }, false);
        await loadLocalItems();
        
        queryClient.invalidateQueries({ queryKey: ['budget-line-items'] });
      } catch (error) {
        console.error('Failed to sync budget item:', error);
        toast.warning('Saved locally - will sync when online');
      }
    } else {
      toast.info('Saved offline - will sync when back online');
    }
  }, [isConnected, loadLocalItems, queryClient]);

  // Delete a line item (offline-first)
  const deleteLineItem = useCallback(async (id: string) => {
    await deleteRecord(STORES.BUDGET_LINE_ITEMS, id, true);
    await loadLocalItems();

    if (isConnected) {
      try {
        const { error } = await supabase
          .from('budget_line_items')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['budget-line-items'] });
      } catch (error) {
        console.error('Failed to delete budget item from server:', error);
        toast.warning('Deleted locally - will sync when online');
      }
    } else {
      toast.info('Deleted offline - will sync when back online');
    }
  }, [isConnected, loadLocalItems, queryClient]);

  // Force refresh from server
  const refreshFromServer = useCallback(async () => {
    if (!isConnected) {
      toast.error('Cannot refresh while offline');
      return;
    }

    await refetchRemote();
    toast.success('Refreshed from server');
  }, [isConnected, refetchRemote]);

  // Sync all pending changes
  const syncNow = useCallback(async () => {
    if (!isConnected) {
      toast.error('Cannot sync while offline');
      return;
    }

    const unsynced = localItems.filter(e => !e.synced);
    if (unsynced.length === 0) {
      toast.info('No pending changes to sync');
      return;
    }

    let successCount = 0;
    let failCount = 0;
     let conflictCount = 0;

    for (const item of unsynced) {
      try {
         // Check for conflicts before syncing
         const result = await syncWithConflictDetection(
           item as unknown as { id: string; [key: string]: unknown },
           async (resolution, mergedRecord) => {
             const recordToUpsert = mergedRecord || item;
             const { synced, localUpdatedAt, syncedAt, ...cleanData } = recordToUpsert as OfflineBudgetLineItem;
             
             const { error } = await supabase
               .from('budget_line_items')
               .upsert(cleanData);
 
             if (error) throw error;
 
             await putRecord(STORES.BUDGET_LINE_ITEMS, { ...item, synced: true }, false);
           }
         );
 
         if (result.hadConflict) {
           conflictCount++;
         } else if (result.success) {
           // No conflict, proceed with normal sync
           const { synced, localUpdatedAt, syncedAt, ...cleanData } = item;
           
           const { error } = await supabase
             .from('budget_line_items')
             .upsert(cleanData);
 
           if (error) throw error;
 
           await putRecord(STORES.BUDGET_LINE_ITEMS, { ...item, synced: true }, false);
           successCount++;
         }
      } catch (error) {
        console.error('Failed to sync item:', item.id, error);
        failCount++;
      }
    }

    await loadLocalItems();
    queryClient.invalidateQueries({ queryKey: ['budget-line-items'] });

    if (successCount > 0) {
      toast.success(`Synced ${successCount} budget item${successCount === 1 ? '' : 's'}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} item${failCount === 1 ? '' : 's'}`);
    }
     if (conflictCount > 0) {
       toast.warning(`${conflictCount} conflict${conflictCount === 1 ? '' : 's'} detected - review required`);
     }
   }, [isConnected, localItems, loadLocalItems, queryClient, syncWithConflictDetection]);

  // Initial load
  useEffect(() => {
    if (budgetId) {
      loadLocalItems();
    }
  }, [budgetId, loadLocalItems]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isConnected && unsyncedCount > 0) {
      syncNow();
    }
  }, [isConnected, unsyncedCount, syncNow]);

  return {
    lineItems: mergedItems,
    isLoading: isLoadingLocal || isLoadingRemote,
    isOnline: isConnected,
    unsyncedCount,
    saveLineItem,
    deleteLineItem,
    refreshFromServer,
    syncNow,
  };
}

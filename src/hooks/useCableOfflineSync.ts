/**
 * Cable Schedule Offline Sync Hook
 * Provides offline-first data management for cable entries
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRecordsByIndex,
  putRecord,
  deleteRecord,
  STORES,
} from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
 import { useConflictDetection } from './useConflictDetection';
 import { ConflictResolution } from '@/lib/conflictResolution';

export interface OfflineCableEntry {
  id: string;
  schedule_id: string | null;
  floor_plan_id?: string | null;
  cable_tag: string;
  cable_type?: string | null;
  cable_size?: string | null;
  from_location: string;
  to_location: string;
  measured_length?: number | null;
  extra_length?: number | null;
  total_length?: number | null;
  quantity: number;
  installation_method: string;
  voltage?: number | null;
  volt_drop?: number | null;
  load_amps?: number | null;
  notes?: string | null;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  // Offline metadata
  synced?: boolean;
  localUpdatedAt?: number;
  syncedAt?: number;
}

interface UseCableOfflineSyncOptions {
  scheduleId: string;
  enabled?: boolean;
}

interface UseCableOfflineSyncReturn {
  /** Cable entries (local + remote merged) */
  cableEntries: OfflineCableEntry[];
  /** Loading state */
  isLoading: boolean;
  /** Whether device is online */
  isOnline: boolean;
  /** Count of unsynced local entries */
  unsyncedCount: number;
  /** Save a cable entry (works offline) */
  saveCableEntry: (entry: Partial<OfflineCableEntry> & { id: string }) => Promise<void>;
  /** Delete a cable entry (works offline) */
  deleteCableEntry: (id: string) => Promise<void>;
  /** Force refresh from server */
  refreshFromServer: () => Promise<void>;
  /** Sync pending changes */
  syncNow: () => Promise<void>;
}

export function useCableOfflineSync({
  scheduleId,
  enabled = true,
}: UseCableOfflineSyncOptions): UseCableOfflineSyncReturn {
  const { isConnected } = useNetworkStatus();
  const queryClient = useQueryClient();
   const { syncWithConflictDetection } = useConflictDetection({
     storeName: STORES.CABLE_ENTRIES,
     tableName: 'cable_entries',
   });
  
  const [localEntries, setLocalEntries] = useState<OfflineCableEntry[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Load local entries from IndexedDB
  const loadLocalEntries = useCallback(async () => {
    if (!scheduleId) return;
    
    setIsLoadingLocal(true);
    try {
      const entries = await getRecordsByIndex<OfflineCableEntry>(
        STORES.CABLE_ENTRIES,
        'cable_schedule_id', // IndexedDB index name
        scheduleId
      );
      setLocalEntries(entries);
      
      // Count unsynced
      const unsynced = entries.filter(e => !e.synced).length;
      setUnsyncedCount(unsynced);
    } catch (error) {
      console.error('Failed to load local cable entries:', error);
    } finally {
      setIsLoadingLocal(false);
    }
  }, [scheduleId]);

  // Fetch remote entries (only when online)
  const { data: remoteEntries = [], isLoading: isLoadingRemote, refetch: refetchRemote } = useQuery({
    queryKey: ['cable-entries-offline', scheduleId],
    queryFn: async (): Promise<OfflineCableEntry[]> => {
      if (!isConnected) return [];
      
      const { data, error } = await supabase
        .from('cable_entries')
        .select('id, schedule_id, floor_plan_id, cable_tag, cable_type, cable_size, from_location, to_location, measured_length, extra_length, total_length, quantity, installation_method, voltage, volt_drop, load_amps, notes, display_order, created_at, updated_at')
        .eq('schedule_id', scheduleId)
        .order('cable_tag');

      if (error) throw error;
      
      return (data || []).map(entry => ({
        ...entry,
        synced: true,
      })) as OfflineCableEntry[];
    },
    enabled: enabled && !!scheduleId && isConnected,
    staleTime: 30000, // 30 seconds
  });

  // Merge local and remote entries
  const mergedEntries = useMemo((): OfflineCableEntry[] => {
    if (!isConnected) {
      // Offline: return local entries only
      return localEntries;
    }

    // Online: merge local changes with remote data
    const merged = new Map<string, OfflineCableEntry>();
    
    // Start with remote entries
    for (const remote of remoteEntries) {
      merged.set(remote.id, remote);
    }

    // Overlay local unsynced changes
    for (const local of localEntries) {
      if (!local.synced) {
        merged.set(local.id, local);
      }
    }

    return Array.from(merged.values());
  }, [localEntries, remoteEntries, isConnected]);

  // Save a cable entry (offline-first)
  const saveCableEntry = useCallback(async (
    entry: Partial<OfflineCableEntry> & { id: string }
  ) => {
    const fullEntry: OfflineCableEntry = {
      schedule_id: scheduleId,
      cable_tag: entry.cable_tag || 'NEW',
      from_location: entry.from_location || '',
      to_location: entry.to_location || '',
      quantity: entry.quantity || 1,
      installation_method: entry.installation_method || 'Tray',
      display_order: entry.display_order || 0,
      ...entry,
      updated_at: new Date().toISOString(),
    };

    // Always save locally first
    await putRecord(STORES.CABLE_ENTRIES, fullEntry, true);
    await loadLocalEntries();

    // If online, also try to sync immediately
    if (isConnected) {
      try {
        const { synced, localUpdatedAt, syncedAt, ...cleanData } = fullEntry;
        
        const { error } = await supabase
          .from('cable_entries')
          .upsert(cleanData as never);

        if (error) throw error;

        // Mark as synced
        await putRecord(STORES.CABLE_ENTRIES, { ...fullEntry, synced: true }, false);
        await loadLocalEntries();
        
        // Invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ['cable-entries'] });
      } catch (error) {
        console.error('Failed to sync cable entry:', error);
        toast.warning('Saved locally - will sync when online');
      }
    } else {
      toast.info('Saved offline - will sync when back online');
    }
  }, [scheduleId, isConnected, loadLocalEntries, queryClient]);

  // Delete a cable entry (offline-first)
  const deleteCableEntry = useCallback(async (id: string) => {
    // Delete locally first
    await deleteRecord(STORES.CABLE_ENTRIES, id, true);
    await loadLocalEntries();

    // If online, also delete from server
    if (isConnected) {
      try {
        const { error } = await supabase
          .from('cable_entries')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['cable-entries'] });
      } catch (error) {
        console.error('Failed to delete cable entry from server:', error);
        toast.warning('Deleted locally - will sync when online');
      }
    } else {
      toast.info('Deleted offline - will sync when back online');
    }
  }, [isConnected, loadLocalEntries, queryClient]);

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

    const unsynced = localEntries.filter(e => !e.synced);
    if (unsynced.length === 0) {
      toast.info('No pending changes to sync');
      return;
    }

    let successCount = 0;
    let failCount = 0;
     let conflictCount = 0;

    for (const entry of unsynced) {
      try {
         // Check for conflicts before syncing
         const result = await syncWithConflictDetection(
           entry as unknown as { id: string; [key: string]: unknown },
           async (resolution, mergedRecord) => {
             const recordToUpsert = mergedRecord || entry;
             const { synced, localUpdatedAt, syncedAt, ...cleanData } = recordToUpsert as OfflineCableEntry;
             
             const { error } = await supabase
               .from('cable_entries')
               .upsert(cleanData as never);
 
             if (error) throw error;
 
             await putRecord(STORES.CABLE_ENTRIES, { ...entry, synced: true }, false);
           }
         );
 
         if (result.hadConflict) {
           conflictCount++;
         } else if (result.success) {
           // No conflict, proceed with normal sync
           const { synced, localUpdatedAt, syncedAt, ...cleanData } = entry;
           
           const { error } = await supabase
             .from('cable_entries')
             .upsert(cleanData as never);
 
           if (error) throw error;
 
           await putRecord(STORES.CABLE_ENTRIES, { ...entry, synced: true }, false);
           successCount++;
         }
      } catch (error) {
        console.error('Failed to sync entry:', entry.id, error);
        failCount++;
      }
    }

    await loadLocalEntries();
    queryClient.invalidateQueries({ queryKey: ['cable-entries'] });

    if (successCount > 0) {
      toast.success(`Synced ${successCount} cable entr${successCount === 1 ? 'y' : 'ies'}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} entr${failCount === 1 ? 'y' : 'ies'}`);
    }
     if (conflictCount > 0) {
       toast.warning(`${conflictCount} conflict${conflictCount === 1 ? '' : 's'} detected - review required`);
     }
   }, [isConnected, localEntries, loadLocalEntries, queryClient, syncWithConflictDetection]);

  // Initial load
  useEffect(() => {
    if (scheduleId) {
      loadLocalEntries();
    }
  }, [scheduleId, loadLocalEntries]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isConnected && unsyncedCount > 0) {
      syncNow();
    }
  }, [isConnected, unsyncedCount, syncNow]);

  return {
    cableEntries: mergedEntries,
    isLoading: isLoadingLocal || isLoadingRemote,
    isOnline: isConnected,
    unsyncedCount,
    saveCableEntry,
    deleteCableEntry,
    refreshFromServer,
    syncNow,
  };
}

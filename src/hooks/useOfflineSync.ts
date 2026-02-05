/**
 * Offline Sync Hook
 * Handles background synchronization of offline changes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  markRecordSynced,
  STORES,
  type StoreName,
} from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

interface SyncConfig {
  /** Supabase table name for the store */
  tableName: string;
  /** Transform local data to API format (optional) */
  transformForApi?: (data: unknown) => unknown;
}

// Map store names to Supabase table names
const STORE_TABLE_MAP: Record<string, SyncConfig> = {
  [STORES.SITE_DIARY_ENTRIES]: {
    tableName: 'site_diary_entries',
  },
  [STORES.SITE_DIARY_TASKS]: {
    tableName: 'site_diary_tasks',
  },
  [STORES.HANDOVER_DOCUMENTS]: {
    tableName: 'handover_documents',
  },
  [STORES.HANDOVER_FOLDERS]: {
    tableName: 'handover_folders',
  },
  // Cable schedule stores
  [STORES.CABLE_ENTRIES]: {
    tableName: 'cable_entries',
  },
  [STORES.CABLE_SCHEDULES]: {
    tableName: 'cable_schedules',
  },
  // Budget stores
  [STORES.BUDGET_SECTIONS]: {
    tableName: 'budget_sections',
  },
  [STORES.BUDGET_LINE_ITEMS]: {
    tableName: 'budget_line_items',
  },
  // Drawing register
  [STORES.PROJECT_DRAWINGS]: {
    tableName: 'project_drawings',
  },
};

interface UseOfflineSyncOptions {
  /** Max retry attempts per item */
  maxRetries?: number;
  /** Sync interval in ms when online */
  syncIntervalMs?: number;
  /** Show toast notifications */
  showNotifications?: boolean;
}

interface UseOfflineSyncReturn {
  /** Number of pending sync items */
  pendingCount: number;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Whether device is online */
  isOnline: boolean;
  /** Last sync timestamp */
  lastSyncAt: number | null;
  /** Manually trigger sync */
  syncNow: () => Promise<void>;
  /** Last sync error */
  lastError: string | null;
}

export function useOfflineSync({
  maxRetries = 3,
  syncIntervalMs = 30000, // 30 seconds
  showNotifications = true,
}: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const syncInProgressRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      setPendingCount(queue.length);
    } catch (error) {
      console.error('Failed to get sync queue:', error);
    }
  }, []);

  // Perform sync
  const syncNow = useCallback(async () => {
    if (syncInProgressRef.current || !navigator.onLine) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);
    setLastError(null);

    try {
      const queue = await getSyncQueue();
      
      if (queue.length === 0) {
        setIsSyncing(false);
        syncInProgressRef.current = false;
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of queue) {
        const config = STORE_TABLE_MAP[item.storeName];
        
        if (!config) {
          // Unknown store, remove from queue
          await removeSyncQueueItem(item.id);
          continue;
        }

        try {
          const data = config.transformForApi 
            ? config.transformForApi(item.data)
            : item.data;

          // Remove local-only fields before syncing
          const cleanData = { ...(data as Record<string, unknown>) };
          delete cleanData.synced;
          delete cleanData.localUpdatedAt;
          delete cleanData.syncedAt;

          if (item.action === 'create' || item.action === 'update') {
            // Use dynamic table access with type assertion
            const { error } = await (supabase
              .from(config.tableName as 'site_diary_entries')
              .upsert(cleanData as never));

            if (error) throw error;
          } else if (item.action === 'delete') {
            const { error } = await (supabase
              .from(config.tableName as 'site_diary_entries')
              .delete()
              .eq('id', item.recordId));

            if (error) throw error;
          }

          // Success - remove from queue and mark as synced
          await removeSyncQueueItem(item.id);
          if (item.action !== 'delete') {
            await markRecordSynced(item.storeName, item.recordId);
          }
          successCount++;

        } catch (error) {
          console.error(`Sync failed for ${item.recordId}:`, error);
          
          if (item.retryCount >= maxRetries) {
            // Max retries exceeded, remove from queue
            await removeSyncQueueItem(item.id);
            failCount++;
            setLastError(`Failed to sync after ${maxRetries} attempts`);
          } else {
            // Update retry count
            await updateSyncQueueItem({
              ...item,
              retryCount: item.retryCount + 1,
              lastError: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      if (showNotifications) {
        if (successCount > 0) {
          toast.success(`Synced ${successCount} offline change${successCount > 1 ? 's' : ''}`);
        }
        if (failCount > 0) {
          toast.error(`Failed to sync ${failCount} item${failCount > 1 ? 's' : ''}`);
        }
      }

      setLastSyncAt(Date.now());
      await updatePendingCount();

    } catch (error) {
      console.error('Sync error:', error);
      setLastError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [maxRetries, showNotifications, updatePendingCount]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (showNotifications) {
        toast.info('Back online, syncing changes...');
      }
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (showNotifications) {
        toast.warning('You are offline. Changes will sync when connected.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, showNotifications]);

  // Periodic sync when online
  useEffect(() => {
    if (isOnline && syncIntervalMs > 0) {
      intervalRef.current = setInterval(() => {
        syncNow();
      }, syncIntervalMs);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isOnline, syncIntervalMs, syncNow]);

  // Initial load
  useEffect(() => {
    updatePendingCount();
    
    // Attempt sync on mount if online
    if (navigator.onLine) {
      syncNow();
    }
  }, [updatePendingCount, syncNow]);

   // Integrate with background sync
   useEffect(() => {
     const handleMessage = (event: MessageEvent) => {
       if (event.data?.type === 'BACKGROUND_SYNC_TRIGGERED') {
         console.log('[OfflineSync] Background sync triggered');
         syncNow();
       }
     };
 
     navigator.serviceWorker?.addEventListener('message', handleMessage);
     
     return () => {
       navigator.serviceWorker?.removeEventListener('message', handleMessage);
     };
   }, [syncNow]);
 
   // Request background sync when queue has items
   useEffect(() => {
     const requestBackgroundSync = async () => {
       if (pendingCount > 0 && 'serviceWorker' in navigator) {
         try {
           const registration = await navigator.serviceWorker.ready;
           registration.active?.postMessage({
             type: 'QUEUE_SYNC',
             pendingCount,
           });
         } catch (error) {
           console.log('[OfflineSync] Background sync request failed:', error);
         }
       }
     };
 
     requestBackgroundSync();
   }, [pendingCount]);
 
  return {
    pendingCount,
    isSyncing,
    isOnline,
    lastSyncAt,
    syncNow,
    lastError,
  };
}

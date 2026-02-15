import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB } from '@/services/db';

interface QueuedMutation {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline_mutation_queue';
const MAX_RETRIES = 3;

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Load queue from localStorage
  const getQueue = useCallback((): QueuedMutation[] => {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save queue to localStorage
  const saveQueue = useCallback((queue: QueuedMutation[]) => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    setQueueSize(queue.length);
  }, []);

  // Add mutation to queue
  const queueMutation = useCallback((type: string, data: any) => {
    const queue = getQueue();
    const mutation: QueuedMutation = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(mutation);
    saveQueue(queue);
    toast.info('Action queued. Will sync when online.', { duration: 2000 });
  }, [getQueue, saveQueue]);

  // Execute mutation based on type
  const executeMutation = async (mutation: QueuedMutation) => {
    console.log('Executing mutation:', mutation.type, mutation.data);
    switch (mutation.type) {
      case 'CREATE_INSPECTION': {
        const { error } = await (supabase.from('inspections' as any) as any).insert([mutation.data]);
        if (error) throw error;
        
        // Mark as synced in IndexedDB
        if (mutation.data.id) {
          await offlineDB.markInspectionSynced(mutation.data.id);
        }
        break;
      }

      case 'UPDATE_INSPECTION': {
        const { id, ...updates } = mutation.data;
        const { error } = await (supabase
          .from('inspections' as any) as any)
          .update(updates)
          .eq('id', id);
        if (error) throw error;
        break;
      }

      case 'DELETE_INSPECTION': {
        const { error } = await (supabase
          .from('inspections' as any) as any)
          .delete()
          .eq('id', mutation.data.id);
        if (error) throw error;
        
        // Delete from IndexedDB
        await offlineDB.deleteInspection(mutation.data.id);
        break;
      }

      case 'UPLOAD_IMAGE': {
        const { bucket, path, file, inspectionId, imageId } = mutation.data;
        
        // Check if file is Blob/File or base64 (if stored in localStorage, it might need reconversion, 
        // but here we are likely getting it from memory if just queued, or we need to retrieve from IDB)
        
        // Ideally, for large files, we should retrieve the blob from IndexedDB using the imageId 
        // because localStorage queue shouldn't store large blobs.
        
        let fileToUpload = file;
        
        // If file is missing in the payload (because we didn't store it in localStorage), fetch from IDB
        if (!fileToUpload && imageId) {
             const images = await offlineDB.getUnsyncedImages();
             const found = images.find(img => img.id === imageId);
             if (found) {
                 fileToUpload = found.blob;
             }
        }

        if (!fileToUpload) {
            console.error('File not found for upload', mutation);
            return; // Skip or fail
        }

        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, fileToUpload);
        if (error) throw error;
        
        // Mark as synced in IndexedDB
        if (imageId) {
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
          await offlineDB.markImageSynced(imageId, publicUrl);
        }
        break;
      }

      default:
        console.warn('Unknown mutation type:', mutation.type);
    }
  };

  // Process queue when online
  const processQueue = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    const failedMutations: QueuedMutation[] = [];

    // Process sequentially to maintain order
    for (const mutation of queue) {
      try {
        await executeMutation(mutation);
        console.log('Successfully synced mutation:', mutation.type);
      } catch (error) {
        console.error('Failed to process mutation:', error);
        
        console.log('DEBUG: Retries check', mutation.retries, '<', MAX_RETRIES);
        if (mutation.retries < MAX_RETRIES) {
          failedMutations.push({
            ...mutation,
            retries: mutation.retries + 1,
          });
          console.log('DEBUG: Pushed to failedMutations', failedMutations.length);
        } else {
          toast.error(`Failed to sync ${mutation.type} after ${MAX_RETRIES} attempts`);
        }
      }
    }

    console.log('DEBUG: saving queue with failedMutations:', failedMutations.length);
    saveQueue(failedMutations);
    setIsSyncing(false);
    setLastSyncAt(new Date().toISOString());

    if (failedMutations.length === 0 && queue.length > 0) {
      setLastError(null);
      toast.success(`Synced ${queue.length} offline action${queue.length > 1 ? 's' : ''}`);
      queryClient.invalidateQueries();
    } else if (failedMutations.length > 0) {
      setLastError(`${failedMutations.length} action(s) failed to sync`);
    }
  }, [isOnline, isSyncing, getQueue, saveQueue, queryClient]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing...', { duration: 2000 });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will be synced when connection is restored.', {
        duration: 4000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  // Update queue size on mount
  useEffect(() => {
    setQueueSize(getQueue().length);
  }, [getQueue]);

  return {
    isOnline,
    queueSize,
    pendingCount: queueSize,
    isSyncing,
    lastSyncAt,
    lastError,
    queueMutation,
    processQueue,
    syncNow: processQueue,
  };
}

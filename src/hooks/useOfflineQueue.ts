import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface QueuedItem<T> {
  id: string;
  data: T;
  timestamp: number;
  retryCount: number;
  action: 'create' | 'update' | 'delete';
}

interface UseOfflineQueueOptions<T> {
  /** Unique key for localStorage */
  storageKey: string;
  /** Function to sync item to server */
  syncFn: (item: QueuedItem<T>) => Promise<void>;
  /** Max retry attempts before giving up */
  maxRetries?: number;
  /** Show toast notifications */
  showNotifications?: boolean;
}

interface UseOfflineQueueReturn<T> {
  /** Add item to queue (works offline) */
  enqueue: (data: T, action?: 'create' | 'update' | 'delete') => string;
  /** Current queue items */
  queue: QueuedItem<T>[];
  /** Number of pending items */
  pendingCount: number;
  /** Whether currently online */
  isOnline: boolean;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Manually trigger sync */
  syncNow: () => Promise<void>;
  /** Clear all queued items */
  clearQueue: () => void;
  /** Remove specific item from queue */
  removeFromQueue: (id: string) => void;
}

/**
 * Hook for offline-first data persistence with automatic background sync.
 * Saves items to localStorage when offline and syncs when connection restores.
 */
export function useOfflineQueue<T>({
  storageKey,
  syncFn,
  maxRetries = 3,
  showNotifications = true,
}: UseOfflineQueueOptions<T>): UseOfflineQueueReturn<T> {
  const [queue, setQueue] = useState<QueuedItem<T>[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgressRef = useRef(false);
  const fullStorageKey = `offline_queue_${storageKey}`;

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(fullStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedItem<T>[];
        setQueue(parsed);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }, [fullStorageKey]);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      if (queue.length > 0) {
        localStorage.setItem(fullStorageKey, JSON.stringify(queue));
      } else {
        localStorage.removeItem(fullStorageKey);
      }
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }, [queue, fullStorageKey]);

  // Sync function
  const syncQueue = useCallback(async () => {
    if (syncInProgressRef.current || queue.length === 0 || !navigator.onLine) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    const itemsToSync = [...queue];
    const successfulIds: string[] = [];
    const failedItems: QueuedItem<T>[] = [];

    for (const item of itemsToSync) {
      try {
        await syncFn(item);
        successfulIds.push(item.id);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        
        if (item.retryCount < maxRetries) {
          failedItems.push({
            ...item,
            retryCount: item.retryCount + 1,
          });
        } else {
          console.error(`Max retries exceeded for item ${item.id}, removing from queue`);
          if (showNotifications) {
            toast.error('Failed to sync some items after multiple attempts');
          }
        }
      }
    }

    // Update queue: remove successful items, update failed items
    setQueue((prev) => {
      const remaining = prev.filter((item) => !successfulIds.includes(item.id));
      const updated = remaining.map((item) => {
        const failed = failedItems.find((f) => f.id === item.id);
        return failed || item;
      });
      return updated;
    });

    if (successfulIds.length > 0 && showNotifications) {
      toast.success(`Synced ${successfulIds.length} offline item(s)`);
    }

    setIsSyncing(false);
    syncInProgressRef.current = false;
  }, [queue, syncFn, maxRetries, showNotifications]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (showNotifications && queue.length > 0) {
        toast.info('Back online, syncing pending items...');
      }
      // Auto-sync when coming back online
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (showNotifications) {
        toast.warning('You are offline. Changes will be saved locally.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue, showNotifications, queue.length]);

  // Auto-sync on mount if online and queue has items
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      const timer = setTimeout(syncQueue, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queue.length, isSyncing, syncQueue]);

  const enqueue = useCallback((data: T, action: 'create' | 'update' | 'delete' = 'create'): string => {
    const id = crypto.randomUUID();
    const item: QueuedItem<T> = {
      id,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      action,
    };

    setQueue((prev) => [...prev, item]);

    if (!navigator.onLine && showNotifications) {
      toast.info('Saved offline. Will sync when connection restores.');
    }

    // If online, trigger sync after a short delay
    if (navigator.onLine) {
      setTimeout(syncQueue, 500);
    }

    return id;
  }, [showNotifications, syncQueue]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(fullStorageKey);
  }, [fullStorageKey]);

  return {
    enqueue,
    queue,
    pendingCount: queue.length,
    isOnline,
    isSyncing,
    syncNow: syncQueue,
    clearQueue,
    removeFromQueue,
  };
}

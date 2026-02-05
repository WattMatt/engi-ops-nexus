 /**
  * useStorageQuota Hook
  * Real-time storage monitoring with threshold warnings
  */
 
 import { useState, useEffect, useCallback, useRef } from 'react';
 import { toast } from 'sonner';
 import {
   getStorageQuota,
   requestPersistentStorage,
   formatStorageSize,
   hasShownWarningToday,
   markWarningShown,
   type StorageQuotaInfo,
   type StorageLevel,
 } from '@/lib/storageQuota';
 
 interface UseStorageQuotaOptions {
   /** Polling interval in ms (default: 30000 = 30 seconds) */
   pollInterval?: number;
   /** Whether to show toast warnings (default: true) */
   showWarnings?: boolean;
   /** Whether to start polling immediately (default: true) */
   autoStart?: boolean;
 }
 
 interface UseStorageQuotaReturn {
   /** Current storage usage in bytes */
   usage: number;
   /** Total available quota in bytes */
   quota: number;
   /** Usage percentage (0-100) */
   percentage: number;
   /** Storage health level */
   level: StorageLevel;
   /** Detailed breakdown by store */
   breakdown: StorageQuotaInfo['breakdown'];
   /** Whether storage is persisted */
   isPersisted: boolean;
   /** Whether currently loading */
   isLoading: boolean;
   /** Refresh storage info manually */
   refresh: () => Promise<void>;
   /** Request persistent storage from browser */
   requestPersistence: () => Promise<boolean>;
   /** Formatted usage string (e.g., "45.2 MB") */
   usageFormatted: string;
   /** Formatted quota string (e.g., "500 MB") */
   quotaFormatted: string;
 }
 
 export function useStorageQuota(options: UseStorageQuotaOptions = {}): UseStorageQuotaReturn {
   const {
     pollInterval = 30000,
     showWarnings = true,
     autoStart = true,
   } = options;
 
   const [info, setInfo] = useState<StorageQuotaInfo>({
     usage: 0,
     quota: 0,
     percentage: 0,
     level: 'healthy',
     breakdown: { indexedDB: 0, caches: 0, total: 0, byStore: {} },
     isPersisted: false,
   });
   const [isLoading, setIsLoading] = useState(true);
   const previousLevelRef = useRef<StorageLevel>('healthy');
   const intervalRef = useRef<NodeJS.Timeout | null>(null);
 
   // Fetch storage quota
   const refresh = useCallback(async () => {
     try {
       const quota = await getStorageQuota();
       setInfo(quota);
 
       // Check if we need to show a warning
       if (showWarnings && quota.level !== 'healthy') {
         const levelChanged = quota.level !== previousLevelRef.current;
         const alreadyShown = hasShownWarningToday(quota.level);
 
         if (levelChanged || !alreadyShown) {
           showStorageWarning(quota);
           markWarningShown(quota.level);
         }
       }
 
       previousLevelRef.current = quota.level;
     } catch (error) {
       console.error('Failed to get storage quota:', error);
     } finally {
       setIsLoading(false);
     }
   }, [showWarnings]);
 
   // Show toast warning based on level
   const showStorageWarning = (quota: StorageQuotaInfo) => {
     const usage = formatStorageSize(quota.usage);
     const total = formatStorageSize(quota.quota);
 
     switch (quota.level) {
       case 'danger':
         toast.error(
           `Storage critically full (${Math.round(quota.percentage)}%)`,
           {
             description: `${usage} / ${total} used. New offline saves are blocked. Free up space immediately.`,
             duration: 10000,
             action: {
               label: 'Manage Storage',
               onClick: () => {
                 window.location.href = '/dashboard/settings?tab=app';
               },
             },
           }
         );
         break;
 
       case 'critical':
         toast.warning(
           `Storage almost full (${Math.round(quota.percentage)}%)`,
           {
             description: `${usage} / ${total} used. Consider clearing old data.`,
             duration: 8000,
             action: {
               label: 'Manage',
               onClick: () => {
                 window.location.href = '/dashboard/settings?tab=app';
               },
             },
           }
         );
         break;
 
       case 'warning':
         toast.info(
           `Storage ${Math.round(quota.percentage)}% full`,
           {
             description: `${usage} / ${total} used. You may want to sync and clear old data.`,
             duration: 5000,
           }
         );
         break;
     }
   };
 
   // Request persistent storage
   const handleRequestPersistence = useCallback(async () => {
     const granted = await requestPersistentStorage();
     if (granted) {
       toast.success('Persistent storage granted!', {
         description: 'Your offline data is now protected from browser cleanup.',
       });
       await refresh();
     } else {
       toast.info('Persistent storage not available', {
         description: 'The browser may clear offline data when storage is low.',
       });
     }
     return granted;
   }, [refresh]);
 
   // Set up polling
   useEffect(() => {
     if (!autoStart) return;
 
     // Initial fetch
     refresh();
 
     // Set up interval
     intervalRef.current = setInterval(refresh, pollInterval);
 
     return () => {
       if (intervalRef.current) {
         clearInterval(intervalRef.current);
       }
     };
   }, [refresh, pollInterval, autoStart]);
 
   return {
     usage: info.usage,
     quota: info.quota,
     percentage: info.percentage,
     level: info.level,
     breakdown: info.breakdown,
     isPersisted: info.isPersisted,
     isLoading,
     refresh,
     requestPersistence: handleRequestPersistence,
     usageFormatted: formatStorageSize(info.usage),
     quotaFormatted: formatStorageSize(info.quota),
   };
 }
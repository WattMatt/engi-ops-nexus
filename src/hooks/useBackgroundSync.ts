 /**
  * Background Sync Hook
  * Registers and manages service worker background sync for offline data
  */
 
 import { useEffect, useCallback, useRef } from 'react';
 import { getSyncQueue } from '@/lib/offlineStorage';
 
 interface UseBackgroundSyncOptions {
   /** Callback when background sync is triggered */
   onSyncTriggered?: () => void;
   /** Whether to auto-register sync when queue has items */
   autoRegister?: boolean;
 }
 
 export function useBackgroundSync({
   onSyncTriggered,
   autoRegister = true,
 }: UseBackgroundSyncOptions = {}) {
   const syncCallbackRef = useRef(onSyncTriggered);
   
   // Keep callback ref updated
   useEffect(() => {
     syncCallbackRef.current = onSyncTriggered;
   }, [onSyncTriggered]);
 
   // Listen for messages from service worker
   useEffect(() => {
     const handleMessage = (event: MessageEvent) => {
       if (event.data?.type === 'BACKGROUND_SYNC_TRIGGERED') {
         console.log('[BackgroundSync] Sync triggered by service worker');
         syncCallbackRef.current?.();
       }
     };
 
     navigator.serviceWorker?.addEventListener('message', handleMessage);
     
     return () => {
       navigator.serviceWorker?.removeEventListener('message', handleMessage);
     };
   }, []);
 
   // Request sync registration
   const requestSync = useCallback(async () => {
     if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
       console.log('[BackgroundSync] Background sync not supported');
       return false;
     }
 
     try {
       const registration = await navigator.serviceWorker.ready;
       
       // Get pending count
       const queue = await getSyncQueue();
       
       if (queue.length > 0) {
         // Notify service worker to register sync
         registration.active?.postMessage({
           type: 'QUEUE_SYNC',
           pendingCount: queue.length,
         });
         
         console.log('[BackgroundSync] Sync request sent to SW');
         return true;
       }
       
       return false;
     } catch (error) {
       console.error('[BackgroundSync] Failed to request sync:', error);
       return false;
     }
   }, []);
 
   // Register periodic sync (if supported)
   const registerPeriodicSync = useCallback(async (minInterval: number = 60000) => {
     if (!('serviceWorker' in navigator)) return false;
     
     try {
       const registration = await navigator.serviceWorker.ready;
       
       // Check if periodic sync is supported
       if ('periodicSync' in registration) {
         const status = await navigator.permissions.query({
           name: 'periodic-background-sync' as PermissionName,
         });
         
         if (status.state === 'granted') {
           await (registration as any).periodicSync.register('periodic-offline-sync', {
             minInterval,
           });
           console.log('[BackgroundSync] Periodic sync registered');
           return true;
         }
       }
       
       return false;
     } catch (error) {
       console.error('[BackgroundSync] Periodic sync registration failed:', error);
       return false;
     }
   }, []);
 
   // Auto-register sync when queue has items
   useEffect(() => {
     if (!autoRegister) return;
 
     const checkAndRegister = async () => {
       const queue = await getSyncQueue();
       if (queue.length > 0 && navigator.onLine) {
         requestSync();
       }
     };
 
     // Check on mount and when coming online
     checkAndRegister();
     
     const handleOnline = () => checkAndRegister();
     window.addEventListener('online', handleOnline);
     
     return () => {
       window.removeEventListener('online', handleOnline);
     };
   }, [autoRegister, requestSync]);
 
   return {
     requestSync,
     registerPeriodicSync,
   };
 }
 
 export default useBackgroundSync;
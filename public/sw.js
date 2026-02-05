 // Service Worker for Push Notifications and Background Sync
 
 // ============================================
 // Background Sync for Offline Data
 // ============================================
 
 const SYNC_TAG = 'offline-sync';
 const SYNC_QUEUE_KEY = 'sync-queue-pending';
 
 // Register for background sync when changes are queued
 self.addEventListener('message', function(event) {
   if (event.data && event.data.type === 'QUEUE_SYNC') {
     console.log('[Service Worker] Sync request received');
     
     // Store the sync request info
     if (event.data.pendingCount > 0) {
       self.registration.sync.register(SYNC_TAG).then(() => {
         console.log('[Service Worker] Background sync registered');
       }).catch((err) => {
         console.log('[Service Worker] Background sync registration failed:', err);
       });
     }
   }
   
   if (event.data && event.data.type === 'SKIP_WAITING') {
     self.skipWaiting();
   }
 });
 
 // Handle background sync event
 self.addEventListener('sync', function(event) {
   console.log('[Service Worker] Sync event triggered:', event.tag);
   
   if (event.tag === SYNC_TAG) {
     event.waitUntil(performBackgroundSync());
   }
 });
 
 // Perform the actual sync operation
 async function performBackgroundSync() {
   console.log('[Service Worker] Performing background sync...');
   
   try {
     // Notify all clients to trigger their sync
     const clients = await self.clients.matchAll({ type: 'window' });
     
     for (const client of clients) {
       client.postMessage({
         type: 'BACKGROUND_SYNC_TRIGGERED',
         timestamp: Date.now(),
       });
     }
     
     console.log('[Service Worker] Background sync notification sent to clients');
     return true;
   } catch (error) {
     console.error('[Service Worker] Background sync failed:', error);
     throw error; // Rethrow to retry
   }
 }
 
 // ============================================
 // Push Notifications
 // ============================================
 
 self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);

  let data = { title: 'New Message', body: 'You have a new message' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[Service Worker] Error parsing push data:', e);
  }

  const options = {
    body: data.body || 'You have a new message',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      conversationId: data.conversationId,
      url: data.url || '/dashboard/messages'
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.conversationId || 'message-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'New Message', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard/messages';
  const conversationId = event.notification.data?.conversationId;
  
  const finalUrl = conversationId 
    ? `/dashboard/messages?conversation=${conversationId}`
    : urlToOpen;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.navigate(finalUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(finalUrl);
      }
    })
  );
});

 // ============================================
 // Lifecycle Events
 // ============================================
 
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});
 
 // ============================================
 // Periodic Background Sync (if supported)
 // ============================================
 
 self.addEventListener('periodicsync', function(event) {
   if (event.tag === 'periodic-offline-sync') {
     console.log('[Service Worker] Periodic sync triggered');
     event.waitUntil(performBackgroundSync());
   }
 });
 
 // ============================================
 // Fetch Event - Network First Strategy for API calls
 // ============================================
 
 self.addEventListener('fetch', function(event) {
   const url = new URL(event.request.url);
   
   // Only handle API requests to Supabase
   if (url.hostname.includes('supabase.co') && event.request.method === 'GET') {
     event.respondWith(
       fetch(event.request)
         .then((response) => {
           // Clone the response for caching
           const responseClone = response.clone();
           
           caches.open('api-cache').then((cache) => {
             cache.put(event.request, responseClone);
           });
           
           return response;
         })
         .catch(() => {
           // Return cached response if offline
           return caches.match(event.request);
         })
     );
   }
 });

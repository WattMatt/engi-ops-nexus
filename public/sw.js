// Service Worker for Push Notifications
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

self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});

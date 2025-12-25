// TIME BEYOND US Platform Service Worker
// Version 1.0.0 - PWA Support

const CACHE_NAME = 'time-trading-v1';
const STATIC_ASSETS = [
  '/',
  '/trade',
  '/portfolio',
  '/autopilot',
  '/timebeunus',
  '/icon.svg',
  '/favicon.svg',
  '/apple-touch-icon.svg',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests and WebSocket connections
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'TIME BEYOND US',
    body: 'You have a new notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: {},
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
      };
    }
  } catch (error) {
    console.error('[SW] Error parsing push notification data:', error);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    vibrate: [200, 100, 200],
    tag: data.data?.type || 'notification',
    requireInteraction: data.data?.priority === 'critical',
    data: data.data,
    actions: data.data?.url ? [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ] : [
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );

  // Notify all clients about the new notification
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      console.log(`[SW] Notifying ${clients.length} client(s) about push notification`);
      clients.forEach((client) => {
        client.postMessage({
          type: 'PUSH_NOTIFICATION',
          payload: data,
        });
      });
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            // Navigate to the notification URL
            if (url !== '/') {
              client.postMessage({
                type: 'NAVIGATE',
                url: url,
              });
            }
          });
        }
      }
      // No window open, open new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline trades
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncPendingTrades());
  }
});

async function syncPendingTrades() {
  // Get pending trades from IndexedDB
  // This would sync trades that were made while offline
  console.log('[SW] Syncing pending trades...');
}

console.log('[SW] TIME BEYOND US Service Worker v1.0.0 loaded');

// TIME BEYOND US Platform Service Worker
// Version 3.0.0 - Enhanced Caching + Offline Support + Push Notifications

const CACHE_NAME = 'time-trading-v3';
const STATIC_CACHE = 'time-static-v3';
const DYNAMIC_CACHE = 'time-dynamic-v3';

// Core pages that should always be cached
const STATIC_ASSETS = [
  '/',
  '/trade',
  '/portfolio',
  '/autopilot',
  '/timebeunus',
  '/notifications',
  '/settings',
  '/signals',
  '/bots',
  '/strategies',
  '/markets',
  '/alerts',
  '/analytics',
  '/login',
  '/icon.svg',
  '/favicon.svg',
  '/apple-touch-icon.svg',
  '/manifest.json',
];

// Cache limits
const MAX_DYNAMIC_CACHE_ITEMS = 50;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Notification category icons (emoji fallbacks)
const CATEGORY_ICONS = {
  trade: '/icons/trade.svg',
  bot: '/icons/bot.svg',
  price: '/icons/price.svg',
  big_moves: '/icons/big-moves.svg',
  security: '/icons/security.svg',
  marketing: '/icons/marketing.svg',
  system: '/icons/system.svg',
};

// Notification sounds (optional)
const NOTIFICATION_SOUNDS = {
  critical: '/sounds/critical.mp3',
  high: '/sounds/alert.mp3',
  medium: '/sounds/notification.mp3',
  low: '/sounds/soft.mp3',
};

// ============================================================
// INSTALL & ACTIVATE
// ============================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ============================================================
// FETCH HANDLER - Stale While Revalidate Strategy
// ============================================================

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API calls and WebSocket connections
  if (url.pathname.startsWith('/api') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Use cache-first for static assets (images, fonts, etc.)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Use stale-while-revalidate for pages and JS/CSS
  event.respondWith(staleWhileRevalidate(event.request));
});

function isStaticAsset(pathname) {
  return /\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
        // Trim cache if too large
        trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
      }
      return response;
    })
    .catch(() => {
      // Network failed, return cached or offline page
      if (request.mode === 'navigate') {
        return caches.match('/') || offlinePage();
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    });

  // Return cached immediately, fetch in background
  return cached || fetchPromise;
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest items (FIFO)
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

function offlinePage() {
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>TIME - Offline</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: system-ui, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #0f172a;
          color: #e2e8f0;
          text-align: center;
        }
        .container { padding: 2rem; }
        h1 { color: #7c3aed; margin-bottom: 1rem; }
        p { color: #94a3b8; margin-bottom: 2rem; }
        button {
          background: #7c3aed;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover { background: #6d28d9; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⏱️ TIME BEYOND US</h1>
        <p>You appear to be offline. Check your connection and try again.</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    </body>
    </html>
  `, {
    status: 503,
    headers: { 'Content-Type': 'text/html' }
  });
}

// ============================================================
// ENHANCED PUSH NOTIFICATION HANDLER
// ============================================================

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
      data = { ...data, ...payload };
    }
  } catch (error) {
    console.error('[SW] Error parsing push notification data:', error);
  }

  // Determine notification category and customize appearance
  const category = data.data?.category || getCategoryFromType(data.data?.type || '');
  const priority = data.data?.priority || 'medium';

  // Build notification options
  const options = buildNotificationOptions(data, category, priority);

  // Show notification
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );

  // Broadcast to all clients
  event.waitUntil(
    broadcastToClients({
      type: 'PUSH_NOTIFICATION',
      payload: data,
      category,
      priority,
      timestamp: Date.now(),
    })
  );

  // Track notification for analytics
  event.waitUntil(
    trackNotificationReceived(data)
  );
});

function getCategoryFromType(type) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('trade') || lowerType.includes('executed')) return 'trade';
  if (lowerType.includes('bot') || lowerType.includes('signal')) return 'bot';
  if (lowerType.includes('price') || lowerType.includes('alert')) return 'price';
  if (lowerType.includes('big_moves') || lowerType.includes('market_move')) return 'big_moves';
  if (lowerType.includes('security') || lowerType.includes('login')) return 'security';
  if (lowerType.includes('marketing') || lowerType.includes('promo')) return 'marketing';
  return 'system';
}

function buildNotificationOptions(data, category, priority) {
  // Base vibration patterns
  const vibrationPatterns = {
    critical: [300, 100, 300, 100, 300],
    high: [200, 100, 200],
    medium: [200],
    low: [100],
  };

  // Badge colors by category
  const badgeByCategory = {
    trade: '/icons/badge-trade.svg',
    bot: '/icons/badge-bot.svg',
    price: '/icons/badge-price.svg',
    big_moves: '/icons/badge-alert.svg',
    security: '/icons/badge-security.svg',
    marketing: '/icons/badge-promo.svg',
    system: '/icon.svg',
  };

  // Build actions based on category and data
  const actions = buildActions(data, category);

  return {
    body: data.body,
    icon: data.icon || CATEGORY_ICONS[category] || '/icon.svg',
    badge: badgeByCategory[category] || '/icon.svg',
    image: data.data?.image, // Optional large image
    vibrate: vibrationPatterns[priority] || vibrationPatterns.medium,
    tag: `${category}-${data.data?.id || Date.now()}`,
    renotify: priority === 'critical', // Re-alert for critical
    requireInteraction: priority === 'critical' || priority === 'high',
    silent: priority === 'low',
    data: {
      ...data.data,
      category,
      priority,
      receivedAt: Date.now(),
    },
    actions,
    timestamp: data.data?.timestamp || Date.now(),
  };
}

function buildActions(data, category) {
  const actions = [];

  // Category-specific actions
  switch (category) {
    case 'trade':
      actions.push({ action: 'view-trade', title: 'View Trade' });
      actions.push({ action: 'portfolio', title: 'Portfolio' });
      break;
    case 'bot':
      actions.push({ action: 'view-bot', title: 'View Bot' });
      actions.push({ action: 'autopilot', title: 'Autopilot' });
      break;
    case 'price':
      if (data.data?.symbol) {
        actions.push({ action: 'trade-now', title: 'Trade' });
      }
      actions.push({ action: 'view-alerts', title: 'Alerts' });
      break;
    case 'big_moves':
      if (data.data?.symbol) {
        actions.push({ action: 'trade-now', title: 'Trade Now' });
      }
      actions.push({ action: 'view-markets', title: 'Markets' });
      break;
    case 'security':
      actions.push({ action: 'view-security', title: 'Review' });
      actions.push({ action: 'secure-account', title: 'Secure' });
      break;
    case 'marketing':
      if (data.data?.ctaUrl) {
        actions.push({ action: 'learn-more', title: data.data.ctaText || 'Learn More' });
      }
      break;
    default:
      if (data.data?.url) {
        actions.push({ action: 'view', title: 'View' });
      }
  }

  actions.push({ action: 'dismiss', title: 'Dismiss' });

  return actions.slice(0, 3); // Max 3 actions
}

async function broadcastToClients(message) {
  const allClients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  });

  console.log(`[SW] Broadcasting to ${allClients.length} client(s)`);

  allClients.forEach((client) => {
    client.postMessage(message);
  });
}

async function trackNotificationReceived(data) {
  // Could send analytics to backend
  console.log('[SW] Notification tracked:', {
    type: data.data?.type,
    category: data.data?.category,
    priority: data.data?.priority,
    timestamp: Date.now(),
  });
}

// ============================================================
// NOTIFICATION CLICK HANDLER
// ============================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  const data = event.notification.data || {};
  const category = data.category || 'system';
  let targetUrl = '/';

  // Determine URL based on action
  switch (event.action) {
    case 'dismiss':
      return;
    case 'view-trade':
    case 'portfolio':
      targetUrl = '/portfolio';
      break;
    case 'view-bot':
    case 'autopilot':
      targetUrl = '/autopilot';
      break;
    case 'trade-now':
      targetUrl = data.symbol ? `/trade?symbol=${data.symbol}` : '/trade';
      break;
    case 'view-alerts':
      targetUrl = '/alerts';
      break;
    case 'view-markets':
      targetUrl = '/markets';
      break;
    case 'view-security':
    case 'secure-account':
      targetUrl = '/settings?tab=security';
      break;
    case 'learn-more':
      targetUrl = data.ctaUrl || '/offers';
      break;
    case 'view':
    default:
      targetUrl = data.url || '/notifications';
  }

  event.waitUntil(
    handleNotificationClick(targetUrl, data)
  );
});

async function handleNotificationClick(targetUrl, data) {
  // Try to focus existing window
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of allClients) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      await client.focus();
      client.postMessage({
        type: 'NAVIGATE',
        url: targetUrl,
        notificationData: data,
      });
      return;
    }
  }

  // Open new window if none exists
  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl);
  }
}

// ============================================================
// NOTIFICATION CLOSE HANDLER
// ============================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');

  // Track notification dismissal
  const data = event.notification.data || {};
  broadcastToClients({
    type: 'NOTIFICATION_DISMISSED',
    notificationId: data.id,
    category: data.category,
    timestamp: Date.now(),
  });
});

// ============================================================
// BACKGROUND SYNC
// ============================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  switch (event.tag) {
    case 'sync-trades':
      event.waitUntil(syncPendingTrades());
      break;
    case 'sync-notifications':
      event.waitUntil(syncNotifications());
      break;
    case 'sync-preferences':
      event.waitUntil(syncPreferences());
      break;
  }
});

async function syncPendingTrades() {
  console.log('[SW] Syncing pending trades...');
  // Implementation for offline trade sync
}

async function syncNotifications() {
  console.log('[SW] Syncing notifications...');
  // Fetch latest notifications from server
}

async function syncPreferences() {
  console.log('[SW] Syncing preferences...');
  // Sync notification preferences
}

// ============================================================
// PERIODIC BACKGROUND SYNC (if supported)
// ============================================================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNewNotifications());
  }
});

async function checkForNewNotifications() {
  console.log('[SW] Checking for new notifications...');
  // Could poll server for new notifications when app is closed
}

// ============================================================
// MESSAGE HANDLER
// ============================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data?.type);

  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.delete(CACHE_NAME).then(() => {
          console.log('[SW] Cache cleared');
        })
      );
      break;
    case 'GET_VERSION':
      event.source?.postMessage({
        type: 'VERSION',
        version: '3.0.0',
      });
      break;
  }
});

console.log('[SW] TIME BEYOND US Service Worker v3.0.0 loaded');

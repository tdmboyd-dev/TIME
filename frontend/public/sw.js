// TIME BEYOND US Platform Service Worker
// Version 2.0.0 - Enhanced Push Notifications + PWA Support

const CACHE_NAME = 'time-trading-v2';
const STATIC_ASSETS = [
  '/',
  '/trade',
  '/portfolio',
  '/autopilot',
  '/timebeunus',
  '/notifications',
  '/settings',
  '/icon.svg',
  '/favicon.svg',
  '/apple-touch-icon.svg',
  '/manifest.json',
];

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
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ============================================================
// FETCH HANDLER
// ============================================================

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

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
        version: '2.0.0',
      });
      break;
  }
});

console.log('[SW] TIME BEYOND US Service Worker v2.0.0 loaded');

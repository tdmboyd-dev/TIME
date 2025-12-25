# Push Notifications System - TIME BEYOND US

Complete push notification implementation using Web Push API for real-time notifications.

## Features

- **Web Push API Integration**: Native browser push notifications
- **Multiple Notification Types**: Trade executions, alerts, bot updates, system messages
- **Real-time Delivery**: Instant notifications even when app is not active
- **In-App Toast Notifications**: Beautiful toast notifications when app is open
- **Notification Center**: Complete notification history and management
- **Unread Counter**: Badge showing unread notification count
- **Service Worker**: Background notification handling
- **Priority Levels**: Low, medium, high, and critical priorities
- **Rich Notifications**: Support for icons, badges, and custom data
- **Notification Actions**: Click to navigate to relevant pages

## Architecture

### Backend Components

1. **Database Schema** (`src/backend/database/schemas.ts`)
   - `NotificationSchema`: Store notification history
   - `PushSubscriptionSchema`: Store user push subscriptions
   - Indexes for efficient querying

2. **Push Service** (`src/backend/notifications/push_service.ts`)
   - `sendPushNotification()`: Send to single user
   - `sendBulkNotification()`: Send to multiple users
   - `subscribePushNotification()`: Register subscription
   - `unsubscribePushNotification()`: Remove subscription
   - Event-specific helpers: trade executions, alerts, bot updates

3. **API Routes** (`src/backend/routes/notifications.ts`)
   - `POST /api/notifications/subscribe` - Subscribe to push
   - `POST /api/notifications/unsubscribe` - Unsubscribe
   - `GET /api/notifications/history` - Get notification history
   - `GET /api/notifications/unread-count` - Get unread count
   - `PUT /api/notifications/:id/read` - Mark as read
   - `DELETE /api/notifications/:id` - Delete notification
   - `GET /api/notifications/vapid-public-key` - Get VAPID key

### Frontend Components

1. **NotificationProvider** (`frontend/src/components/notifications/NotificationProvider.tsx`)
   - React Context for managing notifications
   - Auto-subscribe on permission grant
   - In-app toast notifications
   - Refresh notification history
   - Mark as read/unread

2. **Notifications Page** (`frontend/src/app/notifications/page.tsx`)
   - Complete notification center
   - Filter by type and read status
   - Mark all as read
   - Delete notifications
   - Notification preferences

3. **TopNav Integration** (`frontend/src/components/layout/TopNav.tsx`)
   - Notification bell icon with unread badge
   - Click to navigate to notifications page

4. **Service Worker** (`frontend/public/sw.js`)
   - Background push notification handling
   - Notification click handling
   - Navigate to app when notification clicked

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend
npm install web-push

# Or if using yarn
yarn add web-push
```

The package is already added to `package.json`:
- `web-push`: ^3.6.7
- `@types/web-push`: ^3.6.3

### 2. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push API:

```bash
npx web-push generate-vapid-keys
```

This will output something like:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key: UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
```

### 3. Configure Environment Variables

Add to your `.env` file:

```env
# Push Notifications (Web Push API)
# Generate using: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
VAPID_EMAIL=mailto:notifications@timebeyondus.com
```

**IMPORTANT**: Use your own generated keys, not the example ones above!

### 4. Frontend Environment Variables

Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Or for production:

```env
NEXT_PUBLIC_API_URL=https://time-backend-hosting.fly.dev
```

### 5. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

## Usage

### For Users

1. **Enable Notifications**
   - Visit the notifications page at `/notifications`
   - Click "Enable Notifications" button
   - Grant permission when browser prompts
   - Notifications will now work across all devices

2. **Manage Notifications**
   - View all notifications in the notification center
   - Mark individual notifications as read
   - Mark all as read with one click
   - Delete notifications you don't need
   - Filter by type (trades, alerts, bots, system)
   - Filter by read/unread status

3. **Notification Types**
   - **Trade Executed**: When a trade is executed
   - **Alert Triggered**: When a price alert is triggered
   - **Bot Update**: When a bot status changes
   - **System Update**: Platform announcements

### For Developers

#### Send a Push Notification

```typescript
import pushService from '../notifications/push_service';

// Send to specific user
await pushService.sendPushNotification(
  userId,
  'Trade Executed',
  'BUY 100 AAPL @ $175.50',
  {
    type: 'TRADE_EXECUTED',
    priority: 'high',
    url: '/portfolio',
    symbol: 'AAPL',
    direction: 'long',
    quantity: 100,
    price: 175.50,
  }
);

// Send to multiple users
await pushService.sendBulkNotification(
  ['user1', 'user2', 'user3'],
  'Market Alert',
  'SPY dropped 2% in 15 minutes',
  {
    type: 'ALERT_TRIGGERED',
    priority: 'critical',
    url: '/alerts',
  }
);
```

#### Use Event-Specific Helpers

```typescript
// Trade executed
await pushService.sendTradeExecutedNotification(userId, {
  symbol: 'AAPL',
  direction: 'long',
  quantity: 100,
  price: 175.50,
  botName: 'Momentum Bot',
});

// Alert triggered
await pushService.sendAlertTriggeredNotification(userId, {
  symbol: 'SPY',
  condition: 'price_drop',
  message: 'SPY dropped below $450',
});

// Bot update
await pushService.sendBotUpdateNotification(userId, {
  botName: 'Scalper Bot',
  updateType: 'started',
  message: 'Scalper Bot has started trading',
});

// System update
await pushService.sendSystemUpdateNotification(
  userId,
  'Platform upgrade completed successfully',
  'medium'
);
```

#### Frontend Usage

```typescript
// In any component
import { useNotifications } from '@/components/notifications/NotificationProvider';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    isSubscribed,
    permission,
    requestPermission,
    subscribeToPush,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {!isSubscribed && (
        <button onClick={requestPermission}>
          Enable Notifications
        </button>
      )}
    </div>
  );
}
```

## Browser Support

Web Push API is supported in:
- Chrome 50+
- Firefox 44+
- Edge 17+
- Safari 16+ (macOS 13+ and iOS 16.4+)
- Opera 37+

## Security Considerations

1. **VAPID Keys**: Keep private key secret, only public key should be exposed
2. **HTTPS Required**: Push notifications only work over HTTPS (except localhost)
3. **User Consent**: Always request permission before subscribing
4. **Data Privacy**: Don't send sensitive data in notification payloads

## Testing

### Test Push Notification (Admin Only)

```bash
curl -X POST http://localhost:5000/api/v1/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {
      "type": "SYSTEM_UPDATE",
      "priority": "medium"
    }
  }'
```

### Manual Testing

1. Start the backend: `npm run dev:backend`
2. Start the frontend: `npm run dev:frontend`
3. Open browser to `http://localhost:3000`
4. Navigate to `/notifications`
5. Click "Enable Notifications"
6. Use admin endpoint or trigger events to send notifications

## Troubleshooting

### Notifications Not Appearing

1. Check browser console for errors
2. Verify VAPID keys are correctly set
3. Ensure HTTPS is being used (or localhost)
4. Check notification permission status
5. Verify service worker is registered

### Service Worker Issues

```javascript
// Check service worker status
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
});

// Check push subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub);
  });
});
```

### Common Errors

- **"Push notifications not supported"**: Browser doesn't support Push API
- **"User denied permission"**: User clicked "Block" on permission prompt
- **"VAPID keys not configured"**: Environment variables not set
- **410 Gone**: Push subscription expired, need to resubscribe

## Production Deployment

### Backend

1. Set environment variables in production:
   ```bash
   VAPID_PUBLIC_KEY=your-production-public-key
   VAPID_PRIVATE_KEY=your-production-private-key
   VAPID_EMAIL=mailto:notifications@timebeyondus.com
   ```

2. Ensure HTTPS is configured
3. Configure CORS to allow frontend domain
4. Set up database for persistent storage (replace in-memory storage)

### Frontend

1. Update `NEXT_PUBLIC_API_URL` to production backend URL
2. Ensure service worker is registered
3. Test on multiple browsers and devices
4. Monitor notification delivery rates

## Database Integration

The current implementation uses in-memory storage. For production, integrate with MongoDB:

```typescript
// Example MongoDB integration
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db('time');
const subscriptionsCollection = db.collection('pushSubscriptions');
const notificationsCollection = db.collection('notifications');

// Save subscription
await subscriptionsCollection.insertOne({
  userId,
  endpoint: subscription.endpoint,
  keys: subscription.keys,
  createdAt: new Date(),
  isActive: true,
});

// Save notification
await notificationsCollection.insertOne({
  userId,
  type: 'TRADE_EXECUTED',
  title,
  message: body,
  createdAt: new Date(),
  readAt: null,
  data,
});
```

## Performance Optimization

1. **Batch Notifications**: Use `sendBulkNotification()` for multiple users
2. **Rate Limiting**: Implement rate limiting to prevent spam
3. **Delivery Tracking**: Track delivery success/failure rates
4. **Cleanup**: Periodically remove old/expired subscriptions
5. **Caching**: Cache VAPID keys and frequently accessed data

## Analytics

Track notification metrics:
- Delivery rate
- Click-through rate
- Permission grant rate
- Subscription retention
- Popular notification types

## Future Enhancements

- [ ] Rich notifications with images
- [ ] Notification scheduling
- [ ] User-specific notification preferences per type
- [ ] Notification templates
- [ ] A/B testing for notification copy
- [ ] Analytics dashboard
- [ ] Email fallback when push fails
- [ ] Multi-language support

## Support

For issues or questions:
- Check browser console logs
- Review service worker logs
- Test with admin test endpoint
- Verify environment variables
- Check browser compatibility

## License

Proprietary - TIME BEYOND US

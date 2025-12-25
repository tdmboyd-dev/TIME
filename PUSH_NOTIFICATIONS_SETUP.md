# Quick Setup Guide - Push Notifications

Get push notifications working in 5 minutes!

## Step 1: Generate VAPID Keys

Run this command in your terminal:

```bash
npx web-push generate-vapid-keys
```

You'll get output like this:
```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls

=======================================
```

## Step 2: Add to .env File

Add these lines to your `.env` file in the project root:

```env
# Push Notifications (Web Push API)
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
VAPID_EMAIL=mailto:notifications@timebeyondus.com
```

Replace `YOUR_PUBLIC_KEY_HERE` and `YOUR_PRIVATE_KEY_HERE` with the keys from Step 1.

## Step 3: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

## Step 4: Start the Servers

```bash
# Start both backend and frontend
npm run dev

# Or start separately:
# Backend: npm run dev:backend
# Frontend: npm run dev:frontend
```

## Step 5: Enable Notifications

1. Open your browser to `http://localhost:3000`
2. Log in to your account
3. Click the notification bell icon in the top navigation
4. Click "Enable Notifications"
5. Allow notifications when your browser prompts

That's it! You're ready to receive push notifications.

## Testing

### Send a Test Notification (Admin Only)

Use the admin test endpoint:

```bash
curl -X POST http://localhost:5000/api/v1/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test from TIME BEYOND US!"
  }'
```

### Trigger Notifications from Code

In any backend file:

```typescript
import pushService from './notifications/push_service';

// Send a notification
await pushService.sendPushNotification(
  userId,
  'Trade Alert',
  'Your trade was executed successfully!',
  {
    type: 'TRADE_EXECUTED',
    priority: 'high',
    url: '/portfolio',
  }
);
```

## Troubleshooting

### "VAPID keys not configured" Error

- Make sure you added the keys to `.env` file
- Restart the backend server after adding the keys
- Check that the keys don't have extra spaces

### Notifications Not Showing

1. Check browser permissions:
   - Chrome: Settings > Privacy and security > Site settings > Notifications
   - Firefox: Preferences > Privacy & Security > Permissions > Notifications

2. Verify service worker is registered:
   - Open DevTools > Application > Service Workers
   - Should see `sw.js` registered

3. Check browser console for errors

### "Push notifications not supported"

- Use a supported browser (Chrome, Firefox, Edge, Safari 16+)
- Make sure you're on HTTPS (or localhost)
- Service workers require modern browsers

## Browser Compatibility

- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Safari 16+ (macOS 13+, iOS 16.4+)
- ✅ Opera 37+
- ❌ Internet Explorer (not supported)

## Production Deployment

For production, make sure to:

1. Use HTTPS (required for push notifications)
2. Update `NEXT_PUBLIC_API_URL` in frontend `.env`
3. Set all VAPID environment variables
4. Test on multiple browsers and devices

## Need Help?

Check the full documentation: `PUSH_NOTIFICATIONS_README.md`

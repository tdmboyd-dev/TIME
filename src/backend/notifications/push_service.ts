/**
 * Push Notification Service
 *
 * Web Push API integration for TIME BEYOND US
 * - Send push notifications to subscribed users
 * - Manage push subscriptions
 * - Support for bulk notifications
 * - Notification types: TRADE_EXECUTED, ALERT_TRIGGERED, BOT_UPDATE, SYSTEM_UPDATE
 */

import webpush from 'web-push';
import { NotificationType, PushSubscriptionSchema, NotificationSchema } from '../database/schemas';
import logger from '../utils/logger';

// Initialize web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'noreply@timebeyondus.com';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  logger.warn('VAPID keys not configured. Push notifications will not work. Generate keys with: npx web-push generate-vapid-keys');
} else {
  webpush.setVapidDetails(
    `mailto:${VAPID_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// In-memory storage (replace with MongoDB in production)
const pushSubscriptions = new Map<string, PushSubscriptionSchema[]>();
const notifications = new Map<string, NotificationSchema[]>();

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  url?: string;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  try {
    const userSubscriptions = pushSubscriptions.get(userId) || [];
    const activeSubscriptions = userSubscriptions.filter(sub => sub.isActive);

    if (activeSubscriptions.length === 0) {
      logger.info(`No active push subscriptions for user ${userId}`);
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    const payload: PushPayload = {
      title,
      body,
      icon: '/icon.svg',
      badge: '/badge.svg',
      data: {
        ...data,
        timestamp: Date.now(),
        url: data?.url || '/',
      },
    };

    let sentCount = 0;
    let failedCount = 0;

    // Send to all active subscriptions
    await Promise.all(
      activeSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
              },
            },
            JSON.stringify(payload)
          );

          // Update last used timestamp
          subscription.lastUsedAt = new Date();
          sentCount++;

          logger.info(`Push notification sent to user ${userId}`, {
            endpoint: subscription.endpoint.substring(0, 50) + '...',
          });
        } catch (error: any) {
          failedCount++;

          // Handle expired/invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            subscription.isActive = false;
            logger.warn(`Push subscription expired for user ${userId}`, {
              endpoint: subscription.endpoint.substring(0, 50) + '...',
            });
          } else {
            logger.error(`Failed to send push notification to user ${userId}`, {
              error: error.message,
              statusCode: error.statusCode,
            });
          }
        }
      })
    );

    // Store notification in database
    const notification: NotificationSchema = {
      _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: (data?.type as NotificationType) || 'SYSTEM_UPDATE',
      title,
      message: body,
      priority: data?.priority || 'medium',
      createdAt: new Date(),
      channels: {
        email: false,
        sms: false,
        push: true,
      },
      sentAt: new Date(),
      data,
      actionRequired: false,
    };

    const userNotifications = notifications.get(userId) || [];
    userNotifications.unshift(notification);
    notifications.set(userId, userNotifications);

    return { success: true, sentCount, failedCount };
  } catch (error) {
    logger.error('Error sending push notification', { error, userId, title });
    return { success: false, sentCount: 0, failedCount: 0 };
  }
}

/**
 * Send bulk notifications to multiple users
 */
export async function sendBulkNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ totalUsers: number; totalSent: number; totalFailed: number }> {
  logger.info(`Sending bulk push notification to ${userIds.length} users`, { title });

  const results = await Promise.all(
    userIds.map(userId => sendPushNotification(userId, title, body, data))
  );

  const totalSent = results.reduce((sum, r) => sum + r.sentCount, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failedCount, 0);

  logger.info('Bulk push notification complete', {
    totalUsers: userIds.length,
    totalSent,
    totalFailed,
  });

  return {
    totalUsers: userIds.length,
    totalSent,
    totalFailed,
  };
}

/**
 * Subscribe user to push notifications
 */
export async function subscribePushNotification(
  userId: string,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userSubscriptions = pushSubscriptions.get(userId) || [];

    // Check if subscription already exists
    const existingIndex = userSubscriptions.findIndex(
      sub => sub.endpoint === subscription.endpoint
    );

    if (existingIndex !== -1) {
      // Update existing subscription
      userSubscriptions[existingIndex] = {
        ...userSubscriptions[existingIndex],
        keys: subscription.keys,
        lastUsedAt: new Date(),
        isActive: true,
        userAgent,
      };
    } else {
      // Add new subscription
      const newSubscription: PushSubscriptionSchema = {
        _id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
        deviceName: detectDeviceName(userAgent),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        isActive: true,
      };
      userSubscriptions.push(newSubscription);
    }

    pushSubscriptions.set(userId, userSubscriptions);

    logger.info(`User ${userId} subscribed to push notifications`, {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
    });

    return {
      success: true,
      message: 'Successfully subscribed to push notifications',
    };
  } catch (error) {
    logger.error('Error subscribing to push notifications', { error, userId });
    return {
      success: false,
      message: 'Failed to subscribe to push notifications',
    };
  }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribePushNotification(
  userId: string,
  endpoint: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userSubscriptions = pushSubscriptions.get(userId) || [];
    const subscriptionIndex = userSubscriptions.findIndex(
      sub => sub.endpoint === endpoint
    );

    if (subscriptionIndex !== -1) {
      userSubscriptions[subscriptionIndex].isActive = false;
      pushSubscriptions.set(userId, userSubscriptions);

      logger.info(`User ${userId} unsubscribed from push notifications`, {
        endpoint: endpoint.substring(0, 50) + '...',
      });

      return {
        success: true,
        message: 'Successfully unsubscribed from push notifications',
      };
    }

    return {
      success: false,
      message: 'Subscription not found',
    };
  } catch (error) {
    logger.error('Error unsubscribing from push notifications', { error, userId });
    return {
      success: false,
      message: 'Failed to unsubscribe from push notifications',
    };
  }
}

/**
 * Get notification history for a user
 */
export async function getNotificationHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<NotificationSchema[]> {
  const userNotifications = notifications.get(userId) || [];
  return userNotifications.slice(offset, offset + limit);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<{ success: boolean }> {
  const userNotifications = notifications.get(userId) || [];
  const notification = userNotifications.find(n => n._id === notificationId);

  if (notification && !notification.readAt) {
    notification.readAt = new Date();
    notifications.set(userId, userNotifications);
    return { success: true };
  }

  return { success: false };
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; count: number }> {
  const userNotifications = notifications.get(userId) || [];
  let count = 0;

  userNotifications.forEach(notification => {
    if (!notification.readAt) {
      notification.readAt = new Date();
      count++;
    }
  });

  notifications.set(userId, userNotifications);
  return { success: true, count };
}

/**
 * Delete notification
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<{ success: boolean }> {
  const userNotifications = notifications.get(userId) || [];
  const filteredNotifications = userNotifications.filter(n => n._id !== notificationId);

  if (filteredNotifications.length < userNotifications.length) {
    notifications.set(userId, filteredNotifications);
    return { success: true };
  }

  return { success: false };
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const userNotifications = notifications.get(userId) || [];
  return userNotifications.filter(n => !n.readAt).length;
}

/**
 * Get user's push subscriptions
 */
export async function getUserSubscriptions(userId: string): Promise<PushSubscriptionSchema[]> {
  return pushSubscriptions.get(userId) || [];
}

/**
 * Helper: Detect device name from user agent
 */
function detectDeviceName(userAgent?: string): string {
  if (!userAgent) return 'Unknown Device';

  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Linux')) return 'Linux';

  return 'Unknown Device';
}

/**
 * Send notification for specific events
 */
export async function sendTradeExecutedNotification(
  userId: string,
  tradeData: {
    symbol: string;
    direction: 'long' | 'short';
    quantity: number;
    price: number;
    botName?: string;
  }
): Promise<void> {
  await sendPushNotification(
    userId,
    'Trade Executed',
    `${tradeData.direction.toUpperCase()} ${tradeData.quantity} ${tradeData.symbol} @ $${tradeData.price}`,
    {
      type: 'TRADE_EXECUTED',
      priority: 'high',
      url: '/portfolio',
      ...tradeData,
    }
  );
}

export async function sendAlertTriggeredNotification(
  userId: string,
  alertData: {
    symbol: string;
    condition: string;
    message: string;
  }
): Promise<void> {
  await sendPushNotification(
    userId,
    `Alert: ${alertData.symbol}`,
    alertData.message,
    {
      type: 'ALERT_TRIGGERED',
      priority: 'high',
      url: '/alerts',
      ...alertData,
    }
  );
}

export async function sendBotUpdateNotification(
  userId: string,
  botData: {
    botName: string;
    updateType: 'started' | 'stopped' | 'updated' | 'error';
    message: string;
  }
): Promise<void> {
  await sendPushNotification(
    userId,
    `Bot Update: ${botData.botName}`,
    botData.message,
    {
      type: 'BOT_UPDATE',
      priority: botData.updateType === 'error' ? 'critical' : 'medium',
      url: '/bots',
      ...botData,
    }
  );
}

export async function sendSystemUpdateNotification(
  userId: string,
  message: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<void> {
  await sendPushNotification(
    userId,
    'System Update',
    message,
    {
      type: 'SYSTEM_UPDATE',
      priority,
      url: '/',
    }
  );
}

export default {
  sendPushNotification,
  sendBulkNotification,
  subscribePushNotification,
  unsubscribePushNotification,
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  getUserSubscriptions,
  // Event-specific notifications
  sendTradeExecutedNotification,
  sendAlertTriggeredNotification,
  sendBotUpdateNotification,
  sendSystemUpdateNotification,
};

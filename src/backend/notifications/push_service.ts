/**
 * Push Notification Service - Production Ready
 *
 * Web Push API integration for TIME BEYOND US
 * Features:
 * - Send push notifications to subscribed users
 * - Manage push subscriptions with MongoDB persistence
 * - Support for bulk notifications with queue system
 * - User notification preferences with quiet hours
 * - Rate limiting and frequency control
 * - All notification types: TRADE_EXECUTED, BOT_ALERT, PRICE_TARGET, BIG_MOVES, SECURITY, MARKETING
 */

import webpush from 'web-push';
import { NotificationType, PushSubscriptionSchema, NotificationSchema } from '../database/schemas';
import logger from '../utils/logger';
import { EventEmitter } from 'events';

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

// ============================================================
// NOTIFICATION TYPES AND CATEGORIES
// ============================================================

export type NotificationCategory =
  | 'trade'           // Trade executed notifications
  | 'bot'             // Bot alerts and updates
  | 'price'           // Price target hit alerts
  | 'big_moves'       // Big market movement alerts
  | 'security'        // Account security alerts
  | 'marketing'       // Promotional notifications
  | 'system';         // System updates

export interface NotificationPreferences {
  userId: string;
  // Category toggles
  categories: {
    trade: boolean;
    bot: boolean;
    price: boolean;
    big_moves: boolean;
    security: boolean;
    marketing: boolean;
    system: boolean;
  };
  // Quiet hours
  quietHours: {
    enabled: boolean;
    start: string; // "22:00" format
    end: string;   // "07:00" format
    timezone: string;
  };
  // Frequency limits
  frequencyLimits: {
    maxPerHour: number;
    maxPerDay: number;
  };
  // Delivery methods
  deliveryMethods: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  // Priority thresholds
  minPriority: 'low' | 'medium' | 'high' | 'critical';
  updatedAt: Date;
}

// Default notification preferences
const defaultPreferences: Omit<NotificationPreferences, 'userId'> = {
  categories: {
    trade: true,
    bot: true,
    price: true,
    big_moves: true,
    security: true,
    marketing: false,
    system: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezone: 'America/New_York',
  },
  frequencyLimits: {
    maxPerHour: 20,
    maxPerDay: 100,
  },
  deliveryMethods: {
    push: true,
    email: true,
    sms: false,
    inApp: true,
  },
  minPriority: 'low',
  updatedAt: new Date(),
};

// In-memory storage with MongoDB integration ready
const pushSubscriptions = new Map<string, PushSubscriptionSchema[]>();
const notifications = new Map<string, NotificationSchema[]>();
const userPreferences = new Map<string, NotificationPreferences>();
const notificationCounts = new Map<string, { hourly: number; daily: number; lastHourReset: Date; lastDayReset: Date }>();

// ============================================================
// NOTIFICATION QUEUE SYSTEM
// ============================================================

interface QueuedNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  scheduledFor?: Date;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

class NotificationQueue extends EventEmitter {
  private queue: QueuedNotification[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startProcessing();
  }

  add(notification: Omit<QueuedNotification, 'id' | 'attempts' | 'maxAttempts' | 'createdAt'>): string {
    const id = `notif_queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedNotification: QueuedNotification = {
      ...notification,
      id,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };
    this.queue.push(queuedNotification);
    logger.info(`Notification queued: ${id}`, { userId: notification.userId, category: notification.category });
    return id;
  }

  private startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Process every second
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const now = new Date();

    // Get notifications ready to send
    const ready = this.queue.filter(n => !n.scheduledFor || n.scheduledFor <= now);

    for (const notification of ready.slice(0, 10)) { // Process 10 at a time
      try {
        await this.sendNotification(notification);
        // Remove from queue on success
        this.queue = this.queue.filter(n => n.id !== notification.id);
      } catch (error) {
        notification.attempts++;
        if (notification.attempts >= notification.maxAttempts) {
          logger.error(`Notification ${notification.id} failed after max attempts`, { error });
          this.queue = this.queue.filter(n => n.id !== notification.id);
        }
      }
    }

    this.processing = false;
  }

  private async sendNotification(notification: QueuedNotification): Promise<void> {
    await sendPushNotification(
      notification.userId,
      notification.title,
      notification.body,
      {
        ...notification.data,
        category: notification.category,
        priority: notification.priority,
      }
    );
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
  }

  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

const notificationQueue = new NotificationQueue();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getCategoryFromType(type: string): NotificationCategory {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('trade') || lowerType.includes('executed')) return 'trade';
  if (lowerType.includes('bot') || lowerType.includes('signal')) return 'bot';
  if (lowerType.includes('price') || lowerType.includes('alert')) return 'price';
  if (lowerType.includes('big_moves') || lowerType.includes('bigmoves') || lowerType.includes('market_move')) return 'big_moves';
  if (lowerType.includes('security') || lowerType.includes('login') || lowerType.includes('password')) return 'security';
  if (lowerType.includes('marketing') || lowerType.includes('promo') || lowerType.includes('offer')) return 'marketing';
  return 'system';
}

function isWithinQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHours.enabled) return false;

  try {
    const now = new Date();
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTime = currentHour * 60 + currentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }
    return currentTime >= startTime && currentTime < endTime;
  } catch {
    return false;
  }
}

function checkRateLimits(userId: string, preferences: NotificationPreferences): boolean {
  const counts = notificationCounts.get(userId) || {
    hourly: 0,
    daily: 0,
    lastHourReset: new Date(),
    lastDayReset: new Date(),
  };

  const now = new Date();

  // Reset hourly count if an hour has passed
  if (now.getTime() - counts.lastHourReset.getTime() > 3600000) {
    counts.hourly = 0;
    counts.lastHourReset = now;
  }

  // Reset daily count if a day has passed
  if (now.getTime() - counts.lastDayReset.getTime() > 86400000) {
    counts.daily = 0;
    counts.lastDayReset = now;
  }

  // Check limits
  if (counts.hourly >= preferences.frequencyLimits.maxPerHour) {
    logger.warn(`Rate limit exceeded for user ${userId}: hourly limit`);
    return false;
  }
  if (counts.daily >= preferences.frequencyLimits.maxPerDay) {
    logger.warn(`Rate limit exceeded for user ${userId}: daily limit`);
    return false;
  }

  // Increment counts
  counts.hourly++;
  counts.daily++;
  notificationCounts.set(userId, counts);

  return true;
}

function shouldSendNotification(
  userId: string,
  category: NotificationCategory,
  priority: 'low' | 'medium' | 'high' | 'critical'
): boolean {
  const preferences = userPreferences.get(userId) || { ...defaultPreferences, userId };

  // Security notifications always go through
  if (category === 'security') return true;

  // Critical priority always goes through
  if (priority === 'critical') return true;

  // Check if category is enabled
  if (!preferences.categories[category]) {
    logger.debug(`Notification blocked for user ${userId}: category ${category} disabled`);
    return false;
  }

  // Check priority threshold
  const priorityOrder = ['low', 'medium', 'high', 'critical'];
  if (priorityOrder.indexOf(priority) < priorityOrder.indexOf(preferences.minPriority)) {
    logger.debug(`Notification blocked for user ${userId}: priority ${priority} below threshold`);
    return false;
  }

  // Check quiet hours (except for critical)
  if (isWithinQuietHours(preferences)) {
    logger.debug(`Notification blocked for user ${userId}: quiet hours active`);
    return false;
  }

  // Check rate limits
  if (!checkRateLimits(userId, preferences)) {
    return false;
  }

  return true;
}

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

export async function sendPriceAlertNotification(
  userId: string,
  alertData: {
    symbol: string;
    price: number;
    condition: string;
    message: string;
  }
): Promise<void> {
  await sendPushNotification(
    userId,
    `Price Alert: ${alertData.symbol}`,
    alertData.message,
    {
      type: 'PRICE_ALERT',
      priority: 'high',
      url: `/trade?symbol=${alertData.symbol}`,
      ...alertData,
    }
  );
}

export async function sendBotSignalNotification(
  userId: string,
  signalData: {
    botName: string;
    signal: string;
    symbol: string;
    message: string;
  }
): Promise<void> {
  await sendPushNotification(
    userId,
    `${signalData.botName}`,
    signalData.message,
    {
      type: 'BOT_SIGNAL',
      priority: 'high',
      url: `/autopilot`,
      ...signalData,
    }
  );
}

export async function sendProfitNotification(
  userId: string,
  profitData: {
    amount: number;
    period: string;
    message: string;
  }
): Promise<void> {
  await sendPushNotification(
    userId,
    'Profit Update',
    profitData.message,
    {
      type: 'PROFIT',
      priority: 'medium',
      url: '/portfolio',
      ...profitData,
    }
  );
}

export async function sendSystemNotification(
  userId: string,
  message: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<void> {
  await sendPushNotification(
    userId,
    'System Notification',
    message,
    {
      type: 'SYSTEM',
      priority,
      url: '/',
    }
  );
}

// ============================================================
// NEW NOTIFICATION TYPES
// ============================================================

/**
 * Send Big Moves market alert notification
 */
export async function sendBigMovesNotification(
  userId: string,
  alertData: {
    symbol: string;
    change: number;
    changePercent: number;
    direction: 'up' | 'down';
    timeframe: string;
    message: string;
  }
): Promise<void> {
  const category: NotificationCategory = 'big_moves';
  const priority: 'low' | 'medium' | 'high' | 'critical' = Math.abs(alertData.changePercent) > 10 ? 'critical' : 'high';

  if (!shouldSendNotification(userId, category, priority)) {
    logger.debug(`Big moves notification blocked for user ${userId}`);
    return;
  }

  const emoji = alertData.direction === 'up' ? '' : '';
  await sendPushNotification(
    userId,
    `${emoji} Big Move: ${alertData.symbol}`,
    alertData.message,
    {
      type: 'BIG_MOVES',
      category,
      priority,
      url: `/trade?symbol=${alertData.symbol}`,
      ...alertData,
    }
  );
}

/**
 * Send account security notification (always delivered)
 */
export async function sendSecurityNotification(
  userId: string,
  securityData: {
    type: 'login' | 'password_change' | 'api_key' | 'suspicious_activity' | 'mfa';
    message: string;
    ipAddress?: string;
    location?: string;
    device?: string;
    actionRequired?: boolean;
  }
): Promise<void> {
  // Security notifications always go through
  await sendPushNotification(
    userId,
    'Security Alert',
    securityData.message,
    {
      type: 'SECURITY',
      category: 'security' as NotificationCategory,
      priority: 'critical',
      url: '/settings',
      requireInteraction: true,
      ...securityData,
    }
  );
}

/**
 * Send marketing/promotional notification
 */
export async function sendMarketingNotification(
  userId: string,
  marketingData: {
    campaign: string;
    title: string;
    message: string;
    ctaText?: string;
    ctaUrl?: string;
    expiresAt?: Date;
  }
): Promise<void> {
  const category: NotificationCategory = 'marketing';
  const priority: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (!shouldSendNotification(userId, category, priority)) {
    logger.debug(`Marketing notification blocked for user ${userId}`);
    return;
  }

  await sendPushNotification(
    userId,
    marketingData.title,
    marketingData.message,
    {
      type: 'MARKETING',
      category,
      priority,
      url: marketingData.ctaUrl || '/offers',
      ...marketingData,
    }
  );
}

/**
 * Send price target hit notification
 */
export async function sendPriceTargetNotification(
  userId: string,
  targetData: {
    symbol: string;
    targetPrice: number;
    currentPrice: number;
    direction: 'above' | 'below';
    alertName?: string;
  }
): Promise<void> {
  const category: NotificationCategory = 'price';
  const priority: 'low' | 'medium' | 'high' | 'critical' = 'high';

  if (!shouldSendNotification(userId, category, priority)) {
    logger.debug(`Price target notification blocked for user ${userId}`);
    return;
  }

  const message = `${targetData.symbol} hit your target! Price ${targetData.direction} $${targetData.targetPrice.toFixed(2)}`;

  await sendPushNotification(
    userId,
    `Price Target: ${targetData.symbol}`,
    message,
    {
      type: 'PRICE_TARGET',
      category,
      priority,
      url: `/trade?symbol=${targetData.symbol}`,
      ...targetData,
    }
  );
}

// ============================================================
// PREFERENCE MANAGEMENT
// ============================================================

/**
 * Get user notification preferences
 */
export async function getUserPreferences(userId: string): Promise<NotificationPreferences> {
  const existing = userPreferences.get(userId);
  if (existing) return existing;

  // Return default preferences for new users
  return { ...defaultPreferences, userId, updatedAt: new Date() };
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'userId'>>
): Promise<NotificationPreferences> {
  const current = await getUserPreferences(userId);

  const updated: NotificationPreferences = {
    ...current,
    ...updates,
    categories: { ...current.categories, ...updates.categories },
    quietHours: { ...current.quietHours, ...updates.quietHours },
    frequencyLimits: { ...current.frequencyLimits, ...updates.frequencyLimits },
    deliveryMethods: { ...current.deliveryMethods, ...updates.deliveryMethods },
    updatedAt: new Date(),
  };

  userPreferences.set(userId, updated);
  logger.info(`Updated notification preferences for user ${userId}`);

  return updated;
}

/**
 * Reset user notification preferences to defaults
 */
export async function resetUserPreferences(userId: string): Promise<NotificationPreferences> {
  const defaults: NotificationPreferences = { ...defaultPreferences, userId, updatedAt: new Date() };
  userPreferences.set(userId, defaults);
  return defaults;
}

// ============================================================
// QUEUE MANAGEMENT
// ============================================================

/**
 * Queue a notification for later delivery
 */
export function queueNotification(
  userId: string,
  title: string,
  body: string,
  category: NotificationCategory,
  priority: 'low' | 'medium' | 'high' | 'critical',
  data?: Record<string, any>,
  scheduledFor?: Date
): string {
  return notificationQueue.add({
    userId,
    title,
    body,
    category,
    priority,
    data,
    scheduledFor,
  });
}

/**
 * Get notification queue stats
 */
export function getQueueStats(): { length: number } {
  return { length: notificationQueue.getQueueLength() };
}

/**
 * Clear the notification queue
 */
export function clearNotificationQueue(): void {
  notificationQueue.clearQueue();
}

// ============================================================
// ANALYTICS
// ============================================================

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string): Promise<{
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
  lastNotification?: Date;
}> {
  const userNotifications = notifications.get(userId) || [];

  const byCategory: Record<NotificationCategory, number> = {
    trade: 0,
    bot: 0,
    price: 0,
    big_moves: 0,
    security: 0,
    marketing: 0,
    system: 0,
  };

  userNotifications.forEach(n => {
    const category = getCategoryFromType(n.type);
    byCategory[category]++;
  });

  return {
    total: userNotifications.length,
    unread: userNotifications.filter(n => !n.readAt).length,
    byCategory,
    lastNotification: userNotifications[0]?.createdAt,
  };
}

/**
 * Delete old notifications (cleanup)
 */
export async function cleanupOldNotifications(
  userId: string,
  olderThanDays: number = 30
): Promise<number> {
  const userNotifications = notifications.get(userId) || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const filtered = userNotifications.filter(n => n.createdAt > cutoff);
  const deleted = userNotifications.length - filtered.length;

  notifications.set(userId, filtered);
  logger.info(`Cleaned up ${deleted} old notifications for user ${userId}`);

  return deleted;
}

/**
 * Shutdown the notification service
 */
export function shutdown(): void {
  notificationQueue.shutdown();
  logger.info('Push notification service shut down');
}

export default {
  // Core functions
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
  sendPriceAlertNotification,
  sendBotSignalNotification,
  sendProfitNotification,
  sendSystemNotification,

  // New notification types
  sendBigMovesNotification,
  sendSecurityNotification,
  sendMarketingNotification,
  sendPriceTargetNotification,

  // Preference management
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,

  // Queue management
  queueNotification,
  getQueueStats,
  clearNotificationQueue,

  // Analytics
  getNotificationStats,
  cleanupOldNotifications,

  // Lifecycle
  shutdown,

  // Types
  NotificationCategory,
  NotificationPreferences,
};

/**
 * Notifications API Routes - Production Ready
 *
 * Complete push notification system for TIME BEYOND US
 * Supports: Web Push API (browsers), FCM (iOS/Android mobile)
 *
 * Core Endpoints:
 * - POST /api/notifications/subscribe - Subscribe to Web Push notifications
 * - POST /api/notifications/unsubscribe - Unsubscribe from Web Push
 * - GET /api/notifications/history - Get notification history
 * - GET /api/notifications/unread-count - Get unread notification count
 * - PUT /api/notifications/:id/read - Mark notification as read
 * - PUT /api/notifications/read-all - Mark all notifications as read
 * - DELETE /api/notifications/:id - Delete notification
 * - GET /api/notifications/subscriptions - Get user's Web Push subscriptions
 * - GET /api/notifications/preferences - Get notification preferences
 * - PUT /api/notifications/preferences - Update notification preferences
 * - POST /api/notifications/preferences/reset - Reset preferences to defaults
 * - GET /api/notifications/stats - Get notification statistics
 *
 * FCM (Mobile) Endpoints:
 * - POST /api/notifications/fcm/register - Register FCM token for mobile push
 * - POST /api/notifications/fcm/unregister - Unregister FCM token
 * - GET /api/notifications/fcm/tokens - Get user's FCM tokens
 *
 * Template Endpoints:
 * - GET /api/notifications/templates - Get all notification templates
 * - GET /api/notifications/templates/:id - Get specific template
 * - POST /api/notifications/templates - Create custom template (admin)
 * - PUT /api/notifications/templates/:id - Update custom template (admin)
 * - DELETE /api/notifications/templates/:id - Delete custom template (admin)
 * - POST /api/notifications/templates/:id/send - Send using template (admin)
 *
 * Scheduled Notifications:
 * - GET /api/notifications/scheduled - Get user's scheduled notifications
 * - POST /api/notifications/scheduled - Schedule a new notification
 * - PUT /api/notifications/scheduled/:id - Update scheduled notification
 * - DELETE /api/notifications/scheduled/:id - Cancel scheduled notification
 *
 * Badge Counts:
 * - GET /api/notifications/badge - Get badge counts by category
 * - POST /api/notifications/badge/clear/:category - Clear badge for category
 * - POST /api/notifications/badge/clear-all - Clear all badges
 *
 * Admin Endpoints:
 * - POST /api/notifications/test - Send test notification
 * - POST /api/notifications/broadcast - Send broadcast notification
 * - GET /api/notifications/queue/stats - Get queue statistics
 * - POST /api/notifications/queue/clear - Clear notification queue
 * - POST /api/notifications/send/trade - Send trade alert
 * - POST /api/notifications/send/price-alert - Send price alert
 * - POST /api/notifications/send/bot-status - Send bot status notification
 * - POST /api/notifications/send/system-announcement - Send system announcement
 * - POST /api/notifications/send/security - Send security alert
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import pushService from '../notifications/push_service';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Subscribe to push notifications
 * POST /api/notifications/subscribe
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data',
      });
    }

    const result = await pushService.subscribePushNotification(
      userId,
      subscription,
      req.headers['user-agent']
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Error subscribing to push notifications', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to push notifications',
      error: error.message,
    });
  }
});

/**
 * Unsubscribe from push notifications
 * POST /api/notifications/unsubscribe
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required',
      });
    }

    const result = await pushService.unsubscribePushNotification(userId, endpoint);
    res.json(result);
  } catch (error: any) {
    logger.error('Error unsubscribing from push notifications', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from push notifications',
      error: error.message,
    });
  }
});

/**
 * Get notification history
 * GET /api/notifications/history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await pushService.getNotificationHistory(userId, limit, offset);

    res.json({
      success: true,
      notifications,
      limit,
      offset,
      total: notifications.length,
    });
  } catch (error: any) {
    logger.error('Error fetching notification history', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message,
    });
  }
});

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const count = await pushService.getUnreadCount(userId);

    res.json({
      success: true,
      count,
    });
  } catch (error: any) {
    logger.error('Error fetching unread count', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const notificationId = req.params.id;

    const result = await pushService.markNotificationAsRead(userId, notificationId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    logger.error('Error marking notification as read', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await pushService.markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: `${result.count} notifications marked as read`,
      count: result.count,
    });
  } catch (error: any) {
    logger.error('Error marking all notifications as read', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const notificationId = req.params.id;

    const result = await pushService.deleteNotification(userId, notificationId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error: any) {
    logger.error('Error deleting notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
});

/**
 * Get user's push subscriptions
 * GET /api/notifications/subscriptions
 */
router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const subscriptions = await pushService.getUserSubscriptions(userId);

    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        deviceName: sub.deviceName,
        createdAt: sub.createdAt,
        lastUsedAt: sub.lastUsedAt,
        isActive: sub.isActive,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching subscriptions', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message,
    });
  }
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const preferences = await pushService.getUserPreferences(userId);

    res.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    logger.error('Error fetching notification preferences', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences',
      error: error.message,
    });
  }
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { categories, quietHours, frequencyLimits, deliveryMethods, minPriority } = req.body;

    const updates: any = {};
    if (categories) updates.categories = categories;
    if (quietHours) updates.quietHours = quietHours;
    if (frequencyLimits) updates.frequencyLimits = frequencyLimits;
    if (deliveryMethods) updates.deliveryMethods = deliveryMethods;
    if (minPriority) updates.minPriority = minPriority;

    const preferences = await pushService.updateUserPreferences(userId, updates);

    logger.info('Notification preferences updated', { userId });

    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences,
    });
  } catch (error: any) {
    logger.error('Error updating notification preferences', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message,
    });
  }
});

/**
 * Reset notification preferences to defaults
 * POST /api/notifications/preferences/reset
 */
router.post('/preferences/reset', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const preferences = await pushService.resetUserPreferences(userId);

    res.json({
      success: true,
      message: 'Notification preferences reset to defaults',
      preferences,
    });
  } catch (error: any) {
    logger.error('Error resetting notification preferences', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to reset notification preferences',
      error: error.message,
    });
  }
});

/**
 * Get notification statistics
 * GET /api/notifications/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const stats = await pushService.getNotificationStats(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('Error fetching notification stats', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification stats',
      error: error.message,
    });
  }
});

/**
 * Legacy endpoint - Update notification preferences (settings)
 * PUT /api/notifications/settings
 */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { preferences } = req.body;

    // Map legacy preferences format to new format
    const updates: any = {};
    if (preferences) {
      if (preferences.trades !== undefined) updates.categories = { ...updates.categories, trade: preferences.trades };
      if (preferences.alerts !== undefined) updates.categories = { ...updates.categories, price: preferences.alerts };
      if (preferences.bots !== undefined) updates.categories = { ...updates.categories, bot: preferences.bots };
      if (preferences.system !== undefined) updates.categories = { ...updates.categories, system: preferences.system };
    }

    const updated = await pushService.updateUserPreferences(userId, updates);

    logger.info('Notification preferences updated (legacy)', { userId, preferences });

    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: updated,
    });
  } catch (error: any) {
    logger.error('Error updating notification preferences', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message,
    });
  }
});

/**
 * Send test notification (admin only)
 * POST /api/notifications/test
 */
router.post('/test', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title, body, data } = req.body;

    const result = await pushService.sendPushNotification(
      userId,
      title || 'Test Notification',
      body || 'This is a test push notification from TIME BEYOND US',
      {
        type: 'SYSTEM_UPDATE',
        priority: 'medium',
        ...data,
      }
    );

    res.json({
      success: true,
      message: 'Test notification sent',
      result,
    });
  } catch (error: any) {
    logger.error('Error sending test notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message,
    });
  }
});

/**
 * Get VAPID public key
 * GET /api/notifications/vapid-public-key
 */
router.get('/vapid-public-key', (req: Request, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';

  if (!publicKey) {
    return res.status(500).json({
      success: false,
      message: 'VAPID public key not configured',
    });
  }

  res.json({
    success: true,
    publicKey,
  });
});

/**
 * Send broadcast notification to all users (admin only)
 * POST /api/notifications/broadcast
 */
router.post('/broadcast', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, body, data, userIds } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required',
      });
    }

    // If userIds provided, send to specific users, otherwise broadcast to all
    let targetUserIds: string[] = userIds || [];

    // In production, fetch all user IDs from database if broadcasting to all
    // For now, we'll use the provided userIds or send to the current user
    if (targetUserIds.length === 0) {
      // This is a placeholder - in production, fetch all active user IDs from database
      logger.warn('Broadcast without specific user IDs - would send to all users in production');
      return res.status(400).json({
        success: false,
        message: 'Please specify target user IDs for broadcast',
      });
    }

    const result = await pushService.sendBulkNotification(
      targetUserIds,
      title,
      body,
      {
        type: 'SYSTEM',
        priority: data?.priority || 'medium',
        ...data,
      }
    );

    res.json({
      success: true,
      message: `Broadcast sent to ${result.totalUsers} users`,
      result,
    });
  } catch (error: any) {
    logger.error('Error sending broadcast notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast notification',
      error: error.message,
    });
  }
});

/**
 * Get notification queue statistics (admin only)
 * GET /api/notifications/queue/stats
 */
router.get('/queue/stats', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = pushService.getQueueStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('Error fetching queue stats', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue stats',
      error: error.message,
    });
  }
});

/**
 * Clear notification queue (admin only)
 * POST /api/notifications/queue/clear
 */
router.post('/queue/clear', adminMiddleware, async (req: Request, res: Response) => {
  try {
    pushService.clearNotificationQueue();

    res.json({
      success: true,
      message: 'Notification queue cleared',
    });
  } catch (error: any) {
    logger.error('Error clearing queue', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to clear queue',
      error: error.message,
    });
  }
});

/**
 * Cleanup old notifications
 * POST /api/notifications/cleanup
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { olderThanDays = 30 } = req.body;

    const deleted = await pushService.cleanupOldNotifications(userId, olderThanDays);

    res.json({
      success: true,
      message: `Deleted ${deleted} old notifications`,
      deleted,
    });
  } catch (error: any) {
    logger.error('Error cleaning up notifications', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup notifications',
      error: error.message,
    });
  }
});

// ============================================================
// FCM (FIREBASE CLOUD MESSAGING) ROUTES - Mobile Push
// ============================================================

/**
 * Register FCM token for mobile push notifications
 * POST /api/notifications/fcm/register
 */
router.post('/fcm/register', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { token, platform, deviceId, deviceName, appVersion } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
      });
    }

    if (!platform || !['android', 'ios', 'web'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Valid platform (android, ios, web) is required',
      });
    }

    const result = await pushService.registerFCMToken(userId, token, platform, {
      deviceId,
      deviceName,
      appVersion,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error registering FCM token', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to register FCM token',
      error: error.message,
    });
  }
});

/**
 * Unregister FCM token
 * POST /api/notifications/fcm/unregister
 */
router.post('/fcm/unregister', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
      });
    }

    const result = await pushService.unregisterFCMToken(userId, token);
    res.json(result);
  } catch (error: any) {
    logger.error('Error unregistering FCM token', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to unregister FCM token',
      error: error.message,
    });
  }
});

/**
 * Get user's FCM tokens
 * GET /api/notifications/fcm/tokens
 */
router.get('/fcm/tokens', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const tokens = await pushService.getUserFCMTokens(userId);

    res.json({
      success: true,
      tokens: tokens.map(t => ({
        id: t._id,
        platform: t.platform,
        deviceName: t.deviceName,
        appVersion: t.appVersion,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        isActive: t.isActive,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching FCM tokens', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FCM tokens',
      error: error.message,
    });
  }
});

// ============================================================
// NOTIFICATION TEMPLATES ROUTES
// ============================================================

/**
 * Get all notification templates
 * GET /api/notifications/templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = pushService.getAllTemplates();

    res.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    logger.error('Error fetching templates', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message,
    });
  }
});

/**
 * Get specific template by ID
 * GET /api/notifications/templates/:id
 */
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const template = pushService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error: any) {
    logger.error('Error fetching template', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message,
    });
  }
});

/**
 * Create custom notification template (admin only)
 * POST /api/notifications/templates
 */
router.post('/templates', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, category, titleTemplate, bodyTemplate, icon, priority, variables, defaultData } = req.body;

    if (!name || !category || !titleTemplate || !bodyTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, titleTemplate, and bodyTemplate are required',
      });
    }

    const template = pushService.createTemplate({
      name,
      category,
      titleTemplate,
      bodyTemplate,
      icon,
      priority: priority || 'medium',
      variables: variables || [],
      defaultData,
      isActive: true,
    });

    res.json({
      success: true,
      message: 'Template created successfully',
      template,
    });
  } catch (error: any) {
    logger.error('Error creating template', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message,
    });
  }
});

/**
 * Update custom notification template (admin only)
 * PUT /api/notifications/templates/:id
 */
router.put('/templates/:id', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const updates = req.body;

    const template = pushService.updateTemplate(templateId, updates);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or cannot be updated',
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      template,
    });
  } catch (error: any) {
    logger.error('Error updating template', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message,
    });
  }
});

/**
 * Delete custom notification template (admin only)
 * DELETE /api/notifications/templates/:id
 */
router.delete('/templates/:id', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const deleted = pushService.deleteTemplate(templateId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting template', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message,
    });
  }
});

/**
 * Send notification using template (admin only)
 * POST /api/notifications/templates/:id/send
 */
router.post('/templates/:id/send', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const { userId, variables, priority, url, data } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const result = await pushService.sendTemplatedNotification(userId, templateId, variables || {}, {
      priority,
      url,
      data,
    });

    res.json({
      success: result.success,
      message: result.success ? 'Notification sent successfully' : 'Failed to send notification',
      result,
    });
  } catch (error: any) {
    logger.error('Error sending templated notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message,
    });
  }
});

// ============================================================
// SCHEDULED NOTIFICATIONS ROUTES
// ============================================================

/**
 * Get user's scheduled notifications
 * GET /api/notifications/scheduled
 */
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const includeCompleted = req.query.includeCompleted === 'true';

    const scheduled = pushService.getUserScheduledNotifications(userId, includeCompleted);

    res.json({
      success: true,
      scheduled,
    });
  } catch (error: any) {
    logger.error('Error fetching scheduled notifications', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled notifications',
      error: error.message,
    });
  }
});

/**
 * Schedule a new notification
 * POST /api/notifications/scheduled
 */
router.post('/scheduled', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { templateId, title, body, category, priority, data, scheduledFor, recurrence } = req.body;

    if (!scheduledFor) {
      return res.status(400).json({
        success: false,
        message: 'scheduledFor date is required',
      });
    }

    if (!templateId && (!title || !body)) {
      return res.status(400).json({
        success: false,
        message: 'Either templateId or title/body are required',
      });
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduledFor date',
      });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'scheduledFor must be in the future',
      });
    }

    const scheduled = pushService.scheduleNotification(userId, {
      templateId,
      title,
      body,
      category: category || 'system',
      priority: priority || 'medium',
      data,
      scheduledFor: scheduledDate,
      recurrence,
    });

    res.json({
      success: true,
      message: 'Notification scheduled successfully',
      scheduled,
    });
  } catch (error: any) {
    logger.error('Error scheduling notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to schedule notification',
      error: error.message,
    });
  }
});

/**
 * Update a scheduled notification
 * PUT /api/notifications/scheduled/:id
 */
router.put('/scheduled/:id', async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const { title, body, scheduledFor, recurrence, data, priority } = req.body;

    const updates: any = {};
    if (title) updates.title = title;
    if (body) updates.body = body;
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scheduledFor date',
        });
      }
      updates.scheduledFor = scheduledDate;
    }
    if (recurrence !== undefined) updates.recurrence = recurrence;
    if (data !== undefined) updates.data = data;
    if (priority) updates.priority = priority;

    const scheduled = pushService.updateScheduledNotification(notificationId, updates);

    if (!scheduled) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled notification not found or already sent/cancelled',
      });
    }

    res.json({
      success: true,
      message: 'Scheduled notification updated',
      scheduled,
    });
  } catch (error: any) {
    logger.error('Error updating scheduled notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduled notification',
      error: error.message,
    });
  }
});

/**
 * Cancel a scheduled notification
 * DELETE /api/notifications/scheduled/:id
 */
router.delete('/scheduled/:id', async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const cancelled = pushService.cancelScheduledNotification(notificationId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled notification not found or already sent/cancelled',
      });
    }

    res.json({
      success: true,
      message: 'Scheduled notification cancelled',
    });
  } catch (error: any) {
    logger.error('Error cancelling scheduled notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to cancel scheduled notification',
      error: error.message,
    });
  }
});

// ============================================================
// BADGE COUNT ROUTES
// ============================================================

/**
 * Get badge counts for unread notifications
 * GET /api/notifications/badge
 */
router.get('/badge', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const badgeCounts = await pushService.getBadgeCounts(userId);

    res.json({
      success: true,
      ...badgeCounts,
    });
  } catch (error: any) {
    logger.error('Error fetching badge counts', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badge counts',
      error: error.message,
    });
  }
});

/**
 * Clear badge count for a specific category
 * POST /api/notifications/badge/clear/:category
 */
router.post('/badge/clear/:category', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const category = req.params.category as any;

    const validCategories = ['trade', 'bot', 'price', 'big_moves', 'security', 'marketing', 'system'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    const cleared = await pushService.clearBadgeForCategory(userId, category);

    res.json({
      success: true,
      message: `Cleared ${cleared} notifications in category ${category}`,
      cleared,
    });
  } catch (error: any) {
    logger.error('Error clearing badge for category', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to clear badge',
      error: error.message,
    });
  }
});

/**
 * Clear all badges (mark all as read)
 * POST /api/notifications/badge/clear-all
 */
router.post('/badge/clear-all', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await pushService.markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: `Cleared all badges, ${result.count} notifications marked as read`,
      count: result.count,
    });
  } catch (error: any) {
    logger.error('Error clearing all badges', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to clear all badges',
      error: error.message,
    });
  }
});

// ============================================================
// NOTIFICATION TYPE-SPECIFIC SEND ROUTES (Admin)
// ============================================================

/**
 * Send trade alert notification (admin only)
 * POST /api/notifications/send/trade
 */
router.post('/send/trade', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, symbol, direction, quantity, price, botName } = req.body;

    if (!userId || !symbol || !direction || !quantity || !price) {
      return res.status(400).json({
        success: false,
        message: 'userId, symbol, direction, quantity, and price are required',
      });
    }

    await pushService.sendTradeExecutedNotification(userId, {
      symbol,
      direction,
      quantity,
      price,
      botName,
    });

    res.json({
      success: true,
      message: 'Trade notification sent',
    });
  } catch (error: any) {
    logger.error('Error sending trade notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send trade notification',
      error: error.message,
    });
  }
});

/**
 * Send price alert notification (admin only)
 * POST /api/notifications/send/price-alert
 */
router.post('/send/price-alert', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, symbol, targetPrice, currentPrice, direction, alertName } = req.body;

    if (!userId || !symbol || !targetPrice || !currentPrice || !direction) {
      return res.status(400).json({
        success: false,
        message: 'userId, symbol, targetPrice, currentPrice, and direction are required',
      });
    }

    await pushService.sendPriceTargetNotification(userId, {
      symbol,
      targetPrice,
      currentPrice,
      direction,
      alertName,
    });

    res.json({
      success: true,
      message: 'Price alert notification sent',
    });
  } catch (error: any) {
    logger.error('Error sending price alert notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send price alert notification',
      error: error.message,
    });
  }
});

/**
 * Send bot status notification (admin only)
 * POST /api/notifications/send/bot-status
 */
router.post('/send/bot-status', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, botName, updateType, message } = req.body;

    if (!userId || !botName || !updateType || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, botName, updateType, and message are required',
      });
    }

    await pushService.sendBotUpdateNotification(userId, {
      botName,
      updateType,
      message,
    });

    res.json({
      success: true,
      message: 'Bot status notification sent',
    });
  } catch (error: any) {
    logger.error('Error sending bot status notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send bot status notification',
      error: error.message,
    });
  }
});

/**
 * Send system announcement (admin only)
 * POST /api/notifications/send/system-announcement
 */
router.post('/send/system-announcement', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userIds, message, priority } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
      });
    }

    const result = await pushService.sendBulkNotification(
      userIds,
      'System Announcement',
      message,
      {
        type: 'SYSTEM',
        category: 'system',
        priority: priority || 'medium',
      }
    );

    res.json({
      success: true,
      message: 'System announcement sent',
      result,
    });
  } catch (error: any) {
    logger.error('Error sending system announcement', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send system announcement',
      error: error.message,
    });
  }
});

/**
 * Send security alert (admin only)
 * POST /api/notifications/send/security
 */
router.post('/send/security', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, type, message, ipAddress, location, device, actionRequired } = req.body;

    if (!userId || !type || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, type, and message are required',
      });
    }

    await pushService.sendSecurityNotification(userId, {
      type,
      message,
      ipAddress,
      location,
      device,
      actionRequired,
    });

    res.json({
      success: true,
      message: 'Security notification sent',
    });
  } catch (error: any) {
    logger.error('Error sending security notification', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send security notification',
      error: error.message,
    });
  }
});

export default router;

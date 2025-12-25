/**
 * Notifications API Routes
 *
 * Push notification management endpoints:
 * - POST /api/notifications/subscribe - Subscribe to push notifications
 * - POST /api/notifications/unsubscribe - Unsubscribe from push notifications
 * - GET /api/notifications/history - Get notification history
 * - GET /api/notifications/unread-count - Get unread notification count
 * - PUT /api/notifications/:id/read - Mark notification as read
 * - PUT /api/notifications/read-all - Mark all notifications as read
 * - DELETE /api/notifications/:id - Delete notification
 * - GET /api/notifications/subscriptions - Get user's push subscriptions
 * - PUT /api/notifications/settings - Update notification preferences
 * - POST /api/notifications/test - Send test notification (admin only)
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
 * Update notification preferences
 * PUT /api/notifications/settings
 */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { preferences } = req.body;

    // In a real implementation, save to database
    // For now, just acknowledge the request
    logger.info('Notification preferences updated', { userId, preferences });

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

export default router;

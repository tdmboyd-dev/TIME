/**
 * Feature Flags API Routes
 *
 * Master Admin Feature Control Panel for TIME BEYOND US
 *
 * Endpoints:
 * - GET /api/v1/admin/features - List all feature flags
 * - POST /api/v1/admin/features - Create new feature flag
 * - GET /api/v1/admin/features/:id - Get single feature flag
 * - PUT /api/v1/admin/features/:id - Update feature flag
 * - DELETE /api/v1/admin/features/:id - Delete feature flag
 * - POST /api/v1/admin/features/:id/toggle - Toggle feature on/off
 * - PUT /api/v1/admin/features/:id/rollout - Update rollout percentage
 * - PUT /api/v1/admin/features/:id/segments - Update user segments
 * - GET /api/v1/admin/features/stats - Get feature flag statistics
 * - POST /api/v1/admin/features/batch/enable - Enable multiple features
 * - POST /api/v1/admin/features/batch/disable - Disable multiple features
 *
 * User Endpoints (for checking feature availability):
 * - GET /api/v1/features - Get enabled features for current user
 * - GET /api/v1/features/check/:name - Check if specific feature is enabled
 * - GET /api/v1/features/announcements - Get active announcements for user
 * - POST /api/v1/features/announcements/:id/view - Track announcement view
 * - POST /api/v1/features/announcements/:id/dismiss - Track announcement dismiss
 * - POST /api/v1/features/announcements/:id/click - Track announcement click
 *
 * Version 1.0.0 | December 2025
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { featureFlagService, UserContext, UserSegmentConfig } from '../services/FeatureFlagService';
import pushService from '../notifications/push_service';
import logger from '../utils/logger';

const router = Router();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Extract user context from request
 */
function getUserContext(req: Request): UserContext {
  const user = (req as any).user;
  return {
    userId: user?.id || 'anonymous',
    isPremium: user?.subscription?.tier === 'premium' || user?.subscription?.tier === 'ultimate' || false,
    isBetaTester: user?.betaTester || false,
    country: user?.country || req.headers['cf-ipcountry'] as string || undefined,
    createdAt: user?.createdAt ? new Date(user.createdAt) : undefined,
  };
}

// ============================================================
// ADMIN ROUTES - Require Admin Authentication
// ============================================================

/**
 * GET /api/v1/admin/features
 * List all feature flags (admin only)
 */
router.get('/admin/features', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { enabled, search, segment } = req.query;

    let flags = featureFlagService.getAllFeatureFlags();

    // Filter by enabled status
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      flags = flags.filter(f => f.enabled === isEnabled);
    }

    // Filter by search term
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      flags = flags.filter(f =>
        f.name.toLowerCase().includes(searchLower) ||
        f.description.toLowerCase().includes(searchLower)
      );
    }

    // Filter by segment
    if (segment && typeof segment === 'string') {
      flags = flags.filter(f =>
        f.userSegments.some(s => s.type === segment)
      );
    }

    res.json({
      success: true,
      count: flags.length,
      features: flags,
    });
  } catch (error: any) {
    logger.error('Error listing feature flags', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to list feature flags',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/admin/features
 * Create a new feature flag (admin only)
 */
router.post('/admin/features', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      name,
      description,
      enabled,
      rolloutPercentage,
      userSegments,
      announceOnEnable,
      announcementTitle,
      announcementMessage,
      announcementBannerType,
      announcementDurationDays,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Feature name is required',
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Feature description is required',
      });
    }

    // Check if feature with this name already exists
    const existing = featureFlagService.getFeatureFlagByName(name);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A feature with this name already exists',
      });
    }

    const feature = featureFlagService.createFeatureFlag({
      name,
      description,
      enabled: enabled || false,
      rolloutPercentage: rolloutPercentage ?? 100,
      userSegments: userSegments || [{ type: 'all' }],
      announceOnEnable: announceOnEnable ?? true,
      announcementTitle,
      announcementMessage,
      announcementBannerType: announcementBannerType || 'feature',
      announcementDurationDays: announcementDurationDays || 7,
      createdBy: userId,
    });

    logger.info('Feature flag created', { featureId: feature.id, name, createdBy: userId });

    res.status(201).json({
      success: true,
      message: 'Feature flag created successfully',
      feature,
    });
  } catch (error: any) {
    logger.error('Error creating feature flag', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create feature flag',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/features/stats
 * Get feature flag statistics (admin only)
 */
router.get('/admin/features/stats', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = featureFlagService.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('Error fetching feature flag stats', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/features/:id
 * Get a single feature flag by ID (admin only)
 */
router.get('/admin/features/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const feature = featureFlagService.getFeatureFlag(id);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature flag not found',
      });
    }

    res.json({
      success: true,
      feature,
    });
  } catch (error: any) {
    logger.error('Error fetching feature flag', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature flag',
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/admin/features/:id
 * Update a feature flag (admin only)
 */
router.put('/admin/features/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing ID
    delete updates.id;
    delete updates.createdAt;
    delete updates.createdBy;
    delete updates.enableHistory;

    const feature = featureFlagService.updateFeatureFlag(id, updates, userId);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature flag not found',
      });
    }

    // If feature was enabled and has announceOnEnable, send push notifications
    if (updates.enabled === true && feature.announceOnEnable) {
      await sendFeatureAnnouncementPush(feature);
    }

    logger.info('Feature flag updated', { featureId: id, updatedBy: userId });

    res.json({
      success: true,
      message: 'Feature flag updated successfully',
      feature,
    });
  } catch (error: any) {
    logger.error('Error updating feature flag', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update feature flag',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/admin/features/:id
 * Delete a feature flag (admin only)
 */
router.delete('/admin/features/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const deleted = featureFlagService.deleteFeatureFlag(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Feature flag not found',
      });
    }

    logger.info('Feature flag deleted', { featureId: id, deletedBy: userId });

    res.json({
      success: true,
      message: 'Feature flag deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting feature flag', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete feature flag',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/admin/features/:id/toggle
 * Toggle feature flag on/off (admin only)
 */
router.post('/admin/features/:id/toggle', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const feature = featureFlagService.toggleFeatureFlag(id, userId);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature flag not found',
      });
    }

    // If feature was enabled and has announceOnEnable, send push notifications
    if (feature.enabled && feature.announceOnEnable) {
      await sendFeatureAnnouncementPush(feature);
    }

    logger.info('Feature flag toggled', { featureId: id, enabled: feature.enabled, toggledBy: userId });

    res.json({
      success: true,
      message: `Feature flag ${feature.enabled ? 'enabled' : 'disabled'} successfully`,
      feature,
    });
  } catch (error: any) {
    logger.error('Error toggling feature flag', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to toggle feature flag',
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/admin/features/:id/rollout
 * Update feature rollout percentage (admin only)
 */
router.put('/admin/features/:id/rollout', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { percentage } = req.body;

    if (percentage === undefined || typeof percentage !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Rollout percentage is required and must be a number',
      });
    }

    const feature = featureFlagService.updateRolloutPercentage(id, percentage, userId);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature flag not found',
      });
    }

    logger.info('Feature rollout updated', { featureId: id, percentage, updatedBy: userId });

    res.json({
      success: true,
      message: 'Rollout percentage updated successfully',
      feature,
    });
  } catch (error: any) {
    logger.error('Error updating rollout percentage', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update rollout percentage',
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/admin/features/:id/segments
 * Update feature user segments (admin only)
 */
router.put('/admin/features/:id/segments', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { segments } = req.body;

    if (!segments || !Array.isArray(segments)) {
      return res.status(400).json({
        success: false,
        message: 'User segments array is required',
      });
    }

    // Validate segment types
    const validTypes = ['all', 'premium', 'free', 'beta_testers', 'by_country'];
    for (const segment of segments) {
      if (!validTypes.includes(segment.type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid segment type: ${segment.type}. Valid types: ${validTypes.join(', ')}`,
        });
      }
    }

    const feature = featureFlagService.updateUserSegments(id, segments, userId);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature flag not found',
      });
    }

    logger.info('Feature segments updated', { featureId: id, segments, updatedBy: userId });

    res.json({
      success: true,
      message: 'User segments updated successfully',
      feature,
    });
  } catch (error: any) {
    logger.error('Error updating user segments', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update user segments',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/admin/features/batch/enable
 * Enable multiple features at once (admin only)
 */
router.post('/admin/features/batch/enable', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { featureIds } = req.body;

    if (!featureIds || !Array.isArray(featureIds) || featureIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Feature IDs array is required',
      });
    }

    const features = featureFlagService.enableMultipleFeatures(featureIds, userId);

    // Send push notifications for features with announceOnEnable
    for (const feature of features) {
      if (feature.announceOnEnable) {
        await sendFeatureAnnouncementPush(feature);
      }
    }

    logger.info('Batch enable features', { count: features.length, enabledBy: userId });

    res.json({
      success: true,
      message: `${features.length} feature(s) enabled successfully`,
      features,
    });
  } catch (error: any) {
    logger.error('Error batch enabling features', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to enable features',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/admin/features/batch/disable
 * Disable multiple features at once (admin only)
 */
router.post('/admin/features/batch/disable', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { featureIds } = req.body;

    if (!featureIds || !Array.isArray(featureIds) || featureIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Feature IDs array is required',
      });
    }

    const features = featureFlagService.disableMultipleFeatures(featureIds, userId);

    logger.info('Batch disable features', { count: features.length, disabledBy: userId });

    res.json({
      success: true,
      message: `${features.length} feature(s) disabled successfully`,
      features,
    });
  } catch (error: any) {
    logger.error('Error batch disabling features', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to disable features',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/features/announcements
 * Get all announcements (admin only)
 */
router.get('/admin/features/announcements', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let announcements = featureFlagService.getAllAnnouncements();

    if (active !== undefined) {
      const isActive = active === 'true';
      const now = new Date();
      announcements = announcements.filter(a =>
        isActive ? (a.isActive && a.expiresAt > now) : (!a.isActive || a.expiresAt <= now)
      );
    }

    res.json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error: any) {
    logger.error('Error listing announcements', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to list announcements',
      error: error.message,
    });
  }
});

// ============================================================
// USER ROUTES - Require User Authentication
// ============================================================

/**
 * GET /api/v1/features
 * Get all features enabled for current user
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userContext = getUserContext(req);
    const features = featureFlagService.getEnabledFeaturesForUser(userContext);

    // Return simplified feature info for users
    const simplifiedFeatures = features.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      enabled: true,
    }));

    res.json({
      success: true,
      count: simplifiedFeatures.length,
      features: simplifiedFeatures,
    });
  } catch (error: any) {
    logger.error('Error fetching user features', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch features',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/features/check/:name
 * Check if a specific feature is enabled for current user
 */
router.get('/check/:name', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const userContext = getUserContext(req);
    const isEnabled = featureFlagService.isFeatureEnabled(name, userContext);

    res.json({
      success: true,
      feature: name,
      enabled: isEnabled,
    });
  } catch (error: any) {
    logger.error('Error checking feature', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to check feature',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/features/announcements
 * Get active announcements for current user
 */
router.get('/announcements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userContext = getUserContext(req);
    const announcements = featureFlagService.getActiveAnnouncementsForUser(userContext);

    res.json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error: any) {
    logger.error('Error fetching user announcements', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/features/announcements/:id/view
 * Track announcement view
 */
router.post('/announcements/:id/view', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    featureFlagService.trackAnnouncementView(id);

    res.json({
      success: true,
      message: 'View tracked',
    });
  } catch (error: any) {
    logger.error('Error tracking announcement view', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to track view',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/features/announcements/:id/dismiss
 * Track announcement dismiss
 */
router.post('/announcements/:id/dismiss', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    featureFlagService.trackAnnouncementDismiss(id);

    res.json({
      success: true,
      message: 'Dismiss tracked',
    });
  } catch (error: any) {
    logger.error('Error tracking announcement dismiss', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to track dismiss',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/features/announcements/:id/click
 * Track announcement click
 */
router.post('/announcements/:id/click', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    featureFlagService.trackAnnouncementClick(id);

    res.json({
      success: true,
      message: 'Click tracked',
    });
  } catch (error: any) {
    logger.error('Error tracking announcement click', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to track click',
      error: error.message,
    });
  }
});

// ============================================================
// PUSH NOTIFICATION HELPER
// ============================================================

/**
 * Send push notification when feature is enabled
 */
async function sendFeatureAnnouncementPush(feature: any): Promise<void> {
  try {
    const title = feature.announcementTitle || `New Feature: ${feature.name}`;
    const body = feature.announcementMessage || feature.description;

    // Get user IDs based on segments
    // In production, this would query the database for users matching the segments
    // For now, we emit an event that can be handled by other services
    logger.info('Feature announcement push notification triggered', {
      featureId: feature.id,
      featureName: feature.name,
      segments: feature.userSegments,
    });

    // Emit event for push notification system to handle
    featureFlagService.emit('feature:push_notification', {
      feature,
      title,
      body,
      data: {
        type: 'FEATURE_ANNOUNCEMENT',
        featureId: feature.id,
        featureName: feature.name,
        priority: 'medium',
      },
    });
  } catch (error) {
    logger.error('Error sending feature announcement push', { error, featureId: feature.id });
  }
}

export default router;

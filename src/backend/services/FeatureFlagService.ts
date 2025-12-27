/**
 * TIME Feature Flag Service
 *
 * Master Admin Feature Control Panel for TIME BEYOND US
 *
 * Features:
 * - Feature flag management with enable/disable
 * - Percentage-based gradual rollout
 * - User segment targeting (all, premium, free, beta_testers, by_country)
 * - Auto-announcement when features are enabled
 * - Push notification integration
 * - In-app banner support
 *
 * Version 1.0.0 | December 2025
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('FeatureFlagService');

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export type UserSegment = 'all' | 'premium' | 'free' | 'beta_testers' | 'by_country';

export interface UserSegmentConfig {
  type: UserSegment;
  countries?: string[];  // For by_country segment
  betaTesterIds?: string[]; // Specific beta tester user IDs
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  userSegments: UserSegmentConfig[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;

  // Announcement configuration
  announceOnEnable: boolean;
  announcementTitle?: string;
  announcementMessage?: string;
  announcementBannerType?: 'info' | 'success' | 'warning' | 'feature';
  announcementDurationDays?: number;

  // Tracking
  enabledAt?: Date;
  disabledAt?: Date;
  enableHistory: FeatureEnableEvent[];
}

export interface FeatureEnableEvent {
  id: string;
  action: 'enabled' | 'disabled';
  timestamp: Date;
  performedBy: string;
  previousState: boolean;
  rolloutPercentage: number;
  userSegments: UserSegmentConfig[];
  announcementSent: boolean;
  affectedUsers?: number;
}

export interface Announcement {
  id: string;
  featureId: string;
  featureName: string;
  title: string;
  message: string;
  bannerType: 'info' | 'success' | 'warning' | 'feature';
  createdAt: Date;
  expiresAt: Date;
  targetSegments: UserSegmentConfig[];
  isActive: boolean;
  viewCount: number;
  dismissCount: number;
  clickCount: number;
}

export interface FeatureFlagStats {
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  activeAnnouncements: number;
  flagsBySegment: Record<string, number>;
  recentChanges: FeatureEnableEvent[];
}

export interface UserContext {
  userId: string;
  isPremium: boolean;
  isBetaTester: boolean;
  country?: string;
  createdAt?: Date;
}

// ============================================================
// FEATURE FLAG SERVICE CLASS
// ============================================================

class FeatureFlagService extends EventEmitter {
  // Storage (in-memory, would be MongoDB in production)
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private announcements: Map<string, Announcement> = new Map();

  // User roll cache for consistent percentage-based rollout
  private userRollCache: Map<string, Map<string, number>> = new Map(); // featureId -> userId -> roll

  constructor() {
    super();
    this.initializeDefaultFlags();
    logger.info('Feature Flag Service initialized');
  }

  // ============================================================
  // FEATURE FLAG CRUD
  // ============================================================

  /**
   * Create a new feature flag
   */
  createFeatureFlag(params: {
    name: string;
    description: string;
    enabled?: boolean;
    rolloutPercentage?: number;
    userSegments?: UserSegmentConfig[];
    announceOnEnable?: boolean;
    announcementTitle?: string;
    announcementMessage?: string;
    announcementBannerType?: 'info' | 'success' | 'warning' | 'feature';
    announcementDurationDays?: number;
    createdBy: string;
  }): FeatureFlag {
    const id = uuidv4();

    const flag: FeatureFlag = {
      id,
      name: params.name,
      description: params.description,
      enabled: params.enabled || false,
      rolloutPercentage: params.rolloutPercentage ?? 100,
      userSegments: params.userSegments || [{ type: 'all' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.createdBy,
      announceOnEnable: params.announceOnEnable ?? true,
      announcementTitle: params.announcementTitle,
      announcementMessage: params.announcementMessage,
      announcementBannerType: params.announcementBannerType || 'feature',
      announcementDurationDays: params.announcementDurationDays || 7,
      enableHistory: [],
    };

    this.featureFlags.set(id, flag);

    this.emit('feature:created', flag);
    logger.info(`Feature flag created: ${params.name}`, { id, createdBy: params.createdBy });

    return flag;
  }

  /**
   * Get a feature flag by ID
   */
  getFeatureFlag(id: string): FeatureFlag | null {
    return this.featureFlags.get(id) || null;
  }

  /**
   * Get a feature flag by name
   */
  getFeatureFlagByName(name: string): FeatureFlag | null {
    for (const flag of this.featureFlags.values()) {
      if (flag.name.toLowerCase() === name.toLowerCase()) {
        return flag;
      }
    }
    return null;
  }

  /**
   * Get all feature flags
   */
  getAllFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Update a feature flag
   */
  updateFeatureFlag(
    id: string,
    updates: Partial<Omit<FeatureFlag, 'id' | 'createdAt' | 'createdBy' | 'enableHistory'>>,
    updatedBy: string
  ): FeatureFlag | null {
    const flag = this.featureFlags.get(id);
    if (!flag) return null;

    const previousEnabled = flag.enabled;

    // Apply updates
    Object.assign(flag, {
      ...updates,
      updatedAt: new Date(),
      updatedBy,
    });

    // Track enable/disable events
    if (updates.enabled !== undefined && updates.enabled !== previousEnabled) {
      const event: FeatureEnableEvent = {
        id: uuidv4(),
        action: updates.enabled ? 'enabled' : 'disabled',
        timestamp: new Date(),
        performedBy: updatedBy,
        previousState: previousEnabled,
        rolloutPercentage: flag.rolloutPercentage,
        userSegments: flag.userSegments,
        announcementSent: false,
      };

      flag.enableHistory.push(event);

      if (updates.enabled) {
        flag.enabledAt = new Date();

        // Create announcement if configured
        if (flag.announceOnEnable) {
          const announcement = this.createAnnouncementForFeature(flag);
          event.announcementSent = true;

          // Emit event for push notification system
          this.emit('feature:announcement', {
            feature: flag,
            announcement,
          });
        }
      } else {
        flag.disabledAt = new Date();

        // Deactivate any active announcements for this feature
        this.deactivateAnnouncementsForFeature(id);
      }

      this.emit(updates.enabled ? 'feature:enabled' : 'feature:disabled', flag);
    }

    this.emit('feature:updated', flag);
    logger.info(`Feature flag updated: ${flag.name}`, { id, updatedBy, changes: Object.keys(updates) });

    return flag;
  }

  /**
   * Delete a feature flag
   */
  deleteFeatureFlag(id: string, deletedBy: string): boolean {
    const flag = this.featureFlags.get(id);
    if (!flag) return false;

    // Deactivate announcements
    this.deactivateAnnouncementsForFeature(id);

    // Remove from storage
    this.featureFlags.delete(id);

    // Clear user roll cache
    this.userRollCache.delete(id);

    this.emit('feature:deleted', { id, name: flag.name, deletedBy });
    logger.info(`Feature flag deleted: ${flag.name}`, { id, deletedBy });

    return true;
  }

  /**
   * Toggle feature flag enabled state
   */
  toggleFeatureFlag(id: string, toggledBy: string): FeatureFlag | null {
    const flag = this.featureFlags.get(id);
    if (!flag) return null;

    return this.updateFeatureFlag(id, { enabled: !flag.enabled }, toggledBy);
  }

  // ============================================================
  // FEATURE FLAG EVALUATION
  // ============================================================

  /**
   * Check if a feature is enabled for a specific user
   */
  isFeatureEnabled(featureName: string, userContext: UserContext): boolean {
    const flag = this.getFeatureFlagByName(featureName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check user segment targeting
    if (!this.isUserInTargetSegment(userContext, flag.userSegments)) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userRoll = this.getUserRoll(flag.id, userContext.userId);
      if (userRoll > flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a feature is enabled by ID
   */
  isFeatureEnabledById(featureId: string, userContext: UserContext): boolean {
    const flag = this.featureFlags.get(featureId);
    if (!flag) return false;

    return this.isFeatureEnabled(flag.name, userContext);
  }

  /**
   * Get all enabled features for a user
   */
  getEnabledFeaturesForUser(userContext: UserContext): FeatureFlag[] {
    return this.getAllFeatureFlags().filter(flag =>
      this.isFeatureEnabled(flag.name, userContext)
    );
  }

  /**
   * Check if user is in target segment
   */
  private isUserInTargetSegment(userContext: UserContext, segments: UserSegmentConfig[]): boolean {
    if (segments.length === 0) return true;

    for (const segment of segments) {
      switch (segment.type) {
        case 'all':
          return true;

        case 'premium':
          if (userContext.isPremium) return true;
          break;

        case 'free':
          if (!userContext.isPremium) return true;
          break;

        case 'beta_testers':
          if (userContext.isBetaTester) return true;
          if (segment.betaTesterIds?.includes(userContext.userId)) return true;
          break;

        case 'by_country':
          if (segment.countries && userContext.country) {
            if (segment.countries.includes(userContext.country)) return true;
          }
          break;
      }
    }

    return false;
  }

  /**
   * Get consistent user roll for percentage-based rollout
   */
  private getUserRoll(featureId: string, userId: string): number {
    let featureCache = this.userRollCache.get(featureId);
    if (!featureCache) {
      featureCache = new Map();
      this.userRollCache.set(featureId, featureCache);
    }

    let roll = featureCache.get(userId);
    if (roll === undefined) {
      // Generate consistent roll based on hash
      roll = this.hashToPercent(featureId + userId);
      featureCache.set(userId, roll);
    }

    return roll;
  }

  /**
   * Hash string to percentage (0-100)
   */
  private hashToPercent(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash % 100);
  }

  // ============================================================
  // ANNOUNCEMENTS
  // ============================================================

  /**
   * Create announcement for a feature
   */
  private createAnnouncementForFeature(flag: FeatureFlag): Announcement {
    const id = uuidv4();
    const durationDays = flag.announcementDurationDays || 7;

    const announcement: Announcement = {
      id,
      featureId: flag.id,
      featureName: flag.name,
      title: flag.announcementTitle || `New Feature: ${flag.name}`,
      message: flag.announcementMessage || flag.description,
      bannerType: flag.announcementBannerType || 'feature',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      targetSegments: flag.userSegments,
      isActive: true,
      viewCount: 0,
      dismissCount: 0,
      clickCount: 0,
    };

    this.announcements.set(id, announcement);

    this.emit('announcement:created', announcement);
    logger.info(`Announcement created for feature: ${flag.name}`, { announcementId: id, featureId: flag.id });

    return announcement;
  }

  /**
   * Deactivate announcements for a feature
   */
  private deactivateAnnouncementsForFeature(featureId: string): void {
    for (const announcement of this.announcements.values()) {
      if (announcement.featureId === featureId && announcement.isActive) {
        announcement.isActive = false;
        this.emit('announcement:deactivated', announcement);
      }
    }
  }

  /**
   * Get active announcements for a user
   */
  getActiveAnnouncementsForUser(userContext: UserContext): Announcement[] {
    const now = new Date();

    return Array.from(this.announcements.values())
      .filter(a =>
        a.isActive &&
        a.expiresAt > now &&
        this.isUserInTargetSegment(userContext, a.targetSegments)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Track announcement view
   */
  trackAnnouncementView(announcementId: string): void {
    const announcement = this.announcements.get(announcementId);
    if (announcement) {
      announcement.viewCount++;
    }
  }

  /**
   * Track announcement dismiss
   */
  trackAnnouncementDismiss(announcementId: string): void {
    const announcement = this.announcements.get(announcementId);
    if (announcement) {
      announcement.dismissCount++;
    }
  }

  /**
   * Track announcement click
   */
  trackAnnouncementClick(announcementId: string): void {
    const announcement = this.announcements.get(announcementId);
    if (announcement) {
      announcement.clickCount++;
    }
  }

  /**
   * Get all announcements
   */
  getAllAnnouncements(): Announcement[] {
    return Array.from(this.announcements.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get announcement by ID
   */
  getAnnouncement(id: string): Announcement | null {
    return this.announcements.get(id) || null;
  }

  // ============================================================
  // STATISTICS & ANALYTICS
  // ============================================================

  /**
   * Get feature flag statistics
   */
  getStats(): FeatureFlagStats {
    const flags = this.getAllFeatureFlags();
    const enabledFlags = flags.filter(f => f.enabled);
    const now = new Date();

    // Count active announcements
    const activeAnnouncements = Array.from(this.announcements.values())
      .filter(a => a.isActive && a.expiresAt > now).length;

    // Count flags by segment
    const flagsBySegment: Record<string, number> = {
      all: 0,
      premium: 0,
      free: 0,
      beta_testers: 0,
      by_country: 0,
    };

    for (const flag of flags) {
      for (const segment of flag.userSegments) {
        flagsBySegment[segment.type] = (flagsBySegment[segment.type] || 0) + 1;
      }
    }

    // Get recent changes
    const recentChanges: FeatureEnableEvent[] = [];
    for (const flag of flags) {
      recentChanges.push(...flag.enableHistory);
    }
    recentChanges.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalFlags: flags.length,
      enabledFlags: enabledFlags.length,
      disabledFlags: flags.length - enabledFlags.length,
      activeAnnouncements,
      flagsBySegment,
      recentChanges: recentChanges.slice(0, 20),
    };
  }

  // ============================================================
  // BATCH OPERATIONS
  // ============================================================

  /**
   * Enable multiple features at once
   */
  enableMultipleFeatures(featureIds: string[], enabledBy: string): FeatureFlag[] {
    const results: FeatureFlag[] = [];

    for (const id of featureIds) {
      const flag = this.updateFeatureFlag(id, { enabled: true }, enabledBy);
      if (flag) {
        results.push(flag);
      }
    }

    return results;
  }

  /**
   * Disable multiple features at once
   */
  disableMultipleFeatures(featureIds: string[], disabledBy: string): FeatureFlag[] {
    const results: FeatureFlag[] = [];

    for (const id of featureIds) {
      const flag = this.updateFeatureFlag(id, { enabled: false }, disabledBy);
      if (flag) {
        results.push(flag);
      }
    }

    return results;
  }

  /**
   * Update rollout percentage for a feature
   */
  updateRolloutPercentage(id: string, percentage: number, updatedBy: string): FeatureFlag | null {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    return this.updateFeatureFlag(id, { rolloutPercentage: clampedPercentage }, updatedBy);
  }

  /**
   * Update user segments for a feature
   */
  updateUserSegments(id: string, segments: UserSegmentConfig[], updatedBy: string): FeatureFlag | null {
    return this.updateFeatureFlag(id, { userSegments: segments }, updatedBy);
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags(): void {
    const defaultFlags = [
      {
        name: 'dark_mode',
        description: 'Enable dark mode theme across the platform',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: [{ type: 'all' as UserSegment }],
      },
      {
        name: 'ai_trading_bots',
        description: 'AI-powered trading bot recommendations and automation',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: [{ type: 'all' as UserSegment }],
      },
      {
        name: 'advanced_charts',
        description: 'Advanced charting with technical indicators',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: [{ type: 'all' as UserSegment }],
      },
      {
        name: 'social_trading',
        description: 'Copy trades from top performers',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: [{ type: 'premium' as UserSegment }],
      },
      {
        name: 'beta_features',
        description: 'Access to experimental beta features',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: [{ type: 'beta_testers' as UserSegment }],
      },
      {
        name: 'ultimate_money_machine',
        description: 'Premium automated wealth building system',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: [{ type: 'premium' as UserSegment }],
      },
      {
        name: 'defi_integration',
        description: 'DeFi yield farming and liquidity provision',
        enabled: true,
        rolloutPercentage: 75,
        userSegments: [{ type: 'premium' as UserSegment }],
      },
      {
        name: 'crypto_futures',
        description: 'Cryptocurrency futures trading',
        enabled: false,
        rolloutPercentage: 25,
        userSegments: [{ type: 'beta_testers' as UserSegment }],
      },
    ];

    for (const flagData of defaultFlags) {
      this.createFeatureFlag({
        ...flagData,
        createdBy: 'system',
        announceOnEnable: false,
      });
    }

    logger.info(`Initialized ${defaultFlags.length} default feature flags`);
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();
export default FeatureFlagService;

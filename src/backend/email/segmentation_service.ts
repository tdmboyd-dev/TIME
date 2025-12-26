/**
 * Email Segmentation Service for TIME
 *
 * Advanced user segmentation for targeted email campaigns:
 * - Tier-based segmentation (Free, Basic, Pro, Premium, Enterprise)
 * - Activity-based segmentation (Active, Inactive, Churned)
 * - Asset class preference segmentation (Crypto, Stocks, Forex, Options)
 * - Behavioral segmentation (Bot creators, Manual traders, High volume)
 * - Dynamic segment evaluation
 * - Segment combinations with AND/OR logic
 *
 * PRICING (correct as of 2025):
 * - FREE: $0/mo - 1 bot
 * - BASIC: $19/mo - 3 bots
 * - PRO: $49/mo - 7 bots
 * - PREMIUM: $109/mo - 11 Super Bots
 * - ENTERPRISE: $450/mo - Unlimited
 */

import { createComponentLogger } from '../utils/logger';
import { UserSegment } from './drip_sequences';

const logger = createComponentLogger('SegmentationService');

/**
 * Segment Rule Types
 */
export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists'
  | 'between'
  | 'before'
  | 'after'
  | 'within_days'
  | 'older_than_days';

export interface SegmentRule {
  field: string;
  operator: RuleOperator;
  value: any;
}

export interface SegmentGroup {
  operator: 'AND' | 'OR';
  rules: (SegmentRule | SegmentGroup)[];
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  type: 'static' | 'dynamic';
  rules: SegmentGroup;
  userCount?: number;
  lastEvaluated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Profile for Segmentation
 */
export interface UserProfile {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;

  // Tier Information
  tier: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'trial';
  subscriptionStartDate?: Date;
  trialEndDate?: Date;

  // Activity Information
  createdAt: Date;
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  totalLogins: number;
  totalTrades: number;
  totalProfit: number;

  // Asset Class Preferences
  preferredAssets: string[]; // ['crypto', 'stocks', 'forex', 'options']
  tradedAssets: string[];
  topAsset?: string;

  // Bot Usage
  activeBots: number;
  createdBots: number;
  botProfitTotal: number;

  // Broker Information
  brokerConnected: boolean;
  brokerType?: string;

  // Email Engagement
  emailsReceived: number;
  emailsOpened: number;
  emailsClicked: number;
  unsubscribed: boolean;
  emailPreferences?: {
    marketing: boolean;
    transactional: boolean;
    newsletter: boolean;
  };

  // Custom Tags
  tags: string[];
  customFields?: Record<string, any>;
}

/**
 * Pre-defined Segment Definitions
 */
export const PREDEFINED_SEGMENTS: Record<string, Segment> = {
  // Tier-based segments
  free_tier: {
    id: 'seg_free_tier',
    name: 'Free Tier Users',
    description: 'All users on the free plan',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'tier', operator: 'equals', value: 'FREE' }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  basic_tier: {
    id: 'seg_basic_tier',
    name: 'Basic Tier Users',
    description: 'All users on the Basic plan ($19/mo)',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'tier', operator: 'equals', value: 'BASIC' }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  pro_tier: {
    id: 'seg_pro_tier',
    name: 'Pro Tier Users',
    description: 'All users on the Pro plan ($49/mo)',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'tier', operator: 'equals', value: 'PRO' }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  premium_tier: {
    id: 'seg_premium_tier',
    name: 'Premium Tier Users',
    description: 'All users on the Premium plan ($109/mo)',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'tier', operator: 'equals', value: 'PREMIUM' }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  enterprise_tier: {
    id: 'seg_enterprise_tier',
    name: 'Enterprise Tier Users',
    description: 'All users on the Enterprise plan ($450/mo)',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'tier', operator: 'equals', value: 'ENTERPRISE' }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  paid_users: {
    id: 'seg_paid_users',
    name: 'All Paid Users',
    description: 'Users on any paid plan',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [
        { field: 'tier', operator: 'in', value: ['BASIC', 'PRO', 'PREMIUM', 'ENTERPRISE'] },
        { field: 'subscriptionStatus', operator: 'equals', value: 'active' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Activity-based segments
  new_users: {
    id: 'seg_new_users',
    name: 'New Users (Last 7 Days)',
    description: 'Users who signed up in the last 7 days',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'createdAt', operator: 'within_days', value: 7 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  active_users: {
    id: 'seg_active_users',
    name: 'Active Users',
    description: 'Users who logged in within the last 7 days',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'lastLoginAt', operator: 'within_days', value: 7 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  inactive_7_days: {
    id: 'seg_inactive_7_days',
    name: 'Inactive 7 Days',
    description: 'Users who haven\'t logged in for 7+ days',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'lastLoginAt', operator: 'older_than_days', value: 7 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  inactive_14_days: {
    id: 'seg_inactive_14_days',
    name: 'Inactive 14 Days',
    description: 'Users who haven\'t logged in for 14+ days',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'lastLoginAt', operator: 'older_than_days', value: 14 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  inactive_30_days: {
    id: 'seg_inactive_30_days',
    name: 'Inactive 30 Days',
    description: 'Users who haven\'t logged in for 30+ days',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'lastLoginAt', operator: 'older_than_days', value: 30 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  churned_users: {
    id: 'seg_churned',
    name: 'Churned Users',
    description: 'Users who cancelled their subscription',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'subscriptionStatus', operator: 'equals', value: 'cancelled' }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Asset class preference segments
  crypto_traders: {
    id: 'seg_crypto_traders',
    name: 'Crypto Traders',
    description: 'Users who primarily trade cryptocurrencies',
    type: 'dynamic',
    rules: {
      operator: 'OR',
      rules: [
        { field: 'topAsset', operator: 'equals', value: 'crypto' },
        { field: 'preferredAssets', operator: 'contains', value: 'crypto' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  stock_traders: {
    id: 'seg_stock_traders',
    name: 'Stock Traders',
    description: 'Users who primarily trade stocks',
    type: 'dynamic',
    rules: {
      operator: 'OR',
      rules: [
        { field: 'topAsset', operator: 'equals', value: 'stocks' },
        { field: 'preferredAssets', operator: 'contains', value: 'stocks' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  forex_traders: {
    id: 'seg_forex_traders',
    name: 'Forex Traders',
    description: 'Users who primarily trade forex',
    type: 'dynamic',
    rules: {
      operator: 'OR',
      rules: [
        { field: 'topAsset', operator: 'equals', value: 'forex' },
        { field: 'preferredAssets', operator: 'contains', value: 'forex' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  options_traders: {
    id: 'seg_options_traders',
    name: 'Options Traders',
    description: 'Users who trade options',
    type: 'dynamic',
    rules: {
      operator: 'OR',
      rules: [
        { field: 'topAsset', operator: 'equals', value: 'options' },
        { field: 'preferredAssets', operator: 'contains', value: 'options' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  multi_asset_traders: {
    id: 'seg_multi_asset',
    name: 'Multi-Asset Traders',
    description: 'Users who trade multiple asset classes',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'tradedAssets', operator: 'greater_than', value: 1 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Behavioral segments
  bot_creators: {
    id: 'seg_bot_creators',
    name: 'Bot Creators',
    description: 'Users who have created custom bots',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'createdBots', operator: 'greater_than', value: 0 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  bot_users: {
    id: 'seg_bot_users',
    name: 'Active Bot Users',
    description: 'Users with active bots running',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'activeBots', operator: 'greater_than', value: 0 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  no_bots: {
    id: 'seg_no_bots',
    name: 'No Active Bots',
    description: 'Users without any active bots',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'activeBots', operator: 'equals', value: 0 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  high_volume_traders: {
    id: 'seg_high_volume',
    name: 'High Volume Traders',
    description: 'Users with 100+ total trades',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'totalTrades', operator: 'greater_than_or_equals', value: 100 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  profitable_traders: {
    id: 'seg_profitable',
    name: 'Profitable Traders',
    description: 'Users with positive total profit',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'totalProfit', operator: 'greater_than', value: 0 }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  broker_not_connected: {
    id: 'seg_no_broker',
    name: 'Broker Not Connected',
    description: 'Users who haven\'t connected a broker',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [{ field: 'brokerConnected', operator: 'equals', value: false }]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Email engagement segments
  engaged_subscribers: {
    id: 'seg_engaged',
    name: 'Engaged Email Subscribers',
    description: 'Users who opened at least 50% of emails',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [
        { field: 'emailsReceived', operator: 'greater_than', value: 5 },
        { field: 'unsubscribed', operator: 'equals', value: false }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  unengaged_subscribers: {
    id: 'seg_unengaged',
    name: 'Unengaged Email Subscribers',
    description: 'Users who rarely open emails',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [
        { field: 'emailsReceived', operator: 'greater_than', value: 10 },
        { field: 'emailsOpened', operator: 'less_than', value: 3 }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Upgrade-ready segments
  upgrade_ready_free: {
    id: 'seg_upgrade_ready_free',
    name: 'Free Users Ready to Upgrade',
    description: 'Active free users who might be ready to upgrade',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [
        { field: 'tier', operator: 'equals', value: 'FREE' },
        { field: 'lastLoginAt', operator: 'within_days', value: 7 },
        { field: 'totalTrades', operator: 'greater_than', value: 10 },
        { field: 'brokerConnected', operator: 'equals', value: true }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  upgrade_ready_basic: {
    id: 'seg_upgrade_ready_basic',
    name: 'Basic Users Ready for Pro/Premium',
    description: 'Basic users hitting their limits',
    type: 'dynamic',
    rules: {
      operator: 'AND',
      rules: [
        { field: 'tier', operator: 'equals', value: 'BASIC' },
        { field: 'activeBots', operator: 'equals', value: 3 },
        { field: 'lastLoginAt', operator: 'within_days', value: 7 }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

/**
 * Segmentation Service
 */
export class SegmentationService {
  private segments: Map<string, Segment> = new Map();
  private userSegmentCache: Map<string, Set<string>> = new Map();
  private cacheExpiry: Map<string, Date> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Load predefined segments
    Object.values(PREDEFINED_SEGMENTS).forEach(segment => {
      this.segments.set(segment.id, segment);
    });

    logger.info('Segmentation service initialized', {
      predefinedSegments: Object.keys(PREDEFINED_SEGMENTS).length
    });
  }

  /**
   * Evaluate if a user matches segment rules
   */
  evaluateUser(user: UserProfile, segment: Segment): boolean {
    return this.evaluateGroup(user, segment.rules);
  }

  private evaluateGroup(user: UserProfile, group: SegmentGroup): boolean {
    if (group.operator === 'AND') {
      return group.rules.every(rule => this.evaluateRuleOrGroup(user, rule));
    } else {
      return group.rules.some(rule => this.evaluateRuleOrGroup(user, rule));
    }
  }

  private evaluateRuleOrGroup(user: UserProfile, rule: SegmentRule | SegmentGroup): boolean {
    if ('operator' in rule && ('rules' in rule)) {
      return this.evaluateGroup(user, rule as SegmentGroup);
    }
    return this.evaluateRule(user, rule as SegmentRule);
  }

  private evaluateRule(user: UserProfile, rule: SegmentRule): boolean {
    const value = this.getFieldValue(user, rule.field);

    switch (rule.operator) {
      case 'equals':
        return value === rule.value;

      case 'not_equals':
        return value !== rule.value;

      case 'contains':
        if (Array.isArray(value)) {
          return value.includes(rule.value);
        }
        return String(value).includes(String(rule.value));

      case 'not_contains':
        if (Array.isArray(value)) {
          return !value.includes(rule.value);
        }
        return !String(value).includes(String(rule.value));

      case 'greater_than':
        return Number(value) > Number(rule.value);

      case 'less_than':
        return Number(value) < Number(rule.value);

      case 'greater_than_or_equals':
        return Number(value) >= Number(rule.value);

      case 'less_than_or_equals':
        return Number(value) <= Number(rule.value);

      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);

      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value);

      case 'exists':
        return value !== undefined && value !== null;

      case 'not_exists':
        return value === undefined || value === null;

      case 'between':
        if (Array.isArray(rule.value) && rule.value.length === 2) {
          const num = Number(value);
          return num >= Number(rule.value[0]) && num <= Number(rule.value[1]);
        }
        return false;

      case 'before':
        if (value instanceof Date && rule.value instanceof Date) {
          return value < rule.value;
        }
        return new Date(value) < new Date(rule.value);

      case 'after':
        if (value instanceof Date && rule.value instanceof Date) {
          return value > rule.value;
        }
        return new Date(value) > new Date(rule.value);

      case 'within_days':
        if (value instanceof Date) {
          const daysDiff = (Date.now() - value.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= Number(rule.value);
        }
        return false;

      case 'older_than_days':
        if (value instanceof Date) {
          const daysDiff = (Date.now() - value.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff > Number(rule.value);
        }
        return false;

      default:
        logger.warn('Unknown operator', { operator: rule.operator });
        return false;
    }
  }

  private getFieldValue(user: UserProfile, field: string): any {
    const parts = field.split('.');
    let value: any = user;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Get all segments a user belongs to
   */
  getUserSegments(user: UserProfile, forceRefresh: boolean = false): string[] {
    const cacheKey = user.userId;
    const now = new Date();

    // Check cache
    if (!forceRefresh && this.userSegmentCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && expiry > now) {
        return Array.from(this.userSegmentCache.get(cacheKey)!);
      }
    }

    // Evaluate all segments
    const matchedSegments = new Set<string>();

    for (const [segmentId, segment] of this.segments) {
      if (this.evaluateUser(user, segment)) {
        matchedSegments.add(segmentId);
      }
    }

    // Update cache
    this.userSegmentCache.set(cacheKey, matchedSegments);
    this.cacheExpiry.set(cacheKey, new Date(now.getTime() + this.cacheTTL));

    return Array.from(matchedSegments);
  }

  /**
   * Get users in a specific segment
   */
  async getUsersInSegment(
    segmentId: string,
    users: UserProfile[]
  ): Promise<UserProfile[]> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      logger.warn('Segment not found', { segmentId });
      return [];
    }

    return users.filter(user => this.evaluateUser(user, segment));
  }

  /**
   * Create a new segment
   */
  createSegment(segment: Omit<Segment, 'id' | 'createdAt' | 'updatedAt'>): Segment {
    const newSegment: Segment = {
      ...segment,
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.segments.set(newSegment.id, newSegment);
    logger.info('Segment created', { segmentId: newSegment.id, name: newSegment.name });
    return newSegment;
  }

  /**
   * Update a segment
   */
  updateSegment(
    segmentId: string,
    updates: Partial<Omit<Segment, 'id' | 'createdAt'>>
  ): Segment | null {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      logger.warn('Segment not found for update', { segmentId });
      return null;
    }

    const updated: Segment = {
      ...segment,
      ...updates,
      updatedAt: new Date()
    };

    this.segments.set(segmentId, updated);

    // Invalidate cache for this segment
    this.invalidateSegmentCache();

    logger.info('Segment updated', { segmentId });
    return updated;
  }

  /**
   * Delete a segment
   */
  deleteSegment(segmentId: string): boolean {
    const deleted = this.segments.delete(segmentId);
    if (deleted) {
      this.invalidateSegmentCache();
      logger.info('Segment deleted', { segmentId });
    }
    return deleted;
  }

  /**
   * Get segment by ID
   */
  getSegment(segmentId: string): Segment | undefined {
    return this.segments.get(segmentId);
  }

  /**
   * List all segments
   */
  listSegments(): Segment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Convert UserSegment enum to segment ID
   */
  getSegmentIdFromEnum(segment: UserSegment): string | null {
    const mapping: Record<UserSegment, string> = {
      [UserSegment.FREE_TIER]: 'seg_free_tier',
      [UserSegment.BASIC_TIER]: 'seg_basic_tier',
      [UserSegment.PRO_TIER]: 'seg_pro_tier',
      [UserSegment.PREMIUM_TIER]: 'seg_premium_tier',
      [UserSegment.ENTERPRISE_TIER]: 'seg_enterprise_tier',
      [UserSegment.NEW_USER]: 'seg_new_users',
      [UserSegment.ACTIVE_USER]: 'seg_active_users',
      [UserSegment.INACTIVE_7_DAYS]: 'seg_inactive_7_days',
      [UserSegment.INACTIVE_14_DAYS]: 'seg_inactive_14_days',
      [UserSegment.INACTIVE_30_DAYS]: 'seg_inactive_30_days',
      [UserSegment.INACTIVE_60_DAYS]: 'seg_inactive_30_days', // Fallback
      [UserSegment.CHURNED]: 'seg_churned',
      [UserSegment.CRYPTO_TRADER]: 'seg_crypto_traders',
      [UserSegment.STOCK_TRADER]: 'seg_stock_traders',
      [UserSegment.FOREX_TRADER]: 'seg_forex_traders',
      [UserSegment.OPTIONS_TRADER]: 'seg_options_traders',
      [UserSegment.MULTI_ASSET]: 'seg_multi_asset',
      [UserSegment.BOT_CREATOR]: 'seg_bot_creators',
      [UserSegment.BOT_USER]: 'seg_bot_users',
      [UserSegment.MANUAL_TRADER]: 'seg_no_bots',
      [UserSegment.HIGH_VOLUME]: 'seg_high_volume',
      [UserSegment.LOW_VOLUME]: 'seg_active_users', // Fallback
      [UserSegment.PROFITABLE]: 'seg_profitable',
      [UserSegment.LOSING]: 'seg_active_users' // Fallback
    };

    return mapping[segment] || null;
  }

  /**
   * Invalidate cache
   */
  private invalidateSegmentCache(): void {
    this.userSegmentCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get segment statistics
   */
  async getSegmentStats(segmentId: string, users: UserProfile[]): Promise<{
    total: number;
    byTier: Record<string, number>;
    avgTrades: number;
    avgProfit: number;
  }> {
    const usersInSegment = await this.getUsersInSegment(segmentId, users);

    const byTier: Record<string, number> = {
      FREE: 0,
      BASIC: 0,
      PRO: 0,
      PREMIUM: 0,
      ENTERPRISE: 0
    };

    let totalTrades = 0;
    let totalProfit = 0;

    for (const user of usersInSegment) {
      byTier[user.tier]++;
      totalTrades += user.totalTrades;
      totalProfit += user.totalProfit;
    }

    return {
      total: usersInSegment.length,
      byTier,
      avgTrades: usersInSegment.length > 0 ? totalTrades / usersInSegment.length : 0,
      avgProfit: usersInSegment.length > 0 ? totalProfit / usersInSegment.length : 0
    };
  }
}

// Singleton instance
export const segmentationService = new SegmentationService();

logger.info('Segmentation service module loaded');

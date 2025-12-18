/**
 * Tier Access Middleware
 *
 * Enforces subscription tier limits on routes.
 * Integrates with GiftAccessService for gifted access.
 */

import { Request, Response, NextFunction } from 'express';
import { giftAccessService, SubscriptionTier, GiftableFeature } from '../services/GiftAccessService';

// Feature to tier mapping
const FEATURE_TIERS: Record<GiftableFeature, SubscriptionTier[]> = {
  autopilot: ['PRO', 'UNLIMITED', 'ENTERPRISE'],
  tax_harvesting: ['PRO', 'UNLIMITED', 'ENTERPRISE'],
  dynasty_trust: ['UNLIMITED', 'ENTERPRISE'],
  family_legacy: ['UNLIMITED', 'ENTERPRISE'],
  robo_advisor: ['STARTER', 'PRO', 'UNLIMITED', 'ENTERPRISE'],
  advanced_charts: ['PRO', 'UNLIMITED', 'ENTERPRISE'],
  live_trading: ['STARTER', 'PRO', 'UNLIMITED', 'ENTERPRISE'],
  bot_marketplace: ['PRO', 'UNLIMITED', 'ENTERPRISE'],
  premium_data: ['PRO', 'UNLIMITED', 'ENTERPRISE'],
  all: ['ENTERPRISE'],
};

// Tier hierarchy (higher index = higher tier)
const TIER_HIERARCHY: SubscriptionTier[] = ['FREE', 'STARTER', 'PRO', 'UNLIMITED', 'ENTERPRISE'];

/**
 * Check if tier A is >= tier B
 */
export function tierAtLeast(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const userIndex = TIER_HIERARCHY.indexOf(userTier);
  const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
  return userIndex >= requiredIndex;
}

/**
 * Get user's effective tier (considering gifts)
 */
export function getUserEffectiveTier(userId: string, baseTier: SubscriptionTier = 'FREE'): SubscriptionTier {
  // Check if user has an active gift
  const giftedTier = giftAccessService.getUserEffectiveTier(userId);

  // Return the higher tier
  if (tierAtLeast(giftedTier, baseTier)) {
    return giftedTier;
  }
  return baseTier;
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(userId: string, feature: GiftableFeature, baseTier: SubscriptionTier = 'FREE'): boolean {
  // Check for specific feature gift
  const activeGift = giftAccessService.getUserActiveGift(userId);
  if (activeGift && (activeGift.features.includes(feature) || activeGift.features.includes('all'))) {
    return true;
  }

  // Check tier-based access
  const effectiveTier = getUserEffectiveTier(userId, baseTier);
  const allowedTiers = FEATURE_TIERS[feature];

  return allowedTiers.includes(effectiveTier);
}

/**
 * Middleware factory: Require minimum tier
 */
export function requireTier(minTier: SubscriptionTier) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        requiredTier: minTier,
      });
    }

    const userId = user.id || user.email;
    const baseTier = user.tier || 'FREE';
    const effectiveTier = getUserEffectiveTier(userId, baseTier);

    if (!tierAtLeast(effectiveTier, minTier)) {
      const pricing = giftAccessService.pricing.tiers[minTier];
      return res.status(403).json({
        error: 'Subscription upgrade required',
        currentTier: effectiveTier,
        requiredTier: minTier,
        upgradePrice: pricing.monthlyPrice,
        upgradeFeatures: pricing.features,
        message: `This feature requires ${minTier} tier or higher. Upgrade to unlock!`,
      });
    }

    // Attach effective tier to request for route handlers
    (req as any).effectiveTier = effectiveTier;
    next();
  };
}

/**
 * Middleware factory: Require specific feature
 */
export function requireFeature(feature: GiftableFeature) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        requiredFeature: feature,
      });
    }

    const userId = user.id || user.email;
    const baseTier = user.tier || 'FREE';

    if (!hasFeatureAccess(userId, feature, baseTier)) {
      const requiredTiers = FEATURE_TIERS[feature];
      const minTier = requiredTiers[0];
      const pricing = giftAccessService.pricing.tiers[minTier];

      return res.status(403).json({
        error: 'Feature not available',
        feature,
        requiredTiers,
        minimumTier: minTier,
        upgradePrice: pricing.monthlyPrice,
        message: `The ${feature} feature requires ${minTier} tier or higher.`,
      });
    }

    next();
  };
}

/**
 * Middleware: Check bot limit
 */
export function checkBotLimit(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = user.id || user.email;
  const baseTier = user.tier || 'FREE';
  const effectiveTier = getUserEffectiveTier(userId, baseTier);
  const limits = giftAccessService.pricing.tiers[effectiveTier].limits;

  // -1 means unlimited
  if (limits.maxBots === -1) {
    (req as any).botLimit = Infinity;
    return next();
  }

  // Get current bot count for user
  const currentBots = user.botCount || 0;

  if (currentBots >= limits.maxBots) {
    return res.status(403).json({
      error: 'Bot limit reached',
      currentBots,
      maxBots: limits.maxBots,
      currentTier: effectiveTier,
      message: `You've reached your ${limits.maxBots} bot limit. Upgrade to add more bots!`,
      upgradeTo: effectiveTier === 'FREE' ? 'STARTER' :
                 effectiveTier === 'STARTER' ? 'PRO' :
                 effectiveTier === 'PRO' ? 'UNLIMITED' : null,
    });
  }

  (req as any).botLimit = limits.maxBots;
  (req as any).remainingBots = limits.maxBots - currentBots;
  next();
}

/**
 * Middleware: Check capital limit
 */
export function checkCapitalLimit(amount: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = user.id || user.email;
    const baseTier = user.tier || 'FREE';
    const effectiveTier = getUserEffectiveTier(userId, baseTier);
    const limits = giftAccessService.pricing.tiers[effectiveTier].limits;

    // -1 means unlimited
    if (limits.maxCapital === -1) {
      return next();
    }

    // Get current capital for user
    const currentCapital = user.capital || 0;
    const totalCapital = currentCapital + amount;

    if (totalCapital > limits.maxCapital) {
      return res.status(403).json({
        error: 'Capital limit exceeded',
        currentCapital,
        requestedAmount: amount,
        maxCapital: limits.maxCapital,
        currentTier: effectiveTier,
        message: `This would exceed your $${limits.maxCapital.toLocaleString()} capital limit. Upgrade for higher limits!`,
      });
    }

    next();
  };
}

/**
 * Middleware: Check trade limit
 */
export function checkTradeLimit(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = user.id || user.email;
  const baseTier = user.tier || 'FREE';
  const effectiveTier = getUserEffectiveTier(userId, baseTier);
  const limits = giftAccessService.pricing.tiers[effectiveTier].limits;

  // -1 means unlimited
  if (limits.maxTrades === -1) {
    return next();
  }

  // Get current monthly trade count
  const monthlyTrades = user.monthlyTrades || 0;

  if (monthlyTrades >= limits.maxTrades) {
    return res.status(403).json({
      error: 'Monthly trade limit reached',
      currentTrades: monthlyTrades,
      maxTrades: limits.maxTrades,
      currentTier: effectiveTier,
      message: `You've reached your ${limits.maxTrades} monthly trade limit. Upgrade for more trades!`,
      resetsOn: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    });
  }

  (req as any).tradesRemaining = limits.maxTrades - monthlyTrades;
  next();
}

/**
 * Middleware: Calculate per-trade fee
 */
export function calculateTradeFee(tradeValue: number): { fee: number; type: 'flat' | 'percent' } {
  const flatFee = giftAccessService.pricing.perTradeFee;
  const percentFee = tradeValue * giftAccessService.pricing.perTradePercent;

  // Use whichever is greater
  if (flatFee >= percentFee) {
    return { fee: flatFee, type: 'flat' };
  }
  return { fee: percentFee, type: 'percent' };
}

/**
 * Get tier info for display
 */
export function getTierInfo(tier: SubscriptionTier) {
  return {
    tier,
    ...giftAccessService.pricing.tiers[tier],
    isUnlimited: giftAccessService.pricing.tiers[tier].limits.maxBots === -1,
  };
}

/**
 * Get all tiers for comparison
 */
export function getAllTiers() {
  return TIER_HIERARCHY.map(tier => getTierInfo(tier));
}

export { TIER_HIERARCHY, FEATURE_TIERS };

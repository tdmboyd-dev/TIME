/**
 * PREMIUM FEATURE GATE
 * Version 1.0.0 | December 19, 2025
 *
 * $59/month Premium Tier Access Control
 *
 * Premium Features:
 * - Ultimate Money Machine (autonomous trading)
 * - Auto Role Manager (bot orchestration)
 * - Self-Learning Knowledge Base
 * - Market Attack Strategies
 * - Institutional Edge techniques
 * - Real-time whale tracking
 * - Advanced execution algorithms
 * - Priority support
 */

import { EventEmitter } from 'events';

// Types
export interface PremiumTier {
  id: string;
  name: string;
  price: number; // Monthly USD
  features: string[];
  limits: TierLimits;
  isActive: boolean;
}

export interface TierLimits {
  maxBots: number;
  maxPositions: number;
  maxDailyTrades: number;
  maxPortfolioValue: number;
  executionAlgorithms: string[];
  dataRefreshRate: number; // seconds
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
}

export interface UserSubscription {
  userId: string;
  tierId: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  autoRenew: boolean;
  paymentMethod?: string;
}

export interface FeatureAccess {
  feature: string;
  hasAccess: boolean;
  requiredTier: string;
  reason?: string;
}

// ============== PREMIUM FEATURE GATE ==============

export class PremiumFeatureGate extends EventEmitter {
  private tiers: Map<string, PremiumTier> = new Map();
  private subscriptions: Map<string, UserSubscription> = new Map();
  private featureRegistry: Map<string, { requiredTier: string; description: string }> = new Map();

  constructor() {
    super();
    this.initializeTiers();
    this.registerFeatures();
  }

  // ============== INITIALIZATION ==============

  private initializeTiers(): void {
    const tiers: PremiumTier[] = [
      // FREE TIER
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: [
          'Dashboard access',
          'Market data (delayed)',
          'Basic charts',
          '3 paper trading bots',
          'Manual trading only',
          'Community support',
        ],
        limits: {
          maxBots: 3,
          maxPositions: 5,
          maxDailyTrades: 10,
          maxPortfolioValue: 10000,
          executionAlgorithms: ['market'],
          dataRefreshRate: 60,
          supportLevel: 'community',
        },
        isActive: true,
      },

      // BASIC TIER - $19/month
      {
        id: 'basic',
        name: 'Basic',
        price: 19,
        features: [
          'Everything in Free',
          'Real-time market data',
          '10 trading bots',
          'Basic strategies',
          'Paper + Live trading',
          'Email support',
        ],
        limits: {
          maxBots: 10,
          maxPositions: 20,
          maxDailyTrades: 50,
          maxPortfolioValue: 50000,
          executionAlgorithms: ['market', 'limit'],
          dataRefreshRate: 5,
          supportLevel: 'email',
        },
        isActive: true,
      },

      // PRO TIER - $39/month
      {
        id: 'pro',
        name: 'Pro',
        price: 39,
        features: [
          'Everything in Basic',
          '50 trading bots',
          'Advanced strategies',
          'Backtesting engine',
          'Portfolio analytics',
          'Priority support',
        ],
        limits: {
          maxBots: 50,
          maxPositions: 50,
          maxDailyTrades: 200,
          maxPortfolioValue: 250000,
          executionAlgorithms: ['market', 'limit', 'stop', 'twap'],
          dataRefreshRate: 1,
          supportLevel: 'priority',
        },
        isActive: true,
      },

      // PREMIUM TIER - $59/month (ULTIMATE MONEY MACHINE)
      {
        id: 'premium',
        name: 'Premium',
        price: 59,
        features: [
          'Everything in Pro',
          'ULTIMATE MONEY MACHINE',
          'All 133+ trading bots',
          'Auto Role Manager',
          'Self-Learning AI',
          'Market Attack Strategies',
          'Institutional Edge',
          'Whale Tracking',
          'Advanced execution (VWAP, Iceberg)',
          'Dedicated support',
        ],
        limits: {
          maxBots: 999,
          maxPositions: 200,
          maxDailyTrades: 1000,
          maxPortfolioValue: 1000000,
          executionAlgorithms: ['market', 'limit', 'stop', 'stop_limit', 'twap', 'vwap', 'iceberg'],
          dataRefreshRate: 0.1, // 100ms
          supportLevel: 'dedicated',
        },
        isActive: true,
      },

      // ENTERPRISE TIER - $250/month
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 250,
        features: [
          'Everything in Premium',
          'Unlimited bots',
          'Unlimited positions',
          'API access',
          'Custom integrations',
          'White-label options',
          'SLA guarantee',
          'Dedicated account manager',
        ],
        limits: {
          maxBots: -1, // Unlimited
          maxPositions: -1,
          maxDailyTrades: -1,
          maxPortfolioValue: -1,
          executionAlgorithms: ['all'],
          dataRefreshRate: 0.01, // 10ms
          supportLevel: 'dedicated',
        },
        isActive: true,
      },
    ];

    tiers.forEach(tier => this.tiers.set(tier.id, tier));
    console.log(`[PremiumGate] Initialized ${this.tiers.size} subscription tiers`);
  }

  private registerFeatures(): void {
    // Premium-only features ($59+)
    const premiumFeatures = [
      { name: 'ultimate_money_machine', tier: 'premium', desc: 'Autonomous AI trading engine' },
      { name: 'auto_role_manager', tier: 'premium', desc: 'Automatic bot role assignment' },
      { name: 'self_learning_ai', tier: 'premium', desc: 'Self-improving knowledge base' },
      { name: 'market_attack_strategies', tier: 'premium', desc: 'Aggressive trading tactics' },
      { name: 'institutional_edge', tier: 'premium', desc: 'Hedge fund techniques' },
      { name: 'whale_tracking', tier: 'premium', desc: 'Real-time whale monitoring' },
      { name: 'vwap_execution', tier: 'premium', desc: 'Volume-weighted execution' },
      { name: 'iceberg_orders', tier: 'premium', desc: 'Hidden order execution' },
      { name: 'all_bots', tier: 'premium', desc: 'Access to all 133+ bots' },
    ];

    // Pro features ($39+)
    const proFeatures = [
      { name: 'backtesting', tier: 'pro', desc: 'Historical strategy testing' },
      { name: 'advanced_strategies', tier: 'pro', desc: 'Complex trading strategies' },
      { name: 'portfolio_analytics', tier: 'pro', desc: 'Portfolio risk analysis' },
      { name: 'twap_execution', tier: 'pro', desc: 'Time-weighted execution' },
    ];

    // Basic features ($19+)
    const basicFeatures = [
      { name: 'live_trading', tier: 'basic', desc: 'Real money trading' },
      { name: 'realtime_data', tier: 'basic', desc: 'Real-time market data' },
      { name: 'limit_orders', tier: 'basic', desc: 'Limit order execution' },
    ];

    [...premiumFeatures, ...proFeatures, ...basicFeatures].forEach(f => {
      this.featureRegistry.set(f.name, { requiredTier: f.tier, description: f.desc });
    });

    console.log(`[PremiumGate] Registered ${this.featureRegistry.size} gated features`);
  }

  // ============== ACCESS CONTROL ==============

  checkAccess(userId: string, feature: string): FeatureAccess {
    const subscription = this.subscriptions.get(userId);
    const featureConfig = this.featureRegistry.get(feature);

    // Feature not registered = free access
    if (!featureConfig) {
      return { feature, hasAccess: true, requiredTier: 'free' };
    }

    // No subscription = free tier
    if (!subscription || subscription.status !== 'active') {
      const hasAccess = featureConfig.requiredTier === 'free';
      return {
        feature,
        hasAccess,
        requiredTier: featureConfig.requiredTier,
        reason: hasAccess ? undefined : `Requires ${featureConfig.requiredTier} subscription`,
      };
    }

    // Check tier hierarchy
    const tierOrder = ['free', 'basic', 'pro', 'premium', 'enterprise'];
    const userTierIndex = tierOrder.indexOf(subscription.tierId);
    const requiredTierIndex = tierOrder.indexOf(featureConfig.requiredTier);

    const hasAccess = userTierIndex >= requiredTierIndex;

    return {
      feature,
      hasAccess,
      requiredTier: featureConfig.requiredTier,
      reason: hasAccess ? undefined : `Requires ${featureConfig.requiredTier} subscription (you have ${subscription.tierId})`,
    };
  }

  requireAccess(userId: string, feature: string): void {
    const access = this.checkAccess(userId, feature);
    if (!access.hasAccess) {
      throw new Error(`Access denied: ${access.reason}`);
    }
  }

  // ============== SUBSCRIPTION MANAGEMENT ==============

  createSubscription(userId: string, tierId: string): UserSubscription {
    const tier = this.tiers.get(tierId);
    if (!tier) {
      throw new Error(`Invalid tier: ${tierId}`);
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription: UserSubscription = {
      userId,
      tierId,
      startDate: now,
      endDate,
      status: 'active',
      autoRenew: true,
    };

    this.subscriptions.set(userId, subscription);
    this.emit('subscription_created', subscription);
    console.log(`[PremiumGate] Created ${tierId} subscription for user ${userId}`);

    return subscription;
  }

  cancelSubscription(userId: string): void {
    const subscription = this.subscriptions.get(userId);
    if (subscription) {
      subscription.status = 'cancelled';
      subscription.autoRenew = false;
      this.emit('subscription_cancelled', subscription);
    }
  }

  renewSubscription(userId: string): void {
    const subscription = this.subscriptions.get(userId);
    if (subscription && subscription.autoRenew) {
      const now = new Date();
      subscription.startDate = now;
      subscription.endDate = new Date(now.setMonth(now.getMonth() + 1));
      subscription.status = 'active';
      this.emit('subscription_renewed', subscription);
    }
  }

  upgradeSubscription(userId: string, newTierId: string): void {
    const currentSub = this.subscriptions.get(userId);
    const newTier = this.tiers.get(newTierId);

    if (!newTier) {
      throw new Error(`Invalid tier: ${newTierId}`);
    }

    if (currentSub) {
      currentSub.tierId = newTierId;
      this.emit('subscription_upgraded', { userId, from: currentSub.tierId, to: newTierId });
    } else {
      this.createSubscription(userId, newTierId);
    }
  }

  // ============== QUERIES ==============

  getTiers(): PremiumTier[] {
    return Array.from(this.tiers.values());
  }

  getTier(tierId: string): PremiumTier | undefined {
    return this.tiers.get(tierId);
  }

  getUserSubscription(userId: string): UserSubscription | undefined {
    return this.subscriptions.get(userId);
  }

  getUserTier(userId: string): PremiumTier | undefined {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'active') {
      return this.tiers.get('free');
    }
    return this.tiers.get(subscription.tierId);
  }

  getAccessibleFeatures(userId: string): string[] {
    const tier = this.getUserTier(userId);
    if (!tier) return [];

    const tierOrder = ['free', 'basic', 'pro', 'premium', 'enterprise'];
    const userTierIndex = tierOrder.indexOf(tier.id);

    const accessible: string[] = [];
    for (const [feature, config] of this.featureRegistry) {
      const requiredIndex = tierOrder.indexOf(config.requiredTier);
      if (userTierIndex >= requiredIndex) {
        accessible.push(feature);
      }
    }

    return accessible;
  }

  getStats(): {
    totalSubscribers: number;
    byTier: Record<string, number>;
    mrr: number; // Monthly Recurring Revenue
  } {
    const byTier: Record<string, number> = {};
    let mrr = 0;

    for (const [, sub] of this.subscriptions) {
      if (sub.status === 'active') {
        byTier[sub.tierId] = (byTier[sub.tierId] || 0) + 1;
        const tier = this.tiers.get(sub.tierId);
        if (tier) mrr += tier.price;
      }
    }

    return {
      totalSubscribers: this.subscriptions.size,
      byTier,
      mrr,
    };
  }

  // ============== TRIAL MANAGEMENT ==============

  startTrial(userId: string, tierId: string = 'premium', days: number = 7): UserSubscription {
    const tier = this.tiers.get(tierId);
    if (!tier) throw new Error(`Invalid tier: ${tierId}`);

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    const subscription: UserSubscription = {
      userId,
      tierId,
      startDate: now,
      endDate,
      status: 'trial',
      autoRenew: false,
    };

    this.subscriptions.set(userId, subscription);
    this.emit('trial_started', { userId, tierId, days });
    console.log(`[PremiumGate] Started ${days}-day ${tierId} trial for user ${userId}`);

    return subscription;
  }

  convertTrial(userId: string, paymentMethod: string): void {
    const subscription = this.subscriptions.get(userId);
    if (subscription && subscription.status === 'trial') {
      subscription.status = 'active';
      subscription.autoRenew = true;
      subscription.paymentMethod = paymentMethod;
      subscription.endDate = new Date();
      subscription.endDate.setMonth(subscription.endDate.getMonth() + 1);
      this.emit('trial_converted', subscription);
    }
  }
}

// Export singleton
let instance: PremiumFeatureGate | null = null;

export function getPremiumFeatureGate(): PremiumFeatureGate {
  if (!instance) {
    instance = new PremiumFeatureGate();
  }
  return instance;
}

export default PremiumFeatureGate;

/**
 * TIME — Revenue Generation Engine
 *
 * Fair, transparent monetization strategy that provides value
 * without overcharging users. Better than the competition because
 * we're honest about fees and provide more value per dollar.
 *
 * REVENUE STREAMS:
 * 1. Subscription Tiers - Based on features, not artificial limits
 * 2. Transaction Fees - Lower than industry standard
 * 3. Premium Bots - Revenue share with creators
 * 4. NFT Marketplace - Modest listing/sale fees
 * 5. API Access - For developers/institutions
 * 6. Educational Content - Premium courses
 * 7. Copy Trading - Small fee on profits only
 * 8. Referral Program - Rewards for growth
 * 9. Institutional Services - White-label, bulk pricing
 * 10. Data Analytics - Premium market insights
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('RevenueEngine');

// ============================================================
// SUBSCRIPTION TIERS
// ============================================================

// ALIGNED WITH GiftAccessService.ts - SINGLE SOURCE OF TRUTH
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'unlimited' | 'enterprise';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: {
    monthly: number;
    yearly: number; // 20% discount
  };
  features: string[];
  limits: {
    maxBots: number;
    maxWatchlists: number;
    maxAlerts: number;
    maxBacktests: number;
    apiCallsPerDay: number;
    paperTradingPositions: number;
    liveTradingPositions: number;
    connectedBrokers: number;
    storageGB: number;
  };
}

/**
 * SUBSCRIPTION PRICING - ALIGNED WITH GiftAccessService.ts
 *
 * OFFICIAL PRICING (December 2025):
 * - FREE: $0/mo
 * - STARTER: $24.99/mo ($239.88/year = $19.99/mo)
 * - PRO: $79/mo ($758.40/year = $63.20/mo)
 * - UNLIMITED: $149/mo ($1,430.40/year = $119.20/mo)
 * - ENTERPRISE: $499/mo ($4,790.40/year = $399.20/mo)
 */
const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    features: [
      'Paper trading',
      'Basic charts',
      'Community bots',
      '5 alerts',
      '3 bot limit',
    ],
    limits: {
      maxBots: 3,
      maxWatchlists: 1,
      maxAlerts: 5,
      maxBacktests: 5,
      apiCallsPerDay: 100,
      paperTradingPositions: 3,
      liveTradingPositions: 0,
      connectedBrokers: 0,
      storageGB: 0.5,
    },
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    price: { monthly: 24.99, yearly: 239.88 }, // $19.99/mo annual (20% off)
    features: [
      'Live trading',
      '1 AI-powered bot',
      '$10K capital limit',
      'Basic alerts',
      'Email support',
      '50 trades/month',
    ],
    limits: {
      maxBots: 1,
      maxWatchlists: 3,
      maxAlerts: 50,
      maxBacktests: 50,
      apiCallsPerDay: 1000,
      paperTradingPositions: 10,
      liveTradingPositions: 5,
      connectedBrokers: 1,
      storageGB: 2,
    },
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    price: { monthly: 79, yearly: 758.40 }, // $63.20/mo annual (20% off)
    features: [
      'Everything in Starter',
      '5 AI-powered bots',
      'Unlimited capital',
      'Tax-loss harvesting',
      'Advanced charts',
      'Priority support',
      '500 trades/month',
    ],
    limits: {
      maxBots: 5,
      maxWatchlists: 10,
      maxAlerts: 500,
      maxBacktests: 500,
      apiCallsPerDay: 10000,
      paperTradingPositions: 50,
      liveTradingPositions: 25,
      connectedBrokers: 3,
      storageGB: 10,
    },
  },
  unlimited: {
    tier: 'unlimited',
    name: 'Unlimited',
    price: { monthly: 149, yearly: 1430.40 }, // $119.20/mo annual (20% off)
    features: [
      'Everything in Pro',
      'Unlimited AI bots',
      'Unlimited capital',
      'Dynasty Trust planning',
      'Family Legacy AI',
      'AutoPilot system',
      'Dedicated support',
      'Unlimited trades',
    ],
    limits: {
      maxBots: 999,
      maxWatchlists: 999,
      maxAlerts: 9999,
      maxBacktests: 9999,
      apiCallsPerDay: 100000,
      paperTradingPositions: 999,
      liveTradingPositions: 100,
      connectedBrokers: 10,
      storageGB: 50,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 499, yearly: 4790.40 }, // $399.20/mo annual (20% off)
    features: [
      'Everything in Unlimited',
      'White-label solution',
      'Full API access',
      'Custom strategies',
      'Account manager',
      'SLA guarantee',
      'Custom integrations',
    ],
    limits: {
      maxBots: Infinity,
      maxWatchlists: Infinity,
      maxAlerts: Infinity,
      maxBacktests: Infinity,
      apiCallsPerDay: Infinity,
      paperTradingPositions: Infinity,
      liveTradingPositions: Infinity,
      connectedBrokers: Infinity,
      storageGB: 500,
    },
  },
};

// ============================================================
// TRANSACTION FEES
// ============================================================

export interface TransactionFees {
  // Trading fees (when routing through TIME)
  stockTrade: { percent: number; minFee: number; maxFee: number };
  optionsTrade: { perContract: number; baseFee: number };
  cryptoTrade: { percent: number; minFee: number };
  forexTrade: { spreadMarkup: number }; // pips added

  // NFT Marketplace fees
  nftListing: { flat: number };
  nftSale: { sellerPercent: number; buyerPercent: number };
  nftRoyalty: { maxPercent: number; platformCut: number }; // Of royalty

  // Copy trading fees
  copyTradingProfitShare: number; // % of profits only
  signalProviderCut: number; // How much signal provider gets

  // Withdrawal fees
  cryptoWithdrawal: { network: string; fee: number }[];
  fiatWithdrawal: { method: string; fee: number; percent: number }[];
}

/**
 * TRANSACTION FEES - MAXIMUM REVENUE (December 2025)
 * Strategy: Match or slightly beat industry - don't undercut significantly
 * Aligned with PlatformFeeService.ts - single source of truth
 */
const TRANSACTION_FEES: TransactionFees = {
  // Stock trading - Per-trade fee (whichever is greater)
  stockTrade: {
    percent: 0.5,      // 0.5% - matches industry average
    minFee: 1.99,      // $1.99 minimum - premium for premium service
    maxFee: 500,       // $500 cap
  },

  // Options - Match industry
  optionsTrade: {
    perContract: 0.65, // $0.65 - matches TD Ameritrade exactly
    baseFee: 0,
  },

  // Crypto - Match Coinbase Pro tier (not retail)
  cryptoTrade: {
    percent: 1.25,     // 1.25% - beats Coinbase retail (1.5-4.5%) but matches pro tier
    minFee: 1.00,      // $1 minimum
  },

  // Forex - Standard spread
  forexTrade: {
    spreadMarkup: 0.5, // 0.5 pips - standard for retail forex
  },

  // NFT Marketplace - Match OpenSea
  nftListing: {
    flat: 0,           // FREE listings - attracts sellers
  },
  nftSale: {
    sellerPercent: 2.5,  // 2.5% - matches OpenSea exactly
    buyerPercent: 0,      // No buyer fee - competitive advantage
  },
  nftRoyalty: {
    maxPercent: 10,       // Max royalty %
    platformCut: 15,      // 15% of royalties (increased from 10%)
  },

  // Copy trading - Premium pricing
  copyTradingProfitShare: 30, // 30% of PROFITS - industry is 20-50%, we're in the middle
  signalProviderCut: 60,      // Provider gets 60%, platform 40%

  // Withdrawals - Standard fees
  cryptoWithdrawal: [
    { network: 'ethereum', fee: 8.00 },   // ETH gas is expensive
    { network: 'polygon', fee: 0.25 },
    { network: 'solana', fee: 0.05 },
    { network: 'arbitrum', fee: 1.00 },
    { network: 'base', fee: 0.50 },
  ],
  fiatWithdrawal: [
    { method: 'ACH', fee: 0, percent: 0.15 },      // 0.15% on all ACH (covers costs)
    { method: 'Wire', fee: 45, percent: 0 },       // $45 (industry is $25-50)
    { method: 'Instant', fee: 0, percent: 2.0 },   // 2.0% - matches Cash App/Venmo
  ],
};

// ============================================================
// PREMIUM SERVICES
// ============================================================

export interface PremiumService {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'one-time' | 'monthly' | 'per-use';
  category: 'bot' | 'education' | 'analytics' | 'support';
}

const PREMIUM_SERVICES: PremiumService[] = [
  // Premium Bots (one-time purchase + revenue share)
  {
    id: 'bot_momentum_pro',
    name: 'Momentum Pro Bot',
    description: 'Advanced momentum strategy with ML-enhanced entries',
    price: 99.99,
    type: 'one-time',
    category: 'bot',
  },
  {
    id: 'bot_mean_reversion',
    name: 'Mean Reversion Master',
    description: 'Statistical arbitrage across multiple timeframes',
    price: 149.99,
    type: 'one-time',
    category: 'bot',
  },
  {
    id: 'bot_news_trader',
    name: 'News Sentiment Trader',
    description: 'AI-powered news analysis for fast execution',
    price: 199.99,
    type: 'one-time',
    category: 'bot',
  },

  // Educational Courses
  {
    id: 'course_options_101',
    name: 'Options Trading Masterclass',
    description: '20+ hours of video content with live examples',
    price: 49.99,
    type: 'one-time',
    category: 'education',
  },
  {
    id: 'course_algo_trading',
    name: 'Algorithmic Trading Fundamentals',
    description: 'Build your own trading bots from scratch',
    price: 79.99,
    type: 'one-time',
    category: 'education',
  },
  {
    id: 'course_risk_management',
    name: 'Professional Risk Management',
    description: 'Institutional-grade risk techniques',
    price: 39.99,
    type: 'one-time',
    category: 'education',
  },

  // Analytics Services
  {
    id: 'analytics_deep_dive',
    name: 'Portfolio Deep Dive',
    description: 'Professional analysis of your trading patterns',
    price: 29.99,
    type: 'per-use',
    category: 'analytics',
  },
  {
    id: 'analytics_bot_audit',
    name: 'Bot Performance Audit',
    description: 'Expert review of your bot strategies',
    price: 49.99,
    type: 'per-use',
    category: 'analytics',
  },

  // Premium Support
  {
    id: 'support_1on1',
    name: '1-on-1 Strategy Session',
    description: '30-minute call with trading expert',
    price: 99.99,
    type: 'per-use',
    category: 'support',
  },
];

// ============================================================
// REFERRAL PROGRAM
// ============================================================

export interface ReferralRewards {
  referrerReward: {
    type: 'cash' | 'credit' | 'subscription';
    amount: number;
    duration?: number; // months
  };
  refereeReward: {
    type: 'cash' | 'credit' | 'trial';
    amount: number;
    duration?: number;
  };
  tiers: {
    referrals: number;
    bonus: number;
    title: string;
  }[];
}

const REFERRAL_PROGRAM: ReferralRewards = {
  referrerReward: {
    type: 'credit',
    amount: 10, // $10 account credit per referral
  },
  refereeReward: {
    type: 'trial',
    amount: 30, // 30-day free trial of Trader tier
    duration: 30,
  },
  tiers: [
    { referrals: 5, bonus: 25, title: 'Ambassador' },
    { referrals: 15, bonus: 75, title: 'Champion' },
    { referrals: 50, bonus: 250, title: 'Legend' },
    { referrals: 100, bonus: 1000, title: 'Founding Partner' },
  ],
};

// ============================================================
// REVENUE ENGINE CLASS
// ============================================================

interface RevenueEvent {
  type: 'subscription' | 'transaction' | 'service' | 'referral' | 'nft_sale';
  userId: string;
  amount: number;
  currency: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

interface RevenueStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  byType: Record<string, number>;
  topProducts: { id: string; revenue: number }[];
}

export class RevenueEngine extends EventEmitter {
  private revenueEvents: RevenueEvent[] = [];
  private userSubscriptions: Map<string, SubscriptionTier> = new Map();

  constructor() {
    super();
    logger.info('Revenue Engine initialized');
  }

  // ============================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================

  /**
   * Get all subscription plans
   */
  public getSubscriptionPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Get a specific plan
   */
  public getPlan(tier: SubscriptionTier): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[tier];
  }

  /**
   * Subscribe a user to a plan
   */
  public async subscribeUser(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{ success: boolean; subscriptionId: string }> {
    const plan = SUBSCRIPTION_PLANS[tier];
    const amount = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;

    this.userSubscriptions.set(userId, tier);

    // Record revenue event
    this.recordRevenueEvent({
      type: 'subscription',
      userId,
      amount,
      currency: 'USD',
      metadata: { tier, billingCycle },
      timestamp: new Date(),
    });

    logger.info(`User ${userId} subscribed to ${tier} (${billingCycle})`);

    return {
      success: true,
      subscriptionId: `sub_${Date.now()}_${userId}`,
    };
  }

  /**
   * Get user's subscription tier
   */
  public getUserTier(userId: string): SubscriptionTier {
    return this.userSubscriptions.get(userId) || 'free';
  }

  /**
   * Check if user has access to a feature
   */
  public hasFeatureAccess(userId: string, feature: keyof SubscriptionPlan['limits']): boolean {
    const tier = this.getUserTier(userId);
    const plan = SUBSCRIPTION_PLANS[tier];
    const limit = plan.limits[feature];

    return limit > 0 || limit === Infinity;
  }

  /**
   * Get user's limit for a resource
   */
  public getLimit(userId: string, resource: keyof SubscriptionPlan['limits']): number {
    const tier = this.getUserTier(userId);
    return SUBSCRIPTION_PLANS[tier].limits[resource];
  }

  // ============================================================
  // TRANSACTION FEE CALCULATION
  // ============================================================

  /**
   * Get transaction fees structure
   */
  public getTransactionFees(): TransactionFees {
    return TRANSACTION_FEES;
  }

  /**
   * Calculate stock trade fee
   */
  public calculateStockTradeFee(tradeAmount: number): number {
    const { percent, minFee, maxFee } = TRANSACTION_FEES.stockTrade;
    const fee = tradeAmount * (percent / 100);
    return Math.min(Math.max(fee, minFee), maxFee);
  }

  /**
   * Calculate options trade fee
   */
  public calculateOptionsTradeFee(contracts: number): number {
    const { perContract, baseFee } = TRANSACTION_FEES.optionsTrade;
    return baseFee + (contracts * perContract);
  }

  /**
   * Calculate crypto trade fee
   */
  public calculateCryptoTradeFee(tradeAmount: number): number {
    const { percent, minFee } = TRANSACTION_FEES.cryptoTrade;
    const fee = tradeAmount * (percent / 100);
    return Math.max(fee, minFee);
  }

  /**
   * Calculate NFT sale fees
   */
  public calculateNFTSaleFees(salePrice: number, royaltyPercent: number = 0): {
    sellerFee: number;
    buyerFee: number;
    royaltyFee: number;
    platformRoyaltyCut: number;
    sellerReceives: number;
  } {
    const { sellerPercent, buyerPercent } = TRANSACTION_FEES.nftSale;
    const { platformCut } = TRANSACTION_FEES.nftRoyalty;

    const sellerFee = salePrice * (sellerPercent / 100);
    const buyerFee = salePrice * (buyerPercent / 100);
    const royaltyFee = salePrice * (royaltyPercent / 100);
    const platformRoyaltyCut = royaltyFee * (platformCut / 100);

    return {
      sellerFee,
      buyerFee,
      royaltyFee,
      platformRoyaltyCut,
      sellerReceives: salePrice - sellerFee - royaltyFee,
    };
  }

  /**
   * Calculate copy trading fee (only on profits)
   */
  public calculateCopyTradingFee(profit: number): {
    totalFee: number;
    providerCut: number;
    platformCut: number;
  } {
    if (profit <= 0) return { totalFee: 0, providerCut: 0, platformCut: 0 };

    const totalFee = profit * (TRANSACTION_FEES.copyTradingProfitShare / 100);
    const providerCut = totalFee * (TRANSACTION_FEES.signalProviderCut / 100);
    const platformCut = totalFee - providerCut;

    return { totalFee, providerCut, platformCut };
  }

  // ============================================================
  // PREMIUM SERVICES
  // ============================================================

  /**
   * Get all premium services
   */
  public getPremiumServices(): PremiumService[] {
    return PREMIUM_SERVICES;
  }

  /**
   * Get services by category
   */
  public getServicesByCategory(category: PremiumService['category']): PremiumService[] {
    return PREMIUM_SERVICES.filter(s => s.category === category);
  }

  /**
   * Purchase a premium service
   */
  public async purchaseService(
    userId: string,
    serviceId: string
  ): Promise<{ success: boolean; transactionId: string }> {
    const service = PREMIUM_SERVICES.find(s => s.id === serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    // Record revenue
    this.recordRevenueEvent({
      type: 'service',
      userId,
      amount: service.price,
      currency: 'USD',
      metadata: { serviceId, serviceName: service.name },
      timestamp: new Date(),
    });

    logger.info(`User ${userId} purchased ${service.name}`);

    return {
      success: true,
      transactionId: `txn_${Date.now()}_${serviceId}`,
    };
  }

  // ============================================================
  // REFERRAL PROGRAM
  // ============================================================

  /**
   * Get referral program details
   */
  public getReferralProgram(): ReferralRewards {
    return REFERRAL_PROGRAM;
  }

  /**
   * Process a successful referral
   */
  public async processReferral(
    referrerId: string,
    refereeId: string
  ): Promise<{
    referrerReward: number;
    refereeReward: string;
    bonusApplied: boolean;
  }> {
    const reward = REFERRAL_PROGRAM.referrerReward;

    // Record referral revenue (credit given is negative revenue technically)
    this.recordRevenueEvent({
      type: 'referral',
      userId: referrerId,
      amount: 0, // The real value comes from the referred user's LTV
      currency: 'USD',
      metadata: { refereeId, rewardType: reward.type, rewardAmount: reward.amount },
      timestamp: new Date(),
    });

    logger.info(`Referral processed: ${referrerId} referred ${refereeId}`);

    return {
      referrerReward: reward.amount,
      refereeReward: `${REFERRAL_PROGRAM.refereeReward.duration}-day free trial`,
      bonusApplied: false, // Check tier bonus in full implementation
    };
  }

  // ============================================================
  // REVENUE TRACKING
  // ============================================================

  /**
   * Record a revenue event
   */
  private recordRevenueEvent(event: RevenueEvent): void {
    this.revenueEvents.push(event);
    this.emit('revenue', event);
  }

  /**
   * Get revenue statistics
   */
  public getRevenueStats(): RevenueStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0, thisWeek = 0, thisMonth = 0, allTime = 0;
    const byType: Record<string, number> = {};
    const productRevenue: Record<string, number> = {};

    for (const event of this.revenueEvents) {
      allTime += event.amount;
      byType[event.type] = (byType[event.type] || 0) + event.amount;

      if (event.timestamp >= todayStart) today += event.amount;
      if (event.timestamp >= weekStart) thisWeek += event.amount;
      if (event.timestamp >= monthStart) thisMonth += event.amount;

      // Track product revenue
      const productId = event.metadata.serviceId || event.metadata.tier || 'other';
      productRevenue[productId] = (productRevenue[productId] || 0) + event.amount;
    }

    const topProducts = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, revenue]) => ({ id, revenue }));

    return { today, thisWeek, thisMonth, allTime, byType, topProducts };
  }

  /**
   * Get price comparison with competitors (for marketing)
   * Updated December 2025 - MAXIMIZED REVENUE pricing
   */
  public getPriceComparison(): {
    feature: string;
    timeFee: string;
    industryAvg: string;
    positioning: string;
  }[] {
    return [
      {
        feature: 'Stock Trading',
        timeFee: '$1.99 or 0.5%',
        industryAvg: '$0-0.5%',
        positioning: 'Premium service, transparent pricing',
      },
      {
        feature: 'Options (per contract)',
        timeFee: '$0.65',
        industryAvg: '$0.65',
        positioning: 'Matches TD Ameritrade',
      },
      {
        feature: 'Crypto Trading',
        timeFee: '1.25%',
        industryAvg: '1.5-4.5%',
        positioning: 'Beats Coinbase retail',
      },
      {
        feature: 'NFT Sales (seller)',
        timeFee: '2.5%',
        industryAvg: '2.5%',
        positioning: 'Matches OpenSea',
      },
      {
        feature: 'NFT Sales (buyer)',
        timeFee: '$0',
        industryAvg: '0-2.5%',
        positioning: 'Competitive advantage',
      },
      {
        feature: 'Copy Trading',
        timeFee: '30% of profits',
        industryAvg: '20-50%',
        positioning: 'Middle of range',
      },
      {
        feature: 'Performance Fee',
        timeFee: '22%',
        industryAvg: '20%',
        positioning: 'Slightly above standard',
      },
      {
        feature: 'AUM Fee',
        timeFee: '1.0%',
        industryAvg: '0.25-2%',
        positioning: 'Standard wealth management',
      },
      {
        feature: 'Bot Marketplace',
        timeFee: '30%',
        industryAvg: '30%',
        positioning: 'Matches app stores',
      },
      {
        feature: 'Pro Subscription',
        timeFee: '$79/mo',
        industryAvg: '$100-200/mo',
        positioning: 'Competitive, value-packed',
      },
    ];
  }
}

// Export singleton
export const revenueEngine = new RevenueEngine();

export default RevenueEngine;

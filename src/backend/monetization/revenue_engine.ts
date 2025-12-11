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

export type SubscriptionTier = 'free' | 'starter' | 'trader' | 'professional' | 'enterprise';

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

const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: 'Free Explorer',
    price: { monthly: 0, yearly: 0 },
    features: [
      'Basic market data (15min delayed)',
      '2 paper trading bots',
      '1 watchlist (10 symbols)',
      'Basic learning modules',
      'Community forum access',
      'Mobile app access',
    ],
    limits: {
      maxBots: 2,
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
    name: 'Starter Trader',
    price: { monthly: 9.99, yearly: 95.88 }, // $7.99/mo annually
    features: [
      'Real-time market data',
      '5 paper trading bots',
      '3 watchlists (25 symbols each)',
      '50 price alerts',
      'Basic bot analytics',
      'Email support',
      'All learning modules',
      '1 connected broker',
    ],
    limits: {
      maxBots: 5,
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
  trader: {
    tier: 'trader',
    name: 'Active Trader',
    price: { monthly: 29.99, yearly: 287.88 }, // $23.99/mo annually
    features: [
      'Everything in Starter',
      '15 bots (paper + live)',
      '10 watchlists (50 symbols each)',
      'Unlimited alerts',
      'Advanced bot analytics',
      'Regime detection insights',
      'Copy trading (follow 5 traders)',
      'Priority email support',
      '3 connected brokers',
      'API access (basic)',
    ],
    limits: {
      maxBots: 15,
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
  professional: {
    tier: 'professional',
    name: 'Professional',
    price: { monthly: 99.99, yearly: 959.88 }, // $79.99/mo annually
    features: [
      'Everything in Active Trader',
      'Unlimited bots',
      'Unlimited watchlists',
      'Custom bot creation tools',
      'AI-powered strategy synthesis',
      'Copy trading (unlimited follows)',
      'Become a signal provider',
      'Phone + chat support',
      '10 connected brokers',
      'Full API access',
      'Team collaboration (3 users)',
      'White-label reports',
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
    price: { monthly: 499.99, yearly: 4799.88 }, // Custom pricing available
    features: [
      'Everything in Professional',
      'Unlimited everything',
      'Dedicated account manager',
      'Custom integrations',
      'On-premise deployment option',
      'SLA guarantees (99.9% uptime)',
      'Custom bot development',
      'Bulk user management',
      'Advanced compliance tools',
      'Priority API endpoints',
      'Custom analytics dashboards',
      'Team collaboration (unlimited)',
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

const TRANSACTION_FEES: TransactionFees = {
  // Stock trading - LOWER than most platforms
  stockTrade: {
    percent: 0,        // Commission-free like the big players
    minFee: 0,
    maxFee: 0,
  },

  // Options - Competitive
  optionsTrade: {
    perContract: 0.50, // vs $0.65 industry avg
    baseFee: 0,
  },

  // Crypto - Very competitive
  cryptoTrade: {
    percent: 0.25,     // vs 0.5-1.5% industry avg
    minFee: 0.10,
  },

  // Forex - Minimal spread markup
  forexTrade: {
    spreadMarkup: 0.2, // Only 0.2 pips added
  },

  // NFT Marketplace - Fair to creators
  nftListing: {
    flat: 0,           // FREE listings!
  },
  nftSale: {
    sellerPercent: 2.0,  // vs 2.5% on major platforms
    buyerPercent: 0,      // No buyer fee!
  },
  nftRoyalty: {
    maxPercent: 10,       // Max royalty %
    platformCut: 10,      // We take 10% of royalties (0.1-1% of sale)
  },

  // Copy trading - ONLY on profits
  copyTradingProfitShare: 20, // 20% of PROFITS only (not losses)
  signalProviderCut: 70,      // Provider gets 70%, platform 30%

  // Withdrawals
  cryptoWithdrawal: [
    { network: 'ethereum', fee: 5.00 },
    { network: 'polygon', fee: 0.10 },
    { network: 'solana', fee: 0.01 },
    { network: 'arbitrum', fee: 0.50 },
    { network: 'base', fee: 0.25 },
  ],
  fiatWithdrawal: [
    { method: 'ACH', fee: 0, percent: 0 },          // FREE!
    { method: 'Wire', fee: 25, percent: 0 },
    { method: 'Instant', fee: 0, percent: 1.5 },   // Same day
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
   */
  public getPriceComparison(): {
    feature: string;
    timeFee: string;
    industryAvg: string;
    savings: string;
  }[] {
    return [
      {
        feature: 'Stock Trading',
        timeFee: '$0',
        industryAvg: '$0',
        savings: 'Same as best',
      },
      {
        feature: 'Options (per contract)',
        timeFee: '$0.50',
        industryAvg: '$0.65',
        savings: '23% less',
      },
      {
        feature: 'Crypto Trading',
        timeFee: '0.25%',
        industryAvg: '0.5-1.5%',
        savings: 'Up to 83% less',
      },
      {
        feature: 'NFT Sales (seller)',
        timeFee: '2.0%',
        industryAvg: '2.5%',
        savings: '20% less',
      },
      {
        feature: 'NFT Sales (buyer)',
        timeFee: '$0',
        industryAvg: '0-2.5%',
        savings: '100% less',
      },
      {
        feature: 'Copy Trading',
        timeFee: '20% of profits',
        industryAvg: '25-30% of profits',
        savings: '20-33% less',
      },
      {
        feature: 'Pro Subscription',
        timeFee: '$29.99/mo',
        industryAvg: '$50-100/mo',
        savings: '40-70% less',
      },
    ];
  }
}

// Export singleton
export const revenueEngine = new RevenueEngine();

export default RevenueEngine;

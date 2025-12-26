/**
 * TIME Marketing Service
 *
 * Complete marketing hub for referrals, affiliates, promo codes,
 * social sharing, and conversion tracking.
 *
 * Version 1.0.0 | December 2025
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('MarketingService');

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export interface ReferralCode {
  id: string;
  code: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: Date;
  usageCount: number;
  usageLimit?: number;
  isActive: boolean;

  // Share tracking
  shareUrl: string;
  shortUrl: string;
  qrCodeUrl: string;
  shareClicks: number;
  uniqueVisitors: number;

  // Referrals
  referrals: ReferralRecord[];

  // Rewards
  totalRewards: number;
  pendingRewards: number;
  paidRewards: number;
  rewardHistory: RewardPayment[];

  // Stats
  conversionRate: number;
  totalRevenue: number;
  tier: ReferralTier;
}

export interface ReferralRecord {
  id: string;
  referredUserId: string;
  referredEmail: string;
  referredName: string;
  signedUpAt: Date;
  source: 'direct' | 'social' | 'email' | 'qr' | 'api';
  platform?: string;
  ipAddress?: string;
  userAgent?: string;

  // Conversion tracking
  convertedToPaid: boolean;
  convertedAt?: Date;
  subscriptionTier?: string;
  subscriptionRevenue?: number;
  lifetimeValue: number;

  // Rewards
  rewardEarned: number;
  rewardPaid: boolean;
  rewardPaidAt?: Date;
}

export interface RewardPayment {
  id: string;
  amount: number;
  type: 'cash' | 'credit' | 'free_months' | 'discount';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method?: 'paypal' | 'stripe' | 'bank' | 'crypto' | 'credit';
  createdAt: Date;
  processedAt?: Date;
  transactionId?: string;
  notes?: string;
}

export interface ReferralTier {
  id: string;
  name: string;
  level: number;
  minReferrals: number;
  minConversions?: number;
  rewardPerReferral: number;
  rewardPerConversion: number;
  bonusPercent: number;
  perks: string[];
  color: string;
}

// ============================================================
// AFFILIATE SYSTEM
// ============================================================

export interface Affiliate {
  id: string;
  userId: string;
  userName: string;
  email: string;
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  tier: AffiliateTier;

  // Application
  appliedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  applicationNotes?: string;

  // Links
  affiliateCode: string;
  affiliateUrl: string;
  customSlug?: string;

  // Commission
  commissionRate: number;
  commissionType: 'percentage' | 'fixed' | 'hybrid';
  fixedCommission?: number;

  // Tracking
  clicks: number;
  uniqueClicks: number;
  signups: number;
  conversions: number;
  revenue: number;

  // Earnings
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  lifetimeEarnings: number;

  // Payouts
  payoutMethod: 'paypal' | 'stripe' | 'bank' | 'crypto';
  payoutDetails: Record<string, string>;
  payoutThreshold: number;
  nextPayoutDate?: Date;
  payoutHistory: AffiliatePayout[];

  // Performance
  conversionRate: number;
  earningsPerClick: number;
  averageOrderValue: number;

  // Tracking data
  referrals: AffiliateReferral[];

  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateTier {
  id: string;
  name: string;
  level: number;
  minRevenue: number;
  minConversions: number;
  commissionRate: number;
  bonuses: string[];
  perks: string[];
}

export interface AffiliateReferral {
  id: string;
  userId: string;
  email: string;
  source: string;
  landingPage: string;
  signedUpAt: Date;
  converted: boolean;
  convertedAt?: Date;
  subscriptionTier?: string;
  revenue: number;
  commission: number;
  commissionPaid: boolean;
}

export interface AffiliatePayout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: string;
  createdAt: Date;
  processedAt?: Date;
  transactionId?: string;
  notes?: string;
}

// ============================================================
// SOCIAL SHARING
// ============================================================

export interface SocialShare {
  id: string;
  userId: string;
  referralCode: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'email' | 'copy';
  sharedAt: Date;
  content: string;
  shortUrl: string;
  clicks: number;
  signups: number;
  conversions: number;
  ipAddress?: string;
}

export interface ShareableContent {
  id: string;
  type: 'referral' | 'promo' | 'milestone' | 'feature' | 'testimonial';
  title: string;
  description: string;
  image?: string;
  hashtags: string[];
  platformContent: {
    twitter: string;
    facebook: string;
    linkedin: string;
    whatsapp: string;
    email: {
      subject: string;
      body: string;
    };
  };
  cta: string;
  url: string;
}

export interface SocialProofWidget {
  id: string;
  type: 'recent_signups' | 'live_trades' | 'testimonials' | 'stats' | 'leaderboard';
  title: string;
  data: any[];
  style: 'popup' | 'banner' | 'sidebar' | 'inline';
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  delay: number;
  duration: number;
  frequency: number;
  enabled: boolean;
}

// ============================================================
// A/B TESTING
// ============================================================

export interface ABTest {
  id: string;
  name: string;
  description: string;
  type: 'landing_page' | 'email' | 'promo' | 'referral' | 'pricing';
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;

  variants: ABVariant[];
  winner?: string;
  winnerConfidence?: number;

  goal: 'signups' | 'conversions' | 'revenue' | 'clicks';
  minSampleSize: number;
  currentSampleSize: number;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage of traffic
  content: any;

  // Metrics
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;

  // Calculated
  conversionRate: number;
  revenuePerVisitor: number;
}

// ============================================================
// MARKETING SERVICE CLASS
// ============================================================

class MarketingService extends EventEmitter {
  // Storage (in-memory, would be MongoDB in production)
  private referralCodes: Map<string, ReferralCode> = new Map();
  private affiliates: Map<string, Affiliate> = new Map();
  private socialShares: Map<string, SocialShare> = new Map();
  private abTests: Map<string, ABTest> = new Map();
  private shareableContent: Map<string, ShareableContent> = new Map();
  private socialProofWidgets: Map<string, SocialProofWidget> = new Map();

  // Index by user
  private userReferralCodes: Map<string, string> = new Map(); // userId -> code
  private userAffiliates: Map<string, string> = new Map(); // userId -> affiliateId

  // Reward tiers
  private referralTiers: ReferralTier[] = [
    {
      id: 'bronze',
      name: 'Bronze',
      level: 1,
      minReferrals: 1,
      rewardPerReferral: 5,
      rewardPerConversion: 10,
      bonusPercent: 0,
      perks: ['Basic referral link', 'Email support'],
      color: '#CD7F32'
    },
    {
      id: 'silver',
      name: 'Silver',
      level: 2,
      minReferrals: 5,
      minConversions: 3,
      rewardPerReferral: 7,
      rewardPerConversion: 15,
      bonusPercent: 5,
      perks: ['Custom referral link', 'Priority support', 'Monthly bonus'],
      color: '#C0C0C0'
    },
    {
      id: 'gold',
      name: 'Gold',
      level: 3,
      minReferrals: 15,
      minConversions: 8,
      rewardPerReferral: 10,
      rewardPerConversion: 25,
      bonusPercent: 10,
      perks: ['VIP dashboard', 'Custom promo codes', 'Dedicated account manager'],
      color: '#FFD700'
    },
    {
      id: 'platinum',
      name: 'Platinum',
      level: 4,
      minReferrals: 50,
      minConversions: 25,
      rewardPerReferral: 15,
      rewardPerConversion: 50,
      bonusPercent: 15,
      perks: ['Revenue share', 'API access', 'White-label options', 'Co-marketing'],
      color: '#E5E4E2'
    },
    {
      id: 'diamond',
      name: 'Diamond',
      level: 5,
      minReferrals: 100,
      minConversions: 50,
      rewardPerReferral: 25,
      rewardPerConversion: 100,
      bonusPercent: 20,
      perks: ['Lifetime commission', 'Equity options', 'Board advisory', 'Unlimited everything'],
      color: '#B9F2FF'
    }
  ];

  // Affiliate tiers
  private affiliateTiers: AffiliateTier[] = [
    {
      id: 'starter',
      name: 'Starter',
      level: 1,
      minRevenue: 0,
      minConversions: 0,
      commissionRate: 20,
      bonuses: [],
      perks: ['Basic tracking', 'Monthly payouts']
    },
    {
      id: 'pro',
      name: 'Pro',
      level: 2,
      minRevenue: 1000,
      minConversions: 10,
      commissionRate: 25,
      bonuses: ['$50 signup bonus'],
      perks: ['Advanced analytics', 'Bi-weekly payouts', 'Custom landing pages']
    },
    {
      id: 'elite',
      name: 'Elite',
      level: 3,
      minRevenue: 5000,
      minConversions: 50,
      commissionRate: 30,
      bonuses: ['$200 quarterly bonus', '5% recurring'],
      perks: ['Dedicated manager', 'Weekly payouts', 'API access']
    },
    {
      id: 'partner',
      name: 'Partner',
      level: 4,
      minRevenue: 25000,
      minConversions: 200,
      commissionRate: 40,
      bonuses: ['$1000 annual bonus', '10% recurring', 'Revenue share'],
      perks: ['White-label', 'Custom integration', 'Priority everything']
    }
  ];

  constructor() {
    super();
    this.initializeDefaultContent();
    logger.info('Marketing Service initialized');
  }

  // ============================================================
  // REFERRAL SYSTEM
  // ============================================================

  /**
   * Generate a unique referral code for a user
   */
  generateReferralCode(params: {
    userId: string;
    userName: string;
    userEmail: string;
    customCode?: string;
  }): ReferralCode {
    const { userId, userName, userEmail, customCode } = params;

    // Check if user already has a code
    const existingCode = this.userReferralCodes.get(userId);
    if (existingCode) {
      const existing = this.referralCodes.get(existingCode);
      if (existing) return existing;
    }

    // Generate unique code
    let code = customCode || this.generateUniqueCode(userName);
    let attempts = 0;
    while (this.referralCodes.has(code) && attempts < 10) {
      code = this.generateUniqueCode(userName);
      attempts++;
    }

    const baseUrl = 'https://time-trading.app';
    const referralCode: ReferralCode = {
      id: uuidv4(),
      code,
      userId,
      userName,
      userEmail,
      createdAt: new Date(),
      usageCount: 0,
      isActive: true,

      // URLs
      shareUrl: `${baseUrl}/join?ref=${code}`,
      shortUrl: `${baseUrl}/r/${code}`,
      qrCodeUrl: `${baseUrl}/api/qr/${code}`,
      shareClicks: 0,
      uniqueVisitors: 0,

      // Referrals
      referrals: [],

      // Rewards
      totalRewards: 0,
      pendingRewards: 0,
      paidRewards: 0,
      rewardHistory: [],

      // Stats
      conversionRate: 0,
      totalRevenue: 0,
      tier: this.referralTiers[0],
    };

    this.referralCodes.set(code, referralCode);
    this.userReferralCodes.set(userId, code);

    this.emit('referral:created', referralCode);
    logger.info(`Referral code created: ${code} for user ${userId}`);

    return referralCode;
  }

  /**
   * Get user's referral code and stats
   */
  getUserReferralStats(userId: string): ReferralCode | null {
    const code = this.userReferralCodes.get(userId);
    if (!code) return null;
    return this.referralCodes.get(code) || null;
  }

  /**
   * Track a referral click
   */
  trackReferralClick(code: string, data: {
    source?: string;
    platform?: string;
    ipAddress?: string;
    userAgent?: string;
  }): boolean {
    const referralCode = this.referralCodes.get(code);
    if (!referralCode || !referralCode.isActive) return false;

    referralCode.shareClicks++;
    referralCode.uniqueVisitors++; // In production, track unique IPs

    this.emit('referral:click', { code, data });
    return true;
  }

  /**
   * Record a new referral signup
   */
  recordReferral(code: string, referred: {
    userId: string;
    email: string;
    name: string;
    source?: 'direct' | 'social' | 'email' | 'qr' | 'api';
    platform?: string;
    ipAddress?: string;
    userAgent?: string;
  }): ReferralRecord | null {
    const referralCode = this.referralCodes.get(code);
    if (!referralCode || !referralCode.isActive) return null;

    // Check usage limit
    if (referralCode.usageLimit && referralCode.usageCount >= referralCode.usageLimit) {
      return null;
    }

    const referral: ReferralRecord = {
      id: uuidv4(),
      referredUserId: referred.userId,
      referredEmail: referred.email,
      referredName: referred.name,
      signedUpAt: new Date(),
      source: referred.source || 'direct',
      platform: referred.platform,
      ipAddress: referred.ipAddress,
      userAgent: referred.userAgent,
      convertedToPaid: false,
      lifetimeValue: 0,
      rewardEarned: referralCode.tier.rewardPerReferral,
      rewardPaid: false,
    };

    referralCode.referrals.push(referral);
    referralCode.usageCount++;
    referralCode.pendingRewards += referral.rewardEarned;
    referralCode.totalRewards += referral.rewardEarned;

    // Update tier
    this.updateReferralTier(referralCode);

    this.emit('referral:signup', { code, referral });
    logger.info(`Referral recorded: ${referred.email} via ${code}`);

    return referral;
  }

  /**
   * Mark a referral as converted (paid subscription)
   */
  convertReferral(code: string, referredUserId: string, subscription: {
    tier: string;
    revenue: number;
  }): boolean {
    const referralCode = this.referralCodes.get(code);
    if (!referralCode) return false;

    const referral = referralCode.referrals.find(r => r.referredUserId === referredUserId);
    if (!referral || referral.convertedToPaid) return false;

    referral.convertedToPaid = true;
    referral.convertedAt = new Date();
    referral.subscriptionTier = subscription.tier;
    referral.subscriptionRevenue = subscription.revenue;
    referral.lifetimeValue = subscription.revenue;

    // Add conversion bonus
    const conversionBonus = referralCode.tier.rewardPerConversion;
    referral.rewardEarned += conversionBonus;
    referralCode.pendingRewards += conversionBonus;
    referralCode.totalRewards += conversionBonus;
    referralCode.totalRevenue += subscription.revenue;

    // Update conversion rate
    const conversions = referralCode.referrals.filter(r => r.convertedToPaid).length;
    referralCode.conversionRate = (conversions / referralCode.referrals.length) * 100;

    // Update tier
    this.updateReferralTier(referralCode);

    this.emit('referral:converted', { code, referral, subscription });
    logger.info(`Referral converted: ${referredUserId} via ${code}`);

    return true;
  }

  /**
   * Process reward payout for a referrer
   */
  processRewardPayout(userId: string, amount: number, method: RewardPayment['method']): RewardPayment | null {
    const code = this.userReferralCodes.get(userId);
    if (!code) return null;

    const referralCode = this.referralCodes.get(code);
    if (!referralCode || referralCode.pendingRewards < amount) return null;

    const payout: RewardPayment = {
      id: uuidv4(),
      amount,
      type: method === 'credit' ? 'credit' : 'cash',
      status: 'pending',
      method,
      createdAt: new Date(),
    };

    referralCode.rewardHistory.push(payout);
    referralCode.pendingRewards -= amount;

    // In production, process actual payout here
    setTimeout(() => {
      payout.status = 'completed';
      payout.processedAt = new Date();
      payout.transactionId = `txn_${Date.now()}`;
      referralCode.paidRewards += amount;
      this.emit('referral:payout', { code, payout });
    }, 1000);

    return payout;
  }

  /**
   * Get referral leaderboard
   */
  getReferralLeaderboard(limit: number = 10): Array<{
    rank: number;
    code: string;
    userName: string;
    totalReferrals: number;
    conversions: number;
    totalEarnings: number;
    tier: ReferralTier;
  }> {
    const codes = Array.from(this.referralCodes.values())
      .filter(r => r.isActive && r.referrals.length > 0)
      .sort((a, b) => b.referrals.length - a.referrals.length)
      .slice(0, limit);

    return codes.map((r, index) => ({
      rank: index + 1,
      code: r.code,
      userName: r.userName,
      totalReferrals: r.referrals.length,
      conversions: r.referrals.filter(ref => ref.convertedToPaid).length,
      totalEarnings: r.totalRewards,
      tier: r.tier,
    }));
  }

  /**
   * Get all referral tiers
   */
  getReferralTiers(): ReferralTier[] {
    return [...this.referralTiers];
  }

  // ============================================================
  // AFFILIATE SYSTEM
  // ============================================================

  /**
   * Apply to become an affiliate
   */
  applyForAffiliate(params: {
    userId: string;
    userName: string;
    email: string;
    website?: string;
    socialMedia?: string[];
    audience?: string;
    experience?: string;
    payoutMethod: Affiliate['payoutMethod'];
    payoutDetails: Record<string, string>;
  }): Affiliate {
    const { userId, userName, email, payoutMethod, payoutDetails } = params;

    // Check if already an affiliate
    const existingId = this.userAffiliates.get(userId);
    if (existingId) {
      const existing = this.affiliates.get(existingId);
      if (existing) return existing;
    }

    const affiliateCode = `AFF${this.generateUniqueCode(userName).toUpperCase()}`;

    const affiliate: Affiliate = {
      id: uuidv4(),
      userId,
      userName,
      email,
      status: 'pending',
      tier: this.affiliateTiers[0],

      appliedAt: new Date(),
      applicationNotes: params.experience,

      affiliateCode,
      affiliateUrl: `https://time-trading.app/a/${affiliateCode}`,

      commissionRate: this.affiliateTiers[0].commissionRate,
      commissionType: 'percentage',

      clicks: 0,
      uniqueClicks: 0,
      signups: 0,
      conversions: 0,
      revenue: 0,

      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      lifetimeEarnings: 0,

      payoutMethod,
      payoutDetails,
      payoutThreshold: 50,
      payoutHistory: [],

      conversionRate: 0,
      earningsPerClick: 0,
      averageOrderValue: 0,

      referrals: [],

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.affiliates.set(affiliate.id, affiliate);
    this.userAffiliates.set(userId, affiliate.id);

    this.emit('affiliate:applied', affiliate);
    logger.info(`Affiliate application: ${email}`);

    return affiliate;
  }

  /**
   * Approve an affiliate application
   */
  approveAffiliate(affiliateId: string, approvedBy: string): Affiliate | null {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate || affiliate.status !== 'pending') return null;

    affiliate.status = 'active';
    affiliate.approvedAt = new Date();
    affiliate.approvedBy = approvedBy;
    affiliate.updatedAt = new Date();

    this.emit('affiliate:approved', affiliate);
    logger.info(`Affiliate approved: ${affiliate.email}`);

    return affiliate;
  }

  /**
   * Track affiliate click
   */
  trackAffiliateClick(affiliateCode: string, data: {
    landingPage?: string;
    source?: string;
    ipAddress?: string;
  }): boolean {
    const affiliate = Array.from(this.affiliates.values())
      .find(a => a.affiliateCode === affiliateCode);

    if (!affiliate || affiliate.status !== 'active') return false;

    affiliate.clicks++;
    affiliate.uniqueClicks++; // Track unique IPs in production
    affiliate.updatedAt = new Date();

    this.emit('affiliate:click', { affiliateCode, data });
    return true;
  }

  /**
   * Record affiliate referral
   */
  recordAffiliateReferral(affiliateCode: string, referral: {
    userId: string;
    email: string;
    source?: string;
    landingPage?: string;
  }): AffiliateReferral | null {
    const affiliate = Array.from(this.affiliates.values())
      .find(a => a.affiliateCode === affiliateCode);

    if (!affiliate || affiliate.status !== 'active') return null;

    const affReferral: AffiliateReferral = {
      id: uuidv4(),
      userId: referral.userId,
      email: referral.email,
      source: referral.source || 'direct',
      landingPage: referral.landingPage || '/',
      signedUpAt: new Date(),
      converted: false,
      revenue: 0,
      commission: 0,
      commissionPaid: false,
    };

    affiliate.referrals.push(affReferral);
    affiliate.signups++;
    affiliate.updatedAt = new Date();

    this.emit('affiliate:referral', { affiliateCode, referral: affReferral });
    return affReferral;
  }

  /**
   * Record affiliate conversion
   */
  recordAffiliateConversion(affiliateCode: string, userId: string, transaction: {
    tier: string;
    revenue: number;
  }): boolean {
    const affiliate = Array.from(this.affiliates.values())
      .find(a => a.affiliateCode === affiliateCode);

    if (!affiliate) return false;

    const referral = affiliate.referrals.find(r => r.userId === userId);
    if (!referral || referral.converted) return false;

    referral.converted = true;
    referral.convertedAt = new Date();
    referral.subscriptionTier = transaction.tier;
    referral.revenue = transaction.revenue;

    // Calculate commission
    const commission = (transaction.revenue * affiliate.commissionRate) / 100;
    referral.commission = commission;

    affiliate.conversions++;
    affiliate.revenue += transaction.revenue;
    affiliate.pendingEarnings += commission;
    affiliate.totalEarnings += commission;
    affiliate.lifetimeEarnings += commission;

    // Update metrics
    affiliate.conversionRate = (affiliate.conversions / affiliate.signups) * 100;
    affiliate.earningsPerClick = affiliate.totalEarnings / affiliate.clicks;
    affiliate.averageOrderValue = affiliate.revenue / affiliate.conversions;

    // Update tier
    this.updateAffiliateTier(affiliate);

    affiliate.updatedAt = new Date();

    this.emit('affiliate:conversion', { affiliateCode, referral, transaction });
    return true;
  }

  /**
   * Get affiliate dashboard data
   */
  getAffiliateDashboard(userId: string): {
    affiliate: Affiliate | null;
    tiers: AffiliateTier[];
    recentReferrals: AffiliateReferral[];
    recentPayouts: AffiliatePayout[];
    stats: {
      today: { clicks: number; signups: number; conversions: number; earnings: number };
      week: { clicks: number; signups: number; conversions: number; earnings: number };
      month: { clicks: number; signups: number; conversions: number; earnings: number };
      all: { clicks: number; signups: number; conversions: number; earnings: number };
    };
  } {
    const affiliateId = this.userAffiliates.get(userId);
    const affiliate = affiliateId ? this.affiliates.get(affiliateId) : null;

    if (!affiliate) {
      return {
        affiliate: null,
        tiers: this.affiliateTiers,
        recentReferrals: [],
        recentPayouts: [],
        stats: {
          today: { clicks: 0, signups: 0, conversions: 0, earnings: 0 },
          week: { clicks: 0, signups: 0, conversions: 0, earnings: 0 },
          month: { clicks: 0, signups: 0, conversions: 0, earnings: 0 },
          all: { clicks: 0, signups: 0, conversions: 0, earnings: 0 },
        },
      };
    }

    return {
      affiliate,
      tiers: this.affiliateTiers,
      recentReferrals: affiliate.referrals.slice(-10).reverse(),
      recentPayouts: affiliate.payoutHistory.slice(-10).reverse(),
      stats: {
        today: { clicks: 0, signups: 0, conversions: 0, earnings: 0 }, // Calculate from referrals
        week: { clicks: 0, signups: 0, conversions: 0, earnings: 0 },
        month: { clicks: 0, signups: 0, conversions: 0, earnings: 0 },
        all: {
          clicks: affiliate.clicks,
          signups: affiliate.signups,
          conversions: affiliate.conversions,
          earnings: affiliate.totalEarnings,
        },
      },
    };
  }

  /**
   * Process affiliate payout
   */
  processAffiliatePayout(affiliateId: string, amount?: number): AffiliatePayout | null {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate || affiliate.status !== 'active') return null;

    const payoutAmount = amount || affiliate.pendingEarnings;
    if (payoutAmount < affiliate.payoutThreshold) return null;
    if (payoutAmount > affiliate.pendingEarnings) return null;

    const payout: AffiliatePayout = {
      id: uuidv4(),
      amount: payoutAmount,
      status: 'pending',
      method: affiliate.payoutMethod,
      createdAt: new Date(),
    };

    affiliate.payoutHistory.push(payout);
    affiliate.pendingEarnings -= payoutAmount;
    affiliate.updatedAt = new Date();

    // Process payout (simulated)
    setTimeout(() => {
      payout.status = 'completed';
      payout.processedAt = new Date();
      payout.transactionId = `payout_${Date.now()}`;
      affiliate.paidEarnings += payoutAmount;
      this.emit('affiliate:payout', { affiliateId, payout });
    }, 1000);

    return payout;
  }

  // ============================================================
  // SOCIAL SHARING
  // ============================================================

  /**
   * Generate shareable content for a user
   */
  generateShareableContent(userId: string, type: ShareableContent['type'] = 'referral'): ShareableContent {
    const referralStats = this.getUserReferralStats(userId);
    const code = referralStats?.code || 'TIMETRADING';
    const url = referralStats?.shortUrl || 'https://time-trading.app';

    const templates = this.getShareTemplates(type, code, url);

    const content: ShareableContent = {
      id: uuidv4(),
      type,
      title: templates.title,
      description: templates.description,
      hashtags: ['TIMETrading', 'Trading', 'FinTech', 'Crypto', 'Investing'],
      platformContent: templates.platformContent,
      cta: 'Start trading now!',
      url,
    };

    return content;
  }

  /**
   * Record a social share action
   */
  recordSocialShare(params: {
    userId: string;
    referralCode: string;
    platform: SocialShare['platform'];
    content: string;
    ipAddress?: string;
  }): SocialShare {
    const share: SocialShare = {
      id: uuidv4(),
      userId: params.userId,
      referralCode: params.referralCode,
      platform: params.platform,
      sharedAt: new Date(),
      content: params.content,
      shortUrl: `https://time-trading.app/r/${params.referralCode}`,
      clicks: 0,
      signups: 0,
      conversions: 0,
      ipAddress: params.ipAddress,
    };

    this.socialShares.set(share.id, share);
    this.emit('social:shared', share);

    return share;
  }

  /**
   * Track social share click
   */
  trackSocialShareClick(shareId: string): boolean {
    const share = this.socialShares.get(shareId);
    if (!share) return false;

    share.clicks++;
    this.emit('social:click', share);
    return true;
  }

  /**
   * Get social proof widgets configuration
   */
  getSocialProofWidgets(): SocialProofWidget[] {
    return Array.from(this.socialProofWidgets.values()).filter(w => w.enabled);
  }

  /**
   * Get social proof data (recent signups, live trades, etc.)
   */
  getSocialProofData(type: SocialProofWidget['type']): any[] {
    switch (type) {
      case 'recent_signups':
        return [
          { name: 'John D.', location: 'New York', time: '2 minutes ago' },
          { name: 'Sarah M.', location: 'London', time: '5 minutes ago' },
          { name: 'Mike T.', location: 'Sydney', time: '8 minutes ago' },
          { name: 'Lisa K.', location: 'Toronto', time: '12 minutes ago' },
          { name: 'David W.', location: 'Singapore', time: '15 minutes ago' },
        ];
      case 'live_trades':
        return [
          { asset: 'BTC/USD', profit: '+$234.56', user: 'Trader_X', time: 'now' },
          { asset: 'ETH/USD', profit: '+$89.12', user: 'CryptoKing', time: '1m ago' },
          { asset: 'AAPL', profit: '+$156.78', user: 'StockMaster', time: '2m ago' },
        ];
      case 'stats':
        return [
          { label: 'Active Traders', value: '10,234' },
          { label: 'Total Trades', value: '1.2M' },
          { label: 'Profit Generated', value: '$45.6M' },
        ];
      default:
        return [];
    }
  }

  // ============================================================
  // A/B TESTING
  // ============================================================

  /**
   * Create a new A/B test
   */
  createABTest(params: {
    name: string;
    description: string;
    type: ABTest['type'];
    variants: Array<{ name: string; description: string; weight: number; content: any }>;
    goal: ABTest['goal'];
    minSampleSize: number;
    createdBy: string;
  }): ABTest {
    const test: ABTest = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      type: params.type,
      status: 'draft',
      startDate: new Date(),

      variants: params.variants.map(v => ({
        id: uuidv4(),
        name: v.name,
        description: v.description,
        weight: v.weight,
        content: v.content,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        conversionRate: 0,
        revenuePerVisitor: 0,
      })),

      goal: params.goal,
      minSampleSize: params.minSampleSize,
      currentSampleSize: 0,

      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.abTests.set(test.id, test);
    this.emit('abtest:created', test);

    return test;
  }

  /**
   * Start an A/B test
   */
  startABTest(testId: string): ABTest | null {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'draft') return null;

    test.status = 'running';
    test.startDate = new Date();
    test.updatedAt = new Date();

    this.emit('abtest:started', test);
    return test;
  }

  /**
   * Get variant for a visitor (consistent assignment)
   */
  getABTestVariant(testId: string, visitorId: string): ABVariant | null {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') return null;

    // Consistent assignment based on visitor ID
    const hash = this.hashString(visitorId + testId);
    let cumulative = 0;

    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (hash < cumulative) {
        variant.impressions++;
        test.currentSampleSize++;
        return variant;
      }
    }

    return test.variants[0];
  }

  /**
   * Record A/B test conversion
   */
  recordABTestConversion(testId: string, variantId: string, revenue?: number): boolean {
    const test = this.abTests.get(testId);
    if (!test) return false;

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) return false;

    variant.conversions++;
    if (revenue) variant.revenue += revenue;

    // Update rates
    variant.conversionRate = (variant.conversions / variant.impressions) * 100;
    variant.revenuePerVisitor = variant.revenue / variant.impressions;

    // Check if test should end
    if (test.currentSampleSize >= test.minSampleSize) {
      this.evaluateABTest(testId);
    }

    test.updatedAt = new Date();
    return true;
  }

  /**
   * Evaluate A/B test and determine winner
   */
  evaluateABTest(testId: string): ABTest | null {
    const test = this.abTests.get(testId);
    if (!test) return null;

    // Simple winner determination (highest conversion rate)
    const sorted = [...test.variants].sort((a, b) => b.conversionRate - a.conversionRate);
    const winner = sorted[0];
    const runnerUp = sorted[1];

    // Calculate confidence (simplified)
    const confidence = this.calculateConfidence(winner, runnerUp);

    if (confidence >= 95) {
      test.status = 'completed';
      test.endDate = new Date();
      test.winner = winner.id;
      test.winnerConfidence = confidence;

      this.emit('abtest:completed', test);
    }

    return test;
  }

  // ============================================================
  // ANALYTICS & REPORTING
  // ============================================================

  /**
   * Get comprehensive marketing analytics
   */
  getMarketingAnalytics(): {
    referrals: {
      totalCodes: number;
      activeCodes: number;
      totalReferrals: number;
      totalConversions: number;
      conversionRate: number;
      totalRewards: number;
      pendingRewards: number;
      topReferrers: any[];
    };
    affiliates: {
      totalAffiliates: number;
      activeAffiliates: number;
      pendingApplications: number;
      totalRevenue: number;
      totalCommissions: number;
      pendingPayouts: number;
      topAffiliates: any[];
    };
    social: {
      totalShares: number;
      totalClicks: number;
      platformBreakdown: Record<string, number>;
      topContent: any[];
    };
    abTests: {
      running: number;
      completed: number;
      averageLift: number;
    };
  } {
    const codes = Array.from(this.referralCodes.values());
    const affiliates = Array.from(this.affiliates.values());
    const shares = Array.from(this.socialShares.values());
    const tests = Array.from(this.abTests.values());

    return {
      referrals: {
        totalCodes: codes.length,
        activeCodes: codes.filter(c => c.isActive).length,
        totalReferrals: codes.reduce((sum, c) => sum + c.referrals.length, 0),
        totalConversions: codes.reduce((sum, c) => sum + c.referrals.filter(r => r.convertedToPaid).length, 0),
        conversionRate: 0, // Calculate
        totalRewards: codes.reduce((sum, c) => sum + c.totalRewards, 0),
        pendingRewards: codes.reduce((sum, c) => sum + c.pendingRewards, 0),
        topReferrers: this.getReferralLeaderboard(5),
      },
      affiliates: {
        totalAffiliates: affiliates.length,
        activeAffiliates: affiliates.filter(a => a.status === 'active').length,
        pendingApplications: affiliates.filter(a => a.status === 'pending').length,
        totalRevenue: affiliates.reduce((sum, a) => sum + a.revenue, 0),
        totalCommissions: affiliates.reduce((sum, a) => sum + a.totalEarnings, 0),
        pendingPayouts: affiliates.reduce((sum, a) => sum + a.pendingEarnings, 0),
        topAffiliates: affiliates
          .filter(a => a.status === 'active')
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(a => ({
            name: a.userName,
            revenue: a.revenue,
            conversions: a.conversions,
            tier: a.tier.name,
          })),
      },
      social: {
        totalShares: shares.length,
        totalClicks: shares.reduce((sum, s) => sum + s.clicks, 0),
        platformBreakdown: shares.reduce((acc, s) => {
          acc[s.platform] = (acc[s.platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        topContent: [],
      },
      abTests: {
        running: tests.filter(t => t.status === 'running').length,
        completed: tests.filter(t => t.status === 'completed').length,
        averageLift: 0,
      },
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private generateUniqueCode(name: string): string {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanName}${random}`;
  }

  private updateReferralTier(referralCode: ReferralCode): void {
    const referrals = referralCode.referrals.length;
    const conversions = referralCode.referrals.filter(r => r.convertedToPaid).length;

    for (const tier of [...this.referralTiers].reverse()) {
      if (referrals >= tier.minReferrals &&
          (!tier.minConversions || conversions >= tier.minConversions)) {
        if (tier.level > referralCode.tier.level) {
          referralCode.tier = tier;
          this.emit('referral:tierUp', { code: referralCode.code, tier });
        }
        break;
      }
    }
  }

  private updateAffiliateTier(affiliate: Affiliate): void {
    for (const tier of [...this.affiliateTiers].reverse()) {
      if (affiliate.revenue >= tier.minRevenue && affiliate.conversions >= tier.minConversions) {
        if (tier.level > affiliate.tier.level) {
          affiliate.tier = tier;
          affiliate.commissionRate = tier.commissionRate;
          this.emit('affiliate:tierUp', { affiliateId: affiliate.id, tier });
        }
        break;
      }
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 100);
  }

  private calculateConfidence(winner: ABVariant, runnerUp: ABVariant): number {
    // Simplified confidence calculation
    if (!runnerUp || runnerUp.impressions === 0) return 100;

    const diff = winner.conversionRate - runnerUp.conversionRate;
    const sampleSize = Math.min(winner.impressions, runnerUp.impressions);

    // Very simplified - real implementation would use proper statistical tests
    const baseConfidence = Math.min(sampleSize / 100, 1) * 50;
    const liftConfidence = Math.min(diff * 10, 50);

    return Math.min(baseConfidence + liftConfidence, 99);
  }

  private getShareTemplates(type: string, code: string, url: string) {
    const templates = {
      referral: {
        title: 'Join TIME Trading Platform',
        description: 'I\'ve been using TIME for automated trading and the results are amazing! Use my referral code for exclusive benefits.',
        platformContent: {
          twitter: `I've been making great returns with @TIMETrading! Join using my link and get started with AI-powered trading. ${url} #TIMETrading #Crypto #Trading`,
          facebook: `Check out TIME Trading Platform - the best AI-powered trading platform I've used! Join using my referral link and we both get rewards: ${url}`,
          linkedin: `Excited to share my experience with TIME Trading Platform. Their AI trading bots have been incredibly effective. If you're looking to automate your trading, check them out: ${url}`,
          whatsapp: `Hey! I've been using TIME Trading for my investments and it's been great. Check it out: ${url}`,
          email: {
            subject: 'Check out TIME Trading Platform - Amazing AI Trading',
            body: `Hi,\n\nI wanted to share something exciting with you. I've been using TIME Trading Platform for automated trading, and the results have been fantastic.\n\nTheir AI-powered bots handle everything from crypto to stocks, and I've seen consistent returns.\n\nJoin using my referral link and we both get rewards: ${url}\n\nLet me know if you have any questions!\n\nBest regards`,
          },
        },
      },
      promo: {
        title: 'Special Offer on TIME Trading',
        description: 'Get an exclusive discount on TIME Trading Platform!',
        platformContent: {
          twitter: `Special offer! Get started with TIME Trading and save big. Use code ${code} ${url}`,
          facebook: `Exclusive deal on TIME Trading Platform! Use my code ${code} for a special discount: ${url}`,
          linkedin: `Professional traders: TIME Trading Platform is offering a special promotion. Check it out: ${url}`,
          whatsapp: `Hey! TIME Trading has a special offer right now. Use code ${code}: ${url}`,
          email: {
            subject: 'Exclusive TIME Trading Discount',
            body: `Hi,\n\nI have an exclusive discount code for TIME Trading Platform: ${code}\n\nCheck it out: ${url}\n\nBest regards`,
          },
        },
      },
      milestone: {
        title: 'Trading Milestone Achieved!',
        description: 'Just hit a major milestone on TIME Trading Platform!',
        platformContent: {
          twitter: `Just hit a new milestone on @TIMETrading! The AI bots are crushing it. Join me: ${url}`,
          facebook: `Celebrating a trading milestone with TIME Trading! Their platform makes it so easy. ${url}`,
          linkedin: `Proud to share my trading milestone achieved using TIME Trading Platform's AI technology. ${url}`,
          whatsapp: `Just reached a big milestone in my trading! Check out what I'm using: ${url}`,
          email: {
            subject: 'My Trading Success with TIME',
            body: `Hi,\n\nJust wanted to share that I hit a major trading milestone using TIME Trading Platform.\n\nCheck it out: ${url}\n\nBest regards`,
          },
        },
      },
    };

    return templates[type as keyof typeof templates] || templates.referral;
  }

  private initializeDefaultContent(): void {
    // Initialize social proof widgets
    const widgets: SocialProofWidget[] = [
      {
        id: 'recent_signups',
        type: 'recent_signups',
        title: 'Recent Signups',
        data: [],
        style: 'popup',
        position: 'bottom-left',
        delay: 5000,
        duration: 5000,
        frequency: 30000,
        enabled: true,
      },
      {
        id: 'live_trades',
        type: 'live_trades',
        title: 'Live Trades',
        data: [],
        style: 'sidebar',
        position: 'bottom-right',
        delay: 0,
        duration: 0,
        frequency: 5000,
        enabled: true,
      },
    ];

    widgets.forEach(w => this.socialProofWidgets.set(w.id, w));
  }
}

// Export singleton instance
export const marketingService = new MarketingService();
export default MarketingService;

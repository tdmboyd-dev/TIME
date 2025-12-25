/**
 * Marketing System Database Schemas
 *
 * Complete marketing, referral, and promo code tracking schemas
 */

// ============================================================
// REFERRAL SYSTEM SCHEMAS
// ============================================================

export interface ReferralCodeSchema {
  _id: string;
  code: string;
  userId: string;
  createdAt: Date;

  // Usage tracking
  usageCount: number;
  usageLimit?: number;
  isActive: boolean;

  // Referrals
  referrals: Array<{
    referredUserId: string;
    referredEmail: string;
    referredName: string;
    signedUpAt: Date;
    convertedToPaid: boolean;
    convertedAt?: Date;
    subscriptionTier?: string;
    rewardPaid: boolean;
    rewardAmount?: number;
    rewardPaidAt?: Date;
  }>;

  // Rewards earned
  totalRewards: number;
  pendingRewards: number;
  paidRewards: number;

  // Performance
  conversionRate: number;
  totalRevenue: number;
}

// ============================================================
// PROMO CODE SCHEMAS
// ============================================================

export interface PromoCodeSchema {
  _id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_trial' | 'free_months';

  // Discount details
  discountPercent?: number;
  discountAmount?: number;
  freeTrialDays?: number;
  freeMonths?: number;

  // Restrictions
  minPurchaseAmount?: number;
  applicablePlans: string[];
  firstTimeOnly: boolean;

  // Validity
  isActive: boolean;
  startDate: Date;
  expiryDate?: Date;

  // Usage limits
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;

  // Redemptions
  redemptions: Array<{
    userId: string;
    userEmail: string;
    redeemedAt: Date;
    discountApplied: number;
    subscriptionId?: string;
    originalAmount: number;
    finalAmount: number;
  }>;

  // Statistics
  totalRevenue: number;
  totalDiscount: number;
  averageOrderValue: number;
  conversionRate: number;

  // Created by
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// CAMPAIGN SCHEMAS
// ============================================================

export interface MarketingCampaignSchema {
  _id: string;
  name: string;
  description: string;
  type: 'email' | 'social' | 'referral' | 'promo' | 'content' | 'ads' | 'multi-channel';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';

  // Timeline
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;

  // Budget
  budget?: number;
  spent: number;

  // Goals
  goals: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
    signups?: number;
    engagement?: number;
  };

  // Actual metrics
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    signups: number;
    engagement: number;
    reach: number;
    shares: number;
  };

  // Channel breakdown
  channels: Array<{
    channel: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spent: number;
  }>;

  // Content
  posts: string[];
  promoCodes: string[];
  landingPages: string[];

  // A/B Testing
  abTests?: Array<{
    testId: string;
    name: string;
    startedAt: Date;
    completedAt?: Date;
    variants: Array<{
      id: string;
      name: string;
      impressions: number;
      clicks: number;
      conversions: number;
      revenue: number;
    }>;
    winner?: string;
    winnerConfidence?: number;
  }>;

  // ROI
  roi: number;
  cpc: number;
  cpa: number;
  ctr: number;
  conversionRate: number;

  // Tags
  tags: string[];
}

// ============================================================
// EMAIL CAMPAIGN SCHEMAS
// ============================================================

export interface EmailCampaignSchema {
  _id: string;
  campaignId?: string;
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  textContent: string;

  // Sending
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduledFor?: Date;
  sentAt?: Date;

  // Recipients
  recipientSegment: string;
  recipientCount: number;
  recipients: Array<{
    userId: string;
    email: string;
    sent: boolean;
    sentAt?: Date;
    opened: boolean;
    openedAt?: Date;
    clicked: boolean;
    clickedAt?: Date;
    converted: boolean;
    convertedAt?: Date;
    bounced: boolean;
    unsubscribed: boolean;
  }>;

  // Metrics
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    bounced: number;
    unsubscribed: number;
    spam: number;
  };

  // Performance
  openRate: number;
  clickRate: number;
  conversionRate: number;
  bounceRate: number;
  unsubscribeRate: number;

  // A/B Test
  isABTest: boolean;
  abTestVariant?: string;
  abTestGroup?: string;

  // Created by
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// SOCIAL MEDIA POST SCHEMAS
// ============================================================

export interface SocialMediaPostSchema {
  _id: string;
  campaignId?: string;

  // Content
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  mentions: string[];

  // Platform
  platforms: Array<{
    platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'reddit' | 'discord' | 'telegram';
    postId?: string;
    postUrl?: string;
    posted: boolean;
    postedAt?: Date;
    error?: string;
  }>;

  // Scheduling
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  scheduledFor?: Date;
  postedAt?: Date;

  // Metrics (aggregated across platforms)
  metrics: {
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    saves: number;
  };

  // Performance
  engagementRate: number;
  clickThroughRate: number;

  // Created by
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastMetricsUpdate?: Date;
}

// ============================================================
// REFERRAL REWARD TIERS
// ============================================================

export interface ReferralRewardTierSchema {
  _id: string;
  name: string;
  description: string;

  // Requirements
  minReferrals: number;
  minConversions?: number;

  // Rewards
  rewardType: 'cash' | 'credit' | 'free_months' | 'discount' | 'custom';
  rewardAmount?: number;
  rewardMonths?: number;
  rewardPercent?: number;
  customReward?: string;

  // Status
  isActive: boolean;
  order: number;

  // Created
  createdAt: Date;
  updatedAt: Date;
}

// Marketing indexes
export const marketingIndexes = {
  referralCodes: [
    { userId: 1, createdAt: -1 },
    { code: 1, unique: true },
    { isActive: 1 },
    { 'referrals.referredUserId': 1 },
  ],
  promoCodes: [
    { code: 1, unique: true },
    { isActive: 1, expiryDate: 1 },
    { createdBy: 1, createdAt: -1 },
    { type: 1 },
  ],
  marketingCampaigns: [
    { status: 1, startDate: -1 },
    { createdBy: 1, createdAt: -1 },
    { type: 1 },
    { tags: 1 },
  ],
  emailCampaigns: [
    { campaignId: 1 },
    { status: 1, scheduledFor: 1 },
    { createdBy: 1, createdAt: -1 },
  ],
  socialMediaPosts: [
    { campaignId: 1 },
    { status: 1, scheduledFor: 1 },
    { createdBy: 1, createdAt: -1 },
  ],
  referralRewardTiers: [
    { isActive: 1, order: 1 },
  ],
};

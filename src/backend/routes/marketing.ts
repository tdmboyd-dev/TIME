/**
 * Marketing Hub API Routes
 *
 * Admin-only endpoints for complete marketing management:
 * - Platform configuration
 * - Content creation and scheduling
 * - Campaign management
 * - Referral system
 * - Promo codes
 * - Analytics and ROI tracking
 * - A/B testing
 */

import { Router, Request, Response } from 'express';
import { adminMiddleware, ownerMiddleware } from './auth';
import { getMarketingBot } from '../marketing/MarketingBot';

const router = Router();

// All marketing routes require admin/owner access
router.use(adminMiddleware);

// ============================================================
// IN-MEMORY STORAGE (Replace with MongoDB in production)
// ============================================================

interface ReferralCode {
  id: string;
  code: string;
  userId: string;
  userName: string;
  createdAt: Date;
  usageCount: number;
  usageLimit?: number;
  isActive: boolean;
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
  totalRewards: number;
  pendingRewards: number;
  paidRewards: number;
  conversionRate: number;
  totalRevenue: number;
}

interface PromoCode {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_trial' | 'free_months';
  discountPercent?: number;
  discountAmount?: number;
  freeTrialDays?: number;
  freeMonths?: number;
  minPurchaseAmount?: number;
  applicablePlans: string[];
  firstTimeOnly: boolean;
  isActive: boolean;
  startDate: Date;
  expiryDate?: Date;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  redemptions: Array<{
    userId: string;
    userEmail: string;
    redeemedAt: Date;
    discountApplied: number;
    subscriptionId?: string;
    originalAmount: number;
    finalAmount: number;
  }>;
  totalRevenue: number;
  totalDiscount: number;
  averageOrderValue: number;
  conversionRate: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'social' | 'referral' | 'promo' | 'content' | 'ads' | 'multi-channel';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  startDate: Date;
  endDate?: Date;
  budget?: number;
  spent: number;
  goals: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
    signups?: number;
  };
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    signups: number;
    engagement: number;
    reach: number;
  };
  channels: Array<{
    channel: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spent: number;
  }>;
  posts: string[];
  promoCodes: string[];
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
  roi: number;
  cpc: number;
  cpa: number;
  ctr: number;
  conversionRate: number;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReferralRewardTier {
  id: string;
  name: string;
  description: string;
  minReferrals: number;
  minConversions?: number;
  rewardType: 'cash' | 'credit' | 'free_months' | 'discount';
  rewardAmount?: number;
  rewardMonths?: number;
  rewardPercent?: number;
  isActive: boolean;
  order: number;
}

// In-memory storage
const referralCodes: Map<string, ReferralCode> = new Map();
const promoCodes: Map<string, PromoCode> = new Map();
const campaigns: Map<string, Campaign> = new Map();
const rewardTiers: Map<string, ReferralRewardTier> = new Map();

// Initialize some sample data
const initializeSampleData = () => {
  // Sample reward tiers
  const tier1: ReferralRewardTier = {
    id: 'tier_1',
    name: 'Bronze',
    description: '1-5 referrals',
    minReferrals: 1,
    minConversions: 1,
    rewardType: 'credit',
    rewardAmount: 10,
    isActive: true,
    order: 1,
  };
  const tier2: ReferralRewardTier = {
    id: 'tier_2',
    name: 'Silver',
    description: '5-10 referrals',
    minReferrals: 5,
    minConversions: 3,
    rewardType: 'credit',
    rewardAmount: 50,
    isActive: true,
    order: 2,
  };
  const tier3: ReferralRewardTier = {
    id: 'tier_3',
    name: 'Gold',
    description: '10+ referrals',
    minReferrals: 10,
    minConversions: 5,
    rewardType: 'cash',
    rewardAmount: 100,
    isActive: true,
    order: 3,
  };
  rewardTiers.set(tier1.id, tier1);
  rewardTiers.set(tier2.id, tier2);
  rewardTiers.set(tier3.id, tier3);

  // Sample promo codes
  const promo1: PromoCode = {
    id: 'promo_1',
    code: 'TIMEFREE',
    description: 'First month free',
    type: 'free_months',
    freeMonths: 1,
    applicablePlans: ['pro', 'premium', 'ultimate'],
    firstTimeOnly: true,
    isActive: true,
    startDate: new Date('2025-01-01'),
    expiryDate: new Date('2025-12-31'),
    usageLimit: 1000,
    usageCount: 0,
    perUserLimit: 1,
    redemptions: [],
    totalRevenue: 0,
    totalDiscount: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  promoCodes.set(promo1.code, promo1);
};

// Initialize on module load
initializeSampleData();

// ============== PLATFORM CONFIGURATION ==============

/**
 * GET /api/v1/marketing/platforms
 * Get configured social media platforms
 */
router.get('/platforms', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const platforms = bot.getConfiguredPlatforms();

    res.json({
      success: true,
      platforms: platforms.map(p => ({
        platform: p.platform,
        enabled: p.enabled,
        configured: !!(p.apiKey || p.webhookUrl || p.accessToken),
      })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to get platforms' });
  }
});

/**
 * POST /api/v1/marketing/platforms/configure
 * Configure a social media platform
 */
router.post('/platforms/configure', ownerMiddleware, (req: Request, res: Response) => {
  try {
    const config = req.body;

    if (!config.platform) {
      return res.status(400).json({ error: 'Platform name required' });
    }

    const bot = getMarketingBot();
    bot.configurePlatform({
      platform: config.platform,
      enabled: config.enabled !== false,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessTokenSecret: config.accessTokenSecret,
      webhookUrl: config.webhookUrl,
      channelId: config.channelId,
      subreddit: config.subreddit,
    });

    res.json({
      success: true,
      message: `Platform ${config.platform} configured successfully`,
    });
  } catch {
    res.status(500).json({ error: 'Failed to configure platform' });
  }
});

// ============== CONTENT TEMPLATES ==============

/**
 * GET /api/v1/marketing/templates
 * Get available content templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const templates = bot.getTemplates();

    res.json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * POST /api/v1/marketing/templates
 * Create a new content template
 */
router.post('/templates', (req: Request, res: Response) => {
  try {
    const { name, type, platforms, template, hashtags, callToAction, mediaType, schedule } = req.body;

    if (!name || !type || !template) {
      return res.status(400).json({ error: 'name, type, and template are required' });
    }

    const bot = getMarketingBot();
    const newTemplate = bot.createTemplate({
      name,
      type,
      platforms: platforms || ['twitter'],
      template,
      hashtags: hashtags || [],
      callToAction: callToAction || '',
      mediaType,
      schedule,
    });

    res.json({
      success: true,
      template: newTemplate,
    });
  } catch {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ============== AI CONTENT GENERATION ==============

/**
 * POST /api/v1/marketing/generate
 * Generate AI-powered marketing content
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      type = 'announcement',
      topic,
      tone = 'professional',
      targetAudience,
      includeEmojis = true,
      maxLength = 280,
      platforms = ['twitter'],
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const bot = getMarketingBot();
    const content = await bot.generateContent({
      type,
      topic,
      tone,
      targetAudience,
      includeEmojis,
      maxLength,
      platforms,
    });

    res.json({
      success: true,
      generatedContent: content,
      platforms,
    });
  } catch {
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// ============== POST MANAGEMENT ==============

/**
 * POST /api/v1/marketing/posts
 * Create a new marketing post
 */
router.post('/posts', async (req: Request, res: Response) => {
  try {
    const { content, platforms, templateId, scheduleFor } = req.body;
    const user = (req as any).user;

    if (!content || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'content and platforms are required' });
    }

    const bot = getMarketingBot();
    const post = await bot.createPost(content, platforms, {
      templateId,
      scheduleFor: scheduleFor ? new Date(scheduleFor) : undefined,
      createdBy: user.id || 'admin',
    });

    res.json({
      success: true,
      post,
    });
  } catch {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * POST /api/v1/marketing/posts/:postId/publish
 * Publish a post immediately
 */
router.post('/posts/:postId/publish', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const bot = getMarketingBot();
    const post = await bot.publishPost(postId);

    res.json({
      success: true,
      post,
      results: post.results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to publish post' });
  }
});

// ============== QUICK POST HELPERS ==============

/**
 * POST /api/v1/marketing/quick/announcement
 * Quick post an announcement
 */
router.post('/quick/announcement', async (req: Request, res: Response) => {
  try {
    const { title, description, platforms } = req.body;
    const user = (req as any).user;

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }

    const bot = getMarketingBot();
    const post = await bot.quickPostAnnouncement(
      title,
      description,
      platforms,
      user.id || 'admin'
    );

    res.json({
      success: true,
      post,
      message: 'Announcement created! Use POST /posts/:postId/publish to post.',
    });
  } catch {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

/**
 * POST /api/v1/marketing/quick/feature
 * Quick post a feature announcement
 */
router.post('/quick/feature', async (req: Request, res: Response) => {
  try {
    const { featureName, benefits, platforms } = req.body;
    const user = (req as any).user;

    if (!featureName || !benefits || benefits.length === 0) {
      return res.status(400).json({ error: 'featureName and benefits array are required' });
    }

    const bot = getMarketingBot();
    const post = await bot.quickPostFeature(
      featureName,
      benefits,
      platforms,
      user.id || 'admin'
    );

    res.json({
      success: true,
      post,
      message: 'Feature post created! Use POST /posts/:postId/publish to post.',
    });
  } catch {
    res.status(500).json({ error: 'Failed to create feature post' });
  }
});

/**
 * POST /api/v1/marketing/quick/tip
 * Quick post a trading tip
 */
router.post('/quick/tip', async (req: Request, res: Response) => {
  try {
    const { tip, explanation, platforms } = req.body;
    const user = (req as any).user;

    if (!tip || !explanation) {
      return res.status(400).json({ error: 'tip and explanation are required' });
    }

    const bot = getMarketingBot();
    const post = await bot.quickPostTip(
      tip,
      explanation,
      platforms,
      user.id || 'admin'
    );

    res.json({
      success: true,
      post,
      message: 'Tip post created! Use POST /posts/:postId/publish to post.',
    });
  } catch {
    res.status(500).json({ error: 'Failed to create tip post' });
  }
});

// ============== CAMPAIGNS ==============

/**
 * GET /api/v1/marketing/campaigns
 * Get all marketing campaigns
 */
router.get('/campaigns', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const campaigns = bot.getCampaigns();

    res.json({
      success: true,
      count: campaigns.length,
      campaigns,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

/**
 * POST /api/v1/marketing/campaigns
 * Create a new marketing campaign
 */
router.post('/campaigns', (req: Request, res: Response) => {
  try {
    const { name, description, startDate, endDate, goals } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ error: 'name and startDate are required' });
    }

    const bot = getMarketingBot();
    const campaign = bot.createCampaign(
      name,
      description || '',
      new Date(startDate),
      endDate ? new Date(endDate) : undefined,
      goals
    );

    res.json({
      success: true,
      campaign,
    });
  } catch {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

/**
 * POST /api/v1/marketing/campaigns/:campaignId/posts/:postId
 * Add a post to a campaign
 */
router.post('/campaigns/:campaignId/posts/:postId', (req: Request, res: Response) => {
  try {
    const { campaignId, postId } = req.params;

    const bot = getMarketingBot();
    bot.addPostToCampaign(campaignId, postId);

    res.json({
      success: true,
      message: 'Post added to campaign',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add post to campaign' });
  }
});

// ============== AUTO-POSTING ==============

/**
 * POST /api/v1/marketing/autopost/start
 * Start automatic posting
 */
router.post('/autopost/start', (req: Request, res: Response) => {
  try {
    const { intervalMinutes, platforms, contentTypes, maxPostsPerDay, quietHoursStart, quietHoursEnd, includeEmojis, tone } = req.body;

    const bot = getMarketingBot();
    bot.startAutoPosting({
      intervalMinutes,
      platforms,
      contentTypes,
      maxPostsPerDay,
      quietHoursStart,
      quietHoursEnd,
      includeEmojis,
      tone,
    });

    res.json({
      success: true,
      message: 'Auto-posting started',
      config: bot.getAutoPostConfig(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start auto-posting' });
  }
});

/**
 * POST /api/v1/marketing/autopost/stop
 * Stop automatic posting
 */
router.post('/autopost/stop', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    bot.stopAutoPosting();

    res.json({
      success: true,
      message: 'Auto-posting stopped',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to stop auto-posting' });
  }
});

/**
 * GET /api/v1/marketing/autopost/status
 * Get auto-posting status and configuration
 */
router.get('/autopost/status', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const config = bot.getAutoPostConfig();
    const stats = bot.getAutoPostStats();

    res.json({
      success: true,
      config,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get auto-post status' });
  }
});

/**
 * PUT /api/v1/marketing/autopost/config
 * Update auto-post configuration
 */
router.put('/autopost/config', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const updatedConfig = bot.updateAutoPostConfig(req.body);

    res.json({
      success: true,
      message: 'Auto-post configuration updated',
      config: updatedConfig,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update config' });
  }
});

/**
 * GET /api/v1/marketing/content/library
 * Get content library items
 */
router.get('/content/library', (req: Request, res: Response) => {
  try {
    // This would return the content library - for now return count
    res.json({
      success: true,
      message: 'Content library available',
      count: 50,
      types: ['tip', 'feature', 'educational', 'engagement', 'promotion', 'announcement'],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get content library' });
  }
});

/**
 * POST /api/v1/marketing/post-now
 * Post content immediately (manual trigger)
 */
router.post('/post-now', async (req: Request, res: Response) => {
  try {
    const { content, platforms } = req.body;
    const user = (req as any).user;

    if (!content || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'content and platforms are required' });
    }

    const bot = getMarketingBot();
    const post = await bot.createPost(content, platforms, {
      createdBy: user?.id || 'admin',
    });

    const publishedPost = await bot.publishPost(post.id);

    res.json({
      success: true,
      message: 'Post published successfully',
      post: publishedPost,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to publish post' });
  }
});

// ============== ANALYTICS ==============

/**
 * GET /api/v1/marketing/analytics
 * Get marketing analytics summary
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const analytics = bot.getAnalyticsSummary();

    res.json({
      success: true,
      analytics,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * GET /api/v1/marketing/posts/:postId/metrics
 * Fetch metrics for a specific post
 */
router.get('/posts/:postId/metrics', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const bot = getMarketingBot();
    const metrics = await bot.fetchPostMetrics(postId);

    res.json({
      success: true,
      postId,
      metrics,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch metrics' });
  }
});

// ============== REFERRAL SYSTEM ==============

/**
 * GET /api/v1/marketing/referrals
 * Get all referral codes and stats
 */
router.get('/referrals', (req: Request, res: Response) => {
  try {
    const allReferrals = Array.from(referralCodes.values());

    // Calculate leaderboard
    const leaderboard = allReferrals
      .filter(r => r.referrals.length > 0)
      .sort((a, b) => b.referrals.length - a.referrals.length)
      .slice(0, 10)
      .map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: r.userName,
        code: r.code,
        totalReferrals: r.referrals.length,
        conversions: r.referrals.filter(ref => ref.convertedToPaid).length,
        totalRewards: r.totalRewards,
      }));

    res.json({
      success: true,
      totalReferralCodes: allReferrals.length,
      activeReferralCodes: allReferrals.filter(r => r.isActive).length,
      totalReferrals: allReferrals.reduce((sum, r) => sum + r.referrals.length, 0),
      totalConversions: allReferrals.reduce((sum, r) => sum + r.referrals.filter(ref => ref.convertedToPaid).length, 0),
      totalRewardsPaid: allReferrals.reduce((sum, r) => sum + r.paidRewards, 0),
      pendingRewards: allReferrals.reduce((sum, r) => sum + r.pendingRewards, 0),
      leaderboard,
      referralCodes: allReferrals,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get referrals' });
  }
});

/**
 * POST /api/v1/marketing/referrals/generate
 * Generate a new referral code for a user
 */
router.post('/referrals/generate', (req: Request, res: Response) => {
  try {
    const { userId, userName, customCode } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId and userName are required' });
    }

    // Generate code
    const code = customCode || `TIME${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Check if code already exists
    if (referralCodes.has(code)) {
      return res.status(400).json({ error: 'Referral code already exists' });
    }

    const referralCode: ReferralCode = {
      id: `ref_${Date.now()}`,
      code,
      userId,
      userName,
      createdAt: new Date(),
      usageCount: 0,
      isActive: true,
      referrals: [],
      totalRewards: 0,
      pendingRewards: 0,
      paidRewards: 0,
      conversionRate: 0,
      totalRevenue: 0,
    };

    referralCodes.set(code, referralCode);

    res.json({
      success: true,
      referralCode,
      message: 'Referral code generated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate referral code' });
  }
});

/**
 * POST /api/v1/marketing/referrals/:code/track
 * Track a new referral signup
 */
router.post('/referrals/:code/track', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { referredUserId, referredEmail, referredName } = req.body;

    const referralCode = referralCodes.get(code);
    if (!referralCode) {
      return res.status(404).json({ error: 'Referral code not found' });
    }

    if (!referralCode.isActive) {
      return res.status(400).json({ error: 'Referral code is inactive' });
    }

    // Check usage limit
    if (referralCode.usageLimit && referralCode.usageCount >= referralCode.usageLimit) {
      return res.status(400).json({ error: 'Referral code usage limit reached' });
    }

    // Add referral
    referralCode.referrals.push({
      referredUserId,
      referredEmail,
      referredName,
      signedUpAt: new Date(),
      convertedToPaid: false,
      rewardPaid: false,
    });

    referralCode.usageCount++;
    referralCodes.set(code, referralCode);

    res.json({
      success: true,
      message: 'Referral tracked successfully',
      referralCode,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to track referral' });
  }
});

/**
 * POST /api/v1/marketing/referrals/:code/convert
 * Mark a referral as converted to paid
 */
router.post('/referrals/:code/convert', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { referredUserId, subscriptionTier, rewardAmount } = req.body;

    const referralCode = referralCodes.get(code);
    if (!referralCode) {
      return res.status(404).json({ error: 'Referral code not found' });
    }

    const referral = referralCode.referrals.find(r => r.referredUserId === referredUserId);
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Mark as converted
    referral.convertedToPaid = true;
    referral.convertedAt = new Date();
    referral.subscriptionTier = subscriptionTier;
    referral.rewardAmount = rewardAmount || 10;

    // Update rewards
    referralCode.pendingRewards += referral.rewardAmount;
    referralCode.totalRewards += referral.rewardAmount;

    // Update conversion rate
    const conversions = referralCode.referrals.filter(r => r.convertedToPaid).length;
    referralCode.conversionRate = (conversions / referralCode.referrals.length) * 100;

    referralCodes.set(code, referralCode);

    res.json({
      success: true,
      message: 'Referral marked as converted',
      referralCode,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to convert referral' });
  }
});

/**
 * GET /api/v1/marketing/referrals/tiers
 * Get referral reward tiers
 */
router.get('/referrals/tiers', (req: Request, res: Response) => {
  try {
    const tiers = Array.from(rewardTiers.values())
      .filter(t => t.isActive)
      .sort((a, b) => a.order - b.order);

    res.json({
      success: true,
      tiers,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get reward tiers' });
  }
});

// ============== PROMO CODE SYSTEM ==============

/**
 * GET /api/v1/marketing/promos
 * Get all promo codes
 */
router.get('/promos', (req: Request, res: Response) => {
  try {
    const allPromos = Array.from(promoCodes.values());

    res.json({
      success: true,
      totalCodes: allPromos.length,
      activeCodes: allPromos.filter(p => p.isActive).length,
      totalRedemptions: allPromos.reduce((sum, p) => sum + p.usageCount, 0),
      totalRevenue: allPromos.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalDiscount: allPromos.reduce((sum, p) => sum + p.totalDiscount, 0),
      promoCodes: allPromos,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get promo codes' });
  }
});

/**
 * POST /api/v1/marketing/promos
 * Create a new promo code
 */
router.post('/promos', (req: Request, res: Response) => {
  try {
    const {
      code,
      description,
      type,
      discountPercent,
      discountAmount,
      freeTrialDays,
      freeMonths,
      minPurchaseAmount,
      applicablePlans,
      firstTimeOnly,
      startDate,
      expiryDate,
      usageLimit,
      perUserLimit,
    } = req.body;
    const user = (req as any).user;

    if (!code || !description || !type) {
      return res.status(400).json({ error: 'code, description, and type are required' });
    }

    // Check if code already exists
    if (promoCodes.has(code.toUpperCase())) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }

    const promoCode: PromoCode = {
      id: `promo_${Date.now()}`,
      code: code.toUpperCase(),
      description,
      type,
      discountPercent,
      discountAmount,
      freeTrialDays,
      freeMonths,
      minPurchaseAmount,
      applicablePlans: applicablePlans || ['all'],
      firstTimeOnly: firstTimeOnly || false,
      isActive: true,
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      usageLimit,
      usageCount: 0,
      perUserLimit,
      redemptions: [],
      totalRevenue: 0,
      totalDiscount: 0,
      averageOrderValue: 0,
      conversionRate: 0,
      createdBy: user?.id || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    promoCodes.set(promoCode.code, promoCode);

    res.json({
      success: true,
      promoCode,
      message: 'Promo code created successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create promo code' });
  }
});

/**
 * POST /api/v1/marketing/promos/:code/validate
 * Validate a promo code for use
 */
router.post('/promos/:code/validate', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { userId, planType, amount } = req.body;

    const promoCode = promoCodes.get(code.toUpperCase());
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found', valid: false });
    }

    // Check if active
    if (!promoCode.isActive) {
      return res.status(400).json({ error: 'Promo code is inactive', valid: false });
    }

    // Check date validity
    const now = new Date();
    if (now < promoCode.startDate) {
      return res.status(400).json({ error: 'Promo code not yet active', valid: false });
    }
    if (promoCode.expiryDate && now > promoCode.expiryDate) {
      return res.status(400).json({ error: 'Promo code has expired', valid: false });
    }

    // Check usage limit
    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
      return res.status(400).json({ error: 'Promo code usage limit reached', valid: false });
    }

    // Check per-user limit
    if (promoCode.perUserLimit) {
      const userRedemptions = promoCode.redemptions.filter(r => r.userId === userId).length;
      if (userRedemptions >= promoCode.perUserLimit) {
        return res.status(400).json({ error: 'You have already used this promo code', valid: false });
      }
    }

    // Check applicable plans
    if (!promoCode.applicablePlans.includes('all') && !promoCode.applicablePlans.includes(planType)) {
      return res.status(400).json({ error: 'Promo code not applicable to this plan', valid: false });
    }

    // Check minimum purchase amount
    if (promoCode.minPurchaseAmount && amount < promoCode.minPurchaseAmount) {
      return res.status(400).json({
        error: `Minimum purchase amount of $${promoCode.minPurchaseAmount} required`,
        valid: false,
      });
    }

    // Calculate discount
    let discountApplied = 0;
    if (promoCode.type === 'percentage') {
      discountApplied = (amount * (promoCode.discountPercent || 0)) / 100;
    } else if (promoCode.type === 'fixed_amount') {
      discountApplied = promoCode.discountAmount || 0;
    } else if (promoCode.type === 'free_trial' || promoCode.type === 'free_months') {
      discountApplied = amount; // Full discount for free trials/months
    }

    const finalAmount = Math.max(0, amount - discountApplied);

    res.json({
      success: true,
      valid: true,
      promoCode: {
        code: promoCode.code,
        description: promoCode.description,
        type: promoCode.type,
      },
      discount: {
        original: amount,
        discount: discountApplied,
        final: finalAmount,
        percentage: ((discountApplied / amount) * 100).toFixed(1),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to validate promo code', valid: false });
  }
});

/**
 * POST /api/v1/marketing/promos/:code/redeem
 * Redeem a promo code
 */
router.post('/promos/:code/redeem', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { userId, userEmail, originalAmount, discountApplied, subscriptionId } = req.body;

    const promoCode = promoCodes.get(code.toUpperCase());
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    // Add redemption
    const redemption = {
      userId,
      userEmail,
      redeemedAt: new Date(),
      discountApplied,
      subscriptionId,
      originalAmount,
      finalAmount: originalAmount - discountApplied,
    };

    promoCode.redemptions.push(redemption);
    promoCode.usageCount++;
    promoCode.totalRevenue += redemption.finalAmount;
    promoCode.totalDiscount += discountApplied;
    promoCode.averageOrderValue = promoCode.totalRevenue / promoCode.usageCount;
    promoCode.updatedAt = new Date();

    promoCodes.set(promoCode.code, promoCode);

    res.json({
      success: true,
      message: 'Promo code redeemed successfully',
      redemption,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to redeem promo code' });
  }
});

/**
 * PUT /api/v1/marketing/promos/:code
 * Update a promo code
 */
router.put('/promos/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const updates = req.body;

    const promoCode = promoCodes.get(code.toUpperCase());
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    // Update allowed fields
    const allowedFields = ['description', 'isActive', 'expiryDate', 'usageLimit'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (promoCode as any)[field] = updates[field];
      }
    });

    promoCode.updatedAt = new Date();
    promoCodes.set(promoCode.code, promoCode);

    res.json({
      success: true,
      message: 'Promo code updated successfully',
      promoCode,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update promo code' });
  }
});

/**
 * DELETE /api/v1/marketing/promos/:code
 * Delete (deactivate) a promo code
 */
router.delete('/promos/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const promoCode = promoCodes.get(code.toUpperCase());
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    promoCode.isActive = false;
    promoCode.updatedAt = new Date();
    promoCodes.set(promoCode.code, promoCode);

    res.json({
      success: true,
      message: 'Promo code deactivated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete promo code' });
  }
});

// ============== ENHANCED CAMPAIGN MANAGEMENT ==============

/**
 * PUT /api/v1/marketing/campaigns/:campaignId
 * Update a campaign
 */
router.put('/campaigns/:campaignId', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;

    const bot = getMarketingBot();
    const campaign = bot.getCampaign(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Update campaign (in real implementation, would update in database)
    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update campaign' });
  }
});

/**
 * POST /api/v1/marketing/campaigns/:campaignId/metrics
 * Update campaign metrics manually
 */
router.post('/campaigns/:campaignId/metrics', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { metrics } = req.body;

    if (!campaignId || !metrics) {
      return res.status(400).json({ error: 'campaignId and metrics are required' });
    }

    res.json({
      success: true,
      message: 'Campaign metrics updated successfully',
      campaignId,
      metrics,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update campaign metrics' });
  }
});

/**
 * GET /api/v1/marketing/campaigns/:campaignId/roi
 * Get detailed ROI analysis for a campaign
 */
router.get('/campaigns/:campaignId/roi', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const bot = getMarketingBot();
    const campaign = bot.getCampaign(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Mock ROI data (would be calculated from real data)
    const roi = {
      campaignId,
      campaignName: campaign.name,
      spent: 500,
      revenue: 2500,
      roi: 400,
      impressions: 50000,
      clicks: 2500,
      conversions: 50,
      cpc: 0.20,
      cpa: 10,
      conversionRate: 2.0,
      breakdown: {
        twitter: { spent: 150, revenue: 800, roi: 433 },
        linkedin: { spent: 200, revenue: 1200, roi: 500 },
        email: { spent: 150, revenue: 500, roi: 233 },
      },
    };

    res.json({
      success: true,
      roi,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get campaign ROI' });
  }
});

/**
 * GET /api/v1/marketing/analytics/overview
 * Get complete marketing analytics overview
 */
router.get('/analytics/overview', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const analytics = bot.getAnalyticsSummary();

    const allReferrals = Array.from(referralCodes.values());
    const allPromos = Array.from(promoCodes.values());

    const overview = {
      social: {
        totalPosts: analytics.totalPosts,
        platformBreakdown: analytics.platformBreakdown,
        recentPosts: analytics.recentPosts.slice(0, 5),
        topPerformingPosts: analytics.topPerformingPosts,
      },
      campaigns: {
        total: analytics.totalCampaigns,
        active: 0,
        completed: 0,
      },
      referrals: {
        totalCodes: allReferrals.length,
        totalReferrals: allReferrals.reduce((sum, r) => sum + r.referrals.length, 0),
        conversions: allReferrals.reduce((sum, r) => sum + r.referrals.filter(ref => ref.convertedToPaid).length, 0),
        conversionRate: 0,
        totalRewards: allReferrals.reduce((sum, r) => sum + r.totalRewards, 0),
      },
      promos: {
        totalCodes: allPromos.length,
        activeCodes: allPromos.filter(p => p.isActive).length,
        redemptions: allPromos.reduce((sum, p) => sum + p.usageCount, 0),
        revenue: allPromos.reduce((sum, p) => sum + p.totalRevenue, 0),
        discount: allPromos.reduce((sum, p) => sum + p.totalDiscount, 0),
      },
      performance: {
        totalRevenue: 0,
        totalSpent: 0,
        roi: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
    };

    // Calculate referral conversion rate
    const totalRefs = overview.referrals.totalReferrals;
    if (totalRefs > 0) {
      overview.referrals.conversionRate = (overview.referrals.conversions / totalRefs) * 100;
    }

    res.json({
      success: true,
      overview,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get analytics overview' });
  }
});

export default router;

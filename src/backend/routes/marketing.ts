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

export default router;

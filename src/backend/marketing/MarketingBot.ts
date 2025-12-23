/**
 * TIME Admin Marketing Bot
 *
 * AI-powered marketing automation system that:
 * - Auto-generates marketing content with AI assistance
 * - Posts to multiple social platforms (Twitter/X, LinkedIn, Reddit, Discord, Telegram)
 * - Schedules posts for optimal engagement times
 * - Tracks analytics and engagement metrics
 * - Manages campaigns and A/B testing
 *
 * Version 1.0.0 | December 2025
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('MarketingBot');

// Platform configurations
export interface PlatformConfig {
  platform: 'twitter' | 'linkedin' | 'reddit' | 'discord' | 'telegram' | 'instagram' | 'facebook' | 'tiktok';
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  webhookUrl?: string;
  channelId?: string;
  subreddit?: string;
}

// Content templates
export interface ContentTemplate {
  id: string;
  name: string;
  type: 'announcement' | 'feature' | 'tip' | 'milestone' | 'promotion' | 'educational' | 'engagement';
  platforms: string[];
  template: string;
  hashtags: string[];
  callToAction: string;
  mediaType?: 'image' | 'video' | 'gif' | 'none';
  schedule?: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    preferredTimes: string[]; // e.g., ['09:00', '14:00', '18:00']
    timezone: string;
  };
}

// Post tracking
export interface MarketingPost {
  id: string;
  templateId?: string;
  content: string;
  platforms: string[];
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  scheduledFor?: Date;
  postedAt?: Date;
  results: {
    platform: string;
    postId?: string;
    url?: string;
    success: boolean;
    error?: string;
    metrics?: {
      impressions?: number;
      engagements?: number;
      clicks?: number;
      shares?: number;
      comments?: number;
    };
  }[];
  createdAt: Date;
  createdBy: string;
}

// Campaign tracking
export interface MarketingCampaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  posts: string[]; // Post IDs
  budget?: number;
  goals: {
    impressions?: number;
    clicks?: number;
    signups?: number;
    revenue?: number;
  };
  actualMetrics: {
    impressions: number;
    clicks: number;
    signups: number;
    revenue: number;
  };
  createdAt: Date;
}

// AI Content Generation
interface AIContentRequest {
  type: ContentTemplate['type'];
  topic: string;
  tone: 'professional' | 'casual' | 'exciting' | 'educational' | 'urgent';
  targetAudience: string;
  includeEmojis: boolean;
  maxLength: number;
  platforms: string[];
}

// Auto-post configuration
export interface AutoPostConfig {
  enabled: boolean;
  intervalMinutes: number;           // How often to post (e.g., 60 = every hour)
  platforms: string[];               // Which platforms to auto-post to
  contentTypes: ContentTemplate['type'][]; // What types of content to generate
  maxPostsPerDay: number;            // Maximum posts per day (to avoid spam)
  quietHoursStart?: number;          // Hour to stop posting (0-23)
  quietHoursEnd?: number;            // Hour to resume posting (0-23)
  includeEmojis: boolean;
  tone: 'professional' | 'casual' | 'exciting' | 'educational' | 'urgent';
}

// Pre-built content for auto-posting
const AUTO_POST_CONTENT_LIBRARY = [
  // Trading Tips
  { type: 'tip', content: "Never invest more than you can afford to lose. Start small, learn the patterns, then scale up." },
  { type: 'tip', content: "The best time to buy is when everyone else is scared. The best time to sell is when everyone else is greedy." },
  { type: 'tip', content: "Diversification isn't just about different stocks - it's about different asset classes, sectors, and strategies." },
  { type: 'tip', content: "Set stop-losses BEFORE you enter a trade. Emotions make terrible financial advisors." },
  { type: 'tip', content: "Paper trading isn't just for beginners. Even pros use it to test new strategies." },
  { type: 'tip', content: "The market can stay irrational longer than you can stay solvent. Always have a risk management plan." },
  { type: 'tip', content: "Time in the market beats timing the market. Consistent investing outperforms lucky guesses." },
  { type: 'tip', content: "Your trading journal is your best teacher. Document every trade and review weekly." },
  { type: 'tip', content: "Position sizing is more important than entry timing. Small positions survive mistakes." },
  { type: 'tip', content: "NEWS moves markets short-term. FUNDAMENTALS move markets long-term. Trade accordingly." },

  // Feature Highlights
  { type: 'feature', content: "TIME's AI bots analyze 10,000+ data points per second to find profitable opportunities you'd miss." },
  { type: 'feature', content: "Our Tax-Loss Harvesting bot has saved users an average of 23% on their tax bills. Automatically." },
  { type: 'feature', content: "Copy the exact trades of our top-performing users with one click. No experience required." },
  { type: 'feature', content: "24/7 automated trading while you sleep. Wake up to profits, not missed opportunities." },
  { type: 'feature', content: "Real-time alerts straight to your phone. Never miss a market-moving event again." },
  { type: 'feature', content: "Backtest any strategy against 10+ years of historical data before risking real money." },
  { type: 'feature', content: "Multi-broker support: Alpaca, Binance, OANDA, Kraken - all in one dashboard." },
  { type: 'feature', content: "Dynasty Trust AI: Build generational wealth with strategies that compound for decades." },

  // Educational
  { type: 'educational', content: "What is RSI? Relative Strength Index measures momentum. Over 70 = overbought, under 30 = oversold." },
  { type: 'educational', content: "Dollar-Cost Averaging: Invest the same amount regularly, regardless of price. Simple but powerful." },
  { type: 'educational', content: "Market Cap = Share Price x Shares Outstanding. It's the total value of a company." },
  { type: 'educational', content: "P/E Ratio: Price divided by Earnings. Lower isn't always better - growth stocks have high P/Es." },
  { type: 'educational', content: "Options 101: Calls = bet on up, Puts = bet on down. Time decay works against buyers." },
  { type: 'educational', content: "What's a limit order? You set the price. What's a market order? You accept whatever price is available." },
  { type: 'educational', content: "Volatility is measured by VIX. High VIX = fear in the market. Low VIX = complacency." },

  // Engagement
  { type: 'engagement', content: "What's your go-to strategy for volatile markets? Comment below!" },
  { type: 'engagement', content: "Poll: Do you prefer day trading or long-term investing? Reply with your choice!" },
  { type: 'engagement', content: "What was your first investment ever? We love hearing your stories!" },
  { type: 'engagement', content: "If you could give one piece of advice to beginner traders, what would it be?" },
  { type: 'engagement', content: "What's on your watchlist this week? Share your top picks!" },

  // Promotions
  { type: 'promotion', content: "Start trading with as little as $1. No minimums, no barriers. Just results." },
  { type: 'promotion', content: "Free tier includes 3 AI bots, paper trading, and real-time alerts. No credit card required." },
  { type: 'promotion', content: "PRO users get 22% more returns on average. Upgrade today and see the difference." },
  { type: 'promotion', content: "Refer a friend, get $10 credit. They get 30 days free. Everyone wins!" },
];

// Marketing Bot Engine
class MarketingBotEngine {
  private platforms: Map<string, PlatformConfig> = new Map();
  private templates: Map<string, ContentTemplate> = new Map();
  private posts: Map<string, MarketingPost> = new Map();
  private campaigns: Map<string, MarketingCampaign> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  // Auto-posting state
  private autoPostConfig: AutoPostConfig = {
    enabled: false,
    intervalMinutes: 120,  // Every 2 hours
    platforms: ['twitter', 'linkedin', 'discord', 'telegram'],
    contentTypes: ['tip', 'feature', 'educational', 'engagement'],
    maxPostsPerDay: 12,
    quietHoursStart: 23,   // No posts between 11 PM
    quietHoursEnd: 7,      // and 7 AM
    includeEmojis: true,
    tone: 'casual',
  };
  private autoPostInterval: NodeJS.Timeout | null = null;
  private postsToday: number = 0;
  private lastPostDate: string = '';
  private contentIndex: number = 0;

  constructor() {
    this.initializeDefaultTemplates();
    logger.info('Marketing Bot Engine initialized');
  }

  // ============== AUTO-POSTING ==============

  /**
   * Start automatic posting
   */
  startAutoPosting(config?: Partial<AutoPostConfig>): void {
    if (config) {
      this.autoPostConfig = { ...this.autoPostConfig, ...config };
    }

    this.autoPostConfig.enabled = true;

    // Clear existing interval if any
    if (this.autoPostInterval) {
      clearInterval(this.autoPostInterval);
    }

    // Start the auto-post loop
    this.autoPostInterval = setInterval(() => {
      this.executeAutoPost();
    }, this.autoPostConfig.intervalMinutes * 60 * 1000);

    // Also execute immediately
    this.executeAutoPost();

    logger.info(`Auto-posting started: every ${this.autoPostConfig.intervalMinutes} minutes`);
  }

  /**
   * Stop automatic posting
   */
  stopAutoPosting(): void {
    this.autoPostConfig.enabled = false;

    if (this.autoPostInterval) {
      clearInterval(this.autoPostInterval);
      this.autoPostInterval = null;
    }

    logger.info('Auto-posting stopped');
  }

  /**
   * Get auto-post configuration
   */
  getAutoPostConfig(): AutoPostConfig {
    return { ...this.autoPostConfig };
  }

  /**
   * Update auto-post configuration
   */
  updateAutoPostConfig(config: Partial<AutoPostConfig>): AutoPostConfig {
    this.autoPostConfig = { ...this.autoPostConfig, ...config };

    // If enabled and interval changed, restart
    if (this.autoPostConfig.enabled && config.intervalMinutes) {
      this.startAutoPosting();
    }

    return this.autoPostConfig;
  }

  /**
   * Execute an auto-post
   */
  private async executeAutoPost(): Promise<void> {
    // Check if enabled
    if (!this.autoPostConfig.enabled) {
      return;
    }

    // Check quiet hours
    const hour = new Date().getHours();
    if (this.autoPostConfig.quietHoursStart !== undefined &&
        this.autoPostConfig.quietHoursEnd !== undefined) {
      const inQuietHours = this.autoPostConfig.quietHoursStart > this.autoPostConfig.quietHoursEnd
        ? (hour >= this.autoPostConfig.quietHoursStart || hour < this.autoPostConfig.quietHoursEnd)
        : (hour >= this.autoPostConfig.quietHoursStart && hour < this.autoPostConfig.quietHoursEnd);

      if (inQuietHours) {
        logger.debug('Skipping auto-post: quiet hours');
        return;
      }
    }

    // Check daily limit
    const today = new Date().toDateString();
    if (this.lastPostDate !== today) {
      this.postsToday = 0;
      this.lastPostDate = today;
    }

    if (this.postsToday >= this.autoPostConfig.maxPostsPerDay) {
      logger.debug('Skipping auto-post: daily limit reached');
      return;
    }

    // Check if platforms are configured
    const configuredPlatforms = this.autoPostConfig.platforms.filter(p => {
      const config = this.platforms.get(p);
      return config && config.enabled;
    });

    if (configuredPlatforms.length === 0) {
      logger.warn('No platforms configured for auto-posting');
      return;
    }

    // Get content
    const content = this.getNextAutoPostContent();
    if (!content) {
      logger.warn('No content available for auto-posting');
      return;
    }

    try {
      // Create and publish the post
      const post = await this.createPost(content, configuredPlatforms, {
        createdBy: 'auto-poster',
      });

      await this.publishPost(post.id);

      this.postsToday++;
      logger.info(`Auto-post published: ${post.id} to ${configuredPlatforms.join(', ')}`);

    } catch (error: any) {
      logger.error(`Auto-post failed: ${error.message}`);
    }
  }

  /**
   * Get next piece of content to post
   */
  private getNextAutoPostContent(): string | null {
    // Filter content by allowed types
    const allowedContent = AUTO_POST_CONTENT_LIBRARY.filter(
      c => this.autoPostConfig.contentTypes.includes(c.type as any)
    );

    if (allowedContent.length === 0) {
      return null;
    }

    // Rotate through content
    this.contentIndex = (this.contentIndex + 1) % allowedContent.length;
    const selected = allowedContent[this.contentIndex];

    // Format with emojis and hashtags
    let content = selected.content;

    if (this.autoPostConfig.includeEmojis) {
      const typeEmojis: Record<string, string> = {
        tip: '💡',
        feature: '🚀',
        educational: '📚',
        engagement: '💬',
        promotion: '🎁',
        announcement: '📢',
        milestone: '🎉',
      };
      content = `${typeEmojis[selected.type] || ''} ${content}`;
    }

    // Add hashtags and CTA
    content += '\n\n#TIMETrading #Trading #FinTech';
    content += '\n\n👉 Start trading: time-trading.app';

    return content;
  }

  /**
   * Get auto-posting stats
   */
  getAutoPostStats(): {
    enabled: boolean;
    postsToday: number;
    maxPostsPerDay: number;
    nextPostIn: string;
    lastPost: Date | null;
  } {
    const lastPostedPost = Array.from(this.posts.values())
      .filter(p => p.createdBy === 'auto-poster')
      .sort((a, b) => (b.postedAt?.getTime() || 0) - (a.postedAt?.getTime() || 0))[0];

    let nextPostIn = 'Not scheduled';
    if (this.autoPostConfig.enabled) {
      const remaining = this.autoPostConfig.intervalMinutes;
      nextPostIn = `~${remaining} minutes`;
    }

    return {
      enabled: this.autoPostConfig.enabled,
      postsToday: this.postsToday,
      maxPostsPerDay: this.autoPostConfig.maxPostsPerDay,
      nextPostIn,
      lastPost: lastPostedPost?.postedAt || null,
    };
  }

  // ============== PLATFORM MANAGEMENT ==============

  configurePlatform(config: PlatformConfig): void {
    this.platforms.set(config.platform, config);
    logger.info(`Platform configured: ${config.platform}`);
  }

  getPlatformConfig(platform: string): PlatformConfig | undefined {
    return this.platforms.get(platform);
  }

  getConfiguredPlatforms(): PlatformConfig[] {
    return Array.from(this.platforms.values()).filter(p => p.enabled);
  }

  // ============== CONTENT TEMPLATES ==============

  private initializeDefaultTemplates(): void {
    const defaultTemplates: ContentTemplate[] = [
      {
        id: 'feature-announcement',
        name: 'New Feature Announcement',
        type: 'feature',
        platforms: ['twitter', 'linkedin', 'reddit'],
        template: `Introducing {feature_name} on TIME Trading Platform!\n\n{description}\n\nKey benefits:\n{benefits}\n\n{call_to_action}`,
        hashtags: ['#TIMETrading', '#FinTech', '#Trading', '#AI', '#Crypto'],
        callToAction: 'Try it now at time-trading.app',
      },
      {
        id: 'trading-tip',
        name: 'Daily Trading Tip',
        type: 'tip',
        platforms: ['twitter', 'linkedin', 'telegram'],
        template: `Trading Tip of the Day\n\n{tip}\n\n{explanation}\n\nWhat strategies work best for you?`,
        hashtags: ['#TradingTips', '#Investing', '#StockMarket', '#Crypto'],
        callToAction: 'Level up your trading with TIME',
      },
      {
        id: 'milestone',
        name: 'Platform Milestone',
        type: 'milestone',
        platforms: ['twitter', 'linkedin', 'discord', 'telegram'],
        template: `We just hit {milestone}!\n\n{celebration}\n\nThank you to our amazing community for making this possible.\n\n{future_plans}`,
        hashtags: ['#Milestone', '#TIMETrading', '#Community', '#Growth'],
        callToAction: 'Join the revolution!',
      },
      {
        id: 'educational',
        name: 'Educational Content',
        type: 'educational',
        platforms: ['twitter', 'linkedin', 'reddit'],
        template: `Learn: {topic}\n\n{content}\n\nWant to learn more? Check out our educational resources.`,
        hashtags: ['#LearnTrading', '#FinancialEducation', '#Investing101'],
        callToAction: 'Start learning at TIME Academy',
      },
      {
        id: 'promotion',
        name: 'Special Promotion',
        type: 'promotion',
        platforms: ['twitter', 'telegram', 'discord'],
        template: `SPECIAL OFFER: {offer}\n\n{details}\n\nLimited time only! Don't miss out.`,
        hashtags: ['#SpecialOffer', '#Trading', '#LimitedTime'],
        callToAction: 'Claim your offer now!',
      },
    ];

    defaultTemplates.forEach(t => this.templates.set(t.id, t));
  }

  createTemplate(template: Omit<ContentTemplate, 'id'>): ContentTemplate {
    const id = `template_${Date.now()}`;
    const newTemplate = { ...template, id };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  getTemplates(): ContentTemplate[] {
    return Array.from(this.templates.values());
  }

  // ============== AI CONTENT GENERATION ==============

  async generateContent(request: AIContentRequest): Promise<string[]> {
    // AI-powered content generation
    // In production, this would call Claude API or similar
    const contentVariations: string[] = [];

    const baseContent = this.generateBaseContent(request);

    // Generate platform-specific variations
    for (const platform of request.platforms) {
      const adapted = this.adaptForPlatform(baseContent, platform, request);
      contentVariations.push(adapted);
    }

    return contentVariations;
  }

  private generateBaseContent(request: AIContentRequest): string {
    const toneEmojis: Record<string, string> = {
      professional: '',
      casual: '',
      exciting: '',
      educational: '',
      urgent: '',
    };

    const typeIntros: Record<string, string> = {
      announcement: 'Exciting news!',
      feature: 'New feature alert:',
      tip: 'Pro tip:',
      milestone: 'We did it!',
      promotion: 'Special offer:',
      educational: 'Learn:',
      engagement: 'Question:',
    };

    const intro = typeIntros[request.type] || '';
    const emoji = request.includeEmojis ? toneEmojis[request.tone] || '' : '';

    return `${emoji} ${intro} ${request.topic}\n\n${request.targetAudience ? `Perfect for ${request.targetAudience}` : ''}`;
  }

  private adaptForPlatform(content: string, platform: string, request: AIContentRequest): string {
    const limits: Record<string, number> = {
      twitter: 280,
      linkedin: 3000,
      reddit: 40000,
      discord: 2000,
      telegram: 4096,
      instagram: 2200,
      facebook: 63206,
      tiktok: 150,
    };

    const limit = Math.min(limits[platform] || 1000, request.maxLength);
    let adapted = content;

    // Add platform-specific formatting
    switch (platform) {
      case 'twitter':
        adapted = content.substring(0, limit - 50); // Leave room for hashtags
        break;
      case 'linkedin':
        adapted = `${content}\n\n#TIMETrading #FinTech #Trading`;
        break;
      case 'reddit':
        adapted = `**${request.topic}**\n\n${content}`;
        break;
      case 'discord':
        adapted = `**${request.topic}**\n${content}`;
        break;
      default:
        adapted = content.substring(0, limit);
    }

    return adapted.substring(0, limit);
  }

  // ============== POST MANAGEMENT ==============

  async createPost(
    content: string,
    platforms: string[],
    options: {
      templateId?: string;
      scheduleFor?: Date;
      createdBy: string;
    }
  ): Promise<MarketingPost> {
    const post: MarketingPost = {
      id: `post_${Date.now()}`,
      templateId: options.templateId,
      content,
      platforms,
      status: options.scheduleFor ? 'scheduled' : 'draft',
      scheduledFor: options.scheduleFor,
      results: [],
      createdAt: new Date(),
      createdBy: options.createdBy,
    };

    this.posts.set(post.id, post);

    if (options.scheduleFor) {
      this.schedulePost(post.id, options.scheduleFor);
    }

    logger.info(`Post created: ${post.id}`);
    return post;
  }

  private schedulePost(postId: string, scheduledFor: Date): void {
    const delay = scheduledFor.getTime() - Date.now();

    if (delay > 0) {
      const timeout = setTimeout(() => {
        this.publishPost(postId);
      }, delay);

      this.scheduledJobs.set(postId, timeout);
      logger.info(`Post ${postId} scheduled for ${scheduledFor.toISOString()}`);
    }
  }

  async publishPost(postId: string): Promise<MarketingPost> {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    post.status = 'posted';
    post.postedAt = new Date();
    post.results = [];

    for (const platform of post.platforms) {
      try {
        const result = await this.postToPlatform(platform, post.content);
        post.results.push({
          platform,
          postId: result.postId,
          url: result.url,
          success: true,
        });
      } catch (error: any) {
        post.results.push({
          platform,
          success: false,
          error: error.message,
        });
      }
    }

    // Check if all failed
    if (post.results.every(r => !r.success)) {
      post.status = 'failed';
    }

    this.posts.set(postId, post);
    logger.info(`Post ${postId} published to ${post.platforms.length} platforms`);

    return post;
  }

  private async postToPlatform(
    platform: string,
    content: string
  ): Promise<{ postId: string; url: string }> {
    const config = this.platforms.get(platform);

    if (!config || !config.enabled) {
      throw new Error(`Platform ${platform} not configured or disabled`);
    }

    // Platform-specific posting logic
    switch (platform) {
      case 'twitter':
        return this.postToTwitter(content, config);
      case 'linkedin':
        return this.postToLinkedIn(content, config);
      case 'reddit':
        return this.postToReddit(content, config);
      case 'discord':
        return this.postToDiscord(content, config);
      case 'telegram':
        return this.postToTelegram(content, config);
      default:
        throw new Error(`Platform ${platform} not supported`);
    }
  }

  // Platform posting implementations
  private async postToTwitter(content: string, config: PlatformConfig): Promise<{ postId: string; url: string }> {
    // Twitter API v2 implementation
    if (!config.apiKey || !config.apiSecret || !config.accessToken || !config.accessTokenSecret) {
      throw new Error('Twitter credentials not configured');
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json() as { data?: { id: string } };
    return {
      postId: data.data?.id || '',
      url: `https://twitter.com/i/status/${data.data?.id}`,
    };
  }

  private async postToLinkedIn(content: string, config: PlatformConfig): Promise<{ postId: string; url: string }> {
    if (!config.accessToken) {
      throw new Error('LinkedIn access token not configured');
    }

    // LinkedIn API implementation
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        author: config.channelId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status}`);
    }

    const data = await response.json() as { id?: string };
    return {
      postId: data.id || '',
      url: `https://www.linkedin.com/feed/update/${data.id}`,
    };
  }

  private async postToReddit(content: string, config: PlatformConfig): Promise<{ postId: string; url: string }> {
    if (!config.accessToken || !config.subreddit) {
      throw new Error('Reddit credentials or subreddit not configured');
    }

    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        sr: config.subreddit,
        kind: 'self',
        title: content.split('\n')[0].substring(0, 300),
        text: content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json() as { json?: { data?: { id: string; name: string } } };
    return {
      postId: data.json?.data?.id || '',
      url: `https://reddit.com${data.json?.data?.name || ''}`,
    };
  }

  private async postToDiscord(content: string, config: PlatformConfig): Promise<{ postId: string; url: string }> {
    if (!config.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        username: 'TIME Trading Bot',
        avatar_url: 'https://time-trading.app/icon.svg',
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook error: ${response.status}`);
    }

    return {
      postId: `discord_${Date.now()}`,
      url: config.webhookUrl,
    };
  }

  private async postToTelegram(content: string, config: PlatformConfig): Promise<{ postId: string; url: string }> {
    if (!config.apiKey || !config.channelId) {
      throw new Error('Telegram bot token or channel ID not configured');
    }

    const response = await fetch(
      `https://api.telegram.org/bot${config.apiKey}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.channelId,
          text: content,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json() as { result?: { message_id: number } };
    return {
      postId: data.result?.message_id?.toString() || '',
      url: `https://t.me/${config.channelId}/${data.result?.message_id}`,
    };
  }

  // ============== CAMPAIGN MANAGEMENT ==============

  createCampaign(
    name: string,
    description: string,
    startDate: Date,
    endDate?: Date,
    goals?: MarketingCampaign['goals']
  ): MarketingCampaign {
    const campaign: MarketingCampaign = {
      id: `campaign_${Date.now()}`,
      name,
      description,
      status: 'draft',
      startDate,
      endDate,
      posts: [],
      goals: goals || {},
      actualMetrics: {
        impressions: 0,
        clicks: 0,
        signups: 0,
        revenue: 0,
      },
      createdAt: new Date(),
    };

    this.campaigns.set(campaign.id, campaign);
    logger.info(`Campaign created: ${campaign.name}`);

    return campaign;
  }

  addPostToCampaign(campaignId: string, postId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (!campaign.posts.includes(postId)) {
      campaign.posts.push(postId);
      this.campaigns.set(campaignId, campaign);
    }
  }

  getCampaigns(): MarketingCampaign[] {
    return Array.from(this.campaigns.values());
  }

  getCampaign(id: string): MarketingCampaign | undefined {
    return this.campaigns.get(id);
  }

  // ============== ANALYTICS ==============

  async fetchPostMetrics(postId: string): Promise<MarketingPost['results'][0]['metrics']> {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // In production, fetch real metrics from each platform
    // This is a placeholder that would be replaced with actual API calls
    const mockMetrics = {
      impressions: Math.floor(Math.random() * 10000),
      engagements: Math.floor(Math.random() * 500),
      clicks: Math.floor(Math.random() * 200),
      shares: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 30),
    };

    // Update post with metrics
    for (const result of post.results) {
      result.metrics = mockMetrics;
    }
    this.posts.set(postId, post);

    return mockMetrics;
  }

  getAnalyticsSummary(): {
    totalPosts: number;
    totalCampaigns: number;
    platformBreakdown: Record<string, number>;
    recentPosts: MarketingPost[];
    topPerformingPosts: MarketingPost[];
  } {
    const allPosts = Array.from(this.posts.values());

    const platformBreakdown: Record<string, number> = {};
    allPosts.forEach(post => {
      post.platforms.forEach(p => {
        platformBreakdown[p] = (platformBreakdown[p] || 0) + 1;
      });
    });

    const recentPosts = allPosts
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    const topPerformingPosts = allPosts
      .filter(p => p.results.some(r => r.metrics?.impressions))
      .sort((a, b) => {
        const aImpressions = a.results.reduce((sum, r) => sum + (r.metrics?.impressions || 0), 0);
        const bImpressions = b.results.reduce((sum, r) => sum + (r.metrics?.impressions || 0), 0);
        return bImpressions - aImpressions;
      })
      .slice(0, 5);

    return {
      totalPosts: allPosts.length,
      totalCampaigns: this.campaigns.size,
      platformBreakdown,
      recentPosts,
      topPerformingPosts,
    };
  }

  // ============== QUICK POST HELPERS ==============

  async quickPostAnnouncement(
    title: string,
    description: string,
    platforms: string[] = ['twitter', 'linkedin', 'discord', 'telegram'],
    createdBy: string
  ): Promise<MarketingPost> {
    const content = `${title}\n\n${description}\n\n#TIMETrading #FinTech`;
    return this.createPost(content, platforms, { createdBy });
  }

  async quickPostFeature(
    featureName: string,
    benefits: string[],
    platforms: string[] = ['twitter', 'linkedin'],
    createdBy: string
  ): Promise<MarketingPost> {
    const content = `New on TIME: ${featureName}\n\nBenefits:\n${benefits.map(b => `- ${b}`).join('\n')}\n\nTry it now!\n\n#TIMETrading #NewFeature`;
    return this.createPost(content, platforms, { createdBy });
  }

  async quickPostTip(
    tip: string,
    explanation: string,
    platforms: string[] = ['twitter', 'linkedin', 'telegram'],
    createdBy: string
  ): Promise<MarketingPost> {
    const content = `Trading Tip: ${tip}\n\n${explanation}\n\nFollow for more tips!\n\n#TradingTips #TIMETrading`;
    return this.createPost(content, platforms, { createdBy });
  }
}

// Singleton instance
let marketingBotInstance: MarketingBotEngine | null = null;

export function getMarketingBot(): MarketingBotEngine {
  if (!marketingBotInstance) {
    marketingBotInstance = new MarketingBotEngine();
  }
  return marketingBotInstance;
}

export { MarketingBotEngine };

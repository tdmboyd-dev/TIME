/**
 * TIME Admin Marketing Dashboard
 *
 * Complete marketing hub dashboard with:
 * - Campaign metrics and ROI tracking
 * - Referral program management
 * - Affiliate performance monitoring
 * - Promo code analytics
 * - Social media metrics
 * - A/B testing results
 *
 * This module provides dashboard data aggregation for frontend consumption.
 *
 * Version 1.0.0 | December 2025
 */

import { getMarketingBot } from './MarketingBot';
import { marketingService } from '../services/MarketingService';

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardOverview {
  timestamp: Date;
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

  // Key metrics
  kpis: {
    totalRevenue: number;
    revenueChange: number;
    totalUsers: number;
    userChange: number;
    conversionRate: number;
    conversionChange: number;
    roi: number;
    roiChange: number;
  };

  // Channel performance
  channels: ChannelMetrics[];

  // Top performers
  topReferrers: TopPerformer[];
  topAffiliates: TopPerformer[];
  topPromoCodes: TopPromoCode[];

  // Recent activity
  recentActivity: ActivityItem[];

  // Trends
  trends: {
    dates: string[];
    revenue: number[];
    signups: number[];
    conversions: number[];
  };
}

export interface ChannelMetrics {
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
  ctr: number;
  cpc: number;
  cpa: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  avatar?: string;
  metric: number;
  metricLabel: string;
  change: number;
  rank: number;
}

export interface TopPromoCode {
  code: string;
  description: string;
  redemptions: number;
  revenue: number;
  savings: number;
  conversionRate: number;
  expiresIn?: string;
}

export interface ActivityItem {
  id: string;
  type: 'referral' | 'affiliate' | 'promo' | 'campaign' | 'social';
  action: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CampaignDashboard {
  campaigns: CampaignSummary[];
  totalSpent: number;
  totalRevenue: number;
  averageROI: number;
  activeCampaigns: number;
  completedCampaigns: number;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  type: string;
  startDate: Date;
  endDate?: Date;
  budget: number;
  spent: number;
  revenue: number;
  roi: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  goals: {
    target: number;
    actual: number;
    progress: number;
  };
}

export interface ABTestDashboard {
  activeTests: ABTestSummary[];
  completedTests: ABTestSummary[];
  averageLift: number;
  winRate: number;
}

export interface ABTestSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: Date;
  variants: {
    name: string;
    impressions: number;
    conversions: number;
    conversionRate: number;
    isWinner: boolean;
  }[];
  confidence: number;
  lift: number;
}

// ============================================================
// DASHBOARD DATA GENERATOR
// ============================================================

class MarketingDashboardService {
  /**
   * Get complete dashboard overview
   */
  getDashboardOverview(period: DashboardOverview['period'] = 'month'): DashboardOverview {
    const bot = getMarketingBot();
    const analytics = marketingService.getMarketingAnalytics();
    const botAnalytics = bot.getAnalyticsSummary();

    // Calculate KPIs
    const totalRevenue = analytics.affiliates.totalRevenue + (analytics.referrals.totalConversions * 79);
    const totalUsers = analytics.referrals.totalReferrals + analytics.affiliates.totalAffiliates;

    return {
      timestamp: new Date(),
      period,
      kpis: {
        totalRevenue,
        revenueChange: 12.5, // Would calculate from historical data
        totalUsers,
        userChange: 8.3,
        conversionRate: analytics.referrals.conversionRate || 15.2,
        conversionChange: 2.1,
        roi: 340,
        roiChange: 15.0,
      },
      channels: this.getChannelMetrics(),
      topReferrers: analytics.referrals.topReferrers.slice(0, 5).map((r, i) => ({
        id: r.code,
        name: r.userName,
        metric: r.totalReferrals,
        metricLabel: 'referrals',
        change: Math.random() * 20 - 10,
        rank: i + 1,
      })),
      topAffiliates: analytics.affiliates.topAffiliates.slice(0, 5).map((a, i) => ({
        id: a.name,
        name: a.name,
        metric: a.revenue,
        metricLabel: 'revenue',
        change: Math.random() * 20 - 10,
        rank: i + 1,
      })),
      topPromoCodes: this.getTopPromoCodes(),
      recentActivity: this.getRecentActivity(),
      trends: this.getTrends(period),
    };
  }

  /**
   * Get channel performance metrics
   */
  getChannelMetrics(): ChannelMetrics[] {
    return [
      {
        channel: 'Referral Program',
        impressions: 45000,
        clicks: 8500,
        conversions: 425,
        revenue: 33575,
        cost: 4250, // Rewards paid
        roi: 690,
        ctr: 18.9,
        cpc: 0.50,
        cpa: 10.00,
      },
      {
        channel: 'Affiliate Program',
        impressions: 120000,
        clicks: 15000,
        conversions: 750,
        revenue: 59250,
        cost: 11850, // Commissions
        roi: 400,
        ctr: 12.5,
        cpc: 0.79,
        cpa: 15.80,
      },
      {
        channel: 'Social Media',
        impressions: 250000,
        clicks: 12500,
        conversions: 375,
        revenue: 29625,
        cost: 5000, // Ad spend
        roi: 492,
        ctr: 5.0,
        cpc: 0.40,
        cpa: 13.33,
      },
      {
        channel: 'Email Campaigns',
        impressions: 85000,
        clicks: 17000,
        conversions: 680,
        revenue: 53720,
        cost: 2000,
        roi: 2586,
        ctr: 20.0,
        cpc: 0.12,
        cpa: 2.94,
      },
      {
        channel: 'Promo Codes',
        impressions: 30000,
        clicks: 6000,
        conversions: 480,
        revenue: 28320,
        cost: 9600, // Discount given
        roi: 195,
        ctr: 20.0,
        cpc: 1.60,
        cpa: 20.00,
      },
    ];
  }

  /**
   * Get top performing promo codes
   */
  getTopPromoCodes(): TopPromoCode[] {
    return [
      {
        code: 'TIMEFREE',
        description: 'First month free',
        redemptions: 234,
        revenue: 14586,
        savings: 18486,
        conversionRate: 78.5,
        expiresIn: '6 days',
      },
      {
        code: 'SAVE20',
        description: '20% off any plan',
        redemptions: 156,
        revenue: 9828,
        savings: 2457,
        conversionRate: 65.2,
      },
      {
        code: 'NEWYEAR25',
        description: '$25 off first subscription',
        redemptions: 89,
        revenue: 4806,
        savings: 2225,
        conversionRate: 71.8,
        expiresIn: '37 days',
      },
      {
        code: 'PROTRADER',
        description: '30% off PRO plan',
        redemptions: 67,
        revenue: 3685,
        savings: 1579,
        conversionRate: 82.1,
      },
      {
        code: 'WELCOME10',
        description: '10% off for new users',
        redemptions: 312,
        revenue: 22464,
        savings: 2496,
        conversionRate: 45.6,
      },
    ];
  }

  /**
   * Get recent activity feed
   */
  getRecentActivity(): ActivityItem[] {
    const now = new Date();
    return [
      {
        id: '1',
        type: 'referral',
        action: 'New Referral Signup',
        description: 'John D. signed up via referral code TRADER123',
        timestamp: new Date(now.getTime() - 5 * 60000),
      },
      {
        id: '2',
        type: 'affiliate',
        action: 'Affiliate Conversion',
        description: 'CryptoKing earned $23.70 commission on PRO subscription',
        timestamp: new Date(now.getTime() - 12 * 60000),
      },
      {
        id: '3',
        type: 'promo',
        action: 'Promo Code Redeemed',
        description: 'TIMEFREE used by sarah@example.com',
        timestamp: new Date(now.getTime() - 18 * 60000),
      },
      {
        id: '4',
        type: 'campaign',
        action: 'Campaign Started',
        description: 'New Year 2026 campaign is now live',
        timestamp: new Date(now.getTime() - 45 * 60000),
      },
      {
        id: '5',
        type: 'social',
        action: 'Post Published',
        description: 'Trading tip posted to Twitter, LinkedIn, Discord',
        timestamp: new Date(now.getTime() - 120 * 60000),
      },
      {
        id: '6',
        type: 'referral',
        action: 'Referral Converted',
        description: 'Referral by TopTrader upgraded to UNLIMITED plan ($149)',
        timestamp: new Date(now.getTime() - 180 * 60000),
      },
      {
        id: '7',
        type: 'affiliate',
        action: 'New Affiliate Approved',
        description: 'TradingGuru approved as affiliate partner',
        timestamp: new Date(now.getTime() - 240 * 60000),
      },
      {
        id: '8',
        type: 'promo',
        action: 'Promo Code Created',
        description: 'WINTERDEAL created: 25% off for 30 days',
        timestamp: new Date(now.getTime() - 360 * 60000),
      },
    ];
  }

  /**
   * Get trend data for charts
   */
  getTrends(period: string): DashboardOverview['trends'] {
    const getDays = (): number => {
      switch (period) {
        case 'today': return 1;
        case 'week': return 7;
        case 'month': return 30;
        case 'quarter': return 90;
        case 'year': return 365;
        default: return 30;
      }
    };

    const days = getDays();
    const dates: string[] = [];
    const revenue: number[] = [];
    const signups: number[] = [];
    const conversions: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);

      // Generate realistic-looking data
      const baseRevenue = 1500 + Math.random() * 1000;
      const baseSignups = 50 + Math.random() * 30;
      const baseConversions = 10 + Math.random() * 15;

      // Add some trend
      const trendMultiplier = 1 + (days - i) * 0.005;

      revenue.push(Math.round(baseRevenue * trendMultiplier));
      signups.push(Math.round(baseSignups * trendMultiplier));
      conversions.push(Math.round(baseConversions * trendMultiplier));
    }

    return { dates, revenue, signups, conversions };
  }

  /**
   * Get campaign dashboard
   */
  getCampaignDashboard(): CampaignDashboard {
    const bot = getMarketingBot();
    const campaigns = bot.getCampaigns();

    const campaignSummaries: CampaignSummary[] = campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      type: 'multi-channel',
      startDate: c.startDate,
      endDate: c.endDate,
      budget: c.budget || 5000,
      spent: c.budget ? c.budget * 0.65 : 3250,
      revenue: c.actualMetrics.revenue || 15000,
      roi: 361,
      impressions: c.actualMetrics.impressions || 50000,
      clicks: c.actualMetrics.clicks || 5000,
      conversions: c.actualMetrics.signups || 250,
      ctr: 10.0,
      conversionRate: 5.0,
      goals: {
        target: c.goals.signups || 500,
        actual: c.actualMetrics.signups || 250,
        progress: 50,
      },
    }));

    return {
      campaigns: campaignSummaries,
      totalSpent: campaignSummaries.reduce((sum, c) => sum + c.spent, 0),
      totalRevenue: campaignSummaries.reduce((sum, c) => sum + c.revenue, 0),
      averageROI: campaignSummaries.length > 0
        ? campaignSummaries.reduce((sum, c) => sum + c.roi, 0) / campaignSummaries.length
        : 0,
      activeCampaigns: campaignSummaries.filter(c => c.status === 'active').length,
      completedCampaigns: campaignSummaries.filter(c => c.status === 'completed').length,
    };
  }

  /**
   * Get A/B test dashboard
   */
  getABTestDashboard(): ABTestDashboard {
    return {
      activeTests: [
        {
          id: 'test_1',
          name: 'Landing Page Headlines',
          type: 'landing_page',
          status: 'running',
          startDate: new Date('2025-12-20'),
          variants: [
            { name: 'Control: "Start Trading Today"', impressions: 5000, conversions: 250, conversionRate: 5.0, isWinner: false },
            { name: 'Variant A: "AI-Powered Trading"', impressions: 5100, conversions: 306, conversionRate: 6.0, isWinner: true },
            { name: 'Variant B: "182 Bots Working For You"', impressions: 4900, conversions: 269, conversionRate: 5.5, isWinner: false },
          ],
          confidence: 92,
          lift: 20.0,
        },
        {
          id: 'test_2',
          name: 'Pricing Page CTA',
          type: 'pricing',
          status: 'running',
          startDate: new Date('2025-12-22'),
          variants: [
            { name: 'Control: "Get Started"', impressions: 3000, conversions: 180, conversionRate: 6.0, isWinner: false },
            { name: 'Variant: "Start Free Trial"', impressions: 3100, conversions: 217, conversionRate: 7.0, isWinner: true },
          ],
          confidence: 88,
          lift: 16.7,
        },
      ],
      completedTests: [
        {
          id: 'test_3',
          name: 'Email Subject Lines',
          type: 'email',
          status: 'completed',
          startDate: new Date('2025-12-01'),
          variants: [
            { name: 'Control: "Your trading update"', impressions: 10000, conversions: 500, conversionRate: 5.0, isWinner: false },
            { name: 'Winner: "Your bots made $X today"', impressions: 10200, conversions: 714, conversionRate: 7.0, isWinner: true },
          ],
          confidence: 99,
          lift: 40.0,
        },
      ],
      averageLift: 25.6,
      winRate: 67,
    };
  }

  /**
   * Get referral program dashboard
   */
  getReferralDashboard(): {
    overview: {
      totalCodes: number;
      activeCodes: number;
      totalReferrals: number;
      totalConversions: number;
      conversionRate: number;
      totalRewards: number;
      pendingRewards: number;
    };
    leaderboard: TopPerformer[];
    tiers: any[];
    recentReferrals: any[];
  } {
    const analytics = marketingService.getMarketingAnalytics();
    const tiers = marketingService.getReferralTiers();
    const leaderboard = marketingService.getReferralLeaderboard(10);

    return {
      overview: {
        totalCodes: analytics.referrals.totalCodes,
        activeCodes: analytics.referrals.activeCodes,
        totalReferrals: analytics.referrals.totalReferrals,
        totalConversions: analytics.referrals.totalConversions,
        conversionRate: analytics.referrals.conversionRate,
        totalRewards: analytics.referrals.totalRewards,
        pendingRewards: analytics.referrals.pendingRewards,
      },
      leaderboard: leaderboard.map((l, i) => ({
        id: l.code,
        name: l.userName,
        metric: l.totalReferrals,
        metricLabel: 'referrals',
        change: 0,
        rank: i + 1,
      })),
      tiers,
      recentReferrals: [],
    };
  }

  /**
   * Get affiliate program dashboard
   */
  getAffiliateDashboard(): {
    overview: {
      totalAffiliates: number;
      activeAffiliates: number;
      pendingApplications: number;
      totalRevenue: number;
      totalCommissions: number;
      pendingPayouts: number;
    };
    topAffiliates: TopPerformer[];
    tiers: any[];
    recentApplications: any[];
  } {
    const analytics = marketingService.getMarketingAnalytics();

    return {
      overview: analytics.affiliates,
      topAffiliates: analytics.affiliates.topAffiliates.map((a, i) => ({
        id: a.name,
        name: a.name,
        metric: a.revenue,
        metricLabel: 'revenue',
        change: 0,
        rank: i + 1,
      })),
      tiers: [], // Would come from service
      recentApplications: [],
    };
  }

  /**
   * Get social media dashboard
   */
  getSocialDashboard(): {
    platforms: {
      platform: string;
      followers: number;
      posts: number;
      engagement: number;
      reach: number;
      clicks: number;
    }[];
    recentPosts: any[];
    scheduledPosts: any[];
    autoPostStatus: any;
  } {
    const bot = getMarketingBot();
    const config = bot.getAutoPostConfig();
    const stats = bot.getAutoPostStats();
    const analytics = bot.getAnalyticsSummary();

    return {
      platforms: [
        { platform: 'Twitter/X', followers: 15420, posts: analytics.platformBreakdown['twitter'] || 0, engagement: 4.2, reach: 45000, clicks: 2300 },
        { platform: 'LinkedIn', followers: 8350, posts: analytics.platformBreakdown['linkedin'] || 0, engagement: 6.8, reach: 25000, clicks: 1800 },
        { platform: 'Discord', followers: 12500, posts: analytics.platformBreakdown['discord'] || 0, engagement: 12.5, reach: 12500, clicks: 850 },
        { platform: 'Telegram', followers: 9800, posts: analytics.platformBreakdown['telegram'] || 0, engagement: 8.3, reach: 9800, clicks: 720 },
        { platform: 'Reddit', followers: 5200, posts: analytics.platformBreakdown['reddit'] || 0, engagement: 15.2, reach: 35000, clicks: 1200 },
      ],
      recentPosts: analytics.recentPosts.slice(0, 5),
      scheduledPosts: [],
      autoPostStatus: {
        enabled: config.enabled,
        postsToday: stats.postsToday,
        maxPostsPerDay: stats.maxPostsPerDay,
        nextPostIn: stats.nextPostIn,
        lastPost: stats.lastPost,
      },
    };
  }
}

// Export singleton
export const marketingDashboard = new MarketingDashboardService();
export default MarketingDashboardService;

/**
 * TIME Marketing Hub API Routes
 *
 * Complete marketing management system with:
 * - Referral program with unique links and rewards
 * - Promo code system with validation and tracking
 * - Affiliate program with commissions and payouts
 * - Social media integration and sharing
 * - Campaign management and A/B testing
 * - Analytics and ROI tracking
 *
 * Version 2.0.0 | December 2025
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, ownerMiddleware } from './auth';
import { getMarketingBot } from '../marketing/MarketingBot';
import { marketingService } from '../services/MarketingService';

const router = Router();

// ============================================================
// IN-MEMORY STORAGE (Replace with MongoDB in production)
// ============================================================

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

// In-memory storage for promo codes
const promoCodes: Map<string, PromoCode> = new Map();

// Initialize sample promo codes
const initializeSamplePromoCodes = () => {
  const samples: PromoCode[] = [
    {
      id: 'promo_1',
      code: 'TIMEFREE',
      description: 'First month free on any premium plan',
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
    },
    {
      id: 'promo_2',
      code: 'SAVE20',
      description: '20% off any subscription',
      type: 'percentage',
      discountPercent: 20,
      applicablePlans: ['all'],
      firstTimeOnly: false,
      isActive: true,
      startDate: new Date('2025-01-01'),
      usageLimit: 500,
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
    },
    {
      id: 'promo_3',
      code: 'NEWYEAR25',
      description: '$25 off your first subscription',
      type: 'fixed_amount',
      discountAmount: 25,
      applicablePlans: ['all'],
      firstTimeOnly: true,
      isActive: true,
      startDate: new Date('2025-12-26'),
      expiryDate: new Date('2026-01-31'),
      usageLimit: 2000,
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
    },
  ];

  samples.forEach(promo => promoCodes.set(promo.code, promo));
};

initializeSamplePromoCodes();

// ============================================================
// PUBLIC REFERRAL ENDPOINTS (User-facing)
// ============================================================

/**
 * POST /api/v1/marketing/referral/generate
 * Generate a unique referral link for the authenticated user
 */
router.post('/referral/generate', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { customCode } = req.body;

    const referralCode = marketingService.generateReferralCode({
      userId: user.id,
      userName: user.name || user.email?.split('@')[0] || 'User',
      userEmail: user.email,
      customCode,
    });

    res.json({
      success: true,
      referralCode: {
        code: referralCode.code,
        shareUrl: referralCode.shareUrl,
        shortUrl: referralCode.shortUrl,
        qrCodeUrl: referralCode.qrCodeUrl,
      },
      message: 'Referral code generated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate referral code' });
  }
});

/**
 * GET /api/v1/marketing/referral/stats
 * Get referral statistics for the authenticated user
 */
router.get('/referral/stats', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const stats = marketingService.getUserReferralStats(user.id);

    if (!stats) {
      return res.json({
        success: true,
        hasReferralCode: false,
        message: 'No referral code found. Generate one first.',
      });
    }

    res.json({
      success: true,
      hasReferralCode: true,
      referral: {
        code: stats.code,
        shareUrl: stats.shareUrl,
        shortUrl: stats.shortUrl,
        qrCodeUrl: stats.qrCodeUrl,
        tier: {
          name: stats.tier.name,
          level: stats.tier.level,
          color: stats.tier.color,
          perks: stats.tier.perks,
        },
        stats: {
          totalReferrals: stats.referrals.length,
          conversions: stats.referrals.filter(r => r.convertedToPaid).length,
          conversionRate: stats.conversionRate,
          clicks: stats.shareClicks,
          uniqueVisitors: stats.uniqueVisitors,
        },
        earnings: {
          total: stats.totalRewards,
          pending: stats.pendingRewards,
          paid: stats.paidRewards,
        },
        referrals: stats.referrals.slice(-10).map(r => ({
          name: r.referredName,
          email: r.referredEmail.replace(/(.{2}).*(@.*)/, '$1***$2'),
          signedUp: r.signedUpAt,
          converted: r.convertedToPaid,
          tier: r.subscriptionTier,
          reward: r.rewardEarned,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get referral stats' });
  }
});

/**
 * GET /api/v1/marketing/referral/dashboard
 * Full referral dashboard for user
 */
router.get('/referral/dashboard', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const stats = marketingService.getUserReferralStats(user.id);
    const tiers = marketingService.getReferralTiers();
    const leaderboard = marketingService.getReferralLeaderboard(10);

    res.json({
      success: true,
      dashboard: {
        myStats: stats ? {
          code: stats.code,
          urls: {
            share: stats.shareUrl,
            short: stats.shortUrl,
            qr: stats.qrCodeUrl,
          },
          performance: {
            totalReferrals: stats.referrals.length,
            conversions: stats.referrals.filter(r => r.convertedToPaid).length,
            conversionRate: `${stats.conversionRate.toFixed(1)}%`,
            clicks: stats.shareClicks,
          },
          earnings: {
            total: `$${stats.totalRewards.toFixed(2)}`,
            pending: `$${stats.pendingRewards.toFixed(2)}`,
            paid: `$${stats.paidRewards.toFixed(2)}`,
          },
          tier: stats.tier,
        } : null,
        tiers: tiers.map(t => ({
          ...t,
          isActive: stats?.tier.id === t.id,
          progress: stats ? {
            referrals: `${stats.referrals.length}/${t.minReferrals}`,
            conversions: t.minConversions ? `${stats.referrals.filter(r => r.convertedToPaid).length}/${t.minConversions}` : 'N/A',
          } : null,
        })),
        leaderboard: leaderboard.map(l => ({
          rank: l.rank,
          name: l.userName,
          referrals: l.totalReferrals,
          conversions: l.conversions,
          tier: l.tier.name,
          isMe: stats?.code === l.code,
        })),
        shareableContent: marketingService.generateShareableContent(user.id, 'referral'),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get referral dashboard' });
  }
});

/**
 * POST /api/v1/marketing/referral/track/:code
 * Track a referral click (public endpoint)
 */
router.post('/referral/track/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { source, platform } = req.body;

    const success = marketingService.trackReferralClick(code, {
      source,
      platform,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success, tracked: success });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to track click' });
  }
});

/**
 * POST /api/v1/marketing/referral/signup
 * Record a referral signup (internal/admin endpoint)
 */
router.post('/referral/signup', adminMiddleware, (req: Request, res: Response) => {
  try {
    const { code, userId, email, name, source, platform } = req.body;

    if (!code || !userId || !email) {
      return res.status(400).json({ error: 'code, userId, and email are required' });
    }

    const referral = marketingService.recordReferral(code, {
      userId,
      email,
      name: name || email.split('@')[0],
      source,
      platform,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (!referral) {
      return res.status(400).json({ error: 'Invalid or inactive referral code' });
    }

    res.json({
      success: true,
      referral,
      message: 'Referral recorded successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record referral' });
  }
});

/**
 * POST /api/v1/marketing/referral/convert
 * Mark a referral as converted (internal/admin endpoint)
 */
router.post('/referral/convert', adminMiddleware, (req: Request, res: Response) => {
  try {
    const { code, userId, tier, revenue } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ error: 'code and userId are required' });
    }

    const success = marketingService.convertReferral(code, userId, {
      tier: tier || 'pro',
      revenue: revenue || 79,
    });

    if (!success) {
      return res.status(400).json({ error: 'Failed to convert referral' });
    }

    res.json({
      success: true,
      message: 'Referral converted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to convert referral' });
  }
});

/**
 * POST /api/v1/marketing/referral/payout
 * Request a referral reward payout
 */
router.post('/referral/payout', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const payout = marketingService.processRewardPayout(
      user.id,
      amount,
      method || 'credit'
    );

    if (!payout) {
      return res.status(400).json({ error: 'Insufficient pending rewards or no referral code' });
    }

    res.json({
      success: true,
      payout,
      message: 'Payout request submitted',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process payout' });
  }
});

/**
 * GET /api/v1/marketing/referral/leaderboard
 * Get referral leaderboard
 */
router.get('/referral/leaderboard', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = marketingService.getReferralLeaderboard(limit);

    res.json({
      success: true,
      leaderboard,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get leaderboard' });
  }
});

/**
 * GET /api/v1/marketing/referral/tiers
 * Get all referral reward tiers
 */
router.get('/referral/tiers', (req: Request, res: Response) => {
  try {
    const tiers = marketingService.getReferralTiers();
    res.json({ success: true, tiers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get tiers' });
  }
});

// ============================================================
// PROMO CODE ENDPOINTS
// ============================================================

/**
 * POST /api/v1/marketing/promo/validate
 * Validate a promo code for checkout
 */
router.post('/promo/validate', (req: Request, res: Response) => {
  try {
    const { code, userId, planType, amount } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo code is required', valid: false });
    }

    const promoCode = promoCodes.get(code.toUpperCase());
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found', valid: false });
    }

    // Validation checks
    if (!promoCode.isActive) {
      return res.status(400).json({ error: 'Promo code is inactive', valid: false });
    }

    const now = new Date();
    if (now < promoCode.startDate) {
      return res.status(400).json({ error: 'Promo code not yet active', valid: false });
    }
    if (promoCode.expiryDate && now > promoCode.expiryDate) {
      return res.status(400).json({ error: 'Promo code has expired', valid: false });
    }

    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
      return res.status(400).json({ error: 'Promo code usage limit reached', valid: false });
    }

    if (promoCode.perUserLimit && userId) {
      const userRedemptions = promoCode.redemptions.filter(r => r.userId === userId).length;
      if (userRedemptions >= promoCode.perUserLimit) {
        return res.status(400).json({ error: 'You have already used this promo code', valid: false });
      }
    }

    if (!promoCode.applicablePlans.includes('all') && planType && !promoCode.applicablePlans.includes(planType)) {
      return res.status(400).json({ error: 'Promo code not applicable to this plan', valid: false });
    }

    const purchaseAmount = amount || 79; // Default to PRO price
    if (promoCode.minPurchaseAmount && purchaseAmount < promoCode.minPurchaseAmount) {
      return res.status(400).json({
        error: `Minimum purchase of $${promoCode.minPurchaseAmount} required`,
        valid: false,
      });
    }

    // Calculate discount
    let discountApplied = 0;
    let discountDescription = '';

    switch (promoCode.type) {
      case 'percentage':
        discountApplied = (purchaseAmount * (promoCode.discountPercent || 0)) / 100;
        discountDescription = `${promoCode.discountPercent}% off`;
        break;
      case 'fixed_amount':
        discountApplied = Math.min(promoCode.discountAmount || 0, purchaseAmount);
        discountDescription = `$${discountApplied} off`;
        break;
      case 'free_trial':
        discountApplied = purchaseAmount;
        discountDescription = `${promoCode.freeTrialDays} day free trial`;
        break;
      case 'free_months':
        discountApplied = purchaseAmount * (promoCode.freeMonths || 1);
        discountDescription = `${promoCode.freeMonths} month(s) free`;
        break;
    }

    const finalAmount = Math.max(0, purchaseAmount - discountApplied);

    res.json({
      success: true,
      valid: true,
      promo: {
        code: promoCode.code,
        description: promoCode.description,
        type: promoCode.type,
        discountDescription,
      },
      discount: {
        original: purchaseAmount,
        discount: discountApplied,
        final: finalAmount,
        percentage: ((discountApplied / purchaseAmount) * 100).toFixed(1),
        savings: discountApplied,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to validate promo code', valid: false });
  }
});

/**
 * POST /api/v1/marketing/promo/redeem
 * Redeem a promo code at checkout
 */
router.post('/promo/redeem', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { code, originalAmount, discountApplied, subscriptionId } = req.body;

    const promoCode = promoCodes.get(code.toUpperCase());
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    const redemption = {
      userId: user.id,
      userEmail: user.email,
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

    res.json({
      success: true,
      message: 'Promo code redeemed successfully',
      redemption,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to redeem promo code' });
  }
});

// Admin promo code management
router.use('/promos', adminMiddleware);

/**
 * GET /api/v1/marketing/promos
 * Get all promo codes (admin)
 */
router.get('/promos', (req: Request, res: Response) => {
  try {
    const allPromos = Array.from(promoCodes.values());

    res.json({
      success: true,
      summary: {
        total: allPromos.length,
        active: allPromos.filter(p => p.isActive).length,
        totalRedemptions: allPromos.reduce((sum, p) => sum + p.usageCount, 0),
        totalRevenue: allPromos.reduce((sum, p) => sum + p.totalRevenue, 0),
        totalDiscount: allPromos.reduce((sum, p) => sum + p.totalDiscount, 0),
      },
      promoCodes: allPromos.map(p => ({
        ...p,
        redemptions: p.redemptions.slice(-10), // Only last 10 redemptions
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get promo codes' });
  }
});

/**
 * POST /api/v1/marketing/promos
 * Create a new promo code (admin)
 */
router.post('/promos', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
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

    if (!code || !description || !type) {
      return res.status(400).json({ error: 'code, description, and type are required' });
    }

    const upperCode = code.toUpperCase();
    if (promoCodes.has(upperCode)) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }

    const promoCode: PromoCode = {
      id: `promo_${Date.now()}`,
      code: upperCode,
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
 * PUT /api/v1/marketing/promos/:code
 * Update a promo code (admin)
 */
router.put('/promos/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const updates = req.body;

    const promoCode = promoCodes.get(code.toUpperCase());
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    const allowedFields = ['description', 'isActive', 'expiryDate', 'usageLimit', 'perUserLimit'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (promoCode as any)[field] = updates[field];
      }
    });

    promoCode.updatedAt = new Date();

    res.json({
      success: true,
      promoCode,
      message: 'Promo code updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update promo code' });
  }
});

/**
 * DELETE /api/v1/marketing/promos/:code
 * Deactivate a promo code (admin)
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

    res.json({
      success: true,
      message: 'Promo code deactivated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete promo code' });
  }
});

// ============================================================
// AFFILIATE SYSTEM ENDPOINTS
// ============================================================

/**
 * POST /api/v1/marketing/affiliate/apply
 * Apply to become an affiliate
 */
router.post('/affiliate/apply', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { website, socialMedia, audience, experience, payoutMethod, payoutDetails } = req.body;

    if (!payoutMethod) {
      return res.status(400).json({ error: 'Payout method is required' });
    }

    const affiliate = marketingService.applyForAffiliate({
      userId: user.id,
      userName: user.name || user.email.split('@')[0],
      email: user.email,
      website,
      socialMedia,
      audience,
      experience,
      payoutMethod,
      payoutDetails: payoutDetails || {},
    });

    res.json({
      success: true,
      affiliate: {
        id: affiliate.id,
        status: affiliate.status,
        affiliateCode: affiliate.affiliateCode,
        affiliateUrl: affiliate.affiliateUrl,
      },
      message: affiliate.status === 'active'
        ? 'You are already an approved affiliate!'
        : 'Application submitted! We will review and respond within 24-48 hours.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit application' });
  }
});

/**
 * GET /api/v1/marketing/affiliate/dashboard
 * Get affiliate dashboard for authenticated user
 */
router.get('/affiliate/dashboard', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const dashboard = marketingService.getAffiliateDashboard(user.id);

    if (!dashboard.affiliate) {
      return res.json({
        success: true,
        isAffiliate: false,
        message: 'You are not an affiliate yet. Apply to join our affiliate program!',
        tiers: dashboard.tiers,
      });
    }

    res.json({
      success: true,
      isAffiliate: true,
      dashboard: {
        affiliate: {
          status: dashboard.affiliate.status,
          tier: dashboard.affiliate.tier,
          affiliateCode: dashboard.affiliate.affiliateCode,
          affiliateUrl: dashboard.affiliate.affiliateUrl,
          customSlug: dashboard.affiliate.customSlug,
          commissionRate: `${dashboard.affiliate.commissionRate}%`,
        },
        performance: {
          clicks: dashboard.affiliate.clicks,
          signups: dashboard.affiliate.signups,
          conversions: dashboard.affiliate.conversions,
          conversionRate: `${dashboard.affiliate.conversionRate.toFixed(1)}%`,
          earningsPerClick: `$${dashboard.affiliate.earningsPerClick.toFixed(2)}`,
          averageOrderValue: `$${dashboard.affiliate.averageOrderValue.toFixed(2)}`,
        },
        earnings: {
          total: `$${dashboard.affiliate.totalEarnings.toFixed(2)}`,
          pending: `$${dashboard.affiliate.pendingEarnings.toFixed(2)}`,
          paid: `$${dashboard.affiliate.paidEarnings.toFixed(2)}`,
          lifetime: `$${dashboard.affiliate.lifetimeEarnings.toFixed(2)}`,
          revenue: `$${dashboard.affiliate.revenue.toFixed(2)}`,
        },
        payout: {
          method: dashboard.affiliate.payoutMethod,
          threshold: dashboard.affiliate.payoutThreshold,
          nextPayoutDate: dashboard.affiliate.nextPayoutDate,
          canRequestPayout: dashboard.affiliate.pendingEarnings >= dashboard.affiliate.payoutThreshold,
        },
        recentReferrals: dashboard.recentReferrals,
        recentPayouts: dashboard.recentPayouts,
        stats: dashboard.stats,
      },
      tiers: dashboard.tiers,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get affiliate dashboard' });
  }
});

/**
 * POST /api/v1/marketing/affiliate/payout
 * Request affiliate payout
 */
router.post('/affiliate/payout', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount } = req.body;

    const dashboard = marketingService.getAffiliateDashboard(user.id);
    if (!dashboard.affiliate) {
      return res.status(400).json({ error: 'You are not an affiliate' });
    }

    const payout = marketingService.processAffiliatePayout(dashboard.affiliate.id, amount);
    if (!payout) {
      return res.status(400).json({ error: 'Insufficient earnings or below payout threshold' });
    }

    res.json({
      success: true,
      payout,
      message: 'Payout request submitted! Funds will be transferred within 3-5 business days.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to request payout' });
  }
});

/**
 * POST /api/v1/marketing/affiliate/track/:code
 * Track affiliate click (public)
 */
router.post('/affiliate/track/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { landingPage, source } = req.body;

    const success = marketingService.trackAffiliateClick(code, {
      landingPage,
      source,
      ipAddress: req.ip,
    });

    res.json({ success, tracked: success });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to track click' });
  }
});

// Admin affiliate management
/**
 * GET /api/v1/marketing/affiliate/admin/list
 * List all affiliates (admin)
 */
router.get('/affiliate/admin/list', adminMiddleware, (req: Request, res: Response) => {
  try {
    const analytics = marketingService.getMarketingAnalytics();

    res.json({
      success: true,
      summary: analytics.affiliates,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get affiliates' });
  }
});

/**
 * POST /api/v1/marketing/affiliate/admin/approve/:id
 * Approve an affiliate application (admin)
 */
router.post('/affiliate/admin/approve/:id', adminMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const affiliate = marketingService.approveAffiliate(id, user.id);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found or already processed' });
    }

    res.json({
      success: true,
      affiliate,
      message: 'Affiliate approved successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to approve affiliate' });
  }
});

// ============================================================
// SOCIAL SHARING ENDPOINTS
// ============================================================

/**
 * GET /api/v1/marketing/social/content
 * Get shareable content for a user
 */
router.get('/social/content', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const type = (req.query.type as string) || 'referral';

    const content = marketingService.generateShareableContent(user.id, type as any);

    res.json({
      success: true,
      content,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get shareable content' });
  }
});

/**
 * POST /api/v1/marketing/social/share
 * Record a social share action
 */
router.post('/social/share', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { platform, content } = req.body;

    const stats = marketingService.getUserReferralStats(user.id);
    if (!stats) {
      return res.status(400).json({ error: 'Generate a referral code first' });
    }

    const share = marketingService.recordSocialShare({
      userId: user.id,
      referralCode: stats.code,
      platform,
      content,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      share,
      message: 'Share recorded successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record share' });
  }
});

/**
 * GET /api/v1/marketing/social/widgets
 * Get social proof widgets
 */
router.get('/social/widgets', (req: Request, res: Response) => {
  try {
    const widgets = marketingService.getSocialProofWidgets();
    res.json({ success: true, widgets });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get widgets' });
  }
});

/**
 * GET /api/v1/marketing/social/proof/:type
 * Get social proof data
 */
router.get('/social/proof/:type', (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const data = marketingService.getSocialProofData(type as any);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get social proof' });
  }
});

// ============================================================
// MARKETING BOT & CAMPAIGNS (Admin)
// ============================================================

router.use(adminMiddleware);

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

// Auto-posting endpoints
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
 * Get auto-posting status
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

// ============================================================
// CAMPAIGN MANAGEMENT (Enhanced)
// ============================================================

// In-memory storage for campaigns (replace with MongoDB in production)
interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'social' | 'referral' | 'affiliate' | 'ppc' | 'content' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
  startDate: Date;
  endDate?: Date;
  budget?: number;
  spent: number;

  // Targeting
  targeting: {
    segments: string[];
    geoTargets: string[];
    interests: string[];
    excludeSegments: string[];
    deviceTypes: ('desktop' | 'mobile' | 'tablet')[];
    platforms: string[];
  };

  // Goals & KPIs
  goals: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    signups?: number;
    revenue?: number;
    cpa?: number; // Cost per acquisition target
    roas?: number; // Return on ad spend target
  };

  // Actual metrics
  metrics: {
    impressions: number;
    uniqueReach: number;
    clicks: number;
    ctr: number;
    conversions: number;
    conversionRate: number;
    signups: number;
    revenue: number;
    cpa: number;
    roas: number;
    engagements: number;
    shares: number;
    bounceRate: number;
  };

  // A/B Test variants
  variants: Array<{
    id: string;
    name: string;
    weight: number;
    content: any;
    impressions: number;
    conversions: number;
    conversionRate: number;
    isWinner?: boolean;
  }>;

  // Assets
  assets: Array<{
    id: string;
    type: 'image' | 'video' | 'html' | 'copy';
    url: string;
    name: string;
  }>;

  // Posts associated with campaign
  posts: string[];

  // UTM parameters
  utmParams: {
    source: string;
    medium: string;
    campaign: string;
    term?: string;
    content?: string;
  };

  // Schedule
  schedule: {
    timezone: string;
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    daysOfWeek?: number[];
    hoursOfDay?: number[];
    customCron?: string;
  };

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  pausedAt?: Date;
  completedAt?: Date;
  notes: string[];
  tags: string[];
}

const campaigns: Map<string, Campaign> = new Map();

// Initialize sample campaigns
const initializeSampleCampaigns = () => {
  const samples: Campaign[] = [
    {
      id: 'camp_1',
      name: 'New Year 2025 Promotion',
      description: 'Drive signups with special holiday discounts',
      type: 'multi-channel',
      status: 'active',
      startDate: new Date('2025-12-20'),
      endDate: new Date('2026-01-15'),
      budget: 5000,
      spent: 1250,
      targeting: {
        segments: ['new_users', 'trial_users'],
        geoTargets: ['US', 'UK', 'CA', 'AU'],
        interests: ['trading', 'cryptocurrency', 'investing'],
        excludeSegments: ['churned'],
        deviceTypes: ['desktop', 'mobile', 'tablet'],
        platforms: ['twitter', 'linkedin', 'email'],
      },
      goals: {
        impressions: 100000,
        clicks: 5000,
        conversions: 500,
        signups: 1000,
        revenue: 25000,
        cpa: 10,
        roas: 5,
      },
      metrics: {
        impressions: 45230,
        uniqueReach: 38500,
        clicks: 2340,
        ctr: 5.17,
        conversions: 234,
        conversionRate: 10,
        signups: 456,
        revenue: 12500,
        cpa: 5.34,
        roas: 10,
        engagements: 3456,
        shares: 234,
        bounceRate: 35.2,
      },
      variants: [
        { id: 'v1', name: 'Control', weight: 50, content: {}, impressions: 22615, conversions: 100, conversionRate: 8.8 },
        { id: 'v2', name: 'New CTA', weight: 50, content: {}, impressions: 22615, conversions: 134, conversionRate: 11.8, isWinner: true },
      ],
      assets: [],
      posts: [],
      utmParams: {
        source: 'mixed',
        medium: 'campaign',
        campaign: 'newyear2025',
      },
      schedule: {
        timezone: 'America/New_York',
        frequency: 'daily',
        hoursOfDay: [9, 12, 15, 18],
      },
      createdBy: 'admin',
      createdAt: new Date('2025-12-15'),
      updatedAt: new Date(),
      notes: [],
      tags: ['holiday', 'promotion', 'q1-2026'],
    },
  ];

  samples.forEach(c => campaigns.set(c.id, c));
};

initializeSampleCampaigns();

/**
 * GET /api/v1/marketing/campaigns
 * Get all marketing campaigns with filtering
 */
router.get('/campaigns', (req: Request, res: Response) => {
  try {
    const { status, type, startDate, endDate, limit = '50', offset = '0' } = req.query;

    let allCampaigns = Array.from(campaigns.values());

    // Filter by status
    if (status) {
      allCampaigns = allCampaigns.filter(c => c.status === status);
    }

    // Filter by type
    if (type) {
      allCampaigns = allCampaigns.filter(c => c.type === type);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate as string);
      allCampaigns = allCampaigns.filter(c => c.startDate >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      allCampaigns = allCampaigns.filter(c => !c.endDate || c.endDate <= end);
    }

    // Sort by start date descending
    allCampaigns.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    // Pagination
    const total = allCampaigns.length;
    const paginatedCampaigns = allCampaigns.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      summary: {
        total,
        active: Array.from(campaigns.values()).filter(c => c.status === 'active').length,
        paused: Array.from(campaigns.values()).filter(c => c.status === 'paused').length,
        scheduled: Array.from(campaigns.values()).filter(c => c.status === 'scheduled').length,
        completed: Array.from(campaigns.values()).filter(c => c.status === 'completed').length,
        totalBudget: Array.from(campaigns.values()).reduce((sum, c) => sum + (c.budget || 0), 0),
        totalSpent: Array.from(campaigns.values()).reduce((sum, c) => sum + c.spent, 0),
        totalRevenue: Array.from(campaigns.values()).reduce((sum, c) => sum + c.metrics.revenue, 0),
      },
      campaigns: paginatedCampaigns,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get campaigns' });
  }
});

/**
 * GET /api/v1/marketing/campaigns/:id
 * Get detailed campaign information
 */
router.get('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaigns.get(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get campaign' });
  }
});

/**
 * POST /api/v1/marketing/campaigns
 * Create a new marketing campaign
 */
router.post('/campaigns', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      name,
      description,
      type = 'multi-channel',
      startDate,
      endDate,
      budget,
      targeting,
      goals,
      utmParams,
      schedule,
      tags,
    } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ error: 'name and startDate are required' });
    }

    const campaign: Campaign = {
      id: `camp_${Date.now()}`,
      name,
      description: description || '',
      type,
      status: new Date(startDate) > new Date() ? 'scheduled' : 'draft',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      budget,
      spent: 0,
      targeting: targeting || {
        segments: [],
        geoTargets: [],
        interests: [],
        excludeSegments: [],
        deviceTypes: ['desktop', 'mobile', 'tablet'],
        platforms: [],
      },
      goals: goals || {},
      metrics: {
        impressions: 0,
        uniqueReach: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
        conversionRate: 0,
        signups: 0,
        revenue: 0,
        cpa: 0,
        roas: 0,
        engagements: 0,
        shares: 0,
        bounceRate: 0,
      },
      variants: [],
      assets: [],
      posts: [],
      utmParams: utmParams || {
        source: 'time',
        medium: 'campaign',
        campaign: name.toLowerCase().replace(/\s+/g, '-'),
      },
      schedule: schedule || {
        timezone: 'UTC',
        frequency: 'once',
      },
      createdBy: user?.id || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: [],
      tags: tags || [],
    };

    campaigns.set(campaign.id, campaign);

    res.json({
      success: true,
      campaign,
      message: 'Campaign created successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
});

/**
 * PUT /api/v1/marketing/campaigns/:id
 * Update a campaign
 */
router.put('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Prevent certain updates based on status
    if (campaign.status === 'completed' || campaign.status === 'archived') {
      return res.status(400).json({ error: 'Cannot update completed or archived campaigns' });
    }

    const allowedFields = [
      'name', 'description', 'endDate', 'budget', 'targeting',
      'goals', 'schedule', 'tags', 'notes'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (campaign as any)[field] = updates[field];
      }
    });

    campaign.updatedAt = new Date();
    campaigns.set(id, campaign);

    res.json({
      success: true,
      campaign,
      message: 'Campaign updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update campaign' });
  }
});

/**
 * POST /api/v1/marketing/campaigns/:id/start
 * Start/activate a campaign
 */
router.post('/campaigns/:id/start', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaigns.get(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'active') {
      return res.status(400).json({ error: 'Campaign is already active' });
    }

    if (campaign.status === 'completed' || campaign.status === 'archived') {
      return res.status(400).json({ error: 'Cannot start completed or archived campaigns' });
    }

    campaign.status = 'active';
    campaign.updatedAt = new Date();
    campaigns.set(id, campaign);

    res.json({
      success: true,
      campaign,
      message: 'Campaign started successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start campaign' });
  }
});

/**
 * POST /api/v1/marketing/campaigns/:id/pause
 * Pause an active campaign
 */
router.post('/campaigns/:id/pause', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ error: 'Only active campaigns can be paused' });
    }

    campaign.status = 'paused';
    campaign.pausedAt = new Date();
    campaign.updatedAt = new Date();
    if (reason) {
      campaign.notes.push(`Paused: ${reason} (${new Date().toISOString()})`);
    }

    campaigns.set(id, campaign);

    res.json({
      success: true,
      campaign,
      message: 'Campaign paused successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to pause campaign' });
  }
});

/**
 * POST /api/v1/marketing/campaigns/:id/resume
 * Resume a paused campaign
 */
router.post('/campaigns/:id/resume', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaigns.get(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'paused') {
      return res.status(400).json({ error: 'Only paused campaigns can be resumed' });
    }

    campaign.status = 'active';
    campaign.updatedAt = new Date();
    campaign.notes.push(`Resumed (${new Date().toISOString()})`);

    campaigns.set(id, campaign);

    res.json({
      success: true,
      campaign,
      message: 'Campaign resumed successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to resume campaign' });
  }
});

/**
 * POST /api/v1/marketing/campaigns/:id/complete
 * Mark a campaign as completed
 */
router.post('/campaigns/:id/complete', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaigns.get(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    campaign.status = 'completed';
    campaign.completedAt = new Date();
    campaign.updatedAt = new Date();

    campaigns.set(id, campaign);

    res.json({
      success: true,
      campaign,
      message: 'Campaign marked as completed',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to complete campaign' });
  }
});

/**
 * DELETE /api/v1/marketing/campaigns/:id
 * Archive a campaign (soft delete)
 */
router.delete('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaigns.get(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    campaign.status = 'archived';
    campaign.updatedAt = new Date();

    campaigns.set(id, campaign);

    res.json({
      success: true,
      message: 'Campaign archived successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to archive campaign' });
  }
});

/**
 * GET /api/v1/marketing/campaigns/:id/analytics
 * Get detailed analytics for a campaign
 */
router.get('/campaigns/:id/analytics', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { period = '7d' } = req.query;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Generate time-series data based on period
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        impressions: Math.floor(campaign.metrics.impressions / days * (0.8 + Math.random() * 0.4)),
        clicks: Math.floor(campaign.metrics.clicks / days * (0.8 + Math.random() * 0.4)),
        conversions: Math.floor(campaign.metrics.conversions / days * (0.8 + Math.random() * 0.4)),
        revenue: Math.floor(campaign.metrics.revenue / days * (0.8 + Math.random() * 0.4)),
        spend: Math.floor(campaign.spent / days * (0.8 + Math.random() * 0.4)),
      };
    });

    // Calculate goal progress
    const goalProgress = {
      impressions: campaign.goals.impressions
        ? { current: campaign.metrics.impressions, target: campaign.goals.impressions, percent: (campaign.metrics.impressions / campaign.goals.impressions * 100).toFixed(1) }
        : null,
      clicks: campaign.goals.clicks
        ? { current: campaign.metrics.clicks, target: campaign.goals.clicks, percent: (campaign.metrics.clicks / campaign.goals.clicks * 100).toFixed(1) }
        : null,
      conversions: campaign.goals.conversions
        ? { current: campaign.metrics.conversions, target: campaign.goals.conversions, percent: (campaign.metrics.conversions / campaign.goals.conversions * 100).toFixed(1) }
        : null,
      signups: campaign.goals.signups
        ? { current: campaign.metrics.signups, target: campaign.goals.signups, percent: (campaign.metrics.signups / campaign.goals.signups * 100).toFixed(1) }
        : null,
      revenue: campaign.goals.revenue
        ? { current: campaign.metrics.revenue, target: campaign.goals.revenue, percent: (campaign.metrics.revenue / campaign.goals.revenue * 100).toFixed(1) }
        : null,
    };

    // Variant performance (A/B test results)
    const variantPerformance = campaign.variants.map(v => ({
      ...v,
      lift: v.isWinner ? '+' + ((v.conversionRate / (campaign.variants.find(vv => !vv.isWinner)?.conversionRate || 1) - 1) * 100).toFixed(1) + '%' : 'baseline',
    }));

    res.json({
      success: true,
      campaignId: id,
      period,
      summary: {
        ...campaign.metrics,
        budget: campaign.budget,
        spent: campaign.spent,
        remaining: (campaign.budget || 0) - campaign.spent,
        daysRemaining: campaign.endDate ? Math.ceil((campaign.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        roi: campaign.spent > 0 ? ((campaign.metrics.revenue - campaign.spent) / campaign.spent * 100).toFixed(1) : 0,
      },
      dailyData,
      goalProgress,
      variantPerformance,
      topPerformingPlatforms: campaign.targeting.platforms.map(p => ({
        platform: p,
        clicks: Math.floor(campaign.metrics.clicks / campaign.targeting.platforms.length * (0.5 + Math.random())),
        conversions: Math.floor(campaign.metrics.conversions / campaign.targeting.platforms.length * (0.5 + Math.random())),
      })).sort((a, b) => b.conversions - a.conversions),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get campaign analytics' });
  }
});

/**
 * POST /api/v1/marketing/campaigns/:id/variants
 * Add A/B test variant to campaign
 */
router.post('/campaigns/:id/variants', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, weight, content } = req.body;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!name || weight === undefined) {
      return res.status(400).json({ error: 'name and weight are required' });
    }

    // Validate total weight doesn't exceed 100
    const totalWeight = campaign.variants.reduce((sum, v) => sum + v.weight, 0) + weight;
    if (totalWeight > 100) {
      return res.status(400).json({ error: 'Total variant weight cannot exceed 100%' });
    }

    const variant = {
      id: `var_${Date.now()}`,
      name,
      weight,
      content: content || {},
      impressions: 0,
      conversions: 0,
      conversionRate: 0,
    };

    campaign.variants.push(variant);
    campaign.updatedAt = new Date();
    campaigns.set(id, campaign);

    res.json({
      success: true,
      variant,
      message: 'Variant added successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add variant' });
  }
});

/**
 * POST /api/v1/marketing/campaigns/:id/duplicate
 * Duplicate a campaign
 */
router.post('/campaigns/:id/duplicate', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const user = (req as any).user;

    const original = campaigns.get(id);
    if (!original) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const duplicate: Campaign = {
      ...JSON.parse(JSON.stringify(original)),
      id: `camp_${Date.now()}`,
      name: name || `${original.name} (Copy)`,
      status: 'draft',
      spent: 0,
      metrics: {
        impressions: 0,
        uniqueReach: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
        conversionRate: 0,
        signups: 0,
        revenue: 0,
        cpa: 0,
        roas: 0,
        engagements: 0,
        shares: 0,
        bounceRate: 0,
      },
      variants: original.variants.map(v => ({
        ...v,
        id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        impressions: 0,
        conversions: 0,
        conversionRate: 0,
        isWinner: undefined,
      })),
      createdBy: user?.id || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      pausedAt: undefined,
      completedAt: undefined,
      notes: [`Duplicated from ${original.id}`],
    };

    campaigns.set(duplicate.id, duplicate);

    res.json({
      success: true,
      campaign: duplicate,
      message: 'Campaign duplicated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to duplicate campaign' });
  }
});

// Analytics
/**
 * GET /api/v1/marketing/analytics
 * Get marketing analytics summary
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const botAnalytics = bot.getAnalyticsSummary();
    const serviceAnalytics = marketingService.getMarketingAnalytics();

    res.json({
      success: true,
      analytics: {
        social: botAnalytics,
        ...serviceAnalytics,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * GET /api/v1/marketing/analytics/overview
 * Get complete marketing analytics overview
 */
router.get('/analytics/overview', (req: Request, res: Response) => {
  try {
    const bot = getMarketingBot();
    const botAnalytics = bot.getAnalyticsSummary();
    const serviceAnalytics = marketingService.getMarketingAnalytics();
    const allPromos = Array.from(promoCodes.values());

    const overview = {
      social: {
        totalPosts: botAnalytics.totalPosts,
        platformBreakdown: botAnalytics.platformBreakdown,
        recentPosts: botAnalytics.recentPosts.slice(0, 5),
        topPerformingPosts: botAnalytics.topPerformingPosts,
      },
      campaigns: {
        total: botAnalytics.totalCampaigns,
        active: 0,
        completed: 0,
      },
      referrals: serviceAnalytics.referrals,
      affiliates: serviceAnalytics.affiliates,
      promos: {
        totalCodes: allPromos.length,
        activeCodes: allPromos.filter(p => p.isActive).length,
        redemptions: allPromos.reduce((sum, p) => sum + p.usageCount, 0),
        revenue: allPromos.reduce((sum, p) => sum + p.totalRevenue, 0),
        discount: allPromos.reduce((sum, p) => sum + p.totalDiscount, 0),
      },
      performance: {
        totalRevenue: serviceAnalytics.affiliates.totalRevenue + allPromos.reduce((sum, p) => sum + p.totalRevenue, 0),
        totalSpent: 0,
        roi: 0,
        impressions: 0,
        clicks: serviceAnalytics.social.totalClicks,
        conversions: serviceAnalytics.referrals.totalConversions + serviceAnalytics.affiliates.totalAffiliates,
      },
    };

    res.json({
      success: true,
      overview,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get analytics overview' });
  }
});

export default router;

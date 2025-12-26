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

// ============================================================
// LANDING PAGE BUILDER & TEMPLATES
// ============================================================

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  template: string;

  // Page settings
  settings: {
    title: string;
    description: string;
    ogImage?: string;
    favicon?: string;
    customDomain?: string;
    sslEnabled: boolean;
    passwordProtected: boolean;
    password?: string;
  };

  // Hero section
  hero: {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaLink: string;
    ctaSecondaryText?: string;
    ctaSecondaryLink?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
    style: 'centered' | 'left-aligned' | 'split' | 'fullscreen';
  };

  // Features section
  features: Array<{
    id: string;
    icon: string;
    title: string;
    description: string;
    link?: string;
  }>;

  // Testimonials
  testimonials: Array<{
    id: string;
    name: string;
    role: string;
    company?: string;
    avatar?: string;
    quote: string;
    rating: number;
  }>;

  // Pricing section
  pricing: {
    enabled: boolean;
    headline: string;
    plans: Array<{
      id: string;
      name: string;
      price: number;
      interval: 'month' | 'year';
      features: string[];
      highlighted: boolean;
      ctaText: string;
      ctaLink: string;
    }>;
  };

  // FAQ section
  faq: Array<{
    id: string;
    question: string;
    answer: string;
  }>;

  // Footer
  footer: {
    companyName: string;
    links: Array<{ text: string; url: string }>;
    socialLinks: Array<{ platform: string; url: string }>;
    copyright: string;
  };

  // Lead capture form (integrated)
  leadForm?: {
    enabled: boolean;
    formId: string;
    position: 'hero' | 'popup' | 'footer' | 'inline';
    delay?: number; // ms before popup shows
  };

  // Custom code
  customCSS?: string;
  customJS?: string;
  headCode?: string;
  bodyEndCode?: string;

  // UTM tracking
  utmParams?: {
    source: string;
    medium: string;
    campaign: string;
  };

  // Analytics
  analytics: {
    views: number;
    uniqueVisitors: number;
    bounceRate: number;
    avgTimeOnPage: number;
    conversions: number;
    conversionRate: number;
  };

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const landingPages: Map<string, LandingPage> = new Map();

// Landing page templates
const LANDING_PAGE_TEMPLATES = {
  'product-launch': {
    name: 'Product Launch',
    description: 'Perfect for announcing new features or products',
    thumbnail: '/templates/product-launch.png',
    sections: ['hero', 'features', 'testimonials', 'pricing', 'cta', 'footer'],
  },
  'lead-generation': {
    name: 'Lead Generation',
    description: 'Optimized for capturing leads with prominent forms',
    thumbnail: '/templates/lead-gen.png',
    sections: ['hero', 'benefits', 'form', 'social-proof', 'footer'],
  },
  'coming-soon': {
    name: 'Coming Soon',
    description: 'Build anticipation with a countdown and email capture',
    thumbnail: '/templates/coming-soon.png',
    sections: ['countdown', 'email-capture', 'social'],
  },
  'webinar': {
    name: 'Webinar Registration',
    description: 'Drive registrations for your webinar or event',
    thumbnail: '/templates/webinar.png',
    sections: ['hero', 'speakers', 'agenda', 'registration', 'footer'],
  },
  'free-trial': {
    name: 'Free Trial Signup',
    description: 'Convert visitors into free trial users',
    thumbnail: '/templates/free-trial.png',
    sections: ['hero', 'features', 'comparison', 'signup', 'faq', 'footer'],
  },
  'case-study': {
    name: 'Case Study',
    description: 'Showcase customer success stories',
    thumbnail: '/templates/case-study.png',
    sections: ['hero', 'challenge', 'solution', 'results', 'cta', 'footer'],
  },
};

// Initialize sample landing page
const initializeSampleLandingPages = () => {
  const sample: LandingPage = {
    id: 'lp_1',
    name: 'TIME Trading - Start Free',
    slug: 'start-free',
    status: 'published',
    template: 'free-trial',
    settings: {
      title: 'TIME Trading - AI-Powered Trading Platform | Start Free',
      description: 'Experience the future of trading with TIME. 154+ AI bots, real-time analytics, and automated strategies. Start your free trial today.',
      sslEnabled: true,
      passwordProtected: false,
    },
    hero: {
      headline: 'Trade Smarter, Not Harder',
      subheadline: 'Let our AI bots do the heavy lifting. Start with 3 free bots and upgrade anytime.',
      ctaText: 'Start Free Trial',
      ctaLink: '/signup',
      ctaSecondaryText: 'Watch Demo',
      ctaSecondaryLink: '/demo',
      style: 'centered',
    },
    features: [
      { id: 'f1', icon: 'Bot', title: '154+ AI Trading Bots', description: 'From momentum to mean reversion, find the perfect strategy for any market.' },
      { id: 'f2', icon: 'Shield', title: 'Bank-Level Security', description: 'Your funds and data are protected with enterprise-grade encryption.' },
      { id: 'f3', icon: 'Zap', title: 'Real-Time Execution', description: 'Millisecond execution speeds ensure you never miss an opportunity.' },
      { id: 'f4', icon: 'LineChart', title: 'Advanced Analytics', description: 'Deep insights into your portfolio performance and risk metrics.' },
    ],
    testimonials: [
      { id: 't1', name: 'John D.', role: 'Day Trader', quote: 'TIME has transformed my trading. The AI bots consistently outperform my manual strategies.', rating: 5 },
      { id: 't2', name: 'Sarah M.', role: 'Investor', company: 'Hedge Fund', quote: 'The risk management features alone are worth the subscription. Incredible platform.', rating: 5 },
    ],
    pricing: {
      enabled: true,
      headline: 'Choose Your Plan',
      plans: [
        { id: 'p1', name: 'Free', price: 0, interval: 'month', features: ['3 AI Bots', 'Paper Trading', 'Basic Analytics'], highlighted: false, ctaText: 'Start Free', ctaLink: '/signup?plan=free' },
        { id: 'p2', name: 'Pro', price: 49, interval: 'month', features: ['7 AI Bots', 'Live Trading', 'Advanced Analytics', 'Priority Support'], highlighted: true, ctaText: 'Go Pro', ctaLink: '/signup?plan=pro' },
        { id: 'p3', name: 'Premium', price: 109, interval: 'month', features: ['11 Super Bots', 'All Features', 'API Access', '24/7 Support'], highlighted: false, ctaText: 'Get Premium', ctaLink: '/signup?plan=premium' },
      ],
    },
    faq: [
      { id: 'q1', question: 'Can I cancel anytime?', answer: 'Yes, you can cancel your subscription at any time with no penalties.' },
      { id: 'q2', question: 'Do I need trading experience?', answer: 'No! Our AI bots handle the complex analysis. Just set your risk tolerance and goals.' },
    ],
    footer: {
      companyName: 'TIME Trading',
      links: [
        { text: 'Privacy Policy', url: '/privacy' },
        { text: 'Terms of Service', url: '/terms' },
        { text: 'Support', url: '/support' },
      ],
      socialLinks: [
        { platform: 'twitter', url: 'https://twitter.com/timetrading' },
        { platform: 'linkedin', url: 'https://linkedin.com/company/timetrading' },
      ],
      copyright: '2025 TIME Trading. All rights reserved.',
    },
    analytics: {
      views: 15234,
      uniqueVisitors: 12456,
      bounceRate: 32.5,
      avgTimeOnPage: 185,
      conversions: 1247,
      conversionRate: 10.01,
    },
    createdBy: 'admin',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
    publishedAt: new Date('2025-01-01'),
  };

  landingPages.set(sample.id, sample);
};

initializeSampleLandingPages();

/**
 * GET /api/v1/marketing/landing-pages/templates
 * Get available landing page templates
 */
router.get('/landing-pages/templates', (req: Request, res: Response) => {
  res.json({
    success: true,
    templates: Object.entries(LANDING_PAGE_TEMPLATES).map(([id, template]) => ({
      id,
      ...template,
    })),
  });
});

/**
 * GET /api/v1/marketing/landing-pages
 * Get all landing pages
 */
router.get('/landing-pages', (req: Request, res: Response) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    let pages = Array.from(landingPages.values());

    if (status) {
      pages = pages.filter(p => p.status === status);
    }

    pages.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const total = pages.length;
    const paginatedPages = pages.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      summary: {
        total,
        published: Array.from(landingPages.values()).filter(p => p.status === 'published').length,
        draft: Array.from(landingPages.values()).filter(p => p.status === 'draft').length,
        totalViews: Array.from(landingPages.values()).reduce((sum, p) => sum + p.analytics.views, 0),
        totalConversions: Array.from(landingPages.values()).reduce((sum, p) => sum + p.analytics.conversions, 0),
      },
      landingPages: paginatedPages,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get landing pages' });
  }
});

/**
 * GET /api/v1/marketing/landing-pages/:id
 * Get a specific landing page
 */
router.get('/landing-pages/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = landingPages.get(id);

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    res.json({ success: true, landingPage: page });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get landing page' });
  }
});

/**
 * POST /api/v1/marketing/landing-pages
 * Create a new landing page
 */
router.post('/landing-pages', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, slug, template, settings, hero, features, testimonials, pricing, faq, footer, leadForm, utmParams } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required' });
    }

    // Check for duplicate slug
    const existingSlug = Array.from(landingPages.values()).find(p => p.slug === slug);
    if (existingSlug) {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    const page: LandingPage = {
      id: `lp_${Date.now()}`,
      name,
      slug,
      status: 'draft',
      template: template || 'product-launch',
      settings: settings || {
        title: name,
        description: '',
        sslEnabled: true,
        passwordProtected: false,
      },
      hero: hero || {
        headline: 'Your Headline Here',
        subheadline: 'Your subheadline here',
        ctaText: 'Get Started',
        ctaLink: '/signup',
        style: 'centered',
      },
      features: features || [],
      testimonials: testimonials || [],
      pricing: pricing || { enabled: false, headline: 'Pricing', plans: [] },
      faq: faq || [],
      footer: footer || {
        companyName: 'TIME Trading',
        links: [],
        socialLinks: [],
        copyright: '2025 TIME Trading. All rights reserved.',
      },
      leadForm,
      utmParams,
      analytics: {
        views: 0,
        uniqueVisitors: 0,
        bounceRate: 0,
        avgTimeOnPage: 0,
        conversions: 0,
        conversionRate: 0,
      },
      createdBy: user?.id || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    landingPages.set(page.id, page);

    res.json({
      success: true,
      landingPage: page,
      message: 'Landing page created successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create landing page' });
  }
});

/**
 * PUT /api/v1/marketing/landing-pages/:id
 * Update a landing page
 */
router.put('/landing-pages/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const page = landingPages.get(id);
    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    // Check for duplicate slug if slug is being updated
    if (updates.slug && updates.slug !== page.slug) {
      const existingSlug = Array.from(landingPages.values()).find(p => p.slug === updates.slug && p.id !== id);
      if (existingSlug) {
        return res.status(400).json({ error: 'Slug already exists' });
      }
    }

    const allowedFields = ['name', 'slug', 'settings', 'hero', 'features', 'testimonials', 'pricing', 'faq', 'footer', 'leadForm', 'customCSS', 'customJS', 'headCode', 'bodyEndCode', 'utmParams'];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (page as any)[field] = updates[field];
      }
    });

    page.updatedAt = new Date();
    landingPages.set(id, page);

    res.json({
      success: true,
      landingPage: page,
      message: 'Landing page updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update landing page' });
  }
});

/**
 * POST /api/v1/marketing/landing-pages/:id/publish
 * Publish a landing page
 */
router.post('/landing-pages/:id/publish', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = landingPages.get(id);

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    page.status = 'published';
    page.publishedAt = new Date();
    page.updatedAt = new Date();
    landingPages.set(id, page);

    res.json({
      success: true,
      landingPage: page,
      message: 'Landing page published successfully',
      url: `https://time-trading.app/l/${page.slug}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to publish landing page' });
  }
});

/**
 * POST /api/v1/marketing/landing-pages/:id/unpublish
 * Unpublish a landing page
 */
router.post('/landing-pages/:id/unpublish', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = landingPages.get(id);

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    page.status = 'draft';
    page.updatedAt = new Date();
    landingPages.set(id, page);

    res.json({
      success: true,
      landingPage: page,
      message: 'Landing page unpublished',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to unpublish landing page' });
  }
});

/**
 * DELETE /api/v1/marketing/landing-pages/:id
 * Archive a landing page
 */
router.delete('/landing-pages/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = landingPages.get(id);

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    page.status = 'archived';
    page.updatedAt = new Date();
    landingPages.set(id, page);

    res.json({
      success: true,
      message: 'Landing page archived successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to archive landing page' });
  }
});

/**
 * POST /api/v1/marketing/landing-pages/:id/duplicate
 * Duplicate a landing page
 */
router.post('/landing-pages/:id/duplicate', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;
    const user = (req as any).user;

    const original = landingPages.get(id);
    if (!original) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    const newSlug = slug || `${original.slug}-copy`;

    // Check for duplicate slug
    const existingSlug = Array.from(landingPages.values()).find(p => p.slug === newSlug);
    if (existingSlug) {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    const duplicate: LandingPage = {
      ...JSON.parse(JSON.stringify(original)),
      id: `lp_${Date.now()}`,
      name: name || `${original.name} (Copy)`,
      slug: newSlug,
      status: 'draft',
      analytics: {
        views: 0,
        uniqueVisitors: 0,
        bounceRate: 0,
        avgTimeOnPage: 0,
        conversions: 0,
        conversionRate: 0,
      },
      createdBy: user?.id || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: undefined,
    };

    landingPages.set(duplicate.id, duplicate);

    res.json({
      success: true,
      landingPage: duplicate,
      message: 'Landing page duplicated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to duplicate landing page' });
  }
});

/**
 * GET /api/v1/marketing/landing-pages/:id/analytics
 * Get analytics for a landing page
 */
router.get('/landing-pages/:id/analytics', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { period = '7d' } = req.query;

    const page = landingPages.get(id);
    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        views: Math.floor(page.analytics.views / days * (0.7 + Math.random() * 0.6)),
        uniqueVisitors: Math.floor(page.analytics.uniqueVisitors / days * (0.7 + Math.random() * 0.6)),
        conversions: Math.floor(page.analytics.conversions / days * (0.7 + Math.random() * 0.6)),
        bounceRate: page.analytics.bounceRate * (0.9 + Math.random() * 0.2),
      };
    });

    res.json({
      success: true,
      pageId: id,
      period,
      summary: page.analytics,
      dailyData,
      topSources: [
        { source: 'Google', visits: Math.floor(page.analytics.views * 0.35), conversions: Math.floor(page.analytics.conversions * 0.4) },
        { source: 'Direct', visits: Math.floor(page.analytics.views * 0.25), conversions: Math.floor(page.analytics.conversions * 0.25) },
        { source: 'Twitter', visits: Math.floor(page.analytics.views * 0.15), conversions: Math.floor(page.analytics.conversions * 0.15) },
        { source: 'LinkedIn', visits: Math.floor(page.analytics.views * 0.12), conversions: Math.floor(page.analytics.conversions * 0.12) },
        { source: 'Email', visits: Math.floor(page.analytics.views * 0.13), conversions: Math.floor(page.analytics.conversions * 0.08) },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get landing page analytics' });
  }
});

// ============================================================
// UTM PARAMETER TRACKING
// ============================================================

interface UTMTrack {
  id: string;
  visitorId: string;
  sessionId: string;

  // UTM parameters
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term?: string;
  utm_content?: string;

  // Additional tracking
  landingPage: string;
  referrer?: string;
  ipAddress?: string;
  userAgent?: string;
  device: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  country?: string;
  city?: string;

  // Journey
  pageViews: Array<{
    url: string;
    timestamp: Date;
    duration: number;
  }>;

  // Conversion
  converted: boolean;
  convertedAt?: Date;
  conversionType?: 'signup' | 'subscription' | 'lead' | 'purchase';
  conversionValue?: number;

  // Timestamps
  firstSeen: Date;
  lastSeen: Date;
}

const utmTracks: Map<string, UTMTrack> = new Map();

/**
 * POST /api/v1/marketing/utm/track
 * Track a UTM visit (public endpoint)
 */
router.post('/utm/track', (req: Request, res: Response) => {
  try {
    const {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      landingPage,
      referrer,
      visitorId,
      sessionId,
    } = req.body;

    if (!utm_source || !utm_campaign) {
      return res.status(400).json({ error: 'utm_source and utm_campaign are required' });
    }

    const userAgent = req.get('user-agent') || '';
    const device = /mobile/i.test(userAgent) ? 'mobile' : /tablet/i.test(userAgent) ? 'tablet' : 'desktop';
    const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Other';
    const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : userAgent.includes('Linux') ? 'Linux' : userAgent.includes('Android') ? 'Android' : userAgent.includes('iOS') ? 'iOS' : 'Other';

    const track: UTMTrack = {
      id: `utm_${Date.now()}`,
      visitorId: visitorId || `v_${Date.now()}`,
      sessionId: sessionId || `s_${Date.now()}`,
      utm_source,
      utm_medium: utm_medium || 'referral',
      utm_campaign,
      utm_term,
      utm_content,
      landingPage: landingPage || '/',
      referrer,
      ipAddress: req.ip,
      userAgent,
      device,
      browser,
      os,
      pageViews: [{
        url: landingPage || '/',
        timestamp: new Date(),
        duration: 0,
      }],
      converted: false,
      firstSeen: new Date(),
      lastSeen: new Date(),
    };

    utmTracks.set(track.id, track);

    res.json({
      success: true,
      trackId: track.id,
      visitorId: track.visitorId,
      sessionId: track.sessionId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to track UTM' });
  }
});

/**
 * POST /api/v1/marketing/utm/:trackId/pageview
 * Track a page view within a UTM session
 */
router.post('/utm/:trackId/pageview', (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const { url, duration } = req.body;

    const track = utmTracks.get(trackId);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Update duration of previous page
    if (track.pageViews.length > 0) {
      track.pageViews[track.pageViews.length - 1].duration = duration || 0;
    }

    track.pageViews.push({
      url,
      timestamp: new Date(),
      duration: 0,
    });
    track.lastSeen = new Date();

    utmTracks.set(trackId, track);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to track pageview' });
  }
});

/**
 * POST /api/v1/marketing/utm/:trackId/convert
 * Mark a UTM track as converted
 */
router.post('/utm/:trackId/convert', (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const { type, value } = req.body;

    const track = utmTracks.get(trackId);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    track.converted = true;
    track.convertedAt = new Date();
    track.conversionType = type || 'signup';
    track.conversionValue = value;
    track.lastSeen = new Date();

    utmTracks.set(trackId, track);

    res.json({
      success: true,
      message: 'Conversion recorded',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record conversion' });
  }
});

/**
 * GET /api/v1/marketing/utm/analytics
 * Get UTM analytics
 */
router.get('/utm/analytics', (req: Request, res: Response) => {
  try {
    const { period = '7d', source, medium, campaign } = req.query;

    let tracks = Array.from(utmTracks.values());

    // Filter by period
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    tracks = tracks.filter(t => t.firstSeen >= cutoff);

    // Filter by UTM params
    if (source) tracks = tracks.filter(t => t.utm_source === source);
    if (medium) tracks = tracks.filter(t => t.utm_medium === medium);
    if (campaign) tracks = tracks.filter(t => t.utm_campaign === campaign);

    // Aggregate by source
    const bySource: Record<string, { visits: number; conversions: number; revenue: number }> = {};
    tracks.forEach(t => {
      if (!bySource[t.utm_source]) {
        bySource[t.utm_source] = { visits: 0, conversions: 0, revenue: 0 };
      }
      bySource[t.utm_source].visits++;
      if (t.converted) {
        bySource[t.utm_source].conversions++;
        bySource[t.utm_source].revenue += t.conversionValue || 0;
      }
    });

    // Aggregate by campaign
    const byCampaign: Record<string, { visits: number; conversions: number; revenue: number }> = {};
    tracks.forEach(t => {
      if (!byCampaign[t.utm_campaign]) {
        byCampaign[t.utm_campaign] = { visits: 0, conversions: 0, revenue: 0 };
      }
      byCampaign[t.utm_campaign].visits++;
      if (t.converted) {
        byCampaign[t.utm_campaign].conversions++;
        byCampaign[t.utm_campaign].revenue += t.conversionValue || 0;
      }
    });

    res.json({
      success: true,
      period,
      summary: {
        totalVisits: tracks.length,
        uniqueVisitors: new Set(tracks.map(t => t.visitorId)).size,
        conversions: tracks.filter(t => t.converted).length,
        conversionRate: tracks.length > 0 ? (tracks.filter(t => t.converted).length / tracks.length * 100).toFixed(2) : 0,
        totalRevenue: tracks.reduce((sum, t) => sum + (t.conversionValue || 0), 0),
      },
      bySource: Object.entries(bySource).map(([source, data]) => ({
        source,
        ...data,
        conversionRate: data.visits > 0 ? (data.conversions / data.visits * 100).toFixed(2) : 0,
      })).sort((a, b) => b.visits - a.visits),
      byCampaign: Object.entries(byCampaign).map(([campaign, data]) => ({
        campaign,
        ...data,
        conversionRate: data.visits > 0 ? (data.conversions / data.visits * 100).toFixed(2) : 0,
      })).sort((a, b) => b.visits - a.visits),
      byDevice: {
        desktop: tracks.filter(t => t.device === 'desktop').length,
        mobile: tracks.filter(t => t.device === 'mobile').length,
        tablet: tracks.filter(t => t.device === 'tablet').length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get UTM analytics' });
  }
});

/**
 * POST /api/v1/marketing/utm/generate
 * Generate UTM URLs
 */
router.post('/utm/generate', (req: Request, res: Response) => {
  try {
    const { baseUrl, source, medium, campaign, term, content } = req.body;

    if (!baseUrl || !source || !campaign) {
      return res.status(400).json({ error: 'baseUrl, source, and campaign are required' });
    }

    const url = new URL(baseUrl);
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', medium || 'referral');
    url.searchParams.set('utm_campaign', campaign);
    if (term) url.searchParams.set('utm_term', term);
    if (content) url.searchParams.set('utm_content', content);

    res.json({
      success: true,
      url: url.toString(),
      shortUrl: `https://time-trading.app/u/${Buffer.from(url.toString()).toString('base64').substring(0, 8)}`,
      params: {
        utm_source: source,
        utm_medium: medium || 'referral',
        utm_campaign: campaign,
        utm_term: term,
        utm_content: content,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate UTM URL' });
  }
});

// ============================================================
// LEAD CAPTURE FORMS
// ============================================================

interface LeadForm {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'archived';

  // Form configuration
  fields: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea' | 'hidden';
    placeholder?: string;
    required: boolean;
    validation?: string;
    options?: string[]; // For select fields
    defaultValue?: string;
  }>;

  // Appearance
  style: {
    layout: 'vertical' | 'horizontal' | 'inline';
    theme: 'light' | 'dark' | 'custom';
    buttonText: string;
    buttonColor: string;
    backgroundColor: string;
    borderRadius: number;
    width: 'full' | 'compact';
  };

  // Behavior
  settings: {
    doubleOptIn: boolean;
    honeypot: boolean; // Spam protection
    captcha: boolean;
    redirectUrl?: string;
    successMessage: string;
    autoResponder: boolean;
    autoResponderTemplateId?: string;
    notifyEmail?: string;
    tags: string[]; // Auto-tag leads
    webhookUrl?: string;
  };

  // Integration
  integrations: {
    mailchimp?: { listId: string; enabled: boolean };
    hubspot?: { formId: string; enabled: boolean };
    salesforce?: { objectId: string; enabled: boolean };
    slack?: { channel: string; enabled: boolean };
  };

  // Analytics
  analytics: {
    views: number;
    submissions: number;
    conversionRate: number;
    avgCompletionTime: number;
  };

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Lead {
  id: string;
  formId: string;

  // Lead data
  data: Record<string, any>;
  email: string;

  // Source tracking
  source: {
    landingPageId?: string;
    campaignId?: string;
    utmTrackId?: string;
    referrer?: string;
    ipAddress?: string;
    userAgent?: string;
  };

  // Status
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'unsubscribed';
  score: number; // Lead scoring
  tags: string[];

  // Engagement
  emailsReceived: number;
  emailsOpened: number;
  emailsClicked: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  convertedAt?: Date;
}

const leadForms: Map<string, LeadForm> = new Map();
const leads: Map<string, Lead> = new Map();

// Initialize sample form
const initializeSampleLeadForms = () => {
  const sample: LeadForm = {
    id: 'form_1',
    name: 'Newsletter Signup',
    status: 'active',
    fields: [
      { id: 'f1', name: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter your email', required: true },
      { id: 'f2', name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Your first name', required: false },
      { id: 'f3', name: 'tradingExperience', label: 'Trading Experience', type: 'select', required: false, options: ['Beginner', 'Intermediate', 'Advanced', 'Professional'] },
    ],
    style: {
      layout: 'horizontal',
      theme: 'dark',
      buttonText: 'Subscribe',
      buttonColor: '#7c3aed',
      backgroundColor: '#1e293b',
      borderRadius: 8,
      width: 'full',
    },
    settings: {
      doubleOptIn: false,
      honeypot: true,
      captcha: false,
      successMessage: 'Thanks for subscribing! Check your email for a welcome message.',
      autoResponder: true,
      autoResponderTemplateId: 'welcome_email',
      tags: ['newsletter'],
    },
    integrations: {},
    analytics: {
      views: 5423,
      submissions: 876,
      conversionRate: 16.15,
      avgCompletionTime: 12,
    },
    createdBy: 'admin',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
  };

  leadForms.set(sample.id, sample);
};

initializeSampleLeadForms();

/**
 * GET /api/v1/marketing/forms
 * Get all lead capture forms
 */
router.get('/forms', (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let forms = Array.from(leadForms.values());

    if (status) {
      forms = forms.filter(f => f.status === status);
    }

    res.json({
      success: true,
      summary: {
        total: forms.length,
        active: Array.from(leadForms.values()).filter(f => f.status === 'active').length,
        totalSubmissions: Array.from(leadForms.values()).reduce((sum, f) => sum + f.analytics.submissions, 0),
        avgConversionRate: (Array.from(leadForms.values()).reduce((sum, f) => sum + f.analytics.conversionRate, 0) / forms.length || 0).toFixed(2),
      },
      forms,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get forms' });
  }
});

/**
 * GET /api/v1/marketing/forms/:id
 * Get a specific form
 */
router.get('/forms/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const form = leadForms.get(id);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ success: true, form });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get form' });
  }
});

/**
 * POST /api/v1/marketing/forms
 * Create a new lead capture form
 */
router.post('/forms', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, fields, style, settings, integrations } = req.body;

    if (!name || !fields || fields.length === 0) {
      return res.status(400).json({ error: 'name and at least one field are required' });
    }

    const form: LeadForm = {
      id: `form_${Date.now()}`,
      name,
      status: 'active',
      fields: fields.map((f: any, index: number) => ({
        id: `f${index + 1}`,
        ...f,
        required: f.required || false,
      })),
      style: style || {
        layout: 'vertical',
        theme: 'dark',
        buttonText: 'Submit',
        buttonColor: '#7c3aed',
        backgroundColor: '#1e293b',
        borderRadius: 8,
        width: 'full',
      },
      settings: settings || {
        doubleOptIn: false,
        honeypot: true,
        captcha: false,
        successMessage: 'Thank you for your submission!',
        autoResponder: false,
        tags: [],
      },
      integrations: integrations || {},
      analytics: {
        views: 0,
        submissions: 0,
        conversionRate: 0,
        avgCompletionTime: 0,
      },
      createdBy: user?.id || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    leadForms.set(form.id, form);

    res.json({
      success: true,
      form,
      message: 'Form created successfully',
      embedCode: `<div data-time-form="${form.id}"></div><script src="https://time-trading.app/forms.js"></script>`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create form' });
  }
});

/**
 * PUT /api/v1/marketing/forms/:id
 * Update a form
 */
router.put('/forms/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const form = leadForms.get(id);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const allowedFields = ['name', 'status', 'fields', 'style', 'settings', 'integrations'];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (form as any)[field] = updates[field];
      }
    });

    form.updatedAt = new Date();
    leadForms.set(id, form);

    res.json({
      success: true,
      form,
      message: 'Form updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update form' });
  }
});

/**
 * DELETE /api/v1/marketing/forms/:id
 * Archive a form
 */
router.delete('/forms/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const form = leadForms.get(id);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    form.status = 'archived';
    form.updatedAt = new Date();
    leadForms.set(id, form);

    res.json({
      success: true,
      message: 'Form archived successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to archive form' });
  }
});

/**
 * POST /api/v1/marketing/forms/:id/submit
 * Submit a lead capture form (public endpoint)
 */
router.post('/forms/:id/submit', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, source } = req.body;

    const form = leadForms.get(id);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.status !== 'active') {
      return res.status(400).json({ error: 'Form is not active' });
    }

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !data[field.name]) {
        return res.status(400).json({ error: `${field.label} is required` });
      }
    }

    // Check honeypot (if enabled)
    if (form.settings.honeypot && data._hp_) {
      // Silently reject spam
      return res.json({
        success: true,
        message: form.settings.successMessage,
      });
    }

    // Find email field
    const emailField = form.fields.find(f => f.type === 'email');
    const email = emailField ? data[emailField.name] : data.email;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const lead: Lead = {
      id: `lead_${Date.now()}`,
      formId: id,
      data,
      email,
      source: {
        ...source,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      status: 'new',
      score: 10,
      tags: [...(form.settings.tags || [])],
      emailsReceived: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    leads.set(lead.id, lead);

    // Update form analytics
    form.analytics.submissions++;
    form.analytics.conversionRate = form.analytics.views > 0
      ? (form.analytics.submissions / form.analytics.views * 100)
      : 0;
    leadForms.set(id, form);

    // TODO: Send auto-responder email
    // TODO: Trigger webhook
    // TODO: Sync with integrations

    res.json({
      success: true,
      message: form.settings.successMessage,
      leadId: lead.id,
      redirectUrl: form.settings.redirectUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit form' });
  }
});

/**
 * GET /api/v1/marketing/leads
 * Get all leads
 */
router.get('/leads', (req: Request, res: Response) => {
  try {
    const { formId, status, tag, email, limit = '50', offset = '0' } = req.query;

    let allLeads = Array.from(leads.values());

    if (formId) allLeads = allLeads.filter(l => l.formId === formId);
    if (status) allLeads = allLeads.filter(l => l.status === status);
    if (tag) allLeads = allLeads.filter(l => l.tags.includes(tag as string));
    if (email) allLeads = allLeads.filter(l => l.email.includes(email as string));

    allLeads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = allLeads.length;
    const paginatedLeads = allLeads.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      summary: {
        total,
        new: Array.from(leads.values()).filter(l => l.status === 'new').length,
        qualified: Array.from(leads.values()).filter(l => l.status === 'qualified').length,
        converted: Array.from(leads.values()).filter(l => l.status === 'converted').length,
      },
      leads: paginatedLeads,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get leads' });
  }
});

/**
 * GET /api/v1/marketing/leads/:id
 * Get a specific lead
 */
router.get('/leads/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = leads.get(id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, lead });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get lead' });
  }
});

/**
 * PUT /api/v1/marketing/leads/:id
 * Update a lead
 */
router.put('/leads/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, score, tags } = req.body;

    const lead = leads.get(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (status) lead.status = status;
    if (score !== undefined) lead.score = score;
    if (tags) lead.tags = tags;

    if (status === 'converted') {
      lead.convertedAt = new Date();
    }

    lead.updatedAt = new Date();
    leads.set(id, lead);

    res.json({
      success: true,
      lead,
      message: 'Lead updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update lead' });
  }
});

/**
 * DELETE /api/v1/marketing/leads/:id
 * Delete a lead
 */
router.delete('/leads/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!leads.has(id)) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    leads.delete(id);

    res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete lead' });
  }
});

/**
 * POST /api/v1/marketing/leads/export
 * Export leads as CSV
 */
router.post('/leads/export', (req: Request, res: Response) => {
  try {
    const { formId, status, startDate, endDate } = req.body;

    let allLeads = Array.from(leads.values());

    if (formId) allLeads = allLeads.filter(l => l.formId === formId);
    if (status) allLeads = allLeads.filter(l => l.status === status);
    if (startDate) allLeads = allLeads.filter(l => l.createdAt >= new Date(startDate));
    if (endDate) allLeads = allLeads.filter(l => l.createdAt <= new Date(endDate));

    // Generate CSV
    const headers = ['id', 'email', 'status', 'score', 'tags', 'created_at'];
    const rows = allLeads.map(l => [
      l.id,
      l.email,
      l.status,
      l.score,
      l.tags.join('; '),
      l.createdAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to export leads' });
  }
});

// ============================================================
// CONVERSION FUNNEL ANALYTICS
// ============================================================

interface FunnelStage {
  id: string;
  name: string;
  order: number;
  type: 'page_view' | 'action' | 'event' | 'conversion';
  criteria: {
    url?: string;
    event?: string;
    action?: string;
  };
}

interface Funnel {
  id: string;
  name: string;
  description: string;
  stages: FunnelStage[];

  // Metrics
  metrics: {
    totalEntered: number;
    totalCompleted: number;
    overallConversionRate: number;
    avgTimeToComplete: number;
    stageMetrics: Array<{
      stageId: string;
      entered: number;
      exited: number;
      dropoffRate: number;
      avgTime: number;
    }>;
  };

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FunnelSession {
  id: string;
  funnelId: string;
  visitorId: string;
  currentStage: number;
  stageHistory: Array<{
    stageId: string;
    enteredAt: Date;
    exitedAt?: Date;
    completed: boolean;
  }>;
  completed: boolean;
  completedAt?: Date;
  startedAt: Date;
  lastActivityAt: Date;
}

const funnels: Map<string, Funnel> = new Map();
const funnelSessions: Map<string, FunnelSession> = new Map();

// Initialize sample funnel
const initializeSampleFunnels = () => {
  const sample: Funnel = {
    id: 'funnel_1',
    name: 'Signup to Paid Conversion',
    description: 'Track user journey from landing page to paid subscription',
    stages: [
      { id: 's1', name: 'Landing Page', order: 1, type: 'page_view', criteria: { url: '/start-free' } },
      { id: 's2', name: 'Signup Form', order: 2, type: 'action', criteria: { action: 'view_signup_form' } },
      { id: 's3', name: 'Account Created', order: 3, type: 'event', criteria: { event: 'signup_complete' } },
      { id: 's4', name: 'First Bot Deployed', order: 4, type: 'event', criteria: { event: 'bot_deployed' } },
      { id: 's5', name: 'Upgrade Started', order: 5, type: 'action', criteria: { action: 'view_pricing' } },
      { id: 's6', name: 'Payment Complete', order: 6, type: 'conversion', criteria: { event: 'payment_success' } },
    ],
    metrics: {
      totalEntered: 10000,
      totalCompleted: 350,
      overallConversionRate: 3.5,
      avgTimeToComplete: 259200, // 3 days in seconds
      stageMetrics: [
        { stageId: 's1', entered: 10000, exited: 3000, dropoffRate: 30, avgTime: 45 },
        { stageId: 's2', entered: 7000, exited: 2100, dropoffRate: 30, avgTime: 120 },
        { stageId: 's3', entered: 4900, exited: 1470, dropoffRate: 30, avgTime: 300 },
        { stageId: 's4', entered: 3430, exited: 1715, dropoffRate: 50, avgTime: 86400 },
        { stageId: 's5', entered: 1715, exited: 858, dropoffRate: 50, avgTime: 172800 },
        { stageId: 's6', entered: 857, exited: 507, dropoffRate: 59, avgTime: 600 },
      ],
    },
    createdBy: 'admin',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
  };

  funnels.set(sample.id, sample);
};

initializeSampleFunnels();

/**
 * GET /api/v1/marketing/funnels
 * Get all conversion funnels
 */
router.get('/funnels', (req: Request, res: Response) => {
  try {
    const allFunnels = Array.from(funnels.values());

    res.json({
      success: true,
      funnels: allFunnels.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        stageCount: f.stages.length,
        overallConversionRate: f.metrics.overallConversionRate,
        totalEntered: f.metrics.totalEntered,
        totalCompleted: f.metrics.totalCompleted,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get funnels' });
  }
});

/**
 * GET /api/v1/marketing/funnels/:id
 * Get detailed funnel analytics
 */
router.get('/funnels/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { period = '7d' } = req.query;

    const funnel = funnels.get(id);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    // Calculate funnel visualization data
    const visualData = funnel.stages.map((stage, index) => {
      const metrics = funnel.metrics.stageMetrics.find(m => m.stageId === stage.id) || {
        entered: 0,
        exited: 0,
        dropoffRate: 0,
        avgTime: 0,
      };

      return {
        stage: stage.name,
        order: stage.order,
        entered: metrics.entered,
        completed: metrics.entered - metrics.exited,
        dropoffRate: `${metrics.dropoffRate}%`,
        dropoffCount: metrics.exited,
        avgTime: metrics.avgTime,
        avgTimeFormatted: metrics.avgTime < 60 ? `${metrics.avgTime}s` :
                          metrics.avgTime < 3600 ? `${Math.round(metrics.avgTime / 60)}m` :
                          metrics.avgTime < 86400 ? `${Math.round(metrics.avgTime / 3600)}h` :
                          `${Math.round(metrics.avgTime / 86400)}d`,
        conversionToNext: index < funnel.stages.length - 1
          ? `${(100 - metrics.dropoffRate).toFixed(1)}%`
          : 'N/A',
        widthPercent: funnel.metrics.totalEntered > 0
          ? (metrics.entered / funnel.metrics.totalEntered * 100).toFixed(1)
          : 0,
      };
    });

    // Identify biggest dropoff
    const biggestDropoff = funnel.metrics.stageMetrics.reduce((max, current) =>
      current.dropoffRate > max.dropoffRate ? current : max
    , funnel.metrics.stageMetrics[0]);

    const biggestDropoffStage = funnel.stages.find(s => s.id === biggestDropoff?.stageId);

    res.json({
      success: true,
      funnel: {
        id: funnel.id,
        name: funnel.name,
        description: funnel.description,
        stages: funnel.stages,
      },
      summary: {
        totalEntered: funnel.metrics.totalEntered,
        totalCompleted: funnel.metrics.totalCompleted,
        overallConversionRate: `${funnel.metrics.overallConversionRate}%`,
        avgTimeToComplete: funnel.metrics.avgTimeToComplete,
        avgTimeFormatted: funnel.metrics.avgTimeToComplete < 86400
          ? `${Math.round(funnel.metrics.avgTimeToComplete / 3600)} hours`
          : `${Math.round(funnel.metrics.avgTimeToComplete / 86400)} days`,
      },
      visualization: visualData,
      insights: {
        biggestDropoff: biggestDropoffStage ? {
          stage: biggestDropoffStage.name,
          rate: `${biggestDropoff.dropoffRate}%`,
          count: biggestDropoff.exited,
          recommendation: 'Consider A/B testing this stage or simplifying the user experience.',
        } : null,
        healthScore: funnel.metrics.overallConversionRate > 5 ? 'Good' :
                     funnel.metrics.overallConversionRate > 2 ? 'Average' : 'Needs Improvement',
        benchmarkComparison: {
          industry: 'SaaS',
          benchmark: '3.0%',
          performance: funnel.metrics.overallConversionRate > 3 ? 'Above Average' : 'Below Average',
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get funnel' });
  }
});

/**
 * POST /api/v1/marketing/funnels
 * Create a new funnel
 */
router.post('/funnels', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, description, stages } = req.body;

    if (!name || !stages || stages.length < 2) {
      return res.status(400).json({ error: 'name and at least 2 stages are required' });
    }

    const funnel: Funnel = {
      id: `funnel_${Date.now()}`,
      name,
      description: description || '',
      stages: stages.map((s: any, index: number) => ({
        id: `s${index + 1}`,
        order: index + 1,
        ...s,
      })),
      metrics: {
        totalEntered: 0,
        totalCompleted: 0,
        overallConversionRate: 0,
        avgTimeToComplete: 0,
        stageMetrics: stages.map((s: any, index: number) => ({
          stageId: `s${index + 1}`,
          entered: 0,
          exited: 0,
          dropoffRate: 0,
          avgTime: 0,
        })),
      },
      createdBy: user?.id || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    funnels.set(funnel.id, funnel);

    res.json({
      success: true,
      funnel,
      message: 'Funnel created successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create funnel' });
  }
});

/**
 * PUT /api/v1/marketing/funnels/:id
 * Update a funnel
 */
router.put('/funnels/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, stages } = req.body;

    const funnel = funnels.get(id);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    if (name) funnel.name = name;
    if (description) funnel.description = description;
    if (stages) {
      funnel.stages = stages.map((s: any, index: number) => ({
        id: `s${index + 1}`,
        order: index + 1,
        ...s,
      }));
    }

    funnel.updatedAt = new Date();
    funnels.set(id, funnel);

    res.json({
      success: true,
      funnel,
      message: 'Funnel updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update funnel' });
  }
});

/**
 * DELETE /api/v1/marketing/funnels/:id
 * Delete a funnel
 */
router.delete('/funnels/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!funnels.has(id)) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    funnels.delete(id);

    res.json({
      success: true,
      message: 'Funnel deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete funnel' });
  }
});

/**
 * POST /api/v1/marketing/funnels/:id/track
 * Track funnel progression (public endpoint)
 */
router.post('/funnels/:id/track', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { visitorId, event, action, url } = req.body;

    const funnel = funnels.get(id);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    // Find matching stage
    let matchedStage: FunnelStage | undefined;
    for (const stage of funnel.stages) {
      if (stage.criteria.event && stage.criteria.event === event) {
        matchedStage = stage;
        break;
      }
      if (stage.criteria.action && stage.criteria.action === action) {
        matchedStage = stage;
        break;
      }
      if (stage.criteria.url && url && url.includes(stage.criteria.url)) {
        matchedStage = stage;
        break;
      }
    }

    if (!matchedStage) {
      return res.json({ success: true, matched: false });
    }

    // Find or create session
    let session = Array.from(funnelSessions.values())
      .find(s => s.funnelId === id && s.visitorId === visitorId);

    if (!session) {
      session = {
        id: `fsess_${Date.now()}`,
        funnelId: id,
        visitorId,
        currentStage: 0,
        stageHistory: [],
        completed: false,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      funnelSessions.set(session.id, session);

      // Update funnel metrics
      funnel.metrics.totalEntered++;
      const stageMetric = funnel.metrics.stageMetrics.find(m => m.stageId === funnel.stages[0].id);
      if (stageMetric) stageMetric.entered++;
    }

    // Update session with new stage
    if (matchedStage.order > session.currentStage) {
      // Complete previous stages
      for (let i = session.currentStage; i < matchedStage.order; i++) {
        const stage = funnel.stages[i];
        if (stage) {
          const existingEntry = session.stageHistory.find(h => h.stageId === stage.id);
          if (existingEntry && !existingEntry.completed) {
            existingEntry.exitedAt = new Date();
            existingEntry.completed = true;
          } else if (!existingEntry) {
            session.stageHistory.push({
              stageId: stage.id,
              enteredAt: new Date(),
              exitedAt: new Date(),
              completed: true,
            });
          }
        }
      }

      // Enter new stage
      session.stageHistory.push({
        stageId: matchedStage.id,
        enteredAt: new Date(),
        completed: false,
      });

      session.currentStage = matchedStage.order;
      session.lastActivityAt = new Date();

      // Update stage metrics
      const stageMetric = funnel.metrics.stageMetrics.find(m => m.stageId === matchedStage!.id);
      if (stageMetric) stageMetric.entered++;

      // Check if funnel completed
      if (matchedStage.order === funnel.stages.length) {
        session.completed = true;
        session.completedAt = new Date();
        funnel.metrics.totalCompleted++;
        funnel.metrics.overallConversionRate =
          (funnel.metrics.totalCompleted / funnel.metrics.totalEntered * 100);
      }

      funnelSessions.set(session.id, session);
      funnels.set(id, funnel);
    }

    res.json({
      success: true,
      matched: true,
      stage: matchedStage.name,
      stageOrder: matchedStage.order,
      isCompleted: session.completed,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to track funnel' });
  }
});

/**
 * GET /api/v1/marketing/funnels/:id/sessions
 * Get funnel sessions for analysis
 */
router.get('/funnels/:id/sessions', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;

    const funnel = funnels.get(id);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    let sessions = Array.from(funnelSessions.values()).filter(s => s.funnelId === id);

    if (status === 'completed') {
      sessions = sessions.filter(s => s.completed);
    } else if (status === 'active') {
      sessions = sessions.filter(s => !s.completed);
    }

    sessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

    const total = sessions.length;
    const paginatedSessions = sessions.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      funnelId: id,
      summary: {
        total,
        completed: sessions.filter(s => s.completed).length,
        active: sessions.filter(s => !s.completed).length,
      },
      sessions: paginatedSessions.map(s => ({
        id: s.id,
        visitorId: s.visitorId,
        currentStage: funnel.stages[s.currentStage - 1]?.name || 'Unknown',
        stagesCompleted: s.stageHistory.filter(h => h.completed).length,
        totalStages: funnel.stages.length,
        completed: s.completed,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        lastActivityAt: s.lastActivityAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get funnel sessions' });
  }
});

export default router;

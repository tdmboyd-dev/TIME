/**
 * TIME Wealth Management API Routes
 *
 * Dynasty Trust Engine + Family Wealth Legacy AI
 * - Trust planning and recommendations
 * - Estate tax projections
 * - Gifting strategies
 * - Family wealth roadmaps
 * - AI-powered recommendations
 * - Financial education
 */

import { Router, Request, Response } from 'express';
import { dynastyTrustEngine, trustAssetTracker } from '../wealth/dynasty_trust_engine';
import { familyLegacyAI } from '../wealth/family_legacy_ai';
import { logger } from '../utils/logger';
import { authMiddleware } from './auth';
import { requireFeature } from '../middleware/tierAccess';

const router = Router();

// ============================================================================
// DYNASTY TRUST ENGINE
// ============================================================================

/**
 * GET /api/v1/wealth/trusts/analyze
 * Analyze optimal trust structures for wealth profile
 * REQUIRES: UNLIMITED tier (dynasty_trust feature)
 */
router.get('/trusts/analyze', authMiddleware, requireFeature('dynasty_trust'), async (req: Request, res: Response) => {
  try {
    const netWorth = parseFloat(req.query.netWorth as string) || 1000000;
    const familySize = parseInt(req.query.familySize as string) || 4;
    const charityGoal = req.query.charityGoal ? parseFloat(req.query.charityGoal as string) : undefined;
    const businessOwner = req.query.businessOwner === 'true';
    const realEstateHeavy = req.query.realEstateHeavy === 'true';

    const recommendations = dynastyTrustEngine.analyzeTrustOptions(netWorth, familySize, {
      charityGoal,
      businessOwner,
      realEstateHeavy,
    });

    res.json({
      success: true,
      data: {
        netWorth,
        familySize,
        recommendations,
        summary: {
          totalTaxSavings: recommendations.reduce((sum, r) => sum + r.taxSavings, 0),
          topRecommendation: recommendations[0]?.name || 'None',
          implementationCost: recommendations.reduce((sum, r) => sum + r.implementationCost, 0),
        },
      },
    });
  } catch (error) {
    logger.error('Trust analysis failed:', error as object);
    res.status(500).json({ error: 'Failed to analyze trust options' });
  }
});

/**
 * GET /api/v1/wealth/trusts/jurisdictions
 * Get optimal trust jurisdiction recommendation
 */
router.get('/trusts/jurisdictions', async (req: Request, res: Response) => {
  try {
    const assetProtection = req.query.assetProtection === 'true';
    const privacy = req.query.privacy === 'true';
    const noStateTax = req.query.noStateTax === 'true';
    const selfSettled = req.query.selfSettled === 'true';

    const recommendation = dynastyTrustEngine.getOptimalJurisdiction({
      assetProtection,
      privacy,
      noStateTax,
      selfSettled,
    });

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    logger.error('Jurisdiction analysis failed:', error as object);
    res.status(500).json({ error: 'Failed to analyze jurisdictions' });
  }
});

/**
 * GET /api/v1/wealth/estate/projection
 * Project estate tax liability
 */
router.get('/estate/projection', async (req: Request, res: Response) => {
  try {
    const netWorth = parseFloat(req.query.netWorth as string) || 5000000;
    const age = parseInt(req.query.age as string) || 55;
    const married = req.query.married !== 'false';
    const growthRate = parseFloat(req.query.growthRate as string) || 0.06;

    const projection = dynastyTrustEngine.projectEstateTax(netWorth, age, married, growthRate);

    res.json({
      success: true,
      data: {
        ...projection,
        currentNetWorthFormatted: `$${(projection.currentNetWorth / 1000000).toFixed(2)}M`,
        projectedAtDeathFormatted: `$${(projection.projectedAtDeath / 1000000).toFixed(2)}M`,
        estimatedTaxFormatted: `$${(projection.estimatedTax / 1000000).toFixed(2)}M`,
        effectiveTaxRateFormatted: `${(projection.effectiveTaxRate * 100).toFixed(1)}%`,
      },
    });
  } catch (error) {
    logger.error('Estate projection failed:', error as object);
    res.status(500).json({ error: 'Failed to project estate tax' });
  }
});

/**
 * GET /api/v1/wealth/tax-constants
 * Get current tax constants (2025)
 */
router.get('/tax-constants', async (req: Request, res: Response) => {
  try {
    const constants = dynastyTrustEngine.getTaxConstants();

    res.json({
      success: true,
      data: {
        year: 2025,
        annualGiftExclusion: `$${constants.annualGiftExclusion.toLocaleString()}`,
        lifetimeEstateExemption: `$${(constants.lifetimeEstateExemption / 1000000).toFixed(2)}M`,
        marriedExemption: `$${(constants.marriedExemption / 1000000).toFixed(2)}M`,
        gstExemption: `$${(constants.gstExemption / 1000000).toFixed(2)}M`,
        estateTaxRate: `${constants.estateTaxRate * 100}%`,
        giftTaxRate: `${constants.giftTaxRate * 100}%`,
        applicableFederalRates: {
          shortTerm: `${constants.afr.shortTerm}%`,
          midTerm: `${constants.afr.midTerm}%`,
          longTerm: `${constants.afr.longTerm}%`,
          section7520Rate: `${constants.afr.section7520Rate}%`,
        },
        dynastyJurisdictions: constants.dynastyJurisdictions,
      },
    });
  } catch (error) {
    logger.error('Get tax constants failed:', error as object);
    res.status(500).json({ error: 'Failed to get tax constants' });
  }
});

// ============================================================================
// FAMILY LEGACY AI
// ============================================================================

/**
 * POST /api/v1/wealth/family
 * Create a new family profile
 */
router.post('/family', async (req: Request, res: Response) => {
  try {
    const { familyName, headOfHousehold, members, goals, values, legacyVision } = req.body;

    if (!familyName || !headOfHousehold || !members || !Array.isArray(members)) {
      return res.status(400).json({
        error: 'Required fields: familyName, headOfHousehold, members (array)',
      });
    }

    const family = familyLegacyAI.createFamily(
      familyName,
      headOfHousehold,
      members,
      goals || [],
      values || [],
      legacyVision || ''
    );

    res.json({
      success: true,
      data: family,
    });
  } catch (error) {
    logger.error('Create family failed:', error as object);
    res.status(500).json({ error: 'Failed to create family profile' });
  }
});

/**
 * GET /api/v1/wealth/family/:familyId
 * Get family profile
 */
router.get('/family/:familyId', async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    const family = familyLegacyAI.getFamily(familyId);

    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    res.json({
      success: true,
      data: family,
    });
  } catch (error) {
    logger.error('Get family failed:', error as object);
    res.status(500).json({ error: 'Failed to get family' });
  }
});

/**
 * POST /api/v1/wealth/family/:familyId/roadmap
 * Generate wealth roadmap for family
 */
router.post('/family/:familyId/roadmap', async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    const roadmap = familyLegacyAI.generateWealthRoadmap(familyId);

    res.json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    logger.error('Generate roadmap failed:', error as object);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

/**
 * GET /api/v1/wealth/family/:familyId/recommendations
 * Get AI recommendations for family
 */
router.get('/family/:familyId/recommendations', async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    const recommendations = familyLegacyAI.generateRecommendations(familyId);

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Get recommendations failed:', error as object);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * GET /api/v1/wealth/family/:familyId/comprehensive
 * Get comprehensive wealth plan
 */
router.get('/family/:familyId/comprehensive', async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    const plan = familyLegacyAI.getComprehensivePlan(familyId);

    if (!plan) {
      return res.status(404).json({ error: 'Family not found' });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('Get comprehensive plan failed:', error as object);
    res.status(500).json({ error: 'Failed to get comprehensive plan' });
  }
});

// ============================================================================
// FINANCIAL EDUCATION
// ============================================================================

/**
 * GET /api/v1/wealth/education/lessons
 * Get financial education lessons
 */
router.get('/education/lessons', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const difficulty = req.query.difficulty as 'beginner' | 'intermediate' | 'advanced' | undefined;

    const lessons = familyLegacyAI.getLessons({ category, difficulty });

    res.json({
      success: true,
      count: lessons.length,
      data: lessons,
    });
  } catch (error) {
    logger.error('Get lessons failed:', error as object);
    res.status(500).json({ error: 'Failed to get lessons' });
  }
});

/**
 * GET /api/v1/wealth/education/:familyId/:memberId/path
 * Get personalized learning path for family member
 */
router.get('/education/:familyId/:memberId/path', async (req: Request, res: Response) => {
  try {
    const { familyId, memberId } = req.params;
    const lessons = familyLegacyAI.getLearningPath(memberId, familyId);

    res.json({
      success: true,
      count: lessons.length,
      data: lessons,
    });
  } catch (error) {
    logger.error('Get learning path failed:', error as object);
    res.status(500).json({ error: 'Failed to get learning path' });
  }
});

// ============================================================================
// TRUST ASSET TRACKING & GIFTING
// ============================================================================

/**
 * POST /api/v1/wealth/trusts/assets/designate
 * Designate an asset for a trust
 */
router.post('/trusts/assets/designate', async (req: Request, res: Response) => {
  try {
    const { userId, trustId, trustName, asset } = req.body;

    if (!userId || !trustId || !trustName || !asset) {
      return res.status(400).json({
        error: 'Required fields: userId, trustId, trustName, asset (symbol, shares, currentPrice, assetType)',
      });
    }

    const trustAsset = trustAssetTracker.designateAssetForTrust(userId, trustId, trustName, asset);

    res.json({
      success: true,
      data: trustAsset,
      message: `Asset ${asset.symbol} designated for ${trustName}`,
    });
  } catch (error) {
    logger.error('Designate asset failed:', error as object);
    res.status(500).json({ error: 'Failed to designate asset for trust' });
  }
});

/**
 * POST /api/v1/wealth/trusts/assets/:assetId/transfer
 * Execute transfer of designated asset to trust account
 */
router.post('/trusts/assets/:assetId/transfer', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { toBrokerId } = req.body;

    if (!toBrokerId) {
      return res.status(400).json({ error: 'Required field: toBrokerId (destination broker account)' });
    }

    const result = await trustAssetTracker.executeAssetTransfer(assetId, toBrokerId);

    if (result.success) {
      res.json({
        success: true,
        data: {
          assetId,
          orderId: result.orderId,
          message: 'Asset transfer initiated',
        },
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Asset transfer failed:', error as object);
    res.status(500).json({ error: 'Failed to transfer asset' });
  }
});

/**
 * GET /api/v1/wealth/trusts/assets/:userId
 * Get all trust assets for a user
 */
router.get('/trusts/assets/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const assets = trustAssetTracker.getTrustAssets(userId);
    const totalValue = trustAssetTracker.getTotalTrustValue(userId);

    res.json({
      success: true,
      data: {
        assets,
        count: assets.length,
        totalValue,
        totalValueFormatted: `$${totalValue.toLocaleString()}`,
      },
    });
  } catch (error) {
    logger.error('Get trust assets failed:', error as object);
    res.status(500).json({ error: 'Failed to get trust assets' });
  }
});

/**
 * POST /api/v1/wealth/gifts/record
 * Record an annual exclusion gift
 */
router.post('/gifts/record', async (req: Request, res: Response) => {
  try {
    const { userId, recipientId, recipientName, recipientRelationship, gift } = req.body;

    if (!userId || !recipientId || !recipientName || !recipientRelationship || !gift) {
      return res.status(400).json({
        error: 'Required fields: userId, recipientId, recipientName, recipientRelationship, gift (amount, description, giftType)',
      });
    }

    const record = trustAssetTracker.recordGift(userId, recipientId, recipientName, recipientRelationship, gift);

    res.json({
      success: true,
      data: record,
      message: `Gift of $${gift.amount.toLocaleString()} recorded to ${recipientName}`,
    });
  } catch (error) {
    logger.error('Record gift failed:', error as object);
    res.status(500).json({ error: 'Failed to record gift' });
  }
});

/**
 * POST /api/v1/wealth/gifts/execute
 * Execute a gift via broker (stock transfer)
 */
router.post('/gifts/execute', async (req: Request, res: Response) => {
  try {
    const { userId, recipientId, recipientName, recipientRelationship, symbol, shares } = req.body;

    if (!userId || !recipientId || !recipientName || !recipientRelationship || !symbol || !shares) {
      return res.status(400).json({
        error: 'Required fields: userId, recipientId, recipientName, recipientRelationship, symbol, shares',
      });
    }

    const result = await trustAssetTracker.executeGiftViaBroker(
      userId,
      recipientId,
      recipientName,
      recipientRelationship,
      symbol,
      shares
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.record,
        message: `Gift of ${shares} shares of ${symbol} executed to ${recipientName}`,
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Execute gift failed:', error as object);
    res.status(500).json({ error: 'Failed to execute gift' });
  }
});

/**
 * GET /api/v1/wealth/gifts/summary/:userId
 * Get gift summary for a user (current year or specified year)
 */
router.get('/gifts/summary/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const summary = trustAssetTracker.getGiftSummary(userId, year);

    res.json({
      success: true,
      data: {
        ...summary,
        totalGiftedFormatted: `$${summary.totalGifted.toLocaleString()}`,
        usedLifetimeExemptionFormatted: `$${summary.usedLifetimeExemption.toLocaleString()}`,
        byRecipientFormatted: summary.byRecipient.map((r) => ({
          name: r.name,
          totalFormatted: `$${r.total.toLocaleString()}`,
          remainingFormatted: `$${r.remaining.toLocaleString()}`,
        })),
      },
    });
  } catch (error) {
    logger.error('Get gift summary failed:', error as object);
    res.status(500).json({ error: 'Failed to get gift summary' });
  }
});

// ============================================================================
// STATUS
// ============================================================================

/**
 * GET /api/v1/wealth/status
 * Get wealth management system status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const legacyStatus = familyLegacyAI.getStatus();
    const taxConstants = dynastyTrustEngine.getTaxConstants();

    res.json({
      success: true,
      data: {
        familyLegacyAI: legacyStatus,
        dynastyTrustEngine: {
          taxYear: 2025,
          exemptionAmount: `$${(taxConstants.lifetimeEstateExemption / 1000000).toFixed(2)}M`,
          supportedJurisdictions: taxConstants.dynastyJurisdictions,
        },
        trustAssetTracker: {
          status: 'active',
          capabilities: [
            'Asset designation for trusts',
            'Broker-integrated transfers',
            'Annual gift tracking',
            'Gift execution via broker',
          ],
        },
        features: [
          'Dynasty Trust analysis',
          'Estate tax projections',
          'Gifting strategy optimization',
          'Family wealth roadmaps',
          'AI-powered recommendations',
          'Financial education',
          'Multi-generational planning',
          'Trust asset tracking',
          'Annual gift management',
          'Broker-integrated gift execution',
        ],
      },
    });
  } catch (error) {
    logger.error('Get status failed:', error as object);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;

/**
 * TIME BEYOND US - Onboarding Routes
 *
 * Handles user onboarding flow:
 * - Saving user preferences
 * - Bot recommendations based on risk profile
 * - Subscription plan selection
 *
 * Steps:
 * 1. Welcome + Trading Experience (beginner/intermediate/advanced)
 * 2. Risk Tolerance (1-5 scale questionnaire)
 * 3. Investment Goals (growth/income/preservation)
 * 4. Capital Range ($1K-$5K, $5K-$25K, $25K-$100K, $100K+)
 * 5. Preferred Asset Classes (stocks/crypto/forex/options)
 * 6. Bot Recommendations + Pricing Tiers
 * 7. Complete + Start Trading
 */

import { Router, Request, Response } from 'express';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('OnboardingRoutes');

// Types
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
type RiskTolerance = 1 | 2 | 3 | 4 | 5;
type InvestmentGoal = 'growth' | 'income' | 'preservation';
type CapitalRange = '1k-5k' | '5k-25k' | '25k-100k' | '100k+';
type AssetClass = 'stocks' | 'crypto' | 'forex' | 'options';

interface OnboardingData {
  name: string;
  experienceLevel: ExperienceLevel;
  riskTolerance: RiskTolerance;
  riskAnswers: Record<string, number>;
  investmentGoal: InvestmentGoal;
  capitalRange: CapitalRange;
  assetClasses: AssetClass[];
  recommendedBots: string[];
  selectedPlan: string;
  selectedAddOns: string[];
  broker?: string;
  activatedBot?: string;
}

interface PricingTier {
  name: string;
  price: number;
  bots: number | string;
  features: string[];
}

// Pricing Tiers
const PRICING_TIERS: PricingTier[] = [
  { name: 'FREE', price: 0, bots: 1, features: ['1 Trading Bot', 'Basic Analytics', 'Paper Trading'] },
  { name: 'BASIC', price: 19, bots: 3, features: ['3 Trading Bots', 'Advanced Analytics', 'Email Support'] },
  { name: 'PRO', price: 49, bots: 7, features: ['7 Trading Bots', 'Priority Support', 'Custom Strategies'] },
  { name: 'PREMIUM', price: 109, bots: 11, features: ['11 Super Bots', 'AI Optimization', 'Dedicated Manager'] },
  { name: 'ENTERPRISE', price: 450, bots: 'Unlimited', features: ['Unlimited Bots', 'White-label', 'API Access', 'Custom Development'] },
];

// Add-ons
const ADD_ONS = [
  { name: 'DROPBOT', price: 39, description: 'Automated drop trading with AI signals' },
  { name: 'UMM', price: 59, description: 'Universal Money Machine - Fully automated trading' },
];

// In-memory storage (use database in production)
const userPreferences = new Map<string, OnboardingData>();

/**
 * GET /onboarding/pricing
 * Get all pricing tiers and add-ons
 */
router.get('/pricing', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        tiers: PRICING_TIERS,
        addOns: ADD_ONS,
      },
    });
  } catch (error) {
    logger.error('Failed to get pricing', { error });
    res.status(500).json({ error: 'Failed to get pricing' });
  }
});

/**
 * POST /onboarding/recommend-bots
 * Get bot recommendations based on user profile
 */
router.post('/recommend-bots', (req: Request, res: Response) => {
  try {
    const {
      experienceLevel,
      riskTolerance,
      investmentGoal,
      capitalRange,
      assetClasses,
    } = req.body;

    const recommendations: string[] = [];

    // Base recommendations by experience level
    if (experienceLevel === 'beginner') {
      if (riskTolerance <= 2) {
        recommendations.push('Index Tracker Bot', 'Dollar Cost Averaging Bot', 'Blue Chip Accumulator');
      } else if (riskTolerance === 3) {
        recommendations.push('Balanced Growth Bot', 'Smart Rebalancer', 'Trend Following Bot');
      } else {
        recommendations.push('Growth Momentum Bot', 'Swing Trader Bot', 'Volatility Rider');
      }
    } else if (experienceLevel === 'intermediate') {
      if (investmentGoal === 'growth') {
        recommendations.push('Growth Momentum Bot', 'Breakout Hunter', 'Sector Rotation Bot');
      } else if (investmentGoal === 'income') {
        recommendations.push('Dividend Harvester', 'Options Income Bot', 'Covered Call Writer');
      } else {
        recommendations.push('Capital Preservation Bot', 'Low Volatility Bot', 'Defensive Allocator');
      }
    } else {
      // Advanced
      if (riskTolerance >= 4) {
        recommendations.push('AI Trade God Bot', 'Algorithmic Scalper', 'Multi-Strategy Arbitrage');
      } else if (riskTolerance === 3) {
        recommendations.push('Statistical Arbitrage Bot', 'Mean Reversion Pro', 'Options Wheel Strategy');
      } else {
        recommendations.push('Market Neutral Bot', 'Pairs Trading Bot', 'Volatility Arbitrage');
      }
    }

    // Add asset-class specific bots
    if (assetClasses?.includes('crypto')) {
      recommendations.push('Crypto Momentum Bot', 'DeFi Yield Bot');
    }
    if (assetClasses?.includes('forex')) {
      recommendations.push('Forex Carry Trade Bot', 'Currency Pairs Arbitrage');
    }
    if (assetClasses?.includes('options')) {
      recommendations.push('Options Wheel Strategy', 'Iron Condor Bot');
    }

    // Capital-based adjustments
    if (capitalRange === '100k+') {
      recommendations.push('Institutional Grade Bot', 'Multi-Asset Allocator');
    }

    // Remove duplicates and limit to top 5
    const uniqueRecs = [...new Set(recommendations)].slice(0, 5);

    res.json({
      success: true,
      recommendations: uniqueRecs,
      profile: {
        experienceLevel,
        riskTolerance,
        riskLabel: getRiskLabel(riskTolerance),
        investmentGoal,
        capitalRange,
        assetClasses,
      },
    });
  } catch (error) {
    logger.error('Failed to get recommendations', { error });
    res.status(500).json({ error: 'Failed to get bot recommendations' });
  }
});

/**
 * POST /onboarding/complete
 * Save user onboarding data and complete setup
 */
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const data: OnboardingData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'experienceLevel', 'investmentGoal', 'capitalRange', 'assetClasses', 'selectedPlan'];
    const missing = requiredFields.filter(field => !data[field as keyof OnboardingData]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
      });
    }

    // Calculate risk tolerance from answers if not provided
    if (!data.riskTolerance && data.riskAnswers) {
      const avgScore = Object.values(data.riskAnswers).reduce((a, b) => a + b, 0) / Object.keys(data.riskAnswers).length;
      data.riskTolerance = Math.round(avgScore) as RiskTolerance;
    }

    // Generate user ID (in production, use authenticated user ID)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store preferences
    userPreferences.set(userId, data);

    // Calculate subscription cost
    const tier = PRICING_TIERS.find(t => t.name === data.selectedPlan);
    const addOnCost = (data.selectedAddOns || []).reduce((sum, addon) => {
      const addOn = ADD_ONS.find(a => a.name === addon);
      return sum + (addOn?.price || 0);
    }, 0);

    const totalCost = (tier?.price || 0) + addOnCost;

    logger.info('Onboarding completed', {
      userId,
      name: data.name,
      experienceLevel: data.experienceLevel,
      riskTolerance: data.riskTolerance,
      plan: data.selectedPlan,
      totalCost,
    });

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        userId,
        profile: {
          name: data.name,
          experienceLevel: data.experienceLevel,
          riskTolerance: data.riskTolerance,
          riskLabel: getRiskLabel(data.riskTolerance),
          investmentGoal: data.investmentGoal,
          capitalRange: data.capitalRange,
          assetClasses: data.assetClasses,
        },
        subscription: {
          plan: data.selectedPlan,
          addOns: data.selectedAddOns || [],
          monthlyTotal: totalCost,
          tier,
        },
        bots: {
          recommended: data.recommendedBots,
          activated: data.activatedBot,
        },
      },
    });
  } catch (error) {
    logger.error('Onboarding completion error', { error });
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

/**
 * GET /onboarding/preferences/:userId
 * Get saved user preferences
 */
router.get('/preferences/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const prefs = userPreferences.get(userId);

    if (!prefs) {
      return res.status(404).json({
        success: false,
        error: 'User preferences not found',
      });
    }

    res.json({
      success: true,
      data: prefs,
    });
  } catch (error) {
    logger.error('Failed to get preferences', { error });
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PUT /onboarding/preferences/:userId
 * Update user preferences
 */
router.put('/preferences/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const existing = userPreferences.get(userId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'User preferences not found',
      });
    }

    const updated = { ...existing, ...updates };
    userPreferences.set(userId, updated);

    res.json({
      success: true,
      message: 'Preferences updated',
      data: updated,
    });
  } catch (error) {
    logger.error('Failed to update preferences', { error });
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * GET /onboarding/risk-explanations
 * Get plain English explanations for risk levels
 */
router.get('/risk-explanations', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      riskLevels: {
        1: {
          label: 'Very Conservative',
          description: 'Capital preservation is your top priority. You prefer steady, low-risk investments.',
          expectedReturn: '5-10% annually',
          maxDrawdown: '5%',
        },
        2: {
          label: 'Conservative',
          description: 'You prioritize safety but are open to small amounts of risk for better returns.',
          expectedReturn: '10-15% annually',
          maxDrawdown: '10%',
        },
        3: {
          label: 'Moderate',
          description: 'You seek a balance between growth and safety. Some volatility is acceptable.',
          expectedReturn: '15-25% annually',
          maxDrawdown: '15%',
        },
        4: {
          label: 'Aggressive',
          description: 'You are comfortable with significant volatility in pursuit of higher returns.',
          expectedReturn: '25-40% annually',
          maxDrawdown: '25%',
        },
        5: {
          label: 'Very Aggressive',
          description: 'Maximum growth is your goal. You can handle large swings and temporary losses.',
          expectedReturn: '40-60%+ annually',
          maxDrawdown: '35%+',
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get risk explanations', { error });
    res.status(500).json({ error: 'Failed to get risk explanations' });
  }
});

// Helper function
function getRiskLabel(riskTolerance: RiskTolerance | null): string {
  if (!riskTolerance) return 'Unknown';
  const labels: Record<number, string> = {
    1: 'Very Conservative',
    2: 'Conservative',
    3: 'Moderate',
    4: 'Aggressive',
    5: 'Very Aggressive',
  };
  return labels[riskTolerance] || 'Unknown';
}

export default router;

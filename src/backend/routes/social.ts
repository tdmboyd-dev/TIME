/**
 * TIME Social Trading Routes
 *
 * API endpoints for autonomous social trading:
 * - Signal provider management
 * - Copy trading configuration
 * - Collective intelligence
 * - AI recommendations
 * - Leaderboard
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { socialTradingEngine } from '../engines/social_trading_engine';

const router = Router();

// ============================================================
// SIGNAL PROVIDERS
// ============================================================

/**
 * GET /social/providers
 * List all signal providers with filtering
 */
router.get('/providers', authMiddleware, (req: Request, res: Response) => {
  const { platform, type, minScore, status, limit = '50' } = req.query;

  const providers = socialTradingEngine.getAllProviders({
    platform: platform as string | undefined,
    type: type as string | undefined,
    minScore: minScore ? parseInt(minScore as string) : undefined,
    status: status as string | undefined,
  }).slice(0, parseInt(limit as string));

  res.json({
    total: providers.length,
    providers: providers.map(p => ({
      id: p.id,
      name: p.name,
      platform: p.platform,
      type: p.type,
      verified: p.verified,
      aiScore: p.aiScore,
      followers: p.followers,
      copiedValue: p.copiedValue,
      riskProfile: p.riskProfile,
      status: p.status,
      performance: {
        winRate: p.performance.winRate,
        profitFactor: p.performance.profitFactor,
        sharpeRatio: p.performance.sharpeRatio,
        maxDrawdown: p.performance.maxDrawdown,
        totalSignals: p.performance.totalSignals,
        riskAdjustedReturn: p.performance.riskAdjustedReturn,
      },
    })),
  });
});

/**
 * GET /social/providers/:providerId
 * Get detailed provider information
 */
router.get('/providers/:providerId', authMiddleware, (req: Request, res: Response) => {
  const { providerId } = req.params;
  const provider = socialTradingEngine.getProvider(providerId);

  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  res.json({ provider });
});

/**
 * POST /social/providers
 * Register as a signal provider
 */
router.post('/providers', authMiddleware, async (req: Request, res: Response) => {
  const {
    name,
    platform,
    type,
    riskProfile,
    preferredSymbols,
    minimumEquity,
    profitShare,
  } = req.body;

  if (!name || !platform) {
    return res.status(400).json({ error: 'Name and platform are required' });
  }

  try {
    const provider = await socialTradingEngine.registerProvider({
      name,
      platform,
      type: type || 'manual',
      verified: false,
      performance: {
        totalSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        winRate: 0,
        avgWinPips: 0,
        avgLossPips: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        avgHoldingTime: 0,
        consistency: 0,
        regimePerformance: {} as any,
        monthlyReturns: [],
        riskAdjustedReturn: 0,
        qualityScore: 50,
      },
      followers: 0,
      copiedValue: 0,
      riskProfile: riskProfile || 'moderate',
      preferredSymbols: preferredSymbols || [],
      preferredRegimes: [],
      weekRegimes: [],
      minimumEquity: minimumEquity || 0,
      profitShare: profitShare || 0,
      status: 'pending_review',
    });

    res.status(201).json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        status: provider.status,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// COPY TRADING
// ============================================================

/**
 * GET /social/copy
 * Get user's copy trading configurations
 */
router.get('/copy', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const configs = socialTradingEngine.getUserCopyConfigs(user.id);

  res.json({
    total: configs.length,
    configs: configs.map(c => ({
      providerId: c.providerId,
      mode: c.mode,
      status: c.status,
      maxRiskPerTrade: c.maxRiskPerTrade,
      maxOpenTrades: c.maxOpenTrades,
      startedAt: c.startedAt,
      totalPnL: c.totalPnL,
      totalTrades: c.totalTrades,
    })),
  });
});

/**
 * POST /social/copy
 * Start copy trading a provider
 */
router.post('/copy', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    providerId,
    mode = 'proportional',
    maxRiskPerTrade = 2,
    maxDailyRisk = 10,
    maxOpenTrades = 5,
    lotMultiplier = 1,
    fixedLotSize,
    slippage = 3,
    delay = 0,
    inverseMode = false,
    symbols = 'all',
    excludeSymbols = [],
    regimeFilter = 'auto',
  } = req.body;

  if (!providerId) {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  try {
    const config = await socialTradingEngine.setupCopyTrading({
      userId: user.id,
      providerId,
      mode,
      maxRiskPerTrade,
      maxDailyRisk,
      maxOpenTrades,
      lotMultiplier,
      fixedLotSize,
      slippage,
      delay,
      inverseMode,
      symbols,
      excludeSymbols,
      regimeFilter,
      status: 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Copy trading started',
      config: {
        providerId: config.providerId,
        mode: config.mode,
        status: config.status,
        startedAt: config.startedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /social/copy/:providerId
 * Stop copy trading a provider
 */
router.delete('/copy/:providerId', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { providerId } = req.params;

  try {
    await socialTradingEngine.stopCopyTrading(user.id, providerId);

    res.json({
      success: true,
      message: 'Copy trading stopped',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// COLLECTIVE INTELLIGENCE
// ============================================================

/**
 * GET /social/intelligence
 * Get collective intelligence for all tracked symbols
 */
router.get('/intelligence', authMiddleware, (req: Request, res: Response) => {
  const intelligence = socialTradingEngine.getAllCollectiveIntelligence();

  res.json({
    total: intelligence.length,
    symbols: intelligence.map(i => ({
      symbol: i.symbol,
      consensusDirection: i.consensusDirection,
      consensusStrength: i.consensusStrength,
      longVotes: i.longVotes,
      shortVotes: i.shortVotes,
      neutralVotes: i.neutralVotes,
      totalProviders: i.totalProviders,
      weightedConfidence: i.weightedConfidence,
      timestamp: i.timestamp,
    })),
  });
});

/**
 * GET /social/intelligence/:symbol
 * Get collective intelligence for a specific symbol
 */
router.get('/intelligence/:symbol', authMiddleware, async (req: Request, res: Response) => {
  const { symbol } = req.params;

  const intel = await socialTradingEngine.aggregateCollectiveIntelligence(symbol.toUpperCase());

  res.json({ intelligence: intel });
});

// ============================================================
// AI RECOMMENDATIONS
// ============================================================

/**
 * GET /social/recommendations
 * Get AI-powered provider recommendations
 */
router.get('/recommendations', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { riskTolerance, maxProviders = '5' } = req.query;

  try {
    const recommendations = await socialTradingEngine.getAIRecommendations(user.id, {
      riskTolerance: riskTolerance as 'low' | 'medium' | 'high' | undefined,
      maxProviders: parseInt(maxProviders as string),
    });

    res.json({
      recommended: recommendations.recommended.map(p => ({
        id: p.id,
        name: p.name,
        platform: p.platform,
        type: p.type,
        aiScore: p.aiScore,
        winRate: p.performance.winRate,
        profitFactor: p.performance.profitFactor,
        riskProfile: p.riskProfile,
      })),
      reasoning: recommendations.reasoning,
      diversificationScore: recommendations.diversificationScore,
      expectedReturn: recommendations.expectedReturn,
      expectedDrawdown: recommendations.expectedDrawdown,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// LEADERBOARD
// ============================================================

/**
 * GET /social/leaderboard
 * Get provider leaderboard
 */
router.get('/leaderboard', authMiddleware, (req: Request, res: Response) => {
  const { type, platform, limit = '50' } = req.query;

  const leaderboard = socialTradingEngine.getLeaderboard({
    type: type as string | undefined,
    platform: platform as string | undefined,
    limit: parseInt(limit as string),
  });

  res.json({
    total: leaderboard.length,
    leaderboard,
  });
});

// ============================================================
// ENGINE STATUS
// ============================================================

/**
 * GET /social/status
 * Get social trading engine status
 */
router.get('/status', authMiddleware, (req: Request, res: Response) => {
  const state = socialTradingEngine.getState();

  res.json({
    ...state,
    timestamp: new Date(),
  });
});

/**
 * POST /social/start (admin only)
 * Start the social trading engine
 */
router.post('/start', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  await socialTradingEngine.start();

  res.json({
    success: true,
    message: 'Social trading engine started',
    state: socialTradingEngine.getState(),
  });
});

/**
 * POST /social/stop (admin only)
 * Stop the social trading engine
 */
router.post('/stop', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  await socialTradingEngine.stop();

  res.json({
    success: true,
    message: 'Social trading engine stopped',
    state: socialTradingEngine.getState(),
  });
});

export default router;

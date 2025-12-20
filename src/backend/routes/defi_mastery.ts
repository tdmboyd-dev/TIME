/**
 * TIME DeFi Mastery API Routes
 *
 * FREE AI-powered DeFi education and automation
 * (Replaces $5k+ courses like Decentralized Masters)
 */

import { Router, Request, Response } from 'express';
import defiMastery, { Chain, RiskLevel, UserGoals } from '../engines/defi_mastery_engine';

const router = Router();

// ============================================================================
// Opportunities Discovery
// ============================================================================

/**
 * GET /api/defi/opportunities
 * Get all yield opportunities with optional filters
 */
router.get('/opportunities', (req: Request, res: Response) => {
  try {
    const filters = {
      chains: req.query.chains ? (req.query.chains as string).split(',') as Chain[] : undefined,
      types: req.query.types ? (req.query.types as string).split(',') as any[] : undefined,
      minApy: req.query.minApy ? parseFloat(req.query.minApy as string) : undefined,
      maxRisk: req.query.maxRisk ? parseFloat(req.query.maxRisk as string) : undefined,
      aiRecommendation: req.query.recommendation ? (req.query.recommendation as string).split(',') as any[] : undefined,
    };

    const opportunities = defiMastery.getOpportunities(filters);

    res.json({
      success: true,
      count: opportunities.length,
      opportunities,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/defi/protocols
 * Get list of all DeFi protocols with basic info
 */
router.get('/protocols', (req: Request, res: Response) => {
  try {
    // Get all opportunities and extract unique protocols
    const opportunities = defiMastery.getOpportunities({});

    // Create protocol summaries from opportunities
    const protocolMap = new Map<string, any>();

    for (const opp of opportunities) {
      const protocolId = opp.protocolId;
      if (!protocolMap.has(protocolId)) {
        protocolMap.set(protocolId, {
          id: protocolId,
          name: opp.name,
          chain: opp.chain,
          tvl: opp.tvl || 0,
          apy: opp.apy,
          risk: opp.riskScore <= 30 ? 'low' : opp.riskScore <= 60 ? 'medium' : 'high',
          opportunities: 1,
        });
      } else {
        const existing = protocolMap.get(protocolId);
        existing.tvl += opp.tvl || 0;
        existing.opportunities += 1;
        // Keep highest APY
        if (opp.apy > existing.apy) {
          existing.apy = opp.apy;
        }
      }
    }

    const protocols = Array.from(protocolMap.values());

    res.json({
      success: true,
      count: protocols.length,
      protocols,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/defi/protocols/:id
 * Get detailed protocol analysis
 */
router.get('/protocols/:id', async (req: Request, res: Response) => {
  try {
    const analysis = await defiMastery.analyzeProtocol(req.params.id);

    res.json({
      success: true,
      ...analysis,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Autopilot Portfolio
// ============================================================================

/**
 * POST /api/defi/autopilot
 * Create AI-managed portfolio
 */
router.post('/autopilot', async (req: Request, res: Response) => {
  try {
    const { userId, capital, goals } = req.body;

    if (!userId || !capital || !goals) {
      return res.status(400).json({
        success: false,
        error: 'userId, capital, and goals are required',
      });
    }

    const userGoals: UserGoals = {
      targetMonthlyIncome: goals.targetMonthlyIncome || 500,
      riskTolerance: goals.riskTolerance || 'moderate',
      investmentHorizon: goals.investmentHorizon || 'medium',
      preferredChains: goals.preferredChains || [],
      excludedProtocols: goals.excludedProtocols || [],
      gasOptimization: goals.gasOptimization !== false,
      autoCompound: goals.autoCompound !== false,
      stopLossPercent: goals.stopLossPercent || 20,
    };

    const portfolio = await defiMastery.createAutopilotPortfolio(userId, capital, userGoals);

    res.json({
      success: true,
      portfolio,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Education
// ============================================================================

/**
 * GET /api/defi/learn/:topic
 * Get contextual lesson
 */
router.get('/learn/:topic', (req: Request, res: Response) => {
  try {
    const level = (req.query.level as any) || 'beginner';
    const lesson = defiMastery.getContextualLesson(req.params.topic, level);

    res.json({
      success: true,
      lesson,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/defi/topics
 * Get available lesson topics
 */
router.get('/topics', (req: Request, res: Response) => {
  const topics = [
    { id: 'yield_farming', name: 'Yield Farming', levels: ['beginner', 'intermediate', 'advanced'] },
    { id: 'liquidity_provision', name: 'Liquidity Provision', levels: ['beginner', 'intermediate', 'advanced'] },
    { id: 'staking', name: 'Staking & Restaking', levels: ['beginner', 'intermediate'] },
    { id: 'risk_management', name: 'Risk Management', levels: ['beginner', 'intermediate', 'advanced'] },
    { id: 'wallet_security', name: 'Wallet Security', levels: ['beginner'] },
    { id: 'gas_optimization', name: 'Gas Optimization', levels: ['intermediate', 'advanced'] },
    { id: 'airdrop_farming', name: 'Airdrop Strategies', levels: ['intermediate', 'advanced'] },
  ];

  res.json({
    success: true,
    topics,
  });
});

// ============================================================================
// Alpha & Alerts
// ============================================================================

/**
 * GET /api/defi/yield-opportunities
 * Get yield farming opportunities (alias for opportunities)
 */
router.get('/yield-opportunities', (req: Request, res: Response) => {
  try {
    const opportunities = defiMastery.getOpportunities({});

    // Map to staking/yield format
    const yieldOpportunities = opportunities.map((opp, idx) => ({
      id: opp.id || `yield-${idx}`,
      token: opp.assets[0] || 'TOKEN',
      name: opp.name,
      apy: opp.apy,
      lockPeriod: opp.lockup ? `${opp.lockup} days` : 'Flexible',
      minStake: opp.minDeposit || 0,
      totalStaked: opp.tvl || 0,
      protocol: opp.protocolId,
      chain: opp.chain,
      risk: opp.riskScore <= 30 ? 'low' : opp.riskScore <= 60 ? 'medium' : 'high',
    }));

    res.json({
      success: true,
      count: yieldOpportunities.length,
      opportunities: yieldOpportunities,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/defi/portfolio
 * Get user's DeFi portfolio summary - REAL DATA ONLY
 */
router.get('/portfolio', async (req: Request, res: Response) => {
  try {
    // Return empty portfolio - user needs to connect DeFi wallet
    // Real DeFi positions would come from wallet connection + on-chain data
    res.json({
      success: true,
      portfolio: {
        totalValue: 0,
        totalStaked: 0,
        pendingRewards: 0,
        avgApy: 0,
        positions: [],
        message: 'Connect your DeFi wallet to view positions',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/defi/alpha
 * Get latest alpha alerts
 */
router.get('/alpha', (req: Request, res: Response) => {
  try {
    const alerts = defiMastery.scanForAlpha();

    res.json({
      success: true,
      alerts,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Gas Optimization
// ============================================================================

/**
 * GET /api/defi/gas/:chain
 * Get gas optimization recommendation
 */
router.get('/gas/:chain', async (req: Request, res: Response) => {
  try {
    const chain = req.params.chain as Chain;
    const estimate = await defiMastery.getGasOptimization(chain);

    res.json({
      success: true,
      ...estimate,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

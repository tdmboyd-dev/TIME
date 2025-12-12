/**
 * Universal Bot API Routes
 *
 * Endpoints for the multi-purpose bot system:
 * - Arbitrage bots
 * - DeFi bots
 * - Rewards bots
 * - Income bots
 * - Savings bots
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { universalBotEngine, OpportunityCategory } from '../bots/universal_bot_engine';

const router = Router();

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

/**
 * GET /universal-bots/info
 * Get information about the universal bot system
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    name: 'TIME Universal Bot Engine',
    description: 'Multi-purpose intelligent automation that goes beyond trading',
    categories: [
      {
        id: 'trading',
        name: 'Trading Bots',
        description: 'Stocks, crypto, forex, options trading automation',
      },
      {
        id: 'arbitrage',
        name: 'Arbitrage Bots',
        description: 'Cross-exchange, NFT, gift card, retail price arbitrage',
      },
      {
        id: 'defi',
        name: 'DeFi Bots',
        description: 'Yield optimization, auto-compounding, liquidation hunting',
      },
      {
        id: 'rewards',
        name: 'Rewards Bots',
        description: 'Cashback stacking, points optimization, bonus hunting',
      },
      {
        id: 'airdrop',
        name: 'Airdrop Bots',
        description: 'Track and claim crypto airdrops automatically',
      },
      {
        id: 'income',
        name: 'Income Bots',
        description: 'Freelance matching, gig finding, task aggregation',
      },
      {
        id: 'savings',
        name: 'Savings Bots',
        description: 'Bill negotiation, subscription optimization, price tracking',
      },
      {
        id: 'nft',
        name: 'NFT Bots',
        description: 'Floor sniping, flipping, rarity analysis',
      },
    ],
    stats: universalBotEngine.getStats(),
  });
});

/**
 * GET /universal-bots/stats
 * Get engine statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  const stats = universalBotEngine.getStats();
  const valueByCategory = universalBotEngine.getValueByCategory();

  res.json({
    ...stats,
    valueByCategory,
  });
});

// ============================================================
// BOT MANAGEMENT
// ============================================================

/**
 * GET /universal-bots/all
 * Get all universal bots
 */
router.get('/all', authMiddleware, (req: Request, res: Response) => {
  const bots = universalBotEngine.getAllBots();

  res.json({
    total: bots.length,
    bots: bots.map(b => ({
      id: b.id,
      type: b.type,
      name: b.name,
      description: b.description,
      category: b.category,
      isActive: b.isActive,
      stats: b.stats,
    })),
  });
});

/**
 * GET /universal-bots/category/:category
 * Get bots by category
 */
router.get('/category/:category', authMiddleware, (req: Request, res: Response) => {
  const { category } = req.params;

  const validCategories: OpportunityCategory[] = [
    'trading', 'arbitrage', 'defi', 'rewards', 'income', 'savings', 'nft', 'airdrop'
  ];

  if (!validCategories.includes(category as OpportunityCategory)) {
    return res.status(400).json({
      error: 'Invalid category',
      validCategories,
    });
  }

  const bots = universalBotEngine.getBotsByCategory(category as OpportunityCategory);

  res.json({
    category,
    total: bots.length,
    bots: bots.map(b => ({
      id: b.id,
      type: b.type,
      name: b.name,
      description: b.description,
      isActive: b.isActive,
      stats: b.stats,
    })),
  });
});

/**
 * GET /universal-bots/:botId
 * Get specific bot details
 */
router.get('/:botId', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const bot = universalBotEngine.getBot(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  res.json({ bot });
});

/**
 * POST /universal-bots/:botId/toggle
 * Toggle bot active status
 */
router.post('/:botId/toggle', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const { active } = req.body;

  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active must be boolean' });
  }

  const success = universalBotEngine.toggleBot(botId, active);

  if (!success) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  res.json({
    success: true,
    message: `Bot ${active ? 'activated' : 'deactivated'}`,
  });
});

// ============================================================
// OPPORTUNITIES
// ============================================================

/**
 * GET /universal-bots/opportunities/active
 * Get all active opportunities
 */
router.get('/opportunities/active', authMiddleware, (req: Request, res: Response) => {
  const category = req.query.category as OpportunityCategory | undefined;
  const opportunities = universalBotEngine.getActiveOpportunities(category);

  res.json({
    total: opportunities.length,
    opportunities: opportunities.map(o => ({
      id: o.id,
      category: o.category,
      type: o.type,
      title: o.title,
      description: o.description,
      potentialValue: o.potentialValue,
      confidence: o.confidence,
      priority: o.priority,
      timeToAct: o.timeToAct,
      requiresAction: o.requiresAction,
      autoExecutable: o.autoExecutable,
      foundAt: o.foundAt,
      expiresAt: o.expiresAt,
    })),
  });
});

/**
 * POST /universal-bots/opportunities/:opportunityId/execute
 * Execute an auto-executable opportunity
 */
router.post('/opportunities/:opportunityId/execute', authMiddleware, async (req: Request, res: Response) => {
  const { opportunityId } = req.params;

  const result = await universalBotEngine.executeOpportunity(opportunityId);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({
    success: true,
    message: result.message,
    result: result.result,
  });
});

/**
 * POST /universal-bots/opportunities/:opportunityId/dismiss
 * Dismiss an opportunity
 */
router.post('/opportunities/:opportunityId/dismiss', authMiddleware, (req: Request, res: Response) => {
  const { opportunityId } = req.params;

  const success = universalBotEngine.dismissOpportunity(opportunityId);

  if (!success) {
    return res.status(404).json({ error: 'Opportunity not found' });
  }

  res.json({
    success: true,
    message: 'Opportunity dismissed',
  });
});

// ============================================================
// SCANNING CONTROL
// ============================================================

/**
 * POST /universal-bots/scan/start
 * Start opportunity scanning
 */
router.post('/scan/start', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  universalBotEngine.startScanning();

  res.json({
    success: true,
    message: 'Opportunity scanning started',
  });
});

/**
 * POST /universal-bots/scan/stop
 * Stop opportunity scanning
 */
router.post('/scan/stop', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  universalBotEngine.stopScanning();

  res.json({
    success: true,
    message: 'Opportunity scanning stopped',
  });
});

// ============================================================
// CATEGORY-SPECIFIC ENDPOINTS
// ============================================================

/**
 * GET /universal-bots/arbitrage/opportunities
 * Get arbitrage opportunities specifically
 */
router.get('/arbitrage/opportunities', authMiddleware, (req: Request, res: Response) => {
  const opportunities = universalBotEngine.getActiveOpportunities('arbitrage');

  res.json({
    total: opportunities.length,
    description: 'Cross-exchange and other arbitrage opportunities',
    opportunities,
  });
});

/**
 * GET /universal-bots/defi/opportunities
 * Get DeFi opportunities
 */
router.get('/defi/opportunities', authMiddleware, (req: Request, res: Response) => {
  const opportunities = universalBotEngine.getActiveOpportunities('defi');

  res.json({
    total: opportunities.length,
    description: 'Yield farming, staking, and DeFi opportunities',
    opportunities,
  });
});

/**
 * GET /universal-bots/rewards/opportunities
 * Get rewards/cashback opportunities
 */
router.get('/rewards/opportunities', authMiddleware, (req: Request, res: Response) => {
  const opportunities = universalBotEngine.getActiveOpportunities('rewards');

  res.json({
    total: opportunities.length,
    description: 'Cashback, points, and bonus opportunities',
    opportunities,
  });
});

/**
 * GET /universal-bots/airdrops/opportunities
 * Get airdrop opportunities
 */
router.get('/airdrops/opportunities', authMiddleware, (req: Request, res: Response) => {
  const opportunities = universalBotEngine.getActiveOpportunities('airdrop');

  res.json({
    total: opportunities.length,
    description: 'Crypto airdrop opportunities',
    opportunities,
  });
});

/**
 * GET /universal-bots/savings/opportunities
 * Get savings opportunities
 */
router.get('/savings/opportunities', authMiddleware, (req: Request, res: Response) => {
  const opportunities = universalBotEngine.getActiveOpportunities('savings');

  res.json({
    total: opportunities.length,
    description: 'Bill negotiation and savings opportunities',
    opportunities,
  });
});

/**
 * GET /universal-bots/nft/opportunities
 * Get NFT opportunities
 */
router.get('/nft/opportunities', authMiddleware, (req: Request, res: Response) => {
  const opportunities = universalBotEngine.getActiveOpportunities('nft');

  res.json({
    total: opportunities.length,
    description: 'NFT flipping and sniping opportunities',
    opportunities,
  });
});

/**
 * GET /universal-bots/income/opportunities
 * Get income opportunities
 */
router.get('/income/opportunities', authMiddleware, (req: Request, res: Response) => {
  const opportunities = universalBotEngine.getActiveOpportunities('income');

  res.json({
    total: opportunities.length,
    description: 'Freelance and gig economy opportunities',
    opportunities,
  });
});

export default router;

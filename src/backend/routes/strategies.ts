/**
 * TIME Strategy Routes
 *
 * Full CRUD for strategies plus:
 * - Synthesis operations
 * - Backtest triggering
 * - Performance analytics
 * - Ensemble management
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { recursiveSynthesisEngine } from '../engines/recursive_synthesis_engine';
import { regimeDetector } from '../engines/regime_detector';

const router = Router();

// Mock strategy store (replace with MongoDB)
const strategies: Map<string, any> = new Map([
  ['strat_1', {
    id: 'strat_1',
    name: 'Momentum Alpha',
    description: 'Trend-following momentum strategy with regime awareness',
    type: 'momentum',
    status: 'active',
    riskLevel: 'medium',
    createdAt: new Date('2025-01-15'),
    sourceBots: [
      { botId: 'bot_1', weight: 0.4, contribution: ['entry_signals'] },
      { botId: 'bot_2', weight: 0.3, contribution: ['exit_timing'] },
      { botId: 'bot_3', weight: 0.3, contribution: ['risk_sizing'] },
    ],
    performance: {
      winRate: 65,
      profitFactor: 1.85,
      maxDrawdown: 12,
      sharpeRatio: 1.42,
      totalTrades: 234,
      totalPnL: 15420,
    },
  }],
  ['strat_2', {
    id: 'strat_2',
    name: 'Range Scalper Pro',
    description: 'Mean reversion in ranging markets',
    type: 'mean_reversion',
    status: 'active',
    riskLevel: 'low',
    createdAt: new Date('2025-02-01'),
    sourceBots: [
      { botId: 'bot_4', weight: 0.5, contribution: ['range_detection'] },
      { botId: 'bot_5', weight: 0.5, contribution: ['entries', 'exits'] },
    ],
    performance: {
      winRate: 72,
      profitFactor: 1.55,
      maxDrawdown: 8,
      sharpeRatio: 1.78,
      totalTrades: 456,
      totalPnL: 8950,
    },
  }],
]);

// ============================================================
// STRATEGY LIST AND DETAILS
// ============================================================

/**
 * GET /strategies
 * List all strategies
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const {
    type,
    status,
    riskLevel,
    sortBy = 'sharpeRatio',
    sortOrder = 'desc',
    page = '1',
    limit = '20',
  } = req.query;

  let allStrategies = Array.from(strategies.values());

  // Filter
  if (type) {
    allStrategies = allStrategies.filter(s => s.type === type);
  }
  if (status) {
    allStrategies = allStrategies.filter(s => s.status === status);
  }
  if (riskLevel) {
    allStrategies = allStrategies.filter(s => s.riskLevel === riskLevel);
  }

  // Sort
  allStrategies.sort((a, b) => {
    let aVal = a.performance?.[sortBy as string] || 0;
    let bVal = b.performance?.[sortBy as string] || 0;

    if (sortBy === 'name') {
      aVal = a.name;
      bVal = b.name;
    }

    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  // Paginate
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const start = (pageNum - 1) * limitNum;
  const paginated = allStrategies.slice(start, start + limitNum);

  res.json({
    total: allStrategies.length,
    page: pageNum,
    limit: limitNum,
    strategies: paginated,
  });
});

/**
 * GET /strategies/:strategyId
 * Get strategy details
 */
router.get('/:strategyId', authMiddleware, (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const strategy = strategies.get(strategyId);

  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  res.json({ strategy });
});

/**
 * GET /strategies/:strategyId/performance
 * Get detailed performance breakdown
 */
router.get('/:strategyId/performance', authMiddleware, (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const { period = '30d' } = req.query;
  const strategy = strategies.get(strategyId);

  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  res.json({
    strategyId,
    period,
    performance: strategy.performance,
    regimePerformance: [
      { regime: 'trending', winRate: 78, profitFactor: 2.4, trades: 89 },
      { regime: 'ranging', winRate: 62, profitFactor: 1.5, trades: 67 },
      { regime: 'volatile', winRate: 55, profitFactor: 1.2, trades: 45 },
      { regime: 'quiet', winRate: 70, profitFactor: 1.8, trades: 33 },
    ],
    botContributions: strategy.sourceBots.map((sb: any) => ({
      botId: sb.botId,
      weight: sb.weight,
      contribution: sb.contribution,
      winRate: 60 + Math.random() * 20,
      pnlContribution: Math.random() * 5000,
    })),
    monthlyReturns: [
      { month: '2025-01', return: 8.2 },
      { month: '2025-02', return: 5.4 },
      { month: '2025-03', return: -2.1 },
      { month: '2025-04', return: 4.8 },
    ],
  });
});

/**
 * GET /strategies/:strategyId/trades
 * Get recent trades from strategy
 */
router.get('/:strategyId/trades', authMiddleware, (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const { limit = '50' } = req.query;

  // Mock trades
  const trades = [
    {
      id: 'trade_1',
      symbol: 'EURUSD',
      direction: 'long',
      entryPrice: 1.0850,
      exitPrice: 1.0920,
      quantity: 10000,
      pnl: 70,
      entryTime: new Date(Date.now() - 86400000),
      exitTime: new Date(Date.now() - 43200000),
      regime: 'trending',
    },
    {
      id: 'trade_2',
      symbol: 'GBPUSD',
      direction: 'short',
      entryPrice: 1.2650,
      exitPrice: 1.2580,
      quantity: 10000,
      pnl: 70,
      entryTime: new Date(Date.now() - 172800000),
      exitTime: new Date(Date.now() - 129600000),
      regime: 'ranging',
    },
  ].slice(0, parseInt(limit as string));

  res.json({
    strategyId,
    total: trades.length,
    trades,
  });
});

// ============================================================
// STRATEGY CREATION AND SYNTHESIS
// ============================================================

/**
 * POST /strategies
 * Create a new strategy manually
 */
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const {
    name,
    description,
    type,
    riskLevel,
    sourceBots,
    parameters,
  } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  const strategyId = `strat_${Date.now()}`;
  const newStrategy = {
    id: strategyId,
    name,
    description,
    type,
    status: 'backtesting',
    riskLevel: riskLevel || 'medium',
    createdAt: new Date(),
    sourceBots: sourceBots || [],
    parameters: parameters || {},
    performance: {
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      totalTrades: 0,
      totalPnL: 0,
    },
  };

  strategies.set(strategyId, newStrategy);

  res.status(201).json({
    success: true,
    strategy: newStrategy,
  });
});

/**
 * POST /strategies/synthesize
 * Synthesize a new strategy from bots
 */
router.post('/synthesize', authMiddleware, async (req: Request, res: Response) => {
  const { botIds, method = 'ensemble', riskLevel = 'medium' } = req.body;

  if (!botIds || botIds.length < 2) {
    return res.status(400).json({
      error: 'At least 2 bots required for synthesis',
    });
  }

  try {
    const result = await recursiveSynthesisEngine.synthesize({
      parentBotIds: botIds,
      method,
      riskLevel,
    });

    res.status(201).json({
      success: true,
      message: 'Synthesis initiated',
      strategy: {
        id: result.strategyId,
        status: 'synthesizing',
        parentBots: botIds,
        method,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /strategies/:strategyId/evolve
 * Trigger evolution for a strategy
 */
router.post('/:strategyId/evolve', authMiddleware, async (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const { mutations } = req.body;
  const strategy = strategies.get(strategyId);

  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  // Queue evolution
  res.json({
    success: true,
    message: 'Evolution queued',
    strategyId,
    mutations: mutations || ['parameter_tuning', 'weight_adjustment'],
    status: 'evolving',
  });
});

/**
 * PUT /strategies/:strategyId
 * Update strategy configuration
 */
router.put('/:strategyId', authMiddleware, (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const updates = req.body;
  const strategy = strategies.get(strategyId);

  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  // Update allowed fields
  const allowedFields = ['name', 'description', 'riskLevel', 'parameters', 'status'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      strategy[field] = updates[field];
    }
  }

  strategy.updatedAt = new Date();
  strategies.set(strategyId, strategy);

  res.json({
    success: true,
    strategy,
  });
});

/**
 * DELETE /strategies/:strategyId
 * Archive a strategy
 */
router.delete('/:strategyId', authMiddleware, (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const strategy = strategies.get(strategyId);

  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  // Archive instead of delete
  strategy.status = 'archived';
  strategy.archivedAt = new Date();
  strategies.set(strategyId, strategy);

  res.json({
    success: true,
    message: 'Strategy archived',
  });
});

// ============================================================
// BACKTEST ROUTES
// ============================================================

/**
 * POST /strategies/:strategyId/backtest
 * Run a backtest
 */
router.post('/:strategyId/backtest', authMiddleware, async (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const {
    startDate,
    endDate,
    symbols,
    initialCapital = 100000,
  } = req.body;

  const strategy = strategies.get(strategyId);

  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  // Queue backtest
  res.json({
    success: true,
    message: 'Backtest queued',
    backtestId: `bt_${Date.now()}`,
    config: {
      strategyId,
      startDate: startDate || '2024-01-01',
      endDate: endDate || new Date().toISOString().split('T')[0],
      symbols: symbols || ['EURUSD', 'GBPUSD'],
      initialCapital,
    },
    status: 'running',
  });
});

/**
 * GET /strategies/:strategyId/backtest/:backtestId
 * Get backtest results
 */
router.get('/:strategyId/backtest/:backtestId', authMiddleware, (req: Request, res: Response) => {
  const { strategyId, backtestId } = req.params;

  // Mock backtest results
  res.json({
    backtestId,
    strategyId,
    status: 'completed',
    results: {
      totalReturn: 24.5,
      maxDrawdown: 8.2,
      sharpeRatio: 1.65,
      sortinoRatio: 2.1,
      winRate: 68,
      profitFactor: 1.95,
      totalTrades: 156,
      avgWin: 125,
      avgLoss: 85,
      expectancy: 42.5,
    },
    equity: [
      { date: '2024-01-01', value: 100000 },
      { date: '2024-06-01', value: 112500 },
      { date: '2024-12-01', value: 124500 },
    ],
  });
});

// ============================================================
// ADMIN ROUTES
// ============================================================

/**
 * GET /strategies/admin/pending
 * Get strategies pending approval
 */
router.get('/admin/pending', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const pending = Array.from(strategies.values()).filter(
    s => s.status === 'pending' || s.status === 'synthesizing'
  );

  res.json({
    total: pending.length,
    strategies: pending,
  });
});

/**
 * POST /strategies/admin/:strategyId/approve
 * Approve a synthesized strategy
 */
router.post('/admin/:strategyId/approve', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const strategy = strategies.get(strategyId);

  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  strategy.status = 'active';
  strategy.approvedAt = new Date();
  strategies.set(strategyId, strategy);

  res.json({
    success: true,
    message: 'Strategy approved and activated',
    strategy,
  });
});

/**
 * POST /strategies/admin/auto-synthesize
 * Trigger automatic synthesis based on current market regime
 */
router.post('/admin/auto-synthesize', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const regimeState = regimeDetector.getRegimeState();

  // Find bots that perform well in current regime
  // Then synthesize them
  res.json({
    success: true,
    message: 'Auto-synthesis initiated',
    currentRegime: regimeState.current,
    confidence: regimeState.confidence,
    status: 'synthesizing',
  });
});

export default router;

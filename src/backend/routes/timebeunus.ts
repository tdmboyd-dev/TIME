/**
 * TIMEBEUNUS Admin Routes
 *
 * OWNER-ONLY endpoints for full platform control:
 * - Manual trading (buy/sell)
 * - Batch trading
 * - Real-time trade visibility
 * - Investing
 * - Yield farming
 * - Automation toggles
 * - Bot evolution suggestions
 * - Platform fee management
 * - Full dashboard
 */

import { Router, Request, Response } from 'express';
import { timbeunusTradeService } from '../services/TimbeunusTradeService';
import { platformFeeService } from '../services/PlatformFeeService';
import { moneyMachineQuestionnaireService } from '../services/MoneyMachineQuestionnaireService';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('TimbeunusRoutes');

// Middleware to verify owner access
const ownerOnly = (req: Request, res: Response, next: any) => {
  // Check for admin key or owner role
  const adminKey = req.headers['x-admin-key'];
  const user = (req as any).user;

  if (adminKey === process.env.ADMIN_API_KEY || user?.role === 'owner' || user?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Owner access required' });
  }
};

// Apply owner middleware to all routes
router.use(ownerOnly);

// ============================================================
// DASHBOARD
// ============================================================

/**
 * GET /timebeunus/dashboard
 * Full owner dashboard with all data
 */
router.get('/dashboard', (_req: Request, res: Response) => {
  try {
    const dashboard = timbeunusTradeService.getOwnerDashboard();
    const feeStats = platformFeeService.getStats();

    res.json({
      success: true,
      dashboard: {
        ...dashboard,
        platformFees: feeStats,
      },
    });
  } catch (error) {
    logger.error('Dashboard error', { error });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ============================================================
// MANUAL TRADING
// ============================================================

/**
 * POST /timebeunus/trade
 * Execute a single trade
 */
router.post('/trade', async (req: Request, res: Response) => {
  try {
    const { symbol, action, quantity, orderType, limitPrice } = req.body;

    if (!symbol || !action || !quantity) {
      return res.status(400).json({ error: 'symbol, action, and quantity are required' });
    }

    const trade = await timbeunusTradeService.executeTrade(
      symbol,
      action,
      quantity,
      orderType || 'market',
      limitPrice
    );

    res.json({ success: true, trade });
  } catch (error) {
    logger.error('Trade error', { error });
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

/**
 * POST /timebeunus/trade/batch
 * Execute multiple trades at once
 */
router.post('/trade/batch', async (req: Request, res: Response) => {
  try {
    const { trades } = req.body;

    if (!trades || !Array.isArray(trades)) {
      return res.status(400).json({ error: 'trades array is required' });
    }

    const results = await timbeunusTradeService.executeBatchTrades(trades);

    res.json({
      success: true,
      trades: results,
      summary: {
        total: results.length,
        filled: results.filter(t => t.status === 'filled').length,
        rejected: results.filter(t => t.status === 'rejected').length,
      },
    });
  } catch (error) {
    logger.error('Batch trade error', { error });
    res.status(500).json({ error: 'Failed to execute batch trades' });
  }
});

/**
 * POST /timebeunus/trade/close-all
 * Emergency close all positions
 */
router.post('/trade/close-all', async (_req: Request, res: Response) => {
  try {
    const trades = await timbeunusTradeService.closeAllPositions();

    res.json({
      success: true,
      message: 'All positions closed',
      trades,
    });
  } catch (error) {
    logger.error('Close all error', { error });
    res.status(500).json({ error: 'Failed to close positions' });
  }
});

// ============================================================
// POSITIONS & TRADES
// ============================================================

/**
 * GET /timebeunus/positions
 * Get all current positions with real-time P&L
 */
router.get('/positions', (_req: Request, res: Response) => {
  try {
    const positions = timbeunusTradeService.getAllPositions();
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);

    res.json({
      success: true,
      positions,
      summary: {
        totalPositions: positions.length,
        totalValue,
        totalPnL,
        totalPnLPercent: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
      },
    });
  } catch (error) {
    logger.error('Positions error', { error });
    res.status(500).json({ error: 'Failed to get positions' });
  }
});

/**
 * GET /timebeunus/trades
 * Get trade history with gains/losses
 */
router.get('/trades', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const trades = timbeunusTradeService.getRecentTrades(limit);
    const stats = timbeunusTradeService.getTradeStats();

    res.json({
      success: true,
      trades,
      stats,
    });
  } catch (error) {
    logger.error('Trades error', { error });
    res.status(500).json({ error: 'Failed to get trades' });
  }
});

// ============================================================
// AUTOMATION TOGGLES
// ============================================================

/**
 * GET /timebeunus/automation
 * Get all automation toggle states
 */
router.get('/automation', (_req: Request, res: Response) => {
  try {
    const toggles = timbeunusTradeService.getAutomationToggles();

    res.json({
      success: true,
      toggles,
      descriptions: {
        autoTrade: 'Execute bot signals automatically',
        autoInvest: 'Reinvest profits into best opportunities',
        autoYield: 'Farm yields automatically in DeFi',
        autoRebalance: 'Rebalance portfolio to target allocations',
        autoHedge: 'Hedge positions on significant drawdown',
        autoScale: 'Scale position sizes based on confidence',
        autoTax: 'Tax-loss harvesting automation',
        autoCompound: 'Compound interest and yields',
      },
    });
  } catch (error) {
    logger.error('Automation error', { error });
    res.status(500).json({ error: 'Failed to get automation settings' });
  }
});

/**
 * PUT /timebeunus/automation
 * Update automation toggles
 */
router.put('/automation', (req: Request, res: Response) => {
  try {
    const toggles = req.body;
    timbeunusTradeService.setAllAutomationToggles(toggles);

    res.json({
      success: true,
      message: 'Automation settings updated',
      toggles: timbeunusTradeService.getAutomationToggles(),
    });
  } catch (error) {
    logger.error('Automation update error', { error });
    res.status(500).json({ error: 'Failed to update automation' });
  }
});

/**
 * PUT /timebeunus/automation/:toggle
 * Toggle a single automation setting
 */
router.put('/automation/:toggle', (req: Request, res: Response) => {
  try {
    const { toggle } = req.params;
    const { value } = req.body;

    timbeunusTradeService.setAutomationToggle(toggle as any, value);

    res.json({
      success: true,
      message: `${toggle} set to ${value}`,
      toggles: timbeunusTradeService.getAutomationToggles(),
    });
  } catch (error) {
    logger.error('Toggle error', { error });
    res.status(500).json({ error: 'Failed to update toggle' });
  }
});

// ============================================================
// INVESTING
// ============================================================

/**
 * POST /timebeunus/invest
 * Create a new investment
 */
router.post('/invest', async (req: Request, res: Response) => {
  try {
    const { symbol, amount, strategy } = req.body;

    if (!symbol || !amount) {
      return res.status(400).json({ error: 'symbol and amount are required' });
    }

    const result = await timbeunusTradeService.invest(symbol, amount, strategy || 'lump_sum');

    res.json({
      success: true,
      message: `Investment created: $${amount} in ${symbol}`,
      trades: Array.isArray(result) ? result : [result],
    });
  } catch (error) {
    logger.error('Invest error', { error });
    res.status(500).json({ error: 'Failed to create investment' });
  }
});

// ============================================================
// YIELD FARMING
// ============================================================

/**
 * GET /timebeunus/yield
 * Get available yield opportunities
 */
router.get('/yield', (_req: Request, res: Response) => {
  try {
    const opportunities = timbeunusTradeService.getYieldOpportunities();

    res.json({
      success: true,
      opportunities,
      bestOpportunity: opportunities.sort((a, b) => b.apy - a.apy)[0],
    });
  } catch (error) {
    logger.error('Yield error', { error });
    res.status(500).json({ error: 'Failed to get yield opportunities' });
  }
});

/**
 * POST /timebeunus/yield/deposit
 * Deposit to a yield opportunity
 */
router.post('/yield/deposit', async (req: Request, res: Response) => {
  try {
    const { opportunityId, amount } = req.body;

    if (!opportunityId || !amount) {
      return res.status(400).json({ error: 'opportunityId and amount are required' });
    }

    const result = await timbeunusTradeService.depositToYield(opportunityId, amount);

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    logger.error('Yield deposit error', { error });
    res.status(500).json({ error: 'Failed to deposit to yield' });
  }
});

// ============================================================
// BOT EVOLUTION SUGGESTIONS
// ============================================================

/**
 * GET /timebeunus/bot-suggestions
 * Get AI-suggested bot improvements
 */
router.get('/bot-suggestions', (_req: Request, res: Response) => {
  try {
    const suggestions = timbeunusTradeService.getBotSuggestions();

    res.json({
      success: true,
      suggestions,
      description: 'These bots are suggested based on system learning and market analysis.',
    });
  } catch (error) {
    logger.error('Suggestions error', { error });
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * POST /timebeunus/bot-suggestions/:id/create
 * Create a bot from a suggestion
 */
router.post('/bot-suggestions/:id/create', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await timbeunusTradeService.createSuggestedBot(id);

    res.json({
      success: result.success,
      message: `Created bot: ${result.botId}`,
      botId: result.botId,
    });
  } catch (error) {
    logger.error('Create bot error', { error });
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// ============================================================
// PLATFORM FEES
// ============================================================

/**
 * GET /timebeunus/fees
 * Get platform fee statistics
 */
router.get('/fees', (_req: Request, res: Response) => {
  try {
    const stats = platformFeeService.getStats();

    res.json({
      success: true,
      fees: stats,
    });
  } catch (error) {
    logger.error('Fees error', { error });
    res.status(500).json({ error: 'Failed to get fee stats' });
  }
});

/**
 * PUT /timebeunus/fees/config
 * Update fee configuration
 */
router.put('/fees/config', (req: Request, res: Response) => {
  try {
    const newConfig = platformFeeService.updateConfig(req.body);

    res.json({
      success: true,
      message: 'Fee configuration updated',
      config: newConfig,
    });
  } catch (error) {
    logger.error('Fee config error', { error });
    res.status(500).json({ error: 'Failed to update fee config' });
  }
});

// ============================================================
// MONEY MACHINE QUESTIONNAIRE (for users, managed by owner)
// ============================================================

/**
 * GET /timebeunus/questionnaire
 * Get Money Machine questionnaire questions
 */
router.get('/questionnaire', (_req: Request, res: Response) => {
  try {
    const questions = moneyMachineQuestionnaireService.getQuestions();

    res.json({
      success: true,
      questions,
    });
  } catch (error) {
    logger.error('Questionnaire error', { error });
    res.status(500).json({ error: 'Failed to get questionnaire' });
  }
});

export default router;

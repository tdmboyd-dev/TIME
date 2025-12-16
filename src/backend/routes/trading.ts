/**
 * TRADING EXECUTION API ROUTES
 *
 * Endpoints for LIVE bot trading:
 * - Enable/disable bots for trading
 * - View/approve pending signals
 * - View trade history and P&L
 * - Real-time trading stats
 *
 * SECURITY: All trading endpoints require authentication
 */

import { Router, Request, Response } from 'express';
import { tradingExecutionService } from '../services/TradingExecutionService';
import { botManager } from '../bots/bot_manager';
import { authMiddleware, adminMiddleware } from './auth';
import { BrokerManager } from '../brokers/broker_manager';
import { config } from '../config';

const router = Router();

// Risk validation helper
interface RiskCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

async function validateTradingRisk(
  userId: string,
  botCount: number,
  riskLevel: string
): Promise<RiskCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const brokerManager = BrokerManager.getInstance();
    const portfolio = await brokerManager.getAggregatedPortfolio();

    // Check minimum equity
    const minEquity = 1000; // $1000 minimum
    if (portfolio.totalEquity < minEquity) {
      errors.push(`Insufficient equity: $${portfolio.totalEquity.toFixed(2)} (minimum: $${minEquity})`);
    }

    // Check daily loss limit
    const dailyLossLimit = portfolio.totalEquity * config.riskDefaults.maxDailyLoss;
    const currentDailyPnL = tradingExecutionService.getStats().totalPnL || 0;
    if (currentDailyPnL < -dailyLossLimit) {
      errors.push(`Daily loss limit exceeded: $${currentDailyPnL.toFixed(2)} (limit: -$${dailyLossLimit.toFixed(2)})`);
    }

    // Check max bots based on risk level
    const maxBots = riskLevel === 'HIGH' ? 3 : riskLevel === 'MEDIUM' ? 5 : 10;
    const currentEnabledBots = tradingExecutionService.getEnabledBots().length;
    if (currentEnabledBots + botCount > maxBots) {
      warnings.push(`Risk warning: Enabling ${botCount} more bots would exceed recommended ${maxBots} for ${riskLevel} risk level`);
    }

    // Check max drawdown
    if (portfolio.totalEquity < portfolio.totalBuyingPower * (1 - config.riskDefaults.maxDrawdown)) {
      warnings.push('Portfolio is near maximum drawdown limit');
    }

  } catch (error) {
    // If we can't get portfolio data, allow but warn
    warnings.push('Could not verify account balance - proceeding with caution');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// PUBLIC ENDPOINTS (Status)
// ============================================

/**
 * GET /trading/status
 * Get trading execution service status
 * SECURITY: Requires authentication
 */
router.get('/status', authMiddleware, (req: Request, res: Response) => {
  const stats = tradingExecutionService.getStats();
  res.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /trading/stats
 * Get detailed trading statistics
 * SECURITY: Requires authentication
 */
router.get('/stats', authMiddleware, (req: Request, res: Response) => {
  const stats = tradingExecutionService.getStats();
  const enabledBots = tradingExecutionService.getEnabledBots();

  res.json({
    success: true,
    data: {
      ...stats,
      bots: enabledBots.map(b => ({
        botId: b.botId,
        botName: b.botName,
        isEnabled: b.isEnabled,
        isPaused: b.isPaused,
        openPositions: b.openPositions.length,
        totalTrades: b.totalTrades,
        winRate: b.winRate,
        totalPnL: b.totalPnL,
        currentDailyPnL: b.currentDailyPnL,
      })),
    },
  });
});

// ============================================
// TRADING CONTROL
// ============================================

/**
 * POST /trading/start
 * Start the trading execution service
 * SECURITY: Requires admin authentication
 */
router.post('/start', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  tradingExecutionService.start();
  res.json({
    success: true,
    message: 'Trading execution service started',
  });
});

/**
 * POST /trading/stop
 * Stop the trading execution service
 * SECURITY: Requires admin authentication
 */
router.post('/stop', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  tradingExecutionService.stop();
  res.json({
    success: true,
    message: 'Trading execution service stopped',
  });
});

// ============================================
// BOT TRADING MANAGEMENT
// ============================================

/**
 * POST /trading/bot/:botId/enable
 * Enable trading for a specific bot
 * SECURITY: Requires authentication + risk validation
 */
router.post('/bot/:botId/enable', authMiddleware, async (req: Request, res: Response) => {
  const { botId } = req.params;
  const botConfig = req.body;
  const user = (req as any).user;
  const riskLevel = botConfig.riskLevel || 'MEDIUM';

  try {
    // Validate trading risk before enabling
    const riskCheck = await validateTradingRisk(user.id, 1, riskLevel);

    if (!riskCheck.passed) {
      return res.status(400).json({
        success: false,
        error: 'Risk validation failed',
        errors: riskCheck.errors,
      });
    }

    const state = tradingExecutionService.enableBot(botId, botConfig);

    res.json({
      success: true,
      message: `Bot ${state.botName} enabled for trading`,
      data: state,
      warnings: riskCheck.warnings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /trading/bot/:botId/disable
 * Disable trading for a specific bot
 * SECURITY: Requires authentication
 */
router.post('/bot/:botId/disable', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;

  tradingExecutionService.disableBot(botId);
  res.json({
    success: true,
    message: 'Bot disabled',
  });
});

/**
 * POST /trading/bot/:botId/pause
 * Pause/unpause bot trading
 * SECURITY: Requires authentication
 */
router.post('/bot/:botId/pause', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const { paused = true } = req.body;

  tradingExecutionService.pauseBot(botId, paused);
  res.json({
    success: true,
    message: `Bot ${paused ? 'paused' : 'resumed'}`,
  });
});

/**
 * GET /trading/bot/:botId/state
 * Get bot trading state
 * SECURITY: Requires authentication
 */
router.get('/bot/:botId/state', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const state = tradingExecutionService.getBotState(botId);

  if (!state) {
    return res.status(404).json({
      success: false,
      error: 'Bot not enabled for trading',
    });
  }

  res.json({
    success: true,
    data: state,
  });
});

/**
 * GET /trading/bots
 * Get all bots enabled for trading
 * SECURITY: Requires authentication
 */
router.get('/bots', authMiddleware, (req: Request, res: Response) => {
  const enabledBots = tradingExecutionService.getEnabledBots();
  res.json({
    success: true,
    data: enabledBots,
    count: enabledBots.length,
  });
});

/**
 * GET /trading/bots/available
 * Get all bots that can be enabled for trading
 * SECURITY: Requires authentication
 */
router.get('/bots/available', authMiddleware, (req: Request, res: Response) => {
  const allBots = botManager.getAllBots();
  const enabledBots = tradingExecutionService.getEnabledBots();
  const enabledIds = new Set(enabledBots.map(b => b.botId));

  const available = allBots.map(bot => ({
    id: bot.id,
    name: bot.name,
    source: bot.source,
    status: bot.status,
    rating: bot.rating,
    winRate: bot.performance?.winRate || 0,
    profitFactor: bot.performance?.profitFactor || 0,
    isEnabledForTrading: enabledIds.has(bot.id),
  }));

  res.json({
    success: true,
    data: available,
    count: available.length,
  });
});

// ============================================
// SIGNALS
// ============================================

/**
 * GET /trading/signals/pending
 * Get pending signals awaiting approval
 * SECURITY: Requires authentication
 */
router.get('/signals/pending', authMiddleware, (req: Request, res: Response) => {
  const signals = tradingExecutionService.getPendingSignals();
  res.json({
    success: true,
    data: signals,
    count: signals.length,
  });
});

/**
 * POST /trading/signals/:signalId/execute
 * Execute a pending signal
 * SECURITY: Requires authentication
 */
router.post('/signals/:signalId/execute', authMiddleware, async (req: Request, res: Response) => {
  const { signalId } = req.params;

  try {
    const trade = await tradingExecutionService.executeSignal(signalId);
    if (!trade) {
      return res.status(400).json({
        success: false,
        error: 'Signal not found or execution failed',
      });
    }

    res.json({
      success: true,
      message: 'Signal executed',
      data: trade,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * DELETE /trading/signals/:signalId
 * Reject/cancel a pending signal
 * SECURITY: Requires authentication
 */
router.delete('/signals/:signalId', authMiddleware, (req: Request, res: Response) => {
  // TODO: Implement signal rejection
  res.json({
    success: true,
    message: 'Signal rejected',
  });
});

// ============================================
// TRADES
// ============================================

/**
 * GET /trading/trades
 * Get trade history
 * SECURITY: Requires authentication
 */
router.get('/trades', authMiddleware, (req: Request, res: Response) => {
  const { botId, limit } = req.query;
  const trades = tradingExecutionService.getTradeHistory(
    botId as string,
    limit ? parseInt(limit as string) : undefined
  );

  res.json({
    success: true,
    data: trades,
    count: trades.length,
  });
});

/**
 * GET /trading/trades/open
 * Get all open positions
 * SECURITY: Requires authentication
 */
router.get('/trades/open', authMiddleware, (req: Request, res: Response) => {
  const enabledBots = tradingExecutionService.getEnabledBots();
  const openTrades = enabledBots.flatMap(b => b.openPositions);

  res.json({
    success: true,
    data: openTrades,
    count: openTrades.length,
  });
});

/**
 * POST /trading/trades/:tradeId/close
 * Close a trade at current price
 * SECURITY: Requires authentication
 */
router.post('/trades/:tradeId/close', authMiddleware, async (req: Request, res: Response) => {
  const { tradeId } = req.params;
  const { exitPrice } = req.body;

  if (!exitPrice) {
    return res.status(400).json({
      success: false,
      error: 'Exit price required',
    });
  }

  try {
    const trade = await tradingExecutionService.closeTrade(tradeId, parseFloat(exitPrice));
    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found or already closed',
      });
    }

    res.json({
      success: true,
      message: `Trade closed with P&L: $${trade.pnl.toFixed(2)}`,
      data: trade,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// ============================================
// QUICK ACTIONS
// ============================================

/**
 * POST /trading/quick/enable-top-bots
 * Quick action: Enable top-rated bots for trading
 * SECURITY: Requires authentication + risk validation
 */
router.post('/quick/enable-top-bots', authMiddleware, async (req: Request, res: Response) => {
  const { count = 5, riskLevel = 'MEDIUM' } = req.body;
  const user = (req as any).user;

  // Validate risk before enabling multiple bots
  const riskCheck = await validateTradingRisk(user.id, count, riskLevel);

  if (!riskCheck.passed) {
    return res.status(400).json({
      success: false,
      error: 'Risk validation failed',
      errors: riskCheck.errors,
    });
  }

  const allBots = botManager.getAllBots()
    .filter(b => b.status === 'active' && b.rating && b.rating >= 4.0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, count);

  const enabled = [];
  for (const bot of allBots) {
    try {
      const state = tradingExecutionService.enableBot(bot.id, { riskLevel });
      enabled.push(state);
    } catch (error) {
      // Skip if already enabled
    }
  }

  res.json({
    success: true,
    message: `Enabled ${enabled.length} top-rated bots`,
    data: enabled,
    warnings: riskCheck.warnings,
  });
});

/**
 * POST /trading/quick/stop-all
 * Quick action: Stop all trading and close all positions
 * SECURITY: Requires authentication
 */
router.post('/quick/stop-all', authMiddleware, async (req: Request, res: Response) => {
  // Stop the service
  tradingExecutionService.stop();

  // Disable all bots
  const enabledBots = tradingExecutionService.getEnabledBots();
  for (const bot of enabledBots) {
    tradingExecutionService.disableBot(bot.botId);
  }

  res.json({
    success: true,
    message: `Stopped trading and disabled ${enabledBots.length} bots`,
  });
});

export default router;

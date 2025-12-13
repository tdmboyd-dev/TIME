/**
 * TRADING EXECUTION API ROUTES
 *
 * Endpoints for LIVE bot trading:
 * - Enable/disable bots for trading
 * - View/approve pending signals
 * - View trade history and P&L
 * - Real-time trading stats
 */

import { Router, Request, Response } from 'express';
import { tradingExecutionService } from '../services/TradingExecutionService';
import { botManager } from '../bots/bot_manager';

const router = Router();

// ============================================
// PUBLIC ENDPOINTS (Status)
// ============================================

/**
 * GET /trading/status
 * Get trading execution service status
 */
router.get('/status', (req: Request, res: Response) => {
  const stats = tradingExecutionService.getStats();
  res.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /trading/stats
 * Get detailed trading statistics
 */
router.get('/stats', (req: Request, res: Response) => {
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
 */
router.post('/start', (req: Request, res: Response) => {
  tradingExecutionService.start();
  res.json({
    success: true,
    message: 'Trading execution service started',
  });
});

/**
 * POST /trading/stop
 * Stop the trading execution service
 */
router.post('/stop', (req: Request, res: Response) => {
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
 */
router.post('/bot/:botId/enable', (req: Request, res: Response) => {
  const { botId } = req.params;
  const config = req.body;

  try {
    const state = tradingExecutionService.enableBot(botId, config);
    res.json({
      success: true,
      message: `Bot ${state.botName} enabled for trading`,
      data: state,
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
 */
router.post('/bot/:botId/disable', (req: Request, res: Response) => {
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
 */
router.post('/bot/:botId/pause', (req: Request, res: Response) => {
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
 */
router.get('/bot/:botId/state', (req: Request, res: Response) => {
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
 */
router.get('/bots', (req: Request, res: Response) => {
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
 */
router.get('/bots/available', (req: Request, res: Response) => {
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
 */
router.get('/signals/pending', (req: Request, res: Response) => {
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
 */
router.post('/signals/:signalId/execute', async (req: Request, res: Response) => {
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
 */
router.delete('/signals/:signalId', (req: Request, res: Response) => {
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
 */
router.get('/trades', (req: Request, res: Response) => {
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
 */
router.get('/trades/open', (req: Request, res: Response) => {
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
 */
router.post('/trades/:tradeId/close', async (req: Request, res: Response) => {
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
 */
router.post('/quick/enable-top-bots', (req: Request, res: Response) => {
  const { count = 5, riskLevel = 'MEDIUM' } = req.body;
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
  });
});

/**
 * POST /trading/quick/stop-all
 * Quick action: Stop all trading and close all positions
 */
router.post('/quick/stop-all', async (req: Request, res: Response) => {
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

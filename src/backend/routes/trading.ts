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
import { requireFeature, requireTier, checkTradeLimit, calculateTradeFee } from '../middleware/tierAccess';

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
router.delete('/signals/:signalId', authMiddleware, async (req: Request, res: Response) => {
  const { signalId } = req.params;
  const userId = (req as any).user?.id || 'system';

  try {
    // Get the signal from trading state
    const { tradingStateRepository } = await import('../database/repositories');
    const signals = await tradingStateRepository.getPendingSignals();
    const signal = signals.find((s: any) => s.id === signalId);

    if (!signal) {
      return res.status(404).json({
        success: false,
        error: 'Signal not found or already processed',
      });
    }

    // Cancel/reject the signal by marking it as CANCELLED
    await tradingStateRepository.saveSignal(signalId, {
      ...signal,
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy: userId,
    } as any);

    res.json({
      success: true,
      message: 'Signal rejected successfully',
      data: {
        signalId,
        status: 'rejected',
        rejectedAt: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject signal',
    });
  }
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

// ============================================
// DROPBOT / AUTOPILOT ENDPOINTS
// ============================================

import { autoPilotCapital } from '../autopilot/dropbot';
import { tradingStateRepository } from '../database/repositories';

/**
 * POST /trading/autopilot/create
 * Create a new AutoPilot pilot
 * SECURITY: Requires authentication + PRO tier (autopilot feature)
 */
router.post('/autopilot/create', authMiddleware, requireFeature('autopilot'), async (req: Request, res: Response) => {
  const { riskProfile, initialCapital } = req.body;
  const userId = (req as any).user?.id || 'anonymous';

  if (!initialCapital || initialCapital < 10) {
    return res.status(400).json({
      success: false,
      error: 'Minimum initial capital is $10',
    });
  }

  try {
    // Create pilot with autoPilotCapital
    const pilot = await autoPilotCapital.createPilot(userId, initialCapital, {
      riskDNA: riskProfile || 'balanced',
    });
    const pilotId = pilot.id;

    // Save to database for persistence (use botId field for pilotId)
    await tradingStateRepository.saveBotState(pilotId, {
      botName: `AutoPilot-${userId}`,
      isEnabled: true,
      riskLevel: riskProfile === 'yolo' || riskProfile === 'aggressive' ? 'HIGH' :
                 riskProfile === 'ultra_safe' || riskProfile === 'careful' ? 'LOW' : 'MEDIUM',
      maxPositionSize: initialCapital * 0.1,
      totalPnL: 0,
    } as any);

    res.json({
      success: true,
      pilotId,
      pilot,
    });
  } catch (error: any) {
    console.error('Failed to create AutoPilot:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create AutoPilot',
    });
  }
});

/**
 * GET /trading/autopilot/:pilotId/trades
 * Get trades for a pilot
 * SECURITY: Requires authentication
 */
router.get('/autopilot/:pilotId/trades', authMiddleware, async (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    // Get trades from database - filter by pilotId
    const allTrades = await tradingStateRepository.getTrades(pilotId);
    const trades = allTrades.slice(0, limit);

    res.json({
      success: true,
      trades: trades.map((t: any) => ({
        id: t._id?.toString() || t.id,
        timestamp: t.timestamp,
        symbol: t.symbol,
        side: t.side,
        quantity: t.quantity,
        price: t.price,
        pnl: t.pnl || 0,
        reason: t.reason || t.signal?.reason,
        botName: t.botName || t.signal?.botName,
      })),
    });
  } catch (error: any) {
    console.error('Failed to get trades:', error);
    res.json({
      success: true,
      trades: [], // Return empty if no trades
    });
  }
});

/**
 * GET /trading/autopilot/:pilotId/stats
 * Get stats for a pilot
 * SECURITY: Requires authentication
 */
router.get('/autopilot/:pilotId/stats', authMiddleware, async (req: Request, res: Response) => {
  const { pilotId } = req.params;

  try {
    const pilot = autoPilotCapital.getPilot(pilotId);
    const snapshot = autoPilotCapital.getSnapshot(pilotId);

    if (!pilot) {
      return res.status(404).json({
        success: false,
        error: 'Pilot not found',
      });
    }

    // Calculate stats from trades
    const trades = await tradingStateRepository.getTrades(pilotId);
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => t.pnl > 0).length;
    const totalPnL = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

    res.json({
      success: true,
      currentValue: snapshot?.totalValue || pilot.initialDeposit + totalPnL,
      totalReturn: totalPnL,
      returnPercent: pilot.initialDeposit > 0 ? (totalPnL / pilot.initialDeposit) * 100 : 0,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      totalTrades,
      winningTrades,
      losingTrades: totalTrades - winningTrades,
    });
  } catch (error: any) {
    console.error('Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats',
    });
  }
});

/**
 * GET /trading/autopilot/:pilotId/balance
 * Get available balance for withdrawal
 * SECURITY: Requires authentication
 */
router.get('/autopilot/:pilotId/balance', authMiddleware, (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const balance = autoPilotCapital.getAvailableBalance(pilotId);

  res.json({
    success: true,
    data: balance,
  });
});

/**
 * POST /trading/autopilot/:pilotId/pause
 * Pause trading without withdrawing
 * SECURITY: Requires authentication
 */
router.post('/autopilot/:pilotId/pause', authMiddleware, async (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const result = await autoPilotCapital.pauseTrading(pilotId);

  res.json(result);
});

/**
 * POST /trading/autopilot/:pilotId/resume
 * Resume trading after pause
 * SECURITY: Requires authentication
 */
router.post('/autopilot/:pilotId/resume', authMiddleware, async (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const result = await autoPilotCapital.resumeTrading(pilotId);

  res.json(result);
});

/**
 * POST /trading/autopilot/:pilotId/withdraw-all
 * Withdraw all funds - closes all positions
 * SECURITY: Requires authentication
 */
router.post('/autopilot/:pilotId/withdraw-all', authMiddleware, async (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const result = await autoPilotCapital.withdrawAll(pilotId);

  res.json(result);
});

/**
 * POST /trading/autopilot/:pilotId/withdraw
 * Partial withdrawal - specify amount
 * SECURITY: Requires authentication
 */
router.post('/autopilot/:pilotId/withdraw', authMiddleware, async (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount. Please specify a positive amount to withdraw.',
    });
  }

  const result = await autoPilotCapital.withdrawPartial(pilotId, amount);

  res.json(result);
});

/**
 * POST /trading/autopilot/:pilotId/exit
 * Start exit ramp - gradual exit from all positions
 * SECURITY: Requires authentication
 */
router.post('/autopilot/:pilotId/exit', authMiddleware, async (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const { strategy = 'optimal' } = req.body;

  try {
    const exitRamp = await autoPilotCapital.initiateExitRamp(pilotId, strategy);
    res.json({
      success: true,
      data: exitRamp,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /trading/autopilot/:pilotId
 * Get pilot status and snapshot
 * SECURITY: Requires authentication
 */
router.get('/autopilot/:pilotId', authMiddleware, (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const pilot = autoPilotCapital.getPilot(pilotId);
  const snapshot = autoPilotCapital.getSnapshot(pilotId);

  if (!pilot) {
    return res.status(404).json({
      success: false,
      message: 'Pilot not found',
    });
  }

  res.json({
    success: true,
    data: {
      pilot,
      snapshot,
    },
  });
});

/**
 * POST /trading/autopilot/:pilotId/live-trading
 * Enable/disable REAL trading for a pilot
 * SECURITY: Requires authentication
 * WARNING: When enabled, trades will execute on REAL brokers!
 */
router.post('/autopilot/:pilotId/live-trading', authMiddleware, (req: Request, res: Response) => {
  const { pilotId } = req.params;
  const { enabled } = req.body;

  const pilot = autoPilotCapital.getPilot(pilotId);
  if (!pilot) {
    return res.status(404).json({
      success: false,
      message: 'Pilot not found',
    });
  }

  // Check broker status before enabling live trading
  const brokerManager = BrokerManager.getInstance();
  const brokerStatus = brokerManager.getStatus();

  if (enabled && brokerStatus.connectedBrokers === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot enable live trading - no brokers connected',
      brokerStatus,
    });
  }

  // Toggle live trading
  pilot.liveTrading = !!enabled;

  res.json({
    success: true,
    message: enabled ? '🔴 LIVE TRADING ENABLED - Real orders will be placed!' : '📝 Paper trading mode enabled',
    data: {
      pilotId,
      liveTrading: pilot.liveTrading,
      brokerStatus,
    },
  });
});

/**
 * GET /trading/broker-status
 * Get status of all connected brokers
 */
router.get('/broker-status', (req: Request, res: Response) => {
  const brokerManager = BrokerManager.getInstance();
  const status = brokerManager.getStatus();

  res.json({
    success: true,
    data: status,
  });
});

// ============================================
// TIMEBEUNUS AUTO-TRADE CONTROL
// ============================================

// TIMEBEUNUS state - Now persisted to MongoDB!
interface TimebeunusStateType {
  isActive: boolean;
  dominanceMode: string;
  autoTradeEnabled: boolean;
  startedAt: Date | null;
  totalTrades: number;
  totalPnL: number;
  enabledStrategies: string[];
}

// Default state (will be overwritten from DB)
let timebeunusState: TimebeunusStateType = {
  isActive: false,
  dominanceMode: 'balanced',
  autoTradeEnabled: false,
  startedAt: null,
  totalTrades: 0,
  totalPnL: 0,
  enabledStrategies: [],
};

// Load TIMEBEUNUS state from MongoDB on startup
async function loadTimebeunusState(): Promise<void> {
  try {
    const { databaseManager } = await import('../database/connection');
    const db = databaseManager.getDatabase();
    if (db && 'collection' in db) {
      const savedState = await (db as any).collection('timebeunus_state').findOne({ _id: 'global' });
      if (savedState) {
        timebeunusState = {
          isActive: savedState.isActive ?? false,
          dominanceMode: savedState.dominanceMode ?? 'balanced',
          autoTradeEnabled: savedState.autoTradeEnabled ?? false,
          startedAt: savedState.startedAt ? new Date(savedState.startedAt) : null,
          totalTrades: savedState.totalTrades ?? 0,
          totalPnL: savedState.totalPnL ?? 0,
          enabledStrategies: savedState.enabledStrategies ?? [],
        };
        console.log('[TIMEBEUNUS] State loaded from MongoDB:', timebeunusState);
      }
    }
  } catch (error) {
    console.error('[TIMEBEUNUS] Failed to load state from MongoDB:', error);
  }
}

// Save TIMEBEUNUS state to MongoDB
async function saveTimebeunusState(): Promise<void> {
  try {
    const { databaseManager } = await import('../database/connection');
    const db = databaseManager.getDatabase();
    if (db && 'collection' in db) {
      await (db as any).collection('timebeunus_state').updateOne(
        { _id: 'global' },
        { $set: { ...timebeunusState, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log('[TIMEBEUNUS] State saved to MongoDB');
    }
  } catch (error) {
    console.error('[TIMEBEUNUS] Failed to save state to MongoDB:', error);
  }
}

// Load state on module init
loadTimebeunusState();

/**
 * GET /trading/timebeunus/status
 * Get TIMEBEUNUS auto-trade status
 */
router.get('/timebeunus/status', (req: Request, res: Response) => {
  const enabledBots = tradingExecutionService.getEnabledBots();
  const stats = tradingExecutionService.getStats();

  res.json({
    success: true,
    data: {
      ...timebeunusState,
      enabledBotCount: enabledBots.length,
      tradingStats: stats,
    },
  });
});

/**
 * POST /trading/timebeunus/start
 * Start TIMEBEUNUS auto-trading
 * SECURITY: Requires admin role
 */
router.post('/timebeunus/start', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { dominanceMode = 'balanced', enableTopBots = 5 } = req.body;

  // Only admin/owner can start TIMEBEUNUS
  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required to control TIMEBEUNUS',
    });
  }

  try {
    // Get top performing bots
    const allBots = botManager.getAllBots();
    const topBots = allBots
      .filter(b => b.status === 'active' && b.performance)
      .sort((a, b) => (b.performance?.winRate || 0) - (a.performance?.winRate || 0))
      .slice(0, enableTopBots);

    // Enable top bots for trading
    const enabledBots: string[] = [];
    for (const bot of topBots) {
      await tradingExecutionService.enableBot(bot.id);
      enabledBots.push(bot.name);
    }

    // Start the trading engine if not running
    tradingExecutionService.start();

    // Update state
    timebeunusState = {
      isActive: true,
      dominanceMode,
      autoTradeEnabled: true,
      startedAt: new Date(),
      totalTrades: 0,
      totalPnL: 0,
      enabledStrategies: enabledBots,
    };

    // Persist to MongoDB
    await saveTimebeunusState();

    res.json({
      success: true,
      message: 'TIMEBEUNUS auto-trading ACTIVATED!',
      data: {
        ...timebeunusState,
        enabledBots: enabledBots,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /trading/timebeunus/pause
 * Pause TIMEBEUNUS auto-trading (keeps positions open)
 * SECURITY: Requires admin role
 */
router.post('/timebeunus/pause', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  // Stop the trading engine
  tradingExecutionService.stop();

  timebeunusState.isActive = false;
  timebeunusState.autoTradeEnabled = false;

  // Persist to MongoDB
  await saveTimebeunusState();

  res.json({
    success: true,
    message: 'TIMEBEUNUS paused. Existing positions remain open.',
    data: timebeunusState,
  });
});

/**
 * POST /trading/timebeunus/resume
 * Resume TIMEBEUNUS auto-trading
 * SECURITY: Requires admin role
 */
router.post('/timebeunus/resume', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  // Resume the trading engine
  tradingExecutionService.start();

  timebeunusState.isActive = true;
  timebeunusState.autoTradeEnabled = true;

  res.json({
    success: true,
    message: 'TIMEBEUNUS resumed! Auto-trading active.',
    data: timebeunusState,
  });
});

/**
 * POST /trading/timebeunus/mode
 * Change TIMEBEUNUS dominance mode
 * SECURITY: Requires admin role
 */
router.post('/timebeunus/mode', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { mode } = req.body;

  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  const validModes = ['stealth', 'defensive', 'balanced', 'aggressive', 'competition', 'destroy'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({
      success: false,
      error: `Invalid mode. Valid modes: ${validModes.join(', ')}`,
    });
  }

  timebeunusState.dominanceMode = mode;

  res.json({
    success: true,
    message: `TIMEBEUNUS mode set to: ${mode.toUpperCase()}`,
    data: timebeunusState,
  });
});

/**
 * POST /trading/timebeunus/stop
 * Stop TIMEBEUNUS and close all positions
 * SECURITY: Requires admin role
 */
router.post('/timebeunus/stop', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  try {
    // Stop engine first
    tradingExecutionService.stop();

    // Disable all bots
    const enabledBots = tradingExecutionService.getEnabledBots();
    for (const bot of enabledBots) {
      tradingExecutionService.disableBot(bot.botId);
    }

    // Reset state
    timebeunusState = {
      isActive: false,
      dominanceMode: 'balanced',
      autoTradeEnabled: false,
      startedAt: null,
      totalTrades: timebeunusState.totalTrades,
      totalPnL: timebeunusState.totalPnL,
      enabledStrategies: [],
    };

    res.json({
      success: true,
      message: 'TIMEBEUNUS stopped. All bots disabled.',
      data: timebeunusState,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// TEST ORDER ENDPOINT (Admin only)
// ============================================

// Admin test key for quick testing (set as env var)
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || 'TIME_ADMIN_TEST_2025';

/**
 * GET /trading/test-broker
 * Quick broker connectivity test - uses admin test key
 * Returns account info and positions without placing orders
 */
router.get('/test-broker', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== ADMIN_TEST_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin test key. Set x-admin-key header.',
      });
    }

    const brokerManager = BrokerManager.getInstance();
    const status = brokerManager.getStatus();

    // Get account info from connected brokers
    const accountInfo: any = {};
    for (const brokerInfo of status.brokers) {
      if (brokerInfo.connected) {
        try {
          const broker = brokerManager.getBroker(brokerInfo.id);
          if (broker) {
            const account = await broker.getAccount();
            const positions = await broker.getPositions();
            accountInfo[brokerInfo.id] = {
              account: {
                id: account.id,
                equity: account.equity,
                cash: account.cash,
                buyingPower: account.buyingPower,
                currency: account.currency,
              },
              positions: positions.map(p => ({
                symbol: p.symbol,
                quantity: p.quantity,
                entryPrice: p.entryPrice,
                currentPrice: p.currentPrice,
                unrealizedPnL: p.unrealizedPnL,
              })),
            };
          }
        } catch (err: any) {
          accountInfo[brokerInfo.id] = { error: err.message };
        }
      }
    }

    res.json({
      success: true,
      data: {
        brokerStatus: status,
        accounts: accountInfo,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test brokers',
    });
  }
});

/**
 * POST /trading/test-trade
 * Quick test trade endpoint - uses admin test key
 * Places a small test trade (1 share of specified symbol)
 */
router.post('/test-trade', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== ADMIN_TEST_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin test key. Set x-admin-key header.',
      });
    }

    const { symbol = 'AAPL', side = 'buy', quantity = 1, broker = 'alpaca' } = req.body;

    const brokerManager = BrokerManager.getInstance();
    const status = brokerManager.getStatus();

    // Check if requested broker is connected
    const brokerInfo = status.brokers.find(b => b.id === broker);
    if (!brokerInfo || !brokerInfo.connected) {
      return res.status(400).json({
        success: false,
        error: `Broker ${broker} is not connected`,
        brokerStatus: status,
      });
    }

    // Submit test order
    const orderResult = await brokerManager.submitOrder({
      symbol,
      side: side as 'buy' | 'sell',
      type: 'market',
      quantity: Number(quantity),
    }, broker);

    res.json({
      success: true,
      message: `Test trade submitted successfully to ${broker}`,
      data: {
        order: orderResult.order,
        broker: broker,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit test trade',
    });
  }
});

/**
 * POST /trading/test-order
 * Submit a test order to verify broker connectivity
 * PAPER MODE ONLY - requires admin authentication
 */
router.post('/test-order', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol = 'AAPL', side = 'buy', quantity = 1, broker = 'alpaca' } = req.body;

    const brokerManager = BrokerManager.getInstance();
    const status = brokerManager.getStatus();

    // Check if requested broker is connected
    const brokerInfo = status.brokers.find(b => b.id === broker);
    if (!brokerInfo || !brokerInfo.connected) {
      return res.status(400).json({
        success: false,
        error: `Broker ${broker} is not connected`,
        brokerStatus: status,
      });
    }

    // Submit test order
    const orderResult = await brokerManager.submitOrder({
      symbol,
      side: side as 'buy' | 'sell',
      type: 'market',
      quantity: Number(quantity),
    }, broker);

    res.json({
      success: true,
      message: `Test order submitted successfully to ${broker}`,
      data: {
        order: orderResult.order,
        broker: broker,
        brokerStatus: status,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit test order',
    });
  }
});

/**
 * GET /trading/account
 * Get broker account information
 */
router.get('/account', authMiddleware, async (req: Request, res: Response) => {
  try {
    const brokerManager = BrokerManager.getInstance();
    const portfolio = await brokerManager.getAggregatedPortfolio();

    res.json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get account info',
    });
  }
});

/**
 * GET /trading/positions
 * Get all positions across brokers
 */
router.get('/positions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const brokerManager = BrokerManager.getInstance();
    const portfolio = await brokerManager.getAggregatedPortfolio();

    // Convert positions Map to array
    const positionsArray: any[] = [];
    portfolio.positions.forEach((pos) => {
      positionsArray.push(pos);
    });

    res.json({
      success: true,
      data: {
        positions: positionsArray,
        totalEquity: portfolio.totalEquity,
        totalCash: portfolio.totalCash,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get positions',
    });
  }
});

// ============================================
// BOT TRADING TEST ENDPOINTS (Admin Test Key)
// ============================================

/**
 * GET /trading/test-bots
 * Get all bots and their trading states
 * Uses admin test key for quick testing
 */
router.get('/test-bots', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== ADMIN_TEST_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin test key. Set x-admin-key header.',
      });
    }

    const allBots = botManager.getAllBots();
    const enabledBots = tradingExecutionService.getEnabledBots();
    const stats = tradingExecutionService.getStats();

    res.json({
      success: true,
      data: {
        totalBots: allBots.length,
        enabledForTrading: enabledBots.length,
        bots: allBots.slice(0, 20).map(bot => ({
          id: bot.id,
          name: bot.name,
          source: bot.source,
          status: bot.status,
          strategies: bot.fingerprint?.strategyType || [],
          tradingEnabled: enabledBots.some(e => e.botId === bot.id),
        })),
        tradingStats: stats,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get bots',
    });
  }
});

/**
 * POST /trading/test-bot-enable
 * Enable a bot for trading
 * Uses admin test key for quick testing
 */
router.post('/test-bot-enable', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== ADMIN_TEST_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin test key. Set x-admin-key header.',
      });
    }

    const { botId, maxPositionSize = 500, maxDailyTrades = 5 } = req.body;

    if (!botId) {
      return res.status(400).json({
        success: false,
        error: 'botId is required',
      });
    }

    // Enable the bot for trading
    const state = tradingExecutionService.enableBot(botId, {
      maxPositionSize,
      maxDailyTrades,
      riskLevel: 'LOW',
    });

    res.json({
      success: true,
      message: `Bot ${state.botName} enabled for trading!`,
      data: state,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enable bot',
    });
  }
});

/**
 * POST /trading/test-bot-signal
 * Have a bot submit a test trade signal
 * Uses admin test key for quick testing
 */
router.post('/test-bot-signal', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== ADMIN_TEST_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin test key. Set x-admin-key header.',
      });
    }

    const { botId, symbol = 'AAPL', side = 'BUY', quantity = 1, confidence = 85 } = req.body;

    if (!botId) {
      return res.status(400).json({
        success: false,
        error: 'botId is required',
      });
    }

    const bot = botManager.getBot(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: `Bot ${botId} not found`,
      });
    }

    // Submit a signal from this bot
    const signal = tradingExecutionService.submitSignal({
      botId,
      botName: bot.name,
      symbol,
      side: side.toUpperCase() as 'BUY' | 'SELL',
      type: 'MARKET',
      quantity,
      confidence,
      reasoning: 'Test signal submitted via admin endpoint',
    });

    res.json({
      success: true,
      message: `Signal submitted from ${bot.name}`,
      data: {
        signal,
        botState: tradingExecutionService.getBotState(botId),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit signal',
    });
  }
});

/**
 * POST /trading/test-bot-trade
 * Complete end-to-end bot trade test: enable bot, submit signal, execute
 * Uses admin test key for quick testing
 */
router.post('/test-bot-trade', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== ADMIN_TEST_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin test key. Set x-admin-key header.',
      });
    }

    const { botId, symbol = 'AAPL', side = 'BUY', quantity = 1 } = req.body;

    // Get first bot if none specified
    let targetBotId = botId;
    if (!targetBotId) {
      const allBots = botManager.getAllBots();
      if (allBots.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No bots available. Create some bots first.',
        });
      }
      targetBotId = allBots[0].id;
    }

    const bot = botManager.getBot(targetBotId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: `Bot ${targetBotId} not found`,
      });
    }

    // Step 1: Enable bot for trading
    const state = tradingExecutionService.enableBot(targetBotId, {
      maxPositionSize: 1000,
      maxDailyTrades: 10,
      riskLevel: 'LOW',
    });

    // Step 2: Start the execution service
    tradingExecutionService.start();

    // Step 3: Submit signal (will auto-execute because requireApproval is false)
    const signal = tradingExecutionService.submitSignal({
      botId: targetBotId,
      botName: bot.name,
      symbol,
      side: side.toUpperCase() as 'BUY' | 'SELL',
      type: 'MARKET',
      quantity,
      confidence: 90,
      reasoning: `Test ${side} order from ${bot.name} via admin endpoint`,
    });

    // Get trading stats
    const stats = tradingExecutionService.getStats();
    const botState = tradingExecutionService.getBotState(targetBotId);

    res.json({
      success: true,
      message: `Bot ${bot.name} submitted ${side} signal for ${quantity} ${symbol}`,
      data: {
        bot: {
          id: bot.id,
          name: bot.name,
          source: bot.source,
        },
        signal,
        botState,
        tradingStats: stats,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute bot trade',
    });
  }
});

/**
 * GET /trading/test-bot-trades
 * Get all executed trades from bots
 * Uses admin test key for quick testing
 */
router.get('/test-bot-trades', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== ADMIN_TEST_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin test key. Set x-admin-key header.',
      });
    }

    const stats = tradingExecutionService.getStats();
    const enabledBots = tradingExecutionService.getEnabledBots();

    res.json({
      success: true,
      data: {
        stats,
        enabledBots: enabledBots.map(b => ({
          botId: b.botId,
          botName: b.botName,
          isEnabled: b.isEnabled,
          totalTrades: b.totalTrades,
          openPositions: b.openPositions.length,
          totalPnL: b.totalPnL,
          winRate: b.winRate,
          lastSignal: b.lastSignal,
          lastTrade: b.lastTrade,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get bot trades',
    });
  }
});

export default router;

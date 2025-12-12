/**
 * BIG MOVES ALERTS API ROUTES
 *
 * Endpoints for the alert system and AI Trade God Bot
 */

import { Router, Request, Response } from 'express';
import { bigMovesAlertService, RISK_OPTIONS } from '../services/BigMovesAlertService';
import { aiTradeGodBot } from '../services/AITradeGodBot';

const router = Router();

// ============================================
// ALERTS ENDPOINTS
// ============================================

/**
 * GET /alerts
 * Get all alerts with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { priority, category, limit = 50 } = req.query;

    const alerts = bigMovesAlertService.getAlerts({
      priority: priority as any,
      category: category as any
    }).slice(0, Number(limit));

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /alerts/critical
 * Get only critical alerts (requires immediate action)
 */
router.get('/critical', async (req: Request, res: Response) => {
  try {
    const alerts = bigMovesAlertService.getAlerts({ priority: 'CRITICAL' });

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    bigMovesAlertService.acknowledgeAlert(id);

    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/:id/execute
 * Execute a one-click action from an alert
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actionId, riskLevel } = req.body;

    if (!actionId) {
      return res.status(400).json({
        success: false,
        error: 'actionId is required'
      });
    }

    const result = await bigMovesAlertService.executeAction(id, actionId);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /alerts/risk-options
 * Get available risk level configurations
 */
router.get('/risk-options', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: RISK_OPTIONS
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/subscribe
 * Subscribe to alerts (WebSocket upgrade or webhook URL)
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, categories, priorities } = req.body;

    // In production: Set up webhook or return WebSocket info
    const subscriptionId = `sub-${Date.now()}`;

    bigMovesAlertService.subscribe(subscriptionId, (alert) => {
      // Filter by preferences
      if (categories && !categories.includes(alert.category)) return;
      if (priorities && !priorities.includes(alert.priority)) return;

      // In production: Send to webhook
      console.log(`[Webhook] Sending alert to ${webhookUrl}`);
    });

    res.json({
      success: true,
      data: {
        subscriptionId,
        message: 'Subscribed to alerts',
        websocket: 'ws://localhost:3001/ws/alerts'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// AI TRADE GOD BOT ENDPOINTS
// ============================================

/**
 * GET /alerts/bots
 * Get all bots
 */
router.get('/bots', async (req: Request, res: Response) => {
  try {
    const bots = aiTradeGodBot.getAllBots();

    res.json({
      success: true,
      data: bots,
      count: bots.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/bots
 * Create a new bot
 */
router.post('/bots', async (req: Request, res: Response) => {
  try {
    const botConfig = req.body;

    const bot = aiTradeGodBot.createBot({
      name: botConfig.name || 'New Bot',
      owner: botConfig.owner || 'admin',
      isPublic: false,
      strategies: botConfig.strategies || [
        {
          id: 'dca-default',
          name: 'DCA Strategy',
          type: 'DCA',
          weight: 100,
          parameters: {
            amount: 100,
            interval: 'DAILY',
            assets: ['BTC', 'ETH'],
            dipBuyEnabled: true,
            dipThreshold: 5
          },
          enabled: true
        }
      ],
      riskLevel: botConfig.riskLevel || 'MODERATE',
      maxPositionSize: botConfig.maxPositionSize || 1000,
      maxDrawdown: botConfig.maxDrawdown || 20,
      allowedAssets: botConfig.allowedAssets || ['*'],
      exchanges: botConfig.exchanges || ['binance'],
      aiModel: {
        type: 'HYBRID',
        confidenceThreshold: 70,
        retrainInterval: 24,
        features: ['price', 'volume', 'sentiment']
      },
      learningEnabled: true,
      sentimentAnalysis: true,
      whaleTracking: true
    });

    res.json({
      success: true,
      data: bot
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/bots/:id/start
 * Start a bot
 */
router.post('/bots/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await aiTradeGodBot.startBot(id);

    res.json({
      success: true,
      message: 'Bot started'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/bots/:id/stop
 * Stop a bot
 */
router.post('/bots/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await aiTradeGodBot.stopBot(id);

    res.json({
      success: true,
      message: 'Bot stopped'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /alerts/bots/:id/performance
 * Get bot performance
 */
router.get('/bots/:id/performance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { period = '7D' } = req.query;

    const performance = aiTradeGodBot.getBotPerformance(id, period as any);

    res.json({
      success: true,
      data: performance
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /alerts/bots/:id/trades
 * Get bot trades
 */
router.get('/bots/:id/trades', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const trades = aiTradeGodBot.getTrades(id).slice(0, Number(limit));

    res.json({
      success: true,
      data: trades,
      count: trades.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// BOT LENDING MARKETPLACE
// ============================================

/**
 * GET /alerts/bots/marketplace
 * Get bots available for lending
 */
router.get('/bots/marketplace', async (req: Request, res: Response) => {
  try {
    const bots = aiTradeGodBot.getAvailableBots();

    // Add performance data
    const botsWithPerformance = bots.map(bot => ({
      ...bot,
      performance: aiTradeGodBot.getBotPerformance(bot.id, '30D')
    }));

    res.json({
      success: true,
      data: botsWithPerformance,
      count: botsWithPerformance.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/bots/:id/list-for-lending
 * List a bot for lending
 */
router.post('/bots/:id/list-for-lending', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { monthlyFee, profitShare } = req.body;

    if (monthlyFee === undefined || profitShare === undefined) {
      return res.status(400).json({
        success: false,
        error: 'monthlyFee and profitShare are required'
      });
    }

    aiTradeGodBot.listBotForLending(id, monthlyFee, profitShare);

    res.json({
      success: true,
      message: 'Bot listed for lending'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/bots/:id/borrow
 * Borrow a bot
 */
router.post('/bots/:id/borrow', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { borrowerId, durationMonths } = req.body;

    if (!borrowerId || !durationMonths) {
      return res.status(400).json({
        success: false,
        error: 'borrowerId and durationMonths are required'
      });
    }

    const agreement = await aiTradeGodBot.borrowBot(id, borrowerId, durationMonths);

    res.json({
      success: true,
      data: agreement
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// PLAIN ENGLISH COMMANDS
// ============================================

/**
 * POST /alerts/command
 * Process a natural language command
 */
router.post('/command', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'command is required'
      });
    }

    const response = await aiTradeGodBot.processCommand(command);

    res.json({
      success: true,
      data: {
        command,
        response
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// MONITORING CONTROL
// ============================================

/**
 * POST /alerts/monitoring/start
 * Start the alert monitoring system
 */
router.post('/monitoring/start', async (req: Request, res: Response) => {
  try {
    await bigMovesAlertService.startMonitoring();

    res.json({
      success: true,
      message: 'Alert monitoring started'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/monitoring/stop
 * Stop the alert monitoring system
 */
router.post('/monitoring/stop', async (req: Request, res: Response) => {
  try {
    bigMovesAlertService.stopMonitoring();

    res.json({
      success: true,
      message: 'Alert monitoring stopped'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// TEST ENDPOINTS (Development only)
// ============================================

/**
 * POST /alerts/test/whale
 * Create a test whale alert
 */
router.post('/test/whale', async (req: Request, res: Response) => {
  try {
    const alert = bigMovesAlertService.processWhaleMovement({
      wallet: '0x123...abc',
      token: 'BTC',
      amount: 1000,
      amountUSD: 100_000_000,
      direction: 'OUT',
      destination: 'COLD_WALLET'
    });

    res.json({
      success: true,
      data: alert
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/test/government
 * Create a test government alert
 */
router.post('/test/government', async (req: Request, res: Response) => {
  try {
    const alert = bigMovesAlertService.processGovernmentAction({
      country: 'USA',
      action: 'New Bitcoin Reserve Purchase',
      description: 'US Treasury announces additional Bitcoin purchases for Strategic Reserve',
      impact: 'BULLISH'
    });

    res.json({
      success: true,
      data: alert
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/test/institutional
 * Create a test institutional alert
 */
router.post('/test/institutional', async (req: Request, res: Response) => {
  try {
    const alert = bigMovesAlertService.processInstitutionalMove({
      institution: 'BlackRock',
      action: 'Increased holdings of',
      asset: 'IBIT',
      amount: 500_000_000,
      filing: '13F-Q3-2025'
    });

    res.json({
      success: true,
      data: alert
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /alerts/test/defi
 * Create a test DeFi opportunity alert
 */
router.post('/test/defi', async (req: Request, res: Response) => {
  try {
    const alert = bigMovesAlertService.createDeFiAlert(
      'Aave V3',
      'USDC Lending Pool',
      8.5,
      'CONSERVATIVE'
    );

    res.json({
      success: true,
      data: alert
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

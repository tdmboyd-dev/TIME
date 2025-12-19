/**
 * ULTIMATE MONEY MACHINE API ROUTES
 * Version 1.0.0 | December 19, 2025
 *
 * Premium $59/month feature endpoints
 * All routes require Premium tier subscription
 */

import { Router, Request, Response } from 'express';
import {
  getUltimateMoneyMachine,
  getAutoRoleManager,
  getSelfLearningKnowledgeBase,
  getAutoExecuteEngine,
  getMarketAttackStrategies,
  getInstitutionalEdge,
  getPremiumFeatureGate,
  getAbsorbedSuperBots,
} from '../ultimate';
import { getSuperBotLiveTrading } from '../ultimate/SuperBotLiveTrading';

const router = Router();

// Middleware to check Premium/Admin access
// Ultimate Money Machine is ADMIN-APPROVED ONLY - not part of regular subscriptions
const requirePremium = (req: Request, res: Response, next: Function) => {
  // Admin key bypasses all checks
  const adminKey = req.headers['x-admin-key'] as string;
  if (adminKey === 'TIME_ADMIN_2025') {
    return next();
  }

  // Check if user is admin-approved for Ultimate Money Machine
  const premiumGate = getPremiumFeatureGate();
  const userId = req.headers['x-user-id'] as string || 'anonymous';

  const access = premiumGate.checkAccess(userId, 'ultimate_money_machine');
  if (!access.hasAccess) {
    return res.status(403).json({
      error: 'Admin approval required for Ultimate Money Machine',
      message: 'This is an optional add-on feature. Contact admin for access.',
      requiredTier: 'admin_approved',
      currentTier: 'free',
    });
  }

  next();
};

// ============== SUPER BOTS ==============

// GET /api/v1/ultimate/super-bots - Get all 25 super bots (PUBLIC - no absorption info)
router.get('/super-bots', (req: Request, res: Response) => {
  try {
    const superBots = getAbsorbedSuperBots();
    const isAdmin = req.headers['x-admin-key'] === 'TIME_ADMIN_2025';

    // For admin: return full bot info including absorbedFrom
    // For users: return sanitized public info
    if (isAdmin) {
      const bots = superBots.getAllBots();
      const stats = superBots.getStats();
      res.json({
        success: true,
        admin: true,
        bots: bots.map(bot => ({
          id: bot.id,
          name: bot.name,
          codename: bot.codename,
          tier: bot.tier,
          category: bot.category,
          description: bot.description,
          absorbedFrom: bot.absorbedFrom, // ADMIN ONLY - shows sources
          abilities: bot.abilities, // Full abilities with sources
          markets: bot.markets,
          expectedROI: bot.expectedROI,
          riskLevel: bot.riskLevel,
          capitalRequired: bot.capitalRequired,
          isActive: bot.isActive,
          performance: bot.performance,
        })),
        stats,
      });
    } else {
      // PUBLIC view - no absorption info
      const bots = superBots.getAllPublicBots();
      const stats = superBots.getPublicStats();
      res.json({
        success: true,
        bots,
        stats,
      });
    }
  } catch (error) {
    console.error('[Ultimate] Error getting super bots:', error);
    res.status(500).json({ error: 'Failed to get super bots' });
  }
});

// GET /api/v1/ultimate/super-bots/:tier - Get bots by tier (PUBLIC - no absorption info)
router.get('/super-bots/tier/:tier', (req: Request, res: Response) => {
  try {
    const superBots = getAbsorbedSuperBots();
    const isAdmin = req.headers['x-admin-key'] === 'TIME_ADMIN_2025';
    const tier = req.params.tier.toUpperCase() as 'LEGENDARY' | 'EPIC' | 'RARE';

    // Admin sees full info, users see public info
    const bots = isAdmin
      ? superBots.getBotsByTier(tier)
      : superBots.getPublicBotsByTier(tier);

    res.json({
      success: true,
      tier,
      count: bots.length,
      bots,
      admin: isAdmin || undefined,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting bots by tier:', error);
    res.status(500).json({ error: 'Failed to get bots by tier' });
  }
});

// POST /api/v1/ultimate/super-bots/:botId/signal - Generate signal from bot
router.post('/super-bots/:botId/signal', requirePremium, (req: Request, res: Response) => {
  try {
    const superBots = getAbsorbedSuperBots();
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol required' });
    }

    const signal = superBots.generateSignal(req.params.botId, symbol);

    if (!signal) {
      return res.status(404).json({ error: 'Bot not found or inactive' });
    }

    res.json({
      success: true,
      signal,
    });
  } catch (error) {
    console.error('[Ultimate] Error generating signal:', error);
    res.status(500).json({ error: 'Failed to generate signal' });
  }
});

// ============== ULTIMATE MONEY MACHINE ==============

// GET /api/v1/ultimate/status - Get UMM status
router.get('/status', (req: Request, res: Response) => {
  try {
    const umm = getUltimateMoneyMachine();
    const roleManager = getAutoRoleManager();
    const knowledgeBase = getSelfLearningKnowledgeBase();
    const attackStrategies = getMarketAttackStrategies();
    const institutional = getInstitutionalEdge();
    const superBots = getAbsorbedSuperBots();
    const premiumGate = getPremiumFeatureGate();

    res.json({
      success: true,
      status: {
        isRunning: umm.isRunning(),
        mode: umm.getMode(),
        config: umm.getConfig(),
      },
      components: {
        autoRoleManager: {
          totalBots: roleManager.getAllBots().length,
          roles: roleManager.getRoleStats(),
        },
        knowledgeBase: {
          patterns: knowledgeBase.getAllPatterns().length,
          learningInsights: 0,
        },
        attackStrategies: attackStrategies.getStats(),
        institutional: institutional.getStats(),
        superBots: superBots.getStats(),
      },
      subscription: premiumGate.getStats(),
    });
  } catch (error) {
    console.error('[Ultimate] Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /api/v1/ultimate/start - Start UMM
router.post('/start', requirePremium, (req: Request, res: Response) => {
  try {
    const umm = getUltimateMoneyMachine();
    umm.start();

    res.json({
      success: true,
      message: 'Ultimate Money Machine started',
      isRunning: umm.isRunning(),
    });
  } catch (error) {
    console.error('[Ultimate] Error starting UMM:', error);
    res.status(500).json({ error: 'Failed to start Ultimate Money Machine' });
  }
});

// POST /api/v1/ultimate/stop - Stop UMM
router.post('/stop', requirePremium, (req: Request, res: Response) => {
  try {
    const umm = getUltimateMoneyMachine();
    umm.stop();

    res.json({
      success: true,
      message: 'Ultimate Money Machine stopped',
      isRunning: umm.isRunning(),
    });
  } catch (error) {
    console.error('[Ultimate] Error stopping UMM:', error);
    res.status(500).json({ error: 'Failed to stop Ultimate Money Machine' });
  }
});

// ============== ATTACK STRATEGIES ==============

// GET /api/v1/ultimate/attack-strategies - Get all attack strategies
router.get('/attack-strategies', (req: Request, res: Response) => {
  try {
    const attackStrategies = getMarketAttackStrategies();

    res.json({
      success: true,
      strategies: attackStrategies.getStrategies(),
      stats: attackStrategies.getStats(),
    });
  } catch (error) {
    console.error('[Ultimate] Error getting attack strategies:', error);
    res.status(500).json({ error: 'Failed to get attack strategies' });
  }
});

// POST /api/v1/ultimate/attack-strategies/engage - Engage attack mode
router.post('/attack-strategies/engage', requirePremium, (req: Request, res: Response) => {
  try {
    const attackStrategies = getMarketAttackStrategies();
    attackStrategies.engage();

    res.json({
      success: true,
      message: 'Attack mode engaged',
      activeAttacks: attackStrategies.getActiveAttacks().length,
    });
  } catch (error) {
    console.error('[Ultimate] Error engaging attack mode:', error);
    res.status(500).json({ error: 'Failed to engage attack mode' });
  }
});

// POST /api/v1/ultimate/attack-strategies/disengage - Disengage attack mode
router.post('/attack-strategies/disengage', requirePremium, (req: Request, res: Response) => {
  try {
    const attackStrategies = getMarketAttackStrategies();
    attackStrategies.disengage();

    res.json({
      success: true,
      message: 'Attack mode disengaged',
    });
  } catch (error) {
    console.error('[Ultimate] Error disengaging attack mode:', error);
    res.status(500).json({ error: 'Failed to disengage attack mode' });
  }
});

// ============== INSTITUTIONAL EDGE ==============

// GET /api/v1/ultimate/institutional - Get institutional techniques
router.get('/institutional', (req: Request, res: Response) => {
  try {
    const institutional = getInstitutionalEdge();

    res.json({
      success: true,
      techniques: institutional.getTechniques(),
      stats: institutional.getStats(),
    });
  } catch (error) {
    console.error('[Ultimate] Error getting institutional techniques:', error);
    res.status(500).json({ error: 'Failed to get institutional techniques' });
  }
});

// GET /api/v1/ultimate/institutional/:source - Get techniques by source
router.get('/institutional/source/:source', (req: Request, res: Response) => {
  try {
    const institutional = getInstitutionalEdge();
    const techniques = institutional.getTechniquesBySource(req.params.source);

    res.json({
      success: true,
      source: req.params.source,
      techniques,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting techniques by source:', error);
    res.status(500).json({ error: 'Failed to get techniques by source' });
  }
});

// ============== KNOWLEDGE BASE ==============

// GET /api/v1/ultimate/patterns - Get learned patterns
router.get('/patterns', (req: Request, res: Response) => {
  try {
    const knowledgeBase = getSelfLearningKnowledgeBase();
    const patterns = knowledgeBase.getAllPatterns();

    res.json({
      success: true,
      count: patterns.length,
      patterns,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting patterns:', error);
    res.status(500).json({ error: 'Failed to get patterns' });
  }
});

// POST /api/v1/ultimate/learn - Record a trade for learning
router.post('/learn', requirePremium, (req: Request, res: Response) => {
  try {
    const knowledgeBase = getSelfLearningKnowledgeBase();
    const trade = req.body;

    knowledgeBase.recordTrade(trade);

    res.json({
      success: true,
      message: 'Trade recorded for learning',
    });
  } catch (error) {
    console.error('[Ultimate] Error recording trade:', error);
    res.status(500).json({ error: 'Failed to record trade' });
  }
});

// ============== SUBSCRIPTION ==============

// GET /api/v1/ultimate/tiers - Get subscription tiers
router.get('/tiers', (req: Request, res: Response) => {
  try {
    const premiumGate = getPremiumFeatureGate();

    res.json({
      success: true,
      tiers: premiumGate.getTiers(),
    });
  } catch (error) {
    console.error('[Ultimate] Error getting tiers:', error);
    res.status(500).json({ error: 'Failed to get tiers' });
  }
});

// POST /api/v1/ultimate/subscribe - Create subscription
router.post('/subscribe', (req: Request, res: Response) => {
  try {
    const premiumGate = getPremiumFeatureGate();
    const { userId, tierId } = req.body;

    if (!userId || !tierId) {
      return res.status(400).json({ error: 'userId and tierId required' });
    }

    const subscription = premiumGate.createSubscription(userId, tierId);

    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('[Ultimate] Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// POST /api/v1/ultimate/trial - Start free trial
router.post('/trial', (req: Request, res: Response) => {
  try {
    const premiumGate = getPremiumFeatureGate();
    const { userId, days = 7 } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const subscription = premiumGate.startTrial(userId, 'premium', days);

    res.json({
      success: true,
      message: `Started ${days}-day Premium trial`,
      subscription,
    });
  } catch (error) {
    console.error('[Ultimate] Error starting trial:', error);
    res.status(500).json({ error: 'Failed to start trial' });
  }
});

// GET /api/v1/ultimate/check-access/:feature - Check feature access
router.get('/check-access/:feature', (req: Request, res: Response) => {
  try {
    const premiumGate = getPremiumFeatureGate();
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    const access = premiumGate.checkAccess(userId, req.params.feature);

    res.json({
      success: true,
      access,
    });
  } catch (error) {
    console.error('[Ultimate] Error checking access:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

// ============== AUTO ROLE MANAGER ==============

// GET /api/v1/ultimate/bots - Get all bots with roles
router.get('/bots', (req: Request, res: Response) => {
  try {
    const roleManager = getAutoRoleManager();
    const bots = roleManager.getAllBots();

    res.json({
      success: true,
      count: bots.length,
      bots,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting bots:', error);
    res.status(500).json({ error: 'Failed to get bots' });
  }
});

// POST /api/v1/ultimate/bots/:botId/assign-role - Assign role to bot
router.post('/bots/:botId/assign-role', requirePremium, (req: Request, res: Response) => {
  try {
    const roleManager = getAutoRoleManager();
    const { role } = req.body;

    roleManager.assignRole(req.params.botId, role);

    res.json({
      success: true,
      message: `Assigned role ${role} to bot ${req.params.botId}`,
    });
  } catch (error) {
    console.error('[Ultimate] Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// POST /api/v1/ultimate/bots/auto-assign - Auto-assign roles based on market
router.post('/bots/auto-assign', requirePremium, (req: Request, res: Response) => {
  try {
    const roleManager = getAutoRoleManager();
    const { marketCondition } = req.body;

    // Update market condition which triggers auto-assignment
    roleManager.updateMarketCondition(marketCondition || {
      trend: 'neutral',
      volatility: 'normal',
      volume: 'average',
      sentiment: 'neutral',
    });

    res.json({
      success: true,
      message: 'Auto-assigned roles based on market conditions',
      bots: roleManager.getAllBots(),
    });
  } catch (error) {
    console.error('[Ultimate] Error auto-assigning roles:', error);
    res.status(500).json({ error: 'Failed to auto-assign roles' });
  }
});

// ============== AUTO EXECUTE ==============

// GET /api/v1/ultimate/execution/status - Get execution engine status
router.get('/execution/status', (req: Request, res: Response) => {
  try {
    const executor = getAutoExecuteEngine();

    res.json({
      success: true,
      metrics: executor.getMetrics(),
      brokers: executor.getBrokers(),
    });
  } catch (error) {
    console.error('[Ultimate] Error getting execution status:', error);
    res.status(500).json({ error: 'Failed to get execution status' });
  }
});

// POST /api/v1/ultimate/execution/execute - Execute an order
router.post('/execution/execute', requirePremium, async (req: Request, res: Response) => {
  try {
    const executor = getAutoExecuteEngine();
    const order = req.body;

    const result = await executor.submitOrder(order);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[Ultimate] Error executing order:', error);
    res.status(500).json({ error: 'Failed to execute order' });
  }
});

// ============== LIVE TRADING SYSTEM ==============

// GET /api/v1/ultimate/live/status - Get live trading status
router.get('/live/status', (req: Request, res: Response) => {
  try {
    const liveTrading = getSuperBotLiveTrading();
    const state = liveTrading.getState();

    res.json({
      success: true,
      status: {
        isEnabled: state.isEnabled,
        mode: state.mode,
        activeBots: liveTrading.getActiveBots().length,
        dailyTradeCount: state.dailyTradeCount,
        maxDailyTrades: state.maxDailyTrades,
        currentDrawdown: (state.currentDrawdown * 100).toFixed(2) + '%',
        maxDrawdown: (state.maxDrawdown * 100).toFixed(2) + '%',
        equity: {
          starting: state.startingEquity,
          current: state.currentEquity,
          pnl: state.currentEquity - state.startingEquity,
        },
      },
    });
  } catch (error) {
    console.error('[Ultimate] Error getting live status:', error);
    res.status(500).json({ error: 'Failed to get live trading status' });
  }
});

// POST /api/v1/ultimate/live/enable - Enable live trading
router.post('/live/enable', requirePremium, async (req: Request, res: Response) => {
  try {
    const { mode = 'paper' } = req.body;
    const liveTrading = getSuperBotLiveTrading();

    await liveTrading.enable(mode);

    res.json({
      success: true,
      message: `Live trading enabled in ${mode} mode`,
      state: liveTrading.getState(),
    });
  } catch (error) {
    console.error('[Ultimate] Error enabling live trading:', error);
    res.status(500).json({ error: 'Failed to enable live trading' });
  }
});

// POST /api/v1/ultimate/live/disable - Disable live trading
router.post('/live/disable', requirePremium, async (req: Request, res: Response) => {
  try {
    const liveTrading = getSuperBotLiveTrading();
    await liveTrading.disable();

    res.json({
      success: true,
      message: 'Live trading disabled',
    });
  } catch (error) {
    console.error('[Ultimate] Error disabling live trading:', error);
    res.status(500).json({ error: 'Failed to disable live trading' });
  }
});

// POST /api/v1/ultimate/live/activate-bot - Activate a bot for live trading
router.post('/live/activate-bot', requirePremium, (req: Request, res: Response) => {
  try {
    const { botId } = req.body;
    if (!botId) {
      return res.status(400).json({ error: 'botId required' });
    }

    const liveTrading = getSuperBotLiveTrading();
    const success = liveTrading.activateBot(botId);

    if (!success) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({
      success: true,
      message: `Bot ${botId} activated for live trading`,
      activeBots: liveTrading.getActiveBots(),
    });
  } catch (error) {
    console.error('[Ultimate] Error activating bot:', error);
    res.status(500).json({ error: 'Failed to activate bot' });
  }
});

// POST /api/v1/ultimate/live/deactivate-bot - Deactivate a bot from live trading
router.post('/live/deactivate-bot', requirePremium, (req: Request, res: Response) => {
  try {
    const { botId } = req.body;
    if (!botId) {
      return res.status(400).json({ error: 'botId required' });
    }

    const liveTrading = getSuperBotLiveTrading();
    liveTrading.deactivateBot(botId);

    res.json({
      success: true,
      message: `Bot ${botId} deactivated`,
      activeBots: liveTrading.getActiveBots(),
    });
  } catch (error) {
    console.error('[Ultimate] Error deactivating bot:', error);
    res.status(500).json({ error: 'Failed to deactivate bot' });
  }
});

// GET /api/v1/ultimate/live/active-bots - Get active bots details
router.get('/live/active-bots', (req: Request, res: Response) => {
  try {
    const liveTrading = getSuperBotLiveTrading();
    const activeBots = liveTrading.getActiveBotDetails();

    res.json({
      success: true,
      count: activeBots.length,
      bots: activeBots,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting active bots:', error);
    res.status(500).json({ error: 'Failed to get active bots' });
  }
});

// POST /api/v1/ultimate/live/generate-signal - Generate and execute a signal from a bot
router.post('/live/generate-signal', requirePremium, async (req: Request, res: Response) => {
  try {
    const { botId, symbol } = req.body;
    if (!botId || !symbol) {
      return res.status(400).json({ error: 'botId and symbol required' });
    }

    const liveTrading = getSuperBotLiveTrading();
    const trade = await liveTrading.generateAndExecuteSignal(botId, symbol);

    if (!trade) {
      return res.json({
        success: true,
        message: 'No actionable signal generated (HOLD)',
        trade: null,
      });
    }

    res.json({
      success: true,
      message: `Signal executed: ${trade.signal.action} ${symbol}`,
      trade,
    });
  } catch (error) {
    console.error('[Ultimate] Error generating signal:', error);
    res.status(500).json({ error: 'Failed to generate and execute signal' });
  }
});

// GET /api/v1/ultimate/live/trades - Get executed trades
router.get('/live/trades', (req: Request, res: Response) => {
  try {
    const liveTrading = getSuperBotLiveTrading();
    const trades = liveTrading.getExecutedTrades();

    res.json({
      success: true,
      count: trades.length,
      trades,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting trades:', error);
    res.status(500).json({ error: 'Failed to get trades' });
  }
});

// GET /api/v1/ultimate/live/bot-stats - Get all bot trading stats
router.get('/live/bot-stats', (req: Request, res: Response) => {
  try {
    const liveTrading = getSuperBotLiveTrading();
    const stats = liveTrading.getAllBotStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting bot stats:', error);
    res.status(500).json({ error: 'Failed to get bot stats' });
  }
});

// GET /api/v1/ultimate/live/bot-stats/:botId - Get specific bot stats
router.get('/live/bot-stats/:botId', (req: Request, res: Response) => {
  try {
    const liveTrading = getSuperBotLiveTrading();
    const stats = liveTrading.getBotStats(req.params.botId);

    if (!stats) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting bot stats:', error);
    res.status(500).json({ error: 'Failed to get bot stats' });
  }
});

// GET /api/v1/ultimate/live/signal-queue - Get pending signals
router.get('/live/signal-queue', (req: Request, res: Response) => {
  try {
    const liveTrading = getSuperBotLiveTrading();
    const queue = liveTrading.getSignalQueue();

    res.json({
      success: true,
      count: queue.length,
      signals: queue,
    });
  } catch (error) {
    console.error('[Ultimate] Error getting signal queue:', error);
    res.status(500).json({ error: 'Failed to get signal queue' });
  }
});

// POST /api/v1/ultimate/live/configure - Configure live trading settings
router.post('/live/configure', requirePremium, (req: Request, res: Response) => {
  try {
    const { maxPositionSize, maxDailyTrades, maxDrawdown } = req.body;
    const liveTrading = getSuperBotLiveTrading();

    if (maxPositionSize !== undefined) {
      liveTrading.setMaxPositionSize(maxPositionSize);
    }
    if (maxDailyTrades !== undefined) {
      liveTrading.setMaxDailyTrades(maxDailyTrades);
    }
    if (maxDrawdown !== undefined) {
      liveTrading.setMaxDrawdown(maxDrawdown);
    }

    res.json({
      success: true,
      message: 'Configuration updated',
      state: liveTrading.getState(),
    });
  } catch (error) {
    console.error('[Ultimate] Error configuring live trading:', error);
    res.status(500).json({ error: 'Failed to configure live trading' });
  }
});

// POST /api/v1/ultimate/live/activate-all-legendary - Activate all legendary bots
router.post('/live/activate-all-legendary', requirePremium, (req: Request, res: Response) => {
  try {
    const superBots = getAbsorbedSuperBots();
    const liveTrading = getSuperBotLiveTrading();

    const legendaryBots = superBots.getBotsByTier('LEGENDARY');
    let activated = 0;

    for (const bot of legendaryBots) {
      if (liveTrading.activateBot(bot.id)) {
        activated++;
      }
    }

    res.json({
      success: true,
      message: `Activated ${activated} LEGENDARY bots for live trading`,
      activeBots: liveTrading.getActiveBots(),
    });
  } catch (error) {
    console.error('[Ultimate] Error activating legendary bots:', error);
    res.status(500).json({ error: 'Failed to activate legendary bots' });
  }
});

// POST /api/v1/ultimate/live/activate-by-tier - Activate bots by tier
router.post('/live/activate-by-tier', requirePremium, (req: Request, res: Response) => {
  try {
    const { tier } = req.body;
    if (!tier || !['LEGENDARY', 'EPIC', 'RARE'].includes(tier)) {
      return res.status(400).json({ error: 'Valid tier required (LEGENDARY, EPIC, RARE)' });
    }

    const superBots = getAbsorbedSuperBots();
    const liveTrading = getSuperBotLiveTrading();

    const bots = superBots.getBotsByTier(tier as 'LEGENDARY' | 'EPIC' | 'RARE');
    let activated = 0;

    for (const bot of bots) {
      if (liveTrading.activateBot(bot.id)) {
        activated++;
      }
    }

    res.json({
      success: true,
      message: `Activated ${activated} ${tier} bots for live trading`,
      activeBots: liveTrading.getActiveBots(),
    });
  } catch (error) {
    console.error('[Ultimate] Error activating bots by tier:', error);
    res.status(500).json({ error: 'Failed to activate bots' });
  }
});

export default router;

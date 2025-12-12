/**
 * TIME Auto Bot API Routes
 *
 * Exposes the Auto Bot Engine and Pro Copy Trading to the frontend
 * These endpoints DESTROY BTCC's limited API
 */

import { Router, Request, Response } from 'express';
import { autoBotEngine } from '../bots/auto_bot_engine';
import { proCopyTradingEngine } from '../bots/pro_copy_trading';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('AutoBotRoutes');

// ============================================================
// AUTO BOT ENDPOINTS
// ============================================================

/**
 * GET /api/bots/templates
 * Get all available bot templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const templates = category
      ? autoBotEngine.getTemplatesByCategory(category as string)
      : autoBotEngine.getAllTemplates();

    res.json({
      success: true,
      data: templates,
      count: templates.length,
      message: `${templates.length} bot templates available - BTCC doesn't have this variety!`,
    });
  } catch (error) {
    logger.error('Error getting templates:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get templates' });
  }
});

/**
 * GET /api/bots/templates/:id
 * Get a specific template
 */
router.get('/templates/:id', (req: Request, res: Response) => {
  try {
    const template = autoBotEngine.getTemplate(req.params.id);

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    logger.error('Error getting template:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get template' });
  }
});

/**
 * POST /api/bots/create
 * Create a new bot from template
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { templateId, userId, config } = req.body;

    if (!templateId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'templateId and userId are required',
      });
    }

    const bot = await autoBotEngine.createBotFromTemplate(templateId, userId, config);

    res.json({
      success: true,
      data: bot,
      message: `Bot "${bot.config.name}" created successfully!`,
    });
  } catch (error) {
    logger.error('Error creating bot:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/bots/create-custom
 * Create a custom bot without template
 */
router.post('/create-custom', async (req: Request, res: Response) => {
  try {
    const { userId, config } = req.body;

    if (!userId || !config) {
      return res.status(400).json({
        success: false,
        error: 'userId and config are required',
      });
    }

    const bot = await autoBotEngine.createCustomBot(userId, config);

    res.json({
      success: true,
      data: bot,
      message: `Custom bot "${bot.config.name}" created!`,
    });
  } catch (error) {
    logger.error('Error creating custom bot:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/bots/user/:userId
 * Get all bots for a user
 */
router.get('/user/:userId', (req: Request, res: Response) => {
  try {
    const bots = autoBotEngine.getBotsByUser(req.params.userId);

    res.json({
      success: true,
      data: bots,
      count: bots.length,
    });
  } catch (error) {
    logger.error('Error getting user bots:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get bots' });
  }
});

/**
 * GET /api/bots/:botId
 * Get a specific bot
 */
router.get('/:botId', (req: Request, res: Response) => {
  try {
    const bot = autoBotEngine.getBot(req.params.botId);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, data: bot });
  } catch (error) {
    logger.error('Error getting bot:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get bot' });
  }
});

/**
 * POST /api/bots/:botId/start
 * Start a bot
 */
router.post('/:botId/start', async (req: Request, res: Response) => {
  try {
    const success = await autoBotEngine.startBot(req.params.botId);

    if (!success) {
      return res.status(400).json({ success: false, error: 'Failed to start bot' });
    }

    const bot = autoBotEngine.getBot(req.params.botId);
    res.json({
      success: true,
      data: bot,
      message: `Bot started! Strategy: ${bot?.config.strategyType}`,
    });
  } catch (error) {
    logger.error('Error starting bot:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/bots/:botId/stop
 * Stop a bot
 */
router.post('/:botId/stop', async (req: Request, res: Response) => {
  try {
    const success = await autoBotEngine.stopBot(req.params.botId);

    if (!success) {
      return res.status(400).json({ success: false, error: 'Failed to stop bot' });
    }

    res.json({ success: true, message: 'Bot stopped successfully' });
  } catch (error) {
    logger.error('Error stopping bot:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/bots/:botId/pause
 * Pause a bot
 */
router.post('/:botId/pause', async (req: Request, res: Response) => {
  try {
    const success = await autoBotEngine.pauseBot(req.params.botId);

    if (!success) {
      return res.status(400).json({ success: false, error: 'Failed to pause bot' });
    }

    res.json({ success: true, message: 'Bot paused' });
  } catch (error) {
    logger.error('Error pausing bot:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * DELETE /api/bots/:botId
 * Delete a bot
 */
router.delete('/:botId', async (req: Request, res: Response) => {
  try {
    const success = await autoBotEngine.deleteBot(req.params.botId);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, message: 'Bot deleted' });
  } catch (error) {
    logger.error('Error deleting bot:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/bots/stats/engine
 * Get engine statistics
 */
router.get('/stats/engine', (req: Request, res: Response) => {
  try {
    const stats = autoBotEngine.getEngineStats();

    res.json({
      success: true,
      data: {
        ...stats,
        comparison: {
          btcc: {
            maxLeverage: '500x',
            copyTrading: true,
            aiTrading: false,
            regimeAdaptive: false,
            defiIntegration: false,
          },
          time: {
            maxLeverage: '500x',
            copyTrading: true,
            aiTrading: true,
            regimeAdaptive: true,
            defiIntegration: true,
            arbitrage: true,
            tokenizedAssets: true,
            multiAsset: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error getting engine stats:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// ============================================================
// COPY TRADING ENDPOINTS
// ============================================================

/**
 * GET /api/bots/copy/leaderboard
 * Get trader leaderboard
 */
router.get('/copy/leaderboard', (req: Request, res: Response) => {
  try {
    const { tier, platform, minScore, sortBy, limit } = req.query;

    const leaderboard = proCopyTradingEngine.getLeaderboard({
      tier: tier as any,
      platform: platform as any,
      minScore: minScore ? Number(minScore) : undefined,
      sortBy: sortBy as any,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: leaderboard,
      count: leaderboard.length,
      message: 'TIME has unlimited traders from all platforms - BTCC only has 1,600!',
    });
  } catch (error) {
    logger.error('Error getting leaderboard:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

/**
 * GET /api/bots/copy/traders/:traderId
 * Get trader details
 */
router.get('/copy/traders/:traderId', (req: Request, res: Response) => {
  try {
    const trader = proCopyTradingEngine.getTrader(req.params.traderId);

    if (!trader) {
      return res.status(404).json({ success: false, error: 'Trader not found' });
    }

    res.json({ success: true, data: trader });
  } catch (error) {
    logger.error('Error getting trader:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get trader' });
  }
});

/**
 * POST /api/bots/copy/recommendations
 * Get AI recommendations for traders to copy
 */
router.post('/copy/recommendations', (req: Request, res: Response) => {
  try {
    const { userId, riskTolerance, investmentAmount, currentRegime, preferredAssets, maxTraders } = req.body;

    if (!userId || !riskTolerance || !investmentAmount) {
      return res.status(400).json({
        success: false,
        error: 'userId, riskTolerance, and investmentAmount are required',
      });
    }

    const recommendations = proCopyTradingEngine.getAIRecommendations({
      userId,
      riskTolerance,
      investmentAmount,
      currentRegime,
      preferredAssets,
      maxTraders,
    });

    res.json({
      success: true,
      data: recommendations,
      message: 'AI recommendations generated - BTCC doesn\'t have this intelligence!',
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/bots/copy/start
 * Start copying a trader
 */
router.post('/copy/start', async (req: Request, res: Response) => {
  try {
    const { userId, traderId, config } = req.body;

    if (!userId || !traderId) {
      return res.status(400).json({
        success: false,
        error: 'userId and traderId are required',
      });
    }

    const copyConfig = await proCopyTradingEngine.startCopying(userId, traderId, config || {});

    res.json({
      success: true,
      data: copyConfig,
      message: 'Now copying trader with TIME\'s advanced features!',
    });
  } catch (error) {
    logger.error('Error starting copy:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/bots/copy/stop/:configId
 * Stop copying
 */
router.post('/copy/stop/:configId', async (req: Request, res: Response) => {
  try {
    const success = await proCopyTradingEngine.stopCopying(req.params.configId);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Copy configuration not found' });
    }

    res.json({ success: true, message: 'Stopped copying' });
  } catch (error) {
    logger.error('Error stopping copy:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/bots/copy/user/:userId
 * Get user's copy configurations
 */
router.get('/copy/user/:userId', (req: Request, res: Response) => {
  try {
    const configs = proCopyTradingEngine.getUserConfigurations(req.params.userId);

    res.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    logger.error('Error getting user configs:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get configurations' });
  }
});

/**
 * POST /api/bots/copy/ensemble
 * Create a copy ensemble (multi-trader portfolio)
 */
router.post('/copy/ensemble', async (req: Request, res: Response) => {
  try {
    const { userId, name, traderIds, weights } = req.body;

    if (!userId || !name || !traderIds || traderIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'userId, name, and at least 2 traderIds are required',
      });
    }

    const ensemble = await proCopyTradingEngine.createEnsemble(userId, name, traderIds, weights);

    res.json({
      success: true,
      data: ensemble,
      message: 'Ensemble created - AI will optimize weights automatically!',
    });
  } catch (error) {
    logger.error('Error creating ensemble:', error as object);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/bots/copy/ensemble/:userId
 * Get user's ensembles
 */
router.get('/copy/ensemble/:userId', (req: Request, res: Response) => {
  try {
    const ensembles = proCopyTradingEngine.getUserEnsembles(req.params.userId);

    res.json({
      success: true,
      data: ensembles,
      count: ensembles.length,
    });
  } catch (error) {
    logger.error('Error getting ensembles:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get ensembles' });
  }
});

/**
 * GET /api/bots/copy/stats
 * Get copy trading engine stats
 */
router.get('/copy/stats', (req: Request, res: Response) => {
  try {
    const stats = proCopyTradingEngine.getEngineStats();

    res.json({
      success: true,
      data: {
        ...stats,
        timeExclusiveFeatures: [
          'AI-powered trader selection',
          'Regime-filtered copying',
          'Collective intelligence aggregation',
          'Multi-asset copying (stocks, forex, crypto, tokenized)',
          'Inverse copy mode',
          'Ensemble portfolios with auto-rebalancing',
          'Anti-front-running protection',
          'Cross-platform signal aggregation',
        ],
      },
    });
  } catch (error) {
    logger.error('Error getting copy stats:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

export default router;

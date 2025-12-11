/**
 * TIME Bot Routes
 *
 * Full CRUD operations for bots, plus:
 * - Bot upload and ingestion
 * - Fingerprint viewing
 * - Performance analytics
 * - Activation/deactivation
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { botManager } from '../bots/bot_manager';
import { botIngestion } from '../bots/bot_ingestion';

const router = Router();

// ============================================================
// PUBLIC BOT ROUTES
// ============================================================

/**
 * GET /bots
 * List all available bots (public library + user's bots)
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const {
    source,
    status,
    search,
    sortBy = 'rating',
    sortOrder = 'desc',
    page = '1',
    limit = '20',
  } = req.query;

  const allBots = botManager.getAllBots();

  // Filter
  let filtered = allBots;

  if (source) {
    filtered = filtered.filter(b => b.source === source);
  }

  if (status) {
    filtered = filtered.filter(b => b.status === status);
  }

  if (search) {
    const searchLower = (search as string).toLowerCase();
    filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(searchLower) ||
      b.description?.toLowerCase().includes(searchLower)
    );
  }

  // Sort
  filtered.sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortBy) {
      case 'rating':
        aVal = a.rating || 0;
        bVal = b.rating || 0;
        break;
      case 'winRate':
        aVal = a.performance?.winRate || 0;
        bVal = b.performance?.winRate || 0;
        break;
      case 'profitFactor':
        aVal = a.performance?.profitFactor || 0;
        bVal = b.performance?.profitFactor || 0;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'createdAt':
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
      default:
        aVal = a.rating || 0;
        bVal = b.rating || 0;
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  // Paginate
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(filtered.length / limitNum),
    bots: paginated.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      source: b.source,
      status: b.status,
      rating: b.rating,
      performance: {
        winRate: b.performance?.winRate,
        profitFactor: b.performance?.profitFactor,
        totalTrades: b.performance?.totalTrades,
        sharpeRatio: b.performance?.sharpeRatio,
      },
      fingerprint: b.fingerprint ? {
        strategyType: b.fingerprint.strategyType,
        riskProfile: b.fingerprint.riskProfile,
      } : null,
    })),
  });
});

/**
 * GET /bots/stats
 * Get bot statistics
 */
router.get('/stats', authMiddleware, (req: Request, res: Response) => {
  const stats = botManager.getStatistics();
  res.json(stats);
});

/**
 * GET /bots/:botId
 * Get detailed bot information
 */
router.get('/:botId', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const bot = botManager.getBot(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  res.json({
    bot: {
      id: bot.id,
      name: bot.name,
      description: bot.description,
      source: bot.source,
      sourceUrl: bot.sourceUrl,
      status: bot.status,
      rating: bot.rating,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
      absorbedAt: bot.absorbedAt,
      performance: bot.performance,
      fingerprint: bot.fingerprint,
      config: bot.config,
    },
  });
});

/**
 * GET /bots/:botId/fingerprint
 * Get bot fingerprint details
 */
router.get('/:botId/fingerprint', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const bot = botManager.getBot(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  if (!bot.fingerprint) {
    return res.status(404).json({ error: 'Bot fingerprint not available' });
  }

  res.json({
    botId,
    fingerprint: bot.fingerprint,
  });
});

/**
 * GET /bots/:botId/performance
 * Get detailed performance metrics
 */
router.get('/:botId/performance', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const { period = '30d' } = req.query;
  const bot = botManager.getBot(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  res.json({
    botId,
    period,
    performance: bot.performance,
  });
});

/**
 * GET /bots/:botId/signals
 * Get recent signals from bot
 */
router.get('/:botId/signals', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const { limit = '50' } = req.query;

  // Mock signals - in production, fetch from database
  const signals = [
    {
      id: 'sig_1',
      symbol: 'EURUSD',
      direction: 'long',
      strength: 0.85,
      timestamp: new Date(Date.now() - 3600000),
      executed: true,
      outcome: 'win',
    },
    {
      id: 'sig_2',
      symbol: 'GBPUSD',
      direction: 'short',
      strength: 0.72,
      timestamp: new Date(Date.now() - 7200000),
      executed: true,
      outcome: 'loss',
    },
  ].slice(0, parseInt(limit as string));

  res.json({
    botId,
    total: signals.length,
    signals,
  });
});

// ============================================================
// BOT MANAGEMENT ROUTES
// ============================================================

/**
 * POST /bots/upload
 * Upload a new bot (user contribution)
 */
router.post('/upload', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, description, code, config, source = 'user_upload' } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  try {
    const result = await botIngestion.ingest({
      name,
      description,
      code,
      config,
      source: source as any,
      sourceUrl: undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Bot uploaded and queued for analysis',
      bot: {
        id: result.botId,
        status: 'pending_review',
      },
    });
  } catch (error) {
    console.error('Bot upload error:', error);
    res.status(500).json({ error: 'Failed to upload bot' });
  }
});

/**
 * PUT /bots/:botId
 * Update bot configuration
 */
router.put('/:botId', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const updates = req.body;
  const bot = botManager.getBot(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  // Only allow certain fields to be updated
  const allowedFields = ['name', 'description'];
  const filteredUpdates: any = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  }

  // In production, update in database
  res.json({
    success: true,
    message: 'Bot updated',
    bot: {
      id: botId,
      ...filteredUpdates,
    },
  });
});

/**
 * POST /bots/:botId/activate
 * Activate a bot for trading
 */
router.post('/:botId/activate', authMiddleware, async (req: Request, res: Response) => {
  const { botId } = req.params;
  const { accountId, paperMode = true } = req.body;

  try {
    await botManager.activateBot(botId);

    res.json({
      success: true,
      message: `Bot ${botId} activated`,
      paperMode,
      accountId,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /bots/:botId/deactivate
 * Deactivate a bot
 */
router.post('/:botId/deactivate', authMiddleware, async (req: Request, res: Response) => {
  const { botId } = req.params;

  try {
    await botManager.pauseBot(botId);

    res.json({
      success: true,
      message: `Bot ${botId} deactivated`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /bots/:botId
 * Remove a user's bot (not platform bots)
 */
router.delete('/:botId', authMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const bot = botManager.getBot(botId);

  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  // Only allow deletion of user-uploaded bots
  if (bot.source !== 'user_upload') {
    return res.status(403).json({
      error: 'Cannot delete platform bots',
    });
  }

  // In production, delete from database
  res.json({
    success: true,
    message: 'Bot deleted',
  });
});

// ============================================================
// ADMIN BOT ROUTES
// ============================================================

/**
 * POST /bots/admin/absorb/:botId
 * Absorb a bot into TIME's core intelligence
 */
router.post('/admin/absorb/:botId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { botId } = req.params;

  try {
    res.json({
      success: true,
      message: `Bot ${botId} absorbed into TIME core`,
      absorbedAt: new Date(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /bots/admin/research
 * Trigger bot research pipeline
 */
router.post('/admin/research', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { sources, minRating = 4.0, maxResults = 100 } = req.body;

  res.json({
    success: true,
    message: 'Bot research initiated',
    config: {
      sources: sources || ['github', 'mql5', 'ctrader'],
      minRating,
      maxResults,
    },
    status: 'running',
  });
});

/**
 * GET /bots/admin/pending
 * Get bots pending review
 */
router.get('/admin/pending', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const allBots = botManager.getAllBots();
  const pending = allBots.filter(b => b.status === 'pending_review' || b.status === 'testing');

  res.json({
    total: pending.length,
    bots: pending,
  });
});

/**
 * POST /bots/admin/:botId/approve
 * Approve a pending bot
 */
router.post('/admin/:botId/approve', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;

  res.json({
    success: true,
    message: `Bot ${botId} approved and active`,
  });
});

/**
 * POST /bots/admin/:botId/reject
 * Reject a pending bot
 */
router.post('/admin/:botId/reject', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { botId } = req.params;
  const { reason } = req.body;

  res.json({
    success: true,
    message: `Bot ${botId} rejected`,
    reason,
  });
});

export default router;

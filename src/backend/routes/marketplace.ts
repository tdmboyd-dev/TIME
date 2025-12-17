/**
 * TIME — Meta-Intelligence Trading Governor
 * Bot Marketplace Routes
 */

import { Router, Request, Response } from 'express';
import { botMarketplace, STANDARD_RENTAL_PLANS, HOSTING_PLANS } from '../services/BotMarketplace';
import { botManager } from '../bots/bot_manager';
import { loggers } from '../utils/logger';

const router = Router();
const log = loggers.api;

/**
 * GET /marketplace/listings
 * Get all marketplace listings with optional filters
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const { category, minWinRate, maxPrice, verified } = req.query;

    const listings = botMarketplace.getAllListings({
      category: category as any,
      minWinRate: minWinRate ? parseFloat(minWinRate as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      verified: verified ? verified === 'true' : undefined,
    });

    res.json({
      success: true,
      data: listings,
      total: listings.length,
    });
  } catch (error) {
    log.error('Failed to get marketplace listings:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get listings' });
  }
});

/**
 * GET /marketplace/listing/:botId
 * Get single bot listing details
 */
router.get('/listing/:botId', async (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    const listings = botMarketplace.getAllListings();
    const listing = listings.find(l => l.botId === botId);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    log.error('Failed to get listing:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get listing' });
  }
});

/**
 * GET /marketplace/plans
 * Get standard rental plans
 */
router.get('/plans', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: STANDARD_RENTAL_PLANS,
  });
});

/**
 * GET /marketplace/hosting-plans
 * Get hosting plans for bot creators (industry-standard)
 */
router.get('/hosting-plans', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: HOSTING_PLANS,
    description: 'Hosting plans for bot creators to list and manage their bots on TIME Marketplace',
  });
});

/**
 * POST /marketplace/rent
 * Rent a bot (requires auth)
 */
router.post('/rent', async (req: Request, res: Response) => {
  try {
    const { botId, planId, paymentMethod, transactionId } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    if (!botId || !planId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: botId, planId',
      });
    }

    const rental = await botMarketplace.rentBot(botId, userId, planId, {
      paymentMethod: paymentMethod || 'card',
      transactionId: transactionId || `TXN-${Date.now()}`,
    });

    res.json({
      success: true,
      data: rental,
      message: 'Bot rental successful!',
    });
  } catch (error) {
    log.error('Failed to rent bot:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /marketplace/my-rentals
 * Get user's rentals (requires auth)
 */
router.get('/my-rentals', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const rentals = botMarketplace.getUserRentals(userId);

    res.json({
      success: true,
      data: rentals,
      total: rentals.length,
    });
  } catch (error) {
    log.error('Failed to get user rentals:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get rentals' });
  }
});

/**
 * GET /marketplace/stats
 * Get marketplace statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = botMarketplace.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log.error('Failed to get marketplace stats:', error as object);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

/**
 * POST /marketplace/review
 * Add review for a bot (requires auth)
 */
router.post('/review', (req: Request, res: Response) => {
  try {
    const { botId, rentalId, rating, title, content } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    if (!botId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: botId, rating',
      });
    }

    const review = botMarketplace.addReview(botId, userId, rentalId || 'direct', {
      rating,
      title: title || 'Review',
      content: content || '',
    });

    res.json({
      success: true,
      data: review,
      message: 'Review added successfully!',
    });
  } catch (error) {
    log.error('Failed to add review:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /marketplace/list-bot
 * List a bot on marketplace (admin/owner only)
 */
router.post('/list-bot', async (req: Request, res: Response) => {
  try {
    const {
      botId,
      botName,
      description,
      category,
      strategy,
      performanceFee,
      isAutoRental,
    } = req.body;

    const userId = (req as any).user?.id;

    // Get bot from manager for performance data
    const bot = botManager.getBot(botId);
    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    const listing = botMarketplace.listBot(
      botId,
      botName || bot.name,
      userId || null,
      {
        description: description || bot.description,
        category: category || 'multi-asset',
        strategy: strategy || bot.fingerprint.strategyType[0],
        winRate: bot.performance.winRate,
        profitFactor: bot.performance.profitFactor,
        sharpeRatio: bot.performance.sharpeRatio,
        maxDrawdown: bot.performance.maxDrawdown,
        totalTrades: bot.performance.totalTrades,
        avgMonthlyReturn: (bot.performance.totalPnL / 12) || 0,
        performanceFee,
        isAutoRental,
      }
    );

    res.json({
      success: true,
      data: listing,
      message: 'Bot listed on marketplace!',
    });
  } catch (error) {
    log.error('Failed to list bot:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /marketplace/admin/auto-list-all
 * Admin endpoint to auto-list ALL bots with performance data to marketplace
 * Full abilities enabled: auto-rental, verified, ready for trading
 */
router.post('/admin/auto-list-all', async (req: Request, res: Response) => {
  try {
    // Check admin auth
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    // Auto-list all bots from BotManager
    const result = botMarketplace.autoListAllBots(() => botManager.getAllBots());

    res.json({
      success: true,
      message: `Auto-listed ${result.listed} bots to marketplace`,
      data: result,
      marketplaceStats: botMarketplace.getStats(),
    });
  } catch (error) {
    log.error('Failed to auto-list bots:', error as object);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /marketplace/check-access/:botId
 * Check if user has access to a bot
 */
router.get('/check-access/:botId', (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    const userId = (req as any).user?.id || 'anonymous';

    const hasAccess = botMarketplace.hasActiveRental(userId, botId);

    res.json({
      success: true,
      data: {
        hasAccess,
        botId,
        userId,
      },
    });
  } catch (error) {
    log.error('Failed to check access:', error as object);
    res.status(500).json({ success: false, error: 'Failed to check access' });
  }
});

export default router;

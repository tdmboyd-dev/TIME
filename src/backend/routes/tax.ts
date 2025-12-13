/**
 * TIME Tax API Routes
 *
 * Endpoints for tax-loss harvesting and tax optimization.
 */

import { Router, Request, Response } from 'express';
import { taxLossHarvester, REPLACEMENT_SECURITIES } from '../tax/tax_loss_harvester';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/tax/harvest/opportunities
 * Find tax-loss harvesting opportunities
 */
router.post('/harvest/opportunities', async (req: Request, res: Response) => {
  try {
    const { positions, taxLots, options } = req.body;

    if (!positions || !taxLots) {
      return res.status(400).json({ error: 'positions and taxLots are required' });
    }

    const opportunities = await taxLossHarvester.findOpportunities(positions, taxLots, options);

    res.json({
      success: true,
      data: {
        opportunities,
        summary: {
          count: opportunities.length,
          totalPotentialSavings: opportunities.reduce((sum, o) => sum + o.estimatedTaxSavings, 0),
          harvestRecommended: opportunities.filter((o) => o.recommendation === 'harvest').length,
          waitRecommended: opportunities.filter((o) => o.recommendation === 'wait').length,
        },
      },
    });
  } catch (error) {
    logger.error('Find harvest opportunities failed', { error });
    res.status(500).json({ error: 'Failed to find harvest opportunities' });
  }
});

/**
 * POST /api/v1/tax/harvest/execute
 * Execute a tax-loss harvest
 */
router.post('/harvest/execute', async (req: Request, res: Response) => {
  try {
    const { opportunity } = req.body;

    if (!opportunity) {
      return res.status(400).json({ error: 'opportunity is required' });
    }

    // Mock trade execution (in production, would use actual broker)
    const executeTrade = async (order: { symbol: string; side: 'buy' | 'sell'; shares: number }) => {
      return {
        orderId: `order_${Date.now()}`,
        filledPrice: order.side === 'sell' ? opportunity.position.currentPrice : opportunity.position.currentPrice,
        filledShares: order.shares,
      };
    };

    const result = await taxLossHarvester.executeHarvest(opportunity, executeTrade);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    logger.error('Execute harvest failed', { error });
    res.status(500).json({ error: 'Failed to execute harvest' });
  }
});

/**
 * GET /api/v1/tax/harvest/summary
 * Get yearly tax-loss harvesting summary
 */
router.get('/harvest/summary', (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const summary = taxLossHarvester.getYearlySummary(year);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Get harvest summary failed', { error });
    res.status(500).json({ error: 'Failed to get harvest summary' });
  }
});

/**
 * GET /api/v1/tax/harvest/wash-sale-calendar
 * Get wash sale calendar (when symbols can be traded)
 */
router.get('/harvest/wash-sale-calendar', (req: Request, res: Response) => {
  try {
    const calendar = taxLossHarvester.getWashSaleCalendar();

    res.json({
      success: true,
      data: {
        calendar,
        message: 'Shows when symbols can be repurchased without triggering wash sale',
      },
    });
  } catch (error) {
    logger.error('Get wash sale calendar failed', { error });
    res.status(500).json({ error: 'Failed to get wash sale calendar' });
  }
});

/**
 * GET /api/v1/tax/harvest/replacements
 * Get available replacement securities
 */
router.get('/harvest/replacements', (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;

    if (symbol) {
      const mapping = REPLACEMENT_SECURITIES.find((m) => m.original === symbol);
      res.json({
        success: true,
        data: mapping || { message: 'No replacements found for this symbol' },
      });
    } else {
      res.json({
        success: true,
        data: REPLACEMENT_SECURITIES,
      });
    }
  } catch (error) {
    logger.error('Get replacements failed', { error });
    res.status(500).json({ error: 'Failed to get replacements' });
  }
});

export default router;

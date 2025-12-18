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
 * Execute a tax-loss harvest with REAL broker integration
 */
router.post('/harvest/execute', async (req: Request, res: Response) => {
  try {
    const { opportunity, brokerId } = req.body;

    if (!opportunity) {
      return res.status(400).json({ error: 'opportunity is required' });
    }

    // Import BrokerManager for REAL trade execution
    const { BrokerManager } = await import('../brokers/broker_manager');
    const brokerManager = BrokerManager.getInstance();

    // Verify broker is connected
    const status = brokerManager.getStatus();
    if (status.connectedBrokers === 0) {
      return res.status(503).json({
        error: 'No brokers connected. Please connect a broker first.',
        availableBrokers: status.brokers
      });
    }

    // REAL trade execution via BrokerManager
    const executeTrade = async (order: { symbol: string; side: 'buy' | 'sell'; shares: number }) => {
      logger.info('Executing REAL tax-loss harvest trade', order);

      // Submit order to broker
      const result = await brokerManager.submitOrder(
        {
          symbol: order.symbol,
          side: order.side,
          type: 'market',
          quantity: order.shares,
        },
        'stock',
        brokerId
      );

      // Wait a moment for order to fill
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get filled price from broker
      const broker = brokerManager.getBroker(result.brokerId);
      let filledPrice = opportunity.position.currentPrice;
      let filledShares = order.shares;

      if (broker) {
        try {
          const orderStatus = await broker.getOrder(result.order.id);
          if (orderStatus && orderStatus.averageFilledPrice) {
            filledPrice = orderStatus.averageFilledPrice;
          }
          if (orderStatus && orderStatus.filledQuantity) {
            filledShares = orderStatus.filledQuantity;
          }
        } catch (e) {
          logger.warn('Could not get order fill details, using estimates');
        }
      }

      logger.info('Tax-loss harvest trade executed', {
        symbol: order.symbol,
        side: order.side,
        shares: filledShares,
        price: filledPrice,
        orderId: result.order.id,
        brokerId: result.brokerId
      });

      return {
        orderId: result.order.id,
        filledPrice,
        filledShares,
      };
    };

    const result = await taxLossHarvester.executeHarvest(opportunity, executeTrade);

    res.json({
      success: result.success,
      data: {
        ...result,
        broker: brokerId || 'auto-routed'
      },
    });
  } catch (error) {
    logger.error('Execute harvest failed', { error });
    res.status(500).json({ error: 'Failed to execute harvest' });
  }
});

/**
 * GET /api/v1/tax/harvest/scan
 * Auto-scan portfolio for tax-loss harvesting opportunities using REAL broker data
 */
router.get('/harvest/scan', async (req: Request, res: Response) => {
  try {
    const brokerId = req.query.brokerId as string | undefined;
    const minLoss = req.query.minLoss ? parseFloat(req.query.minLoss as string) : undefined;

    // Import BrokerManager for real position data
    const { BrokerManager } = await import('../brokers/broker_manager');
    const brokerManager = BrokerManager.getInstance();

    const status = brokerManager.getStatus();
    if (status.connectedBrokers === 0) {
      return res.status(503).json({ error: 'No brokers connected' });
    }

    // Get real positions from broker
    const allPositions = await brokerManager.getAllPositions();

    // Convert to TaxLossHarvester format
    const positions: Array<{
      symbol: string;
      shares: number;
      costBasis: number;
      currentPrice: number;
      purchaseDate: Date;
      accountId: string;
      lotId: string;
    }> = [];

    const taxLots: Array<{
      lotId: string;
      symbol: string;
      shares: number;
      purchasePrice: number;
      purchaseDate: Date;
      accountId: string;
    }> = [];

    for (const { brokerId: broker, position } of allPositions) {
      if (brokerId && broker !== brokerId) continue;

      // Calculate cost basis from entry price
      const costBasis = position.entryPrice * position.quantity;

      // Skip positions with no cost basis data
      if (!costBasis || costBasis === 0) continue;

      const lotId = `${broker}_${position.symbol}_${Date.now()}`;

      positions.push({
        symbol: position.symbol,
        shares: position.quantity,
        costBasis: costBasis,
        currentPrice: position.currentPrice,
        purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Approximate 6 months ago
        accountId: broker,
        lotId,
      });

      taxLots.push({
        lotId,
        symbol: position.symbol,
        shares: position.quantity,
        purchasePrice: position.entryPrice,
        purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        accountId: broker,
      });
    }

    // Find opportunities
    const opportunities = await taxLossHarvester.findOpportunities(positions, taxLots, { minLoss });

    res.json({
      success: true,
      data: {
        scannedPositions: positions.length,
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
    logger.error('Tax harvest scan failed', { error });
    res.status(500).json({ error: 'Failed to scan for harvest opportunities' });
  }
});

/**
 * POST /api/v1/tax/harvest/auto
 * Auto-execute all recommended tax-loss harvests
 */
router.post('/harvest/auto', async (req: Request, res: Response) => {
  try {
    const { brokerId, maxHarvests = 5, minSavings = 50 } = req.body;

    // Import BrokerManager
    const { BrokerManager } = await import('../brokers/broker_manager');
    const brokerManager = BrokerManager.getInstance();

    const status = brokerManager.getStatus();
    if (status.connectedBrokers === 0) {
      return res.status(503).json({ error: 'No brokers connected' });
    }

    // Get real positions
    const allPositions = await brokerManager.getAllPositions();

    const positions: Array<any> = [];
    const taxLots: Array<any> = [];

    for (const { brokerId: broker, position } of allPositions) {
      if (brokerId && broker !== brokerId) continue;

      // Calculate cost basis from entry price
      const costBasis = position.entryPrice * position.quantity;
      if (!costBasis || costBasis === 0) continue;

      const lotId = `${broker}_${position.symbol}_${Date.now()}`;

      positions.push({
        symbol: position.symbol,
        shares: position.quantity,
        costBasis: costBasis,
        currentPrice: position.currentPrice,
        purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        accountId: broker,
        lotId,
      });

      taxLots.push({
        lotId,
        symbol: position.symbol,
        shares: position.quantity,
        purchasePrice: position.entryPrice,
        purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        accountId: broker,
      });
    }

    // Find opportunities
    const opportunities = await taxLossHarvester.findOpportunities(positions, taxLots);

    // Filter to harvest-recommended with minimum savings
    const toExecute = opportunities
      .filter(o => o.recommendation === 'harvest' && o.estimatedTaxSavings >= minSavings)
      .slice(0, maxHarvests);

    const results: Array<any> = [];

    // Execute each harvest
    for (const opportunity of toExecute) {
      const executeTrade = async (order: { symbol: string; side: 'buy' | 'sell'; shares: number }) => {
        const result = await brokerManager.submitOrder(
          {
            symbol: order.symbol,
            side: order.side,
            type: 'market',
            quantity: order.shares,
          },
          'stock',
          brokerId
        );

        return {
          orderId: result.order.id,
          filledPrice: opportunity.position.currentPrice,
          filledShares: order.shares,
        };
      };

      const result = await taxLossHarvester.executeHarvest(opportunity, executeTrade);
      results.push(result);
    }

    const successful = results.filter(r => r.success);
    const totalSavings = successful.reduce((sum, r) => sum + r.actualTaxSavings, 0);

    res.json({
      success: true,
      data: {
        opportunitiesFound: opportunities.length,
        harvestsExecuted: results.length,
        successfulHarvests: successful.length,
        totalTaxSavings: totalSavings,
        results,
      },
    });
  } catch (error) {
    logger.error('Auto harvest failed', { error });
    res.status(500).json({ error: 'Failed to auto-execute harvests' });
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

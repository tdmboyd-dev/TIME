/**
 * Portfolio API Routes
 *
 * Endpoints for:
 * - Real broker portfolio data
 * - Aggregated positions across all connected brokers
 * - Broker connection status
 */

import { Router, Request, Response } from 'express';
import { BrokerManager } from '../brokers/broker_manager';

const router = Router();

/**
 * GET /portfolio/positions
 * Get all real positions from connected brokers
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const brokerManager = BrokerManager.getInstance();
    const positions = await brokerManager.getAllPositions();

    // Transform positions to frontend format
    const formattedPositions = positions.map((p, idx) => ({
      id: `${p.brokerId}-${p.position.symbol}`,
      symbol: p.position.symbol,
      name: p.position.symbol, // TODO: Enrich with full names
      type: p.position.assetClass || 'stock',
      quantity: p.position.quantity,
      avgPrice: p.position.avgPrice,
      currentPrice: p.position.currentPrice,
      value: p.position.marketValue,
      pnl: p.position.unrealizedPnL,
      pnlPercent: p.position.unrealizedPnLPercent,
      allocation: 0, // Will be calculated on frontend
      broker: p.brokerId,
      side: p.position.side,
    }));

    res.json({
      success: true,
      data: formattedPositions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch positions',
    });
  }
});

/**
 * GET /portfolio/summary
 * Get aggregated portfolio summary across all brokers
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const brokerManager = BrokerManager.getInstance();
    const portfolio = await brokerManager.getAggregatedPortfolio();

    // Calculate total P&L
    let totalPnL = 0;
    let totalInvested = 0;
    const positionsByType: Record<string, number> = {};

    for (const position of portfolio.positions.values()) {
      totalPnL += position.unrealizedPnL;
      totalInvested += position.quantity * position.avgPrice;

      const type = position.assetClass || 'stock';
      positionsByType[type] = (positionsByType[type] || 0) + 1;
    }

    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Find best and worst performers
    const positionsArray = Array.from(portfolio.positions.values());
    const bestPerformer = positionsArray.reduce((best, p) =>
      p.unrealizedPnLPercent > (best?.unrealizedPnLPercent || -Infinity) ? p : best
    , positionsArray[0]);

    const worstPerformer = positionsArray.reduce((worst, p) =>
      p.unrealizedPnLPercent < (worst?.unrealizedPnLPercent || Infinity) ? p : worst
    , positionsArray[0]);

    res.json({
      success: true,
      data: {
        totalValue: portfolio.totalEquity,
        totalCash: portfolio.totalCash,
        totalBuyingPower: portfolio.totalBuyingPower,
        totalMarginUsed: portfolio.totalMarginUsed,
        totalPnL,
        totalPnLPercent,
        positionCount: portfolio.positions.size,
        positionsByType,
        bestPerformer: bestPerformer ? {
          symbol: bestPerformer.symbol,
          pnlPercent: bestPerformer.unrealizedPnLPercent,
        } : null,
        worstPerformer: worstPerformer ? {
          symbol: worstPerformer.symbol,
          pnlPercent: worstPerformer.unrealizedPnLPercent,
        } : null,
        brokerCount: portfolio.byBroker.size,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch portfolio summary',
    });
  }
});

/**
 * GET /portfolio/brokers/status
 * Get connection status of all brokers
 */
router.get('/brokers/status', async (req: Request, res: Response) => {
  try {
    const brokerManager = BrokerManager.getInstance();
    const status = brokerManager.getStatus();

    res.json({
      success: true,
      data: {
        connectedBrokers: status.connectedBrokers,
        totalBrokers: status.totalBrokers,
        brokers: status.brokers.map(b => ({
          id: b.id,
          name: b.name,
          type: b.type,
          connected: b.connected,
          status: b.connected ? 'online' : 'offline',
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch broker status',
    });
  }
});

/**
 * GET /portfolio/trades
 * Get recent trades across all brokers
 */
router.get('/trades', async (req: Request, res: Response) => {
  try {
    const brokerManager = BrokerManager.getInstance();
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    // Get last 30 days of trades
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const trades = await brokerManager.getTradeHistory(start, end);

    // Format trades for frontend
    const formattedTrades = trades.slice(0, limit).map((t, idx) => ({
      id: `${t.brokerId}-${t.trade.id || idx}`,
      type: t.trade.side === 'buy' ? 'buy' : 'sell',
      symbol: t.trade.symbol,
      quantity: t.trade.quantity,
      price: t.trade.price,
      total: t.trade.quantity * t.trade.price,
      date: t.trade.timestamp,
      broker: t.brokerId,
    }));

    res.json({
      success: true,
      data: formattedTrades,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trades',
    });
  }
});

/**
 * GET /portfolio/broker/:brokerId/account
 * Get account info for a specific broker
 */
router.get('/broker/:brokerId/account', async (req: Request, res: Response) => {
  try {
    const brokerManager = BrokerManager.getInstance();
    const account = await brokerManager.getAccount(req.params.brokerId);

    res.json({
      success: true,
      data: account,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: error.message || 'Broker not found or not connected',
    });
  }
});

export default router;

/**
 * Portfolio API Routes
 *
 * Endpoints for:
 * - Real broker portfolio data
 * - Aggregated positions across all connected brokers
 * - Broker connection status
 *
 * ALL endpoints require authentication - portfolio data is sensitive
 */

import { Router, Request, Response } from 'express';
import { BrokerManager } from '../brokers/broker_manager';
import { authMiddleware } from './auth';

const router = Router();

// Apply authentication to ALL portfolio routes
router.use(authMiddleware);

/**
 * GET /portfolio/positions
 * Get all real positions from connected brokers
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const brokerManager = BrokerManager.getInstance();
    const positions = await brokerManager.getAllPositions();

    // Transform positions to frontend format
    const formattedPositions = positions.map((p, idx) => {
      const pnlPercent = p.position.entryPrice > 0
        ? ((p.position.currentPrice - p.position.entryPrice) / p.position.entryPrice) * 100
        : 0;
      return {
        id: `${p.brokerId}-${p.position.symbol}`,
        symbol: p.position.symbol,
        name: p.position.symbol, // TODO: Enrich with full names
        type: 'stock' as const, // Default type
        quantity: p.position.quantity,
        avgPrice: p.position.entryPrice,
        currentPrice: p.position.currentPrice,
        value: p.position.marketValue,
        pnl: p.position.unrealizedPnL,
        pnlPercent,
        allocation: 0, // Will be calculated on frontend
        broker: p.brokerId,
        side: p.position.side,
      };
    });

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

    // Helper to calculate PnL percent
    const calcPnLPercent = (pos: any) => {
      return pos.entryPrice > 0
        ? ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100
        : 0;
    };

    for (const position of portfolio.positions.values()) {
      totalPnL += position.unrealizedPnL;
      totalInvested += position.quantity * position.entryPrice;

      const type = 'stock'; // Default type
      positionsByType[type] = (positionsByType[type] || 0) + 1;
    }

    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Find best and worst performers
    const positionsArray = Array.from(portfolio.positions.values());
    const bestPerformer = positionsArray.reduce((best, p) =>
      calcPnLPercent(p) > (best ? calcPnLPercent(best) : -Infinity) ? p : best
    , positionsArray[0]);

    const worstPerformer = positionsArray.reduce((worst, p) =>
      calcPnLPercent(p) < (worst ? calcPnLPercent(worst) : Infinity) ? p : worst
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
          pnlPercent: calcPnLPercent(bestPerformer),
        } : null,
        worstPerformer: worstPerformer ? {
          symbol: worstPerformer.symbol,
          pnlPercent: calcPnLPercent(worstPerformer),
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

    // If no brokers registered yet, return demo brokers
    if (status.totalBrokers === 0) {
      return res.json({
        success: true,
        data: {
          connectedBrokers: 2,
          totalBrokers: 4,
          brokers: [
            { id: 'alpaca-demo', name: 'Alpaca', type: 'alpaca', connected: true, status: 'online' },
            { id: 'kraken-demo', name: 'Kraken', type: 'crypto', connected: true, status: 'online' },
            { id: 'binance-demo', name: 'Binance', type: 'crypto', connected: false, status: 'offline' },
            { id: 'oanda-demo', name: 'OANDA', type: 'forex', connected: false, status: 'offline' },
          ],
        },
        demo: true,
        timestamp: new Date().toISOString(),
      });
    }

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
    // Even on error, return demo data for frontend
    res.json({
      success: true,
      data: {
        connectedBrokers: 2,
        totalBrokers: 4,
        brokers: [
          { id: 'alpaca-demo', name: 'Alpaca', type: 'alpaca', connected: true, status: 'online' },
          { id: 'kraken-demo', name: 'Kraken', type: 'crypto', connected: true, status: 'online' },
          { id: 'binance-demo', name: 'Binance', type: 'crypto', connected: false, status: 'offline' },
          { id: 'oanda-demo', name: 'OANDA', type: 'forex', connected: false, status: 'offline' },
        ],
      },
      demo: true,
      error: error.message,
      timestamp: new Date().toISOString(),
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

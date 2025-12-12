/**
 * TIME Advanced Broker API Routes
 *
 * Endpoints for:
 * - Smart Order Routing (SOR)
 * - Multi-Broker Arbitrage
 * - Unified Liquidity Aggregation
 * - Real-time Execution Analytics
 * - Venue Performance
 */

import { Router, Request, Response } from 'express';
import { advancedBrokerEngine } from '../brokers/advanced_broker_engine';

const router = Router();

// =============================================================================
// VENUES
// =============================================================================

/**
 * GET /advanced-broker/venues
 * Get all connected trading venues
 */
router.get('/venues', (req: Request, res: Response) => {
  const venues = advancedBrokerEngine.getVenues();

  res.json({
    success: true,
    data: {
      total: venues.length,
      connected: venues.filter(v => v.connected).length,
      byType: {
        lit: venues.filter(v => v.type === 'lit').length,
        dark: venues.filter(v => v.type === 'dark').length,
        ecn: venues.filter(v => v.type === 'ecn').length,
        cex: venues.filter(v => v.type === 'cex').length,
        dex: venues.filter(v => v.type === 'dex').length,
        otc: venues.filter(v => v.type === 'otc').length,
      },
      venues: venues.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        region: v.region,
        latencyMs: v.latencyMs,
        liquidityScore: v.liquidityScore,
        fillRate: v.fillRate,
        avgSlippage: v.avgSlippage,
        fees: v.fees,
        connected: v.connected,
        darkPoolAccess: v.darkPoolAccess,
        marginEnabled: v.marginEnabled,
        currentSpread: v.currentSpread,
        imbalance: v.imbalance,
      })),
    },
  });
});

/**
 * GET /advanced-broker/venues/:venueId
 * Get details for a specific venue
 */
router.get('/venues/:venueId', (req: Request, res: Response) => {
  const venues = advancedBrokerEngine.getVenues();
  const venue = venues.find(v => v.id === req.params.venueId);

  if (!venue) {
    return res.status(404).json({ success: false, error: 'Venue not found' });
  }

  res.json({ success: true, data: venue });
});

/**
 * GET /advanced-broker/venues/performance
 * Get historical performance metrics for all venues
 */
router.get('/venues/performance', (req: Request, res: Response) => {
  const performance = advancedBrokerEngine.getVenuePerformance();

  res.json({
    success: true,
    data: Object.fromEntries(performance),
  });
});

// =============================================================================
// SMART ORDERS
// =============================================================================

/**
 * POST /advanced-broker/smart-order
 * Create a new smart order with AI-optimized routing
 */
router.post('/smart-order', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      side,
      quantity,
      orderType,
      limitPrice,
      urgency,
      darkPoolPriority,
      maxSlippageBps,
      useAI,
    } = req.body;

    // Validation
    if (!symbol || !side || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, side, quantity',
      });
    }

    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({
        success: false,
        error: 'Side must be "buy" or "sell"',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be positive',
      });
    }

    const order = await advancedBrokerEngine.createSmartOrder({
      symbol,
      side,
      quantity: Number(quantity),
      orderType: orderType || 'adaptive',
      limitPrice: limitPrice ? Number(limitPrice) : undefined,
      urgency: urgency || 'medium',
      darkPoolPriority: darkPoolPriority || false,
      maxSlippageBps: maxSlippageBps ? Number(maxSlippageBps) : 10,
      useAI: useAI !== false,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        quantityFilled: order.quantityFilled,
        avgFillPrice: order.avgFillPrice,
        benchmarkPrice: order.benchmarkPrice,
        executionPlan: {
          strategy: order.executionPlan.strategy,
          venueCount: order.executionPlan.venues.length,
          expectedSlippage: order.executionPlan.expectedSlippage,
          confidence: order.executionPlan.confidence,
          venues: order.executionPlan.venues.map(v => ({
            venue: v.venueName,
            percentage: (v.percentage * 100).toFixed(1) + '%',
            quantity: v.quantity,
            orderType: v.orderType,
          })),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create smart order',
    });
  }
});

/**
 * GET /advanced-broker/smart-orders
 * Get all active smart orders
 */
router.get('/smart-orders', (req: Request, res: Response) => {
  const orders = advancedBrokerEngine.getActiveOrders();

  res.json({
    success: true,
    data: {
      count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side,
        quantity: o.quantity,
        quantityFilled: o.quantityFilled,
        quantityRemaining: o.quantityRemaining,
        status: o.status,
        avgFillPrice: o.avgFillPrice,
        benchmarkPrice: o.benchmarkPrice,
        implementationShortfall: o.implementationShortfall,
        venueCount: o.venueContributions.size,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
    },
  });
});

/**
 * GET /advanced-broker/smart-orders/:orderId
 * Get details for a specific smart order
 */
router.get('/smart-orders/:orderId', (req: Request, res: Response) => {
  const orders = advancedBrokerEngine.getActiveOrders();
  const order = orders.find(o => o.id === req.params.orderId);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  res.json({
    success: true,
    data: {
      ...order,
      venueContributions: Object.fromEntries(order.venueContributions),
    },
  });
});

// =============================================================================
// ARBITRAGE
// =============================================================================

/**
 * GET /advanced-broker/arbitrage/opportunities
 * Get current arbitrage opportunities
 */
router.get('/arbitrage/opportunities', (req: Request, res: Response) => {
  const opportunities = advancedBrokerEngine.getArbitrageOpportunities();

  res.json({
    success: true,
    data: {
      count: opportunities.length,
      opportunities: opportunities.map(o => ({
        id: o.id,
        symbol: o.symbol,
        type: o.type,
        buyVenue: o.buyVenue,
        buyPrice: o.buyPrice,
        sellVenue: o.sellVenue,
        sellPrice: o.sellPrice,
        spreadBps: o.spreadBps.toFixed(2),
        netProfitBps: o.netProfitBps.toFixed(2),
        quantity: o.quantity,
        maxQuantity: o.maxQuantity,
        confidence: (o.confidence * 100).toFixed(1) + '%',
        riskScore: o.riskScore,
        executionWindowMs: o.executionWindow,
        expiresIn: Math.max(0, o.expiresAt.getTime() - Date.now()) + 'ms',
        detectedAt: o.detectedAt,
      })),
    },
  });
});

/**
 * POST /advanced-broker/arbitrage/execute/:opportunityId
 * Execute an arbitrage opportunity
 */
router.post('/arbitrage/execute/:opportunityId', async (req: Request, res: Response) => {
  try {
    const result = await advancedBrokerEngine.executeArbitrage(req.params.opportunityId);

    res.json({
      success: result.success,
      data: {
        profit: result.profit,
        error: result.error,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute arbitrage',
    });
  }
});

// =============================================================================
// LIQUIDITY
// =============================================================================

/**
 * GET /advanced-broker/liquidity/:symbol
 * Get aggregated liquidity for a symbol
 */
router.get('/liquidity/:symbol', (req: Request, res: Response) => {
  const pool = advancedBrokerEngine.getLiquidityPool(req.params.symbol);

  if (!pool) {
    return res.status(404).json({
      success: false,
      error: 'Liquidity pool not found for symbol',
    });
  }

  res.json({
    success: true,
    data: {
      symbol: pool.symbol,
      totalBidLiquidity: pool.totalBidLiquidity,
      totalAskLiquidity: pool.totalAskLiquidity,
      compositeBid: pool.compositeBid,
      compositeAsk: pool.compositeAsk,
      compositeSpread: pool.compositeSpread,
      spreadBps: ((pool.compositeSpread / pool.compositeBid) * 10000).toFixed(2),
      imbalance: pool.imbalance.toFixed(3),
      qualityScore: pool.qualityScore,
      venues: Object.fromEntries(pool.venues),
    },
  });
});

/**
 * GET /advanced-broker/liquidity
 * Get all liquidity pools
 */
router.get('/liquidity', (req: Request, res: Response) => {
  const state = advancedBrokerEngine.getState();
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'BTC', 'ETH', 'EURUSD'];

  const pools = symbols.map(symbol => {
    const pool = advancedBrokerEngine.getLiquidityPool(symbol);
    if (!pool) return null;
    return {
      symbol: pool.symbol,
      totalLiquidity: pool.totalBidLiquidity + pool.totalAskLiquidity,
      spread: pool.compositeSpread,
      quality: pool.qualityScore,
    };
  }).filter(Boolean);

  res.json({
    success: true,
    data: { pools },
  });
});

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * GET /advanced-broker/analytics/executions
 * Get execution analytics history
 */
router.get('/analytics/executions', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const analytics = advancedBrokerEngine.getExecutionAnalytics(limit);

  res.json({
    success: true,
    data: {
      count: analytics.length,
      executions: analytics.map(a => ({
        orderId: a.orderId,
        benchmarks: a.benchmarks,
        actual: a.actual,
        performance: a.performance,
        venueCount: a.venue_breakdown.size,
        recommendations: a.recommendations,
      })),
    },
  });
});

/**
 * GET /advanced-broker/analytics/summary
 * Get summary analytics
 */
router.get('/analytics/summary', (req: Request, res: Response) => {
  const analytics = advancedBrokerEngine.getExecutionAnalytics(100);

  if (analytics.length === 0) {
    return res.json({
      success: true,
      data: {
        totalExecutions: 0,
        message: 'No execution history yet',
      },
    });
  }

  // Calculate averages
  const avgSlippage = analytics.reduce((sum, a) =>
    sum + a.performance.slippageBps, 0) / analytics.length;

  const avgVsVWAP = analytics.reduce((sum, a) =>
    sum + a.performance.vsVWAP, 0) / analytics.length;

  const avgShortfall = analytics.reduce((sum, a) =>
    sum + a.performance.implementationShortfall, 0) / analytics.length;

  const totalVolume = analytics.reduce((sum, a) =>
    sum + a.actual.totalCost, 0);

  const totalFees = analytics.reduce((sum, a) =>
    sum + a.actual.totalFees, 0);

  res.json({
    success: true,
    data: {
      totalExecutions: analytics.length,
      avgSlippageBps: avgSlippage.toFixed(2),
      avgVsVWAPBps: avgVsVWAP.toFixed(2),
      avgImplementationShortfallBps: avgShortfall.toFixed(2),
      totalVolume: totalVolume.toFixed(2),
      totalFees: totalFees.toFixed(2),
      venuePerformance: Object.fromEntries(advancedBrokerEngine.getVenuePerformance()),
    },
  });
});

// =============================================================================
// SYSTEM
// =============================================================================

/**
 * GET /advanced-broker/status
 * Get overall system status
 */
router.get('/status', (req: Request, res: Response) => {
  const state = advancedBrokerEngine.getState();

  res.json({
    success: true,
    data: {
      status: 'operational',
      venues: {
        total: state.venueCount,
        connected: state.connectedVenues,
      },
      activeOrders: state.activeOrders,
      arbitrageOpportunities: state.arbitrageOpportunities,
      liquidityPools: state.liquidityPools,
      executionHistory: state.executionHistory,
      marketConditions: state.marketConditions,
    },
  });
});

/**
 * GET /advanced-broker/order-types
 * Get supported order types
 */
router.get('/order-types', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      basic: ['market', 'limit', 'stop', 'stop_limit'],
      algorithmic: ['twap', 'vwap', 'pov', 'implementation_shortfall', 'arrival_price'],
      advanced: ['iceberg', 'dark_sweep', 'lit_sweep', 'sniper', 'stealth', 'aggressive', 'passive', 'adaptive'],
      descriptions: {
        market: 'Execute immediately at best available price',
        limit: 'Execute at specified price or better',
        stop: 'Trigger market order when price reaches stop level',
        stop_limit: 'Trigger limit order when price reaches stop level',
        twap: 'Time-Weighted Average Price - spread execution over time',
        vwap: 'Volume-Weighted Average Price - follow market volume',
        pov: 'Percentage of Volume - participate at a % of market volume',
        implementation_shortfall: 'Minimize slippage from decision price',
        arrival_price: 'Minimize deviation from arrival price',
        iceberg: 'Show small portion, hide true size',
        dark_sweep: 'Route to dark pools first',
        lit_sweep: 'Route to lit venues first',
        sniper: 'Target specific dark pool liquidity',
        stealth: 'Minimize market footprint',
        aggressive: 'Take liquidity aggressively',
        passive: 'Provide liquidity passively',
        adaptive: 'AI-controlled, adapts to market conditions',
      },
    },
  });
});

export default router;

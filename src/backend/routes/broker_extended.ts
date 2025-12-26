/**
 * Extended Broker API Routes
 *
 * Additional endpoints for broker management:
 * - GET /brokers/available - List all available brokers
 * - GET /brokers/accounts - Get all connected accounts
 * - GET /brokers/positions - Get all positions
 * - POST /brokers/orders - Submit orders
 * - GET /brokers/orders - Get order history
 * - DELETE /brokers/orders/:orderId - Cancel order
 * - GET /brokers/trades - Get trade history
 * - POST /brokers/connect/:broker/oauth - OAuth flow
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { userRepository } from '../database/repositories';
import { BrokerManager } from '../brokers/broker_manager';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('BrokerExtendedRoutes');

// Apply authentication to ALL routes
router.use(authMiddleware);

// Helper function to get broker name
function getBrokerName(brokerType: string): string {
  const names: Record<string, string> = {
    alpaca: 'Alpaca', interactive_brokers: 'Interactive Brokers', td_ameritrade: 'TD Ameritrade',
    robinhood: 'Robinhood', vanguard: 'Vanguard', fidelity: 'Fidelity', schwab: 'Charles Schwab',
    coinbase: 'Coinbase', binance: 'Binance', kraken: 'Kraken', gemini: 'Gemini',
    oanda: 'OANDA', forex_com: 'FOREX.com', ig: 'IG',
    tastytrade: 'tastytrade', tradier: 'Tradier', tradestation: 'TradeStation',
    etrade: 'E*TRADE', webull: 'Webull', sofi: 'SoFi Invest',
    snaptrade: 'SnapTrade', plaid: 'Plaid',
  };
  return names[brokerType] || brokerType;
}

/**
 * GET /available
 * Get list of all available brokers for connection
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const availableBrokers = [
      // Popular Trading Platforms
      {
        id: 'alpaca',
        name: 'Alpaca',
        description: 'Commission-free stock & crypto trading API',
        logo: '/brokers/alpaca.png',
        assetClasses: ['stocks', 'crypto'],
        features: ['Paper Trading', 'Real-time Data', 'Fractional Shares', 'API Access'],
        paperTrading: true,
        oauth: true,
        region: ['US'],
        popular: true,
        minDeposit: 0,
        commissions: 'Free',
      },
      {
        id: 'interactive_brokers',
        name: 'Interactive Brokers',
        description: 'Professional trading platform with global access',
        logo: '/brokers/ibkr.png',
        assetClasses: ['stocks', 'options', 'futures', 'forex', 'bonds'],
        features: ['Global Markets', 'Low Commissions', 'Advanced Tools', 'API Access'],
        paperTrading: true,
        oauth: false,
        region: ['US', 'EU', 'Asia'],
        popular: true,
        minDeposit: 0,
        commissions: '$0.005/share',
      },
      {
        id: 'td_ameritrade',
        name: 'TD Ameritrade (Schwab)',
        description: 'Full-service broker with thinkorswim platform',
        logo: '/brokers/tda.png',
        assetClasses: ['stocks', 'options', 'futures', 'forex'],
        features: ['thinkorswim', 'Paper Trading', 'Research', 'Options Chain'],
        paperTrading: true,
        oauth: true,
        region: ['US'],
        popular: true,
        minDeposit: 0,
        commissions: '$0 stocks, $0.65/contract options',
      },
      {
        id: 'robinhood',
        name: 'Robinhood',
        description: 'Commission-free trading app',
        logo: '/brokers/robinhood.png',
        assetClasses: ['stocks', 'crypto', 'options'],
        features: ['Commission-Free', 'Fractional Shares', 'Crypto', 'Cash Card'],
        paperTrading: false,
        oauth: true,
        region: ['US'],
        popular: true,
        minDeposit: 0,
        commissions: 'Free',
      },
      {
        id: 'coinbase',
        name: 'Coinbase',
        description: 'Major cryptocurrency exchange',
        logo: '/brokers/coinbase.png',
        assetClasses: ['crypto'],
        features: ['Crypto Exchange', 'Custody', 'Staking', 'DeFi'],
        paperTrading: false,
        oauth: true,
        region: ['US', 'EU'],
        popular: true,
        minDeposit: 0,
        commissions: '0.5% - 4.5%',
      },
      {
        id: 'webull',
        name: 'Webull',
        description: 'Advanced trading platform with extended hours',
        logo: '/brokers/webull.png',
        assetClasses: ['stocks', 'options', 'crypto'],
        features: ['Paper Trading', 'Extended Hours', 'Options', 'Technical Analysis'],
        paperTrading: true,
        oauth: true,
        region: ['US'],
        popular: true,
        minDeposit: 0,
        commissions: 'Free',
      },
      // Traditional Brokers
      {
        id: 'vanguard',
        name: 'Vanguard',
        description: 'Low-cost index funds & retirement accounts',
        logo: '/brokers/vanguard.png',
        assetClasses: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
        features: ['Low-Cost Index Funds', 'Retirement Planning', 'Admiral Shares'],
        paperTrading: false,
        oauth: true,
        region: ['US'],
        popular: true,
        minDeposit: 0,
        commissions: 'Free for stocks',
      },
      {
        id: 'fidelity',
        name: 'Fidelity',
        description: 'Full-service broker with extensive research',
        logo: '/brokers/fidelity.png',
        assetClasses: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
        features: ['Zero Expense Funds', 'Active Trader Pro', 'Research'],
        paperTrading: false,
        oauth: true,
        region: ['US'],
        popular: true,
        minDeposit: 0,
        commissions: 'Free',
      },
      {
        id: 'schwab',
        name: 'Charles Schwab',
        description: 'Full-service broker with banking integration',
        logo: '/brokers/schwab.png',
        assetClasses: ['stocks', 'bonds', 'options', 'etfs', 'futures'],
        features: ['Schwab Intelligent Portfolios', 'Banking', 'Research'],
        paperTrading: false,
        oauth: true,
        region: ['US'],
        popular: true,
        minDeposit: 0,
        commissions: 'Free for stocks',
      },
      // Forex Brokers
      {
        id: 'oanda',
        name: 'OANDA',
        description: 'Leading forex and CFD broker',
        logo: '/brokers/oanda.png',
        assetClasses: ['forex', 'cfd'],
        features: ['Forex Specialist', 'Low Spreads', 'API Access', 'MT4/MT5'],
        paperTrading: true,
        oauth: false,
        region: ['US', 'EU', 'Asia'],
        popular: true,
        minDeposit: 0,
        commissions: 'Spread-based',
      },
      // Crypto Exchanges
      {
        id: 'binance',
        name: 'Binance',
        description: 'World largest crypto exchange by volume',
        logo: '/brokers/binance.png',
        assetClasses: ['crypto', 'futures'],
        features: ['Spot & Futures', 'DeFi', 'Low Fees', 'Staking'],
        paperTrading: true,
        oauth: false,
        region: ['Global'],
        popular: true,
        minDeposit: 0,
        commissions: '0.1%',
      },
      {
        id: 'kraken',
        name: 'Kraken',
        description: 'Secure cryptocurrency exchange',
        logo: '/brokers/kraken.png',
        assetClasses: ['crypto', 'futures'],
        features: ['Security', 'Staking', 'Margin Trading', 'Pro Platform'],
        paperTrading: false,
        oauth: true,
        region: ['US', 'EU'],
        popular: false,
        minDeposit: 0,
        commissions: '0% - 0.26%',
      },
      // Options Specialists
      {
        id: 'tastytrade',
        name: 'tastytrade',
        description: 'Options-focused trading platform',
        logo: '/brokers/tastytrade.png',
        assetClasses: ['stocks', 'options', 'futures'],
        features: ['Options Analytics', 'Low Commissions', 'Education', 'Research'],
        paperTrading: true,
        oauth: true,
        region: ['US'],
        popular: false,
        minDeposit: 0,
        commissions: '$1/contract',
      },
      // Aggregators
      {
        id: 'snaptrade',
        name: 'SnapTrade',
        description: 'Universal brokerage connector (90+ brokers)',
        logo: '/brokers/snaptrade.png',
        assetClasses: ['stocks', 'options', 'crypto'],
        features: ['Multi-Broker', 'Universal API', 'Portfolio Sync', '90+ Brokers'],
        paperTrading: false,
        oauth: true,
        region: ['US', 'Canada'],
        popular: false,
        minDeposit: 0,
        commissions: 'Varies by broker',
      },
    ];

    res.json({
      success: true,
      data: availableBrokers,
      total: availableBrokers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get available brokers', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get available brokers',
    });
  }
});

/**
 * GET /accounts
 * Get account information from all connected brokers
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const brokerManager = BrokerManager.getInstance();
    const connections = user.brokerConnections || [];
    const accounts: any[] = [];

    for (const conn of connections) {
      try {
        const broker = brokerManager.getBroker(conn.brokerId);
        if (broker && broker.isReady()) {
          const account = await broker.getAccount();
          accounts.push({
            brokerId: conn.brokerId,
            brokerName: getBrokerName(conn.brokerType),
            accountId: account.id,
            accountType: conn.isPaper ? 'paper' : 'live',
            currency: account.currency,
            balance: account.balance,
            equity: account.equity,
            buyingPower: account.buyingPower,
            cash: account.cash,
            portfolioValue: account.portfolioValue,
            marginUsed: account.marginUsed,
            marginAvailable: account.marginAvailable,
            lastSync: new Date().toISOString(),
            status: 'connected',
          });
        } else {
          accounts.push({
            brokerId: conn.brokerId,
            brokerName: getBrokerName(conn.brokerType),
            accountId: conn.accountId,
            accountType: conn.isPaper ? 'paper' : 'live',
            currency: 'USD',
            balance: conn.balance || 0,
            equity: conn.balance || 0,
            buyingPower: conn.buyingPower || 0,
            cash: conn.balance || 0,
            portfolioValue: conn.balance || 0,
            marginUsed: 0,
            marginAvailable: conn.buyingPower || 0,
            lastSync: conn.lastSync,
            status: conn.status || 'disconnected',
          });
        }
      } catch (error) {
        accounts.push({
          brokerId: conn.brokerId,
          brokerName: getBrokerName(conn.brokerType),
          accountId: conn.accountId,
          accountType: conn.isPaper ? 'paper' : 'live',
          currency: 'USD',
          balance: conn.balance || 0,
          equity: conn.balance || 0,
          buyingPower: conn.buyingPower || 0,
          status: 'error',
        });
      }
    }

    const totals = {
      totalEquity: accounts.reduce((sum, a) => sum + (a.equity || 0), 0),
      totalCash: accounts.reduce((sum, a) => sum + (a.cash || 0), 0),
      totalBuyingPower: accounts.reduce((sum, a) => sum + (a.buyingPower || 0), 0),
      totalMarginUsed: accounts.reduce((sum, a) => sum + (a.marginUsed || 0), 0),
    };

    res.json({
      success: true,
      data: {
        accounts,
        totals,
        connectedCount: accounts.filter(a => a.status === 'connected').length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get broker accounts', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get broker accounts',
    });
  }
});

/**
 * GET /positions
 * Get all positions from all connected brokers
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const brokerManager = BrokerManager.getInstance();
    const connections = user.brokerConnections || [];
    const allPositions: any[] = [];

    for (const conn of connections) {
      try {
        const broker = brokerManager.getBroker(conn.brokerId);
        if (broker && broker.isReady()) {
          const positions = await broker.getPositions();
          positions.forEach(pos => {
            allPositions.push({
              brokerId: conn.brokerId,
              brokerName: getBrokerName(conn.brokerType),
              symbol: pos.symbol,
              side: pos.side,
              quantity: pos.quantity,
              entryPrice: pos.entryPrice,
              currentPrice: pos.currentPrice,
              marketValue: pos.marketValue,
              unrealizedPnL: pos.unrealizedPnL,
              unrealizedPnLPercent: pos.entryPrice > 0
                ? ((pos.currentPrice - pos.entryPrice) / pos.entryPrice * 100)
                : 0,
              realizedPnL: pos.realizedPnL,
            });
          });
        }
      } catch (error) {
        logger.warn(`Failed to get positions from ${conn.brokerId}`, { error });
      }
    }

    const totals = {
      totalMarketValue: allPositions.reduce((sum, p) => sum + (p.marketValue || 0), 0),
      totalUnrealizedPnL: allPositions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0),
      totalRealizedPnL: allPositions.reduce((sum, p) => sum + (p.realizedPnL || 0), 0),
      positionCount: allPositions.length,
    };

    res.json({
      success: true,
      data: {
        positions: allPositions,
        totals,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get broker positions', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get broker positions',
    });
  }
});

/**
 * POST /orders
 * Submit a new order to a broker
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const {
      brokerId,
      symbol,
      side,
      type,
      quantity,
      price,
      stopPrice,
      timeInForce,
      takeProfit,
      stopLoss,
    } = req.body;

    // Validate required fields
    if (!brokerId || !symbol || !side || !type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: brokerId, symbol, side, type, quantity',
      });
    }

    // Validate order type
    if (!['market', 'limit', 'stop', 'stop_limit'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order type. Must be: market, limit, stop, or stop_limit',
      });
    }

    // Validate side
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid side. Must be: buy or sell',
      });
    }

    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0',
      });
    }

    // For limit orders, price is required
    if ((type === 'limit' || type === 'stop_limit') && !price) {
      return res.status(400).json({
        success: false,
        error: 'Price is required for limit orders',
      });
    }

    // For stop orders, stop price is required
    if ((type === 'stop' || type === 'stop_limit') && !stopPrice) {
      return res.status(400).json({
        success: false,
        error: 'Stop price is required for stop orders',
      });
    }

    const brokerManager = BrokerManager.getInstance();
    const broker = brokerManager.getBroker(brokerId);

    if (!broker) {
      return res.status(404).json({
        success: false,
        error: `Broker ${brokerId} not found. Please connect the broker first.`,
      });
    }

    if (!broker.isReady()) {
      return res.status(400).json({
        success: false,
        error: `Broker ${brokerId} is not connected. Please reconnect.`,
      });
    }

    // Submit the order
    const orderRequest = {
      symbol,
      side: side as 'buy' | 'sell',
      type: type as 'market' | 'limit' | 'stop' | 'stop_limit',
      quantity,
      price,
      stopPrice,
      timeInForce: timeInForce || 'day',
      takeProfit,
      stopLoss,
      clientOrderId: `TIME-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    logger.info(`Submitting order to ${brokerId}`, { orderRequest });

    const order = await broker.submitOrder(orderRequest);

    logger.info(`Order submitted successfully`, { orderId: order.id });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        clientOrderId: order.clientOrderId,
        brokerId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        filledQuantity: order.filledQuantity,
        price: order.price,
        stopPrice: order.stopPrice,
        status: order.status,
        submittedAt: order.submittedAt,
        timeInForce: order.timeInForce,
      },
      message: 'Order submitted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to submit order', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit order',
    });
  }
});

/**
 * GET /orders
 * Get all orders from connected brokers
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { status, brokerId } = req.query;

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const brokerManager = BrokerManager.getInstance();
    const connections = user.brokerConnections || [];
    const allOrders: any[] = [];

    for (const conn of connections) {
      if (brokerId && conn.brokerId !== brokerId) continue;

      try {
        const broker = brokerManager.getBroker(conn.brokerId);
        if (broker && broker.isReady()) {
          const orders = await broker.getOrders(status as any);
          orders.forEach(order => {
            allOrders.push({
              brokerId: conn.brokerId,
              brokerName: getBrokerName(conn.brokerType),
              orderId: order.id,
              clientOrderId: order.clientOrderId,
              symbol: order.symbol,
              side: order.side,
              type: order.type,
              quantity: order.quantity,
              filledQuantity: order.filledQuantity,
              price: order.price,
              stopPrice: order.stopPrice,
              averageFilledPrice: order.averageFilledPrice,
              status: order.status,
              timeInForce: order.timeInForce,
              submittedAt: order.submittedAt,
              filledAt: order.filledAt,
              cancelledAt: order.cancelledAt,
              commission: order.commission,
            });
          });
        }
      } catch (error) {
        logger.warn(`Failed to get orders from ${conn.brokerId}`, { error });
      }
    }

    // Sort by submission time, newest first
    allOrders.sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    res.json({
      success: true,
      data: allOrders,
      total: allOrders.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get orders', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get orders',
    });
  }
});

/**
 * DELETE /orders/:orderId
 * Cancel an order
 */
router.delete('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { orderId } = req.params;
    const { brokerId } = req.query;

    if (!brokerId) {
      return res.status(400).json({
        success: false,
        error: 'brokerId query parameter is required',
      });
    }

    const brokerManager = BrokerManager.getInstance();
    const broker = brokerManager.getBroker(brokerId as string);

    if (!broker || !broker.isReady()) {
      return res.status(404).json({
        success: false,
        error: `Broker ${brokerId} not found or not connected`,
      });
    }

    const cancelled = await broker.cancelOrder(orderId);

    if (cancelled) {
      res.json({
        success: true,
        message: 'Order cancelled successfully',
        orderId,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to cancel order. It may have already been filled or cancelled.',
      });
    }
  } catch (error: any) {
    logger.error('Failed to cancel order', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel order',
    });
  }
});

/**
 * GET /trades
 * Get trade history from all connected brokers
 */
router.get('/trades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { symbol, brokerId, startDate, endDate } = req.query;

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const brokerManager = BrokerManager.getInstance();
    const connections = user.brokerConnections || [];
    const allTrades: any[] = [];

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    for (const conn of connections) {
      if (brokerId && conn.brokerId !== brokerId) continue;

      try {
        const broker = brokerManager.getBroker(conn.brokerId);
        if (broker && broker.isReady()) {
          const trades = await broker.getTrades(symbol as string, start, end);
          trades.forEach(trade => {
            allTrades.push({
              brokerId: conn.brokerId,
              brokerName: getBrokerName(conn.brokerType),
              tradeId: trade.id,
              orderId: trade.orderId,
              symbol: trade.symbol,
              side: trade.side,
              quantity: trade.quantity,
              price: trade.price,
              commission: trade.commission,
              timestamp: trade.timestamp,
              value: trade.quantity * trade.price,
            });
          });
        }
      } catch (error) {
        logger.warn(`Failed to get trades from ${conn.brokerId}`, { error });
      }
    }

    // Sort by timestamp, newest first
    allTrades.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const totals = {
      totalTrades: allTrades.length,
      totalVolume: allTrades.reduce((sum, t) => sum + (t.value || 0), 0),
      totalCommissions: allTrades.reduce((sum, t) => sum + (t.commission || 0), 0),
    };

    res.json({
      success: true,
      data: {
        trades: allTrades,
        totals,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get trades', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get trades',
    });
  }
});

/**
 * POST /connect/:broker/oauth
 * Initiate OAuth flow for a broker
 */
router.post('/connect/:broker/oauth', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { broker } = req.params;
    const { redirectUri } = req.body;

    let authUrl = '';
    const state = Buffer.from(JSON.stringify({ userId, broker, timestamp: Date.now() })).toString('base64');

    switch (broker) {
      case 'alpaca':
        authUrl = `https://app.alpaca.markets/oauth/authorize?response_type=code&client_id=${process.env.ALPACA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri || process.env.ALPACA_REDIRECT_URI || '')}&state=${state}&scope=account:write%20trading`;
        break;
      case 'td_ameritrade':
        authUrl = `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=${encodeURIComponent(redirectUri || process.env.TDA_REDIRECT_URI || '')}&client_id=${process.env.TDA_CLIENT_ID}%40AMER.OAUTHAP&state=${state}`;
        break;
      case 'robinhood':
        authUrl = `https://robinhood.com/oauth2/authorize?response_type=code&client_id=${process.env.ROBINHOOD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri || process.env.ROBINHOOD_REDIRECT_URI || '')}&state=${state}&scope=read%20write`;
        break;
      case 'coinbase':
        authUrl = `https://www.coinbase.com/oauth/authorize?response_type=code&client_id=${process.env.COINBASE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri || process.env.COINBASE_REDIRECT_URI || '')}&state=${state}&scope=wallet:accounts:read,wallet:transactions:read,wallet:buys:create,wallet:sells:create`;
        break;
      case 'snaptrade':
        // SnapTrade uses their own auth flow - would need to import snaptrade broker
        return res.status(400).json({
          success: false,
          error: 'SnapTrade OAuth requires special handling. Use the SnapTrade-specific endpoint.',
        });
      default:
        return res.status(400).json({
          success: false,
          error: `OAuth not supported for ${broker}. Please use API key authentication.`,
        });
    }

    if (!authUrl) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate OAuth URL. Check environment variables.',
      });
    }

    res.json({
      success: true,
      data: {
        authUrl,
        broker,
        state,
      },
      message: 'Redirect user to authUrl to complete OAuth flow',
    });
  } catch (error: any) {
    logger.error('Failed to initiate OAuth', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate OAuth',
    });
  }
});

/**
 * POST /connect/:broker/oauth/callback
 * Handle OAuth callback and complete connection
 */
router.post('/connect/:broker/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { broker } = req.params;
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing code or state from OAuth callback',
      });
    }

    // Decode state to get userId
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter',
      });
    }

    const userId = stateData.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state - missing userId',
      });
    }

    // Exchange code for tokens based on broker
    let tokens: { accessToken: string; refreshToken?: string; accountId?: string } | null = null;

    switch (broker) {
      case 'alpaca':
        const alpacaResponse = await fetch('https://api.alpaca.markets/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.ALPACA_CLIENT_ID || '',
            client_secret: process.env.ALPACA_CLIENT_SECRET || '',
            redirect_uri: process.env.ALPACA_REDIRECT_URI || '',
          }),
        });
        const alpacaTokens = await alpacaResponse.json();
        tokens = {
          accessToken: alpacaTokens.access_token,
          refreshToken: alpacaTokens.refresh_token,
        };
        break;
      case 'coinbase':
        const coinbaseResponse = await fetch('https://api.coinbase.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.COINBASE_CLIENT_ID || '',
            client_secret: process.env.COINBASE_CLIENT_SECRET || '',
            redirect_uri: process.env.COINBASE_REDIRECT_URI || '',
          }),
        });
        const coinbaseTokens = await coinbaseResponse.json();
        tokens = {
          accessToken: coinbaseTokens.access_token,
          refreshToken: coinbaseTokens.refresh_token,
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `OAuth callback not implemented for ${broker}`,
        });
    }

    if (!tokens) {
      return res.status(500).json({
        success: false,
        error: 'Failed to exchange OAuth code for tokens',
      });
    }

    // Save connection to user's broker connections
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const newConnection = {
      brokerId: broker,
      brokerType: broker,
      accountId: tokens.accountId || `${broker.toUpperCase()}_${Date.now().toString(36)}`,
      isPaper: false,
      connectedAt: new Date(),
      lastSync: new Date(),
      status: 'active' as const,
      balance: 0,
      buyingPower: 0,
    };

    const updatedConnections = [...(user.brokerConnections || []), newConnection];
    await userRepository.update(userId, { brokerConnections: updatedConnections });

    logger.info(`OAuth connection completed for ${broker}`, { userId, broker });

    res.json({
      success: true,
      data: {
        broker,
        accountId: newConnection.accountId,
        status: 'connected',
      },
      message: 'Broker connected successfully via OAuth',
    });
  } catch (error: any) {
    logger.error('OAuth callback failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'OAuth callback failed',
    });
  }
});

/**
 * GET /:brokerId/status
 * Get detailed status for a specific broker
 */
router.get('/:brokerId/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { brokerId } = req.params;

    const brokerManager = BrokerManager.getInstance();
    const broker = brokerManager.getBroker(brokerId);

    if (!broker) {
      return res.status(404).json({
        success: false,
        error: `Broker ${brokerId} not found`,
      });
    }

    const status: any = {
      brokerId,
      name: broker.name,
      connected: broker.isReady(),
      capabilities: broker.capabilities,
      tradingMode: brokerManager.getTradingMode(),
    };

    // Try to get additional info if connected
    if (broker.isReady()) {
      try {
        const isMarketOpen = await broker.isMarketOpen();
        const marketHours = await broker.getMarketHours();
        status.marketOpen = isMarketOpen;
        status.marketHours = {
          open: marketHours.open.toISOString(),
          close: marketHours.close.toISOString(),
        };
      } catch (e) {
        // Market info not available
      }
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get broker status', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get broker status',
    });
  }
});

export default router;

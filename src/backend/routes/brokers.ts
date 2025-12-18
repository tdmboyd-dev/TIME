/**
 * Broker Connection API Routes
 *
 * Endpoints for connecting and managing broker accounts.
 * All connections are persisted to MongoDB via the user's brokerConnections array.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { userRepository } from '../database/repositories';
import { BrokerManager } from '../brokers/broker_manager';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('BrokerRoutes');

// Apply authentication to ALL broker routes
router.use(authMiddleware);

/**
 * GET /brokers/connections
 * Get user's broker connections from MongoDB
 */
router.get('/connections', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const connections = user.brokerConnections || [];

    // Enrich with real broker status from BrokerManager
    const brokerManager = BrokerManager.getInstance();
    const enrichedConnections = connections.map(conn => {
      const isLive = brokerManager.getStatus().brokers.some(
        b => b.id === conn.brokerId && b.connected
      );
      return {
        id: `${conn.brokerId}_${conn.accountId}`,
        brokerId: conn.brokerId,
        brokerName: getBrokerName(conn.brokerType),
        brokerLogo: `/brokers/${conn.brokerType}.png`,
        status: isLive ? 'connected' : conn.status === 'active' ? 'pending' : conn.status,
        accountType: conn.isPaper ? 'paper' : 'live',
        accountId: conn.accountId,
        connectedAt: conn.connectedAt,
        lastSync: conn.lastSync,
        assetClasses: getBrokerAssetClasses(conn.brokerType),
      };
    });

    res.json({
      success: true,
      data: enrichedConnections,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get broker connections', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get broker connections',
    });
  }
});

/**
 * POST /brokers/connect
 * Connect a new broker account
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { brokerId, brokerName, apiKey, apiSecret, isPaper = true } = req.body;

    if (!brokerId) {
      return res.status(400).json({ success: false, error: 'brokerId is required' });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already connected
    const existingConnection = (user.brokerConnections || []).find(
      conn => conn.brokerId === brokerId
    );
    if (existingConnection) {
      return res.status(400).json({
        success: false,
        error: 'Broker already connected. Disconnect first to reconnect.',
      });
    }

    // Create new connection
    const newConnection = {
      brokerId,
      brokerType: brokerId, // e.g., 'alpaca', 'interactive_brokers'
      accountId: `${brokerId.toUpperCase()}_${Date.now().toString(36).toUpperCase()}`,
      isPaper: isPaper,
      connectedAt: new Date(),
      lastSync: new Date(),
      status: 'active' as const,
    };

    // Update user in MongoDB
    const updatedConnections = [...(user.brokerConnections || []), newConnection];
    await userRepository.update(userId, {
      brokerConnections: updatedConnections,
    });

    logger.info(`Broker ${brokerId} connected for user ${userId}`);

    // Note: API keys would be used here to initialize the broker in BrokerManager
    // For now, we just save the connection - broker initialization happens on demand
    if (apiKey && apiSecret) {
      logger.info(`API keys provided for ${brokerId} - will be used for broker initialization`);
      // TODO: Store encrypted API keys and initialize broker on-demand
    }

    res.json({
      success: true,
      data: {
        id: `${newConnection.brokerId}_${newConnection.accountId}`,
        brokerId: newConnection.brokerId,
        brokerName: brokerName || getBrokerName(brokerId),
        brokerLogo: `/brokers/${brokerId}.png`,
        status: 'connected',
        accountType: isPaper ? 'paper' : 'live',
        accountId: newConnection.accountId,
        connectedAt: newConnection.connectedAt,
        lastSync: newConnection.lastSync,
        assetClasses: getBrokerAssetClasses(brokerId),
      },
      message: 'Broker connected successfully',
    });
  } catch (error: any) {
    logger.error('Failed to connect broker', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect broker',
    });
  }
});

/**
 * DELETE /brokers/disconnect/:brokerId
 * Disconnect a broker account
 */
router.delete('/disconnect/:brokerId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { brokerId } = req.params;

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Filter out the broker connection
    const updatedConnections = (user.brokerConnections || []).filter(
      conn => conn.brokerId !== brokerId && `${conn.brokerId}_${conn.accountId}` !== brokerId
    );

    if (updatedConnections.length === (user.brokerConnections || []).length) {
      return res.status(404).json({
        success: false,
        error: 'Broker connection not found',
      });
    }

    // Update user in MongoDB
    await userRepository.update(userId, {
      brokerConnections: updatedConnections,
    });

    logger.info(`Broker ${brokerId} disconnected for user ${userId}`);

    res.json({
      success: true,
      message: 'Broker disconnected successfully',
    });
  } catch (error: any) {
    logger.error('Failed to disconnect broker', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect broker',
    });
  }
});

/**
 * PUT /brokers/:brokerId/sync
 * Update last sync time for a broker
 */
router.put('/:brokerId/sync', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { brokerId } = req.params;

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update the lastSync for the specified broker
    const updatedConnections = (user.brokerConnections || []).map(conn => {
      if (conn.brokerId === brokerId) {
        return { ...conn, lastSync: new Date() };
      }
      return conn;
    });

    await userRepository.update(userId, {
      brokerConnections: updatedConnections,
    });

    res.json({
      success: true,
      message: 'Broker sync updated',
      lastSync: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to sync broker', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync broker',
    });
  }
});

// Helper functions
function getBrokerName(brokerType: string): string {
  const names: Record<string, string> = {
    // Popular
    alpaca: 'Alpaca',
    interactive_brokers: 'Interactive Brokers',
    td_ameritrade: 'TD Ameritrade',
    robinhood: 'Robinhood',
    // Traditional
    vanguard: 'Vanguard',
    fidelity: 'Fidelity',
    schwab: 'Charles Schwab',
    merrill: 'Merrill Edge',
    morgan_stanley: 'Morgan Stanley',
    jpmorgan: 'J.P. Morgan',
    wells_fargo: 'Wells Fargo Advisors',
    ubs: 'UBS',
    goldman: 'Goldman Sachs',
    // Crypto
    coinbase: 'Coinbase',
    binance: 'Binance',
    kraken: 'Kraken',
    gemini: 'Gemini',
    // Forex
    oanda: 'OANDA',
    forex_com: 'FOREX.com',
    ig: 'IG',
    // Options
    tastytrade: 'tastytrade',
    tradier: 'Tradier',
    tradestation: 'TradeStation',
    // Mobile/Robo
    cashapp: 'Cash App',
    stash: 'Stash',
    acorns: 'Acorns',
    betterment: 'Betterment',
    wealthfront: 'Wealthfront',
    m1_finance: 'M1 Finance',
    ally: 'Ally Invest',
    moomoo: 'moomoo',
    // Retirement
    tiaa: 'TIAA',
    principal: 'Principal Financial',
    empower: 'Empower Retirement',
    voya: 'Voya Financial',
    // Other
    etrade: 'E*TRADE',
    webull: 'Webull',
    sofi: 'SoFi Invest',
    public: 'Public',
    firstrade: 'Firstrade',
    // International
    degiro: 'DEGIRO',
    saxo: 'Saxo Bank',
    trading212: 'Trading 212',
    // Aggregators
    snaptrade: 'SnapTrade',
    plaid: 'Plaid',
  };
  return names[brokerType] || brokerType;
}

function getBrokerAssetClasses(brokerType: string): string[] {
  const assetClasses: Record<string, string[]> = {
    // Popular
    alpaca: ['stocks', 'crypto'],
    interactive_brokers: ['stocks', 'options', 'futures', 'forex', 'bonds'],
    td_ameritrade: ['stocks', 'options', 'futures', 'forex'],
    robinhood: ['stocks', 'crypto', 'options'],
    // Traditional
    vanguard: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    fidelity: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
    schwab: ['stocks', 'bonds', 'options', 'etfs', 'futures'],
    merrill: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
    morgan_stanley: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
    jpmorgan: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    wells_fargo: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
    ubs: ['stocks', 'bonds', 'options', 'forex', 'etfs'],
    goldman: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    // Crypto
    coinbase: ['crypto'],
    binance: ['crypto', 'futures'],
    kraken: ['crypto', 'futures'],
    gemini: ['crypto'],
    // Forex
    oanda: ['forex', 'cfd'],
    forex_com: ['forex', 'cfd', 'crypto'],
    ig: ['forex', 'cfd', 'stocks', 'indices'],
    // Options
    tastytrade: ['stocks', 'options', 'futures'],
    tradier: ['stocks', 'options'],
    tradestation: ['stocks', 'options', 'futures', 'crypto'],
    // Mobile/Robo
    cashapp: ['stocks', 'crypto'],
    stash: ['stocks', 'etfs'],
    acorns: ['etfs'],
    betterment: ['etfs', 'bonds'],
    wealthfront: ['etfs', 'bonds', 'crypto'],
    m1_finance: ['stocks', 'etfs'],
    ally: ['stocks', 'options', 'etfs', 'mutual_funds', 'forex'],
    moomoo: ['stocks', 'options', 'etfs'],
    // Retirement
    tiaa: ['stocks', 'bonds', 'etfs', 'mutual_funds', 'annuities'],
    principal: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    empower: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    voya: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    // Other
    etrade: ['stocks', 'options', 'futures', 'bonds'],
    webull: ['stocks', 'options', 'crypto'],
    sofi: ['stocks', 'crypto', 'etfs'],
    public: ['stocks', 'crypto', 'etfs', 'bonds'],
    firstrade: ['stocks', 'options', 'etfs', 'mutual_funds'],
    // International
    degiro: ['stocks', 'etfs', 'options', 'futures'],
    saxo: ['stocks', 'forex', 'options', 'futures', 'bonds', 'cfd'],
    trading212: ['stocks', 'etfs', 'cfd'],
    // Aggregators
    snaptrade: ['stocks', 'options', 'crypto'],
    plaid: ['stocks', 'etfs', 'mutual_funds'],
  };
  return assetClasses[brokerType] || ['stocks'];
}

export default router;

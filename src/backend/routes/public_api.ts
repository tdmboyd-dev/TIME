/**
 * TIME BEYOND US - Public API for Traders
 *
 * This API allows external traders to integrate with the TIME BEYOND US platform.
 * All endpoints require a valid API key passed in the X-API-Key header.
 *
 * Rate Limits:
 * - Free tier: 100 requests/minute
 * - Pro tier: 1000 requests/minute
 * - Enterprise tier: 10000 requests/minute
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { authMiddleware } from './auth';

const router = Router();

// API Key verification middleware
interface ApiKey {
  userId: string;
  tier: 'free' | 'pro' | 'enterprise';
  rateLimit: number;
  createdAt: Date;
  lastUsed: Date;
}

// In-memory store (in production, use Redis/Database)
const apiKeys = new Map<string, ApiKey>();
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Generate API key for user
function generateApiKey(userId: string, tier: 'free' | 'pro' | 'enterprise' = 'free'): string {
  const key = `tbou_${tier}_${Buffer.from(`${userId}-${Date.now()}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)}`;

  const rateLimits = { free: 100, pro: 1000, enterprise: 10000 };

  apiKeys.set(key, {
    userId,
    tier,
    rateLimit: rateLimits[tier],
    createdAt: new Date(),
    lastUsed: new Date(),
  });

  return key;
}

// API Key verification middleware
function verifyApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-API-Key header',
      docs: 'https://docs.timebeyondus.com/api',
    });
  }

  const keyData = apiKeys.get(apiKey);
  if (!keyData) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
      docs: 'https://docs.timebeyondus.com/api/keys',
    });
  }

  // Rate limiting
  const now = Date.now();
  const requestData = requestCounts.get(apiKey) || { count: 0, resetTime: now + 60000 };

  if (now > requestData.resetTime) {
    requestData.count = 0;
    requestData.resetTime = now + 60000;
  }

  requestData.count++;
  requestCounts.set(apiKey, requestData);

  if (requestData.count > keyData.rateLimit) {
    return res.status(429).json({
      error: 'Rate Limited',
      message: `Rate limit exceeded. ${keyData.tier} tier allows ${keyData.rateLimit} requests/minute`,
      retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
    });
  }

  // Update last used
  keyData.lastUsed = new Date();

  // Attach user info to request
  (req as any).apiKeyData = keyData;

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', keyData.rateLimit);
  res.setHeader('X-RateLimit-Remaining', keyData.rateLimit - requestData.count);
  res.setHeader('X-RateLimit-Reset', Math.ceil(requestData.resetTime / 1000));

  next();
}

// ============================================================================
// PUBLIC ENDPOINTS (No API key required)
// ============================================================================

/**
 * GET /api/public/health
 * Check API health status
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'TIME BEYOND US',
    version: 'v49.1.0',
    timestamp: new Date().toISOString(),
    bots: 182,
    uptime: process.uptime(),
  });
});

/**
 * GET /api/public/info
 * Get platform information
 */
router.get('/info', (_req: Request, res: Response) => {
  res.json({
    platform: 'TIME BEYOND US',
    tagline: 'We Beat Time, So You Don\'t Have To',
    version: 'v49.1.0',
    totalBots: 182,
    botCategories: {
      absorbed: 133,
      fusedMetaStrategies: 21,
      superBots: 28,
    },
    superBots: [
      { name: 'OMEGA PRIME', codename: 'MARKET_ORACLE', tier: 'LEGENDARY' },
      { name: 'DARK POOL PREDATOR', codename: 'ALPHA_HUNTER', tier: 'LEGENDARY' },
      { name: 'INFINITY LOOP', codename: 'ARBITRAGEUR', tier: 'LEGENDARY' },
    ],
    supportedAssets: ['stocks', 'crypto', 'forex', 'options', 'defi'],
    documentation: 'https://docs.timebeyondus.com/api',
    website: 'https://timebeyondus.com',
  });
});

/**
 * POST /api/public/keys/generate
 * Generate a new API key (requires user authentication)
 * SECURITY: User must be authenticated - userId comes from session, not request body
 */
router.post('/keys/generate', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { tier = 'free' } = req.body;

  // SECURITY: Use authenticated user's ID, not from request body
  const userId = user.id;

  // Validate tier (only admin can create pro/enterprise keys)
  let actualTier: 'free' | 'pro' | 'enterprise' = 'free';
  if (tier === 'pro' || tier === 'enterprise') {
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can create pro/enterprise API keys',
      });
    }
    actualTier = tier;
  }

  const apiKey = generateApiKey(userId, actualTier);

  logger.info(`[PUBLIC API] Generated ${actualTier} API key for user ${userId}`);

  const rateLimits: Record<string, number> = { free: 100, pro: 1000, enterprise: 10000 };

  res.json({
    success: true,
    apiKey,
    tier: actualTier,
    rateLimit: rateLimits[actualTier],
    message: 'Store this key securely. It will not be shown again.',
  });
});

// ============================================================================
// PROTECTED ENDPOINTS (API key required)
// ============================================================================

/**
 * GET /api/public/market/quote
 * Get real-time quote for a symbol
 */
router.get('/market/quote', verifyApiKey, async (req: Request, res: Response) => {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'symbol query parameter is required',
    });
  }

  try {
    // Fetch from TwelveData or Finnhub
    const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY;
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_KEY}`
    );
    const data = await response.json() as {
      close?: string;
      open?: string;
      high?: string;
      low?: string;
      volume?: string;
      change?: string;
      percent_change?: string;
      datetime?: string;
    };

    res.json({
      symbol,
      price: parseFloat(data.close || '0') || 0,
      open: parseFloat(data.open || '0') || 0,
      high: parseFloat(data.high || '0') || 0,
      low: parseFloat(data.low || '0') || 0,
      volume: parseInt(data.volume || '0') || 0,
      change: parseFloat(data.change || '0') || 0,
      changePercent: parseFloat(data.percent_change || '0') || 0,
      timestamp: data.datetime || new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch quote data',
    });
  }
});

/**
 * GET /api/public/bots
 * List available trading bots
 */
router.get('/bots', verifyApiKey, (_req: Request, res: Response) => {
  res.json({
    totalBots: 182,
    categories: [
      {
        name: 'Super Bots',
        tier: 'LEGENDARY',
        count: 28,
        bots: [
          { name: 'Omega Prime', codename: 'MARKET_ORACLE', expectedROI: 200 },
          { name: 'Dark Pool Predator', codename: 'ALPHA_HUNTER', expectedROI: 150 },
          { name: 'Infinity Loop', codename: 'ARBITRAGEUR', expectedROI: 100 },
          { name: 'Hyper Scalper', codename: 'TURBO_TRADER', expectedROI: 150 },
          { name: 'Neural Titan', codename: 'BRAIN_MASTER', expectedROI: 180 },
          { name: 'Quantum Edge', codename: 'PARTICLE_SURFER', expectedROI: 140 },
          { name: 'Alpha Centauri', codename: 'STAR_NAVIGATOR', expectedROI: 160 },
          { name: 'Market Maker Pro', codename: 'SPREAD_MASTER', expectedROI: 90 },
        ],
      },
      {
        name: 'Meta Strategies',
        tier: 'EPIC',
        count: 21,
        description: 'Fused multi-strategy systems',
      },
      {
        name: 'Absorbed Strategies',
        tier: 'MIXED',
        count: 133,
        description: 'Strategies absorbed from top trading systems',
      },
    ],
  });
});

/**
 * GET /api/public/bots/:codename/signals
 * Get recent signals from a specific bot
 */
router.get('/bots/:codename/signals', verifyApiKey, async (req: Request, res: Response) => {
  const { codename } = req.params;
  const { limit = 10 } = req.query;

  // In production, fetch from database
  res.json({
    bot: codename,
    signals: [],
    message: 'Connect your broker to receive real-time signals',
    docs: 'https://docs.timebeyondus.com/api/signals',
  });
});

/**
 * POST /api/public/trade
 * Execute a trade (requires connected broker)
 */
router.post('/trade', verifyApiKey, async (req: Request, res: Response) => {
  const { symbol, side, quantity, orderType = 'market', price } = req.body;
  const keyData = (req as any).apiKeyData as ApiKey;

  // Validate required fields
  if (!symbol || !side || !quantity) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'symbol, side, and quantity are required',
    });
  }

  if (!['buy', 'sell'].includes(side.toLowerCase())) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'side must be "buy" or "sell"',
    });
  }

  if (!['market', 'limit', 'stop', 'stop_limit'].includes(orderType.toLowerCase())) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'orderType must be market, limit, stop, or stop_limit',
    });
  }

  // Check tier for trading access
  if (keyData.tier === 'free') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Trading requires Pro or Enterprise tier. Upgrade at https://timebeyondus.com/upgrade',
    });
  }

  logger.info(`[PUBLIC API] Trade request from ${keyData.userId}: ${side} ${quantity} ${symbol}`);

  // In production, execute via broker service
  res.json({
    success: true,
    orderId: `ord_${Date.now()}`,
    symbol,
    side,
    quantity,
    orderType,
    price: price || 'market',
    status: 'pending',
    message: 'Order submitted. Connect broker for execution.',
    createdAt: new Date().toISOString(),
  });
});

/**
 * GET /api/public/portfolio
 * Get portfolio summary
 */
router.get('/portfolio', verifyApiKey, async (req: Request, res: Response) => {
  const keyData = (req as any).apiKeyData as ApiKey;

  // In production, fetch from user's connected broker
  res.json({
    userId: keyData.userId,
    totalValue: 0,
    cash: 0,
    positions: [],
    performance: {
      dayChange: 0,
      dayChangePercent: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
    },
    message: 'Connect a broker to see your portfolio',
    docs: 'https://docs.timebeyondus.com/api/brokers',
  });
});

/**
 * GET /api/public/signals/stream
 * WebSocket endpoint info for real-time signals
 */
router.get('/signals/stream', verifyApiKey, (_req: Request, res: Response) => {
  res.json({
    type: 'websocket',
    endpoint: 'wss://api.timebeyondus.com/ws/signals',
    protocol: 'v1',
    authentication: 'Pass X-API-Key in connection query string',
    channels: [
      { name: 'signals', description: 'Real-time bot signals' },
      { name: 'trades', description: 'Trade execution updates' },
      { name: 'market', description: 'Market data updates' },
    ],
    example: {
      connect: 'wss://api.timebeyondus.com/ws/signals?apiKey=your_key',
      subscribe: '{"action": "subscribe", "channel": "signals"}',
    },
  });
});

/**
 * GET /api/public/strategies
 * List available strategies
 */
router.get('/strategies', verifyApiKey, (_req: Request, res: Response) => {
  res.json({
    strategies: [
      { id: 'momentum', name: 'Momentum Trading', category: 'trend' },
      { id: 'meanReversion', name: 'Mean Reversion', category: 'range' },
      { id: 'arbitrage', name: 'Multi-Market Arbitrage', category: 'neutral' },
      { id: 'sentiment', name: 'AI Sentiment Analysis', category: 'ml' },
      { id: 'darkPool', name: 'Dark Pool Flow', category: 'institutional' },
      { id: 'theta', name: 'Theta Harvesting', category: 'options' },
      { id: 'scalping', name: 'High-Frequency Scalping', category: 'speed' },
      { id: 'swing', name: 'Swing Trading', category: 'position' },
      { id: 'breakout', name: 'Breakout Detection', category: 'trend' },
      { id: 'whaleTracking', name: 'Whale Wallet Tracking', category: 'crypto' },
    ],
  });
});

export default router;

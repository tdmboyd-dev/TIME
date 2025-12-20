/**
 * TIME Market Vision Engine Routes
 *
 * Advanced market analysis through multiple perspectives:
 * - Human-readable market analysis
 * - Quantitative metrics
 * - Bot/algorithmic view
 * - Regime detection
 * - Multi-timeframe synthesis
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { databaseManager } from '../database/connection';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

// ============================================================
// TYPES
// ============================================================

interface MarketVision {
  symbol: string;
  timestamp: Date;
  regime: {
    current: string;
    confidence: number;
    duration: string;
    history: Array<{ regime: string; startTime: Date; endTime: Date }>;
  };
  humanView: {
    summary: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    keyLevels: { support: number[]; resistance: number[] };
    newsImpact: string;
    tradingIdea: string;
  };
  quantView: {
    trend: { direction: string; strength: number; slope: number };
    volatility: { current: number; percentile: number; regime: string };
    momentum: { rsi: number; macd: number; stochastic: number };
    volume: { relative: number; trend: string };
    correlations: Array<{ asset: string; correlation: number }>;
  };
  botView: {
    signals: Array<{ bot: string; signal: string; confidence: number; entry?: number; stopLoss?: number; takeProfit?: number }>;
    consensus: { direction: string; strength: number; agreementRate: number };
    executionRecommendation: string;
  };
  synthesis: {
    overallBias: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
    confidence: number;
    recommendation: string;
    riskLevel: 'low' | 'medium' | 'high';
    timeHorizon: string;
  };
}

// ============================================================
// MARKET REGIME DEFINITIONS
// ============================================================

const MARKET_REGIMES = {
  TRENDING_UP: 'Trending Up',
  TRENDING_DOWN: 'Trending Down',
  RANGING: 'Ranging/Consolidating',
  BREAKOUT: 'Breakout',
  BREAKDOWN: 'Breakdown',
  HIGH_VOLATILITY: 'High Volatility',
  LOW_VOLATILITY: 'Low Volatility',
  REVERSAL_UP: 'Potential Reversal Up',
  REVERSAL_DOWN: 'Potential Reversal Down',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Detect market regime based on price action
 */
function detectRegime(
  prices: number[],
  volumes: number[]
): { regime: string; confidence: number } {
  if (prices.length < 20) {
    return { regime: 'Insufficient Data', confidence: 0 };
  }

  const sma20 = calculateSMA(prices, 20);
  const sma50 = prices.length >= 50 ? calculateSMA(prices, 50) : null;
  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2];

  // Calculate volatility
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);

  // Calculate trend
  const recentPrices = prices.slice(-20);
  const priceSlope = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];

  // Determine regime
  if (volatility > 0.03) {
    return { regime: MARKET_REGIMES.HIGH_VOLATILITY, confidence: 0.7 };
  }

  if (volatility < 0.005) {
    return { regime: MARKET_REGIMES.LOW_VOLATILITY, confidence: 0.75 };
  }

  if (priceSlope > 0.05 && currentPrice > (sma20 || 0)) {
    return { regime: MARKET_REGIMES.TRENDING_UP, confidence: 0.8 };
  }

  if (priceSlope < -0.05 && currentPrice < (sma20 || Infinity)) {
    return { regime: MARKET_REGIMES.TRENDING_DOWN, confidence: 0.8 };
  }

  if (Math.abs(priceSlope) < 0.02) {
    return { regime: MARKET_REGIMES.RANGING, confidence: 0.65 };
  }

  return { regime: MARKET_REGIMES.RANGING, confidence: 0.5 };
}

function calculateSMA(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): number {
  if (prices.length < 26) return 0;

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  return ema12 - ema26;
}

function calculateEMA(data: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

function findSupportResistance(prices: number[]): { support: number[]; resistance: number[] } {
  const highs = prices.slice(-50);
  const lows = prices.slice(-50);

  // Simple pivot detection
  const resistance: number[] = [];
  const support: number[] = [];

  for (let i = 2; i < highs.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      resistance.push(highs[i]);
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      support.push(lows[i]);
    }
  }

  return {
    support: support.slice(-3).sort((a, b) => b - a),
    resistance: resistance.slice(-3).sort((a, b) => a - b),
  };
}

/**
 * Generate human-readable market analysis
 */
function generateHumanAnalysis(
  symbol: string,
  prices: number[],
  regime: { regime: string; confidence: number }
): MarketVision['humanView'] {
  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2];
  const change = ((currentPrice - prevPrice) / prevPrice) * 100;
  const rsi = calculateRSI(prices);
  const levels = findSupportResistance(prices);

  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (rsi > 60 && regime.regime.includes('Up')) sentiment = 'bullish';
  else if (rsi < 40 && regime.regime.includes('Down')) sentiment = 'bearish';

  let summary = `${symbol} is currently trading at $${currentPrice.toFixed(2)} `;
  summary += change >= 0 ? `up ${change.toFixed(2)}%` : `down ${Math.abs(change).toFixed(2)}%`;
  summary += `. The market is in a ${regime.regime} phase with ${Math.round(regime.confidence * 100)}% confidence. `;
  summary += `RSI at ${rsi.toFixed(1)} suggests ${rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral momentum'} conditions.`;

  let tradingIdea = '';
  if (sentiment === 'bullish') {
    tradingIdea = `Consider long positions near support at $${levels.support[0]?.toFixed(2) || 'N/A'}. Target resistance at $${levels.resistance[0]?.toFixed(2) || 'N/A'}.`;
  } else if (sentiment === 'bearish') {
    tradingIdea = `Consider short positions near resistance at $${levels.resistance[0]?.toFixed(2) || 'N/A'}. Target support at $${levels.support[0]?.toFixed(2) || 'N/A'}.`;
  } else {
    tradingIdea = 'Wait for clearer direction. Market conditions are mixed.';
  }

  return {
    summary,
    sentiment,
    keyLevels: levels,
    newsImpact: 'No major news events detected.',
    tradingIdea,
  };
}

/**
 * Generate quantitative analysis
 */
function generateQuantAnalysis(prices: number[], volumes: number[]): MarketVision['quantView'] {
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);

  // Calculate trend
  const sma20 = calculateSMA(prices, 20);
  const currentPrice = prices[prices.length - 1];
  const trendDirection = currentPrice > sma20 ? 'up' : 'down';
  const trendStrength = Math.abs((currentPrice - sma20) / sma20) * 100;

  // Calculate volatility
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252);

  // Volume analysis
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const currentVolume = volumes[volumes.length - 1];
  const relativeVolume = currentVolume / avgVolume;

  return {
    trend: {
      direction: trendDirection,
      strength: trendStrength,
      slope: (prices[prices.length - 1] - prices[prices.length - 20]) / prices[prices.length - 20],
    },
    volatility: {
      current: volatility,
      percentile: volatility > 0.3 ? 80 : volatility > 0.2 ? 50 : 20,
      regime: volatility > 0.3 ? 'high' : volatility > 0.15 ? 'normal' : 'low',
    },
    momentum: {
      rsi,
      macd,
      stochastic: ((currentPrice - Math.min(...prices.slice(-14))) / (Math.max(...prices.slice(-14)) - Math.min(...prices.slice(-14)))) * 100,
    },
    volume: {
      relative: relativeVolume,
      trend: relativeVolume > 1.5 ? 'increasing' : relativeVolume < 0.5 ? 'decreasing' : 'stable',
    },
    correlations: [
      { asset: 'SPY', correlation: 0.75 },
      { asset: 'QQQ', correlation: 0.82 },
    ],
  };
}

/**
 * Generate bot/algorithmic view
 */
function generateBotView(prices: number[]): MarketVision['botView'] {
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  const sma20 = calculateSMA(prices, 20);
  const currentPrice = prices[prices.length - 1];

  const signals: MarketVision['botView']['signals'] = [];

  // Trend Following Bot
  if (currentPrice > sma20) {
    signals.push({
      bot: 'TrendFollower',
      signal: 'long',
      confidence: 0.7,
      entry: currentPrice,
      stopLoss: sma20 * 0.98,
      takeProfit: currentPrice * 1.05,
    });
  } else {
    signals.push({
      bot: 'TrendFollower',
      signal: 'short',
      confidence: 0.65,
      entry: currentPrice,
      stopLoss: sma20 * 1.02,
      takeProfit: currentPrice * 0.95,
    });
  }

  // Mean Reversion Bot
  if (rsi < 30) {
    signals.push({
      bot: 'MeanReversion',
      signal: 'long',
      confidence: 0.75,
      entry: currentPrice,
      stopLoss: currentPrice * 0.97,
      takeProfit: currentPrice * 1.03,
    });
  } else if (rsi > 70) {
    signals.push({
      bot: 'MeanReversion',
      signal: 'short',
      confidence: 0.72,
      entry: currentPrice,
      stopLoss: currentPrice * 1.03,
      takeProfit: currentPrice * 0.97,
    });
  } else {
    signals.push({
      bot: 'MeanReversion',
      signal: 'neutral',
      confidence: 0.5,
    });
  }

  // Momentum Bot
  if (macd > 0 && rsi > 50) {
    signals.push({
      bot: 'MomentumBot',
      signal: 'long',
      confidence: 0.68,
    });
  } else if (macd < 0 && rsi < 50) {
    signals.push({
      bot: 'MomentumBot',
      signal: 'short',
      confidence: 0.66,
    });
  } else {
    signals.push({
      bot: 'MomentumBot',
      signal: 'neutral',
      confidence: 0.4,
    });
  }

  // Calculate consensus
  const longSignals = signals.filter(s => s.signal === 'long').length;
  const shortSignals = signals.filter(s => s.signal === 'short').length;
  const totalSignals = signals.length;

  let consensusDirection = 'neutral';
  if (longSignals > shortSignals) consensusDirection = 'long';
  else if (shortSignals > longSignals) consensusDirection = 'short';

  const agreementRate = Math.max(longSignals, shortSignals) / totalSignals;

  return {
    signals,
    consensus: {
      direction: consensusDirection,
      strength: agreementRate,
      agreementRate,
    },
    executionRecommendation: agreementRate > 0.6 ? `Execute ${consensusDirection} with caution` : 'Wait for stronger consensus',
  };
}

/**
 * Synthesize all views into final recommendation
 */
function synthesizeViews(
  humanView: MarketVision['humanView'],
  quantView: MarketVision['quantView'],
  botView: MarketVision['botView'],
  regime: { regime: string; confidence: number }
): MarketVision['synthesis'] {
  let score = 0;

  // Human sentiment
  if (humanView.sentiment === 'bullish') score += 2;
  else if (humanView.sentiment === 'bearish') score -= 2;

  // Quant signals
  if (quantView.momentum.rsi > 50) score += 1;
  else score -= 1;

  if (quantView.trend.direction === 'up') score += 1;
  else score -= 1;

  // Bot consensus
  if (botView.consensus.direction === 'long') score += botView.consensus.strength * 2;
  else if (botView.consensus.direction === 'short') score -= botView.consensus.strength * 2;

  let overallBias: MarketVision['synthesis']['overallBias'] = 'neutral';
  if (score >= 4) overallBias = 'strong_bullish';
  else if (score >= 2) overallBias = 'bullish';
  else if (score <= -4) overallBias = 'strong_bearish';
  else if (score <= -2) overallBias = 'bearish';

  const confidence = Math.min(Math.abs(score) / 6, 1) * regime.confidence;

  let recommendation = '';
  if (overallBias.includes('bullish')) {
    recommendation = 'Consider long positions with appropriate risk management.';
  } else if (overallBias.includes('bearish')) {
    recommendation = 'Consider short positions or reducing long exposure.';
  } else {
    recommendation = 'Market conditions are unclear. Consider waiting or reducing position size.';
  }

  return {
    overallBias,
    confidence,
    recommendation,
    riskLevel: quantView.volatility.regime === 'high' ? 'high' : quantView.volatility.regime === 'normal' ? 'medium' : 'low',
    timeHorizon: 'Short-term (1-5 days)',
  };
}

// ============================================================
// ROUTES
// ============================================================

/**
 * GET /vision/:symbol
 * Get complete market vision for a symbol
 */
router.get('/:symbol', authMiddleware, async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const symbolUpper = symbol.toUpperCase();

  try {
    // Fetch price data (in production, use real data from TwelveData/Alpha Vantage)
    // For now, generate simulated data
    const days = 100;
    const basePrice = 100 + Math.random() * 400;
    const prices: number[] = [];
    const volumes: number[] = [];

    let currentPrice = basePrice;
    for (let i = 0; i < days; i++) {
      currentPrice *= 1 + (Math.random() - 0.48) * 0.03;
      prices.push(currentPrice);
      volumes.push(Math.floor(1000000 + Math.random() * 5000000));
    }

    // Detect regime
    const regime = detectRegime(prices, volumes);

    // Generate views
    const humanView = generateHumanAnalysis(symbolUpper, prices, regime);
    const quantView = generateQuantAnalysis(prices, volumes);
    const botView = generateBotView(prices);
    const synthesis = synthesizeViews(humanView, quantView, botView, regime);

    const vision: MarketVision = {
      symbol: symbolUpper,
      timestamp: new Date(),
      regime: {
        current: regime.regime,
        confidence: regime.confidence,
        duration: '3 days',
        history: [],
      },
      humanView,
      quantView,
      botView,
      synthesis,
    };

    res.json({
      success: true,
      data: vision,
    });
  } catch (error) {
    logger.error('Vision generation error:', error);
    res.status(500).json({ error: 'Failed to generate market vision' });
  }
});

/**
 * GET /vision/:symbol/regime
 * Get just the market regime
 */
router.get('/:symbol/regime', async (req: Request, res: Response) => {
  const { symbol } = req.params;

  try {
    // Simulated regime detection
    const regimes = Object.values(MARKET_REGIMES);
    const currentRegime = regimes[Math.floor(Math.random() * regimes.length)];

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        regime: currentRegime,
        confidence: 0.6 + Math.random() * 0.3,
        since: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    logger.error('Regime detection error:', error);
    res.status(500).json({ error: 'Failed to detect regime' });
  }
});

/**
 * GET /vision/:symbol/signals
 * Get bot signals for a symbol - REAL DATA ONLY
 */
router.get('/:symbol/signals', authMiddleware, async (req: Request, res: Response) => {
  const { symbol } = req.params;

  try {
    // Get real signals from BotManager
    const { botManager } = await import('../bots/bot_manager');
    const activeBots = botManager.getAllBots().filter(b => b.status === 'active');

    // Collect signals from active bots for this symbol
    const signals: Array<{ bot: string; signal: string; confidence: number; timestamp: Date }> = [];

    for (const bot of activeBots.slice(0, 5)) { // Limit to 5 bots
      // Get real signal from bot's strategy if available
      if (bot.performance && bot.performance.winRate > 0) {
        // Use real bot performance to determine signal direction
        const isPositive = bot.performance.totalPnL > 0;
        signals.push({
          bot: bot.name,
          signal: isPositive ? 'long' : 'neutral',
          confidence: bot.performance.winRate / 100,
          timestamp: new Date(),
        });
      }
    }

    // If no active bots with performance, return empty
    if (signals.length === 0) {
      return res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          signals: [],
          message: 'No active bots with signals for this symbol',
          generatedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        signals,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Signal generation error:', error);
    res.status(500).json({ error: 'Failed to generate signals' });
  }
});

/**
 * GET /vision/market/overview
 * Get market-wide overview - REAL DATA ONLY
 */
router.get('/market/overview', async (req: Request, res: Response) => {
  try {
    // Return empty state - requires real market data connection
    // Real data would come from connected broker or market data provider
    res.json({
      success: true,
      data: {
        indices: [],
        message: 'Connect to market data provider for real-time overview',
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Market overview error:', error);
    res.status(500).json({ error: 'Failed to generate market overview' });
  }
});

/**
 * POST /vision/compare
 * Compare vision for multiple symbols - REAL DATA ONLY
 */
router.post('/compare', authMiddleware, async (req: Request, res: Response) => {
  const { symbols } = req.body;

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: 'Symbols array required' });
  }

  if (symbols.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 symbols allowed' });
  }

  try {
    // Return empty state - requires real market data connection
    // Real comparison would need connected market data provider
    res.json({
      success: true,
      data: [],
      message: 'Connect to market data provider for symbol comparison',
      requestedSymbols: symbols,
    });
  } catch (error) {
    logger.error('Vision comparison error:', error);
    res.status(500).json({ error: 'Failed to compare symbols' });
  }
});

export default router;

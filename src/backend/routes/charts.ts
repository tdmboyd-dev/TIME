/**
 * TIME Charts API Routes
 *
 * Real-time and historical candlestick (OHLCV) data for charting.
 * Integrates with multiple data providers:
 * - TwelveData (primary)
 * - Alpha Vantage (backup)
 * - CoinGecko (crypto)
 *
 * Features:
 * - Multiple timeframes (1m to 1M)
 * - Technical indicators overlay
 * - Pattern recognition
 * - Real-time streaming via WebSocket
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authMiddleware } from './auth';
import { databaseManager } from '../database/connection';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================
// TYPES
// ============================================================

interface Candle {
  timestamp: string;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartData {
  symbol: string;
  exchange: string;
  interval: string;
  currency: string;
  type: string;
  candles: Candle[];
  meta: {
    firstTimestamp: string;
    lastTimestamp: string;
    candleCount: number;
    source: string;
  };
}

interface TechnicalIndicator {
  name: string;
  values: Array<{ timestamp: string; value: number | null }>;
  params: Record<string, number>;
}

// ============================================================
// CONFIGURATION
// ============================================================

const TWELVEDATA_API_KEY = process.env.TWELVE_DATA_API_KEY || '';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Valid intervals
const VALID_INTERVALS = ['1min', '5min', '15min', '30min', '1h', '2h', '4h', '1day', '1week', '1month'];

// Cache TTL by interval (in seconds)
const CACHE_TTL: Record<string, number> = {
  '1min': 30,
  '5min': 60,
  '15min': 120,
  '30min': 300,
  '1h': 600,
  '2h': 1200,
  '4h': 2400,
  '1day': 3600,
  '1week': 7200,
  '1month': 14400,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Fetch candlestick data from TwelveData
 */
async function fetchFromTwelveData(
  symbol: string,
  interval: string,
  outputSize: number = 100
): Promise<ChartData | null> {
  if (!TWELVEDATA_API_KEY) {
    logger.warn('TwelveData API key not configured');
    return null;
  }

  try {
    const response = await axios.get(`${TWELVEDATA_BASE_URL}/time_series`, {
      params: {
        symbol,
        interval,
        outputsize: outputSize,
        apikey: TWELVEDATA_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data.status === 'error') {
      logger.warn(`TwelveData error for ${symbol}: ${response.data.message}`);
      return null;
    }

    const meta = response.data.meta;
    const values = response.data.values || [];

    const candles: Candle[] = values.map((v: any) => ({
      timestamp: new Date(v.datetime).toISOString(),
      datetime: v.datetime,
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume || '0', 10),
    })).reverse(); // TwelveData returns newest first, we want oldest first

    return {
      symbol: meta.symbol,
      exchange: meta.exchange || 'Unknown',
      interval: meta.interval,
      currency: meta.currency || 'USD',
      type: meta.type || 'Stock',
      candles,
      meta: {
        firstTimestamp: candles[0]?.timestamp || '',
        lastTimestamp: candles[candles.length - 1]?.timestamp || '',
        candleCount: candles.length,
        source: 'TwelveData',
      },
    };
  } catch (error) {
    logger.error(`TwelveData fetch error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch candlestick data from Alpha Vantage (backup)
 */
async function fetchFromAlphaVantage(
  symbol: string,
  interval: string
): Promise<ChartData | null> {
  if (!ALPHA_VANTAGE_API_KEY) {
    logger.warn('Alpha Vantage API key not configured');
    return null;
  }

  try {
    // Map interval to Alpha Vantage format
    const avIntervalMap: Record<string, string> = {
      '1min': '1min',
      '5min': '5min',
      '15min': '15min',
      '30min': '30min',
      '1h': '60min',
    };

    const avInterval = avIntervalMap[interval];
    const isIntraday = !!avInterval;

    let response;
    if (isIntraday) {
      response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol,
          interval: avInterval,
          outputsize: 'compact',
          apikey: ALPHA_VANTAGE_API_KEY,
        },
        timeout: 10000,
      });
    } else {
      response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol,
          outputsize: 'compact',
          apikey: ALPHA_VANTAGE_API_KEY,
        },
        timeout: 10000,
      });
    }

    // Parse Alpha Vantage response
    const timeSeriesKey = Object.keys(response.data).find(k => k.includes('Time Series'));
    if (!timeSeriesKey) {
      logger.warn(`Alpha Vantage: No time series data for ${symbol}`);
      return null;
    }

    const timeSeries = response.data[timeSeriesKey];
    const candles: Candle[] = Object.entries(timeSeries)
      .map(([datetime, values]: [string, any]) => ({
        timestamp: new Date(datetime).toISOString(),
        datetime,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'] || '0', 10),
      }))
      .reverse(); // Alpha Vantage returns newest first

    return {
      symbol,
      exchange: 'NYSE/NASDAQ',
      interval,
      currency: 'USD',
      type: 'Stock',
      candles,
      meta: {
        firstTimestamp: candles[0]?.timestamp || '',
        lastTimestamp: candles[candles.length - 1]?.timestamp || '',
        candleCount: candles.length,
        source: 'AlphaVantage',
      },
    };
  } catch (error) {
    logger.error(`Alpha Vantage fetch error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch crypto candlestick data from CoinGecko
 */
async function fetchCryptoCandles(
  coinId: string,
  days: number = 30
): Promise<ChartData | null> {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`,
      {
        params: { vs_currency: 'usd', days },
        timeout: 10000,
      }
    );

    const ohlc = response.data;
    const candles: Candle[] = ohlc.map((data: number[]) => ({
      timestamp: new Date(data[0]).toISOString(),
      datetime: new Date(data[0]).toISOString(),
      open: data[1],
      high: data[2],
      low: data[3],
      close: data[4],
      volume: 0, // CoinGecko OHLC doesn't include volume
    }));

    // Determine interval based on days
    let interval = '1day';
    if (days <= 1) interval = '30min';
    else if (days <= 7) interval = '4h';
    else if (days <= 30) interval = '1day';

    return {
      symbol: coinId.toUpperCase(),
      exchange: 'CoinGecko',
      interval,
      currency: 'USD',
      type: 'Crypto',
      candles,
      meta: {
        firstTimestamp: candles[0]?.timestamp || '',
        lastTimestamp: candles[candles.length - 1]?.timestamp || '',
        candleCount: candles.length,
        source: 'CoinGecko',
      },
    };
  } catch (error) {
    logger.error(`CoinGecko fetch error for ${coinId}:`, error);
    return null;
  }
}

/**
 * Calculate technical indicators
 */
function calculateIndicators(
  candles: Candle[],
  indicators: string[]
): TechnicalIndicator[] {
  const results: TechnicalIndicator[] = [];
  const closes = candles.map(c => c.close);

  for (const indicator of indicators) {
    const [name, ...params] = indicator.split(':');

    switch (name.toUpperCase()) {
      case 'SMA': {
        const period = parseInt(params[0] || '20', 10);
        const smaValues = calculateSMA(closes, period);
        results.push({
          name: `SMA(${period})`,
          values: candles.map((c, i) => ({
            timestamp: c.timestamp,
            value: smaValues[i] || null,
          })),
          params: { period },
        });
        break;
      }

      case 'EMA': {
        const period = parseInt(params[0] || '20', 10);
        const emaValues = calculateEMA(closes, period);
        results.push({
          name: `EMA(${period})`,
          values: candles.map((c, i) => ({
            timestamp: c.timestamp,
            value: emaValues[i] || null,
          })),
          params: { period },
        });
        break;
      }

      case 'RSI': {
        const period = parseInt(params[0] || '14', 10);
        const rsiValues = calculateRSI(closes, period);
        results.push({
          name: `RSI(${period})`,
          values: candles.map((c, i) => ({
            timestamp: c.timestamp,
            value: rsiValues[i] || null,
          })),
          params: { period },
        });
        break;
      }

      case 'MACD': {
        const fast = parseInt(params[0] || '12', 10);
        const slow = parseInt(params[1] || '26', 10);
        const signal = parseInt(params[2] || '9', 10);
        const macdValues = calculateMACD(closes, fast, slow, signal);
        results.push({
          name: `MACD(${fast},${slow},${signal})`,
          values: candles.map((c, i) => ({
            timestamp: c.timestamp,
            value: macdValues.macd[i] || null,
          })),
          params: { fast, slow, signal },
        });
        break;
      }

      case 'BB': {
        const period = parseInt(params[0] || '20', 10);
        const stdDev = parseFloat(params[1] || '2');
        const bbValues = calculateBollingerBands(closes, period, stdDev);
        results.push({
          name: `BB(${period},${stdDev})`,
          values: candles.map((c, i) => ({
            timestamp: c.timestamp,
            value: bbValues.middle[i] || null,
          })),
          params: { period, stdDev },
        });
        break;
      }
    }
  }

  return results;
}

// Technical indicator calculations
function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      const prevEMA = result[i - 1] as number;
      result.push((data[i] - prevEMA) * multiplier + prevEMA);
    }
  }
  return result;
}

function calculateRSI(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  return result;
}

function calculateMACD(
  data: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  const macd: (number | null)[] = fastEMA.map((fast, i) => {
    if (fast === null || slowEMA[i] === null) return null;
    return fast - (slowEMA[i] as number);
  });

  const macdValues = macd.filter(v => v !== null) as number[];
  const signalEMA = calculateEMA(macdValues, signalPeriod);

  const signal: (number | null)[] = [];
  let signalIdx = 0;
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null) {
      signal.push(null);
    } else {
      signal.push(signalEMA[signalIdx++] || null);
    }
  }

  const histogram = macd.map((m, i) => {
    if (m === null || signal[i] === null) return null;
    return m - (signal[i] as number);
  });

  return { macd, signal, histogram };
}

function calculateBollingerBands(
  data: number[],
  period: number,
  stdDevMultiplier: number
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const sma = calculateSMA(data, period);

  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (sma[i] === null) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(Math.max(0, i - period + 1), i + 1);
      const mean = sma[i] as number;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
      const stdDev = Math.sqrt(variance);

      middle.push(mean);
      upper.push(mean + stdDev * stdDevMultiplier);
      lower.push(mean - stdDev * stdDevMultiplier);
    }
  }

  return { upper, middle, lower };
}

// ============================================================
// ROUTES
// ============================================================

/**
 * GET /charts/candles
 * Get candlestick data for a symbol
 */
router.get('/candles', async (req: Request, res: Response) => {
  const {
    symbol,
    interval = '1day',
    limit = '100',
    type = 'stock',
  } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  const symbolStr = (symbol as string).toUpperCase();
  const intervalStr = interval as string;
  const limitNum = Math.min(parseInt(limit as string, 10), 500);
  const typeStr = (type as string).toLowerCase();

  // Validate interval
  if (!VALID_INTERVALS.includes(intervalStr)) {
    return res.status(400).json({
      error: 'Invalid interval',
      validIntervals: VALID_INTERVALS,
    });
  }

  // Check cache
  const cacheKey = `chart:${symbolStr}:${intervalStr}:${limitNum}`;
  const cacheTTL = CACHE_TTL[intervalStr] || 300;

  try {
    // Try cache first
    const cached = await databaseManager.cacheGet(cacheKey, async () => {
      let chartData: ChartData | null = null;

      if (typeStr === 'crypto') {
        // Use CoinGecko for crypto
        const daysMap: Record<string, number> = {
          '30min': 1,
          '1h': 1,
          '4h': 7,
          '1day': 30,
          '1week': 90,
          '1month': 365,
        };
        const days = daysMap[intervalStr] || 30;
        chartData = await fetchCryptoCandles(symbolStr.toLowerCase(), days);
      } else {
        // Try TwelveData first
        chartData = await fetchFromTwelveData(symbolStr, intervalStr, limitNum);

        // Fallback to Alpha Vantage
        if (!chartData) {
          chartData = await fetchFromAlphaVantage(symbolStr, intervalStr);
        }
      }

      return chartData;
    }, cacheTTL);

    if (!cached) {
      return res.status(404).json({
        error: 'No data available for this symbol',
        symbol: symbolStr,
      });
    }

    res.json({
      success: true,
      data: cached,
    });
  } catch (error) {
    logger.error('Chart data error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

/**
 * GET /charts/candles/:symbol
 * Shorthand route for specific symbol - redirects to main candles endpoint
 */
router.get('/candles/:symbol', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const queryParams = new URLSearchParams(req.query as Record<string, string>);
  queryParams.set('symbol', symbol);
  res.redirect(`/api/charts/candles?${queryParams.toString()}`);
});

/**
 * GET /charts/indicators
 * Get chart data with technical indicators
 */
router.get('/indicators', authMiddleware, async (req: Request, res: Response) => {
  const {
    symbol,
    interval = '1day',
    indicators = 'SMA:20,EMA:50,RSI:14',
  } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  const symbolStr = (symbol as string).toUpperCase();
  const intervalStr = interval as string;
  const indicatorList = (indicators as string).split(',');

  try {
    // Fetch base chart data
    let chartData = await fetchFromTwelveData(symbolStr, intervalStr, 200);

    if (!chartData) {
      chartData = await fetchFromAlphaVantage(symbolStr, intervalStr);
    }

    if (!chartData || chartData.candles.length === 0) {
      return res.status(404).json({ error: 'No data available' });
    }

    // Calculate indicators
    const calculatedIndicators = calculateIndicators(chartData.candles, indicatorList);

    res.json({
      success: true,
      data: {
        ...chartData,
        indicators: calculatedIndicators,
      },
    });
  } catch (error) {
    logger.error('Indicator calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate indicators' });
  }
});

/**
 * GET /charts/multi
 * Get candlestick data for multiple symbols at once
 */
router.get('/multi', authMiddleware, async (req: Request, res: Response) => {
  const { symbols, interval = '1day' } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Symbols are required (comma-separated)' });
  }

  const symbolList = (symbols as string).split(',').map(s => s.trim().toUpperCase());
  const intervalStr = interval as string;

  if (symbolList.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 symbols allowed per request' });
  }

  try {
    const results: Record<string, ChartData | null> = {};

    await Promise.all(
      symbolList.map(async (symbol) => {
        const cacheKey = `chart:${symbol}:${intervalStr}:100`;
        results[symbol] = await databaseManager.cacheGet(cacheKey, async () => {
          return fetchFromTwelveData(symbol, intervalStr, 100);
        }, CACHE_TTL[intervalStr] || 300);
      })
    );

    res.json({
      success: true,
      data: results,
      requested: symbolList.length,
      returned: Object.values(results).filter(Boolean).length,
    });
  } catch (error) {
    logger.error('Multi-chart error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

/**
 * GET /charts/compare
 * Compare multiple symbols on same chart (normalized)
 */
router.get('/compare', authMiddleware, async (req: Request, res: Response) => {
  const { symbols, interval = '1day', normalize = 'true' } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Symbols are required (comma-separated)' });
  }

  const symbolList = (symbols as string).split(',').map(s => s.trim().toUpperCase());

  try {
    const chartDataList: ChartData[] = [];

    for (const symbol of symbolList) {
      const data = await fetchFromTwelveData(symbol, interval as string, 100);
      if (data) chartDataList.push(data);
    }

    if (chartDataList.length === 0) {
      return res.status(404).json({ error: 'No data available for any symbol' });
    }

    // Normalize if requested
    let comparisonData;
    if (normalize === 'true') {
      comparisonData = chartDataList.map(chart => {
        const firstClose = chart.candles[0]?.close || 1;
        return {
          symbol: chart.symbol,
          data: chart.candles.map(c => ({
            timestamp: c.timestamp,
            value: ((c.close - firstClose) / firstClose) * 100, // Percentage change
          })),
        };
      });
    } else {
      comparisonData = chartDataList.map(chart => ({
        symbol: chart.symbol,
        data: chart.candles.map(c => ({
          timestamp: c.timestamp,
          value: c.close,
        })),
      }));
    }

    res.json({
      success: true,
      data: comparisonData,
      normalized: normalize === 'true',
    });
  } catch (error) {
    logger.error('Compare chart error:', error);
    res.status(500).json({ error: 'Failed to compare charts' });
  }
});

/**
 * GET /charts/intraday/:symbol
 * Get intraday chart with 1-minute resolution
 */
router.get('/intraday/:symbol', authMiddleware, async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { extended = 'false' } = req.query;

  try {
    const chartData = await fetchFromTwelveData(symbol.toUpperCase(), '1min', 390); // Full trading day

    if (!chartData) {
      return res.status(404).json({ error: 'No intraday data available' });
    }

    res.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    logger.error('Intraday chart error:', error);
    res.status(500).json({ error: 'Failed to fetch intraday data' });
  }
});

/**
 * GET /charts/historical/:symbol
 * Get long-term historical data
 */
router.get('/historical/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { years = '5' } = req.query;

  try {
    // For historical, use daily data
    const outputSize = Math.min(parseInt(years as string, 10) * 252, 5000); // ~252 trading days/year

    const chartData = await fetchFromTwelveData(symbol.toUpperCase(), '1day', outputSize);

    if (!chartData) {
      return res.status(404).json({ error: 'No historical data available' });
    }

    res.json({
      success: true,
      data: chartData,
      yearsRequested: parseInt(years as string, 10),
    });
  } catch (error) {
    logger.error('Historical chart error:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

/**
 * GET /charts/patterns/:symbol
 * Detect chart patterns (head and shoulders, double top, etc.)
 */
router.get('/patterns/:symbol', authMiddleware, async (req: Request, res: Response) => {
  const { symbol } = req.params;

  try {
    const chartData = await fetchFromTwelveData(symbol.toUpperCase(), '1day', 200);

    if (!chartData || chartData.candles.length < 50) {
      return res.status(404).json({ error: 'Insufficient data for pattern detection' });
    }

    // Simple pattern detection (placeholder for advanced ML-based detection)
    const patterns = detectPatterns(chartData.candles);

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      patterns,
      disclaimer: 'Pattern detection is for educational purposes. Always verify with additional analysis.',
    });
  } catch (error) {
    logger.error('Pattern detection error:', error);
    res.status(500).json({ error: 'Failed to detect patterns' });
  }
});

/**
 * Basic pattern detection
 */
function detectPatterns(candles: Candle[]): Array<{ pattern: string; confidence: number; location: number }> {
  const patterns: Array<{ pattern: string; confidence: number; location: number }> = [];

  // Detect simple patterns
  for (let i = 10; i < candles.length - 5; i++) {
    const window = candles.slice(i - 10, i + 5);
    const closes = window.map(c => c.close);
    const highs = window.map(c => c.high);
    const lows = window.map(c => c.low);

    // Double Top Detection
    const maxHigh = Math.max(...highs);
    const highCount = highs.filter(h => h >= maxHigh * 0.99).length;
    if (highCount >= 2 && closes[closes.length - 1] < maxHigh * 0.97) {
      patterns.push({
        pattern: 'Double Top',
        confidence: 0.6,
        location: i,
      });
    }

    // Double Bottom Detection
    const minLow = Math.min(...lows);
    const lowCount = lows.filter(l => l <= minLow * 1.01).length;
    if (lowCount >= 2 && closes[closes.length - 1] > minLow * 1.03) {
      patterns.push({
        pattern: 'Double Bottom',
        confidence: 0.6,
        location: i,
      });
    }

    // Bullish Engulfing
    if (i > 0) {
      const prev = candles[i - 1];
      const curr = candles[i];
      if (
        prev.close < prev.open && // Previous red candle
        curr.close > curr.open && // Current green candle
        curr.open < prev.close && // Opens below previous close
        curr.close > prev.open // Closes above previous open
      ) {
        patterns.push({
          pattern: 'Bullish Engulfing',
          confidence: 0.7,
          location: i,
        });
      }
    }

    // Bearish Engulfing
    if (i > 0) {
      const prev = candles[i - 1];
      const curr = candles[i];
      if (
        prev.close > prev.open && // Previous green candle
        curr.close < curr.open && // Current red candle
        curr.open > prev.close && // Opens above previous close
        curr.close < prev.open // Closes below previous open
      ) {
        patterns.push({
          pattern: 'Bearish Engulfing',
          confidence: 0.7,
          location: i,
        });
      }
    }

    // Doji Detection
    const curr = candles[i];
    const bodySize = Math.abs(curr.close - curr.open);
    const candleRange = curr.high - curr.low;
    if (candleRange > 0 && bodySize / candleRange < 0.1) {
      patterns.push({
        pattern: 'Doji',
        confidence: 0.8,
        location: i,
      });
    }
  }

  // Remove duplicates and keep highest confidence
  const uniquePatterns = patterns.reduce((acc, curr) => {
    const existing = acc.find(p => p.pattern === curr.pattern && Math.abs(p.location - curr.location) < 3);
    if (!existing) {
      acc.push(curr);
    } else if (existing.confidence < curr.confidence) {
      existing.confidence = curr.confidence;
    }
    return acc;
  }, [] as typeof patterns);

  return uniquePatterns.slice(-10); // Return last 10 patterns
}

export default router;

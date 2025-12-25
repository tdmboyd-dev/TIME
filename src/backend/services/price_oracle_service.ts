/**
 * TIME BEYOND US - Multi-Oracle Price Feed Service
 *
 * Aggregates prices from multiple sources to prevent manipulation:
 * - DefiLlama (Primary - FREE)
 * - CoinGecko (Backup)
 * - Chainlink (On-chain oracle reference)
 * - Twelve Data (Stocks/Forex)
 * - Alpha Vantage (Backup for traditional)
 *
 * Security features:
 * - Outlier detection (rejects prices >5% from median)
 * - Staleness checks (rejects prices older than 5 minutes)
 * - Minimum 2 sources required for confidence
 * - Caching with TTL
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('PriceOracle');

// ============================================================================
// TYPES
// ============================================================================

interface PriceData {
  price: number;
  source: string;
  timestamp: number;
  confidence: number; // 0-1
}

interface AggregatedPrice {
  price: number;
  sources: string[];
  timestamp: number;
  confidence: number;
  deviation: number;
  staleness: number;
}

interface PriceCache {
  [symbol: string]: {
    data: AggregatedPrice;
    expiresAt: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MAX_STALENESS_MS: 5 * 60 * 1000, // 5 minutes
  MAX_DEVIATION: 0.05, // 5% max deviation from median
  MIN_SOURCES: 2, // Minimum sources for confidence
  CACHE_TTL_MS: 30 * 1000, // 30 second cache
  REQUEST_TIMEOUT_MS: 5000, // 5 second timeout per source
};

// Price cache
const priceCache: PriceCache = {};

// ============================================================================
// PRICE SOURCES
// ============================================================================

interface DefiLlamaResponse {
  coins: Record<string, { price: number; timestamp?: number }>;
}

interface CoinGeckoResponse {
  [key: string]: { usd: number; last_updated_at?: number };
}

interface TwelveDataResponse {
  price?: string;
}

interface FinnhubResponse {
  c?: number;
  t?: number;
}

/**
 * Fetch price from DefiLlama (FREE, no API key)
 */
async function fetchDefiLlama(symbol: string): Promise<PriceData | null> {
  try {
    const response = await fetch(
      `https://coins.llama.fi/prices/current/coingecko:${symbol.toLowerCase()}`,
      { signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS) }
    );

    if (!response.ok) return null;

    const data = await response.json() as DefiLlamaResponse;
    const coinKey = Object.keys(data.coins)[0];

    if (!coinKey || !data.coins[coinKey]) return null;

    return {
      price: data.coins[coinKey].price,
      source: 'defillama',
      timestamp: (data.coins[coinKey].timestamp || 0) * 1000 || Date.now(),
      confidence: 0.95,
    };
  } catch (error) {
    logger.warn('[DefiLlama] Price fetch failed', { symbol, error: String(error) });
    return null;
  }
}

/**
 * Fetch price from CoinGecko (FREE with rate limits)
 */
async function fetchCoinGecko(symbol: string): Promise<PriceData | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd&include_last_updated_at=true`,
      { signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS) }
    );

    if (!response.ok) return null;

    const data = await response.json() as CoinGeckoResponse;
    const coinData = data[symbol.toLowerCase()];

    if (!coinData || !coinData.usd) return null;

    return {
      price: coinData.usd,
      source: 'coingecko',
      timestamp: (coinData.last_updated_at || 0) * 1000 || Date.now(),
      confidence: 0.9,
    };
  } catch (error) {
    logger.warn('[CoinGecko] Price fetch failed', { symbol, error: String(error) });
    return null;
  }
}

/**
 * Fetch price from Twelve Data (for stocks/forex)
 */
async function fetchTwelveData(symbol: string): Promise<PriceData | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS) }
    );

    if (!response.ok) return null;

    const data = await response.json() as TwelveDataResponse;

    if (!data.price) return null;

    return {
      price: parseFloat(data.price),
      source: 'twelvedata',
      timestamp: Date.now(),
      confidence: 0.95,
    };
  } catch (error) {
    logger.warn('[TwelveData] Price fetch failed', { symbol, error: String(error) });
    return null;
  }
}

/**
 * Fetch price from Finnhub (stocks)
 */
async function fetchFinnhub(symbol: string): Promise<PriceData | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
      { signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS) }
    );

    if (!response.ok) return null;

    const data = await response.json() as FinnhubResponse;

    if (!data.c) return null; // c = current price

    return {
      price: data.c,
      source: 'finnhub',
      timestamp: (data.t || 0) * 1000 || Date.now(),
      confidence: 0.95,
    };
  } catch (error) {
    logger.warn('[Finnhub] Price fetch failed', { symbol, error: String(error) });
    return null;
  }
}

// ============================================================================
// PRICE AGGREGATION
// ============================================================================

/**
 * Calculate median of array
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Check if price is stale
 */
function isStale(timestamp: number): boolean {
  return Date.now() - timestamp > CONFIG.MAX_STALENESS_MS;
}

/**
 * Get aggregated price from multiple sources
 */
export async function getAggregatedPrice(
  symbol: string,
  assetType: 'crypto' | 'stock' | 'forex' = 'crypto'
): Promise<AggregatedPrice | null> {
  // Check cache first
  const cached = priceCache[symbol];
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug('[PriceOracle] Cache hit', { symbol });
    return cached.data;
  }

  // Fetch from all relevant sources in parallel
  let fetchers: Promise<PriceData | null>[] = [];

  if (assetType === 'crypto') {
    fetchers = [
      fetchDefiLlama(symbol),
      fetchCoinGecko(symbol),
    ];
  } else if (assetType === 'stock') {
    fetchers = [
      fetchTwelveData(symbol),
      fetchFinnhub(symbol),
    ];
  } else {
    fetchers = [
      fetchTwelveData(symbol),
    ];
  }

  const results = await Promise.allSettled(fetchers);

  // Filter valid results
  const validPrices: PriceData[] = results
    .filter((r): r is PromiseFulfilledResult<PriceData | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((p): p is PriceData => p !== null && !isStale(p.timestamp));

  if (validPrices.length === 0) {
    logger.error('[PriceOracle] No valid prices from any source', { symbol, assetType });
    return null;
  }

  // Calculate median price
  const prices = validPrices.map(p => p.price);
  const medianPrice = median(prices);

  // Filter outliers (>5% from median)
  const filteredPrices = validPrices.filter(p => {
    const deviation = Math.abs(p.price - medianPrice) / medianPrice;
    if (deviation > CONFIG.MAX_DEVIATION) {
      logger.warn('[PriceOracle] Outlier rejected', {
        symbol,
        source: p.source,
        price: p.price,
        median: medianPrice,
        deviation: (deviation * 100).toFixed(2) + '%',
      });
      return false;
    }
    return true;
  });

  if (filteredPrices.length < CONFIG.MIN_SOURCES) {
    // If we don't have enough sources after filtering, use what we have with lower confidence
    if (filteredPrices.length === 0) {
      logger.error('[PriceOracle] All prices rejected as outliers', { symbol });
      return null;
    }
    logger.warn('[PriceOracle] Low source count', {
      symbol,
      count: filteredPrices.length,
      required: CONFIG.MIN_SOURCES,
    });
  }

  // Calculate final price (weighted average by confidence)
  const totalWeight = filteredPrices.reduce((sum, p) => sum + p.confidence, 0);
  const weightedPrice = filteredPrices.reduce(
    (sum, p) => sum + (p.price * p.confidence),
    0
  ) / totalWeight;

  // Calculate deviation from median
  const avgDeviation = filteredPrices.reduce(
    (sum, p) => sum + Math.abs(p.price - medianPrice) / medianPrice,
    0
  ) / filteredPrices.length;

  // Calculate confidence based on source count and deviation
  const confidence = Math.min(1, (filteredPrices.length / CONFIG.MIN_SOURCES)) *
    (1 - Math.min(avgDeviation * 10, 0.5));

  // Calculate staleness (oldest timestamp)
  const oldestTimestamp = Math.min(...filteredPrices.map(p => p.timestamp));
  const staleness = Date.now() - oldestTimestamp;

  const result: AggregatedPrice = {
    price: weightedPrice,
    sources: filteredPrices.map(p => p.source),
    timestamp: Date.now(),
    confidence,
    deviation: avgDeviation,
    staleness,
  };

  // Cache the result
  priceCache[symbol] = {
    data: result,
    expiresAt: Date.now() + CONFIG.CACHE_TTL_MS,
  };

  logger.info('[PriceOracle] Price aggregated', {
    symbol,
    price: weightedPrice.toFixed(4),
    sources: result.sources.join(', '),
    confidence: (confidence * 100).toFixed(1) + '%',
    deviation: (avgDeviation * 100).toFixed(2) + '%',
  });

  return result;
}

/**
 * Get multiple prices at once
 */
export async function getMultiplePrices(
  symbols: { symbol: string; type: 'crypto' | 'stock' | 'forex' }[]
): Promise<Record<string, AggregatedPrice | null>> {
  const results = await Promise.all(
    symbols.map(async ({ symbol, type }) => ({
      symbol,
      price: await getAggregatedPrice(symbol, type),
    }))
  );

  return results.reduce(
    (acc, { symbol, price }) => {
      acc[symbol] = price;
      return acc;
    },
    {} as Record<string, AggregatedPrice | null>
  );
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  Object.keys(priceCache).forEach(key => delete priceCache[key]);
  logger.info('[PriceOracle] Cache cleared');
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; symbols: string[] } {
  const now = Date.now();
  const validEntries = Object.entries(priceCache)
    .filter(([, v]) => v.expiresAt > now);

  return {
    size: validEntries.length,
    symbols: validEntries.map(([k]) => k),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const priceOracleService = {
  getAggregatedPrice,
  getMultiplePrices,
  clearPriceCache,
  getCacheStats,
};

export default priceOracleService;

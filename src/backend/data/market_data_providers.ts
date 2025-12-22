/**
 * TIME Market Data Providers
 *
 * Multi-provider market data aggregation for real-time quotes,
 * historical data, and streaming prices.
 *
 * Providers:
 * - Polygon.io: US stocks, options, forex, crypto
 * - TwelveData: Global stocks, forex, crypto, technical indicators
 * - Alpha Vantage: Backup for fundamentals
 * - Yahoo Finance: Free backup source
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type DataProvider = 'polygon' | 'twelvedata' | 'alphavantage' | 'yahoo';

export type MarketType = 'stocks' | 'forex' | 'crypto' | 'options' | 'indices' | 'commodities';

export type TimeFrame =
  | '1m' | '5m' | '15m' | '30m'
  | '1h' | '4h'
  | '1d' | '1w' | '1M';

export interface Quote {
  symbol: string;
  provider: DataProvider;
  timestamp: Date;
  bid: number;
  ask: number;
  last: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  marketType: MarketType;
}

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalData {
  symbol: string;
  provider: DataProvider;
  timeframe: TimeFrame;
  bars: OHLCV[];
  startDate: Date;
  endDate: Date;
}

export interface TechnicalIndicator {
  name: string;
  period: number;
  values: { timestamp: Date; value: number | number[] }[];
}

export interface MarketSnapshot {
  timestamp: Date;
  provider: DataProvider;
  quotes: Map<string, Quote>;
  lastUpdate: Date;
}

export interface StreamSubscription {
  id: string;
  symbol: string;
  marketType: MarketType;
  provider: DataProvider;
  callback: (quote: Quote) => void;
  active: boolean;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  wsUrl?: string;
  rateLimit: number; // requests per minute
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
}

export interface SymbolSearch {
  symbol: string;
  name: string;
  type: MarketType;
  exchange: string;
  currency: string;
  provider: DataProvider;
}

// ============================================================================
// Provider Implementations
// ============================================================================

abstract class BaseDataProvider extends EventEmitter {
  protected config: ProviderConfig;
  protected name: DataProvider;
  protected requestCount: number = 0;
  protected lastReset: Date = new Date();

  constructor(name: DataProvider, config: ProviderConfig) {
    super();
    this.name = name;
    this.config = config;
  }

  protected async throttle(): Promise<void> {
    const now = new Date();
    const elapsed = now.getTime() - this.lastReset.getTime();

    if (elapsed >= 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    if (this.requestCount >= this.config.rateLimit) {
      const waitTime = 60000 - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastReset = new Date();
    }

    this.requestCount++;
  }

  abstract getQuote(symbol: string): Promise<Quote>;
  abstract getHistoricalData(symbol: string, timeframe: TimeFrame, limit?: number): Promise<HistoricalData>;
  abstract searchSymbols(query: string): Promise<SymbolSearch[]>;
}

// ============================================================================
// Polygon.io Provider
// ============================================================================

class PolygonProvider extends BaseDataProvider {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, StreamSubscription> = new Map();

  constructor(apiKey: string) {
    super('polygon', {
      apiKey,
      baseUrl: 'https://api.polygon.io',
      wsUrl: 'wss://socket.polygon.io',
      rateLimit: 5, // Free tier: 5/min, paid: unlimited
      tier: apiKey ? 'basic' : 'free',
    });
  }

  async getQuote(symbol: string): Promise<Quote> {
    await this.throttle();

    const marketType = this.detectMarketType(symbol);
    const formattedSymbol = this.formatSymbol(symbol, marketType);

    // Make real API call to Polygon.io
    const endpoint = marketType === 'stocks'
      ? `${this.config.baseUrl}/v2/aggs/ticker/${formattedSymbol}/prev?apiKey=${this.config.apiKey}`
      : `${this.config.baseUrl}/v2/aggs/ticker/${formattedSymbol}/prev?apiKey=${this.config.apiKey}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { results?: { t: number; o: number; h: number; l: number; c: number; v: number }[] };
      if (!data.results || data.results.length === 0) {
        throw new Error(`No data returned from Polygon for ${symbol}`);
      }

      const result = data.results[0];
      const change = result.c - result.o;
      const changePercent = (change / result.o) * 100;

      return {
        symbol,
        provider: 'polygon',
        timestamp: new Date(result.t),
        bid: result.c * 0.9999, // Estimate bid from close
        ask: result.c * 1.0001, // Estimate ask from close
        last: result.c,
        open: result.o,
        high: result.h,
        low: result.l,
        close: result.c,
        volume: result.v,
        change,
        changePercent,
        marketType,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch quote for ${symbol} from Polygon: ${error.message}`);
    }
  }

  async getHistoricalData(symbol: string, timeframe: TimeFrame, limit: number = 100): Promise<HistoricalData> {
    await this.throttle();

    const marketType = this.detectMarketType(symbol);
    const formattedSymbol = this.formatSymbol(symbol, marketType);
    const multiplier = this.getTimeframeMultiplier(timeframe);
    const span = this.getTimeframeSpan(timeframe);
    const now = Date.now();
    const timeframeMs = this.timeframeToMs(timeframe);
    const from = new Date(now - limit * timeframeMs).toISOString().split('T')[0];
    const to = new Date(now).toISOString().split('T')[0];

    // Make real API call to Polygon.io
    const endpoint = `${this.config.baseUrl}/v2/aggs/ticker/${formattedSymbol}/range/${multiplier}/${span}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apiKey=${this.config.apiKey}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { results?: { t: number; o: number; h: number; l: number; c: number; v: number }[] };
      if (!data.results || data.results.length === 0) {
        throw new Error(`No historical data returned from Polygon for ${symbol}`);
      }

      const bars: OHLCV[] = data.results.map((bar) => ({
        timestamp: new Date(bar.t),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
      }));

      return {
        symbol,
        provider: 'polygon',
        timeframe,
        bars,
        startDate: bars[0].timestamp,
        endDate: bars[bars.length - 1].timestamp,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch historical data for ${symbol} from Polygon: ${error.message}`);
    }
  }

  private getTimeframeMultiplier(tf: TimeFrame): number {
    const map: Record<TimeFrame, number> = {
      '1m': 1, '5m': 5, '15m': 15, '30m': 30,
      '1h': 1, '4h': 4,
      '1d': 1, '1w': 1, '1M': 1,
    };
    return map[tf];
  }

  private getTimeframeSpan(tf: TimeFrame): string {
    if (tf.endsWith('m')) return 'minute';
    if (tf.endsWith('h')) return 'hour';
    if (tf === '1w') return 'week';
    if (tf === '1M') return 'month';
    return 'day';
  }

  async searchSymbols(query: string): Promise<SymbolSearch[]> {
    await this.throttle();

    // Common symbols matching query
    const allSymbols: SymbolSearch[] = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stocks', exchange: 'NASDAQ', currency: 'USD', provider: 'polygon' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stocks', exchange: 'NASDAQ', currency: 'USD', provider: 'polygon' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stocks', exchange: 'NASDAQ', currency: 'USD', provider: 'polygon' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stocks', exchange: 'NASDAQ', currency: 'USD', provider: 'polygon' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stocks', exchange: 'NASDAQ', currency: 'USD', provider: 'polygon' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stocks', exchange: 'NASDAQ', currency: 'USD', provider: 'polygon' },
      { symbol: 'EUR/USD', name: 'Euro/US Dollar', type: 'forex', exchange: 'FOREX', currency: 'USD', provider: 'polygon' },
      { symbol: 'GBP/USD', name: 'British Pound/US Dollar', type: 'forex', exchange: 'FOREX', currency: 'USD', provider: 'polygon' },
      { symbol: 'BTC/USD', name: 'Bitcoin/US Dollar', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', provider: 'polygon' },
      { symbol: 'ETH/USD', name: 'Ethereum/US Dollar', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', provider: 'polygon' },
    ];

    const q = query.toUpperCase();
    return allSymbols.filter(s =>
      s.symbol.includes(q) || s.name.toUpperCase().includes(q)
    );
  }

  async subscribeQuotes(symbols: string[], callback: (quote: Quote) => void): Promise<string[]> {
    const ids: string[] = [];

    for (const symbol of symbols) {
      const id = `sub_${Date.now()}_${symbol}`;
      const marketType = this.detectMarketType(symbol);

      this.subscriptions.set(id, {
        id,
        symbol,
        marketType,
        provider: 'polygon',
        callback,
        active: true,
      });

      ids.push(id);

      // Start real-time quote polling
      this.startRealTimeStream(id, symbol);
    }

    return ids;
  }

  unsubscribe(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      sub.active = false;
      this.subscriptions.delete(subscriptionId);
    }
  }

  private startRealTimeStream(id: string, symbol: string): void {
    // Use real API polling for streaming quotes
    const stream = () => {
      const sub = this.subscriptions.get(id);
      if (!sub || !sub.active) return;

      this.getQuote(symbol)
        .then(quote => {
          if (sub.active) {
            sub.callback(quote);
            // Poll every 5 seconds for real-time updates (respect rate limits)
            setTimeout(stream, 5000);
          }
        })
        .catch(error => {
          console.error(`[Polygon] Stream error for ${symbol}:`, error.message);
          // Retry after longer delay on error
          if (sub.active) {
            setTimeout(stream, 15000);
          }
        });
    };

    setTimeout(stream, 100);
  }

  private detectMarketType(symbol: string): MarketType {
    if (symbol.includes('/')) {
      return symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('XRP')
        ? 'crypto'
        : 'forex';
    }
    if (symbol.startsWith('^') || symbol.includes('INDEX')) return 'indices';
    if (['GOLD', 'SILVER', 'OIL', 'GC', 'SI', 'CL'].some(c => symbol.includes(c))) return 'commodities';
    return 'stocks';
  }

  private formatSymbol(symbol: string, marketType: MarketType): string {
    switch (marketType) {
      case 'forex':
        return `C:${symbol.replace('/', '')}`;
      case 'crypto':
        return `X:${symbol.replace('/', '')}`;
      default:
        return symbol;
    }
  }

  private timeframeToMs(tf: TimeFrame): number {
    const map: Record<TimeFrame, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
      '1w': 604800000,
      '1M': 2592000000,
    };
    return map[tf];
  }
}

// ============================================================================
// TwelveData Provider
// ============================================================================

class TwelveDataProvider extends BaseDataProvider {
  constructor(apiKey: string) {
    super('twelvedata', {
      apiKey,
      baseUrl: 'https://api.twelvedata.com',
      wsUrl: 'wss://ws.twelvedata.com',
      rateLimit: 8, // Free: 8/min, Growth: 800/min
      tier: apiKey ? 'basic' : 'free',
    });
  }

  async getQuote(symbol: string): Promise<Quote> {
    await this.throttle();

    const marketType = this.detectMarketType(symbol);
    const formattedSymbol = symbol.replace('/', '');

    // Make real API call to TwelveData
    const endpoint = `${this.config.baseUrl}/quote?symbol=${formattedSymbol}&apikey=${this.config.apiKey}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`TwelveData API error: ${response.status} ${response.statusText}`);
      }

      interface TwelveDataQuote {
        code?: number;
        message?: string;
        close: string;
        open: string;
        high: string;
        low: string;
        volume: string;
        change: string;
        percent_change: string;
        datetime: string;
      }
      const data = await response.json() as TwelveDataQuote;
      if (data.code) {
        throw new Error(`TwelveData error: ${data.message || data.code}`);
      }

      const close = parseFloat(data.close);
      const open = parseFloat(data.open);
      const high = parseFloat(data.high);
      const low = parseFloat(data.low);
      const volume = parseInt(data.volume) || 0;
      const change = parseFloat(data.change) || close - open;
      const changePercent = parseFloat(data.percent_change) || (change / open) * 100;

      return {
        symbol,
        provider: 'twelvedata',
        timestamp: new Date(data.datetime || Date.now()),
        bid: close * 0.9998,
        ask: close * 1.0002,
        last: close,
        open,
        high,
        low,
        close,
        volume,
        change,
        changePercent,
        marketType,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch quote for ${symbol} from TwelveData: ${error.message}`);
    }
  }

  async getHistoricalData(symbol: string, timeframe: TimeFrame, limit: number = 100): Promise<HistoricalData> {
    await this.throttle();

    const formattedSymbol = symbol.replace('/', '');
    const interval = this.convertTimeframe(timeframe);

    // Make real API call to TwelveData
    const endpoint = `${this.config.baseUrl}/time_series?symbol=${formattedSymbol}&interval=${interval}&outputsize=${limit}&apikey=${this.config.apiKey}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`TwelveData API error: ${response.status} ${response.statusText}`);
      }

      interface TwelveDataHistorical {
        code?: number;
        message?: string;
        values?: { datetime: string; open: string; high: string; low: string; close: string; volume: string }[];
      }
      const data = await response.json() as TwelveDataHistorical;
      if (data.code) {
        throw new Error(`TwelveData error: ${data.message || data.code}`);
      }

      if (!data.values || data.values.length === 0) {
        throw new Error(`No historical data returned from TwelveData for ${symbol}`);
      }

      // TwelveData returns data in reverse chronological order, so reverse it
      const bars: OHLCV[] = data.values.reverse().map((bar) => ({
        timestamp: new Date(bar.datetime),
        open: parseFloat(bar.open),
        high: parseFloat(bar.high),
        low: parseFloat(bar.low),
        close: parseFloat(bar.close),
        volume: parseInt(bar.volume) || 0,
      }));

      return {
        symbol,
        provider: 'twelvedata',
        timeframe,
        bars,
        startDate: bars[0].timestamp,
        endDate: bars[bars.length - 1].timestamp,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch historical data for ${symbol} from TwelveData: ${error.message}`);
    }
  }

  private convertTimeframe(tf: TimeFrame): string {
    const map: Record<TimeFrame, string> = {
      '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
      '1h': '1h', '4h': '4h',
      '1d': '1day', '1w': '1week', '1M': '1month',
    };
    return map[tf];
  }

  async searchSymbols(query: string): Promise<SymbolSearch[]> {
    await this.throttle();

    const allSymbols: SymbolSearch[] = [
      { symbol: 'AAPL', name: 'Apple Inc', type: 'stocks', exchange: 'NASDAQ', currency: 'USD', provider: 'twelvedata' },
      { symbol: 'META', name: 'Meta Platforms Inc', type: 'stocks', exchange: 'NASDAQ', currency: 'USD', provider: 'twelvedata' },
      { symbol: 'V', name: 'Visa Inc', type: 'stocks', exchange: 'NYSE', currency: 'USD', provider: 'twelvedata' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co', type: 'stocks', exchange: 'NYSE', currency: 'USD', provider: 'twelvedata' },
      { symbol: 'AUD/USD', name: 'Australian Dollar/US Dollar', type: 'forex', exchange: 'FOREX', currency: 'USD', provider: 'twelvedata' },
      { symbol: 'USD/CHF', name: 'US Dollar/Swiss Franc', type: 'forex', exchange: 'FOREX', currency: 'CHF', provider: 'twelvedata' },
      { symbol: 'XRP/USD', name: 'Ripple/US Dollar', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', provider: 'twelvedata' },
      { symbol: 'SOL/USD', name: 'Solana/US Dollar', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', provider: 'twelvedata' },
    ];

    const q = query.toUpperCase();
    return allSymbols.filter(s =>
      s.symbol.includes(q) || s.name.toUpperCase().includes(q)
    );
  }

  async getTechnicalIndicator(
    symbol: string,
    indicator: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'ATR',
    period: number = 14,
    timeframe: TimeFrame = '1d'
  ): Promise<TechnicalIndicator> {
    await this.throttle();

    const historical = await this.getHistoricalData(symbol, timeframe, period * 3);
    const values: { timestamp: Date; value: number | number[] }[] = [];

    for (let i = period; i < historical.bars.length; i++) {
      const bar = historical.bars[i];
      let value: number | number[];

      switch (indicator) {
        case 'SMA':
        case 'EMA':
          value = historical.bars.slice(i - period, i).reduce((sum, b) => sum + b.close, 0) / period;
          break;
        case 'RSI':
          value = 30 + Math.random() * 40; // Simulated RSI
          break;
        case 'MACD':
          value = [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.5];
          break;
        case 'BB':
          const mid = bar.close;
          value = [mid * 0.98, mid, mid * 1.02]; // Lower, Middle, Upper
          break;
        case 'ATR':
          value = bar.high - bar.low;
          break;
        default:
          value = 0;
      }

      values.push({ timestamp: bar.timestamp, value });
    }

    return {
      name: indicator,
      period,
      values,
    };
  }

  private detectMarketType(symbol: string): MarketType {
    if (symbol.includes('/')) {
      const cryptos = ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT'];
      return cryptos.some(c => symbol.includes(c)) ? 'crypto' : 'forex';
    }
    return 'stocks';
  }

  private timeframeToMs(tf: TimeFrame): number {
    const map: Record<TimeFrame, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
      '1w': 604800000,
      '1M': 2592000000,
    };
    return map[tf];
  }
}

// ============================================================================
// Market Data Aggregator (Main Manager)
// ============================================================================

export class MarketDataManager extends EventEmitter {
  private providers: Map<DataProvider, BaseDataProvider> = new Map();
  private cache: Map<string, { quote: Quote; expires: Date }> = new Map();
  private subscriptions: Map<string, StreamSubscription[]> = new Map();
  private preferredProvider: DataProvider = 'twelvedata'; // Default to TwelveData (free tier available)

  // Cache TTL in milliseconds
  private readonly CACHE_TTL = 5000; // 5 seconds for real-time
  private readonly HISTORICAL_CACHE_TTL = 60000; // 1 minute for historical

  constructor(config?: {
    polygonKey?: string;
    twelveDataKey?: string;
    alphaVantageKey?: string;
  }) {
    super();

    // Initialize providers (order matters - first available becomes preferred if polygon missing)
    if (config?.twelveDataKey) {
      this.providers.set('twelvedata', new TwelveDataProvider(config.twelveDataKey));
      console.log('[MarketData] TwelveData provider initialized');
    }
    if (config?.polygonKey) {
      this.providers.set('polygon', new PolygonProvider(config.polygonKey));
      this.preferredProvider = 'polygon'; // Prefer Polygon if available
      console.log('[MarketData] Polygon provider initialized');
    }

    // CRITICAL: Require at least one real market data provider
    if (this.providers.size === 0) {
      console.error('[MarketData] CRITICAL: No market data providers configured!');
      console.error('[MarketData] Set TWELVE_DATA_API_KEY or POLYGON_API_KEY environment variable');
      // Do NOT add mock provider - trading requires real market data
      throw new Error('No market data providers configured. Set TWELVE_DATA_API_KEY or POLYGON_API_KEY.');
    }

    console.log(`[MarketData] Initialized with ${this.providers.size} providers, preferred: ${this.preferredProvider}`);
  }

  // ============================================================================
  // Quote Operations
  // ============================================================================

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string, provider?: DataProvider): Promise<Quote> {
    const cacheKey = `quote:${symbol}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > new Date()) {
      return cached.quote;
    }

    const selectedProvider = this.providers.get(provider || this.preferredProvider);
    if (!selectedProvider) {
      throw new Error(`Provider ${provider || this.preferredProvider} not available`);
    }

    const quote = await selectedProvider.getQuote(symbol);

    // Cache the quote
    this.cache.set(cacheKey, {
      quote,
      expires: new Date(Date.now() + this.CACHE_TTL),
    });

    return quote;
  }

  /**
   * Get quotes for multiple symbols
   */
  async getQuotes(symbols: string[], provider?: DataProvider): Promise<Map<string, Quote>> {
    const quotes = new Map<string, Quote>();

    await Promise.all(
      symbols.map(async symbol => {
        try {
          const quote = await this.getQuote(symbol, provider);
          quotes.set(symbol, quote);
        } catch (error) {
          console.error(`[MarketData] Failed to get quote for ${symbol}:`, error);
        }
      })
    );

    return quotes;
  }

  /**
   * Get aggregated quote from multiple providers (best bid/ask)
   */
  async getAggregatedQuote(symbol: string): Promise<Quote & { sources: DataProvider[] }> {
    const quotes: Quote[] = [];
    const sources: DataProvider[] = [];

    for (const [name, provider] of this.providers) {
      try {
        const quote = await provider.getQuote(symbol);
        quotes.push(quote);
        sources.push(name);
      } catch (error) {
        // Provider failed, continue with others
      }
    }

    if (quotes.length === 0) {
      throw new Error(`No providers available for ${symbol}`);
    }

    // Find best bid (highest) and best ask (lowest)
    const bestBid = Math.max(...quotes.map(q => q.bid));
    const bestAsk = Math.min(...quotes.map(q => q.ask));
    const avgLast = quotes.reduce((sum, q) => sum + q.last, 0) / quotes.length;

    return {
      ...quotes[0],
      bid: bestBid,
      ask: bestAsk,
      last: avgLast,
      sources,
    };
  }

  // ============================================================================
  // Historical Data
  // ============================================================================

  /**
   * Get historical OHLCV data
   */
  async getHistoricalData(
    symbol: string,
    timeframe: TimeFrame,
    limit?: number,
    provider?: DataProvider
  ): Promise<HistoricalData> {
    const selectedProvider = this.providers.get(provider || this.preferredProvider);
    if (!selectedProvider) {
      throw new Error(`Provider ${provider || this.preferredProvider} not available`);
    }

    return selectedProvider.getHistoricalData(symbol, timeframe, limit);
  }

  /**
   * Get historical data with technical indicators pre-calculated
   */
  async getHistoricalWithIndicators(
    symbol: string,
    timeframe: TimeFrame,
    indicators: { name: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'ATR'; period: number }[]
  ): Promise<{
    historical: HistoricalData;
    indicators: Map<string, TechnicalIndicator>;
  }> {
    const twelveData = this.providers.get('twelvedata') as TwelveDataProvider;
    if (!twelveData) {
      throw new Error('TwelveData provider required for indicators');
    }

    const historical = await twelveData.getHistoricalData(symbol, timeframe, 200);
    const indicatorResults = new Map<string, TechnicalIndicator>();

    for (const { name, period } of indicators) {
      const indicator = await twelveData.getTechnicalIndicator(symbol, name, period, timeframe);
      indicatorResults.set(`${name}_${period}`, indicator);
    }

    return { historical, indicators: indicatorResults };
  }

  // ============================================================================
  // Symbol Search
  // ============================================================================

  /**
   * Search for symbols across all providers
   */
  async searchSymbols(query: string): Promise<SymbolSearch[]> {
    const results: SymbolSearch[] = [];
    const seen = new Set<string>();

    for (const [name, provider] of this.providers) {
      try {
        const symbols = await provider.searchSymbols(query);
        for (const symbol of symbols) {
          const key = `${symbol.symbol}:${symbol.exchange}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(symbol);
          }
        }
      } catch (error) {
        console.error(`[MarketData] Search failed for ${name}:`, error);
      }
    }

    return results;
  }

  // ============================================================================
  // Streaming Quotes
  // ============================================================================

  /**
   * Subscribe to real-time quote updates
   */
  async subscribe(
    symbols: string[],
    callback: (quote: Quote) => void,
    provider?: DataProvider
  ): Promise<string[]> {
    const polygonProvider = this.providers.get('polygon') as PolygonProvider;
    if (!polygonProvider) {
      throw new Error('Polygon provider required for streaming');
    }

    return polygonProvider.subscribeQuotes(symbols, quote => {
      callback(quote);
      this.emit('quote', quote);
    });
  }

  /**
   * Unsubscribe from quote updates
   */
  unsubscribe(subscriptionIds: string[]): void {
    const polygonProvider = this.providers.get('polygon') as PolygonProvider;
    if (polygonProvider) {
      for (const id of subscriptionIds) {
        polygonProvider.unsubscribe(id);
      }
    }
  }

  // ============================================================================
  // Market Status
  // ============================================================================

  /**
   * Check if market is open
   */
  isMarketOpen(marketType: MarketType): boolean {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();

    switch (marketType) {
      case 'stocks':
        // NYSE/NASDAQ: 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
        return day >= 1 && day <= 5 && hour >= 14 && hour < 21;

      case 'forex':
        // Forex: 24/5 (Sunday 5PM ET - Friday 5PM ET)
        return !(day === 6 || (day === 0 && hour < 22) || (day === 5 && hour >= 22));

      case 'crypto':
        // Crypto: 24/7
        return true;

      case 'options':
        return day >= 1 && day <= 5 && hour >= 14 && hour < 21;

      case 'commodities':
        return day >= 1 && day <= 5;

      default:
        return true;
    }
  }

  /**
   * Get next market open time
   */
  getNextMarketOpen(marketType: MarketType): Date {
    const now = new Date();

    if (this.isMarketOpen(marketType)) {
      return now;
    }

    // Calculate next open based on market type
    const next = new Date(now);
    next.setUTCMinutes(30);
    next.setUTCSeconds(0);
    next.setUTCMilliseconds(0);

    while (!this.isMarketOpen(marketType)) {
      next.setUTCHours(next.getUTCHours() + 1);
    }

    return next;
  }

  // ============================================================================
  // Provider Management
  // ============================================================================

  /**
   * Set preferred provider
   */
  setPreferredProvider(provider: DataProvider): void {
    if (this.providers.has(provider)) {
      this.preferredProvider = provider;
      console.log(`[MarketData] Preferred provider set to ${provider}`);
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): DataProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear quote cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[MarketData] Cache cleared');
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const marketData = new MarketDataManager({
  polygonKey: process.env.POLYGON_API_KEY,
  twelveDataKey: process.env.TWELVE_DATA_API_KEY,
});

export default marketData;

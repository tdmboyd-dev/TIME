/**
 * TIME Real Market Data Integration
 *
 * ACTUAL API integrations - No mock data
 * Connects to real market data providers:
 * - Alpha Vantage (Free tier: 25 calls/day)
 * - Finnhub (Free tier: 60 calls/min)
 * - Polygon.io (Paid: Real-time data)
 * - Yahoo Finance (Free: Backup)
 * - Binance (Free: Crypto)
 * - CoinGecko (Free: Crypto prices)
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface RealQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  timestamp: Date;
  source: string;
}

export interface RealHistoricalBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  currency: string;
}

export interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: Date;
}

// ============================================================================
// Alpha Vantage Integration (FREE - 25 calls/day, 5 calls/min)
// ============================================================================

export class AlphaVantageAPI {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private callCount = 0;
  private lastCallTime = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async rateLimit(): Promise<void> {
    // 5 calls per minute limit
    const now = Date.now();
    if (now - this.lastCallTime < 12000) { // 12 seconds between calls
      await new Promise(resolve => setTimeout(resolve, 12000 - (now - this.lastCallTime)));
    }
    this.lastCallTime = Date.now();
    this.callCount++;
  }

  async getQuote(symbol: string): Promise<RealQuote | null> {
    if (!this.apiKey) {
      console.log('[AlphaVantage] No API key - get free key at: https://www.alphavantage.co/support/#api-key');
      return null;
    }

    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
      );
      const data = await response.json();

      if (data['Global Quote']) {
        const quote = data['Global Quote'];
        return {
          symbol: quote['01. symbol'],
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
          open: parseFloat(quote['02. open']),
          high: parseFloat(quote['03. high']),
          low: parseFloat(quote['04. low']),
          previousClose: parseFloat(quote['08. previous close']),
          volume: parseInt(quote['06. volume']),
          timestamp: new Date(),
          source: 'alphavantage',
        };
      }

      if (data['Note']) {
        console.log('[AlphaVantage] Rate limit hit:', data['Note']);
      }

      return null;
    } catch (error) {
      console.error('[AlphaVantage] Error:', error);
      return null;
    }
  }

  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    if (!this.apiKey) return [];

    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${this.apiKey}`
      );
      const data = await response.json();

      if (data.bestMatches) {
        return data.bestMatches.map((match: any) => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
          type: match['3. type'],
          exchange: match['4. region'],
          currency: match['8. currency'],
        }));
      }

      return [];
    } catch (error) {
      console.error('[AlphaVantage] Search error:', error);
      return [];
    }
  }

  async getHistoricalData(symbol: string, interval: string = 'daily'): Promise<RealHistoricalBar[]> {
    if (!this.apiKey) return [];

    await this.rateLimit();

    try {
      const functionName = interval === 'intraday' ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY';
      let url = `${this.baseUrl}?function=${functionName}&symbol=${symbol}&apikey=${this.apiKey}`;

      if (interval === 'intraday') {
        url += '&interval=5min';
      }

      const response = await fetch(url);
      const data = await response.json();

      const seriesKey = interval === 'intraday' ? 'Time Series (5min)' : 'Time Series (Daily)';
      const series = data[seriesKey];

      if (!series) return [];

      return Object.entries(series).slice(0, 100).map(([date, values]: [string, any]) => ({
        timestamp: new Date(date),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume']),
      })).reverse();
    } catch (error) {
      console.error('[AlphaVantage] Historical error:', error);
      return [];
    }
  }
}

// ============================================================================
// Finnhub Integration (FREE - 60 calls/min)
// ============================================================================

export class FinnhubAPI {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getQuote(symbol: string): Promise<RealQuote | null> {
    if (!this.apiKey) {
      console.log('[Finnhub] No API key - get free key at: https://finnhub.io/register');
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`
      );
      const data = await response.json();

      if (data && data.c) {
        return {
          symbol,
          price: data.c, // Current price
          change: data.d, // Change
          changePercent: data.dp, // Change percent
          open: data.o, // Open
          high: data.h, // High
          low: data.l, // Low
          previousClose: data.pc, // Previous close
          volume: 0, // Not provided in quote endpoint
          timestamp: new Date(data.t * 1000),
          source: 'finnhub',
        };
      }

      return null;
    } catch (error) {
      console.error('[Finnhub] Error:', error);
      return null;
    }
  }

  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&token=${this.apiKey}`
      );
      const data = await response.json();

      if (data.result) {
        return data.result.slice(0, 20).map((item: any) => ({
          symbol: item.symbol,
          name: item.description,
          type: item.type,
          exchange: item.displaySymbol,
          currency: 'USD',
        }));
      }

      return [];
    } catch (error) {
      console.error('[Finnhub] Search error:', error);
      return [];
    }
  }

  async getCompanyProfile(symbol: string): Promise<any | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/stock/profile2?symbol=${symbol}&token=${this.apiKey}`
      );
      return response.json();
    } catch (error) {
      console.error('[Finnhub] Profile error:', error);
      return null;
    }
  }

  async getMarketNews(category: string = 'general'): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/news?category=${category}&token=${this.apiKey}`
      );
      return response.json();
    } catch (error) {
      console.error('[Finnhub] News error:', error);
      return [];
    }
  }
}

// ============================================================================
// Polygon.io Integration (Paid - Real-time data)
// ============================================================================

export class PolygonAPI {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getQuote(symbol: string): Promise<RealQuote | null> {
    if (!this.apiKey) {
      console.log('[Polygon] No API key - subscribe at: https://polygon.io/pricing');
      return null;
    }

    try {
      // Get previous day's data
      const response = await fetch(
        `${this.baseUrl}/v2/aggs/ticker/${symbol}/prev?apiKey=${this.apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results[0]) {
        const result = data.results[0];
        return {
          symbol: result.T || symbol,
          price: result.c,
          change: result.c - result.o,
          changePercent: ((result.c - result.o) / result.o) * 100,
          open: result.o,
          high: result.h,
          low: result.l,
          previousClose: result.o,
          volume: result.v,
          timestamp: new Date(result.t),
          source: 'polygon',
        };
      }

      return null;
    } catch (error) {
      console.error('[Polygon] Error:', error);
      return null;
    }
  }

  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=20&apiKey=${this.apiKey}`
      );
      const data = await response.json();

      if (data.results) {
        return data.results.map((item: any) => ({
          symbol: item.ticker,
          name: item.name,
          type: item.type,
          exchange: item.primary_exchange,
          currency: item.currency_name || 'USD',
        }));
      }

      return [];
    } catch (error) {
      console.error('[Polygon] Search error:', error);
      return [];
    }
  }

  async getHistoricalData(
    symbol: string,
    timeframe: string = 'day',
    from: string,
    to: string
  ): Promise<RealHistoricalBar[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/1/${timeframe}/${from}/${to}?apiKey=${this.apiKey}`
      );
      const data = await response.json();

      if (data.results) {
        return data.results.map((bar: any) => ({
          timestamp: new Date(bar.t),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
        }));
      }

      return [];
    } catch (error) {
      console.error('[Polygon] Historical error:', error);
      return [];
    }
  }

  async getSnapshot(symbol: string): Promise<any | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${this.apiKey}`
      );
      return response.json();
    } catch (error) {
      console.error('[Polygon] Snapshot error:', error);
      return null;
    }
  }
}

// ============================================================================
// CoinGecko Integration (FREE - Crypto data)
// ============================================================================

export class CoinGeckoAPI {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  async getCryptoQuote(id: string): Promise<CryptoQuote | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`
      );
      const data = await response.json();

      if (data.market_data) {
        return {
          symbol: data.symbol.toUpperCase(),
          name: data.name,
          price: data.market_data.current_price.usd,
          change24h: data.market_data.price_change_24h,
          changePercent24h: data.market_data.price_change_percentage_24h,
          high24h: data.market_data.high_24h.usd,
          low24h: data.market_data.low_24h.usd,
          volume24h: data.market_data.total_volume.usd,
          marketCap: data.market_data.market_cap.usd,
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('[CoinGecko] Error:', error);
      return null;
    }
  }

  async searchCrypto(query: string): Promise<SymbolSearchResult[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (data.coins) {
        return data.coins.slice(0, 20).map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          type: 'crypto',
          exchange: 'CoinGecko',
          currency: 'USD',
        }));
      }

      return [];
    } catch (error) {
      console.error('[CoinGecko] Search error:', error);
      return [];
    }
  }

  async getTopCryptos(limit: number = 100): Promise<CryptoQuote[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
      );
      const data = await response.json();

      return data.map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_24h,
        changePercent24h: coin.price_change_percentage_24h,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        volume24h: coin.total_volume,
        marketCap: coin.market_cap,
        timestamp: new Date(),
      }));
    } catch (error) {
      console.error('[CoinGecko] Top cryptos error:', error);
      return [];
    }
  }
}

// ============================================================================
// Binance Integration (FREE - Crypto trading)
// ============================================================================

export class BinanceAPI {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.binance.com';

  constructor(apiKey: string = '', apiSecret: string = '') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async getPrice(symbol: string): Promise<number | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v3/ticker/price?symbol=${symbol.replace('/', '')}`
      );
      const data = await response.json();
      return data.price ? parseFloat(data.price) : null;
    } catch (error) {
      console.error('[Binance] Price error:', error);
      return null;
    }
  }

  async get24hTicker(symbol: string): Promise<CryptoQuote | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v3/ticker/24hr?symbol=${symbol.replace('/', '')}`
      );
      const data = await response.json();

      if (data.symbol) {
        return {
          symbol: symbol,
          name: symbol,
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChange),
          changePercent24h: parseFloat(data.priceChangePercent),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          volume24h: parseFloat(data.quoteVolume),
          marketCap: 0,
          timestamp: new Date(data.closeTime),
        };
      }

      return null;
    } catch (error) {
      console.error('[Binance] 24h ticker error:', error);
      return null;
    }
  }

  async getKlines(
    symbol: string,
    interval: string = '1d',
    limit: number = 100
  ): Promise<RealHistoricalBar[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v3/klines?symbol=${symbol.replace('/', '')}&interval=${interval}&limit=${limit}`
      );
      const data = await response.json();

      return data.map((kline: any[]) => ({
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      console.error('[Binance] Klines error:', error);
      return [];
    }
  }

  async getAllSymbols(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v3/exchangeInfo`);
      const data = await response.json();
      return data.symbols
        .filter((s: any) => s.status === 'TRADING')
        .map((s: any) => s.symbol);
    } catch (error) {
      console.error('[Binance] Exchange info error:', error);
      return [];
    }
  }
}

// ============================================================================
// Unified Market Data Manager
// ============================================================================

export class RealMarketDataManager extends EventEmitter {
  private alphaVantage: AlphaVantageAPI;
  private finnhub: FinnhubAPI;
  private polygon: PolygonAPI;
  private coinGecko: CoinGeckoAPI;
  private binance: BinanceAPI;

  private cache: Map<string, { data: any; expires: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(config: {
    alphaVantageKey?: string;
    finnhubKey?: string;
    polygonKey?: string;
    binanceKey?: string;
    binanceSecret?: string;
  }) {
    super();

    this.alphaVantage = new AlphaVantageAPI(config.alphaVantageKey || '');
    this.finnhub = new FinnhubAPI(config.finnhubKey || '');
    this.polygon = new PolygonAPI(config.polygonKey || '');
    this.coinGecko = new CoinGeckoAPI();
    this.binance = new BinanceAPI(config.binanceKey, config.binanceSecret);

    console.log('[RealMarketData] Initialized with providers:', {
      alphaVantage: !!config.alphaVantageKey,
      finnhub: !!config.finnhubKey,
      polygon: !!config.polygonKey,
      coinGecko: true, // Always available (no key needed)
      binance: !!config.binanceKey || true, // Public endpoints available
    });
  }

  /**
   * Get stock quote with fallback through multiple providers
   */
  async getStockQuote(symbol: string): Promise<RealQuote | null> {
    const cacheKey = `stock:${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Try providers in order of preference
    let quote: RealQuote | null = null;

    // 1. Try Polygon first (best real-time data)
    quote = await this.polygon.getQuote(symbol);
    if (quote) {
      this.setCache(cacheKey, quote);
      return quote;
    }

    // 2. Try Finnhub
    quote = await this.finnhub.getQuote(symbol);
    if (quote) {
      this.setCache(cacheKey, quote);
      return quote;
    }

    // 3. Fall back to Alpha Vantage
    quote = await this.alphaVantage.getQuote(symbol);
    if (quote) {
      this.setCache(cacheKey, quote);
      return quote;
    }

    return null;
  }

  /**
   * Get crypto quote
   */
  async getCryptoQuote(symbol: string): Promise<CryptoQuote | null> {
    const cacheKey = `crypto:${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Map common symbols to CoinGecko IDs
    const coinGeckoIds: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'XRP': 'ripple',
      'SOL': 'solana',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'DOT': 'polkadot',
      'AVAX': 'avalanche-2',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'LTC': 'litecoin',
    };

    // Try Binance first for trading pairs
    if (symbol.includes('/') || symbol.includes('USDT')) {
      const binanceSymbol = symbol.replace('/', '').replace('USD', 'USDT');
      const quote = await this.binance.get24hTicker(binanceSymbol);
      if (quote) {
        this.setCache(cacheKey, quote);
        return quote;
      }
    }

    // Try CoinGecko
    const baseSymbol = symbol.replace('/USD', '').replace('USDT', '');
    const coinGeckoId = coinGeckoIds[baseSymbol] || baseSymbol.toLowerCase();
    const quote = await this.coinGecko.getCryptoQuote(coinGeckoId);
    if (quote) {
      this.setCache(cacheKey, quote);
      return quote;
    }

    return null;
  }

  /**
   * Search across all asset types
   */
  async searchAll(query: string): Promise<SymbolSearchResult[]> {
    const results: SymbolSearchResult[] = [];
    const seen = new Set<string>();

    // Parallel search across providers
    const [stockResults, cryptoResults] = await Promise.all([
      this.searchStocks(query),
      this.searchCrypto(query),
    ]);

    // Deduplicate and merge
    for (const result of [...stockResults, ...cryptoResults]) {
      const key = `${result.symbol}:${result.exchange}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Search stocks
   */
  async searchStocks(query: string): Promise<SymbolSearchResult[]> {
    // Try providers in parallel
    const [finnhubResults, alphaVantageResults] = await Promise.all([
      this.finnhub.searchSymbols(query),
      this.alphaVantage.searchSymbols(query),
    ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const results: SymbolSearchResult[] = [];

    for (const result of [...finnhubResults, ...alphaVantageResults]) {
      if (!seen.has(result.symbol)) {
        seen.add(result.symbol);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Search crypto
   */
  async searchCrypto(query: string): Promise<SymbolSearchResult[]> {
    return this.coinGecko.searchCrypto(query);
  }

  /**
   * Get top cryptos
   */
  async getTopCryptos(limit: number = 100): Promise<CryptoQuote[]> {
    return this.coinGecko.getTopCryptos(limit);
  }

  /**
   * Get historical data
   */
  async getHistoricalData(
    symbol: string,
    type: 'stock' | 'crypto',
    interval: string = 'day',
    limit: number = 100
  ): Promise<RealHistoricalBar[]> {
    if (type === 'crypto') {
      return this.binance.getKlines(symbol, interval, limit);
    }

    // For stocks, use Alpha Vantage
    return this.alphaVantage.getHistoricalData(symbol, interval === 'day' ? 'daily' : 'intraday');
  }

  /**
   * Get multiple quotes at once
   */
  async getBatchQuotes(symbols: string[]): Promise<Map<string, RealQuote | CryptoQuote>> {
    const results = new Map<string, RealQuote | CryptoQuote>();

    await Promise.all(
      symbols.map(async (symbol) => {
        const isCrypto = this.isCryptoSymbol(symbol);
        const quote = isCrypto
          ? await this.getCryptoQuote(symbol)
          : await this.getStockQuote(symbol);

        if (quote) {
          results.set(symbol, quote);
        }
      })
    );

    return results;
  }

  /**
   * Get market news
   */
  async getMarketNews(category: string = 'general'): Promise<any[]> {
    return this.finnhub.getMarketNews(category);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private isCryptoSymbol(symbol: string): boolean {
    const cryptoSymbols = ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI', 'LTC'];
    const upper = symbol.toUpperCase();
    return cryptoSymbols.some(c => upper.includes(c)) || upper.includes('USDT');
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.CACHE_TTL,
    });
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Record<string, boolean> {
    return {
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      finnhub: !!process.env.FINNHUB_API_KEY,
      polygon: !!process.env.POLYGON_API_KEY,
      coinGecko: true,
      binance: true,
    };
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const realMarketData = new RealMarketDataManager({
  alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY,
  finnhubKey: process.env.FINNHUB_API_KEY,
  polygonKey: process.env.POLYGON_API_KEY,
  binanceKey: process.env.BINANCE_API_KEY,
  binanceSecret: process.env.BINANCE_SECRET,
});

export default realMarketData;

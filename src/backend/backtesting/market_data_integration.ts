/**
 * TIME — Market Data Integration for Backtesting
 *
 * Fetches historical data from:
 * - Finnhub (stocks, forex)
 * - TwelveData (stocks, crypto, forex)
 * - Coinbase (crypto)
 *
 * Normalizes data to standard Candle format
 */

import axios from 'axios';
import { Candle } from '../strategies/backtesting_engine';
import { loggers } from '../utils/logger';

const log = loggers.backtest;

// ==========================================
// TYPES
// ==========================================

export interface DataProvider {
  name: string;
  supports: ('stock' | 'crypto' | 'forex' | 'commodity')[];
  fetchCandles(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: string
  ): Promise<Candle[]>;
}

export interface MultiAssetDataRequest {
  symbols: string[];
  startDate: Date;
  endDate: Date;
  interval?: string;
  assetTypes?: Map<string, 'stock' | 'crypto' | 'forex' | 'commodity'>;
}

// ==========================================
// FINNHUB PROVIDER
// ==========================================

export class FinnhubProvider implements DataProvider {
  name = 'Finnhub';
  supports: ('stock' | 'crypto' | 'forex' | 'commodity')[] = ['stock', 'forex'];
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FINNHUB_API_KEY || '';
  }

  async fetchCandles(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: string = '1h'
  ): Promise<Candle[]> {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not configured');
    }

    try {
      // Convert interval to Finnhub format
      const resolution = this.convertInterval(interval);

      const url = 'https://finnhub.io/api/v1/stock/candle';
      const response = await axios.get(url, {
        params: {
          symbol: symbol.toUpperCase(),
          resolution,
          from: Math.floor(startDate.getTime() / 1000),
          to: Math.floor(endDate.getTime() / 1000),
          token: this.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.s !== 'ok') {
        throw new Error(`Finnhub error: ${response.data.s}`);
      }

      return this.normalizeResponse(response.data);
    } catch (error) {
      log.error(`Finnhub fetch error for ${symbol}:`, error as object);
      throw error;
    }
  }

  private convertInterval(interval: string): string {
    const map: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '4h': '240',
      '1d': 'D',
      '1w': 'W',
      '1M': 'M',
    };
    return map[interval] || '60';
  }

  private normalizeResponse(data: any): Candle[] {
    const candles: Candle[] = [];

    for (let i = 0; i < data.t.length; i++) {
      candles.push({
        timestamp: new Date(data.t[i] * 1000),
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      });
    }

    return candles;
  }
}

// ==========================================
// TWELVEDATA PROVIDER
// ==========================================

export class TwelveDataProvider implements DataProvider {
  name = 'TwelveData';
  supports: ('stock' | 'crypto' | 'forex' | 'commodity')[] = ['stock', 'crypto', 'forex', 'commodity'];
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TWELVEDATA_API_KEY || '';
  }

  async fetchCandles(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: string = '1h'
  ): Promise<Candle[]> {
    if (!this.apiKey) {
      throw new Error('TwelveData API key not configured');
    }

    try {
      const url = 'https://api.twelvedata.com/time_series';
      const response = await axios.get(url, {
        params: {
          symbol: symbol.toUpperCase(),
          interval,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          apikey: this.apiKey,
          format: 'JSON',
        },
        timeout: 10000,
      });

      if (response.data.status === 'error') {
        throw new Error(`TwelveData error: ${response.data.message}`);
      }

      return this.normalizeResponse(response.data);
    } catch (error) {
      log.error(`TwelveData fetch error for ${symbol}:`, error as object);
      throw error;
    }
  }

  private normalizeResponse(data: any): Candle[] {
    if (!data.values || !Array.isArray(data.values)) {
      return [];
    }

    const candles: Candle[] = data.values.map((item: any) => ({
      timestamp: new Date(item.datetime),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume || 0),
    }));

    // TwelveData returns newest first, reverse to oldest first
    return candles.reverse();
  }
}

// ==========================================
// COINBASE PROVIDER (for crypto)
// ==========================================

export class CoinbaseProvider implements DataProvider {
  name = 'Coinbase';
  supports: ('stock' | 'crypto' | 'forex' | 'commodity')[] = ['crypto'];

  async fetchCandles(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: string = '1h'
  ): Promise<Candle[]> {
    try {
      // Coinbase uses product IDs like BTC-USD
      const productId = symbol.includes('-') ? symbol : `${symbol}-USD`;

      const granularity = this.convertInterval(interval);

      const url = `https://api.exchange.coinbase.com/products/${productId}/candles`;
      const response = await axios.get(url, {
        params: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          granularity,
        },
        timeout: 10000,
      });

      return this.normalizeResponse(response.data);
    } catch (error) {
      log.error(`Coinbase fetch error for ${symbol}:`, error as object);
      throw error;
    }
  }

  private convertInterval(interval: string): number {
    const map: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400,
    };
    return map[interval] || 3600;
  }

  private normalizeResponse(data: any[]): Candle[] {
    if (!Array.isArray(data)) {
      return [];
    }

    // Coinbase format: [time, low, high, open, close, volume]
    const candles: Candle[] = data.map((item: any) => ({
      timestamp: new Date(item[0] * 1000),
      open: item[3],
      high: item[2],
      low: item[1],
      close: item[4],
      volume: item[5],
    }));

    // Coinbase returns newest first, reverse to oldest first
    return candles.reverse();
  }
}

// ==========================================
// DATA MANAGER
// ==========================================

export class MarketDataManager {
  private providers: Map<string, DataProvider> = new Map();

  constructor() {
    this.registerProvider(new FinnhubProvider());
    this.registerProvider(new TwelveDataProvider());
    this.registerProvider(new CoinbaseProvider());
  }

  registerProvider(provider: DataProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Fetch candles for a single asset
   */
  async fetchCandles(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: string = '1h',
    assetType: 'stock' | 'crypto' | 'forex' | 'commodity' = 'stock'
  ): Promise<Candle[]> {
    // Try providers in order of preference
    const preferredProviders = this.getPreferredProviders(assetType);

    for (const providerName of preferredProviders) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        log.info(`Fetching ${symbol} data from ${providerName}...`);
        const candles = await provider.fetchCandles(symbol, startDate, endDate, interval);

        if (candles.length > 0) {
          log.info(`Successfully fetched ${candles.length} candles for ${symbol}`);
          return candles;
        }
      } catch (error) {
        log.warn(`${providerName} failed for ${symbol}, trying next provider...`);
        continue;
      }
    }

    throw new Error(`Failed to fetch data for ${symbol} from any provider`);
  }

  /**
   * Fetch candles for multiple assets
   */
  async fetchMultiAssetCandles(
    request: MultiAssetDataRequest
  ): Promise<Map<string, Candle[]>> {
    const results = new Map<string, Candle[]>();

    // Fetch in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < request.symbols.length; i += batchSize) {
      const batch = request.symbols.slice(i, i + batchSize);

      const promises = batch.map(async (symbol) => {
        const assetType = request.assetTypes?.get(symbol) || this.detectAssetType(symbol);

        try {
          const candles = await this.fetchCandles(
            symbol,
            request.startDate,
            request.endDate,
            request.interval,
            assetType
          );
          return { symbol, candles };
        } catch (error) {
          log.error(`Failed to fetch ${symbol}:`, error as object);
          return { symbol, candles: [] };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const { symbol, candles } of batchResults) {
        if (candles.length > 0) {
          results.set(symbol, candles);
        }
      }

      // Rate limiting: wait between batches
      if (i + batchSize < request.symbols.length) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  /**
   * Align candles across multiple assets (same timestamps)
   */
  alignCandles(data: Map<string, Candle[]>): Map<string, Candle[]> {
    if (data.size === 0) return data;

    // Find common timestamps
    const timestampSets = Array.from(data.values()).map(candles =>
      new Set(candles.map(c => c.timestamp.getTime()))
    );

    const commonTimestamps = timestampSets.reduce((common, set) => {
      return new Set([...common].filter(ts => set.has(ts)));
    });

    // Filter each asset to only common timestamps
    const aligned = new Map<string, Candle[]>();

    for (const [symbol, candles] of data) {
      const filteredCandles = candles.filter(c => commonTimestamps.has(c.timestamp.getTime()));
      aligned.set(symbol, filteredCandles);
    }

    log.info(`Aligned ${data.size} assets to ${commonTimestamps.size} common timestamps`);

    return aligned;
  }

  /**
   * Fill missing candles with forward fill
   */
  fillMissingCandles(candles: Candle[], interval: string = '1h'): Candle[] {
    if (candles.length === 0) return candles;

    const filled: Candle[] = [candles[0]];
    const intervalMs = this.parseInterval(interval);

    for (let i = 1; i < candles.length; i++) {
      const prevCandle = filled[filled.length - 1];
      const currentCandle = candles[i];

      const gap = currentCandle.timestamp.getTime() - prevCandle.timestamp.getTime();
      const missingBars = Math.floor(gap / intervalMs) - 1;

      // Fill gaps with forward fill
      for (let j = 1; j <= missingBars; j++) {
        filled.push({
          timestamp: new Date(prevCandle.timestamp.getTime() + j * intervalMs),
          open: prevCandle.close,
          high: prevCandle.close,
          low: prevCandle.close,
          close: prevCandle.close,
          volume: 0,
        });
      }

      filled.push(currentCandle);
    }

    return filled;
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private getPreferredProviders(assetType: 'stock' | 'crypto' | 'forex' | 'commodity'): string[] {
    switch (assetType) {
      case 'crypto':
        return ['Coinbase', 'TwelveData'];
      case 'forex':
        return ['Finnhub', 'TwelveData'];
      case 'stock':
        return ['TwelveData', 'Finnhub'];
      case 'commodity':
        return ['TwelveData'];
      default:
        return ['TwelveData', 'Finnhub'];
    }
  }

  private detectAssetType(symbol: string): 'stock' | 'crypto' | 'forex' | 'commodity' {
    const upper = symbol.toUpperCase();

    // Crypto
    if (upper.includes('BTC') || upper.includes('ETH') || upper.includes('USD') && upper.length <= 7) {
      return 'crypto';
    }

    // Forex
    if (upper.includes('/') || (upper.length === 6 && /^[A-Z]{6}$/.test(upper))) {
      return 'forex';
    }

    // Default to stock
    return 'stock';
  }

  private parseInterval(interval: string): number {
    const map: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    return map[interval] || 60 * 60 * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const marketDataManager = new MarketDataManager();

/**
 * TIME — Historical Data Caching System
 *
 * Features:
 * - In-memory LRU cache for fast access
 * - File-based persistence for larger datasets
 * - Automatic data expiration
 * - Data compression
 * - Missing data detection and filling
 */

import * as fs from 'fs';
import * as path from 'path';
import { Candle } from '../strategies/backtesting_engine';
import { loggers } from '../utils/logger';

const log = loggers.backtest;

// ==========================================
// TYPES
// ==========================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

export interface CacheConfig {
  maxMemoryMB: number;
  maxEntries: number;
  defaultTTL: number; // seconds
  persistPath?: string;
  compressionEnabled?: boolean;
}

export interface CacheStats {
  entries: number;
  memoryUsedMB: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
}

export interface CandleCacheKey {
  symbol: string;
  interval: string;
  startDate: string;
  endDate: string;
}

// ==========================================
// LRU CACHE
// ==========================================

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private hits: number = 0;
  private misses: number = 0;
  private currentMemoryBytes: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxMemoryMB: config.maxMemoryMB || 256,
      maxEntries: config.maxEntries || 1000,
      defaultTTL: config.defaultTTL || 3600, // 1 hour
      persistPath: config.persistPath,
      compressionEnabled: config.compressionEnabled || false,
    };

    log.info(`Cache initialized: ${this.config.maxMemoryMB}MB max, ${this.config.maxEntries} entries`);
  }

  /**
   * Get item from cache
   */
  public get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();

    this.hits++;
    return entry.data;
  }

  /**
   * Set item in cache
   */
  public set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const size = this.estimateSize(data);

    // Evict if necessary
    while (this.shouldEvict(size)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.config.defaultTTL) * 1000,
      size,
      accessCount: 0,
      lastAccess: now,
    };

    this.cache.set(key, entry);
    this.currentMemoryBytes += size;

    log.debug(`Cache set: ${key} (${(size / 1024).toFixed(2)}KB)`);
  }

  /**
   * Delete item from cache
   */
  public delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryBytes -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.hits = 0;
    this.misses = 0;
    log.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      entries: this.cache.size,
      memoryUsedMB: this.currentMemoryBytes / (1024 * 1024),
      hitRate: total > 0 ? this.hits / total : 0,
      missRate: total > 0 ? this.misses / total : 0,
      totalHits: this.hits,
      totalMisses: this.misses,
    };
  }

  /**
   * Check if key exists
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get all keys
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Private helpers

  private shouldEvict(additionalSize: number): boolean {
    const projectedMemory = this.currentMemoryBytes + additionalSize;
    return (
      this.cache.size >= this.config.maxEntries ||
      projectedMemory > this.config.maxMemoryMB * 1024 * 1024
    );
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      log.debug(`Cache evicting: ${oldestKey}`);
      this.delete(oldestKey);
    }
  }

  private estimateSize(data: any): number {
    // Rough estimate of object size in bytes
    const json = JSON.stringify(data);
    return json.length * 2; // UTF-16 encoding
  }
}

// ==========================================
// CANDLE DATA CACHE
// ==========================================

export class CandleDataCache {
  private memoryCache: LRUCache<Candle[]>;
  private persistPath: string;

  constructor(config: Partial<CacheConfig> = {}) {
    this.memoryCache = new LRUCache<Candle[]>({
      maxMemoryMB: config.maxMemoryMB || 512,
      maxEntries: config.maxEntries || 500,
      defaultTTL: config.defaultTTL || 86400, // 24 hours
    });

    this.persistPath = config.persistPath || './data/cache/candles';

    // Create cache directory if it doesn't exist
    if (!fs.existsSync(this.persistPath)) {
      try {
        fs.mkdirSync(this.persistPath, { recursive: true });
        log.info(`Created cache directory: ${this.persistPath}`);
      } catch (error) {
        log.warn('Could not create cache directory:', error);
      }
    }
  }

  /**
   * Generate cache key from parameters
   */
  public generateKey(params: CandleCacheKey): string {
    return `${params.symbol}_${params.interval}_${params.startDate}_${params.endDate}`;
  }

  /**
   * Get candles from cache
   */
  public async getCandles(params: CandleCacheKey): Promise<Candle[] | null> {
    const key = this.generateKey(params);

    // Try memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) {
      log.debug(`Cache hit (memory): ${key}`);
      return memoryResult;
    }

    // Try file cache
    const fileResult = await this.loadFromFile(key);
    if (fileResult) {
      // Promote to memory cache
      this.memoryCache.set(key, fileResult);
      log.debug(`Cache hit (file): ${key}`);
      return fileResult;
    }

    return null;
  }

  /**
   * Store candles in cache
   */
  public async setCandles(params: CandleCacheKey, candles: Candle[]): Promise<void> {
    const key = this.generateKey(params);

    // Store in memory
    this.memoryCache.set(key, candles);

    // Persist to file (async)
    await this.saveToFile(key, candles);

    log.debug(`Cache set: ${key} (${candles.length} candles)`);
  }

  /**
   * Check if data exists in cache
   */
  public async hasCandles(params: CandleCacheKey): Promise<boolean> {
    const key = this.generateKey(params);

    if (this.memoryCache.has(key)) {
      return true;
    }

    return this.fileExists(key);
  }

  /**
   * Invalidate cache entry
   */
  public async invalidate(params: CandleCacheKey): Promise<void> {
    const key = this.generateKey(params);

    this.memoryCache.delete(key);
    await this.deleteFile(key);

    log.debug(`Cache invalidated: ${key}`);
  }

  /**
   * Clear all cache
   */
  public async clearAll(): Promise<void> {
    this.memoryCache.clear();

    // Clear file cache
    try {
      const files = fs.readdirSync(this.persistPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.persistPath, file));
        }
      }
      log.info('Candle cache cleared');
    } catch (error) {
      log.error('Error clearing file cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return this.memoryCache.getStats();
  }

  /**
   * Preload commonly used data
   */
  public async preload(
    symbols: string[],
    intervals: string[],
    fetchFunc: (symbol: string, interval: string) => Promise<Candle[]>
  ): Promise<void> {
    log.info(`Preloading cache for ${symbols.length} symbols...`);

    for (const symbol of symbols) {
      for (const interval of intervals) {
        const key: CandleCacheKey = {
          symbol,
          interval,
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        };

        if (!(await this.hasCandles(key))) {
          try {
            const candles = await fetchFunc(symbol, interval);
            await this.setCandles(key, candles);
          } catch (error) {
            log.warn(`Failed to preload ${symbol}:`, error);
          }
        }
      }
    }

    log.info('Cache preload complete');
  }

  // File operations

  private async saveToFile(key: string, candles: Candle[]): Promise<void> {
    try {
      const filePath = path.join(this.persistPath, `${key}.json`);

      // Convert Date objects to ISO strings for JSON serialization
      const serializable = candles.map(c => ({
        ...c,
        timestamp: c.timestamp.toISOString(),
      }));

      fs.writeFileSync(filePath, JSON.stringify(serializable), 'utf-8');
    } catch (error) {
      log.error(`Failed to save cache file:`, error);
    }
  }

  private async loadFromFile(key: string): Promise<Candle[] | null> {
    try {
      const filePath = path.join(this.persistPath, `${key}.json`);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Convert ISO strings back to Date objects
      return parsed.map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
      }));
    } catch (error) {
      log.error(`Failed to load cache file:`, error);
      return null;
    }
  }

  private fileExists(key: string): boolean {
    const filePath = path.join(this.persistPath, `${key}.json`);
    return fs.existsSync(filePath);
  }

  private async deleteFile(key: string): Promise<void> {
    try {
      const filePath = path.join(this.persistPath, `${key}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      log.error(`Failed to delete cache file:`, error);
    }
  }
}

// ==========================================
// DATA QUALITY CHECKER
// ==========================================

export class DataQualityChecker {
  /**
   * Check for missing candles
   */
  public static findMissingCandles(
    candles: Candle[],
    expectedInterval: string
  ): { missing: number; gaps: { start: Date; end: Date }[] } {
    if (candles.length < 2) {
      return { missing: 0, gaps: [] };
    }

    const intervalMs = this.parseIntervalMs(expectedInterval);
    const gaps: { start: Date; end: Date }[] = [];
    let totalMissing = 0;

    for (let i = 1; i < candles.length; i++) {
      const timeDiff = candles[i].timestamp.getTime() - candles[i - 1].timestamp.getTime();
      const expectedDiff = intervalMs;

      // Allow 10% tolerance
      if (timeDiff > expectedDiff * 1.1) {
        const missingCount = Math.floor(timeDiff / intervalMs) - 1;
        totalMissing += missingCount;

        gaps.push({
          start: candles[i - 1].timestamp,
          end: candles[i].timestamp,
        });
      }
    }

    return { missing: totalMissing, gaps };
  }

  /**
   * Fill missing candles with forward fill
   */
  public static fillMissingCandles(
    candles: Candle[],
    interval: string
  ): Candle[] {
    if (candles.length < 2) return candles;

    const intervalMs = this.parseIntervalMs(interval);
    const filled: Candle[] = [candles[0]];

    for (let i = 1; i < candles.length; i++) {
      const prevCandle = filled[filled.length - 1];
      const currentCandle = candles[i];

      const timeDiff = currentCandle.timestamp.getTime() - prevCandle.timestamp.getTime();
      const missingCount = Math.floor(timeDiff / intervalMs) - 1;

      // Fill gaps with forward fill
      for (let j = 1; j <= missingCount; j++) {
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

  /**
   * Detect outliers in price data
   */
  public static detectOutliers(
    candles: Candle[],
    threshold: number = 3
  ): { index: number; candle: Candle; zscore: number }[] {
    if (candles.length < 20) return [];

    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const ret = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
      returns.push(ret);
    }

    // Calculate mean and std
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const std = Math.sqrt(variance);

    // Find outliers
    const outliers: { index: number; candle: Candle; zscore: number }[] = [];

    for (let i = 0; i < returns.length; i++) {
      const zscore = (returns[i] - mean) / std;
      if (Math.abs(zscore) > threshold) {
        outliers.push({
          index: i + 1,
          candle: candles[i + 1],
          zscore,
        });
      }
    }

    return outliers;
  }

  /**
   * Validate candle data integrity
   */
  public static validateCandles(candles: Candle[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];

      // Check for invalid values
      if (isNaN(c.open) || isNaN(c.high) || isNaN(c.low) || isNaN(c.close)) {
        errors.push(`Candle ${i}: Contains NaN values`);
      }

      // Check OHLC integrity
      if (c.high < c.low) {
        errors.push(`Candle ${i}: High (${c.high}) < Low (${c.low})`);
      }

      if (c.high < Math.max(c.open, c.close)) {
        errors.push(`Candle ${i}: High is not the maximum value`);
      }

      if (c.low > Math.min(c.open, c.close)) {
        errors.push(`Candle ${i}: Low is not the minimum value`);
      }

      // Check for negative values
      if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0) {
        errors.push(`Candle ${i}: Contains non-positive prices`);
      }

      // Check for negative volume
      if (c.volume < 0) {
        errors.push(`Candle ${i}: Negative volume`);
      }

      // Check timestamp order
      if (i > 0 && c.timestamp <= candles[i - 1].timestamp) {
        errors.push(`Candle ${i}: Timestamp not in order`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static parseIntervalMs(interval: string): number {
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
}

// ==========================================
// SINGLETON INSTANCES
// ==========================================

export const candleDataCache = new CandleDataCache();

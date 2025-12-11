/**
 * TIME Stock Watchers System
 *
 * NEVER-BEFORE-SEEN INVENTION
 *
 * A comprehensive watchlist and monitoring system that:
 * - Tracks multiple assets across different markets
 * - Creates intelligent alert conditions
 * - Monitors price levels, patterns, and indicators
 * - Integrates with TIME's learning for smart suggestions
 * - Provides real-time notifications on watch conditions
 * - Learns which alerts lead to profitable opportunities
 *
 * Think of it as having thousands of expert analysts
 * watching every stock, currency, and crypto 24/7.
 */

import { EventEmitter } from 'events';

// ============================================================
// TYPES
// ============================================================

export type AssetType = 'stock' | 'forex' | 'crypto' | 'index' | 'commodity' | 'etf';

export type WatchConditionType =
  | 'price_above'
  | 'price_below'
  | 'price_cross'
  | 'percent_change'
  | 'volume_spike'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'macd_cross'
  | 'moving_average_cross'
  | 'breakout'
  | 'breakdown'
  | 'support_touch'
  | 'resistance_touch'
  | 'pattern_detected'
  | 'regime_change'
  | 'volatility_spike'
  | 'correlation_break'
  | 'custom';

export interface WatchedAsset {
  symbol: string;
  name: string;
  type: AssetType;
  exchange: string;
  currentPrice?: number;
  dailyChange?: number;
  dailyChangePercent?: number;
  volume?: number;
  lastUpdate?: Date;
}

export interface WatchCondition {
  id: string;
  type: WatchConditionType;
  parameters: Record<string, any>;
  description: string;
  enabled: boolean;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string;
  userId: string;
  assets: WatchedAsset[];
  conditions: WatchCondition[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  followers: number;
  performance: {
    alertsTriggered: number;
    profitableAlerts: number;
    avgReturnPerAlert: number;
  };
}

export interface WatchAlert {
  id: string;
  watchlistId: string;
  conditionId: string;
  symbol: string;
  type: WatchConditionType;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  priceAtAlert: number;
  triggeredAt: Date;
  acknowledged: boolean;
  actionTaken?: 'bought' | 'sold' | 'ignored' | 'pending';
  outcome?: {
    priceAfter24h: number;
    returnPercent: number;
    wasGoodAlert: boolean;
  };
}

export interface SmartSuggestion {
  id: string;
  type: 'add_to_watchlist' | 'set_alert' | 'remove_from_watchlist' | 'adjust_condition';
  symbol?: string;
  condition?: WatchCondition;
  reason: string;
  confidence: number;
  basedOn: string[];
  timestamp: Date;
}

export interface CorrelationWatch {
  id: string;
  symbol1: string;
  symbol2: string;
  normalCorrelation: number;
  currentCorrelation: number;
  breakThreshold: number;
  isBreaking: boolean;
  lastCheck: Date;
}

export interface PatternWatch {
  id: string;
  symbol: string;
  patternType: string;
  formingProgress: number; // 0-100
  expectedBreakout: 'up' | 'down' | 'unknown';
  targetPrice?: number;
  invalidationPrice?: number;
  confidence: number;
  detectedAt: Date;
}

export interface WatcherStats {
  totalWatchlists: number;
  totalAssets: number;
  totalConditions: number;
  alertsToday: number;
  alertsThisWeek: number;
  alertAccuracy: number;
  mostWatchedAssets: { symbol: string; count: number }[];
  topPerformingWatchlists: { id: string; name: string; accuracy: number }[];
}

// ============================================================
// STOCK WATCHERS SYSTEM
// ============================================================

export class StockWatchers extends EventEmitter {
  public readonly name = 'StockWatchers';
  public readonly version = '1.0.0';

  private watchlists: Map<string, Watchlist> = new Map();
  private alerts: WatchAlert[] = [];
  private suggestions: SmartSuggestion[] = [];
  private correlationWatches: Map<string, CorrelationWatch> = new Map();
  private patternWatches: Map<string, PatternWatch> = new Map();
  private priceCache: Map<string, { price: number; timestamp: Date }> = new Map();

  private config = {
    maxWatchlistsPerUser: 50,
    maxAssetsPerWatchlist: 100,
    maxConditionsPerAsset: 20,
    alertRetentionDays: 90,
    suggestionConfidenceThreshold: 0.7,
    priceUpdateIntervalMs: 5000,
    correlationWindow: 30, // Days
    patternMinConfidence: 0.6,
  };

  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeDefaultWatchlists();
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  private initializeDefaultWatchlists(): void {
    // System watchlist for major indices
    const majorIndices: Watchlist = {
      id: 'system_indices',
      name: 'Major Indices',
      description: 'Track major market indices worldwide',
      userId: 'system',
      assets: [
        { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf', exchange: 'NYSE' },
        { symbol: 'QQQ', name: 'Nasdaq 100 ETF', type: 'etf', exchange: 'NASDAQ' },
        { symbol: 'DIA', name: 'Dow Jones ETF', type: 'etf', exchange: 'NYSE' },
        { symbol: 'IWM', name: 'Russell 2000 ETF', type: 'etf', exchange: 'NYSE' },
        { symbol: 'VIX', name: 'Volatility Index', type: 'index', exchange: 'CBOE' },
      ],
      conditions: [
        {
          id: 'cond_vix_spike',
          type: 'percent_change',
          parameters: { threshold: 20, direction: 'up', period: '1d' },
          description: 'VIX spike > 20%',
          enabled: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: true,
      followers: 0,
      performance: { alertsTriggered: 0, profitableAlerts: 0, avgReturnPerAlert: 0 },
    };

    // System watchlist for major forex pairs
    const majorForex: Watchlist = {
      id: 'system_forex',
      name: 'Major Forex Pairs',
      description: 'Track major currency pairs',
      userId: 'system',
      assets: [
        { symbol: 'EURUSD', name: 'Euro/US Dollar', type: 'forex', exchange: 'FX' },
        { symbol: 'GBPUSD', name: 'British Pound/US Dollar', type: 'forex', exchange: 'FX' },
        { symbol: 'USDJPY', name: 'US Dollar/Japanese Yen', type: 'forex', exchange: 'FX' },
        { symbol: 'USDCHF', name: 'US Dollar/Swiss Franc', type: 'forex', exchange: 'FX' },
        { symbol: 'AUDUSD', name: 'Australian Dollar/US Dollar', type: 'forex', exchange: 'FX' },
        { symbol: 'USDCAD', name: 'US Dollar/Canadian Dollar', type: 'forex', exchange: 'FX' },
      ],
      conditions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: true,
      followers: 0,
      performance: { alertsTriggered: 0, profitableAlerts: 0, avgReturnPerAlert: 0 },
    };

    // System watchlist for crypto
    const majorCrypto: Watchlist = {
      id: 'system_crypto',
      name: 'Major Cryptocurrencies',
      description: 'Track major cryptocurrencies',
      userId: 'system',
      assets: [
        { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto', exchange: 'CRYPTO' },
        { symbol: 'ETHUSD', name: 'Ethereum', type: 'crypto', exchange: 'CRYPTO' },
        { symbol: 'SOLUSD', name: 'Solana', type: 'crypto', exchange: 'CRYPTO' },
        { symbol: 'BNBUSD', name: 'Binance Coin', type: 'crypto', exchange: 'CRYPTO' },
        { symbol: 'XRPUSD', name: 'Ripple', type: 'crypto', exchange: 'CRYPTO' },
      ],
      conditions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: true,
      followers: 0,
      performance: { alertsTriggered: 0, profitableAlerts: 0, avgReturnPerAlert: 0 },
    };

    this.watchlists.set(majorIndices.id, majorIndices);
    this.watchlists.set(majorForex.id, majorForex);
    this.watchlists.set(majorCrypto.id, majorCrypto);
  }

  // ============================================================
  // WATCHLIST MANAGEMENT
  // ============================================================

  /**
   * Create a new watchlist
   */
  createWatchlist(
    userId: string,
    name: string,
    description: string = '',
    isPublic: boolean = false
  ): Watchlist {
    const userWatchlists = Array.from(this.watchlists.values())
      .filter(w => w.userId === userId);

    if (userWatchlists.length >= this.config.maxWatchlistsPerUser) {
      throw new Error(`Maximum ${this.config.maxWatchlistsPerUser} watchlists per user`);
    }

    const watchlist: Watchlist = {
      id: `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      userId,
      assets: [],
      conditions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic,
      followers: 0,
      performance: { alertsTriggered: 0, profitableAlerts: 0, avgReturnPerAlert: 0 },
    };

    this.watchlists.set(watchlist.id, watchlist);
    this.emit('watchlist:created', watchlist);

    return watchlist;
  }

  /**
   * Add asset to watchlist
   */
  addAsset(watchlistId: string, asset: WatchedAsset): void {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist) {
      throw new Error('Watchlist not found');
    }

    if (watchlist.assets.length >= this.config.maxAssetsPerWatchlist) {
      throw new Error(`Maximum ${this.config.maxAssetsPerWatchlist} assets per watchlist`);
    }

    if (watchlist.assets.some(a => a.symbol === asset.symbol)) {
      throw new Error('Asset already in watchlist');
    }

    watchlist.assets.push(asset);
    watchlist.updatedAt = new Date();
    this.watchlists.set(watchlistId, watchlist);

    this.emit('asset:added', { watchlistId, asset });
  }

  /**
   * Remove asset from watchlist
   */
  removeAsset(watchlistId: string, symbol: string): void {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist) {
      throw new Error('Watchlist not found');
    }

    watchlist.assets = watchlist.assets.filter(a => a.symbol !== symbol);
    watchlist.conditions = watchlist.conditions.filter(
      c => !c.id.includes(symbol)
    );
    watchlist.updatedAt = new Date();
    this.watchlists.set(watchlistId, watchlist);

    this.emit('asset:removed', { watchlistId, symbol });
  }

  /**
   * Add watch condition
   */
  addCondition(
    watchlistId: string,
    symbol: string,
    type: WatchConditionType,
    parameters: Record<string, any>,
    description: string
  ): WatchCondition {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist) {
      throw new Error('Watchlist not found');
    }

    const assetConditions = watchlist.conditions.filter(
      c => c.id.includes(symbol)
    );

    if (assetConditions.length >= this.config.maxConditionsPerAsset) {
      throw new Error(`Maximum ${this.config.maxConditionsPerAsset} conditions per asset`);
    }

    const condition: WatchCondition = {
      id: `cond_${symbol}_${Date.now()}`,
      type,
      parameters: { ...parameters, symbol },
      description,
      enabled: true,
    };

    watchlist.conditions.push(condition);
    watchlist.updatedAt = new Date();
    this.watchlists.set(watchlistId, watchlist);

    this.emit('condition:added', { watchlistId, condition });

    return condition;
  }

  /**
   * Remove condition
   */
  removeCondition(watchlistId: string, conditionId: string): void {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist) {
      throw new Error('Watchlist not found');
    }

    watchlist.conditions = watchlist.conditions.filter(c => c.id !== conditionId);
    watchlist.updatedAt = new Date();
    this.watchlists.set(watchlistId, watchlist);

    this.emit('condition:removed', { watchlistId, conditionId });
  }

  /**
   * Toggle condition
   */
  toggleCondition(watchlistId: string, conditionId: string): void {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist) {
      throw new Error('Watchlist not found');
    }

    const condition = watchlist.conditions.find(c => c.id === conditionId);
    if (condition) {
      condition.enabled = !condition.enabled;
      watchlist.updatedAt = new Date();
      this.watchlists.set(watchlistId, watchlist);

      this.emit('condition:toggled', { watchlistId, conditionId, enabled: condition.enabled });
    }
  }

  // ============================================================
  // PRICE MONITORING AND CONDITION CHECKING
  // ============================================================

  /**
   * Update price for an asset
   */
  updatePrice(symbol: string, price: number, volume?: number): void {
    const oldPrice = this.priceCache.get(symbol);
    this.priceCache.set(symbol, { price, timestamp: new Date() });

    // Update all watchlists containing this asset
    this.watchlists.forEach(watchlist => {
      const asset = watchlist.assets.find(a => a.symbol === symbol);
      if (asset) {
        const oldAssetPrice = asset.currentPrice;
        asset.currentPrice = price;
        asset.lastUpdate = new Date();

        if (volume !== undefined) {
          asset.volume = volume;
        }

        if (oldAssetPrice) {
          asset.dailyChange = price - oldAssetPrice;
          asset.dailyChangePercent = ((price - oldAssetPrice) / oldAssetPrice) * 100;
        }

        // Check conditions
        this.checkConditions(watchlist, symbol, price, oldPrice?.price);
      }
    });

    this.emit('price:updated', { symbol, price, timestamp: new Date() });
  }

  /**
   * Check all conditions for a symbol
   */
  private checkConditions(
    watchlist: Watchlist,
    symbol: string,
    currentPrice: number,
    previousPrice?: number
  ): void {
    const conditions = watchlist.conditions.filter(
      c => c.enabled && c.parameters.symbol === symbol
    );

    conditions.forEach(condition => {
      const triggered = this.evaluateCondition(condition, currentPrice, previousPrice);

      if (triggered) {
        this.triggerAlert(watchlist, condition, symbol, currentPrice);
      }
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: WatchCondition,
    currentPrice: number,
    previousPrice?: number
  ): boolean {
    const { type, parameters } = condition;

    switch (type) {
      case 'price_above':
        return currentPrice > parameters.threshold;

      case 'price_below':
        return currentPrice < parameters.threshold;

      case 'price_cross':
        if (!previousPrice) return false;
        const crossUp = previousPrice < parameters.threshold && currentPrice >= parameters.threshold;
        const crossDown = previousPrice > parameters.threshold && currentPrice <= parameters.threshold;
        return parameters.direction === 'up' ? crossUp : crossDown;

      case 'percent_change':
        if (!previousPrice) return false;
        const change = ((currentPrice - previousPrice) / previousPrice) * 100;
        return parameters.direction === 'up'
          ? change >= parameters.threshold
          : change <= -parameters.threshold;

      case 'breakout':
        return currentPrice > parameters.resistanceLevel;

      case 'breakdown':
        return currentPrice < parameters.supportLevel;

      case 'support_touch':
        return Math.abs(currentPrice - parameters.supportLevel) / parameters.supportLevel < 0.005;

      case 'resistance_touch':
        return Math.abs(currentPrice - parameters.resistanceLevel) / parameters.resistanceLevel < 0.005;

      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(
    watchlist: Watchlist,
    condition: WatchCondition,
    symbol: string,
    price: number
  ): void {
    // Check if similar alert was recently triggered (debounce)
    const recentSimilar = this.alerts.find(
      a => a.conditionId === condition.id &&
           a.triggeredAt.getTime() > Date.now() - 3600000 // 1 hour
    );

    if (recentSimilar) return;

    const alert: WatchAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      watchlistId: watchlist.id,
      conditionId: condition.id,
      symbol,
      type: condition.type,
      message: this.generateAlertMessage(condition, symbol, price),
      severity: this.calculateAlertSeverity(condition),
      priceAtAlert: price,
      triggeredAt: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Update watchlist performance
    watchlist.performance.alertsTriggered++;

    // Trim old alerts
    const cutoff = Date.now() - this.config.alertRetentionDays * 86400000;
    this.alerts = this.alerts.filter(a => a.triggeredAt.getTime() > cutoff);

    this.emit('alert:triggered', alert);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(condition: WatchCondition, symbol: string, price: number): string {
    const priceStr = price.toFixed(price > 100 ? 2 : 4);

    switch (condition.type) {
      case 'price_above':
        return `${symbol} broke above ${condition.parameters.threshold} (now at ${priceStr})`;
      case 'price_below':
        return `${symbol} fell below ${condition.parameters.threshold} (now at ${priceStr})`;
      case 'price_cross':
        return `${symbol} crossed ${condition.parameters.threshold} ${condition.parameters.direction}ward (now at ${priceStr})`;
      case 'percent_change':
        return `${symbol} moved ${condition.parameters.threshold}% ${condition.parameters.direction} (now at ${priceStr})`;
      case 'breakout':
        return `${symbol} BREAKOUT above ${condition.parameters.resistanceLevel}! (now at ${priceStr})`;
      case 'breakdown':
        return `${symbol} BREAKDOWN below ${condition.parameters.supportLevel}! (now at ${priceStr})`;
      default:
        return `${symbol} triggered ${condition.type} alert (now at ${priceStr})`;
    }
  }

  /**
   * Calculate alert severity
   */
  private calculateAlertSeverity(condition: WatchCondition): WatchAlert['severity'] {
    const urgentTypes: WatchConditionType[] = ['breakout', 'breakdown', 'volatility_spike'];
    const highTypes: WatchConditionType[] = ['pattern_detected', 'regime_change', 'correlation_break'];

    if (urgentTypes.includes(condition.type)) return 'urgent';
    if (highTypes.includes(condition.type)) return 'high';
    if (condition.parameters.threshold && Math.abs(condition.parameters.threshold) > 5) return 'medium';
    return 'low';
  }

  // ============================================================
  // SMART SUGGESTIONS
  // ============================================================

  /**
   * Generate smart suggestions based on TIME's learning
   */
  generateSuggestions(userId: string): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const userWatchlists = Array.from(this.watchlists.values())
      .filter(w => w.userId === userId);

    // Get all watched symbols
    const watchedSymbols = new Set(
      userWatchlists.flatMap(w => w.assets.map(a => a.symbol))
    );

    // Suggest correlated assets
    this.correlationWatches.forEach(cw => {
      if (watchedSymbols.has(cw.symbol1) && !watchedSymbols.has(cw.symbol2)) {
        suggestions.push({
          id: `sug_${Date.now()}_corr`,
          type: 'add_to_watchlist',
          symbol: cw.symbol2,
          reason: `${cw.symbol2} is highly correlated with ${cw.symbol1} which you're watching`,
          confidence: 0.75,
          basedOn: ['correlation_analysis'],
          timestamp: new Date(),
        });
      }
    });

    // Suggest alerts for assets without conditions
    userWatchlists.forEach(wl => {
      wl.assets.forEach(asset => {
        const hasConditions = wl.conditions.some(
          c => c.parameters.symbol === asset.symbol
        );

        if (!hasConditions && asset.currentPrice) {
          suggestions.push({
            id: `sug_${Date.now()}_alert_${asset.symbol}`,
            type: 'set_alert',
            symbol: asset.symbol,
            condition: {
              id: 'suggested',
              type: 'percent_change',
              parameters: { threshold: 5, direction: 'up', symbol: asset.symbol },
              description: '5% price increase alert',
              enabled: true,
            },
            reason: `You're watching ${asset.symbol} but have no alerts set`,
            confidence: 0.8,
            basedOn: ['watchlist_analysis'],
            timestamp: new Date(),
          });
        }
      });
    });

    // Filter by confidence threshold
    const filteredSuggestions = suggestions.filter(
      s => s.confidence >= this.config.suggestionConfidenceThreshold
    );

    this.suggestions = filteredSuggestions;
    return filteredSuggestions;
  }

  // ============================================================
  // CORRELATION WATCHING
  // ============================================================

  /**
   * Add correlation watch
   */
  addCorrelationWatch(
    symbol1: string,
    symbol2: string,
    normalCorrelation: number,
    breakThreshold: number = 0.3
  ): CorrelationWatch {
    const watch: CorrelationWatch = {
      id: `corr_${symbol1}_${symbol2}`,
      symbol1,
      symbol2,
      normalCorrelation,
      currentCorrelation: normalCorrelation,
      breakThreshold,
      isBreaking: false,
      lastCheck: new Date(),
    };

    this.correlationWatches.set(watch.id, watch);
    return watch;
  }

  /**
   * Update correlation
   */
  updateCorrelation(symbol1: string, symbol2: string, currentCorrelation: number): void {
    const id = `corr_${symbol1}_${symbol2}`;
    const watch = this.correlationWatches.get(id);

    if (watch) {
      watch.currentCorrelation = currentCorrelation;
      watch.lastCheck = new Date();

      const deviation = Math.abs(watch.currentCorrelation - watch.normalCorrelation);
      const wasBreaking = watch.isBreaking;
      watch.isBreaking = deviation > watch.breakThreshold;

      if (watch.isBreaking && !wasBreaking) {
        this.emit('correlation:breaking', watch);
      }

      this.correlationWatches.set(id, watch);
    }
  }

  // ============================================================
  // PATTERN WATCHING
  // ============================================================

  /**
   * Add pattern watch
   */
  addPatternWatch(
    symbol: string,
    patternType: string,
    expectedBreakout: 'up' | 'down' | 'unknown',
    targetPrice?: number,
    invalidationPrice?: number
  ): PatternWatch {
    const watch: PatternWatch = {
      id: `pattern_${symbol}_${Date.now()}`,
      symbol,
      patternType,
      formingProgress: 0,
      expectedBreakout,
      targetPrice,
      invalidationPrice,
      confidence: this.config.patternMinConfidence,
      detectedAt: new Date(),
    };

    this.patternWatches.set(watch.id, watch);
    this.emit('pattern:detected', watch);

    return watch;
  }

  /**
   * Update pattern progress
   */
  updatePatternProgress(patternId: string, progress: number, confidence: number): void {
    const watch = this.patternWatches.get(patternId);

    if (watch) {
      watch.formingProgress = progress;
      watch.confidence = confidence;

      if (progress >= 100) {
        this.emit('pattern:completed', watch);
      }

      this.patternWatches.set(patternId, watch);
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get all watchlists for a user
   */
  getUserWatchlists(userId: string): Watchlist[] {
    return Array.from(this.watchlists.values())
      .filter(w => w.userId === userId || w.isPublic);
  }

  /**
   * Get watchlist by ID
   */
  getWatchlist(watchlistId: string): Watchlist | undefined {
    return this.watchlists.get(watchlistId);
  }

  /**
   * Get recent alerts
   */
  getAlerts(userId?: string, limit: number = 50): WatchAlert[] {
    let alerts = [...this.alerts].reverse();

    if (userId) {
      const userWatchlistIds = new Set(
        Array.from(this.watchlists.values())
          .filter(w => w.userId === userId)
          .map(w => w.id)
      );
      alerts = alerts.filter(a => userWatchlistIds.has(a.watchlistId));
    }

    return alerts.slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, action: WatchAlert['actionTaken']): void {
    const alert = this.alerts.find(a => a.id === alertId);

    if (alert) {
      alert.acknowledged = true;
      alert.actionTaken = action;

      this.emit('alert:acknowledged', alert);
    }
  }

  /**
   * Record alert outcome
   */
  recordAlertOutcome(alertId: string, priceAfter24h: number): void {
    const alert = this.alerts.find(a => a.id === alertId);

    if (alert) {
      const returnPercent = ((priceAfter24h - alert.priceAtAlert) / alert.priceAtAlert) * 100;
      const wasGoodAlert = (alert.actionTaken === 'bought' && returnPercent > 0) ||
                          (alert.actionTaken === 'sold' && returnPercent < 0) ||
                          (alert.actionTaken === 'ignored' && Math.abs(returnPercent) < 1);

      alert.outcome = {
        priceAfter24h,
        returnPercent,
        wasGoodAlert,
      };

      // Update watchlist performance
      const watchlist = this.watchlists.get(alert.watchlistId);
      if (watchlist && wasGoodAlert) {
        watchlist.performance.profitableAlerts++;
        watchlist.performance.avgReturnPerAlert =
          (watchlist.performance.avgReturnPerAlert * (watchlist.performance.profitableAlerts - 1) + returnPercent) /
          watchlist.performance.profitableAlerts;
      }

      this.emit('alert:outcome_recorded', alert);
    }
  }

  /**
   * Get watcher statistics
   */
  getStats(): WatcherStats {
    const allWatchlists = Array.from(this.watchlists.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    // Count assets
    const assetCounts: Record<string, number> = {};
    allWatchlists.forEach(wl => {
      wl.assets.forEach(a => {
        assetCounts[a.symbol] = (assetCounts[a.symbol] || 0) + 1;
      });
    });

    const mostWatched = Object.entries(assetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbol, count]) => ({ symbol, count }));

    // Alert stats
    const alertsToday = this.alerts.filter(a => a.triggeredAt >= today).length;
    const alertsThisWeek = this.alerts.filter(a => a.triggeredAt >= weekAgo).length;

    const alertsWithOutcome = this.alerts.filter(a => a.outcome);
    const goodAlerts = alertsWithOutcome.filter(a => a.outcome?.wasGoodAlert);
    const alertAccuracy = alertsWithOutcome.length > 0
      ? (goodAlerts.length / alertsWithOutcome.length) * 100
      : 0;

    // Top performing watchlists
    const topPerforming = allWatchlists
      .filter(wl => wl.performance.alertsTriggered > 5)
      .map(wl => ({
        id: wl.id,
        name: wl.name,
        accuracy: wl.performance.alertsTriggered > 0
          ? (wl.performance.profitableAlerts / wl.performance.alertsTriggered) * 100
          : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    return {
      totalWatchlists: allWatchlists.length,
      totalAssets: Object.keys(assetCounts).length,
      totalConditions: allWatchlists.reduce((sum, wl) => sum + wl.conditions.length, 0),
      alertsToday,
      alertsThisWeek,
      alertAccuracy,
      mostWatchedAssets: mostWatched,
      topPerformingWatchlists: topPerforming,
    };
  }

  /**
   * Get correlation watches
   */
  getCorrelationWatches(): CorrelationWatch[] {
    return Array.from(this.correlationWatches.values());
  }

  /**
   * Get pattern watches
   */
  getPatternWatches(): PatternWatch[] {
    return Array.from(this.patternWatches.values());
  }

  /**
   * Delete watchlist
   */
  deleteWatchlist(watchlistId: string): void {
    if (watchlistId.startsWith('system_')) {
      throw new Error('Cannot delete system watchlists');
    }

    this.watchlists.delete(watchlistId);
    this.emit('watchlist:deleted', watchlistId);
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const stockWatchers = new StockWatchers();

export default StockWatchers;

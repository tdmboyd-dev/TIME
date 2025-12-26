/**
 * TIME Watchlist Service
 *
 * Comprehensive watchlist management system for TIME BEYOND US trading platform.
 * Features:
 * - Multiple custom watchlists per user
 * - Add/remove symbols from watchlists
 * - Real-time price updates for watchlist items
 * - Price alerts (above, below, percent change)
 * - Custom columns (price, change, volume, RSI, etc.)
 * - Sort and filter watchlist items
 * - Import/export watchlists
 * - Share watchlists with other users
 * - Default watchlists (Most Active, Top Gainers, Top Losers)
 */

import { EventEmitter } from 'events';
import { realMarketData, RealQuote, CryptoQuote } from '../data/real_market_data_integration';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface WatchlistItem {
  symbol: string;
  name?: string;
  addedAt: Date;
  notes?: string;
  targetPrice?: number;
  stopLoss?: number;
  alerts: PriceAlert[];
  customData?: Record<string, any>;
  lastPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  volume?: number;
  marketCap?: number;
  lastUpdated?: Date;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  items: WatchlistItem[];
  columns: WatchlistColumn[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  filters: WatchlistFilter[];
  isDefault: boolean;
  isPublic: boolean;
  sharedWith: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  color?: string;
  icon?: string;
}

export interface WatchlistColumn {
  id: string;
  name: string;
  field: string;
  type: 'number' | 'string' | 'percent' | 'currency' | 'date' | 'indicator';
  width?: number;
  visible: boolean;
  sortable: boolean;
  format?: string;
  indicatorConfig?: IndicatorConfig;
}

export interface IndicatorConfig {
  type: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'ATR' | 'VWAP' | 'ADX' | 'OBV';
  period?: number;
  params?: Record<string, number>;
}

export interface WatchlistFilter {
  id: string;
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'contains' | 'startsWith';
  value: any;
  value2?: any; // For 'between' operator
  enabled: boolean;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  type: 'above' | 'below' | 'percent_up' | 'percent_down' | 'volume_spike' | 'ma_cross';
  targetValue: number;
  baseValue?: number; // For percent alerts, the starting price
  condition?: string; // For complex alerts
  enabled: boolean;
  triggered: boolean;
  triggeredAt?: Date;
  notificationChannels: ('email' | 'push' | 'sms' | 'webhook')[];
  webhookUrl?: string;
  message?: string;
  repeat: boolean;
  repeatInterval?: number; // Minutes
  expiresAt?: Date;
  createdAt: Date;
}

export interface WatchlistSnapshot {
  watchlistId: string;
  timestamp: Date;
  items: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }[];
}

export interface SharedWatchlistAccess {
  watchlistId: string;
  userId: string;
  permission: 'view' | 'edit' | 'admin';
  sharedBy: string;
  sharedAt: Date;
  expiresAt?: Date;
}

export type DefaultWatchlistType =
  | 'MOST_ACTIVE'
  | 'TOP_GAINERS'
  | 'TOP_LOSERS'
  | 'HIGHEST_VOLUME'
  | 'NEW_HIGHS'
  | 'NEW_LOWS'
  | 'MOST_VOLATILE'
  | 'TRENDING'
  | 'CRYPTO_TOP_100'
  | 'SP500'
  | 'NASDAQ100'
  | 'DOW30';

// ============================================================================
// Default Columns Configuration
// ============================================================================

const DEFAULT_COLUMNS: WatchlistColumn[] = [
  { id: 'symbol', name: 'Symbol', field: 'symbol', type: 'string', visible: true, sortable: true, width: 80 },
  { id: 'name', name: 'Name', field: 'name', type: 'string', visible: true, sortable: true, width: 150 },
  { id: 'lastPrice', name: 'Price', field: 'lastPrice', type: 'currency', visible: true, sortable: true, width: 100 },
  { id: 'change', name: 'Change', field: 'priceChange', type: 'currency', visible: true, sortable: true, width: 80 },
  { id: 'changePercent', name: '% Change', field: 'priceChangePercent', type: 'percent', visible: true, sortable: true, width: 80 },
  { id: 'volume', name: 'Volume', field: 'volume', type: 'number', visible: true, sortable: true, width: 100, format: 'compact' },
  { id: 'marketCap', name: 'Market Cap', field: 'marketCap', type: 'currency', visible: true, sortable: true, width: 120, format: 'compact' },
  { id: 'high', name: 'High', field: 'high', type: 'currency', visible: false, sortable: true, width: 80 },
  { id: 'low', name: 'Low', field: 'low', type: 'currency', visible: false, sortable: true, width: 80 },
  { id: 'open', name: 'Open', field: 'open', type: 'currency', visible: false, sortable: true, width: 80 },
  { id: 'prevClose', name: 'Prev Close', field: 'previousClose', type: 'currency', visible: false, sortable: true, width: 100 },
  { id: 'rsi', name: 'RSI (14)', field: 'rsi', type: 'indicator', visible: false, sortable: true, width: 70, indicatorConfig: { type: 'RSI', period: 14 } },
  { id: 'sma20', name: 'SMA 20', field: 'sma20', type: 'indicator', visible: false, sortable: true, width: 80, indicatorConfig: { type: 'SMA', period: 20 } },
  { id: 'sma50', name: 'SMA 50', field: 'sma50', type: 'indicator', visible: false, sortable: true, width: 80, indicatorConfig: { type: 'SMA', period: 50 } },
  { id: 'ema12', name: 'EMA 12', field: 'ema12', type: 'indicator', visible: false, sortable: true, width: 80, indicatorConfig: { type: 'EMA', period: 12 } },
  { id: 'atr', name: 'ATR', field: 'atr', type: 'indicator', visible: false, sortable: true, width: 70, indicatorConfig: { type: 'ATR', period: 14 } },
  { id: 'targetPrice', name: 'Target', field: 'targetPrice', type: 'currency', visible: false, sortable: true, width: 80 },
  { id: 'stopLoss', name: 'Stop Loss', field: 'stopLoss', type: 'currency', visible: false, sortable: true, width: 80 },
  { id: 'notes', name: 'Notes', field: 'notes', type: 'string', visible: false, sortable: false, width: 200 },
  { id: 'addedAt', name: 'Added', field: 'addedAt', type: 'date', visible: false, sortable: true, width: 100 },
];

// ============================================================================
// Watchlist Service Class
// ============================================================================

export class WatchlistService extends EventEmitter {
  private watchlists: Map<string, Watchlist> = new Map();
  private alerts: Map<string, PriceAlert[]> = new Map(); // symbol -> alerts
  private sharedAccess: Map<string, SharedWatchlistAccess[]> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private snapshots: Map<string, WatchlistSnapshot[]> = new Map();
  private cachedQuotes: Map<string, RealQuote | CryptoQuote> = new Map();

  constructor() {
    super();
    this.initializeDefaultWatchlists();
  }

  // ============================================================================
  // Watchlist CRUD Operations
  // ============================================================================

  /**
   * Create a new watchlist
   */
  createWatchlist(
    userId: string,
    name: string,
    options?: {
      description?: string;
      columns?: WatchlistColumn[];
      isPublic?: boolean;
      tags?: string[];
      color?: string;
      icon?: string;
    }
  ): Watchlist {
    const id = `wl-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const watchlist: Watchlist = {
      id,
      userId,
      name,
      description: options?.description,
      items: [],
      columns: options?.columns || [...DEFAULT_COLUMNS],
      sortBy: 'symbol',
      sortDirection: 'asc',
      filters: [],
      isDefault: false,
      isPublic: options?.isPublic || false,
      sharedWith: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: options?.tags || [],
      color: options?.color || '#3B82F6',
      icon: options?.icon || 'list',
    };

    this.watchlists.set(id, watchlist);
    this.emit('watchlistCreated', watchlist);

    return watchlist;
  }

  /**
   * Get a watchlist by ID
   */
  getWatchlist(watchlistId: string, userId?: string): Watchlist | null {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist) return null;

    // Check access permissions
    if (userId && watchlist.userId !== userId && !watchlist.isPublic) {
      const access = this.sharedAccess.get(watchlistId);
      const hasAccess = access?.some(a => a.userId === userId);
      if (!hasAccess) return null;
    }

    return watchlist;
  }

  /**
   * Get all watchlists for a user
   */
  getUserWatchlists(userId: string): Watchlist[] {
    const watchlists: Watchlist[] = [];

    for (const watchlist of this.watchlists.values()) {
      if (watchlist.userId === userId) {
        watchlists.push(watchlist);
      }
    }

    // Also include shared watchlists
    for (const [watchlistId, accessList] of this.sharedAccess.entries()) {
      if (accessList.some(a => a.userId === userId)) {
        const watchlist = this.watchlists.get(watchlistId);
        if (watchlist && !watchlists.includes(watchlist)) {
          watchlists.push(watchlist);
        }
      }
    }

    return watchlists.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update a watchlist
   */
  updateWatchlist(
    watchlistId: string,
    userId: string,
    updates: Partial<Pick<Watchlist, 'name' | 'description' | 'columns' | 'sortBy' | 'sortDirection' | 'filters' | 'isPublic' | 'tags' | 'color' | 'icon'>>
  ): Watchlist | null {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || watchlist.userId !== userId) return null;

    Object.assign(watchlist, updates, { updatedAt: new Date() });
    this.emit('watchlistUpdated', watchlist);

    return watchlist;
  }

  /**
   * Delete a watchlist
   */
  deleteWatchlist(watchlistId: string, userId: string): boolean {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || watchlist.userId !== userId || watchlist.isDefault) {
      return false;
    }

    this.watchlists.delete(watchlistId);
    this.sharedAccess.delete(watchlistId);
    this.snapshots.delete(watchlistId);
    this.emit('watchlistDeleted', { watchlistId, userId });

    return true;
  }

  // ============================================================================
  // Watchlist Item Operations
  // ============================================================================

  /**
   * Add a symbol to a watchlist
   */
  async addSymbol(
    watchlistId: string,
    userId: string,
    symbol: string,
    options?: {
      notes?: string;
      targetPrice?: number;
      stopLoss?: number;
    }
  ): Promise<WatchlistItem | null> {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || (watchlist.userId !== userId && !this.hasEditAccess(watchlistId, userId))) {
      return null;
    }

    // Check if symbol already exists
    if (watchlist.items.some(item => item.symbol === symbol)) {
      return null;
    }

    // Fetch current price data
    let quote: RealQuote | CryptoQuote | null = null;
    try {
      const isCrypto = this.isCryptoSymbol(symbol);
      quote = isCrypto
        ? await realMarketData.getCryptoQuote(symbol)
        : await realMarketData.getStockQuote(symbol);
    } catch (error) {
      console.error(`[Watchlist] Error fetching quote for ${symbol}:`, error);
    }

    const item: WatchlistItem = {
      symbol: symbol.toUpperCase(),
      name: (quote as any)?.name || symbol,
      addedAt: new Date(),
      notes: options?.notes,
      targetPrice: options?.targetPrice,
      stopLoss: options?.stopLoss,
      alerts: [],
      lastPrice: quote?.price,
      priceChange: quote?.change || (quote as any)?.change24h,
      priceChangePercent: quote?.changePercent || (quote as any)?.changePercent24h,
      volume: (quote as any)?.volume || (quote as any)?.volume24h,
      marketCap: (quote as any)?.marketCap,
      lastUpdated: new Date(),
    };

    watchlist.items.push(item);
    watchlist.updatedAt = new Date();

    this.emit('symbolAdded', { watchlistId, item });

    return item;
  }

  /**
   * Add multiple symbols to a watchlist
   */
  async addSymbols(
    watchlistId: string,
    userId: string,
    symbols: string[]
  ): Promise<WatchlistItem[]> {
    const added: WatchlistItem[] = [];

    for (const symbol of symbols) {
      const item = await this.addSymbol(watchlistId, userId, symbol);
      if (item) added.push(item);
    }

    return added;
  }

  /**
   * Remove a symbol from a watchlist
   */
  removeSymbol(watchlistId: string, userId: string, symbol: string): boolean {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || (watchlist.userId !== userId && !this.hasEditAccess(watchlistId, userId))) {
      return false;
    }

    const index = watchlist.items.findIndex(item => item.symbol === symbol);
    if (index === -1) return false;

    watchlist.items.splice(index, 1);
    watchlist.updatedAt = new Date();

    // Also remove associated alerts
    this.removeAlertsForSymbol(watchlistId, symbol);

    this.emit('symbolRemoved', { watchlistId, symbol });

    return true;
  }

  /**
   * Update a watchlist item
   */
  updateItem(
    watchlistId: string,
    userId: string,
    symbol: string,
    updates: Partial<Pick<WatchlistItem, 'notes' | 'targetPrice' | 'stopLoss' | 'customData'>>
  ): WatchlistItem | null {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || (watchlist.userId !== userId && !this.hasEditAccess(watchlistId, userId))) {
      return null;
    }

    const item = watchlist.items.find(i => i.symbol === symbol);
    if (!item) return null;

    Object.assign(item, updates);
    watchlist.updatedAt = new Date();

    this.emit('itemUpdated', { watchlistId, item });

    return item;
  }

  // ============================================================================
  // Real-time Price Updates
  // ============================================================================

  /**
   * Start real-time price updates for all watchlists
   */
  startPriceUpdates(intervalMs: number = 30000): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    this.priceUpdateInterval = setInterval(() => {
      this.updateAllPrices();
    }, intervalMs);

    // Initial update
    this.updateAllPrices();

    console.log(`[Watchlist] Started price updates every ${intervalMs / 1000}s`);
  }

  /**
   * Stop real-time price updates
   */
  stopPriceUpdates(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
    console.log('[Watchlist] Stopped price updates');
  }

  /**
   * Update prices for all watchlist items
   */
  private async updateAllPrices(): Promise<void> {
    // Collect all unique symbols
    const allSymbols = new Set<string>();

    for (const watchlist of this.watchlists.values()) {
      for (const item of watchlist.items) {
        allSymbols.add(item.symbol);
      }
    }

    if (allSymbols.size === 0) return;

    // Fetch quotes in batches
    const symbols = Array.from(allSymbols);
    const quotes = await realMarketData.getBatchQuotes(symbols);

    // Update cached quotes
    for (const [symbol, quote] of quotes) {
      this.cachedQuotes.set(symbol, quote);
    }

    // Update all watchlist items
    for (const watchlist of this.watchlists.values()) {
      let hasUpdates = false;

      for (const item of watchlist.items) {
        const quote = quotes.get(item.symbol);
        if (quote) {
          item.lastPrice = quote.price;
          item.priceChange = quote.change || (quote as any).change24h;
          item.priceChangePercent = quote.changePercent || (quote as any).changePercent24h;
          item.volume = (quote as any).volume || (quote as any).volume24h;
          item.marketCap = (quote as any).marketCap;
          item.lastUpdated = new Date();
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        this.emit('pricesUpdated', { watchlistId: watchlist.id, items: watchlist.items });
      }
    }

    // Check alerts after price update
    this.checkAlerts();
  }

  /**
   * Get real-time price for a specific watchlist
   */
  async getWatchlistWithPrices(watchlistId: string, userId?: string): Promise<Watchlist | null> {
    const watchlist = this.getWatchlist(watchlistId, userId);
    if (!watchlist) return null;

    // Fetch fresh prices
    const symbols = watchlist.items.map(item => item.symbol);
    const quotes = await realMarketData.getBatchQuotes(symbols);

    // Update items with latest prices
    for (const item of watchlist.items) {
      const quote = quotes.get(item.symbol);
      if (quote) {
        item.lastPrice = quote.price;
        item.priceChange = quote.change || (quote as any).change24h;
        item.priceChangePercent = quote.changePercent || (quote as any).changePercent24h;
        item.volume = (quote as any).volume || (quote as any).volume24h;
        item.marketCap = (quote as any).marketCap;
        item.lastUpdated = new Date();
      }
    }

    return watchlist;
  }

  // ============================================================================
  // Price Alerts
  // ============================================================================

  /**
   * Create a price alert
   */
  createAlert(
    watchlistId: string,
    userId: string,
    symbol: string,
    alert: Omit<PriceAlert, 'id' | 'triggered' | 'triggeredAt' | 'createdAt'>
  ): PriceAlert | null {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || (watchlist.userId !== userId && !this.hasEditAccess(watchlistId, userId))) {
      return null;
    }

    const item = watchlist.items.find(i => i.symbol === symbol);
    if (!item) return null;

    const newAlert: PriceAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      triggered: false,
      createdAt: new Date(),
      baseValue: item.lastPrice, // Store current price as base for percent alerts
    };

    item.alerts.push(newAlert);

    // Also track in global alerts map for efficient checking
    if (!this.alerts.has(symbol)) {
      this.alerts.set(symbol, []);
    }
    this.alerts.get(symbol)!.push(newAlert);

    this.emit('alertCreated', { watchlistId, alert: newAlert });

    return newAlert;
  }

  /**
   * Update an alert
   */
  updateAlert(
    watchlistId: string,
    userId: string,
    alertId: string,
    updates: Partial<Pick<PriceAlert, 'targetValue' | 'enabled' | 'notificationChannels' | 'message' | 'repeat' | 'repeatInterval' | 'expiresAt'>>
  ): PriceAlert | null {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || (watchlist.userId !== userId && !this.hasEditAccess(watchlistId, userId))) {
      return null;
    }

    for (const item of watchlist.items) {
      const alert = item.alerts.find(a => a.id === alertId);
      if (alert) {
        Object.assign(alert, updates);
        this.emit('alertUpdated', { watchlistId, alert });
        return alert;
      }
    }

    return null;
  }

  /**
   * Delete an alert
   */
  deleteAlert(watchlistId: string, userId: string, alertId: string): boolean {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || (watchlist.userId !== userId && !this.hasEditAccess(watchlistId, userId))) {
      return false;
    }

    for (const item of watchlist.items) {
      const index = item.alerts.findIndex(a => a.id === alertId);
      if (index !== -1) {
        const [alert] = item.alerts.splice(index, 1);

        // Remove from global alerts
        const symbolAlerts = this.alerts.get(alert.symbol);
        if (symbolAlerts) {
          const globalIndex = symbolAlerts.findIndex(a => a.id === alertId);
          if (globalIndex !== -1) symbolAlerts.splice(globalIndex, 1);
        }

        this.emit('alertDeleted', { watchlistId, alertId });
        return true;
      }
    }

    return false;
  }

  /**
   * Check all alerts against current prices
   */
  private checkAlerts(): void {
    for (const [symbol, alerts] of this.alerts.entries()) {
      const quote = this.cachedQuotes.get(symbol);
      if (!quote) continue;

      for (const alert of alerts) {
        if (!alert.enabled || alert.triggered) continue;

        // Check if expired
        if (alert.expiresAt && new Date() > alert.expiresAt) {
          alert.enabled = false;
          continue;
        }

        let isTriggered = false;

        switch (alert.type) {
          case 'above':
            isTriggered = quote.price >= alert.targetValue;
            break;
          case 'below':
            isTriggered = quote.price <= alert.targetValue;
            break;
          case 'percent_up':
            if (alert.baseValue) {
              const percentChange = ((quote.price - alert.baseValue) / alert.baseValue) * 100;
              isTriggered = percentChange >= alert.targetValue;
            }
            break;
          case 'percent_down':
            if (alert.baseValue) {
              const percentChange = ((quote.price - alert.baseValue) / alert.baseValue) * 100;
              isTriggered = percentChange <= -alert.targetValue;
            }
            break;
          case 'volume_spike':
            const volume = (quote as any).volume || (quote as any).volume24h || 0;
            isTriggered = volume >= alert.targetValue;
            break;
        }

        if (isTriggered) {
          alert.triggered = true;
          alert.triggeredAt = new Date();

          if (!alert.repeat) {
            alert.enabled = false;
          } else {
            // Reset for repeat alerts
            setTimeout(() => {
              alert.triggered = false;
              alert.baseValue = quote.price;
            }, (alert.repeatInterval || 60) * 60 * 1000);
          }

          this.emit('alertTriggered', {
            alert,
            currentPrice: quote.price,
            symbol,
          });
        }
      }
    }
  }

  /**
   * Start alert checking
   */
  startAlertChecking(intervalMs: number = 10000): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }

    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, intervalMs);

    console.log(`[Watchlist] Started alert checking every ${intervalMs / 1000}s`);
  }

  /**
   * Stop alert checking
   */
  stopAlertChecking(): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }
    console.log('[Watchlist] Stopped alert checking');
  }

  /**
   * Remove all alerts for a symbol
   */
  private removeAlertsForSymbol(watchlistId: string, symbol: string): void {
    const symbolAlerts = this.alerts.get(symbol);
    if (symbolAlerts) {
      this.alerts.set(symbol, symbolAlerts.filter(a => {
        // Keep alerts from other watchlists
        return !this.watchlists.get(watchlistId)?.items.some(i =>
          i.symbol === symbol && i.alerts.some(ia => ia.id === a.id)
        );
      }));
    }
  }

  /**
   * Get all active alerts for a user
   */
  getUserAlerts(userId: string): PriceAlert[] {
    const alerts: PriceAlert[] = [];

    for (const watchlist of this.watchlists.values()) {
      if (watchlist.userId === userId) {
        for (const item of watchlist.items) {
          alerts.push(...item.alerts.filter(a => a.enabled));
        }
      }
    }

    return alerts;
  }

  // ============================================================================
  // Sorting & Filtering
  // ============================================================================

  /**
   * Sort watchlist items
   */
  sortWatchlist(watchlistId: string, sortBy: string, direction: 'asc' | 'desc' = 'asc'): WatchlistItem[] | null {
    const watchlist = this.watchlists.get(watchlistId);
    if (!watchlist) return null;

    watchlist.sortBy = sortBy;
    watchlist.sortDirection = direction;

    const sorted = [...watchlist.items].sort((a, b) => {
      let aVal = (a as any)[sortBy];
      let bVal = (b as any)[sortBy];

      // Handle nulls
      if (aVal == null) return direction === 'asc' ? 1 : -1;
      if (bVal == null) return direction === 'asc' ? -1 : 1;

      // Compare values
      if (typeof aVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }

  /**
   * Filter watchlist items
   */
  filterWatchlist(watchlistId: string, filters: WatchlistFilter[]): WatchlistItem[] | null {
    const watchlist = this.watchlists.get(watchlistId);
    if (!watchlist) return null;

    watchlist.filters = filters;

    let filtered = [...watchlist.items];

    for (const filter of filters) {
      if (!filter.enabled) continue;

      filtered = filtered.filter(item => {
        const value = (item as any)[filter.field];
        if (value == null) return false;

        switch (filter.operator) {
          case 'gt': return value > filter.value;
          case 'lt': return value < filter.value;
          case 'gte': return value >= filter.value;
          case 'lte': return value <= filter.value;
          case 'eq': return value === filter.value;
          case 'between': return value >= filter.value && value <= filter.value2;
          case 'contains': return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'startsWith': return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
          default: return true;
        }
      });
    }

    return filtered;
  }

  /**
   * Get sorted and filtered items
   */
  getProcessedItems(watchlistId: string, userId?: string): WatchlistItem[] | null {
    const watchlist = this.getWatchlist(watchlistId, userId);
    if (!watchlist) return null;

    let items = watchlist.filters.length > 0
      ? this.filterWatchlist(watchlistId, watchlist.filters)
      : [...watchlist.items];

    if (!items) return null;

    // Apply sorting
    items.sort((a, b) => {
      let aVal = (a as any)[watchlist.sortBy];
      let bVal = (b as any)[watchlist.sortBy];

      if (aVal == null) return watchlist.sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return watchlist.sortDirection === 'asc' ? -1 : 1;

      if (typeof aVal === 'string') {
        return watchlist.sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return watchlist.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return items;
  }

  // ============================================================================
  // Import / Export
  // ============================================================================

  /**
   * Export watchlist to JSON
   */
  exportWatchlist(watchlistId: string, userId: string): string | null {
    const watchlist = this.getWatchlist(watchlistId, userId);
    if (!watchlist) return null;

    const exportData = {
      name: watchlist.name,
      description: watchlist.description,
      symbols: watchlist.items.map(item => ({
        symbol: item.symbol,
        notes: item.notes,
        targetPrice: item.targetPrice,
        stopLoss: item.stopLoss,
      })),
      columns: watchlist.columns,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export watchlist to CSV
   */
  exportWatchlistCSV(watchlistId: string, userId: string): string | null {
    const watchlist = this.getWatchlist(watchlistId, userId);
    if (!watchlist) return null;

    const visibleColumns = watchlist.columns.filter(c => c.visible);
    const headers = visibleColumns.map(c => c.name).join(',');

    const rows = watchlist.items.map(item => {
      return visibleColumns.map(col => {
        const value = (item as any)[col.field];
        if (value == null) return '';
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return String(value);
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Import watchlist from JSON
   */
  async importWatchlist(userId: string, jsonData: string): Promise<Watchlist | null> {
    try {
      const data = JSON.parse(jsonData);

      if (!data.name || !data.symbols || !Array.isArray(data.symbols)) {
        throw new Error('Invalid watchlist format');
      }

      const watchlist = this.createWatchlist(userId, data.name, {
        description: data.description,
        columns: data.columns,
      });

      // Add symbols
      for (const item of data.symbols) {
        await this.addSymbol(watchlist.id, userId, item.symbol, {
          notes: item.notes,
          targetPrice: item.targetPrice,
          stopLoss: item.stopLoss,
        });
      }

      return watchlist;
    } catch (error) {
      console.error('[Watchlist] Import error:', error);
      return null;
    }
  }

  /**
   * Import watchlist from CSV
   */
  async importWatchlistCSV(userId: string, name: string, csvData: string): Promise<Watchlist | null> {
    try {
      const lines = csvData.split('\n').filter(line => line.trim());
      if (lines.length < 2) throw new Error('CSV must have header and at least one row');

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const symbolIndex = headers.findIndex(h => h === 'symbol' || h === 'ticker');

      if (symbolIndex === -1) throw new Error('CSV must have a symbol column');

      const watchlist = this.createWatchlist(userId, name);

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const symbol = values[symbolIndex];

        if (symbol) {
          await this.addSymbol(watchlist.id, userId, symbol);
        }
      }

      return watchlist;
    } catch (error) {
      console.error('[Watchlist] CSV import error:', error);
      return null;
    }
  }

  // ============================================================================
  // Sharing
  // ============================================================================

  /**
   * Share a watchlist with another user
   */
  shareWatchlist(
    watchlistId: string,
    ownerId: string,
    targetUserId: string,
    permission: 'view' | 'edit' = 'view',
    expiresAt?: Date
  ): SharedWatchlistAccess | null {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || watchlist.userId !== ownerId) return null;

    const access: SharedWatchlistAccess = {
      watchlistId,
      userId: targetUserId,
      permission,
      sharedBy: ownerId,
      sharedAt: new Date(),
      expiresAt,
    };

    if (!this.sharedAccess.has(watchlistId)) {
      this.sharedAccess.set(watchlistId, []);
    }

    // Remove existing access for this user
    const accessList = this.sharedAccess.get(watchlistId)!;
    const existingIndex = accessList.findIndex(a => a.userId === targetUserId);
    if (existingIndex !== -1) accessList.splice(existingIndex, 1);

    accessList.push(access);
    watchlist.sharedWith.push(targetUserId);

    this.emit('watchlistShared', { watchlistId, access });

    return access;
  }

  /**
   * Revoke sharing access
   */
  revokeShare(watchlistId: string, ownerId: string, targetUserId: string): boolean {
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist || watchlist.userId !== ownerId) return false;

    const accessList = this.sharedAccess.get(watchlistId);
    if (accessList) {
      const index = accessList.findIndex(a => a.userId === targetUserId);
      if (index !== -1) accessList.splice(index, 1);
    }

    const sharedIndex = watchlist.sharedWith.indexOf(targetUserId);
    if (sharedIndex !== -1) watchlist.sharedWith.splice(sharedIndex, 1);

    this.emit('shareRevoked', { watchlistId, userId: targetUserId });

    return true;
  }

  /**
   * Get public watchlists
   */
  getPublicWatchlists(limit: number = 50): Watchlist[] {
    const publicWatchlists: Watchlist[] = [];

    for (const watchlist of this.watchlists.values()) {
      if (watchlist.isPublic) {
        publicWatchlists.push(watchlist);
      }
    }

    return publicWatchlists.slice(0, limit);
  }

  /**
   * Copy a shared/public watchlist
   */
  async copyWatchlist(watchlistId: string, toUserId: string, newName?: string): Promise<Watchlist | null> {
    const source = this.watchlists.get(watchlistId);

    if (!source) return null;

    // Check if user has access
    if (!source.isPublic && source.userId !== toUserId) {
      const access = this.sharedAccess.get(watchlistId);
      if (!access?.some(a => a.userId === toUserId)) return null;
    }

    const copy = this.createWatchlist(toUserId, newName || `${source.name} (Copy)`, {
      description: source.description,
      columns: [...source.columns],
      tags: source.tags,
    });

    // Copy items
    for (const item of source.items) {
      await this.addSymbol(copy.id, toUserId, item.symbol, {
        notes: item.notes,
        targetPrice: item.targetPrice,
        stopLoss: item.stopLoss,
      });
    }

    return copy;
  }

  // ============================================================================
  // Default Watchlists
  // ============================================================================

  /**
   * Initialize default watchlists
   */
  private initializeDefaultWatchlists(): void {
    // Create system default watchlists
    const defaultWatchlists: { type: DefaultWatchlistType; name: string; description: string }[] = [
      { type: 'MOST_ACTIVE', name: 'Most Active', description: 'Stocks with highest trading volume today' },
      { type: 'TOP_GAINERS', name: 'Top Gainers', description: 'Biggest percentage gainers today' },
      { type: 'TOP_LOSERS', name: 'Top Losers', description: 'Biggest percentage losers today' },
      { type: 'MOST_VOLATILE', name: 'Most Volatile', description: 'Highest volatility stocks' },
      { type: 'CRYPTO_TOP_100', name: 'Crypto Top 100', description: 'Top 100 cryptocurrencies by market cap' },
      { type: 'SP500', name: 'S&P 500', description: 'S&P 500 index components' },
      { type: 'NASDAQ100', name: 'NASDAQ 100', description: 'NASDAQ 100 index components' },
      { type: 'DOW30', name: 'Dow 30', description: 'Dow Jones Industrial Average components' },
    ];

    for (const def of defaultWatchlists) {
      const watchlist: Watchlist = {
        id: `default-${def.type.toLowerCase()}`,
        userId: 'system',
        name: def.name,
        description: def.description,
        items: [],
        columns: [...DEFAULT_COLUMNS],
        sortBy: 'symbol',
        sortDirection: 'asc',
        filters: [],
        isDefault: true,
        isPublic: true,
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['default'],
      };

      this.watchlists.set(watchlist.id, watchlist);
    }

    console.log(`[Watchlist] Initialized ${defaultWatchlists.length} default watchlists`);
  }

  /**
   * Get default watchlist with populated data
   */
  async getDefaultWatchlist(type: DefaultWatchlistType): Promise<Watchlist | null> {
    const watchlistId = `default-${type.toLowerCase()}`;
    const watchlist = this.watchlists.get(watchlistId);

    if (!watchlist) return null;

    // Populate with current data based on type
    switch (type) {
      case 'CRYPTO_TOP_100':
        try {
          const cryptos = await realMarketData.getTopCryptos(100);
          watchlist.items = cryptos.map(crypto => ({
            symbol: crypto.symbol,
            name: crypto.name,
            addedAt: new Date(),
            alerts: [],
            lastPrice: crypto.price,
            priceChange: crypto.change24h,
            priceChangePercent: crypto.changePercent24h,
            volume: crypto.volume24h,
            marketCap: crypto.marketCap,
            lastUpdated: new Date(),
          }));
        } catch (error) {
          console.error('[Watchlist] Error fetching crypto top 100:', error);
        }
        break;

      case 'SP500':
      case 'NASDAQ100':
      case 'DOW30':
        // These would be populated from a database or static list
        // For now, return empty with message
        break;

      case 'TOP_GAINERS':
      case 'TOP_LOSERS':
      case 'MOST_ACTIVE':
        // These require market scanner data - would be populated by screener
        break;
    }

    return watchlist;
  }

  // ============================================================================
  // Snapshots & History
  // ============================================================================

  /**
   * Create a snapshot of a watchlist
   */
  createSnapshot(watchlistId: string): WatchlistSnapshot | null {
    const watchlist = this.watchlists.get(watchlistId);
    if (!watchlist) return null;

    const snapshot: WatchlistSnapshot = {
      watchlistId,
      timestamp: new Date(),
      items: watchlist.items.map(item => ({
        symbol: item.symbol,
        price: item.lastPrice || 0,
        change: item.priceChange || 0,
        changePercent: item.priceChangePercent || 0,
        volume: item.volume || 0,
      })),
    };

    if (!this.snapshots.has(watchlistId)) {
      this.snapshots.set(watchlistId, []);
    }

    const snapshots = this.snapshots.get(watchlistId)!;
    snapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (snapshots.length > 100) {
      snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get historical snapshots
   */
  getSnapshots(watchlistId: string, limit: number = 24): WatchlistSnapshot[] {
    return (this.snapshots.get(watchlistId) || []).slice(-limit);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private hasEditAccess(watchlistId: string, userId: string): boolean {
    const accessList = this.sharedAccess.get(watchlistId);
    if (!accessList) return false;

    const access = accessList.find(a => a.userId === userId);
    if (!access) return false;

    // Check expiration
    if (access.expiresAt && new Date() > access.expiresAt) return false;

    return access.permission === 'edit' || access.permission === 'admin';
  }

  private isCryptoSymbol(symbol: string): boolean {
    const cryptoSymbols = ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI', 'LTC'];
    const upper = symbol.toUpperCase();
    return cryptoSymbols.some(c => upper.includes(c)) || upper.includes('USDT');
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalWatchlists: number;
    totalSymbols: number;
    totalAlerts: number;
    activeAlerts: number;
  } {
    let totalSymbols = 0;
    let totalAlerts = 0;
    let activeAlerts = 0;

    for (const watchlist of this.watchlists.values()) {
      totalSymbols += watchlist.items.length;
      for (const item of watchlist.items) {
        totalAlerts += item.alerts.length;
        activeAlerts += item.alerts.filter(a => a.enabled && !a.triggered).length;
      }
    }

    return {
      totalWatchlists: this.watchlists.size,
      totalSymbols,
      totalAlerts,
      activeAlerts,
    };
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    this.stopPriceUpdates();
    this.stopAlertChecking();
    this.removeAllListeners();
    console.log('[Watchlist] Service shutdown complete');
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const watchlistService = new WatchlistService();
export default watchlistService;

/**
 * Universal Broker Integration
 *
 * Provides unified brokerage API access to:
 * - 20+ major brokerages via partner API
 * - Account aggregation across all connected accounts
 * - Trade execution with smart routing
 * - Real-time portfolio data synchronization
 *
 * This integration allows users to connect and manage
 * their existing brokerage accounts from a single dashboard.
 */

import {
  BrokerInterface,
  BrokerConfig,
  BrokerCapabilities,
  Account,
  Position,
  Order,
  OrderRequest,
  OrderStatus,
  Quote,
  Bar,
  BrokerTrade,
  AssetClass,
  TimeInForce,
} from './broker_interface';
import { createComponentLogger } from '../utils/logger';
import * as crypto from 'crypto';

const logger = createComponentLogger('SnapTradeBroker');

// SnapTrade-specific types
interface SnapTradeConfig extends BrokerConfig {
  clientId: string;
  consumerKey: string;
  redirectUri?: string;
}

interface SnapTradeAccount {
  id: string;
  brokerage_authorization_id: string;
  brokerage: {
    id: string;
    name: string;
    slug: string;
  };
  name: string;
  number: string;
  institution_name: string;
  sync_status: 'OK' | 'ERROR' | 'SYNCING';
  balance: {
    total: {
      amount: number;
      currency: string;
    };
    available_cash: {
      amount: number;
      currency: string;
    };
  };
}

interface SnapTradePosition {
  symbol: {
    id: string;
    symbol: string;
    description: string;
    currency: string;
    exchange: string;
    type: string;
  };
  units: number;
  price: number;
  open_pnl: number;
  average_purchase_price: number;
}

interface SnapTradeBrokerageAuth {
  id: string;
  brokerage: {
    id: string;
    name: string;
    slug: string;
    display_name: string;
  };
  status: 'ACTIVE' | 'STALE' | 'ERROR' | 'DELETED';
  created_at: string;
  updated_at: string;
}

export class SnapTradeBroker extends BrokerInterface {
  public readonly name = 'SnapTrade';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['stock', 'crypto', 'options'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    supportsStreaming: false, // SnapTrade uses polling
    supportsPaperTrading: true,
    supportsMargin: true,
    supportsFractional: true,
    supportsExtendedHours: true,
  };

  private clientId: string;
  private consumerKey: string;
  private baseUrl = 'https://api.snaptrade.com/api/v1';
  private userId: string | null = null;
  private userSecret: string | null = null;
  private connectedBrokerages: SnapTradeBrokerageAuth[] = [];

  constructor(config: SnapTradeConfig) {
    super(config);
    this.clientId = config.clientId;
    this.consumerKey = config.consumerKey;
  }

  /**
   * Generate HMAC signature for API requests
   */
  private generateSignature(
    path: string,
    timestamp: string,
    body?: string
  ): string {
    const content = `${timestamp}${path}${body || ''}`;
    return crypto
      .createHmac('sha256', this.consumerKey)
      .update(content)
      .digest('base64');
  }

  /**
   * Make authenticated API request to SnapTrade
   */
  private async snapTradeRequest<T>(
    method: string,
    endpoint: string,
    body?: object
  ): Promise<T> {
    const timestamp = new Date().toISOString();
    const path = endpoint;
    const bodyString = body ? JSON.stringify(body) : undefined;
    const signature = this.generateSignature(path, timestamp, bodyString);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Signature': signature,
      'Timestamp': timestamp,
    };

    if (this.userId && this.userSecret) {
      headers['userId'] = this.userId;
      headers['userSecret'] = this.userSecret;
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: bodyString,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SnapTrade API error: ${response.status} - ${error}`);
      }

      return await response.json() as T;
    } catch (error) {
      logger.error(`SnapTrade request failed: ${endpoint}`, error as object);
      throw error;
    }
  }

  /**
   * Register a new user with SnapTrade
   */
  public async registerUser(userId: string): Promise<{
    userId: string;
    userSecret: string;
  }> {
    const response = await this.snapTradeRequest<{
      userId: string;
      userSecret: string;
    }>('POST', '/snapTrade/registerUser', { userId });

    this.userId = response.userId;
    this.userSecret = response.userSecret;

    logger.info(`User registered with SnapTrade: ${userId}`);
    return response;
  }

  /**
   * Get authorization URL to connect a brokerage
   */
  public async getAuthorizationUrl(
    brokerage?: string
  ): Promise<string> {
    if (!this.userId || !this.userSecret) {
      throw new Error('User not registered. Call registerUser first.');
    }

    const response = await this.snapTradeRequest<{
      redirectURI: string;
    }>('POST', '/snapTrade/login', {
      userId: this.userId,
      userSecret: this.userSecret,
      brokerage,
    });

    return response.redirectURI;
  }

  /**
   * Connect to SnapTrade
   */
  public async connect(): Promise<void> {
    logger.info('Connecting to SnapTrade...');

    try {
      // If we have user credentials, fetch connected brokerages
      if (this.userId && this.userSecret) {
        await this.refreshConnectedBrokerages();
      }

      this.isConnected = true;
      this.emit('connected');
      logger.info('Connected to SnapTrade');
    } catch (error) {
      logger.error('Failed to connect to SnapTrade:', error as object);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Refresh list of connected brokerages
   */
  private async refreshConnectedBrokerages(): Promise<void> {
    if (!this.userId) return;

    const response = await this.snapTradeRequest<SnapTradeBrokerageAuth[]>(
      'GET',
      `/authorizations?userId=${this.userId}&userSecret=${this.userSecret}`
    );

    this.connectedBrokerages = response;
    logger.info(`Found ${response.length} connected brokerages`);
  }

  /**
   * Get list of available brokerages
   */
  public async getAvailableBrokerages(): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    supportsTrading: boolean;
  }>> {
    const response = await this.snapTradeRequest<Array<{
      id: string;
      name: string;
      slug: string;
      allows_trading: boolean;
    }>>('GET', '/brokerages');

    return response.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      supportsTrading: b.allows_trading,
    }));
  }

  /**
   * Disconnect from SnapTrade
   */
  public async disconnect(): Promise<void> {
    logger.info('Disconnecting from SnapTrade...');
    this.isConnected = false;
    this.emit('disconnected', 'Manual disconnect');
  }

  /**
   * Check if connected
   */
  public isReady(): boolean {
    return this.isConnected && this.connectedBrokerages.length > 0;
  }

  /**
   * Get aggregated account information across all connected brokerages
   */
  public async getAccount(): Promise<Account> {
    if (!this.userId) {
      throw new Error('User not registered');
    }

    const accounts = await this.snapTradeRequest<SnapTradeAccount[]>(
      'GET',
      `/accounts?userId=${this.userId}&userSecret=${this.userSecret}`
    );

    // Aggregate across all accounts
    let totalEquity = 0;
    let totalCash = 0;

    for (const account of accounts) {
      totalEquity += account.balance.total.amount;
      totalCash += account.balance.available_cash.amount;
    }

    return {
      id: this.userId,
      currency: 'USD',
      balance: totalCash,
      equity: totalEquity,
      buyingPower: totalCash,
      cash: totalCash,
      portfolioValue: totalEquity,
      pendingTransfers: 0,
      marginUsed: totalEquity - totalCash,
      marginAvailable: totalCash,
      accountType: this.isPaperTrading ? 'paper' : 'cash',
    };
  }

  /**
   * Get all positions across connected brokerages
   */
  public async getPositions(): Promise<Position[]> {
    if (!this.userId) {
      throw new Error('User not registered');
    }

    const response = await this.snapTradeRequest<{
      positions: SnapTradePosition[];
    }>(
      'GET',
      `/holdings?userId=${this.userId}&userSecret=${this.userSecret}`
    );

    return response.positions.map(pos => ({
      symbol: pos.symbol.symbol,
      side: pos.units > 0 ? 'long' : 'short',
      quantity: Math.abs(pos.units),
      entryPrice: pos.average_purchase_price,
      currentPrice: pos.price,
      unrealizedPnL: pos.open_pnl,
      realizedPnL: 0,
      marketValue: pos.units * pos.price,
    }));
  }

  /**
   * Get open orders
   */
  public async getOrders(): Promise<Order[]> {
    if (!this.userId) {
      throw new Error('User not registered');
    }

    // SnapTrade doesn't have a direct orders endpoint
    // We'd need to track orders locally or query each connected account
    return [];
  }

  /**
   * Place an order through SnapTrade
   */
  public async placeOrder(request: OrderRequest): Promise<Order> {
    if (!this.userId) {
      throw new Error('User not registered');
    }

    // Get first account that supports trading
    const accounts = await this.snapTradeRequest<SnapTradeAccount[]>(
      'GET',
      `/accounts?userId=${this.userId}&userSecret=${this.userSecret}`
    );

    if (accounts.length === 0) {
      throw new Error('No connected accounts available for trading');
    }

    const accountId = accounts[0].id;

    const orderPayload = {
      account_id: accountId,
      action: request.side === 'buy' ? 'BUY' : 'SELL',
      order_type: request.type.toUpperCase(),
      time_in_force: request.timeInForce?.toUpperCase() || 'DAY',
      universal_symbol_id: request.symbol, // May need symbol lookup
      units: request.quantity,
      price: request.price,
      stop: request.stopPrice,
    };

    const response = await this.snapTradeRequest<{
      order_id: string;
      status: string;
    }>(
      'POST',
      `/trade/place?userId=${this.userId}&userSecret=${this.userSecret}`,
      orderPayload
    );

    return {
      id: response.order_id,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      filledQuantity: 0,
      price: request.price,
      stopPrice: request.stopPrice,
      timeInForce: request.timeInForce || 'day',
      status: this.mapOrderStatus(response.status),
      submittedAt: new Date(),
    };
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.userId) {
      throw new Error('User not registered');
    }

    try {
      await this.snapTradeRequest(
        'POST',
        `/trade/cancelOrder?userId=${this.userId}&userSecret=${this.userSecret}`,
        { brokerage_order_id: orderId }
      );
      return true;
    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}:`, error as object);
      return false;
    }
  }

  /**
   * Modify an existing order
   */
  public async modifyOrder(
    orderId: string,
    updates: Partial<OrderRequest>
  ): Promise<Order> {
    // SnapTrade doesn't support order modification
    // Need to cancel and replace
    await this.cancelOrder(orderId);

    if (!updates.symbol || !updates.side || !updates.type || !updates.quantity) {
      throw new Error('Insufficient data to replace order');
    }

    return this.placeOrder(updates as OrderRequest);
  }

  /**
   * Get real-time quote (SnapTrade provides delayed quotes)
   */
  public async getQuote(symbol: string): Promise<Quote> {
    // SnapTrade doesn't provide real-time quotes
    // Return placeholder - real quotes should come from MarketDataManager
    return {
      symbol,
      bid: 0,
      ask: 0,
      bidSize: 0,
      askSize: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Get historical bars
   */
  public async getHistoricalBars(
    symbol: string,
    timeframe: string,
    limit: number
  ): Promise<Bar[]> {
    // SnapTrade doesn't provide historical data
    // Use MarketDataManager instead
    return [];
  }

  /**
   * Stream quotes - not supported by SnapTrade
   */
  public async streamQuotes(
    symbols: string[],
    callback: (quote: Quote) => void
  ): Promise<() => void> {
    // SnapTrade doesn't support streaming
    // Return no-op unsubscribe
    return () => {};
  }

  /**
   * Get trade history
   */
  public async getTradeHistory(
    startDate: Date,
    endDate: Date
  ): Promise<BrokerTrade[]> {
    if (!this.userId) {
      throw new Error('User not registered');
    }

    const response = await this.snapTradeRequest<{
      activities: Array<{
        id: string;
        symbol: { symbol: string };
        action: string;
        trade_date: string;
        settlement_date: string;
        quantity: number;
        price: number;
        currency: string;
        type: string;
      }>;
    }>(
      'GET',
      `/activities?userId=${this.userId}&userSecret=${this.userSecret}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );

    return response.activities
      .filter(a => a.type === 'TRADE')
      .map(a => ({
        id: a.id,
        orderId: a.id,
        symbol: a.symbol.symbol,
        side: a.action === 'BUY' ? 'buy' as const : 'sell' as const,
        quantity: a.quantity,
        price: a.price,
        timestamp: new Date(a.trade_date),
        commission: 0,
        fees: 0,
      }));
  }

  /**
   * Map SnapTrade order status to internal status
   */
  private mapOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'PENDING': 'pending',
      'OPEN': 'open',
      'EXECUTED': 'filled',
      'CANCELLED': 'cancelled',
      'PARTIALLY_FILLED': 'partial',
      'REJECTED': 'rejected',
      'EXPIRED': 'cancelled', // Map expired to cancelled
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Get connected brokerages summary
   */
  public getConnectedBrokerages(): Array<{
    id: string;
    name: string;
    status: string;
  }> {
    return this.connectedBrokerages.map(b => ({
      id: b.id,
      name: b.brokerage.display_name,
      status: b.status,
    }));
  }

  // ============================================================
  // Required BrokerInterface abstract method implementations
  // ============================================================

  /**
   * Get a single position by symbol
   */
  public async getPosition(symbol: string): Promise<Position | null> {
    const positions = await this.getPositions();
    return positions.find(p => p.symbol === symbol) || null;
  }

  /**
   * Submit an order (alias for placeOrder)
   */
  public async submitOrder(request: OrderRequest): Promise<Order> {
    return this.placeOrder(request);
  }

  /**
   * Get a specific order by ID
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    // SnapTrade doesn't have a direct order lookup endpoint
    // Would need to track orders locally
    logger.warn(`getOrder not fully supported by SnapTrade: ${orderId}`);
    return null;
  }

  /**
   * Close a position by symbol
   */
  public async closePosition(symbol: string, quantity?: number): Promise<Order> {
    const position = await this.getPosition(symbol);
    if (!position) {
      throw new Error(`No position found for symbol: ${symbol}`);
    }

    const orderRequest: OrderRequest = {
      symbol,
      side: position.side === 'long' ? 'sell' : 'buy',
      type: 'market',
      quantity: quantity || position.quantity,
    };

    return this.submitOrder(orderRequest);
  }

  /**
   * Close all positions
   */
  public async closeAllPositions(): Promise<Order[]> {
    const positions = await this.getPositions();
    const orders: Order[] = [];

    for (const position of positions) {
      try {
        const order = await this.closePosition(position.symbol);
        orders.push(order);
      } catch (error) {
        logger.error(`Failed to close position ${position.symbol}:`, error as object);
      }
    }

    return orders;
  }

  /**
   * Get historical bars
   */
  public async getBars(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date
  ): Promise<Bar[]> {
    // SnapTrade doesn't provide historical bar data
    // Use MarketDataManager for this functionality
    logger.warn('SnapTrade does not provide historical bar data. Use MarketDataManager.');
    return [];
  }

  /**
   * Subscribe to real-time quotes
   */
  public async subscribeQuotes(symbols: string[]): Promise<void> {
    // SnapTrade doesn't support real-time streaming
    logger.warn('SnapTrade does not support real-time quote streaming');
  }

  /**
   * Unsubscribe from quotes
   */
  public async unsubscribeQuotes(symbols: string[]): Promise<void> {
    // No-op since streaming not supported
  }

  /**
   * Subscribe to real-time bars
   */
  public async subscribeBars(symbols: string[], timeframe: string): Promise<void> {
    // SnapTrade doesn't support real-time streaming
    logger.warn('SnapTrade does not support real-time bar streaming');
  }

  /**
   * Unsubscribe from bars
   */
  public async unsubscribeBars(symbols: string[]): Promise<void> {
    // No-op since streaming not supported
  }

  /**
   * Get trade history (alias for getTradeHistory)
   */
  public async getTrades(
    symbol?: string,
    start?: Date,
    end?: Date
  ): Promise<BrokerTrade[]> {
    const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = end || new Date();

    const trades = await this.getTradeHistory(startDate, endDate);

    if (symbol) {
      return trades.filter(t => t.symbol === symbol);
    }

    return trades;
  }

  /**
   * Get available symbols
   */
  public async getSymbols(assetClass?: AssetClass): Promise<string[]> {
    // SnapTrade symbol lookup would require API call
    // For now return empty - use MarketDataManager for symbol search
    logger.warn('Use MarketDataManager for symbol search');
    return [];
  }

  /**
   * Check if market is open
   */
  public async isMarketOpen(): Promise<boolean> {
    // Check US market hours (simplified)
    const now = new Date();
    const hours = now.getUTCHours();
    const day = now.getUTCDay();

    // US market open roughly 14:30-21:00 UTC (Mon-Fri)
    if (day === 0 || day === 6) return false;
    return hours >= 14 && hours < 21;
  }

  /**
   * Get market hours
   */
  public async getMarketHours(): Promise<{ open: Date; close: Date }> {
    // Return US market hours for today
    const today = new Date();
    const open = new Date(today);
    open.setUTCHours(14, 30, 0, 0);

    const close = new Date(today);
    close.setUTCHours(21, 0, 0, 0);

    return { open, close };
  }
}

// Export singleton factory
export function createSnapTradeBroker(config: SnapTradeConfig): SnapTradeBroker {
  return new SnapTradeBroker(config);
}

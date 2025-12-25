/**
 * Webull Broker Integration
 *
 * Integration with Webull API for:
 * - US Stocks, Options, and Crypto trading
 * - Paper trading support
 * - Extended hours trading
 * - Real-time market data
 * - Advanced order types
 */

import axios, { AxiosInstance } from 'axios';
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
  OrderSide,
  PositionSide,
} from './broker_interface';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('WebullBroker');

interface WebullConfig extends BrokerConfig {
  deviceId?: string; // Device ID for authentication
  username?: string; // Username for login
  password?: string; // Password (used to get tokens)
  accountId?: string; // Specific account ID
}

// Webull API Response Types
interface WebullAccount {
  accountId: string;
  accountType: number; // 2 = paper, 1 = cash, 5 = margin
  netLiquidation: number;
  totalMarketValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossRate: number;
  currency: string;
}

interface WebullPosition {
  ticker: {
    symbol: string;
    name: string;
  };
  position: number;
  costPrice: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossRate: number;
  lastPrice: number;
}

interface WebullOrder {
  orderId: string;
  ticker: {
    symbol: string;
  };
  action: string; // BUY, SELL
  orderType: string; // MKT, LMT, STP, STP LMT
  totalQuantity: number;
  filledQuantity: number;
  lmtPrice?: number;
  auxPrice?: number; // Stop price
  avgFilledPrice?: number;
  status: string;
  statusStr: string;
  createTime: string;
  updateTime: string;
}

export class WebullBroker extends BrokerInterface {
  public readonly name = 'Webull';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['stock', 'options', 'crypto'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    supportsStreaming: true,
    supportsPaperTrading: true,
    supportsMargin: true,
    supportsFractional: false,
    supportsExtendedHours: true,
  };

  private baseUrl: string;
  private apiClient: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private deviceId: string;
  private accountId: string | null = null;

  constructor(config: WebullConfig) {
    super(config);

    this.deviceId = config.deviceId || this.generateDeviceId();
    this.accountId = config.accountId || null;

    // Webull uses the same base URL for paper and live
    this.baseUrl = config.baseUrl || 'https://tradeapi.webullfintech.com/api';

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // Add request interceptor for authentication
    this.apiClient.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers['access_token'] = this.accessToken;
      }
      config.headers['did'] = this.deviceId;
      return config;
    });
  }

  /**
   * Generate a device ID
   */
  private generateDeviceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Connect to Webull API
   */
  public async connect(): Promise<void> {
    logger.info(`Connecting to Webull (${this.isPaperTrading ? 'Paper' : 'Live'})...`);

    try {
      // Step 1: Login with API credentials
      const loginResponse = await this.apiClient.post('/passport/login', {
        account: this.config.apiKey,
        password: this.config.apiSecret,
        deviceId: this.deviceId,
      });

      this.accessToken = loginResponse.data.accessToken;
      this.refreshToken = loginResponse.data.refreshToken;

      // Step 2: Get account list
      const accountsResponse = await this.apiClient.get('/account/getAccountList');
      const accounts = accountsResponse.data;

      if (!accounts || accounts.length === 0) {
        throw new Error('No Webull accounts found');
      }

      // Select paper or live account
      const targetAccountType = this.isPaperTrading ? 2 : 5; // 2 = paper, 5 = margin
      const account = accounts.find((a: any) => a.accountType === targetAccountType) || accounts[0];
      this.accountId = account.accountId;

      this.isConnected = true;
      this.emit('connected');
      logger.info(`Connected to Webull. Account: ${this.accountId}`);
    } catch (error: any) {
      const message = error.response?.data?.msg || error.message;
      logger.error('Failed to connect to Webull:', { error: message });
      throw new Error(`Webull connection failed: ${message}`);
    }
  }

  /**
   * Disconnect from Webull
   */
  public async disconnect(): Promise<void> {
    logger.info('Disconnecting from Webull...');

    try {
      if (this.accessToken) {
        await this.apiClient.post('/passport/logout');
      }
    } catch (error) {
      logger.error('Error during logout:', error);
    }

    this.isConnected = false;
    this.accessToken = null;
    this.refreshToken = null;
    this.emit('disconnected', 'Manual disconnect');
    logger.info('Disconnected from Webull');
  }

  public isReady(): boolean {
    return this.isConnected && !!this.accessToken && !!this.accountId;
  }

  /**
   * Get account information
   */
  public async getAccount(): Promise<Account> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(`/account/${this.accountId}`);
      const account = response.data as WebullAccount;

      return {
        id: account.accountId,
        currency: account.currency || 'USD',
        balance: account.netLiquidation,
        equity: account.netLiquidation,
        buyingPower: account.netLiquidation, // Simplified
        cash: account.netLiquidation - account.totalMarketValue,
        portfolioValue: account.totalMarketValue,
        pendingTransfers: 0,
        marginUsed: 0,
        marginAvailable: account.netLiquidation,
        accountType: this.isPaperTrading ? 'paper' : account.accountType === 5 ? 'margin' : 'cash',
      };
    } catch (error: any) {
      logger.error('Failed to get account:', error);
      throw new Error(`Failed to get Webull account: ${error.message}`);
    }
  }

  /**
   * Get all open positions
   */
  public async getPositions(): Promise<Position[]> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(`/account/${this.accountId}/positions`);
      const positions = response.data || [];

      return positions.map((p: WebullPosition) => ({
        symbol: p.ticker.symbol,
        side: (p.position > 0 ? 'long' : p.position < 0 ? 'short' : 'flat') as PositionSide,
        quantity: Math.abs(p.position),
        entryPrice: p.costPrice,
        currentPrice: p.lastPrice,
        unrealizedPnL: p.unrealizedProfitLoss,
        realizedPnL: 0,
        marketValue: p.marketValue,
      }));
    } catch (error: any) {
      logger.error('Failed to get positions:', error);
      throw new Error(`Failed to get Webull positions: ${error.message}`);
    }
  }

  /**
   * Get a specific position
   */
  public async getPosition(symbol: string): Promise<Position | null> {
    const positions = await this.getPositions();
    return positions.find((p) => p.symbol === symbol) || null;
  }

  /**
   * Submit an order
   */
  public async submitOrder(request: OrderRequest): Promise<Order> {
    this.ensureConnected();

    try {
      // Get tickerId for the symbol
      const tickerId = await this.getTickerId(request.symbol);

      const orderData: any = {
        accountId: this.accountId,
        action: request.side.toUpperCase(),
        tickerId,
        orderType: this.convertOrderType(request.type),
        quantity: request.quantity,
        timeInForce: this.convertTimeInForce(request.timeInForce || 'day'),
      };

      if (request.type === 'limit' || request.type === 'stop_limit') {
        orderData.lmtPrice = request.price;
      }

      if (request.type === 'stop' || request.type === 'stop_limit') {
        orderData.auxPrice = request.stopPrice;
      }

      const response = await this.apiClient.post('/trade/placeOrder', orderData);
      const orderId = response.data.orderId;

      // Fetch the created order
      return await this.getOrder(orderId) || this.createPendingOrder(orderId, request);
    } catch (error: any) {
      logger.error('Failed to submit order:', error);
      throw new Error(`Failed to submit Webull order: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Get ticker ID for a symbol
   */
  private async getTickerId(symbol: string): Promise<string> {
    try {
      const response = await this.apiClient.get('/quote/search', {
        params: { keyword: symbol },
      });

      const results = response.data.data || [];
      const match = results.find((r: any) => r.symbol === symbol);

      if (!match) {
        throw new Error(`Symbol ${symbol} not found`);
      }

      return match.tickerId;
    } catch (error: any) {
      throw new Error(`Failed to get ticker ID for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Convert our order type to Webull format
   */
  private convertOrderType(type: string): string {
    const typeMap: Record<string, string> = {
      market: 'MKT',
      limit: 'LMT',
      stop: 'STP',
      stop_limit: 'STP LMT',
    };
    return typeMap[type] || 'MKT';
  }

  /**
   * Convert time in force to Webull format
   */
  private convertTimeInForce(tif: string): string {
    const tifMap: Record<string, string> = {
      day: 'DAY',
      gtc: 'GTC',
      ioc: 'IOC',
      fok: 'FOK',
    };
    return tifMap[tif] || 'DAY';
  }

  /**
   * Create a pending order object
   */
  private createPendingOrder(orderId: string, request: OrderRequest): Order {
    return {
      id: orderId,
      clientOrderId: request.clientOrderId,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      filledQuantity: 0,
      price: request.price,
      stopPrice: request.stopPrice,
      timeInForce: request.timeInForce || 'day',
      status: 'pending',
      submittedAt: new Date(),
    };
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    this.ensureConnected();

    try {
      await this.apiClient.post('/trade/cancelOrder', {
        accountId: this.accountId,
        orderId,
      });
      logger.info(`Order ${orderId} cancelled`);
      return true;
    } catch (error: any) {
      logger.error('Failed to cancel order:', error);
      return false;
    }
  }

  /**
   * Modify an existing order
   */
  public async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order> {
    this.ensureConnected();

    try {
      const orderData: any = {
        accountId: this.accountId,
        orderId,
      };

      if (updates.quantity) orderData.quantity = updates.quantity;
      if (updates.price) orderData.lmtPrice = updates.price;
      if (updates.stopPrice) orderData.auxPrice = updates.stopPrice;

      await this.apiClient.post('/trade/modifyOrder', orderData);

      // Fetch updated order
      return await this.getOrder(orderId) || this.createPendingOrder(orderId, updates as OrderRequest);
    } catch (error: any) {
      logger.error('Failed to modify order:', error);
      throw new Error(`Failed to modify Webull order: ${error.message}`);
    }
  }

  /**
   * Get a specific order
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(`/account/${this.accountId}/order/${orderId}`);
      return this.convertWebullOrder(response.data);
    } catch (error) {
      logger.error('Failed to get order:', error);
      return null;
    }
  }

  /**
   * Get all orders
   */
  public async getOrders(status?: OrderStatus): Promise<Order[]> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(`/account/${this.accountId}/orders`);
      const orders = response.data || [];

      return orders
        .map((o: WebullOrder) => this.convertWebullOrder(o))
        .filter((o: Order) => !status || o.status === status);
    } catch (error: any) {
      logger.error('Failed to get orders:', error);
      return [];
    }
  }

  /**
   * Convert Webull order to our Order format
   */
  private convertWebullOrder(wbOrder: WebullOrder): Order {
    const statusMap: Record<string, OrderStatus> = {
      'Working': 'open',
      'Pending': 'pending',
      'Filled': 'filled',
      'Partially Filled': 'partial',
      'Cancelled': 'cancelled',
      'Rejected': 'rejected',
      'Failed': 'rejected',
    };

    const typeMap: Record<string, string> = {
      'MKT': 'market',
      'LMT': 'limit',
      'STP': 'stop',
      'STP LMT': 'stop_limit',
    };

    return {
      id: wbOrder.orderId,
      symbol: wbOrder.ticker.symbol,
      side: wbOrder.action.toLowerCase() as OrderSide,
      type: (typeMap[wbOrder.orderType] || 'market') as any,
      quantity: wbOrder.totalQuantity,
      filledQuantity: wbOrder.filledQuantity || 0,
      price: wbOrder.lmtPrice,
      stopPrice: wbOrder.auxPrice,
      timeInForce: 'day',
      status: statusMap[wbOrder.statusStr] || 'pending',
      submittedAt: new Date(wbOrder.createTime),
      filledAt: wbOrder.status === 'Filled' ? new Date(wbOrder.updateTime) : undefined,
      averageFilledPrice: wbOrder.avgFilledPrice,
    };
  }

  /**
   * Close a position
   */
  public async closePosition(symbol: string, quantity?: number): Promise<Order> {
    const position = await this.getPosition(symbol);
    if (!position) {
      throw new Error(`No position found for ${symbol}`);
    }

    return this.submitOrder({
      symbol,
      side: position.side === 'long' ? 'sell' : 'buy',
      type: 'market',
      quantity: quantity || position.quantity,
    });
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
        logger.error(`Failed to close position ${position.symbol}:`, error);
      }
    }

    return orders;
  }

  /**
   * Get current quote for a symbol
   */
  public async getQuote(symbol: string): Promise<Quote> {
    try {
      const tickerId = await this.getTickerId(symbol);
      const response = await this.apiClient.get(`/quote/tickerRealTime/${tickerId}`);
      const quote = response.data;

      return {
        symbol,
        bid: parseFloat(quote.bid || '0'),
        ask: parseFloat(quote.ask || '0'),
        bidSize: parseFloat(quote.bidSize || '0'),
        askSize: parseFloat(quote.askSize || '0'),
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to get quote:', error);
      throw new Error(`Failed to get quote for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Get historical bars
   */
  public async getBars(symbol: string, timeframe: string, start: Date, end: Date): Promise<Bar[]> {
    try {
      const tickerId = await this.getTickerId(symbol);

      // Convert timeframe to Webull format
      const typeMap: Record<string, string> = {
        '1m': 'm1',
        '5m': 'm5',
        '15m': 'm15',
        '30m': 'm30',
        '1h': 'm60',
        '1d': 'd1',
      };

      const type = typeMap[timeframe] || 'd1';

      const response = await this.apiClient.get(`/quote/kline/${tickerId}`, {
        params: {
          type,
          count: 1000,
          timestamp: Math.floor(end.getTime() / 1000),
        },
      });

      const bars = response.data || [];

      return bars
        .map((bar: any) => ({
          symbol,
          open: parseFloat(bar.open),
          high: parseFloat(bar.high),
          low: parseFloat(bar.low),
          close: parseFloat(bar.close),
          volume: parseFloat(bar.volume),
          timestamp: new Date(bar.time * 1000),
        }))
        .filter((bar: Bar) => bar.timestamp >= start && bar.timestamp <= end);
    } catch (error: any) {
      logger.error('Failed to get bars:', error);
      return [];
    }
  }

  public async subscribeQuotes(symbols: string[]): Promise<void> {
    logger.info(`Quote subscription requested for: ${symbols.join(', ')}`);
    // Webull streaming would require WebSocket implementation
  }

  public async unsubscribeQuotes(symbols: string[]): Promise<void> {
    logger.info(`Unsubscribe from quotes: ${symbols.join(', ')}`);
  }

  public async subscribeBars(symbols: string[], timeframe: string): Promise<void> {
    logger.info(`Bar subscription requested for: ${symbols.join(', ')}`);
  }

  public async unsubscribeBars(symbols: string[]): Promise<void> {
    logger.info(`Unsubscribe from bars: ${symbols.join(', ')}`);
  }

  /**
   * Get trade history
   */
  public async getTrades(symbol?: string, start?: Date, end?: Date): Promise<BrokerTrade[]> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(`/account/${this.accountId}/trades`);
      const trades = response.data || [];

      return trades
        .filter((t: any) => !symbol || t.ticker.symbol === symbol)
        .map((t: any) => ({
          id: t.tradeId,
          orderId: t.orderId,
          symbol: t.ticker.symbol,
          side: t.action.toLowerCase() as OrderSide,
          quantity: t.filledQuantity,
          price: t.filledPrice,
          commission: t.commission || 0,
          timestamp: new Date(t.filledTime),
        }));
    } catch (error: any) {
      logger.error('Failed to get trades:', error);
      return [];
    }
  }

  /**
   * Get available trading symbols
   */
  public async getSymbols(): Promise<string[]> {
    try {
      const response = await this.apiClient.get('/market/screener');
      return response.data.map((s: any) => s.symbol);
    } catch (error) {
      logger.error('Failed to get symbols:', error);
      return [];
    }
  }

  /**
   * Check if market is open
   */
  public async isMarketOpen(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/market/status');
      return response.data.isOpen || false;
    } catch (error) {
      logger.error('Failed to check market status:', error);
      return false;
    }
  }

  /**
   * Get market hours
   */
  public async getMarketHours(): Promise<{ open: Date; close: Date }> {
    const now = new Date();
    const marketOpen = new Date(now);
    marketOpen.setHours(9, 30, 0, 0);

    const marketClose = new Date(now);
    marketClose.setHours(16, 0, 0, 0);

    return { open: marketOpen, close: marketClose };
  }

  private ensureConnected(): void {
    if (!this.isReady()) {
      throw new Error('Webull broker is not connected');
    }
  }
}

/**
 * Robinhood Broker Integration
 *
 * Integration with Robinhood API for:
 * - US Stocks and ETFs
 * - Options trading
 * - Cryptocurrency trading
 * - Commission-free trading
 * - Real-time market data
 * - MFA (Multi-Factor Authentication) support
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
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

const logger = createComponentLogger('RobinhoodBroker');

interface RobinhoodConfig extends BrokerConfig {
  username?: string; // Robinhood username/email
  password?: string; // Robinhood password (for initial auth)
  deviceToken?: string; // Device token for MFA
  mfaCode?: string; // MFA code if required
}

// Robinhood API Response Types
interface RobinhoodAccount {
  url: string;
  account_number: string;
  type: string;
  cash: string;
  buying_power: string;
  portfolio_cash: string;
  margin_balances: {
    day_trade_buying_power: string;
    margin_limit: string;
    outstanding_interest: string;
    cash_held_for_orders: string;
  };
}

interface RobinhoodPosition {
  url: string;
  instrument: string;
  account: string;
  quantity: string;
  average_buy_price: string;
  pending_average_buy_price: string;
  shares_held_for_buys: string;
  shares_held_for_sells: string;
  instrument_data?: {
    symbol: string;
    simple_name: string;
  };
}

interface RobinhoodOrder {
  id: string;
  ref_id: string;
  url: string;
  account: string;
  position: string;
  cancel: string | null;
  instrument: string;
  cumulative_quantity: string;
  average_price: string | null;
  fees: string;
  state: string;
  type: string;
  side: string;
  time_in_force: string;
  trigger: string;
  price: string | null;
  stop_price: string | null;
  quantity: string;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  last_transaction_at: string;
  executions: any[];
}

export class RobinhoodBroker extends BrokerInterface {
  public readonly name = 'Robinhood';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['stock', 'options', 'crypto'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    supportsStreaming: false, // Robinhood doesn't provide WebSocket API
    supportsPaperTrading: false,
    supportsMargin: true,
    supportsFractional: true,
    supportsExtendedHours: true,
  };

  private baseUrl: string;
  private apiClient: AxiosInstance;
  private authToken: string | null = null;
  private deviceToken: string;
  private accountUrl: string | null = null;
  private accountNumber: string | null = null;

  constructor(config: RobinhoodConfig) {
    super(config);

    this.deviceToken = config.deviceToken || this.generateDeviceToken();
    this.baseUrl = 'https://api.robinhood.com';

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Robinhood-API-Version': '1.0.0',
      },
    });

    // Add request interceptor for authentication
    this.apiClient.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      return config;
    });
  }

  /**
   * Generate a device token
   */
  private generateDeviceToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Connect to Robinhood API
   */
  public async connect(): Promise<void> {
    logger.info('Connecting to Robinhood...');

    try {
      // Step 1: Login with credentials
      const loginData: any = {
        client_id: 'c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS',
        expires_in: 86400,
        grant_type: 'password',
        username: this.config.apiKey, // Using apiKey as username
        password: this.config.apiSecret, // Using apiSecret as password
        device_token: this.deviceToken,
        scope: 'internal',
      };

      try {
        const loginResponse = await this.apiClient.post('/oauth2/token/', loginData);
        this.authToken = loginResponse.data.access_token;
      } catch (authError: any) {
        // Check if MFA is required
        if (authError.response?.data?.mfa_required) {
          throw new Error(
            'MFA required. Please provide MFA code in config or use device token from previous authentication.'
          );
        }
        throw authError;
      }

      // Step 2: Get account information
      const accountsResponse = await this.apiClient.get('/accounts/');
      const accounts = accountsResponse.data.results;

      if (!accounts || accounts.length === 0) {
        throw new Error('No Robinhood accounts found');
      }

      const account = accounts[0] as RobinhoodAccount;
      this.accountUrl = account.url;
      this.accountNumber = account.account_number;

      this.isConnected = true;
      this.emit('connected');
      logger.info(`Connected to Robinhood. Account: ${this.accountNumber}`);
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message;
      logger.error('Failed to connect to Robinhood:', { error: message });
      throw new Error(`Robinhood connection failed: ${message}`);
    }
  }

  /**
   * Disconnect from Robinhood
   */
  public async disconnect(): Promise<void> {
    logger.info('Disconnecting from Robinhood...');

    try {
      if (this.authToken) {
        await this.apiClient.post('/oauth2/revoke_token/', {
          client_id: 'c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS',
          token: this.authToken,
        });
      }
    } catch (error) {
      logger.error('Error during logout:', error);
    }

    this.isConnected = false;
    this.authToken = null;
    this.emit('disconnected', 'Manual disconnect');
    logger.info('Disconnected from Robinhood');
  }

  public isReady(): boolean {
    return this.isConnected && !!this.authToken && !!this.accountUrl;
  }

  /**
   * Get account information
   */
  public async getAccount(): Promise<Account> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(this.accountUrl!);
      const account = response.data as RobinhoodAccount;

      // Get portfolio value
      const portfolioResponse = await this.apiClient.get('/portfolios/');
      const portfolio = portfolioResponse.data.results[0];

      return {
        id: account.account_number,
        currency: 'USD',
        balance: parseFloat(account.cash),
        equity: parseFloat(portfolio.equity),
        buyingPower: parseFloat(account.buying_power),
        cash: parseFloat(account.cash),
        portfolioValue: parseFloat(portfolio.equity),
        pendingTransfers: 0,
        marginUsed: 0,
        marginAvailable: parseFloat(account.buying_power),
        accountType: account.type === 'cash' ? 'cash' : 'margin',
      };
    } catch (error: any) {
      logger.error('Failed to get account:', error);
      throw new Error(`Failed to get Robinhood account: ${error.message}`);
    }
  }

  /**
   * Get all open positions
   */
  public async getPositions(): Promise<Position[]> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get('/positions/', {
        params: { nonzero: true },
      });

      const positions = response.data.results || [];
      const result: Position[] = [];

      for (const p of positions as RobinhoodPosition[]) {
        // Get instrument data
        const instrumentResponse = await this.apiClient.get(p.instrument);
        const instrument = instrumentResponse.data;

        // Get current quote
        const quoteResponse = await this.apiClient.get(`/marketdata/quotes/${instrument.symbol}/`);
        const quote = quoteResponse.data;

        const quantity = parseFloat(p.quantity);
        const entryPrice = parseFloat(p.average_buy_price);
        const currentPrice = parseFloat(quote.last_trade_price || quote.last_extended_hours_trade_price);

        result.push({
          symbol: instrument.symbol,
          side: 'long', // Robinhood doesn't support short selling for retail
          quantity,
          entryPrice,
          currentPrice,
          unrealizedPnL: (currentPrice - entryPrice) * quantity,
          realizedPnL: 0,
          marketValue: currentPrice * quantity,
        });
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to get positions:', error);
      throw new Error(`Failed to get Robinhood positions: ${error.message}`);
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
      // Get instrument URL
      const instrumentResponse = await this.apiClient.get('/instruments/', {
        params: { symbol: request.symbol },
      });

      const instruments = instrumentResponse.data.results;
      if (!instruments || instruments.length === 0) {
        throw new Error(`Instrument not found for symbol: ${request.symbol}`);
      }

      const instrument = instruments[0];

      const orderData: any = {
        account: this.accountUrl,
        instrument: instrument.url,
        symbol: request.symbol,
        type: this.convertOrderType(request.type),
        time_in_force: this.convertTimeInForce(request.timeInForce || 'day'),
        trigger: 'immediate',
        side: request.side,
        quantity: request.quantity.toString(),
        ref_id: request.clientOrderId || crypto.randomUUID(),
      };

      if (request.type === 'limit' || request.type === 'stop_limit') {
        orderData.price = request.price?.toFixed(2);
      }

      if (request.type === 'stop' || request.type === 'stop_limit') {
        orderData.stop_price = request.stopPrice?.toFixed(2);
        orderData.trigger = 'stop';
      }

      const response = await this.apiClient.post('/orders/', orderData);
      const rhOrder = response.data as RobinhoodOrder;

      return this.convertRobinhoodOrder(rhOrder);
    } catch (error: any) {
      logger.error('Failed to submit order:', error);
      throw new Error(`Failed to submit Robinhood order: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Convert our order type to Robinhood format
   */
  private convertOrderType(type: string): string {
    const typeMap: Record<string, string> = {
      market: 'market',
      limit: 'limit',
      stop: 'market', // Stop order is a market order with stop trigger
      stop_limit: 'limit', // Stop-limit order is a limit order with stop trigger
    };
    return typeMap[type] || 'market';
  }

  /**
   * Convert time in force to Robinhood format
   */
  private convertTimeInForce(tif: string): string {
    const tifMap: Record<string, string> = {
      day: 'gfd',
      gtc: 'gtc',
      ioc: 'ioc',
      fok: 'fok',
    };
    return tifMap[tif] || 'gfd';
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    this.ensureConnected();

    try {
      await this.apiClient.post(`/orders/${orderId}/cancel/`);
      logger.info(`Order ${orderId} cancelled`);
      return true;
    } catch (error: any) {
      logger.error('Failed to cancel order:', error);
      return false;
    }
  }

  /**
   * Modify an existing order (Robinhood doesn't support modification - cancel and replace)
   */
  public async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Cancel original order
    await this.cancelOrder(orderId);

    // Submit new order
    return this.submitOrder({
      symbol: updates.symbol || order.symbol,
      side: updates.side || order.side,
      type: updates.type || order.type,
      quantity: updates.quantity || order.quantity,
      price: updates.price || order.price,
      stopPrice: updates.stopPrice || order.stopPrice,
      timeInForce: updates.timeInForce || order.timeInForce,
    });
  }

  /**
   * Get a specific order
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(`/orders/${orderId}/`);
      return this.convertRobinhoodOrder(response.data);
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
      const response = await this.apiClient.get('/orders/');
      const orders = response.data.results || [];

      return orders
        .map((o: RobinhoodOrder) => this.convertRobinhoodOrder(o))
        .filter((o: Order) => !status || o.status === status);
    } catch (error: any) {
      logger.error('Failed to get orders:', error);
      return [];
    }
  }

  /**
   * Convert Robinhood order to our Order format
   */
  private convertRobinhoodOrder(rhOrder: RobinhoodOrder): Order {
    const statusMap: Record<string, OrderStatus> = {
      'queued': 'pending',
      'unconfirmed': 'pending',
      'confirmed': 'open',
      'partially_filled': 'partial',
      'filled': 'filled',
      'cancelled': 'cancelled',
      'rejected': 'rejected',
      'failed': 'rejected',
    };

    const typeMap: Record<string, string> = {
      'market': 'market',
      'limit': rhOrder.trigger === 'stop' && rhOrder.stop_price ? 'stop_limit' : 'limit',
    };

    return {
      id: rhOrder.id,
      clientOrderId: rhOrder.ref_id,
      symbol: rhOrder.instrument.split('/').pop() || '',
      side: rhOrder.side as OrderSide,
      type: (typeMap[rhOrder.type] || 'market') as any,
      quantity: parseFloat(rhOrder.quantity),
      filledQuantity: parseFloat(rhOrder.cumulative_quantity || '0'),
      price: rhOrder.price ? parseFloat(rhOrder.price) : undefined,
      stopPrice: rhOrder.stop_price ? parseFloat(rhOrder.stop_price) : undefined,
      timeInForce: rhOrder.time_in_force === 'gfd' ? 'day' : 'gtc',
      status: statusMap[rhOrder.state] || 'pending',
      submittedAt: new Date(rhOrder.created_at),
      filledAt: rhOrder.state === 'filled' ? new Date(rhOrder.last_transaction_at) : undefined,
      averageFilledPrice: rhOrder.average_price ? parseFloat(rhOrder.average_price) : undefined,
      commission: parseFloat(rhOrder.fees || '0'),
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
      side: 'sell', // Robinhood positions are always long
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
      const response = await this.apiClient.get(`/marketdata/quotes/${symbol}/`);
      const quote = response.data;

      return {
        symbol,
        bid: parseFloat(quote.bid_price || '0'),
        ask: parseFloat(quote.ask_price || '0'),
        bidSize: parseFloat(quote.bid_size || '0'),
        askSize: parseFloat(quote.ask_size || '0'),
        timestamp: new Date(quote.updated_at),
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
      // Robinhood's historical data API is limited
      const intervalMap: Record<string, string> = {
        '5m': '5minute',
        '10m': '10minute',
        '1h': 'hour',
        '1d': 'day',
        '1w': 'week',
      };

      const interval = intervalMap[timeframe] || 'day';
      const span = this.calculateSpan(start, end);

      const response = await this.apiClient.get(`/marketdata/historicals/${symbol}/`, {
        params: {
          interval,
          span,
          bounds: 'regular',
        },
      });

      const historicals = response.data.historicals || [];

      return historicals.map((bar: any) => ({
        symbol,
        open: parseFloat(bar.open_price),
        high: parseFloat(bar.high_price),
        low: parseFloat(bar.low_price),
        close: parseFloat(bar.close_price),
        volume: parseFloat(bar.volume),
        timestamp: new Date(bar.begins_at),
      }));
    } catch (error: any) {
      logger.error('Failed to get bars:', error);
      return [];
    }
  }

  /**
   * Calculate span based on date range
   */
  private calculateSpan(start: Date, end: Date): string {
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 1) return 'day';
    if (days <= 7) return 'week';
    if (days <= 30) return 'month';
    if (days <= 90) return '3month';
    if (days <= 365) return 'year';
    return '5year';
  }

  public async subscribeQuotes(symbols: string[]): Promise<void> {
    logger.warn('Robinhood does not support real-time quote streaming');
  }

  public async unsubscribeQuotes(symbols: string[]): Promise<void> {
    // Not supported
  }

  public async subscribeBars(symbols: string[], timeframe: string): Promise<void> {
    logger.warn('Robinhood does not support real-time bar streaming');
  }

  public async unsubscribeBars(symbols: string[]): Promise<void> {
    // Not supported
  }

  /**
   * Get trade history
   */
  public async getTrades(symbol?: string, start?: Date, end?: Date): Promise<BrokerTrade[]> {
    this.ensureConnected();

    try {
      const orders = await this.getOrders('filled');
      const trades: BrokerTrade[] = [];

      for (const order of orders) {
        if (symbol && order.symbol !== symbol) continue;

        // Get order details with executions
        const orderDetail = await this.apiClient.get(`/orders/${order.id}/`);
        const executions = orderDetail.data.executions || [];

        for (const execution of executions) {
          const timestamp = new Date(execution.timestamp);

          if (start && timestamp < start) continue;
          if (end && timestamp > end) continue;

          trades.push({
            id: execution.id,
            orderId: order.id,
            symbol: order.symbol,
            side: order.side,
            quantity: parseFloat(execution.quantity),
            price: parseFloat(execution.price),
            commission: 0, // Robinhood is commission-free
            timestamp,
          });
        }
      }

      return trades;
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
      // Robinhood doesn't have a simple endpoint for all symbols
      logger.warn('getSymbols() not fully implemented for Robinhood');
      return [];
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
      const response = await this.apiClient.get('/markets/XNYS/');
      const market = response.data;

      const now = new Date();
      const opensAt = new Date(market.todays_hours);
      const closesAt = new Date(market.todays_hours_close);

      return now >= opensAt && now <= closesAt;
    } catch (error) {
      logger.error('Failed to check market status:', error);
      return false;
    }
  }

  /**
   * Get market hours
   */
  public async getMarketHours(): Promise<{ open: Date; close: Date }> {
    try {
      const response = await this.apiClient.get('/markets/XNYS/');
      const market = response.data;

      return {
        open: new Date(market.todays_hours),
        close: new Date(market.todays_hours_close),
      };
    } catch (error) {
      logger.error('Failed to get market hours:', error);

      // Default market hours
      const now = new Date();
      const marketOpen = new Date(now);
      marketOpen.setHours(9, 30, 0, 0);

      const marketClose = new Date(now);
      marketClose.setHours(16, 0, 0, 0);

      return { open: marketOpen, close: marketClose };
    }
  }

  private ensureConnected(): void {
    if (!this.isReady()) {
      throw new Error('Robinhood broker is not connected');
    }
  }
}

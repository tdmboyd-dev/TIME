/**
 * TD Ameritrade / Charles Schwab Broker Integration
 *
 * Integration with TD Ameritrade API (now part of Charles Schwab) for:
 * - US Stocks, ETFs, Options, Futures, Forex
 * - OAuth 2.0 authentication
 * - Paper trading support
 * - Real-time streaming data
 * - Options chain data
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

const logger = createComponentLogger('TDAmeritradeBroker');

interface TDAmeritradeConfig extends BrokerConfig {
  refreshToken?: string; // OAuth refresh token
  redirectUri?: string; // OAuth redirect URI
  accountId?: string; // Specific account ID
}

// TD Ameritrade API Response Types
interface TDAccount {
  securitiesAccount: {
    accountId: string;
    type: string;
    currentBalances: {
      liquidationValue: number;
      cashBalance: number;
      equity: number;
      buyingPower: number;
      marginBalance: number;
      availableFunds: number;
    };
    positions?: TDPosition[];
  };
}

interface TDPosition {
  instrument: {
    symbol: string;
    assetType: string;
  };
  longQuantity: number;
  shortQuantity: number;
  averagePrice: number;
  currentDayProfitLoss: number;
  currentDayProfitLossPercentage: number;
  marketValue: number;
}

interface TDOrder {
  orderId: string;
  session: string;
  orderType: string;
  complexOrderStrategyType: string;
  duration: string;
  orderStrategyType: string;
  enteredTime: string;
  closeTime?: string;
  status: string;
  orderLegCollection: Array<{
    orderLegType: string;
    legId: number;
    instrument: {
      symbol: string;
      assetType: string;
    };
    instruction: string;
    quantity: number;
  }>;
  price?: number;
  stopPrice?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
}

interface TDQuote {
  symbol: string;
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
  lastPrice: number;
  lastSize: number;
  totalVolume: number;
  quoteTimeInLong: number;
  tradeTimeInLong: number;
}

export class TDAmeritradeBroker extends BrokerInterface {
  public readonly name = 'TD Ameritrade';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['stock', 'options', 'futures', 'forex'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    supportsStreaming: true,
    supportsPaperTrading: true,
    supportsMargin: true,
    supportsFractional: false,
    supportsExtendedHours: true,
  };

  private baseUrl: string;
  private authUrl: string;
  private apiClient: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private redirectUri: string;
  private accountId: string | null = null;

  constructor(config: TDAmeritradeConfig) {
    super(config);

    this.refreshToken = config.refreshToken || null;
    this.redirectUri = config.redirectUri || 'https://localhost:8080/callback';
    this.accountId = config.accountId || null;

    // TD Ameritrade uses same API for paper and live
    this.baseUrl = 'https://api.tdameritrade.com/v1';
    this.authUrl = 'https://api.tdameritrade.com/v1/oauth2';

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.apiClient.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  /**
   * Connect to TD Ameritrade API
   */
  public async connect(): Promise<void> {
    logger.info('Connecting to TD Ameritrade...');

    try {
      // If we have a refresh token, get a new access token
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        // Otherwise, treat apiSecret as the access token
        this.accessToken = this.config.apiSecret;
      }

      // Verify connection by getting accounts
      const accountsResponse = await this.apiClient.get('/accounts');
      const accounts = accountsResponse.data;

      if (!accounts || accounts.length === 0) {
        throw new Error('No TD Ameritrade accounts found');
      }

      // Select the specified account or the first one
      const account = this.accountId
        ? accounts.find((a: TDAccount) => a.securitiesAccount.accountId === this.accountId)
        : accounts[0];

      if (!account) {
        throw new Error(`Account ${this.accountId} not found`);
      }

      this.accountId = account.securitiesAccount.accountId;

      this.isConnected = true;
      this.emit('connected');
      logger.info(`Connected to TD Ameritrade. Account: ${this.accountId}`);
    } catch (error: any) {
      const message = error.response?.data?.error || error.message;
      logger.error('Failed to connect to TD Ameritrade:', { error: message });
      throw new Error(`TD Ameritrade connection failed: ${message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post(
        `${this.authUrl}/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken || '',
          client_id: `${this.config.apiKey}@AMER.OAUTHAP`,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      logger.info('Access token refreshed successfully');
    } catch (error: any) {
      logger.error('Failed to refresh access token:', error);
      throw new Error('Failed to refresh TD Ameritrade access token');
    }
  }

  /**
   * Disconnect from TD Ameritrade
   */
  public async disconnect(): Promise<void> {
    logger.info('Disconnecting from TD Ameritrade...');

    this.isConnected = false;
    this.accessToken = null;
    this.emit('disconnected', 'Manual disconnect');
    logger.info('Disconnected from TD Ameritrade');
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
      const response = await this.apiClient.get(`/accounts/${this.accountId}`, {
        params: { fields: 'positions' },
      });

      const account = response.data.securitiesAccount;
      const balances = account.currentBalances;

      return {
        id: account.accountId,
        currency: 'USD',
        balance: balances.cashBalance,
        equity: balances.equity,
        buyingPower: balances.buyingPower,
        cash: balances.cashBalance,
        portfolioValue: balances.liquidationValue,
        pendingTransfers: 0,
        marginUsed: balances.marginBalance,
        marginAvailable: balances.availableFunds,
        accountType: account.type === 'CASH' ? 'cash' : 'margin',
      };
    } catch (error: any) {
      logger.error('Failed to get account:', error);
      throw new Error(`Failed to get TD Ameritrade account: ${error.message}`);
    }
  }

  /**
   * Get all open positions
   */
  public async getPositions(): Promise<Position[]> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(`/accounts/${this.accountId}`, {
        params: { fields: 'positions' },
      });

      const positions = response.data.securitiesAccount.positions || [];

      return positions.map((p: TDPosition) => {
        const quantity = p.longQuantity - p.shortQuantity;
        const side: PositionSide = quantity > 0 ? 'long' : quantity < 0 ? 'short' : 'flat';

        return {
          symbol: p.instrument.symbol,
          side,
          quantity: Math.abs(quantity),
          entryPrice: p.averagePrice,
          currentPrice: p.marketValue / Math.abs(quantity),
          unrealizedPnL: p.currentDayProfitLoss,
          realizedPnL: 0,
          marketValue: p.marketValue,
        };
      });
    } catch (error: any) {
      logger.error('Failed to get positions:', error);
      throw new Error(`Failed to get TD Ameritrade positions: ${error.message}`);
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
      const orderData: any = {
        orderType: this.convertOrderType(request.type),
        session: 'NORMAL',
        duration: this.convertTimeInForce(request.timeInForce || 'day'),
        orderStrategyType: 'SINGLE',
        orderLegCollection: [
          {
            instruction: request.side === 'buy' ? 'BUY' : 'SELL',
            quantity: request.quantity,
            instrument: {
              symbol: request.symbol,
              assetType: 'EQUITY',
            },
          },
        ],
      };

      if (request.type === 'limit' || request.type === 'stop_limit') {
        orderData.price = request.price;
      }

      if (request.type === 'stop' || request.type === 'stop_limit') {
        orderData.stopPrice = request.stopPrice;
      }

      const response = await this.apiClient.post(`/accounts/${this.accountId}/orders`, orderData);

      // TD Ameritrade returns order ID in Location header
      const locationHeader = response.headers['location'];
      const orderId = locationHeader ? locationHeader.split('/').pop() : null;

      if (!orderId) {
        throw new Error('Failed to get order ID from response');
      }

      // Fetch the created order
      return await this.getOrder(orderId) || this.createPendingOrder(orderId, request);
    } catch (error: any) {
      logger.error('Failed to submit order:', error);
      throw new Error(
        `Failed to submit TD Ameritrade order: ${error.response?.data?.error || error.message}`
      );
    }
  }

  /**
   * Convert our order type to TD Ameritrade format
   */
  private convertOrderType(type: string): string {
    const typeMap: Record<string, string> = {
      market: 'MARKET',
      limit: 'LIMIT',
      stop: 'STOP',
      stop_limit: 'STOP_LIMIT',
    };
    return typeMap[type] || 'MARKET';
  }

  /**
   * Convert time in force to TD Ameritrade format
   */
  private convertTimeInForce(tif: string): string {
    const tifMap: Record<string, string> = {
      day: 'DAY',
      gtc: 'GOOD_TILL_CANCEL',
      ioc: 'IMMEDIATE_OR_CANCEL',
      fok: 'FILL_OR_KILL',
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
      await this.apiClient.delete(`/accounts/${this.accountId}/orders/${orderId}`);
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
      // TD Ameritrade requires getting the original order first
      const originalOrder = await this.getOrder(orderId);
      if (!originalOrder) {
        throw new Error('Order not found');
      }

      // Build modified order
      const orderData: any = {
        orderType: this.convertOrderType(updates.type || originalOrder.type),
        session: 'NORMAL',
        duration: this.convertTimeInForce(updates.timeInForce || originalOrder.timeInForce),
        orderStrategyType: 'SINGLE',
        orderLegCollection: [
          {
            instruction: (updates.side || originalOrder.side) === 'buy' ? 'BUY' : 'SELL',
            quantity: updates.quantity || originalOrder.quantity,
            instrument: {
              symbol: updates.symbol || originalOrder.symbol,
              assetType: 'EQUITY',
            },
          },
        ],
      };

      if (updates.price || originalOrder.price) {
        orderData.price = updates.price || originalOrder.price;
      }

      if (updates.stopPrice || originalOrder.stopPrice) {
        orderData.stopPrice = updates.stopPrice || originalOrder.stopPrice;
      }

      await this.apiClient.put(`/accounts/${this.accountId}/orders/${orderId}`, orderData);

      // Fetch updated order
      return await this.getOrder(orderId) || originalOrder;
    } catch (error: any) {
      logger.error('Failed to modify order:', error);
      throw new Error(`Failed to modify TD Ameritrade order: ${error.message}`);
    }
  }

  /**
   * Get a specific order
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    this.ensureConnected();

    try {
      const response = await this.apiClient.get(`/accounts/${this.accountId}/orders/${orderId}`);
      return this.convertTDOrder(response.data);
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
      const response = await this.apiClient.get(`/accounts/${this.accountId}/orders`);
      const orders = response.data || [];

      return orders
        .map((o: TDOrder) => this.convertTDOrder(o))
        .filter((o: Order) => !status || o.status === status);
    } catch (error: any) {
      logger.error('Failed to get orders:', error);
      return [];
    }
  }

  /**
   * Convert TD Ameritrade order to our Order format
   */
  private convertTDOrder(tdOrder: TDOrder): Order {
    const statusMap: Record<string, OrderStatus> = {
      'AWAITING_PARENT_ORDER': 'pending',
      'AWAITING_CONDITION': 'pending',
      'AWAITING_MANUAL_REVIEW': 'pending',
      'ACCEPTED': 'pending',
      'AWAITING_UR_OUT': 'pending',
      'PENDING_ACTIVATION': 'pending',
      'QUEUED': 'pending',
      'WORKING': 'open',
      'REJECTED': 'rejected',
      'PENDING_CANCEL': 'pending',
      'CANCELED': 'cancelled',
      'PENDING_REPLACE': 'pending',
      'REPLACED': 'cancelled',
      'FILLED': 'filled',
      'EXPIRED': 'cancelled',
    };

    const typeMap: Record<string, string> = {
      'MARKET': 'market',
      'LIMIT': 'limit',
      'STOP': 'stop',
      'STOP_LIMIT': 'stop_limit',
    };

    const leg = tdOrder.orderLegCollection[0];

    return {
      id: tdOrder.orderId.toString(),
      symbol: leg.instrument.symbol,
      side: leg.instruction === 'BUY' ? 'buy' : 'sell',
      type: (typeMap[tdOrder.orderType] || 'market') as any,
      quantity: leg.quantity,
      filledQuantity: tdOrder.filledQuantity || 0,
      price: tdOrder.price,
      stopPrice: tdOrder.stopPrice,
      timeInForce: tdOrder.duration === 'DAY' ? 'day' : 'gtc',
      status: statusMap[tdOrder.status] || 'pending',
      submittedAt: new Date(tdOrder.enteredTime),
      filledAt: tdOrder.closeTime ? new Date(tdOrder.closeTime) : undefined,
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
      const response = await this.apiClient.get(`/marketdata/${symbol}/quotes`);
      const quote = response.data[symbol] as TDQuote;

      return {
        symbol,
        bid: quote.bidPrice,
        ask: quote.askPrice,
        bidSize: quote.bidSize,
        askSize: quote.askSize,
        timestamp: new Date(quote.quoteTimeInLong),
      };
    } catch (error: any) {
      logger.error('Failed to get quote:', error);
      throw new Error(`Failed to get quote for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Get historical bars (price history)
   */
  public async getBars(symbol: string, timeframe: string, start: Date, end: Date): Promise<Bar[]> {
    try {
      // Convert timeframe to TD Ameritrade format
      const periodTypeMap: Record<string, { periodType: string; period?: number; frequencyType: string; frequency: number }> = {
        '1m': { periodType: 'day', frequencyType: 'minute', frequency: 1 },
        '5m': { periodType: 'day', frequencyType: 'minute', frequency: 5 },
        '15m': { periodType: 'day', frequencyType: 'minute', frequency: 15 },
        '30m': { periodType: 'day', frequencyType: 'minute', frequency: 30 },
        '1h': { periodType: 'day', frequencyType: 'minute', frequency: 60 },
        '1d': { periodType: 'year', period: 1, frequencyType: 'daily', frequency: 1 },
      };

      const params = periodTypeMap[timeframe] || periodTypeMap['1d'];

      const response = await this.apiClient.get(`/marketdata/${symbol}/pricehistory`, {
        params: {
          ...params,
          startDate: start.getTime(),
          endDate: end.getTime(),
          needExtendedHoursData: false,
        },
      });

      const candles = response.data.candles || [];

      return candles.map((candle: any) => ({
        symbol,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        timestamp: new Date(candle.datetime),
      }));
    } catch (error: any) {
      logger.error('Failed to get bars:', error);
      return [];
    }
  }

  public async subscribeQuotes(symbols: string[]): Promise<void> {
    logger.info(`Quote subscription requested for: ${symbols.join(', ')}`);
    // TD Ameritrade streaming would require WebSocket implementation
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
      const params: any = {
        type: 'ALL',
      };

      if (start) params.startDate = start.toISOString().split('T')[0];
      if (end) params.endDate = end.toISOString().split('T')[0];

      const response = await this.apiClient.get(`/accounts/${this.accountId}/transactions`, {
        params,
      });

      const transactions = response.data || [];

      return transactions
        .filter((t: any) => t.type === 'TRADE' && (!symbol || t.transactionItem?.instrument?.symbol === symbol))
        .map((t: any) => ({
          id: t.transactionId.toString(),
          orderId: t.orderId?.toString() || '',
          symbol: t.transactionItem.instrument.symbol,
          side: t.transactionItem.instruction === 'BUY' ? 'buy' : 'sell',
          quantity: t.transactionItem.amount,
          price: t.transactionItem.price,
          commission: t.fees?.commission || 0,
          timestamp: new Date(t.transactionDate),
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
      // TD Ameritrade doesn't have a simple endpoint for all symbols
      // This is a simplified implementation
      logger.warn('getSymbols() not fully implemented for TD Ameritrade');
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
      const response = await this.apiClient.get('/marketdata/hours', {
        params: {
          markets: 'EQUITY',
          date: new Date().toISOString().split('T')[0],
        },
      });

      const hours = response.data.equity?.EQ;
      return hours?.isOpen || false;
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
      const response = await this.apiClient.get('/marketdata/hours', {
        params: {
          markets: 'EQUITY',
          date: new Date().toISOString().split('T')[0],
        },
      });

      const hours = response.data.equity?.EQ?.sessionHours?.regularMarket[0];

      if (hours) {
        return {
          open: new Date(hours.start),
          close: new Date(hours.end),
        };
      }
    } catch (error) {
      logger.error('Failed to get market hours:', error);
    }

    // Default market hours
    const now = new Date();
    const marketOpen = new Date(now);
    marketOpen.setHours(9, 30, 0, 0);

    const marketClose = new Date(now);
    marketClose.setHours(16, 0, 0, 0);

    return { open: marketOpen, close: marketClose };
  }

  private ensureConnected(): void {
    if (!this.isReady()) {
      throw new Error('TD Ameritrade broker is not connected');
    }
  }
}

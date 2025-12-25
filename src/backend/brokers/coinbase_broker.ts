/**
 * Coinbase Broker Integration
 *
 * Integration with Coinbase Advanced Trade API (formerly Coinbase Pro) for:
 * - Cryptocurrency trading (BTC, ETH, etc.)
 * - OAuth 2.0 authentication
 * - Real-time WebSocket price data
 * - Market and limit orders
 * - Advanced trading features
 */

import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
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

const logger = createComponentLogger('CoinbaseBroker');

interface CoinbaseConfig extends BrokerConfig {
  passphrase?: string; // Optional passphrase for additional security
  sandbox?: boolean; // Use sandbox environment
}

// Coinbase API Response Types
interface CoinbaseAccount {
  uuid: string;
  name: string;
  currency: string;
  available_balance: {
    value: string;
    currency: string;
  };
  hold: {
    value: string;
    currency: string;
  };
}

interface CoinbaseOrder {
  order_id: string;
  client_order_id?: string;
  product_id: string;
  side: 'BUY' | 'SELL';
  order_type: string;
  size: string;
  filled_size?: string;
  price?: string;
  status: string;
  created_time: string;
  completion_percentage: string;
  filled_value?: string;
  average_filled_price?: string;
  fee?: string;
}

interface CoinbaseTicker {
  product_id: string;
  price: string;
  size: string;
  bid: string;
  ask: string;
  volume: string;
  time: string;
}

export class CoinbaseBroker extends BrokerInterface {
  public readonly name = 'Coinbase';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['crypto'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    supportsStreaming: true,
    supportsPaperTrading: false, // Coinbase uses sandbox instead
    supportsMargin: false,
    supportsFractional: true,
    supportsExtendedHours: true, // Crypto markets are 24/7
  };

  private baseUrl: string;
  private wsUrl: string;
  private passphrase?: string;
  private apiClient: AxiosInstance;
  private wsConnection: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();

  constructor(config: CoinbaseConfig) {
    super(config);

    this.passphrase = config.passphrase;

    // Set URLs based on sandbox/production
    if (config.sandbox) {
      this.baseUrl = 'https://api-public.sandbox.exchange.coinbase.com';
      this.wsUrl = 'wss://ws-feed-public.sandbox.exchange.coinbase.com';
    } else {
      this.baseUrl = 'https://api.coinbase.com/api/v3/brokerage';
      this.wsUrl = 'wss://advanced-trade-ws.coinbase.com';
    }

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // Add request interceptor to sign requests
    this.apiClient.interceptors.request.use((config) => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const method = config.method?.toUpperCase() || 'GET';
      const path = config.url || '';
      const body = config.data ? JSON.stringify(config.data) : '';

      const signature = this.signRequest(timestamp, method, path, body);

      config.headers = {
        ...config.headers,
        'CB-ACCESS-KEY': this.config.apiKey,
        'CB-ACCESS-SIGN': signature,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-VERSION': '2023-11-15',
        'Content-Type': 'application/json',
      };

      if (this.passphrase) {
        config.headers['CB-ACCESS-PASSPHRASE'] = this.passphrase;
      }

      return config;
    });
  }

  /**
   * Sign API request using HMAC SHA256
   */
  private signRequest(timestamp: string, method: string, path: string, body: string): string {
    const message = timestamp + method + path + body;
    const hmac = crypto.createHmac('sha256', this.config.apiSecret);
    hmac.update(message);
    return hmac.digest('base64');
  }

  /**
   * Connect to Coinbase API
   */
  public async connect(): Promise<void> {
    logger.info('Connecting to Coinbase...');

    try {
      // Verify credentials by fetching accounts
      await this.apiClient.get('/accounts');

      this.isConnected = true;
      this.emit('connected');
      logger.info('Connected to Coinbase successfully');

      // Initialize WebSocket connection
      this.initWebSocket();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      logger.error('Failed to connect to Coinbase:', { error: message });
      throw new Error(`Coinbase connection failed: ${message}`);
    }
  }

  /**
   * Initialize WebSocket connection for real-time data
   */
  private initWebSocket(): void {
    if (this.wsConnection) return;

    try {
      this.wsConnection = new WebSocket(this.wsUrl);

      this.wsConnection.on('open', () => {
        logger.info('Coinbase WebSocket connected');

        // Send authentication message
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = this.signRequest(timestamp, 'GET', '/users/self/verify', '');

        const authMessage = {
          type: 'subscribe',
          product_ids: [],
          channels: ['ticker', 'user'],
          signature,
          key: this.config.apiKey,
          passphrase: this.passphrase || '',
          timestamp,
        };

        this.wsConnection?.send(JSON.stringify(authMessage));
      });

      this.wsConnection.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error as object);
        }
      });

      this.wsConnection.on('error', (error) => {
        logger.error('WebSocket error:', error as object);
        this.emit('error', error);
      });

      this.wsConnection.on('close', () => {
        logger.warn('WebSocket connection closed');
        this.wsConnection = null;

        // Attempt reconnection after 5 seconds
        setTimeout(() => {
          if (this.isConnected) {
            this.initWebSocket();
          }
        }, 5000);
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocket:', error as object);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'ticker':
        this.handleTickerUpdate(message);
        break;
      case 'match':
        this.handleTradeUpdate(message);
        break;
      case 'subscriptions':
        logger.info('WebSocket subscriptions confirmed');
        break;
      case 'error':
        logger.error('WebSocket error message:', message);
        break;
    }
  }

  /**
   * Handle ticker updates from WebSocket
   */
  private handleTickerUpdate(data: any): void {
    const quote: Quote = {
      symbol: data.product_id?.replace('-', ''),
      bid: parseFloat(data.best_bid || data.price || '0'),
      ask: parseFloat(data.best_ask || data.price || '0'),
      bidSize: parseFloat(data.best_bid_size || '0'),
      askSize: parseFloat(data.best_ask_size || '0'),
      timestamp: new Date(data.time || Date.now()),
    };

    this.emitQuote(quote);
  }

  /**
   * Handle trade updates from WebSocket
   */
  private handleTradeUpdate(data: any): void {
    // This would be used for order fills and trade notifications
    logger.info('Trade update received:', data);
  }

  /**
   * Disconnect from Coinbase
   */
  public async disconnect(): Promise<void> {
    logger.info('Disconnecting from Coinbase...');

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    this.isConnected = false;
    this.subscribedSymbols.clear();
    this.emit('disconnected', 'Manual disconnect');
    logger.info('Disconnected from Coinbase');
  }

  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get account information
   */
  public async getAccount(): Promise<Account> {
    try {
      const response = await this.apiClient.get('/accounts');
      const accounts = response.data.accounts as CoinbaseAccount[];

      // Sum up all accounts (USD, BTC, ETH, etc.)
      let totalUSD = 0;
      let totalHold = 0;

      for (const account of accounts) {
        if (account.currency === 'USD' || account.currency === 'USDC') {
          totalUSD += parseFloat(account.available_balance.value);
          totalHold += parseFloat(account.hold.value);
        }
        // For crypto, we'd need to convert to USD using current prices
      }

      const equity = totalUSD + totalHold;

      return {
        id: accounts[0]?.uuid || 'coinbase-primary',
        currency: 'USD',
        balance: totalUSD,
        equity,
        buyingPower: totalUSD, // Coinbase doesn't have margin
        cash: totalUSD,
        portfolioValue: equity,
        pendingTransfers: 0,
        marginUsed: 0,
        marginAvailable: 0,
        accountType: 'cash',
      };
    } catch (error: any) {
      logger.error('Failed to get account:', error);
      throw new Error(`Failed to get Coinbase account: ${error.message}`);
    }
  }

  /**
   * Get all open positions
   */
  public async getPositions(): Promise<Position[]> {
    try {
      const response = await this.apiClient.get('/accounts');
      const accounts = response.data.accounts as CoinbaseAccount[];
      const positions: Position[] = [];

      for (const account of accounts) {
        // Skip USD/USDC accounts
        if (account.currency === 'USD' || account.currency === 'USDC') continue;

        const balance = parseFloat(account.available_balance.value);
        if (balance > 0) {
          // Get current price for this asset
          const productId = `${account.currency}-USD`;
          const quote = await this.getQuote(productId);
          const currentPrice = (quote.bid + quote.ask) / 2;

          positions.push({
            symbol: productId,
            side: 'long',
            quantity: balance,
            entryPrice: currentPrice, // We don't have historical entry price
            currentPrice,
            unrealizedPnL: 0, // Would need to calculate from entry
            realizedPnL: 0,
            marketValue: balance * currentPrice,
          });
        }
      }

      return positions;
    } catch (error: any) {
      logger.error('Failed to get positions:', error);
      throw new Error(`Failed to get Coinbase positions: ${error.message}`);
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
    try {
      const orderConfig: any = {
        client_order_id: request.clientOrderId || `time-${Date.now()}`,
        product_id: request.symbol,
        side: request.side.toUpperCase(),
        order_configuration: {},
      };

      // Configure order based on type
      if (request.type === 'market') {
        if (request.side === 'buy') {
          orderConfig.order_configuration.market_market_ioc = {
            quote_size: (request.quantity * (request.price || 0)).toString(),
          };
        } else {
          orderConfig.order_configuration.market_market_ioc = {
            base_size: request.quantity.toString(),
          };
        }
      } else if (request.type === 'limit') {
        orderConfig.order_configuration.limit_limit_gtc = {
          base_size: request.quantity.toString(),
          limit_price: request.price?.toString() || '0',
          post_only: false,
        };
      } else if (request.type === 'stop_limit') {
        orderConfig.order_configuration.stop_limit_stop_limit_gtc = {
          base_size: request.quantity.toString(),
          limit_price: request.price?.toString() || '0',
          stop_price: request.stopPrice?.toString() || '0',
          stop_direction: request.side === 'buy' ? 'STOP_DIRECTION_STOP_UP' : 'STOP_DIRECTION_STOP_DOWN',
        };
      }

      const response = await this.apiClient.post('/orders', orderConfig);
      const coinbaseOrder = response.data;

      return this.convertCoinbaseOrder(coinbaseOrder);
    } catch (error: any) {
      logger.error('Failed to submit order:', error);
      throw new Error(`Failed to submit Coinbase order: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Convert Coinbase order to our Order format
   */
  private convertCoinbaseOrder(cbOrder: any): Order {
    const statusMap: Record<string, OrderStatus> = {
      'PENDING': 'pending',
      'OPEN': 'open',
      'FILLED': 'filled',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'cancelled',
      'FAILED': 'rejected',
    };

    return {
      id: cbOrder.order_id || cbOrder.success_response?.order_id || '',
      clientOrderId: cbOrder.client_order_id,
      symbol: cbOrder.product_id,
      side: cbOrder.side?.toLowerCase() as OrderSide,
      type: 'market', // Simplified
      quantity: parseFloat(cbOrder.size || '0'),
      filledQuantity: parseFloat(cbOrder.filled_size || '0'),
      price: parseFloat(cbOrder.price || '0'),
      timeInForce: 'gtc',
      status: statusMap[cbOrder.status] || 'pending',
      submittedAt: new Date(cbOrder.created_time || Date.now()),
      averageFilledPrice: parseFloat(cbOrder.average_filled_price || '0'),
      commission: parseFloat(cbOrder.fee || '0'),
    };
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.apiClient.post('/orders/batch_cancel', {
        order_ids: [orderId],
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
    // Coinbase doesn't support order modification - cancel and replace
    await this.cancelOrder(orderId);

    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    return this.submitOrder({
      symbol: updates.symbol || order.symbol,
      side: updates.side || order.side,
      type: updates.type || order.type,
      quantity: updates.quantity || order.quantity,
      price: updates.price || order.price,
      timeInForce: updates.timeInForce || order.timeInForce,
    });
  }

  /**
   * Get a specific order
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await this.apiClient.get(`/orders/historical/${orderId}`);
      return this.convertCoinbaseOrder(response.data.order);
    } catch (error) {
      logger.error('Failed to get order:', error);
      return null;
    }
  }

  /**
   * Get all orders
   */
  public async getOrders(status?: OrderStatus): Promise<Order[]> {
    try {
      const response = await this.apiClient.get('/orders/historical/batch');
      const orders = response.data.orders || [];

      return orders
        .map((o: any) => this.convertCoinbaseOrder(o))
        .filter((o: Order) => !status || o.status === status);
    } catch (error: any) {
      logger.error('Failed to get orders:', error);
      return [];
    }
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
      const response = await this.apiClient.get(`/products/${symbol}/ticker`);
      const ticker = response.data;

      return {
        symbol,
        bid: parseFloat(ticker.bid || '0'),
        ask: parseFloat(ticker.ask || '0'),
        bidSize: 0,
        askSize: 0,
        timestamp: new Date(ticker.time || Date.now()),
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
      // Convert timeframe to Coinbase granularity (in seconds)
      const granularityMap: Record<string, number> = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600,
        '1d': 86400,
      };

      const granularity = granularityMap[timeframe] || 3600;

      const response = await this.apiClient.get(`/products/${symbol}/candles`, {
        params: {
          start: Math.floor(start.getTime() / 1000),
          end: Math.floor(end.getTime() / 1000),
          granularity,
        },
      });

      return response.data.candles.map((candle: any) => ({
        symbol,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
        timestamp: new Date(candle.start * 1000),
      }));
    } catch (error: any) {
      logger.error('Failed to get bars:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time quotes
   */
  public async subscribeQuotes(symbols: string[]): Promise<void> {
    if (!this.wsConnection) {
      logger.warn('WebSocket not connected, cannot subscribe');
      return;
    }

    const subscribeMessage = {
      type: 'subscribe',
      product_ids: symbols,
      channels: ['ticker'],
    };

    this.wsConnection.send(JSON.stringify(subscribeMessage));
    symbols.forEach((s) => this.subscribedSymbols.add(s));
    logger.info(`Subscribed to quotes: ${symbols.join(', ')}`);
  }

  /**
   * Unsubscribe from quotes
   */
  public async unsubscribeQuotes(symbols: string[]): Promise<void> {
    if (!this.wsConnection) return;

    const unsubscribeMessage = {
      type: 'unsubscribe',
      product_ids: symbols,
      channels: ['ticker'],
    };

    this.wsConnection.send(JSON.stringify(unsubscribeMessage));
    symbols.forEach((s) => this.subscribedSymbols.delete(s));
  }

  public async subscribeBars(symbols: string[], timeframe: string): Promise<void> {
    // Coinbase doesn't have real-time bar streaming - use ticker instead
    await this.subscribeQuotes(symbols);
  }

  public async unsubscribeBars(symbols: string[]): Promise<void> {
    await this.unsubscribeQuotes(symbols);
  }

  /**
   * Get trade history
   */
  public async getTrades(symbol?: string, start?: Date, end?: Date): Promise<BrokerTrade[]> {
    try {
      const response = await this.apiClient.get('/orders/historical/fills');
      const fills = response.data.fills || [];

      return fills
        .filter((f: any) => !symbol || f.product_id === symbol)
        .map((f: any) => ({
          id: f.trade_id,
          orderId: f.order_id,
          symbol: f.product_id,
          side: f.side.toLowerCase() as OrderSide,
          quantity: parseFloat(f.size),
          price: parseFloat(f.price),
          commission: parseFloat(f.commission),
          timestamp: new Date(f.trade_time),
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
      const response = await this.apiClient.get('/products');
      return response.data.products.map((p: any) => p.product_id);
    } catch (error) {
      logger.error('Failed to get symbols:', error);
      return [];
    }
  }

  /**
   * Check if market is open (crypto is always open)
   */
  public async isMarketOpen(): Promise<boolean> {
    return true; // Crypto markets are 24/7
  }

  /**
   * Get market hours (crypto is 24/7)
   */
  public async getMarketHours(): Promise<{ open: Date; close: Date }> {
    const now = new Date();
    return {
      open: now,
      close: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };
  }
}

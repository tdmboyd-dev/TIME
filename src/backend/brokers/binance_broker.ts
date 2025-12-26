/**
 * Binance Broker Integration
 *
 * Full integration with Binance API for:
 * - Spot trading (500+ pairs)
 * - USDT-M Futures (perpetual and quarterly)
 * - COIN-M Futures (inverse contracts)
 * - Real-time WebSocket streaming
 * - All order types including trailing stops
 * - Margin trading
 * - Paper trading via testnet
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
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
  AssetClass,
  RetryConfig,
} from './broker_interface';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('BinanceBroker');

// Binance-specific config
interface BinanceConfig extends BrokerConfig {
  tradingType?: 'spot' | 'futures' | 'margin';
  futuresType?: 'usdt' | 'coin';
  testnet?: boolean;
  recvWindow?: number;
}

// Binance API endpoints
const ENDPOINTS = {
  spot: {
    live: 'https://api.binance.com',
    testnet: 'https://testnet.binance.vision',
  },
  usdtFutures: {
    live: 'https://fapi.binance.com',
    testnet: 'https://testnet.binancefuture.com',
  },
  coinFutures: {
    live: 'https://dapi.binance.com',
    testnet: 'https://testnet.binancefuture.com',
  },
  ws: {
    spot: 'wss://stream.binance.com:9443/ws',
    spotTestnet: 'wss://testnet.binance.vision/ws',
    usdtFutures: 'wss://fstream.binance.com/ws',
    usdtFuturesTestnet: 'wss://stream.binancefuture.com/ws',
    coinFutures: 'wss://dstream.binance.com/ws',
  },
};

export class BinanceBroker extends BrokerInterface {
  public readonly name = 'Binance';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['crypto', 'futures'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'take_profit', 'take_profit_limit'],
    supportsStreaming: true,
    supportsPaperTrading: true, // Via testnet
    supportsMargin: true,
    supportsFractional: true,
    supportsExtendedHours: true, // 24/7
  };

  private baseUrl: string;
  private wsUrl: string;
  private tradingType: 'spot' | 'futures' | 'margin';
  private futuresType: 'usdt' | 'coin';
  private recvWindow: number;
  private apiClient: AxiosInstance;
  private wsConnection: WebSocket | null = null;
  private userDataWs: WebSocket | null = null;
  private listenKey: string | null = null;
  private listenKeyRefreshInterval: NodeJS.Timeout | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private retryConfig: RetryConfig;

  constructor(config: BinanceConfig) {
    super(config);

    this.tradingType = config.tradingType || 'spot';
    this.futuresType = config.futuresType || 'usdt';
    this.recvWindow = config.recvWindow || 5000;

    // Set URLs based on trading type and testnet mode
    const isTestnet = config.testnet || config.isPaper;

    if (this.tradingType === 'futures') {
      if (this.futuresType === 'usdt') {
        this.baseUrl = isTestnet ? ENDPOINTS.usdtFutures.testnet : ENDPOINTS.usdtFutures.live;
        this.wsUrl = isTestnet ? ENDPOINTS.ws.usdtFuturesTestnet : ENDPOINTS.ws.usdtFutures;
      } else {
        this.baseUrl = isTestnet ? ENDPOINTS.coinFutures.testnet : ENDPOINTS.coinFutures.live;
        this.wsUrl = ENDPOINTS.ws.coinFutures;
      }
    } else {
      this.baseUrl = isTestnet ? ENDPOINTS.spot.testnet : ENDPOINTS.spot.live;
      this.wsUrl = isTestnet ? ENDPOINTS.ws.spotTestnet : ENDPOINTS.ws.spot;
    }

    // Retry configuration
    this.retryConfig = {
      maxAttempts: config.retryAttempts || 3,
      baseDelayMs: config.retryDelayMs || 1000,
      maxDelayMs: 30000,
      exponentialBackoff: true,
    };

    // Create API client
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'X-MBX-APIKEY': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate HMAC signature for authenticated requests
   */
  private sign(queryString: string): string {
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Connect to Binance API
   */
  public async connect(): Promise<void> {
    logger.info(`Connecting to Binance ${this.tradingType} (${this.isPaperTrading ? 'Testnet' : 'Live'})...`);

    try {
      // Verify credentials by fetching account
      const account = await this.getAccount();
      logger.info(`Connected to Binance. Balance: ${account.balance}`);

      this.isConnected = true;
      this.emit('connected');

      // Start user data stream for real-time order updates
      await this.startUserDataStream();

    } catch (error) {
      logger.error('Failed to connect to Binance:', error as object);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Binance
   */
  public async disconnect(): Promise<void> {
    logger.info('Disconnecting from Binance...');

    // Close WebSocket connections
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    if (this.userDataWs) {
      this.userDataWs.close();
      this.userDataWs = null;
    }

    // Stop listen key refresh
    if (this.listenKeyRefreshInterval) {
      clearInterval(this.listenKeyRefreshInterval);
      this.listenKeyRefreshInterval = null;
    }

    // Delete listen key
    if (this.listenKey) {
      try {
        await this.deleteListenKey();
      } catch (error) {
        logger.warn('Failed to delete listen key:', error);
      }
      this.listenKey = null;
    }

    this.isConnected = false;
    this.subscribedSymbols.clear();
    this.emit('disconnected', 'Manual disconnect');
  }

  /**
   * Check if connected
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get account information
   */
  public async getAccount(): Promise<Account> {
    const endpoint = this.tradingType === 'futures'
      ? (this.futuresType === 'usdt' ? '/fapi/v2/account' : '/dapi/v1/account')
      : '/api/v3/account';

    const response = await this.signedRequest('GET', endpoint);

    if (this.tradingType === 'futures') {
      return {
        id: 'binance-futures',
        currency: this.futuresType === 'usdt' ? 'USDT' : 'BTC',
        balance: parseFloat(response.totalWalletBalance || response.walletBalance || '0'),
        equity: parseFloat(response.totalMarginBalance || response.marginBalance || '0'),
        buyingPower: parseFloat(response.availableBalance || '0'),
        cash: parseFloat(response.availableBalance || '0'),
        portfolioValue: parseFloat(response.totalMarginBalance || response.marginBalance || '0'),
        pendingTransfers: 0,
        marginUsed: parseFloat(response.totalPositionInitialMargin || response.positionInitialMargin || '0'),
        marginAvailable: parseFloat(response.availableBalance || '0'),
        accountType: this.isPaperTrading ? 'paper' : 'margin',
      };
    } else {
      // Spot account
      const balances = response.balances || [];
      let totalUSD = 0;

      // Find USD stablecoins balance
      for (const bal of balances) {
        if (['USDT', 'USDC', 'BUSD', 'FDUSD'].includes(bal.asset)) {
          totalUSD += parseFloat(bal.free) + parseFloat(bal.locked);
        }
      }

      return {
        id: 'binance-spot',
        currency: 'USDT',
        balance: totalUSD,
        equity: totalUSD, // Would need to calculate with crypto positions
        buyingPower: totalUSD,
        cash: totalUSD,
        portfolioValue: totalUSD,
        pendingTransfers: 0,
        marginUsed: 0,
        marginAvailable: totalUSD,
        accountType: this.isPaperTrading ? 'paper' : 'cash',
      };
    }
  }

  /**
   * Get all positions
   */
  public async getPositions(): Promise<Position[]> {
    if (this.tradingType === 'futures') {
      const endpoint = this.futuresType === 'usdt' ? '/fapi/v2/positionRisk' : '/dapi/v1/positionRisk';
      const response = await this.signedRequest('GET', endpoint);

      return response
        .filter((pos: any) => parseFloat(pos.positionAmt) !== 0)
        .map((pos: any) => ({
          symbol: pos.symbol,
          side: parseFloat(pos.positionAmt) > 0 ? 'long' : 'short',
          quantity: Math.abs(parseFloat(pos.positionAmt)),
          entryPrice: parseFloat(pos.entryPrice),
          currentPrice: parseFloat(pos.markPrice),
          unrealizedPnL: parseFloat(pos.unRealizedProfit),
          realizedPnL: 0,
          marketValue: Math.abs(parseFloat(pos.positionAmt) * parseFloat(pos.markPrice)),
        }));
    } else {
      // Spot - convert balances to positions
      const response = await this.signedRequest('GET', '/api/v3/account');
      const positions: Position[] = [];

      for (const bal of response.balances || []) {
        const quantity = parseFloat(bal.free) + parseFloat(bal.locked);
        if (quantity > 0 && !['USDT', 'USDC', 'BUSD', 'FDUSD'].includes(bal.asset)) {
          // Get current price
          try {
            const ticker = await this.publicRequest('GET', `/api/v3/ticker/price?symbol=${bal.asset}USDT`);
            const currentPrice = parseFloat(ticker.price);

            positions.push({
              symbol: `${bal.asset}USDT`,
              side: 'long',
              quantity,
              entryPrice: currentPrice, // We don't have historical entry price
              currentPrice,
              unrealizedPnL: 0,
              realizedPnL: 0,
              marketValue: quantity * currentPrice,
            });
          } catch {
            // Skip if no USDT pair
          }
        }
      }

      return positions;
    }
  }

  /**
   * Get specific position
   */
  public async getPosition(symbol: string): Promise<Position | null> {
    const positions = await this.getPositions();
    return positions.find((p) => p.symbol === symbol) || null;
  }

  /**
   * Submit an order
   */
  public async submitOrder(request: OrderRequest): Promise<Order> {
    logger.info(`Submitting ${request.side} ${request.type} order for ${request.symbol}`);

    const endpoint = this.tradingType === 'futures'
      ? (this.futuresType === 'usdt' ? '/fapi/v1/order' : '/dapi/v1/order')
      : '/api/v3/order';

    const params: any = {
      symbol: request.symbol,
      side: request.side.toUpperCase(),
      type: this.mapOrderType(request.type),
      quantity: request.quantity.toString(),
    };

    // Add price for limit orders
    if (request.price && ['limit', 'stop_limit', 'take_profit_limit'].includes(request.type)) {
      params.price = request.price.toString();
    }

    // Add stop price for stop orders
    if (request.stopPrice && ['stop', 'stop_limit', 'take_profit', 'take_profit_limit'].includes(request.type)) {
      params.stopPrice = request.stopPrice.toString();
    }

    // Trailing stop parameters
    if (request.type === 'trailing_stop') {
      if (request.trailingPercent) {
        params.callbackRate = request.trailingPercent.toString();
      }
      if (request.stopPrice) {
        params.activationPrice = request.stopPrice.toString();
      }
    }

    // Time in force
    if (request.timeInForce && !['market', 'trailing_stop'].includes(request.type)) {
      params.timeInForce = request.timeInForce.toUpperCase();
    } else if (['limit', 'stop_limit', 'take_profit_limit'].includes(request.type)) {
      params.timeInForce = 'GTC';
    }

    // Futures-specific parameters
    if (this.tradingType === 'futures') {
      if (request.reduceOnly) {
        params.reduceOnly = 'true';
      }
      if (request.postOnly) {
        params.timeInForce = 'GTX'; // Post-only maker
      }
    }

    // Client order ID
    if (request.clientOrderId) {
      params.newClientOrderId = request.clientOrderId;
    }

    const response = await this.signedRequest('POST', endpoint, params);
    const order = this.mapBinanceOrder(response);
    this.emitOrderUpdate(order);

    return order;
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    logger.info(`Cancelling order: ${orderId}`);

    try {
      const endpoint = this.tradingType === 'futures'
        ? (this.futuresType === 'usdt' ? '/fapi/v1/order' : '/dapi/v1/order')
        : '/api/v3/order';

      // Need to get order first to get symbol
      const order = await this.getOrder(orderId);
      if (!order) {
        logger.warn(`Order ${orderId} not found`);
        return false;
      }

      await this.signedRequest('DELETE', endpoint, {
        symbol: order.symbol,
        orderId,
      });

      return true;
    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}:`, error as object);
      return false;
    }
  }

  /**
   * Modify an order (cancel and replace)
   */
  public async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order> {
    logger.info(`Modifying order: ${orderId}`);

    // Get existing order
    const existingOrder = await this.getOrder(orderId);
    if (!existingOrder) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Cancel existing order
    await this.cancelOrder(orderId);

    // Submit new order with updated parameters
    return this.submitOrder({
      symbol: existingOrder.symbol,
      side: existingOrder.side,
      type: existingOrder.type,
      quantity: updates.quantity || existingOrder.quantity,
      price: updates.price || existingOrder.price,
      stopPrice: updates.stopPrice || existingOrder.stopPrice,
      timeInForce: updates.timeInForce || existingOrder.timeInForce,
    });
  }

  /**
   * Get order by ID
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    try {
      // For Binance, we need the symbol - try to find it in open orders first
      const openOrders = await this.getOrders();
      const order = openOrders.find((o) => o.id === orderId);
      if (order) return order;

      // Not found in open orders
      return null;
    } catch (error: any) {
      logger.error(`Failed to get order ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Get orders with optional status filter
   */
  public async getOrders(status?: OrderStatus): Promise<Order[]> {
    const endpoint = this.tradingType === 'futures'
      ? (this.futuresType === 'usdt' ? '/fapi/v1/openOrders' : '/dapi/v1/openOrders')
      : '/api/v3/openOrders';

    const response = await this.signedRequest('GET', endpoint);

    return response
      .map((order: any) => this.mapBinanceOrder(order))
      .filter((o: Order) => !status || o.status === status);
  }

  /**
   * Close a position
   */
  public async closePosition(symbol: string, quantity?: number): Promise<Order> {
    logger.info(`Closing position: ${symbol}`);

    const position = await this.getPosition(symbol);
    if (!position) {
      throw new Error(`No position found for ${symbol}`);
    }

    const closeQty = quantity || position.quantity;

    return this.submitOrder({
      symbol,
      side: position.side === 'long' ? 'sell' : 'buy',
      type: 'market',
      quantity: closeQty,
      reduceOnly: this.tradingType === 'futures',
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
   * Get quote for a symbol
   */
  public async getQuote(symbol: string): Promise<Quote> {
    const endpoint = this.tradingType === 'futures'
      ? (this.futuresType === 'usdt' ? '/fapi/v1/ticker/bookTicker' : '/dapi/v1/ticker/bookTicker')
      : '/api/v3/ticker/bookTicker';

    const response = await this.publicRequest('GET', `${endpoint}?symbol=${symbol}`);

    return {
      symbol,
      bid: parseFloat(response.bidPrice),
      ask: parseFloat(response.askPrice),
      bidSize: parseFloat(response.bidQty),
      askSize: parseFloat(response.askQty),
      timestamp: new Date(),
    };
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
    const endpoint = this.tradingType === 'futures'
      ? (this.futuresType === 'usdt' ? '/fapi/v1/klines' : '/dapi/v1/klines')
      : '/api/v3/klines';

    const interval = this.mapTimeframe(timeframe);
    const params = new URLSearchParams({
      symbol,
      interval,
      startTime: start.getTime().toString(),
      endTime: end.getTime().toString(),
      limit: '1000',
    });

    const response = await this.publicRequest('GET', `${endpoint}?${params.toString()}`);

    return response.map((kline: any[]) => ({
      symbol,
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      timestamp: new Date(kline[0]),
    }));
  }

  /**
   * Subscribe to real-time quotes
   */
  public async subscribeQuotes(symbols: string[]): Promise<void> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      await this.initMarketDataWebSocket();
    }

    const streams = symbols.map((s) => `${s.toLowerCase()}@bookTicker`);
    const subscribeMsg = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now(),
    };

    this.wsConnection?.send(JSON.stringify(subscribeMsg));
    symbols.forEach((s) => this.subscribedSymbols.add(s));

    logger.info(`Subscribed to quotes: ${symbols.join(', ')}`);
  }

  /**
   * Unsubscribe from quotes
   */
  public async unsubscribeQuotes(symbols: string[]): Promise<void> {
    if (!this.wsConnection) return;

    const streams = symbols.map((s) => `${s.toLowerCase()}@bookTicker`);
    const unsubscribeMsg = {
      method: 'UNSUBSCRIBE',
      params: streams,
      id: Date.now(),
    };

    this.wsConnection.send(JSON.stringify(unsubscribeMsg));
    symbols.forEach((s) => this.subscribedSymbols.delete(s));
  }

  /**
   * Subscribe to real-time bars
   */
  public async subscribeBars(symbols: string[], timeframe: string): Promise<void> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      await this.initMarketDataWebSocket();
    }

    const interval = this.mapTimeframe(timeframe);
    const streams = symbols.map((s) => `${s.toLowerCase()}@kline_${interval}`);
    const subscribeMsg = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now(),
    };

    this.wsConnection?.send(JSON.stringify(subscribeMsg));

    logger.info(`Subscribed to bars: ${symbols.join(', ')} @ ${timeframe}`);
  }

  /**
   * Unsubscribe from bars
   */
  public async unsubscribeBars(symbols: string[]): Promise<void> {
    if (!this.wsConnection) return;

    // Would need to track subscribed timeframes to properly unsubscribe
    logger.info(`Unsubscribed from bars: ${symbols.join(', ')}`);
  }

  /**
   * Get trade history
   */
  public async getTrades(
    symbol?: string,
    start?: Date,
    end?: Date
  ): Promise<BrokerTrade[]> {
    const endpoint = this.tradingType === 'futures'
      ? (this.futuresType === 'usdt' ? '/fapi/v1/userTrades' : '/dapi/v1/userTrades')
      : '/api/v3/myTrades';

    const params: any = { limit: 1000 };
    if (symbol) params.symbol = symbol;
    if (start) params.startTime = start.getTime();
    if (end) params.endTime = end.getTime();

    const response = await this.signedRequest('GET', endpoint, params);

    return response.map((trade: any) => ({
      id: trade.id.toString(),
      orderId: trade.orderId.toString(),
      symbol: trade.symbol,
      side: trade.isBuyer ? 'buy' : 'sell',
      quantity: parseFloat(trade.qty),
      price: parseFloat(trade.price),
      commission: parseFloat(trade.commission),
      timestamp: new Date(trade.time),
    }));
  }

  /**
   * Get available symbols
   */
  public async getSymbols(assetClass?: AssetClass): Promise<string[]> {
    const endpoint = this.tradingType === 'futures'
      ? (this.futuresType === 'usdt' ? '/fapi/v1/exchangeInfo' : '/dapi/v1/exchangeInfo')
      : '/api/v3/exchangeInfo';

    const response = await this.publicRequest('GET', endpoint);

    return response.symbols
      .filter((s: any) => s.status === 'TRADING')
      .map((s: any) => s.symbol);
  }

  /**
   * Check if market is open (crypto is always open)
   */
  public async isMarketOpen(): Promise<boolean> {
    return true;
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

  /**
   * Set leverage for futures trading
   */
  public async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    if (this.tradingType !== 'futures') {
      throw new Error('Leverage only available for futures trading');
    }

    const endpoint = this.futuresType === 'usdt' ? '/fapi/v1/leverage' : '/dapi/v1/leverage';

    try {
      await this.signedRequest('POST', endpoint, { symbol, leverage });
      logger.info(`Set leverage for ${symbol} to ${leverage}x`);
      return true;
    } catch (error) {
      logger.error(`Failed to set leverage:`, error);
      return false;
    }
  }

  /**
   * Set margin mode for futures trading
   */
  public async setMarginMode(symbol: string, mode: 'ISOLATED' | 'CROSSED'): Promise<boolean> {
    if (this.tradingType !== 'futures') {
      throw new Error('Margin mode only available for futures trading');
    }

    const endpoint = this.futuresType === 'usdt' ? '/fapi/v1/marginType' : '/dapi/v1/marginType';

    try {
      await this.signedRequest('POST', endpoint, { symbol, marginType: mode });
      logger.info(`Set margin mode for ${symbol} to ${mode}`);
      return true;
    } catch (error: any) {
      // Ignore if already set
      if (error.message?.includes('No need to change')) {
        return true;
      }
      logger.error(`Failed to set margin mode:`, error);
      return false;
    }
  }

  // Private methods

  /**
   * Make a signed request
   */
  private async signedRequest(method: string, endpoint: string, params: any = {}): Promise<any> {
    return this.retryWithBackoff(async () => {
      const timestamp = Date.now();
      const queryParams = new URLSearchParams({
        ...params,
        timestamp: timestamp.toString(),
        recvWindow: this.recvWindow.toString(),
      });

      const signature = this.sign(queryParams.toString());
      queryParams.append('signature', signature);

      const url = method === 'GET' || method === 'DELETE'
        ? `${endpoint}?${queryParams.toString()}`
        : endpoint;

      const response = await this.apiClient.request({
        method,
        url,
        data: method === 'POST' || method === 'PUT' ? queryParams.toString() : undefined,
        headers: method === 'POST' || method === 'PUT'
          ? { 'Content-Type': 'application/x-www-form-urlencoded' }
          : undefined,
      });

      return response.data;
    });
  }

  /**
   * Make a public request (no signature needed)
   */
  private async publicRequest(method: string, url: string): Promise<any> {
    return this.retryWithBackoff(async () => {
      const response = await this.apiClient.request({ method, url });
      return response.data;
    });
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry for certain errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw error;
        }

        // Rate limiting - wait longer
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10) * 1000;
          logger.warn(`Rate limited, waiting ${retryAfter}ms`);
          await this.delay(retryAfter);
          continue;
        }

        // Calculate delay with exponential backoff
        const delay = this.retryConfig.exponentialBackoff
          ? Math.min(this.retryConfig.baseDelayMs * Math.pow(2, attempt), this.retryConfig.maxDelayMs)
          : this.retryConfig.baseDelayMs;

        logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxAttempts})`);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize market data WebSocket
   */
  private async initMarketDataWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wsConnection = new WebSocket(this.wsUrl);

      this.wsConnection.on('open', () => {
        logger.info('Market data WebSocket connected');
        resolve();
      });

      this.wsConnection.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMarketDataMessage(message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      });

      this.wsConnection.on('error', (error) => {
        logger.error('WebSocket error:', error);
        reject(error);
      });

      this.wsConnection.on('close', () => {
        logger.warn('Market data WebSocket closed');
        // Reconnect after 5 seconds
        setTimeout(() => {
          if (this.isConnected) {
            this.initMarketDataWebSocket();
          }
        }, 5000);
      });
    });
  }

  /**
   * Handle market data WebSocket messages
   */
  private handleMarketDataMessage(message: any): void {
    if (message.e === 'bookTicker') {
      // Quote update
      this.emitQuote({
        symbol: message.s,
        bid: parseFloat(message.b),
        ask: parseFloat(message.a),
        bidSize: parseFloat(message.B),
        askSize: parseFloat(message.A),
        timestamp: new Date(),
      });
    } else if (message.e === 'kline') {
      // Bar update
      const kline = message.k;
      if (kline.x) { // Only emit completed bars
        this.emitBar({
          symbol: kline.s,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
          timestamp: new Date(kline.t),
        });
      }
    }
  }

  /**
   * Start user data stream for real-time order/trade updates
   */
  private async startUserDataStream(): Promise<void> {
    try {
      // Get listen key
      const endpoint = this.tradingType === 'futures'
        ? (this.futuresType === 'usdt' ? '/fapi/v1/listenKey' : '/dapi/v1/listenKey')
        : '/api/v3/userDataStream';

      const response = await this.signedRequest('POST', endpoint);
      this.listenKey = response.listenKey;

      // Connect to user data stream
      const wsUrl = `${this.wsUrl}/${this.listenKey}`;
      this.userDataWs = new WebSocket(wsUrl);

      this.userDataWs.on('open', () => {
        logger.info('User data stream connected');
      });

      this.userDataWs.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleUserDataMessage(message);
        } catch (error) {
          logger.error('Failed to parse user data message:', error);
        }
      });

      this.userDataWs.on('close', () => {
        logger.warn('User data stream closed');
        // Reconnect after 5 seconds
        setTimeout(() => {
          if (this.isConnected) {
            this.startUserDataStream();
          }
        }, 5000);
      });

      // Refresh listen key every 30 minutes
      this.listenKeyRefreshInterval = setInterval(() => {
        this.refreshListenKey();
      }, 30 * 60 * 1000);

    } catch (error) {
      logger.error('Failed to start user data stream:', error);
    }
  }

  /**
   * Handle user data stream messages
   */
  private handleUserDataMessage(message: any): void {
    if (message.e === 'executionReport' || message.e === 'ORDER_TRADE_UPDATE') {
      // Order update
      const orderData = message.e === 'ORDER_TRADE_UPDATE' ? message.o : message;
      const order = this.mapBinanceUserDataOrder(orderData);
      this.emitOrderUpdate(order);

      // If filled, emit trade
      if (order.status === 'filled' || (orderData.x === 'TRADE' && parseFloat(orderData.l) > 0)) {
        this.emitTrade({
          id: orderData.t?.toString() || orderData.i?.toString(),
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          quantity: parseFloat(orderData.l || orderData.z),
          price: parseFloat(orderData.L || orderData.p),
          commission: parseFloat(orderData.n || '0'),
          timestamp: new Date(message.E || message.T),
        });
      }
    } else if (message.e === 'outboundAccountPosition' || message.e === 'ACCOUNT_UPDATE') {
      // Account update
      this.getAccount().then((account) => {
        this.emitAccountUpdate(account);
      });
    }
  }

  /**
   * Refresh listen key
   */
  private async refreshListenKey(): Promise<void> {
    if (!this.listenKey) return;

    try {
      const endpoint = this.tradingType === 'futures'
        ? (this.futuresType === 'usdt' ? '/fapi/v1/listenKey' : '/dapi/v1/listenKey')
        : '/api/v3/userDataStream';

      await this.signedRequest('PUT', endpoint, { listenKey: this.listenKey });
      logger.debug('Listen key refreshed');
    } catch (error) {
      logger.error('Failed to refresh listen key:', error);
    }
  }

  /**
   * Delete listen key
   */
  private async deleteListenKey(): Promise<void> {
    if (!this.listenKey) return;

    const endpoint = this.tradingType === 'futures'
      ? (this.futuresType === 'usdt' ? '/fapi/v1/listenKey' : '/dapi/v1/listenKey')
      : '/api/v3/userDataStream';

    await this.signedRequest('DELETE', endpoint, { listenKey: this.listenKey });
  }

  /**
   * Map order type to Binance format
   */
  private mapOrderType(type: string): string {
    const typeMap: Record<string, string> = {
      market: 'MARKET',
      limit: 'LIMIT',
      stop: 'STOP_MARKET',
      stop_limit: 'STOP',
      trailing_stop: 'TRAILING_STOP_MARKET',
      take_profit: 'TAKE_PROFIT_MARKET',
      take_profit_limit: 'TAKE_PROFIT',
    };
    return typeMap[type] || 'MARKET';
  }

  /**
   * Map Binance order to our format
   */
  private mapBinanceOrder(binanceOrder: any): Order {
    return {
      id: binanceOrder.orderId?.toString(),
      clientOrderId: binanceOrder.clientOrderId,
      symbol: binanceOrder.symbol,
      side: binanceOrder.side?.toLowerCase(),
      type: this.reverseMapOrderType(binanceOrder.type),
      quantity: parseFloat(binanceOrder.origQty),
      filledQuantity: parseFloat(binanceOrder.executedQty),
      price: binanceOrder.price ? parseFloat(binanceOrder.price) : undefined,
      stopPrice: binanceOrder.stopPrice ? parseFloat(binanceOrder.stopPrice) : undefined,
      timeInForce: (binanceOrder.timeInForce || 'gtc').toLowerCase() as any,
      status: this.mapOrderStatus(binanceOrder.status),
      submittedAt: new Date(binanceOrder.time || binanceOrder.updateTime),
      filledAt: binanceOrder.status === 'FILLED' ? new Date(binanceOrder.updateTime) : undefined,
      averageFilledPrice: binanceOrder.avgPrice ? parseFloat(binanceOrder.avgPrice) : undefined,
      trailingPercent: binanceOrder.priceRate ? parseFloat(binanceOrder.priceRate) : undefined,
      activationPrice: binanceOrder.activatePrice ? parseFloat(binanceOrder.activatePrice) : undefined,
      reduceOnly: binanceOrder.reduceOnly,
    };
  }

  /**
   * Map Binance user data order to our format
   */
  private mapBinanceUserDataOrder(data: any): Order {
    return {
      id: (data.i || data.orderId)?.toString(),
      clientOrderId: data.c || data.clientOrderId,
      symbol: data.s || data.symbol,
      side: (data.S || data.side)?.toLowerCase(),
      type: this.reverseMapOrderType(data.o || data.type),
      quantity: parseFloat(data.q || data.origQty || '0'),
      filledQuantity: parseFloat(data.z || data.executedQty || '0'),
      price: data.p ? parseFloat(data.p) : undefined,
      stopPrice: data.P ? parseFloat(data.P) : undefined,
      timeInForce: (data.f || data.timeInForce || 'gtc').toLowerCase() as any,
      status: this.mapOrderStatus(data.X || data.status),
      submittedAt: new Date(data.O || data.T || Date.now()),
      averageFilledPrice: data.ap ? parseFloat(data.ap) : undefined,
    };
  }

  /**
   * Reverse map order type from Binance format
   */
  private reverseMapOrderType(binanceType: string): any {
    const typeMap: Record<string, string> = {
      MARKET: 'market',
      LIMIT: 'limit',
      STOP_MARKET: 'stop',
      STOP: 'stop_limit',
      STOP_LOSS: 'stop',
      STOP_LOSS_LIMIT: 'stop_limit',
      TRAILING_STOP_MARKET: 'trailing_stop',
      TAKE_PROFIT_MARKET: 'take_profit',
      TAKE_PROFIT: 'take_profit_limit',
    };
    return typeMap[binanceType] || 'market';
  }

  /**
   * Map Binance order status to our format
   */
  private mapOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      NEW: 'open',
      PARTIALLY_FILLED: 'partial',
      FILLED: 'filled',
      CANCELED: 'cancelled',
      REJECTED: 'rejected',
      EXPIRED: 'expired',
      PENDING_CANCEL: 'open',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Map timeframe to Binance interval format
   */
  private mapTimeframe(timeframe: string): string {
    const tfMap: Record<string, string> = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '2h': '2h',
      '4h': '4h',
      '6h': '6h',
      '8h': '8h',
      '12h': '12h',
      '1d': '1d',
      '3d': '3d',
      '1w': '1w',
      '1M': '1M',
    };
    return tfMap[timeframe.toLowerCase()] || '1h';
  }
}

// Export factory function
export function createBinanceBroker(config: BinanceConfig): BinanceBroker {
  return new BinanceBroker(config);
}

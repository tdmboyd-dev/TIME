/**
 * OANDA Broker Integration
 *
 * Full integration with OANDA fxTrade API for:
 * - Forex trading (70+ currency pairs)
 * - CFDs on indices, commodities, bonds
 * - Practice accounts (demo trading)
 * - Real-time streaming prices via HTTP streaming
 * - Trailing stops and take profit/stop loss
 * - Transaction streaming for real-time fills
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
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
} from './broker_interface';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('OANDABroker');

interface OANDAConfig extends BrokerConfig {
  accountId: string;
  environment?: 'practice' | 'live';
  enableStreaming?: boolean;
}

/**
 * OANDA Supported Instruments:
 *
 * FOREX (70+ pairs):
 * - Majors: EUR_USD, GBP_USD, USD_JPY, USD_CHF, AUD_USD, NZD_USD, USD_CAD
 * - Minors: EUR_GBP, EUR_JPY, GBP_JPY, AUD_JPY, EUR_AUD, GBP_AUD
 * - Exotics: USD_MXN, USD_ZAR, EUR_TRY, USD_HKD, USD_SGD
 *
 * COMMODITIES (Precious Metals & Energy):
 * - XAU_USD (Gold), XAG_USD (Silver), XPT_USD (Platinum), XPD_USD (Palladium)
 * - BCO_USD (Brent Crude), WTICO_USD (WTI Crude), NATGAS_USD (Natural Gas)
 * - XCU_USD (Copper)
 *
 * CFDs (Indices & Bonds):
 * - SPX500_USD (S&P 500), NAS100_USD (NASDAQ 100), US30_USD (Dow Jones)
 * - UK100_GBP (FTSE 100), DE30_EUR (DAX 30), JP225_USD (Nikkei)
 * - USB02Y_USD, USB05Y_USD, USB10Y_USD, USB30Y_USD (US Treasuries)
 * - DE10YB_EUR (German Bund)
 */
export class OANDABroker extends BrokerInterface {
  public readonly name = 'OANDA';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['forex', 'commodities', 'cfds', 'bonds'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    supportsStreaming: true,
    supportsPaperTrading: true,
    supportsMargin: true,
    supportsFractional: true,
    supportsExtendedHours: true, // Forex is 24/5
  };

  private baseUrl: string;
  private streamUrl: string;
  private accountId: string;
  private environment: 'practice' | 'live';
  private apiClient: AxiosInstance;
  private enableStreaming: boolean;

  // Streaming connections
  private priceStreamRequest: any = null;
  private transactionStreamRequest: any = null;
  private subscribedSymbols: Set<string> = new Set();
  private priceStreamBuffer: string = '';
  private transactionStreamBuffer: string = '';
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Price cache for quick access
  private priceCache: Map<string, Quote> = new Map();

  constructor(config: OANDAConfig) {
    super(config);

    this.accountId = config.accountId;
    this.environment = config.environment || (config.isPaper ? 'practice' : 'live');
    this.enableStreaming = config.enableStreaming !== false;

    // Set URLs based on environment
    if (this.environment === 'practice') {
      this.baseUrl = 'https://api-fxpractice.oanda.com';
      this.streamUrl = 'https://stream-fxpractice.oanda.com';
      this.isPaperTrading = true;
    } else {
      this.baseUrl = 'https://api-fxtrade.oanda.com';
      this.streamUrl = 'https://stream-fxtrade.oanda.com';
    }

    // Create axios instance with Bearer token auth
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Connect to OANDA API
   */
  public async connect(): Promise<void> {
    logger.info(`Connecting to OANDA (${this.environment})...`);

    try {
      // Verify credentials by fetching account
      const account = await this.getAccount();
      logger.info(`Connected to OANDA. Account: ${account.id}`);

      this.isConnected = true;
      this.emit('connected');

      // Start transaction stream for real-time order/trade updates
      if (this.enableStreaming) {
        this.startTransactionStream();
      }
    } catch (error) {
      logger.error('Failed to connect to OANDA:', error as object);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from OANDA
   */
  public async disconnect(): Promise<void> {
    logger.info('Disconnecting from OANDA...');

    // Stop streaming connections
    this.stopPriceStream();
    this.stopTransactionStream();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isConnected = false;
    this.subscribedSymbols.clear();
    this.priceCache.clear();
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
    const response = await this.apiRequest('GET', `/v3/accounts/${this.accountId}`);
    const acc = response.account;

    return {
      id: acc.id,
      currency: acc.currency,
      balance: parseFloat(acc.balance),
      equity: parseFloat(acc.NAV),
      buyingPower: parseFloat(acc.marginAvailable),
      cash: parseFloat(acc.balance),
      portfolioValue: parseFloat(acc.NAV),
      pendingTransfers: 0,
      marginUsed: parseFloat(acc.marginUsed),
      marginAvailable: parseFloat(acc.marginAvailable),
      accountType: this.environment === 'practice' ? 'paper' : 'margin',
    };
  }

  /**
   * Get all positions
   */
  public async getPositions(): Promise<Position[]> {
    const response = await this.apiRequest('GET', `/v3/accounts/${this.accountId}/openPositions`);

    return response.positions.map((pos: any) => {
      const longUnits = parseFloat(pos.long?.units || '0');
      const shortUnits = parseFloat(pos.short?.units || '0');
      const units = longUnits !== 0 ? longUnits : shortUnits;
      const side = longUnits !== 0 ? 'long' : shortUnits !== 0 ? 'short' : 'flat';

      return {
        symbol: pos.instrument,
        side,
        quantity: Math.abs(units),
        entryPrice: parseFloat(
          side === 'long' ? pos.long?.averagePrice : pos.short?.averagePrice || '0'
        ),
        currentPrice: 0, // Need to fetch separately
        unrealizedPnL: parseFloat(
          side === 'long' ? pos.long?.unrealizedPL : pos.short?.unrealizedPL || '0'
        ),
        realizedPnL: parseFloat(
          side === 'long' ? pos.long?.realizedPL : pos.short?.realizedPL || '0'
        ),
        marketValue: 0,
      };
    });
  }

  /**
   * Get specific position
   */
  public async getPosition(symbol: string): Promise<Position | null> {
    try {
      const response = await this.apiRequest(
        'GET',
        `/v3/accounts/${this.accountId}/positions/${symbol}`
      );
      const pos = response.position;

      const longUnits = parseFloat(pos.long?.units || '0');
      const shortUnits = parseFloat(pos.short?.units || '0');

      if (longUnits === 0 && shortUnits === 0) {
        return null;
      }

      const side = longUnits !== 0 ? 'long' : 'short';
      const units = longUnits !== 0 ? longUnits : shortUnits;

      return {
        symbol: pos.instrument,
        side,
        quantity: Math.abs(units),
        entryPrice: parseFloat(
          side === 'long' ? pos.long?.averagePrice : pos.short?.averagePrice
        ),
        currentPrice: 0,
        unrealizedPnL: parseFloat(
          side === 'long' ? pos.long?.unrealizedPL : pos.short?.unrealizedPL
        ),
        realizedPnL: parseFloat(
          side === 'long' ? pos.long?.realizedPL : pos.short?.realizedPL
        ),
        marketValue: 0,
      };
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Submit an order
   */
  public async submitOrder(request: OrderRequest): Promise<Order> {
    logger.info(`Submitting ${request.side} ${request.type} order for ${request.symbol}`);

    // Convert to OANDA format
    const units = request.side === 'buy' ? request.quantity : -request.quantity;

    const orderData: any = {
      order: {
        instrument: request.symbol,
        units: units.toString(),
        type: this.mapOrderType(request.type),
        timeInForce: this.mapTimeInForce(request.timeInForce || 'gtc'),
        positionFill: 'DEFAULT',
      },
    };

    if (request.price) {
      orderData.order.price = request.price.toString();
    }

    if (request.stopPrice && (request.type === 'stop' || request.type === 'stop_limit')) {
      orderData.order.price = request.stopPrice.toString();
    }

    // Trailing stop parameters
    if (request.type === 'trailing_stop') {
      orderData.order.type = 'TRAILING_STOP_LOSS';
      if (request.trailingDelta) {
        orderData.order.distance = request.trailingDelta.toString();
      } else if (request.trailingPercent) {
        // OANDA uses distance in price units, not percentage
        // Would need current price to calculate
        const quote = await this.getQuote(request.symbol);
        const currentPrice = request.side === 'buy' ? quote.ask : quote.bid;
        const distance = currentPrice * (request.trailingPercent / 100);
        orderData.order.distance = distance.toFixed(5);
      }
    }

    // Take profit on fill
    if (request.takeProfit) {
      orderData.order.takeProfitOnFill = {
        price: request.takeProfit.toString(),
      };
    }

    // Stop loss on fill
    if (request.stopLoss) {
      orderData.order.stopLossOnFill = {
        price: request.stopLoss.toString(),
      };
    }

    // Trailing stop loss on fill
    if (request.trailingDelta && request.type !== 'trailing_stop') {
      orderData.order.trailingStopLossOnFill = {
        distance: request.trailingDelta.toString(),
      };
    }

    // Reduce only (for closing trades)
    if (request.reduceOnly) {
      orderData.order.positionFill = 'REDUCE_ONLY';
    }

    const response = await this.apiRequest(
      'POST',
      `/v3/accounts/${this.accountId}/orders`,
      orderData
    );

    const order = this.mapOandaOrder(response.orderCreateTransaction || response.orderFillTransaction);
    this.emitOrderUpdate(order);

    return order;
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    logger.info(`Cancelling order: ${orderId}`);

    try {
      await this.apiRequest('PUT', `/v3/accounts/${this.accountId}/orders/${orderId}/cancel`);
      return true;
    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}:`, error as object);
      return false;
    }
  }

  /**
   * Modify an order
   */
  public async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order> {
    logger.info(`Modifying order: ${orderId}`);

    const updateData: any = {
      order: {},
    };

    if (updates.quantity !== undefined) {
      updateData.order.units = updates.quantity.toString();
    }
    if (updates.price !== undefined) {
      updateData.order.price = updates.price.toString();
    }

    const response = await this.apiRequest(
      'PUT',
      `/v3/accounts/${this.accountId}/orders/${orderId}`,
      updateData
    );

    return this.mapOandaOrder(response.orderCreateTransaction);
  }

  /**
   * Get order by ID
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await this.apiRequest(
        'GET',
        `/v3/accounts/${this.accountId}/orders/${orderId}`
      );
      return this.mapOandaOrder(response.order);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get pending orders
   */
  public async getOrders(status?: OrderStatus): Promise<Order[]> {
    const response = await this.apiRequest(
      'GET',
      `/v3/accounts/${this.accountId}/pendingOrders`
    );

    return response.orders.map((order: any) => this.mapOandaOrder(order));
  }

  /**
   * Close a position
   */
  public async closePosition(symbol: string, quantity?: number): Promise<Order> {
    logger.info(`Closing position: ${symbol}`);

    const closeData: any = {};

    if (quantity) {
      // Determine if long or short position
      const position = await this.getPosition(symbol);
      if (position?.side === 'long') {
        closeData.longUnits = quantity.toString();
      } else {
        closeData.shortUnits = quantity.toString();
      }
    } else {
      // Close all
      closeData.longUnits = 'ALL';
      closeData.shortUnits = 'ALL';
    }

    const response = await this.apiRequest(
      'PUT',
      `/v3/accounts/${this.accountId}/positions/${symbol}/close`,
      closeData
    );

    return this.mapOandaOrder(response.longOrderFillTransaction || response.shortOrderFillTransaction);
  }

  /**
   * Close all positions
   */
  public async closeAllPositions(): Promise<Order[]> {
    const positions = await this.getPositions();
    const orders: Order[] = [];

    for (const position of positions) {
      const order = await this.closePosition(position.symbol);
      orders.push(order);
    }

    return orders;
  }

  /**
   * Get quote for a symbol
   */
  public async getQuote(symbol: string): Promise<Quote> {
    const response = await this.apiRequest(
      'GET',
      `/v3/accounts/${this.accountId}/pricing?instruments=${symbol}`
    );

    const price = response.prices[0];

    return {
      symbol,
      bid: parseFloat(price.bids[0]?.price || '0'),
      ask: parseFloat(price.asks[0]?.price || '0'),
      bidSize: parseInt(price.bids[0]?.liquidity || '0'),
      askSize: parseInt(price.asks[0]?.liquidity || '0'),
      timestamp: new Date(price.time),
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
    const granularity = this.mapGranularity(timeframe);
    const params = new URLSearchParams({
      from: start.toISOString(),
      to: end.toISOString(),
      granularity,
    });

    const response = await this.apiRequest(
      'GET',
      `/v3/instruments/${symbol}/candles?${params.toString()}`
    );

    return response.candles
      .filter((candle: any) => candle.complete)
      .map((candle: any) => ({
        symbol,
        open: parseFloat(candle.mid.o),
        high: parseFloat(candle.mid.h),
        low: parseFloat(candle.mid.l),
        close: parseFloat(candle.mid.c),
        volume: candle.volume,
        timestamp: new Date(candle.time),
      }));
  }

  /**
   * Subscribe to real-time quotes (streaming)
   */
  public async subscribeQuotes(symbols: string[]): Promise<void> {
    logger.info(`Starting price stream for: ${symbols.join(', ')}`);

    // Add symbols to subscription set
    symbols.forEach((s) => this.subscribedSymbols.add(s));

    // Restart price stream with new symbols
    this.restartPriceStream();
  }

  /**
   * Unsubscribe from quotes
   */
  public async unsubscribeQuotes(symbols: string[]): Promise<void> {
    logger.info(`Stopping price stream for: ${symbols.join(', ')}`);

    // Remove symbols from subscription set
    symbols.forEach((s) => this.subscribedSymbols.delete(s));

    if (this.subscribedSymbols.size === 0) {
      this.stopPriceStream();
    } else {
      // Restart with remaining symbols
      this.restartPriceStream();
    }
  }

  /**
   * Subscribe to real-time bars
   */
  public async subscribeBars(symbols: string[], timeframe: string): Promise<void> {
    logger.info(`Bar subscription via price stream aggregation: ${symbols.join(', ')} @ ${timeframe}`);

    // Subscribe to quotes and aggregate into bars
    await this.subscribeQuotes(symbols);

    // Bar aggregation would be handled by a separate timer
  }

  /**
   * Unsubscribe from bars
   */
  public async unsubscribeBars(symbols: string[]): Promise<void> {
    logger.info('Stopped bar polling');
    // Bars are derived from quotes, so just log
  }

  // ============================================================
  // STREAMING IMPLEMENTATION
  // ============================================================

  /**
   * Start price streaming via HTTP streaming
   */
  private startPriceStream(): void {
    if (this.subscribedSymbols.size === 0) {
      logger.debug('No symbols to stream');
      return;
    }

    const instruments = Array.from(this.subscribedSymbols).join(',');
    const streamPath = `/v3/accounts/${this.accountId}/pricing/stream?instruments=${instruments}`;

    logger.info(`Starting price stream: ${instruments}`);

    const url = new URL(streamPath, this.streamUrl);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    this.priceStreamRequest = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        logger.error(`Price stream error: ${res.statusCode}`);
        this.scheduleReconnect('price');
        return;
      }

      logger.info('Price stream connected');

      res.on('data', (chunk: Buffer) => {
        this.handlePriceStreamData(chunk.toString());
      });

      res.on('end', () => {
        logger.warn('Price stream ended');
        if (this.isConnected && this.subscribedSymbols.size > 0) {
          this.scheduleReconnect('price');
        }
      });
    });

    this.priceStreamRequest.on('error', (error: Error) => {
      logger.error('Price stream error:', error);
      this.scheduleReconnect('price');
    });

    this.priceStreamRequest.end();
  }

  /**
   * Stop price streaming
   */
  private stopPriceStream(): void {
    if (this.priceStreamRequest) {
      this.priceStreamRequest.destroy();
      this.priceStreamRequest = null;
      logger.info('Price stream stopped');
    }
  }

  /**
   * Restart price stream with current subscriptions
   */
  private restartPriceStream(): void {
    this.stopPriceStream();
    if (this.subscribedSymbols.size > 0) {
      this.startPriceStream();
    }
  }

  /**
   * Handle incoming price stream data
   */
  private handlePriceStreamData(data: string): void {
    this.priceStreamBuffer += data;

    // OANDA sends newline-delimited JSON
    const lines = this.priceStreamBuffer.split('\n');
    this.priceStreamBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        if (message.type === 'PRICE') {
          const quote: Quote = {
            symbol: message.instrument,
            bid: parseFloat(message.bids?.[0]?.price || '0'),
            ask: parseFloat(message.asks?.[0]?.price || '0'),
            bidSize: parseInt(message.bids?.[0]?.liquidity || '0'),
            askSize: parseInt(message.asks?.[0]?.liquidity || '0'),
            timestamp: new Date(message.time),
          };

          // Update cache
          this.priceCache.set(quote.symbol, quote);

          // Emit quote
          this.emitQuote(quote);
        } else if (message.type === 'HEARTBEAT') {
          // Heartbeat - connection is alive
          logger.debug('Price stream heartbeat');
        }
      } catch (error) {
        logger.warn('Failed to parse price stream message:', line);
      }
    }
  }

  /**
   * Start transaction streaming for real-time order/trade updates
   */
  private startTransactionStream(): void {
    const streamPath = `/v3/accounts/${this.accountId}/transactions/stream`;

    logger.info('Starting transaction stream');

    const url = new URL(streamPath, this.streamUrl);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    this.transactionStreamRequest = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        logger.error(`Transaction stream error: ${res.statusCode}`);
        this.scheduleReconnect('transaction');
        return;
      }

      logger.info('Transaction stream connected');

      res.on('data', (chunk: Buffer) => {
        this.handleTransactionStreamData(chunk.toString());
      });

      res.on('end', () => {
        logger.warn('Transaction stream ended');
        if (this.isConnected) {
          this.scheduleReconnect('transaction');
        }
      });
    });

    this.transactionStreamRequest.on('error', (error: Error) => {
      logger.error('Transaction stream error:', error);
      this.scheduleReconnect('transaction');
    });

    this.transactionStreamRequest.end();
  }

  /**
   * Stop transaction streaming
   */
  private stopTransactionStream(): void {
    if (this.transactionStreamRequest) {
      this.transactionStreamRequest.destroy();
      this.transactionStreamRequest = null;
      logger.info('Transaction stream stopped');
    }
  }

  /**
   * Handle incoming transaction stream data
   */
  private handleTransactionStreamData(data: string): void {
    this.transactionStreamBuffer += data;

    const lines = this.transactionStreamBuffer.split('\n');
    this.transactionStreamBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        switch (message.type) {
          case 'ORDER_FILL':
            // Order was filled
            logger.info(`Order filled: ${message.orderID} @ ${message.price}`);

            const filledOrder = this.mapOandaOrder(message);
            this.emitOrderUpdate(filledOrder);

            // Emit trade
            this.emitTrade({
              id: message.id,
              orderId: message.orderID,
              symbol: message.instrument,
              side: parseFloat(message.units) > 0 ? 'buy' : 'sell',
              quantity: Math.abs(parseFloat(message.units)),
              price: parseFloat(message.price),
              commission: parseFloat(message.commission || '0'),
              timestamp: new Date(message.time),
            });
            break;

          case 'ORDER_CANCEL':
            logger.info(`Order cancelled: ${message.orderID}`);
            this.emitOrderUpdate({
              id: message.orderID,
              symbol: '',
              side: 'buy',
              type: 'market',
              quantity: 0,
              filledQuantity: 0,
              timeInForce: 'gtc',
              status: 'cancelled',
              submittedAt: new Date(),
              cancelledAt: new Date(message.time),
            });
            break;

          case 'STOP_LOSS_ORDER':
          case 'TAKE_PROFIT_ORDER':
          case 'TRAILING_STOP_LOSS_ORDER':
            logger.info(`${message.type} created: ${message.id}`);
            break;

          case 'HEARTBEAT':
            logger.debug('Transaction stream heartbeat');
            break;
        }
      } catch (error) {
        logger.warn('Failed to parse transaction stream message:', line);
      }
    }
  }

  /**
   * Schedule stream reconnection
   */
  private scheduleReconnect(streamType: 'price' | 'transaction'): void {
    if (this.reconnectTimeout) return;

    logger.info(`Scheduling ${streamType} stream reconnect in 5 seconds`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;

      if (!this.isConnected) return;

      if (streamType === 'price') {
        this.startPriceStream();
      } else {
        this.startTransactionStream();
      }
    }, 5000);
  }

  /**
   * Get cached quote (for quick access without API call)
   */
  public getCachedQuote(symbol: string): Quote | null {
    return this.priceCache.get(symbol) || null;
  }

  /**
   * Get trade history
   */
  public async getTrades(
    symbol?: string,
    start?: Date,
    end?: Date
  ): Promise<BrokerTrade[]> {
    const params = new URLSearchParams();

    if (symbol) params.append('instrument', symbol);
    if (start) params.append('from', start.toISOString());
    if (end) params.append('to', end.toISOString());

    const response = await this.apiRequest(
      'GET',
      `/v3/accounts/${this.accountId}/trades?${params.toString()}`
    );

    return response.trades.map((trade: any) => ({
      id: trade.id,
      orderId: trade.openTradeID || trade.id,
      symbol: trade.instrument,
      side: parseFloat(trade.initialUnits) > 0 ? 'buy' : 'sell',
      quantity: Math.abs(parseFloat(trade.initialUnits)),
      price: parseFloat(trade.price),
      commission: parseFloat(trade.financing || '0'),
      timestamp: new Date(trade.openTime),
    }));
  }

  /**
   * Get available instruments
   */
  public async getSymbols(assetClass?: AssetClass): Promise<string[]> {
    const response = await this.apiRequest(
      'GET',
      `/v3/accounts/${this.accountId}/instruments`
    );

    return response.instruments
      .filter((inst: any) => {
        if (!assetClass) return true;
        if (assetClass === 'forex') return inst.type === 'CURRENCY';
        return true;
      })
      .map((inst: any) => inst.name);
  }

  /**
   * Check if market is open (Forex is 24/5)
   */
  public async isMarketOpen(): Promise<boolean> {
    const now = new Date();
    const day = now.getUTCDay();

    // Forex is closed Saturday and Sunday
    if (day === 0 || day === 6) {
      return false;
    }

    // Check Friday close (5pm EST) and Sunday open (5pm EST)
    return true;
  }

  /**
   * Get market hours
   */
  public async getMarketHours(): Promise<{ open: Date; close: Date }> {
    const now = new Date();

    // Simplified: Return next week's trading period
    return {
      open: new Date(now.getTime()),
      close: new Date(now.getTime() + 86400000 * 5),
    };
  }

  // Private methods

  private async apiRequest(method: string, path: string, body?: any): Promise<any> {
    try {
      logger.debug(`API Request: ${method} ${path}`);

      const response = await this.apiClient.request({
        method,
        url: path,
        data: body,
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        logger.error(`OANDA API error ${status}: ${JSON.stringify(data)}`);

        // Handle specific error codes
        if (status === 401) {
          throw new Error('Invalid OANDA API token');
        }
        if (status === 403) {
          throw new Error('Access forbidden - check API permissions');
        }
        if (status === 404) {
          const notFoundError = new Error(data?.errorMessage || 'Resource not found');
          (notFoundError as any).status = 404;
          throw notFoundError;
        }
        if (status === 400) {
          throw new Error(`Bad request: ${data?.errorMessage || JSON.stringify(data)}`);
        }

        throw new Error(data?.errorMessage || `OANDA API error: ${status}`);
      }

      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
        throw new Error('Unable to connect to OANDA API - check network connection');
      }

      throw error;
    }
  }

  private mapOandaOrder(oandaOrder: any): Order {
    return {
      id: oandaOrder.id || oandaOrder.orderID,
      clientOrderId: oandaOrder.clientOrderID,
      symbol: oandaOrder.instrument,
      side: parseFloat(oandaOrder.units || '0') >= 0 ? 'buy' : 'sell',
      type: this.reverseMapOrderType(oandaOrder.type),
      quantity: Math.abs(parseFloat(oandaOrder.units || '0')),
      filledQuantity: Math.abs(parseFloat(oandaOrder.filledUnits || oandaOrder.units || '0')),
      price: oandaOrder.price ? parseFloat(oandaOrder.price) : undefined,
      stopPrice: undefined,
      timeInForce: 'gtc',
      status: this.mapOandaStatus(oandaOrder.state || 'FILLED'),
      submittedAt: new Date(oandaOrder.createTime || oandaOrder.time),
      filledAt: oandaOrder.filledTime ? new Date(oandaOrder.filledTime) : undefined,
      cancelledAt: oandaOrder.cancelledTime ? new Date(oandaOrder.cancelledTime) : undefined,
      averageFilledPrice: oandaOrder.averagePrice
        ? parseFloat(oandaOrder.averagePrice)
        : undefined,
    };
  }

  private mapOrderType(type: string): string {
    const typeMap: Record<string, string> = {
      market: 'MARKET',
      limit: 'LIMIT',
      stop: 'STOP',
      stop_limit: 'STOP',
    };
    return typeMap[type] || 'MARKET';
  }

  private reverseMapOrderType(oandaType: string): 'market' | 'limit' | 'stop' | 'stop_limit' {
    const typeMap: Record<string, 'market' | 'limit' | 'stop' | 'stop_limit'> = {
      MARKET: 'market',
      LIMIT: 'limit',
      STOP: 'stop',
      MARKET_IF_TOUCHED: 'limit',
    };
    return typeMap[oandaType] || 'market';
  }

  private mapTimeInForce(tif: string): string {
    const tifMap: Record<string, string> = {
      day: 'GTC', // OANDA doesn't have DAY, use GTC
      gtc: 'GTC',
      ioc: 'IOC',
      fok: 'FOK',
    };
    return tifMap[tif] || 'GTC';
  }

  private mapOandaStatus(state: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      PENDING: 'pending',
      FILLED: 'filled',
      TRIGGERED: 'open',
      CANCELLED: 'cancelled',
    };
    return statusMap[state] || 'pending';
  }

  private mapGranularity(timeframe: string): string {
    const granMap: Record<string, string> = {
      '1m': 'M1',
      '5m': 'M5',
      '15m': 'M15',
      '30m': 'M30',
      '1h': 'H1',
      '4h': 'H4',
      '1d': 'D',
      '1w': 'W',
    };
    return granMap[timeframe.toLowerCase()] || 'H1';
  }
}

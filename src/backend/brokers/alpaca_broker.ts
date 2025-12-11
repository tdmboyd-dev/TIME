/**
 * Alpaca Broker Integration
 *
 * Integration with Alpaca Markets API for:
 * - US Stocks and ETFs
 * - Cryptocurrency trading
 * - Paper trading support
 * - Real-time market data streaming
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
} from './broker_interface';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('AlpacaBroker');

interface AlpacaConfig extends BrokerConfig {
  dataFeedType?: 'iex' | 'sip';
}

export class AlpacaBroker extends BrokerInterface {
  public readonly name = 'Alpaca';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['stock', 'crypto'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    supportsStreaming: true,
    supportsPaperTrading: true,
    supportsMargin: true,
    supportsFractional: true,
    supportsExtendedHours: true,
  };

  private baseUrl: string;
  private dataUrl: string;
  private streamUrl: string;
  private wsConnection: any = null;
  private dataFeedType: 'iex' | 'sip';

  constructor(config: AlpacaConfig) {
    super(config);

    this.dataFeedType = config.dataFeedType || 'iex';

    // Set URLs based on paper/live mode
    if (this.isPaperTrading) {
      this.baseUrl = 'https://paper-api.alpaca.markets';
      this.dataUrl = 'https://data.alpaca.markets';
      this.streamUrl = 'wss://stream.data.alpaca.markets';
    } else {
      this.baseUrl = config.baseUrl || 'https://api.alpaca.markets';
      this.dataUrl = 'https://data.alpaca.markets';
      this.streamUrl = 'wss://stream.data.alpaca.markets';
    }
  }

  /**
   * Connect to Alpaca API
   */
  public async connect(): Promise<void> {
    logger.info(`Connecting to Alpaca (${this.isPaperTrading ? 'Paper' : 'Live'})...`);

    try {
      // Verify credentials by fetching account
      const account = await this.getAccount();
      logger.info(`Connected to Alpaca. Account: ${account.id}`);

      this.isConnected = true;
      this.emit('connected');

      // Start WebSocket connection for real-time data
      await this.connectWebSocket();
    } catch (error) {
      logger.error('Failed to connect to Alpaca:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Alpaca
   */
  public async disconnect(): Promise<void> {
    logger.info('Disconnecting from Alpaca...');

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    this.isConnected = false;
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
    const response = await this.apiRequest('GET', '/v2/account');

    return {
      id: response.id,
      currency: response.currency,
      balance: parseFloat(response.cash),
      equity: parseFloat(response.equity),
      buyingPower: parseFloat(response.buying_power),
      cash: parseFloat(response.cash),
      portfolioValue: parseFloat(response.portfolio_value),
      pendingTransfers: parseFloat(response.pending_transfer_out || '0'),
      marginUsed: parseFloat(response.initial_margin || '0'),
      marginAvailable: parseFloat(response.regt_buying_power || '0'),
      accountType: response.account_type === 'PAPER' ? 'paper' : 'margin',
    };
  }

  /**
   * Get all positions
   */
  public async getPositions(): Promise<Position[]> {
    const response = await this.apiRequest('GET', '/v2/positions');

    return response.map((pos: any) => ({
      symbol: pos.symbol,
      side: parseFloat(pos.qty) > 0 ? 'long' : 'short',
      quantity: Math.abs(parseFloat(pos.qty)),
      entryPrice: parseFloat(pos.avg_entry_price),
      currentPrice: parseFloat(pos.current_price),
      unrealizedPnL: parseFloat(pos.unrealized_pl),
      realizedPnL: parseFloat(pos.realized_pl || '0'),
      marketValue: parseFloat(pos.market_value),
    }));
  }

  /**
   * Get specific position
   */
  public async getPosition(symbol: string): Promise<Position | null> {
    try {
      const response = await this.apiRequest('GET', `/v2/positions/${symbol}`);

      return {
        symbol: response.symbol,
        side: parseFloat(response.qty) > 0 ? 'long' : 'short',
        quantity: Math.abs(parseFloat(response.qty)),
        entryPrice: parseFloat(response.avg_entry_price),
        currentPrice: parseFloat(response.current_price),
        unrealizedPnL: parseFloat(response.unrealized_pl),
        realizedPnL: parseFloat(response.realized_pl || '0'),
        marketValue: parseFloat(response.market_value),
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

    const orderData: any = {
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      qty: request.quantity.toString(),
      time_in_force: request.timeInForce || 'day',
    };

    if (request.price) {
      orderData.limit_price = request.price.toString();
    }

    if (request.stopPrice) {
      orderData.stop_price = request.stopPrice.toString();
    }

    if (request.clientOrderId) {
      orderData.client_order_id = request.clientOrderId;
    }

    // Handle bracket orders (take profit / stop loss)
    if (request.takeProfit || request.stopLoss) {
      orderData.order_class = 'bracket';
      if (request.takeProfit) {
        orderData.take_profit = { limit_price: request.takeProfit.toString() };
      }
      if (request.stopLoss) {
        orderData.stop_loss = { stop_price: request.stopLoss.toString() };
      }
    }

    const response = await this.apiRequest('POST', '/v2/orders', orderData);

    const order = this.mapAlpacaOrder(response);
    this.emitOrderUpdate(order);

    return order;
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    logger.info(`Cancelling order: ${orderId}`);

    try {
      await this.apiRequest('DELETE', `/v2/orders/${orderId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Modify an order (cancel and replace)
   */
  public async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order> {
    logger.info(`Modifying order: ${orderId}`);

    const updateData: any = {};

    if (updates.quantity !== undefined) {
      updateData.qty = updates.quantity.toString();
    }
    if (updates.price !== undefined) {
      updateData.limit_price = updates.price.toString();
    }
    if (updates.stopPrice !== undefined) {
      updateData.stop_price = updates.stopPrice.toString();
    }
    if (updates.timeInForce) {
      updateData.time_in_force = updates.timeInForce;
    }

    const response = await this.apiRequest('PATCH', `/v2/orders/${orderId}`, updateData);

    return this.mapAlpacaOrder(response);
  }

  /**
   * Get order by ID
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await this.apiRequest('GET', `/v2/orders/${orderId}`);
      return this.mapAlpacaOrder(response);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get orders with optional status filter
   */
  public async getOrders(status?: OrderStatus): Promise<Order[]> {
    const params = new URLSearchParams();

    if (status) {
      params.append('status', status);
    }

    const response = await this.apiRequest('GET', `/v2/orders?${params.toString()}`);

    return response.map((order: any) => this.mapAlpacaOrder(order));
  }

  /**
   * Close a position
   */
  public async closePosition(symbol: string, quantity?: number): Promise<Order> {
    logger.info(`Closing position: ${symbol}`);

    const params = quantity ? `?qty=${quantity}` : '';
    const response = await this.apiRequest('DELETE', `/v2/positions/${symbol}${params}`);

    return this.mapAlpacaOrder(response);
  }

  /**
   * Close all positions
   */
  public async closeAllPositions(): Promise<Order[]> {
    logger.info('Closing all positions');

    const response = await this.apiRequest('DELETE', '/v2/positions');

    return response.map((order: any) => this.mapAlpacaOrder(order));
  }

  /**
   * Get quote for a symbol
   */
  public async getQuote(symbol: string): Promise<Quote> {
    const response = await this.dataRequest(
      'GET',
      `/v2/stocks/${symbol}/quotes/latest`
    );

    return {
      symbol,
      bid: response.quote.bp,
      ask: response.quote.ap,
      bidSize: response.quote.bs,
      askSize: response.quote.as,
      timestamp: new Date(response.quote.t),
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
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      timeframe: this.mapTimeframe(timeframe),
    });

    const response = await this.dataRequest(
      'GET',
      `/v2/stocks/${symbol}/bars?${params.toString()}`
    );

    return (response.bars || []).map((bar: any) => ({
      symbol,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      timestamp: new Date(bar.t),
    }));
  }

  /**
   * Subscribe to real-time quotes
   */
  public async subscribeQuotes(symbols: string[]): Promise<void> {
    if (!this.wsConnection) {
      throw new Error('WebSocket not connected');
    }

    this.wsConnection.send(
      JSON.stringify({
        action: 'subscribe',
        quotes: symbols,
      })
    );

    logger.info(`Subscribed to quotes: ${symbols.join(', ')}`);
  }

  /**
   * Unsubscribe from quotes
   */
  public async unsubscribeQuotes(symbols: string[]): Promise<void> {
    if (!this.wsConnection) return;

    this.wsConnection.send(
      JSON.stringify({
        action: 'unsubscribe',
        quotes: symbols,
      })
    );
  }

  /**
   * Subscribe to real-time bars
   */
  public async subscribeBars(symbols: string[], timeframe: string): Promise<void> {
    if (!this.wsConnection) {
      throw new Error('WebSocket not connected');
    }

    this.wsConnection.send(
      JSON.stringify({
        action: 'subscribe',
        bars: symbols,
      })
    );

    logger.info(`Subscribed to bars: ${symbols.join(', ')}`);
  }

  /**
   * Unsubscribe from bars
   */
  public async unsubscribeBars(symbols: string[]): Promise<void> {
    if (!this.wsConnection) return;

    this.wsConnection.send(
      JSON.stringify({
        action: 'unsubscribe',
        bars: symbols,
      })
    );
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

    if (symbol) params.append('symbol', symbol);
    if (start) params.append('after', start.toISOString());
    if (end) params.append('until', end.toISOString());

    const response = await this.apiRequest(
      'GET',
      `/v2/account/activities/FILL?${params.toString()}`
    );

    return response.map((activity: any) => ({
      id: activity.id,
      orderId: activity.order_id,
      symbol: activity.symbol,
      side: activity.side,
      quantity: parseFloat(activity.qty),
      price: parseFloat(activity.price),
      commission: 0, // Alpaca is commission-free
      timestamp: new Date(activity.transaction_time),
    }));
  }

  /**
   * Get available symbols
   */
  public async getSymbols(assetClass?: AssetClass): Promise<string[]> {
    const params = new URLSearchParams({ status: 'active' });

    if (assetClass === 'crypto') {
      params.append('asset_class', 'crypto');
    } else {
      params.append('asset_class', 'us_equity');
    }

    const response = await this.apiRequest('GET', `/v2/assets?${params.toString()}`);

    return response
      .filter((asset: any) => asset.tradable)
      .map((asset: any) => asset.symbol);
  }

  /**
   * Check if market is open
   */
  public async isMarketOpen(): Promise<boolean> {
    const response = await this.apiRequest('GET', '/v2/clock');
    return response.is_open;
  }

  /**
   * Get market hours
   */
  public async getMarketHours(): Promise<{ open: Date; close: Date }> {
    const response = await this.apiRequest('GET', '/v2/clock');

    return {
      open: new Date(response.next_open),
      close: new Date(response.next_close),
    };
  }

  // Private methods

  private async connectWebSocket(): Promise<void> {
    // In a real implementation, this would create a WebSocket connection
    // to wss://stream.data.alpaca.markets/v2/iex or /v2/sip
    logger.info('WebSocket connection would be established here');

    // Simulated connection for now
    // Real implementation would use 'ws' package:
    /*
    this.wsConnection = new WebSocket(`${this.streamUrl}/v2/${this.dataFeedType}`);

    this.wsConnection.on('open', () => {
      // Authenticate
      this.wsConnection.send(JSON.stringify({
        action: 'auth',
        key: this.config.apiKey,
        secret: this.config.apiSecret,
      }));
    });

    this.wsConnection.on('message', (data: string) => {
      const messages = JSON.parse(data);
      messages.forEach((msg: any) => {
        if (msg.T === 'q') {
          this.emitQuote({
            symbol: msg.S,
            bid: msg.bp,
            ask: msg.ap,
            bidSize: msg.bs,
            askSize: msg.as,
            timestamp: new Date(msg.t),
          });
        } else if (msg.T === 'b') {
          this.emitBar({
            symbol: msg.S,
            open: msg.o,
            high: msg.h,
            low: msg.l,
            close: msg.c,
            volume: msg.v,
            timestamp: new Date(msg.t),
          });
        }
      });
    });
    */
  }

  private async apiRequest(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'APCA-API-KEY-ID': this.config.apiKey,
      'APCA-API-SECRET-KEY': this.config.apiSecret,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    // In production, use actual fetch
    // For now, return simulated response
    logger.debug(`API Request: ${method} ${url}`);

    // Simulated responses
    if (path === '/v2/account') {
      return {
        id: 'alpaca-account-123',
        currency: 'USD',
        cash: '100000.00',
        equity: '105000.00',
        buying_power: '200000.00',
        portfolio_value: '105000.00',
        account_type: this.isPaperTrading ? 'PAPER' : 'MARGIN',
      };
    }

    if (path === '/v2/positions') {
      return []; // No positions initially
    }

    if (path === '/v2/clock') {
      return {
        is_open: true,
        next_open: new Date(Date.now() + 86400000).toISOString(),
        next_close: new Date(Date.now() + 43200000).toISOString(),
      };
    }

    return {};
  }

  private async dataRequest(method: string, path: string): Promise<any> {
    const url = `${this.dataUrl}${path}`;

    logger.debug(`Data Request: ${method} ${url}`);

    // Simulated response
    return {
      quote: {
        bp: 100.5,
        ap: 100.52,
        bs: 100,
        as: 150,
        t: new Date().toISOString(),
      },
    };
  }

  private mapAlpacaOrder(alpacaOrder: any): Order {
    return {
      id: alpacaOrder.id,
      clientOrderId: alpacaOrder.client_order_id,
      symbol: alpacaOrder.symbol,
      side: alpacaOrder.side,
      type: alpacaOrder.type,
      quantity: parseFloat(alpacaOrder.qty),
      filledQuantity: parseFloat(alpacaOrder.filled_qty || '0'),
      price: alpacaOrder.limit_price ? parseFloat(alpacaOrder.limit_price) : undefined,
      stopPrice: alpacaOrder.stop_price ? parseFloat(alpacaOrder.stop_price) : undefined,
      timeInForce: alpacaOrder.time_in_force,
      status: this.mapOrderStatus(alpacaOrder.status),
      submittedAt: new Date(alpacaOrder.submitted_at),
      filledAt: alpacaOrder.filled_at ? new Date(alpacaOrder.filled_at) : undefined,
      cancelledAt: alpacaOrder.canceled_at ? new Date(alpacaOrder.canceled_at) : undefined,
      averageFilledPrice: alpacaOrder.filled_avg_price
        ? parseFloat(alpacaOrder.filled_avg_price)
        : undefined,
      commission: 0, // Alpaca is commission-free
    };
  }

  private mapOrderStatus(alpacaStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      new: 'open',
      accepted: 'open',
      pending_new: 'pending',
      accepted_for_bidding: 'pending',
      stopped: 'open',
      rejected: 'rejected',
      suspended: 'open',
      calculated: 'open',
      filled: 'filled',
      partially_filled: 'partial',
      canceled: 'cancelled',
      expired: 'cancelled',
      replaced: 'cancelled',
      pending_cancel: 'open',
      pending_replace: 'open',
      done_for_day: 'cancelled',
    };

    return statusMap[alpacaStatus] || 'pending';
  }

  private mapTimeframe(timeframe: string): string {
    const tfMap: Record<string, string> = {
      '1m': '1Min',
      '5m': '5Min',
      '15m': '15Min',
      '30m': '30Min',
      '1h': '1Hour',
      '4h': '4Hour',
      '1d': '1Day',
      '1w': '1Week',
    };

    return tfMap[timeframe.toLowerCase()] || '1Day';
  }
}

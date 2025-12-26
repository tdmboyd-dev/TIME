/**
 * Paper Trading Broker
 *
 * Universal paper trading wrapper that simulates any broker:
 * - Simulated order execution with realistic fills
 * - Position tracking with P&L calculation
 * - Account balance management
 * - Realistic slippage and latency simulation
 * - Supports all order types including trailing stops
 * - Real market data integration for accurate pricing
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
  OrderType,
} from './broker_interface';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('PaperTradingBroker');

interface PaperTradingConfig extends BrokerConfig {
  initialBalance?: number;
  currency?: string;
  slippagePercent?: number;
  latencyMs?: number;
  fillProbability?: number;
  commissionPerTrade?: number;
  commissionPercent?: number;
  marginRequirement?: number;
  leverage?: number;
  priceProvider?: 'simulated' | 'live';
  liveDataBroker?: BrokerInterface;
}

interface SimulatedPosition extends Position {
  stopLossPrice?: number;
  takeProfitPrice?: number;
  trailingStopDistance?: number;
  trailingStopPrice?: number;
  highWaterMark?: number;
  lowWaterMark?: number;
}

interface PendingOrder extends Order {
  triggerPrice?: number;
  trailingDistance?: number;
  trailingStopPrice?: number;
  activationPrice?: number;
  expiresAt?: Date;
}

export class PaperTradingBroker extends BrokerInterface {
  public readonly name = 'Paper Trading';
  public readonly capabilities: BrokerCapabilities = {
    assetClasses: ['stock', 'crypto', 'forex', 'futures', 'options', 'commodities', 'cfds'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'take_profit', 'take_profit_limit'],
    supportsStreaming: true,
    supportsPaperTrading: true,
    supportsMargin: true,
    supportsFractional: true,
    supportsExtendedHours: true,
  };

  private balance: number;
  private currency: string;
  private slippagePercent: number;
  private latencyMs: number;
  private fillProbability: number;
  private commissionPerTrade: number;
  private commissionPercent: number;
  private marginRequirement: number;
  private leverage: number;
  private liveDataBroker?: BrokerInterface;

  private positions: Map<string, SimulatedPosition> = new Map();
  private orders: Map<string, PendingOrder> = new Map();
  private trades: BrokerTrade[] = [];
  private nextOrderId: number = 1;
  private nextTradeId: number = 1;

  // Price simulation
  private prices: Map<string, { bid: number; ask: number; last: number }> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private orderCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: PaperTradingConfig) {
    super({ ...config, isPaper: true });

    this.balance = config.initialBalance || 100000;
    this.currency = config.currency || 'USD';
    this.slippagePercent = config.slippagePercent || 0.01; // 0.01%
    this.latencyMs = config.latencyMs || 50;
    this.fillProbability = config.fillProbability || 0.98;
    this.commissionPerTrade = config.commissionPerTrade || 0;
    this.commissionPercent = config.commissionPercent || 0;
    this.marginRequirement = config.marginRequirement || 0.25; // 25%
    this.leverage = config.leverage || 1;
    this.liveDataBroker = config.liveDataBroker;
  }

  /**
   * Connect to paper trading
   */
  public async connect(): Promise<void> {
    logger.info(`Starting Paper Trading. Balance: ${this.currency} ${this.balance.toLocaleString()}`);

    this.isConnected = true;
    this.isPaperTrading = true;

    // Start price update simulation
    this.startPriceSimulation();

    // Start order check loop
    this.startOrderCheckLoop();

    this.emit('connected');
  }

  /**
   * Disconnect from paper trading
   */
  public async disconnect(): Promise<void> {
    logger.info('Stopping Paper Trading');

    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }

    if (this.orderCheckInterval) {
      clearInterval(this.orderCheckInterval);
      this.orderCheckInterval = null;
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
    const positions = Array.from(this.positions.values());
    const portfolioValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const unrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const equity = this.balance + unrealizedPnL;
    const marginUsed = portfolioValue * this.marginRequirement;
    const marginAvailable = equity - marginUsed;

    return {
      id: 'paper-trading',
      currency: this.currency,
      balance: this.balance,
      equity,
      buyingPower: Math.max(0, marginAvailable * this.leverage),
      cash: this.balance,
      portfolioValue,
      pendingTransfers: 0,
      marginUsed,
      marginAvailable: Math.max(0, marginAvailable),
      accountType: 'paper',
    };
  }

  /**
   * Get all positions
   */
  public async getPositions(): Promise<Position[]> {
    // Update position prices first
    await this.updatePositionPrices();
    return Array.from(this.positions.values());
  }

  /**
   * Get specific position
   */
  public async getPosition(symbol: string): Promise<Position | null> {
    const position = this.positions.get(symbol);
    if (!position) return null;

    // Update price
    await this.updatePositionPrices([symbol]);
    return this.positions.get(symbol) || null;
  }

  /**
   * Submit an order
   */
  public async submitOrder(request: OrderRequest): Promise<Order> {
    logger.info(`Paper Trading: ${request.side} ${request.type} ${request.quantity} ${request.symbol}`);

    // Simulate latency
    await this.delay(this.latencyMs);

    const orderId = `PAPER_${this.nextOrderId++}`;

    const order: PendingOrder = {
      id: orderId,
      clientOrderId: request.clientOrderId,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      filledQuantity: 0,
      price: request.price,
      stopPrice: request.stopPrice,
      timeInForce: request.timeInForce || 'gtc',
      status: 'pending',
      submittedAt: new Date(),
      trailingDelta: request.trailingDelta,
      trailingPercent: request.trailingPercent,
    };

    // Handle different order types
    if (request.type === 'market') {
      // Execute immediately
      await this.executeMarketOrder(order);
    } else {
      // Store for later execution
      order.status = 'open';

      // Set trigger prices for conditional orders
      if (request.type === 'limit') {
        order.triggerPrice = request.price;
      } else if (request.type === 'stop' || request.type === 'stop_limit') {
        order.triggerPrice = request.stopPrice;
      } else if (request.type === 'trailing_stop') {
        // Initialize trailing stop
        const currentPrice = await this.getCurrentPrice(request.symbol, request.side);
        if (request.trailingDelta) {
          order.trailingDistance = request.trailingDelta;
          order.trailingStopPrice = request.side === 'sell'
            ? currentPrice - request.trailingDelta
            : currentPrice + request.trailingDelta;
        } else if (request.trailingPercent) {
          order.trailingDistance = currentPrice * (request.trailingPercent / 100);
          order.trailingStopPrice = request.side === 'sell'
            ? currentPrice * (1 - request.trailingPercent / 100)
            : currentPrice * (1 + request.trailingPercent / 100);
        }
      }

      this.orders.set(orderId, order);
    }

    this.emitOrderUpdate(order);
    return order;
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    if (order.status !== 'open' && order.status !== 'pending') {
      return false;
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    this.orders.delete(orderId);

    logger.info(`Paper Trading: Cancelled order ${orderId}`);
    this.emitOrderUpdate(order);

    return true;
  }

  /**
   * Modify an order
   */
  public async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Cancel and resubmit
    await this.cancelOrder(orderId);

    return this.submitOrder({
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: updates.quantity || order.quantity,
      price: updates.price || order.price,
      stopPrice: updates.stopPrice || order.stopPrice,
      timeInForce: updates.timeInForce || order.timeInForce,
      trailingDelta: updates.trailingDelta || order.trailingDelta,
      trailingPercent: updates.trailingPercent || order.trailingPercent,
    });
  }

  /**
   * Get order by ID
   */
  public async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  /**
   * Get orders with optional status filter
   */
  public async getOrders(status?: OrderStatus): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter((o) => !status || o.status === status);
  }

  /**
   * Close a position
   */
  public async closePosition(symbol: string, quantity?: number): Promise<Order> {
    const position = this.positions.get(symbol);
    if (!position) {
      throw new Error(`No position found for ${symbol}`);
    }

    const closeQty = quantity || position.quantity;

    return this.submitOrder({
      symbol,
      side: position.side === 'long' ? 'sell' : 'buy',
      type: 'market',
      quantity: closeQty,
    });
  }

  /**
   * Close all positions
   */
  public async closeAllPositions(): Promise<Order[]> {
    const positions = Array.from(this.positions.values());
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
    // Try live data first
    if (this.liveDataBroker && this.liveDataBroker.isReady()) {
      try {
        return await this.liveDataBroker.getQuote(symbol);
      } catch (error) {
        logger.debug(`Failed to get live quote for ${symbol}, using simulated`);
      }
    }

    // Use simulated price
    const price = this.getSimulatedPrice(symbol);

    return {
      symbol,
      bid: price.bid,
      ask: price.ask,
      bidSize: 10000,
      askSize: 10000,
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
    // Try live data first
    if (this.liveDataBroker && this.liveDataBroker.isReady()) {
      try {
        return await this.liveDataBroker.getBars(symbol, timeframe, start, end);
      } catch (error) {
        logger.debug(`Failed to get live bars for ${symbol}, generating simulated`);
      }
    }

    // Generate simulated bars
    return this.generateSimulatedBars(symbol, timeframe, start, end);
  }

  /**
   * Subscribe to real-time quotes
   */
  public async subscribeQuotes(symbols: string[]): Promise<void> {
    logger.info(`Paper Trading: Subscribing to quotes: ${symbols.join(', ')}`);

    // Initialize prices for these symbols
    for (const symbol of symbols) {
      if (!this.prices.has(symbol)) {
        this.prices.set(symbol, this.getSimulatedPrice(symbol));
      }
    }

    // If we have a live data broker, subscribe there too
    if (this.liveDataBroker && this.liveDataBroker.isReady()) {
      await this.liveDataBroker.subscribeQuotes(symbols);
    }
  }

  /**
   * Unsubscribe from quotes
   */
  public async unsubscribeQuotes(symbols: string[]): Promise<void> {
    logger.info(`Paper Trading: Unsubscribing from quotes: ${symbols.join(', ')}`);

    if (this.liveDataBroker && this.liveDataBroker.isReady()) {
      await this.liveDataBroker.unsubscribeQuotes(symbols);
    }
  }

  /**
   * Subscribe to real-time bars
   */
  public async subscribeBars(symbols: string[], timeframe: string): Promise<void> {
    logger.info(`Paper Trading: Subscribing to bars: ${symbols.join(', ')} @ ${timeframe}`);

    if (this.liveDataBroker && this.liveDataBroker.isReady()) {
      await this.liveDataBroker.subscribeBars(symbols, timeframe);
    }
  }

  /**
   * Unsubscribe from bars
   */
  public async unsubscribeBars(symbols: string[]): Promise<void> {
    logger.info(`Paper Trading: Unsubscribing from bars: ${symbols.join(', ')}`);

    if (this.liveDataBroker && this.liveDataBroker.isReady()) {
      await this.liveDataBroker.unsubscribeBars(symbols);
    }
  }

  /**
   * Get trade history
   */
  public async getTrades(
    symbol?: string,
    start?: Date,
    end?: Date
  ): Promise<BrokerTrade[]> {
    return this.trades.filter((t) => {
      if (symbol && t.symbol !== symbol) return false;
      if (start && t.timestamp < start) return false;
      if (end && t.timestamp > end) return false;
      return true;
    });
  }

  /**
   * Get available symbols
   */
  public async getSymbols(assetClass?: AssetClass): Promise<string[]> {
    if (this.liveDataBroker && this.liveDataBroker.isReady()) {
      return this.liveDataBroker.getSymbols(assetClass);
    }

    // Return some common symbols for paper trading
    const symbols: Record<AssetClass, string[]> = {
      stock: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ'],
      crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'XRP/USD'],
      forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD'],
      futures: ['ES', 'NQ', 'CL', 'GC', 'ZN'],
      options: [],
      commodities: ['XAUUSD', 'XAGUSD', 'WTICOUSD'],
      cfds: ['US30', 'SPX500', 'NAS100'],
      bonds: ['USB10Y', 'USB30Y'],
    };

    if (assetClass) {
      return symbols[assetClass] || [];
    }

    return Object.values(symbols).flat();
  }

  /**
   * Check if market is open
   */
  public async isMarketOpen(): Promise<boolean> {
    // Paper trading is always open
    return true;
  }

  /**
   * Get market hours
   */
  public async getMarketHours(): Promise<{ open: Date; close: Date }> {
    // Paper trading is 24/7
    const now = new Date();
    return {
      open: now,
      close: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Reset paper trading account
   */
  public reset(initialBalance?: number): void {
    this.balance = initialBalance || (this.config as PaperTradingConfig).initialBalance || 100000;
    this.positions.clear();
    this.orders.clear();
    this.trades = [];
    this.nextOrderId = 1;
    this.nextTradeId = 1;

    logger.info(`Paper Trading reset. Balance: ${this.currency} ${this.balance.toLocaleString()}`);
    this.emit('accountReset', this.balance);
  }

  /**
   * Set account balance
   */
  public setBalance(balance: number): void {
    this.balance = balance;
    logger.info(`Paper Trading balance set to: ${this.currency} ${this.balance.toLocaleString()}`);
  }

  // Private methods

  /**
   * Execute a market order
   */
  private async executeMarketOrder(order: PendingOrder): Promise<void> {
    // Check fill probability
    if (Math.random() > this.fillProbability) {
      order.status = 'rejected';
      order.rejectReason = 'Order rejected (simulated)';
      logger.warn(`Paper Trading: Order ${order.id} rejected`);
      return;
    }

    // Get current price
    const fillPrice = await this.getFillPrice(order.symbol, order.side);

    // Calculate commission
    const commission = this.calculateCommission(fillPrice, order.quantity);

    // Check if we have enough balance
    const orderValue = fillPrice * order.quantity;
    if (order.side === 'buy' && orderValue > this.balance) {
      order.status = 'rejected';
      order.rejectReason = 'Insufficient funds';
      logger.warn(`Paper Trading: Insufficient funds for order ${order.id}`);
      return;
    }

    // Update or create position
    await this.updatePosition(order, fillPrice, commission);

    // Record trade
    const trade: BrokerTrade = {
      id: `TRADE_${this.nextTradeId++}`,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: fillPrice,
      commission,
      timestamp: new Date(),
    };
    this.trades.push(trade);

    // Update order status
    order.status = 'filled';
    order.filledQuantity = order.quantity;
    order.averageFilledPrice = fillPrice;
    order.filledAt = new Date();
    order.commission = commission;

    logger.info(`Paper Trading: Filled ${order.side} ${order.quantity} ${order.symbol} @ ${fillPrice}`);

    this.emitOrderUpdate(order);
    this.emitTrade(trade);
  }

  /**
   * Update position after trade
   */
  private async updatePosition(order: Order, fillPrice: number, commission: number): Promise<void> {
    const existing = this.positions.get(order.symbol);
    const orderValue = fillPrice * order.quantity;

    if (order.side === 'buy') {
      // Deduct from balance
      this.balance -= orderValue + commission;

      if (existing && existing.side === 'long') {
        // Add to existing long position
        const totalQty = existing.quantity + order.quantity;
        const avgPrice = (existing.entryPrice * existing.quantity + fillPrice * order.quantity) / totalQty;

        existing.quantity = totalQty;
        existing.entryPrice = avgPrice;
        existing.currentPrice = fillPrice;
        existing.marketValue = totalQty * fillPrice;
        existing.unrealizedPnL = (fillPrice - avgPrice) * totalQty;
      } else if (existing && existing.side === 'short') {
        // Reduce or flip short position
        const remainingQty = existing.quantity - order.quantity;

        if (remainingQty > 0) {
          existing.quantity = remainingQty;
          existing.marketValue = remainingQty * fillPrice;
          existing.unrealizedPnL = (existing.entryPrice - fillPrice) * remainingQty;

          // Realize P&L on closed portion
          const closedPnL = (existing.entryPrice - fillPrice) * order.quantity;
          this.balance += orderValue + closedPnL;
          existing.realizedPnL += closedPnL;
        } else if (remainingQty < 0) {
          // Flip to long
          existing.side = 'long';
          existing.quantity = Math.abs(remainingQty);
          existing.entryPrice = fillPrice;
          existing.currentPrice = fillPrice;

          // Realize P&L on short close
          const closedPnL = (existing.entryPrice - fillPrice) * existing.quantity;
          this.balance += orderValue + closedPnL;
          existing.realizedPnL += closedPnL;
        } else {
          // Exact close
          const closedPnL = (existing.entryPrice - fillPrice) * order.quantity;
          this.balance += orderValue + closedPnL;
          this.positions.delete(order.symbol);
        }
      } else {
        // New long position
        this.positions.set(order.symbol, {
          symbol: order.symbol,
          side: 'long',
          quantity: order.quantity,
          entryPrice: fillPrice,
          currentPrice: fillPrice,
          unrealizedPnL: 0,
          realizedPnL: 0,
          marketValue: orderValue,
        });
      }
    } else {
      // Sell order
      if (existing && existing.side === 'long') {
        // Reduce or close long position
        const remainingQty = existing.quantity - order.quantity;

        if (remainingQty > 0) {
          // Partial close
          const closedPnL = (fillPrice - existing.entryPrice) * order.quantity;
          this.balance += orderValue - commission;
          existing.quantity = remainingQty;
          existing.marketValue = remainingQty * fillPrice;
          existing.unrealizedPnL = (fillPrice - existing.entryPrice) * remainingQty;
          existing.realizedPnL += closedPnL;
        } else if (remainingQty < 0) {
          // Flip to short
          const closedPnL = (fillPrice - existing.entryPrice) * existing.quantity;
          this.balance += existing.quantity * fillPrice;
          existing.side = 'short';
          existing.quantity = Math.abs(remainingQty);
          existing.entryPrice = fillPrice;
          existing.realizedPnL += closedPnL;
        } else {
          // Exact close
          const closedPnL = (fillPrice - existing.entryPrice) * order.quantity;
          this.balance += orderValue - commission;
          this.positions.delete(order.symbol);
        }
      } else {
        // Short sale - open or add to short position
        this.balance += orderValue - commission;

        if (existing && existing.side === 'short') {
          const totalQty = existing.quantity + order.quantity;
          const avgPrice = (existing.entryPrice * existing.quantity + fillPrice * order.quantity) / totalQty;
          existing.quantity = totalQty;
          existing.entryPrice = avgPrice;
        } else {
          this.positions.set(order.symbol, {
            symbol: order.symbol,
            side: 'short',
            quantity: order.quantity,
            entryPrice: fillPrice,
            currentPrice: fillPrice,
            unrealizedPnL: 0,
            realizedPnL: 0,
            marketValue: orderValue,
          });
        }
      }
    }
  }

  /**
   * Get fill price with slippage
   */
  private async getFillPrice(symbol: string, side: 'buy' | 'sell'): Promise<number> {
    const quote = await this.getQuote(symbol);
    const basePrice = side === 'buy' ? quote.ask : quote.bid;

    // Apply slippage
    const slippage = basePrice * (this.slippagePercent / 100);
    return side === 'buy' ? basePrice + slippage : basePrice - slippage;
  }

  /**
   * Get current price without slippage
   */
  private async getCurrentPrice(symbol: string, side: 'buy' | 'sell'): Promise<number> {
    const quote = await this.getQuote(symbol);
    return side === 'buy' ? quote.ask : quote.bid;
  }

  /**
   * Calculate commission
   */
  private calculateCommission(price: number, quantity: number): number {
    const percentCommission = price * quantity * (this.commissionPercent / 100);
    return this.commissionPerTrade + percentCommission;
  }

  /**
   * Start price simulation
   */
  private startPriceSimulation(): void {
    this.priceUpdateInterval = setInterval(() => {
      for (const [symbol, price] of this.prices) {
        // Random walk
        const change = (Math.random() - 0.5) * 0.001 * price.last;
        price.last += change;
        price.bid = price.last * 0.9999;
        price.ask = price.last * 1.0001;

        // Emit quote update
        this.emitQuote({
          symbol,
          bid: price.bid,
          ask: price.ask,
          bidSize: 10000,
          askSize: 10000,
          timestamp: new Date(),
        });
      }
    }, 1000);
  }

  /**
   * Start order check loop
   */
  private startOrderCheckLoop(): void {
    this.orderCheckInterval = setInterval(async () => {
      await this.checkPendingOrders();
      await this.checkTrailingStops();
    }, 100);
  }

  /**
   * Check and execute pending orders
   */
  private async checkPendingOrders(): Promise<void> {
    for (const [orderId, order] of this.orders) {
      if (order.status !== 'open') continue;

      try {
        const currentPrice = await this.getCurrentPrice(order.symbol, order.side);
        let shouldExecute = false;

        switch (order.type) {
          case 'limit':
            // Buy limit: execute if price <= limit
            // Sell limit: execute if price >= limit
            if (order.side === 'buy' && currentPrice <= (order.price || Infinity)) {
              shouldExecute = true;
            } else if (order.side === 'sell' && currentPrice >= (order.price || 0)) {
              shouldExecute = true;
            }
            break;

          case 'stop':
            // Buy stop: execute if price >= stop
            // Sell stop: execute if price <= stop
            if (order.side === 'buy' && currentPrice >= (order.stopPrice || 0)) {
              shouldExecute = true;
            } else if (order.side === 'sell' && currentPrice <= (order.stopPrice || Infinity)) {
              shouldExecute = true;
            }
            break;

          case 'stop_limit':
            // Check if stop triggered, then check limit
            if (order.side === 'buy' && currentPrice >= (order.stopPrice || 0)) {
              if (currentPrice <= (order.price || Infinity)) {
                shouldExecute = true;
              }
            } else if (order.side === 'sell' && currentPrice <= (order.stopPrice || Infinity)) {
              if (currentPrice >= (order.price || 0)) {
                shouldExecute = true;
              }
            }
            break;

          case 'trailing_stop':
            // Check trailing stop price
            if (order.trailingStopPrice) {
              if (order.side === 'sell' && currentPrice <= order.trailingStopPrice) {
                shouldExecute = true;
              } else if (order.side === 'buy' && currentPrice >= order.trailingStopPrice) {
                shouldExecute = true;
              }
            }
            break;
        }

        if (shouldExecute) {
          this.orders.delete(orderId);
          await this.executeMarketOrder(order);
        }
      } catch (error) {
        logger.error(`Error checking order ${orderId}:`, error);
      }
    }
  }

  /**
   * Update trailing stop prices
   */
  private async checkTrailingStops(): Promise<void> {
    for (const order of this.orders.values()) {
      if (order.type !== 'trailing_stop' || order.status !== 'open') continue;

      try {
        const currentPrice = await this.getCurrentPrice(order.symbol, order.side);

        if (order.trailingDistance && order.trailingStopPrice) {
          if (order.side === 'sell') {
            // For sell trailing stop, trail up when price rises
            const newStopPrice = currentPrice - order.trailingDistance;
            if (newStopPrice > order.trailingStopPrice) {
              order.trailingStopPrice = newStopPrice;
              logger.debug(`Trailing stop updated for ${order.symbol}: ${newStopPrice.toFixed(2)}`);
            }
          } else {
            // For buy trailing stop, trail down when price falls
            const newStopPrice = currentPrice + order.trailingDistance;
            if (newStopPrice < order.trailingStopPrice) {
              order.trailingStopPrice = newStopPrice;
              logger.debug(`Trailing stop updated for ${order.symbol}: ${newStopPrice.toFixed(2)}`);
            }
          }
        }
      } catch (error) {
        logger.error(`Error updating trailing stop for ${order.id}:`, error);
      }
    }
  }

  /**
   * Update position prices
   */
  private async updatePositionPrices(symbols?: string[]): Promise<void> {
    const positionsToUpdate = symbols
      ? symbols.map((s) => this.positions.get(s)).filter(Boolean) as SimulatedPosition[]
      : Array.from(this.positions.values());

    for (const position of positionsToUpdate) {
      try {
        const quote = await this.getQuote(position.symbol);
        position.currentPrice = position.side === 'long' ? quote.bid : quote.ask;
        position.marketValue = position.quantity * position.currentPrice;

        if (position.side === 'long') {
          position.unrealizedPnL = (position.currentPrice - position.entryPrice) * position.quantity;
        } else {
          position.unrealizedPnL = (position.entryPrice - position.currentPrice) * position.quantity;
        }
      } catch (error) {
        logger.debug(`Failed to update position price for ${position.symbol}`);
      }
    }
  }

  /**
   * Get simulated price for a symbol
   */
  private getSimulatedPrice(symbol: string): { bid: number; ask: number; last: number } {
    // Use cached price if available
    const cached = this.prices.get(symbol);
    if (cached) return cached;

    // Generate base price based on symbol type
    let basePrice: number;

    if (symbol.includes('BTC')) {
      basePrice = 45000 + Math.random() * 5000;
    } else if (symbol.includes('ETH')) {
      basePrice = 2500 + Math.random() * 500;
    } else if (symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('USD')) {
      basePrice = 1.0 + Math.random() * 0.5;
    } else if (['AAPL', 'MSFT', 'GOOGL', 'AMZN'].some((s) => symbol.includes(s))) {
      basePrice = 150 + Math.random() * 200;
    } else if (symbol.includes('XAU') || symbol.includes('GOLD')) {
      basePrice = 2000 + Math.random() * 100;
    } else {
      basePrice = 100 + Math.random() * 100;
    }

    const spread = basePrice * 0.0002; // 0.02% spread

    const price = {
      bid: basePrice - spread / 2,
      ask: basePrice + spread / 2,
      last: basePrice,
    };

    this.prices.set(symbol, price);
    return price;
  }

  /**
   * Generate simulated historical bars
   */
  private generateSimulatedBars(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date
  ): Bar[] {
    const bars: Bar[] = [];
    const intervalMs = this.getIntervalMs(timeframe);
    const basePrice = this.getSimulatedPrice(symbol).last;

    let currentTime = start.getTime();
    let currentPrice = basePrice;

    while (currentTime <= end.getTime()) {
      // Random walk for price
      const change = (Math.random() - 0.5) * 0.02 * currentPrice;
      currentPrice += change;

      const high = currentPrice * (1 + Math.random() * 0.005);
      const low = currentPrice * (1 - Math.random() * 0.005);
      const open = low + Math.random() * (high - low);
      const close = low + Math.random() * (high - low);

      bars.push({
        symbol,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date(currentTime),
      });

      currentTime += intervalMs;
    }

    return bars;
  }

  /**
   * Get interval in milliseconds from timeframe string
   */
  private getIntervalMs(timeframe: string): number {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1)) || 1;

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Factory function
export function createPaperTradingBroker(config?: Partial<PaperTradingConfig>): PaperTradingBroker {
  const defaultConfig: PaperTradingConfig = {
    apiKey: 'paper',
    apiSecret: 'paper',
    isPaper: true,
    initialBalance: 100000,
    currency: 'USD',
    slippagePercent: 0.01,
    latencyMs: 50,
    fillProbability: 0.98,
    commissionPerTrade: 0,
    commissionPercent: 0,
  };

  return new PaperTradingBroker({ ...defaultConfig, ...config });
}

/**
 * Broker Interface
 *
 * Abstract interface that all broker integrations must implement.
 * This ensures consistent API across different brokers (Alpaca, OANDA, MT4/MT5, IB)
 */

import { EventEmitter } from 'events';

// Order types
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'open' | 'filled' | 'partial' | 'cancelled' | 'rejected';
export type PositionSide = 'long' | 'short' | 'flat';
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

// Account types
export type AccountType = 'cash' | 'margin' | 'paper';
export type AssetClass = 'stock' | 'crypto' | 'forex' | 'futures' | 'options';

// Market data types
export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: Date;
}

export interface Bar {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export interface Tick {
  symbol: string;
  price: number;
  size: number;
  side: 'bid' | 'ask';
  timestamp: Date;
}

// Order interface
export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;
  status: OrderStatus;
  submittedAt: Date;
  filledAt?: Date;
  cancelledAt?: Date;
  averageFilledPrice?: number;
  commission?: number;
}

// Position interface
export interface Position {
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  marketValue: number;
}

// Account interface
export interface Account {
  id: string;
  currency: string;
  balance: number;
  equity: number;
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  pendingTransfers: number;
  marginUsed: number;
  marginAvailable: number;
  accountType: AccountType;
}

// Trade interface
export interface BrokerTrade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number;
  timestamp: Date;
}

// Order request
export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
  takeProfit?: number;
  stopLoss?: number;
}

// Broker configuration
export interface BrokerConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  isPaper?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

// Broker capabilities
export interface BrokerCapabilities {
  assetClasses: AssetClass[];
  orderTypes: OrderType[];
  supportsStreaming: boolean;
  supportsPaperTrading: boolean;
  supportsMargin: boolean;
  supportsFractional: boolean;
  supportsExtendedHours: boolean;
  maxPositions?: number;
  minOrderSize?: number;
}

// Broker events
export interface BrokerEvents {
  connected: () => void;
  disconnected: (reason: string) => void;
  error: (error: Error) => void;
  orderUpdate: (order: Order) => void;
  positionUpdate: (position: Position) => void;
  accountUpdate: (account: Account) => void;
  trade: (trade: BrokerTrade) => void;
  quote: (quote: Quote) => void;
  bar: (bar: Bar) => void;
  tick: (tick: Tick) => void;
}

/**
 * Abstract Broker Interface
 * All broker integrations must extend this class
 */
export abstract class BrokerInterface extends EventEmitter {
  protected config: BrokerConfig;
  protected isConnected: boolean = false;
  protected isPaperTrading: boolean = false;

  public abstract readonly name: string;
  public abstract readonly capabilities: BrokerCapabilities;

  constructor(config: BrokerConfig) {
    super();
    this.config = config;
    this.isPaperTrading = config.isPaper ?? false;
  }

  // Connection methods
  public abstract connect(): Promise<void>;
  public abstract disconnect(): Promise<void>;
  public abstract isReady(): boolean;

  // Account methods
  public abstract getAccount(): Promise<Account>;
  public abstract getPositions(): Promise<Position[]>;
  public abstract getPosition(symbol: string): Promise<Position | null>;

  // Order methods
  public abstract submitOrder(request: OrderRequest): Promise<Order>;
  public abstract cancelOrder(orderId: string): Promise<boolean>;
  public abstract modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order>;
  public abstract getOrder(orderId: string): Promise<Order | null>;
  public abstract getOrders(status?: OrderStatus): Promise<Order[]>;

  // Position management
  public abstract closePosition(symbol: string, quantity?: number): Promise<Order>;
  public abstract closeAllPositions(): Promise<Order[]>;

  // Market data
  public abstract getQuote(symbol: string): Promise<Quote>;
  public abstract getBars(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date
  ): Promise<Bar[]>;
  public abstract subscribeQuotes(symbols: string[]): Promise<void>;
  public abstract unsubscribeQuotes(symbols: string[]): Promise<void>;
  public abstract subscribeBars(symbols: string[], timeframe: string): Promise<void>;
  public abstract unsubscribeBars(symbols: string[]): Promise<void>;

  // History
  public abstract getTrades(
    symbol?: string,
    start?: Date,
    end?: Date
  ): Promise<BrokerTrade[]>;

  // Utility methods
  public abstract getSymbols(assetClass?: AssetClass): Promise<string[]>;
  public abstract isMarketOpen(): Promise<boolean>;
  public abstract getMarketHours(): Promise<{ open: Date; close: Date }>;

  // Helper methods
  protected emitOrderUpdate(order: Order): void {
    this.emit('orderUpdate', order);
  }

  protected emitPositionUpdate(position: Position): void {
    this.emit('positionUpdate', position);
  }

  protected emitAccountUpdate(account: Account): void {
    this.emit('accountUpdate', account);
  }

  protected emitTrade(trade: BrokerTrade): void {
    this.emit('trade', trade);
  }

  protected emitQuote(quote: Quote): void {
    this.emit('quote', quote);
  }

  protected emitBar(bar: Bar): void {
    this.emit('bar', bar);
  }

  protected emitTick(tick: Tick): void {
    this.emit('tick', tick);
  }
}

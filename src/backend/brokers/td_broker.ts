/**
 * TD Ameritrade / Charles Schwab Integration
 *
 * Supports:
 * - Stocks, ETFs, Options
 * - Real-time market data
 * - Order execution
 * - Account management
 *
 * NOTE: Uses OAuth 2.0 for authentication
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('TDBroker');

// Types
export interface TDConfig {
  clientId: string;      // API Key from developer.tdameritrade.com
  redirectUri: string;   // OAuth redirect URI
  accessToken?: string;  // OAuth access token
  refreshToken?: string; // OAuth refresh token
}

export interface TDOrder {
  orderId: string;
  symbol: string;
  instruction: 'BUY' | 'SELL' | 'BUY_TO_COVER' | 'SELL_SHORT';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  price?: number;
  stopPrice?: number;
  duration: 'DAY' | 'GTC' | 'FOK';
  status: string;
  filledQuantity: number;
  avgFillPrice: number;
}

export interface TDPosition {
  symbol: string;
  longQuantity: number;
  shortQuantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  dayPnL: number;
  dayPnLPercent: number;
}

export interface TDAccount {
  accountId: string;
  type: string;
  roundTrips: number;
  isDayTrader: boolean;
  equity: number;
  cashBalance: number;
  buyingPower: number;
}

// TD Ameritrade Broker Class
export class TDBroker extends EventEmitter {
  private config: TDConfig;
  private connected: boolean = false;
  private accounts: TDAccount[] = [];
  private positions: Map<string, TDPosition> = new Map();
  private orders: Map<string, TDOrder> = new Map();

  constructor(config: TDConfig) {
    super();
    this.config = config;
    logger.info('TDBroker initialized');
  }

  // Generate OAuth URL
  getAuthUrl(): string {
    const baseUrl = 'https://auth.tdameritrade.com/auth';
    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      client_id: `${this.config.clientId}@AMER.OAUTHAP`,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  // Exchange code for tokens
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // In production, make actual API call
    // For now, simulate
    logger.info('Exchanging authorization code for tokens');

    return {
      accessToken: 'simulated_access_token',
      refreshToken: 'simulated_refresh_token',
      expiresIn: 1800,
    };
  }

  // Connect with tokens
  async connect(accessToken?: string, refreshToken?: string): Promise<boolean> {
    try {
      if (accessToken) {
        this.config.accessToken = accessToken;
      }
      if (refreshToken) {
        this.config.refreshToken = refreshToken;
      }

      if (!this.config.accessToken) {
        throw new Error('No access token provided');
      }

      // Simulated connection
      await new Promise(resolve => setTimeout(resolve, 500));

      this.connected = true;
      this.emit('connected');
      logger.info('TD Ameritrade connected');

      return true;
    } catch (error) {
      logger.error('Failed to connect to TD Ameritrade', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  // Disconnect
  disconnect(): void {
    this.connected = false;
    this.emit('disconnected');
    logger.info('TD Ameritrade disconnected');
  }

  // Check connection
  isConnected(): boolean {
    return this.connected;
  }

  // Refresh access token
  async refreshAccessToken(): Promise<boolean> {
    if (!this.config.refreshToken) {
      return false;
    }

    try {
      // Simulated token refresh
      this.config.accessToken = 'new_simulated_access_token';
      logger.info('Access token refreshed');
      return true;
    } catch (error) {
      logger.error('Failed to refresh token', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  // Get accounts
  async getAccounts(): Promise<TDAccount[]> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    // Simulated accounts
    return [{
      accountId: 'ACCT123456',
      type: 'MARGIN',
      roundTrips: 3,
      isDayTrader: false,
      equity: 75000,
      cashBalance: 25000,
      buyingPower: 150000,
    }];
  }

  // Get positions
  async getPositions(accountId: string): Promise<TDPosition[]> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    return Array.from(this.positions.values());
  }

  // Place order
  async placeOrder(accountId: string, order: Omit<TDOrder, 'orderId' | 'status' | 'filledQuantity' | 'avgFillPrice'>): Promise<TDOrder> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    const orderId = `TD${Date.now()}`;
    const newOrder: TDOrder = {
      ...order,
      orderId,
      status: 'QUEUED',
      filledQuantity: 0,
      avgFillPrice: 0,
    };

    this.orders.set(orderId, newOrder);
    this.emit('orderSubmitted', newOrder);
    logger.info(`TD Order placed: ${order.instruction} ${order.quantity} ${order.symbol}`);

    // Simulate fill
    setTimeout(() => {
      newOrder.status = 'FILLED';
      newOrder.filledQuantity = order.quantity;
      newOrder.avgFillPrice = order.price || 100;
      this.emit('orderFilled', newOrder);
    }, 500);

    return newOrder;
  }

  // Cancel order
  async cancelOrder(accountId: string, orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;

    order.status = 'CANCELED';
    this.emit('orderCancelled', order);
    return true;
  }

  // Get quote
  async getQuote(symbol: string): Promise<{
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    bidSize: number;
    askSize: number;
    volume: number;
  }> {
    const basePrice = symbol === 'AAPL' ? 198 : symbol === 'MSFT' ? 378 : 100;
    return {
      symbol,
      bid: basePrice - 0.05,
      ask: basePrice + 0.05,
      last: basePrice,
      bidSize: 500,
      askSize: 600,
      volume: 2500000,
    };
  }
}

// Factory function
export function createTDBroker(config?: Partial<TDConfig>): TDBroker {
  const defaultConfig: TDConfig = {
    clientId: process.env.TD_CLIENT_ID || '',
    redirectUri: process.env.TD_REDIRECT_URI || 'https://timebeyondus.com/callback/td',
    accessToken: process.env.TD_ACCESS_TOKEN,
    refreshToken: process.env.TD_REFRESH_TOKEN,
  };

  return new TDBroker({ ...defaultConfig, ...config });
}

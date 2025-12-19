/**
 * Broker Manager
 *
 * Central manager for all broker connections in TIME.
 * Handles:
 * - Multiple broker connections
 * - Order routing
 * - Position aggregation
 * - Trade execution across brokers
 * - Failover and load balancing
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';
import { TIMEGovernor } from '../core/time_governor';
import { TIMEComponent, SystemHealth } from '../types';
import {
  BrokerInterface,
  BrokerConfig,
  Account,
  Position,
  Order,
  OrderRequest,
  Quote,
  Bar,
  BrokerTrade,
  AssetClass,
} from './broker_interface';
import { AlpacaBroker } from './alpaca_broker';
import { OANDABroker } from './oanda_broker';
import { SnapTradeBroker, createSnapTradeBroker } from './snaptrade_broker';
// Note: Interactive Brokers is supported via SnapTrade aggregation (92+ brokers)

const logger = createComponentLogger('BrokerManager');

// Supported broker types
export type BrokerType = 'alpaca' | 'oanda' | 'snaptrade' | 'interactive_brokers' | 'mt4' | 'mt5';

// Broker connection status
interface BrokerConnection {
  id: string;
  type: BrokerType;
  name: string;
  broker: BrokerInterface;
  isConnected: boolean;
  isPrimary: boolean;
  assetClasses: AssetClass[];
  lastHeartbeat: Date;
  errorCount: number;
}

// Aggregated portfolio
interface AggregatedPortfolio {
  totalEquity: number;
  totalCash: number;
  totalBuyingPower: number;
  totalMarginUsed: number;
  positions: Map<string, Position>;
  byBroker: Map<string, Account>;
}

// Order routing preferences
interface RoutingPreference {
  assetClass: AssetClass;
  preferredBrokerId?: string;
  fallbackBrokerId?: string;
  splitOrders?: boolean;
}

export class BrokerManager extends EventEmitter implements TIMEComponent {
  private static instance: BrokerManager | null = null;
  private brokers: Map<string, BrokerConnection> = new Map();
  private routingPreferences: Map<AssetClass, RoutingPreference> = new Map();

  // GLOBAL PAPER/LIVE MODE TOGGLE
  private _isPaperMode: boolean = true; // Default to paper mode for safety

  public readonly name = 'BrokerManager';
  public readonly version = '1.0.0';
  public status: 'online' | 'offline' | 'degraded' | 'building' = 'offline';

  private constructor() {
    super();
    this.initializeDefaultRouting();
    // Load mode from environment or default to paper
    this._isPaperMode = process.env.TRADING_MODE !== 'live';
    logger.info(`Trading mode initialized: ${this._isPaperMode ? 'PAPER' : 'LIVE'}`);
  }

  // ============================================================
  // PAPER/LIVE MODE CONTROLS
  // ============================================================

  /**
   * Get current trading mode
   */
  public isPaperMode(): boolean {
    return this._isPaperMode;
  }

  /**
   * Get trading mode as string
   */
  public getTradingMode(): 'paper' | 'live' {
    return this._isPaperMode ? 'paper' : 'live';
  }

  /**
   * Set trading mode - IMPORTANT: Requires reconnection to all brokers
   */
  public async setTradingMode(mode: 'paper' | 'live'): Promise<{ success: boolean; message: string }> {
    const newPaperMode = mode === 'paper';

    if (this._isPaperMode === newPaperMode) {
      return { success: true, message: `Already in ${mode} mode` };
    }

    logger.warn(`SWITCHING TRADING MODE: ${this._isPaperMode ? 'PAPER' : 'LIVE'} → ${mode.toUpperCase()}`);

    // Disconnect all brokers before switching
    await this.disconnectAll();

    // Update mode
    this._isPaperMode = newPaperMode;

    // Emit mode change event
    this.emit('tradingModeChanged', { mode, isPaper: newPaperMode });

    logger.info(`Trading mode changed to: ${mode.toUpperCase()}`);

    return {
      success: true,
      message: `Switched to ${mode.toUpperCase()} mode. Reconnect brokers to apply.`
    };
  }

  /**
   * Get trading mode info for API
   */
  public getTradingModeInfo() {
    return {
      mode: this.getTradingMode(),
      isPaper: this._isPaperMode,
      description: this._isPaperMode
        ? 'Paper trading mode - simulated trades, no real money at risk'
        : 'LIVE trading mode - REAL money, REAL trades!',
      warning: this._isPaperMode
        ? null
        : '⚠️ LIVE MODE: All trades will use real money!',
      connectedBrokers: this.getConnectedBrokerIds().length,
    };
  }

  public static getInstance(): BrokerManager {
    if (!BrokerManager.instance) {
      BrokerManager.instance = new BrokerManager();
    }
    return BrokerManager.instance;
  }

  private initializeDefaultRouting(): void {
    // Default routing based on asset class
    this.routingPreferences.set('stock', { assetClass: 'stock' });
    this.routingPreferences.set('crypto', { assetClass: 'crypto' });
    this.routingPreferences.set('forex', { assetClass: 'forex' });
    this.routingPreferences.set('futures', { assetClass: 'futures' });
    this.routingPreferences.set('options', { assetClass: 'options' });
    this.routingPreferences.set('commodities', { assetClass: 'commodities' }); // XAU/USD, XAG/USD, Oil
    this.routingPreferences.set('cfds', { assetClass: 'cfds' }); // Indices, Bonds
    this.routingPreferences.set('bonds', { assetClass: 'bonds' }); // Treasury bonds
  }

  public async initialize(): Promise<void> {
    this.status = 'building';
    logger.info('Initializing Broker Manager');

    // Register with TIME Governor
    const governor = TIMEGovernor.getInstance();
    governor.registerComponent(this);

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    this.status = 'online';
    logger.info('Broker Manager initialized');
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down Broker Manager');
    this.status = 'offline';
    // Disconnect all brokers
    for (const broker of this.brokers.values()) {
      if (broker.isConnected) {
        await this.disconnectBroker(broker.id);
      }
    }
    logger.info('Broker Manager shut down');
  }

  public getHealth(): SystemHealth {
    const connectedCount = Array.from(this.brokers.values()).filter(b => b.isConnected).length;
    const totalCount = this.brokers.size;

    return {
      component: this.name,
      status: connectedCount > 0 ? 'online' : totalCount > 0 ? 'degraded' : 'offline',
      lastCheck: new Date(),
      metrics: {
        connectedBrokers: connectedCount,
        totalBrokers: totalCount,
      },
    };
  }

  public getStatus(): {
    connectedBrokers: number;
    totalBrokers: number;
    brokers: Array<{ id: string; name: string; type: BrokerType; connected: boolean }>;
  } {
    return {
      connectedBrokers: Array.from(this.brokers.values()).filter((b) => b.isConnected).length,
      totalBrokers: this.brokers.size,
      brokers: Array.from(this.brokers.values()).map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        connected: b.isConnected,
      })),
    };
  }

  /**
   * Add a broker connection
   */
  public async addBroker(
    id: string,
    type: BrokerType,
    config: BrokerConfig & { accountId?: string },
    options: { isPrimary?: boolean; name?: string } = {}
  ): Promise<void> {
    logger.info(`Adding broker: ${id} (${type})`);

    let broker: BrokerInterface;

    switch (type) {
      case 'alpaca':
        broker = new AlpacaBroker(config);
        break;
      case 'oanda':
        if (!config.accountId) {
          throw new Error('OANDA requires accountId in config');
        }
        broker = new OANDABroker(config as any);
        break;
      case 'interactive_brokers':
        // IB is accessed via SnapTrade aggregation (92+ brokers including IB)
        // Connect your IB account through SnapTrade for seamless integration
        logger.info('Interactive Brokers accessed via SnapTrade aggregation');
        broker = createSnapTradeBroker(config as any);
        break;
      case 'mt4':
      case 'mt5':
        // MT4/MT5 require the MT Bridge for connection
        // Check if MT Bridge is available and configured
        const mtConfig = config as any;
        if (!mtConfig.host || !mtConfig.port) {
          throw new Error(`${type.toUpperCase()} requires host and port configuration for MT Bridge connection`);
        }
        // Import and use MT Bridge instance
        try {
          const mtBridgeModule = await import('./mt_bridge');
          if (mtBridgeModule.mtBridge) {
            // Use the singleton mtBridge instance
            broker = mtBridgeModule.mtBridge as any;
            // Configure the connection for this specific MT account
            await (broker as any).connect?.({
              type: type as 'mt4' | 'mt5',
              host: mtConfig.host,
              port: mtConfig.port,
              login: mtConfig.login,
              password: mtConfig.password,
              server: mtConfig.server,
            });
          } else {
            throw new Error('mtBridge instance not found');
          }
        } catch (mtError) {
          throw new Error(`Failed to initialize ${type.toUpperCase()} bridge: ${(mtError as Error).message}. Ensure MT Bridge EA is running.`);
        }
        break;
      default:
        throw new Error(`Unknown broker type: ${type}`);
    }

    const connection: BrokerConnection = {
      id,
      type,
      name: options.name || `${type.toUpperCase()} - ${id}`,
      broker,
      isConnected: false,
      isPrimary: options.isPrimary ?? false,
      assetClasses: broker.capabilities.assetClasses,
      lastHeartbeat: new Date(),
      errorCount: 0,
    };

    // Set up event listeners
    broker.on('connected', () => {
      connection.isConnected = true;
      connection.errorCount = 0;
      logger.info(`Broker ${id} connected`);
      this.emit('brokerConnected', { brokerId: id });
    });

    broker.on('disconnected', (reason: string) => {
      connection.isConnected = false;
      logger.warn(`Broker ${id} disconnected: ${reason}`);
      this.emit('brokerDisconnected', { brokerId: id, reason });
    });

    broker.on('error', (error: Error) => {
      connection.errorCount++;
      logger.error(`Broker ${id} error:`, error as object);
      this.emit('brokerError', { brokerId: id, error });
    });

    broker.on('orderUpdate', (order: Order) => {
      this.emit('orderUpdate', { brokerId: id, order });
    });

    broker.on('positionUpdate', (position: Position) => {
      this.emit('positionUpdate', { brokerId: id, position });
    });

    broker.on('trade', (trade: BrokerTrade) => {
      this.emit('trade', { brokerId: id, trade });
    });

    broker.on('quote', (quote: Quote) => {
      this.emit('quote', { brokerId: id, quote });
    });

    broker.on('bar', (bar: Bar) => {
      this.emit('bar', { brokerId: id, bar });
    });

    this.brokers.set(id, connection);

    // Update routing preferences
    for (const assetClass of broker.capabilities.assetClasses) {
      const pref = this.routingPreferences.get(assetClass);
      if (pref && (!pref.preferredBrokerId || options.isPrimary)) {
        pref.preferredBrokerId = id;
        this.routingPreferences.set(assetClass, pref);
      }
    }

    logger.info(`Broker ${id} added successfully`);
  }

  /**
   * Connect to a specific broker
   */
  public async connectBroker(brokerId: string): Promise<void> {
    const connection = this.brokers.get(brokerId);
    if (!connection) {
      throw new Error(`Broker not found: ${brokerId}`);
    }

    await connection.broker.connect();
  }

  /**
   * Connect to all brokers
   */
  public async connectAll(): Promise<void> {
    logger.info('Connecting to all brokers...');

    const promises = Array.from(this.brokers.entries()).map(async ([id, connection]) => {
      try {
        await connection.broker.connect();
      } catch (error) {
        logger.error(`Failed to connect broker ${id}:`, error as object);
      }
    });

    await Promise.all(promises);

    const connected = Array.from(this.brokers.values()).filter((b) => b.isConnected).length;
    logger.info(`Connected to ${connected}/${this.brokers.size} brokers`);
  }

  /**
   * Disconnect from a specific broker
   */
  public async disconnectBroker(brokerId: string): Promise<void> {
    const connection = this.brokers.get(brokerId);
    if (!connection) {
      throw new Error(`Broker not found: ${brokerId}`);
    }

    await connection.broker.disconnect();
  }

  /**
   * Disconnect from all brokers
   */
  public async disconnectAll(): Promise<void> {
    logger.info('Disconnecting from all brokers...');

    const promises = Array.from(this.brokers.values()).map((connection) =>
      connection.broker.disconnect()
    );

    await Promise.all(promises);
    logger.info('Disconnected from all brokers');
  }

  /**
   * Remove a broker
   */
  public async removeBroker(brokerId: string): Promise<void> {
    const connection = this.brokers.get(brokerId);
    if (!connection) {
      return;
    }

    if (connection.isConnected) {
      await connection.broker.disconnect();
    }

    this.brokers.delete(brokerId);
    logger.info(`Broker ${brokerId} removed`);
  }

  /**
   * Get aggregated portfolio across all brokers
   */
  public async getAggregatedPortfolio(): Promise<AggregatedPortfolio> {
    const portfolio: AggregatedPortfolio = {
      totalEquity: 0,
      totalCash: 0,
      totalBuyingPower: 0,
      totalMarginUsed: 0,
      positions: new Map(),
      byBroker: new Map(),
    };

    for (const [id, connection] of this.brokers) {
      if (!connection.isConnected) continue;

      try {
        // Get account
        const account = await connection.broker.getAccount();
        portfolio.byBroker.set(id, account);
        portfolio.totalEquity += account.equity;
        portfolio.totalCash += account.cash;
        portfolio.totalBuyingPower += account.buyingPower;
        portfolio.totalMarginUsed += account.marginUsed;

        // Get positions
        const positions = await connection.broker.getPositions();
        for (const position of positions) {
          const key = `${id}:${position.symbol}`;
          portfolio.positions.set(key, position);
        }
      } catch (error) {
        logger.error(`Failed to get portfolio from ${id}:`, error as object);
      }
    }

    return portfolio;
  }

  /**
   * Get account from a specific broker
   */
  public async getAccount(brokerId: string): Promise<Account> {
    const connection = this.brokers.get(brokerId);
    if (!connection) {
      throw new Error(`Broker not found: ${brokerId}`);
    }
    if (!connection.isConnected) {
      throw new Error(`Broker ${brokerId} is not connected`);
    }

    return connection.broker.getAccount();
  }

  /**
   * Get all positions across all brokers
   */
  public async getAllPositions(): Promise<Array<{ brokerId: string; position: Position }>> {
    const positions: Array<{ brokerId: string; position: Position }> = [];

    for (const [id, connection] of this.brokers) {
      if (!connection.isConnected) continue;

      try {
        const brokerPositions = await connection.broker.getPositions();
        for (const position of brokerPositions) {
          positions.push({ brokerId: id, position });
        }
      } catch (error) {
        logger.error(`Failed to get positions from ${id}:`, error as object);
      }
    }

    return positions;
  }

  /**
   * Submit an order with automatic routing
   */
  public async submitOrder(
    request: OrderRequest,
    assetClass?: AssetClass,
    preferredBrokerId?: string
  ): Promise<{ brokerId: string; order: Order }> {
    // Determine which broker to use
    let brokerId: string | undefined = preferredBrokerId;

    if (!brokerId && assetClass) {
      const routing = this.routingPreferences.get(assetClass);
      brokerId = routing?.preferredBrokerId;
    }

    // If still no broker, find one that can handle the symbol
    if (!brokerId) {
      for (const [id, connection] of this.brokers) {
        if (connection.isConnected) {
          brokerId = id;
          break;
        }
      }
    }

    if (!brokerId) {
      throw new Error('No connected broker available');
    }

    const connection = this.brokers.get(brokerId);
    if (!connection || !connection.isConnected) {
      throw new Error(`Broker ${brokerId} is not available`);
    }

    const order = await connection.broker.submitOrder(request);
    return { brokerId, order };
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(brokerId: string, orderId: string): Promise<boolean> {
    const connection = this.brokers.get(brokerId);
    if (!connection || !connection.isConnected) {
      throw new Error(`Broker ${brokerId} is not available`);
    }

    return connection.broker.cancelOrder(orderId);
  }

  /**
   * Close a position
   */
  public async closePosition(
    brokerId: string,
    symbol: string,
    quantity?: number
  ): Promise<Order> {
    const connection = this.brokers.get(brokerId);
    if (!connection || !connection.isConnected) {
      throw new Error(`Broker ${brokerId} is not available`);
    }

    return connection.broker.closePosition(symbol, quantity);
  }

  /**
   * Close all positions across all brokers
   */
  public async closeAllPositions(): Promise<Array<{ brokerId: string; order: Order }>> {
    const results: Array<{ brokerId: string; order: Order }> = [];

    for (const [id, connection] of this.brokers) {
      if (!connection.isConnected) continue;

      try {
        const orders = await connection.broker.closeAllPositions();
        for (const order of orders) {
          results.push({ brokerId: id, order });
        }
      } catch (error) {
        logger.error(`Failed to close positions on ${id}:`, error as object);
      }
    }

    return results;
  }

  /**
   * Get quote from the best available broker
   */
  public async getQuote(symbol: string, brokerId?: string): Promise<Quote> {
    if (brokerId) {
      const connection = this.brokers.get(brokerId);
      if (connection?.isConnected) {
        return connection.broker.getQuote(symbol);
      }
    }

    // Try all connected brokers
    for (const [, connection] of this.brokers) {
      if (connection.isConnected) {
        try {
          return await connection.broker.getQuote(symbol);
        } catch {
          continue;
        }
      }
    }

    throw new Error(`No broker available to get quote for ${symbol}`);
  }

  /**
   * Get historical bars
   */
  public async getBars(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date,
    brokerId?: string
  ): Promise<Bar[]> {
    if (brokerId) {
      const connection = this.brokers.get(brokerId);
      if (connection?.isConnected) {
        return connection.broker.getBars(symbol, timeframe, start, end);
      }
    }

    // Try all connected brokers
    for (const [, connection] of this.brokers) {
      if (connection.isConnected) {
        try {
          return await connection.broker.getBars(symbol, timeframe, start, end);
        } catch {
          continue;
        }
      }
    }

    throw new Error(`No broker available to get bars for ${symbol}`);
  }

  /**
   * Subscribe to quotes
   */
  public async subscribeQuotes(symbols: string[], brokerId?: string): Promise<void> {
    if (brokerId) {
      const connection = this.brokers.get(brokerId);
      if (connection?.isConnected) {
        await connection.broker.subscribeQuotes(symbols);
        return;
      }
    }

    // Subscribe on all connected brokers
    for (const [, connection] of this.brokers) {
      if (connection.isConnected && connection.broker.capabilities.supportsStreaming) {
        try {
          await connection.broker.subscribeQuotes(symbols);
        } catch (error) {
          logger.error(`Failed to subscribe quotes on ${connection.id}:`, error as object);
        }
      }
    }
  }

  /**
   * Get trade history from all brokers
   */
  public async getTradeHistory(
    start?: Date,
    end?: Date
  ): Promise<Array<{ brokerId: string; trade: BrokerTrade }>> {
    const trades: Array<{ brokerId: string; trade: BrokerTrade }> = [];

    for (const [id, connection] of this.brokers) {
      if (!connection.isConnected) continue;

      try {
        const brokerTrades = await connection.broker.getTrades(undefined, start, end);
        for (const trade of brokerTrades) {
          trades.push({ brokerId: id, trade });
        }
      } catch (error) {
        logger.error(`Failed to get trades from ${id}:`, error as object);
      }
    }

    // Sort by timestamp
    trades.sort((a, b) => b.trade.timestamp.getTime() - a.trade.timestamp.getTime());

    return trades;
  }

  /**
   * Set routing preference for an asset class
   */
  public setRoutingPreference(preference: RoutingPreference): void {
    this.routingPreferences.set(preference.assetClass, preference);
    logger.info(`Routing preference set for ${preference.assetClass}`);
  }

  /**
   * Get a specific broker instance
   */
  public getBroker(brokerId: string): BrokerInterface | null {
    return this.brokers.get(brokerId)?.broker || null;
  }

  /**
   * Get all connected broker IDs
   */
  public getConnectedBrokerIds(): string[] {
    return Array.from(this.brokers.entries())
      .filter(([, connection]) => connection.isConnected)
      .map(([id]) => id);
  }

  // Private methods

  private startHeartbeatMonitoring(): void {
    setInterval(async () => {
      for (const [id, connection] of this.brokers) {
        if (connection.isConnected) {
          try {
            await connection.broker.getAccount();
            connection.lastHeartbeat = new Date();
            connection.errorCount = 0;
          } catch (error) {
            connection.errorCount++;
            logger.warn(`Heartbeat failed for ${id}, error count: ${connection.errorCount}`);

            if (connection.errorCount >= 3) {
              connection.isConnected = false;
              logger.error(`Broker ${id} marked as disconnected after 3 heartbeat failures`);
              this.emit('brokerDisconnected', { brokerId: id, reason: 'Heartbeat failures' });
            }
          }
        }
      }
    }, 60000); // Every minute
  }
}

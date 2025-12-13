/**
 * MT4/MT5 Broker Bridge
 *
 * Enables connection to MetaTrader 4 and MetaTrader 5 platforms:
 * - Real-time price streaming via socket connection
 * - Trade execution (market orders, pending orders)
 * - Account data sync (balance, equity, margin)
 * - Position management
 * - Trade history retrieval
 *
 * Architecture:
 * This bridge communicates with an MT Expert Advisor (EA) that must be
 * installed on the user's MT4/MT5 platform. The EA opens a socket
 * connection to TIME and relays commands/data.
 *
 * Protocol: JSON over TCP sockets
 */

import { EventEmitter } from 'events';
import * as net from 'net';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type MTVersion = 'mt4' | 'mt5';

export interface MTConnection {
  id: string;
  userId: string;
  version: MTVersion;
  broker: string;
  accountNumber: string;
  server: string;
  socket: net.Socket | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'authenticated';
  lastPing: Date | null;
  accountData: MTAccountData | null;
  positions: MTPosition[];
  pendingOrders: MTPendingOrder[];
  connectedAt: Date | null;
}

export interface MTAccountData {
  accountNumber: string;
  broker: string;
  name: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: number;
  profit: number;
  server: string;
  tradeAllowed: boolean;
  hedgingAllowed: boolean;
  lastUpdated: Date;
}

export interface MTPosition {
  ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  swap: number;
  profit: number;
  comment: string;
  magicNumber: number;
  openTime: Date;
}

export interface MTPendingOrder {
  ticket: number;
  symbol: string;
  type: 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop' | 'buy_stop_limit' | 'sell_stop_limit';
  volume: number;
  price: number;
  stopLoss: number | null;
  takeProfit: number | null;
  expiration: Date | null;
  comment: string;
  magicNumber: number;
}

export interface MTTick {
  symbol: string;
  bid: number;
  ask: number;
  time: Date;
  volume: number;
}

export interface MTTradeRequest {
  action: 'buy' | 'sell' | 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop' | 'close' | 'modify';
  symbol: string;
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  deviation?: number;
  ticket?: number;
  comment?: string;
  magicNumber?: number;
}

export interface MTTradeResult {
  success: boolean;
  ticket?: number;
  error?: string;
  errorCode?: number;
  executionPrice?: number;
  executionTime?: Date;
}

export interface MTHistoryTrade {
  ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  closePrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  swap: number;
  commission: number;
  profit: number;
  comment: string;
  magicNumber: number;
  openTime: Date;
  closeTime: Date;
}

// ============================================================
// MT BRIDGE CLASS
// ============================================================

class MTBridge extends EventEmitter {
  private connections: Map<string, MTConnection> = new Map();
  private server: net.Server | null = null;
  private port: number = 15555; // Default port for EA connections
  private isRunning: boolean = false;
  private tickSubscriptions: Map<string, Set<string>> = new Map(); // symbol -> connectionIds

  constructor() {
    super();
  }

  // ============================================================
  // SERVER MANAGEMENT
  // ============================================================

  async start(port?: number): Promise<void> {
    if (this.isRunning) return;

    this.port = port || this.port;

    this.server = net.createServer((socket) => {
      this.handleNewConnection(socket);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, () => {
        this.isRunning = true;
        console.log(`[MTBridge] Server listening on port ${this.port}`);
        this.emit('server:started', { port: this.port });
        resolve();
      });

      this.server!.on('error', (error) => {
        console.error('[MTBridge] Server error:', error);
        this.emit('server:error', error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Close all connections
    for (const [id, conn] of this.connections) {
      if (conn.socket) {
        conn.socket.destroy();
      }
    }
    this.connections.clear();

    // Close server
    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.isRunning = false;
    console.log('[MTBridge] Server stopped');
    this.emit('server:stopped');
  }

  // ============================================================
  // CONNECTION HANDLING
  // ============================================================

  private handleNewConnection(socket: net.Socket): void {
    const connectionId = `mt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log(`[MTBridge] New connection: ${connectionId}`);

    const connection: MTConnection = {
      id: connectionId,
      userId: '', // Set during authentication
      version: 'mt5',
      broker: '',
      accountNumber: '',
      server: '',
      socket,
      status: 'connecting',
      lastPing: null,
      accountData: null,
      positions: [],
      pendingOrders: [],
      connectedAt: new Date(),
    };

    this.connections.set(connectionId, connection);

    // Set up socket event handlers
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();

      // Parse complete JSON messages (newline-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete message in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleMessage(connectionId, message);
          } catch (e) {
            console.error('[MTBridge] Invalid JSON:', line);
          }
        }
      }
    });

    socket.on('close', () => {
      console.log(`[MTBridge] Connection closed: ${connectionId}`);
      this.connections.delete(connectionId);
      this.emit('connection:closed', { connectionId });
    });

    socket.on('error', (error) => {
      console.error(`[MTBridge] Socket error (${connectionId}):`, error);
      this.emit('connection:error', { connectionId, error });
    });

    // Request authentication
    this.sendMessage(connectionId, {
      type: 'auth_request',
      timestamp: Date.now(),
    });
  }

  private handleMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (message.type) {
      case 'auth_response':
        this.handleAuthResponse(connectionId, message);
        break;

      case 'account_info':
        this.handleAccountInfo(connectionId, message);
        break;

      case 'positions':
        this.handlePositions(connectionId, message);
        break;

      case 'pending_orders':
        this.handlePendingOrders(connectionId, message);
        break;

      case 'tick':
        this.handleTick(connectionId, message);
        break;

      case 'trade_result':
        this.handleTradeResult(connectionId, message);
        break;

      case 'history':
        this.handleHistory(connectionId, message);
        break;

      case 'ping':
        connection.lastPing = new Date();
        this.sendMessage(connectionId, { type: 'pong', timestamp: Date.now() });
        break;

      case 'hello':
        console.log(`[MTBridge] Hello received from ${message.version || 'unknown'} client`);
        connection.version = message.version === 'mt4' ? 'mt4' : 'mt5';
        // Send hello response immediately
        this.sendMessage(connectionId, {
          type: 'hello_ack',
          status: 'ok',
          server: 'TIME',
          timestamp: Date.now()
        });
        // Then send auth request
        this.sendMessage(connectionId, {
          type: 'auth_request',
          timestamp: Date.now(),
        });
        break;

      default:
        console.log(`[MTBridge] Unknown message type: ${message.type}`);
    }
  }

  // ============================================================
  // MESSAGE HANDLERS
  // ============================================================

  private handleAuthResponse(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (message.success) {
      connection.status = 'authenticated';
      connection.version = message.version || 'mt5';
      connection.broker = message.broker || '';
      connection.accountNumber = message.account || '';
      connection.server = message.server || '';

      console.log(`[MTBridge] Authenticated: ${connection.broker} - ${connection.accountNumber}`);

      this.emit('connection:authenticated', {
        connectionId,
        broker: connection.broker,
        account: connection.accountNumber,
        version: connection.version,
      });

      // Request initial data
      this.sendMessage(connectionId, { type: 'get_account_info' });
      this.sendMessage(connectionId, { type: 'get_positions' });
      this.sendMessage(connectionId, { type: 'get_pending_orders' });
    } else {
      console.error(`[MTBridge] Authentication failed: ${message.error}`);
      this.emit('connection:auth_failed', { connectionId, error: message.error });
      connection.socket?.destroy();
    }
  }

  private handleAccountInfo(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.accountData = {
      accountNumber: message.account,
      broker: message.broker,
      name: message.name,
      currency: message.currency,
      balance: message.balance,
      equity: message.equity,
      margin: message.margin,
      freeMargin: message.freeMargin,
      marginLevel: message.marginLevel,
      leverage: message.leverage,
      profit: message.profit,
      server: message.server,
      tradeAllowed: message.tradeAllowed,
      hedgingAllowed: message.hedgingAllowed,
      lastUpdated: new Date(),
    };

    this.emit('account:updated', {
      connectionId,
      accountData: connection.accountData,
    });
  }

  private handlePositions(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.positions = (message.positions || []).map((p: any) => ({
      ticket: p.ticket,
      symbol: p.symbol,
      type: p.type === 0 ? 'buy' : 'sell',
      volume: p.volume,
      openPrice: p.openPrice,
      currentPrice: p.currentPrice,
      stopLoss: p.stopLoss || null,
      takeProfit: p.takeProfit || null,
      swap: p.swap,
      profit: p.profit,
      comment: p.comment || '',
      magicNumber: p.magicNumber || 0,
      openTime: new Date(p.openTime * 1000),
    }));

    this.emit('positions:updated', {
      connectionId,
      positions: connection.positions,
    });
  }

  private handlePendingOrders(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const orderTypes = ['buy_limit', 'sell_limit', 'buy_stop', 'sell_stop', 'buy_stop_limit', 'sell_stop_limit'];

    connection.pendingOrders = (message.orders || []).map((o: any) => ({
      ticket: o.ticket,
      symbol: o.symbol,
      type: orderTypes[o.type - 2] || 'buy_limit',
      volume: o.volume,
      price: o.price,
      stopLoss: o.stopLoss || null,
      takeProfit: o.takeProfit || null,
      expiration: o.expiration ? new Date(o.expiration * 1000) : null,
      comment: o.comment || '',
      magicNumber: o.magicNumber || 0,
    }));

    this.emit('orders:updated', {
      connectionId,
      orders: connection.pendingOrders,
    });
  }

  private handleTick(connectionId: string, message: any): void {
    const tick: MTTick = {
      symbol: message.symbol,
      bid: message.bid,
      ask: message.ask,
      time: new Date(message.time * 1000),
      volume: message.volume || 0,
    };

    this.emit('tick', { connectionId, tick });
  }

  private handleTradeResult(connectionId: string, message: any): void {
    const result: MTTradeResult = {
      success: message.success,
      ticket: message.ticket,
      error: message.error,
      errorCode: message.errorCode,
      executionPrice: message.price,
      executionTime: message.time ? new Date(message.time * 1000) : undefined,
    };

    this.emit('trade:result', {
      connectionId,
      requestId: message.requestId,
      result,
    });
  }

  private handleHistory(connectionId: string, message: any): void {
    const trades: MTHistoryTrade[] = (message.trades || []).map((t: any) => ({
      ticket: t.ticket,
      symbol: t.symbol,
      type: t.type === 0 ? 'buy' : 'sell',
      volume: t.volume,
      openPrice: t.openPrice,
      closePrice: t.closePrice,
      stopLoss: t.stopLoss || null,
      takeProfit: t.takeProfit || null,
      swap: t.swap,
      commission: t.commission,
      profit: t.profit,
      comment: t.comment || '',
      magicNumber: t.magicNumber || 0,
      openTime: new Date(t.openTime * 1000),
      closeTime: new Date(t.closeTime * 1000),
    }));

    this.emit('history:received', {
      connectionId,
      trades,
    });
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  sendMessage(connectionId: string, message: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection?.socket) return false;

    try {
      connection.socket.write(JSON.stringify(message) + '\n');
      return true;
    } catch (e) {
      console.error('[MTBridge] Failed to send message:', e);
      return false;
    }
  }

  async executeTrade(connectionId: string, request: MTTradeRequest): Promise<MTTradeResult> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    if (connection.status !== 'authenticated') {
      return { success: false, error: 'Not authenticated' };
    }

    const requestId = `trade_${Date.now()}`;

    return new Promise((resolve) => {
      // Set up result listener
      const handler = (data: any) => {
        if (data.requestId === requestId) {
          this.removeListener('trade:result', handler);
          resolve(data.result);
        }
      };

      this.on('trade:result', handler);

      // Send trade request
      this.sendMessage(connectionId, {
        type: 'trade',
        requestId,
        ...request,
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        this.removeListener('trade:result', handler);
        resolve({ success: false, error: 'Trade request timeout' });
      }, 30000);
    });
  }

  async getHistory(connectionId: string, from: Date, to: Date): Promise<MTHistoryTrade[]> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return [];
    }

    const requestId = `history_${Date.now()}`;

    return new Promise((resolve) => {
      const handler = (data: any) => {
        if (data.connectionId === connectionId) {
          this.removeListener('history:received', handler);
          resolve(data.trades);
        }
      };

      this.on('history:received', handler);

      this.sendMessage(connectionId, {
        type: 'get_history',
        requestId,
        from: Math.floor(from.getTime() / 1000),
        to: Math.floor(to.getTime() / 1000),
      });

      setTimeout(() => {
        this.removeListener('history:received', handler);
        resolve([]);
      }, 30000);
    });
  }

  subscribeToTicks(connectionId: string, symbols: string[]): void {
    this.sendMessage(connectionId, {
      type: 'subscribe_ticks',
      symbols,
    });

    for (const symbol of symbols) {
      if (!this.tickSubscriptions.has(symbol)) {
        this.tickSubscriptions.set(symbol, new Set());
      }
      this.tickSubscriptions.get(symbol)!.add(connectionId);
    }
  }

  unsubscribeFromTicks(connectionId: string, symbols: string[]): void {
    this.sendMessage(connectionId, {
      type: 'unsubscribe_ticks',
      symbols,
    });

    for (const symbol of symbols) {
      this.tickSubscriptions.get(symbol)?.delete(connectionId);
    }
  }

  closePosition(connectionId: string, ticket: number, volume?: number): Promise<MTTradeResult> {
    return this.executeTrade(connectionId, {
      action: 'close',
      symbol: '',
      volume: volume || 0,
      ticket,
    });
  }

  modifyPosition(
    connectionId: string,
    ticket: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<MTTradeResult> {
    return this.executeTrade(connectionId, {
      action: 'modify',
      symbol: '',
      volume: 0,
      ticket,
      stopLoss,
      takeProfit,
    });
  }

  // ============================================================
  // STATUS METHODS
  // ============================================================

  getConnection(connectionId: string): MTConnection | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnections(): MTConnection[] {
    return Array.from(this.connections.values());
  }

  getAuthenticatedConnections(): MTConnection[] {
    return this.getAllConnections().filter(c => c.status === 'authenticated');
  }

  getConnectionByAccount(accountNumber: string): MTConnection | undefined {
    return this.getAllConnections().find(c => c.accountNumber === accountNumber);
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  getState(): {
    running: boolean;
    port: number;
    totalConnections: number;
    authenticatedConnections: number;
  } {
    return {
      running: this.isRunning,
      port: this.port,
      totalConnections: this.connections.size,
      authenticatedConnections: this.getAuthenticatedConnections().length,
    };
  }
}

// Export singleton
export const mtBridge = new MTBridge();
export default mtBridge;

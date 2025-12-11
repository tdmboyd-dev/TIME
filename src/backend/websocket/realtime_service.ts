/**
 * TIME WebSocket Real-Time Service
 *
 * Provides real-time updates to all connected clients via Socket.IO:
 * - Live trade updates and executions
 * - Market regime changes
 * - Bot performance updates
 * - System health status
 * - Learning events and insights
 * - Evolution proposals and approvals
 * - Price data streaming
 * - Alert notifications
 *
 * TIME breathes through its connections - every pulse, every trade,
 * every insight flows in real-time to those watching.
 */

import { EventEmitter } from 'events';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { TIMEComponent } from '../core/time_governor';

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export interface RealtimeConfig {
  pingInterval: number;
  pingTimeout: number;
  maxConnections: number;
  enableCompression: boolean;
  corsOrigins: string[];
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
}

export interface ClientInfo {
  socketId: string;
  userId?: string;
  role: 'guest' | 'user' | 'admin' | 'owner';
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<string>;
  ipAddress: string;
  userAgent: string;
}

export interface RealtimeEvent {
  channel: string;
  event: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ChannelSubscription {
  channel: string;
  filters?: Record<string, any>;
}

// Channel types for organizing real-time data
export type RealtimeChannel =
  | 'trades'           // Live trade executions
  | 'signals'          // Bot signals
  | 'regime'           // Market regime changes
  | 'bots'             // Bot status updates
  | 'strategies'       // Strategy performance
  | 'insights'         // Learning insights
  | 'system'           // System health
  | 'evolution'        // Evolution proposals
  | 'prices'           // Price streaming
  | 'alerts'           // User alerts
  | 'portfolio';       // Portfolio updates

export interface TradeUpdate {
  tradeId: string;
  symbol: string;
  direction: 'long' | 'short';
  action: 'opened' | 'closed' | 'modified';
  price: number;
  quantity: number;
  pnl?: number;
  botId?: string;
  strategyId?: string;
  timestamp: Date;
}

export interface RegimeUpdate {
  symbol: string;
  previousRegime: string;
  newRegime: string;
  confidence: number;
  timestamp: Date;
}

export interface BotUpdate {
  botId: string;
  name: string;
  status: string;
  performance?: {
    winRate: number;
    pnlToday: number;
    activeTrades: number;
  };
  lastSignal?: {
    symbol: string;
    direction: string;
    timestamp: Date;
  };
}

export interface InsightUpdate {
  insightId: string;
  category: string;
  insight: string;
  confidence: number;
  actionable: boolean;
  source: string;
  timestamp: Date;
}

export interface SystemHealthUpdate {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  latency?: number;
  errorRate?: number;
  message?: string;
  timestamp: Date;
}

export interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

export interface EvolutionUpdate {
  type: 'proposal' | 'approved' | 'rejected' | 'auto_evolved' | 'mode_change';
  proposalId?: string;
  strategyId?: string;
  description: string;
  currentMode: 'controlled' | 'autonomous';
  timestamp: Date;
}

export interface AlertUpdate {
  alertId: string;
  type: 'trade' | 'risk' | 'system' | 'insight' | 'evolution';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  timestamp: Date;
}

export interface PortfolioUpdate {
  totalValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  openPositions: number;
  buying_power: number;
  marginUsed: number;
  timestamp: Date;
}

// ============================================================
// REALTIME SERVICE CLASS
// ============================================================

export class RealtimeService extends EventEmitter implements TIMEComponent {
  public readonly name = 'RealtimeService';
  public readonly version = '1.0.0';

  private io: SocketIOServer | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private channelSubscribers: Map<string, Set<string>> = new Map();
  private eventQueue: RealtimeEvent[] = [];
  private rateLimiter: Map<string, number[]> = new Map();

  private config: RealtimeConfig = {
    pingInterval: 25000,
    pingTimeout: 60000,
    maxConnections: 10000,
    enableCompression: true,
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    rateLimitWindow: 60000, // 1 minute
    rateLimitMaxRequests: 100,
  };

  private stats = {
    totalConnections: 0,
    currentConnections: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    bytesTransferred: 0,
  };

  private isRunning = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // ============================================================
  // INITIALIZATION
  // ============================================================

  constructor(config?: Partial<RealtimeConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize channel subscriber maps
    const channels: RealtimeChannel[] = [
      'trades', 'signals', 'regime', 'bots', 'strategies',
      'insights', 'system', 'evolution', 'prices', 'alerts', 'portfolio'
    ];

    channels.forEach(channel => {
      this.channelSubscribers.set(channel, new Set());
    });
  }

  /**
   * Initialize the WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      pingInterval: this.config.pingInterval,
      pingTimeout: this.config.pingTimeout,
      cors: {
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      perMessageDeflate: this.config.enableCompression,
    });

    this.setupConnectionHandlers();
    this.startHeartbeat();
    this.isRunning = true;

    this.emit('initialized');
    console.log('[RealtimeService] WebSocket server initialized');
  }

  /**
   * Set up Socket.IO connection handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    // Check max connections
    if (this.clients.size >= this.config.maxConnections) {
      socket.emit('error', { message: 'Maximum connections reached' });
      socket.disconnect();
      return;
    }

    // Create client info
    const clientInfo: ClientInfo = {
      socketId: socket.id,
      role: 'guest',
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscriptions: new Set(),
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || 'unknown',
    };

    this.clients.set(socket.id, clientInfo);
    this.stats.totalConnections++;
    this.stats.currentConnections = this.clients.size;

    console.log(`[RealtimeService] Client connected: ${socket.id}`);

    // Set up socket event handlers
    this.setupSocketHandlers(socket);

    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to TIME Real-Time Service',
      serverTime: new Date(),
      availableChannels: Array.from(this.channelSubscribers.keys()),
    });

    this.emit('client:connected', clientInfo);
  }

  /**
   * Set up handlers for individual socket events
   */
  private setupSocketHandlers(socket: Socket): void {
    // Authentication
    socket.on('authenticate', (data: { token: string }) => {
      this.handleAuthentication(socket, data);
    });

    // Channel subscription
    socket.on('subscribe', (data: ChannelSubscription | ChannelSubscription[]) => {
      this.handleSubscribe(socket, data);
    });

    // Channel unsubscription
    socket.on('unsubscribe', (channels: string | string[]) => {
      this.handleUnsubscribe(socket, channels);
    });

    // Price subscription (specific symbols)
    socket.on('subscribe:prices', (symbols: string[]) => {
      this.handlePriceSubscription(socket, symbols);
    });

    // Client ping
    socket.on('ping', () => {
      socket.emit('pong', { serverTime: new Date() });
    });

    // Disconnection
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    // Error handling
    socket.on('error', (error: Error) => {
      console.error(`[RealtimeService] Socket error (${socket.id}):`, error);
      this.emit('client:error', { socketId: socket.id, error });
    });
  }

  /**
   * Handle client authentication
   */
  private handleAuthentication(socket: Socket, data: { token: string }): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // In production, validate JWT token and extract user info
    // For now, simulate authentication
    const decoded = this.validateToken(data.token);

    if (decoded) {
      client.userId = decoded.userId;
      client.role = decoded.role;
      client.lastActivity = new Date();

      socket.emit('authenticated', {
        success: true,
        userId: decoded.userId,
        role: decoded.role,
      });

      // Auto-subscribe to relevant channels based on role
      if (decoded.role === 'owner' || decoded.role === 'admin') {
        this.subscribeToChannel(socket.id, 'system');
        this.subscribeToChannel(socket.id, 'evolution');
      }

      this.emit('client:authenticated', client);
    } else {
      socket.emit('authenticated', {
        success: false,
        message: 'Invalid token',
      });
    }
  }

  /**
   * Validate authentication token (placeholder)
   */
  private validateToken(token: string): { userId: string; role: 'user' | 'admin' | 'owner' } | null {
    // In production, use JWT verification
    // For development, accept any non-empty token
    if (!token) return null;

    return {
      userId: `user_${token.substring(0, 8)}`,
      role: token.startsWith('admin') ? 'admin' : token.startsWith('owner') ? 'owner' : 'user',
    };
  }

  /**
   * Handle channel subscription
   */
  private handleSubscribe(socket: Socket, data: ChannelSubscription | ChannelSubscription[]): void {
    const subscriptions = Array.isArray(data) ? data : [data];
    const client = this.clients.get(socket.id);

    if (!client) return;

    // Check rate limit
    if (!this.checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const results: { channel: string; success: boolean }[] = [];

    for (const sub of subscriptions) {
      if (this.channelSubscribers.has(sub.channel)) {
        this.subscribeToChannel(socket.id, sub.channel);
        results.push({ channel: sub.channel, success: true });
      } else {
        results.push({ channel: sub.channel, success: false });
      }
    }

    client.lastActivity = new Date();

    socket.emit('subscribed', { channels: results });
    this.emit('client:subscribed', { socketId: socket.id, subscriptions: results });
  }

  /**
   * Subscribe socket to a channel
   */
  private subscribeToChannel(socketId: string, channel: string): void {
    const subscribers = this.channelSubscribers.get(channel);
    const client = this.clients.get(socketId);

    if (subscribers && client) {
      subscribers.add(socketId);
      client.subscriptions.add(channel);
    }
  }

  /**
   * Handle channel unsubscription
   */
  private handleUnsubscribe(socket: Socket, channels: string | string[]): void {
    const channelList = Array.isArray(channels) ? channels : [channels];
    const client = this.clients.get(socket.id);

    if (!client) return;

    for (const channel of channelList) {
      this.unsubscribeFromChannel(socket.id, channel);
    }

    socket.emit('unsubscribed', { channels: channelList });
  }

  /**
   * Unsubscribe socket from a channel
   */
  private unsubscribeFromChannel(socketId: string, channel: string): void {
    const subscribers = this.channelSubscribers.get(channel);
    const client = this.clients.get(socketId);

    if (subscribers) {
      subscribers.delete(socketId);
    }
    if (client) {
      client.subscriptions.delete(channel);
    }
  }

  /**
   * Handle price subscription for specific symbols
   */
  private handlePriceSubscription(socket: Socket, symbols: string[]): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // Subscribe to prices channel if not already
    this.subscribeToChannel(socket.id, 'prices');

    // Store symbol preferences (could be used for filtering)
    socket.join(`prices:${symbols.join(',')}`);

    socket.emit('prices:subscribed', { symbols });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    const client = this.clients.get(socket.id);

    if (client) {
      // Unsubscribe from all channels
      for (const channel of client.subscriptions) {
        this.unsubscribeFromChannel(socket.id, channel);
      }

      this.clients.delete(socket.id);
      this.stats.currentConnections = this.clients.size;

      console.log(`[RealtimeService] Client disconnected: ${socket.id} (${reason})`);
      this.emit('client:disconnected', { socketId: socket.id, reason, client });
    }
  }

  /**
   * Check rate limit for a socket
   */
  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;

    let requests = this.rateLimiter.get(socketId) || [];
    requests = requests.filter(time => time > windowStart);

    if (requests.length >= this.config.rateLimitMaxRequests) {
      return false;
    }

    requests.push(now);
    this.rateLimiter.set(socketId, requests);
    return true;
  }

  // ============================================================
  // BROADCASTING METHODS
  // ============================================================

  /**
   * Broadcast to all subscribers of a channel
   */
  broadcast(channel: RealtimeChannel, event: string, data: any): void {
    if (!this.io) return;

    const subscribers = this.channelSubscribers.get(channel);
    if (!subscribers || subscribers.size === 0) return;

    const payload = {
      channel,
      event,
      data,
      timestamp: new Date(),
    };

    let delivered = 0;

    for (const socketId of subscribers) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(`${channel}:${event}`, payload);
        delivered++;
      }
    }

    this.stats.messagesDelivered += delivered;
    this.emit('broadcast', { channel, event, delivered });
  }

  /**
   * Send to a specific client
   */
  sendToClient(socketId: string, event: string, data: any): boolean {
    if (!this.io) return false;

    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return false;

    socket.emit(event, {
      data,
      timestamp: new Date(),
    });

    this.stats.messagesDelivered++;
    return true;
  }

  /**
   * Send to a specific user (all their connections)
   */
  sendToUser(userId: string, event: string, data: any): number {
    let sent = 0;

    for (const [socketId, client] of this.clients) {
      if (client.userId === userId) {
        if (this.sendToClient(socketId, event, data)) {
          sent++;
        }
      }
    }

    return sent;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(event: string, data: any): void {
    if (!this.io) return;

    this.io.emit(event, {
      data,
      timestamp: new Date(),
    });

    this.stats.messagesDelivered += this.clients.size;
  }

  // ============================================================
  // TYPED BROADCAST METHODS
  // ============================================================

  /**
   * Broadcast trade update
   */
  broadcastTrade(update: TradeUpdate): void {
    this.broadcast('trades', 'update', update);

    // Also send alert for significant trades
    if (update.pnl && Math.abs(update.pnl) > 1000) {
      this.broadcastAlert({
        alertId: `trade_${update.tradeId}`,
        type: 'trade',
        priority: update.pnl > 0 ? 'medium' : 'high',
        title: update.pnl > 0 ? 'Profitable Trade Closed' : 'Loss Recorded',
        message: `${update.symbol} ${update.direction} closed with ${update.pnl > 0 ? '+' : ''}$${update.pnl.toFixed(2)}`,
        actionRequired: false,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Broadcast regime change
   */
  broadcastRegimeChange(update: RegimeUpdate): void {
    this.broadcast('regime', 'change', update);

    // Send insight about regime change
    this.broadcastInsight({
      insightId: `regime_${Date.now()}`,
      category: 'pattern',
      insight: `${update.symbol} transitioned from ${update.previousRegime} to ${update.newRegime}`,
      confidence: update.confidence,
      actionable: true,
      source: 'RegimeDetector',
      timestamp: update.timestamp,
    });
  }

  /**
   * Broadcast bot update
   */
  broadcastBotUpdate(update: BotUpdate): void {
    this.broadcast('bots', 'update', update);
  }

  /**
   * Broadcast insight
   */
  broadcastInsight(update: InsightUpdate): void {
    this.broadcast('insights', 'new', update);
  }

  /**
   * Broadcast system health update
   */
  broadcastSystemHealth(update: SystemHealthUpdate): void {
    this.broadcast('system', 'health', update);

    // Alert on degraded/unhealthy status
    if (update.status !== 'healthy') {
      this.broadcastAlert({
        alertId: `health_${update.component}_${Date.now()}`,
        type: 'system',
        priority: update.status === 'unhealthy' ? 'critical' : 'high',
        title: `System Health Alert: ${update.component}`,
        message: update.message || `Component ${update.component} is ${update.status}`,
        actionRequired: update.status === 'unhealthy',
        timestamp: update.timestamp,
      });
    }
  }

  /**
   * Broadcast price update
   */
  broadcastPrice(update: PriceUpdate): void {
    this.broadcast('prices', 'tick', update);
  }

  /**
   * Broadcast multiple price updates (batch)
   */
  broadcastPrices(updates: PriceUpdate[]): void {
    this.broadcast('prices', 'batch', updates);
  }

  /**
   * Broadcast evolution update
   */
  broadcastEvolution(update: EvolutionUpdate): void {
    this.broadcast('evolution', update.type, update);

    // Alert for evolution events
    const alertPriority = update.type === 'mode_change' ? 'critical' : 'high';
    this.broadcastAlert({
      alertId: `evolution_${Date.now()}`,
      type: 'evolution',
      priority: alertPriority,
      title: `Evolution: ${update.type.replace('_', ' ')}`,
      message: update.description,
      actionRequired: update.type === 'proposal' && update.currentMode === 'controlled',
      timestamp: update.timestamp,
    });
  }

  /**
   * Broadcast alert
   */
  broadcastAlert(update: AlertUpdate): void {
    this.broadcast('alerts', update.priority, update);
  }

  /**
   * Broadcast portfolio update
   */
  broadcastPortfolio(update: PortfolioUpdate): void {
    this.broadcast('portfolio', 'update', update);
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('system', 'heartbeat', {
        serverTime: new Date(),
        connectedClients: this.clients.size,
        uptime: process.uptime(),
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Get current statistics
   */
  getStats(): typeof this.stats & { channels: Record<string, number> } {
    const channels: Record<string, number> = {};

    for (const [channel, subscribers] of this.channelSubscribers) {
      channels[channel] = subscribers.size;
    }

    return {
      ...this.stats,
      channels,
    };
  }

  /**
   * Get connected clients info
   */
  getConnectedClients(): ClientInfo[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get clients by role
   */
  getClientsByRole(role: ClientInfo['role']): ClientInfo[] {
    return Array.from(this.clients.values()).filter(c => c.role === role);
  }

  /**
   * Disconnect a specific client
   */
  disconnectClient(socketId: string, reason?: string): boolean {
    if (!this.io) return false;

    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return false;

    socket.emit('disconnect_reason', { reason: reason || 'Disconnected by server' });
    socket.disconnect(true);
    return true;
  }

  /**
   * Check if service is running
   */
  isHealthy(): boolean {
    return this.isRunning && this.io !== null;
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Notify all clients
    this.broadcastAll('shutdown', { message: 'Server shutting down' });

    // Disconnect all clients
    for (const [socketId] of this.clients) {
      this.disconnectClient(socketId, 'Server shutdown');
    }

    if (this.io) {
      this.io.close();
      this.io = null;
    }

    this.isRunning = false;
    this.emit('shutdown');
    console.log('[RealtimeService] WebSocket server shut down');
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const realtimeService = new RealtimeService();

export default RealtimeService;

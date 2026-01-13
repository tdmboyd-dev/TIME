/**
 * TIME Real-Time Hub
 *
 * Central WebSocket hub for platform-wide real-time updates.
 * Everything happens in real-time - no page refreshes needed.
 *
 * Channels:
 * - market:* - Real-time price updates
 * - portfolio:* - Portfolio changes, P&L updates
 * - trades:* - Trade executions, order fills
 * - alerts:* - Risk alerts, price alerts, AI insights
 * - bots:* - Bot status, signals, performance
 * - defi:* - DeFi yields, opportunities, positions
 * - social:* - Copy trading signals, leaderboard updates
 * - system:* - Platform status, announcements
 */

import { EventEmitter } from 'events';
import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type Channel =
  | 'market'
  | 'portfolio'
  | 'trades'
  | 'alerts'
  | 'bots'
  | 'defi'
  | 'social'
  | 'system'
  | 'strategies'
  | 'risk';

export interface RealtimeEvent {
  channel: Channel;
  event: string;
  data: any;
  timestamp: Date;
  userId?: string; // If targeted to specific user
}

export interface ClientSubscription {
  socketId: string;
  userId: string;
  channels: Set<Channel>;
  symbols: Set<string>;
  connectedAt: Date;
}

export interface MarketUpdate {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface PortfolioUpdate {
  userId: string;
  totalValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  positions: {
    symbol: string;
    quantity: number;
    value: number;
    pnl: number;
    pnlPercent: number;
  }[];
  timestamp: Date;
}

export interface TradeUpdate {
  id: string;
  userId: string;
  type: 'fill' | 'partial_fill' | 'rejected' | 'cancelled';
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  botId?: string;
  strategyId?: string;
  timestamp: Date;
}

export interface AlertUpdate {
  id: string;
  userId: string;
  type: 'price' | 'risk' | 'ai_insight' | 'signal' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  data?: any;
  timestamp: Date;
}

export interface BotUpdate {
  botId: string;
  userId: string;
  type: 'signal' | 'trade' | 'status' | 'performance' | 'error';
  data: any;
  timestamp: Date;
}

export interface DeFiUpdate {
  type: 'yield_change' | 'position_update' | 'harvest' | 'risk_alert' | 'opportunity';
  data: any;
  userId?: string;
  timestamp: Date;
}

// ============================================================================
// Real-Time Hub
// ============================================================================

export class RealtimeHub extends EventEmitter {
  private io: SocketServer | null = null;
  private clients: Map<string, ClientSubscription> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private symbolSubscribers: Map<string, Set<string>> = new Map(); // symbol -> socketIds

  // Rate limiting
  private rateLimits: Map<string, number> = new Map();
  private readonly MAX_EVENTS_PER_SECOND = 100;

  // Message queue for buffering
  private messageQueue: RealtimeEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    const corsOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://timebeyondus.com',
      'https://www.timebeyondus.com',
      'https://time-frontend.vercel.app',
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
    ];

    this.io = new SocketServer(httpServer, {
      cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupSocketHandlers();
    this.startMessageFlusher();
    this.startHeartbeat();

    console.log('[RealtimeHub] WebSocket server initialized');
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`[RealtimeHub] Client connected: ${socket.id}`);

      // Create client subscription
      const client: ClientSubscription = {
        socketId: socket.id,
        userId: '', // Set on authentication
        channels: new Set(['system']), // Everyone gets system updates
        symbols: new Set(),
        connectedAt: new Date(),
      };
      this.clients.set(socket.id, client);

      // Send welcome message
      socket.emit('connected', {
        socketId: socket.id,
        serverTime: new Date(),
        message: 'Connected to TIME Real-Time Hub',
      });

      // Handle authentication
      socket.on('authenticate', (data: { userId: string; token?: string }) => {
        this.handleAuthenticate(socket, data);
      });

      // Handle channel subscriptions
      socket.on('subscribe', (data: { channels?: Channel[]; symbols?: string[] }) => {
        this.handleSubscribe(socket, data);
      });

      socket.on('unsubscribe', (data: { channels?: Channel[]; symbols?: string[] }) => {
        this.handleUnsubscribe(socket, data);
      });

      // Handle ping for latency measurement
      socket.on('ping', () => {
        socket.emit('pong', { serverTime: Date.now() });
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });
    });
  }

  private handleAuthenticate(socket: Socket, data: { userId: string; token?: string }): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // In production: Verify JWT token
    client.userId = data.userId;

    // Track user's sockets
    if (!this.userSockets.has(data.userId)) {
      this.userSockets.set(data.userId, new Set());
    }
    this.userSockets.get(data.userId)!.add(socket.id);

    // Auto-subscribe to user-specific channels
    client.channels.add('portfolio');
    client.channels.add('trades');
    client.channels.add('alerts');
    client.channels.add('bots');

    // Join user room
    socket.join(`user:${data.userId}`);

    socket.emit('authenticated', {
      userId: data.userId,
      subscribedChannels: Array.from(client.channels),
    });

    console.log(`[RealtimeHub] User ${data.userId} authenticated on socket ${socket.id}`);
  }

  private handleSubscribe(socket: Socket, data: { channels?: Channel[]; symbols?: string[] }): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // Subscribe to channels
    if (data.channels) {
      for (const channel of data.channels) {
        client.channels.add(channel);
        socket.join(`channel:${channel}`);
      }
    }

    // Subscribe to symbols
    if (data.symbols) {
      for (const symbol of data.symbols) {
        client.symbols.add(symbol);

        if (!this.symbolSubscribers.has(symbol)) {
          this.symbolSubscribers.set(symbol, new Set());
        }
        this.symbolSubscribers.get(symbol)!.add(socket.id);

        socket.join(`symbol:${symbol}`);
      }
    }

    socket.emit('subscribed', {
      channels: Array.from(client.channels),
      symbols: Array.from(client.symbols),
    });
  }

  private handleUnsubscribe(socket: Socket, data: { channels?: Channel[]; symbols?: string[] }): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    if (data.channels) {
      for (const channel of data.channels) {
        client.channels.delete(channel);
        socket.leave(`channel:${channel}`);
      }
    }

    if (data.symbols) {
      for (const symbol of data.symbols) {
        client.symbols.delete(symbol);
        this.symbolSubscribers.get(symbol)?.delete(socket.id);
        socket.leave(`symbol:${symbol}`);
      }
    }

    socket.emit('unsubscribed', {
      channels: Array.from(client.channels),
      symbols: Array.from(client.symbols),
    });
  }

  private handleDisconnect(socket: Socket, reason: string): void {
    const client = this.clients.get(socket.id);
    if (client) {
      // Remove from user sockets
      if (client.userId) {
        this.userSockets.get(client.userId)?.delete(socket.id);
        if (this.userSockets.get(client.userId)?.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }

      // Remove from symbol subscribers
      for (const symbol of client.symbols) {
        this.symbolSubscribers.get(symbol)?.delete(socket.id);
      }
    }

    this.clients.delete(socket.id);
    console.log(`[RealtimeHub] Client disconnected: ${socket.id} (${reason})`);
  }

  // ============================================================================
  // Broadcasting Methods
  // ============================================================================

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, { ...data, timestamp: new Date() });
  }

  /**
   * Broadcast to specific channel
   */
  broadcastToChannel(channel: Channel, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`channel:${channel}`).emit(event, { ...data, timestamp: new Date() });
  }

  /**
   * Send to specific user (all their connected devices)
   */
  sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, { ...data, timestamp: new Date() });
  }

  /**
   * Broadcast market update to symbol subscribers
   */
  broadcastMarketUpdate(update: MarketUpdate): void {
    if (!this.io) return;

    this.io.to(`symbol:${update.symbol}`).emit('market:update', update);

    // Also broadcast to general market channel
    this.broadcastToChannel('market', 'market:tick', {
      symbol: update.symbol,
      price: update.last,
      change: update.changePercent,
    });
  }

  /**
   * Send portfolio update to user
   */
  sendPortfolioUpdate(update: PortfolioUpdate): void {
    this.sendToUser(update.userId, 'portfolio:update', update);
  }

  /**
   * Send trade notification
   */
  sendTradeUpdate(update: TradeUpdate): void {
    this.sendToUser(update.userId, 'trade:update', update);

    // If it's a bot trade, also send to bots channel
    if (update.botId) {
      this.broadcastToChannel('bots', 'bot:trade', {
        botId: update.botId,
        trade: update,
      });
    }
  }

  /**
   * Send alert to user
   */
  sendAlert(alert: AlertUpdate): void {
    this.sendToUser(alert.userId, 'alert:new', alert);

    // Critical alerts also go to system channel for admin visibility
    if (alert.priority === 'critical') {
      this.broadcastToChannel('system', 'alert:critical', alert);
    }
  }

  /**
   * Send bot update
   */
  sendBotUpdate(update: BotUpdate): void {
    this.sendToUser(update.userId, 'bot:update', update);
    this.broadcastToChannel('bots', `bot:${update.type}`, update);
  }

  /**
   * Send DeFi update
   */
  sendDeFiUpdate(update: DeFiUpdate): void {
    if (update.userId) {
      this.sendToUser(update.userId, `defi:${update.type}`, update);
    } else {
      this.broadcastToChannel('defi', `defi:${update.type}`, update);
    }
  }

  /**
   * Send strategy update
   */
  sendStrategyUpdate(userId: string, strategyId: string, event: string, data: any): void {
    this.sendToUser(userId, `strategy:${event}`, { strategyId, ...data });
  }

  /**
   * Send risk alert
   */
  sendRiskAlert(userId: string, alert: any): void {
    this.sendToUser(userId, 'risk:alert', alert);
    this.sendAlert({
      id: `RISK_${Date.now()}`,
      userId,
      type: 'risk',
      priority: alert.severity || 'high',
      title: alert.title,
      message: alert.message,
      actionRequired: alert.actionRequired || false,
      data: alert,
      timestamp: new Date(),
    });
  }

  /**
   * Send copy trading signal
   */
  sendCopySignal(signal: any): void {
    // Send to all users copying this provider
    const copiers = signal.copiers || [];
    for (const userId of copiers) {
      this.sendToUser(userId, 'social:signal', signal);
    }

    // Broadcast to social channel
    this.broadcastToChannel('social', 'social:new_signal', {
      providerId: signal.providerId,
      symbol: signal.symbol,
      direction: signal.direction,
    });
  }

  /**
   * Send system announcement
   */
  sendSystemAnnouncement(title: string, message: string, priority: 'low' | 'medium' | 'high'): void {
    this.broadcast('system:announcement', { title, message, priority });
  }

  // ============================================================================
  // Message Queuing for High-Frequency Updates
  // ============================================================================

  /**
   * Queue message for batched delivery (for high-frequency updates like prices)
   */
  queueMessage(event: RealtimeEvent): void {
    this.messageQueue.push(event);
  }

  private startMessageFlusher(): void {
    // Flush message queue every 100ms for batched delivery
    this.flushInterval = setInterval(() => {
      this.flushMessageQueue();
    }, 100);
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    // Group messages by channel for efficient delivery
    const byChannel = new Map<string, RealtimeEvent[]>();

    for (const msg of this.messageQueue) {
      const key = msg.userId ? `user:${msg.userId}` : `channel:${msg.channel}`;
      if (!byChannel.has(key)) {
        byChannel.set(key, []);
      }
      byChannel.get(key)!.push(msg);
    }

    // Deliver batched messages
    for (const [target, messages] of byChannel) {
      if (this.io) {
        if (messages.length === 1) {
          this.io.to(target).emit(messages[0].event, messages[0].data);
        } else {
          this.io.to(target).emit('batch', messages);
        }
      }
    }

    // Clear queue
    this.messageQueue = [];
  }

  // ============================================================================
  // Heartbeat & Health
  // ============================================================================

  private startHeartbeat(): void {
    setInterval(() => {
      if (this.io) {
        this.io.emit('heartbeat', {
          serverTime: Date.now(),
          connectedClients: this.clients.size,
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get connection stats
   */
  getStats(): {
    connectedClients: number;
    authenticatedUsers: number;
    symbolSubscriptions: number;
    channelBreakdown: Record<string, number>;
  } {
    const channelBreakdown: Record<string, number> = {};

    for (const client of this.clients.values()) {
      for (const channel of client.channels) {
        channelBreakdown[channel] = (channelBreakdown[channel] || 0) + 1;
      }
    }

    return {
      connectedClients: this.clients.size,
      authenticatedUsers: this.userSockets.size,
      symbolSubscriptions: this.symbolSubscribers.size,
      channelBreakdown,
    };
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get user's connected devices count
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  /**
   * Shutdown gracefully
   */
  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushMessageQueue();

    if (this.io) {
      this.io.emit('system:shutdown', { message: 'Server is shutting down' });
      this.io.close();
    }

    console.log('[RealtimeHub] Shutdown complete');
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const realtimeHub = new RealtimeHub();
export default realtimeHub;

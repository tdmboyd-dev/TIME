'use client';

/**
 * TIME WebSocket Hook
 *
 * React hook for connecting to TIME's real-time WebSocket service.
 * Provides automatic reconnection, channel subscriptions, and typed events.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================
// TYPES
// ============================================================

export type RealtimeChannel =
  | 'trades'
  | 'signals'
  | 'regime'
  | 'bots'
  | 'strategies'
  | 'insights'
  | 'system'
  | 'evolution'
  | 'prices'
  | 'alerts'
  | 'portfolio'
  | 'notifications';

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  serverTime: Date | null;
  reconnectAttempts: number;
}

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

export interface EvolutionUpdate {
  type: 'proposal' | 'approved' | 'rejected' | 'auto_evolved' | 'mode_change';
  proposalId?: string;
  strategyId?: string;
  description: string;
  currentMode: 'controlled' | 'autonomous';
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

export interface SystemHealthUpdate {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  latency?: number;
  errorRate?: number;
  message?: string;
  timestamp: Date;
}

export interface NotificationUpdate {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  data?: Record<string, any>;
  url?: string;
}

export interface WebSocketHandlers {
  onTrade?: (update: TradeUpdate) => void;
  onRegimeChange?: (update: RegimeUpdate) => void;
  onBotUpdate?: (update: BotUpdate) => void;
  onInsight?: (update: InsightUpdate) => void;
  onAlert?: (update: AlertUpdate) => void;
  onPortfolio?: (update: PortfolioUpdate) => void;
  onEvolution?: (update: EvolutionUpdate) => void;
  onPrice?: (update: PriceUpdate) => void;
  onPrices?: (updates: PriceUpdate[]) => void;
  onSystemHealth?: (update: SystemHealthUpdate) => void;
  onNotification?: (update: NotificationUpdate) => void;
  onHeartbeat?: (data: { serverTime: Date; connectedClients: number; uptime: number }) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  auth?: { token: string };
  channels?: RealtimeChannel[];
  handlers?: WebSocketHandlers;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    autoConnect = true,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    auth,
    channels = [],
    handlers = {},
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const handlersRef = useRef(handlers);

  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    serverTime: null,
    reconnectAttempts: 0,
  });

  const [subscribedChannels, setSubscribedChannels] = useState<Set<RealtimeChannel>>(new Set());

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: reconnect,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
      auth: auth ? { token: auth.token } : undefined,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        error: null,
        serverTime: null,
        reconnectAttempts: 0,
      });
      reconnectAttemptsRef.current = 0;
      handlersRef.current.onConnect?.();

      // Authenticate if token provided
      if (auth?.token) {
        socket.emit('authenticate', { token: auth.token });
      }

      // Subscribe to initial channels
      if (channels.length > 0) {
        socket.emit('subscribe', channels.map(c => ({ channel: c })));
      }
    });

    socket.on('disconnect', (reason) => {
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        error: `Disconnected: ${reason}`,
      }));
      handlersRef.current.onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      reconnectAttemptsRef.current++;
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message,
        reconnectAttempts: reconnectAttemptsRef.current,
      }));
      handlersRef.current.onError?.(error);
    });

    // Welcome message
    socket.on('welcome', (data: { serverTime: string; availableChannels: string[] }) => {
      setConnectionState(prev => ({
        ...prev,
        serverTime: new Date(data.serverTime),
      }));
    });

    // Subscription confirmation
    socket.on('subscribed', (data: { channels: { channel: string; success: boolean }[] }) => {
      const newChannels = new Set(subscribedChannels);
      data.channels.forEach(c => {
        if (c.success) {
          newChannels.add(c.channel as RealtimeChannel);
        }
      });
      setSubscribedChannels(newChannels);
    });

    // Channel event handlers
    socket.on('trades:update', (payload: { data: TradeUpdate }) => {
      handlersRef.current.onTrade?.(payload.data);
    });

    socket.on('regime:change', (payload: { data: RegimeUpdate }) => {
      handlersRef.current.onRegimeChange?.(payload.data);
    });

    socket.on('bots:update', (payload: { data: BotUpdate }) => {
      handlersRef.current.onBotUpdate?.(payload.data);
    });

    socket.on('insights:new', (payload: { data: InsightUpdate }) => {
      handlersRef.current.onInsight?.(payload.data);
    });

    socket.on('alerts:low', (payload: { data: AlertUpdate }) => {
      handlersRef.current.onAlert?.(payload.data);
    });
    socket.on('alerts:medium', (payload: { data: AlertUpdate }) => {
      handlersRef.current.onAlert?.(payload.data);
    });
    socket.on('alerts:high', (payload: { data: AlertUpdate }) => {
      handlersRef.current.onAlert?.(payload.data);
    });
    socket.on('alerts:critical', (payload: { data: AlertUpdate }) => {
      handlersRef.current.onAlert?.(payload.data);
    });

    socket.on('portfolio:update', (payload: { data: PortfolioUpdate }) => {
      handlersRef.current.onPortfolio?.(payload.data);
    });

    socket.on('evolution:proposal', (payload: { data: EvolutionUpdate }) => {
      handlersRef.current.onEvolution?.(payload.data);
    });
    socket.on('evolution:approved', (payload: { data: EvolutionUpdate }) => {
      handlersRef.current.onEvolution?.(payload.data);
    });
    socket.on('evolution:rejected', (payload: { data: EvolutionUpdate }) => {
      handlersRef.current.onEvolution?.(payload.data);
    });
    socket.on('evolution:mode_change', (payload: { data: EvolutionUpdate }) => {
      handlersRef.current.onEvolution?.(payload.data);
    });
    socket.on('evolution:auto_evolved', (payload: { data: EvolutionUpdate }) => {
      handlersRef.current.onEvolution?.(payload.data);
    });

    socket.on('prices:tick', (payload: { data: PriceUpdate }) => {
      handlersRef.current.onPrice?.(payload.data);
    });
    socket.on('prices:batch', (payload: { data: PriceUpdate[] }) => {
      handlersRef.current.onPrices?.(payload.data);
    });

    socket.on('system:health', (payload: { data: SystemHealthUpdate }) => {
      handlersRef.current.onSystemHealth?.(payload.data);
    });

    socket.on('system:heartbeat', (payload: { data: any }) => {
      handlersRef.current.onHeartbeat?.(payload.data);
      setConnectionState(prev => ({
        ...prev,
        serverTime: new Date(payload.data.serverTime),
      }));
    });

    socket.on('notifications:new', (payload: { data: NotificationUpdate }) => {
      handlersRef.current.onNotification?.(payload.data);
    });
  }, [url, reconnect, reconnectAttempts, reconnectDelay, auth, channels]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      serverTime: null,
      reconnectAttempts: 0,
    });
    setSubscribedChannels(new Set());
  }, []);

  // Subscribe to channels
  const subscribe = useCallback((newChannels: RealtimeChannel[]) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('subscribe', newChannels.map(c => ({ channel: c })));
  }, []);

  // Unsubscribe from channels
  const unsubscribe = useCallback((channelsToRemove: RealtimeChannel[]) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('unsubscribe', channelsToRemove);

    const newChannels = new Set(subscribedChannels);
    channelsToRemove.forEach(c => newChannels.delete(c));
    setSubscribedChannels(newChannels);
  }, [subscribedChannels]);

  // Subscribe to specific price symbols
  const subscribePrices = useCallback((symbols: string[]) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('subscribe:prices', symbols);
  }, []);

  // Send ping
  const ping = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('ping');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    // State
    ...connectionState,
    subscribedChannels: Array.from(subscribedChannels),

    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    subscribePrices,
    ping,

    // Socket reference (for advanced use)
    socket: socketRef.current,
  };
}

// ============================================================
// CONVENIENCE HOOKS
// ============================================================

/**
 * Hook for subscribing to trade updates only
 */
export function useTradeUpdates(onTrade: (update: TradeUpdate) => void) {
  return useWebSocket({
    channels: ['trades'],
    handlers: { onTrade },
  });
}

/**
 * Hook for subscribing to alerts only
 */
export function useAlerts(onAlert: (update: AlertUpdate) => void) {
  return useWebSocket({
    channels: ['alerts'],
    handlers: { onAlert },
  });
}

/**
 * Hook for subscribing to portfolio updates only
 */
export function usePortfolioUpdates(onPortfolio: (update: PortfolioUpdate) => void) {
  return useWebSocket({
    channels: ['portfolio'],
    handlers: { onPortfolio },
  });
}

/**
 * Hook for subscribing to regime changes only
 */
export function useRegimeUpdates(onRegimeChange: (update: RegimeUpdate) => void) {
  return useWebSocket({
    channels: ['regime'],
    handlers: { onRegimeChange },
  });
}

/**
 * Hook for subscribing to evolution updates only
 */
export function useEvolutionUpdates(onEvolution: (update: EvolutionUpdate) => void) {
  return useWebSocket({
    channels: ['evolution'],
    handlers: { onEvolution },
  });
}

/**
 * Hook for subscribing to system health only
 */
export function useSystemHealth(onSystemHealth: (update: SystemHealthUpdate) => void) {
  return useWebSocket({
    channels: ['system'],
    handlers: { onSystemHealth },
  });
}

/**
 * Hook for subscribing to notifications only
 */
export function useNotificationUpdates(onNotification: (update: NotificationUpdate) => void) {
  return useWebSocket({
    channels: ['notifications'],
    handlers: { onNotification },
  });
}

export default useWebSocket;

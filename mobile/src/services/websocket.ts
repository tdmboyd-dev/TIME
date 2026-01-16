/**
 * WebSocket Service for Real-time Price Updates
 * TIME BEYOND US - Meta-Intelligence Trading Platform
 */

import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { config } from '../config';
import { logger } from '../utils/logger';

type PriceCallback = (data: PriceUpdate) => void;
type TradeCallback = (data: TradeUpdate) => void;
type BotCallback = (data: BotUpdate) => void;
type ConnectionCallback = (status: ConnectionStatus) => void;

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export interface TradeUpdate {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  amount: number;
  price: number;
  status: string;
  timestamp: number;
}

export interface BotUpdate {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'inactive';
  action: 'trade' | 'signal' | 'status_change' | 'error';
  message: string;
  data?: any;
  timestamp: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

class WebSocketService {
  private socket: Socket | null = null;
  private priceCallbacks: Map<string, Set<PriceCallback>> = new Map();
  private tradeCallbacks: Set<TradeCallback> = new Set();
  private botCallbacks: Set<BotCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = config.wsMaxReconnectAttempts;
  private reconnectDelay: number = config.wsReconnectDelay;
  private isConnecting: boolean = false;

  // Initialize WebSocket connection
  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.notifyConnectionStatus('connecting');

    try {
      const token = await SecureStore.getItemAsync('auth_token');

      this.socket = io(config.wsUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        auth: {
          token,
        },
        extraHeaders: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      logger.ws(`Connecting to ${config.wsUrl}`);

      this.setupEventListeners();
    } catch (error) {
      logger.error('WebSocket connection error', { tag: 'WebSocket', data: error });
      this.isConnecting = false;
      this.notifyConnectionStatus('error');
    }
  }

  // Setup socket event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.ws('Connected successfully');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.notifyConnectionStatus('connected');

      // Re-subscribe to previously subscribed symbols
      this.subscribedSymbols.forEach((symbol) => {
        this.socket?.emit('subscribe:price', { symbol });
      });
    });

    this.socket.on('disconnect', (reason) => {
      logger.ws(`Disconnected: ${reason}`);
      this.notifyConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      logger.error('WebSocket connection error', { tag: 'WebSocket', data: error });
      this.isConnecting = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`, { tag: 'WebSocket' });
        this.notifyConnectionStatus('error');
      }
    });

    // Price updates
    this.socket.on('price:update', (data: PriceUpdate) => {
      this.handlePriceUpdate(data);
    });

    // Batch price updates
    this.socket.on('prices:batch', (data: PriceUpdate[]) => {
      data.forEach((priceData) => this.handlePriceUpdate(priceData));
    });

    // Trade updates
    this.socket.on('trade:update', (data: TradeUpdate) => {
      this.tradeCallbacks.forEach((callback) => callback(data));
    });

    // Trade executed notification
    this.socket.on('trade:executed', (data: TradeUpdate) => {
      this.tradeCallbacks.forEach((callback) => callback(data));
    });

    // Bot updates
    this.socket.on('bot:update', (data: BotUpdate) => {
      this.botCallbacks.forEach((callback) => callback(data));
    });

    // Bot signal
    this.socket.on('bot:signal', (data: BotUpdate) => {
      this.botCallbacks.forEach((callback) => callback({ ...data, action: 'signal' }));
    });

    // Portfolio updates
    this.socket.on('portfolio:update', (data: any) => {
      // Handle portfolio updates - can be extended
      logger.ws('Portfolio update', data);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      logger.error('WebSocket error', { tag: 'WebSocket', data: error });
    });
  }

  // Handle price update and notify subscribers
  private handlePriceUpdate(data: PriceUpdate): void {
    const callbacks = this.priceCallbacks.get(data.symbol);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }

    // Also notify 'all' subscribers
    const allCallbacks = this.priceCallbacks.get('*');
    if (allCallbacks) {
      allCallbacks.forEach((callback) => callback(data));
    }
  }

  // Subscribe to price updates for a symbol
  subscribeToPrice(symbol: string, callback: PriceCallback): () => void {
    if (!this.priceCallbacks.has(symbol)) {
      this.priceCallbacks.set(symbol, new Set());
    }

    this.priceCallbacks.get(symbol)?.add(callback);
    this.subscribedSymbols.add(symbol);

    // Emit subscribe event if connected
    if (this.socket?.connected) {
      this.socket.emit('subscribe:price', { symbol });
    }

    // Return unsubscribe function
    return () => {
      this.priceCallbacks.get(symbol)?.delete(callback);
      if (this.priceCallbacks.get(symbol)?.size === 0) {
        this.priceCallbacks.delete(symbol);
        this.subscribedSymbols.delete(symbol);
        this.socket?.emit('unsubscribe:price', { symbol });
      }
    };
  }

  // Subscribe to all price updates
  subscribeToAllPrices(callback: PriceCallback): () => void {
    return this.subscribeToPrice('*', callback);
  }

  // Subscribe to trade updates
  subscribeToTrades(callback: TradeCallback): () => void {
    this.tradeCallbacks.add(callback);

    if (this.socket?.connected) {
      this.socket.emit('subscribe:trades');
    }

    return () => {
      this.tradeCallbacks.delete(callback);
      if (this.tradeCallbacks.size === 0) {
        this.socket?.emit('unsubscribe:trades');
      }
    };
  }

  // Subscribe to bot updates
  subscribeToBots(callback: BotCallback): () => void {
    this.botCallbacks.add(callback);

    if (this.socket?.connected) {
      this.socket.emit('subscribe:bots');
    }

    return () => {
      this.botCallbacks.delete(callback);
      if (this.botCallbacks.size === 0) {
        this.socket?.emit('unsubscribe:bots');
      }
    };
  }

  // Subscribe to connection status changes
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  // Notify connection status change
  private notifyConnectionStatus(status: ConnectionStatus): void {
    this.connectionCallbacks.forEach((callback) => callback(status));
  }

  // Send a message through WebSocket
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      logger.warn(`WebSocket not connected, cannot emit: ${event}`, { tag: 'WebSocket' });
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    if (this.isConnecting) return 'connecting';
    if (this.socket?.connected) return 'connected';
    return 'disconnected';
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.priceCallbacks.clear();
    this.tradeCallbacks.clear();
    this.botCallbacks.clear();
    this.subscribedSymbols.clear();
    this.notifyConnectionStatus('disconnected');
  }

  // Reconnect WebSocket
  async reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }

  // Subscribe to specific symbols
  subscribeToSymbols(symbols: string[]): void {
    symbols.forEach((symbol) => {
      this.subscribedSymbols.add(symbol);
      if (this.socket?.connected) {
        this.socket.emit('subscribe:price', { symbol });
      }
    });
  }

  // Unsubscribe from symbols
  unsubscribeFromSymbols(symbols: string[]): void {
    symbols.forEach((symbol) => {
      this.subscribedSymbols.delete(symbol);
      this.priceCallbacks.delete(symbol);
      if (this.socket?.connected) {
        this.socket.emit('unsubscribe:price', { symbol });
      }
    });
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;

// React hook for using WebSocket in components
export function useWebSocket() {
  return websocketService;
}

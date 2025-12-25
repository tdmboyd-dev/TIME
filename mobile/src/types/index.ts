// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  settings?: UserSettings;
}

export interface UserSettings {
  notifications: {
    trades: boolean;
    bots: boolean;
    priceAlerts: boolean;
    system: boolean;
  };
  biometricEnabled: boolean;
  theme: 'dark' | 'light';
  language: string;
}

// Portfolio types
export interface Portfolio {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Position[];
  history: PortfolioHistory[];
}

export interface Position {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  avgBuyPrice: number;
  icon?: string;
}

export interface PortfolioHistory {
  timestamp: string;
  value: number;
}

// Trading types
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop-loss';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  amount: number;
  price?: number;
  filledAmount: number;
  filledPrice?: number;
  fee: number;
  timestamp: string;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  amount: number;
  price: number;
  fee: number;
  timestamp: string;
}

// Bot types
export type BotStatus = 'active' | 'inactive' | 'paused';
export type BotStrategy =
  | 'grid'
  | 'dca'
  | 'scalping'
  | 'arbitrage'
  | 'momentum'
  | 'mean-reversion'
  | 'custom';

export interface Bot {
  id: string;
  name: string;
  strategy: string;
  strategyType: BotStrategy;
  status: BotStatus;
  profitLoss: number;
  profitLossPercent: number;
  trades24h: number;
  totalTrades: number;
  winRate: number;
  activePairs: string[];
  config: BotConfig;
  createdAt: string;
  lastActive?: string;
}

export interface BotConfig {
  pairs: string[];
  baseAmount: number;
  stopLoss?: number;
  takeProfit?: number;
  maxPositions?: number;
  [key: string]: any; // Strategy-specific config
}

// Market types
export interface Market {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Notification types
export type NotificationType = 'trade' | 'bot' | 'price' | 'system';
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  priority: NotificationPriority;
  read: boolean;
  data?: any;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresAt: string;
}

// Analytics types
export interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
}

export interface PerformanceMetrics {
  period: string;
  returns: number;
  returnsPercent: number;
  maxDrawdown: number;
  volatility: number;
  trades: number;
}

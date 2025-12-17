/**
 * MongoDB Schemas for TIME
 *
 * Database persistence for all TIME components:
 * - Users and consent
 * - Bots and fingerprints
 * - Strategies and performance
 * - Trades and attribution
 * - Learning events and insights
 * - System configuration
 */

// Note: In production, use mongoose. These are schema definitions.
// import mongoose, { Schema, Document } from 'mongoose';

// ============================================================
// USER SCHEMAS
// ============================================================

export interface UserSchema {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'owner';
  phone?: string;
  avatar?: string;
  createdAt: Date;
  lastLogin: Date;
  lastActivity: Date;
  consent: {
    termsAccepted: boolean;
    dataLearningConsent: boolean;
    riskDisclosureAccepted: boolean;
    marketingConsent: boolean;
    acceptedAt: Date;
  };
  settings: {
    timezone: string;
    currency: string;
    language: string;
    theme: 'dark' | 'light' | 'system';
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      tradeAlerts: boolean;
      riskAlerts: boolean;
      dailySummary: boolean;
    };
  };
  brokerConnections: Array<{
    brokerId: string;
    brokerType: string;
    accountId: string;
    isPaper: boolean;
    connectedAt: Date;
    lastSync: Date;
    status: 'active' | 'disconnected' | 'error';
  }>;
}

// ============================================================
// BOT SCHEMAS
// ============================================================

export interface BotSchema {
  _id: string;
  name: string;
  description: string;
  source: 'github' | 'mql5' | 'ctrader' | 'tradingview' | 'user_upload' | 'user_uploaded' | 'synthesized' | 'forum' | 'time_generated' | 'absorbed';
  sourceUrl?: string;
  ownerId?: string;
  author?: string;
  version?: string;
  status: 'pending' | 'pending_review' | 'testing' | 'active' | 'paused' | 'stopped' | 'archived' | 'analyzing' | 'training';
  rating?: number;
  downloads?: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  absorbedAt?: Date;

  // Code and configuration
  code?: string;
  codeHash?: string;
  config?: Record<string, any>;
  configSchema?: Record<string, any>;
  parameters?: Record<string, any>;

  // Safety and compliance
  safetyScore?: number;
  isAbsorbed?: boolean;
  license?: string;

  // Performance metrics
  performance: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    totalTrades: number;
    totalPnL: number;
    avgTrade: number;
    avgWin: number;
    avgLoss: number;
    avgHoldingPeriod: number;
    winStreak: number;
    lossStreak: number;
  };

  // Fingerprint
  fingerprint: {
    strategyType: string;
    tradingStyle: string;
    dnaHash: string;
    patterns: string[];
    indicatorsUsed: string[];
    timeframes: string[];
    marketPreference: string[];
    riskProfile: {
      avgPositionSize: number;
      stopLossRange: [number, number];
      takeProfitRange: [number, number];
      riskRewardRatio: number;
    };
    updatedAt: Date;
  };

  // Tags and categorization
  tags: string[];
  category: string;
  assetClasses: string[];
  symbols: string[];
}

// ============================================================
// STRATEGY SCHEMAS
// ============================================================

export interface StrategySchema {
  _id: string;
  name: string;
  description: string;
  type: 'trend_following' | 'mean_reversion' | 'momentum' | 'breakout' | 'hybrid' | 'synthesized';
  status: 'active' | 'paused' | 'backtesting' | 'optimizing' | 'archived';
  createdAt: Date;
  updatedAt: Date;

  // Source bots
  sourceBots: Array<{
    botId: string;
    weight: number;
    contribution: string[];
  }>;

  // Configuration
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  maxPositions: number;
  maxPositionSize: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;

  // Performance
  performance: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalTrades: number;
    totalPnL: number;
    avgTrade: number;
    lastUpdated: Date;
  };

  // Regime performance
  regimePerformance: Array<{
    regime: string;
    winRate: number;
    profitFactor: number;
    tradeCount: number;
  }>;

  // Backtest results
  backtestResults?: {
    startDate: Date;
    endDate: Date;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    tradeCount: number;
    runAt: Date;
  };

  // Evolution history
  evolutionHistory: Array<{
    version: number;
    changes: string;
    performance: number;
    timestamp: Date;
    approved: boolean;
    approvedBy?: string;
  }>;

  // Synthesized (if applicable)
  synthesisMetadata?: {
    generationNumber: number;
    parentStrategies: string[];
    mutationApplied: string[];
    fitnessScore: number;
  };
}

// ============================================================
// TRADE SCHEMAS
// ============================================================

export interface TradeSchema {
  _id: string;
  symbol: string;
  direction: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: Date;
  exitTime?: Date;
  status: 'open' | 'closed' | 'cancelled';

  // P&L
  pnl?: number;
  pnlPercent?: number;
  fees: number;
  slippage: number;

  // Attribution
  attribution: {
    botId?: string;
    strategyId?: string;
    signalId?: string;
    ensembleId?: string;
  };

  // Context
  marketRegime: string;
  regimeConfidence: number;
  accountId: string;
  brokerId: string;
  orderId?: string;

  // Analysis
  analysis?: {
    entryReason: string;
    exitReason?: string;
    notes?: string;
    tags: string[];
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  };

  // Risk metrics at entry
  riskMetrics: {
    positionSizePercent: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
    riskRewardRatio?: number;
    portfolioRiskPercent: number;
  };
}

// ============================================================
// SIGNAL SCHEMAS
// ============================================================

export interface SignalSchema {
  _id: string;
  botId: string;
  symbol: string;
  direction: 'long' | 'short' | 'close_long' | 'close_short';
  strength: number;
  timestamp: Date;

  // Details
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeframe?: string;

  // Context
  marketRegime: string;
  confidence: number;

  // Outcome
  executed: boolean;
  executedAt?: Date;
  tradeId?: string;
  outcome?: 'win' | 'loss' | 'breakeven';

  // Metadata
  indicators: Array<{
    name: string;
    value: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  }>;
  patterns: string[];
}

// ============================================================
// LEARNING SCHEMAS
// ============================================================

export interface LearningEventSchema {
  _id: string;
  source: 'paid_account' | 'demo_account' | 'user_bot' | 'public_bot' | 'market_data' | 'demo_trading';
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;

  // Event data
  eventType: 'trade' | 'signal' | 'regime_change' | 'pattern' | 'anomaly' | 'user_action';
  data: Record<string, any>;

  // Insights generated
  insights: Array<{
    type: string;
    description: string;
    confidence: number;
    actionable: boolean;
  }>;

  // Learning outcome
  patternsIdentified: string[];
  improvementsApplied: string[];
  knowledgeUpdates: Array<{
    category: string;
    update: string;
    impact: number;
  }>;
}

export interface InsightSchema {
  _id: string;
  category: 'pattern' | 'anomaly' | 'opportunity' | 'risk' | 'optimization';
  insight: string;
  confidence: number;
  actionable: boolean;
  createdAt: Date;

  // Context
  source: string;
  symbols: string[];
  regime: string;

  // Related data
  relatedTrades: string[];
  relatedSignals: string[];
  relatedBots: string[];

  // Outcome
  actedUpon: boolean;
  actedAt?: Date;
  outcome?: {
    result: 'positive' | 'negative' | 'neutral';
    impact: number;
    notes: string;
  };
}

// ============================================================
// SYSTEM CONFIGURATION SCHEMAS
// ============================================================

export interface SystemConfigSchema {
  _id: string;
  key: string;
  value: any;
  category: 'evolution' | 'risk' | 'learning' | 'notification' | 'broker' | 'general';
  description: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface EvolutionStateSchema {
  _id: string;
  mode: 'controlled' | 'autonomous';
  changedAt: Date;
  changedBy: string;
  reason: string;

  // Inactivity tracking
  lastOwnerActivity: Date;
  warningsSent: number;
  warningDates: Date[];

  // Evolution stats
  proposalsGenerated: number;
  proposalsApproved: number;
  proposalsRejected: number;
  autoEvolutions: number;

  // History
  modeHistory: Array<{
    mode: string;
    changedAt: Date;
    changedBy: string;
    reason: string;
  }>;
}

// ============================================================
// ENSEMBLE SCHEMAS
// ============================================================

export interface EnsembleSchema {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;

  // Members
  members: Array<{
    botId: string;
    weight: number;
    voteWeight: number;
  }>;

  // Voting configuration
  votingMethod: 'majority' | 'weighted' | 'unanimous' | 'best_performer';
  minAgreement: number;

  // Performance
  performance: {
    winRate: number;
    profitFactor: number;
    agreementRate: number;
    conflictRate: number;
    totalVotes: number;
  };

  // Regime specialization
  regimeSpecialization: Record<string, {
    enabled: boolean;
    memberWeights: Record<string, number>;
  }>;
}

// ============================================================
// MARKET DATA SCHEMAS
// ============================================================

export interface MarketRegimeHistorySchema {
  _id: string;
  symbol: string;
  regime: string;
  confidence: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;

  // Metrics during regime
  priceChange: number;
  volatility: number;
  volume: number;

  // Bot performance during regime
  botPerformance: Array<{
    botId: string;
    trades: number;
    winRate: number;
    pnl: number;
  }>;
}

export interface PriceBarSchema {
  _id: string;
  symbol: string;
  timeframe: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;

  // Calculated
  change: number;
  changePercent: number;

  // Indicators (pre-calculated)
  indicators?: Record<string, number>;
}

// ============================================================
// NOTIFICATION SCHEMAS
// ============================================================

export interface NotificationSchema {
  _id: string;
  userId: string;
  type: 'trade' | 'risk' | 'system' | 'insight' | 'evolution';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;

  // Delivery
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  sentAt?: Date;
  readAt?: Date;

  // Related
  relatedEntity?: {
    type: string;
    id: string;
  };

  // Actions
  actionRequired: boolean;
  actionTaken?: string;
  actionTakenAt?: Date;
}

// ============================================================
// AUDIT LOG SCHEMAS
// ============================================================

export interface AuditLogSchema {
  _id: string;
  timestamp: Date;
  userId?: string;
  component: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

// ============================================================
// DATABASE INDEXES
// ============================================================

export const indexes = {
  users: [
    { email: 1, unique: true },
    { lastActivity: -1 },
  ],
  bots: [
    { status: 1, rating: -1 },
    { source: 1 },
    { 'fingerprint.dnaHash': 1 },
    { isAbsorbed: 1 },
    { tags: 1 },
  ],
  strategies: [
    { status: 1 },
    { type: 1 },
    { 'performance.sharpeRatio': -1 },
  ],
  trades: [
    { accountId: 1, entryTime: -1 },
    { 'attribution.botId': 1 },
    { 'attribution.strategyId': 1 },
    { symbol: 1, entryTime: -1 },
    { status: 1 },
  ],
  signals: [
    { botId: 1, timestamp: -1 },
    { symbol: 1, timestamp: -1 },
    { executed: 1 },
  ],
  learningEvents: [
    { source: 1, timestamp: -1 },
    { processed: 1 },
    { eventType: 1 },
  ],
  insights: [
    { category: 1, createdAt: -1 },
    { actionable: 1, actedUpon: 1 },
  ],
  notifications: [
    { userId: 1, createdAt: -1 },
    { userId: 1, readAt: 1 },
    { priority: 1 },
  ],
  auditLogs: [
    { timestamp: -1 },
    { userId: 1, timestamp: -1 },
    { component: 1, action: 1 },
  ],
  priceBars: [
    { symbol: 1, timeframe: 1, timestamp: -1 },
  ],
  regimeHistory: [
    { symbol: 1, startTime: -1 },
    { regime: 1 },
  ],
};

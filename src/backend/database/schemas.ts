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

// All available feature permissions
export type FeaturePermission =
  | 'trading'           // Can execute trades
  | 'bots'              // Can use/manage bots
  | 'strategies'        // Can create/edit strategies
  | 'portfolio'         // Can view portfolio
  | 'analytics'         // Can view analytics
  | 'defi'              // Can access DeFi features
  | 'transfers'         // Can make transfers
  | 'tax'               // Can access tax features
  | 'retirement'        // Can access retirement planning
  | 'wealth'            // Can access wealth management
  | 'marketplace'       // Can access bot marketplace
  | 'ml'                // Can access ML training
  | 'admin_users'       // Can manage users (co-admin)
  | 'admin_bots'        // Can manage all bots (co-admin)
  | 'admin_system'      // Can access system settings (co-admin)
  | 'admin_billing'     // Can manage billing (co-admin)
  | 'owner_full';       // Full owner access

// Custom role/position definition
export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: FeaturePermission[];
  createdAt: Date;
  createdBy: string;
}

export interface UserSchema {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'co-admin' | 'owner';
  customRole?: string;           // Custom role/position ID
  customPosition?: string;       // Custom title like "Trading Manager", "Bot Developer"
  status: 'active' | 'blocked' | 'suspended' | 'pending';
  statusReason?: string;         // Reason for block/suspend
  statusChangedAt?: Date;
  statusChangedBy?: string;
  permissions: FeaturePermission[];  // Specific feature permissions
  phone?: string;
  avatar?: string;
  createdAt: Date;
  createdBy?: string;            // Who created this user (for admin-created users)
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
    mfaEnabled?: boolean;
    mfaSecret?: string;
  };
  brokerConnections: Array<{
    brokerId: string;
    brokerType: string;
    accountId: string;
    isPaper: boolean;
    connectedAt: Date;
    lastSync: Date;
    status: 'active' | 'disconnected' | 'error';
    balance?: number;
    buyingPower?: number;
  }>;

  // WebAuthn/Passkey credentials
  webauthnCredentials?: Array<{
    id: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    deviceType: 'singleDevice' | 'multiDevice';
    backedUp: boolean;
    transports?: string[];
    createdAt: Date;
    lastUsedAt: Date;
    friendlyName: string;
  }>;

  // OAuth provider links
  oauthProviders?: Array<{
    provider: 'google' | 'github' | 'apple';
    providerId: string;
    email: string;
    name?: string;
    avatar?: string;
    linkedAt: Date;
    lastUsedAt: Date;
  }>;

  // SMS 2FA fields
  phoneVerified?: boolean;
  sms2faEnabled?: boolean;

  // MFA fields (top level for easy access)
  mfaEnabled?: boolean;
  mfaSecret?: string;
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

export type NotificationType =
  | 'TRADE_EXECUTED'
  | 'TRADE_CLOSED'
  | 'PRICE_ALERT'
  | 'PRICE_TARGET'
  | 'BOT_SIGNAL'
  | 'BOT_STARTED'
  | 'BOT_STOPPED'
  | 'BOT_ERROR'
  | 'BOT_UPDATE'
  | 'BIG_MOVES'
  | 'SECURITY'
  | 'MARKETING'
  | 'SYSTEM'
  | 'SYSTEM_UPDATE'
  | 'SYSTEM_MAINTENANCE'
  | 'DAILY_SUMMARY'
  | 'PROFIT'
  | 'ALERT_TRIGGERED'
  | 'TRADE_COMPLETE'
  | 'RISK_WARNING'
  | 'INSIGHT_GENERATED'
  | 'EVOLUTION_PROPOSAL'
  | 'SCHEDULED';

export interface NotificationSchema {
  _id: string;
  userId: string;
  type: NotificationType | 'trade' | 'risk' | 'system' | 'insight' | 'evolution';
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

  // Push notification data
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
  url?: string;

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

// Push Notification Subscription Schema (Web Push API)
export interface PushSubscriptionSchema {
  _id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceName?: string;
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}

// FCM Subscription Schema (Firebase Cloud Messaging - Mobile)
export interface FCMSubscriptionSchema {
  _id: string;
  userId: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}

// Scheduled Notification Schema
export interface ScheduledNotificationSchema {
  _id: string;
  userId: string;
  templateId?: string;
  title: string;
  body: string;
  category: 'trade' | 'bot' | 'price' | 'big_moves' | 'security' | 'marketing' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  scheduledFor: Date;
  recurrence?: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: Date;
  };
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  sentAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Template Schema
export interface NotificationTemplateSchema {
  _id: string;
  name: string;
  category: 'trade' | 'bot' | 'price' | 'big_moves' | 'security' | 'marketing' | 'system';
  titleTemplate: string;
  bodyTemplate: string;
  icon?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  defaultData?: Record<string, any>;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isActive: boolean;
  isSystem: boolean; // True for built-in templates
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
// TRADING STATE SCHEMAS (For shared state across machines)
// ============================================================

export interface TradingStateSchema {
  _id: string;
  type: 'bot_state' | 'signal' | 'trade' | 'global_config';

  // For bot_state type
  botId?: string;
  botName?: string;
  isEnabled?: boolean;
  isPaused?: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  maxPositionSize?: number;
  maxDailyTrades?: number;
  maxDailyLoss?: number;
  currentDailyTrades?: number;
  currentDailyPnL?: number;
  totalTrades?: number;
  winRate?: number;
  totalPnL?: number;

  // For signal type
  signalId?: string;
  symbol?: string;
  side?: 'BUY' | 'SELL';
  signalType?: 'MARKET' | 'LIMIT' | 'STOP';
  quantity?: number;
  price?: number;
  confidence?: number;
  reasoning?: string;

  // For trade type
  tradeId?: string;
  entryPrice?: number;
  exitPrice?: number;
  status?: 'OPEN' | 'CLOSED' | 'STOPPED_OUT' | 'TAKE_PROFIT' | 'CANCELLED';
  pnl?: number;
  pnlPercent?: number;
  broker?: string;
  orderId?: string;

  // For global_config type
  isRunning?: boolean;
  globalMaxDailyLoss?: number;
  globalMaxPositionSize?: number;
  globalMaxOpenPositions?: number;
  requireApproval?: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// ACATS TRANSFER SCHEMAS
// ============================================================

export type ACATSTransferStatus =
  | 'draft'
  | 'pending_validation'
  | 'submitted'
  | 'received_by_delivering'
  | 'in_review'
  | 'approved'
  | 'in_progress'
  | 'partial_complete'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'failed';

export interface ACATSTransferSchema {
  _id: string;
  userId: string;
  requestNumber: string; // ACATS control number

  // Transfer type
  transferType: 'full' | 'partial';
  assetTransferType: 'in_kind' | 'cash';

  // Delivering broker (where assets come from)
  deliveringBroker: {
    brokerId: string;
    brokerName: string;
    dtcNumber: string;
    accountNumber: string;
    accountTitle: string;
  };

  // Receiving account (TIME account)
  receivingAccount: {
    accountId: string;
    accountNumber: string;
    accountTitle: string;
  };

  // Identity verification
  identity: {
    fullName: string;
    ssnLast4: string;
    dateOfBirth: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };

  // Assets to transfer
  assets: Array<{
    symbol: string;
    cusip?: string;
    description: string;
    quantity: number;
    estimatedValue: number;
    transferType: 'in_kind' | 'cash';
    status: 'pending' | 'transferred' | 'failed' | 'partial';
    notes?: string;
  }>;
  totalEstimatedValue: number;

  // Status tracking
  status: ACATSTransferStatus;
  statusHistory: Array<{
    status: ACATSTransferStatus;
    timestamp: Date;
    message: string;
    details?: Record<string, any>;
  }>;

  // Dates
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  expectedCompletionDate: Date | null;
  completedAt: Date | null;

  // Issues
  rejectionReason: string | null;
  issues: Array<{
    type: 'warning' | 'error';
    message: string;
    resolvedAt: Date | null;
  }>;

  // Documents
  documents: Array<{
    type: 'transfer_form' | 'account_statement' | 'signature' | 'identity';
    fileName: string;
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
  }>;

  // Fees
  fees: Array<{
    type: string;
    amount: number;
    waived: boolean;
    waivedReason?: string;
  }>;

  // Notes
  userNotes: string | null;
  internalNotes: string | null;

  // Notifications sent
  notificationsSent: Array<{
    type: 'initiated' | 'submitted' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'warning';
    sentAt: Date;
    channel: 'email' | 'sms' | 'push';
  }>;
}

// ============================================================
// DATABASE INDEXES
// ============================================================

export const indexes = {
  users: [
    { email: 1, unique: true },
    { lastActivity: -1 },
    { status: 1, createdAt: -1 },  // AUDIT FIX: Added for user filtering
    { role: 1 },                   // AUDIT FIX: Added for permission checks
  ],
  bots: [
    { status: 1, rating: -1 },
    { source: 1 },
    { 'fingerprint.dnaHash': 1 },
    { isAbsorbed: 1 },
    { tags: 1 },
    { ownerId: 1 },                // AUDIT FIX: Added for owner queries
    { status: 1, 'performance.sharpeRatio': -1 },  // AUDIT FIX: Added for top performers
    { downloads: -1 },             // AUDIT FIX: Added for ranking queries
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
    { userId: 1, status: 1 },           // AUDIT FIX: Added for user+status queries
    { 'attribution.botId': 1, entryTime: -1 },  // AUDIT FIX: Compound index for bot trades
    { symbol: 1, status: 1, entryTime: -1 },    // AUDIT FIX: Added for filtered queries
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
  pushSubscriptions: [
    { userId: 1, isActive: 1 },
    { endpoint: 1, unique: true },
    { createdAt: -1 },
  ],
  fcmSubscriptions: [
    { userId: 1, isActive: 1 },
    { token: 1, unique: true },
    { platform: 1 },
    { createdAt: -1 },
  ],
  scheduledNotifications: [
    { userId: 1, status: 1, scheduledFor: 1 },
    { status: 1, scheduledFor: 1 },
    { createdAt: -1 },
  ],
  notificationTemplates: [
    { name: 1 },
    { category: 1, isActive: 1 },
    { isSystem: 1 },
    { createdAt: -1 },
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
  tradingState: [
    { type: 1, botId: 1 },
    { type: 1, signalId: 1 },
    { type: 1, tradeId: 1 },
    { type: 1 },
    { updatedAt: -1 },
  ],
  acatsTransfers: [
    { userId: 1, createdAt: -1 },
    { requestNumber: 1, unique: true },
    { status: 1, createdAt: -1 },
    { 'deliveringBroker.brokerId': 1 },
    { submittedAt: -1 },
    { completedAt: -1 },
  ],
  subscriptions: [
    { userId: 1, status: 1 },
    { customerId: 1 },
    { subscriptionId: 1, unique: true },
    { tier: 1, status: 1 },
    { currentPeriodEnd: 1 },
    { createdAt: -1 },
  ],
};

// ============================================================
// SUBSCRIPTION SCHEMAS
// ============================================================

export interface SubscriptionSchema {
  _id: string;
  userId: string;
  customerId: string; // Stripe customer ID
  subscriptionId: string; // Stripe subscription ID
  tier: 'free' | 'basic' | 'pro' | 'premium' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
  canceledAt?: Date;

  // Payment history
  paymentHistory: Array<{
    invoiceId: string;
    amount: number;
    status: 'paid' | 'failed' | 'pending';
    paidAt?: Date;
    failedAt?: Date;
    failureReason?: string;
  }>;

  // Metadata
  metadata?: Record<string, any>;
}

// ============================================================
// SUPPORT SYSTEM SCHEMAS
// ============================================================

export interface SupportTicketSchema {
  _id: string;
  userId: string;
  ticketNumber: string;
  subject: string;
  category: 'technical' | 'trading' | 'broker' | 'billing' | 'bot' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';

  // Initial message
  initialMessage: string;

  // Messages thread
  messages: Array<{
    id: string;
    senderId: string;
    senderType: 'user' | 'support' | 'ai';
    message: string;
    timestamp: Date;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
    }>;
  }>;

  // Assignment
  assignedTo?: string;
  assignedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;

  // Resolution
  resolutionNotes?: string;
  satisfactionRating?: number;
  satisfactionFeedback?: string;

  // Metadata
  tags: string[];
  relatedTickets: string[];
  escalated: boolean;
  escalatedAt?: Date;
  escalatedReason?: string;
}

export interface ChatHistorySchema {
  _id: string;
  userId: string;
  sessionId: string;

  // Messages
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    intent?: string;
    confidence?: number;
  }>;

  // Session info
  startedAt: Date;
  lastMessageAt: Date;
  endedAt?: Date;

  // Escalation
  escalatedToTicket: boolean;
  ticketId?: string;
  escalatedAt?: Date;

  // Analytics
  messagesCount: number;
  avgResponseTime?: number;
  satisfactionRating?: number;
  issueResolved: boolean;
}

export interface SupportFAQSchema {
  _id: string;
  question: string;
  answer: string;
  category: 'trading' | 'bots' | 'broker' | 'billing' | 'account' | 'technical';
  keywords: string[];
  helpfulness: number;
  views: number;
  helpful_votes: number;
  unhelpful_votes: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  published: boolean;
  order: number;
}

// Add support indexes
export const supportIndexes = {
  supportTickets: [
    { userId: 1, createdAt: -1 },
    { ticketNumber: 1, unique: true },
    { status: 1, priority: -1, createdAt: -1 },
    { assignedTo: 1, status: 1 },
    { category: 1 },
  ],
  chatHistory: [
    { userId: 1, lastMessageAt: -1 },
    { sessionId: 1, unique: true },
    { escalatedToTicket: 1 },
  ],
  supportFAQ: [
    { category: 1, order: 1 },
    { published: 1, order: 1 },
    { keywords: 1 },
  ],
};

// ============================================================
// SOCIAL TRADING SCHEMAS
// ============================================================

export interface CommunityMessageSchema {
  _id: string;
  userId: string;
  username: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;
  channel: string;
  message: string;
  timestamp: Date;

  // Reactions
  reactions: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;

  // Mentions
  mentions: string[];

  // Moderation
  isPinned: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: Date;
  deletedReason?: string;

  // Attachments
  attachments?: Array<{
    type: 'trade' | 'bot' | 'image';
    data: Record<string, any>;
  }>;

  // Thread
  replyTo?: string;
  threadCount: number;
}

export interface TraderLeaderboardSchema {
  _id: string;
  userId: string;
  username: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;

  // Performance metrics
  rank: number;
  profitPercent: number;
  winRate: number;
  totalTrades: number;

  // Social metrics
  followers: number;
  copiers: number;

  // Time-based profits
  dailyProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
  allTimeProfit: number;

  // Risk metrics
  riskScore: number;
  sharpeRatio: number;
  maxDrawdown: number;

  // Strategy info
  assetClass: string;
  strategy: string;

  // Timestamps
  lastUpdated: Date;
  periodStart: Date;
  periodEnd: Date;

  // Cache info
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  cacheExpiry: Date;
}

export interface BotLeaderboardSchema {
  _id: string;
  botId: string;
  botName: string;
  botAvatar?: string;
  ownerId: string;
  ownerUsername: string;

  // Performance metrics
  rank: number;
  profitPercent: number;
  winRate: number;
  totalTrades: number;
  sharpeRatio: number;
  profitFactor: number;
  maxDrawdown: number;

  // Social metrics
  followers: number;
  copiers: number;
  rentals: number;

  // Time-based profits
  dailyProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
  allTimeProfit: number;

  // Strategy info
  assetClass: string;
  strategy: string;

  // Timestamps
  lastUpdated: Date;
  periodStart: Date;
  periodEnd: Date;

  // Cache info
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  cacheExpiry: Date;
}

export interface ChatChannelSchema {
  _id: string;
  channelId: string;
  name: string;
  description: string;
  icon: string;
  color: string;

  // Settings
  isActive: boolean;
  isPrivate: boolean;
  requiresVerification: boolean;
  requiresPro: boolean;

  // Stats
  memberCount: number;
  messageCount: number;
  activeUsers: number;

  // Moderation
  moderators: string[];
  bannedUsers: Array<{
    userId: string;
    bannedBy: string;
    bannedAt: Date;
    reason: string;
    expiresAt?: Date;
  }>;

  // Timestamps
  createdAt: Date;
  lastMessageAt: Date;
}

export interface UserFollowSchema {
  _id: string;
  followerId: string;
  followingId: string;
  followedAt: Date;

  // Copy trading relationship
  isCopying: boolean;
  copyConfig?: {
    mode: 'proportional' | 'fixed';
    maxRiskPerTrade: number;
    maxDailyRisk: number;
    maxOpenTrades: number;
  };
}

// Social indexes
export const socialIndexes = {
  communityMessages: [
    { channel: 1, timestamp: -1 },
    { userId: 1, timestamp: -1 },
    { isPinned: 1, channel: 1 },
    { isDeleted: 1 },
    { timestamp: -1 },
  ],
  traderLeaderboard: [
    { period: 1, rank: 1 },
    { userId: 1, period: 1 },
    { profitPercent: -1, period: 1 },
    { winRate: -1, period: 1 },
    { cacheExpiry: 1 },
  ],
  botLeaderboard: [
    { period: 1, rank: 1 },
    { botId: 1, period: 1 },
    { profitPercent: -1, period: 1 },
    { winRate: -1, period: 1 },
    { cacheExpiry: 1 },
  ],
  chatChannels: [
    { channelId: 1, unique: true },
    { isActive: 1 },
    { lastMessageAt: -1 },
  ],
  userFollows: [
    { followerId: 1, followingId: 1, unique: true },
    { followerId: 1, followedAt: -1 },
    { followingId: 1, followedAt: -1 },
  ],
};

// ============================================================
// FEATURE FLAGS SCHEMAS
// ============================================================

export type UserSegmentType = 'all' | 'premium' | 'free' | 'beta_testers' | 'by_country';

export interface UserSegmentConfig {
  type: UserSegmentType;
  countries?: string[];          // For by_country segment
  betaTesterIds?: string[];      // Specific beta tester user IDs
}

export interface FeatureFlagSchema {
  _id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;     // 0-100
  userSegments: UserSegmentConfig[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;

  // Announcement configuration
  announceOnEnable: boolean;
  announcementTitle?: string;
  announcementMessage?: string;
  announcementBannerType?: 'info' | 'success' | 'warning' | 'feature';
  announcementDurationDays?: number;

  // Tracking
  enabledAt?: Date;
  disabledAt?: Date;
  enableHistory: Array<{
    id: string;
    action: 'enabled' | 'disabled';
    timestamp: Date;
    performedBy: string;
    previousState: boolean;
    rolloutPercentage: number;
    userSegments: UserSegmentConfig[];
    announcementSent: boolean;
    affectedUsers?: number;
  }>;
}

export interface FeatureAnnouncementSchema {
  _id: string;
  featureId: string;
  featureName: string;
  title: string;
  message: string;
  bannerType: 'info' | 'success' | 'warning' | 'feature';
  createdAt: Date;
  expiresAt: Date;
  targetSegments: UserSegmentConfig[];
  isActive: boolean;

  // Tracking
  viewCount: number;
  dismissCount: number;
  clickCount: number;

  // User interactions (optional, for more detailed tracking)
  viewedBy?: string[];           // User IDs who viewed
  dismissedBy?: string[];        // User IDs who dismissed
}

// Feature flag indexes
export const featureFlagIndexes = {
  featureFlags: [
    { name: 1, unique: true },
    { enabled: 1 },
    { createdAt: -1 },
    { updatedAt: -1 },
    { 'userSegments.type': 1 },
    { createdBy: 1 },
  ],
  featureAnnouncements: [
    { featureId: 1 },
    { isActive: 1, expiresAt: 1 },
    { createdAt: -1 },
    { 'targetSegments.type': 1 },
  ],
};

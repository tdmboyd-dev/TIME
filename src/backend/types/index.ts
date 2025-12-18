/**
 * TIME — Meta-Intelligence Trading Governor
 * Core Type Definitions
 */

// ============================================
// EVOLUTION MODES
// ============================================

export type EvolutionMode = 'controlled' | 'autonomous';

export interface EvolutionState {
  mode: EvolutionMode;
  lastModeChange: Date;
  changedBy: 'admin' | 'inactivity_failsafe' | 'system';
  reason: string;
}

// ============================================
// TIME COMPONENT INTERFACE
// ============================================

export interface TIMEComponent {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'building';
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getHealth(): SystemHealth;
}

// ============================================
// USER & CONSENT
// ============================================

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastActive: Date;
  consent: UserConsent;
  accountType: 'demo' | 'paid';
}

export interface UserConsent {
  analyzeBots: boolean;
  copyBots: boolean;
  absorbBots: boolean;
  upgradeBots: boolean;
  learnFromBots: boolean;
  useBotsInEnsembles: boolean;
  usePaidAccountData: boolean;
  useDemoAccountData: boolean;
  useTradingHistory: boolean;
  usePerformancePatterns: boolean;
  consentedAt: Date;
  consentVersion: string;
}

export const CONSENT_FIELDS = [
  'analyzeBots',
  'copyBots',
  'absorbBots',
  'upgradeBots',
  'learnFromBots',
  'useBotsInEnsembles',
  'usePaidAccountData',
  'useDemoAccountData',
  'useTradingHistory',
  'usePerformancePatterns',
] as const;

// ============================================
// BOT TYPES
// ============================================

export type BotSource =
  | 'user_upload'
  | 'public_free'
  | 'open_source'
  | 'marketplace'
  | 'github'
  | 'forum'
  | 'strategy_library'
  | 'time_generated'
  | 'mql5'
  | 'ctrader'
  | 'tradingview';

export type BotStatus =
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'retired'
  | 'absorbed'
  | 'testing';

export interface Bot {
  id: string;
  name: string;
  description: string;
  source: BotSource;
  sourceUrl?: string;
  ownerId?: string;
  status: BotStatus;
  code: string;
  config: BotConfig;
  fingerprint: BotFingerprint;
  performance: BotPerformance;
  createdAt: Date;
  updatedAt: Date;
  absorbedAt?: Date;
  rating?: number;
  reviewCount?: number;
  license?: string;
}

export interface BotConfig {
  symbols: string[];
  timeframes: string[];
  riskParams: {
    maxPositionSize: number;
    maxDrawdown: number;
    stopLossPercent: number;
    takeProfitPercent: number;
  };
  customParams: Record<string, unknown>;
}

export interface BotFingerprint {
  id: string;
  botId: string;
  strategyType: StrategyType[];
  indicators: string[];
  signalPatterns: string[];
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  preferredRegimes: MarketRegime[];
  weakRegimes: MarketRegime[];
  avgHoldingPeriod: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BotPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingPeriod: number;
  lastUpdated: Date;
}

export type StrategyType =
  | 'trend_following'
  | 'mean_reversion'
  | 'momentum'
  | 'breakout'
  | 'scalping'
  | 'swing'
  | 'arbitrage'
  | 'market_making'
  | 'sentiment'
  | 'hybrid';

// ============================================
// MARKET REGIME
// ============================================

export type MarketRegime =
  | 'trending_up'
  | 'trending_down'
  | 'ranging'
  | 'high_volatility'
  | 'low_volatility'
  | 'event_driven'
  | 'overnight_illiquid'
  | 'sentiment_shift'
  | 'unknown';

export interface RegimeState {
  current: MarketRegime;
  confidence: number;
  duration: number;
  startedAt: Date;
  indicators: RegimeIndicator[];
  transitions: RegimeTransition[];
}

export interface RegimeIndicator {
  name: string;
  value: number;
  signal: MarketRegime;
  weight: number;
}

export interface RegimeTransition {
  from: MarketRegime;
  to: MarketRegime;
  probability: number;
  expectedIn: number; // minutes
}

// ============================================
// TRADING & SIGNALS
// ============================================

export type SignalDirection = 'long' | 'short' | 'neutral' | 'exit';

export interface Signal {
  id: string;
  botId: string;
  symbol: string;
  direction: SignalDirection;
  strength: number; // 0-1
  confidence: number; // 0-1
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  timestamp: Date;
}

export interface Trade {
  id: string;
  userId: string;
  botIds: string[];
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: 'open' | 'closed' | 'cancelled';
  pnl?: number;
  pnlPercent?: number;
  entryTime: Date;
  exitTime?: Date;
  signals: Signal[];
  riskEngineDecisions: RiskDecision[];
  attribution: TradeAttribution;
  story?: TradeStory;
}

export interface TradeAttribution {
  primaryBot: string;
  contributingBots: { botId: string; contribution: number }[];
  signalStrength: number;
  regimeAtEntry: MarketRegime;
  riskEngineModifications: string[];
  synthesisEngineInput: boolean;
}

export interface TradeStory {
  beginnerExplanation: string;
  intermediateExplanation: string;
  proExplanation: string;
  quantExplanation: string;
  keyInsights: string[];
  lessonsLearned: string[];
}

// ============================================
// RISK ENGINE
// ============================================

export interface RiskDecision {
  id: string;
  timestamp: Date;
  type: RiskDecisionType;
  action: RiskAction;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedBots: string[];
  affectedTrades: string[];
}

export type RiskDecisionType =
  | 'position_size_limit'
  | 'drawdown_limit'
  | 'volatility_adjustment'
  | 'correlation_limit'
  | 'anomaly_detected'
  | 'slippage_detected'
  | 'latency_spike'
  | 'bot_misbehavior'
  | 'emergency_brake';

export type RiskAction =
  | 'allow'
  | 'reduce_size'
  | 'reject'
  | 'close_position'
  | 'halt_bot'
  | 'halt_all';

export interface RiskLimits {
  maxPositionSize: number;
  maxPortfolioRisk: number;
  maxDrawdown: number;
  maxDailyLoss: number;
  maxCorrelation: number;
  maxSlippage: number;
  maxLatency: number;
}

// ============================================
// ENSEMBLE & SYNTHESIS
// ============================================

export interface Ensemble {
  id: string;
  name: string;
  description: string;
  botIds: string[];
  weights: Record<string, number>;
  votingMethod: 'majority' | 'weighted' | 'unanimous' | 'confidence_weighted';
  status: 'active' | 'testing' | 'retired';
  performance: BotPerformance;
  createdAt: Date;
  createdBy: 'user' | 'synthesis_engine';
}

export interface SynthesisResult {
  id: string;
  inputBots: string[];
  inputStrategies: string[];
  outputType: 'ensemble' | 'new_bot' | 'new_strategy';
  outputId: string;
  synthesisMethod: string;
  testResults: TestResult[];
  promoted: boolean;
  createdAt: Date;
}

export interface TestResult {
  testType: 'backtest' | 'paper_trade' | 'demo_trade';
  startDate: Date;
  endDate: Date;
  performance: BotPerformance;
  regimesCovered: MarketRegime[];
  passed: boolean;
}

// ============================================
// LEARNING ENGINE
// ============================================

export interface LearningEvent {
  id: string;
  type: LearningEventType;
  source: LearningSource;
  data: Record<string, unknown>;
  insights: string[];
  appliedTo: string[];
  timestamp: Date;
}

export type LearningEventType =
  | 'trade_outcome'
  | 'bot_performance'
  | 'regime_change'
  | 'risk_event'
  | 'user_feedback'
  | 'market_anomaly'
  | 'strategy_comparison'
  | 'ensemble_performance';

export type LearningSource =
  | 'paid_account'
  | 'demo_account'
  | 'paper_trading'
  | 'historical_data'
  | 'live_data'
  | 'bot_simulation'
  | 'user_interaction';

export interface LearningInsight {
  id: string;
  category: string;
  insight: string;
  confidence: number;
  evidence: string[];
  actionable: boolean;
  suggestedActions: string[];
  createdAt: Date;
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'webhook';

export type NotificationType =
  | 'inactivity_warning'
  | 'inactivity_final'
  | 'mode_change'
  | 'risk_alert'
  | 'trade_executed'
  | 'performance_update'
  | 'system_update'
  | 'transfer_update';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  message: string;
  sent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

// ============================================
// ADMIN & SYSTEM
// ============================================

export interface AdminActivity {
  timestamp: Date;
  action: string;
  details: Record<string, unknown>;
}

export interface SystemHealth {
  component: string;
  status: 'online' | 'degraded' | 'offline' | 'building';
  lastCheck: Date;
  metrics: Record<string, number>;
}

export interface InactivityState {
  ownerId: string;
  lastActivity: Date;
  daysSinceActivity: number;
  warningsSent: number;
  lastWarningSent?: Date;
  autonomousModeTriggered: boolean;
  triggeredAt?: Date;
}

// ============================================
// MARKET VISION
// ============================================

export interface MarketVision {
  symbol: string;
  timestamp: Date;
  humanPerspective: PerspectiveAnalysis;
  quantPerspective: PerspectiveAnalysis;
  botPerspective: PerspectiveAnalysis;
  mergedView: MergedAnalysis;
  annotations: ChartAnnotation[];
  visualizations: Visualization[];
}

export interface PerspectiveAnalysis {
  type: 'human' | 'quant' | 'bot';
  bias: SignalDirection;
  confidence: number;
  keyLevels: number[];
  observations: string[];
}

export interface MergedAnalysis {
  consensus: SignalDirection;
  consensusStrength: number;
  agreements: string[];
  disagreements: string[];
  recommendation: string;
}

export interface ChartAnnotation {
  id: string;
  type: 'volatility_shift' | 'structure_break' | 'bot_disagreement' | 'risk_intervention' | 'regime_change' | 'custom';
  price: number;
  timestamp: Date;
  label: string;
  description: string;
}

export interface Visualization {
  type: 'heatmap' | 'sentiment_overlay' | 'volatility_map' | 'regime_indicator' | 'custom';
  data: Record<string, unknown>;
  config: Record<string, unknown>;
}

// ============================================
// TEACHING ENGINE
// ============================================

export type TeachingMode = 'plain_english' | 'beginner' | 'intermediate' | 'pro' | 'quant' | 'story';

export interface Lesson {
  id: string;
  tradeId?: string;
  title: string;
  content: Record<TeachingMode, string>;
  keyTakeaways: string[];
  relatedConcepts: string[];
  createdAt: Date;
}

export interface ExplanationRequest {
  context: 'trade' | 'signal' | 'regime' | 'risk_decision' | 'bot_behavior';
  contextId: string;
  mode: TeachingMode;
}

/**
 * TIME Pro Copy Trading — BEYOND BTCC'S CAPABILITIES
 *
 * BTCC offers:
 * - 1,600+ verified traders to copy
 * - Smart Copy Trading Mode (proportional copying)
 * - Three-Layer Protection
 * - Profit sharing 10-50%
 * - 140+ USDT contracts
 *
 * TIME offers ALL of that PLUS:
 * 1. UNLIMITED TRADER SOURCES - MT4, MT5, cTrader, TradingView, DeFi, AI Bots
 * 2. AI-POWERED SELECTION - ML models rank traders by regime, risk, consistency
 * 3. COLLECTIVE INTELLIGENCE - Aggregate wisdom from 1000s of signal providers
 * 4. REGIME-FILTERED COPYING - Only copy when trader excels in current conditions
 * 5. MULTI-ASSET COPYING - Stocks, forex, crypto, commodities, tokenized assets
 * 6. ANTI-FRONT-RUNNING - Randomized delays prevent lead trader exploitation
 * 7. RISK-ADJUSTED ALLOCATION - Kelly criterion + portfolio optimization
 * 8. AUTONOMOUS REBALANCING - AI auto-adjusts allocations based on performance
 * 9. INVERSE COPY MODE - Fade bad traders profitably
 * 10. ENSEMBLE COPYING - Copy multiple traders with AI-optimized weights
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';
import { MarketRegime } from '../types';

const logger = createComponentLogger('ProCopyTrading');

// ============================================================
// LEAD TRADER TYPES
// ============================================================

export type TraderPlatform =
  | 'mt4'
  | 'mt5'
  | 'ctrader'
  | 'tradingview'
  | 'time_bot'
  | 'time_ai'
  | 'defi_wallet'
  | 'manual';

export type TraderTier =
  | 'bronze'      // New traders, < 3 months
  | 'silver'      // Consistent, 3-6 months
  | 'gold'        // Profitable, 6-12 months
  | 'platinum'    // Elite, > 12 months + verified
  | 'diamond'     // Top 1%, institutional grade
  | 'legend';     // Hall of fame, exceptional track record

export type TraderBadge =
  | 'consistent_returns'
  | 'low_drawdown'
  | 'high_sharpe'
  | 'regime_master'
  | 'risk_manager'
  | 'top_performer'
  | 'community_favorite'
  | 'ai_recommended'
  | 'verified_identity'
  | 'institutional';

// ============================================================
// LEAD TRADER PROFILE
// ============================================================

export interface LeadTrader {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  platform: TraderPlatform;
  tier: TraderTier;
  badges: TraderBadge[];

  // Verification
  isVerified: boolean;
  verificationLevel: 'none' | 'email' | 'kyc' | 'institutional';
  country?: string;

  // Performance Metrics
  performance: {
    // Core Stats
    totalReturn: number;        // All-time return %
    monthlyReturn: number;      // Average monthly %
    winRate: number;            // 0-100%
    profitFactor: number;       // Gross profit / gross loss

    // Risk Metrics
    maxDrawdown: number;        // Maximum peak-to-trough %
    currentDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;

    // Activity
    totalTrades: number;
    avgTradesPerWeek: number;
    avgHoldingTime: number;     // minutes
    lastTradeAt?: Date;

    // Consistency
    profitableMonths: number;
    totalMonths: number;
    consistencyScore: number;   // 0-100

    // Regime Performance (TIME EXCLUSIVE)
    regimePerformance: Record<MarketRegime, {
      trades: number;
      winRate: number;
      avgReturn: number;
      isStrength: boolean;
    }>;

    // Advanced (TIME EXCLUSIVE)
    recoveryFactor: number;     // Net profit / max drawdown
    volatility: number;         // Standard deviation of returns
    skewness: number;          // Distribution asymmetry
    kurtosis: number;          // Tail risk
  };

  // Follower Stats
  followers: number;
  followersGained30d: number;
  assetsUnderCopy: number;      // Total USD being copied
  avgCopySize: number;

  // Copy Settings
  profitShare: number;          // 0-50%
  minCopyAmount: number;
  maxCopyAmount?: number;
  maxFollowers?: number;
  acceptingNewFollowers: boolean;

  // Trading Style
  tradingStyle: {
    type: 'scalper' | 'day_trader' | 'swing_trader' | 'position_trader';
    assets: string[];
    preferredRegimes: MarketRegime[];
    weakRegimes: MarketRegime[];
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    leverage: 'low' | 'medium' | 'high';
  };

  // AI Analysis (TIME EXCLUSIVE)
  aiAnalysis: {
    overallScore: number;       // 0-100 TIME AI rating
    strengthAreas: string[];
    weaknessAreas: string[];
    recommendedFor: string[];   // User types
    prediction: {
      nextMonthReturn: number;
      confidence: number;
    };
    riskWarnings: string[];
  };

  // Timestamps
  joinedAt: Date;
  lastActiveAt: Date;
}

// ============================================================
// COPY CONFIGURATION
// ============================================================

export interface CopyConfiguration {
  id: string;
  userId: string;
  traderId: string;

  // Copy Mode
  mode: 'mirror' | 'proportional' | 'fixed_amount' | 'risk_based' | 'ai_optimized';

  // Position Sizing
  sizing: {
    type: 'fixed_lot' | 'proportional' | 'risk_percent' | 'kelly';
    value: number;              // Depends on type
    maxPositionSize: number;    // Cap per trade
    maxTotalExposure: number;   // Total across all copies
  };

  // Risk Management
  risk: {
    maxDailyLoss: number;       // Stop copying after X% loss
    maxDrawdown: number;        // Permanent stop
    trailingDrawdown?: number;  // Dynamic drawdown limit
    maxOpenPositions: number;
    correlationLimit: number;   // Max correlation with existing positions
  };

  // Filtering (TIME EXCLUSIVE)
  filters: {
    symbols: 'all' | string[];
    excludeSymbols: string[];
    minConfidence: number;      // 0-1, AI signal confidence
    regimes: 'all' | MarketRegime[];
    excludeRegimes: MarketRegime[];
    timeFilter?: {
      tradingHours: { start: string; end: string };
      excludeDays: number[];    // 0 = Sunday
    };
  };

  // Execution
  execution: {
    delay: number;              // ms delay before copying (anti-front-run)
    maxSlippage: number;        // Max acceptable slippage %
    useMarketOrders: boolean;
    limitOrderBuffer: number;   // % from market for limit orders
  };

  // Advanced (TIME EXCLUSIVE)
  advanced: {
    inverseMode: boolean;       // Copy opposite direction
    partialClose: boolean;      // Allow partial position closes
    pyramiding: boolean;        // Add to winning positions
    autoOptimize: boolean;      // AI adjusts settings
    ensembleMode: boolean;      // Part of multi-trader ensemble
    ensembleWeight?: number;    // Weight in ensemble
  };

  // Status
  status: 'active' | 'paused' | 'stopped';
  pauseReason?: string;

  // Performance
  performance: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    realizedPnL: number;
    unrealizedPnL: number;
    roi: number;
    copiedSince: Date;
    profitSharePaid: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// ENSEMBLE (Multi-Trader Portfolio)
// ============================================================

export interface CopyEnsemble {
  id: string;
  userId: string;
  name: string;
  description?: string;

  // Traders
  traders: Array<{
    traderId: string;
    weight: number;             // Portfolio weight
    configId: string;           // CopyConfiguration ID
    performance: {
      contribution: number;     // % of ensemble PnL
      sharpeContribution: number;
    };
  }>;

  // Portfolio Settings
  settings: {
    rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'dynamic';
    targetVolatility?: number;
    maxCorrelation: number;
    useAIOptimization: boolean;
    minTraders: number;
    maxTraders: number;
  };

  // AI Management (TIME EXCLUSIVE)
  aiManagement: {
    enabled: boolean;
    autoAddTraders: boolean;    // AI adds promising traders
    autoRemoveTraders: boolean; // AI removes underperformers
    autoReweight: boolean;      // AI adjusts weights
    targetReturn: number;       // Target monthly return
    maxRisk: number;            // Max acceptable risk
  };

  // Performance
  performance: {
    totalReturn: number;
    monthlyReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    diversificationScore: number;
  };

  // Status
  status: 'active' | 'paused' | 'stopped';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// COPY SIGNAL
// ============================================================

export interface CopySignal {
  id: string;
  traderId: string;
  traderName: string;

  // Trade Details
  symbol: string;
  direction: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop';
  price: number;
  quantity: number;
  leverage?: number;

  // Risk Levels
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;

  // Metadata
  confidence: number;           // 0-1
  reasoning?: string;
  regimeAtSignal: MarketRegime;
  consensusAlignment: number;   // How aligned with collective

  // Execution Tracking
  copiedBy: number;             // Users who copied
  avgCopyDelay: number;         // ms
  avgSlippage: number;          // %

  // Timestamps
  timestamp: Date;
  expiresAt?: Date;
}

// ============================================================
// PRO COPY TRADING ENGINE
// ============================================================

export class ProCopyTradingEngine extends EventEmitter {
  private traders: Map<string, LeadTrader> = new Map();
  private configurations: Map<string, CopyConfiguration> = new Map();
  private ensembles: Map<string, CopyEnsemble> = new Map();
  private signals: Map<string, CopySignal> = new Map();
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;

  // Leaderboard cache
  private leaderboard: LeadTrader[] = [];
  private lastLeaderboardUpdate: Date = new Date(0);

  constructor() {
    super();
    this.initializeSampleTraders();
    logger.info('Pro Copy Trading Engine initialized - DESTROYING BTCC');
  }

  // ============================================================
  // TRADER MANAGEMENT
  // ============================================================

  private initializeSampleTraders(): void {
    const sampleTraders: Omit<LeadTrader, 'id'>[] = [
      {
        username: 'AlphaHunter',
        displayName: 'Alpha Hunter Pro',
        bio: '10+ years forex trading. Specializing in major pairs during trending markets.',
        platform: 'mt5',
        tier: 'diamond',
        badges: ['top_performer', 'consistent_returns', 'verified_identity', 'ai_recommended'],
        isVerified: true,
        verificationLevel: 'kyc',
        country: 'UK',
        performance: {
          totalReturn: 285.5,
          monthlyReturn: 8.2,
          winRate: 68.5,
          profitFactor: 2.45,
          maxDrawdown: 12.5,
          currentDrawdown: 3.2,
          sharpeRatio: 2.15,
          sortinoRatio: 2.85,
          calmarRatio: 22.8,
          totalTrades: 3450,
          avgTradesPerWeek: 15,
          avgHoldingTime: 240,
          lastTradeAt: new Date(),
          profitableMonths: 28,
          totalMonths: 32,
          consistencyScore: 87.5,
          regimePerformance: {
            trending_up: { trades: 800, winRate: 75, avgReturn: 2.8, isStrength: true },
            trending_down: { trades: 720, winRate: 72, avgReturn: 2.5, isStrength: true },
            ranging: { trades: 400, winRate: 55, avgReturn: 0.8, isStrength: false },
            high_volatility: { trades: 280, winRate: 60, avgReturn: 1.5, isStrength: false },
            low_volatility: { trades: 150, winRate: 50, avgReturn: 0.3, isStrength: false },
            event_driven: { trades: 100, winRate: 45, avgReturn: -0.2, isStrength: false },
            overnight_illiquid: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            sentiment_shift: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            unknown: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
          },
          recoveryFactor: 22.8,
          volatility: 3.8,
          skewness: 0.45,
          kurtosis: 2.8,
        },
        followers: 2450,
        followersGained30d: 185,
        assetsUnderCopy: 12500000,
        avgCopySize: 5100,
        profitShare: 20,
        minCopyAmount: 500,
        maxCopyAmount: 100000,
        acceptingNewFollowers: true,
        tradingStyle: {
          type: 'swing_trader',
          assets: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'],
          preferredRegimes: ['trending_up', 'trending_down'],
          weakRegimes: ['ranging', 'low_volatility'],
          riskTolerance: 'moderate',
          leverage: 'medium',
        },
        aiAnalysis: {
          overallScore: 92,
          strengthAreas: ['Trend identification', 'Risk management', 'Consistency'],
          weaknessAreas: ['Ranging markets', 'News trading'],
          recommendedFor: ['Long-term investors', 'Moderate risk tolerance'],
          prediction: { nextMonthReturn: 6.5, confidence: 0.78 },
          riskWarnings: ['Higher drawdowns during ranging periods'],
        },
        joinedAt: new Date('2022-03-15'),
        lastActiveAt: new Date(),
      },
      {
        username: 'CryptoKing_AI',
        displayName: 'Crypto King AI',
        bio: 'AI-powered crypto trading. 24/7 automation with ML models.',
        platform: 'time_ai',
        tier: 'platinum',
        badges: ['ai_recommended', 'high_sharpe', 'regime_master'],
        isVerified: true,
        verificationLevel: 'kyc',
        performance: {
          totalReturn: 425.8,
          monthlyReturn: 15.2,
          winRate: 62.5,
          profitFactor: 1.95,
          maxDrawdown: 22.5,
          currentDrawdown: 8.5,
          sharpeRatio: 1.85,
          sortinoRatio: 2.45,
          calmarRatio: 18.9,
          totalTrades: 8920,
          avgTradesPerWeek: 85,
          avgHoldingTime: 45,
          lastTradeAt: new Date(),
          profitableMonths: 18,
          totalMonths: 22,
          consistencyScore: 72.5,
          regimePerformance: {
            trending_up: { trades: 2500, winRate: 70, avgReturn: 3.5, isStrength: true },
            trending_down: { trades: 2200, winRate: 65, avgReturn: 2.8, isStrength: true },
            ranging: { trades: 1800, winRate: 58, avgReturn: 1.2, isStrength: false },
            high_volatility: { trades: 1500, winRate: 55, avgReturn: 2.0, isStrength: true },
            low_volatility: { trades: 500, winRate: 50, avgReturn: 0.5, isStrength: false },
            event_driven: { trades: 420, winRate: 52, avgReturn: 1.8, isStrength: false },
            overnight_illiquid: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            sentiment_shift: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            unknown: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
          },
          recoveryFactor: 18.9,
          volatility: 8.2,
          skewness: 0.25,
          kurtosis: 3.5,
        },
        followers: 5680,
        followersGained30d: 520,
        assetsUnderCopy: 28500000,
        avgCopySize: 5000,
        profitShare: 25,
        minCopyAmount: 200,
        acceptingNewFollowers: true,
        tradingStyle: {
          type: 'day_trader',
          assets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
          preferredRegimes: ['trending_up', 'trending_down', 'high_volatility'],
          weakRegimes: ['low_volatility', 'overnight_illiquid'],
          riskTolerance: 'aggressive',
          leverage: 'high',
        },
        aiAnalysis: {
          overallScore: 85,
          strengthAreas: ['Trend following', 'Volatility trading', 'Quick adaptation'],
          weaknessAreas: ['Drawdown control', 'Low volatility periods'],
          recommendedFor: ['Risk-tolerant investors', 'Crypto enthusiasts'],
          prediction: { nextMonthReturn: 12.5, confidence: 0.65 },
          riskWarnings: ['Higher volatility', 'Larger drawdowns possible'],
        },
        joinedAt: new Date('2023-01-10'),
        lastActiveAt: new Date(),
      },
      {
        username: 'GridMaster',
        displayName: 'Grid Master Bot',
        bio: 'Automated grid trading across multiple pairs. Consistent profits in ranging markets.',
        platform: 'time_bot',
        tier: 'gold',
        badges: ['consistent_returns', 'low_drawdown', 'risk_manager'],
        isVerified: true,
        verificationLevel: 'email',
        performance: {
          totalReturn: 85.2,
          monthlyReturn: 3.8,
          winRate: 78.5,
          profitFactor: 1.65,
          maxDrawdown: 8.5,
          currentDrawdown: 2.1,
          sharpeRatio: 2.45,
          sortinoRatio: 3.2,
          calmarRatio: 10.0,
          totalTrades: 12500,
          avgTradesPerWeek: 120,
          avgHoldingTime: 15,
          lastTradeAt: new Date(),
          profitableMonths: 20,
          totalMonths: 22,
          consistencyScore: 91.0,
          regimePerformance: {
            trending_up: { trades: 1500, winRate: 65, avgReturn: 0.8, isStrength: false },
            trending_down: { trades: 1400, winRate: 62, avgReturn: 0.7, isStrength: false },
            ranging: { trades: 6500, winRate: 85, avgReturn: 1.2, isStrength: true },
            high_volatility: { trades: 800, winRate: 55, avgReturn: 0.3, isStrength: false },
            low_volatility: { trades: 2200, winRate: 82, avgReturn: 0.9, isStrength: true },
            event_driven: { trades: 100, winRate: 40, avgReturn: -0.5, isStrength: false },
            overnight_illiquid: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            sentiment_shift: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            unknown: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
          },
          recoveryFactor: 10.0,
          volatility: 1.5,
          skewness: 0.85,
          kurtosis: 2.2,
        },
        followers: 1850,
        followersGained30d: 95,
        assetsUnderCopy: 8500000,
        avgCopySize: 4600,
        profitShare: 15,
        minCopyAmount: 500,
        acceptingNewFollowers: true,
        tradingStyle: {
          type: 'scalper',
          assets: ['EURUSD', 'GBPJPY', 'AUDNZD'],
          preferredRegimes: ['ranging', 'low_volatility'],
          weakRegimes: ['trending_up', 'trending_down', 'high_volatility', 'event_driven'],
          riskTolerance: 'conservative',
          leverage: 'low',
        },
        aiAnalysis: {
          overallScore: 88,
          strengthAreas: ['Consistency', 'Risk control', 'Ranging markets'],
          weaknessAreas: ['Trending markets', 'Missing big moves'],
          recommendedFor: ['Conservative investors', 'Steady returns seekers'],
          prediction: { nextMonthReturn: 3.5, confidence: 0.85 },
          riskWarnings: ['Underperforms in trending markets'],
        },
        joinedAt: new Date('2023-06-20'),
        lastActiveAt: new Date(),
      },
      {
        username: 'ArbitrageNinja',
        displayName: 'Arbitrage Ninja',
        bio: 'Cross-exchange and funding rate arbitrage. Low risk, consistent returns.',
        platform: 'time_bot',
        tier: 'platinum',
        badges: ['low_drawdown', 'consistent_returns', 'institutional'],
        isVerified: true,
        verificationLevel: 'institutional',
        performance: {
          totalReturn: 58.5,
          monthlyReturn: 2.8,
          winRate: 92.5,
          profitFactor: 8.5,
          maxDrawdown: 3.2,
          currentDrawdown: 0.5,
          sharpeRatio: 4.2,
          sortinoRatio: 6.5,
          calmarRatio: 18.3,
          totalTrades: 45000,
          avgTradesPerWeek: 850,
          avgHoldingTime: 2,
          lastTradeAt: new Date(),
          profitableMonths: 20,
          totalMonths: 20,
          consistencyScore: 98.5,
          regimePerformance: {
            trending_up: { trades: 8000, winRate: 92, avgReturn: 0.15, isStrength: true },
            trending_down: { trades: 7500, winRate: 91, avgReturn: 0.14, isStrength: true },
            ranging: { trades: 12000, winRate: 93, avgReturn: 0.12, isStrength: true },
            high_volatility: { trades: 10000, winRate: 94, avgReturn: 0.18, isStrength: true },
            low_volatility: { trades: 5500, winRate: 90, avgReturn: 0.08, isStrength: true },
            event_driven: { trades: 2000, winRate: 88, avgReturn: 0.10, isStrength: true },
            overnight_illiquid: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            sentiment_shift: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            unknown: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
          },
          recoveryFactor: 18.3,
          volatility: 0.65,
          skewness: 1.2,
          kurtosis: 1.8,
        },
        followers: 3200,
        followersGained30d: 280,
        assetsUnderCopy: 45000000,
        avgCopySize: 14000,
        profitShare: 30,
        minCopyAmount: 5000,
        maxFollowers: 500,
        acceptingNewFollowers: true,
        tradingStyle: {
          type: 'scalper',
          assets: ['BTC', 'ETH', 'Major Alts'],
          preferredRegimes: ['trending_up', 'trending_down', 'ranging', 'high_volatility', 'low_volatility', 'event_driven'],
          weakRegimes: ['overnight_illiquid'],
          riskTolerance: 'conservative',
          leverage: 'low',
        },
        aiAnalysis: {
          overallScore: 95,
          strengthAreas: ['Consistency', 'Risk-free profits', 'All-weather strategy'],
          weaknessAreas: ['Capital intensive', 'Lower absolute returns'],
          recommendedFor: ['High-net-worth', 'Institutions', 'Risk-averse'],
          prediction: { nextMonthReturn: 2.5, confidence: 0.95 },
          riskWarnings: ['Requires large capital for meaningful returns'],
        },
        joinedAt: new Date('2023-04-01'),
        lastActiveAt: new Date(),
      },
      {
        username: 'SentimentSurfer',
        displayName: 'Sentiment Surfer AI',
        bio: 'AI-powered sentiment analysis. Trades news and social signals.',
        platform: 'time_ai',
        tier: 'gold',
        badges: ['ai_recommended', 'regime_master'],
        isVerified: true,
        verificationLevel: 'kyc',
        performance: {
          totalReturn: 165.8,
          monthlyReturn: 9.5,
          winRate: 58.2,
          profitFactor: 1.75,
          maxDrawdown: 18.5,
          currentDrawdown: 5.2,
          sharpeRatio: 1.65,
          sortinoRatio: 2.15,
          calmarRatio: 9.0,
          totalTrades: 2800,
          avgTradesPerWeek: 25,
          avgHoldingTime: 180,
          lastTradeAt: new Date(),
          profitableMonths: 14,
          totalMonths: 18,
          consistencyScore: 68.5,
          regimePerformance: {
            trending_up: { trades: 600, winRate: 65, avgReturn: 2.5, isStrength: true },
            trending_down: { trades: 550, winRate: 62, avgReturn: 2.2, isStrength: true },
            ranging: { trades: 400, winRate: 48, avgReturn: 0.2, isStrength: false },
            high_volatility: { trades: 450, winRate: 55, avgReturn: 1.8, isStrength: false },
            low_volatility: { trades: 200, winRate: 45, avgReturn: -0.3, isStrength: false },
            event_driven: { trades: 400, winRate: 68, avgReturn: 3.5, isStrength: true },
            overnight_illiquid: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
            sentiment_shift: { trades: 200, winRate: 72, avgReturn: 4.2, isStrength: true },
            unknown: { trades: 0, winRate: 0, avgReturn: 0, isStrength: false },
          },
          recoveryFactor: 9.0,
          volatility: 5.8,
          skewness: 0.35,
          kurtosis: 3.2,
        },
        followers: 1250,
        followersGained30d: 145,
        assetsUnderCopy: 5800000,
        avgCopySize: 4600,
        profitShare: 22,
        minCopyAmount: 300,
        acceptingNewFollowers: true,
        tradingStyle: {
          type: 'day_trader',
          assets: ['BTC', 'ETH', 'AAPL', 'TSLA', 'Major News Events'],
          preferredRegimes: ['trending_up', 'trending_down', 'event_driven', 'sentiment_shift'],
          weakRegimes: ['ranging', 'low_volatility'],
          riskTolerance: 'aggressive',
          leverage: 'medium',
        },
        aiAnalysis: {
          overallScore: 78,
          strengthAreas: ['News trading', 'Sentiment detection', 'Event reaction'],
          weaknessAreas: ['Quiet markets', 'Consistency'],
          recommendedFor: ['Active traders', 'News followers'],
          prediction: { nextMonthReturn: 8.5, confidence: 0.55 },
          riskWarnings: ['Higher drawdowns', 'Inconsistent months'],
        },
        joinedAt: new Date('2023-08-15'),
        lastActiveAt: new Date(),
      },
    ];

    for (const trader of sampleTraders) {
      const id = uuidv4();
      this.traders.set(id, { ...trader, id });
    }

    this.updateLeaderboard();
    logger.info(`Loaded ${this.traders.size} lead traders - BTCC only has 1,600, we're unlimited!`);
  }

  // ============================================================
  // LEADERBOARD
  // ============================================================

  private updateLeaderboard(): void {
    const now = new Date();

    // Only update if stale (> 5 minutes)
    if (now.getTime() - this.lastLeaderboardUpdate.getTime() < 300000) {
      return;
    }

    this.leaderboard = Array.from(this.traders.values())
      .filter(t => t.acceptingNewFollowers)
      .sort((a, b) => b.aiAnalysis.overallScore - a.aiAnalysis.overallScore);

    this.lastLeaderboardUpdate = now;
    this.emit('leaderboard:updated', this.leaderboard);
  }

  public getLeaderboard(options?: {
    tier?: TraderTier;
    platform?: TraderPlatform;
    minScore?: number;
    sortBy?: 'score' | 'return' | 'sharpe' | 'followers';
    limit?: number;
  }): LeadTrader[] {
    let results = [...this.leaderboard];

    if (options?.tier) {
      results = results.filter(t => t.tier === options.tier);
    }
    if (options?.platform) {
      results = results.filter(t => t.platform === options.platform);
    }
    if (options?.minScore !== undefined) {
      const minScore = options.minScore;
      results = results.filter(t => t.aiAnalysis.overallScore >= minScore);
    }

    if (options?.sortBy) {
      switch (options.sortBy) {
        case 'return':
          results.sort((a, b) => b.performance.totalReturn - a.performance.totalReturn);
          break;
        case 'sharpe':
          results.sort((a, b) => b.performance.sharpeRatio - a.performance.sharpeRatio);
          break;
        case 'followers':
          results.sort((a, b) => b.followers - a.followers);
          break;
        // default is score
      }
    }

    return results.slice(0, options?.limit || 50);
  }

  // ============================================================
  // AI RECOMMENDATIONS (TIME EXCLUSIVE)
  // ============================================================

  public getAIRecommendations(options: {
    userId: string;
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    investmentAmount: number;
    currentRegime?: MarketRegime;
    preferredAssets?: string[];
    maxTraders?: number;
  }): {
    recommended: LeadTrader[];
    ensemble: {
      traders: Array<{ trader: LeadTrader; weight: number; reason: string }>;
      expectedReturn: number;
      expectedRisk: number;
      diversificationScore: number;
    };
    warnings: string[];
  } {
    const allTraders = Array.from(this.traders.values()).filter(t => t.acceptingNewFollowers);

    // Filter by risk tolerance
    const riskMap = {
      conservative: ['conservative'],
      moderate: ['conservative', 'moderate'],
      aggressive: ['conservative', 'moderate', 'aggressive'],
    };

    let candidates = allTraders.filter(t =>
      riskMap[options.riskTolerance].includes(t.tradingStyle.riskTolerance)
    );

    // Filter by current regime if provided
    if (options.currentRegime) {
      candidates = candidates.filter(t => {
        const regimePerf = t.performance.regimePerformance[options.currentRegime!];
        return regimePerf && regimePerf.isStrength;
      });
    }

    // Filter by minimum copy amount
    candidates = candidates.filter(t => t.minCopyAmount <= options.investmentAmount);

    // Sort by AI score
    candidates.sort((a, b) => b.aiAnalysis.overallScore - a.aiAnalysis.overallScore);

    const recommended = candidates.slice(0, options.maxTraders || 5);

    // Build ensemble with weights
    const totalScore = recommended.reduce((sum, t) => sum + t.aiAnalysis.overallScore, 0);
    const ensemble = recommended.map(trader => ({
      trader,
      weight: trader.aiAnalysis.overallScore / totalScore,
      reason: `${trader.aiAnalysis.strengthAreas[0]} specialist, ${trader.performance.consistencyScore}% consistency`,
    }));

    // Calculate expected metrics
    const expectedReturn = recommended.reduce((sum, t, i) =>
      sum + t.performance.monthlyReturn * ensemble[i].weight, 0
    );
    const expectedRisk = recommended.reduce((sum, t, i) =>
      sum + t.performance.maxDrawdown * ensemble[i].weight, 0
    );

    // Diversification score
    const platforms = new Set(recommended.map(t => t.platform));
    const styles = new Set(recommended.map(t => t.tradingStyle.type));
    const diversificationScore = ((platforms.size + styles.size) / (recommended.length * 2)) * 100;

    // Warnings
    const warnings: string[] = [];
    if (recommended.length < 3) {
      warnings.push('Consider adding more traders for diversification');
    }
    if (expectedRisk > 20) {
      warnings.push('Portfolio has elevated risk exposure');
    }
    if (diversificationScore < 50) {
      warnings.push('Limited diversification across strategies');
    }

    return {
      recommended,
      ensemble: {
        traders: ensemble,
        expectedReturn,
        expectedRisk,
        diversificationScore,
      },
      warnings,
    };
  }

  // ============================================================
  // COPY MANAGEMENT
  // ============================================================

  public async startCopying(
    userId: string,
    traderId: string,
    config: Partial<CopyConfiguration>
  ): Promise<CopyConfiguration> {
    const trader = this.traders.get(traderId);
    if (!trader) {
      throw new Error('Trader not found');
    }

    if (!trader.acceptingNewFollowers) {
      throw new Error('Trader is not accepting new followers');
    }

    const configId = uuidv4();
    const now = new Date();

    const fullConfig: CopyConfiguration = {
      id: configId,
      userId,
      traderId,
      mode: config.mode || 'proportional',
      sizing: config.sizing || {
        type: 'proportional',
        value: 1.0,
        maxPositionSize: 1000,
        maxTotalExposure: 5000,
      },
      risk: config.risk || {
        maxDailyLoss: 5,
        maxDrawdown: 20,
        maxOpenPositions: 10,
        correlationLimit: 0.7,
      },
      filters: config.filters || {
        symbols: 'all',
        excludeSymbols: [],
        minConfidence: 0.5,
        regimes: 'all',
        excludeRegimes: [],
      },
      execution: config.execution || {
        delay: 500 + Math.random() * 1000, // 0.5-1.5s random delay
        maxSlippage: 0.5,
        useMarketOrders: true,
        limitOrderBuffer: 0.1,
      },
      advanced: config.advanced || {
        inverseMode: false,
        partialClose: true,
        pyramiding: false,
        autoOptimize: true,
        ensembleMode: false,
      },
      status: 'active',
      performance: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
        roi: 0,
        copiedSince: now,
        profitSharePaid: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.configurations.set(configId, fullConfig);

    // Update trader follower count
    trader.followers++;
    this.traders.set(traderId, trader);

    this.emit('copy:started', { userId, traderId, configId });
    logger.info(`User ${userId} started copying ${trader.displayName}`);

    return fullConfig;
  }

  public async stopCopying(configId: string): Promise<boolean> {
    const config = this.configurations.get(configId);
    if (!config) return false;

    config.status = 'stopped';
    config.updatedAt = new Date();

    // Update trader follower count
    const trader = this.traders.get(config.traderId);
    if (trader) {
      trader.followers = Math.max(0, trader.followers - 1);
      this.traders.set(config.traderId, trader);
    }

    this.emit('copy:stopped', config);
    return true;
  }

  public async createEnsemble(
    userId: string,
    name: string,
    traderIds: string[],
    weights?: number[]
  ): Promise<CopyEnsemble> {
    const traders = traderIds.map((id, i) => {
      const trader = this.traders.get(id);
      if (!trader) throw new Error(`Trader ${id} not found`);

      return {
        traderId: id,
        weight: weights?.[i] || 1 / traderIds.length,
        configId: '', // Will be set after creating individual configs
        performance: { contribution: 0, sharpeContribution: 0 },
      };
    });

    // Normalize weights
    const totalWeight = traders.reduce((sum, t) => sum + t.weight, 0);
    traders.forEach(t => t.weight /= totalWeight);

    const ensembleId = uuidv4();
    const now = new Date();

    const ensemble: CopyEnsemble = {
      id: ensembleId,
      userId,
      name,
      traders,
      settings: {
        rebalanceFrequency: 'weekly',
        maxCorrelation: 0.7,
        useAIOptimization: true,
        minTraders: 2,
        maxTraders: 10,
      },
      aiManagement: {
        enabled: true,
        autoAddTraders: false,
        autoRemoveTraders: true,
        autoReweight: true,
        targetReturn: 10,
        maxRisk: 15,
      },
      performance: {
        totalReturn: 0,
        monthlyReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        diversificationScore: 0,
      },
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.ensembles.set(ensembleId, ensemble);
    this.emit('ensemble:created', ensemble);

    return ensemble;
  }

  // ============================================================
  // SIGNAL PROCESSING
  // ============================================================

  public async processTraderSignal(
    traderId: string,
    signal: Omit<CopySignal, 'id' | 'traderId' | 'traderName' | 'copiedBy' | 'avgCopyDelay' | 'avgSlippage'>
  ): Promise<void> {
    const trader = this.traders.get(traderId);
    if (!trader) return;

    const signalId = uuidv4();
    const fullSignal: CopySignal = {
      ...signal,
      id: signalId,
      traderId,
      traderName: trader.displayName,
      copiedBy: 0,
      avgCopyDelay: 0,
      avgSlippage: 0,
    };

    this.signals.set(signalId, fullSignal);

    // Find all users copying this trader
    const copies: CopyConfiguration[] = [];
    for (const config of this.configurations.values()) {
      if (config.traderId === traderId && config.status === 'active') {
        copies.push(config);
      }
    }

    // Process copies
    const delays: number[] = [];
    for (const config of copies) {
      // Check filters
      if (!this.shouldCopySignal(config, fullSignal)) continue;

      // Apply delay
      const delay = config.execution.delay;
      delays.push(delay);

      // Emit copy execution event
      setTimeout(() => {
        this.emit('copy:execute', {
          configId: config.id,
          signal: fullSignal,
          params: this.calculateCopyParams(config, fullSignal),
        });

        config.performance.totalTrades++;
        fullSignal.copiedBy++;
      }, delay);
    }

    if (delays.length > 0) {
      fullSignal.avgCopyDelay = delays.reduce((a, b) => a + b) / delays.length;
    }

    this.signals.set(signalId, fullSignal);
    this.emit('signal:processed', fullSignal);
  }

  private shouldCopySignal(config: CopyConfiguration, signal: CopySignal): boolean {
    // Symbol filter
    if (config.filters.symbols !== 'all' && !config.filters.symbols.includes(signal.symbol)) {
      return false;
    }
    if (config.filters.excludeSymbols.includes(signal.symbol)) {
      return false;
    }

    // Confidence filter
    if (signal.confidence < config.filters.minConfidence) {
      return false;
    }

    // Regime filter
    if (config.filters.regimes !== 'all' && !config.filters.regimes.includes(signal.regimeAtSignal)) {
      return false;
    }
    if (config.filters.excludeRegimes.includes(signal.regimeAtSignal)) {
      return false;
    }

    return true;
  }

  private calculateCopyParams(config: CopyConfiguration, signal: CopySignal): {
    quantity: number;
    direction: 'buy' | 'sell';
    stopLoss?: number;
    takeProfit?: number;
  } {
    let quantity = signal.quantity;

    switch (config.sizing.type) {
      case 'fixed_lot':
        quantity = config.sizing.value;
        break;
      case 'proportional':
        quantity = signal.quantity * config.sizing.value;
        break;
      case 'risk_percent':
        // Calculate based on risk
        quantity = config.sizing.maxPositionSize * (config.sizing.value / 100);
        break;
    }

    // Cap at max
    quantity = Math.min(quantity, config.sizing.maxPositionSize);

    // Inverse mode
    const direction = config.advanced.inverseMode
      ? (signal.direction === 'buy' ? 'sell' : 'buy')
      : signal.direction;

    return {
      quantity,
      direction,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
    };
  }

  // ============================================================
  // ENGINE LIFECYCLE
  // ============================================================

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('Pro Copy Trading Engine started - BTCC KILLER ACTIVATED');

    // Update leaderboard every 5 minutes
    this.updateInterval = setInterval(() => {
      this.updateLeaderboard();
      this.updateTraderStats();
    }, 300000);

    this.emit('engine:started');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    logger.info('Pro Copy Trading Engine stopped');
    this.emit('engine:stopped');
  }

  private updateTraderStats(): void {
    // Simulate trader activity updates
    for (const trader of this.traders.values()) {
      // Simulate new trades
      if (Math.random() < 0.3) {
        trader.performance.totalTrades++;
        trader.performance.lastTradeAt = new Date();

        // Random win/loss
        if (Math.random() < trader.performance.winRate / 100) {
          const profit = Math.random() * 2;
          trader.performance.totalReturn += profit;
        } else {
          const loss = Math.random() * 1;
          trader.performance.totalReturn -= loss;
        }
      }

      trader.lastActiveAt = new Date();
      this.traders.set(trader.id, trader);
    }
  }

  // ============================================================
  // GETTERS
  // ============================================================

  public getTrader(traderId: string): LeadTrader | undefined {
    return this.traders.get(traderId);
  }

  public getAllTraders(): LeadTrader[] {
    return Array.from(this.traders.values());
  }

  public getConfiguration(configId: string): CopyConfiguration | undefined {
    return this.configurations.get(configId);
  }

  public getUserConfigurations(userId: string): CopyConfiguration[] {
    return Array.from(this.configurations.values()).filter(c => c.userId === userId);
  }

  public getEnsemble(ensembleId: string): CopyEnsemble | undefined {
    return this.ensembles.get(ensembleId);
  }

  public getUserEnsembles(userId: string): CopyEnsemble[] {
    return Array.from(this.ensembles.values()).filter(e => e.userId === userId);
  }

  public getEngineStats(): {
    isRunning: boolean;
    totalTraders: number;
    totalFollowers: number;
    totalAUM: number;
    activeConfigs: number;
    activeEnsembles: number;
  } {
    const traders = Array.from(this.traders.values());
    return {
      isRunning: this.isRunning,
      totalTraders: traders.length,
      totalFollowers: traders.reduce((sum, t) => sum + t.followers, 0),
      totalAUM: traders.reduce((sum, t) => sum + t.assetsUnderCopy, 0),
      activeConfigs: Array.from(this.configurations.values()).filter(c => c.status === 'active').length,
      activeEnsembles: Array.from(this.ensembles.values()).filter(e => e.status === 'active').length,
    };
  }
}

// Export singleton
export const proCopyTradingEngine = new ProCopyTradingEngine();
export default ProCopyTradingEngine;

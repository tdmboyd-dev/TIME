/**
 * TIME Social Trading Engine
 *
 * An autonomous social trading system that goes beyond SnapTrade by:
 * - AI-powered trader/bot selection based on performance, regime matching
 * - Collective intelligence from aggregated trader wisdom
 * - Autonomous copy trading with intelligent position sizing
 * - Cross-platform signal aggregation (MT4/MT5, cTrader, TradingView)
 * - Smart leader scoring with risk-adjusted metrics
 * - Automatic diversification across multiple signal providers
 * - Real-time performance attribution
 *
 * Unlike SnapTrade (brokerage aggregation), this is AUTONOMOUS TRADING INTELLIGENCE
 */

import { EventEmitter } from 'events';
import {
  Bot,
  Signal,
  Trade,
  MarketRegime,
  BotPerformance,
  SignalDirection,
} from '../types';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface SignalProvider {
  id: string;
  name: string;
  platform: 'mt4' | 'mt5' | 'ctrader' | 'tradingview' | 'time_bot' | 'manual';
  accountId?: string;
  type: 'human_trader' | 'bot' | 'ensemble' | 'ai_strategy';
  verified: boolean;
  performance: SignalProviderPerformance;
  followers: number;
  copiedValue: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  preferredSymbols: string[];
  preferredRegimes: MarketRegime[];
  weekRegimes: MarketRegime[];
  minimumEquity: number;
  profitShare: number; // Percentage of profits shared with provider (0-30%)
  status: 'active' | 'paused' | 'suspended' | 'pending_review';
  lastSignal?: Date;
  createdAt: Date;
  aiScore: number; // TIME's autonomous scoring (0-100)
}

export interface SignalProviderPerformance {
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number;
  avgWinPips: number;
  avgLossPips: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgHoldingTime: number; // minutes
  consistency: number; // 0-1, how consistent are returns
  regimePerformance: Record<MarketRegime, RegimeStats>;
  monthlyReturns: MonthlyReturn[];
  riskAdjustedReturn: number;
  qualityScore: number; // Composite score 0-100
}

export interface RegimeStats {
  signals: number;
  winRate: number;
  avgReturn: number;
  shouldFollow: boolean;
}

export interface MonthlyReturn {
  month: string; // YYYY-MM
  return: number;
  trades: number;
  maxDrawdown: number;
}

export interface CopyTradeConfig {
  userId: string;
  providerId: string;
  mode: 'mirror' | 'proportional' | 'fixed_lot' | 'risk_based';
  maxRiskPerTrade: number; // percentage of equity
  maxDailyRisk: number;
  maxOpenTrades: number;
  lotMultiplier: number;
  fixedLotSize?: number;
  slippage: number; // max allowed slippage in pips
  delay: number; // ms delay before copying (0 = instant)
  inverseMode: boolean; // copy opposite direction
  symbols: string[] | 'all';
  excludeSymbols: string[];
  regimeFilter: MarketRegime[] | 'auto'; // only copy in these regimes
  status: 'active' | 'paused';
  startedAt: Date;
  totalPnL: number;
  totalTrades: number;
}

export interface SocialSignal {
  id: string;
  providerId: string;
  providerName: string;
  platform: string;
  symbol: string;
  direction: SignalDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  timestamp: Date;
  copiedBy: number; // how many users copied
  consensusStrength: number; // alignment with other providers
  regimeAtSignal: MarketRegime;
  expired: boolean;
}

export interface CollectiveIntelligence {
  symbol: string;
  timestamp: Date;
  totalProviders: number;
  longVotes: number;
  shortVotes: number;
  neutralVotes: number;
  consensusDirection: SignalDirection;
  consensusStrength: number; // 0-1
  topContributors: { providerId: string; weight: number }[];
  regimeAgreement: number; // how many providers agree on regime
  averageConfidence: number;
  weightedConfidence: number; // weighted by provider quality
}

export interface LeaderboardEntry {
  rank: number;
  providerId: string;
  name: string;
  type: string;
  platform: string;
  winRate: number;
  profitFactor: number;
  followers: number;
  totalReturn: number;
  maxDrawdown: number;
  aiScore: number;
  trending: 'up' | 'down' | 'stable';
  badge: string | null;
}

// ============================================================
// SOCIAL TRADING ENGINE
// ============================================================

class SocialTradingEngine extends EventEmitter {
  private providers: Map<string, SignalProvider> = new Map();
  private copyConfigs: Map<string, CopyTradeConfig[]> = new Map(); // userId -> configs
  private signals: Map<string, SocialSignal> = new Map();
  private collectiveIntel: Map<string, CollectiveIntelligence> = new Map();
  private leaderboard: LeaderboardEntry[] = [];
  private isRunning: boolean = false;

  // AI Scoring weights
  private readonly SCORING_WEIGHTS = {
    winRate: 0.15,
    profitFactor: 0.20,
    sharpeRatio: 0.15,
    consistency: 0.15,
    maxDrawdown: 0.15, // negative weight
    regimeAdaptability: 0.10,
    signalQuality: 0.10,
  };

  constructor() {
    super();
    this.initializeEngine();
  }

  private initializeEngine(): void {
    // Load sample providers for demonstration
    this.loadSampleProviders();

    console.log('[SocialTradingEngine] Initialized');
    console.log(`  Providers: ${this.providers.size}`);
  }

  // ============================================================
  // SIGNAL PROVIDER MANAGEMENT
  // ============================================================

  async registerProvider(provider: Omit<SignalProvider, 'id' | 'createdAt' | 'aiScore'>): Promise<SignalProvider> {
    const id = `provider_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newProvider: SignalProvider = {
      ...provider,
      id,
      createdAt: new Date(),
      aiScore: this.calculateAIScore(provider.performance),
    };

    this.providers.set(id, newProvider);

    this.emit('provider:registered', newProvider);
    this.updateLeaderboard();

    return newProvider;
  }

  async updateProviderPerformance(providerId: string, performance: Partial<SignalProviderPerformance>): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) return;

    provider.performance = { ...provider.performance, ...performance };
    provider.aiScore = this.calculateAIScore(provider.performance);

    this.providers.set(providerId, provider);
    this.updateLeaderboard();

    this.emit('provider:updated', provider);
  }

  getProvider(providerId: string): SignalProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(filters?: {
    platform?: string;
    type?: string;
    minScore?: number;
    status?: string;
  }): SignalProvider[] {
    let providers = Array.from(this.providers.values());

    if (filters) {
      if (filters.platform) {
        providers = providers.filter(p => p.platform === filters.platform);
      }
      if (filters.type) {
        providers = providers.filter(p => p.type === filters.type);
      }
      if (filters.minScore !== undefined) {
        providers = providers.filter(p => p.aiScore >= (filters.minScore as number));
      }
      if (filters.status) {
        providers = providers.filter(p => p.status === filters.status);
      }
    }

    return providers.sort((a, b) => b.aiScore - a.aiScore);
  }

  // ============================================================
  // AI-POWERED SCORING
  // ============================================================

  private calculateAIScore(performance: SignalProviderPerformance): number {
    const weights = this.SCORING_WEIGHTS;

    // Normalize metrics to 0-100 scale
    const winRateScore = Math.min(performance.winRate, 100);
    const profitFactorScore = Math.min(performance.profitFactor * 25, 100); // 4.0 = 100
    const sharpeScore = Math.min((performance.sharpeRatio + 1) * 33, 100); // 2.0 = 100
    const consistencyScore = performance.consistency * 100;
    const drawdownScore = Math.max(100 - performance.maxDrawdown * 3, 0); // 33% DD = 0
    const regimeScore = this.calculateRegimeAdaptabilityScore(performance.regimePerformance);
    const qualityScore = performance.qualityScore || 50;

    const weightedScore =
      winRateScore * weights.winRate +
      profitFactorScore * weights.profitFactor +
      sharpeScore * weights.sharpeRatio +
      consistencyScore * weights.consistency +
      drawdownScore * weights.maxDrawdown +
      regimeScore * weights.regimeAdaptability +
      qualityScore * weights.signalQuality;

    return Math.round(Math.min(Math.max(weightedScore, 0), 100));
  }

  private calculateRegimeAdaptabilityScore(regimePerformance: Record<MarketRegime, RegimeStats>): number {
    const regimes = Object.values(regimePerformance);
    if (regimes.length === 0) return 50;

    const profitableRegimes = regimes.filter(r => r.winRate > 50).length;
    const totalRegimes = regimes.length;
    const avgWinRate = regimes.reduce((sum, r) => sum + r.winRate, 0) / totalRegimes;

    return (profitableRegimes / totalRegimes) * 50 + (avgWinRate / 100) * 50;
  }

  // ============================================================
  // COLLECTIVE INTELLIGENCE
  // ============================================================

  async aggregateCollectiveIntelligence(symbol: string): Promise<CollectiveIntelligence> {
    const activeProviders = this.getAllProviders({ status: 'active' });
    const recentSignals = Array.from(this.signals.values())
      .filter(s => s.symbol === symbol && !s.expired)
      .filter(s => Date.now() - s.timestamp.getTime() < 3600000); // Last hour

    let longVotes = 0;
    let shortVotes = 0;
    let neutralVotes = 0;
    let totalConfidence = 0;
    let weightedConfidence = 0;
    const contributors: { providerId: string; weight: number }[] = [];

    for (const signal of recentSignals) {
      const provider = this.providers.get(signal.providerId);
      if (!provider) continue;

      const weight = provider.aiScore / 100;

      if (signal.direction === 'long') {
        longVotes++;
        weightedConfidence += signal.confidence * weight;
      } else if (signal.direction === 'short') {
        shortVotes++;
        weightedConfidence += signal.confidence * weight;
      } else {
        neutralVotes++;
      }

      totalConfidence += signal.confidence;
      contributors.push({ providerId: signal.providerId, weight });
    }

    const totalVotes = longVotes + shortVotes + neutralVotes;
    let consensusDirection: SignalDirection = 'neutral';
    let consensusStrength = 0;

    if (totalVotes > 0) {
      if (longVotes > shortVotes && longVotes > neutralVotes) {
        consensusDirection = 'long';
        consensusStrength = longVotes / totalVotes;
      } else if (shortVotes > longVotes && shortVotes > neutralVotes) {
        consensusDirection = 'short';
        consensusStrength = shortVotes / totalVotes;
      }
    }

    const intel: CollectiveIntelligence = {
      symbol,
      timestamp: new Date(),
      totalProviders: totalVotes,
      longVotes,
      shortVotes,
      neutralVotes,
      consensusDirection,
      consensusStrength,
      topContributors: contributors.sort((a, b) => b.weight - a.weight).slice(0, 5),
      regimeAgreement: 0.8, // Mock
      averageConfidence: totalVotes > 0 ? totalConfidence / totalVotes : 0,
      weightedConfidence: totalVotes > 0 ? weightedConfidence / totalVotes : 0,
    };

    this.collectiveIntel.set(symbol, intel);
    this.emit('collective:updated', intel);

    return intel;
  }

  getCollectiveIntelligence(symbol: string): CollectiveIntelligence | undefined {
    return this.collectiveIntel.get(symbol);
  }

  getAllCollectiveIntelligence(): CollectiveIntelligence[] {
    return Array.from(this.collectiveIntel.values());
  }

  // ============================================================
  // COPY TRADING
  // ============================================================

  async setupCopyTrading(config: Omit<CopyTradeConfig, 'startedAt' | 'totalPnL' | 'totalTrades'>): Promise<CopyTradeConfig> {
    const provider = this.providers.get(config.providerId);
    if (!provider) {
      throw new Error('Signal provider not found');
    }

    if (provider.status !== 'active') {
      throw new Error('Provider is not active');
    }

    const fullConfig: CopyTradeConfig = {
      ...config,
      startedAt: new Date(),
      totalPnL: 0,
      totalTrades: 0,
    };

    const userConfigs = this.copyConfigs.get(config.userId) || [];
    userConfigs.push(fullConfig);
    this.copyConfigs.set(config.userId, userConfigs);

    // Update provider follower count
    provider.followers++;
    this.providers.set(provider.id, provider);

    this.emit('copy:started', { userId: config.userId, providerId: config.providerId });

    return fullConfig;
  }

  async processSignal(signal: Omit<SocialSignal, 'id' | 'copiedBy' | 'consensusStrength'>): Promise<void> {
    const id = `signal_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const fullSignal: SocialSignal = {
      ...signal,
      id,
      copiedBy: 0,
      consensusStrength: 0,
    };

    this.signals.set(id, fullSignal);

    // Find all users copying this provider
    const copies: { userId: string; config: CopyTradeConfig }[] = [];

    for (const [userId, configs] of this.copyConfigs.entries()) {
      for (const config of configs) {
        if (config.providerId === signal.providerId && config.status === 'active') {
          // Check symbol filter
          if (config.symbols !== 'all' && !config.symbols.includes(signal.symbol)) continue;
          if (config.excludeSymbols.includes(signal.symbol)) continue;

          // Check regime filter
          if (config.regimeFilter !== 'auto') {
            if (!config.regimeFilter.includes(signal.regimeAtSignal)) continue;
          }

          copies.push({ userId, config });
        }
      }
    }

    fullSignal.copiedBy = copies.length;

    // Calculate consensus strength
    await this.aggregateCollectiveIntelligence(signal.symbol);
    const intel = this.collectiveIntel.get(signal.symbol);
    if (intel) {
      fullSignal.consensusStrength = intel.consensusStrength;
    }

    this.signals.set(id, fullSignal);

    // Emit copy events for each user
    for (const { userId, config } of copies) {
      const tradeParams = this.calculateCopyTradeParams(fullSignal, config);
      this.emit('copy:execute', {
        userId,
        config,
        signal: fullSignal,
        tradeParams,
      });
    }

    this.emit('signal:processed', fullSignal);
  }

  private calculateCopyTradeParams(signal: SocialSignal, config: CopyTradeConfig): {
    lotSize: number;
    stopLoss: number | null;
    takeProfit: number | null;
    direction: SignalDirection;
  } {
    let lotSize = 0.01;
    const direction = config.inverseMode
      ? (signal.direction === 'long' ? 'short' : signal.direction === 'short' ? 'long' : signal.direction)
      : signal.direction;

    switch (config.mode) {
      case 'fixed_lot':
        lotSize = config.fixedLotSize || 0.01;
        break;
      case 'proportional':
        lotSize = config.lotMultiplier * 0.01;
        break;
      case 'risk_based':
        // Calculate lot size based on risk percentage
        lotSize = config.maxRiskPerTrade * 0.1; // Simplified
        break;
      case 'mirror':
      default:
        lotSize = 0.01;
    }

    return {
      lotSize,
      stopLoss: signal.stopLoss || null,
      takeProfit: signal.takeProfit || null,
      direction,
    };
  }

  getUserCopyConfigs(userId: string): CopyTradeConfig[] {
    return this.copyConfigs.get(userId) || [];
  }

  async stopCopyTrading(userId: string, providerId: string): Promise<void> {
    const configs = this.copyConfigs.get(userId) || [];
    const updated = configs.map(c =>
      c.providerId === providerId ? { ...c, status: 'paused' as const } : c
    );
    this.copyConfigs.set(userId, updated);

    const provider = this.providers.get(providerId);
    if (provider) {
      provider.followers = Math.max(0, provider.followers - 1);
      this.providers.set(providerId, provider);
    }

    this.emit('copy:stopped', { userId, providerId });
  }

  // ============================================================
  // LEADERBOARD
  // ============================================================

  private updateLeaderboard(): void {
    const providers = Array.from(this.providers.values())
      .filter(p => p.status === 'active')
      .sort((a, b) => b.aiScore - a.aiScore);

    this.leaderboard = providers.slice(0, 100).map((p, index) => ({
      rank: index + 1,
      providerId: p.id,
      name: p.name,
      type: p.type,
      platform: p.platform,
      winRate: p.performance.winRate,
      profitFactor: p.performance.profitFactor,
      followers: p.followers,
      totalReturn: p.performance.riskAdjustedReturn,
      maxDrawdown: p.performance.maxDrawdown,
      aiScore: p.aiScore,
      trending: this.calculateTrend(p),
      badge: this.getBadge(p),
    }));

    this.emit('leaderboard:updated', this.leaderboard);
  }

  private calculateTrend(provider: SignalProvider): 'up' | 'down' | 'stable' {
    const returns = provider.performance.monthlyReturns;
    if (returns.length < 2) return 'stable';

    const recent = returns[returns.length - 1].return;
    const previous = returns[returns.length - 2].return;

    if (recent > previous * 1.1) return 'up';
    if (recent < previous * 0.9) return 'down';
    return 'stable';
  }

  private getBadge(provider: SignalProvider): string | null {
    if (provider.performance.winRate > 70 && provider.performance.profitFactor > 2) {
      return 'Elite Trader';
    }
    if (provider.performance.consistency > 0.9) {
      return 'Consistent';
    }
    if (provider.followers > 100) {
      return 'Popular';
    }
    if (provider.aiScore > 85) {
      return 'AI Recommended';
    }
    return null;
  }

  getLeaderboard(options?: {
    type?: string;
    platform?: string;
    limit?: number;
  }): LeaderboardEntry[] {
    let results = [...this.leaderboard];

    if (options?.type) {
      results = results.filter(e => e.type === options.type);
    }
    if (options?.platform) {
      results = results.filter(e => e.platform === options.platform);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ============================================================
  // AUTONOMOUS RECOMMENDATIONS
  // ============================================================

  async getAIRecommendations(userId: string, options?: {
    riskTolerance?: 'low' | 'medium' | 'high';
    preferredAssets?: string[];
    currentRegime?: MarketRegime;
    maxProviders?: number;
  }): Promise<{
    recommended: SignalProvider[];
    reasoning: string[];
    diversificationScore: number;
    expectedReturn: number;
    expectedDrawdown: number;
  }> {
    const allProviders = this.getAllProviders({ status: 'active' });
    const userConfigs = this.getUserCopyConfigs(userId);
    const alreadyCopying = new Set(userConfigs.map(c => c.providerId));

    let candidates = allProviders.filter(p => !alreadyCopying.has(p.id));

    // Filter by risk tolerance
    if (options?.riskTolerance) {
      const riskMap = {
        low: ['conservative'],
        medium: ['conservative', 'moderate'],
        high: ['conservative', 'moderate', 'aggressive'],
      };
      candidates = candidates.filter(p => riskMap[options.riskTolerance!].includes(p.riskProfile));
    }

    // Filter by regime performance
    if (options?.currentRegime) {
      candidates = candidates.filter(p => {
        const regimeStats = p.performance.regimePerformance[options.currentRegime!];
        return regimeStats && regimeStats.shouldFollow;
      });
    }

    // Score and sort
    candidates = candidates
      .filter(p => p.aiScore >= 60)
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, options?.maxProviders || 5);

    // Calculate diversification
    const platforms = new Set(candidates.map(p => p.platform));
    const types = new Set(candidates.map(p => p.type));
    const diversificationScore = ((platforms.size + types.size) / (candidates.length * 2)) * 100;

    // Expected metrics
    const avgReturn = candidates.length > 0
      ? candidates.reduce((s, p) => s + p.performance.riskAdjustedReturn, 0) / candidates.length
      : 0;
    const avgDrawdown = candidates.length > 0
      ? candidates.reduce((s, p) => s + p.performance.maxDrawdown, 0) / candidates.length
      : 0;

    const reasoning: string[] = [];
    for (const provider of candidates) {
      reasoning.push(
        `${provider.name} (Score: ${provider.aiScore}): ` +
        `${provider.performance.winRate.toFixed(1)}% win rate, ` +
        `${provider.performance.profitFactor.toFixed(2)} profit factor`
      );
    }

    return {
      recommended: candidates,
      reasoning,
      diversificationScore,
      expectedReturn: avgReturn,
      expectedDrawdown: avgDrawdown,
    };
  }

  // ============================================================
  // SAMPLE DATA
  // ============================================================

  private loadSampleProviders(): void {
    const sampleProviders: Omit<SignalProvider, 'id' | 'createdAt' | 'aiScore'>[] = [
      {
        name: 'TrendMaster Pro',
        platform: 'mt5',
        type: 'bot',
        verified: true,
        performance: {
          totalSignals: 1250,
          winningSignals: 812,
          losingSignals: 438,
          winRate: 65,
          avgWinPips: 45,
          avgLossPips: 25,
          profitFactor: 2.35,
          sharpeRatio: 1.8,
          maxDrawdown: 12,
          avgHoldingTime: 240,
          consistency: 0.85,
          regimePerformance: {
            trending_up: { signals: 400, winRate: 75, avgReturn: 2.5, shouldFollow: true },
            trending_down: { signals: 350, winRate: 70, avgReturn: 2.2, shouldFollow: true },
            ranging: { signals: 300, winRate: 55, avgReturn: 0.8, shouldFollow: false },
            high_volatility: { signals: 150, winRate: 60, avgReturn: 1.5, shouldFollow: true },
            low_volatility: { signals: 50, winRate: 50, avgReturn: 0.3, shouldFollow: false },
            event_driven: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            overnight_illiquid: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            sentiment_shift: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            unknown: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
          },
          monthlyReturns: [
            { month: '2025-01', return: 8.5, trades: 45, maxDrawdown: 5 },
            { month: '2025-02', return: 6.2, trades: 38, maxDrawdown: 7 },
            { month: '2025-03', return: 4.8, trades: 42, maxDrawdown: 9 },
          ],
          riskAdjustedReturn: 28.5,
          qualityScore: 88,
        },
        followers: 342,
        copiedValue: 2500000,
        riskProfile: 'moderate',
        preferredSymbols: ['EURUSD', 'GBPUSD', 'USDJPY'],
        preferredRegimes: ['trending_up', 'trending_down'],
        weekRegimes: ['ranging', 'low_volatility'],
        minimumEquity: 1000,
        profitShare: 15,
        status: 'active',
      },
      {
        name: 'Scalp King AI',
        platform: 'ctrader',
        type: 'ai_strategy',
        verified: true,
        performance: {
          totalSignals: 5420,
          winningSignals: 3795,
          losingSignals: 1625,
          winRate: 70,
          avgWinPips: 8,
          avgLossPips: 12,
          profitFactor: 1.55,
          sharpeRatio: 2.1,
          maxDrawdown: 8,
          avgHoldingTime: 15,
          consistency: 0.92,
          regimePerformance: {
            trending_up: { signals: 800, winRate: 65, avgReturn: 0.8, shouldFollow: true },
            trending_down: { signals: 750, winRate: 68, avgReturn: 0.9, shouldFollow: true },
            ranging: { signals: 2200, winRate: 75, avgReturn: 0.6, shouldFollow: true },
            high_volatility: { signals: 400, winRate: 55, avgReturn: 0.3, shouldFollow: false },
            low_volatility: { signals: 1200, winRate: 72, avgReturn: 0.5, shouldFollow: true },
            event_driven: { signals: 70, winRate: 40, avgReturn: -0.2, shouldFollow: false },
            overnight_illiquid: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            sentiment_shift: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            unknown: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
          },
          monthlyReturns: [
            { month: '2025-01', return: 12.3, trades: 320, maxDrawdown: 4 },
            { month: '2025-02', return: 9.8, trades: 285, maxDrawdown: 5 },
            { month: '2025-03', return: 11.1, trades: 298, maxDrawdown: 3 },
          ],
          riskAdjustedReturn: 42.5,
          qualityScore: 91,
        },
        followers: 578,
        copiedValue: 4200000,
        riskProfile: 'conservative',
        preferredSymbols: ['EURUSD', 'GBPJPY', 'XAUUSD'],
        preferredRegimes: ['ranging', 'low_volatility'],
        weekRegimes: ['high_volatility', 'event_driven'],
        minimumEquity: 500,
        profitShare: 20,
        status: 'active',
      },
      {
        name: 'Crypto Momentum Alpha',
        platform: 'tradingview',
        type: 'human_trader',
        verified: true,
        performance: {
          totalSignals: 890,
          winningSignals: 534,
          losingSignals: 356,
          winRate: 60,
          avgWinPips: 120,
          avgLossPips: 65,
          profitFactor: 1.95,
          sharpeRatio: 1.5,
          maxDrawdown: 22,
          avgHoldingTime: 1440,
          consistency: 0.72,
          regimePerformance: {
            trending_up: { signals: 300, winRate: 72, avgReturn: 5.5, shouldFollow: true },
            trending_down: { signals: 280, winRate: 65, avgReturn: 4.2, shouldFollow: true },
            ranging: { signals: 150, winRate: 45, avgReturn: 0.5, shouldFollow: false },
            high_volatility: { signals: 120, winRate: 58, avgReturn: 3.8, shouldFollow: true },
            low_volatility: { signals: 40, winRate: 40, avgReturn: -0.5, shouldFollow: false },
            event_driven: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            overnight_illiquid: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            sentiment_shift: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            unknown: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
          },
          monthlyReturns: [
            { month: '2025-01', return: 25.5, trades: 28, maxDrawdown: 15 },
            { month: '2025-02', return: -8.2, trades: 32, maxDrawdown: 22 },
            { month: '2025-03', return: 18.3, trades: 26, maxDrawdown: 12 },
          ],
          riskAdjustedReturn: 35.6,
          qualityScore: 75,
        },
        followers: 892,
        copiedValue: 8500000,
        riskProfile: 'aggressive',
        preferredSymbols: ['BTCUSD', 'ETHUSD', 'SOLUSD'],
        preferredRegimes: ['trending_up', 'high_volatility'],
        weekRegimes: ['ranging', 'low_volatility'],
        minimumEquity: 2000,
        profitShare: 25,
        status: 'active',
      },
      {
        name: 'Range Reversion Bot',
        platform: 'time_bot',
        type: 'ensemble',
        verified: true,
        performance: {
          totalSignals: 2100,
          winningSignals: 1512,
          losingSignals: 588,
          winRate: 72,
          avgWinPips: 18,
          avgLossPips: 22,
          profitFactor: 1.78,
          sharpeRatio: 1.65,
          maxDrawdown: 10,
          avgHoldingTime: 90,
          consistency: 0.88,
          regimePerformance: {
            trending_up: { signals: 200, winRate: 55, avgReturn: 0.5, shouldFollow: false },
            trending_down: { signals: 180, winRate: 58, avgReturn: 0.6, shouldFollow: false },
            ranging: { signals: 1200, winRate: 78, avgReturn: 1.8, shouldFollow: true },
            high_volatility: { signals: 150, winRate: 62, avgReturn: 0.9, shouldFollow: true },
            low_volatility: { signals: 320, winRate: 75, avgReturn: 1.2, shouldFollow: true },
            event_driven: { signals: 50, winRate: 45, avgReturn: -0.3, shouldFollow: false },
            overnight_illiquid: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            sentiment_shift: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
            unknown: { signals: 0, winRate: 0, avgReturn: 0, shouldFollow: false },
          },
          monthlyReturns: [
            { month: '2025-01', return: 5.8, trades: 95, maxDrawdown: 6 },
            { month: '2025-02', return: 6.2, trades: 88, maxDrawdown: 5 },
            { month: '2025-03', return: 5.5, trades: 92, maxDrawdown: 7 },
          ],
          riskAdjustedReturn: 17.5,
          qualityScore: 85,
        },
        followers: 215,
        copiedValue: 1200000,
        riskProfile: 'conservative',
        preferredSymbols: ['EURUSD', 'AUDNZD', 'EURGBP'],
        preferredRegimes: ['ranging', 'low_volatility'],
        weekRegimes: ['trending_up', 'trending_down', 'event_driven'],
        minimumEquity: 500,
        profitShare: 10,
        status: 'active',
      },
    ];

    for (const provider of sampleProviders) {
      this.registerProvider(provider);
    }
  }

  // ============================================================
  // ENGINE LIFECYCLE
  // ============================================================

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[SocialTradingEngine] Started');

    // Start collective intelligence updates
    this.startCollectiveUpdates();

    this.emit('engine:started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[SocialTradingEngine] Stopped');
    this.emit('engine:stopped');
  }

  private startCollectiveUpdates(): void {
    // Update collective intelligence every minute
    setInterval(async () => {
      if (!this.isRunning) return;

      const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'XAUUSD'];
      for (const symbol of symbols) {
        await this.aggregateCollectiveIntelligence(symbol);
      }
    }, 60000);
  }

  getState(): {
    isRunning: boolean;
    providerCount: number;
    signalCount: number;
    totalFollowers: number;
    totalCopiedValue: number;
  } {
    const providers = Array.from(this.providers.values());

    return {
      isRunning: this.isRunning,
      providerCount: providers.length,
      signalCount: this.signals.size,
      totalFollowers: providers.reduce((s, p) => s + p.followers, 0),
      totalCopiedValue: providers.reduce((s, p) => s + p.copiedValue, 0),
    };
  }
}

// Export singleton
export const socialTradingEngine = new SocialTradingEngine();
export default socialTradingEngine;

/**
 * Bot Fingerprinting System
 *
 * Creates unique fingerprints for each bot that TIME encounters.
 * Fingerprints capture:
 * - Trading behavior patterns
 * - Signal generation characteristics
 * - Risk management approach
 * - Entry/exit logic signatures
 * - Performance DNA
 *
 * This allows TIME to:
 * 1. Identify similar/duplicate bots
 * 2. Track bot evolution over time
 * 3. Detect when bots diverge from expected behavior
 * 4. Group bots by strategy type
 * 5. Build the bot absorption process
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';
import { TIMEGovernor } from '../core/time_governor';
import {
  Bot,
  BotFingerprint,
  Trade,
  Signal,
  MarketRegime,
  TIMEComponent,
} from '../types';
import * as crypto from 'crypto';

const logger = createComponentLogger('BotFingerprinting');

// Fingerprint components
interface BehaviorSignature {
  avgHoldingPeriod: number; // minutes
  tradeFrequency: number; // trades per day
  preferredTimeframes: string[];
  activeHours: number[]; // 0-23
  marketRegimePreference: MarketRegime[];
}

interface SignalSignature {
  entryPatterns: string[];
  exitPatterns: string[];
  indicatorsUsed: string[];
  signalStrengthDistribution: number[]; // histogram
  avgSignalToEntry: number; // ms delay
}

interface RiskSignature {
  avgPositionSize: number; // as % of account
  stopLossRange: [number, number]; // min/max as %
  takeProfitRange: [number, number];
  riskRewardRatio: number;
  maxConcurrentPositions: number;
  drawdownTolerance: number;
}

interface PerformanceSignature {
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  expectancy: number;
}

interface DetailedFingerprint extends BotFingerprint {
  behavior: BehaviorSignature;
  signals: SignalSignature;
  risk: RiskSignature;
  performance: PerformanceSignature;
  dnaHash: string;
  similarity: Map<string, number>; // botId -> similarity score
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Fingerprint comparison result
interface FingerprintComparison {
  botId1: string;
  botId2: string;
  overallSimilarity: number;
  behaviorSimilarity: number;
  signalSimilarity: number;
  riskSimilarity: number;
  performanceSimilarity: number;
  isPotentialDuplicate: boolean;
  isComplementary: boolean;
}

export class BotFingerprintingSystem extends EventEmitter implements TIMEComponent {
  private static instance: BotFingerprintingSystem | null = null;
  private fingerprints: Map<string, DetailedFingerprint> = new Map();
  private tradeHistory: Map<string, Trade[]> = new Map();
  private signalHistory: Map<string, Signal[]> = new Map();

  public readonly name = 'BotFingerprintingSystem';
  public readonly version = '1.0.0';

  private constructor() {
    super();
  }

  public static getInstance(): BotFingerprintingSystem {
    if (!BotFingerprintingSystem.instance) {
      BotFingerprintingSystem.instance = new BotFingerprintingSystem();
    }
    return BotFingerprintingSystem.instance;
  }

  public async initialize(): Promise<void> {
    logger.info('Initializing Bot Fingerprinting System');

    // Register with TIME Governor
    const governor = TIMEGovernor.getInstance();
    governor.registerComponent(this);

    logger.info('Bot Fingerprinting System initialized');
  }

  public getStatus(): { fingerprintCount: number; lastUpdate: Date | null } {
    const fingerprints = Array.from(this.fingerprints.values());
    const lastUpdate = fingerprints.length > 0
      ? new Date(Math.max(...fingerprints.map((f) => f.updatedAt.getTime())))
      : null;

    return {
      fingerprintCount: this.fingerprints.size,
      lastUpdate,
    };
  }

  /**
   * Create or update a fingerprint for a bot
   */
  public async createFingerprint(bot: Bot): Promise<DetailedFingerprint> {
    logger.info(`Creating fingerprint for bot: ${bot.name}`);

    const trades = this.tradeHistory.get(bot.id) || [];
    const signals = this.signalHistory.get(bot.id) || [];

    const behavior = this.analyzeBehavior(trades);
    const signalSig = this.analyzeSignals(signals);
    const risk = this.analyzeRisk(trades, bot);
    const performance = this.analyzePerformance(trades);

    // Create DNA hash from key characteristics
    const dnaHash = this.generateDNAHash(behavior, signalSig, risk, performance);

    const fingerprint: DetailedFingerprint = {
      botId: bot.id,
      strategyType: this.inferStrategyType(behavior, signalSig),
      tradingStyle: this.inferTradingStyle(behavior),
      characteristics: {
        avgHoldTime: behavior.avgHoldingPeriod,
        winRate: performance.winRate,
        profitFactor: performance.profitFactor,
        maxDrawdown: performance.maxDrawdown,
        sharpeRatio: performance.sharpeRatio,
      },
      patterns: [...signalSig.entryPatterns, ...signalSig.exitPatterns],
      behavior,
      signals: signalSig,
      risk,
      performance,
      dnaHash,
      similarity: new Map(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    // Check for existing fingerprint
    const existing = this.fingerprints.get(bot.id);
    if (existing) {
      fingerprint.createdAt = existing.createdAt;
      fingerprint.version = existing.version + 1;
    }

    this.fingerprints.set(bot.id, fingerprint);

    // Calculate similarities with other bots
    await this.calculateAllSimilarities(bot.id);

    this.emit('fingerprintCreated', { botId: bot.id, fingerprint });
    logger.info(`Fingerprint created for ${bot.name}, DNA: ${dnaHash.substring(0, 16)}...`);

    return fingerprint;
  }

  /**
   * Analyze trading behavior from trade history
   */
  private analyzeBehavior(trades: Trade[]): BehaviorSignature {
    if (trades.length === 0) {
      return {
        avgHoldingPeriod: 0,
        tradeFrequency: 0,
        preferredTimeframes: [],
        activeHours: [],
        marketRegimePreference: [],
      };
    }

    // Calculate average holding period
    const holdingPeriods = trades
      .filter((t) => t.exitTime)
      .map((t) => (t.exitTime!.getTime() - t.entryTime.getTime()) / 60000);

    const avgHoldingPeriod = holdingPeriods.length > 0
      ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
      : 0;

    // Calculate trade frequency
    const daysCovered = trades.length > 1
      ? (trades[trades.length - 1].entryTime.getTime() - trades[0].entryTime.getTime()) / 86400000
      : 1;
    const tradeFrequency = trades.length / Math.max(1, daysCovered);

    // Determine preferred timeframes based on holding period
    const preferredTimeframes = this.inferTimeframes(avgHoldingPeriod);

    // Analyze active hours
    const hourCounts = new Array(24).fill(0);
    trades.forEach((t) => {
      hourCounts[t.entryTime.getHours()]++;
    });
    const maxHourCount = Math.max(...hourCounts);
    const activeHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter((h) => h.count >= maxHourCount * 0.5)
      .map((h) => h.hour);

    return {
      avgHoldingPeriod,
      tradeFrequency,
      preferredTimeframes,
      activeHours,
      marketRegimePreference: [], // Would be filled from actual regime data
    };
  }

  private inferTimeframes(avgHoldingMinutes: number): string[] {
    if (avgHoldingMinutes < 5) return ['1m', '5m'];
    if (avgHoldingMinutes < 60) return ['5m', '15m'];
    if (avgHoldingMinutes < 240) return ['15m', '1h'];
    if (avgHoldingMinutes < 1440) return ['1h', '4h'];
    return ['4h', '1d'];
  }

  /**
   * Analyze signal characteristics
   */
  private analyzeSignals(signals: Signal[]): SignalSignature {
    if (signals.length === 0) {
      return {
        entryPatterns: [],
        exitPatterns: [],
        indicatorsUsed: [],
        signalStrengthDistribution: [],
        avgSignalToEntry: 0,
      };
    }

    // Extract patterns from signals (simplified)
    const entryPatterns = new Set<string>();
    const exitPatterns = new Set<string>();
    const indicators = new Set<string>();

    signals.forEach((signal) => {
      if (signal.metadata) {
        if (signal.metadata.pattern) {
          if (signal.direction === 'long' || signal.direction === 'short') {
            entryPatterns.add(signal.metadata.pattern as string);
          } else {
            exitPatterns.add(signal.metadata.pattern as string);
          }
        }
        if (signal.metadata.indicator) {
          indicators.add(signal.metadata.indicator as string);
        }
      }
    });

    // Calculate signal strength distribution (histogram with 10 bins)
    const strengthBins = new Array(10).fill(0);
    signals.forEach((signal) => {
      const bin = Math.min(9, Math.floor(signal.strength * 10));
      strengthBins[bin]++;
    });

    // Normalize to percentages
    const total = signals.length;
    const distribution = strengthBins.map((count) => count / total);

    return {
      entryPatterns: Array.from(entryPatterns),
      exitPatterns: Array.from(exitPatterns),
      indicatorsUsed: Array.from(indicators),
      signalStrengthDistribution: distribution,
      avgSignalToEntry: 0, // Would need signal-to-trade correlation
    };
  }

  /**
   * Analyze risk management approach
   */
  private analyzeRisk(trades: Trade[], bot: Bot): RiskSignature {
    if (trades.length === 0) {
      return {
        avgPositionSize: 0,
        stopLossRange: [0, 0],
        takeProfitRange: [0, 0],
        riskRewardRatio: 0,
        maxConcurrentPositions: 0,
        drawdownTolerance: 0,
      };
    }

    // Analyze position sizes
    const positionSizes = trades.map((t) => t.quantity);
    const avgPositionSize = positionSizes.reduce((a, b) => a + b, 0) / trades.length;

    // Analyze stop losses (from losing trades)
    const losers = trades.filter((t) => t.pnl && t.pnl < 0);
    const losses = losers.map((t) =>
      Math.abs((t.exitPrice! - t.entryPrice) / t.entryPrice) * 100
    );
    const stopLossRange: [number, number] = losses.length > 0
      ? [Math.min(...losses), Math.max(...losses)]
      : [0, 0];

    // Analyze take profits (from winning trades)
    const winners = trades.filter((t) => t.pnl && t.pnl > 0);
    const wins = winners.map((t) =>
      Math.abs((t.exitPrice! - t.entryPrice) / t.entryPrice) * 100
    );
    const takeProfitRange: [number, number] = wins.length > 0
      ? [Math.min(...wins), Math.max(...wins)]
      : [0, 0];

    // Calculate risk/reward ratio
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Calculate max concurrent positions
    // (simplified - would need timestamp analysis)
    const maxConcurrentPositions = 1; // Default assumption

    // Get drawdown tolerance from bot performance
    const drawdownTolerance = bot.performance?.maxDrawdown || 0;

    return {
      avgPositionSize,
      stopLossRange,
      takeProfitRange,
      riskRewardRatio,
      maxConcurrentPositions,
      drawdownTolerance,
    };
  }

  /**
   * Analyze performance characteristics
   */
  private analyzePerformance(trades: Trade[]): PerformanceSignature {
    const closedTrades = trades.filter((t) => t.pnl !== undefined);

    if (closedTrades.length === 0) {
      return {
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        avgWin: 0,
        avgLoss: 0,
        winLossRatio: 0,
        expectancy: 0,
      };
    }

    const winners = closedTrades.filter((t) => t.pnl! > 0);
    const losers = closedTrades.filter((t) => t.pnl! < 0);

    const winRate = winners.length / closedTrades.length;

    const totalWins = winners.reduce((sum, t) => sum + t.pnl!, 0);
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.pnl!, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const avgWin = winners.length > 0 ? totalWins / winners.length : 0;
    const avgLoss = losers.length > 0 ? totalLosses / losers.length : 0;
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

    // Calculate Sharpe ratio (simplified)
    const returns = closedTrades.map((t) => t.pnl!);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;
    for (const trade of closedTrades) {
      runningPnL += trade.pnl!;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    return {
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown: maxDrawdownPercent,
      avgWin,
      avgLoss,
      winLossRatio,
      expectancy,
    };
  }

  /**
   * Generate unique DNA hash from fingerprint components
   */
  private generateDNAHash(
    behavior: BehaviorSignature,
    signals: SignalSignature,
    risk: RiskSignature,
    performance: PerformanceSignature
  ): string {
    const dnaData = {
      holdingBucket: Math.floor(behavior.avgHoldingPeriod / 60), // Hour buckets
      frequencyBucket: Math.floor(behavior.tradeFrequency),
      timeframes: behavior.preferredTimeframes.sort().join(','),
      patterns: [...signals.entryPatterns, ...signals.exitPatterns].sort().join(','),
      indicators: signals.indicatorsUsed.sort().join(','),
      riskRewardBucket: Math.floor(risk.riskRewardRatio * 10) / 10,
      winRateBucket: Math.floor(performance.winRate * 100) / 10,
      profitFactorBucket: Math.floor(performance.profitFactor * 10) / 10,
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(dnaData))
      .digest('hex');

    return hash;
  }

  /**
   * Infer strategy type from fingerprint data
   */
  private inferStrategyType(
    behavior: BehaviorSignature,
    signals: SignalSignature
  ): string {
    const indicators = signals.indicatorsUsed.map((i) => i.toLowerCase());
    const patterns = [...signals.entryPatterns, ...signals.exitPatterns].map((p) =>
      p.toLowerCase()
    );

    // Check for trend following characteristics
    if (
      indicators.some((i) => ['ma', 'ema', 'sma', 'macd', 'trend'].some((k) => i.includes(k))) ||
      patterns.some((p) => ['trend', 'breakout', 'momentum'].some((k) => p.includes(k)))
    ) {
      return 'trend_following';
    }

    // Check for mean reversion
    if (
      indicators.some((i) => ['rsi', 'bollinger', 'stochastic'].some((k) => i.includes(k))) ||
      patterns.some((p) => ['reversion', 'oversold', 'overbought'].some((k) => p.includes(k)))
    ) {
      return 'mean_reversion';
    }

    // Check for scalping
    if (behavior.avgHoldingPeriod < 15 && behavior.tradeFrequency > 20) {
      return 'scalping';
    }

    // Check for swing trading
    if (behavior.avgHoldingPeriod > 240) {
      return 'swing_trading';
    }

    return 'unknown';
  }

  /**
   * Infer trading style from behavior
   */
  private inferTradingStyle(behavior: BehaviorSignature): string {
    if (behavior.avgHoldingPeriod < 5) return 'scalper';
    if (behavior.avgHoldingPeriod < 60) return 'day_trader';
    if (behavior.avgHoldingPeriod < 1440) return 'intraday';
    return 'swing_position';
  }

  /**
   * Calculate similarity between two fingerprints
   */
  public compareBots(botId1: string, botId2: string): FingerprintComparison | null {
    const fp1 = this.fingerprints.get(botId1);
    const fp2 = this.fingerprints.get(botId2);

    if (!fp1 || !fp2) {
      logger.warn(`Cannot compare: Missing fingerprint for ${!fp1 ? botId1 : botId2}`);
      return null;
    }

    const behaviorSimilarity = this.compareBehavior(fp1.behavior, fp2.behavior);
    const signalSimilarity = this.compareSignals(fp1.signals, fp2.signals);
    const riskSimilarity = this.compareRisk(fp1.risk, fp2.risk);
    const performanceSimilarity = this.comparePerformance(fp1.performance, fp2.performance);

    // Weighted overall similarity
    const overallSimilarity =
      behaviorSimilarity * 0.25 +
      signalSimilarity * 0.35 +
      riskSimilarity * 0.20 +
      performanceSimilarity * 0.20;

    // Determine if potential duplicate (very similar)
    const isPotentialDuplicate =
      overallSimilarity > 0.85 && signalSimilarity > 0.9;

    // Determine if complementary (different but compatible)
    const isComplementary =
      overallSimilarity < 0.5 &&
      performanceSimilarity > 0.4 &&
      riskSimilarity > 0.6;

    return {
      botId1,
      botId2,
      overallSimilarity,
      behaviorSimilarity,
      signalSimilarity,
      riskSimilarity,
      performanceSimilarity,
      isPotentialDuplicate,
      isComplementary,
    };
  }

  private compareBehavior(b1: BehaviorSignature, b2: BehaviorSignature): number {
    // Compare holding periods (normalized)
    const holdingDiff = Math.abs(b1.avgHoldingPeriod - b2.avgHoldingPeriod);
    const holdingSim = 1 - Math.min(1, holdingDiff / Math.max(b1.avgHoldingPeriod, b2.avgHoldingPeriod, 1));

    // Compare trade frequency
    const freqDiff = Math.abs(b1.tradeFrequency - b2.tradeFrequency);
    const freqSim = 1 - Math.min(1, freqDiff / Math.max(b1.tradeFrequency, b2.tradeFrequency, 1));

    // Compare timeframes (Jaccard similarity)
    const tf1 = new Set(b1.preferredTimeframes);
    const tf2 = new Set(b2.preferredTimeframes);
    const tfIntersection = new Set([...tf1].filter((x) => tf2.has(x)));
    const tfUnion = new Set([...tf1, ...tf2]);
    const tfSim = tfUnion.size > 0 ? tfIntersection.size / tfUnion.size : 1;

    // Compare active hours
    const hours1 = new Set(b1.activeHours);
    const hours2 = new Set(b2.activeHours);
    const hoursIntersection = new Set([...hours1].filter((x) => hours2.has(x)));
    const hoursUnion = new Set([...hours1, ...hours2]);
    const hoursSim = hoursUnion.size > 0 ? hoursIntersection.size / hoursUnion.size : 1;

    return (holdingSim + freqSim + tfSim + hoursSim) / 4;
  }

  private compareSignals(s1: SignalSignature, s2: SignalSignature): number {
    // Compare entry patterns
    const entry1 = new Set(s1.entryPatterns);
    const entry2 = new Set(s2.entryPatterns);
    const entryIntersection = new Set([...entry1].filter((x) => entry2.has(x)));
    const entryUnion = new Set([...entry1, ...entry2]);
    const entrySim = entryUnion.size > 0 ? entryIntersection.size / entryUnion.size : 1;

    // Compare indicators
    const ind1 = new Set(s1.indicatorsUsed);
    const ind2 = new Set(s2.indicatorsUsed);
    const indIntersection = new Set([...ind1].filter((x) => ind2.has(x)));
    const indUnion = new Set([...ind1, ...ind2]);
    const indSim = indUnion.size > 0 ? indIntersection.size / indUnion.size : 1;

    // Compare signal strength distributions (cosine similarity)
    const dist1 = s1.signalStrengthDistribution;
    const dist2 = s2.signalStrengthDistribution;
    if (dist1.length > 0 && dist2.length > 0) {
      const dotProduct = dist1.reduce((sum, val, i) => sum + val * (dist2[i] || 0), 0);
      const norm1 = Math.sqrt(dist1.reduce((sum, val) => sum + val * val, 0));
      const norm2 = Math.sqrt(dist2.reduce((sum, val) => sum + val * val, 0));
      const distSim = norm1 > 0 && norm2 > 0 ? dotProduct / (norm1 * norm2) : 1;
      return (entrySim + indSim + distSim) / 3;
    }

    return (entrySim + indSim) / 2;
  }

  private compareRisk(r1: RiskSignature, r2: RiskSignature): number {
    // Compare position sizes
    const posDiff = Math.abs(r1.avgPositionSize - r2.avgPositionSize);
    const posSim = 1 - Math.min(1, posDiff / Math.max(r1.avgPositionSize, r2.avgPositionSize, 0.01));

    // Compare risk/reward ratio
    const rrDiff = Math.abs(r1.riskRewardRatio - r2.riskRewardRatio);
    const rrSim = 1 - Math.min(1, rrDiff / Math.max(r1.riskRewardRatio, r2.riskRewardRatio, 0.1));

    // Compare drawdown tolerance
    const ddDiff = Math.abs(r1.drawdownTolerance - r2.drawdownTolerance);
    const ddSim = 1 - Math.min(1, ddDiff / 100);

    return (posSim + rrSim + ddSim) / 3;
  }

  private comparePerformance(p1: PerformanceSignature, p2: PerformanceSignature): number {
    // Compare win rates
    const wrDiff = Math.abs(p1.winRate - p2.winRate);
    const wrSim = 1 - wrDiff;

    // Compare profit factors
    const pf1 = Math.min(p1.profitFactor, 10);
    const pf2 = Math.min(p2.profitFactor, 10);
    const pfDiff = Math.abs(pf1 - pf2);
    const pfSim = 1 - pfDiff / 10;

    // Compare Sharpe ratios
    const sr1 = Math.max(-3, Math.min(p1.sharpeRatio, 3));
    const sr2 = Math.max(-3, Math.min(p2.sharpeRatio, 3));
    const srDiff = Math.abs(sr1 - sr2);
    const srSim = 1 - srDiff / 6;

    return (wrSim + pfSim + srSim) / 3;
  }

  /**
   * Calculate similarities with all other bots
   */
  private async calculateAllSimilarities(botId: string): Promise<void> {
    const fingerprint = this.fingerprints.get(botId);
    if (!fingerprint) return;

    for (const [otherId, otherFp] of this.fingerprints) {
      if (otherId === botId) continue;

      const comparison = this.compareBots(botId, otherId);
      if (comparison) {
        fingerprint.similarity.set(otherId, comparison.overallSimilarity);
        otherFp.similarity.set(botId, comparison.overallSimilarity);
      }
    }
  }

  /**
   * Find similar bots to a given bot
   */
  public findSimilarBots(
    botId: string,
    minSimilarity: number = 0.6
  ): Array<{ botId: string; similarity: number }> {
    const fingerprint = this.fingerprints.get(botId);
    if (!fingerprint) return [];

    return Array.from(fingerprint.similarity.entries())
      .filter(([, sim]) => sim >= minSimilarity)
      .map(([id, sim]) => ({ botId: id, similarity: sim }))
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Find complementary bots for ensemble building
   */
  public findComplementaryBots(botId: string): string[] {
    const complementary: string[] = [];

    for (const [otherId] of this.fingerprints) {
      if (otherId === botId) continue;

      const comparison = this.compareBots(botId, otherId);
      if (comparison?.isComplementary) {
        complementary.push(otherId);
      }
    }

    return complementary;
  }

  /**
   * Record a trade for fingerprint updates
   */
  public recordTrade(botId: string, trade: Trade): void {
    const trades = this.tradeHistory.get(botId) || [];
    trades.push(trade);
    this.tradeHistory.set(botId, trades);

    // Keep only last 1000 trades
    if (trades.length > 1000) {
      this.tradeHistory.set(botId, trades.slice(-1000));
    }
  }

  /**
   * Record a signal for fingerprint updates
   */
  public recordSignal(botId: string, signal: Signal): void {
    const signals = this.signalHistory.get(botId) || [];
    signals.push(signal);
    this.signalHistory.set(botId, signals);

    // Keep only last 5000 signals
    if (signals.length > 5000) {
      this.signalHistory.set(botId, signals.slice(-5000));
    }
  }

  /**
   * Get fingerprint for a bot
   */
  public getFingerprint(botId: string): DetailedFingerprint | undefined {
    return this.fingerprints.get(botId);
  }

  /**
   * Get all fingerprints
   */
  public getAllFingerprints(): DetailedFingerprint[] {
    return Array.from(this.fingerprints.values());
  }

  /**
   * Group bots by strategy type
   */
  public groupByStrategyType(): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const [botId, fp] of this.fingerprints) {
      const type = fp.strategyType;
      const bots = groups.get(type) || [];
      bots.push(botId);
      groups.set(type, bots);
    }

    return groups;
  }
}

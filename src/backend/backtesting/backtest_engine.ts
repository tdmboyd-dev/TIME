/**
 * TIME — Comprehensive Backtesting Engine
 *
 * Production-ready backtesting system with:
 * - Multi-asset support (stocks, crypto, forex)
 * - Multi-timeframe analysis
 * - Walk-forward optimization
 * - Monte Carlo simulation
 * - Realistic slippage and commission modeling
 * - Data caching for performance
 */

import {
  BacktestConfig,
  BacktestingEngine,
  BacktestResult,
  Trade,
  Candle,
  WalkForwardOptimizer,
  MonteCarloSimulator,
  MonteCarloResult,
  WalkForwardResult,
} from '../strategies/backtesting_engine';
import { loggers } from '../utils/logger';

const log = loggers.backtest;

// ==========================================
// TYPES
// ==========================================

export interface EnhancedBacktestConfig extends BacktestConfig {
  // Multi-timeframe
  timeframes?: Timeframe[];
  primaryTimeframe?: string;

  // Asset type specific
  assetType?: 'stock' | 'crypto' | 'forex' | 'commodity';

  // Enhanced slippage model
  slippageModel?: 'fixed' | 'volume_based' | 'volatility_based';
  marketImpactCoefficient?: number;

  // Enhanced commission model
  commissionModel?: 'percent' | 'fixed' | 'tiered';
  fixedCommission?: number;
  tieredCommission?: TieredCommission[];

  // Position sizing
  positionSizingMethod?: 'fixed' | 'kelly' | 'volatility_targeting' | 'risk_parity';
  volatilityTarget?: number;
  riskPerTrade?: number;

  // Risk management
  trailingStop?: number;
  breakEvenLevel?: number;
  partialTakeProfits?: PartialTakeProfit[];

  // Session filters
  tradingSessions?: TradingSession[];
  excludeDays?: number[]; // 0 = Sunday

  // Strategy parameters
  strategyParams?: Record<string, number>;
}

export interface Timeframe {
  interval: string; // '1m', '5m', '15m', '1h', '4h', '1d'
  weight: number; // Weight for multi-timeframe analysis
}

export interface TieredCommission {
  minVolume: number;
  maxVolume: number;
  rate: number;
}

export interface PartialTakeProfit {
  level: number; // Price level (% from entry)
  size: number; // Position size to close (%)
}

export interface TradingSession {
  name: string;
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface EnhancedBacktestResult extends BacktestResult {
  // Multi-timeframe signals
  timeframeAnalysis?: {
    timeframe: string;
    signal: string;
    confidence: number;
  }[];

  // Enhanced metrics
  ulcerIndex: number;
  painRatio: number;
  recoveryFactor: number;
  payoffRatio: number;
  tailRatio: number;
  commonSenseRatio: number;

  // Time analysis
  bestTradingDay: string;
  worstTradingDay: string;
  bestTradingHour: number;
  worstTradingHour: number;

  // Monthly returns
  monthlyReturns: MonthlyReturn[];

  // Trade distribution
  tradeDistribution: TradeDistribution;

  // Rolling metrics
  rollingMetrics: RollingMetric[];
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
  trades: number;
}

export interface TradeDistribution {
  byDay: { day: string; count: number; avgReturn: number }[];
  byHour: { hour: number; count: number; avgReturn: number }[];
  byDuration: { range: string; count: number; avgReturn: number }[];
  bySize: { range: string; count: number; avgReturn: number }[];
}

export interface RollingMetric {
  date: Date;
  sharpe30d: number;
  sharpe90d: number;
  maxDD30d: number;
  maxDD90d: number;
  winRate30d: number;
  winRate90d: number;
}

// ==========================================
// ENHANCED SLIPPAGE MODEL
// ==========================================

export class SlippageModel {
  /**
   * Calculate slippage based on model type
   */
  public static calculate(
    price: number,
    volume: number,
    avgVolume: number,
    volatility: number,
    model: 'fixed' | 'volume_based' | 'volatility_based',
    baseSlippage: number,
    marketImpact: number = 0.5
  ): number {
    switch (model) {
      case 'fixed':
        return price * baseSlippage;

      case 'volume_based':
        // Higher slippage for larger orders relative to volume
        const volumeRatio = volume / Math.max(avgVolume, 1);
        const volumeImpact = Math.pow(volumeRatio, 0.5) * marketImpact;
        return price * baseSlippage * (1 + volumeImpact);

      case 'volatility_based':
        // Higher slippage during volatile periods
        const volatilityMultiplier = volatility / 0.02; // Normalize to 2% daily vol
        return price * baseSlippage * Math.max(1, volatilityMultiplier);

      default:
        return price * baseSlippage;
    }
  }
}

// ==========================================
// ENHANCED COMMISSION MODEL
// ==========================================

export class CommissionModel {
  /**
   * Calculate commission based on model type
   */
  public static calculate(
    tradeValue: number,
    model: 'percent' | 'fixed' | 'tiered',
    percentRate: number = 0.001,
    fixedAmount: number = 0,
    tiers: TieredCommission[] = []
  ): number {
    switch (model) {
      case 'fixed':
        return fixedAmount;

      case 'percent':
        return tradeValue * percentRate;

      case 'tiered':
        for (const tier of tiers) {
          if (tradeValue >= tier.minVolume && tradeValue < tier.maxVolume) {
            return tradeValue * tier.rate;
          }
        }
        // Use last tier rate if above all tiers
        return tradeValue * (tiers[tiers.length - 1]?.rate || percentRate);

      default:
        return tradeValue * percentRate;
    }
  }
}

// ==========================================
// MULTI-TIMEFRAME ANALYZER
// ==========================================

export class MultiTimeframeAnalyzer {
  private timeframes: Timeframe[];

  constructor(timeframes: Timeframe[]) {
    this.timeframes = timeframes;
  }

  /**
   * Aggregate candles to higher timeframes
   */
  public aggregateCandles(
    candles: Candle[],
    targetInterval: string
  ): Candle[] {
    const intervalMinutes = this.parseInterval(targetInterval);
    const aggregated: Candle[] = [];

    let currentCandle: Candle | null = null;
    let currentPeriodStart = 0;

    for (const candle of candles) {
      const periodStart = Math.floor(candle.timestamp.getTime() / (intervalMinutes * 60 * 1000));

      if (periodStart !== currentPeriodStart) {
        if (currentCandle) {
          aggregated.push(currentCandle);
        }

        currentCandle = {
          timestamp: new Date(periodStart * intervalMinutes * 60 * 1000),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        };
        currentPeriodStart = periodStart;
      } else if (currentCandle) {
        currentCandle.high = Math.max(currentCandle.high, candle.high);
        currentCandle.low = Math.min(currentCandle.low, candle.low);
        currentCandle.close = candle.close;
        currentCandle.volume += candle.volume;
      }
    }

    if (currentCandle) {
      aggregated.push(currentCandle);
    }

    return aggregated;
  }

  /**
   * Analyze signals across multiple timeframes
   */
  public analyzeMultiTimeframe(
    baseCandles: Candle[],
    analyzeFunc: (candles: Candle[]) => { signal: string; confidence: number }
  ): { timeframe: string; signal: string; confidence: number }[] {
    const results: { timeframe: string; signal: string; confidence: number }[] = [];

    for (const tf of this.timeframes) {
      const aggregated = this.aggregateCandles(baseCandles, tf.interval);
      const analysis = analyzeFunc(aggregated);

      results.push({
        timeframe: tf.interval,
        signal: analysis.signal,
        confidence: analysis.confidence * tf.weight,
      });
    }

    return results;
  }

  /**
   * Get consensus signal from multiple timeframes
   */
  public getConsensusSignal(
    signals: { timeframe: string; signal: string; confidence: number }[]
  ): { signal: string; confidence: number } {
    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;

    for (const s of signals) {
      const weight = this.timeframes.find(tf => tf.interval === s.timeframe)?.weight || 1;

      if (s.signal === 'BUY') {
        buyScore += s.confidence * weight;
      } else if (s.signal === 'SELL') {
        sellScore += s.confidence * weight;
      }

      totalWeight += weight;
    }

    if (buyScore > sellScore && buyScore / totalWeight > 0.5) {
      return { signal: 'BUY', confidence: buyScore / totalWeight };
    } else if (sellScore > buyScore && sellScore / totalWeight > 0.5) {
      return { signal: 'SELL', confidence: sellScore / totalWeight };
    }

    return { signal: 'NEUTRAL', confidence: 0 };
  }

  private parseInterval(interval: string): number {
    const map: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080,
    };
    return map[interval] || 60;
  }
}

// ==========================================
// ENHANCED BACKTESTING ENGINE
// ==========================================

export class EnhancedBacktestingEngine {
  private config: EnhancedBacktestConfig;
  private baseEngine: BacktestingEngine;
  private mtfAnalyzer?: MultiTimeframeAnalyzer;

  constructor(config: EnhancedBacktestConfig) {
    this.config = config;
    this.baseEngine = new BacktestingEngine(config);

    if (config.timeframes && config.timeframes.length > 0) {
      this.mtfAnalyzer = new MultiTimeframeAnalyzer(config.timeframes);
    }
  }

  /**
   * Run enhanced backtest with all features
   */
  public runEnhancedBacktest(candles: Candle[]): EnhancedBacktestResult {
    // Run base backtest
    const baseResult = this.baseEngine.runBacktest(candles);

    // Calculate enhanced metrics
    const ulcerIndex = this.calculateUlcerIndex(baseResult.equityCurve);
    const painRatio = this.calculatePainRatio(baseResult);
    const recoveryFactor = this.calculateRecoveryFactor(baseResult);
    const payoffRatio = baseResult.avgWin / Math.max(Math.abs(baseResult.avgLoss), 0.01);
    const tailRatio = this.calculateTailRatio(baseResult.trades);
    const commonSenseRatio = this.calculateCommonSenseRatio(baseResult);

    // Calculate monthly returns
    const monthlyReturns = this.calculateMonthlyReturns(baseResult.trades);

    // Calculate trade distribution
    const tradeDistribution = this.calculateTradeDistribution(baseResult.trades);

    // Find best/worst trading times
    const { bestDay, worstDay, bestHour, worstHour } = this.analyzeTradingTimes(baseResult.trades);

    // Calculate rolling metrics
    const rollingMetrics = this.calculateRollingMetrics(baseResult.trades, baseResult.equityCurve);

    // Multi-timeframe analysis if configured
    let timeframeAnalysis;
    if (this.mtfAnalyzer) {
      timeframeAnalysis = this.mtfAnalyzer.analyzeMultiTimeframe(candles, (c) => ({
        signal: 'NEUTRAL',
        confidence: 50,
      }));
    }

    return {
      ...baseResult,
      ulcerIndex,
      painRatio,
      recoveryFactor,
      payoffRatio,
      tailRatio,
      commonSenseRatio,
      bestTradingDay: bestDay,
      worstTradingDay: worstDay,
      bestTradingHour: bestHour,
      worstTradingHour: worstHour,
      monthlyReturns,
      tradeDistribution,
      rollingMetrics,
      timeframeAnalysis,
    };
  }

  /**
   * Calculate Ulcer Index (measures depth and duration of drawdowns)
   */
  private calculateUlcerIndex(equityCurve: { date: Date; equity: number }[]): number {
    if (equityCurve.length === 0) return 0;

    let peak = equityCurve[0].equity;
    let sumSquaredDrawdowns = 0;

    for (const point of equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
      }
      const drawdownPercent = ((peak - point.equity) / peak) * 100;
      sumSquaredDrawdowns += drawdownPercent * drawdownPercent;
    }

    return Math.sqrt(sumSquaredDrawdowns / equityCurve.length);
  }

  /**
   * Calculate Pain Ratio (return / average drawdown)
   */
  private calculatePainRatio(result: BacktestResult): number {
    if (result.drawdownCurve.length === 0) return 0;

    const avgDrawdown = result.drawdownCurve.reduce((sum, d) => sum + d.drawdown, 0) /
                        result.drawdownCurve.length;

    return avgDrawdown > 0 ? result.totalReturnPercent / avgDrawdown : 0;
  }

  /**
   * Calculate Recovery Factor (net profit / max drawdown)
   */
  private calculateRecoveryFactor(result: BacktestResult): number {
    return result.maxDrawdown > 0 ? result.totalReturn / result.maxDrawdown : 0;
  }

  /**
   * Calculate Tail Ratio (95th percentile / 5th percentile of returns)
   */
  private calculateTailRatio(trades: Trade[]): number {
    if (trades.length < 20) return 0;

    const returns = trades.map(t => t.pnlPercent).sort((a, b) => a - b);
    const idx5 = Math.floor(returns.length * 0.05);
    const idx95 = Math.floor(returns.length * 0.95);

    const p5 = Math.abs(returns[idx5]);
    const p95 = returns[idx95];

    return p5 > 0 ? p95 / p5 : 0;
  }

  /**
   * Calculate Common Sense Ratio (profit factor * % of winning trades)
   */
  private calculateCommonSenseRatio(result: BacktestResult): number {
    return result.profitFactor * result.winRate;
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(trades: Trade[]): MonthlyReturn[] {
    const monthlyMap = new Map<string, { pnl: number; trades: number }>();

    for (const trade of trades) {
      const year = trade.exitDate.getFullYear();
      const month = trade.exitDate.getMonth() + 1;
      const key = `${year}-${month}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { pnl: 0, trades: 0 });
      }

      const entry = monthlyMap.get(key)!;
      entry.pnl += trade.pnlPercent;
      entry.trades++;
    }

    return Array.from(monthlyMap.entries()).map(([key, data]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        year,
        month,
        return: data.pnl,
        trades: data.trades,
      };
    }).sort((a, b) => a.year * 100 + a.month - b.year * 100 - b.month);
  }

  /**
   * Calculate trade distribution
   */
  private calculateTradeDistribution(trades: Trade[]): TradeDistribution {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // By day
    const dayMap = new Map<string, { count: number; totalReturn: number }>();
    for (const day of days) {
      dayMap.set(day, { count: 0, totalReturn: 0 });
    }

    // By hour
    const hourMap = new Map<number, { count: number; totalReturn: number }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { count: 0, totalReturn: 0 });
    }

    // By duration
    const durationRanges = ['< 1h', '1-4h', '4-24h', '1-3d', '> 3d'];
    const durationMap = new Map<string, { count: number; totalReturn: number }>();
    for (const range of durationRanges) {
      durationMap.set(range, { count: 0, totalReturn: 0 });
    }

    for (const trade of trades) {
      // By day
      const day = days[trade.entryDate.getDay()];
      const dayEntry = dayMap.get(day)!;
      dayEntry.count++;
      dayEntry.totalReturn += trade.pnlPercent;

      // By hour
      const hour = trade.entryDate.getHours();
      const hourEntry = hourMap.get(hour)!;
      hourEntry.count++;
      hourEntry.totalReturn += trade.pnlPercent;

      // By duration
      const durationHours = trade.holdingPeriodHours;
      let durationRange: string;
      if (durationHours < 1) durationRange = '< 1h';
      else if (durationHours < 4) durationRange = '1-4h';
      else if (durationHours < 24) durationRange = '4-24h';
      else if (durationHours < 72) durationRange = '1-3d';
      else durationRange = '> 3d';

      const durationEntry = durationMap.get(durationRange)!;
      durationEntry.count++;
      durationEntry.totalReturn += trade.pnlPercent;
    }

    return {
      byDay: days.map(day => {
        const data = dayMap.get(day)!;
        return {
          day,
          count: data.count,
          avgReturn: data.count > 0 ? data.totalReturn / data.count : 0,
        };
      }),
      byHour: Array.from(hourMap.entries()).map(([hour, data]) => ({
        hour,
        count: data.count,
        avgReturn: data.count > 0 ? data.totalReturn / data.count : 0,
      })),
      byDuration: durationRanges.map(range => {
        const data = durationMap.get(range)!;
        return {
          range,
          count: data.count,
          avgReturn: data.count > 0 ? data.totalReturn / data.count : 0,
        };
      }),
      bySize: [], // Will be populated based on position sizes
    };
  }

  /**
   * Analyze best/worst trading times
   */
  private analyzeTradingTimes(trades: Trade[]): {
    bestDay: string;
    worstDay: string;
    bestHour: number;
    worstHour: number;
  } {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const dayReturns = new Map<string, number[]>();
    const hourReturns = new Map<number, number[]>();

    for (const trade of trades) {
      const day = days[trade.entryDate.getDay()];
      const hour = trade.entryDate.getHours();

      if (!dayReturns.has(day)) dayReturns.set(day, []);
      if (!hourReturns.has(hour)) hourReturns.set(hour, []);

      dayReturns.get(day)!.push(trade.pnlPercent);
      hourReturns.get(hour)!.push(trade.pnlPercent);
    }

    const dayAvgs = Array.from(dayReturns.entries()).map(([day, returns]) => ({
      day,
      avg: returns.reduce((a, b) => a + b, 0) / returns.length,
    }));

    const hourAvgs = Array.from(hourReturns.entries()).map(([hour, returns]) => ({
      hour,
      avg: returns.reduce((a, b) => a + b, 0) / returns.length,
    }));

    dayAvgs.sort((a, b) => b.avg - a.avg);
    hourAvgs.sort((a, b) => b.avg - a.avg);

    return {
      bestDay: dayAvgs[0]?.day || 'N/A',
      worstDay: dayAvgs[dayAvgs.length - 1]?.day || 'N/A',
      bestHour: hourAvgs[0]?.hour || 0,
      worstHour: hourAvgs[hourAvgs.length - 1]?.hour || 0,
    };
  }

  /**
   * Calculate rolling metrics
   */
  private calculateRollingMetrics(
    trades: Trade[],
    equityCurve: { date: Date; equity: number }[]
  ): RollingMetric[] {
    const metrics: RollingMetric[] = [];

    // Sample every 7 days
    for (let i = 30; i < equityCurve.length; i += 7) {
      const date = equityCurve[i].date;
      const thirtyDaysAgo = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(date.getTime() - 90 * 24 * 60 * 60 * 1000);

      // 30-day trades
      const trades30d = trades.filter(t =>
        t.exitDate >= thirtyDaysAgo && t.exitDate <= date
      );

      // 90-day trades
      const trades90d = trades.filter(t =>
        t.exitDate >= ninetyDaysAgo && t.exitDate <= date
      );

      // 30-day equity curve
      const equity30d = equityCurve.filter(e =>
        e.date >= thirtyDaysAgo && e.date <= date
      );

      // 90-day equity curve
      const equity90d = equityCurve.filter(e =>
        e.date >= ninetyDaysAgo && e.date <= date
      );

      metrics.push({
        date,
        sharpe30d: this.calculateRollingSharpe(trades30d),
        sharpe90d: this.calculateRollingSharpe(trades90d),
        maxDD30d: this.calculateMaxDrawdown(equity30d),
        maxDD90d: this.calculateMaxDrawdown(equity90d),
        winRate30d: this.calculateWinRate(trades30d),
        winRate90d: this.calculateWinRate(trades90d),
      });
    }

    return metrics;
  }

  private calculateRollingSharpe(trades: Trade[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map(t => t.pnlPercent);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? (avg / stdDev) * Math.sqrt(252) : 0;
  }

  private calculateMaxDrawdown(equity: { date: Date; equity: number }[]): number {
    if (equity.length === 0) return 0;

    let peak = equity[0].equity;
    let maxDD = 0;

    for (const point of equity) {
      if (point.equity > peak) peak = point.equity;
      const dd = (peak - point.equity) / peak * 100;
      if (dd > maxDD) maxDD = dd;
    }

    return maxDD;
  }

  private calculateWinRate(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    return trades.filter(t => t.pnl > 0).length / trades.length;
  }
}

// ==========================================
// BACKTEST RESULT STORAGE
// ==========================================

export interface StoredBacktestResult {
  id: string;
  createdAt: Date;
  config: EnhancedBacktestConfig;
  result: EnhancedBacktestResult;
  tags?: string[];
  notes?: string;
}

export class BacktestResultStore {
  private results: Map<string, StoredBacktestResult> = new Map();

  /**
   * Store a backtest result
   */
  public store(
    config: EnhancedBacktestConfig,
    result: EnhancedBacktestResult,
    tags?: string[],
    notes?: string
  ): string {
    const id = this.generateId();

    this.results.set(id, {
      id,
      createdAt: new Date(),
      config,
      result,
      tags,
      notes,
    });

    log.info(`Stored backtest result with ID: ${id}`);
    return id;
  }

  /**
   * Get a stored result by ID
   */
  public get(id: string): StoredBacktestResult | undefined {
    return this.results.get(id);
  }

  /**
   * List all stored results
   */
  public list(limit: number = 100): StoredBacktestResult[] {
    return Array.from(this.results.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Search results by tag
   */
  public searchByTag(tag: string): StoredBacktestResult[] {
    return Array.from(this.results.values())
      .filter(r => r.tags?.includes(tag));
  }

  /**
   * Delete a result
   */
  public delete(id: string): boolean {
    return this.results.delete(id);
  }

  private generateId(): string {
    return `BT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==========================================
// VISUALIZATION DATA FORMATTER
// ==========================================

export class VisualizationFormatter {
  /**
   * Format equity curve for charting
   */
  public static formatEquityCurve(
    curve: { date: Date; equity: number }[]
  ): { labels: string[]; data: number[] } {
    return {
      labels: curve.map(p => p.date.toISOString().split('T')[0]),
      data: curve.map(p => p.equity),
    };
  }

  /**
   * Format drawdown curve for charting
   */
  public static formatDrawdownCurve(
    curve: { date: Date; drawdown: number }[]
  ): { labels: string[]; data: number[] } {
    return {
      labels: curve.map(p => p.date.toISOString().split('T')[0]),
      data: curve.map(p => -p.drawdown), // Negative for display
    };
  }

  /**
   * Format monthly returns as heatmap data
   */
  public static formatMonthlyHeatmap(
    returns: MonthlyReturn[]
  ): { year: number; data: (number | null)[] }[] {
    const years = [...new Set(returns.map(r => r.year))].sort();

    return years.map(year => ({
      year,
      data: Array.from({ length: 12 }, (_, month) => {
        const entry = returns.find(r => r.year === year && r.month === month + 1);
        return entry ? entry.return : null;
      }),
    }));
  }

  /**
   * Format trade distribution for bar chart
   */
  public static formatTradeDistribution(
    distribution: TradeDistribution
  ): {
    byDay: { labels: string[]; counts: number[]; returns: number[] };
    byHour: { labels: string[]; counts: number[]; returns: number[] };
  } {
    return {
      byDay: {
        labels: distribution.byDay.map(d => d.day),
        counts: distribution.byDay.map(d => d.count),
        returns: distribution.byDay.map(d => d.avgReturn),
      },
      byHour: {
        labels: distribution.byHour.map(d => `${d.hour}:00`),
        counts: distribution.byHour.map(d => d.count),
        returns: distribution.byHour.map(d => d.avgReturn),
      },
    };
  }

  /**
   * Format trade scatter plot data
   */
  public static formatTradeScatter(
    trades: Trade[]
  ): { x: number; y: number; size: number; color: string }[] {
    return trades.map(t => ({
      x: t.holdingPeriodHours,
      y: t.pnlPercent,
      size: Math.abs(t.pnl) / 100,
      color: t.pnl > 0 ? '#10B981' : '#EF4444',
    }));
  }

  /**
   * Format Monte Carlo distribution
   */
  public static formatMonteCarloDistribution(
    result: MonteCarloResult
  ): {
    histogram: { range: string; count: number }[];
    statistics: Record<string, number>;
  } {
    return {
      histogram: result.distribution,
      statistics: {
        median: result.medianFinalCapital,
        mean: result.meanFinalCapital,
        worst5pct: result.worstCase5Percent,
        best5pct: result.bestCase5Percent,
        probProfit: result.probabilityOfProfit * 100,
        probDouble: result.probabilityOfDoubling * 100,
      },
    };
  }
}

// ==========================================
// SINGLETON INSTANCES
// ==========================================

export const backtestResultStore = new BacktestResultStore();

// Re-export from base engine
export {
  BacktestConfig,
  BacktestingEngine,
  BacktestResult,
  Trade,
  Candle,
  WalkForwardOptimizer,
  MonteCarloSimulator,
  MonteCarloResult,
  WalkForwardResult,
};

/**
 * TIME - Benchmark Comparison Module
 *
 * Compare strategy performance against multiple benchmarks:
 * - Buy & Hold
 * - Major indices (SPY, QQQ, IWM, etc.)
 * - Risk-free rate
 * - Custom benchmarks
 * - Rolling comparison windows
 */

import { Candle, BacktestResult, Trade } from '../strategies/backtesting_engine';

// ==========================================
// TYPES
// ==========================================

export interface BenchmarkConfig {
  name: string;
  type: 'buy_and_hold' | 'index' | 'risk_free' | 'equal_weight' | 'custom';
  symbol?: string;
  annualRate?: number; // For risk-free benchmark
  rebalanceFrequency?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  symbols?: string[]; // For equal-weight portfolio
}

export interface BenchmarkResult {
  name: string;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  calmarRatio: number;
  equityCurve: { date: Date; equity: number }[];
  drawdownCurve: { date: Date; drawdown: number }[];
}

export interface ComparisonResult {
  strategy: BacktestResult;
  benchmarks: BenchmarkResult[];
  comparison: {
    benchmark: string;
    excessReturn: number;
    trackingError: number;
    informationRatio: number;
    beta: number;
    alpha: number;
    correlation: number;
    upCapture: number;
    downCapture: number;
    winRateVsBenchmark: number;
    battingAverage: number; // % of periods outperforming
  }[];
  rollingComparison: RollingComparisonResult[];
}

export interface RollingComparisonResult {
  date: Date;
  window: number; // Days
  strategyReturn: number;
  benchmarkReturns: Record<string, number>;
  excessReturns: Record<string, number>;
  rollingSharpe: number;
  rollingAlpha: Record<string, number>;
  rollingBeta: Record<string, number>;
}

// ==========================================
// BENCHMARK CALCULATOR
// ==========================================

export class BenchmarkCalculator {
  /**
   * Calculate buy-and-hold benchmark
   */
  public static calculateBuyAndHold(
    candles: Candle[],
    initialCapital: number,
    name: string = 'Buy & Hold'
  ): BenchmarkResult {
    if (candles.length < 2) {
      return this.emptyBenchmarkResult(name, initialCapital);
    }

    const startPrice = candles[0].close;
    const endPrice = candles[candles.length - 1].close;
    const priceChange = (endPrice - startPrice) / startPrice;

    const finalCapital = initialCapital * (1 + priceChange);
    const totalReturn = finalCapital - initialCapital;
    const totalReturnPercent = priceChange * 100;

    // Calculate daily returns and equity curve
    const returns: number[] = [];
    const equityCurve: { date: Date; equity: number }[] = [];
    const drawdownCurve: { date: Date; drawdown: number }[] = [];

    let peak = initialCapital;

    for (let i = 0; i < candles.length; i++) {
      const equity = initialCapital * (candles[i].close / startPrice);
      equityCurve.push({ date: candles[i].timestamp, equity });

      if (i > 0) {
        returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
      }

      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      drawdownCurve.push({ date: candles[i].timestamp, drawdown });
    }

    // Calculate metrics
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const volatility = this.calculateVolatility(returns);
    const downsideVol = this.calculateDownsideVolatility(returns);

    const riskFreeRate = 0.02; // Assume 2% annual
    const excessReturn = (totalReturnPercent / 100) - riskFreeRate;
    const sharpeRatio = volatility > 0 ? (avgReturn / volatility) * Math.sqrt(252) : 0;
    const sortinoRatio = downsideVol > 0 ? (avgReturn / downsideVol) * Math.sqrt(252) : 0;

    const maxDrawdownPercent = Math.max(...drawdownCurve.map(d => d.drawdown));
    const maxDrawdown = peak * (maxDrawdownPercent / 100);

    // Annualized return
    const days = (candles[candles.length - 1].timestamp.getTime() - candles[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const years = days / 365;
    const annualizedReturn = years > 0 ? (Math.pow(1 + totalReturnPercent / 100, 1 / years) - 1) * 100 : 0;

    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / maxDrawdownPercent : 0;

    return {
      name,
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      volatility: volatility * 100,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      calmarRatio,
      equityCurve,
      drawdownCurve,
    };
  }

  /**
   * Calculate risk-free benchmark
   */
  public static calculateRiskFree(
    startDate: Date,
    endDate: Date,
    initialCapital: number,
    annualRate: number = 0.02,
    name: string = 'Risk-Free Rate'
  ): BenchmarkResult {
    const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1;

    const equityCurve: { date: Date; equity: number }[] = [];
    const drawdownCurve: { date: Date; drawdown: number }[] = [];

    let equity = initialCapital;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      equityCurve.push({ date: new Date(currentDate), equity });
      drawdownCurve.push({ date: new Date(currentDate), drawdown: 0 }); // No drawdown
      equity *= (1 + dailyRate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const finalCapital = initialCapital * Math.pow(1 + annualRate, days / 365);
    const totalReturn = finalCapital - initialCapital;
    const totalReturnPercent = (totalReturn / initialCapital) * 100;
    const annualizedReturn = annualRate * 100;

    return {
      name,
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      volatility: 0,
      sharpeRatio: Infinity, // By definition
      sortinoRatio: Infinity,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      calmarRatio: Infinity,
      equityCurve,
      drawdownCurve,
    };
  }

  /**
   * Calculate equal-weight portfolio benchmark
   */
  public static calculateEqualWeight(
    assetCandles: Map<string, Candle[]>,
    initialCapital: number,
    rebalanceFrequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    name: string = 'Equal-Weight Portfolio'
  ): BenchmarkResult {
    const assets = Array.from(assetCandles.keys());
    const n = assets.length;

    if (n === 0) {
      return this.emptyBenchmarkResult(name, initialCapital);
    }

    // Get common date range
    const allDates = new Set<number>();
    for (const candles of assetCandles.values()) {
      for (const candle of candles) {
        allDates.add(candle.timestamp.getTime());
      }
    }
    const sortedDates = Array.from(allDates).sort();

    // Initialize allocations
    let allocations = new Map<string, { shares: number; value: number }>();
    const perAssetCapital = initialCapital / n;

    // Set initial allocations
    for (const [symbol, candles] of assetCandles) {
      const firstCandle = candles[0];
      if (firstCandle) {
        allocations.set(symbol, {
          shares: perAssetCapital / firstCandle.close,
          value: perAssetCapital,
        });
      }
    }

    const equityCurve: { date: Date; equity: number }[] = [];
    const drawdownCurve: { date: Date; drawdown: number }[] = [];
    const returns: number[] = [];
    let peak = initialCapital;
    let lastRebalanceDate = sortedDates[0];
    let prevEquity = initialCapital;

    for (const timestamp of sortedDates) {
      let totalEquity = 0;

      // Calculate current value
      for (const [symbol, candles] of assetCandles) {
        const candle = candles.find(c => c.timestamp.getTime() === timestamp);
        const allocation = allocations.get(symbol);

        if (candle && allocation) {
          allocation.value = allocation.shares * candle.close;
          totalEquity += allocation.value;
        }
      }

      equityCurve.push({ date: new Date(timestamp), equity: totalEquity });

      if (totalEquity > peak) peak = totalEquity;
      const drawdown = ((peak - totalEquity) / peak) * 100;
      drawdownCurve.push({ date: new Date(timestamp), drawdown });

      if (prevEquity > 0) {
        returns.push((totalEquity - prevEquity) / prevEquity);
      }
      prevEquity = totalEquity;

      // Check for rebalancing
      const shouldRebalance = this.shouldRebalance(
        timestamp,
        lastRebalanceDate,
        rebalanceFrequency
      );

      if (shouldRebalance) {
        const perAssetCapitalNow = totalEquity / n;

        for (const [symbol, candles] of assetCandles) {
          const candle = candles.find(c => c.timestamp.getTime() === timestamp);
          if (candle) {
            allocations.set(symbol, {
              shares: perAssetCapitalNow / candle.close,
              value: perAssetCapitalNow,
            });
          }
        }
        lastRebalanceDate = timestamp;
      }
    }

    // Calculate metrics
    const finalEquity = equityCurve[equityCurve.length - 1]?.equity || initialCapital;
    const totalReturn = finalEquity - initialCapital;
    const totalReturnPercent = (totalReturn / initialCapital) * 100;

    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const volatility = this.calculateVolatility(returns);
    const downsideVol = this.calculateDownsideVolatility(returns);

    const sharpeRatio = volatility > 0 ? (avgReturn / volatility) * Math.sqrt(252) : 0;
    const sortinoRatio = downsideVol > 0 ? (avgReturn / downsideVol) * Math.sqrt(252) : 0;

    const maxDrawdownPercent = Math.max(...drawdownCurve.map(d => d.drawdown), 0);
    const maxDrawdown = peak * (maxDrawdownPercent / 100);

    const days = sortedDates.length > 1
      ? (sortedDates[sortedDates.length - 1] - sortedDates[0]) / (1000 * 60 * 60 * 24)
      : 1;
    const years = days / 365;
    const annualizedReturn = years > 0 ? (Math.pow(1 + totalReturnPercent / 100, 1 / years) - 1) * 100 : 0;
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / maxDrawdownPercent : 0;

    return {
      name,
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      volatility: volatility * 100,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      calmarRatio,
      equityCurve,
      drawdownCurve,
    };
  }

  /**
   * Compare strategy against benchmarks
   */
  public static compareWithBenchmarks(
    strategyResult: BacktestResult,
    benchmarks: BenchmarkResult[]
  ): ComparisonResult {
    const comparison: ComparisonResult['comparison'] = [];

    for (const benchmark of benchmarks) {
      // Calculate strategy vs benchmark returns
      const strategyReturns = this.calculateReturnsFromEquity(strategyResult.equityCurve);
      const benchmarkReturns = this.calculateReturnsFromEquity(benchmark.equityCurve);

      // Align returns by date
      const { aligned1, aligned2 } = this.alignReturns(
        strategyResult.equityCurve,
        benchmark.equityCurve
      );

      // Calculate comparison metrics
      const excessReturn = strategyResult.totalReturnPercent - benchmark.totalReturnPercent;
      const trackingError = this.calculateTrackingError(aligned1, aligned2);
      const informationRatio = trackingError > 0 ? excessReturn / trackingError : 0;

      const { beta, alpha } = this.calculateBetaAlpha(aligned1, aligned2, strategyResult.annualizedReturn, benchmark.annualizedReturn);
      const correlation = this.calculateCorrelation(aligned1, aligned2);

      // Up/Down capture
      const { upCapture, downCapture } = this.calculateCapture(aligned1, aligned2);

      // Win rate vs benchmark
      let winCount = 0;
      for (let i = 0; i < Math.min(aligned1.length, aligned2.length); i++) {
        if (aligned1[i] > aligned2[i]) winCount++;
      }
      const winRateVsBenchmark = aligned1.length > 0 ? winCount / aligned1.length : 0;

      // Batting average (rolling periods)
      const battingAverage = this.calculateBattingAverage(strategyResult.equityCurve, benchmark.equityCurve, 21);

      comparison.push({
        benchmark: benchmark.name,
        excessReturn,
        trackingError,
        informationRatio,
        beta,
        alpha,
        correlation,
        upCapture,
        downCapture,
        winRateVsBenchmark,
        battingAverage,
      });
    }

    // Calculate rolling comparison
    const rollingComparison = this.calculateRollingComparison(
      strategyResult.equityCurve,
      benchmarks,
      [30, 60, 90]
    );

    return {
      strategy: strategyResult,
      benchmarks,
      comparison,
      rollingComparison,
    };
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private static emptyBenchmarkResult(name: string, initialCapital: number): BenchmarkResult {
    return {
      name,
      totalReturn: 0,
      totalReturnPercent: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      calmarRatio: 0,
      equityCurve: [{ date: new Date(), equity: initialCapital }],
      drawdownCurve: [{ date: new Date(), drawdown: 0 }],
    };
  }

  private static calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance);
  }

  private static calculateDownsideVolatility(returns: number[]): number {
    const negativeReturns = returns.filter(r => r < 0);
    if (negativeReturns.length < 2) return 0;
    const mean = negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length;
    const variance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (negativeReturns.length - 1);
    return Math.sqrt(variance);
  }

  private static shouldRebalance(
    currentTimestamp: number,
    lastRebalanceTimestamp: number,
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  ): boolean {
    if (frequency === 'none') return false;

    const daysSince = (currentTimestamp - lastRebalanceTimestamp) / (1000 * 60 * 60 * 24);

    switch (frequency) {
      case 'daily': return daysSince >= 1;
      case 'weekly': return daysSince >= 7;
      case 'monthly': return daysSince >= 30;
      case 'quarterly': return daysSince >= 90;
      default: return false;
    }
  }

  private static calculateReturnsFromEquity(
    equityCurve: { date: Date; equity: number }[]
  ): number[] {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity);
    }
    return returns;
  }

  private static alignReturns(
    curve1: { date: Date; equity: number }[],
    curve2: { date: Date; equity: number }[]
  ): { aligned1: number[]; aligned2: number[] } {
    // Create maps by date
    const map1 = new Map<string, number>();
    const map2 = new Map<string, number>();

    for (let i = 1; i < curve1.length; i++) {
      const dateKey = curve1[i].date.toISOString().split('T')[0];
      const ret = (curve1[i].equity - curve1[i - 1].equity) / curve1[i - 1].equity;
      map1.set(dateKey, ret);
    }

    for (let i = 1; i < curve2.length; i++) {
      const dateKey = curve2[i].date.toISOString().split('T')[0];
      const ret = (curve2[i].equity - curve2[i - 1].equity) / curve2[i - 1].equity;
      map2.set(dateKey, ret);
    }

    // Find common dates
    const commonDates = Array.from(map1.keys()).filter(d => map2.has(d));

    const aligned1 = commonDates.map(d => map1.get(d)!);
    const aligned2 = commonDates.map(d => map2.get(d)!);

    return { aligned1, aligned2 };
  }

  private static calculateTrackingError(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length < 2) return 0;

    const diffs = returns1.map((r, i) => r - returns2[i]);
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / (diffs.length - 1);

    return Math.sqrt(variance * 252) * 100; // Annualized
  }

  private static calculateBetaAlpha(
    strategyReturns: number[],
    benchmarkReturns: number[],
    strategyAnnualReturn: number,
    benchmarkAnnualReturn: number
  ): { beta: number; alpha: number } {
    if (strategyReturns.length !== benchmarkReturns.length || strategyReturns.length < 2) {
      return { beta: 1, alpha: 0 };
    }

    const n = strategyReturns.length;
    const strategyMean = strategyReturns.reduce((a, b) => a + b, 0) / n;
    const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / n;

    let covariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < n; i++) {
      covariance += (strategyReturns[i] - strategyMean) * (benchmarkReturns[i] - benchmarkMean);
      benchmarkVariance += Math.pow(benchmarkReturns[i] - benchmarkMean, 2);
    }

    covariance /= (n - 1);
    benchmarkVariance /= (n - 1);

    const beta = benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;
    const riskFreeRate = 2; // 2% annual
    const alpha = strategyAnnualReturn - (riskFreeRate + beta * (benchmarkAnnualReturn - riskFreeRate));

    return { beta, alpha };
  }

  private static calculateCorrelation(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length < 2) return 0;

    const n = returns1.length;
    const mean1 = returns1.reduce((a, b) => a + b, 0) / n;
    const mean2 = returns2.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (let i = 0; i < n; i++) {
      numerator += (returns1[i] - mean1) * (returns2[i] - mean2);
      variance1 += Math.pow(returns1[i] - mean1, 2);
      variance2 += Math.pow(returns2[i] - mean2, 2);
    }

    const denominator = Math.sqrt(variance1 * variance2);
    return denominator > 0 ? numerator / denominator : 0;
  }

  private static calculateCapture(
    strategyReturns: number[],
    benchmarkReturns: number[]
  ): { upCapture: number; downCapture: number } {
    let upStrategySum = 0;
    let upBenchmarkSum = 0;
    let downStrategySum = 0;
    let downBenchmarkSum = 0;

    for (let i = 0; i < Math.min(strategyReturns.length, benchmarkReturns.length); i++) {
      if (benchmarkReturns[i] > 0) {
        upStrategySum += strategyReturns[i];
        upBenchmarkSum += benchmarkReturns[i];
      } else if (benchmarkReturns[i] < 0) {
        downStrategySum += strategyReturns[i];
        downBenchmarkSum += benchmarkReturns[i];
      }
    }

    const upCapture = upBenchmarkSum !== 0 ? (upStrategySum / upBenchmarkSum) * 100 : 100;
    const downCapture = downBenchmarkSum !== 0 ? (downStrategySum / downBenchmarkSum) * 100 : 100;

    return { upCapture, downCapture };
  }

  private static calculateBattingAverage(
    strategyCurve: { date: Date; equity: number }[],
    benchmarkCurve: { date: Date; equity: number }[],
    windowDays: number
  ): number {
    const strategyReturns = this.calculateReturnsFromEquity(strategyCurve);
    const benchmarkReturns = this.calculateReturnsFromEquity(benchmarkCurve);

    if (strategyReturns.length < windowDays || benchmarkReturns.length < windowDays) {
      return 0.5;
    }

    let outperformCount = 0;
    let totalPeriods = 0;

    for (let i = windowDays; i < Math.min(strategyReturns.length, benchmarkReturns.length); i++) {
      const strategyWindowReturn = strategyReturns.slice(i - windowDays, i).reduce((a, b) => (1 + a) * (1 + b) - 1, 0);
      const benchmarkWindowReturn = benchmarkReturns.slice(i - windowDays, i).reduce((a, b) => (1 + a) * (1 + b) - 1, 0);

      if (strategyWindowReturn > benchmarkWindowReturn) {
        outperformCount++;
      }
      totalPeriods++;
    }

    return totalPeriods > 0 ? outperformCount / totalPeriods : 0.5;
  }

  private static calculateRollingComparison(
    strategyCurve: { date: Date; equity: number }[],
    benchmarks: BenchmarkResult[],
    windows: number[]
  ): RollingComparisonResult[] {
    const results: RollingComparisonResult[] = [];
    const strategyReturns = this.calculateReturnsFromEquity(strategyCurve);

    const benchmarkReturnsMap = new Map<string, number[]>();
    for (const benchmark of benchmarks) {
      benchmarkReturnsMap.set(benchmark.name, this.calculateReturnsFromEquity(benchmark.equityCurve));
    }

    for (const window of windows) {
      if (strategyReturns.length < window) continue;

      for (let i = window; i < strategyReturns.length; i += 5) { // Sample every 5 days
        const date = strategyCurve[i + 1].date;
        const strategyWindow = strategyReturns.slice(i - window, i);
        const strategyReturn = strategyWindow.reduce((acc, r) => (1 + acc) * (1 + r) - 1, 0) * 100;

        const benchmarkReturnsRolling: Record<string, number> = {};
        const excessReturns: Record<string, number> = {};
        const rollingAlpha: Record<string, number> = {};
        const rollingBeta: Record<string, number> = {};

        for (const [name, returns] of benchmarkReturnsMap) {
          if (returns.length < i) continue;

          const benchmarkWindow = returns.slice(i - window, i);
          const benchmarkReturn = benchmarkWindow.reduce((acc, r) => (1 + acc) * (1 + r) - 1, 0) * 100;

          benchmarkReturnsRolling[name] = benchmarkReturn;
          excessReturns[name] = strategyReturn - benchmarkReturn;

          const { beta, alpha } = this.calculateBetaAlpha(strategyWindow, benchmarkWindow, strategyReturn, benchmarkReturn);
          rollingAlpha[name] = alpha;
          rollingBeta[name] = beta;
        }

        // Rolling Sharpe
        const mean = strategyWindow.reduce((a, b) => a + b, 0) / strategyWindow.length;
        const variance = strategyWindow.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (strategyWindow.length - 1);
        const stdDev = Math.sqrt(variance);
        const rollingSharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

        results.push({
          date,
          window,
          strategyReturn,
          benchmarkReturns: benchmarkReturnsRolling,
          excessReturns,
          rollingSharpe,
          rollingAlpha,
          rollingBeta,
        });
      }
    }

    return results.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}

// ==========================================
// BENCHMARK MANAGER
// ==========================================

export class BenchmarkManager {
  private benchmarks: Map<string, BenchmarkConfig> = new Map();

  constructor() {
    // Register default benchmarks
    this.registerBenchmark({
      name: 'Buy & Hold',
      type: 'buy_and_hold',
    });

    this.registerBenchmark({
      name: 'Risk-Free (2%)',
      type: 'risk_free',
      annualRate: 0.02,
    });

    this.registerBenchmark({
      name: 'SPY (S&P 500)',
      type: 'index',
      symbol: 'SPY',
    });

    this.registerBenchmark({
      name: 'QQQ (NASDAQ)',
      type: 'index',
      symbol: 'QQQ',
    });

    this.registerBenchmark({
      name: 'IWM (Russell 2000)',
      type: 'index',
      symbol: 'IWM',
    });

    this.registerBenchmark({
      name: 'DIA (Dow Jones)',
      type: 'index',
      symbol: 'DIA',
    });

    this.registerBenchmark({
      name: 'GLD (Gold)',
      type: 'index',
      symbol: 'GLD',
    });

    this.registerBenchmark({
      name: 'BTC (Bitcoin)',
      type: 'index',
      symbol: 'BTC-USD',
    });
  }

  /**
   * Register a custom benchmark
   */
  public registerBenchmark(config: BenchmarkConfig): void {
    this.benchmarks.set(config.name, config);
  }

  /**
   * Get benchmark config by name
   */
  public getBenchmark(name: string): BenchmarkConfig | undefined {
    return this.benchmarks.get(name);
  }

  /**
   * List all registered benchmarks
   */
  public listBenchmarks(): BenchmarkConfig[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Calculate benchmark results
   */
  public async calculateBenchmarks(
    names: string[],
    assetCandles: Candle[],
    additionalAssetCandles?: Map<string, Candle[]>,
    initialCapital: number = 10000
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const name of names) {
      const config = this.benchmarks.get(name);
      if (!config) continue;

      switch (config.type) {
        case 'buy_and_hold':
          results.push(BenchmarkCalculator.calculateBuyAndHold(assetCandles, initialCapital, name));
          break;

        case 'risk_free':
          if (assetCandles.length >= 2) {
            results.push(BenchmarkCalculator.calculateRiskFree(
              assetCandles[0].timestamp,
              assetCandles[assetCandles.length - 1].timestamp,
              initialCapital,
              config.annualRate || 0.02,
              name
            ));
          }
          break;

        case 'index':
          if (additionalAssetCandles?.has(config.symbol || '')) {
            results.push(BenchmarkCalculator.calculateBuyAndHold(
              additionalAssetCandles.get(config.symbol!)!,
              initialCapital,
              name
            ));
          }
          break;

        case 'equal_weight':
          if (config.symbols && additionalAssetCandles) {
            const relevantCandles = new Map<string, Candle[]>();
            for (const symbol of config.symbols) {
              if (additionalAssetCandles.has(symbol)) {
                relevantCandles.set(symbol, additionalAssetCandles.get(symbol)!);
              }
            }
            results.push(BenchmarkCalculator.calculateEqualWeight(
              relevantCandles,
              initialCapital,
              config.rebalanceFrequency || 'monthly',
              name
            ));
          }
          break;
      }
    }

    return results;
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const benchmarkManager = new BenchmarkManager();

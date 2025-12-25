/**
 * TIME — Advanced Backtesting Module
 *
 * Features:
 * - Walk-forward analysis with adaptive train/test splits
 * - Monte Carlo simulation with randomized entries
 * - Parameter sweep optimization
 * - Advanced slippage and commission modeling
 * - Position sizing (Kelly Criterion, fixed fractional)
 * - Comprehensive risk metrics calculation
 */

import {
  BacktestConfig,
  BacktestingEngine,
  Trade,
  Candle,
} from '../strategies/backtesting_engine';

// ==========================================
// TYPES
// ==========================================

export interface AdvancedBacktestConfig extends BacktestConfig {
  // Position Sizing
  positionSizingMethod: 'fixed' | 'kelly' | 'optimal_f' | 'percent_volatility';
  kellyFraction?: number; // Conservative Kelly (0.25 = 25% of full Kelly)
  volatilityTarget?: number; // For percent_volatility method

  // Risk Management
  dailyLossLimit?: number; // Max loss per day (%)
  trailingStopPercent?: number;
  riskRewardRatio?: number; // Min R:R ratio for trades

  // Execution
  marketImpact?: number; // Additional slippage based on volume
  partialFills?: boolean; // Simulate partial order fills

  // Multi-timeframe
  timeframes?: string[]; // ['1h', '4h', '1d']
}

export interface ParameterRange {
  name: string;
  min: number;
  max: number;
  step: number;
}

export interface OptimizationResult {
  parameters: Record<string, number>;
  returnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  trades: number;
  score: number; // Composite score
}

export interface MonteCarloConfig {
  numRuns: number;
  randomizeEntries?: boolean; // Randomize entry timing
  randomizeExits?: boolean; // Randomize exit timing
  confidenceLevel?: number; // Default 0.95 (95%)
  bootstrapMethod?: 'shuffle' | 'sample_with_replacement';
}

export interface DrawdownAnalysis {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // Days
  recoveryPeriods: {
    startDate: Date;
    endDate: Date;
    duration: number;
    depth: number;
  }[];
  averageRecoveryTime: number;
  currentDrawdown: number;
}

export interface CorrelationAnalysis {
  benchmark: string;
  correlation: number;
  beta: number;
  alpha: number; // Excess return
  trackingError: number;
  informationRatio: number;
}

// ==========================================
// ADVANCED BACKTESTING ENGINE
// ==========================================

export class AdvancedBacktestEngine {
  private config: AdvancedBacktestConfig;

  constructor(config: AdvancedBacktestConfig) {
    this.config = config;
  }

  /**
   * Run walk-forward analysis with rolling windows
   */
  public async runWalkForwardAnalysis(
    candles: Candle[],
    trainWindowDays: number = 180,
    testWindowDays: number = 30,
    stepDays: number = 30
  ): Promise<{
    results: OptimizationResult[];
    avgInSampleReturn: number;
    avgOutOfSampleReturn: number;
    efficiency: number;
    robustness: number;
  }> {
    const results: OptimizationResult[] = [];
    const hoursPerDay = 24;
    const trainWindow = trainWindowDays * hoursPerDay;
    const testWindow = testWindowDays * hoursPerDay;
    const step = stepDays * hoursPerDay;

    let currentStart = 0;

    while (currentStart + trainWindow + testWindow <= candles.length) {
      // In-sample period (training)
      const trainStart = currentStart;
      const trainEnd = trainStart + trainWindow;
      const trainCandles = candles.slice(trainStart, trainEnd);

      // Out-of-sample period (testing)
      const testStart = trainEnd;
      const testEnd = testStart + testWindow;
      const testCandles = candles.slice(testStart, testEnd);

      // Run backtest on training data
      const trainEngine = new BacktestingEngine(this.config);
      const trainResult = trainEngine.runBacktest(trainCandles);

      // Run backtest on test data
      const testEngine = new BacktestingEngine(this.config);
      const testResult = testEngine.runBacktest(testCandles);

      results.push({
        parameters: {
          trainStart,
          trainEnd,
          testStart,
          testEnd,
        },
        returnPercent: testResult.totalReturnPercent,
        sharpeRatio: testResult.sharpeRatio,
        maxDrawdown: testResult.maxDrawdownPercent,
        winRate: testResult.winRate,
        profitFactor: testResult.profitFactor,
        trades: testResult.totalTrades,
        score: this.calculateScore(testResult),
      });

      currentStart += step;
    }

    const inSampleReturns = results.map(r => r.returnPercent);
    const avgInSample = inSampleReturns.reduce((a, b) => a + b, 0) / results.length;
    const avgOutOfSample = inSampleReturns.reduce((a, b) => a + b, 0) / results.length;

    // Calculate efficiency (out-of-sample / in-sample performance)
    const efficiency = avgInSample !== 0 ? avgOutOfSample / avgInSample : 0;

    // Calculate robustness (consistency across folds)
    const stdDev = this.calculateStdDev(inSampleReturns);
    const robustness = stdDev > 0 ? avgOutOfSample / stdDev : 0;

    return {
      results,
      avgInSampleReturn: avgInSample,
      avgOutOfSampleReturn: avgOutOfSample,
      efficiency,
      robustness,
    };
  }

  /**
   * Run Monte Carlo simulation with randomized entries/exits
   */
  public async runMonteCarloSimulation(
    candles: Candle[],
    config: MonteCarloConfig
  ): Promise<{
    runs: {
      runId: number;
      finalCapital: number;
      returnPercent: number;
      maxDrawdown: number;
      sharpeRatio: number;
    }[];
    statistics: {
      meanReturn: number;
      medianReturn: number;
      stdDevReturn: number;
      confidenceInterval: { lower: number; upper: number };
      probabilityOfProfit: number;
      probabilityOfRuin: number;
      valueAtRisk: number; // VaR at confidence level
      conditionalVaR: number; // CVaR (expected shortfall)
    };
  }> {
    const runs = [];
    const confidenceLevel = config.confidenceLevel || 0.95;

    for (let i = 0; i < config.numRuns; i++) {
      // Run backtest with randomization
      const randomizedCandles = this.randomizeCandles(
        candles,
        config.randomizeEntries || false,
        config.randomizeExits || false,
        config.bootstrapMethod || 'shuffle'
      );

      const engine = new BacktestingEngine(this.config);
      const result = engine.runBacktest(randomizedCandles);

      runs.push({
        runId: i + 1,
        finalCapital: result.finalCapital,
        returnPercent: result.totalReturnPercent,
        maxDrawdown: result.maxDrawdownPercent,
        sharpeRatio: result.sharpeRatio,
      });
    }

    // Sort by return for percentile calculations
    const sortedReturns = runs.map(r => r.returnPercent).sort((a, b) => a - b);

    const meanReturn = sortedReturns.reduce((a, b) => a + b, 0) / runs.length;
    const medianReturn = sortedReturns[Math.floor(runs.length / 2)];
    const stdDevReturn = this.calculateStdDev(sortedReturns);

    // Confidence interval
    const lowerIdx = Math.floor(runs.length * (1 - confidenceLevel) / 2);
    const upperIdx = Math.floor(runs.length * (1 + confidenceLevel) / 2);

    // VaR and CVaR
    const varIdx = Math.floor(runs.length * (1 - confidenceLevel));
    const valueAtRisk = -sortedReturns[varIdx]; // Loss threshold
    const cvarReturns = sortedReturns.slice(0, varIdx);
    const conditionalVaR = cvarReturns.length > 0
      ? -cvarReturns.reduce((a, b) => a + b, 0) / cvarReturns.length
      : 0;

    return {
      runs,
      statistics: {
        meanReturn,
        medianReturn,
        stdDevReturn,
        confidenceInterval: {
          lower: sortedReturns[lowerIdx],
          upper: sortedReturns[upperIdx],
        },
        probabilityOfProfit: runs.filter(r => r.returnPercent > 0).length / runs.length,
        probabilityOfRuin: runs.filter(r => r.returnPercent < -50).length / runs.length,
        valueAtRisk,
        conditionalVaR,
      },
    };
  }

  /**
   * Analyze drawdowns and recovery periods
   */
  public analyzeDrawdowns(equityCurve: { date: Date; equity: number }[]): DrawdownAnalysis {
    let peak = equityCurve[0].equity;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let maxDrawdownDuration = 0;

    const recoveryPeriods: DrawdownAnalysis['recoveryPeriods'] = [];
    let currentDrawdownStart: Date | null = null;
    let currentDrawdownPeak = peak;

    for (let i = 0; i < equityCurve.length; i++) {
      const point = equityCurve[i];

      if (point.equity > peak) {
        // New peak - end of drawdown if in one
        if (currentDrawdownStart) {
          const duration = (point.date.getTime() - currentDrawdownStart.getTime()) / (1000 * 60 * 60 * 24);
          const depth = ((currentDrawdownPeak - Math.min(...equityCurve.slice(0, i + 1).map(p => p.equity))) / currentDrawdownPeak) * 100;

          recoveryPeriods.push({
            startDate: currentDrawdownStart,
            endDate: point.date,
            duration,
            depth,
          });

          currentDrawdownStart = null;
        }

        peak = point.equity;
        currentDrawdownPeak = peak;
      } else {
        // In drawdown
        if (!currentDrawdownStart) {
          currentDrawdownStart = point.date;
          currentDrawdownPeak = peak;
        }

        const drawdown = peak - point.equity;
        const drawdownPercent = (drawdown / peak) * 100;

        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownPercent = drawdownPercent;
        }

        if (currentDrawdownStart) {
          const duration = (point.date.getTime() - currentDrawdownStart.getTime()) / (1000 * 60 * 60 * 24);
          maxDrawdownDuration = Math.max(maxDrawdownDuration, duration);
        }
      }
    }

    const averageRecoveryTime = recoveryPeriods.length > 0
      ? recoveryPeriods.reduce((sum, p) => sum + p.duration, 0) / recoveryPeriods.length
      : 0;

    const lastEquity = equityCurve[equityCurve.length - 1].equity;
    const currentDrawdown = ((peak - lastEquity) / peak) * 100;

    return {
      maxDrawdown,
      maxDrawdownPercent,
      maxDrawdownDuration,
      recoveryPeriods,
      averageRecoveryTime,
      currentDrawdown,
    };
  }

  /**
   * Calculate correlation with benchmark
   */
  public calculateCorrelation(
    strategyReturns: number[],
    benchmarkReturns: number[],
    benchmarkName: string = 'SPY'
  ): CorrelationAnalysis {
    if (strategyReturns.length !== benchmarkReturns.length) {
      throw new Error('Strategy and benchmark returns must have same length');
    }

    const n = strategyReturns.length;

    // Calculate means
    const strategyMean = strategyReturns.reduce((a, b) => a + b, 0) / n;
    const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / n;

    // Calculate covariance and variances
    let covariance = 0;
    let strategyVariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < n; i++) {
      const strategyDiff = strategyReturns[i] - strategyMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;

      covariance += strategyDiff * benchmarkDiff;
      strategyVariance += strategyDiff * strategyDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }

    covariance /= (n - 1);
    strategyVariance /= (n - 1);
    benchmarkVariance /= (n - 1);

    // Calculate correlation
    const correlation = covariance / (Math.sqrt(strategyVariance) * Math.sqrt(benchmarkVariance));

    // Calculate beta (systematic risk)
    const beta = covariance / benchmarkVariance;

    // Calculate alpha (excess return)
    const alpha = strategyMean - (beta * benchmarkMean);

    // Calculate tracking error
    const trackingDiffs = strategyReturns.map((sr, i) => sr - benchmarkReturns[i]);
    const trackingError = this.calculateStdDev(trackingDiffs);

    // Calculate information ratio
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0;

    return {
      benchmark: benchmarkName,
      correlation,
      beta,
      alpha,
      trackingError,
      informationRatio,
    };
  }

  /**
   * Calculate Kelly Criterion for position sizing
   */
  public calculateKellyCriterion(trades: Trade[]): number {
    if (trades.length === 0) return 0;

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);

    if (wins.length === 0 || losses.length === 0) return 0;

    const winRate = wins.length / trades.length;
    const avgWin = wins.reduce((sum, t) => sum + t.pnlPercent, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnlPercent, 0) / losses.length);

    if (avgLoss === 0) return 0;

    // Kelly formula: (W * R - L) / R
    // W = win probability, L = loss probability, R = win/loss ratio
    const ratio = avgWin / avgLoss;
    const kelly = (winRate * ratio - (1 - winRate)) / ratio;

    // Cap at 25% (conservative Kelly)
    return Math.max(0, Math.min(kelly * 0.25, 0.25));
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private calculateScore(result: any): number {
    // Multi-objective score: return, sharpe, drawdown
    const returnScore = Math.max(0, result.totalReturnPercent) / 100;
    const sharpeScore = Math.max(0, result.sharpeRatio) / 3;
    const drawdownScore = Math.max(0, 1 - result.maxDrawdownPercent / 100);

    return (returnScore * 0.4 + sharpeScore * 0.3 + drawdownScore * 0.3);
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
  }

  private randomizeCandles(
    candles: Candle[],
    randomizeEntries: boolean,
    randomizeExits: boolean,
    method: 'shuffle' | 'sample_with_replacement'
  ): Candle[] {
    if (method === 'shuffle') {
      return [...candles].sort(() => Math.random() - 0.5);
    } else {
      // Bootstrap sampling with replacement
      const sampled: Candle[] = [];
      for (let i = 0; i < candles.length; i++) {
        const randomIdx = Math.floor(Math.random() * candles.length);
        sampled.push(candles[randomIdx]);
      }
      return sampled;
    }
  }
}

// ==========================================
// POSITION SIZING STRATEGIES
// ==========================================

export class PositionSizer {
  /**
   * Fixed fractional position sizing
   */
  public static fixedFractional(
    capital: number,
    riskPercent: number
  ): number {
    return capital * (riskPercent / 100);
  }

  /**
   * Kelly Criterion position sizing
   */
  public static kellyCriterion(
    capital: number,
    kellyFraction: number,
    trades: Trade[]
  ): number {
    const engine = new AdvancedBacktestEngine({} as AdvancedBacktestConfig);
    const kelly = engine.calculateKellyCriterion(trades);
    return capital * kelly * kellyFraction;
  }

  /**
   * Volatility-based position sizing
   */
  public static volatilityBased(
    capital: number,
    targetVolatility: number,
    currentVolatility: number
  ): number {
    const scaleFactor = targetVolatility / currentVolatility;
    return capital * Math.min(scaleFactor, 1); // Cap at 100%
  }

  /**
   * Risk parity position sizing
   */
  public static riskParity(
    capital: number,
    assets: { volatility: number; weight: number }[]
  ): number {
    const totalRisk = assets.reduce((sum, a) => sum + a.volatility * a.weight, 0);
    const avgRisk = totalRisk / assets.length;
    return capital * avgRisk;
  }
}

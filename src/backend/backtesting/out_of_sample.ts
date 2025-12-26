/**
 * TIME - Out-of-Sample Testing Module
 *
 * Comprehensive validation framework:
 * - Walk-Forward Analysis
 * - K-Fold Cross-Validation
 * - Combinatorial Purged Cross-Validation
 * - Rolling Window Analysis
 * - Anchored Walk-Forward
 * - Robustness Testing
 * - Regime Detection
 */

import {
  BacktestConfig,
  BacktestingEngine,
  BacktestResult,
  Candle,
} from '../strategies/backtesting_engine';

// ==========================================
// TYPES
// ==========================================

export interface OutOfSampleConfig {
  method: 'walk_forward' | 'k_fold' | 'combinatorial_purged' | 'rolling' | 'anchored';
  trainRatio?: number; // Ratio of training period (default 0.7)
  testRatio?: number; // Ratio of test period (default 0.3)
  numFolds?: number; // Number of folds for k-fold
  embargoPeriod?: number; // Days to skip between train/test
  purgePeriod?: number; // Days to purge around test set
  stepSize?: number; // Days to step forward
  minTrainDays?: number; // Minimum training days
}

export interface WalkForwardResult {
  foldId: number;
  trainPeriod: { start: Date; end: Date };
  testPeriod: { start: Date; end: Date };
  trainResult: BacktestResult;
  testResult: BacktestResult;
  efficiency: number; // Test return / Train return
  degradation: number; // Performance degradation percentage
}

export interface OutOfSampleResult {
  method: string;
  foldResults: WalkForwardResult[];
  aggregatedMetrics: {
    avgTrainReturn: number;
    avgTestReturn: number;
    avgEfficiency: number;
    avgDegradation: number;
    robustnessScore: number;
    overfitProbability: number;
    consistencyScore: number;
    trainTestCorrelation: number;
  };
  statisticalTests: {
    tStatistic: number;
    pValue: number;
    significantOutperformance: boolean;
    confidenceInterval: { lower: number; upper: number };
  };
  regimeAnalysis?: RegimeAnalysisResult;
}

export interface RegimeAnalysisResult {
  regimes: {
    name: string;
    periods: { start: Date; end: Date }[];
    characteristics: {
      avgVolatility: number;
      avgReturn: number;
      trend: 'bullish' | 'bearish' | 'sideways';
    };
  }[];
  strategyPerformanceByRegime: {
    regime: string;
    return: number;
    sharpe: number;
    winRate: number;
    trades: number;
  }[];
}

export interface RobustnessTestResult {
  testName: string;
  passed: boolean;
  score: number;
  details: string;
  recommendations: string[];
}

// ==========================================
// WALK-FORWARD ANALYZER
// ==========================================

export class WalkForwardAnalyzer {
  private config: OutOfSampleConfig;

  constructor(config: OutOfSampleConfig) {
    this.config = {
      method: config.method || 'walk_forward',
      trainRatio: config.trainRatio || 0.7,
      testRatio: config.testRatio || 0.3,
      numFolds: config.numFolds || 5,
      embargoPeriod: config.embargoPeriod || 0,
      purgePeriod: config.purgePeriod || 0,
      stepSize: config.stepSize || 30,
      minTrainDays: config.minTrainDays || 180,
    };
  }

  /**
   * Run out-of-sample analysis
   */
  public async analyze(
    candles: Candle[],
    backtestConfig: BacktestConfig
  ): Promise<OutOfSampleResult> {
    let foldResults: WalkForwardResult[];

    switch (this.config.method) {
      case 'walk_forward':
        foldResults = await this.walkForward(candles, backtestConfig);
        break;
      case 'k_fold':
        foldResults = await this.kFoldCrossValidation(candles, backtestConfig);
        break;
      case 'combinatorial_purged':
        foldResults = await this.combinatorialPurgedCV(candles, backtestConfig);
        break;
      case 'rolling':
        foldResults = await this.rollingWindowAnalysis(candles, backtestConfig);
        break;
      case 'anchored':
        foldResults = await this.anchoredWalkForward(candles, backtestConfig);
        break;
      default:
        foldResults = await this.walkForward(candles, backtestConfig);
    }

    const aggregatedMetrics = this.calculateAggregatedMetrics(foldResults);
    const statisticalTests = this.performStatisticalTests(foldResults);
    const regimeAnalysis = this.analyzeRegimes(candles, foldResults);

    return {
      method: this.config.method,
      foldResults,
      aggregatedMetrics,
      statisticalTests,
      regimeAnalysis,
    };
  }

  /**
   * Standard Walk-Forward Analysis
   */
  private async walkForward(
    candles: Candle[],
    backtestConfig: BacktestConfig
  ): Promise<WalkForwardResult[]> {
    const results: WalkForwardResult[] = [];
    const totalCandles = candles.length;
    const trainSize = Math.floor(totalCandles * this.config.trainRatio!);
    const testSize = Math.floor(totalCandles * this.config.testRatio!);
    const stepSize = Math.floor((this.config.stepSize || 30) * 24); // Convert days to hours

    let foldId = 1;
    let startIdx = 0;

    while (startIdx + trainSize + testSize <= totalCandles) {
      const trainCandles = candles.slice(startIdx, startIdx + trainSize);
      const embargoStart = startIdx + trainSize;
      const embargoEnd = embargoStart + (this.config.embargoPeriod || 0) * 24;
      const testCandles = candles.slice(embargoEnd, embargoEnd + testSize);

      if (trainCandles.length < 50 || testCandles.length < 20) {
        startIdx += stepSize;
        continue;
      }

      // Run backtests
      const trainEngine = new BacktestingEngine(backtestConfig);
      const testEngine = new BacktestingEngine(backtestConfig);

      const trainResult = trainEngine.runBacktest(trainCandles);
      const testResult = testEngine.runBacktest(testCandles);

      const efficiency = trainResult.totalReturnPercent !== 0
        ? testResult.totalReturnPercent / trainResult.totalReturnPercent
        : 0;

      const degradation = trainResult.totalReturnPercent > 0
        ? ((trainResult.totalReturnPercent - testResult.totalReturnPercent) / trainResult.totalReturnPercent) * 100
        : 0;

      results.push({
        foldId,
        trainPeriod: {
          start: trainCandles[0].timestamp,
          end: trainCandles[trainCandles.length - 1].timestamp,
        },
        testPeriod: {
          start: testCandles[0].timestamp,
          end: testCandles[testCandles.length - 1].timestamp,
        },
        trainResult,
        testResult,
        efficiency,
        degradation,
      });

      foldId++;
      startIdx += stepSize;
    }

    return results;
  }

  /**
   * K-Fold Cross-Validation
   */
  private async kFoldCrossValidation(
    candles: Candle[],
    backtestConfig: BacktestConfig
  ): Promise<WalkForwardResult[]> {
    const results: WalkForwardResult[] = [];
    const numFolds = this.config.numFolds || 5;
    const foldSize = Math.floor(candles.length / numFolds);

    for (let k = 0; k < numFolds; k++) {
      // Test fold is the k-th fold
      const testStart = k * foldSize;
      const testEnd = (k === numFolds - 1) ? candles.length : (k + 1) * foldSize;

      // Training is everything except the test fold
      const trainCandles: Candle[] = [];
      const testCandles = candles.slice(testStart, testEnd);

      for (let j = 0; j < numFolds; j++) {
        if (j !== k) {
          const start = j * foldSize;
          const end = (j === numFolds - 1) ? candles.length : (j + 1) * foldSize;
          trainCandles.push(...candles.slice(start, end));
        }
      }

      // Sort training candles by timestamp
      trainCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (trainCandles.length < 50 || testCandles.length < 20) {
        continue;
      }

      const trainEngine = new BacktestingEngine(backtestConfig);
      const testEngine = new BacktestingEngine(backtestConfig);

      const trainResult = trainEngine.runBacktest(trainCandles);
      const testResult = testEngine.runBacktest(testCandles);

      const efficiency = trainResult.totalReturnPercent !== 0
        ? testResult.totalReturnPercent / trainResult.totalReturnPercent
        : 0;

      results.push({
        foldId: k + 1,
        trainPeriod: {
          start: trainCandles[0].timestamp,
          end: trainCandles[trainCandles.length - 1].timestamp,
        },
        testPeriod: {
          start: testCandles[0].timestamp,
          end: testCandles[testCandles.length - 1].timestamp,
        },
        trainResult,
        testResult,
        efficiency,
        degradation: trainResult.totalReturnPercent > 0
          ? ((trainResult.totalReturnPercent - testResult.totalReturnPercent) / trainResult.totalReturnPercent) * 100
          : 0,
      });
    }

    return results;
  }

  /**
   * Combinatorial Purged Cross-Validation
   * (Prevents data leakage with purging and embargo)
   */
  private async combinatorialPurgedCV(
    candles: Candle[],
    backtestConfig: BacktestConfig
  ): Promise<WalkForwardResult[]> {
    const results: WalkForwardResult[] = [];
    const numFolds = this.config.numFolds || 5;
    const purgePeriod = (this.config.purgePeriod || 5) * 24; // Days to hours
    const embargoPeriod = (this.config.embargoPeriod || 2) * 24;
    const foldSize = Math.floor(candles.length / numFolds);

    // Generate combinations of 2 test folds
    for (let i = 0; i < numFolds; i++) {
      for (let j = i + 1; j < numFolds; j++) {
        // Test folds are i and j
        const testCandles: Candle[] = [];

        // Test fold i
        const testStartI = i * foldSize;
        const testEndI = (i + 1) * foldSize;
        testCandles.push(...candles.slice(testStartI, testEndI));

        // Test fold j
        const testStartJ = j * foldSize;
        const testEndJ = (j === numFolds - 1) ? candles.length : (j + 1) * foldSize;
        testCandles.push(...candles.slice(testStartJ, testEndJ));

        // Training is everything except test folds, with purging
        const trainCandles: Candle[] = [];

        for (let k = 0; k < numFolds; k++) {
          if (k !== i && k !== j) {
            const start = k * foldSize;
            const end = (k === numFolds - 1) ? candles.length : (k + 1) * foldSize;

            // Apply purging: skip candles near test set boundaries
            let purgedStart = start;
            let purgedEnd = end;

            // Purge around fold i
            if (k === i - 1) {
              purgedEnd = Math.max(start, end - purgePeriod);
            }
            if (k === i + 1) {
              purgedStart = Math.min(end, start + embargoPeriod);
            }

            // Purge around fold j
            if (k === j - 1) {
              purgedEnd = Math.max(start, end - purgePeriod);
            }
            if (k === j + 1) {
              purgedStart = Math.min(end, start + embargoPeriod);
            }

            if (purgedEnd > purgedStart) {
              trainCandles.push(...candles.slice(purgedStart, purgedEnd));
            }
          }
        }

        trainCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        testCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        if (trainCandles.length < 50 || testCandles.length < 20) {
          continue;
        }

        const trainEngine = new BacktestingEngine(backtestConfig);
        const testEngine = new BacktestingEngine(backtestConfig);

        const trainResult = trainEngine.runBacktest(trainCandles);
        const testResult = testEngine.runBacktest(testCandles);

        results.push({
          foldId: results.length + 1,
          trainPeriod: {
            start: trainCandles[0].timestamp,
            end: trainCandles[trainCandles.length - 1].timestamp,
          },
          testPeriod: {
            start: testCandles[0].timestamp,
            end: testCandles[testCandles.length - 1].timestamp,
          },
          trainResult,
          testResult,
          efficiency: trainResult.totalReturnPercent !== 0
            ? testResult.totalReturnPercent / trainResult.totalReturnPercent
            : 0,
          degradation: trainResult.totalReturnPercent > 0
            ? ((trainResult.totalReturnPercent - testResult.totalReturnPercent) / trainResult.totalReturnPercent) * 100
            : 0,
        });
      }
    }

    return results;
  }

  /**
   * Rolling Window Analysis
   */
  private async rollingWindowAnalysis(
    candles: Candle[],
    backtestConfig: BacktestConfig
  ): Promise<WalkForwardResult[]> {
    const results: WalkForwardResult[] = [];
    const windowSize = (this.config.minTrainDays || 180) * 24;
    const stepSize = (this.config.stepSize || 30) * 24;
    const testSize = stepSize;

    let foldId = 1;

    for (let i = windowSize; i < candles.length - testSize; i += stepSize) {
      const trainCandles = candles.slice(i - windowSize, i);
      const testCandles = candles.slice(i, i + testSize);

      if (trainCandles.length < 50 || testCandles.length < 10) {
        continue;
      }

      const trainEngine = new BacktestingEngine(backtestConfig);
      const testEngine = new BacktestingEngine(backtestConfig);

      const trainResult = trainEngine.runBacktest(trainCandles);
      const testResult = testEngine.runBacktest(testCandles);

      results.push({
        foldId,
        trainPeriod: {
          start: trainCandles[0].timestamp,
          end: trainCandles[trainCandles.length - 1].timestamp,
        },
        testPeriod: {
          start: testCandles[0].timestamp,
          end: testCandles[testCandles.length - 1].timestamp,
        },
        trainResult,
        testResult,
        efficiency: trainResult.totalReturnPercent !== 0
          ? testResult.totalReturnPercent / trainResult.totalReturnPercent
          : 0,
        degradation: trainResult.totalReturnPercent > 0
          ? ((trainResult.totalReturnPercent - testResult.totalReturnPercent) / trainResult.totalReturnPercent) * 100
          : 0,
      });

      foldId++;
    }

    return results;
  }

  /**
   * Anchored Walk-Forward (expanding window)
   */
  private async anchoredWalkForward(
    candles: Candle[],
    backtestConfig: BacktestConfig
  ): Promise<WalkForwardResult[]> {
    const results: WalkForwardResult[] = [];
    const minTrainSize = (this.config.minTrainDays || 180) * 24;
    const stepSize = (this.config.stepSize || 30) * 24;
    const testSize = stepSize;

    let foldId = 1;

    for (let trainEnd = minTrainSize; trainEnd < candles.length - testSize; trainEnd += stepSize) {
      const trainCandles = candles.slice(0, trainEnd); // Anchored to start
      const testCandles = candles.slice(trainEnd, trainEnd + testSize);

      if (trainCandles.length < 50 || testCandles.length < 10) {
        continue;
      }

      const trainEngine = new BacktestingEngine(backtestConfig);
      const testEngine = new BacktestingEngine(backtestConfig);

      const trainResult = trainEngine.runBacktest(trainCandles);
      const testResult = testEngine.runBacktest(testCandles);

      results.push({
        foldId,
        trainPeriod: {
          start: trainCandles[0].timestamp,
          end: trainCandles[trainCandles.length - 1].timestamp,
        },
        testPeriod: {
          start: testCandles[0].timestamp,
          end: testCandles[testCandles.length - 1].timestamp,
        },
        trainResult,
        testResult,
        efficiency: trainResult.totalReturnPercent !== 0
          ? testResult.totalReturnPercent / trainResult.totalReturnPercent
          : 0,
        degradation: trainResult.totalReturnPercent > 0
          ? ((trainResult.totalReturnPercent - testResult.totalReturnPercent) / trainResult.totalReturnPercent) * 100
          : 0,
      });

      foldId++;
    }

    return results;
  }

  /**
   * Calculate aggregated metrics
   */
  private calculateAggregatedMetrics(results: WalkForwardResult[]): OutOfSampleResult['aggregatedMetrics'] {
    if (results.length === 0) {
      return {
        avgTrainReturn: 0,
        avgTestReturn: 0,
        avgEfficiency: 0,
        avgDegradation: 0,
        robustnessScore: 0,
        overfitProbability: 0,
        consistencyScore: 0,
        trainTestCorrelation: 0,
      };
    }

    const avgTrainReturn = results.reduce((sum, r) => sum + r.trainResult.totalReturnPercent, 0) / results.length;
    const avgTestReturn = results.reduce((sum, r) => sum + r.testResult.totalReturnPercent, 0) / results.length;
    const avgEfficiency = results.reduce((sum, r) => sum + r.efficiency, 0) / results.length;
    const avgDegradation = results.reduce((sum, r) => sum + r.degradation, 0) / results.length;

    // Robustness: how consistent is test performance
    const testReturns = results.map(r => r.testResult.totalReturnPercent);
    const testStdDev = this.calculateStdDev(testReturns);
    const robustnessScore = avgTestReturn > 0 && testStdDev > 0
      ? Math.min(1, avgTestReturn / testStdDev)
      : 0;

    // Overfit probability: how often train >> test
    const overfitCount = results.filter(r =>
      r.trainResult.totalReturnPercent > 0 &&
      r.testResult.totalReturnPercent < r.trainResult.totalReturnPercent * 0.5
    ).length;
    const overfitProbability = overfitCount / results.length;

    // Consistency: how often test is profitable when train is profitable
    const consistentCount = results.filter(r =>
      (r.trainResult.totalReturnPercent > 0 && r.testResult.totalReturnPercent > 0) ||
      (r.trainResult.totalReturnPercent <= 0 && r.testResult.totalReturnPercent <= 0)
    ).length;
    const consistencyScore = consistentCount / results.length;

    // Train-Test correlation
    const trainReturns = results.map(r => r.trainResult.totalReturnPercent);
    const trainTestCorrelation = this.calculateCorrelation(trainReturns, testReturns);

    return {
      avgTrainReturn,
      avgTestReturn,
      avgEfficiency,
      avgDegradation,
      robustnessScore,
      overfitProbability,
      consistencyScore,
      trainTestCorrelation,
    };
  }

  /**
   * Perform statistical tests
   */
  private performStatisticalTests(results: WalkForwardResult[]): OutOfSampleResult['statisticalTests'] {
    const testReturns = results.map(r => r.testResult.totalReturnPercent);

    if (testReturns.length < 2) {
      return {
        tStatistic: 0,
        pValue: 1,
        significantOutperformance: false,
        confidenceInterval: { lower: 0, upper: 0 },
      };
    }

    // One-sample t-test: is mean significantly > 0?
    const mean = testReturns.reduce((a, b) => a + b, 0) / testReturns.length;
    const stdDev = this.calculateStdDev(testReturns);
    const n = testReturns.length;

    const tStatistic = stdDev > 0 ? (mean / (stdDev / Math.sqrt(n))) : 0;

    // Approximate p-value for t-distribution
    const pValue = this.tDistributionPValue(Math.abs(tStatistic), n - 1);

    // 95% confidence interval
    const tCritical = 1.96; // Approximate for large n
    const marginOfError = tCritical * (stdDev / Math.sqrt(n));

    return {
      tStatistic,
      pValue,
      significantOutperformance: pValue < 0.05 && mean > 0,
      confidenceInterval: {
        lower: mean - marginOfError,
        upper: mean + marginOfError,
      },
    };
  }

  /**
   * Analyze performance across market regimes
   */
  private analyzeRegimes(
    candles: Candle[],
    results: WalkForwardResult[]
  ): RegimeAnalysisResult {
    // Detect regimes based on volatility and trend
    const regimes = this.detectRegimes(candles);

    // Calculate strategy performance by regime
    const performanceByRegime = regimes.map(regime => {
      const regimeTrades: { return: number; sharpe: number; winRate: number; trades: number }[] = [];

      for (const result of results) {
        // Check if test period overlaps with regime
        for (const period of regime.periods) {
          if (
            result.testPeriod.start <= period.end &&
            result.testPeriod.end >= period.start
          ) {
            regimeTrades.push({
              return: result.testResult.totalReturnPercent,
              sharpe: result.testResult.sharpeRatio,
              winRate: result.testResult.winRate,
              trades: result.testResult.totalTrades,
            });
            break;
          }
        }
      }

      const avgReturn = regimeTrades.length > 0
        ? regimeTrades.reduce((sum, t) => sum + t.return, 0) / regimeTrades.length
        : 0;
      const avgSharpe = regimeTrades.length > 0
        ? regimeTrades.reduce((sum, t) => sum + t.sharpe, 0) / regimeTrades.length
        : 0;
      const avgWinRate = regimeTrades.length > 0
        ? regimeTrades.reduce((sum, t) => sum + t.winRate, 0) / regimeTrades.length
        : 0;
      const totalTrades = regimeTrades.reduce((sum, t) => sum + t.trades, 0);

      return {
        regime: regime.name,
        return: avgReturn,
        sharpe: avgSharpe,
        winRate: avgWinRate,
        trades: totalTrades,
      };
    });

    return {
      regimes,
      strategyPerformanceByRegime: performanceByRegime,
    };
  }

  /**
   * Detect market regimes
   */
  private detectRegimes(candles: Candle[]): RegimeAnalysisResult['regimes'] {
    const windowSize = 20; // 20-day rolling
    const regimes: RegimeAnalysisResult['regimes'] = [];

    const regimeTypes: Record<string, { periods: { start: Date; end: Date }[] }> = {
      'Low Vol Bull': { periods: [] },
      'High Vol Bull': { periods: [] },
      'Low Vol Bear': { periods: [] },
      'High Vol Bear': { periods: [] },
      'Sideways': { periods: [] },
    };

    let currentRegime: string | null = null;
    let regimeStart: Date | null = null;

    for (let i = windowSize; i < candles.length; i++) {
      const window = candles.slice(i - windowSize, i);

      // Calculate volatility
      const returns = [];
      for (let j = 1; j < window.length; j++) {
        returns.push((window[j].close - window[j - 1].close) / window[j - 1].close);
      }
      const volatility = this.calculateStdDev(returns) * Math.sqrt(252);

      // Calculate trend
      const startPrice = window[0].close;
      const endPrice = window[window.length - 1].close;
      const trendReturn = (endPrice - startPrice) / startPrice;

      // Classify regime
      let regime: string;
      const volThreshold = 0.20; // 20% annual vol
      const trendThreshold = 0.02; // 2% per period

      if (Math.abs(trendReturn) < trendThreshold * 0.5) {
        regime = 'Sideways';
      } else if (trendReturn > trendThreshold) {
        regime = volatility > volThreshold ? 'High Vol Bull' : 'Low Vol Bull';
      } else {
        regime = volatility > volThreshold ? 'High Vol Bear' : 'Low Vol Bear';
      }

      if (regime !== currentRegime) {
        // Close previous regime
        if (currentRegime && regimeStart) {
          regimeTypes[currentRegime].periods.push({
            start: regimeStart,
            end: candles[i - 1].timestamp,
          });
        }

        // Start new regime
        currentRegime = regime;
        regimeStart = candles[i].timestamp;
      }
    }

    // Close final regime
    if (currentRegime && regimeStart) {
      regimeTypes[currentRegime].periods.push({
        start: regimeStart,
        end: candles[candles.length - 1].timestamp,
      });
    }

    // Convert to output format
    for (const [name, data] of Object.entries(regimeTypes)) {
      if (data.periods.length > 0) {
        // Calculate characteristics
        let totalVol = 0;
        let totalReturn = 0;
        let periodCount = 0;

        for (const period of data.periods) {
          const periodCandles = candles.filter(c =>
            c.timestamp >= period.start && c.timestamp <= period.end
          );

          if (periodCandles.length > 1) {
            const returns = [];
            for (let i = 1; i < periodCandles.length; i++) {
              returns.push((periodCandles[i].close - periodCandles[i - 1].close) / periodCandles[i - 1].close);
            }
            totalVol += this.calculateStdDev(returns) * Math.sqrt(252);
            totalReturn += (periodCandles[periodCandles.length - 1].close - periodCandles[0].close) / periodCandles[0].close;
            periodCount++;
          }
        }

        const avgVol = periodCount > 0 ? totalVol / periodCount : 0;
        const avgReturn = periodCount > 0 ? totalReturn / periodCount : 0;

        regimes.push({
          name,
          periods: data.periods,
          characteristics: {
            avgVolatility: avgVol,
            avgReturn,
            trend: avgReturn > 0.02 ? 'bullish' : avgReturn < -0.02 ? 'bearish' : 'sideways',
          },
        });
      }
    }

    return regimes;
  }

  // Helper functions
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xVariance = 0;
    let yVariance = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      xVariance += Math.pow(x[i] - xMean, 2);
      yVariance += Math.pow(y[i] - yMean, 2);
    }

    const denominator = Math.sqrt(xVariance * yVariance);
    return denominator > 0 ? numerator / denominator : 0;
  }

  private tDistributionPValue(t: number, df: number): number {
    // Approximate p-value using normal distribution for large df
    if (df > 30) {
      return 2 * (1 - this.normalCDF(Math.abs(t)));
    }

    // For small df, use approximation
    const x = df / (df + t * t);
    return this.incompleteBeta(df / 2, 0.5, x);
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private incompleteBeta(a: number, b: number, x: number): number {
    // Simplified approximation
    return x;
  }
}

// ==========================================
// ROBUSTNESS TESTER
// ==========================================

export class RobustnessTester {
  /**
   * Run comprehensive robustness tests
   */
  public static async runTests(
    candles: Candle[],
    backtestConfig: BacktestConfig,
    oosResult: OutOfSampleResult
  ): Promise<RobustnessTestResult[]> {
    const tests: RobustnessTestResult[] = [];

    // Test 1: Consistency across folds
    tests.push(this.testConsistency(oosResult));

    // Test 2: Parameter sensitivity
    tests.push(await this.testParameterSensitivity(candles, backtestConfig));

    // Test 3: Regime robustness
    tests.push(this.testRegimeRobustness(oosResult));

    // Test 4: Sample size adequacy
    tests.push(this.testSampleSize(oosResult));

    // Test 5: Overfit detection
    tests.push(this.testOverfit(oosResult));

    return tests;
  }

  private static testConsistency(result: OutOfSampleResult): RobustnessTestResult {
    const { consistencyScore, trainTestCorrelation } = result.aggregatedMetrics;

    const passed = consistencyScore >= 0.6 && trainTestCorrelation >= 0.3;
    const score = (consistencyScore + Math.max(0, trainTestCorrelation)) / 2;

    const recommendations: string[] = [];
    if (consistencyScore < 0.6) {
      recommendations.push('Strategy shows inconsistent behavior between train and test periods');
    }
    if (trainTestCorrelation < 0.3) {
      recommendations.push('Low correlation between train and test performance suggests unstable strategy');
    }

    return {
      testName: 'Consistency Test',
      passed,
      score,
      details: `Consistency: ${(consistencyScore * 100).toFixed(1)}%, Correlation: ${trainTestCorrelation.toFixed(3)}`,
      recommendations,
    };
  }

  private static async testParameterSensitivity(
    candles: Candle[],
    config: BacktestConfig
  ): Promise<RobustnessTestResult> {
    const variations = [-0.2, -0.1, 0, 0.1, 0.2]; // +/- 20%
    const returns: number[] = [];

    for (const variation of variations) {
      const modifiedConfig = {
        ...config,
        positionSizePercent: config.positionSizePercent * (1 + variation),
      };

      const engine = new BacktestingEngine(modifiedConfig);
      const result = engine.runBacktest(candles);
      returns.push(result.totalReturnPercent);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length);
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : 1; // Coefficient of variation

    const passed = cv < 0.5; // Less than 50% variation
    const score = Math.max(0, 1 - cv);

    const recommendations: string[] = [];
    if (!passed) {
      recommendations.push('Strategy is sensitive to parameter changes - consider more robust parameter selection');
    }

    return {
      testName: 'Parameter Sensitivity',
      passed,
      score,
      details: `Coefficient of Variation: ${(cv * 100).toFixed(1)}%`,
      recommendations,
    };
  }

  private static testRegimeRobustness(result: OutOfSampleResult): RobustnessTestResult {
    if (!result.regimeAnalysis) {
      return {
        testName: 'Regime Robustness',
        passed: false,
        score: 0,
        details: 'No regime analysis available',
        recommendations: ['Run analysis with regime detection enabled'],
      };
    }

    const performances = result.regimeAnalysis.strategyPerformanceByRegime;
    const positiveRegimes = performances.filter(p => p.return > 0).length;
    const totalRegimes = performances.length;

    const passed = positiveRegimes >= totalRegimes * 0.5;
    const score = totalRegimes > 0 ? positiveRegimes / totalRegimes : 0;

    const recommendations: string[] = [];
    const negativeRegimes = performances.filter(p => p.return <= 0);
    for (const regime of negativeRegimes) {
      recommendations.push(`Poor performance in ${regime.regime} regime (${regime.return.toFixed(2)}%)`);
    }

    return {
      testName: 'Regime Robustness',
      passed,
      score,
      details: `Profitable in ${positiveRegimes}/${totalRegimes} regimes`,
      recommendations,
    };
  }

  private static testSampleSize(result: OutOfSampleResult): RobustnessTestResult {
    const minFolds = 5;
    const minTradesPerFold = 30;

    const actualFolds = result.foldResults.length;
    const avgTradesPerFold = actualFolds > 0
      ? result.foldResults.reduce((sum, f) => sum + f.testResult.totalTrades, 0) / actualFolds
      : 0;

    const passed = actualFolds >= minFolds && avgTradesPerFold >= minTradesPerFold;
    const score = Math.min(1, (actualFolds / minFolds) * (avgTradesPerFold / minTradesPerFold));

    const recommendations: string[] = [];
    if (actualFolds < minFolds) {
      recommendations.push(`Only ${actualFolds} folds - need at least ${minFolds} for statistical significance`);
    }
    if (avgTradesPerFold < minTradesPerFold) {
      recommendations.push(`Average ${avgTradesPerFold.toFixed(0)} trades per fold - need at least ${minTradesPerFold}`);
    }

    return {
      testName: 'Sample Size Adequacy',
      passed,
      score,
      details: `${actualFolds} folds, ${avgTradesPerFold.toFixed(0)} avg trades/fold`,
      recommendations,
    };
  }

  private static testOverfit(result: OutOfSampleResult): RobustnessTestResult {
    const { overfitProbability, avgDegradation } = result.aggregatedMetrics;

    const passed = overfitProbability < 0.3 && avgDegradation < 50;
    const score = 1 - (overfitProbability + Math.min(1, avgDegradation / 100)) / 2;

    const recommendations: string[] = [];
    if (overfitProbability >= 0.3) {
      recommendations.push(`High overfit probability (${(overfitProbability * 100).toFixed(1)}%) - simplify strategy`);
    }
    if (avgDegradation >= 50) {
      recommendations.push(`High performance degradation (${avgDegradation.toFixed(1)}%) in out-of-sample testing`);
    }

    return {
      testName: 'Overfit Detection',
      passed,
      score,
      details: `Overfit prob: ${(overfitProbability * 100).toFixed(1)}%, Degradation: ${avgDegradation.toFixed(1)}%`,
      recommendations,
    };
  }
}

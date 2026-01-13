/**
 * TIME — Meta-Intelligence Trading Governor
 * REAL Backtesting Engine
 *
 * Industry-standard backtesting with:
 * - Walk-forward optimization
 * - Monte Carlo simulation
 * - Realistic slippage/commission modeling
 * - Drawdown analysis
 * - Sharpe/Sortino/Calmar ratios
 */

import {
  analyzeWithAllStrategies,
  Candle,
  StrategyResult,
} from './real_strategy_engine';

// Re-export Candle for consumers of this module
export { Candle } from './real_strategy_engine';

// ==========================================
// TYPES
// ==========================================

export interface BacktestConfig {
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSizePercent: number; // % of capital per trade
  maxDrawdownPercent: number; // Stop trading if exceeded
  commissionPercent: number; // Per trade
  slippagePercent: number; // Per trade
  leverage: number;
}

export interface Trade {
  id: string;
  entryDate: Date;
  exitDate: Date;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
  holdingPeriodHours: number;
  exitReason: 'signal' | 'stop_loss' | 'take_profit' | 'max_drawdown';
}

export interface BacktestResult {
  symbol: string;
  period: { start: Date; end: Date };
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;

  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingPeriod: number;

  // Risk Metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  profitFactor: number;

  // Additional Analysis
  consecutiveWins: number;
  consecutiveLosses: number;
  avgTradeReturn: number;
  expectancy: number;

  // Equity Curve
  equityCurve: { date: Date; equity: number }[];
  drawdownCurve: { date: Date; drawdown: number }[];

  // Individual Trades
  trades: Trade[];

  // Walk-Forward Results (if applicable)
  walkForwardResults?: WalkForwardResult[];
}

export interface WalkForwardResult {
  trainPeriod: { start: Date; end: Date };
  testPeriod: { start: Date; end: Date };
  inSampleReturn: number;
  outOfSampleReturn: number;
  efficiency: number; // Out-of-sample / In-sample performance
}

// ==========================================
// BACKTESTING ENGINE
// ==========================================

export class BacktestingEngine {
  private config: BacktestConfig;
  private candles: Candle[] = [];
  private trades: Trade[] = [];
  private equityCurve: { date: Date; equity: number }[] = [];
  private currentCapital: number = 0;
  private position: { direction: 'long' | 'short'; entryPrice: number; quantity: number; entryDate: Date } | null = null;

  constructor(config: BacktestConfig) {
    this.config = config;
    this.currentCapital = config.initialCapital;
  }

  /**
   * Run backtest on provided candle data
   */
  public runBacktest(candles: Candle[]): BacktestResult {
    this.candles = candles;
    this.trades = [];
    this.equityCurve = [];
    this.currentCapital = this.config.initialCapital;
    this.position = null;

    // Need at least 50 candles for indicators
    if (candles.length < 50) {
      throw new Error('Need at least 50 candles for backtesting');
    }

    // Run through candles
    for (let i = 50; i < candles.length; i++) {
      const lookbackCandles = candles.slice(0, i + 1);
      const currentCandle = candles[i];

      // Analyze with strategy engine
      const analysis = analyzeWithAllStrategies(lookbackCandles);

      // Record equity
      this.equityCurve.push({
        date: currentCandle.timestamp,
        equity: this.calculateCurrentEquity(currentCandle.close),
      });

      // Check max drawdown
      if (this.checkMaxDrawdown()) {
        if (this.position) {
          this.closePosition(currentCandle, 'max_drawdown');
        }
        continue; // Stop trading
      }

      // Execute trading logic
      this.executeStrategy(analysis, currentCandle);
    }

    // Close any remaining position
    if (this.position && candles.length > 0) {
      this.closePosition(candles[candles.length - 1], 'signal');
    }

    return this.calculateResults();
  }

  /**
   * Execute trading strategy based on analysis
   */
  private executeStrategy(analysis: StrategyResult, candle: Candle): void {
    const { signal, confidence } = analysis.overall;

    // Only trade on high confidence signals
    if (confidence < 60) return;

    if (!this.position) {
      // Open new position
      if (signal === 'BUY') {
        this.openPosition('long', candle);
      } else if (signal === 'SELL') {
        this.openPosition('short', candle);
      }
    } else {
      // Check for exit signals
      if (this.position.direction === 'long' && signal === 'SELL') {
        this.closePosition(candle, 'signal');
      } else if (this.position.direction === 'short' && signal === 'BUY') {
        this.closePosition(candle, 'signal');
      }

      // Check stop loss / take profit
      const pnlPercent = this.calculatePositionPnL(candle.close);
      if (pnlPercent <= -2) { // 2% stop loss
        this.closePosition(candle, 'stop_loss');
      } else if (pnlPercent >= 4) { // 4% take profit
        this.closePosition(candle, 'take_profit');
      }
    }
  }

  /**
   * Open a new position
   */
  private openPosition(direction: 'long' | 'short', candle: Candle): void {
    const positionSize = this.currentCapital * (this.config.positionSizePercent / 100);
    const slippage = candle.close * (this.config.slippagePercent / 100);
    const entryPrice = direction === 'long' ? candle.close + slippage : candle.close - slippage;
    const quantity = (positionSize * this.config.leverage) / entryPrice;

    this.position = {
      direction,
      entryPrice,
      quantity,
      entryDate: candle.timestamp,
    };
  }

  /**
   * Close current position
   */
  private closePosition(candle: Candle, reason: Trade['exitReason']): void {
    if (!this.position) return;

    const slippage = candle.close * (this.config.slippagePercent / 100);
    const exitPrice = this.position.direction === 'long'
      ? candle.close - slippage
      : candle.close + slippage;

    const rawPnl = this.position.direction === 'long'
      ? (exitPrice - this.position.entryPrice) * this.position.quantity
      : (this.position.entryPrice - exitPrice) * this.position.quantity;

    const commission = (this.position.entryPrice + exitPrice) * this.position.quantity * (this.config.commissionPercent / 100);
    const totalSlippage = slippage * this.position.quantity * 2; // Entry + exit

    const pnl = rawPnl - commission - totalSlippage;
    const pnlPercent = (pnl / (this.position.entryPrice * this.position.quantity)) * 100;

    const holdingPeriodMs = candle.timestamp.getTime() - this.position.entryDate.getTime();
    const holdingPeriodHours = holdingPeriodMs / (1000 * 60 * 60);

    const trade: Trade = {
      id: `T${this.trades.length + 1}`,
      entryDate: this.position.entryDate,
      exitDate: candle.timestamp,
      direction: this.position.direction,
      entryPrice: this.position.entryPrice,
      exitPrice,
      quantity: this.position.quantity,
      pnl,
      pnlPercent,
      commission,
      slippage: totalSlippage,
      holdingPeriodHours,
      exitReason: reason,
    };

    this.trades.push(trade);
    this.currentCapital += pnl;
    this.position = null;
  }

  /**
   * Calculate current equity including open position
   */
  private calculateCurrentEquity(currentPrice: number): number {
    if (!this.position) return this.currentCapital;

    const unrealizedPnl = this.position.direction === 'long'
      ? (currentPrice - this.position.entryPrice) * this.position.quantity
      : (this.position.entryPrice - currentPrice) * this.position.quantity;

    return this.currentCapital + unrealizedPnl;
  }

  /**
   * Calculate position P&L percent
   */
  private calculatePositionPnL(currentPrice: number): number {
    if (!this.position) return 0;

    const direction = this.position.direction === 'long' ? 1 : -1;
    return ((currentPrice - this.position.entryPrice) / this.position.entryPrice) * 100 * direction;
  }

  /**
   * Check if max drawdown exceeded
   */
  private checkMaxDrawdown(): boolean {
    if (this.equityCurve.length < 2) return false;

    const peak = Math.max(...this.equityCurve.map(e => e.equity));
    const current = this.equityCurve[this.equityCurve.length - 1].equity;
    const drawdownPercent = ((peak - current) / peak) * 100;

    return drawdownPercent >= this.config.maxDrawdownPercent;
  }

  /**
   * Calculate final backtest results
   */
  private calculateResults(): BacktestResult {
    const winningTrades = this.trades.filter(t => t.pnl > 0);
    const losingTrades = this.trades.filter(t => t.pnl <= 0);

    const totalReturn = this.currentCapital - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = this.config.initialCapital;
    const drawdownCurve: { date: Date; drawdown: number }[] = [];

    for (const point of this.equityCurve) {
      if (point.equity > peak) peak = point.equity;
      const drawdown = peak - point.equity;
      const drawdownPct = (drawdown / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPct;
      }
      drawdownCurve.push({ date: point.date, drawdown: drawdownPct });
    }

    // Calculate returns for Sharpe/Sortino
    const returns = this.trades.map(t => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = this.calculateStdDev(returns);
    const downsideReturns = returns.filter(r => r < 0);
    const downsideStdDev = this.calculateStdDev(downsideReturns);

    // Annualized calculations
    const daysInPeriod = this.candles.length > 1
      ? (this.candles[this.candles.length - 1].timestamp.getTime() - this.candles[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 1;
    const annualizationFactor = 365 / daysInPeriod;
    const annualizedReturn = totalReturnPercent * annualizationFactor;

    // Risk-adjusted metrics
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    const sortinoRatio = downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0;
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / maxDrawdownPercent : 0;

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Consecutive wins/losses
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const trade of this.trades) {
      if (trade.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
      }
    }

    // Expectancy
    const winRate = this.trades.length > 0 ? winningTrades.length / this.trades.length : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    return {
      symbol: this.config.symbol,
      period: {
        start: this.candles[0]?.timestamp || new Date(),
        end: this.candles[this.candles.length - 1]?.timestamp || new Date(),
      },
      initialCapital: this.config.initialCapital,
      finalCapital: this.currentCapital,
      totalReturn,
      totalReturnPercent,
      annualizedReturn,

      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      avgHoldingPeriod: this.trades.length > 0
        ? this.trades.reduce((sum, t) => sum + t.holdingPeriodHours, 0) / this.trades.length
        : 0,

      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      profitFactor,

      consecutiveWins,
      consecutiveLosses,
      avgTradeReturn: avgReturn,
      expectancy,

      equityCurve: this.equityCurve,
      drawdownCurve,
      trades: this.trades,
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
  }
}

// ==========================================
// WALK-FORWARD OPTIMIZATION
// ==========================================

export class WalkForwardOptimizer {
  /**
   * Run walk-forward optimization
   * Splits data into training/test periods and validates out-of-sample performance
   */
  public runWalkForward(
    candles: Candle[],
    config: BacktestConfig,
    numFolds: number = 5
  ): BacktestResult & { walkForwardResults: WalkForwardResult[] } {
    const foldSize = Math.floor(candles.length / numFolds);
    const results: WalkForwardResult[] = [];

    for (let i = 0; i < numFolds - 1; i++) {
      const trainStart = 0;
      const trainEnd = (i + 1) * foldSize;
      const testStart = trainEnd;
      const testEnd = Math.min(testStart + foldSize, candles.length);

      const trainCandles = candles.slice(trainStart, trainEnd);
      const testCandles = candles.slice(testStart, testEnd);

      // Run backtest on training data
      const trainEngine = new BacktestingEngine(config);
      const trainResult = trainEngine.runBacktest(trainCandles);

      // Run backtest on test data
      const testEngine = new BacktestingEngine(config);
      const testResult = testEngine.runBacktest(testCandles);

      results.push({
        trainPeriod: {
          start: trainCandles[0].timestamp,
          end: trainCandles[trainCandles.length - 1].timestamp,
        },
        testPeriod: {
          start: testCandles[0].timestamp,
          end: testCandles[testCandles.length - 1].timestamp,
        },
        inSampleReturn: trainResult.totalReturnPercent,
        outOfSampleReturn: testResult.totalReturnPercent,
        efficiency: trainResult.totalReturnPercent !== 0
          ? testResult.totalReturnPercent / trainResult.totalReturnPercent
          : 0,
      });
    }

    // Run final full backtest
    const fullEngine = new BacktestingEngine(config);
    const fullResult = fullEngine.runBacktest(candles);

    return {
      ...fullResult,
      walkForwardResults: results,
    };
  }
}

// ==========================================
// MONTE CARLO SIMULATION
// ==========================================

export interface MonteCarloResult {
  simulations: number;
  medianFinalCapital: number;
  meanFinalCapital: number;
  worstCase5Percent: number;
  bestCase5Percent: number;
  probabilityOfProfit: number;
  probabilityOfDoubling: number;
  expectedDrawdown: number;
  distribution: { capitalRange: string; count: number }[];
}

export class MonteCarloSimulator {
  /**
   * Run Monte Carlo simulation by reshuffling trades
   */
  public runSimulation(
    trades: Trade[],
    initialCapital: number,
    numSimulations: number = 1000
  ): MonteCarloResult {
    if (trades.length === 0) {
      return {
        simulations: numSimulations,
        medianFinalCapital: initialCapital,
        meanFinalCapital: initialCapital,
        worstCase5Percent: initialCapital,
        bestCase5Percent: initialCapital,
        probabilityOfProfit: 0,
        probabilityOfDoubling: 0,
        expectedDrawdown: 0,
        distribution: [],
      };
    }

    const finalCapitals: number[] = [];
    const maxDrawdowns: number[] = [];

    for (let sim = 0; sim < numSimulations; sim++) {
      // Shuffle trades
      const shuffledTrades = [...trades].sort(() => Math.random() - 0.5);

      let capital = initialCapital;
      let peak = initialCapital;
      let maxDrawdown = 0;

      for (const trade of shuffledTrades) {
        // Scale trade P&L to current capital
        const scaledPnl = trade.pnlPercent * (capital / 100);
        capital += scaledPnl;

        if (capital > peak) peak = capital;
        const drawdown = (peak - capital) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      finalCapitals.push(capital);
      maxDrawdowns.push(maxDrawdown);
    }

    // Sort for percentile calculations
    finalCapitals.sort((a, b) => a - b);
    maxDrawdowns.sort((a, b) => a - b);

    const idx5 = Math.floor(numSimulations * 0.05);
    const idx50 = Math.floor(numSimulations * 0.5);
    const idx95 = Math.floor(numSimulations * 0.95);

    // Create distribution buckets
    const min = finalCapitals[0];
    const max = finalCapitals[finalCapitals.length - 1];
    const bucketSize = (max - min) / 10;
    const distribution: { capitalRange: string; count: number }[] = [];

    for (let i = 0; i < 10; i++) {
      const bucketMin = min + (i * bucketSize);
      const bucketMax = bucketMin + bucketSize;
      const count = finalCapitals.filter(c => c >= bucketMin && c < bucketMax).length;
      distribution.push({
        capitalRange: `$${bucketMin.toFixed(0)} - $${bucketMax.toFixed(0)}`,
        count,
      });
    }

    return {
      simulations: numSimulations,
      medianFinalCapital: finalCapitals[idx50],
      meanFinalCapital: finalCapitals.reduce((a, b) => a + b, 0) / numSimulations,
      worstCase5Percent: finalCapitals[idx5],
      bestCase5Percent: finalCapitals[idx95],
      probabilityOfProfit: finalCapitals.filter(c => c > initialCapital).length / numSimulations,
      probabilityOfDoubling: finalCapitals.filter(c => c >= initialCapital * 2).length / numSimulations,
      expectedDrawdown: maxDrawdowns.reduce((a, b) => a + b, 0) / numSimulations,
      distribution,
    };
  }
}

// ==========================================
// HELPER: Generate mock candle data for testing
// ==========================================

export function generateTestCandles(
  symbol: string,
  days: number,
  startPrice: number = 100
): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

  // Generate hourly candles
  for (let i = 0; i < days * 24; i++) {
    const volatility = 0.02; // 2% daily volatility
    const drift = 0.0001; // Slight upward bias

    const change = price * volatility * (Math.random() - 0.5) + price * drift;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * volatility / 2);
    const low = Math.min(open, close) * (1 - Math.random() * volatility / 2);
    const volume = Math.floor(1000000 + Math.random() * 1000000);

    candles.push({
      timestamp: new Date(startTime + i * 60 * 60 * 1000),
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return candles;
}

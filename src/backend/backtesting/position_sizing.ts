/**
 * TIME - Advanced Position Sizing Module
 *
 * Complete position sizing strategies:
 * - Fixed Fractional
 * - Kelly Criterion (Full & Fractional)
 * - Optimal F
 * - Volatility Targeting
 * - Risk Parity
 * - Anti-Martingale
 * - Martingale (for reference)
 * - ATR-based sizing
 * - Maximum Drawdown based
 */

import { Trade } from '../strategies/backtesting_engine';

// ==========================================
// TYPES
// ==========================================

export interface PositionSizeResult {
  positionSize: number; // Dollar amount
  percentOfCapital: number;
  shares: number;
  contracts: number;
  riskAmount: number; // Amount at risk
  method: string;
  parameters: Record<string, number>;
  warnings: string[];
}

export interface PositionSizingConfig {
  method: PositionSizingMethod;
  capital: number;
  price: number;
  stopLossDistance?: number; // In price terms
  stopLossPercent?: number; // As percentage
  volatility?: number; // ATR or standard deviation
  targetVolatility?: number; // For volatility targeting
  maxPositionPercent?: number; // Maximum position size
  minPositionPercent?: number; // Minimum position size
  historicalTrades?: Trade[]; // For Kelly and Optimal F
  multiplier?: number; // For options/futures
  riskPerTrade?: number; // Risk per trade in %
}

export type PositionSizingMethod =
  | 'fixed_dollar'
  | 'fixed_percent'
  | 'fixed_fractional'
  | 'kelly_criterion'
  | 'half_kelly'
  | 'quarter_kelly'
  | 'optimal_f'
  | 'volatility_target'
  | 'risk_parity'
  | 'atr_based'
  | 'max_drawdown_based'
  | 'anti_martingale'
  | 'martingale';

// ==========================================
// POSITION SIZING CALCULATOR
// ==========================================

export class PositionSizingCalculator {
  /**
   * Calculate position size based on method
   */
  public static calculate(config: PositionSizingConfig): PositionSizeResult {
    const warnings: string[] = [];

    let positionSize: number;
    let parameters: Record<string, number> = {};

    switch (config.method) {
      case 'fixed_dollar':
        positionSize = this.fixedDollar(config);
        parameters = { amount: positionSize };
        break;

      case 'fixed_percent':
        positionSize = this.fixedPercent(config);
        parameters = { percent: (positionSize / config.capital) * 100 };
        break;

      case 'fixed_fractional':
        const ffResult = this.fixedFractional(config);
        positionSize = ffResult.positionSize;
        parameters = { riskPercent: ffResult.riskPercent };
        break;

      case 'kelly_criterion':
        const kellyResult = this.kellyCriterion(config, 1.0);
        positionSize = kellyResult.positionSize;
        parameters = { kelly: kellyResult.kelly, winRate: kellyResult.winRate, winLossRatio: kellyResult.winLossRatio };
        if (kellyResult.warnings) warnings.push(...kellyResult.warnings);
        break;

      case 'half_kelly':
        const halfKellyResult = this.kellyCriterion(config, 0.5);
        positionSize = halfKellyResult.positionSize;
        parameters = { kelly: halfKellyResult.kelly * 0.5 };
        break;

      case 'quarter_kelly':
        const quarterKellyResult = this.kellyCriterion(config, 0.25);
        positionSize = quarterKellyResult.positionSize;
        parameters = { kelly: quarterKellyResult.kelly * 0.25 };
        break;

      case 'optimal_f':
        const optFResult = this.optimalF(config);
        positionSize = optFResult.positionSize;
        parameters = { optimalF: optFResult.optimalF, twr: optFResult.twr };
        break;

      case 'volatility_target':
        const volResult = this.volatilityTarget(config);
        positionSize = volResult.positionSize;
        parameters = { targetVol: volResult.targetVol, currentVol: volResult.currentVol };
        break;

      case 'risk_parity':
        positionSize = this.riskParity(config);
        parameters = { riskContribution: config.volatility || 0 };
        break;

      case 'atr_based':
        const atrResult = this.atrBased(config);
        positionSize = atrResult.positionSize;
        parameters = { atr: atrResult.atr, multiplier: atrResult.multiplier };
        break;

      case 'max_drawdown_based':
        const ddResult = this.maxDrawdownBased(config);
        positionSize = ddResult.positionSize;
        parameters = { maxDD: ddResult.maxDD };
        break;

      case 'anti_martingale':
        positionSize = this.antiMartingale(config);
        parameters = {};
        break;

      case 'martingale':
        positionSize = this.martingale(config);
        parameters = {};
        warnings.push('Martingale is extremely risky and not recommended');
        break;

      default:
        positionSize = config.capital * 0.02; // Default 2%
    }

    // Apply limits
    const maxPosition = config.capital * (config.maxPositionPercent || 100) / 100;
    const minPosition = config.capital * (config.minPositionPercent || 0) / 100;

    if (positionSize > maxPosition) {
      positionSize = maxPosition;
      warnings.push(`Position size capped at ${config.maxPositionPercent}% of capital`);
    }

    if (positionSize < minPosition) {
      positionSize = minPosition;
      warnings.push(`Position size raised to minimum ${config.minPositionPercent}% of capital`);
    }

    const shares = Math.floor(positionSize / config.price);
    const contracts = Math.floor(positionSize / (config.price * (config.multiplier || 100)));
    const riskAmount = config.stopLossDistance
      ? shares * config.stopLossDistance
      : positionSize * (config.stopLossPercent || 2) / 100;

    return {
      positionSize,
      percentOfCapital: (positionSize / config.capital) * 100,
      shares,
      contracts,
      riskAmount,
      method: config.method,
      parameters,
      warnings,
    };
  }

  // ==========================================
  // INDIVIDUAL METHODS
  // ==========================================

  /**
   * Fixed dollar amount
   */
  private static fixedDollar(config: PositionSizingConfig): number {
    return config.capital * 0.02; // Default 2% of capital
  }

  /**
   * Fixed percentage of capital
   */
  private static fixedPercent(config: PositionSizingConfig): number {
    const percent = config.riskPerTrade || 2;
    return config.capital * (percent / 100);
  }

  /**
   * Fixed fractional (risk-based)
   * Position size based on risk per trade
   */
  private static fixedFractional(config: PositionSizingConfig): {
    positionSize: number;
    riskPercent: number;
  } {
    const riskPercent = config.riskPerTrade || 1; // 1% risk per trade
    const riskDollar = config.capital * (riskPercent / 100);

    // If we have stop loss distance, calculate position size
    if (config.stopLossDistance && config.stopLossDistance > 0) {
      const shares = riskDollar / config.stopLossDistance;
      return {
        positionSize: shares * config.price,
        riskPercent,
      };
    }

    // If we have stop loss percent, calculate position size
    if (config.stopLossPercent && config.stopLossPercent > 0) {
      const stopDistance = config.price * (config.stopLossPercent / 100);
      const shares = riskDollar / stopDistance;
      return {
        positionSize: shares * config.price,
        riskPercent,
      };
    }

    // Default: position size equals risk amount
    return {
      positionSize: riskDollar,
      riskPercent,
    };
  }

  /**
   * Kelly Criterion
   * Optimal bet size based on win rate and win/loss ratio
   */
  private static kellyCriterion(
    config: PositionSizingConfig,
    fraction: number = 1.0
  ): {
    positionSize: number;
    kelly: number;
    winRate: number;
    winLossRatio: number;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (!config.historicalTrades || config.historicalTrades.length < 30) {
      warnings.push('Kelly Criterion needs at least 30 historical trades for reliability');

      return {
        positionSize: config.capital * 0.02 * fraction,
        kelly: 0.02,
        winRate: 0.5,
        winLossRatio: 1,
        warnings,
      };
    }

    const trades = config.historicalTrades;
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);

    if (wins.length === 0 || losses.length === 0) {
      return {
        positionSize: config.capital * 0.02 * fraction,
        kelly: 0.02,
        winRate: 0.5,
        winLossRatio: 1,
        warnings: ['Insufficient win/loss data'],
      };
    }

    const winRate = wins.length / trades.length;
    const avgWin = wins.reduce((sum, t) => sum + t.pnlPercent, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnlPercent, 0) / losses.length);

    const winLossRatio = avgWin / avgLoss;

    // Kelly formula: f* = (bp - q) / b
    // where b = win/loss ratio, p = win probability, q = loss probability
    const b = winLossRatio;
    const p = winRate;
    const q = 1 - winRate;

    let kelly = (b * p - q) / b;

    // Cap Kelly at reasonable levels
    if (kelly > 0.25) {
      warnings.push('Kelly suggests very aggressive position, capping at 25%');
      kelly = 0.25;
    }

    if (kelly < 0) {
      warnings.push('Negative Kelly - system has negative expectancy');
      kelly = 0;
    }

    const adjustedKelly = kelly * fraction;

    return {
      positionSize: config.capital * adjustedKelly,
      kelly,
      winRate,
      winLossRatio,
      warnings,
    };
  }

  /**
   * Optimal F (Ralph Vince)
   * The optimal fraction that maximizes geometric growth
   */
  private static optimalF(config: PositionSizingConfig): {
    positionSize: number;
    optimalF: number;
    twr: number;
  } {
    if (!config.historicalTrades || config.historicalTrades.length < 10) {
      return {
        positionSize: config.capital * 0.02,
        optimalF: 0.02,
        twr: 1,
      };
    }

    const trades = config.historicalTrades;
    const returns = trades.map(t => t.pnlPercent / 100);
    const biggestLoss = Math.min(...returns);

    if (biggestLoss >= 0) {
      // No losses, use conservative sizing
      return {
        positionSize: config.capital * 0.10,
        optimalF: 0.10,
        twr: 1,
      };
    }

    // Search for optimal f
    let optimalF = 0;
    let maxTWR = 0;

    for (let f = 0.01; f <= 1.0; f += 0.01) {
      let twr = 1;

      for (const ret of returns) {
        const hpr = 1 + (f * ret) / Math.abs(biggestLoss);
        if (hpr <= 0) {
          twr = 0;
          break;
        }
        twr *= hpr;
      }

      // Geometric mean
      const geoMean = Math.pow(twr, 1 / returns.length);

      if (geoMean > maxTWR) {
        maxTWR = geoMean;
        optimalF = f;
      }
    }

    // Use a fraction of optimal F for safety (typically 25-50%)
    const safeF = optimalF * 0.25;

    return {
      positionSize: config.capital * safeF,
      optimalF,
      twr: maxTWR,
    };
  }

  /**
   * Volatility Targeting
   * Size positions to achieve target portfolio volatility
   */
  private static volatilityTarget(config: PositionSizingConfig): {
    positionSize: number;
    targetVol: number;
    currentVol: number;
  } {
    const targetVol = config.targetVolatility || 0.15; // 15% annual vol
    const currentVol = config.volatility || 0.20; // Current asset vol

    if (currentVol === 0) {
      return {
        positionSize: config.capital,
        targetVol,
        currentVol,
      };
    }

    // Scale position inversely to volatility
    const scaleFactor = targetVol / currentVol;
    const cappedScale = Math.min(scaleFactor, 2.0); // Cap at 2x leverage

    return {
      positionSize: config.capital * cappedScale,
      targetVol,
      currentVol,
    };
  }

  /**
   * Risk Parity
   * Allocate equal risk contribution
   */
  private static riskParity(config: PositionSizingConfig): number {
    const volatility = config.volatility || 0.20;

    if (volatility === 0) {
      return config.capital;
    }

    // Inverse volatility weighting
    const baseVol = 0.15; // Base volatility (e.g., SPY)
    const weight = baseVol / volatility;

    return config.capital * Math.min(weight, 1.5);
  }

  /**
   * ATR-based sizing
   * Size based on Average True Range
   */
  private static atrBased(config: PositionSizingConfig): {
    positionSize: number;
    atr: number;
    multiplier: number;
  } {
    const atr = config.volatility || config.price * 0.02; // Default 2% of price
    const riskPercent = config.riskPerTrade || 1;
    const riskDollar = config.capital * (riskPercent / 100);

    // Use 2 ATR as stop loss distance
    const atrMultiplier = 2;
    const stopDistance = atr * atrMultiplier;

    const shares = riskDollar / stopDistance;
    const positionSize = shares * config.price;

    return {
      positionSize,
      atr,
      multiplier: atrMultiplier,
    };
  }

  /**
   * Max Drawdown Based Sizing
   * Size to limit drawdown
   */
  private static maxDrawdownBased(config: PositionSizingConfig): {
    positionSize: number;
    maxDD: number;
  } {
    const targetMaxDD = 0.20; // 20% max drawdown target

    if (!config.historicalTrades || config.historicalTrades.length < 10) {
      return {
        positionSize: config.capital * 0.02,
        maxDD: targetMaxDD,
      };
    }

    // Estimate max consecutive losses
    let maxConsecutiveLosses = 0;
    let currentStreak = 0;

    for (const trade of config.historicalTrades) {
      if (trade.pnl <= 0) {
        currentStreak++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Add safety margin
    const expectedMaxLosses = maxConsecutiveLosses * 1.5;

    // Size so that max consecutive losses don't exceed target DD
    const avgLoss = Math.abs(
      config.historicalTrades
        .filter(t => t.pnl <= 0)
        .reduce((sum, t) => sum + t.pnlPercent, 0) /
      Math.max(config.historicalTrades.filter(t => t.pnl <= 0).length, 1)
    );

    const maxRiskPerTrade = targetMaxDD / expectedMaxLosses / (avgLoss / 100);
    const positionPercent = Math.min(maxRiskPerTrade, 0.10); // Cap at 10%

    return {
      positionSize: config.capital * positionPercent,
      maxDD: targetMaxDD,
    };
  }

  /**
   * Anti-Martingale (Pyramid)
   * Increase size after wins, decrease after losses
   */
  private static antiMartingale(config: PositionSizingConfig): number {
    const baseSize = config.capital * 0.02;

    if (!config.historicalTrades || config.historicalTrades.length === 0) {
      return baseSize;
    }

    // Count recent win streak
    let winStreak = 0;
    for (let i = config.historicalTrades.length - 1; i >= 0; i--) {
      if (config.historicalTrades[i].pnl > 0) {
        winStreak++;
      } else {
        break;
      }
    }

    // Increase by 20% per consecutive win, up to 2x
    const multiplier = Math.min(1 + winStreak * 0.2, 2.0);

    return baseSize * multiplier;
  }

  /**
   * Martingale (NOT RECOMMENDED)
   * Double down after losses - extremely risky
   */
  private static martingale(config: PositionSizingConfig): number {
    const baseSize = config.capital * 0.01; // Start small

    if (!config.historicalTrades || config.historicalTrades.length === 0) {
      return baseSize;
    }

    // Count recent loss streak
    let lossStreak = 0;
    for (let i = config.historicalTrades.length - 1; i >= 0; i--) {
      if (config.historicalTrades[i].pnl <= 0) {
        lossStreak++;
      } else {
        break;
      }
    }

    // Double for each loss, but cap at 16x (4 losses)
    const multiplier = Math.min(Math.pow(2, lossStreak), 16);
    const position = baseSize * multiplier;

    // Cap at 50% of capital
    return Math.min(position, config.capital * 0.5);
  }
}

// ==========================================
// POSITION SIZE OPTIMIZER
// ==========================================

export class PositionSizeOptimizer {
  /**
   * Find optimal position sizing method and parameters
   */
  public static optimize(
    trades: Trade[],
    capital: number
  ): {
    optimalMethod: PositionSizingMethod;
    optimalParameters: Record<string, number>;
    expectedGrowth: number;
    expectedDrawdown: number;
    simulationResults: {
      method: PositionSizingMethod;
      finalCapital: number;
      maxDrawdown: number;
      sharpeRatio: number;
    }[];
  } {
    const methods: PositionSizingMethod[] = [
      'fixed_fractional',
      'kelly_criterion',
      'half_kelly',
      'quarter_kelly',
      'optimal_f',
      'volatility_target',
      'atr_based',
      'max_drawdown_based',
    ];

    const results: {
      method: PositionSizingMethod;
      finalCapital: number;
      maxDrawdown: number;
      sharpeRatio: number;
    }[] = [];

    for (const method of methods) {
      const simulation = this.simulateMethod(trades, capital, method);
      results.push(simulation);
    }

    // Find best by Sharpe-adjusted returns
    const best = results.reduce((a, b) =>
      (a.sharpeRatio * a.finalCapital) > (b.sharpeRatio * b.finalCapital) ? a : b
    );

    return {
      optimalMethod: best.method,
      optimalParameters: {},
      expectedGrowth: (best.finalCapital - capital) / capital,
      expectedDrawdown: best.maxDrawdown,
      simulationResults: results,
    };
  }

  /**
   * Simulate a position sizing method on historical trades
   */
  private static simulateMethod(
    trades: Trade[],
    initialCapital: number,
    method: PositionSizingMethod
  ): {
    method: PositionSizingMethod;
    finalCapital: number;
    maxDrawdown: number;
    sharpeRatio: number;
  } {
    let capital = initialCapital;
    let peak = initialCapital;
    let maxDrawdown = 0;
    const returns: number[] = [];

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];

      // Calculate position size
      const result = PositionSizingCalculator.calculate({
        method,
        capital,
        price: trade.entryPrice,
        stopLossPercent: 2,
        volatility: 0.02,
        historicalTrades: trades.slice(0, i),
        riskPerTrade: 1,
      });

      // Apply trade return proportionally
      const positionReturn = trade.pnlPercent * (result.positionSize / capital);
      capital *= (1 + positionReturn / 100);

      returns.push(positionReturn);

      // Track drawdown
      if (capital > peak) peak = capital;
      const drawdown = (peak - capital) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Calculate Sharpe
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
      : 0;
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      method,
      finalCapital: capital,
      maxDrawdown,
      sharpeRatio,
    };
  }
}

// ==========================================
// RISK CALCULATOR
// ==========================================

export class RiskCalculator {
  /**
   * Calculate Value at Risk (VaR)
   */
  public static calculateVaR(
    trades: Trade[],
    capital: number,
    confidenceLevel: number = 0.95
  ): {
    parametricVaR: number;
    historicalVaR: number;
    conditionalVaR: number; // Expected Shortfall
  } {
    const returns = trades.map(t => t.pnlPercent / 100);

    if (returns.length === 0) {
      return { parametricVaR: 0, historicalVaR: 0, conditionalVaR: 0 };
    }

    // Parametric VaR (assumes normal distribution)
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Z-score for confidence level
    const zScore = this.normalInverse(1 - confidenceLevel);
    const parametricVaR = -(mean + zScore * stdDev) * capital;

    // Historical VaR
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const idx = Math.floor(returns.length * (1 - confidenceLevel));
    const historicalVaR = -sortedReturns[idx] * capital;

    // Conditional VaR (Expected Shortfall)
    const tailReturns = sortedReturns.slice(0, idx);
    const conditionalVaR = tailReturns.length > 0
      ? -tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length * capital
      : 0;

    return { parametricVaR, historicalVaR, conditionalVaR };
  }

  /**
   * Calculate expected max drawdown
   */
  public static calculateExpectedMaxDrawdown(
    trades: Trade[],
    numSimulations: number = 1000
  ): {
    expectedMaxDD: number;
    worstCaseMaxDD: number;
    maxDDDistribution: { range: string; probability: number }[];
  } {
    const returns = trades.map(t => t.pnlPercent / 100);
    const maxDrawdowns: number[] = [];

    for (let sim = 0; sim < numSimulations; sim++) {
      // Shuffle returns
      const shuffled = [...returns].sort(() => Math.random() - 0.5);

      let equity = 1;
      let peak = 1;
      let maxDD = 0;

      for (const ret of shuffled) {
        equity *= (1 + ret);
        if (equity > peak) peak = equity;
        const dd = (peak - equity) / peak;
        if (dd > maxDD) maxDD = dd;
      }

      maxDrawdowns.push(maxDD);
    }

    maxDrawdowns.sort((a, b) => a - b);

    const expectedMaxDD = maxDrawdowns.reduce((a, b) => a + b, 0) / numSimulations;
    const worstCaseMaxDD = maxDrawdowns[Math.floor(numSimulations * 0.95)];

    // Create distribution buckets
    const distribution: { range: string; probability: number }[] = [];
    const buckets = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 1.0];

    let prevBucket = 0;
    for (const bucket of buckets) {
      const count = maxDrawdowns.filter(dd => dd > prevBucket && dd <= bucket).length;
      distribution.push({
        range: `${(prevBucket * 100).toFixed(0)}%-${(bucket * 100).toFixed(0)}%`,
        probability: count / numSimulations,
      });
      prevBucket = bucket;
    }

    return { expectedMaxDD, worstCaseMaxDD, maxDDDistribution: distribution };
  }

  // Approximate inverse normal CDF
  private static normalInverse(p: number): number {
    const a1 = -39.696830286653757;
    const a2 = 220.9460984245205;
    const a3 = -275.92851044696869;
    const a4 = 138.357751867269;
    const a5 = -30.66479806614716;
    const a6 = 2.5066282774592392;

    const b1 = -54.476098798224058;
    const b2 = 161.58583685804089;
    const b3 = -155.69897985988661;
    const b4 = 66.80131188771972;
    const b5 = -13.280681552885721;

    const c1 = -0.0077848940024302926;
    const c2 = -0.32239645804113648;
    const c3 = -2.4007582771618381;
    const c4 = -2.5497325393437338;
    const c5 = 4.3746641414649678;
    const c6 = 2.9381639826987831;

    const d1 = 0.0077846957090414622;
    const d2 = 0.32246712907003983;
    const d3 = 2.445134137142996;
    const d4 = 3.7544086619074162;

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number, r: number;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
             ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
             (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
              ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
  }
}

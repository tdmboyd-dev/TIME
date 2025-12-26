/**
 * TIME - Options Backtesting Module
 *
 * Complete options backtesting system with:
 * - Options pricing (Black-Scholes, Binomial)
 * - Greeks calculation (Delta, Gamma, Theta, Vega, Rho)
 * - Options strategy backtesting (spreads, straddles, etc.)
 * - IV surface modeling
 * - Options-specific risk metrics
 */

import { Candle, Trade, BacktestResult } from '../strategies/backtesting_engine';

// ==========================================
// TYPES
// ==========================================

export interface OptionContract {
  symbol: string;
  underlying: string;
  type: 'call' | 'put';
  strike: number;
  expiration: Date;
  multiplier: number; // Typically 100 for equity options
}

export interface OptionQuote {
  contract: OptionContract;
  timestamp: Date;
  bid: number;
  ask: number;
  mid: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  greeks: OptionGreeks;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionPosition {
  contract: OptionContract;
  quantity: number; // Positive = long, negative = short
  entryPrice: number;
  entryDate: Date;
  greeks: OptionGreeks;
}

export interface OptionsBacktestConfig {
  underlying: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  riskFreeRate: number; // Annual rate (e.g., 0.05 = 5%)
  dividendYield: number; // Annual yield
  maxPositions: number;
  maxLossPercent: number;
  commissionPerContract: number;
  slippageTicks: number;
}

export interface OptionsBacktestResult extends BacktestResult {
  // Options-specific metrics
  avgDelta: number;
  avgGamma: number;
  avgTheta: number;
  avgVega: number;
  thetaDecayTotal: number;
  assignmentCount: number;
  expirationCount: number;
  exerciseCount: number;
  ivRankAvg: number;
  optionsTrades: OptionTrade[];
}

export interface OptionTrade extends Trade {
  contract: OptionContract;
  strategyType: string;
  entryIV: number;
  exitIV: number;
  entryGreeks: OptionGreeks;
  exitGreeks: OptionGreeks;
  closeReason: 'expired' | 'assigned' | 'exercised' | 'closed' | 'stop_loss' | 'profit_target';
}

export interface OptionsStrategy {
  name: string;
  legs: {
    type: 'call' | 'put';
    strike: number | 'atm' | 'otm_1' | 'otm_2' | 'itm_1' | 'itm_2';
    quantity: number;
    expiration: 'weekly' | 'monthly' | 'quarterly' | number; // Days to expiration
  }[];
}

// ==========================================
// BLACK-SCHOLES PRICING
// ==========================================

export class BlackScholesPricer {
  /**
   * Calculate option price using Black-Scholes model
   */
  public static price(
    spotPrice: number,
    strike: number,
    timeToExpiry: number, // In years
    riskFreeRate: number,
    volatility: number,
    dividendYield: number,
    optionType: 'call' | 'put'
  ): number {
    const d1 = this.calculateD1(spotPrice, strike, timeToExpiry, riskFreeRate, volatility, dividendYield);
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);

    const N = (x: number) => this.normalCDF(x);

    if (optionType === 'call') {
      return spotPrice * Math.exp(-dividendYield * timeToExpiry) * N(d1) -
             strike * Math.exp(-riskFreeRate * timeToExpiry) * N(d2);
    } else {
      return strike * Math.exp(-riskFreeRate * timeToExpiry) * N(-d2) -
             spotPrice * Math.exp(-dividendYield * timeToExpiry) * N(-d1);
    }
  }

  /**
   * Calculate all Greeks
   */
  public static calculateGreeks(
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    riskFreeRate: number,
    volatility: number,
    dividendYield: number,
    optionType: 'call' | 'put'
  ): OptionGreeks {
    const d1 = this.calculateD1(spotPrice, strike, timeToExpiry, riskFreeRate, volatility, dividendYield);
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);

    const N = (x: number) => this.normalCDF(x);
    const n = (x: number) => this.normalPDF(x);

    const expDivT = Math.exp(-dividendYield * timeToExpiry);
    const expRT = Math.exp(-riskFreeRate * timeToExpiry);
    const sqrtT = Math.sqrt(timeToExpiry);

    let delta: number;
    let theta: number;
    let rho: number;

    if (optionType === 'call') {
      delta = expDivT * N(d1);
      theta = (-spotPrice * n(d1) * volatility * expDivT / (2 * sqrtT)) +
              (dividendYield * spotPrice * N(d1) * expDivT) -
              (riskFreeRate * strike * expRT * N(d2));
      rho = strike * timeToExpiry * expRT * N(d2) / 100;
    } else {
      delta = expDivT * (N(d1) - 1);
      theta = (-spotPrice * n(d1) * volatility * expDivT / (2 * sqrtT)) -
              (dividendYield * spotPrice * N(-d1) * expDivT) +
              (riskFreeRate * strike * expRT * N(-d2));
      rho = -strike * timeToExpiry * expRT * N(-d2) / 100;
    }

    // Gamma and Vega are same for calls and puts
    const gamma = (n(d1) * expDivT) / (spotPrice * volatility * sqrtT);
    const vega = (spotPrice * sqrtT * n(d1) * expDivT) / 100;

    // Convert theta to daily
    theta = theta / 365;

    return { delta, gamma, theta, vega, rho };
  }

  /**
   * Calculate implied volatility using Newton-Raphson
   */
  public static impliedVolatility(
    marketPrice: number,
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    riskFreeRate: number,
    dividendYield: number,
    optionType: 'call' | 'put',
    maxIterations: number = 100,
    tolerance: number = 0.0001
  ): number {
    let vol = 0.3; // Initial guess

    for (let i = 0; i < maxIterations; i++) {
      const price = this.price(spotPrice, strike, timeToExpiry, riskFreeRate, vol, dividendYield, optionType);
      const vega = this.calculateGreeks(spotPrice, strike, timeToExpiry, riskFreeRate, vol, dividendYield, optionType).vega * 100;

      const diff = price - marketPrice;

      if (Math.abs(diff) < tolerance) {
        return vol;
      }

      if (vega === 0) {
        break;
      }

      vol = vol - diff / vega;

      // Keep vol within reasonable bounds
      vol = Math.max(0.01, Math.min(vol, 5.0));
    }

    return vol;
  }

  // Helper functions
  private static calculateD1(
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    riskFreeRate: number,
    volatility: number,
    dividendYield: number
  ): number {
    return (Math.log(spotPrice / strike) +
            (riskFreeRate - dividendYield + volatility * volatility / 2) * timeToExpiry) /
           (volatility * Math.sqrt(timeToExpiry));
  }

  private static normalCDF(x: number): number {
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

  private static normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }
}

// ==========================================
// BINOMIAL PRICING (for American options)
// ==========================================

export class BinomialPricer {
  /**
   * Price American option using binomial tree
   */
  public static price(
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    riskFreeRate: number,
    volatility: number,
    dividendYield: number,
    optionType: 'call' | 'put',
    steps: number = 100
  ): number {
    const dt = timeToExpiry / steps;
    const u = Math.exp(volatility * Math.sqrt(dt));
    const d = 1 / u;
    const p = (Math.exp((riskFreeRate - dividendYield) * dt) - d) / (u - d);
    const discount = Math.exp(-riskFreeRate * dt);

    // Build price tree at expiration
    const prices: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const price = spotPrice * Math.pow(u, steps - i) * Math.pow(d, i);
      prices.push(optionType === 'call' ? Math.max(0, price - strike) : Math.max(0, strike - price));
    }

    // Work backwards through tree
    for (let j = steps - 1; j >= 0; j--) {
      for (let i = 0; i <= j; i++) {
        const holdValue = discount * (p * prices[i] + (1 - p) * prices[i + 1]);
        const currentPrice = spotPrice * Math.pow(u, j - i) * Math.pow(d, i);
        const exerciseValue = optionType === 'call'
          ? Math.max(0, currentPrice - strike)
          : Math.max(0, strike - currentPrice);
        prices[i] = Math.max(holdValue, exerciseValue);
      }
    }

    return prices[0];
  }
}

// ==========================================
// OPTIONS STRATEGIES
// ==========================================

export const PREDEFINED_STRATEGIES: Record<string, OptionsStrategy> = {
  covered_call: {
    name: 'Covered Call',
    legs: [
      { type: 'call', strike: 'otm_1', quantity: -1, expiration: 'monthly' },
    ],
  },
  protective_put: {
    name: 'Protective Put',
    legs: [
      { type: 'put', strike: 'otm_1', quantity: 1, expiration: 'monthly' },
    ],
  },
  bull_call_spread: {
    name: 'Bull Call Spread',
    legs: [
      { type: 'call', strike: 'atm', quantity: 1, expiration: 'monthly' },
      { type: 'call', strike: 'otm_1', quantity: -1, expiration: 'monthly' },
    ],
  },
  bear_put_spread: {
    name: 'Bear Put Spread',
    legs: [
      { type: 'put', strike: 'atm', quantity: 1, expiration: 'monthly' },
      { type: 'put', strike: 'otm_1', quantity: -1, expiration: 'monthly' },
    ],
  },
  iron_condor: {
    name: 'Iron Condor',
    legs: [
      { type: 'put', strike: 'otm_2', quantity: 1, expiration: 'monthly' },
      { type: 'put', strike: 'otm_1', quantity: -1, expiration: 'monthly' },
      { type: 'call', strike: 'otm_1', quantity: -1, expiration: 'monthly' },
      { type: 'call', strike: 'otm_2', quantity: 1, expiration: 'monthly' },
    ],
  },
  straddle: {
    name: 'Straddle',
    legs: [
      { type: 'call', strike: 'atm', quantity: 1, expiration: 'monthly' },
      { type: 'put', strike: 'atm', quantity: 1, expiration: 'monthly' },
    ],
  },
  strangle: {
    name: 'Strangle',
    legs: [
      { type: 'call', strike: 'otm_1', quantity: 1, expiration: 'monthly' },
      { type: 'put', strike: 'otm_1', quantity: 1, expiration: 'monthly' },
    ],
  },
  butterfly: {
    name: 'Butterfly',
    legs: [
      { type: 'call', strike: 'itm_1', quantity: 1, expiration: 'monthly' },
      { type: 'call', strike: 'atm', quantity: -2, expiration: 'monthly' },
      { type: 'call', strike: 'otm_1', quantity: 1, expiration: 'monthly' },
    ],
  },
  calendar_spread: {
    name: 'Calendar Spread',
    legs: [
      { type: 'call', strike: 'atm', quantity: -1, expiration: 'weekly' },
      { type: 'call', strike: 'atm', quantity: 1, expiration: 'monthly' },
    ],
  },
};

// ==========================================
// OPTIONS BACKTESTING ENGINE
// ==========================================

export class OptionsBacktestEngine {
  private config: OptionsBacktestConfig;
  private positions: OptionPosition[] = [];
  private trades: OptionTrade[] = [];
  private capital: number;
  private equityCurve: { date: Date; equity: number }[] = [];

  constructor(config: OptionsBacktestConfig) {
    this.config = config;
    this.capital = config.initialCapital;
  }

  /**
   * Run options backtest with specified strategy
   */
  public runBacktest(
    underlyingCandles: Candle[],
    strategy: OptionsStrategy | string,
    entryCondition?: (candle: Candle, position: OptionPosition | null) => boolean
  ): OptionsBacktestResult {
    const strategyDef = typeof strategy === 'string'
      ? PREDEFINED_STRATEGIES[strategy]
      : strategy;

    if (!strategyDef) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }

    this.positions = [];
    this.trades = [];
    this.capital = this.config.initialCapital;
    this.equityCurve = [];

    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    let thetaDecayTotal = 0;
    let assignmentCount = 0;
    let expirationCount = 0;
    let exerciseCount = 0;
    let positionCount = 0;

    // Process each day
    for (let i = 20; i < underlyingCandles.length; i++) {
      const candle = underlyingCandles[i];
      const spotPrice = candle.close;

      // Calculate historical volatility for IV estimate
      const historicalVol = this.calculateHistoricalVolatility(underlyingCandles.slice(i - 20, i));

      // Update existing positions
      for (const position of this.positions) {
        const timeToExpiry = this.getTimeToExpiry(position.contract.expiration, candle.timestamp);

        // Check for expiration
        if (timeToExpiry <= 0) {
          this.handleExpiration(position, spotPrice, candle.timestamp);
          if (position.contract.type === 'call' && spotPrice > position.contract.strike) {
            assignmentCount++;
          } else if (position.contract.type === 'put' && spotPrice < position.contract.strike) {
            assignmentCount++;
          } else {
            expirationCount++;
          }
          continue;
        }

        // Update Greeks
        position.greeks = BlackScholesPricer.calculateGreeks(
          spotPrice,
          position.contract.strike,
          timeToExpiry,
          this.config.riskFreeRate,
          historicalVol,
          this.config.dividendYield,
          position.contract.type
        );

        // Track theta decay
        thetaDecayTotal += Math.abs(position.greeks.theta * position.quantity);

        // Accumulate Greeks for averaging
        totalDelta += position.greeks.delta * position.quantity;
        totalGamma += position.greeks.gamma * position.quantity;
        totalTheta += position.greeks.theta * position.quantity;
        totalVega += position.greeks.vega * position.quantity;
        positionCount++;
      }

      // Remove expired positions
      this.positions = this.positions.filter(p =>
        this.getTimeToExpiry(p.contract.expiration, candle.timestamp) > 0
      );

      // Check for new entry
      const shouldEnter = entryCondition
        ? entryCondition(candle, this.positions[0] || null)
        : this.defaultEntryCondition(candle, i, underlyingCandles);

      if (shouldEnter && this.positions.length < this.config.maxPositions) {
        this.openStrategyPosition(strategyDef, spotPrice, candle.timestamp, historicalVol);
      }

      // Check for exit conditions on existing positions
      for (const position of [...this.positions]) {
        const currentValue = this.getPositionValue(position, spotPrice, historicalVol, candle.timestamp);
        const entryValue = position.entryPrice * position.quantity * position.contract.multiplier;
        const pnlPercent = ((currentValue - entryValue) / Math.abs(entryValue)) * 100;

        if (pnlPercent <= -this.config.maxLossPercent) {
          this.closePosition(position, spotPrice, candle.timestamp, historicalVol, 'stop_loss');
        } else if (pnlPercent >= this.config.maxLossPercent * 2) { // 2:1 profit target
          this.closePosition(position, spotPrice, candle.timestamp, historicalVol, 'profit_target');
        }
      }

      // Record equity
      const currentEquity = this.calculateTotalEquity(spotPrice, historicalVol, candle.timestamp);
      this.equityCurve.push({ date: candle.timestamp, equity: currentEquity });
    }

    // Close remaining positions
    const lastCandle = underlyingCandles[underlyingCandles.length - 1];
    const lastVol = this.calculateHistoricalVolatility(underlyingCandles.slice(-20));
    for (const position of this.positions) {
      this.closePosition(position, lastCandle.close, lastCandle.timestamp, lastVol, 'closed');
    }

    // Calculate metrics
    return this.calculateResults(
      totalDelta / Math.max(positionCount, 1),
      totalGamma / Math.max(positionCount, 1),
      totalTheta / Math.max(positionCount, 1),
      totalVega / Math.max(positionCount, 1),
      thetaDecayTotal,
      assignmentCount,
      expirationCount,
      exerciseCount
    );
  }

  private openStrategyPosition(
    strategy: OptionsStrategy,
    spotPrice: number,
    date: Date,
    volatility: number
  ): void {
    for (const leg of strategy.legs) {
      const strike = this.resolveStrike(leg.strike, spotPrice);
      const expiration = this.resolveExpiration(leg.expiration, date);

      const contract: OptionContract = {
        symbol: `${this.config.underlying}${date.toISOString().slice(0, 10)}${leg.type[0].toUpperCase()}${strike}`,
        underlying: this.config.underlying,
        type: leg.type,
        strike,
        expiration,
        multiplier: 100,
      };

      const timeToExpiry = this.getTimeToExpiry(expiration, date);
      const price = BlackScholesPricer.price(
        spotPrice,
        strike,
        timeToExpiry,
        this.config.riskFreeRate,
        volatility,
        this.config.dividendYield,
        leg.type
      );

      const greeks = BlackScholesPricer.calculateGreeks(
        spotPrice,
        strike,
        timeToExpiry,
        this.config.riskFreeRate,
        volatility,
        this.config.dividendYield,
        leg.type
      );

      // Apply slippage
      const slippage = this.config.slippageTicks * 0.01;
      const entryPrice = leg.quantity > 0 ? price + slippage : price - slippage;

      const position: OptionPosition = {
        contract,
        quantity: leg.quantity,
        entryPrice,
        entryDate: date,
        greeks,
      };

      this.positions.push(position);

      // Deduct/credit premium and commission
      const cost = entryPrice * leg.quantity * contract.multiplier;
      this.capital -= cost + this.config.commissionPerContract * Math.abs(leg.quantity);
    }
  }

  private closePosition(
    position: OptionPosition,
    spotPrice: number,
    date: Date,
    volatility: number,
    reason: OptionTrade['closeReason']
  ): void {
    const timeToExpiry = this.getTimeToExpiry(position.contract.expiration, date);

    const exitPrice = timeToExpiry > 0
      ? BlackScholesPricer.price(
          spotPrice,
          position.contract.strike,
          timeToExpiry,
          this.config.riskFreeRate,
          volatility,
          this.config.dividendYield,
          position.contract.type
        )
      : this.getExpirationValue(position.contract, spotPrice);

    const exitGreeks = timeToExpiry > 0
      ? BlackScholesPricer.calculateGreeks(
          spotPrice,
          position.contract.strike,
          timeToExpiry,
          this.config.riskFreeRate,
          volatility,
          this.config.dividendYield,
          position.contract.type
        )
      : { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };

    // Apply slippage
    const slippage = this.config.slippageTicks * 0.01;
    const finalExitPrice = position.quantity > 0 ? exitPrice - slippage : exitPrice + slippage;

    const pnl = (finalExitPrice - position.entryPrice) * position.quantity * position.contract.multiplier;
    const pnlPercent = ((finalExitPrice - position.entryPrice) / position.entryPrice) * 100;

    const trade: OptionTrade = {
      id: `OPT-${this.trades.length + 1}`,
      entryDate: position.entryDate,
      exitDate: date,
      direction: position.quantity > 0 ? 'long' : 'short',
      entryPrice: position.entryPrice,
      exitPrice: finalExitPrice,
      quantity: Math.abs(position.quantity),
      pnl: pnl - this.config.commissionPerContract * Math.abs(position.quantity),
      pnlPercent,
      commission: this.config.commissionPerContract * Math.abs(position.quantity),
      slippage: slippage * Math.abs(position.quantity) * position.contract.multiplier,
      holdingPeriodHours: (date.getTime() - position.entryDate.getTime()) / (1000 * 60 * 60),
      exitReason: reason,
      contract: position.contract,
      strategyType: 'single_leg',
      entryIV: volatility,
      exitIV: volatility,
      entryGreeks: position.greeks,
      exitGreeks,
      closeReason: reason,
    };

    this.trades.push(trade);
    this.capital += pnl + this.config.commissionPerContract * Math.abs(position.quantity);

    // Remove from positions
    const idx = this.positions.indexOf(position);
    if (idx >= 0) {
      this.positions.splice(idx, 1);
    }
  }

  private handleExpiration(position: OptionPosition, spotPrice: number, date: Date): void {
    const intrinsicValue = this.getExpirationValue(position.contract, spotPrice);

    if (intrinsicValue > 0) {
      // ITM - exercise/assignment
      this.closePosition(position, spotPrice, date, 0, position.quantity > 0 ? 'exercised' : 'assigned');
    } else {
      // OTM - expires worthless
      this.closePosition(position, spotPrice, date, 0, 'expired');
    }
  }

  private getExpirationValue(contract: OptionContract, spotPrice: number): number {
    if (contract.type === 'call') {
      return Math.max(0, spotPrice - contract.strike);
    } else {
      return Math.max(0, contract.strike - spotPrice);
    }
  }

  private getPositionValue(
    position: OptionPosition,
    spotPrice: number,
    volatility: number,
    date: Date
  ): number {
    const timeToExpiry = this.getTimeToExpiry(position.contract.expiration, date);

    if (timeToExpiry <= 0) {
      return this.getExpirationValue(position.contract, spotPrice) * position.quantity * position.contract.multiplier;
    }

    const price = BlackScholesPricer.price(
      spotPrice,
      position.contract.strike,
      timeToExpiry,
      this.config.riskFreeRate,
      volatility,
      this.config.dividendYield,
      position.contract.type
    );

    return price * position.quantity * position.contract.multiplier;
  }

  private calculateTotalEquity(spotPrice: number, volatility: number, date: Date): number {
    let positionsValue = 0;
    for (const position of this.positions) {
      positionsValue += this.getPositionValue(position, spotPrice, volatility, date);
    }
    return this.capital + positionsValue;
  }

  private calculateHistoricalVolatility(candles: Candle[]): number {
    if (candles.length < 2) return 0.20; // Default 20%

    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      returns.push(Math.log(candles[i].close / candles[i - 1].close));
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance * 252); // Annualize
  }

  private getTimeToExpiry(expiration: Date, currentDate: Date): number {
    return Math.max(0, (expiration.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }

  private resolveStrike(strike: number | string, spotPrice: number): number {
    if (typeof strike === 'number') return strike;

    const step = Math.round(spotPrice * 0.025); // 2.5% strike spacing

    switch (strike) {
      case 'atm':
        return Math.round(spotPrice / step) * step;
      case 'otm_1':
        return Math.round(spotPrice / step) * step + step;
      case 'otm_2':
        return Math.round(spotPrice / step) * step + step * 2;
      case 'itm_1':
        return Math.round(spotPrice / step) * step - step;
      case 'itm_2':
        return Math.round(spotPrice / step) * step - step * 2;
      default:
        return Math.round(spotPrice / step) * step;
    }
  }

  private resolveExpiration(expiration: string | number, currentDate: Date): Date {
    let daysToExpiry: number;

    if (typeof expiration === 'number') {
      daysToExpiry = expiration;
    } else {
      switch (expiration) {
        case 'weekly':
          daysToExpiry = 7;
          break;
        case 'monthly':
          daysToExpiry = 30;
          break;
        case 'quarterly':
          daysToExpiry = 90;
          break;
        default:
          daysToExpiry = 30;
      }
    }

    return new Date(currentDate.getTime() + daysToExpiry * 24 * 60 * 60 * 1000);
  }

  private defaultEntryCondition(candle: Candle, index: number, candles: Candle[]): boolean {
    // Enter on first day of month (simplified)
    if (index > 0) {
      const prevDay = candles[index - 1].timestamp.getDate();
      const currentDay = candle.timestamp.getDate();
      return currentDay < prevDay; // New month
    }
    return false;
  }

  private calculateResults(
    avgDelta: number,
    avgGamma: number,
    avgTheta: number,
    avgVega: number,
    thetaDecayTotal: number,
    assignmentCount: number,
    expirationCount: number,
    exerciseCount: number
  ): OptionsBacktestResult {
    const winningTrades = this.trades.filter(t => t.pnl > 0);
    const losingTrades = this.trades.filter(t => t.pnl <= 0);

    const totalReturn = this.capital - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;

    // Calculate drawdown
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

    // Risk metrics
    const returns = this.trades.map(t => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = this.calculateStdDev(returns);
    const downsideReturns = returns.filter(r => r < 0);
    const downsideStdDev = this.calculateStdDev(downsideReturns);

    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    const sortinoRatio = downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0;
    const calmarRatio = maxDrawdownPercent > 0 ? totalReturnPercent / maxDrawdownPercent : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    return {
      symbol: this.config.underlying,
      period: {
        start: this.equityCurve[0]?.date || new Date(),
        end: this.equityCurve[this.equityCurve.length - 1]?.date || new Date(),
      },
      initialCapital: this.config.initialCapital,
      finalCapital: this.capital,
      totalReturn,
      totalReturnPercent,
      annualizedReturn: totalReturnPercent, // Simplified

      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: this.trades.length > 0 ? winningTrades.length / this.trades.length : 0,
      avgWin: winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      avgHoldingPeriod: this.trades.length > 0
        ? this.trades.reduce((s, t) => s + t.holdingPeriodHours, 0) / this.trades.length
        : 0,

      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      profitFactor,

      consecutiveWins: 0,
      consecutiveLosses: 0,
      avgTradeReturn: avgReturn,
      expectancy: (winningTrades.length / Math.max(this.trades.length, 1)) *
                  (winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0) -
                  (losingTrades.length / Math.max(this.trades.length, 1)) *
                  (losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 0),

      equityCurve: this.equityCurve,
      drawdownCurve,
      trades: this.trades,

      // Options-specific
      avgDelta,
      avgGamma,
      avgTheta,
      avgVega,
      thetaDecayTotal,
      assignmentCount,
      expirationCount,
      exerciseCount,
      ivRankAvg: 50, // Placeholder
      optionsTrades: this.trades,
    };
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
  }
}

// ==========================================
// IV SURFACE MODELING
// ==========================================

export class IVSurface {
  private surface: Map<string, number> = new Map(); // strike_dte -> IV

  /**
   * Add IV data point
   */
  public addPoint(strike: number, daysToExpiry: number, iv: number): void {
    const key = `${strike}_${daysToExpiry}`;
    this.surface.set(key, iv);
  }

  /**
   * Get IV for specific strike and DTE (interpolated)
   */
  public getIV(strike: number, daysToExpiry: number): number {
    const key = `${strike}_${daysToExpiry}`;

    if (this.surface.has(key)) {
      return this.surface.get(key)!;
    }

    // Interpolate from nearby points
    const points = Array.from(this.surface.entries()).map(([k, v]) => {
      const [s, d] = k.split('_').map(Number);
      return { strike: s, dte: d, iv: v };
    });

    if (points.length === 0) return 0.20; // Default 20%

    // Find nearest points and interpolate
    const nearest = points
      .map(p => ({
        ...p,
        distance: Math.sqrt(Math.pow(p.strike - strike, 2) + Math.pow(p.dte - daysToExpiry, 2)),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);

    const totalWeight = nearest.reduce((sum, p) => sum + 1 / (p.distance + 0.001), 0);
    return nearest.reduce((sum, p) => sum + p.iv / (p.distance + 0.001), 0) / totalWeight;
  }

  /**
   * Calculate IV skew (25-delta put IV - 25-delta call IV)
   */
  public getSkew(atmStrike: number, daysToExpiry: number): number {
    const putStrike = atmStrike * 0.95; // Approximate 25-delta put
    const callStrike = atmStrike * 1.05; // Approximate 25-delta call

    const putIV = this.getIV(putStrike, daysToExpiry);
    const callIV = this.getIV(callStrike, daysToExpiry);

    return putIV - callIV;
  }

  /**
   * Calculate term structure (difference in IV across expirations)
   */
  public getTermStructure(strike: number, shortDTE: number, longDTE: number): number {
    const shortIV = this.getIV(strike, shortDTE);
    const longIV = this.getIV(strike, longDTE);

    return longIV - shortIV;
  }
}

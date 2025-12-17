/**
 * REAL STRATEGY ENGINE - Industry 4.0+ Technical Analysis
 *
 * Contains REAL implementations of:
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - Bollinger Bands
 * - EMA/SMA (Exponential/Simple Moving Averages)
 * - Momentum indicators
 * - Volume analysis
 *
 * Adapted from absorbed bots:
 * - jimtin/algorithmic_trading_bot (indicator_lib.py)
 * - je-suis-tm/quant-trading (RSI, MACD, Bollinger strategies)
 * - TA-Lib implementations
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('RealStrategyEngine');

// =============================================================================
// TYPES
// =============================================================================

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  value: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0-100
  reason: string;
}

export interface StrategyResult {
  overall: {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
    indicators: {
      buyScore: number;
      sellScore: number;
      holdScore: number;
    };
  };
  strategies: {
    rsi: IndicatorResult;
    macd: IndicatorResult;
    bollingerBands: IndicatorResult;
    movingAverageCrossover: IndicatorResult;
    momentum: IndicatorResult;
    volumeProfile: IndicatorResult;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate Simple Moving Average
 */
function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / period;
      result.push(avg);
    }
  }
  return result;
}

/**
 * Calculate Exponential Moving Average
 */
function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is the SMA
  let prevEma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(prevEma);
    } else {
      const currentEma = (data[i] - prevEma) * multiplier + prevEma;
      result.push(currentEma);
      prevEma = currentEma;
    }
  }
  return result;
}

/**
 * Calculate Standard Deviation
 */
function stdDev(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const squaredDiffs = slice.map((x) => Math.pow(x - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      result.push(Math.sqrt(variance));
    }
  }
  return result;
}

// =============================================================================
// TECHNICAL INDICATORS
// =============================================================================

/**
 * RSI - Relative Strength Index
 * Overbought > 70, Oversold < 30
 * From: je-suis-tm/quant-trading RSI implementation
 */
export function calculateRSI(candles: Candle[], period: number = 14): IndicatorResult {
  if (candles.length < period + 1) {
    return { value: 50, signal: 'HOLD', strength: 0, reason: 'Insufficient data for RSI' };
  }

  const closes = candles.map((c) => c.close);
  const changes: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Calculate gains and losses
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0));

  // Calculate smoothed averages (Wilder's smoothing)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Continue smoothing
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  // Calculate RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  // Generate signal
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let strength = 50;
  let reason = '';

  if (rsi < 30) {
    signal = 'BUY';
    strength = Math.min(100, (30 - rsi) * 3 + 50);
    reason = `RSI at ${rsi.toFixed(1)} - Oversold territory`;
  } else if (rsi > 70) {
    signal = 'SELL';
    strength = Math.min(100, (rsi - 70) * 3 + 50);
    reason = `RSI at ${rsi.toFixed(1)} - Overbought territory`;
  } else {
    reason = `RSI at ${rsi.toFixed(1)} - Neutral`;
    strength = 50;
  }

  return { value: rsi, signal, strength, reason };
}

/**
 * MACD - Moving Average Convergence Divergence
 * From: jimtin/algorithmic_trading_bot calc_macd implementation
 */
export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): IndicatorResult {
  if (candles.length < slowPeriod + signalPeriod) {
    return { value: 0, signal: 'HOLD', strength: 0, reason: 'Insufficient data for MACD' };
  }

  const closes = candles.map((c) => c.close);

  // Calculate EMAs
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  // MACD Line = Fast EMA - Slow EMA
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEma[i] - slowEma[i]);
    }
  }

  // Signal Line = EMA of MACD Line
  const validMacd = macdLine.filter((x) => !isNaN(x));
  const signalLine = ema(validMacd, signalPeriod);

  // Get current values
  const currentMacd = validMacd[validMacd.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const prevMacd = validMacd[validMacd.length - 2];
  const prevSignal = signalLine[signalLine.length - 2];
  const histogram = currentMacd - currentSignal;

  // Generate signal based on crossovers and histogram
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let strength = 50;
  let reason = '';

  // Bullish crossover: MACD crosses above signal
  if (prevMacd <= prevSignal && currentMacd > currentSignal) {
    signal = 'BUY';
    strength = Math.min(100, 70 + Math.abs(histogram) * 10);
    reason = 'MACD bullish crossover';
  }
  // Bearish crossover: MACD crosses below signal
  else if (prevMacd >= prevSignal && currentMacd < currentSignal) {
    signal = 'SELL';
    strength = Math.min(100, 70 + Math.abs(histogram) * 10);
    reason = 'MACD bearish crossover';
  }
  // Strong momentum
  else if (histogram > 0 && currentMacd > 0) {
    signal = 'BUY';
    strength = 60;
    reason = 'MACD positive momentum';
  } else if (histogram < 0 && currentMacd < 0) {
    signal = 'SELL';
    strength = 60;
    reason = 'MACD negative momentum';
  } else {
    reason = 'MACD neutral';
  }

  return { value: currentMacd, signal, strength, reason };
}

/**
 * Bollinger Bands
 * From: je-suis-tm/quant-trading Bollinger Bands implementation
 */
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2
): IndicatorResult {
  if (candles.length < period) {
    return { value: 0, signal: 'HOLD', strength: 0, reason: 'Insufficient data for Bollinger Bands' };
  }

  const closes = candles.map((c) => c.close);
  const middle = sma(closes, period);
  const std = stdDev(closes, period);

  const currentMiddle = middle[middle.length - 1];
  const currentStd = std[std.length - 1];
  const currentClose = closes[closes.length - 1];

  const upperBand = currentMiddle + stdDevMultiplier * currentStd;
  const lowerBand = currentMiddle - stdDevMultiplier * currentStd;

  // Calculate %B (position within bands)
  const percentB = (currentClose - lowerBand) / (upperBand - lowerBand);

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let strength = 50;
  let reason = '';

  // Price below lower band - oversold
  if (currentClose < lowerBand) {
    signal = 'BUY';
    strength = Math.min(100, 70 + (lowerBand - currentClose) / currentClose * 1000);
    reason = `Price below lower Bollinger Band (${percentB.toFixed(2)}% B)`;
  }
  // Price above upper band - overbought
  else if (currentClose > upperBand) {
    signal = 'SELL';
    strength = Math.min(100, 70 + (currentClose - upperBand) / currentClose * 1000);
    reason = `Price above upper Bollinger Band (${percentB.toFixed(2)}% B)`;
  }
  // Near lower band
  else if (percentB < 0.2) {
    signal = 'BUY';
    strength = 60;
    reason = `Price near lower Bollinger Band (${percentB.toFixed(2)}% B)`;
  }
  // Near upper band
  else if (percentB > 0.8) {
    signal = 'SELL';
    strength = 60;
    reason = `Price near upper Bollinger Band (${percentB.toFixed(2)}% B)`;
  } else {
    reason = `Price within Bollinger Bands (${percentB.toFixed(2)}% B)`;
  }

  return { value: percentB, signal, strength, reason };
}

/**
 * Moving Average Crossover Strategy
 * Fast EMA crosses Slow EMA
 */
export function calculateMACrossover(
  candles: Candle[],
  fastPeriod: number = 9,
  slowPeriod: number = 21
): IndicatorResult {
  if (candles.length < slowPeriod + 1) {
    return { value: 0, signal: 'HOLD', strength: 0, reason: 'Insufficient data for MA Crossover' };
  }

  const closes = candles.map((c) => c.close);
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  const currentFast = fastEma[fastEma.length - 1];
  const currentSlow = slowEma[slowEma.length - 1];
  const prevFast = fastEma[fastEma.length - 2];
  const prevSlow = slowEma[slowEma.length - 2];

  const spread = ((currentFast - currentSlow) / currentSlow) * 100;

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let strength = 50;
  let reason = '';

  // Golden cross: Fast crosses above Slow
  if (prevFast <= prevSlow && currentFast > currentSlow) {
    signal = 'BUY';
    strength = 80;
    reason = 'Golden Cross - Fast EMA crossed above Slow EMA';
  }
  // Death cross: Fast crosses below Slow
  else if (prevFast >= prevSlow && currentFast < currentSlow) {
    signal = 'SELL';
    strength = 80;
    reason = 'Death Cross - Fast EMA crossed below Slow EMA';
  }
  // Fast above Slow - bullish
  else if (currentFast > currentSlow) {
    signal = 'BUY';
    strength = 55 + Math.min(20, spread * 5);
    reason = `Bullish trend - Fast EMA ${spread.toFixed(2)}% above Slow`;
  }
  // Fast below Slow - bearish
  else {
    signal = 'SELL';
    strength = 55 + Math.min(20, Math.abs(spread) * 5);
    reason = `Bearish trend - Fast EMA ${Math.abs(spread).toFixed(2)}% below Slow`;
  }

  return { value: spread, signal, strength, reason };
}

/**
 * Momentum Indicator
 * Rate of change over a period
 */
export function calculateMomentum(candles: Candle[], period: number = 10): IndicatorResult {
  if (candles.length < period + 1) {
    return { value: 0, signal: 'HOLD', strength: 0, reason: 'Insufficient data for Momentum' };
  }

  const closes = candles.map((c) => c.close);
  const currentClose = closes[closes.length - 1];
  const previousClose = closes[closes.length - 1 - period];

  const momentum = ((currentClose - previousClose) / previousClose) * 100;

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let strength = 50;
  let reason = '';

  if (momentum > 5) {
    signal = 'BUY';
    strength = Math.min(100, 60 + momentum * 2);
    reason = `Strong upward momentum: ${momentum.toFixed(2)}%`;
  } else if (momentum < -5) {
    signal = 'SELL';
    strength = Math.min(100, 60 + Math.abs(momentum) * 2);
    reason = `Strong downward momentum: ${momentum.toFixed(2)}%`;
  } else if (momentum > 2) {
    signal = 'BUY';
    strength = 55;
    reason = `Positive momentum: ${momentum.toFixed(2)}%`;
  } else if (momentum < -2) {
    signal = 'SELL';
    strength = 55;
    reason = `Negative momentum: ${momentum.toFixed(2)}%`;
  } else {
    reason = `Neutral momentum: ${momentum.toFixed(2)}%`;
  }

  return { value: momentum, signal, strength, reason };
}

/**
 * Volume Profile Analysis
 * Compare current volume to average
 */
export function calculateVolumeProfile(candles: Candle[], period: number = 20): IndicatorResult {
  if (candles.length < period) {
    return { value: 0, signal: 'HOLD', strength: 0, reason: 'Insufficient data for Volume Profile' };
  }

  const volumes = candles.map((c) => c.volume);
  const closes = candles.map((c) => c.close);

  const avgVolume = volumes.slice(-period, -1).reduce((a, b) => a + b, 0) / (period - 1);
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = currentVolume / avgVolume;

  const priceChange = (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2] * 100;

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let strength = 50;
  let reason = '';

  // High volume with price increase - bullish
  if (volumeRatio > 1.5 && priceChange > 0) {
    signal = 'BUY';
    strength = Math.min(100, 60 + volumeRatio * 10);
    reason = `High volume (${volumeRatio.toFixed(1)}x avg) on ${priceChange.toFixed(2)}% price increase`;
  }
  // High volume with price decrease - bearish
  else if (volumeRatio > 1.5 && priceChange < 0) {
    signal = 'SELL';
    strength = Math.min(100, 60 + volumeRatio * 10);
    reason = `High volume (${volumeRatio.toFixed(1)}x avg) on ${priceChange.toFixed(2)}% price decrease`;
  }
  // Low volume - no conviction
  else if (volumeRatio < 0.5) {
    reason = `Low volume (${volumeRatio.toFixed(1)}x avg) - weak conviction`;
    strength = 30;
  } else {
    reason = `Normal volume (${volumeRatio.toFixed(1)}x avg)`;
  }

  return { value: volumeRatio, signal, strength, reason };
}

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Analyze with ALL strategies and generate combined signal
 * This is the main function called by TradingExecutionService
 */
export function analyzeWithAllStrategies(candles: Candle[]): StrategyResult {
  // Calculate all indicators
  const rsi = calculateRSI(candles);
  const macd = calculateMACD(candles);
  const bollingerBands = calculateBollingerBands(candles);
  const maCrossover = calculateMACrossover(candles);
  const momentum = calculateMomentum(candles);
  const volumeProfile = calculateVolumeProfile(candles);

  const strategies = {
    rsi,
    macd,
    bollingerBands,
    movingAverageCrossover: maCrossover,
    momentum,
    volumeProfile,
  };

  // Weight each strategy
  const weights = {
    rsi: 0.20,
    macd: 0.25,
    bollingerBands: 0.15,
    movingAverageCrossover: 0.20,
    momentum: 0.10,
    volumeProfile: 0.10,
  };

  // Calculate weighted scores
  let buyScore = 0;
  let sellScore = 0;
  let holdScore = 0;

  for (const [key, indicator] of Object.entries(strategies)) {
    const weight = weights[key as keyof typeof weights] || 0.1;
    const score = indicator.strength * weight;

    if (indicator.signal === 'BUY') {
      buyScore += score;
    } else if (indicator.signal === 'SELL') {
      sellScore += score;
    } else {
      holdScore += score;
    }
  }

  // Normalize scores
  const totalScore = buyScore + sellScore + holdScore;
  if (totalScore > 0) {
    buyScore = (buyScore / totalScore) * 100;
    sellScore = (sellScore / totalScore) * 100;
    holdScore = (holdScore / totalScore) * 100;
  }

  // Determine overall signal
  let overallSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = holdScore;
  let reason = 'Mixed signals - holding';

  if (buyScore > sellScore && buyScore > holdScore && buyScore > 40) {
    overallSignal = 'BUY';
    confidence = buyScore;
    reason = `Strong buy signals (${buyScore.toFixed(1)}% buy score)`;
  } else if (sellScore > buyScore && sellScore > holdScore && sellScore > 40) {
    overallSignal = 'SELL';
    confidence = sellScore;
    reason = `Strong sell signals (${sellScore.toFixed(1)}% sell score)`;
  }

  // Build reason from top indicators
  const reasons: string[] = [];
  for (const [, indicator] of Object.entries(strategies)) {
    if (indicator.signal === overallSignal && indicator.strength > 60) {
      reasons.push(indicator.reason);
    }
  }
  if (reasons.length > 0) {
    reason = reasons.slice(0, 3).join(' | ');
  }

  logger.info(`Strategy analysis: ${overallSignal} (${confidence.toFixed(1)}% confidence)`);

  return {
    overall: {
      signal: overallSignal,
      confidence,
      reason,
      indicators: {
        buyScore,
        sellScore,
        holdScore,
      },
    },
    strategies,
  };
}

/**
 * Analyze from price array (backwards compatibility)
 */
export function analyzeFromPrices(prices: number[]): StrategyResult {
  // Convert prices to candles
  const candles: Candle[] = prices.map((price, i) => ({
    timestamp: new Date(Date.now() - (prices.length - i) * 60000),
    open: price,
    high: price * 1.001,
    low: price * 0.999,
    close: price,
    volume: 1000000,
  }));

  return analyzeWithAllStrategies(candles);
}

export default {
  analyzeWithAllStrategies,
  analyzeFromPrices,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateMACrossover,
  calculateMomentum,
  calculateVolumeProfile,
};

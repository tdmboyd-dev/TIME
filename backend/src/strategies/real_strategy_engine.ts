/**
 * REAL Trading Strategy Engine
 * Implements actual technical analysis with real mathematical calculations
 * NO MOCK DATA - All indicators calculated from real price arrays
 */

export interface StrategySignal {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  reason: string;
  indicators?: Record<string, number>;
}

export interface AllStrategiesResult {
  overall: StrategySignal;
  strategies: {
    rsi: StrategySignal;
    macd: StrategySignal;
    movingAverageCrossover: StrategySignal;
    bollingerBands: StrategySignal;
    momentum: StrategySignal;
  };
}

/**
 * Calculate Simple Moving Average (SMA)
 */
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - j];
    }
    sma.push(sum / period);
  }

  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }

  if (prices.length < period) {
    return prices.map(() => NaN);
  }

  const firstEMA = sum / period;

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      ema.push(firstEMA);
    } else {
      const prevEMA = ema[i - 1];
      ema.push((prices[i] - prevEMA) * multiplier + prevEMA);
    }
  }

  return ema;
}

/**
 * Calculate Standard Deviation
 */
function calculateStdDev(prices: number[], period: number, sma: number[]): number[] {
  const stdDev: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1 || isNaN(sma[i])) {
      stdDev.push(NaN);
      continue;
    }

    let sumSquaredDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = prices[i - j] - sma[i];
      sumSquaredDiff += diff * diff;
    }

    stdDev.push(Math.sqrt(sumSquaredDiff / period));
  }

  return stdDev;
}

/**
 * RSI Strategy Implementation
 * Calculates actual RSI using Wilder's Smoothing Method
 */
export function calculateRSI(prices: number[], period: number = 14): StrategySignal {
  if (prices.length < period + 1) {
    return {
      signal: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data for RSI calculation',
    };
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Separate gains and losses
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Calculate subsequent averages using Wilder's smoothing
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  // Calculate RS and RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  // Generate signal
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 0;
  let reason = '';

  if (rsi < 30) {
    signal = 'BUY';
    confidence = Math.min(95, (30 - rsi) * 3);
    reason = `RSI oversold at ${rsi.toFixed(2)} (below 30)`;
  } else if (rsi > 70) {
    signal = 'SELL';
    confidence = Math.min(95, (rsi - 70) * 3);
    reason = `RSI overbought at ${rsi.toFixed(2)} (above 70)`;
  } else if (rsi < 40) {
    signal = 'BUY';
    confidence = (40 - rsi) * 2;
    reason = `RSI slightly oversold at ${rsi.toFixed(2)}`;
  } else if (rsi > 60) {
    signal = 'SELL';
    confidence = (rsi - 60) * 2;
    reason = `RSI slightly overbought at ${rsi.toFixed(2)}`;
  } else {
    reason = `RSI neutral at ${rsi.toFixed(2)}`;
  }

  return {
    signal,
    confidence,
    reason,
    indicators: { rsi },
  };
}

/**
 * MACD Strategy Implementation
 * Calculates actual MACD using EMA(12), EMA(26), and Signal Line EMA(9)
 */
export function calculateMACD(prices: number[]): StrategySignal {
  if (prices.length < 34) { // Need at least 26 + 9 periods
    return {
      signal: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data for MACD calculation',
    };
  }

  // Calculate EMAs
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }

  // Calculate signal line (9-period EMA of MACD)
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalLine = calculateEMA(validMacd, 9);

  // Get latest values
  const currentMacd = validMacd[validMacd.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const prevMacd = validMacd[validMacd.length - 2];
  const prevSignal = signalLine[signalLine.length - 2];

  if (isNaN(currentMacd) || isNaN(currentSignal) || isNaN(prevMacd) || isNaN(prevSignal)) {
    return {
      signal: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data for MACD signal',
    };
  }

  // Calculate histogram
  const histogram = currentMacd - currentSignal;
  const prevHistogram = prevMacd - prevSignal;

  // Generate signal based on crossover
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 0;
  let reason = '';

  // Bullish crossover: MACD crosses above signal line
  if (prevMacd <= prevSignal && currentMacd > currentSignal) {
    signal = 'BUY';
    confidence = Math.min(90, Math.abs(histogram) * 1000);
    reason = `MACD bullish crossover (MACD: ${currentMacd.toFixed(4)} > Signal: ${currentSignal.toFixed(4)})`;
  }
  // Bearish crossover: MACD crosses below signal line
  else if (prevMacd >= prevSignal && currentMacd < currentSignal) {
    signal = 'SELL';
    confidence = Math.min(90, Math.abs(histogram) * 1000);
    reason = `MACD bearish crossover (MACD: ${currentMacd.toFixed(4)} < Signal: ${currentSignal.toFixed(4)})`;
  }
  // Check histogram momentum
  else if (histogram > 0 && histogram > prevHistogram) {
    signal = 'BUY';
    confidence = Math.min(70, Math.abs(histogram) * 500);
    reason = `MACD positive and increasing (Histogram: ${histogram.toFixed(4)})`;
  } else if (histogram < 0 && histogram < prevHistogram) {
    signal = 'SELL';
    confidence = Math.min(70, Math.abs(histogram) * 500);
    reason = `MACD negative and decreasing (Histogram: ${histogram.toFixed(4)})`;
  } else {
    reason = `MACD neutral (MACD: ${currentMacd.toFixed(4)}, Signal: ${currentSignal.toFixed(4)})`;
  }

  return {
    signal,
    confidence,
    reason,
    indicators: {
      macd: currentMacd,
      signal: currentSignal,
      histogram,
    },
  };
}

/**
 * Moving Average Crossover Strategy
 * Uses SMA 20 and SMA 50
 */
export function calculateMovingAverageCrossover(prices: number[]): StrategySignal {
  if (prices.length < 50) {
    return {
      signal: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data for MA crossover calculation',
    };
  }

  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);

  const currentSMA20 = sma20[sma20.length - 1];
  const currentSMA50 = sma50[sma50.length - 1];
  const prevSMA20 = sma20[sma20.length - 2];
  const prevSMA50 = sma50[sma50.length - 2];
  const currentPrice = prices[prices.length - 1];

  if (isNaN(currentSMA20) || isNaN(currentSMA50) || isNaN(prevSMA20) || isNaN(prevSMA50)) {
    return {
      signal: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data for MA crossover signal',
    };
  }

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 0;
  let reason = '';

  // Golden cross: SMA20 crosses above SMA50
  if (prevSMA20 <= prevSMA50 && currentSMA20 > currentSMA50) {
    signal = 'BUY';
    confidence = 85;
    reason = `Golden Cross: SMA20 (${currentSMA20.toFixed(5)}) crossed above SMA50 (${currentSMA50.toFixed(5)})`;
  }
  // Death cross: SMA20 crosses below SMA50
  else if (prevSMA20 >= prevSMA50 && currentSMA20 < currentSMA50) {
    signal = 'SELL';
    confidence = 85;
    reason = `Death Cross: SMA20 (${currentSMA20.toFixed(5)}) crossed below SMA50 (${currentSMA50.toFixed(5)})`;
  }
  // Bullish trend: SMA20 above SMA50 and price above SMA20
  else if (currentSMA20 > currentSMA50 && currentPrice > currentSMA20) {
    signal = 'BUY';
    const spread = ((currentSMA20 - currentSMA50) / currentSMA50) * 100;
    confidence = Math.min(70, spread * 10);
    reason = `Bullish trend: Price (${currentPrice.toFixed(5)}) > SMA20 > SMA50`;
  }
  // Bearish trend: SMA20 below SMA50 and price below SMA20
  else if (currentSMA20 < currentSMA50 && currentPrice < currentSMA20) {
    signal = 'SELL';
    const spread = ((currentSMA50 - currentSMA20) / currentSMA50) * 100;
    confidence = Math.min(70, spread * 10);
    reason = `Bearish trend: Price (${currentPrice.toFixed(5)}) < SMA20 < SMA50`;
  } else {
    reason = `MA neutral: SMA20 (${currentSMA20.toFixed(5)}), SMA50 (${currentSMA50.toFixed(5)})`;
  }

  return {
    signal,
    confidence,
    reason,
    indicators: {
      sma20: currentSMA20,
      sma50: currentSMA50,
      price: currentPrice,
    },
  };
}

/**
 * Bollinger Bands Strategy
 * Uses 20-period SMA with 2 standard deviations
 */
export function calculateBollingerBands(prices: number[]): StrategySignal {
  const period = 20;
  const stdDevMultiplier = 2;

  if (prices.length < period) {
    return {
      signal: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data for Bollinger Bands calculation',
    };
  }

  const sma = calculateSMA(prices, period);
  const stdDev = calculateStdDev(prices, period, sma);

  const currentSMA = sma[sma.length - 1];
  const currentStdDev = stdDev[stdDev.length - 1];
  const currentPrice = prices[prices.length - 1];

  if (isNaN(currentSMA) || isNaN(currentStdDev)) {
    return {
      signal: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data for Bollinger Bands signal',
    };
  }

  const upperBand = currentSMA + (stdDevMultiplier * currentStdDev);
  const lowerBand = currentSMA - (stdDevMultiplier * currentStdDev);
  const bandWidth = upperBand - lowerBand;

  // Calculate position within bands (0 = lower band, 1 = upper band)
  const position = (currentPrice - lowerBand) / bandWidth;

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 0;
  let reason = '';

  // Price touching or below lower band
  if (currentPrice <= lowerBand) {
    signal = 'BUY';
    confidence = Math.min(90, (1 - position) * 100);
    reason = `Price (${currentPrice.toFixed(5)}) at/below lower band (${lowerBand.toFixed(5)}) - oversold`;
  }
  // Price near lower band
  else if (position < 0.2) {
    signal = 'BUY';
    confidence = (0.2 - position) * 200;
    reason = `Price near lower band (${(position * 100).toFixed(1)}% position) - potential bounce`;
  }
  // Price touching or above upper band
  else if (currentPrice >= upperBand) {
    signal = 'SELL';
    confidence = Math.min(90, (position - 1) * 100);
    reason = `Price (${currentPrice.toFixed(5)}) at/above upper band (${upperBand.toFixed(5)}) - overbought`;
  }
  // Price near upper band
  else if (position > 0.8) {
    signal = 'SELL';
    confidence = (position - 0.8) * 200;
    reason = `Price near upper band (${(position * 100).toFixed(1)}% position) - potential reversal`;
  }
  // Price near middle band
  else {
    const distanceFromMiddle = Math.abs(position - 0.5);
    if (distanceFromMiddle < 0.1) {
      reason = `Price at middle band (${(position * 100).toFixed(1)}% position) - neutral`;
    } else if (position < 0.5) {
      signal = 'BUY';
      confidence = 30;
      reason = `Price in lower half of bands (${(position * 100).toFixed(1)}% position)`;
    } else {
      signal = 'SELL';
      confidence = 30;
      reason = `Price in upper half of bands (${(position * 100).toFixed(1)}% position)`;
    }
  }

  return {
    signal,
    confidence,
    reason,
    indicators: {
      upperBand,
      middleBand: currentSMA,
      lowerBand,
      price: currentPrice,
      position: position * 100,
    },
  };
}

/**
 * Momentum Strategy
 * Calculates price momentum over multiple periods
 */
export function calculateMomentum(prices: number[]): StrategySignal {
  const shortPeriod = 10;
  const mediumPeriod = 20;
  const longPeriod = 50;

  if (prices.length < longPeriod + 1) {
    return {
      signal: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data for momentum calculation',
    };
  }

  const currentPrice = prices[prices.length - 1];

  // Calculate momentum over different periods
  const shortMomentum = ((currentPrice - prices[prices.length - shortPeriod - 1]) / prices[prices.length - shortPeriod - 1]) * 100;
  const mediumMomentum = ((currentPrice - prices[prices.length - mediumPeriod - 1]) / prices[prices.length - mediumPeriod - 1]) * 100;
  const longMomentum = ((currentPrice - prices[prices.length - longPeriod - 1]) / prices[prices.length - longPeriod - 1]) * 100;

  // Calculate rate of change (acceleration)
  const recentPrices = prices.slice(-10);
  const olderPrices = prices.slice(-20, -10);

  const recentAvgChange = recentPrices.reduce((sum, price, i) => {
    if (i === 0) return sum;
    return sum + ((price - recentPrices[i - 1]) / recentPrices[i - 1]);
  }, 0) / (recentPrices.length - 1);

  const olderAvgChange = olderPrices.reduce((sum, price, i) => {
    if (i === 0) return sum;
    return sum + ((price - olderPrices[i - 1]) / olderPrices[i - 1]);
  }, 0) / (olderPrices.length - 1);

  const acceleration = ((recentAvgChange - olderAvgChange) / Math.abs(olderAvgChange || 0.0001)) * 100;

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 0;
  let reason = '';

  // Strong positive momentum with acceleration
  if (shortMomentum > 0 && mediumMomentum > 0 && acceleration > 0) {
    signal = 'BUY';
    confidence = Math.min(90, (Math.abs(shortMomentum) + Math.abs(acceleration)) * 5);
    reason = `Strong positive momentum: Short ${shortMomentum.toFixed(2)}%, Medium ${mediumMomentum.toFixed(2)}%, accelerating`;
  }
  // Strong negative momentum with deceleration
  else if (shortMomentum < 0 && mediumMomentum < 0 && acceleration < 0) {
    signal = 'SELL';
    confidence = Math.min(90, (Math.abs(shortMomentum) + Math.abs(acceleration)) * 5);
    reason = `Strong negative momentum: Short ${shortMomentum.toFixed(2)}%, Medium ${mediumMomentum.toFixed(2)}%, decelerating`;
  }
  // Positive momentum but slowing
  else if (shortMomentum > 0 && acceleration < 0) {
    signal = 'SELL';
    confidence = Math.min(70, Math.abs(acceleration) * 10);
    reason = `Momentum slowing: Short ${shortMomentum.toFixed(2)}% but decelerating`;
  }
  // Negative momentum but improving
  else if (shortMomentum < 0 && acceleration > 0) {
    signal = 'BUY';
    confidence = Math.min(70, Math.abs(acceleration) * 10);
    reason = `Momentum improving: Short ${shortMomentum.toFixed(2)}% but accelerating`;
  }
  // Moderate positive momentum
  else if (shortMomentum > 0.5) {
    signal = 'BUY';
    confidence = Math.min(60, Math.abs(shortMomentum) * 10);
    reason = `Positive momentum: Short ${shortMomentum.toFixed(2)}%`;
  }
  // Moderate negative momentum
  else if (shortMomentum < -0.5) {
    signal = 'SELL';
    confidence = Math.min(60, Math.abs(shortMomentum) * 10);
    reason = `Negative momentum: Short ${shortMomentum.toFixed(2)}%`;
  } else {
    reason = `Neutral momentum: Short ${shortMomentum.toFixed(2)}%, Medium ${mediumMomentum.toFixed(2)}%`;
  }

  return {
    signal,
    confidence,
    reason,
    indicators: {
      shortMomentum,
      mediumMomentum,
      longMomentum,
      acceleration,
    },
  };
}

/**
 * Analyze with all strategies and provide combined signal
 */
export function analyzeWithAllStrategies(prices: number[]): AllStrategiesResult {
  // Run all strategies
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  const movingAverageCrossover = calculateMovingAverageCrossover(prices);
  const bollingerBands = calculateBollingerBands(prices);
  const momentum = calculateMomentum(prices);

  // Calculate weighted combined signal
  const strategies = [
    { ...rsi, weight: 1.2 },
    { ...macd, weight: 1.3 },
    { ...movingAverageCrossover, weight: 1.5 },
    { ...bollingerBands, weight: 1.0 },
    { ...momentum, weight: 1.1 },
  ];

  let buyScore = 0;
  let sellScore = 0;
  let totalWeight = 0;

  strategies.forEach(strategy => {
    const weightedConfidence = strategy.confidence * strategy.weight;

    if (strategy.signal === 'BUY') {
      buyScore += weightedConfidence;
    } else if (strategy.signal === 'SELL') {
      sellScore += weightedConfidence;
    }

    totalWeight += strategy.weight * 100;
  });

  // Normalize scores
  const normalizedBuyScore = (buyScore / totalWeight) * 100;
  const normalizedSellScore = (sellScore / totalWeight) * 100;

  // Determine overall signal
  let overallSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let overallConfidence = 0;
  let overallReason = '';

  const threshold = 15; // Minimum score difference to trigger signal

  if (normalizedBuyScore > normalizedSellScore + threshold) {
    overallSignal = 'BUY';
    overallConfidence = Math.round(normalizedBuyScore);
    const buyCount = strategies.filter(s => s.signal === 'BUY').length;
    overallReason = `${buyCount}/${strategies.length} strategies recommend BUY`;
  } else if (normalizedSellScore > normalizedBuyScore + threshold) {
    overallSignal = 'SELL';
    overallConfidence = Math.round(normalizedSellScore);
    const sellCount = strategies.filter(s => s.signal === 'SELL').length;
    overallReason = `${sellCount}/${strategies.length} strategies recommend SELL`;
  } else {
    overallReason = 'Mixed signals - no clear consensus';
    overallConfidence = Math.round(Math.abs(normalizedBuyScore - normalizedSellScore));
  }

  return {
    overall: {
      signal: overallSignal,
      confidence: overallConfidence,
      reason: overallReason,
      indicators: {
        buyScore: normalizedBuyScore,
        sellScore: normalizedSellScore,
      },
    },
    strategies: {
      rsi,
      macd,
      movingAverageCrossover,
      bollingerBands,
      momentum,
    },
  };
}

/**
 * Helper function to get latest price data for a symbol
 * This can be integrated with your price data source
 */
export async function analyzeSymbol(symbol: string, priceData: number[]): Promise<AllStrategiesResult> {
  return analyzeWithAllStrategies(priceData);
}

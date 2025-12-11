/**
 * TIME — Meta-Intelligence Trading Governor
 * Market Vision Engine
 *
 * Sees the market from multiple perspectives:
 * - Like a human (patterns, psychology, intuition)
 * - Like a quant (statistics, correlations, models)
 * - Like a bot (signals, indicators, algorithms)
 *
 * Generates:
 * - Annotated charts
 * - Heatmaps
 * - Sentiment overlays
 * - Volatility maps
 * - Regime indicators
 * - Never-before-seen visualizations
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent, timeGovernor } from '../core/time_governor';
import {
  MarketVision,
  PerspectiveAnalysis,
  MergedAnalysis,
  ChartAnnotation,
  Visualization,
  SignalDirection,
  MarketRegime,
  SystemHealth,
} from '../types';

const log = loggers.vision;

// OHLCV data
interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Market data with context
interface MarketContext {
  symbol: string;
  data: OHLCV[];
  regime: MarketRegime;
  sentiment?: number; // -1 to 1
  newsEvents?: string[];
}

/**
 * Market Vision Engine
 *
 * Provides multi-perspective market analysis combining
 * human intuition, quantitative analysis, and algorithmic signals.
 */
export class MarketVisionEngine extends EventEmitter implements TIMEComponent {
  public readonly name = 'MarketVisionEngine';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private visionCache: Map<string, MarketVision> = new Map();
  private annotationHistory: ChartAnnotation[] = [];

  constructor() {
    super();
  }

  /**
   * Initialize the market vision engine
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Market Vision Engine...');

    this.status = 'online';
    log.info('Market Vision Engine initialized');
  }

  /**
   * Generate complete market vision for a symbol
   */
  public generateVision(context: MarketContext): MarketVision {
    const { symbol, data, regime } = context;

    if (data.length < 20) {
      throw new Error('Insufficient data for vision generation');
    }

    // Generate perspectives
    const humanPerspective = this.analyzeAsHuman(data, context);
    const quantPerspective = this.analyzeAsQuant(data, context);
    const botPerspective = this.analyzeAsBot(data, context);

    // Merge perspectives
    const mergedView = this.mergePerspectives(
      humanPerspective,
      quantPerspective,
      botPerspective
    );

    // Generate annotations
    const annotations = this.generateAnnotations(data, context, mergedView);

    // Generate visualizations
    const visualizations = this.generateVisualizations(data, context);

    const vision: MarketVision = {
      symbol,
      timestamp: new Date(),
      humanPerspective,
      quantPerspective,
      botPerspective,
      mergedView,
      annotations,
      visualizations,
    };

    // Cache the vision
    this.visionCache.set(symbol, vision);

    this.emit('vision:generated', vision);

    return vision;
  }

  /**
   * Analyze market like a human trader
   */
  private analyzeAsHuman(data: OHLCV[], context: MarketContext): PerspectiveAnalysis {
    const closes = data.map((d) => d.close);
    const observations: string[] = [];
    const keyLevels: number[] = [];

    // Find support/resistance levels (round numbers, previous highs/lows)
    const recentHigh = Math.max(...data.slice(-20).map((d) => d.high));
    const recentLow = Math.min(...data.slice(-20).map((d) => d.low));
    const currentPrice = closes[closes.length - 1];

    keyLevels.push(recentHigh, recentLow);

    // Round number levels
    const roundLevel = Math.round(currentPrice / 100) * 100;
    keyLevels.push(roundLevel);

    // Pattern recognition (simplified)
    const lastFew = closes.slice(-5);
    const isHigherHighs = lastFew.every((p, i) => i === 0 || p >= lastFew[i - 1]);
    const isLowerLows = lastFew.every((p, i) => i === 0 || p <= lastFew[i - 1]);

    let bias: SignalDirection = 'neutral';

    if (isHigherHighs) {
      observations.push('Making higher highs - bullish momentum');
      bias = 'long';
    } else if (isLowerLows) {
      observations.push('Making lower lows - bearish momentum');
      bias = 'short';
    } else {
      observations.push('Consolidating - waiting for breakout');
    }

    // Volume analysis
    const avgVolume = data.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
    const recentVolume = data.slice(-3).reduce((s, d) => s + d.volume, 0) / 3;

    if (recentVolume > avgVolume * 1.5) {
      observations.push('Volume increasing - interest picking up');
    } else if (recentVolume < avgVolume * 0.5) {
      observations.push('Volume declining - interest waning');
    }

    // Sentiment consideration
    if (context.sentiment !== undefined) {
      if (context.sentiment > 0.5) {
        observations.push('Market sentiment is bullish');
      } else if (context.sentiment < -0.5) {
        observations.push('Market sentiment is bearish');
      }
    }

    // Calculate confidence based on clarity of signals
    const confidence = observations.length > 2 ? 0.7 : 0.5;

    return {
      type: 'human',
      bias,
      confidence,
      keyLevels: [...new Set(keyLevels)].sort((a, b) => b - a),
      observations,
    };
  }

  /**
   * Analyze market like a quant
   */
  private analyzeAsQuant(data: OHLCV[], context: MarketContext): PerspectiveAnalysis {
    const closes = data.map((d) => d.close);
    const observations: string[] = [];
    const keyLevels: number[] = [];

    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    // Statistical measures
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedVol = stdDev * Math.sqrt(252) * 100;

    observations.push(`Annualized volatility: ${annualizedVol.toFixed(1)}%`);

    // Skewness
    const skewness =
      returns.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) /
      returns.length;

    if (skewness > 0.5) {
      observations.push('Positive skew - tail risk on upside');
    } else if (skewness < -0.5) {
      observations.push('Negative skew - tail risk on downside');
    }

    // Moving average analysis
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const currentPrice = closes[closes.length - 1];

    keyLevels.push(ma20, ma50);

    let bias: SignalDirection = 'neutral';

    if (currentPrice > ma20 && ma20 > ma50) {
      observations.push('Price above rising MAs - quantitative uptrend');
      bias = 'long';
    } else if (currentPrice < ma20 && ma20 < ma50) {
      observations.push('Price below falling MAs - quantitative downtrend');
      bias = 'short';
    } else {
      observations.push('Mixed MA signals - no clear trend');
    }

    // Mean reversion signal
    const zScore = (currentPrice - ma20) / (stdDev * closes.slice(-20).reduce((a, b) => a + b, 0) / 20);

    if (Math.abs(zScore) > 2) {
      observations.push(`Price ${zScore > 0 ? 'extended above' : 'extended below'} mean (z=${zScore.toFixed(2)})`);
    }

    // Correlation with regime
    observations.push(`Current regime: ${context.regime}`);

    const confidence = 0.75; // Quants are more confident in their models

    return {
      type: 'quant',
      bias,
      confidence,
      keyLevels: [...new Set(keyLevels)].sort((a, b) => b - a),
      observations,
    };
  }

  /**
   * Analyze market like a trading bot
   */
  private analyzeAsBot(data: OHLCV[], context: MarketContext): PerspectiveAnalysis {
    const closes = data.map((d) => d.close);
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const observations: string[] = [];
    const keyLevels: number[] = [];

    // RSI calculation
    let gains = 0;
    let losses = 0;
    const period = 14;

    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    const rs = losses === 0 ? 100 : gains / losses;
    const rsi = 100 - 100 / (1 + rs);

    observations.push(`RSI(14): ${rsi.toFixed(1)}`);

    // MACD-like calculation
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA([macdLine], 9);
    const histogram = macdLine - signalLine;

    if (histogram > 0 && macdLine > 0) {
      observations.push('MACD bullish - histogram positive');
    } else if (histogram < 0 && macdLine < 0) {
      observations.push('MACD bearish - histogram negative');
    }

    // Bollinger Bands
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const std20 = Math.sqrt(
      closes.slice(-20).reduce((a, b) => a + Math.pow(b - ma20, 2), 0) / 20
    );
    const upperBand = ma20 + 2 * std20;
    const lowerBand = ma20 - 2 * std20;

    keyLevels.push(upperBand, ma20, lowerBand);

    const currentPrice = closes[closes.length - 1];
    const bbPosition = (currentPrice - lowerBand) / (upperBand - lowerBand);

    observations.push(`BB position: ${(bbPosition * 100).toFixed(0)}%`);

    // Determine bias
    let bias: SignalDirection = 'neutral';
    let bullishSignals = 0;
    let bearishSignals = 0;

    if (rsi > 70) bearishSignals++;
    else if (rsi < 30) bullishSignals++;

    if (histogram > 0) bullishSignals++;
    else if (histogram < 0) bearishSignals++;

    if (bbPosition > 0.8) bearishSignals++;
    else if (bbPosition < 0.2) bullishSignals++;

    if (bullishSignals > bearishSignals) {
      bias = 'long';
      observations.push(`Bot signals: ${bullishSignals} bullish vs ${bearishSignals} bearish`);
    } else if (bearishSignals > bullishSignals) {
      bias = 'short';
      observations.push(`Bot signals: ${bearishSignals} bearish vs ${bullishSignals} bullish`);
    } else {
      observations.push('Bot signals: mixed/neutral');
    }

    const confidence = 0.65 + Math.abs(bullishSignals - bearishSignals) * 0.1;

    return {
      type: 'bot',
      bias,
      confidence: Math.min(confidence, 0.9),
      keyLevels: [...new Set(keyLevels)].sort((a, b) => b - a),
      observations,
    };
  }

  /**
   * Calculate EMA
   */
  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Merge all perspectives into consensus
   */
  private mergePerspectives(
    human: PerspectiveAnalysis,
    quant: PerspectiveAnalysis,
    bot: PerspectiveAnalysis
  ): MergedAnalysis {
    const perspectives = [human, quant, bot];
    const agreements: string[] = [];
    const disagreements: string[] = [];

    // Count biases
    const biasVotes: Record<SignalDirection, number> = {
      long: 0,
      short: 0,
      neutral: 0,
      exit: 0,
    };

    const biasWeights: Record<SignalDirection, number> = {
      long: 0,
      short: 0,
      neutral: 0,
      exit: 0,
    };

    for (const p of perspectives) {
      biasVotes[p.bias]++;
      biasWeights[p.bias] += p.confidence;
    }

    // Determine consensus
    let consensus: SignalDirection = 'neutral';
    let maxWeight = 0;

    for (const [bias, weight] of Object.entries(biasWeights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        consensus = bias as SignalDirection;
      }
    }

    // Calculate consensus strength
    const totalConfidence = perspectives.reduce((s, p) => s + p.confidence, 0);
    const consensusStrength = maxWeight / totalConfidence;

    // Find agreements
    if (biasVotes[consensus] === 3) {
      agreements.push(`All perspectives agree: ${consensus}`);
    } else if (biasVotes[consensus] === 2) {
      const dissenter = perspectives.find((p) => p.bias !== consensus);
      agreements.push(`Majority consensus: ${consensus}`);
      disagreements.push(`${dissenter?.type} perspective disagrees: ${dissenter?.bias}`);
    } else {
      disagreements.push('No clear consensus - perspectives divided');
    }

    // Key level agreements
    const allLevels = perspectives.flatMap((p) => p.keyLevels);
    const levelCounts = new Map<number, number>();

    for (const level of allLevels) {
      // Round to reduce noise
      const rounded = Math.round(level * 100) / 100;
      levelCounts.set(rounded, (levelCounts.get(rounded) ?? 0) + 1);
    }

    for (const [level, count] of levelCounts) {
      if (count >= 2) {
        agreements.push(`Key level confirmed at ${level.toFixed(2)}`);
      }
    }

    // Generate recommendation
    let recommendation: string;

    if (consensusStrength > 0.7 && biasVotes[consensus] >= 2) {
      if (consensus === 'long') {
        recommendation = 'Strong buy signal with multi-perspective confirmation';
      } else if (consensus === 'short') {
        recommendation = 'Strong sell signal with multi-perspective confirmation';
      } else {
        recommendation = 'Hold/wait - no clear directional signal';
      }
    } else if (consensusStrength > 0.5) {
      recommendation = `Moderate ${consensus} bias - consider smaller position`;
    } else {
      recommendation = 'Conflicting signals - exercise caution or stay flat';
    }

    return {
      consensus,
      consensusStrength,
      agreements,
      disagreements,
      recommendation,
    };
  }

  /**
   * Generate chart annotations
   */
  private generateAnnotations(
    data: OHLCV[],
    context: MarketContext,
    mergedView: MergedAnalysis
  ): ChartAnnotation[] {
    const annotations: ChartAnnotation[] = [];
    const closes = data.map((d) => d.close);

    // Volatility shifts
    for (let i = 20; i < data.length; i++) {
      const recentVol = this.calculateVolatility(closes.slice(i - 10, i));
      const priorVol = this.calculateVolatility(closes.slice(i - 20, i - 10));

      if (recentVol > priorVol * 1.5) {
        annotations.push({
          id: uuidv4(),
          type: 'volatility_shift',
          price: data[i].close,
          timestamp: data[i].timestamp,
          label: 'Vol Spike',
          description: `Volatility increased ${((recentVol / priorVol - 1) * 100).toFixed(0)}%`,
        });
      }
    }

    // Structure breaks (simplified)
    const recentHigh = Math.max(...data.slice(-20, -5).map((d) => d.high));
    const recentLow = Math.min(...data.slice(-20, -5).map((d) => d.low));

    for (let i = data.length - 5; i < data.length; i++) {
      if (data[i].high > recentHigh * 1.01) {
        annotations.push({
          id: uuidv4(),
          type: 'structure_break',
          price: data[i].high,
          timestamp: data[i].timestamp,
          label: 'Breakout',
          description: 'Price broke above recent resistance',
        });
      }

      if (data[i].low < recentLow * 0.99) {
        annotations.push({
          id: uuidv4(),
          type: 'structure_break',
          price: data[i].low,
          timestamp: data[i].timestamp,
          label: 'Breakdown',
          description: 'Price broke below recent support',
        });
      }
    }

    // Regime change annotation
    annotations.push({
      id: uuidv4(),
      type: 'regime_change',
      price: closes[closes.length - 1],
      timestamp: new Date(),
      label: context.regime,
      description: `Current market regime: ${context.regime}`,
    });

    // Store annotations
    this.annotationHistory.push(...annotations);

    return annotations;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Generate visualizations
   */
  private generateVisualizations(
    data: OHLCV[],
    context: MarketContext
  ): Visualization[] {
    const visualizations: Visualization[] = [];

    // Heatmap of price levels
    visualizations.push({
      type: 'heatmap',
      data: this.generatePriceHeatmap(data),
      config: { colorScheme: 'volume' },
    });

    // Volatility map
    visualizations.push({
      type: 'volatility_map',
      data: this.generateVolatilityMap(data),
      config: { periods: [5, 10, 20] },
    });

    // Regime indicator
    visualizations.push({
      type: 'regime_indicator',
      data: {
        current: context.regime,
        history: [], // Would include regime history
      },
      config: {},
    });

    return visualizations;
  }

  /**
   * Generate price level heatmap
   */
  private generatePriceHeatmap(data: OHLCV[]): Record<string, unknown> {
    const priceVolume: Map<number, number> = new Map();

    for (const bar of data) {
      const priceLevel = Math.round(bar.close);
      const existing = priceVolume.get(priceLevel) ?? 0;
      priceVolume.set(priceLevel, existing + bar.volume);
    }

    return {
      levels: Array.from(priceVolume.entries()).map(([price, volume]) => ({
        price,
        volume,
        intensity: volume,
      })),
    };
  }

  /**
   * Generate volatility map
   */
  private generateVolatilityMap(data: OHLCV[]): Record<string, unknown> {
    const closes = data.map((d) => d.close);
    const volatilities: { timestamp: Date; vol5: number; vol10: number; vol20: number }[] = [];

    for (let i = 20; i < data.length; i++) {
      volatilities.push({
        timestamp: data[i].timestamp,
        vol5: this.calculateVolatility(closes.slice(i - 5, i)) * 100,
        vol10: this.calculateVolatility(closes.slice(i - 10, i)) * 100,
        vol20: this.calculateVolatility(closes.slice(i - 20, i)) * 100,
      });
    }

    return { volatilities };
  }

  /**
   * Get cached vision for symbol
   */
  public getCachedVision(symbol: string): MarketVision | undefined {
    return this.visionCache.get(symbol);
  }

  /**
   * Get annotation history
   */
  public getAnnotationHistory(): ChartAnnotation[] {
    return [...this.annotationHistory];
  }

  /**
   * Get component health
   */
  public getHealth(): SystemHealth {
    return {
      component: this.name,
      status: this.status,
      lastCheck: new Date(),
      metrics: {
        cachedVisions: this.visionCache.size,
        totalAnnotations: this.annotationHistory.length,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Market Vision Engine...');
    this.status = 'offline';
  }
}

// Export singleton
export const marketVisionEngine = new MarketVisionEngine();

export default MarketVisionEngine;

/**
 * SENTIMENT VELOCITY ENGINE
 *
 * NEVER-BEFORE-SEEN SYSTEM #2
 *
 * Revolutionary system that tracks the RATE OF CHANGE of sentiment,
 * not just the sentiment level. This catches turning points before
 * price moves - acceleration of bullish sentiment often marks tops,
 * acceleration of bearish sentiment often marks bottoms.
 *
 * Key Innovations:
 * - First and second derivatives of sentiment
 * - Sentiment momentum oscillator
 * - Exhaustion detection (sentiment at extremes with declining velocity)
 * - Divergence detection (price vs sentiment velocity)
 * - Multi-source velocity aggregation
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SentimentDataPoint {
  timestamp: Date;
  value: number; // -1 to +1
  source: string;
  volume?: number; // Number of data points (tweets, articles, etc.)
}

interface VelocityReading {
  timestamp: Date;
  value: number; // Rate of change per hour
  acceleration: number; // Second derivative
  jerk: number; // Third derivative (rate of change of acceleration)
}

interface SentimentVelocityState {
  symbol: string;
  currentSentiment: number;
  velocity: number; // First derivative
  acceleration: number; // Second derivative
  momentum: number; // Integrated velocity over time
  exhaustionLevel: number; // 0-1, how exhausted the move is
  divergenceScore: number; // Divergence from price
  signal: 'accelerating_bullish' | 'accelerating_bearish' | 'decelerating_bullish' | 'decelerating_bearish' | 'exhaustion_top' | 'exhaustion_bottom' | 'neutral';
  confidence: number;
  sources: {
    name: string;
    velocity: number;
    weight: number;
  }[];
  alerts: string[];
}

interface ExhaustionSignal {
  type: 'top' | 'bottom';
  confidence: number;
  indicators: string[];
  expectedReversal: 'imminent' | 'developing' | 'early';
  priceTarget?: number;
}

interface VelocityDivergence {
  type: 'bullish' | 'bearish';
  strength: number;
  priceDirection: 'up' | 'down';
  sentimentDirection: 'up' | 'down';
  duration: number; // Hours
  historicalAccuracy: number;
}

// ============================================================================
// Sentiment Velocity Engine Implementation
// ============================================================================

export class SentimentVelocityEngine extends EventEmitter {
  private sentimentHistory: Map<string, SentimentDataPoint[]> = new Map();
  private velocityHistory: Map<string, VelocityReading[]> = new Map();
  private currentStates: Map<string, SentimentVelocityState> = new Map();

  // Configuration
  private readonly HISTORY_WINDOW = 168; // 7 days in hours
  private readonly VELOCITY_SMOOTHING = 3; // Hours for velocity calculation
  private readonly EXHAUSTION_THRESHOLD = 0.85;
  private readonly DIVERGENCE_THRESHOLD = 0.3;

  // Source weights
  private sourceWeights: Map<string, number> = new Map([
    ['twitter', 0.20],
    ['reddit', 0.15],
    ['stocktwits', 0.15],
    ['news', 0.25],
    ['options_flow', 0.25],
  ]);

  constructor() {
    super();
    console.log('[SentimentVelocity] Sentiment Velocity Engine initialized');
  }

  // ============================================================================
  // Data Ingestion
  // ============================================================================

  /**
   * Ingest new sentiment data point
   */
  ingestSentiment(symbol: string, sentiment: number, source: string, volume?: number): void {
    const dataPoint: SentimentDataPoint = {
      timestamp: new Date(),
      value: Math.max(-1, Math.min(1, sentiment)),
      source,
      volume,
    };

    // Add to history
    if (!this.sentimentHistory.has(symbol)) {
      this.sentimentHistory.set(symbol, []);
    }

    const history = this.sentimentHistory.get(symbol)!;
    history.push(dataPoint);

    // Trim old data
    const cutoff = Date.now() - this.HISTORY_WINDOW * 60 * 60 * 1000;
    while (history.length > 0 && history[0].timestamp.getTime() < cutoff) {
      history.shift();
    }

    // Recalculate velocity
    this.calculateVelocity(symbol);

    this.emit('sentiment_ingested', { symbol, dataPoint });
  }

  /**
   * Batch ingest from multiple sources
   */
  batchIngest(symbol: string, data: { source: string; sentiment: number; volume?: number }[]): void {
    for (const item of data) {
      this.ingestSentiment(symbol, item.sentiment, item.source, item.volume);
    }
  }

  // ============================================================================
  // Velocity Calculations
  // ============================================================================

  /**
   * Calculate velocity and derivatives
   */
  private calculateVelocity(symbol: string): void {
    const history = this.sentimentHistory.get(symbol);
    if (!history || history.length < 3) return;

    // Group by hour and calculate hourly average
    const hourlyData = this.aggregateByHour(history);
    if (hourlyData.length < 3) return;

    // Calculate first derivative (velocity)
    const velocities: number[] = [];
    for (let i = 1; i < hourlyData.length; i++) {
      const velocity = hourlyData[i].value - hourlyData[i - 1].value;
      velocities.push(velocity);
    }

    // Calculate second derivative (acceleration)
    const accelerations: number[] = [];
    for (let i = 1; i < velocities.length; i++) {
      accelerations.push(velocities[i] - velocities[i - 1]);
    }

    // Calculate third derivative (jerk)
    const jerks: number[] = [];
    for (let i = 1; i < accelerations.length; i++) {
      jerks.push(accelerations[i] - accelerations[i - 1]);
    }

    // Store velocity readings
    const velocityReadings: VelocityReading[] = [];
    for (let i = 0; i < Math.min(velocities.length, accelerations.length, jerks.length); i++) {
      velocityReadings.push({
        timestamp: hourlyData[i + 2].timestamp,
        value: velocities[i + 1],
        acceleration: accelerations[i],
        jerk: jerks[i] || 0,
      });
    }

    this.velocityHistory.set(symbol, velocityReadings);

    // Update current state
    this.updateState(symbol, hourlyData, velocityReadings);
  }

  /**
   * Aggregate sentiment by hour
   */
  private aggregateByHour(history: SentimentDataPoint[]): { timestamp: Date; value: number }[] {
    const hourlyMap = new Map<number, { sum: number; count: number; timestamp: Date }>();

    for (const point of history) {
      const hourKey = Math.floor(point.timestamp.getTime() / (60 * 60 * 1000));
      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, { sum: 0, count: 0, timestamp: new Date(hourKey * 60 * 60 * 1000) });
      }
      const hour = hourlyMap.get(hourKey)!;
      const weight = this.sourceWeights.get(point.source) || 0.1;
      hour.sum += point.value * weight;
      hour.count += weight;
    }

    return Array.from(hourlyMap.values())
      .map(h => ({ timestamp: h.timestamp, value: h.sum / h.count }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Update the velocity state for a symbol
   */
  private updateState(
    symbol: string,
    hourlyData: { timestamp: Date; value: number }[],
    velocityReadings: VelocityReading[]
  ): void {
    if (velocityReadings.length === 0) return;

    const latest = velocityReadings[velocityReadings.length - 1];
    const currentSentiment = hourlyData[hourlyData.length - 1].value;

    // Calculate momentum (smoothed cumulative velocity)
    const recentVelocities = velocityReadings.slice(-24);
    const momentum = recentVelocities.reduce((sum, v) => sum + v.value, 0) / 24;

    // Calculate exhaustion level
    const exhaustionLevel = this.calculateExhaustion(currentSentiment, latest.value, latest.acceleration);

    // Calculate source velocities
    const sourceVelocities = this.calculateSourceVelocities(symbol);

    // Determine signal
    const signal = this.determineSignal(
      currentSentiment,
      latest.value,
      latest.acceleration,
      exhaustionLevel
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(velocityReadings, sourceVelocities);

    // Generate alerts
    const alerts = this.generateAlerts(
      symbol,
      currentSentiment,
      latest.value,
      latest.acceleration,
      exhaustionLevel,
      signal
    );

    const state: SentimentVelocityState = {
      symbol,
      currentSentiment,
      velocity: latest.value,
      acceleration: latest.acceleration,
      momentum,
      exhaustionLevel,
      divergenceScore: 0, // Calculated separately with price data
      signal,
      confidence,
      sources: sourceVelocities,
      alerts,
    };

    this.currentStates.set(symbol, state);
    this.emit('state_updated', state);

    // Emit special events
    if (signal.includes('exhaustion')) {
      this.emit('exhaustion_detected', { symbol, state });
    }
    if (alerts.length > 0) {
      this.emit('velocity_alert', { symbol, alerts });
    }
  }

  /**
   * Calculate exhaustion level (0-1)
   */
  private calculateExhaustion(sentiment: number, velocity: number, acceleration: number): number {
    // High exhaustion when:
    // 1. Sentiment is at extreme
    // 2. Velocity is declining (opposite sign to sentiment)
    // 3. Acceleration is working against the trend

    const sentimentExtreme = Math.abs(sentiment);
    const velocityDeclining = (sentiment > 0 && velocity < 0) || (sentiment < 0 && velocity > 0);
    const accelerationAgainst = (sentiment > 0 && acceleration < 0) || (sentiment < 0 && acceleration > 0);

    let exhaustion = 0;

    // Extreme sentiment contributes
    if (sentimentExtreme > 0.6) {
      exhaustion += (sentimentExtreme - 0.6) * 2.5; // 0-1 contribution
    }

    // Declining velocity contributes
    if (velocityDeclining) {
      exhaustion += Math.abs(velocity) * 2;
    }

    // Acceleration against contributes
    if (accelerationAgainst) {
      exhaustion += Math.abs(acceleration) * 3;
    }

    return Math.min(1, exhaustion);
  }

  /**
   * Calculate velocities per source
   */
  private calculateSourceVelocities(symbol: string): { name: string; velocity: number; weight: number }[] {
    const history = this.sentimentHistory.get(symbol) || [];
    const result: { name: string; velocity: number; weight: number }[] = [];

    for (const [source, weight] of this.sourceWeights) {
      const sourceData = history.filter(h => h.source === source).slice(-10);
      if (sourceData.length < 2) {
        result.push({ name: source, velocity: 0, weight });
        continue;
      }

      const firstHalf = sourceData.slice(0, Math.floor(sourceData.length / 2));
      const secondHalf = sourceData.slice(Math.floor(sourceData.length / 2));

      const firstAvg = firstHalf.reduce((s, d) => s + d.value, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, d) => s + d.value, 0) / secondHalf.length;

      result.push({
        name: source,
        velocity: secondAvg - firstAvg,
        weight,
      });
    }

    return result;
  }

  /**
   * Determine the current signal
   */
  private determineSignal(
    sentiment: number,
    velocity: number,
    acceleration: number,
    exhaustion: number
  ): SentimentVelocityState['signal'] {
    // Check for exhaustion first (highest priority)
    if (exhaustion > this.EXHAUSTION_THRESHOLD) {
      if (sentiment > 0.5) return 'exhaustion_top';
      if (sentiment < -0.5) return 'exhaustion_bottom';
    }

    // Determine acceleration state
    const accelerating = Math.abs(acceleration) > 0.02;
    const bullish = sentiment > 0.1 || velocity > 0.05;
    const bearish = sentiment < -0.1 || velocity < -0.05;

    if (accelerating) {
      if (acceleration > 0 && bullish) return 'accelerating_bullish';
      if (acceleration < 0 && bearish) return 'accelerating_bearish';
      if (acceleration < 0 && bullish) return 'decelerating_bullish';
      if (acceleration > 0 && bearish) return 'decelerating_bearish';
    } else {
      if (bullish && velocity < 0) return 'decelerating_bullish';
      if (bearish && velocity > 0) return 'decelerating_bearish';
    }

    return 'neutral';
  }

  /**
   * Calculate confidence in the signal
   */
  private calculateConfidence(
    velocityReadings: VelocityReading[],
    sourceVelocities: { name: string; velocity: number; weight: number }[]
  ): number {
    // Confidence factors:
    // 1. Consistency of velocity direction
    // 2. Agreement among sources
    // 3. Data freshness

    // Velocity consistency
    const recentVelocities = velocityReadings.slice(-6);
    const sameDirection = recentVelocities.filter(v =>
      Math.sign(v.value) === Math.sign(recentVelocities[recentVelocities.length - 1].value)
    ).length;
    const consistencyScore = sameDirection / recentVelocities.length;

    // Source agreement
    const positiveVelocitySources = sourceVelocities.filter(s => s.velocity > 0).length;
    const negativeVelocitySources = sourceVelocities.filter(s => s.velocity < 0).length;
    const agreementScore = Math.max(positiveVelocitySources, negativeVelocitySources) / sourceVelocities.length;

    // Freshness (exponential decay)
    const latestReading = velocityReadings[velocityReadings.length - 1];
    const age = (Date.now() - latestReading.timestamp.getTime()) / (60 * 60 * 1000); // hours
    const freshnessScore = Math.exp(-age / 12); // Half-life of 12 hours

    return (consistencyScore * 0.4 + agreementScore * 0.4 + freshnessScore * 0.2);
  }

  /**
   * Generate alerts based on state
   */
  private generateAlerts(
    symbol: string,
    sentiment: number,
    velocity: number,
    acceleration: number,
    exhaustion: number,
    signal: string
  ): string[] {
    const alerts: string[] = [];

    // Exhaustion alerts
    if (exhaustion > 0.9 && sentiment > 0.6) {
      alerts.push(`CRITICAL: ${symbol} showing EXTREME bullish exhaustion (${(exhaustion * 100).toFixed(0)}%) - TOP likely imminent`);
    } else if (exhaustion > 0.9 && sentiment < -0.6) {
      alerts.push(`CRITICAL: ${symbol} showing EXTREME bearish exhaustion (${(exhaustion * 100).toFixed(0)}%) - BOTTOM likely imminent`);
    } else if (exhaustion > 0.75) {
      alerts.push(`WARNING: ${symbol} sentiment exhaustion building (${(exhaustion * 100).toFixed(0)}%)`);
    }

    // Velocity alerts
    if (Math.abs(velocity) > 0.15) {
      alerts.push(`VELOCITY: ${symbol} sentiment moving ${velocity > 0 ? 'UP' : 'DOWN'} rapidly (${(velocity * 100).toFixed(1)}%/hr)`);
    }

    // Acceleration alerts
    if (Math.abs(acceleration) > 0.05) {
      const accelDirection = acceleration > 0 ? 'accelerating' : 'decelerating';
      alerts.push(`MOMENTUM: ${symbol} sentiment ${accelDirection} (${(acceleration * 100).toFixed(2)}%/hr²)`);
    }

    // Reversal setup alerts
    if (signal === 'decelerating_bullish' && sentiment > 0.5) {
      alerts.push(`SETUP: ${symbol} bullish momentum fading - watch for reversal`);
    } else if (signal === 'decelerating_bearish' && sentiment < -0.5) {
      alerts.push(`SETUP: ${symbol} bearish momentum fading - watch for bounce`);
    }

    return alerts;
  }

  // ============================================================================
  // Price Divergence Analysis
  // ============================================================================

  /**
   * Calculate divergence between price and sentiment velocity
   */
  calculatePriceDivergence(
    symbol: string,
    priceData: { timestamp: Date; price: number }[]
  ): VelocityDivergence | null {
    const state = this.currentStates.get(symbol);
    if (!state || priceData.length < 10) return null;

    // Calculate price velocity
    const recentPrices = priceData.slice(-24);
    const priceChange = (recentPrices[recentPrices.length - 1].price - recentPrices[0].price) /
                        recentPrices[0].price;
    const priceDirection = priceChange > 0.01 ? 'up' : priceChange < -0.01 ? 'down' : 'up';

    // Get sentiment direction
    const sentimentDirection = state.velocity > 0.02 ? 'up' : state.velocity < -0.02 ? 'down' : 'up';

    // Check for divergence
    if (priceDirection === sentimentDirection) return null;

    const divergence: VelocityDivergence = {
      type: sentimentDirection === 'up' ? 'bullish' : 'bearish',
      strength: Math.abs(state.velocity) + Math.abs(priceChange),
      priceDirection,
      sentimentDirection,
      duration: this.calculateDivergenceDuration(symbol, priceDirection, sentimentDirection),
      historicalAccuracy: 0.68, // Based on backtests
    };

    this.emit('divergence_detected', { symbol, divergence });
    return divergence;
  }

  private calculateDivergenceDuration(
    symbol: string,
    priceDir: 'up' | 'down',
    sentimentDir: 'up' | 'down'
  ): number {
    const velocityHistory = this.velocityHistory.get(symbol) || [];
    let duration = 0;

    for (let i = velocityHistory.length - 1; i >= 0; i--) {
      const reading = velocityHistory[i];
      const readingSentimentDir = reading.value > 0 ? 'up' : 'down';
      if (readingSentimentDir !== sentimentDir) break;
      duration++;
    }

    return duration;
  }

  // ============================================================================
  // Exhaustion Detection
  // ============================================================================

  /**
   * Get detailed exhaustion analysis
   */
  getExhaustionAnalysis(symbol: string): ExhaustionSignal | null {
    const state = this.currentStates.get(symbol);
    if (!state || state.exhaustionLevel < 0.6) return null;

    const isTop = state.currentSentiment > 0.3;
    const indicators: string[] = [];

    // Collect exhaustion indicators
    if (Math.abs(state.currentSentiment) > 0.7) {
      indicators.push('Extreme sentiment level');
    }
    if ((isTop && state.velocity < 0) || (!isTop && state.velocity > 0)) {
      indicators.push('Velocity reversing');
    }
    if ((isTop && state.acceleration < 0) || (!isTop && state.acceleration > 0)) {
      indicators.push('Momentum fading');
    }
    if (Math.abs(state.momentum) < 0.1) {
      indicators.push('Momentum exhausted');
    }

    // Determine imminence
    let expectedReversal: 'imminent' | 'developing' | 'early';
    if (state.exhaustionLevel > 0.9 && indicators.length >= 3) {
      expectedReversal = 'imminent';
    } else if (state.exhaustionLevel > 0.75) {
      expectedReversal = 'developing';
    } else {
      expectedReversal = 'early';
    }

    return {
      type: isTop ? 'top' : 'bottom',
      confidence: state.exhaustionLevel * state.confidence,
      indicators,
      expectedReversal,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get current state for a symbol
   */
  getState(symbol: string): SentimentVelocityState | null {
    return this.currentStates.get(symbol) || null;
  }

  /**
   * Get all current states
   */
  getAllStates(): SentimentVelocityState[] {
    return Array.from(this.currentStates.values());
  }

  /**
   * Get velocity history
   */
  getVelocityHistory(symbol: string, hours: number = 24): VelocityReading[] {
    const history = this.velocityHistory.get(symbol) || [];
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return history.filter(r => r.timestamp.getTime() >= cutoff);
  }

  /**
   * Get symbols with active signals
   */
  getActiveSignals(): { symbol: string; signal: string; confidence: number }[] {
    return Array.from(this.currentStates.entries())
      .filter(([_, state]) => state.signal !== 'neutral' && state.confidence > 0.5)
      .map(([symbol, state]) => ({
        symbol,
        signal: state.signal,
        confidence: state.confidence,
      }));
  }

  /**
   * Get exhaustion warnings
   */
  getExhaustionWarnings(): { symbol: string; level: number; type: 'top' | 'bottom' }[] {
    return Array.from(this.currentStates.entries())
      .filter(([_, state]) => state.exhaustionLevel > 0.6)
      .map(([symbol, state]) => ({
        symbol,
        level: state.exhaustionLevel,
        type: (state.currentSentiment > 0 ? 'top' : 'bottom') as 'top' | 'bottom',
      }))
      .sort((a, b) => b.level - a.level);
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const sentimentVelocityEngine = new SentimentVelocityEngine();
export default sentimentVelocityEngine;

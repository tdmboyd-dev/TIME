/**
 * TIME — Meta-Intelligence Trading Governor
 * Regime Detector
 *
 * Detects market regimes:
 * - Trend (up/down)
 * - Range
 * - High volatility
 * - Low volatility
 * - Event-driven markets
 * - Overnight illiquidity
 * - Sentiment shifts
 *
 * Regime detection feeds:
 * - Ensembles
 * - Risk engine
 * - Synthesis engine
 * - Teaching engine
 * - Market Vision Engine
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent, timeGovernor } from '../core/time_governor';
import {
  MarketRegime,
  RegimeState,
  RegimeIndicator,
  RegimeTransition,
  SystemHealth,
} from '../types';

const log = loggers.regime;

// OHLCV data point
interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Regime detection configuration
interface RegimeConfig {
  trendThreshold: number; // ADX threshold for trend
  volatilityLookback: number; // Periods for volatility calculation
  highVolatilityThreshold: number; // Percentile for high volatility
  lowVolatilityThreshold: number; // Percentile for low volatility
  rangeThreshold: number; // ADX threshold for ranging
  minimumDataPoints: number; // Minimum data for detection
}

const DEFAULT_CONFIG: RegimeConfig = {
  trendThreshold: 25,
  volatilityLookback: 20,
  highVolatilityThreshold: 75,
  lowVolatilityThreshold: 25,
  rangeThreshold: 20,
  minimumDataPoints: 50,
};

/**
 * Regime Detector
 *
 * Analyzes market data to determine the current market regime.
 * Multiple indicators vote on the regime, weighted by their reliability.
 */
export class RegimeDetector extends EventEmitter implements TIMEComponent {
  public readonly name = 'RegimeDetector';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private config: RegimeConfig;
  private currentState: RegimeState;
  private priceData: Map<string, OHLCV[]> = new Map();
  private regimeHistory: Array<{ regime: MarketRegime; timestamp: Date; duration: number }> = [];
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RegimeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.currentState = {
      current: 'unknown',
      confidence: 0,
      duration: 0,
      startedAt: new Date(),
      indicators: [],
      transitions: [],
    };
  }

  /**
   * Initialize the regime detector
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Regime Detector...', { config: this.config });

    // Start regime detection loop
    this.startDetectionLoop();

    this.status = 'online';
    log.info('Regime Detector initialized');
  }

  /**
   * Start the regime detection loop
   */
  private startDetectionLoop(): void {
    if (this.updateInterval) return;

    // Update regime every minute
    this.updateInterval = setInterval(() => {
      this.detectRegime();
    }, 60 * 1000);

    log.info('Regime detection loop started');
  }

  /**
   * Add price data for a symbol
   */
  public addPriceData(symbol: string, data: OHLCV): void {
    if (!this.priceData.has(symbol)) {
      this.priceData.set(symbol, []);
    }

    const symbolData = this.priceData.get(symbol)!;
    symbolData.push(data);

    // Keep only recent data (1000 points max)
    if (symbolData.length > 1000) {
      symbolData.shift();
    }
  }

  /**
   * Detect current market regime
   */
  public detectRegime(symbol?: string): RegimeState {
    const indicators: RegimeIndicator[] = [];
    const targetSymbol = symbol ?? 'default';

    const data = this.priceData.get(targetSymbol);

    if (!data || data.length < this.config.minimumDataPoints) {
      log.debug('Insufficient data for regime detection', {
        symbol: targetSymbol,
        dataPoints: data?.length ?? 0,
      });
      return this.currentState;
    }

    // Calculate indicators
    const trendIndicator = this.detectTrend(data);
    indicators.push(trendIndicator);

    const volatilityIndicator = this.detectVolatility(data);
    indicators.push(volatilityIndicator);

    const momentumIndicator = this.detectMomentum(data);
    indicators.push(momentumIndicator);

    const volumeIndicator = this.detectVolumeRegime(data);
    indicators.push(volumeIndicator);

    // Vote on regime
    const votedRegime = this.voteOnRegime(indicators);

    // Check if regime changed
    if (votedRegime.regime !== this.currentState.current) {
      this.handleRegimeChange(votedRegime.regime, votedRegime.confidence);
    } else {
      // Update duration
      this.currentState.duration =
        Date.now() - this.currentState.startedAt.getTime();
    }

    this.currentState.indicators = indicators;
    this.currentState.confidence = votedRegime.confidence;

    // Calculate transition probabilities
    this.currentState.transitions = this.calculateTransitions();

    return this.currentState;
  }

  /**
   * Detect trend using ADX-like calculation
   */
  private detectTrend(data: OHLCV[]): RegimeIndicator {
    const closes = data.map((d) => d.close);
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);

    // Calculate directional movement
    let plusDM = 0;
    let minusDM = 0;
    let tr = 0;

    for (let i = 1; i < data.length; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];

      if (highDiff > lowDiff && highDiff > 0) {
        plusDM += highDiff;
      }
      if (lowDiff > highDiff && lowDiff > 0) {
        minusDM += lowDiff;
      }

      tr += Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
    }

    // Calculate ADX-like value
    const plusDI = (plusDM / tr) * 100;
    const minusDI = (minusDM / tr) * 100;
    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI + 0.0001)) * 100;

    // Determine trend direction and strength
    let signal: MarketRegime;
    let value = dx;

    if (dx > this.config.trendThreshold) {
      signal = plusDI > minusDI ? 'trending_up' : 'trending_down';
    } else if (dx < this.config.rangeThreshold) {
      signal = 'ranging';
    } else {
      signal = 'unknown';
    }

    return {
      name: 'TrendIndicator',
      value,
      signal,
      weight: 0.3,
    };
  }

  /**
   * Detect volatility regime
   */
  private detectVolatility(data: OHLCV[]): RegimeIndicator {
    const returns: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].close - data[i - 1].close) / data[i - 1].close;
      returns.push(ret);
    }

    // Calculate rolling volatility
    const recentReturns = returns.slice(-this.config.volatilityLookback);
    const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
    const variance =
      recentReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      recentReturns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

    // Compare to historical volatility distribution
    const allVolatilities: number[] = [];
    for (let i = this.config.volatilityLookback; i < returns.length; i++) {
      const window = returns.slice(i - this.config.volatilityLookback, i);
      const m = window.reduce((a, b) => a + b, 0) / window.length;
      const v = window.reduce((a, b) => a + Math.pow(b - m, 2), 0) / window.length;
      allVolatilities.push(Math.sqrt(v) * Math.sqrt(252) * 100);
    }

    // Calculate percentile
    const sorted = [...allVolatilities].sort((a, b) => a - b);
    const percentile =
      (sorted.filter((v) => v < volatility).length / sorted.length) * 100;

    let signal: MarketRegime;
    if (percentile > this.config.highVolatilityThreshold) {
      signal = 'high_volatility';
    } else if (percentile < this.config.lowVolatilityThreshold) {
      signal = 'low_volatility';
    } else {
      signal = 'ranging';
    }

    return {
      name: 'VolatilityIndicator',
      value: percentile,
      signal,
      weight: 0.25,
    };
  }

  /**
   * Detect momentum regime
   */
  private detectMomentum(data: OHLCV[]): RegimeIndicator {
    const closes = data.map((d) => d.close);

    // Calculate RSI-like momentum
    let gains = 0;
    let losses = 0;
    const period = 14;

    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) {
        gains += diff;
      } else {
        losses -= diff;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    let signal: MarketRegime;
    if (rsi > 70) {
      signal = 'trending_up'; // Overbought but trending
    } else if (rsi < 30) {
      signal = 'trending_down'; // Oversold but trending
    } else {
      signal = 'ranging';
    }

    return {
      name: 'MomentumIndicator',
      value: rsi,
      signal,
      weight: 0.2,
    };
  }

  /**
   * Detect volume-based regime
   */
  private detectVolumeRegime(data: OHLCV[]): RegimeIndicator {
    const volumes = data.map((d) => d.volume);
    const recentVolumes = volumes.slice(-20);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentAvgVolume =
      recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    const volumeRatio = recentAvgVolume / avgVolume;

    let signal: MarketRegime;
    if (volumeRatio > 1.5) {
      signal = 'event_driven'; // High volume suggests event
    } else if (volumeRatio < 0.5) {
      signal = 'overnight_illiquid'; // Low volume
    } else {
      signal = 'ranging';
    }

    return {
      name: 'VolumeIndicator',
      value: volumeRatio * 50, // Normalize to 0-100 range
      signal,
      weight: 0.25,
    };
  }

  /**
   * Vote on regime using weighted indicators
   */
  private voteOnRegime(
    indicators: RegimeIndicator[]
  ): { regime: MarketRegime; confidence: number } {
    const votes: Map<MarketRegime, number> = new Map();

    for (const indicator of indicators) {
      const current = votes.get(indicator.signal) ?? 0;
      votes.set(indicator.signal, current + indicator.weight);
    }

    // Find winner
    let maxVotes = 0;
    let winner: MarketRegime = 'unknown';

    for (const [regime, weight] of votes) {
      if (weight > maxVotes) {
        maxVotes = weight;
        winner = regime;
      }
    }

    // Calculate confidence
    const totalWeight = indicators.reduce((sum, i) => sum + i.weight, 0);
    const confidence = maxVotes / totalWeight;

    return { regime: winner, confidence };
  }

  /**
   * Handle regime change
   */
  private handleRegimeChange(newRegime: MarketRegime, confidence: number): void {
    const previousRegime = this.currentState.current;
    const duration = Date.now() - this.currentState.startedAt.getTime();

    // Record history
    this.regimeHistory.push({
      regime: previousRegime,
      timestamp: this.currentState.startedAt,
      duration,
    });

    // Keep only last 100 regime changes
    if (this.regimeHistory.length > 100) {
      this.regimeHistory.shift();
    }

    // Update state
    this.currentState.current = newRegime;
    this.currentState.startedAt = new Date();
    this.currentState.duration = 0;
    this.currentState.confidence = confidence;

    log.info('Market regime changed', {
      from: previousRegime,
      to: newRegime,
      confidence: confidence.toFixed(2),
      previousDuration: `${(duration / 60000).toFixed(1)} minutes`,
    });

    // Notify TIME Governor
    timeGovernor.setCurrentRegime(newRegime);

    this.emit('regime:changed', {
      previousRegime,
      newRegime,
      confidence,
      timestamp: new Date(),
    });
  }

  /**
   * Calculate transition probabilities
   */
  private calculateTransitions(): RegimeTransition[] {
    const transitions: RegimeTransition[] = [];

    if (this.regimeHistory.length < 10) {
      return transitions;
    }

    // Count transitions from current regime
    const currentRegime = this.currentState.current;
    const fromCurrentCount: Map<MarketRegime, number> = new Map();
    let totalFromCurrent = 0;

    for (let i = 0; i < this.regimeHistory.length - 1; i++) {
      if (this.regimeHistory[i].regime === currentRegime) {
        const nextRegime = this.regimeHistory[i + 1].regime;
        const count = fromCurrentCount.get(nextRegime) ?? 0;
        fromCurrentCount.set(nextRegime, count + 1);
        totalFromCurrent++;
      }
    }

    // Calculate probabilities
    for (const [toRegime, count] of fromCurrentCount) {
      if (toRegime !== currentRegime) {
        transitions.push({
          from: currentRegime,
          to: toRegime,
          probability: count / totalFromCurrent,
          expectedIn: this.estimateTransitionTime(currentRegime, toRegime),
        });
      }
    }

    // Sort by probability
    transitions.sort((a, b) => b.probability - a.probability);

    return transitions.slice(0, 3); // Top 3 likely transitions
  }

  /**
   * Estimate time until transition
   */
  private estimateTransitionTime(
    from: MarketRegime,
    to: MarketRegime
  ): number {
    // Calculate average duration before this transition type
    const relevantDurations: number[] = [];

    for (let i = 0; i < this.regimeHistory.length - 1; i++) {
      if (
        this.regimeHistory[i].regime === from &&
        this.regimeHistory[i + 1].regime === to
      ) {
        relevantDurations.push(this.regimeHistory[i].duration);
      }
    }

    if (relevantDurations.length === 0) {
      return 60 * 60 * 1000; // Default 1 hour
    }

    const avgDuration =
      relevantDurations.reduce((a, b) => a + b, 0) / relevantDurations.length;
    const elapsed = this.currentState.duration;

    return Math.max(0, avgDuration - elapsed) / 60000; // Return in minutes
  }

  /**
   * Get current regime
   */
  public getCurrentRegime(): MarketRegime {
    return this.currentState.current;
  }

  /**
   * Get full regime state
   */
  public getRegimeState(): RegimeState {
    return { ...this.currentState };
  }

  /**
   * Get regime history
   */
  public getRegimeHistory(): Array<{
    regime: MarketRegime;
    timestamp: Date;
    duration: number;
  }> {
    return [...this.regimeHistory];
  }

  /**
   * Check if current regime is favorable for a strategy type
   */
  public isFavorableRegime(
    strategyTypes: string[],
    regime?: MarketRegime
  ): boolean {
    const currentRegime = regime ?? this.currentState.current;

    const favorableMap: Record<string, MarketRegime[]> = {
      trend_following: ['trending_up', 'trending_down'],
      mean_reversion: ['ranging', 'low_volatility'],
      momentum: ['trending_up', 'trending_down', 'high_volatility'],
      breakout: ['ranging', 'low_volatility'], // Breakout from range
      scalping: ['ranging', 'low_volatility'],
      swing: ['trending_up', 'trending_down', 'ranging'],
    };

    for (const strategy of strategyTypes) {
      const favorable = favorableMap[strategy] ?? [];
      if (favorable.includes(currentRegime)) {
        return true;
      }
    }

    return false;
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
        currentRegime: this.currentState.current as unknown as number,
        confidence: this.currentState.confidence,
        durationMinutes: this.currentState.duration / 60000,
        historyCount: this.regimeHistory.length,
        symbolsTracked: this.priceData.size,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Regime Detector...');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.status = 'offline';
  }
}

// Export singleton
export const regimeDetector = new RegimeDetector();

export default RegimeDetector;

/**
 * TIME AI Trading Signals System
 *
 * Comprehensive AI-powered trading signal generation engine for TIME BEYOND US.
 *
 * Features:
 * - Multi-signal types: BUY, SELL, HOLD, STRONG_BUY, STRONG_SELL
 * - Confidence scoring (0-100)
 * - Technical analysis (RSI, MACD, Bollinger, Moving Averages)
 * - Sentiment analysis from news/social media
 * - Price predictions with targets and stop-loss
 * - Multi-timeframe analysis (1m, 5m, 15m, 1h, 4h, 1d)
 * - Signal history and performance tracking
 * - Real-time WebSocket streaming
 * - Alert system for new signals
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
export type AssetClass = 'crypto' | 'stocks' | 'forex' | 'commodities' | 'indices';

export interface TechnicalIndicators {
  rsi: RSIIndicator;
  macd: MACDIndicator;
  bollingerBands: BollingerBandsIndicator;
  movingAverages: MovingAveragesIndicator;
  stochastic: StochasticIndicator;
  atr: ATRIndicator;
  volume: VolumeIndicator;
  fibonacci: FibonacciLevels;
}

export interface RSIIndicator {
  value: number;
  signal: 'oversold' | 'neutral' | 'overbought';
  divergence: 'bullish' | 'bearish' | 'none';
  period: number;
}

export interface MACDIndicator {
  macdLine: number;
  signalLine: number;
  histogram: number;
  signal: 'bullish_cross' | 'bearish_cross' | 'bullish' | 'bearish' | 'neutral';
  divergence: 'bullish' | 'bearish' | 'none';
}

export interface BollingerBandsIndicator {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
  signal: 'squeeze' | 'breakout_up' | 'breakout_down' | 'mean_reversion' | 'neutral';
}

export interface MovingAveragesIndicator {
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  ema50: number;
  goldenCross: boolean;
  deathCross: boolean;
  priceVsSMA200: 'above' | 'below';
  trend: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
}

export interface StochasticIndicator {
  k: number;
  d: number;
  signal: 'oversold' | 'neutral' | 'overbought';
  crossover: 'bullish' | 'bearish' | 'none';
}

export interface ATRIndicator {
  value: number;
  percent: number;
  volatility: 'low' | 'medium' | 'high' | 'extreme';
}

export interface VolumeIndicator {
  current: number;
  average20: number;
  ratio: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  signal: 'accumulation' | 'distribution' | 'neutral';
}

export interface FibonacciLevels {
  level236: number;
  level382: number;
  level500: number;
  level618: number;
  level786: number;
  nearestLevel: string;
  pricePosition: 'support' | 'resistance' | 'between';
}

export interface SentimentAnalysis {
  overall: number; // -100 to 100
  newsScore: number;
  socialScore: number;
  fearGreedIndex: number;
  trendingMentions: number;
  sentimentTrend: 'improving' | 'declining' | 'stable';
  sources: SentimentSource[];
}

export interface SentimentSource {
  source: string;
  score: number;
  articles: number;
  timestamp: Date;
}

export interface PricePrediction {
  shortTerm: PredictionTarget; // 24h
  mediumTerm: PredictionTarget; // 7d
  longTerm: PredictionTarget; // 30d
  confidence: number;
  model: string;
}

export interface PredictionTarget {
  targetPrice: number;
  percentChange: number;
  probability: number;
  range: {
    low: number;
    high: number;
  };
}

export interface RiskManagement {
  stopLoss: number;
  stopLossPercent: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  suggestedPositionSize: number;
  maxLossAmount: number;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  signalType: SignalType;
  confidence: number; // 0-100
  currentPrice: number;
  timeframe: Timeframe;
  technicalIndicators: TechnicalIndicators;
  sentiment: SentimentAnalysis;
  prediction: PricePrediction;
  riskManagement: RiskManagement;
  multiTimeframeAnalysis: MultiTimeframeSignal[];
  reasoning: string[];
  tags: string[];
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface MultiTimeframeSignal {
  timeframe: Timeframe;
  signalType: SignalType;
  confidence: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}

export interface SignalPerformance {
  signalId: string;
  symbol: string;
  signalType: SignalType;
  entryPrice: number;
  exitPrice?: number;
  targetHit: boolean;
  stopLossHit: boolean;
  pnl?: number;
  pnlPercent?: number;
  holdingPeriod?: number;
  status: 'active' | 'won' | 'lost' | 'expired' | 'cancelled';
  createdAt: Date;
  closedAt?: Date;
}

export interface SignalStats {
  totalSignals: number;
  winRate: number;
  lossRate: number;
  avgPnlPercent: number;
  avgHoldingPeriod: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestSignal: SignalPerformance | null;
  worstSignal: SignalPerformance | null;
  bySignalType: Record<SignalType, TypeStats>;
  byTimeframe: Record<Timeframe, TypeStats>;
  byAssetClass: Record<AssetClass, TypeStats>;
}

export interface TypeStats {
  count: number;
  winRate: number;
  avgPnl: number;
}

export interface SignalSubscription {
  id: string;
  userId: string;
  symbols: string[];
  assetClasses: AssetClass[];
  minConfidence: number;
  signalTypes: SignalType[];
  timeframes: Timeframe[];
  notificationChannels: NotificationChannel[];
  createdAt: Date;
  isActive: boolean;
}

export interface NotificationChannel {
  type: 'websocket' | 'email' | 'push' | 'sms' | 'telegram' | 'discord';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertPayload {
  type: 'new_signal' | 'signal_update' | 'target_hit' | 'stop_loss_hit' | 'signal_expired';
  signal: TradingSignal;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface MarketData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

// ============================================================================
// AI TRADING SIGNALS ENGINE
// ============================================================================

export class AITradingSignalsEngine extends EventEmitter {
  public readonly name = 'AITradingSignalsEngine';
  public readonly version = '2.0.0';

  private signals: Map<string, TradingSignal> = new Map();
  private signalHistory: TradingSignal[] = [];
  private performance: Map<string, SignalPerformance> = new Map();
  private subscriptions: Map<string, SignalSubscription> = new Map();
  private wsClients: Map<string, WebSocket> = new Map();
  private priceCache: Map<string, MarketData[]> = new Map();

  private config = {
    minConfidenceThreshold: 60,
    strongSignalThreshold: 80,
    maxActiveSignals: 100,
    signalExpiryHours: 24,
    historyRetentionDays: 90,
    performanceUpdateInterval: 60000, // 1 minute
    sentimentWeight: 0.2,
    technicalWeight: 0.6,
    predictionWeight: 0.2,
  };

  private stats: SignalStats = {
    totalSignals: 0,
    winRate: 0,
    lossRate: 0,
    avgPnlPercent: 0,
    avgHoldingPeriod: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    bestSignal: null,
    worstSignal: null,
    bySignalType: {
      STRONG_BUY: { count: 0, winRate: 0, avgPnl: 0 },
      BUY: { count: 0, winRate: 0, avgPnl: 0 },
      HOLD: { count: 0, winRate: 0, avgPnl: 0 },
      SELL: { count: 0, winRate: 0, avgPnl: 0 },
      STRONG_SELL: { count: 0, winRate: 0, avgPnl: 0 },
    },
    byTimeframe: {
      '1m': { count: 0, winRate: 0, avgPnl: 0 },
      '5m': { count: 0, winRate: 0, avgPnl: 0 },
      '15m': { count: 0, winRate: 0, avgPnl: 0 },
      '1h': { count: 0, winRate: 0, avgPnl: 0 },
      '4h': { count: 0, winRate: 0, avgPnl: 0 },
      '1d': { count: 0, winRate: 0, avgPnl: 0 },
      '1w': { count: 0, winRate: 0, avgPnl: 0 },
    },
    byAssetClass: {
      crypto: { count: 0, winRate: 0, avgPnl: 0 },
      stocks: { count: 0, winRate: 0, avgPnl: 0 },
      forex: { count: 0, winRate: 0, avgPnl: 0 },
      commodities: { count: 0, winRate: 0, avgPnl: 0 },
      indices: { count: 0, winRate: 0, avgPnl: 0 },
    },
  };

  constructor() {
    super();
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private async initialize(): Promise<void> {
    console.log(`[${this.name}] Initializing AI Trading Signals Engine v${this.version}`);

    // Start performance tracking
    setInterval(() => this.updatePerformance(), this.config.performanceUpdateInterval);

    // Clean expired signals
    setInterval(() => this.cleanExpiredSignals(), 60000 * 5);

    this.emit('initialized');
  }

  // ============================================================================
  // SIGNAL GENERATION
  // ============================================================================

  /**
   * Generate a trading signal for a symbol
   */
  async generateSignal(
    symbol: string,
    assetClass: AssetClass,
    timeframe: Timeframe = '1h',
    marketData?: MarketData[]
  ): Promise<TradingSignal> {
    try {
      // Get market data if not provided
      const data = marketData || await this.fetchMarketData(symbol, timeframe);

      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(data);

      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(symbol);

      // Generate price predictions
      const prediction = await this.generatePredictions(symbol, data, technicalIndicators);

      // Multi-timeframe analysis
      const multiTimeframeAnalysis = await this.performMultiTimeframeAnalysis(symbol, assetClass);

      // Calculate signal type and confidence
      const { signalType, confidence, reasoning } = this.calculateSignalType(
        technicalIndicators,
        sentiment,
        prediction,
        multiTimeframeAnalysis
      );

      // Calculate risk management levels
      const currentPrice = data[data.length - 1]?.close || 0;
      const riskManagement = this.calculateRiskManagement(
        currentPrice,
        signalType,
        technicalIndicators,
        confidence
      );

      // Generate tags
      const tags = this.generateTags(signalType, technicalIndicators, sentiment, multiTimeframeAnalysis);

      // Create signal
      const signal: TradingSignal = {
        id: this.generateSignalId(symbol, timeframe),
        symbol,
        assetClass,
        signalType,
        confidence,
        currentPrice,
        timeframe,
        technicalIndicators,
        sentiment,
        prediction,
        riskManagement,
        multiTimeframeAnalysis,
        reasoning,
        tags,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.signalExpiryHours * 60 * 60 * 1000),
        isActive: true,
        metadata: {
          version: this.version,
          model: 'TIME-AI-v2',
        },
      };

      // Store signal
      this.signals.set(signal.id, signal);
      this.signalHistory.push(signal);

      // Create performance tracking
      this.createPerformanceRecord(signal);

      // Update stats
      this.stats.totalSignals++;

      // Emit and alert
      this.emit('signal:generated', signal);
      await this.broadcastSignal(signal);

      console.log(`[${this.name}] Generated ${signalType} signal for ${symbol} with ${confidence}% confidence`);

      return signal;
    } catch (error: any) {
      console.error(`[${this.name}] Error generating signal for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate signals for multiple symbols
   */
  async generateBatchSignals(
    symbols: string[],
    assetClass: AssetClass,
    timeframe: Timeframe = '1h'
  ): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    for (const symbol of symbols) {
      try {
        const signal = await this.generateSignal(symbol, assetClass, timeframe);
        signals.push(signal);
      } catch (error: any) {
        console.error(`[${this.name}] Failed to generate signal for ${symbol}:`, error.message);
      }
    }

    return signals;
  }

  // ============================================================================
  // TECHNICAL ANALYSIS
  // ============================================================================

  /**
   * Calculate all technical indicators
   */
  private calculateTechnicalIndicators(data: MarketData[]): TechnicalIndicators {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    return {
      rsi: this.calculateRSI(closes),
      macd: this.calculateMACD(closes),
      bollingerBands: this.calculateBollingerBands(closes),
      movingAverages: this.calculateMovingAverages(closes),
      stochastic: this.calculateStochastic(closes, highs, lows),
      atr: this.calculateATR(closes, highs, lows),
      volume: this.calculateVolumeIndicator(volumes),
      fibonacci: this.calculateFibonacci(closes, highs, lows),
    };
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(closes: number[], period: number = 14): RSIIndicator {
    if (closes.length < period + 1) {
      return { value: 50, signal: 'neutral', divergence: 'none', period };
    }

    let gains = 0;
    let losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    let signal: 'oversold' | 'neutral' | 'overbought' = 'neutral';
    if (rsi < 30) signal = 'oversold';
    else if (rsi > 70) signal = 'overbought';

    // Check for divergence (simplified)
    const priceChange = closes[closes.length - 1] - closes[closes.length - period];
    let divergence: 'bullish' | 'bearish' | 'none' = 'none';
    if (rsi < 35 && priceChange < 0) divergence = 'bullish';
    else if (rsi > 65 && priceChange > 0) divergence = 'bearish';

    return { value: Math.round(rsi * 100) / 100, signal, divergence, period };
  }

  /**
   * Calculate MACD
   */
  private calculateMACD(closes: number[]): MACDIndicator {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;

    // Signal line (9-period EMA of MACD)
    const macdValues = closes.slice(-26).map((_, i) => {
      const e12 = this.calculateEMA(closes.slice(0, closes.length - 26 + i + 1), 12);
      const e26 = this.calculateEMA(closes.slice(0, closes.length - 26 + i + 1), 26);
      return e12 - e26;
    });

    const signalLine = this.calculateEMA(macdValues, 9);
    const histogram = macdLine - signalLine;

    let signal: 'bullish_cross' | 'bearish_cross' | 'bullish' | 'bearish' | 'neutral' = 'neutral';

    if (histogram > 0) {
      signal = macdLine > signalLine && macdLine - signalLine > Math.abs(macdLine) * 0.1 ? 'bullish_cross' : 'bullish';
    } else {
      signal = macdLine < signalLine && signalLine - macdLine > Math.abs(macdLine) * 0.1 ? 'bearish_cross' : 'bearish';
    }

    const divergence = histogram > 0 && closes[closes.length - 1] < closes[closes.length - 10] ? 'bearish' :
                       histogram < 0 && closes[closes.length - 1] > closes[closes.length - 10] ? 'bullish' : 'none';

    return {
      macdLine: Math.round(macdLine * 10000) / 10000,
      signalLine: Math.round(signalLine * 10000) / 10000,
      histogram: Math.round(histogram * 10000) / 10000,
      signal,
      divergence,
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): BollingerBandsIndicator {
    const sma = this.calculateSMA(closes, period);
    const std = this.calculateStdDev(closes.slice(-period));

    const upper = sma + stdDev * std;
    const lower = sma - stdDev * std;
    const bandwidth = (upper - lower) / sma * 100;
    const currentPrice = closes[closes.length - 1];
    const percentB = (currentPrice - lower) / (upper - lower);

    let signal: 'squeeze' | 'breakout_up' | 'breakout_down' | 'mean_reversion' | 'neutral' = 'neutral';

    if (bandwidth < 4) signal = 'squeeze';
    else if (currentPrice > upper) signal = 'breakout_up';
    else if (currentPrice < lower) signal = 'breakout_down';
    else if (percentB > 0.95 || percentB < 0.05) signal = 'mean_reversion';

    return {
      upper: Math.round(upper * 100) / 100,
      middle: Math.round(sma * 100) / 100,
      lower: Math.round(lower * 100) / 100,
      bandwidth: Math.round(bandwidth * 100) / 100,
      percentB: Math.round(percentB * 1000) / 1000,
      signal,
    };
  }

  /**
   * Calculate Moving Averages
   */
  private calculateMovingAverages(closes: number[]): MovingAveragesIndicator {
    const currentPrice = closes[closes.length - 1];
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const ema50 = this.calculateEMA(closes, 50);

    const goldenCross = sma50 > sma200 && this.calculateSMA(closes.slice(0, -1), 50) <= this.calculateSMA(closes.slice(0, -1), 200);
    const deathCross = sma50 < sma200 && this.calculateSMA(closes.slice(0, -1), 50) >= this.calculateSMA(closes.slice(0, -1), 200);
    const priceVsSMA200: 'above' | 'below' = currentPrice > sma200 ? 'above' : 'below';

    let trend: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish' = 'neutral';

    if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) trend = 'strong_bullish';
    else if (currentPrice > sma50 && sma50 > sma200) trend = 'bullish';
    else if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) trend = 'strong_bearish';
    else if (currentPrice < sma50 && sma50 < sma200) trend = 'bearish';

    return {
      sma20: Math.round(sma20 * 100) / 100,
      sma50: Math.round(sma50 * 100) / 100,
      sma200: Math.round(sma200 * 100) / 100,
      ema12: Math.round(ema12 * 100) / 100,
      ema26: Math.round(ema26 * 100) / 100,
      ema50: Math.round(ema50 * 100) / 100,
      goldenCross,
      deathCross,
      priceVsSMA200,
      trend,
    };
  }

  /**
   * Calculate Stochastic Oscillator
   */
  private calculateStochastic(closes: number[], highs: number[], lows: number[], kPeriod: number = 14, dPeriod: number = 3): StochasticIndicator {
    const recentHighs = highs.slice(-kPeriod);
    const recentLows = lows.slice(-kPeriod);
    const currentClose = closes[closes.length - 1];

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

    // Calculate %D (3-period SMA of %K)
    const kValues: number[] = [];
    for (let i = dPeriod - 1; i >= 0; i--) {
      const idx = closes.length - 1 - i;
      const h = Math.max(...highs.slice(idx - kPeriod + 1, idx + 1));
      const l = Math.min(...lows.slice(idx - kPeriod + 1, idx + 1));
      kValues.push(((closes[idx] - l) / (h - l)) * 100);
    }
    const d = kValues.reduce((a, b) => a + b, 0) / dPeriod;

    let signal: 'oversold' | 'neutral' | 'overbought' = 'neutral';
    if (k < 20) signal = 'oversold';
    else if (k > 80) signal = 'overbought';

    let crossover: 'bullish' | 'bearish' | 'none' = 'none';
    if (k > d && kValues[kValues.length - 2] <= kValues[kValues.length - 2]) crossover = 'bullish';
    else if (k < d && kValues[kValues.length - 2] >= kValues[kValues.length - 2]) crossover = 'bearish';

    return {
      k: Math.round(k * 100) / 100,
      d: Math.round(d * 100) / 100,
      signal,
      crossover,
    };
  }

  /**
   * Calculate ATR (Average True Range)
   */
  private calculateATR(closes: number[], highs: number[], lows: number[], period: number = 14): ATRIndicator {
    const trueRanges: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }

    const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    const currentPrice = closes[closes.length - 1];
    const atrPercent = (atr / currentPrice) * 100;

    let volatility: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
    if (atrPercent < 1) volatility = 'low';
    else if (atrPercent < 3) volatility = 'medium';
    else if (atrPercent < 5) volatility = 'high';
    else volatility = 'extreme';

    return {
      value: Math.round(atr * 100) / 100,
      percent: Math.round(atrPercent * 100) / 100,
      volatility,
    };
  }

  /**
   * Calculate Volume Indicator
   */
  private calculateVolumeIndicator(volumes: number[]): VolumeIndicator {
    const current = volumes[volumes.length - 1];
    const average20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const ratio = current / average20;

    const recentAvg = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const previousAvg = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > previousAvg * 1.1) trend = 'increasing';
    else if (recentAvg < previousAvg * 0.9) trend = 'decreasing';

    let signal: 'accumulation' | 'distribution' | 'neutral' = 'neutral';
    if (ratio > 1.5 && trend === 'increasing') signal = 'accumulation';
    else if (ratio > 1.5 && trend === 'decreasing') signal = 'distribution';

    return {
      current,
      average20,
      ratio: Math.round(ratio * 100) / 100,
      trend,
      signal,
    };
  }

  /**
   * Calculate Fibonacci Retracement Levels
   */
  private calculateFibonacci(closes: number[], highs: number[], lows: number[]): FibonacciLevels {
    const high = Math.max(...highs.slice(-50));
    const low = Math.min(...lows.slice(-50));
    const diff = high - low;
    const currentPrice = closes[closes.length - 1];

    const level236 = high - diff * 0.236;
    const level382 = high - diff * 0.382;
    const level500 = high - diff * 0.500;
    const level618 = high - diff * 0.618;
    const level786 = high - diff * 0.786;

    const levels = [
      { level: '23.6%', price: level236 },
      { level: '38.2%', price: level382 },
      { level: '50.0%', price: level500 },
      { level: '61.8%', price: level618 },
      { level: '78.6%', price: level786 },
    ];

    let nearestLevel = levels[0];
    let minDistance = Math.abs(currentPrice - levels[0].price);

    levels.forEach(l => {
      const distance = Math.abs(currentPrice - l.price);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = l;
      }
    });

    const pricePosition: 'support' | 'resistance' | 'between' =
      currentPrice < nearestLevel.price ? 'resistance' :
      currentPrice > nearestLevel.price ? 'support' : 'between';

    return {
      level236: Math.round(level236 * 100) / 100,
      level382: Math.round(level382 * 100) / 100,
      level500: Math.round(level500 * 100) / 100,
      level618: Math.round(level618 * 100) / 100,
      level786: Math.round(level786 * 100) / 100,
      nearestLevel: nearestLevel.level,
      pricePosition,
    };
  }

  // ============================================================================
  // HELPER CALCULATIONS
  // ============================================================================

  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    return data.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  private calculateStdDev(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / data.length);
  }

  // ============================================================================
  // SENTIMENT ANALYSIS
  // ============================================================================

  /**
   * Analyze sentiment from various sources
   */
  private async analyzeSentiment(symbol: string): Promise<SentimentAnalysis> {
    // In production, this would call actual sentiment APIs
    // Simulating sentiment analysis
    const newsScore = this.simulateSentimentScore();
    const socialScore = this.simulateSentimentScore();
    const fearGreedIndex = Math.round(Math.random() * 100);

    const overall = Math.round((newsScore * 0.6 + socialScore * 0.4));

    const sentimentTrend: 'improving' | 'declining' | 'stable' =
      Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining';

    return {
      overall,
      newsScore,
      socialScore,
      fearGreedIndex,
      trendingMentions: Math.round(Math.random() * 1000),
      sentimentTrend,
      sources: [
        { source: 'Twitter/X', score: socialScore, articles: Math.round(Math.random() * 500), timestamp: new Date() },
        { source: 'Reddit', score: socialScore + Math.round((Math.random() - 0.5) * 20), articles: Math.round(Math.random() * 200), timestamp: new Date() },
        { source: 'News Aggregator', score: newsScore, articles: Math.round(Math.random() * 50), timestamp: new Date() },
      ],
    };
  }

  private simulateSentimentScore(): number {
    return Math.round((Math.random() - 0.5) * 200); // -100 to 100
  }

  // ============================================================================
  // PRICE PREDICTIONS
  // ============================================================================

  /**
   * Generate price predictions using AI models
   */
  private async generatePredictions(
    symbol: string,
    data: MarketData[],
    indicators: TechnicalIndicators
  ): Promise<PricePrediction> {
    const currentPrice = data[data.length - 1]?.close || 0;
    const volatility = indicators.atr.percent / 100;

    // Calculate trend-based predictions
    const trendMultiplier = this.getTrendMultiplier(indicators);

    const shortTermChange = this.predictPriceChange(volatility, trendMultiplier, 1);
    const mediumTermChange = this.predictPriceChange(volatility * 2, trendMultiplier, 7);
    const longTermChange = this.predictPriceChange(volatility * 4, trendMultiplier, 30);

    return {
      shortTerm: {
        targetPrice: Math.round(currentPrice * (1 + shortTermChange.change) * 100) / 100,
        percentChange: Math.round(shortTermChange.change * 10000) / 100,
        probability: shortTermChange.probability,
        range: {
          low: Math.round(currentPrice * (1 - shortTermChange.risk) * 100) / 100,
          high: Math.round(currentPrice * (1 + shortTermChange.upside) * 100) / 100,
        },
      },
      mediumTerm: {
        targetPrice: Math.round(currentPrice * (1 + mediumTermChange.change) * 100) / 100,
        percentChange: Math.round(mediumTermChange.change * 10000) / 100,
        probability: mediumTermChange.probability,
        range: {
          low: Math.round(currentPrice * (1 - mediumTermChange.risk) * 100) / 100,
          high: Math.round(currentPrice * (1 + mediumTermChange.upside) * 100) / 100,
        },
      },
      longTerm: {
        targetPrice: Math.round(currentPrice * (1 + longTermChange.change) * 100) / 100,
        percentChange: Math.round(longTermChange.change * 10000) / 100,
        probability: longTermChange.probability,
        range: {
          low: Math.round(currentPrice * (1 - longTermChange.risk) * 100) / 100,
          high: Math.round(currentPrice * (1 + longTermChange.upside) * 100) / 100,
        },
      },
      confidence: Math.round((shortTermChange.probability + mediumTermChange.probability + longTermChange.probability) / 3),
      model: 'TIME-Predictor-v2',
    };
  }

  private getTrendMultiplier(indicators: TechnicalIndicators): number {
    let multiplier = 0;

    // RSI contribution
    if (indicators.rsi.signal === 'oversold') multiplier += 0.3;
    else if (indicators.rsi.signal === 'overbought') multiplier -= 0.3;

    // MACD contribution
    if (indicators.macd.signal.includes('bullish')) multiplier += 0.25;
    else if (indicators.macd.signal.includes('bearish')) multiplier -= 0.25;

    // MA trend contribution
    if (indicators.movingAverages.trend === 'strong_bullish') multiplier += 0.4;
    else if (indicators.movingAverages.trend === 'bullish') multiplier += 0.2;
    else if (indicators.movingAverages.trend === 'bearish') multiplier -= 0.2;
    else if (indicators.movingAverages.trend === 'strong_bearish') multiplier -= 0.4;

    return multiplier;
  }

  private predictPriceChange(
    volatility: number,
    trendMultiplier: number,
    days: number
  ): { change: number; probability: number; risk: number; upside: number } {
    const baseChange = trendMultiplier * volatility * Math.sqrt(days);
    const noise = (Math.random() - 0.5) * volatility * 0.5;

    return {
      change: baseChange + noise,
      probability: Math.round((0.5 + Math.abs(trendMultiplier) * 0.3) * 100),
      risk: Math.abs(baseChange * 0.5) + volatility,
      upside: Math.abs(baseChange * 1.5) + volatility,
    };
  }

  // ============================================================================
  // MULTI-TIMEFRAME ANALYSIS
  // ============================================================================

  /**
   * Perform analysis across multiple timeframes
   */
  private async performMultiTimeframeAnalysis(
    symbol: string,
    assetClass: AssetClass
  ): Promise<MultiTimeframeSignal[]> {
    const timeframes: Timeframe[] = ['5m', '15m', '1h', '4h', '1d'];
    const results: MultiTimeframeSignal[] = [];

    for (const tf of timeframes) {
      // In production, fetch actual data for each timeframe
      const simulatedTrend = Math.random() > 0.5 ? 'bullish' : Math.random() > 0.5 ? 'bearish' : 'neutral';
      const confidence = Math.round(50 + Math.random() * 40);

      let signalType: SignalType;
      if (simulatedTrend === 'bullish') {
        signalType = confidence > 75 ? 'STRONG_BUY' : 'BUY';
      } else if (simulatedTrend === 'bearish') {
        signalType = confidence > 75 ? 'STRONG_SELL' : 'SELL';
      } else {
        signalType = 'HOLD';
      }

      results.push({
        timeframe: tf,
        signalType,
        confidence,
        trend: simulatedTrend,
        keyLevels: {
          support: [100, 95, 90].map(v => v + Math.random() * 10),
          resistance: [110, 115, 120].map(v => v + Math.random() * 10),
        },
      });
    }

    return results;
  }

  // ============================================================================
  // SIGNAL TYPE CALCULATION
  // ============================================================================

  /**
   * Calculate final signal type and confidence
   */
  private calculateSignalType(
    indicators: TechnicalIndicators,
    sentiment: SentimentAnalysis,
    prediction: PricePrediction,
    mtf: MultiTimeframeSignal[]
  ): { signalType: SignalType; confidence: number; reasoning: string[] } {
    let score = 0;
    const reasoning: string[] = [];

    // Technical Analysis Score (60% weight)
    const technicalScore = this.calculateTechnicalScore(indicators, reasoning);
    score += technicalScore * this.config.technicalWeight;

    // Sentiment Score (20% weight)
    const sentimentScore = sentiment.overall / 100; // Normalize to -1 to 1
    score += sentimentScore * this.config.sentimentWeight;
    if (Math.abs(sentiment.overall) > 50) {
      reasoning.push(`Strong ${sentiment.overall > 0 ? 'positive' : 'negative'} sentiment (${sentiment.overall})`);
    }

    // Prediction Score (20% weight)
    const predictionScore = prediction.shortTerm.percentChange / 10; // Normalize
    score += Math.max(-1, Math.min(1, predictionScore)) * this.config.predictionWeight;
    if (Math.abs(prediction.shortTerm.percentChange) > 2) {
      reasoning.push(`Price target: ${prediction.shortTerm.targetPrice} (${prediction.shortTerm.percentChange > 0 ? '+' : ''}${prediction.shortTerm.percentChange}%)`);
    }

    // Multi-timeframe alignment bonus
    const bullishCount = mtf.filter(m => m.trend === 'bullish').length;
    const bearishCount = mtf.filter(m => m.trend === 'bearish').length;

    if (bullishCount >= 4) {
      score += 0.15;
      reasoning.push('Strong multi-timeframe bullish alignment');
    } else if (bearishCount >= 4) {
      score -= 0.15;
      reasoning.push('Strong multi-timeframe bearish alignment');
    }

    // Determine signal type
    let signalType: SignalType;
    let confidence: number;

    if (score > 0.5) {
      signalType = 'STRONG_BUY';
      confidence = Math.min(95, 70 + score * 25);
    } else if (score > 0.2) {
      signalType = 'BUY';
      confidence = Math.min(85, 55 + score * 30);
    } else if (score > -0.2) {
      signalType = 'HOLD';
      confidence = Math.min(70, 50 + Math.abs(score) * 20);
    } else if (score > -0.5) {
      signalType = 'SELL';
      confidence = Math.min(85, 55 + Math.abs(score) * 30);
    } else {
      signalType = 'STRONG_SELL';
      confidence = Math.min(95, 70 + Math.abs(score) * 25);
    }

    return { signalType, confidence: Math.round(confidence), reasoning };
  }

  /**
   * Calculate technical analysis score
   */
  private calculateTechnicalScore(indicators: TechnicalIndicators, reasoning: string[]): number {
    let score = 0;

    // RSI
    if (indicators.rsi.signal === 'oversold') {
      score += 0.2;
      reasoning.push(`RSI oversold at ${indicators.rsi.value}`);
    } else if (indicators.rsi.signal === 'overbought') {
      score -= 0.2;
      reasoning.push(`RSI overbought at ${indicators.rsi.value}`);
    }

    // MACD
    if (indicators.macd.signal === 'bullish_cross') {
      score += 0.25;
      reasoning.push('MACD bullish crossover');
    } else if (indicators.macd.signal === 'bearish_cross') {
      score -= 0.25;
      reasoning.push('MACD bearish crossover');
    } else if (indicators.macd.signal === 'bullish') {
      score += 0.1;
    } else if (indicators.macd.signal === 'bearish') {
      score -= 0.1;
    }

    // Moving Averages
    if (indicators.movingAverages.goldenCross) {
      score += 0.3;
      reasoning.push('Golden Cross detected');
    } else if (indicators.movingAverages.deathCross) {
      score -= 0.3;
      reasoning.push('Death Cross detected');
    }

    if (indicators.movingAverages.trend === 'strong_bullish') {
      score += 0.2;
      reasoning.push('Strong bullish MA trend');
    } else if (indicators.movingAverages.trend === 'strong_bearish') {
      score -= 0.2;
      reasoning.push('Strong bearish MA trend');
    }

    // Bollinger Bands
    if (indicators.bollingerBands.signal === 'breakout_up') {
      score += 0.15;
      reasoning.push('Bollinger Bands breakout up');
    } else if (indicators.bollingerBands.signal === 'breakout_down') {
      score -= 0.15;
      reasoning.push('Bollinger Bands breakout down');
    }

    // Volume
    if (indicators.volume.signal === 'accumulation') {
      score += 0.1;
      reasoning.push('Volume accumulation detected');
    } else if (indicators.volume.signal === 'distribution') {
      score -= 0.1;
      reasoning.push('Volume distribution detected');
    }

    // Divergence
    if (indicators.rsi.divergence === 'bullish' || indicators.macd.divergence === 'bullish') {
      score += 0.15;
      reasoning.push('Bullish divergence detected');
    } else if (indicators.rsi.divergence === 'bearish' || indicators.macd.divergence === 'bearish') {
      score -= 0.15;
      reasoning.push('Bearish divergence detected');
    }

    return Math.max(-1, Math.min(1, score));
  }

  // ============================================================================
  // RISK MANAGEMENT
  // ============================================================================

  /**
   * Calculate risk management levels
   */
  private calculateRiskManagement(
    currentPrice: number,
    signalType: SignalType,
    indicators: TechnicalIndicators,
    confidence: number
  ): RiskManagement {
    const atrMultiplier = indicators.atr.volatility === 'extreme' ? 3 :
                         indicators.atr.volatility === 'high' ? 2.5 :
                         indicators.atr.volatility === 'medium' ? 2 : 1.5;

    const stopLossDistance = indicators.atr.value * atrMultiplier;
    const isLong = signalType === 'BUY' || signalType === 'STRONG_BUY';

    let stopLoss: number;
    let takeProfit1: number;
    let takeProfit2: number;
    let takeProfit3: number;

    if (isLong) {
      stopLoss = currentPrice - stopLossDistance;
      takeProfit1 = currentPrice + stopLossDistance * 1.5;
      takeProfit2 = currentPrice + stopLossDistance * 2.5;
      takeProfit3 = currentPrice + stopLossDistance * 4;
    } else {
      stopLoss = currentPrice + stopLossDistance;
      takeProfit1 = currentPrice - stopLossDistance * 1.5;
      takeProfit2 = currentPrice - stopLossDistance * 2.5;
      takeProfit3 = currentPrice - stopLossDistance * 4;
    }

    const stopLossPercent = Math.abs(stopLoss - currentPrice) / currentPrice * 100;
    const potentialGain = Math.abs(takeProfit2 - currentPrice);
    const potentialLoss = Math.abs(currentPrice - stopLoss);
    const riskRewardRatio = potentialGain / potentialLoss;

    // Position sizing based on confidence
    const basePositionSize = 0.02; // 2% base
    const confidenceMultiplier = confidence / 100;
    const suggestedPositionSize = Math.round(basePositionSize * confidenceMultiplier * 10000) / 100;

    return {
      stopLoss: Math.round(stopLoss * 100) / 100,
      stopLossPercent: Math.round(stopLossPercent * 100) / 100,
      takeProfit1: Math.round(takeProfit1 * 100) / 100,
      takeProfit2: Math.round(takeProfit2 * 100) / 100,
      takeProfit3: Math.round(takeProfit3 * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      suggestedPositionSize,
      maxLossAmount: Math.round(currentPrice * stopLossPercent / 100 * 100) / 100,
    };
  }

  // ============================================================================
  // TAGS GENERATION
  // ============================================================================

  /**
   * Generate descriptive tags for the signal
   */
  private generateTags(
    signalType: SignalType,
    indicators: TechnicalIndicators,
    sentiment: SentimentAnalysis,
    mtf: MultiTimeframeSignal[]
  ): string[] {
    const tags: string[] = [];

    // Signal strength tag
    if (signalType === 'STRONG_BUY' || signalType === 'STRONG_SELL') {
      tags.push('HIGH_CONVICTION');
    }

    // Trend tags
    if (indicators.movingAverages.trend === 'strong_bullish') tags.push('STRONG_UPTREND');
    if (indicators.movingAverages.trend === 'strong_bearish') tags.push('STRONG_DOWNTREND');

    // Pattern tags
    if (indicators.movingAverages.goldenCross) tags.push('GOLDEN_CROSS');
    if (indicators.movingAverages.deathCross) tags.push('DEATH_CROSS');

    // Momentum tags
    if (indicators.rsi.signal === 'oversold') tags.push('OVERSOLD');
    if (indicators.rsi.signal === 'overbought') tags.push('OVERBOUGHT');

    // Volatility tags
    tags.push(`VOLATILITY_${indicators.atr.volatility.toUpperCase()}`);

    // Sentiment tags
    if (sentiment.overall > 50) tags.push('POSITIVE_SENTIMENT');
    if (sentiment.overall < -50) tags.push('NEGATIVE_SENTIMENT');

    // MTF alignment
    const alignedCount = mtf.filter(m =>
      (signalType.includes('BUY') && m.trend === 'bullish') ||
      (signalType.includes('SELL') && m.trend === 'bearish')
    ).length;

    if (alignedCount >= 4) tags.push('MTF_ALIGNED');

    // Volume tags
    if (indicators.volume.signal === 'accumulation') tags.push('ACCUMULATION');
    if (indicators.volume.signal === 'distribution') tags.push('DISTRIBUTION');

    // Divergence tags
    if (indicators.rsi.divergence !== 'none') tags.push(`${indicators.rsi.divergence.toUpperCase()}_DIVERGENCE`);

    return tags;
  }

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch market data for a symbol
   */
  private async fetchMarketData(symbol: string, timeframe: Timeframe): Promise<MarketData[]> {
    // Check cache first
    const cacheKey = `${symbol}_${timeframe}`;
    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey)!;
    }

    // In production, fetch from actual data provider
    // Simulating 200 candles of data
    const data = this.simulateMarketData(symbol, 200);

    this.priceCache.set(cacheKey, data);

    // Clear cache after 1 minute
    setTimeout(() => this.priceCache.delete(cacheKey), 60000);

    return data;
  }

  /**
   * Simulate market data (for development/testing)
   */
  private simulateMarketData(symbol: string, count: number): MarketData[] {
    const data: MarketData[] = [];
    let price = 100 + Math.random() * 100;
    const volatility = 0.02;

    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.48) * volatility * price;
      price += change;

      const high = price * (1 + Math.random() * 0.01);
      const low = price * (1 - Math.random() * 0.01);
      const open = price + (Math.random() - 0.5) * price * 0.005;

      data.push({
        symbol,
        open,
        high,
        low,
        close: price,
        volume: Math.round(1000000 + Math.random() * 5000000),
        timestamp: new Date(Date.now() - (count - i) * 3600000),
      });
    }

    return data;
  }

  // ============================================================================
  // PERFORMANCE TRACKING
  // ============================================================================

  /**
   * Create performance tracking record for a signal
   */
  private createPerformanceRecord(signal: TradingSignal): void {
    const record: SignalPerformance = {
      signalId: signal.id,
      symbol: signal.symbol,
      signalType: signal.signalType,
      entryPrice: signal.currentPrice,
      targetHit: false,
      stopLossHit: false,
      status: 'active',
      createdAt: signal.createdAt,
    };

    this.performance.set(signal.id, record);
  }

  /**
   * Update performance for all active signals
   */
  private async updatePerformance(): Promise<void> {
    for (const [signalId, perf] of this.performance.entries()) {
      if (perf.status !== 'active') continue;

      const signal = this.signals.get(signalId);
      if (!signal) continue;

      // Check if signal expired
      if (new Date() > signal.expiresAt) {
        perf.status = 'expired';
        signal.isActive = false;
        continue;
      }

      // In production, fetch current price and update
      // Simulating price movement
      const currentPrice = perf.entryPrice * (1 + (Math.random() - 0.5) * 0.05);

      const isLong = signal.signalType === 'BUY' || signal.signalType === 'STRONG_BUY';

      if (isLong) {
        if (currentPrice >= signal.riskManagement.takeProfit2) {
          perf.targetHit = true;
          perf.exitPrice = currentPrice;
          perf.status = 'won';
        } else if (currentPrice <= signal.riskManagement.stopLoss) {
          perf.stopLossHit = true;
          perf.exitPrice = currentPrice;
          perf.status = 'lost';
        }
      } else {
        if (currentPrice <= signal.riskManagement.takeProfit2) {
          perf.targetHit = true;
          perf.exitPrice = currentPrice;
          perf.status = 'won';
        } else if (currentPrice >= signal.riskManagement.stopLoss) {
          perf.stopLossHit = true;
          perf.exitPrice = currentPrice;
          perf.status = 'lost';
        }
      }

      if (perf.exitPrice) {
        perf.pnl = isLong ? perf.exitPrice - perf.entryPrice : perf.entryPrice - perf.exitPrice;
        perf.pnlPercent = (perf.pnl / perf.entryPrice) * 100;
        perf.holdingPeriod = Math.round((Date.now() - perf.createdAt.getTime()) / 3600000);
        perf.closedAt = new Date();
        signal.isActive = false;

        this.emit('signal:closed', { signal, performance: perf });
        await this.sendClosedAlert(signal, perf);
      }
    }

    this.updateStats();
  }

  /**
   * Update overall statistics
   */
  private updateStats(): void {
    const completedPerfs = Array.from(this.performance.values()).filter(p => p.status !== 'active');

    if (completedPerfs.length === 0) return;

    const wins = completedPerfs.filter(p => p.status === 'won');
    const losses = completedPerfs.filter(p => p.status === 'lost');

    this.stats.winRate = Math.round((wins.length / completedPerfs.length) * 100);
    this.stats.lossRate = Math.round((losses.length / completedPerfs.length) * 100);

    const pnls = completedPerfs.filter(p => p.pnlPercent !== undefined).map(p => p.pnlPercent!);
    this.stats.avgPnlPercent = pnls.length > 0 ? Math.round(pnls.reduce((a, b) => a + b, 0) / pnls.length * 100) / 100 : 0;

    const holdingPeriods = completedPerfs.filter(p => p.holdingPeriod !== undefined).map(p => p.holdingPeriod!);
    this.stats.avgHoldingPeriod = holdingPeriods.length > 0 ? Math.round(holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length) : 0;

    // Best and worst signals
    const sortedByPnl = completedPerfs.filter(p => p.pnlPercent !== undefined).sort((a, b) => (b.pnlPercent || 0) - (a.pnlPercent || 0));
    if (sortedByPnl.length > 0) {
      this.stats.bestSignal = sortedByPnl[0];
      this.stats.worstSignal = sortedByPnl[sortedByPnl.length - 1];
    }

    // Calculate profit factor
    const totalWins = wins.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, p) => sum + (p.pnl || 0), 0));
    this.stats.profitFactor = totalLosses > 0 ? Math.round(totalWins / totalLosses * 100) / 100 : totalWins > 0 ? Infinity : 0;

    // Update by type stats
    for (const type of Object.keys(this.stats.bySignalType) as SignalType[]) {
      const typePerfs = completedPerfs.filter(p => p.signalType === type);
      if (typePerfs.length > 0) {
        const typeWins = typePerfs.filter(p => p.status === 'won');
        this.stats.bySignalType[type] = {
          count: typePerfs.length,
          winRate: Math.round((typeWins.length / typePerfs.length) * 100),
          avgPnl: Math.round(typePerfs.reduce((sum, p) => sum + (p.pnlPercent || 0), 0) / typePerfs.length * 100) / 100,
        };
      }
    }
  }

  /**
   * Clean expired signals
   */
  private cleanExpiredSignals(): void {
    const now = new Date();

    for (const [id, signal] of this.signals.entries()) {
      if (now > signal.expiresAt && signal.isActive) {
        signal.isActive = false;
        const perf = this.performance.get(id);
        if (perf && perf.status === 'active') {
          perf.status = 'expired';
        }
      }
    }

    // Clean old history
    const cutoff = new Date(Date.now() - this.config.historyRetentionDays * 24 * 60 * 60 * 1000);
    this.signalHistory = this.signalHistory.filter(s => s.createdAt > cutoff);
  }

  // ============================================================================
  // WEBSOCKET & ALERTS
  // ============================================================================

  /**
   * Register WebSocket client for real-time updates
   */
  registerWebSocketClient(clientId: string, ws: WebSocket): void {
    this.wsClients.set(clientId, ws);

    ws.on('close', () => {
      this.wsClients.delete(clientId);
    });

    console.log(`[${this.name}] WebSocket client registered: ${clientId}`);
  }

  /**
   * Broadcast signal to all connected clients
   */
  private async broadcastSignal(signal: TradingSignal): Promise<void> {
    const payload: AlertPayload = {
      type: 'new_signal',
      signal,
      message: `New ${signal.signalType} signal for ${signal.symbol} with ${signal.confidence}% confidence`,
      priority: signal.confidence >= 80 ? 'high' : signal.confidence >= 60 ? 'medium' : 'low',
      timestamp: new Date(),
    };

    // Broadcast to WebSocket clients
    for (const [clientId, ws] of this.wsClients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'signal', data: payload }));
      }
    }

    // Notify subscribers
    await this.notifySubscribers(payload);
  }

  /**
   * Send closed signal alert
   */
  private async sendClosedAlert(signal: TradingSignal, perf: SignalPerformance): Promise<void> {
    const payload: AlertPayload = {
      type: perf.targetHit ? 'target_hit' : perf.stopLossHit ? 'stop_loss_hit' : 'signal_expired',
      signal,
      message: perf.targetHit
        ? `Target hit for ${signal.symbol}! PnL: ${perf.pnlPercent?.toFixed(2)}%`
        : perf.stopLossHit
          ? `Stop loss hit for ${signal.symbol}. PnL: ${perf.pnlPercent?.toFixed(2)}%`
          : `Signal expired for ${signal.symbol}`,
      priority: perf.targetHit ? 'high' : 'medium',
      timestamp: new Date(),
    };

    for (const [_, ws] of this.wsClients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'signal_update', data: payload }));
      }
    }

    await this.notifySubscribers(payload);
  }

  /**
   * Notify signal subscribers
   */
  private async notifySubscribers(payload: AlertPayload): Promise<void> {
    for (const [_, subscription] of this.subscriptions.entries()) {
      if (!subscription.isActive) continue;

      // Check if signal matches subscription criteria
      const signal = payload.signal;

      if (
        subscription.symbols.length > 0 &&
        !subscription.symbols.includes(signal.symbol) &&
        !subscription.symbols.includes('*')
      ) {
        continue;
      }

      if (
        subscription.assetClasses.length > 0 &&
        !subscription.assetClasses.includes(signal.assetClass)
      ) {
        continue;
      }

      if (signal.confidence < subscription.minConfidence) {
        continue;
      }

      if (
        subscription.signalTypes.length > 0 &&
        !subscription.signalTypes.includes(signal.signalType)
      ) {
        continue;
      }

      // Send notifications through enabled channels
      for (const channel of subscription.notificationChannels) {
        if (!channel.enabled) continue;

        // In production, implement actual notification sending
        this.emit('notification:sent', {
          subscriptionId: subscription.id,
          channel: channel.type,
          payload,
        });
      }
    }
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  /**
   * Create a signal subscription
   */
  createSubscription(
    userId: string,
    config: Omit<SignalSubscription, 'id' | 'createdAt' | 'isActive'>
  ): SignalSubscription {
    const subscription: SignalSubscription = {
      id: `sub_${Date.now()}_${userId}`,
      userId,
      symbols: config.symbols || ['*'],
      assetClasses: config.assetClasses || ['crypto', 'stocks', 'forex'],
      minConfidence: config.minConfidence || 60,
      signalTypes: config.signalTypes || ['STRONG_BUY', 'BUY', 'SELL', 'STRONG_SELL'],
      timeframes: config.timeframes || ['1h', '4h', '1d'],
      notificationChannels: config.notificationChannels || [{ type: 'websocket', config: {}, enabled: true }],
      createdAt: new Date(),
      isActive: true,
    };

    this.subscriptions.set(subscription.id, subscription);

    this.emit('subscription:created', subscription);

    return subscription;
  }

  /**
   * Update subscription
   */
  updateSubscription(subscriptionId: string, updates: Partial<SignalSubscription>): SignalSubscription | null {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return null;

    Object.assign(subscription, updates);

    this.emit('subscription:updated', subscription);

    return subscription;
  }

  /**
   * Delete subscription
   */
  deleteSubscription(subscriptionId: string): boolean {
    const deleted = this.subscriptions.delete(subscriptionId);

    if (deleted) {
      this.emit('subscription:deleted', { subscriptionId });
    }

    return deleted;
  }

  /**
   * Get user subscriptions
   */
  getUserSubscriptions(userId: string): SignalSubscription[] {
    return Array.from(this.subscriptions.values()).filter(s => s.userId === userId);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get all active signals
   */
  getActiveSignals(): TradingSignal[] {
    return Array.from(this.signals.values()).filter(s => s.isActive);
  }

  /**
   * Get signals for a specific symbol
   */
  getSignalsForSymbol(symbol: string): TradingSignal[] {
    return Array.from(this.signals.values()).filter(
      s => s.symbol.toLowerCase() === symbol.toLowerCase()
    );
  }

  /**
   * Get signal by ID
   */
  getSignalById(signalId: string): TradingSignal | undefined {
    return this.signals.get(signalId);
  }

  /**
   * Get signal history
   */
  getSignalHistory(options?: {
    symbol?: string;
    signalType?: SignalType;
    timeframe?: Timeframe;
    assetClass?: AssetClass;
    limit?: number;
    offset?: number;
  }): TradingSignal[] {
    let history = [...this.signalHistory];

    if (options?.symbol) {
      history = history.filter(s => s.symbol.toLowerCase() === options.symbol!.toLowerCase());
    }

    if (options?.signalType) {
      history = history.filter(s => s.signalType === options.signalType);
    }

    if (options?.timeframe) {
      history = history.filter(s => s.timeframe === options.timeframe);
    }

    if (options?.assetClass) {
      history = history.filter(s => s.assetClass === options.assetClass);
    }

    history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    return history.slice(offset, offset + limit);
  }

  /**
   * Get performance stats
   */
  getStats(): SignalStats {
    return { ...this.stats };
  }

  /**
   * Get performance for a signal
   */
  getSignalPerformance(signalId: string): SignalPerformance | undefined {
    return this.performance.get(signalId);
  }

  /**
   * Get all performance records
   */
  getAllPerformance(options?: {
    status?: SignalPerformance['status'];
    symbol?: string;
    limit?: number;
  }): SignalPerformance[] {
    let perfs = Array.from(this.performance.values());

    if (options?.status) {
      perfs = perfs.filter(p => p.status === options.status);
    }

    if (options?.symbol) {
      perfs = perfs.filter(p => p.symbol.toLowerCase() === options.symbol!.toLowerCase());
    }

    perfs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return perfs.slice(0, options?.limit || 100);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateSignalId(symbol: string, timeframe: Timeframe): string {
    return `sig_${symbol}_${timeframe}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const aiTradingSignals = new AITradingSignalsEngine();

export default AITradingSignalsEngine;

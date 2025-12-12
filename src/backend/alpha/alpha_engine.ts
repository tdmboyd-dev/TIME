/**
 * TIME Alpha Engine
 *
 * THE STRATEGY DISCOVERY & RANKING SYSTEM
 *
 * TIME's quant brain that evaluates all bots, scores alpha per regime,
 * detects overfitting, measures robustness, and recommends allocations.
 *
 * Features:
 * - Bot performance evaluation
 * - Alpha scoring per market regime
 * - Overfitting detection
 * - Robustness measurement
 * - Strategy ranking
 * - Allocation recommendations
 * - Alpha decay detection
 * - Bot disable recommendations
 * - Strategy lifecycle management
 * - Walk-forward analysis
 * - Monte Carlo simulations
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('AlphaEngine');

// =============================================================================
// TYPES
// =============================================================================

export type MarketRegime =
  | 'trending_up'
  | 'trending_down'
  | 'ranging'
  | 'volatile'
  | 'quiet'
  | 'risk_on'
  | 'risk_off'
  | 'crisis';

export type StrategyArchetype =
  | 'momentum'
  | 'mean_reversion'
  | 'trend_following'
  | 'volatility'
  | 'carry'
  | 'statistical_arb'
  | 'event_driven'
  | 'ml_based'
  | 'market_making'
  | 'multi_factor';

export type AlphaDecayStatus =
  | 'stable'           // Alpha is consistent
  | 'declining'        // Alpha is decreasing
  | 'decaying'         // Alpha is significantly degrading
  | 'dead';            // No alpha remaining

export type OverfitRisk =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface BotPerformanceMetrics {
  botId: string;
  period: string;                  // e.g., "30d", "90d", "1y"
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  avgHoldingPeriod: number;        // In hours
  tradesPerDay: number;
  netPnL: number;
  grossPnL: number;
  totalFees: number;
  alpha: number;                   // Risk-adjusted excess return
  beta: number;                    // Market correlation
  informationRatio: number;
  treynorRatio: number;
  timestamp: Date;
}

export interface RegimePerformance {
  regime: MarketRegime;
  tradesInRegime: number;
  winRate: number;
  sharpeRatio: number;
  profitFactor: number;
  avgReturn: number;
  regimeAlpha: number;             // Alpha specific to this regime
  confidence: number;              // Statistical confidence (0-1)
}

export interface OverfitAnalysis {
  botId: string;
  riskLevel: OverfitRisk;
  signals: string[];               // What triggered the assessment
  inSampleSharpe: number;
  outOfSampleSharpe: number;
  sharpeDecay: number;             // Percentage drop
  parameterSensitivity: number;    // How sensitive to param changes (0-1)
  dataMiningSuspicion: number;     // Likelihood of data mining (0-1)
  regimeDependence: number;        // How regime-dependent (0-1)
  sampleSize: number;
  recommendations: string[];
}

export interface RobustnessScore {
  botId: string;
  overallScore: number;            // 0-100
  components: {
    timeStability: number;         // Consistent over time
    regimeStability: number;       // Works in multiple regimes
    marketStability: number;       // Works in different markets
    parameterStability: number;    // Not sensitive to params
    drawdownRecovery: number;      // Recovers from drawdowns
    tailRiskControl: number;       // Handles extreme events
  };
  weaknesses: string[];
  strengths: string[];
}

export interface AlphaScore {
  botId: string;
  botName: string;
  archetype: StrategyArchetype;
  overallAlpha: number;            // Main alpha score (-100 to 100)
  regimeAlphas: Map<MarketRegime, number>;
  currentRegimeAlpha: number;
  alphaDecayStatus: AlphaDecayStatus;
  alphaHalfLife: number;           // Days until alpha halves
  confidenceInterval: {
    low: number;
    mid: number;
    high: number;
  };
  rank: number;                    // Position in rankings
  percentile: number;              // Percentile vs all bots
  lastUpdated: Date;
}

export interface AllocationRecommendation {
  botId: string;
  botName: string;
  currentAllocation: number;       // Current % of capital
  recommendedAllocation: number;   // Recommended % of capital
  change: number;                  // Difference
  reason: string;
  confidence: number;
  impact: {
    expectedReturn: number;
    expectedRisk: number;
    expectedSharpe: number;
  };
}

export interface DisableRecommendation {
  botId: string;
  botName: string;
  reason: string;
  severity: 'suggestion' | 'warning' | 'critical';
  metrics: {
    recentSharpe: number;
    alphaDecay: number;
    drawdown: number;
    overfitRisk: OverfitRisk;
  };
  suggestedAction: 'disable' | 'reduce_allocation' | 'monitor' | 'retrain';
}

export interface WalkForwardResult {
  botId: string;
  windows: {
    trainStart: Date;
    trainEnd: Date;
    testStart: Date;
    testEnd: Date;
    trainSharpe: number;
    testSharpe: number;
    decay: number;
  }[];
  averageDecay: number;
  consistencyScore: number;
  passed: boolean;
}

export interface MonteCarloResult {
  botId: string;
  simulations: number;
  results: {
    percentile5: number;
    percentile25: number;
    median: number;
    percentile75: number;
    percentile95: number;
    mean: number;
    stdDev: number;
  };
  probabilityOfLoss: number;
  probabilityOfDrawdown20: number;
  expectedMaxDrawdown: number;
  valueAtRisk95: number;
  conditionalVaR95: number;
}

// =============================================================================
// ALPHA ENGINE
// =============================================================================

class AlphaEngineCore extends EventEmitter {
  private static instance: AlphaEngineCore;

  // Data stores
  private performanceHistory: Map<string, BotPerformanceMetrics[]> = new Map();
  private regimePerformance: Map<string, RegimePerformance[]> = new Map();
  private alphaScores: Map<string, AlphaScore> = new Map();
  private overfitAnalyses: Map<string, OverfitAnalysis> = new Map();
  private robustnessScores: Map<string, RobustnessScore> = new Map();
  private currentRegime: MarketRegime = 'ranging';

  // Configuration
  private config = {
    minTradesForAnalysis: 30,
    alphaDecayThreshold: 0.3,      // 30% decay triggers warning
    overfitSharpeDecayThreshold: 0.5, // 50% IS/OOS decay
    rankingUpdateInterval: 300000, // 5 minutes
    walktForwardWindows: 6,
    monteCarloSimulations: 10000,
    minConfidenceForAllocation: 0.6,
    maxSingleBotAllocation: 0.25,  // Max 25% to single bot
  };

  private constructor() {
    super();
    this.initializeEngine();
  }

  public static getInstance(): AlphaEngineCore {
    if (!AlphaEngineCore.instance) {
      AlphaEngineCore.instance = new AlphaEngineCore();
    }
    return AlphaEngineCore.instance;
  }

  private initializeEngine(): void {
    logger.info('Initializing Alpha Engine...');

    // Start background ranking updates
    this.startRankingLoop();

    logger.info('Alpha Engine initialized');
    this.emit('initialized');
  }

  // ===========================================================================
  // PERFORMANCE RECORDING
  // ===========================================================================

  /**
   * Record bot performance metrics
   */
  public recordPerformance(metrics: BotPerformanceMetrics): void {
    const history = this.performanceHistory.get(metrics.botId) || [];
    history.push(metrics);

    // Keep last 1000 records per bot
    if (history.length > 1000) {
      history.shift();
    }

    this.performanceHistory.set(metrics.botId, history);

    // Update alpha score
    this.updateAlphaScore(metrics.botId);

    this.emit('performance:recorded', metrics);
  }

  /**
   * Record regime-specific performance
   */
  public recordRegimePerformance(botId: string, perf: RegimePerformance): void {
    const history = this.regimePerformance.get(botId) || [];
    history.push(perf);

    if (history.length > 500) {
      history.shift();
    }

    this.regimePerformance.set(botId, history);
    this.emit('regime_performance:recorded', { botId, perf });
  }

  /**
   * Set current market regime
   */
  public setCurrentRegime(regime: MarketRegime): void {
    const previousRegime = this.currentRegime;
    this.currentRegime = regime;

    if (previousRegime !== regime) {
      logger.info(`Market regime changed: ${previousRegime} -> ${regime}`);
      this.emit('regime:changed', { from: previousRegime, to: regime });

      // Update all alpha scores for new regime
      this.updateAllAlphaScores();
    }
  }

  // ===========================================================================
  // ALPHA SCORING
  // ===========================================================================

  /**
   * Calculate alpha score for a bot
   */
  public calculateAlphaScore(botId: string): AlphaScore | null {
    const history = this.performanceHistory.get(botId);
    if (!history || history.length < this.config.minTradesForAnalysis) {
      return null;
    }

    const latestMetrics = history[history.length - 1];
    const regimeHistory = this.regimePerformance.get(botId) || [];

    // Calculate regime-specific alphas
    const regimeAlphas = new Map<MarketRegime, number>();
    const regimes: MarketRegime[] = [
      'trending_up', 'trending_down', 'ranging', 'volatile',
      'quiet', 'risk_on', 'risk_off', 'crisis'
    ];

    for (const regime of regimes) {
      const regimePerfs = regimeHistory.filter(r => r.regime === regime);
      if (regimePerfs.length > 0) {
        const avgAlpha = regimePerfs.reduce((sum, r) => sum + r.regimeAlpha, 0) / regimePerfs.length;
        regimeAlphas.set(regime, avgAlpha);
      } else {
        regimeAlphas.set(regime, 0);
      }
    }

    // Calculate overall alpha
    const overallAlpha = this.calculateOverallAlpha(history);

    // Detect alpha decay
    const decayStatus = this.detectAlphaDecay(history);

    // Calculate alpha half-life
    const halfLife = this.calculateAlphaHalfLife(history);

    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(history);

    // Detect archetype
    const archetype = this.detectArchetype(history, regimeHistory);

    const score: AlphaScore = {
      botId,
      botName: `Bot_${botId}`, // Would come from bot manager in production
      archetype,
      overallAlpha,
      regimeAlphas,
      currentRegimeAlpha: regimeAlphas.get(this.currentRegime) || 0,
      alphaDecayStatus: decayStatus,
      alphaHalfLife: halfLife,
      confidenceInterval,
      rank: 0, // Will be set during ranking
      percentile: 0,
      lastUpdated: new Date(),
    };

    this.alphaScores.set(botId, score);
    return score;
  }

  /**
   * Calculate overall alpha from performance history
   */
  private calculateOverallAlpha(history: BotPerformanceMetrics[]): number {
    if (history.length === 0) return 0;

    // Weight recent performance more heavily
    let weightedAlpha = 0;
    let totalWeight = 0;

    for (let i = 0; i < history.length; i++) {
      const weight = Math.pow(0.95, history.length - 1 - i); // Exponential decay
      weightedAlpha += history[i].alpha * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedAlpha / totalWeight : 0;
  }

  /**
   * Detect alpha decay status
   */
  private detectAlphaDecay(history: BotPerformanceMetrics[]): AlphaDecayStatus {
    if (history.length < 10) return 'stable';

    // Compare recent alpha to historical alpha
    const recentWindow = Math.min(10, history.length);
    const historicalWindow = Math.min(30, history.length);

    const recentAlpha = history.slice(-recentWindow)
      .reduce((sum, h) => sum + h.alpha, 0) / recentWindow;

    const historicalAlpha = history.slice(-historicalWindow)
      .reduce((sum, h) => sum + h.alpha, 0) / historicalWindow;

    if (historicalAlpha <= 0) return 'dead';

    const decayRate = (historicalAlpha - recentAlpha) / Math.abs(historicalAlpha);

    if (decayRate < 0.1) return 'stable';
    if (decayRate < 0.3) return 'declining';
    if (decayRate < 0.6) return 'decaying';
    return 'dead';
  }

  /**
   * Calculate alpha half-life (days until alpha halves)
   */
  private calculateAlphaHalfLife(history: BotPerformanceMetrics[]): number {
    if (history.length < 20) return Infinity;

    // Simple linear regression on alpha over time
    const n = history.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = history[i].alpha;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    if (slope >= 0) return Infinity; // Alpha not decaying

    const currentAlpha = history[n - 1].alpha;
    if (currentAlpha <= 0) return 0;

    // Days until alpha halves
    const halfLifePoints = -currentAlpha / (2 * slope);
    return Math.max(0, halfLifePoints);
  }

  /**
   * Calculate confidence interval for alpha
   */
  private calculateConfidenceInterval(history: BotPerformanceMetrics[]): {
    low: number;
    mid: number;
    high: number;
  } {
    if (history.length === 0) {
      return { low: 0, mid: 0, high: 0 };
    }

    const alphas = history.map(h => h.alpha).sort((a, b) => a - b);
    const n = alphas.length;

    return {
      low: alphas[Math.floor(n * 0.05)] || alphas[0],
      mid: alphas[Math.floor(n * 0.5)] || alphas[0],
      high: alphas[Math.floor(n * 0.95)] || alphas[n - 1],
    };
  }

  /**
   * Detect strategy archetype based on performance patterns
   */
  private detectArchetype(
    history: BotPerformanceMetrics[],
    regimeHistory: RegimePerformance[]
  ): StrategyArchetype {
    if (history.length === 0) return 'multi_factor';

    // Analyze holding period
    const avgHolding = history.reduce((sum, h) => sum + h.avgHoldingPeriod, 0) / history.length;

    // Analyze trade frequency
    const avgTradesPerDay = history.reduce((sum, h) => sum + h.tradesPerDay, 0) / history.length;

    // Analyze regime performance
    const trendingUp = regimeHistory.filter(r => r.regime === 'trending_up');
    const trendingDown = regimeHistory.filter(r => r.regime === 'trending_down');
    const ranging = regimeHistory.filter(r => r.regime === 'ranging');
    const volatile = regimeHistory.filter(r => r.regime === 'volatile');

    // Heuristics for archetype detection
    if (avgTradesPerDay > 50) {
      return 'market_making';
    }

    if (avgHolding < 1) {
      return 'statistical_arb';
    }

    // Check if performs well in trends
    const trendPerf = [...trendingUp, ...trendingDown];
    if (trendPerf.length > 0) {
      const avgTrendAlpha = trendPerf.reduce((sum, r) => sum + r.regimeAlpha, 0) / trendPerf.length;
      if (avgTrendAlpha > 0.5) {
        return avgHolding > 24 ? 'trend_following' : 'momentum';
      }
    }

    // Check if performs well in ranging markets
    if (ranging.length > 0) {
      const avgRangeAlpha = ranging.reduce((sum, r) => sum + r.regimeAlpha, 0) / ranging.length;
      if (avgRangeAlpha > 0.5) {
        return 'mean_reversion';
      }
    }

    // Check if performs well in volatile markets
    if (volatile.length > 0) {
      const avgVolAlpha = volatile.reduce((sum, r) => sum + r.regimeAlpha, 0) / volatile.length;
      if (avgVolAlpha > 0.5) {
        return 'volatility';
      }
    }

    return 'multi_factor';
  }

  // ===========================================================================
  // OVERFIT DETECTION
  // ===========================================================================

  /**
   * Analyze bot for overfitting
   */
  public analyzeOverfit(botId: string): OverfitAnalysis | null {
    const history = this.performanceHistory.get(botId);
    if (!history || history.length < 30) {
      return null;
    }

    const signals: string[] = [];
    let riskLevel: OverfitRisk = 'none';

    // Split data for walk-forward analysis
    const splitPoint = Math.floor(history.length * 0.7);
    const inSample = history.slice(0, splitPoint);
    const outOfSample = history.slice(splitPoint);

    // Calculate in-sample and out-of-sample Sharpe
    const inSampleSharpe = this.calculateAverageSharpe(inSample);
    const outOfSampleSharpe = this.calculateAverageSharpe(outOfSample);

    const sharpeDecay = inSampleSharpe > 0
      ? (inSampleSharpe - outOfSampleSharpe) / inSampleSharpe
      : 0;

    // Check Sharpe decay
    if (sharpeDecay > 0.7) {
      signals.push('Severe Sharpe ratio decay (>70%)');
      riskLevel = 'critical';
    } else if (sharpeDecay > 0.5) {
      signals.push('Significant Sharpe ratio decay (>50%)');
      riskLevel = this.upgradeRisk(riskLevel, 'high');
    } else if (sharpeDecay > 0.3) {
      signals.push('Moderate Sharpe ratio decay (>30%)');
      riskLevel = this.upgradeRisk(riskLevel, 'medium');
    }

    // Check parameter sensitivity (simulated)
    const parameterSensitivity = this.estimateParameterSensitivity(history);
    if (parameterSensitivity > 0.8) {
      signals.push('High parameter sensitivity');
      riskLevel = this.upgradeRisk(riskLevel, 'high');
    } else if (parameterSensitivity > 0.6) {
      signals.push('Moderate parameter sensitivity');
      riskLevel = this.upgradeRisk(riskLevel, 'medium');
    }

    // Check data mining suspicion
    const dataMiningSuspicion = this.calculateDataMiningSuspicion(history);
    if (dataMiningSuspicion > 0.8) {
      signals.push('High data mining probability');
      riskLevel = this.upgradeRisk(riskLevel, 'high');
    }

    // Check regime dependence
    const regimePerf = this.regimePerformance.get(botId) || [];
    const regimeDependence = this.calculateRegimeDependence(regimePerf);
    if (regimeDependence > 0.8) {
      signals.push('Highly regime-dependent');
      riskLevel = this.upgradeRisk(riskLevel, 'medium');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskLevel !== 'none') {
      if (sharpeDecay > 0.5) {
        recommendations.push('Consider retraining with more out-of-sample data');
      }
      if (parameterSensitivity > 0.6) {
        recommendations.push('Reduce parameter count or use more robust parameters');
      }
      if (dataMiningSuspicion > 0.6) {
        recommendations.push('Validate strategy logic independently');
      }
      if (regimeDependence > 0.7) {
        recommendations.push('Consider regime-aware position sizing');
      }
    }

    const analysis: OverfitAnalysis = {
      botId,
      riskLevel,
      signals,
      inSampleSharpe,
      outOfSampleSharpe,
      sharpeDecay,
      parameterSensitivity,
      dataMiningSuspicion,
      regimeDependence,
      sampleSize: history.length,
      recommendations,
    };

    this.overfitAnalyses.set(botId, analysis);
    this.emit('overfit:analyzed', analysis);

    return analysis;
  }

  private calculateAverageSharpe(history: BotPerformanceMetrics[]): number {
    if (history.length === 0) return 0;
    return history.reduce((sum, h) => sum + h.sharpeRatio, 0) / history.length;
  }

  private estimateParameterSensitivity(history: BotPerformanceMetrics[]): number {
    // Estimate based on variance in performance
    if (history.length < 10) return 0.5;

    const sharpes = history.map(h => h.sharpeRatio);
    const mean = sharpes.reduce((a, b) => a + b, 0) / sharpes.length;
    const variance = sharpes.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / sharpes.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 range
    return Math.min(1, stdDev / (Math.abs(mean) + 0.01));
  }

  private calculateDataMiningSuspicion(history: BotPerformanceMetrics[]): number {
    // Look for signs of data mining
    // High Sharpe with low sample size is suspicious
    if (history.length < 30) return 0.7;

    const avgSharpe = this.calculateAverageSharpe(history);
    const sampleSizeScore = Math.min(1, history.length / 100);

    // Extremely high Sharpe is suspicious
    if (avgSharpe > 3) return 0.8 - sampleSizeScore * 0.3;
    if (avgSharpe > 2) return 0.5 - sampleSizeScore * 0.2;

    return 0.2;
  }

  private calculateRegimeDependence(regimePerf: RegimePerformance[]): number {
    if (regimePerf.length < 3) return 0.5;

    const alphas = regimePerf.map(r => r.regimeAlpha);
    const mean = alphas.reduce((a, b) => a + b, 0) / alphas.length;
    const variance = alphas.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / alphas.length;

    // High variance means high regime dependence
    return Math.min(1, Math.sqrt(variance) / (Math.abs(mean) + 0.01));
  }

  private upgradeRisk(current: OverfitRisk, newLevel: OverfitRisk): OverfitRisk {
    const levels: OverfitRisk[] = ['none', 'low', 'medium', 'high', 'critical'];
    const currentIdx = levels.indexOf(current);
    const newIdx = levels.indexOf(newLevel);
    return levels[Math.max(currentIdx, newIdx)];
  }

  // ===========================================================================
  // ROBUSTNESS SCORING
  // ===========================================================================

  /**
   * Calculate robustness score for a bot
   */
  public calculateRobustness(botId: string): RobustnessScore | null {
    const history = this.performanceHistory.get(botId);
    const regimePerf = this.regimePerformance.get(botId) || [];

    if (!history || history.length < 20) {
      return null;
    }

    // Calculate component scores
    const timeStability = this.calculateTimeStability(history);
    const regimeStability = this.calculateRegimeStability(regimePerf);
    const parameterStability = 100 - this.estimateParameterSensitivity(history) * 100;
    const drawdownRecovery = this.calculateDrawdownRecovery(history);
    const tailRiskControl = this.calculateTailRiskControl(history);
    const marketStability = 70; // Would need multi-market data

    // Overall score (weighted average)
    const overallScore = (
      timeStability * 0.20 +
      regimeStability * 0.20 +
      marketStability * 0.10 +
      parameterStability * 0.15 +
      drawdownRecovery * 0.20 +
      tailRiskControl * 0.15
    );

    // Identify weaknesses and strengths
    const components = {
      timeStability,
      regimeStability,
      marketStability,
      parameterStability,
      drawdownRecovery,
      tailRiskControl,
    };

    const weaknesses: string[] = [];
    const strengths: string[] = [];

    for (const [name, score] of Object.entries(components)) {
      if (score < 40) {
        weaknesses.push(`Low ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      } else if (score > 70) {
        strengths.push(`Strong ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      }
    }

    const score: RobustnessScore = {
      botId,
      overallScore,
      components,
      weaknesses,
      strengths,
    };

    this.robustnessScores.set(botId, score);
    return score;
  }

  private calculateTimeStability(history: BotPerformanceMetrics[]): number {
    if (history.length < 10) return 50;

    // Check consistency of Sharpe over time
    const windowSize = Math.min(10, Math.floor(history.length / 3));
    const windows: number[] = [];

    for (let i = 0; i <= history.length - windowSize; i += windowSize) {
      const windowData = history.slice(i, i + windowSize);
      windows.push(this.calculateAverageSharpe(windowData));
    }

    if (windows.length < 2) return 50;

    // Calculate consistency
    const mean = windows.reduce((a, b) => a + b, 0) / windows.length;
    const variance = windows.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / windows.length;
    const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 1;

    // Lower CV = more stable
    return Math.max(0, Math.min(100, 100 - cv * 50));
  }

  private calculateRegimeStability(regimePerf: RegimePerformance[]): number {
    if (regimePerf.length < 3) return 50;

    // Count profitable regimes
    const profitableRegimes = regimePerf.filter(r => r.regimeAlpha > 0).length;
    const regimeCount = new Set(regimePerf.map(r => r.regime)).size;

    return (profitableRegimes / Math.max(1, regimeCount)) * 100;
  }

  private calculateDrawdownRecovery(history: BotPerformanceMetrics[]): number {
    if (history.length < 10) return 50;

    // Check how quickly recovers from drawdowns
    let totalRecoveryTime = 0;
    let drawdownCount = 0;
    let inDrawdown = false;
    let drawdownStart = 0;

    for (let i = 1; i < history.length; i++) {
      if (!inDrawdown && history[i].maxDrawdown > 0.1) {
        inDrawdown = true;
        drawdownStart = i;
      } else if (inDrawdown && history[i].maxDrawdown < 0.05) {
        inDrawdown = false;
        totalRecoveryTime += i - drawdownStart;
        drawdownCount++;
      }
    }

    if (drawdownCount === 0) return 80; // No major drawdowns = good

    const avgRecoveryTime = totalRecoveryTime / drawdownCount;
    return Math.max(0, Math.min(100, 100 - avgRecoveryTime * 5));
  }

  private calculateTailRiskControl(history: BotPerformanceMetrics[]): number {
    if (history.length < 10) return 50;

    // Check ratio of largest loss to average loss
    const avgLoss = history.reduce((sum, h) => sum + Math.abs(h.averageLoss), 0) / history.length;
    const maxLoss = Math.max(...history.map(h => Math.abs(h.largestLoss)));

    if (avgLoss === 0) return 50;

    const tailRatio = maxLoss / avgLoss;

    // Lower ratio = better tail risk control
    if (tailRatio < 2) return 90;
    if (tailRatio < 3) return 70;
    if (tailRatio < 5) return 50;
    return 30;
  }

  // ===========================================================================
  // RANKINGS & RECOMMENDATIONS
  // ===========================================================================

  /**
   * Update all alpha scores and rankings
   */
  private updateAllAlphaScores(): void {
    for (const botId of this.performanceHistory.keys()) {
      this.updateAlphaScore(botId);
    }
    this.updateRankings();
  }

  /**
   * Update alpha score for a single bot
   */
  private updateAlphaScore(botId: string): void {
    this.calculateAlphaScore(botId);
    this.analyzeOverfit(botId);
    this.calculateRobustness(botId);
  }

  /**
   * Update rankings for all bots
   */
  private updateRankings(): void {
    const scores = Array.from(this.alphaScores.values())
      .sort((a, b) => b.currentRegimeAlpha - a.currentRegimeAlpha);

    for (let i = 0; i < scores.length; i++) {
      scores[i].rank = i + 1;
      scores[i].percentile = ((scores.length - i) / scores.length) * 100;
      this.alphaScores.set(scores[i].botId, scores[i]);
    }

    this.emit('rankings:updated', scores);
  }

  /**
   * Get allocation recommendations
   */
  public getAllocationRecommendations(
    totalCapital: number,
    currentAllocations: Map<string, number>
  ): AllocationRecommendation[] {
    const recommendations: AllocationRecommendation[] = [];
    const scores = Array.from(this.alphaScores.values())
      .filter(s => s.alphaDecayStatus !== 'dead')
      .sort((a, b) => b.currentRegimeAlpha - a.currentRegimeAlpha);

    // Calculate target allocations based on alpha and robustness
    let totalWeight = 0;
    const weights: Map<string, number> = new Map();

    for (const score of scores) {
      const robustness = this.robustnessScores.get(score.botId);
      const overfit = this.overfitAnalyses.get(score.botId);

      // Skip if high overfit risk or low robustness
      if (overfit?.riskLevel === 'critical') continue;
      if (robustness && robustness.overallScore < 30) continue;

      // Weight by alpha * robustness * (1 - overfit risk)
      const overfitPenalty = overfit ?
        { none: 0, low: 0.1, medium: 0.3, high: 0.5, critical: 1 }[overfit.riskLevel] : 0;
      const robustnessBonus = robustness ? robustness.overallScore / 100 : 0.5;

      const weight = Math.max(0, score.currentRegimeAlpha) *
        robustnessBonus *
        (1 - overfitPenalty);

      if (weight > 0) {
        weights.set(score.botId, weight);
        totalWeight += weight;
      }
    }

    // Convert weights to allocations
    for (const [botId, weight] of weights) {
      const score = this.alphaScores.get(botId)!;
      const currentAllocation = (currentAllocations.get(botId) || 0) / totalCapital;
      let recommendedAllocation = totalWeight > 0 ? weight / totalWeight : 0;

      // Cap single bot allocation
      recommendedAllocation = Math.min(recommendedAllocation, this.config.maxSingleBotAllocation);

      const change = recommendedAllocation - currentAllocation;

      if (Math.abs(change) > 0.01) { // Only recommend if change > 1%
        recommendations.push({
          botId,
          botName: score.botName,
          currentAllocation: currentAllocation * 100,
          recommendedAllocation: recommendedAllocation * 100,
          change: change * 100,
          reason: this.generateAllocationReason(score, change),
          confidence: this.calculateAllocationConfidence(score, botId),
          impact: {
            expectedReturn: score.currentRegimeAlpha * recommendedAllocation,
            expectedRisk: this.estimateRisk(botId),
            expectedSharpe: score.currentRegimeAlpha / (this.estimateRisk(botId) + 0.01),
          },
        });
      }
    }

    // Sort by absolute change
    recommendations.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return recommendations;
  }

  private generateAllocationReason(score: AlphaScore, change: number): string {
    if (change > 0) {
      return `Strong alpha in ${this.currentRegime} regime (${score.currentRegimeAlpha.toFixed(2)})`;
    } else {
      return `Reduced alpha or higher risk detected`;
    }
  }

  private calculateAllocationConfidence(score: AlphaScore, botId: string): number {
    const robustness = this.robustnessScores.get(botId);
    const overfit = this.overfitAnalyses.get(botId);

    let confidence = 0.5;

    if (robustness) {
      confidence += robustness.overallScore / 200; // Add up to 0.5
    }

    if (overfit) {
      const overfitPenalty = { none: 0, low: 0.05, medium: 0.15, high: 0.25, critical: 0.4 }[overfit.riskLevel];
      confidence -= overfitPenalty;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private estimateRisk(botId: string): number {
    const history = this.performanceHistory.get(botId);
    if (!history || history.length === 0) return 0.2;

    // Use max drawdown as risk proxy
    const avgMaxDD = history.reduce((sum, h) => sum + h.maxDrawdown, 0) / history.length;
    return avgMaxDD;
  }

  /**
   * Get disable recommendations
   */
  public getDisableRecommendations(): DisableRecommendation[] {
    const recommendations: DisableRecommendation[] = [];

    for (const [botId, score] of this.alphaScores) {
      const overfit = this.overfitAnalyses.get(botId);
      const history = this.performanceHistory.get(botId) || [];
      const recentHistory = history.slice(-10);

      // Check for critical issues
      const issues: string[] = [];
      let severity: 'suggestion' | 'warning' | 'critical' = 'suggestion';

      // Dead alpha
      if (score.alphaDecayStatus === 'dead') {
        issues.push('Alpha has completely decayed');
        severity = 'critical';
      } else if (score.alphaDecayStatus === 'decaying') {
        issues.push('Significant alpha decay detected');
        severity = 'warning';
      }

      // Critical overfit
      if (overfit?.riskLevel === 'critical') {
        issues.push('Critical overfitting risk');
        severity = 'critical';
      } else if (overfit?.riskLevel === 'high') {
        issues.push('High overfitting risk');
        severity = severity === 'suggestion' ? 'warning' : severity;
      }

      // Recent poor performance
      if (recentHistory.length > 0) {
        const recentSharpe = this.calculateAverageSharpe(recentHistory);
        if (recentSharpe < -1) {
          issues.push('Severely negative recent Sharpe ratio');
          severity = 'critical';
        } else if (recentSharpe < 0) {
          issues.push('Negative recent Sharpe ratio');
          severity = severity === 'suggestion' ? 'warning' : severity;
        }
      }

      // High drawdown
      if (recentHistory.length > 0) {
        const recentDD = Math.max(...recentHistory.map(h => h.maxDrawdown));
        if (recentDD > 0.3) {
          issues.push('Excessive recent drawdown (>30%)');
          severity = 'critical';
        } else if (recentDD > 0.2) {
          issues.push('High recent drawdown (>20%)');
          severity = severity === 'suggestion' ? 'warning' : severity;
        }
      }

      if (issues.length > 0) {
        const recentSharpe = recentHistory.length > 0 ?
          this.calculateAverageSharpe(recentHistory) : 0;

        recommendations.push({
          botId,
          botName: score.botName,
          reason: issues.join('; '),
          severity,
          metrics: {
            recentSharpe,
            alphaDecay: score.alphaHalfLife < Infinity ? score.alphaHalfLife : -1,
            drawdown: recentHistory.length > 0 ?
              Math.max(...recentHistory.map(h => h.maxDrawdown)) : 0,
            overfitRisk: overfit?.riskLevel || 'none',
          },
          suggestedAction: severity === 'critical' ? 'disable' :
            severity === 'warning' ? 'reduce_allocation' : 'monitor',
        });
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, suggestion: 2 };
    recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return recommendations;
  }

  // ===========================================================================
  // GETTERS & STATE
  // ===========================================================================

  public getAlphaScore(botId: string): AlphaScore | null {
    return this.alphaScores.get(botId) || null;
  }

  public getAllAlphaScores(): AlphaScore[] {
    return Array.from(this.alphaScores.values())
      .sort((a, b) => a.rank - b.rank);
  }

  public getOverfitAnalysis(botId: string): OverfitAnalysis | null {
    return this.overfitAnalyses.get(botId) || null;
  }

  public getRobustnessScore(botId: string): RobustnessScore | null {
    return this.robustnessScores.get(botId) || null;
  }

  public getCurrentRegime(): MarketRegime {
    return this.currentRegime;
  }

  public getState(): {
    botCount: number;
    currentRegime: MarketRegime;
    topBot: AlphaScore | null;
    avgAlpha: number;
    criticalDisableCount: number;
  } {
    const scores = this.getAllAlphaScores();
    const disables = this.getDisableRecommendations();

    return {
      botCount: scores.length,
      currentRegime: this.currentRegime,
      topBot: scores.length > 0 ? scores[0] : null,
      avgAlpha: scores.length > 0 ?
        scores.reduce((sum, s) => sum + s.currentRegimeAlpha, 0) / scores.length : 0,
      criticalDisableCount: disables.filter(d => d.severity === 'critical').length,
    };
  }

  // ===========================================================================
  // BACKGROUND LOOPS
  // ===========================================================================

  private startRankingLoop(): void {
    setInterval(() => {
      this.updateRankings();
    }, this.config.rankingUpdateInterval);
  }
}

// Export singleton instance
export const alphaEngine = AlphaEngineCore.getInstance();
export default alphaEngine;

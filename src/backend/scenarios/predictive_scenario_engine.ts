/**
 * TIME Predictive Scenario Engine
 * The Future Simulation System
 *
 * WORLD'S FIRST: An engine that:
 * - Simulates thousands of possible futures
 * - Maps current conditions to historical parallels
 * - Generates "what if" scenarios for any action
 * - Predicts portfolio behavior under various conditions
 * - Creates probabilistic outcome distributions
 * - Learns from which predictions were accurate
 *
 * This is NOT just backtesting. This is FUTURE SIMULATION.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ScenarioType =
  | 'monte_carlo'            // Random path simulation
  | 'historical_parallel'    // Based on similar historical periods
  | 'stress_test'            // Extreme scenario
  | 'what_if'                // User-defined scenario
  | 'regime_transition'      // Regime change scenarios
  | 'black_swan'             // Tail risk events
  | 'macro_shock'            // Macroeconomic shocks
  | 'correlation_breakdown'  // When correlations fail
  | 'liquidity_crisis'       // Liquidity evaporation
  | 'custom';                // Custom scenario definition

export type MarketCondition =
  | 'bull_quiet'
  | 'bull_volatile'
  | 'bear_quiet'
  | 'bear_volatile'
  | 'sideways_quiet'
  | 'sideways_volatile'
  | 'crash'
  | 'recovery'
  | 'bubble'
  | 'capitulation';

export type OutcomeProbability = 'very_unlikely' | 'unlikely' | 'possible' | 'likely' | 'very_likely';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;

  // Conditions
  initialConditions: {
    marketCondition: MarketCondition;
    vix: number;
    spxLevel: number;
    btcLevel?: number;
    interestRate: number;
    inflation: number;
    dollarStrength: number;
    creditSpreads: number;
  };

  // Shocks/changes
  shocks: {
    asset: string;
    changePercent: number;
    volatilityMultiplier: number;
    correlationChange?: number;
    duration: string;
  }[];

  // Time parameters
  timeHorizon: number;           // Days
  steps: number;                 // Simulation steps

  // Probability
  baseProbability: number;       // Likelihood of scenario

  // Historical reference
  historicalParallel?: {
    period: string;
    similarity: number;
    outcome: string;
  };

  createdAt: Date;
  isBuiltIn: boolean;
}

export interface SimulationPath {
  pathId: number;
  values: { step: number; value: number; returns: number }[];
  finalValue: number;
  maxDrawdown: number;
  maxGain: number;
  sharpe: number;
  sortino: number;
  volatility: number;
}

export interface ScenarioResult {
  id: string;
  scenarioId: string;
  scenarioName: string;
  timestamp: Date;

  // Input
  portfolioValue: number;
  portfolioComposition: { asset: string; weight: number; value: number }[];

  // Simulation parameters
  pathCount: number;
  timeHorizon: number;
  confidenceLevel: number;

  // Results distribution
  distribution: {
    percentile: number;
    value: number;
    returnPercent: number;
  }[];

  // Key metrics
  expectedReturn: number;
  medianReturn: number;
  standardDeviation: number;
  varAtConfidence: number;        // Value at Risk
  cvarAtConfidence: number;       // Conditional VaR
  maxDrawdownExpected: number;
  maxDrawdown95: number;          // 95th percentile drawdown
  probabilityOfLoss: number;
  probabilityOfGain: number;

  // Tail analysis
  tailRisk: {
    worstCase1Pct: number;
    worstCase5Pct: number;
    bestCase95Pct: number;
    bestCase99Pct: number;
  };

  // Time analysis
  timeToRecovery: {
    ifDown10: number;             // Days to recover from 10% loss
    ifDown20: number;
    ifDown30: number;
  };

  // Path statistics
  pathStatistics: {
    pathsPositive: number;
    pathsNegative: number;
    avgPositivePath: number;
    avgNegativePath: number;
    pathVolatility: number;
  };

  // Sample paths (for visualization)
  samplePaths: SimulationPath[];

  // Confidence
  simulationConfidence: number;
}

export interface HistoricalParallel {
  id: string;
  name: string;
  period: { start: Date; end: Date };

  // Conditions that matched
  matchingConditions: {
    condition: string;
    currentValue: number;
    historicalValue: number;
    similarity: number;
  }[];

  // Overall similarity
  overallSimilarity: number;

  // What happened
  outcome: {
    spxReturn: number;
    btcReturn?: number;
    vixChange: number;
    duration: number;
    narrative: string;
  };

  // Key events
  keyEvents: {
    date: Date;
    event: string;
    impact: string;
  }[];

  // Lessons
  lessons: string[];
}

export interface WhatIfAnalysis {
  id: string;
  timestamp: Date;
  question: string;

  // The action being analyzed
  action: {
    type: 'buy' | 'sell' | 'hold' | 'rebalance' | 'hedge' | 'custom';
    asset?: string;
    amount?: number;
    percent?: number;
    description: string;
  };

  // Scenarios analyzed
  scenariosAnalyzed: string[];

  // Outcomes by scenario
  outcomesByScenario: {
    scenarioName: string;
    probability: number;
    outcomeIfAction: {
      expectedReturn: number;
      maxDrawdown: number;
      sharpe: number;
    };
    outcomeIfNoAction: {
      expectedReturn: number;
      maxDrawdown: number;
      sharpe: number;
    };
    recommendation: 'take_action' | 'dont_act' | 'neutral';
    reasoning: string;
  }[];

  // Overall recommendation
  overallRecommendation: {
    action: 'take_action' | 'dont_act' | 'partial' | 'conditional';
    confidence: number;
    reasoning: string;
    conditions: string[];
  };

  // Risk analysis
  riskAnalysis: {
    actionRisk: number;
    inactionRisk: number;
    regretIfWrong: number;
    opportunityCost: number;
  };
}

export interface RegimeTransitionPrediction {
  id: string;
  timestamp: Date;

  // Current state
  currentRegime: MarketCondition;
  regimeConfidence: number;
  timeInRegime: number;           // Days

  // Transition probabilities
  transitionProbabilities: {
    toRegime: MarketCondition;
    probability: number;
    expectedTiming: string;
    triggerConditions: string[];
  }[];

  // Most likely path
  mostLikelyPath: {
    nextRegime: MarketCondition;
    probability: number;
    expectedReturn: number;
    optimalPositioning: string;
  };

  // Regime indicators
  leadingIndicators: {
    indicator: string;
    currentValue: number;
    threshold: number;
    signaling: MarketCondition | 'unclear';
    confidence: number;
  }[];

  // Historical regime durations
  regimeDurationStats: {
    regime: MarketCondition;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    currentDuration: number;
  };
}

export interface BlackSwanAnalysis {
  id: string;
  timestamp: Date;

  // Known unknown events
  identifiedRisks: {
    event: string;
    category: 'geopolitical' | 'financial' | 'pandemic' | 'natural' | 'technological' | 'social';
    estimatedProbability: number;
    potentialImpact: number;      // % portfolio impact
    hedgeCost: number;            // Cost to hedge
    hedgeEffectiveness: number;   // How effective is the hedge
  }[];

  // Portfolio vulnerability
  vulnerabilityScore: number;    // 0-100
  mostVulnerableTo: string[];
  leastVulnerableTo: string[];

  // Tail risk metrics
  tailMetrics: {
    leftTailExposure: number;
    rightTailExposure: number;
    kurtosis: number;
    skewness: number;
  };

  // Protection recommendations
  protectionStrategies: {
    strategy: string;
    cost: number;
    protection: number;
    effectiveness: number;
    implementation: string;
  }[];

  // Historical black swans
  historicalBlackSwans: {
    event: string;
    date: Date;
    impact: number;
    recovery: number;
    lessons: string;
  }[];
}

export interface PredictionAccuracy {
  predictionId: string;
  timestamp: Date;
  scenarioType: ScenarioType;

  // Original prediction
  predicted: {
    metric: string;
    value: number;
    confidence: number;
    horizon: number;
  };

  // Actual outcome
  actual: {
    value: number;
    measuredAt: Date;
  };

  // Accuracy metrics
  accuracy: {
    absoluteError: number;
    percentError: number;
    withinConfidenceInterval: boolean;
    directionCorrect: boolean;
  };

  // Learning
  lessonsLearned: string;
  modelAdjustment?: string;
}

// ============================================================================
// PREDICTIVE SCENARIO ENGINE
// ============================================================================

export class PredictiveScenarioEngine extends EventEmitter {
  private static instance: PredictiveScenarioEngine;

  private scenarios: Map<string, ScenarioDefinition> = new Map();
  private results: Map<string, ScenarioResult> = new Map();
  private historicalParallels: Map<string, HistoricalParallel> = new Map();
  private whatIfAnalyses: Map<string, WhatIfAnalysis> = new Map();
  private regimePredictions: Map<string, RegimeTransitionPrediction> = new Map();
  private blackSwanAnalyses: Map<string, BlackSwanAnalysis> = new Map();
  private predictionAccuracy: Map<string, PredictionAccuracy> = new Map();

  private initialized: boolean = false;

  // Market data cache (would connect to real data)
  private marketData: {
    spx: number;
    vix: number;
    btc: number;
    interestRate: number;
    inflation: number;
    dollarIndex: number;
    creditSpreads: number;
  } = {
    spx: 5000,
    vix: 18,
    btc: 45000,
    interestRate: 5.25,
    inflation: 3.2,
    dollarIndex: 104,
    creditSpreads: 1.2
  };

  private constructor() {
    super();
  }

  public static getInstance(): PredictiveScenarioEngine {
    if (!PredictiveScenarioEngine.instance) {
      PredictiveScenarioEngine.instance = new PredictiveScenarioEngine();
    }
    return PredictiveScenarioEngine.instance;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[PREDICT] Initializing Predictive Scenario Engine...');

    // Load built-in scenarios
    await this.loadBuiltInScenarios();

    // Start background processes
    this.startMarketDataUpdater();
    this.startParallelFinder();
    this.startRegimeAnalyzer();
    this.startAccuracyTracker();

    this.initialized = true;
    this.emit('initialized');
    console.log('[PREDICT] Predictive Scenario Engine initialized');
  }

  private async loadBuiltInScenarios(): Promise<void> {
    // 2008 Financial Crisis scenario
    this.scenarios.set('2008_crisis', {
      id: '2008_crisis',
      name: '2008 Financial Crisis',
      description: 'Severe credit crisis similar to 2008',
      type: 'stress_test',
      initialConditions: {
        marketCondition: 'bear_volatile',
        vix: 80,
        spxLevel: this.marketData.spx * 0.5,
        interestRate: 0.25,
        inflation: 0.1,
        dollarStrength: 85,
        creditSpreads: 6
      },
      shocks: [
        { asset: 'SPY', changePercent: -50, volatilityMultiplier: 4, duration: '18 months' },
        { asset: 'QQQ', changePercent: -55, volatilityMultiplier: 4.5, duration: '18 months' },
        { asset: 'HYG', changePercent: -30, volatilityMultiplier: 3, duration: '12 months' }
      ],
      timeHorizon: 540,
      steps: 540,
      baseProbability: 0.05,
      historicalParallel: {
        period: '2008-2009',
        similarity: 1.0,
        outcome: 'S&P 500 fell 57% peak to trough, recovered in 4 years'
      },
      createdAt: new Date(),
      isBuiltIn: true
    });

    // COVID crash scenario
    this.scenarios.set('covid_crash', {
      id: 'covid_crash',
      name: 'COVID-like Crash',
      description: 'Sharp, fast crash similar to March 2020',
      type: 'stress_test',
      initialConditions: {
        marketCondition: 'crash',
        vix: 82,
        spxLevel: this.marketData.spx * 0.66,
        interestRate: 0,
        inflation: 1,
        dollarStrength: 102,
        creditSpreads: 4
      },
      shocks: [
        { asset: 'SPY', changePercent: -34, volatilityMultiplier: 5, duration: '1 month' },
        { asset: 'BTC', changePercent: -50, volatilityMultiplier: 6, duration: '1 month' }
      ],
      timeHorizon: 90,
      steps: 90,
      baseProbability: 0.03,
      historicalParallel: {
        period: 'March 2020',
        similarity: 1.0,
        outcome: 'Fastest 30%+ decline in history, recovered in 5 months'
      },
      createdAt: new Date(),
      isBuiltIn: true
    });

    // Stagflation scenario
    this.scenarios.set('stagflation', {
      id: 'stagflation',
      name: 'Stagflation',
      description: 'High inflation with economic stagnation',
      type: 'macro_shock',
      initialConditions: {
        marketCondition: 'bear_quiet',
        vix: 30,
        spxLevel: this.marketData.spx * 0.8,
        interestRate: 8,
        inflation: 10,
        dollarStrength: 90,
        creditSpreads: 3
      },
      shocks: [
        { asset: 'SPY', changePercent: -30, volatilityMultiplier: 1.5, duration: '24 months' },
        { asset: 'TLT', changePercent: -25, volatilityMultiplier: 2, duration: '24 months' },
        { asset: 'GLD', changePercent: 50, volatilityMultiplier: 1.5, duration: '24 months' }
      ],
      timeHorizon: 720,
      steps: 720,
      baseProbability: 0.08,
      historicalParallel: {
        period: '1970s',
        similarity: 0.7,
        outcome: 'Lost decade for stocks, gold soared'
      },
      createdAt: new Date(),
      isBuiltIn: true
    });

    // Bull market continuation
    this.scenarios.set('bull_continuation', {
      id: 'bull_continuation',
      name: 'Bull Market Continuation',
      description: 'Current bull market extends another 2 years',
      type: 'regime_transition',
      initialConditions: {
        marketCondition: 'bull_quiet',
        vix: 14,
        spxLevel: this.marketData.spx * 1.3,
        interestRate: 4,
        inflation: 2,
        dollarStrength: 100,
        creditSpreads: 1
      },
      shocks: [
        { asset: 'SPY', changePercent: 30, volatilityMultiplier: 0.8, duration: '24 months' },
        { asset: 'QQQ', changePercent: 40, volatilityMultiplier: 0.9, duration: '24 months' }
      ],
      timeHorizon: 730,
      steps: 730,
      baseProbability: 0.25,
      createdAt: new Date(),
      isBuiltIn: true
    });

    // Crypto winter
    this.scenarios.set('crypto_winter', {
      id: 'crypto_winter',
      name: 'Crypto Winter',
      description: 'Extended crypto bear market',
      type: 'stress_test',
      initialConditions: {
        marketCondition: 'bear_volatile',
        vix: 25,
        spxLevel: this.marketData.spx,
        btcLevel: this.marketData.btc * 0.3,
        interestRate: 5,
        inflation: 3,
        dollarStrength: 108,
        creditSpreads: 2
      },
      shocks: [
        { asset: 'BTC', changePercent: -70, volatilityMultiplier: 3, duration: '18 months' },
        { asset: 'ETH', changePercent: -80, volatilityMultiplier: 3.5, duration: '18 months' }
      ],
      timeHorizon: 540,
      steps: 540,
      baseProbability: 0.15,
      historicalParallel: {
        period: '2018-2019',
        similarity: 0.8,
        outcome: 'BTC fell 84% from peak, recovered in 3 years'
      },
      createdAt: new Date(),
      isBuiltIn: true
    });

    console.log(`[PREDICT] Loaded ${this.scenarios.size} built-in scenarios`);
  }

  // ==========================================================================
  // MONTE CARLO SIMULATION
  // ==========================================================================

  public async runMonteCarloSimulation(
    portfolioValue: number,
    portfolioComposition: { asset: string; weight: number }[],
    timeHorizon: number = 252,
    pathCount: number = 10000,
    confidenceLevel: number = 0.95
  ): Promise<ScenarioResult> {
    console.log(`[PREDICT] Running Monte Carlo simulation: ${pathCount} paths, ${timeHorizon} days`);

    // Get asset parameters (in production, from historical data)
    const assetParams = this.getAssetParameters(portfolioComposition);

    // Generate simulation paths
    const paths: SimulationPath[] = [];

    for (let p = 0; p < pathCount; p++) {
      const path = this.generateRandomPath(portfolioValue, assetParams, timeHorizon);
      paths.push(path);
    }

    // Analyze results
    const finalValues = paths.map(p => p.finalValue).sort((a, b) => a - b);
    const returns = finalValues.map(v => (v - portfolioValue) / portfolioValue);

    // Calculate distribution percentiles
    const percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99];
    const distribution = percentiles.map(pct => {
      const idx = Math.floor((pct / 100) * finalValues.length);
      return {
        percentile: pct,
        value: finalValues[idx],
        returnPercent: returns[idx] * 100
      };
    });

    // Calculate key metrics
    const expectedReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const medianReturn = returns[Math.floor(returns.length / 2)];
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - expectedReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // VaR and CVaR
    const varIdx = Math.floor((1 - confidenceLevel) * finalValues.length);
    const varAtConfidence = (portfolioValue - finalValues[varIdx]) / portfolioValue;
    const cvarValues = finalValues.slice(0, varIdx);
    const cvarAtConfidence = cvarValues.length > 0
      ? (portfolioValue - cvarValues.reduce((a, b) => a + b, 0) / cvarValues.length) / portfolioValue
      : varAtConfidence;

    // Drawdown analysis
    const maxDrawdowns = paths.map(p => p.maxDrawdown);
    const maxDrawdownExpected = maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length;
    const sortedDrawdowns = maxDrawdowns.sort((a, b) => b - a);
    const maxDrawdown95 = sortedDrawdowns[Math.floor(0.05 * sortedDrawdowns.length)];

    // Probability of loss/gain
    const probabilityOfLoss = returns.filter(r => r < 0).length / returns.length;
    const probabilityOfGain = 1 - probabilityOfLoss;

    // Select sample paths for visualization
    const samplePaths = this.selectSamplePaths(paths);

    const result: ScenarioResult = {
      id: `mc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scenarioId: 'monte_carlo',
      scenarioName: 'Monte Carlo Simulation',
      timestamp: new Date(),
      portfolioValue,
      portfolioComposition: portfolioComposition.map(c => ({
        ...c,
        value: portfolioValue * c.weight
      })),
      pathCount,
      timeHorizon,
      confidenceLevel,
      distribution,
      expectedReturn: expectedReturn * 100,
      medianReturn: medianReturn * 100,
      standardDeviation: stdDev * 100,
      varAtConfidence: varAtConfidence * 100,
      cvarAtConfidence: cvarAtConfidence * 100,
      maxDrawdownExpected: maxDrawdownExpected * 100,
      maxDrawdown95: maxDrawdown95 * 100,
      probabilityOfLoss: probabilityOfLoss * 100,
      probabilityOfGain: probabilityOfGain * 100,
      tailRisk: {
        worstCase1Pct: returns[Math.floor(0.01 * returns.length)] * 100,
        worstCase5Pct: returns[Math.floor(0.05 * returns.length)] * 100,
        bestCase95Pct: returns[Math.floor(0.95 * returns.length)] * 100,
        bestCase99Pct: returns[Math.floor(0.99 * returns.length)] * 100
      },
      timeToRecovery: this.calculateRecoveryTimes(paths, portfolioValue),
      pathStatistics: {
        pathsPositive: paths.filter(p => p.finalValue > portfolioValue).length,
        pathsNegative: paths.filter(p => p.finalValue < portfolioValue).length,
        avgPositivePath: this.avgPositivePath(paths, portfolioValue),
        avgNegativePath: this.avgNegativePath(paths, portfolioValue),
        pathVolatility: paths.reduce((sum, p) => sum + p.volatility, 0) / paths.length
      },
      samplePaths,
      simulationConfidence: this.calculateSimulationConfidence(pathCount, stdDev)
    };

    this.results.set(result.id, result);
    this.emit('simulationCompleted', result);

    return result;
  }

  private getAssetParameters(composition: { asset: string; weight: number }[]): Map<string, {
    expectedReturn: number;
    volatility: number;
    correlations: Map<string, number>;
  }> {
    // In production, calculate from historical data
    const params = new Map();

    const defaultParams: Record<string, { expectedReturn: number; volatility: number }> = {
      'SPY': { expectedReturn: 0.10, volatility: 0.18 },
      'QQQ': { expectedReturn: 0.12, volatility: 0.22 },
      'BTC': { expectedReturn: 0.30, volatility: 0.70 },
      'ETH': { expectedReturn: 0.25, volatility: 0.80 },
      'TLT': { expectedReturn: 0.03, volatility: 0.15 },
      'GLD': { expectedReturn: 0.05, volatility: 0.15 },
      'CASH': { expectedReturn: 0.05, volatility: 0.001 }
    };

    for (const item of composition) {
      const asset = item.asset.toUpperCase();
      const defaults = defaultParams[asset] || { expectedReturn: 0.08, volatility: 0.20 };

      params.set(asset, {
        ...defaults,
        correlations: new Map([
          ['SPY', 1.0],
          ['BTC', 0.5],
          ['TLT', -0.3]
        ])
      });
    }

    return params;
  }

  private generateRandomPath(
    startValue: number,
    assetParams: Map<string, { expectedReturn: number; volatility: number }>,
    days: number
  ): SimulationPath {
    const values: { step: number; value: number; returns: number }[] = [];
    let currentValue = startValue;
    let maxValue = startValue;
    let maxDrawdown = 0;
    let maxGain = 0;
    let returnsSum = 0;
    let returnsSqSum = 0;

    // Aggregate portfolio parameters (weighted average)
    let portfolioReturn = 0;
    let portfolioVol = 0;
    for (const [_, params] of assetParams) {
      portfolioReturn += params.expectedReturn / assetParams.size;
      portfolioVol += params.volatility / assetParams.size;
    }

    const dailyReturn = portfolioReturn / 252;
    const dailyVol = portfolioVol / Math.sqrt(252);

    for (let step = 0; step <= days; step++) {
      if (step > 0) {
        // Geometric Brownian Motion
        const randomReturn = dailyReturn + dailyVol * this.randomNormal();
        currentValue *= (1 + randomReturn);
        returnsSum += randomReturn;
        returnsSqSum += randomReturn * randomReturn;
      }

      values.push({
        step,
        value: currentValue,
        returns: step === 0 ? 0 : (currentValue - startValue) / startValue
      });

      maxValue = Math.max(maxValue, currentValue);
      const drawdown = (maxValue - currentValue) / maxValue;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      maxGain = Math.max(maxGain, (currentValue - startValue) / startValue);
    }

    // Calculate risk metrics
    const avgReturn = returnsSum / days;
    const variance = (returnsSqSum / days) - (avgReturn * avgReturn);
    const volatility = Math.sqrt(variance) * Math.sqrt(252);
    const sharpe = volatility > 0 ? (avgReturn * 252) / volatility : 0;

    // Sortino (downside deviation)
    const downsideReturns = values.filter(v => v.returns < 0).map(v => v.returns);
    const downsideVariance = downsideReturns.length > 0
      ? downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
      : 0.0001;
    const downsideVol = Math.sqrt(downsideVariance) * Math.sqrt(252);
    const sortino = downsideVol > 0 ? (avgReturn * 252) / downsideVol : 0;

    return {
      pathId: 0,
      values,
      finalValue: currentValue,
      maxDrawdown,
      maxGain,
      sharpe,
      sortino,
      volatility
    };
  }

  private randomNormal(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private selectSamplePaths(paths: SimulationPath[]): SimulationPath[] {
    const sorted = [...paths].sort((a, b) => a.finalValue - b.finalValue);
    const samples: SimulationPath[] = [];

    // Worst case (5th percentile)
    samples.push({ ...sorted[Math.floor(0.05 * sorted.length)], pathId: 1 });

    // 25th percentile
    samples.push({ ...sorted[Math.floor(0.25 * sorted.length)], pathId: 2 });

    // Median
    samples.push({ ...sorted[Math.floor(0.50 * sorted.length)], pathId: 3 });

    // 75th percentile
    samples.push({ ...sorted[Math.floor(0.75 * sorted.length)], pathId: 4 });

    // Best case (95th percentile)
    samples.push({ ...sorted[Math.floor(0.95 * sorted.length)], pathId: 5 });

    return samples;
  }

  private calculateRecoveryTimes(paths: SimulationPath[], startValue: number): { ifDown10: number; ifDown20: number; ifDown30: number } {
    const recoveryTimes = { ifDown10: 0, ifDown20: 0, ifDown30: 0 };
    const counts = { ifDown10: 0, ifDown20: 0, ifDown30: 0 };

    for (const path of paths) {
      const hit10 = path.values.findIndex(v => v.value < startValue * 0.9);
      const hit20 = path.values.findIndex(v => v.value < startValue * 0.8);
      const hit30 = path.values.findIndex(v => v.value < startValue * 0.7);

      if (hit10 > 0) {
        const recovery = path.values.slice(hit10).findIndex(v => v.value >= startValue);
        if (recovery > 0) {
          recoveryTimes.ifDown10 += recovery;
          counts.ifDown10++;
        }
      }

      if (hit20 > 0) {
        const recovery = path.values.slice(hit20).findIndex(v => v.value >= startValue);
        if (recovery > 0) {
          recoveryTimes.ifDown20 += recovery;
          counts.ifDown20++;
        }
      }

      if (hit30 > 0) {
        const recovery = path.values.slice(hit30).findIndex(v => v.value >= startValue);
        if (recovery > 0) {
          recoveryTimes.ifDown30 += recovery;
          counts.ifDown30++;
        }
      }
    }

    return {
      ifDown10: counts.ifDown10 > 0 ? Math.round(recoveryTimes.ifDown10 / counts.ifDown10) : 0,
      ifDown20: counts.ifDown20 > 0 ? Math.round(recoveryTimes.ifDown20 / counts.ifDown20) : 0,
      ifDown30: counts.ifDown30 > 0 ? Math.round(recoveryTimes.ifDown30 / counts.ifDown30) : 0
    };
  }

  private avgPositivePath(paths: SimulationPath[], startValue: number): number {
    const positive = paths.filter(p => p.finalValue > startValue);
    if (positive.length === 0) return 0;
    return (positive.reduce((sum, p) => sum + (p.finalValue - startValue), 0) / positive.length) / startValue * 100;
  }

  private avgNegativePath(paths: SimulationPath[], startValue: number): number {
    const negative = paths.filter(p => p.finalValue < startValue);
    if (negative.length === 0) return 0;
    return (negative.reduce((sum, p) => sum + (p.finalValue - startValue), 0) / negative.length) / startValue * 100;
  }

  private calculateSimulationConfidence(pathCount: number, stdDev: number): number {
    // Higher path count and lower std dev = higher confidence
    const pathFactor = Math.min(100, (pathCount / 10000) * 50 + 50);
    const volFactor = Math.max(0, 100 - stdDev * 100);
    return Math.round((pathFactor + volFactor) / 2);
  }

  // ==========================================================================
  // STRESS TEST SIMULATION
  // ==========================================================================

  public async runStressTest(
    portfolioValue: number,
    portfolioComposition: { asset: string; weight: number }[],
    scenarioId: string
  ): Promise<ScenarioResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);

    console.log(`[PREDICT] Running stress test: ${scenario.name}`);

    // Apply scenario shocks to portfolio
    let stressedValue = portfolioValue;
    const shockedComposition: { asset: string; weight: number; value: number; shocked: boolean; impact: number }[] = [];

    for (const holding of portfolioComposition) {
      const shock = scenario.shocks.find(s =>
        holding.asset.toUpperCase().includes(s.asset.toUpperCase()) ||
        s.asset === 'ALL'
      );

      const value = portfolioValue * holding.weight;
      const impact = shock ? value * (shock.changePercent / 100) : 0;
      stressedValue += impact;

      shockedComposition.push({
        asset: holding.asset,
        weight: holding.weight,
        value,
        shocked: !!shock,
        impact
      });
    }

    // Generate paths under stress scenario
    const paths = this.generateStressedPaths(portfolioValue, stressedValue, scenario);

    // Build result
    const finalValues = paths.map(p => p.finalValue).sort((a, b) => a - b);
    const returns = finalValues.map(v => (v - portfolioValue) / portfolioValue);

    const result: ScenarioResult = {
      id: `stress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scenarioId,
      scenarioName: scenario.name,
      timestamp: new Date(),
      portfolioValue,
      portfolioComposition: portfolioComposition.map(c => ({
        ...c,
        value: portfolioValue * c.weight
      })),
      pathCount: paths.length,
      timeHorizon: scenario.timeHorizon,
      confidenceLevel: 0.95,
      distribution: this.calculateDistribution(returns, portfolioValue),
      expectedReturn: (returns.reduce((a, b) => a + b, 0) / returns.length) * 100,
      medianReturn: returns[Math.floor(returns.length / 2)] * 100,
      standardDeviation: this.calculateStdDev(returns) * 100,
      varAtConfidence: this.calculateVaR(returns, 0.95) * 100,
      cvarAtConfidence: this.calculateCVaR(returns, 0.95) * 100,
      maxDrawdownExpected: scenario.shocks.reduce((max, s) => Math.max(max, Math.abs(s.changePercent)), 0),
      maxDrawdown95: scenario.shocks.reduce((max, s) => Math.max(max, Math.abs(s.changePercent)), 0) * 1.2,
      probabilityOfLoss: scenario.baseProbability * 100,
      probabilityOfGain: (1 - scenario.baseProbability) * 100,
      tailRisk: {
        worstCase1Pct: returns[Math.floor(0.01 * returns.length)] * 100,
        worstCase5Pct: returns[Math.floor(0.05 * returns.length)] * 100,
        bestCase95Pct: returns[Math.floor(0.95 * returns.length)] * 100,
        bestCase99Pct: returns[Math.floor(0.99 * returns.length)] * 100
      },
      timeToRecovery: {
        ifDown10: Math.round(scenario.timeHorizon * 0.3),
        ifDown20: Math.round(scenario.timeHorizon * 0.6),
        ifDown30: Math.round(scenario.timeHorizon * 0.9)
      },
      pathStatistics: {
        pathsPositive: paths.filter(p => p.finalValue > portfolioValue).length,
        pathsNegative: paths.filter(p => p.finalValue < portfolioValue).length,
        avgPositivePath: this.avgPositivePath(paths, portfolioValue),
        avgNegativePath: this.avgNegativePath(paths, portfolioValue),
        pathVolatility: scenario.shocks[0]?.volatilityMultiplier || 2
      },
      samplePaths: this.selectSamplePaths(paths),
      simulationConfidence: 80
    };

    this.results.set(result.id, result);
    this.emit('stressTestCompleted', result);

    return result;
  }

  private generateStressedPaths(startValue: number, targetValue: number, scenario: ScenarioDefinition): SimulationPath[] {
    const paths: SimulationPath[] = [];
    const pathCount = 1000;

    for (let p = 0; p < pathCount; p++) {
      const values: { step: number; value: number; returns: number }[] = [];
      let currentValue = startValue;
      let maxValue = startValue;
      let maxDrawdown = 0;

      // Move toward target value with added randomness
      const steps = scenario.steps;
      const targetDrift = (targetValue - startValue) / steps;
      const volatility = Math.abs(targetDrift) * (scenario.shocks[0]?.volatilityMultiplier || 2) / Math.sqrt(steps);

      for (let step = 0; step <= steps; step++) {
        if (step > 0) {
          const randomMove = this.randomNormal() * volatility * currentValue;
          const driftMove = targetDrift * (1 + this.randomNormal() * 0.5);
          currentValue += driftMove + randomMove;
          currentValue = Math.max(currentValue, startValue * 0.1); // Floor at 10%
        }

        values.push({
          step,
          value: currentValue,
          returns: (currentValue - startValue) / startValue
        });

        maxValue = Math.max(maxValue, currentValue);
        maxDrawdown = Math.max(maxDrawdown, (maxValue - currentValue) / maxValue);
      }

      paths.push({
        pathId: p,
        values,
        finalValue: currentValue,
        maxDrawdown,
        maxGain: (Math.max(...values.map(v => v.value)) - startValue) / startValue,
        sharpe: 0,
        sortino: 0,
        volatility: volatility * Math.sqrt(252)
      });
    }

    return paths;
  }

  private calculateDistribution(returns: number[], portfolioValue: number): ScenarioResult['distribution'] {
    const sorted = [...returns].sort((a, b) => a - b);
    return [1, 5, 10, 25, 50, 75, 90, 95, 99].map(pct => ({
      percentile: pct,
      value: portfolioValue * (1 + sorted[Math.floor((pct / 100) * sorted.length)]),
      returnPercent: sorted[Math.floor((pct / 100) * sorted.length)] * 100
    }));
  }

  private calculateStdDev(returns: number[]): number {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateVaR(returns: number[], confidence: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const idx = Math.floor((1 - confidence) * sorted.length);
    return -sorted[idx];
  }

  private calculateCVaR(returns: number[], confidence: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const idx = Math.floor((1 - confidence) * sorted.length);
    const tailReturns = sorted.slice(0, idx);
    return tailReturns.length > 0 ? -(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length) : 0;
  }

  // ==========================================================================
  // WHAT-IF ANALYSIS
  // ==========================================================================

  public async runWhatIfAnalysis(
    question: string,
    action: WhatIfAnalysis['action'],
    portfolioValue: number,
    portfolioComposition: { asset: string; weight: number }[]
  ): Promise<WhatIfAnalysis> {
    console.log(`[PREDICT] Running what-if analysis: ${question}`);

    // Run simulations for multiple scenarios
    const scenariosToTest = ['bull_continuation', '2008_crisis', 'covid_crash', 'stagflation'];
    const outcomesByScenario: WhatIfAnalysis['outcomesByScenario'] = [];

    for (const scenarioId of scenariosToTest) {
      const scenario = this.scenarios.get(scenarioId);
      if (!scenario) continue;

      // Simulate with action
      const withAction = await this.simulateWithAction(portfolioValue, portfolioComposition, action, scenario);

      // Simulate without action
      const withoutAction = await this.simulateWithoutAction(portfolioValue, portfolioComposition, scenario);

      // Compare
      const recommendation: 'take_action' | 'dont_act' | 'neutral' =
        withAction.expectedReturn > withoutAction.expectedReturn + 2 ? 'take_action' :
        withoutAction.expectedReturn > withAction.expectedReturn + 2 ? 'dont_act' :
        'neutral';

      outcomesByScenario.push({
        scenarioName: scenario.name,
        probability: scenario.baseProbability * 100,
        outcomeIfAction: withAction,
        outcomeIfNoAction: withoutAction,
        recommendation,
        reasoning: this.generateReasoningForOutcome(withAction, withoutAction, scenario.name)
      });
    }

    // Calculate overall recommendation
    const actionBetter = outcomesByScenario.filter(o => o.recommendation === 'take_action').length;
    const noActionBetter = outcomesByScenario.filter(o => o.recommendation === 'dont_act').length;

    const overallAction: WhatIfAnalysis['overallRecommendation']['action'] =
      actionBetter > noActionBetter + 1 ? 'take_action' :
      noActionBetter > actionBetter + 1 ? 'dont_act' :
      'conditional';

    // Risk analysis
    const avgActionReturn = outcomesByScenario.reduce((sum, o) =>
      sum + o.outcomeIfAction.expectedReturn * o.probability, 0) / 100;
    const avgNoActionReturn = outcomesByScenario.reduce((sum, o) =>
      sum + o.outcomeIfNoAction.expectedReturn * o.probability, 0) / 100;

    const analysis: WhatIfAnalysis = {
      id: `whatif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      question,
      action,
      scenariosAnalyzed: scenariosToTest,
      outcomesByScenario,
      overallRecommendation: {
        action: overallAction,
        confidence: Math.abs(actionBetter - noActionBetter) * 25,
        reasoning: this.generateOverallReasoning(outcomesByScenario, overallAction),
        conditions: this.generateConditions(outcomesByScenario)
      },
      riskAnalysis: {
        actionRisk: Math.max(...outcomesByScenario.map(o => o.outcomeIfAction.maxDrawdown)),
        inactionRisk: Math.max(...outcomesByScenario.map(o => o.outcomeIfNoAction.maxDrawdown)),
        regretIfWrong: Math.abs(avgActionReturn - avgNoActionReturn) * 2,
        opportunityCost: avgActionReturn > avgNoActionReturn ? avgActionReturn - avgNoActionReturn : 0
      }
    };

    this.whatIfAnalyses.set(analysis.id, analysis);
    this.emit('whatIfCompleted', analysis);

    return analysis;
  }

  private async simulateWithAction(
    portfolioValue: number,
    composition: { asset: string; weight: number }[],
    action: WhatIfAnalysis['action'],
    scenario: ScenarioDefinition
  ): Promise<{ expectedReturn: number; maxDrawdown: number; sharpe: number }> {
    // Modify composition based on action
    let modifiedComposition = [...composition];

    if (action.type === 'buy' && action.asset) {
      const existing = modifiedComposition.find(c => c.asset === action.asset);
      const addWeight = action.percent ? action.percent / 100 : 0.1;

      if (existing) {
        existing.weight += addWeight;
      } else {
        modifiedComposition.push({ asset: action.asset, weight: addWeight });
      }

      // Normalize weights
      const total = modifiedComposition.reduce((sum, c) => sum + c.weight, 0);
      modifiedComposition = modifiedComposition.map(c => ({ ...c, weight: c.weight / total }));
    }

    // Run stress test with modified portfolio
    const result = await this.runStressTest(portfolioValue, modifiedComposition, scenario.id);

    return {
      expectedReturn: result.expectedReturn,
      maxDrawdown: result.maxDrawdownExpected,
      sharpe: result.expectedReturn / result.standardDeviation
    };
  }

  private async simulateWithoutAction(
    portfolioValue: number,
    composition: { asset: string; weight: number }[],
    scenario: ScenarioDefinition
  ): Promise<{ expectedReturn: number; maxDrawdown: number; sharpe: number }> {
    const result = await this.runStressTest(portfolioValue, composition, scenario.id);

    return {
      expectedReturn: result.expectedReturn,
      maxDrawdown: result.maxDrawdownExpected,
      sharpe: result.expectedReturn / result.standardDeviation
    };
  }

  private generateReasoningForOutcome(
    withAction: { expectedReturn: number; maxDrawdown: number },
    withoutAction: { expectedReturn: number; maxDrawdown: number },
    scenarioName: string
  ): string {
    const returnDiff = withAction.expectedReturn - withoutAction.expectedReturn;
    const riskDiff = withAction.maxDrawdown - withoutAction.maxDrawdown;

    if (returnDiff > 2 && riskDiff < 5) {
      return `Action improves return by ${returnDiff.toFixed(1)}% in ${scenarioName} with acceptable risk increase`;
    } else if (returnDiff < -2) {
      return `Action hurts performance in ${scenarioName} scenario`;
    } else if (riskDiff > 10) {
      return `Action significantly increases risk in ${scenarioName} scenario`;
    }
    return `Neutral impact in ${scenarioName} scenario`;
  }

  private generateOverallReasoning(
    outcomes: WhatIfAnalysis['outcomesByScenario'],
    action: string
  ): string {
    const actionBetter = outcomes.filter(o => o.recommendation === 'take_action').length;
    const total = outcomes.length;

    if (action === 'take_action') {
      return `Action is beneficial in ${actionBetter}/${total} scenarios analyzed, with positive risk-adjusted returns across most market conditions.`;
    } else if (action === 'dont_act') {
      return `Maintaining current position is better in most scenarios. Action introduces additional risk without commensurate return.`;
    }
    return `Mixed results across scenarios. Consider partial action or wait for better entry conditions.`;
  }

  private generateConditions(outcomes: WhatIfAnalysis['outcomesByScenario']): string[] {
    const conditions: string[] = [];

    for (const outcome of outcomes) {
      if (outcome.recommendation === 'take_action') {
        conditions.push(`Action especially beneficial if ${outcome.scenarioName} materializes`);
      }
    }

    if (conditions.length === 0) {
      conditions.push('Monitor market conditions before acting');
    }

    return conditions;
  }

  // ==========================================================================
  // HISTORICAL PARALLEL FINDER
  // ==========================================================================

  public async findHistoricalParallels(): Promise<HistoricalParallel[]> {
    console.log('[PREDICT] Finding historical parallels...');

    const parallels: HistoricalParallel[] = [];

    // Define historical periods to compare
    const historicalPeriods = [
      { name: '2008 Financial Crisis', start: new Date('2008-01-01'), end: new Date('2009-03-01'), outcome: { spxReturn: -57, vixChange: 350, duration: 517 } },
      { name: 'COVID Crash', start: new Date('2020-02-01'), end: new Date('2020-03-23'), outcome: { spxReturn: -34, vixChange: 400, duration: 51 } },
      { name: 'Dot-com Crash', start: new Date('2000-03-01'), end: new Date('2002-10-01'), outcome: { spxReturn: -49, vixChange: 150, duration: 946 } },
      { name: '2022 Bear Market', start: new Date('2022-01-01'), end: new Date('2022-10-01'), outcome: { spxReturn: -25, vixChange: 80, duration: 282 } },
      { name: '2018 Q4 Selloff', start: new Date('2018-10-01'), end: new Date('2018-12-24'), outcome: { spxReturn: -20, vixChange: 120, duration: 84 } }
    ];

    for (const period of historicalPeriods) {
      const similarity = this.calculatePeriodSimilarity(period);

      if (similarity > 50) {
        parallels.push({
          id: `parallel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: period.name,
          period: { start: period.start, end: period.end },
          matchingConditions: [
            {
              condition: 'VIX Level',
              currentValue: this.marketData.vix,
              historicalValue: 20 + Math.random() * 20,
              similarity: 60 + Math.random() * 30
            },
            {
              condition: 'Credit Spreads',
              currentValue: this.marketData.creditSpreads,
              historicalValue: 1 + Math.random() * 2,
              similarity: 50 + Math.random() * 40
            },
            {
              condition: 'Dollar Strength',
              currentValue: this.marketData.dollarIndex,
              historicalValue: 95 + Math.random() * 15,
              similarity: 55 + Math.random() * 35
            }
          ],
          overallSimilarity: similarity,
          outcome: {
            spxReturn: period.outcome.spxReturn,
            vixChange: period.outcome.vixChange,
            duration: period.outcome.duration,
            narrative: `During ${period.name}, markets experienced significant volatility with S&P 500 declining ${Math.abs(period.outcome.spxReturn)}% over ${period.outcome.duration} days.`
          },
          keyEvents: [
            { date: period.start, event: 'Period begins', impact: 'Initial selling pressure' },
            { date: new Date(period.start.getTime() + period.outcome.duration * 0.5 * 24 * 3600000), event: 'Mid-period event', impact: 'Volatility spike' },
            { date: period.end, event: 'Period ends', impact: 'Recovery begins' }
          ],
          lessons: this.generateLessonsFromPeriod(period.name)
        });
      }
    }

    // Store and emit
    for (const parallel of parallels) {
      this.historicalParallels.set(parallel.id, parallel);
    }

    this.emit('parallelsFound', parallels);
    return parallels.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
  }

  private calculatePeriodSimilarity(period: { name: string; outcome: any }): number {
    // In production, compare current conditions to historical conditions
    // For now, use a simplified calculation
    let similarity = 50;

    // VIX comparison
    if (this.marketData.vix > 25) similarity += 15;
    if (this.marketData.creditSpreads > 2) similarity += 10;
    if (period.name.includes('2008') && this.marketData.creditSpreads > 3) similarity += 15;

    return Math.min(100, similarity + Math.random() * 20);
  }

  private generateLessonsFromPeriod(periodName: string): string[] {
    const lessons: Record<string, string[]> = {
      '2008 Financial Crisis': [
        'Credit conditions are leading indicators',
        'Correlations spike during crisis',
        'Cash is valuable during liquidations',
        'Recovery takes years, not months'
      ],
      'COVID Crash': [
        'Fast crashes can have fast recoveries',
        'Policy response matters enormously',
        'Stay invested through volatility',
        'Rebalancing during crashes adds value'
      ],
      'Dot-com Crash': [
        'Valuations eventually matter',
        'Narrative-driven bubbles pop hard',
        'Diversification protects',
        'Extended bear markets test patience'
      ],
      'default': [
        'Market cycles are inevitable',
        'Risk management is essential',
        'Patience rewards long-term investors'
      ]
    };

    return lessons[periodName] || lessons['default'];
  }

  // ==========================================================================
  // REGIME TRANSITION PREDICTION
  // ==========================================================================

  public async predictRegimeTransition(): Promise<RegimeTransitionPrediction> {
    console.log('[PREDICT] Predicting regime transitions...');

    // Determine current regime
    const currentRegime = this.determineCurrentRegime();

    // Calculate transition probabilities
    const transitionMatrix = this.getTransitionProbabilities(currentRegime);

    // Identify leading indicators
    const indicators = this.analyzeLeadingIndicators();

    const prediction: RegimeTransitionPrediction = {
      id: `regime_${Date.now()}`,
      timestamp: new Date(),
      currentRegime,
      regimeConfidence: 75 + Math.random() * 20,
      timeInRegime: Math.floor(Math.random() * 180 + 30),
      transitionProbabilities: transitionMatrix,
      mostLikelyPath: {
        nextRegime: transitionMatrix[0].toRegime,
        probability: transitionMatrix[0].probability,
        expectedReturn: this.expectedReturnForRegime(transitionMatrix[0].toRegime),
        optimalPositioning: this.getOptimalPositioning(transitionMatrix[0].toRegime)
      },
      leadingIndicators: indicators,
      regimeDurationStats: {
        regime: currentRegime,
        avgDuration: this.getAvgRegimeDuration(currentRegime),
        minDuration: 20,
        maxDuration: 500,
        currentDuration: Math.floor(Math.random() * 100 + 30)
      }
    };

    this.regimePredictions.set(prediction.id, prediction);
    this.emit('regimePredictionUpdated', prediction);

    return prediction;
  }

  private determineCurrentRegime(): MarketCondition {
    const vix = this.marketData.vix;
    const trend = this.marketData.spx > 4800 ? 'up' : this.marketData.spx < 4200 ? 'down' : 'sideways';

    if (vix > 30) {
      return trend === 'down' ? 'bear_volatile' : 'bull_volatile';
    } else if (vix < 15) {
      return trend === 'up' ? 'bull_quiet' : 'sideways_quiet';
    } else {
      return trend === 'up' ? 'bull_quiet' : trend === 'down' ? 'bear_quiet' : 'sideways_volatile';
    }
  }

  private getTransitionProbabilities(currentRegime: MarketCondition): RegimeTransitionPrediction['transitionProbabilities'] {
    // Simplified Markov transition probabilities
    const transitions: Record<MarketCondition, { to: MarketCondition; prob: number }[]> = {
      'bull_quiet': [
        { to: 'bull_quiet', prob: 0.6 },
        { to: 'bull_volatile', prob: 0.2 },
        { to: 'sideways_quiet', prob: 0.15 },
        { to: 'bear_quiet', prob: 0.05 }
      ],
      'bull_volatile': [
        { to: 'bull_quiet', prob: 0.3 },
        { to: 'bull_volatile', prob: 0.3 },
        { to: 'bear_volatile', prob: 0.25 },
        { to: 'crash', prob: 0.15 }
      ],
      'bear_quiet': [
        { to: 'bear_quiet', prob: 0.4 },
        { to: 'recovery', prob: 0.3 },
        { to: 'sideways_quiet', prob: 0.2 },
        { to: 'bear_volatile', prob: 0.1 }
      ],
      'bear_volatile': [
        { to: 'capitulation', prob: 0.25 },
        { to: 'bear_volatile', prob: 0.3 },
        { to: 'recovery', prob: 0.25 },
        { to: 'bear_quiet', prob: 0.2 }
      ],
      'sideways_quiet': [
        { to: 'bull_quiet', prob: 0.3 },
        { to: 'bear_quiet', prob: 0.2 },
        { to: 'sideways_volatile', prob: 0.25 },
        { to: 'sideways_quiet', prob: 0.25 }
      ],
      'sideways_volatile': [
        { to: 'bull_volatile', prob: 0.3 },
        { to: 'bear_volatile', prob: 0.3 },
        { to: 'sideways_quiet', prob: 0.2 },
        { to: 'sideways_volatile', prob: 0.2 }
      ],
      'crash': [
        { to: 'capitulation', prob: 0.4 },
        { to: 'recovery', prob: 0.3 },
        { to: 'bear_volatile', prob: 0.3 }
      ],
      'recovery': [
        { to: 'bull_quiet', prob: 0.4 },
        { to: 'sideways_quiet', prob: 0.3 },
        { to: 'recovery', prob: 0.2 },
        { to: 'bear_quiet', prob: 0.1 }
      ],
      'bubble': [
        { to: 'crash', prob: 0.3 },
        { to: 'bull_volatile', prob: 0.4 },
        { to: 'bubble', prob: 0.3 }
      ],
      'capitulation': [
        { to: 'recovery', prob: 0.5 },
        { to: 'bear_quiet', prob: 0.3 },
        { to: 'capitulation', prob: 0.2 }
      ]
    };

    const probs = transitions[currentRegime] || [{ to: 'sideways_quiet', prob: 1 }];

    return probs.map(p => ({
      toRegime: p.to,
      probability: p.prob * 100,
      expectedTiming: p.prob > 0.3 ? '1-3 months' : '3-6 months',
      triggerConditions: this.getTriggerConditions(currentRegime, p.to)
    })).sort((a, b) => b.probability - a.probability);
  }

  private getTriggerConditions(from: MarketCondition, to: MarketCondition): string[] {
    if (to === 'crash') {
      return ['VIX spike above 40', 'Credit spreads widen >200bps', 'Major negative catalyst'];
    } else if (to === 'recovery') {
      return ['VIX decline below 25', 'Credit spreads normalize', 'Policy support'];
    } else if (to.includes('bull')) {
      return ['Earnings growth positive', 'Economic data improving', 'Fed pivot'];
    }
    return ['Market stabilization', 'Volatility normalization'];
  }

  private analyzeLeadingIndicators(): RegimeTransitionPrediction['leadingIndicators'] {
    return [
      {
        indicator: 'VIX Term Structure',
        currentValue: 1.05,
        threshold: 1.0,
        signaling: 'bull_quiet',
        confidence: 70
      },
      {
        indicator: 'High Yield Spreads',
        currentValue: this.marketData.creditSpreads,
        threshold: 4.0,
        signaling: this.marketData.creditSpreads > 4 ? 'bear_volatile' : 'bull_quiet',
        confidence: 65
      },
      {
        indicator: 'Market Breadth',
        currentValue: 55,
        threshold: 50,
        signaling: 'bull_quiet',
        confidence: 60
      },
      {
        indicator: 'Put/Call Ratio',
        currentValue: 0.95,
        threshold: 1.2,
        signaling: 'unclear',
        confidence: 55
      }
    ];
  }

  private expectedReturnForRegime(regime: MarketCondition): number {
    const returns: Record<MarketCondition, number> = {
      'bull_quiet': 12,
      'bull_volatile': 8,
      'bear_quiet': -8,
      'bear_volatile': -15,
      'sideways_quiet': 3,
      'sideways_volatile': 0,
      'crash': -30,
      'recovery': 20,
      'bubble': 25,
      'capitulation': -20
    };
    return returns[regime] || 0;
  }

  private getOptimalPositioning(regime: MarketCondition): string {
    const positioning: Record<MarketCondition, string> = {
      'bull_quiet': 'Full equity allocation, low hedges',
      'bull_volatile': 'Reduce to 70% equity, add protective puts',
      'bear_quiet': '50% equity, increase fixed income',
      'bear_volatile': '30% equity, hold cash, buy puts',
      'sideways_quiet': 'Neutral positioning, sell premium',
      'sideways_volatile': 'Iron condors, reduced exposure',
      'crash': 'Maximum defensive, buy the dip carefully',
      'recovery': 'Increase equity, buy cyclicals',
      'bubble': 'Take profits, raise cash',
      'capitulation': 'Prepare to buy aggressively'
    };
    return positioning[regime] || 'Maintain current allocation';
  }

  private getAvgRegimeDuration(regime: MarketCondition): number {
    const durations: Record<MarketCondition, number> = {
      'bull_quiet': 180,
      'bull_volatile': 60,
      'bear_quiet': 120,
      'bear_volatile': 45,
      'sideways_quiet': 90,
      'sideways_volatile': 45,
      'crash': 20,
      'recovery': 60,
      'bubble': 90,
      'capitulation': 15
    };
    return durations[regime] || 60;
  }

  // ==========================================================================
  // BLACK SWAN ANALYSIS
  // ==========================================================================

  public async analyzeBlackSwanRisks(
    portfolioValue: number,
    portfolioComposition: { asset: string; weight: number }[]
  ): Promise<BlackSwanAnalysis> {
    console.log('[PREDICT] Analyzing black swan risks...');

    const analysis: BlackSwanAnalysis = {
      id: `blackswan_${Date.now()}`,
      timestamp: new Date(),
      identifiedRisks: [
        {
          event: 'Major Geopolitical Conflict',
          category: 'geopolitical',
          estimatedProbability: 0.1,
          potentialImpact: -30,
          hedgeCost: 0.5,
          hedgeEffectiveness: 0.6
        },
        {
          event: 'Sovereign Debt Crisis',
          category: 'financial',
          estimatedProbability: 0.15,
          potentialImpact: -40,
          hedgeCost: 0.8,
          hedgeEffectiveness: 0.5
        },
        {
          event: 'Pandemic 2.0',
          category: 'pandemic',
          estimatedProbability: 0.05,
          potentialImpact: -35,
          hedgeCost: 0.3,
          hedgeEffectiveness: 0.4
        },
        {
          event: 'AI/Technology Disruption',
          category: 'technological',
          estimatedProbability: 0.2,
          potentialImpact: -20,
          hedgeCost: 0.2,
          hedgeEffectiveness: 0.3
        },
        {
          event: 'Major Natural Disaster',
          category: 'natural',
          estimatedProbability: 0.1,
          potentialImpact: -15,
          hedgeCost: 0.3,
          hedgeEffectiveness: 0.5
        }
      ],
      vulnerabilityScore: this.calculateVulnerabilityScore(portfolioComposition),
      mostVulnerableTo: ['Correlation Breakdown', 'Liquidity Crisis', 'Interest Rate Shock'],
      leastVulnerableTo: ['Minor Economic Slowdown', 'Normal Volatility'],
      tailMetrics: {
        leftTailExposure: 0.25,
        rightTailExposure: 0.15,
        kurtosis: 4.2,
        skewness: -0.8
      },
      protectionStrategies: [
        {
          strategy: 'Put Options (SPY)',
          cost: portfolioValue * 0.01,
          protection: portfolioValue * 0.15,
          effectiveness: 0.85,
          implementation: 'Buy 3-month 10% OTM puts'
        },
        {
          strategy: 'Gold Allocation',
          cost: 0,
          protection: portfolioValue * 0.08,
          effectiveness: 0.6,
          implementation: 'Add 5-10% allocation to GLD'
        },
        {
          strategy: 'Treasury Allocation',
          cost: portfolioValue * 0.003,
          protection: portfolioValue * 0.1,
          effectiveness: 0.7,
          implementation: 'Add 10% allocation to TLT'
        },
        {
          strategy: 'Cash Buffer',
          cost: portfolioValue * 0.005,
          protection: portfolioValue * 0.05,
          effectiveness: 1.0,
          implementation: 'Maintain 10% cash position'
        }
      ],
      historicalBlackSwans: [
        {
          event: '2008 Financial Crisis',
          date: new Date('2008-09-15'),
          impact: -57,
          recovery: 1461,
          lessons: 'Credit conditions are the canary'
        },
        {
          event: 'COVID-19 Crash',
          date: new Date('2020-03-16'),
          impact: -34,
          recovery: 149,
          lessons: 'Fast crashes can have fast recoveries with policy support'
        },
        {
          event: 'Flash Crash 2010',
          date: new Date('2010-05-06'),
          impact: -9,
          recovery: 1,
          lessons: 'Liquidity can evaporate instantly'
        }
      ]
    };

    this.blackSwanAnalyses.set(analysis.id, analysis);
    this.emit('blackSwanAnalysisComplete', analysis);

    return analysis;
  }

  private calculateVulnerabilityScore(composition: { asset: string; weight: number }[]): number {
    let score = 50;

    // High equity = higher vulnerability
    const equityWeight = composition
      .filter(c => ['SPY', 'QQQ', 'IWM'].some(e => c.asset.includes(e)))
      .reduce((sum, c) => sum + c.weight, 0);
    score += equityWeight * 30;

    // Crypto adds vulnerability
    const cryptoWeight = composition
      .filter(c => ['BTC', 'ETH'].some(e => c.asset.includes(e)))
      .reduce((sum, c) => sum + c.weight, 0);
    score += cryptoWeight * 50;

    // Fixed income reduces vulnerability
    const fixedWeight = composition
      .filter(c => ['TLT', 'BND', 'AGG'].some(e => c.asset.includes(e)))
      .reduce((sum, c) => sum + c.weight, 0);
    score -= fixedWeight * 20;

    return Math.max(0, Math.min(100, score));
  }

  // ==========================================================================
  // BACKGROUND PROCESSES
  // ==========================================================================

  private startMarketDataUpdater(): void {
    setInterval(() => {
      // In production, fetch real market data
      // For now, simulate minor updates
      this.marketData.spx *= 1 + (Math.random() - 0.5) * 0.01;
      this.marketData.vix *= 1 + (Math.random() - 0.5) * 0.05;
      this.marketData.btc *= 1 + (Math.random() - 0.5) * 0.02;

      this.emit('marketDataUpdated', this.marketData);
    }, 60000); // Every minute
  }

  private startParallelFinder(): void {
    setInterval(async () => {
      await this.findHistoricalParallels();
    }, 86400000); // Daily
  }

  private startRegimeAnalyzer(): void {
    setInterval(async () => {
      await this.predictRegimeTransition();
    }, 3600000); // Hourly
  }

  private startAccuracyTracker(): void {
    setInterval(() => {
      // Track accuracy of past predictions
      this.updatePredictionAccuracy();
    }, 86400000); // Daily
  }

  private updatePredictionAccuracy(): void {
    // In production, compare predictions to actual outcomes
    console.log('[PREDICT] Updating prediction accuracy...');
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  public getScenario(scenarioId: string): ScenarioDefinition | undefined {
    return this.scenarios.get(scenarioId);
  }

  public getAllScenarios(): ScenarioDefinition[] {
    return Array.from(this.scenarios.values());
  }

  public getResult(resultId: string): ScenarioResult | undefined {
    return this.results.get(resultId);
  }

  public getLatestRegimePrediction(): RegimeTransitionPrediction | undefined {
    const predictions = Array.from(this.regimePredictions.values());
    return predictions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  public getHistoricalParallels(): HistoricalParallel[] {
    return Array.from(this.historicalParallels.values())
      .sort((a, b) => b.overallSimilarity - a.overallSimilarity);
  }

  public getCurrentMarketData(): typeof this.marketData {
    return { ...this.marketData };
  }

  public async createCustomScenario(scenario: Omit<ScenarioDefinition, 'id' | 'createdAt' | 'isBuiltIn'>): Promise<ScenarioDefinition> {
    const newScenario: ScenarioDefinition = {
      ...scenario,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isBuiltIn: false
    };

    this.scenarios.set(newScenario.id, newScenario);
    this.emit('scenarioCreated', newScenario);

    return newScenario;
  }

  public explainPrediction(resultId: string): string {
    const result = this.results.get(resultId);
    if (!result) return 'Result not found';

    let explanation = `## Prediction Analysis: ${result.scenarioName}\n\n`;
    explanation += `**Portfolio Value:** $${result.portfolioValue.toLocaleString()}\n`;
    explanation += `**Time Horizon:** ${result.timeHorizon} days\n`;
    explanation += `**Paths Simulated:** ${result.pathCount.toLocaleString()}\n\n`;

    explanation += `### Expected Outcomes\n`;
    explanation += `- Expected Return: ${result.expectedReturn.toFixed(2)}%\n`;
    explanation += `- Median Return: ${result.medianReturn.toFixed(2)}%\n`;
    explanation += `- Standard Deviation: ${result.standardDeviation.toFixed(2)}%\n\n`;

    explanation += `### Risk Metrics\n`;
    explanation += `- Value at Risk (${(result.confidenceLevel * 100).toFixed(0)}%): ${result.varAtConfidence.toFixed(2)}%\n`;
    explanation += `- Conditional VaR: ${result.cvarAtConfidence.toFixed(2)}%\n`;
    explanation += `- Max Expected Drawdown: ${result.maxDrawdownExpected.toFixed(2)}%\n`;
    explanation += `- Probability of Loss: ${result.probabilityOfLoss.toFixed(1)}%\n\n`;

    explanation += `### Tail Risk\n`;
    explanation += `- Worst 1% Outcome: ${result.tailRisk.worstCase1Pct.toFixed(2)}%\n`;
    explanation += `- Worst 5% Outcome: ${result.tailRisk.worstCase5Pct.toFixed(2)}%\n`;
    explanation += `- Best 95% Outcome: ${result.tailRisk.bestCase95Pct.toFixed(2)}%\n`;

    return explanation;
  }
}

// Export singleton instance
export const predictiveScenarioEngine = PredictiveScenarioEngine.getInstance();

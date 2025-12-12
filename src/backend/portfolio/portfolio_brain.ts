/**
 * TIME Portfolio Brain
 *
 * THE CROSS-ASSET RISK ENGINE
 *
 * TIME's risk brain that aggregates positions across all brokers,
 * computes factor exposures, runs stress tests, and suggests hedges.
 *
 * Features:
 * - Cross-broker position aggregation
 * - Factor exposure analysis (momentum, value, quality, size, volatility)
 * - Concentration risk detection
 * - Stress testing (2008, COVID, flash crash scenarios)
 * - Hedge recommendations
 * - Sector rotation suggestions
 * - Correlation monitoring
 * - Tail risk analysis
 * - Live factor dashboard
 * - Regime-aware recommendations
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('PortfolioBrain');

// =============================================================================
// TYPES
// =============================================================================

export type AssetClass =
  | 'equity'
  | 'fixed_income'
  | 'commodity'
  | 'currency'
  | 'crypto'
  | 'real_estate'
  | 'alternative'
  | 'derivative';

export type Factor =
  | 'market'        // Overall market exposure (beta)
  | 'momentum'      // Price momentum
  | 'value'         // Value (P/E, P/B)
  | 'quality'       // Quality (ROE, debt ratios)
  | 'size'          // Market cap
  | 'volatility'    // Low/high volatility
  | 'carry'         // Yield/carry
  | 'liquidity'     // Liquidity premium
  | 'growth'        // Growth vs value
  | 'dividend';     // Dividend yield

export type StressScenario =
  | 'financial_crisis_2008'
  | 'covid_crash_2020'
  | 'flash_crash_2010'
  | 'dot_com_2000'
  | 'black_monday_1987'
  | 'interest_rate_shock'
  | 'inflation_spike'
  | 'recession'
  | 'geopolitical_crisis'
  | 'crypto_winter'
  | 'custom';

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'extreme';

export interface Position {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  broker: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  sector?: string;
  industry?: string;
  country?: string;
  currency: string;
  beta?: number;
  dividendYield?: number;
  lastUpdated: Date;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  positionCount: number;
  brokerCount: number;
  byAssetClass: Map<AssetClass, number>;
  bySector: Map<string, number>;
  byBroker: Map<string, number>;
  byCurrency: Map<string, number>;
  byCountry: Map<string, number>;
  timestamp: Date;
}

export interface FactorExposure {
  factor: Factor;
  exposure: number;              // -1 to 1 (negative = short exposure)
  zscore: number;                // How extreme vs history
  benchmark: number;             // Typical exposure
  deviation: number;             // Exposure - benchmark
  percentile: number;            // Where this falls in distribution
  contribution: number;          // Contribution to total risk
}

export interface ConcentrationRisk {
  type: 'position' | 'sector' | 'asset_class' | 'broker' | 'currency' | 'country' | 'factor';
  name: string;
  currentWeight: number;
  maxRecommended: number;
  riskLevel: RiskLevel;
  recommendation: string;
}

export interface StressTestResult {
  scenario: StressScenario;
  scenarioDescription: string;
  portfolioImpact: number;       // % change
  portfolioValueAfter: number;
  worstPositions: {
    symbol: string;
    impact: number;
    valueAfter: number;
  }[];
  factorContributions: Map<Factor, number>;
  recoveryTime: number;          // Estimated days to recover
  hedgeEffectiveness: number;    // How much existing hedges help
  recommendations: string[];
}

export interface CorrelationMatrix {
  positions: string[];
  matrix: number[][];
  highCorrelations: {
    pos1: string;
    pos2: string;
    correlation: number;
  }[];
  clusterCount: number;
  diversificationScore: number;  // 0-100
}

export interface HedgeRecommendation {
  type: 'option' | 'inverse_etf' | 'short' | 'futures' | 'diversification';
  symbol: string;
  name: string;
  action: 'buy' | 'sell';
  quantity: number;
  estimatedCost: number;
  protection: {
    downside: number;            // Protection if market drops
    upside: number;              // Cost if market rises
    breakeven: number;
  };
  hedgeRatio: number;
  effectiveness: number;         // 0-100
  reason: string;
}

export interface RotationRecommendation {
  type: 'sector' | 'asset_class' | 'factor' | 'geography';
  from: string;
  to: string;
  reason: string;
  regimeContext: string;
  expectedBenefit: number;
  confidence: number;
  implementation: {
    sellSymbols: string[];
    buySymbols: string[];
    estimatedCost: number;
  };
}

export interface TailRiskAnalysis {
  var95: number;                 // 95% Value at Risk
  var99: number;                 // 99% Value at Risk
  cvar95: number;                // Conditional VaR (Expected Shortfall)
  cvar99: number;
  maxDrawdownExpected: number;
  maxDrawdown99: number;
  tailIndex: number;             // Tail heaviness
  leftTailRisk: RiskLevel;
  recommendations: string[];
}

export interface RiskReport {
  timestamp: Date;
  portfolioSummary: PortfolioSummary;
  factorExposures: FactorExposure[];
  concentrationRisks: ConcentrationRisk[];
  correlationMatrix: CorrelationMatrix;
  stressTests: StressTestResult[];
  tailRisk: TailRiskAnalysis;
  hedgeRecommendations: HedgeRecommendation[];
  rotationRecommendations: RotationRecommendation[];
  overallRiskLevel: RiskLevel;
  riskScore: number;             // 0-100
  alerts: string[];
}

// =============================================================================
// PORTFOLIO BRAIN ENGINE
// =============================================================================

class PortfolioBrainEngine extends EventEmitter {
  private static instance: PortfolioBrainEngine;

  // Data stores
  private positions: Map<string, Position> = new Map();
  private positionHistory: Map<string, number[]> = new Map(); // Historical values
  private factorHistory: Map<Factor, number[]> = new Map();
  private riskReports: RiskReport[] = [];
  private currentRegime: string = 'normal';

  // Configuration
  private config = {
    maxPositionWeight: 0.10,     // Max 10% in single position
    maxSectorWeight: 0.25,       // Max 25% in single sector
    maxAssetClassWeight: 0.40,   // Max 40% in single asset class
    maxBrokerWeight: 0.50,       // Max 50% with single broker
    maxCurrencyWeight: 0.60,     // Max 60% in single currency
    highCorrelationThreshold: 0.7,
    riskReportInterval: 300000,  // Generate report every 5 minutes
    historyRetention: 252,       // 1 year of daily data
  };

  // Stress test scenarios with historical drawdowns
  private stressScenarios: Map<StressScenario, {
    description: string;
    equityImpact: number;
    bondImpact: number;
    cryptoImpact: number;
    goldImpact: number;
    cashImpact: number;
    recoveryDays: number;
  }> = new Map([
    ['financial_crisis_2008', {
      description: '2008 Global Financial Crisis',
      equityImpact: -0.57,
      bondImpact: 0.05,
      cryptoImpact: 0,
      goldImpact: 0.25,
      cashImpact: 0,
      recoveryDays: 1400,
    }],
    ['covid_crash_2020', {
      description: 'COVID-19 Market Crash (Feb-Mar 2020)',
      equityImpact: -0.34,
      bondImpact: 0.02,
      cryptoImpact: -0.50,
      goldImpact: -0.03,
      cashImpact: 0,
      recoveryDays: 180,
    }],
    ['flash_crash_2010', {
      description: '2010 Flash Crash',
      equityImpact: -0.09,
      bondImpact: 0.01,
      cryptoImpact: 0,
      goldImpact: 0.02,
      cashImpact: 0,
      recoveryDays: 1,
    }],
    ['dot_com_2000', {
      description: 'Dot-com Bubble Burst (2000-2002)',
      equityImpact: -0.49,
      bondImpact: 0.15,
      cryptoImpact: 0,
      goldImpact: 0.10,
      cashImpact: 0,
      recoveryDays: 2500,
    }],
    ['black_monday_1987', {
      description: 'Black Monday 1987',
      equityImpact: -0.22,
      bondImpact: 0.05,
      cryptoImpact: 0,
      goldImpact: 0.03,
      cashImpact: 0,
      recoveryDays: 400,
    }],
    ['interest_rate_shock', {
      description: 'Sudden Interest Rate Increase (+3%)',
      equityImpact: -0.15,
      bondImpact: -0.20,
      cryptoImpact: -0.25,
      goldImpact: -0.10,
      cashImpact: 0.02,
      recoveryDays: 365,
    }],
    ['inflation_spike', {
      description: 'High Inflation Scenario (>10%)',
      equityImpact: -0.20,
      bondImpact: -0.15,
      cryptoImpact: -0.10,
      goldImpact: 0.30,
      cashImpact: -0.10,
      recoveryDays: 730,
    }],
    ['recession', {
      description: 'Economic Recession',
      equityImpact: -0.35,
      bondImpact: 0.10,
      cryptoImpact: -0.40,
      goldImpact: 0.15,
      cashImpact: 0,
      recoveryDays: 600,
    }],
    ['geopolitical_crisis', {
      description: 'Major Geopolitical Event',
      equityImpact: -0.20,
      bondImpact: 0.05,
      cryptoImpact: -0.15,
      goldImpact: 0.20,
      cashImpact: 0,
      recoveryDays: 180,
    }],
    ['crypto_winter', {
      description: 'Crypto Market Winter',
      equityImpact: -0.05,
      bondImpact: 0,
      cryptoImpact: -0.80,
      goldImpact: 0,
      cashImpact: 0,
      recoveryDays: 1000,
    }],
  ]);

  private constructor() {
    super();
    this.initializeEngine();
  }

  public static getInstance(): PortfolioBrainEngine {
    if (!PortfolioBrainEngine.instance) {
      PortfolioBrainEngine.instance = new PortfolioBrainEngine();
    }
    return PortfolioBrainEngine.instance;
  }

  private initializeEngine(): void {
    logger.info('Initializing Portfolio Brain Engine...');

    // Start background risk monitoring
    this.startRiskMonitoringLoop();

    logger.info('Portfolio Brain Engine initialized');
    this.emit('initialized');
  }

  // ===========================================================================
  // POSITION MANAGEMENT
  // ===========================================================================

  /**
   * Register or update a position
   */
  public updatePosition(position: Position): void {
    this.positions.set(position.id, position);

    // Track history
    const history = this.positionHistory.get(position.id) || [];
    history.push(position.marketValue);
    if (history.length > this.config.historyRetention) {
      history.shift();
    }
    this.positionHistory.set(position.id, history);

    this.emit('position:updated', position);
  }

  /**
   * Remove a position
   */
  public removePosition(positionId: string): void {
    this.positions.delete(positionId);
    this.positionHistory.delete(positionId);
    this.emit('position:removed', positionId);
  }

  /**
   * Get all positions
   */
  public getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get positions by broker
   */
  public getPositionsByBroker(broker: string): Position[] {
    return Array.from(this.positions.values())
      .filter(p => p.broker === broker);
  }

  // ===========================================================================
  // PORTFOLIO SUMMARY
  // ===========================================================================

  /**
   * Calculate portfolio summary
   */
  public getPortfolioSummary(): PortfolioSummary {
    const positions = this.getPositions();

    let totalValue = 0;
    let totalCost = 0;

    const byAssetClass = new Map<AssetClass, number>();
    const bySector = new Map<string, number>();
    const byBroker = new Map<string, number>();
    const byCurrency = new Map<string, number>();
    const byCountry = new Map<string, number>();
    const brokers = new Set<string>();

    for (const pos of positions) {
      totalValue += pos.marketValue;
      totalCost += pos.avgCost * pos.quantity;
      brokers.add(pos.broker);

      // By asset class
      const acTotal = byAssetClass.get(pos.assetClass) || 0;
      byAssetClass.set(pos.assetClass, acTotal + pos.marketValue);

      // By sector
      if (pos.sector) {
        const sectorTotal = bySector.get(pos.sector) || 0;
        bySector.set(pos.sector, sectorTotal + pos.marketValue);
      }

      // By broker
      const brokerTotal = byBroker.get(pos.broker) || 0;
      byBroker.set(pos.broker, brokerTotal + pos.marketValue);

      // By currency
      const currencyTotal = byCurrency.get(pos.currency) || 0;
      byCurrency.set(pos.currency, currencyTotal + pos.marketValue);

      // By country
      if (pos.country) {
        const countryTotal = byCountry.get(pos.country) || 0;
        byCountry.set(pos.country, countryTotal + pos.marketValue);
      }
    }

    return {
      totalValue,
      totalCost,
      totalPnL: totalValue - totalCost,
      totalPnLPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      positionCount: positions.length,
      brokerCount: brokers.size,
      byAssetClass,
      bySector,
      byBroker,
      byCurrency,
      byCountry,
      timestamp: new Date(),
    };
  }

  // ===========================================================================
  // FACTOR EXPOSURE ANALYSIS
  // ===========================================================================

  /**
   * Calculate factor exposures
   */
  public calculateFactorExposures(): FactorExposure[] {
    const positions = this.getPositions();
    const summary = this.getPortfolioSummary();
    const totalValue = summary.totalValue;

    if (totalValue === 0) return [];

    const exposures: FactorExposure[] = [];
    const factors: Factor[] = [
      'market', 'momentum', 'value', 'quality', 'size',
      'volatility', 'carry', 'liquidity', 'growth', 'dividend'
    ];

    for (const factor of factors) {
      const exposure = this.calculateSingleFactorExposure(positions, totalValue, factor);
      exposures.push(exposure);
    }

    return exposures;
  }

  private calculateSingleFactorExposure(
    positions: Position[],
    totalValue: number,
    factor: Factor
  ): FactorExposure {
    let exposure = 0;

    for (const pos of positions) {
      const weight = pos.marketValue / totalValue;
      const factorLoading = this.getFactorLoading(pos, factor);
      exposure += weight * factorLoading;
    }

    // Get historical context
    const history = this.factorHistory.get(factor) || [];
    history.push(exposure);
    if (history.length > this.config.historyRetention) {
      history.shift();
    }
    this.factorHistory.set(factor, history);

    // Calculate statistics
    const benchmark = this.getFactorBenchmark(factor);
    const zscore = this.calculateZScore(exposure, history);
    const percentile = this.calculatePercentile(exposure, history);

    return {
      factor,
      exposure,
      zscore,
      benchmark,
      deviation: exposure - benchmark,
      percentile,
      contribution: Math.abs(exposure) / 10, // Simplified contribution
    };
  }

  private getFactorLoading(position: Position, factor: Factor): number {
    // In production, this would use factor model data
    // Here we use heuristics based on position characteristics

    switch (factor) {
      case 'market':
        return position.beta || 1;

      case 'momentum':
        // Use recent performance as proxy
        return position.unrealizedPnLPercent > 0 ? 0.5 : -0.5;

      case 'value':
        // Tech tends to be growth, financials tend to be value
        if (position.sector === 'Technology') return -0.3;
        if (position.sector === 'Financials') return 0.4;
        return 0;

      case 'quality':
        // Large caps tend to be higher quality
        return position.assetClass === 'equity' ? 0.2 : 0;

      case 'size':
        // Would need market cap data
        return 0;

      case 'volatility':
        // Crypto is high vol, bonds are low vol
        if (position.assetClass === 'crypto') return 0.8;
        if (position.assetClass === 'fixed_income') return -0.5;
        return 0;

      case 'carry':
        return position.dividendYield || 0;

      case 'liquidity':
        // Large positions assumed more liquid
        return position.marketValue > 10000 ? 0.3 : -0.3;

      case 'growth':
        if (position.sector === 'Technology') return 0.5;
        if (position.sector === 'Utilities') return -0.3;
        return 0;

      case 'dividend':
        return position.dividendYield ? position.dividendYield / 5 : 0;

      default:
        return 0;
    }
  }

  private getFactorBenchmark(factor: Factor): number {
    // Market-neutral benchmarks
    const benchmarks: Record<Factor, number> = {
      market: 1.0,
      momentum: 0,
      value: 0,
      quality: 0.2,
      size: 0,
      volatility: 0,
      carry: 0.02,
      liquidity: 0.3,
      growth: 0,
      dividend: 0.02,
    };
    return benchmarks[factor];
  }

  private calculateZScore(value: number, history: number[]): number {
    if (history.length < 2) return 0;

    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? (value - mean) / stdDev : 0;
  }

  private calculatePercentile(value: number, history: number[]): number {
    if (history.length === 0) return 50;

    const sorted = [...history].sort((a, b) => a - b);
    const idx = sorted.findIndex(v => v >= value);
    return idx >= 0 ? (idx / sorted.length) * 100 : 100;
  }

  // ===========================================================================
  // CONCENTRATION RISK
  // ===========================================================================

  /**
   * Detect concentration risks
   */
  public detectConcentrationRisks(): ConcentrationRisk[] {
    const summary = this.getPortfolioSummary();
    const totalValue = summary.totalValue;
    const risks: ConcentrationRisk[] = [];

    if (totalValue === 0) return [];

    // Position concentration
    for (const pos of this.getPositions()) {
      const weight = pos.marketValue / totalValue;
      if (weight > this.config.maxPositionWeight) {
        risks.push({
          type: 'position',
          name: pos.symbol,
          currentWeight: weight * 100,
          maxRecommended: this.config.maxPositionWeight * 100,
          riskLevel: this.assessConcentrationRisk(weight, this.config.maxPositionWeight),
          recommendation: `Consider reducing ${pos.symbol} position by ${((weight - this.config.maxPositionWeight) * totalValue).toFixed(0)}`,
        });
      }
    }

    // Sector concentration
    for (const [sector, value] of summary.bySector) {
      const weight = value / totalValue;
      if (weight > this.config.maxSectorWeight) {
        risks.push({
          type: 'sector',
          name: sector,
          currentWeight: weight * 100,
          maxRecommended: this.config.maxSectorWeight * 100,
          riskLevel: this.assessConcentrationRisk(weight, this.config.maxSectorWeight),
          recommendation: `Diversify away from ${sector} sector`,
        });
      }
    }

    // Asset class concentration
    for (const [assetClass, value] of summary.byAssetClass) {
      const weight = value / totalValue;
      if (weight > this.config.maxAssetClassWeight) {
        risks.push({
          type: 'asset_class',
          name: assetClass,
          currentWeight: weight * 100,
          maxRecommended: this.config.maxAssetClassWeight * 100,
          riskLevel: this.assessConcentrationRisk(weight, this.config.maxAssetClassWeight),
          recommendation: `Reduce ${assetClass} exposure`,
        });
      }
    }

    // Broker concentration
    for (const [broker, value] of summary.byBroker) {
      const weight = value / totalValue;
      if (weight > this.config.maxBrokerWeight) {
        risks.push({
          type: 'broker',
          name: broker,
          currentWeight: weight * 100,
          maxRecommended: this.config.maxBrokerWeight * 100,
          riskLevel: this.assessConcentrationRisk(weight, this.config.maxBrokerWeight),
          recommendation: `Spread assets across multiple brokers for safety`,
        });
      }
    }

    // Currency concentration
    for (const [currency, value] of summary.byCurrency) {
      const weight = value / totalValue;
      if (weight > this.config.maxCurrencyWeight) {
        risks.push({
          type: 'currency',
          name: currency,
          currentWeight: weight * 100,
          maxRecommended: this.config.maxCurrencyWeight * 100,
          riskLevel: this.assessConcentrationRisk(weight, this.config.maxCurrencyWeight),
          recommendation: `Consider currency diversification`,
        });
      }
    }

    // Sort by risk level
    const riskOrder: Record<RiskLevel, number> = {
      extreme: 0, high: 1, elevated: 2, moderate: 3, low: 4
    };
    risks.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

    return risks;
  }

  private assessConcentrationRisk(current: number, max: number): RiskLevel {
    const ratio = current / max;
    if (ratio >= 2) return 'extreme';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.25) return 'elevated';
    if (ratio >= 1) return 'moderate';
    return 'low';
  }

  // ===========================================================================
  // STRESS TESTING
  // ===========================================================================

  /**
   * Run all stress tests
   */
  public runStressTests(): StressTestResult[] {
    const results: StressTestResult[] = [];
    const summary = this.getPortfolioSummary();

    for (const [scenario, params] of this.stressScenarios) {
      results.push(this.runSingleStressTest(scenario, params, summary));
    }

    return results.sort((a, b) => a.portfolioImpact - b.portfolioImpact);
  }

  /**
   * Run a single stress test
   */
  public runSingleStressTest(
    scenario: StressScenario,
    params: {
      description: string;
      equityImpact: number;
      bondImpact: number;
      cryptoImpact: number;
      goldImpact: number;
      cashImpact: number;
      recoveryDays: number;
    },
    summary: PortfolioSummary
  ): StressTestResult {
    const positions = this.getPositions();
    let totalImpact = 0;
    const worstPositions: { symbol: string; impact: number; valueAfter: number }[] = [];
    const factorContributions = new Map<Factor, number>();

    for (const pos of positions) {
      let impact = 0;

      // Apply scenario impact based on asset class
      switch (pos.assetClass) {
        case 'equity':
          impact = params.equityImpact;
          break;
        case 'fixed_income':
          impact = params.bondImpact;
          break;
        case 'crypto':
          impact = params.cryptoImpact;
          break;
        case 'commodity':
          impact = params.goldImpact;
          break;
        default:
          impact = params.equityImpact * 0.5; // Default to half equity impact
      }

      // Apply beta adjustment
      if (pos.beta) {
        impact *= pos.beta;
      }

      const positionImpact = pos.marketValue * impact;
      totalImpact += positionImpact;

      worstPositions.push({
        symbol: pos.symbol,
        impact: impact * 100,
        valueAfter: pos.marketValue * (1 + impact),
      });
    }

    // Sort worst positions
    worstPositions.sort((a, b) => a.impact - b.impact);

    const portfolioImpact = summary.totalValue > 0 ?
      totalImpact / summary.totalValue : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (portfolioImpact < -0.3) {
      recommendations.push('Consider defensive hedging strategies');
      recommendations.push('Review stop-loss levels');
    }
    if (portfolioImpact < -0.2) {
      recommendations.push('Increase cash allocation');
      recommendations.push('Add uncorrelated assets');
    }

    return {
      scenario,
      scenarioDescription: params.description,
      portfolioImpact: portfolioImpact * 100,
      portfolioValueAfter: summary.totalValue * (1 + portfolioImpact),
      worstPositions: worstPositions.slice(0, 10),
      factorContributions,
      recoveryTime: params.recoveryDays,
      hedgeEffectiveness: this.calculateHedgeEffectiveness(positions),
      recommendations,
    };
  }

  private calculateHedgeEffectiveness(positions: Position[]): number {
    // Check for existing hedges
    let hedgeValue = 0;
    let portfolioValue = 0;

    for (const pos of positions) {
      portfolioValue += pos.marketValue;

      // Inverse ETFs, puts, etc. count as hedges
      if (pos.name.toLowerCase().includes('inverse') ||
          pos.name.toLowerCase().includes('short') ||
          pos.assetClass === 'derivative') {
        hedgeValue += Math.abs(pos.marketValue);
      }
    }

    return portfolioValue > 0 ? (hedgeValue / portfolioValue) * 100 : 0;
  }

  // ===========================================================================
  // CORRELATION ANALYSIS
  // ===========================================================================

  /**
   * Calculate correlation matrix
   */
  public calculateCorrelationMatrix(): CorrelationMatrix {
    const positions = this.getPositions();
    const n = positions.length;

    if (n === 0) {
      return {
        positions: [],
        matrix: [],
        highCorrelations: [],
        clusterCount: 0,
        diversificationScore: 100,
      };
    }

    // Create correlation matrix
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const highCorrelations: { pos1: string; pos2: string; correlation: number }[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (j > i) {
          // Calculate correlation based on asset class and sector similarity
          const corr = this.estimateCorrelation(positions[i], positions[j]);
          matrix[i][j] = corr;
          matrix[j][i] = corr;

          if (corr > this.config.highCorrelationThreshold) {
            highCorrelations.push({
              pos1: positions[i].symbol,
              pos2: positions[j].symbol,
              correlation: corr,
            });
          }
        }
      }
    }

    // Count clusters (simplified)
    const clusterCount = new Set(positions.map(p => `${p.assetClass}-${p.sector || 'none'}`)).size;

    // Calculate diversification score
    let avgCorr = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        avgCorr += matrix[i][j];
        count++;
      }
    }
    avgCorr = count > 0 ? avgCorr / count : 0;
    const diversificationScore = Math.max(0, Math.min(100, (1 - avgCorr) * 100));

    return {
      positions: positions.map(p => p.symbol),
      matrix,
      highCorrelations: highCorrelations.sort((a, b) => b.correlation - a.correlation),
      clusterCount,
      diversificationScore,
    };
  }

  private estimateCorrelation(pos1: Position, pos2: Position): number {
    let correlation = 0;

    // Same asset class = high base correlation
    if (pos1.assetClass === pos2.assetClass) {
      correlation += 0.5;
    }

    // Same sector = higher correlation
    if (pos1.sector && pos1.sector === pos2.sector) {
      correlation += 0.3;
    }

    // Same country = some correlation
    if (pos1.country && pos1.country === pos2.country) {
      correlation += 0.1;
    }

    // Crypto tends to be highly correlated within class
    if (pos1.assetClass === 'crypto' && pos2.assetClass === 'crypto') {
      correlation = 0.85;
    }

    // Bonds and stocks tend to be negatively correlated
    if ((pos1.assetClass === 'equity' && pos2.assetClass === 'fixed_income') ||
        (pos1.assetClass === 'fixed_income' && pos2.assetClass === 'equity')) {
      correlation = -0.2;
    }

    return Math.min(1, Math.max(-1, correlation));
  }

  // ===========================================================================
  // HEDGE RECOMMENDATIONS
  // ===========================================================================

  /**
   * Generate hedge recommendations
   */
  public generateHedgeRecommendations(): HedgeRecommendation[] {
    const summary = this.getPortfolioSummary();
    const exposures = this.calculateFactorExposures();
    const recommendations: HedgeRecommendation[] = [];

    // Find significant exposures
    const marketExposure = exposures.find(e => e.factor === 'market');
    const equityValue = summary.byAssetClass.get('equity') || 0;

    // Recommend market hedge if equity heavy
    if (equityValue > summary.totalValue * 0.6 && marketExposure && marketExposure.exposure > 0.8) {
      const hedgeAmount = equityValue * 0.1; // Hedge 10% of equity

      recommendations.push({
        type: 'inverse_etf',
        symbol: 'SH',
        name: 'ProShares Short S&P500',
        action: 'buy',
        quantity: Math.floor(hedgeAmount / 40), // Approximate price
        estimatedCost: hedgeAmount,
        protection: {
          downside: 0.10,
          upside: -0.10,
          breakeven: 0,
        },
        hedgeRatio: 0.10,
        effectiveness: 75,
        reason: 'Reduce market beta exposure',
      });
    }

    // Recommend volatility hedge
    const volExposure = exposures.find(e => e.factor === 'volatility');
    if (volExposure && volExposure.exposure > 0.5) {
      recommendations.push({
        type: 'option',
        symbol: 'VXX',
        name: 'iPath Series B S&P 500 VIX',
        action: 'buy',
        quantity: Math.floor(summary.totalValue * 0.02 / 20),
        estimatedCost: summary.totalValue * 0.02,
        protection: {
          downside: 0.20,
          upside: -0.05,
          breakeven: -0.10,
        },
        hedgeRatio: 0.02,
        effectiveness: 60,
        reason: 'Protect against volatility spike',
      });
    }

    // Recommend crypto hedge if significant crypto exposure
    const cryptoValue = summary.byAssetClass.get('crypto') || 0;
    if (cryptoValue > summary.totalValue * 0.1) {
      recommendations.push({
        type: 'diversification',
        symbol: 'CASH',
        name: 'Increase cash reserves',
        action: 'buy',
        quantity: 1,
        estimatedCost: cryptoValue * 0.2,
        protection: {
          downside: 0.15,
          upside: 0,
          breakeven: 0,
        },
        hedgeRatio: 0.20,
        effectiveness: 80,
        reason: 'Reduce crypto volatility exposure',
      });
    }

    return recommendations;
  }

  // ===========================================================================
  // ROTATION RECOMMENDATIONS
  // ===========================================================================

  /**
   * Generate rotation recommendations
   */
  public generateRotationRecommendations(): RotationRecommendation[] {
    const summary = this.getPortfolioSummary();
    const recommendations: RotationRecommendation[] = [];

    // Regime-based sector rotation
    const regimeRotations: Record<string, { from: string[]; to: string[] }> = {
      risk_on: {
        from: ['Utilities', 'Consumer Staples'],
        to: ['Technology', 'Consumer Discretionary'],
      },
      risk_off: {
        from: ['Technology', 'Consumer Discretionary'],
        to: ['Utilities', 'Healthcare'],
      },
      inflation: {
        from: ['Technology', 'Growth'],
        to: ['Energy', 'Commodities'],
      },
      recession: {
        from: ['Cyclicals', 'Financials'],
        to: ['Consumer Staples', 'Healthcare'],
      },
    };

    const regime = this.currentRegime;
    const rotation = regimeRotations[regime];

    if (rotation) {
      for (const fromSector of rotation.from) {
        const fromValue = summary.bySector.get(fromSector);
        if (fromValue && fromValue > summary.totalValue * 0.1) {
          for (const toSector of rotation.to) {
            recommendations.push({
              type: 'sector',
              from: fromSector,
              to: toSector,
              reason: `${regime} regime favors ${toSector} over ${fromSector}`,
              regimeContext: regime,
              expectedBenefit: 0.05, // 5% expected outperformance
              confidence: 0.6,
              implementation: {
                sellSymbols: [], // Would be populated with actual symbols
                buySymbols: [],
                estimatedCost: fromValue * 0.005, // Transaction costs
              },
            });
          }
        }
      }
    }

    return recommendations;
  }

  // ===========================================================================
  // TAIL RISK ANALYSIS
  // ===========================================================================

  /**
   * Analyze tail risk
   */
  public analyzeTailRisk(): TailRiskAnalysis {
    const summary = this.getPortfolioSummary();
    const positions = this.getPositions();

    // Calculate historical returns (simplified)
    const returns: number[] = [];
    for (const pos of positions) {
      returns.push(pos.unrealizedPnLPercent / 100);
    }

    // Sort for VaR calculation
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const n = sortedReturns.length;

    const var95 = n > 0 ? sortedReturns[Math.floor(n * 0.05)] || -0.15 : -0.15;
    const var99 = n > 0 ? sortedReturns[Math.floor(n * 0.01)] || -0.25 : -0.25;

    // CVaR (Expected Shortfall)
    const tailReturns95 = sortedReturns.slice(0, Math.floor(n * 0.05));
    const cvar95 = tailReturns95.length > 0 ?
      tailReturns95.reduce((a, b) => a + b, 0) / tailReturns95.length : -0.20;

    const tailReturns99 = sortedReturns.slice(0, Math.floor(n * 0.01));
    const cvar99 = tailReturns99.length > 0 ?
      tailReturns99.reduce((a, b) => a + b, 0) / tailReturns99.length : -0.35;

    // Max drawdown estimates
    const maxDD = Math.min(...positions.map(p => p.unrealizedPnLPercent / 100));
    const maxDrawdownExpected = Math.min(-0.15, maxDD);
    const maxDrawdown99 = Math.min(-0.30, maxDD * 1.5);

    // Tail index (kurtosis proxy)
    const mean = returns.reduce((a, b) => a + b, 0) / (n || 1);
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n || 1);
    const kurtosis = returns.reduce((sum, r) =>
      sum + Math.pow((r - mean) / Math.sqrt(variance || 1), 4), 0) / (n || 1);
    const tailIndex = kurtosis - 3; // Excess kurtosis

    // Assess left tail risk
    let leftTailRisk: RiskLevel = 'low';
    if (var95 < -0.20) leftTailRisk = 'extreme';
    else if (var95 < -0.15) leftTailRisk = 'high';
    else if (var95 < -0.10) leftTailRisk = 'elevated';
    else if (var95 < -0.05) leftTailRisk = 'moderate';

    // Generate recommendations
    const recommendations: string[] = [];
    if (leftTailRisk === 'extreme' || leftTailRisk === 'high') {
      recommendations.push('Consider purchasing protective puts');
      recommendations.push('Reduce position sizes');
      recommendations.push('Increase diversification');
    }
    if (tailIndex > 3) {
      recommendations.push('Portfolio has fat tails - consider tail hedging');
    }

    return {
      var95: var95 * summary.totalValue,
      var99: var99 * summary.totalValue,
      cvar95: cvar95 * summary.totalValue,
      cvar99: cvar99 * summary.totalValue,
      maxDrawdownExpected: maxDrawdownExpected * 100,
      maxDrawdown99: maxDrawdown99 * 100,
      tailIndex,
      leftTailRisk,
      recommendations,
    };
  }

  // ===========================================================================
  // COMPREHENSIVE RISK REPORT
  // ===========================================================================

  /**
   * Generate comprehensive risk report
   */
  public generateRiskReport(): RiskReport {
    const summary = this.getPortfolioSummary();
    const factorExposures = this.calculateFactorExposures();
    const concentrationRisks = this.detectConcentrationRisks();
    const correlationMatrix = this.calculateCorrelationMatrix();
    const stressTests = this.runStressTests();
    const tailRisk = this.analyzeTailRisk();
    const hedgeRecommendations = this.generateHedgeRecommendations();
    const rotationRecommendations = this.generateRotationRecommendations();

    // Calculate overall risk level
    const alerts: string[] = [];
    let riskScore = 50; // Start neutral

    // Factor in concentration risks
    const criticalConcentrations = concentrationRisks.filter(r =>
      r.riskLevel === 'extreme' || r.riskLevel === 'high'
    );
    riskScore += criticalConcentrations.length * 10;
    if (criticalConcentrations.length > 0) {
      alerts.push(`${criticalConcentrations.length} critical concentration risks detected`);
    }

    // Factor in stress test results
    const severeStress = stressTests.filter(s => s.portfolioImpact < -30);
    riskScore += severeStress.length * 5;
    if (severeStress.length > 0) {
      alerts.push(`Portfolio vulnerable to ${severeStress.length} severe stress scenarios`);
    }

    // Factor in tail risk
    if (tailRisk.leftTailRisk === 'extreme') {
      riskScore += 20;
      alerts.push('Extreme left tail risk detected');
    } else if (tailRisk.leftTailRisk === 'high') {
      riskScore += 10;
      alerts.push('High left tail risk detected');
    }

    // Factor in diversification
    if (correlationMatrix.diversificationScore < 40) {
      riskScore += 15;
      alerts.push('Low diversification - consider spreading risk');
    }

    // Cap risk score
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Determine overall risk level
    let overallRiskLevel: RiskLevel;
    if (riskScore >= 80) overallRiskLevel = 'extreme';
    else if (riskScore >= 65) overallRiskLevel = 'high';
    else if (riskScore >= 50) overallRiskLevel = 'elevated';
    else if (riskScore >= 30) overallRiskLevel = 'moderate';
    else overallRiskLevel = 'low';

    const report: RiskReport = {
      timestamp: new Date(),
      portfolioSummary: summary,
      factorExposures,
      concentrationRisks,
      correlationMatrix,
      stressTests,
      tailRisk,
      hedgeRecommendations,
      rotationRecommendations,
      overallRiskLevel,
      riskScore,
      alerts,
    };

    // Store report
    this.riskReports.push(report);
    if (this.riskReports.length > 100) {
      this.riskReports.shift();
    }

    this.emit('report:generated', report);
    return report;
  }

  // ===========================================================================
  // STATE & MONITORING
  // ===========================================================================

  public setCurrentRegime(regime: string): void {
    this.currentRegime = regime;
    this.emit('regime:changed', regime);
  }

  public getState(): {
    positionCount: number;
    totalValue: number;
    riskLevel: RiskLevel;
    lastReport: RiskReport | null;
  } {
    const summary = this.getPortfolioSummary();
    const lastReport = this.riskReports.length > 0 ?
      this.riskReports[this.riskReports.length - 1] : null;

    return {
      positionCount: this.positions.size,
      totalValue: summary.totalValue,
      riskLevel: lastReport?.overallRiskLevel || 'moderate',
      lastReport,
    };
  }

  private startRiskMonitoringLoop(): void {
    // Generate risk report periodically
    setInterval(() => {
      if (this.positions.size > 0) {
        this.generateRiskReport();
      }
    }, this.config.riskReportInterval);
  }
}

// Export singleton instance
export const portfolioBrain = PortfolioBrainEngine.getInstance();
export default portfolioBrain;

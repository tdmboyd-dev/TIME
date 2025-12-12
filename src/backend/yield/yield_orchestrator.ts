/**
 * TIME Yield Orchestrator
 *
 * THE UNIFIED INCOME ENGINE
 *
 * Maps all yield sources, builds yield playbooks, optimizes for risk/liquidity/lockup/tax,
 * monitors yield drift, and suggests rebalancing.
 *
 * Features:
 * - Maps ALL yield sources across platforms
 * - Builds yield playbooks by risk tier
 * - Optimizes for risk, liquidity, lockup, tax
 * - Monitors yield drift (APY changes)
 * - Suggests yield rebalancing
 * - Calculates TRUE yield (after gas, IL, taxes)
 * - Tracks yield attribution
 * - Regime-aware income strategies
 * - Auto-compound optimization
 * - Tax-loss harvesting for yields
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('YieldOrchestrator');

// =============================================================================
// TYPES
// =============================================================================

export type YieldSourceType =
  | 'defi_staking'           // DeFi staking (ETH, SOL, etc.)
  | 'defi_lending'           // Lending protocols (Aave, Compound)
  | 'defi_liquidity'         // LP pools (Uniswap, Curve)
  | 'defi_farming'           // Yield farming
  | 'dividend_stocks'        // Dividend-paying stocks
  | 'covered_calls'          // Options income
  | 'bond_yield'             // Bond coupon payments
  | 'real_estate'            // REIT dividends
  | 'cashback'               // Cashback rewards
  | 'interest'               // Bank/savings interest
  | 'nft_royalties'          // NFT royalties
  | 'arbitrage'              // Arbitrage profits
  | 'referral'               // Referral income
  | 'staking_rewards';       // Crypto staking rewards

export type RiskTier =
  | 'ultra_safe'             // <1% risk, FDIC insured, etc.
  | 'conservative'           // 1-5% risk
  | 'moderate'               // 5-15% risk
  | 'aggressive'             // 15-30% risk
  | 'speculative';           // >30% risk

export type LockupPeriod =
  | 'instant'                // Instant withdrawal
  | 'daily'                  // 24 hour lockup
  | 'weekly'                 // 7 day lockup
  | 'monthly'                // 30 day lockup
  | 'quarterly'              // 90 day lockup
  | 'yearly'                 // 365 day lockup
  | 'variable';              // Variable lockup

export type TaxTreatment =
  | 'ordinary_income'        // Taxed as ordinary income
  | 'qualified_dividend'     // Lower qualified dividend rate
  | 'long_term_capital_gain' // LTCG treatment
  | 'short_term_capital_gain'// STCG (ordinary income)
  | 'tax_exempt'             // Municipal bonds, etc.
  | 'deferred'               // Tax deferred (IRA, 401k)
  | 'unknown';               // Unknown tax treatment

export interface YieldSource {
  id: string;
  name: string;
  type: YieldSourceType;
  platform: string;                // e.g., "Aave", "Robinhood", "Chase"
  asset: string;                   // e.g., "ETH", "AAPL", "USD"
  principalAmount: number;
  currentApy: number;              // Current APY (gross)
  historicalApy: number[];         // Historical APY values
  apyVolatility: number;           // How much APY varies
  riskTier: RiskTier;
  lockupPeriod: LockupPeriod;
  lockupDaysRemaining: number;
  taxTreatment: TaxTreatment;
  estimatedTaxRate: number;        // User's estimated tax rate for this
  gasCostMonthly: number;          // Gas/fees per month
  impermanentLossRisk: number;     // 0-1, 0 = no IL risk
  autoCompounding: boolean;
  compoundFrequency: 'none' | 'daily' | 'weekly' | 'monthly';
  smartContractRisk: number;       // 0-1, smart contract risk level
  insuranceCovered: boolean;
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export interface TrueYield {
  sourceId: string;
  grossApy: number;
  gasCostPercent: number;
  impermanentLossPercent: number;
  taxCostPercent: number;
  platformFeePercent: number;
  netApy: number;                  // The TRUE yield
  annualizedIncome: number;        // Expected annual income in $
  monthlyIncome: number;           // Expected monthly income in $
  riskAdjustedApy: number;         // Net APY adjusted for risk
  effectiveReturn: number;         // Total effective return
}

export interface YieldPlaybook {
  id: string;
  name: string;
  description: string;
  targetRiskTier: RiskTier;
  targetApy: number;
  maxLockup: LockupPeriod;
  allocations: {
    sourceType: YieldSourceType;
    percentage: number;
    minApy: number;
    maxRisk: number;
  }[];
  rebalanceThreshold: number;      // Rebalance if off by this %
  autoCompound: boolean;
  taxOptimized: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface RegimeYieldStrategy {
  regime: string;
  preferredSources: YieldSourceType[];
  avoidSources: YieldSourceType[];
  targetAllocation: Map<YieldSourceType, number>;
  riskAdjustment: number;          // Multiply normal risk by this
  yieldPremiumTarget: number;      // Extra yield required in this regime
  reasoning: string;
}

export interface YieldDriftAlert {
  sourceId: string;
  sourceName: string;
  previousApy: number;
  currentApy: number;
  changePercent: number;
  direction: 'up' | 'down';
  significance: 'minor' | 'moderate' | 'major';
  recommendation: string;
  detectedAt: Date;
}

export interface YieldOptimization {
  fromSource: YieldSource;
  toSource: YieldSource;
  amount: number;
  currentTrueYield: number;
  newTrueYield: number;
  improvement: number;             // APY improvement
  annualBenefit: number;           // $ benefit per year
  switchingCost: number;           // One-time cost to switch
  breakEvenDays: number;           // Days until profitable
  reason: string;
  confidence: number;
}

export interface YieldAttribution {
  period: '24h' | '7d' | '30d' | 'ytd' | 'all';
  totalYieldEarned: number;
  bySource: Map<string, number>;
  byType: Map<YieldSourceType, number>;
  byRiskTier: Map<RiskTier, number>;
  topPerformers: {
    sourceId: string;
    name: string;
    earned: number;
    apy: number;
  }[];
  underperformers: {
    sourceId: string;
    name: string;
    earned: number;
    expectedEarned: number;
    shortfall: number;
  }[];
}

export interface YieldProjection {
  timeframe: '1m' | '3m' | '6m' | '1y' | '5y';
  scenarios: {
    pessimistic: number;
    expected: number;
    optimistic: number;
  };
  monthlyIncome: number[];
  cumulativeIncome: number;
  assumptions: string[];
}

// =============================================================================
// YIELD ORCHESTRATOR ENGINE
// =============================================================================

class YieldOrchestratorEngine extends EventEmitter {
  private static instance: YieldOrchestratorEngine;

  // Data stores
  private sources: Map<string, YieldSource> = new Map();
  private playbooks: Map<string, YieldPlaybook> = new Map();
  private regimeStrategies: Map<string, RegimeYieldStrategy> = new Map();
  private driftAlerts: YieldDriftAlert[] = [];
  private yieldHistory: Map<string, number[]> = new Map();
  private currentRegime: string = 'normal';

  // Configuration
  private config = {
    driftThresholdMinor: 0.10,     // 10% change = minor
    driftThresholdModerate: 0.25,  // 25% change = moderate
    driftThresholdMajor: 0.50,     // 50% change = major
    yieldUpdateInterval: 300000,   // Check yields every 5 minutes
    optimizationInterval: 3600000, // Run optimization every hour
    minSwitchingBenefit: 0.005,    // Min 0.5% APY improvement to switch
    defaultTaxRate: 0.25,          // 25% default tax rate
  };

  // Default regime strategies
  private defaultRegimeStrategies: RegimeYieldStrategy[] = [
    {
      regime: 'trending_up',
      preferredSources: ['defi_liquidity', 'defi_farming', 'dividend_stocks'],
      avoidSources: ['bond_yield'],
      targetAllocation: new Map([
        ['defi_liquidity', 0.30],
        ['defi_farming', 0.20],
        ['dividend_stocks', 0.30],
        ['covered_calls', 0.20],
      ]),
      riskAdjustment: 1.2,
      yieldPremiumTarget: 0.02,
      reasoning: 'Bull market favors equity and DeFi yields',
    },
    {
      regime: 'trending_down',
      preferredSources: ['bond_yield', 'defi_staking', 'interest'],
      avoidSources: ['defi_liquidity', 'defi_farming'],
      targetAllocation: new Map([
        ['bond_yield', 0.40],
        ['defi_staking', 0.20],
        ['interest', 0.30],
        ['dividend_stocks', 0.10],
      ]),
      riskAdjustment: 0.6,
      yieldPremiumTarget: 0,
      reasoning: 'Bear market favors stable, low-risk yields',
    },
    {
      regime: 'volatile',
      preferredSources: ['covered_calls', 'defi_staking', 'interest'],
      avoidSources: ['defi_liquidity'],
      targetAllocation: new Map([
        ['covered_calls', 0.35],
        ['defi_staking', 0.25],
        ['interest', 0.25],
        ['bond_yield', 0.15],
      ]),
      riskAdjustment: 0.8,
      yieldPremiumTarget: 0.03,
      reasoning: 'Volatility benefits options income strategies',
    },
    {
      regime: 'crisis',
      preferredSources: ['interest', 'bond_yield'],
      avoidSources: ['defi_liquidity', 'defi_farming', 'defi_staking'],
      targetAllocation: new Map([
        ['interest', 0.50],
        ['bond_yield', 0.40],
        ['dividend_stocks', 0.10],
      ]),
      riskAdjustment: 0.3,
      yieldPremiumTarget: 0,
      reasoning: 'Crisis mode: preserve capital, avoid smart contract risk',
    },
    {
      regime: 'normal',
      preferredSources: ['dividend_stocks', 'defi_staking', 'bond_yield', 'covered_calls'],
      avoidSources: [],
      targetAllocation: new Map([
        ['dividend_stocks', 0.30],
        ['defi_staking', 0.20],
        ['bond_yield', 0.20],
        ['covered_calls', 0.15],
        ['interest', 0.15],
      ]),
      riskAdjustment: 1.0,
      yieldPremiumTarget: 0.01,
      reasoning: 'Balanced yield across asset classes',
    },
  ];

  private constructor() {
    super();
    this.initializeEngine();
  }

  public static getInstance(): YieldOrchestratorEngine {
    if (!YieldOrchestratorEngine.instance) {
      YieldOrchestratorEngine.instance = new YieldOrchestratorEngine();
    }
    return YieldOrchestratorEngine.instance;
  }

  private initializeEngine(): void {
    logger.info('Initializing Yield Orchestrator Engine...');

    // Load default regime strategies
    for (const strategy of this.defaultRegimeStrategies) {
      this.regimeStrategies.set(strategy.regime, strategy);
    }

    // Start background processes
    this.startYieldMonitoringLoop();
    this.startOptimizationLoop();

    logger.info('Yield Orchestrator Engine initialized');
    this.emit('initialized');
  }

  // ===========================================================================
  // YIELD SOURCE MANAGEMENT
  // ===========================================================================

  /**
   * Register a yield source
   */
  public registerSource(source: YieldSource): void {
    this.sources.set(source.id, source);

    // Track yield history
    const history = this.yieldHistory.get(source.id) || [];
    history.push(source.currentApy);
    if (history.length > 365) {
      history.shift();
    }
    this.yieldHistory.set(source.id, history);

    logger.info(`Registered yield source: ${source.name} (${source.type}) - ${(source.currentApy * 100).toFixed(2)}% APY`);
    this.emit('source:registered', source);
  }

  /**
   * Update a yield source APY
   */
  public updateSourceApy(sourceId: string, newApy: number): void {
    const source = this.sources.get(sourceId);
    if (!source) {
      logger.warn(`Yield source not found: ${sourceId}`);
      return;
    }

    const previousApy = source.currentApy;
    source.currentApy = newApy;
    source.lastUpdated = new Date();

    // Track history
    const history = this.yieldHistory.get(sourceId) || [];
    history.push(newApy);
    if (history.length > 365) {
      history.shift();
    }
    this.yieldHistory.set(sourceId, history);

    // Check for drift
    this.checkYieldDrift(source, previousApy, newApy);

    this.emit('source:updated', source);
  }

  /**
   * Get all yield sources
   */
  public getSources(): YieldSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get sources by type
   */
  public getSourcesByType(type: YieldSourceType): YieldSource[] {
    return Array.from(this.sources.values())
      .filter(s => s.type === type);
  }

  /**
   * Get sources by risk tier
   */
  public getSourcesByRiskTier(tier: RiskTier): YieldSource[] {
    return Array.from(this.sources.values())
      .filter(s => s.riskTier === tier);
  }

  // ===========================================================================
  // TRUE YIELD CALCULATION
  // ===========================================================================

  /**
   * Calculate TRUE yield for a source (after all costs)
   */
  public calculateTrueYield(sourceId: string): TrueYield | null {
    const source = this.sources.get(sourceId);
    if (!source) return null;

    const grossApy = source.currentApy;

    // Calculate gas cost as percentage of principal
    const gasCostPercent = source.principalAmount > 0 ?
      (source.gasCostMonthly * 12) / source.principalAmount : 0;

    // Estimate impermanent loss (simplified)
    const impermanentLossPercent = source.impermanentLossRisk * 0.05; // Assume 5% IL at max risk

    // Calculate tax cost
    const preTaxYield = grossApy - gasCostPercent - impermanentLossPercent;
    const taxCostPercent = preTaxYield > 0 ?
      preTaxYield * source.estimatedTaxRate : 0;

    // Platform fees (usually built into APY, but some have additional)
    const platformFeePercent = 0; // Usually 0 as built into APY

    // Calculate net APY
    const netApy = grossApy - gasCostPercent - impermanentLossPercent - taxCostPercent - platformFeePercent;

    // Calculate income projections
    const annualizedIncome = source.principalAmount * Math.max(0, netApy);
    const monthlyIncome = annualizedIncome / 12;

    // Risk-adjusted APY (using Sharpe-like adjustment)
    const riskPenalty = this.getRiskPenalty(source.riskTier);
    const riskAdjustedApy = netApy - riskPenalty;

    // Effective return (considering lockup opportunity cost)
    const lockupPenalty = this.getLockupPenalty(source.lockupPeriod);
    const effectiveReturn = riskAdjustedApy - lockupPenalty;

    return {
      sourceId,
      grossApy,
      gasCostPercent,
      impermanentLossPercent,
      taxCostPercent,
      platformFeePercent,
      netApy,
      annualizedIncome,
      monthlyIncome,
      riskAdjustedApy,
      effectiveReturn,
    };
  }

  /**
   * Calculate true yields for all sources
   */
  public calculateAllTrueYields(): TrueYield[] {
    return Array.from(this.sources.keys())
      .map(id => this.calculateTrueYield(id))
      .filter((y): y is TrueYield => y !== null)
      .sort((a, b) => b.effectiveReturn - a.effectiveReturn);
  }

  private getRiskPenalty(tier: RiskTier): number {
    const penalties: Record<RiskTier, number> = {
      ultra_safe: 0,
      conservative: 0.005,
      moderate: 0.015,
      aggressive: 0.03,
      speculative: 0.05,
    };
    return penalties[tier];
  }

  private getLockupPenalty(lockup: LockupPeriod): number {
    const penalties: Record<LockupPeriod, number> = {
      instant: 0,
      daily: 0.001,
      weekly: 0.003,
      monthly: 0.008,
      quarterly: 0.015,
      yearly: 0.025,
      variable: 0.01,
    };
    return penalties[lockup];
  }

  // ===========================================================================
  // YIELD DRIFT MONITORING
  // ===========================================================================

  /**
   * Check for yield drift and create alerts
   */
  private checkYieldDrift(source: YieldSource, previousApy: number, newApy: number): void {
    if (previousApy === 0) return;

    const changePercent = (newApy - previousApy) / previousApy;
    const absChange = Math.abs(changePercent);

    let significance: 'minor' | 'moderate' | 'major';
    if (absChange >= this.config.driftThresholdMajor) {
      significance = 'major';
    } else if (absChange >= this.config.driftThresholdModerate) {
      significance = 'moderate';
    } else if (absChange >= this.config.driftThresholdMinor) {
      significance = 'minor';
    } else {
      return; // No significant drift
    }

    const direction = newApy > previousApy ? 'up' : 'down';

    // Generate recommendation
    let recommendation: string;
    if (direction === 'down' && significance === 'major') {
      recommendation = 'Consider reallocating to higher-yield alternatives';
    } else if (direction === 'down' && significance === 'moderate') {
      recommendation = 'Monitor closely, may need reallocation';
    } else if (direction === 'up') {
      recommendation = 'Yield improved, consider increasing allocation';
    } else {
      recommendation = 'Continue monitoring';
    }

    const alert: YieldDriftAlert = {
      sourceId: source.id,
      sourceName: source.name,
      previousApy,
      currentApy: newApy,
      changePercent: changePercent * 100,
      direction,
      significance,
      recommendation,
      detectedAt: new Date(),
    };

    this.driftAlerts.push(alert);
    if (this.driftAlerts.length > 1000) {
      this.driftAlerts.shift();
    }

    logger.info(`Yield drift detected: ${source.name} ${direction} ${(absChange * 100).toFixed(1)}%`);
    this.emit('drift:detected', alert);
  }

  /**
   * Get recent drift alerts
   */
  public getDriftAlerts(hours: number = 24): YieldDriftAlert[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.driftAlerts.filter(a => a.detectedAt.getTime() > cutoff);
  }

  // ===========================================================================
  // YIELD OPTIMIZATION
  // ===========================================================================

  /**
   * Generate yield optimization recommendations
   */
  public generateOptimizations(): YieldOptimization[] {
    const trueYields = this.calculateAllTrueYields();
    const optimizations: YieldOptimization[] = [];

    // Get current regime strategy
    const strategy = this.regimeStrategies.get(this.currentRegime);
    const preferredTypes = strategy?.preferredSources || [];
    const avoidTypes = strategy?.avoidSources || [];

    // Find optimization opportunities
    for (const currentYield of trueYields) {
      const currentSource = this.sources.get(currentYield.sourceId);
      if (!currentSource) continue;

      // Skip if in a preferred source type
      if (preferredTypes.includes(currentSource.type)) continue;

      // Find better alternatives
      for (const targetYield of trueYields) {
        const targetSource = this.sources.get(targetYield.sourceId);
        if (!targetSource) continue;

        // Skip same source
        if (currentSource.id === targetSource.id) continue;

        // Skip if target is in avoid list
        if (avoidTypes.includes(targetSource.type)) continue;

        // Calculate improvement
        const improvement = targetYield.effectiveReturn - currentYield.effectiveReturn;

        // Only recommend if improvement exceeds threshold
        if (improvement < this.config.minSwitchingBenefit) continue;

        // Only recommend if risk doesn't increase significantly
        const riskIncrease = this.compareRisk(currentSource.riskTier, targetSource.riskTier);
        if (riskIncrease > 2) continue; // Don't jump more than 2 risk levels

        // Calculate switching cost
        const switchingCost = this.estimateSwitchingCost(currentSource, targetSource);

        // Calculate annual benefit
        const annualBenefit = currentSource.principalAmount * improvement;

        // Calculate break-even days
        const breakEvenDays = annualBenefit > 0 ?
          (switchingCost / annualBenefit) * 365 : Infinity;

        // Only recommend if break-even is reasonable
        if (breakEvenDays > 90) continue; // Max 90 days break-even

        optimizations.push({
          fromSource: currentSource,
          toSource: targetSource,
          amount: currentSource.principalAmount,
          currentTrueYield: currentYield.netApy,
          newTrueYield: targetYield.netApy,
          improvement,
          annualBenefit,
          switchingCost,
          breakEvenDays,
          reason: this.generateOptimizationReason(currentSource, targetSource, improvement),
          confidence: this.calculateOptimizationConfidence(
            improvement,
            breakEvenDays,
            targetSource.apyVolatility
          ),
        });
      }
    }

    // Sort by annual benefit
    optimizations.sort((a, b) => b.annualBenefit - a.annualBenefit);

    return optimizations;
  }

  private compareRisk(current: RiskTier, target: RiskTier): number {
    const tiers: RiskTier[] = ['ultra_safe', 'conservative', 'moderate', 'aggressive', 'speculative'];
    const currentIdx = tiers.indexOf(current);
    const targetIdx = tiers.indexOf(target);
    return targetIdx - currentIdx;
  }

  private estimateSwitchingCost(from: YieldSource, to: YieldSource): number {
    let cost = 0;

    // Gas costs for DeFi sources
    if (from.type.startsWith('defi_')) {
      cost += 50; // Approximate withdrawal gas
    }
    if (to.type.startsWith('defi_')) {
      cost += 50; // Approximate deposit gas
    }

    // Early withdrawal penalty
    if (from.lockupDaysRemaining > 0) {
      cost += from.principalAmount * 0.01; // 1% penalty estimate
    }

    // Slippage for large amounts
    if (from.principalAmount > 100000) {
      cost += from.principalAmount * 0.001; // 0.1% slippage
    }

    return cost;
  }

  private generateOptimizationReason(
    from: YieldSource,
    to: YieldSource,
    improvement: number
  ): string {
    const reasons: string[] = [];

    reasons.push(`${(improvement * 100).toFixed(2)}% APY improvement`);

    if (to.riskTier !== from.riskTier) {
      const riskChange = this.compareRisk(from.riskTier, to.riskTier);
      if (riskChange < 0) {
        reasons.push('Lower risk');
      } else if (riskChange > 0) {
        reasons.push('Slightly higher risk');
      }
    }

    if (to.lockupPeriod !== from.lockupPeriod) {
      const lockupOrder: LockupPeriod[] = ['instant', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'variable'];
      const fromIdx = lockupOrder.indexOf(from.lockupPeriod);
      const toIdx = lockupOrder.indexOf(to.lockupPeriod);
      if (toIdx < fromIdx) {
        reasons.push('Better liquidity');
      }
    }

    if (to.taxTreatment === 'qualified_dividend' || to.taxTreatment === 'tax_exempt') {
      reasons.push('Tax advantages');
    }

    return reasons.join(', ');
  }

  private calculateOptimizationConfidence(
    improvement: number,
    breakEvenDays: number,
    targetVolatility: number
  ): number {
    let confidence = 0.5;

    // Higher improvement = higher confidence
    confidence += Math.min(0.2, improvement * 5);

    // Lower break-even = higher confidence
    confidence += Math.max(0, (30 - breakEvenDays) / 100);

    // Lower volatility = higher confidence
    confidence -= targetVolatility * 0.2;

    return Math.max(0, Math.min(1, confidence));
  }

  // ===========================================================================
  // PLAYBOOK MANAGEMENT
  // ===========================================================================

  /**
   * Create a yield playbook
   */
  public createPlaybook(playbook: YieldPlaybook): void {
    this.playbooks.set(playbook.id, playbook);
    logger.info(`Created yield playbook: ${playbook.name}`);
    this.emit('playbook:created', playbook);
  }

  /**
   * Get all playbooks
   */
  public getPlaybooks(): YieldPlaybook[] {
    return Array.from(this.playbooks.values());
  }

  /**
   * Generate a playbook from risk tier
   */
  public generatePlaybookForRiskTier(
    name: string,
    riskTier: RiskTier,
    totalCapital: number
  ): YieldPlaybook {
    const allocations: YieldPlaybook['allocations'] = [];

    switch (riskTier) {
      case 'ultra_safe':
        allocations.push(
          { sourceType: 'interest', percentage: 0.50, minApy: 0.02, maxRisk: 0.01 },
          { sourceType: 'bond_yield', percentage: 0.40, minApy: 0.03, maxRisk: 0.05 },
          { sourceType: 'dividend_stocks', percentage: 0.10, minApy: 0.02, maxRisk: 0.10 }
        );
        break;

      case 'conservative':
        allocations.push(
          { sourceType: 'bond_yield', percentage: 0.35, minApy: 0.03, maxRisk: 0.08 },
          { sourceType: 'dividend_stocks', percentage: 0.30, minApy: 0.03, maxRisk: 0.12 },
          { sourceType: 'interest', percentage: 0.20, minApy: 0.02, maxRisk: 0.02 },
          { sourceType: 'defi_staking', percentage: 0.15, minApy: 0.04, maxRisk: 0.15 }
        );
        break;

      case 'moderate':
        allocations.push(
          { sourceType: 'dividend_stocks', percentage: 0.30, minApy: 0.03, maxRisk: 0.15 },
          { sourceType: 'defi_staking', percentage: 0.25, minApy: 0.05, maxRisk: 0.20 },
          { sourceType: 'covered_calls', percentage: 0.20, minApy: 0.08, maxRisk: 0.15 },
          { sourceType: 'bond_yield', percentage: 0.15, minApy: 0.04, maxRisk: 0.10 },
          { sourceType: 'defi_lending', percentage: 0.10, minApy: 0.05, maxRisk: 0.20 }
        );
        break;

      case 'aggressive':
        allocations.push(
          { sourceType: 'defi_liquidity', percentage: 0.30, minApy: 0.10, maxRisk: 0.30 },
          { sourceType: 'defi_farming', percentage: 0.25, minApy: 0.15, maxRisk: 0.35 },
          { sourceType: 'covered_calls', percentage: 0.20, minApy: 0.10, maxRisk: 0.20 },
          { sourceType: 'defi_staking', percentage: 0.15, minApy: 0.06, maxRisk: 0.25 },
          { sourceType: 'dividend_stocks', percentage: 0.10, minApy: 0.04, maxRisk: 0.15 }
        );
        break;

      case 'speculative':
        allocations.push(
          { sourceType: 'defi_farming', percentage: 0.40, minApy: 0.25, maxRisk: 0.50 },
          { sourceType: 'defi_liquidity', percentage: 0.30, minApy: 0.20, maxRisk: 0.45 },
          { sourceType: 'arbitrage', percentage: 0.20, minApy: 0.30, maxRisk: 0.40 },
          { sourceType: 'staking_rewards', percentage: 0.10, minApy: 0.10, maxRisk: 0.35 }
        );
        break;
    }

    const playbook: YieldPlaybook = {
      id: `playbook_${riskTier}_${Date.now()}`,
      name,
      description: `Auto-generated ${riskTier} yield playbook`,
      targetRiskTier: riskTier,
      targetApy: allocations.reduce((sum, a) => sum + a.minApy * a.percentage, 0),
      maxLockup: riskTier === 'ultra_safe' ? 'instant' : riskTier === 'speculative' ? 'quarterly' : 'monthly',
      allocations,
      rebalanceThreshold: 0.05,
      autoCompound: true,
      taxOptimized: true,
      isActive: true,
      createdAt: new Date(),
    };

    this.createPlaybook(playbook);
    return playbook;
  }

  // ===========================================================================
  // YIELD ATTRIBUTION
  // ===========================================================================

  /**
   * Calculate yield attribution
   */
  public calculateAttribution(period: YieldAttribution['period']): YieldAttribution {
    const sources = this.getSources();
    const bySource = new Map<string, number>();
    const byType = new Map<YieldSourceType, number>();
    const byRiskTier = new Map<RiskTier, number>();
    let totalYieldEarned = 0;

    // Calculate days in period
    const periodDays: Record<string, number> = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      'ytd': Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000),
      'all': 365, // Assume 1 year for all
    };
    const days = periodDays[period];

    // Calculate earnings per source
    for (const source of sources) {
      const trueYield = this.calculateTrueYield(source.id);
      if (!trueYield) continue;

      const dailyYield = trueYield.annualizedIncome / 365;
      const periodYield = dailyYield * days;

      totalYieldEarned += periodYield;
      bySource.set(source.id, periodYield);

      // Aggregate by type
      const typeTotal = byType.get(source.type) || 0;
      byType.set(source.type, typeTotal + periodYield);

      // Aggregate by risk tier
      const tierTotal = byRiskTier.get(source.riskTier) || 0;
      byRiskTier.set(source.riskTier, tierTotal + periodYield);
    }

    // Find top performers
    const topPerformers = Array.from(bySource.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, earned]) => {
        const source = this.sources.get(id)!;
        return {
          sourceId: id,
          name: source.name,
          earned,
          apy: source.currentApy,
        };
      });

    // Find underperformers
    const underperformers = sources
      .map(source => {
        const trueYield = this.calculateTrueYield(source.id);
        if (!trueYield) return null;

        const earned = (bySource.get(source.id) || 0);
        const expectedEarned = source.principalAmount * source.currentApy * (days / 365);
        const shortfall = expectedEarned - earned;

        if (shortfall > 0) {
          return {
            sourceId: source.id,
            name: source.name,
            earned,
            expectedEarned,
            shortfall,
          };
        }
        return null;
      })
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .sort((a, b) => b.shortfall - a.shortfall)
      .slice(0, 5);

    return {
      period,
      totalYieldEarned,
      bySource,
      byType,
      byRiskTier,
      topPerformers,
      underperformers,
    };
  }

  // ===========================================================================
  // YIELD PROJECTIONS
  // ===========================================================================

  /**
   * Generate yield projections
   */
  public generateProjection(timeframe: YieldProjection['timeframe']): YieldProjection {
    const trueYields = this.calculateAllTrueYields();
    const totalPrincipal = this.getSources().reduce((sum, s) => sum + s.principalAmount, 0);

    // Calculate weighted average yield
    let weightedYield = 0;
    let weightedVolatility = 0;

    for (const ty of trueYields) {
      const source = this.sources.get(ty.sourceId)!;
      const weight = source.principalAmount / totalPrincipal;
      weightedYield += ty.netApy * weight;
      weightedVolatility += source.apyVolatility * weight;
    }

    // Calculate months in timeframe
    const months: Record<string, number> = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12,
      '5y': 60,
    };
    const numMonths = months[timeframe];

    // Generate monthly income projections
    const monthlyIncome: number[] = [];
    let cumulativeIncome = 0;

    for (let m = 0; m < numMonths; m++) {
      // Add some variance based on volatility
      const variance = (Math.random() - 0.5) * 2 * weightedVolatility;
      const monthYield = (weightedYield + variance) / 12;
      const income = totalPrincipal * monthYield;
      monthlyIncome.push(income);
      cumulativeIncome += income;
    }

    // Calculate scenarios
    const baseAnnualIncome = totalPrincipal * weightedYield;

    return {
      timeframe,
      scenarios: {
        pessimistic: baseAnnualIncome * 0.7 * (numMonths / 12),
        expected: cumulativeIncome,
        optimistic: baseAnnualIncome * 1.3 * (numMonths / 12),
      },
      monthlyIncome,
      cumulativeIncome,
      assumptions: [
        `Average APY: ${(weightedYield * 100).toFixed(2)}%`,
        `APY Volatility: ${(weightedVolatility * 100).toFixed(1)}%`,
        `Total Principal: $${totalPrincipal.toLocaleString()}`,
        'Assumes no principal changes',
        'Does not account for compounding adjustments',
      ],
    };
  }

  // ===========================================================================
  // REGIME-AWARE STRATEGIES
  // ===========================================================================

  /**
   * Set current market regime
   */
  public setCurrentRegime(regime: string): void {
    const previousRegime = this.currentRegime;
    this.currentRegime = regime;

    if (previousRegime !== regime) {
      logger.info(`Yield regime changed: ${previousRegime} -> ${regime}`);
      this.emit('regime:changed', { from: previousRegime, to: regime });
    }
  }

  /**
   * Get regime-specific yield strategy
   */
  public getRegimeStrategy(): RegimeYieldStrategy | null {
    return this.regimeStrategies.get(this.currentRegime) || null;
  }

  /**
   * Get yield allocation recommendations for current regime
   */
  public getRegimeRecommendations(): {
    currentAllocation: Map<YieldSourceType, number>;
    targetAllocation: Map<YieldSourceType, number>;
    rebalanceActions: { type: YieldSourceType; action: 'increase' | 'decrease'; amount: number }[];
  } {
    const strategy = this.getRegimeStrategy();
    if (!strategy) {
      return {
        currentAllocation: new Map(),
        targetAllocation: new Map(),
        rebalanceActions: [],
      };
    }

    const sources = this.getSources();
    const totalValue = sources.reduce((sum, s) => sum + s.principalAmount, 0);

    // Calculate current allocation
    const currentAllocation = new Map<YieldSourceType, number>();
    for (const source of sources) {
      const current = currentAllocation.get(source.type) || 0;
      currentAllocation.set(source.type, current + source.principalAmount);
    }

    // Convert to percentages
    for (const [type, value] of currentAllocation) {
      currentAllocation.set(type, value / totalValue);
    }

    // Calculate rebalance actions
    const rebalanceActions: { type: YieldSourceType; action: 'increase' | 'decrease'; amount: number }[] = [];

    for (const [type, target] of strategy.targetAllocation) {
      const current = currentAllocation.get(type) || 0;
      const diff = target - current;

      if (Math.abs(diff) > 0.02) { // Only if difference > 2%
        rebalanceActions.push({
          type,
          action: diff > 0 ? 'increase' : 'decrease',
          amount: Math.abs(diff) * totalValue,
        });
      }
    }

    return {
      currentAllocation,
      targetAllocation: strategy.targetAllocation,
      rebalanceActions,
    };
  }

  // ===========================================================================
  // STATE & SUMMARY
  // ===========================================================================

  public getState(): {
    sourceCount: number;
    totalPrincipal: number;
    weightedApy: number;
    totalMonthlyIncome: number;
    currentRegime: string;
    alertCount: number;
  } {
    const sources = this.getSources();
    const totalPrincipal = sources.reduce((sum, s) => sum + s.principalAmount, 0);

    let weightedApy = 0;
    let totalMonthlyIncome = 0;

    for (const source of sources) {
      const weight = source.principalAmount / (totalPrincipal || 1);
      const trueYield = this.calculateTrueYield(source.id);
      if (trueYield) {
        weightedApy += trueYield.netApy * weight;
        totalMonthlyIncome += trueYield.monthlyIncome;
      }
    }

    return {
      sourceCount: sources.length,
      totalPrincipal,
      weightedApy,
      totalMonthlyIncome,
      currentRegime: this.currentRegime,
      alertCount: this.getDriftAlerts(24).length,
    };
  }

  public getSummary(): {
    sources: YieldSource[];
    trueYields: TrueYield[];
    driftAlerts: YieldDriftAlert[];
    optimizations: YieldOptimization[];
    attribution: YieldAttribution;
    projection: YieldProjection;
    regimeRecommendations: ReturnType<typeof this.getRegimeRecommendations>;
  } {
    return {
      sources: this.getSources(),
      trueYields: this.calculateAllTrueYields(),
      driftAlerts: this.getDriftAlerts(24),
      optimizations: this.generateOptimizations().slice(0, 10),
      attribution: this.calculateAttribution('30d'),
      projection: this.generateProjection('1y'),
      regimeRecommendations: this.getRegimeRecommendations(),
    };
  }

  // ===========================================================================
  // BACKGROUND LOOPS
  // ===========================================================================

  private startYieldMonitoringLoop(): void {
    setInterval(() => {
      // In production, this would fetch live APY data
      logger.debug('Yield monitoring cycle');
    }, this.config.yieldUpdateInterval);
  }

  private startOptimizationLoop(): void {
    setInterval(() => {
      const optimizations = this.generateOptimizations();
      if (optimizations.length > 0) {
        const best = optimizations[0];
        logger.info(`Top optimization: Move $${best.amount.toFixed(0)} from ${best.fromSource.name} to ${best.toSource.name} for ${(best.improvement * 100).toFixed(2)}% improvement`);
        this.emit('optimization:found', optimizations);
      }
    }, this.config.optimizationInterval);
  }
}

// Export singleton instance
export const yieldOrchestrator = YieldOrchestratorEngine.getInstance();
export default yieldOrchestrator;

/**
 * TIME Capital Conductor
 *
 * THE UNIFIED CAPITAL BRAIN
 *
 * Sees ALL capital across ALL sources and orchestrates optimal allocation.
 * This is the heart of TIME 2.0 - the system that makes every dollar work 24/7.
 *
 * Features:
 * - Unified capital view across all platforms
 * - Dynamic capital allocation
 * - Cross-platform transfers
 * - Risk balancing across all assets
 * - Yield optimization
 * - Cash buffer management
 * - Tax planning and reserves
 * - Capital flow prediction (30/60/90 days)
 * - Automated capital routing
 * - Obligation tracking (bills, payroll, taxes)
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CapitalConductor');

// =============================================================================
// TYPES
// =============================================================================

export type CapitalSourceType =
  | 'time_pay'           // TIME Pay wallet
  | 'broker'             // Brokerage accounts
  | 'defi'               // DeFi positions
  | 'nft'                // NFT holdings
  | 'income'             // Income streams
  | 'tax_reserve'        // Tax reserves
  | 'payroll'            // Payroll obligations
  | 'invoice'            // Invoice receivables
  | 'bank'               // External bank accounts
  | 'crypto_wallet'      // Crypto wallets
  | 'staking';           // Staking positions

export type CapitalStatus =
  | 'available'          // Ready to use
  | 'allocated'          // Currently in use
  | 'locked'             // Locked (staking, LP)
  | 'pending'            // Pending settlement
  | 'reserved'           // Reserved for obligations
  | 'at_risk';           // At risk positions

export type FlowType =
  | 'income'             // Money coming in
  | 'expense'            // Money going out
  | 'transfer'           // Internal transfer
  | 'investment'         // Investment allocation
  | 'withdrawal'         // Withdrawal from system
  | 'deposit';           // Deposit into system

export type AllocationStrategy =
  | 'growth'             // Maximize long-term returns
  | 'income'             // Maximize monthly cash flow
  | 'preservation'       // Protect capital
  | 'balanced'           // Balanced approach
  | 'aggressive'         // High risk, high reward
  | 'custom';            // User-defined

export interface CapitalSource {
  id: string;
  type: CapitalSourceType;
  name: string;
  provider: string;            // e.g., "Alpaca", "Uniswap", "Chase"
  balance: number;
  currency: string;
  status: CapitalStatus;
  yield: number;               // Current yield (APY)
  risk: number;                // Risk score 0-100
  liquidity: number;           // Liquidity score 0-100 (how fast can we access)
  lockupDays: number;          // Days until fully liquid
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export interface CapitalObligation {
  id: string;
  type: 'tax' | 'payroll' | 'bill' | 'loan' | 'subscription' | 'other';
  name: string;
  amount: number;
  currency: string;
  dueDate: Date;
  recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  priority: 'critical' | 'high' | 'medium' | 'low';
  autoPayEnabled: boolean;
  sourcePreference?: string;   // Preferred capital source
}

export interface CapitalFlow {
  id: string;
  type: FlowType;
  amount: number;
  currency: string;
  fromSource?: string;
  toSource?: string;
  date: Date;
  isProjected: boolean;        // True if predicted, false if actual
  confidence: number;          // Confidence in prediction (0-1)
  description: string;
  category: string;
}

export interface AllocationTarget {
  sourceType: CapitalSourceType;
  targetPercentage: number;
  minPercentage: number;
  maxPercentage: number;
  priority: number;
  rebalanceThreshold: number;  // Rebalance if off by this %
}

export interface AllocationPlan {
  id: string;
  strategy: AllocationStrategy;
  targets: AllocationTarget[];
  cashBuffer: number;          // Minimum cash to keep available
  taxReserve: number;          // Percentage for tax reserve
  emergencyFund: number;       // Months of expenses
  createdAt: Date;
  isActive: boolean;
}

export interface CapitalSnapshot {
  totalCapital: number;
  availableCapital: number;
  allocatedCapital: number;
  lockedCapital: number;
  reservedCapital: number;
  atRiskCapital: number;
  bySource: Map<CapitalSourceType, number>;
  byStatus: Map<CapitalStatus, number>;
  weightedYield: number;
  weightedRisk: number;
  projectedIncome30d: number;
  projectedExpenses30d: number;
  netCashFlow30d: number;
  timestamp: Date;
}

export interface RebalanceRecommendation {
  fromSource: string;
  toSource: string;
  amount: number;
  reason: string;
  impact: {
    yieldChange: number;
    riskChange: number;
    liquidityChange: number;
  };
  urgency: 'immediate' | 'soon' | 'optional';
  estimatedGasCost?: number;
}

export interface CashFlowPrediction {
  period: '30d' | '60d' | '90d';
  inflows: CapitalFlow[];
  outflows: CapitalFlow[];
  netFlow: number;
  lowestPoint: number;
  lowestPointDate: Date;
  shortfallRisk: boolean;
  recommendations: string[];
}

// =============================================================================
// CAPITAL CONDUCTOR ENGINE
// =============================================================================

class CapitalConductorEngine extends EventEmitter {
  private static instance: CapitalConductorEngine;

  private sources: Map<string, CapitalSource> = new Map();
  private obligations: Map<string, CapitalObligation> = new Map();
  private flows: CapitalFlow[] = [];
  private allocationPlan: AllocationPlan | null = null;
  private snapshots: CapitalSnapshot[] = [];

  // Configuration
  private config = {
    snapshotInterval: 60000,     // Take snapshot every minute
    rebalanceCheckInterval: 300000, // Check rebalance every 5 minutes
    predictionHorizonDays: 90,
    minCashBuffer: 1000,         // Minimum $1000 cash buffer
    emergencyFundMonths: 3,      // 3 months emergency fund
    taxReservePercentage: 0.25,  // 25% for taxes
  };

  private constructor() {
    super();
    this.initializeEngine();
  }

  public static getInstance(): CapitalConductorEngine {
    if (!CapitalConductorEngine.instance) {
      CapitalConductorEngine.instance = new CapitalConductorEngine();
    }
    return CapitalConductorEngine.instance;
  }

  private initializeEngine(): void {
    logger.info('Initializing Capital Conductor Engine...');

    // Start background processes
    this.startSnapshotLoop();
    this.startRebalanceMonitor();
    this.startFlowPredictionLoop();

    logger.info('Capital Conductor Engine initialized');
    this.emit('initialized');
  }

  // ===========================================================================
  // CAPITAL SOURCE MANAGEMENT
  // ===========================================================================

  /**
   * Register a new capital source
   */
  public registerSource(source: CapitalSource): void {
    this.sources.set(source.id, source);
    logger.info(`Registered capital source: ${source.name} (${source.type})`);
    this.emit('source:registered', source);
  }

  /**
   * Update a capital source balance
   */
  public updateSourceBalance(
    sourceId: string,
    balance: number,
    metadata?: Record<string, any>
  ): void {
    const source = this.sources.get(sourceId);
    if (!source) {
      logger.warn(`Source not found: ${sourceId}`);
      return;
    }

    const previousBalance = source.balance;
    source.balance = balance;
    source.lastUpdated = new Date();

    if (metadata) {
      source.metadata = { ...source.metadata, ...metadata };
    }

    // Record the flow if balance changed significantly
    if (Math.abs(balance - previousBalance) > 0.01) {
      this.recordFlow({
        id: `flow_${Date.now()}`,
        type: balance > previousBalance ? 'deposit' : 'withdrawal',
        amount: Math.abs(balance - previousBalance),
        currency: source.currency,
        toSource: balance > previousBalance ? sourceId : undefined,
        fromSource: balance < previousBalance ? sourceId : undefined,
        date: new Date(),
        isProjected: false,
        confidence: 1,
        description: `Balance update for ${source.name}`,
        category: 'balance_change',
      });
    }

    this.emit('source:updated', source);
  }

  /**
   * Get all capital sources
   */
  public getSources(): CapitalSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get sources by type
   */
  public getSourcesByType(type: CapitalSourceType): CapitalSource[] {
    return Array.from(this.sources.values()).filter(s => s.type === type);
  }

  // ===========================================================================
  // CAPITAL SNAPSHOT & ANALYSIS
  // ===========================================================================

  /**
   * Take a snapshot of current capital state
   */
  public takeSnapshot(): CapitalSnapshot {
    const sources = Array.from(this.sources.values());

    // Calculate totals
    let totalCapital = 0;
    let availableCapital = 0;
    let allocatedCapital = 0;
    let lockedCapital = 0;
    let reservedCapital = 0;
    let atRiskCapital = 0;
    let weightedYieldSum = 0;
    let weightedRiskSum = 0;

    const bySource = new Map<CapitalSourceType, number>();
    const byStatus = new Map<CapitalStatus, number>();

    for (const source of sources) {
      totalCapital += source.balance;
      weightedYieldSum += source.balance * source.yield;
      weightedRiskSum += source.balance * source.risk;

      // By source type
      const currentSourceTotal = bySource.get(source.type) || 0;
      bySource.set(source.type, currentSourceTotal + source.balance);

      // By status
      const currentStatusTotal = byStatus.get(source.status) || 0;
      byStatus.set(source.status, currentStatusTotal + source.balance);

      // Status totals
      switch (source.status) {
        case 'available':
          availableCapital += source.balance;
          break;
        case 'allocated':
          allocatedCapital += source.balance;
          break;
        case 'locked':
          lockedCapital += source.balance;
          break;
        case 'reserved':
          reservedCapital += source.balance;
          break;
        case 'at_risk':
          atRiskCapital += source.balance;
          break;
      }
    }

    // Calculate projected flows
    const prediction = this.predictCashFlow('30d');

    const snapshot: CapitalSnapshot = {
      totalCapital,
      availableCapital,
      allocatedCapital,
      lockedCapital,
      reservedCapital,
      atRiskCapital,
      bySource,
      byStatus,
      weightedYield: totalCapital > 0 ? weightedYieldSum / totalCapital : 0,
      weightedRisk: totalCapital > 0 ? weightedRiskSum / totalCapital : 0,
      projectedIncome30d: prediction.inflows.reduce((sum, f) => sum + f.amount, 0),
      projectedExpenses30d: prediction.outflows.reduce((sum, f) => sum + f.amount, 0),
      netCashFlow30d: prediction.netFlow,
      timestamp: new Date(),
    };

    // Store snapshot
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 1440) { // Keep 24 hours at 1-minute intervals
      this.snapshots.shift();
    }

    this.emit('snapshot:taken', snapshot);
    return snapshot;
  }

  /**
   * Get unified capital view
   */
  public getUnifiedView(): {
    snapshot: CapitalSnapshot;
    sources: CapitalSource[];
    obligations: CapitalObligation[];
    recentFlows: CapitalFlow[];
    predictions: {
      '30d': CashFlowPrediction;
      '60d': CashFlowPrediction;
      '90d': CashFlowPrediction;
    };
    recommendations: RebalanceRecommendation[];
  } {
    return {
      snapshot: this.takeSnapshot(),
      sources: this.getSources(),
      obligations: Array.from(this.obligations.values()),
      recentFlows: this.flows.slice(-100),
      predictions: {
        '30d': this.predictCashFlow('30d'),
        '60d': this.predictCashFlow('60d'),
        '90d': this.predictCashFlow('90d'),
      },
      recommendations: this.generateRebalanceRecommendations(),
    };
  }

  // ===========================================================================
  // OBLIGATION MANAGEMENT
  // ===========================================================================

  /**
   * Register an obligation
   */
  public registerObligation(obligation: CapitalObligation): void {
    this.obligations.set(obligation.id, obligation);
    logger.info(`Registered obligation: ${obligation.name} ($${obligation.amount})`);
    this.emit('obligation:registered', obligation);

    // Project this obligation in flows
    this.projectObligationFlows(obligation);
  }

  /**
   * Update an obligation
   */
  public updateObligation(id: string, updates: Partial<CapitalObligation>): void {
    const obligation = this.obligations.get(id);
    if (!obligation) {
      logger.warn(`Obligation not found: ${id}`);
      return;
    }

    Object.assign(obligation, updates);
    this.emit('obligation:updated', obligation);
  }

  /**
   * Get upcoming obligations
   */
  public getUpcomingObligations(days: number = 30): CapitalObligation[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return Array.from(this.obligations.values())
      .filter(o => o.dueDate <= cutoff)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  /**
   * Project obligation flows
   */
  private projectObligationFlows(obligation: CapitalObligation): void {
    const horizonDate = new Date();
    horizonDate.setDate(horizonDate.getDate() + this.config.predictionHorizonDays);

    let currentDate = new Date(obligation.dueDate);

    while (currentDate <= horizonDate) {
      this.flows.push({
        id: `projected_${obligation.id}_${currentDate.getTime()}`,
        type: 'expense',
        amount: obligation.amount,
        currency: obligation.currency,
        date: new Date(currentDate),
        isProjected: true,
        confidence: 0.95,
        description: `${obligation.name} payment`,
        category: obligation.type,
      });

      if (!obligation.recurring) break;

      // Calculate next occurrence
      switch (obligation.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }
  }

  // ===========================================================================
  // CASH FLOW PREDICTION
  // ===========================================================================

  /**
   * Predict cash flow for a given period
   */
  public predictCashFlow(period: '30d' | '60d' | '90d'): CashFlowPrediction {
    const days = period === '30d' ? 30 : period === '60d' ? 60 : 90;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const now = new Date();

    // Filter flows within period
    const periodFlows = this.flows.filter(f =>
      f.date >= now && f.date <= endDate
    );

    const inflows = periodFlows.filter(f =>
      f.type === 'income' || f.type === 'deposit'
    );
    const outflows = periodFlows.filter(f =>
      f.type === 'expense' || f.type === 'withdrawal'
    );

    const totalInflows = inflows.reduce((sum, f) => sum + f.amount, 0);
    const totalOutflows = outflows.reduce((sum, f) => sum + f.amount, 0);
    const netFlow = totalInflows - totalOutflows;

    // Calculate lowest point (running balance simulation)
    const snapshot = this.takeSnapshot();
    let runningBalance = snapshot.availableCapital;
    let lowestPoint = runningBalance;
    let lowestPointDate = now;

    // Sort all flows by date
    const sortedFlows = [...periodFlows].sort((a, b) =>
      a.date.getTime() - b.date.getTime()
    );

    for (const flow of sortedFlows) {
      if (flow.type === 'income' || flow.type === 'deposit') {
        runningBalance += flow.amount;
      } else {
        runningBalance -= flow.amount;
      }

      if (runningBalance < lowestPoint) {
        lowestPoint = runningBalance;
        lowestPointDate = flow.date;
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    const shortfallRisk = lowestPoint < this.config.minCashBuffer;

    if (shortfallRisk) {
      recommendations.push(`Cash shortfall risk detected! Lowest point: $${lowestPoint.toFixed(2)} on ${lowestPointDate.toLocaleDateString()}`);
      recommendations.push('Consider moving funds from locked positions to available');
    }

    if (netFlow < 0) {
      recommendations.push(`Negative cash flow of $${Math.abs(netFlow).toFixed(2)} expected over ${days} days`);
    }

    // Yield optimization opportunities
    const lowYieldSources = Array.from(this.sources.values())
      .filter(s => s.yield < 0.02 && s.balance > 1000 && s.status === 'available');

    if (lowYieldSources.length > 0) {
      const totalLowYield = lowYieldSources.reduce((sum, s) => sum + s.balance, 0);
      recommendations.push(`$${totalLowYield.toFixed(2)} in low-yield accounts could earn more`);
    }

    return {
      period,
      inflows,
      outflows,
      netFlow,
      lowestPoint,
      lowestPointDate,
      shortfallRisk,
      recommendations,
    };
  }

  /**
   * Record a capital flow
   */
  public recordFlow(flow: CapitalFlow): void {
    this.flows.push(flow);

    // Keep only last 10000 flows
    if (this.flows.length > 10000) {
      this.flows = this.flows.slice(-10000);
    }

    this.emit('flow:recorded', flow);
  }

  // ===========================================================================
  // ALLOCATION & REBALANCING
  // ===========================================================================

  /**
   * Set the allocation plan
   */
  public setAllocationPlan(plan: AllocationPlan): void {
    this.allocationPlan = plan;
    logger.info(`Allocation plan set: ${plan.strategy}`);
    this.emit('plan:set', plan);
  }

  /**
   * Generate rebalance recommendations
   */
  public generateRebalanceRecommendations(): RebalanceRecommendation[] {
    if (!this.allocationPlan) {
      return [];
    }

    const recommendations: RebalanceRecommendation[] = [];
    const snapshot = this.takeSnapshot();
    const totalCapital = snapshot.totalCapital;

    if (totalCapital === 0) return [];

    for (const target of this.allocationPlan.targets) {
      const currentAmount = snapshot.bySource.get(target.sourceType) || 0;
      const currentPercentage = currentAmount / totalCapital;
      const deviation = currentPercentage - target.targetPercentage;

      // Check if rebalance needed
      if (Math.abs(deviation) > target.rebalanceThreshold) {
        const targetAmount = totalCapital * target.targetPercentage;
        const rebalanceAmount = Math.abs(targetAmount - currentAmount);

        if (deviation > 0) {
          // Over-allocated - need to reduce
          const bestTarget = this.findBestRebalanceTarget(target.sourceType, 'reduce');
          if (bestTarget) {
            recommendations.push({
              fromSource: target.sourceType,
              toSource: bestTarget.type,
              amount: rebalanceAmount,
              reason: `${target.sourceType} is ${(deviation * 100).toFixed(1)}% over target`,
              impact: {
                yieldChange: bestTarget.yield - this.getAverageYield(target.sourceType),
                riskChange: bestTarget.risk - this.getAverageRisk(target.sourceType),
                liquidityChange: bestTarget.liquidity - this.getAverageLiquidity(target.sourceType),
              },
              urgency: deviation > target.rebalanceThreshold * 2 ? 'immediate' : 'soon',
            });
          }
        } else {
          // Under-allocated - need to increase
          const bestSource = this.findBestRebalanceTarget(target.sourceType, 'increase');
          if (bestSource) {
            recommendations.push({
              fromSource: bestSource.type,
              toSource: target.sourceType,
              amount: rebalanceAmount,
              reason: `${target.sourceType} is ${(Math.abs(deviation) * 100).toFixed(1)}% under target`,
              impact: {
                yieldChange: this.getAverageYield(target.sourceType) - bestSource.yield,
                riskChange: this.getAverageRisk(target.sourceType) - bestSource.risk,
                liquidityChange: this.getAverageLiquidity(target.sourceType) - bestSource.liquidity,
              },
              urgency: Math.abs(deviation) > target.rebalanceThreshold * 2 ? 'immediate' : 'soon',
            });
          }
        }
      }
    }

    // Sort by urgency
    recommendations.sort((a, b) => {
      const urgencyOrder = { immediate: 0, soon: 1, optional: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });

    return recommendations;
  }

  /**
   * Execute a rebalance transfer
   */
  public async executeRebalance(recommendation: RebalanceRecommendation): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    logger.info(`Executing rebalance: $${recommendation.amount} from ${recommendation.fromSource} to ${recommendation.toSource}`);

    try {
      // Find source and target
      const fromSources = this.getSourcesByType(recommendation.fromSource as CapitalSourceType);
      const toSources = this.getSourcesByType(recommendation.toSource as CapitalSourceType);

      if (fromSources.length === 0 || toSources.length === 0) {
        return { success: false, error: 'Source or target not found' };
      }

      // In production, this would trigger actual transfers
      // For now, we simulate the transfer
      const transactionId = `rebalance_${Date.now()}`;

      // Record the flow
      this.recordFlow({
        id: transactionId,
        type: 'transfer',
        amount: recommendation.amount,
        currency: 'USD',
        fromSource: fromSources[0].id,
        toSource: toSources[0].id,
        date: new Date(),
        isProjected: false,
        confidence: 1,
        description: `Rebalance: ${recommendation.reason}`,
        category: 'rebalance',
      });

      this.emit('rebalance:executed', {
        recommendation,
        transactionId,
      });

      return { success: true, transactionId };
    } catch (error: any) {
      logger.error(`Rebalance failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private findBestRebalanceTarget(
    sourceType: CapitalSourceType,
    direction: 'increase' | 'reduce'
  ): CapitalSource | null {
    const sources = Array.from(this.sources.values())
      .filter(s => s.type !== sourceType && s.status === 'available');

    if (sources.length === 0) return null;

    if (direction === 'increase') {
      // Find highest balance available source
      return sources.sort((a, b) => b.balance - a.balance)[0];
    } else {
      // Find best yield opportunity
      return sources.sort((a, b) => b.yield - a.yield)[0];
    }
  }

  private getAverageYield(sourceType: CapitalSourceType): number {
    const sources = this.getSourcesByType(sourceType);
    if (sources.length === 0) return 0;
    return sources.reduce((sum, s) => sum + s.yield, 0) / sources.length;
  }

  private getAverageRisk(sourceType: CapitalSourceType): number {
    const sources = this.getSourcesByType(sourceType);
    if (sources.length === 0) return 0;
    return sources.reduce((sum, s) => sum + s.risk, 0) / sources.length;
  }

  private getAverageLiquidity(sourceType: CapitalSourceType): number {
    const sources = this.getSourcesByType(sourceType);
    if (sources.length === 0) return 0;
    return sources.reduce((sum, s) => sum + s.liquidity, 0) / sources.length;
  }

  // ===========================================================================
  // BACKGROUND LOOPS
  // ===========================================================================

  private startSnapshotLoop(): void {
    setInterval(() => {
      this.takeSnapshot();
    }, this.config.snapshotInterval);
  }

  private startRebalanceMonitor(): void {
    setInterval(() => {
      const recommendations = this.generateRebalanceRecommendations();
      const urgent = recommendations.filter(r => r.urgency === 'immediate');

      if (urgent.length > 0) {
        logger.warn(`${urgent.length} urgent rebalance recommendations`);
        this.emit('rebalance:urgent', urgent);
      }
    }, this.config.rebalanceCheckInterval);
  }

  private startFlowPredictionLoop(): void {
    // Update predictions every hour
    setInterval(() => {
      const predictions = {
        '30d': this.predictCashFlow('30d'),
        '60d': this.predictCashFlow('60d'),
        '90d': this.predictCashFlow('90d'),
      };

      // Check for shortfall risks
      for (const [period, prediction] of Object.entries(predictions)) {
        if (prediction.shortfallRisk) {
          logger.warn(`Cash shortfall risk detected for ${period}`);
          this.emit('shortfall:risk', { period, prediction });
        }
      }
    }, 3600000);
  }

  // ===========================================================================
  // STATE & HEALTH
  // ===========================================================================

  public getState(): {
    sourceCount: number;
    obligationCount: number;
    flowCount: number;
    snapshotCount: number;
    hasAllocationPlan: boolean;
    latestSnapshot: CapitalSnapshot | null;
  } {
    return {
      sourceCount: this.sources.size,
      obligationCount: this.obligations.size,
      flowCount: this.flows.length,
      snapshotCount: this.snapshots.length,
      hasAllocationPlan: this.allocationPlan !== null,
      latestSnapshot: this.snapshots.length > 0
        ? this.snapshots[this.snapshots.length - 1]
        : null,
    };
  }

  public getHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    const issues: string[] = [];
    const snapshot = this.snapshots.length > 0
      ? this.snapshots[this.snapshots.length - 1]
      : null;

    if (!snapshot) {
      return { status: 'warning', issues: ['No snapshots available'] };
    }

    // Check cash buffer
    if (snapshot.availableCapital < this.config.minCashBuffer) {
      issues.push('Cash buffer below minimum');
    }

    // Check for stale sources
    const now = Date.now();
    for (const source of this.sources.values()) {
      if (now - source.lastUpdated.getTime() > 3600000) { // 1 hour
        issues.push(`Source ${source.name} data is stale`);
      }
    }

    // Check for upcoming critical obligations
    const urgentObligations = this.getUpcomingObligations(7)
      .filter(o => o.priority === 'critical');

    if (urgentObligations.length > 0) {
      const totalUrgent = urgentObligations.reduce((sum, o) => sum + o.amount, 0);
      if (totalUrgent > snapshot.availableCapital) {
        issues.push(`Insufficient funds for ${urgentObligations.length} critical obligations`);
      }
    }

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.some(i =>
        i.includes('Insufficient') || i.includes('below minimum')
      ) ? 'critical' : 'warning';
    }

    return { status, issues };
  }
}

// Export singleton instance
export const capitalConductor = CapitalConductorEngine.getInstance();
export default capitalConductor;

/**
 * TIME — Meta-Intelligence Trading Governor
 * Attribution Engine
 *
 * TIME must:
 * - Attribute each trade to bots
 * - Attribute each decision to signals
 * - Attribute each modification to risk engine
 * - Generate a "trade story"
 * - Generate beginner and pro explanations
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent } from '../core/time_governor';
import {
  Trade,
  TradeAttribution,
  Signal,
  RiskDecision,
  Bot,
  MarketRegime,
  SystemHealth,
} from '../types';

const log = loggers.attribution;

// Attribution record for detailed tracking
export interface AttributionRecord {
  id: string;
  tradeId: string;
  timestamp: Date;
  attribution: TradeAttribution;
  signalBreakdown: SignalAttribution[];
  riskBreakdown: RiskAttribution[];
  regimeContext: RegimeAttribution;
  contributionScores: Record<string, number>;
}

export interface SignalAttribution {
  botId: string;
  signalId: string;
  direction: string;
  strength: number;
  confidence: number;
  contribution: number; // 0-1, how much this signal contributed to decision
  reasoning: string;
}

export interface RiskAttribution {
  decisionId: string;
  type: string;
  action: string;
  impact: string;
  modification: string;
}

export interface RegimeAttribution {
  regime: MarketRegime;
  confidence: number;
  factors: string[];
  strategyAlignment: number;
}

/**
 * Attribution Engine
 *
 * Tracks and attributes every trading decision to its sources,
 * enabling full transparency and teachability.
 */
export class AttributionEngine extends EventEmitter implements TIMEComponent {
  public readonly name = 'AttributionEngine';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private attributionRecords: Map<string, AttributionRecord> = new Map();
  private botPerformanceContributions: Map<string, number[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize the attribution engine
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Attribution Engine...');

    this.status = 'online';
    log.info('Attribution Engine initialized');
  }

  /**
   * Create attribution for a trade
   */
  public createAttribution(
    tradeId: string,
    signals: Signal[],
    riskDecisions: RiskDecision[],
    regime: MarketRegime,
    regimeConfidence: number
  ): TradeAttribution {
    // Calculate signal contributions
    const signalContributions = this.calculateSignalContributions(signals);

    // Find primary bot (highest contribution)
    const primaryBot = this.findPrimaryContributor(signalContributions);

    // Create trade attribution
    const attribution: TradeAttribution = {
      primaryBot,
      contributingBots: Object.entries(signalContributions).map(([botId, contribution]) => ({
        botId,
        contribution,
      })),
      signalStrength: this.calculateOverallSignalStrength(signals),
      regimeAtEntry: regime,
      riskEngineModifications: riskDecisions.map((d) => `${d.type}: ${d.action}`),
      synthesisEngineInput: signals.length > 2,
    };

    // Create detailed record
    const record: AttributionRecord = {
      id: uuidv4(),
      tradeId,
      timestamp: new Date(),
      attribution,
      signalBreakdown: this.createSignalBreakdown(signals, signalContributions),
      riskBreakdown: this.createRiskBreakdown(riskDecisions),
      regimeContext: {
        regime,
        confidence: regimeConfidence,
        factors: this.getRegimeFactors(regime),
        strategyAlignment: this.calculateStrategyAlignment(signals, regime),
      },
      contributionScores: signalContributions,
    };

    this.attributionRecords.set(record.id, record);

    log.info('Attribution created', {
      tradeId,
      primaryBot,
      contributingBots: attribution.contributingBots.length,
    });

    this.emit('attribution:created', record);

    return attribution;
  }

  /**
   * Calculate signal contributions
   */
  private calculateSignalContributions(signals: Signal[]): Record<string, number> {
    const contributions: Record<string, number> = {};

    if (signals.length === 0) {
      return contributions;
    }

    // Calculate weighted contributions based on strength and confidence
    let totalWeight = 0;

    for (const signal of signals) {
      const weight = signal.strength * signal.confidence;
      contributions[signal.botId] = (contributions[signal.botId] ?? 0) + weight;
      totalWeight += weight;
    }

    // Normalize to percentages
    if (totalWeight > 0) {
      for (const botId of Object.keys(contributions)) {
        contributions[botId] = contributions[botId] / totalWeight;
      }
    }

    return contributions;
  }

  /**
   * Find the primary contributor
   */
  private findPrimaryContributor(contributions: Record<string, number>): string {
    let maxContribution = 0;
    let primaryBot = 'unknown';

    for (const [botId, contribution] of Object.entries(contributions)) {
      if (contribution > maxContribution) {
        maxContribution = contribution;
        primaryBot = botId;
      }
    }

    return primaryBot;
  }

  /**
   * Calculate overall signal strength
   */
  private calculateOverallSignalStrength(signals: Signal[]): number {
    if (signals.length === 0) return 0;

    // Use root mean square for combining signal strengths
    const sumSquares = signals.reduce((sum, s) => sum + s.strength * s.strength, 0);
    return Math.sqrt(sumSquares / signals.length);
  }

  /**
   * Create detailed signal breakdown
   */
  private createSignalBreakdown(
    signals: Signal[],
    contributions: Record<string, number>
  ): SignalAttribution[] {
    return signals.map((signal) => ({
      botId: signal.botId,
      signalId: signal.id,
      direction: signal.direction,
      strength: signal.strength,
      confidence: signal.confidence,
      contribution: contributions[signal.botId] ?? 0,
      reasoning: signal.reasoning,
    }));
  }

  /**
   * Create risk decision breakdown
   */
  private createRiskBreakdown(decisions: RiskDecision[]): RiskAttribution[] {
    return decisions.map((decision) => ({
      decisionId: decision.id,
      type: decision.type,
      action: decision.action,
      impact: this.describeRiskImpact(decision),
      modification: this.describeRiskModification(decision),
    }));
  }

  /**
   * Describe risk impact
   */
  private describeRiskImpact(decision: RiskDecision): string {
    switch (decision.action) {
      case 'reduce_size':
        return 'Position size was reduced';
      case 'reject':
        return 'Trade was blocked';
      case 'close_position':
        return 'Position was closed';
      case 'halt_bot':
        return 'Bot was temporarily halted';
      case 'halt_all':
        return 'All trading was halted';
      default:
        return 'Trade was allowed';
    }
  }

  /**
   * Describe risk modification
   */
  private describeRiskModification(decision: RiskDecision): string {
    return `${decision.severity} severity ${decision.type} triggered ${decision.action}`;
  }

  /**
   * Get regime factors
   */
  private getRegimeFactors(regime: MarketRegime): string[] {
    const factors: Record<MarketRegime, string[]> = {
      trending_up: ['Price above moving averages', 'Higher highs and higher lows', 'Positive momentum'],
      trending_down: ['Price below moving averages', 'Lower highs and lower lows', 'Negative momentum'],
      ranging: ['Price oscillating between levels', 'No clear direction', 'Mean reversion favorable'],
      high_volatility: ['Large price swings', 'Increased ATR', 'Wide bid-ask spreads'],
      low_volatility: ['Small price movements', 'Low ATR', 'Tight ranges'],
      event_driven: ['News catalyst present', 'Unusual volume', 'Gap potential'],
      overnight_illiquid: ['Low volume', 'Wide spreads', 'Reduced liquidity'],
      sentiment_shift: ['Changing market tone', 'Sector rotation', 'Flow reversal'],
      unknown: ['Unclear conditions', 'Mixed signals', 'Caution advised'],
    };

    return factors[regime] ?? factors.unknown;
  }

  /**
   * Calculate strategy alignment with regime
   */
  private calculateStrategyAlignment(signals: Signal[], regime: MarketRegime): number {
    // Check if signal directions align with regime
    let alignedCount = 0;

    for (const signal of signals) {
      if (this.isAlignedWithRegime(signal.direction, regime)) {
        alignedCount++;
      }
    }

    return signals.length > 0 ? alignedCount / signals.length : 0;
  }

  /**
   * Check if signal direction aligns with regime
   */
  private isAlignedWithRegime(direction: string, regime: MarketRegime): boolean {
    const alignmentMap: Record<MarketRegime, string[]> = {
      trending_up: ['long'],
      trending_down: ['short'],
      ranging: ['long', 'short'], // Both directions valid in range
      high_volatility: ['neutral', 'exit'], // Prefer caution
      low_volatility: ['long', 'short'], // Range plays
      event_driven: ['neutral'], // Wait for clarity
      overnight_illiquid: ['neutral'], // Avoid
      sentiment_shift: ['long', 'short'], // Depends on shift direction
      unknown: ['neutral'],
    };

    return alignmentMap[regime]?.includes(direction) ?? false;
  }

  /**
   * Update bot performance contribution after trade closes
   */
  public recordTradeOutcome(
    tradeId: string,
    pnl: number,
    pnlPercent: number
  ): void {
    // Find attribution record
    const record = Array.from(this.attributionRecords.values()).find(
      (r) => r.tradeId === tradeId
    );

    if (!record) {
      log.warn('Attribution record not found for trade outcome', { tradeId });
      return;
    }

    // Attribute P&L to contributing bots
    for (const [botId, contribution] of Object.entries(record.contributionScores)) {
      const attributedPnL = pnlPercent * contribution;

      if (!this.botPerformanceContributions.has(botId)) {
        this.botPerformanceContributions.set(botId, []);
      }
      this.botPerformanceContributions.get(botId)!.push(attributedPnL);
    }

    log.debug('Trade outcome attributed', {
      tradeId,
      pnl,
      contributors: Object.keys(record.contributionScores).length,
    });

    this.emit('outcome:attributed', tradeId, record.contributionScores);
  }

  /**
   * Get bot's cumulative contribution score
   */
  public getBotContributionScore(botId: string): {
    totalContributions: number;
    avgContribution: number;
    trades: number;
  } {
    const contributions = this.botPerformanceContributions.get(botId) ?? [];

    return {
      totalContributions: contributions.reduce((a, b) => a + b, 0),
      avgContribution: contributions.length > 0
        ? contributions.reduce((a, b) => a + b, 0) / contributions.length
        : 0,
      trades: contributions.length,
    };
  }

  /**
   * Get attribution record by ID
   */
  public getAttributionRecord(recordId: string): AttributionRecord | undefined {
    return this.attributionRecords.get(recordId);
  }

  /**
   * Get attribution record by trade ID
   */
  public getAttributionByTradeId(tradeId: string): AttributionRecord | undefined {
    return Array.from(this.attributionRecords.values()).find(
      (r) => r.tradeId === tradeId
    );
  }

  /**
   * Get all attribution records
   */
  public getAllAttributionRecords(): AttributionRecord[] {
    return Array.from(this.attributionRecords.values());
  }

  /**
   * Generate attribution summary for a bot
   */
  public generateBotAttributionSummary(botId: string): {
    totalTrades: number;
    asPrimary: number;
    asContributor: number;
    avgContribution: number;
    performanceContribution: number;
  } {
    let asPrimary = 0;
    let asContributor = 0;
    let totalContribution = 0;
    let contributionCount = 0;

    for (const record of this.attributionRecords.values()) {
      if (record.attribution.primaryBot === botId) {
        asPrimary++;
      }

      const contribution = record.contributionScores[botId];
      if (contribution !== undefined) {
        asContributor++;
        totalContribution += contribution;
        contributionCount++;
      }
    }

    const performanceScore = this.getBotContributionScore(botId);

    return {
      totalTrades: asContributor,
      asPrimary,
      asContributor,
      avgContribution: contributionCount > 0 ? totalContribution / contributionCount : 0,
      performanceContribution: performanceScore.totalContributions,
    };
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
        totalAttributionRecords: this.attributionRecords.size,
        trackedBots: this.botPerformanceContributions.size,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Attribution Engine...');
    this.status = 'offline';
  }
}

// Export singleton
export const attributionEngine = new AttributionEngine();

export default AttributionEngine;

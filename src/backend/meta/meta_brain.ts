/**
 * TIME Meta-Brain
 *
 * THE GLOBAL ORCHESTRATION LAYER - THE BRAIN OF BRAINS
 *
 * This is the master orchestrator that sits ABOVE all other engines and:
 * - Sees EVERY engine, bot, user, market, capital source, risk, and opportunity
 * - Coordinates all subsystems into one coherent intelligence
 * - Makes global decisions that no single engine could make alone
 * - Operates in MANUAL (human approval) or AUTO (autonomous) mode
 *
 * Architecture based on institutional trading platforms like Fireblocks, Talos, and Wyden
 * that provide end-to-end orchestration of the entire trade lifecycle.
 *
 * References:
 * - Fireblocks: Unified platform for custody, control, and connectivity
 * - Talos: Full trading lifecycle from price discovery to settlement
 * - Wyden: End-to-end orchestration of digital asset trade lifecycle
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('MetaBrain');

// =============================================================================
// TYPES
// =============================================================================

export type MetaBrainMode = 'manual' | 'autonomous' | 'hybrid';

export type DecisionUrgency = 'immediate' | 'urgent' | 'normal' | 'low' | 'background';

export type SystemDomain =
  | 'capital'        // Capital Conductor, TIME Pay
  | 'alpha'          // Alpha Engine, bots, strategies
  | 'risk'           // Risk Engine, Portfolio Brain
  | 'yield'          // Yield Orchestrator, DeFi
  | 'execution'      // Brokers, order routing
  | 'learning'       // Learning Engine, velocity tracker
  | 'life'           // Life Timeline Engine
  | 'research'       // Research Annotation, Market Vision
  | 'social'         // Social Trading, Copy Trading
  | 'tax'            // Tax Loss Harvester
  | 'all';           // Cross-domain

export type RecommendationType =
  | 'capital_allocation'      // Move capital between sources
  | 'risk_adjustment'         // Change risk posture
  | 'strategy_change'         // Enable/disable strategies or bots
  | 'yield_rebalance'         // Rebalance yield sources
  | 'hedge_action'            // Add or remove hedges
  | 'opportunity_capture'     // Act on identified opportunity
  | 'emergency_action'        // Urgent protective action
  | 'learning_update'         // Update learning parameters
  | 'life_adjustment'         // Adjust for life events
  | 'tax_optimization'        // Tax-related actions
  | 'execution_route'         // Change execution routing
  | 'system_configuration';   // System-wide config changes

export interface SystemState {
  domain: SystemDomain;
  name: string;
  status: 'online' | 'degraded' | 'offline' | 'error';
  health: number;           // 0-100
  lastUpdate: Date;
  metrics: Record<string, any>;
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  domain: SystemDomain;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  data?: Record<string, any>;
}

export interface GlobalRecommendation {
  id: string;
  type: RecommendationType;
  domain: SystemDomain;
  urgency: DecisionUrgency;
  timestamp: Date;

  // What the Meta-Brain recommends
  action: {
    description: string;
    targetSystems: string[];
    parameters: Record<string, any>;
    expectedImpact: {
      riskChange: number;      // -100 to +100
      returnChange: number;    // -100 to +100
      capitalEfficiency: number;
      confidence: number;      // 0-100
    };
  };

  // Why this recommendation
  reasoning: {
    summary: string;
    factors: { factor: string; weight: number; value: any }[];
    supportingData: Record<string, any>;
    alternatives: { action: string; reason_rejected: string }[];
  };

  // Approval tracking
  status: 'pending' | 'approved' | 'rejected' | 'auto_executed' | 'expired';
  approvedBy?: string;
  approvedAt?: Date;
  executedAt?: Date;
  result?: {
    success: boolean;
    actualImpact: Record<string, any>;
    notes: string;
  };
}

export interface GlobalOverview {
  timestamp: Date;
  mode: MetaBrainMode;

  // Aggregate metrics
  totalCapital: number;
  totalAllocated: number;
  totalYield: number;
  globalRiskScore: number;       // 0-100
  marketRegime: string;

  // System health
  systemsOnline: number;
  systemsDegraded: number;
  systemsOffline: number;
  overallHealth: number;         // 0-100

  // Activity
  activeBots: number;
  openPositions: number;
  pendingOrders: number;
  todayTrades: number;
  todayPnL: number;

  // Alerts summary
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;

  // Recommendations
  pendingRecommendations: number;
  urgentRecommendations: number;

  // Domain summaries
  domains: Map<SystemDomain, DomainSummary>;
}

export interface DomainSummary {
  domain: SystemDomain;
  status: 'healthy' | 'attention' | 'critical';
  health: number;
  keyMetrics: Record<string, any>;
  topConcerns: string[];
  opportunities: string[];
}

export interface MetaBrainConfig {
  mode: MetaBrainMode;
  autoExecuteThreshold: number;   // Confidence level for auto-execution (0-100)
  recommendationTTL: number;      // Hours until recommendation expires
  analysisInterval: number;       // Seconds between full analysis cycles
  alertRetention: number;         // Days to keep alerts
  domains: {
    enabled: SystemDomain[];
    weights: Record<SystemDomain, number>;
  };
}

// =============================================================================
// META-BRAIN ENGINE
// =============================================================================

export class MetaBrainEngine extends EventEmitter {
  private static instance: MetaBrainEngine;

  private config: MetaBrainConfig;
  private systemStates: Map<string, SystemState> = new Map();
  private recommendations: Map<string, GlobalRecommendation> = new Map();
  private alerts: SystemAlert[] = [];
  private analysisLoop: NodeJS.Timeout | null = null;
  private lastOverview: GlobalOverview | null = null;

  private constructor() {
    super();

    this.config = {
      mode: 'manual',
      autoExecuteThreshold: 90,
      recommendationTTL: 24,
      analysisInterval: 60,
      alertRetention: 30,
      domains: {
        enabled: ['capital', 'alpha', 'risk', 'yield', 'execution', 'learning', 'life', 'research', 'social', 'tax'],
        weights: {
          capital: 1.0,
          alpha: 1.0,
          risk: 1.2,      // Risk weighted higher
          yield: 0.9,
          execution: 1.0,
          learning: 0.7,
          life: 0.8,
          research: 0.6,
          social: 0.5,
          tax: 0.7,
          all: 1.0
        }
      }
    };

    logger.info('MetaBrain initialized');
  }

  public static getInstance(): MetaBrainEngine {
    if (!MetaBrainEngine.instance) {
      MetaBrainEngine.instance = new MetaBrainEngine();
    }
    return MetaBrainEngine.instance;
  }

  // ===========================================================================
  // MODE CONTROL
  // ===========================================================================

  public setMode(mode: MetaBrainMode): void {
    const previousMode = this.config.mode;
    this.config.mode = mode;

    logger.info(`MetaBrain mode changed: ${previousMode} -> ${mode}`);
    this.emit('mode_changed', { previous: previousMode, current: mode });

    this.addAlert({
      domain: 'all',
      severity: 'info',
      message: `MetaBrain mode changed to ${mode}`,
      data: { previousMode, newMode: mode }
    });
  }

  public getMode(): MetaBrainMode {
    // If external mode control is set, use that
    if (this.externalModeCheck) {
      return this.externalModeCheck() ? 'autonomous' : 'manual';
    }
    return this.config.mode;
  }

  /**
   * Set external mode control - allows TIME Governor to control mode
   * This ensures mode is centralized, not duplicated across systems
   */
  private externalModeCheck: (() => boolean) | null = null;

  public setExternalModeControl(checkFn: () => boolean): void {
    this.externalModeCheck = checkFn;
    logger.info('MetaBrain now using external mode control (TIME Governor)');
  }

  /**
   * Check if in autonomous mode (defers to TIME Governor if integrated)
   */
  public isAutonomous(): boolean {
    if (this.externalModeCheck) {
      return this.externalModeCheck();
    }
    return this.config.mode === 'autonomous';
  }

  /**
   * Update system state by key (simplified for integration layer)
   */
  public updateSystemState(keyOrState: string | SystemState, value?: any): void {
    if (typeof keyOrState === 'string') {
      // Simple key-value update
      this.emit('state_updated', { key: keyOrState, value });
      return;
    }

    // Full SystemState update
    const state = keyOrState;
    const key = `${state.domain}:${state.name}`;
    const previous = this.systemStates.get(key);

    this.systemStates.set(key, {
      ...state,
      lastUpdate: new Date()
    });

    // Check for status degradation
    if (previous && previous.status === 'online' && state.status !== 'online') {
      this.addAlert({
        domain: state.domain,
        severity: state.status === 'offline' ? 'critical' : 'warning',
        message: `System ${state.name} status changed: ${previous.status} -> ${state.status}`,
        data: { system: state.name, previousStatus: previous.status, currentStatus: state.status }
      });
    }
  }

  /**
   * Record an insight from external systems
   */
  public recordInsight(insight: { source: string; type: string; data: any }): void {
    logger.info(`Insight received from ${insight.source}: ${insight.type}`);
    this.emit('insight_received', insight);
  }

  /**
   * Process an insight (from Memory Graph or other systems)
   */
  public processInsight(insight: any): void {
    logger.info('Processing insight:', insight.type);
    // Create recommendation if actionable
    if (insight.actionable) {
      this.addRecommendation({
        type: 'opportunity_capture',
        domain: insight.domain || 'all',
        urgency: insight.urgency || 'normal',
        action: {
          description: insight.description || 'Action from insight',
          targetSystems: insight.targetSystems || [],
          parameters: insight.data || {},
          expectedImpact: {
            riskChange: 0,
            returnChange: 10,
            capitalEfficiency: 5,
            confidence: insight.confidence || 50
          }
        },
        reasoning: {
          summary: insight.summary || 'Automated insight',
          factors: [],
          supportingData: { confidence: insight.confidence || 50, dataPoints: 1 },
          alternatives: []
        }
      });
    }
  }

  /**
   * Execute a decision (from Agent Swarm consensus)
   */
  public executeDecision(decision: any): void {
    logger.info(`Executing decision: ${decision.id || decision.title}`);
    this.emit('decision_executing', decision);
    // Implementation would trigger actual execution
  }

  /**
   * Record a trade for tracking
   */
  public recordTrade(trade: { tradeId: string; agentId: string; details: any }): void {
    logger.info(`Trade recorded: ${trade.tradeId}`);
    this.emit('trade_recorded', trade);
  }

  // ===========================================================================
  // SYSTEM STATE MANAGEMENT (continued)
  // ===========================================================================

  public updateSystemStateObject(state: SystemState): void {
    const key = `${state.domain}:${state.name}`;
    const previous = this.systemStates.get(key);

    this.systemStates.set(key, {
      ...state,
      lastUpdate: new Date()
    });

    // Check for status degradation
    if (previous && previous.status === 'online' && state.status !== 'online') {
      this.addAlert({
        domain: state.domain,
        severity: state.status === 'offline' ? 'critical' : 'warning',
        message: `System ${state.name} status changed: ${previous.status} -> ${state.status}`,
        data: { system: state.name, previousStatus: previous.status, currentStatus: state.status }
      });
    }

    // Check for health degradation
    if (previous && state.health < previous.health - 20) {
      this.addAlert({
        domain: state.domain,
        severity: state.health < 50 ? 'warning' : 'info',
        message: `System ${state.name} health dropped: ${previous.health} -> ${state.health}`,
        data: { system: state.name, previousHealth: previous.health, currentHealth: state.health }
      });
    }

    this.emit('system_state_updated', state);
  }

  public getSystemState(domain: SystemDomain, name: string): SystemState | undefined {
    return this.systemStates.get(`${domain}:${name}`);
  }

  public getAllSystemStates(): SystemState[] {
    return Array.from(this.systemStates.values());
  }

  // ===========================================================================
  // GLOBAL ANALYSIS
  // ===========================================================================

  public async performGlobalAnalysis(): Promise<GlobalOverview> {
    logger.info('Performing global analysis...');

    const timestamp = new Date();
    const states = this.getAllSystemStates();

    // Calculate system health
    const systemsOnline = states.filter(s => s.status === 'online').length;
    const systemsDegraded = states.filter(s => s.status === 'degraded').length;
    const systemsOffline = states.filter(s => s.status === 'offline' || s.status === 'error').length;
    const overallHealth = states.length > 0
      ? states.reduce((sum, s) => sum + s.health, 0) / states.length
      : 0;

    // Calculate alerts
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
    const warningAlerts = this.alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length;
    const infoAlerts = this.alerts.filter(a => a.severity === 'info' && !a.acknowledged).length;

    // Calculate recommendations
    const pendingRecs = Array.from(this.recommendations.values()).filter(r => r.status === 'pending');
    const urgentRecs = pendingRecs.filter(r => r.urgency === 'immediate' || r.urgency === 'urgent');

    // Build domain summaries
    const domains = new Map<SystemDomain, DomainSummary>();

    for (const domain of this.config.domains.enabled) {
      const domainStates = states.filter(s => s.domain === domain);
      const domainAlerts = this.alerts.filter(a => a.domain === domain && !a.acknowledged);

      const avgHealth = domainStates.length > 0
        ? domainStates.reduce((sum, s) => sum + s.health, 0) / domainStates.length
        : 100;

      let status: 'healthy' | 'attention' | 'critical' = 'healthy';
      if (domainAlerts.some(a => a.severity === 'critical') || avgHealth < 50) {
        status = 'critical';
      } else if (domainAlerts.some(a => a.severity === 'warning') || avgHealth < 75) {
        status = 'attention';
      }

      domains.set(domain, {
        domain,
        status,
        health: avgHealth,
        keyMetrics: this.extractDomainMetrics(domain, domainStates),
        topConcerns: domainAlerts.slice(0, 3).map(a => a.message),
        opportunities: this.identifyDomainOpportunities(domain, domainStates)
      });
    }

    // Build overview
    const overview: GlobalOverview = {
      timestamp,
      mode: this.config.mode,
      totalCapital: this.getMetricFromStates(states, 'capital', 'totalCapital', 0),
      totalAllocated: this.getMetricFromStates(states, 'capital', 'totalAllocated', 0),
      totalYield: this.getMetricFromStates(states, 'yield', 'totalYield', 0),
      globalRiskScore: this.calculateGlobalRiskScore(states),
      marketRegime: this.getMetricFromStates(states, 'research', 'currentRegime', 'unknown'),
      systemsOnline,
      systemsDegraded,
      systemsOffline,
      overallHealth,
      activeBots: this.getMetricFromStates(states, 'alpha', 'activeBots', 0),
      openPositions: this.getMetricFromStates(states, 'execution', 'openPositions', 0),
      pendingOrders: this.getMetricFromStates(states, 'execution', 'pendingOrders', 0),
      todayTrades: this.getMetricFromStates(states, 'execution', 'todayTrades', 0),
      todayPnL: this.getMetricFromStates(states, 'execution', 'todayPnL', 0),
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      pendingRecommendations: pendingRecs.length,
      urgentRecommendations: urgentRecs.length,
      domains
    };

    this.lastOverview = overview;

    // Generate recommendations based on analysis
    await this.generateRecommendations(overview);

    // Auto-execute if in autonomous mode
    if (this.config.mode === 'autonomous' || this.config.mode === 'hybrid') {
      await this.autoExecuteRecommendations();
    }

    this.emit('analysis_complete', overview);
    logger.info('Global analysis complete', {
      health: overallHealth,
      recommendations: pendingRecs.length
    });

    return overview;
  }

  private getMetricFromStates(states: SystemState[], domain: string, metric: string, defaultValue: any): any {
    const domainState = states.find(s => s.domain === domain);
    return domainState?.metrics?.[metric] ?? defaultValue;
  }

  private calculateGlobalRiskScore(states: SystemState[]): number {
    const riskState = states.find(s => s.domain === 'risk');
    if (riskState?.metrics?.globalRiskScore !== undefined) {
      return riskState.metrics.globalRiskScore;
    }

    // Calculate from multiple factors
    let riskScore = 50; // Base

    // System health impacts risk
    const avgHealth = states.reduce((sum, s) => sum + s.health, 0) / (states.length || 1);
    riskScore += (100 - avgHealth) * 0.2;

    // Alerts impact risk
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
    riskScore += criticalAlerts * 10;

    return Math.min(100, Math.max(0, riskScore));
  }

  private extractDomainMetrics(domain: SystemDomain, states: SystemState[]): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const state of states) {
      for (const [key, value] of Object.entries(state.metrics || {})) {
        metrics[`${state.name}_${key}`] = value;
      }
    }

    return metrics;
  }

  private identifyDomainOpportunities(domain: SystemDomain, states: SystemState[]): string[] {
    const opportunities: string[] = [];

    switch (domain) {
      case 'capital':
        // Check for idle capital
        for (const state of states) {
          if (state.metrics?.idleCapital > 1000) {
            opportunities.push(`$${state.metrics.idleCapital.toFixed(0)} idle capital could be allocated`);
          }
        }
        break;

      case 'yield':
        // Check for yield improvement opportunities
        for (const state of states) {
          if (state.metrics?.yieldImprovement > 0.5) {
            opportunities.push(`Potential ${state.metrics.yieldImprovement.toFixed(1)}% yield improvement available`);
          }
        }
        break;

      case 'alpha':
        // Check for bot opportunities
        for (const state of states) {
          if (state.metrics?.highConfidenceSignals > 0) {
            opportunities.push(`${state.metrics.highConfidenceSignals} high-confidence signals pending`);
          }
        }
        break;
    }

    return opportunities;
  }

  // ===========================================================================
  // RECOMMENDATION ENGINE
  // ===========================================================================

  private async generateRecommendations(overview: GlobalOverview): Promise<void> {
    // Check for capital inefficiency
    if (overview.totalCapital > 0) {
      const utilizationRate = overview.totalAllocated / overview.totalCapital;
      if (utilizationRate < 0.5) {
        this.addRecommendation({
          type: 'capital_allocation',
          domain: 'capital',
          urgency: 'normal',
          action: {
            description: 'Increase capital utilization - significant idle capital detected',
            targetSystems: ['CapitalConductor', 'YieldOrchestrator'],
            parameters: {
              idleCapital: overview.totalCapital - overview.totalAllocated,
              suggestedAllocation: 'yield_optimization'
            },
            expectedImpact: {
              riskChange: 5,
              returnChange: 15,
              capitalEfficiency: utilizationRate + 0.2,
              confidence: 75
            }
          },
          reasoning: {
            summary: `Only ${(utilizationRate * 100).toFixed(0)}% of capital is allocated. Consider deploying idle funds.`,
            factors: [
              { factor: 'utilization_rate', weight: 0.4, value: utilizationRate },
              { factor: 'market_regime', weight: 0.3, value: overview.marketRegime },
              { factor: 'risk_score', weight: 0.3, value: overview.globalRiskScore }
            ],
            supportingData: { totalCapital: overview.totalCapital, allocated: overview.totalAllocated },
            alternatives: [
              { action: 'Keep idle', reason_rejected: 'Opportunity cost of unproductive capital' }
            ]
          }
        });
      }
    }

    // Check for elevated risk
    if (overview.globalRiskScore > 75) {
      this.addRecommendation({
        type: 'risk_adjustment',
        domain: 'risk',
        urgency: overview.globalRiskScore > 90 ? 'immediate' : 'urgent',
        action: {
          description: 'Reduce risk exposure - global risk score is elevated',
          targetSystems: ['RiskEngine', 'PortfolioBrain', 'BotManager'],
          parameters: {
            currentRiskScore: overview.globalRiskScore,
            targetRiskScore: 60,
            suggestedActions: ['reduce_position_sizes', 'add_hedges', 'pause_aggressive_bots']
          },
          expectedImpact: {
            riskChange: -25,
            returnChange: -10,
            capitalEfficiency: 0.85,
            confidence: 85
          }
        },
        reasoning: {
          summary: `Global risk score is ${overview.globalRiskScore}. Recommend reducing exposure.`,
          factors: [
            { factor: 'global_risk', weight: 0.5, value: overview.globalRiskScore },
            { factor: 'critical_alerts', weight: 0.3, value: overview.criticalAlerts },
            { factor: 'system_health', weight: 0.2, value: overview.overallHealth }
          ],
          supportingData: { riskScore: overview.globalRiskScore, alerts: overview.criticalAlerts },
          alternatives: [
            { action: 'Maintain current exposure', reason_rejected: 'Risk of significant drawdown' }
          ]
        }
      });
    }

    // Check for system health issues
    if (overview.overallHealth < 70) {
      this.addRecommendation({
        type: 'system_configuration',
        domain: 'all',
        urgency: overview.overallHealth < 50 ? 'urgent' : 'normal',
        action: {
          description: 'Address system health issues - multiple systems degraded',
          targetSystems: ['all'],
          parameters: {
            healthScore: overview.overallHealth,
            systemsOffline: overview.systemsOffline,
            systemsDegraded: overview.systemsDegraded
          },
          expectedImpact: {
            riskChange: -10,
            returnChange: 5,
            capitalEfficiency: 1.0,
            confidence: 90
          }
        },
        reasoning: {
          summary: `System health is ${overview.overallHealth.toFixed(0)}%. ${overview.systemsOffline} systems offline, ${overview.systemsDegraded} degraded.`,
          factors: [
            { factor: 'health_score', weight: 0.5, value: overview.overallHealth },
            { factor: 'offline_systems', weight: 0.3, value: overview.systemsOffline },
            { factor: 'degraded_systems', weight: 0.2, value: overview.systemsDegraded }
          ],
          supportingData: { health: overview.overallHealth },
          alternatives: []
        }
      });
    }
  }

  public addRecommendation(rec: Omit<GlobalRecommendation, 'id' | 'timestamp' | 'status'>): GlobalRecommendation {
    const recommendation: GlobalRecommendation = {
      ...rec,
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      status: 'pending'
    };

    this.recommendations.set(recommendation.id, recommendation);
    this.emit('recommendation_added', recommendation);

    logger.info('Recommendation added', {
      id: recommendation.id,
      type: recommendation.type,
      urgency: recommendation.urgency
    });

    return recommendation;
  }

  public async approveRecommendation(id: string, approvedBy: string = 'user'): Promise<boolean> {
    const rec = this.recommendations.get(id);
    if (!rec || rec.status !== 'pending') {
      return false;
    }

    rec.status = 'approved';
    rec.approvedBy = approvedBy;
    rec.approvedAt = new Date();

    // Execute the recommendation
    const result = await this.executeRecommendation(rec);

    rec.executedAt = new Date();
    rec.result = result;

    this.emit('recommendation_approved', rec);
    return result.success;
  }

  public rejectRecommendation(id: string, reason?: string): boolean {
    const rec = this.recommendations.get(id);
    if (!rec || rec.status !== 'pending') {
      return false;
    }

    rec.status = 'rejected';
    rec.result = {
      success: false,
      actualImpact: {},
      notes: reason || 'Rejected by user'
    };

    this.emit('recommendation_rejected', rec);
    return true;
  }

  private async autoExecuteRecommendations(): Promise<void> {
    const pendingRecs = Array.from(this.recommendations.values())
      .filter(r => r.status === 'pending');

    for (const rec of pendingRecs) {
      // Only auto-execute high-confidence, non-critical recommendations
      if (rec.action.expectedImpact.confidence >= this.config.autoExecuteThreshold &&
          rec.urgency !== 'immediate') {

        logger.info('Auto-executing recommendation', { id: rec.id, type: rec.type });

        rec.status = 'auto_executed';
        rec.approvedBy = 'MetaBrain:Auto';
        rec.approvedAt = new Date();

        const result = await this.executeRecommendation(rec);
        rec.executedAt = new Date();
        rec.result = result;

        this.emit('recommendation_auto_executed', rec);
      }
    }
  }

  private async executeRecommendation(rec: GlobalRecommendation): Promise<{ success: boolean; actualImpact: Record<string, any>; notes: string }> {
    logger.info('Executing recommendation', { id: rec.id, type: rec.type });

    // This is where we would call the actual system APIs
    // For now, we emit an event for the target systems to handle

    this.emit('execute_recommendation', {
      recommendation: rec,
      targetSystems: rec.action.targetSystems,
      parameters: rec.action.parameters
    });

    // In a real implementation, we would await responses from target systems
    // For now, return success
    return {
      success: true,
      actualImpact: rec.action.expectedImpact,
      notes: 'Recommendation dispatched to target systems'
    };
  }

  public getRecommendations(filter?: { status?: string; domain?: SystemDomain; urgency?: DecisionUrgency }): GlobalRecommendation[] {
    let recs = Array.from(this.recommendations.values());

    if (filter?.status) {
      recs = recs.filter(r => r.status === filter.status);
    }
    if (filter?.domain) {
      recs = recs.filter(r => r.domain === filter.domain);
    }
    if (filter?.urgency) {
      recs = recs.filter(r => r.urgency === filter.urgency);
    }

    return recs.sort((a, b) => {
      // Sort by urgency first, then by timestamp
      const urgencyOrder = { immediate: 0, urgent: 1, normal: 2, low: 3, background: 4 };
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  // ===========================================================================
  // ALERT MANAGEMENT
  // ===========================================================================

  private addAlert(alert: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged'>): SystemAlert {
    const newAlert: SystemAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(newAlert);
    this.emit('alert_added', newAlert);

    // Cleanup old alerts
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.alertRetention);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff || !a.acknowledged);

    return newAlert;
  }

  public acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  public getAlerts(filter?: { domain?: SystemDomain; severity?: string; acknowledged?: boolean }): SystemAlert[] {
    let filtered = [...this.alerts];

    if (filter?.domain) {
      filtered = filtered.filter(a => a.domain === filter.domain);
    }
    if (filter?.severity) {
      filtered = filtered.filter(a => a.severity === filter.severity);
    }
    if (filter?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === filter.acknowledged);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  public start(): void {
    if (this.analysisLoop) {
      return;
    }

    logger.info('Starting MetaBrain analysis loop');

    // Run initial analysis
    this.performGlobalAnalysis().catch(err => {
      logger.error('Initial analysis failed', { error: err });
    });

    // Schedule periodic analysis
    this.analysisLoop = setInterval(() => {
      this.performGlobalAnalysis().catch(err => {
        logger.error('Periodic analysis failed', { error: err });
      });
    }, this.config.analysisInterval * 1000);

    this.emit('started');
  }

  public stop(): void {
    if (this.analysisLoop) {
      clearInterval(this.analysisLoop);
      this.analysisLoop = null;
      logger.info('MetaBrain analysis loop stopped');
      this.emit('stopped');
    }
  }

  public getOverview(): GlobalOverview | null {
    return this.lastOverview;
  }

  public getConfig(): MetaBrainConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<MetaBrainConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config_updated', this.config);
    logger.info('MetaBrain config updated');
  }

  public getHealth(): { status: string; health: number; details: Record<string, any> } {
    const overview = this.lastOverview;

    return {
      status: this.analysisLoop ? 'running' : 'stopped',
      health: overview?.overallHealth ?? 100,
      details: {
        mode: this.config.mode,
        systemsTracked: this.systemStates.size,
        pendingRecommendations: this.recommendations.size,
        activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
        lastAnalysis: overview?.timestamp
      }
    };
  }
}

// Export singleton
export const metaBrain = MetaBrainEngine.getInstance();

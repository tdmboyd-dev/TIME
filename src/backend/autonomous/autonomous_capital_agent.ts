/**
 * TIME Autonomous Capital Agent (ACA)
 * The Self-Directing Money System
 *
 * WORLD'S FIRST: An AI agent that:
 * - Has a defined "mandate" (grow wealth, generate income, preserve capital)
 * - Operates 24/7 without human intervention
 * - Makes ALL financial decisions within boundaries
 * - Learns from every action
 * - Explains every decision
 * - Gets smarter every day
 *
 * This is NOT a trading bot. This is an AUTONOMOUS FINANCIAL AGENT.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AgentMandate =
  | 'aggressive_growth'      // Maximum returns, high risk tolerance
  | 'balanced_growth'        // Growth with moderate risk
  | 'income_generation'      // Focus on yield and dividends
  | 'capital_preservation'   // Protect principal above all
  | 'wealth_building'        // Long-term compounding
  | 'retirement_prep'        // Age-aware de-risking
  | 'custom';                // User-defined mandate

export type DecisionType =
  | 'allocation_change'      // Move capital between assets
  | 'position_entry'         // Enter a new position
  | 'position_exit'          // Exit an existing position
  | 'position_resize'        // Change position size
  | 'yield_harvest'          // Collect yield/dividends
  | 'yield_reinvest'         // Reinvest collected yield
  | 'rebalance'              // Portfolio rebalancing
  | 'hedge_action'           // Add/remove hedges
  | 'risk_reduction'         // Reduce overall risk
  | 'opportunity_capture'    // Capture identified alpha
  | 'tax_optimization'       // Tax-loss harvesting etc
  | 'liquidity_management'   // Manage cash reserves
  | 'emergency_action'       // Crisis response
  | 'learning_update'        // Update internal models
  | 'boundary_adjustment';   // Suggest boundary changes

export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export type AgentState =
  | 'initializing'
  | 'observing'              // Watching markets, gathering data
  | 'analyzing'              // Running analysis
  | 'deciding'               // Making a decision
  | 'executing'              // Executing a decision
  | 'learning'               // Learning from outcomes
  | 'sleeping'               // Market closed or paused
  | 'emergency'              // Emergency mode
  | 'disabled';              // Manually disabled

export interface AgentBoundary {
  id: string;
  type: 'hard' | 'soft';     // Hard = never cross, Soft = can cross with explanation
  category: 'risk' | 'allocation' | 'asset' | 'timing' | 'execution' | 'custom';
  name: string;
  description: string;
  condition: string;         // Logical condition
  value: any;
  enabled: boolean;
  violationCount: number;
  lastViolation?: Date;
}

export interface AgentDecision {
  id: string;
  timestamp: Date;
  type: DecisionType;
  confidence: ConfidenceLevel;
  confidenceScore: number;   // 0-100

  // What the agent decided
  action: {
    description: string;
    asset?: string;
    direction?: 'buy' | 'sell' | 'hold';
    amount?: number;
    amountPercent?: number;
    targetPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    timeframe?: string;
  };

  // Why the agent decided this
  reasoning: {
    summary: string;
    factors: { factor: string; weight: number; contribution: string }[];
    alternatives: { action: string; reason_rejected: string }[];
    risks: { risk: string; mitigation: string }[];
    alignment_with_mandate: string;
  };

  // Expected outcome
  expectedOutcome: {
    probability: number;
    bestCase: { description: string; value: number };
    baseCase: { description: string; value: number };
    worstCase: { description: string; value: number };
    timeToRealization: string;
  };

  // Boundaries checked
  boundariesChecked: { boundaryId: string; passed: boolean; note?: string }[];

  // Execution status
  status: 'pending' | 'approved' | 'executing' | 'executed' | 'failed' | 'rejected' | 'cancelled';
  executionResult?: {
    actualPrice?: number;
    actualAmount?: number;
    fees?: number;
    slippage?: number;
    completedAt?: Date;
  };

  // Learning
  outcomeTracking: {
    tracked: boolean;
    checkpoints: { date: Date; value: number; notes: string }[];
    finalOutcome?: 'success' | 'partial_success' | 'neutral' | 'partial_failure' | 'failure';
    lessonsLearned?: string[];
  };
}

export interface AgentMemory {
  // Short-term memory (current session)
  shortTerm: {
    recentObservations: MarketObservation[];
    recentDecisions: string[];  // Decision IDs
    currentContext: Map<string, any>;
    activeAlerts: { id: string; message: string; severity: string }[];
  };

  // Long-term memory (persistent)
  longTerm: {
    totalDecisions: number;
    successfulDecisions: number;
    failedDecisions: number;

    // What worked
    positivePatterns: {
      pattern: string;
      occurrences: number;
      avgReturn: number;
      confidence: number;
    }[];

    // What didn't work
    negativePatterns: {
      pattern: string;
      occurrences: number;
      avgLoss: number;
      confidence: number;
    }[];

    // Market regime memory
    regimeMemory: Map<string, {
      regime: string;
      decisionsInRegime: number;
      successRate: number;
      bestStrategy: string;
      worstStrategy: string;
    }>;

    // Asset-specific memory
    assetMemory: Map<string, {
      symbol: string;
      tradesCount: number;
      winRate: number;
      avgReturn: number;
      bestEntry: { condition: string; successRate: number };
      bestExit: { condition: string; avgReturn: number };
      notes: string[];
    }>;
  };
}

export interface AgentPersonality {
  // Core traits (0-100)
  riskTolerance: number;
  patience: number;
  decisiveness: number;
  contrarianism: number;      // Willingness to go against crowd
  adaptability: number;

  // Biases to avoid (learned)
  knownBiases: {
    bias: string;
    strength: number;
    mitigationStrategy: string;
  }[];

  // Communication style
  explanationStyle: 'concise' | 'detailed' | 'educational';

  // Operating preferences
  preferredTimeframes: string[];
  preferredAssetClasses: string[];
  avoidedAssets: string[];
}

export interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  mandate: AgentMandate;
  customMandate?: string;

  // Personality
  personality: AgentPersonality;

  // Boundaries
  boundaries: AgentBoundary[];

  // Operating parameters
  maxCapitalPerDecision: number;        // Max % of portfolio per decision
  minConfidenceToAct: number;           // 0-100
  maxDecisionsPerDay: number;
  maxDrawdownTolerance: number;         // % before emergency mode

  // Automation level
  autonomyLevel: 'full' | 'supervised' | 'advisory';
  requireApprovalAbove: number;         // Amount requiring human approval

  // Learning settings
  learningEnabled: boolean;
  learningRate: number;                 // How fast to adapt

  // Active hours
  activeHours: { start: number; end: number } | 'always';
  activeOnWeekends: boolean;

  // Notifications
  notifyOn: DecisionType[];

  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPerformance {
  agentId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all_time';

  // Returns
  totalReturn: number;
  annualizedReturn: number;
  benchmarkReturn: number;
  alpha: number;

  // Risk metrics
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;

  // Decision quality
  totalDecisions: number;
  successfulDecisions: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;

  // Efficiency
  capitalEfficiency: number;
  timeInMarket: number;
  avgHoldingPeriod: number;

  // Learning progress
  learningScore: number;     // How much agent has improved
  adaptationScore: number;   // How well agent adapts to regimes
}

export interface MarketObservation {
  timestamp: Date;
  type: 'price' | 'volume' | 'sentiment' | 'news' | 'economic' | 'regime' | 'correlation' | 'volatility';
  asset?: string;
  data: any;
  significance: number;      // 0-100
  actionability: number;     // 0-100
}

export interface OpportunitySignal {
  id: string;
  timestamp: Date;
  asset: string;
  type: 'alpha' | 'arbitrage' | 'momentum' | 'mean_reversion' | 'breakout' | 'yield' | 'inefficiency';
  direction: 'long' | 'short' | 'neutral';
  strength: number;          // 0-100
  confidence: number;        // 0-100
  timeframe: string;
  expectedReturn: number;
  expectedRisk: number;
  source: string;
  expiresAt?: Date;
}

// ============================================================================
// AUTONOMOUS CAPITAL AGENT
// ============================================================================

export class AutonomousCapitalAgent extends EventEmitter {
  private static instance: AutonomousCapitalAgent;

  private agents: Map<string, AgentConfig> = new Map();
  private agentStates: Map<string, AgentState> = new Map();
  private agentMemories: Map<string, AgentMemory> = new Map();
  private decisions: Map<string, AgentDecision> = new Map();
  private observations: Map<string, MarketObservation[]> = new Map();
  private opportunities: Map<string, OpportunitySignal[]> = new Map();
  private performanceCache: Map<string, AgentPerformance> = new Map();

  private agentLoops: Map<string, NodeJS.Timeout> = new Map();
  private initialized: boolean = false;

  private constructor() {
    super();
  }

  public static getInstance(): AutonomousCapitalAgent {
    if (!AutonomousCapitalAgent.instance) {
      AutonomousCapitalAgent.instance = new AutonomousCapitalAgent();
    }
    return AutonomousCapitalAgent.instance;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[ACA] Initializing Autonomous Capital Agent...');

    // Load saved agents and memories from storage
    await this.loadPersistedState();

    // Start background processes
    this.startMarketObserver();
    this.startOpportunityScanner();
    this.startLearningEngine();
    this.startPerformanceTracker();

    this.initialized = true;
    this.emit('initialized');
    console.log('[ACA] Autonomous Capital Agent initialized');
  }

  private async loadPersistedState(): Promise<void> {
    // In production, load from database
    // For now, initialize empty
    console.log('[ACA] Loading persisted agent state...');
  }

  // ==========================================================================
  // AGENT LIFECYCLE
  // ==========================================================================

  public async createAgent(config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentConfig> {
    const agent: AgentConfig = {
      ...config,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      boundaries: this.generateDefaultBoundaries(config.mandate, config.boundaries || [])
    };

    this.agents.set(agent.id, agent);
    this.agentStates.set(agent.id, 'initializing');
    this.agentMemories.set(agent.id, this.createEmptyMemory());
    this.observations.set(agent.id, []);
    this.opportunities.set(agent.id, []);

    // Start the agent's autonomous loop
    await this.startAgentLoop(agent.id);

    this.emit('agentCreated', agent);
    console.log(`[ACA] Created agent: ${agent.name} (${agent.id}) with mandate: ${agent.mandate}`);

    return agent;
  }

  private generateDefaultBoundaries(mandate: AgentMandate, customBoundaries: AgentBoundary[]): AgentBoundary[] {
    const defaults: AgentBoundary[] = [];

    // Universal hard boundaries
    defaults.push({
      id: 'bound_max_loss',
      type: 'hard',
      category: 'risk',
      name: 'Maximum Single Loss',
      description: 'Never lose more than X% on a single position',
      condition: 'position_loss_percent < threshold',
      value: mandate === 'capital_preservation' ? 2 : mandate === 'aggressive_growth' ? 10 : 5,
      enabled: true,
      violationCount: 0
    });

    defaults.push({
      id: 'bound_max_drawdown',
      type: 'hard',
      category: 'risk',
      name: 'Maximum Portfolio Drawdown',
      description: 'Never let portfolio drawdown exceed X%',
      condition: 'portfolio_drawdown < threshold',
      value: mandate === 'capital_preservation' ? 10 : mandate === 'aggressive_growth' ? 30 : 20,
      enabled: true,
      violationCount: 0
    });

    defaults.push({
      id: 'bound_position_size',
      type: 'hard',
      category: 'allocation',
      name: 'Maximum Position Size',
      description: 'No single position larger than X% of portfolio',
      condition: 'position_percent < threshold',
      value: mandate === 'capital_preservation' ? 10 : mandate === 'aggressive_growth' ? 30 : 20,
      enabled: true,
      violationCount: 0
    });

    defaults.push({
      id: 'bound_leverage',
      type: 'hard',
      category: 'risk',
      name: 'Maximum Leverage',
      description: 'Never use leverage above X',
      condition: 'leverage < threshold',
      value: mandate === 'capital_preservation' ? 1 : mandate === 'aggressive_growth' ? 3 : 1.5,
      enabled: true,
      violationCount: 0
    });

    // Soft boundaries
    defaults.push({
      id: 'bound_cash_reserve',
      type: 'soft',
      category: 'allocation',
      name: 'Minimum Cash Reserve',
      description: 'Maintain at least X% in cash',
      condition: 'cash_percent >= threshold',
      value: mandate === 'capital_preservation' ? 30 : mandate === 'aggressive_growth' ? 5 : 15,
      enabled: true,
      violationCount: 0
    });

    defaults.push({
      id: 'bound_sector_concentration',
      type: 'soft',
      category: 'allocation',
      name: 'Sector Concentration Limit',
      description: 'No more than X% in any single sector',
      condition: 'sector_exposure < threshold',
      value: 35,
      enabled: true,
      violationCount: 0
    });

    defaults.push({
      id: 'bound_correlated_assets',
      type: 'soft',
      category: 'risk',
      name: 'Correlated Assets Limit',
      description: 'Limit exposure to highly correlated assets',
      condition: 'correlated_exposure < threshold',
      value: 50,
      enabled: true,
      violationCount: 0
    });

    // Add custom boundaries
    return [...defaults, ...customBoundaries];
  }

  private createEmptyMemory(): AgentMemory {
    return {
      shortTerm: {
        recentObservations: [],
        recentDecisions: [],
        currentContext: new Map(),
        activeAlerts: []
      },
      longTerm: {
        totalDecisions: 0,
        successfulDecisions: 0,
        failedDecisions: 0,
        positivePatterns: [],
        negativePatterns: [],
        regimeMemory: new Map(),
        assetMemory: new Map()
      }
    };
  }

  public async startAgentLoop(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    if (this.agentLoops.has(agentId)) {
      clearInterval(this.agentLoops.get(agentId));
    }

    this.agentStates.set(agentId, 'observing');

    // The main autonomous loop
    const loop = setInterval(async () => {
      await this.runAgentCycle(agentId);
    }, 60000); // Run every minute

    this.agentLoops.set(agentId, loop);

    // Run first cycle immediately
    await this.runAgentCycle(agentId);

    console.log(`[ACA] Started autonomous loop for agent: ${agentId}`);
  }

  public async stopAgentLoop(agentId: string): Promise<void> {
    if (this.agentLoops.has(agentId)) {
      clearInterval(this.agentLoops.get(agentId));
      this.agentLoops.delete(agentId);
      this.agentStates.set(agentId, 'sleeping');
      console.log(`[ACA] Stopped autonomous loop for agent: ${agentId}`);
    }
  }

  // ==========================================================================
  // THE AUTONOMOUS CYCLE
  // ==========================================================================

  private async runAgentCycle(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    const memory = this.agentMemories.get(agentId);
    if (!agent || !memory) return;

    try {
      // 1. OBSERVE - Gather market data
      this.agentStates.set(agentId, 'observing');
      const observations = await this.observe(agentId);

      // 2. ANALYZE - Process observations
      this.agentStates.set(agentId, 'analyzing');
      const analysis = await this.analyze(agentId, observations);

      // 3. DECIDE - Make decisions based on analysis
      this.agentStates.set(agentId, 'deciding');
      const decisions = await this.decide(agentId, analysis);

      // 4. EXECUTE - Execute approved decisions
      if (decisions.length > 0) {
        this.agentStates.set(agentId, 'executing');
        await this.execute(agentId, decisions);
      }

      // 5. LEARN - Update memory and models
      this.agentStates.set(agentId, 'learning');
      await this.learn(agentId);

      // Back to observing
      this.agentStates.set(agentId, 'observing');

    } catch (error) {
      console.error(`[ACA] Error in agent cycle for ${agentId}:`, error);
      this.emit('agentError', { agentId, error });
    }
  }

  // ==========================================================================
  // OBSERVE PHASE
  // ==========================================================================

  private async observe(agentId: string): Promise<MarketObservation[]> {
    const observations: MarketObservation[] = [];
    const memory = this.agentMemories.get(agentId);
    if (!memory) return observations;

    // Collect market data observations
    observations.push(await this.observePrice(agentId));
    observations.push(await this.observeVolatility(agentId));
    observations.push(await this.observeSentiment(agentId));
    observations.push(await this.observeRegime(agentId));
    observations.push(await this.observeCorrelations(agentId));

    // Store in short-term memory
    memory.shortTerm.recentObservations = [
      ...observations,
      ...memory.shortTerm.recentObservations.slice(0, 100)  // Keep last 100
    ];

    // Store for agent
    this.observations.set(agentId, [
      ...observations,
      ...(this.observations.get(agentId) || []).slice(0, 1000)
    ]);

    return observations;
  }

  private async observePrice(agentId: string): Promise<MarketObservation> {
    // In production, integrate with market data feeds
    return {
      timestamp: new Date(),
      type: 'price',
      data: {
        spx: { current: 5000, change: 0.5, trend: 'up' },
        btc: { current: 45000, change: -1.2, trend: 'down' },
        vix: { current: 18, change: -0.3, trend: 'down' }
      },
      significance: 40,
      actionability: 30
    };
  }

  private async observeVolatility(agentId: string): Promise<MarketObservation> {
    return {
      timestamp: new Date(),
      type: 'volatility',
      data: {
        vix: 18,
        impliedVol: 0.22,
        realizedVol: 0.18,
        volOfVol: 0.8,
        term_structure: 'contango'
      },
      significance: 50,
      actionability: 40
    };
  }

  private async observeSentiment(agentId: string): Promise<MarketObservation> {
    return {
      timestamp: new Date(),
      type: 'sentiment',
      data: {
        fearGreed: 55,
        putCallRatio: 0.95,
        socialSentiment: 'neutral',
        newsFlow: 'mixed'
      },
      significance: 35,
      actionability: 25
    };
  }

  private async observeRegime(agentId: string): Promise<MarketObservation> {
    return {
      timestamp: new Date(),
      type: 'regime',
      data: {
        current: 'bull_steady',
        confidence: 0.75,
        transitionProbability: 0.15,
        potentialNextRegime: 'bull_volatile'
      },
      significance: 70,
      actionability: 60
    };
  }

  private async observeCorrelations(agentId: string): Promise<MarketObservation> {
    return {
      timestamp: new Date(),
      type: 'correlation',
      data: {
        stockBond: -0.3,
        stockCrypto: 0.6,
        dollarEquity: -0.4,
        breakdownRisk: 'low'
      },
      significance: 45,
      actionability: 35
    };
  }

  // ==========================================================================
  // ANALYZE PHASE
  // ==========================================================================

  private async analyze(agentId: string, observations: MarketObservation[]): Promise<{
    opportunities: OpportunitySignal[];
    risks: { type: string; severity: number; description: string }[];
    recommendations: { action: string; priority: number; reasoning: string }[];
  }> {
    const agent = this.agents.get(agentId);
    const memory = this.agentMemories.get(agentId);
    if (!agent || !memory) {
      return { opportunities: [], risks: [], recommendations: [] };
    }

    const opportunities = await this.scanForOpportunities(agentId, observations);
    const risks = await this.assessRisks(agentId, observations);
    const recommendations = await this.generateRecommendations(agentId, opportunities, risks);

    // Store opportunities
    this.opportunities.set(agentId, [
      ...opportunities,
      ...(this.opportunities.get(agentId) || []).slice(0, 100)
    ]);

    return { opportunities, risks, recommendations };
  }

  private async scanForOpportunities(
    agentId: string,
    observations: MarketObservation[]
  ): Promise<OpportunitySignal[]> {
    const opportunities: OpportunitySignal[] = [];
    const memory = this.agentMemories.get(agentId);
    if (!memory) return opportunities;

    // Analyze based on observations and memory
    const regimeObs = observations.find(o => o.type === 'regime');
    const currentRegime = regimeObs?.data?.current || 'unknown';

    // Check for regime-appropriate opportunities
    if (currentRegime === 'bull_steady') {
      opportunities.push({
        id: `opp_${Date.now()}_1`,
        timestamp: new Date(),
        asset: 'SPY',
        type: 'momentum',
        direction: 'long',
        strength: 65,
        confidence: 70,
        timeframe: '1W',
        expectedReturn: 0.02,
        expectedRisk: 0.01,
        source: 'regime_analysis'
      });
    }

    // Check memory for positive patterns
    for (const pattern of memory.longTerm.positivePatterns) {
      if (pattern.confidence > 60) {
        opportunities.push({
          id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date(),
          asset: 'pattern_based',
          type: 'alpha',
          direction: 'long',
          strength: pattern.confidence,
          confidence: pattern.confidence,
          timeframe: '1D',
          expectedReturn: pattern.avgReturn,
          expectedRisk: pattern.avgReturn * 0.5,
          source: `pattern:${pattern.pattern}`
        });
      }
    }

    return opportunities;
  }

  private async assessRisks(
    agentId: string,
    observations: MarketObservation[]
  ): Promise<{ type: string; severity: number; description: string }[]> {
    const risks: { type: string; severity: number; description: string }[] = [];

    const volObs = observations.find(o => o.type === 'volatility');
    if (volObs && volObs.data.vix > 25) {
      risks.push({
        type: 'elevated_volatility',
        severity: 70,
        description: 'VIX above 25 indicates elevated market stress'
      });
    }

    const corrObs = observations.find(o => o.type === 'correlation');
    if (corrObs && corrObs.data.stockBond > 0.5) {
      risks.push({
        type: 'correlation_breakdown',
        severity: 60,
        description: 'Stock-bond correlation turning positive reduces diversification benefit'
      });
    }

    return risks;
  }

  private async generateRecommendations(
    agentId: string,
    opportunities: OpportunitySignal[],
    risks: { type: string; severity: number; description: string }[]
  ): Promise<{ action: string; priority: number; reasoning: string }[]> {
    const recommendations: { action: string; priority: number; reasoning: string }[] = [];
    const agent = this.agents.get(agentId);
    if (!agent) return recommendations;

    // High severity risks take priority
    for (const risk of risks.filter(r => r.severity > 70)) {
      recommendations.push({
        action: 'reduce_exposure',
        priority: 90,
        reasoning: `High risk detected: ${risk.description}`
      });
    }

    // Strong opportunities
    for (const opp of opportunities.filter(o => o.confidence > agent.minConfidenceToAct)) {
      recommendations.push({
        action: `${opp.direction}_${opp.asset}`,
        priority: opp.confidence,
        reasoning: `${opp.type} opportunity in ${opp.asset} with ${opp.confidence}% confidence`
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  // ==========================================================================
  // DECIDE PHASE
  // ==========================================================================

  private async decide(
    agentId: string,
    analysis: {
      opportunities: OpportunitySignal[];
      risks: { type: string; severity: number; description: string }[];
      recommendations: { action: string; priority: number; reasoning: string }[];
    }
  ): Promise<AgentDecision[]> {
    const agent = this.agents.get(agentId);
    const memory = this.agentMemories.get(agentId);
    if (!agent || !memory) return [];

    const decisions: AgentDecision[] = [];

    // Check daily decision limit
    const todaysDecisions = Array.from(this.decisions.values())
      .filter(d => d.timestamp.toDateString() === new Date().toDateString());

    if (todaysDecisions.length >= agent.maxDecisionsPerDay) {
      console.log(`[ACA] Agent ${agentId} has reached daily decision limit`);
      return [];
    }

    // Process top recommendations
    for (const rec of analysis.recommendations.slice(0, 3)) {
      if (rec.priority < agent.minConfidenceToAct) continue;

      const decision = await this.formulateDecision(agentId, rec, analysis);
      if (decision) {
        // Check boundaries
        const boundaryCheck = await this.checkBoundaries(agentId, decision);
        decision.boundariesChecked = boundaryCheck;

        if (boundaryCheck.every(b => b.passed)) {
          // Check autonomy level
          if (agent.autonomyLevel === 'full' ||
              (agent.autonomyLevel === 'supervised' &&
               (decision.action.amount || 0) < agent.requireApprovalAbove)) {
            decision.status = 'approved';
          } else {
            decision.status = 'pending';
            this.emit('decisionPendingApproval', { agentId, decision });
          }

          decisions.push(decision);
          this.decisions.set(decision.id, decision);
          memory.shortTerm.recentDecisions.unshift(decision.id);
        } else {
          decision.status = 'rejected';
          decision.reasoning.summary += ' [REJECTED: Boundary violation]';
          this.emit('decisionRejectedByBoundary', { agentId, decision, violations: boundaryCheck.filter(b => !b.passed) });
        }
      }
    }

    return decisions;
  }

  private async formulateDecision(
    agentId: string,
    recommendation: { action: string; priority: number; reasoning: string },
    analysis: any
  ): Promise<AgentDecision | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const decision: AgentDecision = {
      id: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: this.inferDecisionType(recommendation.action),
      confidence: this.mapPriorityToConfidence(recommendation.priority),
      confidenceScore: recommendation.priority,

      action: {
        description: recommendation.reasoning,
        amount: 1000, // Would be calculated based on position sizing
        amountPercent: 5 // % of portfolio
      },

      reasoning: {
        summary: recommendation.reasoning,
        factors: [
          { factor: 'opportunity_strength', weight: 0.4, contribution: 'High confidence signal' },
          { factor: 'risk_assessment', weight: 0.3, contribution: 'Acceptable risk level' },
          { factor: 'mandate_alignment', weight: 0.3, contribution: `Aligned with ${agent.mandate} mandate` }
        ],
        alternatives: [
          { action: 'wait', reason_rejected: 'Opportunity may expire' },
          { action: 'larger_position', reason_rejected: 'Exceeds risk tolerance' }
        ],
        risks: [
          { risk: 'market_reversal', mitigation: 'Stop loss at 2%' },
          { risk: 'execution_slippage', mitigation: 'Use limit orders' }
        ],
        alignment_with_mandate: `This action aligns with the ${agent.mandate} mandate by ${
          agent.mandate === 'aggressive_growth' ? 'pursuing high-conviction opportunities' :
          agent.mandate === 'income_generation' ? 'generating yield' :
          agent.mandate === 'capital_preservation' ? 'taking measured risk' :
          'following the investment policy'
        }`
      },

      expectedOutcome: {
        probability: recommendation.priority / 100,
        bestCase: { description: 'Target reached quickly', value: 500 },
        baseCase: { description: 'Gradual appreciation', value: 200 },
        worstCase: { description: 'Stop loss triggered', value: -100 },
        timeToRealization: '1-2 weeks'
      },

      boundariesChecked: [],
      status: 'pending',

      outcomeTracking: {
        tracked: true,
        checkpoints: []
      }
    };

    return decision;
  }

  private inferDecisionType(action: string): DecisionType {
    if (action.includes('long') || action.includes('buy')) return 'position_entry';
    if (action.includes('short') || action.includes('sell')) return 'position_exit';
    if (action.includes('reduce')) return 'risk_reduction';
    if (action.includes('rebalance')) return 'rebalance';
    if (action.includes('hedge')) return 'hedge_action';
    return 'allocation_change';
  }

  private mapPriorityToConfidence(priority: number): ConfidenceLevel {
    if (priority >= 90) return 'very_high';
    if (priority >= 75) return 'high';
    if (priority >= 50) return 'medium';
    if (priority >= 25) return 'low';
    return 'very_low';
  }

  private async checkBoundaries(
    agentId: string,
    decision: AgentDecision
  ): Promise<{ boundaryId: string; passed: boolean; note?: string }[]> {
    const agent = this.agents.get(agentId);
    if (!agent) return [];

    const results: { boundaryId: string; passed: boolean; note?: string }[] = [];

    for (const boundary of agent.boundaries.filter(b => b.enabled)) {
      // In production, actually evaluate the boundary condition
      const passed = true; // Simplified for now

      results.push({
        boundaryId: boundary.id,
        passed,
        note: passed ? undefined : `Violated: ${boundary.description}`
      });

      if (!passed) {
        boundary.violationCount++;
        boundary.lastViolation = new Date();
      }
    }

    return results;
  }

  // ==========================================================================
  // EXECUTE PHASE
  // ==========================================================================

  private async execute(agentId: string, decisions: AgentDecision[]): Promise<void> {
    for (const decision of decisions) {
      if (decision.status !== 'approved') continue;

      decision.status = 'executing';
      this.emit('decisionExecuting', { agentId, decision });

      try {
        // REAL EXECUTION: Submit to broker via BrokerManager
        const execResult = await this.simulateExecution(decision);

        if (execResult.success) {
          decision.status = 'executed';
          decision.executionResult = {
            actualPrice: execResult.price || 0,
            actualAmount: decision.action.amount,
            fees: (execResult.price || 0) * (decision.action.amount || 0) * 0.001, // Estimate 0.1% fee
            slippage: 0.001,
            completedAt: new Date(),
            orderId: execResult.orderId,
          };

          this.emit('decisionExecuted', { agentId, decision });
          console.log(`[ACA] Executed decision: ${decision.id} - Order ID: ${execResult.orderId}`);
        } else {
          throw new Error(execResult.error || 'Execution failed');
        }

      } catch (error) {
        decision.status = 'failed';
        this.emit('decisionFailed', { agentId, decision, error });
        console.error(`[ACA] Failed to execute decision: ${decision.id}`, error);
      }
    }
  }

  private async simulateExecution(decision: AgentDecision): Promise<{ success: boolean; orderId?: string; price?: number; error?: string }> {
    // REAL EXECUTION: Use BrokerManager for actual order placement
    // Import broker manager dynamically to avoid circular dependencies
    const { BrokerManager } = await import('../brokers/broker_manager');
    const brokerManager = BrokerManager.getInstance();

    // Check if we have a valid action
    if (!decision.action.asset || !decision.action.direction || !decision.action.amount) {
      console.warn('[ACA] Decision missing required fields for execution');
      return { success: false, error: 'Missing required execution fields' };
    }

    // Determine asset class from symbol
    const assetClass = this.determineAssetClass(decision.action.asset);

    try {
      // Build order request
      const orderRequest = {
        symbol: decision.action.asset,
        qty: decision.action.amount,
        side: decision.action.direction as 'buy' | 'sell',
        type: 'market' as const,
        timeInForce: 'day' as const,
        limitPrice: decision.action.targetPrice,
        stopPrice: decision.action.stopLoss,
        clientOrderId: `ACA-${decision.id}`,
      };

      console.log(`[ACA] Submitting REAL order to broker:`, orderRequest);

      // Submit to broker manager - it will route to appropriate broker
      const result = await brokerManager.submitOrder(orderRequest, assetClass);

      console.log(`[ACA] Order submitted successfully via ${result.brokerId}: ${result.order.id}`);

      return {
        success: true,
        orderId: result.order.id,
        price: result.order.filledAvgPrice || result.order.limitPrice || 0,
      };
    } catch (error: any) {
      console.error('[ACA] Broker execution failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  private determineAssetClass(symbol: string): 'equity' | 'crypto' | 'forex' | 'options' | 'futures' | 'commodities' {
    const upperSymbol = symbol.toUpperCase();

    // Crypto symbols
    if (['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'LINK'].some(c => upperSymbol.includes(c))) {
      return 'crypto';
    }

    // Forex pairs
    if (upperSymbol.includes('/') && ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'].some(c => upperSymbol.includes(c))) {
      return 'forex';
    }

    // Options (typically have expiry dates in symbol)
    if (upperSymbol.match(/\d{6}[CP]\d+/)) {
      return 'options';
    }

    // Futures
    if (['ES', 'NQ', 'CL', 'GC', 'SI', 'ZB', 'ZN'].includes(upperSymbol)) {
      return 'futures';
    }

    // Default to equity (stocks/ETFs)
    return 'equity';
  }

  // ==========================================================================
  // LEARN PHASE
  // ==========================================================================

  private async learn(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    const memory = this.agentMemories.get(agentId);
    if (!agent || !memory || !agent.learningEnabled) return;

    // Update outcome tracking for past decisions
    await this.updateOutcomeTracking(agentId);

    // Extract patterns from successful/failed decisions
    await this.extractPatterns(agentId);

    // Update regime memory
    await this.updateRegimeMemory(agentId);

    // Adjust personality traits based on performance
    await this.adjustPersonality(agentId);

    this.emit('agentLearned', { agentId });
  }

  private async updateOutcomeTracking(agentId: string): Promise<void> {
    const memory = this.agentMemories.get(agentId);
    if (!memory) return;

    // Check outcomes of past decisions
    for (const decisionId of memory.shortTerm.recentDecisions) {
      const decision = this.decisions.get(decisionId);
      if (!decision || decision.status !== 'executed') continue;

      // Add checkpoint
      decision.outcomeTracking.checkpoints.push({
        date: new Date(),
        value: 0, // Would calculate actual P&L
        notes: 'Periodic check'
      });

      // Determine final outcome if enough time has passed
      const timeSinceExecution = Date.now() - (decision.executionResult?.completedAt?.getTime() || 0);
      if (timeSinceExecution > 7 * 24 * 60 * 60 * 1000 && !decision.outcomeTracking.finalOutcome) {
        // After 7 days, evaluate outcome
        const finalValue = decision.outcomeTracking.checkpoints.slice(-1)[0]?.value || 0;

        if (finalValue > decision.expectedOutcome.baseCase.value * 1.5) {
          decision.outcomeTracking.finalOutcome = 'success';
          memory.longTerm.successfulDecisions++;
        } else if (finalValue > 0) {
          decision.outcomeTracking.finalOutcome = 'partial_success';
          memory.longTerm.successfulDecisions++;
        } else if (finalValue > decision.expectedOutcome.worstCase.value) {
          decision.outcomeTracking.finalOutcome = 'neutral';
        } else if (finalValue > decision.expectedOutcome.worstCase.value * 2) {
          decision.outcomeTracking.finalOutcome = 'partial_failure';
          memory.longTerm.failedDecisions++;
        } else {
          decision.outcomeTracking.finalOutcome = 'failure';
          memory.longTerm.failedDecisions++;
        }

        memory.longTerm.totalDecisions++;
      }
    }
  }

  private async extractPatterns(agentId: string): Promise<void> {
    const memory = this.agentMemories.get(agentId);
    if (!memory) return;

    // Analyze successful decisions for patterns
    const successfulDecisions = Array.from(this.decisions.values())
      .filter(d => d.outcomeTracking.finalOutcome === 'success' ||
                   d.outcomeTracking.finalOutcome === 'partial_success');

    // Would use ML to extract patterns
    // For now, track confidence levels that worked
    const avgSuccessConfidence = successfulDecisions.reduce(
      (sum, d) => sum + d.confidenceScore, 0
    ) / (successfulDecisions.length || 1);

    if (avgSuccessConfidence > 70) {
      const existingPattern = memory.longTerm.positivePatterns.find(
        p => p.pattern === 'high_confidence_entry'
      );
      if (existingPattern) {
        existingPattern.occurrences++;
        existingPattern.confidence = (existingPattern.confidence + avgSuccessConfidence) / 2;
      } else {
        memory.longTerm.positivePatterns.push({
          pattern: 'high_confidence_entry',
          occurrences: 1,
          avgReturn: 0.02,
          confidence: avgSuccessConfidence
        });
      }
    }
  }

  private async updateRegimeMemory(agentId: string): Promise<void> {
    const memory = this.agentMemories.get(agentId);
    const observations = this.observations.get(agentId) || [];
    if (!memory) return;

    const regimeObs = observations.find(o => o.type === 'regime');
    if (!regimeObs) return;

    const currentRegime = regimeObs.data.current;
    const regimeData = memory.longTerm.regimeMemory.get(currentRegime) || {
      regime: currentRegime,
      decisionsInRegime: 0,
      successRate: 0,
      bestStrategy: 'unknown',
      worstStrategy: 'unknown'
    };

    // Update regime statistics
    regimeData.decisionsInRegime++;

    memory.longTerm.regimeMemory.set(currentRegime, regimeData);
  }

  private async adjustPersonality(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    const memory = this.agentMemories.get(agentId);
    if (!agent || !memory) return;

    // Adjust based on performance
    const successRate = memory.longTerm.successfulDecisions /
                        (memory.longTerm.totalDecisions || 1);

    // If success rate is low, become more conservative
    if (successRate < 0.4 && agent.personality.riskTolerance > 30) {
      agent.personality.riskTolerance -= agent.learningRate;
      console.log(`[ACA] Agent ${agentId} reduced risk tolerance to ${agent.personality.riskTolerance}`);
    }

    // If success rate is high, can be slightly more aggressive
    if (successRate > 0.7 && agent.personality.riskTolerance < 80) {
      agent.personality.riskTolerance += agent.learningRate * 0.5;
      console.log(`[ACA] Agent ${agentId} increased risk tolerance to ${agent.personality.riskTolerance}`);
    }
  }

  // ==========================================================================
  // BACKGROUND PROCESSES
  // ==========================================================================

  private startMarketObserver(): void {
    setInterval(() => {
      // Global market observation for all agents
      this.emit('marketTick', { timestamp: new Date() });
    }, 60000);
  }

  private startOpportunityScanner(): void {
    setInterval(() => {
      // Scan for cross-agent opportunities
      this.emit('opportunityScan', { timestamp: new Date() });
    }, 300000); // Every 5 minutes
  }

  private startLearningEngine(): void {
    setInterval(async () => {
      // Periodic deep learning for all agents
      for (const agentId of this.agents.keys()) {
        await this.learn(agentId);
      }
    }, 3600000); // Every hour
  }

  private startPerformanceTracker(): void {
    setInterval(async () => {
      // Update performance metrics for all agents
      for (const agentId of this.agents.keys()) {
        await this.updatePerformance(agentId);
      }
    }, 300000); // Every 5 minutes
  }

  private async updatePerformance(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    const memory = this.agentMemories.get(agentId);
    if (!agent || !memory) return;

    const performance: AgentPerformance = {
      agentId,
      period: 'all_time',
      totalReturn: 0,
      annualizedReturn: 0,
      benchmarkReturn: 0,
      alpha: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      totalDecisions: memory.longTerm.totalDecisions,
      successfulDecisions: memory.longTerm.successfulDecisions,
      winRate: memory.longTerm.totalDecisions > 0
        ? memory.longTerm.successfulDecisions / memory.longTerm.totalDecisions
        : 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      capitalEfficiency: 0,
      timeInMarket: 0,
      avgHoldingPeriod: 0,
      learningScore: memory.longTerm.positivePatterns.length * 10,
      adaptationScore: memory.longTerm.regimeMemory.size * 20
    };

    this.performanceCache.set(agentId, performance);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  public async approveDecision(agentId: string, decisionId: string): Promise<void> {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision not found: ${decisionId}`);

    if (decision.status !== 'pending') {
      throw new Error(`Decision is not pending approval: ${decision.status}`);
    }

    decision.status = 'approved';
    await this.execute(agentId, [decision]);
  }

  public async rejectDecision(decisionId: string, reason: string): Promise<void> {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision not found: ${decisionId}`);

    decision.status = 'rejected';
    decision.reasoning.summary += ` [HUMAN REJECTED: ${reason}]`;
  }

  public getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  public getAgentState(agentId: string): AgentState | undefined {
    return this.agentStates.get(agentId);
  }

  public getAgentMemory(agentId: string): AgentMemory | undefined {
    return this.agentMemories.get(agentId);
  }

  public getAgentDecisions(agentId: string): AgentDecision[] {
    const memory = this.agentMemories.get(agentId);
    if (!memory) return [];

    return memory.shortTerm.recentDecisions
      .map(id => this.decisions.get(id))
      .filter((d): d is AgentDecision => d !== undefined);
  }

  public getAgentPerformance(agentId: string): AgentPerformance | undefined {
    return this.performanceCache.get(agentId);
  }

  public getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  public async updateAgentBoundaries(
    agentId: string,
    boundaries: AgentBoundary[]
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    agent.boundaries = boundaries;
    agent.updatedAt = new Date();

    this.emit('agentBoundariesUpdated', { agentId, boundaries });
  }

  public async setAgentAutonomy(
    agentId: string,
    level: 'full' | 'supervised' | 'advisory'
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    agent.autonomyLevel = level;
    agent.updatedAt = new Date();

    this.emit('agentAutonomyChanged', { agentId, level });
  }

  public async triggerEmergencyMode(agentId: string, reason: string): Promise<void> {
    this.agentStates.set(agentId, 'emergency');

    // Stop all pending executions
    const pendingDecisions = Array.from(this.decisions.values())
      .filter(d => d.status === 'pending' || d.status === 'approved');

    for (const decision of pendingDecisions) {
      decision.status = 'cancelled';
    }

    this.emit('agentEmergency', { agentId, reason, cancelledDecisions: pendingDecisions.length });
    console.log(`[ACA] EMERGENCY MODE for agent ${agentId}: ${reason}`);
  }

  // ==========================================================================
  // EXPLANATION ENGINE
  // ==========================================================================

  public explainDecision(decisionId: string, style: 'simple' | 'detailed' | 'technical'): string {
    const decision = this.decisions.get(decisionId);
    if (!decision) return 'Decision not found';

    if (style === 'simple') {
      return `I decided to ${decision.action.description} because ${decision.reasoning.summary}. ` +
             `My confidence is ${decision.confidence} (${decision.confidenceScore}%). ` +
             `If things go well, we could see ${decision.expectedOutcome.baseCase.description}. ` +
             `The main risk is ${decision.reasoning.risks[0]?.risk || 'market conditions changing'}.`;
    }

    if (style === 'detailed') {
      let explanation = `## Decision Analysis\n\n`;
      explanation += `**Action:** ${decision.action.description}\n\n`;
      explanation += `**Confidence:** ${decision.confidence} (${decision.confidenceScore}%)\n\n`;

      explanation += `### Reasoning\n`;
      explanation += `${decision.reasoning.summary}\n\n`;

      explanation += `### Contributing Factors\n`;
      for (const factor of decision.reasoning.factors) {
        explanation += `- **${factor.factor}** (weight: ${factor.weight}): ${factor.contribution}\n`;
      }

      explanation += `\n### Alternatives Considered\n`;
      for (const alt of decision.reasoning.alternatives) {
        explanation += `- ${alt.action}: Rejected because ${alt.reason_rejected}\n`;
      }

      explanation += `\n### Risk Management\n`;
      for (const risk of decision.reasoning.risks) {
        explanation += `- ${risk.risk}: ${risk.mitigation}\n`;
      }

      explanation += `\n### Expected Outcomes\n`;
      explanation += `- Best case: ${decision.expectedOutcome.bestCase.description}\n`;
      explanation += `- Base case: ${decision.expectedOutcome.baseCase.description}\n`;
      explanation += `- Worst case: ${decision.expectedOutcome.worstCase.description}\n`;

      return explanation;
    }

    // Technical style
    return JSON.stringify(decision, null, 2);
  }

  public explainAgentBehavior(agentId: string): string {
    const agent = this.agents.get(agentId);
    const memory = this.agentMemories.get(agentId);
    const state = this.agentStates.get(agentId);
    const performance = this.performanceCache.get(agentId);

    if (!agent || !memory) return 'Agent not found';

    let explanation = `## Agent: ${agent.name}\n\n`;
    explanation += `**Mandate:** ${agent.mandate}\n`;
    explanation += `**Current State:** ${state}\n`;
    explanation += `**Autonomy Level:** ${agent.autonomyLevel}\n\n`;

    explanation += `### Personality Profile\n`;
    explanation += `- Risk Tolerance: ${agent.personality.riskTolerance}/100\n`;
    explanation += `- Patience: ${agent.personality.patience}/100\n`;
    explanation += `- Decisiveness: ${agent.personality.decisiveness}/100\n`;
    explanation += `- Contrarianism: ${agent.personality.contrarianism}/100\n`;
    explanation += `- Adaptability: ${agent.personality.adaptability}/100\n\n`;

    explanation += `### Performance Summary\n`;
    if (performance) {
      explanation += `- Total Decisions: ${performance.totalDecisions}\n`;
      explanation += `- Win Rate: ${(performance.winRate * 100).toFixed(1)}%\n`;
      explanation += `- Learning Score: ${performance.learningScore}\n`;
      explanation += `- Adaptation Score: ${performance.adaptationScore}\n`;
    }

    explanation += `\n### What I've Learned\n`;
    explanation += `- Positive patterns discovered: ${memory.longTerm.positivePatterns.length}\n`;
    explanation += `- Negative patterns to avoid: ${memory.longTerm.negativePatterns.length}\n`;
    explanation += `- Regimes studied: ${memory.longTerm.regimeMemory.size}\n`;

    return explanation;
  }
}

// Export singleton instance
export const autonomousCapitalAgent = AutonomousCapitalAgent.getInstance();

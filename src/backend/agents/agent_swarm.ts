/**
 * TIME Agent Swarm
 *
 * THE MULTI-AGENT COORDINATION SYSTEM
 *
 * Based on TradingAgents framework research (arXiv 2412.20138):
 * - Bull/Bear Analyst Agents assess market conditions
 * - Risk Management Agent monitors exposure
 * - Execution Agents synthesize insights
 * - Specialized agents for different domains
 *
 * Architecture:
 * - HUMAN acts as Strategy Architect (via UI or AI assistants like Continue.dev)
 * - Internal TIME agents are Execution Agents, responding to events
 * - Agents can operate in MANUAL (human approval) or AUTO mode
 * - Each agent has its own domain expertise and can propose/execute actions
 *
 * This creates an AI team that runs TIME 24/7.
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('AgentSwarm');

// =============================================================================
// TYPES
// =============================================================================

export type AgentRole =
  | 'alpha_hunter'        // Finds alpha opportunities
  | 'bull_analyst'        // Analyzes bullish scenarios
  | 'bear_analyst'        // Analyzes bearish scenarios
  | 'risk_guardian'       // Monitors and manages risk
  | 'yield_optimizer'     // Optimizes yield/income
  | 'execution_specialist'// Handles order execution
  | 'portfolio_manager'   // Manages portfolio allocation
  | 'research_analyst'    // Researches markets/assets
  | 'tax_strategist'      // Tax optimization
  | 'life_advisor'        // Life event financial planning
  | 'sentinel'            // System monitoring
  | 'coordinator';        // Coordinates other agents

export type AgentStatus =
  | 'idle'
  | 'analyzing'
  | 'proposing'
  | 'executing'
  | 'waiting_approval'
  | 'paused'
  | 'error';

export type ProposalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'auto_approved'
  | 'expired'
  | 'executed';

export type ProposalPriority =
  | 'critical'
  | 'high'
  | 'normal'
  | 'low';

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  description: string;
  status: AgentStatus;
  enabled: boolean;
  autonomyLevel: number;       // 0-100, how much it can act without approval
  confidence: number;          // Current confidence level 0-100
  lastActive: Date;

  // Capabilities
  capabilities: string[];
  domains: string[];           // Which system domains it can access

  // Performance tracking
  proposalCount: number;
  approvedCount: number;
  rejectedCount: number;
  executedCount: number;
  successRate: number;

  // Configuration
  config: Record<string, any>;
}

export interface AgentProposal {
  id: string;
  agentId: string;
  agentRole: AgentRole;
  timestamp: Date;
  expiresAt: Date;

  // What the agent proposes
  action: {
    type: string;
    description: string;
    targetSystem: string;
    parameters: Record<string, any>;
  };

  // Why
  reasoning: {
    summary: string;
    analysis: string;
    supportingData: Record<string, any>;
    confidence: number;
    risks: string[];
    alternatives: string[];
  };

  // Expected outcome
  expectedOutcome: {
    description: string;
    successProbability: number;
    potentialUpside: number;
    potentialDownside: number;
    timeframe: string;
  };

  // Status tracking
  status: ProposalStatus;
  priority: ProposalPriority;
  approvedBy?: string;
  approvedAt?: Date;
  executedAt?: Date;
  result?: {
    success: boolean;
    outcome: string;
    metrics: Record<string, any>;
  };
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string | 'broadcast';
  timestamp: Date;
  type: 'analysis' | 'alert' | 'request' | 'response' | 'vote' | 'consensus';
  content: {
    subject: string;
    body: string;
    data?: Record<string, any>;
    requiresResponse: boolean;
    deadline?: Date;
  };
  responses?: AgentMessage[];
}

export interface ConsensusVote {
  agentId: string;
  proposalId: string;
  vote: 'approve' | 'reject' | 'abstain';
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export interface SwarmState {
  mode: 'manual' | 'autonomous' | 'hybrid';
  activeAgents: number;
  totalAgents: number;
  pendingProposals: number;
  executingActions: number;
  consensusThreshold: number;
  lastActivity: Date;
}

// =============================================================================
// AGENT DEFINITIONS
// =============================================================================

const DEFAULT_AGENTS: Omit<Agent, 'id' | 'lastActive' | 'proposalCount' | 'approvedCount' | 'rejectedCount' | 'executedCount' | 'successRate'>[] = [
  {
    role: 'coordinator',
    name: 'Orchestrator Prime',
    description: 'Coordinates all agents and manages swarm consensus',
    status: 'idle',
    enabled: true,
    autonomyLevel: 90,
    confidence: 100,
    capabilities: ['coordinate', 'consensus', 'prioritize', 'delegate'],
    domains: ['all'],
    config: { consensusRequired: true }
  },
  {
    role: 'alpha_hunter',
    name: 'Alpha Scout',
    description: 'Continuously searches for trading opportunities with positive expected value',
    status: 'idle',
    enabled: true,
    autonomyLevel: 60,
    confidence: 75,
    capabilities: ['signal_analysis', 'opportunity_detection', 'alpha_scoring'],
    domains: ['alpha', 'research'],
    config: { minConfidence: 70, scanInterval: 60 }
  },
  {
    role: 'bull_analyst',
    name: 'Bull Advocate',
    description: 'Analyzes markets from bullish perspective, finds reasons to buy',
    status: 'idle',
    enabled: true,
    autonomyLevel: 50,
    confidence: 70,
    capabilities: ['technical_analysis', 'sentiment_analysis', 'trend_detection'],
    domains: ['research', 'alpha'],
    config: { bias: 'bullish' }
  },
  {
    role: 'bear_analyst',
    name: 'Bear Advocate',
    description: 'Analyzes markets from bearish perspective, finds reasons to sell/hedge',
    status: 'idle',
    enabled: true,
    autonomyLevel: 50,
    confidence: 70,
    capabilities: ['technical_analysis', 'risk_detection', 'reversal_patterns'],
    domains: ['research', 'alpha'],
    config: { bias: 'bearish' }
  },
  {
    role: 'risk_guardian',
    name: 'Risk Sentinel',
    description: 'Monitors portfolio risk, triggers alerts, proposes protective actions',
    status: 'idle',
    enabled: true,
    autonomyLevel: 80,
    confidence: 90,
    capabilities: ['risk_monitoring', 'exposure_analysis', 'hedge_recommendations'],
    domains: ['risk', 'portfolio'],
    config: { maxDrawdown: 10, alertThreshold: 5 }
  },
  {
    role: 'yield_optimizer',
    name: 'Yield Maximizer',
    description: 'Optimizes income generation across all yield sources',
    status: 'idle',
    enabled: true,
    autonomyLevel: 60,
    confidence: 80,
    capabilities: ['yield_analysis', 'rebalancing', 'harvest_optimization'],
    domains: ['yield', 'defi', 'capital'],
    config: { minYield: 3, riskTolerance: 'moderate' }
  },
  {
    role: 'execution_specialist',
    name: 'Execution Engine',
    description: 'Handles order routing, timing, and execution quality',
    status: 'idle',
    enabled: true,
    autonomyLevel: 70,
    confidence: 85,
    capabilities: ['order_routing', 'timing_optimization', 'slippage_reduction'],
    domains: ['execution', 'alpha'],
    config: { maxSlippage: 0.5, preferDarkPools: false }
  },
  {
    role: 'portfolio_manager',
    name: 'Portfolio Allocator',
    description: 'Manages asset allocation and portfolio rebalancing',
    status: 'idle',
    enabled: true,
    autonomyLevel: 50,
    confidence: 75,
    capabilities: ['allocation', 'rebalancing', 'diversification'],
    domains: ['portfolio', 'capital', 'risk'],
    config: { rebalanceThreshold: 5, maxConcentration: 20 }
  },
  {
    role: 'research_analyst',
    name: 'Market Intelligence',
    description: 'Researches markets, assets, and macro conditions',
    status: 'idle',
    enabled: true,
    autonomyLevel: 40,
    confidence: 70,
    capabilities: ['fundamental_analysis', 'macro_analysis', 'news_monitoring'],
    domains: ['research', 'alpha'],
    config: { depth: 'comprehensive' }
  },
  {
    role: 'tax_strategist',
    name: 'Tax Optimizer',
    description: 'Optimizes tax efficiency through harvesting and timing',
    status: 'idle',
    enabled: true,
    autonomyLevel: 50,
    confidence: 80,
    capabilities: ['tax_loss_harvesting', 'wash_sale_avoidance', 'gain_timing'],
    domains: ['tax', 'portfolio'],
    config: { harvestThreshold: 100 }
  },
  {
    role: 'life_advisor',
    name: 'Life Planning Agent',
    description: 'Adapts financial strategy to life events and goals',
    status: 'idle',
    enabled: true,
    autonomyLevel: 30,
    confidence: 70,
    capabilities: ['life_event_analysis', 'goal_tracking', 'risk_adjustment'],
    domains: ['life', 'portfolio', 'risk'],
    config: { proactive: true }
  },
  {
    role: 'sentinel',
    name: 'System Guardian',
    description: 'Monitors system health, detects anomalies, triggers alerts',
    status: 'idle',
    enabled: true,
    autonomyLevel: 85,
    confidence: 95,
    capabilities: ['health_monitoring', 'anomaly_detection', 'alerting'],
    domains: ['all'],
    config: { checkInterval: 30, alertThreshold: 'warning' }
  }
];

// =============================================================================
// AGENT SWARM ENGINE
// =============================================================================

export class AgentSwarmEngine extends EventEmitter {
  private static instance: AgentSwarmEngine;

  private agents: Map<string, Agent> = new Map();
  private proposals: Map<string, AgentProposal> = new Map();
  private messages: AgentMessage[] = [];
  private votes: Map<string, ConsensusVote[]> = new Map();

  private mode: 'manual' | 'autonomous' | 'hybrid' = 'manual';
  private consensusThreshold: number = 0.6;  // 60% agreement needed
  private proposalTTL: number = 3600000;     // 1 hour in ms

  private analysisLoop: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.initializeAgents();
    logger.info('AgentSwarm initialized');
  }

  public static getInstance(): AgentSwarmEngine {
    if (!AgentSwarmEngine.instance) {
      AgentSwarmEngine.instance = new AgentSwarmEngine();
    }
    return AgentSwarmEngine.instance;
  }

  private initializeAgents(): void {
    for (const agentDef of DEFAULT_AGENTS) {
      const agent: Agent = {
        ...agentDef,
        id: `agent_${agentDef.role}_${Date.now()}`,
        lastActive: new Date(),
        proposalCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        executedCount: 0,
        successRate: 0
      };
      this.agents.set(agent.id, agent);
    }

    logger.info(`Initialized ${this.agents.size} agents`);
  }

  // ===========================================================================
  // MODE CONTROL
  // ===========================================================================

  public setMode(mode: 'manual' | 'autonomous' | 'hybrid'): void {
    const previous = this.mode;
    this.mode = mode;

    logger.info(`Swarm mode changed: ${previous} -> ${mode}`);
    this.emit('mode_changed', { previous, current: mode });

    // Notify all agents
    this.broadcast({
      type: 'alert',
      content: {
        subject: 'Mode Change',
        body: `Swarm mode changed to ${mode}`,
        data: { previousMode: previous, newMode: mode },
        requiresResponse: false
      }
    });
  }

  public getMode(): string {
    // If external mode control is set, use that
    if (this.externalModeCheck) {
      return this.externalModeCheck() ? 'autonomous' : 'manual';
    }
    return this.mode;
  }

  /**
   * Set external mode control - allows TIME Governor to control mode
   * This ensures mode is centralized, not duplicated across systems
   */
  private externalModeCheck: (() => boolean) | null = null;

  public setExternalModeControl(checkFn: () => boolean): void {
    this.externalModeCheck = checkFn;
    logger.info('Agent Swarm now using external mode control (TIME Governor)');
  }

  /**
   * Check if in autonomous mode (defers to TIME Governor if integrated)
   */
  public isAutonomous(): boolean {
    if (this.externalModeCheck) {
      return this.externalModeCheck();
    }
    return this.mode === 'autonomous';
  }

  /**
   * Receive external signal from other systems
   */
  public receiveExternalSignal(signal: { type: string; source: string; data: any }): void {
    logger.info(`External signal from ${signal.source}: ${signal.type}`);

    // Route to appropriate agents based on signal type
    const signalRouting: Record<string, AgentRole[]> = {
      'evolution_proposal': ['coordinator', 'sentinel'],
      'pattern_discovered': ['alpha_hunter', 'research_analyst'],
      'risk_alert': ['risk_guardian', 'coordinator'],
      'opportunity': ['alpha_hunter', 'yield_optimizer'],
      'trade_executed': ['portfolio_manager', 'tax_strategist']
    };

    const targetRoles = signalRouting[signal.type] || ['coordinator'];

    for (const role of targetRoles) {
      const agent = this.getAgentByRole(role);
      if (agent && agent.enabled) {
        this.sendMessageToAgent(agent.id, {
          type: 'external_signal',
          content: {
            subject: signal.type,
            body: `Signal from ${signal.source}`,
            data: signal.data,
            requiresResponse: false
          }
        });
      }
    }

    this.emit('external_signal_received', signal);
  }

  /**
   * Enter emergency mode - halt all non-critical operations
   */
  public enterEmergencyMode(reason: string): void {
    logger.warn(`EMERGENCY MODE ACTIVATED: ${reason}`);

    // Pause all agents except sentinel
    for (const agent of this.agents.values()) {
      if (agent.role !== 'sentinel') {
        agent.status = 'paused';
      }
    }

    // Notify all agents
    this.broadcast({
      type: 'alert',
      content: {
        subject: 'EMERGENCY',
        body: reason,
        data: { emergencyMode: true },
        requiresResponse: false
      }
    });

    this.emit('emergency_mode', { reason, timestamp: new Date() });
  }

  /**
   * Create a proposal (called by integration layer)
   */
  public createProposal(
    type: string,
    title: string,
    targetSystems: string[],
    data: any
  ): void {
    // Find coordinator agent to handle this
    const coordinator = this.getAgentByRole('coordinator');
    if (coordinator) {
      this.sendMessageToAgent(coordinator.id, {
        type: 'create_proposal',
        content: {
          subject: type,
          body: title,
          data: { targetSystems, ...data },
          requiresResponse: true
        }
      });
    }
  }

  // ===========================================================================
  // AGENT MANAGEMENT
  // ===========================================================================

  public getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  public getAgentByRole(role: AgentRole): Agent | undefined {
    return Array.from(this.agents.values()).find(a => a.role === role);
  }

  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public enableAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (agent) {
      agent.enabled = true;
      agent.status = 'idle';
      this.emit('agent_enabled', agent);
      return true;
    }
    return false;
  }

  public disableAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (agent) {
      agent.enabled = false;
      agent.status = 'paused';
      this.emit('agent_disabled', agent);
      return true;
    }
    return false;
  }

  public updateAgentConfig(id: string, config: Record<string, any>): boolean {
    const agent = this.agents.get(id);
    if (agent) {
      agent.config = { ...agent.config, ...config };
      this.emit('agent_config_updated', agent);
      return true;
    }
    return false;
  }

  public setAgentAutonomy(id: string, level: number): boolean {
    const agent = this.agents.get(id);
    if (agent) {
      agent.autonomyLevel = Math.max(0, Math.min(100, level));
      this.emit('agent_autonomy_changed', { id, level: agent.autonomyLevel });
      return true;
    }
    return false;
  }

  // ===========================================================================
  // PROPOSAL SYSTEM
  // ===========================================================================

  public createProposal(
    agentId: string,
    proposal: Omit<AgentProposal, 'id' | 'agentId' | 'agentRole' | 'timestamp' | 'expiresAt' | 'status'>
  ): AgentProposal | null {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.enabled) {
      return null;
    }

    const fullProposal: AgentProposal = {
      ...proposal,
      id: `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      agentRole: agent.role,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.proposalTTL),
      status: 'pending'
    };

    this.proposals.set(fullProposal.id, fullProposal);
    agent.proposalCount++;
    agent.lastActive = new Date();
    agent.status = 'proposing';

    this.emit('proposal_created', fullProposal);
    logger.info('Proposal created', {
      id: fullProposal.id,
      agent: agent.name,
      action: fullProposal.action.type
    });

    // In autonomous/hybrid mode, check for auto-approval
    if (this.mode === 'autonomous' ||
        (this.mode === 'hybrid' && agent.autonomyLevel >= 80 && fullProposal.reasoning.confidence >= 85)) {
      this.autoApproveProposal(fullProposal.id);
    } else {
      // Request votes from other agents
      this.requestConsensus(fullProposal);
    }

    return fullProposal;
  }

  private requestConsensus(proposal: AgentProposal): void {
    // Initialize votes for this proposal
    this.votes.set(proposal.id, []);

    // Broadcast to relevant agents
    for (const agent of this.agents.values()) {
      if (agent.id === proposal.agentId) continue;  // Skip proposing agent
      if (!agent.enabled) continue;

      // Check if agent has expertise in relevant domain
      if (agent.domains.includes('all') ||
          agent.domains.some(d => proposal.action.targetSystem.toLowerCase().includes(d))) {
        this.sendMessage({
          fromAgentId: proposal.agentId,
          toAgentId: agent.id,
          type: 'vote',
          content: {
            subject: `Vote Request: ${proposal.action.type}`,
            body: proposal.reasoning.summary,
            data: { proposalId: proposal.id, proposal },
            requiresResponse: true,
            deadline: proposal.expiresAt
          }
        });
      }
    }
  }

  public submitVote(vote: Omit<ConsensusVote, 'timestamp'>): void {
    const fullVote: ConsensusVote = {
      ...vote,
      timestamp: new Date()
    };

    const proposalVotes = this.votes.get(vote.proposalId) || [];
    proposalVotes.push(fullVote);
    this.votes.set(vote.proposalId, proposalVotes);

    this.emit('vote_submitted', fullVote);

    // Check if consensus reached
    this.checkConsensus(vote.proposalId);
  }

  private checkConsensus(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') return;

    const votes = this.votes.get(proposalId) || [];
    const totalVoters = Array.from(this.agents.values())
      .filter(a => a.enabled && a.id !== proposal.agentId).length;

    if (votes.length < Math.ceil(totalVoters * 0.5)) {
      return; // Not enough votes yet
    }

    const approveVotes = votes.filter(v => v.vote === 'approve').length;
    const rejectVotes = votes.filter(v => v.vote === 'reject').length;
    const totalCast = approveVotes + rejectVotes;

    if (totalCast === 0) return;

    const approvalRate = approveVotes / totalCast;

    if (approvalRate >= this.consensusThreshold) {
      this.approveProposal(proposalId, 'consensus');
    } else if (rejectVotes / totalCast > (1 - this.consensusThreshold)) {
      this.rejectProposal(proposalId, 'Rejected by consensus');
    }
  }

  private autoApproveProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;

    proposal.status = 'auto_approved';
    proposal.approvedBy = 'auto';
    proposal.approvedAt = new Date();

    const agent = this.agents.get(proposal.agentId);
    if (agent) {
      agent.approvedCount++;
    }

    this.emit('proposal_auto_approved', proposal);
    logger.info('Proposal auto-approved', { id: proposalId });

    // Execute
    this.executeProposal(proposalId);
  }

  public approveProposal(proposalId: string, approvedBy: string = 'user'): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') {
      return false;
    }

    proposal.status = 'approved';
    proposal.approvedBy = approvedBy;
    proposal.approvedAt = new Date();

    const agent = this.agents.get(proposal.agentId);
    if (agent) {
      agent.approvedCount++;
    }

    this.emit('proposal_approved', proposal);
    logger.info('Proposal approved', { id: proposalId, by: approvedBy });

    // Execute
    this.executeProposal(proposalId);

    return true;
  }

  public rejectProposal(proposalId: string, reason?: string): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') {
      return false;
    }

    proposal.status = 'rejected';
    proposal.result = {
      success: false,
      outcome: reason || 'Rejected',
      metrics: {}
    };

    const agent = this.agents.get(proposal.agentId);
    if (agent) {
      agent.rejectedCount++;
      agent.successRate = agent.executedCount > 0
        ? (agent.executedCount - agent.rejectedCount) / agent.executedCount
        : 0;
    }

    this.emit('proposal_rejected', proposal);
    logger.info('Proposal rejected', { id: proposalId, reason });

    return true;
  }

  private async executeProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;

    const agent = this.agents.get(proposal.agentId);
    if (agent) {
      agent.status = 'executing';
    }

    proposal.executedAt = new Date();

    logger.info('Executing proposal', {
      id: proposalId,
      action: proposal.action.type,
      target: proposal.action.targetSystem
    });

    // Emit execution event for target system to handle
    this.emit('execute_proposal', {
      proposal,
      action: proposal.action,
      parameters: proposal.action.parameters
    });

    // Mark as executed
    proposal.status = 'executed';
    if (agent) {
      agent.executedCount++;
      agent.status = 'idle';
      agent.successRate = agent.approvedCount / agent.proposalCount;
    }

    proposal.result = {
      success: true,
      outcome: 'Dispatched to target system',
      metrics: {}
    };

    this.emit('proposal_executed', proposal);
  }

  public getProposals(filter?: {
    status?: ProposalStatus;
    agentId?: string;
    priority?: ProposalPriority;
  }): AgentProposal[] {
    let proposals = Array.from(this.proposals.values());

    // Filter out expired
    const now = new Date();
    proposals = proposals.filter(p =>
      p.status !== 'pending' || p.expiresAt > now
    );

    if (filter?.status) {
      proposals = proposals.filter(p => p.status === filter.status);
    }
    if (filter?.agentId) {
      proposals = proposals.filter(p => p.agentId === filter.agentId);
    }
    if (filter?.priority) {
      proposals = proposals.filter(p => p.priority === filter.priority);
    }

    return proposals.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  // ===========================================================================
  // MESSAGING SYSTEM
  // ===========================================================================

  private sendMessage(msg: Omit<AgentMessage, 'id' | 'timestamp' | 'responses'>): AgentMessage {
    const message: AgentMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      responses: []
    };

    this.messages.push(message);

    // Keep last 1000 messages
    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(-1000);
    }

    this.emit('message_sent', message);
    return message;
  }

  private broadcast(msg: Omit<AgentMessage, 'id' | 'timestamp' | 'responses' | 'fromAgentId' | 'toAgentId'>): void {
    const coordinator = this.getAgentByRole('coordinator');

    this.sendMessage({
      ...msg,
      fromAgentId: coordinator?.id || 'system',
      toAgentId: 'broadcast'
    });
  }

  public getMessages(filter?: { agentId?: string; type?: string }): AgentMessage[] {
    let filtered = [...this.messages];

    if (filter?.agentId) {
      filtered = filtered.filter(m =>
        m.fromAgentId === filter.agentId || m.toAgentId === filter.agentId
      );
    }
    if (filter?.type) {
      filtered = filtered.filter(m => m.type === filter.type);
    }

    return filtered;
  }

  // ===========================================================================
  // ANALYSIS TRIGGERS
  // ===========================================================================

  public async triggerAnalysis(domain?: string): Promise<void> {
    logger.info('Triggering swarm analysis', { domain });

    const relevantAgents = Array.from(this.agents.values())
      .filter(a => a.enabled && (domain ? a.domains.includes(domain) : true));

    for (const agent of relevantAgents) {
      agent.status = 'analyzing';
      this.emit('agent_analyzing', { agentId: agent.id, domain });
    }

    // In a real implementation, each agent would run its analysis logic
    // and potentially create proposals

    // Simulate analysis completion
    setTimeout(() => {
      for (const agent of relevantAgents) {
        if (agent.status === 'analyzing') {
          agent.status = 'idle';
          agent.lastActive = new Date();
        }
      }
      this.emit('analysis_complete', { domain, agents: relevantAgents.length });
    }, 1000);
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  public start(): void {
    if (this.analysisLoop) return;

    logger.info('Starting Agent Swarm');

    // Periodic analysis
    this.analysisLoop = setInterval(() => {
      this.triggerAnalysis().catch(err => {
        logger.error('Analysis error', { error: err });
      });

      // Expire old proposals
      const now = new Date();
      for (const proposal of this.proposals.values()) {
        if (proposal.status === 'pending' && proposal.expiresAt < now) {
          proposal.status = 'expired';
          this.emit('proposal_expired', proposal);
        }
      }
    }, 60000); // Every minute

    this.emit('started');
  }

  public stop(): void {
    if (this.analysisLoop) {
      clearInterval(this.analysisLoop);
      this.analysisLoop = null;
      logger.info('Agent Swarm stopped');
      this.emit('stopped');
    }
  }

  public getState(): SwarmState {
    const activeAgents = Array.from(this.agents.values()).filter(a => a.enabled).length;
    const pendingProposals = Array.from(this.proposals.values()).filter(p => p.status === 'pending').length;
    const executingActions = Array.from(this.agents.values()).filter(a => a.status === 'executing').length;

    return {
      mode: this.mode,
      activeAgents,
      totalAgents: this.agents.size,
      pendingProposals,
      executingActions,
      consensusThreshold: this.consensusThreshold,
      lastActivity: new Date()
    };
  }

  public getHealth(): { status: string; health: number; details: Record<string, any> } {
    const state = this.getState();

    return {
      status: this.analysisLoop ? 'running' : 'stopped',
      health: state.activeAgents / state.totalAgents * 100,
      details: {
        mode: state.mode,
        activeAgents: state.activeAgents,
        totalAgents: state.totalAgents,
        pendingProposals: state.pendingProposals
      }
    };
  }
}

// Export singleton
export const agentSwarm = AgentSwarmEngine.getInstance();

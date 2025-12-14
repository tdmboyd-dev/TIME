/**
 * TIME Integration Layer
 * THE CENTRAL NERVOUS SYSTEM CONNECTOR
 *
 * This is the GLUE that connects ALL TIME systems together:
 * - TIME Governor (mode control)
 * - Meta-Brain (global orchestration)
 * - Memory Graph (knowledge relationships)
 * - Agent Swarm (multi-agent coordination)
 * - Autonomous Capital Agent (trading agent)
 * - All engines (Capital Conductor, Alpha Engine, etc.)
 *
 * CRITICAL: This layer ensures systems work together, not in isolation.
 * All mode control comes from TIME Governor - no duplicate systems.
 */

import { EventEmitter } from 'events';
import { timeGovernor, TIMEComponent } from './time_governor';
import { evolutionController } from './evolution_controller';
import { metaBrain } from '../meta/meta_brain';
import { memoryGraph, NodeType, EdgeType } from '../graph/memory_graph';
import { agentSwarm } from '../agents/agent_swarm';
import { autonomousCapitalAgent } from '../autonomous/autonomous_capital_agent';
import { loggers } from '../utils/logger';
import { SystemHealth, EvolutionMode, MarketRegime } from '../types';

const log = loggers.governor;

// ============================================================================
// TYPES
// ============================================================================

export interface SystemEvent {
  id: string;
  timestamp: Date;
  source: string;
  type: string;
  data: any;
  processed: boolean;
}

export interface CrossSystemDecision {
  id: string;
  timestamp: Date;
  originSystem: string;
  targetSystems: string[];
  decision: {
    type: string;
    action: string;
    confidence: number;
    reasoning: string;
  };
  approvals: { system: string; approved: boolean; notes?: string }[];
  status: 'pending' | 'approved' | 'rejected' | 'executed';
}

export interface IntegrationMetrics {
  eventsProcessed: number;
  crossSystemDecisions: number;
  memoryNodesCreated: number;
  agentCoordinations: number;
  averageLatencyMs: number;
  uptime: number;
}

// ============================================================================
// TIME INTEGRATION ENGINE
// ============================================================================

export class TIMEIntegration extends EventEmitter implements TIMEComponent {
  public readonly name = 'TIMEIntegration';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private static instance: TIMEIntegration;

  private eventQueue: SystemEvent[] = [];
  private crossDecisions: Map<string, CrossSystemDecision> = new Map();
  private systemConnections: Map<string, { connected: boolean; lastPing: Date }> = new Map();
  private startTime: Date = new Date();

  private metrics: IntegrationMetrics = {
    eventsProcessed: 0,
    crossSystemDecisions: 0,
    memoryNodesCreated: 0,
    agentCoordinations: 0,
    averageLatencyMs: 0,
    uptime: 0
  };

  private constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners for cross-system events
  }

  public static getInstance(): TIMEIntegration {
    if (!TIMEIntegration.instance) {
      TIMEIntegration.instance = new TIMEIntegration();
    }
    return TIMEIntegration.instance;
  }

  // ==========================================================================
  // INITIALIZATION - WIRE EVERYTHING TOGETHER
  // ==========================================================================

  public async initialize(): Promise<void> {
    console.log('[Integration] Initializing TIME Integration Layer...');
    console.log('[Integration] Connecting all systems...');

    // 1. Wire TIME Governor events (THE CENTRAL MODE CONTROLLER)
    this.wireGovernorEvents();

    // 2. Wire Evolution Controller events
    this.wireEvolutionEvents();

    // 3. Wire Meta-Brain events
    this.wireMetaBrainEvents();

    // 4. Wire Memory Graph events
    this.wireMemoryGraphEvents();

    // 5. Wire Agent Swarm events
    this.wireAgentSwarmEvents();

    // 6. Wire Autonomous Capital Agent events
    this.wireCapitalAgentEvents();

    // 7. Create initial memory graph nodes for systems
    await this.initializeSystemGraph();

    // 8. Sync mode across all systems
    this.syncModeAcrossSystems();

    // 9. Start health monitoring
    this.startHealthMonitor();

    // 10. Register with TIME Governor
    timeGovernor.registerComponent(this);

    this.status = 'online';
    console.log('[Integration] TIME Integration Layer ONLINE - All systems connected!');
    this.emit('integration:ready');
  }

  // ==========================================================================
  // WIRE GOVERNOR EVENTS (CENTRAL MODE CONTROL)
  // ==========================================================================

  private wireGovernorEvents(): void {
    // When mode changes, propagate to ALL systems
    timeGovernor.on('evolution:mode_changed', (state) => {
      console.log(`[Integration] Mode changed to ${state.mode} by ${state.changedBy}`);

      // Sync to Meta-Brain (remove its internal mode, use Governor's)
      this.syncMetaBrainMode(state.mode);

      // Sync to Agent Swarm (remove its internal mode, use Governor's)
      this.syncAgentSwarmMode(state.mode);

      // Record in Memory Graph
      memoryGraph.addNode({
        type: 'decision',
        label: `Mode Change: ${state.mode}`,
        properties: {
          from: state.mode === 'autonomous' ? 'controlled' : 'autonomous',
          to: state.mode,
          changedBy: state.changedBy,
          reason: state.reason
        }
      });

      this.emit('mode:changed', state);
    });

    // When regime changes, notify all systems
    timeGovernor.on('regime:changed', (regime: MarketRegime) => {
      console.log(`[Integration] Regime changed to ${regime}`);

      // Tell Meta-Brain about regime
      metaBrain.updateSystemState('market_regime', regime);

      // Create regime node in graph
      memoryGraph.addNode({
        type: 'regime',
        label: regime,
        properties: { detectedAt: new Date(), confidence: 0.8 }
      });

      this.emit('regime:changed', regime);
    });

    // When risk alert occurs, ALL systems need to know
    timeGovernor.on('risk:alert', (decision) => {
      console.log(`[Integration] RISK ALERT: ${decision.severity} - ${decision.reason}`);

      // Emergency propagation
      if (decision.severity === 'critical') {
        this.triggerEmergencyProtocol(decision.reason);
      }

      this.emit('risk:alert', decision);
    });

    this.systemConnections.set('TIMEGovernor', { connected: true, lastPing: new Date() });
    console.log('[Integration] TIME Governor wired');
  }

  // ==========================================================================
  // WIRE EVOLUTION CONTROLLER
  // ==========================================================================

  private wireEvolutionEvents(): void {
    evolutionController.on('proposal:created', (proposal) => {
      console.log(`[Integration] Evolution proposal created: ${proposal.title}`);

      // Store in memory graph
      memoryGraph.addNode({
        type: 'decision',
        label: proposal.title,
        properties: proposal
      });

      // If in autonomous mode, also notify agent swarm
      if (timeGovernor.isAutonomous()) {
        agentSwarm.receiveExternalSignal({
          type: 'evolution_proposal',
          source: 'evolution_controller',
          data: proposal
        });
      }

      this.emit('evolution:proposal', proposal);
    });

    evolutionController.on('proposal:implemented', (proposal) => {
      console.log(`[Integration] Evolution implemented: ${proposal.title}`);

      // Record outcome in memory graph
      memoryGraph.addNode({
        type: 'outcome',
        label: `Implemented: ${proposal.title}`,
        properties: { proposal, implementedAt: new Date() }
      });

      // Connect proposal to outcome
      memoryGraph.addEdge({
        sourceId: `proposal_${proposal.id}`,
        targetId: `outcome_${proposal.id}`,
        type: 'resulted_in',
        weight: 1,
        properties: {}
      });

      this.emit('evolution:implemented', proposal);
    });

    this.systemConnections.set('EvolutionController', { connected: true, lastPing: new Date() });
    console.log('[Integration] Evolution Controller wired');
  }

  // ==========================================================================
  // WIRE META-BRAIN
  // ==========================================================================

  private wireMetaBrainEvents(): void {
    metaBrain.on('recommendation:generated', (rec) => {
      console.log(`[Integration] Meta-Brain recommendation: ${rec.type}`);

      // Store in memory graph
      const recNodeId = `recommendation_${rec.id}`;
      memoryGraph.addNode({
        type: 'insight',
        label: rec.title || rec.type,
        properties: rec
      });

      // If in controlled mode, create proposal
      if (!timeGovernor.isAutonomous() && rec.requiresApproval) {
        evolutionController.createProposal(
          'performance_optimization',
          rec.title || 'Meta-Brain Recommendation',
          rec.description || '',
          [],
          rec.reasoning || '',
          rec.expectedBenefits || [],
          rec.risks || [],
          rec.priority === 'critical' ? 'critical' : rec.priority === 'high' ? 'high' : 'medium'
        );
      }

      // Send to agent swarm for consensus if needed
      if (rec.requiresConsensus) {
        agentSwarm.requestProposal(
          'meta_brain_recommendation',
          rec.title || 'Recommendation',
          rec.targetSystems || ['all'],
          rec.data || {}
        );
      }

      this.emit('metabrain:recommendation', rec);
    });

    metaBrain.on('alert:triggered', (alert) => {
      console.log(`[Integration] Meta-Brain alert: ${alert.severity} - ${alert.message}`);

      // Record in graph
      memoryGraph.addNode({
        type: 'insight',
        label: `Alert: ${alert.type}`,
        properties: alert
      });

      // Propagate to Governor if critical
      if (alert.severity === 'critical') {
        timeGovernor.emit('risk:alert', {
          severity: 'high',
          reason: alert.message
        });
      }

      this.emit('metabrain:alert', alert);
    });

    this.systemConnections.set('MetaBrain', { connected: true, lastPing: new Date() });
    console.log('[Integration] Meta-Brain wired');
  }

  // ==========================================================================
  // WIRE MEMORY GRAPH
  // ==========================================================================

  private wireMemoryGraphEvents(): void {
    memoryGraph.on('pattern:discovered', (pattern) => {
      console.log(`[Integration] Pattern discovered: ${pattern.type}`);

      // Notify Meta-Brain about pattern
      metaBrain.recordInsight({
        source: 'memory_graph',
        type: 'pattern_discovered',
        data: pattern
      });

      // Notify Agent Swarm
      agentSwarm.receiveExternalSignal({
        type: 'pattern_discovered',
        source: 'memory_graph',
        data: pattern
      });

      this.metrics.memoryNodesCreated++;
      this.emit('graph:pattern', pattern);
    });

    memoryGraph.on('insight:generated', (insight) => {
      console.log(`[Integration] Memory insight: ${insight.type}`);

      // Feed insight to Meta-Brain for decision
      metaBrain.processInsight(insight);

      this.emit('graph:insight', insight);
    });

    this.systemConnections.set('MemoryGraph', { connected: true, lastPing: new Date() });
    console.log('[Integration] Memory Graph wired');
  }

  // ==========================================================================
  // WIRE AGENT SWARM
  // ==========================================================================

  private wireAgentSwarmEvents(): void {
    agentSwarm.on('proposal:consensus', (proposal) => {
      console.log(`[Integration] Agent Swarm consensus reached: ${proposal.title}`);

      // Record in memory graph
      memoryGraph.addNode({
        type: 'decision',
        label: `Swarm: ${proposal.title}`,
        properties: { ...proposal, consensusReached: true }
      });

      // If controlled mode, needs human approval
      if (!timeGovernor.isAutonomous()) {
        evolutionController.createProposal(
          'strategy_optimization',
          `[Swarm] ${proposal.title}`,
          proposal.description || '',
          [],
          `Agent swarm reached consensus (${proposal.votes?.length || 0} votes)`,
          ['Collective intelligence decision'],
          ['Swarm may be wrong'],
          'medium'
        );
      } else {
        // Autonomous - execute directly via Meta-Brain
        metaBrain.executeDecision(proposal);
      }

      this.metrics.agentCoordinations++;
      this.emit('swarm:consensus', proposal);
    });

    agentSwarm.on('agent:decision', (data) => {
      console.log(`[Integration] Agent ${data.agentId} decision: ${data.decision.type}`);

      // Record individual agent decisions in graph
      memoryGraph.addNode({
        type: 'decision',
        label: `${data.agentId}: ${data.decision.type}`,
        properties: data
      });

      // Feed to Autonomous Capital Agent if trade-related
      if (['buy', 'sell', 'position'].some(t => data.decision.type.includes(t))) {
        autonomousCapitalAgent.emit('swarm:signal', {
          agentId: data.agentId,
          signal: data.decision
        });
      }

      this.emit('agent:decision', data);
    });

    this.systemConnections.set('AgentSwarm', { connected: true, lastPing: new Date() });
    console.log('[Integration] Agent Swarm wired');
  }

  // ==========================================================================
  // WIRE AUTONOMOUS CAPITAL AGENT
  // ==========================================================================

  private wireCapitalAgentEvents(): void {
    autonomousCapitalAgent.on('decisionExecuted', (data) => {
      console.log(`[Integration] Capital Agent executed: ${data.decision.type}`);

      // Record trade in memory graph
      const tradeNodeId = `trade_${data.decision.id}`;
      memoryGraph.addNode({
        type: 'trade',
        label: `Trade: ${data.decision.action.description}`,
        properties: data.decision
      });

      // Connect to decision that caused it
      if (data.decision.originProposalId) {
        memoryGraph.addEdge({
          sourceId: `swarm_decision_${data.decision.originProposalId}`,
          targetId: tradeNodeId,
          type: 'executed',
          weight: 1,
          properties: {}
        });
      }

      // Notify Meta-Brain
      metaBrain.recordTrade({
        tradeId: data.decision.id,
        agentId: data.agentId,
        details: data.decision
      });

      this.emit('capital:executed', data);
    });

    autonomousCapitalAgent.on('agentLearned', (data) => {
      console.log(`[Integration] Capital Agent learned: ${data.agentId}`);

      // Store learning in memory graph
      memoryGraph.addNode({
        type: 'insight',
        label: `Learning: ${data.agentId}`,
        properties: { agentId: data.agentId, learnedAt: new Date() }
      });

      this.emit('capital:learned', data);
    });

    autonomousCapitalAgent.on('agentEmergency', (data) => {
      console.log(`[Integration] EMERGENCY: Agent ${data.agentId} - ${data.reason}`);

      // Propagate emergency
      this.triggerEmergencyProtocol(data.reason);

      this.emit('capital:emergency', data);
    });

    this.systemConnections.set('AutonomousCapitalAgent', { connected: true, lastPing: new Date() });
    console.log('[Integration] Autonomous Capital Agent wired');
  }

  // ==========================================================================
  // MODE SYNCHRONIZATION
  // ==========================================================================

  private syncModeAcrossSystems(): void {
    const mode = timeGovernor.getEvolutionMode();
    console.log(`[Integration] Syncing mode: ${mode} across all systems`);

    // Sync Meta-Brain
    this.syncMetaBrainMode(mode);

    // Sync Agent Swarm
    this.syncAgentSwarmMode(mode);

    console.log('[Integration] Mode synchronized across all systems');
  }

  private syncMetaBrainMode(mode: EvolutionMode): void {
    // Meta-Brain should defer to Governor's mode
    // Instead of having its own mode, it checks timeGovernor.isAutonomous()
    metaBrain.setExternalModeControl(() => timeGovernor.isAutonomous());
    console.log(`[Integration] Meta-Brain synced to Governor mode: ${mode}`);
  }

  private syncAgentSwarmMode(mode: EvolutionMode): void {
    // Agent Swarm should defer to Governor's mode for system-level decisions
    // Individual agent autonomy levels remain separate (per-agent)
    agentSwarm.setExternalModeControl(() => timeGovernor.isAutonomous());
    console.log(`[Integration] Agent Swarm synced to Governor mode: ${mode}`);
  }

  // ==========================================================================
  // MEMORY GRAPH INITIALIZATION
  // ==========================================================================

  private async initializeSystemGraph(): Promise<void> {
    console.log('[Integration] Initializing system graph...');

    // Create nodes for each major system
    const systems = [
      { id: 'sys_governor', name: 'TIME Governor', type: 'bot' as NodeType },
      { id: 'sys_evolution', name: 'Evolution Controller', type: 'bot' as NodeType },
      { id: 'sys_metabrain', name: 'Meta-Brain', type: 'bot' as NodeType },
      { id: 'sys_memorygraph', name: 'Memory Graph', type: 'bot' as NodeType },
      { id: 'sys_agentswarm', name: 'Agent Swarm', type: 'bot' as NodeType },
      { id: 'sys_capitalagent', name: 'Autonomous Capital Agent', type: 'bot' as NodeType },
      { id: 'sys_integration', name: 'Integration Layer', type: 'bot' as NodeType }
    ];

    for (const sys of systems) {
      memoryGraph.addNode({
        type: sys.type,
        label: sys.name,
        properties: { isSystemNode: true, initializedAt: new Date(), systemId: sys.id }
      });
    }

    // Create edges showing relationships
    const edges: { source: string; target: string; type: EdgeType }[] = [
      { source: 'sys_governor', target: 'sys_evolution', type: 'correlated_with' },
      { source: 'sys_governor', target: 'sys_metabrain', type: 'correlated_with' },
      { source: 'sys_integration', target: 'sys_governor', type: 'correlated_with' },
      { source: 'sys_integration', target: 'sys_metabrain', type: 'correlated_with' },
      { source: 'sys_integration', target: 'sys_memorygraph', type: 'correlated_with' },
      { source: 'sys_integration', target: 'sys_agentswarm', type: 'correlated_with' },
      { source: 'sys_integration', target: 'sys_capitalagent', type: 'correlated_with' },
      { source: 'sys_metabrain', target: 'sys_agentswarm', type: 'correlated_with' },
      { source: 'sys_agentswarm', target: 'sys_capitalagent', type: 'correlated_with' },
      { source: 'sys_memorygraph', target: 'sys_metabrain', type: 'correlated_with' }
    ];

    for (const edge of edges) {
      memoryGraph.addEdge({
        sourceId: edge.source,
        targetId: edge.target,
        type: edge.type,
        weight: 1,
        properties: { isSystemEdge: true }
      });
    }

    console.log(`[Integration] System graph initialized with ${systems.length} systems`);
  }

  // ==========================================================================
  // EMERGENCY PROTOCOL
  // ==========================================================================

  private async triggerEmergencyProtocol(reason: string): Promise<void> {
    console.log(`[Integration] !!! EMERGENCY PROTOCOL TRIGGERED: ${reason} !!!`);

    // 1. Switch to controlled mode immediately
    timeGovernor.setEvolutionMode('controlled', 'system', `Emergency: ${reason}`);

    // 2. Notify all agents
    const agents = autonomousCapitalAgent.getAllAgents();
    for (const agent of agents) {
      await autonomousCapitalAgent.triggerEmergencyMode(agent.id, reason);
    }

    // 3. Halt agent swarm
    agentSwarm.enterEmergencyMode(reason);

    // 4. Record in graph
    memoryGraph.addNode({
      type: 'insight',
      label: `EMERGENCY: ${reason}`,
      properties: { triggeredAt: new Date(), reason, severity: 'critical' }
    });

    // 5. Emit for external handlers
    this.emit('emergency:triggered', { reason, timestamp: new Date() });
  }

  // ==========================================================================
  // CROSS-SYSTEM DECISIONS
  // ==========================================================================

  public async createCrossSystemDecision(
    originSystem: string,
    targetSystems: string[],
    decision: { type: string; action: string; confidence: number; reasoning: string }
  ): Promise<CrossSystemDecision> {
    const crossDecision: CrossSystemDecision = {
      id: `cross_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      originSystem,
      targetSystems,
      decision,
      approvals: [],
      status: 'pending'
    };

    this.crossDecisions.set(crossDecision.id, crossDecision);
    this.metrics.crossSystemDecisions++;

    // If autonomous, auto-approve
    if (timeGovernor.isAutonomous()) {
      crossDecision.approvals = targetSystems.map(sys => ({
        system: sys,
        approved: true,
        notes: 'Auto-approved in autonomous mode'
      }));
      crossDecision.status = 'approved';
      await this.executeCrossDecision(crossDecision);
    } else {
      // Need approval from target systems
      for (const targetSys of targetSystems) {
        this.emit(`approval:needed:${targetSys}`, crossDecision);
      }
    }

    return crossDecision;
  }

  public async approveCrossDecision(
    decisionId: string,
    system: string,
    approved: boolean,
    notes?: string
  ): Promise<void> {
    const decision = this.crossDecisions.get(decisionId);
    if (!decision) throw new Error(`Cross-decision not found: ${decisionId}`);

    decision.approvals.push({ system, approved, notes });

    // Check if all approvals received
    if (decision.approvals.length >= decision.targetSystems.length) {
      const allApproved = decision.approvals.every(a => a.approved);
      decision.status = allApproved ? 'approved' : 'rejected';

      if (allApproved) {
        await this.executeCrossDecision(decision);
      }
    }
  }

  private async executeCrossDecision(decision: CrossSystemDecision): Promise<void> {
    console.log(`[Integration] Executing cross-system decision: ${decision.id}`);

    decision.status = 'executed';

    // Record in memory graph
    memoryGraph.addNode({
      type: 'decision',
      label: `Cross: ${decision.decision.action}`,
      properties: decision
    });

    this.emit('cross:executed', decision);
  }

  // ==========================================================================
  // HEALTH MONITORING
  // ==========================================================================

  private startHealthMonitor(): void {
    setInterval(() => {
      this.metrics.uptime = Date.now() - this.startTime.getTime();

      // Ping all connected systems
      for (const [system, status] of this.systemConnections) {
        const timeSinceLastPing = Date.now() - status.lastPing.getTime();
        if (timeSinceLastPing > 60000) {
          console.log(`[Integration] Warning: ${system} hasn't responded in ${timeSinceLastPing}ms`);
          status.connected = false;
        }
      }

      this.emit('health:check', this.metrics);
    }, 30000);
  }

  public getHealth(): SystemHealth {
    const connectedCount = Array.from(this.systemConnections.values()).filter(s => s.connected).length;

    return {
      component: this.name,
      status: connectedCount === this.systemConnections.size ? 'online' :
              connectedCount > 0 ? 'degraded' : 'offline',
      lastCheck: new Date(),
      metrics: {
        ...this.metrics,
        connectedSystems: connectedCount,
        totalSystems: this.systemConnections.size
      }
    };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  public getSystemStatus(): { system: string; connected: boolean; lastPing: Date }[] {
    return Array.from(this.systemConnections.entries()).map(([system, status]) => ({
      system,
      ...status
    }));
  }

  public getMetrics(): IntegrationMetrics {
    return { ...this.metrics };
  }

  public getCrossDecisions(): CrossSystemDecision[] {
    return Array.from(this.crossDecisions.values());
  }

  public isInAutonomousMode(): boolean {
    return timeGovernor.isAutonomous();
  }

  public getCurrentMode(): EvolutionMode {
    return timeGovernor.getEvolutionMode();
  }

  public async shutdown(): Promise<void> {
    console.log('[Integration] Shutting down TIME Integration Layer...');
    this.status = 'offline';
    this.emit('integration:shutdown');
  }
}

// Export singleton
export const timeIntegration = TIMEIntegration.getInstance();

export default TIMEIntegration;

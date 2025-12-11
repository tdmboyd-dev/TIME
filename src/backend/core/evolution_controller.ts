/**
 * TIME — Meta-Intelligence Trading Governor
 * Evolution Controller
 *
 * Manages the dual evolution modes:
 * - Controlled: TIME proposes, admin approves
 * - Autonomous: TIME evolves independently
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { timeGovernor, TIMEComponent } from './time_governor';
import { EvolutionMode, EvolutionState, SystemHealth } from '../types';

const log = loggers.evolution;

// Evolution proposal for controlled mode
export interface EvolutionProposal {
  id: string;
  type: EvolutionProposalType;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  changes: ProposedChange[];
  reasoning: string;
  expectedBenefits: string[];
  risks: string[];
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  implementedAt?: Date;
}

export type EvolutionProposalType =
  | 'new_module'
  | 'module_upgrade'
  | 'architecture_change'
  | 'new_bot'
  | 'bot_upgrade'
  | 'new_strategy'
  | 'strategy_optimization'
  | 'risk_adjustment'
  | 'hole_patch'
  | 'performance_optimization';

export interface ProposedChange {
  target: string; // file path or component name
  changeType: 'create' | 'modify' | 'delete';
  description: string;
  before?: string; // code snippet or config before
  after?: string; // code snippet or config after
}

// Evolution log entry
export interface EvolutionLogEntry {
  id: string;
  timestamp: Date;
  mode: EvolutionMode;
  type: 'proposal_created' | 'proposal_approved' | 'proposal_rejected' | 'evolution_executed' | 'mode_change';
  details: Record<string, unknown>;
  proposalId?: string;
}

/**
 * Evolution Controller
 *
 * In Controlled Mode:
 * - Creates proposals for changes
 * - Waits for admin approval
 * - Executes only approved changes
 *
 * In Autonomous Mode:
 * - Identifies improvement opportunities
 * - Implements changes automatically
 * - Logs everything for transparency
 */
export class EvolutionController extends EventEmitter implements TIMEComponent {
  public readonly name = 'EvolutionController';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private proposals: Map<string, EvolutionProposal> = new Map();
  private evolutionLog: EvolutionLogEntry[] = [];
  private autonomousCycleInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Autonomous evolution settings
  private readonly autonomousCycleIntervalMs = 60 * 60 * 1000; // 1 hour

  constructor() {
    super();
  }

  /**
   * Initialize the evolution controller
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Evolution Controller...');

    // Subscribe to mode changes from governor
    timeGovernor.on('evolution:mode_changed', (state: EvolutionState) => {
      this.handleModeChange(state);
    });

    // Start in current mode
    const currentMode = timeGovernor.getEvolutionMode();
    if (currentMode === 'autonomous') {
      this.startAutonomousCycle();
    }

    this.status = 'online';
    this.isRunning = true;
    log.info('Evolution Controller initialized');
  }

  /**
   * Handle mode change
   */
  private handleModeChange(state: EvolutionState): void {
    this.logEvolution('mode_change', {
      mode: state.mode,
      changedBy: state.changedBy,
      reason: state.reason,
    });

    if (state.mode === 'autonomous') {
      this.startAutonomousCycle();
    } else {
      this.stopAutonomousCycle();
    }
  }

  /**
   * Start autonomous evolution cycle
   */
  private startAutonomousCycle(): void {
    if (this.autonomousCycleInterval) return;

    log.info('Starting autonomous evolution cycle');
    this.autonomousCycleInterval = setInterval(() => {
      this.runAutonomousEvolution();
    }, this.autonomousCycleIntervalMs);

    // Run immediately
    this.runAutonomousEvolution();
  }

  /**
   * Stop autonomous evolution cycle
   */
  private stopAutonomousCycle(): void {
    if (this.autonomousCycleInterval) {
      clearInterval(this.autonomousCycleInterval);
      this.autonomousCycleInterval = null;
      log.info('Autonomous evolution cycle stopped');
    }
  }

  /**
   * Run autonomous evolution (when in autonomous mode)
   */
  private async runAutonomousEvolution(): Promise<void> {
    if (!timeGovernor.isAutonomous()) return;

    log.info('Running autonomous evolution...');

    try {
      // 1. Analyze system performance
      const analysisResults = await this.analyzeSystemPerformance();

      // 2. Identify improvement opportunities
      const opportunities = this.identifyImprovementOpportunities(analysisResults);

      // 3. Execute improvements
      for (const opportunity of opportunities) {
        await this.executeAutonomousImprovement(opportunity);
      }

      log.info('Autonomous evolution cycle completed', {
        opportunitiesIdentified: opportunities.length,
      });
    } catch (error) {
      log.error('Autonomous evolution failed', { error });
    }
  }

  /**
   * Analyze system performance
   */
  private async analyzeSystemPerformance(): Promise<Record<string, unknown>> {
    // Collect metrics from all components
    const health = timeGovernor.getSystemHealth();
    const metrics = timeGovernor.getMetrics();

    return {
      health,
      metrics,
      timestamp: new Date(),
    };
  }

  /**
   * Identify improvement opportunities
   */
  private identifyImprovementOpportunities(
    analysis: Record<string, unknown>
  ): EvolutionProposal[] {
    const opportunities: EvolutionProposal[] = [];

    // This is where TIME's intelligence comes in
    // Analyze patterns, identify weaknesses, propose improvements

    // Placeholder - will be expanded with actual intelligence
    return opportunities;
  }

  /**
   * Execute autonomous improvement
   */
  private async executeAutonomousImprovement(
    proposal: EvolutionProposal
  ): Promise<void> {
    log.info('Executing autonomous improvement', {
      type: proposal.type,
      title: proposal.title,
    });

    this.logEvolution('evolution_executed', {
      proposalId: proposal.id,
      type: proposal.type,
      title: proposal.title,
      autonomous: true,
    });

    // Execute the changes
    // This will be expanded with actual implementation logic
  }

  /**
   * Create a proposal (for controlled mode)
   */
  public createProposal(
    type: EvolutionProposalType,
    title: string,
    description: string,
    changes: ProposedChange[],
    reasoning: string,
    expectedBenefits: string[],
    risks: string[],
    impact: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): EvolutionProposal {
    const proposal: EvolutionProposal = {
      id: uuidv4(),
      type,
      title,
      description,
      impact,
      changes,
      reasoning,
      expectedBenefits,
      risks,
      status: 'pending',
      createdAt: new Date(),
    };

    this.proposals.set(proposal.id, proposal);
    this.logEvolution('proposal_created', { proposal });

    log.info('Evolution proposal created', {
      id: proposal.id,
      type,
      title,
    });

    this.emit('proposal:created', proposal);
    return proposal;
  }

  /**
   * Approve a proposal (admin action)
   */
  public async approveProposal(
    proposalId: string,
    reviewedBy: string
  ): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'pending') {
      throw new Error(`Proposal is not pending: ${proposal.status}`);
    }

    proposal.status = 'approved';
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = reviewedBy;

    this.logEvolution('proposal_approved', {
      proposalId,
      reviewedBy,
    });

    log.info('Proposal approved', { proposalId, reviewedBy });
    this.emit('proposal:approved', proposal);

    // Execute the approved proposal
    await this.executeProposal(proposal);
  }

  /**
   * Reject a proposal (admin action)
   */
  public rejectProposal(proposalId: string, reviewedBy: string, reason: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    proposal.status = 'rejected';
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = reviewedBy;

    this.logEvolution('proposal_rejected', {
      proposalId,
      reviewedBy,
      reason,
    });

    log.info('Proposal rejected', { proposalId, reviewedBy, reason });
    this.emit('proposal:rejected', proposal, reason);
  }

  /**
   * Execute an approved proposal
   */
  private async executeProposal(proposal: EvolutionProposal): Promise<void> {
    log.info('Executing proposal', { proposalId: proposal.id });

    try {
      // Execute each change
      for (const change of proposal.changes) {
        await this.executeChange(change);
      }

      proposal.status = 'implemented';
      proposal.implementedAt = new Date();

      this.logEvolution('evolution_executed', {
        proposalId: proposal.id,
        autonomous: false,
      });

      log.info('Proposal implemented', { proposalId: proposal.id });
      this.emit('proposal:implemented', proposal);
    } catch (error) {
      log.error('Failed to execute proposal', { proposalId: proposal.id, error });
      throw error;
    }
  }

  /**
   * Execute a single change
   */
  private async executeChange(change: ProposedChange): Promise<void> {
    log.debug('Executing change', {
      target: change.target,
      type: change.changeType,
    });

    // Implementation depends on change type
    // This will be expanded with actual file/code manipulation
  }

  /**
   * Log an evolution event
   */
  private logEvolution(
    type: EvolutionLogEntry['type'],
    details: Record<string, unknown>,
    proposalId?: string
  ): void {
    const entry: EvolutionLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      mode: timeGovernor.getEvolutionMode(),
      type,
      details,
      proposalId,
    };

    this.evolutionLog.push(entry);
  }

  /**
   * Get pending proposals
   */
  public getPendingProposals(): EvolutionProposal[] {
    return Array.from(this.proposals.values()).filter(
      (p) => p.status === 'pending'
    );
  }

  /**
   * Get all proposals
   */
  public getAllProposals(): EvolutionProposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get evolution log
   */
  public getEvolutionLog(): EvolutionLogEntry[] {
    return [...this.evolutionLog];
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
        pendingProposals: this.getPendingProposals().length,
        totalProposals: this.proposals.size,
        logEntries: this.evolutionLog.length,
        isAutonomousRunning: this.autonomousCycleInterval !== null ? 1 : 0,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Evolution Controller...');
    this.stopAutonomousCycle();
    this.isRunning = false;
    this.status = 'offline';
  }
}

// Export singleton
export const evolutionController = new EvolutionController();

export default EvolutionController;

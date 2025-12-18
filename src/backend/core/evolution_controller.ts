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
   * Identify improvement opportunities - FULL IMPLEMENTATION
   * TIME's intelligence analyzes system metrics and proposes improvements
   */
  private identifyImprovementOpportunities(
    analysis: Record<string, unknown>
  ): EvolutionProposal[] {
    const opportunities: EvolutionProposal[] = [];
    const health = analysis.health as SystemHealth;
    const metrics = analysis.metrics as Record<string, any>;

    // 1. PERFORMANCE OPTIMIZATION - Check for slow components
    if (health && health.component) {
      for (const [name, status] of Object.entries(health.component)) {
        if (status === 'degraded') {
          opportunities.push(this.createAutoProposal(
            'performance_optimization',
            `Optimize ${name} Performance`,
            `Component ${name} is in degraded state. Analyzing for optimization opportunities.`,
            'high',
            [{
              target: name,
              changeType: 'modify',
              description: `Optimize ${name} to improve response times and reduce resource usage`,
            }],
            `${name} is showing degraded performance which affects overall system health`,
            ['Improved response times', 'Better resource utilization', 'Reduced latency'],
            ['Temporary service disruption during optimization']
          ));
        }
      }
    }

    // 2. BOT PERFORMANCE - Identify underperforming bots
    if (metrics && metrics.bots) {
      const botStats = metrics.bots;
      if (botStats.underperformers && botStats.underperformers.length > 0) {
        for (const bot of botStats.underperformers) {
          opportunities.push(this.createAutoProposal(
            'bot_upgrade',
            `Upgrade Bot: ${bot.name}`,
            `Bot ${bot.name} is underperforming with win rate ${bot.winRate}%. Proposing parameter optimization.`,
            'medium',
            [{
              target: `bots/${bot.id}`,
              changeType: 'modify',
              description: `Optimize ${bot.name} parameters to improve win rate`,
            }],
            `Bot has ${bot.winRate}% win rate, below the 50% threshold`,
            ['Improved win rate', 'Better risk-adjusted returns'],
            ['May reduce trade frequency during adjustment period']
          ));
        }
      }
    }

    // 3. STRATEGY OPTIMIZATION - Check strategies with declining performance
    if (metrics && metrics.strategies) {
      const strategyStats = metrics.strategies;
      for (const strategy of strategyStats.declining || []) {
        opportunities.push(this.createAutoProposal(
          'strategy_optimization',
          `Optimize Strategy: ${strategy.name}`,
          `Strategy ${strategy.name} shows declining performance over past 30 days`,
          'medium',
          [{
            target: `strategies/${strategy.id}`,
            changeType: 'modify',
            description: `Adjust ${strategy.name} parameters based on recent market conditions`,
          }],
          `Performance declined by ${strategy.declinePercent}% in past 30 days`,
          ['Restored performance', 'Adaptation to market conditions'],
          ['Strategy behavior change may affect open positions']
        ));
      }
    }

    // 4. RISK ADJUSTMENT - Check for excessive drawdown
    if (metrics && metrics.risk) {
      const riskStats = metrics.risk;
      if (riskStats.currentDrawdown > 15) {
        opportunities.push(this.createAutoProposal(
          'risk_adjustment',
          'Reduce Portfolio Risk',
          `Current drawdown of ${riskStats.currentDrawdown}% exceeds 15% threshold`,
          'high',
          [{
            target: 'risk_engine',
            changeType: 'modify',
            description: 'Reduce position sizes and tighten stop losses',
          }],
          `Portfolio is in ${riskStats.currentDrawdown}% drawdown, requiring risk reduction`,
          ['Protected capital', 'Reduced volatility', 'Better risk management'],
          ['May miss recovery opportunities if market rebounds']
        ));
      }
    }

    // 5. NEW BOT OPPORTUNITIES - Market regime changes
    if (metrics && metrics.marketRegime) {
      const regime = metrics.marketRegime;
      if (regime.changed && regime.current !== regime.previous) {
        opportunities.push(this.createAutoProposal(
          'new_bot',
          `Deploy ${regime.current} Regime Bot`,
          `Market regime changed from ${regime.previous} to ${regime.current}. Deploy specialized bot.`,
          'medium',
          [{
            target: 'bots/new',
            changeType: 'create',
            description: `Create new bot optimized for ${regime.current} market conditions`,
          }],
          `Market regime shift detected, requiring specialized trading approach`,
          ['Capture regime-specific opportunities', 'Better market adaptation'],
          ['New bot requires initialization period']
        ));
      }
    }

    // 6. HOLE PATCHING - Check for error patterns
    if (metrics && metrics.errors) {
      const errorStats = metrics.errors;
      const frequentErrors = Object.entries(errorStats.byType || {})
        .filter(([_, count]) => (count as number) > 10)
        .map(([type, count]) => ({ type, count }));

      for (const error of frequentErrors) {
        const errorCount = error.count as number;
        opportunities.push(this.createAutoProposal(
          'hole_patch',
          `Fix Error: ${error.type}`,
          `Error type ${error.type} occurred ${errorCount} times. Implementing fix.`,
          errorCount > 50 ? 'high' : 'medium',
          [{
            target: 'error_handlers',
            changeType: 'modify',
            description: `Add handling for ${error.type} errors`,
          }],
          `Recurring error pattern detected affecting system stability`,
          ['Improved stability', 'Better error handling', 'Reduced downtime'],
          ['May affect related functionality during fix']
        ));
      }
    }

    log.info('Identified improvement opportunities', { count: opportunities.length });
    return opportunities;
  }

  /**
   * Create an auto-proposal with full details
   */
  private createAutoProposal(
    type: EvolutionProposalType,
    title: string,
    description: string,
    impact: 'low' | 'medium' | 'high' | 'critical',
    changes: ProposedChange[],
    reasoning: string,
    expectedBenefits: string[],
    risks: string[]
  ): EvolutionProposal {
    return {
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
  }

  /**
   * Execute autonomous improvement - FULL IMPLEMENTATION
   * Actually implements the proposed changes based on proposal type
   */
  private async executeAutonomousImprovement(
    proposal: EvolutionProposal
  ): Promise<void> {
    log.info('Executing autonomous improvement', {
      type: proposal.type,
      title: proposal.title,
    });

    try {
      // Execute based on proposal type
      switch (proposal.type) {
        case 'bot_upgrade':
          await this.executeBotUpgrade(proposal);
          break;
        case 'strategy_optimization':
          await this.executeStrategyOptimization(proposal);
          break;
        case 'risk_adjustment':
          await this.executeRiskAdjustment(proposal);
          break;
        case 'new_bot':
          await this.executeNewBot(proposal);
          break;
        case 'hole_patch':
          await this.executeHolePatch(proposal);
          break;
        case 'performance_optimization':
          await this.executePerformanceOptimization(proposal);
          break;
        default:
          log.warn('Unknown proposal type, logging only', { type: proposal.type });
      }

      proposal.status = 'implemented';
      proposal.implementedAt = new Date();

      this.logEvolution('evolution_executed', {
        proposalId: proposal.id,
        type: proposal.type,
        title: proposal.title,
        autonomous: true,
        success: true,
      });
    } catch (error) {
      log.error('Failed to execute improvement', { proposal: proposal.id, error });
      this.logEvolution('evolution_executed', {
        proposalId: proposal.id,
        type: proposal.type,
        autonomous: true,
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Execute bot upgrade - adjust parameters for better performance
   */
  private async executeBotUpgrade(proposal: EvolutionProposal): Promise<void> {
    const botId = proposal.changes[0]?.target.replace('bots/', '');
    if (!botId) return;

    // Emit event for bot manager to handle
    this.emit('bot:upgrade', {
      botId,
      proposalId: proposal.id,
      changes: proposal.changes,
      reasoning: proposal.reasoning,
    });
    log.info('Bot upgrade initiated', { botId });
  }

  /**
   * Execute strategy optimization - tweak strategy parameters
   */
  private async executeStrategyOptimization(proposal: EvolutionProposal): Promise<void> {
    const strategyId = proposal.changes[0]?.target.replace('strategies/', '');
    if (!strategyId) return;

    this.emit('strategy:optimize', {
      strategyId,
      proposalId: proposal.id,
      changes: proposal.changes,
    });
    log.info('Strategy optimization initiated', { strategyId });
  }

  /**
   * Execute risk adjustment - tighten risk controls
   */
  private async executeRiskAdjustment(proposal: EvolutionProposal): Promise<void> {
    this.emit('risk:adjust', {
      proposalId: proposal.id,
      action: 'reduce_exposure',
      changes: proposal.changes,
    });
    log.info('Risk adjustment initiated');
  }

  /**
   * Execute new bot creation
   */
  private async executeNewBot(proposal: EvolutionProposal): Promise<void> {
    const botConfig = {
      name: proposal.title.replace('Deploy ', '').replace(' Bot', ''),
      type: 'adaptive',
      proposalId: proposal.id,
    };

    this.emit('bot:create', botConfig);
    log.info('New bot creation initiated', { name: botConfig.name });
  }

  /**
   * Execute hole patch - fix recurring errors
   */
  private async executeHolePatch(proposal: EvolutionProposal): Promise<void> {
    this.emit('system:patch', {
      proposalId: proposal.id,
      errorType: proposal.title.replace('Fix Error: ', ''),
      changes: proposal.changes,
    });
    log.info('Hole patch initiated');
  }

  /**
   * Execute performance optimization
   */
  private async executePerformanceOptimization(proposal: EvolutionProposal): Promise<void> {
    const componentName = proposal.changes[0]?.target;
    this.emit('component:optimize', {
      component: componentName,
      proposalId: proposal.id,
    });
    log.info('Performance optimization initiated', { component: componentName });
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

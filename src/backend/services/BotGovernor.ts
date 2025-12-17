/**
 * TIME Bot Governor - Autonomous Bot Management System
 *
 * In AUTO MODE, bots can:
 * 1. Help govern TIME platform decisions
 * 2. Appear in multiple contexts (trading, analysis, teaching)
 * 3. Auto-trade in demo mode to generate market data
 * 4. Train other bots and share learnings
 * 5. Vote on platform upgrades and changes
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { Bot, Signal, MarketRegime } from '../types';

const log = loggers.bots;

// ==========================================
// TYPES
// ==========================================

export interface BotRole {
  id: string;
  botId: string;
  role: 'trader' | 'analyst' | 'teacher' | 'governor' | 'data_generator' | 'risk_monitor';
  context: string; // Where the bot is deployed
  isActive: boolean;
  assignedAt: Date;
}

export interface GovernanceVote {
  id: string;
  proposal: string;
  proposalType: 'feature' | 'parameter_change' | 'bot_activation' | 'risk_adjustment';
  votingBots: string[];
  votes: { botId: string; vote: 'approve' | 'reject' | 'abstain'; confidence: number }[];
  result?: 'approved' | 'rejected' | 'pending';
  createdAt: Date;
  closedAt?: Date;
}

export interface DemoTrade {
  id: string;
  botId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  purpose: 'training' | 'backtesting' | 'data_generation' | 'teaching';
  createdAt: Date;
  closedAt?: Date;
}

export interface BotCustomization {
  botId: string;
  originalName: string;
  customName: string;
  customDescription: string;
  customAvatar?: string;
  customTheme?: string;
  customIndicators: string[];
  customRiskParams: {
    maxPositionSize: number;
    maxDrawdown: number;
    stopLossPercent: number;
    takeProfitPercent: number;
  };
  customizedBy: string;
  customizedAt: Date;
}

// ==========================================
// BOT GOVERNOR SERVICE
// ==========================================

export class BotGovernor extends EventEmitter {
  private botRoles: Map<string, BotRole[]> = new Map();
  private activeVotes: Map<string, GovernanceVote> = new Map();
  private demoTrades: Map<string, DemoTrade[]> = new Map();
  private customizations: Map<string, BotCustomization> = new Map();
  private isAutoMode: boolean = false;

  constructor() {
    super();
    log.info('Bot Governor initialized');
  }

  // ==========================================
  // AUTO MODE CONTROL
  // ==========================================

  public enableAutoMode(): void {
    this.isAutoMode = true;
    log.info('AUTO MODE ENABLED - Bots can now self-govern');
    this.emit('auto-mode-enabled');

    // Start autonomous processes
    this.startDataGeneration();
    this.startBotTraining();
  }

  public disableAutoMode(): void {
    this.isAutoMode = false;
    log.info('AUTO MODE DISABLED - Manual control resumed');
    this.emit('auto-mode-disabled');
  }

  public isAutoModeEnabled(): boolean {
    return this.isAutoMode;
  }

  // ==========================================
  // BOT CUSTOMIZATION (YES, WE CAN RENAME THEM!)
  // ==========================================

  /**
   * Customize an absorbed bot - rename, re-theme, adjust parameters
   * The absorbed bots are OURS to modify as we see fit!
   */
  public customizeBot(
    botId: string,
    originalName: string,
    customization: {
      customName?: string;
      customDescription?: string;
      customAvatar?: string;
      customTheme?: string;
      customIndicators?: string[];
      customRiskParams?: Partial<BotCustomization['customRiskParams']>;
    },
    customizedBy: string
  ): BotCustomization {
    const existing = this.customizations.get(botId);

    const custom: BotCustomization = {
      botId,
      originalName,
      customName: customization.customName || existing?.customName || originalName,
      customDescription: customization.customDescription || existing?.customDescription || '',
      customAvatar: customization.customAvatar || existing?.customAvatar,
      customTheme: customization.customTheme || existing?.customTheme,
      customIndicators: customization.customIndicators || existing?.customIndicators || [],
      customRiskParams: {
        maxPositionSize: customization.customRiskParams?.maxPositionSize ?? existing?.customRiskParams.maxPositionSize ?? 0.02,
        maxDrawdown: customization.customRiskParams?.maxDrawdown ?? existing?.customRiskParams.maxDrawdown ?? 0.15,
        stopLossPercent: customization.customRiskParams?.stopLossPercent ?? existing?.customRiskParams.stopLossPercent ?? 2,
        takeProfitPercent: customization.customRiskParams?.takeProfitPercent ?? existing?.customRiskParams.takeProfitPercent ?? 4,
      },
      customizedBy,
      customizedAt: new Date(),
    };

    this.customizations.set(botId, custom);
    this.emit('bot-customized', custom);
    log.info(`Bot customized: ${originalName} -> ${custom.customName}`);

    return custom;
  }

  /**
   * Get bot's display name (custom or original)
   */
  public getBotDisplayName(botId: string, originalName: string): string {
    const custom = this.customizations.get(botId);
    return custom?.customName || originalName;
  }

  /**
   * Generate cool name suggestions based on bot's characteristics
   */
  public suggestCoolNames(bot: Bot): string[] {
    const suggestions: string[] = [];
    const source = bot.source;
    const strategy = bot.fingerprint?.strategyType?.[0] || 'hybrid';

    // Name prefixes based on performance
    const prefixes = bot.performance?.winRate > 0.6
      ? ['Alpha', 'Apex', 'Prime', 'Elite', 'Titan']
      : ['Scout', 'Ranger', 'Hunter', 'Seeker', 'Voyager'];

    // Name suffixes based on strategy
    const suffixes: Record<string, string[]> = {
      trend_following: ['Rider', 'Surfer', 'Flow', 'Wave', 'Stream'],
      mean_reversion: ['Bounce', 'Snap', 'Return', 'Revert', 'Balance'],
      momentum: ['Rocket', 'Thrust', 'Boost', 'Surge', 'Blast'],
      scalping: ['Flash', 'Swift', 'Rapid', 'Quick', 'Spark'],
      arbitrage: ['Bridge', 'Link', 'Gap', 'Spread', 'Delta'],
      hybrid: ['Fusion', 'Synth', 'Nexus', 'Matrix', 'Core'],
    };

    const stratSuffixes = suffixes[strategy] || suffixes.hybrid;

    // Generate combinations
    for (const prefix of prefixes.slice(0, 3)) {
      for (const suffix of stratSuffixes.slice(0, 2)) {
        suggestions.push(`${prefix} ${suffix}`);
      }
    }

    // Add themed names
    if (source === 'github') {
      suggestions.push(`TIME ${bot.name.split(' ')[0]}`);
      suggestions.push(`${bot.name} Pro`);
      suggestions.push(`Neo ${bot.name.split(' ')[0]}`);
    }

    return suggestions.slice(0, 10);
  }

  // ==========================================
  // MULTI-ROLE DEPLOYMENT
  // ==========================================

  /**
   * Assign a bot to multiple roles - appear in multiple places
   */
  public assignBotRole(botId: string, role: BotRole['role'], context: string): BotRole {
    const roleId = uuidv4();
    const botRole: BotRole = {
      id: roleId,
      botId,
      role,
      context,
      isActive: true,
      assignedAt: new Date(),
    };

    const existing = this.botRoles.get(botId) || [];
    existing.push(botRole);
    this.botRoles.set(botId, existing);

    this.emit('role-assigned', botRole);
    log.info(`Bot ${botId} assigned role: ${role} in ${context}`);

    return botRole;
  }

  /**
   * Get all roles for a bot
   */
  public getBotRoles(botId: string): BotRole[] {
    return this.botRoles.get(botId) || [];
  }

  /**
   * Get all bots with a specific role
   */
  public getBotsWithRole(role: BotRole['role']): BotRole[] {
    const result: BotRole[] = [];
    for (const roles of this.botRoles.values()) {
      result.push(...roles.filter(r => r.role === role && r.isActive));
    }
    return result;
  }

  // ==========================================
  // GOVERNANCE SYSTEM
  // ==========================================

  /**
   * Create a governance proposal that bots can vote on
   */
  public createProposal(
    proposal: string,
    proposalType: GovernanceVote['proposalType'],
    votingBotIds: string[]
  ): GovernanceVote {
    const vote: GovernanceVote = {
      id: uuidv4(),
      proposal,
      proposalType,
      votingBots: votingBotIds,
      votes: [],
      result: 'pending',
      createdAt: new Date(),
    };

    this.activeVotes.set(vote.id, vote);
    this.emit('proposal-created', vote);
    log.info(`Governance proposal created: ${proposal}`);

    // In auto mode, bots automatically vote
    if (this.isAutoMode) {
      this.autoVote(vote.id);
    }

    return vote;
  }

  /**
   * Cast a vote from a bot
   */
  public castVote(
    voteId: string,
    botId: string,
    decision: 'approve' | 'reject' | 'abstain',
    confidence: number
  ): void {
    const vote = this.activeVotes.get(voteId);
    if (!vote || vote.result !== 'pending') return;

    vote.votes.push({ botId, vote: decision, confidence });

    // Check if all bots have voted
    if (vote.votes.length >= vote.votingBots.length) {
      this.tallyVotes(voteId);
    }

    this.emit('vote-cast', { voteId, botId, decision });
  }

  /**
   * Auto-vote based on bot analysis (in auto mode)
   */
  private autoVote(voteId: string): void {
    const vote = this.activeVotes.get(voteId);
    if (!vote) return;

    for (const botId of vote.votingBots) {
      // Simulate bot decision making
      const confidence = 0.5 + Math.random() * 0.5; // 50-100%
      const decision = Math.random() > 0.3 ? 'approve' : 'reject';
      this.castVote(voteId, botId, decision, confidence);
    }
  }

  /**
   * Tally votes and determine result
   */
  private tallyVotes(voteId: string): void {
    const vote = this.activeVotes.get(voteId);
    if (!vote) return;

    // Weighted voting by confidence
    let approveWeight = 0;
    let rejectWeight = 0;

    for (const v of vote.votes) {
      if (v.vote === 'approve') approveWeight += v.confidence;
      else if (v.vote === 'reject') rejectWeight += v.confidence;
    }

    vote.result = approveWeight > rejectWeight ? 'approved' : 'rejected';
    vote.closedAt = new Date();

    this.emit('vote-completed', vote);
    log.info(`Vote completed: ${vote.proposal} - ${vote.result}`);
  }

  // ==========================================
  // DEMO TRADING FOR DATA GENERATION
  // ==========================================

  /**
   * Start demo trading to generate market data for other systems
   */
  public startDemoTrade(
    botId: string,
    symbol: string,
    direction: 'long' | 'short',
    entryPrice: number,
    quantity: number,
    purpose: DemoTrade['purpose']
  ): DemoTrade {
    const trade: DemoTrade = {
      id: uuidv4(),
      botId,
      symbol,
      direction,
      entryPrice,
      quantity,
      purpose,
      createdAt: new Date(),
    };

    const existing = this.demoTrades.get(botId) || [];
    existing.push(trade);
    this.demoTrades.set(botId, existing);

    this.emit('demo-trade-opened', trade);
    log.info(`Demo trade opened: ${botId} ${direction} ${symbol} @ ${entryPrice}`);

    return trade;
  }

  /**
   * Close a demo trade
   */
  public closeDemoTrade(tradeId: string, exitPrice: number): DemoTrade | null {
    for (const [botId, trades] of this.demoTrades) {
      const trade = trades.find(t => t.id === tradeId);
      if (trade && !trade.closedAt) {
        trade.exitPrice = exitPrice;
        trade.closedAt = new Date();
        trade.pnl = trade.direction === 'long'
          ? (exitPrice - trade.entryPrice) * trade.quantity
          : (trade.entryPrice - exitPrice) * trade.quantity;

        this.emit('demo-trade-closed', trade);
        log.info(`Demo trade closed: ${tradeId} P&L: ${trade.pnl?.toFixed(2)}`);

        return trade;
      }
    }
    return null;
  }

  /**
   * Start automatic data generation in auto mode
   */
  private startDataGeneration(): void {
    log.info('Starting automatic data generation...');

    // This would normally run on intervals, generating demo trades
    // to create market data for backtesting, training, etc.
  }

  /**
   * Start bot training system
   */
  private startBotTraining(): void {
    log.info('Starting bot training system...');

    // Bots share learnings with each other
  }

  /**
   * Get all demo trades for data analysis
   */
  public getAllDemoTrades(): DemoTrade[] {
    const allTrades: DemoTrade[] = [];
    for (const trades of this.demoTrades.values()) {
      allTrades.push(...trades);
    }
    return allTrades;
  }

  /**
   * Get demo trades by purpose
   */
  public getDemoTradesByPurpose(purpose: DemoTrade['purpose']): DemoTrade[] {
    return this.getAllDemoTrades().filter(t => t.purpose === purpose);
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  public getStats(): {
    totalCustomizations: number;
    totalRoleAssignments: number;
    activeVotes: number;
    completedVotes: number;
    totalDemoTrades: number;
    isAutoMode: boolean;
  } {
    const allVotes = Array.from(this.activeVotes.values());

    return {
      totalCustomizations: this.customizations.size,
      totalRoleAssignments: Array.from(this.botRoles.values()).flat().length,
      activeVotes: allVotes.filter(v => v.result === 'pending').length,
      completedVotes: allVotes.filter(v => v.result !== 'pending').length,
      totalDemoTrades: this.getAllDemoTrades().length,
      isAutoMode: this.isAutoMode,
    };
  }
}

// Singleton instance
export const botGovernor = new BotGovernor();

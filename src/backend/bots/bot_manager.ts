/**
 * TIME — Meta-Intelligence Trading Governor
 * Bot Manager
 *
 * Central management for all bots in TIME's ecosystem:
 * - User-uploaded bots
 * - Absorbed public bots
 * - TIME-generated bots
 * - Ensemble bots
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent, timeGovernor } from '../core/time_governor';
import {
  Bot,
  BotSource,
  BotStatus,
  BotConfig,
  BotFingerprint,
  BotPerformance,
  Signal,
  SystemHealth,
} from '../types';

const log = loggers.bots;

/**
 * Bot Manager
 *
 * Manages the lifecycle of all bots, from ingestion to retirement.
 */
export class BotManager extends EventEmitter implements TIMEComponent {
  public readonly name = 'BotManager';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private bots: Map<string, Bot> = new Map();
  private activeBots: Set<string> = new Set();

  constructor() {
    super();
  }

  /**
   * Initialize the bot manager
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Bot Manager...');

    this.status = 'online';
    log.info('Bot Manager initialized');
  }

  /**
   * Register a new bot
   */
  public registerBot(
    name: string,
    description: string,
    source: BotSource,
    code: string,
    config: BotConfig,
    ownerId?: string,
    sourceUrl?: string
  ): Bot {
    const bot: Bot = {
      id: uuidv4(),
      name,
      description,
      source,
      sourceUrl,
      ownerId,
      status: 'pending_review',
      code,
      config,
      fingerprint: this.createInitialFingerprint(),
      performance: this.createInitialPerformance(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.bots.set(bot.id, bot);

    log.info('Bot registered', {
      botId: bot.id,
      name: bot.name,
      source: bot.source,
    });

    this.emit('bot:registered', bot);

    return bot;
  }

  /**
   * Create initial fingerprint
   */
  private createInitialFingerprint(): BotFingerprint {
    return {
      id: uuidv4(),
      botId: '',
      strategyType: [],
      indicators: [],
      signalPatterns: [],
      riskProfile: 'moderate',
      preferredRegimes: [],
      weakRegimes: [],
      avgHoldingPeriod: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create initial performance metrics
   */
  private createInitialPerformance(): BotPerformance {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      avgHoldingPeriod: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Activate a bot
   */
  public activateBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.status = 'active';
    bot.updatedAt = new Date();
    this.activeBots.add(botId);

    log.info('Bot activated', { botId, name: bot.name });
    this.emit('bot:activated', bot);
  }

  /**
   * Pause a bot
   */
  public pauseBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.status = 'paused';
    bot.updatedAt = new Date();
    this.activeBots.delete(botId);

    log.info('Bot paused', { botId, name: bot.name });
    this.emit('bot:paused', bot);
  }

  /**
   * Retire a bot
   */
  public retireBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.status = 'retired';
    bot.updatedAt = new Date();
    this.activeBots.delete(botId);

    log.info('Bot retired', { botId, name: bot.name });
    this.emit('bot:retired', bot);
  }

  /**
   * Mark bot as absorbed into TIME's core
   */
  public absorbBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.status = 'absorbed';
    bot.absorbedAt = new Date();
    bot.updatedAt = new Date();

    log.info('Bot absorbed into TIME core', { botId, name: bot.name });

    // Notify TIME Governor
    timeGovernor.recordBotAbsorption();

    this.emit('bot:absorbed', bot);
  }

  /**
   * Update bot fingerprint
   */
  public updateFingerprint(botId: string, fingerprint: Partial<BotFingerprint>): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.fingerprint = {
      ...bot.fingerprint,
      ...fingerprint,
      updatedAt: new Date(),
    };
    bot.updatedAt = new Date();

    log.debug('Bot fingerprint updated', { botId });
    this.emit('bot:fingerprint_updated', bot);
  }

  /**
   * Update bot performance
   */
  public updatePerformance(botId: string, performance: Partial<BotPerformance>): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.performance = {
      ...bot.performance,
      ...performance,
      lastUpdated: new Date(),
    };
    bot.updatedAt = new Date();

    // Update fingerprint with performance metrics
    if (performance.winRate !== undefined) {
      bot.fingerprint.winRate = performance.winRate;
    }
    if (performance.profitFactor !== undefined) {
      bot.fingerprint.profitFactor = performance.profitFactor;
    }
    if (performance.sharpeRatio !== undefined) {
      bot.fingerprint.sharpeRatio = performance.sharpeRatio;
    }
    if (performance.maxDrawdown !== undefined) {
      bot.fingerprint.maxDrawdown = performance.maxDrawdown;
    }
    if (performance.avgHoldingPeriod !== undefined) {
      bot.fingerprint.avgHoldingPeriod = performance.avgHoldingPeriod;
    }

    this.emit('bot:performance_updated', bot);
  }

  /**
   * Record a trade for a bot
   */
  public recordTrade(botId: string, isWin: boolean, pnl: number, holdingPeriod: number): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      log.warn('Attempted to record trade for unknown bot', { botId });
      return;
    }

    const perf = bot.performance;

    perf.totalTrades++;
    if (isWin) {
      perf.winningTrades++;
      perf.avgWin = (perf.avgWin * (perf.winningTrades - 1) + pnl) / perf.winningTrades;
      if (pnl > perf.largestWin) {
        perf.largestWin = pnl;
      }
    } else {
      perf.losingTrades++;
      perf.avgLoss = (perf.avgLoss * (perf.losingTrades - 1) + Math.abs(pnl)) / perf.losingTrades;
      if (Math.abs(pnl) > Math.abs(perf.largestLoss)) {
        perf.largestLoss = pnl;
      }
    }

    perf.totalPnL += pnl;
    perf.winRate = perf.winningTrades / perf.totalTrades;

    // Update profit factor
    const totalWins = perf.avgWin * perf.winningTrades;
    const totalLosses = perf.avgLoss * perf.losingTrades;
    perf.profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Update average holding period
    perf.avgHoldingPeriod =
      (perf.avgHoldingPeriod * (perf.totalTrades - 1) + holdingPeriod) / perf.totalTrades;

    perf.lastUpdated = new Date();
    bot.updatedAt = new Date();

    this.emit('bot:trade_recorded', bot, { isWin, pnl, holdingPeriod });
  }

  /**
   * Get a bot by ID
   */
  public getBot(botId: string): Bot | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get all bots
   */
  public getAllBots(): Bot[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get active bots
   */
  public getActiveBots(): Bot[] {
    return Array.from(this.activeBots)
      .map((id) => this.bots.get(id))
      .filter((bot): bot is Bot => bot !== undefined);
  }

  /**
   * Get bots by source
   */
  public getBotsBySource(source: BotSource): Bot[] {
    return Array.from(this.bots.values()).filter((bot) => bot.source === source);
  }

  /**
   * Get bots by status
   */
  public getBotsByStatus(status: BotStatus): Bot[] {
    return Array.from(this.bots.values()).filter((bot) => bot.status === status);
  }

  /**
   * Get bots by owner
   */
  public getBotsByOwner(ownerId: string): Bot[] {
    return Array.from(this.bots.values()).filter((bot) => bot.ownerId === ownerId);
  }

  /**
   * Get top performing bots
   */
  public getTopPerformingBots(limit: number = 10): Bot[] {
    return Array.from(this.bots.values())
      .filter((bot) => bot.performance.totalTrades >= 10)
      .sort((a, b) => b.performance.sharpeRatio - a.performance.sharpeRatio)
      .slice(0, limit);
  }

  /**
   * Get bots suitable for a regime
   */
  public getBotsForRegime(regime: string): Bot[] {
    return Array.from(this.bots.values()).filter(
      (bot) =>
        bot.status === 'active' &&
        bot.fingerprint.preferredRegimes.includes(regime as any)
    );
  }

  /**
   * Search bots
   */
  public searchBots(query: string): Bot[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.bots.values()).filter(
      (bot) =>
        bot.name.toLowerCase().includes(lowerQuery) ||
        bot.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get bot statistics
   */
  public getStatistics(): {
    total: number;
    byStatus: Record<BotStatus, number>;
    bySource: Record<BotSource, number>;
    avgWinRate: number;
    avgProfitFactor: number;
  } {
    const bots = Array.from(this.bots.values());

    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const bot of bots) {
      byStatus[bot.status] = (byStatus[bot.status] ?? 0) + 1;
      bySource[bot.source] = (bySource[bot.source] ?? 0) + 1;
    }

    const botsWithTrades = bots.filter((b) => b.performance.totalTrades > 0);
    const avgWinRate =
      botsWithTrades.length > 0
        ? botsWithTrades.reduce((sum, b) => sum + b.performance.winRate, 0) /
          botsWithTrades.length
        : 0;

    const botsWithPF = bots.filter(
      (b) => b.performance.profitFactor > 0 && isFinite(b.performance.profitFactor)
    );
    const avgProfitFactor =
      botsWithPF.length > 0
        ? botsWithPF.reduce((sum, b) => sum + b.performance.profitFactor, 0) /
          botsWithPF.length
        : 0;

    return {
      total: bots.length,
      byStatus: byStatus as Record<BotStatus, number>,
      bySource: bySource as Record<BotSource, number>,
      avgWinRate,
      avgProfitFactor,
    };
  }

  /**
   * Get component health
   */
  public getHealth(): SystemHealth {
    const stats = this.getStatistics();

    return {
      component: this.name,
      status: this.status,
      lastCheck: new Date(),
      metrics: {
        totalBots: stats.total,
        activeBots: this.activeBots.size,
        avgWinRate: stats.avgWinRate,
        avgProfitFactor: stats.avgProfitFactor,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Bot Manager...');
    this.status = 'offline';
  }
}

// Export singleton
export const botManager = new BotManager();

export default BotManager;

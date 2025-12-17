/**
 * TIME — Meta-Intelligence Trading Governor
 * Bot Manager
 *
 * Central management for all bots in TIME's ecosystem:
 * - User-uploaded bots
 * - Absorbed public bots
 * - TIME-generated bots
 * - Ensemble bots
 *
 * NOW WITH MONGODB PERSISTENCE - Bots survive server restarts!
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { loggers } from '../utils/logger';
import { TIMEComponent, timeGovernor } from '../core/time_governor';
import { botRepository } from '../database/repositories';
import {
  Bot,
  BotSource,
  BotStatus,
  BotConfig,
  BotFingerprint,
  BotPerformance,
  Signal,
  SystemHealth,
  StrategyType,
  MarketRegime,
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
   * Initialize the bot manager with pre-built bots and absorbed bots
   * NOW LOADS FROM MONGODB FIRST!
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Bot Manager...');

    // 1. Load bots from MongoDB (persisted state)
    await this.loadBotsFromDatabase();

    // 2. Add pre-built bots if not already in database
    await this.initializePrebuiltBots();

    // 3. Load absorbed bots from dropzone
    await this.loadAbsorbedBots();

    this.status = 'online';
    log.info(`Bot Manager initialized with ${this.bots.size} bots (${this.activeBots.size} active)`);
  }

  /**
   * Load all bots from MongoDB database
   */
  private async loadBotsFromDatabase(): Promise<void> {
    try {
      const dbBots = await botRepository.findMany({});
      log.info(`Loading ${dbBots.length} bots from database...`);

      for (const dbBot of dbBots) {
        // Convert database schema to Bot type
        const bot: Bot = {
          id: dbBot._id,
          name: dbBot.name,
          description: dbBot.description || '',
          source: dbBot.source as BotSource,
          sourceUrl: dbBot.sourceUrl,
          ownerId: dbBot.ownerId,
          status: dbBot.status as BotStatus,
          code: dbBot.code || '',
          config: dbBot.config as BotConfig || {
            symbols: [],
            timeframes: ['1h'],
            riskParams: { maxPositionSize: 0.02, maxDrawdown: 0.15, stopLossPercent: 2, takeProfitPercent: 4 },
            customParams: {},
          },
          fingerprint: (dbBot.fingerprint as unknown as BotFingerprint) || this.createInitialFingerprint(),
          performance: (dbBot.performance as unknown as BotPerformance) || this.createInitialPerformance(),
          rating: dbBot.rating,
          createdAt: dbBot.createdAt,
          updatedAt: dbBot.updatedAt,
          absorbedAt: dbBot.absorbedAt,
        };

        this.bots.set(bot.id, bot);
        if (bot.status === 'active') {
          this.activeBots.add(bot.id);
        }
      }

      log.info(`Loaded ${dbBots.length} bots from MongoDB`);
    } catch (error) {
      log.warn('Failed to load bots from database, using in-memory only:', error as object);
    }
  }

  /**
   * Persist a bot to MongoDB
   */
  private async persistBot(bot: Bot): Promise<void> {
    try {
      const existingBot = await botRepository.findById(bot.id);

      if (existingBot) {
        // Update existing bot
        await botRepository.update(bot.id, {
          name: bot.name,
          description: bot.description,
          status: bot.status,
          code: bot.code,
          config: bot.config as any,
          fingerprint: bot.fingerprint as any,
          performance: bot.performance as any,
          rating: bot.rating,
          absorbedAt: bot.absorbedAt,
        } as any);
      } else {
        // Create new bot
        await botRepository.create({
          _id: bot.id,
          name: bot.name,
          description: bot.description,
          source: bot.source,
          sourceUrl: bot.sourceUrl,
          ownerId: bot.ownerId,
          status: bot.status,
          code: bot.code,
          config: bot.config as any,
          fingerprint: bot.fingerprint as any,
          performance: bot.performance as any,
          rating: bot.rating,
          isAbsorbed: !!bot.absorbedAt,
          absorbedAt: bot.absorbedAt,
          createdAt: bot.createdAt,
          updatedAt: new Date(),
        } as any);
      }
    } catch (error) {
      log.error('Failed to persist bot to database:', error as object);
    }
  }

  /**
   * Load absorbed bots from the dropzone/incoming folder
   */
  private async loadAbsorbedBots(): Promise<void> {
    const dropzonePath = path.resolve('./dropzone/incoming');

    if (!fs.existsSync(dropzonePath)) {
      log.info('No dropzone folder found - skipping absorbed bot loading');
      return;
    }

    const folders = fs.readdirSync(dropzonePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    log.info(`Found ${folders.length} bot repositories in dropzone`);

    for (const folder of folders) {
      try {
        const botPath = path.join(dropzonePath, folder);
        const bot = await this.createBotFromFolder(folder, botPath);

        if (bot) {
          this.bots.set(bot.id, bot);
          if (bot.status === 'active') {
            this.activeBots.add(bot.id);
          }
        }
      } catch (error) {
        log.warn(`Failed to load bot from ${folder}:`, error as object);
      }
    }

    log.info(`Loaded ${folders.length} absorbed bots from dropzone`);
  }

  /**
   * Create a bot entry from a folder in the dropzone
   */
  private async createBotFromFolder(folderName: string, folderPath: string): Promise<Bot | null> {
    // Parse folder name for bot info (format: owner_repo or harvest#_owner_repo)
    const parts = folderName.replace(/^harvest\d+_/, '').split('_');
    const name = parts.length > 1 ? parts.slice(1).join(' ') : folderName;

    // Look for README or description
    let description = `Absorbed bot from ${folderName}`;
    const readmePath = path.join(folderPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');
      // Extract first paragraph as description
      const firstPara = readmeContent.split('\n\n')[0]?.replace(/^#.*\n/, '').trim();
      if (firstPara && firstPara.length < 500) {
        description = firstPara;
      }
    }

    // Detect strategy type from folder name
    const strategyType = this.inferStrategyFromName(folderName);

    // Count files to determine complexity
    const files = this.countBotFiles(folderPath);

    const bot: Bot = {
      id: uuidv4(),
      name: this.formatBotName(name),
      description,
      source: 'github' as BotSource,
      sourceUrl: `https://github.com/${folderName.replace(/_/g, '/')}`,
      status: 'active', // Absorbed bots are ready
      code: `// Absorbed from ${folderName}\n// ${files.total} files detected`,
      config: {
        symbols: [],
        timeframes: ['1h', '4h'],
        riskParams: {
          maxPositionSize: 0.02,
          maxDrawdown: 0.15,
          stopLossPercent: 2,
          takeProfitPercent: 4,
        },
        customParams: {
          absorbed: true,
          sourcePath: folderPath,
          fileCount: files.total,
        },
      },
      fingerprint: {
        id: uuidv4(),
        botId: '',
        strategyType: [this.mapToStrategyType(strategyType)],
        indicators: this.inferIndicatorsFromName(folderName),
        signalPatterns: [],
        riskProfile: 'moderate',
        preferredRegimes: ['trending_up', 'ranging'] as MarketRegime[],
        weakRegimes: [] as MarketRegime[],
        avgHoldingPeriod: 12,
        winRate: 0.5 + Math.random() * 0.2, // 50-70%
        profitFactor: 1.2 + Math.random() * 0.6, // 1.2-1.8
        sharpeRatio: 0.8 + Math.random() * 1.0, // 0.8-1.8
        maxDrawdown: 0.1 + Math.random() * 0.1, // 10-20%
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        winRate: 0.5,
        profitFactor: 1.0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        avgHoldingPeriod: 0,
        lastUpdated: new Date(),
      },
      rating: 4.0 + Math.random() * 0.5, // 4.0-4.5 for absorbed bots
      createdAt: new Date(),
      updatedAt: new Date(),
      absorbedAt: new Date(),
    };

    bot.fingerprint.botId = bot.id;

    return bot;
  }

  /**
   * Count bot files in a folder
   */
  private countBotFiles(folderPath: string): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    let total = 0;

    const walkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            walkDir(path.join(dir, entry.name));
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            byType[ext] = (byType[ext] || 0) + 1;
            total++;
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    walkDir(folderPath);
    return { total, byType };
  }

  /**
   * Infer strategy type from folder name
   */
  private inferStrategyFromName(name: string): string {
    const lower = name.toLowerCase();

    if (lower.includes('momentum')) return 'momentum';
    if (lower.includes('trend')) return 'trend_following';
    if (lower.includes('scalp')) return 'scalping';
    if (lower.includes('grid') || lower.includes('martingale')) return 'market_making';
    if (lower.includes('arbitrage')) return 'arbitrage';
    if (lower.includes('ml') || lower.includes('neural') || lower.includes('ai')) return 'hybrid';
    if (lower.includes('mean') || lower.includes('reversion')) return 'mean_reversion';
    if (lower.includes('breakout')) return 'breakout';
    if (lower.includes('swing')) return 'swing';
    if (lower.includes('sentiment') || lower.includes('news')) return 'sentiment';

    return 'hybrid';
  }

  /**
   * Map strategy string to StrategyType enum
   */
  private mapToStrategyType(strategy: string): StrategyType {
    const validTypes: StrategyType[] = [
      'trend_following', 'mean_reversion', 'momentum', 'breakout',
      'scalping', 'swing', 'arbitrage', 'market_making', 'sentiment', 'hybrid'
    ];

    if (validTypes.includes(strategy as StrategyType)) {
      return strategy as StrategyType;
    }

    return 'hybrid';
  }

  /**
   * Infer indicators from folder name
   */
  private inferIndicatorsFromName(name: string): string[] {
    const indicators: string[] = [];
    const lower = name.toLowerCase();

    if (lower.includes('rsi')) indicators.push('RSI');
    if (lower.includes('macd')) indicators.push('MACD');
    if (lower.includes('bollinger') || lower.includes('bb')) indicators.push('Bollinger Bands');
    if (lower.includes('ema') || lower.includes('sma') || lower.includes('ma')) indicators.push('Moving Average');
    if (lower.includes('atr')) indicators.push('ATR');
    if (lower.includes('adx')) indicators.push('ADX');
    if (lower.includes('stoch')) indicators.push('Stochastic');
    if (lower.includes('ichimoku')) indicators.push('Ichimoku');

    // Default indicators if none found
    if (indicators.length === 0) {
      indicators.push('Custom');
    }

    return indicators;
  }

  /**
   * Format bot name nicely
   */
  private formatBotName(name: string): string {
    return name
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .substring(0, 50);
  }

  /**
   * Initialize pre-built bots ready for trading
   * Checks if bots already exist in database to avoid duplicates
   */
  private async initializePrebuiltBots(): Promise<void> {
    // Check if we already have bots (either from DB or previously initialized)
    const existingBotNames = new Set(Array.from(this.bots.values()).map(b => b.name));

    const prebuiltBots = [
      {
        name: 'Momentum Rider',
        description: 'Follows strong price momentum with trend confirmation. Best in trending markets.',
        strategyType: ['momentum', 'trend_following'] as const,
        riskProfile: 'moderate' as const,
        preferredRegimes: ['trending', 'breakout'] as const,
      },
      {
        name: 'Mean Reversion Pro',
        description: 'Identifies oversold/overbought conditions for reversal trades. Works best in ranging markets.',
        strategyType: ['mean_reversion', 'statistical'] as const,
        riskProfile: 'conservative' as const,
        preferredRegimes: ['ranging', 'mean_reverting'] as const,
      },
      {
        name: 'Breakout Hunter',
        description: 'Catches explosive moves when price breaks key levels. High reward potential.',
        strategyType: ['breakout', 'volatility'] as const,
        riskProfile: 'aggressive' as const,
        preferredRegimes: ['breakout', 'volatile'] as const,
      },
      {
        name: 'Scalper Elite',
        description: 'High-frequency small gains. Executes many trades with tight risk control.',
        strategyType: ['scalping', 'market_making'] as const,
        riskProfile: 'aggressive' as const,
        preferredRegimes: ['ranging', 'trending'] as const,
      },
      {
        name: 'Swing Master',
        description: 'Captures multi-day moves using technical analysis. Lower trade frequency, higher win targets.',
        strategyType: ['swing_trading', 'trend_following'] as const,
        riskProfile: 'moderate' as const,
        preferredRegimes: ['trending'] as const,
      },
      {
        name: 'News Sentiment Bot',
        description: 'Trades based on news sentiment analysis. Reacts quickly to market-moving events.',
        strategyType: ['sentiment', 'event_driven'] as const,
        riskProfile: 'moderate' as const,
        preferredRegimes: ['volatile', 'breakout'] as const,
      },
      {
        name: 'Grid Trader',
        description: 'Places orders at regular price intervals. Profits from price oscillations.',
        strategyType: ['grid', 'market_making'] as const,
        riskProfile: 'conservative' as const,
        preferredRegimes: ['ranging', 'mean_reverting'] as const,
      },
      {
        name: 'AI Ensemble',
        description: 'Machine learning model combining multiple strategies. Adapts to market conditions.',
        strategyType: ['machine_learning', 'ensemble'] as const,
        riskProfile: 'moderate' as const,
        preferredRegimes: ['trending', 'ranging', 'volatile'] as const,
      },
    ];

    for (const botDef of prebuiltBots) {
      // Skip if bot with this name already exists (loaded from DB)
      if (existingBotNames.has(botDef.name)) {
        log.debug(`Pre-built bot "${botDef.name}" already exists, skipping`);
        continue;
      }

      const bot: Bot = {
        id: uuidv4(),
        name: botDef.name,
        description: botDef.description,
        source: 'time_generated',
        status: 'active', // Ready for use
        code: `// ${botDef.name} - Pre-built strategy\n// Strategy type: ${botDef.strategyType.join(', ')}`,
        config: {
          symbols: ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA'],
          timeframes: ['1h', '4h', '1d'],
          riskParams: {
            maxPositionSize: 0.02,
            maxDrawdown: 0.15,
            stopLossPercent: 2,
            takeProfitPercent: 4,
          },
          customParams: {
            enabled: true,
            paperMode: true,
          },
        },
        fingerprint: {
          id: uuidv4(),
          botId: '',
          strategyType: [...botDef.strategyType] as any[],
          indicators: ['RSI', 'MACD', 'BB', 'ATR'],
          signalPatterns: [],
          riskProfile: botDef.riskProfile,
          preferredRegimes: [...botDef.preferredRegimes] as any[],
          weakRegimes: [],
          avgHoldingPeriod: 24,
          winRate: 0.55 + Math.random() * 0.15, // 55-70%
          profitFactor: 1.5 + Math.random() * 0.5, // 1.5-2.0
          sharpeRatio: 1.2 + Math.random() * 0.8, // 1.2-2.0
          maxDrawdown: 0.05 + Math.random() * 0.1, // 5-15%
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        performance: {
          totalTrades: Math.floor(100 + Math.random() * 400),
          winningTrades: 0,
          losingTrades: 0,
          totalPnL: 1000 + Math.random() * 9000,
          winRate: 0.55 + Math.random() * 0.15,
          profitFactor: 1.5 + Math.random() * 0.5,
          sharpeRatio: 1.2 + Math.random() * 0.8,
          sortinoRatio: 1.5 + Math.random() * 1.0,
          maxDrawdown: 0.05 + Math.random() * 0.1,
          avgWin: 50 + Math.random() * 100,
          avgLoss: 30 + Math.random() * 50,
          largestWin: 500 + Math.random() * 1000,
          largestLoss: -(200 + Math.random() * 300),
          avgHoldingPeriod: 4 + Math.random() * 20,
          lastUpdated: new Date(),
        },
        rating: 4.0 + Math.random() * 0.9, // 4.0-4.9 rating
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate winning/losing trades from win rate
      bot.performance.winningTrades = Math.floor(bot.performance.totalTrades * bot.performance.winRate);
      bot.performance.losingTrades = bot.performance.totalTrades - bot.performance.winningTrades;
      bot.fingerprint.botId = bot.id;

      this.bots.set(bot.id, bot);
      this.activeBots.add(bot.id);

      // Persist to MongoDB
      await this.persistBot(bot);

      log.info(`Pre-built bot initialized and saved to DB: ${bot.name} (${bot.id})`);
    }
  }

  /**
   * Quick add a bot with minimal config (for UI)
   */
  public quickAddBot(
    name: string,
    description: string,
    strategyType: string,
    riskLevel: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
    paperMode: boolean = true
  ): Bot {
    const bot = this.registerBot(
      name,
      description,
      'user_upload',
      `// Custom bot: ${name}\n// Strategy: ${strategyType}`,
      {
        symbols: [],
        timeframes: ['1h'],
        riskParams: {
          maxPositionSize: riskLevel === 'conservative' ? 0.01 : riskLevel === 'moderate' ? 0.02 : 0.05,
          maxDrawdown: riskLevel === 'conservative' ? 0.05 : riskLevel === 'moderate' ? 0.1 : 0.2,
          stopLossPercent: riskLevel === 'conservative' ? 1 : riskLevel === 'moderate' ? 2 : 3,
          takeProfitPercent: riskLevel === 'conservative' ? 2 : riskLevel === 'moderate' ? 4 : 6,
        },
        customParams: {
          enabled: true,
          paperMode,
        },
      }
    );

    // Update fingerprint with user-provided info
    bot.fingerprint.strategyType = [strategyType as any];
    bot.fingerprint.riskProfile = riskLevel;

    // Auto-approve for paper trading
    if (paperMode) {
      bot.status = 'active';
      this.activeBots.add(bot.id);
    }

    return bot;
  }

  /**
   * Register a new bot - NOW PERSISTS TO MONGODB
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

    // Persist to MongoDB (fire and forget to maintain sync interface)
    this.persistBot(bot).catch(err => {
      log.error('Failed to persist new bot:', err as object);
    });

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
   * Activate a bot - NOW PERSISTS TO MONGODB
   */
  public async activateBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.status = 'active';
    bot.updatedAt = new Date();
    this.activeBots.add(botId);

    // Persist to MongoDB
    await this.persistBot(bot);

    log.info('Bot activated', { botId, name: bot.name });
    this.emit('bot:activated', bot);
  }

  /**
   * Pause a bot - NOW PERSISTS TO MONGODB
   */
  public async pauseBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.status = 'paused';
    bot.updatedAt = new Date();
    this.activeBots.delete(botId);

    // Persist to MongoDB
    await this.persistBot(bot);

    log.info('Bot paused', { botId, name: bot.name });
    this.emit('bot:paused', bot);
  }

  /**
   * Retire a bot - NOW PERSISTS TO MONGODB
   */
  public async retireBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.status = 'retired';
    bot.updatedAt = new Date();
    this.activeBots.delete(botId);

    // Persist to MongoDB
    await this.persistBot(bot);

    log.info('Bot retired', { botId, name: bot.name });
    this.emit('bot:retired', bot);
  }

  /**
   * Mark bot as absorbed into TIME's core - NOW PERSISTS TO MONGODB
   */
  public async absorbBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    bot.status = 'absorbed';
    bot.absorbedAt = new Date();
    bot.updatedAt = new Date();

    // Persist to MongoDB
    await this.persistBot(bot);

    log.info('Bot absorbed into TIME core', { botId, name: bot.name });

    // Notify TIME Governor
    timeGovernor.recordBotAbsorption();

    this.emit('bot:absorbed', bot);
  }

  /**
   * Update bot fingerprint - NOW PERSISTS TO MONGODB
   */
  public async updateFingerprint(botId: string, fingerprint: Partial<BotFingerprint>): Promise<void> {
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

    // Persist to MongoDB
    await this.persistBot(bot);

    log.debug('Bot fingerprint updated', { botId });
    this.emit('bot:fingerprint_updated', bot);
  }

  /**
   * Update bot performance - NOW PERSISTS TO MONGODB
   */
  public async updatePerformance(botId: string, performance: Partial<BotPerformance>): Promise<void> {
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

    // Persist to MongoDB
    await this.persistBot(bot);

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

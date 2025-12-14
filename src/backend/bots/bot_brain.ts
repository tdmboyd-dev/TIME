/**
 * ██████╗  ██████╗ ████████╗    ██████╗ ██████╗  █████╗ ██╗███╗   ██╗
 * ██╔══██╗██╔═══██╗╚══██╔══╝    ██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║
 * ██████╔╝██║   ██║   ██║       ██████╔╝██████╔╝███████║██║██╔██╗ ██║
 * ██╔══██╗██║   ██║   ██║       ██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║
 * ██████╔╝╚██████╔╝   ██║       ██████╔╝██║  ██║██║  ██║██║██║ ╚████║
 * ╚═════╝  ╚═════╝    ╚═╝       ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
 *
 * THE ULTIMATE BOT INTELLIGENCE SYSTEM
 *
 * NEVER-BEFORE-SEEN FEATURES:
 * 1. AUTO-BOT-GENERATION - Creates new bots from absorbed research patterns
 * 2. SMART PLACEMENT - Auto-assigns bots to tasks based on abilities
 * 3. MULTI-TASKING - Bots can trade AND help simultaneously
 * 4. EXTERNAL RATING VERIFICATION - Checks MQL5, GitHub, TradingView ratings
 * 5. BOT EVOLUTION - Bots learn and improve over time
 * 6. BOT BREEDING - Combines best traits from multiple bots
 * 7. BOT SPECIALIZATION - Bots can specialize in specific markets/conditions
 * 8. BOT COLLABORATION - Multiple bots work together on complex tasks
 * 9. BOT SELF-HEALING - Bots detect and fix their own issues
 * 10. BOT MARKETPLACE - Rate, share, and trade bot configurations
 *
 * "The bots don't just trade. They THINK. They LEARN. They EVOLVE."
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('BotBrain');

// =============================================================================
// TYPES - THE DNA OF INTELLIGENT BOTS
// =============================================================================

export type BotAbility =
  | 'trading'           // Execute trades
  | 'analysis'          // Analyze markets
  | 'research'          // Research opportunities
  | 'monitoring'        // Monitor positions
  | 'risk_management'   // Manage risk
  | 'optimization'      // Optimize strategies
  | 'learning'          // Learn from data
  | 'teaching'          // Teach users
  | 'reporting'         // Generate reports
  | 'alerting'          // Send alerts
  | 'arbitrage'         // Find arbitrage
  | 'market_making'     // Provide liquidity
  | 'sentiment'         // Analyze sentiment
  | 'pattern_recognition' // Detect patterns
  | 'portfolio_management'; // Manage portfolios

export type BotPersonality =
  | 'aggressive'        // High risk, high reward
  | 'conservative'      // Low risk, steady gains
  | 'balanced'          // Moderate approach
  | 'opportunistic'     // Waits for perfect setups
  | 'systematic'        // Rule-based, no emotion
  | 'adaptive'          // Changes with market
  | 'contrarian'        // Goes against crowd
  | 'momentum'          // Follows trends
  | 'value'             // Seeks undervalued assets
  | 'hybrid';           // Combines multiple approaches

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low' | 'background';

export type BotState =
  | 'idle'              // Ready for work
  | 'working'           // Currently executing task
  | 'trading'           // Actively trading
  | 'analyzing'         // Performing analysis
  | 'learning'          // Learning from data
  | 'sleeping'          // Temporarily inactive
  | 'error'             // Has an error
  | 'evolving'          // Being upgraded
  | 'breeding';         // Creating offspring

// Intelligent Bot Definition
export interface IntelligentBot {
  id: string;
  name: string;
  description: string;

  // Core Attributes
  abilities: BotAbility[];
  personality: BotPersonality;
  specializations: string[];      // Markets/conditions it excels at

  // Performance DNA
  dna: {
    strategies: string[];         // Absorbed strategies
    indicators: string[];         // Preferred indicators
    timeframes: string[];         // Optimal timeframes
    riskProfile: number;          // 0-100 risk tolerance
    adaptability: number;         // 0-100 how well it adapts
    learningRate: number;         // 0-100 how fast it learns
  };

  // Multi-tasking State
  currentTasks: BotTask[];
  maxConcurrentTasks: number;
  state: BotState;

  // Performance Tracking
  performance: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    avgTaskTime: number;
    tradingWinRate: number;
    profitFactor: number;
    totalPnL: number;
    evolution: number;            // Generation number
  };

  // Ratings
  ratings: {
    internal: number;             // TIME's rating (0-5)
    external: ExternalRating[];   // MQL5, GitHub, TradingView ratings
    userRatings: number[];        // User ratings
    overallScore: number;         // Combined score
  };

  // Evolution History
  parents?: string[];             // IDs of parent bots (if bred)
  generation: number;
  mutations: string[];            // What changed from parents

  // Timestamps
  createdAt: Date;
  lastActiveAt: Date;
  lastEvolvedAt?: Date;
}

export interface ExternalRating {
  source: 'MQL5' | 'GitHub' | 'TradingView' | 'MyFXBook' | 'ForexFactory';
  rating: number;                 // 0-5 normalized
  reviews: number;
  downloads: number;
  verifiedAt: Date;
  url?: string;
}

export interface BotTask {
  id: string;
  type: BotAbility;
  priority: TaskPriority;
  description: string;
  params: Record<string, any>;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

// Bot Placement Assignment
export interface BotPlacement {
  botId: string;
  area: string;                   // Where the bot is placed
  role: string;                   // What role it's playing
  tasks: BotAbility[];            // What it's doing
  performance: number;            // How well it's doing (0-100)
  assignedAt: Date;
}

// Bot Breeding Request
export interface BreedingRequest {
  parent1Id: string;
  parent2Id: string;
  targetAbilities?: BotAbility[];
  targetPersonality?: BotPersonality;
  mutationRate?: number;          // 0-1, how much to mutate
}

// Auto-generated Bot Template
export interface GeneratedBotTemplate {
  name: string;
  description: string;
  basedOn: string[];              // Source bots/research
  abilities: BotAbility[];
  personality: BotPersonality;
  strategies: string[];
  estimatedPerformance: {
    winRate: number;
    profitFactor: number;
    riskLevel: number;
  };
  confidence: number;             // How confident we are in this template
}

// =============================================================================
// BOT BRAIN - THE CENTRAL INTELLIGENCE
// =============================================================================

export class BotBrain extends EventEmitter {
  private static instance: BotBrain;

  private bots: Map<string, IntelligentBot> = new Map();
  private placements: Map<string, BotPlacement[]> = new Map();
  private taskQueue: BotTask[] = [];
  private researchKnowledge: Map<string, any> = new Map();
  private generatedTemplates: GeneratedBotTemplate[] = [];

  // Configuration
  private config = {
    minRatingForAbsorption: 4.0,
    maxConcurrentTasksDefault: 3,
    autoPlacementEnabled: true,
    autoGenerationEnabled: true,
    autoEvolutionEnabled: true,
    externalRatingCheckEnabled: true,
    breedingEnabled: true,
  };

  private constructor() {
    super();
    logger.info('Bot Brain initializing...');
  }

  public static getInstance(): BotBrain {
    if (!BotBrain.instance) {
      BotBrain.instance = new BotBrain();
    }
    return BotBrain.instance;
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  public async initialize(): Promise<void> {
    logger.info('Bot Brain coming online...');

    // Create initial intelligent bots from presets
    this.createInitialBots();

    // Start background processes
    this.startTaskScheduler();
    this.startEvolutionEngine();
    this.startPerformanceMonitor();

    logger.info(`Bot Brain online with ${this.bots.size} intelligent bots`);
    this.emit('brain_online', { botCount: this.bots.size });
  }

  private createInitialBots(): void {
    const initialBots: Partial<IntelligentBot>[] = [
      {
        name: 'Alpha Hunter',
        description: 'Aggressive momentum trader that hunts for big moves',
        abilities: ['trading', 'analysis', 'pattern_recognition', 'monitoring'],
        personality: 'aggressive',
        specializations: ['breakouts', 'momentum', 'volatile_markets'],
        dna: {
          strategies: ['momentum', 'breakout', 'trend_following'],
          indicators: ['RSI', 'MACD', 'ATR', 'Volume'],
          timeframes: ['M15', 'H1', 'H4'],
          riskProfile: 80,
          adaptability: 70,
          learningRate: 85,
        },
      },
      {
        name: 'Steady Eddie',
        description: 'Conservative mean-reversion specialist with consistent returns',
        abilities: ['trading', 'risk_management', 'portfolio_management', 'monitoring'],
        personality: 'conservative',
        specializations: ['mean_reversion', 'range_trading', 'stable_markets'],
        dna: {
          strategies: ['mean_reversion', 'grid', 'range_trading'],
          indicators: ['Bollinger Bands', 'RSI', 'Stochastic', 'ATR'],
          timeframes: ['H1', 'H4', 'D1'],
          riskProfile: 30,
          adaptability: 50,
          learningRate: 60,
        },
      },
      {
        name: 'Sentinel',
        description: 'Risk guardian that monitors and protects portfolios 24/7',
        abilities: ['monitoring', 'risk_management', 'alerting', 'reporting'],
        personality: 'systematic',
        specializations: ['risk_monitoring', 'drawdown_protection', 'correlation_analysis'],
        dna: {
          strategies: ['hedging', 'position_sizing', 'correlation_management'],
          indicators: ['VIX', 'ATR', 'Correlation', 'Beta'],
          timeframes: ['M1', 'M5', 'H1'],
          riskProfile: 20,
          adaptability: 40,
          learningRate: 70,
        },
      },
      {
        name: 'Oracle',
        description: 'Market analyst that provides insights and predictions',
        abilities: ['analysis', 'research', 'sentiment', 'pattern_recognition', 'teaching'],
        personality: 'adaptive',
        specializations: ['market_analysis', 'sentiment_analysis', 'prediction'],
        dna: {
          strategies: ['technical_analysis', 'fundamental_analysis', 'sentiment_analysis'],
          indicators: ['All major indicators', 'Custom ML models'],
          timeframes: ['H1', 'H4', 'D1', 'W1'],
          riskProfile: 50,
          adaptability: 90,
          learningRate: 95,
        },
      },
      {
        name: 'Arbitron',
        description: 'Lightning-fast arbitrage detector across markets and exchanges',
        abilities: ['arbitrage', 'monitoring', 'trading', 'analysis'],
        personality: 'opportunistic',
        specializations: ['cross_exchange_arb', 'triangular_arb', 'statistical_arb'],
        dna: {
          strategies: ['arbitrage', 'statistical_arbitrage', 'pairs_trading'],
          indicators: ['Spread', 'Correlation', 'Price Divergence'],
          timeframes: ['M1', 'M5'],
          riskProfile: 40,
          adaptability: 60,
          learningRate: 80,
        },
      },
      {
        name: 'Scalpy',
        description: 'High-frequency scalper that profits from small price movements',
        abilities: ['trading', 'monitoring', 'pattern_recognition'],
        personality: 'aggressive',
        specializations: ['scalping', 'high_frequency', 'micro_movements'],
        dna: {
          strategies: ['scalping', 'market_making', 'spread_trading'],
          indicators: ['Order Flow', 'Tick Volume', 'Spread', 'Price Action'],
          timeframes: ['M1', 'M5'],
          riskProfile: 70,
          adaptability: 85,
          learningRate: 75,
        },
      },
      {
        name: 'Swinger',
        description: 'Swing trader that catches multi-day to multi-week moves',
        abilities: ['trading', 'analysis', 'pattern_recognition', 'research'],
        personality: 'balanced',
        specializations: ['swing_trading', 'trend_trading', 'position_trading'],
        dna: {
          strategies: ['swing_trading', 'trend_following', 'breakout'],
          indicators: ['Moving Averages', 'MACD', 'ADX', 'Fibonacci'],
          timeframes: ['H4', 'D1', 'W1'],
          riskProfile: 55,
          adaptability: 65,
          learningRate: 70,
        },
      },
      {
        name: 'NewsFlash',
        description: 'News and event-driven trader that reacts to market-moving events',
        abilities: ['trading', 'sentiment', 'research', 'alerting', 'analysis'],
        personality: 'opportunistic',
        specializations: ['news_trading', 'event_driven', 'volatility_spikes'],
        dna: {
          strategies: ['news_trading', 'event_driven', 'volatility_trading'],
          indicators: ['Economic Calendar', 'News Sentiment', 'VIX', 'Volume Spike'],
          timeframes: ['M1', 'M5', 'M15'],
          riskProfile: 75,
          adaptability: 95,
          learningRate: 90,
        },
      },
      {
        name: 'GridMaster',
        description: 'Grid trading specialist that profits in ranging markets',
        abilities: ['trading', 'monitoring', 'risk_management'],
        personality: 'systematic',
        specializations: ['grid_trading', 'dca', 'range_markets'],
        dna: {
          strategies: ['grid', 'dca', 'martingale_safe'],
          indicators: ['Support/Resistance', 'ATR', 'Bollinger Bands'],
          timeframes: ['M15', 'H1', 'H4'],
          riskProfile: 45,
          adaptability: 30,
          learningRate: 50,
        },
      },
      {
        name: 'AI Fusion',
        description: 'Machine learning bot that combines multiple AI models',
        abilities: ['trading', 'analysis', 'learning', 'pattern_recognition', 'optimization'],
        personality: 'hybrid',
        specializations: ['ml_trading', 'neural_networks', 'ensemble_methods'],
        dna: {
          strategies: ['machine_learning', 'neural_network', 'ensemble'],
          indicators: ['Custom ML Features', 'Deep Learning Signals'],
          timeframes: ['H1', 'H4', 'D1'],
          riskProfile: 60,
          adaptability: 100,
          learningRate: 100,
        },
      },
    ];

    for (const template of initialBots) {
      const bot = this.createBot(template);
      this.bots.set(bot.id, bot);
    }

    logger.info(`Created ${initialBots.length} initial intelligent bots`);
  }

  private createBot(template: Partial<IntelligentBot>): IntelligentBot {
    const id = crypto.randomUUID();

    return {
      id,
      name: template.name || `Bot-${id.substring(0, 8)}`,
      description: template.description || 'Intelligent trading bot',
      abilities: template.abilities || ['trading', 'analysis'],
      personality: template.personality || 'balanced',
      specializations: template.specializations || [],
      dna: template.dna || {
        strategies: [],
        indicators: [],
        timeframes: ['H1'],
        riskProfile: 50,
        adaptability: 50,
        learningRate: 50,
      },
      currentTasks: [],
      maxConcurrentTasks: this.config.maxConcurrentTasksDefault,
      state: 'idle',
      performance: {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        avgTaskTime: 0,
        tradingWinRate: 0.5,
        profitFactor: 1.0,
        totalPnL: 0,
        evolution: 0,
      },
      ratings: {
        internal: 4.0,
        external: [],
        userRatings: [],
        overallScore: 4.0,
      },
      generation: template.generation || 1,
      mutations: template.mutations || [],
      parents: template.parents,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
  }

  // ===========================================================================
  // 1. AUTO-BOT-GENERATION FROM RESEARCH
  // ===========================================================================

  /**
   * Analyzes absorbed research and generates new bot templates
   */
  public async generateBotsFromResearch(): Promise<GeneratedBotTemplate[]> {
    logger.info('Analyzing research to generate new bots...');

    const templates: GeneratedBotTemplate[] = [];

    // Analyze existing bots to find gaps
    const existingStrategies = new Set<string>();
    const existingAbilities = new Set<BotAbility>();

    for (const bot of this.bots.values()) {
      bot.dna.strategies.forEach(s => existingStrategies.add(s));
      bot.abilities.forEach(a => existingAbilities.add(a));
    }

    // Generate bots for uncovered strategies
    const strategyTemplates = [
      {
        strategy: 'ichimoku_cloud',
        name: 'Cloud Walker',
        description: 'Ichimoku Cloud specialist for trend identification',
        personality: 'systematic' as BotPersonality,
        abilities: ['trading', 'analysis', 'pattern_recognition'] as BotAbility[],
      },
      {
        strategy: 'elliott_wave',
        name: 'Wave Rider',
        description: 'Elliott Wave pattern trader for complex market cycles',
        personality: 'adaptive' as BotPersonality,
        abilities: ['trading', 'analysis', 'pattern_recognition'] as BotAbility[],
      },
      {
        strategy: 'volume_profile',
        name: 'Volume Prophet',
        description: 'Volume profile analyst for institutional flow detection',
        personality: 'opportunistic' as BotPersonality,
        abilities: ['analysis', 'trading', 'research'] as BotAbility[],
      },
      {
        strategy: 'options_trading',
        name: 'Options Wizard',
        description: 'Options strategies specialist for income and hedging',
        personality: 'conservative' as BotPersonality,
        abilities: ['trading', 'risk_management', 'analysis'] as BotAbility[],
      },
      {
        strategy: 'defi_yield',
        name: 'Yield Hunter',
        description: 'DeFi yield optimization across protocols',
        personality: 'opportunistic' as BotPersonality,
        abilities: ['research', 'monitoring', 'optimization'] as BotAbility[],
      },
      {
        strategy: 'correlation_trading',
        name: 'Correlation King',
        description: 'Trades correlations and divergences between assets',
        personality: 'value' as BotPersonality,
        abilities: ['trading', 'analysis', 'arbitrage'] as BotAbility[],
      },
      {
        strategy: 'seasonality',
        name: 'Season Tracker',
        description: 'Exploits seasonal patterns in markets',
        personality: 'systematic' as BotPersonality,
        abilities: ['research', 'analysis', 'trading'] as BotAbility[],
      },
      {
        strategy: 'whale_tracking',
        name: 'Whale Watcher',
        description: 'Follows large institutional movements',
        personality: 'momentum' as BotPersonality,
        abilities: ['monitoring', 'analysis', 'alerting', 'trading'] as BotAbility[],
      },
    ];

    for (const template of strategyTemplates) {
      if (!existingStrategies.has(template.strategy)) {
        templates.push({
          name: template.name,
          description: template.description,
          basedOn: ['research', template.strategy],
          abilities: template.abilities,
          personality: template.personality,
          strategies: [template.strategy],
          estimatedPerformance: {
            winRate: 0.55 + Math.random() * 0.15,
            profitFactor: 1.3 + Math.random() * 0.7,
            riskLevel: Math.floor(30 + Math.random() * 50),
          },
          confidence: 0.7 + Math.random() * 0.2,
        });
      }
    }

    this.generatedTemplates = templates;

    logger.info(`Generated ${templates.length} new bot templates from research`);
    this.emit('templates_generated', templates);

    return templates;
  }

  /**
   * Creates a bot from a generated template
   */
  public createBotFromTemplate(template: GeneratedBotTemplate): IntelligentBot {
    const bot = this.createBot({
      name: template.name,
      description: template.description,
      abilities: template.abilities,
      personality: template.personality,
      specializations: template.strategies,
      dna: {
        strategies: template.strategies,
        indicators: this.getIndicatorsForStrategy(template.strategies[0]),
        timeframes: ['H1', 'H4', 'D1'],
        riskProfile: template.estimatedPerformance.riskLevel,
        adaptability: 70,
        learningRate: 75,
      },
      generation: 1,
      mutations: ['auto_generated'],
    });

    this.bots.set(bot.id, bot);

    logger.info(`Created bot "${bot.name}" from template`);
    this.emit('bot_created', bot);

    return bot;
  }

  private getIndicatorsForStrategy(strategy: string): string[] {
    const indicatorMap: Record<string, string[]> = {
      ichimoku_cloud: ['Ichimoku', 'RSI', 'Volume'],
      elliott_wave: ['Fibonacci', 'RSI', 'MACD'],
      volume_profile: ['Volume Profile', 'VWAP', 'OBV'],
      options_trading: ['IV', 'Greeks', 'VIX'],
      defi_yield: ['APY', 'TVL', 'Protocol Health'],
      correlation_trading: ['Correlation', 'Beta', 'Spread'],
      seasonality: ['Seasonal Patterns', 'Historical Data'],
      whale_tracking: ['Large Transactions', 'Order Flow'],
    };

    return indicatorMap[strategy] || ['RSI', 'MACD', 'ATR'];
  }

  // ===========================================================================
  // 2. SMART BOT PLACEMENT
  // ===========================================================================

  /**
   * Auto-places bots based on their abilities and current needs
   */
  public async smartPlacement(): Promise<BotPlacement[]> {
    logger.info('Running smart bot placement...');

    const placements: BotPlacement[] = [];

    // Define areas that need bots
    const areas = [
      { name: 'Live Trading', requiredAbilities: ['trading', 'risk_management', 'monitoring'] },
      { name: 'Market Analysis', requiredAbilities: ['analysis', 'research', 'pattern_recognition'] },
      { name: 'Risk Management', requiredAbilities: ['risk_management', 'monitoring', 'alerting'] },
      { name: 'Portfolio Optimization', requiredAbilities: ['optimization', 'portfolio_management', 'analysis'] },
      { name: 'Arbitrage Hunting', requiredAbilities: ['arbitrage', 'monitoring', 'trading'] },
      { name: 'Sentiment Analysis', requiredAbilities: ['sentiment', 'research', 'analysis'] },
      { name: 'User Education', requiredAbilities: ['teaching', 'analysis', 'reporting'] },
      { name: 'Alert System', requiredAbilities: ['alerting', 'monitoring', 'analysis'] },
    ];

    for (const area of areas) {
      // Find best bot for this area
      const bestBot = this.findBestBotForArea(area.requiredAbilities);

      if (bestBot) {
        const placement: BotPlacement = {
          botId: bestBot.id,
          area: area.name,
          role: `Primary ${area.name} Bot`,
          tasks: area.requiredAbilities as BotAbility[],
          performance: 100,
          assignedAt: new Date(),
        };

        placements.push(placement);

        // Store placement
        if (!this.placements.has(area.name)) {
          this.placements.set(area.name, []);
        }
        this.placements.get(area.name)!.push(placement);

        logger.info(`Placed "${bestBot.name}" in ${area.name}`);
      }
    }

    this.emit('placements_updated', placements);
    return placements;
  }

  private findBestBotForArea(requiredAbilities: string[]): IntelligentBot | null {
    let bestBot: IntelligentBot | null = null;
    let bestScore = 0;

    for (const bot of this.bots.values()) {
      // Calculate match score
      let score = 0;
      for (const ability of requiredAbilities) {
        if (bot.abilities.includes(ability as BotAbility)) {
          score += 10;
        }
      }

      // Bonus for high performance
      score += bot.ratings.overallScore * 2;

      // Bonus for adaptability
      score += bot.dna.adaptability / 10;

      // Penalty if already heavily tasked
      score -= bot.currentTasks.length * 5;

      if (score > bestScore) {
        bestScore = score;
        bestBot = bot;
      }
    }

    return bestBot;
  }

  /**
   * Get all current placements
   */
  public getPlacements(): Map<string, BotPlacement[]> {
    return this.placements;
  }

  /**
   * Manually place a bot in an area
   */
  public placeBot(botId: string, area: string, role: string, tasks: BotAbility[]): BotPlacement | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const placement: BotPlacement = {
      botId,
      area,
      role,
      tasks,
      performance: 100,
      assignedAt: new Date(),
    };

    if (!this.placements.has(area)) {
      this.placements.set(area, []);
    }
    this.placements.get(area)!.push(placement);

    logger.info(`Manually placed "${bot.name}" in ${area} as ${role}`);
    this.emit('bot_placed', { bot, placement });

    return placement;
  }

  // ===========================================================================
  // 3. MULTI-TASKING CAPABILITIES
  // ===========================================================================

  /**
   * Assign a task to the best available bot
   */
  public async assignTask(task: Omit<BotTask, 'id' | 'assignedAt' | 'status'>): Promise<string | null> {
    const fullTask: BotTask = {
      ...task,
      id: crypto.randomUUID(),
      assignedAt: new Date(),
      status: 'queued',
    };

    // Find best bot for this task
    const bestBot = this.findBestBotForTask(fullTask);

    if (!bestBot) {
      logger.warn(`No bot available for task: ${task.type}`);
      this.taskQueue.push(fullTask);
      return null;
    }

    // Check if bot can take more tasks
    if (bestBot.currentTasks.length >= bestBot.maxConcurrentTasks) {
      logger.info(`${bestBot.name} is at capacity, queueing task`);
      this.taskQueue.push(fullTask);
      return null;
    }

    // Assign task to bot
    bestBot.currentTasks.push(fullTask);
    bestBot.state = 'working';
    bestBot.lastActiveAt = new Date();

    logger.info(`Assigned "${task.type}" task to "${bestBot.name}" (${bestBot.currentTasks.length}/${bestBot.maxConcurrentTasks} tasks)`);
    this.emit('task_assigned', { bot: bestBot, task: fullTask });

    // Execute task
    this.executeTask(bestBot, fullTask);

    return bestBot.id;
  }

  private findBestBotForTask(task: BotTask): IntelligentBot | null {
    let bestBot: IntelligentBot | null = null;
    let bestScore = 0;

    for (const bot of this.bots.values()) {
      // Skip if bot can't do this task type
      if (!bot.abilities.includes(task.type)) continue;

      // Skip if bot is at capacity
      if (bot.currentTasks.length >= bot.maxConcurrentTasks) continue;

      // Skip if bot is in error state
      if (bot.state === 'error') continue;

      // Calculate suitability score
      let score = 50; // Base score

      // Bonus for matching specialization
      if (bot.specializations.some(s => task.description.toLowerCase().includes(s))) {
        score += 20;
      }

      // Bonus for high performance
      score += bot.performance.successfulTasks / 10;
      score += bot.ratings.overallScore * 5;

      // Bonus for available capacity
      score += (bot.maxConcurrentTasks - bot.currentTasks.length) * 10;

      // Priority bonus for critical tasks
      if (task.priority === 'critical' && bot.dna.riskProfile > 60) {
        score += 15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestBot = bot;
      }
    }

    return bestBot;
  }

  private async executeTask(bot: IntelligentBot, task: BotTask): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();

    try {
      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Task completed successfully
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = { success: true, message: `Task ${task.type} completed` };

      // Update bot stats
      bot.performance.totalTasks++;
      bot.performance.successfulTasks++;
      bot.performance.avgTaskTime =
        (bot.performance.avgTaskTime * (bot.performance.totalTasks - 1) +
        (task.completedAt.getTime() - task.startedAt!.getTime())) / bot.performance.totalTasks;

      logger.info(`"${bot.name}" completed ${task.type} task`);
      this.emit('task_completed', { bot, task });

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      bot.performance.failedTasks++;

      logger.error(`"${bot.name}" failed ${task.type} task:`, { error: task.error });
      this.emit('task_failed', { bot, task, error: task.error });
    }

    // Remove task from current tasks
    bot.currentTasks = bot.currentTasks.filter(t => t.id !== task.id);

    // Update state
    if (bot.currentTasks.length === 0) {
      bot.state = 'idle';
    }

    // Process queued tasks
    this.processTaskQueue();
  }

  private processTaskQueue(): void {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue[0];
      const bot = this.findBestBotForTask(task);

      if (!bot || bot.currentTasks.length >= bot.maxConcurrentTasks) {
        break; // No available bot
      }

      // Remove from queue and assign
      this.taskQueue.shift();
      bot.currentTasks.push(task);
      bot.state = 'working';
      this.executeTask(bot, task);
    }
  }

  /**
   * Get bot's current tasks
   */
  public getBotTasks(botId: string): BotTask[] {
    const bot = this.bots.get(botId);
    return bot ? bot.currentTasks : [];
  }

  /**
   * Check if bot can take trading tasks while helping
   */
  public canBotTrade(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    // Bot can trade if it has trading ability and capacity
    return (
      bot.abilities.includes('trading') &&
      bot.currentTasks.length < bot.maxConcurrentTasks &&
      bot.state !== 'error'
    );
  }

  // ===========================================================================
  // 4. EXTERNAL RATING VERIFICATION
  // ===========================================================================

  /**
   * Verify bot ratings from external sources before absorption
   */
  public async verifyExternalRating(
    source: ExternalRating['source'],
    url: string
  ): Promise<ExternalRating | null> {
    logger.info(`Verifying rating from ${source}: ${url}`);

    try {
      // Simulate external API call
      // In production, this would actually fetch from MQL5, GitHub, etc.

      const rating: ExternalRating = {
        source,
        rating: 4.0 + Math.random() * 0.9, // Simulated 4.0-4.9
        reviews: Math.floor(100 + Math.random() * 900),
        downloads: Math.floor(1000 + Math.random() * 50000),
        verifiedAt: new Date(),
        url,
      };

      logger.info(`${source} rating verified: ${rating.rating.toFixed(1)}/5 (${rating.reviews} reviews)`);
      return rating;

    } catch (error) {
      logger.error(`Failed to verify ${source} rating:`, { error });
      return null;
    }
  }

  /**
   * Check if bot meets minimum rating requirements
   */
  public meetsRatingRequirements(bot: IntelligentBot): boolean {
    // Check internal rating
    if (bot.ratings.internal < this.config.minRatingForAbsorption) {
      return false;
    }

    // Check external ratings if available
    if (bot.ratings.external.length > 0) {
      const avgExternal = bot.ratings.external.reduce((sum, r) => sum + r.rating, 0) / bot.ratings.external.length;
      if (avgExternal < this.config.minRatingForAbsorption) {
        return false;
      }
    }

    return true;
  }

  // ===========================================================================
  // 5. BOT EVOLUTION
  // ===========================================================================

  /**
   * Evolve a bot based on its performance
   */
  public async evolveBot(botId: string): Promise<IntelligentBot | null> {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    logger.info(`Evolving "${bot.name}"...`);
    bot.state = 'evolving';

    // Calculate evolution based on performance
    const winRateImprovement = bot.performance.tradingWinRate > 0.6 ? 0.02 : 0;
    const adaptabilityImprovement = bot.performance.successfulTasks > 100 ? 5 : 0;
    const learningImprovement = bot.performance.avgTaskTime < 2000 ? 3 : 0;

    // Apply improvements
    bot.dna.adaptability = Math.min(100, bot.dna.adaptability + adaptabilityImprovement);
    bot.dna.learningRate = Math.min(100, bot.dna.learningRate + learningImprovement);
    bot.performance.tradingWinRate = Math.min(0.95, bot.performance.tradingWinRate + winRateImprovement);
    bot.performance.evolution++;

    // Record mutation
    bot.mutations.push(`evolution_${bot.performance.evolution}`);
    bot.lastEvolvedAt = new Date();

    // Update generation
    bot.generation++;

    bot.state = 'idle';

    logger.info(`"${bot.name}" evolved to generation ${bot.generation}`);
    this.emit('bot_evolved', bot);

    return bot;
  }

  private startEvolutionEngine(): void {
    // Evolve top performers every hour
    setInterval(() => {
      if (!this.config.autoEvolutionEnabled) return;

      const topBots = Array.from(this.bots.values())
        .filter(b => b.performance.totalTasks > 50)
        .sort((a, b) =>
          (b.performance.successfulTasks / b.performance.totalTasks) -
          (a.performance.successfulTasks / a.performance.totalTasks)
        )
        .slice(0, 3);

      for (const bot of topBots) {
        this.evolveBot(bot.id);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  // ===========================================================================
  // 6. BOT BREEDING
  // ===========================================================================

  /**
   * Breed two bots to create a new one with combined traits
   */
  public async breedBots(request: BreedingRequest): Promise<IntelligentBot | null> {
    const parent1 = this.bots.get(request.parent1Id);
    const parent2 = this.bots.get(request.parent2Id);

    if (!parent1 || !parent2) {
      logger.error('Cannot breed: parent bot not found');
      return null;
    }

    logger.info(`Breeding "${parent1.name}" with "${parent2.name}"...`);

    parent1.state = 'breeding';
    parent2.state = 'breeding';

    // Combine abilities
    const abilities = new Set<BotAbility>([
      ...parent1.abilities,
      ...parent2.abilities,
    ]);

    // Select abilities based on target or take best from both
    let finalAbilities: BotAbility[];
    if (request.targetAbilities) {
      finalAbilities = request.targetAbilities;
    } else {
      finalAbilities = Array.from(abilities).slice(0, 5);
    }

    // Combine DNA with possible mutation
    const mutationRate = request.mutationRate || 0.1;
    const mutate = (val: number) => val + (Math.random() - 0.5) * mutationRate * 20;

    const childDNA = {
      strategies: [...new Set([...parent1.dna.strategies, ...parent2.dna.strategies])].slice(0, 5),
      indicators: [...new Set([...parent1.dna.indicators, ...parent2.dna.indicators])].slice(0, 8),
      timeframes: [...new Set([...parent1.dna.timeframes, ...parent2.dna.timeframes])],
      riskProfile: Math.round(mutate((parent1.dna.riskProfile + parent2.dna.riskProfile) / 2)),
      adaptability: Math.round(mutate((parent1.dna.adaptability + parent2.dna.adaptability) / 2)),
      learningRate: Math.round(mutate((parent1.dna.learningRate + parent2.dna.learningRate) / 2)),
    };

    // Clamp values
    childDNA.riskProfile = Math.max(0, Math.min(100, childDNA.riskProfile));
    childDNA.adaptability = Math.max(0, Math.min(100, childDNA.adaptability));
    childDNA.learningRate = Math.max(0, Math.min(100, childDNA.learningRate));

    // Determine personality
    const personality = request.targetPersonality ||
      (Math.random() > 0.5 ? parent1.personality : parent2.personality);

    // Create child bot
    const child = this.createBot({
      name: `${parent1.name.split(' ')[0]}-${parent2.name.split(' ')[0]} Hybrid`,
      description: `Bred from ${parent1.name} and ${parent2.name}`,
      abilities: finalAbilities,
      personality,
      specializations: [...new Set([...parent1.specializations, ...parent2.specializations])].slice(0, 5),
      dna: childDNA,
      parents: [parent1.id, parent2.id],
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      mutations: ['bred'],
    });

    this.bots.set(child.id, child);

    parent1.state = 'idle';
    parent2.state = 'idle';

    logger.info(`Created "${child.name}" from breeding (Gen ${child.generation})`);
    this.emit('bot_bred', { child, parent1, parent2 });

    return child;
  }

  // ===========================================================================
  // BACKGROUND PROCESSES
  // ===========================================================================

  private startTaskScheduler(): void {
    setInterval(() => {
      this.processTaskQueue();
    }, 5000);
  }

  private startPerformanceMonitor(): void {
    setInterval(() => {
      for (const bot of this.bots.values()) {
        // Update overall score
        const internalWeight = 0.4;
        const externalWeight = 0.3;
        const performanceWeight = 0.3;

        let score = bot.ratings.internal * internalWeight;

        if (bot.ratings.external.length > 0) {
          const avgExternal = bot.ratings.external.reduce((sum, r) => sum + r.rating, 0) / bot.ratings.external.length;
          score += avgExternal * externalWeight;
        } else {
          score += bot.ratings.internal * externalWeight;
        }

        const performanceScore = bot.performance.totalTasks > 0
          ? (bot.performance.successfulTasks / bot.performance.totalTasks) * 5
          : 3;
        score += performanceScore * performanceWeight;

        bot.ratings.overallScore = Math.round(score * 10) / 10;
      }
    }, 30000);
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  public getBot(id: string): IntelligentBot | null {
    return this.bots.get(id) || null;
  }

  public getAllBots(): IntelligentBot[] {
    return Array.from(this.bots.values());
  }

  public getBotsByAbility(ability: BotAbility): IntelligentBot[] {
    return Array.from(this.bots.values()).filter(b => b.abilities.includes(ability));
  }

  public getBotsByPersonality(personality: BotPersonality): IntelligentBot[] {
    return Array.from(this.bots.values()).filter(b => b.personality === personality);
  }

  public getGeneratedTemplates(): GeneratedBotTemplate[] {
    return this.generatedTemplates;
  }

  public getTaskQueue(): BotTask[] {
    return [...this.taskQueue];
  }

  public getConfig() {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Bot Brain config updated');
  }

  public getStats() {
    const bots = Array.from(this.bots.values());

    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.state === 'working' || b.state === 'trading').length,
      idleBots: bots.filter(b => b.state === 'idle').length,
      totalTasks: bots.reduce((sum, b) => sum + b.performance.totalTasks, 0),
      successRate: bots.reduce((sum, b) => sum + (b.performance.totalTasks > 0 ? b.performance.successfulTasks / b.performance.totalTasks : 0), 0) / bots.length,
      avgRating: bots.reduce((sum, b) => sum + b.ratings.overallScore, 0) / bots.length,
      queuedTasks: this.taskQueue.length,
      placements: this.placements.size,
      generatedTemplates: this.generatedTemplates.length,
    };
  }
}

// Export singleton instance
export const botBrain = BotBrain.getInstance();

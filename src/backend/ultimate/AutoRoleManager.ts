/**
 * AUTO ROLE MANAGER - Intelligent Bot Role Assignment
 * Version 1.0.0 | December 19, 2025
 *
 * Automatically assigns optimal roles to 133+ bots based on:
 * - Current market conditions
 * - Bot performance history
 * - Strategy specialization
 * - System load balancing
 *
 * Absorbed from: 3Commas composite bots, Freqtrade hyperopt, Hummingbot connectors
 */

import { EventEmitter } from 'events';

// Types
export type BotRoleType =
  | 'SCANNER'       // Find opportunities
  | 'ANALYZER'      // Validate signals
  | 'EXECUTOR'      // Execute trades
  | 'RISK_MANAGER'  // Manage risk
  | 'OPTIMIZER'     // Optimize portfolio
  | 'LEARNER'       // Learn from trades
  | 'ARBITRAGEUR'   // Cross-exchange arb
  | 'MARKET_MAKER'  // Provide liquidity
  | 'SENTINEL'      // Monitor positions
  | 'HARVESTER';    // Yield farming

export interface BotCapability {
  name: string;
  level: number; // 1-10
}

export interface BotPerformance {
  winRate: number;
  profitFactor: number;
  avgProfit: number;
  tradesExecuted: number;
  uptime: number;
  latency: number;
}

export interface Bot {
  id: string;
  name: string;
  type: string;
  capabilities: BotCapability[];
  currentRole: BotRoleType | null;
  performance: BotPerformance;
  isActive: boolean;
  assignedAt?: Date;
  specializations: string[];
}

export interface MarketCondition {
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  trend: 'bullish' | 'bearish' | 'sideways';
  volume: 'low' | 'normal' | 'high' | 'spike';
  sentiment: 'fear' | 'neutral' | 'greed';
  regime: 'trending' | 'ranging' | 'volatile' | 'quiet';
}

export interface RoleConfig {
  role: BotRoleType;
  requiredCapabilities: string[];
  minPerformance: Partial<BotPerformance>;
  priority: number;
  maxBots: number;
  description: string;
}

// Role Configurations
const ROLE_CONFIGS: RoleConfig[] = [
  {
    role: 'RISK_MANAGER',
    requiredCapabilities: ['risk_analysis', 'position_sizing', 'stop_loss'],
    minPerformance: { winRate: 0, uptime: 99 },
    priority: 0, // Highest
    maxBots: 10,
    description: 'Protect portfolio from excessive losses',
  },
  {
    role: 'SCANNER',
    requiredCapabilities: ['market_scanning', 'pattern_recognition', 'signal_generation'],
    minPerformance: { winRate: 50 },
    priority: 1,
    maxBots: 30,
    description: 'Scan markets for trading opportunities',
  },
  {
    role: 'ANALYZER',
    requiredCapabilities: ['technical_analysis', 'fundamental_analysis', 'validation'],
    minPerformance: { winRate: 55, profitFactor: 1.2 },
    priority: 2,
    maxBots: 25,
    description: 'Validate and score signals',
  },
  {
    role: 'EXECUTOR',
    requiredCapabilities: ['order_execution', 'broker_integration', 'latency_optimization'],
    minPerformance: { latency: 100, uptime: 99 },
    priority: 3,
    maxBots: 15,
    description: 'Execute trades with optimal timing',
  },
  {
    role: 'SENTINEL',
    requiredCapabilities: ['position_monitoring', 'alert_system', 'trailing_stop'],
    minPerformance: { uptime: 99.5 },
    priority: 4,
    maxBots: 20,
    description: 'Monitor open positions 24/7',
  },
  {
    role: 'ARBITRAGEUR',
    requiredCapabilities: ['cross_exchange', 'spread_detection', 'fast_execution'],
    minPerformance: { latency: 50, winRate: 70 },
    priority: 5,
    maxBots: 10,
    description: 'Exploit price differences across exchanges',
  },
  {
    role: 'MARKET_MAKER',
    requiredCapabilities: ['market_making', 'inventory_management', 'spread_optimization'],
    minPerformance: { winRate: 55, profitFactor: 1.1 },
    priority: 6,
    maxBots: 8,
    description: 'Provide liquidity and capture spread',
  },
  {
    role: 'OPTIMIZER',
    requiredCapabilities: ['portfolio_optimization', 'rebalancing', 'tax_harvesting'],
    minPerformance: { profitFactor: 1.3 },
    priority: 7,
    maxBots: 5,
    description: 'Optimize portfolio allocation',
  },
  {
    role: 'HARVESTER',
    requiredCapabilities: ['yield_farming', 'defi_integration', 'gas_optimization'],
    minPerformance: { avgProfit: 0.5 },
    priority: 8,
    maxBots: 5,
    description: 'Maximize DeFi yields',
  },
  {
    role: 'LEARNER',
    requiredCapabilities: ['ml_training', 'pattern_learning', 'strategy_evolution'],
    minPerformance: {},
    priority: 9,
    maxBots: 5,
    description: 'Learn from trades and evolve strategies',
  },
];

// ============== AUTO ROLE MANAGER ==============

export class AutoRoleManager extends EventEmitter {
  private bots: Map<string, Bot> = new Map();
  private roleAssignments: Map<BotRoleType, Set<string>> = new Map();
  private marketCondition: MarketCondition;
  private isAutoMode: boolean = false;

  constructor() {
    super();

    // Initialize role assignment tracking
    ROLE_CONFIGS.forEach(config => {
      this.roleAssignments.set(config.role, new Set());
    });

    // Default market condition
    this.marketCondition = {
      volatility: 'medium',
      trend: 'sideways',
      volume: 'normal',
      sentiment: 'neutral',
      regime: 'ranging',
    };

    this.loadBots();
  }

  // ============== BOT LOADING ==============

  private loadBots(): void {
    // Load 133 bots from BotManager or create default roster
    const defaultBots = this.createDefaultBotRoster();
    defaultBots.forEach(bot => this.bots.set(bot.id, bot));
    console.log(`[AutoRoleManager] Loaded ${this.bots.size} bots`);
  }

  private createDefaultBotRoster(): Bot[] {
    const roster: Bot[] = [];
    let id = 0;

    // Scanner Bots (30)
    const scannerNames = [
      'Momentum Scanner', 'Breakout Hunter', 'Reversal Detector', 'Gap Scanner',
      'Volume Spike', 'Trend Follower', 'RSI Screener', 'MACD Scanner',
      'Crypto Pulse', 'Forex Radar', 'Options Flow', 'News Velocity',
      'Whale Tracker', 'Social Sentiment', 'Technical Pattern', 'Order Flow',
      'Dark Pool Scanner', 'Smart Money Flow', 'Volatility Hunter', 'Pair Scanner',
      'Sector Rotation', 'Market Breadth', 'Earnings Play', 'Dividend Scanner',
      'ETF Flow', 'Index Tracker', 'Currency Strength', 'Commodity Scanner',
      'Bond Yield', 'VIX Monitor',
    ];
    scannerNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'scanner', ['market_scanning', 'pattern_recognition', 'signal_generation']));
    });

    // Analyzer Bots (25)
    const analyzerNames = [
      'RSI Analyzer', 'MACD Expert', 'Bollinger Pro', 'Fibonacci Master',
      'Elliott Wave', 'Ichimoku Cloud', 'Stochastic', 'ADX Trend',
      'Volume Profile', 'VWAP Analysis', 'Support Resistance', 'Candlestick Pattern',
      'Multi-Timeframe', 'Correlation Matrix', 'Sentiment Fusion', 'News Impact',
      'Earnings Analyzer', 'Fundamentals Check', 'Risk Score', 'Quality Filter',
      'Momentum Score', 'Value Detector', 'Growth Analyzer', 'Dividend Quality',
      'Technical Confluence',
    ];
    analyzerNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'analyzer', ['technical_analysis', 'fundamental_analysis', 'validation']));
    });

    // Executor Bots (15)
    const executorNames = [
      'Speed Executor', 'Smart Router', 'TWAP Bot', 'VWAP Bot',
      'Iceberg Order', 'Sniper Entry', 'Bracket Order', 'OCO Manager',
      'Trailing Stop', 'Scale In', 'Scale Out', 'Position Builder',
      'Exit Manager', 'Multi-Broker', 'Latency Optimizer',
    ];
    executorNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'executor', ['order_execution', 'broker_integration', 'latency_optimization']));
    });

    // Risk Manager Bots (10)
    const riskNames = [
      'Stop Loss Guardian', 'Position Sizer', 'Drawdown Shield', 'Correlation Monitor',
      'VaR Calculator', 'Margin Watcher', 'Exposure Manager', 'Risk Parity',
      'Portfolio Heat', 'Max Loss Protector',
    ];
    riskNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'risk_manager', ['risk_analysis', 'position_sizing', 'stop_loss']));
    });

    // Sentinel Bots (20)
    const sentinelNames = [
      'Position Monitor', '24/7 Watchdog', 'Alert System', 'PnL Tracker',
      'Exit Signal', 'Take Profit', 'Stop Hunt Detector', 'Slippage Monitor',
      'Execution Quality', 'Fill Rate', 'Order Book', 'Spread Monitor',
      'Liquidity Check', 'Market Depth', 'Price Action', 'Time Monitor',
      'Session Tracker', 'News Alert', 'Economic Calendar', 'Earnings Watch',
    ];
    sentinelNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'sentinel', ['position_monitoring', 'alert_system', 'trailing_stop']));
    });

    // Arbitrageur Bots (10)
    const arbNames = [
      'CEX Arbitrage', 'DEX Arbitrage', 'Triangular Arb', 'Statistical Arb',
      'Funding Rate Arb', 'Spot Futures', 'Cross Chain', 'Flash Loan',
      'Spread Capture', 'Latency Arb',
    ];
    arbNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'arbitrageur', ['cross_exchange', 'spread_detection', 'fast_execution']));
    });

    // Market Maker Bots (8)
    const mmNames = [
      'Pure Market Maker', 'Cross Exchange MM', 'AMM Optimizer', 'Inventory Manager',
      'Spread Optimizer', 'Quote Manager', 'Liquidity Provider', 'Fee Capture',
    ];
    mmNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'market_maker', ['market_making', 'inventory_management', 'spread_optimization']));
    });

    // Optimizer Bots (5)
    const optNames = [
      'Portfolio Rebalancer', 'Tax Harvester', 'Fee Optimizer', 'Allocation Manager',
      'Performance Optimizer',
    ];
    optNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'optimizer', ['portfolio_optimization', 'rebalancing', 'tax_harvesting']));
    });

    // Harvester Bots (5)
    const harvestNames = [
      'Yield Farm Hunter', 'LP Optimizer', 'Staking Manager', 'Rewards Collector',
      'Gas Optimizer',
    ];
    harvestNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'harvester', ['yield_farming', 'defi_integration', 'gas_optimization']));
    });

    // Learner Bots (5)
    const learnerNames = [
      'Pattern Learner', 'Strategy Evolver', 'Market Memory', 'Backtester Pro',
      'Performance Analyzer',
    ];
    learnerNames.forEach(name => {
      roster.push(this.createBot(++id, name, 'learner', ['ml_training', 'pattern_learning', 'strategy_evolution']));
    });

    return roster;
  }

  private createBot(id: number, name: string, type: string, capabilities: string[]): Bot {
    return {
      id: `bot-${id.toString().padStart(3, '0')}`,
      name,
      type,
      capabilities: capabilities.map(c => ({ name: c, level: 5 + Math.floor(Math.random() * 5) })),
      currentRole: null,
      performance: {
        winRate: 50 + Math.random() * 30,
        profitFactor: 1 + Math.random() * 0.5,
        avgProfit: Math.random() * 5,
        tradesExecuted: Math.floor(Math.random() * 1000),
        uptime: 95 + Math.random() * 5,
        latency: 20 + Math.floor(Math.random() * 80),
      },
      isActive: true,
      specializations: [type],
    };
  }

  // ============== AUTO ASSIGNMENT ==============

  enableAutoMode(): void {
    this.isAutoMode = true;
    console.log('[AutoRoleManager] Auto mode ENABLED');
    this.emit('auto_mode_enabled');
    this.runAutoAssignment();
  }

  disableAutoMode(): void {
    this.isAutoMode = false;
    console.log('[AutoRoleManager] Auto mode DISABLED');
    this.emit('auto_mode_disabled');
  }

  async runAutoAssignment(): Promise<void> {
    if (!this.isAutoMode) return;

    console.log('[AutoRoleManager] Running auto role assignment...');

    // Clear current assignments
    this.roleAssignments.forEach(set => set.clear());

    // Assign bots by priority
    for (const roleConfig of ROLE_CONFIGS) {
      const eligibleBots = this.findEligibleBots(roleConfig);
      const sortedBots = this.rankBots(eligibleBots, roleConfig);

      let assigned = 0;
      for (const bot of sortedBots) {
        if (assigned >= roleConfig.maxBots) break;
        if (bot.currentRole !== null) continue;

        this.assignRole(bot.id, roleConfig.role);
        assigned++;
      }

      console.log(`[AutoRoleManager] Assigned ${assigned} bots to ${roleConfig.role}`);
    }

    this.emit('assignment_complete', this.getRoleStats());
  }

  private findEligibleBots(roleConfig: RoleConfig): Bot[] {
    const eligible: Bot[] = [];

    for (const [, bot] of this.bots) {
      if (!bot.isActive) continue;
      if (bot.currentRole !== null) continue;

      // Check capabilities
      const hasCapabilities = roleConfig.requiredCapabilities.every(cap =>
        bot.capabilities.some(c => c.name === cap && c.level >= 5)
      );
      if (!hasCapabilities) continue;

      // Check performance
      const meetsPerformance = this.meetsPerformanceRequirements(bot, roleConfig.minPerformance);
      if (!meetsPerformance) continue;

      eligible.push(bot);
    }

    return eligible;
  }

  private meetsPerformanceRequirements(bot: Bot, requirements: Partial<BotPerformance>): boolean {
    for (const [key, value] of Object.entries(requirements)) {
      const botValue = bot.performance[key as keyof BotPerformance];
      if (typeof botValue === 'number' && typeof value === 'number') {
        if (key === 'latency') {
          if (botValue > value) return false; // Lower is better
        } else {
          if (botValue < value) return false;
        }
      }
    }
    return true;
  }

  private rankBots(bots: Bot[], roleConfig: RoleConfig): Bot[] {
    return bots.sort((a, b) => {
      // Score based on role requirements
      const scoreA = this.calculateBotScore(a, roleConfig);
      const scoreB = this.calculateBotScore(b, roleConfig);
      return scoreB - scoreA;
    });
  }

  private calculateBotScore(bot: Bot, roleConfig: RoleConfig): number {
    let score = 0;

    // Capability score
    const capScore = roleConfig.requiredCapabilities.reduce((sum, cap) => {
      const botCap = bot.capabilities.find(c => c.name === cap);
      return sum + (botCap?.level ?? 0);
    }, 0);
    score += capScore * 10;

    // Performance score
    score += bot.performance.winRate;
    score += bot.performance.profitFactor * 20;
    score += bot.performance.uptime;
    score -= bot.performance.latency / 10;

    // Specialization bonus
    if (bot.specializations.includes(roleConfig.role.toLowerCase())) {
      score += 50;
    }

    return score;
  }

  // ============== MANUAL ASSIGNMENT ==============

  assignRole(botId: string, role: BotRoleType): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`[AutoRoleManager] Bot not found: ${botId}`);
      return false;
    }

    // Remove from previous role
    if (bot.currentRole) {
      this.roleAssignments.get(bot.currentRole)?.delete(botId);
    }

    // Assign new role
    bot.currentRole = role;
    bot.assignedAt = new Date();
    this.roleAssignments.get(role)?.add(botId);

    this.emit('role_assigned', { botId, role, bot });
    return true;
  }

  unassignRole(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot || !bot.currentRole) return false;

    this.roleAssignments.get(bot.currentRole)?.delete(botId);
    bot.currentRole = null;
    bot.assignedAt = undefined;

    this.emit('role_unassigned', { botId, bot });
    return true;
  }

  // ============== MARKET ADAPTATION ==============

  updateMarketCondition(condition: Partial<MarketCondition>): void {
    this.marketCondition = { ...this.marketCondition, ...condition };
    console.log('[AutoRoleManager] Market condition updated:', this.marketCondition);

    if (this.isAutoMode) {
      this.adaptToMarket();
    }

    this.emit('market_condition_updated', this.marketCondition);
  }

  private adaptToMarket(): void {
    // Adjust role distribution based on market conditions
    const { volatility, trend, regime } = this.marketCondition;

    // High volatility - more risk managers and sentinels
    if (volatility === 'high' || volatility === 'extreme') {
      const riskConfig = ROLE_CONFIGS.find(r => r.role === 'RISK_MANAGER');
      if (riskConfig) riskConfig.maxBots = 15;

      const sentinelConfig = ROLE_CONFIGS.find(r => r.role === 'SENTINEL');
      if (sentinelConfig) sentinelConfig.maxBots = 25;
    }

    // Trending market - more momentum scanners and executors
    if (trend === 'bullish' || trend === 'bearish') {
      const scannerConfig = ROLE_CONFIGS.find(r => r.role === 'SCANNER');
      if (scannerConfig) scannerConfig.maxBots = 35;

      const executorConfig = ROLE_CONFIGS.find(r => r.role === 'EXECUTOR');
      if (executorConfig) executorConfig.maxBots = 20;
    }

    // Ranging market - more arbitrageurs and market makers
    if (regime === 'ranging') {
      const arbConfig = ROLE_CONFIGS.find(r => r.role === 'ARBITRAGEUR');
      if (arbConfig) arbConfig.maxBots = 15;

      const mmConfig = ROLE_CONFIGS.find(r => r.role === 'MARKET_MAKER');
      if (mmConfig) mmConfig.maxBots = 12;
    }

    // Re-run assignment with new limits
    this.runAutoAssignment();
  }

  // ============== QUERIES ==============

  getBot(botId: string): Bot | undefined {
    return this.bots.get(botId);
  }

  getBotsByRole(role: BotRoleType): Bot[] {
    const botIds = this.roleAssignments.get(role);
    if (!botIds) return [];

    return Array.from(botIds)
      .map(id => this.bots.get(id))
      .filter((bot): bot is Bot => bot !== undefined);
  }

  getAllBots(): Bot[] {
    return Array.from(this.bots.values());
  }

  getActiveBots(): Bot[] {
    return Array.from(this.bots.values()).filter(bot => bot.isActive);
  }

  getUnassignedBots(): Bot[] {
    return Array.from(this.bots.values()).filter(bot => bot.isActive && bot.currentRole === null);
  }

  getRoleStats(): Record<BotRoleType, number> {
    const stats: Record<string, number> = {};
    this.roleAssignments.forEach((bots, role) => {
      stats[role] = bots.size;
    });
    return stats as Record<BotRoleType, number>;
  }

  getMarketCondition(): MarketCondition {
    return { ...this.marketCondition };
  }

  // ============== PERFORMANCE TRACKING ==============

  updateBotPerformance(botId: string, performance: Partial<BotPerformance>): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.performance = { ...bot.performance, ...performance };
      this.emit('bot_performance_updated', { botId, performance: bot.performance });
    }
  }

  getTopPerformers(role?: BotRoleType, limit: number = 10): Bot[] {
    let bots = role ? this.getBotsByRole(role) : this.getActiveBots();

    return bots
      .sort((a, b) => {
        const scoreA = a.performance.winRate * a.performance.profitFactor;
        const scoreB = b.performance.winRate * b.performance.profitFactor;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }
}

// Export singleton
let instance: AutoRoleManager | null = null;

export function getAutoRoleManager(): AutoRoleManager {
  if (!instance) {
    instance = new AutoRoleManager();
  }
  return instance;
}

export default AutoRoleManager;

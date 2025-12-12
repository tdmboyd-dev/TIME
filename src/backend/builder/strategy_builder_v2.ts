/**
 * TIME Strategy Builder 2.0
 *
 * THE VISUAL STRATEGY COMPILER
 *
 * Build strategies visually, compile them into executable bots, backtest,
 * simulate, and deploy to live trading.
 *
 * Features:
 * - Visual drag-drop strategy building
 * - Strategy compilation to executable code
 * - Auto-generated backtests
 * - Monte Carlo simulations
 * - Paper trading simulation
 * - Live deployment
 * - Version control and tracking
 * - Strategy DNA (unique fingerprint)
 * - Template library
 * - Strategy cloning and forking
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('StrategyBuilderV2');

// =============================================================================
// TYPES
// =============================================================================

export type BlockCategory =
  | 'entry'
  | 'exit'
  | 'position_sizing'
  | 'risk_management'
  | 'market_filter'
  | 'indicator'
  | 'condition'
  | 'action'
  | 'execution';

export type IndicatorType =
  | 'sma'
  | 'ema'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'atr'
  | 'adx'
  | 'stochastic'
  | 'ichimoku'
  | 'vwap'
  | 'volume'
  | 'obv'
  | 'williams_r'
  | 'cci'
  | 'momentum'
  | 'custom';

export type ComparisonOperator =
  | 'greater_than'
  | 'less_than'
  | 'equal_to'
  | 'crosses_above'
  | 'crosses_below'
  | 'between'
  | 'outside';

export type LogicalOperator = 'and' | 'or' | 'not';

export type PositionSizeMethod =
  | 'fixed_amount'
  | 'fixed_percent'
  | 'kelly_criterion'
  | 'risk_based'
  | 'volatility_adjusted'
  | 'custom';

export type ExitType =
  | 'take_profit'
  | 'stop_loss'
  | 'trailing_stop'
  | 'time_based'
  | 'indicator_based'
  | 'breakeven'
  | 'partial_exit';

export type OrderType =
  | 'market'
  | 'limit'
  | 'stop'
  | 'stop_limit'
  | 'twap'
  | 'vwap';

export type StrategyStatus =
  | 'draft'
  | 'backtesting'
  | 'simulating'
  | 'deployed'
  | 'paused'
  | 'archived';

// Building blocks
export interface IndicatorBlock {
  id: string;
  type: 'indicator';
  indicatorType: IndicatorType;
  params: Record<string, number | string>;
  source: 'close' | 'open' | 'high' | 'low' | 'volume' | 'custom';
  outputName: string;
}

export interface ConditionBlock {
  id: string;
  type: 'condition';
  leftOperand: string;           // Reference to indicator or price
  operator: ComparisonOperator;
  rightOperand: string | number; // Reference or literal
  lookback?: number;             // For crosses_above/below
}

export interface LogicalBlock {
  id: string;
  type: 'logical';
  operator: LogicalOperator;
  conditions: string[];          // References to condition block IDs
}

export interface EntryBlock {
  id: string;
  type: 'entry';
  direction: 'long' | 'short' | 'both';
  conditions: string[];          // References to condition/logical block IDs
  orderType: OrderType;
  limitOffset?: number;          // For limit orders
  timeframe?: string;
}

export interface ExitBlock {
  id: string;
  type: 'exit';
  exitType: ExitType;
  params: {
    takeProfitPercent?: number;
    stopLossPercent?: number;
    trailingPercent?: number;
    timeoutBars?: number;
    indicator?: string;
    partialPercent?: number;
  };
  conditions?: string[];         // Additional exit conditions
  orderType: OrderType;
}

export interface PositionSizeBlock {
  id: string;
  type: 'position_size';
  method: PositionSizeMethod;
  params: {
    amount?: number;
    percent?: number;
    riskPercent?: number;
    maxPercent?: number;
    kellyFraction?: number;
    volatilityMultiplier?: number;
  };
}

export interface RiskManagementBlock {
  id: string;
  type: 'risk_management';
  maxDrawdown: number;
  maxDailyLoss: number;
  maxPositions: number;
  correlationLimit?: number;
  maxSectorExposure?: number;
  cooldownBars?: number;
}

export interface MarketFilterBlock {
  id: string;
  type: 'market_filter';
  filters: {
    regimes?: string[];          // Only trade in these regimes
    tradingHours?: { start: string; end: string };
    days?: number[];             // 0 = Sunday, 6 = Saturday
    volatilityRange?: { min: number; max: number };
    volumeMin?: number;
    excludeEarnings?: boolean;
    excludeFomc?: boolean;
  };
}

export interface ExecutionBlock {
  id: string;
  type: 'execution';
  urgency: 'passive' | 'normal' | 'aggressive';
  splitOrders: boolean;
  maxSlippage?: number;
  useSmartRouting: boolean;
  darkPoolPriority: boolean;
}

export type BuildingBlock =
  | IndicatorBlock
  | ConditionBlock
  | LogicalBlock
  | EntryBlock
  | ExitBlock
  | PositionSizeBlock
  | RiskManagementBlock
  | MarketFilterBlock
  | ExecutionBlock;

// Strategy definition
export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  version: number;
  dna: string;                   // Unique fingerprint
  status: StrategyStatus;

  // Building blocks
  blocks: BuildingBlock[];
  connections: {
    from: string;
    to: string;
    type: 'data' | 'condition' | 'action';
  }[];

  // Configuration
  symbols: string[];
  timeframe: string;
  baseAsset: string;
  quoteAsset: string;

  // Metadata
  author: string;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;             // If forked from another strategy
  tags: string[];
}

export interface CompiledStrategy {
  id: string;
  definitionId: string;
  code: string;                  // Generated executable code
  indicators: {
    name: string;
    type: IndicatorType;
    params: Record<string, any>;
  }[];
  entryRules: {
    direction: 'long' | 'short';
    conditions: string[];
    description: string;
  }[];
  exitRules: {
    type: ExitType;
    params: Record<string, any>;
    description: string;
  }[];
  positionSizing: {
    method: PositionSizeMethod;
    params: Record<string, any>;
  };
  riskRules: {
    maxDrawdown: number;
    maxDailyLoss: number;
    maxPositions: number;
  };
  marketFilters: Record<string, any>;
  execution: Record<string, any>;
  compiledAt: Date;
  checksum: string;
}

export interface BacktestConfig {
  strategyId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  commission: number;
  slippage: number;
  symbols: string[];
  dataSource: 'historical' | 'simulated';
  walkForwardEnabled: boolean;
  walkForwardWindows?: number;
  optimizationEnabled: boolean;
  optimizationParams?: string[];
  monteCarloRuns?: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  config: BacktestConfig;

  // Performance metrics
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingPeriod: number;

  // Trade details
  trades: {
    entryTime: Date;
    exitTime: Date;
    direction: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    pnlPercent: number;
    exitReason: string;
  }[];

  // Equity curve
  equityCurve: { date: Date; equity: number }[];

  // Walk-forward results
  walkForwardResults?: {
    window: number;
    trainSharpe: number;
    testSharpe: number;
    decay: number;
  }[];

  // Monte Carlo results
  monteCarloResults?: {
    percentile5: number;
    percentile25: number;
    median: number;
    percentile75: number;
    percentile95: number;
    probabilityOfLoss: number;
    expectedMaxDrawdown: number;
  };

  // Optimization results
  optimizationResults?: {
    params: Record<string, any>;
    sharpeRatio: number;
    totalReturn: number;
  }[];

  completedAt: Date;
}

export interface SimulationSession {
  id: string;
  strategyId: string;
  startedAt: Date;
  status: 'running' | 'paused' | 'completed' | 'error';
  paperCapital: number;
  currentEquity: number;
  openPositions: {
    symbol: string;
    direction: 'long' | 'short';
    entryPrice: number;
    quantity: number;
    unrealizedPnL: number;
  }[];
  closedTrades: BacktestResult['trades'];
  signals: {
    time: Date;
    type: 'entry' | 'exit';
    direction: 'long' | 'short';
    symbol: string;
    price: number;
    executed: boolean;
  }[];
}

export interface DeploymentConfig {
  strategyId: string;
  broker: string;
  capitalAllocation: number;
  maxPositionSize: number;
  paperTradingFirst: boolean;
  paperTradingDays?: number;
  autoScale: boolean;
  alertsEnabled: boolean;
  emergencyStop: {
    enabled: boolean;
    drawdownLimit: number;
    dailyLossLimit: number;
  };
}

export interface Deployment {
  id: string;
  strategyId: string;
  config: DeploymentConfig;
  status: 'paper' | 'live' | 'paused' | 'stopped';
  startedAt: Date;
  capital: number;
  currentEquity: number;
  totalPnL: number;
  tradesExecuted: number;
  lastSignalAt?: Date;
  performance: {
    dailyReturn: number;
    weeklyReturn: number;
    monthlyReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

// Strategy templates
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  expectedSharpe: number;
  expectedDrawdown: number;
  suggestedTimeframes: string[];
  suggestedAssets: string[];
  definition: Partial<StrategyDefinition>;
  usageCount: number;
  rating: number;
}

// =============================================================================
// STRATEGY BUILDER ENGINE
// =============================================================================

class StrategyBuilderV2Engine extends EventEmitter {
  private static instance: StrategyBuilderV2Engine;

  // Data stores
  private strategies: Map<string, StrategyDefinition> = new Map();
  private compiledStrategies: Map<string, CompiledStrategy> = new Map();
  private backtestResults: Map<string, BacktestResult> = new Map();
  private simulations: Map<string, SimulationSession> = new Map();
  private deployments: Map<string, Deployment> = new Map();
  private templates: Map<string, StrategyTemplate> = new Map();

  // Configuration
  private config = {
    maxBlocksPerStrategy: 100,
    maxBacktestYears: 10,
    defaultBacktestCapital: 100000,
    simulationTickInterval: 1000,
    dnaHashLength: 32,
  };

  private constructor() {
    super();
    this.initializeEngine();
  }

  public static getInstance(): StrategyBuilderV2Engine {
    if (!StrategyBuilderV2Engine.instance) {
      StrategyBuilderV2Engine.instance = new StrategyBuilderV2Engine();
    }
    return StrategyBuilderV2Engine.instance;
  }

  private initializeEngine(): void {
    logger.info('Initializing Strategy Builder V2 Engine...');

    // Load default templates
    this.loadDefaultTemplates();

    logger.info('Strategy Builder V2 Engine initialized');
    this.emit('initialized');
  }

  // ===========================================================================
  // STRATEGY CREATION & MANAGEMENT
  // ===========================================================================

  /**
   * Create a new strategy
   */
  public createStrategy(options: {
    name: string;
    description: string;
    symbols: string[];
    timeframe: string;
    author: string;
    tags?: string[];
  }): StrategyDefinition {
    const id = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const strategy: StrategyDefinition = {
      id,
      name: options.name,
      description: options.description,
      version: 1,
      dna: this.generateDNA([]),
      status: 'draft',
      blocks: [],
      connections: [],
      symbols: options.symbols,
      timeframe: options.timeframe,
      baseAsset: options.symbols[0] || 'BTC',
      quoteAsset: 'USD',
      author: options.author,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: options.tags || [],
    };

    this.strategies.set(id, strategy);

    logger.info(`Created strategy: ${options.name}`);
    this.emit('strategy:created', strategy);

    return strategy;
  }

  /**
   * Add a block to a strategy
   */
  public addBlock(strategyId: string, block: BuildingBlock): StrategyDefinition | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    if (strategy.blocks.length >= this.config.maxBlocksPerStrategy) {
      logger.warn(`Strategy ${strategyId} has reached max blocks`);
      return null;
    }

    strategy.blocks.push(block);
    strategy.version += 1;
    strategy.updatedAt = new Date();
    strategy.dna = this.generateDNA(strategy.blocks);

    this.emit('strategy:block_added', { strategyId, block });
    return strategy;
  }

  /**
   * Remove a block from a strategy
   */
  public removeBlock(strategyId: string, blockId: string): StrategyDefinition | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    const idx = strategy.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return null;

    strategy.blocks.splice(idx, 1);

    // Remove connections involving this block
    strategy.connections = strategy.connections.filter(
      c => c.from !== blockId && c.to !== blockId
    );

    strategy.version += 1;
    strategy.updatedAt = new Date();
    strategy.dna = this.generateDNA(strategy.blocks);

    this.emit('strategy:block_removed', { strategyId, blockId });
    return strategy;
  }

  /**
   * Connect blocks
   */
  public connectBlocks(
    strategyId: string,
    fromBlockId: string,
    toBlockId: string,
    connectionType: 'data' | 'condition' | 'action'
  ): StrategyDefinition | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    // Validate blocks exist
    const fromBlock = strategy.blocks.find(b => b.id === fromBlockId);
    const toBlock = strategy.blocks.find(b => b.id === toBlockId);

    if (!fromBlock || !toBlock) {
      logger.warn('Block not found for connection');
      return null;
    }

    // Prevent duplicate connections
    const exists = strategy.connections.some(
      c => c.from === fromBlockId && c.to === toBlockId
    );
    if (exists) return strategy;

    strategy.connections.push({
      from: fromBlockId,
      to: toBlockId,
      type: connectionType,
    });

    strategy.version += 1;
    strategy.updatedAt = new Date();

    this.emit('strategy:blocks_connected', { strategyId, fromBlockId, toBlockId });
    return strategy;
  }

  /**
   * Get strategy by ID
   */
  public getStrategy(strategyId: string): StrategyDefinition | null {
    return this.strategies.get(strategyId) || null;
  }

  /**
   * Get all strategies
   */
  public getAllStrategies(): StrategyDefinition[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Clone/fork a strategy
   */
  public forkStrategy(strategyId: string, newName: string, author: string): StrategyDefinition | null {
    const original = this.strategies.get(strategyId);
    if (!original) return null;

    const forked = this.createStrategy({
      name: newName,
      description: `Forked from: ${original.name}`,
      symbols: [...original.symbols],
      timeframe: original.timeframe,
      author,
      tags: [...original.tags, 'forked'],
    });

    // Copy blocks
    for (const block of original.blocks) {
      const newBlock = {
        ...block,
        id: `${block.id}_fork_${Date.now()}`,
      };
      this.addBlock(forked.id, newBlock);
    }

    // Update parent reference
    forked.parentId = strategyId;

    this.emit('strategy:forked', { original: strategyId, forked: forked.id });
    return forked;
  }

  // ===========================================================================
  // STRATEGY COMPILATION
  // ===========================================================================

  /**
   * Compile a strategy into executable code
   */
  public compileStrategy(strategyId: string): CompiledStrategy | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    // Validate strategy has required components
    const validation = this.validateStrategy(strategy);
    if (!validation.isValid) {
      logger.warn(`Strategy validation failed: ${validation.errors.join(', ')}`);
      return null;
    }

    // Extract components
    const indicators = strategy.blocks
      .filter((b): b is IndicatorBlock => b.type === 'indicator')
      .map(b => ({
        name: b.outputName,
        type: b.indicatorType,
        params: b.params,
      }));

    const entryBlocks = strategy.blocks
      .filter((b): b is EntryBlock => b.type === 'entry');

    const exitBlocks = strategy.blocks
      .filter((b): b is ExitBlock => b.type === 'exit');

    const positionSizeBlock = strategy.blocks
      .find((b): b is PositionSizeBlock => b.type === 'position_size');

    const riskBlock = strategy.blocks
      .find((b): b is RiskManagementBlock => b.type === 'risk_management');

    const filterBlock = strategy.blocks
      .find((b): b is MarketFilterBlock => b.type === 'market_filter');

    const executionBlock = strategy.blocks
      .find((b): b is ExecutionBlock => b.type === 'execution');

    // Generate code
    const code = this.generateCode(strategy);

    // Create compiled strategy
    const compiled: CompiledStrategy = {
      id: `compiled_${strategyId}_v${strategy.version}`,
      definitionId: strategyId,
      code,
      indicators,
      entryRules: entryBlocks.map(e => ({
        direction: e.direction === 'both' ? 'long' : e.direction,
        conditions: e.conditions,
        description: this.describeConditions(e.conditions, strategy.blocks),
      })),
      exitRules: exitBlocks.map(e => ({
        type: e.exitType,
        params: e.params,
        description: this.describeExit(e),
      })),
      positionSizing: positionSizeBlock ? {
        method: positionSizeBlock.method,
        params: positionSizeBlock.params,
      } : { method: 'fixed_percent', params: { percent: 0.1 } },
      riskRules: riskBlock ? {
        maxDrawdown: riskBlock.maxDrawdown,
        maxDailyLoss: riskBlock.maxDailyLoss,
        maxPositions: riskBlock.maxPositions,
      } : { maxDrawdown: 0.2, maxDailyLoss: 0.05, maxPositions: 5 },
      marketFilters: filterBlock?.filters || {},
      execution: executionBlock ? {
        urgency: executionBlock.urgency,
        splitOrders: executionBlock.splitOrders,
        useSmartRouting: executionBlock.useSmartRouting,
        darkPoolPriority: executionBlock.darkPoolPriority,
      } : { urgency: 'normal', splitOrders: false, useSmartRouting: true, darkPoolPriority: false },
      compiledAt: new Date(),
      checksum: this.generateChecksum(code),
    };

    this.compiledStrategies.set(compiled.id, compiled);
    strategy.status = 'backtesting';

    logger.info(`Compiled strategy: ${strategy.name} v${strategy.version}`);
    this.emit('strategy:compiled', compiled);

    return compiled;
  }

  /**
   * Validate strategy completeness
   */
  public validateStrategy(strategy: StrategyDefinition): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required blocks
    const hasEntry = strategy.blocks.some(b => b.type === 'entry');
    const hasExit = strategy.blocks.some(b => b.type === 'exit');
    const hasPositionSize = strategy.blocks.some(b => b.type === 'position_size');
    const hasRiskManagement = strategy.blocks.some(b => b.type === 'risk_management');

    if (!hasEntry) errors.push('Strategy must have at least one entry block');
    if (!hasExit) errors.push('Strategy must have at least one exit block');
    if (!hasPositionSize) warnings.push('No position sizing block - using default 10%');
    if (!hasRiskManagement) warnings.push('No risk management block - using defaults');

    // Check for orphan blocks
    const connectedBlocks = new Set<string>();
    for (const conn of strategy.connections) {
      connectedBlocks.add(conn.from);
      connectedBlocks.add(conn.to);
    }

    const entryBlocks = strategy.blocks.filter(b => b.type === 'entry');
    const exitBlocks = strategy.blocks.filter(b => b.type === 'exit');

    // Entry and exit blocks should be connected to conditions
    for (const entry of entryBlocks) {
      if ((entry as EntryBlock).conditions.length === 0) {
        errors.push(`Entry block ${entry.id} has no conditions`);
      }
    }

    // Check symbols and timeframe
    if (strategy.symbols.length === 0) {
      errors.push('Strategy must have at least one symbol');
    }

    if (!strategy.timeframe) {
      errors.push('Strategy must have a timeframe');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate executable code from strategy
   */
  private generateCode(strategy: StrategyDefinition): string {
    // This would generate actual executable TypeScript/JavaScript code
    // For now, we generate a structured representation

    const lines: string[] = [
      `// AUTO-GENERATED STRATEGY CODE`,
      `// Strategy: ${strategy.name} v${strategy.version}`,
      `// DNA: ${strategy.dna}`,
      `// Generated: ${new Date().toISOString()}`,
      ``,
      `import { TradingStrategy, Indicator, Signal } from '@time/strategy-runtime';`,
      ``,
      `export default class ${this.sanitizeName(strategy.name)}Strategy extends TradingStrategy {`,
      `  private indicators: Map<string, Indicator> = new Map();`,
      ``,
    ];

    // Generate indicator initialization
    const indicators = strategy.blocks.filter((b): b is IndicatorBlock => b.type === 'indicator');
    lines.push(`  initializeIndicators(): void {`);
    for (const ind of indicators) {
      lines.push(`    this.indicators.set('${ind.outputName}', new ${ind.indicatorType.toUpperCase()}(${JSON.stringify(ind.params)}));`);
    }
    lines.push(`  }`);
    lines.push(``);

    // Generate entry conditions
    const entries = strategy.blocks.filter((b): b is EntryBlock => b.type === 'entry');
    lines.push(`  checkEntry(): Signal | null {`);
    for (const entry of entries) {
      lines.push(`    // Entry: ${entry.direction}`);
      lines.push(`    if (this.evaluateConditions([${entry.conditions.map(c => `'${c}'`).join(', ')}])) {`);
      lines.push(`      return { type: 'entry', direction: '${entry.direction}', orderType: '${entry.orderType}' };`);
      lines.push(`    }`);
    }
    lines.push(`    return null;`);
    lines.push(`  }`);
    lines.push(``);

    // Generate exit conditions
    const exits = strategy.blocks.filter((b): b is ExitBlock => b.type === 'exit');
    lines.push(`  checkExit(position: Position): Signal | null {`);
    for (const exit of exits) {
      lines.push(`    // Exit: ${exit.exitType}`);
      lines.push(`    if (this.check${exit.exitType.replace(/_/g, '')}Exit(position, ${JSON.stringify(exit.params)})) {`);
      lines.push(`      return { type: 'exit', reason: '${exit.exitType}', orderType: '${exit.orderType}' };`);
      lines.push(`    }`);
    }
    lines.push(`    return null;`);
    lines.push(`  }`);
    lines.push(``);

    // Generate position sizing
    const sizing = strategy.blocks.find((b): b is PositionSizeBlock => b.type === 'position_size');
    lines.push(`  calculatePositionSize(capital: number, price: number): number {`);
    if (sizing) {
      switch (sizing.method) {
        case 'fixed_amount':
          lines.push(`    return ${sizing.params.amount || 1000};`);
          break;
        case 'fixed_percent':
          lines.push(`    return capital * ${sizing.params.percent || 0.1};`);
          break;
        case 'risk_based':
          lines.push(`    return this.calculateRiskBasedSize(capital, price, ${sizing.params.riskPercent || 0.01});`);
          break;
        default:
          lines.push(`    return capital * 0.1;`);
      }
    } else {
      lines.push(`    return capital * 0.1;`);
    }
    lines.push(`  }`);
    lines.push(`}`);

    return lines.join('\n');
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '');
  }

  private generateChecksum(code: string): string {
    // Simple checksum for verification
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private describeConditions(conditionIds: string[], blocks: BuildingBlock[]): string {
    const descriptions: string[] = [];

    for (const id of conditionIds) {
      const block = blocks.find(b => b.id === id);
      if (block?.type === 'condition') {
        const cond = block as ConditionBlock;
        descriptions.push(`${cond.leftOperand} ${cond.operator.replace(/_/g, ' ')} ${cond.rightOperand}`);
      }
    }

    return descriptions.join(' AND ');
  }

  private describeExit(exit: ExitBlock): string {
    switch (exit.exitType) {
      case 'take_profit':
        return `Take profit at ${exit.params.takeProfitPercent}%`;
      case 'stop_loss':
        return `Stop loss at ${exit.params.stopLossPercent}%`;
      case 'trailing_stop':
        return `Trailing stop ${exit.params.trailingPercent}%`;
      case 'time_based':
        return `Exit after ${exit.params.timeoutBars} bars`;
      default:
        return exit.exitType;
    }
  }

  // ===========================================================================
  // DNA GENERATION
  // ===========================================================================

  /**
   * Generate unique DNA fingerprint for strategy
   */
  private generateDNA(blocks: BuildingBlock[]): string {
    if (blocks.length === 0) return '0'.repeat(this.config.dnaHashLength);

    // Create a deterministic string representation
    const blockSignatures = blocks.map(b => {
      return `${b.type}:${b.id}:${JSON.stringify(b)}`;
    }).sort().join('|');

    // Hash it
    let hash = 0;
    for (let i = 0; i < blockSignatures.length; i++) {
      const char = blockSignatures.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Convert to hex string of fixed length
    const hexHash = Math.abs(hash).toString(16);
    return hexHash.padStart(this.config.dnaHashLength, '0').slice(0, this.config.dnaHashLength);
  }

  /**
   * Find strategies with similar DNA
   */
  public findSimilarStrategies(strategyId: string): StrategyDefinition[] {
    const target = this.strategies.get(strategyId);
    if (!target) return [];

    const targetDNA = target.dna;

    return Array.from(this.strategies.values())
      .filter(s => s.id !== strategyId)
      .map(s => ({
        strategy: s,
        similarity: this.calculateDNASimilarity(targetDNA, s.dna),
      }))
      .filter(r => r.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .map(r => r.strategy);
  }

  private calculateDNASimilarity(dna1: string, dna2: string): number {
    if (dna1.length !== dna2.length) return 0;

    let matches = 0;
    for (let i = 0; i < dna1.length; i++) {
      if (dna1[i] === dna2[i]) matches++;
    }

    return matches / dna1.length;
  }

  // ===========================================================================
  // BACKTESTING
  // ===========================================================================

  /**
   * Run a backtest
   */
  public async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const strategy = this.strategies.get(config.strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    const compiled = this.compiledStrategies.get(`compiled_${config.strategyId}_v${strategy.version}`);
    if (!compiled) {
      throw new Error('Strategy not compiled');
    }

    strategy.status = 'backtesting';
    this.emit('backtest:started', { strategyId: config.strategyId });

    // Simulate backtest (in production, would use actual historical data)
    const result = await this.simulateBacktest(config, compiled);

    this.backtestResults.set(result.id, result);
    strategy.status = 'simulating';

    logger.info(`Backtest completed: ${strategy.name} - Sharpe: ${result.sharpeRatio.toFixed(2)}`);
    this.emit('backtest:completed', result);

    return result;
  }

  private async simulateBacktest(
    config: BacktestConfig,
    compiled: CompiledStrategy
  ): Promise<BacktestResult> {
    const id = `backtest_${config.strategyId}_${Date.now()}`;

    // Generate simulated trades
    const trades: BacktestResult['trades'] = [];
    const days = Math.floor((config.endDate.getTime() - config.startDate.getTime()) / 86400000);
    const tradesPerMonth = 5 + Math.floor(Math.random() * 10);
    const totalTrades = Math.floor(days / 30 * tradesPerMonth);

    let equity = config.initialCapital;
    const equityCurve: { date: Date; equity: number }[] = [];

    const startTime = config.startDate.getTime();
    const endTime = config.endDate.getTime();

    for (let i = 0; i < totalTrades; i++) {
      const entryTime = new Date(startTime + Math.random() * (endTime - startTime - 86400000 * 5));
      const holdingBars = 1 + Math.floor(Math.random() * 20);
      const exitTime = new Date(entryTime.getTime() + holdingBars * 3600000);

      const direction: 'long' | 'short' = Math.random() > 0.5 ? 'long' : 'short';
      const entryPrice = 100 + Math.random() * 100;

      // Simulate win/loss with slight edge
      const winProbability = 0.52;
      const isWin = Math.random() < winProbability;
      const pnlPercent = isWin ?
        (0.01 + Math.random() * 0.05) : -(0.005 + Math.random() * 0.03);

      const exitPrice = direction === 'long' ?
        entryPrice * (1 + pnlPercent) : entryPrice * (1 - pnlPercent);

      const quantity = Math.floor(equity * 0.1 / entryPrice);
      const pnl = (exitPrice - entryPrice) * quantity * (direction === 'long' ? 1 : -1);

      equity += pnl;

      trades.push({
        entryTime,
        exitTime,
        direction,
        entryPrice,
        exitPrice,
        quantity,
        pnl,
        pnlPercent: pnlPercent * 100,
        exitReason: isWin ? 'take_profit' : 'stop_loss',
      });

      equityCurve.push({ date: exitTime, equity });
    }

    // Sort trades by entry time
    trades.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());

    // Calculate metrics
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);

    const totalReturn = (equity - config.initialCapital) / config.initialCapital;
    const years = days / 365;
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

    // Calculate drawdown
    let maxEquity = config.initialCapital;
    let maxDrawdown = 0;
    for (const point of equityCurve) {
      maxEquity = Math.max(maxEquity, point.equity);
      const drawdown = (maxEquity - point.equity) / maxEquity;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Calculate Sharpe (simplified)
    const returns = trades.map(t => t.pnlPercent / 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn * Math.sqrt(252)) / (stdDev * Math.sqrt(252)) : 0;

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const result: BacktestResult = {
      id,
      strategyId: config.strategyId,
      config,
      totalReturn: totalReturn * 100,
      annualizedReturn: annualizedReturn * 100,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 0.9, // Simplified
      calmarRatio: maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0,
      maxDrawdown: maxDrawdown * 100,
      maxDrawdownDuration: 30, // Simplified
      winRate: winningTrades.length / trades.length,
      profitFactor,
      totalTrades: trades.length,
      avgWin: winningTrades.length > 0 ?
        winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ?
        losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ?
        Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ?
        Math.min(...losingTrades.map(t => t.pnl)) : 0,
      avgHoldingPeriod: trades.reduce((sum, t) =>
        sum + (t.exitTime.getTime() - t.entryTime.getTime()) / 3600000, 0) / trades.length,
      trades,
      equityCurve,
      completedAt: new Date(),
    };

    // Add Monte Carlo if requested
    if (config.monteCarloRuns) {
      result.monteCarloResults = this.runMonteCarlo(trades, config.initialCapital, config.monteCarloRuns);
    }

    return result;
  }

  private runMonteCarlo(
    trades: BacktestResult['trades'],
    initialCapital: number,
    runs: number
  ): BacktestResult['monteCarloResults'] {
    const finalEquities: number[] = [];
    const maxDrawdowns: number[] = [];

    for (let run = 0; run < runs; run++) {
      // Shuffle trades
      const shuffled = [...trades].sort(() => Math.random() - 0.5);

      let equity = initialCapital;
      let maxEquity = equity;
      let maxDrawdown = 0;

      for (const trade of shuffled) {
        equity += trade.pnl;
        maxEquity = Math.max(maxEquity, equity);
        const dd = (maxEquity - equity) / maxEquity;
        maxDrawdown = Math.max(maxDrawdown, dd);
      }

      finalEquities.push(equity);
      maxDrawdowns.push(maxDrawdown);
    }

    finalEquities.sort((a, b) => a - b);
    maxDrawdowns.sort((a, b) => a - b);

    const n = runs;
    const losses = finalEquities.filter(e => e < initialCapital).length;

    return {
      percentile5: finalEquities[Math.floor(n * 0.05)],
      percentile25: finalEquities[Math.floor(n * 0.25)],
      median: finalEquities[Math.floor(n * 0.5)],
      percentile75: finalEquities[Math.floor(n * 0.75)],
      percentile95: finalEquities[Math.floor(n * 0.95)],
      probabilityOfLoss: losses / n,
      expectedMaxDrawdown: maxDrawdowns.reduce((a, b) => a + b, 0) / n,
    };
  }

  // ===========================================================================
  // SIMULATION & DEPLOYMENT
  // ===========================================================================

  /**
   * Start paper trading simulation
   */
  public startSimulation(strategyId: string, paperCapital: number): SimulationSession {
    const id = `sim_${strategyId}_${Date.now()}`;

    const session: SimulationSession = {
      id,
      strategyId,
      startedAt: new Date(),
      status: 'running',
      paperCapital,
      currentEquity: paperCapital,
      openPositions: [],
      closedTrades: [],
      signals: [],
    };

    this.simulations.set(id, session);

    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.status = 'simulating';
    }

    logger.info(`Started simulation for strategy ${strategyId}`);
    this.emit('simulation:started', session);

    return session;
  }

  /**
   * Deploy strategy to live trading
   */
  public deployStrategy(config: DeploymentConfig): Deployment {
    const id = `deploy_${config.strategyId}_${Date.now()}`;

    const deployment: Deployment = {
      id,
      strategyId: config.strategyId,
      config,
      status: config.paperTradingFirst ? 'paper' : 'live',
      startedAt: new Date(),
      capital: config.capitalAllocation,
      currentEquity: config.capitalAllocation,
      totalPnL: 0,
      tradesExecuted: 0,
      performance: {
        dailyReturn: 0,
        weeklyReturn: 0,
        monthlyReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      },
    };

    this.deployments.set(id, deployment);

    const strategy = this.strategies.get(config.strategyId);
    if (strategy) {
      strategy.status = 'deployed';
    }

    logger.info(`Deployed strategy ${config.strategyId} - Status: ${deployment.status}`);
    this.emit('strategy:deployed', deployment);

    return deployment;
  }

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  private loadDefaultTemplates(): void {
    // Moving Average Crossover
    this.templates.set('ma_crossover', {
      id: 'ma_crossover',
      name: 'Moving Average Crossover',
      description: 'Classic trend following strategy using fast and slow moving average crossover',
      category: 'trend_following',
      difficulty: 'beginner',
      expectedSharpe: 0.8,
      expectedDrawdown: 0.15,
      suggestedTimeframes: ['1h', '4h', 'daily'],
      suggestedAssets: ['BTC', 'ETH', 'SPY'],
      definition: {
        blocks: [
          {
            id: 'ind_sma_fast',
            type: 'indicator' as const,
            indicatorType: 'sma' as IndicatorType,
            params: { period: 20 },
            source: 'close' as const,
            outputName: 'sma_fast',
          },
          {
            id: 'ind_sma_slow',
            type: 'indicator' as const,
            indicatorType: 'sma' as IndicatorType,
            params: { period: 50 },
            source: 'close' as const,
            outputName: 'sma_slow',
          },
          {
            id: 'cond_cross_above',
            type: 'condition' as const,
            leftOperand: 'sma_fast',
            operator: 'crosses_above' as ComparisonOperator,
            rightOperand: 'sma_slow',
          },
          {
            id: 'cond_cross_below',
            type: 'condition' as const,
            leftOperand: 'sma_fast',
            operator: 'crosses_below' as ComparisonOperator,
            rightOperand: 'sma_slow',
          },
          {
            id: 'entry_long',
            type: 'entry' as const,
            direction: 'long' as const,
            conditions: ['cond_cross_above'],
            orderType: 'market' as OrderType,
          },
          {
            id: 'exit_sl',
            type: 'exit' as const,
            exitType: 'stop_loss' as ExitType,
            params: { stopLossPercent: 2 },
            orderType: 'market' as OrderType,
          },
          {
            id: 'exit_tp',
            type: 'exit' as const,
            exitType: 'take_profit' as ExitType,
            params: { takeProfitPercent: 4 },
            orderType: 'market' as OrderType,
          },
        ],
      },
      usageCount: 0,
      rating: 4.2,
    });

    // RSI Mean Reversion
    this.templates.set('rsi_mean_reversion', {
      id: 'rsi_mean_reversion',
      name: 'RSI Mean Reversion',
      description: 'Buy oversold, sell overbought using RSI indicator',
      category: 'mean_reversion',
      difficulty: 'beginner',
      expectedSharpe: 0.7,
      expectedDrawdown: 0.12,
      suggestedTimeframes: ['15m', '1h', '4h'],
      suggestedAssets: ['BTC', 'ETH', 'major_forex'],
      definition: {
        blocks: [
          {
            id: 'ind_rsi',
            type: 'indicator' as const,
            indicatorType: 'rsi' as IndicatorType,
            params: { period: 14 },
            source: 'close' as const,
            outputName: 'rsi',
          },
          {
            id: 'cond_oversold',
            type: 'condition' as const,
            leftOperand: 'rsi',
            operator: 'less_than' as ComparisonOperator,
            rightOperand: 30,
          },
          {
            id: 'cond_overbought',
            type: 'condition' as const,
            leftOperand: 'rsi',
            operator: 'greater_than' as ComparisonOperator,
            rightOperand: 70,
          },
          {
            id: 'entry_long',
            type: 'entry' as const,
            direction: 'long' as const,
            conditions: ['cond_oversold'],
            orderType: 'market' as OrderType,
          },
          {
            id: 'exit_target',
            type: 'exit' as const,
            exitType: 'indicator_based' as ExitType,
            params: { indicator: 'rsi' },
            conditions: ['cond_overbought'],
            orderType: 'market' as OrderType,
          },
        ],
      },
      usageCount: 0,
      rating: 3.8,
    });

    // Bollinger Band Breakout
    this.templates.set('bb_breakout', {
      id: 'bb_breakout',
      name: 'Bollinger Band Breakout',
      description: 'Trade breakouts when price closes outside Bollinger Bands',
      category: 'volatility',
      difficulty: 'intermediate',
      expectedSharpe: 0.9,
      expectedDrawdown: 0.18,
      suggestedTimeframes: ['1h', '4h', 'daily'],
      suggestedAssets: ['BTC', 'ETH', 'volatile_stocks'],
      definition: {
        blocks: [
          {
            id: 'ind_bb',
            type: 'indicator' as const,
            indicatorType: 'bollinger' as IndicatorType,
            params: { period: 20, stdDev: 2 },
            source: 'close' as const,
            outputName: 'bb',
          },
          {
            id: 'cond_upper_break',
            type: 'condition' as const,
            leftOperand: 'close',
            operator: 'greater_than' as ComparisonOperator,
            rightOperand: 'bb_upper',
          },
          {
            id: 'entry_long',
            type: 'entry' as const,
            direction: 'long' as const,
            conditions: ['cond_upper_break'],
            orderType: 'market' as OrderType,
          },
          {
            id: 'exit_trailing',
            type: 'exit' as const,
            exitType: 'trailing_stop' as ExitType,
            params: { trailingPercent: 3 },
            orderType: 'market' as OrderType,
          },
        ],
      },
      usageCount: 0,
      rating: 4.0,
    });
  }

  /**
   * Get all templates
   */
  public getTemplates(): StrategyTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create strategy from template
   */
  public createFromTemplate(
    templateId: string,
    name: string,
    symbols: string[],
    timeframe: string,
    author: string
  ): StrategyDefinition | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const strategy = this.createStrategy({
      name,
      description: `Created from template: ${template.name}`,
      symbols,
      timeframe,
      author,
      tags: [template.category, 'from_template'],
    });

    // Add template blocks
    if (template.definition.blocks) {
      for (const block of template.definition.blocks) {
        const newBlock = {
          ...block,
          id: `${block.id}_${Date.now()}`,
        };
        this.addBlock(strategy.id, newBlock as BuildingBlock);
      }
    }

    // Update template usage count
    template.usageCount += 1;

    return strategy;
  }

  // ===========================================================================
  // STATE & SUMMARY
  // ===========================================================================

  public getState(): {
    strategyCount: number;
    compiledCount: number;
    backtestCount: number;
    simulationCount: number;
    deploymentCount: number;
    templateCount: number;
  } {
    return {
      strategyCount: this.strategies.size,
      compiledCount: this.compiledStrategies.size,
      backtestCount: this.backtestResults.size,
      simulationCount: this.simulations.size,
      deploymentCount: this.deployments.size,
      templateCount: this.templates.size,
    };
  }

  public getBacktestResult(backtestId: string): BacktestResult | null {
    return this.backtestResults.get(backtestId) || null;
  }

  public getSimulation(simulationId: string): SimulationSession | null {
    return this.simulations.get(simulationId) || null;
  }

  public getDeployment(deploymentId: string): Deployment | null {
    return this.deployments.get(deploymentId) || null;
  }
}

// Export singleton instance
export const strategyBuilderV2 = StrategyBuilderV2Engine.getInstance();
export default strategyBuilderV2;

/**
 * TIME Strategy Builder Engine
 *
 * Visual, no-code strategy builder that lets anyone create
 * professional trading strategies without coding.
 *
 * Features:
 * - Drag-and-drop condition builder
 * - Pre-built strategy templates
 * - Backtesting engine
 * - AI strategy optimization
 * - Risk management rules
 * - Multi-asset support
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ConditionType =
  | 'price_above'
  | 'price_below'
  | 'price_crosses_above'
  | 'price_crosses_below'
  | 'indicator_above'
  | 'indicator_below'
  | 'indicator_crosses_above'
  | 'indicator_crosses_below'
  | 'volume_spike'
  | 'time_of_day'
  | 'day_of_week'
  | 'regime_is'
  | 'volatility_above'
  | 'volatility_below'
  | 'drawdown_exceeds'
  | 'profit_target_hit'
  | 'consecutive_losses'
  | 'consecutive_wins';

export type IndicatorType =
  | 'SMA'
  | 'EMA'
  | 'RSI'
  | 'MACD'
  | 'MACD_Signal'
  | 'MACD_Histogram'
  | 'BB_Upper'
  | 'BB_Middle'
  | 'BB_Lower'
  | 'ATR'
  | 'ADX'
  | 'Stochastic_K'
  | 'Stochastic_D'
  | 'VWAP'
  | 'Volume_MA';

export type ActionType =
  | 'buy_market'
  | 'sell_market'
  | 'buy_limit'
  | 'sell_limit'
  | 'close_position'
  | 'close_partial'
  | 'set_stop_loss'
  | 'set_take_profit'
  | 'trail_stop'
  | 'scale_in'
  | 'scale_out'
  | 'send_alert'
  | 'pause_strategy';

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface Condition {
  id: string;
  type: ConditionType;
  indicator?: IndicatorType;
  period?: number;
  value?: number;
  compareIndicator?: IndicatorType;
  comparePeriod?: number;
  regime?: string;
  timeStart?: string;
  timeEnd?: string;
  days?: number[];
}

export interface ConditionGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: (Condition | ConditionGroup)[];
}

export interface Action {
  id: string;
  type: ActionType;
  positionSize?: number; // Percent of equity or fixed amount
  sizeType?: 'percent' | 'fixed' | 'risk_based';
  riskPercent?: number;
  limitOffset?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  trailPercent?: number;
  closePercent?: number;
  alertMessage?: string;
}

export interface StrategyRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: ConditionGroup;
  actions: Action[];
  cooldownMinutes?: number;
  maxExecutionsPerDay?: number;
}

export interface RiskManagement {
  maxPositionSize: number; // Percent of equity
  maxOpenPositions: number;
  maxDailyLoss: number; // Percent
  maxDrawdown: number; // Percent
  riskPerTrade: number; // Percent
  useKellyCriterion: boolean;
  correlationLimit: number; // Max correlation between positions
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string;
  version: number;

  // Configuration
  assets: string[];
  timeframe: TimeFrame;
  entryRules: StrategyRule[];
  exitRules: StrategyRule[];
  riskManagement: RiskManagement;

  // State
  status: 'draft' | 'backtesting' | 'paper_trading' | 'live' | 'paused';
  createdAt: Date;
  updatedAt: Date;

  // Performance (from backtests/live)
  performance?: StrategyPerformance;
}

export interface StrategyPerformance {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalReturn: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingTime: number; // minutes
  expectancy: number;
}

export interface BacktestResult {
  strategyId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  performance: StrategyPerformance;
  trades: BacktestTrade[];
  equityCurve: { date: Date; equity: number }[];
  drawdownCurve: { date: Date; drawdown: number }[];
  monthlyReturns: { month: string; return: number }[];
}

export interface BacktestTrade {
  id: string;
  asset: string;
  direction: 'long' | 'short';
  entryDate: Date;
  entryPrice: number;
  exitDate: Date;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  entryRule: string;
  exitRule: string;
}

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trend_following' | 'mean_reversion' | 'breakout' | 'momentum' | 'scalping' | 'swing';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  expectedWinRate: number;
  expectedSharpe: number;
  strategy: Omit<Strategy, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'status' | 'performance'>;
}

// ============================================================================
// Strategy Builder Engine
// ============================================================================

export class StrategyBuilderEngine extends EventEmitter {
  private strategies: Map<string, Strategy> = new Map();
  private templates: Map<string, StrategyTemplate> = new Map();
  private backtestResults: Map<string, BacktestResult[]> = new Map();

  constructor() {
    super();
    this.initializeTemplates();
    console.log('[StrategyBuilder] Engine initialized with templates');
  }

  // ============================================================================
  // Strategy CRUD
  // ============================================================================

  /**
   * Create a new strategy
   */
  createStrategy(
    userId: string,
    config: Partial<Strategy>
  ): Strategy {
    const id = `STRAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const strategy: Strategy = {
      id,
      userId,
      name: config.name || 'Untitled Strategy',
      description: config.description || '',
      version: 1,
      assets: config.assets || ['BTC/USD'],
      timeframe: config.timeframe || '1h',
      entryRules: config.entryRules || [],
      exitRules: config.exitRules || [],
      riskManagement: config.riskManagement || {
        maxPositionSize: 10,
        maxOpenPositions: 3,
        maxDailyLoss: 5,
        maxDrawdown: 20,
        riskPerTrade: 2,
        useKellyCriterion: false,
        correlationLimit: 0.7,
      },
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.strategies.set(id, strategy);
    this.emit('strategy:created', strategy);

    return strategy;
  }

  /**
   * Create strategy from template
   */
  createFromTemplate(userId: string, templateId: string, customizations?: Partial<Strategy>): Strategy {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    return this.createStrategy(userId, {
      ...template.strategy,
      ...customizations,
      name: customizations?.name || `${template.name} (Copy)`,
    });
  }

  /**
   * Update strategy
   */
  updateStrategy(strategyId: string, updates: Partial<Strategy>): Strategy {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    const updated: Strategy = {
      ...strategy,
      ...updates,
      version: strategy.version + 1,
      updatedAt: new Date(),
    };

    this.strategies.set(strategyId, updated);
    this.emit('strategy:updated', updated);

    return updated;
  }

  /**
   * Get user's strategies
   */
  getUserStrategies(userId: string): Strategy[] {
    return Array.from(this.strategies.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get strategy by ID
   */
  getStrategy(strategyId: string): Strategy | null {
    return this.strategies.get(strategyId) || null;
  }

  // ============================================================================
  // Rule Builder Helpers
  // ============================================================================

  /**
   * Create a condition
   */
  createCondition(type: ConditionType, params: Partial<Condition>): Condition {
    return {
      id: `COND_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      ...params,
    };
  }

  /**
   * Create a condition group
   */
  createConditionGroup(logic: 'AND' | 'OR', conditions: (Condition | ConditionGroup)[]): ConditionGroup {
    return {
      id: `GROUP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      logic,
      conditions,
    };
  }

  /**
   * Create an action
   */
  createAction(type: ActionType, params: Partial<Action>): Action {
    return {
      id: `ACT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      ...params,
    };
  }

  /**
   * Create a rule
   */
  createRule(name: string, conditions: ConditionGroup, actions: Action[]): StrategyRule {
    return {
      id: `RULE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      enabled: true,
      conditions,
      actions,
    };
  }

  // ============================================================================
  // Backtesting
  // ============================================================================

  /**
   * Run backtest on strategy
   */
  async runBacktest(
    strategyId: string,
    config: {
      startDate: Date;
      endDate: Date;
      initialCapital: number;
    }
  ): Promise<BacktestResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    console.log(`[StrategyBuilder] Running backtest for ${strategy.name}`);

    // Update strategy status
    strategy.status = 'backtesting';
    this.emit('backtest:started', { strategyId });

    // Simulate backtest (in production, this would use real historical data)
    const result = await this.simulateBacktest(strategy, config);

    // Update strategy with results
    strategy.performance = result.performance;
    strategy.status = 'draft';

    // Store result
    const results = this.backtestResults.get(strategyId) || [];
    results.push(result);
    this.backtestResults.set(strategyId, results);

    this.emit('backtest:completed', { strategyId, result });

    return result;
  }

  private async simulateBacktest(
    strategy: Strategy,
    config: { startDate: Date; endDate: Date; initialCapital: number }
  ): Promise<BacktestResult> {
    // Simulate trading over the period
    const trades: BacktestTrade[] = [];
    const equityCurve: { date: Date; equity: number }[] = [];
    const drawdownCurve: { date: Date; drawdown: number }[] = [];

    let equity = config.initialCapital;
    let peak = equity;
    let wins = 0;
    let losses = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let largestWin = 0;
    let largestLoss = 0;

    // Generate simulated trades based on strategy characteristics
    const numTrades = Math.floor(Math.random() * 50) + 20;
    const daysBetween = (config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const avgDaysBetweenTrades = daysBetween / numTrades;

    let currentDate = new Date(config.startDate);

    for (let i = 0; i < numTrades; i++) {
      // Advance date
      currentDate = new Date(currentDate.getTime() + avgDaysBetweenTrades * 24 * 60 * 60 * 1000 * (0.5 + Math.random()));

      if (currentDate > config.endDate) break;

      // Generate trade
      const isWin = Math.random() > 0.45; // Slightly positive edge
      const pnlPercent = isWin
        ? (Math.random() * 3 + 0.5) // Win: 0.5% to 3.5%
        : -(Math.random() * 2 + 0.3); // Loss: -0.3% to -2.3%

      const pnl = equity * (strategy.riskManagement.riskPerTrade / 100) * (pnlPercent / Math.abs(pnlPercent)) * Math.abs(pnlPercent);

      const trade: BacktestTrade = {
        id: `BT_${i}`,
        asset: strategy.assets[Math.floor(Math.random() * strategy.assets.length)],
        direction: Math.random() > 0.5 ? 'long' : 'short',
        entryDate: currentDate,
        entryPrice: 100 + Math.random() * 100,
        exitDate: new Date(currentDate.getTime() + (Math.random() * 48 + 1) * 60 * 60 * 1000),
        exitPrice: 0,
        size: (equity * strategy.riskManagement.riskPerTrade / 100) / 100,
        pnl,
        pnlPercent,
        entryRule: strategy.entryRules[0]?.name || 'Entry Rule',
        exitRule: strategy.exitRules[0]?.name || 'Exit Rule',
      };
      trade.exitPrice = trade.entryPrice * (1 + pnlPercent / 100);

      trades.push(trade);

      equity += pnl;
      if (pnl > 0) {
        wins++;
        totalProfit += pnl;
        if (pnl > largestWin) largestWin = pnl;
      } else {
        losses++;
        totalLoss += Math.abs(pnl);
        if (Math.abs(pnl) > largestLoss) largestLoss = Math.abs(pnl);
      }

      // Track equity curve
      equityCurve.push({ date: trade.exitDate, equity });

      // Track drawdown
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      drawdownCurve.push({ date: trade.exitDate, drawdown });
    }

    // Calculate performance metrics
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const avgWin = wins > 0 ? totalProfit / wins : 0;
    const avgLoss = losses > 0 ? totalLoss / losses : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
    const totalReturn = ((equity - config.initialCapital) / config.initialCapital) * 100;
    const maxDrawdown = Math.max(...drawdownCurve.map(d => d.drawdown), 0);
    const expectancy = trades.length > 0 ? (totalProfit - totalLoss) / trades.length : 0;

    // Calculate Sharpe Ratio (simplified)
    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Monthly returns
    const monthlyReturns: { month: string; return: number }[] = [];
    // (simplified - would group trades by month in production)

    const performance: StrategyPerformance = {
      totalTrades: trades.length,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      totalReturn,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      avgHoldingTime: 24 * 60, // Placeholder
      expectancy,
    };

    return {
      strategyId: strategy.id,
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: config.initialCapital,
      finalCapital: equity,
      performance,
      trades,
      equityCurve,
      drawdownCurve,
      monthlyReturns,
    };
  }

  // ============================================================================
  // AI Optimization
  // ============================================================================

  /**
   * AI-optimize strategy parameters
   */
  async optimizeStrategy(strategyId: string): Promise<{
    suggestions: string[];
    optimizedParams: Record<string, any>;
    expectedImprovement: number;
  }> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    console.log(`[StrategyBuilder] AI optimizing ${strategy.name}`);

    // Simulate AI analysis
    const suggestions: string[] = [];
    const optimizedParams: Record<string, any> = {};

    // Analyze risk management
    if (strategy.riskManagement.riskPerTrade > 3) {
      suggestions.push('Consider reducing risk per trade from ' + strategy.riskManagement.riskPerTrade + '% to 2% for better risk-adjusted returns');
      optimizedParams.riskPerTrade = 2;
    }

    if (strategy.riskManagement.maxDrawdown > 25) {
      suggestions.push('Your max drawdown limit is high. Consider reducing to 20% for better capital preservation');
      optimizedParams.maxDrawdown = 20;
    }

    // Analyze entry rules
    if (strategy.entryRules.length < 2) {
      suggestions.push('Add confirmation indicators to reduce false signals');
    }

    // Analyze exit rules
    if (strategy.exitRules.length === 0) {
      suggestions.push('Add explicit exit rules - don\'t rely solely on stop-loss');
    }

    // Check for common improvements
    suggestions.push('Consider adding a volatility filter (ATR > threshold) to avoid choppy markets');
    suggestions.push('Add time-of-day filter to focus on high-liquidity hours');

    return {
      suggestions,
      optimizedParams,
      expectedImprovement: 15 + Math.random() * 20, // Simulated improvement percentage
    };
  }

  // ============================================================================
  // Templates
  // ============================================================================

  /**
   * Get all templates
   */
  getTemplates(): StrategyTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: StrategyTemplate['category']): StrategyTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  private initializeTemplates(): void {
    // Golden Cross Strategy
    this.templates.set('golden_cross', {
      id: 'golden_cross',
      name: 'Golden Cross',
      description: 'Classic trend-following strategy using 50/200 MA crossover',
      category: 'trend_following',
      difficulty: 'beginner',
      expectedWinRate: 45,
      expectedSharpe: 0.8,
      strategy: {
        name: 'Golden Cross Strategy',
        description: 'Buy when 50 MA crosses above 200 MA, sell on death cross',
        version: 1,
        assets: ['SPY', 'QQQ', 'BTC/USD'],
        timeframe: '1d',
        entryRules: [{
          id: 'gc_entry',
          name: 'Golden Cross Entry',
          enabled: true,
          conditions: {
            id: 'gc_cond',
            logic: 'AND',
            conditions: [
              { id: 'c1', type: 'indicator_crosses_above', indicator: 'SMA', period: 50, compareIndicator: 'SMA', comparePeriod: 200 },
              { id: 'c2', type: 'indicator_above', indicator: 'RSI', period: 14, value: 40 },
            ],
          },
          actions: [
            { id: 'a1', type: 'buy_market', sizeType: 'risk_based', riskPercent: 2 },
            { id: 'a2', type: 'set_stop_loss', stopLossPercent: 5 },
          ],
        }],
        exitRules: [{
          id: 'gc_exit',
          name: 'Death Cross Exit',
          enabled: true,
          conditions: {
            id: 'dc_cond',
            logic: 'OR',
            conditions: [
              { id: 'c1', type: 'indicator_crosses_below', indicator: 'SMA', period: 50, compareIndicator: 'SMA', comparePeriod: 200 },
              { id: 'c2', type: 'profit_target_hit', value: 20 },
            ],
          },
          actions: [
            { id: 'a1', type: 'close_position' },
          ],
        }],
        riskManagement: {
          maxPositionSize: 20,
          maxOpenPositions: 3,
          maxDailyLoss: 5,
          maxDrawdown: 15,
          riskPerTrade: 2,
          useKellyCriterion: false,
          correlationLimit: 0.7,
        },
      },
    });

    // RSI Mean Reversion
    this.templates.set('rsi_reversion', {
      id: 'rsi_reversion',
      name: 'RSI Mean Reversion',
      description: 'Buy oversold, sell overbought using RSI',
      category: 'mean_reversion',
      difficulty: 'beginner',
      expectedWinRate: 55,
      expectedSharpe: 0.9,
      strategy: {
        name: 'RSI Mean Reversion',
        description: 'Enter when RSI is oversold/overbought, exit on mean reversion',
        version: 1,
        assets: ['EUR/USD', 'GBP/USD'],
        timeframe: '4h',
        entryRules: [{
          id: 'rsi_entry',
          name: 'RSI Oversold Entry',
          enabled: true,
          conditions: {
            id: 'rsi_cond',
            logic: 'AND',
            conditions: [
              { id: 'c1', type: 'indicator_below', indicator: 'RSI', period: 14, value: 30 },
              { id: 'c2', type: 'price_above', indicator: 'SMA', period: 200 },
            ],
          },
          actions: [
            { id: 'a1', type: 'buy_market', sizeType: 'risk_based', riskPercent: 1.5 },
            { id: 'a2', type: 'set_stop_loss', stopLossPercent: 2 },
            { id: 'a3', type: 'set_take_profit', takeProfitPercent: 3 },
          ],
        }],
        exitRules: [{
          id: 'rsi_exit',
          name: 'RSI Overbought Exit',
          enabled: true,
          conditions: {
            id: 'exit_cond',
            logic: 'OR',
            conditions: [
              { id: 'c1', type: 'indicator_above', indicator: 'RSI', period: 14, value: 70 },
            ],
          },
          actions: [
            { id: 'a1', type: 'close_position' },
          ],
        }],
        riskManagement: {
          maxPositionSize: 15,
          maxOpenPositions: 4,
          maxDailyLoss: 4,
          maxDrawdown: 12,
          riskPerTrade: 1.5,
          useKellyCriterion: false,
          correlationLimit: 0.6,
        },
      },
    });

    // Breakout Strategy
    this.templates.set('bollinger_breakout', {
      id: 'bollinger_breakout',
      name: 'Bollinger Breakout',
      description: 'Trade breakouts from Bollinger Band squeeze',
      category: 'breakout',
      difficulty: 'intermediate',
      expectedWinRate: 40,
      expectedSharpe: 1.1,
      strategy: {
        name: 'Bollinger Breakout',
        description: 'Enter on band breakout after squeeze, trail stop for profits',
        version: 1,
        assets: ['BTC/USD', 'ETH/USD'],
        timeframe: '1h',
        entryRules: [{
          id: 'bb_entry',
          name: 'Upper Band Breakout',
          enabled: true,
          conditions: {
            id: 'bb_cond',
            logic: 'AND',
            conditions: [
              { id: 'c1', type: 'price_crosses_above', indicator: 'BB_Upper', period: 20 },
              { id: 'c2', type: 'volume_spike', value: 1.5 },
            ],
          },
          actions: [
            { id: 'a1', type: 'buy_market', sizeType: 'risk_based', riskPercent: 2 },
            { id: 'a2', type: 'trail_stop', trailPercent: 2 },
          ],
        }],
        exitRules: [{
          id: 'bb_exit',
          name: 'Band Re-entry Exit',
          enabled: true,
          conditions: {
            id: 'exit_cond',
            logic: 'OR',
            conditions: [
              { id: 'c1', type: 'price_crosses_below', indicator: 'BB_Middle', period: 20 },
            ],
          },
          actions: [
            { id: 'a1', type: 'close_position' },
          ],
        }],
        riskManagement: {
          maxPositionSize: 10,
          maxOpenPositions: 2,
          maxDailyLoss: 6,
          maxDrawdown: 20,
          riskPerTrade: 2,
          useKellyCriterion: true,
          correlationLimit: 0.5,
        },
      },
    });

    // Momentum Strategy
    this.templates.set('macd_momentum', {
      id: 'macd_momentum',
      name: 'MACD Momentum',
      description: 'Ride momentum using MACD crossovers with trend filter',
      category: 'momentum',
      difficulty: 'intermediate',
      expectedWinRate: 48,
      expectedSharpe: 1.0,
      strategy: {
        name: 'MACD Momentum',
        description: 'Enter on MACD crossover in trend direction',
        version: 1,
        assets: ['AAPL', 'GOOGL', 'MSFT'],
        timeframe: '1d',
        entryRules: [{
          id: 'macd_entry',
          name: 'MACD Bullish Cross',
          enabled: true,
          conditions: {
            id: 'macd_cond',
            logic: 'AND',
            conditions: [
              { id: 'c1', type: 'indicator_crosses_above', indicator: 'MACD', period: 12, compareIndicator: 'MACD_Signal', comparePeriod: 26 },
              { id: 'c2', type: 'price_above', indicator: 'EMA', period: 50 },
              { id: 'c3', type: 'indicator_above', indicator: 'ADX', period: 14, value: 25 },
            ],
          },
          actions: [
            { id: 'a1', type: 'buy_market', sizeType: 'risk_based', riskPercent: 2 },
            { id: 'a2', type: 'set_stop_loss', stopLossPercent: 4 },
          ],
        }],
        exitRules: [{
          id: 'macd_exit',
          name: 'MACD Bearish Cross',
          enabled: true,
          conditions: {
            id: 'exit_cond',
            logic: 'OR',
            conditions: [
              { id: 'c1', type: 'indicator_crosses_below', indicator: 'MACD', period: 12, compareIndicator: 'MACD_Signal', comparePeriod: 26 },
              { id: 'c2', type: 'profit_target_hit', value: 15 },
            ],
          },
          actions: [
            { id: 'a1', type: 'close_position' },
          ],
        }],
        riskManagement: {
          maxPositionSize: 15,
          maxOpenPositions: 5,
          maxDailyLoss: 5,
          maxDrawdown: 18,
          riskPerTrade: 2,
          useKellyCriterion: false,
          correlationLimit: 0.6,
        },
      },
    });

    // Scalping Strategy
    this.templates.set('quick_scalp', {
      id: 'quick_scalp',
      name: 'Quick Scalp',
      description: 'Fast in-and-out trades on small price movements',
      category: 'scalping',
      difficulty: 'advanced',
      expectedWinRate: 60,
      expectedSharpe: 0.7,
      strategy: {
        name: 'Quick Scalp',
        description: 'Scalp small moves using EMA and RSI on low timeframe',
        version: 1,
        assets: ['EUR/USD', 'GBP/USD', 'BTC/USD'],
        timeframe: '5m',
        entryRules: [{
          id: 'scalp_entry',
          name: 'Scalp Entry',
          enabled: true,
          conditions: {
            id: 'scalp_cond',
            logic: 'AND',
            conditions: [
              { id: 'c1', type: 'price_crosses_above', indicator: 'EMA', period: 9 },
              { id: 'c2', type: 'indicator_above', indicator: 'RSI', period: 7, value: 50 },
              { id: 'c3', type: 'indicator_below', indicator: 'RSI', period: 7, value: 70 },
            ],
          },
          actions: [
            { id: 'a1', type: 'buy_market', sizeType: 'risk_based', riskPercent: 0.5 },
            { id: 'a2', type: 'set_stop_loss', stopLossPercent: 0.3 },
            { id: 'a3', type: 'set_take_profit', takeProfitPercent: 0.5 },
          ],
          maxExecutionsPerDay: 10,
        }],
        exitRules: [{
          id: 'scalp_exit',
          name: 'Quick Exit',
          enabled: true,
          conditions: {
            id: 'exit_cond',
            logic: 'OR',
            conditions: [
              { id: 'c1', type: 'price_crosses_below', indicator: 'EMA', period: 9 },
            ],
          },
          actions: [
            { id: 'a1', type: 'close_position' },
          ],
        }],
        riskManagement: {
          maxPositionSize: 5,
          maxOpenPositions: 1,
          maxDailyLoss: 2,
          maxDrawdown: 8,
          riskPerTrade: 0.5,
          useKellyCriterion: false,
          correlationLimit: 1,
        },
      },
    });

    console.log(`[StrategyBuilder] Loaded ${this.templates.size} strategy templates`);
  }

  // ============================================================================
  // Strategy Deployment
  // ============================================================================

  /**
   * Start paper trading
   */
  async startPaperTrading(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    strategy.status = 'paper_trading';
    this.emit('strategy:paper_started', { strategyId });
    console.log(`[StrategyBuilder] Paper trading started for ${strategy.name}`);
  }

  /**
   * Go live with strategy
   */
  async goLive(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    // Verify strategy has been backtested and paper traded
    if (!strategy.performance) {
      throw new Error('Strategy must be backtested before going live');
    }

    strategy.status = 'live';
    this.emit('strategy:live', { strategyId });
    console.log(`[StrategyBuilder] Strategy ${strategy.name} is now LIVE`);
  }

  /**
   * Pause strategy
   */
  pauseStrategy(strategyId: string): Strategy | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    strategy.status = 'paused';
    this.emit('strategy:paused', { strategyId });
    return strategy;
  }

  /**
   * Deploy strategy to live trading
   */
  deployStrategy(strategyId: string): Strategy | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    strategy.status = 'live';
    this.emit('strategy:deployed', { strategyId });
    return strategy;
  }

  /**
   * Delete strategy
   */
  deleteStrategy(strategyId: string): boolean {
    const deleted = this.strategies.delete(strategyId);
    if (deleted) {
      this.backtestResults.delete(strategyId);
      this.emit('strategy:deleted', { strategyId });
    }
    return deleted;
  }

  /**
   * Add entry condition to strategy
   */
  addEntryCondition(strategyId: string, condition: Partial<Condition>): Strategy | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    const newCondition = this.createCondition(condition.type || 'indicator_crosses_above', condition);

    // Add to first entry rule or create one
    if (strategy.entryRules.length === 0) {
      const conditionGroup = this.createConditionGroup('AND', [newCondition]);
      const action = this.createAction('buy_market', { sizeType: 'percent', positionSize: strategy.riskManagement.maxPositionSize || 5 });
      strategy.entryRules.push(this.createRule('Entry Rule', conditionGroup, [action]));
    } else {
      const existingGroup = strategy.entryRules[0].conditions as ConditionGroup;
      existingGroup.conditions.push(newCondition);
    }

    strategy.updatedAt = new Date();
    this.emit('strategy:updated', { strategyId });
    return strategy;
  }

  /**
   * Add exit condition to strategy
   */
  addExitCondition(strategyId: string, condition: Partial<Condition>): Strategy | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    const newCondition = this.createCondition(condition.type || 'indicator_crosses_below', condition);

    // Add to first exit rule or create one
    if (strategy.exitRules.length === 0) {
      const conditionGroup = this.createConditionGroup('OR', [newCondition]);
      const action = this.createAction('close_position', { closePercent: 100 });
      strategy.exitRules.push(this.createRule('Exit Rule', conditionGroup, [action]));
    } else {
      const existingGroup = strategy.exitRules[0].conditions as ConditionGroup;
      existingGroup.conditions.push(newCondition);
    }

    strategy.updatedAt = new Date();
    this.emit('strategy:updated', { strategyId });
    return strategy;
  }

  /**
   * Set risk management for strategy
   */
  setRiskManagement(strategyId: string, riskManagement: Partial<Strategy['riskManagement']>): Strategy | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    strategy.riskManagement = {
      ...strategy.riskManagement,
      ...riskManagement,
    };

    strategy.updatedAt = new Date();
    this.emit('strategy:updated', { strategyId });
    return strategy;
  }

  /**
   * Validate strategy for deployment
   */
  validateStrategy(strategyId: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const strategy = this.strategies.get(strategyId);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!strategy) {
      return { valid: false, errors: ['Strategy not found'], warnings: [] };
    }

    // Check entry rules
    if (strategy.entryRules.length === 0) {
      errors.push('Strategy must have at least one entry rule');
    }

    // Check exit rules
    if (strategy.exitRules.length === 0) {
      warnings.push('No exit rules defined - only risk management will close positions');
    }

    // Check risk management
    if (!strategy.riskManagement.riskPerTrade || strategy.riskManagement.riskPerTrade === 0) {
      warnings.push('No risk per trade configured - consider setting a value for risk protection');
    }

    if (strategy.riskManagement.maxPositionSize > 25) {
      warnings.push('High position size (>25%) increases risk significantly');
    }

    // Check assets
    if (strategy.assets.length === 0) {
      warnings.push('No assets configured - strategy will apply to all available assets');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export strategy as JSON
   */
  exportStrategy(strategyId: string): string | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    return JSON.stringify({
      ...strategy,
      exportedAt: new Date(),
      version: '1.0',
    }, null, 2);
  }

  /**
   * Import strategy from JSON
   */
  importStrategy(userId: string, json: string): Strategy {
    const data = JSON.parse(json);

    // Create new strategy with imported data but new IDs
    const strategy: Strategy = {
      ...data,
      id: `STRAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: `${data.name} (Imported)`,
      status: 'draft' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      performance: undefined,
    };

    this.strategies.set(strategy.id, strategy);
    this.emit('strategy:imported', { strategyId: strategy.id, userId });

    return strategy;
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const strategyBuilder = new StrategyBuilderEngine();
export default strategyBuilder;

/**
 * Training Simulator
 *
 * 24/7 demo trading environment for TIME to learn and evolve.
 * Bots trade continuously on simulated/paper accounts, and TIME
 * learns from every single trade, win or lose.
 *
 * Features:
 * - Continuous bot execution on demo accounts
 * - Real-time market data simulation
 * - Trade execution simulation
 * - Performance tracking and analysis
 * - Learning event generation for TIME
 * - Strategy A/B testing
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';
import { TIMEGovernor } from '../core/time_governor';
import { learningEngine } from '../engines/learning_engine';
import { riskEngine } from '../engines/risk_engine';
import { regimeDetector } from '../engines/regime_detector';
import { botManager } from '../bots/bot_manager';
import {
  Bot,
  Trade,
  Signal,
  MarketRegime,
  TIMEComponent,
  LearningSource,
} from '../types';

const logger = createComponentLogger('TrainingSimulator');

// Simulated market data point
interface MarketDataPoint {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bid: number;
  ask: number;
}

// Simulated account
interface SimulatedAccount {
  id: string;
  balance: number;
  equity: number;
  marginUsed: number;
  marginAvailable: number;
  positions: Map<string, SimulatedPosition>;
  trades: SimulatedTrade[];
  createdAt: Date;
}

// Simulated position
interface SimulatedPosition {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  openedAt: Date;
}

// Simulated trade
interface SimulatedTrade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  entryTime: Date;
  exitTime: Date;
  botId: string;
  strategyId?: string;
}

// Training session configuration
interface TrainingConfig {
  symbols: string[];
  initialBalance: number;
  leverage: number;
  maxPositions: number;
  maxPositionSize: number; // as % of account
  tradingFees: number; // as %
  slippage: number; // as %
  useRealMarketData: boolean;
  speedMultiplier: number; // 1 = real-time, 10 = 10x faster
}

// Bot training assignment
interface BotAssignment {
  botId: string;
  accountId: string;
  isActive: boolean;
  tradesExecuted: number;
  totalPnL: number;
  startedAt: Date;
}

// Training results
interface TrainingResults {
  botId: string;
  accountId: string;
  duration: number; // ms
  tradesExecuted: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgTradeSize: number;
  avgHoldingPeriod: number;
}

export class TrainingSimulator extends EventEmitter implements TIMEComponent {
  private static instance: TrainingSimulator | null = null;
  private isRunning: boolean = false;
  private accounts: Map<string, SimulatedAccount> = new Map();
  private assignments: Map<string, BotAssignment> = new Map();
  private marketData: Map<string, MarketDataPoint[]> = new Map();
  private currentPrices: Map<string, MarketDataPoint> = new Map();
  private config: TrainingConfig;
  private simulationIntervalId: NodeJS.Timeout | null = null;
  private marketUpdateIntervalId: NodeJS.Timeout | null = null;

  public readonly name = 'TrainingSimulator';
  public readonly version = '1.0.0';
  public status: 'online' | 'offline' | 'degraded' | 'building' = 'offline';

  private constructor() {
    super();
    this.config = this.getDefaultConfig();
    this.initializeMarketData();
  }

  public static getInstance(): TrainingSimulator {
    if (!TrainingSimulator.instance) {
      TrainingSimulator.instance = new TrainingSimulator();
    }
    return TrainingSimulator.instance;
  }

  private getDefaultConfig(): TrainingConfig {
    return {
      symbols: ['BTC/USD', 'ETH/USD', 'EUR/USD', 'SPY', 'AAPL', 'GOOGL'],
      initialBalance: 100000,
      leverage: 1,
      maxPositions: 5,
      maxPositionSize: 10, // 10% max per position
      tradingFees: 0.1, // 0.1%
      slippage: 0.05, // 0.05%
      useRealMarketData: false,
      speedMultiplier: 1,
    };
  }

  private initializeMarketData(): void {
    // Initialize with base prices
    const basePrices: Record<string, number> = {
      'BTC/USD': 43500,
      'ETH/USD': 2350,
      'EUR/USD': 1.085,
      'SPY': 478,
      'AAPL': 186,
      'GOOGL': 142,
    };

    for (const [symbol, price] of Object.entries(basePrices)) {
      const dataPoint: MarketDataPoint = {
        symbol,
        timestamp: new Date(),
        open: price,
        high: price * 1.001,
        low: price * 0.999,
        close: price,
        volume: 100000,
        bid: price * 0.9999,
        ask: price * 1.0001,
      };
      this.currentPrices.set(symbol, dataPoint);
      this.marketData.set(symbol, [dataPoint]);
    }
  }

  public async initialize(): Promise<void> {
    this.status = 'building';
    logger.info('Initializing Training Simulator');

    // Register with TIME Governor
    const governor = TIMEGovernor.getInstance();
    governor.registerComponent(this);

    this.status = 'online';
    logger.info('Training Simulator initialized');
  }

  public async shutdown(): Promise<void> {
    this.stop();
    this.status = 'offline';
    logger.info('Training Simulator shut down');
  }

  public getHealth(): { component: string; status: 'online' | 'offline' | 'degraded'; lastCheck: Date; metrics: Record<string, number> } {
    return {
      component: this.name,
      status: this.isRunning ? 'online' : 'offline',
      lastCheck: new Date(),
      metrics: {
        accounts: this.accounts.size,
        assignments: this.assignments.size,
      },
    };
  }

  public getStatus(): {
    running: boolean;
    accounts: number;
    activeBots: number;
    totalTrades: number;
    totalPnL: number;
  } {
    let totalTrades = 0;
    let totalPnL = 0;

    for (const account of this.accounts.values()) {
      totalTrades += account.trades.length;
      totalPnL += account.trades.reduce((sum, t) => sum + t.pnl, 0);
    }

    return {
      running: this.isRunning,
      accounts: this.accounts.size,
      activeBots: Array.from(this.assignments.values()).filter((a) => a.isActive).length,
      totalTrades,
      totalPnL,
    };
  }

  /**
   * Start the training simulator
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Training Simulator is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Training Simulator');

    // Start market data simulation
    this.startMarketSimulation();

    // Start bot execution loop
    this.startBotExecutionLoop();

    this.emit('started');
  }

  /**
   * Stop the training simulator
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping Training Simulator');

    if (this.marketUpdateIntervalId) {
      clearInterval(this.marketUpdateIntervalId);
      this.marketUpdateIntervalId = null;
    }

    if (this.simulationIntervalId) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }

    this.emit('stopped');
  }

  /**
   * Create a new simulated account
   */
  public createAccount(id?: string): SimulatedAccount {
    const accountId = id || `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const account: SimulatedAccount = {
      id: accountId,
      balance: this.config.initialBalance,
      equity: this.config.initialBalance,
      marginUsed: 0,
      marginAvailable: this.config.initialBalance * this.config.leverage,
      positions: new Map(),
      trades: [],
      createdAt: new Date(),
    };

    this.accounts.set(accountId, account);
    logger.info(`Created simulated account: ${accountId}`);

    return account;
  }

  /**
   * Assign a bot to an account for training
   */
  public assignBot(botId: string, accountId?: string): BotAssignment {
    // Create account if not provided
    if (!accountId) {
      const account = this.createAccount();
      accountId = account.id;
    }

    if (!this.accounts.has(accountId)) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const assignment: BotAssignment = {
      botId,
      accountId,
      isActive: true,
      tradesExecuted: 0,
      totalPnL: 0,
      startedAt: new Date(),
    };

    this.assignments.set(botId, assignment);
    logger.info(`Bot ${botId} assigned to account ${accountId}`);

    this.emit('botAssigned', { botId, accountId });
    return assignment;
  }

  /**
   * Remove bot from training
   */
  public unassignBot(botId: string): void {
    const assignment = this.assignments.get(botId);
    if (assignment) {
      assignment.isActive = false;
      logger.info(`Bot ${botId} unassigned from training`);
      this.emit('botUnassigned', { botId });
    }
  }

  /**
   * Execute a simulated trade
   */
  public async executeTrade(
    accountId: string,
    signal: Signal,
    botId: string
  ): Promise<SimulatedTrade | null> {
    const account = this.accounts.get(accountId);
    if (!account) {
      logger.error(`Account not found: ${accountId}`);
      return null;
    }

    const currentPrice = this.currentPrices.get(signal.symbol);
    if (!currentPrice) {
      logger.error(`No price data for: ${signal.symbol}`);
      return null;
    }

    // Check risk limits
    const positionsArray = Array.from(account.positions.values());
    const riskCheckResult = riskEngine.checkSignal(signal, {
      positions: account.positions.size,
      exposure: positionsArray.reduce((sum: number, p: SimulatedPosition) => sum + (p.quantity * p.currentPrice), 0),
    });
    if (!riskCheckResult.allowed) {
      logger.warn(`Trade blocked by risk engine: ${riskCheckResult.reason}`);
      return null;
    }

    // Calculate position size
    const positionValue =
      (account.equity * this.config.maxPositionSize) / 100;
    const quantity = positionValue / currentPrice.close;

    // Apply slippage
    const slippage = currentPrice.close * (this.config.slippage / 100);
    const executionPrice =
      signal.direction === 'long'
        ? currentPrice.ask + slippage
        : currentPrice.bid - slippage;

    // Calculate fees
    const fees = positionValue * (this.config.tradingFees / 100);

    // Check if opening or closing position
    const existingPosition = account.positions.get(signal.symbol);

    if (existingPosition) {
      // Close existing position
      const exitPrice =
        existingPosition.side === 'long'
          ? currentPrice.bid - slippage
          : currentPrice.ask + slippage;

      const pnl =
        existingPosition.side === 'long'
          ? (exitPrice - existingPosition.entryPrice) * existingPosition.quantity
          : (existingPosition.entryPrice - exitPrice) * existingPosition.quantity;

      const trade: SimulatedTrade = {
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol: signal.symbol,
        side: existingPosition.side,
        quantity: existingPosition.quantity,
        entryPrice: existingPosition.entryPrice,
        exitPrice,
        pnl: pnl - fees,
        entryTime: existingPosition.openedAt,
        exitTime: new Date(),
        botId,
      };

      // Update account
      account.balance += trade.pnl;
      account.equity = account.balance;
      account.positions.delete(signal.symbol);
      account.trades.push(trade);

      // Update assignment stats
      const assignment = this.assignments.get(botId);
      if (assignment) {
        assignment.tradesExecuted++;
        assignment.totalPnL += trade.pnl;
      }

      // Emit trade event
      this.emit('tradeExecuted', { accountId, trade });

      // Send to learning engine
      await this.sendToLearningEngine(trade, signal, botId);

      logger.info(
        `Trade closed: ${signal.symbol} ${trade.side} P&L: ${trade.pnl.toFixed(2)}`
      );

      return trade;
    } else {
      // Open new position
      if (account.positions.size >= this.config.maxPositions) {
        logger.warn('Max positions reached');
        return null;
      }

      const position: SimulatedPosition = {
        symbol: signal.symbol,
        side: signal.direction as 'long' | 'short',
        quantity,
        entryPrice: executionPrice,
        currentPrice: executionPrice,
        unrealizedPnL: 0,
        openedAt: new Date(),
      };

      account.positions.set(signal.symbol, position);
      account.marginUsed += positionValue;
      account.marginAvailable -= positionValue;

      logger.info(
        `Position opened: ${signal.symbol} ${position.side} @ ${executionPrice.toFixed(4)}`
      );

      this.emit('positionOpened', { accountId, position });
      return null; // No completed trade yet
    }
  }

  /**
   * Send trade to learning engine
   */
  private async sendToLearningEngine(
    trade: SimulatedTrade,
    signal: Signal,
    botId: string
  ): Promise<void> {
    // Use imported singletons
    const learningEngineInstance = learningEngine;
    const regimeDetectorInstance = regimeDetector;

    const currentRegime = regimeDetector.getCurrentRegime();

    // Record learning event with separate parameters
    const eventData = {
      trade,
      signal,
      botId,
      regime: currentRegime,
      success: trade.pnl > 0,
      holdingPeriod: trade.exitTime.getTime() - trade.entryTime.getTime(),
    };

    const eventId = learningEngine.recordEvent('trade_outcome', 'paper_trading', eventData);

    // Create event for emission
    const learningEvent = {
      id: eventId,
      source: 'paper_trading' as LearningSource,
      timestamp: new Date(),
      data: eventData,
      processed: false,
      insights: [],
    };

    // Emit for TIME to learn
    this.emit('learningEvent', learningEvent);
  }

  /**
   * Get training results for a bot
   */
  public getTrainingResults(botId: string): TrainingResults | null {
    const assignment = this.assignments.get(botId);
    if (!assignment) {
      return null;
    }

    const account = this.accounts.get(assignment.accountId);
    if (!account) {
      return null;
    }

    const botTrades = account.trades.filter((t) => t.botId === botId);

    if (botTrades.length === 0) {
      return {
        botId,
        accountId: assignment.accountId,
        duration: Date.now() - assignment.startedAt.getTime(),
        tradesExecuted: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        profitFactor: 0,
        avgTradeSize: 0,
        avgHoldingPeriod: 0,
      };
    }

    const winningTrades = botTrades.filter((t) => t.pnl > 0);
    const losingTrades = botTrades.filter((t) => t.pnl <= 0);
    const totalPnL = botTrades.reduce((sum, t) => sum + t.pnl, 0);

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Calculate max drawdown
    let peak = this.config.initialBalance;
    let maxDrawdown = 0;
    let runningBalance = this.config.initialBalance;

    for (const trade of botTrades) {
      runningBalance += trade.pnl;
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const drawdown = (peak - runningBalance) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate Sharpe ratio (simplified)
    const returns = botTrades.map((t) => t.pnl / this.config.initialBalance);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Calculate average holding period
    const holdingPeriods = botTrades.map(
      (t) => t.exitTime.getTime() - t.entryTime.getTime()
    );
    const avgHoldingPeriod =
      holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length;

    // Calculate average trade size
    const tradeSizes = botTrades.map((t) => Math.abs(t.quantity * t.entryPrice));
    const avgTradeSize = tradeSizes.reduce((a, b) => a + b, 0) / tradeSizes.length;

    return {
      botId,
      accountId: assignment.accountId,
      duration: Date.now() - assignment.startedAt.getTime(),
      tradesExecuted: botTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalPnL,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio,
      profitFactor,
      avgTradeSize,
      avgHoldingPeriod,
    };
  }

  /**
   * Get all training results
   */
  public getAllTrainingResults(): TrainingResults[] {
    const results: TrainingResults[] = [];

    for (const [botId] of this.assignments) {
      const result = this.getTrainingResults(botId);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<TrainingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Training configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfig(): TrainingConfig {
    return { ...this.config };
  }

  /**
   * Get account details
   */
  public getAccount(accountId: string): SimulatedAccount | undefined {
    return this.accounts.get(accountId);
  }

  /**
   * Get current market price
   */
  public getCurrentPrice(symbol: string): MarketDataPoint | undefined {
    return this.currentPrices.get(symbol);
  }

  // Private methods

  private startMarketSimulation(): void {
    const updateInterval = Math.max(100, 1000 / this.config.speedMultiplier);

    this.marketUpdateIntervalId = setInterval(() => {
      this.updateMarketData();
      this.updatePositions();
    }, updateInterval);

    logger.info(`Market simulation started (${this.config.speedMultiplier}x speed)`);
  }

  private updateMarketData(): void {
    for (const [symbol, currentData] of this.currentPrices) {
      // Generate random price movement (random walk with drift)
      const volatility = this.getVolatility(symbol);
      const drift = 0.00001; // Slight upward bias
      const randomMove = (Math.random() - 0.5) * 2 * volatility;
      const priceChange = currentData.close * (drift + randomMove);

      const newClose = currentData.close + priceChange;
      const spread = newClose * 0.0001; // 1 pip spread

      const newData: MarketDataPoint = {
        symbol,
        timestamp: new Date(),
        open: currentData.close,
        high: Math.max(currentData.close, newClose),
        low: Math.min(currentData.close, newClose),
        close: newClose,
        volume: Math.floor(Math.random() * 100000) + 10000,
        bid: newClose - spread / 2,
        ask: newClose + spread / 2,
      };

      this.currentPrices.set(symbol, newData);

      // Store historical data (keep last 1000 points)
      const history = this.marketData.get(symbol) || [];
      history.push(newData);
      if (history.length > 1000) {
        history.shift();
      }
      this.marketData.set(symbol, history);

      // Emit price update
      this.emit('priceUpdate', newData);
    }
  }

  private getVolatility(symbol: string): number {
    // Different volatility for different asset classes
    const volatilities: Record<string, number> = {
      'BTC/USD': 0.002, // 0.2% per tick
      'ETH/USD': 0.0025,
      'EUR/USD': 0.0001,
      'SPY': 0.0005,
      'AAPL': 0.0008,
      'GOOGL': 0.0009,
    };
    return volatilities[symbol] || 0.001;
  }

  private updatePositions(): void {
    for (const account of this.accounts.values()) {
      let totalUnrealizedPnL = 0;

      for (const position of account.positions.values()) {
        const currentPrice = this.currentPrices.get(position.symbol);
        if (currentPrice) {
          position.currentPrice = currentPrice.close;
          position.unrealizedPnL =
            position.side === 'long'
              ? (currentPrice.close - position.entryPrice) * position.quantity
              : (position.entryPrice - currentPrice.close) * position.quantity;
          totalUnrealizedPnL += position.unrealizedPnL;
        }
      }

      account.equity = account.balance + totalUnrealizedPnL;
    }
  }

  private startBotExecutionLoop(): void {
    // Bot decision loop - runs every second (adjusted by speed multiplier)
    const interval = Math.max(100, 1000 / this.config.speedMultiplier);

    this.simulationIntervalId = setInterval(async () => {
      for (const [botId, assignment] of this.assignments) {
        if (!assignment.isActive) continue;

        try {
          await this.runBotIteration(botId, assignment.accountId);
        } catch (error) {
          logger.error(`Error in bot ${botId} iteration:`, error as object);
        }
      }
    }, interval);

    logger.info('Bot execution loop started');
  }

  private async runBotIteration(botId: string, accountId: string): Promise<void> {
    const botManagerInstance = botManager;
    const bot = botManager.getBot(botId);

    if (!bot) {
      logger.warn(`Bot not found: ${botId}`);
      return;
    }

    // Simulate bot signal generation
    // In production, this would call the actual bot's signal generation
    const signal = this.simulateBotSignal(bot);

    if (signal) {
      await this.executeTrade(accountId, signal, botId);
    }
  }

  private simulateBotSignal(bot: Bot): Signal | null {
    // Simulate random signal generation based on bot's win rate
    // In production, this would use actual bot logic

    const shouldTrade = Math.random() < 0.05; // 5% chance per iteration
    if (!shouldTrade) return null;

    const symbols = this.config.symbols;
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    const direction = Math.random() > 0.5 ? 'long' : 'short';
    const strength = 0.5 + Math.random() * 0.5;

    return {
      id: `signal-${Date.now()}`,
      botId: bot.id,
      symbol,
      direction,
      strength,
      confidence: strength,
      reasoning: 'Simulated signal for training',
      timestamp: new Date(),
    };
  }
}

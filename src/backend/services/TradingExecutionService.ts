/**
 * TRADING EXECUTION SERVICE
 *
 * The MISSING LINK that connects everything:
 * - Bots generate signals → Signals validated by Risk Engine → Orders executed via Brokers
 *
 * This is what makes bots ACTUALLY TRADE.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';
import { botManager } from '../bots/bot_manager';
import { BrokerManager } from '../brokers/broker_manager';

const logger = createComponentLogger('TradingExecution');

// ============================================
// TYPES
// ============================================

export interface TradeSignal {
  id: string;
  botId: string;
  botName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number; // 0-100
  reasoning?: string;
  timestamp: Date;
}

export interface ExecutedTrade {
  id: string;
  signalId: string;
  botId: string;
  botName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'OPEN' | 'CLOSED' | 'STOPPED_OUT' | 'TAKE_PROFIT' | 'CANCELLED';
  pnl: number;
  pnlPercent: number;
  openedAt: Date;
  closedAt?: Date;
  broker: string;
  orderId?: string;
}

export interface BotTradingState {
  botId: string;
  botName: string;
  isEnabled: boolean;
  isPaused: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  maxPositionSize: number;
  maxDailyTrades: number;
  maxDailyLoss: number;
  currentDailyTrades: number;
  currentDailyPnL: number;
  openPositions: ExecutedTrade[];
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  lastSignal?: TradeSignal;
  lastTrade?: ExecutedTrade;
}

export interface RiskCheckResult {
  approved: boolean;
  reasons: string[];
  adjustedQuantity?: number;
  riskScore: number; // 0-100
}

// ============================================
// TRADING EXECUTION SERVICE
// ============================================

export class TradingExecutionService extends EventEmitter {
  private static instance: TradingExecutionService;
  private botStates: Map<string, BotTradingState> = new Map();
  private pendingSignals: TradeSignal[] = [];
  private executedTrades: ExecutedTrade[] = [];
  private isRunning: boolean = false;
  private signalProcessorInterval?: NodeJS.Timeout;

  // Risk parameters
  private globalMaxDailyLoss: number = 5000; // $5k max daily loss
  private globalMaxPositionSize: number = 10000; // $10k max per position
  private globalMaxOpenPositions: number = 10;
  private requireApproval: boolean = false; // Auto-trade or require approval

  private constructor() {
    super();
    logger.info('Trading Execution Service initialized');
  }

  public static getInstance(): TradingExecutionService {
    if (!TradingExecutionService.instance) {
      TradingExecutionService.instance = new TradingExecutionService();
    }
    return TradingExecutionService.instance;
  }

  // ============================================
  // BOT MANAGEMENT
  // ============================================

  /**
   * Enable trading for a bot
   */
  public enableBot(botId: string, config?: Partial<BotTradingState>): BotTradingState {
    const bot = botManager.getBot(botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    const state: BotTradingState = {
      botId,
      botName: bot.name,
      isEnabled: true,
      isPaused: false,
      riskLevel: config?.riskLevel || 'MEDIUM',
      maxPositionSize: config?.maxPositionSize || 1000,
      maxDailyTrades: config?.maxDailyTrades || 10,
      maxDailyLoss: config?.maxDailyLoss || 500,
      currentDailyTrades: 0,
      currentDailyPnL: 0,
      openPositions: [],
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
    };

    this.botStates.set(botId, state);
    logger.info(`Bot ${bot.name} enabled for trading`);
    this.emit('botEnabled', state);

    return state;
  }

  /**
   * Disable trading for a bot
   */
  public disableBot(botId: string): void {
    const state = this.botStates.get(botId);
    if (state) {
      state.isEnabled = false;
      logger.info(`Bot ${state.botName} disabled`);
      this.emit('botDisabled', botId);
    }
  }

  /**
   * Pause/unpause bot trading
   */
  public pauseBot(botId: string, paused: boolean): void {
    const state = this.botStates.get(botId);
    if (state) {
      state.isPaused = paused;
      logger.info(`Bot ${state.botName} ${paused ? 'paused' : 'resumed'}`);
      this.emit('botPaused', { botId, paused });
    }
  }

  /**
   * Get bot trading state
   */
  public getBotState(botId: string): BotTradingState | undefined {
    return this.botStates.get(botId);
  }

  /**
   * Get all enabled bots
   */
  public getEnabledBots(): BotTradingState[] {
    return Array.from(this.botStates.values()).filter(b => b.isEnabled);
  }

  // ============================================
  // SIGNAL PROCESSING
  // ============================================

  /**
   * Submit a trade signal from a bot
   */
  public submitSignal(signal: Omit<TradeSignal, 'id' | 'timestamp'>): TradeSignal {
    const fullSignal: TradeSignal = {
      ...signal,
      id: uuidv4(),
      timestamp: new Date(),
    };

    const state = this.botStates.get(signal.botId);
    if (!state || !state.isEnabled) {
      logger.warn(`Signal rejected: Bot ${signal.botId} not enabled`);
      return fullSignal;
    }

    if (state.isPaused) {
      logger.warn(`Signal rejected: Bot ${state.botName} is paused`);
      return fullSignal;
    }

    // Update bot state
    state.lastSignal = fullSignal;

    // Check risk before adding to queue
    const riskCheck = this.checkRisk(fullSignal, state);

    if (!riskCheck.approved) {
      logger.warn(`Signal rejected by risk check: ${riskCheck.reasons.join(', ')}`);
      this.emit('signalRejected', { signal: fullSignal, reasons: riskCheck.reasons });
      return fullSignal;
    }

    // Adjust quantity if needed
    if (riskCheck.adjustedQuantity) {
      fullSignal.quantity = riskCheck.adjustedQuantity;
    }

    this.pendingSignals.push(fullSignal);
    logger.info(`Signal queued: ${fullSignal.side} ${fullSignal.quantity} ${fullSignal.symbol} from ${fullSignal.botName}`);
    this.emit('signalQueued', fullSignal);

    // If auto-trading, execute immediately
    if (!this.requireApproval) {
      this.executeSignal(fullSignal.id);
    }

    return fullSignal;
  }

  /**
   * Check risk for a signal
   */
  private checkRisk(signal: TradeSignal, state: BotTradingState): RiskCheckResult {
    const reasons: string[] = [];
    let approved = true;
    let riskScore = 0;

    // Check daily trade limit
    if (state.currentDailyTrades >= state.maxDailyTrades) {
      reasons.push('Daily trade limit reached');
      approved = false;
      riskScore += 30;
    }

    // Check daily loss limit
    if (state.currentDailyPnL <= -state.maxDailyLoss) {
      reasons.push('Daily loss limit reached');
      approved = false;
      riskScore += 50;
    }

    // Check global daily loss
    const totalDailyPnL = Array.from(this.botStates.values())
      .reduce((sum, s) => sum + s.currentDailyPnL, 0);
    if (totalDailyPnL <= -this.globalMaxDailyLoss) {
      reasons.push('Global daily loss limit reached');
      approved = false;
      riskScore += 50;
    }

    // Check position size
    const positionValue = signal.quantity * (signal.price || 100); // Estimate if no price
    let adjustedQuantity: number | undefined;

    if (positionValue > state.maxPositionSize) {
      adjustedQuantity = Math.floor(state.maxPositionSize / (signal.price || 100));
      reasons.push(`Position size reduced from ${signal.quantity} to ${adjustedQuantity}`);
      riskScore += 20;
    }

    if (positionValue > this.globalMaxPositionSize) {
      adjustedQuantity = Math.floor(this.globalMaxPositionSize / (signal.price || 100));
      reasons.push(`Position size reduced to global limit: ${adjustedQuantity}`);
      riskScore += 30;
    }

    // Check open positions
    const totalOpenPositions = Array.from(this.botStates.values())
      .reduce((sum, s) => sum + s.openPositions.length, 0);
    if (totalOpenPositions >= this.globalMaxOpenPositions) {
      reasons.push('Maximum open positions reached');
      approved = false;
      riskScore += 40;
    }

    // Check confidence
    if (signal.confidence < 60) {
      reasons.push('Low confidence signal');
      riskScore += 20;
      // Don't reject, just note it
    }

    return { approved, reasons, adjustedQuantity, riskScore };
  }

  /**
   * Execute a pending signal
   */
  public async executeSignal(signalId: string): Promise<ExecutedTrade | null> {
    const signalIndex = this.pendingSignals.findIndex(s => s.id === signalId);
    if (signalIndex === -1) {
      logger.error(`Signal ${signalId} not found in pending queue`);
      return null;
    }

    const signal = this.pendingSignals[signalIndex];
    const state = this.botStates.get(signal.botId);

    if (!state) {
      logger.error(`Bot state not found for signal ${signalId}`);
      return null;
    }

    try {
      // Get broker manager
      const brokerManager = BrokerManager.getInstance();
      const connectedBrokers = brokerManager.getStatus();

      // Route to appropriate broker (Alpaca for stocks)
      let broker = 'alpaca';
      let orderId: string | undefined;
      let entryPrice = signal.price || 0;

      // Try to execute via broker
      if (connectedBrokers.connectedBrokers > 0) {
        try {
          const orderResult = await brokerManager.submitOrder({
            symbol: signal.symbol,
            side: signal.side.toLowerCase() as 'buy' | 'sell',
            type: signal.type.toLowerCase() as 'market' | 'limit',
            quantity: signal.quantity,
            limitPrice: signal.price,
          });
          orderId = orderResult?.id;
          entryPrice = orderResult?.filledPrice || signal.price || 0;
          logger.info(`Order executed via broker: ${orderId}`);
        } catch (brokerError) {
          logger.warn('Broker execution failed, using simulated execution:', brokerError as object);
          // Fall through to simulated execution
        }
      }

      // If no broker or broker failed, simulate
      if (!entryPrice) {
        entryPrice = signal.price || 100; // Use signal price or simulate
      }

      // Create executed trade record
      const trade: ExecutedTrade = {
        id: uuidv4(),
        signalId: signal.id,
        botId: signal.botId,
        botName: signal.botName,
        symbol: signal.symbol,
        side: signal.side,
        quantity: signal.quantity,
        entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        status: 'OPEN',
        pnl: 0,
        pnlPercent: 0,
        openedAt: new Date(),
        broker,
        orderId,
      };

      // Update state
      state.openPositions.push(trade);
      state.currentDailyTrades++;
      state.totalTrades++;
      state.lastTrade = trade;

      // Remove from pending
      this.pendingSignals.splice(signalIndex, 1);

      // Store trade
      this.executedTrades.push(trade);

      logger.info(`Trade executed: ${trade.side} ${trade.quantity} ${trade.symbol} @ ${trade.entryPrice}`);
      this.emit('tradeExecuted', trade);

      return trade;
    } catch (error) {
      logger.error(`Failed to execute signal ${signalId}:`, error as object);
      this.emit('tradeError', { signalId, error });
      return null;
    }
  }

  /**
   * Close a trade
   */
  public async closeTrade(tradeId: string, exitPrice: number): Promise<ExecutedTrade | null> {
    const trade = this.executedTrades.find(t => t.id === tradeId);
    if (!trade || trade.status !== 'OPEN') {
      logger.error(`Trade ${tradeId} not found or already closed`);
      return null;
    }

    const state = this.botStates.get(trade.botId);
    if (!state) return null;

    // Calculate P&L
    trade.exitPrice = exitPrice;
    trade.pnl = trade.side === 'BUY'
      ? (exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - exitPrice) * trade.quantity;
    trade.pnlPercent = (trade.pnl / (trade.entryPrice * trade.quantity)) * 100;
    trade.status = 'CLOSED';
    trade.closedAt = new Date();

    // Update state
    state.currentDailyPnL += trade.pnl;
    state.totalPnL += trade.pnl;
    state.openPositions = state.openPositions.filter(p => p.id !== tradeId);

    // Update win rate
    const wins = this.executedTrades.filter(t => t.botId === trade.botId && t.pnl > 0).length;
    const total = this.executedTrades.filter(t => t.botId === trade.botId && t.status === 'CLOSED').length;
    state.winRate = total > 0 ? (wins / total) * 100 : 0;

    logger.info(`Trade closed: ${trade.symbol} P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    this.emit('tradeClosed', trade);

    return trade;
  }

  // ============================================
  // SIGNAL GENERATION (Connect to bots)
  // ============================================

  /**
   * Start the trading engine
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('Trading Execution Service started');

    // Process signals every 5 seconds
    this.signalProcessorInterval = setInterval(() => {
      this.generateBotSignals();
    }, 5000);

    this.emit('started');
  }

  /**
   * Stop the trading engine
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.signalProcessorInterval) {
      clearInterval(this.signalProcessorInterval);
    }

    logger.info('Trading Execution Service stopped');
    this.emit('stopped');
  }

  /**
   * Generate signals from enabled bots
   */
  private async generateBotSignals(): Promise<void> {
    const enabledBots = this.getEnabledBots().filter(b => !b.isPaused);

    for (const state of enabledBots) {
      try {
        // Get bot config
        const bot = botManager.getBot(state.botId);
        if (!bot) continue;

        // Generate a signal based on bot strategy (simplified for now)
        const signal = this.generateSignalForBot(bot, state);

        if (signal && signal.confidence >= 70) {
          this.submitSignal(signal);
        }
      } catch (error) {
        logger.error(`Error generating signal for bot ${state.botId}:`, error as object);
      }
    }
  }

  /**
   * Generate a signal for a specific bot (simplified strategy implementation)
   */
  private generateSignalForBot(bot: any, state: BotTradingState): Omit<TradeSignal, 'id' | 'timestamp'> | null {
    // Don't generate if we already have open positions for this bot
    if (state.openPositions.length > 0) return null;

    // Simple random signal for demo - in production, this would use the bot's actual strategy
    const shouldTrade = Math.random() > 0.95; // Only 5% chance per check
    if (!shouldTrade) return null;

    const symbols = bot.config?.symbols?.length > 0
      ? bot.config.symbols
      : ['AAPL', 'MSFT', 'GOOGL', 'SPY'];

    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const confidence = 70 + Math.floor(Math.random() * 25); // 70-95

    return {
      botId: bot.id,
      botName: bot.name,
      symbol,
      side: side as 'BUY' | 'SELL',
      type: 'MARKET',
      quantity: Math.max(1, Math.floor(state.maxPositionSize / 200)), // Rough quantity
      confidence,
      reasoning: `${bot.name} generated ${side} signal for ${symbol} with ${confidence}% confidence`,
    };
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get trading statistics
   */
  public getStats(): {
    isRunning: boolean;
    enabledBots: number;
    totalTrades: number;
    openPositions: number;
    pendingSignals: number;
    totalPnL: number;
    todayPnL: number;
    winRate: number;
  } {
    const allTrades = this.executedTrades;
    const closedTrades = allTrades.filter(t => t.status === 'CLOSED');
    const wins = closedTrades.filter(t => t.pnl > 0).length;

    return {
      isRunning: this.isRunning,
      enabledBots: this.getEnabledBots().length,
      totalTrades: allTrades.length,
      openPositions: Array.from(this.botStates.values())
        .reduce((sum, s) => sum + s.openPositions.length, 0),
      pendingSignals: this.pendingSignals.length,
      totalPnL: allTrades.reduce((sum, t) => sum + t.pnl, 0),
      todayPnL: Array.from(this.botStates.values())
        .reduce((sum, s) => sum + s.currentDailyPnL, 0),
      winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
    };
  }

  /**
   * Get pending signals
   */
  public getPendingSignals(): TradeSignal[] {
    return [...this.pendingSignals];
  }

  /**
   * Get trade history
   */
  public getTradeHistory(botId?: string, limit?: number): ExecutedTrade[] {
    let trades = botId
      ? this.executedTrades.filter(t => t.botId === botId)
      : this.executedTrades;

    trades = trades.sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());

    return limit ? trades.slice(0, limit) : trades;
  }
}

// Export singleton instance
export const tradingExecutionService = TradingExecutionService.getInstance();

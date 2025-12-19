/**
 * SUPER BOT LIVE TRADING ENGINE
 * Version 1.0.0 | December 19, 2025
 *
 * Connects the 25 Super Bots to REAL brokers for live trading.
 * Uses Alpaca, Binance, Kraken, OANDA for actual trade execution.
 */

import { EventEmitter } from 'events';
import { BrokerManager } from '../brokers/broker_manager';
import { getAbsorbedSuperBots, TradeSignal, SuperBot } from './AbsorbedSuperBots';
import { OrderRequest, AssetClass, Order } from '../brokers/broker_interface';

// Live trading state
export interface LiveTradingState {
  isEnabled: boolean;
  mode: 'paper' | 'live';
  activeBots: Set<string>;
  maxPositionSize: number; // Max % of portfolio per trade
  maxDailyTrades: number;
  maxDrawdown: number; // Max % drawdown before auto-stop
  dailyTradeCount: number;
  currentDrawdown: number;
  startingEquity: number;
  currentEquity: number;
}

// Trade record
export interface ExecutedTrade {
  id: string;
  botId: string;
  botName: string;
  signal: TradeSignal;
  order: Order;
  brokerId: string;
  executedAt: Date;
  status: 'pending' | 'filled' | 'cancelled' | 'failed';
  fillPrice?: number;
  fillQuantity?: number;
  commission?: number;
  realizedPnL?: number;
}

// Bot trading stats
export interface BotTradingStats {
  botId: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  lastTradeAt?: Date;
}

/**
 * SuperBotLiveTradingEngine
 *
 * Connects Super Bots to real brokers and executes trades.
 * This is REAL trading with REAL money!
 */
export class SuperBotLiveTradingEngine extends EventEmitter {
  private state: LiveTradingState;
  private executedTrades: Map<string, ExecutedTrade> = new Map();
  private botStats: Map<string, BotTradingStats> = new Map();
  private signalQueue: TradeSignal[] = [];
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.state = {
      isEnabled: false,
      mode: 'paper', // Default to paper trading
      activeBots: new Set(),
      maxPositionSize: 0.05, // 5% max per trade
      maxDailyTrades: 50,
      maxDrawdown: 0.10, // 10% max drawdown
      dailyTradeCount: 0,
      currentDrawdown: 0,
      startingEquity: 0,
      currentEquity: 0,
    };

    // Initialize bot stats
    const superBots = getAbsorbedSuperBots();
    for (const bot of superBots.getAllBots()) {
      this.botStats.set(bot.id, {
        botId: bot.id,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        largestWin: 0,
        largestLoss: 0,
      });
    }

    // Listen for signals from Super Bots
    superBots.on('signal_generated', (signal: TradeSignal) => {
      if (this.state.activeBots.has(signal.botId)) {
        this.queueSignal(signal);
      }
    });
  }

  /**
   * Enable live trading
   */
  async enable(mode: 'paper' | 'live' = 'paper'): Promise<void> {
    console.log(`[SuperBotLiveTrading] Enabling ${mode} trading mode`);

    // Get initial equity from broker
    const brokerManager = BrokerManager.getInstance();
    try {
      const portfolio = await brokerManager.getAggregatedPortfolio();
      this.state.startingEquity = portfolio.totalEquity;
      this.state.currentEquity = portfolio.totalEquity;
    } catch (error) {
      console.warn('[SuperBotLiveTrading] Could not get initial equity:', error);
      this.state.startingEquity = 10000; // Demo value
      this.state.currentEquity = 10000;
    }

    this.state.isEnabled = true;
    this.state.mode = mode;
    this.state.dailyTradeCount = 0;
    this.state.currentDrawdown = 0;

    // Start signal processing
    this.startSignalProcessing();

    this.emit('enabled', { mode, equity: this.state.startingEquity });
    console.log(`[SuperBotLiveTrading] Enabled with $${this.state.startingEquity.toFixed(2)} equity`);
  }

  /**
   * Disable live trading
   */
  async disable(): Promise<void> {
    console.log('[SuperBotLiveTrading] Disabling live trading');
    this.state.isEnabled = false;
    this.stopSignalProcessing();
    this.emit('disabled');
  }

  /**
   * Activate a bot for live trading
   */
  activateBot(botId: string): boolean {
    const superBots = getAbsorbedSuperBots();
    const bot = superBots.getBot(botId);

    if (!bot) {
      console.error(`[SuperBotLiveTrading] Bot not found: ${botId}`);
      return false;
    }

    this.state.activeBots.add(botId);
    console.log(`[SuperBotLiveTrading] Activated bot: ${bot.name} (${bot.codename})`);
    this.emit('botActivated', { botId, botName: bot.name });
    return true;
  }

  /**
   * Deactivate a bot from live trading
   */
  deactivateBot(botId: string): boolean {
    if (!this.state.activeBots.has(botId)) {
      return false;
    }

    this.state.activeBots.delete(botId);
    console.log(`[SuperBotLiveTrading] Deactivated bot: ${botId}`);
    this.emit('botDeactivated', { botId });
    return true;
  }

  /**
   * Queue a signal for processing
   */
  private queueSignal(signal: TradeSignal): void {
    if (signal.action === 'HOLD') {
      return; // Don't queue HOLD signals
    }

    // Check daily trade limit
    if (this.state.dailyTradeCount >= this.state.maxDailyTrades) {
      console.warn('[SuperBotLiveTrading] Daily trade limit reached');
      return;
    }

    // Check drawdown limit
    if (this.state.currentDrawdown >= this.state.maxDrawdown) {
      console.warn('[SuperBotLiveTrading] Max drawdown reached, pausing trading');
      return;
    }

    // Check confidence threshold (minimum 70%)
    if (signal.confidence < 70) {
      console.log(`[SuperBotLiveTrading] Signal rejected: confidence ${signal.confidence.toFixed(1)}% < 70%`);
      return;
    }

    this.signalQueue.push(signal);
    console.log(`[SuperBotLiveTrading] Signal queued: ${signal.action} ${signal.symbol} (confidence: ${signal.confidence.toFixed(1)}%)`);
  }

  /**
   * Start processing signals
   */
  private startSignalProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process signals every second
    this.processingInterval = setInterval(() => {
      this.processSignalQueue();
    }, 1000);
  }

  /**
   * Stop processing signals
   */
  private stopSignalProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  /**
   * Process queued signals
   */
  private async processSignalQueue(): Promise<void> {
    if (!this.state.isEnabled || this.signalQueue.length === 0) {
      return;
    }

    const signal = this.signalQueue.shift();
    if (!signal) return;

    try {
      await this.executeSignal(signal);
    } catch (error) {
      console.error('[SuperBotLiveTrading] Failed to execute signal:', error);
      this.emit('signalError', { signal, error });
    }
  }

  /**
   * Execute a trade signal
   */
  async executeSignal(signal: TradeSignal): Promise<ExecutedTrade | null> {
    const superBots = getAbsorbedSuperBots();
    const bot = superBots.getBot(signal.botId);
    if (!bot) return null;

    console.log(`[SuperBotLiveTrading] Executing signal from ${bot.name}: ${signal.action} ${signal.symbol}`);

    // Calculate position size
    const positionValue = this.state.currentEquity * this.state.maxPositionSize;
    const price = signal.entryPrice || 100; // Use signal price or default
    const quantity = Math.floor(positionValue / price);

    if (quantity < 1) {
      console.warn('[SuperBotLiveTrading] Position size too small');
      return null;
    }

    // Determine asset class from symbol
    const assetClass = this.getAssetClass(signal.symbol);

    // Create order request
    const orderRequest: OrderRequest = {
      symbol: signal.symbol,
      side: signal.action === 'BUY' ? 'buy' : 'sell',
      type: 'market',
      quantity: quantity,
      timeInForce: 'day',
    };

    // Add stop loss if provided
    if (signal.stopLoss) {
      orderRequest.stopLoss = signal.stopLoss;
    }

    // Add take profit if provided
    if (signal.targetPrice) {
      orderRequest.takeProfit = signal.targetPrice;
    }

    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const brokerManager = BrokerManager.getInstance();

      // Execute the trade
      const result = await brokerManager.submitOrder(orderRequest, assetClass);

      const executedTrade: ExecutedTrade = {
        id: tradeId,
        botId: signal.botId,
        botName: bot.name,
        signal,
        order: result.order,
        brokerId: result.brokerId,
        executedAt: new Date(),
        status: result.order.status === 'filled' ? 'filled' : 'pending',
        fillPrice: result.order.averageFilledPrice,
        fillQuantity: result.order.filledQuantity,
        commission: result.order.commission || 0,
      };

      this.executedTrades.set(tradeId, executedTrade);
      this.state.dailyTradeCount++;

      // Update bot stats
      this.updateBotStats(signal.botId, executedTrade);

      this.emit('tradeExecuted', executedTrade);
      console.log(`[SuperBotLiveTrading] Trade executed: ${result.order.id} via ${result.brokerId}`);

      return executedTrade;
    } catch (error) {
      console.error('[SuperBotLiveTrading] Trade execution failed:', error);

      const failedTrade: ExecutedTrade = {
        id: tradeId,
        botId: signal.botId,
        botName: bot.name,
        signal,
        order: { id: 'FAILED', symbol: signal.symbol, status: 'cancelled' } as Order,
        brokerId: 'none',
        executedAt: new Date(),
        status: 'failed',
      };

      this.executedTrades.set(tradeId, failedTrade);
      this.emit('tradeFailed', { trade: failedTrade, error });

      return null;
    }
  }

  /**
   * Generate a trading signal from a specific bot
   */
  async generateAndExecuteSignal(botId: string, symbol: string): Promise<ExecutedTrade | null> {
    const superBots = getAbsorbedSuperBots();
    const signal = superBots.generateSignal(botId, symbol);

    if (!signal || signal.action === 'HOLD') {
      return null;
    }

    return this.executeSignal(signal);
  }

  /**
   * Update bot trading stats
   */
  private updateBotStats(botId: string, trade: ExecutedTrade): void {
    const stats = this.botStats.get(botId);
    if (!stats) return;

    stats.totalTrades++;
    stats.lastTradeAt = trade.executedAt;

    // Update PnL when trade closes
    if (trade.realizedPnL !== undefined) {
      stats.totalPnL += trade.realizedPnL;

      if (trade.realizedPnL > 0) {
        stats.winningTrades++;
        if (trade.realizedPnL > stats.largestWin) {
          stats.largestWin = trade.realizedPnL;
        }
      } else if (trade.realizedPnL < 0) {
        stats.losingTrades++;
        if (trade.realizedPnL < stats.largestLoss) {
          stats.largestLoss = trade.realizedPnL;
        }
      }

      // Calculate derived stats
      stats.winRate = stats.winningTrades / stats.totalTrades * 100;
      stats.avgWin = stats.winningTrades > 0
        ? stats.totalPnL / stats.winningTrades
        : 0;
      stats.avgLoss = stats.losingTrades > 0
        ? Math.abs(stats.totalPnL / stats.losingTrades)
        : 0;
      stats.profitFactor = stats.avgLoss > 0
        ? stats.avgWin / stats.avgLoss
        : 0;
    }

    this.botStats.set(botId, stats);
  }

  /**
   * Determine asset class from symbol
   */
  private getAssetClass(symbol: string): AssetClass {
    const upperSymbol = symbol.toUpperCase();

    // Crypto pairs
    if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH') ||
        upperSymbol.includes('USDT') || upperSymbol.includes('USD') &&
        (upperSymbol.includes('SOL') || upperSymbol.includes('ADA') || upperSymbol.includes('DOT'))) {
      return 'crypto';
    }

    // Forex pairs
    if ((upperSymbol.includes('EUR') || upperSymbol.includes('GBP') ||
         upperSymbol.includes('JPY') || upperSymbol.includes('CHF')) &&
        upperSymbol.length === 6) {
      return 'forex';
    }

    // Options (ends with date/strike)
    if (upperSymbol.match(/\d{6}[CP]\d+/)) {
      return 'options';
    }

    // Default to stock
    return 'stock';
  }

  // ============== GETTERS ==============

  getState(): LiveTradingState {
    return { ...this.state };
  }

  getActiveBots(): string[] {
    return Array.from(this.state.activeBots);
  }

  getActiveBotDetails(): SuperBot[] {
    const superBots = getAbsorbedSuperBots();
    return Array.from(this.state.activeBots)
      .map(id => superBots.getBot(id))
      .filter((bot): bot is SuperBot => bot !== undefined);
  }

  getExecutedTrades(): ExecutedTrade[] {
    return Array.from(this.executedTrades.values())
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }

  getBotStats(botId: string): BotTradingStats | undefined {
    return this.botStats.get(botId);
  }

  getAllBotStats(): BotTradingStats[] {
    return Array.from(this.botStats.values());
  }

  getSignalQueue(): TradeSignal[] {
    return [...this.signalQueue];
  }

  // ============== CONFIGURATION ==============

  setMaxPositionSize(percent: number): void {
    this.state.maxPositionSize = Math.min(0.25, Math.max(0.01, percent));
  }

  setMaxDailyTrades(count: number): void {
    this.state.maxDailyTrades = Math.max(1, count);
  }

  setMaxDrawdown(percent: number): void {
    this.state.maxDrawdown = Math.min(0.5, Math.max(0.05, percent));
  }

  /**
   * Update equity and check drawdown
   */
  updateEquity(currentEquity: number): void {
    this.state.currentEquity = currentEquity;

    const drawdown = (this.state.startingEquity - currentEquity) / this.state.startingEquity;
    this.state.currentDrawdown = drawdown;

    if (drawdown >= this.state.maxDrawdown) {
      console.warn(`[SuperBotLiveTrading] Max drawdown reached: ${(drawdown * 100).toFixed(2)}%`);
      this.emit('maxDrawdownReached', { drawdown, threshold: this.state.maxDrawdown });
    }
  }

  /**
   * Reset daily counters (call at market open)
   */
  resetDailyCounters(): void {
    this.state.dailyTradeCount = 0;
    console.log('[SuperBotLiveTrading] Daily counters reset');
  }
}

// Singleton instance
let instance: SuperBotLiveTradingEngine | null = null;

export function getSuperBotLiveTrading(): SuperBotLiveTradingEngine {
  if (!instance) {
    instance = new SuperBotLiveTradingEngine();
  }
  return instance;
}

export default SuperBotLiveTradingEngine;

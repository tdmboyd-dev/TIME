/**
 * TIME - Trade Logger Module
 *
 * Comprehensive trade logging system with:
 * - Detailed execution logs
 * - Order flow analysis
 * - Slippage tracking
 * - Commission breakdown
 * - Position lifecycle tracking
 * - Export to CSV/JSON
 */

import { Trade } from '../strategies/backtesting_engine';

// ==========================================
// TYPES
// ==========================================

export interface ExecutionLog {
  timestamp: Date;
  eventType: 'order_placed' | 'order_filled' | 'order_cancelled' | 'order_modified' |
             'position_opened' | 'position_closed' | 'position_scaled' |
             'stop_triggered' | 'take_profit_triggered' | 'margin_call';
  orderId: string;
  tradeId?: string;
  symbol: string;
  direction: 'long' | 'short';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  requestedPrice?: number;
  executedPrice?: number;
  requestedQuantity: number;
  executedQuantity?: number;
  slippage?: number;
  commission?: number;
  marketConditions?: MarketConditions;
  notes?: string;
}

export interface MarketConditions {
  bid: number;
  ask: number;
  spread: number;
  spreadPercent: number;
  volume: number;
  volatility: number;
  liquidity: 'high' | 'medium' | 'low';
}

export interface DetailedTrade extends Trade {
  // Order execution details
  entryOrderId: string;
  exitOrderId: string;
  entryOrderType: 'market' | 'limit' | 'stop';
  exitOrderType: 'market' | 'limit' | 'stop';
  entryRequestedPrice: number;
  exitRequestedPrice: number;

  // Slippage analysis
  entrySlippage: number;
  exitSlippage: number;
  totalSlippage: number;
  slippagePercent: number;

  // Commission breakdown
  entryCommission: number;
  exitCommission: number;
  totalCommission: number;

  // Position lifecycle
  scaledIn: boolean;
  scaledOut: boolean;
  scalingHistory: ScalingEvent[];

  // Market conditions at entry/exit
  entryMarketConditions: MarketConditions;
  exitMarketConditions: MarketConditions;

  // Performance attribution
  grossPnl: number;
  netPnl: number;
  slippageCost: number;
  commissionCost: number;
  financingCost: number;

  // Timing analysis
  entryDayOfWeek: number;
  entryHour: number;
  exitDayOfWeek: number;
  exitHour: number;
  holdingPeriodDays: number;

  // Signal information
  entrySignal: string;
  entrySignalStrength: number;
  exitSignal: string;
  exitSignalStrength: number;

  // Risk metrics at trade time
  entryAccountBalance: number;
  exitAccountBalance: number;
  positionSizePercent: number;
  maxAdverseExcursion: number; // MAE
  maxFavorableExcursion: number; // MFE
  efficiencyRatio: number; // Actual profit / MFE

  // Tags and notes
  tags: string[];
  notes: string;
}

export interface ScalingEvent {
  timestamp: Date;
  action: 'scale_in' | 'scale_out' | 'partial_close';
  quantity: number;
  price: number;
  slippage: number;
  commission: number;
  reason: string;
}

export interface TradeLogSummary {
  totalTrades: number;
  profitableTrades: number;
  unprofitableTrades: number;
  breakEvenTrades: number;

  totalGrossPnl: number;
  totalNetPnl: number;
  totalSlippageCost: number;
  totalCommissionCost: number;
  totalFinancingCost: number;

  avgSlippagePercent: number;
  avgCommissionPercent: number;
  avgHoldingPeriod: number;

  avgMAE: number;
  avgMFE: number;
  avgEfficiencyRatio: number;

  tradesByDay: Record<string, number>;
  tradesByHour: Record<number, number>;
  tradesByExitReason: Record<string, number>;

  topPerformers: DetailedTrade[];
  worstPerformers: DetailedTrade[];
}

export interface TradeLogExport {
  format: 'csv' | 'json' | 'excel';
  filename: string;
  content: string;
  trades: DetailedTrade[];
  summary: TradeLogSummary;
  executionLogs: ExecutionLog[];
}

// ==========================================
// TRADE LOGGER
// ==========================================

export class TradeLogger {
  private trades: DetailedTrade[] = [];
  private executionLogs: ExecutionLog[] = [];
  private orderCounter: number = 0;
  private tradeCounter: number = 0;

  /**
   * Log order placement
   */
  public logOrderPlaced(
    symbol: string,
    direction: 'long' | 'short',
    orderType: 'market' | 'limit' | 'stop' | 'stop_limit',
    quantity: number,
    price?: number,
    marketConditions?: MarketConditions
  ): string {
    const orderId = this.generateOrderId();

    this.executionLogs.push({
      timestamp: new Date(),
      eventType: 'order_placed',
      orderId,
      symbol,
      direction,
      orderType,
      requestedPrice: price,
      requestedQuantity: quantity,
      marketConditions,
    });

    return orderId;
  }

  /**
   * Log order fill
   */
  public logOrderFilled(
    orderId: string,
    executedPrice: number,
    executedQuantity: number,
    slippage: number,
    commission: number
  ): void {
    const order = this.executionLogs.find(l => l.orderId === orderId && l.eventType === 'order_placed');

    if (order) {
      this.executionLogs.push({
        timestamp: new Date(),
        eventType: 'order_filled',
        orderId,
        symbol: order.symbol,
        direction: order.direction,
        orderType: order.orderType,
        requestedPrice: order.requestedPrice,
        executedPrice,
        requestedQuantity: order.requestedQuantity,
        executedQuantity,
        slippage,
        commission,
        marketConditions: order.marketConditions,
      });
    }
  }

  /**
   * Log position opened
   */
  public logPositionOpened(
    orderId: string,
    trade: Partial<DetailedTrade>
  ): string {
    const tradeId = this.generateTradeId();

    this.executionLogs.push({
      timestamp: new Date(),
      eventType: 'position_opened',
      orderId,
      tradeId,
      symbol: trade.symbol || '',
      direction: trade.direction || 'long',
      orderType: 'market',
      executedPrice: trade.entryPrice,
      executedQuantity: trade.quantity,
    });

    return tradeId;
  }

  /**
   * Log complete trade
   */
  public logTrade(trade: DetailedTrade): void {
    this.trades.push(trade);

    // Log position closed
    this.executionLogs.push({
      timestamp: trade.exitDate,
      eventType: 'position_closed',
      orderId: trade.exitOrderId,
      tradeId: trade.id,
      symbol: trade.symbol || '',
      direction: trade.direction,
      orderType: trade.exitOrderType,
      executedPrice: trade.exitPrice,
      executedQuantity: trade.quantity,
      slippage: trade.exitSlippage,
      commission: trade.exitCommission,
      notes: trade.exitReason,
    });
  }

  /**
   * Log scaling event
   */
  public logScaling(
    tradeId: string,
    event: ScalingEvent
  ): void {
    const trade = this.trades.find(t => t.id === tradeId);
    if (trade) {
      trade.scalingHistory.push(event);
      if (event.action === 'scale_in') trade.scaledIn = true;
      if (event.action === 'scale_out') trade.scaledOut = true;
    }

    this.executionLogs.push({
      timestamp: event.timestamp,
      eventType: 'position_scaled',
      orderId: this.generateOrderId(),
      tradeId,
      symbol: trade?.symbol || '',
      direction: trade?.direction || 'long',
      orderType: 'market',
      executedPrice: event.price,
      executedQuantity: event.quantity,
      slippage: event.slippage,
      commission: event.commission,
      notes: event.reason,
    });
  }

  /**
   * Get all trades
   */
  public getTrades(): DetailedTrade[] {
    return [...this.trades];
  }

  /**
   * Get execution logs
   */
  public getExecutionLogs(): ExecutionLog[] {
    return [...this.executionLogs];
  }

  /**
   * Get trade summary
   */
  public getSummary(): TradeLogSummary {
    const profitableTrades = this.trades.filter(t => t.netPnl > 0);
    const unprofitableTrades = this.trades.filter(t => t.netPnl < 0);
    const breakEvenTrades = this.trades.filter(t => t.netPnl === 0);

    const totalGrossPnl = this.trades.reduce((sum, t) => sum + t.grossPnl, 0);
    const totalNetPnl = this.trades.reduce((sum, t) => sum + t.netPnl, 0);
    const totalSlippageCost = this.trades.reduce((sum, t) => sum + t.slippageCost, 0);
    const totalCommissionCost = this.trades.reduce((sum, t) => sum + t.commissionCost, 0);
    const totalFinancingCost = this.trades.reduce((sum, t) => sum + t.financingCost, 0);

    const avgSlippagePercent = this.trades.length > 0
      ? this.trades.reduce((sum, t) => sum + t.slippagePercent, 0) / this.trades.length
      : 0;
    const avgCommissionPercent = this.trades.length > 0
      ? this.trades.reduce((sum, t) => sum + (t.commissionCost / (t.entryPrice * t.quantity) * 100), 0) / this.trades.length
      : 0;
    const avgHoldingPeriod = this.trades.length > 0
      ? this.trades.reduce((sum, t) => sum + t.holdingPeriodDays, 0) / this.trades.length
      : 0;

    const avgMAE = this.trades.length > 0
      ? this.trades.reduce((sum, t) => sum + t.maxAdverseExcursion, 0) / this.trades.length
      : 0;
    const avgMFE = this.trades.length > 0
      ? this.trades.reduce((sum, t) => sum + t.maxFavorableExcursion, 0) / this.trades.length
      : 0;
    const avgEfficiencyRatio = this.trades.length > 0
      ? this.trades.reduce((sum, t) => sum + t.efficiencyRatio, 0) / this.trades.length
      : 0;

    // Group by day
    const tradesByDay: Record<string, number> = {
      Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0,
    };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const trade of this.trades) {
      const day = dayNames[trade.entryDayOfWeek];
      tradesByDay[day]++;
    }

    // Group by hour
    const tradesByHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) tradesByHour[h] = 0;
    for (const trade of this.trades) {
      tradesByHour[trade.entryHour]++;
    }

    // Group by exit reason
    const tradesByExitReason: Record<string, number> = {};
    for (const trade of this.trades) {
      tradesByExitReason[trade.exitReason] = (tradesByExitReason[trade.exitReason] || 0) + 1;
    }

    // Top/worst performers
    const sortedByPnl = [...this.trades].sort((a, b) => b.netPnl - a.netPnl);
    const topPerformers = sortedByPnl.slice(0, 5);
    const worstPerformers = sortedByPnl.slice(-5).reverse();

    return {
      totalTrades: this.trades.length,
      profitableTrades: profitableTrades.length,
      unprofitableTrades: unprofitableTrades.length,
      breakEvenTrades: breakEvenTrades.length,
      totalGrossPnl,
      totalNetPnl,
      totalSlippageCost,
      totalCommissionCost,
      totalFinancingCost,
      avgSlippagePercent,
      avgCommissionPercent,
      avgHoldingPeriod,
      avgMAE,
      avgMFE,
      avgEfficiencyRatio,
      tradesByDay,
      tradesByHour,
      tradesByExitReason,
      topPerformers,
      worstPerformers,
    };
  }

  /**
   * Export to CSV
   */
  public exportToCSV(): string {
    const headers = [
      'Trade ID', 'Symbol', 'Direction', 'Entry Date', 'Exit Date',
      'Entry Price', 'Exit Price', 'Quantity', 'Gross PnL', 'Net PnL',
      'Slippage Cost', 'Commission Cost', 'Entry Slippage', 'Exit Slippage',
      'Holding Period (Days)', 'Exit Reason', 'Entry Signal', 'Exit Signal',
      'MAE', 'MFE', 'Efficiency Ratio', 'Position Size %', 'Tags', 'Notes',
    ].join(',');

    const rows = this.trades.map(t => [
      t.id,
      t.symbol || '',
      t.direction,
      t.entryDate.toISOString(),
      t.exitDate.toISOString(),
      t.entryPrice.toFixed(4),
      t.exitPrice.toFixed(4),
      t.quantity.toFixed(4),
      t.grossPnl.toFixed(2),
      t.netPnl.toFixed(2),
      t.slippageCost.toFixed(2),
      t.commissionCost.toFixed(2),
      t.entrySlippage.toFixed(4),
      t.exitSlippage.toFixed(4),
      t.holdingPeriodDays.toFixed(2),
      t.exitReason,
      t.entrySignal,
      t.exitSignal,
      t.maxAdverseExcursion.toFixed(2),
      t.maxFavorableExcursion.toFixed(2),
      t.efficiencyRatio.toFixed(4),
      t.positionSizePercent.toFixed(2),
      `"${t.tags.join(', ')}"`,
      `"${t.notes.replace(/"/g, '""')}"`,
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  /**
   * Export to JSON
   */
  public exportToJSON(): string {
    return JSON.stringify({
      trades: this.trades,
      executionLogs: this.executionLogs,
      summary: this.getSummary(),
      exportDate: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Export execution logs to CSV
   */
  public exportExecutionLogsToCSV(): string {
    const headers = [
      'Timestamp', 'Event Type', 'Order ID', 'Trade ID', 'Symbol', 'Direction',
      'Order Type', 'Requested Price', 'Executed Price', 'Requested Qty', 'Executed Qty',
      'Slippage', 'Commission', 'Bid', 'Ask', 'Spread', 'Volume', 'Liquidity', 'Notes',
    ].join(',');

    const rows = this.executionLogs.map(log => [
      log.timestamp.toISOString(),
      log.eventType,
      log.orderId,
      log.tradeId || '',
      log.symbol,
      log.direction,
      log.orderType,
      log.requestedPrice?.toFixed(4) || '',
      log.executedPrice?.toFixed(4) || '',
      log.requestedQuantity.toFixed(4),
      log.executedQuantity?.toFixed(4) || '',
      log.slippage?.toFixed(4) || '',
      log.commission?.toFixed(2) || '',
      log.marketConditions?.bid.toFixed(4) || '',
      log.marketConditions?.ask.toFixed(4) || '',
      log.marketConditions?.spread.toFixed(4) || '',
      log.marketConditions?.volume || '',
      log.marketConditions?.liquidity || '',
      `"${(log.notes || '').replace(/"/g, '""')}"`,
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  /**
   * Get trade by ID
   */
  public getTradeById(id: string): DetailedTrade | undefined {
    return this.trades.find(t => t.id === id);
  }

  /**
   * Filter trades
   */
  public filterTrades(criteria: {
    startDate?: Date;
    endDate?: Date;
    symbol?: string;
    direction?: 'long' | 'short';
    minPnl?: number;
    maxPnl?: number;
    exitReason?: string;
    tags?: string[];
  }): DetailedTrade[] {
    return this.trades.filter(t => {
      if (criteria.startDate && t.entryDate < criteria.startDate) return false;
      if (criteria.endDate && t.exitDate > criteria.endDate) return false;
      if (criteria.symbol && t.symbol !== criteria.symbol) return false;
      if (criteria.direction && t.direction !== criteria.direction) return false;
      if (criteria.minPnl !== undefined && t.netPnl < criteria.minPnl) return false;
      if (criteria.maxPnl !== undefined && t.netPnl > criteria.maxPnl) return false;
      if (criteria.exitReason && t.exitReason !== criteria.exitReason) return false;
      if (criteria.tags && !criteria.tags.some(tag => t.tags.includes(tag))) return false;
      return true;
    });
  }

  /**
   * Clear all logs
   */
  public clear(): void {
    this.trades = [];
    this.executionLogs = [];
    this.orderCounter = 0;
    this.tradeCounter = 0;
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${++this.orderCounter}`;
  }

  private generateTradeId(): string {
    return `TRD-${Date.now()}-${++this.tradeCounter}`;
  }
}

// ==========================================
// TRADE ANALYZER
// ==========================================

export class TradeAnalyzer {
  /**
   * Calculate MAE/MFE for a trade given price history
   */
  public static calculateMAEMFE(
    trade: Trade,
    candles: { timestamp: Date; low: number; high: number; close: number }[]
  ): { mae: number; mfe: number; efficiencyRatio: number } {
    const entryTime = trade.entryDate.getTime();
    const exitTime = trade.exitDate.getTime();

    // Filter candles during trade
    const tradePeriodCandles = candles.filter(c => {
      const t = c.timestamp.getTime();
      return t >= entryTime && t <= exitTime;
    });

    if (tradePeriodCandles.length === 0) {
      return { mae: 0, mfe: 0, efficiencyRatio: 0 };
    }

    let maxAdverse = 0;
    let maxFavorable = 0;

    for (const candle of tradePeriodCandles) {
      if (trade.direction === 'long') {
        // For long: adverse = entry - low, favorable = high - entry
        const adverse = trade.entryPrice - candle.low;
        const favorable = candle.high - trade.entryPrice;

        if (adverse > maxAdverse) maxAdverse = adverse;
        if (favorable > maxFavorable) maxFavorable = favorable;
      } else {
        // For short: adverse = high - entry, favorable = entry - low
        const adverse = candle.high - trade.entryPrice;
        const favorable = trade.entryPrice - candle.low;

        if (adverse > maxAdverse) maxAdverse = adverse;
        if (favorable > maxFavorable) maxFavorable = favorable;
      }
    }

    // Convert to percentages
    const maePercent = (maxAdverse / trade.entryPrice) * 100;
    const mfePercent = (maxFavorable / trade.entryPrice) * 100;

    // Efficiency ratio = actual profit / MFE
    const actualProfitPercent = trade.pnlPercent;
    const efficiencyRatio = mfePercent > 0 ? actualProfitPercent / mfePercent : 0;

    return {
      mae: maePercent,
      mfe: mfePercent,
      efficiencyRatio: Math.max(0, Math.min(1, efficiencyRatio)),
    };
  }

  /**
   * Analyze trade clustering
   */
  public static analyzeTradeCluster(trades: DetailedTrade[]): {
    consecutiveWins: number;
    consecutiveLosses: number;
    streakBreakdown: { type: 'win' | 'loss'; length: number; totalPnl: number }[];
  } {
    let currentStreak: 'win' | 'loss' | null = null;
    let streakLength = 0;
    let streakPnl = 0;
    const streakBreakdown: { type: 'win' | 'loss'; length: number; totalPnl: number }[] = [];
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    for (const trade of trades) {
      const isWin = trade.netPnl > 0;
      const type = isWin ? 'win' : 'loss';

      if (type === currentStreak) {
        streakLength++;
        streakPnl += trade.netPnl;
      } else {
        if (currentStreak !== null) {
          streakBreakdown.push({
            type: currentStreak,
            length: streakLength,
            totalPnl: streakPnl,
          });

          if (currentStreak === 'win' && streakLength > maxWinStreak) {
            maxWinStreak = streakLength;
          }
          if (currentStreak === 'loss' && streakLength > maxLossStreak) {
            maxLossStreak = streakLength;
          }
        }

        currentStreak = type;
        streakLength = 1;
        streakPnl = trade.netPnl;
      }
    }

    // Add final streak
    if (currentStreak !== null) {
      streakBreakdown.push({
        type: currentStreak,
        length: streakLength,
        totalPnl: streakPnl,
      });

      if (currentStreak === 'win' && streakLength > maxWinStreak) {
        maxWinStreak = streakLength;
      }
      if (currentStreak === 'loss' && streakLength > maxLossStreak) {
        maxLossStreak = streakLength;
      }
    }

    return {
      consecutiveWins: maxWinStreak,
      consecutiveLosses: maxLossStreak,
      streakBreakdown,
    };
  }

  /**
   * Calculate trade dependency (are wins followed by wins?)
   */
  public static analyzeSequenceDependency(trades: DetailedTrade[]): {
    winAfterWin: number;
    lossAfterWin: number;
    winAfterLoss: number;
    lossAfterLoss: number;
    dependencyScore: number; // Positive = streak tendency, negative = mean reversion
  } {
    let winAfterWin = 0;
    let lossAfterWin = 0;
    let winAfterLoss = 0;
    let lossAfterLoss = 0;

    for (let i = 1; i < trades.length; i++) {
      const prevWin = trades[i - 1].netPnl > 0;
      const currentWin = trades[i].netPnl > 0;

      if (prevWin && currentWin) winAfterWin++;
      if (prevWin && !currentWin) lossAfterWin++;
      if (!prevWin && currentWin) winAfterLoss++;
      if (!prevWin && !currentWin) lossAfterLoss++;
    }

    // Dependency score: positive if streaky, negative if mean-reverting
    const streakPairs = winAfterWin + lossAfterLoss;
    const reversalPairs = winAfterLoss + lossAfterWin;
    const total = streakPairs + reversalPairs;

    const dependencyScore = total > 0 ? (streakPairs - reversalPairs) / total : 0;

    return {
      winAfterWin,
      lossAfterWin,
      winAfterLoss,
      lossAfterLoss,
      dependencyScore,
    };
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const tradeLogger = new TradeLogger();

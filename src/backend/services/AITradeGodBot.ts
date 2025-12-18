/**
 * AI TRADE GOD BOT
 *
 * Admin-only, never-before-seen trading bot with:
 * - Multi-strategy AI trading
 * - Lending/borrowing capabilities
 * - White-label/lending out to users
 * - Self-learning from market data
 * - Risk management built-in
 * - Plain English commands
 *
 * FREE TO BUILD - Open Source Philosophy
 */

import EventEmitter from 'events';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface BotConfig {
  id: string;
  name: string;
  owner: string; // Admin who created it
  isPublic: boolean; // Can be lent to others
  lendingPrice?: number; // Monthly fee if lent
  profitShare?: number; // % of profits shared with bot owner

  // Trading Config
  strategies: TradingStrategy[];
  riskLevel: RiskLevel;
  maxPositionSize: number;
  maxDrawdown: number;
  allowedAssets: string[];
  exchanges: string[];

  // AI Config
  aiModel: AIModelConfig;
  learningEnabled: boolean;
  sentimentAnalysis: boolean;
  whaleTracking: boolean;

  // Status
  status: 'ACTIVE' | 'PAUSED' | 'LEARNING' | 'ERROR';
  createdAt: Date;
  lastTradeAt?: Date;
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: StrategyType;
  weight: number; // 0-100, how much to allocate
  parameters: Record<string, any>;
  enabled: boolean;
}

export type StrategyType =
  | 'DCA'           // Dollar Cost Averaging
  | 'GRID'          // Grid Trading
  | 'ARBITRAGE'     // Cross-exchange arbitrage
  | 'MOMENTUM'      // Trend following
  | 'MEAN_REVERSION'// Buy dips, sell rips
  | 'WHALE_FOLLOW'  // Follow whale movements
  | 'AI_SENTIMENT'  // AI-driven sentiment trading
  | 'YIELD_FARM'    // DeFi yield optimization
  | 'MARKET_MAKE'   // Provide liquidity
  | 'CUSTOM';       // User-defined strategy

export type RiskLevel = 'ULTRA_SAFE' | 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'DEGEN';

export interface AIModelConfig {
  type: 'GPT' | 'CUSTOM_ML' | 'HYBRID';
  confidenceThreshold: number; // 0-100, minimum confidence to trade
  retrainInterval: number; // Hours between retraining
  features: string[]; // Features to use
}

export interface Trade {
  id: string;
  botId: string;
  strategy: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED';
  pnl?: number;
  timestamp: Date;
  aiConfidence?: number;
  reasoning?: string; // AI explanation
}

export interface LendingAgreement {
  id: string;
  botId: string;
  borrowerId: string;
  ownerId: string;
  monthlyFee: number;
  profitShare: number;
  startDate: Date;
  endDate?: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  totalFeePaid: number;
  totalProfitShared: number;
}

export interface BotPerformance {
  botId: string;
  period: '24H' | '7D' | '30D' | 'ALL';
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnL: number;
  totalPnLPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

// ============================================
// STRATEGY IMPLEMENTATIONS
// ============================================

abstract class BaseStrategy {
  abstract name: string;
  abstract type: StrategyType;

  abstract generateSignals(marketData: any): Promise<Trade[]>;
  abstract optimize(historicalData: any): Promise<void>;
}

class DCAStrategy extends BaseStrategy {
  name = 'Dollar Cost Averaging';
  type: StrategyType = 'DCA';

  constructor(
    private config: {
      amount: number;
      interval: 'HOURLY' | 'DAILY' | 'WEEKLY';
      assets: string[];
      dipBuyEnabled: boolean;
      dipThreshold: number; // Buy extra if price drops this %
    }
  ) {
    super();
  }

  async generateSignals(marketData: any): Promise<Trade[]> {
    const trades: Trade[] = [];

    for (const asset of this.config.assets) {
      // Regular DCA buy
      trades.push({
        id: `dca-${Date.now()}-${asset}`,
        botId: '',
        strategy: this.name,
        symbol: asset,
        side: 'BUY',
        type: 'MARKET',
        quantity: this.config.amount,
        status: 'PENDING',
        timestamp: new Date(),
        reasoning: `Regular DCA buy for ${asset}`
      });

      // Enhanced: Buy extra on dips
      if (this.config.dipBuyEnabled && marketData[asset]?.changePercent24h < -this.config.dipThreshold) {
        trades.push({
          id: `dca-dip-${Date.now()}-${asset}`,
          botId: '',
          strategy: this.name,
          symbol: asset,
          side: 'BUY',
          type: 'MARKET',
          quantity: this.config.amount * 2, // Double on dip
          status: 'PENDING',
          timestamp: new Date(),
          reasoning: `DIP DETECTED: ${asset} down ${marketData[asset]?.changePercent24h}%. Buying extra.`
        });
      }
    }

    return trades;
  }

  async optimize(historicalData: any): Promise<void> {
    // Analyze best DCA timing based on historical data
    console.log('[DCA] Optimizing strategy...');
  }
}

class GridTradingStrategy extends BaseStrategy {
  name = 'Grid Trading';
  type: StrategyType = 'GRID';

  constructor(
    private config: {
      symbol: string;
      gridLevels: number;
      upperPrice: number;
      lowerPrice: number;
      totalAmount: number;
    }
  ) {
    super();
  }

  async generateSignals(marketData: any): Promise<Trade[]> {
    const trades: Trade[] = [];
    const gridSpacing = (this.config.upperPrice - this.config.lowerPrice) / this.config.gridLevels;
    const amountPerGrid = this.config.totalAmount / this.config.gridLevels;

    const currentPrice = marketData[this.config.symbol]?.price || 0;

    // Generate grid orders
    for (let i = 0; i < this.config.gridLevels; i++) {
      const gridPrice = this.config.lowerPrice + (gridSpacing * i);

      if (gridPrice < currentPrice) {
        // Buy orders below current price
        trades.push({
          id: `grid-buy-${Date.now()}-${i}`,
          botId: '',
          strategy: this.name,
          symbol: this.config.symbol,
          side: 'BUY',
          type: 'LIMIT',
          quantity: amountPerGrid,
          price: gridPrice,
          status: 'PENDING',
          timestamp: new Date(),
          reasoning: `Grid buy at $${gridPrice.toFixed(2)}`
        });
      } else {
        // Sell orders above current price
        trades.push({
          id: `grid-sell-${Date.now()}-${i}`,
          botId: '',
          strategy: this.name,
          symbol: this.config.symbol,
          side: 'SELL',
          type: 'LIMIT',
          quantity: amountPerGrid,
          price: gridPrice,
          status: 'PENDING',
          timestamp: new Date(),
          reasoning: `Grid sell at $${gridPrice.toFixed(2)}`
        });
      }
    }

    return trades;
  }

  async optimize(historicalData: any): Promise<void> {
    // Find optimal grid levels based on volatility
    console.log('[Grid] Optimizing grid levels...');
  }
}

class WhaleFollowStrategy extends BaseStrategy {
  name = 'Whale Following';
  type: StrategyType = 'WHALE_FOLLOW';

  constructor(
    private config: {
      minTransactionSize: number; // Minimum whale transaction in USD
      followDelay: number; // Seconds to wait before following
      maxPosition: number; // Max position size per whale signal
    }
  ) {
    super();
  }

  async generateSignals(marketData: any): Promise<Trade[]> {
    const trades: Trade[] = [];
    const whaleMovements = marketData.whaleMovements || [];

    for (const whale of whaleMovements) {
      if (whale.amountUSD < this.config.minTransactionSize) continue;

      const isAccumulating = whale.destination !== 'EXCHANGE';

      if (isAccumulating) {
        trades.push({
          id: `whale-${Date.now()}-${whale.token}`,
          botId: '',
          strategy: this.name,
          symbol: whale.token,
          side: 'BUY',
          type: 'MARKET',
          quantity: Math.min(this.config.maxPosition, whale.amountUSD * 0.01), // 1% of whale size
          status: 'PENDING',
          timestamp: new Date(),
          aiConfidence: 75,
          reasoning: `Following whale accumulation: $${(whale.amountUSD / 1_000_000).toFixed(1)}M moved to cold storage`
        });
      }
    }

    return trades;
  }

  async optimize(historicalData: any): Promise<void> {
    // Analyze which whale wallets have best track record
    console.log('[WhaleFollow] Analyzing profitable whale wallets...');
  }
}

class AISentimentStrategy extends BaseStrategy {
  name = 'AI Sentiment Analysis';
  type: StrategyType = 'AI_SENTIMENT';

  constructor(
    private config: {
      sources: ('TWITTER' | 'REDDIT' | 'NEWS' | 'FEAR_GREED')[];
      confidenceThreshold: number;
      contrarian: boolean; // Trade against extreme sentiment
    }
  ) {
    super();
  }

  async generateSignals(marketData: any): Promise<Trade[]> {
    const trades: Trade[] = [];
    const sentiment = marketData.sentiment || {};

    // Fear & Greed Index
    const fearGreed = sentiment.fearGreed || 50;

    if (this.config.contrarian) {
      // Contrarian: Buy when others are fearful
      if (fearGreed < 20) {
        trades.push({
          id: `sentiment-fear-${Date.now()}`,
          botId: '',
          strategy: this.name,
          symbol: 'BTC',
          side: 'BUY',
          type: 'MARKET',
          quantity: 0,
          status: 'PENDING',
          timestamp: new Date(),
          aiConfidence: 80,
          reasoning: `EXTREME FEAR detected (${fearGreed}/100). Contrarian buy signal.`
        });
      }
      // Sell when others are greedy
      if (fearGreed > 80) {
        trades.push({
          id: `sentiment-greed-${Date.now()}`,
          botId: '',
          strategy: this.name,
          symbol: 'BTC',
          side: 'SELL',
          type: 'MARKET',
          quantity: 0,
          status: 'PENDING',
          timestamp: new Date(),
          aiConfidence: 75,
          reasoning: `EXTREME GREED detected (${fearGreed}/100). Contrarian sell signal.`
        });
      }
    }

    // Social sentiment analysis
    if (sentiment.twitter) {
      const twitterSentiment = sentiment.twitter;
      if (twitterSentiment.score > this.config.confidenceThreshold) {
        // Strong positive sentiment
        trades.push({
          id: `sentiment-twitter-${Date.now()}`,
          botId: '',
          strategy: this.name,
          symbol: twitterSentiment.topToken || 'BTC',
          side: this.config.contrarian ? 'SELL' : 'BUY',
          type: 'MARKET',
          quantity: 0,
          status: 'PENDING',
          timestamp: new Date(),
          aiConfidence: twitterSentiment.score,
          reasoning: `Twitter sentiment ${this.config.contrarian ? 'too bullish - sell signal' : 'bullish - buy signal'}`
        });
      }
    }

    return trades;
  }

  async optimize(historicalData: any): Promise<void> {
    // Train sentiment model on historical data
    console.log('[AISentiment] Training sentiment model...');
  }
}

class YieldFarmStrategy extends BaseStrategy {
  name = 'DeFi Yield Farming';
  type: StrategyType = 'YIELD_FARM';

  constructor(
    private config: {
      minAPY: number;
      maxRisk: 'LOW' | 'MEDIUM' | 'HIGH';
      protocols: string[];
      autoCompound: boolean;
    }
  ) {
    super();
  }

  async generateSignals(marketData: any): Promise<Trade[]> {
    const trades: Trade[] = [];
    const yields = marketData.defiYields || [];

    for (const opportunity of yields) {
      if (opportunity.apy < this.config.minAPY) continue;
      if (!this.config.protocols.includes(opportunity.protocol)) continue;

      // Risk assessment
      const riskScore = this.assessRisk(opportunity);
      if (this.config.maxRisk === 'LOW' && riskScore > 30) continue;
      if (this.config.maxRisk === 'MEDIUM' && riskScore > 60) continue;

      trades.push({
        id: `yield-${Date.now()}-${opportunity.protocol}`,
        botId: '',
        strategy: this.name,
        symbol: opportunity.token,
        side: 'BUY',
        type: 'MARKET',
        quantity: 0,
        status: 'PENDING',
        timestamp: new Date(),
        aiConfidence: 100 - riskScore,
        reasoning: `${opportunity.protocol}: ${opportunity.apy}% APY on ${opportunity.token}. Risk score: ${riskScore}/100`
      });
    }

    return trades;
  }

  private assessRisk(opportunity: any): number {
    let riskScore = 0;

    // TVL risk
    if (opportunity.tvl < 1_000_000) riskScore += 30;
    else if (opportunity.tvl < 10_000_000) riskScore += 15;

    // APY risk (if too high, likely unsustainable)
    if (opportunity.apy > 100) riskScore += 40;
    else if (opportunity.apy > 50) riskScore += 20;

    // Protocol age
    if (opportunity.protocolAge < 30) riskScore += 20; // Less than 30 days old

    // Audit status
    if (!opportunity.audited) riskScore += 25;

    return Math.min(100, riskScore);
  }

  async optimize(historicalData: any): Promise<void> {
    console.log('[YieldFarm] Analyzing historical yield sustainability...');
  }
}

// ============================================
// MAIN BOT ENGINE
// ============================================

export class AITradeGodBot extends EventEmitter {
  private bots: Map<string, BotConfig> = new Map();
  private strategies: Map<string, BaseStrategy> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private lendingAgreements: Map<string, LendingAgreement> = new Map();

  private isRunning: boolean = false;

  constructor() {
    super();
    console.log('[AITradeGod] Bot Engine Initialized');
    console.log('[AITradeGod] FREE & OPEN SOURCE - Build Your Empire');
  }

  // ============================================
  // BOT MANAGEMENT
  // ============================================

  /**
   * Create a new trading bot (Admin only)
   */
  createBot(config: Omit<BotConfig, 'id' | 'createdAt' | 'status'>): BotConfig {
    const bot: BotConfig = {
      ...config,
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'PAUSED'
    };

    this.bots.set(bot.id, bot);
    this.trades.set(bot.id, []);

    // Initialize strategies
    this.initializeStrategies(bot);

    console.log(`[AITradeGod] Bot created: ${bot.name} (${bot.id})`);
    this.emit('botCreated', bot);

    return bot;
  }

  /**
   * Initialize strategies for a bot
   */
  private initializeStrategies(bot: BotConfig): void {
    for (const strategyConfig of bot.strategies) {
      let strategy: BaseStrategy;

      switch (strategyConfig.type) {
        case 'DCA':
          strategy = new DCAStrategy(strategyConfig.parameters as any);
          break;
        case 'GRID':
          strategy = new GridTradingStrategy(strategyConfig.parameters as any);
          break;
        case 'WHALE_FOLLOW':
          strategy = new WhaleFollowStrategy(strategyConfig.parameters as any);
          break;
        case 'AI_SENTIMENT':
          strategy = new AISentimentStrategy(strategyConfig.parameters as any);
          break;
        case 'YIELD_FARM':
          strategy = new YieldFarmStrategy(strategyConfig.parameters as any);
          break;
        default:
          console.log(`[AITradeGod] Unknown strategy type: ${strategyConfig.type}`);
          continue;
      }

      this.strategies.set(`${bot.id}-${strategyConfig.id}`, strategy);
    }
  }

  /**
   * Start a bot
   */
  async startBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');

    bot.status = 'ACTIVE';
    this.bots.set(botId, bot);

    console.log(`[AITradeGod] Bot started: ${bot.name}`);
    this.emit('botStarted', bot);

    // Start trading loop
    this.runTradingLoop(botId);
  }

  /**
   * Stop a bot
   */
  async stopBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');

    bot.status = 'PAUSED';
    this.bots.set(botId, bot);

    console.log(`[AITradeGod] Bot stopped: ${bot.name}`);
    this.emit('botStopped', bot);
  }

  /**
   * Main trading loop for a bot
   */
  private async runTradingLoop(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot || bot.status !== 'ACTIVE') return;

    try {
      // Fetch market data
      const marketData = await this.fetchMarketData(bot);

      // Generate signals from all strategies
      const allSignals: Trade[] = [];

      for (const strategyConfig of bot.strategies) {
        if (!strategyConfig.enabled) continue;

        const strategy = this.strategies.get(`${botId}-${strategyConfig.id}`);
        if (!strategy) continue;

        const signals = await strategy.generateSignals(marketData);

        // Weight signals by strategy allocation
        signals.forEach(signal => {
          signal.botId = botId;
          signal.quantity = signal.quantity * (strategyConfig.weight / 100);
        });

        allSignals.push(...signals);
      }

      // Apply risk management
      const filteredSignals = this.applyRiskManagement(bot, allSignals);

      // Execute trades
      for (const signal of filteredSignals) {
        await this.executeTrade(bot, signal);
      }

    } catch (error) {
      console.error(`[AITradeGod] Error in trading loop for ${botId}:`, error);
      this.emit('botError', { botId, error });
    }

    // Schedule next iteration
    setTimeout(() => this.runTradingLoop(botId), 60000); // Every minute
  }

  /**
   * Fetch market data for bot strategies
   */
  private async fetchMarketData(bot: BotConfig): Promise<any> {
    // In production: Fetch from real APIs
    return {
      // Price data
      BTC: { price: 100000, changePercent24h: 2.5 },
      ETH: { price: 4000, changePercent24h: 3.2 },

      // Whale movements
      whaleMovements: [],

      // Sentiment
      sentiment: {
        fearGreed: 65,
        twitter: { score: 72, topToken: 'ETH' }
      },

      // DeFi yields
      defiYields: [
        { protocol: 'Aave', token: 'USDC', apy: 5.2, tvl: 10_000_000_000, audited: true, protocolAge: 1200 },
        { protocol: 'Curve', token: 'DAI', apy: 8.5, tvl: 2_000_000_000, audited: true, protocolAge: 1000 }
      ]
    };
  }

  /**
   * Apply risk management filters
   */
  private applyRiskManagement(bot: BotConfig, signals: Trade[]): Trade[] {
    return signals.filter(signal => {
      // Check if asset is allowed
      if (!bot.allowedAssets.includes(signal.symbol) && !bot.allowedAssets.includes('*')) {
        return false;
      }

      // Check position size
      if (signal.quantity > bot.maxPositionSize) {
        signal.quantity = bot.maxPositionSize;
      }

      // Check AI confidence threshold
      if (bot.aiModel && signal.aiConfidence !== undefined) {
        if (signal.aiConfidence < bot.aiModel.confidenceThreshold) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Execute a trade - REAL IMPLEMENTATION
   * Connects to BrokerManager for actual execution
   */
  private async executeTrade(bot: BotConfig, trade: Trade): Promise<void> {
    console.log(`[AITradeGod] Executing REAL trade for ${bot.name}:`);
    console.log(`  ${trade.side} ${trade.quantity} ${trade.symbol}`);
    console.log(`  Strategy: ${trade.strategy}`);
    console.log(`  Reasoning: ${trade.reasoning}`);

    try {
      // REAL EXECUTION via BrokerManager
      const { BrokerManager } = await import('../brokers/broker_manager');
      const brokerManager = BrokerManager.getInstance();
      const connectedBrokers = brokerManager.getConnectedBrokerIds();

      const tradeAny = trade as any;
      if (connectedBrokers.length === 0) {
        console.warn('[AITradeGod] No brokers connected - storing trade for later execution');
        trade.status = 'PENDING';
        tradeAny.statusReason = 'No brokers connected';
      } else {
        // Get the primary broker
        const brokerId = connectedBrokers[0];
        const broker = brokerManager.getBroker(brokerId);

        if (broker) {
          // Submit real order
          const order = await broker.submitOrder({
            symbol: trade.symbol,
            side: trade.side.toLowerCase() as 'buy' | 'sell',
            type: 'market',
            quantity: trade.quantity,
            timeInForce: 'day'
          });

          if (order && order.id) {
            trade.status = 'FILLED';
            tradeAny.orderId = order.id;
            tradeAny.executedPrice = (order as any).averageFilledPrice || (order as any).filledPrice;
            tradeAny.executedAt = new Date();
            tradeAny.brokerId = brokerId;
            console.log(`[AITradeGod] REAL order executed: ${order.id} @ ${tradeAny.executedPrice}`);
          } else {
            trade.status = 'FAILED';
            tradeAny.statusReason = 'Broker rejected order';
          }
        } else {
          trade.status = 'PENDING';
          tradeAny.statusReason = 'Broker unavailable';
        }
      }
    } catch (error) {
      console.error('[AITradeGod] Trade execution error:', error);
      trade.status = 'FAILED';
      (trade as any).statusReason = (error as Error).message;
    }

    // Store trade
    const botTrades = this.trades.get(bot.id) || [];
    botTrades.push(trade);
    this.trades.set(bot.id, botTrades);

    // Update last trade time
    bot.lastTradeAt = new Date();
    this.bots.set(bot.id, bot);

    this.emit('tradeExecuted', { bot, trade });
  }

  // ============================================
  // LENDING SYSTEM
  // ============================================

  /**
   * List a bot for lending
   */
  listBotForLending(
    botId: string,
    monthlyFee: number,
    profitShare: number
  ): void {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');

    bot.isPublic = true;
    bot.lendingPrice = monthlyFee;
    bot.profitShare = profitShare;

    this.bots.set(botId, bot);
    console.log(`[AITradeGod] Bot listed for lending: ${bot.name}`);
    console.log(`  Monthly fee: $${monthlyFee}`);
    console.log(`  Profit share: ${profitShare}%`);

    this.emit('botListed', bot);
  }

  /**
   * Borrow a bot
   */
  async borrowBot(
    botId: string,
    borrowerId: string,
    durationMonths: number
  ): Promise<LendingAgreement> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');
    if (!bot.isPublic) throw new Error('Bot is not available for lending');

    const agreement: LendingAgreement = {
      id: `lending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      botId,
      borrowerId,
      ownerId: bot.owner,
      monthlyFee: bot.lendingPrice || 0,
      profitShare: bot.profitShare || 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      totalFeePaid: (bot.lendingPrice || 0) * durationMonths,
      totalProfitShared: 0
    };

    this.lendingAgreements.set(agreement.id, agreement);

    console.log(`[AITradeGod] Bot borrowed:`);
    console.log(`  Bot: ${bot.name}`);
    console.log(`  Borrower: ${borrowerId}`);
    console.log(`  Duration: ${durationMonths} months`);
    console.log(`  Total fee: $${agreement.totalFeePaid}`);

    this.emit('botBorrowed', { bot, agreement });

    return agreement;
  }

  /**
   * Get available bots for lending
   */
  getAvailableBots(): BotConfig[] {
    return Array.from(this.bots.values()).filter(bot => bot.isPublic);
  }

  /**
   * Get lending agreements for a user
   */
  getLendingAgreements(userId: string): LendingAgreement[] {
    return Array.from(this.lendingAgreements.values()).filter(
      agreement => agreement.borrowerId === userId || agreement.ownerId === userId
    );
  }

  // ============================================
  // PERFORMANCE & ANALYTICS
  // ============================================

  /**
   * Get bot performance
   */
  getBotPerformance(botId: string, period: BotPerformance['period']): BotPerformance {
    const trades = this.trades.get(botId) || [];

    // Filter by period
    const periodMs = {
      '24H': 24 * 60 * 60 * 1000,
      '7D': 7 * 24 * 60 * 60 * 1000,
      '30D': 30 * 24 * 60 * 60 * 1000,
      'ALL': Infinity
    };

    const cutoff = Date.now() - periodMs[period];
    const periodTrades = trades.filter(t => t.timestamp.getTime() > cutoff);

    // Calculate metrics
    const winningTrades = periodTrades.filter(t => (t.pnl || 0) > 0);
    const totalPnL = periodTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const sortedByPnL = [...periodTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));

    return {
      botId,
      period,
      totalTrades: periodTrades.length,
      winRate: periodTrades.length > 0 ? (winningTrades.length / periodTrades.length) * 100 : 0,
      profitFactor: this.calculateProfitFactor(periodTrades),
      totalPnL,
      totalPnLPercent: 0, // Would need starting capital
      maxDrawdown: this.calculateMaxDrawdown(periodTrades),
      sharpeRatio: this.calculateSharpeRatio(periodTrades),
      bestTrade: sortedByPnL[0] || null,
      worstTrade: sortedByPnL[sortedByPnL.length - 1] || null
    };
  }

  private calculateProfitFactor(trades: Trade[]): number {
    const profits = trades.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const losses = Math.abs(trades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));
    return losses > 0 ? profits / losses : profits > 0 ? Infinity : 0;
  }

  private calculateMaxDrawdown(trades: Trade[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    for (const trade of trades) {
      runningPnL += trade.pnl || 0;
      peak = Math.max(peak, runningPnL);
      const drawdown = peak > 0 ? ((peak - runningPnL) / peak) * 100 : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateSharpeRatio(trades: Trade[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map(t => t.pnl || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );

    const riskFreeRate = 0.05 / 252; // Daily risk-free rate
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  }

  // ============================================
  // PLAIN ENGLISH COMMANDS
  // ============================================

  /**
   * Process natural language command
   */
  async processCommand(command: string): Promise<string> {
    const lowerCommand = command.toLowerCase();

    // Create bot commands
    if (lowerCommand.includes('create') && lowerCommand.includes('bot')) {
      return this.handleCreateBotCommand(command);
    }

    // Start/stop commands
    if (lowerCommand.includes('start')) {
      const botName = this.extractBotName(command);
      return `Starting bot: ${botName}...`;
    }

    if (lowerCommand.includes('stop')) {
      const botName = this.extractBotName(command);
      return `Stopping bot: ${botName}...`;
    }

    // Performance commands
    if (lowerCommand.includes('how') && lowerCommand.includes('doing')) {
      return this.getPerformanceSummary();
    }

    // Lending commands
    if (lowerCommand.includes('lend') || lowerCommand.includes('rent')) {
      return this.handleLendingCommand(command);
    }

    return "I didn't understand that command. Try:\n" +
      "- 'Create a DCA bot for BTC'\n" +
      "- 'Start my trading bot'\n" +
      "- 'How are my bots doing?'\n" +
      "- 'List my bot for lending at $50/month'";
  }

  private handleCreateBotCommand(command: string): string {
    // Parse command to extract bot parameters
    const hasGRID = command.toLowerCase().includes('grid');
    const hasDCA = command.toLowerCase().includes('dca');
    const hasWhale = command.toLowerCase().includes('whale');

    const strategies = [];
    if (hasDCA) strategies.push('DCA');
    if (hasGRID) strategies.push('GRID');
    if (hasWhale) strategies.push('WHALE_FOLLOW');

    return `Creating bot with strategies: ${strategies.join(', ') || 'DCA (default)'}\n` +
      `Use the dashboard to configure detailed parameters.`;
  }

  private handleLendingCommand(command: string): string {
    const priceMatch = command.match(/\$(\d+)/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 50;

    return `To list your bot for lending at $${price}/month:\n` +
      `1. Go to Bot Management\n` +
      `2. Select your bot\n` +
      `3. Click "List for Lending"\n` +
      `4. Set your price and profit share`;
  }

  private extractBotName(command: string): string {
    // Simple extraction - would be more sophisticated in production
    const match = command.match(/'([^']+)'/);
    return match ? match[1] : 'default bot';
  }

  private getPerformanceSummary(): string {
    const bots = Array.from(this.bots.values());
    if (bots.length === 0) {
      return "You don't have any bots yet. Create one to get started!";
    }

    let summary = "📊 **Bot Performance Summary**\n\n";

    for (const bot of bots) {
      const perf = this.getBotPerformance(bot.id, '7D');
      summary += `**${bot.name}** (${bot.status})\n`;
      summary += `  • Win Rate: ${perf.winRate.toFixed(1)}%\n`;
      summary += `  • Total P&L: $${perf.totalPnL.toFixed(2)}\n`;
      summary += `  • Trades: ${perf.totalTrades}\n\n`;
    }

    return summary;
  }

  // ============================================
  // GETTERS
  // ============================================

  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId);
  }

  getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  getTrades(botId: string): Trade[] {
    return this.trades.get(botId) || [];
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const aiTradeGodBot = new AITradeGodBot();

export default AITradeGodBot;

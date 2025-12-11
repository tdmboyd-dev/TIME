/**
 * TIME — Meta-Intelligence Trading Governor
 * Learning Engine
 *
 * TIME's 24/7 learning system that continuously learns from:
 * - Paid accounts
 * - Demo accounts
 * - Paper trading
 * - Historical data
 * - Live data
 * - Bots
 * - Ensembles
 * - Market regimes
 * - Mistakes
 * - Successes
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent, timeGovernor } from '../core/time_governor';
import {
  LearningEvent,
  LearningEventType,
  LearningSource,
  LearningInsight,
  Trade,
  Bot,
  BotPerformance,
  MarketRegime,
  SystemHealth,
} from '../types';

const log = loggers.learning;

// Learning configuration
export interface LearningConfig {
  minTradesForInsight: number;
  insightConfidenceThreshold: number;
  learningRateDecay: number;
  patternRecognitionWindow: number; // in trades
  regimeWeighting: boolean;
}

const DEFAULT_CONFIG: LearningConfig = {
  minTradesForInsight: 50,
  insightConfidenceThreshold: 0.7,
  learningRateDecay: 0.95,
  patternRecognitionWindow: 100,
  regimeWeighting: true,
};

/**
 * Learning Engine
 *
 * The brain of TIME - continuously processes data from all sources
 * to extract patterns, generate insights, and improve strategies.
 */
export class LearningEngine extends EventEmitter implements TIMEComponent {
  public readonly name = 'LearningEngine';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private config: LearningConfig;
  private learningEvents: LearningEvent[] = [];
  private insights: LearningInsight[] = [];
  private isProcessing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  // Learning metrics
  private metrics = {
    totalEventsProcessed: 0,
    totalInsightsGenerated: 0,
    insightsByCategory: new Map<string, number>(),
    learningVelocity: 0, // insights per hour
    lastProcessingTime: new Date(),
  };

  // Pattern storage
  private patterns = {
    winningPatterns: new Map<string, number>(),
    losingPatterns: new Map<string, number>(),
    regimePatterns: new Map<MarketRegime, Map<string, number>>(),
    botPatterns: new Map<string, Map<string, number>>(),
  };

  constructor(config: Partial<LearningConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the learning engine
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Learning Engine...', { config: this.config });

    // Start the continuous learning loop
    this.startLearningLoop();

    this.status = 'online';
    log.info('Learning Engine initialized');
  }

  /**
   * Start the continuous learning loop
   */
  private startLearningLoop(): void {
    if (this.processInterval) return;

    // Process learning events every minute
    this.processInterval = setInterval(() => {
      this.processLearningQueue();
    }, 60 * 1000);

    log.info('Learning loop started');
  }

  /**
   * Process queued learning events
   */
  private async processLearningQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (this.learningEvents.length === 0) return;

    this.isProcessing = true;

    try {
      const batchSize = 100;
      const eventsToProcess = this.learningEvents.splice(0, batchSize);

      for (const event of eventsToProcess) {
        await this.processLearningEvent(event);
      }

      this.metrics.lastProcessingTime = new Date();
      this.calculateLearningVelocity();

    } catch (error) {
      log.error('Error processing learning queue', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single learning event
   */
  private async processLearningEvent(event: LearningEvent): Promise<void> {
    this.metrics.totalEventsProcessed++;

    switch (event.type) {
      case 'trade_outcome':
        await this.learnFromTrade(event);
        break;
      case 'bot_performance':
        await this.learnFromBotPerformance(event);
        break;
      case 'regime_change':
        await this.learnFromRegimeChange(event);
        break;
      case 'risk_event':
        await this.learnFromRiskEvent(event);
        break;
      case 'user_feedback':
        await this.learnFromUserFeedback(event);
        break;
      case 'market_anomaly':
        await this.learnFromAnomaly(event);
        break;
      case 'strategy_comparison':
        await this.learnFromStrategyComparison(event);
        break;
      case 'ensemble_performance':
        await this.learnFromEnsemblePerformance(event);
        break;
    }
  }

  /**
   * Record a learning event
   */
  public recordEvent(
    type: LearningEventType,
    source: LearningSource,
    data: Record<string, unknown>
  ): string {
    const event: LearningEvent = {
      id: uuidv4(),
      type,
      source,
      data,
      insights: [],
      appliedTo: [],
      timestamp: new Date(),
    };

    this.learningEvents.push(event);

    log.debug('Learning event recorded', {
      type,
      source,
      eventId: event.id,
    });

    return event.id;
  }

  /**
   * Learn from a trade outcome
   */
  private async learnFromTrade(event: LearningEvent): Promise<void> {
    const trade = event.data as unknown as Trade;

    // Extract patterns from trade
    const patterns = this.extractTradePatterns(trade);

    // Update pattern storage
    const isWin = (trade.pnl ?? 0) > 0;
    const patternMap = isWin ? this.patterns.winningPatterns : this.patterns.losingPatterns;

    for (const pattern of patterns) {
      const count = patternMap.get(pattern) ?? 0;
      patternMap.set(pattern, count + 1);
    }

    // Update regime-specific patterns
    const regime = trade.attribution.regimeAtEntry;
    if (!this.patterns.regimePatterns.has(regime)) {
      this.patterns.regimePatterns.set(regime, new Map());
    }
    const regimeMap = this.patterns.regimePatterns.get(regime)!;

    for (const pattern of patterns) {
      const key = `${pattern}:${isWin ? 'win' : 'loss'}`;
      const count = regimeMap.get(key) ?? 0;
      regimeMap.set(key, count + 1);
    }

    // Check if we have enough data to generate insights
    await this.checkForInsights('trade_patterns');
  }

  /**
   * Extract patterns from a trade
   */
  private extractTradePatterns(trade: Trade): string[] {
    const patterns: string[] = [];

    // Direction pattern
    patterns.push(`direction:${trade.direction}`);

    // Symbol pattern
    patterns.push(`symbol:${trade.symbol}`);

    // Bot combination pattern
    if (trade.botIds.length > 1) {
      patterns.push(`multi_bot:${trade.botIds.sort().join('_')}`);
    }

    // Signal strength pattern
    for (const signal of trade.signals) {
      if (signal.strength > 0.8) {
        patterns.push(`strong_signal:${signal.direction}`);
      } else if (signal.strength < 0.5) {
        patterns.push(`weak_signal:${signal.direction}`);
      }
    }

    // Risk engine involvement pattern
    if (trade.riskEngineDecisions.length > 0) {
      patterns.push(`risk_modified:true`);
      for (const decision of trade.riskEngineDecisions) {
        patterns.push(`risk_action:${decision.action}`);
      }
    }

    return patterns;
  }

  /**
   * Learn from bot performance
   */
  private async learnFromBotPerformance(event: LearningEvent): Promise<void> {
    const { botId, performance } = event.data as {
      botId: string;
      performance: BotPerformance;
    };

    // Update bot-specific patterns
    if (!this.patterns.botPatterns.has(botId)) {
      this.patterns.botPatterns.set(botId, new Map());
    }
    const botMap = this.patterns.botPatterns.get(botId)!;

    // Performance patterns
    botMap.set('win_rate', performance.winRate);
    botMap.set('profit_factor', performance.profitFactor);
    botMap.set('sharpe_ratio', performance.sharpeRatio);
    botMap.set('max_drawdown', performance.maxDrawdown);

    // Generate insights if performance is notable
    if (performance.winRate > 0.65 && performance.totalTrades >= this.config.minTradesForInsight) {
      await this.generateInsight({
        category: 'bot_performance',
        insight: `Bot ${botId} showing strong performance with ${(performance.winRate * 100).toFixed(1)}% win rate`,
        confidence: 0.8,
        evidence: [`${performance.totalTrades} trades`, `Profit factor: ${performance.profitFactor.toFixed(2)}`],
        actionable: true,
        suggestedActions: ['Consider increasing allocation', 'Study bot strategy for synthesis'],
      });
    }

    if (performance.maxDrawdown > 0.2) {
      await this.generateInsight({
        category: 'bot_risk',
        insight: `Bot ${botId} has high drawdown risk (${(performance.maxDrawdown * 100).toFixed(1)}%)`,
        confidence: 0.9,
        evidence: [`Max drawdown: ${(performance.maxDrawdown * 100).toFixed(1)}%`],
        actionable: true,
        suggestedActions: ['Review position sizing', 'Consider adding risk limits'],
      });
    }
  }

  /**
   * Learn from regime change
   */
  private async learnFromRegimeChange(event: LearningEvent): Promise<void> {
    const { previousRegime, newRegime, transitionDuration } = event.data as {
      previousRegime: MarketRegime;
      newRegime: MarketRegime;
      transitionDuration: number;
    };

    // Record regime transition pattern
    const transitionKey = `${previousRegime}->${newRegime}`;

    await this.generateInsight({
      category: 'regime_transition',
      insight: `Market regime changed from ${previousRegime} to ${newRegime}`,
      confidence: 0.95,
      evidence: [`Transition duration: ${transitionDuration}ms`],
      actionable: true,
      suggestedActions: [
        `Adjust strategies for ${newRegime} regime`,
        'Review bot allocations',
      ],
    });
  }

  /**
   * Learn from risk event
   */
  private async learnFromRiskEvent(event: LearningEvent): Promise<void> {
    const { type, severity, action, reason } = event.data as {
      type: string;
      severity: string;
      action: string;
      reason: string;
    };

    if (severity === 'high' || severity === 'critical') {
      await this.generateInsight({
        category: 'risk_event',
        insight: `Risk engine triggered ${severity} severity event: ${reason}`,
        confidence: 1.0,
        evidence: [`Action taken: ${action}`, `Event type: ${type}`],
        actionable: true,
        suggestedActions: ['Review risk parameters', 'Analyze root cause'],
      });
    }
  }

  /**
   * Learn from user feedback
   */
  private async learnFromUserFeedback(event: LearningEvent): Promise<void> {
    const { feedback, context, rating } = event.data as {
      feedback: string;
      context: string;
      rating: number;
    };

    if (rating <= 2) {
      await this.generateInsight({
        category: 'user_feedback',
        insight: `Negative user feedback received: ${feedback}`,
        confidence: 0.7,
        evidence: [`Rating: ${rating}/5`, `Context: ${context}`],
        actionable: true,
        suggestedActions: ['Review related functionality', 'Consider improvements'],
      });
    }
  }

  /**
   * Learn from market anomaly
   */
  private async learnFromAnomaly(event: LearningEvent): Promise<void> {
    const { anomalyType, magnitude, affectedSymbols } = event.data as {
      anomalyType: string;
      magnitude: number;
      affectedSymbols: string[];
    };

    await this.generateInsight({
      category: 'market_anomaly',
      insight: `Market anomaly detected: ${anomalyType} with magnitude ${magnitude}`,
      confidence: 0.85,
      evidence: [`Affected symbols: ${affectedSymbols.join(', ')}`],
      actionable: true,
      suggestedActions: [
        'Review open positions in affected symbols',
        'Consider temporary risk reduction',
      ],
    });
  }

  /**
   * Learn from strategy comparison
   */
  private async learnFromStrategyComparison(event: LearningEvent): Promise<void> {
    const { strategies, winner, metrics } = event.data as {
      strategies: string[];
      winner: string;
      metrics: Record<string, number>;
    };

    await this.generateInsight({
      category: 'strategy_comparison',
      insight: `Strategy comparison: ${winner} outperformed in current regime`,
      confidence: 0.75,
      evidence: strategies.map((s) => `${s}: ${metrics[s]?.toFixed(2) ?? 'N/A'}`),
      actionable: true,
      suggestedActions: ['Consider increasing allocation to winning strategy'],
    });
  }

  /**
   * Learn from ensemble performance
   */
  private async learnFromEnsemblePerformance(event: LearningEvent): Promise<void> {
    const { ensembleId, performance, botContributions } = event.data as {
      ensembleId: string;
      performance: BotPerformance;
      botContributions: Record<string, number>;
    };

    // Identify strong and weak contributors
    const entries = Object.entries(botContributions);
    const sorted = entries.sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0) {
      const topContributor = sorted[0];
      const bottomContributor = sorted[sorted.length - 1];

      await this.generateInsight({
        category: 'ensemble_analysis',
        insight: `Ensemble ${ensembleId}: Top contributor ${topContributor[0]} (${(topContributor[1] * 100).toFixed(1)}%)`,
        confidence: 0.8,
        evidence: [
          `Ensemble win rate: ${(performance.winRate * 100).toFixed(1)}%`,
          `Weakest: ${bottomContributor[0]} (${(bottomContributor[1] * 100).toFixed(1)}%)`,
        ],
        actionable: true,
        suggestedActions: [
          'Consider adjusting bot weights',
          'Evaluate removing weak contributors',
        ],
      });
    }
  }

  /**
   * Check if we have enough data to generate insights
   */
  private async checkForInsights(category: string): Promise<void> {
    // Analyze pattern frequencies
    const winPatterns = this.patterns.winningPatterns;
    const lossPatterns = this.patterns.losingPatterns;

    // Find patterns that appear significantly more in wins
    for (const [pattern, winCount] of winPatterns) {
      const lossCount = lossPatterns.get(pattern) ?? 0;
      const total = winCount + lossCount;

      if (total >= this.config.minTradesForInsight) {
        const winRatio = winCount / total;

        if (winRatio > 0.65) {
          await this.generateInsight({
            category: 'pattern_discovery',
            insight: `Pattern "${pattern}" associated with ${(winRatio * 100).toFixed(1)}% win rate`,
            confidence: Math.min(0.95, 0.5 + (total / 200) * 0.45),
            evidence: [`${winCount} wins, ${lossCount} losses out of ${total} occurrences`],
            actionable: true,
            suggestedActions: ['Increase weight when pattern detected'],
          });
        }
      }
    }
  }

  /**
   * Generate and store an insight
   */
  private async generateInsight(
    data: Omit<LearningInsight, 'id' | 'createdAt'>
  ): Promise<LearningInsight> {
    // Check confidence threshold
    if (data.confidence < this.config.insightConfidenceThreshold) {
      log.debug('Insight below confidence threshold', {
        category: data.category,
        confidence: data.confidence,
      });
      return data as LearningInsight;
    }

    const insight: LearningInsight = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
    };

    this.insights.push(insight);
    this.metrics.totalInsightsGenerated++;

    // Update category counts
    const categoryCount = this.metrics.insightsByCategory.get(data.category) ?? 0;
    this.metrics.insightsByCategory.set(data.category, categoryCount + 1);

    // Notify TIME Governor
    timeGovernor.recordInsight(insight);

    log.info('Learning insight generated', {
      category: insight.category,
      confidence: insight.confidence,
      actionable: insight.actionable,
    });

    this.emit('insight:generated', insight);

    return insight;
  }

  /**
   * Calculate learning velocity (insights per hour)
   */
  private calculateLearningVelocity(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentInsights = this.insights.filter(
      (i) => i.createdAt > oneHourAgo
    );
    this.metrics.learningVelocity = recentInsights.length;
  }

  /**
   * Get recent insights
   */
  public getRecentInsights(limit: number = 50): LearningInsight[] {
    return this.insights
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get insights by category
   */
  public getInsightsByCategory(category: string): LearningInsight[] {
    return this.insights.filter((i) => i.category === category);
  }

  /**
   * Get actionable insights
   */
  public getActionableInsights(): LearningInsight[] {
    return this.insights.filter((i) => i.actionable);
  }

  /**
   * Get learning metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      insightsByCategory: Object.fromEntries(this.metrics.insightsByCategory),
      queuedEvents: this.learningEvents.length,
      totalInsights: this.insights.length,
    };
  }

  /**
   * Get component health
   */
  public getHealth(): SystemHealth {
    return {
      component: this.name,
      status: this.status,
      lastCheck: new Date(),
      metrics: {
        totalEventsProcessed: this.metrics.totalEventsProcessed,
        totalInsightsGenerated: this.metrics.totalInsightsGenerated,
        learningVelocity: this.metrics.learningVelocity,
        queueSize: this.learningEvents.length,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Learning Engine...');

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    this.status = 'offline';
  }
}

// Export singleton
export const learningEngine = new LearningEngine();

export default LearningEngine;

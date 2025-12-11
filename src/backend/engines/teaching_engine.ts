/**
 * TIME — Meta-Intelligence Trading Governor
 * Teaching Engine
 *
 * TIME must teach users in:
 * - Plain English
 * - Beginner mode
 * - Intermediate mode
 * - Pro mode
 * - Quant mode
 * - Story mode
 *
 * TIME must explain:
 * - Why trades were taken
 * - Why trades were avoided
 * - What bots saw
 * - What TIME saw
 * - What the regime was
 * - What the risk engine did
 * - What the synthesis engine did
 *
 * TIME must turn every trade into a lesson.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent } from '../core/time_governor';
import {
  TeachingMode,
  Lesson,
  ExplanationRequest,
  Trade,
  TradeStory,
  Signal,
  RiskDecision,
  MarketRegime,
  SystemHealth,
} from '../types';

const log = loggers.teaching;

// Explanation templates for different modes
const EXPLANATION_TEMPLATES = {
  beginner: {
    tradeEntry: 'We decided to {direction} {symbol} because {reason}. Think of it like {analogy}.',
    tradeExit: 'We closed this trade because {reason}. The result was {outcome}.',
    riskAction: 'Our safety system {action} because {reason}. This helps protect your money.',
    regime: 'The market was in a "{regime}" phase, which means {description}.',
  },
  intermediate: {
    tradeEntry: 'Entry on {symbol} ({direction}) triggered by {signals}. Key factors: {factors}.',
    tradeExit: 'Exit triggered by {exitReason}. P&L: {pnl}. Duration: {duration}.',
    riskAction: 'Risk engine applied {action}: {reason}. Impact: {impact}.',
    regime: 'Market regime: {regime}. Indicators: {indicators}. Strategy adjustment: {adjustment}.',
  },
  pro: {
    tradeEntry: '{symbol} {direction} @ {price}. Signals: {signalDetails}. Confidence: {confidence}%. Attribution: {attribution}.',
    tradeExit: 'Exit @ {exitPrice}. {pnlDetails}. Sharpe contribution: {sharpeContrib}. Max adverse: {mae}.',
    riskAction: 'Risk decision: {type} -> {action}. Severity: {severity}. Affected positions: {affected}.',
    regime: 'Regime classification: {regime} (confidence: {confidence}%). Transition probability: {transitionProb}.',
  },
  quant: {
    tradeEntry: 'Long/Short: {direction}. Entry: {price}. Size: {size} ({sizeReason}). Signal vector: [{signals}]. Expected value: {ev}. Kelly fraction: {kelly}.',
    tradeExit: 'Exit: {exitPrice}. Realized P&L: {pnl} ({pnlBps} bps). Slippage: {slippage} bps. Actual vs expected: {actualVsExpected}.',
    riskAction: 'Risk event: {type}. Pre-trade VaR: {preVaR}. Post-trade VaR: {postVaR}. Delta-hedge: {hedge}.',
    regime: 'Regime: {regime}. HMM state prob: [{stateProbs}]. Vol regime: {volRegime} ({volPercentile}th %ile). Correlation regime: {corrRegime}.',
  },
  story: {
    tradeEntry: 'Picture this: The market was {marketMood}. Our bots were watching closely when {triggerEvent}. That\'s when we decided to {action}.',
    tradeExit: 'As the trade unfolded, {narrative}. In the end, {outcome}.',
    riskAction: 'Behind the scenes, our guardian system noticed {observation}. It stepped in to {action}, keeping everything safe.',
    regime: 'The market was telling a story of {regimeStory}. This meant we needed to {adjustment}.',
  },
};

/**
 * Teaching Engine
 *
 * Transforms complex trading decisions into understandable
 * lessons for users at any experience level.
 */
export class TeachingEngine extends EventEmitter implements TIMEComponent {
  public readonly name = 'TeachingEngine';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private lessons: Map<string, Lesson> = new Map();
  private explanationCache: Map<string, Record<TeachingMode, string>> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize the teaching engine
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Teaching Engine...');

    this.status = 'online';
    log.info('Teaching Engine initialized');
  }

  /**
   * Generate a complete trade story
   */
  public generateTradeStory(trade: Trade): TradeStory {
    return {
      beginnerExplanation: this.explainTrade(trade, 'beginner'),
      intermediateExplanation: this.explainTrade(trade, 'intermediate'),
      proExplanation: this.explainTrade(trade, 'pro'),
      quantExplanation: this.explainTrade(trade, 'quant'),
      keyInsights: this.extractKeyInsights(trade),
      lessonsLearned: this.extractLessons(trade),
    };
  }

  /**
   * Explain a trade in the specified mode
   */
  public explainTrade(trade: Trade, mode: TeachingMode): string {
    const cacheKey = `trade:${trade.id}:${mode}`;
    const cached = this.explanationCache.get(cacheKey);
    if (cached && cached[mode]) {
      return cached[mode];
    }

    let explanation: string;

    switch (mode) {
      case 'beginner':
        explanation = this.explainTradeForBeginner(trade);
        break;
      case 'intermediate':
        explanation = this.explainTradeForIntermediate(trade);
        break;
      case 'pro':
        explanation = this.explainTradeForPro(trade);
        break;
      case 'quant':
        explanation = this.explainTradeForQuant(trade);
        break;
      case 'story':
        explanation = this.explainTradeAsStory(trade);
        break;
      default:
        explanation = this.explainTradeForIntermediate(trade);
    }

    // Cache the explanation
    const existing = this.explanationCache.get(cacheKey) ?? {} as Record<TeachingMode, string>;
    existing[mode] = explanation;
    this.explanationCache.set(cacheKey, existing);

    return explanation;
  }

  /**
   * Explain trade for beginners
   */
  private explainTradeForBeginner(trade: Trade): string {
    const direction = trade.direction === 'long' ? 'buy' : 'sell';
    const outcome = (trade.pnl ?? 0) >= 0 ? 'made money' : 'lost a little';
    const analogy = this.getBeginnerAnalogy(trade);

    const mainReason = this.getMainReason(trade.signals);

    let explanation = `We decided to ${direction} ${trade.symbol} because ${mainReason}. `;
    explanation += `Think of it like ${analogy}. `;

    if (trade.exitPrice) {
      explanation += `When we closed the trade, we ${outcome}. `;
    }

    if (trade.riskEngineDecisions.length > 0) {
      const riskAction = trade.riskEngineDecisions[0];
      explanation += `Our safety system helped by ${this.describeRiskActionSimply(riskAction)}. `;
    }

    explanation += `\n\nKey takeaway: ${this.getBeginnerTakeaway(trade)}`;

    return explanation;
  }

  /**
   * Explain trade for intermediate users
   */
  private explainTradeForIntermediate(trade: Trade): string {
    const signalSummary = trade.signals
      .map((s) => `${s.botId}: ${s.direction} (${(s.strength * 100).toFixed(0)}%)`)
      .join(', ');

    let explanation = `**Entry:** ${trade.symbol} ${trade.direction} @ ${trade.entryPrice}\n`;
    explanation += `**Signals:** ${signalSummary}\n`;
    explanation += `**Regime:** ${trade.attribution.regimeAtEntry}\n`;

    if (trade.exitPrice) {
      const pnlPercent = ((trade.pnlPercent ?? 0) * 100).toFixed(2);
      const duration = this.formatDuration(trade.entryTime, trade.exitTime!);
      explanation += `\n**Exit:** @ ${trade.exitPrice}\n`;
      explanation += `**Result:** ${pnlPercent}% (${duration})\n`;
    }

    if (trade.riskEngineDecisions.length > 0) {
      explanation += `\n**Risk adjustments:**\n`;
      for (const decision of trade.riskEngineDecisions) {
        explanation += `- ${decision.action}: ${decision.reason}\n`;
      }
    }

    explanation += `\n**What to learn:** ${this.getIntermediateTakeaway(trade)}`;

    return explanation;
  }

  /**
   * Explain trade for pro users
   */
  private explainTradeForPro(trade: Trade): string {
    const signalDetails = trade.signals
      .map((s) => `${s.botId}[${s.direction}:${s.strength.toFixed(2)},conf:${s.confidence.toFixed(2)}]`)
      .join(' | ');

    const attribution = trade.attribution.contributingBots
      .map((b) => `${b.botId}:${(b.contribution * 100).toFixed(1)}%`)
      .join(', ');

    let explanation = `## ${trade.symbol} ${trade.direction.toUpperCase()}\n\n`;
    explanation += `| Metric | Value |\n|--------|-------|\n`;
    explanation += `| Entry | ${trade.entryPrice} |\n`;
    explanation += `| Size | ${trade.quantity} |\n`;
    explanation += `| Signals | ${signalDetails} |\n`;
    explanation += `| Attribution | ${attribution} |\n`;
    explanation += `| Regime | ${trade.attribution.regimeAtEntry} |\n`;
    explanation += `| Signal Strength | ${(trade.attribution.signalStrength * 100).toFixed(1)}% |\n`;

    if (trade.exitPrice) {
      const pnl = trade.pnl?.toFixed(2) ?? 'N/A';
      const pnlBps = ((trade.pnlPercent ?? 0) * 10000).toFixed(1);
      explanation += `| Exit | ${trade.exitPrice} |\n`;
      explanation += `| P&L | $${pnl} (${pnlBps} bps) |\n`;
    }

    if (trade.riskEngineDecisions.length > 0) {
      explanation += `\n### Risk Engine Interventions\n`;
      for (const d of trade.riskEngineDecisions) {
        explanation += `- **${d.type}** [${d.severity}]: ${d.action} - ${d.reason}\n`;
      }
    }

    return explanation;
  }

  /**
   * Explain trade for quants
   */
  private explainTradeForQuant(trade: Trade): string {
    const signalVector = trade.signals
      .map((s) => `${s.strength.toFixed(3)}`)
      .join(', ');

    let explanation = `Trade ID: ${trade.id}\n`;
    explanation += `Timestamp: ${trade.entryTime.toISOString()}\n\n`;

    explanation += `Position:\n`;
    explanation += `  Direction: ${trade.direction === 'long' ? 1 : -1}\n`;
    explanation += `  Entry: ${trade.entryPrice}\n`;
    explanation += `  Quantity: ${trade.quantity}\n`;
    explanation += `  Notional: ${(trade.entryPrice * trade.quantity).toFixed(2)}\n\n`;

    explanation += `Signal Analysis:\n`;
    explanation += `  Vector: [${signalVector}]\n`;
    explanation += `  Consensus: ${trade.attribution.signalStrength.toFixed(4)}\n`;
    explanation += `  Primary: ${trade.attribution.primaryBot}\n\n`;

    explanation += `Regime State:\n`;
    explanation += `  Classification: ${trade.attribution.regimeAtEntry}\n`;
    explanation += `  Synthesis Input: ${trade.attribution.synthesisEngineInput}\n\n`;

    if (trade.exitPrice && trade.exitTime) {
      const holdingPeriodMs = trade.exitTime.getTime() - trade.entryTime.getTime();
      const holdingPeriodHours = holdingPeriodMs / (1000 * 60 * 60);
      const returns = (trade.exitPrice - trade.entryPrice) / trade.entryPrice;
      const returnsBps = returns * 10000;

      explanation += `Exit Analysis:\n`;
      explanation += `  Price: ${trade.exitPrice}\n`;
      explanation += `  Returns: ${returnsBps.toFixed(2)} bps\n`;
      explanation += `  Holding Period: ${holdingPeriodHours.toFixed(2)} hours\n`;
      explanation += `  Realized P&L: ${trade.pnl?.toFixed(2)}\n`;
    }

    return explanation;
  }

  /**
   * Explain trade as a story
   */
  private explainTradeAsStory(trade: Trade): string {
    const marketMood = this.describeMarketMood(trade.attribution.regimeAtEntry);
    const triggerEvent = this.describeTriggerEvent(trade.signals);
    const action = trade.direction === 'long' ? 'go long' : 'take a short position';

    let story = `# The Story of Trade ${trade.id.slice(0, 8)}\n\n`;

    story += `## Setting the Scene\n`;
    story += `Picture this: It was ${trade.entryTime.toLocaleDateString()}, and the ${trade.symbol} market was ${marketMood}. `;
    story += `Our team of bots were watching closely, each with their own perspective on what might happen next.\n\n`;

    story += `## The Signal\n`;
    story += `Then, ${triggerEvent}. `;
    story += `After careful consideration, TIME decided to ${action} at ${trade.entryPrice}.\n\n`;

    if (trade.riskEngineDecisions.length > 0) {
      story += `## Behind the Scenes\n`;
      story += `Our guardian system was watching over the trade. `;
      for (const decision of trade.riskEngineDecisions) {
        story += `It noticed ${decision.reason.toLowerCase()} and decided to ${decision.action.toLowerCase()}. `;
      }
      story += `\n\n`;
    }

    if (trade.exitPrice) {
      const outcome = (trade.pnl ?? 0) >= 0 ? 'a victory' : 'a learning experience';
      story += `## The Resolution\n`;
      story += `As the trade unfolded, the market told its story. `;
      story += `In the end, we exited at ${trade.exitPrice}, marking ${outcome}. `;

      if ((trade.pnl ?? 0) >= 0) {
        story += `The team celebrated a successful read of the market.\n\n`;
      } else {
        story += `But every loss is a lesson, and TIME grew wiser.\n\n`;
      }
    }

    story += `## The Lesson\n`;
    story += this.getStoryMoral(trade);

    return story;
  }

  /**
   * Create a lesson from a trade
   */
  public createLesson(trade: Trade): Lesson {
    const lesson: Lesson = {
      id: uuidv4(),
      tradeId: trade.id,
      title: this.generateLessonTitle(trade),
      content: {
        beginner: this.explainTrade(trade, 'beginner'),
        intermediate: this.explainTrade(trade, 'intermediate'),
        pro: this.explainTrade(trade, 'pro'),
        quant: this.explainTrade(trade, 'quant'),
        story: this.explainTrade(trade, 'story'),
      },
      keyTakeaways: this.extractKeyInsights(trade),
      relatedConcepts: this.identifyRelatedConcepts(trade),
      createdAt: new Date(),
    };

    this.lessons.set(lesson.id, lesson);

    log.info('Lesson created', { lessonId: lesson.id, tradeId: trade.id });
    this.emit('lesson:created', lesson);

    return lesson;
  }

  // Helper methods

  private getBeginnerAnalogy(trade: Trade): string {
    if (trade.direction === 'long') {
      return 'buying a stock you think will go up in value, like buying a collectible that might become more valuable';
    }
    return 'betting that something will decrease in value, like selling an umbrella before a sunny forecast';
  }

  private getMainReason(signals: Signal[]): string {
    if (signals.length === 0) return 'our analysis suggested it was a good opportunity';

    const strongest = signals.reduce((a, b) => (a.strength > b.strength ? a : b));

    if (strongest.strength > 0.8) {
      return 'multiple indicators showed a strong opportunity';
    } else if (strongest.strength > 0.6) {
      return 'the market showed signs of a good setup';
    }
    return 'we saw a potential opportunity, though with some uncertainty';
  }

  private describeRiskActionSimply(decision: RiskDecision): string {
    switch (decision.action) {
      case 'reduce_size':
        return 'keeping our bet smaller to be safe';
      case 'reject':
        return 'stopping us from taking too much risk';
      case 'close_position':
        return 'closing the trade to protect our gains';
      case 'halt_bot':
        return 'pausing one of our trading helpers';
      default:
        return 'watching over the trade';
    }
  }

  private getBeginnerTakeaway(trade: Trade): string {
    if ((trade.pnl ?? 0) >= 0) {
      return 'Patience and following signals can lead to good results.';
    }
    return 'Not every trade wins, and that\'s okay. The key is managing risk.';
  }

  private getIntermediateTakeaway(trade: Trade): string {
    const regime = trade.attribution.regimeAtEntry;
    const botCount = trade.attribution.contributingBots.length;

    if (botCount > 2) {
      return `Multi-bot consensus in ${regime} regime can provide stronger signals.`;
    }
    return `Understanding ${regime} conditions helps in timing entries and exits.`;
  }

  private getStoryMoral(trade: Trade): string {
    if ((trade.pnl ?? 0) >= 0) {
      return 'When the signals align and risk is managed, opportunity follows.';
    }
    return 'Markets are unpredictable, but each trade teaches us something new. The loss today is the wisdom of tomorrow.';
  }

  private formatDuration(start: Date, end: Date): string {
    const ms = end.getTime() - start.getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private describeMarketMood(regime: MarketRegime): string {
    const moods: Record<MarketRegime, string> = {
      trending_up: 'riding a wave of optimism, prices climbing steadily',
      trending_down: 'facing headwinds, with prices drifting lower',
      ranging: 'in a holding pattern, moving sideways like a calm sea',
      high_volatility: 'wild and unpredictable, like a stormy ocean',
      low_volatility: 'quiet and peaceful, barely moving',
      event_driven: 'buzzing with news and anticipation',
      overnight_illiquid: 'sleepy and thin, with few traders active',
      sentiment_shift: 'changing its tune, as opinions shifted',
      unknown: 'mysterious, keeping its secrets close',
    };
    return moods[regime] ?? 'in an unusual state';
  }

  private describeTriggerEvent(signals: Signal[]): string {
    if (signals.length === 0) {
      return 'an opportunity emerged';
    }

    const strongSignals = signals.filter((s) => s.strength > 0.7);
    if (strongSignals.length > 1) {
      return 'multiple bots raised the alarm simultaneously, each seeing something promising';
    }
    if (strongSignals.length === 1) {
      return `one of our sharpest bots spotted something - a signal too clear to ignore`;
    }
    return 'a subtle pattern emerged that caught our attention';
  }

  private extractKeyInsights(trade: Trade): string[] {
    const insights: string[] = [];

    // Signal consensus insight
    if (trade.signals.length > 2) {
      const avgStrength =
        trade.signals.reduce((s, sig) => s + sig.strength, 0) / trade.signals.length;
      if (avgStrength > 0.7) {
        insights.push('Strong multi-bot consensus increases trade confidence');
      }
    }

    // Regime insight
    insights.push(`Trade executed in ${trade.attribution.regimeAtEntry} regime`);

    // Risk insight
    if (trade.riskEngineDecisions.length > 0) {
      insights.push('Risk engine modified this trade for protection');
    }

    // Outcome insight
    if (trade.pnl !== undefined) {
      if (trade.pnl > 0) {
        insights.push('Profitable trade - signals and timing aligned well');
      } else {
        insights.push('Loss trade - market moved against the thesis');
      }
    }

    return insights;
  }

  private extractLessons(trade: Trade): string[] {
    const lessons: string[] = [];

    // Always include regime lesson
    lessons.push(`How to trade in ${trade.attribution.regimeAtEntry} conditions`);

    // Bot-specific lessons
    if (trade.attribution.contributingBots.length > 0) {
      lessons.push('Understanding bot ensemble decisions');
    }

    // Risk lessons
    if (trade.riskEngineDecisions.length > 0) {
      lessons.push('Why risk management matters in live trading');
    }

    return lessons;
  }

  private generateLessonTitle(trade: Trade): string {
    const outcome = (trade.pnl ?? 0) >= 0 ? 'Winning' : 'Learning from';
    return `${outcome} ${trade.symbol} ${trade.direction} - ${trade.attribution.regimeAtEntry} Regime`;
  }

  private identifyRelatedConcepts(trade: Trade): string[] {
    const concepts: string[] = [];

    // Direction-related
    concepts.push(trade.direction === 'long' ? 'Going Long' : 'Short Selling');

    // Regime-related
    concepts.push(`${trade.attribution.regimeAtEntry} Market Conditions`);

    // Strategy-related
    if (trade.attribution.synthesisEngineInput) {
      concepts.push('Ensemble Strategies');
    }

    // Risk-related
    if (trade.riskEngineDecisions.length > 0) {
      concepts.push('Risk Management');
    }

    return concepts;
  }

  /**
   * Get a lesson by ID
   */
  public getLesson(lessonId: string): Lesson | undefined {
    return this.lessons.get(lessonId);
  }

  /**
   * Get all lessons
   */
  public getAllLessons(): Lesson[] {
    return Array.from(this.lessons.values());
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
        totalLessons: this.lessons.size,
        cachedExplanations: this.explanationCache.size,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Teaching Engine...');
    this.status = 'offline';
  }
}

// Export singleton
export const teachingEngine = new TeachingEngine();

export default TeachingEngine;

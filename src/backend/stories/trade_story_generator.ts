/**
 * Trade Story Generator
 *
 * Transforms raw trade data into compelling narratives that help users
 * understand what happened, why it happened, and what can be learned.
 *
 * Stories explain:
 * - Why a trade was entered
 * - What market conditions were present
 * - Which bots/strategies contributed
 * - How the trade evolved
 * - Why it was exited
 * - What lessons TIME learned
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';
import { TIMEGovernor } from '../core/time_governor';
import { TeachingEngine, ExplanationMode } from '../engines/teaching_engine';
import { RegimeDetector } from '../engines/regime_detector';
import { AttributionEngine } from '../engines/attribution_engine';
import {
  Trade,
  Signal,
  MarketRegime,
  Bot,
  TIMEComponent,
} from '../types';

const logger = createComponentLogger('TradeStoryGenerator');

// Story structure
interface TradeStory {
  id: string;
  tradeId: string;
  title: string;
  summary: string;
  sections: StorySection[];
  keyTakeaways: string[];
  lessonsLearned: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  generatedAt: Date;
  mode: ExplanationMode;
}

interface StorySection {
  title: string;
  content: string;
  icon?: string;
  highlight?: boolean;
}

// Trade context for story generation
interface TradeContext {
  trade: Trade;
  signals: Signal[];
  bots: Bot[];
  regime: MarketRegime;
  regimeConfidence: number;
  marketConditions: MarketConditions;
  attribution: TradeAttribution;
}

interface MarketConditions {
  trend: 'up' | 'down' | 'sideways';
  volatility: 'low' | 'medium' | 'high';
  volume: 'below_average' | 'average' | 'above_average';
  momentum: 'bullish' | 'bearish' | 'neutral';
  keyLevels: Array<{ type: string; price: number }>;
  recentNews?: string[];
}

interface TradeAttribution {
  primaryBot: { id: string; name: string; contribution: number };
  contributingBots: Array<{ id: string; name: string; contribution: number }>;
  strategy?: { id: string; name: string };
  signalStrength: number;
  confidenceLevel: number;
}

// Story templates
const STORY_TEMPLATES = {
  winning_trend: {
    title: 'Riding the Trend to Victory',
    intro: 'This trade captured a beautiful trend move that rewarded patience and conviction.',
    sections: ['setup', 'entry', 'management', 'exit', 'attribution', 'lessons'],
  },
  winning_reversal: {
    title: 'Catching the Turn',
    intro: 'Markets reversed and our analysis was ready, catching the move at the right moment.',
    sections: ['setup', 'entry', 'management', 'exit', 'attribution', 'lessons'],
  },
  winning_breakout: {
    title: 'Breaking Through',
    intro: 'A key level gave way and we were positioned to profit from the momentum.',
    sections: ['setup', 'entry', 'management', 'exit', 'attribution', 'lessons'],
  },
  losing_stopped: {
    title: 'Stopped Out: Risk Management in Action',
    intro: 'Not every trade works out. This one hit our stop, but that\'s exactly what stops are for.',
    sections: ['setup', 'entry', 'what_went_wrong', 'exit', 'attribution', 'lessons'],
  },
  losing_wrong_direction: {
    title: 'Reading the Market Wrong',
    intro: 'The market had other plans. Here\'s what we learned from getting it wrong.',
    sections: ['setup', 'entry', 'what_went_wrong', 'exit', 'attribution', 'lessons'],
  },
  breakeven: {
    title: 'A Draw: Living to Trade Another Day',
    intro: 'Sometimes the best outcome is breaking even. Capital preservation is victory.',
    sections: ['setup', 'entry', 'management', 'exit', 'attribution', 'lessons'],
  },
};

export class TradeStoryGenerator extends EventEmitter implements TIMEComponent {
  private static instance: TradeStoryGenerator | null = null;
  private stories: Map<string, TradeStory> = new Map();
  private teachingEngine: TeachingEngine;
  private regimeDetector: RegimeDetector;
  private attributionEngine: AttributionEngine;

  public readonly name = 'TradeStoryGenerator';
  public readonly version = '1.0.0';

  private constructor() {
    super();
    this.teachingEngine = TeachingEngine.getInstance();
    this.regimeDetector = RegimeDetector.getInstance();
    this.attributionEngine = AttributionEngine.getInstance();
  }

  public static getInstance(): TradeStoryGenerator {
    if (!TradeStoryGenerator.instance) {
      TradeStoryGenerator.instance = new TradeStoryGenerator();
    }
    return TradeStoryGenerator.instance;
  }

  public async initialize(): Promise<void> {
    logger.info('Initializing Trade Story Generator');

    // Register with TIME Governor
    const governor = TIMEGovernor.getInstance();
    governor.registerComponent(this);

    logger.info('Trade Story Generator initialized');
  }

  public getStatus(): { storiesGenerated: number; recentStories: number } {
    const oneDayAgo = new Date(Date.now() - 86400000);
    const recentStories = Array.from(this.stories.values()).filter(
      (s) => s.generatedAt > oneDayAgo
    ).length;

    return {
      storiesGenerated: this.stories.size,
      recentStories,
    };
  }

  /**
   * Generate a story for a trade
   */
  public async generateStory(
    context: TradeContext,
    mode: ExplanationMode = 'plain_english'
  ): Promise<TradeStory> {
    logger.info(`Generating story for trade ${context.trade.id} in ${mode} mode`);

    // Determine story template
    const template = this.selectTemplate(context);

    // Generate title
    const title = this.generateTitle(context, template);

    // Generate summary
    const summary = await this.generateSummary(context, mode);

    // Generate sections
    const sections = await this.generateSections(context, template, mode);

    // Generate key takeaways
    const keyTakeaways = this.generateKeyTakeaways(context);

    // Generate lessons learned
    const lessonsLearned = await this.generateLessons(context, mode);

    // Determine difficulty level
    const difficulty = this.determineDifficulty(context);

    const story: TradeStory = {
      id: `story-${context.trade.id}-${Date.now()}`,
      tradeId: context.trade.id,
      title,
      summary,
      sections,
      keyTakeaways,
      lessonsLearned,
      difficulty,
      generatedAt: new Date(),
      mode,
    };

    this.stories.set(story.id, story);
    this.emit('storyGenerated', { storyId: story.id, tradeId: context.trade.id });

    return story;
  }

  /**
   * Get a story by ID
   */
  public getStory(storyId: string): TradeStory | undefined {
    return this.stories.get(storyId);
  }

  /**
   * Get stories for a specific trade
   */
  public getStoriesForTrade(tradeId: string): TradeStory[] {
    return Array.from(this.stories.values()).filter((s) => s.tradeId === tradeId);
  }

  /**
   * Regenerate a story in a different mode
   */
  public async regenerateStory(
    storyId: string,
    newMode: ExplanationMode,
    context: TradeContext
  ): Promise<TradeStory> {
    return this.generateStory(context, newMode);
  }

  // Private methods

  private selectTemplate(context: TradeContext): typeof STORY_TEMPLATES[keyof typeof STORY_TEMPLATES] {
    const pnl = context.trade.pnl || 0;
    const pnlPercent = context.trade.exitPrice && context.trade.entryPrice
      ? ((context.trade.exitPrice - context.trade.entryPrice) / context.trade.entryPrice) * 100
      : 0;

    const isWinner = pnl > 0;
    const isLoser = pnl < 0;

    if (isWinner) {
      // Determine type of winning trade
      if (context.marketConditions.trend !== 'sideways') {
        return STORY_TEMPLATES.winning_trend;
      }
      if (context.signals.some((s) => s.metadata?.pattern?.includes('reversal'))) {
        return STORY_TEMPLATES.winning_reversal;
      }
      if (context.signals.some((s) => s.metadata?.pattern?.includes('breakout'))) {
        return STORY_TEMPLATES.winning_breakout;
      }
      return STORY_TEMPLATES.winning_trend;
    }

    if (isLoser) {
      // Determine type of loss
      if (Math.abs(pnlPercent) < 2) {
        return STORY_TEMPLATES.losing_stopped; // Likely hit stop
      }
      return STORY_TEMPLATES.losing_wrong_direction;
    }

    return STORY_TEMPLATES.breakeven;
  }

  private generateTitle(
    context: TradeContext,
    template: typeof STORY_TEMPLATES[keyof typeof STORY_TEMPLATES]
  ): string {
    const symbol = context.trade.symbol;
    const direction = context.trade.direction === 'long' ? 'Long' : 'Short';
    const pnl = context.trade.pnl || 0;
    const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;

    return `${symbol} ${direction}: ${template.title} (${pnlStr})`;
  }

  private async generateSummary(
    context: TradeContext,
    mode: ExplanationMode
  ): Promise<string> {
    const { trade, regime, attribution, marketConditions } = context;
    const pnl = trade.pnl || 0;
    const isWinner = pnl > 0;

    // Get explanation from teaching engine
    const topic = isWinner ? 'successful_trade' : 'losing_trade';
    const baseExplanation = await this.teachingEngine.explainConcept(topic, mode);

    // Build contextual summary
    if (mode === 'plain_english') {
      return this.generatePlainEnglishSummary(context);
    } else if (mode === 'story') {
      return this.generateNarrativeSummary(context);
    } else if (mode === 'quant') {
      return this.generateQuantSummary(context);
    }

    return this.generateIntermediateSummary(context);
  }

  private generatePlainEnglishSummary(context: TradeContext): string {
    const { trade, regime, attribution, marketConditions } = context;
    const pnl = trade.pnl || 0;
    const direction = trade.direction === 'long' ? 'bought' : 'sold short';
    const outcome = pnl > 0 ? 'made money' : pnl < 0 ? 'lost money' : 'broke even';

    return `We ${direction} ${trade.symbol} because our bots saw a good opportunity. ` +
      `The market was ${marketConditions.trend === 'up' ? 'going up' : marketConditions.trend === 'down' ? 'going down' : 'moving sideways'}. ` +
      `${attribution.primaryBot.name} was the main reason we took this trade. ` +
      `In the end, we ${outcome} - ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}.`;
  }

  private generateNarrativeSummary(context: TradeContext): string {
    const { trade, regime, attribution, marketConditions } = context;
    const pnl = trade.pnl || 0;
    const holdingPeriod = trade.exitTime && trade.entryTime
      ? Math.round((new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()) / 60000)
      : 0;

    const timeStr = holdingPeriod < 60
      ? `${holdingPeriod} minutes`
      : holdingPeriod < 1440
      ? `${Math.round(holdingPeriod / 60)} hours`
      : `${Math.round(holdingPeriod / 1440)} days`;

    if (pnl > 0) {
      return `It was a ${marketConditions.volatility} volatility ${regime} market when ${attribution.primaryBot.name} ` +
        `spotted the opportunity in ${trade.symbol}. The ${trade.direction} position was held for ${timeStr}, ` +
        `riding the move to a $${pnl.toFixed(2)} profit. A textbook execution that TIME will remember.`;
    } else if (pnl < 0) {
      return `The ${regime} market conditions looked promising when we entered ${trade.symbol}. ` +
        `But markets don't always cooperate. After ${timeStr}, we exited with a $${Math.abs(pnl).toFixed(2)} loss. ` +
        `Not every trade wins, but every trade teaches.`;
    }

    return `A battle fought to a draw. ${trade.symbol} tested our conviction for ${timeStr} ` +
      `before we exited at breakeven. Capital preserved, lessons learned.`;
  }

  private generateQuantSummary(context: TradeContext): string {
    const { trade, attribution, marketConditions } = context;
    const pnl = trade.pnl || 0;
    const pnlPercent = trade.exitPrice && trade.entryPrice
      ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100
      : 0;

    return `Trade: ${trade.symbol} ${trade.direction.toUpperCase()} | ` +
      `Entry: ${trade.entryPrice?.toFixed(4)} | Exit: ${trade.exitPrice?.toFixed(4)} | ` +
      `P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | ` +
      `Signal Strength: ${(attribution.signalStrength * 100).toFixed(0)}% | ` +
      `Confidence: ${(attribution.confidenceLevel * 100).toFixed(0)}%`;
  }

  private generateIntermediateSummary(context: TradeContext): string {
    const { trade, regime, attribution } = context;
    const pnl = trade.pnl || 0;

    return `This ${trade.direction} trade on ${trade.symbol} was initiated by ${attribution.primaryBot.name} ` +
      `during a ${regime} market regime. The trade ${pnl >= 0 ? 'resulted in a profit' : 'resulted in a loss'} ` +
      `of $${Math.abs(pnl).toFixed(2)} (${((pnl / (trade.entryPrice || 1)) * 100).toFixed(2)}%). ` +
      `Signal strength was ${(attribution.signalStrength * 100).toFixed(0)}% with ` +
      `${(attribution.confidenceLevel * 100).toFixed(0)}% confidence.`;
  }

  private async generateSections(
    context: TradeContext,
    template: typeof STORY_TEMPLATES[keyof typeof STORY_TEMPLATES],
    mode: ExplanationMode
  ): Promise<StorySection[]> {
    const sections: StorySection[] = [];

    for (const sectionType of template.sections) {
      const section = await this.generateSection(context, sectionType, mode);
      if (section) {
        sections.push(section);
      }
    }

    return sections;
  }

  private async generateSection(
    context: TradeContext,
    sectionType: string,
    mode: ExplanationMode
  ): Promise<StorySection | null> {
    switch (sectionType) {
      case 'setup':
        return this.generateSetupSection(context, mode);
      case 'entry':
        return this.generateEntrySection(context, mode);
      case 'management':
        return this.generateManagementSection(context, mode);
      case 'exit':
        return this.generateExitSection(context, mode);
      case 'attribution':
        return this.generateAttributionSection(context, mode);
      case 'lessons':
        return this.generateLessonsSection(context, mode);
      case 'what_went_wrong':
        return this.generateWhatWentWrongSection(context, mode);
      default:
        return null;
    }
  }

  private generateSetupSection(context: TradeContext, mode: ExplanationMode): StorySection {
    const { regime, regimeConfidence, marketConditions } = context;

    let content: string;

    if (mode === 'plain_english') {
      content = `Before this trade, the market was ${marketConditions.trend === 'up' ? 'trending higher' : marketConditions.trend === 'down' ? 'trending lower' : 'moving sideways'}. ` +
        `Volatility was ${marketConditions.volatility}, which means prices ${marketConditions.volatility === 'high' ? 'were swinging a lot' : 'were relatively calm'}. ` +
        `TIME detected a "${regime}" environment with ${Math.round(regimeConfidence * 100)}% confidence.`;
    } else if (mode === 'quant') {
      content = `Market Regime: ${regime} (${(regimeConfidence * 100).toFixed(1)}% conf.) | ` +
        `Trend: ${marketConditions.trend} | Volatility: ${marketConditions.volatility} | ` +
        `Volume: ${marketConditions.volume} | Momentum: ${marketConditions.momentum}`;
    } else {
      content = `The market was in a ${regime} regime with ${Math.round(regimeConfidence * 100)}% confidence. ` +
        `Trend direction was ${marketConditions.trend}, with ${marketConditions.volatility} volatility ` +
        `and ${marketConditions.volume.replace('_', ' ')} volume.`;
    }

    return {
      title: 'The Setup',
      content,
      icon: 'setup',
    };
  }

  private generateEntrySection(context: TradeContext, mode: ExplanationMode): StorySection {
    const { trade, signals, attribution } = context;
    const primarySignal = signals[0];

    let content: string;

    if (mode === 'plain_english') {
      content = `${attribution.primaryBot.name} saw an opportunity and signaled to go ${trade.direction}. ` +
        `We entered at $${trade.entryPrice?.toFixed(4)}. ` +
        `The signal was ${(attribution.signalStrength * 100).toFixed(0)}% strong.`;
    } else if (mode === 'story') {
      content = `The moment arrived at ${new Date(trade.entryTime).toLocaleTimeString()}. ` +
        `${attribution.primaryBot.name} pulled the trigger, opening a ${trade.direction} position at $${trade.entryPrice?.toFixed(4)}. ` +
        `${attribution.contributingBots.length > 0 ? `${attribution.contributingBots[0].name} and others confirmed the setup.` : ''}`;
    } else {
      content = `Entry: ${trade.direction.toUpperCase()} @ $${trade.entryPrice?.toFixed(4)} | ` +
        `Time: ${new Date(trade.entryTime).toISOString()} | ` +
        `Signal: ${(attribution.signalStrength * 100).toFixed(0)}% | ` +
        `Primary: ${attribution.primaryBot.name}`;
    }

    return {
      title: 'The Entry',
      content,
      icon: 'entry',
      highlight: true,
    };
  }

  private generateManagementSection(context: TradeContext, mode: ExplanationMode): StorySection {
    const { trade } = context;
    const holdingPeriod = trade.exitTime && trade.entryTime
      ? Math.round((new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()) / 60000)
      : 0;

    let content: string;

    if (mode === 'plain_english') {
      content = `We held the position for ${holdingPeriod} minutes, watching how the market moved. ` +
        `Our risk was managed with proper position sizing.`;
    } else {
      content = `Position held for ${holdingPeriod} minutes. ` +
        `Risk parameters maintained throughout the trade duration.`;
    }

    return {
      title: 'Trade Management',
      content,
      icon: 'management',
    };
  }

  private generateExitSection(context: TradeContext, mode: ExplanationMode): StorySection {
    const { trade } = context;
    const pnl = trade.pnl || 0;

    let content: string;

    if (mode === 'plain_english') {
      content = `We closed the trade at $${trade.exitPrice?.toFixed(4)}, ` +
        `${pnl >= 0 ? 'making' : 'losing'} $${Math.abs(pnl).toFixed(2)}.`;
    } else if (mode === 'story') {
      if (pnl > 0) {
        content = `Victory. The exit came at $${trade.exitPrice?.toFixed(4)}, locking in $${pnl.toFixed(2)} in profits. ` +
          `Another successful trade in the books.`;
      } else if (pnl < 0) {
        content = `The market had spoken. Exit at $${trade.exitPrice?.toFixed(4)} closed the chapter ` +
          `with a $${Math.abs(pnl).toFixed(2)} lesson paid.`;
      } else {
        content = `Flat. Exit at $${trade.exitPrice?.toFixed(4)} brought the trade to a breakeven close.`;
      }
    } else {
      content = `Exit: $${trade.exitPrice?.toFixed(4)} | P&L: $${pnl.toFixed(2)} ` +
        `(${((pnl / (trade.entryPrice || 1)) * 100).toFixed(2)}%)`;
    }

    return {
      title: 'The Exit',
      content,
      icon: 'exit',
      highlight: true,
    };
  }

  private generateAttributionSection(context: TradeContext, mode: ExplanationMode): StorySection {
    const { attribution } = context;

    let content: string;

    if (mode === 'plain_english') {
      content = `${attribution.primaryBot.name} was the main brain behind this trade ` +
        `(${Math.round(attribution.primaryBot.contribution * 100)}% contribution). ` +
        (attribution.contributingBots.length > 0
          ? `Also helping: ${attribution.contributingBots.map((b) => b.name).join(', ')}.`
          : '');
    } else {
      content = `Primary: ${attribution.primaryBot.name} (${Math.round(attribution.primaryBot.contribution * 100)}%) | ` +
        `Contributing: ${attribution.contributingBots.map((b) => `${b.name} (${Math.round(b.contribution * 100)}%)`).join(', ') || 'None'}`;
    }

    return {
      title: 'Who Made This Trade',
      content,
      icon: 'attribution',
    };
  }

  private generateLessonsSection(context: TradeContext, mode: ExplanationMode): StorySection {
    const lessons = this.generateKeyTakeaways(context);

    const content = lessons.map((lesson, i) => `${i + 1}. ${lesson}`).join('\n');

    return {
      title: 'Key Takeaways',
      content,
      icon: 'lessons',
    };
  }

  private generateWhatWentWrongSection(context: TradeContext, mode: ExplanationMode): StorySection {
    const { trade, marketConditions } = context;

    let content: string;

    if (mode === 'plain_english') {
      content = `The market moved against us. Even with good analysis, sometimes trades don't work out. ` +
        `That's why we use stop losses - to limit how much we can lose on any single trade.`;
    } else {
      content = `Market moved contrary to position. Analysis may have been correct but timing was off. ` +
        `Risk management prevented larger loss.`;
    }

    return {
      title: 'What Went Wrong',
      content,
      icon: 'warning',
    };
  }

  private generateKeyTakeaways(context: TradeContext): string[] {
    const takeaways: string[] = [];
    const { trade, regime, attribution, marketConditions } = context;
    const pnl = trade.pnl || 0;

    if (pnl > 0) {
      takeaways.push(`${regime} regimes can provide good ${trade.direction} opportunities`);
      takeaways.push(`${attribution.primaryBot.name} performed well in these conditions`);
      if (marketConditions.trend === 'up' && trade.direction === 'long') {
        takeaways.push('Trading with the trend improved odds of success');
      }
    } else if (pnl < 0) {
      takeaways.push('Not every trade wins - losses are part of trading');
      takeaways.push('Risk management (stop losses) prevented a larger loss');
      takeaways.push('Review market conditions before similar setups');
    } else {
      takeaways.push('Breakeven trades preserve capital');
      takeaways.push('Consider tighter targets in choppy markets');
    }

    return takeaways;
  }

  private async generateLessons(
    context: TradeContext,
    mode: ExplanationMode
  ): Promise<string[]> {
    const lessons: string[] = [];
    const { trade, regime, attribution } = context;
    const pnl = trade.pnl || 0;

    if (pnl > 0) {
      lessons.push(
        `TIME learned that ${attribution.primaryBot.name} performs well during ${regime} markets`
      );
      lessons.push(
        `Signal strength of ${Math.round(attribution.signalStrength * 100)}%+ tends to indicate higher probability setups`
      );
    } else {
      lessons.push(
        `TIME noted the market conditions to watch for in future similar setups`
      );
      lessons.push(
        `${attribution.primaryBot.name} may need adjustment for ${regime} regimes`
      );
    }

    return lessons;
  }

  private determineDifficulty(context: TradeContext): 'beginner' | 'intermediate' | 'advanced' {
    const { marketConditions, attribution } = context;

    // Simple trend trades = beginner
    if (marketConditions.trend !== 'sideways' && marketConditions.volatility !== 'high') {
      return 'beginner';
    }

    // Complex conditions or multiple contributors = advanced
    if (attribution.contributingBots.length > 2 || marketConditions.volatility === 'high') {
      return 'advanced';
    }

    return 'intermediate';
  }
}

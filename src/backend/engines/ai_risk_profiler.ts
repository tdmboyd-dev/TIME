/**
 * TIME AI Risk Profiler
 *
 * Dynamic, AI-powered risk profiling that adapts to:
 * - User behavior patterns
 * - Portfolio performance
 * - Market conditions
 * - Psychological signals
 * - Financial situation changes
 *
 * Unlike static risk questionnaires, this learns and evolves.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type RiskCategory =
  | 'ultra_conservative'
  | 'conservative'
  | 'moderate'
  | 'growth'
  | 'aggressive'
  | 'speculative';

export type InvestorType =
  | 'preserver'
  | 'accumulator'
  | 'independent'
  | 'follower'
  | 'active_trader';

export interface RiskProfile {
  id: string;
  userId: string;

  // Core Risk Metrics
  category: RiskCategory;
  score: number; // 0-100
  confidence: number; // AI confidence in this assessment

  // Detailed Breakdown
  dimensions: {
    lossCapacity: number; // Ability to absorb losses (financial)
    lossTolerance: number; // Willingness to accept losses (psychological)
    timeHorizon: number; // Investment time frame
    liquidityNeeds: number; // Need for quick access to funds
    knowledgeLevel: number; // Financial sophistication
    goalOrientation: number; // How goal-driven vs. return-driven
  };

  // Behavioral Indicators
  behavioralSignals: {
    panicSellTendency: number;
    fomoBuyTendency: number;
    overconfidenceBias: number;
    lossAversionStrength: number;
    recentBiasScore: number;
    anchoringTendency: number;
  };

  // Investor Persona
  investorType: InvestorType;
  investorTypeConfidence: number;

  // Recommended Allocations
  recommendedAllocation: {
    equities: number;
    fixedIncome: number;
    alternatives: number;
    crypto: number;
    cash: number;
  };

  // Risk Limits
  limits: {
    maxDrawdown: number;
    maxPositionSize: number;
    maxLeverage: number;
    maxCryptoExposure: number;
    maxSingleAsset: number;
  };

  // Adaptation History
  history: {
    date: Date;
    category: RiskCategory;
    score: number;
    trigger: string;
  }[];

  lastAssessed: Date;
  nextReviewDate: Date;
}

export interface BehaviorEvent {
  type: 'trade' | 'panic_action' | 'fomo_action' | 'login' | 'portfolio_check' | 'settings_change';
  timestamp: Date;
  details: Record<string, any>;
  emotionalSignal?: 'fear' | 'greed' | 'neutral' | 'panic' | 'euphoria';
}

export interface MarketContext {
  regime: 'bull' | 'bear' | 'volatile' | 'ranging';
  vix: number;
  btcDominance?: number;
  fearGreedIndex: number;
  recentDrawdown: number;
}

export interface QuestionnaireResponse {
  // Financial Situation
  annualIncome: 'under_50k' | '50k_100k' | '100k_250k' | '250k_500k' | 'over_500k';
  liquidNetWorth: 'under_25k' | '25k_100k' | '100k_500k' | '500k_1m' | 'over_1m';
  investableAssets: number;
  monthlyExpenses: number;
  emergencyFund: number; // months of expenses

  // Investment Goals
  primaryGoal: 'wealth_preservation' | 'income' | 'growth' | 'speculation' | 'retirement';
  timeHorizon: number; // years
  withdrawalExpectation: 'none' | 'occasional' | 'regular' | 'imminent';

  // Risk Questions
  marketDropReaction: 'sell_all' | 'sell_some' | 'hold' | 'buy_more' | 'buy_aggressively';
  lossTolerancePercent: number;
  sleepAtNight: number; // 1-10 scale
  previousInvestingExperience: number; // years

  // Psychological
  regretIntensity: 'extreme' | 'high' | 'moderate' | 'low' | 'none';
  decisionStyle: 'emotional' | 'analytical' | 'mixed' | 'gut_feeling';
}

// ============================================================================
// AI Risk Profiler Engine
// ============================================================================

export class AIRiskProfiler extends EventEmitter {
  private profiles: Map<string, RiskProfile> = new Map();
  private behaviorLogs: Map<string, BehaviorEvent[]> = new Map();
  private currentMarketContext: MarketContext = {
    regime: 'ranging',
    vix: 18,
    fearGreedIndex: 50,
    recentDrawdown: 0,
  };

  // Risk category thresholds
  private readonly CATEGORY_THRESHOLDS: Record<RiskCategory, { min: number; max: number }> = {
    ultra_conservative: { min: 0, max: 15 },
    conservative: { min: 15, max: 35 },
    moderate: { min: 35, max: 55 },
    growth: { min: 55, max: 75 },
    aggressive: { min: 75, max: 90 },
    speculative: { min: 90, max: 100 },
  };

  constructor() {
    super();
    this.startMarketContextUpdates();
    console.log('[AIRiskProfiler] Initialized - Dynamic risk profiling active');
  }

  // ============================================================================
  // Initial Assessment
  // ============================================================================

  /**
   * Create initial risk profile from questionnaire
   */
  async createProfile(userId: string, responses: QuestionnaireResponse): Promise<RiskProfile> {
    console.log(`[AIRiskProfiler] Creating profile for user ${userId}`);

    // Calculate base dimensions
    const dimensions = this.calculateDimensions(responses);

    // Calculate overall risk score
    const score = this.calculateRiskScore(dimensions, responses);

    // Determine category
    const category = this.scoreToCategory(score);

    // Determine investor type
    const { type: investorType, confidence: investorTypeConfidence } = this.determineInvestorType(responses, dimensions);

    // Generate recommended allocation
    const recommendedAllocation = this.generateAllocation(category, investorType);

    // Set risk limits
    const limits = this.calculateLimits(category, responses);

    // Initialize behavioral signals (neutral starting point)
    const behavioralSignals = {
      panicSellTendency: 0.5,
      fomoBuyTendency: 0.5,
      overconfidenceBias: 0.5,
      lossAversionStrength: this.calculateLossAversion(responses),
      recentBiasScore: 0.5,
      anchoringTendency: 0.5,
    };

    const profile: RiskProfile = {
      id: `RISK_${Date.now()}`,
      userId,
      category,
      score,
      confidence: 0.7, // Initial confidence (will increase with behavior data)
      dimensions,
      behavioralSignals,
      investorType,
      investorTypeConfidence,
      recommendedAllocation,
      limits,
      history: [{
        date: new Date(),
        category,
        score,
        trigger: 'initial_assessment',
      }],
      lastAssessed: new Date(),
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };

    this.profiles.set(userId, profile);
    this.behaviorLogs.set(userId, []);

    this.emit('profile:created', profile);
    return profile;
  }

  private calculateDimensions(responses: QuestionnaireResponse): RiskProfile['dimensions'] {
    // Loss Capacity (financial ability to absorb losses)
    let lossCapacity = 50;
    const incomeMap = { under_50k: 20, '50k_100k': 40, '100k_250k': 60, '250k_500k': 80, over_500k: 95 };
    const worthMap = { under_25k: 15, '25k_100k': 35, '100k_500k': 55, '500k_1m': 75, over_1m: 90 };
    lossCapacity = (incomeMap[responses.annualIncome] + worthMap[responses.liquidNetWorth]) / 2;

    if (responses.emergencyFund < 3) lossCapacity -= 20;
    else if (responses.emergencyFund >= 6) lossCapacity += 10;

    // Loss Tolerance (psychological)
    let lossTolerance = responses.lossTolerancePercent * 2;
    const reactionMap = { sell_all: 10, sell_some: 30, hold: 50, buy_more: 70, buy_aggressively: 90 };
    lossTolerance = (lossTolerance + reactionMap[responses.marketDropReaction]) / 2;
    lossTolerance = Math.min(Math.max(lossTolerance, 0), 100);

    // Time Horizon
    let timeHorizon = Math.min(responses.timeHorizon * 5, 100);
    if (responses.withdrawalExpectation === 'imminent') timeHorizon *= 0.5;
    else if (responses.withdrawalExpectation === 'none') timeHorizon *= 1.2;

    // Liquidity Needs (inverse scale - higher = lower need)
    let liquidityNeeds = 50;
    if (responses.withdrawalExpectation === 'imminent') liquidityNeeds = 20;
    else if (responses.withdrawalExpectation === 'regular') liquidityNeeds = 40;
    else if (responses.withdrawalExpectation === 'occasional') liquidityNeeds = 60;
    else liquidityNeeds = 80;

    // Knowledge Level
    let knowledgeLevel = Math.min(responses.previousInvestingExperience * 10, 100);
    if (responses.decisionStyle === 'analytical') knowledgeLevel += 15;
    knowledgeLevel = Math.min(knowledgeLevel, 100);

    // Goal Orientation
    let goalOrientation = 50;
    const goalMap = {
      wealth_preservation: 20,
      income: 40,
      growth: 60,
      retirement: 50,
      speculation: 80,
    };
    goalOrientation = goalMap[responses.primaryGoal];

    return {
      lossCapacity: Math.round(lossCapacity),
      lossTolerance: Math.round(lossTolerance),
      timeHorizon: Math.round(timeHorizon),
      liquidityNeeds: Math.round(liquidityNeeds),
      knowledgeLevel: Math.round(knowledgeLevel),
      goalOrientation: Math.round(goalOrientation),
    };
  }

  private calculateRiskScore(dimensions: RiskProfile['dimensions'], responses: QuestionnaireResponse): number {
    // Weighted average of dimensions
    const weights = {
      lossCapacity: 0.25,
      lossTolerance: 0.25,
      timeHorizon: 0.20,
      liquidityNeeds: 0.10,
      knowledgeLevel: 0.10,
      goalOrientation: 0.10,
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += dimensions[key as keyof typeof dimensions] * weight;
    }

    // Adjustments
    if (responses.sleepAtNight < 5) score *= 0.8; // Anxious = reduce risk
    if (responses.regretIntensity === 'extreme') score *= 0.7;

    return Math.round(Math.min(Math.max(score, 0), 100));
  }

  private scoreToCategory(score: number): RiskCategory {
    for (const [category, range] of Object.entries(this.CATEGORY_THRESHOLDS)) {
      if (score >= range.min && score < range.max) {
        return category as RiskCategory;
      }
    }
    return 'moderate';
  }

  private determineInvestorType(
    responses: QuestionnaireResponse,
    dimensions: RiskProfile['dimensions']
  ): { type: InvestorType; confidence: number } {
    // Preserver: Focus on not losing money
    if (responses.primaryGoal === 'wealth_preservation' && dimensions.lossTolerance < 30) {
      return { type: 'preserver', confidence: 0.85 };
    }

    // Active Trader: High knowledge, short-term focus
    if (dimensions.knowledgeLevel > 70 && responses.timeHorizon < 3) {
      return { type: 'active_trader', confidence: 0.80 };
    }

    // Follower: Emotional decision-making, looks to others
    if (responses.decisionStyle === 'emotional' || responses.decisionStyle === 'gut_feeling') {
      return { type: 'follower', confidence: 0.75 };
    }

    // Independent: Analytical, doesn't follow trends
    if (responses.decisionStyle === 'analytical' && dimensions.knowledgeLevel > 60) {
      return { type: 'independent', confidence: 0.80 };
    }

    // Default: Accumulator
    return { type: 'accumulator', confidence: 0.70 };
  }

  private generateAllocation(category: RiskCategory, investorType: InvestorType): RiskProfile['recommendedAllocation'] {
    const baseAllocations: Record<RiskCategory, RiskProfile['recommendedAllocation']> = {
      ultra_conservative: { equities: 10, fixedIncome: 70, alternatives: 5, crypto: 0, cash: 15 },
      conservative: { equities: 30, fixedIncome: 50, alternatives: 10, crypto: 0, cash: 10 },
      moderate: { equities: 50, fixedIncome: 30, alternatives: 10, crypto: 5, cash: 5 },
      growth: { equities: 70, fixedIncome: 15, alternatives: 5, crypto: 8, cash: 2 },
      aggressive: { equities: 80, fixedIncome: 5, alternatives: 3, crypto: 10, cash: 2 },
      speculative: { equities: 70, fixedIncome: 0, alternatives: 5, crypto: 20, cash: 5 },
    };

    const allocation = { ...baseAllocations[category] };

    // Adjust based on investor type
    if (investorType === 'active_trader') {
      allocation.cash += 5;
      allocation.equities -= 5;
    } else if (investorType === 'preserver') {
      allocation.fixedIncome += 10;
      allocation.equities -= 10;
    }

    return allocation;
  }

  private calculateLimits(category: RiskCategory, responses: QuestionnaireResponse): RiskProfile['limits'] {
    const baseLimits: Record<RiskCategory, RiskProfile['limits']> = {
      ultra_conservative: {
        maxDrawdown: 5,
        maxPositionSize: 5,
        maxLeverage: 1,
        maxCryptoExposure: 0,
        maxSingleAsset: 10,
      },
      conservative: {
        maxDrawdown: 10,
        maxPositionSize: 10,
        maxLeverage: 1,
        maxCryptoExposure: 2,
        maxSingleAsset: 15,
      },
      moderate: {
        maxDrawdown: 20,
        maxPositionSize: 15,
        maxLeverage: 1.5,
        maxCryptoExposure: 10,
        maxSingleAsset: 20,
      },
      growth: {
        maxDrawdown: 30,
        maxPositionSize: 20,
        maxLeverage: 2,
        maxCryptoExposure: 15,
        maxSingleAsset: 25,
      },
      aggressive: {
        maxDrawdown: 40,
        maxPositionSize: 30,
        maxLeverage: 3,
        maxCryptoExposure: 20,
        maxSingleAsset: 30,
      },
      speculative: {
        maxDrawdown: 50,
        maxPositionSize: 40,
        maxLeverage: 5,
        maxCryptoExposure: 40,
        maxSingleAsset: 40,
      },
    };

    return baseLimits[category];
  }

  private calculateLossAversion(responses: QuestionnaireResponse): number {
    let aversion = 0.5;

    if (responses.marketDropReaction === 'sell_all') aversion = 0.9;
    else if (responses.marketDropReaction === 'sell_some') aversion = 0.7;
    else if (responses.marketDropReaction === 'buy_more') aversion = 0.3;
    else if (responses.marketDropReaction === 'buy_aggressively') aversion = 0.2;

    if (responses.regretIntensity === 'extreme') aversion += 0.2;
    else if (responses.regretIntensity === 'high') aversion += 0.1;

    return Math.min(Math.max(aversion, 0), 1);
  }

  // ============================================================================
  // Behavioral Learning
  // ============================================================================

  /**
   * Record user behavior for AI learning
   */
  recordBehavior(userId: string, event: Omit<BehaviorEvent, 'timestamp'>): void {
    const logs = this.behaviorLogs.get(userId) || [];
    const fullEvent: BehaviorEvent = {
      ...event,
      timestamp: new Date(),
    };

    logs.push(fullEvent);

    // Keep last 1000 events
    if (logs.length > 1000) {
      logs.shift();
    }

    this.behaviorLogs.set(userId, logs);

    // Trigger real-time analysis for significant events
    if (event.type === 'panic_action' || event.type === 'fomo_action') {
      this.analyzeBehaviorImpact(userId, fullEvent);
    }
  }

  private async analyzeBehaviorImpact(userId: string, event: BehaviorEvent): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) return;

    let needsUpdate = false;

    if (event.type === 'panic_action') {
      profile.behavioralSignals.panicSellTendency = Math.min(
        profile.behavioralSignals.panicSellTendency + 0.1,
        1
      );
      profile.behavioralSignals.lossAversionStrength = Math.min(
        profile.behavioralSignals.lossAversionStrength + 0.05,
        1
      );
      needsUpdate = true;
    }

    if (event.type === 'fomo_action') {
      profile.behavioralSignals.fomoBuyTendency = Math.min(
        profile.behavioralSignals.fomoBuyTendency + 0.1,
        1
      );
      profile.behavioralSignals.overconfidenceBias = Math.min(
        profile.behavioralSignals.overconfidenceBias + 0.05,
        1
      );
      needsUpdate = true;
    }

    if (needsUpdate) {
      // Recalculate risk score based on behavioral signals
      const behaviorAdjustment = this.calculateBehavioralAdjustment(profile.behavioralSignals);
      const newScore = Math.round(profile.score + behaviorAdjustment);
      const newCategory = this.scoreToCategory(newScore);

      if (newCategory !== profile.category) {
        profile.score = newScore;
        profile.category = newCategory;
        profile.history.push({
          date: new Date(),
          category: newCategory,
          score: newScore,
          trigger: `behavioral_signal:${event.type}`,
        });

        // Update allocation and limits
        profile.recommendedAllocation = this.generateAllocation(newCategory, profile.investorType);
        profile.limits = this.calculateLimits(newCategory, {} as QuestionnaireResponse);

        this.emit('profile:adjusted', {
          userId,
          oldCategory: profile.category,
          newCategory,
          trigger: event.type,
        });
      }

      profile.confidence = Math.min(profile.confidence + 0.02, 0.95);
    }
  }

  private calculateBehavioralAdjustment(signals: RiskProfile['behavioralSignals']): number {
    let adjustment = 0;

    // High panic tendency = reduce risk
    if (signals.panicSellTendency > 0.7) {
      adjustment -= (signals.panicSellTendency - 0.5) * 20;
    }

    // High FOMO = they might take more risk than appropriate
    if (signals.fomoBuyTendency > 0.7) {
      adjustment -= (signals.fomoBuyTendency - 0.5) * 10; // Reduce their perceived capacity
    }

    // High overconfidence = reduce risk (protect them from themselves)
    if (signals.overconfidenceBias > 0.7) {
      adjustment -= (signals.overconfidenceBias - 0.5) * 15;
    }

    return adjustment;
  }

  // ============================================================================
  // Market Context Adaptation
  // ============================================================================

  /**
   * Update market context for risk adjustments
   */
  updateMarketContext(context: Partial<MarketContext>): void {
    this.currentMarketContext = { ...this.currentMarketContext, ...context };

    // Check if any profiles need adjustment based on market
    for (const [userId, profile] of this.profiles) {
      this.checkMarketAdaptation(userId, profile);
    }
  }

  private checkMarketAdaptation(userId: string, profile: RiskProfile): void {
    // In extreme market conditions, temporarily adjust risk
    if (this.currentMarketContext.vix > 35 || this.currentMarketContext.fearGreedIndex < 20) {
      // High fear environment
      this.emit('risk:market_warning', {
        userId,
        warning: 'High market volatility detected. Consider reducing exposure.',
        suggestedAction: 'reduce_crypto_exposure',
        temporaryLimits: {
          maxCryptoExposure: profile.limits.maxCryptoExposure * 0.5,
          maxLeverage: 1,
        },
      });
    }

    if (this.currentMarketContext.fearGreedIndex > 80) {
      // Extreme greed
      this.emit('risk:market_warning', {
        userId,
        warning: 'Market showing signs of extreme greed. Be cautious of FOMO.',
        suggestedAction: 'hold_off_new_positions',
      });
    }
  }

  private startMarketContextUpdates(): void {
    // Simulate market context updates
    setInterval(() => {
      // Update VIX
      this.currentMarketContext.vix = 15 + Math.random() * 20;

      // Update Fear & Greed
      this.currentMarketContext.fearGreedIndex = Math.floor(30 + Math.random() * 40);

      // Determine regime
      if (this.currentMarketContext.vix > 30) {
        this.currentMarketContext.regime = 'volatile';
      } else if (this.currentMarketContext.fearGreedIndex > 70) {
        this.currentMarketContext.regime = 'bull';
      } else if (this.currentMarketContext.fearGreedIndex < 30) {
        this.currentMarketContext.regime = 'bear';
      } else {
        this.currentMarketContext.regime = 'ranging';
      }
    }, 60000); // Update every minute
  }

  // ============================================================================
  // Profile Access & Management
  // ============================================================================

  /**
   * Get user's risk profile
   */
  getProfile(userId: string): RiskProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * Get risk-adjusted recommendations
   */
  getRecommendations(userId: string): {
    allocation: RiskProfile['recommendedAllocation'];
    limits: RiskProfile['limits'];
    warnings: string[];
    marketContext: MarketContext;
  } | null {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    const warnings: string[] = [];

    // Add warnings based on behavioral signals
    if (profile.behavioralSignals.panicSellTendency > 0.7) {
      warnings.push('Your trading history shows tendency to panic sell. Consider setting automated stop-losses to remove emotion.');
    }
    if (profile.behavioralSignals.fomoBuyTendency > 0.7) {
      warnings.push('You may be prone to FOMO buying. Consider waiting 24 hours before making large purchases.');
    }
    if (profile.behavioralSignals.overconfidenceBias > 0.7) {
      warnings.push('Your position sizes may be larger than appropriate for your risk tolerance.');
    }

    // Market-based warnings
    if (this.currentMarketContext.vix > 30) {
      warnings.push('Market volatility is elevated. Consider reducing position sizes.');
    }

    return {
      allocation: profile.recommendedAllocation,
      limits: profile.limits,
      warnings,
      marketContext: this.currentMarketContext,
    };
  }

  /**
   * Get simplified risk summary for UI
   */
  getRiskSummary(userId: string): {
    category: string;
    score: number;
    emoji: string;
    description: string;
    color: string;
  } | null {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    const summaries: Record<RiskCategory, { emoji: string; description: string; color: string }> = {
      ultra_conservative: {
        emoji: '🛡️',
        description: 'Safety First - Focused on preserving capital with minimal risk',
        color: '#2196f3',
      },
      conservative: {
        emoji: '🌱',
        description: 'Steady Growth - Balanced approach favoring stability',
        color: '#4caf50',
      },
      moderate: {
        emoji: '⚖️',
        description: 'Balanced Investor - Equal focus on growth and protection',
        color: '#ff9800',
      },
      growth: {
        emoji: '📈',
        description: 'Growth Seeker - Comfortable with volatility for higher returns',
        color: '#9c27b0',
      },
      aggressive: {
        emoji: '🚀',
        description: 'High Conviction - Pursuing maximum growth, accepting drawdowns',
        color: '#f44336',
      },
      speculative: {
        emoji: '🎲',
        description: 'High Risk Taker - Seeking outsized returns, aware of potential losses',
        color: '#e91e63',
      },
    };

    const summary = summaries[profile.category];

    return {
      category: profile.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      score: profile.score,
      ...summary,
    };
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const aiRiskProfiler = new AIRiskProfiler();
export default aiRiskProfiler;

/**
 * TIME Learning Velocity Tracker
 *
 * NEVER-BEFORE-SEEN INVENTION
 *
 * Tracks how fast TIME is learning and improving.
 * Like a speedometer for intelligence growth.
 *
 * Key Metrics:
 * - Learning Rate: How fast new patterns are discovered
 * - Absorption Rate: How quickly bots are integrated
 * - Evolution Velocity: Speed of strategy improvements
 * - Knowledge Density: Richness of learned insights
 * - Adaptation Speed: How fast TIME adjusts to regime changes
 * - Wisdom Accumulation: Long-term knowledge retention
 */

import { EventEmitter } from 'events';

// ============================================================
// TYPES
// ============================================================

export interface LearningEvent {
  id: string;
  type: 'pattern_discovered' | 'bot_absorbed' | 'strategy_evolved' | 'insight_generated' |
        'regime_learned' | 'mistake_recorded' | 'success_cataloged';
  source: string;
  description: string;
  impact: number; // 0-1
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface VelocityMetrics {
  learningRate: number; // Events per hour
  learningAcceleration: number; // Change in learning rate
  absorptionRate: number; // Bots absorbed per day
  evolutionVelocity: number; // Strategy improvements per day
  knowledgeDensity: number; // Insights per category
  adaptationSpeed: number; // Minutes to adjust to new regime
  wisdomScore: number; // Overall accumulated knowledge
  momentum: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
}

export interface LearningMilestone {
  id: string;
  name: string;
  description: string;
  category: 'patterns' | 'bots' | 'strategies' | 'insights' | 'regimes' | 'trades';
  threshold: number;
  achieved: boolean;
  achievedAt?: Date;
  progress: number;
}

export interface KnowledgeCategory {
  name: string;
  totalLearnings: number;
  recentLearnings: number; // Last 24h
  qualityScore: number; // 0-100
  lastUpdated: Date;
  topInsights: string[];
}

export interface LearningTrend {
  period: '1h' | '6h' | '24h' | '7d' | '30d';
  startValue: number;
  endValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AdaptationEvent {
  id: string;
  fromRegime: string;
  toRegime: string;
  adaptationTimeMs: number;
  strategiesAdjusted: number;
  botsReweighted: number;
  success: boolean;
  timestamp: Date;
}

// ============================================================
// LEARNING VELOCITY TRACKER
// ============================================================

export class LearningVelocityTracker extends EventEmitter {
  public readonly name = 'LearningVelocityTracker';
  public readonly version = '1.0.0';

  private learningEvents: LearningEvent[] = [];
  private adaptationEvents: AdaptationEvent[] = [];
  private categories: Map<string, KnowledgeCategory> = new Map();
  private milestones: LearningMilestone[] = [];
  private hourlySnapshots: { timestamp: Date; metrics: VelocityMetrics }[] = [];

  private config = {
    maxEvents: 100000,
    snapshotIntervalMs: 3600000, // 1 hour
    acceleratingThreshold: 1.1, // 10% increase
    deceleratingThreshold: 0.9, // 10% decrease
  };

  private snapshotTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeCategories();
    this.initializeMilestones();
    this.startSnapshotTimer();
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  private initializeCategories(): void {
    const categoryNames = [
      'market_patterns',
      'bot_behaviors',
      'regime_transitions',
      'risk_events',
      'winning_conditions',
      'losing_conditions',
      'indicator_correlations',
      'timing_patterns',
      'volatility_patterns',
      'sentiment_signals',
    ];

    categoryNames.forEach(name => {
      this.categories.set(name, {
        name,
        totalLearnings: 0,
        recentLearnings: 0,
        qualityScore: 0,
        lastUpdated: new Date(),
        topInsights: [],
      });
    });
  }

  private initializeMilestones(): void {
    this.milestones = [
      // Pattern milestones
      { id: 'patterns_10', name: 'Pattern Seeker', description: 'Discover 10 market patterns', category: 'patterns', threshold: 10, achieved: false, progress: 0 },
      { id: 'patterns_50', name: 'Pattern Master', description: 'Discover 50 market patterns', category: 'patterns', threshold: 50, achieved: false, progress: 0 },
      { id: 'patterns_100', name: 'Pattern Oracle', description: 'Discover 100 market patterns', category: 'patterns', threshold: 100, achieved: false, progress: 0 },

      // Bot milestones
      { id: 'bots_5', name: 'Bot Collector', description: 'Absorb 5 bots', category: 'bots', threshold: 5, achieved: false, progress: 0 },
      { id: 'bots_25', name: 'Bot Commander', description: 'Absorb 25 bots', category: 'bots', threshold: 25, achieved: false, progress: 0 },
      { id: 'bots_100', name: 'Bot Emperor', description: 'Absorb 100 bots', category: 'bots', threshold: 100, achieved: false, progress: 0 },

      // Strategy milestones
      { id: 'strategies_5', name: 'Strategy Crafter', description: 'Evolve 5 strategies', category: 'strategies', threshold: 5, achieved: false, progress: 0 },
      { id: 'strategies_20', name: 'Strategy Architect', description: 'Evolve 20 strategies', category: 'strategies', threshold: 20, achieved: false, progress: 0 },
      { id: 'strategies_50', name: 'Strategy Grandmaster', description: 'Evolve 50 strategies', category: 'strategies', threshold: 50, achieved: false, progress: 0 },

      // Insight milestones
      { id: 'insights_100', name: 'Insight Generator', description: 'Generate 100 insights', category: 'insights', threshold: 100, achieved: false, progress: 0 },
      { id: 'insights_500', name: 'Insight Engine', description: 'Generate 500 insights', category: 'insights', threshold: 500, achieved: false, progress: 0 },
      { id: 'insights_1000', name: 'Insight Oracle', description: 'Generate 1000 insights', category: 'insights', threshold: 1000, achieved: false, progress: 0 },

      // Regime milestones
      { id: 'regimes_all', name: 'Regime Master', description: 'Successfully adapt to all regime types', category: 'regimes', threshold: 7, achieved: false, progress: 0 },

      // Trade milestones
      { id: 'trades_1000', name: 'Trade Veteran', description: 'Learn from 1000 trades', category: 'trades', threshold: 1000, achieved: false, progress: 0 },
      { id: 'trades_10000', name: 'Trade Legend', description: 'Learn from 10000 trades', category: 'trades', threshold: 10000, achieved: false, progress: 0 },
    ];
  }

  private startSnapshotTimer(): void {
    this.snapshotTimer = setInterval(() => {
      this.takeSnapshot();
    }, this.config.snapshotIntervalMs);
  }

  // ============================================================
  // EVENT RECORDING
  // ============================================================

  /**
   * Record a learning event
   */
  recordLearning(event: Omit<LearningEvent, 'id' | 'timestamp'>): void {
    const fullEvent: LearningEvent = {
      ...event,
      id: `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.learningEvents.push(fullEvent);

    // Update category
    this.updateCategory(fullEvent);

    // Check milestones
    this.checkMilestones(fullEvent);

    // Trim history
    if (this.learningEvents.length > this.config.maxEvents) {
      this.learningEvents = this.learningEvents.slice(-this.config.maxEvents / 2);
    }

    this.emit('learning:recorded', fullEvent);
  }

  /**
   * Record an adaptation event
   */
  recordAdaptation(event: Omit<AdaptationEvent, 'id' | 'timestamp'>): void {
    const fullEvent: AdaptationEvent = {
      ...event,
      id: `adapt_${Date.now()}`,
      timestamp: new Date(),
    };

    this.adaptationEvents.push(fullEvent);

    // Record as learning event
    this.recordLearning({
      type: 'regime_learned',
      source: 'RegimeDetector',
      description: `Adapted from ${event.fromRegime} to ${event.toRegime} in ${event.adaptationTimeMs}ms`,
      impact: event.success ? 0.8 : 0.3,
      metadata: event,
    });

    this.emit('adaptation:recorded', fullEvent);
  }

  // ============================================================
  // CATEGORY MANAGEMENT
  // ============================================================

  private updateCategory(event: LearningEvent): void {
    // Determine category based on event type
    let categoryName: string;

    switch (event.type) {
      case 'pattern_discovered':
        categoryName = 'market_patterns';
        break;
      case 'bot_absorbed':
        categoryName = 'bot_behaviors';
        break;
      case 'regime_learned':
        categoryName = 'regime_transitions';
        break;
      case 'mistake_recorded':
        categoryName = 'losing_conditions';
        break;
      case 'success_cataloged':
        categoryName = 'winning_conditions';
        break;
      default:
        categoryName = 'market_patterns';
    }

    const category = this.categories.get(categoryName);
    if (category) {
      category.totalLearnings++;
      category.recentLearnings++;
      category.qualityScore = Math.min(100, category.qualityScore + event.impact * 5);
      category.lastUpdated = new Date();

      // Update top insights
      if (event.impact > 0.7 && category.topInsights.length < 10) {
        category.topInsights.push(event.description);
      }

      this.categories.set(categoryName, category);
    }
  }

  // ============================================================
  // MILESTONE TRACKING
  // ============================================================

  private checkMilestones(event: LearningEvent): void {
    // Update progress for relevant milestones
    this.milestones.forEach(milestone => {
      if (milestone.achieved) return;

      let shouldIncrement = false;

      switch (milestone.category) {
        case 'patterns':
          shouldIncrement = event.type === 'pattern_discovered';
          break;
        case 'bots':
          shouldIncrement = event.type === 'bot_absorbed';
          break;
        case 'strategies':
          shouldIncrement = event.type === 'strategy_evolved';
          break;
        case 'insights':
          shouldIncrement = event.type === 'insight_generated';
          break;
        case 'regimes':
          shouldIncrement = event.type === 'regime_learned';
          break;
        case 'trades':
          shouldIncrement = event.type === 'success_cataloged' || event.type === 'mistake_recorded';
          break;
      }

      if (shouldIncrement) {
        milestone.progress++;

        if (milestone.progress >= milestone.threshold && !milestone.achieved) {
          milestone.achieved = true;
          milestone.achievedAt = new Date();

          this.emit('milestone:achieved', milestone);
        }
      }
    });
  }

  // ============================================================
  // VELOCITY CALCULATIONS
  // ============================================================

  /**
   * Calculate current velocity metrics
   */
  calculateVelocity(): VelocityMetrics {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    // Learning rate (events per hour)
    const recentEvents = this.learningEvents.filter(e => e.timestamp.getTime() > oneHourAgo);
    const learningRate = recentEvents.length;

    // Learning acceleration
    const previousHour = this.learningEvents.filter(
      e => e.timestamp.getTime() > oneHourAgo - 3600000 && e.timestamp.getTime() <= oneHourAgo
    );
    const learningAcceleration = previousHour.length > 0
      ? (learningRate - previousHour.length) / previousHour.length
      : 0;

    // Absorption rate (bots per day)
    const dailyAbsorptions = this.learningEvents.filter(
      e => e.timestamp.getTime() > oneDayAgo && e.type === 'bot_absorbed'
    ).length;

    // Evolution velocity (strategies per day)
    const dailyEvolutions = this.learningEvents.filter(
      e => e.timestamp.getTime() > oneDayAgo && e.type === 'strategy_evolved'
    ).length;

    // Knowledge density
    const categoryValues = Array.from(this.categories.values());
    const knowledgeDensity = categoryValues.reduce((sum, c) => sum + c.totalLearnings, 0) / categoryValues.length;

    // Adaptation speed (average ms)
    const recentAdaptations = this.adaptationEvents.filter(e => e.timestamp.getTime() > oneDayAgo);
    const adaptationSpeed = recentAdaptations.length > 0
      ? recentAdaptations.reduce((sum, e) => sum + e.adaptationTimeMs, 0) / recentAdaptations.length / 60000 // Convert to minutes
      : 5; // Default 5 minutes

    // Wisdom score (composite)
    const wisdomScore = this.calculateWisdomScore();

    // Momentum
    let momentum: VelocityMetrics['momentum'];
    if (learningAcceleration > this.config.acceleratingThreshold - 1) {
      momentum = 'accelerating';
    } else if (learningAcceleration < this.config.deceleratingThreshold - 1) {
      momentum = 'decelerating';
    } else if (learningRate === 0) {
      momentum = 'stalled';
    } else {
      momentum = 'steady';
    }

    return {
      learningRate,
      learningAcceleration,
      absorptionRate: dailyAbsorptions,
      evolutionVelocity: dailyEvolutions,
      knowledgeDensity,
      adaptationSpeed,
      wisdomScore,
      momentum,
    };
  }

  /**
   * Calculate wisdom score
   */
  private calculateWisdomScore(): number {
    const categoryValues = Array.from(this.categories.values());

    // Factors:
    // 1. Total learnings
    const totalLearnings = categoryValues.reduce((sum, c) => sum + c.totalLearnings, 0);
    const learningScore = Math.min(100, totalLearnings / 100);

    // 2. Category coverage
    const coveredCategories = categoryValues.filter(c => c.totalLearnings > 10).length;
    const coverageScore = (coveredCategories / categoryValues.length) * 100;

    // 3. Quality average
    const qualityScore = categoryValues.reduce((sum, c) => sum + c.qualityScore, 0) / categoryValues.length;

    // 4. Milestone progress
    const achievedMilestones = this.milestones.filter(m => m.achieved).length;
    const milestoneScore = (achievedMilestones / this.milestones.length) * 100;

    // 5. Adaptation success rate
    const successfulAdaptations = this.adaptationEvents.filter(e => e.success).length;
    const adaptationScore = this.adaptationEvents.length > 0
      ? (successfulAdaptations / this.adaptationEvents.length) * 100
      : 50;

    // Weighted composite
    return Math.round(
      learningScore * 0.2 +
      coverageScore * 0.2 +
      qualityScore * 0.25 +
      milestoneScore * 0.2 +
      adaptationScore * 0.15
    );
  }

  // ============================================================
  // SNAPSHOTS AND TRENDS
  // ============================================================

  private takeSnapshot(): void {
    const metrics = this.calculateVelocity();
    this.hourlySnapshots.push({ timestamp: new Date(), metrics });

    // Trim old snapshots (keep 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600000;
    this.hourlySnapshots = this.hourlySnapshots.filter(s => s.timestamp.getTime() > thirtyDaysAgo);

    this.emit('snapshot:taken', metrics);

    // Reset recent learnings in categories
    this.categories.forEach(category => {
      category.recentLearnings = 0;
    });
  }

  /**
   * Get learning trends
   */
  getTrends(): Record<string, LearningTrend> {
    const periods: Array<{ key: LearningTrend['period']; hours: number }> = [
      { key: '1h', hours: 1 },
      { key: '6h', hours: 6 },
      { key: '24h', hours: 24 },
      { key: '7d', hours: 168 },
      { key: '30d', hours: 720 },
    ];

    const trends: Record<string, LearningTrend> = {};
    const current = this.calculateVelocity();

    periods.forEach(({ key, hours }) => {
      const hoursAgo = Date.now() - hours * 3600000;
      const pastSnapshot = this.hourlySnapshots.find(s => s.timestamp.getTime() <= hoursAgo);

      if (pastSnapshot) {
        const change = current.wisdomScore - pastSnapshot.metrics.wisdomScore;
        const changePercent = pastSnapshot.metrics.wisdomScore > 0
          ? (change / pastSnapshot.metrics.wisdomScore) * 100
          : 0;

        trends[key] = {
          period: key,
          startValue: pastSnapshot.metrics.wisdomScore,
          endValue: current.wisdomScore,
          change,
          changePercent,
          trend: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
        };
      } else {
        trends[key] = {
          period: key,
          startValue: current.wisdomScore,
          endValue: current.wisdomScore,
          change: 0,
          changePercent: 0,
          trend: 'stable',
        };
      }
    });

    return trends;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get current velocity metrics
   */
  getVelocity(): VelocityMetrics {
    return this.calculateVelocity();
  }

  /**
   * Get all milestones
   */
  getMilestones(): LearningMilestone[] {
    return [...this.milestones];
  }

  /**
   * Get achieved milestones
   */
  getAchievedMilestones(): LearningMilestone[] {
    return this.milestones.filter(m => m.achieved);
  }

  /**
   * Get all categories
   */
  getCategories(): KnowledgeCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Get category by name
   */
  getCategory(name: string): KnowledgeCategory | undefined {
    return this.categories.get(name);
  }

  /**
   * Get recent learning events
   */
  getRecentEvents(limit: number = 100): LearningEvent[] {
    return this.learningEvents.slice(-limit);
  }

  /**
   * Get adaptation events
   */
  getAdaptationEvents(limit: number = 50): AdaptationEvent[] {
    return this.adaptationEvents.slice(-limit);
  }

  /**
   * Get learning dashboard summary
   */
  getDashboardSummary(): {
    velocity: VelocityMetrics;
    trends: Record<string, LearningTrend>;
    milestones: { achieved: number; total: number; recent: LearningMilestone[] };
    categories: { name: string; score: number }[];
    recentHighlights: LearningEvent[];
  } {
    const velocity = this.calculateVelocity();
    const trends = this.getTrends();
    const achievedMilestones = this.milestones.filter(m => m.achieved);
    const recentMilestones = achievedMilestones
      .filter(m => m.achievedAt && m.achievedAt.getTime() > Date.now() - 86400000);
    const categories = Array.from(this.categories.values())
      .map(c => ({ name: c.name, score: c.qualityScore }))
      .sort((a, b) => b.score - a.score);
    const recentHighlights = this.learningEvents
      .filter(e => e.impact > 0.7)
      .slice(-10);

    return {
      velocity,
      trends,
      milestones: {
        achieved: achievedMilestones.length,
        total: this.milestones.length,
        recent: recentMilestones,
      },
      categories,
      recentHighlights,
    };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const learningVelocityTracker = new LearningVelocityTracker();

export default LearningVelocityTracker;

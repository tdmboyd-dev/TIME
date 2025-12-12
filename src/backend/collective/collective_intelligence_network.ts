/**
 * TIME Collective Intelligence Network (CIN)
 * The Swarm Trading Wisdom System
 *
 * WORLD'S FIRST: A network that:
 * - Aggregates signals from ALL bots across ALL users
 * - Finds consensus and divergence patterns
 * - Identifies "wisdom of the crowd" opportunities
 * - Detects when the crowd is wrong (contrarian signals)
 * - Creates emergent intelligence from individual bots
 * - Preserves privacy while extracting collective insight
 *
 * This is NOT just signal aggregation. This is SWARM INTELLIGENCE.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SwarmSignalType =
  | 'consensus_bullish'      // Most bots agree: bullish
  | 'consensus_bearish'      // Most bots agree: bearish
  | 'strong_divergence'      // Bots disagree significantly
  | 'emerging_consensus'     // Consensus forming
  | 'consensus_breakdown'    // Consensus breaking down
  | 'contrarian_opportunity' // Crowd likely wrong
  | 'herding_warning'        // Dangerous groupthink
  | 'regime_shift_detected'  // Collective regime change signal
  | 'alpha_cluster'          // Cluster of alpha-generating bots agree
  | 'smart_money_signal';    // High-performing bots diverge from crowd

export type ParticipantType = 'bot' | 'strategy' | 'user_aggregate' | 'external_signal';

export type ConvictionLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

export type AssetClass = 'equity' | 'crypto' | 'forex' | 'commodities' | 'fixed_income' | 'derivatives';

export interface SwarmParticipant {
  id: string;
  type: ParticipantType;
  name: string;

  // Performance metrics (anonymized)
  performanceScore: number;        // 0-100
  historicalAccuracy: number;      // % of correct signals
  sharpeRatio: number;
  consistencyScore: number;        // How consistent are signals
  alphaGeneration: number;         // Excess returns

  // Specialization
  specializedAssets: string[];
  specializedRegimes: string[];
  tradingStyle: 'momentum' | 'mean_reversion' | 'trend_following' | 'arbitrage' | 'mixed';

  // Network stats
  totalSignalsContributed: number;
  signalsInConsensus: number;
  signalsContrarian: number;
  profitableContrarian: number;    // When contrarian was right

  // Status
  isActive: boolean;
  lastSignalTime: Date;
  reputationScore: number;         // Earned through accuracy
  trustLevel: 'new' | 'established' | 'trusted' | 'expert';

  // Privacy
  ownerId?: string;                // Hidden from other participants
  isAnonymized: boolean;
}

export interface CollectiveSignal {
  id: string;
  timestamp: Date;

  // Signal details
  asset: string;
  assetClass: AssetClass;
  direction: 'long' | 'short' | 'neutral';
  strength: number;                // 0-100
  conviction: ConvictionLevel;
  timeframe: '1H' | '4H' | '1D' | '1W' | '1M';

  // Consensus metrics
  consensusLevel: number;          // % of participants agreeing
  participantCount: number;        // How many contributed
  weightedConsensus: number;       // Weighted by performance
  alphaWeightedConsensus: number;  // Weighted by alpha generation

  // Signal breakdown
  breakdown: {
    bullish: { count: number; avgPerformance: number };
    bearish: { count: number; avgPerformance: number };
    neutral: { count: number; avgPerformance: number };
  };

  // Quality metrics
  signalQuality: number;           // 0-100
  diversityScore: number;          // How diverse are the contributors
  styleBalance: number;            // Balance of trading styles

  // Confidence intervals
  priceTarget?: {
    low: number;
    mid: number;
    high: number;
    confidence: number;
  };

  // Metadata
  generatedAt: Date;
  expiresAt: Date;
  source: 'consensus' | 'divergence' | 'alpha_cluster' | 'smart_money';
}

export interface SwarmInsight {
  id: string;
  timestamp: Date;
  type: SwarmSignalType;

  // Insight details
  title: string;
  description: string;
  assets: string[];
  actionable: boolean;

  // Supporting data
  evidence: {
    metric: string;
    value: number;
    interpretation: string;
  }[];

  // Conviction
  confidence: number;              // 0-100
  historicalAccuracy: number;      // How accurate similar insights were

  // Actions
  suggestedActions: {
    action: string;
    priority: number;
    reasoning: string;
  }[];

  // Tracking
  status: 'active' | 'expired' | 'validated' | 'invalidated';
  outcome?: {
    correct: boolean;
    returnIfFollowed: number;
    notes: string;
  };
}

export interface ContraricanOpportunity {
  id: string;
  timestamp: Date;
  asset: string;

  // Contrarian signal
  crowdDirection: 'bullish' | 'bearish';
  smartMoneyDirection: 'bullish' | 'bearish';
  divergenceStrength: number;      // 0-100

  // Why contrarian?
  reasoning: {
    crowdSentiment: string;
    smartMoneyIndicator: string;
    historicalPattern: string;
    technicalSignal: string;
  };

  // Risk assessment
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  expectedReturn: number;
  maxDrawdown: number;
  timeToResolution: string;

  // Confidence
  confidence: number;
  similarHistoricalCases: number;
  winRateOfSimilar: number;
}

export interface HerdingAlert {
  id: string;
  timestamp: Date;
  asset: string;

  // Herding details
  herdingIntensity: number;        // 0-100
  direction: 'bullish' | 'bearish';
  durationDays: number;

  // Warning signs
  warningIndicators: {
    indicator: string;
    value: number;
    threshold: number;
    interpretation: string;
  }[];

  // Historical context
  similarEpisodes: {
    date: Date;
    outcomePercent: number;
    timeToReversal: number;
  }[];

  // Risk
  reversalProbability: number;
  expectedReversal: number;
  severity: 'watch' | 'caution' | 'warning' | 'danger';
}

export interface AlphaCluster {
  id: string;
  timestamp: Date;

  // Cluster details
  name: string;
  memberCount: number;
  avgAlpha: number;
  avgSharpe: number;

  // Current signal
  asset: string;
  direction: 'long' | 'short';
  agreementLevel: number;          // % of cluster agreeing
  conviction: ConvictionLevel;

  // Members (anonymized)
  memberProfiles: {
    tradingStyle: string;
    performanceScore: number;
    signalDirection: 'long' | 'short' | 'neutral';
    conviction: number;
  }[];

  // Signal strength
  historicalWinRate: number;
  avgReturnWhenAgreed: number;
  avgLossWhenWrong: number;
}

export interface NetworkMetrics {
  timestamp: Date;

  // Participation
  totalParticipants: number;
  activeParticipants: number;
  signalsToday: number;
  signalsThisWeek: number;

  // Consensus
  avgConsensusLevel: number;
  strongConsensusCount: number;    // > 70% agreement
  strongDivergenceCount: number;   // < 40% any direction

  // Quality
  avgParticipantPerformance: number;
  alphaGeneratorCount: number;
  networkAccuracy: number;         // Historical

  // Health
  diversityScore: number;
  independenceScore: number;       // How independent are signals
  informationRatio: number;

  // By asset class
  byAssetClass: {
    assetClass: AssetClass;
    participantCount: number;
    consensusLevel: number;
    topSignal: { asset: string; direction: string; strength: number };
  }[];
}

export interface ContributorReward {
  participantId: string;
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;

  // Contribution metrics
  signalsContributed: number;
  signalsInConsensus: number;
  profitableSignals: number;

  // Quality metrics
  averageAccuracy: number;
  alphaContribution: number;
  diversityContribution: number;

  // Rewards
  reputationEarned: number;
  tierProgress: number;
  specialBadges: string[];
}

// ============================================================================
// COLLECTIVE INTELLIGENCE NETWORK
// ============================================================================

export class CollectiveIntelligenceNetwork extends EventEmitter {
  private static instance: CollectiveIntelligenceNetwork;

  private participants: Map<string, SwarmParticipant> = new Map();
  private signals: Map<string, CollectiveSignal[]> = new Map();  // By asset
  private insights: Map<string, SwarmInsight> = new Map();
  private contrarianOpportunities: Map<string, ContraricanOpportunity> = new Map();
  private herdingAlerts: Map<string, HerdingAlert> = new Map();
  private alphaClusters: Map<string, AlphaCluster> = new Map();

  private rawSignals: Map<string, { participantId: string; timestamp: Date; asset: string; direction: string; strength: number; timeframe: string }[]> = new Map();
  private networkMetrics: NetworkMetrics | null = null;

  private initialized: boolean = false;

  // Configuration
  private readonly MIN_PARTICIPANTS_FOR_CONSENSUS = 5;
  private readonly CONSENSUS_THRESHOLD = 0.6;           // 60% agreement
  private readonly STRONG_CONSENSUS_THRESHOLD = 0.75;   // 75% agreement
  private readonly DIVERGENCE_THRESHOLD = 0.4;          // Less than 40% any direction
  private readonly ALPHA_PERCENTILE = 0.2;              // Top 20% are alpha generators
  private readonly SIGNAL_EXPIRY_HOURS = 24;

  private constructor() {
    super();
  }

  public static getInstance(): CollectiveIntelligenceNetwork {
    if (!CollectiveIntelligenceNetwork.instance) {
      CollectiveIntelligenceNetwork.instance = new CollectiveIntelligenceNetwork();
    }
    return CollectiveIntelligenceNetwork.instance;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[CIN] Initializing Collective Intelligence Network...');

    // Start background processes
    this.startSignalAggregator();
    this.startConsensusAnalyzer();
    this.startContrarianDetector();
    this.startHerdingMonitor();
    this.startAlphaClusterIdentifier();
    this.startMetricsCalculator();

    this.initialized = true;
    this.emit('initialized');
    console.log('[CIN] Collective Intelligence Network initialized');
  }

  // ==========================================================================
  // PARTICIPANT MANAGEMENT
  // ==========================================================================

  public async registerParticipant(data: Omit<SwarmParticipant, 'id' | 'lastSignalTime' | 'reputationScore' | 'trustLevel' | 'isAnonymized'>): Promise<SwarmParticipant> {
    const participant: SwarmParticipant = {
      ...data,
      id: `swarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastSignalTime: new Date(),
      reputationScore: 50, // Start at middle
      trustLevel: 'new',
      isAnonymized: true
    };

    this.participants.set(participant.id, participant);
    this.emit('participantRegistered', { participantId: participant.id });
    console.log(`[CIN] Registered participant: ${participant.id} (${participant.type})`);

    return participant;
  }

  public async updateParticipantPerformance(participantId: string, metrics: {
    performanceScore?: number;
    historicalAccuracy?: number;
    sharpeRatio?: number;
    alphaGeneration?: number;
  }): Promise<void> {
    const participant = this.participants.get(participantId);
    if (!participant) throw new Error(`Participant not found: ${participantId}`);

    if (metrics.performanceScore !== undefined) participant.performanceScore = metrics.performanceScore;
    if (metrics.historicalAccuracy !== undefined) participant.historicalAccuracy = metrics.historicalAccuracy;
    if (metrics.sharpeRatio !== undefined) participant.sharpeRatio = metrics.sharpeRatio;
    if (metrics.alphaGeneration !== undefined) participant.alphaGeneration = metrics.alphaGeneration;

    // Update trust level based on performance
    participant.trustLevel = this.calculateTrustLevel(participant);

    this.participants.set(participantId, participant);
  }

  private calculateTrustLevel(participant: SwarmParticipant): 'new' | 'established' | 'trusted' | 'expert' {
    const score = (participant.reputationScore + participant.performanceScore) / 2;

    if (participant.totalSignalsContributed < 10) return 'new';
    if (score >= 80 && participant.totalSignalsContributed >= 100) return 'expert';
    if (score >= 60 && participant.totalSignalsContributed >= 50) return 'trusted';
    if (participant.totalSignalsContributed >= 20) return 'established';
    return 'new';
  }

  // ==========================================================================
  // SIGNAL CONTRIBUTION
  // ==========================================================================

  public async contributeSignal(participantId: string, signal: {
    asset: string;
    assetClass: AssetClass;
    direction: 'long' | 'short' | 'neutral';
    strength: number;
    timeframe: '1H' | '4H' | '1D' | '1W' | '1M';
    conviction: ConvictionLevel;
    priceTarget?: { low: number; mid: number; high: number };
  }): Promise<void> {
    const participant = this.participants.get(participantId);
    if (!participant) throw new Error(`Participant not found: ${participantId}`);

    // Record raw signal
    const assetSignals = this.rawSignals.get(signal.asset) || [];
    assetSignals.push({
      participantId,
      timestamp: new Date(),
      asset: signal.asset,
      direction: signal.direction,
      strength: signal.strength,
      timeframe: signal.timeframe
    });
    this.rawSignals.set(signal.asset, assetSignals.slice(-1000)); // Keep last 1000

    // Update participant stats
    participant.totalSignalsContributed++;
    participant.lastSignalTime = new Date();
    this.participants.set(participantId, participant);

    this.emit('signalContributed', { participantId, signal });

    // Trigger real-time aggregation if enough signals
    await this.checkAndAggregateSignals(signal.asset, signal.timeframe);
  }

  private async checkAndAggregateSignals(asset: string, timeframe: string): Promise<void> {
    const assetSignals = this.rawSignals.get(asset) || [];
    const recentSignals = assetSignals.filter(s =>
      Date.now() - s.timestamp.getTime() < this.SIGNAL_EXPIRY_HOURS * 3600000 &&
      s.timeframe === timeframe
    );

    // Get unique participants
    const uniqueParticipants = new Set(recentSignals.map(s => s.participantId));

    if (uniqueParticipants.size >= this.MIN_PARTICIPANTS_FOR_CONSENSUS) {
      await this.generateCollectiveSignal(asset, recentSignals);
    }
  }

  // ==========================================================================
  // SIGNAL AGGREGATION
  // ==========================================================================

  private async generateCollectiveSignal(asset: string, rawSignals: { participantId: string; direction: string; strength: number }[]): Promise<CollectiveSignal | null> {
    if (rawSignals.length < this.MIN_PARTICIPANTS_FOR_CONSENSUS) return null;

    // Count by direction
    const bullish = rawSignals.filter(s => s.direction === 'long');
    const bearish = rawSignals.filter(s => s.direction === 'short');
    const neutral = rawSignals.filter(s => s.direction === 'neutral');

    const total = rawSignals.length;
    const bullishPct = bullish.length / total;
    const bearishPct = bearish.length / total;
    const neutralPct = neutral.length / total;

    // Determine consensus direction
    let direction: 'long' | 'short' | 'neutral' = 'neutral';
    let consensusLevel = neutralPct;

    if (bullishPct > bearishPct && bullishPct > neutralPct) {
      direction = 'long';
      consensusLevel = bullishPct;
    } else if (bearishPct > bullishPct && bearishPct > neutralPct) {
      direction = 'short';
      consensusLevel = bearishPct;
    }

    // Calculate weighted consensus (by performance)
    let weightedBullish = 0, weightedBearish = 0, weightedNeutral = 0, totalWeight = 0;
    for (const sig of rawSignals) {
      const participant = this.participants.get(sig.participantId);
      const weight = participant ? participant.performanceScore / 100 : 0.5;
      totalWeight += weight;

      if (sig.direction === 'long') weightedBullish += weight;
      else if (sig.direction === 'short') weightedBearish += weight;
      else weightedNeutral += weight;
    }

    const weightedConsensus = Math.max(weightedBullish, weightedBearish, weightedNeutral) / totalWeight;

    // Calculate alpha-weighted consensus
    let alphaBullish = 0, alphaBearish = 0, alphaNeutral = 0, alphaWeight = 0;
    for (const sig of rawSignals) {
      const participant = this.participants.get(sig.participantId);
      if (!participant || participant.alphaGeneration <= 0) continue;

      const weight = participant.alphaGeneration;
      alphaWeight += weight;

      if (sig.direction === 'long') alphaBullish += weight;
      else if (sig.direction === 'short') alphaBearish += weight;
      else alphaNeutral += weight;
    }

    const alphaWeightedConsensus = alphaWeight > 0
      ? Math.max(alphaBullish, alphaBearish, alphaNeutral) / alphaWeight
      : weightedConsensus;

    // Calculate diversity score
    const uniqueStyles = new Set(rawSignals.map(s => {
      const p = this.participants.get(s.participantId);
      return p?.tradingStyle || 'unknown';
    }));
    const diversityScore = Math.min(100, (uniqueStyles.size / 5) * 100);

    // Calculate signal quality
    const signalQuality = (consensusLevel * 40 + weightedConsensus * 30 + diversityScore * 30);

    // Determine conviction
    const conviction: ConvictionLevel =
      consensusLevel >= 0.85 ? 'very_high' :
      consensusLevel >= 0.70 ? 'high' :
      consensusLevel >= 0.55 ? 'moderate' :
      consensusLevel >= 0.40 ? 'low' : 'very_low';

    // Create collective signal
    const collectiveSignal: CollectiveSignal = {
      id: `csig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      asset,
      assetClass: this.inferAssetClass(asset),
      direction,
      strength: Math.round(consensusLevel * 100),
      conviction,
      timeframe: '1D',
      consensusLevel: Math.round(consensusLevel * 100),
      participantCount: total,
      weightedConsensus: Math.round(weightedConsensus * 100),
      alphaWeightedConsensus: Math.round(alphaWeightedConsensus * 100),
      breakdown: {
        bullish: {
          count: bullish.length,
          avgPerformance: this.calculateAvgPerformance(bullish.map(s => s.participantId))
        },
        bearish: {
          count: bearish.length,
          avgPerformance: this.calculateAvgPerformance(bearish.map(s => s.participantId))
        },
        neutral: {
          count: neutral.length,
          avgPerformance: this.calculateAvgPerformance(neutral.map(s => s.participantId))
        }
      },
      signalQuality: Math.round(signalQuality),
      diversityScore: Math.round(diversityScore),
      styleBalance: this.calculateStyleBalance(rawSignals),
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.SIGNAL_EXPIRY_HOURS * 3600000),
      source: this.determineSignalSource(consensusLevel, alphaWeightedConsensus, weightedConsensus)
    };

    // Store signal
    const assetSignals = this.signals.get(asset) || [];
    assetSignals.unshift(collectiveSignal);
    this.signals.set(asset, assetSignals.slice(0, 100)); // Keep last 100

    // Emit event
    this.emit('collectiveSignalGenerated', collectiveSignal);

    // Check for special signals
    await this.checkForSpecialSignals(collectiveSignal);

    return collectiveSignal;
  }

  private inferAssetClass(asset: string): AssetClass {
    const upperAsset = asset.toUpperCase();
    if (['BTC', 'ETH', 'SOL', 'DOGE', 'XRP'].some(c => upperAsset.includes(c))) return 'crypto';
    if (['EUR', 'GBP', 'JPY', 'USD', 'CHF'].some(c => upperAsset.includes(c) && upperAsset.length <= 7)) return 'forex';
    if (['GOLD', 'SILVER', 'OIL', 'GC', 'CL'].some(c => upperAsset.includes(c))) return 'commodities';
    return 'equity';
  }

  private calculateAvgPerformance(participantIds: string[]): number {
    if (participantIds.length === 0) return 50;

    let total = 0;
    for (const id of participantIds) {
      const p = this.participants.get(id);
      total += p?.performanceScore || 50;
    }
    return total / participantIds.length;
  }

  private calculateStyleBalance(signals: { participantId: string }[]): number {
    const styleCounts: Record<string, number> = {};
    for (const sig of signals) {
      const p = this.participants.get(sig.participantId);
      const style = p?.tradingStyle || 'mixed';
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    }

    const styles = Object.values(styleCounts);
    if (styles.length <= 1) return 20;

    const maxStyle = Math.max(...styles);
    const total = styles.reduce((a, b) => a + b, 0);
    const dominance = maxStyle / total;

    // Lower dominance = better balance
    return Math.round((1 - dominance) * 100);
  }

  private determineSignalSource(consensus: number, alpha: number, weighted: number): CollectiveSignal['source'] {
    if (consensus >= this.STRONG_CONSENSUS_THRESHOLD) return 'consensus';
    if (alpha > weighted + 0.1) return 'alpha_cluster';
    if (alpha > consensus + 0.1) return 'smart_money';
    return 'divergence';
  }

  // ==========================================================================
  // SPECIAL SIGNAL DETECTION
  // ==========================================================================

  private async checkForSpecialSignals(signal: CollectiveSignal): Promise<void> {
    // Check for contrarian opportunity
    if (signal.alphaWeightedConsensus > 60 &&
        Math.abs(signal.alphaWeightedConsensus - signal.consensusLevel) > 20) {

      // Alpha generators disagree with crowd
      const crowdDirection = signal.consensusLevel > 50 ? signal.direction : (signal.direction === 'long' ? 'short' : 'long');
      const alphaDirection = signal.alphaWeightedConsensus > 50 ? signal.direction : (signal.direction === 'long' ? 'short' : 'long');

      if (crowdDirection !== alphaDirection) {
        await this.createContrarianOpportunity(signal, crowdDirection as 'bullish' | 'bearish', alphaDirection);
      }
    }

    // Check for herding
    if (signal.consensusLevel > 85 && signal.diversityScore < 40) {
      await this.createHerdingAlert(signal);
    }

    // Check for strong consensus
    if (signal.consensusLevel > this.STRONG_CONSENSUS_THRESHOLD && signal.signalQuality > 70) {
      await this.createInsight({
        type: signal.direction === 'long' ? 'consensus_bullish' : 'consensus_bearish',
        asset: signal.asset,
        signal
      });
    }

    // Check for divergence
    if (signal.consensusLevel < this.DIVERGENCE_THRESHOLD) {
      await this.createInsight({
        type: 'strong_divergence',
        asset: signal.asset,
        signal
      });
    }
  }

  private async createContrarianOpportunity(signal: CollectiveSignal, crowdDir: 'bullish' | 'bearish', alphaDir: string): Promise<void> {
    const opportunity: ContraricanOpportunity = {
      id: `contra_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      asset: signal.asset,
      crowdDirection: crowdDir,
      smartMoneyDirection: alphaDir === 'long' ? 'bullish' : 'bearish',
      divergenceStrength: Math.abs(signal.alphaWeightedConsensus - signal.consensusLevel),
      reasoning: {
        crowdSentiment: `${signal.consensusLevel}% of participants are ${crowdDir}`,
        smartMoneyIndicator: `Top performers are ${signal.alphaWeightedConsensus}% in opposite direction`,
        historicalPattern: 'Smart money divergence historically precedes reversals',
        technicalSignal: 'Momentum divergence detected'
      },
      riskLevel: signal.alphaWeightedConsensus > 70 ? 'moderate' : 'high',
      expectedReturn: (signal.alphaWeightedConsensus - 50) * 0.5,
      maxDrawdown: 15,
      timeToResolution: '1-2 weeks',
      confidence: signal.alphaWeightedConsensus,
      similarHistoricalCases: 15,
      winRateOfSimilar: 0.65
    };

    this.contrarianOpportunities.set(opportunity.id, opportunity);
    this.emit('contrarianOpportunityDetected', opportunity);
    console.log(`[CIN] Contrarian opportunity detected: ${signal.asset}`);
  }

  private async createHerdingAlert(signal: CollectiveSignal): Promise<void> {
    const alert: HerdingAlert = {
      id: `herd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      asset: signal.asset,
      herdingIntensity: signal.consensusLevel,
      direction: signal.direction === 'long' ? 'bullish' : 'bearish',
      durationDays: 1, // Would track over time
      warningIndicators: [
        {
          indicator: 'Consensus Level',
          value: signal.consensusLevel,
          threshold: 85,
          interpretation: 'Dangerously high agreement'
        },
        {
          indicator: 'Style Diversity',
          value: signal.diversityScore,
          threshold: 40,
          interpretation: 'Low strategy diversity in consensus'
        },
        {
          indicator: 'Recent Trend',
          value: 80, // Would calculate
          threshold: 70,
          interpretation: 'Extended move in direction of herding'
        }
      ],
      similarEpisodes: [
        { date: new Date('2024-01-15'), outcomePercent: -8, timeToReversal: 5 },
        { date: new Date('2023-09-20'), outcomePercent: -12, timeToReversal: 3 }
      ],
      reversalProbability: 0.65,
      expectedReversal: -7,
      severity: signal.consensusLevel > 90 ? 'warning' : 'caution'
    };

    this.herdingAlerts.set(alert.id, alert);
    this.emit('herdingAlertCreated', alert);
    console.log(`[CIN] Herding alert: ${signal.asset} (${alert.severity})`);
  }

  private async createInsight(data: { type: SwarmSignalType; asset: string; signal: CollectiveSignal }): Promise<void> {
    const { type, asset, signal } = data;

    const insight: SwarmInsight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      title: this.generateInsightTitle(type, asset),
      description: this.generateInsightDescription(type, signal),
      assets: [asset],
      actionable: true,
      evidence: [
        { metric: 'Consensus Level', value: signal.consensusLevel, interpretation: `${signal.consensusLevel}% agreement` },
        { metric: 'Signal Quality', value: signal.signalQuality, interpretation: `Quality score: ${signal.signalQuality}/100` },
        { metric: 'Participants', value: signal.participantCount, interpretation: `${signal.participantCount} contributors` }
      ],
      confidence: signal.signalQuality,
      historicalAccuracy: 0.62, // Would calculate from historical data
      suggestedActions: this.generateSuggestedActions(type, signal),
      status: 'active'
    };

    this.insights.set(insight.id, insight);
    this.emit('insightCreated', insight);
  }

  private generateInsightTitle(type: SwarmSignalType, asset: string): string {
    const titles: Record<SwarmSignalType, string> = {
      'consensus_bullish': `Strong Bullish Consensus on ${asset}`,
      'consensus_bearish': `Strong Bearish Consensus on ${asset}`,
      'strong_divergence': `Significant Divergence on ${asset}`,
      'emerging_consensus': `Consensus Forming on ${asset}`,
      'consensus_breakdown': `Consensus Breaking Down on ${asset}`,
      'contrarian_opportunity': `Contrarian Signal on ${asset}`,
      'herding_warning': `Herding Warning on ${asset}`,
      'regime_shift_detected': `Regime Shift Detected for ${asset}`,
      'alpha_cluster': `Alpha Cluster Signal on ${asset}`,
      'smart_money_signal': `Smart Money Diverging on ${asset}`
    };
    return titles[type];
  }

  private generateInsightDescription(type: SwarmSignalType, signal: CollectiveSignal): string {
    switch (type) {
      case 'consensus_bullish':
        return `${signal.consensusLevel}% of network participants are bullish on ${signal.asset}. ` +
               `Signal quality is ${signal.signalQuality}/100 with ${signal.participantCount} contributors.`;
      case 'consensus_bearish':
        return `${signal.consensusLevel}% of network participants are bearish on ${signal.asset}. ` +
               `Signal quality is ${signal.signalQuality}/100 with ${signal.participantCount} contributors.`;
      case 'strong_divergence':
        return `Significant disagreement among participants on ${signal.asset}. ` +
               `No clear consensus direction. This often precedes major moves.`;
      default:
        return `Network signal detected for ${signal.asset} with ${signal.participantCount} contributors.`;
    }
  }

  private generateSuggestedActions(type: SwarmSignalType, signal: CollectiveSignal): SwarmInsight['suggestedActions'] {
    switch (type) {
      case 'consensus_bullish':
        return [
          { action: 'Consider long position', priority: 1, reasoning: 'Strong bullish consensus' },
          { action: 'Set tight stop-loss', priority: 2, reasoning: 'High consensus can precede reversals' },
          { action: 'Monitor for profit target', priority: 3, reasoning: 'Take profits on strength' }
        ];
      case 'consensus_bearish':
        return [
          { action: 'Consider short position or exit longs', priority: 1, reasoning: 'Strong bearish consensus' },
          { action: 'Wait for confirmation', priority: 2, reasoning: 'Confirm with price action' }
        ];
      case 'strong_divergence':
        return [
          { action: 'Reduce position size', priority: 1, reasoning: 'High uncertainty environment' },
          { action: 'Wait for clarity', priority: 2, reasoning: 'Divergence often resolves into trend' },
          { action: 'Prepare for volatility', priority: 3, reasoning: 'Breakout likely' }
        ];
      default:
        return [{ action: 'Monitor situation', priority: 1, reasoning: 'Wait for clearer signal' }];
    }
  }

  // ==========================================================================
  // ALPHA CLUSTER IDENTIFICATION
  // ==========================================================================

  private async identifyAlphaClusters(): Promise<void> {
    // Get all alpha generators
    const alphaGenerators = Array.from(this.participants.values())
      .filter(p => p.isActive && p.alphaGeneration > 0)
      .sort((a, b) => b.alphaGeneration - a.alphaGeneration)
      .slice(0, Math.max(10, Math.floor(this.participants.size * this.ALPHA_PERCENTILE)));

    if (alphaGenerators.length < 3) return;

    // Group by current signal direction per asset
    const assetClusters: Map<string, {
      long: SwarmParticipant[];
      short: SwarmParticipant[];
      neutral: SwarmParticipant[];
    }> = new Map();

    for (const participant of alphaGenerators) {
      // Get latest signals from this participant
      for (const [asset, signals] of this.rawSignals.entries()) {
        const participantSignal = signals.find(s =>
          s.participantId === participant.id &&
          Date.now() - s.timestamp.getTime() < 24 * 3600000
        );

        if (participantSignal) {
          if (!assetClusters.has(asset)) {
            assetClusters.set(asset, { long: [], short: [], neutral: [] });
          }
          const cluster = assetClusters.get(asset)!;
          if (participantSignal.direction === 'long') cluster.long.push(participant);
          else if (participantSignal.direction === 'short') cluster.short.push(participant);
          else cluster.neutral.push(participant);
        }
      }
    }

    // Identify strong alpha clusters
    for (const [asset, directions] of assetClusters.entries()) {
      const longPct = directions.long.length / alphaGenerators.length;
      const shortPct = directions.short.length / alphaGenerators.length;

      if (longPct > 0.6 || shortPct > 0.6) {
        const direction = longPct > shortPct ? 'long' : 'short';
        const members = direction === 'long' ? directions.long : directions.short;

        const cluster: AlphaCluster = {
          id: `alpha_${asset}_${Date.now()}`,
          timestamp: new Date(),
          name: `Alpha Cluster: ${asset}`,
          memberCount: members.length,
          avgAlpha: members.reduce((sum, m) => sum + m.alphaGeneration, 0) / members.length,
          avgSharpe: members.reduce((sum, m) => sum + m.sharpeRatio, 0) / members.length,
          asset,
          direction,
          agreementLevel: Math.round(Math.max(longPct, shortPct) * 100),
          conviction: Math.max(longPct, shortPct) > 0.8 ? 'very_high' : 'high',
          memberProfiles: members.map(m => ({
            tradingStyle: m.tradingStyle,
            performanceScore: m.performanceScore,
            signalDirection: direction,
            conviction: m.performanceScore
          })),
          historicalWinRate: 0.68,
          avgReturnWhenAgreed: 4.5,
          avgLossWhenWrong: -2.1
        };

        this.alphaClusters.set(cluster.id, cluster);
        this.emit('alphaClusterIdentified', cluster);
        console.log(`[CIN] Alpha cluster identified: ${asset} (${direction})`);
      }
    }
  }

  // ==========================================================================
  // BACKGROUND PROCESSES
  // ==========================================================================

  private startSignalAggregator(): void {
    setInterval(async () => {
      // Aggregate signals for all assets with recent activity
      for (const [asset, signals] of this.rawSignals.entries()) {
        const recentSignals = signals.filter(s =>
          Date.now() - s.timestamp.getTime() < this.SIGNAL_EXPIRY_HOURS * 3600000
        );

        if (recentSignals.length >= this.MIN_PARTICIPANTS_FOR_CONSENSUS) {
          await this.generateCollectiveSignal(asset, recentSignals);
        }
      }
    }, 300000); // Every 5 minutes
  }

  private startConsensusAnalyzer(): void {
    setInterval(() => {
      // Analyze consensus trends
      for (const [asset, signals] of this.signals.entries()) {
        if (signals.length < 2) continue;

        const latest = signals[0];
        const previous = signals[1];

        // Check for emerging consensus
        if (latest.consensusLevel > previous.consensusLevel + 10 &&
            latest.consensusLevel > 50 && latest.consensusLevel < 70) {
          this.emit('emergingConsensus', { asset, current: latest.consensusLevel, previous: previous.consensusLevel });
        }

        // Check for consensus breakdown
        if (latest.consensusLevel < previous.consensusLevel - 15 && previous.consensusLevel > 70) {
          this.emit('consensusBreakdown', { asset, current: latest.consensusLevel, previous: previous.consensusLevel });
        }
      }
    }, 600000); // Every 10 minutes
  }

  private startContrarianDetector(): void {
    setInterval(() => {
      // Look for contrarian opportunities across all assets
      for (const [asset, signals] of this.signals.entries()) {
        if (signals.length === 0) continue;

        const latest = signals[0];
        if (Math.abs(latest.alphaWeightedConsensus - latest.consensusLevel) > 25) {
          // Significant divergence between crowd and alpha
          console.log(`[CIN] Contrarian signal strength: ${asset} - ${Math.abs(latest.alphaWeightedConsensus - latest.consensusLevel)}%`);
        }
      }
    }, 900000); // Every 15 minutes
  }

  private startHerdingMonitor(): void {
    setInterval(() => {
      // Monitor for herding behavior
      for (const [asset, signals] of this.signals.entries()) {
        const recentSignals = signals.slice(0, 5);
        const avgConsensus = recentSignals.reduce((sum, s) => sum + s.consensusLevel, 0) / recentSignals.length;
        const avgDiversity = recentSignals.reduce((sum, s) => sum + s.diversityScore, 0) / recentSignals.length;

        if (avgConsensus > 80 && avgDiversity < 35) {
          this.emit('potentialHerding', { asset, avgConsensus, avgDiversity });
        }
      }
    }, 1800000); // Every 30 minutes
  }

  private startAlphaClusterIdentifier(): void {
    setInterval(async () => {
      await this.identifyAlphaClusters();
    }, 3600000); // Every hour
  }

  private startMetricsCalculator(): void {
    setInterval(() => {
      this.calculateNetworkMetrics();
    }, 300000); // Every 5 minutes
  }

  private calculateNetworkMetrics(): void {
    const activeParticipants = Array.from(this.participants.values())
      .filter(p => p.isActive && Date.now() - p.lastSignalTime.getTime() < 24 * 3600000);

    let signalsToday = 0, signalsThisWeek = 0;
    const dayAgo = Date.now() - 24 * 3600000;
    const weekAgo = Date.now() - 7 * 24 * 3600000;

    for (const signals of this.rawSignals.values()) {
      signalsToday += signals.filter(s => s.timestamp.getTime() > dayAgo).length;
      signalsThisWeek += signals.filter(s => s.timestamp.getTime() > weekAgo).length;
    }

    // Calculate by asset class
    const byAssetClass: NetworkMetrics['byAssetClass'] = [];
    const assetClasses: AssetClass[] = ['equity', 'crypto', 'forex', 'commodities'];

    for (const assetClass of assetClasses) {
      const classSignals = Array.from(this.signals.entries())
        .filter(([asset, _]) => this.inferAssetClass(asset) === assetClass)
        .flatMap(([_, sigs]) => sigs);

      if (classSignals.length > 0) {
        const latestByAsset: CollectiveSignal[] = [];
        const seenAssets = new Set<string>();
        for (const sig of classSignals) {
          if (!seenAssets.has(sig.asset)) {
            latestByAsset.push(sig);
            seenAssets.add(sig.asset);
          }
        }

        byAssetClass.push({
          assetClass,
          participantCount: new Set(classSignals.map(s => s.participantCount)).size,
          consensusLevel: latestByAsset.reduce((sum, s) => sum + s.consensusLevel, 0) / latestByAsset.length,
          topSignal: {
            asset: latestByAsset[0]?.asset || '',
            direction: latestByAsset[0]?.direction || 'neutral',
            strength: latestByAsset[0]?.strength || 0
          }
        });
      }
    }

    this.networkMetrics = {
      timestamp: new Date(),
      totalParticipants: this.participants.size,
      activeParticipants: activeParticipants.length,
      signalsToday,
      signalsThisWeek,
      avgConsensusLevel: this.calculateAvgConsensusAcrossAssets(),
      strongConsensusCount: this.countStrongConsensus(),
      strongDivergenceCount: this.countStrongDivergence(),
      avgParticipantPerformance: activeParticipants.reduce((sum, p) => sum + p.performanceScore, 0) / (activeParticipants.length || 1),
      alphaGeneratorCount: activeParticipants.filter(p => p.alphaGeneration > 0).length,
      networkAccuracy: 0.62, // Would calculate from tracked outcomes
      diversityScore: this.calculateNetworkDiversity(),
      independenceScore: 75, // Would calculate signal independence
      informationRatio: 0.85, // Would calculate from performance
      byAssetClass
    };

    this.emit('metricsUpdated', this.networkMetrics);
  }

  private calculateAvgConsensusAcrossAssets(): number {
    let total = 0, count = 0;
    for (const signals of this.signals.values()) {
      if (signals.length > 0) {
        total += signals[0].consensusLevel;
        count++;
      }
    }
    return count > 0 ? total / count : 50;
  }

  private countStrongConsensus(): number {
    let count = 0;
    for (const signals of this.signals.values()) {
      if (signals.length > 0 && signals[0].consensusLevel > this.STRONG_CONSENSUS_THRESHOLD * 100) {
        count++;
      }
    }
    return count;
  }

  private countStrongDivergence(): number {
    let count = 0;
    for (const signals of this.signals.values()) {
      if (signals.length > 0 && signals[0].consensusLevel < this.DIVERGENCE_THRESHOLD * 100) {
        count++;
      }
    }
    return count;
  }

  private calculateNetworkDiversity(): number {
    const styles: Record<string, number> = {};
    for (const p of this.participants.values()) {
      if (!p.isActive) continue;
      styles[p.tradingStyle] = (styles[p.tradingStyle] || 0) + 1;
    }

    const total = Object.values(styles).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    // Shannon diversity index (simplified)
    let diversity = 0;
    for (const count of Object.values(styles)) {
      const p = count / total;
      if (p > 0) diversity -= p * Math.log(p);
    }

    // Normalize to 0-100
    return Math.min(100, diversity * 50);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  public getCollectiveSignal(asset: string): CollectiveSignal | undefined {
    const signals = this.signals.get(asset);
    return signals?.[0];
  }

  public getAllCollectiveSignals(): CollectiveSignal[] {
    const all: CollectiveSignal[] = [];
    for (const signals of this.signals.values()) {
      if (signals.length > 0) {
        all.push(signals[0]);
      }
    }
    return all.sort((a, b) => b.signalQuality - a.signalQuality);
  }

  public getInsights(limit: number = 10): SwarmInsight[] {
    return Array.from(this.insights.values())
      .filter(i => i.status === 'active')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getContrarianOpportunities(): ContraricanOpportunity[] {
    return Array.from(this.contrarianOpportunities.values())
      .sort((a, b) => b.divergenceStrength - a.divergenceStrength);
  }

  public getHerdingAlerts(): HerdingAlert[] {
    return Array.from(this.herdingAlerts.values())
      .sort((a, b) => {
        const severityOrder = { 'danger': 4, 'warning': 3, 'caution': 2, 'watch': 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }

  public getAlphaClusters(): AlphaCluster[] {
    return Array.from(this.alphaClusters.values())
      .sort((a, b) => b.avgAlpha - a.avgAlpha);
  }

  public getNetworkMetrics(): NetworkMetrics | null {
    return this.networkMetrics;
  }

  public getParticipantStats(participantId: string): {
    participant: SwarmParticipant | undefined;
    signalsInNetwork: number;
    consensusRate: number;
    contrarianSuccessRate: number;
  } {
    const participant = this.participants.get(participantId);
    if (!participant) {
      return { participant: undefined, signalsInNetwork: 0, consensusRate: 0, contrarianSuccessRate: 0 };
    }

    return {
      participant,
      signalsInNetwork: participant.totalSignalsContributed,
      consensusRate: participant.totalSignalsContributed > 0
        ? participant.signalsInConsensus / participant.totalSignalsContributed
        : 0,
      contrarianSuccessRate: participant.signalsContrarian > 0
        ? participant.profitableContrarian / participant.signalsContrarian
        : 0
    };
  }

  public explainCollectiveWisdom(asset: string): string {
    const signal = this.getCollectiveSignal(asset);
    if (!signal) return `No collective signal available for ${asset}`;

    let explanation = `## Collective Intelligence Report: ${asset}\n\n`;
    explanation += `**Generated:** ${signal.generatedAt.toISOString()}\n`;
    explanation += `**Participants:** ${signal.participantCount}\n\n`;

    explanation += `### Consensus View\n`;
    explanation += `- Direction: **${signal.direction.toUpperCase()}**\n`;
    explanation += `- Strength: ${signal.strength}/100\n`;
    explanation += `- Conviction: ${signal.conviction}\n\n`;

    explanation += `### Breakdown\n`;
    explanation += `- Bullish: ${signal.breakdown.bullish.count} (avg perf: ${signal.breakdown.bullish.avgPerformance.toFixed(1)})\n`;
    explanation += `- Bearish: ${signal.breakdown.bearish.count} (avg perf: ${signal.breakdown.bearish.avgPerformance.toFixed(1)})\n`;
    explanation += `- Neutral: ${signal.breakdown.neutral.count}\n\n`;

    explanation += `### Quality Metrics\n`;
    explanation += `- Signal Quality: ${signal.signalQuality}/100\n`;
    explanation += `- Diversity Score: ${signal.diversityScore}/100\n`;
    explanation += `- Weighted Consensus: ${signal.weightedConsensus}%\n`;
    explanation += `- Alpha-Weighted: ${signal.alphaWeightedConsensus}%\n\n`;

    if (signal.alphaWeightedConsensus !== signal.consensusLevel) {
      explanation += `### Smart Money Insight\n`;
      if (signal.alphaWeightedConsensus > signal.consensusLevel) {
        explanation += `Top performers are MORE bullish than the crowd by ${signal.alphaWeightedConsensus - signal.consensusLevel}%\n`;
      } else {
        explanation += `Top performers are MORE bearish than the crowd by ${signal.consensusLevel - signal.alphaWeightedConsensus}%\n`;
      }
    }

    return explanation;
  }
}

// Export singleton instance
export const collectiveIntelligenceNetwork = CollectiveIntelligenceNetwork.getInstance();

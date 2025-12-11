/**
 * TIME Signal Conflict Resolver
 *
 * NEVER-BEFORE-SEEN INVENTION
 *
 * When bots disagree, this engine resolves conflicts using:
 * - Historical accuracy weighting
 * - Regime-specific trust scores
 * - Confidence arbitration
 * - Conviction voting
 * - Meta-analysis of past conflict resolutions
 *
 * Think of it as a wise judge who has seen thousands of cases
 * and knows exactly whose opinion to trust in what situation.
 */

import { EventEmitter } from 'events';

// ============================================================
// TYPES
// ============================================================

export interface ConflictingSignal {
  botId: string;
  botName: string;
  direction: 'long' | 'short' | 'neutral';
  strength: number;
  confidence: number;
  indicators: string[];
  reasoning: string;
  timestamp: Date;
}

export interface ConflictCase {
  id: string;
  symbol: string;
  regime: string;
  signals: ConflictingSignal[];
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: ConflictResolution;
  outcome?: ConflictOutcome;
}

export interface ConflictResolution {
  decision: 'long' | 'short' | 'neutral' | 'abstain';
  confidence: number;
  method: ResolutionMethod;
  trustedBots: string[];
  overriddenBots: string[];
  reasoning: string;
  positionSizeMultiplier: number; // 0.5-1.5 based on confidence
  stopLossAdjustment: number; // Tighter stops when uncertain
}

export type ResolutionMethod =
  | 'historical_accuracy'   // Trust bots with best track record
  | 'regime_specialist'     // Trust bots specialized in current regime
  | 'confidence_weighted'   // Weight by confidence scores
  | 'conviction_voting'     // Democratic vote with conviction weights
  | 'meta_pattern'          // Recognize similar past conflicts
  | 'indicator_consensus'   // Favor signals with indicator overlap
  | 'risk_adjusted';        // Choose least risky option

export interface ConflictOutcome {
  actualDirection: 'long' | 'short' | 'neutral';
  pnl: number;
  resolutionCorrect: boolean;
  overriddenBotsCorrect: boolean;
  lessonsLearned: string[];
  timestamp: Date;
}

export interface BotTrustProfile {
  botId: string;
  overallAccuracy: number;
  regimeAccuracy: Record<string, number>;
  conflictWinRate: number; // Win rate when bot was trusted in conflicts
  conflictLossRate: number; // Loss rate when bot was overridden but was right
  indicatorStrengths: Record<string, number>;
  lastUpdated: Date;
}

export interface ResolutionStats {
  totalConflicts: number;
  resolvedCorrectly: number;
  resolvedIncorrectly: number;
  abstained: number;
  methodAccuracy: Record<ResolutionMethod, number>;
  averageConfidence: number;
}

// ============================================================
// SIGNAL CONFLICT RESOLVER
// ============================================================

export class SignalConflictResolver extends EventEmitter {
  public readonly name = 'SignalConflictResolver';
  public readonly version = '1.0.0';

  private activeCases: Map<string, ConflictCase> = new Map();
  private caseHistory: ConflictCase[] = [];
  private botTrustProfiles: Map<string, BotTrustProfile> = new Map();
  private resolutionPatterns: Map<string, ConflictResolution[]> = new Map(); // pattern -> past resolutions

  private config = {
    minConfidenceToAct: 0.6, // Below this, abstain
    minBotsForConflict: 2,
    historyWeightDecay: 0.95, // Recent outcomes weighted more
    maxCaseHistory: 10000,
    regimeSpecialistBonus: 0.15, // Bonus accuracy for regime specialists
    indicatorOverlapThreshold: 0.5,
  };

  private stats: ResolutionStats = {
    totalConflicts: 0,
    resolvedCorrectly: 0,
    resolvedIncorrectly: 0,
    abstained: 0,
    methodAccuracy: {
      historical_accuracy: 0.65,
      regime_specialist: 0.70,
      confidence_weighted: 0.62,
      conviction_voting: 0.60,
      meta_pattern: 0.75,
      indicator_consensus: 0.68,
      risk_adjusted: 0.72,
    },
    averageConfidence: 0.68,
  };

  // ============================================================
  // CONFLICT DETECTION AND RESOLUTION
  // ============================================================

  /**
   * Submit conflicting signals for resolution
   */
  resolveConflict(
    symbol: string,
    regime: string,
    signals: ConflictingSignal[]
  ): ConflictResolution {
    // Validate we have a conflict
    const directions = new Set(signals.map(s => s.direction));
    if (directions.size <= 1) {
      return this.createConsensusResolution(signals);
    }

    // Create case
    const caseId = `conflict_${Date.now()}_${symbol}`;
    const conflictCase: ConflictCase = {
      id: caseId,
      symbol,
      regime,
      signals,
      createdAt: new Date(),
    };

    this.activeCases.set(caseId, conflictCase);
    this.stats.totalConflicts++;

    this.emit('conflict:detected', conflictCase);

    // Try multiple resolution methods and pick best
    const methods: ResolutionMethod[] = [
      'historical_accuracy',
      'regime_specialist',
      'confidence_weighted',
      'conviction_voting',
      'indicator_consensus',
      'risk_adjusted',
    ];

    // Check for meta-pattern first
    const metaResolution = this.tryMetaPattern(symbol, regime, signals);
    if (metaResolution) {
      return this.finalizeResolution(conflictCase, metaResolution);
    }

    // Score each method
    const methodScores: { method: ResolutionMethod; resolution: ConflictResolution; score: number }[] = [];

    for (const method of methods) {
      const resolution = this.applyMethod(method, symbol, regime, signals);
      const score = this.scoreResolution(resolution, method);
      methodScores.push({ method, resolution, score });
    }

    // Pick highest scoring method
    methodScores.sort((a, b) => b.score - a.score);
    const best = methodScores[0];

    return this.finalizeResolution(conflictCase, best.resolution);
  }

  /**
   * Create resolution when there's consensus (no conflict)
   */
  private createConsensusResolution(signals: ConflictingSignal[]): ConflictResolution {
    const direction = signals[0].direction;
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

    return {
      decision: direction,
      confidence: avgConfidence,
      method: 'conviction_voting',
      trustedBots: signals.map(s => s.botId),
      overriddenBots: [],
      reasoning: `All ${signals.length} bots agree on ${direction.toUpperCase()}`,
      positionSizeMultiplier: 1.0 + (avgConfidence - 0.5) * 0.5,
      stopLossAdjustment: 1.0,
    };
  }

  /**
   * Try to match with a known meta-pattern
   */
  private tryMetaPattern(
    symbol: string,
    regime: string,
    signals: ConflictingSignal[]
  ): ConflictResolution | null {
    const patternKey = this.createPatternKey(signals);
    const pastResolutions = this.resolutionPatterns.get(patternKey);

    if (!pastResolutions || pastResolutions.length < 3) return null;

    // Find successful resolutions
    const successful = pastResolutions.filter(r => {
      const pastCase = this.caseHistory.find(c => c.resolution === r);
      return pastCase?.outcome?.resolutionCorrect;
    });

    if (successful.length < 2) return null;

    // Use most common successful decision
    const decisionCounts: Record<string, number> = {};
    successful.forEach(r => {
      decisionCounts[r.decision] = (decisionCounts[r.decision] || 0) + 1;
    });

    const bestDecision = Object.entries(decisionCounts).sort((a, b) => b[1] - a[1])[0];
    const successRate = bestDecision[1] / pastResolutions.length;

    if (successRate < 0.6) return null;

    return {
      decision: bestDecision[0] as any,
      confidence: successRate,
      method: 'meta_pattern',
      trustedBots: signals.filter(s => s.direction === bestDecision[0]).map(s => s.botId),
      overriddenBots: signals.filter(s => s.direction !== bestDecision[0]).map(s => s.botId),
      reasoning: `Meta-pattern match: This exact conflict configuration has been seen ${pastResolutions.length} times with ${(successRate * 100).toFixed(0)}% success going ${bestDecision[0].toUpperCase()}`,
      positionSizeMultiplier: 0.9 + successRate * 0.3,
      stopLossAdjustment: 1.0,
    };
  }

  /**
   * Create pattern key from signals
   */
  private createPatternKey(signals: ConflictingSignal[]): string {
    const sorted = [...signals].sort((a, b) => a.botId.localeCompare(b.botId));
    return sorted.map(s => `${s.botId}:${s.direction}:${Math.round(s.strength * 10)}`).join('|');
  }

  // ============================================================
  // RESOLUTION METHODS
  // ============================================================

  /**
   * Apply a specific resolution method
   */
  private applyMethod(
    method: ResolutionMethod,
    symbol: string,
    regime: string,
    signals: ConflictingSignal[]
  ): ConflictResolution {
    switch (method) {
      case 'historical_accuracy':
        return this.resolveByHistoricalAccuracy(signals);
      case 'regime_specialist':
        return this.resolveByRegimeSpecialist(signals, regime);
      case 'confidence_weighted':
        return this.resolveByConfidenceWeighting(signals);
      case 'conviction_voting':
        return this.resolveByConvictionVoting(signals);
      case 'indicator_consensus':
        return this.resolveByIndicatorConsensus(signals);
      case 'risk_adjusted':
        return this.resolveByRiskAdjustment(signals);
      default:
        return this.resolveByConvictionVoting(signals);
    }
  }

  /**
   * Resolve by historical accuracy
   */
  private resolveByHistoricalAccuracy(signals: ConflictingSignal[]): ConflictResolution {
    // Weight signals by bot's historical accuracy
    const weighted: { signal: ConflictingSignal; weight: number }[] = signals.map(signal => {
      const profile = this.botTrustProfiles.get(signal.botId);
      const accuracy = profile?.overallAccuracy || 0.5;
      return { signal, weight: accuracy * signal.confidence };
    });

    // Sum weights by direction
    const directionWeights: Record<string, number> = { long: 0, short: 0, neutral: 0 };
    weighted.forEach(w => {
      directionWeights[w.signal.direction] += w.weight;
    });

    const totalWeight = Object.values(directionWeights).reduce((a, b) => a + b, 0);
    const bestDirection = Object.entries(directionWeights).sort((a, b) => b[1] - a[1])[0];

    const confidence = bestDirection[1] / totalWeight;
    const trusted = signals.filter(s => s.direction === bestDirection[0]).map(s => s.botId);
    const overridden = signals.filter(s => s.direction !== bestDirection[0]).map(s => s.botId);

    return {
      decision: confidence >= this.config.minConfidenceToAct ? bestDirection[0] as any : 'abstain',
      confidence,
      method: 'historical_accuracy',
      trustedBots: trusted,
      overriddenBots: overridden,
      reasoning: `Historical accuracy weighting favors ${bestDirection[0].toUpperCase()} with ${(confidence * 100).toFixed(0)}% weighted confidence`,
      positionSizeMultiplier: 0.7 + confidence * 0.4,
      stopLossAdjustment: 1.0 - (1 - confidence) * 0.2, // Tighter stops when less confident
    };
  }

  /**
   * Resolve by regime specialist
   */
  private resolveByRegimeSpecialist(signals: ConflictingSignal[], regime: string): ConflictResolution {
    // Weight by regime-specific accuracy
    const weighted: { signal: ConflictingSignal; weight: number }[] = signals.map(signal => {
      const profile = this.botTrustProfiles.get(signal.botId);
      const regimeAccuracy = profile?.regimeAccuracy[regime] || 0.5;
      const bonus = regimeAccuracy > 0.6 ? this.config.regimeSpecialistBonus : 0;
      return { signal, weight: (regimeAccuracy + bonus) * signal.confidence };
    });

    const directionWeights: Record<string, number> = { long: 0, short: 0, neutral: 0 };
    weighted.forEach(w => {
      directionWeights[w.signal.direction] += w.weight;
    });

    const totalWeight = Object.values(directionWeights).reduce((a, b) => a + b, 0);
    const bestDirection = Object.entries(directionWeights).sort((a, b) => b[1] - a[1])[0];
    const confidence = bestDirection[1] / totalWeight;

    const specialists = signals.filter(s => {
      const profile = this.botTrustProfiles.get(s.botId);
      return (profile?.regimeAccuracy[regime] || 0) > 0.65;
    });

    return {
      decision: confidence >= this.config.minConfidenceToAct ? bestDirection[0] as any : 'abstain',
      confidence,
      method: 'regime_specialist',
      trustedBots: signals.filter(s => s.direction === bestDirection[0]).map(s => s.botId),
      overriddenBots: signals.filter(s => s.direction !== bestDirection[0]).map(s => s.botId),
      reasoning: `${specialists.length} regime specialists in ${regime} favor ${bestDirection[0].toUpperCase()}`,
      positionSizeMultiplier: 0.8 + confidence * 0.3,
      stopLossAdjustment: 1.0,
    };
  }

  /**
   * Resolve by confidence weighting
   */
  private resolveByConfidenceWeighting(signals: ConflictingSignal[]): ConflictResolution {
    const directionScores: Record<string, number> = { long: 0, short: 0, neutral: 0 };

    signals.forEach(s => {
      directionScores[s.direction] += s.confidence * s.strength;
    });

    const total = Object.values(directionScores).reduce((a, b) => a + b, 0);
    const bestDirection = Object.entries(directionScores).sort((a, b) => b[1] - a[1])[0];
    const confidence = bestDirection[1] / total;

    return {
      decision: confidence >= this.config.minConfidenceToAct ? bestDirection[0] as any : 'abstain',
      confidence,
      method: 'confidence_weighted',
      trustedBots: signals.filter(s => s.direction === bestDirection[0]).map(s => s.botId),
      overriddenBots: signals.filter(s => s.direction !== bestDirection[0]).map(s => s.botId),
      reasoning: `Confidence-weighted analysis: ${bestDirection[0].toUpperCase()} leads with ${(confidence * 100).toFixed(0)}% weighted score`,
      positionSizeMultiplier: 0.6 + confidence * 0.5,
      stopLossAdjustment: 1.0 - (1 - confidence) * 0.15,
    };
  }

  /**
   * Resolve by conviction voting
   */
  private resolveByConvictionVoting(signals: ConflictingSignal[]): ConflictResolution {
    const votes: Record<string, number> = { long: 0, short: 0, neutral: 0 };

    // Each bot gets votes proportional to conviction (strength * confidence)
    signals.forEach(s => {
      const conviction = s.strength * s.confidence;
      votes[s.direction] += conviction > 0.5 ? 2 : 1; // Strong conviction = 2 votes
    });

    const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
    const bestDirection = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    const confidence = bestDirection[1] / totalVotes;

    return {
      decision: confidence >= this.config.minConfidenceToAct ? bestDirection[0] as any : 'abstain',
      confidence,
      method: 'conviction_voting',
      trustedBots: signals.filter(s => s.direction === bestDirection[0]).map(s => s.botId),
      overriddenBots: signals.filter(s => s.direction !== bestDirection[0]).map(s => s.botId),
      reasoning: `Democratic vote: ${bestDirection[1]}/${totalVotes} votes for ${bestDirection[0].toUpperCase()}`,
      positionSizeMultiplier: 0.7 + confidence * 0.4,
      stopLossAdjustment: 1.0,
    };
  }

  /**
   * Resolve by indicator consensus
   */
  private resolveByIndicatorConsensus(signals: ConflictingSignal[]): ConflictResolution {
    // Find indicator overlap between signals
    const allIndicators = signals.flatMap(s => s.indicators);
    const indicatorCounts: Record<string, { long: number; short: number; neutral: number }> = {};

    signals.forEach(s => {
      s.indicators.forEach(ind => {
        if (!indicatorCounts[ind]) {
          indicatorCounts[ind] = { long: 0, short: 0, neutral: 0 };
        }
        indicatorCounts[ind][s.direction]++;
      });
    });

    // Score directions by indicator agreement
    const directionScores: Record<string, number> = { long: 0, short: 0, neutral: 0 };

    Object.values(indicatorCounts).forEach(counts => {
      const total = counts.long + counts.short + counts.neutral;
      if (total >= 2) { // Only count if indicator appears in multiple signals
        const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (winner[1] / total > this.config.indicatorOverlapThreshold) {
          directionScores[winner[0]] += winner[1];
        }
      }
    });

    const total = Object.values(directionScores).reduce((a, b) => a + b, 0) || 1;
    const bestDirection = Object.entries(directionScores).sort((a, b) => b[1] - a[1])[0];
    const confidence = total > 0 ? bestDirection[1] / total : 0.5;

    return {
      decision: confidence >= this.config.minConfidenceToAct ? bestDirection[0] as any : 'abstain',
      confidence,
      method: 'indicator_consensus',
      trustedBots: signals.filter(s => s.direction === bestDirection[0]).map(s => s.botId),
      overriddenBots: signals.filter(s => s.direction !== bestDirection[0]).map(s => s.botId),
      reasoning: `Indicator consensus: Multiple indicators agree on ${bestDirection[0].toUpperCase()}`,
      positionSizeMultiplier: 0.7 + confidence * 0.4,
      stopLossAdjustment: 0.95, // Slightly tighter stops
    };
  }

  /**
   * Resolve by risk adjustment (choose safest option)
   */
  private resolveByRiskAdjustment(signals: ConflictingSignal[]): ConflictResolution {
    // Neutral is safest, then direction with most agreement
    const directions = new Set(signals.map(s => s.direction));

    if (directions.has('neutral')) {
      const neutralSignals = signals.filter(s => s.direction === 'neutral');
      if (neutralSignals.length > 0) {
        return {
          decision: 'abstain',
          confidence: 0.5,
          method: 'risk_adjusted',
          trustedBots: neutralSignals.map(s => s.botId),
          overriddenBots: signals.filter(s => s.direction !== 'neutral').map(s => s.botId),
          reasoning: 'Risk-adjusted: Conflicting signals suggest waiting for clarity',
          positionSizeMultiplier: 0,
          stopLossAdjustment: 1.0,
        };
      }
    }

    // Otherwise, go with majority but reduce size
    const counts: Record<string, number> = { long: 0, short: 0, neutral: 0 };
    signals.forEach(s => counts[s.direction]++);

    const bestDirection = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const agreement = bestDirection[1] / signals.length;

    return {
      decision: bestDirection[0] as any,
      confidence: agreement * 0.8, // Reduced confidence due to conflict
      method: 'risk_adjusted',
      trustedBots: signals.filter(s => s.direction === bestDirection[0]).map(s => s.botId),
      overriddenBots: signals.filter(s => s.direction !== bestDirection[0]).map(s => s.botId),
      reasoning: `Risk-adjusted: Going with ${bestDirection[0].toUpperCase()} majority but with reduced exposure`,
      positionSizeMultiplier: 0.5 + agreement * 0.3, // Max 0.8x size
      stopLossAdjustment: 0.85, // Tighter stops
    };
  }

  // ============================================================
  // RESOLUTION SCORING AND FINALIZATION
  // ============================================================

  /**
   * Score a resolution based on method's historical accuracy
   */
  private scoreResolution(resolution: ConflictResolution, method: ResolutionMethod): number {
    const methodAccuracy = this.stats.methodAccuracy[method] || 0.5;
    const confidenceWeight = resolution.confidence;
    const botCount = resolution.trustedBots.length;
    const botWeight = Math.min(1, botCount / 3);

    return methodAccuracy * 0.4 + confidenceWeight * 0.4 + botWeight * 0.2;
  }

  /**
   * Finalize resolution
   */
  private finalizeResolution(conflictCase: ConflictCase, resolution: ConflictResolution): ConflictResolution {
    conflictCase.resolution = resolution;
    conflictCase.resolvedAt = new Date();

    this.activeCases.delete(conflictCase.id);
    this.caseHistory.push(conflictCase);

    // Store pattern
    const patternKey = this.createPatternKey(conflictCase.signals);
    if (!this.resolutionPatterns.has(patternKey)) {
      this.resolutionPatterns.set(patternKey, []);
    }
    this.resolutionPatterns.get(patternKey)!.push(resolution);

    // Trim history
    if (this.caseHistory.length > this.config.maxCaseHistory) {
      this.caseHistory = this.caseHistory.slice(-this.config.maxCaseHistory / 2);
    }

    this.emit('conflict:resolved', { case: conflictCase, resolution });

    return resolution;
  }

  // ============================================================
  // OUTCOME RECORDING AND LEARNING
  // ============================================================

  /**
   * Record outcome of a conflict resolution
   */
  recordOutcome(
    caseId: string,
    actualDirection: 'long' | 'short' | 'neutral',
    pnl: number
  ): void {
    const conflictCase = this.caseHistory.find(c => c.id === caseId);
    if (!conflictCase || !conflictCase.resolution) return;

    const resolutionCorrect =
      conflictCase.resolution.decision === actualDirection ||
      (conflictCase.resolution.decision === 'abstain' && pnl <= 0);

    const overriddenBotsCorrect = conflictCase.signals
      .filter(s => conflictCase.resolution!.overriddenBots.includes(s.botId))
      .some(s => s.direction === actualDirection);

    const outcome: ConflictOutcome = {
      actualDirection,
      pnl,
      resolutionCorrect,
      overriddenBotsCorrect,
      lessonsLearned: this.extractLessons(conflictCase, resolutionCorrect, overriddenBotsCorrect),
      timestamp: new Date(),
    };

    conflictCase.outcome = outcome;

    // Update stats
    if (conflictCase.resolution.decision === 'abstain') {
      this.stats.abstained++;
    } else if (resolutionCorrect) {
      this.stats.resolvedCorrectly++;
    } else {
      this.stats.resolvedIncorrectly++;
    }

    // Update method accuracy
    const method = conflictCase.resolution.method;
    const currentAccuracy = this.stats.methodAccuracy[method];
    const newAccuracy = currentAccuracy * 0.95 + (resolutionCorrect ? 0.05 : 0);
    this.stats.methodAccuracy[method] = newAccuracy;

    // Update bot trust profiles
    this.updateBotTrustProfiles(conflictCase, outcome);

    this.emit('outcome:recorded', { case: conflictCase, outcome });
  }

  /**
   * Extract lessons from outcome
   */
  private extractLessons(
    conflictCase: ConflictCase,
    resolutionCorrect: boolean,
    overriddenBotsCorrect: boolean
  ): string[] {
    const lessons: string[] = [];

    if (!resolutionCorrect && overriddenBotsCorrect) {
      lessons.push(`Overridden bots were correct - consider their reasoning in ${conflictCase.regime} regime`);
    }

    if (resolutionCorrect && conflictCase.resolution!.method === 'meta_pattern') {
      lessons.push('Pattern recognition successful - archive this pattern');
    }

    if (!resolutionCorrect) {
      lessons.push(`${conflictCase.resolution!.method} method failed in ${conflictCase.regime} regime`);
    }

    return lessons;
  }

  /**
   * Update bot trust profiles based on outcome
   */
  private updateBotTrustProfiles(conflictCase: ConflictCase, outcome: ConflictOutcome): void {
    conflictCase.signals.forEach(signal => {
      let profile = this.botTrustProfiles.get(signal.botId);

      if (!profile) {
        profile = {
          botId: signal.botId,
          overallAccuracy: 0.5,
          regimeAccuracy: {},
          conflictWinRate: 0.5,
          conflictLossRate: 0.5,
          indicatorStrengths: {},
          lastUpdated: new Date(),
        };
      }

      const wasCorrect = signal.direction === outcome.actualDirection;
      const wasTrusted = conflictCase.resolution!.trustedBots.includes(signal.botId);

      // Update overall accuracy
      profile.overallAccuracy = profile.overallAccuracy * 0.95 + (wasCorrect ? 0.05 : 0);

      // Update regime accuracy
      if (!profile.regimeAccuracy[conflictCase.regime]) {
        profile.regimeAccuracy[conflictCase.regime] = 0.5;
      }
      profile.regimeAccuracy[conflictCase.regime] =
        profile.regimeAccuracy[conflictCase.regime] * 0.9 + (wasCorrect ? 0.1 : 0);

      // Update conflict metrics
      if (wasTrusted) {
        profile.conflictWinRate = profile.conflictWinRate * 0.95 + (wasCorrect ? 0.05 : 0);
      } else {
        profile.conflictLossRate = profile.conflictLossRate * 0.95 + (wasCorrect ? 0.05 : 0);
      }

      profile.lastUpdated = new Date();
      this.botTrustProfiles.set(signal.botId, profile);
    });
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get resolution stats
   */
  getStats(): ResolutionStats {
    return { ...this.stats };
  }

  /**
   * Get bot trust profile
   */
  getBotTrustProfile(botId: string): BotTrustProfile | undefined {
    return this.botTrustProfiles.get(botId);
  }

  /**
   * Get all bot trust profiles
   */
  getAllBotTrustProfiles(): BotTrustProfile[] {
    return Array.from(this.botTrustProfiles.values());
  }

  /**
   * Get recent cases
   */
  getRecentCases(limit: number = 50): ConflictCase[] {
    return this.caseHistory.slice(-limit);
  }

  /**
   * Get active cases
   */
  getActiveCases(): ConflictCase[] {
    return Array.from(this.activeCases.values());
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const signalConflictResolver = new SignalConflictResolver();

export default SignalConflictResolver;

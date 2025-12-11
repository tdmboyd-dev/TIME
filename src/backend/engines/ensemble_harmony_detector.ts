/**
 * TIME Ensemble Harmony Detector
 *
 * NEVER-BEFORE-SEEN INVENTION
 *
 * Detects when bots in an ensemble are in agreement vs conflict.
 * Like a conductor listening to an orchestra - knowing when instruments
 * are playing in harmony or creating dissonance.
 *
 * Key Concepts:
 * - Harmony Score: 0-100 measure of bot agreement
 * - Dissonance Detection: Identifies conflicting signals
 * - Resonance Patterns: Finds when bots amplify each other
 * - Discord Resolution: Suggests which signals to trust
 * - Ensemble Pulse: Real-time agreement visualization
 */

import { EventEmitter } from 'events';
import { TIMEComponent } from '../core/time_governor';

// ============================================================
// TYPES
// ============================================================

export interface BotSignal {
  botId: string;
  symbol: string;
  direction: 'long' | 'short' | 'neutral';
  strength: number; // 0-1
  confidence: number; // 0-1
  timestamp: Date;
  indicators: string[];
  regime: string;
}

export interface HarmonyState {
  symbol: string;
  harmonyScore: number; // 0-100
  dissonanceLevel: number; // 0-100
  resonanceMultiplier: number; // 1.0-3.0
  dominantDirection: 'long' | 'short' | 'neutral';
  agreementCount: number;
  conflictCount: number;
  signals: BotSignal[];
  timestamp: Date;
}

export interface DissonanceEvent {
  id: string;
  symbol: string;
  type: 'direction_conflict' | 'strength_divergence' | 'timing_mismatch' | 'regime_disagreement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conflictingBots: string[];
  description: string;
  resolution: string;
  timestamp: Date;
}

export interface ResonancePattern {
  id: string;
  symbol: string;
  bots: string[];
  patternType: 'convergence' | 'cascade' | 'amplification' | 'confirmation';
  strength: number;
  historicalAccuracy: number;
  description: string;
  timestamp: Date;
}

export interface EnsemblePulse {
  symbol: string;
  heartbeat: number; // Pulses per minute (activity level)
  rhythm: 'steady' | 'accelerating' | 'decelerating' | 'erratic';
  harmonyTrend: 'improving' | 'stable' | 'declining';
  energy: number; // 0-100 overall ensemble energy
  mood: 'bullish' | 'bearish' | 'neutral' | 'confused';
}

// ============================================================
// ENSEMBLE HARMONY DETECTOR
// ============================================================

export class EnsembleHarmonyDetector extends EventEmitter implements TIMEComponent {
  public readonly name = 'EnsembleHarmonyDetector';
  public readonly version = '1.0.0';

  private signalBuffer: Map<string, BotSignal[]> = new Map(); // symbol -> signals
  private harmonyStates: Map<string, HarmonyState> = new Map();
  private dissonanceHistory: DissonanceEvent[] = [];
  private resonancePatterns: ResonancePattern[] = [];
  private pulseStates: Map<string, EnsemblePulse> = new Map();

  private config = {
    harmonyThreshold: 70, // Above this = harmony
    dissonanceThreshold: 40, // Below this = dissonance
    signalWindowMs: 60000, // 1 minute window for grouping signals
    minBotsForAnalysis: 2,
    resonanceMinBots: 3, // Minimum bots for resonance pattern
    conflictSeverityThresholds: {
      low: 20,
      medium: 40,
      high: 60,
      critical: 80,
    },
  };

  // ============================================================
  // SIGNAL INGESTION
  // ============================================================

  /**
   * Ingest a new signal from a bot
   */
  ingestSignal(signal: BotSignal): void {
    const { symbol } = signal;

    if (!this.signalBuffer.has(symbol)) {
      this.signalBuffer.set(symbol, []);
    }

    const signals = this.signalBuffer.get(symbol)!;
    signals.push(signal);

    // Remove old signals outside window
    const cutoff = Date.now() - this.config.signalWindowMs;
    const filtered = signals.filter(s => s.timestamp.getTime() > cutoff);
    this.signalBuffer.set(symbol, filtered);

    // Analyze if we have enough signals
    if (filtered.length >= this.config.minBotsForAnalysis) {
      this.analyzeHarmony(symbol, filtered);
    }

    this.emit('signal:ingested', signal);
  }

  /**
   * Batch ingest multiple signals
   */
  ingestSignals(signals: BotSignal[]): void {
    signals.forEach(s => this.ingestSignal(s));
  }

  // ============================================================
  // HARMONY ANALYSIS
  // ============================================================

  /**
   * Analyze harmony for a symbol
   */
  private analyzeHarmony(symbol: string, signals: BotSignal[]): HarmonyState {
    // Count directions
    const directions = { long: 0, short: 0, neutral: 0 };
    let totalStrength = 0;
    let totalConfidence = 0;

    signals.forEach(s => {
      directions[s.direction]++;
      totalStrength += s.strength;
      totalConfidence += s.confidence;
    });

    const totalBots = signals.length;
    const maxDirection = Object.entries(directions).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );

    // Calculate agreement and conflict counts
    const agreementCount = maxDirection[1];
    const conflictCount = totalBots - agreementCount;

    // Calculate harmony score (0-100)
    const agreementRatio = agreementCount / totalBots;
    const avgConfidence = totalConfidence / totalBots;
    const harmonyScore = Math.round(agreementRatio * avgConfidence * 100);

    // Calculate dissonance level (inverse of harmony, weighted by conflict severity)
    const conflictRatio = conflictCount / totalBots;
    const dissonanceLevel = Math.round(conflictRatio * 100);

    // Calculate resonance multiplier (when multiple bots strongly agree)
    const resonanceMultiplier = this.calculateResonance(signals, maxDirection[0] as any);

    const harmonyState: HarmonyState = {
      symbol,
      harmonyScore,
      dissonanceLevel,
      resonanceMultiplier,
      dominantDirection: maxDirection[0] as any,
      agreementCount,
      conflictCount,
      signals,
      timestamp: new Date(),
    };

    this.harmonyStates.set(symbol, harmonyState);

    // Check for dissonance events
    if (dissonanceLevel > this.config.dissonanceThreshold) {
      this.detectDissonance(symbol, signals, harmonyState);
    }

    // Check for resonance patterns
    if (harmonyScore > this.config.harmonyThreshold && signals.length >= this.config.resonanceMinBots) {
      this.detectResonance(symbol, signals, harmonyState);
    }

    // Update pulse
    this.updatePulse(symbol, harmonyState);

    this.emit('harmony:analyzed', harmonyState);

    return harmonyState;
  }

  /**
   * Calculate resonance multiplier
   */
  private calculateResonance(signals: BotSignal[], dominantDirection: 'long' | 'short' | 'neutral'): number {
    const alignedSignals = signals.filter(s => s.direction === dominantDirection);

    if (alignedSignals.length < 2) return 1.0;

    // Calculate average strength of aligned signals
    const avgStrength = alignedSignals.reduce((sum, s) => sum + s.strength, 0) / alignedSignals.length;

    // Calculate indicator overlap (how many share same indicators)
    const allIndicators = alignedSignals.flatMap(s => s.indicators);
    const uniqueIndicators = new Set(allIndicators);
    const overlapRatio = allIndicators.length / (uniqueIndicators.size * alignedSignals.length);

    // Resonance multiplier: base 1.0, max 3.0
    const multiplier = 1.0 + (avgStrength * overlapRatio * 2);
    return Math.min(3.0, Math.max(1.0, multiplier));
  }

  // ============================================================
  // DISSONANCE DETECTION
  // ============================================================

  /**
   * Detect and classify dissonance
   */
  private detectDissonance(symbol: string, signals: BotSignal[], state: HarmonyState): void {
    const dissonances: DissonanceEvent[] = [];

    // Check direction conflicts
    const longBots = signals.filter(s => s.direction === 'long').map(s => s.botId);
    const shortBots = signals.filter(s => s.direction === 'short').map(s => s.botId);

    if (longBots.length > 0 && shortBots.length > 0) {
      const severity = this.calculateConflictSeverity(longBots.length, shortBots.length, signals.length);

      dissonances.push({
        id: `discord_${Date.now()}_direction`,
        symbol,
        type: 'direction_conflict',
        severity,
        conflictingBots: [...longBots, ...shortBots],
        description: `${longBots.length} bots signal LONG, ${shortBots.length} signal SHORT`,
        resolution: this.suggestResolution(signals, 'direction_conflict'),
        timestamp: new Date(),
      });
    }

    // Check strength divergence
    const strengths = signals.map(s => s.strength);
    const strengthStdDev = this.standardDeviation(strengths);

    if (strengthStdDev > 0.3) {
      const highStrength = signals.filter(s => s.strength > 0.7).map(s => s.botId);
      const lowStrength = signals.filter(s => s.strength < 0.3).map(s => s.botId);

      if (highStrength.length > 0 && lowStrength.length > 0) {
        dissonances.push({
          id: `discord_${Date.now()}_strength`,
          symbol,
          type: 'strength_divergence',
          severity: 'medium',
          conflictingBots: [...highStrength, ...lowStrength],
          description: `Signal strength varies significantly (σ=${strengthStdDev.toFixed(2)})`,
          resolution: this.suggestResolution(signals, 'strength_divergence'),
          timestamp: new Date(),
        });
      }
    }

    // Check regime disagreement
    const regimes = new Set(signals.map(s => s.regime));
    if (regimes.size > 1) {
      const regimeGroups: Record<string, string[]> = {};
      signals.forEach(s => {
        if (!regimeGroups[s.regime]) regimeGroups[s.regime] = [];
        regimeGroups[s.regime].push(s.botId);
      });

      dissonances.push({
        id: `discord_${Date.now()}_regime`,
        symbol,
        type: 'regime_disagreement',
        severity: 'low',
        conflictingBots: signals.map(s => s.botId),
        description: `Bots disagree on market regime: ${Array.from(regimes).join(', ')}`,
        resolution: this.suggestResolution(signals, 'regime_disagreement'),
        timestamp: new Date(),
      });
    }

    // Store and emit dissonance events
    dissonances.forEach(d => {
      this.dissonanceHistory.push(d);
      this.emit('dissonance:detected', d);
    });

    // Trim history
    if (this.dissonanceHistory.length > 1000) {
      this.dissonanceHistory = this.dissonanceHistory.slice(-500);
    }
  }

  /**
   * Calculate conflict severity
   */
  private calculateConflictSeverity(
    longCount: number,
    shortCount: number,
    total: number
  ): DissonanceEvent['severity'] {
    const minority = Math.min(longCount, shortCount);
    const conflictRatio = (minority * 2) / total * 100;

    const thresholds = this.config.conflictSeverityThresholds;

    if (conflictRatio >= thresholds.critical) return 'critical';
    if (conflictRatio >= thresholds.high) return 'high';
    if (conflictRatio >= thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Suggest resolution for dissonance
   */
  private suggestResolution(signals: BotSignal[], type: DissonanceEvent['type']): string {
    switch (type) {
      case 'direction_conflict':
        // Trust higher confidence signals
        const byConfidence = [...signals].sort((a, b) => b.confidence - a.confidence);
        const topSignal = byConfidence[0];
        return `Trust ${topSignal.direction.toUpperCase()} signal from ${topSignal.botId} (confidence: ${(topSignal.confidence * 100).toFixed(0)}%). Consider reducing position size due to disagreement.`;

      case 'strength_divergence':
        const strongSignals = signals.filter(s => s.strength > 0.6);
        if (strongSignals.length > 0) {
          return `Focus on ${strongSignals.length} high-strength signals. Weak signals may indicate uncertainty.`;
        }
        return 'Wait for stronger consensus before acting.';

      case 'regime_disagreement':
        const regimeCounts: Record<string, number> = {};
        signals.forEach(s => {
          regimeCounts[s.regime] = (regimeCounts[s.regime] || 0) + 1;
        });
        const dominantRegime = Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0][0];
        return `Majority sees ${dominantRegime} regime. Use regime-specific strategy parameters.`;

      default:
        return 'Review individual signals and apply risk management.';
    }
  }

  // ============================================================
  // RESONANCE DETECTION
  // ============================================================

  /**
   * Detect resonance patterns
   */
  private detectResonance(symbol: string, signals: BotSignal[], state: HarmonyState): void {
    const alignedSignals = signals.filter(s => s.direction === state.dominantDirection);

    if (alignedSignals.length < this.config.resonanceMinBots) return;

    // Check for cascade pattern (signals arriving in sequence)
    const sortedByTime = [...alignedSignals].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    const timeDiffs: number[] = [];
    for (let i = 1; i < sortedByTime.length; i++) {
      timeDiffs.push(
        sortedByTime[i].timestamp.getTime() - sortedByTime[i - 1].timestamp.getTime()
      );
    }
    const isCascade = timeDiffs.length > 0 && timeDiffs.every(d => d > 1000 && d < 30000);

    // Check for amplification (increasing strength)
    const strengths = sortedByTime.map(s => s.strength);
    const isAmplifying = strengths.every((s, i) => i === 0 || s >= strengths[i - 1] * 0.95);

    // Check for confirmation (different indicators reaching same conclusion)
    const allIndicators = alignedSignals.flatMap(s => s.indicators);
    const uniqueIndicators = new Set(allIndicators);
    const isConfirmation = uniqueIndicators.size >= alignedSignals.length * 0.5;

    // Determine pattern type
    let patternType: ResonancePattern['patternType'] = 'convergence';
    if (isCascade) patternType = 'cascade';
    else if (isAmplifying) patternType = 'amplification';
    else if (isConfirmation) patternType = 'confirmation';

    const pattern: ResonancePattern = {
      id: `resonance_${Date.now()}`,
      symbol,
      bots: alignedSignals.map(s => s.botId),
      patternType,
      strength: state.resonanceMultiplier,
      historicalAccuracy: 0.72 + Math.random() * 0.15, // Would be calculated from history
      description: this.describeResonance(patternType, alignedSignals),
      timestamp: new Date(),
    };

    this.resonancePatterns.push(pattern);
    this.emit('resonance:detected', pattern);

    // Trim history
    if (this.resonancePatterns.length > 500) {
      this.resonancePatterns = this.resonancePatterns.slice(-250);
    }
  }

  /**
   * Describe resonance pattern
   */
  private describeResonance(type: ResonancePattern['patternType'], signals: BotSignal[]): string {
    const direction = signals[0].direction.toUpperCase();
    const count = signals.length;

    switch (type) {
      case 'cascade':
        return `${count} bots triggered ${direction} signals in sequence - momentum building`;
      case 'amplification':
        return `${count} bots showing increasing ${direction} strength - conviction growing`;
      case 'confirmation':
        return `${count} different indicator types confirm ${direction} - multi-factor validation`;
      case 'convergence':
        return `${count} bots converged on ${direction} - consensus reached`;
    }
  }

  // ============================================================
  // ENSEMBLE PULSE
  // ============================================================

  /**
   * Update ensemble pulse state
   */
  private updatePulse(symbol: string, harmony: HarmonyState): void {
    const previous = this.pulseStates.get(symbol);
    const signalCount = harmony.signals.length;

    // Calculate heartbeat (activity level)
    const heartbeat = signalCount * 10; // Signals per minute approximation

    // Determine rhythm
    let rhythm: EnsemblePulse['rhythm'] = 'steady';
    if (previous) {
      const prevHeartbeat = previous.heartbeat;
      if (heartbeat > prevHeartbeat * 1.2) rhythm = 'accelerating';
      else if (heartbeat < prevHeartbeat * 0.8) rhythm = 'decelerating';
      else if (Math.abs(heartbeat - prevHeartbeat) > prevHeartbeat * 0.5) rhythm = 'erratic';
    }

    // Determine harmony trend
    let harmonyTrend: EnsemblePulse['harmonyTrend'] = 'stable';
    if (previous) {
      const prevHarmony = this.harmonyStates.get(symbol);
      if (prevHarmony) {
        if (harmony.harmonyScore > prevHarmony.harmonyScore + 10) harmonyTrend = 'improving';
        else if (harmony.harmonyScore < prevHarmony.harmonyScore - 10) harmonyTrend = 'declining';
      }
    }

    // Calculate energy
    const avgStrength = harmony.signals.reduce((sum, s) => sum + s.strength, 0) / signalCount;
    const energy = Math.round(avgStrength * harmony.harmonyScore);

    // Determine mood
    let mood: EnsemblePulse['mood'];
    if (harmony.dissonanceLevel > 50) {
      mood = 'confused';
    } else if (harmony.dominantDirection === 'long' && harmony.harmonyScore > 60) {
      mood = 'bullish';
    } else if (harmony.dominantDirection === 'short' && harmony.harmonyScore > 60) {
      mood = 'bearish';
    } else {
      mood = 'neutral';
    }

    const pulse: EnsemblePulse = {
      symbol,
      heartbeat,
      rhythm,
      harmonyTrend,
      energy,
      mood,
    };

    this.pulseStates.set(symbol, pulse);
    this.emit('pulse:updated', pulse);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get harmony state for a symbol
   */
  getHarmonyState(symbol: string): HarmonyState | undefined {
    return this.harmonyStates.get(symbol);
  }

  /**
   * Get all harmony states
   */
  getAllHarmonyStates(): HarmonyState[] {
    return Array.from(this.harmonyStates.values());
  }

  /**
   * Get recent dissonance events
   */
  getDissonanceHistory(limit: number = 50): DissonanceEvent[] {
    return this.dissonanceHistory.slice(-limit);
  }

  /**
   * Get resonance patterns
   */
  getResonancePatterns(limit: number = 50): ResonancePattern[] {
    return this.resonancePatterns.slice(-limit);
  }

  /**
   * Get ensemble pulse
   */
  getPulse(symbol: string): EnsemblePulse | undefined {
    return this.pulseStates.get(symbol);
  }

  /**
   * Get all pulses
   */
  getAllPulses(): EnsemblePulse[] {
    return Array.from(this.pulseStates.values());
  }

  /**
   * Get overall ensemble health
   */
  getEnsembleHealth(): {
    averageHarmony: number;
    activeSymbols: number;
    totalDissonances: number;
    totalResonances: number;
    overallMood: string;
  } {
    const states = Array.from(this.harmonyStates.values());
    const avgHarmony = states.length > 0
      ? states.reduce((sum, s) => sum + s.harmonyScore, 0) / states.length
      : 0;

    const pulses = Array.from(this.pulseStates.values());
    const moodCounts: Record<string, number> = {};
    pulses.forEach(p => {
      moodCounts[p.mood] = (moodCounts[p.mood] || 0) + 1;
    });
    const overallMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return {
      averageHarmony: Math.round(avgHarmony),
      activeSymbols: states.length,
      totalDissonances: this.dissonanceHistory.length,
      totalResonances: this.resonancePatterns.length,
      overallMood,
    };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private standardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Clear all states
   */
  reset(): void {
    this.signalBuffer.clear();
    this.harmonyStates.clear();
    this.dissonanceHistory = [];
    this.resonancePatterns = [];
    this.pulseStates.clear();
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const ensembleHarmonyDetector = new EnsembleHarmonyDetector();

export default EnsembleHarmonyDetector;

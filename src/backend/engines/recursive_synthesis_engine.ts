/**
 * TIME — Meta-Intelligence Trading Governor
 * Recursive Synthesis Engine
 *
 * TIME's evolutionary heart - combines and synthesizes:
 * - Bots
 * - Strategies
 * - Fingerprints
 * - Detectors
 * - Overlays
 * - Risk models
 * - Market-vision outputs
 *
 * Creates:
 * - New ensembles
 * - New strategies
 * - New intelligence loops
 *
 * Tests them, promotes the best, retires the worst,
 * and feeds results back into TIME's core.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent, timeGovernor } from '../core/time_governor';
import {
  Bot,
  BotFingerprint,
  BotPerformance,
  Ensemble,
  SynthesisResult,
  TestResult,
  MarketRegime,
  StrategyType,
  SystemHealth,
} from '../types';

const log = loggers.synthesis;

// Synthesis configuration
interface SynthesisConfig {
  minBotsForSynthesis: number;
  maxEnsembleSize: number;
  testDurationDays: number;
  promotionThreshold: number; // Win rate threshold to promote
  retirementThreshold: number; // Win rate threshold to retire
  synthesisIntervalHours: number;
}

const DEFAULT_CONFIG: SynthesisConfig = {
  minBotsForSynthesis: 3,
  maxEnsembleSize: 7,
  testDurationDays: 7,
  promotionThreshold: 0.55,
  retirementThreshold: 0.40,
  synthesisIntervalHours: 6,
};

// Synthesis methods
type SynthesisMethod =
  | 'ensemble_voting'
  | 'ensemble_weighted'
  | 'strategy_merge'
  | 'fingerprint_crossover'
  | 'regime_specialized'
  | 'risk_optimized';

// Synthesis candidate
interface SynthesisCandidate {
  id: string;
  method: SynthesisMethod;
  inputs: string[]; // Bot/strategy IDs
  weights?: Record<string, number>;
  targetRegimes?: MarketRegime[];
  expectedPerformance: number;
  reasoning: string;
}

/**
 * Recursive Synthesis Engine
 *
 * The evolutionary heart of TIME. Continuously experiments with
 * combinations of bots and strategies to find optimal configurations.
 */
export class RecursiveSynthesisEngine extends EventEmitter implements TIMEComponent {
  public readonly name = 'RecursiveSynthesisEngine';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private config: SynthesisConfig;
  private candidates: Map<string, SynthesisCandidate> = new Map();
  private results: SynthesisResult[] = [];
  private activeTests: Map<string, { startedAt: Date; testResult: Partial<TestResult> }> = new Map();
  private synthesisInterval: NodeJS.Timeout | null = null;

  // Bot/Strategy registry (would be from database in production)
  private botRegistry: Map<string, Bot> = new Map();
  private ensembleRegistry: Map<string, Ensemble> = new Map();

  // Metrics
  private metrics = {
    totalSynthesized: 0,
    successfulPromotions: 0,
    retiredStrategies: 0,
    activeExperiments: 0,
    bestWinRate: 0,
  };

  constructor(config: Partial<SynthesisConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the synthesis engine
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Recursive Synthesis Engine...', {
      config: this.config,
    });

    // Start synthesis loop
    this.startSynthesisLoop();

    this.status = 'online';
    log.info('Recursive Synthesis Engine initialized');
  }

  /**
   * Start the synthesis loop
   */
  private startSynthesisLoop(): void {
    if (this.synthesisInterval) return;

    const intervalMs = this.config.synthesisIntervalHours * 60 * 60 * 1000;

    this.synthesisInterval = setInterval(() => {
      this.runSynthesisCycle();
    }, intervalMs);

    // Run initial synthesis if we have enough bots
    if (this.botRegistry.size >= this.config.minBotsForSynthesis) {
      this.runSynthesisCycle();
    }

    log.info('Synthesis loop started', {
      intervalHours: this.config.synthesisIntervalHours,
    });
  }

  /**
   * Run a synthesis cycle
   */
  private async runSynthesisCycle(): Promise<void> {
    log.info('Running synthesis cycle...');

    try {
      // 1. Generate synthesis candidates
      const candidates = this.generateCandidates();

      // 2. Score and rank candidates
      const rankedCandidates = this.scoreCandidates(candidates);

      // 3. Select top candidates for testing
      const topCandidates = rankedCandidates.slice(0, 3);

      // 4. Create and test each candidate
      for (const candidate of topCandidates) {
        await this.testCandidate(candidate);
      }

      // 5. Check ongoing tests for completion
      await this.checkTestCompletions();

      // 6. Retire underperforming strategies
      this.retireUnderperformers();

      log.info('Synthesis cycle completed', {
        candidatesGenerated: candidates.length,
        candidatesTested: topCandidates.length,
        activeTests: this.activeTests.size,
      });

    } catch (error) {
      log.error('Synthesis cycle failed', { error });
    }
  }

  /**
   * Register a bot for synthesis
   */
  public registerBot(bot: Bot): void {
    this.botRegistry.set(bot.id, bot);
    log.debug('Bot registered for synthesis', { botId: bot.id });
  }

  /**
   * Generate synthesis candidates
   */
  private generateCandidates(): SynthesisCandidate[] {
    const candidates: SynthesisCandidate[] = [];
    const bots = Array.from(this.botRegistry.values());

    if (bots.length < this.config.minBotsForSynthesis) {
      return candidates;
    }

    // Method 1: Ensemble Voting
    candidates.push(...this.generateVotingEnsembles(bots));

    // Method 2: Weighted Ensemble
    candidates.push(...this.generateWeightedEnsembles(bots));

    // Method 3: Regime-Specialized
    candidates.push(...this.generateRegimeSpecialized(bots));

    // Method 4: Fingerprint Crossover
    candidates.push(...this.generateFingerprintCrossovers(bots));

    // Method 5: Risk-Optimized
    candidates.push(...this.generateRiskOptimized(bots));

    return candidates;
  }

  /**
   * Generate voting ensemble candidates
   */
  private generateVotingEnsembles(bots: Bot[]): SynthesisCandidate[] {
    const candidates: SynthesisCandidate[] = [];

    // Select top performing bots
    const sortedBots = [...bots].sort(
      (a, b) => b.performance.winRate - a.performance.winRate
    );

    // Create ensembles of different sizes
    for (let size = 3; size <= Math.min(5, sortedBots.length); size++) {
      const selectedBots = sortedBots.slice(0, size);
      const avgWinRate =
        selectedBots.reduce((sum, b) => sum + b.performance.winRate, 0) / size;

      candidates.push({
        id: uuidv4(),
        method: 'ensemble_voting',
        inputs: selectedBots.map((b) => b.id),
        expectedPerformance: avgWinRate * 1.05, // Expect slight improvement
        reasoning: `Majority voting ensemble of top ${size} performers`,
      });
    }

    return candidates;
  }

  /**
   * Generate weighted ensemble candidates
   */
  private generateWeightedEnsembles(bots: Bot[]): SynthesisCandidate[] {
    const candidates: SynthesisCandidate[] = [];

    // Weight by Sharpe ratio
    const botsWithSharpe = bots.filter((b) => b.performance.sharpeRatio > 0);

    if (botsWithSharpe.length >= 3) {
      const totalSharpe = botsWithSharpe.reduce(
        (sum, b) => sum + b.performance.sharpeRatio,
        0
      );

      const weights: Record<string, number> = {};
      for (const bot of botsWithSharpe) {
        weights[bot.id] = bot.performance.sharpeRatio / totalSharpe;
      }

      const weightedAvgWinRate = botsWithSharpe.reduce(
        (sum, b) => sum + b.performance.winRate * weights[b.id],
        0
      );

      candidates.push({
        id: uuidv4(),
        method: 'ensemble_weighted',
        inputs: botsWithSharpe.map((b) => b.id),
        weights,
        expectedPerformance: weightedAvgWinRate * 1.08,
        reasoning: 'Sharpe-ratio weighted ensemble for risk-adjusted returns',
      });
    }

    // Weight by profit factor
    const botsWithPF = bots.filter((b) => b.performance.profitFactor > 1);

    if (botsWithPF.length >= 3) {
      const totalPF = botsWithPF.reduce(
        (sum, b) => sum + b.performance.profitFactor,
        0
      );

      const weights: Record<string, number> = {};
      for (const bot of botsWithPF) {
        weights[bot.id] = bot.performance.profitFactor / totalPF;
      }

      candidates.push({
        id: uuidv4(),
        method: 'ensemble_weighted',
        inputs: botsWithPF.map((b) => b.id),
        weights,
        expectedPerformance: 0.55, // Conservative estimate
        reasoning: 'Profit-factor weighted ensemble',
      });
    }

    return candidates;
  }

  /**
   * Generate regime-specialized candidates
   */
  private generateRegimeSpecialized(bots: Bot[]): SynthesisCandidate[] {
    const candidates: SynthesisCandidate[] = [];

    // Group bots by preferred regime
    const regimeGroups: Map<MarketRegime, Bot[]> = new Map();

    for (const bot of bots) {
      for (const regime of bot.fingerprint.preferredRegimes) {
        if (!regimeGroups.has(regime)) {
          regimeGroups.set(regime, []);
        }
        regimeGroups.get(regime)!.push(bot);
      }
    }

    // Create specialized ensembles for each regime
    for (const [regime, regimeBots] of regimeGroups) {
      if (regimeBots.length >= 2) {
        candidates.push({
          id: uuidv4(),
          method: 'regime_specialized',
          inputs: regimeBots.slice(0, 5).map((b) => b.id),
          targetRegimes: [regime],
          expectedPerformance: 0.58, // Higher expectation for specialized
          reasoning: `Specialized ensemble for ${regime} market regime`,
        });
      }
    }

    return candidates;
  }

  /**
   * Generate fingerprint crossover candidates
   */
  private generateFingerprintCrossovers(bots: Bot[]): SynthesisCandidate[] {
    const candidates: SynthesisCandidate[] = [];

    // Find bots with complementary fingerprints
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const bot1 = bots[i];
        const bot2 = bots[j];

        // Check if fingerprints are complementary
        const complementary = this.areComplementary(
          bot1.fingerprint,
          bot2.fingerprint
        );

        if (complementary) {
          candidates.push({
            id: uuidv4(),
            method: 'fingerprint_crossover',
            inputs: [bot1.id, bot2.id],
            expectedPerformance:
              (bot1.performance.winRate + bot2.performance.winRate) / 2 + 0.03,
            reasoning: `Complementary fingerprint crossover: ${bot1.name} + ${bot2.name}`,
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Generate risk-optimized candidates
   */
  private generateRiskOptimized(bots: Bot[]): SynthesisCandidate[] {
    const candidates: SynthesisCandidate[] = [];

    // Select bots with low drawdown
    const lowDrawdownBots = bots
      .filter((b) => b.performance.maxDrawdown < 0.15)
      .sort((a, b) => a.performance.maxDrawdown - b.performance.maxDrawdown);

    if (lowDrawdownBots.length >= 3) {
      candidates.push({
        id: uuidv4(),
        method: 'risk_optimized',
        inputs: lowDrawdownBots.slice(0, 5).map((b) => b.id),
        expectedPerformance: 0.52, // Conservative but stable
        reasoning: 'Low-drawdown optimized ensemble for capital preservation',
      });
    }

    return candidates;
  }

  /**
   * Check if two fingerprints are complementary
   */
  private areComplementary(fp1: BotFingerprint, fp2: BotFingerprint): boolean {
    // Different strategy types
    const typesOverlap = fp1.strategyType.filter((t) =>
      fp2.strategyType.includes(t)
    );
    if (typesOverlap.length === fp1.strategyType.length) {
      return false; // Too similar
    }

    // Different preferred regimes
    const regimesOverlap = fp1.preferredRegimes.filter((r) =>
      fp2.preferredRegimes.includes(r)
    );
    if (regimesOverlap.length === 0) {
      return true; // Completely different regime preferences = complementary
    }

    // One is weak where other is strong
    const fp1WeakInFp2Strong = fp1.weakRegimes.filter((r) =>
      fp2.preferredRegimes.includes(r)
    );
    const fp2WeakInFp1Strong = fp2.weakRegimes.filter((r) =>
      fp1.preferredRegimes.includes(r)
    );

    return fp1WeakInFp2Strong.length > 0 || fp2WeakInFp1Strong.length > 0;
  }

  /**
   * Score and rank candidates
   */
  private scoreCandidates(candidates: SynthesisCandidate[]): SynthesisCandidate[] {
    // Score based on:
    // - Expected performance
    // - Novelty (haven't tried similar combination)
    // - Input bot quality

    const scored = candidates.map((candidate) => {
      let score = candidate.expectedPerformance;

      // Bonus for diverse inputs
      const inputBots = candidate.inputs
        .map((id) => this.botRegistry.get(id))
        .filter((b): b is Bot => b !== undefined);

      const uniqueStrategies = new Set(
        inputBots.flatMap((b) => b.fingerprint.strategyType)
      );
      score += uniqueStrategies.size * 0.02;

      // Penalty if we've tried similar before
      const similarAttempts = this.results.filter(
        (r) =>
          r.inputBots.sort().join(',') === candidate.inputs.sort().join(',')
      );
      score -= similarAttempts.length * 0.1;

      return { candidate, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map((s) => s.candidate);
  }

  /**
   * Test a synthesis candidate
   */
  private async testCandidate(candidate: SynthesisCandidate): Promise<void> {
    log.info('Testing synthesis candidate', {
      method: candidate.method,
      inputs: candidate.inputs,
    });

    this.candidates.set(candidate.id, candidate);

    // Create ensemble from candidate
    const ensemble = this.createEnsembleFromCandidate(candidate);

    if (ensemble) {
      this.ensembleRegistry.set(ensemble.id, ensemble);
      this.activeTests.set(candidate.id, {
        startedAt: new Date(),
        testResult: {
          testType: 'paper_trade',
          startDate: new Date(),
        },
      });

      this.metrics.activeExperiments++;
      this.emit('test:started', candidate, ensemble);
    }
  }

  /**
   * Create ensemble from candidate
   */
  private createEnsembleFromCandidate(
    candidate: SynthesisCandidate
  ): Ensemble | null {
    const inputBots = candidate.inputs
      .map((id) => this.botRegistry.get(id))
      .filter((b): b is Bot => b !== undefined);

    if (inputBots.length < 2) {
      return null;
    }

    const ensemble: Ensemble = {
      id: uuidv4(),
      name: `Synthesis_${candidate.method}_${Date.now()}`,
      description: candidate.reasoning,
      botIds: candidate.inputs,
      weights: candidate.weights ?? this.equalWeights(candidate.inputs),
      votingMethod:
        candidate.method === 'ensemble_voting' ? 'majority' : 'weighted',
      status: 'testing',
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        avgHoldingPeriod: 0,
        lastUpdated: new Date(),
      },
      createdAt: new Date(),
      createdBy: 'synthesis_engine',
    };

    return ensemble;
  }

  /**
   * Generate equal weights
   */
  private equalWeights(inputs: string[]): Record<string, number> {
    const weight = 1 / inputs.length;
    const weights: Record<string, number> = {};
    for (const id of inputs) {
      weights[id] = weight;
    }
    return weights;
  }

  /**
   * Check test completions
   */
  private async checkTestCompletions(): Promise<void> {
    const testDurationMs = this.config.testDurationDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const [candidateId, test] of this.activeTests) {
      const elapsed = now - test.startedAt.getTime();

      if (elapsed >= testDurationMs) {
        await this.completeTest(candidateId);
      }
    }
  }

  /**
   * Complete a test
   */
  private async completeTest(candidateId: string): Promise<void> {
    const candidate = this.candidates.get(candidateId);
    const test = this.activeTests.get(candidateId);

    if (!candidate || !test) return;

    // Get ensemble performance
    const ensemble = Array.from(this.ensembleRegistry.values()).find(
      (e) =>
        e.botIds.sort().join(',') === candidate.inputs.sort().join(',') &&
        e.status === 'testing'
    );

    if (!ensemble) return;

    // Create synthesis result
    const testResult: TestResult = {
      testType: 'paper_trade',
      startDate: test.startedAt,
      endDate: new Date(),
      performance: ensemble.performance,
      regimesCovered: [], // Would be populated from actual test data
      passed: ensemble.performance.winRate >= this.config.promotionThreshold,
    };

    const result: SynthesisResult = {
      id: uuidv4(),
      inputBots: candidate.inputs,
      inputStrategies: [],
      outputType: 'ensemble',
      outputId: ensemble.id,
      synthesisMethod: candidate.method,
      testResults: [testResult],
      promoted: testResult.passed,
      createdAt: new Date(),
    };

    this.results.push(result);
    this.metrics.totalSynthesized++;

    // Handle result
    if (testResult.passed) {
      ensemble.status = 'active';
      this.metrics.successfulPromotions++;

      if (ensemble.performance.winRate > this.metrics.bestWinRate) {
        this.metrics.bestWinRate = ensemble.performance.winRate;
      }

      log.info('Synthesis promoted to active', {
        ensembleId: ensemble.id,
        winRate: ensemble.performance.winRate,
      });

      timeGovernor.recordStrategySynthesis();
      this.emit('synthesis:promoted', result, ensemble);
    } else {
      ensemble.status = 'retired';

      log.info('Synthesis retired after testing', {
        ensembleId: ensemble.id,
        winRate: ensemble.performance.winRate,
      });

      this.emit('synthesis:retired', result, ensemble);
    }

    // Cleanup
    this.activeTests.delete(candidateId);
    this.candidates.delete(candidateId);
    this.metrics.activeExperiments--;
  }

  /**
   * Retire underperforming strategies
   */
  private retireUnderperformers(): void {
    for (const ensemble of this.ensembleRegistry.values()) {
      if (
        ensemble.status === 'active' &&
        ensemble.performance.totalTrades >= 50 &&
        ensemble.performance.winRate < this.config.retirementThreshold
      ) {
        ensemble.status = 'retired';
        this.metrics.retiredStrategies++;

        log.info('Active ensemble retired due to underperformance', {
          ensembleId: ensemble.id,
          winRate: ensemble.performance.winRate,
        });

        this.emit('ensemble:retired', ensemble);
      }
    }
  }

  /**
   * Update ensemble performance (called when trades complete)
   */
  public updateEnsemblePerformance(
    ensembleId: string,
    performance: Partial<BotPerformance>
  ): void {
    const ensemble = this.ensembleRegistry.get(ensembleId);
    if (ensemble) {
      ensemble.performance = {
        ...ensemble.performance,
        ...performance,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Get active ensembles
   */
  public getActiveEnsembles(): Ensemble[] {
    return Array.from(this.ensembleRegistry.values()).filter(
      (e) => e.status === 'active'
    );
  }

  /**
   * Get synthesis results
   */
  public getSynthesisResults(): SynthesisResult[] {
    return [...this.results];
  }

  /**
   * Get metrics
   */
  public getMetrics() {
    return { ...this.metrics };
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
        totalSynthesized: this.metrics.totalSynthesized,
        successfulPromotions: this.metrics.successfulPromotions,
        retiredStrategies: this.metrics.retiredStrategies,
        activeExperiments: this.metrics.activeExperiments,
        bestWinRate: this.metrics.bestWinRate,
        registeredBots: this.botRegistry.size,
        activeEnsembles: this.getActiveEnsembles().length,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Recursive Synthesis Engine...');

    if (this.synthesisInterval) {
      clearInterval(this.synthesisInterval);
      this.synthesisInterval = null;
    }

    this.status = 'offline';
  }
}

// Export singleton
export const recursiveSynthesisEngine = new RecursiveSynthesisEngine();

export default RecursiveSynthesisEngine;

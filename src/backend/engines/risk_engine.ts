/**
 * TIME — Meta-Intelligence Trading Governor
 * Risk Engine + Emergency Brake
 *
 * Central risk control system that:
 * - Enforces global limits
 * - Detects anomalies
 * - Detects slippage
 * - Detects latency spikes
 * - Detects bot misbehavior
 * - Halts trading when needed
 * - Logs all actions
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent, timeGovernor } from '../core/time_governor';
import config from '../config';
import {
  RiskDecision,
  RiskDecisionType,
  RiskAction,
  RiskLimits,
  Signal,
  Trade,
  SystemHealth,
} from '../types';

const log = loggers.risk;

// Risk monitoring state
interface RiskState {
  dailyPnL: number;
  openPositions: number;
  totalExposure: number;
  maxDrawdownReached: number;
  lastSlippageEvent: Date | null;
  lastLatencySpike: Date | null;
  emergencyBrakeActive: boolean;
  haltedBots: Set<string>;
}

// Risk check result
interface RiskCheckResult {
  allowed: boolean;
  action: RiskAction;
  decisions: RiskDecision[];
  modifiedSignal?: Signal;
  reason?: string;
}

/**
 * Risk Engine
 *
 * Protects TIME from catastrophic losses by enforcing
 * risk limits at all levels.
 */
export class RiskEngine extends EventEmitter implements TIMEComponent {
  public readonly name = 'RiskEngine';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private limits: RiskLimits;
  private state: RiskState;
  private decisions: RiskDecision[] = [];
  private anomalyDetector: AnomalyDetector;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor(limits?: Partial<RiskLimits>) {
    super();

    this.limits = {
      maxPositionSize: limits?.maxPositionSize ?? config.riskDefaults.maxPositionSize,
      maxPortfolioRisk: limits?.maxPortfolioRisk ?? config.riskDefaults.maxPortfolioRisk,
      maxDrawdown: limits?.maxDrawdown ?? config.riskDefaults.maxDrawdown,
      maxDailyLoss: limits?.maxDailyLoss ?? config.riskDefaults.maxDailyLoss,
      maxCorrelation: limits?.maxCorrelation ?? config.riskDefaults.maxCorrelation,
      maxSlippage: limits?.maxSlippage ?? config.riskDefaults.maxSlippage,
      maxLatency: limits?.maxLatency ?? config.riskDefaults.maxLatency,
    };

    this.state = {
      dailyPnL: 0,
      openPositions: 0,
      totalExposure: 0,
      maxDrawdownReached: 0,
      lastSlippageEvent: null,
      lastLatencySpike: null,
      emergencyBrakeActive: false,
      haltedBots: new Set(),
    };

    this.anomalyDetector = new AnomalyDetector();
  }

  /**
   * Initialize the risk engine
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Risk Engine...', { limits: this.limits });

    // Start monitoring loop
    this.startMonitoring();

    this.status = 'online';
    log.info('Risk Engine initialized');
  }

  /**
   * Start the risk monitoring loop
   */
  private startMonitoring(): void {
    if (this.monitorInterval) return;

    // Monitor every 10 seconds
    this.monitorInterval = setInterval(() => {
      this.runRiskMonitoring();
    }, 10 * 1000);

    log.info('Risk monitoring started');
  }

  /**
   * Run risk monitoring checks
   */
  private async runRiskMonitoring(): Promise<void> {
    // Check daily loss limit
    if (this.state.dailyPnL < -this.limits.maxDailyLoss) {
      await this.triggerEmergencyBrake('Daily loss limit exceeded');
    }

    // Check drawdown
    if (this.state.maxDrawdownReached > this.limits.maxDrawdown) {
      await this.triggerEmergencyBrake('Maximum drawdown exceeded');
    }

    // Check portfolio exposure
    if (this.state.totalExposure > this.limits.maxPortfolioRisk) {
      this.createDecision(
        'position_size_limit',
        'reduce_size',
        'Portfolio exposure exceeds limit',
        'high',
        [],
        []
      );
    }

    // Run anomaly detection
    const anomalies = this.anomalyDetector.detectAnomalies();
    for (const anomaly of anomalies) {
      this.createDecision(
        'anomaly_detected',
        anomaly.severity === 'critical' ? 'halt_all' : 'reduce_size',
        anomaly.description,
        anomaly.severity,
        [],
        []
      );
    }
  }

  /**
   * Check if a signal/trade is allowed
   */
  public checkSignal(
    signal: Signal,
    currentPortfolio: { positions: number; exposure: number }
  ): RiskCheckResult {
    const decisions: RiskDecision[] = [];
    let allowed = true;
    let action: RiskAction = 'allow';
    let modifiedSignal: Signal | undefined;

    // Check emergency brake
    if (this.state.emergencyBrakeActive) {
      decisions.push(
        this.createDecision(
          'emergency_brake',
          'reject',
          'Emergency brake is active',
          'critical',
          [signal.botId],
          []
        )
      );
      return { allowed: false, action: 'reject', decisions, reason: 'Emergency brake active' };
    }

    // Check if bot is halted
    if (this.state.haltedBots.has(signal.botId)) {
      decisions.push(
        this.createDecision(
          'bot_misbehavior',
          'reject',
          'Bot is currently halted',
          'medium',
          [signal.botId],
          []
        )
      );
      return { allowed: false, action: 'reject', decisions, reason: 'Bot halted' };
    }

    // Check position limits
    if (currentPortfolio.positions >= 10) { // Max 10 positions
      decisions.push(
        this.createDecision(
          'position_size_limit',
          'reject',
          'Maximum position count reached',
          'medium',
          [signal.botId],
          []
        )
      );
      allowed = false;
      action = 'reject';
    }

    // Check exposure limits
    if (currentPortfolio.exposure + 0.02 > this.limits.maxPortfolioRisk) {
      decisions.push(
        this.createDecision(
          'position_size_limit',
          'reduce_size',
          'Adding position would exceed portfolio risk limit',
          'high',
          [signal.botId],
          []
        )
      );

      // Calculate reduced size
      const availableRisk = this.limits.maxPortfolioRisk - currentPortfolio.exposure;
      if (availableRisk > 0.005) { // Minimum 0.5% position
        modifiedSignal = { ...signal };
        action = 'reduce_size';
      } else {
        allowed = false;
        action = 'reject';
      }
    }

    // Check signal confidence
    if (signal.confidence < 0.5) {
      decisions.push(
        this.createDecision(
          'position_size_limit',
          'reduce_size',
          'Low confidence signal - reducing size',
          'low',
          [signal.botId],
          []
        )
      );
      modifiedSignal = modifiedSignal ?? { ...signal };
      action = 'reduce_size';
    }

    return { allowed, action, decisions, modifiedSignal };
  }

  /**
   * Record slippage event
   */
  public recordSlippage(expected: number, actual: number, symbol: string): void {
    const slippage = Math.abs(actual - expected) / expected;

    if (slippage > this.limits.maxSlippage) {
      this.state.lastSlippageEvent = new Date();

      this.createDecision(
        'slippage_detected',
        'reduce_size',
        `High slippage detected on ${symbol}: ${(slippage * 100).toFixed(2)}%`,
        slippage > this.limits.maxSlippage * 2 ? 'high' : 'medium',
        [],
        []
      );

      log.warn('High slippage detected', {
        symbol,
        expected,
        actual,
        slippage: `${(slippage * 100).toFixed(2)}%`,
      });
    }
  }

  /**
   * Record latency event
   */
  public recordLatency(latencyMs: number, operation: string): void {
    if (latencyMs > this.limits.maxLatency) {
      this.state.lastLatencySpike = new Date();

      const severity = latencyMs > this.limits.maxLatency * 3 ? 'high' : 'medium';

      this.createDecision(
        'latency_spike',
        severity === 'high' ? 'reduce_size' : 'allow',
        `Latency spike detected: ${latencyMs}ms on ${operation}`,
        severity,
        [],
        []
      );

      log.warn('Latency spike detected', {
        operation,
        latencyMs,
        limit: this.limits.maxLatency,
      });
    }
  }

  /**
   * Record bot misbehavior
   */
  public recordBotMisbehavior(botId: string, reason: string): void {
    this.createDecision(
      'bot_misbehavior',
      'halt_bot',
      `Bot misbehavior: ${reason}`,
      'high',
      [botId],
      []
    );

    this.state.haltedBots.add(botId);

    log.warn('Bot halted for misbehavior', { botId, reason });
    this.emit('bot:halted', botId, reason);
  }

  /**
   * Unhalt a bot
   */
  public unhaltBot(botId: string): void {
    if (this.state.haltedBots.has(botId)) {
      this.state.haltedBots.delete(botId);
      log.info('Bot unhalted', { botId });
      this.emit('bot:unhalted', botId);
    }
  }

  /**
   * Trigger emergency brake
   */
  public async triggerEmergencyBrake(reason: string): Promise<void> {
    if (this.state.emergencyBrakeActive) {
      log.warn('Emergency brake already active');
      return;
    }

    log.error('EMERGENCY BRAKE TRIGGERED', { reason });

    this.state.emergencyBrakeActive = true;

    this.createDecision(
      'emergency_brake',
      'halt_all',
      `Emergency brake triggered: ${reason}`,
      'critical',
      [],
      []
    );

    // Notify TIME Governor
    timeGovernor.emit('risk:alert', { severity: 'critical', reason });

    this.emit('emergency:brake', reason);
  }

  /**
   * Release emergency brake
   */
  public releaseEmergencyBrake(authorizedBy: string): void {
    if (!this.state.emergencyBrakeActive) {
      log.warn('Emergency brake not active');
      return;
    }

    log.info('Emergency brake released', { authorizedBy });

    this.state.emergencyBrakeActive = false;

    this.createDecision(
      'emergency_brake',
      'allow',
      `Emergency brake released by ${authorizedBy}`,
      'low',
      [],
      []
    );

    this.emit('emergency:released', authorizedBy);
  }

  /**
   * Update daily PnL
   */
  public updateDailyPnL(pnl: number): void {
    this.state.dailyPnL = pnl;

    if (pnl < 0) {
      const drawdown = Math.abs(pnl);
      if (drawdown > this.state.maxDrawdownReached) {
        this.state.maxDrawdownReached = drawdown;
      }
    }
  }

  /**
   * Update position count
   */
  public updatePositions(count: number, exposure: number): void {
    this.state.openPositions = count;
    this.state.totalExposure = exposure;
  }

  /**
   * Reset daily stats (call at market open)
   */
  public resetDailyStats(): void {
    this.state.dailyPnL = 0;
    log.info('Daily risk stats reset');
  }

  /**
   * Create a risk decision
   */
  private createDecision(
    type: RiskDecisionType,
    action: RiskAction,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    affectedBots: string[],
    affectedTrades: string[]
  ): RiskDecision {
    const decision: RiskDecision = {
      id: uuidv4(),
      timestamp: new Date(),
      type,
      action,
      reason,
      severity,
      affectedBots,
      affectedTrades,
    };

    this.decisions.push(decision);

    log.info('Risk decision created', {
      type,
      action,
      severity,
      reason,
    });

    this.emit('decision:created', decision);

    return decision;
  }

  /**
   * Get risk state
   */
  public getState(): Omit<RiskState, 'haltedBots'> & { haltedBots: string[] } {
    const { haltedBots, ...rest } = this.state;
    return {
      ...rest,
      haltedBots: Array.from(haltedBots),
    };
  }

  /**
   * Get recent decisions
   */
  public getRecentDecisions(limit: number = 50): RiskDecision[] {
    return this.decisions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get current limits
   */
  public getLimits(): RiskLimits {
    return { ...this.limits };
  }

  /**
   * Update limits
   */
  public updateLimits(newLimits: Partial<RiskLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    log.info('Risk limits updated', { limits: this.limits });
  }

  /**
   * Get component health
   */
  public getHealth(): SystemHealth {
    return {
      component: this.name,
      status: this.state.emergencyBrakeActive ? 'degraded' : this.status,
      lastCheck: new Date(),
      metrics: {
        emergencyBrakeActive: this.state.emergencyBrakeActive ? 1 : 0,
        haltedBots: this.state.haltedBots.size,
        totalDecisions: this.decisions.length,
        dailyPnL: this.state.dailyPnL,
        maxDrawdown: this.state.maxDrawdownReached,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Risk Engine...');

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.status = 'offline';
  }
}

/**
 * Anomaly Detector
 * Detects unusual patterns in trading activity
 */
class AnomalyDetector {
  private dataPoints: number[] = [];
  private readonly windowSize = 100;

  /**
   * Add data point
   */
  public addDataPoint(value: number): void {
    this.dataPoints.push(value);
    if (this.dataPoints.length > this.windowSize) {
      this.dataPoints.shift();
    }
  }

  /**
   * Detect anomalies
   */
  public detectAnomalies(): Array<{
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const anomalies: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    if (this.dataPoints.length < 10) {
      return anomalies;
    }

    // Calculate statistics
    const mean = this.dataPoints.reduce((a, b) => a + b, 0) / this.dataPoints.length;
    const variance =
      this.dataPoints.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      this.dataPoints.length;
    const stdDev = Math.sqrt(variance);

    // Check for outliers (more than 3 standard deviations)
    const latest = this.dataPoints[this.dataPoints.length - 1];
    if (latest !== undefined) {
      const zScore = Math.abs(latest - mean) / (stdDev || 1);

      if (zScore > 4) {
        anomalies.push({
          description: `Extreme outlier detected (${zScore.toFixed(2)} std devs)`,
          severity: 'critical',
        });
      } else if (zScore > 3) {
        anomalies.push({
          description: `Significant outlier detected (${zScore.toFixed(2)} std devs)`,
          severity: 'high',
        });
      }
    }

    return anomalies;
  }
}

// Export singleton
export const riskEngine = new RiskEngine();

export default RiskEngine;

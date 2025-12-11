/**
 * TIME — Meta-Intelligence Trading Governor
 * The Central Governing System
 *
 * TIME is not a bot. TIME is not a platform. TIME is not a tool.
 * TIME is a meta-intelligence governor — a self-evolving, self-expanding,
 * recursive learning organism.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import {
  EvolutionMode,
  EvolutionState,
  SystemHealth,
  MarketRegime,
  LearningInsight,
} from '../types';

const log = loggers.governor;

// Component interface - all engines must implement this
export interface TIMEComponent {
  name: string;
  status: 'online' | 'degraded' | 'offline' | 'building';
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getHealth(): SystemHealth;
}

// Events emitted by TIME Governor
export interface TIMEGovernorEvents {
  'evolution:mode_changed': (state: EvolutionState) => void;
  'regime:changed': (regime: MarketRegime) => void;
  'learning:insight': (insight: LearningInsight) => void;
  'risk:alert': (decision: { severity: string; reason: string }) => void;
  'system:component_status': (health: SystemHealth) => void;
  'system:initialized': () => void;
  'system:shutdown': () => void;
}

/**
 * TIME Governor - The central nervous system of TIME
 *
 * Responsibilities:
 * - Coordinate all engines and components
 * - Manage evolution mode (controlled vs autonomous)
 * - Orchestrate learning across all sources
 * - Enforce risk limits globally
 * - Synthesize new strategies and bots
 * - Teach users in plain English
 * - Evolve and expand continuously
 */
export class TIMEGovernor extends EventEmitter {
  private static instance: TIMEGovernor | null = null;

  private readonly id: string;
  private components: Map<string, TIMEComponent> = new Map();
  private evolutionState: EvolutionState;
  private isInitialized: boolean = false;
  private currentRegime: MarketRegime = 'unknown';

  // Core metrics
  private metrics = {
    totalBotsAbsorbed: 0,
    totalTradesAnalyzed: 0,
    totalInsightsGenerated: 0,
    totalStrategiesSynthesized: 0,
    uptime: 0,
    lastEvolutionCycle: new Date(),
  };

  private constructor() {
    super();
    this.id = uuidv4();
    this.evolutionState = {
      mode: 'controlled',
      lastModeChange: new Date(),
      changedBy: 'system',
      reason: 'Initial startup',
    };

    log.info('TIME Governor instantiated', { id: this.id });
  }

  /**
   * Get the singleton instance of TIME Governor
   */
  public static getInstance(): TIMEGovernor {
    if (!TIMEGovernor.instance) {
      TIMEGovernor.instance = new TIMEGovernor();
    }
    return TIMEGovernor.instance;
  }

  /**
   * Initialize TIME Governor and all components
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('TIME Governor already initialized');
      return;
    }

    log.info('Initializing TIME Governor...');

    try {
      // Initialize all registered components
      for (const [name, component] of this.components) {
        log.info(`Initializing component: ${name}`);
        await component.initialize();
        this.emit('system:component_status', component.getHealth());
      }

      this.isInitialized = true;
      this.emit('system:initialized');
      log.info('TIME Governor initialized successfully');
    } catch (error) {
      log.error('Failed to initialize TIME Governor', { error });
      throw error;
    }
  }

  /**
   * Register a component with TIME Governor
   */
  public registerComponent(component: TIMEComponent): void {
    if (this.components.has(component.name)) {
      log.warn(`Component ${component.name} already registered, replacing...`);
    }
    this.components.set(component.name, component);
    log.info(`Component registered: ${component.name}`);
  }

  /**
   * Get a registered component
   */
  public getComponent<T extends TIMEComponent>(name: string): T | undefined {
    return this.components.get(name) as T | undefined;
  }

  /**
   * Set evolution mode
   */
  public setEvolutionMode(
    mode: EvolutionMode,
    changedBy: 'admin' | 'inactivity_failsafe' | 'system',
    reason: string
  ): void {
    const previousMode = this.evolutionState.mode;

    this.evolutionState = {
      mode,
      lastModeChange: new Date(),
      changedBy,
      reason,
    };

    log.info('Evolution mode changed', {
      from: previousMode,
      to: mode,
      changedBy,
      reason,
    });

    this.emit('evolution:mode_changed', this.evolutionState);
  }

  /**
   * Get current evolution state
   */
  public getEvolutionState(): EvolutionState {
    return { ...this.evolutionState };
  }

  /**
   * Get current evolution mode
   */
  public getEvolutionMode(): EvolutionMode {
    return this.evolutionState.mode;
  }

  /**
   * Check if in autonomous mode
   */
  public isAutonomous(): boolean {
    return this.evolutionState.mode === 'autonomous';
  }

  /**
   * Update current market regime
   */
  public setCurrentRegime(regime: MarketRegime): void {
    if (regime !== this.currentRegime) {
      const previousRegime = this.currentRegime;
      this.currentRegime = regime;

      log.info('Market regime changed', {
        from: previousRegime,
        to: regime,
      });

      this.emit('regime:changed', regime);
    }
  }

  /**
   * Get current market regime
   */
  public getCurrentRegime(): MarketRegime {
    return this.currentRegime;
  }

  /**
   * Record a learning insight
   */
  public recordInsight(insight: LearningInsight): void {
    this.metrics.totalInsightsGenerated++;
    this.emit('learning:insight', insight);
    log.debug('Learning insight recorded', { category: insight.category });
  }

  /**
   * Record bot absorption
   */
  public recordBotAbsorption(): void {
    this.metrics.totalBotsAbsorbed++;
  }

  /**
   * Record trade analysis
   */
  public recordTradeAnalysis(): void {
    this.metrics.totalTradesAnalyzed++;
  }

  /**
   * Record strategy synthesis
   */
  public recordStrategySynthesis(): void {
    this.metrics.totalStrategiesSynthesized++;
  }

  /**
   * Trigger evolution cycle (in autonomous mode)
   */
  public async runEvolutionCycle(): Promise<void> {
    if (!this.isAutonomous()) {
      log.debug('Evolution cycle skipped - not in autonomous mode');
      return;
    }

    log.info('Running autonomous evolution cycle...');
    this.metrics.lastEvolutionCycle = new Date();

    // In autonomous mode, TIME can:
    // 1. Analyze all bot performance
    // 2. Identify underperforming strategies
    // 3. Generate new synthesis combinations
    // 4. Retire weak strategies
    // 5. Promote strong strategies
    // 6. Adjust risk parameters
    // 7. Patch identified holes

    // This is the evolutionary heart - will be expanded
    log.info('Evolution cycle completed');
  }

  /**
   * Get system health for all components
   */
  public getSystemHealth(): SystemHealth[] {
    const health: SystemHealth[] = [];

    for (const component of this.components.values()) {
      health.push(component.getHealth());
    }

    return health;
  }

  /**
   * Get governor metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      componentsRegistered: this.components.size,
      isInitialized: this.isInitialized,
      currentRegime: this.currentRegime,
      evolutionMode: this.evolutionState.mode,
    };
  }

  /**
   * Shutdown TIME Governor
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down TIME Governor...');

    for (const [name, component] of this.components) {
      log.info(`Shutting down component: ${name}`);
      await component.shutdown();
    }

    this.emit('system:shutdown');
    this.isInitialized = false;
    log.info('TIME Governor shutdown complete');
  }
}

// Export singleton instance
export const timeGovernor = TIMEGovernor.getInstance();

export default TIMEGovernor;

/**
 * TIME Event Hub
 *
 * Central hub that connects all TIME components to the WebSocket realtime service.
 * Routes events from internal components to connected clients:
 *
 * - Listens to all TIME component events
 * - Transforms internal events to client-friendly formats
 * - Manages event priorities and throttling
 * - Provides event history for reconnecting clients
 *
 * The Event Hub is TIME's nervous system - carrying signals
 * from every organ to every watching eye.
 */

import { EventEmitter } from 'events';
import { TIMEComponent } from '../core/time_governor';
import {
  RealtimeService,
  TradeUpdate,
  RegimeUpdate,
  BotUpdate,
  InsightUpdate,
  SystemHealthUpdate,
  PriceUpdate,
  EvolutionUpdate,
  AlertUpdate,
  PortfolioUpdate,
} from './realtime_service';

// ============================================================
// TYPES
// ============================================================

export interface EventHubConfig {
  enableEventHistory: boolean;
  maxHistorySize: number;
  throttleInterval: number; // Minimum ms between same-type events
  batchPriceUpdates: boolean;
  priceBatchInterval: number;
}

interface ThrottleState {
  lastEmit: number;
  pendingData: any | null;
}

interface HistoryEntry {
  channel: string;
  event: string;
  data: any;
  timestamp: Date;
}

// ============================================================
// EVENT HUB CLASS
// ============================================================

export class EventHub extends EventEmitter implements TIMEComponent {
  public readonly name = 'EventHub';
  public readonly version = '1.0.0';

  private realtimeService: RealtimeService;
  private config: EventHubConfig;
  private throttleStates: Map<string, ThrottleState> = new Map();
  private eventHistory: HistoryEntry[] = [];
  private priceBatch: PriceUpdate[] = [];
  private priceBatchTimer: NodeJS.Timeout | null = null;
  private componentHealthMap: Map<string, SystemHealthUpdate> = new Map();

  constructor(realtimeService: RealtimeService, config?: Partial<EventHubConfig>) {
    super();

    this.realtimeService = realtimeService;

    this.config = {
      enableEventHistory: true,
      maxHistorySize: 1000,
      throttleInterval: 100, // 100ms default throttle
      batchPriceUpdates: true,
      priceBatchInterval: 250, // Batch prices every 250ms
      ...config,
    };
  }

  // ============================================================
  // COMPONENT REGISTRATION
  // ============================================================

  /**
   * Register a TIME component to route its events
   */
  registerComponent(component: EventEmitter & { name?: string }): void {
    const componentName = component.name || 'UnknownComponent';

    // Generic event forwarding for common patterns
    this.setupGenericListeners(component, componentName);

    // Component-specific listeners
    this.setupComponentSpecificListeners(component, componentName);

    console.log(`[EventHub] Registered component: ${componentName}`);
  }

  /**
   * Set up generic event listeners that work for any component
   */
  private setupGenericListeners(component: EventEmitter, componentName: string): void {
    // Health status events
    component.on('health:update', (data: any) => {
      this.handleHealthUpdate(componentName, data);
    });

    // Error events
    component.on('error', (error: Error) => {
      this.handleComponentError(componentName, error);
    });

    // Generic status events
    component.on('status:changed', (data: any) => {
      this.handleStatusChange(componentName, data);
    });
  }

  /**
   * Set up component-specific event listeners
   */
  private setupComponentSpecificListeners(component: EventEmitter, componentName: string): void {
    switch (componentName) {
      case 'RiskEngine':
        this.setupRiskEngineListeners(component);
        break;

      case 'RegimeDetector':
        this.setupRegimeDetectorListeners(component);
        break;

      case 'LearningEngine':
        this.setupLearningEngineListeners(component);
        break;

      case 'EvolutionController':
        this.setupEvolutionListeners(component);
        break;

      case 'BotManager':
        this.setupBotManagerListeners(component);
        break;

      case 'AttributionEngine':
        this.setupAttributionListeners(component);
        break;

      case 'BrokerManager':
        this.setupBrokerListeners(component);
        break;

      case 'TrainingSimulator':
        this.setupSimulatorListeners(component);
        break;

      case 'TeachingEngine':
        this.setupTeachingListeners(component);
        break;

      case 'RecursiveSynthesisEngine':
        this.setupSynthesisListeners(component);
        break;
    }
  }

  // ============================================================
  // COMPONENT-SPECIFIC LISTENERS
  // ============================================================

  private setupRiskEngineListeners(component: EventEmitter): void {
    component.on('risk:alert', (data: any) => {
      this.broadcastAlert({
        alertId: `risk_${Date.now()}`,
        type: 'risk',
        priority: data.severity || 'high',
        title: 'Risk Alert',
        message: data.message || 'Risk threshold exceeded',
        actionRequired: data.actionRequired || false,
        timestamp: new Date(),
      });
    });

    component.on('risk:emergency_brake', (data: any) => {
      this.broadcastAlert({
        alertId: `emergency_${Date.now()}`,
        type: 'risk',
        priority: 'critical',
        title: 'EMERGENCY BRAKE ACTIVATED',
        message: data.reason || 'All trading halted',
        actionRequired: true,
        timestamp: new Date(),
      });
    });

    component.on('portfolio:update', (data: any) => {
      this.broadcastPortfolio({
        totalValue: data.totalValue || 0,
        dailyPnL: data.dailyPnL || 0,
        dailyPnLPercent: data.dailyPnLPercent || 0,
        openPositions: data.openPositions || 0,
        buying_power: data.buyingPower || 0,
        marginUsed: data.marginUsed || 0,
        timestamp: new Date(),
      });
    });
  }

  private setupRegimeDetectorListeners(component: EventEmitter): void {
    component.on('regime:changed', (data: any) => {
      this.broadcastRegimeChange({
        symbol: data.symbol,
        previousRegime: data.previousRegime,
        newRegime: data.newRegime,
        confidence: data.confidence,
        timestamp: new Date(),
      });
    });

    component.on('regime:detected', (data: any) => {
      // Initial regime detection (not a change)
      this.realtimeService.broadcast('regime', 'detected', {
        symbol: data.symbol,
        regime: data.regime,
        confidence: data.confidence,
        timestamp: new Date(),
      });
    });
  }

  private setupLearningEngineListeners(component: EventEmitter): void {
    component.on('insight:generated', (data: any) => {
      this.broadcastInsight({
        insightId: data.id || `insight_${Date.now()}`,
        category: data.category || 'pattern',
        insight: data.insight,
        confidence: data.confidence,
        actionable: data.actionable || false,
        source: data.source || 'LearningEngine',
        timestamp: new Date(),
      });
    });

    component.on('pattern:discovered', (data: any) => {
      this.broadcastInsight({
        insightId: `pattern_${Date.now()}`,
        category: 'pattern',
        insight: `New pattern discovered: ${data.description}`,
        confidence: data.confidence,
        actionable: true,
        source: 'LearningEngine',
        timestamp: new Date(),
      });
    });

    component.on('learning:milestone', (data: any) => {
      this.broadcastAlert({
        alertId: `learning_${Date.now()}`,
        type: 'insight',
        priority: 'medium',
        title: 'Learning Milestone',
        message: data.message || 'New learning milestone reached',
        actionRequired: false,
        timestamp: new Date(),
      });
    });
  }

  private setupEvolutionListeners(component: EventEmitter): void {
    component.on('proposal:generated', (data: any) => {
      this.broadcastEvolution({
        type: 'proposal',
        proposalId: data.proposalId,
        strategyId: data.strategyId,
        description: data.description || 'New evolution proposal generated',
        currentMode: data.mode || 'controlled',
        timestamp: new Date(),
      });
    });

    component.on('proposal:approved', (data: any) => {
      this.broadcastEvolution({
        type: 'approved',
        proposalId: data.proposalId,
        strategyId: data.strategyId,
        description: data.description || 'Evolution proposal approved',
        currentMode: data.mode || 'controlled',
        timestamp: new Date(),
      });
    });

    component.on('proposal:rejected', (data: any) => {
      this.broadcastEvolution({
        type: 'rejected',
        proposalId: data.proposalId,
        description: data.reason || 'Evolution proposal rejected',
        currentMode: data.mode || 'controlled',
        timestamp: new Date(),
      });
    });

    component.on('mode:changed', (data: any) => {
      this.broadcastEvolution({
        type: 'mode_change',
        description: `Evolution mode changed to ${data.newMode}`,
        currentMode: data.newMode,
        timestamp: new Date(),
      });
    });

    component.on('auto:evolved', (data: any) => {
      this.broadcastEvolution({
        type: 'auto_evolved',
        strategyId: data.strategyId,
        description: data.description || 'Autonomous evolution applied',
        currentMode: 'autonomous',
        timestamp: new Date(),
      });
    });
  }

  private setupBotManagerListeners(component: EventEmitter): void {
    component.on('bot:activated', (data: any) => {
      this.broadcastBotUpdate({
        botId: data.botId,
        name: data.name,
        status: 'active',
        timestamp: new Date(),
      } as BotUpdate & { timestamp: Date });
    });

    component.on('bot:deactivated', (data: any) => {
      this.broadcastBotUpdate({
        botId: data.botId,
        name: data.name,
        status: 'paused',
      });
    });

    component.on('bot:performance', (data: any) => {
      this.broadcastBotUpdate({
        botId: data.botId,
        name: data.name,
        status: 'active',
        performance: {
          winRate: data.winRate,
          pnlToday: data.pnlToday,
          activeTrades: data.activeTrades,
        },
      });
    });

    component.on('bot:signal', (data: any) => {
      this.realtimeService.broadcast('signals', 'new', {
        botId: data.botId,
        symbol: data.symbol,
        direction: data.direction,
        strength: data.strength,
        timestamp: new Date(),
      });
    });
  }

  private setupAttributionListeners(component: EventEmitter): void {
    component.on('trade:attributed', (data: any) => {
      this.broadcastTrade({
        tradeId: data.tradeId,
        symbol: data.symbol,
        direction: data.direction,
        action: data.action,
        price: data.price,
        quantity: data.quantity,
        pnl: data.pnl,
        botId: data.attribution?.botId,
        strategyId: data.attribution?.strategyId,
        timestamp: new Date(),
      });
    });
  }

  private setupBrokerListeners(component: EventEmitter): void {
    component.on('trade:opened', (data: any) => {
      this.broadcastTrade({
        tradeId: data.tradeId,
        symbol: data.symbol,
        direction: data.direction,
        action: 'opened',
        price: data.entryPrice,
        quantity: data.quantity,
        botId: data.botId,
        strategyId: data.strategyId,
        timestamp: new Date(),
      });
    });

    component.on('trade:closed', (data: any) => {
      this.broadcastTrade({
        tradeId: data.tradeId,
        symbol: data.symbol,
        direction: data.direction,
        action: 'closed',
        price: data.exitPrice,
        quantity: data.quantity,
        pnl: data.pnl,
        botId: data.botId,
        strategyId: data.strategyId,
        timestamp: new Date(),
      });
    });

    component.on('price:update', (data: any) => {
      this.handlePriceUpdate({
        symbol: data.symbol,
        bid: data.bid,
        ask: data.ask,
        last: data.last,
        volume: data.volume,
        change: data.change,
        changePercent: data.changePercent,
        timestamp: new Date(),
      });
    });

    component.on('broker:connected', (data: any) => {
      this.handleHealthUpdate('BrokerManager', {
        status: 'healthy',
        message: `Connected to ${data.brokerName}`,
      });
    });

    component.on('broker:disconnected', (data: any) => {
      this.handleHealthUpdate('BrokerManager', {
        status: 'degraded',
        message: `Disconnected from ${data.brokerName}`,
      });
    });
  }

  private setupSimulatorListeners(component: EventEmitter): void {
    component.on('simulation:trade', (data: any) => {
      this.realtimeService.broadcast('trades', 'simulation', {
        ...data,
        isSimulated: true,
        timestamp: new Date(),
      });
    });

    component.on('simulation:performance', (data: any) => {
      this.realtimeService.broadcast('strategies', 'simulation_update', {
        strategyId: data.strategyId,
        performance: data.performance,
        timestamp: new Date(),
      });
    });
  }

  private setupTeachingListeners(component: EventEmitter): void {
    component.on('explanation:generated', (data: any) => {
      this.realtimeService.broadcast('insights', 'explanation', {
        topic: data.topic,
        mode: data.mode,
        explanation: data.explanation,
        timestamp: new Date(),
      });
    });
  }

  private setupSynthesisListeners(component: EventEmitter): void {
    component.on('strategy:synthesized', (data: any) => {
      this.broadcastAlert({
        alertId: `synthesis_${Date.now()}`,
        type: 'evolution',
        priority: 'high',
        title: 'New Strategy Synthesized',
        message: `Created ${data.name} from ${data.parentCount} parent strategies`,
        actionRequired: data.requiresApproval,
        timestamp: new Date(),
      });
    });

    component.on('synthesis:progress', (data: any) => {
      this.realtimeService.broadcast('strategies', 'synthesis_progress', {
        progress: data.progress,
        stage: data.stage,
        timestamp: new Date(),
      });
    });
  }

  // ============================================================
  // BROADCAST WRAPPERS WITH THROTTLING
  // ============================================================

  private broadcastTrade(update: TradeUpdate): void {
    this.throttledBroadcast('trade', () => {
      this.realtimeService.broadcastTrade(update);
      this.addToHistory('trades', 'update', update);
    });
  }

  private broadcastRegimeChange(update: RegimeUpdate): void {
    // Regime changes are important, no throttling
    this.realtimeService.broadcastRegimeChange(update);
    this.addToHistory('regime', 'change', update);
  }

  private broadcastBotUpdate(update: BotUpdate): void {
    this.throttledBroadcast(`bot_${update.botId}`, () => {
      this.realtimeService.broadcastBotUpdate(update);
      this.addToHistory('bots', 'update', update);
    });
  }

  private broadcastInsight(update: InsightUpdate): void {
    this.realtimeService.broadcastInsight(update);
    this.addToHistory('insights', 'new', update);
  }

  private broadcastAlert(update: AlertUpdate): void {
    // Alerts are never throttled
    this.realtimeService.broadcastAlert(update);
    this.addToHistory('alerts', update.priority, update);
  }

  private broadcastPortfolio(update: PortfolioUpdate): void {
    this.throttledBroadcast('portfolio', () => {
      this.realtimeService.broadcastPortfolio(update);
    });
  }

  private broadcastEvolution(update: EvolutionUpdate): void {
    // Evolution updates are important, no throttling
    this.realtimeService.broadcastEvolution(update);
    this.addToHistory('evolution', update.type, update);
  }

  // ============================================================
  // PRICE UPDATE HANDLING (BATCHED)
  // ============================================================

  private handlePriceUpdate(update: PriceUpdate): void {
    if (this.config.batchPriceUpdates) {
      this.priceBatch.push(update);

      if (!this.priceBatchTimer) {
        this.priceBatchTimer = setTimeout(() => {
          this.flushPriceBatch();
        }, this.config.priceBatchInterval);
      }
    } else {
      this.realtimeService.broadcastPrice(update);
    }
  }

  private flushPriceBatch(): void {
    if (this.priceBatch.length > 0) {
      this.realtimeService.broadcastPrices(this.priceBatch);
      this.priceBatch = [];
    }

    if (this.priceBatchTimer) {
      clearTimeout(this.priceBatchTimer);
      this.priceBatchTimer = null;
    }
  }

  // ============================================================
  // HEALTH UPDATE HANDLING
  // ============================================================

  private handleHealthUpdate(componentName: string, data: any): void {
    const update: SystemHealthUpdate = {
      component: componentName,
      status: data.status || 'healthy',
      latency: data.latency,
      errorRate: data.errorRate,
      message: data.message,
      timestamp: new Date(),
    };

    this.componentHealthMap.set(componentName, update);
    this.realtimeService.broadcastSystemHealth(update);
  }

  private handleComponentError(componentName: string, error: Error): void {
    const update: SystemHealthUpdate = {
      component: componentName,
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date(),
    };

    this.componentHealthMap.set(componentName, update);
    this.realtimeService.broadcastSystemHealth(update);

    this.broadcastAlert({
      alertId: `error_${componentName}_${Date.now()}`,
      type: 'system',
      priority: 'critical',
      title: `Component Error: ${componentName}`,
      message: error.message,
      actionRequired: true,
      timestamp: new Date(),
    });
  }

  private handleStatusChange(componentName: string, data: any): void {
    this.realtimeService.broadcast('system', 'status_change', {
      component: componentName,
      ...data,
      timestamp: new Date(),
    });
  }

  // ============================================================
  // THROTTLING
  // ============================================================

  private throttledBroadcast(key: string, broadcastFn: () => void): void {
    const now = Date.now();
    const state = this.throttleStates.get(key);

    if (!state || now - state.lastEmit >= this.config.throttleInterval) {
      broadcastFn();
      this.throttleStates.set(key, { lastEmit: now, pendingData: null });
    }
  }

  // ============================================================
  // EVENT HISTORY
  // ============================================================

  private addToHistory(channel: string, event: string, data: any): void {
    if (!this.config.enableEventHistory) return;

    this.eventHistory.push({
      channel,
      event,
      data,
      timestamp: new Date(),
    });

    // Trim history if too large
    if (this.eventHistory.length > this.config.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.config.maxHistorySize);
    }
  }

  /**
   * Get recent events for a reconnecting client
   */
  getRecentEvents(since: Date, channels?: string[]): HistoryEntry[] {
    return this.eventHistory.filter(entry => {
      if (entry.timestamp < since) return false;
      if (channels && !channels.includes(entry.channel)) return false;
      return true;
    });
  }

  /**
   * Get current health status for all components
   */
  getComponentHealth(): Map<string, SystemHealthUpdate> {
    return new Map(this.componentHealthMap);
  }

  // ============================================================
  // MANUAL BROADCASTS
  // ============================================================

  /**
   * Manually broadcast a system announcement
   */
  broadcastAnnouncement(title: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    this.broadcastAlert({
      alertId: `announcement_${Date.now()}`,
      type: 'system',
      priority,
      title,
      message,
      actionRequired: false,
      timestamp: new Date(),
    });
  }

  /**
   * Manually broadcast a system maintenance notice
   */
  broadcastMaintenance(message: string, scheduledTime?: Date): void {
    this.realtimeService.broadcastAll('maintenance', {
      message,
      scheduledTime,
      timestamp: new Date(),
    });
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  shutdown(): void {
    if (this.priceBatchTimer) {
      clearTimeout(this.priceBatchTimer);
      this.priceBatchTimer = null;
    }

    this.throttleStates.clear();
    this.eventHistory = [];
    this.priceBatch = [];

    console.log('[EventHub] Shutdown complete');
  }
}

// ============================================================
// FACTORY
// ============================================================

export function createEventHub(realtimeService: RealtimeService, config?: Partial<EventHubConfig>): EventHub {
  return new EventHub(realtimeService, config);
}

export default EventHub;

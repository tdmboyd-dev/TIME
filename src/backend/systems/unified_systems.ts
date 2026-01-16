/**
 * TIME BEYOND US - Unified Systems Integration v2.0
 *
 * This module connects ALL 84+ TIME systems and ensures they
 * communicate properly through a central event bus.
 *
 * COMPLETE SYSTEMS INVENTORY:
 * ============================================================================
 * TIER 1: Core Engines (15)
 * TIER 2: Revolutionary Trading Systems (5)
 * TIER 3: Bot Management Systems (7)
 * TIER 4: Ultimate/Premium Systems (11)
 * TIER 5: Wealth Management (3)
 * TIER 6: DeFi & Yield (3)
 * TIER 7: Advanced Intelligence (5)
 * TIER 8: Autonomous Agents (2)
 * TIER 9: Tax Systems (2)
 * TIER 10: Backtesting Systems (7)
 * TIER 11: Trading Services (10)
 * TIER 12: Scout & Analysis (4)
 * TIER 13: Data Providers (5)
 * TIER 14: Support & AI (3)
 * TIER 15: Master Systems (1)
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('UnifiedSystems');

// ============================================================================
// SYSTEM EVENT BUS - Central Communication Hub
// ============================================================================

class SystemEventBus extends EventEmitter {
  private static instance: SystemEventBus;
  private systemsOnline: Map<string, { online: boolean; tier: number; category: string }> = new Map();
  private messageCount: number = 0;
  private startTime: Date = new Date();

  private constructor() {
    super();
    this.setMaxListeners(200);
  }

  static getInstance(): SystemEventBus {
    if (!SystemEventBus.instance) {
      SystemEventBus.instance = new SystemEventBus();
    }
    return SystemEventBus.instance;
  }

  registerSystem(name: string, tier: number, category: string): void {
    this.systemsOnline.set(name, { online: true, tier, category });
    this.emit('system_registered', { name, tier, category, timestamp: new Date() });
  }

  unregisterSystem(name: string): void {
    const system = this.systemsOnline.get(name);
    if (system) {
      system.online = false;
      this.emit('system_unregistered', { name, timestamp: new Date() });
    }
  }

  broadcast(event: string, data: any, source: string): void {
    this.messageCount++;
    const message = {
      event,
      data,
      source,
      timestamp: new Date(),
      messageId: this.messageCount,
    };
    this.emit(event, message);
    this.emit('broadcast', message);
  }

  getOnlineSystems(): string[] {
    return Array.from(this.systemsOnline.entries())
      .filter(([_, info]) => info.online)
      .map(([name]) => name);
  }

  getSystemsByTier(tier: number): string[] {
    return Array.from(this.systemsOnline.entries())
      .filter(([_, info]) => info.tier === tier && info.online)
      .map(([name]) => name);
  }

  getStats(): {
    totalSystems: number;
    onlineCount: number;
    messageCount: number;
    uptime: number;
    systemsByTier: Record<number, number>;
    onlineSystems: string[];
  } {
    const online = this.getOnlineSystems();
    const tierCounts: Record<number, number> = {};
    this.systemsOnline.forEach((info) => {
      if (info.online) {
        tierCounts[info.tier] = (tierCounts[info.tier] || 0) + 1;
      }
    });
    return {
      totalSystems: this.systemsOnline.size,
      onlineCount: online.length,
      messageCount: this.messageCount,
      uptime: Date.now() - this.startTime.getTime(),
      systemsByTier: tierCounts,
      onlineSystems: online,
    };
  }
}

export const eventBus = SystemEventBus.getInstance();

// ============================================================================
// SYSTEM STORAGE
// ============================================================================

const systems: Record<string, any> = {};

// ============================================================================
// HELPER: Safe Import and Register
// ============================================================================

async function safeImportAndRegister(
  name: string,
  tier: number,
  category: string,
  importFn: () => Promise<any>,
  errors: string[]
): Promise<any> {
  try {
    const mod = await importFn();

    // Try various export patterns
    let instance = null;

    // Pattern 1: Named export with same name (lowercase)
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    if (mod[lowerName]) {
      instance = mod[lowerName];
    }
    // Pattern 2: Named export with PascalCase
    else if (mod[name]) {
      instance = typeof mod[name] === 'function' ? new mod[name]() : mod[name];
    }
    // Pattern 3: Default export
    else if (mod.default) {
      instance = typeof mod.default === 'function' ? new mod.default() : mod.default;
    }
    // Pattern 4: First exported class/function
    else {
      const exports = Object.keys(mod);
      for (const key of exports) {
        if (typeof mod[key] === 'function' && /^[A-Z]/.test(key)) {
          // Looks like a class
          try {
            instance = new mod[key]();
            break;
          } catch {
            instance = mod[key];
            break;
          }
        } else if (mod[key] && typeof mod[key] === 'object') {
          instance = mod[key];
          break;
        }
      }
    }

    if (instance) {
      systems[name] = instance;
      eventBus.registerSystem(name, tier, category);
      return instance;
    } else {
      errors.push(`${name}: No valid export found`);
      return null;
    }
  } catch (e: any) {
    errors.push(`${name}: ${e.message}`);
    return null;
  }
}

// ============================================================================
// INITIALIZATION CONFIGURATION
// ============================================================================

export interface UnifiedSystemsConfig {
  enableCoreEngines: boolean;
  enableRevolutionary: boolean;
  enableBotSystems: boolean;
  enableUltimate: boolean;
  enableWealth: boolean;
  enableDefi: boolean;
  enableIntelligence: boolean;
  enableAutonomous: boolean;
  enableTax: boolean;
  enableBacktesting: boolean;
  enableServices: boolean;
  enableScout: boolean;
  enableDataProviders: boolean;
  enableSupport: boolean;
  enableMaster: boolean;
}

const DEFAULT_CONFIG: UnifiedSystemsConfig = {
  enableCoreEngines: true,
  enableRevolutionary: true,
  enableBotSystems: true,
  enableUltimate: true,
  enableWealth: true,
  enableDefi: true,
  enableIntelligence: true,
  enableAutonomous: true,
  enableTax: true,
  enableBacktesting: true,
  enableServices: true,
  enableScout: true,
  enableDataProviders: true,
  enableSupport: true,
  enableMaster: true,
};

// ============================================================================
// TIER INITIALIZATION FUNCTIONS
// ============================================================================

async function initializeTier1(errors: string[]): Promise<void> {
  const tier = 1;
  const cat = 'Core Engines';

  await safeImportAndRegister('LearningEngine', tier, cat, () => import('../engines/learning_engine'), errors);
  await safeImportAndRegister('RiskEngine', tier, cat, () => import('../engines/risk_engine'), errors);
  await safeImportAndRegister('RegimeDetector', tier, cat, () => import('../engines/regime_detector'), errors);
  await safeImportAndRegister('RecursiveSynthesisEngine', tier, cat, () => import('../engines/recursive_synthesis_engine'), errors);
  await safeImportAndRegister('MarketVisionEngine', tier, cat, () => import('../engines/market_vision_engine'), errors);
  await safeImportAndRegister('TeachingEngine', tier, cat, () => import('../engines/teaching_engine'), errors);
  await safeImportAndRegister('AttributionEngine', tier, cat, () => import('../engines/attribution_engine'), errors);
  await safeImportAndRegister('EnsembleHarmonyDetector', tier, cat, () => import('../engines/ensemble_harmony_detector'), errors);
  await safeImportAndRegister('SignalConflictResolver', tier, cat, () => import('../engines/signal_conflict_resolver'), errors);
  await safeImportAndRegister('LearningVelocityTracker', tier, cat, () => import('../engines/learning_velocity_tracker'), errors);
  await safeImportAndRegister('SocialTradingEngine', tier, cat, () => import('../engines/social_trading_engine'), errors);
  await safeImportAndRegister('DeFiMasteryEngine', tier, cat, () => import('../engines/defi_mastery_engine'), errors);
  await safeImportAndRegister('AIRiskProfiler', tier, cat, () => import('../engines/ai_risk_profiler'), errors);
  await safeImportAndRegister('UXInnovationEngine', tier, cat, () => import('../engines/ux_innovation_engine'), errors);
  await safeImportAndRegister('StrategyBuilder', tier, cat, () => import('../engines/strategy_builder'), errors);
}

async function initializeTier2(errors: string[]): Promise<void> {
  const tier = 2;
  const cat = 'Revolutionary';

  await safeImportAndRegister('QuantumAlphaSynthesizer', tier, cat, () => import('../revolutionary/quantum_alpha_synthesizer'), errors);
  await safeImportAndRegister('DarkPoolReconstructor', tier, cat, () => import('../revolutionary/dark_pool_reconstructor'), errors);
  await safeImportAndRegister('SmartMoneyTracker', tier, cat, () => import('../revolutionary/smart_money_tracker'), errors);
  await safeImportAndRegister('VolatilitySurfaceTrader', tier, cat, () => import('../revolutionary/volatility_surface_trader'), errors);
  await safeImportAndRegister('SentimentVelocityEngine', tier, cat, () => import('../revolutionary/sentiment_velocity_engine'), errors);
}

async function initializeTier3(errors: string[]): Promise<void> {
  const tier = 3;
  const cat = 'Bot Systems';

  await safeImportAndRegister('BotBrain', tier, cat, () => import('../bots/bot_brain'), errors);
  await safeImportAndRegister('BotManager', tier, cat, () => import('../bots/bot_manager'), errors);
  await safeImportAndRegister('AutoPerfectBotGenerator', tier, cat, () => import('../bots/auto_perfect_bot_generator'), errors);
  await safeImportAndRegister('BotIngestion', tier, cat, () => import('../bots/bot_ingestion'), errors);
  await safeImportAndRegister('AutoBotEngine', tier, cat, () => import('../bots/auto_bot_engine'), errors);
  await safeImportAndRegister('UniversalBotEngine', tier, cat, () => import('../bots/universal_bot_engine'), errors);
  await safeImportAndRegister('ProCopyTrading', tier, cat, () => import('../bots/pro_copy_trading'), errors);
}

async function initializeTier4(errors: string[]): Promise<void> {
  const tier = 4;
  const cat = 'Ultimate';

  await safeImportAndRegister('UltimateMoneyMachine', tier, cat, () => import('../ultimate'), errors);
  await safeImportAndRegister('SuperBotLiveTrading', tier, cat, () => import('../ultimate/SuperBotLiveTrading'), errors);
  await safeImportAndRegister('AbsorbedSuperBots', tier, cat, () => import('../ultimate/AbsorbedSuperBots'), errors);
  await safeImportAndRegister('SuperBotEngines', tier, cat, () => import('../ultimate/SuperBotEngines'), errors);
  await safeImportAndRegister('EaterBotSystem', tier, cat, () => import('../ultimate/EaterBotSystem'), errors);
  await safeImportAndRegister('AutoRoleManager', tier, cat, () => import('../ultimate/AutoRoleManager'), errors);
  await safeImportAndRegister('SelfLearningKnowledgeBase', tier, cat, () => import('../ultimate/SelfLearningKnowledgeBase'), errors);
  await safeImportAndRegister('AutoExecuteEngine', tier, cat, () => import('../ultimate/AutoExecuteEngine'), errors);
  await safeImportAndRegister('MarketAttackStrategies', tier, cat, () => import('../ultimate/MarketAttackStrategies'), errors);
  await safeImportAndRegister('InstitutionalEdge', tier, cat, () => import('../ultimate/InstitutionalEdge'), errors);
  await safeImportAndRegister('PremiumFeatureGate', tier, cat, () => import('../ultimate/PremiumFeatureGate'), errors);
}

async function initializeTier5(errors: string[]): Promise<void> {
  const tier = 5;
  const cat = 'Wealth';

  await safeImportAndRegister('FamilyLegacyAI', tier, cat, () => import('../wealth/family_legacy_ai'), errors);
  await safeImportAndRegister('DynastyTrustEngine', tier, cat, () => import('../wealth/dynasty_trust_engine'), errors);
  await safeImportAndRegister('CapitalConductor', tier, cat, () => import('../capital/capital_conductor'), errors);
}

async function initializeTier6(errors: string[]): Promise<void> {
  const tier = 6;
  const cat = 'DeFi';

  await safeImportAndRegister('YieldOrchestrator', tier, cat, () => import('../yield/yield_orchestrator'), errors);
  await safeImportAndRegister('YieldAggregator', tier, cat, () => import('../defi/yield_aggregator'), errors);
  await safeImportAndRegister('RealDefiData', tier, cat, () => import('../defi/real_defi_data'), errors);
}

async function initializeTier7(errors: string[]): Promise<void> {
  const tier = 7;
  const cat = 'Intelligence';

  await safeImportAndRegister('CollectiveIntelligenceNetwork', tier, cat, () => import('../collective/collective_intelligence_network'), errors);
  await safeImportAndRegister('MetaBrain', tier, cat, () => import('../meta/meta_brain'), errors);
  await safeImportAndRegister('PortfolioBrain', tier, cat, () => import('../portfolio/portfolio_brain'), errors);
  await safeImportAndRegister('AlphaEngine', tier, cat, () => import('../alpha/alpha_engine'), errors);
  await safeImportAndRegister('RoboAdvisor', tier, cat, () => import('../robo/robo_advisor'), errors);
}

async function initializeTier8(errors: string[]): Promise<void> {
  const tier = 8;
  const cat = 'Autonomous';

  await safeImportAndRegister('AutonomousCapitalAgent', tier, cat, () => import('../autonomous/autonomous_capital_agent'), errors);
  await safeImportAndRegister('AgentSwarm', tier, cat, () => import('../agents/agent_swarm'), errors);
}

async function initializeTier9(errors: string[]): Promise<void> {
  const tier = 9;
  const cat = 'Tax';

  await safeImportAndRegister('TaxLossHarvester', tier, cat, () => import('../tax/tax_loss_harvester'), errors);
  await safeImportAndRegister('TaxReporting', tier, cat, () => import('../tax/tax_reporting'), errors);
}

async function initializeTier10(errors: string[]): Promise<void> {
  const tier = 10;
  const cat = 'Backtesting';

  await safeImportAndRegister('BacktestEngine', tier, cat, () => import('../backtesting/backtest_engine'), errors);
  await safeImportAndRegister('OptimizationEngine', tier, cat, () => import('../backtesting/optimization_engine'), errors);
  await safeImportAndRegister('MultiAssetBacktest', tier, cat, () => import('../backtesting/multi_asset_backtest'), errors);
  await safeImportAndRegister('AdvancedBacktest', tier, cat, () => import('../backtesting/advanced_backtest'), errors);
  await safeImportAndRegister('PositionSizing', tier, cat, () => import('../backtesting/position_sizing'), errors);
  await safeImportAndRegister('OutOfSample', tier, cat, () => import('../backtesting/out_of_sample'), errors);
  await safeImportAndRegister('BenchmarkComparison', tier, cat, () => import('../backtesting/benchmark_comparison'), errors);
}

async function initializeTier11(errors: string[]): Promise<void> {
  const tier = 11;
  const cat = 'Services';

  await safeImportAndRegister('TradingModeService', tier, cat, () => import('../services/TradingModeService'), errors);
  await safeImportAndRegister('BotGovernor', tier, cat, () => import('../services/BotGovernor'), errors);
  await safeImportAndRegister('RealBotPerformance', tier, cat, () => import('../services/RealBotPerformance'), errors);
  await safeImportAndRegister('AITradeGodBot', tier, cat, () => import('../services/AITradeGodBot'), errors);
  await safeImportAndRegister('BigMovesAlertService', tier, cat, () => import('../services/BigMovesAlertService'), errors);
  await safeImportAndRegister('SmartBotService', tier, cat, () => import('../services/SmartBotService'), errors);
  await safeImportAndRegister('TradingExecutionService', tier, cat, () => import('../services/TradingExecutionService'), errors);
  await safeImportAndRegister('BotMarketplace', tier, cat, () => import('../services/BotMarketplace'), errors);
  await safeImportAndRegister('PlainEnglishService', tier, cat, () => import('../services/PlainEnglishService'), errors);
  await safeImportAndRegister('EducationService', tier, cat, () => import('../services/EducationService'), errors);
}

async function initializeTier12(errors: string[]): Promise<void> {
  const tier = 12;
  const cat = 'Scout';

  await safeImportAndRegister('OpportunityScout', tier, cat, () => import('../scout/opportunity_scout'), errors);
  await safeImportAndRegister('StockScreener', tier, cat, () => import('../screener/stock_screener'), errors);
  await safeImportAndRegister('StockWatchers', tier, cat, () => import('../watchers/stock_watchers'), errors);
  await safeImportAndRegister('AITradingSignals', tier, cat, () => import('../signals/ai_trading_signals'), errors);
}

async function initializeTier13(errors: string[]): Promise<void> {
  const tier = 13;
  const cat = 'Data';

  await safeImportAndRegister('FMPIntegration', tier, cat, () => import('../data/fmp_integration'), errors);
  await safeImportAndRegister('FREDIntegration', tier, cat, () => import('../data/fred_integration'), errors);
  await safeImportAndRegister('TwelveDataIntegration', tier, cat, () => import('../data/twelvedata_integration'), errors);
  await safeImportAndRegister('MarketDataProviders', tier, cat, () => import('../data/market_data_providers'), errors);
  await safeImportAndRegister('RealMarketData', tier, cat, () => import('../data/real_market_data_integration'), errors);
}

async function initializeTier14(errors: string[]): Promise<void> {
  const tier = 14;
  const cat = 'Support';

  await safeImportAndRegister('AISupportSystem', tier, cat, () => import('../support/ai_support_system'), errors);
  await safeImportAndRegister('ChatAssistant', tier, cat, () => import('../ai/chat_assistant'), errors);
  await safeImportAndRegister('GamificationEngine', tier, cat, () => import('../gamification/gamification_engine'), errors);
}

async function initializeTier15(errors: string[]): Promise<void> {
  const tier = 15;
  const cat = 'Master';

  await safeImportAndRegister('TIMEBEUNUS', tier, cat, () => import('../master/timebeunus'), errors);
}

// ============================================================================
// INTER-SYSTEM COMMUNICATION
// ============================================================================

function setupInterSystemCommunication(): void {
  // Trading signals flow to multiple systems
  eventBus.on('trading_signal', (msg: any) => {
    systems.AutonomousCapitalAgent?.emit?.('external_signal', msg.data);
    systems.TIMEBEUNUS?.emit?.('signal_received', msg.data);
    systems.RiskEngine?.checkSignal?.(msg.data);
  });

  // Big mover alerts
  eventBus.on('big_mover_detected', (msg: any) => {
    systems.UltimateMoneyMachine?.umm?.emit?.('market_opportunity', msg.data);
    systems.AgentSwarm?.emit?.('big_mover', msg.data);
    systems.BigMovesAlertService?.alert?.(msg.data);
  });

  // Trade execution tracking
  eventBus.on('trade_executed', (msg: any) => {
    systems.TaxLossHarvester?.recordTrade?.(msg.data);
    systems.YieldOrchestrator?.updatePosition?.(msg.data);
    systems.LearningEngine?.recordEvent?.({ type: 'trade', data: msg.data, source: msg.source });
    systems.AttributionEngine?.recordTradeOutcome?.(msg.data);
  });

  // Risk alerts
  eventBus.on('risk_alert', (msg: any) => {
    systems.AutonomousCapitalAgent?.emit?.('risk_alert', msg.data);
    systems.BotGovernor?.handleRiskAlert?.(msg.data);
  });

  // Learning events
  eventBus.on('learning_event', (msg: any) => {
    systems.LearningVelocityTracker?.recordLearning?.(msg.data);
    systems.SelfLearningKnowledgeBase?.absorb?.(msg.data);
  });

  // Market regime changes
  eventBus.on('regime_change', (msg: any) => {
    systems.BotManager?.onRegimeChange?.(msg.data);
    systems.AutoExecuteEngine?.adjustForRegime?.(msg.data);
    systems.MarketAttackStrategies?.onRegimeChange?.(msg.data);
  });

  // Opportunity discovery
  eventBus.on('opportunity_found', (msg: any) => {
    systems.AutonomousCapitalAgent?.evaluateOpportunity?.(msg.data);
    systems.PortfolioBrain?.considerOpportunity?.(msg.data);
  });

  logger.info('Inter-system communication channels established');
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

export async function initializeUnifiedSystems(
  config: Partial<UnifiedSystemsConfig> = {}
): Promise<{ success: boolean; systemsOnline: string[]; errors: string[]; stats: any }> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];

  logger.info('='.repeat(70));
  logger.info('TIME BEYOND US - UNIFIED SYSTEMS INITIALIZATION v2.0');
  logger.info('Connecting ALL Systems...');
  logger.info('='.repeat(70));

  if (finalConfig.enableCoreEngines) {
    logger.info('TIER 1: Core Engines...');
    await initializeTier1(errors);
  }

  if (finalConfig.enableRevolutionary) {
    logger.info('TIER 2: Revolutionary...');
    await initializeTier2(errors);
  }

  if (finalConfig.enableBotSystems) {
    logger.info('TIER 3: Bot Systems...');
    await initializeTier3(errors);
  }

  if (finalConfig.enableUltimate) {
    logger.info('TIER 4: Ultimate...');
    await initializeTier4(errors);
  }

  if (finalConfig.enableWealth) {
    logger.info('TIER 5: Wealth...');
    await initializeTier5(errors);
  }

  if (finalConfig.enableDefi) {
    logger.info('TIER 6: DeFi...');
    await initializeTier6(errors);
  }

  if (finalConfig.enableIntelligence) {
    logger.info('TIER 7: Intelligence...');
    await initializeTier7(errors);
  }

  if (finalConfig.enableAutonomous) {
    logger.info('TIER 8: Autonomous...');
    await initializeTier8(errors);
  }

  if (finalConfig.enableTax) {
    logger.info('TIER 9: Tax...');
    await initializeTier9(errors);
  }

  if (finalConfig.enableBacktesting) {
    logger.info('TIER 10: Backtesting...');
    await initializeTier10(errors);
  }

  if (finalConfig.enableServices) {
    logger.info('TIER 11: Services...');
    await initializeTier11(errors);
  }

  if (finalConfig.enableScout) {
    logger.info('TIER 12: Scout...');
    await initializeTier12(errors);
  }

  if (finalConfig.enableDataProviders) {
    logger.info('TIER 13: Data...');
    await initializeTier13(errors);
  }

  if (finalConfig.enableSupport) {
    logger.info('TIER 14: Support...');
    await initializeTier14(errors);
  }

  if (finalConfig.enableMaster) {
    logger.info('TIER 15: Master...');
    await initializeTier15(errors);
  }

  setupInterSystemCommunication();

  const stats = eventBus.getStats();

  logger.info('='.repeat(70));
  logger.info(`UNIFIED SYSTEMS ONLINE: ${stats.onlineCount}`);
  logger.info(`Systems by Tier: ${JSON.stringify(stats.systemsByTier)}`);
  if (errors.length > 0) {
    logger.warn(`Errors (${errors.length}): See logs`);
  }
  logger.info('='.repeat(70));

  return {
    success: stats.onlineCount > 0,
    systemsOnline: stats.onlineSystems,
    errors,
    stats,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getUnifiedSystems(): Record<string, any> {
  return systems;
}

export function getSystemStatus(): {
  totalSystems: number;
  onlineCount: number;
  systemsByTier: Record<number, number>;
  messageCount: number;
  uptime: number;
  systems: string[];
} {
  const stats = eventBus.getStats();
  return {
    totalSystems: stats.totalSystems,
    onlineCount: stats.onlineCount,
    systemsByTier: stats.systemsByTier,
    messageCount: stats.messageCount,
    uptime: stats.uptime,
    systems: stats.onlineSystems,
  };
}

export function getSystem(name: string): any {
  return systems[name];
}

export { systems };

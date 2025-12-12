/**
 * TIME Trading Mode Service
 *
 * Manages practice/live mode toggle for all brokers and trading systems.
 * ONE CLICK to switch between paper trading and live trading.
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger';

// ===========================================
// TYPES
// ===========================================

export type TradingMode = 'practice' | 'live';

export interface BrokerModeConfig {
  brokerId: string;
  brokerName: string;
  mode: TradingMode;
  supportsMode: boolean;
  liveEnabled: boolean;  // Whether live trading is allowed (requires verification)
  lastChanged: Date;
  changedBy: string;
}

export interface TradingModeState {
  globalMode: TradingMode;
  brokerModes: Map<string, BrokerModeConfig>;
  lastGlobalChange: Date;
  liveUnlocked: boolean;  // Requires user to explicitly unlock live trading
  confirmationRequired: boolean;
}

export interface ModeChangeResult {
  success: boolean;
  previousMode: TradingMode;
  newMode: TradingMode;
  broker?: string;
  message: string;
  warnings: string[];
}

// ===========================================
// SUPPORTED BROKERS
// ===========================================

const SUPPORTED_BROKERS = [
  {
    id: 'alpaca',
    name: 'Alpaca',
    supportsMode: true,
    paperEndpoint: 'https://paper-api.alpaca.markets',
    liveEndpoint: 'https://api.alpaca.markets',
    envKey: 'ALPACA_PAPER'
  },
  {
    id: 'oanda',
    name: 'OANDA',
    supportsMode: true,
    paperEndpoint: 'https://api-fxpractice.oanda.com',
    liveEndpoint: 'https://api-fxtrade.oanda.com',
    envKey: 'OANDA_PRACTICE'
  },
  {
    id: 'binance',
    name: 'Binance',
    supportsMode: true,
    paperEndpoint: 'https://testnet.binance.vision',
    liveEndpoint: 'https://api.binance.com',
    envKey: 'BINANCE_TESTNET'
  },
  {
    id: 'bybit',
    name: 'Bybit',
    supportsMode: true,
    paperEndpoint: 'https://api-testnet.bybit.com',
    liveEndpoint: 'https://api.bybit.com',
    envKey: 'BYBIT_TESTNET'
  },
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    supportsMode: true,
    paperEndpoint: 'paper',
    liveEndpoint: 'live',
    envKey: 'IBKR_PAPER'
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    supportsMode: false,  // Coinbase doesn't have a paper trading mode
    paperEndpoint: null,
    liveEndpoint: 'https://api.coinbase.com',
    envKey: null
  }
];

// ===========================================
// TRADING MODE SERVICE
// ===========================================

class TradingModeService extends EventEmitter {
  private state: TradingModeState;
  private static instance: TradingModeService;

  private constructor() {
    super();
    this.state = this.initializeState();
    logger.info('[TradingMode] Service initialized', {
      globalMode: this.state.globalMode,
      brokerCount: this.state.brokerModes.size
    });
  }

  static getInstance(): TradingModeService {
    if (!TradingModeService.instance) {
      TradingModeService.instance = new TradingModeService();
    }
    return TradingModeService.instance;
  }

  private initializeState(): TradingModeState {
    const brokerModes = new Map<string, BrokerModeConfig>();

    // Initialize each broker with practice mode by default
    for (const broker of SUPPORTED_BROKERS) {
      const envValue = broker.envKey ? process.env[broker.envKey] : null;
      const isLive = envValue === 'false' || envValue === '0';

      brokerModes.set(broker.id, {
        brokerId: broker.id,
        brokerName: broker.name,
        mode: isLive ? 'live' : 'practice',
        supportsMode: broker.supportsMode,
        liveEnabled: false,  // Disabled by default for safety
        lastChanged: new Date(),
        changedBy: 'system'
      });
    }

    return {
      globalMode: 'practice',  // ALWAYS start in practice mode for safety
      brokerModes,
      lastGlobalChange: new Date(),
      liveUnlocked: false,
      confirmationRequired: true
    };
  }

  // ===========================================
  // GETTERS
  // ===========================================

  getGlobalMode(): TradingMode {
    return this.state.globalMode;
  }

  getBrokerMode(brokerId: string): TradingMode {
    const config = this.state.brokerModes.get(brokerId);
    return config?.mode || 'practice';
  }

  getAllBrokerModes(): BrokerModeConfig[] {
    return Array.from(this.state.brokerModes.values());
  }

  getState(): TradingModeState {
    return { ...this.state };
  }

  isLiveUnlocked(): boolean {
    return this.state.liveUnlocked;
  }

  isPracticeMode(): boolean {
    return this.state.globalMode === 'practice';
  }

  isLiveMode(): boolean {
    return this.state.globalMode === 'live';
  }

  // ===========================================
  // MODE SWITCHING
  // ===========================================

  /**
   * Switch global trading mode (affects ALL brokers)
   */
  async setGlobalMode(
    mode: TradingMode,
    userId: string = 'admin',
    confirmation?: string
  ): Promise<ModeChangeResult> {
    const warnings: string[] = [];
    const previousMode = this.state.globalMode;

    // Safety check: Require confirmation for live mode
    if (mode === 'live') {
      if (!this.state.liveUnlocked) {
        return {
          success: false,
          previousMode,
          newMode: previousMode,
          message: 'Live trading is locked. Call unlockLiveTrading() first with proper verification.',
          warnings: ['Live trading must be explicitly unlocked before use']
        };
      }

      if (this.state.confirmationRequired && confirmation !== 'I_UNDERSTAND_LIVE_TRADING_RISKS') {
        return {
          success: false,
          previousMode,
          newMode: previousMode,
          message: 'Live mode requires confirmation. Pass confirmation: "I_UNDERSTAND_LIVE_TRADING_RISKS"',
          warnings: ['Confirmation required for live trading']
        };
      }

      warnings.push('LIVE TRADING ENABLED - Real money at risk!');
      warnings.push('All connected brokers will execute real trades');
    }

    // Update global mode
    this.state.globalMode = mode;
    this.state.lastGlobalChange = new Date();

    // Update all broker modes that support it
    for (const [brokerId, config] of this.state.brokerModes) {
      if (config.supportsMode) {
        config.mode = mode;
        config.lastChanged = new Date();
        config.changedBy = userId;
      }
    }

    // Emit event for other services to react
    this.emit('modeChanged', {
      type: 'global',
      previousMode,
      newMode: mode,
      userId,
      timestamp: new Date()
    });

    logger.info('[TradingMode] Global mode changed', {
      previousMode,
      newMode: mode,
      userId
    });

    return {
      success: true,
      previousMode,
      newMode: mode,
      message: mode === 'practice'
        ? 'Switched to PRACTICE mode - No real money at risk'
        : 'Switched to LIVE mode - Real trades will be executed!',
      warnings
    };
  }

  /**
   * Switch mode for a specific broker only
   */
  async setBrokerMode(
    brokerId: string,
    mode: TradingMode,
    userId: string = 'admin',
    confirmation?: string
  ): Promise<ModeChangeResult> {
    const config = this.state.brokerModes.get(brokerId);
    const warnings: string[] = [];

    if (!config) {
      return {
        success: false,
        previousMode: 'practice',
        newMode: 'practice',
        broker: brokerId,
        message: `Unknown broker: ${brokerId}`,
        warnings: []
      };
    }

    if (!config.supportsMode) {
      return {
        success: false,
        previousMode: config.mode,
        newMode: config.mode,
        broker: brokerId,
        message: `${config.brokerName} does not support practice/live mode switching`,
        warnings: []
      };
    }

    const previousMode = config.mode;

    // Safety check for live mode
    if (mode === 'live') {
      if (!this.state.liveUnlocked) {
        return {
          success: false,
          previousMode,
          newMode: previousMode,
          broker: brokerId,
          message: 'Live trading is locked. Unlock it first.',
          warnings: ['Live trading must be explicitly unlocked']
        };
      }

      if (this.state.confirmationRequired && confirmation !== 'I_UNDERSTAND_LIVE_TRADING_RISKS') {
        return {
          success: false,
          previousMode,
          newMode: previousMode,
          broker: brokerId,
          message: 'Live mode requires confirmation',
          warnings: ['Pass confirmation string to enable live trading']
        };
      }

      warnings.push(`${config.brokerName} will execute REAL trades!`);
    }

    // Update the broker mode
    config.mode = mode;
    config.lastChanged = new Date();
    config.changedBy = userId;

    // Emit event
    this.emit('modeChanged', {
      type: 'broker',
      brokerId,
      brokerName: config.brokerName,
      previousMode,
      newMode: mode,
      userId,
      timestamp: new Date()
    });

    logger.info('[TradingMode] Broker mode changed', {
      broker: brokerId,
      previousMode,
      newMode: mode,
      userId
    });

    return {
      success: true,
      previousMode,
      newMode: mode,
      broker: brokerId,
      message: mode === 'practice'
        ? `${config.brokerName} switched to PRACTICE mode`
        : `${config.brokerName} switched to LIVE mode - Real money!`,
      warnings
    };
  }

  // ===========================================
  // LIVE TRADING UNLOCK
  // ===========================================

  /**
   * Unlock live trading (requires explicit user action)
   * This is a safety measure to prevent accidental live trading
   */
  unlockLiveTrading(
    userId: string,
    acknowledgement: string
  ): { success: boolean; message: string } {
    if (acknowledgement !== 'I_ACCEPT_ALL_TRADING_RISKS_AND_RESPONSIBILITY') {
      return {
        success: false,
        message: 'Must acknowledge risks with: "I_ACCEPT_ALL_TRADING_RISKS_AND_RESPONSIBILITY"'
      };
    }

    this.state.liveUnlocked = true;

    // Enable live mode for all brokers
    for (const [, config] of this.state.brokerModes) {
      config.liveEnabled = true;
    }

    logger.warn('[TradingMode] LIVE TRADING UNLOCKED', { userId });

    this.emit('liveUnlocked', { userId, timestamp: new Date() });

    return {
      success: true,
      message: 'Live trading unlocked. You can now switch to live mode. BE CAREFUL!'
    };
  }

  /**
   * Lock live trading (force back to practice mode)
   */
  lockLiveTrading(userId: string): { success: boolean; message: string } {
    this.state.liveUnlocked = false;
    this.state.globalMode = 'practice';

    // Force all brokers back to practice mode
    for (const [, config] of this.state.brokerModes) {
      config.liveEnabled = false;
      if (config.supportsMode) {
        config.mode = 'practice';
        config.changedBy = userId;
        config.lastChanged = new Date();
      }
    }

    logger.info('[TradingMode] Live trading locked, all brokers in practice mode', { userId });

    this.emit('liveLocked', { userId, timestamp: new Date() });

    return {
      success: true,
      message: 'Live trading locked. All brokers switched to practice mode.'
    };
  }

  // ===========================================
  // QUICK TOGGLE (For UI)
  // ===========================================

  /**
   * Quick toggle between practice and live (for UI button)
   */
  async toggleGlobalMode(
    userId: string = 'admin',
    confirmation?: string
  ): Promise<ModeChangeResult> {
    const newMode: TradingMode = this.state.globalMode === 'practice' ? 'live' : 'practice';
    return this.setGlobalMode(newMode, userId, confirmation);
  }

  // ===========================================
  // BROKER ENDPOINTS
  // ===========================================

  /**
   * Get the correct API endpoint for a broker based on current mode
   */
  getBrokerEndpoint(brokerId: string): string | null {
    const broker = SUPPORTED_BROKERS.find(b => b.id === brokerId);
    const config = this.state.brokerModes.get(brokerId);

    if (!broker || !config) return null;

    if (config.mode === 'practice') {
      return broker.paperEndpoint;
    } else {
      return broker.liveEndpoint;
    }
  }

  // ===========================================
  // STATUS & SUMMARY
  // ===========================================

  getStatusSummary(): {
    globalMode: TradingMode;
    liveUnlocked: boolean;
    brokers: Array<{
      id: string;
      name: string;
      mode: TradingMode;
      supportsToggle: boolean;
      liveEnabled: boolean;
    }>;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (this.state.globalMode === 'live') {
      warnings.push('LIVE TRADING ACTIVE - Real money at risk!');
    }

    if (this.state.liveUnlocked && this.state.globalMode === 'practice') {
      warnings.push('Live trading is unlocked but not active');
    }

    const brokers = Array.from(this.state.brokerModes.values()).map(config => ({
      id: config.brokerId,
      name: config.brokerName,
      mode: config.mode,
      supportsToggle: config.supportsMode,
      liveEnabled: config.liveEnabled
    }));

    return {
      globalMode: this.state.globalMode,
      liveUnlocked: this.state.liveUnlocked,
      brokers,
      warnings
    };
  }
}

// Export singleton instance
export const tradingModeService = TradingModeService.getInstance();
export default tradingModeService;

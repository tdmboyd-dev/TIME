/**
 * Broker Integration Module - Main Entry Point
 *
 * TIME Trading Platform - Unified Broker Integration System
 *
 * Supported Brokers:
 * 1. Alpaca (stocks) - Full order management, paper trading
 * 2. Interactive Brokers (multi-asset) - TWS/Gateway connection
 * 3. OANDA (forex) - REST + streaming prices
 * 4. Coinbase (crypto) - Spot trading
 * 5. Binance (crypto) - Spot + futures with trailing stops
 * 6. SnapTrade (universal) - Connect any brokerage
 *
 * Features:
 * - All order types: market, limit, stop, stop-limit, trailing stop
 * - Position management with P&L tracking
 * - Account balance and equity fetching
 * - Trade history sync
 * - Real-time fills via WebSocket
 * - Error handling with retry logic
 * - Paper trading mode for all brokers
 */

// Core interface and types
export * from './broker_interface';

// Individual broker implementations
export { AlpacaBroker } from './alpaca_broker';
export { IBKRBroker, createIBKRBroker } from './ibkr_broker';
export { OANDABroker } from './oanda_broker';
export { CoinbaseBroker } from './coinbase_broker';
export { BinanceBroker, createBinanceBroker } from './binance_broker';
export { SnapTradeBroker, createSnapTradeBroker } from './snaptrade_broker';

// Paper trading wrapper
export { PaperTradingBroker, createPaperTradingBroker } from './paper_trading_broker';

// Crypto futures - explicit exports to avoid ambiguity
export {
  BinanceFutures,
  BybitFutures,
  CryptoFuturesManager,
  cryptoFuturesManager,
} from './crypto_futures';

// Advanced broker engine
export { AdvancedBrokerEngine, advancedBrokerEngine } from './advanced_broker_engine';

// Multi-broker hub
export {
  MultiBrokerHub,
  getMultiBrokerHub,
  brokers,
  type BrokerType,
  type BrokerCredentials,
  type BrokerAccount as HubBrokerAccount,
  type Position as HubPosition,
  type Order as HubOrder,
  type MarketQuote,
  type BrokerCapabilities as HubBrokerCapabilities,
} from './multi_broker_hub';

// IB Client for direct TWS connection
export * from './ib_client';

// Broker manager for unified access
export { BrokerManager } from './broker_manager';

// =============================================================================
// UNIFIED BROKER FACTORY
// =============================================================================

import {
  BrokerInterface,
  BrokerConfig,
} from './broker_interface';
import { AlpacaBroker } from './alpaca_broker';
import { IBKRBroker, createIBKRBroker } from './ibkr_broker';
import { OANDABroker } from './oanda_broker';
import { CoinbaseBroker } from './coinbase_broker';
import { BinanceBroker, createBinanceBroker } from './binance_broker';
import { SnapTradeBroker, createSnapTradeBroker, SnapTradeConfig } from './snaptrade_broker';
import { PaperTradingBroker, createPaperTradingBroker } from './paper_trading_broker';

export type BrokerName =
  | 'alpaca'
  | 'ibkr'
  | 'interactive_brokers'
  | 'oanda'
  | 'coinbase'
  | 'binance'
  | 'binance_futures'
  | 'snaptrade'
  | 'paper';

/**
 * Create a broker instance by name
 */
export function createBroker(
  brokerName: BrokerName,
  config: BrokerConfig & Record<string, any>
): BrokerInterface {
  switch (brokerName.toLowerCase()) {
    case 'alpaca':
      return new AlpacaBroker(config as any);

    case 'ibkr':
    case 'interactive_brokers':
      return createIBKRBroker(config);

    case 'oanda':
      return new OANDABroker(config as any);

    case 'coinbase':
      return new CoinbaseBroker(config as any);

    case 'binance':
      return createBinanceBroker({
        ...config,
        tradingType: 'spot',
      });

    case 'binance_futures':
      return createBinanceBroker({
        ...config,
        tradingType: 'futures',
        futuresType: 'usdt',
      });

    case 'snaptrade':
      return createSnapTradeBroker(config as unknown as SnapTradeConfig);

    case 'paper':
      return createPaperTradingBroker(config);

    default:
      throw new Error(`Unknown broker: ${brokerName}`);
  }
}

/**
 * Get supported order types for a broker
 */
export function getSupportedOrderTypes(brokerName: BrokerName): string[] {
  const orderTypesByBroker: Record<BrokerName, string[]> = {
    alpaca: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    ibkr: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    interactive_brokers: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    oanda: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    coinbase: ['market', 'limit', 'stop', 'stop_limit'],
    binance: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    binance_futures: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    snaptrade: ['market', 'limit', 'stop', 'stop_limit'],
    paper: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
  };

  return orderTypesByBroker[brokerName] || ['market', 'limit'];
}

/**
 * Get supported asset classes for a broker
 */
export function getSupportedAssetClasses(brokerName: BrokerName): string[] {
  const assetClassesByBroker: Record<BrokerName, string[]> = {
    alpaca: ['stock', 'crypto'],
    ibkr: ['stock', 'options', 'futures', 'forex', 'bonds', 'cfds'],
    interactive_brokers: ['stock', 'options', 'futures', 'forex', 'bonds', 'cfds'],
    oanda: ['forex', 'commodities', 'cfds', 'bonds'],
    coinbase: ['crypto'],
    binance: ['crypto'],
    binance_futures: ['crypto', 'futures'],
    snaptrade: ['stock', 'crypto', 'options'],
    paper: ['stock', 'crypto', 'forex', 'futures', 'options', 'commodities', 'cfds'],
  };

  return assetClassesByBroker[brokerName] || ['stock'];
}

/**
 * Check if broker supports paper trading
 */
export function supportsPaperTrading(brokerName: BrokerName): boolean {
  const paperTradingSupport: Record<BrokerName, boolean> = {
    alpaca: true,
    ibkr: true,
    interactive_brokers: true,
    oanda: true,
    coinbase: false,
    binance: true,
    binance_futures: true,
    snaptrade: false,
    paper: true,
  };

  return paperTradingSupport[brokerName] ?? false;
}

/**
 * Get paper trading URL or account for a broker
 */
export function getPaperTradingConfig(brokerName: BrokerName): Record<string, any> {
  const configs: Record<BrokerName, Record<string, any>> = {
    alpaca: { baseUrl: 'https://paper-api.alpaca.markets' },
    ibkr: { port: 7497 }, // Paper trading port
    interactive_brokers: { port: 7497 },
    oanda: { environment: 'practice' },
    coinbase: {},
    binance: { testnet: true },
    binance_futures: { testnet: true },
    snaptrade: {},
    paper: {},
  };

  return configs[brokerName] || {};
}

// =============================================================================
// BROKER REGISTRY
// =============================================================================

interface BrokerInfo {
  name: string;
  displayName: string;
  description: string;
  assetClasses: string[];
  orderTypes: string[];
  features: string[];
  website: string;
  docsUrl: string;
  paperTrading: boolean;
  streaming: boolean;
}

export const BROKER_REGISTRY: Record<BrokerName, BrokerInfo> = {
  alpaca: {
    name: 'alpaca',
    displayName: 'Alpaca',
    description: 'Commission-free stock and crypto trading API',
    assetClasses: ['stock', 'crypto'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    features: ['fractional_shares', 'extended_hours', 'margin', 'short_selling'],
    website: 'https://alpaca.markets',
    docsUrl: 'https://alpaca.markets/docs/api-references',
    paperTrading: true,
    streaming: true,
  },
  ibkr: {
    name: 'ibkr',
    displayName: 'Interactive Brokers',
    description: 'Professional-grade multi-asset broker',
    assetClasses: ['stock', 'options', 'futures', 'forex', 'bonds', 'cfds'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    features: ['margin', 'short_selling', 'extended_hours', 'options', 'futures'],
    website: 'https://www.interactivebrokers.com',
    docsUrl: 'https://interactivebrokers.github.io/tws-api/',
    paperTrading: true,
    streaming: true,
  },
  interactive_brokers: {
    name: 'interactive_brokers',
    displayName: 'Interactive Brokers',
    description: 'Professional-grade multi-asset broker',
    assetClasses: ['stock', 'options', 'futures', 'forex', 'bonds', 'cfds'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    features: ['margin', 'short_selling', 'extended_hours', 'options', 'futures'],
    website: 'https://www.interactivebrokers.com',
    docsUrl: 'https://interactivebrokers.github.io/tws-api/',
    paperTrading: true,
    streaming: true,
  },
  oanda: {
    name: 'oanda',
    displayName: 'OANDA',
    description: 'Forex and CFD trading platform',
    assetClasses: ['forex', 'commodities', 'cfds', 'bonds'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    features: ['margin', 'streaming_prices', '24x5_trading'],
    website: 'https://www.oanda.com',
    docsUrl: 'https://developer.oanda.com',
    paperTrading: true,
    streaming: true,
  },
  coinbase: {
    name: 'coinbase',
    displayName: 'Coinbase',
    description: 'Cryptocurrency exchange',
    assetClasses: ['crypto'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    features: ['crypto', 'staking'],
    website: 'https://www.coinbase.com',
    docsUrl: 'https://docs.cloud.coinbase.com',
    paperTrading: false,
    streaming: true,
  },
  binance: {
    name: 'binance',
    displayName: 'Binance',
    description: 'World\'s largest cryptocurrency exchange',
    assetClasses: ['crypto'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    features: ['crypto', 'margin', 'staking', 'lending'],
    website: 'https://www.binance.com',
    docsUrl: 'https://binance-docs.github.io/apidocs',
    paperTrading: true,
    streaming: true,
  },
  binance_futures: {
    name: 'binance_futures',
    displayName: 'Binance Futures',
    description: 'Cryptocurrency perpetual and quarterly futures',
    assetClasses: ['crypto', 'futures'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    features: ['crypto', 'margin', 'leverage', 'perpetuals'],
    website: 'https://www.binance.com/en/futures',
    docsUrl: 'https://binance-docs.github.io/apidocs/futures',
    paperTrading: true,
    streaming: true,
  },
  snaptrade: {
    name: 'snaptrade',
    displayName: 'SnapTrade',
    description: 'Universal broker connection API',
    assetClasses: ['stock', 'crypto', 'options'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    features: ['universal_connection', 'aggregation'],
    website: 'https://snaptrade.com',
    docsUrl: 'https://docs.snaptrade.com',
    paperTrading: false,
    streaming: false,
  },
  paper: {
    name: 'paper',
    displayName: 'Paper Trading',
    description: 'Simulated trading for testing strategies',
    assetClasses: ['stock', 'crypto', 'forex', 'futures', 'options', 'commodities', 'cfds'],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
    features: ['all_asset_classes', 'no_risk', 'realistic_simulation'],
    website: '',
    docsUrl: '',
    paperTrading: true,
    streaming: true,
  },
};

/**
 * Get all available brokers
 */
export function getAvailableBrokers(): BrokerInfo[] {
  return Object.values(BROKER_REGISTRY);
}

/**
 * Get broker info by name
 */
export function getBrokerInfo(name: BrokerName): BrokerInfo | undefined {
  return BROKER_REGISTRY[name];
}

/**
 * Find brokers that support a specific asset class
 */
export function findBrokersForAssetClass(assetClass: string): BrokerInfo[] {
  return Object.values(BROKER_REGISTRY).filter((broker) =>
    broker.assetClasses.includes(assetClass)
  );
}

/**
 * Find brokers that support a specific feature
 */
export function findBrokersWithFeature(feature: string): BrokerInfo[] {
  return Object.values(BROKER_REGISTRY).filter((broker) =>
    broker.features.includes(feature)
  );
}

/**
 * TIME — Backtesting System Index
 *
 * Unified exports for the complete backtesting system:
 * - Core backtesting engine
 * - Enhanced backtesting with multi-timeframe
 * - Parameter optimization (Grid Search, Genetic Algorithm)
 * - Multi-asset portfolio backtesting
 * - Market data integration
 * - Data caching
 * - Result storage
 * - Visualization formatters
 */

// ==========================================
// CORE BACKTESTING
// ==========================================

export {
  // Base engine types and classes
  BacktestConfig,
  BacktestingEngine,
  BacktestResult,
  Trade,
  Candle,
  WalkForwardOptimizer,
  WalkForwardResult,
  MonteCarloSimulator,
  MonteCarloResult,
} from '../strategies/backtesting_engine';

// ==========================================
// ENHANCED BACKTESTING
// ==========================================

export {
  // Enhanced engine
  EnhancedBacktestingEngine,
  EnhancedBacktestConfig,
  EnhancedBacktestResult,

  // Multi-timeframe analysis
  MultiTimeframeAnalyzer,
  Timeframe,

  // Slippage and commission models
  SlippageModel,
  CommissionModel,
  TieredCommission,

  // Position sizing
  PartialTakeProfit,
  TradingSession,

  // Enhanced metrics types
  MonthlyReturn,
  TradeDistribution,
  RollingMetric,

  // Result storage
  BacktestResultStore,
  StoredBacktestResult,
  backtestResultStore,

  // Visualization
  VisualizationFormatter,
} from './backtest_engine';

// ==========================================
// ADVANCED BACKTESTING
// ==========================================

export {
  // Advanced engine
  AdvancedBacktestEngine,
  AdvancedBacktestConfig,
  ParameterRange,
  OptimizationResult as AdvancedOptimizationResult,
  MonteCarloConfig,
  DrawdownAnalysis,
  CorrelationAnalysis,

  // Position sizing strategies
  PositionSizer,
} from './advanced_backtest';

// ==========================================
// OPTIMIZATION
// ==========================================

export {
  // Optimizers
  GridSearchOptimizer,
  GeneticAlgorithmOptimizer,
  ParameterSensitivityAnalyzer,

  // Types
  ParameterSpace,
  OptimizationConfig,
  OptimizationResult,
  GeneticAlgorithmConfig,
  BayesianOptimizationConfig,
  SensitivityAnalysisResult,
} from './optimization_engine';

// ==========================================
// MULTI-ASSET BACKTESTING
// ==========================================

export {
  // Multi-asset engine
  MultiAssetBacktestEngine,
  MultiAssetConfig,
  AssetBacktestResult,
  PortfolioMetrics,
  CorrelationMatrix,
  PortfolioOptimizationResult,
  RebalanceEvent,

  // Sector analysis
  SectorAnalyzer,
} from './multi_asset_backtest';

// ==========================================
// MARKET DATA
// ==========================================

export {
  // Data providers
  DataProvider,
  FinnhubProvider,
  TwelveDataProvider,
  CoinbaseProvider,

  // Data manager
  MarketDataManager,
  MultiAssetDataRequest,
  marketDataManager,
} from './market_data_integration';

// ==========================================
// DATA CACHING
// ==========================================

export {
  // Cache
  LRUCache,
  CandleDataCache,
  CacheConfig,
  CacheStats,
  CacheEntry,
  CandleCacheKey,
  candleDataCache,

  // Data quality
  DataQualityChecker,
} from './data_cache';

// ==========================================
// OPTIONS BACKTESTING
// ==========================================

export {
  // Options pricing
  BlackScholesPricer,
  BinomialPricer,

  // Options backtesting
  OptionsBacktestEngine,
  OptionsBacktestConfig,
  OptionsBacktestResult,
  OptionContract,
  OptionQuote,
  OptionGreeks,
  OptionPosition,
  OptionTrade,
  OptionsStrategy,

  // IV Surface
  IVSurface,

  // Predefined strategies
  PREDEFINED_STRATEGIES,
} from './options_backtest';

// ==========================================
// BENCHMARK COMPARISON
// ==========================================

export {
  // Benchmark calculator
  BenchmarkCalculator,
  BenchmarkManager,
  benchmarkManager,

  // Types
  BenchmarkConfig,
  BenchmarkResult,
  ComparisonResult,
  RollingComparisonResult,
} from './benchmark_comparison';

// ==========================================
// TRADE LOGGING
// ==========================================

export {
  // Trade logger
  TradeLogger,
  TradeAnalyzer,
  tradeLogger,

  // Types
  ExecutionLog,
  MarketConditions,
  DetailedTrade,
  ScalingEvent,
  TradeLogSummary,
  TradeLogExport,
} from './trade_logger';

// ==========================================
// POSITION SIZING
// ==========================================

export {
  // Position sizing
  PositionSizingCalculator,
  PositionSizeOptimizer,
  RiskCalculator,

  // Types
  PositionSizeResult,
  PositionSizingConfig,
  PositionSizingMethod,
} from './position_sizing';

// ==========================================
// OUT-OF-SAMPLE TESTING
// ==========================================

export {
  // Walk-forward analyzer
  WalkForwardAnalyzer,
  RobustnessTester,

  // Types
  OutOfSampleConfig,
  OutOfSampleResult,
  WalkForwardResult as OOSWalkForwardResult,
  RegimeAnalysisResult,
  RobustnessTestResult,
} from './out_of_sample';

// ==========================================
// EXPORT FUNCTIONALITY
// ==========================================

export {
  // Exporters
  ResultExporter,
  ComparisonExporter,
  OOSExporter,

  // Types
  ExportFormat,
  ExportOptions,
  ExportResult,
} from './export_results';

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

import { BacktestConfig, BacktestingEngine, Candle } from '../strategies/backtesting_engine';
import { EnhancedBacktestingEngine, EnhancedBacktestConfig } from './backtest_engine';
import { MultiAssetBacktestEngine, MultiAssetConfig } from './multi_asset_backtest';
import { GridSearchOptimizer, GeneticAlgorithmOptimizer, ParameterSpace, OptimizationConfig } from './optimization_engine';

/**
 * Quick backtest function for simple use cases
 */
export async function runQuickBacktest(
  symbol: string,
  candles: Candle[],
  options?: Partial<BacktestConfig>
): Promise<import('../strategies/backtesting_engine').BacktestResult> {
  const config: BacktestConfig = {
    symbol,
    startDate: candles[0]?.timestamp || new Date(),
    endDate: candles[candles.length - 1]?.timestamp || new Date(),
    initialCapital: options?.initialCapital || 10000,
    positionSizePercent: options?.positionSizePercent || 10,
    maxDrawdownPercent: options?.maxDrawdownPercent || 20,
    commissionPercent: options?.commissionPercent || 0.1,
    slippagePercent: options?.slippagePercent || 0.05,
    leverage: options?.leverage || 1,
    ...options,
  };

  const engine = new BacktestingEngine(config);
  return engine.runBacktest(candles);
}

/**
 * Quick enhanced backtest function
 */
export async function runEnhancedBacktest(
  symbol: string,
  candles: Candle[],
  options?: Partial<EnhancedBacktestConfig>
): Promise<import('./backtest_engine').EnhancedBacktestResult> {
  const config: EnhancedBacktestConfig = {
    symbol,
    startDate: candles[0]?.timestamp || new Date(),
    endDate: candles[candles.length - 1]?.timestamp || new Date(),
    initialCapital: options?.initialCapital || 10000,
    positionSizePercent: options?.positionSizePercent || 10,
    maxDrawdownPercent: options?.maxDrawdownPercent || 20,
    commissionPercent: options?.commissionPercent || 0.1,
    slippagePercent: options?.slippagePercent || 0.05,
    leverage: options?.leverage || 1,
    ...options,
  };

  const engine = new EnhancedBacktestingEngine(config);
  return engine.runEnhancedBacktest(candles);
}

/**
 * Quick portfolio backtest function
 */
export async function runPortfolioBacktest(
  assets: {
    symbol: string;
    allocation: number;
    assetClass?: 'stock' | 'crypto' | 'forex' | 'commodity';
  }[],
  assetData: Map<string, Candle[]>,
  options?: {
    rebalanceFrequency?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
    initialCapital?: number;
  }
): Promise<{
  portfolioMetrics: import('./multi_asset_backtest').PortfolioMetrics;
  assetResults: import('./multi_asset_backtest').AssetBacktestResult[];
}> {
  const config: MultiAssetConfig = {
    assets: assets.map(a => ({
      symbol: a.symbol,
      allocation: a.allocation,
      assetClass: a.assetClass || 'stock',
    })),
    rebalanceFrequency: options?.rebalanceFrequency || 'monthly',
    portfolioConfig: {
      symbol: 'PORTFOLIO',
      startDate: new Date(),
      endDate: new Date(),
      initialCapital: options?.initialCapital || 10000,
      positionSizePercent: 100,
      maxDrawdownPercent: 20,
      commissionPercent: 0.1,
      slippagePercent: 0.05,
      leverage: 1,
    },
  };

  const engine = new MultiAssetBacktestEngine(config);
  const result = await engine.runPortfolioBacktest(assetData);

  return {
    portfolioMetrics: result.portfolioMetrics,
    assetResults: result.assetResults,
  };
}

/**
 * Quick optimization function
 */
export async function runOptimization(
  candles: Candle[],
  baseConfig: BacktestConfig,
  parameterSpace: ParameterSpace[],
  method: 'grid' | 'genetic' = 'grid',
  optimizationConfig?: OptimizationConfig
): Promise<{
  bestResult: import('./optimization_engine').OptimizationResult;
}> {
  const optConfig: OptimizationConfig = {
    objective: 'multi_objective',
    ...optimizationConfig,
  };

  if (method === 'genetic') {
    const optimizer = new GeneticAlgorithmOptimizer(
      {
        populationSize: 50,
        generations: 20,
        mutationRate: 0.1,
        crossoverRate: 0.8,
        elitismRate: 0.1,
      },
      optConfig
    );

    const result = await optimizer.optimize(candles, baseConfig, parameterSpace);
    return { bestResult: result.bestResult };
  } else {
    const optimizer = new GridSearchOptimizer(optConfig);
    const result = await optimizer.optimize(candles, baseConfig, parameterSpace);
    return { bestResult: result.bestResult };
  }
}

// ==========================================
// VERSION INFO
// ==========================================

export const BACKTESTING_VERSION = '2.0.0';
export const BACKTESTING_FEATURES = [
  // Asset Types
  'Multi-asset backtesting (stocks, crypto, forex, options)',
  'Options pricing (Black-Scholes, Binomial)',
  'Options strategies (spreads, straddles, iron condors)',
  'Greeks calculation (Delta, Gamma, Theta, Vega, Rho)',

  // Analysis
  'Multi-timeframe analysis',
  'Walk-forward optimization',
  'K-Fold cross-validation',
  'Combinatorial purged cross-validation',
  'Monte Carlo simulation',
  'Regime detection and analysis',

  // Risk Metrics
  'Sharpe, Sortino, Calmar ratios',
  'Max Drawdown analysis',
  'Value at Risk (VaR)',
  'Expected Shortfall (CVaR)',

  // Transaction Cost Modeling
  'Realistic slippage modeling',
  'Tiered commission structures',
  'Market impact estimation',

  // Position Sizing
  'Fixed Fractional',
  'Kelly Criterion (Full, Half, Quarter)',
  'Optimal F (Ralph Vince)',
  'Volatility targeting',
  'ATR-based sizing',

  // Portfolio
  'Portfolio-level backtesting',
  'Correlation analysis',
  'Risk parity allocation',
  'Rebalancing strategies',

  // Benchmarks
  'Benchmark comparison (Buy & Hold, Indices)',
  'Alpha and Beta calculation',
  'Information ratio',
  'Up/Down capture ratios',

  // Optimization
  'Grid search parameter optimization',
  'Genetic algorithm optimization',
  'Parameter sensitivity analysis',

  // Validation
  'Out-of-sample testing',
  'Robustness testing',
  'Overfit detection',

  // Detailed Logging
  'Comprehensive trade logs',
  'Execution tracking',
  'MAE/MFE analysis',

  // Export
  'CSV export',
  'JSON export',
  'HTML reports',
  'Excel-compatible format',

  // Performance
  'LRU caching',
  'Data quality validation',
  'Equity curve visualization',
  'Monthly returns heatmap',
];

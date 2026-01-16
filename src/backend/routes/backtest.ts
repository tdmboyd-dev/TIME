/**
 * TIME — Meta-Intelligence Trading Governor
 * Backtesting Routes
 *
 * Complete API for:
 * - Running backtests
 * - Parameter optimization
 * - Walk-forward analysis
 * - Monte Carlo simulation
 * - Result storage and retrieval
 */

import { Router, Request, Response } from 'express';
import {
  BacktestingEngine,
  BacktestConfig,
  WalkForwardOptimizer,
  MonteCarloSimulator,
  generateTestCandles,
} from '../strategies/backtesting_engine';
import {
  EnhancedBacktestingEngine,
  EnhancedBacktestConfig,
  backtestResultStore,
  VisualizationFormatter,
} from '../backtesting/backtest_engine';
import { candleDataCache, DataQualityChecker } from '../backtesting/data_cache';
import { loggers } from '../utils/logger';

const router = Router();
const log = loggers.api;

/**
 * POST /backtest/run
 * Run a backtest with provided configuration
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      startDate,
      endDate,
      initialCapital,
      positionSizePercent,
      maxDrawdownPercent,
      commissionPercent,
      slippagePercent,
      leverage,
      candles, // Optional: provide your own candle data
    } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: symbol',
      });
    }

    const config: BacktestConfig = {
      symbol,
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
      initialCapital: initialCapital || 10000,
      positionSizePercent: positionSizePercent || 10,
      maxDrawdownPercent: maxDrawdownPercent || 20,
      commissionPercent: commissionPercent || 0.1,
      slippagePercent: slippagePercent || 0.05,
      leverage: leverage || 1,
    };

    // Use provided candles or generate test data
    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      // Generate test candles for demo
      const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (24 * 60 * 60 * 1000));
      candleData = generateTestCandles(symbol, days, 100);
      log.info(`Generated ${candleData.length} test candles for ${symbol}`);
    }

    // Run backtest
    const engine = new BacktestingEngine(config);
    const result = engine.runBacktest(candleData);

    log.info(`Backtest completed for ${symbol}: ${result.totalTrades} trades, ${result.totalReturnPercent.toFixed(2)}% return`);

    res.json({
      success: true,
      data: {
        summary: {
          symbol: result.symbol,
          period: result.period,
          initialCapital: result.initialCapital,
          finalCapital: result.finalCapital,
          totalReturn: result.totalReturn,
          totalReturnPercent: result.totalReturnPercent,
          annualizedReturn: result.annualizedReturn,
        },
        tradeStats: {
          totalTrades: result.totalTrades,
          winningTrades: result.winningTrades,
          losingTrades: result.losingTrades,
          winRate: result.winRate,
          avgWin: result.avgWin,
          avgLoss: result.avgLoss,
          largestWin: result.largestWin,
          largestLoss: result.largestLoss,
          avgHoldingPeriod: result.avgHoldingPeriod,
        },
        riskMetrics: {
          maxDrawdown: result.maxDrawdown,
          maxDrawdownPercent: result.maxDrawdownPercent,
          sharpeRatio: result.sharpeRatio,
          sortinoRatio: result.sortinoRatio,
          calmarRatio: result.calmarRatio,
          profitFactor: result.profitFactor,
        },
        analysis: {
          consecutiveWins: result.consecutiveWins,
          consecutiveLosses: result.consecutiveLosses,
          avgTradeReturn: result.avgTradeReturn,
          expectancy: result.expectancy,
        },
        equityCurve: result.equityCurve,
        drawdownCurve: result.drawdownCurve,
        trades: result.trades.slice(0, 100), // Limit trades in response
      },
    });
  } catch (error) {
    log.error('Failed to run backtest:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/walk-forward
 * Run walk-forward optimization
 */
router.post('/walk-forward', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      initialCapital,
      numFolds,
      candles,
    } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: symbol',
      });
    }

    const config: BacktestConfig = {
      symbol,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      initialCapital: initialCapital || 10000,
      positionSizePercent: 10,
      maxDrawdownPercent: 20,
      commissionPercent: 0.1,
      slippagePercent: 0.05,
      leverage: 1,
    };

    // Use provided candles or generate test data
    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol, 365, 100);
    }

    const optimizer = new WalkForwardOptimizer();
    const result = optimizer.runWalkForward(candleData, config, numFolds || 5);

    log.info(`Walk-forward completed for ${symbol}: ${result.walkForwardResults?.length || 0} folds`);

    res.json({
      success: true,
      data: {
        fullBacktest: {
          totalReturn: result.totalReturnPercent,
          sharpeRatio: result.sharpeRatio,
          maxDrawdown: result.maxDrawdownPercent,
          winRate: result.winRate,
        },
        walkForwardResults: result.walkForwardResults,
        avgOutOfSampleReturn: result.walkForwardResults
          ? result.walkForwardResults.reduce((sum, r) => sum + r.outOfSampleReturn, 0) / result.walkForwardResults.length
          : 0,
        avgEfficiency: result.walkForwardResults
          ? result.walkForwardResults.reduce((sum, r) => sum + r.efficiency, 0) / result.walkForwardResults.length
          : 0,
      },
    });
  } catch (error) {
    log.error('Failed to run walk-forward:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/monte-carlo
 * Run Monte Carlo simulation on trade results
 */
router.post('/monte-carlo', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      initialCapital,
      numSimulations,
      trades, // Optional: provide historical trades
    } = req.body;

    // If no trades provided, run a backtest first
    let tradeData = trades;
    if (!tradeData || tradeData.length === 0) {
      const config: BacktestConfig = {
        symbol: symbol || 'TEST',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        initialCapital: initialCapital || 10000,
        positionSizePercent: 10,
        maxDrawdownPercent: 20,
        commissionPercent: 0.1,
        slippagePercent: 0.05,
        leverage: 1,
      };

      const candleData = generateTestCandles(symbol || 'TEST', 365, 100);
      const engine = new BacktestingEngine(config);
      const backtest = engine.runBacktest(candleData);
      tradeData = backtest.trades;
    }

    const simulator = new MonteCarloSimulator();
    const result = simulator.runSimulation(
      tradeData,
      initialCapital || 10000,
      numSimulations || 1000
    );

    log.info(`Monte Carlo completed: ${result.simulations} simulations, ${(result.probabilityOfProfit * 100).toFixed(1)}% profit probability`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to run Monte Carlo:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /backtest/generate-candles
 * Generate test candle data for demo purposes
 */
router.get('/generate-candles', (req: Request, res: Response) => {
  try {
    const { symbol, days, startPrice } = req.query;

    const candles = generateTestCandles(
      (symbol as string) || 'TEST',
      parseInt(days as string) || 30,
      parseFloat(startPrice as string) || 100
    );

    res.json({
      success: true,
      data: {
        symbol,
        candles: candles.slice(0, 1000), // Limit response size
        total: candles.length,
      },
    });
  } catch (error) {
    log.error('Failed to generate candles:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/optimize/grid-search
 * Run grid search parameter optimization
 */
router.post('/optimize/grid-search', async (req: Request, res: Response) => {
  try {
    const { symbol, config, parameterSpace, candles } = req.body;

    if (!symbol || !parameterSpace) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, parameterSpace',
      });
    }

    // Import optimization engine
    const { GridSearchOptimizer } = await import('../backtesting/optimization_engine');

    const baseConfig: BacktestConfig = {
      symbol,
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
    };

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol, 365, 100);
    }

    const optimizer = new GridSearchOptimizer({
      objective: config?.objective || 'multi_objective',
      constraints: config?.constraints,
      multiObjectiveWeights: config?.multiObjectiveWeights,
    });

    const result = await optimizer.optimize(candleData, baseConfig, parameterSpace);

    log.info(`Grid search optimization completed: ${result.allResults.length} combinations tested`);

    res.json({
      success: true,
      data: {
        bestResult: result.bestResult,
        topResults: result.allResults.slice(0, 10),
        paretoFrontier: result.paretoFrontier,
        totalCombinations: result.allResults.length,
      },
    });
  } catch (error) {
    log.error('Failed to run grid search optimization:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/optimize/genetic
 * Run genetic algorithm optimization
 */
router.post('/optimize/genetic', async (req: Request, res: Response) => {
  try {
    const { symbol, config, parameterSpace, geneticConfig, candles } = req.body;

    if (!symbol || !parameterSpace) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, parameterSpace',
      });
    }

    const { GeneticAlgorithmOptimizer } = await import('../backtesting/optimization_engine');

    const baseConfig: BacktestConfig = {
      symbol,
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
    };

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol, 365, 100);
    }

    const optimizer = new GeneticAlgorithmOptimizer(
      {
        populationSize: geneticConfig?.populationSize || 50,
        generations: geneticConfig?.generations || 20,
        mutationRate: geneticConfig?.mutationRate || 0.1,
        crossoverRate: geneticConfig?.crossoverRate || 0.8,
        elitismRate: geneticConfig?.elitismRate || 0.1,
      },
      {
        objective: config?.objective || 'multi_objective',
        constraints: config?.constraints,
        multiObjectiveWeights: config?.multiObjectiveWeights,
      }
    );

    const result = await optimizer.optimize(candleData, baseConfig, parameterSpace);

    log.info(`Genetic algorithm optimization completed: best fitness=${result.bestResult.objectiveValue.toFixed(4)}`);

    res.json({
      success: true,
      data: {
        bestResult: result.bestResult,
        generationHistory: result.generationHistory,
      },
    });
  } catch (error) {
    log.error('Failed to run genetic algorithm optimization:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/advanced/walk-forward
 * Run advanced walk-forward analysis
 */
router.post('/advanced/walk-forward', async (req: Request, res: Response) => {
  try {
    const { symbol, config, trainWindowDays, testWindowDays, stepDays, candles } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: symbol',
      });
    }

    const { AdvancedBacktestEngine } = await import('../backtesting/advanced_backtest');

    const advancedConfig = {
      symbol,
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
      positionSizingMethod: config?.positionSizingMethod || 'fixed',
    };

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol, 365, 100);
    }

    const engine = new AdvancedBacktestEngine(advancedConfig);
    const result = await engine.runWalkForwardAnalysis(
      candleData,
      trainWindowDays || 180,
      testWindowDays || 30,
      stepDays || 30
    );

    log.info(`Walk-forward analysis completed: ${result.results.length} periods, efficiency=${result.efficiency.toFixed(2)}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to run walk-forward analysis:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/advanced/monte-carlo
 * Run advanced Monte Carlo simulation
 */
router.post('/advanced/monte-carlo', async (req: Request, res: Response) => {
  try {
    const { symbol, config, monteCarloConfig, candles } = req.body;

    const { AdvancedBacktestEngine } = await import('../backtesting/advanced_backtest');

    const advancedConfig = {
      symbol: symbol || 'TEST',
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
      positionSizingMethod: config?.positionSizingMethod || 'fixed',
    };

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol || 'TEST', 365, 100);
    }

    const engine = new AdvancedBacktestEngine(advancedConfig);
    const result = await engine.runMonteCarloSimulation(candleData, {
      numRuns: monteCarloConfig?.numRuns || 1000,
      randomizeEntries: monteCarloConfig?.randomizeEntries || false,
      randomizeExits: monteCarloConfig?.randomizeExits || false,
      confidenceLevel: monteCarloConfig?.confidenceLevel || 0.95,
      bootstrapMethod: monteCarloConfig?.bootstrapMethod || 'shuffle',
    });

    log.info(`Monte Carlo simulation completed: ${result.runs.length} runs, P(profit)=${(result.statistics.probabilityOfProfit * 100).toFixed(1)}%`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to run Monte Carlo simulation:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/analyze/sensitivity
 * Analyze parameter sensitivity
 */
router.post('/analyze/sensitivity', async (req: Request, res: Response) => {
  try {
    const { symbol, config, parameter, numSteps, candles } = req.body;

    if (!symbol || !parameter) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, parameter',
      });
    }

    const { ParameterSensitivityAnalyzer } = await import('../backtesting/optimization_engine');

    const baseConfig: BacktestConfig = {
      symbol,
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
    };

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol, 365, 100);
    }

    const analyzer = new ParameterSensitivityAnalyzer();
    const result = await analyzer.analyze(candleData, baseConfig, parameter, numSteps || 10);

    log.info(`Sensitivity analysis completed for ${parameter.name}: sensitivity=${result.sensitivity.toFixed(4)}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to run sensitivity analysis:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /backtest/results/:id
 * Get detailed backtest results from storage
 */
router.get('/results/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = backtestResultStore.get(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Backtest result not found: ${id}`,
      });
    }

    log.info(`Retrieved backtest results for ID: ${id}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to retrieve backtest results:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /backtest/results
 * List all stored backtest results
 */
router.get('/results', async (req: Request, res: Response) => {
  try {
    const { limit, tag } = req.query;

    let results;
    if (tag) {
      results = backtestResultStore.searchByTag(tag as string);
    } else {
      results = backtestResultStore.list(parseInt(limit as string) || 100);
    }

    res.json({
      success: true,
      data: results.map(r => ({
        id: r.id,
        createdAt: r.createdAt,
        symbol: r.config.symbol,
        totalReturn: r.result.totalReturnPercent,
        sharpeRatio: r.result.sharpeRatio,
        maxDrawdown: r.result.maxDrawdownPercent,
        trades: r.result.totalTrades,
        tags: r.tags,
      })),
      total: results.length,
    });
  } catch (error) {
    log.error('Failed to list backtest results:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /backtest/results/:id
 * Delete a stored backtest result
 */
router.delete('/results/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = backtestResultStore.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Backtest result not found: ${id}`,
      });
    }

    log.info(`Deleted backtest result: ${id}`);

    res.json({
      success: true,
      message: `Backtest result ${id} deleted`,
    });
  } catch (error) {
    log.error('Failed to delete backtest result:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/enhanced
 * Run enhanced backtest with additional metrics
 */
router.post('/enhanced', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      config,
      candles,
      storeResult,
      tags,
    } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: symbol',
      });
    }

    const enhancedConfig: EnhancedBacktestConfig = {
      symbol,
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
      timeframes: config?.timeframes,
      assetType: config?.assetType || 'stock',
      slippageModel: config?.slippageModel || 'fixed',
      commissionModel: config?.commissionModel || 'percent',
      positionSizingMethod: config?.positionSizingMethod || 'fixed',
    };

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      const days = Math.ceil((enhancedConfig.endDate.getTime() - enhancedConfig.startDate.getTime()) / (24 * 60 * 60 * 1000));
      candleData = generateTestCandles(symbol, days, 100);
    }

    // Validate data quality
    const validation = DataQualityChecker.validateCandles(candleData);
    if (!validation.valid) {
      log.warn(`Data quality issues for ${symbol}:`, validation.errors);
    }

    // Run enhanced backtest
    const engine = new EnhancedBacktestingEngine(enhancedConfig);
    const result = engine.runEnhancedBacktest(candleData);

    // Store result if requested
    let resultId;
    if (storeResult) {
      resultId = backtestResultStore.store(enhancedConfig, result, tags);
    }

    log.info(`Enhanced backtest completed for ${symbol}: ${result.totalTrades} trades, ${result.totalReturnPercent.toFixed(2)}% return`);

    res.json({
      success: true,
      data: {
        id: resultId,
        summary: {
          symbol: result.symbol,
          period: result.period,
          initialCapital: result.initialCapital,
          finalCapital: result.finalCapital,
          totalReturn: result.totalReturn,
          totalReturnPercent: result.totalReturnPercent,
          annualizedReturn: result.annualizedReturn,
        },
        tradeStats: {
          totalTrades: result.totalTrades,
          winningTrades: result.winningTrades,
          losingTrades: result.losingTrades,
          winRate: result.winRate,
          avgWin: result.avgWin,
          avgLoss: result.avgLoss,
          profitFactor: result.profitFactor,
        },
        riskMetrics: {
          maxDrawdown: result.maxDrawdown,
          maxDrawdownPercent: result.maxDrawdownPercent,
          sharpeRatio: result.sharpeRatio,
          sortinoRatio: result.sortinoRatio,
          calmarRatio: result.calmarRatio,
          ulcerIndex: result.ulcerIndex,
          painRatio: result.painRatio,
          recoveryFactor: result.recoveryFactor,
          tailRatio: result.tailRatio,
        },
        timeAnalysis: {
          bestTradingDay: result.bestTradingDay,
          worstTradingDay: result.worstTradingDay,
          bestTradingHour: result.bestTradingHour,
          worstTradingHour: result.worstTradingHour,
        },
        monthlyReturns: result.monthlyReturns,
        tradeDistribution: result.tradeDistribution,
        equityCurve: result.equityCurve,
        drawdownCurve: result.drawdownCurve,
        dataQuality: validation,
      },
    });
  } catch (error) {
    log.error('Failed to run enhanced backtest:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/optimize
 * Run comprehensive parameter optimization
 */
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      config,
      parameterSpace,
      optimizationMethod,
      candles,
    } = req.body;

    if (!symbol || !parameterSpace) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, parameterSpace',
      });
    }

    const method = optimizationMethod || 'grid';

    const baseConfig: BacktestConfig = {
      symbol,
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
    };

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol, 365, 100);
    }

    let result;

    if (method === 'genetic') {
      const { GeneticAlgorithmOptimizer } = await import('../backtesting/optimization_engine');

      const optimizer = new GeneticAlgorithmOptimizer(
        {
          populationSize: config?.populationSize || 50,
          generations: config?.generations || 20,
          mutationRate: config?.mutationRate || 0.1,
          crossoverRate: config?.crossoverRate || 0.8,
          elitismRate: config?.elitismRate || 0.1,
        },
        {
          objective: config?.objective || 'multi_objective',
          constraints: config?.constraints,
        }
      );

      const gaResult = await optimizer.optimize(candleData, baseConfig, parameterSpace);

      result = {
        method: 'genetic',
        bestResult: gaResult.bestResult,
        generationHistory: gaResult.generationHistory,
      };
    } else {
      const { GridSearchOptimizer } = await import('../backtesting/optimization_engine');

      const optimizer = new GridSearchOptimizer({
        objective: config?.objective || 'multi_objective',
        constraints: config?.constraints,
      });

      const gsResult = await optimizer.optimize(candleData, baseConfig, parameterSpace);

      result = {
        method: 'grid',
        bestResult: gsResult.bestResult,
        topResults: gsResult.allResults.slice(0, 10),
        paretoFrontier: gsResult.paretoFrontier,
        totalCombinations: gsResult.allResults.length,
      };
    }

    log.info(`Optimization completed for ${symbol} using ${method} method`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to run optimization:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /backtest/visualization/:id
 * Get visualization-ready data for charts
 */
router.get('/visualization/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const stored = backtestResultStore.get(id);

    if (!stored) {
      return res.status(404).json({
        success: false,
        error: `Backtest result not found: ${id}`,
      });
    }

    const result = stored.result;
    let visualization: any = {};

    switch (type) {
      case 'equity':
        visualization = VisualizationFormatter.formatEquityCurve(result.equityCurve);
        break;
      case 'drawdown':
        visualization = VisualizationFormatter.formatDrawdownCurve(result.drawdownCurve);
        break;
      case 'monthly':
        visualization = VisualizationFormatter.formatMonthlyHeatmap(result.monthlyReturns || []);
        break;
      case 'distribution':
        visualization = VisualizationFormatter.formatTradeDistribution(result.tradeDistribution || {
          byDay: [], byHour: [], byDuration: [], bySize: [],
        });
        break;
      case 'scatter':
        visualization = VisualizationFormatter.formatTradeScatter(result.trades);
        break;
      default:
        // Return all visualizations
        visualization = {
          equity: VisualizationFormatter.formatEquityCurve(result.equityCurve),
          drawdown: VisualizationFormatter.formatDrawdownCurve(result.drawdownCurve),
          monthly: VisualizationFormatter.formatMonthlyHeatmap(result.monthlyReturns || []),
          distribution: VisualizationFormatter.formatTradeDistribution(result.tradeDistribution || {
            byDay: [], byHour: [], byDuration: [], bySize: [],
          }),
          scatter: VisualizationFormatter.formatTradeScatter(result.trades),
        };
    }

    res.json({
      success: true,
      data: visualization,
    });
  } catch (error) {
    log.error('Failed to get visualization data:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /backtest/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = candleDataCache.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log.error('Failed to get cache stats:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/cache/clear
 * Clear the data cache
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    await candleDataCache.clearAll();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    log.error('Failed to clear cache:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /backtest/export/:id
 * Export backtest results to CSV/JSON/HTML
 */
router.get('/export/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    const stored = backtestResultStore.get(id);

    if (!stored) {
      return res.status(404).json({
        success: false,
        error: `Backtest result not found: ${id}`,
      });
    }

    const { ResultExporter } = await import('../backtesting/export_results');

    const exportFormat = (format as string) || 'json';
    const result = ResultExporter.export(stored.result, {
      format: exportFormat as any,
      includeTrades: true,
      includeEquityCurve: true,
      includeMonthlyReturns: true,
      filename: `backtest_${stored.config.symbol}_${id}`,
    });

    log.info(`Exported backtest ${id} as ${exportFormat}`);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (error) {
    log.error('Failed to export backtest results:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/options
 * Run options backtesting
 */
router.post('/options', async (req: Request, res: Response) => {
  try {
    const {
      underlying,
      strategy,
      startDate,
      endDate,
      initialCapital,
      riskFreeRate,
      maxLossPercent,
      candles,
    } = req.body;

    if (!underlying) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: underlying',
      });
    }

    const { OptionsBacktestEngine, PREDEFINED_STRATEGIES } = await import('../backtesting/options_backtest');

    const config = {
      underlying,
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
      initialCapital: initialCapital || 10000,
      riskFreeRate: riskFreeRate || 0.05,
      dividendYield: 0,
      maxPositions: 5,
      maxLossPercent: maxLossPercent || 20,
      commissionPerContract: 0.65,
      slippageTicks: 1,
    };

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(underlying, 365, 100);
    }

    const engine = new OptionsBacktestEngine(config);
    const strategyToUse = strategy || 'covered_call';
    const result = engine.runBacktest(candleData, strategyToUse);

    log.info(`Options backtest completed for ${underlying}: ${result.totalTrades} trades, ${result.totalReturnPercent.toFixed(2)}% return`);

    res.json({
      success: true,
      data: {
        summary: {
          underlying: result.symbol,
          strategy: strategyToUse,
          period: result.period,
          totalReturn: result.totalReturnPercent,
          sharpeRatio: result.sharpeRatio,
          maxDrawdown: result.maxDrawdownPercent,
        },
        optionsMetrics: {
          avgDelta: result.avgDelta,
          avgGamma: result.avgGamma,
          avgTheta: result.avgTheta,
          avgVega: result.avgVega,
          thetaDecayTotal: result.thetaDecayTotal,
          assignmentCount: result.assignmentCount,
          expirationCount: result.expirationCount,
          exerciseCount: result.exerciseCount,
        },
        trades: result.optionsTrades.slice(0, 50),
        equityCurve: result.equityCurve,
        availableStrategies: Object.keys(PREDEFINED_STRATEGIES),
      },
    });
  } catch (error) {
    log.error('Failed to run options backtest:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/benchmark
 * Run benchmark comparison
 */
router.post('/benchmark', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      benchmarks,
      config,
      candles,
      benchmarkCandles,
    } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: symbol',
      });
    }

    const { BenchmarkCalculator, benchmarkManager } = await import('../backtesting/benchmark_comparison');

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol, 365, 100);
    }

    const backConfig: BacktestConfig = {
      symbol,
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
    };

    const engine = new BacktestingEngine(backConfig);
    const strategyResult = engine.runBacktest(candleData);

    const benchmarkNames = benchmarks || ['Buy & Hold', 'Risk-Free (2%)'];
    const additionalCandles = benchmarkCandles
      ? new Map(Object.entries(benchmarkCandles)) as Map<string, any[]>
      : undefined;

    const benchmarkResults = await benchmarkManager.calculateBenchmarks(
      benchmarkNames,
      candleData,
      additionalCandles,
      config?.initialCapital || 10000
    );

    const comparison = BenchmarkCalculator.compareWithBenchmarks(strategyResult, benchmarkResults);

    log.info(`Benchmark comparison completed for ${symbol} against ${benchmarkNames.length} benchmarks`);

    res.json({
      success: true,
      data: {
        strategy: {
          totalReturn: strategyResult.totalReturnPercent,
          sharpeRatio: strategyResult.sharpeRatio,
          maxDrawdown: strategyResult.maxDrawdownPercent,
        },
        benchmarks: benchmarkResults.map(b => ({
          name: b.name,
          totalReturn: b.totalReturnPercent,
          sharpeRatio: b.sharpeRatio,
          maxDrawdown: b.maxDrawdownPercent,
        })),
        comparison: comparison.comparison,
        rollingComparison: comparison.rollingComparison.slice(0, 50),
      },
    });
  } catch (error) {
    log.error('Failed to run benchmark comparison:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/out-of-sample
 * Run out-of-sample analysis
 */
router.post('/out-of-sample', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      method,
      config,
      oosConfig,
      candles,
    } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: symbol',
      });
    }

    const { WalkForwardAnalyzer, RobustnessTester } = await import('../backtesting/out_of_sample');

    let candleData = candles;
    if (!candleData || candleData.length === 0) {
      candleData = generateTestCandles(symbol, 730, 100);
    }

    const backConfig: BacktestConfig = {
      symbol,
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: config?.positionSizePercent || 10,
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
    };

    const analyzer = new WalkForwardAnalyzer({
      method: method || 'walk_forward',
      trainRatio: oosConfig?.trainRatio || 0.7,
      testRatio: oosConfig?.testRatio || 0.3,
      numFolds: oosConfig?.numFolds || 5,
      embargoPeriod: oosConfig?.embargoPeriod || 0,
      stepSize: oosConfig?.stepSize || 30,
      minTrainDays: oosConfig?.minTrainDays || 180,
    });

    const oosResult = await analyzer.analyze(candleData, backConfig);
    const robustnessTests = await RobustnessTester.runTests(candleData, backConfig, oosResult);

    log.info(`OOS analysis completed for ${symbol}: ${oosResult.foldResults.length} folds`);

    res.json({
      success: true,
      data: {
        method: oosResult.method,
        aggregatedMetrics: oosResult.aggregatedMetrics,
        statisticalTests: oosResult.statisticalTests,
        foldResults: oosResult.foldResults.map(f => ({
          foldId: f.foldId,
          trainReturn: f.trainResult.totalReturnPercent,
          testReturn: f.testResult.totalReturnPercent,
          efficiency: f.efficiency,
          degradation: f.degradation,
        })),
        regimeAnalysis: oosResult.regimeAnalysis,
        robustnessTests,
      },
    });
  } catch (error) {
    log.error('Failed to run out-of-sample analysis:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/position-sizing
 * Calculate position size using various methods
 */
router.post('/position-sizing', async (req: Request, res: Response) => {
  try {
    const {
      method,
      capital,
      price,
      stopLossPercent,
      volatility,
      targetVolatility,
      riskPerTrade,
      historicalTrades,
    } = req.body;

    if (!capital || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: capital, price',
      });
    }

    const { PositionSizingCalculator } = await import('../backtesting/position_sizing');

    const result = PositionSizingCalculator.calculate({
      method: method || 'fixed_fractional',
      capital,
      price,
      stopLossPercent: stopLossPercent || 2,
      volatility: volatility || 0.02,
      targetVolatility: targetVolatility || 0.15,
      riskPerTrade: riskPerTrade || 1,
      historicalTrades: historicalTrades || [],
      maxPositionPercent: 25,
      minPositionPercent: 0.5,
    });

    log.info(`Position size calculated: ${result.method} = $${result.positionSize.toFixed(2)}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to calculate position size:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/risk-analysis
 * Calculate risk metrics (VaR, Expected Drawdown)
 */
router.post('/risk-analysis', async (req: Request, res: Response) => {
  try {
    const {
      capital,
      confidenceLevel,
      trades,
      numSimulations,
    } = req.body;

    if (!trades || trades.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: trades',
      });
    }

    const { RiskCalculator } = await import('../backtesting/position_sizing');

    const var_result = RiskCalculator.calculateVaR(
      trades,
      capital || 10000,
      confidenceLevel || 0.95
    );

    const dd_result = RiskCalculator.calculateExpectedMaxDrawdown(
      trades,
      numSimulations || 1000
    );

    log.info(`Risk analysis completed: VaR=$${var_result.parametricVaR.toFixed(2)}`);

    res.json({
      success: true,
      data: {
        valueAtRisk: var_result,
        expectedMaxDrawdown: dd_result,
      },
    });
  } catch (error) {
    log.error('Failed to run risk analysis:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/portfolio
 * Run portfolio-level backtesting
 */
router.post('/portfolio', async (req: Request, res: Response) => {
  try {
    const {
      assets,
      rebalanceFrequency,
      initialCapital,
      assetCandles,
    } = req.body;

    if (!assets || assets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: assets',
      });
    }

    const { MultiAssetBacktestEngine } = await import('../backtesting/multi_asset_backtest');

    const totalAllocation = assets.reduce((sum: number, a: any) => sum + (a.allocation || 0), 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Asset allocations must sum to 100% (got ${totalAllocation}%)`,
      });
    }

    const assetData = new Map<string, any[]>();
    for (const asset of assets) {
      if (assetCandles && assetCandles[asset.symbol]) {
        assetData.set(asset.symbol, assetCandles[asset.symbol]);
      } else {
        assetData.set(asset.symbol, generateTestCandles(asset.symbol, 365, 100));
      }
    }

    const config = {
      assets: assets.map((a: any) => ({
        symbol: a.symbol,
        allocation: a.allocation,
        assetClass: a.assetClass || 'stock',
        rebalanceThreshold: a.rebalanceThreshold,
      })),
      rebalanceFrequency: rebalanceFrequency || 'monthly',
      portfolioConfig: {
        symbol: 'PORTFOLIO',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        initialCapital: initialCapital || 10000,
        positionSizePercent: 100,
        maxDrawdownPercent: 20,
        commissionPercent: 0.1,
        slippagePercent: 0.05,
        leverage: 1,
      },
    };

    const engine = new MultiAssetBacktestEngine(config);
    const result = await engine.runPortfolioBacktest(assetData);

    log.info(`Portfolio backtest completed: ${assets.length} assets`);

    res.json({
      success: true,
      data: {
        portfolioMetrics: result.portfolioMetrics,
        assetResults: result.assetResults.map(r => ({
          symbol: r.symbol,
          assetClass: r.assetClass,
          allocation: r.allocation,
          contribution: r.contribution,
          totalReturn: r.totalReturnPercent,
        })),
        correlation: result.correlation,
        rebalanceEvents: result.rebalanceEvents.slice(0, 20),
        equityCurve: result.equityCurve,
      },
    });
  } catch (error) {
    log.error('Failed to run portfolio backtest:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /backtest/features
 * Get list of available backtesting features
 */
router.get('/features', async (req: Request, res: Response) => {
  try {
    const { BACKTESTING_VERSION, BACKTESTING_FEATURES } = await import('../backtesting');

    res.json({
      success: true,
      data: {
        version: BACKTESTING_VERSION,
        features: BACKTESTING_FEATURES,
        endpoints: [
          'POST /run - Run basic backtest',
          'POST /enhanced - Run enhanced backtest with additional metrics',
          'POST /options - Run options backtesting',
          'POST /portfolio - Run portfolio-level backtesting',
          'POST /benchmark - Run benchmark comparison',
          'POST /out-of-sample - Run out-of-sample analysis',
          'POST /walk-forward - Run walk-forward optimization',
          'POST /monte-carlo - Run Monte Carlo simulation',
          'POST /optimize - Run parameter optimization',
          'POST /position-sizing - Calculate position size',
          'POST /risk-analysis - Calculate VaR and risk metrics',
          'GET /export/:id - Export results to CSV/JSON/HTML',
          'GET /results - List stored results',
          'GET /results/:id - Get specific result',
          'GET /visualization/:id - Get chart-ready data',
        ],
      },
    });
  } catch (error) {
    log.error('Failed to get features:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;

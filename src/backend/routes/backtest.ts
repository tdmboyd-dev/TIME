/**
 * TIME — Meta-Intelligence Trading Governor
 * Backtesting Routes
 */

import { Router, Request, Response } from 'express';
import {
  BacktestingEngine,
  BacktestConfig,
  WalkForwardOptimizer,
  MonteCarloSimulator,
  generateTestCandles,
} from '../strategies/backtesting_engine';
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
 * Get detailed backtest results (placeholder for future database storage)
 */
router.get('/results/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Implement database storage and retrieval
    log.info(`Retrieving backtest results for ID: ${id}`);

    res.json({
      success: true,
      message: 'Result storage coming soon',
      data: null,
    });
  } catch (error) {
    log.error('Failed to retrieve backtest results:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /backtest/export/:id
 * Export backtest results to PDF/CSV (placeholder)
 */
router.get('/export/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    // TODO: Implement PDF/CSV export
    log.info(`Exporting backtest ${id} as ${format}`);

    res.json({
      success: true,
      message: 'Export functionality coming soon',
      data: null,
    });
  } catch (error) {
    log.error('Failed to export backtest results:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;

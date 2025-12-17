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

export default router;

/**
 * TIME — Multi-Asset Backtesting Routes
 * Portfolio-level backtesting, optimization, and correlation analysis
 */

import { Router, Request, Response } from 'express';
import {
  BacktestConfig,
  generateTestCandles,
} from '../strategies/backtesting_engine';
import { loggers } from '../utils/logger';

const router = Router();
const log = loggers.api;

/**
 * POST /backtest/multi-asset
 * Run portfolio backtest across multiple assets
 */
router.post('/multi-asset', async (req: Request, res: Response) => {
  try {
    const { assets, config, rebalanceFrequency, fetchHistoricalData } = req.body;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid assets array',
      });
    }

    const { MultiAssetBacktestEngine } = await import('../backtesting/multi_asset_backtest');
    const { marketDataManager } = await import('../backtesting/market_data_integration');

    // Validate total allocation
    const totalAllocation = assets.reduce((sum: number, a: any) => sum + (a.allocation || 0), 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Asset allocations must sum to 100% (got ${totalAllocation}%)`,
      });
    }

    const portfolioConfig: BacktestConfig = {
      symbol: 'PORTFOLIO',
      startDate: config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: config?.endDate ? new Date(config.endDate) : new Date(),
      initialCapital: config?.initialCapital || 10000,
      positionSizePercent: 100, // Full portfolio
      maxDrawdownPercent: config?.maxDrawdownPercent || 20,
      commissionPercent: config?.commissionPercent || 0.1,
      slippagePercent: config?.slippagePercent || 0.05,
      leverage: config?.leverage || 1,
    };

    const multiAssetConfig = {
      assets: assets.map((a: any) => ({
        symbol: a.symbol,
        assetClass: a.assetClass || 'stock',
        allocation: a.allocation,
        rebalanceThreshold: a.rebalanceThreshold,
      })),
      rebalanceFrequency: rebalanceFrequency || 'monthly',
      portfolioConfig,
    };

    // Fetch historical data if requested
    let assetData = new Map<string, any[]>();

    if (fetchHistoricalData) {
      const symbols = assets.map((a: any) => a.symbol);
      const assetTypes = new Map(assets.map((a: any) => [a.symbol, a.assetClass || 'stock']));

      assetData = await marketDataManager.fetchMultiAssetCandles({
        symbols,
        startDate: portfolioConfig.startDate,
        endDate: portfolioConfig.endDate,
        interval: config?.interval || '1h',
        assetTypes,
      });

      // Align timestamps across assets
      assetData = marketDataManager.alignCandles(assetData);
    } else {
      // Use provided candle data or generate test data
      for (const asset of assets) {
        const candles = asset.candles || generateTestCandles(asset.symbol, 365, 100);
        assetData.set(asset.symbol, candles);
      }
    }

    // Run multi-asset backtest
    const engine = new MultiAssetBacktestEngine(multiAssetConfig);
    const result = await engine.runPortfolioBacktest(assetData);

    log.info(`Multi-asset backtest completed: ${result.assetResults.length} assets, ${result.portfolioMetrics.totalReturnPercent.toFixed(2)}% return`);

    res.json({
      success: true,
      data: {
        portfolioMetrics: result.portfolioMetrics,
        assetResults: result.assetResults.map(r => ({
          symbol: r.symbol,
          assetClass: r.assetClass,
          allocation: r.allocation,
          return: r.totalReturnPercent,
          sharpeRatio: r.sharpeRatio,
          maxDrawdown: r.maxDrawdownPercent,
          contribution: r.contribution,
          trades: r.totalTrades,
        })),
        correlation: result.correlation,
        rebalanceEvents: result.rebalanceEvents,
        equityCurve: result.equityCurve.slice(0, 1000), // Limit response size
      },
    });
  } catch (error) {
    log.error('Failed to run multi-asset backtest:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/portfolio-optimization
 * Optimize portfolio weights using Markowitz mean-variance
 */
router.post('/portfolio-optimization', async (req: Request, res: Response) => {
  try {
    const { assets, config, targetReturn } = req.body;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid assets array',
      });
    }

    const { MultiAssetBacktestEngine } = await import('../backtesting/multi_asset_backtest');
    const { marketDataManager } = await import('../backtesting/market_data_integration');

    // Fetch historical data
    const symbols = assets.map((a: any) => a.symbol);
    const assetTypes = new Map(assets.map((a: any) => [a.symbol, a.assetClass || 'stock']));

    const startDate = config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = config?.endDate ? new Date(config.endDate) : new Date();

    const assetData = await marketDataManager.fetchMultiAssetCandles({
      symbols,
      startDate,
      endDate,
      interval: config?.interval || '1h',
      assetTypes,
    });

    // Calculate returns for each asset
    const returns = new Map<string, number[]>();

    for (const [symbol, candles] of assetData) {
      const assetReturns: number[] = [];
      for (let i = 1; i < candles.length; i++) {
        const ret = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
        assetReturns.push(ret);
      }
      returns.set(symbol, assetReturns);
    }

    // Run optimization
    const dummyConfig = {
      assets: assets.map((a: any) => ({
        symbol: a.symbol,
        assetClass: a.assetClass || 'stock',
        allocation: 100 / assets.length, // Equal weights initially
      })),
      rebalanceFrequency: 'none' as const,
      portfolioConfig: {
        symbol: 'PORTFOLIO',
        startDate,
        endDate,
        initialCapital: 10000,
        positionSizePercent: 100,
        maxDrawdownPercent: 20,
        commissionPercent: 0.1,
        slippagePercent: 0.05,
        leverage: 1,
      },
    };

    const engine = new MultiAssetBacktestEngine(dummyConfig);
    const optimization = engine.optimizePortfolio(returns, targetReturn);

    log.info(`Portfolio optimization completed: ${optimization.expectedReturn.toFixed(2)}% return, ${optimization.expectedVolatility.toFixed(2)}% volatility`);

    res.json({
      success: true,
      data: optimization,
    });
  } catch (error) {
    log.error('Failed to optimize portfolio:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/correlation-analysis
 * Analyze correlation between assets
 */
router.post('/correlation-analysis', async (req: Request, res: Response) => {
  try {
    const { symbols, config } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Need at least 2 symbols for correlation analysis',
      });
    }

    const { marketDataManager } = await import('../backtesting/market_data_integration');

    const startDate = config?.startDate ? new Date(config.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = config?.endDate ? new Date(config.endDate) : new Date();

    const assetData = await marketDataManager.fetchMultiAssetCandles({
      symbols,
      startDate,
      endDate,
      interval: config?.interval || '1h',
    });

    // Calculate correlation matrix
    const n = symbols.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    const assetReturns = new Map<string, number[]>();

    // Calculate returns
    for (const [symbol, candles] of assetData) {
      const returns: number[] = [];
      for (let i = 1; i < candles.length; i++) {
        const ret = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
        returns.push(ret);
      }
      assetReturns.set(symbol, returns);
    }

    // Calculate correlation coefficients
    const calculateCorrelation = (x: number[], y: number[]): number => {
      if (x.length !== y.length || x.length === 0) return 0;

      const xMean = x.reduce((a, b) => a + b, 0) / x.length;
      const yMean = y.reduce((a, b) => a + b, 0) / y.length;

      let numerator = 0;
      let xVariance = 0;
      let yVariance = 0;

      for (let i = 0; i < x.length; i++) {
        const xDiff = x[i] - xMean;
        const yDiff = y[i] - yMean;
        numerator += xDiff * yDiff;
        xVariance += xDiff * xDiff;
        yVariance += yDiff * yDiff;
      }

      const denominator = Math.sqrt(xVariance * yVariance);
      return denominator > 0 ? numerator / denominator : 0;
    };

    let sumCorr = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const corr = calculateCorrelation(
            assetReturns.get(symbols[i]) || [],
            assetReturns.get(symbols[j]) || []
          );
          matrix[i][j] = corr;

          if (i < j) {
            sumCorr += corr;
            count++;
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        symbols,
        matrix,
        avgCorrelation: count > 0 ? sumCorr / count : 0,
        heatmap: matrix.map((row, i) =>
          row.map((corr, j) => ({
            x: symbols[j],
            y: symbols[i],
            value: corr,
          }))
        ).flat(),
      },
    });
  } catch (error) {
    log.error('Failed to analyze correlation:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/fetch-historical-data
 * Fetch historical market data for backtesting
 */
router.post('/fetch-historical-data', async (req: Request, res: Response) => {
  try {
    const { symbol, startDate, endDate, interval, assetType } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: symbol',
      });
    }

    const { marketDataManager } = await import('../backtesting/market_data_integration');

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const candles = await marketDataManager.fetchCandles(
      symbol,
      start,
      end,
      interval || '1h',
      assetType || 'stock'
    );

    log.info(`Fetched ${candles.length} candles for ${symbol}`);

    res.json({
      success: true,
      data: {
        symbol,
        interval: interval || '1h',
        candles: candles.slice(0, 5000), // Limit response size
        total: candles.length,
      },
    });
  } catch (error) {
    log.error('Failed to fetch historical data:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /backtest/sector-analysis
 * Analyze portfolio diversification by asset class/sector
 */
router.post('/sector-analysis', async (req: Request, res: Response) => {
  try {
    const { assetResults } = req.body;

    if (!assetResults || !Array.isArray(assetResults)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid assetResults array',
      });
    }

    const { SectorAnalyzer } = await import('../backtesting/multi_asset_backtest');

    const analysis = SectorAnalyzer.analyzeDiversification(assetResults);

    log.info(`Sector analysis completed: ${analysis.assetClassBreakdown.length} asset classes, ${analysis.effectiveAssets.toFixed(2)} effective assets`);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    log.error('Failed to analyze sectors:', error as object);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;

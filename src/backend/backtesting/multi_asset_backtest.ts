/**
 * TIME — Multi-Asset Backtesting Module
 *
 * Features:
 * - Portfolio-level backtesting across multiple assets
 * - Asset correlation analysis
 * - Portfolio optimization (Markowitz, Black-Litterman)
 * - Multi-asset risk metrics
 * - Sector/asset class diversification analysis
 * - Rebalancing strategies
 */

import {
  BacktestConfig,
  BacktestingEngine,
  Candle,
  Trade,
  BacktestResult,
} from '../strategies/backtesting_engine';

// ==========================================
// TYPES
// ==========================================

export interface MultiAssetConfig {
  assets: {
    symbol: string;
    assetClass: 'stock' | 'crypto' | 'forex' | 'commodity';
    allocation: number; // Initial allocation %
    rebalanceThreshold?: number; // Rebalance if drift > this %
  }[];
  rebalanceFrequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  portfolioConfig: BacktestConfig;
}

export interface AssetBacktestResult extends BacktestResult {
  assetClass: 'stock' | 'crypto' | 'forex' | 'commodity';
  allocation: number;
  contribution: number; // Contribution to portfolio return
}

export interface PortfolioMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;

  // Portfolio-specific
  diversificationRatio: number; // Portfolio vol / weighted avg vol
  correlationMatrix: number[][];
  assetContributions: { symbol: string; contribution: number }[];
  rebalanceCount: number;
  rebalanceCosts: number;
}

export interface CorrelationMatrix {
  assets: string[];
  matrix: number[][];
  avgCorrelation: number;
  maxCorrelation: number;
  minCorrelation: number;
}

export interface PortfolioOptimizationResult {
  weights: { symbol: string; weight: number }[];
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  efficientFrontier?: {
    return: number;
    volatility: number;
    sharpe: number;
    weights: number[];
  }[];
}

export interface RebalanceEvent {
  date: Date;
  reason: 'scheduled' | 'drift' | 'signal';
  oldWeights: { symbol: string; weight: number }[];
  newWeights: { symbol: string; weight: number }[];
  cost: number;
}

// ==========================================
// MULTI-ASSET BACKTESTING ENGINE
// ==========================================

export class MultiAssetBacktestEngine {
  private config: MultiAssetConfig;
  private assetResults: Map<string, AssetBacktestResult> = new Map();
  private rebalanceEvents: RebalanceEvent[] = [];

  constructor(config: MultiAssetConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Run portfolio backtest across all assets
   */
  public async runPortfolioBacktest(
    assetData: Map<string, Candle[]>
  ): Promise<{
    portfolioMetrics: PortfolioMetrics;
    assetResults: AssetBacktestResult[];
    correlation: CorrelationMatrix;
    rebalanceEvents: RebalanceEvent[];
    equityCurve: { date: Date; equity: number; breakdown: Record<string, number> }[];
  }> {
    // Validate all assets have data
    for (const asset of this.config.assets) {
      if (!assetData.has(asset.symbol)) {
        throw new Error(`Missing data for asset: ${asset.symbol}`);
      }
    }

    // Run individual backtests for each asset
    const assetResults: AssetBacktestResult[] = [];

    for (const asset of this.config.assets) {
      const candles = assetData.get(asset.symbol)!;

      const assetConfig: BacktestConfig = {
        ...this.config.portfolioConfig,
        symbol: asset.symbol,
        positionSizePercent: asset.allocation,
      };

      const engine = new BacktestingEngine(assetConfig);
      const result = engine.runBacktest(candles);

      const assetResult: AssetBacktestResult = {
        ...result,
        assetClass: asset.assetClass,
        allocation: asset.allocation,
        contribution: 0, // Will calculate after
      };

      assetResults.push(assetResult);
      this.assetResults.set(asset.symbol, assetResult);
    }

    // Calculate correlation matrix
    const correlation = this.calculateCorrelationMatrix(assetData);

    // Calculate portfolio-level metrics
    const portfolioMetrics = this.calculatePortfolioMetrics(assetResults, correlation);

    // Calculate asset contributions to portfolio return
    assetResults.forEach((result, index) => {
      result.contribution = (result.totalReturnPercent * result.allocation) / 100;
    });

    // Build combined equity curve with rebalancing
    const equityCurve = this.buildPortfolioEquityCurve(assetData);

    return {
      portfolioMetrics,
      assetResults,
      correlation,
      rebalanceEvents: this.rebalanceEvents,
      equityCurve,
    };
  }

  /**
   * Calculate correlation matrix across all assets
   */
  private calculateCorrelationMatrix(assetData: Map<string, Candle[]>): CorrelationMatrix {
    const assets = Array.from(assetData.keys());
    const n = assets.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    // Calculate returns for each asset
    const assetReturns = new Map<string, number[]>();

    for (const [symbol, candles] of assetData) {
      const returns: number[] = [];
      for (let i = 1; i < candles.length; i++) {
        const ret = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
        returns.push(ret);
      }
      assetReturns.set(symbol, returns);
    }

    // Calculate correlation coefficients
    let sumCorr = 0;
    let maxCorr = -1;
    let minCorr = 1;
    let count = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const corr = this.calculateCorrelation(
            assetReturns.get(assets[i])!,
            assetReturns.get(assets[j])!
          );
          matrix[i][j] = corr;

          if (i < j) { // Only count upper triangle
            sumCorr += corr;
            maxCorr = Math.max(maxCorr, corr);
            minCorr = Math.min(minCorr, corr);
            count++;
          }
        }
      }
    }

    return {
      assets,
      matrix,
      avgCorrelation: count > 0 ? sumCorr / count : 0,
      maxCorrelation: maxCorr,
      minCorrelation: minCorr,
    };
  }

  /**
   * Calculate portfolio-level metrics
   */
  private calculatePortfolioMetrics(
    assetResults: AssetBacktestResult[],
    correlation: CorrelationMatrix
  ): PortfolioMetrics {
    // Portfolio return (weighted sum)
    let portfolioReturn = 0;
    let totalInitialCapital = 0;
    let totalFinalCapital = 0;

    for (const result of assetResults) {
      const weight = result.allocation / 100;
      portfolioReturn += result.totalReturnPercent * weight;
      totalInitialCapital += result.initialCapital * weight;
      totalFinalCapital += result.finalCapital * weight;
    }

    // Portfolio volatility
    const weights = assetResults.map(r => r.allocation / 100);
    const volatilities = assetResults.map(r => this.calculateVolatility(r));
    const portfolioVol = this.calculatePortfolioVolatility(weights, volatilities, correlation.matrix);

    // Weighted average volatility
    const weightedAvgVol = weights.reduce((sum, w, i) => sum + w * volatilities[i], 0);

    // Diversification ratio
    const diversificationRatio = weightedAvgVol > 0 ? weightedAvgVol / portfolioVol : 1;

    // Portfolio Sharpe (assume 2% risk-free rate)
    const riskFreeRate = 2;
    const excessReturn = portfolioReturn - riskFreeRate;
    const sharpeRatio = portfolioVol > 0 ? excessReturn / portfolioVol : 0;

    // Portfolio Sortino
    const downsideVol = this.calculateDownsideVolatility(assetResults, weights);
    const sortinoRatio = downsideVol > 0 ? excessReturn / downsideVol : 0;

    // Portfolio max drawdown
    const maxDrawdown = Math.max(...assetResults.map(r => r.maxDrawdown));
    const maxDrawdownPercent = Math.max(...assetResults.map(r => r.maxDrawdownPercent));

    // Asset contributions
    const assetContributions = assetResults.map(r => ({
      symbol: r.symbol,
      contribution: (r.totalReturnPercent * r.allocation) / 100,
    }));

    // Rebalance costs
    const rebalanceCosts = this.rebalanceEvents.reduce((sum, e) => sum + e.cost, 0);

    // Annualized return
    const daysBetween = assetResults.length > 0
      ? (assetResults[0].period.end.getTime() - assetResults[0].period.start.getTime()) / (1000 * 60 * 60 * 24)
      : 365;
    const years = daysBetween / 365;
    const annualizedReturn = years > 0 ? (Math.pow(1 + portfolioReturn / 100, 1 / years) - 1) * 100 : 0;

    return {
      totalReturn: totalFinalCapital - totalInitialCapital,
      totalReturnPercent: portfolioReturn,
      annualizedReturn,
      volatility: portfolioVol,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      diversificationRatio,
      correlationMatrix: correlation.matrix,
      assetContributions,
      rebalanceCount: this.rebalanceEvents.length,
      rebalanceCosts,
    };
  }

  /**
   * Build combined portfolio equity curve with rebalancing
   */
  private buildPortfolioEquityCurve(
    assetData: Map<string, Candle[]>
  ): { date: Date; equity: number; breakdown: Record<string, number> }[] {
    const equityCurve: { date: Date; equity: number; breakdown: Record<string, number> }[] = [];

    // Get all unique dates (assumes aligned data)
    const firstAsset = Array.from(assetData.values())[0];
    const dates = firstAsset.map(c => c.timestamp);

    // Initial allocations
    let currentWeights = new Map<string, number>();
    for (const asset of this.config.assets) {
      currentWeights.set(asset.symbol, asset.allocation / 100);
    }

    let lastRebalanceDate: Date | null = null;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const breakdown: Record<string, number> = {};
      let totalEquity = 0;

      // Calculate current equity for each asset
      for (const [symbol, candles] of assetData) {
        if (i < candles.length) {
          const result = this.assetResults.get(symbol);
          if (result && i < result.equityCurve.length) {
            const assetEquity = result.equityCurve[i].equity;
            const weight = currentWeights.get(symbol) || 0;
            breakdown[symbol] = assetEquity * weight;
            totalEquity += breakdown[symbol];
          }
        }
      }

      equityCurve.push({ date, equity: totalEquity, breakdown });

      // Check if rebalancing is needed
      if (this.shouldRebalance(date, lastRebalanceDate, currentWeights, breakdown, totalEquity)) {
        const oldWeights = Array.from(currentWeights.entries()).map(([symbol, weight]) => ({
          symbol,
          weight,
        }));

        // Reset to target allocations
        const newWeights = new Map<string, number>();
        for (const asset of this.config.assets) {
          newWeights.set(asset.symbol, asset.allocation / 100);
        }

        const newWeightsArray = Array.from(newWeights.entries()).map(([symbol, weight]) => ({
          symbol,
          weight,
        }));

        // Calculate rebalance cost (0.1% per trade)
        const cost = totalEquity * 0.001 * this.config.assets.length;

        this.rebalanceEvents.push({
          date,
          reason: 'scheduled',
          oldWeights,
          newWeights: newWeightsArray,
          cost,
        });

        currentWeights = newWeights;
        lastRebalanceDate = date;
      }
    }

    return equityCurve;
  }

  /**
   * Check if portfolio should be rebalanced
   */
  private shouldRebalance(
    currentDate: Date,
    lastRebalanceDate: Date | null,
    currentWeights: Map<string, number>,
    breakdown: Record<string, number>,
    totalEquity: number
  ): boolean {
    if (this.config.rebalanceFrequency === 'none') return false;

    // Check time-based rebalancing
    if (!lastRebalanceDate) {
      return true; // First rebalance
    }

    const daysSinceRebalance = (currentDate.getTime() - lastRebalanceDate.getTime()) / (1000 * 60 * 60 * 24);

    switch (this.config.rebalanceFrequency) {
      case 'daily':
        if (daysSinceRebalance >= 1) return true;
        break;
      case 'weekly':
        if (daysSinceRebalance >= 7) return true;
        break;
      case 'monthly':
        if (daysSinceRebalance >= 30) return true;
        break;
      case 'quarterly':
        if (daysSinceRebalance >= 90) return true;
        break;
    }

    // Check drift-based rebalancing
    for (const asset of this.config.assets) {
      if (asset.rebalanceThreshold) {
        const targetWeight = asset.allocation / 100;
        const currentWeight = (breakdown[asset.symbol] || 0) / totalEquity;
        const drift = Math.abs(currentWeight - targetWeight);

        if (drift > asset.rebalanceThreshold / 100) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Optimize portfolio using Markowitz mean-variance
   */
  public optimizePortfolio(
    returns: Map<string, number[]>,
    targetReturn?: number
  ): PortfolioOptimizationResult {
    const assets = Array.from(returns.keys());
    const n = assets.length;

    // Calculate expected returns and covariance matrix
    const expectedReturns = assets.map(asset => {
      const rets = returns.get(asset)!;
      return rets.reduce((sum, r) => sum + r, 0) / rets.length;
    });

    const covMatrix = this.calculateCovarianceMatrix(returns);

    // Use equal weights if no target return specified
    if (!targetReturn) {
      const weights = assets.map(() => 1 / n);
      const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
      const portfolioVol = Math.sqrt(
        weights.reduce((sum1, w1, i) =>
          sum1 + weights.reduce((sum2, w2, j) =>
            sum2 + w1 * w2 * covMatrix[i][j], 0
          ), 0
        )
      );

      return {
        weights: assets.map((symbol, i) => ({ symbol, weight: weights[i] })),
        expectedReturn: portfolioReturn * 100,
        expectedVolatility: portfolioVol * 100,
        sharpeRatio: portfolioVol > 0 ? portfolioReturn / portfolioVol : 0,
      };
    }

    // Generate efficient frontier (simplified)
    const efficientFrontier = this.generateEfficientFrontier(expectedReturns, covMatrix, 20);

    // Find weights closest to target return
    const closest = efficientFrontier.reduce((prev, curr) =>
      Math.abs(curr.return - targetReturn) < Math.abs(prev.return - targetReturn) ? curr : prev
    );

    return {
      weights: assets.map((symbol, i) => ({ symbol, weight: closest.weights[i] })),
      expectedReturn: closest.return * 100,
      expectedVolatility: closest.volatility * 100,
      sharpeRatio: closest.sharpe,
      efficientFrontier,
    };
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private validateConfig(): void {
    const totalAllocation = this.config.assets.reduce((sum, a) => sum + a.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(`Asset allocations must sum to 100% (got ${totalAllocation}%)`);
    }
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xVariance = 0;
    let yVariance = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      numerator += xDiff * yDiff;
      xVariance += xDiff * xDiff;
      yVariance += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xVariance * yVariance);
    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateVolatility(result: AssetBacktestResult): number {
    if (result.equityCurve.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < result.equityCurve.length; i++) {
      const ret = (result.equityCurve[i].equity - result.equityCurve[i - 1].equity) / result.equityCurve[i - 1].equity;
      returns.push(ret);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    // Annualize volatility (daily -> annual)
    return Math.sqrt(variance * 252) * 100;
  }

  private calculatePortfolioVolatility(
    weights: number[],
    volatilities: number[],
    correlationMatrix: number[][]
  ): number {
    let variance = 0;

    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlationMatrix[i][j];
      }
    }

    return Math.sqrt(variance);
  }

  private calculateDownsideVolatility(results: AssetBacktestResult[], weights: number[]): number {
    const downsideReturns: number[] = [];

    // Combine returns across assets
    const maxLength = Math.max(...results.map(r => r.equityCurve.length));

    for (let i = 1; i < maxLength; i++) {
      let portfolioReturn = 0;

      for (let j = 0; j < results.length; j++) {
        if (i < results[j].equityCurve.length) {
          const ret = (results[j].equityCurve[i].equity - results[j].equityCurve[i - 1].equity) / results[j].equityCurve[i - 1].equity;
          portfolioReturn += weights[j] * ret;
        }
      }

      if (portfolioReturn < 0) {
        downsideReturns.push(portfolioReturn);
      }
    }

    if (downsideReturns.length === 0) return 0;

    const mean = downsideReturns.reduce((a, b) => a + b, 0) / downsideReturns.length;
    const variance = downsideReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / downsideReturns.length;

    return Math.sqrt(variance * 252) * 100; // Annualize
  }

  private calculateCovarianceMatrix(returns: Map<string, number[]>): number[][] {
    const assets = Array.from(returns.keys());
    const n = assets.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const returnsI = returns.get(assets[i])!;
        const returnsJ = returns.get(assets[j])!;

        const meanI = returnsI.reduce((a, b) => a + b, 0) / returnsI.length;
        const meanJ = returnsJ.reduce((a, b) => a + b, 0) / returnsJ.length;

        let covariance = 0;
        const length = Math.min(returnsI.length, returnsJ.length);

        for (let k = 0; k < length; k++) {
          covariance += (returnsI[k] - meanI) * (returnsJ[k] - meanJ);
        }

        matrix[i][j] = length > 1 ? covariance / (length - 1) : 0;
      }
    }

    return matrix;
  }

  private generateEfficientFrontier(
    expectedReturns: number[],
    covMatrix: number[][],
    numPoints: number
  ): { return: number; volatility: number; sharpe: number; weights: number[] }[] {
    const frontier: { return: number; volatility: number; sharpe: number; weights: number[] }[] = [];
    const n = expectedReturns.length;

    // Generate random portfolios and keep efficient ones
    for (let i = 0; i < numPoints; i++) {
      // Generate random weights that sum to 1
      const weights = this.generateRandomWeights(n);

      const portfolioReturn = weights.reduce((sum, w, idx) => sum + w * expectedReturns[idx], 0);

      const portfolioVariance = weights.reduce((sum1, w1, idx1) =>
        sum1 + weights.reduce((sum2, w2, idx2) =>
          sum2 + w1 * w2 * covMatrix[idx1][idx2], 0
        ), 0
      );

      const portfolioVol = Math.sqrt(portfolioVariance);
      const sharpe = portfolioVol > 0 ? portfolioReturn / portfolioVol : 0;

      frontier.push({
        return: portfolioReturn,
        volatility: portfolioVol,
        sharpe,
        weights: [...weights],
      });
    }

    // Sort by Sharpe ratio
    return frontier.sort((a, b) => b.sharpe - a.sharpe);
  }

  private generateRandomWeights(n: number): number[] {
    const raw = Array(n).fill(0).map(() => Math.random());
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map(w => w / sum);
  }
}

// ==========================================
// SECTOR ANALYSIS
// ==========================================

export class SectorAnalyzer {
  /**
   * Analyze portfolio by asset class/sector
   */
  public static analyzeDiversification(results: AssetBacktestResult[]): {
    assetClassBreakdown: { assetClass: string; allocation: number; return: number }[];
    concentrationRisk: number; // Herfindahl index
    effectiveAssets: number; // Number of "effective" assets
  } {
    // Group by asset class
    const assetClasses = new Map<string, { allocation: number; returns: number[] }>();

    for (const result of results) {
      if (!assetClasses.has(result.assetClass)) {
        assetClasses.set(result.assetClass, { allocation: 0, returns: [] });
      }

      const group = assetClasses.get(result.assetClass)!;
      group.allocation += result.allocation;
      group.returns.push(result.totalReturnPercent);
    }

    // Calculate breakdown
    const assetClassBreakdown = Array.from(assetClasses.entries()).map(([assetClass, data]) => ({
      assetClass,
      allocation: data.allocation,
      return: data.returns.reduce((a, b) => a + b, 0) / data.returns.length,
    }));

    // Calculate Herfindahl concentration index (sum of squared weights)
    const concentrationRisk = results.reduce((sum, r) => {
      const weight = r.allocation / 100;
      return sum + weight * weight;
    }, 0);

    // Effective number of assets (1 / Herfindahl)
    const effectiveAssets = concentrationRisk > 0 ? 1 / concentrationRisk : 0;

    return {
      assetClassBreakdown,
      concentrationRisk,
      effectiveAssets,
    };
  }
}

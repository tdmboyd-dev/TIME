/**
 * TIME DeFi Live Data API Routes
 *
 * REAL live data from DeFi protocols via DefiLlama API
 * NO MOCK DATA - All yields, TVL, and pool data are REAL!
 */

import { Router, Request, Response } from 'express';
import { realDeFiData } from '../defi/real_defi_data';
import { yieldAggregator } from '../defi/yield_aggregator';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// LIVE YIELD DATA (from DefiLlama)
// ============================================================================

/**
 * GET /api/v1/defi/live/pools
 * Get all live yield pools from DefiLlama
 */
router.get('/live/pools', async (req: Request, res: Response) => {
  try {
    const {
      chain,
      project,
      minTvl,
      minApy,
      stableOnly,
      limit,
    } = req.query;

    const pools = await realDeFiData.getTopYieldPools({
      chain: chain as string,
      project: project as string,
      minTvl: minTvl ? parseFloat(minTvl as string) : undefined,
      minApy: minApy ? parseFloat(minApy as string) : undefined,
      stablecoinOnly: stableOnly === 'true',
      limit: limit ? parseInt(limit as string) : 100,
    });

    res.json({
      success: true,
      source: 'DefiLlama',
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    logger.error('Failed to fetch live pools:', error as object);
    res.status(500).json({ error: 'Failed to fetch live pools' });
  }
});

/**
 * GET /api/v1/defi/live/stablecoins
 * Get best stablecoin yields (safest options)
 */
router.get('/live/stablecoins', async (req: Request, res: Response) => {
  try {
    const pools = await realDeFiData.getSafeStablecoinYields();

    res.json({
      success: true,
      source: 'DefiLlama',
      description: 'Safe stablecoin yields with TVL > $10M',
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    logger.error('Failed to fetch stablecoin yields:', error as object);
    res.status(500).json({ error: 'Failed to fetch stablecoin yields' });
  }
});

/**
 * GET /api/v1/defi/live/aave
 * Get Aave V3 lending yields
 */
router.get('/live/aave', async (req: Request, res: Response) => {
  try {
    const chain = (req.query.chain as string) || 'Ethereum';
    const pools = await realDeFiData.getAaveYields(chain);

    res.json({
      success: true,
      source: 'DefiLlama',
      protocol: 'Aave V3',
      chain,
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    logger.error('Failed to fetch Aave yields:', error as object);
    res.status(500).json({ error: 'Failed to fetch Aave yields' });
  }
});

/**
 * GET /api/v1/defi/live/compound
 * Get Compound lending yields
 */
router.get('/live/compound', async (req: Request, res: Response) => {
  try {
    const chain = (req.query.chain as string) || 'Ethereum';
    const pools = await realDeFiData.getCompoundYields(chain);

    res.json({
      success: true,
      source: 'DefiLlama',
      protocol: 'Compound',
      chain,
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    logger.error('Failed to fetch Compound yields:', error as object);
    res.status(500).json({ error: 'Failed to fetch Compound yields' });
  }
});

/**
 * GET /api/v1/defi/live/uniswap
 * Get Uniswap V3 LP yields
 */
router.get('/live/uniswap', async (req: Request, res: Response) => {
  try {
    const chain = (req.query.chain as string) || 'Ethereum';
    const pools = await realDeFiData.getUniswapYields(chain);

    res.json({
      success: true,
      source: 'DefiLlama',
      protocol: 'Uniswap V3',
      chain,
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    logger.error('Failed to fetch Uniswap yields:', error as object);
    res.status(500).json({ error: 'Failed to fetch Uniswap yields' });
  }
});

/**
 * GET /api/v1/defi/live/yearn
 * Get Yearn Finance vault yields
 */
router.get('/live/yearn', async (req: Request, res: Response) => {
  try {
    const pools = await realDeFiData.getYearnVaults();

    res.json({
      success: true,
      source: 'DefiLlama',
      protocol: 'Yearn Finance',
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    logger.error('Failed to fetch Yearn vaults:', error as object);
    res.status(500).json({ error: 'Failed to fetch Yearn vaults' });
  }
});

/**
 * GET /api/v1/defi/live/beefy
 * Get Beefy Finance vault yields
 */
router.get('/live/beefy', async (req: Request, res: Response) => {
  try {
    const pools = await realDeFiData.getBeefyVaults();

    res.json({
      success: true,
      source: 'DefiLlama',
      protocol: 'Beefy Finance',
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    logger.error('Failed to fetch Beefy vaults:', error as object);
    res.status(500).json({ error: 'Failed to fetch Beefy vaults' });
  }
});

/**
 * GET /api/v1/defi/live/convex
 * Get Convex Finance pool yields
 */
router.get('/live/convex', async (req: Request, res: Response) => {
  try {
    const pools = await realDeFiData.getConvexPools();

    res.json({
      success: true,
      source: 'DefiLlama',
      protocol: 'Convex Finance',
      count: pools.length,
      data: pools,
    });
  } catch (error) {
    logger.error('Failed to fetch Convex pools:', error as object);
    res.status(500).json({ error: 'Failed to fetch Convex pools' });
  }
});

// ============================================================================
// PROTOCOL TVL DATA
// ============================================================================

/**
 * GET /api/v1/defi/live/tvl
 * Get top protocols by TVL
 */
router.get('/live/tvl', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const protocols = await realDeFiData.getTopProtocolsByTVL(limit);

    res.json({
      success: true,
      source: 'DefiLlama',
      count: protocols.length,
      data: protocols,
    });
  } catch (error) {
    logger.error('Failed to fetch TVL data:', error as object);
    res.status(500).json({ error: 'Failed to fetch TVL data' });
  }
});

/**
 * GET /api/v1/defi/live/tvl/:protocol
 * Get specific protocol TVL data
 */
router.get('/live/tvl/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const data = await realDeFiData.getProtocolTVL(protocol);

    if (!data) {
      return res.status(404).json({ error: `Protocol ${protocol} not found` });
    }

    res.json({
      success: true,
      source: 'DefiLlama',
      data,
    });
  } catch (error) {
    logger.error('Failed to fetch protocol TVL:', error as object);
    res.status(500).json({ error: 'Failed to fetch protocol TVL' });
  }
});

// ============================================================================
// MARKET STATISTICS
// ============================================================================

/**
 * GET /api/v1/defi/live/stats
 * Get DeFi market statistics
 */
router.get('/live/stats', async (req: Request, res: Response) => {
  try {
    const stats = await realDeFiData.getMarketStats();

    res.json({
      success: true,
      source: 'DefiLlama',
      data: {
        totalTvl: stats.totalTvl,
        totalTvlFormatted: `$${(stats.totalTvl / 1e9).toFixed(2)}B`,
        avgStablecoinApy: `${stats.avgStablecoinApy.toFixed(2)}%`,
        avgLpApy: `${stats.avgLpApy.toFixed(2)}%`,
        poolCount: stats.poolCount,
        topProtocols: stats.topProtocols.map(p => ({
          name: p.name,
          tvl: `$${(p.tvl / 1e9).toFixed(2)}B`,
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch market stats:', error as object);
    res.status(500).json({ error: 'Failed to fetch market stats' });
  }
});

/**
 * GET /api/v1/defi/live/best-yields
 * Get best yield opportunities by category
 */
router.get('/live/best-yields', async (req: Request, res: Response) => {
  try {
    const yields = await realDeFiData.getBestYieldsByCategory();

    res.json({
      success: true,
      source: 'DefiLlama',
      data: {
        stablecoins: {
          description: 'Safe stablecoin yields (TVL > $1M)',
          count: yields.stablecoins.length,
          pools: yields.stablecoins.slice(0, 5).map(p => ({
            pool: p.pool,
            project: p.project,
            symbol: p.symbol,
            chain: p.chain,
            apy: `${p.apy.toFixed(2)}%`,
            tvl: `$${(p.tvlUsd / 1e6).toFixed(2)}M`,
          })),
        },
        bluechip: {
          description: 'ETH/BTC yields (low IL risk)',
          count: yields.bluechip.length,
          pools: yields.bluechip.slice(0, 5).map(p => ({
            pool: p.pool,
            project: p.project,
            symbol: p.symbol,
            chain: p.chain,
            apy: `${p.apy.toFixed(2)}%`,
            tvl: `$${(p.tvlUsd / 1e6).toFixed(2)}M`,
          })),
        },
        lpPairs: {
          description: 'LP pair yields (higher risk)',
          count: yields.lp.length,
          pools: yields.lp.slice(0, 5).map(p => ({
            pool: p.pool,
            project: p.project,
            symbol: p.symbol,
            chain: p.chain,
            apy: `${p.apy.toFixed(2)}%`,
            tvl: `$${(p.tvlUsd / 1e6).toFixed(2)}M`,
          })),
        },
        highRisk: {
          description: 'High APY opportunities (degen)',
          count: yields.highRisk.length,
          pools: yields.highRisk.slice(0, 5).map(p => ({
            pool: p.pool,
            project: p.project,
            symbol: p.symbol,
            chain: p.chain,
            apy: `${p.apy.toFixed(2)}%`,
            tvl: `$${(p.tvlUsd / 1e6).toFixed(2)}M`,
          })),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch best yields:', error as object);
    res.status(500).json({ error: 'Failed to fetch best yields' });
  }
});

// ============================================================================
// YIELD AGGREGATOR INTEGRATION
// ============================================================================

/**
 * GET /api/v1/defi/vaults
 * Get yield aggregator vaults (with live data overlay)
 */
router.get('/vaults', async (req: Request, res: Response) => {
  try {
    const { chain, protocol, riskLevel, minApy, type } = req.query;

    const vaults = yieldAggregator.getAllVaults({
      chain: chain as any,
      protocol: protocol as any,
      riskLevel: riskLevel as any,
      minApy: minApy ? parseFloat(minApy as string) : undefined,
      type: type as any,
    });

    // Enrich with live data if available
    const livePools = await realDeFiData.getAllYieldPools();
    const enrichedVaults = vaults.map(vault => {
      // Try to find matching live pool
      const livePool = livePools.find(p =>
        p.project.toLowerCase().includes(vault.protocol.toLowerCase()) &&
        vault.assets.some(a => p.symbol.toLowerCase().includes(a.toLowerCase()))
      );

      return {
        ...vault,
        liveApy: livePool?.apy,
        liveTvl: livePool?.tvlUsd,
        liveSource: livePool ? 'DefiLlama' : 'local',
      };
    });

    res.json({
      success: true,
      count: enrichedVaults.length,
      data: enrichedVaults,
    });
  } catch (error) {
    logger.error('Failed to fetch vaults:', error as object);
    res.status(500).json({ error: 'Failed to fetch vaults' });
  }
});

/**
 * GET /api/v1/defi/strategies
 * Get yield strategies
 */
router.get('/strategies', async (req: Request, res: Response) => {
  try {
    const strategies = yieldAggregator.getAllStrategies();

    res.json({
      success: true,
      count: strategies.length,
      data: strategies,
    });
  } catch (error) {
    logger.error('Failed to fetch strategies:', error as object);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

/**
 * POST /api/v1/defi/strategies/:strategyId/deposit
 * Deposit into a yield strategy
 */
router.post('/strategies/:strategyId/deposit', async (req: Request, res: Response) => {
  try {
    const { strategyId } = req.params;
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount are required' });
    }

    const result = await yieldAggregator.depositToStrategy(userId, strategyId, amount);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to deposit:', error as object);
    res.status(500).json({ error: 'Failed to deposit' });
  }
});

/**
 * GET /api/v1/defi/positions/:userId
 * Get user's yield positions
 */
router.get('/positions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const positions = yieldAggregator.getUserPositions(userId);
    const totals = yieldAggregator.getUserTotalValue(userId);

    res.json({
      success: true,
      data: {
        positions,
        totals,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch positions:', error as object);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

/**
 * GET /api/v1/defi/state
 * Get yield aggregator state
 */
router.get('/state', async (req: Request, res: Response) => {
  try {
    const state = yieldAggregator.getState();

    res.json({
      success: true,
      data: state,
    });
  } catch (error) {
    logger.error('Failed to fetch state:', error as object);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

export default router;

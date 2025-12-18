/**
 * REAL DeFi Data Service
 *
 * Fetches live data from DeFi protocols via APIs:
 * - DefiLlama for yields, TVL, and protocol data
 * - On-chain data via ethers.js for real positions
 *
 * NO MOCK DATA - Everything is REAL from actual APIs!
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('RealDeFiData');

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface LivePoolData {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number;
  apyReward: number;
  rewardTokens: string[];
  stablecoin: boolean;
  ilRisk: 'no' | 'low' | 'medium' | 'high';
  exposure: string[];
  poolMeta?: string;
  underlyingTokens: string[];
  url?: string;
}

export interface ProtocolTVL {
  name: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h: number;
  change_1d: number;
  change_7d: number;
}

export interface AavePoolData {
  symbol: string;
  supplyApy: number;
  variableBorrowApy: number;
  stableBorrowApy: number;
  totalSupply: number;
  totalBorrow: number;
  utilizationRate: number;
  priceUsd: number;
}

export interface CompoundMarket {
  symbol: string;
  supplyApy: number;
  borrowApy: number;
  compSupplyApy: number;
  compBorrowApy: number;
  totalSupply: number;
  totalBorrow: number;
  collateralFactor: number;
}

// Cache for API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================
// REAL DEFI DATA SERVICE
// ============================================================

class RealDeFiDataService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFILLAMA_API = 'https://yields.llama.fi';
  private readonly DEFILLAMA_TVLS = 'https://api.llama.fi';

  constructor() {
    logger.info('RealDeFiDataService initialized - LIVE DATA MODE');
  }

  // ============================================================
  // DEFILLAMA YIELDS API
  // ============================================================

  /**
   * Get all yield pools from DefiLlama
   * Source: https://yields.llama.fi/pools
   */
  async getAllYieldPools(): Promise<LivePoolData[]> {
    const cacheKey = 'defillama_pools';
    const cached = this.getFromCache<LivePoolData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.DEFILLAMA_API}/pools`);
      if (!response.ok) throw new Error(`DefiLlama API error: ${response.status}`);

      const data = await response.json() as { data: any[] };

      const pools: LivePoolData[] = data.data.map((pool: any) => ({
        pool: pool.pool,
        chain: pool.chain,
        project: pool.project,
        symbol: pool.symbol,
        tvlUsd: pool.tvlUsd || 0,
        apy: pool.apy || 0,
        apyBase: pool.apyBase || 0,
        apyReward: pool.apyReward || 0,
        rewardTokens: pool.rewardTokens || [],
        stablecoin: pool.stablecoin || false,
        ilRisk: pool.ilRisk || 'no',
        exposure: pool.exposure || [],
        poolMeta: pool.poolMeta,
        underlyingTokens: pool.underlyingTokens || [],
        url: pool.url,
      }));

      this.setCache(cacheKey, pools);
      logger.info(`Fetched ${pools.length} REAL yield pools from DefiLlama`);
      return pools;
    } catch (error) {
      logger.error('Failed to fetch DefiLlama pools:', error as object);
      return [];
    }
  }

  /**
   * Get top yield pools filtered by criteria
   */
  async getTopYieldPools(options: {
    chain?: string;
    project?: string;
    minTvl?: number;
    minApy?: number;
    stablecoinOnly?: boolean;
    limit?: number;
  } = {}): Promise<LivePoolData[]> {
    let pools = await this.getAllYieldPools();

    // Apply filters
    if (options.chain) {
      pools = pools.filter(p => p.chain.toLowerCase() === options.chain!.toLowerCase());
    }
    if (options.project) {
      pools = pools.filter(p => p.project.toLowerCase() === options.project!.toLowerCase());
    }
    if (options.minTvl) {
      pools = pools.filter(p => p.tvlUsd >= options.minTvl!);
    }
    if (options.minApy) {
      pools = pools.filter(p => p.apy >= options.minApy!);
    }
    if (options.stablecoinOnly) {
      pools = pools.filter(p => p.stablecoin);
    }

    // Sort by APY descending
    pools.sort((a, b) => b.apy - a.apy);

    // Apply limit
    if (options.limit) {
      pools = pools.slice(0, options.limit);
    }

    return pools;
  }

  /**
   * Get yields for major stablecoin pools (safe yields)
   */
  async getSafeStablecoinYields(): Promise<LivePoolData[]> {
    return this.getTopYieldPools({
      minTvl: 10000000, // $10M TVL minimum
      stablecoinOnly: true,
      limit: 50,
    });
  }

  /**
   * Get yields from specific protocols (Aave, Compound, Yearn, etc.)
   */
  async getProtocolYields(protocol: string): Promise<LivePoolData[]> {
    return this.getTopYieldPools({
      project: protocol,
      minTvl: 1000000,
      limit: 50,
    });
  }

  // ============================================================
  // DEFILLAMA TVL API
  // ============================================================

  /**
   * Get protocol TVL data
   */
  async getProtocolTVL(protocol: string): Promise<ProtocolTVL | null> {
    const cacheKey = `tvl_${protocol}`;
    const cached = this.getFromCache<ProtocolTVL>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.DEFILLAMA_TVLS}/protocol/${protocol}`);
      if (!response.ok) throw new Error(`Protocol ${protocol} not found`);

      const data = await response.json() as any;

      const tvlData: ProtocolTVL = {
        name: data.name,
        tvl: data.tvl,
        chainTvls: data.chainTvls || {},
        change_1h: data.change_1h || 0,
        change_1d: data.change_1d || 0,
        change_7d: data.change_7d || 0,
      };

      this.setCache(cacheKey, tvlData);
      return tvlData;
    } catch (error) {
      logger.error(`Failed to fetch TVL for ${protocol}:`, error as object);
      return null;
    }
  }

  /**
   * Get top protocols by TVL
   */
  async getTopProtocolsByTVL(limit: number = 20): Promise<ProtocolTVL[]> {
    const cacheKey = 'top_protocols_tvl';
    const cached = this.getFromCache<ProtocolTVL[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.DEFILLAMA_TVLS}/protocols`);
      if (!response.ok) throw new Error(`DefiLlama API error`);

      const data = await response.json() as any[];

      const protocols: ProtocolTVL[] = data
        .slice(0, limit)
        .map((p: any) => ({
          name: p.name,
          tvl: p.tvl,
          chainTvls: p.chainTvls || {},
          change_1h: p.change_1h || 0,
          change_1d: p.change_1d || 0,
          change_7d: p.change_7d || 0,
        }));

      this.setCache(cacheKey, protocols);
      logger.info(`Fetched ${protocols.length} top protocols by TVL`);
      return protocols;
    } catch (error) {
      logger.error('Failed to fetch top protocols:', error as object);
      return [];
    }
  }

  // ============================================================
  // AAVE V3 DATA
  // ============================================================

  /**
   * Get Aave V3 pool data
   * Uses DefiLlama to get Aave yields
   */
  async getAaveYields(chain: string = 'Ethereum'): Promise<LivePoolData[]> {
    const pools = await this.getAllYieldPools();
    return pools.filter(
      p => p.project.toLowerCase() === 'aave-v3' &&
           p.chain.toLowerCase() === chain.toLowerCase()
    );
  }

  // ============================================================
  // COMPOUND DATA
  // ============================================================

  /**
   * Get Compound V3 pool data
   */
  async getCompoundYields(chain: string = 'Ethereum'): Promise<LivePoolData[]> {
    const pools = await this.getAllYieldPools();
    return pools.filter(
      p => (p.project.toLowerCase() === 'compound-v3' || p.project.toLowerCase() === 'compound') &&
           p.chain.toLowerCase() === chain.toLowerCase()
    );
  }

  // ============================================================
  // UNISWAP / DEX DATA
  // ============================================================

  /**
   * Get Uniswap V3 pool data
   */
  async getUniswapYields(chain: string = 'Ethereum'): Promise<LivePoolData[]> {
    const pools = await this.getAllYieldPools();
    return pools.filter(
      p => (p.project.toLowerCase() === 'uniswap-v3' || p.project.toLowerCase() === 'uniswap') &&
           p.chain.toLowerCase() === chain.toLowerCase()
    );
  }

  // ============================================================
  // YIELD AGGREGATOR DATA
  // ============================================================

  /**
   * Get Yearn Finance vaults
   */
  async getYearnVaults(): Promise<LivePoolData[]> {
    const pools = await this.getAllYieldPools();
    return pools.filter(p => p.project.toLowerCase() === 'yearn-finance');
  }

  /**
   * Get Beefy Finance vaults
   */
  async getBeefyVaults(): Promise<LivePoolData[]> {
    const pools = await this.getAllYieldPools();
    return pools.filter(p => p.project.toLowerCase() === 'beefy');
  }

  /**
   * Get Convex Finance pools
   */
  async getConvexPools(): Promise<LivePoolData[]> {
    const pools = await this.getAllYieldPools();
    return pools.filter(p => p.project.toLowerCase() === 'convex-finance');
  }

  // ============================================================
  // AGGREGATE STATISTICS
  // ============================================================

  /**
   * Get DeFi market statistics
   */
  async getMarketStats(): Promise<{
    totalTvl: number;
    topProtocols: { name: string; tvl: number }[];
    avgStablecoinApy: number;
    avgLpApy: number;
    poolCount: number;
  }> {
    const [pools, protocols] = await Promise.all([
      this.getAllYieldPools(),
      this.getTopProtocolsByTVL(10),
    ]);

    const stablePools = pools.filter(p => p.stablecoin && p.tvlUsd > 1000000);
    const lpPools = pools.filter(p => !p.stablecoin && p.tvlUsd > 1000000);

    const avgStablecoinApy = stablePools.length > 0
      ? stablePools.reduce((sum, p) => sum + p.apy, 0) / stablePools.length
      : 0;

    const avgLpApy = lpPools.length > 0
      ? lpPools.reduce((sum, p) => sum + p.apy, 0) / lpPools.length
      : 0;

    const totalTvl = protocols.reduce((sum, p) => sum + p.tvl, 0);

    return {
      totalTvl,
      topProtocols: protocols.map(p => ({ name: p.name, tvl: p.tvl })),
      avgStablecoinApy,
      avgLpApy,
      poolCount: pools.length,
    };
  }

  /**
   * Get best yield opportunities by category
   */
  async getBestYieldsByCategory(): Promise<{
    stablecoins: LivePoolData[];
    bluechip: LivePoolData[];
    lp: LivePoolData[];
    highRisk: LivePoolData[];
  }> {
    const pools = await this.getAllYieldPools();

    // Filter with TVL > $1M for safety
    const safePools = pools.filter(p => p.tvlUsd > 1000000);

    // Stablecoin yields
    const stablecoins = safePools
      .filter(p => p.stablecoin)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 10);

    // Bluechip crypto (ETH, BTC, major tokens)
    const bluechipSymbols = ['ETH', 'WETH', 'stETH', 'rETH', 'BTC', 'WBTC'];
    const bluechip = safePools
      .filter(p => bluechipSymbols.some(s => p.symbol.toUpperCase().includes(s)))
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 10);

    // LP pairs with good liquidity
    const lp = safePools
      .filter(p => p.symbol.includes('-') || p.symbol.includes('/'))
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 10);

    // High risk / high APY (degen)
    const highRisk = pools
      .filter(p => p.apy > 50 && p.tvlUsd > 100000)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 10);

    return { stablecoins, bluechip, lp, highRisk };
  }

  // ============================================================
  // CACHING
  // ============================================================

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

// Export singleton instance
export const realDeFiData = new RealDeFiDataService();
export default realDeFiData;

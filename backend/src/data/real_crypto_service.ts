import axios from 'axios';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Rate limiting: CoinGecko free tier allows 10-50 calls/minute
const REQUEST_DELAY = 1200; // 1.2 seconds between requests
let lastRequestTime = 0;

async function rateLimitedRequest<T>(url: string): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn('Rate limit hit, waiting 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return rateLimitedRequest(url);
    }
    throw error;
  }
}

// Mapping of common symbols to CoinGecko IDs
const SYMBOL_TO_ID_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'AVAX': 'avalanche-2',
  'MATIC': 'matic-network',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'ATOM': 'cosmos',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'XLM': 'stellar',
  'ALGO': 'algorand',
  'VET': 'vechain',
  'FIL': 'filecoin',
  'TRX': 'tron',
  'ETC': 'ethereum-classic',
  'XMR': 'monero',
  'NEAR': 'near',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'SUI': 'sui',
};

// Reverse mapping
const ID_TO_SYMBOL_MAP: Record<string, string> = Object.entries(SYMBOL_TO_ID_MAP).reduce(
  (acc, [symbol, id]) => ({ ...acc, [id]: symbol }),
  {}
);

export interface CryptoPrice {
  symbol: string;
  coinId: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: Date;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CoinInfo {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  circulatingSupply: number;
  totalSupply: number;
  high24h: number;
  low24h: number;
  ath: number;
  athDate: Date;
  atl: number;
  atlDate: Date;
}

/**
 * Convert symbol to CoinGecko ID
 */
function symbolToCoinId(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  return SYMBOL_TO_ID_MAP[upperSymbol] || symbol.toLowerCase();
}

/**
 * Convert CoinGecko ID to symbol
 */
function coinIdToSymbol(coinId: string): string {
  return ID_TO_SYMBOL_MAP[coinId] || coinId.toUpperCase();
}

/**
 * Get real-time cryptocurrency prices with 24h change, volume, and market cap
 * @param symbols - Array of cryptocurrency symbols (e.g., ['BTC', 'ETH', 'SOL'])
 * @returns Array of CryptoPrice objects with real data from CoinGecko
 */
export async function getCryptoPrices(symbols: string[]): Promise<CryptoPrice[]> {
  try {
    // Convert symbols to CoinGecko IDs
    const coinIds = symbols.map(symbolToCoinId);
    const idsString = coinIds.join(',');

    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;

    const data = await rateLimitedRequest<Record<string, any>>(url);

    const prices: CryptoPrice[] = [];

    for (const coinId of coinIds) {
      const coinData = data[coinId];

      if (coinData) {
        prices.push({
          symbol: coinIdToSymbol(coinId),
          coinId: coinId,
          price: coinData.usd || 0,
          change24h: coinData.usd_24h_change || 0,
          volume24h: coinData.usd_24h_vol || 0,
          marketCap: coinData.usd_market_cap || 0,
          lastUpdated: new Date((coinData.last_updated_at || Date.now() / 1000) * 1000)
        });
      } else {
        console.warn(`No data found for ${coinId}`);
        // Return default data if API doesn't have the coin
        prices.push({
          symbol: coinIdToSymbol(coinId),
          coinId: coinId,
          price: 0,
          change24h: 0,
          volume24h: 0,
          marketCap: 0,
          lastUpdated: new Date()
        });
      }
    }

    return prices;
  } catch (error: any) {
    console.error('Error fetching crypto prices from CoinGecko:', error.message);
    throw new Error(`Failed to fetch crypto prices: ${error.message}`);
  }
}

/**
 * Get historical price data (OHLCV candles) for a cryptocurrency
 * @param coinId - CoinGecko coin ID (e.g., 'bitcoin') or symbol (e.g., 'BTC')
 * @param days - Number of days of historical data (1, 7, 14, 30, 90, 180, 365, max)
 * @returns Array of Candle objects with OHLC data
 */
export async function getCryptoCandles(coinId: string, days: number): Promise<Candle[]> {
  try {
    // Convert symbol to ID if needed
    const id = SYMBOL_TO_ID_MAP[coinId.toUpperCase()] || coinId.toLowerCase();

    // CoinGecko free API provides market_chart data (prices, market_caps, total_volumes)
    const url = `${COINGECKO_BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`;

    const data = await rateLimitedRequest<{
      prices: [number, number][];
      market_caps: [number, number][];
      total_volumes: [number, number][];
    }>(url);

    if (!data.prices || data.prices.length === 0) {
      throw new Error(`No price data available for ${id}`);
    }

    // CoinGecko's market_chart endpoint returns timestamps and prices
    // We need to construct OHLC candles from the price data
    const candles: Candle[] = [];
    const priceMap = new Map<string, number[]>();

    // Group prices by day
    for (const [timestamp, price] of data.prices) {
      const date = new Date(timestamp);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!priceMap.has(dateKey)) {
        priceMap.set(dateKey, []);
      }
      priceMap.get(dateKey)!.push(price);
    }

    // Create volume map
    const volumeMap = new Map<string, number>();
    for (const [timestamp, volume] of data.total_volumes) {
      const date = new Date(timestamp);
      const dateKey = date.toISOString().split('T')[0];
      volumeMap.set(dateKey, volume);
    }

    // Construct OHLC candles from grouped prices
    for (const [dateKey, prices] of priceMap.entries()) {
      if (prices.length === 0) continue;

      const open = prices[0];
      const close = prices[prices.length - 1];
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const volume = volumeMap.get(dateKey) || 0;
      const timestamp = new Date(dateKey).getTime();

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
    }

    // Sort by timestamp ascending
    candles.sort((a, b) => a.timestamp - b.timestamp);

    return candles;
  } catch (error: any) {
    console.error(`Error fetching candles for ${coinId}:`, error.message);
    throw new Error(`Failed to fetch candle data: ${error.message}`);
  }
}

/**
 * Get top cryptocurrencies by market cap with detailed information
 * @param limit - Number of coins to return (max 250 per page)
 * @returns Array of CoinInfo objects with detailed market data
 */
export async function getTopCoins(limit: number = 100): Promise<CoinInfo[]> {
  try {
    const perPage = Math.min(limit, 250); // CoinGecko max per page is 250
    const url = `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=false&price_change_percentage=24h`;

    const data = await rateLimitedRequest<any[]>(url);

    const coins: CoinInfo[] = data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      currentPrice: coin.current_price || 0,
      marketCap: coin.market_cap || 0,
      marketCapRank: coin.market_cap_rank || 0,
      volume24h: coin.total_volume || 0,
      priceChange24h: coin.price_change_24h || 0,
      priceChangePercentage24h: coin.price_change_percentage_24h || 0,
      circulatingSupply: coin.circulating_supply || 0,
      totalSupply: coin.total_supply || 0,
      high24h: coin.high_24h || 0,
      low24h: coin.low_24h || 0,
      ath: coin.ath || 0,
      athDate: new Date(coin.ath_date || Date.now()),
      atl: coin.atl || 0,
      atlDate: new Date(coin.atl_date || Date.now())
    }));

    return coins.slice(0, limit);
  } catch (error: any) {
    console.error('Error fetching top coins from CoinGecko:', error.message);
    throw new Error(`Failed to fetch top coins: ${error.message}`);
  }
}

/**
 * Get detailed information for a specific cryptocurrency
 * @param coinId - CoinGecko coin ID or symbol
 * @returns Detailed coin information
 */
export async function getCoinDetails(coinId: string): Promise<any> {
  try {
    const id = SYMBOL_TO_ID_MAP[coinId.toUpperCase()] || coinId.toLowerCase();
    const url = `${COINGECKO_BASE_URL}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`;

    const data = await rateLimitedRequest<any>(url);
    return data;
  } catch (error: any) {
    console.error(`Error fetching details for ${coinId}:`, error.message);
    throw new Error(`Failed to fetch coin details: ${error.message}`);
  }
}

/**
 * Search for coins by name or symbol
 * @param query - Search query
 * @returns Array of matching coins
 */
export async function searchCoins(query: string): Promise<Array<{id: string, symbol: string, name: string}>> {
  try {
    const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`;
    const data = await rateLimitedRequest<{coins: any[]}>(url);

    return data.coins.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name
    }));
  } catch (error: any) {
    console.error(`Error searching for coins with query "${query}":`, error.message);
    throw new Error(`Failed to search coins: ${error.message}`);
  }
}

/**
 * Get global cryptocurrency market data
 * @returns Global market statistics
 */
export async function getGlobalMarketData(): Promise<{
  totalMarketCap: number;
  totalVolume24h: number;
  bitcoinDominance: number;
  ethereumDominance: number;
  marketCapChangePercentage24h: number;
  activeCryptocurrencies: number;
}> {
  try {
    const url = `${COINGECKO_BASE_URL}/global`;
    const data = await rateLimitedRequest<{data: any}>(url);

    return {
      totalMarketCap: data.data.total_market_cap?.usd || 0,
      totalVolume24h: data.data.total_volume?.usd || 0,
      bitcoinDominance: data.data.market_cap_percentage?.btc || 0,
      ethereumDominance: data.data.market_cap_percentage?.eth || 0,
      marketCapChangePercentage24h: data.data.market_cap_change_percentage_24h_usd || 0,
      activeCryptocurrencies: data.data.active_cryptocurrencies || 0
    };
  } catch (error: any) {
    console.error('Error fetching global market data:', error.message);
    throw new Error(`Failed to fetch global market data: ${error.message}`);
  }
}

// Export utility functions
export { symbolToCoinId, coinIdToSymbol, SYMBOL_TO_ID_MAP };

// Example usage and testing
if (require.main === module) {
  (async () => {
    console.log('Testing CoinGecko Real Crypto Service...\n');

    try {
      // Test 1: Get crypto prices
      console.log('1. Fetching real-time prices for BTC, ETH, SOL...');
      const prices = await getCryptoPrices(['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC']);
      console.log('Prices:', JSON.stringify(prices, null, 2));
      console.log('');

      // Test 2: Get historical candles
      console.log('2. Fetching 30-day candles for Bitcoin...');
      const candles = await getCryptoCandles('BTC', 30);
      console.log(`Received ${candles.length} candles`);
      console.log('First candle:', candles[0]);
      console.log('Last candle:', candles[candles.length - 1]);
      console.log('');

      // Test 3: Get top coins
      console.log('3. Fetching top 10 coins by market cap...');
      const topCoins = await getTopCoins(10);
      console.log('Top coins:', topCoins.map(c => `${c.symbol} ($${c.currentPrice})`).join(', '));
      console.log('');

      // Test 4: Get global market data
      console.log('4. Fetching global market data...');
      const globalData = await getGlobalMarketData();
      console.log('Global Market Cap:', `$${(globalData.totalMarketCap / 1e12).toFixed(2)}T`);
      console.log('BTC Dominance:', `${globalData.bitcoinDominance.toFixed(2)}%`);
      console.log('');

      console.log('All tests completed successfully!');
    } catch (error) {
      console.error('Test failed:', error);
    }
  })();
}

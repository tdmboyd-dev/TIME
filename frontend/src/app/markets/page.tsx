'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  DollarSign,
  BarChart3,
  Globe,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
  category: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index';
}

// Symbols to fetch from real APIs
const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD'];
const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC'];

export default function MarketsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'stock' | 'crypto' | 'forex' | 'commodity' | 'index'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'volume'>('symbol');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrade = (symbol: string) => {
    router.push(`/trade?symbol=${symbol}`);
  };

  // Fetch real stock data
  const fetchStockData = useCallback(async (): Promise<MarketData[]> => {
    const results: MarketData[] = [];

    for (const symbol of STOCK_SYMBOLS) {
      try {
        const response = await fetch(`${API_BASE}/real-market/stock/${symbol}`);
        const data = await response.json();

        if (data.success && data.data) {
          const d = data.data;
          results.push({
            symbol: d.symbol || symbol,
            name: d.name || `${symbol} Inc.`,
            price: d.price || 0,
            change: d.change || 0,
            changePercent: d.changePercent || 0,
            volume: d.volume || 0,
            high24h: d.high || d.price * 1.02,
            low24h: d.low || d.price * 0.98,
            marketCap: d.marketCap,
            category: 'stock'
          });
        }
      } catch (err) {
        // Error handled - symbol skipped
      }
    }

    return results;
  }, []);

  // Fetch real crypto data
  const fetchCryptoData = useCallback(async (): Promise<MarketData[]> => {
    const results: MarketData[] = [];

    for (const symbol of CRYPTO_SYMBOLS) {
      try {
        const response = await fetch(`${API_BASE}/real-market/crypto/${symbol}`);
        const data = await response.json();

        if (data.success && data.data) {
          const d = data.data;
          results.push({
            symbol: d.symbol || symbol,
            name: d.name || symbol,
            price: d.price || 0,
            change: d.change24h || 0,
            changePercent: d.changePercent24h || 0,
            volume: d.volume24h || 0,
            high24h: d.high24h || d.price * 1.05,
            low24h: d.low24h || d.price * 0.95,
            marketCap: d.marketCap,
            category: 'crypto'
          });
        }
      } catch (err) {
        // Error handled - symbol skipped
      }
    }

    return results;
  }, []);

  // Fetch FMP market movers (gainers/losers)
  const fetchMarketMovers = useCallback(async (): Promise<MarketData[]> => {
    const results: MarketData[] = [];

    try {
      const [gainersRes, losersRes] = await Promise.all([
        fetch(`${API_BASE}/fmp/gainers`),
        fetch(`${API_BASE}/fmp/losers`)
      ]);

      const gainers = await gainersRes.json();
      const losers = await losersRes.json();

      // Add top gainers
      if (gainers.success && gainers.data) {
        gainers.data.slice(0, 3).forEach((g: any) => {
          if (!results.find(r => r.symbol === g.symbol)) {
            results.push({
              symbol: g.symbol,
              name: g.name || g.symbol,
              price: g.price || 0,
              change: g.change || 0,
              changePercent: g.changesPercentage || g.changePercent || 0,
              volume: g.volume || 0,
              high24h: g.dayHigh || g.price * 1.02,
              low24h: g.dayLow || g.price * 0.98,
              marketCap: g.marketCap,
              category: 'stock'
            });
          }
        });
      }

      // Add top losers
      if (losers.success && losers.data) {
        losers.data.slice(0, 3).forEach((l: any) => {
          if (!results.find(r => r.symbol === l.symbol)) {
            results.push({
              symbol: l.symbol,
              name: l.name || l.symbol,
              price: l.price || 0,
              change: l.change || 0,
              changePercent: l.changesPercentage || l.changePercent || 0,
              volume: l.volume || 0,
              high24h: l.dayHigh || l.price * 1.02,
              low24h: l.dayLow || l.price * 0.98,
              marketCap: l.marketCap,
              category: 'stock'
            });
          }
        });
      }
    } catch (err) {
      // Error handled - movers unavailable
    }

    return results;
  }, []);

  // Main data fetching function
  const fetchAllData = useCallback(async () => {
    setError(null);

    try {
      // Fetch all data in parallel
      const [stocks, cryptos, movers] = await Promise.all([
        fetchStockData(),
        fetchCryptoData(),
        fetchMarketMovers()
      ]);

      // Combine and deduplicate
      const allData: MarketData[] = [];
      const seen = new Set<string>();

      [...stocks, ...cryptos, ...movers].forEach(item => {
        if (!seen.has(item.symbol) && item.price > 0) {
          seen.add(item.symbol);
          allData.push(item);
        }
      });

      if (allData.length > 0) {
        setMarketData(allData);
        setIsConnected(true);
      } else {
        setError('No market data available');
        setIsConnected(false);
      }
    } catch (err) {
      // Error handled - shows error to user
      setError('Failed to connect to market data');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchStockData, fetchCryptoData, fetchMarketMovers]);

  // Handle hydration and time display
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString());
    const timeInterval = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();

    // Refresh every 30 seconds
    const refreshInterval = setInterval(fetchAllData, 30000);
    return () => clearInterval(refreshInterval);
  }, [fetchAllData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  const filteredData = marketData
    .filter(item => filter === 'all' || item.category === filter)
    .filter(item =>
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'change') return b.changePercent - a.changePercent;
      if (sortBy === 'volume') return b.volume - a.volume;
      return a.symbol.localeCompare(b.symbol);
    });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stock': return <BarChart3 className="w-4 h-4" />;
      case 'crypto': return <Zap className="w-4 h-4" />;
      case 'forex': return <Globe className="w-4 h-4" />;
      case 'commodity': return <DollarSign className="w-4 h-4" />;
      case 'index': return <Activity className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (!num || isNaN(num)) return '$0.00';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  // Calculate market summary
  const summary = {
    totalUp: filteredData.filter(d => d.changePercent > 0).length,
    totalDown: filteredData.filter(d => d.changePercent < 0).length,
    totalFlat: filteredData.filter(d => d.changePercent === 0).length,
    avgChange: filteredData.length > 0
      ? filteredData.reduce((acc, d) => acc + d.changePercent, 0) / filteredData.length
      : 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-time-primary animate-spin" />
          <p className="text-slate-400">Loading real market data...</p>
          <p className="text-xs text-slate-500 mt-2">Fetching from Finnhub, CoinGecko, FMP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Markets</h1>
          <p className="text-slate-400">Real-time market data from live APIs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-slate-400">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Updated:</span>
            <span className="text-white" suppressHydrationWarning>{mounted ? currentTime : '--:--:--'}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}. Using cached data if available.
        </div>
      )}

      {/* Market Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Gainers</p>
              <p className="text-xl font-bold text-green-400">{summary.totalUp}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Losers</p>
              <p className="text-xl font-bold text-red-400">{summary.totalDown}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Minus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Assets</p>
              <p className="text-xl font-bold text-blue-400">{filteredData.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Avg Change</p>
              <p className={`text-xl font-bold ${summary.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {summary.avgChange >= 0 ? '+' : ''}{summary.avgChange.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-time-primary/50"
              suppressHydrationWarning
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2">
            {(['all', 'stock', 'crypto'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === cat
                    ? 'bg-time-primary text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="symbol">Sort by Symbol</option>
            <option value="change">Sort by Change</option>
            <option value="volume">Sort by Volume</option>
          </select>
        </div>
      </div>

      {/* Market Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Asset</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Price</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">24h Change</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">24h High</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">24h Low</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Volume</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Market Cap</th>
                <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No market data available. Check your API connections.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.symbol} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          item.category === 'stock' ? 'bg-blue-500/20 text-blue-400' :
                          item.category === 'crypto' ? 'bg-orange-500/20 text-orange-400' :
                          item.category === 'forex' ? 'bg-green-500/20 text-green-400' :
                          item.category === 'commodity' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.symbol}</p>
                          <p className="text-xs text-slate-400 max-w-[150px] truncate">{item.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-medium text-white">
                        {item.category === 'forex' ? item.price.toFixed(4) : formatNumber(item.price)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className={`flex items-center justify-end gap-1 ${item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.changePercent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span className="font-medium">
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right text-slate-300">
                      {item.category === 'forex' ? item.high24h.toFixed(4) : formatNumber(item.high24h)}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-300">
                      {item.category === 'forex' ? item.low24h.toFixed(4) : formatNumber(item.low24h)}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-300">
                      {item.volume > 0 ? formatNumber(item.volume) : '-'}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-300">
                      {item.marketCap ? formatNumber(item.marketCap) : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleTrade(item.symbol)}
                        className="px-3 py-1.5 bg-time-primary/20 text-time-primary border border-time-primary/30 rounded-lg text-sm font-medium hover:bg-time-primary/30 transition-colors"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Sources */}
      <div className="text-center text-xs text-slate-500">
        Data from Finnhub, CoinGecko, Binance, Alpha Vantage, and FMP APIs
      </div>
    </div>
  );
}

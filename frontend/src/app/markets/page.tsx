'use client';

import { useState, useEffect } from 'react';
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
  Filter,
  RefreshCw
} from 'lucide-react';

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

const mockMarketData: MarketData[] = [
  // Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.52, change: 2.34, changePercent: 1.33, volume: 45678900, high24h: 179.80, low24h: 175.20, marketCap: 2800000000000, category: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change: -1.23, changePercent: -0.32, volume: 23456789, high24h: 382.00, low24h: 376.50, marketCap: 2810000000000, category: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 141.80, change: 3.45, changePercent: 2.49, volume: 18765432, high24h: 142.50, low24h: 138.00, marketCap: 1780000000000, category: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.25, change: 1.89, changePercent: 1.07, volume: 34567890, high24h: 179.00, low24h: 175.80, marketCap: 1850000000000, category: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: -5.67, changePercent: -2.23, volume: 67890123, high24h: 255.00, low24h: 245.00, marketCap: 789000000000, category: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 495.22, change: 12.34, changePercent: 2.56, volume: 45678901, high24h: 498.00, low24h: 480.00, marketCap: 1220000000000, category: 'stock' },

  // Crypto
  { symbol: 'BTC', name: 'Bitcoin', price: 43567.89, change: 1234.56, changePercent: 2.92, volume: 28900000000, high24h: 44000.00, low24h: 42000.00, marketCap: 852000000000, category: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', price: 2345.67, change: 78.90, changePercent: 3.48, volume: 15600000000, high24h: 2380.00, low24h: 2250.00, marketCap: 282000000000, category: 'crypto' },
  { symbol: 'SOL', name: 'Solana', price: 98.45, change: -3.21, changePercent: -3.16, volume: 2340000000, high24h: 102.00, low24h: 95.00, marketCap: 42000000000, category: 'crypto' },
  { symbol: 'XRP', name: 'Ripple', price: 0.6234, change: 0.0234, changePercent: 3.90, volume: 1890000000, high24h: 0.6400, low24h: 0.5900, marketCap: 34000000000, category: 'crypto' },

  // Forex
  { symbol: 'EUR/USD', name: 'Euro/US Dollar', price: 1.0892, change: 0.0023, changePercent: 0.21, volume: 0, high24h: 1.0915, low24h: 1.0865, category: 'forex' },
  { symbol: 'GBP/USD', name: 'British Pound/USD', price: 1.2734, change: -0.0045, changePercent: -0.35, volume: 0, high24h: 1.2780, low24h: 1.2700, category: 'forex' },
  { symbol: 'USD/JPY', name: 'US Dollar/Yen', price: 149.23, change: 0.67, changePercent: 0.45, volume: 0, high24h: 149.80, low24h: 148.50, category: 'forex' },

  // Commodities
  { symbol: 'GOLD', name: 'Gold', price: 2024.50, change: 12.30, changePercent: 0.61, volume: 0, high24h: 2030.00, low24h: 2010.00, category: 'commodity' },
  { symbol: 'SILVER', name: 'Silver', price: 23.45, change: -0.23, changePercent: -0.97, volume: 0, high24h: 23.80, low24h: 23.20, category: 'commodity' },
  { symbol: 'OIL', name: 'Crude Oil WTI', price: 78.34, change: 1.23, changePercent: 1.60, volume: 0, high24h: 79.00, low24h: 76.50, category: 'commodity' },

  // Indices
  { symbol: 'SPX', name: 'S&P 500', price: 4783.45, change: 23.67, changePercent: 0.50, volume: 0, high24h: 4790.00, low24h: 4755.00, category: 'index' },
  { symbol: 'DJI', name: 'Dow Jones', price: 37562.34, change: 145.23, changePercent: 0.39, volume: 0, high24h: 37600.00, low24h: 37400.00, category: 'index' },
  { symbol: 'IXIC', name: 'NASDAQ Composite', price: 15003.22, change: 78.45, changePercent: 0.53, volume: 0, high24h: 15050.00, low24h: 14920.00, category: 'index' },
];

export default function MarketsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'stock' | 'crypto' | 'forex' | 'commodity' | 'index'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'volume'>('symbol');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketData, setMarketData] = useState(mockMarketData);

  const handleTrade = (symbol: string) => {
    // Navigate to trade page with the selected asset
    router.push(`/trade?symbol=${symbol}`);
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => prev.map(item => ({
        ...item,
        price: item.price * (1 + (Math.random() - 0.5) * 0.002),
        change: item.change + (Math.random() - 0.5) * 0.5,
        changePercent: item.changePercent + (Math.random() - 0.5) * 0.1,
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
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
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  // Calculate market summary
  const summary = {
    totalUp: filteredData.filter(d => d.change > 0).length,
    totalDown: filteredData.filter(d => d.change < 0).length,
    totalFlat: filteredData.filter(d => d.change === 0).length,
    avgChange: filteredData.reduce((acc, d) => acc + d.changePercent, 0) / filteredData.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Markets</h1>
          <p className="text-slate-400">Real-time market data across all asset classes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Last updated:</span>
            <span className="text-white">{new Date().toLocaleTimeString()}</span>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

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
              <p className="text-sm text-slate-400">Unchanged</p>
              <p className="text-xl font-bold text-blue-400">{summary.totalFlat}</p>
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
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2">
            {(['all', 'stock', 'crypto', 'forex', 'commodity', 'index'] as const).map((cat) => (
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
              {filteredData.map((item) => (
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
                        <p className="text-xs text-slate-400">{item.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="font-medium text-white">
                      {item.category === 'forex' ? item.price.toFixed(4) : formatNumber(item.price)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className={`flex items-center justify-end gap-1 ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span className="font-medium">
                        {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

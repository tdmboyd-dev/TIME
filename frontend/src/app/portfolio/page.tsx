'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Filter,
  CheckCircle,
  X,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Position {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'forex' | 'commodity' | 'etf' | 'tokenized';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  allocation: number;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';
  symbol: string;
  quantity: number;
  price: number;
  total: number;
  date: Date;
}

const positions: Position[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', quantity: 50, avgPrice: 165.00, currentPrice: 178.52, value: 8926, pnl: 676, pnlPercent: 8.19, allocation: 15.2 },
  { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', quantity: 25, avgPrice: 350.00, currentPrice: 378.91, value: 9472.75, pnl: 722.75, pnlPercent: 8.26, allocation: 16.1 },
  { id: '3', symbol: 'BTC/USD', name: 'Bitcoin', type: 'crypto', quantity: 0.5, avgPrice: 38000, currentPrice: 43521.80, value: 21760.90, pnl: 2760.90, pnlPercent: 14.53, allocation: 37.0 },
  { id: '4', symbol: 'ETH/USD', name: 'Ethereum', type: 'crypto', quantity: 3, avgPrice: 2100, currentPrice: 2285.40, value: 6856.20, pnl: 556.20, pnlPercent: 8.83, allocation: 11.7 },
  { id: '5', symbol: 'GOLD', name: 'Gold', type: 'commodity', quantity: 2, avgPrice: 1950, currentPrice: 2024.50, value: 4049, pnl: 149, pnlPercent: 3.82, allocation: 6.9 },
  { id: '6', symbol: 'tTSLA', name: 'Tokenized Tesla', type: 'tokenized', quantity: 10, avgPrice: 220, currentPrice: 248.50, value: 2485, pnl: 285, pnlPercent: 12.95, allocation: 4.2 },
  { id: '7', symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf', quantity: 10, avgPrice: 460, currentPrice: 478.92, value: 4789.20, pnl: 189.20, pnlPercent: 4.11, allocation: 8.1 },
  { id: '8', symbol: 'EUR/USD', name: 'Euro/USD', type: 'forex', quantity: 1000, avgPrice: 1.0750, currentPrice: 1.0842, value: 1084.20, pnl: 9.20, pnlPercent: 0.86, allocation: 1.8 },
];

const transactions: Transaction[] = [
  { id: '1', type: 'buy', symbol: 'AAPL', quantity: 10, price: 175.20, total: 1752, date: new Date('2024-01-15') },
  { id: '2', type: 'buy', symbol: 'BTC/USD', quantity: 0.1, price: 42000, total: 4200, date: new Date('2024-01-14') },
  { id: '3', type: 'sell', symbol: 'GOOGL', quantity: 5, price: 140.50, total: 702.50, date: new Date('2024-01-13') },
  { id: '4', type: 'dividend', symbol: 'MSFT', quantity: 0, price: 0, total: 45.75, date: new Date('2024-01-12') },
  { id: '5', type: 'deposit', symbol: 'USD', quantity: 0, price: 0, total: 5000, date: new Date('2024-01-10') },
  { id: '6', type: 'buy', symbol: 'ETH/USD', quantity: 1, price: 2250, total: 2250, date: new Date('2024-01-09') },
  { id: '7', type: 'buy', symbol: 'tTSLA', quantity: 5, price: 235, total: 1175, date: new Date('2024-01-08') },
  { id: '8', type: 'sell', symbol: 'NVDA', quantity: 3, price: 480, total: 1440, date: new Date('2024-01-07') },
];

const allocationColors: Record<string, string> = {
  stock: '#3b82f6',
  crypto: '#f59e0b',
  forex: '#8b5cf6',
  commodity: '#eab308',
  etf: '#06b6d4',
  tokenized: '#10b981',
};

export default function PortfolioPage() {
  const [hideBalances, setHideBalances] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'allocation'>('value');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [livePositions, setLivePositions] = useState<Position[]>(positions);
  const [alpacaAccount, setAlpacaAccount] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real portfolio from Alpaca
  const fetchAlpacaData = useCallback(async () => {
    try {
      // Fetch account info
      const accountRes = await fetch(`${API_BASE}/broker/alpaca/account`);
      const accountData = await accountRes.json();

      if (accountData.success && accountData.data) {
        setAlpacaAccount(accountData.data);
        setIsConnected(true);
      }

      // Fetch positions
      const positionsRes = await fetch(`${API_BASE}/broker/alpaca/positions`);
      const positionsData = await positionsRes.json();

      if (positionsData.success && Array.isArray(positionsData.data) && positionsData.data.length > 0) {
        const alpacaPositions: Position[] = positionsData.data.map((p: any, idx: number) => ({
          id: p.asset_id || `pos-${idx}`,
          symbol: p.symbol,
          name: p.symbol,
          type: 'stock' as const,
          quantity: parseFloat(p.qty) || 0,
          avgPrice: parseFloat(p.avg_entry_price) || 0,
          currentPrice: parseFloat(p.current_price) || 0,
          value: parseFloat(p.market_value) || 0,
          pnl: parseFloat(p.unrealized_pl) || 0,
          pnlPercent: parseFloat(p.unrealized_plpc) * 100 || 0,
          allocation: 0, // Will calculate below
        }));

        // Calculate allocations
        const totalVal = alpacaPositions.reduce((sum, p) => sum + p.value, 0);
        alpacaPositions.forEach(p => {
          p.allocation = totalVal > 0 ? (p.value / totalVal) * 100 : 0;
        });

        setLivePositions(alpacaPositions.length > 0 ? alpacaPositions : positions);
      }
    } catch (error) {
      console.error('Failed to fetch Alpaca data:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAlpacaData();
    const interval = setInterval(fetchAlpacaData, 30000);
    return () => clearInterval(interval);
  }, [fetchAlpacaData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAlpacaData();
    setNotification({ type: 'success', message: 'Portfolio data refreshed' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExport = () => {
    // Export positions to CSV
    const csv = [
      'Symbol,Name,Type,Quantity,Avg Price,Current Price,Value,P&L,P&L %,Allocation',
      ...livePositions.map(p =>
        `${p.symbol},${p.name},${p.type},${p.quantity},${p.avgPrice},${p.currentPrice},${p.value},${p.pnl},${p.pnlPercent}%,${p.allocation}%`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    setNotification({ type: 'success', message: 'Portfolio exported to CSV' });
    setTimeout(() => setNotification(null), 3000);
  };

  const totalValue = livePositions.reduce((sum, p) => sum + p.value, 0);
  const totalPnL = livePositions.reduce((sum, p) => sum + p.pnl, 0);
  const totalPnLPercent = totalValue > totalPnL ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

  const filteredPositions = livePositions
    .filter(p => selectedFilter === 'all' || p.type === selectedFilter)
    .sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'pnl') return b.pnl - a.pnl;
      return b.allocation - a.allocation;
    });

  const allocationByType = positions.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + p.allocation;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-slate-400 mt-1">Track your investments and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideBalances(!hideBalances)}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={hideBalances ? 'Show balances' : 'Hide balances'}
          >
            {hideBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Export to CSV"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-time-primary" />
            <span className="text-sm text-slate-400">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {hideBalances ? '••••••' : `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-slate-500 mt-1">Across {positions.length} positions</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            {totalPnL >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm text-slate-400">Total P&L</span>
          </div>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {hideBalances ? '••••••' : `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </p>
          <p className={`text-xs mt-1 ${totalPnL >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}% all time
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-green-400" />
            <span className="text-sm text-slate-400">Best Performer</span>
          </div>
          <p className="text-lg font-bold text-white">BTC/USD</p>
          <p className="text-sm text-green-400">+14.53%</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-5 h-5 text-red-400" />
            <span className="text-sm text-slate-400">Worst Performer</span>
          </div>
          <p className="text-lg font-bold text-white">EUR/USD</p>
          <p className="text-sm text-yellow-400">+0.86%</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Positions Table */}
        <div className="col-span-8 card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-white">Positions</h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none"
              >
                <option value="all">All Assets</option>
                <option value="stock">Stocks</option>
                <option value="crypto">Crypto</option>
                <option value="forex">Forex</option>
                <option value="commodity">Commodities</option>
                <option value="etf">ETFs</option>
                <option value="tokenized">Tokenized</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'value' | 'pnl' | 'allocation')}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none"
              >
                <option value="value">Sort by Value</option>
                <option value="pnl">Sort by P&L</option>
                <option value="allocation">Sort by Allocation</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                  <th className="pb-3 font-medium">Asset</th>
                  <th className="pb-3 font-medium">Quantity</th>
                  <th className="pb-3 font-medium">Avg Price</th>
                  <th className="pb-3 font-medium">Current</th>
                  <th className="pb-3 font-medium">Value</th>
                  <th className="pb-3 font-medium">P&L</th>
                  <th className="pb-3 font-medium">Allocation</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredPositions.map(position => (
                  <tr key={position.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: allocationColors[position.type] }}
                        />
                        <div>
                          <span className="font-medium text-white">{position.symbol}</span>
                          <p className="text-xs text-slate-500">{position.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">
                      {hideBalances ? '••••' : position.quantity}
                    </td>
                    <td className="py-3 text-slate-300">
                      ${position.avgPrice.toFixed(2)}
                    </td>
                    <td className="py-3 text-white font-medium">
                      ${position.currentPrice.toFixed(2)}
                    </td>
                    <td className="py-3 text-white font-medium">
                      {hideBalances ? '••••••' : `$${position.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </td>
                    <td className="py-3">
                      <div className={position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        <span className="font-medium">
                          {hideBalances ? '••••' : `${position.pnl >= 0 ? '+' : ''}$${position.pnl.toFixed(2)}`}
                        </span>
                        <span className="text-xs ml-1">
                          ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${position.allocation}%`,
                              backgroundColor: allocationColors[position.type]
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{position.allocation.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-4 space-y-4">
          {/* Allocation Chart */}
          <div className="card p-4">
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Asset Allocation
            </h3>
            <div className="space-y-3">
              {Object.entries(allocationByType).map(([type, allocation]) => (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 capitalize">{type}</span>
                    <span className="text-white font-medium">{allocation.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${allocation}%`,
                        backgroundColor: allocationColors[type]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card p-4">
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {transactions.slice(0, 6).map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.type === 'buy' ? 'bg-green-500/20 text-green-400' :
                      tx.type === 'sell' ? 'bg-red-500/20 text-red-400' :
                      tx.type === 'dividend' ? 'bg-purple-500/20 text-purple-400' :
                      tx.type === 'deposit' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {tx.type === 'buy' && <ArrowDownRight className="w-4 h-4" />}
                      {tx.type === 'sell' && <ArrowUpRight className="w-4 h-4" />}
                      {tx.type === 'dividend' && <Percent className="w-4 h-4" />}
                      {tx.type === 'deposit' && <DollarSign className="w-4 h-4" />}
                      {tx.type === 'withdrawal' && <DollarSign className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium capitalize">
                        {tx.type} {tx.symbol}
                      </p>
                      <p className="text-xs text-slate-500">
                        {tx.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      tx.type === 'buy' || tx.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {tx.type === 'buy' || tx.type === 'withdrawal' ? '-' : '+'}
                      {hideBalances ? '••••' : `$${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </p>
                    {tx.quantity > 0 && (
                      <p className="text-xs text-slate-500">{tx.quantity} @ ${tx.price.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setNotification({ type: 'success', message: 'Transaction history opened in new tab' });
                setTimeout(() => setNotification(null), 3000);
              }}
              className="w-full mt-4 py-2 text-sm text-time-primary hover:text-time-primary/80 transition-colors"
            >
              View All Transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

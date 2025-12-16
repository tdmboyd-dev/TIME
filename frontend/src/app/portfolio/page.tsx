'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
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
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev/api/v1';

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
  broker?: string;
  side?: string;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';
  symbol: string;
  quantity: number;
  price: number;
  total: number;
  date: Date;
  broker?: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalCash: number;
  totalBuyingPower: number;
  totalMarginUsed: number;
  totalPnL: number;
  totalPnLPercent: number;
  positionCount: number;
  positionsByType: Record<string, number>;
  bestPerformer: { symbol: string; pnlPercent: number } | null;
  worstPerformer: { symbol: string; pnlPercent: number } | null;
  brokerCount: number;
}

interface BrokerStatus {
  id: string;
  name: string;
  type: string;
  connected: boolean;
  status: string;
}

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

  // Real data states
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [brokers, setBrokers] = useState<BrokerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real portfolio data
  const fetchPortfolioData = useCallback(async () => {
    try {
      setError(null);

      // Fetch positions, summary, broker status, and trades in parallel
      const [positionsRes, summaryRes, brokersRes, tradesRes] = await Promise.all([
        fetch(`${API_BASE}/portfolio/positions`),
        fetch(`${API_BASE}/portfolio/summary`),
        fetch(`${API_BASE}/portfolio/brokers/status`),
        fetch(`${API_BASE}/portfolio/trades?limit=20`),
      ]);

      // Parse responses
      const positionsData = await positionsRes.json();
      const summaryData = await summaryRes.json();
      const brokersData = await brokersRes.json();
      const tradesData = await tradesRes.json();

      // Update positions
      if (positionsData.success && Array.isArray(positionsData.data)) {
        // Calculate allocations
        const totalValue = positionsData.data.reduce((sum: number, p: Position) => sum + p.value, 0);
        const positionsWithAllocation = positionsData.data.map((p: Position) => ({
          ...p,
          allocation: totalValue > 0 ? (p.value / totalValue) * 100 : 0,
        }));
        setPositions(positionsWithAllocation);
      } else {
        setPositions([]);
      }

      // Update summary
      if (summaryData.success && summaryData.data) {
        setSummary(summaryData.data);
      }

      // Update broker status
      if (brokersData.success && Array.isArray(brokersData.data?.brokers)) {
        setBrokers(brokersData.data.brokers);
      }

      // Update transactions
      if (tradesData.success && Array.isArray(tradesData.data)) {
        const formattedTrades = tradesData.data.map((t: any) => ({
          ...t,
          date: new Date(t.date),
        }));
        setTransactions(formattedTrades);
      }

    } catch (error: any) {
      console.error('Failed to fetch portfolio data:', error);
      setError(error.message || 'Failed to load portfolio data');
      setNotification({
        type: 'error',
        message: 'Failed to load portfolio data. Please check broker connections.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPortfolioData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, [fetchPortfolioData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPortfolioData();
    setNotification({ type: 'success', message: 'Portfolio data refreshed' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExport = () => {
    if (positions.length === 0) {
      setNotification({ type: 'error', message: 'No positions to export' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Export positions to CSV
    const csv = [
      'Symbol,Name,Type,Quantity,Avg Price,Current Price,Value,P&L,P&L %,Allocation,Broker',
      ...positions.map(p =>
        `${p.symbol},${p.name},${p.type},${p.quantity},${p.avgPrice},${p.currentPrice},${p.value},${p.pnl},${p.pnlPercent}%,${p.allocation}%,${p.broker || 'N/A'}`
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

  const totalValue = summary?.totalValue || 0;
  const totalPnL = summary?.totalPnL || 0;
  const totalPnLPercent = summary?.totalPnLPercent || 0;

  const filteredPositions = positions
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

  const connectedBrokersCount = brokers.filter(b => b.connected).length;
  const hasConnectedBrokers = connectedBrokersCount > 0;

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Portfolio</h1>
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-time-primary animate-spin" />
            ) : hasConnectedBrokers ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50">
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-green-400">
                  {connectedBrokersCount} Broker{connectedBrokersCount !== 1 ? 's' : ''} Connected
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50">
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">No Brokers Connected</span>
              </div>
            )}
          </div>
          <p className="text-slate-400 mt-1">
            {hasConnectedBrokers
              ? `Live data from ${brokers.map(b => b.name).join(', ')}`
              : 'Connect brokers to view your portfolio'}
          </p>
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
            disabled={isRefreshing}
            className={`p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            disabled={positions.length === 0}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to CSV"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-time-primary animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading portfolio data...</p>
          </div>
        </div>
      )}

      {/* No Brokers Connected State */}
      {!isLoading && !hasConnectedBrokers && (
        <div className="card p-8 text-center">
          <WifiOff className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Brokers Connected</h3>
          <p className="text-slate-400 mb-6">
            Connect your brokerage accounts to view real-time portfolio data
          </p>
          <button className="px-6 py-3 bg-time-primary hover:bg-time-primary/90 text-white font-medium rounded-lg transition-colors">
            Connect Broker
          </button>
        </div>
      )}

      {/* Portfolio Data */}
      {!isLoading && hasConnectedBrokers && (
        <>
          {/* Portfolio Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-time-primary" />
                <span className="text-sm text-slate-400">Total Value</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {hideBalances ? '••••••' : `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">Across {positions.length} position{positions.length !== 1 ? 's' : ''}</p>
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
                {hideBalances ? '••••••' : `${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
              {summary?.bestPerformer ? (
                <>
                  <p className="text-lg font-bold text-white">{summary.bestPerformer.symbol}</p>
                  <p className="text-sm text-green-400">+{summary.bestPerformer.pnlPercent.toFixed(2)}%</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No data</p>
              )}
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-5 h-5 text-red-400" />
                <span className="text-sm text-slate-400">Worst Performer</span>
              </div>
              {summary?.worstPerformer ? (
                <>
                  <p className="text-lg font-bold text-white">{summary.worstPerformer.symbol}</p>
                  <p className={`text-sm ${summary.worstPerformer.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {summary.worstPerformer.pnlPercent >= 0 ? '+' : ''}{summary.worstPerformer.pnlPercent.toFixed(2)}%
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No data</p>
              )}
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

              {filteredPositions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No positions found</p>
                </div>
              ) : (
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
                                {position.broker && (
                                  <p className="text-xs text-slate-500">{position.broker}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-slate-300">
                            {hideBalances ? '••••' : position.quantity.toFixed(4)}
                          </td>
                          <td className="py-3 text-slate-300">
                            ${position.avgPrice.toFixed(2)}
                          </td>
                          <td className="py-3 text-white font-medium">
                            ${position.currentPrice.toFixed(2)}
                          </td>
                          <td className="py-3 text-white font-medium">
                            {hideBalances ? '••••••' : `$${position.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-3">
                            <div className={position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                              <span className="font-medium">
                                {hideBalances ? '••••' : `${position.pnl >= 0 ? '+' : ''}$${Math.abs(position.pnl).toFixed(2)}`}
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
              )}
            </div>

            {/* Right Panel */}
            <div className="col-span-4 space-y-4">
              {/* Allocation Chart */}
              <div className="card p-4">
                <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Asset Allocation
                </h3>
                {Object.keys(allocationByType).length === 0 ? (
                  <p className="text-sm text-slate-500">No positions</p>
                ) : (
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
                )}
              </div>

              {/* Recent Transactions */}
              <div className="card p-4">
                <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Activity
                </h3>
                {transactions.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent activity</p>
                ) : (
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
                            {hideBalances ? '••••' : `$${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </p>
                          {tx.quantity > 0 && (
                            <p className="text-xs text-slate-500">{tx.quantity} @ ${tx.price.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

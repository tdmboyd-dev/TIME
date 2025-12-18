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
  AlertCircle,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

// Helper for auth headers
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('time_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

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

interface ProviderStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  enabled: boolean;
  lastCheck?: string;
}

const allocationColors: Record<string, string> = {
  stock: '#3b82f6',
  crypto: '#f59e0b',
  forex: '#8b5cf6',
  commodity: '#eab308',
  etf: '#06b6d4',
  tokenized: '#10b981',
};

// Demo data to show the structure
const DEMO_POSITIONS: Position[] = [
  {
    id: 'demo-1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    quantity: 10,
    avgPrice: 150.00,
    currentPrice: 175.50,
    value: 1755.00,
    pnl: 255.00,
    pnlPercent: 17.00,
    allocation: 35.1,
    broker: 'Demo Broker',
  },
  {
    id: 'demo-2',
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    type: 'crypto',
    quantity: 0.05,
    avgPrice: 45000.00,
    currentPrice: 52000.00,
    value: 2600.00,
    pnl: 350.00,
    pnlPercent: 15.56,
    allocation: 52.0,
    broker: 'Demo Broker',
  },
  {
    id: 'demo-3',
    symbol: 'EUR/USD',
    name: 'Euro/US Dollar',
    type: 'forex',
    quantity: 1000,
    avgPrice: 1.08,
    currentPrice: 1.09,
    value: 645.00,
    pnl: 10.00,
    pnlPercent: 0.93,
    allocation: 12.9,
    broker: 'Demo Broker',
  },
];

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    type: 'buy',
    symbol: 'AAPL',
    quantity: 10,
    price: 150.00,
    total: 1500.00,
    date: new Date('2025-12-10'),
    broker: 'Demo Broker',
  },
  {
    id: 'tx-2',
    type: 'buy',
    symbol: 'BTC-USD',
    quantity: 0.05,
    price: 45000.00,
    total: 2250.00,
    date: new Date('2025-12-08'),
    broker: 'Demo Broker',
  },
];

export default function PortfolioPage() {
  const [hideBalances, setHideBalances] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'allocation'>('value');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Real data states
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [brokers, setBrokers] = useState<BrokerStatus[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolioAvailable, setPortfolioAvailable] = useState(false);
  const [showDemoData, setShowDemoData] = useState(false);

  // Fetch provider status (this endpoint exists)
  const fetchProviderStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/real-market/status`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.providers) {
          const providerList = Object.entries(data.providers).map(([name, info]: [string, any]) => ({
            name,
            status: info.status as 'online' | 'offline' | 'degraded',
            enabled: info.enabled ?? false,
            lastCheck: info.lastCheck,
          }));
          setProviders(providerList);
        }
      }
    } catch (error) {
      console.log('Provider status not available');
    }
  };

  // Fetch real portfolio data
  const fetchPortfolioData = useCallback(async () => {
    try {
      setError(null);

      // Try to fetch real portfolio data
      const [positionsRes, summaryRes, brokersRes, tradesRes] = await Promise.all([
        fetch(`${API_BASE}/portfolio/positions`, { headers: getAuthHeaders() }).catch(() => null),
        fetch(`${API_BASE}/portfolio/summary`, { headers: getAuthHeaders() }).catch(() => null),
        fetch(`${API_BASE}/portfolio/brokers/status`, { headers: getAuthHeaders() }).catch(() => null),
        fetch(`${API_BASE}/portfolio/trades?limit=20`, { headers: getAuthHeaders() }).catch(() => null),
      ]);

      // Check if any endpoint returned successfully
      const hasData = !!(positionsRes?.ok || summaryRes?.ok || brokersRes?.ok);
      setPortfolioAvailable(hasData);

      if (!hasData) {
        // Portfolio endpoints not available (404 or not deployed)
        setError('Portfolio data requires broker connection');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Parse responses
      if (positionsRes?.ok) {
        const positionsData = await positionsRes.json();
        if (positionsData.success && Array.isArray(positionsData.data)) {
          const totalValue = positionsData.data.reduce((sum: number, p: Position) => sum + p.value, 0);
          const positionsWithAllocation = positionsData.data.map((p: Position) => ({
            ...p,
            allocation: totalValue > 0 ? (p.value / totalValue) * 100 : 0,
          }));
          setPositions(positionsWithAllocation);
        }
      }

      if (summaryRes?.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.success && summaryData.data) {
          setSummary(summaryData.data);
        }
      }

      if (brokersRes?.ok) {
        const brokersData = await brokersRes.json();
        if (brokersData.success && Array.isArray(brokersData.data?.brokers)) {
          setBrokers(brokersData.data.brokers);
        }
      }

      if (tradesRes?.ok) {
        const tradesData = await tradesRes.json();
        if (tradesData.success && Array.isArray(tradesData.data)) {
          const formattedTrades = tradesData.data.map((t: any) => ({
            ...t,
            date: new Date(t.date),
          }));
          setTransactions(formattedTrades);
        }
      }

    } catch (error: any) {
      console.error('Failed to fetch portfolio data:', error);
      setError('Portfolio endpoints not yet deployed');
      setPortfolioAvailable(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPortfolioData();
    fetchProviderStatus();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPortfolioData();
      fetchProviderStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchPortfolioData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPortfolioData();
    fetchProviderStatus();
    setNotification({ type: 'success', message: 'Data refreshed' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExport = () => {
    const dataToExport = showDemoData ? DEMO_POSITIONS : positions;

    if (dataToExport.length === 0) {
      setNotification({ type: 'error', message: 'No positions to export' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const csv = [
      'Symbol,Name,Type,Quantity,Avg Price,Current Price,Value,P&L,P&L %,Allocation,Broker',
      ...dataToExport.map(p =>
        `${p.symbol},${p.name},${p.type},${p.quantity},${p.avgPrice},${p.currentPrice},${p.value},${p.pnl},${p.pnlPercent}%,${p.allocation}%,${p.broker || 'N/A'}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${showDemoData ? 'demo-' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    setNotification({ type: 'success', message: 'Portfolio exported to CSV' });
    setTimeout(() => setNotification(null), 3000);
  };

  const displayPositions = showDemoData ? DEMO_POSITIONS : positions;
  const displayTransactions = showDemoData ? DEMO_TRANSACTIONS : transactions;

  const totalValue = showDemoData ? 5000.00 : (summary?.totalValue || 0);
  const totalPnL = showDemoData ? 615.00 : (summary?.totalPnL || 0);
  const totalPnLPercent = showDemoData ? 14.03 : (summary?.totalPnLPercent || 0);

  const filteredPositions = displayPositions
    .filter(p => selectedFilter === 'all' || p.type === selectedFilter)
    .sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'pnl') return b.pnl - a.pnl;
      return b.allocation - a.allocation;
    });

  const allocationByType = displayPositions.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + p.allocation;
    return acc;
  }, {} as Record<string, number>);

  const connectedBrokersCount = brokers.filter(b => b.connected).length;
  const hasConnectedBrokers = connectedBrokersCount > 0 || showDemoData;
  const onlineProviders = providers.filter(p => p.status === 'online' && p.enabled);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' :
          notification.type === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-400' :
          'bg-blue-500/20 border border-blue-500/50 text-blue-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
           notification.type === 'error' ? <X className="w-5 h-5" /> :
           <AlertCircle className="w-5 h-5" />}
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
            ) : portfolioAvailable && hasConnectedBrokers ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50">
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-green-400">
                  {showDemoData ? 'Demo Mode' : `${connectedBrokersCount} Broker${connectedBrokersCount !== 1 ? 's' : ''} Connected`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Setup Required</span>
              </div>
            )}
          </div>
          <p className="text-slate-400 mt-1">
            {portfolioAvailable && !showDemoData
              ? `Live data from ${brokers.map(b => b.name).join(', ')}`
              : showDemoData
              ? 'Viewing demo portfolio structure'
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
            disabled={filteredPositions.length === 0}
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

      {/* Setup Required State */}
      {!isLoading && !portfolioAvailable && !showDemoData && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="card p-6 border-2 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Portfolio Data Requires Broker Connection</h3>
                <p className="text-slate-300 mb-4">
                  The portfolio endpoints are available in the backend but require authentication and an active broker connection.
                  Connect your brokerage accounts to view real-time portfolio data, positions, and trading history.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDemoData(true)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                  >
                    View Demo Portfolio
                  </button>
                  <a
                    href="/brokers"
                    className="px-4 py-2 bg-time-primary hover:bg-time-primary/90 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Connect Broker
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Status */}
          {providers.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-time-primary" />
                Market Data Providers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((provider) => (
                  <div key={provider.name} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white capitalize">{provider.name}</span>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        provider.status === 'online' ? 'bg-green-500/20 text-green-400' :
                        provider.status === 'degraded' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {provider.status}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {provider.enabled ? 'Active' : 'Disabled'}
                      {provider.lastCheck && ` • Last check: ${new Date(provider.lastCheck).toLocaleTimeString()}`}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">
                {onlineProviders.length} of {providers.length} providers online and ready
              </p>
            </div>
          )}

          {/* Features Overview */}
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4">Portfolio Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Wallet className="w-5 h-5 text-time-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Real-Time Positions</h4>
                  <p className="text-xs text-slate-400">Track stocks, crypto, forex, commodities, and ETFs</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">P&L Tracking</h4>
                  <p className="text-xs text-slate-400">Monitor gains and losses across all positions</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <PieChart className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Asset Allocation</h4>
                  <p className="text-xs text-slate-400">Visualize portfolio distribution by asset type</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Trade History</h4>
                  <p className="text-xs text-slate-400">View all transactions and activity</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div className="card p-6 bg-slate-800/30">
            <h3 className="font-semibold text-white mb-3">For Developers</h3>
            <div className="space-y-2 text-sm">
              <p className="text-slate-300">
                Portfolio endpoints are implemented at <code className="px-2 py-0.5 bg-slate-700 rounded text-time-primary">src/backend/routes/portfolio.ts</code>
              </p>
              <div className="pl-4 space-y-1 text-slate-400">
                <p>• <code className="text-xs">/api/v1/portfolio/positions</code> - Get all positions</p>
                <p>• <code className="text-xs">/api/v1/portfolio/summary</code> - Portfolio summary</p>
                <p>• <code className="text-xs">/api/v1/portfolio/brokers/status</code> - Broker status</p>
                <p>• <code className="text-xs">/api/v1/portfolio/trades</code> - Trade history</p>
              </div>
              <p className="text-slate-400 mt-3">
                These endpoints require broker connections via BrokerManager to return real data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Demo Data View */}
      {showDemoData && (
        <div className="space-y-4">
          {/* Demo Banner */}
          <div className="card p-4 bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">Demo Portfolio View</p>
                  <p className="text-xs text-slate-400">This is sample data to show portfolio structure</p>
                </div>
              </div>
              <button
                onClick={() => setShowDemoData(false)}
                className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Exit Demo
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
                {hideBalances ? '••••••' : `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">Across {displayPositions.length} positions</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-sm text-slate-400">Total P&L</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {hideBalances ? '••••••' : `+$${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-green-400/70 mt-1">
                +{totalPnLPercent.toFixed(2)}% all time
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-5 h-5 text-green-400" />
                <span className="text-sm text-slate-400">Best Performer</span>
              </div>
              <p className="text-lg font-bold text-white">AAPL</p>
              <p className="text-sm text-green-400">+17.00%</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-slate-400">Worst Performer</span>
              </div>
              <p className="text-lg font-bold text-white">EUR/USD</p>
              <p className="text-sm text-green-400">+0.93%</p>
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
                  {displayTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          tx.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.type === 'buy' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
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
                        <p className={`text-sm font-medium ${tx.type === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                          {tx.type === 'buy' ? '-' : '+'}
                          {hideBalances ? '••••' : `$${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                        <p className="text-xs text-slate-500">{tx.quantity} @ ${tx.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real Portfolio Data */}
      {!isLoading && portfolioAvailable && !showDemoData && hasConnectedBrokers && (
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

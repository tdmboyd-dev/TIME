'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Bot,
  Target,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';

import { API_BASE, getTokenFromCookie } from '@/lib/api';

interface Trade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  botName: string;
  strategyName: string;
  entryTime: Date;
  exitTime: Date;
  duration: number; // minutes
  reasoning: string;
}

// NO MOCK DATA - All data comes from real API endpoints

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'pnl'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch trades from backend
  const fetchTrades = useCallback(async () => {
    try {
      const token = getTokenFromCookie();
      const [tradingResponse, portfolioResponse] = await Promise.all([
        fetch(`${API_BASE}/trading/trades?limit=100`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }),
        fetch(`${API_BASE}/portfolio/trades`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }),
      ]);

      let allTrades: Trade[] = [];

      // Parse trading history
      if (tradingResponse.ok) {
        const tradingData = await tradingResponse.json();
        if (tradingData.success && tradingData.data) {
          const formattedTrades = tradingData.data.map((t: any) => ({
            id: t.id,
            symbol: t.symbol,
            direction: t.side === 'buy' ? 'long' : 'short',
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice || t.currentPrice || t.entryPrice,
            quantity: t.quantity,
            pnl: t.pnl || 0,
            pnlPercent: t.pnlPercent || 0,
            botName: t.botId || 'Manual',
            strategyName: t.strategy || 'Unknown',
            entryTime: new Date(t.entryTime || t.createdAt),
            exitTime: new Date(t.exitTime || t.updatedAt || Date.now()),
            duration: t.duration || 0,
            reasoning: t.reasoning || t.notes || 'No reasoning provided',
          }));
          allTrades = [...allTrades, ...formattedTrades];
          setIsConnected(true);
        }
      }

      // Parse portfolio trades
      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        if (portfolioData.success && portfolioData.data) {
          const portfolioTrades = portfolioData.data.map((t: any) => ({
            id: t.id || `portfolio-${Date.now()}-${Math.random()}`,
            symbol: t.symbol,
            direction: t.side === 'buy' ? 'long' : 'short',
            entryPrice: t.avgPrice || t.price,
            exitPrice: t.currentPrice || t.avgPrice,
            quantity: t.quantity,
            pnl: t.pnl || t.unrealizedPnL || 0,
            pnlPercent: t.pnlPercent || 0,
            botName: t.broker || 'Portfolio',
            strategyName: 'Position',
            entryTime: new Date(t.openedAt || Date.now()),
            exitTime: new Date(t.closedAt || Date.now()),
            duration: 0,
            reasoning: 'Portfolio position',
          }));
          allTrades = [...allTrades, ...portfolioTrades];
        }
      }

      // Set real trades - empty array if none found
      setTrades(allTrades);
      setIsConnected(allTrades.length > 0);
    } catch (error) {
      // Error handled - shows empty state
      setTrades([]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTrades();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTrades();
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Symbol', 'Direction', 'Entry Price', 'Exit Price', 'Quantity', 'P&L', 'P&L %', 'Bot', 'Strategy', 'Entry Time', 'Exit Time'].join(','),
      ...trades.map(t => [
        t.id, t.symbol, t.direction, t.entryPrice, t.exitPrice, t.quantity, t.pnl, t.pnlPercent, t.botName, t.strategyName, t.entryTime.toISOString(), t.exitTime.toISOString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTrades = trades
    .filter(trade => {
      const matchesSearch = trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.botName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.strategyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDirection = filterDirection === 'all' || trade.direction === filterDirection;
      const matchesResult = filterResult === 'all' ||
        (filterResult === 'win' && trade.pnl > 0) ||
        (filterResult === 'loss' && trade.pnl < 0);
      return matchesSearch && matchesDirection && matchesResult;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? b.exitTime.getTime() - a.exitTime.getTime()
          : a.exitTime.getTime() - b.exitTime.getTime();
      } else {
        return sortOrder === 'desc' ? b.pnl - a.pnl : a.pnl - b.pnl;
      }
    });

  const totalPnl = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = filteredTrades.filter(t => t.pnl > 0);
  const winRate = filteredTrades.length > 0
    ? Math.round((winningTrades.length / filteredTrades.length) * 100)
    : 0;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
          <p className="text-white font-medium">Loading trade history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Trade History</h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isConnected
                ? 'bg-green-500/20 border border-green-500/50'
                : 'bg-amber-500/20 border border-amber-500/50'
            }`}>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-amber-400'}`}>
                {isConnected ? 'Live' : 'Demo'}
              </span>
            </div>
          </div>
          <p className="text-slate-400">Complete record of all trades with attribution</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh trades"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-700/50">
              <History className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Trades</p>
              <p className="text-xl font-bold text-white">{filteredTrades.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Win Rate</p>
              <p className="text-xl font-bold text-green-400">{winRate}%</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Winning Trades</p>
              <p className="text-xl font-bold text-green-400">{winningTrades.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'p-2 rounded-lg',
              totalPnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
            )}>
              {totalPnl >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-slate-400">Total P&L</p>
              <p className={clsx(
                'text-xl font-bold',
                totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                ${totalPnl.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-time-primary/50"
            />
          </div>

          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="all">All Directions</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>

          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="all">All Results</option>
            <option value="win">Winners</option>
            <option value="loss">Losers</option>
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg flex items-center gap-1',
                sortBy === 'date'
                  ? 'bg-time-primary/20 text-time-primary'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Calendar className="w-4 h-4" />
              Date
              {sortBy === 'date' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'pnl') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('pnl');
                  setSortOrder('desc');
                }
              }}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg flex items-center gap-1',
                sortBy === 'pnl'
                  ? 'bg-time-primary/20 text-time-primary'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <TrendingUp className="w-4 h-4" />
              P&L
              {sortBy === 'pnl' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
            </button>
          </div>
        </div>
      </div>

      {/* Trades List */}
      <div className="space-y-2">
        {filteredTrades.map((trade) => {
          const isExpanded = expandedTrade === trade.id;

          return (
            <div
              key={trade.id}
              className={clsx(
                'card overflow-hidden transition-all',
                isExpanded && 'ring-1 ring-time-primary/50'
              )}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedTrade(isExpanded ? null : trade.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      'p-2 rounded-lg',
                      trade.direction === 'long' ? 'bg-green-500/10' : 'bg-red-500/10'
                    )}>
                      {trade.direction === 'long' ? (
                        <TrendingUp className={clsx('w-5 h-5 text-green-400')} />
                      ) : (
                        <TrendingDown className={clsx('w-5 h-5 text-red-400')} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{trade.symbol}</span>
                        <span className={clsx(
                          'px-2 py-0.5 text-xs rounded uppercase font-medium',
                          trade.direction === 'long'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        )}>
                          {trade.direction}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Bot className="w-3 h-3" />
                        <span>{trade.botName}</span>
                        <span>•</span>
                        <span>{trade.strategyName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Entry → Exit</p>
                      <p className="text-sm text-white">
                        ${trade.entryPrice.toLocaleString()} → ${trade.exitPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className={clsx(
                        'text-lg font-bold',
                        trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </p>
                      <p className={clsx(
                        'text-xs',
                        trade.pnl >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                      )}>
                        {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700/50">
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-white">Trade Details</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-500">Entry Time</p>
                          <p className="text-white">
                            {trade.entryTime.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Exit Time</p>
                          <p className="text-white">
                            {trade.exitTime.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Duration</p>
                          <p className="text-white flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(trade.duration)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Quantity</p>
                          <p className="text-white">{trade.quantity}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-white">Trade Story</h4>
                      <p className="text-sm text-slate-300 p-3 bg-slate-800/50 rounded-lg">
                        {trade.reasoning}
                      </p>
                      <button className="text-sm text-time-primary hover:text-time-primary/80 flex items-center gap-1">
                        View Full Analysis
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTrades.length === 0 && (
        <div className="card p-12 text-center">
          <History className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No trades found</h3>
          <p className="text-slate-400">
            Try adjusting your filters or wait for new trades
          </p>
        </div>
      )}
    </div>
  );
}

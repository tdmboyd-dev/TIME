'use client';

import { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import clsx from 'clsx';

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

const mockTrades: Trade[] = [
  {
    id: '1',
    symbol: 'BTC/USD',
    direction: 'long',
    entryPrice: 43250.00,
    exitPrice: 44180.50,
    quantity: 0.5,
    pnl: 465.25,
    pnlPercent: 2.15,
    botName: 'Trend Follower Alpha',
    strategyName: 'Multi-Trend Fusion',
    entryTime: new Date(Date.now() - 7200000),
    exitTime: new Date(Date.now() - 3600000),
    duration: 60,
    reasoning: 'Bullish divergence detected on 4H timeframe, momentum confirmation from RSI',
  },
  {
    id: '2',
    symbol: 'ETH/USD',
    direction: 'long',
    entryPrice: 2340.50,
    exitPrice: 2298.25,
    quantity: 2,
    pnl: -84.50,
    pnlPercent: -1.80,
    botName: 'Mean Reversion Master',
    strategyName: 'Statistical Arbitrage V2',
    entryTime: new Date(Date.now() - 14400000),
    exitTime: new Date(Date.now() - 10800000),
    duration: 60,
    reasoning: 'Price touched lower Bollinger Band, mean reversion expected',
  },
  {
    id: '3',
    symbol: 'SPY',
    direction: 'short',
    entryPrice: 479.25,
    exitPrice: 477.50,
    quantity: 50,
    pnl: 87.50,
    pnlPercent: 0.37,
    botName: 'TIME Synthesis #47',
    strategyName: 'Breakout Momentum Hybrid',
    entryTime: new Date(Date.now() - 28800000),
    exitTime: new Date(Date.now() - 25200000),
    duration: 60,
    reasoning: 'Resistance rejection with volume confirmation, market regime shift detected',
  },
  {
    id: '4',
    symbol: 'AAPL',
    direction: 'long',
    entryPrice: 185.50,
    exitPrice: 188.75,
    quantity: 100,
    pnl: 325.00,
    pnlPercent: 1.75,
    botName: 'Momentum Hunter',
    strategyName: 'Multi-Trend Fusion',
    entryTime: new Date(Date.now() - 86400000),
    exitTime: new Date(Date.now() - 72000000),
    duration: 240,
    reasoning: 'Breakout above consolidation, strong momentum indicators',
  },
  {
    id: '5',
    symbol: 'EUR/USD',
    direction: 'short',
    entryPrice: 1.0875,
    exitPrice: 1.0892,
    quantity: 10000,
    pnl: -17.00,
    pnlPercent: -0.16,
    botName: 'Scalper Pro V2',
    strategyName: 'Statistical Arbitrage V2',
    entryTime: new Date(Date.now() - 43200000),
    exitTime: new Date(Date.now() - 42000000),
    duration: 20,
    reasoning: 'Quick scalp on resistance level, stopped out on news spike',
  },
];

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'pnl'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredTrades = mockTrades
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade History</h1>
          <p className="text-slate-400">Complete record of all trades with attribution</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
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

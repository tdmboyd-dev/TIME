'use client';

import { useState } from 'react';
import {
  Layers,
  Search,
  Plus,
  Play,
  Pause,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Shield,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import clsx from 'clsx';

interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'trend_following' | 'mean_reversion' | 'momentum' | 'breakout' | 'hybrid' | 'synthesized';
  status: 'active' | 'paused' | 'backtesting' | 'optimizing';
  sourceBots: string[];
  performance: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalTrades: number;
    totalPnL: number;
    avgTrade: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  synthesized: boolean;
  createdAt: Date;
}

const mockStrategies: Strategy[] = [
  {
    id: '1',
    name: 'Multi-Trend Fusion',
    description: 'Combines signals from multiple timeframes with adaptive position sizing',
    type: 'trend_following',
    status: 'active',
    sourceBots: ['Trend Follower Alpha', 'Momentum Hunter'],
    performance: {
      winRate: 67.3,
      profitFactor: 2.45,
      maxDrawdown: 11.2,
      sharpeRatio: 2.01,
      totalTrades: 892,
      totalPnL: 67890.45,
      avgTrade: 76.12,
    },
    riskLevel: 'medium',
    synthesized: true,
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    name: 'Statistical Arbitrage V2',
    description: 'Mean reversion strategy with dynamic hedging',
    type: 'mean_reversion',
    status: 'active',
    sourceBots: ['Mean Reversion Master'],
    performance: {
      winRate: 73.8,
      profitFactor: 1.92,
      maxDrawdown: 7.5,
      sharpeRatio: 2.34,
      totalTrades: 1567,
      totalPnL: 45678.23,
      avgTrade: 29.15,
    },
    riskLevel: 'low',
    synthesized: false,
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '3',
    name: 'Breakout Momentum Hybrid',
    description: 'Combines breakout detection with momentum confirmation',
    type: 'hybrid',
    status: 'optimizing',
    sourceBots: ['Breakout Hunter', 'Momentum Hunter'],
    performance: {
      winRate: 58.9,
      profitFactor: 2.67,
      maxDrawdown: 15.8,
      sharpeRatio: 1.78,
      totalTrades: 456,
      totalPnL: 23456.78,
      avgTrade: 51.44,
    },
    riskLevel: 'high',
    synthesized: true,
    createdAt: new Date('2024-03-01'),
  },
  {
    id: '4',
    name: 'TIME Synthesis #12',
    description: 'Auto-evolved strategy optimized for current market regime',
    type: 'synthesized',
    status: 'backtesting',
    sourceBots: ['Trend Follower Alpha', 'Mean Reversion Master', 'Scalper Pro V2'],
    performance: {
      winRate: 64.2,
      profitFactor: 2.12,
      maxDrawdown: 9.3,
      sharpeRatio: 1.89,
      totalTrades: 234,
      totalPnL: 12345.67,
      avgTrade: 52.76,
    },
    riskLevel: 'medium',
    synthesized: true,
    createdAt: new Date('2024-04-10'),
  },
];

const typeColors: Record<string, string> = {
  trend_following: 'bg-blue-500/20 text-blue-400',
  mean_reversion: 'bg-purple-500/20 text-purple-400',
  momentum: 'bg-green-500/20 text-green-400',
  breakout: 'bg-orange-500/20 text-orange-400',
  hybrid: 'bg-cyan-500/20 text-cyan-400',
  synthesized: 'bg-pink-500/20 text-pink-400',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400' },
  paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  backtesting: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  optimizing: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

const riskColors: Record<string, string> = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

export default function StrategiesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const filteredStrategies = mockStrategies.filter(strategy => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategy.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || strategy.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Strategies</h1>
          <p className="text-slate-400">Synthesized and evolved trading strategies</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Synthesize New
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Strategy
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-time-primary/10">
              <Layers className="w-5 h-5 text-time-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Strategies</p>
              <p className="text-xl font-bold text-white">{mockStrategies.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active</p>
              <p className="text-xl font-bold text-green-400">
                {mockStrategies.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Synthesized</p>
              <p className="text-xl font-bold text-purple-400">
                {mockStrategies.filter(s => s.synthesized).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total P&L</p>
              <p className="text-xl font-bold text-green-400">
                ${mockStrategies.reduce((sum, s) => sum + s.performance.totalPnL, 0).toLocaleString(undefined, {
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
              placeholder="Search strategies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-time-primary/50"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="all">All Types</option>
            <option value="trend_following">Trend Following</option>
            <option value="mean_reversion">Mean Reversion</option>
            <option value="momentum">Momentum</option>
            <option value="breakout">Breakout</option>
            <option value="hybrid">Hybrid</option>
            <option value="synthesized">Synthesized</option>
          </select>
        </div>
      </div>

      {/* Strategies List */}
      <div className="space-y-4">
        {filteredStrategies.map((strategy) => {
          const statusStyle = statusColors[strategy.status] || statusColors.paused;
          const isExpanded = selectedStrategy === strategy.id;

          return (
            <div
              key={strategy.id}
              className={clsx(
                'card overflow-hidden transition-all',
                isExpanded && 'ring-2 ring-time-primary'
              )}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setSelectedStrategy(isExpanded ? null : strategy.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-slate-800">
                      <Layers className="w-6 h-6 text-time-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
                        <span className={clsx(
                          'px-2 py-0.5 text-xs rounded-full capitalize',
                          typeColors[strategy.type]
                        )}>
                          {strategy.type.replace('_', ' ')}
                        </span>
                        {strategy.synthesized && (
                          <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-400 rounded-full">
                            Synthesized
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{strategy.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>Source: {strategy.sourceBots.join(', ')}</span>
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Risk: <span className={riskColors[strategy.riskLevel]}>{strategy.riskLevel}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={clsx(
                      'px-3 py-1 text-sm font-medium rounded-full capitalize',
                      statusStyle.bg,
                      statusStyle.text
                    )}>
                      {strategy.status}
                    </span>
                    <ChevronRight className={clsx(
                      'w-5 h-5 text-slate-400 transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="grid grid-cols-4 md:grid-cols-7 gap-4 mt-4 pt-4 border-t border-slate-700/50">
                  <div>
                    <p className="text-xs text-slate-500">Win Rate</p>
                    <p className={clsx(
                      'text-sm font-semibold',
                      strategy.performance.winRate >= 60 ? 'text-green-400' :
                      strategy.performance.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {strategy.performance.winRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Profit Factor</p>
                    <p className="text-sm font-semibold text-white">
                      {strategy.performance.profitFactor.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Sharpe Ratio</p>
                    <p className="text-sm font-semibold text-white">
                      {strategy.performance.sharpeRatio.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Max Drawdown</p>
                    <p className="text-sm font-semibold text-red-400">
                      -{strategy.performance.maxDrawdown.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Trades</p>
                    <p className="text-sm font-semibold text-white">
                      {strategy.performance.totalTrades.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Avg Trade</p>
                    <p className="text-sm font-semibold text-white">
                      ${strategy.performance.avgTrade.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total P&L</p>
                    <p className={clsx(
                      'text-sm font-semibold',
                      strategy.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      ${strategy.performance.totalPnL.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700/50">
                  <div className="pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        View Analytics
                      </button>
                      <button className="btn-secondary text-sm flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Backtest
                      </button>
                      <button className="btn-secondary text-sm flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Configure
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {strategy.status === 'active' ? (
                        <button className="btn-secondary text-sm flex items-center gap-2 text-yellow-400">
                          <Pause className="w-4 h-4" />
                          Pause
                        </button>
                      ) : (
                        <button className="btn-primary text-sm flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredStrategies.length === 0 && (
        <div className="card p-12 text-center">
          <Layers className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No strategies found</h3>
          <p className="text-slate-400 mb-4">
            Try adjusting your filters or create a new strategy
          </p>
          <button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Strategy
          </button>
        </div>
      )}
    </div>
  );
}

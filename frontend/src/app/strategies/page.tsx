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
  BarChart3,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles
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
  const [showSynthesizeModal, setShowSynthesizeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>(mockStrategies);

  // Synthesize form state
  const [synthesizeGoal, setSynthesizeGoal] = useState<'max_return' | 'min_risk' | 'balanced'>('balanced');
  const [synthesizeSourceBots, setSynthesizeSourceBots] = useState<string[]>([]);

  // Create form state
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyType, setNewStrategyType] = useState<Strategy['type']>('trend_following');
  const [newStrategyRisk, setNewStrategyRisk] = useState<'low' | 'medium' | 'high'>('medium');

  const availableBots = ['Trend Follower Alpha', 'Mean Reversion Master', 'Scalper Pro V2', 'Breakout Hunter', 'Momentum Hunter'];

  const handleSynthesize = async () => {
    if (synthesizeSourceBots.length < 2) {
      setNotification({ type: 'error', message: 'Please select at least 2 source bots' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsSynthesizing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newStrategy: Strategy = {
      id: `strat-${Date.now()}`,
      name: `TIME Synthesis #${strategies.filter(s => s.synthesized).length + 1}`,
      description: `Auto-synthesized ${synthesizeGoal.replace('_', ' ')} strategy from ${synthesizeSourceBots.length} bots`,
      type: 'synthesized',
      status: 'backtesting',
      sourceBots: synthesizeSourceBots,
      performance: {
        winRate: Math.random() * 20 + 55,
        profitFactor: Math.random() * 1.5 + 1.5,
        maxDrawdown: Math.random() * 10 + 5,
        sharpeRatio: Math.random() * 1 + 1.5,
        totalTrades: Math.floor(Math.random() * 200) + 100,
        totalPnL: Math.random() * 20000 + 5000,
        avgTrade: Math.random() * 50 + 30,
      },
      riskLevel: synthesizeGoal === 'min_risk' ? 'low' : synthesizeGoal === 'max_return' ? 'high' : 'medium',
      synthesized: true,
      createdAt: new Date(),
    };

    setStrategies(prev => [newStrategy, ...prev]);
    setIsSynthesizing(false);
    setShowSynthesizeModal(false);
    setSynthesizeSourceBots([]);
    setNotification({ type: 'success', message: `Strategy synthesized! Running backtests...` });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateStrategy = async () => {
    if (!newStrategyName.trim()) {
      setNotification({ type: 'error', message: 'Please enter a strategy name' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsSynthesizing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newStrategy: Strategy = {
      id: `strat-${Date.now()}`,
      name: newStrategyName,
      description: `Custom ${newStrategyType.replace('_', ' ')} strategy`,
      type: newStrategyType,
      status: 'optimizing',
      sourceBots: [],
      performance: {
        winRate: Math.random() * 20 + 50,
        profitFactor: Math.random() * 1 + 1,
        maxDrawdown: Math.random() * 15 + 5,
        sharpeRatio: Math.random() * 1 + 1,
        totalTrades: 0,
        totalPnL: 0,
        avgTrade: 0,
      },
      riskLevel: newStrategyRisk,
      synthesized: false,
      createdAt: new Date(),
    };

    setStrategies(prev => [newStrategy, ...prev]);
    setIsSynthesizing(false);
    setShowCreateModal(false);
    setNewStrategyName('');
    setNotification({ type: 'success', message: `Strategy "${newStrategyName}" created! Optimizing parameters...` });
    setTimeout(() => setNotification(null), 5000);
  };

  const toggleSourceBot = (bot: string) => {
    setSynthesizeSourceBots(prev =>
      prev.includes(bot) ? prev.filter(b => b !== bot) : [...prev, bot]
    );
  };

  const handleViewAnalytics = (strategy: Strategy) => {
    setNotification({ type: 'success', message: `Opening analytics for ${strategy.name}...` });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBacktest = async (strategy: Strategy) => {
    setNotification({ type: 'success', message: `Running backtest for ${strategy.name}...` });
    setTimeout(() => {
      setNotification({ type: 'success', message: `Backtest complete! Win rate: ${(Math.random() * 20 + 55).toFixed(1)}%` });
      setTimeout(() => setNotification(null), 4000);
    }, 2000);
  };

  const handleConfigure = (strategy: Strategy) => {
    setNotification({ type: 'success', message: `Opening configuration for ${strategy.name}` });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleStrategy = (strategyId: string, currentStatus: string) => {
    setStrategies(prev => prev.map(s => {
      if (s.id === strategyId) {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        setNotification({
          type: 'success',
          message: `Strategy ${newStatus === 'active' ? 'activated' : 'paused'} successfully`
        });
        setTimeout(() => setNotification(null), 3000);
        return { ...s, status: newStatus as Strategy['status'] };
      }
      return s;
    }));
  };

  const filteredStrategies = strategies.filter(strategy => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategy.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || strategy.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Strategies</h1>
          <p className="text-slate-400">Synthesized and evolved trading strategies</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSynthesizeModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Synthesize New
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
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
                      <button
                        onClick={() => handleViewAnalytics(strategy)}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        View Analytics
                      </button>
                      <button
                        onClick={() => handleBacktest(strategy)}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <Target className="w-4 h-4" />
                        Backtest
                      </button>
                      <button
                        onClick={() => handleConfigure(strategy)}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Configure
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {strategy.status === 'active' ? (
                        <button
                          onClick={() => handleToggleStrategy(strategy.id, strategy.status)}
                          className="btn-secondary text-sm flex items-center gap-2 text-yellow-400"
                        >
                          <Pause className="w-4 h-4" />
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStrategy(strategy.id, strategy.status)}
                          className="btn-primary text-sm flex items-center gap-2"
                        >
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
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Strategy
          </button>
        </div>
      )}

      {/* Synthesize Modal */}
      {showSynthesizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-time-primary" />
                <h3 className="text-lg font-bold text-white">Synthesize Strategy</h3>
              </div>
              <button onClick={() => setShowSynthesizeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSynthesizing ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
                <p className="text-white font-medium">Synthesizing Strategy...</p>
                <p className="text-sm text-slate-400 mt-1">Analyzing patterns and evolving optimal parameters</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Optimization Goal</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'max_return', label: 'Max Return', desc: 'Aggressive' },
                      { id: 'balanced', label: 'Balanced', desc: 'Recommended' },
                      { id: 'min_risk', label: 'Min Risk', desc: 'Conservative' },
                    ].map(goal => (
                      <button
                        key={goal.id}
                        onClick={() => setSynthesizeGoal(goal.id as typeof synthesizeGoal)}
                        className={clsx(
                          'flex flex-col items-center p-3 rounded-lg border transition-colors',
                          synthesizeGoal === goal.id
                            ? 'bg-time-primary/20 border-time-primary text-time-primary'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                        )}
                      >
                        <span className="text-sm font-medium">{goal.label}</span>
                        <span className="text-xs opacity-70">{goal.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Source Bots (Select 2+)</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableBots.map(bot => (
                      <button
                        key={bot}
                        onClick={() => toggleSourceBot(bot)}
                        className={clsx(
                          'w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
                          synthesizeSourceBots.includes(bot)
                            ? 'bg-time-primary/20 border-time-primary'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        )}
                      >
                        <span className={clsx(
                          'text-sm',
                          synthesizeSourceBots.includes(bot) ? 'text-time-primary' : 'text-white'
                        )}>{bot}</span>
                        <div className={clsx(
                          'w-5 h-5 rounded border flex items-center justify-center',
                          synthesizeSourceBots.includes(bot)
                            ? 'bg-time-primary border-time-primary'
                            : 'border-slate-600'
                        )}>
                          {synthesizeSourceBots.includes(bot) && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-sm text-purple-400">
                    TIME AI will analyze the selected bots, extract their best performing patterns, and synthesize a new strategy optimized for your goal.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSynthesizeModal(false)}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSynthesize}
                    className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Synthesize
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Strategy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Create New Strategy</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSynthesizing ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
                <p className="text-white font-medium">Creating Strategy...</p>
                <p className="text-sm text-slate-400 mt-1">Initializing and optimizing parameters</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Strategy Name</label>
                  <input
                    type="text"
                    value={newStrategyName}
                    onChange={(e) => setNewStrategyName(e.target.value)}
                    placeholder="My Trading Strategy"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Strategy Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'trend_following', label: 'Trend Following' },
                      { id: 'mean_reversion', label: 'Mean Reversion' },
                      { id: 'momentum', label: 'Momentum' },
                      { id: 'breakout', label: 'Breakout' },
                      { id: 'hybrid', label: 'Hybrid' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setNewStrategyType(type.id as Strategy['type'])}
                        className={clsx(
                          'p-3 rounded-lg border transition-colors text-sm',
                          newStrategyType === type.id
                            ? 'bg-time-primary/20 border-time-primary text-time-primary'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Risk Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'low', label: 'Low', color: 'text-green-400' },
                      { id: 'medium', label: 'Medium', color: 'text-yellow-400' },
                      { id: 'high', label: 'High', color: 'text-red-400' },
                    ].map(risk => (
                      <button
                        key={risk.id}
                        onClick={() => setNewStrategyRisk(risk.id as typeof newStrategyRisk)}
                        className={clsx(
                          'p-3 rounded-lg border transition-colors text-sm',
                          newStrategyRisk === risk.id
                            ? 'bg-time-primary/20 border-time-primary'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        )}
                      >
                        <span className={newStrategyRisk === risk.id ? 'text-time-primary' : risk.color}>
                          {risk.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateStrategy}
                    className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                  >
                    Create Strategy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

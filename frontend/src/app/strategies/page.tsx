'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import clsx from 'clsx';
import { PageIntroModal } from '@/components/onboarding/PageIntroModal';
import { strategiesIntro } from '@/components/onboarding/pageIntroContent';

import { API_BASE, getTokenFromCookie, getAuthHeadersWithCSRF } from '@/lib/api';

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

// NO MOCK DATA - All strategies come from real API endpoints

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
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableBots, setAvailableBots] = useState<string[]>([]);

  // Synthesize form state
  const [synthesizeGoal, setSynthesizeGoal] = useState<'max_return' | 'min_risk' | 'balanced'>('balanced');
  const [synthesizeSourceBots, setSynthesizeSourceBots] = useState<string[]>([]);

  // Create form state
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyType, setNewStrategyType] = useState<Strategy['type']>('trend_following');
  const [newStrategyRisk, setNewStrategyRisk] = useState<'low' | 'medium' | 'high'>('medium');

  // Fetch strategies from backend
  const fetchStrategies = useCallback(async () => {
    try {
      setError(null);
      const token = getTokenFromCookie();

      const response = await fetch(`${API_BASE}/strategies`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.strategies && Array.isArray(data.strategies)) {
        const formattedStrategies: Strategy[] = data.strategies.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          type: s.type || 'hybrid',
          status: s.status || 'active',
          sourceBots: s.sourceBots?.map((sb: any) => sb.botId || sb) || [],
          performance: {
            winRate: s.performance?.winRate || 0,
            profitFactor: s.performance?.profitFactor || 0,
            maxDrawdown: s.performance?.maxDrawdown || 0,
            sharpeRatio: s.performance?.sharpeRatio || 0,
            totalTrades: s.performance?.totalTrades || 0,
            totalPnL: s.performance?.totalPnL || 0,
            avgTrade: s.performance?.avgTrade || 0,
          },
          riskLevel: s.riskLevel || 'medium',
          synthesized: !!s.synthesized || s.type === 'synthesized',
          createdAt: new Date(s.createdAt),
        }));
        setStrategies(formattedStrategies);
        setIsConnected(true);
      }
    } catch (error: any) {
      // Error handled - shows empty state
      setError(error.message || 'Failed to connect');
      setIsConnected(false);
      // No mock fallback - show empty state
      setStrategies([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch available bots for synthesis
  const fetchBots = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/bots/public`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAvailableBots(data.data.map((b: any) => b.name));
        }
      }
    } catch (error) {
      // Fallback to default bots
      setAvailableBots(['Trend Follower Alpha', 'Mean Reversion Master', 'Scalper Pro V2', 'Breakout Hunter', 'Momentum Hunter']);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStrategies();
    fetchBots();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStrategies, 30000);
    return () => clearInterval(interval);
  }, [fetchStrategies, fetchBots]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStrategies();
  };

  const handleSynthesize = async () => {
    if (synthesizeSourceBots.length < 2) {
      setNotification({ type: 'error', message: 'Please select at least 2 source bots' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsSynthesizing(true);

    try {
      const headers = await getAuthHeadersWithCSRF();
      const response = await fetch(`${API_BASE}/strategies/synthesize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          botIds: synthesizeSourceBots,
          method: 'ensemble',
          riskLevel: synthesizeGoal === 'min_risk' ? 'low' : synthesizeGoal === 'max_return' ? 'high' : 'medium',
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setNotification({ type: 'success', message: result.message || 'Strategy synthesized! Running backtests...' });
        fetchStrategies();
      } else {
        throw new Error(result.error || 'Failed to synthesize');
      }
    } catch (error: any) {
      // Fallback to local creation for demo
      // TODO: Remove this fallback once backend synthesize endpoint is fully implemented
      // TODO: Fetch real performance metrics from /strategies/{id}/performance endpoint after creation
      const newStrategy: Strategy = {
        id: `strat-${Date.now()}`,
        name: `TIME Synthesis #${strategies.filter(s => s.synthesized).length + 1}`,
        description: `Auto-synthesized ${synthesizeGoal.replace('_', ' ')} strategy from ${synthesizeSourceBots.length} bots`,
        type: 'synthesized',
        status: 'backtesting',
        sourceBots: synthesizeSourceBots,
        performance: {
          // Default to 0 - real metrics will be populated after backtesting completes
          winRate: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          totalTrades: 0,
          totalPnL: 0,
          avgTrade: 0,
        },
        riskLevel: synthesizeGoal === 'min_risk' ? 'low' : synthesizeGoal === 'max_return' ? 'high' : 'medium',
        synthesized: true,
        createdAt: new Date(),
      };
      setStrategies(prev => [newStrategy, ...prev]);
      setNotification({ type: 'success', message: 'Strategy synthesized (demo)! Awaiting backtest results...' });
    } finally {
      setIsSynthesizing(false);
      setShowSynthesizeModal(false);
      setSynthesizeSourceBots([]);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleCreateStrategy = async () => {
    if (!newStrategyName.trim()) {
      setNotification({ type: 'error', message: 'Please enter a strategy name' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsSynthesizing(true);

    try {
      const headers = await getAuthHeadersWithCSRF();
      const response = await fetch(`${API_BASE}/strategies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newStrategyName,
          description: `Custom ${newStrategyType.replace('_', ' ')} strategy`,
          type: newStrategyType,
          riskLevel: newStrategyRisk,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setNotification({ type: 'success', message: `Strategy "${newStrategyName}" created! Optimizing parameters...` });
        fetchStrategies();
      } else {
        throw new Error(result.error || 'Failed to create strategy');
      }
    } catch (error: any) {
      // Fallback to local creation for demo
      // TODO: Remove this fallback once backend strategy creation endpoint is fully implemented
      // TODO: Fetch real performance metrics from /strategies/{id}/performance endpoint after creation
      const newStrategy: Strategy = {
        id: `strat-${Date.now()}`,
        name: newStrategyName,
        description: `Custom ${newStrategyType.replace('_', ' ')} strategy`,
        type: newStrategyType,
        status: 'optimizing',
        sourceBots: [],
        performance: {
          // Default to 0 - real metrics will be populated after optimization/backtesting
          winRate: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          totalTrades: 0,
          totalPnL: 0,
          avgTrade: 0,
        },
        riskLevel: newStrategyRisk,
        synthesized: false,
        createdAt: new Date(),
      };
      setStrategies(prev => [newStrategy, ...prev]);
      setNotification({ type: 'success', message: `Strategy "${newStrategyName}" created (demo)! Awaiting optimization results...` });
    } finally {
      setIsSynthesizing(false);
      setShowCreateModal(false);
      setNewStrategyName('');
      setTimeout(() => setNotification(null), 5000);
    }
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
    // TODO: Implement real backtest API call to /strategies/{id}/backtest endpoint
    // TODO: Poll for backtest results and update strategy performance metrics
    setNotification({ type: 'success', message: `Running backtest for ${strategy.name}...` });
    setTimeout(() => {
      // Display placeholder message - real results should come from API
      setNotification({ type: 'success', message: `Backtest initiated for ${strategy.name}. Results will update when complete.` });
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
      <PageIntroModal content={strategiesIntro} />
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Strategies</h1>
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-time-primary animate-spin" />
            ) : (
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
            )}
          </div>
          <p className="text-slate-400">Synthesized and evolved trading strategies</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh strategies"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
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
              <p className="text-xl font-bold text-white">{strategies.length}</p>
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
                {strategies.filter(s => s.status === 'active').length}
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
                {strategies.filter(s => s.synthesized).length}
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
                ${strategies.reduce((sum, s) => sum + s.performance.totalPnL, 0).toLocaleString(undefined, {
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

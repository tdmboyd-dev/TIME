'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  Bot,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  Power,
  Target,
  Shield,
  Zap,
  Eye,
  XCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface BotTradingState {
  botId: string;
  botName: string;
  isEnabled: boolean;
  isPaused: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  openPositions: number;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  currentDailyPnL: number;
}

interface TradingStats {
  isRunning: boolean;
  enabledBots: number;
  totalTrades: number;
  openPositions: number;
  pendingSignals: number;
  totalPnL: number;
  todayPnL: number;
  winRate: number;
  bots: BotTradingState[];
}

interface AvailableBot {
  id: string;
  name: string;
  source: string;
  status: string;
  rating: number;
  winRate: number;
  profitFactor: number;
  isEnabledForTrading: boolean;
}

interface PendingSignal {
  id: string;
  botId: string;
  botName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  quantity: number;
  confidence: number;
  reasoning?: string;
  timestamp: string;
}

interface ExecutedTrade {
  id: string;
  botName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  status: string;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
}

export default function LiveTradingPage() {
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [availableBots, setAvailableBots] = useState<AvailableBot[]>([]);
  const [pendingSignals, setPendingSignals] = useState<PendingSignal[]>([]);
  const [recentTrades, setRecentTrades] = useState<ExecutedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch all trading data
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, botsRes, signalsRes, tradesRes] = await Promise.all([
        fetch(`${API_BASE}/trading/stats`),
        fetch(`${API_BASE}/trading/bots/available`),
        fetch(`${API_BASE}/trading/signals/pending`),
        fetch(`${API_BASE}/trading/trades?limit=20`),
      ]);

      const [statsData, botsData, signalsData, tradesData] = await Promise.all([
        statsRes.json(),
        botsRes.json(),
        signalsRes.json(),
        tradesRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (botsData.success) setAvailableBots(botsData.data);
      if (signalsData.success) setPendingSignals(signalsData.data);
      if (tradesData.success) setRecentTrades(tradesData.data);
    } catch (error) {
      console.error('Failed to fetch trading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Trading controls
  const startTrading = async () => {
    try {
      const res = await fetch(`${API_BASE}/trading/start`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Trading started!');
        fetchData();
      }
    } catch (error) {
      showNotification('error', 'Failed to start trading');
    }
  };

  const stopTrading = async () => {
    try {
      const res = await fetch(`${API_BASE}/trading/stop`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Trading stopped');
        fetchData();
      }
    } catch (error) {
      showNotification('error', 'Failed to stop trading');
    }
  };

  const enableBot = async (botId: string) => {
    try {
      const res = await fetch(`${API_BASE}/trading/bot/${botId}/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskLevel: 'MEDIUM', maxPositionSize: 1000 }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', `Bot enabled for trading`);
        fetchData();
      }
    } catch (error) {
      showNotification('error', 'Failed to enable bot');
    }
  };

  const disableBot = async (botId: string) => {
    try {
      const res = await fetch(`${API_BASE}/trading/bot/${botId}/disable`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Bot disabled');
        fetchData();
      }
    } catch (error) {
      showNotification('error', 'Failed to disable bot');
    }
  };

  const executeSignal = async (signalId: string) => {
    try {
      const res = await fetch(`${API_BASE}/trading/signals/${signalId}/execute`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Signal executed!');
        fetchData();
      }
    } catch (error) {
      showNotification('error', 'Failed to execute signal');
    }
  };

  const enableTopBots = async () => {
    try {
      const res = await fetch(`${API_BASE}/trading/quick/enable-top-bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5, riskLevel: 'MEDIUM' }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', `Enabled ${data.data.length} top bots!`);
        fetchData();
      }
    } catch (error) {
      showNotification('error', 'Failed to enable bots');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-time-primary animate-pulse" />
          <p className="text-slate-400">Loading trading systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Bot Trading</h1>
          <p className="text-slate-400">Control bots, execute signals, track real P&L</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {stats?.isRunning ? (
            <button
              onClick={stopTrading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop Trading
            </button>
          ) : (
            <button
              onClick={startTrading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Trading
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${
        stats?.isRunning
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-yellow-500/10 border-yellow-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${stats?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className={stats?.isRunning ? 'text-green-400' : 'text-yellow-400'}>
              {stats?.isRunning ? 'TRADING ACTIVE' : 'TRADING STOPPED'}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div><span className="text-slate-400">Bots Active:</span> <span className="text-white font-medium">{stats?.enabledBots || 0}</span></div>
            <div><span className="text-slate-400">Open Positions:</span> <span className="text-white font-medium">{stats?.openPositions || 0}</span></div>
            <div><span className="text-slate-400">Today P&L:</span> <span className={`font-medium ${(stats?.todayPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${(stats?.todayPnL || 0).toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Bots</p>
              <p className="text-xl font-bold text-white">{stats?.enabledBots || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Trades</p>
              <p className="text-xl font-bold text-white">{stats?.totalTrades || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Win Rate</p>
              <p className="text-xl font-bold text-green-400">{(stats?.winRate || 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${(stats?.totalPnL || 0) >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <DollarSign className={`w-5 h-5 ${(stats?.totalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total P&L</p>
              <p className={`text-xl font-bold ${(stats?.totalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${(stats?.totalPnL || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={enableTopBots}
            className="flex items-center gap-2 px-4 py-2 bg-time-primary/20 text-time-primary border border-time-primary/30 rounded-lg hover:bg-time-primary/30 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Enable Top 5 Bots
          </button>
          <button
            onClick={async () => {
              await fetch(`${API_BASE}/trading/quick/stop-all`, { method: 'POST' });
              showNotification('success', 'All trading stopped');
              fetchData();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Square className="w-4 h-4" />
            Emergency Stop All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Bots */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Available Bots</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {availableBots.slice(0, 10).map((bot) => (
              <div key={bot.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    bot.isEnabledForTrading ? 'bg-green-500/20' : 'bg-slate-700'
                  }`}>
                    <Bot className={`w-4 h-4 ${bot.isEnabledForTrading ? 'text-green-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{bot.name}</p>
                    <p className="text-xs text-slate-400">Rating: {bot.rating.toFixed(1)} | Win: {(bot.winRate * 100).toFixed(0)}%</p>
                  </div>
                </div>
                {bot.isEnabledForTrading ? (
                  <button
                    onClick={() => disableBot(bot.id)}
                    className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={() => enableBot(bot.id)}
                    className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                  >
                    Enable
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Signals */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Pending Signals
            {pendingSignals.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                {pendingSignals.length}
              </span>
            )}
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {pendingSignals.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No pending signals</p>
            ) : (
              pendingSignals.map((signal) => (
                <div key={signal.id} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        signal.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {signal.side}
                      </span>
                      <span className="text-white font-medium">{signal.symbol}</span>
                      <span className="text-slate-400 text-sm">x{signal.quantity}</span>
                    </div>
                    <span className="text-xs text-slate-400">{signal.confidence}% conf</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{signal.botName}</p>
                  <button
                    onClick={() => executeSignal(signal.id)}
                    className="w-full px-3 py-1.5 text-xs bg-time-primary/20 text-time-primary rounded hover:bg-time-primary/30 transition-colors"
                  >
                    Execute Signal
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Bot</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Symbol</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Side</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Qty</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Entry</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Exit</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">P&L</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No trades yet. Enable bots and start trading!
                  </td>
                </tr>
              ) : (
                recentTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-700/30 hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-sm text-white">{trade.botName}</td>
                    <td className="py-3 px-4 text-sm text-white font-medium">{trade.symbol}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-300">{trade.quantity}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-300">${trade.entryPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-300">
                      {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${
                      trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        trade.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' :
                        trade.status === 'CLOSED' ? 'bg-slate-500/20 text-slate-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

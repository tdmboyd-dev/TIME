'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Bot,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  Target,
  Zap,
  Trophy,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';

/**
 * TIME BEYOND US - User Analytics Dashboard
 *
 * Personal analytics for each user:
 * - Personal P&L chart
 * - Win rate by bot
 * - Best/worst performing bots
 * - Trade history timeline
 * - Portfolio allocation
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function getUserFromStorage(): any {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('time_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue' | 'purple' | 'orange' | 'cyan' | 'yellow';
  subtitle?: string;
}

function MetricCard({ title, value, change, icon, color, subtitle }: MetricCardProps) {
  const colors = {
    green: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
    red: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
    cyan: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/30',
    yellow: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  };

  const iconColors = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    cyan: 'text-cyan-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-slate-900/50 ${iconColors[color]}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <h3 className="text-white/60 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {subtitle && <p className="text-white/40 text-xs">{subtitle}</p>}
    </div>
  );
}

// Chart colors
const COLORS = ['#00ff88', '#00d4ff', '#9d4edd', '#ff006e', '#ffbe0b', '#06d6a0'];

export default function MyAnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | '3months' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const token = getCookie('time_auth_token');
      const user = getUserFromStorage();

      if (!token || !user) {
        setError('Please log in to view your analytics');
        setIsLoading(false);
        return;
      }

      const userId = user.id || user._id;
      const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };
      const params = new URLSearchParams({ period });

      const response = await fetch(`${API_BASE}/api/v1/analytics/user/${userId}?${params}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch analytics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const csvData = [
      ['TIME BEYOND US - My Analytics Report'],
      ['Period', period],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['TRADING PERFORMANCE'],
      ['Total Trades', analytics.trading?.totalTrades || 0],
      ['Winning Trades', analytics.trading?.winningTrades || 0],
      ['Losing Trades', analytics.trading?.losingTrades || 0],
      ['Win Rate', `${analytics.trading?.winRate || 0}%`],
      ['Total P&L', `$${analytics.trading?.totalPnL || 0}`],
      ['Gross Profit', `$${analytics.trading?.grossProfit || 0}`],
      ['Gross Loss', `$${analytics.trading?.grossLoss || 0}`],
      ['Profit Factor', analytics.trading?.profitFactor || 0],
      [''],
      ['BOTS'],
      ['Total Bots', analytics.bots?.total || 0],
      ['Active Bots', analytics.bots?.active || 0],
      ['Best Bot', analytics.bots?.bestPerformer?.botName || 'N/A'],
      ['Best Bot Win Rate', `${analytics.bots?.bestPerformer?.winRate || 0}%`],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">My Analytics</h1>
            </div>
            <p className="text-white/60">Your personal trading performance and insights</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-lg p-1">
              {['today', 'week', 'month', '3months', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === 'week' ? '7D' : p === 'month' ? '30D' : p === '3months' ? '90D' : '1Y'}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-slate-900 border border-white/10 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-white/60 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              disabled={!analytics}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-white/60">Loading your analytics...</p>
          </div>
        </div>
      ) : analytics ? (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total P&L"
              value={`$${(analytics.trading?.totalPnL || 0).toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6" />}
              color={analytics.trading?.totalPnL >= 0 ? 'green' : 'red'}
              subtitle={`Profit Factor: ${analytics.trading?.profitFactor || 0}`}
            />
            <MetricCard
              title="Win Rate"
              value={`${analytics.trading?.winRate || 0}%`}
              icon={<Target className="w-6 h-6" />}
              color={analytics.trading?.winRate >= 50 ? 'green' : 'orange'}
              subtitle={`${analytics.trading?.winningTrades || 0}W / ${analytics.trading?.losingTrades || 0}L`}
            />
            <MetricCard
              title="Total Trades"
              value={analytics.trading?.totalTrades || '0'}
              icon={<Activity className="w-6 h-6" />}
              color="blue"
              subtitle={`In ${period}`}
            />
            <MetricCard
              title="Active Bots"
              value={analytics.bots?.active || '0'}
              icon={<Bot className="w-6 h-6" />}
              color="purple"
              subtitle={`${analytics.bots?.total || 0} total`}
            />
          </div>

          {/* P&L Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cumulative P&L */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Cumulative P&L</h3>
                <span className={`text-sm font-medium ${analytics.trading?.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${(analytics.trading?.totalPnL || 0).toLocaleString()}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.charts?.pnlHistory || []}>
                  <defs>
                    <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: any) => [`$${value}`, 'Cumulative P&L']}
                  />
                  <Area type="monotone" dataKey="cumulativePnL" stroke="#00ff88" strokeWidth={2} fillOpacity={1} fill="url(#colorPnL)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Daily P&L */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Daily P&L</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.charts?.pnlHistory || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: any) => [`$${value}`, 'Daily P&L']}
                  />
                  <Bar
                    dataKey="dailyPnL"
                    fill="#00d4ff"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bot Performance */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              Bot Performance
            </h2>

            {/* Best and Worst Bots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Best Performer */}
              {analytics.bots?.bestPerformer && (
                <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <Trophy className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Best Performer</h3>
                      <p className="text-white/40 text-sm">{analytics.bots.bestPerformer.botName}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-3xl font-bold text-emerald-400">{analytics.bots.bestPerformer.winRate}%</p>
                      <p className="text-white/40 text-xs">Win Rate</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{analytics.bots.bestPerformer.trades}</p>
                      <p className="text-white/40 text-xs">Trades</p>
                    </div>
                    <div>
                      <p className={`text-3xl font-bold ${analytics.bots.bestPerformer.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${analytics.bots.bestPerformer.pnl}
                      </p>
                      <p className="text-white/40 text-xs">P&L</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Worst Performer */}
              {analytics.bots?.worstPerformer && analytics.bots.worstPerformer.botId !== analytics.bots.bestPerformer?.botId && (
                <div className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Needs Improvement</h3>
                      <p className="text-white/40 text-sm">{analytics.bots.worstPerformer.botName}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-3xl font-bold text-red-400">{analytics.bots.worstPerformer.winRate}%</p>
                      <p className="text-white/40 text-xs">Win Rate</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{analytics.bots.worstPerformer.trades}</p>
                      <p className="text-white/40 text-xs">Trades</p>
                    </div>
                    <div>
                      <p className={`text-3xl font-bold ${analytics.bots.worstPerformer.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${analytics.bots.worstPerformer.pnl}
                      </p>
                      <p className="text-white/40 text-xs">P&L</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Win Rate by Bot Chart */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Win Rate by Bot</h3>
              {analytics.charts?.winRateByBot?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.charts.winRateByBot} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                    <YAxis dataKey="botName" type="category" stroke="#94a3b8" fontSize={12} width={120} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value: any) => [`${value}%`, 'Win Rate']}
                    />
                    <Bar dataKey="winRate" fill="#9d4edd" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-white/40">
                  No bot data available for this period
                </div>
              )}
            </div>
          </div>

          {/* Portfolio Allocation */}
          {analytics.charts?.portfolioAllocation?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-cyan-400" />
                Portfolio Allocation
              </h2>
              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.charts.portfolioAllocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ asset, percentage }) => `${asset}: ${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.charts.portfolioAllocation.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Trades Timeline */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Recent Trades
            </h2>
            <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
              {analytics.recentTrades?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Side</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">P&L</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {analytics.recentTrades.map((trade: any) => (
                        <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-white font-medium">{trade.symbol}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`flex items-center gap-1 text-sm font-medium ${
                              trade.side === 'buy' || trade.side === 'long' ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {trade.side === 'buy' || trade.side === 'long' ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4" />
                              )}
                              {trade.side?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toFixed(2) || '0.00'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white/60 text-sm">
                            {new Date(trade.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-white/40">
                  No trades found for this period
                </div>
              )}
            </div>
          </div>

          {/* Trading Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h4 className="text-white/60 text-sm mb-2">Gross Profit</h4>
              <p className="text-2xl font-bold text-emerald-400">
                ${(analytics.trading?.grossProfit || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h4 className="text-white/60 text-sm mb-2">Gross Loss</h4>
              <p className="text-2xl font-bold text-red-400">
                ${(analytics.trading?.grossLoss || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h4 className="text-white/60 text-sm mb-2">Profit Factor</h4>
              <p className={`text-2xl font-bold ${analytics.trading?.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                {analytics.trading?.profitFactor || 0}
              </p>
            </div>
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h4 className="text-white/60 text-sm mb-2">Average Trade</h4>
              <p className={`text-2xl font-bold ${analytics.trading?.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${analytics.trading?.totalTrades > 0 ? (analytics.trading.totalPnL / analytics.trading.totalTrades).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-white/40">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No analytics data available</p>
            <p className="text-sm mt-1">Start trading to see your performance</p>
          </div>
        </div>
      )}
    </div>
  );
}

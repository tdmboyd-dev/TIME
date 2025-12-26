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
  Users,
  Activity,
  DollarSign,
  Bot,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  Target,
  Zap,
  Crown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

/**
 * TIME BEYOND US - Admin Analytics Dashboard
 *
 * Comprehensive admin analytics with:
 * - Total Users with growth chart
 * - Active Subscriptions by Tier (pie chart)
 * - Revenue metrics (MRR, ARR)
 * - Top Traders by P&L
 * - Bot Performance metrics
 * - Trading Volume over time
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue' | 'purple' | 'orange' | 'cyan' | 'yellow';
  subtitle?: string;
  href?: string;
}

function MetricCard({ title, value, change, icon, color, subtitle, href }: MetricCardProps) {
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

  const content = (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-6 ${href ? 'hover:scale-[1.02] transition-transform cursor-pointer' : ''}`}>
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
      {href && (
        <div className="flex items-center gap-1 text-xs text-white/40 mt-2">
          View details <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// Chart colors
const COLORS = ['#00ff88', '#00d4ff', '#9d4edd', '#ff006e', '#ffbe0b', '#06d6a0'];

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | '3months' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics data
  const [overview, setOverview] = useState<any>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<any>(null);
  const [topTraders, setTopTraders] = useState<any[]>([]);
  const [tradingAnalytics, setTradingAnalytics] = useState<any>(null);
  const [botAnalytics, setBotAnalytics] = useState<any>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const token = getCookie('time_auth_token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      const params = new URLSearchParams({ period });

      // Fetch all analytics in parallel
      const [overviewRes, usersRes, revenueRes, tradersRes, tradingRes, botsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/analytics/admin/overview?${params}`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/v1/analytics/admin/users?${params}`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/v1/analytics/admin/revenue?${params}`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/v1/analytics/top-traders?${params}&limit=10`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/v1/analytics/trading?${params}`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/v1/analytics/bots?${params}`, { headers }).catch(() => null),
      ]);

      if (overviewRes?.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }

      if (usersRes?.ok) {
        const data = await usersRes.json();
        setUserAnalytics(data);
      }

      if (revenueRes?.ok) {
        const data = await revenueRes.json();
        setRevenueAnalytics(data);
      }

      if (tradersRes?.ok) {
        const data = await tradersRes.json();
        setTopTraders(data.traders || []);
      }

      if (tradingRes?.ok) {
        const data = await tradingRes.json();
        setTradingAnalytics(data);
      }

      if (botsRes?.ok) {
        const data = await botsRes.json();
        setBotAnalytics(data);
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
    const csvData = [
      ['TIME BEYOND US - Admin Analytics Report'],
      ['Period', period],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['OVERVIEW'],
      ['Total Users', overview?.overview?.users?.total || 0],
      ['New Users (Period)', overview?.overview?.users?.newInPeriod || 0],
      ['Active Users', overview?.overview?.users?.activeUsers || 0],
      [''],
      ['TRADING'],
      ['Total Trades', overview?.overview?.trading?.totalTrades || 0],
      ['Win Rate', `${overview?.overview?.trading?.winRate || 0}%`],
      ['Total P&L', `$${overview?.overview?.trading?.totalPnL || 0}`],
      [''],
      ['BOTS'],
      ['Total Bots', overview?.overview?.bots?.total || 0],
      ['Active Bots', overview?.overview?.bots?.active || 0],
      ['Pending Approval', overview?.overview?.bots?.pending || 0],
      [''],
      ['REVENUE'],
      ['MRR', `$${overview?.overview?.revenue?.mrr || 0}`],
      ['ARR', `$${overview?.overview?.revenue?.arr || 0}`],
      ['Paid Subscribers', overview?.overview?.revenue?.paidSubscribers || 0],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
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
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Admin Analytics Dashboard</h1>
            </div>
            <p className="text-white/60">Complete platform insights and performance metrics</p>
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
                      ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white'
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-600 hover:opacity-90 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-white/60">Loading admin analytics...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={overview?.overview?.users?.total?.toLocaleString() || '0'}
              icon={<Users className="w-6 h-6" />}
              color="blue"
              subtitle={`${overview?.overview?.users?.newInPeriod || 0} new this ${period}`}
              href="/admin-portal"
            />
            <MetricCard
              title="MRR"
              value={`$${(overview?.overview?.revenue?.mrr || 0).toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6" />}
              color="green"
              subtitle={`ARR: $${(overview?.overview?.revenue?.arr || 0).toLocaleString()}`}
            />
            <MetricCard
              title="Active Bots"
              value={overview?.overview?.bots?.active || '0'}
              icon={<Bot className="w-6 h-6" />}
              color="purple"
              subtitle={`${overview?.overview?.bots?.pending || 0} pending approval`}
              href="/admin-portal"
            />
            <MetricCard
              title="Platform Win Rate"
              value={`${overview?.overview?.trading?.winRate || 0}%`}
              icon={<Target className="w-6 h-6" />}
              color="cyan"
              subtitle={`${overview?.overview?.trading?.totalTrades || 0} trades`}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">User Growth</h3>
                <span className="text-sm text-white/40">New signups over time</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={overview?.charts?.userGrowth || []}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#00d4ff" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Subscription Distribution */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Subscriptions by Tier</h3>
                <span className="text-sm text-white/40">{overview?.overview?.revenue?.paidSubscribers || 0} paid</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={overview?.charts?.subscriptions || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(overview?.charts?.subscriptions || []).map((_: any, index: number) => (
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

          {/* Revenue Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Revenue Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Monthly Recurring Revenue"
                value={`$${(revenueAnalytics?.metrics?.mrr || 0).toLocaleString()}`}
                icon={<DollarSign className="w-6 h-6" />}
                color="green"
                subtitle="MRR"
              />
              <MetricCard
                title="Annual Recurring Revenue"
                value={`$${(revenueAnalytics?.metrics?.arr || 0).toLocaleString()}`}
                icon={<TrendingUp className="w-6 h-6" />}
                color="blue"
                subtitle="ARR"
              />
              <MetricCard
                title="Conversion Rate"
                value={`${revenueAnalytics?.metrics?.conversionRate || 0}%`}
                icon={<Target className="w-6 h-6" />}
                color="purple"
                subtitle="Free to paid"
              />
              <MetricCard
                title="Customer LTV"
                value={`$${(revenueAnalytics?.metrics?.ltv || 0).toLocaleString()}`}
                icon={<Crown className="w-6 h-6" />}
                color="yellow"
                subtitle="Lifetime value"
              />
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueAnalytics?.revenueTrend || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value: any) => [`$${value}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#00ff88" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Traders Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              Top Traders by P&L
            </h2>
            <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Trader</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Total P&L</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Total Trades</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Win Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Avg Trade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {topTraders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                          No trader data available for this period
                        </td>
                      </tr>
                    ) : (
                      topTraders.map((trader, index) => (
                        <tr key={trader.userId} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-lg font-bold ${
                              index === 0 ? 'text-yellow-400' :
                              index === 1 ? 'text-gray-300' :
                              index === 2 ? 'text-amber-600' :
                              'text-white/60'
                            }`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{trader.userName}</div>
                            <div className="text-xs text-white/40">{trader.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold ${trader.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ${trader.totalPnL?.toLocaleString() || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                            {trader.totalTrades}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${
                              trader.winRate >= 60 ? 'text-emerald-400' :
                              trader.winRate >= 50 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {trader.winRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${trader.avgTradeSize >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ${trader.avgTradeSize?.toLocaleString() || 0}
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

          {/* Bot Performance Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              Bot Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Total Bots"
                value={botAnalytics?.metrics?.totalBots || '0'}
                icon={<Bot className="w-6 h-6" />}
                color="purple"
                subtitle="All registered bots"
              />
              <MetricCard
                title="Active Bots"
                value={botAnalytics?.metrics?.activeBots || '0'}
                icon={<Zap className="w-6 h-6" />}
                color="green"
                subtitle="Currently trading"
              />
              <MetricCard
                title="Avg Win Rate"
                value={`${botAnalytics?.metrics?.avgWinRate || 0}%`}
                icon={<Target className="w-6 h-6" />}
                color="cyan"
                subtitle="Platform average"
              />
              <MetricCard
                title="Pending Approval"
                value={botAnalytics?.metrics?.pendingBots || '0'}
                icon={<AlertCircle className="w-6 h-6" />}
                color="orange"
                subtitle="Awaiting review"
              />
            </div>

            {/* Top Performing Bots */}
            {overview?.topPerformers && overview.topPerformers.length > 0 && (
              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Performing Bots</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {overview.topPerformers.map((bot: any, index: number) => (
                    <div key={bot.id} className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-lg font-bold ${
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-gray-300' :
                          index === 2 ? 'text-amber-600' :
                          'text-white/60'
                        }`}>
                          #{index + 1}
                        </span>
                        <span className="text-white font-medium truncate">{bot.name}</span>
                      </div>
                      <div className="text-emerald-400 text-xl font-bold">{bot.winRate}%</div>
                      <div className="text-white/40 text-xs">Win Rate</div>
                      <div className="mt-2 text-white/60 text-sm">
                        {bot.totalTrades} trades | PF: {bot.profitFactor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trading Volume Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Trading Volume
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trading Volume Chart */}
              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Trades Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tradingAnalytics?.chartData?.trades || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="value" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* P&L Over Time */}
              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Platform P&L Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tradingAnalytics?.chartData?.pnl || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value: any) => [`$${value}`, 'P&L']}
                    />
                    <Line type="monotone" dataKey="pnl" stroke="#00ff88" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* User Activity Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              User Activity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Daily Active"
                value={userAnalytics?.activityLevels?.daily || '0'}
                icon={<Zap className="w-6 h-6" />}
                color="green"
                subtitle="Active in last 24h"
              />
              <MetricCard
                title="Weekly Active"
                value={userAnalytics?.activityLevels?.weekly || '0'}
                icon={<Calendar className="w-6 h-6" />}
                color="blue"
                subtitle="Active in last 7 days"
              />
              <MetricCard
                title="Monthly Active"
                value={userAnalytics?.activityLevels?.monthly || '0'}
                icon={<Activity className="w-6 h-6" />}
                color="purple"
                subtitle="Active in last 30 days"
              />
              <MetricCard
                title="Inactive"
                value={userAnalytics?.activityLevels?.inactive || '0'}
                icon={<AlertCircle className="w-6 h-6" />}
                color="red"
                subtitle="30+ days inactive"
              />
            </div>

            {/* User Role Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Users by Role</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(userAnalytics?.byRole || {}).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.keys(userAnalytics?.byRole || {}).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Users by Status</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(userAnalytics?.byStatus || {}).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill="#9d4edd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Signups */}
          {userAnalytics?.recentUsers && userAnalytics.recentUsers.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Recent Signups</h2>
              <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Signed Up</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userAnalytics.recentUsers.map((user: any) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                              user.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

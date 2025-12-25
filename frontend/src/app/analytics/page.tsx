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
} from 'lucide-react';

/**
 * TIME BEYOND US - Analytics Dashboard
 *
 * Comprehensive analytics with:
 * - User metrics (signups, active users, growth)
 * - Trading metrics (total trades, win rate, P&L)
 * - Bot metrics (active bots, performance, popularity)
 * - Revenue metrics (MRR, subscriptions, churn)
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
  color: 'green' | 'red' | 'blue' | 'purple' | 'orange' | 'cyan';
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
  };

  const iconColors = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    cyan: 'text-cyan-400',
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | '3months' | 'year'>('month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Analytics data
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [tradingMetrics, setTradingMetrics] = useState<any>(null);
  const [botMetrics, setBotMetrics] = useState<any>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<any>(null);

  // Chart data
  const [userChartData, setUserChartData] = useState<any[]>([]);
  const [tradingChartData, setTradingChartData] = useState<any[]>([]);
  const [pnlChartData, setPnlChartData] = useState<any[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = getCookie('time_auth_token');
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };
      const params = new URLSearchParams();

      if (dateRange.start && dateRange.end) {
        params.set('startDate', dateRange.start);
        params.set('endDate', dateRange.end);
      } else {
        params.set('period', period);
      }

      // Fetch all analytics in parallel
      const [usersRes, tradingRes, botsRes, revenueRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/analytics/users?${params}`, { headers }),
        fetch(`${API_BASE}/api/v1/analytics/trading?${params}`, { headers }),
        fetch(`${API_BASE}/api/v1/analytics/bots?${params}`, { headers }),
        fetch(`${API_BASE}/api/v1/analytics/revenue?${params}`, { headers }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUserMetrics(data.metrics);
        setUserChartData(data.chartData?.signups || []);
      }

      if (tradingRes.ok) {
        const data = await tradingRes.json();
        setTradingMetrics(data.metrics);
        setTradingChartData(data.chartData?.trades || []);
        setPnlChartData(data.chartData?.pnl || []);
      }

      if (botsRes.ok) {
        const data = await botsRes.json();
        setBotMetrics(data.metrics);
      }

      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueMetrics(data.metrics);
        setRevenueChartData(data.chartData?.revenue || []);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  const exportToCSV = () => {
    // Combine all metrics into CSV
    const csvData = [
      ['TIME BEYOND US - Analytics Report'],
      ['Period', period],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['USER METRICS'],
      ['Total Users', userMetrics?.totalUsers || 0],
      ['New Signups', userMetrics?.newSignups || 0],
      ['Active Users', userMetrics?.activeUsers || 0],
      ['Growth Rate', `${userMetrics?.growthRate || 0}%`],
      [''],
      ['TRADING METRICS'],
      ['Total Trades', tradingMetrics?.totalTrades || 0],
      ['Win Rate', `${tradingMetrics?.winRate || 0}%`],
      ['Total P&L', `$${tradingMetrics?.totalPnL || 0}`],
      ['Profit Factor', tradingMetrics?.profitFactor || 0],
      [''],
      ['BOT METRICS'],
      ['Total Bots', botMetrics?.totalBots || 0],
      ['Active Bots', botMetrics?.activeBots || 0],
      ['Average Win Rate', `${botMetrics?.avgWinRate || 0}%`],
      [''],
      ['REVENUE METRICS'],
      ['MRR', `$${revenueMetrics?.mrr || 0}`],
      ['ARR', `$${revenueMetrics?.arr || 0}`],
      ['Paid Subscribers', revenueMetrics?.paidSubscribers || 0],
      ['Churn Rate', `${revenueMetrics?.churnRate || 0}%`],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#00ff88', '#00d4ff', '#9d4edd', '#ff006e', '#ffbe0b'];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-white/60">Comprehensive platform insights and metrics</p>
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
                      ? 'bg-emerald-500 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === 'week' ? '7D' : p === 'month' ? '30D' : p === '3months' ? '90D' : '1Y'}
                </button>
              ))}
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm"
              />
              <span className="text-white/40">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm"
              />
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
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-white/60">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* User Metrics */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">User Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Total Users"
                value={userMetrics?.totalUsers?.toLocaleString() || '0'}
                icon={<Users className="w-6 h-6" />}
                color="blue"
                subtitle="All registered users"
              />
              <MetricCard
                title="New Signups"
                value={userMetrics?.newSignups?.toLocaleString() || '0'}
                change={userMetrics?.growthRate}
                icon={<TrendingUp className="w-6 h-6" />}
                color="green"
                subtitle={`In ${period}`}
              />
              <MetricCard
                title="Active Users"
                value={userMetrics?.activeUsers?.toLocaleString() || '0'}
                icon={<Activity className="w-6 h-6" />}
                color="purple"
                subtitle="Active in last 7 days"
              />
              <MetricCard
                title="Avg Users/Day"
                value={userMetrics?.averageUsersPerDay?.toLocaleString() || '0'}
                icon={<Calendar className="w-6 h-6" />}
                color="cyan"
                subtitle="Daily average"
              />
            </div>

            {/* User Signups Chart */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">User Signups Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userChartData}>
                  <defs>
                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#00ff88" fillOpacity={1} fill="url(#colorSignups)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trading Metrics */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Trading Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Total Trades"
                value={tradingMetrics?.totalTrades?.toLocaleString() || '0'}
                icon={<Activity className="w-6 h-6" />}
                color="blue"
                subtitle={`${tradingMetrics?.winningTrades || 0} wins, ${tradingMetrics?.losingTrades || 0} losses`}
              />
              <MetricCard
                title="Win Rate"
                value={`${tradingMetrics?.winRate || 0}%`}
                icon={<TrendingUp className="w-6 h-6" />}
                color="green"
                subtitle="Success rate"
              />
              <MetricCard
                title="Total P&L"
                value={`$${tradingMetrics?.totalPnL?.toLocaleString() || '0'}`}
                change={tradingMetrics?.pnlChange}
                icon={<DollarSign className="w-6 h-6" />}
                color={tradingMetrics?.totalPnL >= 0 ? 'green' : 'red'}
                subtitle={`Profit Factor: ${tradingMetrics?.profitFactor || 0}`}
              />
              <MetricCard
                title="Open Positions"
                value={tradingMetrics?.openPositions || '0'}
                icon={<Activity className="w-6 h-6" />}
                color="orange"
                subtitle="Active trades"
              />
            </div>

            {/* Trading Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trades Over Time */}
              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Trades Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tradingChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="value" fill="#00d4ff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* P&L Over Time */}
              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">P&L Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={pnlChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Line type="monotone" dataKey="pnl" stroke="#00ff88" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bot Metrics */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Bot Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Total Bots"
                value={botMetrics?.totalBots?.toLocaleString() || '0'}
                icon={<Bot className="w-6 h-6" />}
                color="purple"
                subtitle="All bots"
              />
              <MetricCard
                title="Active Bots"
                value={botMetrics?.activeBots?.toLocaleString() || '0'}
                icon={<Activity className="w-6 h-6" />}
                color="green"
                subtitle="Currently trading"
              />
              <MetricCard
                title="Avg Win Rate"
                value={`${botMetrics?.avgWinRate || 0}%`}
                icon={<TrendingUp className="w-6 h-6" />}
                color="cyan"
                subtitle="Average bot performance"
              />
              <MetricCard
                title="Absorbed Bots"
                value={botMetrics?.absorbedBots || '0'}
                icon={<Bot className="w-6 h-6" />}
                color="orange"
                subtitle="Integrated into system"
              />
            </div>

            {/* Bot Status Distribution */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Bot Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(botMetrics?.botsByStatus || {}).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(botMetrics?.botsByStatus || {}).map((_, index) => (
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

          {/* Revenue Metrics */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Revenue Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="MRR"
                value={`$${revenueMetrics?.mrr?.toLocaleString() || '0'}`}
                icon={<DollarSign className="w-6 h-6" />}
                color="green"
                subtitle="Monthly Recurring Revenue"
              />
              <MetricCard
                title="ARR"
                value={`$${revenueMetrics?.arr?.toLocaleString() || '0'}`}
                icon={<DollarSign className="w-6 h-6" />}
                color="blue"
                subtitle="Annual Recurring Revenue"
              />
              <MetricCard
                title="Paid Subscribers"
                value={revenueMetrics?.paidSubscribers?.toLocaleString() || '0'}
                icon={<Users className="w-6 h-6" />}
                color="purple"
                subtitle={`${revenueMetrics?.conversionRate || 0}% conversion`}
              />
              <MetricCard
                title="Churn Rate"
                value={`${revenueMetrics?.churnRate || 0}%`}
                icon={<TrendingDown className="w-6 h-6" />}
                color="red"
                subtitle="Monthly churn"
              />
            </div>

            {/* Revenue Over Time */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#00ff88" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

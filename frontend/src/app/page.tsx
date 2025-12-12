'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Bot,
  Brain,
  Zap,
  Activity,
  Shield,
  Target,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useTimeStore } from '@/store/timeStore';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RegimeIndicator } from '@/components/dashboard/RegimeIndicator';
import { RecentInsights } from '@/components/dashboard/RecentInsights';
import { SystemHealth } from '@/components/dashboard/SystemHealth';
import { ActiveBots } from '@/components/dashboard/ActiveBots';
import { LiveChart } from '@/components/charts/LiveChart';

export default function Dashboard() {
  const { metrics, regime, regimeConfidence, evolutionMode, bots, insights, health, isConnected } = useTimeStore();
  const { refresh } = useRealTimeData();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Wait for initial data fetch
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-time-primary to-time-secondary animate-pulse"></div>
          <p className="text-slate-400">Initializing TIME...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">TIME Meta-Intelligence Trading Governor</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-400">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            evolutionMode === 'autonomous'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
          }`}>
            {evolutionMode === 'autonomous' ? 'Autonomous Mode' : 'Controlled Mode'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Bots Absorbed"
          value={metrics.totalBotsAbsorbed}
          icon={Bot}
          trend={+12}
          color="primary"
        />
        <StatsCard
          title="Trades Analyzed"
          value={metrics.totalTradesAnalyzed}
          icon={Activity}
          trend={+8}
          color="success"
        />
        <StatsCard
          title="Insights Generated"
          value={metrics.totalInsightsGenerated}
          icon={Brain}
          trend={+23}
          color="accent"
        />
        <StatsCard
          title="Strategies Synthesized"
          value={metrics.totalStrategiesSynthesized}
          icon={Zap}
          trend={+5}
          color="secondary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Overview */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Market Overview</h2>
              <RegimeIndicator regime={regime} confidence={regimeConfidence} />
            </div>
            <LiveChart />
          </div>

          {/* Active Bots */}
          <ActiveBots bots={bots} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* System Health */}
          <SystemHealth health={health} />

          {/* Recent Insights */}
          <RecentInsights insights={insights} />
        </div>
      </div>

      {/* TIME Status Footer */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Last Evolution Cycle:</span>
              <span className="text-sm text-white">2 minutes ago</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Active Strategies:</span>
              <span className="text-sm text-white">7</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Risk Status:</span>
              <span className="text-sm text-green-400">Normal</span>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            TIME is learning and evolving continuously
          </div>
        </div>
      </div>
    </div>
  );
}

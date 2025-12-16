'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Server,
  Zap,
  Brain,
  Bot,
  Shield,
  TrendingUp,
  Users,
  Bell,
  Gauge,
  Eye
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = 'https://time-backend-hosting.fly.dev';

interface ComponentHealth {
  name: string;
  status: 'online' | 'degraded' | 'offline' | 'building';
}

interface HealthResponse {
  status: string;
  timestamp: string;
  evolutionMode: string;
  currentRegime: string;
  components: ComponentHealth[];
}

interface AdminStatusResponse {
  evolution: {
    mode: string;
    lastModeChange: string;
  };
  health: string;
  components: number;
  activeComponents: number;
  timestamp: string;
}

const componentIcons: Record<string, typeof Activity> = {
  'EvolutionController': Shield,
  'InactivityMonitor': Gauge,
  'LearningEngine': Brain,
  'RiskEngine': AlertTriangle,
  'RegimeDetector': TrendingUp,
  'RecursiveSynthesisEngine': Zap,
  'MarketVisionEngine': Eye,
  'TeachingEngine': Brain,
  'AttributionEngine': Activity,
  'BotManager': Bot,
  'BotIngestion': Bot,
  'ConsentManager': Users,
  'NotificationService': Bell,
  'Database (MongoDB)': Database,
  'Cache (Redis)': Server,
  'WebSocket Server': Server,
};

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [statusData, setStatusData] = useState<AdminStatusResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    try {
      setError(null);

      // Fetch health status from /health endpoint
      const healthRes = await fetch(`${API_BASE}/health`);

      if (!healthRes.ok) {
        throw new Error(`Health API returned ${healthRes.status}`);
      }

      const healthResponse: HealthResponse = await healthRes.json();
      setHealthData(healthResponse);

    } catch (err: any) {
      console.error('Failed to fetch health data:', err);
      setError(err.message);
    }
  };

  const fetchStatusData = async () => {
    try {
      // Fetch admin status from /api/v1/admin/status endpoint
      const statusRes = await fetch(`${API_BASE}/api/v1/admin/status`);

      if (!statusRes.ok) {
        throw new Error(`Status API returned ${statusRes.status}`);
      }

      const statusResponse: AdminStatusResponse = await statusRes.json();
      setStatusData(statusResponse);

    } catch (err: any) {
      console.error('Failed to fetch status data:', err);
      // Don't overwrite health error
      if (!error) {
        setError(err.message);
      }
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHealthData(), fetchStatusData()]);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    // Initial fetch
    refreshData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    refreshData();
  };

  // Calculate component counts
  const components = healthData?.components || [];
  const healthyCount = components.filter(c => c.status === 'online').length;
  const warningCount = components.filter(c => c.status === 'degraded').length;
  const errorCount = components.filter(c => c.status === 'offline').length;
  const buildingCount = components.filter(c => c.status === 'building').length;

  // Calculate uptime based on active vs total components
  const totalComponents = statusData?.components || 0;
  const activeComponents = statusData?.activeComponents || 0;
  const uptimePercentage = totalComponents > 0
    ? ((activeComponents / totalComponents) * 100).toFixed(2)
    : '0.00';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'building': return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
      default: return <XCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const overallHealth = statusData?.health || healthData?.status || 'unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-slate-400">Monitor all TIME components and infrastructure</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card p-4 bg-red-500/10 border-red-500/30">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Error Loading Health Data</p>
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Healthy</p>
              <p className="text-xl font-bold text-green-400">{healthyCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Warning</p>
              <p className="text-xl font-bold text-yellow-400">{warningCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Error</p>
              <p className="text-xl font-bold text-red-400">{errorCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-time-primary/10">
              <Activity className="w-5 h-5 text-time-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Uptime</p>
              <p className="text-xl font-bold text-white">{uptimePercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Evolution & Regime Status */}
      {healthData && statusData && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">TIME System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-time-primary" />
                <p className="text-sm text-slate-400">Evolution Mode</p>
              </div>
              <p className="text-xl font-bold text-white capitalize">{healthData.evolutionMode}</p>
              <p className="text-xs text-slate-500 mt-1">
                Last changed: {new Date(statusData.evolution.lastModeChange).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <p className="text-sm text-slate-400">Current Regime</p>
              </div>
              <p className="text-xl font-bold text-blue-400 capitalize">
                {healthData.currentRegime || 'Unknown'}
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-green-400" />
                <p className="text-sm text-slate-400">Active Components</p>
              </div>
              <p className="text-xl font-bold text-white">
                {statusData.activeComponents} / {statusData.components}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Components Grid */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Component Status</h3>
        {components.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            {error ? 'Failed to load components' : 'Loading components...'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {components.map((component) => {
              const Icon = componentIcons[component.name] || Activity;

              return (
                <div
                  key={component.name}
                  className={clsx(
                    'p-4 rounded-lg border transition-colors',
                    component.status === 'online'
                      ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                      : component.status === 'degraded'
                      ? 'bg-yellow-500/5 border-yellow-500/30'
                      : component.status === 'building'
                      ? 'bg-blue-500/5 border-blue-500/30'
                      : 'bg-red-500/5 border-red-500/30'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'p-2 rounded-lg',
                        component.status === 'online' ? 'bg-slate-700' :
                        component.status === 'degraded' ? 'bg-yellow-500/20' :
                        component.status === 'building' ? 'bg-blue-500/20' : 'bg-red-500/20'
                      )}>
                        <Icon className={clsx(
                          'w-4 h-4',
                          component.status === 'online' ? 'text-slate-300' :
                          component.status === 'degraded' ? 'text-yellow-400' :
                          component.status === 'building' ? 'text-blue-400' : 'text-red-400'
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{component.name}</p>
                        <p className={clsx(
                          'text-xs capitalize',
                          component.status === 'online' ? 'text-green-400' :
                          component.status === 'degraded' ? 'text-yellow-400' :
                          component.status === 'building' ? 'text-blue-400' : 'text-red-400'
                        )}>
                          {component.status}
                        </p>
                      </div>
                    </div>
                    {getStatusIcon(component.status)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overall Health Status */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Overall System Health</h3>
        <div className={clsx(
          'p-6 rounded-lg text-center',
          overallHealth === 'healthy' || overallHealth === 'ok' ? 'bg-green-500/10 border border-green-500/30' :
          overallHealth === 'degraded' ? 'bg-yellow-500/10 border border-yellow-500/30' :
          overallHealth === 'unhealthy' ? 'bg-red-500/10 border border-red-500/30' :
          'bg-slate-800/50'
        )}>
          <div className="flex items-center justify-center gap-3 mb-2">
            {(overallHealth === 'healthy' || overallHealth === 'ok') && <CheckCircle className="w-8 h-8 text-green-400" />}
            {overallHealth === 'degraded' && <AlertTriangle className="w-8 h-8 text-yellow-400" />}
            {overallHealth === 'unhealthy' && <XCircle className="w-8 h-8 text-red-400" />}
            {overallHealth === 'unknown' && <Activity className="w-8 h-8 text-slate-400" />}
            <p className={clsx(
              'text-2xl font-bold capitalize',
              overallHealth === 'healthy' || overallHealth === 'ok' ? 'text-green-400' :
              overallHealth === 'degraded' ? 'text-yellow-400' :
              overallHealth === 'unhealthy' ? 'text-red-400' :
              'text-slate-400'
            )}>
              {overallHealth}
            </p>
          </div>
          <p className="text-sm text-slate-400">
            {healthyCount} of {components.length} components operational
          </p>
          {healthData && (
            <p className="text-xs text-slate-500 mt-2">
              Last updated: {new Date(healthData.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Cpu,
  Activity,
  HardDrive,
  Wifi,
  Clock,
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
  TrendingUp
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = 'https://time-backend-hosting.fly.dev';

interface ComponentHealth {
  component: string;
  status: 'online' | 'degraded' | 'offline' | 'building';
  lastCheck: Date;
  metrics: Record<string, number>;
  uptime?: number;
  responseTime?: number;
  details?: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

interface HealthResponse {
  overall: string;
  components: ComponentHealth[];
  timestamp: string;
}

interface MetricsResponse {
  governor: {
    totalBotsAbsorbed: number;
    totalTradesAnalyzed: number;
    totalInsightsGenerated: number;
    totalStrategiesSynthesized: number;
    uptime: number;
    lastEvolutionCycle: string;
  };
  learning: {
    recentInsightsCount: number;
  };
  risk: {
    emergencyBrakeActive: boolean;
    dailyPnL: number;
    openPositions: number;
  };
  regime: {
    current: string;
    confidence: number;
    duration: number;
  };
  components: number;
  healthyComponents: number;
  timestamp: string;
}

const componentIcons: Record<string, typeof Cpu> = {
  'TIME Governor': Shield,
  'Learning Engine': Brain,
  'Risk Engine': AlertTriangle,
  'Regime Detector': TrendingUp,
  'Recursive Synthesis': Zap,
  'Market Vision': Activity,
  'Teaching Engine': Brain,
  'Attribution Engine': Activity,
  'Bot Manager': Bot,
  'Bot Ingestion': Bot,
  'Notification Service': Wifi,
  'Database (MongoDB)': Database,
  'Cache (Redis)': HardDrive,
  'WebSocket Server': Server,
};

export default function SystemHealthPage() {
  const [components, setComponents] = useState<ComponentHealth[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<MetricsResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [overallHealth, setOverallHealth] = useState<string>('unknown');

  const fetchHealthData = async () => {
    try {
      setError(null);

      // Fetch health status
      const healthRes = await fetch(`${API_BASE}/api/admin/health`, {
        credentials: 'include',
      });

      if (!healthRes.ok) {
        throw new Error(`Health API returned ${healthRes.status}`);
      }

      const healthData: HealthResponse = await healthRes.json();

      // Convert lastCheck strings to Date objects
      const componentsWithDates = healthData.components.map(comp => ({
        ...comp,
        lastCheck: new Date(comp.lastCheck),
        uptime: comp.metrics.uptime || 99.9,
        responseTime: comp.metrics.responseTime || comp.metrics.latency || 0,
      }));

      setComponents(componentsWithDates);
      setOverallHealth(healthData.overall);

    } catch (err: any) {
      console.error('Failed to fetch health data:', err);
      setError(err.message);
    }
  };

  const fetchMetrics = async () => {
    try {
      // Fetch system metrics
      const metricsRes = await fetch(`${API_BASE}/api/admin/metrics`, {
        credentials: 'include',
      });

      if (!metricsRes.ok) {
        throw new Error(`Metrics API returned ${metricsRes.status}`);
      }

      const metricsData: MetricsResponse = await metricsRes.json();
      setSystemMetrics(metricsData);

      // Extract CPU, memory, disk metrics from components
      // Check if any component has these metrics
      const cpuMetrics = components
        .map(c => c.metrics.cpu)
        .filter(v => v !== undefined);
      const memoryMetrics = components
        .map(c => c.metrics.memory)
        .filter(v => v !== undefined);
      const diskMetrics = components
        .map(c => c.metrics.disk)
        .filter(v => v !== undefined);

      // Calculate averages or use defaults
      setMetrics({
        cpu: cpuMetrics.length > 0 ? Math.round(cpuMetrics.reduce((a, b) => a + b, 0) / cpuMetrics.length) : 0,
        memory: memoryMetrics.length > 0 ? Math.round(memoryMetrics.reduce((a, b) => a + b, 0) / memoryMetrics.length) : 0,
        disk: diskMetrics.length > 0 ? Math.round(diskMetrics.reduce((a, b) => a + b, 0) / diskMetrics.length) : 0,
        network: 0, // Network metrics would need separate endpoint
      });

    } catch (err: any) {
      console.error('Failed to fetch metrics:', err);
      // Don't overwrite health error
      if (!error) {
        setError(err.message);
      }
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHealthData(), fetchMetrics()]);
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
  }, []); // Empty dependency to avoid re-creating interval

  // Re-fetch metrics when components change
  useEffect(() => {
    if (components.length > 0) {
      fetchMetrics();
    }
  }, [components]);

  const handleRefresh = () => {
    refreshData();
  };

  const healthyCount = components.filter(c => c.status === 'online').length;
  const warningCount = components.filter(c => c.status === 'degraded').length;
  const errorCount = components.filter(c => c.status === 'offline').length;
  const buildingCount = components.filter(c => c.status === 'building').length;

  // Calculate overall uptime from components
  const avgUptime = components.length > 0
    ? (components.reduce((sum, c) => sum + (c.uptime || 0), 0) / components.length).toFixed(2)
    : '0.00';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'building': return <Clock className="w-4 h-4 text-blue-400" />;
      default: return <XCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'degraded': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'offline': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'building': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

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
              <p className="text-xl font-bold text-white">{avgUptime}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">System Resources</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'CPU Usage', value: metrics.cpu, icon: Cpu, color: 'text-blue-400' },
              { label: 'Memory Usage', value: metrics.memory, icon: HardDrive, color: 'text-purple-400' },
              { label: 'Disk Usage', value: metrics.disk, icon: Database, color: 'text-green-400' },
              { label: 'Network I/O', value: metrics.network, icon: Wifi, color: 'text-orange-400' },
            ].map((metric) => {
              const Icon = metric.icon;
              const isWarning = metric.value > 80;
              const isError = metric.value > 90;

              return (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={clsx('w-4 h-4', metric.color)} />
                      <span className="text-sm text-slate-400">{metric.label}</span>
                    </div>
                    <span className={clsx(
                      'text-sm font-medium',
                      isError ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'
                    )}>
                      {metric.value}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        isError ? 'bg-red-400' : isWarning ? 'bg-yellow-400' : 'bg-gradient-to-r from-time-primary to-time-secondary'
                      )}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* System Stats from Metrics */}
      {systemMetrics && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">TIME Governor Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">Bots Absorbed</p>
              <p className="text-2xl font-bold text-white">{systemMetrics.governor.totalBotsAbsorbed}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">Trades Analyzed</p>
              <p className="text-2xl font-bold text-white">{systemMetrics.governor.totalTradesAnalyzed}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">Insights Generated</p>
              <p className="text-2xl font-bold text-white">{systemMetrics.governor.totalInsightsGenerated}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">Strategies Synthesized</p>
              <p className="text-2xl font-bold text-white">{systemMetrics.governor.totalStrategiesSynthesized}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">Market Regime</p>
              <p className="text-lg font-bold text-time-primary capitalize">{systemMetrics.regime.current}</p>
              <p className="text-xs text-slate-500">Confidence: {(systemMetrics.regime.confidence * 100).toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">Emergency Brake</p>
              <p className={clsx(
                'text-lg font-bold',
                systemMetrics.risk.emergencyBrakeActive ? 'text-red-400' : 'text-green-400'
              )}>
                {systemMetrics.risk.emergencyBrakeActive ? 'ACTIVE' : 'Inactive'}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">Open Positions</p>
              <p className="text-lg font-bold text-white">{systemMetrics.risk.openPositions}</p>
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
              const Icon = componentIcons[component.component] || Activity;

              return (
                <div
                  key={component.component}
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
                  <div className="flex items-start justify-between mb-3">
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
                        <p className="text-sm font-medium text-white">{component.component}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(component.lastCheck).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {getStatusIcon(component.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500">Uptime</p>
                      <p className={clsx(
                        'font-medium',
                        (component.uptime || 0) >= 99.9 ? 'text-green-400' :
                        (component.uptime || 0) >= 99 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {(component.uptime || 0).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Response</p>
                      <p className={clsx(
                        'font-medium',
                        (component.responseTime || 0) < 100 ? 'text-green-400' :
                        (component.responseTime || 0) < 500 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {(component.responseTime || 0).toFixed(0)}ms
                      </p>
                    </div>
                  </div>

                  {component.details && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className={clsx(
                        'text-xs',
                        component.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {component.details}
                      </p>
                    </div>
                  )}
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
          overallHealth === 'healthy' ? 'bg-green-500/10 border border-green-500/30' :
          overallHealth === 'degraded' ? 'bg-yellow-500/10 border border-yellow-500/30' :
          overallHealth === 'unhealthy' ? 'bg-red-500/10 border border-red-500/30' :
          'bg-slate-800/50'
        )}>
          <div className="flex items-center justify-center gap-3 mb-2">
            {overallHealth === 'healthy' && <CheckCircle className="w-8 h-8 text-green-400" />}
            {overallHealth === 'degraded' && <AlertTriangle className="w-8 h-8 text-yellow-400" />}
            {overallHealth === 'unhealthy' && <XCircle className="w-8 h-8 text-red-400" />}
            {overallHealth === 'unknown' && <Activity className="w-8 h-8 text-slate-400" />}
            <p className={clsx(
              'text-2xl font-bold capitalize',
              overallHealth === 'healthy' ? 'text-green-400' :
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
        </div>
      </div>
    </div>
  );
}

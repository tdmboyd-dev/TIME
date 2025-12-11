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

interface ComponentHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  uptime: number; // percentage
  responseTime: number; // ms
  lastCheck: Date;
  details?: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

const mockComponents: ComponentHealth[] = [
  { name: 'TIME Governor', status: 'healthy', uptime: 99.99, responseTime: 12, lastCheck: new Date() },
  { name: 'Learning Engine', status: 'healthy', uptime: 99.95, responseTime: 45, lastCheck: new Date() },
  { name: 'Risk Engine', status: 'healthy', uptime: 99.99, responseTime: 8, lastCheck: new Date() },
  { name: 'Regime Detector', status: 'healthy', uptime: 99.92, responseTime: 156, lastCheck: new Date() },
  { name: 'Recursive Synthesis', status: 'warning', uptime: 98.5, responseTime: 892, lastCheck: new Date(), details: 'High latency detected' },
  { name: 'Market Vision', status: 'healthy', uptime: 99.87, responseTime: 234, lastCheck: new Date() },
  { name: 'Teaching Engine', status: 'healthy', uptime: 99.95, responseTime: 67, lastCheck: new Date() },
  { name: 'Attribution Engine', status: 'healthy', uptime: 99.91, responseTime: 34, lastCheck: new Date() },
  { name: 'Bot Manager', status: 'healthy', uptime: 99.98, responseTime: 23, lastCheck: new Date() },
  { name: 'Bot Ingestion', status: 'healthy', uptime: 99.85, responseTime: 456, lastCheck: new Date() },
  { name: 'Notification Service', status: 'healthy', uptime: 99.99, responseTime: 89, lastCheck: new Date() },
  { name: 'Database (MongoDB)', status: 'healthy', uptime: 99.99, responseTime: 15, lastCheck: new Date() },
  { name: 'Cache (Redis)', status: 'healthy', uptime: 99.99, responseTime: 2, lastCheck: new Date() },
  { name: 'WebSocket Server', status: 'healthy', uptime: 99.97, responseTime: 5, lastCheck: new Date() },
];

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
  const [components, setComponents] = useState<ComponentHealth[]>(mockComponents);
  const [metrics, setMetrics] = useState<SystemMetrics>({ cpu: 34, memory: 62, disk: 45, network: 78 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate metric updates
      setMetrics({
        cpu: Math.floor(Math.random() * 40) + 20,
        memory: Math.floor(Math.random() * 30) + 50,
        disk: Math.floor(Math.random() * 10) + 40,
        network: Math.floor(Math.random() * 50) + 40,
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setIsRefreshing(false);
    }, 1500);
  };

  const healthyCount = components.filter(c => c.status === 'healthy').length;
  const warningCount = components.filter(c => c.status === 'warning').length;
  const errorCount = components.filter(c => c.status === 'error').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <XCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
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
              <p className="text-xl font-bold text-white">99.95%</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
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

      {/* Components Grid */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Component Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((component) => {
            const Icon = componentIcons[component.name] || Activity;

            return (
              <div
                key={component.name}
                className={clsx(
                  'p-4 rounded-lg border transition-colors',
                  component.status === 'healthy'
                    ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                    : component.status === 'warning'
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : 'bg-red-500/5 border-red-500/30'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'p-2 rounded-lg',
                      component.status === 'healthy' ? 'bg-slate-700' :
                      component.status === 'warning' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                    )}>
                      <Icon className={clsx(
                        'w-4 h-4',
                        component.status === 'healthy' ? 'text-slate-300' :
                        component.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{component.name}</p>
                      <p className="text-xs text-slate-500">
                        {component.lastCheck.toLocaleTimeString()}
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
                      component.uptime >= 99.9 ? 'text-green-400' :
                      component.uptime >= 99 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {component.uptime}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Response</p>
                    <p className={clsx(
                      'font-medium',
                      component.responseTime < 100 ? 'text-green-400' :
                      component.responseTime < 500 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {component.responseTime}ms
                    </p>
                  </div>
                </div>

                {component.details && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className={clsx(
                      'text-xs',
                      component.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {component.details}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Events */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Recent System Events</h3>
        <div className="space-y-2">
          {[
            { time: '2 min ago', event: 'Health check completed - all systems operational', type: 'info' },
            { time: '5 min ago', event: 'Recursive Synthesis Engine: High latency warning (892ms)', type: 'warning' },
            { time: '15 min ago', event: 'Database backup completed successfully', type: 'success' },
            { time: '30 min ago', event: 'WebSocket reconnection - 1 client restored', type: 'info' },
            { time: '1 hour ago', event: 'Memory cleanup executed - 512MB freed', type: 'success' },
          ].map((event, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
            >
              {event.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
              {event.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
              {event.type === 'info' && <Activity className="w-4 h-4 text-blue-400 flex-shrink-0" />}
              <span className="text-sm text-slate-300 flex-1">{event.event}</span>
              <span className="text-xs text-slate-500">{event.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface HealthItem {
  component: string;
  status: string;
}

interface SystemHealthProps {
  health: HealthItem[];
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  healthy: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  running: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  active: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  warning: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  degraded: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  offline: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  initializing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
};

const defaultHealth: HealthItem[] = [
  { component: 'TIME Governor', status: 'healthy' },
  { component: 'Learning Engine', status: 'active' },
  { component: 'Risk Engine', status: 'healthy' },
  { component: 'Regime Detector', status: 'running' },
  { component: 'Market Vision', status: 'active' },
  { component: 'Bot Manager', status: 'healthy' },
  { component: 'Teaching Engine', status: 'running' },
  { component: 'Attribution Engine', status: 'healthy' },
];

export function SystemHealth({ health }: SystemHealthProps) {
  const displayHealth = health.length > 0 ? health : defaultHealth;

  const healthySystems = displayHealth.filter(h =>
    ['healthy', 'running', 'active'].includes(h.status.toLowerCase())
  ).length;

  const totalSystems = displayHealth.length;
  const healthPercentage = Math.round((healthySystems / totalSystems) * 100);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">System Health</h3>
        <span className={clsx(
          'text-xs font-medium px-2 py-0.5 rounded-full',
          healthPercentage === 100 ? 'bg-green-500/20 text-green-400' :
          healthPercentage >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        )}>
          {healthPercentage}% Operational
        </span>
      </div>

      <div className="space-y-2">
        {displayHealth.map((item) => {
          const status = item.status.toLowerCase();
          const config = statusConfig[status] || statusConfig.healthy;
          const Icon = config.icon;
          const isLoading = status === 'initializing';

          return (
            <div
              key={item.component}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-sm text-slate-300">{item.component}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 capitalize">{item.status}</span>
                <div className={clsx('p-1 rounded', config.bg)}>
                  <Icon className={clsx('w-3.5 h-3.5', config.color, isLoading && 'animate-spin')} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">All Systems</span>
          <span className="text-slate-300">{healthySystems}/{totalSystems} Online</span>
        </div>
        <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              healthPercentage === 100 ? 'bg-green-400' :
              healthPercentage >= 80 ? 'bg-yellow-400' : 'bg-red-400'
            )}
            style={{ width: `${healthPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import { Lightbulb, TrendingUp, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface Insight {
  id: string;
  category: string;
  insight: string;
  confidence: number;
  actionable: boolean;
  createdAt: Date;
}

interface RecentInsightsProps {
  insights: Insight[];
}

const categoryConfig: Record<string, { icon: typeof Lightbulb; color: string }> = {
  pattern: { icon: TrendingUp, color: 'text-blue-400' },
  anomaly: { icon: AlertTriangle, color: 'text-yellow-400' },
  opportunity: { icon: Lightbulb, color: 'text-green-400' },
  risk: { icon: AlertTriangle, color: 'text-red-400' },
  default: { icon: Info, color: 'text-slate-400' },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function RecentInsights({ insights }: RecentInsightsProps) {
  const displayInsights = insights.length > 0 ? insights.slice(0, 5) : [
    {
      id: '1',
      category: 'pattern',
      insight: 'Detected bullish divergence on BTC/USD 4H timeframe',
      confidence: 85,
      actionable: true,
      createdAt: new Date(Date.now() - 300000),
    },
    {
      id: '2',
      category: 'opportunity',
      insight: 'High probability setup forming on ETH/USD',
      confidence: 72,
      actionable: true,
      createdAt: new Date(Date.now() - 900000),
    },
    {
      id: '3',
      category: 'anomaly',
      insight: 'Unusual volume spike detected in SPY options',
      confidence: 68,
      actionable: false,
      createdAt: new Date(Date.now() - 1800000),
    },
  ];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Recent Insights</h3>
        <span className="text-xs text-slate-400">{displayInsights.length} new</span>
      </div>

      <div className="space-y-3">
        {displayInsights.map((insight) => {
          const config = categoryConfig[insight.category] || categoryConfig.default;
          const Icon = config.icon;

          return (
            <div
              key={insight.id}
              className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={clsx('p-1.5 rounded-lg bg-slate-700/50', config.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 line-clamp-2">{insight.insight}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(insight.createdAt)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {insight.confidence}% confidence
                    </span>
                    {insight.actionable && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Actionable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayInsights.length > 0 && (
        <button className="w-full mt-4 py-2 text-sm text-time-primary hover:text-time-primary/80 transition-colors">
          View All Insights →
        </button>
      )}
    </div>
  );
}

'use client';

import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Moon, Zap } from 'lucide-react';
import clsx from 'clsx';

interface RegimeIndicatorProps {
  regime: string;
  confidence: number;
}

const regimeConfig: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  trending_up: { icon: TrendingUp, color: 'text-green-400 bg-green-400/10', label: 'Trending Up' },
  trending_down: { icon: TrendingDown, color: 'text-red-400 bg-red-400/10', label: 'Trending Down' },
  ranging: { icon: Minus, color: 'text-blue-400 bg-blue-400/10', label: 'Ranging' },
  high_volatility: { icon: Activity, color: 'text-orange-400 bg-orange-400/10', label: 'High Volatility' },
  low_volatility: { icon: Activity, color: 'text-slate-400 bg-slate-400/10', label: 'Low Volatility' },
  event_driven: { icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-400/10', label: 'Event Driven' },
  overnight_illiquid: { icon: Moon, color: 'text-purple-400 bg-purple-400/10', label: 'Overnight/Illiquid' },
  sentiment_shift: { icon: Zap, color: 'text-cyan-400 bg-cyan-400/10', label: 'Sentiment Shift' },
  unknown: { icon: Minus, color: 'text-slate-500 bg-slate-500/10', label: 'Unknown' },
};

export function RegimeIndicator({ regime, confidence }: RegimeIndicatorProps) {
  const config = regimeConfig[regime] || regimeConfig.unknown;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg', config.color)}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              confidence >= 80 ? 'bg-green-400' :
              confidence >= 60 ? 'bg-yellow-400' :
              confidence >= 40 ? 'bg-orange-400' : 'bg-red-400'
            )}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-xs text-slate-400">{confidence}%</span>
      </div>
    </div>
  );
}

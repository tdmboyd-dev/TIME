'use client';

import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  color?: 'primary' | 'success' | 'accent' | 'secondary' | 'danger';
}

const colorClasses = {
  primary: {
    bg: 'bg-time-primary/10',
    border: 'border-time-primary/30',
    icon: 'text-time-primary',
    gradient: 'from-time-primary/20 to-transparent',
  },
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    gradient: 'from-green-500/20 to-transparent',
  },
  accent: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    gradient: 'from-purple-500/20 to-transparent',
  },
  secondary: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: 'text-orange-400',
    gradient: 'from-orange-500/20 to-transparent',
  },
  danger: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    gradient: 'from-red-500/20 to-transparent',
  },
};

export function StatsCard({ title, value, icon: Icon, trend, color = 'primary' }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={clsx('card p-4 relative overflow-hidden', colors.border)}>
      {/* Background gradient */}
      <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-50', colors.gradient)} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={clsx('p-2 rounded-lg', colors.bg)}>
            <Icon className={clsx('w-5 h-5', colors.icon)} />
          </div>
          {trend !== undefined && (
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              trend >= 0
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            )}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>

        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

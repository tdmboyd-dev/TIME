'use client';

import { Bot, TrendingUp, TrendingDown, Pause, Play, MoreVertical } from 'lucide-react';
import clsx from 'clsx';

interface BotData {
  id: string;
  name: string;
  source: string;
  status: string;
  performance: {
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    totalPnL: number;
  };
}

interface ActiveBotsProps {
  bots: BotData[];
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  running: 'bg-green-500',
  paused: 'bg-yellow-500',
  stopped: 'bg-slate-500',
  error: 'bg-red-500',
};

const defaultBots: BotData[] = [
  {
    id: '1',
    name: 'Trend Follower Alpha',
    source: 'github',
    status: 'active',
    performance: {
      winRate: 68.5,
      profitFactor: 2.34,
      totalTrades: 156,
      totalPnL: 4523.87,
    },
  },
  {
    id: '2',
    name: 'Mean Reversion Bot',
    source: 'mql5',
    status: 'active',
    performance: {
      winRate: 72.1,
      profitFactor: 1.89,
      totalTrades: 234,
      totalPnL: 3218.45,
    },
  },
  {
    id: '3',
    name: 'Scalper Pro V2',
    source: 'user_uploaded',
    status: 'paused',
    performance: {
      winRate: 61.3,
      profitFactor: 1.45,
      totalTrades: 892,
      totalPnL: 1876.23,
    },
  },
  {
    id: '4',
    name: 'Momentum Hunter',
    source: 'synthesized',
    status: 'active',
    performance: {
      winRate: 58.9,
      profitFactor: 1.67,
      totalTrades: 78,
      totalPnL: 2145.67,
    },
  },
];

export function ActiveBots({ bots }: ActiveBotsProps) {
  const displayBots = bots.length > 0 ? bots : defaultBots;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Active Bots</h3>
        <button className="text-sm text-time-primary hover:text-time-primary/80 transition-colors">
          View All →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700/50">
              <th className="pb-3 font-medium">Bot</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Win Rate</th>
              <th className="pb-3 font-medium">P/F</th>
              <th className="pb-3 font-medium">Trades</th>
              <th className="pb-3 font-medium text-right">P&L</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {displayBots.map((bot) => (
              <tr
                key={bot.id}
                className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
              >
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800">
                      <Bot className="w-4 h-4 text-time-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{bot.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{bot.source.replace('_', ' ')}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'w-2 h-2 rounded-full',
                      statusColors[bot.status] || 'bg-slate-500'
                    )} />
                    <span className="text-slate-300 capitalize">{bot.status}</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className={clsx(
                    'font-medium',
                    bot.performance.winRate >= 60 ? 'text-green-400' :
                    bot.performance.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {bot.performance.winRate.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3">
                  <span className={clsx(
                    'font-medium',
                    bot.performance.profitFactor >= 2 ? 'text-green-400' :
                    bot.performance.profitFactor >= 1.5 ? 'text-yellow-400' : 'text-slate-300'
                  )}>
                    {bot.performance.profitFactor.toFixed(2)}
                  </span>
                </td>
                <td className="py-3 text-slate-300">
                  {bot.performance.totalTrades}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {bot.performance.totalPnL >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={clsx(
                      'font-medium',
                      bot.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      ${Math.abs(bot.performance.totalPnL).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-slate-700 transition-colors">
                      {bot.status === 'paused' ? (
                        <Play className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Pause className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button className="p-1.5 rounded hover:bg-slate-700 transition-colors">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {displayBots.filter(b => b.status === 'active' || b.status === 'running').length} bots running
        </span>
        <span className="text-green-400 font-medium">
          Total P&L: ${displayBots.reduce((sum, b) => sum + b.performance.totalPnL, 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}

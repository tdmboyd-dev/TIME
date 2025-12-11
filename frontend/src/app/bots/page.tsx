'use client';

import { useState } from 'react';
import {
  Bot,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Play,
  Pause,
  Trash2,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  ExternalLink,
  Github,
  Globe
} from 'lucide-react';
import clsx from 'clsx';

interface BotData {
  id: string;
  name: string;
  description: string;
  source: 'github' | 'mql5' | 'user_uploaded' | 'synthesized' | 'ctrader';
  status: 'active' | 'paused' | 'stopped' | 'analyzing' | 'training';
  rating: number;
  performance: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalTrades: number;
    totalPnL: number;
  };
  absorbed: boolean;
  createdAt: Date;
  lastActive: Date;
}

const mockBots: BotData[] = [
  {
    id: '1',
    name: 'Trend Follower Alpha',
    description: 'Multi-timeframe trend following strategy with dynamic position sizing',
    source: 'github',
    status: 'active',
    rating: 4.7,
    performance: {
      winRate: 68.5,
      profitFactor: 2.34,
      maxDrawdown: 12.3,
      sharpeRatio: 1.89,
      totalTrades: 1256,
      totalPnL: 45238.67,
    },
    absorbed: true,
    createdAt: new Date('2024-01-15'),
    lastActive: new Date(),
  },
  {
    id: '2',
    name: 'Mean Reversion Master',
    description: 'Statistical arbitrage bot using Bollinger Bands and RSI',
    source: 'mql5',
    status: 'active',
    rating: 4.5,
    performance: {
      winRate: 72.1,
      profitFactor: 1.89,
      maxDrawdown: 8.7,
      sharpeRatio: 2.12,
      totalTrades: 2341,
      totalPnL: 32184.52,
    },
    absorbed: true,
    createdAt: new Date('2024-02-20'),
    lastActive: new Date(),
  },
  {
    id: '3',
    name: 'Scalper Pro V2',
    description: 'High-frequency scalping bot for volatile markets',
    source: 'user_uploaded',
    status: 'paused',
    rating: 4.2,
    performance: {
      winRate: 61.3,
      profitFactor: 1.45,
      maxDrawdown: 18.2,
      sharpeRatio: 1.23,
      totalTrades: 8924,
      totalPnL: 18762.34,
    },
    absorbed: false,
    createdAt: new Date('2024-03-10'),
    lastActive: new Date(Date.now() - 86400000),
  },
  {
    id: '4',
    name: 'TIME Synthesis #47',
    description: 'Auto-generated strategy combining momentum and mean reversion',
    source: 'synthesized',
    status: 'training',
    rating: 0,
    performance: {
      winRate: 64.8,
      profitFactor: 1.78,
      maxDrawdown: 10.5,
      sharpeRatio: 1.67,
      totalTrades: 234,
      totalPnL: 5678.90,
    },
    absorbed: false,
    createdAt: new Date(),
    lastActive: new Date(),
  },
  {
    id: '5',
    name: 'Breakout Hunter',
    description: 'Identifies and trades key support/resistance breakouts',
    source: 'ctrader',
    status: 'analyzing',
    rating: 4.3,
    performance: {
      winRate: 55.2,
      profitFactor: 2.12,
      maxDrawdown: 15.8,
      sharpeRatio: 1.45,
      totalTrades: 567,
      totalPnL: 12345.67,
    },
    absorbed: false,
    createdAt: new Date('2024-04-05'),
    lastActive: new Date(Date.now() - 3600000),
  },
];

const sourceIcons: Record<string, typeof Github> = {
  github: Github,
  mql5: Globe,
  user_uploaded: Upload,
  synthesized: Activity,
  ctrader: TrendingUp,
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400' },
  paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  stopped: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  analyzing: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  training: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

export default function BotsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedBots, setSelectedBots] = useState<string[]>([]);

  const filteredBots = mockBots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === 'all' || bot.source === filterSource;
    const matchesStatus = filterStatus === 'all' || bot.status === filterStatus;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const toggleBotSelection = (botId: string) => {
    setSelectedBots(prev =>
      prev.includes(botId)
        ? prev.filter(id => id !== botId)
        : [...prev, botId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bot Management</h1>
          <p className="text-slate-400">Manage, analyze, and absorb trading bots</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Import
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Bot
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-slate-400">Total Bots</p>
          <p className="text-2xl font-bold text-white">{mockBots.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-400">Active</p>
          <p className="text-2xl font-bold text-green-400">
            {mockBots.filter(b => b.status === 'active').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-400">Absorbed</p>
          <p className="text-2xl font-bold text-purple-400">
            {mockBots.filter(b => b.absorbed).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-400">Total P&L</p>
          <p className="text-2xl font-bold text-green-400">
            ${mockBots.reduce((sum, b) => sum + b.performance.totalPnL, 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-time-primary/50"
            />
          </div>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="all">All Sources</option>
            <option value="github">GitHub</option>
            <option value="mql5">MQL5</option>
            <option value="ctrader">cTrader</option>
            <option value="user_uploaded">User Uploaded</option>
            <option value="synthesized">Synthesized</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="training">Training</option>
            <option value="analyzing">Analyzing</option>
            <option value="stopped">Stopped</option>
          </select>

          {selectedBots.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                {selectedBots.length} selected
              </span>
              <button className="btn-secondary text-sm py-1.5">
                <Play className="w-4 h-4" />
              </button>
              <button className="btn-secondary text-sm py-1.5">
                <Pause className="w-4 h-4" />
              </button>
              <button className="btn-secondary text-sm py-1.5 text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredBots.map((bot) => {
          const SourceIcon = sourceIcons[bot.source] || Globe;
          const statusStyle = statusColors[bot.status] || statusColors.stopped;

          return (
            <div
              key={bot.id}
              className={clsx(
                'card p-4 cursor-pointer transition-all',
                selectedBots.includes(bot.id) && 'ring-2 ring-time-primary'
              )}
              onClick={() => toggleBotSelection(bot.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-800">
                    <Bot className="w-5 h-5 text-time-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{bot.name}</h3>
                      {bot.absorbed && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                          Absorbed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SourceIcon className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-500 capitalize">
                        {bot.source.replace('_', ' ')}
                      </span>
                      {bot.rating > 0 && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-yellow-400">★ {bot.rating}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className={clsx(
                  'px-2.5 py-1 text-xs font-medium rounded-full capitalize',
                  statusStyle.bg,
                  statusStyle.text
                )}>
                  {bot.status}
                </span>
              </div>

              <p className="text-sm text-slate-400 mb-4 line-clamp-1">
                {bot.description}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Win Rate</p>
                  <p className={clsx(
                    'text-sm font-semibold',
                    bot.performance.winRate >= 60 ? 'text-green-400' :
                    bot.performance.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {bot.performance.winRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Profit Factor</p>
                  <p className={clsx(
                    'text-sm font-semibold',
                    bot.performance.profitFactor >= 2 ? 'text-green-400' :
                    bot.performance.profitFactor >= 1.5 ? 'text-yellow-400' : 'text-slate-300'
                  )}>
                    {bot.performance.profitFactor.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sharpe Ratio</p>
                  <p className={clsx(
                    'text-sm font-semibold',
                    bot.performance.sharpeRatio >= 2 ? 'text-green-400' :
                    bot.performance.sharpeRatio >= 1 ? 'text-yellow-400' : 'text-slate-300'
                  )}>
                    {bot.performance.sharpeRatio.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{bot.performance.totalTrades.toLocaleString()} trades</span>
                  <span className="flex items-center gap-1">
                    {bot.performance.totalPnL >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span className={bot.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                      ${Math.abs(bot.performance.totalPnL).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBots.length === 0 && (
        <div className="card p-12 text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No bots found</h3>
          <p className="text-slate-400 mb-4">
            Try adjusting your filters or add a new bot
          </p>
          <button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Bot
          </button>
        </div>
      )}
    </div>
  );
}

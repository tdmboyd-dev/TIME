'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Copy,
  Star,
  ChevronUp,
  ChevronDown,
  Filter,
  Search,
  RefreshCw,
  Shield,
  Eye,
  EyeOff,
  Zap,
  Target,
  BarChart3,
  Clock,
  Calendar,
  ArrowUpRight,
  Award,
  Sparkles,
  Bot,
  User,
} from 'lucide-react';
import clsx from 'clsx';
import { API_BASE } from '@/lib/api';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time';
type LeaderboardType = 'traders' | 'bots';
type AssetFilter = 'all' | 'crypto' | 'stocks' | 'forex' | 'options';

interface LeaderboardEntry {
  rank: number;
  previousRank: number;
  rankChange: number;
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;
  badges: string[];
  type: LeaderboardType;
  totalReturn: number;
  monthlyReturn: number;
  weeklyReturn: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  followers: number;
  copiers: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  tradingStyle?: string;
  isFollowing?: boolean;
  isCopying?: boolean;
}

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    previousRank: 1,
    rankChange: 0,
    id: '1',
    name: 'AlphaTrader_Pro',
    avatar: 'AT',
    verified: true,
    isPro: true,
    badges: ['top_trader', 'elite_trader', 'consistent'],
    type: 'traders',
    totalReturn: 342.5,
    monthlyReturn: 28.4,
    weeklyReturn: 8.2,
    winRate: 72.4,
    totalTrades: 1247,
    profitFactor: 2.85,
    sharpeRatio: 2.1,
    maxDrawdown: 12.5,
    followers: 12453,
    copiers: 892,
    riskLevel: 'moderate',
    tradingStyle: 'Swing Trader',
  },
  {
    rank: 2,
    previousRank: 4,
    rankChange: 2,
    id: '2',
    name: 'CryptoKing',
    avatar: 'CK',
    verified: true,
    isPro: true,
    badges: ['top_trader', 'signal_master'],
    type: 'traders',
    totalReturn: 298.7,
    monthlyReturn: 32.1,
    weeklyReturn: 12.5,
    winRate: 68.2,
    totalTrades: 2341,
    profitFactor: 2.42,
    sharpeRatio: 1.9,
    maxDrawdown: 18.2,
    followers: 8932,
    copiers: 567,
    riskLevel: 'aggressive',
    tradingStyle: 'Day Trader',
  },
  {
    rank: 3,
    previousRank: 2,
    rankChange: -1,
    id: '3',
    name: 'ValueHunter',
    avatar: 'VH',
    verified: true,
    isPro: false,
    badges: ['consistent'],
    type: 'traders',
    totalReturn: 245.2,
    monthlyReturn: 18.3,
    weeklyReturn: 4.2,
    winRate: 78.5,
    totalTrades: 456,
    profitFactor: 3.12,
    sharpeRatio: 2.4,
    maxDrawdown: 8.5,
    followers: 5621,
    copiers: 234,
    riskLevel: 'conservative',
    tradingStyle: 'Position Trader',
  },
  {
    rank: 4,
    previousRank: 3,
    rankChange: -1,
    id: '4',
    name: 'ScalpMaster',
    avatar: 'SM',
    verified: false,
    isPro: true,
    badges: ['signal_master'],
    type: 'traders',
    totalReturn: 198.4,
    monthlyReturn: 22.7,
    weeklyReturn: 6.8,
    winRate: 64.2,
    totalTrades: 5678,
    profitFactor: 1.95,
    sharpeRatio: 1.6,
    maxDrawdown: 15.3,
    followers: 3245,
    copiers: 145,
    riskLevel: 'aggressive',
    tradingStyle: 'Scalper',
  },
  {
    rank: 5,
    previousRank: 7,
    rankChange: 2,
    id: '5',
    name: 'QuietWealth',
    avatar: 'QW',
    verified: true,
    isPro: false,
    badges: ['consistent', 'community_leader'],
    type: 'traders',
    totalReturn: 187.9,
    monthlyReturn: 15.2,
    weeklyReturn: 3.5,
    winRate: 81.2,
    totalTrades: 234,
    profitFactor: 3.45,
    sharpeRatio: 2.8,
    maxDrawdown: 6.2,
    followers: 2890,
    copiers: 189,
    riskLevel: 'conservative',
    tradingStyle: 'Value Investor',
  },
];

const mockBotLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    previousRank: 1,
    rankChange: 0,
    id: 'bot-1',
    name: 'TrendMaster AI',
    avatar: 'TM',
    verified: true,
    isPro: true,
    badges: ['top_trader', 'consistent'],
    type: 'bots',
    totalReturn: 412.5,
    monthlyReturn: 34.2,
    weeklyReturn: 9.5,
    winRate: 74.5,
    totalTrades: 8945,
    profitFactor: 2.95,
    sharpeRatio: 2.3,
    maxDrawdown: 10.2,
    followers: 5432,
    copiers: 1245,
    riskLevel: 'moderate',
    tradingStyle: 'Trend Following',
  },
  {
    rank: 2,
    previousRank: 3,
    rankChange: 1,
    id: 'bot-2',
    name: 'ScalpBot Pro',
    avatar: 'SB',
    verified: true,
    isPro: true,
    badges: ['signal_master'],
    type: 'bots',
    totalReturn: 356.8,
    monthlyReturn: 42.1,
    weeklyReturn: 14.2,
    winRate: 68.9,
    totalTrades: 24567,
    profitFactor: 2.15,
    sharpeRatio: 1.8,
    maxDrawdown: 14.5,
    followers: 4321,
    copiers: 892,
    riskLevel: 'aggressive',
    tradingStyle: 'Scalping',
  },
  {
    rank: 3,
    previousRank: 2,
    rankChange: -1,
    id: 'bot-3',
    name: 'MeanRevert Alpha',
    avatar: 'MR',
    verified: true,
    isPro: false,
    badges: ['consistent'],
    type: 'bots',
    totalReturn: 289.4,
    monthlyReturn: 21.5,
    weeklyReturn: 5.8,
    winRate: 76.2,
    totalTrades: 3456,
    profitFactor: 2.78,
    sharpeRatio: 2.1,
    maxDrawdown: 9.8,
    followers: 3210,
    copiers: 567,
    riskLevel: 'moderate',
    tradingStyle: 'Mean Reversion',
  },
];

export function Leaderboard() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [type, setType] = useState<LeaderboardType>('traders');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/social/leaderboard?period=${period}&type=${type}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setEntries(data.data);
          setIsConnected(true);
        } else {
          throw new Error('Invalid data');
        }
      } else {
        throw new Error('API error');
      }
    } catch {
      // Use mock data
      setEntries(type === 'traders' ? mockLeaderboard : mockBotLeaderboard);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [period, type]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const filteredEntries = entries.filter(entry =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getRankChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-0.5 text-green-400 text-xs">
          <ChevronUp className="w-3 h-3" />
          <span>{change}</span>
        </div>
      );
    }
    if (change < 0) {
      return (
        <div className="flex items-center gap-0.5 text-red-400 text-xs">
          <ChevronDown className="w-3 h-3" />
          <span>{Math.abs(change)}</span>
        </div>
      );
    }
    return <Minus className="w-3 h-3 text-slate-500" />;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'conservative':
        return 'text-green-400 bg-green-400/10';
      case 'moderate':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'aggressive':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Leaderboard
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {isConnected ? 'LIVE' : 'DEMO'}
              </span>
            </h2>
            <p className="text-sm text-slate-400">Top performers ranked by returns</p>
          </div>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Type Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setType('traders')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              type === 'traders'
                ? 'bg-time-primary text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <User className="w-4 h-4" />
            Traders
          </button>
          <button
            onClick={() => setType('bots')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              type === 'bots'
                ? 'bg-time-primary text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Bot className="w-4 h-4" />
            Bots
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          {(['daily', 'weekly', 'monthly', 'yearly', 'all-time'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm transition-colors capitalize',
                period === p
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search traders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
            />
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            showFilters ? 'bg-time-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          )}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-6">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Asset Class</label>
              <div className="flex gap-2">
                {(['all', 'crypto', 'stocks', 'forex', 'options'] as AssetFilter[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAssetFilter(a)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs capitalize transition-colors',
                      assetFilter === a
                        ? 'bg-time-primary text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white'
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-800/50 text-xs font-medium text-slate-400 uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-3">{type === 'traders' ? 'Trader' : 'Bot'}</div>
          <div className="col-span-2 text-right">Return</div>
          <div className="col-span-1 text-center">Win Rate</div>
          <div className="col-span-1 text-center">Trades</div>
          <div className="col-span-1 text-center">Risk</div>
          <div className="col-span-2 text-center">Followers</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Entries */}
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin mb-2" />
            <p className="text-slate-400">Loading leaderboard...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredEntries.map((entry, index) => (
              <div
                key={entry.id}
                className={clsx(
                  'grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-800/50 transition-colors',
                  index < 3 && 'bg-gradient-to-r from-yellow-500/5 to-transparent'
                )}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center gap-2">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                    entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                    entry.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                    entry.rank === 3 ? 'bg-amber-600/20 text-amber-500' :
                    'bg-slate-700 text-slate-400'
                  )}>
                    {entry.rank <= 3 ? getRankBadge(entry.rank) : entry.rank}
                  </div>
                  {getRankChangeIndicator(entry.rankChange)}
                </div>

                {/* Trader/Bot Info */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white font-bold">
                    {entry.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{entry.name}</span>
                      {entry.verified && <Shield className="w-4 h-4 text-blue-400" />}
                      {entry.isPro && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">PRO</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{entry.tradingStyle}</p>
                  </div>
                </div>

                {/* Return */}
                <div className="col-span-2 text-right">
                  <div className={clsx(
                    'text-lg font-bold',
                    entry.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {entry.totalReturn >= 0 ? '+' : ''}{entry.totalReturn.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {period === 'monthly' ? `This month: +${entry.monthlyReturn}%` : `This week: +${entry.weeklyReturn}%`}
                  </div>
                </div>

                {/* Win Rate */}
                <div className="col-span-1 text-center">
                  <div className="text-white font-medium">{entry.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-slate-500">Win Rate</div>
                </div>

                {/* Trades */}
                <div className="col-span-1 text-center">
                  <div className="text-white font-medium">{entry.totalTrades.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Trades</div>
                </div>

                {/* Risk */}
                <div className="col-span-1 text-center">
                  <span className={clsx(
                    'px-2 py-1 rounded-full text-xs font-medium capitalize',
                    getRiskColor(entry.riskLevel)
                  )}>
                    {entry.riskLevel.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Followers & Copiers */}
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-sm">{entry.followers.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span className="text-sm">{entry.copiers.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-2">
                  <button className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg bg-time-primary/20 hover:bg-time-primary/30 text-time-primary transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-slate-400">Top Return</span>
          </div>
          <p className="text-2xl font-bold text-green-400">
            +{filteredEntries[0]?.totalReturn?.toFixed(1) || 0}%
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Avg Win Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {(filteredEntries.reduce((s, e) => s + e.winRate, 0) / filteredEntries.length || 0).toFixed(1)}%
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-slate-400">Total Traders</span>
          </div>
          <p className="text-2xl font-bold text-white">{filteredEntries.length}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Copy className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Total Copiers</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {filteredEntries.reduce((s, e) => s + e.copiers, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;

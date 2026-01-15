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

// No mock data - leaderboard shows real API data only
// Empty state is shown when no data is available

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
        // Handle both 'data' and 'leaderboard' response formats from backend
        const leaderboardData = data.leaderboard || data.data;
        if (data.success && Array.isArray(leaderboardData) && leaderboardData.length > 0) {
          // Map backend format to frontend format
          const mappedEntries: LeaderboardEntry[] = leaderboardData.map((entry: any, idx: number) => ({
            rank: entry.rank || idx + 1,
            previousRank: entry.previousRank || entry.rank || idx + 1,
            rankChange: entry.rankChange || 0,
            id: entry.id || entry.userId || `trader-${idx}`,
            name: entry.username || entry.name || `Trader ${idx + 1}`,
            avatar: entry.avatar || entry.name?.substring(0, 2).toUpperCase() || 'TR',
            verified: entry.verified || false,
            isPro: entry.isPro || false,
            badges: entry.badges || [],
            type: type,
            totalReturn: entry.profitPercent || entry.totalReturn || 0,
            monthlyReturn: entry.monthlyReturn || entry.monthlyProfit || 0,
            weeklyReturn: entry.weeklyReturn || entry.weeklyProfit || 0,
            winRate: entry.winRate || 50,
            totalTrades: entry.totalTrades || 0,
            profitFactor: entry.profitFactor || 1,
            sharpeRatio: entry.sharpeRatio || 0,
            maxDrawdown: entry.maxDrawdown || 0,
            followers: entry.followers || 0,
            copiers: entry.copiers || 0,
            riskLevel: entry.riskLevel || 'moderate',
            tradingStyle: entry.strategy || entry.tradingStyle || 'Day Trading',
          }));
          setEntries(mappedEntries);
          setIsConnected(true);
        } else {
          throw new Error('Invalid data');
        }
      } else {
        throw new Error('API error');
      }
    } catch {
      // No mock data fallback - show empty state
      setEntries([]);
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
          <div className="p-12 text-center">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? 'No traders match your search' : 'No leaderboard data available'}
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'Try adjusting your search query or filters.'
                : isConnected
                  ? 'Check back later as traders start competing.'
                  : 'Unable to load leaderboard data. Please check your connection and try again.'}
            </p>
            {!isConnected && (
              <button
                onClick={fetchLeaderboard}
                className="mt-4 px-4 py-2 bg-time-primary text-white rounded-lg hover:bg-time-primary/80 transition-colors"
              >
                Try Again
              </button>
            )}
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

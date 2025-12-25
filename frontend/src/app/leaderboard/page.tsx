'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  Crown,
  Medal,
  Star,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  BarChart3,
  Zap,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';

interface Trader {
  id: string;
  username: string;
  rank: number;
  avatar: string;
  verified: boolean;
  isPro: boolean;
  // Performance metrics
  profitPercent: number;
  winRate: number;
  totalTrades: number;
  followers: number;
  copiers: number;
  // Time-based profits
  dailyProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
  allTimeProfit: number;
  // Risk metrics
  riskScore: number;
  sharpeRatio: number;
  maxDrawdown: number;
  // Asset focus
  assetClass: string;
  strategy: string;
  // Status
  isFollowing: boolean;
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
type AssetClass = 'all' | 'stocks' | 'crypto' | 'forex' | 'options';

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [assetFilter, setAssetFilter] = useState<AssetClass>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      // In production, this would fetch from /api/social/leaderboard
      // For now, generate realistic demo data
      const demoData: Trader[] = Array.from({ length: 50 }, (_, i) => {
        const assetClasses = ['stocks', 'crypto', 'forex', 'options'];
        const strategies = ['Day Trading', 'Swing Trading', 'Scalping', 'Momentum', 'Mean Reversion', 'Trend Following'];
        const randomAsset = assetClasses[Math.floor(Math.random() * assetClasses.length)];

        return {
          id: `trader-${i + 1}`,
          username: `Trader${String(i + 1).padStart(3, '0')}`,
          rank: i + 1,
          avatar: String.fromCharCode(65 + (i % 26)),
          verified: i < 10,
          isPro: i < 5,
          profitPercent: 150 - (i * 2.5) + Math.random() * 10,
          winRate: 75 - (i * 0.5) + Math.random() * 5,
          totalTrades: 500 + Math.floor(Math.random() * 1000),
          followers: 1000 - (i * 15) + Math.floor(Math.random() * 100),
          copiers: 200 - (i * 3) + Math.floor(Math.random() * 20),
          dailyProfit: 5 - (i * 0.08) + Math.random() * 2,
          weeklyProfit: 15 - (i * 0.25) + Math.random() * 5,
          monthlyProfit: 35 - (i * 0.6) + Math.random() * 10,
          allTimeProfit: 150 - (i * 2.5) + Math.random() * 20,
          riskScore: 3 + Math.floor(Math.random() * 5),
          sharpeRatio: 2.5 - (i * 0.03) + Math.random() * 0.5,
          maxDrawdown: 5 + (i * 0.2) + Math.random() * 3,
          assetClass: randomAsset,
          strategy: strategies[Math.floor(Math.random() * strategies.length)],
          isFollowing: Math.random() > 0.8,
        };
      });

      setTraders(demoData);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timePeriod, assetFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLeaderboard();
  };

  const handleFollow = async (traderId: string) => {
    // In production, this would call /api/social/follow/:userId
    setTraders(prev => prev.map(t =>
      t.id === traderId ? { ...t, isFollowing: !t.isFollowing } : t
    ));
  };

  // Filter traders
  const filteredTraders = traders.filter(trader => {
    const matchesSearch = trader.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAsset = assetFilter === 'all' || trader.assetClass === assetFilter;
    return matchesSearch && matchesAsset;
  });

  // Get profit for selected time period
  const getProfit = (trader: Trader) => {
    switch (timePeriod) {
      case 'daily': return trader.dailyProfit;
      case 'weekly': return trader.weeklyProfit;
      case 'monthly': return trader.monthlyProfit;
      case 'all-time': return trader.allTimeProfit;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <Star className="w-5 h-5 text-slate-500" />;
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-500 text-black';
    if (rank === 3) return 'bg-gradient-to-br from-amber-500 to-amber-700 text-white';
    return 'bg-slate-700 text-slate-300';
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-400';
    if (score <= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Trader Leaderboard</h1>
          </div>
          <p className="text-slate-400">Top performing traders on TIME BEYOND US</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-slate-400">Total Traders</span>
          </div>
          <p className="text-2xl font-bold text-white">{traders.length.toLocaleString()}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Avg Win Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {(traders.reduce((acc, t) => acc + t.winRate, 0) / traders.length).toFixed(1)}%
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Active Copiers</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {traders.reduce((acc, t) => acc + t.copiers, 0).toLocaleString()}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-slate-400">Total Trades</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {(traders.reduce((acc, t) => acc + t.totalTrades, 0) / 1000).toFixed(1)}K
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search traders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500"
            />
          </div>

          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="all-time">All Time</option>
            </select>
          </div>

          {/* Asset Class Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value as AssetClass)}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="all">All Assets</option>
              <option value="stocks">Stocks</option>
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
              <option value="options">Options</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin mb-2" />
            <p className="text-slate-400">Loading leaderboard...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Trader
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Profit %
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Copiers
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredTraders.map((trader) => {
                  const profit = getProfit(trader);
                  const isPositive = profit >= 0;

                  return (
                    <tr
                      key={trader.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Rank */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getRankIcon(trader.rank)}
                          <span className={clsx(
                            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                            getRankBadgeClass(trader.rank)
                          )}>
                            {trader.rank}
                          </span>
                        </div>
                      </td>

                      {/* Trader */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white font-bold">
                            {trader.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{trader.username}</span>
                              {trader.verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
                              {trader.isPro && (
                                <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded font-bold">
                                  PRO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{trader.strategy}</p>
                          </div>
                        </div>
                      </td>

                      {/* Profit % */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <ArrowUpRight className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          )}
                          <span className={clsx(
                            'font-semibold',
                            isPositive ? 'text-green-400' : 'text-red-400'
                          )}>
                            {isPositive ? '+' : ''}{profit.toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      {/* Win Rate */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-green-400 h-2 rounded-full"
                              style={{ width: `${trader.winRate}%` }}
                            />
                          </div>
                          <span className="text-white font-medium">{trader.winRate.toFixed(1)}%</span>
                        </div>
                      </td>

                      {/* Trades */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white">{trader.totalTrades.toLocaleString()}</span>
                      </td>

                      {/* Risk */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx('font-semibold', getRiskColor(trader.riskScore))}>
                          {trader.riskScore}/10
                        </span>
                      </td>

                      {/* Copiers */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Users className="w-4 h-4" />
                          <span>{trader.copiers}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleFollow(trader.id)}
                            className={clsx(
                              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                              trader.isFollowing
                                ? 'bg-slate-700 text-white hover:bg-slate-600'
                                : 'bg-time-primary text-white hover:bg-time-primary/80'
                            )}
                          >
                            {trader.isFollowing ? 'Following' : 'Follow'}
                          </button>
                          <button className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && filteredTraders.length === 0 && (
        <div className="card p-8 text-center">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No traders found</h3>
          <p className="text-slate-400">Try adjusting your filters or search query</p>
        </div>
      )}
    </div>
  );
}

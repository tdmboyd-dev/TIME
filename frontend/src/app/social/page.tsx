'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Copy,
  Star,
  MessageCircle,
  Share2,
  Award,
  Target,
  BarChart3,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Crown,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Trader {
  id: string;
  username: string;
  avatar: string;
  rank: number;
  followers: number;
  following: number;
  totalReturn: number;
  winRate: number;
  totalTrades: number;
  riskScore: number;
  verified: boolean;
  isPro: boolean;
  copiers: number;
  strategy: string;
  monthlyReturn: number;
  isFollowing: boolean;
  isCopying: boolean;
}

interface LeaderboardEntry {
  rank: number;
  trader: Trader;
  monthlyPnL: number;
  weeklyPnL: number;
}

export default function SocialTradingPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'following' | 'copying'>('all');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tradersRes, leaderboardRes] = await Promise.all([
        fetch(`${API_BASE}/social/traders`),
        fetch(`${API_BASE}/social/leaderboard`),
      ]);

      const tradersData = await tradersRes.json();
      const leaderboardData = await leaderboardRes.json();

      if (tradersData.success) setTraders(tradersData.data);
      if (leaderboardData.success) setLeaderboard(leaderboardData.data);
    } catch (error) {
      // Sample data
      const sampleTraders: Trader[] = [
        {
          id: '1',
          username: 'AlphaTrader',
          avatar: 'AT',
          rank: 1,
          followers: 12500,
          following: 45,
          totalReturn: 156.8,
          winRate: 72.3,
          totalTrades: 2847,
          riskScore: 6,
          verified: true,
          isPro: true,
          copiers: 834,
          strategy: 'Momentum + Mean Reversion',
          monthlyReturn: 12.4,
          isFollowing: false,
          isCopying: false,
        },
        {
          id: '2',
          username: 'CryptoKing',
          avatar: 'CK',
          rank: 2,
          followers: 8900,
          following: 120,
          totalReturn: 234.5,
          winRate: 68.1,
          totalTrades: 5621,
          riskScore: 8,
          verified: true,
          isPro: true,
          copiers: 567,
          strategy: 'Crypto Swing Trading',
          monthlyReturn: 18.2,
          isFollowing: true,
          isCopying: false,
        },
        {
          id: '3',
          username: 'SteadyGains',
          avatar: 'SG',
          rank: 3,
          followers: 5400,
          following: 89,
          totalReturn: 78.9,
          winRate: 81.2,
          totalTrades: 1234,
          riskScore: 3,
          verified: true,
          isPro: false,
          copiers: 423,
          strategy: 'Conservative Value',
          monthlyReturn: 5.8,
          isFollowing: false,
          isCopying: true,
        },
        {
          id: '4',
          username: 'TechTrader',
          avatar: 'TT',
          rank: 4,
          followers: 3200,
          following: 67,
          totalReturn: 112.3,
          winRate: 65.4,
          totalTrades: 3456,
          riskScore: 7,
          verified: false,
          isPro: false,
          copiers: 234,
          strategy: 'Tech Sector Focus',
          monthlyReturn: 9.1,
          isFollowing: false,
          isCopying: false,
        },
      ];

      setTraders(sampleTraders);
      setLeaderboard(sampleTraders.map((t, idx) => ({
        rank: idx + 1,
        trader: t,
        monthlyPnL: t.monthlyReturn * 1000,
        weeklyPnL: t.monthlyReturn * 250,
      })));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTraders = traders.filter(trader => {
    const matchesSearch = trader.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterBy === 'all' ||
      (filterBy === 'following' && trader.isFollowing) ||
      (filterBy === 'copying' && trader.isCopying);
    return matchesSearch && matchesFilter;
  });

  const handleCopyClick = (trader: Trader) => {
    setSelectedTrader(trader);
    setShowCopyModal(true);
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-400';
    if (score <= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Social Trading</h1>
          <p className="text-slate-400">Follow and copy successful traders</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Profile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Following</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {traders.filter(t => t.isFollowing).length}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Copy className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Copying</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {traders.filter(t => t.isCopying).length}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-slate-400">Your Rank</span>
          </div>
          <p className="text-2xl font-bold text-white">#247</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-slate-400">Your Copiers</span>
          </div>
          <p className="text-2xl font-bold text-white">12</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Top Traders This Month</h2>
          </div>
          <button className="text-sm text-time-primary hover:underline">View All</button>
        </div>

        <div className="space-y-3">
          {leaderboard.slice(0, 5).map((entry) => (
            <div
              key={entry.trader.id}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                  entry.rank === 1 ? 'bg-yellow-500 text-black' :
                  entry.rank === 2 ? 'bg-slate-400 text-black' :
                  entry.rank === 3 ? 'bg-amber-600 text-white' :
                  'bg-slate-700 text-slate-400'
                )}>
                  {entry.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white font-bold">
                  {entry.trader.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{entry.trader.username}</span>
                    {entry.trader.verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
                    {entry.trader.isPro && (
                      <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">PRO</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{entry.trader.copiers} copiers</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-semibold">+{entry.trader.monthlyReturn}%</p>
                <p className="text-xs text-slate-500">this month</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Traders List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Discover Traders</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search traders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
            >
              <option value="all">All Traders</option>
              <option value="following">Following</option>
              <option value="copying">Copying</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin mb-2" />
            <p className="text-slate-400">Loading traders...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTraders.map((trader) => (
              <div key={trader.id} className="card p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {trader.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{trader.username}</span>
                        {trader.verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
                        {trader.isPro && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">PRO</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{trader.strategy}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded">
                    Rank #{trader.rank}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-400">+{trader.totalReturn}%</p>
                    <p className="text-xs text-slate-500">Total Return</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">{trader.winRate}%</p>
                    <p className="text-xs text-slate-500">Win Rate</p>
                  </div>
                  <div className="text-center">
                    <p className={clsx('text-lg font-semibold', getRiskColor(trader.riskScore))}>
                      {trader.riskScore}/10
                    </p>
                    <p className="text-xs text-slate-500">Risk</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">{trader.copiers}</p>
                    <p className="text-xs text-slate-500">Copiers</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
                  <button
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      trader.isFollowing
                        ? 'bg-slate-700 text-white hover:bg-slate-600'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    {trader.isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    onClick={() => handleCopyClick(trader)}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1',
                      trader.isCopying
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-time-primary text-white hover:bg-time-primary/80'
                    )}
                  >
                    <Copy className="w-4 h-4" />
                    {trader.isCopying ? 'Copying' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Copy Modal */}
      {showCopyModal && selectedTrader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Copy {selectedTrader.username}</h3>
              <button onClick={() => setShowCopyModal(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white font-bold">
                    {selectedTrader.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-white">{selectedTrader.username}</p>
                    <p className="text-xs text-slate-500">{selectedTrader.copiers} copiers</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-green-400 font-semibold">+{selectedTrader.totalReturn}%</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{selectedTrader.winRate}%</p>
                    <p className="text-xs text-slate-500">Win Rate</p>
                  </div>
                  <div>
                    <p className={clsx('font-semibold', getRiskColor(selectedTrader.riskScore))}>
                      {selectedTrader.riskScore}/10
                    </p>
                    <p className="text-xs text-slate-500">Risk</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Amount to Allocate ($)</label>
                <input
                  type="number"
                  placeholder="1000"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Copy Ratio</label>
                <select className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white">
                  <option value="1">1:1 (Copy exact amounts)</option>
                  <option value="0.5">1:0.5 (Half size)</option>
                  <option value="0.25">1:0.25 (Quarter size)</option>
                  <option value="2">1:2 (Double size)</option>
                </select>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-400">
                  Copy trading involves risk. Past performance is not indicative of future results.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                <button className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium">
                  Start Copying
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

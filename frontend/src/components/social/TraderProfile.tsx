'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Copy,
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Award,
  Trophy,
  Target,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Percent,
  Activity,
  Zap,
  Star,
  MessageCircle,
  Share2,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Crown,
  Sparkles,
  Globe,
  Twitter,
  Github,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { API_BASE } from '@/lib/api';

interface TraderStats {
  totalPnL: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  avgTradeSize: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  avgHoldingPeriod: number;
  bestTrade: number;
  worstTrade: number;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  tradesThisMonth: number;
  monthlyReturn: number;
  weeklyReturn: number;
  dailyReturn: number;
}

interface TraderBadge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  earnedAt: Date;
}

interface RecentTrade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  entryPrice: number;
  exitPrice: number;
  duration: number;
  timestamp: Date;
}

interface TraderProfileData {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  verified: boolean;
  isPro: boolean;
  isPublic: boolean;
  memberSince: Date;
  lastActiveAt: Date;
  followers: number;
  following: number;
  copiers: number;
  copiedValue: number;
  tradingStyle: string;
  preferredAssets: string[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  rank: number;
  stats: TraderStats;
  badges: TraderBadge[];
  recentTrades: RecentTrade[];
  isFollowing?: boolean;
  isCopying?: boolean;
}

interface TraderProfileProps {
  userId?: string;
  onClose?: () => void;
}

const mockTrader: TraderProfileData = {
  id: '1',
  username: 'AlphaTrader_Pro',
  displayName: 'Alpha Trader',
  avatar: 'AT',
  bio: 'Professional swing trader with 8+ years experience. Focused on technical analysis and risk management. I share all my trades and insights with my followers.',
  website: 'https://alphatrader.com',
  twitter: '@alphatrader_pro',
  verified: true,
  isPro: true,
  isPublic: true,
  memberSince: new Date('2023-03-15'),
  lastActiveAt: new Date(),
  followers: 12453,
  following: 234,
  copiers: 892,
  copiedValue: 4500000,
  tradingStyle: 'Swing Trader',
  preferredAssets: ['Stocks', 'Crypto', 'Forex'],
  riskLevel: 'moderate',
  rank: 1,
  stats: {
    totalPnL: 1250000,
    totalPnLPercent: 342.5,
    winRate: 72.4,
    totalTrades: 1247,
    avgTradeSize: 25000,
    profitFactor: 2.85,
    sharpeRatio: 2.1,
    sortinoRatio: 2.8,
    maxDrawdown: 12.5,
    avgHoldingPeriod: 1440,
    bestTrade: 45000,
    worstTrade: -15000,
    currentStreak: 7,
    streakType: 'win',
    tradesThisMonth: 42,
    monthlyReturn: 28.4,
    weeklyReturn: 8.2,
    dailyReturn: 1.5,
  },
  badges: [
    { id: '1', name: 'Top Trader', icon: 'Crown', color: '#F59E0B', description: 'Top 10 on monthly leaderboard', earnedAt: new Date() },
    { id: '2', name: 'Elite Trader', icon: 'Gem', color: '#EC4899', description: 'Top 1% by performance', earnedAt: new Date() },
    { id: '3', name: 'Verified', icon: 'Shield', color: '#3B82F6', description: 'Verified identity', earnedAt: new Date() },
    { id: '4', name: 'Consistent', icon: 'TrendingUp', color: '#10B981', description: '6 months profitable', earnedAt: new Date() },
  ],
  recentTrades: [
    { id: '1', symbol: 'AAPL', direction: 'long', pnl: 2450, pnlPercent: 4.2, entryPrice: 178.50, exitPrice: 186.00, duration: 2880, timestamp: new Date() },
    { id: '2', symbol: 'BTC/USD', direction: 'short', pnl: -850, pnlPercent: -1.2, entryPrice: 43500, exitPrice: 44020, duration: 360, timestamp: new Date() },
    { id: '3', symbol: 'TSLA', direction: 'long', pnl: 5200, pnlPercent: 8.5, entryPrice: 245.00, exitPrice: 265.82, duration: 4320, timestamp: new Date() },
    { id: '4', symbol: 'EUR/USD', direction: 'long', pnl: 1200, pnlPercent: 2.4, entryPrice: 1.0850, exitPrice: 1.1110, duration: 1440, timestamp: new Date() },
  ],
  isFollowing: false,
  isCopying: false,
};

export function TraderProfile({ userId, onClose }: TraderProfileProps) {
  const [trader, setTrader] = useState<TraderProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'stats' | 'badges'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [showCopyModal, setShowCopyModal] = useState(false);

  useEffect(() => {
    const fetchTrader = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/social/profile/${userId || '1'}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTrader(data.data);
          } else {
            throw new Error('Invalid data');
          }
        } else {
          throw new Error('API error');
        }
      } catch {
        setTrader(mockTrader);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrader();
  }, [userId]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
    return `${(minutes / 1440).toFixed(1)}d`;
  };

  const handleFollow = () => {
    if (trader) {
      setTrader({
        ...trader,
        isFollowing: !trader.isFollowing,
        followers: trader.isFollowing ? trader.followers - 1 : trader.followers + 1,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 border-4 border-time-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading profile...</p>
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
        <User className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Trader not found</p>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'conservative':
        return 'text-green-400';
      case 'moderate':
        return 'text-yellow-400';
      case 'aggressive':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-r from-time-primary/30 to-purple-600/30">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-slate-900">
            {trader.avatar}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-16 px-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">{trader.displayName}</h2>
              {trader.verified && <Shield className="w-5 h-5 text-blue-400" />}
              {trader.isPro && (
                <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">PRO</span>
              )}
              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                Rank #{trader.rank}
              </span>
            </div>
            <p className="text-sm text-slate-400">@{trader.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFollow}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                trader.isFollowing
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
            >
              {trader.isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {trader.isFollowing ? 'Following' : 'Follow'}
            </button>
            <button
              onClick={() => setShowCopyModal(true)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                trader.isCopying
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-time-primary text-white hover:bg-time-primary/80'
              )}
            >
              <Copy className="w-4 h-4" />
              {trader.isCopying ? 'Copying' : 'Copy'}
            </button>
            <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bio */}
        {trader.bio && (
          <p className="text-sm text-slate-300 mb-4">{trader.bio}</p>
        )}

        {/* Social Links */}
        <div className="flex items-center gap-4 mb-4">
          {trader.website && (
            <a href={trader.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
              <Globe className="w-4 h-4" />
              Website
            </a>
          )}
          {trader.twitter && (
            <a href={`https://twitter.com/${trader.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
              <Twitter className="w-4 h-4" />
              {trader.twitter}
            </a>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-white">{formatNumber(trader.followers)}</p>
            <p className="text-xs text-slate-500">Followers</p>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-white">{formatNumber(trader.following)}</p>
            <p className="text-xs text-slate-500">Following</p>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-white">{formatNumber(trader.copiers)}</p>
            <p className="text-xs text-slate-500">Copiers</p>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-green-400">+{trader.stats.totalPnLPercent.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">Total Return</p>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-white">{trader.stats.winRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">Win Rate</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {trader.badges.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700"
              title={badge.description}
            >
              <Award className="w-4 h-4" style={{ color: badge.color }} />
              <span className="text-xs font-medium text-slate-300">{badge.name}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 mb-6">
          {(['overview', 'trades', 'stats', 'badges'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'text-white border-time-primary'
                  : 'text-slate-400 border-transparent hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Performance Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400">Monthly Return</span>
                </div>
                <p className="text-xl font-bold text-green-400">+{trader.stats.monthlyReturn}%</p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Trades This Month</span>
                </div>
                <p className="text-xl font-bold text-white">{trader.stats.tradesThisMonth}</p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-slate-400">Current Streak</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {trader.stats.currentStreak} {trader.stats.streakType === 'win' ? 'Wins' : 'Losses'}
                </p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400">Total P&L</span>
                </div>
                <p className="text-xl font-bold text-green-400">${formatNumber(trader.stats.totalPnL)}</p>
              </div>
            </div>

            {/* Trading Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Trading Style</h4>
                <p className="text-white font-medium mb-2">{trader.tradingStyle}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Risk Level:</span>
                  <span className={clsx('font-medium capitalize', getRiskColor(trader.riskLevel))}>
                    {trader.riskLevel}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Preferred Assets</h4>
                <div className="flex flex-wrap gap-2">
                  {trader.preferredAssets.map((asset) => (
                    <span key={asset} className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded">
                      {asset}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3">Recent Trades</h4>
              <div className="space-y-2">
                {trader.recentTrades.slice(0, 3).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'px-2 py-0.5 text-xs font-medium rounded',
                        trade.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {trade.direction.toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{trade.symbol}</span>
                      <span className="text-xs text-slate-500">{formatDuration(trade.duration)}</span>
                    </div>
                    <div className="text-right">
                      <p className={clsx(
                        'font-medium',
                        trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                      </p>
                      <p className="text-xs text-slate-500">
                        ${Math.abs(trade.pnl).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Win Rate</p>
              <p className="text-xl font-bold text-white">{trader.stats.winRate.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Profit Factor</p>
              <p className="text-xl font-bold text-white">{trader.stats.profitFactor.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Sharpe Ratio</p>
              <p className="text-xl font-bold text-white">{trader.stats.sharpeRatio.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Sortino Ratio</p>
              <p className="text-xl font-bold text-white">{trader.stats.sortinoRatio.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Max Drawdown</p>
              <p className="text-xl font-bold text-red-400">-{trader.stats.maxDrawdown.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Total Trades</p>
              <p className="text-xl font-bold text-white">{trader.stats.totalTrades.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Avg Trade Size</p>
              <p className="text-xl font-bold text-white">${formatNumber(trader.stats.avgTradeSize)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Avg Holding Period</p>
              <p className="text-xl font-bold text-white">{formatDuration(trader.stats.avgHoldingPeriod)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Best Trade</p>
              <p className="text-xl font-bold text-green-400">+${formatNumber(trader.stats.bestTrade)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Worst Trade</p>
              <p className="text-xl font-bold text-red-400">${formatNumber(trader.stats.worstTrade)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">AUM Copying</p>
              <p className="text-xl font-bold text-white">${formatNumber(trader.copiedValue)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Member Since</p>
              <p className="text-xl font-bold text-white">
                {new Date(trader.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="space-y-3">
            {trader.recentTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    'px-3 py-1 text-sm font-medium rounded',
                    trade.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    {trade.direction.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">{trade.symbol}</p>
                    <p className="text-xs text-slate-500">
                      ${trade.entryPrice.toLocaleString()} -> ${trade.exitPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={clsx(
                    'font-bold',
                    trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-slate-500">
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()} | {formatDuration(trade.duration)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="grid grid-cols-2 gap-4">
            {trader.badges.map((badge) => (
              <div key={badge.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${badge.color}20` }}>
                    <Award className="w-5 h-5" style={{ color: badge.color }} />
                  </div>
                  <div>
                    <p className="font-medium text-white">{badge.name}</p>
                    <p className="text-xs text-slate-500">
                      Earned {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-400">{badge.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Copy {trader.displayName}</h3>
              <button onClick={() => setShowCopyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white font-bold">
                    {trader.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-white">{trader.displayName}</p>
                    <p className="text-xs text-slate-500">{trader.copiers} copiers</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-green-400 font-semibold">+{trader.stats.totalPnLPercent.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{trader.stats.winRate.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">Win Rate</p>
                  </div>
                  <div>
                    <p className={clsx('font-semibold', getRiskColor(trader.riskLevel))}>
                      {trader.riskLevel.charAt(0).toUpperCase()}
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
                <button
                  onClick={() => {
                    setTrader({ ...trader, isCopying: true, copiers: trader.copiers + 1 });
                    setShowCopyModal(false);
                  }}
                  className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                >
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

export default TraderProfile;

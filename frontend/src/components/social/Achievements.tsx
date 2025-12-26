'use client';

import { useState, useEffect } from 'react';
import {
  Award,
  Trophy,
  Crown,
  Star,
  Target,
  Zap,
  Flame,
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
  UserPlus,
  Copy,
  Moon,
  Clock,
  PieChart,
  Crosshair,
  Gem,
  Rocket,
  Lock,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Shield,
} from 'lucide-react';
import clsx from 'clsx';
import { API_BASE } from '@/lib/api';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'trading' | 'social' | 'bot' | 'milestone' | 'special' | 'seasonal';
  icon: string;
  iconColor: string;
  backgroundColor: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  progress: number;
  target: number;
  isComplete: boolean;
  completedAt?: Date;
  isHidden: boolean;
  percentOwned: number;
  rewards?: { type: string; value: any }[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  backgroundColor: string;
  isEarned: boolean;
  earnedAt?: Date;
  isPrimary: boolean;
  isDisplayed: boolean;
  priority: number;
}

const iconMap: Record<string, any> = {
  Rocket: Rocket,
  Target: Target,
  Award: Award,
  Crown: Crown,
  Trophy: Trophy,
  Zap: Zap,
  Flame: Flame,
  Sparkles: Sparkles,
  DollarSign: DollarSign,
  TrendingUp: TrendingUp,
  Gem: Gem,
  UserPlus: UserPlus,
  Star: Star,
  Users: Users,
  Copy: Copy,
  Crosshair: Crosshair,
  Clock: Clock,
  Moon: Moon,
  PieChart: PieChart,
  Shield: Shield,
  CheckCircle: CheckCircle,
};

const mockAchievements: Achievement[] = [
  {
    id: 'first_trade',
    name: 'First Steps',
    description: 'Complete your first trade',
    category: 'trading',
    icon: 'Rocket',
    iconColor: '#60A5FA',
    backgroundColor: '#1E3A5F',
    rarity: 'common',
    points: 10,
    progress: 1,
    target: 1,
    isComplete: true,
    completedAt: new Date('2024-01-15'),
    isHidden: false,
    percentOwned: 95,
  },
  {
    id: 'ten_trades',
    name: 'Getting Started',
    description: 'Complete 10 trades',
    category: 'trading',
    icon: 'Target',
    iconColor: '#34D399',
    backgroundColor: '#1A3A2F',
    rarity: 'common',
    points: 25,
    progress: 10,
    target: 10,
    isComplete: true,
    completedAt: new Date('2024-02-01'),
    isHidden: false,
    percentOwned: 82,
  },
  {
    id: 'hundred_trades',
    name: 'Centurion',
    description: 'Complete 100 trades',
    category: 'milestone',
    icon: 'Award',
    iconColor: '#F59E0B',
    backgroundColor: '#3D2A0A',
    rarity: 'uncommon',
    points: 100,
    progress: 67,
    target: 100,
    isComplete: false,
    isHidden: false,
    percentOwned: 45,
  },
  {
    id: 'thousand_trades',
    name: 'Trading Master',
    description: 'Complete 1,000 trades',
    category: 'milestone',
    icon: 'Crown',
    iconColor: '#A855F7',
    backgroundColor: '#2D1B4E',
    rarity: 'rare',
    points: 500,
    progress: 67,
    target: 1000,
    isComplete: false,
    isHidden: false,
    percentOwned: 12,
  },
  {
    id: 'first_win',
    name: 'Winner',
    description: 'Close your first profitable trade',
    category: 'trading',
    icon: 'Trophy',
    iconColor: '#FBBF24',
    backgroundColor: '#3D2A0A',
    rarity: 'common',
    points: 15,
    progress: 1,
    target: 1,
    isComplete: true,
    completedAt: new Date('2024-01-15'),
    isHidden: false,
    percentOwned: 92,
  },
  {
    id: 'win_streak_5',
    name: 'Hot Streak',
    description: 'Win 5 trades in a row',
    category: 'trading',
    icon: 'Flame',
    iconColor: '#EF4444',
    backgroundColor: '#3D0A0A',
    rarity: 'uncommon',
    points: 75,
    progress: 3,
    target: 5,
    isComplete: false,
    isHidden: false,
    percentOwned: 35,
  },
  {
    id: 'win_streak_10',
    name: 'Unstoppable',
    description: 'Win 10 trades in a row',
    category: 'trading',
    icon: 'Sparkles',
    iconColor: '#EC4899',
    backgroundColor: '#3D0A2A',
    rarity: 'rare',
    points: 200,
    progress: 3,
    target: 10,
    isComplete: false,
    isHidden: false,
    percentOwned: 8,
  },
  {
    id: 'profit_1k',
    name: 'First Thousand',
    description: 'Earn $1,000 in total profit',
    category: 'milestone',
    icon: 'DollarSign',
    iconColor: '#10B981',
    backgroundColor: '#0A3D2A',
    rarity: 'uncommon',
    points: 100,
    progress: 850,
    target: 1000,
    isComplete: false,
    isHidden: false,
    percentOwned: 55,
  },
  {
    id: 'profit_10k',
    name: 'Five Figures',
    description: 'Earn $10,000 in total profit',
    category: 'milestone',
    icon: 'TrendingUp',
    iconColor: '#22C55E',
    backgroundColor: '#0A3D1A',
    rarity: 'rare',
    points: 300,
    progress: 850,
    target: 10000,
    isComplete: false,
    isHidden: false,
    percentOwned: 22,
  },
  {
    id: 'profit_100k',
    name: 'Six Figure Trader',
    description: 'Earn $100,000 in total profit',
    category: 'milestone',
    icon: 'Gem',
    iconColor: '#3B82F6',
    backgroundColor: '#0A1A3D',
    rarity: 'epic',
    points: 1000,
    progress: 850,
    target: 100000,
    isComplete: false,
    isHidden: false,
    percentOwned: 3,
  },
  {
    id: 'first_follower',
    name: 'Getting Popular',
    description: 'Get your first follower',
    category: 'social',
    icon: 'UserPlus',
    iconColor: '#8B5CF6',
    backgroundColor: '#1E1A3D',
    rarity: 'common',
    points: 20,
    progress: 1,
    target: 1,
    isComplete: true,
    completedAt: new Date('2024-02-10'),
    isHidden: false,
    percentOwned: 78,
  },
  {
    id: 'followers_100',
    name: 'Rising Star',
    description: 'Reach 100 followers',
    category: 'social',
    icon: 'Star',
    iconColor: '#FBBF24',
    backgroundColor: '#3D2A0A',
    rarity: 'uncommon',
    points: 150,
    progress: 45,
    target: 100,
    isComplete: false,
    isHidden: false,
    percentOwned: 28,
  },
  {
    id: 'first_copier',
    name: 'Lead by Example',
    description: 'Have someone copy your trades',
    category: 'social',
    icon: 'Copy',
    iconColor: '#14B8A6',
    backgroundColor: '#0A3D3A',
    rarity: 'uncommon',
    points: 50,
    progress: 0,
    target: 1,
    isComplete: false,
    isHidden: false,
    percentOwned: 18,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete 50 trades between midnight and 5am',
    category: 'special',
    icon: 'Moon',
    iconColor: '#8B5CF6',
    backgroundColor: '#1E1A3D',
    rarity: 'rare',
    points: 100,
    progress: 12,
    target: 50,
    isComplete: false,
    isHidden: true,
    percentOwned: 5,
  },
  {
    id: 'diversified',
    name: 'Diversified',
    description: 'Trade in 5 different asset classes',
    category: 'trading',
    icon: 'PieChart',
    iconColor: '#F97316',
    backgroundColor: '#3D1F0A',
    rarity: 'uncommon',
    points: 75,
    progress: 3,
    target: 5,
    isComplete: false,
    isHidden: false,
    percentOwned: 32,
  },
];

const mockBadges: Badge[] = [
  {
    id: 'verified',
    name: 'Verified',
    description: 'Verified trader identity',
    category: 'verified',
    icon: 'Shield',
    color: '#3B82F6',
    backgroundColor: '#1E3A5F',
    isEarned: true,
    earnedAt: new Date('2024-01-01'),
    isPrimary: false,
    isDisplayed: true,
    priority: 100,
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Consistent profitable months',
    category: 'trading',
    icon: 'TrendingUp',
    color: '#10B981',
    backgroundColor: '#0A3D2A',
    isEarned: true,
    earnedAt: new Date('2024-06-01'),
    isPrimary: true,
    isDisplayed: true,
    priority: 80,
  },
  {
    id: 'top_trader',
    name: 'Top Trader',
    description: 'Top 10 on the leaderboard',
    category: 'trading',
    icon: 'Crown',
    color: '#F59E0B',
    backgroundColor: '#3D2A0A',
    isEarned: false,
    isPrimary: false,
    isDisplayed: false,
    priority: 90,
  },
  {
    id: 'elite_trader',
    name: 'Elite Trader',
    description: 'Top 1% by performance',
    category: 'trading',
    icon: 'Gem',
    color: '#EC4899',
    backgroundColor: '#3D0A2A',
    isEarned: false,
    isPrimary: false,
    isDisplayed: false,
    priority: 85,
  },
  {
    id: 'community_leader',
    name: 'Community Leader',
    description: 'Active community contributor',
    category: 'social',
    icon: 'Users',
    color: '#6366F1',
    backgroundColor: '#1A1A3D',
    isEarned: false,
    isPrimary: false,
    isDisplayed: false,
    priority: 75,
  },
  {
    id: 'signal_master',
    name: 'Signal Master',
    description: 'High-quality signal provider',
    category: 'trading',
    icon: 'Zap',
    color: '#F97316',
    backgroundColor: '#3D1F0A',
    isEarned: false,
    isPrimary: false,
    isDisplayed: false,
    priority: 70,
  },
];

const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
  common: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  uncommon: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  rare: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  epic: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  legendary: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

const categoryLabels: Record<string, string> = {
  trading: 'Trading',
  social: 'Social',
  bot: 'Bot',
  milestone: 'Milestone',
  special: 'Special',
  seasonal: 'Seasonal',
};

export function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>(mockAchievements);
  const [badges, setBadges] = useState<Badge[]>(mockBadges);
  const [activeTab, setActiveTab] = useState<'achievements' | 'badges'>('achievements');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'in-progress'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [achievementsRes, badgesRes] = await Promise.all([
          fetch(`${API_BASE}/social/achievements`),
          fetch(`${API_BASE}/social/badges`),
        ]);

        if (achievementsRes.ok) {
          const data = await achievementsRes.json();
          if (data.success) setAchievements(data.data);
        }
        if (badgesRes.ok) {
          const data = await badgesRes.json();
          if (data.success) setBadges(data.data);
        }
      } catch {
        // Use mock data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAchievements = achievements.filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (filterStatus === 'complete' && !a.isComplete) return false;
    if (filterStatus === 'in-progress' && a.isComplete) return false;
    return true;
  });

  const earnedBadges = badges.filter(b => b.isEarned);
  const lockedBadges = badges.filter(b => !b.isEarned);

  const totalPoints = achievements.filter(a => a.isComplete).reduce((s, a) => s + a.points, 0);
  const completedCount = achievements.filter(a => a.isComplete).length;

  const categories = ['all', ...Array.from(new Set(achievements.map(a => a.category)))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Achievements & Badges</h2>
            <p className="text-sm text-slate-400">Track your progress and unlock rewards</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-slate-400">Total Points</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalPoints.toLocaleString()}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Completed</span>
          </div>
          <p className="text-2xl font-bold text-white">{completedCount}/{achievements.length}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-slate-400">Badges Earned</span>
          </div>
          <p className="text-2xl font-bold text-white">{earnedBadges.length}/{badges.length}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Star className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Rarity Score</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {Math.round(completedCount > 0 ? achievements.filter(a => a.isComplete).reduce((s, a) => s + (100 - a.percentOwned), 0) / completedCount : 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('achievements')}
          className={clsx(
            'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'achievements'
              ? 'text-white border-time-primary'
              : 'text-slate-400 border-transparent hover:text-white'
          )}
        >
          Achievements ({achievements.length})
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={clsx(
            'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'badges'
              ? 'text-white border-time-primary'
              : 'text-slate-400 border-transparent hover:text-white'
          )}
        >
          Badges ({badges.length})
        </button>
      </div>

      {activeTab === 'achievements' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm capitalize transition-colors',
                    filterCategory === cat
                      ? 'bg-time-primary text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  )}
                >
                  {cat === 'all' ? 'All' : categoryLabels[cat] || cat}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {(['all', 'complete', 'in-progress'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm capitalize transition-colors',
                    filterStatus === status
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {status === 'all' ? 'All' : status.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : filteredAchievements.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No achievements found</p>
              </div>
            ) : (
              filteredAchievements.map((achievement) => {
                const Icon = iconMap[achievement.icon] || Award;
                const rarity = rarityColors[achievement.rarity];
                const progressPercent = Math.min((achievement.progress / achievement.target) * 100, 100);

                return (
                  <div
                    key={achievement.id}
                    onClick={() => setSelectedAchievement(achievement)}
                    className={clsx(
                      'card p-4 cursor-pointer transition-all hover:border-slate-600',
                      achievement.isComplete && 'bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20',
                      achievement.isHidden && !achievement.isComplete && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: achievement.backgroundColor }}
                      >
                        {achievement.isHidden && !achievement.isComplete ? (
                          <Lock className="w-6 h-6 text-slate-500" />
                        ) : (
                          <Icon className="w-6 h-6" style={{ color: achievement.iconColor }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white truncate">
                            {achievement.isHidden && !achievement.isComplete ? '???' : achievement.name}
                          </h4>
                          {achievement.isComplete && (
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                          {achievement.isHidden && !achievement.isComplete ? 'Hidden achievement' : achievement.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={clsx('px-2 py-0.5 text-xs rounded capitalize', rarity.bg, rarity.text)}>
                            {achievement.rarity}
                          </span>
                          <span className="text-xs text-slate-500">{achievement.points} pts</span>
                          <span className="text-xs text-slate-500">{achievement.percentOwned}% own</span>
                        </div>
                      </div>
                    </div>

                    {!achievement.isComplete && !achievement.isHidden && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400">Progress</span>
                          <span className="text-white">
                            {achievement.progress.toLocaleString()} / {achievement.target.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-time-primary to-purple-500 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {achievement.isComplete && achievement.completedAt && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500">
                          Completed {new Date(achievement.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'badges' && (
        <div className="space-y-6">
          {/* Earned Badges */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Earned Badges ({earnedBadges.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {earnedBadges.map((badge) => {
                const Icon = iconMap[badge.icon] || Award;
                return (
                  <div
                    key={badge.id}
                    className={clsx(
                      'card p-4 text-center',
                      badge.isPrimary && 'border-yellow-500/50 bg-yellow-500/5'
                    )}
                  >
                    <div
                      className="w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: badge.backgroundColor }}
                    >
                      <Icon className="w-8 h-8" style={{ color: badge.color }} />
                    </div>
                    <h4 className="font-medium text-white mb-1">{badge.name}</h4>
                    <p className="text-xs text-slate-400 mb-2">{badge.description}</p>
                    {badge.isPrimary && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                        Primary
                      </span>
                    )}
                    {badge.earnedAt && (
                      <p className="text-xs text-slate-500 mt-2">
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Locked Badges */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-500" />
              Locked Badges ({lockedBadges.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lockedBadges.map((badge) => {
                const Icon = iconMap[badge.icon] || Award;
                return (
                  <div
                    key={badge.id}
                    className="card p-4 text-center opacity-60"
                  >
                    <div className="w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center bg-slate-800">
                      <Lock className="w-8 h-8 text-slate-600" />
                    </div>
                    <h4 className="font-medium text-slate-400 mb-1">{badge.name}</h4>
                    <p className="text-xs text-slate-500">{badge.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: selectedAchievement.backgroundColor }}
              >
                {(() => {
                  const Icon = iconMap[selectedAchievement.icon] || Award;
                  return <Icon className="w-8 h-8" style={{ color: selectedAchievement.iconColor }} />;
                })()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{selectedAchievement.name}</h3>
                <p className="text-sm text-slate-400">{selectedAchievement.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400">Points</p>
                <p className="text-lg font-bold text-white">{selectedAchievement.points}</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400">Rarity</p>
                <p className={clsx('text-lg font-bold capitalize', rarityColors[selectedAchievement.rarity].text)}>
                  {selectedAchievement.rarity}
                </p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400">Owners</p>
                <p className="text-lg font-bold text-white">{selectedAchievement.percentOwned}%</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400">Status</p>
                <p className={clsx('text-lg font-bold', selectedAchievement.isComplete ? 'text-green-400' : 'text-yellow-400')}>
                  {selectedAchievement.isComplete ? 'Complete' : 'In Progress'}
                </p>
              </div>
            </div>

            {!selectedAchievement.isComplete && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white">
                    {selectedAchievement.progress.toLocaleString()} / {selectedAchievement.target.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-time-primary to-purple-500 rounded-full"
                    style={{ width: `${(selectedAchievement.progress / selectedAchievement.target) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedAchievement(null)}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Achievements;

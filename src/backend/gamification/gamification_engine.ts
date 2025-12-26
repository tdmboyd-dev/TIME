/**
 * TIME BEYOND US - Gamification Engine
 *
 * Complete gamification system with:
 * - XP & Leveling System
 * - Achievements & Badges
 * - Daily/Weekly Challenges
 * - Streaks & Rewards
 * - Leaderboards & Rankings
 * - Virtual Currency (TIME Coins)
 * - Referral Rewards
 * - Seasonal Events
 */

import { EventEmitter } from 'events';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface UserProgress {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXpEarned: number;
  timeCoins: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  achievements: Achievement[];
  badges: Badge[];
  challenges: ChallengeProgress[];
  rank: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend';
  seasonPoints: number;
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'trading' | 'social' | 'learning' | 'milestone' | 'special';
  icon: string;
  iconColor: string;
  backgroundColor: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  coinReward: number;
  progress: number;
  target: number;
  isComplete: boolean;
  unlockedAt?: Date;
  percentOwned: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'verified' | 'trading' | 'social' | 'special' | 'seasonal';
  icon: string;
  color: string;
  backgroundColor: string;
  isEarned: boolean;
  earnedAt?: Date;
  isPrimary: boolean;
  isDisplayed: boolean;
  priority: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  category: 'trading' | 'social' | 'learning' | 'engagement';
  target: number;
  xpReward: number;
  coinReward: number;
  bonusReward?: string;
  startDate: Date;
  endDate: Date;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

export interface ChallengeProgress {
  challengeId: string;
  challenge: Challenge;
  progress: number;
  isComplete: boolean;
  completedAt?: Date;
  claimed: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  level: number;
  tier: string;
  xp: number;
  rank: number;
  badges: Badge[];
  metric: number; // Value being ranked by
}

export interface Reward {
  id: string;
  type: 'xp' | 'coins' | 'badge' | 'achievement' | 'boost' | 'premium';
  amount?: number;
  itemId?: string;
  description: string;
  source: string;
  earnedAt: Date;
}

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  rewards: Reward[];
  challenges: Challenge[];
  leaderboard: LeaderboardEntry[];
  isActive: boolean;
}

// ============================================================
// XP & LEVELING CONFIGURATION
// ============================================================

const LEVEL_CONFIG = {
  baseXP: 100,
  multiplier: 1.5,
  maxLevel: 100,
};

const XP_ACTIONS = {
  // Trading actions
  completeTrade: 10,
  winningTrade: 25,
  profitableTrade: 15,
  firstTradeOfDay: 50,
  tradeStreak5: 100,
  tradeStreak10: 250,

  // Social actions
  followUser: 5,
  getFollower: 10,
  shareStrategy: 25,
  helpNewUser: 50,
  topLeaderboard: 500,

  // Learning actions
  completeLesson: 20,
  passQuiz: 30,
  watchTutorial: 10,
  readArticle: 5,

  // Engagement
  dailyLogin: 25,
  weeklyStreak: 100,
  monthlyStreak: 500,
  profileComplete: 100,
  referralSignup: 200,
  referralFirstTrade: 300,
};

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 15000,
  diamond: 50000,
  legend: 100000,
};

// ============================================================
// ACHIEVEMENTS CONFIGURATION
// ============================================================

const ACHIEVEMENTS: Achievement[] = [
  // Trading Achievements
  {
    id: 'first_trade',
    name: 'First Steps',
    description: 'Complete your first trade',
    category: 'trading',
    icon: 'Rocket',
    iconColor: '#60A5FA',
    backgroundColor: '#1E3A5F',
    rarity: 'common',
    xpReward: 50,
    coinReward: 100,
    progress: 0,
    target: 1,
    isComplete: false,
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
    xpReward: 100,
    coinReward: 200,
    progress: 0,
    target: 10,
    isComplete: false,
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
    xpReward: 500,
    coinReward: 1000,
    progress: 0,
    target: 100,
    isComplete: false,
    percentOwned: 45,
  },
  {
    id: 'thousand_trades',
    name: 'Trading Titan',
    description: 'Complete 1,000 trades',
    category: 'milestone',
    icon: 'Crown',
    iconColor: '#EC4899',
    backgroundColor: '#3D0A2A',
    rarity: 'epic',
    xpReward: 2500,
    coinReward: 5000,
    progress: 0,
    target: 1000,
    isComplete: false,
    percentOwned: 8,
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
    xpReward: 75,
    coinReward: 150,
    progress: 0,
    target: 1,
    isComplete: false,
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
    xpReward: 300,
    coinReward: 500,
    progress: 0,
    target: 5,
    isComplete: false,
    percentOwned: 35,
  },
  {
    id: 'win_streak_10',
    name: 'On Fire',
    description: 'Win 10 trades in a row',
    category: 'trading',
    icon: 'Flame',
    iconColor: '#F97316',
    backgroundColor: '#3D1F0A',
    rarity: 'rare',
    xpReward: 1000,
    coinReward: 2000,
    progress: 0,
    target: 10,
    isComplete: false,
    percentOwned: 12,
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
    xpReward: 500,
    coinReward: 1000,
    progress: 0,
    target: 1000,
    isComplete: false,
    percentOwned: 55,
  },
  {
    id: 'profit_10k',
    name: 'Five Figure Club',
    description: 'Earn $10,000 in total profit',
    category: 'milestone',
    icon: 'Gem',
    iconColor: '#8B5CF6',
    backgroundColor: '#1E1A3D',
    rarity: 'rare',
    xpReward: 2000,
    coinReward: 5000,
    progress: 0,
    target: 10000,
    isComplete: false,
    percentOwned: 18,
  },
  {
    id: 'profit_100k',
    name: 'Six Figure Legend',
    description: 'Earn $100,000 in total profit',
    category: 'milestone',
    icon: 'Crown',
    iconColor: '#F59E0B',
    backgroundColor: '#3D2A0A',
    rarity: 'legendary',
    xpReward: 10000,
    coinReward: 25000,
    progress: 0,
    target: 100000,
    isComplete: false,
    percentOwned: 2,
  },

  // Social Achievements
  {
    id: 'first_follower',
    name: 'Getting Popular',
    description: 'Get your first follower',
    category: 'social',
    icon: 'UserPlus',
    iconColor: '#8B5CF6',
    backgroundColor: '#1E1A3D',
    rarity: 'common',
    xpReward: 50,
    coinReward: 100,
    progress: 0,
    target: 1,
    isComplete: false,
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
    xpReward: 500,
    coinReward: 1000,
    progress: 0,
    target: 100,
    isComplete: false,
    percentOwned: 28,
  },
  {
    id: 'followers_1000',
    name: 'Influencer',
    description: 'Reach 1,000 followers',
    category: 'social',
    icon: 'Users',
    iconColor: '#EC4899',
    backgroundColor: '#3D0A2A',
    rarity: 'epic',
    xpReward: 2500,
    coinReward: 5000,
    progress: 0,
    target: 1000,
    isComplete: false,
    percentOwned: 5,
  },
  {
    id: 'share_strategy',
    name: 'Strategist',
    description: 'Share your first trading strategy',
    category: 'social',
    icon: 'Share2',
    iconColor: '#06B6D4',
    backgroundColor: '#0A2D3D',
    rarity: 'common',
    xpReward: 100,
    coinReward: 200,
    progress: 0,
    target: 1,
    isComplete: false,
    percentOwned: 45,
  },
  {
    id: 'chat_active',
    name: 'Chatterbox',
    description: 'Send 100 messages in community chat',
    category: 'social',
    icon: 'MessageCircle',
    iconColor: '#60A5FA',
    backgroundColor: '#1E3A5F',
    rarity: 'common',
    xpReward: 100,
    coinReward: 200,
    progress: 0,
    target: 100,
    isComplete: false,
    percentOwned: 52,
  },

  // Learning Achievements
  {
    id: 'complete_tutorial',
    name: 'Student',
    description: 'Complete the beginner tutorial',
    category: 'learning',
    icon: 'GraduationCap',
    iconColor: '#60A5FA',
    backgroundColor: '#1E3A5F',
    rarity: 'common',
    xpReward: 100,
    coinReward: 200,
    progress: 0,
    target: 1,
    isComplete: false,
    percentOwned: 88,
  },
  {
    id: 'complete_all_courses',
    name: 'Scholar',
    description: 'Complete all trading courses',
    category: 'learning',
    icon: 'BookOpen',
    iconColor: '#10B981',
    backgroundColor: '#0A3D2A',
    rarity: 'rare',
    xpReward: 1500,
    coinReward: 3000,
    progress: 0,
    target: 10,
    isComplete: false,
    percentOwned: 15,
  },
  {
    id: 'backtest_master',
    name: 'Backtest Master',
    description: 'Run 50 backtests',
    category: 'learning',
    icon: 'BarChart3',
    iconColor: '#8B5CF6',
    backgroundColor: '#1E1A3D',
    rarity: 'uncommon',
    xpReward: 400,
    coinReward: 800,
    progress: 0,
    target: 50,
    isComplete: false,
    percentOwned: 32,
  },

  // Special Achievements
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Join during the beta period',
    category: 'special',
    icon: 'Zap',
    iconColor: '#F59E0B',
    backgroundColor: '#3D2A0A',
    rarity: 'legendary',
    xpReward: 1000,
    coinReward: 5000,
    progress: 0,
    target: 1,
    isComplete: false,
    percentOwned: 5,
  },
  {
    id: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Report a valid bug that gets fixed',
    category: 'special',
    icon: 'Bug',
    iconColor: '#EF4444',
    backgroundColor: '#3D0A0A',
    rarity: 'rare',
    xpReward: 500,
    coinReward: 1000,
    progress: 0,
    target: 1,
    isComplete: false,
    percentOwned: 8,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Make a trade between 12am and 5am',
    category: 'special',
    icon: 'Moon',
    iconColor: '#6366F1',
    backgroundColor: '#1A1A3D',
    rarity: 'uncommon',
    xpReward: 100,
    coinReward: 200,
    progress: 0,
    target: 1,
    isComplete: false,
    percentOwned: 42,
  },
  {
    id: 'perfect_day',
    name: 'Perfect Day',
    description: 'Win 10 trades in a single day with no losses',
    category: 'special',
    icon: 'Sun',
    iconColor: '#FBBF24',
    backgroundColor: '#3D2A0A',
    rarity: 'epic',
    xpReward: 1500,
    coinReward: 3000,
    progress: 0,
    target: 1,
    isComplete: false,
    percentOwned: 3,
  },
];

// ============================================================
// GAMIFICATION ENGINE CLASS
// ============================================================

export class GamificationEngine extends EventEmitter {
  private userProgress: Map<string, UserProgress> = new Map();
  private activeChallenges: Challenge[] = [];
  private currentEvent: SeasonalEvent | null = null;

  constructor() {
    super();
    this.initializeDailyChallenges();
    this.initializeWeeklyChallenges();
  }

  // ============================================================
  // XP & LEVELING
  // ============================================================

  calculateXPForLevel(level: number): number {
    return Math.floor(LEVEL_CONFIG.baseXP * Math.pow(LEVEL_CONFIG.multiplier, level - 1));
  }

  calculateLevelFromXP(totalXP: number): { level: number; currentXP: number; xpToNext: number } {
    let level = 1;
    let xpRemaining = totalXP;

    while (level < LEVEL_CONFIG.maxLevel) {
      const xpNeeded = this.calculateXPForLevel(level);
      if (xpRemaining < xpNeeded) break;
      xpRemaining -= xpNeeded;
      level++;
    }

    return {
      level,
      currentXP: xpRemaining,
      xpToNext: this.calculateXPForLevel(level),
    };
  }

  async awardXP(userId: string, action: keyof typeof XP_ACTIONS, multiplier: number = 1): Promise<{
    xpAwarded: number;
    levelUp: boolean;
    newLevel?: number;
    rewards?: Reward[];
  }> {
    const progress = this.getOrCreateProgress(userId);
    const baseXP = XP_ACTIONS[action] || 0;
    const xpAwarded = Math.floor(baseXP * multiplier);

    progress.xp += xpAwarded;
    progress.totalXpEarned += xpAwarded;

    // Check for level up
    const newLevelData = this.calculateLevelFromXP(progress.totalXpEarned);
    const levelUp = newLevelData.level > progress.level;
    const rewards: Reward[] = [];

    if (levelUp) {
      const oldLevel = progress.level;
      progress.level = newLevelData.level;
      progress.xpToNextLevel = newLevelData.xpToNext;

      // Award level up rewards
      const coinReward = newLevelData.level * 100;
      progress.timeCoins += coinReward;

      rewards.push({
        id: `level_${newLevelData.level}_${Date.now()}`,
        type: 'coins',
        amount: coinReward,
        description: `Level ${newLevelData.level} reward`,
        source: 'level_up',
        earnedAt: new Date(),
      });

      // Update tier if needed
      progress.tier = this.calculateTier(progress.totalXpEarned);

      this.emit('levelUp', { userId, oldLevel, newLevel: newLevelData.level, rewards });
    }

    progress.xpToNextLevel = newLevelData.xpToNext - newLevelData.currentXP;
    this.userProgress.set(userId, progress);

    this.emit('xpAwarded', { userId, action, xpAwarded, totalXP: progress.totalXpEarned });

    return {
      xpAwarded,
      levelUp,
      newLevel: levelUp ? newLevelData.level : undefined,
      rewards: rewards.length > 0 ? rewards : undefined,
    };
  }

  calculateTier(totalXP: number): UserProgress['tier'] {
    if (totalXP >= TIER_THRESHOLDS.legend) return 'legend';
    if (totalXP >= TIER_THRESHOLDS.diamond) return 'diamond';
    if (totalXP >= TIER_THRESHOLDS.platinum) return 'platinum';
    if (totalXP >= TIER_THRESHOLDS.gold) return 'gold';
    if (totalXP >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
  }

  // ============================================================
  // ACHIEVEMENTS
  // ============================================================

  async updateAchievementProgress(userId: string, achievementId: string, progressDelta: number): Promise<{
    achievement: Achievement;
    completed: boolean;
    rewards?: Reward[];
  } | null> {
    const progress = this.getOrCreateProgress(userId);
    const achievement = progress.achievements.find(a => a.id === achievementId);

    if (!achievement || achievement.isComplete) return null;

    achievement.progress = Math.min(achievement.progress + progressDelta, achievement.target);

    if (achievement.progress >= achievement.target && !achievement.isComplete) {
      achievement.isComplete = true;
      achievement.unlockedAt = new Date();

      // Award XP and coins
      await this.awardXP(userId, 'completeTrade', achievement.xpReward / XP_ACTIONS.completeTrade);
      progress.timeCoins += achievement.coinReward;

      const rewards: Reward[] = [
        {
          id: `ach_${achievementId}_xp_${Date.now()}`,
          type: 'xp',
          amount: achievement.xpReward,
          description: `Achievement: ${achievement.name}`,
          source: 'achievement',
          earnedAt: new Date(),
        },
        {
          id: `ach_${achievementId}_coins_${Date.now()}`,
          type: 'coins',
          amount: achievement.coinReward,
          description: `Achievement: ${achievement.name}`,
          source: 'achievement',
          earnedAt: new Date(),
        },
      ];

      this.emit('achievementUnlocked', { userId, achievement, rewards });

      return { achievement, completed: true, rewards };
    }

    this.userProgress.set(userId, progress);
    return { achievement, completed: false };
  }

  checkAchievements(userId: string, event: {
    type: 'trade' | 'follow' | 'follower' | 'profit' | 'streak' | 'chat' | 'course' | 'backtest';
    data: any;
  }): void {
    const progress = this.getOrCreateProgress(userId);

    switch (event.type) {
      case 'trade':
        this.updateAchievementProgress(userId, 'first_trade', 1);
        this.updateAchievementProgress(userId, 'ten_trades', 1);
        this.updateAchievementProgress(userId, 'hundred_trades', 1);
        this.updateAchievementProgress(userId, 'thousand_trades', 1);

        if (event.data.profitable) {
          this.updateAchievementProgress(userId, 'first_win', 1);
        }

        // Night owl check
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 5) {
          this.updateAchievementProgress(userId, 'night_owl', 1);
        }
        break;

      case 'streak':
        if (event.data.winStreak >= 5) {
          this.updateAchievementProgress(userId, 'win_streak_5', 1);
        }
        if (event.data.winStreak >= 10) {
          this.updateAchievementProgress(userId, 'win_streak_10', 1);
        }
        break;

      case 'profit':
        this.updateAchievementProgress(userId, 'profit_1k', event.data.totalProfit);
        this.updateAchievementProgress(userId, 'profit_10k', event.data.totalProfit);
        this.updateAchievementProgress(userId, 'profit_100k', event.data.totalProfit);
        break;

      case 'follower':
        this.updateAchievementProgress(userId, 'first_follower', 1);
        this.updateAchievementProgress(userId, 'followers_100', 1);
        this.updateAchievementProgress(userId, 'followers_1000', 1);
        break;

      case 'chat':
        this.updateAchievementProgress(userId, 'chat_active', 1);
        break;

      case 'course':
        this.updateAchievementProgress(userId, 'complete_tutorial', 1);
        this.updateAchievementProgress(userId, 'complete_all_courses', 1);
        break;

      case 'backtest':
        this.updateAchievementProgress(userId, 'backtest_master', 1);
        break;
    }
  }

  // ============================================================
  // CHALLENGES
  // ============================================================

  initializeDailyChallenges(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.activeChallenges = [
      {
        id: `daily_trades_${today.getTime()}`,
        name: 'Day Trader',
        description: 'Complete 5 trades today',
        type: 'daily',
        category: 'trading',
        target: 5,
        xpReward: 100,
        coinReward: 200,
        startDate: today,
        endDate: tomorrow,
        difficulty: 'easy',
      },
      {
        id: `daily_profit_${today.getTime()}`,
        name: 'Profit Seeker',
        description: 'Earn $100 profit today',
        type: 'daily',
        category: 'trading',
        target: 100,
        xpReward: 150,
        coinReward: 300,
        startDate: today,
        endDate: tomorrow,
        difficulty: 'medium',
      },
      {
        id: `daily_social_${today.getTime()}`,
        name: 'Social Butterfly',
        description: 'Send 10 chat messages',
        type: 'daily',
        category: 'social',
        target: 10,
        xpReward: 50,
        coinReward: 100,
        startDate: today,
        endDate: tomorrow,
        difficulty: 'easy',
      },
      {
        id: `daily_win_${today.getTime()}`,
        name: 'Winner Takes All',
        description: 'Win 3 trades in a row',
        type: 'daily',
        category: 'trading',
        target: 3,
        xpReward: 200,
        coinReward: 400,
        startDate: today,
        endDate: tomorrow,
        difficulty: 'hard',
      },
    ];
  }

  initializeWeeklyChallenges(): void {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    this.activeChallenges.push(
      {
        id: `weekly_trades_${startOfWeek.getTime()}`,
        name: 'Weekly Warrior',
        description: 'Complete 25 trades this week',
        type: 'weekly',
        category: 'trading',
        target: 25,
        xpReward: 500,
        coinReward: 1000,
        startDate: startOfWeek,
        endDate: endOfWeek,
        difficulty: 'medium',
      },
      {
        id: `weekly_profit_${startOfWeek.getTime()}`,
        name: 'Profit Master',
        description: 'Earn $500 profit this week',
        type: 'weekly',
        category: 'trading',
        target: 500,
        xpReward: 750,
        coinReward: 1500,
        startDate: startOfWeek,
        endDate: endOfWeek,
        difficulty: 'hard',
      },
      {
        id: `weekly_followers_${startOfWeek.getTime()}`,
        name: 'Growing Influence',
        description: 'Gain 10 new followers this week',
        type: 'weekly',
        category: 'social',
        target: 10,
        xpReward: 400,
        coinReward: 800,
        startDate: startOfWeek,
        endDate: endOfWeek,
        difficulty: 'medium',
      },
      {
        id: `weekly_winrate_${startOfWeek.getTime()}`,
        name: 'Consistent Winner',
        description: 'Maintain 60%+ win rate with 20+ trades',
        type: 'weekly',
        category: 'trading',
        target: 60,
        xpReward: 1000,
        coinReward: 2000,
        bonusReward: 'Exclusive "Consistent" badge',
        startDate: startOfWeek,
        endDate: endOfWeek,
        difficulty: 'extreme',
      }
    );
  }

  getActiveChallenges(type?: 'daily' | 'weekly' | 'monthly' | 'seasonal'): Challenge[] {
    const now = new Date();
    return this.activeChallenges.filter(c => {
      const isActive = c.startDate <= now && c.endDate > now;
      return type ? isActive && c.type === type : isActive;
    });
  }

  async updateChallengeProgress(userId: string, challengeId: string, progressDelta: number): Promise<{
    challenge: Challenge;
    progress: number;
    completed: boolean;
    rewards?: Reward[];
  } | null> {
    const progress = this.getOrCreateProgress(userId);
    let challengeProgress = progress.challenges.find(c => c.challengeId === challengeId);

    if (!challengeProgress) {
      const challenge = this.activeChallenges.find(c => c.id === challengeId);
      if (!challenge) return null;

      challengeProgress = {
        challengeId,
        challenge,
        progress: 0,
        isComplete: false,
        claimed: false,
      };
      progress.challenges.push(challengeProgress);
    }

    if (challengeProgress.isComplete) return null;

    challengeProgress.progress = Math.min(
      challengeProgress.progress + progressDelta,
      challengeProgress.challenge.target
    );

    if (challengeProgress.progress >= challengeProgress.challenge.target) {
      challengeProgress.isComplete = true;
      challengeProgress.completedAt = new Date();

      this.emit('challengeCompleted', { userId, challenge: challengeProgress.challenge });
    }

    this.userProgress.set(userId, progress);

    return {
      challenge: challengeProgress.challenge,
      progress: challengeProgress.progress,
      completed: challengeProgress.isComplete,
    };
  }

  async claimChallengeReward(userId: string, challengeId: string): Promise<Reward[] | null> {
    const progress = this.getOrCreateProgress(userId);
    const challengeProgress = progress.challenges.find(c => c.challengeId === challengeId);

    if (!challengeProgress || !challengeProgress.isComplete || challengeProgress.claimed) {
      return null;
    }

    challengeProgress.claimed = true;

    // Award rewards
    await this.awardXP(
      userId,
      'completeTrade',
      challengeProgress.challenge.xpReward / XP_ACTIONS.completeTrade
    );
    progress.timeCoins += challengeProgress.challenge.coinReward;

    const rewards: Reward[] = [
      {
        id: `challenge_${challengeId}_xp_${Date.now()}`,
        type: 'xp',
        amount: challengeProgress.challenge.xpReward,
        description: `Challenge: ${challengeProgress.challenge.name}`,
        source: 'challenge',
        earnedAt: new Date(),
      },
      {
        id: `challenge_${challengeId}_coins_${Date.now()}`,
        type: 'coins',
        amount: challengeProgress.challenge.coinReward,
        description: `Challenge: ${challengeProgress.challenge.name}`,
        source: 'challenge',
        earnedAt: new Date(),
      },
    ];

    this.userProgress.set(userId, progress);
    this.emit('challengeRewardClaimed', { userId, challenge: challengeProgress.challenge, rewards });

    return rewards;
  }

  // ============================================================
  // STREAKS
  // ============================================================

  async recordDailyActivity(userId: string): Promise<{
    streakUpdated: boolean;
    currentStreak: number;
    rewards?: Reward[];
  }> {
    const progress = this.getOrCreateProgress(userId);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (progress.lastActivityDate === today) {
      return { streakUpdated: false, currentStreak: progress.currentStreak };
    }

    const rewards: Reward[] = [];

    if (progress.lastActivityDate === yesterday) {
      // Continue streak
      progress.currentStreak++;

      // Award daily login XP
      await this.awardXP(userId, 'dailyLogin');

      // Check for streak milestones
      if (progress.currentStreak === 7) {
        await this.awardXP(userId, 'weeklyStreak');
        rewards.push({
          id: `streak_7_${Date.now()}`,
          type: 'xp',
          amount: XP_ACTIONS.weeklyStreak,
          description: '7-day streak bonus!',
          source: 'streak',
          earnedAt: new Date(),
        });
      } else if (progress.currentStreak === 30) {
        await this.awardXP(userId, 'monthlyStreak');
        progress.timeCoins += 1000;
        rewards.push({
          id: `streak_30_${Date.now()}`,
          type: 'coins',
          amount: 1000,
          description: '30-day streak bonus!',
          source: 'streak',
          earnedAt: new Date(),
        });
      }

      if (progress.currentStreak > progress.longestStreak) {
        progress.longestStreak = progress.currentStreak;
      }
    } else {
      // Reset streak
      progress.currentStreak = 1;
      await this.awardXP(userId, 'dailyLogin');
    }

    progress.lastActivityDate = today;
    this.userProgress.set(userId, progress);

    this.emit('streakUpdated', { userId, currentStreak: progress.currentStreak });

    return {
      streakUpdated: true,
      currentStreak: progress.currentStreak,
      rewards: rewards.length > 0 ? rewards : undefined,
    };
  }

  // ============================================================
  // LEADERBOARDS
  // ============================================================

  getLeaderboard(metric: 'xp' | 'profit' | 'winRate' | 'trades' | 'followers', limit: number = 50): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    this.userProgress.forEach((progress, userId) => {
      let metricValue = 0;

      switch (metric) {
        case 'xp':
          metricValue = progress.totalXpEarned;
          break;
        case 'profit':
          // Would need to fetch from trade data
          metricValue = 0;
          break;
        case 'winRate':
          // Would need to fetch from trade data
          metricValue = 0;
          break;
        case 'trades':
          // Would need to fetch from trade data
          metricValue = 0;
          break;
        case 'followers':
          // Would need to fetch from social data
          metricValue = 0;
          break;
      }

      entries.push({
        userId,
        username: `User_${userId.substring(0, 8)}`,
        avatar: userId.substring(0, 2).toUpperCase(),
        level: progress.level,
        tier: progress.tier,
        xp: progress.totalXpEarned,
        rank: 0,
        badges: progress.badges.filter(b => b.isDisplayed),
        metric: metricValue,
      });
    });

    // Sort by metric
    entries.sort((a, b) => b.metric - a.metric);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries.slice(0, limit);
  }

  getUserRank(userId: string, metric: 'xp' | 'profit' | 'winRate' | 'trades' | 'followers'): number {
    const leaderboard = this.getLeaderboard(metric, 10000);
    const entry = leaderboard.find(e => e.userId === userId);
    return entry?.rank || 0;
  }

  // ============================================================
  // TIME COINS (Virtual Currency)
  // ============================================================

  async awardCoins(userId: string, amount: number, reason: string): Promise<{ newBalance: number }> {
    const progress = this.getOrCreateProgress(userId);
    progress.timeCoins += amount;
    this.userProgress.set(userId, progress);

    this.emit('coinsAwarded', { userId, amount, reason, newBalance: progress.timeCoins });

    return { newBalance: progress.timeCoins };
  }

  async spendCoins(userId: string, amount: number, itemId: string): Promise<{
    success: boolean;
    newBalance: number;
    error?: string;
  }> {
    const progress = this.getOrCreateProgress(userId);

    if (progress.timeCoins < amount) {
      return {
        success: false,
        newBalance: progress.timeCoins,
        error: 'Insufficient TIME Coins',
      };
    }

    progress.timeCoins -= amount;
    this.userProgress.set(userId, progress);

    this.emit('coinsSpent', { userId, amount, itemId, newBalance: progress.timeCoins });

    return { success: true, newBalance: progress.timeCoins };
  }

  getCoinBalance(userId: string): number {
    const progress = this.getOrCreateProgress(userId);
    return progress.timeCoins;
  }

  // ============================================================
  // REFERRAL SYSTEM
  // ============================================================

  generateReferralCode(userId: string): string {
    const progress = this.getOrCreateProgress(userId);
    if (!progress.referralCode) {
      progress.referralCode = `TIME_${userId.substring(0, 6).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;
      this.userProgress.set(userId, progress);
    }
    return progress.referralCode;
  }

  async processReferral(referrerUserId: string, newUserId: string): Promise<{
    referrerReward: Reward;
    newUserReward: Reward;
  }> {
    const referrerProgress = this.getOrCreateProgress(referrerUserId);
    const newUserProgress = this.getOrCreateProgress(newUserId);

    referrerProgress.referralCount++;

    // Award referrer
    await this.awardXP(referrerUserId, 'referralSignup');
    const referrerCoinReward = 500;
    referrerProgress.timeCoins += referrerCoinReward;
    referrerProgress.referralEarnings += referrerCoinReward;

    // Award new user
    const newUserCoinReward = 250;
    newUserProgress.timeCoins += newUserCoinReward;

    this.userProgress.set(referrerUserId, referrerProgress);
    this.userProgress.set(newUserId, newUserProgress);

    const referrerReward: Reward = {
      id: `referral_${referrerUserId}_${Date.now()}`,
      type: 'coins',
      amount: referrerCoinReward,
      description: 'Referral bonus',
      source: 'referral',
      earnedAt: new Date(),
    };

    const newUserReward: Reward = {
      id: `welcome_${newUserId}_${Date.now()}`,
      type: 'coins',
      amount: newUserCoinReward,
      description: 'Welcome bonus (referred)',
      source: 'referral',
      earnedAt: new Date(),
    };

    this.emit('referralProcessed', { referrerUserId, newUserId, referrerReward, newUserReward });

    return { referrerReward, newUserReward };
  }

  async processReferralFirstTrade(referrerUserId: string): Promise<Reward> {
    const referrerProgress = this.getOrCreateProgress(referrerUserId);

    await this.awardXP(referrerUserId, 'referralFirstTrade');
    const coinReward = 1000;
    referrerProgress.timeCoins += coinReward;
    referrerProgress.referralEarnings += coinReward;

    this.userProgress.set(referrerUserId, referrerProgress);

    const reward: Reward = {
      id: `referral_trade_${referrerUserId}_${Date.now()}`,
      type: 'coins',
      amount: coinReward,
      description: 'Referral first trade bonus',
      source: 'referral',
      earnedAt: new Date(),
    };

    this.emit('referralFirstTrade', { referrerUserId, reward });

    return reward;
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private getOrCreateProgress(userId: string): UserProgress {
    let progress = this.userProgress.get(userId);

    if (!progress) {
      progress = {
        userId,
        level: 1,
        xp: 0,
        xpToNextLevel: this.calculateXPForLevel(1),
        totalXpEarned: 0,
        timeCoins: 100, // Starting bonus
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        achievements: JSON.parse(JSON.stringify(ACHIEVEMENTS)), // Deep copy
        badges: [],
        challenges: [],
        rank: 0,
        tier: 'bronze',
        seasonPoints: 0,
        referralCode: '',
        referralCount: 0,
        referralEarnings: 0,
      };
      this.userProgress.set(userId, progress);
    }

    return progress;
  }

  getUserProgress(userId: string): UserProgress {
    return this.getOrCreateProgress(userId);
  }

  getAchievements(userId: string): Achievement[] {
    const progress = this.getOrCreateProgress(userId);
    return progress.achievements;
  }

  getBadges(userId: string): Badge[] {
    const progress = this.getOrCreateProgress(userId);
    return progress.badges;
  }

  // ============================================================
  // SEASONAL EVENTS
  // ============================================================

  createSeasonalEvent(event: Omit<SeasonalEvent, 'isActive' | 'leaderboard'>): SeasonalEvent {
    const seasonalEvent: SeasonalEvent = {
      ...event,
      isActive: new Date() >= event.startDate && new Date() <= event.endDate,
      leaderboard: [],
    };

    this.currentEvent = seasonalEvent;
    return seasonalEvent;
  }

  getCurrentEvent(): SeasonalEvent | null {
    if (this.currentEvent) {
      this.currentEvent.isActive =
        new Date() >= this.currentEvent.startDate &&
        new Date() <= this.currentEvent.endDate;
    }
    return this.currentEvent;
  }

  async awardSeasonPoints(userId: string, points: number): Promise<{ newTotal: number }> {
    const progress = this.getOrCreateProgress(userId);
    progress.seasonPoints += points;
    this.userProgress.set(userId, progress);

    this.emit('seasonPointsAwarded', { userId, points, newTotal: progress.seasonPoints });

    return { newTotal: progress.seasonPoints };
  }
}

// Export singleton instance
export const gamificationEngine = new GamificationEngine();

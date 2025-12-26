/**
 * Social Trading Database Schemas
 *
 * Complete schemas for the TIME social trading platform:
 * - Leaderboard entries (trader & bot)
 * - Follow/copy relationships
 * - Community chat messages & channels
 * - Achievements & badges
 * - Trade feed entries
 * - User social profiles
 */

// ============================================================
// LEADERBOARD SCHEMAS
// ============================================================

export interface TraderLeaderboardEntry {
  _id: string;

  // User info
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  isPublic: boolean;           // Anonymous mode toggle
  verified: boolean;
  isPro: boolean;

  // Rankings
  rank: number;
  previousRank: number;        // For trend calculation
  rankChange: number;

  // Performance metrics
  totalPnL: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  avgTradeSize: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgHoldingPeriod: number;    // in minutes

  // Time-based returns
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  yearlyReturn: number;
  allTimeReturn: number;

  // Streaks
  currentStreak: number;       // consecutive wins/losses
  streakType: 'win' | 'loss' | 'none';
  bestWinStreak: number;
  bestLossStreak: number;

  // Social metrics
  followers: number;
  following: number;
  copiers: number;
  copiedValue: number;         // Total AUM copying this trader

  // Trading style
  tradingStyle: 'scalper' | 'day_trader' | 'swing_trader' | 'position_trader' | 'mixed';
  preferredAssets: string[];
  preferredTimeframes: string[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';

  // Activity
  lastTradeAt: Date;
  tradesThisWeek: number;
  tradesThisMonth: number;
  activeHoursPerDay: number;

  // Achievements
  badges: string[];
  achievementCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Cache control
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time';
  cacheExpiry: Date;
}

export interface BotLeaderboardEntry {
  _id: string;

  // Bot info
  botId: string;
  botName: string;
  botDescription: string;
  botAvatar?: string;

  // Owner info
  ownerId: string;
  ownerUsername: string;
  ownerAvatar: string;
  ownerVerified: boolean;

  // Rankings
  rank: number;
  previousRank: number;
  rankChange: number;
  category: 'trend_following' | 'mean_reversion' | 'momentum' | 'breakout' | 'scalping' | 'arbitrage' | 'ml_ai' | 'hybrid';

  // Performance
  totalPnL: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  avgTradeReturn: number;

  // Time-based returns
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  yearlyReturn: number;
  allTimeReturn: number;

  // Social metrics
  followers: number;
  copiers: number;
  rentals: number;             // How many users renting this bot
  downloads: number;
  rating: number;              // 1-5 star rating
  reviewCount: number;

  // Bot config
  supportedAssets: string[];
  timeframes: string[];
  minEquity: number;
  profitShare: number;         // % of profits for bot owner

  // Status
  status: 'active' | 'paused' | 'maintenance' | 'deprecated';
  uptime: number;              // % uptime last 30 days
  lastSignalAt: Date;
  signalsToday: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Cache
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time';
  cacheExpiry: Date;
}

// ============================================================
// FOLLOW & COPY SCHEMAS
// ============================================================

export interface FollowRelationship {
  _id: string;
  followerId: string;
  followingId: string;
  followingType: 'trader' | 'bot';

  // Timestamps
  followedAt: Date;

  // Notifications
  notifyOnTrade: boolean;
  notifyOnSignal: boolean;
  notifyDaily: boolean;

  // Status
  isActive: boolean;
  mutedUntil?: Date;
}

export interface CopyRelationship {
  _id: string;

  // Users
  copierId: string;
  copierUsername: string;
  providerId: string;
  providerType: 'trader' | 'bot';
  providerName: string;

  // Configuration
  mode: 'proportional' | 'fixed_amount' | 'fixed_lot' | 'risk_based';
  allocatedAmount: number;
  currentValue: number;
  maxRiskPerTrade: number;     // % of allocated
  maxDailyRisk: number;
  maxOpenTrades: number;
  copyRatio: number;           // 0.5 = half, 1 = same, 2 = double

  // Filters
  copySymbols: string[] | 'all';
  excludeSymbols: string[];
  minTradeSize: number;
  maxTradeSize: number;
  copyDirection: 'same' | 'inverse' | 'both';

  // Protection
  maxSlippage: number;         // pips
  delayMs: number;             // delay before copying
  stopLossOverride?: number;
  takeProfitOverride?: number;
  maxDailyLoss: number;
  pauseOnDrawdown: number;     // pause if DD exceeds %

  // Performance
  totalCopiedTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  totalPnLPercent: number;
  currentOpenTrades: number;

  // Status
  status: 'active' | 'paused' | 'stopped' | 'exceeded_limits';
  pausedReason?: string;

  // Timestamps
  startedAt: Date;
  lastCopiedAt?: Date;
  pausedAt?: Date;
  stoppedAt?: Date;
  updatedAt: Date;
}

// ============================================================
// COMMUNITY CHAT SCHEMAS
// ============================================================

export interface ChatChannel {
  _id: string;
  channelId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'general' | 'crypto' | 'stocks' | 'forex' | 'options' | 'futures' | 'bots' | 'strategies' | 'help';

  // Settings
  isActive: boolean;
  isPublic: boolean;
  isReadOnly: boolean;
  requiresVerification: boolean;
  requiresPro: boolean;
  minAccountAge: number;       // days

  // Stats
  memberCount: number;
  messageCount: number;
  activeToday: number;
  lastMessageAt: Date;

  // Moderation
  moderators: string[];
  bannedUsers: BannedUser[];
  mutedUsers: MutedUser[];
  slowMode: number;            // seconds between messages, 0 = off

  // Pinned
  pinnedMessages: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface BannedUser {
  userId: string;
  username: string;
  bannedBy: string;
  bannedAt: Date;
  reason: string;
  expiresAt?: Date;            // null = permanent
}

export interface MutedUser {
  userId: string;
  mutedBy: string;
  mutedAt: Date;
  reason: string;
  expiresAt: Date;
}

export interface ChatMessage {
  _id: string;
  messageId: string;
  channelId: string;

  // Sender
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;
  role: 'user' | 'moderator' | 'admin';
  badges: string[];

  // Content
  content: string;
  contentType: 'text' | 'trade_share' | 'bot_share' | 'chart' | 'image' | 'gif';

  // Attachments
  attachments?: MessageAttachment[];

  // Mentions
  mentions: string[];          // @usernames

  // Reactions
  reactions: MessageReaction[];

  // Thread
  replyToId?: string;
  replyToUser?: string;
  threadCount: number;

  // Moderation
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: Date;
  deletedReason?: string;
  isPinned: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
  isReported: boolean;
  reportCount: number;

  // Timestamps
  timestamp: Date;
}

export interface MessageAttachment {
  type: 'trade' | 'bot' | 'chart' | 'image' | 'gif';
  data: Record<string, any>;
  url?: string;
  thumbnailUrl?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatReport {
  _id: string;
  messageId: string;
  channelId: string;
  reporterId: string;
  reason: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'scam' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  action?: 'none' | 'warning' | 'delete' | 'mute' | 'ban';
  createdAt: Date;
}

// ============================================================
// ACHIEVEMENTS & BADGES SCHEMAS
// ============================================================

export interface Achievement {
  _id: string;
  achievementId: string;
  name: string;
  description: string;
  category: 'trading' | 'social' | 'bot' | 'milestone' | 'special' | 'seasonal';

  // Display
  icon: string;
  iconColor: string;
  backgroundColor: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;

  // Requirements
  requirement: AchievementRequirement;

  // Stats
  totalEarned: number;
  percentOwned: number;        // % of users who have this

  // Status
  isActive: boolean;
  isHidden: boolean;           // Secret achievements
  isLimited: boolean;          // Time-limited
  availableFrom?: Date;
  availableUntil?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementRequirement {
  type: 'count' | 'amount' | 'streak' | 'percentage' | 'time' | 'special';
  metric: string;              // e.g., 'trades', 'wins', 'followers', 'pnl'
  target: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time';
  conditions?: Record<string, any>;
}

export interface UserAchievement {
  _id: string;

  // User
  userId: string;
  username: string;

  // Achievement
  achievementId: string;
  achievementName: string;
  category: string;
  rarity: string;
  points: number;

  // Progress (for incomplete)
  progress: number;
  target: number;
  isComplete: boolean;

  // Display
  isDisplayed: boolean;        // Show on profile
  displayOrder: number;

  // Timestamps
  startedAt: Date;
  completedAt?: Date;
  claimedAt?: Date;

  // Rewards
  rewardsClaimed: boolean;
  rewards?: AchievementReward[];
}

export interface AchievementReward {
  type: 'points' | 'badge' | 'title' | 'feature' | 'discount' | 'credits';
  value: any;
  claimed: boolean;
  claimedAt?: Date;
}

export interface Badge {
  _id: string;
  badgeId: string;
  name: string;
  description: string;
  category: 'trading' | 'social' | 'special' | 'verified' | 'staff' | 'partner';

  // Display
  icon: string;
  color: string;
  backgroundColor: string;
  animation?: string;          // e.g., 'glow', 'pulse', 'sparkle'

  // Requirements
  requirements?: string;       // Description of how to earn
  achievementId?: string;      // Linked achievement

  // Priority
  priority: number;            // Higher = shown first

  // Status
  isActive: boolean;
  isLimited: boolean;

  // Stats
  totalHolders: number;

  // Timestamps
  createdAt: Date;
}

export interface UserBadge {
  _id: string;
  userId: string;
  badgeId: string;
  badgeName: string;

  // Display
  isDisplayed: boolean;
  displayOrder: number;
  isPrimary: boolean;          // Primary badge shown everywhere

  // How earned
  earnedVia: 'achievement' | 'manual' | 'purchase' | 'event' | 'promotion';
  achievementId?: string;
  grantedBy?: string;

  // Timestamps
  earnedAt: Date;
  expiresAt?: Date;
}

// ============================================================
// TRADE FEED SCHEMAS
// ============================================================

export interface TradeFeedEntry {
  _id: string;

  // Trader
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;
  isPublic: boolean;

  // Trade info
  tradeId: string;
  symbol: string;
  assetType: 'stock' | 'crypto' | 'forex' | 'options' | 'futures';
  direction: 'long' | 'short';
  action: 'open' | 'close' | 'partial_close' | 'add' | 'reduce';

  // Prices
  entryPrice?: number;
  exitPrice?: number;
  currentPrice?: number;
  quantity: number;
  positionValue: number;

  // P&L (for closed trades)
  pnl?: number;
  pnlPercent?: number;
  holdingPeriod?: number;      // minutes

  // Trade quality
  winLoss?: 'win' | 'loss' | 'breakeven';

  // Social
  likes: number;
  comments: number;
  copies: number;              // How many copied this trade
  shares: number;

  // User interactions (for current user)
  isLiked?: boolean;
  isCopied?: boolean;

  // Optional details
  notes?: string;
  strategy?: string;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;

  // Status
  isEdited: boolean;
  isDeleted: boolean;
  isHidden: boolean;

  // Timestamps
  tradeTime: Date;
  postedAt: Date;
  updatedAt: Date;
}

export interface TradeFeedComment {
  _id: string;
  feedEntryId: string;

  // Commenter
  userId: string;
  username: string;
  avatar: string;
  verified: boolean;

  // Content
  content: string;

  // Reactions
  likes: number;
  isLiked?: boolean;

  // Thread
  replyToId?: string;
  replyToUser?: string;
  replyCount: number;

  // Moderation
  isEdited: boolean;
  isDeleted: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// USER SOCIAL PROFILE SCHEMAS
// ============================================================

export interface UserSocialProfile {
  _id: string;
  userId: string;

  // Display
  username: string;
  displayName: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;

  // Privacy
  isPublic: boolean;
  showRealName: boolean;
  showTrades: boolean;
  showPositions: boolean;
  showPnL: boolean;
  showStats: boolean;
  allowCopy: boolean;
  allowFollow: boolean;
  allowMessages: boolean;

  // Verification
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationType?: 'identity' | 'professional' | 'partner';

  // Status
  isPro: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  status: 'active' | 'restricted' | 'suspended' | 'banned';

  // Social stats
  followers: number;
  following: number;
  copiers: number;
  trades: number;
  posts: number;
  likes: number;
  achievementPoints: number;

  // Activity
  memberSince: Date;
  lastActiveAt: Date;
  lastTradeAt?: Date;
  lastPostAt?: Date;

  // Trading stats (cached)
  tradingStats?: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    totalReturn: number;
    avgTradeSize: number;
    bestTrade: number;
    worstTrade: number;
    currentStreak: number;
    updatedAt: Date;
  };

  // Badges
  primaryBadge?: string;
  displayedBadges: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// PREDEFINED ACHIEVEMENTS
// ============================================================

export const PREDEFINED_ACHIEVEMENTS: Omit<Achievement, '_id' | 'totalEarned' | 'percentOwned' | 'createdAt' | 'updatedAt'>[] = [
  // Trading milestones
  {
    achievementId: 'first_trade',
    name: 'First Steps',
    description: 'Complete your first trade',
    category: 'trading',
    icon: 'Rocket',
    iconColor: '#60A5FA',
    backgroundColor: '#1E3A5F',
    rarity: 'common',
    points: 10,
    requirement: { type: 'count', metric: 'trades', target: 1 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'ten_trades',
    name: 'Getting Started',
    description: 'Complete 10 trades',
    category: 'trading',
    icon: 'Target',
    iconColor: '#34D399',
    backgroundColor: '#1A3A2F',
    rarity: 'common',
    points: 25,
    requirement: { type: 'count', metric: 'trades', target: 10 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'hundred_trades',
    name: 'Centurion',
    description: 'Complete 100 trades',
    category: 'milestone',
    icon: 'Award',
    iconColor: '#F59E0B',
    backgroundColor: '#3D2A0A',
    rarity: 'uncommon',
    points: 100,
    requirement: { type: 'count', metric: 'trades', target: 100 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'thousand_trades',
    name: 'Trading Master',
    description: 'Complete 1,000 trades',
    category: 'milestone',
    icon: 'Crown',
    iconColor: '#A855F7',
    backgroundColor: '#2D1B4E',
    rarity: 'rare',
    points: 500,
    requirement: { type: 'count', metric: 'trades', target: 1000 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  // Win streaks
  {
    achievementId: 'first_win',
    name: 'Winner',
    description: 'Close your first profitable trade',
    category: 'trading',
    icon: 'Trophy',
    iconColor: '#FBBF24',
    backgroundColor: '#3D2A0A',
    rarity: 'common',
    points: 15,
    requirement: { type: 'count', metric: 'wins', target: 1 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'ten_wins',
    name: 'Ten Timer',
    description: 'Win 10 trades',
    category: 'trading',
    icon: 'Zap',
    iconColor: '#F97316',
    backgroundColor: '#3D1F0A',
    rarity: 'common',
    points: 50,
    requirement: { type: 'count', metric: 'wins', target: 10 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'win_streak_5',
    name: 'Hot Streak',
    description: 'Win 5 trades in a row',
    category: 'trading',
    icon: 'Flame',
    iconColor: '#EF4444',
    backgroundColor: '#3D0A0A',
    rarity: 'uncommon',
    points: 75,
    requirement: { type: 'streak', metric: 'win_streak', target: 5 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'win_streak_10',
    name: 'Unstoppable',
    description: 'Win 10 trades in a row',
    category: 'trading',
    icon: 'Sparkles',
    iconColor: '#EC4899',
    backgroundColor: '#3D0A2A',
    rarity: 'rare',
    points: 200,
    requirement: { type: 'streak', metric: 'win_streak', target: 10 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  // Profit milestones
  {
    achievementId: 'profit_1k',
    name: 'First Thousand',
    description: 'Earn $1,000 in total profit',
    category: 'milestone',
    icon: 'DollarSign',
    iconColor: '#10B981',
    backgroundColor: '#0A3D2A',
    rarity: 'uncommon',
    points: 100,
    requirement: { type: 'amount', metric: 'total_pnl', target: 1000 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'profit_10k',
    name: 'Five Figures',
    description: 'Earn $10,000 in total profit',
    category: 'milestone',
    icon: 'TrendingUp',
    iconColor: '#22C55E',
    backgroundColor: '#0A3D1A',
    rarity: 'rare',
    points: 300,
    requirement: { type: 'amount', metric: 'total_pnl', target: 10000 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'profit_100k',
    name: 'Six Figure Trader',
    description: 'Earn $100,000 in total profit',
    category: 'milestone',
    icon: 'Gem',
    iconColor: '#3B82F6',
    backgroundColor: '#0A1A3D',
    rarity: 'epic',
    points: 1000,
    requirement: { type: 'amount', metric: 'total_pnl', target: 100000 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  // Social achievements
  {
    achievementId: 'first_follower',
    name: 'Getting Popular',
    description: 'Get your first follower',
    category: 'social',
    icon: 'UserPlus',
    iconColor: '#8B5CF6',
    backgroundColor: '#1E1A3D',
    rarity: 'common',
    points: 20,
    requirement: { type: 'count', metric: 'followers', target: 1 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'followers_100',
    name: 'Rising Star',
    description: 'Reach 100 followers',
    category: 'social',
    icon: 'Star',
    iconColor: '#FBBF24',
    backgroundColor: '#3D2A0A',
    rarity: 'uncommon',
    points: 150,
    requirement: { type: 'count', metric: 'followers', target: 100 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'followers_1000',
    name: 'Influencer',
    description: 'Reach 1,000 followers',
    category: 'social',
    icon: 'Users',
    iconColor: '#EC4899',
    backgroundColor: '#3D0A2A',
    rarity: 'rare',
    points: 500,
    requirement: { type: 'count', metric: 'followers', target: 1000 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'first_copier',
    name: 'Lead by Example',
    description: 'Have someone copy your trades',
    category: 'social',
    icon: 'Copy',
    iconColor: '#14B8A6',
    backgroundColor: '#0A3D3A',
    rarity: 'uncommon',
    points: 50,
    requirement: { type: 'count', metric: 'copiers', target: 1 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'copiers_50',
    name: 'Trading Leader',
    description: 'Have 50 people copying your trades',
    category: 'social',
    icon: 'Crown',
    iconColor: '#F59E0B',
    backgroundColor: '#3D2A0A',
    rarity: 'epic',
    points: 400,
    requirement: { type: 'count', metric: 'copiers', target: 50 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  // Win rate achievements
  {
    achievementId: 'winrate_60',
    name: 'Consistent Winner',
    description: 'Maintain 60%+ win rate over 50 trades',
    category: 'trading',
    icon: 'Target',
    iconColor: '#22C55E',
    backgroundColor: '#0A3D1A',
    rarity: 'uncommon',
    points: 100,
    requirement: { type: 'percentage', metric: 'win_rate', target: 60, conditions: { minTrades: 50 } },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  {
    achievementId: 'winrate_70',
    name: 'Sharp Shooter',
    description: 'Maintain 70%+ win rate over 100 trades',
    category: 'trading',
    icon: 'Crosshair',
    iconColor: '#3B82F6',
    backgroundColor: '#0A1A3D',
    rarity: 'rare',
    points: 250,
    requirement: { type: 'percentage', metric: 'win_rate', target: 70, conditions: { minTrades: 100 } },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
  // Special achievements
  {
    achievementId: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined TIME in the first year',
    category: 'special',
    icon: 'Clock',
    iconColor: '#6366F1',
    backgroundColor: '#1A1A3D',
    rarity: 'legendary',
    points: 500,
    requirement: { type: 'special', metric: 'join_date', target: 0 },
    isActive: true,
    isHidden: false,
    isLimited: true,
    availableUntil: new Date('2026-01-01'),
  },
  {
    achievementId: 'night_owl',
    name: 'Night Owl',
    description: 'Complete 50 trades between midnight and 5am',
    category: 'special',
    icon: 'Moon',
    iconColor: '#8B5CF6',
    backgroundColor: '#1E1A3D',
    rarity: 'rare',
    points: 100,
    requirement: { type: 'count', metric: 'night_trades', target: 50, conditions: { hours: [0, 1, 2, 3, 4, 5] } },
    isActive: true,
    isHidden: true,
    isLimited: false,
  },
  {
    achievementId: 'diversified',
    name: 'Diversified',
    description: 'Trade in 5 different asset classes',
    category: 'trading',
    icon: 'PieChart',
    iconColor: '#F97316',
    backgroundColor: '#3D1F0A',
    rarity: 'uncommon',
    points: 75,
    requirement: { type: 'count', metric: 'asset_classes', target: 5 },
    isActive: true,
    isHidden: false,
    isLimited: false,
  },
];

// ============================================================
// PREDEFINED BADGES
// ============================================================

export const PREDEFINED_BADGES: Omit<Badge, '_id' | 'totalHolders' | 'createdAt'>[] = [
  // Verified badges
  {
    badgeId: 'verified',
    name: 'Verified',
    description: 'Verified trader identity',
    category: 'verified',
    icon: 'CheckCircle',
    color: '#3B82F6',
    backgroundColor: '#1E3A5F',
    priority: 100,
    isActive: true,
    isLimited: false,
  },
  {
    badgeId: 'pro_trader',
    name: 'Pro Trader',
    description: 'Professional trading account',
    category: 'verified',
    icon: 'Shield',
    color: '#A855F7',
    backgroundColor: '#2D1B4E',
    animation: 'glow',
    priority: 95,
    isActive: true,
    isLimited: false,
  },
  // Performance badges
  {
    badgeId: 'top_trader',
    name: 'Top Trader',
    description: 'Top 10 on the leaderboard',
    category: 'trading',
    icon: 'Crown',
    color: '#F59E0B',
    backgroundColor: '#3D2A0A',
    animation: 'sparkle',
    priority: 90,
    isActive: true,
    isLimited: false,
    requirements: 'Reach top 10 on monthly leaderboard',
  },
  {
    badgeId: 'elite_trader',
    name: 'Elite Trader',
    description: 'Top 1% by performance',
    category: 'trading',
    icon: 'Gem',
    color: '#EC4899',
    backgroundColor: '#3D0A2A',
    animation: 'pulse',
    priority: 85,
    isActive: true,
    isLimited: false,
    requirements: 'Maintain top 1% performance for 30 days',
  },
  {
    badgeId: 'consistent',
    name: 'Consistent',
    description: 'Consistent profitable months',
    category: 'trading',
    icon: 'TrendingUp',
    color: '#10B981',
    backgroundColor: '#0A3D2A',
    priority: 80,
    isActive: true,
    isLimited: false,
    requirements: 'Be profitable for 6 consecutive months',
  },
  // Social badges
  {
    badgeId: 'community_leader',
    name: 'Community Leader',
    description: 'Active community contributor',
    category: 'social',
    icon: 'Users',
    color: '#6366F1',
    backgroundColor: '#1A1A3D',
    priority: 75,
    isActive: true,
    isLimited: false,
    requirements: 'Help 100+ community members',
  },
  {
    badgeId: 'signal_master',
    name: 'Signal Master',
    description: 'High-quality signal provider',
    category: 'trading',
    icon: 'Zap',
    color: '#F97316',
    backgroundColor: '#3D1F0A',
    priority: 70,
    isActive: true,
    isLimited: false,
    requirements: '70%+ signal accuracy over 100 signals',
  },
  // Staff badges
  {
    badgeId: 'staff',
    name: 'Staff',
    description: 'TIME team member',
    category: 'staff',
    icon: 'BadgeCheck',
    color: '#EF4444',
    backgroundColor: '#3D0A0A',
    priority: 100,
    isActive: true,
    isLimited: true,
  },
  {
    badgeId: 'moderator',
    name: 'Moderator',
    description: 'Community moderator',
    category: 'staff',
    icon: 'Shield',
    color: '#22C55E',
    backgroundColor: '#0A3D1A',
    priority: 90,
    isActive: true,
    isLimited: true,
  },
  // Partner badges
  {
    badgeId: 'partner',
    name: 'Partner',
    description: 'Official TIME partner',
    category: 'partner',
    icon: 'Handshake',
    color: '#14B8A6',
    backgroundColor: '#0A3D3A',
    priority: 85,
    isActive: true,
    isLimited: true,
  },
  // Special badges
  {
    badgeId: 'og',
    name: 'OG',
    description: 'Original TIME member',
    category: 'special',
    icon: 'Star',
    color: '#FBBF24',
    backgroundColor: '#3D2A0A',
    animation: 'sparkle',
    priority: 100,
    isActive: true,
    isLimited: true,
    requirements: 'Joined during beta',
  },
];

// ============================================================
// PREDEFINED CHAT CHANNELS
// ============================================================

export const PREDEFINED_CHANNELS: Omit<ChatChannel, '_id' | 'memberCount' | 'messageCount' | 'activeToday' | 'lastMessageAt' | 'createdAt' | 'updatedAt'>[] = [
  {
    channelId: 'general',
    name: 'General',
    description: 'General trading discussion',
    icon: 'MessageCircle',
    color: '#3B82F6',
    category: 'general',
    isActive: true,
    isPublic: true,
    isReadOnly: false,
    requiresVerification: false,
    requiresPro: false,
    minAccountAge: 0,
    moderators: [],
    bannedUsers: [],
    mutedUsers: [],
    slowMode: 0,
    pinnedMessages: [],
  },
  {
    channelId: 'crypto',
    name: 'Crypto Trading',
    description: 'Bitcoin, Ethereum, and altcoin discussion',
    icon: 'Bitcoin',
    color: '#F59E0B',
    category: 'crypto',
    isActive: true,
    isPublic: true,
    isReadOnly: false,
    requiresVerification: false,
    requiresPro: false,
    minAccountAge: 1,
    moderators: [],
    bannedUsers: [],
    mutedUsers: [],
    slowMode: 0,
    pinnedMessages: [],
  },
  {
    channelId: 'stocks',
    name: 'Stocks & ETFs',
    description: 'Stock market and ETF discussion',
    icon: 'TrendingUp',
    color: '#22C55E',
    category: 'stocks',
    isActive: true,
    isPublic: true,
    isReadOnly: false,
    requiresVerification: false,
    requiresPro: false,
    minAccountAge: 1,
    moderators: [],
    bannedUsers: [],
    mutedUsers: [],
    slowMode: 0,
    pinnedMessages: [],
  },
  {
    channelId: 'forex',
    name: 'Forex',
    description: 'Currency trading discussion',
    icon: 'DollarSign',
    color: '#8B5CF6',
    category: 'forex',
    isActive: true,
    isPublic: true,
    isReadOnly: false,
    requiresVerification: false,
    requiresPro: false,
    minAccountAge: 1,
    moderators: [],
    bannedUsers: [],
    mutedUsers: [],
    slowMode: 0,
    pinnedMessages: [],
  },
  {
    channelId: 'options',
    name: 'Options',
    description: 'Options trading strategies',
    icon: 'Layers',
    color: '#EC4899',
    category: 'options',
    isActive: true,
    isPublic: true,
    isReadOnly: false,
    requiresVerification: false,
    requiresPro: false,
    minAccountAge: 7,
    moderators: [],
    bannedUsers: [],
    mutedUsers: [],
    slowMode: 0,
    pinnedMessages: [],
  },
  {
    channelId: 'bots',
    name: 'Trading Bots',
    description: 'Bot development and automation',
    icon: 'Bot',
    color: '#14B8A6',
    category: 'bots',
    isActive: true,
    isPublic: true,
    isReadOnly: false,
    requiresVerification: false,
    requiresPro: false,
    minAccountAge: 7,
    moderators: [],
    bannedUsers: [],
    mutedUsers: [],
    slowMode: 0,
    pinnedMessages: [],
  },
  {
    channelId: 'strategies',
    name: 'Strategy Lab',
    description: 'Strategy development and backtesting',
    icon: 'Beaker',
    color: '#6366F1',
    category: 'strategies',
    isActive: true,
    isPublic: true,
    isReadOnly: false,
    requiresVerification: false,
    requiresPro: false,
    minAccountAge: 7,
    moderators: [],
    bannedUsers: [],
    mutedUsers: [],
    slowMode: 0,
    pinnedMessages: [],
  },
  {
    channelId: 'help',
    name: 'Help & Support',
    description: 'Get help from the community',
    icon: 'HelpCircle',
    color: '#F97316',
    category: 'help',
    isActive: true,
    isPublic: true,
    isReadOnly: false,
    requiresVerification: false,
    requiresPro: false,
    minAccountAge: 0,
    moderators: [],
    bannedUsers: [],
    mutedUsers: [],
    slowMode: 5,
    pinnedMessages: [],
  },
];

// ============================================================
// DATABASE INDEXES
// ============================================================

export const socialIndexes = {
  traderLeaderboard: [
    { period: 1, rank: 1 },
    { userId: 1, period: 1 },
    { monthlyReturn: -1, period: 1 },
    { winRate: -1, period: 1 },
    { followers: -1 },
    { cacheExpiry: 1 },
  ],
  botLeaderboard: [
    { period: 1, rank: 1 },
    { botId: 1, period: 1 },
    { monthlyReturn: -1, period: 1 },
    { rating: -1 },
    { copiers: -1 },
    { cacheExpiry: 1 },
  ],
  followRelationships: [
    { followerId: 1, followingId: 1, unique: true },
    { followerId: 1, followedAt: -1 },
    { followingId: 1, followedAt: -1 },
    { followingType: 1 },
  ],
  copyRelationships: [
    { copierId: 1, providerId: 1, unique: true },
    { copierId: 1, startedAt: -1 },
    { providerId: 1, status: 1 },
    { status: 1 },
  ],
  chatChannels: [
    { channelId: 1, unique: true },
    { category: 1, isActive: 1 },
    { lastMessageAt: -1 },
  ],
  chatMessages: [
    { channelId: 1, timestamp: -1 },
    { userId: 1, timestamp: -1 },
    { messageId: 1, unique: true },
    { isPinned: 1, channelId: 1 },
    { isDeleted: 1 },
  ],
  chatReports: [
    { status: 1, createdAt: -1 },
    { messageId: 1 },
    { reporterId: 1 },
  ],
  achievements: [
    { achievementId: 1, unique: true },
    { category: 1, isActive: 1 },
    { rarity: 1 },
  ],
  userAchievements: [
    { userId: 1, achievementId: 1, unique: true },
    { userId: 1, isComplete: 1, completedAt: -1 },
    { achievementId: 1, isComplete: 1 },
  ],
  badges: [
    { badgeId: 1, unique: true },
    { category: 1, isActive: 1 },
    { priority: -1 },
  ],
  userBadges: [
    { userId: 1, badgeId: 1, unique: true },
    { userId: 1, earnedAt: -1 },
    { userId: 1, isPrimary: 1 },
  ],
  tradeFeed: [
    { postedAt: -1 },
    { userId: 1, postedAt: -1 },
    { symbol: 1, postedAt: -1 },
    { assetType: 1, postedAt: -1 },
    { isDeleted: 1 },
  ],
  tradeFeedComments: [
    { feedEntryId: 1, createdAt: -1 },
    { userId: 1, createdAt: -1 },
    { replyToId: 1 },
  ],
  userSocialProfiles: [
    { userId: 1, unique: true },
    { username: 1, unique: true },
    { followers: -1 },
    { isPublic: 1, status: 1 },
  ],
};

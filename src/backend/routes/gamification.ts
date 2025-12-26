/**
 * TIME BEYOND US - Gamification Routes
 *
 * API endpoints for the gamification system:
 * - User progress & stats
 * - Achievements
 * - Challenges
 * - Leaderboards
 * - TIME Coins
 * - Referrals
 * - Streaks
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { gamificationEngine } from '../gamification/gamification_engine';

const router = Router();

// ============================================================
// USER PROGRESS
// ============================================================

/**
 * GET /gamification/progress
 * Get current user's gamification progress
 */
router.get('/progress', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const progress = gamificationEngine.getUserProgress(user.id);

  res.json({
    success: true,
    data: {
      userId: progress.userId,
      level: progress.level,
      xp: progress.xp,
      xpToNextLevel: progress.xpToNextLevel,
      totalXpEarned: progress.totalXpEarned,
      tier: progress.tier,
      timeCoins: progress.timeCoins,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      rank: progress.rank,
      seasonPoints: progress.seasonPoints,
      achievementsUnlocked: progress.achievements.filter(a => a.isComplete).length,
      totalAchievements: progress.achievements.length,
      badgesEarned: progress.badges.filter(b => b.isEarned).length,
    },
  });
});

/**
 * POST /gamification/activity
 * Record daily activity (login streak)
 */
router.post('/activity', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const result = await gamificationEngine.recordDailyActivity(user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// XP & LEVELING
// ============================================================

/**
 * GET /gamification/level-info
 * Get level progression info
 */
router.get('/level-info', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const progress = gamificationEngine.getUserProgress(user.id);

  const levelInfo = {
    currentLevel: progress.level,
    currentXP: progress.xp,
    xpToNextLevel: progress.xpToNextLevel,
    totalXPEarned: progress.totalXpEarned,
    tier: progress.tier,
    tierProgress: getTierProgress(progress.totalXpEarned, progress.tier),
    nextTier: getNextTier(progress.tier),
    xpToNextTier: getXPToNextTier(progress.totalXpEarned, progress.tier),
  };

  res.json({ success: true, data: levelInfo });
});

function getTierProgress(totalXP: number, tier: string): number {
  const thresholds: any = {
    bronze: { min: 0, max: 1000 },
    silver: { min: 1000, max: 5000 },
    gold: { min: 5000, max: 15000 },
    platinum: { min: 15000, max: 50000 },
    diamond: { min: 50000, max: 100000 },
    legend: { min: 100000, max: 500000 },
  };
  const { min, max } = thresholds[tier] || { min: 0, max: 1000 };
  return Math.min(100, ((totalXP - min) / (max - min)) * 100);
}

function getNextTier(tier: string): string | null {
  const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend'];
  const idx = tiers.indexOf(tier);
  return idx < tiers.length - 1 ? tiers[idx + 1] : null;
}

function getXPToNextTier(totalXP: number, tier: string): number {
  const thresholds: any = {
    bronze: 1000,
    silver: 5000,
    gold: 15000,
    platinum: 50000,
    diamond: 100000,
    legend: 500000,
  };
  const nextTier = getNextTier(tier);
  if (!nextTier) return 0;
  return Math.max(0, thresholds[nextTier] - totalXP);
}

// ============================================================
// ACHIEVEMENTS
// ============================================================

/**
 * GET /gamification/achievements
 * Get all achievements with user progress
 */
router.get('/achievements', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const achievements = gamificationEngine.getAchievements(user.id);

  // Group by category
  const grouped = {
    trading: achievements.filter(a => a.category === 'trading'),
    social: achievements.filter(a => a.category === 'social'),
    learning: achievements.filter(a => a.category === 'learning'),
    milestone: achievements.filter(a => a.category === 'milestone'),
    special: achievements.filter(a => a.category === 'special'),
  };

  const stats = {
    total: achievements.length,
    unlocked: achievements.filter(a => a.isComplete).length,
    common: achievements.filter(a => a.rarity === 'common' && a.isComplete).length,
    uncommon: achievements.filter(a => a.rarity === 'uncommon' && a.isComplete).length,
    rare: achievements.filter(a => a.rarity === 'rare' && a.isComplete).length,
    epic: achievements.filter(a => a.rarity === 'epic' && a.isComplete).length,
    legendary: achievements.filter(a => a.rarity === 'legendary' && a.isComplete).length,
  };

  res.json({
    success: true,
    data: {
      achievements: grouped,
      stats,
      recentUnlocks: achievements
        .filter(a => a.isComplete)
        .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
        .slice(0, 5),
    },
  });
});

/**
 * GET /gamification/achievements/:id
 * Get specific achievement details
 */
router.get('/achievements/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const achievements = gamificationEngine.getAchievements(user.id);
  const achievement = achievements.find(a => a.id === id);

  if (!achievement) {
    return res.status(404).json({ success: false, error: 'Achievement not found' });
  }

  res.json({ success: true, data: achievement });
});

// ============================================================
// CHALLENGES
// ============================================================

/**
 * GET /gamification/challenges
 * Get active challenges
 */
router.get('/challenges', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { type } = req.query;

  const challenges = gamificationEngine.getActiveChallenges(type as any);
  const progress = gamificationEngine.getUserProgress(user.id);

  const challengesWithProgress = challenges.map(challenge => {
    const userProgress = progress.challenges.find(c => c.challengeId === challenge.id);
    return {
      ...challenge,
      progress: userProgress?.progress || 0,
      isComplete: userProgress?.isComplete || false,
      claimed: userProgress?.claimed || false,
    };
  });

  // Group by type
  const grouped = {
    daily: challengesWithProgress.filter(c => c.type === 'daily'),
    weekly: challengesWithProgress.filter(c => c.type === 'weekly'),
    monthly: challengesWithProgress.filter(c => c.type === 'monthly'),
    seasonal: challengesWithProgress.filter(c => c.type === 'seasonal'),
  };

  res.json({
    success: true,
    data: {
      challenges: grouped,
      totalActive: challenges.length,
      completed: challengesWithProgress.filter(c => c.isComplete).length,
      claimable: challengesWithProgress.filter(c => c.isComplete && !c.claimed).length,
    },
  });
});

/**
 * POST /gamification/challenges/:id/claim
 * Claim challenge reward
 */
router.post('/challenges/:id/claim', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const rewards = await gamificationEngine.claimChallengeReward(user.id, id);

    if (!rewards) {
      return res.status(400).json({
        success: false,
        error: 'Challenge not complete or already claimed',
      });
    }

    res.json({
      success: true,
      data: { rewards },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// LEADERBOARDS
// ============================================================

/**
 * GET /gamification/leaderboard
 * Get leaderboard rankings
 */
router.get('/leaderboard', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { metric = 'xp', limit = '50' } = req.query;

  const leaderboard = gamificationEngine.getLeaderboard(
    metric as 'xp' | 'profit' | 'winRate' | 'trades' | 'followers',
    parseInt(limit as string)
  );

  const userRank = gamificationEngine.getUserRank(
    user.id,
    metric as 'xp' | 'profit' | 'winRate' | 'trades' | 'followers'
  );

  res.json({
    success: true,
    data: {
      leaderboard,
      userRank,
      metric,
      totalParticipants: leaderboard.length,
    },
  });
});

/**
 * GET /gamification/leaderboard/user-position
 * Get current user's position on various leaderboards
 */
router.get('/leaderboard/user-position', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;

  const positions = {
    xp: gamificationEngine.getUserRank(user.id, 'xp'),
    profit: gamificationEngine.getUserRank(user.id, 'profit'),
    winRate: gamificationEngine.getUserRank(user.id, 'winRate'),
    trades: gamificationEngine.getUserRank(user.id, 'trades'),
    followers: gamificationEngine.getUserRank(user.id, 'followers'),
  };

  res.json({ success: true, data: positions });
});

// ============================================================
// TIME COINS
// ============================================================

/**
 * GET /gamification/coins
 * Get TIME Coins balance
 */
router.get('/coins', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const balance = gamificationEngine.getCoinBalance(user.id);
  const progress = gamificationEngine.getUserProgress(user.id);

  res.json({
    success: true,
    data: {
      balance,
      lifetimeEarned: progress.totalXpEarned * 2, // Rough estimate
      fromReferrals: progress.referralEarnings,
    },
  });
});

/**
 * GET /gamification/coins/shop
 * Get items available in the TIME Coins shop
 */
router.get('/coins/shop', authMiddleware, (req: Request, res: Response) => {
  // Shop items users can purchase with TIME Coins
  const shopItems = [
    {
      id: 'premium_badge_gold',
      name: 'Gold Premium Badge',
      description: 'Display a gold premium badge on your profile',
      category: 'badges',
      price: 5000,
      available: true,
    },
    {
      id: 'profile_banner_1',
      name: 'Cyberpunk Banner',
      description: 'Cyberpunk-themed profile banner',
      category: 'cosmetics',
      price: 2500,
      available: true,
    },
    {
      id: 'avatar_frame_fire',
      name: 'Fire Avatar Frame',
      description: 'Animated fire frame around your avatar',
      category: 'cosmetics',
      price: 3500,
      available: true,
    },
    {
      id: 'xp_boost_24h',
      name: '24h XP Boost (2x)',
      description: 'Double XP for 24 hours',
      category: 'boosts',
      price: 1000,
      available: true,
    },
    {
      id: 'coin_boost_24h',
      name: '24h Coin Boost (1.5x)',
      description: '1.5x TIME Coins for 24 hours',
      category: 'boosts',
      price: 1500,
      available: true,
    },
    {
      id: 'strategy_slot',
      name: 'Extra Strategy Slot',
      description: 'Unlock one additional strategy slot',
      category: 'features',
      price: 10000,
      available: true,
    },
    {
      id: 'name_change',
      name: 'Username Change',
      description: 'Change your display name',
      category: 'features',
      price: 500,
      available: true,
    },
  ];

  res.json({ success: true, data: { items: shopItems } });
});

/**
 * POST /gamification/coins/purchase
 * Purchase an item with TIME Coins
 */
router.post('/coins/purchase', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { itemId, price } = req.body;

  if (!itemId || !price) {
    return res.status(400).json({ success: false, error: 'Item ID and price required' });
  }

  try {
    const result = await gamificationEngine.spendCoins(user.id, price, itemId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: {
        itemId,
        newBalance: result.newBalance,
        message: 'Purchase successful!',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// REFERRALS
// ============================================================

/**
 * GET /gamification/referral
 * Get user's referral info
 */
router.get('/referral', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const progress = gamificationEngine.getUserProgress(user.id);
  const code = gamificationEngine.generateReferralCode(user.id);

  res.json({
    success: true,
    data: {
      referralCode: code,
      referralLink: `https://timebeyondus.com/r/${code}`,
      totalReferrals: progress.referralCount,
      totalEarnings: progress.referralEarnings,
      rewards: {
        perSignup: 500,
        perFirstTrade: 1000,
      },
    },
  });
});

/**
 * POST /gamification/referral/apply
 * Apply a referral code (for new users)
 */
router.post('/referral/apply', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, error: 'Referral code required' });
  }

  // Find referrer by code
  // In production, lookup referrer from database
  const referrerId = code.split('_')[1]; // Extract user ID from code

  if (!referrerId) {
    return res.status(400).json({ success: false, error: 'Invalid referral code' });
  }

  try {
    const result = await gamificationEngine.processReferral(referrerId, user.id);

    res.json({
      success: true,
      data: {
        message: 'Referral applied successfully!',
        yourReward: result.newUserReward,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// STREAKS
// ============================================================

/**
 * GET /gamification/streaks
 * Get user's streak info
 */
router.get('/streaks', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const progress = gamificationEngine.getUserProgress(user.id);

  const milestones = [
    { days: 7, reward: '100 XP', achieved: progress.longestStreak >= 7 },
    { days: 14, reward: '250 XP + 500 Coins', achieved: progress.longestStreak >= 14 },
    { days: 30, reward: '500 XP + 1000 Coins', achieved: progress.longestStreak >= 30 },
    { days: 60, reward: '1000 XP + 2500 Coins', achieved: progress.longestStreak >= 60 },
    { days: 90, reward: '2500 XP + 5000 Coins + Badge', achieved: progress.longestStreak >= 90 },
    { days: 365, reward: '10000 XP + 25000 Coins + Legendary Badge', achieved: progress.longestStreak >= 365 },
  ];

  res.json({
    success: true,
    data: {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      lastActivityDate: progress.lastActivityDate,
      milestones,
      nextMilestone: milestones.find(m => !m.achieved),
    },
  });
});

// ============================================================
// BADGES
// ============================================================

/**
 * GET /gamification/badges
 * Get all badges with earned status
 */
router.get('/badges', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const badges = gamificationEngine.getBadges(user.id);

  // Add default badges if empty
  const allBadges = badges.length > 0 ? badges : getDefaultBadges();

  // Group by category
  const grouped = {
    verified: allBadges.filter(b => b.category === 'verified'),
    trading: allBadges.filter(b => b.category === 'trading'),
    social: allBadges.filter(b => b.category === 'social'),
    special: allBadges.filter(b => b.category === 'special'),
    seasonal: allBadges.filter(b => b.category === 'seasonal'),
  };

  res.json({
    success: true,
    data: {
      badges: grouped,
      total: allBadges.length,
      earned: allBadges.filter(b => b.isEarned).length,
      displayed: allBadges.filter(b => b.isDisplayed),
      primary: allBadges.find(b => b.isPrimary),
    },
  });
});

/**
 * PUT /gamification/badges/:id/display
 * Toggle badge display on profile
 */
router.put('/badges/:id/display', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { isDisplayed, isPrimary } = req.body;

  // In production, update badge display settings in database

  res.json({
    success: true,
    data: {
      badgeId: id,
      isDisplayed,
      isPrimary,
    },
  });
});

function getDefaultBadges() {
  return [
    {
      id: 'verified',
      name: 'Verified',
      description: 'Verified trader identity',
      category: 'verified',
      icon: 'Shield',
      color: '#3B82F6',
      backgroundColor: '#1E3A5F',
      isEarned: false,
      isPrimary: false,
      isDisplayed: false,
      priority: 100,
    },
    {
      id: 'top_trader',
      name: 'Top Trader',
      description: 'Ranked in top 10 on monthly leaderboard',
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
      id: 'consistent',
      name: 'Consistent',
      description: '6 consecutive profitable months',
      category: 'trading',
      icon: 'TrendingUp',
      color: '#10B981',
      backgroundColor: '#0A3D2A',
      isEarned: false,
      isPrimary: false,
      isDisplayed: false,
      priority: 80,
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
      description: 'Active community contributor with 500+ helpful posts',
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
      description: 'High-quality signal provider with 70%+ success rate',
      category: 'trading',
      icon: 'Zap',
      color: '#F97316',
      backgroundColor: '#3D1F0A',
      isEarned: false,
      isPrimary: false,
      isDisplayed: false,
      priority: 70,
    },
    {
      id: 'early_adopter',
      name: 'Early Adopter',
      description: 'Joined during beta period',
      category: 'special',
      icon: 'Rocket',
      color: '#8B5CF6',
      backgroundColor: '#1E1A3D',
      isEarned: false,
      isPrimary: false,
      isDisplayed: false,
      priority: 95,
    },
  ];
}

// ============================================================
// SEASONAL EVENTS
// ============================================================

/**
 * GET /gamification/events
 * Get current seasonal event
 */
router.get('/events', authMiddleware, (req: Request, res: Response) => {
  const event = gamificationEngine.getCurrentEvent();

  if (!event) {
    return res.json({
      success: true,
      data: {
        activeEvent: null,
        message: 'No active event',
      },
    });
  }

  res.json({
    success: true,
    data: {
      activeEvent: {
        id: event.id,
        name: event.name,
        description: event.description,
        theme: event.theme,
        startDate: event.startDate,
        endDate: event.endDate,
        isActive: event.isActive,
        rewards: event.rewards,
        challenges: event.challenges,
      },
    },
  });
});

/**
 * GET /gamification/events/leaderboard
 * Get seasonal event leaderboard
 */
router.get('/events/leaderboard', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const event = gamificationEngine.getCurrentEvent();

  if (!event) {
    return res.json({
      success: true,
      data: {
        leaderboard: [],
        userPosition: null,
      },
    });
  }

  const progress = gamificationEngine.getUserProgress(user.id);

  res.json({
    success: true,
    data: {
      leaderboard: event.leaderboard,
      userPoints: progress.seasonPoints,
      userPosition: null, // Calculate based on season points
    },
  });
});

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

/**
 * POST /gamification/admin/award-xp (admin only)
 * Manually award XP to a user
 */
router.post('/admin/award-xp', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId, amount, reason } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ success: false, error: 'User ID and amount required' });
  }

  try {
    const result = await gamificationEngine.awardXP(
      userId,
      'completeTrade',
      amount / 10 // Convert to multiplier
    );

    res.json({
      success: true,
      data: {
        userId,
        xpAwarded: result.xpAwarded,
        levelUp: result.levelUp,
        newLevel: result.newLevel,
        reason,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /gamification/admin/award-coins (admin only)
 * Manually award TIME Coins to a user
 */
router.post('/admin/award-coins', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId, amount, reason } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ success: false, error: 'User ID and amount required' });
  }

  try {
    const result = await gamificationEngine.awardCoins(userId, amount, reason);

    res.json({
      success: true,
      data: {
        userId,
        coinsAwarded: amount,
        newBalance: result.newBalance,
        reason,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /gamification/admin/create-event (admin only)
 * Create a seasonal event
 */
router.post('/admin/create-event', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { name, description, theme, startDate, endDate, rewards, challenges } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'Name, start date, and end date required' });
  }

  try {
    const event = gamificationEngine.createSeasonalEvent({
      id: `event_${Date.now()}`,
      name,
      description: description || '',
      theme: theme || 'default',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rewards: rewards || [],
      challenges: challenges || [],
    });

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

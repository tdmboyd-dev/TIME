/**
 * TIME Social Trading Routes
 *
 * API endpoints for autonomous social trading:
 * - Signal provider management
 * - Copy trading configuration
 * - Collective intelligence
 * - AI recommendations
 * - Leaderboard
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { socialTradingEngine } from '../engines/social_trading_engine';

const router = Router();

// ============================================================
// SIGNAL PROVIDERS
// ============================================================

/**
 * GET /social/providers
 * List all signal providers with filtering
 */
router.get('/providers', authMiddleware, (req: Request, res: Response) => {
  const { platform, type, minScore, status, limit = '50' } = req.query;

  const providers = socialTradingEngine.getAllProviders({
    platform: platform as string | undefined,
    type: type as string | undefined,
    minScore: minScore ? parseInt(minScore as string) : undefined,
    status: status as string | undefined,
  }).slice(0, parseInt(limit as string));

  res.json({
    total: providers.length,
    providers: providers.map(p => ({
      id: p.id,
      name: p.name,
      platform: p.platform,
      type: p.type,
      verified: p.verified,
      aiScore: p.aiScore,
      followers: p.followers,
      copiedValue: p.copiedValue,
      riskProfile: p.riskProfile,
      status: p.status,
      performance: {
        winRate: p.performance.winRate,
        profitFactor: p.performance.profitFactor,
        sharpeRatio: p.performance.sharpeRatio,
        maxDrawdown: p.performance.maxDrawdown,
        totalSignals: p.performance.totalSignals,
        riskAdjustedReturn: p.performance.riskAdjustedReturn,
      },
    })),
  });
});

/**
 * GET /social/providers/:providerId
 * Get detailed provider information
 */
router.get('/providers/:providerId', authMiddleware, (req: Request, res: Response) => {
  const { providerId } = req.params;
  const provider = socialTradingEngine.getProvider(providerId);

  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  res.json({ provider });
});

/**
 * POST /social/providers
 * Register as a signal provider
 */
router.post('/providers', authMiddleware, async (req: Request, res: Response) => {
  const {
    name,
    platform,
    type,
    riskProfile,
    preferredSymbols,
    minimumEquity,
    profitShare,
  } = req.body;

  if (!name || !platform) {
    return res.status(400).json({ error: 'Name and platform are required' });
  }

  try {
    const provider = await socialTradingEngine.registerProvider({
      name,
      platform,
      type: type || 'manual',
      verified: false,
      performance: {
        totalSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        winRate: 0,
        avgWinPips: 0,
        avgLossPips: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        avgHoldingTime: 0,
        consistency: 0,
        regimePerformance: {} as any,
        monthlyReturns: [],
        riskAdjustedReturn: 0,
        qualityScore: 50,
      },
      followers: 0,
      copiedValue: 0,
      riskProfile: riskProfile || 'moderate',
      preferredSymbols: preferredSymbols || [],
      preferredRegimes: [],
      weekRegimes: [],
      minimumEquity: minimumEquity || 0,
      profitShare: profitShare || 0,
      status: 'pending_review',
    });

    res.status(201).json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        status: provider.status,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// COPY TRADING
// ============================================================

/**
 * GET /social/copy
 * Get user's copy trading configurations
 */
router.get('/copy', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const configs = socialTradingEngine.getUserCopyConfigs(user.id);

  res.json({
    total: configs.length,
    configs: configs.map(c => ({
      providerId: c.providerId,
      mode: c.mode,
      status: c.status,
      maxRiskPerTrade: c.maxRiskPerTrade,
      maxOpenTrades: c.maxOpenTrades,
      startedAt: c.startedAt,
      totalPnL: c.totalPnL,
      totalTrades: c.totalTrades,
    })),
  });
});

/**
 * POST /social/copy
 * Start copy trading a provider
 */
router.post('/copy', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    providerId,
    mode = 'proportional',
    maxRiskPerTrade = 2,
    maxDailyRisk = 10,
    maxOpenTrades = 5,
    lotMultiplier = 1,
    fixedLotSize,
    slippage = 3,
    delay = 0,
    inverseMode = false,
    symbols = 'all',
    excludeSymbols = [],
    regimeFilter = 'auto',
  } = req.body;

  if (!providerId) {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  try {
    const config = await socialTradingEngine.setupCopyTrading({
      userId: user.id,
      providerId,
      mode,
      maxRiskPerTrade,
      maxDailyRisk,
      maxOpenTrades,
      lotMultiplier,
      fixedLotSize,
      slippage,
      delay,
      inverseMode,
      symbols,
      excludeSymbols,
      regimeFilter,
      status: 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Copy trading started',
      config: {
        providerId: config.providerId,
        mode: config.mode,
        status: config.status,
        startedAt: config.startedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /social/copy/:providerId
 * Stop copy trading a provider
 */
router.delete('/copy/:providerId', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { providerId } = req.params;

  try {
    await socialTradingEngine.stopCopyTrading(user.id, providerId);

    res.json({
      success: true,
      message: 'Copy trading stopped',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// COLLECTIVE INTELLIGENCE
// ============================================================

/**
 * GET /social/intelligence
 * Get collective intelligence for all tracked symbols
 */
router.get('/intelligence', authMiddleware, (req: Request, res: Response) => {
  const intelligence = socialTradingEngine.getAllCollectiveIntelligence();

  res.json({
    total: intelligence.length,
    symbols: intelligence.map(i => ({
      symbol: i.symbol,
      consensusDirection: i.consensusDirection,
      consensusStrength: i.consensusStrength,
      longVotes: i.longVotes,
      shortVotes: i.shortVotes,
      neutralVotes: i.neutralVotes,
      totalProviders: i.totalProviders,
      weightedConfidence: i.weightedConfidence,
      timestamp: i.timestamp,
    })),
  });
});

/**
 * GET /social/intelligence/:symbol
 * Get collective intelligence for a specific symbol
 */
router.get('/intelligence/:symbol', authMiddleware, async (req: Request, res: Response) => {
  const { symbol } = req.params;

  const intel = await socialTradingEngine.aggregateCollectiveIntelligence(symbol.toUpperCase());

  res.json({ intelligence: intel });
});

// ============================================================
// AI RECOMMENDATIONS
// ============================================================

/**
 * GET /social/recommendations
 * Get AI-powered provider recommendations
 */
router.get('/recommendations', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { riskTolerance, maxProviders = '5' } = req.query;

  try {
    const recommendations = await socialTradingEngine.getAIRecommendations(user.id, {
      riskTolerance: riskTolerance as 'low' | 'medium' | 'high' | undefined,
      maxProviders: parseInt(maxProviders as string),
    });

    res.json({
      recommended: recommendations.recommended.map(p => ({
        id: p.id,
        name: p.name,
        platform: p.platform,
        type: p.type,
        aiScore: p.aiScore,
        winRate: p.performance.winRate,
        profitFactor: p.performance.profitFactor,
        riskProfile: p.riskProfile,
      })),
      reasoning: recommendations.reasoning,
      diversificationScore: recommendations.diversificationScore,
      expectedReturn: recommendations.expectedReturn,
      expectedDrawdown: recommendations.expectedDrawdown,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// FOLLOW/UNFOLLOW TRADERS
// ============================================================

/**
 * POST /social/follow/:userId
 * Follow a trader
 */
router.post('/follow/:userId', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // In production, this would update the database
    res.json({
      success: true,
      message: `Started following user ${userId}`,
      userId,
      isFollowing: true,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /social/follow/:userId
 * Unfollow a trader
 */
router.delete('/follow/:userId', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // In production, this would update the database
    res.json({
      success: true,
      message: `Unfollowed user ${userId}`,
      userId,
      isFollowing: false,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /social/followers
 * Get user's followers
 */
router.get('/followers', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;

  // In production, this would fetch from database
  res.json({
    success: true,
    followers: [],
    count: 0,
  });
});

/**
 * GET /social/following
 * Get users that current user is following
 */
router.get('/following', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;

  // In production, this would fetch from database
  res.json({
    success: true,
    following: [],
    count: 0,
  });
});

// ============================================================
// LEADERBOARD
// ============================================================

/**
 * GET /social/leaderboard
 * Get trader/bot leaderboard with caching
 */
router.get('/leaderboard', authMiddleware, async (req: Request, res: Response) => {
  const {
    period = 'monthly',
    type = 'traders',
    assetClass = 'all',
    minTrades = '0',
    limit = '50'
  } = req.query;

  try {
    // In production, this would fetch from MongoDB with caching
    // Check cache first, if expired, recalculate from trades collection

    // Generate demo leaderboard data
    const leaderboard = Array.from({ length: parseInt(limit as string) }, (_, i) => {
      const assetClasses = ['stocks', 'crypto', 'forex', 'options'];
      const strategies = ['Day Trading', 'Swing Trading', 'Scalping', 'Momentum', 'Mean Reversion', 'Trend Following'];
      const randomAsset = assetClasses[Math.floor(Math.random() * assetClasses.length)];

      // Calculate time-based profit based on period
      const periodMultiplier = {
        'daily': 1,
        'weekly': 3,
        'monthly': 12,
        'all-time': 50
      }[period as string] || 12;

      const baseProfit = 150 - (i * 2.5);
      const profit = baseProfit * (periodMultiplier / 12);

      return {
        id: `trader-${i + 1}`,
        userId: `user-${i + 1}`,
        username: `Trader${String(i + 1).padStart(3, '0')}`,
        rank: i + 1,
        avatar: String.fromCharCode(65 + (i % 26)),
        verified: i < 10,
        isPro: i < 5,
        profitPercent: profit + Math.random() * 10,
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
        isFollowing: false,
        lastUpdated: new Date(),
      };
    });

    // Filter by asset class if specified
    const filteredLeaderboard = assetClass === 'all'
      ? leaderboard
      : leaderboard.filter(t => t.assetClass === assetClass);

    // Filter by min trades
    const minTradesNum = parseInt(minTrades as string);
    const finalLeaderboard = filteredLeaderboard.filter(t => t.totalTrades >= minTradesNum);

    res.json({
      success: true,
      period,
      type,
      total: finalLeaderboard.length,
      leaderboard: finalLeaderboard,
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// COMMUNITY CHAT
// ============================================================

/**
 * GET /social/chat/channels
 * Get all available chat channels
 */
router.get('/chat/channels', authMiddleware, (req: Request, res: Response) => {
  // In production, this would fetch from MongoDB
  const channels = [
    {
      id: 'general',
      name: 'general',
      description: 'General trading discussion',
      icon: 'MessageCircle',
      color: 'blue',
      memberCount: 1247,
      messageCount: 15234,
      isActive: true,
      isPrivate: false,
      requiresVerification: false,
      requiresPro: false,
      lastMessageAt: new Date(),
    },
    {
      id: 'stocks',
      name: 'stocks',
      description: 'Stock market trading',
      icon: 'Hash',
      color: 'green',
      memberCount: 892,
      messageCount: 8934,
      isActive: true,
      isPrivate: false,
      requiresVerification: false,
      requiresPro: false,
      lastMessageAt: new Date(),
    },
    {
      id: 'crypto',
      name: 'crypto',
      description: 'Cryptocurrency trading',
      icon: 'Hash',
      color: 'orange',
      memberCount: 1056,
      messageCount: 23451,
      isActive: true,
      isPrivate: false,
      requiresVerification: false,
      requiresPro: false,
      lastMessageAt: new Date(),
    },
    {
      id: 'forex',
      name: 'forex',
      description: 'Forex & currency pairs',
      icon: 'Hash',
      color: 'purple',
      memberCount: 634,
      messageCount: 5678,
      isActive: true,
      isPrivate: false,
      requiresVerification: false,
      requiresPro: false,
      lastMessageAt: new Date(),
    },
    {
      id: 'bots',
      name: 'bots',
      description: 'Trading bots & automation',
      icon: 'Hash',
      color: 'cyan',
      memberCount: 1389,
      messageCount: 19872,
      isActive: true,
      isPrivate: false,
      requiresVerification: false,
      requiresPro: false,
      lastMessageAt: new Date(),
    },
  ];

  res.json({
    success: true,
    channels,
    total: channels.length,
  });
});

/**
 * GET /social/chat/:channel/messages
 * Get messages for a specific channel
 */
router.get('/chat/:channel/messages', authMiddleware, async (req: Request, res: Response) => {
  const { channel } = req.params;
  const { limit = '50', before } = req.query;

  try {
    // In production, this would fetch from MongoDB
    // db.communityMessages.find({ channel, isDeleted: false })
    //   .sort({ timestamp: -1 })
    //   .limit(parseInt(limit))

    // Generate demo messages
    const usernames = ['TraderPro', 'CryptoKing', 'WallStWolf', 'BotMaster', 'ForexGuru', 'StockWhiz', 'ChartWizard'];
    const messages = [
      'Just made a huge profit on $AAPL calls!',
      'Anyone watching BTC right now? Looking bullish',
      'My bot just executed 50 trades in 5 minutes',
      'Best trading day of the year so far!',
      'Looking for good entry point on EUR/USD',
      'The market is crazy today',
      'Check out this pattern on $TSLA',
      'Who else is using the DROPBOT?',
      'Great analysis @TraderPro!',
      'Thanks for the tip! Made 15% today',
    ];

    const demoMessages = Array.from({ length: parseInt(limit as string) }, (_, i) => {
      const hasReactions = i % 3 === 0;
      return {
        id: `msg-${Date.now()}-${i}`,
        userId: `user-${i % 7}`,
        username: usernames[i % 7],
        avatar: String.fromCharCode(65 + (i % 26)),
        verified: i % 5 === 0,
        isPro: i % 7 === 0,
        channel,
        message: messages[i % messages.length],
        timestamp: new Date(Date.now() - (parseInt(limit as string) - i) * 60000),
        reactions: hasReactions ? [
          {
            emoji: '👍',
            count: Math.floor(Math.random() * 10) + 1,
            users: [`user-${Math.floor(Math.random() * 7)}`],
          },
          {
            emoji: '🚀',
            count: Math.floor(Math.random() * 5) + 1,
            users: [`user-${Math.floor(Math.random() * 7)}`],
          },
        ] : [],
        mentions: i % 4 === 0 ? ['TraderPro'] : [],
        isPinned: i === 0,
        isDeleted: false,
        threadCount: 0,
      };
    });

    res.json({
      success: true,
      channel,
      messages: demoMessages,
      total: demoMessages.length,
      hasMore: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /social/chat/:channel/send
 * Send a message to a channel
 */
router.post('/chat/:channel/send', authMiddleware, async (req: Request, res: Response) => {
  const { channel } = req.params;
  const { message, replyTo, attachments } = req.body;
  const user = (req as any).user;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
  }

  try {
    // In production, this would:
    // 1. Check if user is banned in channel
    // 2. Extract mentions from message
    // 3. Save to MongoDB
    // 4. Emit Socket.IO event to all users in channel
    // 5. Send notifications to mentioned users

    const mentions = message.match(/@\w+/g) || [];

    const newMessage = {
      id: `msg-${Date.now()}`,
      userId: user.id,
      username: user.username || user.email.split('@')[0],
      avatar: user.avatar || user.email[0].toUpperCase(),
      verified: user.role === 'admin' || user.verified,
      isPro: user.isPro || false,
      channel,
      message: message.trim(),
      timestamp: new Date(),
      reactions: [],
      mentions,
      isPinned: false,
      isDeleted: false,
      replyTo: replyTo || null,
      attachments: attachments || [],
      threadCount: 0,
    };

    // TODO: Save to MongoDB
    // TODO: Emit Socket.IO event
    // io.to(channel).emit('new_message', newMessage);

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /social/chat/:channel/react
 * Add/remove reaction to a message
 */
router.post('/chat/:channel/react', authMiddleware, async (req: Request, res: Response) => {
  const { channel } = req.params;
  const { messageId, emoji } = req.body;
  const user = (req as any).user;

  if (!messageId || !emoji) {
    return res.status(400).json({ error: 'Message ID and emoji are required' });
  }

  try {
    // In production, this would:
    // 1. Find message in MongoDB
    // 2. Add/remove user from reaction
    // 3. Update reaction count
    // 4. Emit Socket.IO event

    res.json({
      success: true,
      messageId,
      emoji,
      action: 'toggled',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /social/chat/:channel/messages/:messageId (admin only)
 * Delete a message
 */
router.delete('/chat/:channel/messages/:messageId', authMiddleware, async (req: Request, res: Response) => {
  const { channel, messageId } = req.params;
  const { reason } = req.body;
  const user = (req as any).user;

  // Check if user is admin or moderator
  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({ error: 'Only admins can delete messages' });
  }

  try {
    // In production, this would:
    // 1. Soft delete message in MongoDB
    // 2. Log deletion in audit log
    // 3. Emit Socket.IO event

    res.json({
      success: true,
      messageId,
      deleted: true,
      deletedBy: user.id,
      reason: reason || 'Violates community guidelines',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /social/chat/:channel/pin/:messageId (admin only)
 * Pin/unpin a message
 */
router.post('/chat/:channel/pin/:messageId', authMiddleware, async (req: Request, res: Response) => {
  const { channel, messageId } = req.params;
  const user = (req as any).user;

  // Check if user is admin or moderator
  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({ error: 'Only admins can pin messages' });
  }

  try {
    // In production, this would:
    // 1. Toggle pin status in MongoDB
    // 2. Emit Socket.IO event

    res.json({
      success: true,
      messageId,
      isPinned: true,
      pinnedBy: user.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENGINE STATUS
// ============================================================

/**
 * GET /social/status
 * Get social trading engine status
 */
router.get('/status', authMiddleware, (req: Request, res: Response) => {
  const state = socialTradingEngine.getState();

  res.json({
    ...state,
    timestamp: new Date(),
  });
});

/**
 * POST /social/start (admin only)
 * Start the social trading engine
 */
router.post('/start', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  await socialTradingEngine.start();

  res.json({
    success: true,
    message: 'Social trading engine started',
    state: socialTradingEngine.getState(),
  });
});

/**
 * POST /social/stop (admin only)
 * Stop the social trading engine
 */
router.post('/stop', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  await socialTradingEngine.stop();

  res.json({
    success: true,
    message: 'Social trading engine stopped',
    state: socialTradingEngine.getState(),
  });
});

// ============================================================
// USER PROFILE ROUTES
// ============================================================

/**
 * GET /social/profile/:userId
 * Get user's social profile with full stats
 */
router.get('/profile/:userId', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // In production, fetch from MongoDB
    const profile = {
      id: userId,
      userId,
      username: 'AlphaTrader_Pro',
      displayName: 'Alpha Trader',
      avatar: 'AT',
      bio: 'Professional swing trader with 8+ years experience. Focused on technical analysis and risk management.',
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
        { id: '2', name: 'Verified', icon: 'Shield', color: '#3B82F6', description: 'Verified identity', earnedAt: new Date() },
        { id: '3', name: 'Consistent', icon: 'TrendingUp', color: '#10B981', description: '6 months profitable', earnedAt: new Date() },
      ],
      recentTrades: [
        { id: '1', symbol: 'AAPL', direction: 'long', pnl: 2450, pnlPercent: 4.2, entryPrice: 178.50, exitPrice: 186.00, duration: 2880, timestamp: new Date() },
        { id: '2', symbol: 'BTC/USD', direction: 'short', pnl: -850, pnlPercent: -1.2, entryPrice: 43500, exitPrice: 44020, duration: 360, timestamp: new Date() },
        { id: '3', symbol: 'TSLA', direction: 'long', pnl: 5200, pnlPercent: 8.5, entryPrice: 245.00, exitPrice: 265.82, duration: 4320, timestamp: new Date() },
      ],
    };

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /social/profile
 * Update current user's profile
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const updates = req.body;

  try {
    // In production, update in MongoDB
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { userId: user.id, ...updates },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TRADERS LIST (for discovery)
// ============================================================

/**
 * GET /social/traders
 * Get list of traders for discovery
 */
router.get('/traders', authMiddleware, async (req: Request, res: Response) => {
  const { limit = '20', offset = '0', filter } = req.query;

  try {
    const traders = Array.from({ length: parseInt(limit as string) }, (_, i) => ({
      id: `trader-${i + 1}`,
      username: `Trader${String(i + 1).padStart(3, '0')}`,
      avatar: String.fromCharCode(65 + (i % 26)) + String.fromCharCode(66 + (i % 25)),
      rank: i + 1,
      followers: 15000 - (i * 500) + Math.floor(Math.random() * 200),
      following: Math.floor(Math.random() * 200),
      totalReturn: 350 - i * 10 + Math.random() * 20,
      winRate: 75 - (i * 1.5) + Math.random() * 5,
      totalTrades: Math.floor(1500 - i * 50 + Math.random() * 100),
      riskScore: 3 + Math.floor(Math.random() * 5),
      verified: i < 8,
      isPro: i < 5,
      copiers: 1000 - (i * 50) + Math.floor(Math.random() * 30),
      strategy: ['Swing Trader', 'Day Trader', 'Scalper', 'Position Trader'][i % 4],
      monthlyReturn: 30 - i * 2 + Math.random() * 8,
      isFollowing: Math.random() > 0.8,
      isCopying: Math.random() > 0.9,
    }));

    res.json({
      success: true,
      data: traders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TRADE FEED
// ============================================================

/**
 * GET /social/feed
 * Get trade feed
 */
router.get('/feed', authMiddleware, async (req: Request, res: Response) => {
  const { filter = 'all', limit = '50', offset = '0' } = req.query;

  try {
    const trades = [
      { username: 'AlphaTrader_Pro', symbol: 'AAPL', direction: 'long', action: 'close', pnl: 2450, pnlPercent: 4.2 },
      { username: 'CryptoKing', symbol: 'BTC/USD', direction: 'long', action: 'open', pnl: 0, pnlPercent: 0 },
      { username: 'ValueHunter', symbol: 'MSFT', direction: 'long', action: 'close', pnl: 1850, pnlPercent: 3.1 },
      { username: 'ScalpMaster', symbol: 'EUR/USD', direction: 'short', action: 'close', pnl: -320, pnlPercent: -0.8 },
      { username: 'TrendRider', symbol: 'TSLA', direction: 'long', action: 'add', pnl: 0, pnlPercent: 0 },
    ];

    const feed = trades.map((trade, index) => ({
      id: `feed_${index + 1}`,
      tradeId: `trade_${index + 1}`,
      userId: `user_${index + 1}`,
      username: trade.username,
      displayName: trade.username.replace('_', ' '),
      avatar: trade.username.substring(0, 2).toUpperCase(),
      verified: index < 3,
      isPro: index < 2,
      isPublic: true,
      symbol: trade.symbol,
      assetType: trade.symbol.includes('/') ? 'forex' : trade.symbol.includes('BTC') ? 'crypto' : 'stock',
      direction: trade.direction,
      action: trade.action,
      quantity: Math.floor(Math.random() * 100) + 10,
      positionValue: Math.floor(Math.random() * 50000) + 5000,
      pnl: trade.pnl,
      pnlPercent: trade.pnlPercent,
      winLoss: trade.pnl > 0 ? 'win' : trade.pnl < 0 ? 'loss' : undefined,
      likes: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 15),
      copies: Math.floor(Math.random() * 25),
      shares: Math.floor(Math.random() * 10),
      tradeTime: new Date(Date.now() - index * 300000),
      postedAt: new Date(Date.now() - index * 300000),
    }));

    res.json({
      success: true,
      data: feed,
      pagination: {
        total: feed.length,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /social/feed/:entryId/like
 * Like a feed entry
 */
router.post('/feed/:entryId/like', authMiddleware, async (req: Request, res: Response) => {
  const { entryId } = req.params;
  const user = (req as any).user;

  try {
    res.json({
      success: true,
      data: { entryId, liked: true, userId: user.id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /social/feed/:entryId/comment
 * Comment on a feed entry
 */
router.post('/feed/:entryId/comment', authMiddleware, async (req: Request, res: Response) => {
  const { entryId } = req.params;
  const { content } = req.body;
  const user = (req as any).user;

  try {
    const comment = {
      id: `comment_${Date.now()}`,
      feedEntryId: entryId,
      userId: user.id,
      username: user.username || user.email?.split('@')[0] || 'User',
      avatar: 'U',
      verified: false,
      content,
      likes: 0,
      createdAt: new Date(),
    };

    res.json({
      success: true,
      data: comment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ACHIEVEMENTS & BADGES
// ============================================================

/**
 * GET /social/achievements
 * Get all achievements with user progress
 */
router.get('/achievements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const achievements = [
      { id: 'first_trade', name: 'First Steps', description: 'Complete your first trade', category: 'trading', icon: 'Rocket', iconColor: '#60A5FA', backgroundColor: '#1E3A5F', rarity: 'common', points: 10, progress: 1, target: 1, isComplete: true, percentOwned: 95 },
      { id: 'ten_trades', name: 'Getting Started', description: 'Complete 10 trades', category: 'trading', icon: 'Target', iconColor: '#34D399', backgroundColor: '#1A3A2F', rarity: 'common', points: 25, progress: 10, target: 10, isComplete: true, percentOwned: 82 },
      { id: 'hundred_trades', name: 'Centurion', description: 'Complete 100 trades', category: 'milestone', icon: 'Award', iconColor: '#F59E0B', backgroundColor: '#3D2A0A', rarity: 'uncommon', points: 100, progress: 67, target: 100, isComplete: false, percentOwned: 45 },
      { id: 'first_win', name: 'Winner', description: 'Close your first profitable trade', category: 'trading', icon: 'Trophy', iconColor: '#FBBF24', backgroundColor: '#3D2A0A', rarity: 'common', points: 15, progress: 1, target: 1, isComplete: true, percentOwned: 92 },
      { id: 'win_streak_5', name: 'Hot Streak', description: 'Win 5 trades in a row', category: 'trading', icon: 'Flame', iconColor: '#EF4444', backgroundColor: '#3D0A0A', rarity: 'uncommon', points: 75, progress: 3, target: 5, isComplete: false, percentOwned: 35 },
      { id: 'profit_1k', name: 'First Thousand', description: 'Earn $1,000 in total profit', category: 'milestone', icon: 'DollarSign', iconColor: '#10B981', backgroundColor: '#0A3D2A', rarity: 'uncommon', points: 100, progress: 850, target: 1000, isComplete: false, percentOwned: 55 },
      { id: 'first_follower', name: 'Getting Popular', description: 'Get your first follower', category: 'social', icon: 'UserPlus', iconColor: '#8B5CF6', backgroundColor: '#1E1A3D', rarity: 'common', points: 20, progress: 1, target: 1, isComplete: true, percentOwned: 78 },
      { id: 'followers_100', name: 'Rising Star', description: 'Reach 100 followers', category: 'social', icon: 'Star', iconColor: '#FBBF24', backgroundColor: '#3D2A0A', rarity: 'uncommon', points: 150, progress: 45, target: 100, isComplete: false, percentOwned: 28 },
    ];

    res.json({
      success: true,
      data: achievements,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /social/badges
 * Get all badges with earned status
 */
router.get('/badges', authMiddleware, async (req: Request, res: Response) => {
  try {
    const badges = [
      { id: 'verified', name: 'Verified', description: 'Verified trader identity', category: 'verified', icon: 'Shield', color: '#3B82F6', backgroundColor: '#1E3A5F', isEarned: true, earnedAt: new Date(), isPrimary: false, isDisplayed: true, priority: 100 },
      { id: 'consistent', name: 'Consistent', description: 'Consistent profitable months', category: 'trading', icon: 'TrendingUp', color: '#10B981', backgroundColor: '#0A3D2A', isEarned: true, earnedAt: new Date(), isPrimary: true, isDisplayed: true, priority: 80 },
      { id: 'top_trader', name: 'Top Trader', description: 'Top 10 on the leaderboard', category: 'trading', icon: 'Crown', color: '#F59E0B', backgroundColor: '#3D2A0A', isEarned: false, isPrimary: false, isDisplayed: false, priority: 90 },
      { id: 'elite_trader', name: 'Elite Trader', description: 'Top 1% by performance', category: 'trading', icon: 'Gem', color: '#EC4899', backgroundColor: '#3D0A2A', isEarned: false, isPrimary: false, isDisplayed: false, priority: 85 },
      { id: 'community_leader', name: 'Community Leader', description: 'Active community contributor', category: 'social', icon: 'Users', color: '#6366F1', backgroundColor: '#1A1A3D', isEarned: false, isPrimary: false, isDisplayed: false, priority: 75 },
      { id: 'signal_master', name: 'Signal Master', description: 'High-quality signal provider', category: 'trading', icon: 'Zap', color: '#F97316', backgroundColor: '#3D1F0A', isEarned: false, isPrimary: false, isDisplayed: false, priority: 70 },
    ];

    res.json({
      success: true,
      data: badges,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /social/badges/:badgeId/display
 * Toggle badge display on profile
 */
router.put('/badges/:badgeId/display', authMiddleware, async (req: Request, res: Response) => {
  const { badgeId } = req.params;
  const { isDisplayed, isPrimary } = req.body;
  const user = (req as any).user;

  try {
    res.json({
      success: true,
      data: { badgeId, isDisplayed, isPrimary, userId: user.id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

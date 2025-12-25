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

export default router;

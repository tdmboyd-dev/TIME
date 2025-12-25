/**
 * TIME Analytics Routes
 *
 * Comprehensive analytics dashboard endpoints:
 * - User metrics (signups, active users, retention)
 * - Trading metrics (total trades, win rate, P&L)
 * - Bot metrics (active bots, performance, popularity)
 * - Revenue metrics (MRR, subscriptions, churn) - Admin only
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import {
  userRepository,
  botRepository,
  tradeRepository,
  strategyRepository,
} from '../database/repositories';

const router = Router();

// Helper to calculate date ranges
function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setDate(start.getDate() - 30);
      break;
    case '3months':
      start.setDate(start.getDate() - 90);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
}

// Helper to group data by date
function groupByDate(data: any[], dateField: string, valueField: string) {
  const grouped: { [key: string]: number } = {};

  data.forEach(item => {
    const date = new Date(item[dateField]).toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + (item[valueField] || 1);
  });

  return Object.keys(grouped).sort().map(date => ({
    date,
    value: grouped[date],
  }));
}

/**
 * GET /api/analytics/users
 * Get user analytics metrics
 */
router.get('/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    // Determine date range
    let dateRange: { start: Date; end: Date };
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
    } else {
      dateRange = getDateRange(period as string);
    }

    // Get all users
    const allUsers = await userRepository.findMany({});

    // Filter users by date range
    const usersInRange = allUsers.filter((u: any) => {
      const createdAt = new Date(u.createdAt);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });

    // Calculate metrics
    const totalUsers = allUsers.length;
    const newSignups = usersInRange.length;

    // Active users (logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = allUsers.filter((u: any) => {
      const lastActivity = new Date(u.lastActivity || u.lastLogin);
      return lastActivity >= sevenDaysAgo;
    }).length;

    // Active users in date range (for daily/weekly/monthly tracking)
    const activeUsersInRange = allUsers.filter((u: any) => {
      const lastActivity = new Date(u.lastActivity || u.lastLogin);
      return lastActivity >= dateRange.start && lastActivity <= dateRange.end;
    }).length;

    // Users by role
    const usersByRole = {
      owner: allUsers.filter((u: any) => u.role === 'owner').length,
      admin: allUsers.filter((u: any) => u.role === 'admin').length,
      'co-admin': allUsers.filter((u: any) => u.role === 'co-admin').length,
      user: allUsers.filter((u: any) => u.role === 'user').length,
    };

    // Users by status
    const usersByStatus = {
      active: allUsers.filter((u: any) => u.status === 'active' || !u.status).length,
      blocked: allUsers.filter((u: any) => u.status === 'blocked').length,
      suspended: allUsers.filter((u: any) => u.status === 'suspended').length,
      pending: allUsers.filter((u: any) => u.status === 'pending').length,
    };

    // Growth data (daily signups)
    const signupsByDate = groupByDate(usersInRange, 'createdAt', null as any);

    // Calculate growth rate
    const previousPeriod = {
      start: new Date(dateRange.start),
      end: new Date(dateRange.start),
    };
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    previousPeriod.start.setTime(previousPeriod.start.getTime() - periodLength);

    const previousUsers = allUsers.filter((u: any) => {
      const createdAt = new Date(u.createdAt);
      return createdAt >= previousPeriod.start && createdAt < dateRange.start;
    }).length;

    const growthRate = previousUsers > 0
      ? ((newSignups - previousUsers) / previousUsers * 100)
      : 100;

    res.json({
      success: true,
      period,
      dateRange,
      metrics: {
        totalUsers,
        newSignups,
        activeUsers,
        activeUsersInRange,
        growthRate: Math.round(growthRate * 10) / 10,
        usersByRole,
        usersByStatus,
        averageUsersPerDay: Math.round(newSignups / Math.max(1, Math.ceil(periodLength / (1000 * 60 * 60 * 24)))),
      },
      chartData: {
        signups: signupsByDate,
      },
    });
  } catch (error: any) {
    console.error('Analytics users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/trading
 * Get trading analytics metrics
 */
router.get('/trading', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    // Determine date range
    let dateRange: { start: Date; end: Date };
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
    } else {
      dateRange = getDateRange(period as string);
    }

    // Get all trades
    const allTrades = await tradeRepository.findMany({});

    // Filter trades by date range
    const tradesInRange = allTrades.filter((t: any) => {
      const createdAt = new Date(t.createdAt || t.timestamp || t.entryTime);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });

    // Calculate metrics
    const totalTrades = tradesInRange.length;
    const winningTrades = tradesInRange.filter((t: any) => (t.pnl || 0) > 0).length;
    const losingTrades = tradesInRange.filter((t: any) => (t.pnl || 0) < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0;

    // Calculate P&L
    const totalPnL = tradesInRange.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    const grossProfit = tradesInRange
      .filter((t: any) => (t.pnl || 0) > 0)
      .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(tradesInRange
      .filter((t: any) => (t.pnl || 0) < 0)
      .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    // Average trade metrics
    const avgProfit = winningTrades > 0 ? grossProfit / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
    const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;

    // Open positions
    const openTrades = allTrades.filter((t: any) =>
      t.status === 'open' || (!t.exitTime && !t.status)
    ).length;

    // Trades by asset type
    const tradesByAsset: { [key: string]: number } = {};
    tradesInRange.forEach((t: any) => {
      const assetType = t.assetType || 'unknown';
      tradesByAsset[assetType] = (tradesByAsset[assetType] || 0) + 1;
    });

    // Trades by day
    const tradesByDate = groupByDate(tradesInRange, 'createdAt', null as any);

    // P&L by day
    const pnlByDate: { [key: string]: number } = {};
    tradesInRange.forEach((t: any) => {
      const date = new Date(t.createdAt || t.timestamp || t.entryTime).toISOString().split('T')[0];
      pnlByDate[date] = (pnlByDate[date] || 0) + (t.pnl || 0);
    });
    const pnlChart = Object.keys(pnlByDate).sort().map(date => ({
      date,
      pnl: Math.round(pnlByDate[date] * 100) / 100,
    }));

    // Calculate comparison with previous period
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousPeriod = {
      start: new Date(dateRange.start.getTime() - periodLength),
      end: dateRange.start,
    };

    const previousTrades = allTrades.filter((t: any) => {
      const createdAt = new Date(t.createdAt || t.timestamp || t.entryTime);
      return createdAt >= previousPeriod.start && createdAt < previousPeriod.end;
    });

    const previousPnL = previousTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    const pnlChange = previousPnL !== 0 ? ((totalPnL - previousPnL) / Math.abs(previousPnL) * 100) : 100;

    res.json({
      success: true,
      period,
      dateRange,
      metrics: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: Math.round(winRate * 10) / 10,
        totalPnL: Math.round(totalPnL * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossLoss: Math.round(grossLoss * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
        avgProfit: Math.round(avgProfit * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        avgTrade: Math.round(avgTrade * 100) / 100,
        openPositions: openTrades,
        pnlChange: Math.round(pnlChange * 10) / 10,
        tradesByAsset,
      },
      chartData: {
        trades: tradesByDate,
        pnl: pnlChart,
      },
    });
  } catch (error: any) {
    console.error('Analytics trading error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/bots
 * Get bot analytics metrics
 */
router.get('/bots', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    // Determine date range
    let dateRange: { start: Date; end: Date };
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
    } else {
      dateRange = getDateRange(period as string);
    }

    // Get all bots
    const allBots = await botRepository.findMany({});

    // Filter bots created in range
    const botsInRange = allBots.filter((b: any) => {
      const createdAt = new Date(b.createdAt);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });

    // Calculate metrics
    const totalBots = allBots.length;
    const newBots = botsInRange.length;
    const activeBots = allBots.filter((b: any) => b.status === 'active').length;
    const pendingBots = allBots.filter((b: any) => b.status === 'pending').length;
    const rejectedBots = allBots.filter((b: any) => b.status === 'rejected').length;
    const absorbedBots = allBots.filter((b: any) => b.isAbsorbed).length;

    // Bots by source
    const botsBySource: { [key: string]: number } = {};
    allBots.forEach((b: any) => {
      const source = b.source || 'unknown';
      botsBySource[source] = (botsBySource[source] || 0) + 1;
    });

    // Bots by status
    const botsByStatus = {
      active: activeBots,
      pending: pendingBots,
      paused: allBots.filter((b: any) => b.status === 'paused').length,
      rejected: rejectedBots,
      deleted: allBots.filter((b: any) => b.status === 'deleted').length,
    };

    // Top performing bots
    const topBots = allBots
      .filter((b: any) => b.performance?.winRate || b.winRate)
      .sort((a: any, b: any) => {
        const aWinRate = a.performance?.winRate || a.winRate || 0;
        const bWinRate = b.performance?.winRate || b.winRate || 0;
        return bWinRate - aWinRate;
      })
      .slice(0, 10)
      .map((b: any) => ({
        id: b._id,
        name: b.name || b.filename,
        winRate: Math.round((b.performance?.winRate || b.winRate || 0) * 10) / 10,
        profitFactor: Math.round((b.performance?.profitFactor || b.profitFactor || 0) * 100) / 100,
        totalTrades: b.performance?.totalTrades || b.totalTrades || 0,
        rating: b.rating || 0,
      }));

    // Most popular bots (by usage/trades)
    const mostPopular = allBots
      .filter((b: any) => b.performance?.totalTrades || b.totalTrades)
      .sort((a: any, b: any) => {
        const aTrades = a.performance?.totalTrades || a.totalTrades || 0;
        const bTrades = b.performance?.totalTrades || b.totalTrades || 0;
        return bTrades - aTrades;
      })
      .slice(0, 10)
      .map((b: any) => ({
        id: b._id,
        name: b.name || b.filename,
        totalTrades: b.performance?.totalTrades || b.totalTrades || 0,
        winRate: Math.round((b.performance?.winRate || b.winRate || 0) * 10) / 10,
        rating: b.rating || 0,
      }));

    // Bot creation over time
    const botsByDate = groupByDate(botsInRange, 'createdAt', null as any);

    // Average bot performance
    const botsWithPerf = allBots.filter((b: any) => b.performance?.winRate || b.winRate);
    const avgWinRate = botsWithPerf.length > 0
      ? botsWithPerf.reduce((sum: number, b: any) => sum + (b.performance?.winRate || b.winRate || 0), 0) / botsWithPerf.length
      : 0;
    const avgProfitFactor = botsWithPerf.length > 0
      ? botsWithPerf.reduce((sum: number, b: any) => sum + (b.performance?.profitFactor || b.profitFactor || 0), 0) / botsWithPerf.length
      : 0;

    res.json({
      success: true,
      period,
      dateRange,
      metrics: {
        totalBots,
        newBots,
        activeBots,
        pendingBots,
        rejectedBots,
        absorbedBots,
        avgWinRate: Math.round(avgWinRate * 10) / 10,
        avgProfitFactor: Math.round(avgProfitFactor * 100) / 100,
        botsBySource,
        botsByStatus,
      },
      topPerformers: topBots,
      mostPopular,
      chartData: {
        botCreation: botsByDate,
      },
    });
  } catch (error: any) {
    console.error('Analytics bots error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/revenue
 * Get revenue analytics metrics (Admin only)
 */
router.get('/revenue', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    // Determine date range
    let dateRange: { start: Date; end: Date };
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
    } else {
      dateRange = getDateRange(period as string);
    }

    // Note: This is a placeholder. In production, integrate with actual payment system
    // (Stripe, PayPal, etc.) to get real revenue data

    // Mock subscription tiers
    const tiers = [
      { id: 'free', name: 'Free', price: 0 },
      { id: 'pro_monthly', name: 'Pro (Monthly)', price: 29 },
      { id: 'pro_yearly', name: 'Pro (Yearly)', price: 290 },
      { id: 'ultimate', name: 'Ultimate Money Machine', price: 79 },
      { id: 'enterprise', name: 'Enterprise', price: 499 },
    ];

    // Get all users to estimate subscriptions
    const allUsers = await userRepository.findMany({});

    // Mock subscription distribution (in production, query payment records)
    const totalUsers = allUsers.length;
    const subscriptionsByTier = {
      free: Math.floor(totalUsers * 0.6),
      pro_monthly: Math.floor(totalUsers * 0.2),
      pro_yearly: Math.floor(totalUsers * 0.1),
      ultimate: Math.floor(totalUsers * 0.08),
      enterprise: Math.floor(totalUsers * 0.02),
    };

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr =
      subscriptionsByTier.pro_monthly * 29 +
      subscriptionsByTier.pro_yearly * (290 / 12) +
      subscriptionsByTier.ultimate * 79 +
      subscriptionsByTier.enterprise * 499;

    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Mock churn rate (in production, calculate from cancellations)
    const churnRate = 3.5; // 3.5% monthly churn

    // Mock new subscriptions in period
    const newSubscriptionsInPeriod = allUsers.filter((u: any) => {
      const createdAt = new Date(u.createdAt);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    }).length;

    // Revenue breakdown by tier
    const revenueByTier = tiers.map(tier => {
      const count = subscriptionsByTier[tier.id as keyof typeof subscriptionsByTier] || 0;
      const monthlyRevenue = tier.id === 'pro_yearly'
        ? count * (tier.price / 12)
        : count * tier.price;

      return {
        tier: tier.name,
        subscribers: count,
        price: tier.price,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        percentage: totalUsers > 0 ? Math.round(count / totalUsers * 1000) / 10 : 0,
      };
    });

    // Mock revenue over time (daily)
    const daysInPeriod = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const revenueByDate = Array.from({ length: Math.min(daysInPeriod, 90) }, (_, i) => {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        revenue: Math.round(mrr / 30 * 100) / 100, // Daily average
      };
    });

    // Lifetime Value (LTV) estimate
    const avgCustomerLifetime = 1 / (churnRate / 100); // months
    const avgRevenuePerUser = mrr / Math.max(1, totalUsers - subscriptionsByTier.free);
    const ltv = avgRevenuePerUser * avgCustomerLifetime;

    res.json({
      success: true,
      period,
      dateRange,
      metrics: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        totalSubscribers: totalUsers,
        paidSubscribers: totalUsers - subscriptionsByTier.free,
        churnRate: Math.round(churnRate * 10) / 10,
        newSubscriptions: newSubscriptionsInPeriod,
        ltv: Math.round(ltv * 100) / 100,
        conversionRate: totalUsers > 0 ? Math.round((totalUsers - subscriptionsByTier.free) / totalUsers * 1000) / 10 : 0,
      },
      subscriptionsByTier,
      revenueByTier,
      chartData: {
        revenue: revenueByDate,
        tierDistribution: tiers.map(tier => ({
          name: tier.name,
          value: subscriptionsByTier[tier.id as keyof typeof subscriptionsByTier] || 0,
        })),
      },
      note: 'Revenue data is estimated. Integrate with payment provider for accurate tracking.',
    });
  } catch (error: any) {
    console.error('Analytics revenue error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/overview
 * Get complete analytics overview
 */
router.get('/overview', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query;

    // Fetch data in parallel
    const [usersRes, tradingRes, botsRes, revenueRes] = await Promise.all([
      fetch(`${req.protocol}://${req.get('host')}/api/v1/analytics/users?period=${period}`).catch(() => null),
      fetch(`${req.protocol}://${req.get('host')}/api/v1/analytics/trading?period=${period}`).catch(() => null),
      fetch(`${req.protocol}://${req.get('host')}/api/v1/analytics/bots?period=${period}`).catch(() => null),
      fetch(`${req.protocol}://${req.get('host')}/api/v1/analytics/revenue?period=${period}`).catch(() => null),
    ]);

    // Parse responses
    const users = usersRes?.ok ? await usersRes.json() : null;
    const trading = tradingRes?.ok ? await tradingRes.json() : null;
    const bots = botsRes?.ok ? await botsRes.json() : null;
    const revenue = revenueRes?.ok ? await revenueRes.json() : null;

    res.json({
      success: true,
      period,
      users: users?.metrics,
      trading: trading?.metrics,
      bots: bots?.metrics,
      revenue: revenue?.metrics,
    });
  } catch (error: any) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/top-traders
 * Get top performing traders by P&L
 */
router.get('/top-traders', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    const dateRange = getDateRange(period as string);

    // Get all trades
    const allTrades = await tradeRepository.findMany({});

    // Filter trades by date range
    const tradesInRange = allTrades.filter((t: any) => {
      const createdAt = new Date(t.createdAt || t.timestamp || t.entryTime);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });

    // Group trades by user and calculate P&L
    const userPnL: { [userId: string]: { pnl: number; trades: number; wins: number; losses: number } } = {};
    tradesInRange.forEach((trade: any) => {
      const userId = trade.userId || 'unknown';
      if (!userPnL[userId]) {
        userPnL[userId] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
      }
      userPnL[userId].pnl += trade.pnl || 0;
      userPnL[userId].trades += 1;
      if ((trade.pnl || 0) > 0) userPnL[userId].wins += 1;
      if ((trade.pnl || 0) < 0) userPnL[userId].losses += 1;
    });

    // Get all users for user details
    const allUsers = await userRepository.findMany({});
    const usersById = new Map(allUsers.map((u: any) => [u._id, u]));

    // Sort by P&L and get top traders
    const topTraders = Object.entries(userPnL)
      .sort(([, a], [, b]) => b.pnl - a.pnl)
      .slice(0, Number(limit))
      .map(([userId, stats]) => {
        const user = usersById.get(userId);
        return {
          userId,
          userName: user?.name || 'Unknown User',
          email: user?.email || 'unknown@example.com',
          totalPnL: Math.round(stats.pnl * 100) / 100,
          totalTrades: stats.trades,
          winningTrades: stats.wins,
          losingTrades: stats.losses,
          winRate: stats.trades > 0 ? Math.round((stats.wins / stats.trades) * 1000) / 10 : 0,
          avgTradeSize: stats.trades > 0 ? Math.round((stats.pnl / stats.trades) * 100) / 100 : 0,
        };
      });

    res.json({
      success: true,
      period,
      dateRange,
      traders: topTraders,
    });
  } catch (error: any) {
    console.error('Analytics top traders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/platform-summary
 * Get platform-wide summary stats
 */
router.get('/platform-summary', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    // Get all data
    const [allUsers, allBots, allTrades] = await Promise.all([
      userRepository.findMany({}),
      botRepository.findMany({}),
      tradeRepository.findMany({}),
    ]);

    // Calculate total platform P&L
    const totalPlatformPnL = allTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

    // Count active users (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeToday = allUsers.filter((u: any) => {
      const lastActivity = new Date(u.lastActivity || u.lastLogin || 0);
      return lastActivity >= oneDayAgo;
    }).length;

    // Count running bots
    const runningBots = allBots.filter((b: any) => b.status === 'active').length;

    // Calculate today's trades
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysTrades = allTrades.filter((t: any) => {
      const createdAt = new Date(t.createdAt || t.timestamp || t.entryTime);
      return createdAt >= today;
    }).length;

    // Platform uptime (mock - in production, track actual uptime)
    const platformUptime = 99.9;

    res.json({
      success: true,
      summary: {
        totalUsers: allUsers.length,
        totalBots: allBots.length,
        totalTrades: allTrades.length,
        totalPlatformPnL: Math.round(totalPlatformPnL * 100) / 100,
        activeToday,
        runningBots,
        todaysTrades,
        platformUptime,
      },
    });
  } catch (error: any) {
    console.error('Analytics platform summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

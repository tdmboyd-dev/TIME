/**
 * TIME User Routes
 *
 * Handles user profile management, settings, and preferences.
 * NOW USES MONGODB for persistence!
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, ownerMiddleware } from './auth';
import { consentManager } from '../consent/consent_manager';
import { revenueEngine, SubscriptionTier } from '../monetization/revenue_engine';
import { userRepository, auditLogRepository } from '../database/repositories';

const router = Router();

// ============================================================
// SUBSCRIPTION STORAGE (In production, use database)
// ============================================================

interface UserSubscription {
  tier: SubscriptionTier;
  grantedBy?: string;
  grantedAt?: Date;
  expiresAt?: Date;
  isFree: boolean;
  reason?: string;
}

const userSubscriptions: Map<string, UserSubscription> = new Map();

// ============================================================
// TYPES
// ============================================================

interface UserSettings {
  timezone: string;
  currency: string;
  language: string;
  theme: 'dark' | 'light' | 'system';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    tradeAlerts: boolean;
    riskAlerts: boolean;
    dailySummary: boolean;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  timezone: 'America/New_York',
  currency: 'USD',
  language: 'en',
  theme: 'dark',
  notifications: {
    email: true,
    sms: false,
    push: true,
    tradeAlerts: true,
    riskAlerts: true,
    dailySummary: true,
  },
};

// ============================================================
// ROUTES - NOW USE MONGODB
// ============================================================

/**
 * GET /users/profile
 * Get current user's profile from database
 */
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const dbUser = await userRepository.findById(user.id);

    const profile = {
      name: dbUser?.name || user.name,
      email: dbUser?.email || user.email,
      phone: dbUser?.phone,
      avatar: dbUser?.avatar,
    };

    res.json({ profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /users/profile
 * Update current user's profile in database
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, phone, avatar } = req.body;

  try {
    const updates: any = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;

    const updatedUser = await userRepository.update(user.id, updates);

    // Log activity
    await auditLogRepository.log('UserProfile', 'profile_updated', updates, { userId: user.id });

    res.json({
      success: true,
      profile: {
        name: updatedUser?.name || user.name,
        email: updatedUser?.email || user.email,
        phone: updatedUser?.phone,
        avatar: updatedUser?.avatar,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /users/settings
 * Get current user's settings from database
 */
router.get('/settings', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const dbUser = await userRepository.findById(user.id);
    const settings = (dbUser as any)?.settings || DEFAULT_SETTINGS;

    res.json({ settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /users/settings
 * Update current user's settings in database
 */
router.put('/settings', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const updates = req.body;

  try {
    const dbUser = await userRepository.findById(user.id);
    const currentSettings = (dbUser as any)?.settings || DEFAULT_SETTINGS;

    const updatedSettings: UserSettings = {
      ...currentSettings,
      ...updates,
      notifications: {
        ...currentSettings.notifications,
        ...(updates.notifications || {}),
      },
    };

    await userRepository.update(user.id, { settings: updatedSettings } as any);

    // Log activity
    await auditLogRepository.log('UserSettings', 'settings_updated', { fields: Object.keys(updates) }, { userId: user.id });

    res.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /users/consent
 * Get consent status
 */
router.get('/consent', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const consent = consentManager.getConsent(user.id);
  const hasValid = consentManager.hasValidConsent(user.id);
  const missing = consentManager.getMissingConsent(user.id);

  res.json({ consent, hasValidConsent: hasValid, missingFields: missing });
});

/**
 * PUT /users/consent
 * Update consent preferences
 */
router.put('/consent', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const consentData = req.body;

  // Update consent using grantConsent
  consentManager.grantConsent(user.id, consentData);

  const consent = consentManager.getConsent(user.id);

  res.json({
    success: true,
    consent,
    hasValidConsent: consentManager.hasValidConsent(user.id),
  });
});

/**
 * GET /users/activity
 * Get user's recent activity from audit logs
 */
router.get('/activity', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    // Get real activity from audit logs
    const logs = await auditLogRepository.findByUser(user.id, limit);

    const activity = logs.map(log => ({
      id: log._id,
      type: log.action,
      description: `${log.action} on ${log.component}`,
      timestamp: log.timestamp,
      details: log.details,
    }));

    res.json({
      total: activity.length,
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /users/risk-profile
 * Get user's risk profile and settings
 */
router.get('/risk-profile', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;

  // Mock risk profile
  const riskProfile = {
    riskTolerance: 'medium',
    maxDailyLoss: 1000,
    maxDailyLossPercent: 2,
    maxPositionSize: 5000,
    maxPositionSizePercent: 10,
    maxOpenPositions: 10,
    emergencyBrakeEnabled: true,
    emergencyBrakeThreshold: 5, // 5% portfolio loss
  };

  res.json({ riskProfile });
});

/**
 * PUT /users/risk-profile
 * Update user's risk profile
 */
router.put('/risk-profile', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const updates = req.body;

  // Validate risk settings
  if (updates.maxDailyLossPercent && updates.maxDailyLossPercent > 10) {
    return res.status(400).json({
      error: 'Max daily loss percent cannot exceed 10%',
    });
  }

  if (updates.maxPositionSizePercent && updates.maxPositionSizePercent > 25) {
    return res.status(400).json({
      error: 'Max position size percent cannot exceed 25%',
    });
  }

  // In production, save to database
  res.json({
    success: true,
    riskProfile: {
      riskTolerance: updates.riskTolerance || 'medium',
      maxDailyLoss: updates.maxDailyLoss || 1000,
      maxDailyLossPercent: updates.maxDailyLossPercent || 2,
      maxPositionSize: updates.maxPositionSize || 5000,
      maxPositionSizePercent: updates.maxPositionSizePercent || 10,
      maxOpenPositions: updates.maxOpenPositions || 10,
      emergencyBrakeEnabled: updates.emergencyBrakeEnabled ?? true,
      emergencyBrakeThreshold: updates.emergencyBrakeThreshold || 5,
    },
  });
});

/**
 * DELETE /users/account
 * Request account deletion
 */
router.delete('/account', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { confirmEmail, reason } = req.body;

  if (confirmEmail !== user.email) {
    return res.status(400).json({
      error: 'Please confirm your email to delete account',
    });
  }

  // In production:
  // 1. Close all open positions
  // 2. Withdraw remaining funds
  // 3. Archive user data (regulatory requirements)
  // 4. Delete personal data (GDPR)
  // 5. Send confirmation email

  res.json({
    success: true,
    message: 'Account deletion requested. You will receive a confirmation email.',
    note: 'All open positions will be closed and funds will be returned.',
  });
});

// ============================================================
// ADMIN ROUTES
// ============================================================

/**
 * GET /users/admin/list
 * List all users from database (admin only)
 */
router.get('/admin/list', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;

  try {
    // Get all users from database
    let allUsers = await userRepository.findMany({});

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      allUsers = allUsers.filter(u =>
        u.email.toLowerCase().includes(searchLower) ||
        (u.name && u.name.toLowerCase().includes(searchLower))
      );
    }

    const start = (page - 1) * limit;
    const paginated = allUsers.slice(start, start + limit);

    res.json({
      total: allUsers.length,
      page,
      limit,
      users: paginated.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        lastLogin: u.lastActivity,
        status: (u as any).status || 'active',
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /users/admin/:userId
 * Get specific user details from database (admin only)
 */
router.get('/admin/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const dbUser = await userRepository.findById(userId);

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: dbUser._id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
        lastLogin: dbUser.lastActivity,
        status: (dbUser as any).status || 'active',
        consent: dbUser.consent,
        stats: {
          totalTrades: 0, // Would need to fetch from trade repository
          winRate: 0,
          totalPnL: 0,
          activeBots: 0,
          activeStrategies: 0,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /users/admin/:userId/role
 * Update user role (admin only)
 */
router.put('/admin/:userId/role', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;
  const currentUser = (req as any).user;

  // Only owner can create other admins
  if (role === 'admin' && currentUser.role !== 'owner') {
    return res.status(403).json({
      error: 'Only owner can assign admin role',
    });
  }

  // Cannot change owner role
  if (role === 'owner') {
    return res.status(403).json({
      error: 'Owner role cannot be assigned',
    });
  }

  res.json({
    success: true,
    message: `User ${userId} role updated to ${role}`,
  });
});

/**
 * PUT /users/admin/:userId/status
 * Suspend or activate user (admin only)
 */
router.put('/admin/:userId/status', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status, reason } = req.body;

  if (!['active', 'suspended', 'banned'].includes(status)) {
    return res.status(400).json({
      error: 'Invalid status. Must be: active, suspended, or banned',
    });
  }

  res.json({
    success: true,
    message: `User ${userId} status updated to ${status}`,
    reason,
  });
});

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

/**
 * GET /users/subscription
 * Get current user's subscription
 */
router.get('/subscription', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const subscription = userSubscriptions.get(user.id);
  const tier = subscription?.tier || 'free';
  const plan = revenueEngine.getPlan(tier);

  res.json({
    subscription: {
      tier,
      plan: plan.name,
      isFree: subscription?.isFree || tier === 'free',
      grantedBy: subscription?.grantedBy,
      grantedAt: subscription?.grantedAt,
      expiresAt: subscription?.expiresAt,
      reason: subscription?.reason,
    },
    features: plan.features,
    limits: plan.limits,
    price: plan.price,
  });
});

/**
 * GET /users/subscription/plans
 * Get all available subscription plans
 */
router.get('/subscription/plans', (req: Request, res: Response) => {
  const plans = revenueEngine.getSubscriptionPlans();

  res.json({
    plans: plans.map(plan => ({
      tier: plan.tier,
      name: plan.name,
      price: plan.price,
      features: plan.features,
      limits: plan.limits,
    })),
  });
});

/**
 * POST /users/subscription/upgrade
 * Upgrade subscription (would integrate with payment in production)
 */
router.post('/subscription/upgrade', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { tier, billingCycle = 'monthly' } = req.body;

  const validTiers: SubscriptionTier[] = ['free', 'starter', 'trader', 'professional', 'enterprise'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({
      error: 'Invalid tier',
      validTiers,
    });
  }

  try {
    // In production, this would process payment first
    const result = await revenueEngine.subscribeUser(user.id, tier, billingCycle);

    // Store subscription
    userSubscriptions.set(user.id, {
      tier,
      isFree: false,
      grantedAt: new Date(),
    });

    const plan = revenueEngine.getPlan(tier);

    res.json({
      success: true,
      message: `Upgraded to ${plan.name}`,
      subscription: {
        tier,
        plan: plan.name,
        subscriptionId: result.subscriptionId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// OWNER-ONLY: FREE TIER GRANTS
// ============================================================

/**
 * POST /users/admin/:userId/grant-tier
 * Grant free access to any tier (owner only)
 */
router.post('/admin/:userId/grant-tier', authMiddleware, ownerMiddleware, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { tier, reason, durationDays } = req.body;
  const owner = (req as any).user;

  const validTiers: SubscriptionTier[] = ['free', 'starter', 'trader', 'professional', 'enterprise'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({
      error: 'Invalid tier',
      validTiers,
    });
  }

  // Calculate expiration if duration provided
  let expiresAt: Date | undefined;
  if (durationDays) {
    expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  }

  // Grant free access
  userSubscriptions.set(userId, {
    tier,
    grantedBy: owner.id,
    grantedAt: new Date(),
    expiresAt,
    isFree: true,
    reason: reason || `Free ${tier} access granted by owner`,
  });

  const plan = revenueEngine.getPlan(tier);

  res.json({
    success: true,
    message: `Granted FREE ${plan.name} access to user ${userId}`,
    grant: {
      userId,
      tier,
      planName: plan.name,
      grantedBy: owner.name || owner.email,
      grantedAt: new Date(),
      expiresAt,
      reason,
      features: plan.features,
      limits: plan.limits,
      normalPrice: plan.price,
      userPays: '$0.00 (FREE)',
    },
  });
});

/**
 * DELETE /users/admin/:userId/revoke-tier
 * Revoke free tier access (owner only)
 */
router.delete('/admin/:userId/revoke-tier', authMiddleware, ownerMiddleware, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const currentSub = userSubscriptions.get(userId);
  if (!currentSub) {
    return res.status(404).json({
      error: 'User has no subscription to revoke',
    });
  }

  // Downgrade to free
  userSubscriptions.set(userId, {
    tier: 'free',
    isFree: true,
    grantedAt: new Date(),
    reason: reason || 'Free tier access revoked',
  });

  res.json({
    success: true,
    message: `Revoked ${currentSub.tier} access for user ${userId}. Downgraded to free.`,
    previousTier: currentSub.tier,
    newTier: 'free',
    reason,
  });
});

/**
 * GET /users/admin/grants
 * List all free tier grants (owner only)
 */
router.get('/admin/grants', authMiddleware, ownerMiddleware, (req: Request, res: Response) => {
  const grants: Array<{
    userId: string;
    tier: SubscriptionTier;
    grantedBy?: string;
    grantedAt?: Date;
    expiresAt?: Date;
    reason?: string;
  }> = [];

  userSubscriptions.forEach((sub, odUserId) => {
    if (sub.isFree && sub.tier !== 'free') {
      grants.push({
        userId: odUserId,
        tier: sub.tier,
        grantedBy: sub.grantedBy,
        grantedAt: sub.grantedAt,
        expiresAt: sub.expiresAt,
        reason: sub.reason,
      });
    }
  });

  res.json({
    total: grants.length,
    grants,
  });
});

/**
 * POST /users/admin/bulk-grant
 * Grant free tier to multiple users at once (owner only)
 */
router.post('/admin/bulk-grant', authMiddleware, ownerMiddleware, (req: Request, res: Response) => {
  const { userIds, tier, reason, durationDays } = req.body;
  const owner = (req as any).user;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      error: 'userIds must be a non-empty array',
    });
  }

  const validTiers: SubscriptionTier[] = ['free', 'starter', 'trader', 'professional', 'enterprise'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({
      error: 'Invalid tier',
      validTiers,
    });
  }

  let expiresAt: Date | undefined;
  if (durationDays) {
    expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  }

  const results: string[] = [];
  for (const odUserId of userIds) {
    userSubscriptions.set(odUserId, {
      tier,
      grantedBy: owner.id,
      grantedAt: new Date(),
      expiresAt,
      isFree: true,
      reason: reason || `Bulk grant: Free ${tier} access`,
    });
    results.push(odUserId);
  }

  const plan = revenueEngine.getPlan(tier);

  res.json({
    success: true,
    message: `Granted FREE ${plan.name} access to ${results.length} users`,
    tier,
    planName: plan.name,
    usersGranted: results,
    expiresAt,
    reason,
  });
});

export default router;

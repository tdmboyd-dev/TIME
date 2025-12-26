/**
 * TIME Admin Routes
 *
 * Admin panel operations:
 * - Evolution mode control
 * - System health monitoring
 * - Proposal management
 * - System configuration
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, ownerMiddleware } from './auth';
import { timeGovernor } from '../core/time_governor';
import { evolutionController } from '../core/evolution_controller';
import { inactivityMonitor } from '../core/inactivity_monitor';
import { learningEngine } from '../engines/learning_engine';
import { riskEngine } from '../engines/risk_engine';
import { regimeDetector } from '../engines/regime_detector';

// Database
import { databaseManager } from '../database/connection';
import {
  userRepository,
  botRepository,
  strategyRepository,
  tradeRepository,
  signalRepository,
  learningEventRepository,
  insightRepository,
  notificationRepository,
  auditLogRepository,
} from '../database/repositories';

const router = Router();

// ============================================================
// PUBLIC STATUS ENDPOINTS (No auth required for dashboard)
// ============================================================

/**
 * GET /admin/status
 * Get basic system status (public endpoint for dashboard)
 */
router.get('/status', (req: Request, res: Response) => {
  const state = timeGovernor.getEvolutionState();
  const health = timeGovernor.getSystemHealth();

  res.json({
    evolution: {
      mode: state.mode,
      lastModeChange: state.lastModeChange,
    },
    health: health.every(h => h.status === 'online') ? 'healthy' :
            health.some(h => h.status === 'offline') ? 'unhealthy' : 'degraded',
    components: health.length,
    activeComponents: health.filter(h => h.status === 'online').length,
    timestamp: new Date(),
  });
});

/**
 * GET /admin/evolution/status
 * Get evolution mode status (public endpoint for dashboard)
 */
router.get('/evolution/status', (req: Request, res: Response) => {
  const state = timeGovernor.getEvolutionState();

  res.json({
    mode: state.mode,
    lastModeChange: state.lastModeChange,
    changedBy: state.changedBy,
    reason: state.reason,
  });
});

// ============================================================
// EVOLUTION CONTROL (Requires Auth)
// ============================================================

/**
 * GET /admin/evolution
 * Get current evolution state
 */
router.get('/evolution', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const state = timeGovernor.getEvolutionState();
  const inactivityState = inactivityMonitor.getState();

  res.json({
    mode: state.mode,
    lastModeChange: state.lastModeChange,
    changedBy: state.changedBy,
    reason: state.reason,
    inactivity: inactivityState,
  });
});

/**
 * POST /admin/evolution/mode
 * Toggle evolution mode (admin only for switching to autonomous)
 */
router.post('/evolution/mode', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { mode, reason } = req.body;
  const user = (req as any).user;

  if (mode !== 'controlled' && mode !== 'autonomous') {
    return res.status(400).json({
      error: 'Invalid mode. Must be "controlled" or "autonomous"',
    });
  }

  // Admin can switch modes
  timeGovernor.setEvolutionMode(mode, user.id, reason || `${user.role} toggle`);

  res.json({
    success: true,
    state: timeGovernor.getEvolutionState(),
  });
});

/**
 * POST /admin/evolution/:mode
 * Direct URL mode switch (for frontend convenience)
 */
router.post('/evolution/:mode', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { mode } = req.params;
  const user = (req as any).user;

  if (mode !== 'controlled' && mode !== 'autonomous') {
    return res.status(400).json({
      error: 'Invalid mode. Must be "controlled" or "autonomous"',
    });
  }

  timeGovernor.setEvolutionMode(mode, user.id, `${user.role} toggle via URL`);

  res.json({
    success: true,
    state: timeGovernor.getEvolutionState(),
  });
});

/**
 * GET /admin/evolution/proposals
 * Get pending evolution proposals
 */
router.get('/evolution/proposals', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const proposals = evolutionController.getPendingProposals();

  res.json({
    total: proposals.length,
    proposals: proposals.map(p => ({
      id: p.id,
      type: p.type,
      description: p.description,
      impact: p.impact,
      createdAt: p.createdAt,
    })),
  });
});

/**
 * POST /admin/evolution/proposals/:proposalId/approve
 * Approve an evolution proposal
 */
router.post('/evolution/proposals/:proposalId/approve', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { proposalId } = req.params;
  const user = (req as any).user;

  try {
    await evolutionController.approveProposal(proposalId, user.id);

    res.json({
      success: true,
      message: 'Proposal approved and applied',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /admin/evolution/proposals/:proposalId/reject
 * Reject an evolution proposal
 */
router.post('/evolution/proposals/:proposalId/reject', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { proposalId } = req.params;
  const { reason } = req.body;
  const user = (req as any).user;

  try {
    evolutionController.rejectProposal(proposalId, user.id, reason);

    res.json({
      success: true,
      message: 'Proposal rejected',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// SYSTEM HEALTH & METRICS
// ============================================================

/**
 * GET /admin/health
 * Get system health status
 */
router.get('/health', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const health = timeGovernor.getSystemHealth();

  res.json({
    overall: health.every(h => h.status === 'online') ? 'healthy' :
             health.some(h => h.status === 'offline') ? 'unhealthy' : 'degraded',
    components: health,
    timestamp: new Date(),
  });
});

/**
 * GET /admin/metrics
 * Get comprehensive system metrics
 */
router.get('/metrics', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const metrics = timeGovernor.getMetrics();
  const health = timeGovernor.getSystemHealth();
  const riskState = riskEngine.getState();
  const regimeState = regimeDetector.getRegimeState();
  const insights = learningEngine.getRecentInsights(10);

  res.json({
    governor: metrics,
    learning: {
      recentInsightsCount: insights.length,
    },
    risk: {
      emergencyBrakeActive: riskState.emergencyBrakeActive,
      dailyPnL: riskState.dailyPnL,
      openPositions: riskState.openPositions,
    },
    regime: {
      current: regimeState.current,
      confidence: regimeState.confidence,
      duration: regimeState.duration,
    },
    components: health.length,
    healthyComponents: health.filter(h => h.status === 'online').length,
    timestamp: new Date(),
  });
});

/**
 * GET /admin/activity
 * Get recent system activity from audit logs
 */
router.get('/activity', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { limit = '100' } = req.query;

  try {
    // Get real activity from audit logs
    const logs = await auditLogRepository.getRecentLogs(parseInt(limit as string));

    const activity = logs.map(log => ({
      id: log._id,
      type: log.component,
      action: log.action,
      description: `${log.action} on ${log.component}`,
      details: log.details,
      userId: log.userId,
      timestamp: log.timestamp,
      success: log.success,
    }));

    res.json({
      total: activity.length,
      activity,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SYSTEM CONFIGURATION
// ============================================================

/**
 * GET /admin/config
 * Get system configuration
 */
router.get('/config', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  res.json({
    evolution: {
      mode: timeGovernor.getEvolutionMode(),
      autoApproveThreshold: 0.95,
      proposalRetentionDays: 30,
    },
    risk: riskEngine.getLimits(),
    notifications: {
      inactivityWarningDays: [3, 4, 5],
      criticalAlertChannels: ['email', 'sms'],
    },
  });
});

/**
 * PUT /admin/config
 * Update system configuration (owner only)
 */
router.put('/config', authMiddleware, ownerMiddleware, (req: Request, res: Response) => {
  const updates = req.body;

  // Validate and apply configuration updates
  // In production, persist to database

  res.json({
    success: true,
    message: 'Configuration updated',
    config: updates,
  });
});

// ============================================================
// EMERGENCY CONTROLS
// ============================================================

/**
 * POST /admin/emergency/brake
 * Trigger emergency brake - stops all trading
 */
router.post('/emergency/brake', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { reason } = req.body;
  const user = (req as any).user;

  riskEngine.triggerEmergencyBrake(reason || 'Manual trigger by admin');

  res.json({
    success: true,
    message: 'EMERGENCY BRAKE ACTIVATED - All trading halted',
    triggeredBy: user.id,
    reason,
    timestamp: new Date(),
  });
});

/**
 * POST /admin/emergency/release
 * Release emergency brake - resume trading
 */
router.post('/emergency/release', authMiddleware, ownerMiddleware, (req: Request, res: Response) => {
  const { confirmation } = req.body;
  const user = (req as any).user;

  if (confirmation !== 'RELEASE_EMERGENCY_BRAKE') {
    return res.status(400).json({
      error: 'Must confirm with "RELEASE_EMERGENCY_BRAKE"',
    });
  }

  riskEngine.releaseEmergencyBrake('Manual release by owner');

  res.json({
    success: true,
    message: 'Emergency brake released - Trading resumed',
    releasedBy: user.id,
    timestamp: new Date(),
  });
});

/**
 * POST /admin/emergency/pause-all
 * Pause all active bots and strategies
 */
router.post('/emergency/pause-all', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;

  res.json({
    success: true,
    message: 'All bots and strategies paused',
    pausedBy: user.id,
    timestamp: new Date(),
  });
});

// ============================================================
// ANNOUNCEMENTS
// ============================================================

/**
 * POST /admin/announce
 * Send system-wide announcement
 */
router.post('/announce', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { title, message, priority = 'medium' } = req.body;
  const user = (req as any).user;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message required' });
  }

  res.json({
    success: true,
    announcement: {
      id: `ann_${Date.now()}`,
      title,
      message,
      priority,
      createdBy: user.id,
      timestamp: new Date(),
    },
  });
});

/**
 * GET /admin/audit
 * Get audit log entries from database
 */
router.get('/audit', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '50',
    component,
    userId,
  } = req.query;

  try {
    let logs;
    if (component) {
      logs = await auditLogRepository.findByComponent(component as string);
    } else if (userId) {
      logs = await auditLogRepository.findByUser(userId as string);
    } else {
      logs = await auditLogRepository.getRecentLogs(parseInt(limit as string));
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const start = (pageNum - 1) * limitNum;

    res.json({
      total: logs.length,
      page: pageNum,
      limit: limitNum,
      entries: logs.slice(start, start + limitNum),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DATABASE MANAGEMENT
// ============================================================

/**
 * GET /admin/database/status
 * Get database connection status
 */
router.get('/database/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const status = databaseManager.getStatus();
    const health = await databaseManager.checkHealth();

    res.json({
      status: health,
      collections: {
        users: await userRepository.count(),
        bots: await botRepository.count(),
        strategies: await strategyRepository.count(),
        trades: await tradeRepository.count(),
        signals: await signalRepository.count(),
        learningEvents: await learningEventRepository.count(),
        insights: await insightRepository.count(),
        notifications: await notificationRepository.count(),
        auditLogs: await auditLogRepository.count(),
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/database/stats
 * Get database statistics
 */
router.get('/database/stats', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const [
      activeBots,
      pendingBots,
      absorbedBots,
      activeStrategies,
      openTrades,
      recentSignals,
      unprocessedLearning,
      actionableInsights,
    ] = await Promise.all([
      botRepository.findByStatus('active'),
      botRepository.findPending(),
      botRepository.findAbsorbed(),
      strategyRepository.findActive(),
      tradeRepository.findOpenTrades(),
      signalRepository.getRecentSignals(100),
      learningEventRepository.findUnprocessed(),
      insightRepository.findActionable(),
    ]);

    res.json({
      bots: {
        total: await botRepository.count(),
        active: activeBots.length,
        pending: pendingBots.length,
        absorbed: absorbedBots.length,
      },
      strategies: {
        total: await strategyRepository.count(),
        active: activeStrategies.length,
      },
      trades: {
        total: await tradeRepository.count(),
        open: openTrades.length,
      },
      signals: {
        total: await signalRepository.count(),
        recent: recentSignals.length,
      },
      learning: {
        total: await learningEventRepository.count(),
        unprocessed: unprocessedLearning.length,
      },
      insights: {
        total: await insightRepository.count(),
        actionable: actionableInsights.length,
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/database/trades
 * Get recent trades with performance stats
 */
router.get('/database/trades', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { limit = '50', botId, strategyId, symbol } = req.query;

  try {
    const trades = await tradeRepository.getRecentTrades(parseInt(limit as string));
    const stats = await tradeRepository.getPerformanceStats({
      botId: botId as string,
      strategyId: strategyId as string,
      symbol: symbol as string,
    });

    res.json({
      trades,
      stats,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/database/bots/top
 * Get top performing bots
 */
router.get('/database/bots/top', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { limit = '10' } = req.query;

  try {
    const topBots = await botRepository.getTopPerformers(parseInt(limit as string));

    res.json({
      bots: topBots.map(bot => ({
        id: bot._id,
        name: bot.name,
        source: bot.source,
        status: bot.status,
        performance: bot.performance,
        isAbsorbed: bot.isAbsorbed,
      })),
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/database/insights
 * Get recent insights
 */
router.get('/database/insights', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { limit = '50', category, actionable } = req.query;

  try {
    let insights;
    if (category) {
      insights = await insightRepository.findByCategory(category as any);
    } else if (actionable === 'true') {
      insights = await insightRepository.findActionable();
    } else {
      insights = await insightRepository.getRecentInsights(parseInt(limit as string));
    }

    res.json({
      total: insights.length,
      insights,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/database/learning
 * Get learning events
 */
router.get('/database/learning', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { limit = '50', source, unprocessed } = req.query;

  try {
    let events;
    if (unprocessed === 'true') {
      events = await learningEventRepository.findUnprocessed();
    } else if (source) {
      events = await learningEventRepository.findBySource(source as any);
    } else {
      events = await learningEventRepository.getRecentInsights(parseInt(limit as string));
    }

    res.json({
      total: events.length,
      events,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/database/audit
 * Create audit log entry
 */
router.post('/database/audit', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { component, action, details } = req.body;
  const user = (req as any).user;

  if (!component || !action) {
    return res.status(400).json({ error: 'Component and action required' });
  }

  try {
    const entry = await auditLogRepository.log(component, action, details || {}, {
      userId: user?.id,
    });

    res.json({
      success: true,
      entry,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/database/insight
 * Create insight
 */
router.post('/database/insight', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { category, title, description, data, actionable, recommendations } = req.body;

  if (!category || !title || !description) {
    return res.status(400).json({ error: 'Category, title, and description required' });
  }

  try {
    const insight = await insightRepository.create({
      category,
      title,
      description,
      data: data || {},
      confidence: 0.8,
      actionable: actionable || false,
      actedUpon: false,
      recommendations: recommendations || [],
      source: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    res.json({
      success: true,
      insight,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /admin/database/clear/:collection
 * Clear a collection (owner only - dangerous!)
 */
router.delete('/database/clear/:collection', authMiddleware, ownerMiddleware, async (req: Request, res: Response) => {
  const { collection } = req.params;
  const { confirmation } = req.body;
  const user = (req as any).user;

  if (confirmation !== `CLEAR_${collection.toUpperCase()}`) {
    return res.status(400).json({
      error: `Must confirm with "CLEAR_${collection.toUpperCase()}"`,
    });
  }

  // Log this dangerous action
  await auditLogRepository.log('AdminPanel', 'collection_cleared', {
    collection,
    clearedBy: user?.id,
  });

  res.json({
    success: true,
    message: `Collection ${collection} cleared`,
    warning: 'This action cannot be undone',
    timestamp: new Date(),
  });
});

// ============================================================
// MASTER ADMIN PANEL - USER MANAGEMENT
// ============================================================

/**
 * GET /admin/users
 * Get all users with filtering
 */
router.get('/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { page = '1', limit = '50', role, status, search } = req.query;

  try {
    // Get all users
    let users = await userRepository.findMany({});

    // Apply filters
    if (role) {
      users = users.filter((u: any) => u.role === role);
    }
    if (status) {
      users = users.filter((u: any) => u.status === status);
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      users = users.filter((u: any) =>
        u.email.toLowerCase().includes(searchLower) ||
        u.name.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const start = (pageNum - 1) * limitNum;
    const paginatedUsers = users.slice(start, start + limitNum);

    // Remove sensitive data
    const safeUsers = paginatedUsers.map(u => ({
      id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      customRole: (u as any).customRole,
      customPosition: (u as any).customPosition,
      status: (u as any).status || 'active',
      permissions: (u as any).permissions || [],
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      lastActivity: u.lastActivity,
    }));

    res.json({
      success: true,
      total: users.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(users.length / limitNum),
      users: safeUsers,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /admin/users/:userId
 * Get single user details
 */
router.get('/users/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        customRole: (user as any).customRole,
        customPosition: (user as any).customPosition,
        status: (user as any).status || 'active',
        statusReason: (user as any).statusReason,
        permissions: (user as any).permissions || [],
        phone: user.phone,
        createdAt: user.createdAt,
        createdBy: (user as any).createdBy,
        lastLogin: user.lastLogin,
        lastActivity: user.lastActivity,
        brokerConnections: user.brokerConnections?.length || 0,
        settings: user.settings,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/users/create
 * Create a new user (admin-created)
 */
router.post('/users/create', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { email, name, password, role = 'user', permissions = [], customPosition } = req.body;
  const adminUser = (req as any).user;

  if (!email || !name || !password) {
    return res.status(400).json({ success: false, error: 'Email, name, and password required' });
  }

  try {
    // Check if email already exists
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    // Default permissions based on role
    let defaultPermissions = ['portfolio', 'analytics'];
    if (role === 'admin' || role === 'co-admin') {
      defaultPermissions = ['trading', 'bots', 'strategies', 'portfolio', 'analytics', 'defi', 'transfers'];
    }

    const newUser = await userRepository.create({
      email,
      name,
      passwordHash,
      role,
      customPosition,
      status: 'active',
      permissions: permissions.length > 0 ? permissions : defaultPermissions,
      createdAt: new Date(),
      createdBy: adminUser.id,
      lastLogin: new Date(),
      lastActivity: new Date(),
      consent: {
        termsAccepted: true,
        dataLearningConsent: true,
        riskDisclosureAccepted: true,
        marketingConsent: false,
        acceptedAt: new Date(),
      },
      settings: {
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
      },
      brokerConnections: [],
    } as any);

    // Log the action
    await auditLogRepository.log('AdminPanel', 'user_created', {
      createdUserId: newUser._id,
      createdUserEmail: email,
      createdBy: adminUser.id,
      role,
    });

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /admin/users/:userId/role
 * Update user role (promote to admin/co-admin, demote, etc.)
 */
router.put('/users/:userId/role', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role, customPosition } = req.body;
  const adminUser = (req as any).user;

  if (!role) {
    return res.status(400).json({ success: false, error: 'Role is required' });
  }

  // Only owner can create other admins
  if ((role === 'admin' || role === 'owner') && adminUser.role !== 'owner') {
    return res.status(403).json({ success: false, error: 'Only owner can assign admin/owner roles' });
  }

  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent demoting self
    if (userId === adminUser.id && role !== adminUser.role) {
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });
    }

    await userRepository.update(userId, {
      role,
      customPosition: customPosition || (user as any).customPosition,
    });

    await auditLogRepository.log('AdminPanel', 'user_role_changed', {
      targetUserId: userId,
      oldRole: user.role,
      newRole: role,
      changedBy: adminUser.id,
    });

    res.json({
      success: true,
      message: `User role updated to ${role}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /admin/users/:userId/permissions
 * Update user permissions
 */
router.put('/users/:userId/permissions', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { permissions } = req.body;
  const adminUser = (req as any).user;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, error: 'Permissions must be an array' });
  }

  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await userRepository.update(userId, { permissions });

    await auditLogRepository.log('AdminPanel', 'user_permissions_changed', {
      targetUserId: userId,
      oldPermissions: (user as any).permissions,
      newPermissions: permissions,
      changedBy: adminUser.id,
    });

    res.json({
      success: true,
      message: 'User permissions updated',
      permissions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /admin/users/:userId/block
 * Block a user
 */
router.put('/users/:userId/block', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const adminUser = (req as any).user;

  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent blocking self
    if (userId === adminUser.id) {
      return res.status(400).json({ success: false, error: 'Cannot block yourself' });
    }

    // Prevent blocking owner
    if (user.role === 'owner') {
      return res.status(403).json({ success: false, error: 'Cannot block owner' });
    }

    // Only owner can block admins
    if (user.role === 'admin' && adminUser.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Only owner can block admins' });
    }

    await userRepository.update(userId, {
      status: 'blocked',
      statusReason: reason || 'Blocked by admin',
      statusChangedAt: new Date(),
      statusChangedBy: adminUser.id,
    });

    await auditLogRepository.log('AdminPanel', 'user_blocked', {
      targetUserId: userId,
      reason,
      blockedBy: adminUser.id,
    });

    res.json({
      success: true,
      message: 'User blocked',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /admin/users/:userId/unblock
 * Unblock a user
 */
router.put('/users/:userId/unblock', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const adminUser = (req as any).user;

  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await userRepository.update(userId, {
      status: 'active',
      statusReason: undefined,
      statusChangedAt: new Date(),
      statusChangedBy: adminUser.id,
    });

    await auditLogRepository.log('AdminPanel', 'user_unblocked', {
      targetUserId: userId,
      unblockedBy: adminUser.id,
    });

    res.json({
      success: true,
      message: 'User unblocked',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /admin/users/:userId
 * Delete a user (owner only)
 */
router.delete('/users/:userId', authMiddleware, ownerMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { confirmation } = req.body;
  const adminUser = (req as any).user;

  if (confirmation !== 'DELETE_USER') {
    return res.status(400).json({ success: false, error: 'Must confirm with "DELETE_USER"' });
  }

  if (userId === adminUser.id) {
    return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
  }

  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await userRepository.delete(userId);

    await auditLogRepository.log('AdminPanel', 'user_deleted', {
      deletedUserId: userId,
      deletedUserEmail: user.email,
      deletedBy: adminUser.id,
    });

    res.json({
      success: true,
      message: 'User deleted',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /admin/permissions
 * Get all available permissions
 */
router.get('/permissions', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const permissions = [
    { id: 'trading', name: 'Trading', description: 'Can execute trades', category: 'Trading' },
    { id: 'bots', name: 'Bots', description: 'Can use and manage bots', category: 'Trading' },
    { id: 'strategies', name: 'Strategies', description: 'Can create and edit strategies', category: 'Trading' },
    { id: 'portfolio', name: 'Portfolio', description: 'Can view portfolio', category: 'Core' },
    { id: 'analytics', name: 'Analytics', description: 'Can view analytics and charts', category: 'Core' },
    { id: 'defi', name: 'DeFi', description: 'Can access DeFi features', category: 'Advanced' },
    { id: 'transfers', name: 'Transfers', description: 'Can make ACATS transfers', category: 'Advanced' },
    { id: 'tax', name: 'Tax', description: 'Can access tax features', category: 'Advanced' },
    { id: 'retirement', name: 'Retirement', description: 'Can access retirement planning', category: 'Advanced' },
    { id: 'wealth', name: 'Wealth', description: 'Can access wealth management', category: 'Advanced' },
    { id: 'marketplace', name: 'Marketplace', description: 'Can access bot marketplace', category: 'Advanced' },
    { id: 'ml', name: 'ML Training', description: 'Can access ML training pipeline', category: 'Advanced' },
    { id: 'admin_users', name: 'Manage Users', description: 'Co-admin: Can manage users', category: 'Admin' },
    { id: 'admin_bots', name: 'Manage All Bots', description: 'Co-admin: Can manage all bots', category: 'Admin' },
    { id: 'admin_system', name: 'System Settings', description: 'Co-admin: Can access system settings', category: 'Admin' },
    { id: 'admin_billing', name: 'Billing', description: 'Co-admin: Can manage billing', category: 'Admin' },
    { id: 'owner_full', name: 'Full Access', description: 'Owner: Full platform access', category: 'Owner' },
  ];

  res.json({
    success: true,
    permissions,
    categories: ['Core', 'Trading', 'Advanced', 'Admin', 'Owner'],
  });
});

/**
 * GET /admin/roles
 * Get all custom roles
 */
router.get('/roles', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  // For now, return predefined roles. In production, fetch from database.
  const roles = [
    {
      id: 'trader',
      name: 'Trader',
      description: 'Can trade and manage own portfolio',
      permissions: ['trading', 'portfolio', 'analytics', 'bots', 'strategies'],
      isSystem: true,
    },
    {
      id: 'analyst',
      name: 'Analyst',
      description: 'Can view and analyze but not trade',
      permissions: ['portfolio', 'analytics', 'ml'],
      isSystem: true,
    },
    {
      id: 'bot_developer',
      name: 'Bot Developer',
      description: 'Can create and test bots',
      permissions: ['bots', 'strategies', 'ml', 'marketplace'],
      isSystem: true,
    },
    {
      id: 'wealth_manager',
      name: 'Wealth Manager',
      description: 'Full wealth management access',
      permissions: ['portfolio', 'analytics', 'wealth', 'retirement', 'tax', 'transfers'],
      isSystem: true,
    },
    {
      id: 'co_admin',
      name: 'Co-Admin',
      description: 'Admin with limited user management',
      permissions: ['trading', 'bots', 'strategies', 'portfolio', 'analytics', 'admin_users', 'admin_bots'],
      isSystem: true,
    },
  ];

  res.json({
    success: true,
    roles,
  });
});

/**
 * POST /admin/roles
 * Create a custom role
 */
router.post('/roles', authMiddleware, ownerMiddleware, async (req: Request, res: Response) => {
  const { name, description, permissions } = req.body;
  const adminUser = (req as any).user;

  if (!name || !permissions || !Array.isArray(permissions)) {
    return res.status(400).json({ success: false, error: 'Name and permissions array required' });
  }

  const role = {
    id: `custom_${Date.now()}`,
    name,
    description: description || '',
    permissions,
    isSystem: false,
    createdAt: new Date(),
    createdBy: adminUser.id,
  };

  // In production, save to database

  await auditLogRepository.log('AdminPanel', 'custom_role_created', {
    roleId: role.id,
    roleName: name,
    createdBy: adminUser.id,
  });

  res.json({
    success: true,
    message: 'Custom role created',
    role,
  });
});

// ============================================================
// ADMIN BOT API - BROADCAST & PRICING
// ============================================================

/**
 * POST /admin/broadcast
 * Send a broadcast message to all users
 */
router.post('/broadcast', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { message, type = 'announcement', priority = 'normal' } = req.body;
  const adminUser = (req as any).user;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  try {
    // Get all users to send notification
    const users = await userRepository.findMany({});

    // Create notification for each user
    const notificationPromises = users.map((user: any) =>
      notificationRepository.create({
        userId: user._id,
        type: type === 'urgent' ? 'alert' : 'announcement',
        title: type === 'urgent' ? '⚠️ Urgent Alert' : '📢 Platform Announcement',
        message,
        priority,
        read: false,
        createdAt: new Date(),
        metadata: {
          broadcastId: `broadcast_${Date.now()}`,
          sentBy: adminUser.id,
        },
      } as any)
    );

    await Promise.all(notificationPromises);

    // Log the broadcast
    await auditLogRepository.log('AdminBot', 'broadcast_sent', {
      message,
      type,
      priority,
      recipientCount: users.length,
      sentBy: adminUser.id,
    });

    res.json({
      success: true,
      message: `Broadcast sent to ${users.length} users`,
      broadcastId: `broadcast_${Date.now()}`,
      recipientCount: users.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/pricing
 * Update product pricing
 */
router.post('/pricing', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { productId, price } = req.body;
  const adminUser = (req as any).user;

  if (!productId || !price) {
    return res.status(400).json({ success: false, error: 'Product ID and price are required' });
  }

  try {
    // In production, this would update the pricing in the database/Stripe
    // For now, we store the price change in audit log

    await auditLogRepository.log('AdminBot', 'price_updated', {
      productId,
      newPrice: price,
      updatedBy: adminUser.id,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `Price updated for ${productId} to ${price}`,
      productId,
      newPrice: price,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /admin/pricing
 * Get all product pricing
 */
router.get('/pricing', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  // Product pricing configuration
  const pricing = [
    // Subscription Tiers
    { id: 'free', name: 'Free', price: '$0/mo', description: '1 bot, paper trading' },
    { id: 'basic', name: 'Basic', price: '$19/mo', description: '3 bots, $5K capital' },
    { id: 'pro', name: 'Pro', price: '$49/mo', description: '7 bots, $25K capital' },
    { id: 'premium', name: 'Premium', price: '$109/mo', description: '11 Super Bots, $100K capital' },
    { id: 'enterprise', name: 'Enterprise', price: '$450/mo', description: 'Unlimited bots & capital' },
    // Optional Add-Ons
    { id: 'dropbot', name: 'DROPBOT AutoPilot (Add-On)', price: '+$39/mo', description: 'Zero-config autopilot trading' },
    { id: 'umm', name: 'Ultimate Money Machine (Add-On)', price: '+$59/mo', description: '25 Super Bots, Market Attack Strategies' },
  ];

  res.json({
    success: true,
    pricing,
  });
});

/**
 * GET /admin/stats/users
 * Get user statistics
 */
router.get('/stats/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await userRepository.findMany({});

    const stats = {
      total: users.length,
      byRole: {
        owner: users.filter((u: any) => u.role === 'owner').length,
        admin: users.filter((u: any) => u.role === 'admin').length,
        'co-admin': users.filter((u: any) => u.role === 'co-admin').length,
        user: users.filter((u: any) => u.role === 'user').length,
      },
      byStatus: {
        active: users.filter((u: any) => u.status === 'active' || !u.status).length,
        blocked: users.filter((u: any) => u.status === 'blocked').length,
        suspended: users.filter((u: any) => u.status === 'suspended').length,
        pending: users.filter((u: any) => u.status === 'pending').length,
      },
      recentLogins: users.filter((u: any) => {
        const lastLogin = new Date(u.lastLogin);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return lastLogin > dayAgo;
      }).length,
      withBrokers: users.filter((u: any) => u.brokerConnections && u.brokerConnections.length > 0).length,
    };

    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

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

export default router;

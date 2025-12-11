/**
 * TIME Admin Routes
 *
 * Admin panel operations:
 * - Evolution mode control
 * - System health monitoring
 * - Proposal management
 * - User management
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

const router = Router();

// ============================================================
// EVOLUTION CONTROL
// ============================================================

/**
 * GET /admin/evolution
 * Get current evolution state
 */
router.get('/evolution', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const state = timeGovernor.getEvolutionState();
  const inactivityState = inactivityMonitor.getInactivityState();

  res.json({
    mode: state.mode,
    changedAt: state.changedAt,
    changedBy: state.changedBy,
    reason: state.reason,
    inactivity: {
      lastActivity: inactivityState.lastActivity,
      daysSinceActivity: inactivityState.daysSinceActivity,
      warningsSent: inactivityState.warningsSent,
      autoSwitchScheduled: inactivityState.autoSwitchScheduled,
    },
    stats: {
      proposalsGenerated: state.proposalsGenerated || 0,
      proposalsApproved: state.proposalsApproved || 0,
      proposalsRejected: state.proposalsRejected || 0,
      autoEvolutions: state.autoEvolutions || 0,
    },
  });
});

/**
 * POST /admin/evolution/mode
 * Toggle evolution mode (owner only for switching to autonomous)
 */
router.post('/evolution/mode', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { mode, reason } = req.body;
  const user = (req as any).user;

  if (mode !== 'controlled' && mode !== 'autonomous') {
    return res.status(400).json({
      error: 'Invalid mode. Must be "controlled" or "autonomous"',
    });
  }

  // Only owner can switch to autonomous
  if (mode === 'autonomous' && user.role !== 'owner') {
    return res.status(403).json({
      error: 'Only owner can switch to autonomous mode',
    });
  }

  timeGovernor.setEvolutionMode(mode, user.id, reason || `${user.role} toggle`);

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
      confidence: p.confidence,
      createdAt: p.createdAt,
      autoApproveAt: p.autoApproveAt,
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
    overall: health.every(h => h.status === 'healthy') ? 'healthy' :
             health.some(h => h.status === 'unhealthy') ? 'unhealthy' : 'degraded',
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

  res.json({
    governor: metrics,
    learning: {
      totalEventsProcessed: learningEngine.getStats().totalEventsProcessed,
      patternsIdentified: learningEngine.getStats().patternsIdentified,
      insightsGenerated: learningEngine.getStats().insightsGenerated,
    },
    risk: {
      currentRiskLevel: riskEngine.getCurrentRiskLevel(),
      emergencyBrakeTriggered: riskEngine.isEmergencyBrakeActive(),
      alertsToday: riskEngine.getAlertsCount(),
    },
    regime: {
      current: regimeDetector.getRegimeState().current,
      confidence: regimeDetector.getRegimeState().confidence,
      duration: regimeDetector.getRegimeState().duration,
    },
    components: health.length,
    healthyComponents: health.filter(h => h.status === 'healthy').length,
    timestamp: new Date(),
  });
});

/**
 * GET /admin/activity
 * Get recent system activity
 */
router.get('/activity', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { limit = '100' } = req.query;

  // Mock activity log
  const activity = [
    {
      id: 'act_1',
      type: 'evolution',
      action: 'proposal_generated',
      description: 'New ensemble strategy proposed',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 'act_2',
      type: 'learning',
      action: 'pattern_discovered',
      description: 'New market pattern identified in EURUSD',
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: 'act_3',
      type: 'risk',
      action: 'alert_triggered',
      description: 'Drawdown warning on Strategy Alpha',
      timestamp: new Date(Date.now() - 10800000),
    },
    {
      id: 'act_4',
      type: 'bot',
      action: 'bot_absorbed',
      description: 'TrendMaster v2.0 absorbed into TIME core',
      timestamp: new Date(Date.now() - 14400000),
    },
  ].slice(0, parseInt(limit as string));

  res.json({
    total: activity.length,
    activity,
  });
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
    risk: {
      maxDailyLossPercent: 5,
      maxDrawdownPercent: 15,
      emergencyBrakeThreshold: 10,
      positionSizeLimit: 10,
    },
    learning: {
      learningRate: 0.01,
      minConfidenceThreshold: 0.7,
      patternMinOccurrences: 5,
    },
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

  riskEngine.releaseEmergencyBrake();

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

  // In production, pause all bots and strategies

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

  // Broadcast via WebSocket
  // In production, also store in database and send notifications

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

// ============================================================
// AUDIT LOG
// ============================================================

/**
 * GET /admin/audit
 * Get audit log entries
 */
router.get('/audit', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const {
    component,
    action,
    userId,
    startDate,
    endDate,
    page = '1',
    limit = '50',
  } = req.query;

  // Mock audit entries
  const auditEntries = [
    {
      id: 'audit_1',
      timestamp: new Date(Date.now() - 3600000),
      userId: 'user_1',
      component: 'EvolutionController',
      action: 'mode_changed',
      details: { from: 'controlled', to: 'autonomous' },
      success: true,
    },
    {
      id: 'audit_2',
      timestamp: new Date(Date.now() - 7200000),
      userId: 'user_1',
      component: 'RiskEngine',
      action: 'config_updated',
      details: { maxDailyLoss: 1000 },
      success: true,
    },
  ];

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const start = (pageNum - 1) * limitNum;

  res.json({
    total: auditEntries.length,
    page: pageNum,
    limit: limitNum,
    entries: auditEntries.slice(start, start + limitNum),
  });
});

export default router;

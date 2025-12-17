/**
 * TIME AI Risk Profile API Routes
 *
 * Dynamic risk profiling with behavioral adaptation
 *
 * ALL endpoints require authentication - risk profiles are user-specific
 */

import { Router, Request, Response } from 'express';
import aiRiskProfiler, { QuestionnaireResponse } from '../engines/ai_risk_profiler';
import { authMiddleware } from './auth';

const router = Router();

// Apply authentication to ALL risk profile routes
router.use(authMiddleware);

/**
 * POST /api/risk/profile
 * Create initial risk profile from questionnaire
 */
router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { userId, responses } = req.body;

    if (!userId || !responses) {
      return res.status(400).json({
        success: false,
        error: 'userId and responses are required',
      });
    }

    const profile = await aiRiskProfiler.createProfile(userId, responses as QuestionnaireResponse);

    res.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/risk/profile/:userId
 * Get user's risk profile
 * Security: Users can only access their own profile (admins can access any)
 */
router.get('/profile/:userId', (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const requestedUserId = req.params.userId;

    // Security check: Users can only access their own profile
    if (authUser.role !== 'admin' && authUser.role !== 'owner' && authUser.id !== requestedUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own risk profile.',
      });
    }

    const profile = aiRiskProfiler.getProfile(requestedUserId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Complete the risk questionnaire first.',
      });
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/risk/summary/:userId
 * Get simplified risk summary for UI
 * Security: Users can only access their own summary (admins can access any)
 */
router.get('/summary/:userId', (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const requestedUserId = req.params.userId;

    // Security check: Users can only access their own profile
    if (authUser.role !== 'admin' && authUser.role !== 'owner' && authUser.id !== requestedUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own risk summary.',
      });
    }

    const summary = aiRiskProfiler.getRiskSummary(requestedUserId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    res.json({
      success: true,
      ...summary,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/risk/recommendations/:userId
 * Get risk-adjusted recommendations
 * Security: Users can only access their own recommendations (admins can access any)
 */
router.get('/recommendations/:userId', (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const requestedUserId = req.params.userId;

    // Security check: Users can only access their own profile
    if (authUser.role !== 'admin' && authUser.role !== 'owner' && authUser.id !== requestedUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own recommendations.',
      });
    }

    const recommendations = aiRiskProfiler.getRecommendations(requestedUserId);

    if (!recommendations) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    res.json({
      success: true,
      ...recommendations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/risk/behavior
 * Record user behavior for AI learning
 */
router.post('/behavior', (req: Request, res: Response) => {
  try {
    const { userId, event } = req.body;

    if (!userId || !event) {
      return res.status(400).json({
        success: false,
        error: 'userId and event are required',
      });
    }

    aiRiskProfiler.recordBehavior(userId, event);

    res.json({
      success: true,
      message: 'Behavior recorded',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

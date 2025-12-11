/**
 * TIME AI Risk Profile API Routes
 *
 * Dynamic risk profiling with behavioral adaptation
 */

import { Router, Request, Response } from 'express';
import aiRiskProfiler, { QuestionnaireResponse } from '../engines/ai_risk_profiler';

const router = Router();

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
 */
router.get('/profile/:userId', (req: Request, res: Response) => {
  try {
    const profile = aiRiskProfiler.getProfile(req.params.userId);

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
 */
router.get('/summary/:userId', (req: Request, res: Response) => {
  try {
    const summary = aiRiskProfiler.getRiskSummary(req.params.userId);

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
 */
router.get('/recommendations/:userId', (req: Request, res: Response) => {
  try {
    const recommendations = aiRiskProfiler.getRecommendations(req.params.userId);

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

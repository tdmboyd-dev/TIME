/**
 * TIME Robo-Advisory API Routes
 *
 * Endpoints for automated portfolio management.
 */

import { Router, Request, Response } from 'express';
import { roboAdvisor, RISK_QUESTIONS } from '../robo/robo_advisor';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/robo/questions
 * Get risk assessment questionnaire
 */
router.get('/questions', (req: Request, res: Response) => {
  try {
    const questions = roboAdvisor.getRiskQuestions();

    res.json({
      success: true,
      data: {
        questions,
        instructions: 'Answer each question to determine your risk profile',
      },
    });
  } catch (error) {
    logger.error('Get questions failed', { error });
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

/**
 * POST /api/v1/robo/risk-profile
 * Calculate risk profile from answers
 */
router.post('/risk-profile', (req: Request, res: Response) => {
  try {
    const { answers } = req.body;

    if (!answers) {
      return res.status(400).json({ error: 'answers are required' });
    }

    const profile = roboAdvisor.calculateRiskProfile(answers);

    res.json({
      success: true,
      data: {
        profile,
        message: `Your risk profile is ${profile.level}`,
      },
    });
  } catch (error) {
    logger.error('Calculate risk profile failed', { error });
    res.status(500).json({ error: 'Failed to calculate risk profile' });
  }
});

/**
 * GET /api/v1/robo/portfolios
 * Get model portfolios
 */
router.get('/portfolios', (req: Request, res: Response) => {
  try {
    const portfolios = roboAdvisor.getModelPortfolios();

    res.json({
      success: true,
      data: portfolios,
    });
  } catch (error) {
    logger.error('Get portfolios failed', { error });
    res.status(500).json({ error: 'Failed to get portfolios' });
  }
});

/**
 * POST /api/v1/robo/goals
 * Create investment goal
 */
router.post('/goals', (req: Request, res: Response) => {
  try {
    const {
      userId,
      name,
      type,
      targetAmount,
      targetDate,
      monthlyContribution,
      riskAnswers,
    } = req.body;

    if (!userId || !name || !type || !targetAmount || !targetDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const goal = roboAdvisor.createGoal({
      userId,
      name,
      type,
      targetAmount,
      targetDate: new Date(targetDate),
      monthlyContribution: monthlyContribution || 0,
      riskAnswers: riskAnswers || {},
    });

    res.json({
      success: true,
      data: {
        goal,
        message: `Goal "${name}" created with ${goal.riskProfile.level} risk profile`,
      },
    });
  } catch (error) {
    logger.error('Create goal failed', { error });
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * GET /api/v1/robo/goals
 * Get all goals for user
 */
router.get('/goals', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const goals = roboAdvisor.getUserGoals(userId);

    res.json({
      success: true,
      data: {
        goals,
        count: goals.length,
      },
    });
  } catch (error) {
    logger.error('Get goals failed', { error });
    res.status(500).json({ error: 'Failed to get goals' });
  }
});

/**
 * GET /api/v1/robo/goals/:goalId
 * Get goal details
 */
router.get('/goals/:goalId', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;

    const goal = roboAdvisor.getGoal(goalId);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    logger.error('Get goal failed', { error });
    res.status(500).json({ error: 'Failed to get goal' });
  }
});

/**
 * PUT /api/v1/robo/goals/:goalId
 * Update goal
 */
router.put('/goals/:goalId', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { name, targetAmount, targetDate, monthlyContribution } = req.body;

    const goal = roboAdvisor.updateGoal(goalId, {
      name,
      targetAmount,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      monthlyContribution,
    });

    res.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    logger.error('Update goal failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update goal' });
  }
});

/**
 * DELETE /api/v1/robo/goals/:goalId
 * Delete goal
 */
router.delete('/goals/:goalId', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    roboAdvisor.deleteGoal(goalId, userId);

    res.json({
      success: true,
      message: 'Goal deleted',
    });
  } catch (error) {
    logger.error('Delete goal failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete goal' });
  }
});

/**
 * GET /api/v1/robo/goals/:goalId/progress
 * Get goal progress projection
 */
router.get('/goals/:goalId/progress', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;

    const progress = roboAdvisor.projectProgress(goalId);

    res.json({
      success: true,
      data: {
        ...progress,
        message: progress.onTrack
          ? 'You are on track to meet your goal!'
          : `You may be $${progress.shortfall.toLocaleString()} short. Consider increasing contributions by $${progress.recommendedMonthlyIncrease}/month.`,
      },
    });
  } catch (error) {
    logger.error('Get progress failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get progress' });
  }
});

/**
 * POST /api/v1/robo/goals/:goalId/rebalance/check
 * Check if rebalancing is needed
 */
router.post('/goals/:goalId/rebalance/check', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { currentHoldings } = req.body;

    if (!currentHoldings) {
      return res.status(400).json({ error: 'currentHoldings are required' });
    }

    const recommendation = roboAdvisor.checkRebalance(goalId, currentHoldings);

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    logger.error('Check rebalance failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to check rebalance' });
  }
});

/**
 * POST /api/v1/robo/goals/:goalId/rebalance/execute
 * Execute rebalancing
 */
router.post('/goals/:goalId/rebalance/execute', async (req: Request, res: Response) => {
  try {
    const { recommendation } = req.body;

    if (!recommendation) {
      return res.status(400).json({ error: 'recommendation is required' });
    }

    // Mock trade execution
    const executeTrade = async (order: { symbol: string; side: 'buy' | 'sell'; amount: number }) => {
      logger.info('Executing rebalance trade', order);
    };

    const result = await roboAdvisor.executeRebalance(recommendation, executeTrade);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    logger.error('Execute rebalance failed', { error });
    res.status(500).json({ error: 'Failed to execute rebalance' });
  }
});

export default router;

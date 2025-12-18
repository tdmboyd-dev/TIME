/**
 * TIME Robo-Advisory API Routes
 *
 * Endpoints for automated portfolio management.
 */

import { Router, Request, Response } from 'express';
import { roboAdvisor, RISK_QUESTIONS } from '../robo/robo_advisor';
import { logger } from '../utils/logger';
import { authMiddleware } from './auth';
import { requireFeature } from '../middleware/tierAccess';

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
 * Execute rebalancing with REAL broker integration
 * REQUIRES: STARTER+ tier (robo_advisor feature)
 */
router.post('/goals/:goalId/rebalance/execute', authMiddleware, requireFeature('robo_advisor'), async (req: Request, res: Response) => {
  try {
    const { recommendation, brokerId } = req.body;

    if (!recommendation) {
      return res.status(400).json({ error: 'recommendation is required' });
    }

    // Import BrokerManager for real trade execution
    const { BrokerManager } = await import('../brokers/broker_manager');
    const brokerManager = BrokerManager.getInstance();

    // Verify broker is connected
    const status = brokerManager.getStatus();
    if (status.connectedBrokers === 0) {
      return res.status(503).json({
        error: 'No brokers connected. Please connect a broker first.',
        availableBrokers: status.brokers
      });
    }

    // Track executed trades
    const executedTrades: Array<{ symbol: string; side: string; amount: number; orderId?: string; status: string }> = [];

    // REAL trade execution via BrokerManager
    const executeTrade = async (order: { symbol: string; side: 'buy' | 'sell'; amount: number }) => {
      logger.info('Executing REAL rebalance trade via broker', order);

      try {
        // Get quote to calculate shares from dollar amount
        const quote = await brokerManager.getQuote(order.symbol);
        const shares = Math.floor(order.amount / quote.ask);

        if (shares <= 0) {
          logger.warn('Order amount too small for 1 share', { symbol: order.symbol, amount: order.amount, price: quote.ask });
          executedTrades.push({
            symbol: order.symbol,
            side: order.side,
            amount: order.amount,
            status: 'skipped_too_small'
          });
          return;
        }

        // Submit order to broker
        const result = await brokerManager.submitOrder(
          {
            symbol: order.symbol,
            side: order.side,
            type: 'market',
            quantity: shares,
          },
          'stock',
          brokerId // Use specified broker or auto-route
        );

        executedTrades.push({
          symbol: order.symbol,
          side: order.side,
          amount: order.amount,
          orderId: result.order.id,
          status: result.order.status
        });

        logger.info('Rebalance trade executed', {
          symbol: order.symbol,
          side: order.side,
          shares,
          orderId: result.order.id,
          brokerId: result.brokerId
        });
      } catch (tradeError) {
        logger.error('Failed to execute rebalance trade', {
          symbol: order.symbol,
          error: tradeError instanceof Error ? tradeError.message : 'Unknown error'
        });
        executedTrades.push({
          symbol: order.symbol,
          side: order.side,
          amount: order.amount,
          status: 'failed: ' + (tradeError instanceof Error ? tradeError.message : 'Unknown error')
        });
        throw tradeError;
      }
    };

    const result = await roboAdvisor.executeRebalance(recommendation, executeTrade);

    res.json({
      success: result.success,
      data: {
        ...result,
        executedTrades,
        broker: brokerId || 'auto-routed'
      },
    });
  } catch (error) {
    logger.error('Execute rebalance failed', { error });
    res.status(500).json({ error: 'Failed to execute rebalance' });
  }
});

/**
 * GET /api/v1/robo/goals/:goalId/holdings
 * Get REAL holdings from broker for a goal
 */
router.get('/goals/:goalId/holdings', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const brokerId = req.query.brokerId as string | undefined;

    const goal = roboAdvisor.getGoal(goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Import BrokerManager for real positions
    const { BrokerManager } = await import('../brokers/broker_manager');
    const brokerManager = BrokerManager.getInstance();

    // Get all positions from connected brokers
    const allPositions = await brokerManager.getAllPositions();

    // Filter to goal's ETFs
    const goalETFs = goal.allocation.map(a => a.etf);
    const holdings: Array<{ symbol: string; value: number; shares: number; brokerId: string }> = [];

    for (const { brokerId: broker, position } of allPositions) {
      if (brokerId && broker !== brokerId) continue;

      if (goalETFs.includes(position.symbol)) {
        holdings.push({
          symbol: position.symbol,
          value: position.marketValue,
          shares: position.quantity,
          brokerId: broker
        });
      }
    }

    // Calculate total and current allocation
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const currentAllocation = goal.allocation.map(asset => {
      const holding = holdings.find(h => h.symbol === asset.etf);
      const currentPercent = holding ? (holding.value / totalValue) * 100 : 0;
      return {
        ...asset,
        currentPercent,
        currentValue: holding?.value || 0,
        drift: currentPercent - asset.targetPercent
      };
    });

    res.json({
      success: true,
      data: {
        goalId,
        holdings,
        totalValue,
        currentAllocation,
        needsRebalance: currentAllocation.some(a => Math.abs(a.drift) >= 5)
      }
    });
  } catch (error) {
    logger.error('Get holdings failed', { error });
    res.status(500).json({ error: 'Failed to get holdings' });
  }
});

/**
 * POST /api/v1/robo/goals/:goalId/invest
 * Invest new money into a goal with proper allocation
 */
router.post('/goals/:goalId/invest', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { amount, brokerId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'amount must be positive' });
    }

    const goal = roboAdvisor.getGoal(goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Import BrokerManager for real trade execution
    const { BrokerManager } = await import('../brokers/broker_manager');
    const brokerManager = BrokerManager.getInstance();

    const status = brokerManager.getStatus();
    if (status.connectedBrokers === 0) {
      return res.status(503).json({ error: 'No brokers connected' });
    }

    const orders: Array<{ symbol: string; amount: number; shares: number; orderId: string; status: string }> = [];

    // Distribute investment according to target allocation
    for (const asset of goal.allocation) {
      const investAmount = (asset.targetPercent / 100) * amount;

      if (investAmount < 1) continue; // Skip tiny allocations

      try {
        // Get quote for share calculation
        const quote = await brokerManager.getQuote(asset.etf);
        const shares = Math.floor(investAmount / quote.ask);

        if (shares <= 0) continue;

        // Execute buy order
        const result = await brokerManager.submitOrder(
          {
            symbol: asset.etf,
            side: 'buy',
            type: 'market',
            quantity: shares,
          },
          'stock',
          brokerId
        );

        orders.push({
          symbol: asset.etf,
          amount: investAmount,
          shares,
          orderId: result.order.id,
          status: result.order.status
        });

        logger.info('Investment order executed', {
          goalId,
          symbol: asset.etf,
          shares,
          orderId: result.order.id
        });
      } catch (orderError) {
        logger.error('Investment order failed', {
          symbol: asset.etf,
          error: orderError instanceof Error ? orderError.message : 'Unknown'
        });
        orders.push({
          symbol: asset.etf,
          amount: investAmount,
          shares: 0,
          orderId: '',
          status: 'failed'
        });
      }
    }

    // Update goal's current amount
    const successfulAmount = orders
      .filter(o => o.status !== 'failed')
      .reduce((sum, o) => sum + o.amount, 0);

    res.json({
      success: true,
      data: {
        goalId,
        requestedAmount: amount,
        investedAmount: successfulAmount,
        orders,
        newBalance: goal.currentAmount + successfulAmount
      }
    });
  } catch (error) {
    logger.error('Invest failed', { error });
    res.status(500).json({ error: 'Failed to invest' });
  }
});

export default router;

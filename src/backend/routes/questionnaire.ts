/**
 * Money Machine Questionnaire Routes
 *
 * Auto-configures Money Machine based on user answers.
 * Hides complexity from users - they answer 5 simple questions
 * and get a perfectly configured trading system.
 */

import { Router, Request, Response } from 'express';
import { moneyMachineQuestionnaireService, QuestionnaireAnswers } from '../services/MoneyMachineQuestionnaireService';
import { platformFeeService } from '../services/PlatformFeeService';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('QuestionnaireRoutes');

/**
 * GET /questionnaire/questions
 * Get all questionnaire questions with hover explanations
 */
router.get('/questions', (_req: Request, res: Response) => {
  try {
    const questions = moneyMachineQuestionnaireService.getQuestions();

    res.json({
      success: true,
      questions,
      instructions: 'Answer each question to auto-configure your Money Machine. Hover over options to see detailed explanations.',
    });
  } catch (error) {
    logger.error('Questions error', { error });
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

/**
 * POST /questionnaire/submit
 * Submit answers and get auto-configuration
 */
router.post('/submit', (req: Request, res: Response) => {
  try {
    const answers: QuestionnaireAnswers = req.body;

    // Validate required fields
    const required = ['riskTolerance', 'investmentGoal', 'timeHorizon', 'tradingStyle', 'capitalAmount'];
    const missing = required.filter(field => !answers[field as keyof QuestionnaireAnswers]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required answers',
        missing,
      });
    }

    // Process answers and generate configuration
    const config = moneyMachineQuestionnaireService.processAnswers(answers);

    res.json({
      success: true,
      config,
      message: 'Your Money Machine has been configured!',
      nextSteps: [
        'Review your configuration below',
        'Click "Activate" to start trading',
        'You can adjust settings anytime from the dashboard',
      ],
    });
  } catch (error) {
    logger.error('Submit error', { error });
    res.status(500).json({ error: 'Failed to process questionnaire' });
  }
});

/**
 * GET /questionnaire/risk-explanations
 * Get plain English explanations for all risk levels (for hover tooltips)
 */
router.get('/risk-explanations', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      riskLevels: {
        ultra_safe: {
          label: 'Ultra Safe',
          shortDescription: "I don't want to lose anything",
          hoverExplanation: "Your bots will only take the safest trades with very small position sizes. Maximum loss protection is enabled. You may see smaller gains, but your capital is well-protected. Expected: 8-12% annually.",
          expectedReturn: '8-12% annually',
          maxDrawdown: '3%',
          tradingFrequency: 'Low (5-10 trades/day)',
        },
        conservative: {
          label: 'Conservative',
          shortDescription: 'Small, steady gains',
          hoverExplanation: "Your bots prioritize keeping your money safe while seeking modest gains. Stop losses at 5% protect against big losses. Good for retirement funds or money you need to keep safe. Expected: 12-18% annually.",
          expectedReturn: '12-18% annually',
          maxDrawdown: '5%',
          tradingFrequency: 'Low-Medium (10-20 trades/day)',
        },
        moderate: {
          label: 'Moderate',
          shortDescription: 'Balanced risk and reward',
          hoverExplanation: "A balanced approach where bots take calculated risks for reasonable returns. You'll see some ups and downs, but overall growth should be steady. Stop losses at 10%. Expected: 18-28% annually.",
          expectedReturn: '18-28% annually',
          maxDrawdown: '10%',
          tradingFrequency: 'Medium (20-35 trades/day)',
        },
        aggressive: {
          label: 'Aggressive',
          shortDescription: 'I want big gains, can handle losses',
          hoverExplanation: "Bots pursue higher returns and accept larger temporary losses. You might see your portfolio drop 15% before recovering to new highs. Only choose this if you won't panic-sell during dips. Expected: 28-45% annually.",
          expectedReturn: '28-45% annually',
          maxDrawdown: '15%',
          tradingFrequency: 'High (35-50 trades/day)',
        },
        maximum: {
          label: 'Maximum',
          shortDescription: 'Go all out, I understand the risks',
          hoverExplanation: "All Super Bots enabled at full power. Maximum profit pursuit with significant risk. You may see 20%+ drawdowns. Only for experienced traders who can stomach volatility. This is hedge fund-level risk. Expected: 45-66% annually.",
          expectedReturn: '45-66% annually',
          maxDrawdown: '20%+',
          tradingFrequency: 'Very High (50-100 trades/day)',
        },
      },
    });
  } catch (error) {
    logger.error('Risk explanations error', { error });
    res.status(500).json({ error: 'Failed to get risk explanations' });
  }
});

/**
 * GET /questionnaire/fee-info
 * Get fee information for Money Machine and DropBot
 */
router.get('/fee-info', (_req: Request, res: Response) => {
  try {
    const stats = platformFeeService.getStats();

    res.json({
      success: true,
      fees: {
        moneyMachine: {
          percentage: '10%',
          description: 'Platform fee deducted automatically from each profitable trade',
          example: 'If you make $100 profit, $10 goes to the platform, you keep $90',
          note: 'No fee on losing trades - we only take a cut when you win!',
        },
        dropbot: {
          percentage: '10%',
          description: 'Same as Money Machine - 10% of profits',
          example: 'If you make $50 profit, $5 goes to the platform, you keep $45',
          note: 'Completely hands-off, fees are invisible',
        },
        timebeunus: {
          percentage: '0%',
          description: 'Platform owner pays no fees',
          note: 'All profits go directly to you',
        },
      },
      currentStats: stats,
    });
  } catch (error) {
    logger.error('Fee info error', { error });
    res.status(500).json({ error: 'Failed to get fee info' });
  }
});

export default router;

/**
 * Money Machine Questionnaire Service
 *
 * Auto-configures Money Machine based on user preferences via a simple questionnaire.
 * Hides the complexity of bot selection and strategy configuration.
 * User answers 5 simple questions → System auto-configures optimal setup.
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('MoneyMachineQuestionnaireService');

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  description: string;
  options: {
    id: string;
    label: string;
    description: string;
    hoverExplanation: string; // Plain English explanation on hover
  }[];
}

export interface QuestionnaireAnswers {
  riskTolerance: 'ultra_safe' | 'conservative' | 'moderate' | 'aggressive' | 'maximum';
  investmentGoal: 'preserve' | 'income' | 'growth' | 'aggressive_growth';
  timeHorizon: 'short' | 'medium' | 'long' | 'very_long';
  tradingStyle: 'set_forget' | 'weekly_check' | 'daily_active' | 'always_on';
  capitalAmount: 'small' | 'medium' | 'large' | 'institutional';
}

export interface AutoConfig {
  botsToActivate: string[];
  riskMultiplier: number;
  maxPositionSize: number;
  maxDailyTrades: number;
  tradingHours: 'market_hours' | '24_7';
  autoRebalance: boolean;
  stopLossPercent: number;
  takeProfitPercent: number;
  confidenceThreshold: number;
  automationLevel: 'full' | 'semi' | 'manual';
  plainEnglishSummary: string;
}

class MoneyMachineQuestionnaireService {
  private questions: QuestionnaireQuestion[] = [
    {
      id: 'risk_tolerance',
      question: 'How do you feel about risk?',
      description: 'This determines how aggressive your bots will trade.',
      options: [
        {
          id: 'ultra_safe',
          label: 'Ultra Safe',
          description: "I don't want to lose anything",
          hoverExplanation: "Your bots will only take the safest trades with very small position sizes. Expected gains: 8-12% annually. Maximum loss protection enabled.",
        },
        {
          id: 'conservative',
          label: 'Conservative',
          description: 'Small, steady gains',
          hoverExplanation: "Your bots will prioritize capital preservation while seeking modest gains. Expected: 12-18% annually. Stop losses at 5%.",
        },
        {
          id: 'moderate',
          label: 'Moderate',
          description: 'Balanced risk and reward',
          hoverExplanation: "A balanced approach - your bots will take calculated risks for reasonable returns. Expected: 18-28% annually. Stop losses at 10%.",
        },
        {
          id: 'aggressive',
          label: 'Aggressive',
          description: 'I want big gains, can handle losses',
          hoverExplanation: "Your bots will pursue higher returns and accept larger temporary losses. Expected: 28-45% annually. Stop losses at 15%.",
        },
        {
          id: 'maximum',
          label: 'Maximum',
          description: 'Go all out, I understand the risks',
          hoverExplanation: "Maximum profit pursuit with all Super Bots enabled. High reward, high risk. Expected: 45-66% annually. You may see significant drawdowns.",
        },
      ],
    },
    {
      id: 'investment_goal',
      question: 'What is your primary goal?',
      description: 'This shapes which strategies your bots will use.',
      options: [
        {
          id: 'preserve',
          label: 'Preserve Capital',
          description: 'Protect what I have',
          hoverExplanation: "Bots focus on hedging and protection. Minimal trading, maximum safety. Best for retirement funds or savings you can't afford to lose.",
        },
        {
          id: 'income',
          label: 'Generate Income',
          description: 'Regular cash flow',
          hoverExplanation: "Bots focus on dividend stocks, yield farming, and income-generating strategies. Steady monthly returns rather than big gains.",
        },
        {
          id: 'growth',
          label: 'Grow Wealth',
          description: 'Build long-term wealth',
          hoverExplanation: "Bots focus on growth stocks, momentum strategies, and compounding returns. Best for 5+ year time horizons.",
        },
        {
          id: 'aggressive_growth',
          label: 'Aggressive Growth',
          description: 'Maximum returns',
          hoverExplanation: "All offensive strategies enabled. Momentum, breakouts, leveraged positions. Highest potential returns with highest volatility.",
        },
      ],
    },
    {
      id: 'time_horizon',
      question: 'How long do you plan to invest?',
      description: 'This affects position sizing and strategy selection.',
      options: [
        {
          id: 'short',
          label: 'Less than 1 year',
          description: 'Quick results needed',
          hoverExplanation: "Bots will focus on shorter-term trades with quicker exits. More active trading to capture opportunities faster.",
        },
        {
          id: 'medium',
          label: '1-3 years',
          description: 'Medium-term growth',
          hoverExplanation: "Balanced approach between short-term trades and longer holds. Good mix of strategies for steady growth.",
        },
        {
          id: 'long',
          label: '3-5 years',
          description: 'Patient investor',
          hoverExplanation: "Bots can ride out market volatility. Larger positions, fewer trades, compound growth focus.",
        },
        {
          id: 'very_long',
          label: '5+ years',
          description: 'Long-term builder',
          hoverExplanation: "Maximum compounding potential. Bots will take advantage of market cycles and reinvest all profits for exponential growth.",
        },
      ],
    },
    {
      id: 'trading_style',
      question: 'How involved do you want to be?',
      description: 'This sets your automation level.',
      options: [
        {
          id: 'set_forget',
          label: 'Set and Forget',
          description: "I don't want to think about it",
          hoverExplanation: "100% automated. Bots handle everything. You'll get weekly summary emails but don't need to do anything.",
        },
        {
          id: 'weekly_check',
          label: 'Weekly Check-in',
          description: 'Quick look once a week',
          hoverExplanation: "Mostly automated. Dashboard shows weekly performance. You can adjust settings anytime but bots run independently.",
        },
        {
          id: 'daily_active',
          label: 'Daily Active',
          description: 'I like to watch and tweak',
          hoverExplanation: "Semi-automated. Real-time notifications of trades. You can override bot decisions or pause specific bots anytime.",
        },
        {
          id: 'always_on',
          label: 'Always On',
          description: 'I want full control',
          hoverExplanation: "Manual approval mode. Bots suggest trades but YOU confirm each one. Maximum control, requires time commitment.",
        },
      ],
    },
    {
      id: 'capital_amount',
      question: 'How much are you investing?',
      description: 'This determines position sizing and diversification.',
      options: [
        {
          id: 'small',
          label: '$100 - $1,000',
          description: 'Starting small',
          hoverExplanation: "Perfect for learning! Bots will use smaller position sizes and focus on lower-risk strategies. Great way to test the system.",
        },
        {
          id: 'medium',
          label: '$1,000 - $10,000',
          description: 'Serious starter',
          hoverExplanation: "Good capital base. Bots can properly diversify across multiple strategies. Recommended minimum for best results.",
        },
        {
          id: 'large',
          label: '$10,000 - $100,000',
          description: 'Significant investment',
          hoverExplanation: "Excellent capital level. Full diversification across all 25 Super Bots. Institutional-grade position sizing.",
        },
        {
          id: 'institutional',
          label: '$100,000+',
          description: 'Institutional level',
          hoverExplanation: "Premium tier. Access to advanced strategies, custom position sizing, and dedicated support. Maximum diversification.",
        },
      ],
    },
  ];

  /**
   * Get all questionnaire questions
   */
  getQuestions(): QuestionnaireQuestion[] {
    return this.questions;
  }

  /**
   * Process answers and generate auto-configuration
   */
  processAnswers(answers: QuestionnaireAnswers): AutoConfig {
    logger.info('Processing questionnaire answers', answers);

    // Determine bots based on answers
    const botsToActivate = this.selectBots(answers);

    // Calculate configuration based on answers
    const config: AutoConfig = {
      botsToActivate,
      riskMultiplier: this.getRiskMultiplier(answers.riskTolerance),
      maxPositionSize: this.getMaxPositionSize(answers.riskTolerance, answers.capitalAmount),
      maxDailyTrades: this.getMaxDailyTrades(answers.tradingStyle),
      tradingHours: answers.tradingStyle === 'always_on' ? '24_7' : 'market_hours',
      autoRebalance: answers.tradingStyle !== 'always_on',
      stopLossPercent: this.getStopLoss(answers.riskTolerance),
      takeProfitPercent: this.getTakeProfit(answers.riskTolerance, answers.investmentGoal),
      confidenceThreshold: this.getConfidenceThreshold(answers.riskTolerance),
      automationLevel: this.getAutomationLevel(answers.tradingStyle),
      plainEnglishSummary: this.generateSummary(answers),
    };

    logger.info('Auto-configuration generated', config);
    return config;
  }

  private selectBots(answers: QuestionnaireAnswers): string[] {
    const bots: string[] = [];

    // Base bots based on goal
    if (answers.investmentGoal === 'preserve') {
      bots.push('iron_fortress', 'wealth_engine'); // Risk guardians
    } else if (answers.investmentGoal === 'income') {
      bots.push('yield_monster', 'money_printer', 'stack_attack'); // Yield/DCA bots
    } else if (answers.investmentGoal === 'growth') {
      bots.push('thunder_bolt', 'cyber_prophet', 'quantum_beast'); // Growth bots
    } else {
      bots.push('phantom_king', 'leviathan_stalker', 'hydra_force'); // Aggressive bots
    }

    // Add based on risk tolerance
    if (answers.riskTolerance === 'aggressive' || answers.riskTolerance === 'maximum') {
      bots.push('void_crusher', 'death_strike', 'neural_overlord');
    }

    if (answers.riskTolerance === 'maximum') {
      bots.push('headline_killer', 'wall_breaker', 'void_jumper');
    }

    // Add execution bot for larger accounts
    if (answers.capitalAmount === 'large' || answers.capitalAmount === 'institutional') {
      bots.push('death_strike', 'blood_money');
    }

    return [...new Set(bots)]; // Remove duplicates
  }

  private getRiskMultiplier(riskTolerance: QuestionnaireAnswers['riskTolerance']): number {
    const map = { ultra_safe: 0.5, conservative: 0.75, moderate: 1.0, aggressive: 1.5, maximum: 2.0 };
    return map[riskTolerance];
  }

  private getMaxPositionSize(
    riskTolerance: QuestionnaireAnswers['riskTolerance'],
    capitalAmount: QuestionnaireAnswers['capitalAmount']
  ): number {
    const riskMap = { ultra_safe: 0.02, conservative: 0.03, moderate: 0.05, aggressive: 0.08, maximum: 0.10 };
    const capitalMap = { small: 0.8, medium: 1.0, large: 1.2, institutional: 1.5 };
    return riskMap[riskTolerance] * capitalMap[capitalAmount];
  }

  private getMaxDailyTrades(tradingStyle: QuestionnaireAnswers['tradingStyle']): number {
    const map = { set_forget: 10, weekly_check: 25, daily_active: 50, always_on: 100 };
    return map[tradingStyle];
  }

  private getStopLoss(riskTolerance: QuestionnaireAnswers['riskTolerance']): number {
    const map = { ultra_safe: 3, conservative: 5, moderate: 10, aggressive: 15, maximum: 20 };
    return map[riskTolerance];
  }

  private getTakeProfit(
    riskTolerance: QuestionnaireAnswers['riskTolerance'],
    investmentGoal: QuestionnaireAnswers['investmentGoal']
  ): number {
    const baseMap = { ultra_safe: 5, conservative: 10, moderate: 15, aggressive: 25, maximum: 40 };
    const goalMultiplier = investmentGoal === 'aggressive_growth' ? 1.5 : 1;
    return baseMap[riskTolerance] * goalMultiplier;
  }

  private getConfidenceThreshold(riskTolerance: QuestionnaireAnswers['riskTolerance']): number {
    const map = { ultra_safe: 90, conservative: 80, moderate: 70, aggressive: 60, maximum: 50 };
    return map[riskTolerance];
  }

  private getAutomationLevel(tradingStyle: QuestionnaireAnswers['tradingStyle']): 'full' | 'semi' | 'manual' {
    if (tradingStyle === 'set_forget' || tradingStyle === 'weekly_check') return 'full';
    if (tradingStyle === 'daily_active') return 'semi';
    return 'manual';
  }

  private generateSummary(answers: QuestionnaireAnswers): string {
    const riskDescriptions = {
      ultra_safe: "ultra-safe with maximum protection",
      conservative: "conservative with steady gains",
      moderate: "balanced with calculated risks",
      aggressive: "aggressive pursuing higher returns",
      maximum: "maximum risk for maximum reward",
    };

    const goalDescriptions = {
      preserve: "protecting your capital",
      income: "generating regular income",
      growth: "building long-term wealth",
      aggressive_growth: "maximizing returns",
    };

    return `Your Money Machine is configured for ${riskDescriptions[answers.riskTolerance]} ` +
      `trading, focused on ${goalDescriptions[answers.investmentGoal]}. ` +
      `Based on your ${answers.timeHorizon.replace('_', ' ')} time horizon and ` +
      `${answers.tradingStyle.replace('_', ' ')} involvement preference, ` +
      `we've selected the optimal Super Bots for your profile.`;
  }
}

export const moneyMachineQuestionnaireService = new MoneyMachineQuestionnaireService();

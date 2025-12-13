/**
 * TIME Robo-Advisory Engine
 *
 * Automated portfolio management that rivals Betterment and Wealthfront.
 * Features: Risk assessment, automatic rebalancing, glide paths, goal-based investing.
 *
 * PLAIN ENGLISH:
 * - Automatically manages your investments based on your goals and risk tolerance
 * - Keeps your portfolio balanced (rebalancing)
 * - Adjusts risk as you get older (glide path)
 * - Helps you save for specific goals (retirement, house, education)
 *
 * WHAT IT DOES:
 * 1. Figures out how much risk you should take
 * 2. Creates a portfolio mix (stocks, bonds, etc.)
 * 3. Automatically rebalances when things drift
 * 4. Gets more conservative as you approach your goal date
 */

import { logger } from '../utils/logger';

// Risk levels
export type RiskLevel = 'conservative' | 'moderate_conservative' | 'moderate' | 'moderate_aggressive' | 'aggressive';

// Goal types
export type GoalType = 'retirement' | 'home' | 'education' | 'emergency_fund' | 'general_savings' | 'major_purchase';

// Asset classes
export type AssetClass = 'us_stocks' | 'intl_stocks' | 'emerging_stocks' | 'us_bonds' | 'intl_bonds' | 'tips' | 'reits' | 'commodities' | 'cash';

// Asset allocation
export interface AssetAllocation {
  assetClass: AssetClass;
  targetPercent: number;
  currentPercent: number;
  etf: string;
  etfName: string;
  expenseRatio: number;
}

// Risk score (1-100)
export interface RiskProfile {
  score: number; // 1-100
  level: RiskLevel;
  description: string;
  factors: {
    age: number;
    timeHorizon: number; // years
    incomeStability: number; // 1-5
    investmentKnowledge: number; // 1-5
    riskTolerance: number; // 1-5
    financialGoals: number; // 1-5
  };
}

// Investment goal
export interface InvestmentGoal {
  id: string;
  userId: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  monthlyContribution: number;
  riskProfile: RiskProfile;
  allocation: AssetAllocation[];
  createdAt: Date;
  lastRebalanced: Date | null;
}

// Rebalance recommendation
export interface RebalanceRecommendation {
  goalId: string;
  needsRebalance: boolean;
  driftPercent: number;
  trades: {
    action: 'buy' | 'sell';
    symbol: string;
    shares: number;
    amount: number;
    reason: string;
  }[];
  estimatedTaxImpact: number;
  recommendation: string;
}

// Model portfolios by risk level
const MODEL_PORTFOLIOS: Record<RiskLevel, { assetClass: AssetClass; percent: number; etf: string; etfName: string; expenseRatio: number }[]> = {
  conservative: [
    { assetClass: 'us_stocks', percent: 20, etf: 'VTI', etfName: 'Vanguard Total Stock', expenseRatio: 0.03 },
    { assetClass: 'intl_stocks', percent: 5, etf: 'VXUS', etfName: 'Vanguard Total Intl', expenseRatio: 0.07 },
    { assetClass: 'us_bonds', percent: 50, etf: 'BND', etfName: 'Vanguard Total Bond', expenseRatio: 0.03 },
    { assetClass: 'tips', percent: 15, etf: 'VTIP', etfName: 'Vanguard Short TIPS', expenseRatio: 0.04 },
    { assetClass: 'cash', percent: 10, etf: 'VMFXX', etfName: 'Money Market', expenseRatio: 0.11 },
  ],
  moderate_conservative: [
    { assetClass: 'us_stocks', percent: 35, etf: 'VTI', etfName: 'Vanguard Total Stock', expenseRatio: 0.03 },
    { assetClass: 'intl_stocks', percent: 10, etf: 'VXUS', etfName: 'Vanguard Total Intl', expenseRatio: 0.07 },
    { assetClass: 'us_bonds', percent: 40, etf: 'BND', etfName: 'Vanguard Total Bond', expenseRatio: 0.03 },
    { assetClass: 'tips', percent: 10, etf: 'VTIP', etfName: 'Vanguard Short TIPS', expenseRatio: 0.04 },
    { assetClass: 'cash', percent: 5, etf: 'VMFXX', etfName: 'Money Market', expenseRatio: 0.11 },
  ],
  moderate: [
    { assetClass: 'us_stocks', percent: 45, etf: 'VTI', etfName: 'Vanguard Total Stock', expenseRatio: 0.03 },
    { assetClass: 'intl_stocks', percent: 15, etf: 'VXUS', etfName: 'Vanguard Total Intl', expenseRatio: 0.07 },
    { assetClass: 'emerging_stocks', percent: 5, etf: 'VWO', etfName: 'Vanguard Emerging', expenseRatio: 0.08 },
    { assetClass: 'us_bonds', percent: 25, etf: 'BND', etfName: 'Vanguard Total Bond', expenseRatio: 0.03 },
    { assetClass: 'tips', percent: 5, etf: 'VTIP', etfName: 'Vanguard Short TIPS', expenseRatio: 0.04 },
    { assetClass: 'reits', percent: 5, etf: 'VNQ', etfName: 'Vanguard REIT', expenseRatio: 0.12 },
  ],
  moderate_aggressive: [
    { assetClass: 'us_stocks', percent: 55, etf: 'VTI', etfName: 'Vanguard Total Stock', expenseRatio: 0.03 },
    { assetClass: 'intl_stocks', percent: 20, etf: 'VXUS', etfName: 'Vanguard Total Intl', expenseRatio: 0.07 },
    { assetClass: 'emerging_stocks', percent: 8, etf: 'VWO', etfName: 'Vanguard Emerging', expenseRatio: 0.08 },
    { assetClass: 'us_bonds', percent: 10, etf: 'BND', etfName: 'Vanguard Total Bond', expenseRatio: 0.03 },
    { assetClass: 'reits', percent: 7, etf: 'VNQ', etfName: 'Vanguard REIT', expenseRatio: 0.12 },
  ],
  aggressive: [
    { assetClass: 'us_stocks', percent: 60, etf: 'VTI', etfName: 'Vanguard Total Stock', expenseRatio: 0.03 },
    { assetClass: 'intl_stocks', percent: 25, etf: 'VXUS', etfName: 'Vanguard Total Intl', expenseRatio: 0.07 },
    { assetClass: 'emerging_stocks', percent: 10, etf: 'VWO', etfName: 'Vanguard Emerging', expenseRatio: 0.08 },
    { assetClass: 'reits', percent: 5, etf: 'VNQ', etfName: 'Vanguard REIT', expenseRatio: 0.12 },
  ],
};

// Glide path adjustments (how allocation changes as target date approaches)
const GLIDE_PATH: { yearsToGoal: number; stockAdjustment: number }[] = [
  { yearsToGoal: 40, stockAdjustment: 0 },
  { yearsToGoal: 30, stockAdjustment: -0.05 },
  { yearsToGoal: 20, stockAdjustment: -0.10 },
  { yearsToGoal: 15, stockAdjustment: -0.15 },
  { yearsToGoal: 10, stockAdjustment: -0.20 },
  { yearsToGoal: 5, stockAdjustment: -0.30 },
  { yearsToGoal: 2, stockAdjustment: -0.40 },
  { yearsToGoal: 0, stockAdjustment: -0.50 },
];

// Risk questionnaire
export interface RiskQuestion {
  id: string;
  question: string;
  options: { value: number; label: string }[];
}

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: 'age',
    question: 'What is your age?',
    options: [
      { value: 5, label: 'Under 30' },
      { value: 4, label: '30-40' },
      { value: 3, label: '40-50' },
      { value: 2, label: '50-60' },
      { value: 1, label: 'Over 60' },
    ],
  },
  {
    id: 'time_horizon',
    question: 'When do you plan to start using this money?',
    options: [
      { value: 5, label: 'More than 20 years' },
      { value: 4, label: '10-20 years' },
      { value: 3, label: '5-10 years' },
      { value: 2, label: '2-5 years' },
      { value: 1, label: 'Less than 2 years' },
    ],
  },
  {
    id: 'income_stability',
    question: 'How stable is your income?',
    options: [
      { value: 5, label: 'Very stable (secure job, multiple income sources)' },
      { value: 4, label: 'Stable (steady employment)' },
      { value: 3, label: 'Somewhat stable (occasional changes)' },
      { value: 2, label: 'Unstable (freelance, variable)' },
      { value: 1, label: 'Very unstable' },
    ],
  },
  {
    id: 'investment_knowledge',
    question: 'How would you rate your investment knowledge?',
    options: [
      { value: 5, label: 'Expert (professional investor)' },
      { value: 4, label: 'Advanced (understand complex strategies)' },
      { value: 3, label: 'Intermediate (know basics well)' },
      { value: 2, label: 'Beginner (learning)' },
      { value: 1, label: 'None' },
    ],
  },
  {
    id: 'risk_tolerance',
    question: 'If your portfolio dropped 20% in a month, what would you do?',
    options: [
      { value: 5, label: 'Buy more (great opportunity!)' },
      { value: 4, label: 'Hold and wait' },
      { value: 3, label: 'Watch closely, might sell some' },
      { value: 2, label: 'Sell some to reduce risk' },
      { value: 1, label: 'Sell everything immediately' },
    ],
  },
  {
    id: 'financial_goals',
    question: 'What is your primary investment goal?',
    options: [
      { value: 5, label: 'Maximum growth (willing to accept high volatility)' },
      { value: 4, label: 'Long-term growth with some volatility' },
      { value: 3, label: 'Balanced growth and income' },
      { value: 2, label: 'Stable income with capital preservation' },
      { value: 1, label: 'Preserve capital (minimize any loss)' },
    ],
  },
];

export class RoboAdvisor {
  private goals: Map<string, InvestmentGoal> = new Map();
  private userGoals: Map<string, string[]> = new Map();

  /**
   * Calculate risk profile from questionnaire answers
   *
   * PLAIN ENGLISH:
   * - Takes your answers to risk questions
   * - Calculates a score from 1-100
   * - Determines what level of risk is right for you
   */
  calculateRiskProfile(answers: Record<string, number>): RiskProfile {
    // Weight each factor
    const weights = {
      age: 0.15,
      time_horizon: 0.25,
      income_stability: 0.15,
      investment_knowledge: 0.10,
      risk_tolerance: 0.25,
      financial_goals: 0.10,
    };

    // Calculate weighted score
    let totalScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const answer = answers[key] || 3; // Default to middle
      totalScore += (answer / 5) * 100 * weight;
    }

    // Round to integer
    const score = Math.round(totalScore);

    // Determine risk level
    let level: RiskLevel;
    let description: string;

    if (score < 30) {
      level = 'conservative';
      description = 'Focus on capital preservation with stable, low-risk investments.';
    } else if (score < 45) {
      level = 'moderate_conservative';
      description = 'Emphasize income and stability with modest growth potential.';
    } else if (score < 60) {
      level = 'moderate';
      description = 'Balance between growth and stability for long-term wealth building.';
    } else if (score < 75) {
      level = 'moderate_aggressive';
      description = 'Prioritize growth with acceptance of market volatility.';
    } else {
      level = 'aggressive';
      description = 'Maximum growth focus with high risk tolerance.';
    }

    logger.info('Risk profile calculated', { score, level });

    return {
      score,
      level,
      description,
      factors: {
        age: answers.age || 3,
        timeHorizon: answers.time_horizon || 3,
        incomeStability: answers.income_stability || 3,
        investmentKnowledge: answers.investment_knowledge || 3,
        riskTolerance: answers.risk_tolerance || 3,
        financialGoals: answers.financial_goals || 3,
      },
    };
  }

  /**
   * Create investment goal
   */
  createGoal(params: {
    userId: string;
    name: string;
    type: GoalType;
    targetAmount: number;
    targetDate: Date;
    monthlyContribution: number;
    riskAnswers: Record<string, number>;
  }): InvestmentGoal {
    const riskProfile = this.calculateRiskProfile(params.riskAnswers);
    const yearsToGoal = this.getYearsToGoal(params.targetDate);

    // Get base allocation and apply glide path
    const allocation = this.calculateAllocation(riskProfile.level, yearsToGoal);

    const goal: InvestmentGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: params.userId,
      name: params.name,
      type: params.type,
      targetAmount: params.targetAmount,
      currentAmount: 0,
      targetDate: params.targetDate,
      monthlyContribution: params.monthlyContribution,
      riskProfile,
      allocation,
      createdAt: new Date(),
      lastRebalanced: null,
    };

    // Store
    this.goals.set(goal.id, goal);
    const userGoalIds = this.userGoals.get(params.userId) || [];
    userGoalIds.push(goal.id);
    this.userGoals.set(params.userId, userGoalIds);

    logger.info('Investment goal created', {
      goalId: goal.id,
      userId: params.userId,
      type: params.type,
      riskLevel: riskProfile.level,
    });

    return goal;
  }

  /**
   * Calculate asset allocation based on risk level and time horizon
   */
  private calculateAllocation(riskLevel: RiskLevel, yearsToGoal: number): AssetAllocation[] {
    const baseAllocation = MODEL_PORTFOLIOS[riskLevel];

    // Find glide path adjustment
    const glideAdjustment = this.getGlidePathAdjustment(yearsToGoal);

    // Adjust allocation
    return baseAllocation.map((asset) => {
      let adjustedPercent = asset.percent;

      // Apply glide path to stocks (reduce as goal approaches)
      if (['us_stocks', 'intl_stocks', 'emerging_stocks'].includes(asset.assetClass)) {
        adjustedPercent = Math.max(5, asset.percent + (asset.percent * glideAdjustment));
      }
      // Increase bonds as stocks decrease
      else if (['us_bonds', 'tips'].includes(asset.assetClass)) {
        adjustedPercent = Math.min(60, asset.percent - (asset.percent * glideAdjustment * 0.5));
      }

      return {
        assetClass: asset.assetClass,
        targetPercent: Math.round(adjustedPercent),
        currentPercent: 0, // Will be calculated from actual holdings
        etf: asset.etf,
        etfName: asset.etfName,
        expenseRatio: asset.expenseRatio,
      };
    });
  }

  /**
   * Get glide path adjustment for time horizon
   */
  private getGlidePathAdjustment(yearsToGoal: number): number {
    // Find the applicable glide path entry
    for (let i = 0; i < GLIDE_PATH.length; i++) {
      if (yearsToGoal >= GLIDE_PATH[i].yearsToGoal) {
        return GLIDE_PATH[i].stockAdjustment;
      }
    }
    return GLIDE_PATH[GLIDE_PATH.length - 1].stockAdjustment;
  }

  /**
   * Calculate years to goal
   */
  private getYearsToGoal(targetDate: Date): number {
    const now = new Date();
    return Math.max(0, (targetDate.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000));
  }

  /**
   * Check if rebalancing is needed
   *
   * PLAIN ENGLISH:
   * - Compares current allocation to target
   * - If drift is more than 5%, recommends rebalancing
   * - Generates specific trades to get back on target
   */
  checkRebalance(
    goalId: string,
    currentHoldings: { symbol: string; value: number }[]
  ): RebalanceRecommendation {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const totalValue = currentHoldings.reduce((sum, h) => sum + h.value, 0);

    // Calculate current allocation percentages
    const currentAllocation = new Map<string, number>();
    for (const holding of currentHoldings) {
      currentAllocation.set(holding.symbol, (holding.value / totalValue) * 100);
    }

    // Calculate drift and needed trades
    let maxDrift = 0;
    const trades: RebalanceRecommendation['trades'] = [];

    for (const asset of goal.allocation) {
      const currentPercent = currentAllocation.get(asset.etf) || 0;
      const drift = currentPercent - asset.targetPercent;
      maxDrift = Math.max(maxDrift, Math.abs(drift));

      // Update current percent in allocation
      asset.currentPercent = currentPercent;

      // If drift > 1%, add to trades
      if (Math.abs(drift) > 1) {
        const driftAmount = (drift / 100) * totalValue;

        if (drift > 0) {
          // Over-allocated, need to sell
          trades.push({
            action: 'sell',
            symbol: asset.etf,
            shares: 0, // Will be calculated based on price
            amount: Math.abs(driftAmount),
            reason: `${asset.etfName} is ${drift.toFixed(1)}% over target`,
          });
        } else {
          // Under-allocated, need to buy
          trades.push({
            action: 'buy',
            symbol: asset.etf,
            shares: 0,
            amount: Math.abs(driftAmount),
            reason: `${asset.etfName} is ${Math.abs(drift).toFixed(1)}% under target`,
          });
        }
      }
    }

    // Determine if rebalancing is recommended (5% threshold)
    const needsRebalance = maxDrift >= 5;

    const recommendation: RebalanceRecommendation = {
      goalId,
      needsRebalance,
      driftPercent: maxDrift,
      trades: needsRebalance ? trades : [],
      estimatedTaxImpact: 0, // Would calculate based on gains
      recommendation: needsRebalance
        ? `Portfolio has drifted ${maxDrift.toFixed(1)}% from target. Rebalancing recommended.`
        : `Portfolio is within tolerance. Maximum drift is ${maxDrift.toFixed(1)}%.`,
    };

    logger.info('Rebalance check completed', {
      goalId,
      needsRebalance,
      maxDrift,
      tradeCount: trades.length,
    });

    return recommendation;
  }

  /**
   * Execute rebalancing trades
   */
  async executeRebalance(
    recommendation: RebalanceRecommendation,
    executeTrade: (order: { symbol: string; side: 'buy' | 'sell'; amount: number }) => Promise<void>
  ): Promise<{ success: boolean; tradesExecuted: number }> {
    if (!recommendation.needsRebalance) {
      return { success: true, tradesExecuted: 0 };
    }

    let tradesExecuted = 0;

    try {
      // Execute sells first (to free up cash)
      const sells = recommendation.trades.filter((t) => t.action === 'sell');
      for (const trade of sells) {
        await executeTrade({
          symbol: trade.symbol,
          side: 'sell',
          amount: trade.amount,
        });
        tradesExecuted++;
      }

      // Then execute buys
      const buys = recommendation.trades.filter((t) => t.action === 'buy');
      for (const trade of buys) {
        await executeTrade({
          symbol: trade.symbol,
          side: 'buy',
          amount: trade.amount,
        });
        tradesExecuted++;
      }

      // Update goal
      const goal = this.goals.get(recommendation.goalId);
      if (goal) {
        goal.lastRebalanced = new Date();
      }

      logger.info('Rebalance executed', {
        goalId: recommendation.goalId,
        tradesExecuted,
      });

      return { success: true, tradesExecuted };
    } catch (error) {
      logger.error('Rebalance failed', {
        goalId: recommendation.goalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, tradesExecuted };
    }
  }

  /**
   * Project goal progress
   *
   * PLAIN ENGLISH:
   * - Shows if you're on track to meet your goal
   * - Projects future value based on contributions and returns
   */
  projectProgress(goalId: string): {
    currentAmount: number;
    projectedAmount: number;
    targetAmount: number;
    onTrack: boolean;
    shortfall: number;
    recommendedMonthlyIncrease: number;
    monthsToGoal: number;
  } {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const now = new Date();
    const monthsToGoal = Math.max(
      0,
      (goal.targetDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );

    // Assume average annual return based on risk level
    const annualReturns: Record<RiskLevel, number> = {
      conservative: 0.04,
      moderate_conservative: 0.05,
      moderate: 0.06,
      moderate_aggressive: 0.07,
      aggressive: 0.08,
    };

    const monthlyReturn = annualReturns[goal.riskProfile.level] / 12;

    // Project future value using compound interest with monthly contributions
    // FV = PV(1+r)^n + PMT * (((1+r)^n - 1) / r)
    const n = monthsToGoal;
    const r = monthlyReturn;
    const pv = goal.currentAmount;
    const pmt = goal.monthlyContribution;

    const projectedAmount =
      pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);

    const shortfall = Math.max(0, goal.targetAmount - projectedAmount);
    const onTrack = shortfall === 0;

    // Calculate recommended increase if not on track
    let recommendedMonthlyIncrease = 0;
    if (shortfall > 0 && n > 0) {
      // PMT = (FV - PV(1+r)^n) * r / ((1+r)^n - 1)
      const neededPMT =
        (goal.targetAmount - pv * Math.pow(1 + r, n)) * r / (Math.pow(1 + r, n) - 1);
      recommendedMonthlyIncrease = Math.max(0, neededPMT - pmt);
    }

    return {
      currentAmount: goal.currentAmount,
      projectedAmount: Math.round(projectedAmount),
      targetAmount: goal.targetAmount,
      onTrack,
      shortfall: Math.round(shortfall),
      recommendedMonthlyIncrease: Math.round(recommendedMonthlyIncrease),
      monthsToGoal: Math.round(monthsToGoal),
    };
  }

  /**
   * Get goal by ID
   */
  getGoal(goalId: string): InvestmentGoal | null {
    return this.goals.get(goalId) || null;
  }

  /**
   * Get all goals for a user
   */
  getUserGoals(userId: string): InvestmentGoal[] {
    const goalIds = this.userGoals.get(userId) || [];
    return goalIds
      .map((id) => this.goals.get(id))
      .filter((g): g is InvestmentGoal => g !== undefined);
  }

  /**
   * Update goal
   */
  updateGoal(
    goalId: string,
    updates: Partial<Pick<InvestmentGoal, 'name' | 'targetAmount' | 'targetDate' | 'monthlyContribution'>>
  ): InvestmentGoal {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    if (updates.name) goal.name = updates.name;
    if (updates.targetAmount) goal.targetAmount = updates.targetAmount;
    if (updates.targetDate) goal.targetDate = updates.targetDate;
    if (updates.monthlyContribution) goal.monthlyContribution = updates.monthlyContribution;

    // Recalculate allocation if target date changed
    if (updates.targetDate) {
      const yearsToGoal = this.getYearsToGoal(updates.targetDate);
      goal.allocation = this.calculateAllocation(goal.riskProfile.level, yearsToGoal);
    }

    logger.info('Goal updated', { goalId, updates: Object.keys(updates) });

    return goal;
  }

  /**
   * Delete goal
   */
  deleteGoal(goalId: string, userId: string): void {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    if (goal.userId !== userId) {
      throw new Error('Unauthorized');
    }

    this.goals.delete(goalId);

    const userGoalIds = this.userGoals.get(userId) || [];
    const filtered = userGoalIds.filter((id) => id !== goalId);
    this.userGoals.set(userId, filtered);

    logger.info('Goal deleted', { goalId, userId });
  }

  /**
   * Get model portfolios
   */
  getModelPortfolios(): typeof MODEL_PORTFOLIOS {
    return MODEL_PORTFOLIOS;
  }

  /**
   * Get risk questions
   */
  getRiskQuestions(): RiskQuestion[] {
    return RISK_QUESTIONS;
  }
}

// Export singleton instance
export const roboAdvisor = new RoboAdvisor();

logger.info('Robo Advisor initialized - Automated portfolio management enabled');

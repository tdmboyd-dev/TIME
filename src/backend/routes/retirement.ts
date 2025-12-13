/**
 * TIME Retirement Account Routes
 *
 * Comprehensive retirement account management:
 * - IRA accounts (Traditional, Roth, SEP, SIMPLE)
 * - 401k rollover support
 * - Required Minimum Distribution (RMD) calculations
 * - Contribution limit tracking
 * - Tax-advantaged investing strategies
 * - Retirement projections
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { databaseManager } from '../database/connection';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================
// TYPES
// ============================================================

interface RetirementAccount {
  id: string;
  userId: string;
  type: 'traditional_ira' | 'roth_ira' | 'sep_ira' | 'simple_ira' | '401k' | '403b' | '457b';
  name: string;
  balance: number;
  contributions: {
    currentYear: number;
    limit: number;
    remaining: number;
  };
  beneficiaries: Array<{
    name: string;
    relationship: string;
    percentage: number;
  }>;
  custodian: string;
  accountNumber: string;
  createdAt: Date;
  lastUpdated: Date;
}

interface RMDCalculation {
  accountId: string;
  year: number;
  priorYearEndBalance: number;
  distributionPeriod: number;
  rmdAmount: number;
  distributedYTD: number;
  remaining: number;
  deadline: Date;
}

interface RetirementProjection {
  currentAge: number;
  retirementAge: number;
  currentBalance: number;
  monthlyContribution: number;
  expectedReturn: number;
  projectedBalance: number;
  monthlyIncomeAtRetirement: number;
  yearsUntilDepletion: number;
}

// ============================================================
// CONSTANTS
// ============================================================

// 2024/2025 Contribution Limits
const CONTRIBUTION_LIMITS = {
  traditional_ira: { under50: 7000, over50: 8000 },
  roth_ira: { under50: 7000, over50: 8000 },
  sep_ira: { limit: 69000, percentOfCompensation: 0.25 },
  simple_ira: { under50: 16000, over50: 19500 },
  '401k': { under50: 23000, over50: 30500 },
  '403b': { under50: 23000, over50: 30500 },
  '457b': { under50: 23000, over50: 30500 },
};

// RMD Life Expectancy Table (Uniform Lifetime Table - simplified)
const RMD_FACTORS: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
  79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
  86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
};

// Income limits for Roth IRA (2024 - Married Filing Jointly)
const ROTH_INCOME_LIMITS = {
  single: { phaseOutStart: 146000, phaseOutEnd: 161000 },
  married: { phaseOutStart: 230000, phaseOutEnd: 240000 },
};

// User accounts storage (Production: MongoDB)
const userAccounts: Map<string, RetirementAccount[]> = new Map();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate RMD for an account
 */
function calculateRMD(
  priorYearEndBalance: number,
  age: number
): { rmd: number; distributionPeriod: number } {
  // RMD starts at age 73 (as of 2023 SECURE 2.0 Act)
  if (age < 73) {
    return { rmd: 0, distributionPeriod: 0 };
  }

  const distributionPeriod = RMD_FACTORS[Math.min(age, 100)] || 6.4;
  const rmd = priorYearEndBalance / distributionPeriod;

  return { rmd, distributionPeriod };
}

/**
 * Calculate contribution limit based on account type and age
 */
function getContributionLimit(
  accountType: RetirementAccount['type'],
  age: number,
  selfEmploymentIncome?: number
): number {
  const limits = CONTRIBUTION_LIMITS[accountType];
  const isOver50 = age >= 50;

  if (accountType === 'sep_ira') {
    const sepLimits = limits as { limit: number; percentOfCompensation: number };
    const incomeBasedLimit = (selfEmploymentIncome || 0) * sepLimits.percentOfCompensation;
    return Math.min(incomeBasedLimit, sepLimits.limit);
  }

  const ageLimits = limits as { under50: number; over50: number };
  return isOver50 ? ageLimits.over50 : ageLimits.under50;
}

/**
 * Project retirement savings
 */
function projectRetirement(
  currentAge: number,
  retirementAge: number,
  currentBalance: number,
  monthlyContribution: number,
  expectedAnnualReturn: number,
  withdrawalRate: number = 0.04
): RetirementProjection {
  const yearsUntilRetirement = retirementAge - currentAge;
  const monthlyReturn = expectedAnnualReturn / 12;
  const totalMonths = yearsUntilRetirement * 12;

  // Future Value calculation with monthly contributions
  let projectedBalance = currentBalance;
  for (let month = 0; month < totalMonths; month++) {
    projectedBalance = projectedBalance * (1 + monthlyReturn) + monthlyContribution;
  }

  // Calculate sustainable monthly income (4% rule)
  const annualIncome = projectedBalance * withdrawalRate;
  const monthlyIncome = annualIncome / 12;

  // Estimate years until depletion (assuming 2% real return during retirement)
  const realReturnRate = 0.02;
  let remainingBalance = projectedBalance;
  let years = 0;
  while (remainingBalance > 0 && years < 100) {
    remainingBalance = remainingBalance * (1 + realReturnRate) - annualIncome;
    years++;
  }

  return {
    currentAge,
    retirementAge,
    currentBalance,
    monthlyContribution,
    expectedReturn: expectedAnnualReturn,
    projectedBalance: Math.round(projectedBalance),
    monthlyIncomeAtRetirement: Math.round(monthlyIncome),
    yearsUntilDepletion: years,
  };
}

/**
 * Calculate Roth conversion tax impact
 */
function calculateRothConversionTax(
  conversionAmount: number,
  taxableIncome: number,
  filingStatus: 'single' | 'married'
): {
  federalTax: number;
  effectiveRate: number;
  marginalRate: number;
} {
  // 2024 Tax Brackets (simplified)
  const brackets = filingStatus === 'single'
    ? [
        { limit: 11600, rate: 0.10 },
        { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
        { limit: 243725, rate: 0.32 },
        { limit: 609350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 },
      ]
    : [
        { limit: 23200, rate: 0.10 },
        { limit: 94300, rate: 0.12 },
        { limit: 201050, rate: 0.22 },
        { limit: 383900, rate: 0.24 },
        { limit: 487450, rate: 0.32 },
        { limit: 731200, rate: 0.35 },
        { limit: Infinity, rate: 0.37 },
      ];

  const totalIncome = taxableIncome + conversionAmount;
  let tax = 0;
  let prevLimit = 0;

  for (const bracket of brackets) {
    const taxableInBracket = Math.min(Math.max(totalIncome - prevLimit, 0), bracket.limit - prevLimit);
    tax += taxableInBracket * bracket.rate;
    prevLimit = bracket.limit;
    if (totalIncome <= bracket.limit) break;
  }

  // Calculate tax on income without conversion
  let taxWithoutConversion = 0;
  prevLimit = 0;
  for (const bracket of brackets) {
    const taxableInBracket = Math.min(Math.max(taxableIncome - prevLimit, 0), bracket.limit - prevLimit);
    taxWithoutConversion += taxableInBracket * bracket.rate;
    prevLimit = bracket.limit;
    if (taxableIncome <= bracket.limit) break;
  }

  const federalTax = tax - taxWithoutConversion;
  const effectiveRate = federalTax / conversionAmount;

  // Find marginal rate
  let marginalRate = 0.37;
  for (const bracket of brackets) {
    if (totalIncome <= bracket.limit) {
      marginalRate = bracket.rate;
      break;
    }
  }

  return {
    federalTax: Math.round(federalTax),
    effectiveRate: Math.round(effectiveRate * 10000) / 100,
    marginalRate: marginalRate * 100,
  };
}

// ============================================================
// ROUTES
// ============================================================

/**
 * GET /retirement/accounts
 * List user's retirement accounts
 */
router.get('/accounts', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const accounts = userAccounts.get(user.id) || [];

  res.json({
    success: true,
    data: accounts,
    summary: {
      totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
      accountCount: accounts.length,
      totalContributionsYTD: accounts.reduce((sum, a) => sum + a.contributions.currentYear, 0),
    },
  });
});

/**
 * POST /retirement/accounts
 * Create a new retirement account
 */
router.post('/accounts', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { type, name, custodian, accountNumber, initialBalance = 0 } = req.body;

  if (!type || !name) {
    return res.status(400).json({ error: 'Account type and name are required' });
  }

  const validTypes = ['traditional_ira', 'roth_ira', 'sep_ira', 'simple_ira', '401k', '403b', '457b'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid account type', validTypes });
  }

  const userAge = 40; // Get from user profile in production
  const limit = getContributionLimit(type, userAge);

  const newAccount: RetirementAccount = {
    id: `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: user.id,
    type,
    name,
    balance: initialBalance,
    contributions: {
      currentYear: 0,
      limit,
      remaining: limit,
    },
    beneficiaries: [],
    custodian: custodian || 'TIME Retirement',
    accountNumber: accountNumber || `TIME${Date.now()}`,
    createdAt: new Date(),
    lastUpdated: new Date(),
  };

  const accounts = userAccounts.get(user.id) || [];
  accounts.push(newAccount);
  userAccounts.set(user.id, accounts);

  res.status(201).json({
    success: true,
    data: newAccount,
    message: 'Retirement account created successfully',
  });
});

/**
 * GET /retirement/accounts/:accountId
 * Get detailed account information
 */
router.get('/accounts/:accountId', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { accountId } = req.params;

  const accounts = userAccounts.get(user.id) || [];
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json({
    success: true,
    data: account,
  });
});

/**
 * POST /retirement/accounts/:accountId/contribute
 * Make a contribution to a retirement account
 */
router.post('/accounts/:accountId/contribute', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { accountId } = req.params;
  const { amount, contributionYear } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid contribution amount required' });
  }

  const accounts = userAccounts.get(user.id) || [];
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  if (amount > account.contributions.remaining) {
    return res.status(400).json({
      error: 'Contribution exceeds annual limit',
      remaining: account.contributions.remaining,
      limit: account.contributions.limit,
    });
  }

  // Update account
  account.balance += amount;
  account.contributions.currentYear += amount;
  account.contributions.remaining -= amount;
  account.lastUpdated = new Date();

  res.json({
    success: true,
    data: {
      accountId,
      contributionAmount: amount,
      newBalance: account.balance,
      contributionsYTD: account.contributions.currentYear,
      remainingLimit: account.contributions.remaining,
    },
    message: 'Contribution successful',
  });
});

/**
 * GET /retirement/rmd/:accountId
 * Calculate Required Minimum Distribution
 */
router.get('/rmd/:accountId', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { accountId } = req.params;
  const { age = 73, priorYearBalance } = req.query;

  const accounts = userAccounts.get(user.id) || [];
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  // Roth IRAs don't have RMDs for original owner
  if (account.type === 'roth_ira') {
    return res.json({
      success: true,
      data: {
        accountId,
        accountType: account.type,
        rmdRequired: false,
        message: 'Roth IRAs do not have required minimum distributions for the original owner',
      },
    });
  }

  const userAge = parseInt(age as string, 10);
  const balance = priorYearBalance ? parseFloat(priorYearBalance as string) : account.balance;

  const { rmd, distributionPeriod } = calculateRMD(balance, userAge);

  const rmdCalc: RMDCalculation = {
    accountId,
    year: new Date().getFullYear(),
    priorYearEndBalance: balance,
    distributionPeriod,
    rmdAmount: Math.round(rmd * 100) / 100,
    distributedYTD: 0,
    remaining: Math.round(rmd * 100) / 100,
    deadline: new Date(new Date().getFullYear(), 11, 31), // December 31
  };

  res.json({
    success: true,
    data: rmdCalc,
    message: userAge < 73
      ? 'RMDs not yet required. They begin at age 73.'
      : `Your RMD for this year is $${rmdCalc.rmdAmount.toLocaleString()}`,
  });
});

/**
 * GET /retirement/limits
 * Get contribution limits for all account types
 */
router.get('/limits', async (req: Request, res: Response) => {
  const { age = 45 } = req.query;
  const userAge = parseInt(age as string, 10);
  const isOver50 = userAge >= 50;

  const limits = Object.entries(CONTRIBUTION_LIMITS).map(([type, limit]) => {
    if (type === 'sep_ira') {
      const sepLimit = limit as { limit: number; percentOfCompensation: number };
      return {
        type,
        name: 'SEP IRA',
        limit: sepLimit.limit,
        note: `Maximum is lesser of $${sepLimit.limit.toLocaleString()} or 25% of compensation`,
      };
    }

    const ageLimit = limit as { under50: number; over50: number };
    return {
      type,
      name: type.toUpperCase().replace('_', ' '),
      limit: isOver50 ? ageLimit.over50 : ageLimit.under50,
      catchUpContribution: isOver50 ? ageLimit.over50 - ageLimit.under50 : 0,
    };
  });

  res.json({
    success: true,
    data: {
      year: 2024,
      age: userAge,
      isOver50,
      limits,
    },
  });
});

/**
 * POST /retirement/projection
 * Calculate retirement projections
 */
router.post('/projection', authMiddleware, async (req: Request, res: Response) => {
  const {
    currentAge,
    retirementAge = 65,
    currentBalance,
    monthlyContribution,
    expectedReturn = 0.07,
    withdrawalRate = 0.04,
  } = req.body;

  if (!currentAge || !currentBalance) {
    return res.status(400).json({ error: 'Current age and balance are required' });
  }

  if (retirementAge <= currentAge) {
    return res.status(400).json({ error: 'Retirement age must be greater than current age' });
  }

  const projection = projectRetirement(
    currentAge,
    retirementAge,
    currentBalance,
    monthlyContribution || 0,
    expectedReturn,
    withdrawalRate
  );

  res.json({
    success: true,
    data: projection,
    insights: [
      `At age ${retirementAge}, you could have approximately $${projection.projectedBalance.toLocaleString()}`,
      `This could provide about $${projection.monthlyIncomeAtRetirement.toLocaleString()}/month in retirement`,
      `Using the ${withdrawalRate * 100}% rule, your savings could last approximately ${projection.yearsUntilDepletion} years`,
      projection.monthlyContribution > 0
        ? `You're contributing $${projection.monthlyContribution.toLocaleString()}/month - keep it up!`
        : 'Consider starting regular contributions to boost your retirement savings',
    ],
  });
});

/**
 * POST /retirement/roth-conversion
 * Calculate Roth conversion tax implications
 */
router.post('/roth-conversion', authMiddleware, async (req: Request, res: Response) => {
  const { conversionAmount, taxableIncome, filingStatus = 'single' } = req.body;

  if (!conversionAmount || !taxableIncome) {
    return res.status(400).json({ error: 'Conversion amount and taxable income required' });
  }

  const taxImpact = calculateRothConversionTax(conversionAmount, taxableIncome, filingStatus);

  res.json({
    success: true,
    data: {
      conversionAmount,
      taxableIncome,
      filingStatus,
      federalTaxOnConversion: taxImpact.federalTax,
      effectiveTaxRate: `${taxImpact.effectiveRate}%`,
      marginalTaxRate: `${taxImpact.marginalRate}%`,
      netConversion: conversionAmount - taxImpact.federalTax,
    },
    insights: [
      `Converting $${conversionAmount.toLocaleString()} would result in approximately $${taxImpact.federalTax.toLocaleString()} in federal taxes`,
      `Your effective tax rate on this conversion would be ${taxImpact.effectiveRate}%`,
      taxImpact.marginalRate > 24
        ? 'Consider spreading the conversion over multiple years to stay in lower tax brackets'
        : 'This may be a good year for conversion due to your current tax bracket',
    ],
  });
});

/**
 * GET /retirement/rollover-options
 * Get 401k rollover options
 */
router.get('/rollover-options', authMiddleware, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      options: [
        {
          option: 'Roll to Traditional IRA',
          taxImplications: 'No immediate tax impact',
          pros: ['More investment options', 'Potentially lower fees', 'Consolidate accounts'],
          cons: ['RMDs still required at 73', 'Pro-rata rule for backdoor Roth'],
          recommended: true,
        },
        {
          option: 'Roll to Roth IRA',
          taxImplications: 'Taxes owed on conversion',
          pros: ['Tax-free growth', 'No RMDs', 'Tax-free withdrawals in retirement'],
          cons: ['Immediate tax bill', 'May push you into higher bracket'],
          recommended: false,
          note: 'Consider if you expect higher taxes in retirement',
        },
        {
          option: 'Roll to New Employer 401k',
          taxImplications: 'No immediate tax impact',
          pros: ['Maintain 401k protections', 'Potential for Roth 401k option', 'Loan provisions'],
          cons: ['Limited investment options', 'Employer plan rules apply'],
          recommended: false,
        },
        {
          option: 'Leave in Current 401k',
          taxImplications: 'No immediate tax impact',
          pros: ['No action needed', 'Creditor protection'],
          cons: ['Limited options', 'May have higher fees', 'Harder to track'],
          recommended: false,
        },
        {
          option: 'Cash Out (Not Recommended)',
          taxImplications: 'Full taxes + 10% penalty if under 59½',
          pros: ['Immediate access to funds'],
          cons: ['Significant tax hit', 'Loss of retirement savings', '10% early withdrawal penalty'],
          recommended: false,
        },
      ],
    },
  });
});

/**
 * POST /retirement/accounts/:accountId/beneficiaries
 * Update beneficiaries for an account
 */
router.post('/accounts/:accountId/beneficiaries', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { accountId } = req.params;
  const { beneficiaries } = req.body;

  if (!beneficiaries || !Array.isArray(beneficiaries)) {
    return res.status(400).json({ error: 'Beneficiaries array required' });
  }

  // Validate percentages sum to 100
  const totalPercentage = beneficiaries.reduce((sum, b) => sum + (b.percentage || 0), 0);
  if (totalPercentage !== 100) {
    return res.status(400).json({ error: 'Beneficiary percentages must sum to 100%', current: totalPercentage });
  }

  const accounts = userAccounts.get(user.id) || [];
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  account.beneficiaries = beneficiaries;
  account.lastUpdated = new Date();

  res.json({
    success: true,
    data: {
      accountId,
      beneficiaries: account.beneficiaries,
    },
    message: 'Beneficiaries updated successfully',
  });
});

export default router;

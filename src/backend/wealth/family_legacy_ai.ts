/**
 * TIME Family Wealth Legacy AI
 *
 * AI-powered multi-generational wealth building system that:
 * - Creates personalized wealth roadmaps
 * - Automates trust and estate planning recommendations
 * - Tracks family wealth across generations
 * - Provides AI-driven financial education
 * - Manages family investment strategies
 * - Coordinates tax optimization across family members
 * - Builds lasting family financial legacy
 *
 * "Making family legends through intelligent wealth building"
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';
import { dynastyTrustEngine, FamilyMember, WealthTransferPlan } from './dynasty_trust_engine';

const logger = createComponentLogger('FamilyLegacyAI');

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type WealthStage = 'accumulation' | 'preservation' | 'distribution' | 'legacy';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive';

export interface FamilyProfile {
  id: string;
  familyName: string;
  headOfHousehold: string;
  createdAt: Date;
  members: FamilyMemberExtended[];
  totalNetWorth: number;
  wealthStage: WealthStage;
  primaryGoals: string[];
  values: string[];
  legacyVision: string;
}

export interface FamilyMemberExtended extends FamilyMember {
visio: string;
  email?: string;
  phone?: string;
  profession?: string;
  income?: number;
  netWorth?: number;
  riskTolerance?: RiskTolerance;
  financialGoals?: string[];
  educationLevel?: string;
  financialLiteracy?: 'beginner' | 'intermediate' | 'advanced';
}

export interface WealthRoadmap {
  id: string;
  familyId: string;
  name: string;
  currentPhase: WealthStage;
  milestones: WealthMilestone[];
  strategies: WealthStrategy[];
  projections: WealthProjection[];
  actionItems: ActionItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WealthMilestone {
  id: string;
  name: string;
  targetDate: Date;
  targetAmount: number;
  currentProgress: number;
  progressPercent: number;
  status: 'not_started' | 'in_progress' | 'achieved' | 'at_risk';
  strategies: string[];
}

export interface WealthStrategy {
  id: string;
  name: string;
  category: 'investing' | 'tax' | 'estate' | 'protection' | 'income' | 'education';
  description: string;
  expectedReturn: number;
  riskLevel: RiskTolerance;
  timeHorizon: string;
  implementationSteps: string[];
  estimatedCost: number;
  priority: 'high' | 'medium' | 'low';
  automatable: boolean;
}

export interface WealthProjection {
  year: number;
  age: number;
  projectedNetWorth: number;
  passiveIncome: number;
  taxLiability: number;
  charitableGiving: number;
  legacyTransfer: number;
  milestone?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate?: Date;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  estimatedImpact: number;
  automatable: boolean;
}

export interface FinancialLesson {
  id: string;
  title: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  content: string;
  keyTakeaways: string[];
  resources: string[];
  quiz?: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
}

export interface AIRecommendation {
  id: string;
  type: 'action' | 'warning' | 'opportunity' | 'education';
  title: string;
  description: string;
  reasoning: string;
  estimatedImpact: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: string;
  actions: string[];
  deadline?: Date;
  confidence: number;
}

// ============================================================
// FAMILY LEGACY AI ENGINE
// ============================================================

class FamilyLegacyAI extends EventEmitter {
  private families: Map<string, FamilyProfile> = new Map();
  private roadmaps: Map<string, WealthRoadmap> = new Map();
  private lessons: FinancialLesson[] = [];

  constructor() {
    super();
    this.initializeEducationContent();
    logger.info('Family Legacy AI initialized');
  }

  // ============================================================
  // FAMILY MANAGEMENT
  // ============================================================

  /**
   * Create a new family profile
   */
  createFamily(
    familyName: string,
    headOfHousehold: string,
    members: FamilyMemberExtended[],
    goals: string[],
    values: string[],
    legacyVision: string
  ): FamilyProfile {
    const totalNetWorth = members.reduce((sum, m) => sum + (m.netWorth || 0), 0);
    const avgAge =
      members.reduce((sum, m) => sum + m.age, 0) / members.length;

    // Determine wealth stage
    let wealthStage: WealthStage = 'accumulation';
    if (avgAge >= 65 || totalNetWorth > 10000000) {
      wealthStage = 'distribution';
    } else if (avgAge >= 50 || totalNetWorth > 2000000) {
      wealthStage = 'preservation';
    }

    const family: FamilyProfile = {
      id: uuidv4(),
      familyName,
      headOfHousehold,
      createdAt: new Date(),
      members,
      totalNetWorth,
      wealthStage,
      primaryGoals: goals,
      values,
      legacyVision,
    };

    this.families.set(family.id, family);
    this.emit('family:created', family);

    logger.info('Family profile created', {
      familyId: family.id,
      familyName,
      members: members.length,
      wealthStage,
      totalNetWorth,
    });

    return family;
  }

  /**
   * Get family by ID
   */
  getFamily(familyId: string): FamilyProfile | undefined {
    return this.families.get(familyId);
  }

  // ============================================================
  // WEALTH ROADMAP
  // ============================================================

  /**
   * Generate comprehensive wealth roadmap for family
   */
  generateWealthRoadmap(familyId: string): WealthRoadmap {
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    const headMember = family.members.find(
      (m) => m.name === family.headOfHousehold
    ) || family.members[0];

    // Generate milestones
    const milestones = this.generateMilestones(family, headMember);

    // Generate strategies
    const strategies = this.generateStrategies(family, headMember);

    // Generate projections
    const projections = this.generateProjections(family, headMember);

    // Generate action items
    const actionItems = this.generateActionItems(family, strategies);

    const roadmap: WealthRoadmap = {
      id: uuidv4(),
      familyId,
      name: `${family.familyName} Family Wealth Roadmap`,
      currentPhase: family.wealthStage,
      milestones,
      strategies,
      projections,
      actionItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roadmaps.set(roadmap.id, roadmap);
    this.emit('roadmap:created', roadmap);

    logger.info('Wealth roadmap generated', {
      roadmapId: roadmap.id,
      familyId,
      milestones: milestones.length,
      strategies: strategies.length,
      actionItems: actionItems.length,
    });

    return roadmap;
  }

  private generateMilestones(
    family: FamilyProfile,
    head: FamilyMemberExtended
  ): WealthMilestone[] {
    const milestones: WealthMilestone[] = [];
    const currentYear = new Date().getFullYear();
    const netWorth = family.totalNetWorth;

    // Emergency fund milestone
    const emergencyFundTarget = (head.income || 100000) * 0.5; // 6 months
    milestones.push({
      id: uuidv4(),
      name: 'Emergency Fund',
      targetDate: new Date(currentYear + 1, 11, 31),
      targetAmount: emergencyFundTarget,
      currentProgress: Math.min(netWorth * 0.1, emergencyFundTarget),
      progressPercent: Math.min(100, (netWorth * 0.1 / emergencyFundTarget) * 100),
      status: netWorth >= emergencyFundTarget * 10 ? 'achieved' : 'in_progress',
      strategies: ['High-yield savings', 'Money market fund'],
    });

    // Financial independence milestone
    const fiTarget = (head.income || 100000) * 25; // 25x expenses
    milestones.push({
      id: uuidv4(),
      name: 'Financial Independence',
      targetDate: new Date(currentYear + 15, 11, 31),
      targetAmount: fiTarget,
      currentProgress: netWorth,
      progressPercent: Math.min(100, (netWorth / fiTarget) * 100),
      status: netWorth >= fiTarget ? 'achieved' : netWorth >= fiTarget * 0.5 ? 'in_progress' : 'not_started',
      strategies: ['Index fund investing', 'Tax-advantaged accounts', 'Income growth'],
    });

    // Legacy fund milestone
    const legacyTarget = netWorth * 2; // Double current net worth
    milestones.push({
      id: uuidv4(),
      name: 'Family Legacy Fund',
      targetDate: new Date(currentYear + 30, 11, 31),
      targetAmount: legacyTarget,
      currentProgress: 0,
      progressPercent: 0,
      status: 'not_started',
      strategies: ['Dynasty Trust', 'Multi-generational investing', 'Tax-efficient transfers'],
    });

    // Children/grandchildren education
    const childrenCount = family.members.filter(
      (m) => m.relationship === 'child' || m.relationship === 'grandchild'
    ).length;
    if (childrenCount > 0) {
      const educationTarget = childrenCount * 250000; // $250k per child
      milestones.push({
        id: uuidv4(),
        name: 'Education Funding',
        targetDate: new Date(currentYear + 18, 11, 31),
        targetAmount: educationTarget,
        currentProgress: 0,
        progressPercent: 0,
        status: 'not_started',
        strategies: ['529 plans', 'UTMA accounts', 'Education trusts'],
      });
    }

    return milestones;
  }

  private generateStrategies(
    family: FamilyProfile,
    head: FamilyMemberExtended
  ): WealthStrategy[] {
    const strategies: WealthStrategy[] = [];
    const netWorth = family.totalNetWorth;

    // Investment strategies based on wealth stage
    if (family.wealthStage === 'accumulation') {
      strategies.push({
        id: uuidv4(),
        name: 'Aggressive Growth Portfolio',
        category: 'investing',
        description: 'High-growth equity portfolio targeting 10%+ annual returns',
        expectedReturn: 10,
        riskLevel: 'aggressive',
        timeHorizon: '10+ years',
        implementationSteps: [
          'Open low-cost brokerage account',
          'Allocate 80% stocks, 20% bonds',
          'Use index funds (VTI, VXUS, BND)',
          'Set up automatic monthly investments',
          'Rebalance annually',
        ],
        estimatedCost: 0,
        priority: 'high',
        automatable: true,
      });
    }

    // Tax strategies
    strategies.push({
      id: uuidv4(),
      name: 'Tax-Advantaged Account Maximization',
      category: 'tax',
      description: 'Maximize all tax-advantaged retirement accounts',
      expectedReturn: 2, // Tax savings equivalent
      riskLevel: 'conservative',
      timeHorizon: 'Annual',
      implementationSteps: [
        `Max 401(k): $23,000 (2025)`,
        `Max IRA: $7,000 (2025)`,
        'Consider backdoor Roth if income too high',
        'Use HSA if eligible ($4,150 individual, $8,300 family)',
        'Consider mega backdoor Roth if available',
      ],
      estimatedCost: 0,
      priority: 'high',
      automatable: true,
    });

    // Estate strategies for higher net worth
    if (netWorth > 5000000) {
      strategies.push({
        id: uuidv4(),
        name: 'Dynasty Trust Setup',
        category: 'estate',
        description: 'Multi-generational wealth transfer vehicle',
        expectedReturn: 40, // Tax savings %
        riskLevel: 'conservative',
        timeHorizon: 'Perpetual',
        implementationSteps: [
          'Consult with estate planning attorney',
          'Choose jurisdiction (South Dakota recommended)',
          'Select professional trustee',
          'Transfer assets (ideally high-growth)',
          'Fund with lifetime exemption amount',
        ],
        estimatedCost: 50000,
        priority: 'high',
        automatable: false,
      });
    }

    // Asset protection
    if (netWorth > 1000000) {
      strategies.push({
        id: uuidv4(),
        name: 'Asset Protection Plan',
        category: 'protection',
        description: 'Comprehensive liability protection',
        expectedReturn: 0,
        riskLevel: 'conservative',
        timeHorizon: 'Ongoing',
        implementationSteps: [
          'Increase liability insurance ($1M+ umbrella)',
          'Consider LLC for rental properties',
          'Review asset titling (JTWROS, tenants by entirety)',
          'Evaluate domestic asset protection trust',
        ],
        estimatedCost: 2000,
        priority: 'medium',
        automatable: false,
      });
    }

    // Passive income
    strategies.push({
      id: uuidv4(),
      name: 'Passive Income Streams',
      category: 'income',
      description: 'Build multiple streams of passive income',
      expectedReturn: 8,
      riskLevel: 'moderate',
      timeHorizon: '5-10 years',
      implementationSteps: [
        'Dividend growth investing (3-4% yield)',
        'Real estate investment (direct or REITs)',
        'Bond ladder for income',
        'Consider rental properties',
        'Royalty investments',
      ],
      estimatedCost: 0,
      priority: 'medium',
      automatable: true,
    });

    return strategies;
  }

  private generateProjections(
    family: FamilyProfile,
    head: FamilyMemberExtended
  ): WealthProjection[] {
    const projections: WealthProjection[] = [];
    const currentYear = new Date().getFullYear();
    let netWorth = family.totalNetWorth;
    const income = head.income || 100000;
    const savingsRate = 0.2; // 20% savings rate
    const growthRate = 0.07; // 7% annual return

    for (let year = 0; year <= 40; year++) {
      const age = head.age + year;
      const annualSavings = year < 30 ? income * savingsRate : 0; // Stop saving at retirement
      const passiveIncome = netWorth * 0.04; // 4% withdrawal rate
      const taxRate = netWorth > 13990000 ? 0.40 : 0.25;
      const taxLiability = passiveIncome * taxRate;

      netWorth = netWorth * (1 + growthRate) + annualSavings;

      let milestone: string | undefined;
      if (year === 10) milestone = 'Mid-term checkpoint';
      if (year === 20) milestone = 'Financial independence target';
      if (year === 30) milestone = 'Retirement';
      if (year === 40) milestone = 'Legacy transfer';

      projections.push({
        year: currentYear + year,
        age,
        projectedNetWorth: Math.round(netWorth),
        passiveIncome: Math.round(passiveIncome),
        taxLiability: Math.round(taxLiability),
        charitableGiving: Math.round(passiveIncome * 0.1), // 10% charitable
        legacyTransfer: year >= 30 ? Math.round(netWorth * 0.05) : 0,
        milestone,
      });
    }

    return projections;
  }

  private generateActionItems(
    family: FamilyProfile,
    strategies: WealthStrategy[]
  ): ActionItem[] {
    const items: ActionItem[] = [];

    // Priority actions based on strategies
    for (const strategy of strategies.filter((s) => s.priority === 'high')) {
      items.push({
        id: uuidv4(),
        title: `Implement: ${strategy.name}`,
        description: strategy.description,
        category: strategy.category,
        priority: 'high',
        status: 'pending',
        estimatedImpact: strategy.expectedReturn,
        automatable: strategy.automatable,
      });
    }

    // Family-specific actions
    items.push({
      id: uuidv4(),
      title: 'Schedule Family Wealth Meeting',
      description:
        'Quarterly meeting to review goals, progress, and align on wealth building strategies',
      category: 'planning',
      priority: 'medium',
      status: 'pending',
      estimatedImpact: 0,
      automatable: false,
    });

    items.push({
      id: uuidv4(),
      title: 'Update Beneficiary Designations',
      description:
        'Review and update beneficiaries on all accounts (401k, IRA, life insurance)',
      category: 'estate',
      priority: 'high',
      status: 'pending',
      estimatedImpact: 0,
      automatable: false,
    });

    items.push({
      id: uuidv4(),
      title: 'Create/Update Estate Documents',
      description:
        'Ensure will, power of attorney, and healthcare directive are current',
      category: 'estate',
      priority: 'urgent',
      status: 'pending',
      estimatedImpact: 0,
      automatable: false,
    });

    return items;
  }

  // ============================================================
  // AI RECOMMENDATIONS
  // ============================================================

  /**
   * Generate AI-powered recommendations for a family
   */
  generateRecommendations(familyId: string): AIRecommendation[] {
    const family = this.families.get(familyId);
    if (!family) return [];

    const recommendations: AIRecommendation[] = [];
    const netWorth = family.totalNetWorth;
    const taxConstants = dynastyTrustEngine.getTaxConstants();

    // Estate tax warning
    if (netWorth > taxConstants.lifetimeEstateExemption) {
      recommendations.push({
        id: uuidv4(),
        type: 'warning',
        title: 'Estate Tax Exposure Detected',
        description: `Your family's net worth exceeds the ${(
          taxConstants.lifetimeEstateExemption / 1000000
        ).toFixed(2)}M estate tax exemption`,
        reasoning:
          'Without proper planning, your estate could face a 40% federal estate tax',
        estimatedImpact:
          (netWorth - taxConstants.lifetimeEstateExemption) * 0.4,
        priority: 'urgent',
        category: 'estate',
        actions: [
          'Consult estate planning attorney immediately',
          'Consider Dynasty Trust setup',
          'Implement aggressive gifting strategy',
          'Review SLAT options for married couples',
        ],
        confidence: 95,
      });
    }

    // Exemption sunset warning (2026)
    if (netWorth > 5000000) {
      recommendations.push({
        id: uuidv4(),
        type: 'opportunity',
        title: '2026 Exemption Sunset - Act Now',
        description:
          'The $13.99M estate exemption is set to drop to ~$7M in 2026',
        reasoning:
          'Using your exemption now through trusts locks in the higher amount',
        estimatedImpact: (13990000 - 7000000) * 0.4,
        priority: 'high',
        category: 'estate',
        actions: [
          'Establish SLAT before 2026',
          'Transfer appreciating assets to trust',
          'Consider GRAT for business interests',
        ],
        deadline: new Date(2025, 11, 31),
        confidence: 90,
      });
    }

    // Tax optimization
    recommendations.push({
      id: uuidv4(),
      type: 'opportunity',
      title: 'Tax-Loss Harvesting Opportunity',
      description:
        'Review portfolio for tax-loss harvesting before year end',
      reasoning:
        'Realizing losses can offset gains and reduce tax liability',
      estimatedImpact: netWorth * 0.005,
      priority: 'medium',
      category: 'tax',
      actions: [
        'Review unrealized losses in taxable accounts',
        'Sell losing positions and buy similar (not identical) assets',
        'Be aware of wash sale rules (30 days)',
      ],
      deadline: new Date(new Date().getFullYear(), 11, 15),
      confidence: 85,
    });

    // Education for family members
    const beginnersCount = family.members.filter(
      (m) => m.financialLiteracy === 'beginner'
    ).length;
    if (beginnersCount > 0) {
      recommendations.push({
        id: uuidv4(),
        type: 'education',
        title: 'Family Financial Education',
        description: `${beginnersCount} family members would benefit from financial education`,
        reasoning:
          'Financial literacy ensures wealth is preserved across generations',
        estimatedImpact: 0,
        priority: 'medium',
        category: 'education',
        actions: [
          'Enroll in TIME financial literacy courses',
          'Schedule family financial discussions',
          'Create learning roadmap for each member',
        ],
        confidence: 80,
      });
    }

    return recommendations.sort(
      (a, b) =>
        { const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority]; }
    );
  }

  // ============================================================
  // FINANCIAL EDUCATION
  // ============================================================

  private initializeEducationContent(): void {
    this.lessons = [
      {
        id: uuidv4(),
        title: 'Compound Interest: The 8th Wonder of the World',
        category: 'basics',
        difficulty: 'beginner',
        duration: 15,
        content: `Compound interest is when you earn interest on both your original investment AND the interest you've already earned. Einstein allegedly called it "the 8th wonder of the world."

Example: $10,000 invested at 7% annually becomes:
- Year 10: $19,672
- Year 20: $38,697
- Year 30: $76,123
- Year 40: $149,745

Key Takeaway: Start early. Time is your biggest asset.`,
        keyTakeaways: [
          'Start investing as early as possible',
          'Even small amounts grow significantly over time',
          '7% annual return doubles money every 10 years (Rule of 72)',
        ],
        resources: ['Investopedia: Compound Interest'],
      },
      {
        id: uuidv4(),
        title: 'Tax-Advantaged Accounts Explained',
        category: 'tax',
        difficulty: 'beginner',
        duration: 20,
        content: `Tax-advantaged accounts help you keep more of your money by reducing taxes.

401(k): Employer-sponsored, pre-tax contributions, $23,000 limit (2025)
IRA: Individual account, $7,000 limit (2025), Traditional or Roth
Roth IRA: After-tax contributions, tax-free growth and withdrawals
HSA: Triple tax advantage for healthcare, $4,150 individual (2025)

Order of priority:
1. 401(k) match (free money!)
2. HSA if eligible
3. Roth IRA
4. Max 401(k)
5. Taxable brokerage`,
        keyTakeaways: [
          'Always get your full 401(k) match',
          'Roth accounts are powerful for young investors',
          'HSA is the most tax-efficient account available',
        ],
        resources: ['IRS Publication 590', 'TIME Tax Optimization Guide'],
      },
      {
        id: uuidv4(),
        title: 'Estate Planning Fundamentals',
        category: 'estate',
        difficulty: 'intermediate',
        duration: 30,
        content: `Estate planning ensures your wealth transfers to your heirs efficiently.

Essential Documents:
1. Will - Who gets what
2. Revocable Living Trust - Avoid probate
3. Power of Attorney - Who makes financial decisions if you can't
4. Healthcare Directive - Medical decisions

Key Concepts:
- Estate Tax Exemption: $13.99M per person (2025)
- Annual Gift Exclusion: $19,000 per recipient (2025)
- Stepped-up basis: Heirs receive assets at current value, erasing capital gains

Advanced Strategies:
- Dynasty Trusts for multi-generational wealth
- GRATs for transferring appreciation
- ILITs for life insurance outside estate`,
        keyTakeaways: [
          'Everyone needs a will and power of attorney',
          'Trusts can avoid probate and reduce taxes',
          'Review beneficiary designations regularly',
        ],
        resources: ['TIME Dynasty Trust Guide', 'Estate Planning Checklist'],
      },
      {
        id: uuidv4(),
        title: 'Building Multiple Income Streams',
        category: 'income',
        difficulty: 'intermediate',
        duration: 25,
        content: `Wealthy families typically have 7+ income streams. Here's how to build yours:

1. Earned Income: Salary, wages, self-employment
2. Dividend Income: Stocks that pay quarterly dividends
3. Interest Income: Bonds, CDs, savings accounts
4. Rental Income: Real estate properties
5. Capital Gains: Selling appreciated assets
6. Business Income: Side hustles, businesses you own
7. Royalty Income: Books, patents, music

Strategy for Building Streams:
- Start with dividend stocks (SCHD, VIG, VYM)
- Consider REITs for real estate exposure
- Build a side income that can scale
- Reinvest all passive income initially`,
        keyTakeaways: [
          'Diversify income sources for stability',
          'Passive income provides freedom',
          'Start with what you know, expand from there',
        ],
        resources: ['Dividend Aristocrats List', 'TIME Passive Income Calculator'],
      },
    ];
  }

  /**
   * Get lessons by category or difficulty
   */
  getLessons(filters?: {
    category?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }): FinancialLesson[] {
    let lessons = [...this.lessons];

    if (filters?.category) {
      lessons = lessons.filter((l) => l.category === filters.category);
    }
    if (filters?.difficulty) {
      lessons = lessons.filter((l) => l.difficulty === filters.difficulty);
    }

    return lessons;
  }

  /**
   * Get personalized learning path for a family member
   */
  getLearningPath(memberId: string, familyId: string): FinancialLesson[] {
    const family = this.families.get(familyId);
    if (!family) return [];

    const member = family.members.find((m) => m.id === memberId);
    if (!member) return [];

    const literacy = member.financialLiteracy || 'beginner';
    const lessons = this.getLessons({ difficulty: literacy });

    // Order by relevance to family goals
    return lessons.sort((a, b) => {
      const aRelevant = family.primaryGoals.some((g) =>
        a.category.toLowerCase().includes(g.toLowerCase())
      );
      const bRelevant = family.primaryGoals.some((g) =>
        b.category.toLowerCase().includes(g.toLowerCase())
      );
      if (aRelevant && !bRelevant) return -1;
      if (!aRelevant && bRelevant) return 1;
      return 0;
    });
  }

  // ============================================================
  // INTEGRATION WITH DYNASTY TRUST ENGINE
  // ============================================================

  /**
   * Get comprehensive wealth plan combining all systems
   */
  getComprehensivePlan(familyId: string): {
    family: FamilyProfile;
    roadmap: WealthRoadmap;
    trustPlan?: WealthTransferPlan;
    recommendations: AIRecommendation[];
    lessons: FinancialLesson[];
  } | null {
    const family = this.families.get(familyId);
    if (!family) return null;

    // Get or generate roadmap
    let roadmap = Array.from(this.roadmaps.values()).find(
      (r) => r.familyId === familyId
    );
    if (!roadmap) {
      roadmap = this.generateWealthRoadmap(familyId);
    }

    // Get trust plan if net worth warrants
    let trustPlan: WealthTransferPlan | undefined;
    if (family.totalNetWorth > 2000000) {
      const headMember = family.members.find(
        (m) => m.name === family.headOfHousehold
      ) || family.members[0];

      trustPlan = dynastyTrustEngine.createWealthTransferPlan(
        family.id,
        `${family.familyName} Estate Plan`,
        family.totalNetWorth,
        headMember.age,
        family.members.some((m) => m.relationship === 'spouse'),
        family.members,
        {
          targetLegacyAmount: family.totalNetWorth * 2,
        }
      );
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(familyId);

    // Get beginner lessons for family
    const lessons = this.getLessons({ difficulty: 'beginner' });

    return {
      family,
      roadmap,
      trustPlan,
      recommendations,
      lessons,
    };
  }

  // ============================================================
  // STATUS
  // ============================================================

  getStatus(): {
    familiesCount: number;
    roadmapsCount: number;
    lessonsCount: number;
    totalNetWorthManaged: number;
  } {
    let totalNetWorth = 0;
    for (const family of this.families.values()) {
      totalNetWorth += family.totalNetWorth;
    }

    return {
      familiesCount: this.families.size,
      roadmapsCount: this.roadmaps.size,
      lessonsCount: this.lessons.length,
      totalNetWorthManaged: totalNetWorth,
    };
  }
}

// Export singleton
export const familyLegacyAI = new FamilyLegacyAI();
export default familyLegacyAI;

/**
 * TIME Life-Timeline Financial Engine
 * The Human-Aware Money System
 *
 * WORLD'S FIRST: A financial engine that:
 * - Maps user's life events to their trading/investing
 * - Understands: buying a house, having kids, divorce, retirement, inheritance
 * - Adjusts strategy automatically based on life stage
 * - Projects future financial needs
 * - Creates life-aware portfolio allocation
 *
 * This is NOT just goal-based planning. This is LIFE-AWARE INTELLIGENCE.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type LifeEventType =
  // Career
  | 'career_start'
  | 'job_change'
  | 'promotion'
  | 'job_loss'
  | 'career_pivot'
  | 'retirement'
  | 'business_start'
  | 'business_exit'

  // Family
  | 'marriage'
  | 'divorce'
  | 'child_birth'
  | 'child_education_start'
  | 'child_graduation'
  | 'empty_nest'
  | 'caring_for_parents'
  | 'death_of_spouse'
  | 'inheritance'

  // Major Purchases
  | 'home_purchase'
  | 'home_sale'
  | 'rental_property'
  | 'major_renovation'
  | 'car_purchase'

  // Health
  | 'health_issue'
  | 'disability'
  | 'health_recovery'
  | 'long_term_care_needed'

  // Financial
  | 'debt_payoff'
  | 'windfall'
  | 'lawsuit'
  | 'bankruptcy'

  // Lifestyle
  | 'relocation'
  | 'sabbatical'
  | 'major_travel'
  | 'charitable_giving'

  // Custom
  | 'custom';

export type LifeStage =
  | 'early_career'           // 20s: Building foundation
  | 'career_growth'          // 30s: Accumulation phase
  | 'peak_earning'           // 40s-50s: Maximum earning potential
  | 'pre_retirement'         // 55-65: Preparing for retirement
  | 'early_retirement'       // 65-75: Active retirement
  | 'late_retirement'        // 75+: Wealth preservation
  | 'legacy_planning';       // End of life planning

export type FinancialPriority =
  | 'emergency_fund'
  | 'debt_elimination'
  | 'home_purchase'
  | 'income_growth'
  | 'wealth_accumulation'
  | 'education_funding'
  | 'retirement_saving'
  | 'income_generation'
  | 'wealth_preservation'
  | 'legacy_planning'
  | 'tax_optimization'
  | 'insurance_coverage'
  | 'estate_planning';

export type RiskCapacity = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

export interface LifeEvent {
  id: string;
  userId: string;
  type: LifeEventType;
  customType?: string;
  name: string;
  description?: string;

  // Timing
  date: Date;
  duration?: string;         // How long this event impacts finances
  isRecurring?: boolean;
  recurrencePattern?: string;

  // Financial impact
  financialImpact: {
    incomeChange?: number;     // Annual change
    expenseChange?: number;    // Annual change
    oneTimeInflow?: number;
    oneTimeOutflow?: number;
    ongoingCosts?: number;
    taxImplications?: string;
  };

  // Life impact
  lifeImpact: {
    riskToleranceChange?: number;  // -100 to +100
    timeHorizonChange?: number;    // Years added/removed
    liquidityNeedChange?: number;  // -100 to +100
    incomeStabilityChange?: number; // -100 to +100
  };

  // Status
  status: 'planned' | 'upcoming' | 'current' | 'completed' | 'cancelled';
  probability?: number;      // For planned events, likelihood 0-100

  // Strategy adjustments
  strategyAdjustments: {
    allocationChange?: { assetClass: string; changePercent: number }[];
    riskChange?: RiskCapacity;
    priorityChange?: FinancialPriority[];
    cashReserveTarget?: number;
    incomeNeedTarget?: number;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface LifeProfile {
  id: string;
  userId: string;

  // Demographics
  birthDate: Date;
  age: number;
  gender?: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'partnered';
  dependents: number;
  country: string;
  state?: string;

  // Current stage
  currentLifeStage: LifeStage;
  currentPriorities: FinancialPriority[];

  // Career
  employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student';
  industry?: string;
  yearsToRetirement?: number;
  expectedRetirementAge?: number;

  // Income profile
  annualIncome: number;
  incomeStability: 'very_stable' | 'stable' | 'variable' | 'volatile';
  incomeTrend: 'growing' | 'stable' | 'declining';
  incomeGrowthRate?: number;

  // Expenses
  annualExpenses: number;
  fixedExpenses: number;
  discretionaryExpenses: number;
  expenseTrend: 'increasing' | 'stable' | 'decreasing';

  // Assets & Liabilities
  netWorth: number;
  liquidAssets: number;
  illiquidAssets: number;
  totalDebt: number;
  debtServiceRatio: number;

  // Insurance
  hasLifeInsurance: boolean;
  hasDisabilityInsurance: boolean;
  hasHealthInsurance: boolean;
  hasUmbrellaInsurance: boolean;

  // Estate
  hasWill: boolean;
  hasTrust: boolean;
  estatePlanDate?: Date;

  // Risk profile (derived from life situation)
  derivedRiskCapacity: RiskCapacity;
  derivedRiskTolerance: RiskCapacity;
  effectiveRisk: RiskCapacity;

  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  description?: string;

  // Target
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;

  // Priority
  priority: 'critical' | 'high' | 'medium' | 'low';
  isFlexible: boolean;

  // Funding
  monthlyContribution: number;
  contributionSource: 'income' | 'returns' | 'both';

  // Risk
  riskTolerance: RiskCapacity;
  canDelayIfNeeded: boolean;

  // Related events
  relatedLifeEventIds: string[];

  // Progress
  percentComplete: number;
  onTrack: boolean;
  projectedCompletionDate: Date;

  // Status
  status: 'active' | 'achieved' | 'abandoned' | 'paused';
}

export interface LifeProjection {
  userId: string;
  generatedAt: Date;

  // Timeline
  yearsProjected: number;
  projectionPeriod: { year: number; age: number }[];

  // Income projection
  incomeProjection: {
    year: number;
    age: number;
    grossIncome: number;
    taxableIncome: number;
    afterTaxIncome: number;
    socialSecurity?: number;
    pensionIncome?: number;
    investmentIncome?: number;
    totalIncome: number;
  }[];

  // Expense projection
  expenseProjection: {
    year: number;
    age: number;
    fixedExpenses: number;
    variableExpenses: number;
    healthcareCosts: number;
    inflationAdjusted: number;
    totalExpenses: number;
  }[];

  // Net worth projection
  netWorthProjection: {
    year: number;
    age: number;
    investments: number;
    realEstate: number;
    other: number;
    debt: number;
    netWorth: number;
  }[];

  // Key milestones
  milestones: {
    year: number;
    age: number;
    event: string;
    financialImpact: string;
  }[];

  // Risk scenarios
  scenarios: {
    name: string;
    description: string;
    probability: number;
    impactOnPlan: 'positive' | 'neutral' | 'negative' | 'severe';
    adjustedOutcome: number;
  }[];

  // Success probability
  retirementSuccessProbability: number;  // Monte Carlo result
  longevityRisk: number;                  // Risk of outliving money
  sequenceOfReturnsRisk: number;          // Risk of bad early returns
}

export interface LifeAwareAllocation {
  userId: string;
  asOfDate: Date;
  lifeStage: LifeStage;
  derivedFromProfile: boolean;

  // Target allocation
  targetAllocation: {
    assetClass: string;
    percent: number;
    reasoning: string;
  }[];

  // Glide path
  glidePath: {
    year: number;
    age: number;
    equity: number;
    fixedIncome: number;
    alternatives: number;
    cash: number;
  }[];

  // Adjustments from life events
  eventAdjustments: {
    eventId: string;
    eventName: string;
    adjustment: { assetClass: string; changePercent: number }[];
    reasoning: string;
  }[];

  // Income needs
  incomeNeeds: {
    immediate: number;      // Monthly income needed now
    future: number;         // Monthly income needed in retirement
    gap: number;            // Income gap to fill
    strategy: string;
  };

  // Reserve requirements
  reserves: {
    emergencyFundTarget: number;
    emergencyFundCurrent: number;
    opportunityReserve: number;
    largePurchaseReserve: number;
    healthcareReserve: number;
  };

  // Recommendations
  recommendations: {
    priority: number;
    category: string;
    action: string;
    reasoning: string;
    impact: string;
  }[];
}

export interface TaxStrategy {
  userId: string;
  taxYear: number;

  // Tax situation
  filingStatus: 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household';
  taxBracket: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  stateTaxRate: number;

  // Optimization strategies
  strategies: {
    name: string;
    description: string;
    potentialSavings: number;
    implementationSteps: string[];
    deadline?: Date;
    complexity: 'low' | 'medium' | 'high';
  }[];

  // Account optimization
  accountStrategy: {
    accountType: string;
    currentBalance: number;
    targetContribution: number;
    taxAdvantage: string;
    priority: number;
  }[];

  // Tax-loss harvesting
  harvestingOpportunities: {
    asset: string;
    unrealizedLoss: number;
    taxBenefit: number;
    washSaleRisk: boolean;
    recommendation: string;
  }[];

  // RMD planning (if applicable)
  rmdStrategy?: {
    year: number;
    requiredAmount: number;
    strategy: string;
    qcdOpportunity?: number;
  };
}

// ============================================================================
// LIFE-TIMELINE FINANCIAL ENGINE
// ============================================================================

export class LifeTimelineEngine extends EventEmitter {
  private static instance: LifeTimelineEngine;

  private profiles: Map<string, LifeProfile> = new Map();
  private events: Map<string, LifeEvent[]> = new Map();
  private goals: Map<string, FinancialGoal[]> = new Map();
  private projections: Map<string, LifeProjection> = new Map();
  private allocations: Map<string, LifeAwareAllocation> = new Map();
  private taxStrategies: Map<string, TaxStrategy> = new Map();

  private initialized: boolean = false;

  private constructor() {
    super();
  }

  public static getInstance(): LifeTimelineEngine {
    if (!LifeTimelineEngine.instance) {
      LifeTimelineEngine.instance = new LifeTimelineEngine();
    }
    return LifeTimelineEngine.instance;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[LIFE] Initializing Life-Timeline Financial Engine...');

    // Start background processes
    this.startLifeStageMonitor();
    this.startEventTriggerMonitor();
    this.startGoalProgressMonitor();
    this.startProjectionRefresher();

    this.initialized = true;
    this.emit('initialized');
    console.log('[LIFE] Life-Timeline Financial Engine initialized');
  }

  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  public async createProfile(profileData: Omit<LifeProfile, 'id' | 'createdAt' | 'updatedAt' | 'currentLifeStage' | 'derivedRiskCapacity' | 'derivedRiskTolerance' | 'effectiveRisk'>): Promise<LifeProfile> {
    const age = this.calculateAge(profileData.birthDate);
    const lifeStage = this.determineLifeStage(age, profileData);
    const riskCapacity = this.deriveRiskCapacity(profileData, age);
    const riskTolerance = this.deriveRiskTolerance(profileData, age);

    const profile: LifeProfile = {
      ...profileData,
      id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      age,
      currentLifeStage: lifeStage,
      derivedRiskCapacity: riskCapacity,
      derivedRiskTolerance: riskTolerance,
      effectiveRisk: this.combineRiskMeasures(riskCapacity, riskTolerance),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.profiles.set(profile.userId, profile);
    this.events.set(profile.userId, []);
    this.goals.set(profile.userId, []);

    // Generate initial projection
    await this.generateProjection(profile.userId);

    // Generate life-aware allocation
    await this.generateLifeAwareAllocation(profile.userId);

    this.emit('profileCreated', profile);
    console.log(`[LIFE] Created profile for user: ${profile.userId} (Age: ${age}, Stage: ${lifeStage})`);

    return profile;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private determineLifeStage(age: number, profile: Partial<LifeProfile>): LifeStage {
    if (profile.employmentStatus === 'retired') return 'early_retirement';
    if (age < 30) return 'early_career';
    if (age < 40) return 'career_growth';
    if (age < 55) return 'peak_earning';
    if (age < 65) return 'pre_retirement';
    if (age < 75) return 'early_retirement';
    return 'late_retirement';
  }

  private deriveRiskCapacity(profile: Partial<LifeProfile>, age: number): RiskCapacity {
    let score = 50; // Start at moderate

    // Age factor: younger = higher capacity
    score += (65 - age) * 0.5;

    // Income stability
    if (profile.incomeStability === 'very_stable') score += 15;
    else if (profile.incomeStability === 'stable') score += 10;
    else if (profile.incomeStability === 'volatile') score -= 15;

    // Debt burden
    if ((profile.debtServiceRatio || 0) > 0.4) score -= 20;
    else if ((profile.debtServiceRatio || 0) > 0.3) score -= 10;

    // Emergency fund coverage
    const monthsCovered = (profile.liquidAssets || 0) / ((profile.annualExpenses || 60000) / 12);
    if (monthsCovered > 12) score += 15;
    else if (monthsCovered > 6) score += 10;
    else if (monthsCovered < 3) score -= 15;

    // Dependents
    score -= (profile.dependents || 0) * 5;

    // Insurance coverage
    if (profile.hasLifeInsurance && profile.hasDisabilityInsurance) score += 10;

    // Map to category
    if (score >= 80) return 'very_high';
    if (score >= 60) return 'high';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'low';
    return 'very_low';
  }

  private deriveRiskTolerance(profile: Partial<LifeProfile>, age: number): RiskCapacity {
    // This would typically come from a questionnaire
    // For now, derive from profile characteristics
    let score = 50;

    // Younger people tend to have higher tolerance
    score += (50 - age) * 0.3;

    // Income trend affects confidence
    if (profile.incomeTrend === 'growing') score += 10;
    else if (profile.incomeTrend === 'declining') score -= 10;

    // Net worth relative to age (wealth effect)
    const expectedNetWorth = (profile.annualIncome || 50000) * (age / 10);
    if ((profile.netWorth || 0) > expectedNetWorth * 1.5) score += 10;
    else if ((profile.netWorth || 0) < expectedNetWorth * 0.5) score -= 10;

    if (score >= 80) return 'very_high';
    if (score >= 60) return 'high';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'low';
    return 'very_low';
  }

  private combineRiskMeasures(capacity: RiskCapacity, tolerance: RiskCapacity): RiskCapacity {
    const levels = ['very_low', 'low', 'moderate', 'high', 'very_high'];
    const capacityIndex = levels.indexOf(capacity);
    const toleranceIndex = levels.indexOf(tolerance);

    // Effective risk is the LOWER of capacity and tolerance
    const effectiveIndex = Math.min(capacityIndex, toleranceIndex);
    return levels[effectiveIndex] as RiskCapacity;
  }

  // ==========================================================================
  // LIFE EVENT MANAGEMENT
  // ==========================================================================

  public async addLifeEvent(userId: string, eventData: Omit<LifeEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<LifeEvent> {
    const event: LifeEvent = {
      ...eventData,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userEvents = this.events.get(userId) || [];
    userEvents.push(event);
    this.events.set(userId, userEvents);

    // Update profile based on event
    await this.processLifeEventImpact(userId, event);

    // Regenerate projections and allocations
    await this.generateProjection(userId);
    await this.generateLifeAwareAllocation(userId);

    this.emit('lifeEventAdded', event);
    console.log(`[LIFE] Added life event: ${event.name} for user ${userId}`);

    return event;
  }

  private async processLifeEventImpact(userId: string, event: LifeEvent): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) return;

    // Update income
    if (event.financialImpact.incomeChange) {
      profile.annualIncome += event.financialImpact.incomeChange;
    }

    // Update expenses
    if (event.financialImpact.expenseChange) {
      profile.annualExpenses += event.financialImpact.expenseChange;
    }

    // Update risk profile based on life impact
    if (event.lifeImpact.riskToleranceChange) {
      const currentIndex = ['very_low', 'low', 'moderate', 'high', 'very_high'].indexOf(profile.derivedRiskTolerance);
      const change = Math.round(event.lifeImpact.riskToleranceChange / 25);
      const newIndex = Math.max(0, Math.min(4, currentIndex + change));
      profile.derivedRiskTolerance = ['very_low', 'low', 'moderate', 'high', 'very_high'][newIndex] as RiskCapacity;
      profile.effectiveRisk = this.combineRiskMeasures(profile.derivedRiskCapacity, profile.derivedRiskTolerance);
    }

    // Update dependents for family events
    if (event.type === 'child_birth') {
      profile.dependents++;
    } else if (event.type === 'empty_nest') {
      profile.dependents = Math.max(0, profile.dependents - 1);
    }

    // Update marital status
    if (event.type === 'marriage') {
      profile.maritalStatus = 'married';
    } else if (event.type === 'divorce') {
      profile.maritalStatus = 'divorced';
    } else if (event.type === 'death_of_spouse') {
      profile.maritalStatus = 'widowed';
    }

    // Update employment status
    if (event.type === 'retirement') {
      profile.employmentStatus = 'retired';
    } else if (event.type === 'job_loss') {
      profile.employmentStatus = 'unemployed';
    } else if (event.type === 'business_start') {
      profile.employmentStatus = 'self_employed';
    }

    // Update priorities based on event type
    profile.currentPriorities = this.deriveNewPriorities(profile, event);

    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    this.emit('profileUpdatedFromEvent', { userId, eventId: event.id });
  }

  private deriveNewPriorities(profile: LifeProfile, event: LifeEvent): FinancialPriority[] {
    const priorities: FinancialPriority[] = [];

    // Event-specific priority changes
    switch (event.type) {
      case 'child_birth':
        priorities.push('education_funding', 'insurance_coverage');
        break;
      case 'home_purchase':
        priorities.push('debt_elimination', 'emergency_fund');
        break;
      case 'job_loss':
        priorities.push('emergency_fund', 'income_growth');
        break;
      case 'retirement':
        priorities.push('income_generation', 'wealth_preservation');
        break;
      case 'inheritance':
        priorities.push('tax_optimization', 'wealth_accumulation');
        break;
      case 'health_issue':
        priorities.push('insurance_coverage', 'emergency_fund');
        break;
    }

    // Stage-based priorities
    switch (profile.currentLifeStage) {
      case 'early_career':
        priorities.push('emergency_fund', 'debt_elimination', 'retirement_saving');
        break;
      case 'career_growth':
        priorities.push('wealth_accumulation', 'home_purchase', 'education_funding');
        break;
      case 'peak_earning':
        priorities.push('retirement_saving', 'tax_optimization', 'wealth_accumulation');
        break;
      case 'pre_retirement':
        priorities.push('retirement_saving', 'wealth_preservation', 'estate_planning');
        break;
      case 'early_retirement':
        priorities.push('income_generation', 'wealth_preservation', 'legacy_planning');
        break;
    }

    // Deduplicate and limit to top 5
    return [...new Set(priorities)].slice(0, 5);
  }

  // ==========================================================================
  // GOAL MANAGEMENT
  // ==========================================================================

  public async addGoal(userId: string, goalData: Omit<FinancialGoal, 'id' | 'userId' | 'percentComplete' | 'onTrack' | 'projectedCompletionDate'>): Promise<FinancialGoal> {
    const percentComplete = (goalData.currentAmount / goalData.targetAmount) * 100;
    const projectedDate = this.projectGoalCompletion(goalData);

    const goal: FinancialGoal = {
      ...goalData,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      percentComplete,
      onTrack: projectedDate <= goalData.targetDate,
      projectedCompletionDate: projectedDate
    };

    const userGoals = this.goals.get(userId) || [];
    userGoals.push(goal);
    this.goals.set(userId, userGoals);

    this.emit('goalAdded', goal);
    console.log(`[LIFE] Added goal: ${goal.name} for user ${userId}`);

    return goal;
  }

  private projectGoalCompletion(goal: Omit<FinancialGoal, 'id' | 'userId' | 'percentComplete' | 'onTrack' | 'projectedCompletionDate'>): Date {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return new Date();

    // Simple projection: monthly contribution + estimated returns
    const monthlyReturn = goal.riskTolerance === 'very_high' ? 0.007 :
                          goal.riskTolerance === 'high' ? 0.005 :
                          goal.riskTolerance === 'moderate' ? 0.004 :
                          goal.riskTolerance === 'low' ? 0.003 : 0.002;

    let balance = goal.currentAmount;
    let months = 0;

    while (balance < goal.targetAmount && months < 600) { // Max 50 years
      balance = balance * (1 + monthlyReturn) + goal.monthlyContribution;
      months++;
    }

    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + months);
    return projectedDate;
  }

  // ==========================================================================
  // PROJECTION ENGINE
  // ==========================================================================

  public async generateProjection(userId: string): Promise<LifeProjection> {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error(`Profile not found: ${userId}`);

    const userEvents = this.events.get(userId) || [];
    const yearsToProject = Math.max(30, (profile.expectedRetirementAge || 65) - profile.age + 20);

    const projection: LifeProjection = {
      userId,
      generatedAt: new Date(),
      yearsProjected: yearsToProject,
      projectionPeriod: this.generateProjectionPeriod(profile.age, yearsToProject),
      incomeProjection: this.projectIncome(profile, userEvents, yearsToProject),
      expenseProjection: this.projectExpenses(profile, userEvents, yearsToProject),
      netWorthProjection: this.projectNetWorth(profile, userEvents, yearsToProject),
      milestones: this.identifyMilestones(profile, userEvents),
      scenarios: this.generateScenarios(profile),
      retirementSuccessProbability: this.calculateSuccessProbability(profile),
      longevityRisk: this.calculateLongevityRisk(profile),
      sequenceOfReturnsRisk: this.calculateSequenceRisk(profile)
    };

    this.projections.set(userId, projection);
    this.emit('projectionGenerated', { userId, projection });

    return projection;
  }

  private generateProjectionPeriod(currentAge: number, years: number): { year: number; age: number }[] {
    const currentYear = new Date().getFullYear();
    const periods: { year: number; age: number }[] = [];

    for (let i = 0; i <= years; i++) {
      periods.push({
        year: currentYear + i,
        age: currentAge + i
      });
    }

    return periods;
  }

  private projectIncome(profile: LifeProfile, events: LifeEvent[], years: number): LifeProjection['incomeProjection'] {
    const projection: LifeProjection['incomeProjection'] = [];
    const currentYear = new Date().getFullYear();
    let income = profile.annualIncome;
    const retirementAge = profile.expectedRetirementAge || 65;

    for (let i = 0; i <= years; i++) {
      const year = currentYear + i;
      const age = profile.age + i;

      // Apply income growth until retirement
      if (age < retirementAge && i > 0) {
        const growthRate = profile.incomeGrowthRate ||
          (profile.incomeTrend === 'growing' ? 0.03 : profile.incomeTrend === 'declining' ? -0.02 : 0.01);
        income *= (1 + growthRate);
      }

      // Check for events affecting income
      for (const event of events) {
        if (event.date.getFullYear() === year && event.financialImpact.incomeChange) {
          income += event.financialImpact.incomeChange;
        }
      }

      // Post-retirement income
      const grossIncome = age >= retirementAge ? income * 0.3 : income; // Assume 30% of pre-retirement income
      const socialSecurity = age >= 67 ? Math.min(income * 0.25, 50000) : 0;
      const pensionIncome = age >= retirementAge ? income * 0.1 : 0;
      const investmentIncome = age >= retirementAge ? profile.netWorth * 0.04 : 0;

      projection.push({
        year,
        age,
        grossIncome,
        taxableIncome: grossIncome * 0.85,
        afterTaxIncome: grossIncome * 0.75,
        socialSecurity,
        pensionIncome,
        investmentIncome,
        totalIncome: grossIncome + socialSecurity + pensionIncome + investmentIncome
      });
    }

    return projection;
  }

  private projectExpenses(profile: LifeProfile, events: LifeEvent[], years: number): LifeProjection['expenseProjection'] {
    const projection: LifeProjection['expenseProjection'] = [];
    const currentYear = new Date().getFullYear();
    let expenses = profile.annualExpenses;
    const inflationRate = 0.025;
    const healthcareInflation = 0.05;
    const retirementAge = profile.expectedRetirementAge || 65;

    for (let i = 0; i <= years; i++) {
      const year = currentYear + i;
      const age = profile.age + i;

      // Apply inflation
      if (i > 0) {
        expenses *= (1 + inflationRate);
      }

      // Check for events affecting expenses
      for (const event of events) {
        if (event.date.getFullYear() === year && event.financialImpact.expenseChange) {
          expenses += event.financialImpact.expenseChange;
        }
      }

      // Healthcare costs increase with age
      const baseHealthcare = expenses * 0.1;
      const healthcareMultiplier = age >= 65 ? 2 : age >= 55 ? 1.5 : 1;
      const healthcareCosts = baseHealthcare * healthcareMultiplier * Math.pow(1 + healthcareInflation, i);

      // Expenses typically decrease in retirement
      const retirementAdjustment = age >= retirementAge ? 0.75 : 1;

      projection.push({
        year,
        age,
        fixedExpenses: profile.fixedExpenses * Math.pow(1 + inflationRate, i),
        variableExpenses: profile.discretionaryExpenses * retirementAdjustment * Math.pow(1 + inflationRate, i),
        healthcareCosts,
        inflationAdjusted: expenses * retirementAdjustment,
        totalExpenses: expenses * retirementAdjustment + healthcareCosts
      });
    }

    return projection;
  }

  private projectNetWorth(profile: LifeProfile, events: LifeEvent[], years: number): LifeProjection['netWorthProjection'] {
    const projection: LifeProjection['netWorthProjection'] = [];
    const currentYear = new Date().getFullYear();
    let investments = profile.liquidAssets;
    let realEstate = profile.illiquidAssets;
    let debt = profile.totalDebt;
    const retirementAge = profile.expectedRetirementAge || 65;

    for (let i = 0; i <= years; i++) {
      const year = currentYear + i;
      const age = profile.age + i;

      if (i > 0) {
        // Investment returns based on risk profile
        const returnRate = profile.effectiveRisk === 'very_high' ? 0.08 :
                           profile.effectiveRisk === 'high' ? 0.07 :
                           profile.effectiveRisk === 'moderate' ? 0.06 :
                           profile.effectiveRisk === 'low' ? 0.05 : 0.04;

        investments *= (1 + returnRate);

        // Savings/drawdown
        if (age < retirementAge) {
          const savingsRate = (profile.annualIncome - profile.annualExpenses) * 0.6;
          investments += savingsRate;
        } else {
          // 4% withdrawal rule
          const withdrawal = investments * 0.04;
          investments -= withdrawal;
        }

        // Real estate appreciation
        realEstate *= 1.03;

        // Debt paydown
        debt = Math.max(0, debt - profile.annualIncome * 0.1);
      }

      // Check for events affecting net worth
      for (const event of events) {
        if (event.date.getFullYear() === year) {
          if (event.financialImpact.oneTimeInflow) {
            investments += event.financialImpact.oneTimeInflow;
          }
          if (event.financialImpact.oneTimeOutflow) {
            investments -= event.financialImpact.oneTimeOutflow;
          }
        }
      }

      projection.push({
        year,
        age,
        investments,
        realEstate,
        other: investments * 0.05, // 5% in other assets
        debt,
        netWorth: investments + realEstate + (investments * 0.05) - debt
      });
    }

    return projection;
  }

  private identifyMilestones(profile: LifeProfile, events: LifeEvent[]): LifeProjection['milestones'] {
    const milestones: LifeProjection['milestones'] = [];
    const currentYear = new Date().getFullYear();
    const retirementAge = profile.expectedRetirementAge || 65;

    // Add retirement milestone
    milestones.push({
      year: currentYear + (retirementAge - profile.age),
      age: retirementAge,
      event: 'Retirement',
      financialImpact: 'Transition from accumulation to decumulation phase'
    });

    // Add Social Security milestone
    milestones.push({
      year: currentYear + (67 - profile.age),
      age: 67,
      event: 'Social Security Full Benefits',
      financialImpact: 'Additional income stream begins'
    });

    // Add milestones from life events
    for (const event of events) {
      if (event.status === 'planned' || event.status === 'upcoming') {
        milestones.push({
          year: event.date.getFullYear(),
          age: profile.age + (event.date.getFullYear() - currentYear),
          event: event.name,
          financialImpact: event.description || 'Financial adjustment required'
        });
      }
    }

    // Sort by year
    return milestones.sort((a, b) => a.year - b.year);
  }

  private generateScenarios(profile: LifeProfile): LifeProjection['scenarios'] {
    return [
      {
        name: 'Base Case',
        description: 'Assumes steady income growth, normal market returns, and planned events occur as scheduled',
        probability: 50,
        impactOnPlan: 'neutral',
        adjustedOutcome: profile.netWorth * 3
      },
      {
        name: 'Bull Market',
        description: 'Higher than expected investment returns (10%+ annually)',
        probability: 20,
        impactOnPlan: 'positive',
        adjustedOutcome: profile.netWorth * 4.5
      },
      {
        name: 'Bear Market',
        description: 'Lower investment returns with prolonged downturn',
        probability: 15,
        impactOnPlan: 'negative',
        adjustedOutcome: profile.netWorth * 2
      },
      {
        name: 'Early Retirement',
        description: 'Forced early retirement due to health or job loss',
        probability: 10,
        impactOnPlan: 'negative',
        adjustedOutcome: profile.netWorth * 1.5
      },
      {
        name: 'Longevity',
        description: 'Living significantly longer than average (95+)',
        probability: 5,
        impactOnPlan: 'severe',
        adjustedOutcome: profile.netWorth * 1.2
      }
    ];
  }

  private calculateSuccessProbability(profile: LifeProfile): number {
    // Simplified Monte Carlo result
    // In production, would run actual simulations
    let probability = 80; // Start with base probability

    // Adjust based on savings rate
    const savingsRate = (profile.annualIncome - profile.annualExpenses) / profile.annualIncome;
    if (savingsRate > 0.2) probability += 10;
    else if (savingsRate < 0.1) probability -= 15;

    // Adjust based on net worth relative to income
    const yearsOfIncome = profile.netWorth / profile.annualIncome;
    if (yearsOfIncome > 10) probability += 10;
    else if (yearsOfIncome < 2) probability -= 10;

    // Adjust based on years to retirement
    const yearsToRetirement = (profile.expectedRetirementAge || 65) - profile.age;
    if (yearsToRetirement > 20) probability += 5;
    else if (yearsToRetirement < 5) probability -= 10;

    return Math.max(10, Math.min(95, probability));
  }

  private calculateLongevityRisk(profile: LifeProfile): number {
    // Risk of outliving money
    let risk = 30; // Base risk

    // Lower savings = higher risk
    const savingsRate = (profile.annualIncome - profile.annualExpenses) / profile.annualIncome;
    if (savingsRate < 0.1) risk += 20;

    // Less time to retirement = higher risk
    const yearsToRetirement = (profile.expectedRetirementAge || 65) - profile.age;
    if (yearsToRetirement < 10) risk += 15;

    // Female = higher longevity risk (live longer)
    if (profile.gender === 'female') risk += 10;

    return Math.max(10, Math.min(90, risk));
  }

  private calculateSequenceRisk(profile: LifeProfile): number {
    // Risk of bad returns early in retirement
    let risk = 25;

    const yearsToRetirement = (profile.expectedRetirementAge || 65) - profile.age;

    // Higher risk if close to retirement
    if (yearsToRetirement < 5) risk += 20;
    else if (yearsToRetirement < 10) risk += 10;

    // Higher risk if aggressive allocation near retirement
    if (profile.effectiveRisk === 'very_high' && yearsToRetirement < 10) risk += 15;
    if (profile.effectiveRisk === 'high' && yearsToRetirement < 10) risk += 10;

    return Math.max(10, Math.min(80, risk));
  }

  // ==========================================================================
  // LIFE-AWARE ALLOCATION
  // ==========================================================================

  public async generateLifeAwareAllocation(userId: string): Promise<LifeAwareAllocation> {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error(`Profile not found: ${userId}`);

    const userEvents = this.events.get(userId) || [];

    const allocation: LifeAwareAllocation = {
      userId,
      asOfDate: new Date(),
      lifeStage: profile.currentLifeStage,
      derivedFromProfile: true,
      targetAllocation: this.calculateTargetAllocation(profile),
      glidePath: this.generateGlidePath(profile),
      eventAdjustments: this.calculateEventAdjustments(profile, userEvents),
      incomeNeeds: this.calculateIncomeNeeds(profile),
      reserves: this.calculateReserves(profile),
      recommendations: this.generateAllocationRecommendations(profile, userEvents)
    };

    this.allocations.set(userId, allocation);
    this.emit('allocationGenerated', { userId, allocation });

    return allocation;
  }

  private calculateTargetAllocation(profile: LifeProfile): LifeAwareAllocation['targetAllocation'] {
    // Base allocation by life stage
    const baseAllocations: Record<LifeStage, { equity: number; fixedIncome: number; alternatives: number; cash: number }> = {
      'early_career': { equity: 90, fixedIncome: 5, alternatives: 0, cash: 5 },
      'career_growth': { equity: 80, fixedIncome: 10, alternatives: 5, cash: 5 },
      'peak_earning': { equity: 70, fixedIncome: 15, alternatives: 10, cash: 5 },
      'pre_retirement': { equity: 55, fixedIncome: 30, alternatives: 10, cash: 5 },
      'early_retirement': { equity: 45, fixedIncome: 40, alternatives: 5, cash: 10 },
      'late_retirement': { equity: 35, fixedIncome: 50, alternatives: 0, cash: 15 },
      'legacy_planning': { equity: 30, fixedIncome: 50, alternatives: 5, cash: 15 }
    };

    const base = baseAllocations[profile.currentLifeStage];

    // Adjust based on effective risk profile
    const riskAdjustment = {
      'very_high': 15,
      'high': 7,
      'moderate': 0,
      'low': -10,
      'very_low': -20
    }[profile.effectiveRisk];

    return [
      {
        assetClass: 'Equity',
        percent: Math.max(10, Math.min(95, base.equity + riskAdjustment)),
        reasoning: `Based on ${profile.currentLifeStage} life stage with ${profile.effectiveRisk} risk profile`
      },
      {
        assetClass: 'Fixed Income',
        percent: Math.max(5, base.fixedIncome - riskAdjustment * 0.5),
        reasoning: 'Provides stability and income'
      },
      {
        assetClass: 'Alternatives',
        percent: Math.max(0, base.alternatives),
        reasoning: 'Diversification and inflation hedge'
      },
      {
        assetClass: 'Cash',
        percent: Math.max(5, base.cash),
        reasoning: 'Liquidity and opportunity fund'
      }
    ];
  }

  private generateGlidePath(profile: LifeProfile): LifeAwareAllocation['glidePath'] {
    const glidePath: LifeAwareAllocation['glidePath'] = [];
    const currentYear = new Date().getFullYear();
    const retirementAge = profile.expectedRetirementAge || 65;
    const years = Math.max(30, retirementAge - profile.age + 20);

    for (let i = 0; i <= years; i += 5) {
      const age = profile.age + i;

      // Gradual shift from equity to fixed income
      const yearsToRetirement = Math.max(0, retirementAge - age);
      const equityTarget = Math.max(25, 100 - (age - 25) * 1.2);
      const fixedIncomeTarget = 100 - equityTarget - 5 - 5;

      glidePath.push({
        year: currentYear + i,
        age,
        equity: Math.round(equityTarget),
        fixedIncome: Math.round(Math.max(5, fixedIncomeTarget)),
        alternatives: 5,
        cash: age >= retirementAge ? 15 : 5
      });
    }

    return glidePath;
  }

  private calculateEventAdjustments(profile: LifeProfile, events: LifeEvent[]): LifeAwareAllocation['eventAdjustments'] {
    const adjustments: LifeAwareAllocation['eventAdjustments'] = [];

    for (const event of events) {
      if (event.strategyAdjustments.allocationChange) {
        adjustments.push({
          eventId: event.id,
          eventName: event.name,
          adjustment: event.strategyAdjustments.allocationChange,
          reasoning: `Adjustment due to: ${event.description || event.name}`
        });
      }

      // Auto-generate adjustments for common events
      if (!event.strategyAdjustments.allocationChange) {
        const autoAdjustment = this.generateAutoAdjustment(event);
        if (autoAdjustment) {
          adjustments.push({
            eventId: event.id,
            eventName: event.name,
            adjustment: autoAdjustment,
            reasoning: `Automatic adjustment for ${event.type} event`
          });
        }
      }
    }

    return adjustments;
  }

  private generateAutoAdjustment(event: LifeEvent): { assetClass: string; changePercent: number }[] | null {
    switch (event.type) {
      case 'home_purchase':
        return [
          { assetClass: 'Cash', changePercent: 10 },
          { assetClass: 'Equity', changePercent: -10 }
        ];
      case 'child_birth':
        return [
          { assetClass: 'Fixed Income', changePercent: 5 },
          { assetClass: 'Equity', changePercent: -5 }
        ];
      case 'retirement':
        return [
          { assetClass: 'Fixed Income', changePercent: 15 },
          { assetClass: 'Equity', changePercent: -15 }
        ];
      case 'inheritance':
        return [
          { assetClass: 'Alternatives', changePercent: 5 },
          { assetClass: 'Cash', changePercent: 5 }
        ];
      default:
        return null;
    }
  }

  private calculateIncomeNeeds(profile: LifeProfile): LifeAwareAllocation['incomeNeeds'] {
    const currentMonthlyExpenses = profile.annualExpenses / 12;
    const retirementMonthlyNeed = currentMonthlyExpenses * 0.8; // 80% replacement ratio
    const currentInvestmentIncome = profile.netWorth * 0.04 / 12; // 4% rule
    const gap = retirementMonthlyNeed - currentInvestmentIncome;

    return {
      immediate: profile.employmentStatus === 'retired' ? currentMonthlyExpenses : 0,
      future: retirementMonthlyNeed,
      gap: Math.max(0, gap),
      strategy: gap > 0
        ? 'Build income-generating portfolio to close gap'
        : 'Income needs covered by current portfolio'
    };
  }

  private calculateReserves(profile: LifeProfile): LifeAwareAllocation['reserves'] {
    const monthlyExpenses = profile.annualExpenses / 12;

    return {
      emergencyFundTarget: monthlyExpenses * (profile.incomeStability === 'volatile' ? 12 : 6),
      emergencyFundCurrent: profile.liquidAssets * 0.2, // Assume 20% is emergency fund
      opportunityReserve: profile.annualIncome * 0.1,
      largePurchaseReserve: 0,
      healthcareReserve: profile.age > 60 ? profile.annualIncome * 0.5 : profile.annualIncome * 0.1
    };
  }

  private generateAllocationRecommendations(profile: LifeProfile, events: LifeEvent[]): LifeAwareAllocation['recommendations'] {
    const recommendations: LifeAwareAllocation['recommendations'] = [];

    // Check emergency fund
    const reserves = this.calculateReserves(profile);
    if (reserves.emergencyFundCurrent < reserves.emergencyFundTarget * 0.5) {
      recommendations.push({
        priority: 1,
        category: 'Emergency Fund',
        action: 'Build emergency fund to target level',
        reasoning: `Current: $${reserves.emergencyFundCurrent.toLocaleString()}, Target: $${reserves.emergencyFundTarget.toLocaleString()}`,
        impact: 'Reduces financial vulnerability'
      });
    }

    // Check debt levels
    if (profile.debtServiceRatio > 0.35) {
      recommendations.push({
        priority: 2,
        category: 'Debt Management',
        action: 'Reduce debt service ratio below 35%',
        reasoning: `Current ratio: ${(profile.debtServiceRatio * 100).toFixed(1)}%`,
        impact: 'Improves financial flexibility and risk capacity'
      });
    }

    // Check insurance gaps
    if (!profile.hasLifeInsurance && profile.dependents > 0) {
      recommendations.push({
        priority: 3,
        category: 'Insurance',
        action: 'Obtain life insurance coverage',
        reasoning: `${profile.dependents} dependent(s) without life insurance protection`,
        impact: 'Protects family from income loss'
      });
    }

    // Check retirement savings
    const yearsToRetirement = (profile.expectedRetirementAge || 65) - profile.age;
    const targetRetirementSavings = profile.annualIncome * 10;
    if (profile.netWorth < targetRetirementSavings && yearsToRetirement < 15) {
      recommendations.push({
        priority: 4,
        category: 'Retirement',
        action: 'Increase retirement savings rate',
        reasoning: `${yearsToRetirement} years to retirement with below-target savings`,
        impact: 'Improves retirement readiness'
      });
    }

    // Check estate planning
    if (profile.netWorth > 1000000 && !profile.hasWill) {
      recommendations.push({
        priority: 5,
        category: 'Estate Planning',
        action: 'Create estate plan',
        reasoning: 'Significant assets without estate documentation',
        impact: 'Ensures orderly wealth transfer'
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  // ==========================================================================
  // TAX STRATEGY
  // ==========================================================================

  public async generateTaxStrategy(userId: string): Promise<TaxStrategy> {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error(`Profile not found: ${userId}`);

    const taxYear = new Date().getFullYear();
    const strategy: TaxStrategy = {
      userId,
      taxYear,
      filingStatus: profile.maritalStatus === 'married' ? 'married_filing_jointly' : 'single',
      taxBracket: this.determineTaxBracket(profile),
      effectiveTaxRate: this.calculateEffectiveTaxRate(profile),
      marginalTaxRate: this.determineMarginalRate(profile),
      stateTaxRate: 0.05, // Would be state-specific
      strategies: this.generateTaxStrategies(profile),
      accountStrategy: this.generateAccountStrategy(profile),
      harvestingOpportunities: this.identifyHarvestingOpportunities(profile)
    };

    // Add RMD strategy if applicable
    if (profile.age >= 72) {
      strategy.rmdStrategy = {
        year: taxYear,
        requiredAmount: profile.netWorth * 0.04, // Simplified
        strategy: 'Distribute RMD early in year to maximize growth on remaining balance',
        qcdOpportunity: Math.min(100000, profile.netWorth * 0.01)
      };
    }

    this.taxStrategies.set(userId, strategy);
    this.emit('taxStrategyGenerated', { userId, strategy });

    return strategy;
  }

  private determineTaxBracket(profile: LifeProfile): number {
    const income = profile.annualIncome;
    const brackets = [
      { min: 0, max: 11000, rate: 10 },
      { min: 11001, max: 44725, rate: 12 },
      { min: 44726, max: 95375, rate: 22 },
      { min: 95376, max: 183250, rate: 24 },
      { min: 183251, max: 364200, rate: 32 },
      { min: 364201, max: 462500, rate: 35 },
      { min: 462501, max: Infinity, rate: 37 }
    ];

    for (const bracket of brackets) {
      if (income >= bracket.min && income <= bracket.max) {
        return bracket.rate;
      }
    }
    return 37;
  }

  private calculateEffectiveTaxRate(profile: LifeProfile): number {
    // Simplified effective rate calculation
    const marginalRate = this.determineMarginalRate(profile);
    return marginalRate * 0.7; // Effective is typically lower due to deductions
  }

  private determineMarginalRate(profile: LifeProfile): number {
    return this.determineTaxBracket(profile) / 100;
  }

  private generateTaxStrategies(profile: LifeProfile): TaxStrategy['strategies'] {
    const strategies: TaxStrategy['strategies'] = [];

    // 401(k) contributions
    if (profile.annualIncome > 50000) {
      strategies.push({
        name: 'Maximize 401(k) Contributions',
        description: 'Contribute maximum to employer 401(k) for tax-deferred growth',
        potentialSavings: 22500 * this.determineMarginalRate(profile),
        implementationSteps: [
          'Review current contribution rate',
          'Increase to maximum allowable ($22,500 for 2024)',
          'Add catch-up contributions if over 50 ($7,500)'
        ],
        deadline: new Date(new Date().getFullYear(), 11, 31),
        complexity: 'low'
      });
    }

    // HSA if eligible
    strategies.push({
      name: 'Health Savings Account',
      description: 'Triple tax-advantaged savings for healthcare',
      potentialSavings: 3850 * this.determineMarginalRate(profile),
      implementationSteps: [
        'Verify high-deductible health plan eligibility',
        'Open or fund HSA account',
        'Contribute maximum ($3,850 individual / $7,750 family)'
      ],
      complexity: 'medium'
    });

    // Charitable giving for high earners
    if (profile.annualIncome > 200000) {
      strategies.push({
        name: 'Donor-Advised Fund',
        description: 'Bunch charitable donations for maximum deduction',
        potentialSavings: profile.annualIncome * 0.05 * this.determineMarginalRate(profile),
        implementationSteps: [
          'Open donor-advised fund',
          'Contribute appreciated securities',
          'Take itemized deduction this year',
          'Distribute grants to charities over time'
        ],
        complexity: 'medium'
      });
    }

    // Roth conversion in low-income years
    if (profile.annualIncome < 100000 || profile.employmentStatus === 'retired') {
      strategies.push({
        name: 'Roth Conversion',
        description: 'Convert traditional IRA to Roth in lower-income year',
        potentialSavings: 10000 * 0.1, // Future tax savings estimate
        implementationSteps: [
          'Calculate optimal conversion amount',
          'Consider filling current tax bracket',
          'Process conversion before year-end',
          'Pay taxes from non-retirement funds'
        ],
        complexity: 'high'
      });
    }

    return strategies;
  }

  private generateAccountStrategy(profile: LifeProfile): TaxStrategy['accountStrategy'] {
    const strategy: TaxStrategy['accountStrategy'] = [];

    // 401(k)
    strategy.push({
      accountType: '401(k)',
      currentBalance: profile.netWorth * 0.4,
      targetContribution: 22500,
      taxAdvantage: 'Pre-tax contributions, tax-deferred growth',
      priority: 1
    });

    // HSA
    strategy.push({
      accountType: 'HSA',
      currentBalance: profile.netWorth * 0.02,
      targetContribution: 3850,
      taxAdvantage: 'Triple tax advantage: pre-tax, tax-free growth, tax-free withdrawal for medical',
      priority: 2
    });

    // Roth IRA
    strategy.push({
      accountType: 'Roth IRA',
      currentBalance: profile.netWorth * 0.15,
      targetContribution: 7000,
      taxAdvantage: 'After-tax contributions, tax-free growth and withdrawals',
      priority: 3
    });

    // Taxable brokerage
    strategy.push({
      accountType: 'Taxable Brokerage',
      currentBalance: profile.liquidAssets * 0.5,
      targetContribution: profile.annualIncome * 0.1,
      taxAdvantage: 'Flexibility, step-up in basis at death, tax-loss harvesting',
      priority: 4
    });

    return strategy;
  }

  private identifyHarvestingOpportunities(profile: LifeProfile): TaxStrategy['harvestingOpportunities'] {
    // Would integrate with actual portfolio data
    return [
      {
        asset: 'Sample Stock XYZ',
        unrealizedLoss: 5000,
        taxBenefit: 5000 * this.determineMarginalRate(profile),
        washSaleRisk: false,
        recommendation: 'Harvest loss and purchase similar ETF'
      }
    ];
  }

  // ==========================================================================
  // BACKGROUND PROCESSES
  // ==========================================================================

  private startLifeStageMonitor(): void {
    // Check life stage annually (or when profile changes)
    setInterval(() => {
      for (const [userId, profile] of this.profiles.entries()) {
        const currentAge = this.calculateAge(profile.birthDate);
        if (currentAge !== profile.age) {
          profile.age = currentAge;
          const newStage = this.determineLifeStage(currentAge, profile);

          if (newStage !== profile.currentLifeStage) {
            const oldStage = profile.currentLifeStage;
            profile.currentLifeStage = newStage;
            profile.currentPriorities = this.deriveNewPriorities(profile, { type: 'custom' } as LifeEvent);
            this.emit('lifeStageChanged', { userId, oldStage, newStage });
            console.log(`[LIFE] User ${userId} transitioned from ${oldStage} to ${newStage}`);
          }

          profile.updatedAt = new Date();
        }
      }
    }, 86400000); // Daily check
  }

  private startEventTriggerMonitor(): void {
    // Check for upcoming events
    setInterval(() => {
      const now = new Date();
      for (const [userId, userEvents] of this.events.entries()) {
        for (const event of userEvents) {
          const daysUntilEvent = (event.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

          if (event.status === 'planned' && daysUntilEvent <= 90 && daysUntilEvent > 30) {
            event.status = 'upcoming';
            this.emit('eventApproaching', { userId, event, daysUntil: Math.round(daysUntilEvent) });
          }

          if (event.status === 'upcoming' && daysUntilEvent <= 0) {
            event.status = 'current';
            this.emit('eventOccurring', { userId, event });
          }
        }
      }
    }, 3600000); // Hourly check
  }

  private startGoalProgressMonitor(): void {
    setInterval(() => {
      for (const [userId, userGoals] of this.goals.entries()) {
        for (const goal of userGoals) {
          if (goal.status !== 'active') continue;

          const projectedDate = this.projectGoalCompletion(goal);
          const wasOnTrack = goal.onTrack;
          goal.onTrack = projectedDate <= goal.targetDate;
          goal.projectedCompletionDate = projectedDate;

          if (wasOnTrack && !goal.onTrack) {
            this.emit('goalOffTrack', { userId, goal });
          }

          if (goal.percentComplete >= 100) {
            goal.status = 'achieved';
            this.emit('goalAchieved', { userId, goal });
          }
        }
      }
    }, 86400000); // Daily check
  }

  private startProjectionRefresher(): void {
    // Regenerate projections periodically
    setInterval(async () => {
      for (const userId of this.profiles.keys()) {
        await this.generateProjection(userId);
        await this.generateLifeAwareAllocation(userId);
      }
    }, 604800000); // Weekly
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  public getProfile(userId: string): LifeProfile | undefined {
    return this.profiles.get(userId);
  }

  public getLifeEvents(userId: string): LifeEvent[] {
    return this.events.get(userId) || [];
  }

  public getGoals(userId: string): FinancialGoal[] {
    return this.goals.get(userId) || [];
  }

  public getProjection(userId: string): LifeProjection | undefined {
    return this.projections.get(userId);
  }

  public getAllocation(userId: string): LifeAwareAllocation | undefined {
    return this.allocations.get(userId);
  }

  public getTaxStrategy(userId: string): TaxStrategy | undefined {
    return this.taxStrategies.get(userId);
  }

  public async updateGoalProgress(userId: string, goalId: string, currentAmount: number): Promise<void> {
    const userGoals = this.goals.get(userId);
    if (!userGoals) return;

    const goal = userGoals.find(g => g.id === goalId);
    if (!goal) return;

    goal.currentAmount = currentAmount;
    goal.percentComplete = (currentAmount / goal.targetAmount) * 100;
    goal.projectedCompletionDate = this.projectGoalCompletion(goal);
    goal.onTrack = goal.projectedCompletionDate <= goal.targetDate;

    this.emit('goalProgressUpdated', { userId, goal });
  }

  public getLifeSummary(userId: string): string {
    const profile = this.profiles.get(userId);
    const projection = this.projections.get(userId);
    const allocation = this.allocations.get(userId);

    if (!profile) return 'Profile not found';

    let summary = `## Life Financial Summary\n\n`;
    summary += `**Age:** ${profile.age} | **Life Stage:** ${profile.currentLifeStage}\n`;
    summary += `**Risk Profile:** ${profile.effectiveRisk}\n\n`;

    summary += `### Current Financial Snapshot\n`;
    summary += `- Net Worth: $${profile.netWorth.toLocaleString()}\n`;
    summary += `- Annual Income: $${profile.annualIncome.toLocaleString()}\n`;
    summary += `- Annual Expenses: $${profile.annualExpenses.toLocaleString()}\n`;
    summary += `- Savings Rate: ${(((profile.annualIncome - profile.annualExpenses) / profile.annualIncome) * 100).toFixed(1)}%\n\n`;

    if (projection) {
      summary += `### Retirement Outlook\n`;
      summary += `- Success Probability: ${projection.retirementSuccessProbability}%\n`;
      summary += `- Longevity Risk: ${projection.longevityRisk}%\n`;
      summary += `- Years to Retirement: ${(profile.expectedRetirementAge || 65) - profile.age}\n\n`;
    }

    if (allocation) {
      summary += `### Recommended Allocation\n`;
      for (const alloc of allocation.targetAllocation) {
        summary += `- ${alloc.assetClass}: ${alloc.percent}%\n`;
      }
      summary += `\n`;

      if (allocation.recommendations.length > 0) {
        summary += `### Top Recommendations\n`;
        for (const rec of allocation.recommendations.slice(0, 3)) {
          summary += `${rec.priority}. **${rec.category}**: ${rec.action}\n`;
        }
      }
    }

    return summary;
  }
}

// Export singleton instance
export const lifeTimelineEngine = LifeTimelineEngine.getInstance();

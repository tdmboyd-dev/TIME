/**
 * TIME Dynasty Trust Engine
 *
 * Advanced wealth preservation and multi-generational transfer strategies:
 * - Dynasty Trust planning and automation
 * - Gift tax optimization ($19,000/person annual exclusion 2025)
 * - Estate exemption tracking ($13.99M per person 2025)
 * - Grantor Retained Annuity Trust (GRAT) modeling
 * - Family Limited Partnership (FLP) analysis
 * - Charitable Lead Trust (CLT) optimization
 * - Irrevocable Life Insurance Trust (ILIT) planning
 * - Generation-Skipping Transfer (GST) strategies
 *
 * Based on research from:
 * - Ultra HNW family office strategies
 * - Dynasty trust jurisdictions (South Dakota, Nevada, Delaware)
 * - IRS guidelines and tax code
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('DynastyTrustEngine');

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type TrustType =
  | 'dynasty_trust'
  | 'grat'
  | 'clat'
  | 'crt'
  | 'ilit'
  | 'flp'
  | 'qprt'
  | 'slat'
  | 'idgt';

export type TrustJurisdiction =
  | 'south_dakota'
  | 'nevada'
  | 'delaware'
  | 'alaska'
  | 'wyoming'
  | 'other';

export interface TrustRecommendation {
  id: string;
  type: TrustType;
  name: string;
  description: string;
  benefits: string[];
  taxSavings: number;
  implementationCost: number;
  timeToImplement: string;
  jurisdiction: TrustJurisdiction;
  suitabilityScore: number; // 0-100
  minNetWorth: number;
  annualMaintenance: number;
  keyFeatures: string[];
}

export interface GiftingStrategy {
  id: string;
  name: string;
  annualLimit: number;
  lifetimeLimit: number;
  recipients: number;
  totalAnnualGifts: number;
  taxSavings: number;
  timing: 'now' | 'year_end' | 'multi_year';
  assets: Array<{
    type: string;
    value: number;
    growthPotential: string;
  }>;
}

export interface EstateProjection {
  currentNetWorth: number;
  projectedAtDeath: number;
  estateExemption: number;
  taxableEstate: number;
  estimatedTax: number;
  effectiveTaxRate: number;
  strategies: Array<{
    name: string;
    taxReduction: number;
    implementationCost: number;
    netBenefit: number;
  }>;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: 'spouse' | 'child' | 'grandchild' | 'sibling' | 'other';
  age: number;
  trustBeneficiary: boolean;
  annualGiftReceived: number;
  lifetimeGiftReceived: number;
  educationFundNeeds?: number;
  specialNeeds?: boolean;
}

export interface WealthTransferPlan {
  id: string;
  userId: string;
  name: string;
  currentNetWorth: number;
  targetLegacyAmount: number;
  timeHorizon: number; // years
  familyMembers: FamilyMember[];
  trusts: TrustRecommendation[];
  giftingStrategies: GiftingStrategy[];
  estateProjection: EstateProjection;
  charityGoals: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 2025 TAX CONSTANTS
// ============================================================

const TAX_CONSTANTS_2025 = {
  annualGiftExclusion: 19000, // Per person
  lifetimeEstateExemption: 13990000, // Per person ($13.99M)
  marriedExemption: 27980000, // Portability ($27.98M)
  gstExemption: 13990000, // Generation-Skipping Transfer
  estateTaxRate: 0.40, // 40% top rate
  giftTaxRate: 0.40,
  gstTaxRate: 0.40,
  afr: {
    // Applicable Federal Rates (example, varies monthly)
    shortTerm: 4.85,
    midTerm: 4.52,
    longTerm: 4.75,
    section7520Rate: 5.2, // For CRTs, GRATs
  },
  // Dynasty trust favorable jurisdictions
  dynastyJurisdictions: ['south_dakota', 'nevada', 'delaware', 'alaska', 'wyoming'],
};

// ============================================================
// DYNASTY TRUST ENGINE
// ============================================================

class DynastyTrustEngine extends EventEmitter {
  private plans: Map<string, WealthTransferPlan> = new Map();

  constructor() {
    super();
    logger.info('Dynasty Trust Engine initialized with 2025 tax constants');
  }

  // ============================================================
  // TRUST ANALYSIS
  // ============================================================

  /**
   * Analyze optimal trust structures for a given wealth profile
   */
  analyzeTrustOptions(
    netWorth: number,
    familySize: number,
    goals: {
      charityGoal?: number;
      businessOwner?: boolean;
      realEstateHeavy?: boolean;
      liquidityNeeds?: 'low' | 'medium' | 'high';
      controlPreference?: 'high' | 'medium' | 'low';
    }
  ): TrustRecommendation[] {
    const recommendations: TrustRecommendation[] = [];

    // Dynasty Trust - for ultra-wealthy
    if (netWorth >= 10000000) {
      recommendations.push({
        id: uuidv4(),
        type: 'dynasty_trust',
        name: 'Dynasty Trust',
        description:
          'Multi-generational wealth transfer vehicle that can last perpetually in favorable jurisdictions',
        benefits: [
          'Avoids estate tax at each generation',
          'Asset protection from creditors',
          'Perpetual duration (SD, NV, DE)',
          'Professional trustee management',
          'GST tax efficiency',
        ],
        taxSavings: netWorth * 0.4 * 0.6, // 40% estate tax avoided on 60% of assets
        implementationCost: 50000,
        timeToImplement: '3-6 months',
        jurisdiction: 'south_dakota',
        suitabilityScore: netWorth >= 25000000 ? 95 : netWorth >= 10000000 ? 85 : 70,
        minNetWorth: 10000000,
        annualMaintenance: 5000,
        keyFeatures: [
          'No rule against perpetuities',
          'Asset protection after 2 years',
          'No state income tax',
          'Privacy protections',
        ],
      });
    }

    // GRAT - for appreciating assets
    if (netWorth >= 2000000) {
      const gratAssetValue = Math.min(netWorth * 0.3, 10000000);
      const expectedGrowth = 0.08; // 8% assumed growth
      const gratTerm = 2;
      const taxSavings =
        gratAssetValue *
        Math.pow(1 + expectedGrowth, gratTerm) *
        0.4 -
        gratAssetValue * 0.4;

      recommendations.push({
        id: uuidv4(),
        type: 'grat',
        name: 'Grantor Retained Annuity Trust (GRAT)',
        description:
          'Transfer appreciation above IRS rate to heirs gift-tax free using zeroed-out GRAT',
        benefits: [
          'Freeze asset value for gift tax',
          'Transfer appreciation tax-free',
          'Retained annuity payments',
          'Low interest rate environment favorable',
          'Can be rolled/cascaded',
        ],
        taxSavings,
        implementationCost: 15000,
        timeToImplement: '1-2 months',
        jurisdiction: 'other',
        suitabilityScore: 85,
        minNetWorth: 2000000,
        annualMaintenance: 2000,
        keyFeatures: [
          `Current 7520 rate: ${TAX_CONSTANTS_2025.afr.section7520Rate}%`,
          'Best for high-growth assets',
          'Can be structured as zeroed-out',
          'Rolling GRAT strategy available',
        ],
      });
    }

    // ILIT - for life insurance
    if (netWorth >= 5000000) {
      const insuranceAmount = Math.min(netWorth * 0.5, 20000000);
      const taxSavings = insuranceAmount * 0.4;

      recommendations.push({
        id: uuidv4(),
        type: 'ilit',
        name: 'Irrevocable Life Insurance Trust (ILIT)',
        description:
          'Remove life insurance proceeds from taxable estate while providing liquidity for estate taxes',
        benefits: [
          'Death benefit excluded from estate',
          'Provides estate tax liquidity',
          'Asset protection',
          'Can fund with annual exclusion gifts',
          'Second-to-die policies for married couples',
        ],
        taxSavings,
        implementationCost: 10000,
        timeToImplement: '1-2 months',
        jurisdiction: 'other',
        suitabilityScore: netWorth >= 13990000 ? 95 : 80,
        minNetWorth: 5000000,
        annualMaintenance: 1500,
        keyFeatures: [
          'Crummey powers for gift tax exclusion',
          '3-year lookback rule',
          'Premium payment strategies',
        ],
      });
    }

    // SLAT - for married couples
    if (netWorth >= 5000000) {
      recommendations.push({
        id: uuidv4(),
        type: 'slat',
        name: 'Spousal Lifetime Access Trust (SLAT)',
        description:
          'Use lifetime exemption while maintaining indirect access to assets through spouse beneficiary',
        benefits: [
          'Uses lifetime exemption now',
          'Spouse is beneficiary (indirect access)',
          'Growth removed from estate',
          'Asset protection',
          'Hedge against lower future exemptions',
        ],
        taxSavings: Math.min(netWorth * 0.4, TAX_CONSTANTS_2025.lifetimeEstateExemption * 0.4),
        implementationCost: 20000,
        timeToImplement: '2-3 months',
        jurisdiction: 'other',
        suitabilityScore: 90,
        minNetWorth: 5000000,
        annualMaintenance: 2000,
        keyFeatures: [
          'Must avoid reciprocal trust doctrine',
          'Ideal before exemption sunset in 2026',
          'Can include ascertainable standards',
        ],
      });
    }

    // FLP - for business owners
    if (goals.businessOwner || goals.realEstateHeavy) {
      const discountRate = 0.35; // 35% valuation discount
      const assetValue = netWorth * 0.5;
      const taxSavings = assetValue * discountRate * 0.4;

      recommendations.push({
        id: uuidv4(),
        type: 'flp',
        name: 'Family Limited Partnership (FLP)',
        description:
          'Business succession planning with valuation discounts for lack of marketability and control',
        benefits: [
          'Valuation discounts (25-40%)',
          'Centralized management',
          'Asset protection',
          'Business succession planning',
          'Income splitting',
        ],
        taxSavings,
        implementationCost: 25000,
        timeToImplement: '3-4 months',
        jurisdiction: 'other',
        suitabilityScore: 85,
        minNetWorth: 3000000,
        annualMaintenance: 3000,
        keyFeatures: [
          'Legitimate business purpose required',
          'Proper formalities essential',
          'Annual valuations recommended',
        ],
      });
    }

    // Charitable strategies
    if (goals.charityGoal && goals.charityGoal >= 100000) {
      recommendations.push({
        id: uuidv4(),
        type: 'clat',
        name: 'Charitable Lead Annuity Trust (CLAT)',
        description:
          'Front-load charitable giving for tax deduction, remainder to heirs',
        benefits: [
          'Immediate income tax deduction',
          'Transfer remainder to heirs at reduced tax',
          'Support charity during lifetime',
          'Best in low-rate environment',
        ],
        taxSavings: goals.charityGoal * 0.4,
        implementationCost: 15000,
        timeToImplement: '2-3 months',
        jurisdiction: 'other',
        suitabilityScore: 80,
        minNetWorth: 2000000,
        annualMaintenance: 3000,
        keyFeatures: [
          'Zeroed-out CLAT possible',
          'Can be grantor or non-grantor',
          'Flexible term lengths',
        ],
      });
    }

    // Sort by suitability score
    return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }

  // ============================================================
  // GIFTING STRATEGIES
  // ============================================================

  /**
   * Generate optimal annual gifting plan
   */
  generateGiftingPlan(
    availableCash: number,
    familyMembers: FamilyMember[],
    assetsForGifting: Array<{ type: string; value: number; growthRate: number }>
  ): GiftingStrategy[] {
    const strategies: GiftingStrategy[] = [];

    // Annual exclusion gifting
    const eligibleRecipients = familyMembers.length;
    const maxAnnualGifts = eligibleRecipients * TAX_CONSTANTS_2025.annualGiftExclusion;

    strategies.push({
      id: uuidv4(),
      name: 'Annual Exclusion Gifts',
      annualLimit: TAX_CONSTANTS_2025.annualGiftExclusion,
      lifetimeLimit: Infinity,
      recipients: eligibleRecipients,
      totalAnnualGifts: Math.min(availableCash, maxAnnualGifts),
      taxSavings: Math.min(availableCash, maxAnnualGifts) * 0.4,
      timing: 'year_end',
      assets: [
        {
          type: 'Cash',
          value: Math.min(availableCash, maxAnnualGifts),
          growthPotential: 'Low',
        },
      ],
    });

    // 529 superfunding (5-year election)
    const childrenAndGrandchildren = familyMembers.filter(
      (m) => m.relationship === 'child' || m.relationship === 'grandchild'
    );
    if (childrenAndGrandchildren.length > 0) {
      const superfundAmount = TAX_CONSTANTS_2025.annualGiftExclusion * 5;
      strategies.push({
        id: uuidv4(),
        name: '529 Plan Superfunding',
        annualLimit: superfundAmount,
        lifetimeLimit: superfundAmount * childrenAndGrandchildren.length,
        recipients: childrenAndGrandchildren.length,
        totalAnnualGifts: superfundAmount * childrenAndGrandchildren.length,
        taxSavings: superfundAmount * childrenAndGrandchildren.length * 0.4 * 0.5,
        timing: 'now',
        assets: [
          {
            type: '529 Education Savings',
            value: superfundAmount * childrenAndGrandchildren.length,
            growthPotential: 'Tax-free growth',
          },
        ],
      });
    }

    // High-growth asset gifting
    const highGrowthAssets = assetsForGifting.filter((a) => a.growthRate > 0.1);
    for (const asset of highGrowthAssets) {
      strategies.push({
        id: uuidv4(),
        name: `High-Growth Asset Gift: ${asset.type}`,
        annualLimit: asset.value,
        lifetimeLimit: TAX_CONSTANTS_2025.lifetimeEstateExemption,
        recipients: 1,
        totalAnnualGifts: asset.value,
        taxSavings: asset.value * Math.pow(1 + asset.growthRate, 10) * 0.4,
        timing: 'now',
        assets: [
          {
            type: asset.type,
            value: asset.value,
            growthPotential: `${(asset.growthRate * 100).toFixed(0)}% annual`,
          },
        ],
      });
    }

    return strategies;
  }

  // ============================================================
  // ESTATE PROJECTION
  // ============================================================

  /**
   * Project estate tax liability and optimization opportunities
   */
  projectEstateTax(
    currentNetWorth: number,
    age: number,
    married: boolean,
    growthRate: number = 0.06,
    spendingRate: number = 0.03
  ): EstateProjection {
    // Life expectancy estimate
    const yearsToProjection = Math.max(30, 95 - age);
    const netGrowthRate = growthRate - spendingRate;
    const projectedAtDeath = currentNetWorth * Math.pow(1 + netGrowthRate, yearsToProjection);

    // Exemption to use
    const exemption = married
      ? TAX_CONSTANTS_2025.marriedExemption
      : TAX_CONSTANTS_2025.lifetimeEstateExemption;

    const taxableEstate = Math.max(0, projectedAtDeath - exemption);
    const estimatedTax = taxableEstate * TAX_CONSTANTS_2025.estateTaxRate;
    const effectiveTaxRate =
      projectedAtDeath > 0 ? estimatedTax / projectedAtDeath : 0;

    // Calculate strategy benefits
    const strategies = [];

    // Dynasty trust benefit
    if (projectedAtDeath > exemption) {
      const dynastyAmount = projectedAtDeath * 0.5;
      strategies.push({
        name: 'Dynasty Trust',
        taxReduction: dynastyAmount * 0.4,
        implementationCost: 50000,
        netBenefit: dynastyAmount * 0.4 - 50000,
      });
    }

    // SLAT benefit
    if (married && currentNetWorth > 5000000) {
      strategies.push({
        name: 'SLAT (Use Exemption Now)',
        taxReduction: exemption * 0.4 * 0.3, // 30% of growth savings
        implementationCost: 20000,
        netBenefit: exemption * 0.4 * 0.3 - 20000,
      });
    }

    // Annual gifting benefit
    const annualGiftingSavings =
      TAX_CONSTANTS_2025.annualGiftExclusion *
      10 * // 10 recipients
      yearsToProjection *
      Math.pow(1 + growthRate, yearsToProjection / 2) *
      0.4;
    strategies.push({
      name: 'Aggressive Annual Gifting',
      taxReduction: annualGiftingSavings,
      implementationCost: 0,
      netBenefit: annualGiftingSavings,
    });

    return {
      currentNetWorth,
      projectedAtDeath,
      estateExemption: exemption,
      taxableEstate,
      estimatedTax,
      effectiveTaxRate,
      strategies,
    };
  }

  // ============================================================
  // WEALTH TRANSFER PLAN
  // ============================================================

  /**
   * Create comprehensive wealth transfer plan
   */
  createWealthTransferPlan(
    userId: string,
    name: string,
    netWorth: number,
    age: number,
    married: boolean,
    familyMembers: FamilyMember[],
    goals: {
      charityGoal?: number;
      businessOwner?: boolean;
      realEstateHeavy?: boolean;
      targetLegacyAmount?: number;
    }
  ): WealthTransferPlan {
    // Analyze trust options
    const trusts = this.analyzeTrustOptions(netWorth, familyMembers.length, goals);

    // Generate gifting plan
    const giftingStrategies = this.generateGiftingPlan(
      netWorth * 0.1, // 10% available for gifting
      familyMembers,
      []
    );

    // Project estate
    const estateProjection = this.projectEstateTax(netWorth, age, married);

    const plan: WealthTransferPlan = {
      id: uuidv4(),
      userId,
      name,
      currentNetWorth: netWorth,
      targetLegacyAmount: goals.targetLegacyAmount || netWorth * 0.8,
      timeHorizon: Math.max(20, 95 - age),
      familyMembers,
      trusts,
      giftingStrategies,
      estateProjection,
      charityGoals: goals.charityGoal || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.plans.set(plan.id, plan);
    this.emit('plan:created', plan);

    logger.info('Wealth transfer plan created', {
      planId: plan.id,
      userId,
      netWorth,
      trustsRecommended: trusts.length,
      estimatedTaxSavings: trusts.reduce((sum, t) => sum + t.taxSavings, 0),
    });

    return plan;
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): WealthTransferPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Get all plans for a user
   */
  getUserPlans(userId: string): WealthTransferPlan[] {
    return Array.from(this.plans.values()).filter((p) => p.userId === userId);
  }

  /**
   * Get current tax constants
   */
  getTaxConstants(): typeof TAX_CONSTANTS_2025 {
    return TAX_CONSTANTS_2025;
  }

  /**
   * Get optimal jurisdiction for dynasty trust
   */
  getOptimalJurisdiction(
    needs: {
      assetProtection: boolean;
      privacy: boolean;
      noStateTax: boolean;
      selfSettled: boolean;
    }
  ): { jurisdiction: TrustJurisdiction; reasons: string[] } {
    // South Dakota is generally best overall
    if (needs.assetProtection && needs.privacy && needs.noStateTax) {
      return {
        jurisdiction: 'south_dakota',
        reasons: [
          'No state income tax',
          'Strongest asset protection (2-year statute)',
          'No rule against perpetuities',
          'Privacy protections',
          'Trust-friendly courts',
        ],
      };
    }

    if (needs.selfSettled) {
      return {
        jurisdiction: 'nevada',
        reasons: [
          'Strong self-settled trust protection',
          'No state income tax',
          '2-year creditor statute',
          '365-year trust duration',
        ],
      };
    }

    if (needs.assetProtection) {
      return {
        jurisdiction: 'delaware',
        reasons: [
          'No rule against perpetuities',
          'Strong asset protection',
          'Court of Chancery expertise',
          'Directed trusts allowed',
        ],
      };
    }

    return {
      jurisdiction: 'south_dakota',
      reasons: ['Best overall jurisdiction for most situations'],
    };
  }
}

// ============================================================
// TRUST ASSET TRACKING & AUTOMATION
// ============================================================

export interface TrustAsset {
  id: string;
  trustId: string;
  trustName: string;
  userId: string;
  assetType: 'cash' | 'stock' | 'etf' | 'real_estate' | 'business' | 'crypto' | 'other';
  symbol?: string;
  description: string;
  originalValue: number;
  currentValue: number;
  shares?: number;
  transferDate?: Date;
  status: 'designated' | 'pending_transfer' | 'transferred' | 'in_trust';
  brokerId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnualGiftRecord {
  id: string;
  userId: string;
  year: number;
  recipientId: string;
  recipientName: string;
  recipientRelationship: string;
  giftDate: Date;
  assetType: string;
  assetSymbol?: string;
  amount: number;
  remainingExclusion: number;
  usedLifetimeExemption: boolean;
  executedViaBroker: boolean;
  orderId?: string;
  notes?: string;
}

// Add to DynastyTrustEngine class
class TrustAssetTracker {
  private assets: Map<string, TrustAsset> = new Map();
  private giftRecords: Map<string, AnnualGiftRecord[]> = new Map();

  /**
   * Designate an asset for a trust
   */
  designateAssetForTrust(
    userId: string,
    trustId: string,
    trustName: string,
    asset: Omit<TrustAsset, 'id' | 'trustId' | 'trustName' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>
  ): TrustAsset {
    const trustAsset: TrustAsset = {
      id: uuidv4(),
      trustId,
      trustName,
      userId,
      ...asset,
      status: 'designated',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.assets.set(trustAsset.id, trustAsset);

    logger.info('Asset designated for trust', {
      assetId: trustAsset.id,
      trustName,
      assetType: asset.assetType,
      value: asset.currentValue,
    });

    return trustAsset;
  }

  /**
   * Execute transfer of tradeable assets via broker
   */
  async executeAssetTransfer(
    assetId: string,
    toBrokerId: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return { success: false, error: 'Asset not found' };
    }

    if (!['stock', 'etf', 'crypto'].includes(asset.assetType)) {
      return { success: false, error: 'Asset type cannot be transferred via broker' };
    }

    // Import BrokerManager for execution
    try {
      const { BrokerManager } = await import('../brokers/broker_manager');
      const brokerManager = BrokerManager.getInstance();

      // For stocks/ETFs, we can execute a "gift transfer" by:
      // 1. Selling in taxable account (if needed)
      // 2. Or initiating ACATS/wire to trust account

      // Mark as pending
      asset.status = 'pending_transfer';
      asset.updatedAt = new Date();

      logger.info('Asset transfer initiated', {
        assetId,
        symbol: asset.symbol,
        toBrokerId,
      });

      // Note: Actual ACATS transfers require form filing
      // We can track the intent and status
      return {
        success: true,
        orderId: `TRUST_TRANSFER_${assetId}`,
      };
    } catch (error) {
      logger.error('Asset transfer failed:', error as object);
      return { success: false, error: 'Transfer execution failed' };
    }
  }

  /**
   * Record an annual exclusion gift
   */
  recordGift(
    userId: string,
    recipientId: string,
    recipientName: string,
    recipientRelationship: string,
    gift: {
      amount: number;
      assetType: string;
      assetSymbol?: string;
      executedViaBroker: boolean;
      orderId?: string;
      notes?: string;
    }
  ): AnnualGiftRecord {
    const year = new Date().getFullYear();
    const exclusion = TAX_CONSTANTS_2025.annualGiftExclusion;

    // Get existing gifts this year to this recipient
    const userGifts = this.giftRecords.get(userId) || [];
    const giftsToRecipient = userGifts.filter(
      (g) => g.year === year && g.recipientId === recipientId
    );
    const totalToRecipient = giftsToRecipient.reduce((sum, g) => sum + g.amount, 0);

    const record: AnnualGiftRecord = {
      id: uuidv4(),
      userId,
      year,
      recipientId,
      recipientName,
      recipientRelationship,
      giftDate: new Date(),
      assetType: gift.assetType,
      assetSymbol: gift.assetSymbol,
      amount: gift.amount,
      remainingExclusion: Math.max(0, exclusion - totalToRecipient - gift.amount),
      usedLifetimeExemption: totalToRecipient + gift.amount > exclusion,
      executedViaBroker: gift.executedViaBroker,
      orderId: gift.orderId,
      notes: gift.notes,
    };

    userGifts.push(record);
    this.giftRecords.set(userId, userGifts);

    logger.info('Gift recorded', {
      userId,
      recipientName,
      amount: gift.amount,
      remainingExclusion: record.remainingExclusion,
      usedLifetimeExemption: record.usedLifetimeExemption,
    });

    return record;
  }

  /**
   * Execute annual exclusion gift via broker (stocks/ETFs)
   */
  async executeGiftViaBroker(
    userId: string,
    recipientId: string,
    recipientName: string,
    recipientRelationship: string,
    symbol: string,
    shares: number
  ): Promise<{ success: boolean; record?: AnnualGiftRecord; error?: string }> {
    try {
      const { BrokerManager } = await import('../brokers/broker_manager');
      const brokerManager = BrokerManager.getInstance();

      // Get current quote
      const quote = await brokerManager.getQuote(symbol);
      const giftValue = quote.bid * shares;

      // Check annual exclusion limit
      const year = new Date().getFullYear();
      const userGifts = this.giftRecords.get(userId) || [];
      const giftsToRecipient = userGifts.filter(
        (g) => g.year === year && g.recipientId === recipientId
      );
      const totalToRecipient = giftsToRecipient.reduce((sum, g) => sum + g.amount, 0);

      if (totalToRecipient + giftValue > TAX_CONSTANTS_2025.annualGiftExclusion) {
        logger.warn('Gift exceeds annual exclusion', {
          giftValue,
          totalAlreadyGifted: totalToRecipient,
          limit: TAX_CONSTANTS_2025.annualGiftExclusion,
        });
        // Continue but flag it
      }

      // Note: Actual stock gift transfers require:
      // 1. ACATS transfer to recipient's account, or
      // 2. DTC transfer between accounts
      // For now, we record the intent and the broker would need to execute

      const record = this.recordGift(
        userId,
        recipientId,
        recipientName,
        recipientRelationship,
        {
          amount: giftValue,
          assetType: 'stock',
          assetSymbol: symbol,
          executedViaBroker: true,
          orderId: `GIFT_${symbol}_${shares}_${Date.now()}`,
          notes: `Gift of ${shares} shares of ${symbol} at $${quote.bid.toFixed(2)}/share`,
        }
      );

      return { success: true, record };
    } catch (error) {
      logger.error('Gift execution failed:', error as object);
      return { success: false, error: 'Gift execution failed' };
    }
  }

  /**
   * Get user's gift summary for the year
   */
  getGiftSummary(userId: string, year?: number): {
    year: number;
    totalGifted: number;
    recipientsCount: number;
    byRecipient: Array<{ name: string; total: number; remaining: number }>;
    usedLifetimeExemption: number;
  } {
    const targetYear = year || new Date().getFullYear();
    const userGifts = this.giftRecords.get(userId) || [];
    const yearGifts = userGifts.filter((g) => g.year === targetYear);

    const byRecipient = new Map<string, { name: string; total: number }>();
    let usedLifetimeExemption = 0;

    for (const gift of yearGifts) {
      const existing = byRecipient.get(gift.recipientId) || {
        name: gift.recipientName,
        total: 0,
      };
      existing.total += gift.amount;
      byRecipient.set(gift.recipientId, existing);

      if (gift.usedLifetimeExemption) {
        usedLifetimeExemption += Math.max(
          0,
          gift.amount - TAX_CONSTANTS_2025.annualGiftExclusion
        );
      }
    }

    return {
      year: targetYear,
      totalGifted: yearGifts.reduce((sum, g) => sum + g.amount, 0),
      recipientsCount: byRecipient.size,
      byRecipient: Array.from(byRecipient.values()).map((r) => ({
        ...r,
        remaining: Math.max(0, TAX_CONSTANTS_2025.annualGiftExclusion - r.total),
      })),
      usedLifetimeExemption,
    };
  }

  /**
   * Get trust assets for user
   */
  getTrustAssets(userId: string): TrustAsset[] {
    return Array.from(this.assets.values()).filter((a) => a.userId === userId);
  }

  /**
   * Get total value in trusts
   */
  getTotalTrustValue(userId: string): number {
    return this.getTrustAssets(userId)
      .filter((a) => a.status === 'in_trust' || a.status === 'transferred')
      .reduce((sum, a) => sum + a.currentValue, 0);
  }
}

// Create tracker instance
export const trustAssetTracker = new TrustAssetTracker();

// Export singleton
export const dynastyTrustEngine = new DynastyTrustEngine();
export default dynastyTrustEngine;

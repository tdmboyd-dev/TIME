/**
 * TIME Tax-Loss Harvesting Engine
 *
 * Automated tax optimization that rivals Wealthfront and Betterment.
 * Monitors portfolio for loss harvesting opportunities while avoiding wash sales.
 *
 * PLAIN ENGLISH:
 * - When you sell an investment at a loss, you can use that loss to reduce your taxes
 * - This system automatically finds positions with losses
 * - It sells them and buys similar (but not identical) investments
 * - This "harvests" the loss for tax purposes while keeping you invested
 * - The IRS has rules (wash sale) that we must follow to make this legal
 *
 * EXAMPLE:
 * - You bought SPY at $400, it's now $380 (loss of $20/share)
 * - System sells SPY, realizing the $20 loss
 * - System immediately buys VOO (similar S&P 500 ETF, not identical)
 * - You still own "the same thing" but now have a tax loss to claim
 */

import { logger } from '../utils/logger';

// Tax configuration
const TAX_CONFIG = {
  SHORT_TERM_RATE: 0.37, // Federal short-term (ordinary income) max bracket
  LONG_TERM_RATE: 0.20, // Federal long-term capital gains max bracket
  WASH_SALE_DAYS: 30, // Days before/after sale that trigger wash sale
  MIN_HARVEST_AMOUNT: 100, // Minimum loss to harvest ($)
  MIN_TAX_BENEFIT: 20, // Minimum tax savings to trigger harvest ($)
  THRESHOLD_PERCENT: 0.03, // 3% loss threshold to trigger analysis
};

// Position types
export interface Position {
  symbol: string;
  shares: number;
  costBasis: number; // Total cost basis
  currentPrice: number;
  purchaseDate: Date;
  accountId: string;
  lotId: string; // For specific lot identification
}

export interface TaxLot {
  lotId: string;
  symbol: string;
  shares: number;
  purchasePrice: number; // Per share
  purchaseDate: Date;
  accountId: string;
}

// Replacement security mappings
export interface ReplacementMapping {
  original: string;
  replacements: string[];
  category: string;
  correlation: number; // How similar (0-1)
}

// Pre-defined replacement mappings (can't be "substantially identical")
export const REPLACEMENT_SECURITIES: ReplacementMapping[] = [
  // S&P 500 ETFs
  {
    original: 'SPY',
    replacements: ['VOO', 'IVV', 'SPLG'],
    category: 'sp500',
    correlation: 0.99,
  },
  {
    original: 'VOO',
    replacements: ['SPY', 'IVV', 'SPLG'],
    category: 'sp500',
    correlation: 0.99,
  },
  {
    original: 'IVV',
    replacements: ['SPY', 'VOO', 'SPLG'],
    category: 'sp500',
    correlation: 0.99,
  },

  // Total Market ETFs
  {
    original: 'VTI',
    replacements: ['ITOT', 'SPTM', 'SCHB'],
    category: 'total_market',
    correlation: 0.99,
  },
  {
    original: 'ITOT',
    replacements: ['VTI', 'SPTM', 'SCHB'],
    category: 'total_market',
    correlation: 0.99,
  },

  // NASDAQ/Tech ETFs
  {
    original: 'QQQ',
    replacements: ['QQQM', 'VGT', 'XLK'],
    category: 'tech',
    correlation: 0.95,
  },
  {
    original: 'QQQM',
    replacements: ['QQQ', 'VGT', 'XLK'],
    category: 'tech',
    correlation: 0.95,
  },

  // International Developed
  {
    original: 'VEA',
    replacements: ['IEFA', 'EFA', 'SCHF'],
    category: 'intl_developed',
    correlation: 0.98,
  },
  {
    original: 'IEFA',
    replacements: ['VEA', 'EFA', 'SCHF'],
    category: 'intl_developed',
    correlation: 0.98,
  },

  // Emerging Markets
  {
    original: 'VWO',
    replacements: ['IEMG', 'EEM', 'SCHE'],
    category: 'emerging',
    correlation: 0.97,
  },
  {
    original: 'IEMG',
    replacements: ['VWO', 'EEM', 'SCHE'],
    category: 'emerging',
    correlation: 0.97,
  },

  // Bond ETFs
  {
    original: 'BND',
    replacements: ['AGG', 'SCHZ', 'IUSB'],
    category: 'bonds',
    correlation: 0.98,
  },
  {
    original: 'AGG',
    replacements: ['BND', 'SCHZ', 'IUSB'],
    category: 'bonds',
    correlation: 0.98,
  },

  // Individual stocks to sector ETFs (one-way mapping)
  {
    original: 'AAPL',
    replacements: ['XLK', 'VGT', 'QQQ'],
    category: 'tech_stock_to_etf',
    correlation: 0.75,
  },
  {
    original: 'MSFT',
    replacements: ['XLK', 'VGT', 'QQQ'],
    category: 'tech_stock_to_etf',
    correlation: 0.75,
  },
  {
    original: 'GOOGL',
    replacements: ['XLC', 'VOX', 'FCOM'],
    category: 'comm_stock_to_etf',
    correlation: 0.70,
  },
  {
    original: 'JPM',
    replacements: ['XLF', 'VFH', 'KBE'],
    category: 'finance_stock_to_etf',
    correlation: 0.70,
  },
];

// Harvest opportunity
export interface HarvestOpportunity {
  id: string;
  position: Position;
  taxLot: TaxLot;
  unrealizedLoss: number;
  unrealizedLossPercent: number;
  isLongTerm: boolean;
  taxRate: number;
  estimatedTaxSavings: number;
  replacement: {
    symbol: string;
    shares: number;
    estimatedCost: number;
    correlation: number;
  };
  washSaleRisk: {
    hasRisk: boolean;
    conflictingLots: string[];
    waitUntil: Date | null;
  };
  recommendation: 'harvest' | 'wait' | 'skip';
  recommendationReason: string;
}

// Wash sale tracking
export interface WashSaleEntry {
  symbol: string;
  saleDate: Date;
  saleAmount: number;
  accountId: string;
  expirationDate: Date; // 30 days after sale
}

// Harvest result
export interface HarvestResult {
  success: boolean;
  opportunity: HarvestOpportunity;
  sellOrder?: {
    orderId: string;
    symbol: string;
    shares: number;
    price: number;
    total: number;
  };
  buyOrder?: {
    orderId: string;
    symbol: string;
    shares: number;
    price: number;
    total: number;
  };
  actualTaxSavings: number;
  error?: string;
}

export class TaxLossHarvester {
  private washSaleTracker: Map<string, WashSaleEntry[]> = new Map();
  private harvestHistory: HarvestResult[] = [];
  private yearlyHarvests: Map<number, number> = new Map(); // Year -> total harvested

  /**
   * Find all tax-loss harvesting opportunities in a portfolio
   *
   * PLAIN ENGLISH:
   * - Scans all positions for unrealized losses
   * - Checks if harvesting makes financial sense
   * - Ensures we won't trigger wash sale rules
   * - Returns prioritized list of opportunities
   */
  async findOpportunities(
    positions: Position[],
    taxLots: TaxLot[],
    options: {
      minLoss?: number;
      prioritizeLongTerm?: boolean;
      excludeSymbols?: string[];
    } = {}
  ): Promise<HarvestOpportunity[]> {
    const opportunities: HarvestOpportunity[] = [];
    const minLoss = options.minLoss || TAX_CONFIG.MIN_HARVEST_AMOUNT;

    for (const position of positions) {
      // Skip excluded symbols
      if (options.excludeSymbols?.includes(position.symbol)) continue;

      // Calculate unrealized loss
      const marketValue = position.shares * position.currentPrice;
      const unrealizedPL = marketValue - position.costBasis;

      // Only interested in losses
      if (unrealizedPL >= 0) continue;

      const unrealizedLoss = Math.abs(unrealizedPL);
      const unrealizedLossPercent = unrealizedLoss / position.costBasis;

      // Check minimum threshold
      if (unrealizedLoss < minLoss) continue;
      if (unrealizedLossPercent < TAX_CONFIG.THRESHOLD_PERCENT) continue;

      // Get tax lots for this position
      const positionLots = taxLots.filter(
        (lot) => lot.symbol === position.symbol && lot.accountId === position.accountId
      );

      // Find best lot to harvest (prefer short-term for higher tax benefit)
      const sortedLots = this.sortLotsForHarvesting(positionLots, options.prioritizeLongTerm);

      for (const lot of sortedLots) {
        const lotLoss = this.calculateLotLoss(lot, position.currentPrice);
        if (lotLoss <= 0) continue;

        const isLongTerm = this.isLongTermHolding(lot.purchaseDate);
        const taxRate = isLongTerm ? TAX_CONFIG.LONG_TERM_RATE : TAX_CONFIG.SHORT_TERM_RATE;
        const estimatedTaxSavings = lotLoss * taxRate;

        // Check minimum tax benefit
        if (estimatedTaxSavings < TAX_CONFIG.MIN_TAX_BENEFIT) continue;

        // Find replacement security
        const replacement = this.findReplacement(position.symbol, lot.shares, position.currentPrice);
        if (!replacement) continue;

        // Check wash sale risk
        const washSaleRisk = this.checkWashSaleRisk(position.symbol, position.accountId);

        // Generate recommendation
        const { recommendation, reason } = this.generateRecommendation(
          lotLoss,
          estimatedTaxSavings,
          washSaleRisk,
          replacement.correlation
        );

        opportunities.push({
          id: `harvest_${lot.lotId}_${Date.now()}`,
          position,
          taxLot: lot,
          unrealizedLoss: lotLoss,
          unrealizedLossPercent: lotLoss / (lot.shares * lot.purchasePrice),
          isLongTerm,
          taxRate,
          estimatedTaxSavings,
          replacement,
          washSaleRisk,
          recommendation,
          recommendationReason: reason,
        });
      }
    }

    // Sort by estimated tax savings (highest first)
    opportunities.sort((a, b) => b.estimatedTaxSavings - a.estimatedTaxSavings);

    logger.info('Tax-loss harvesting opportunities found', {
      totalPositions: positions.length,
      opportunitiesFound: opportunities.length,
      totalPotentialSavings: opportunities.reduce((sum, o) => sum + o.estimatedTaxSavings, 0),
    });

    return opportunities;
  }

  /**
   * Execute a tax-loss harvest
   *
   * PLAIN ENGLISH:
   * - Sells the losing position
   * - Immediately buys the replacement
   * - Records the transaction for wash sale tracking
   */
  async executeHarvest(
    opportunity: HarvestOpportunity,
    executeTrade: (order: { symbol: string; side: 'buy' | 'sell'; shares: number }) => Promise<{
      orderId: string;
      filledPrice: number;
      filledShares: number;
    }>
  ): Promise<HarvestResult> {
    try {
      // Verify recommendation
      if (opportunity.recommendation === 'skip') {
        return {
          success: false,
          opportunity,
          actualTaxSavings: 0,
          error: 'Opportunity marked as skip: ' + opportunity.recommendationReason,
        };
      }

      if (opportunity.washSaleRisk.hasRisk) {
        return {
          success: false,
          opportunity,
          actualTaxSavings: 0,
          error: 'Wash sale risk detected. Wait until: ' + opportunity.washSaleRisk.waitUntil,
        };
      }

      // Execute sell order
      const sellResult = await executeTrade({
        symbol: opportunity.position.symbol,
        side: 'sell',
        shares: opportunity.taxLot.shares,
      });

      const sellTotal = sellResult.filledPrice * sellResult.filledShares;

      // Execute buy order for replacement
      const buyResult = await executeTrade({
        symbol: opportunity.replacement.symbol,
        side: 'buy',
        shares: opportunity.replacement.shares,
      });

      const buyTotal = buyResult.filledPrice * buyResult.filledShares;

      // Calculate actual tax savings
      const actualLoss =
        opportunity.taxLot.purchasePrice * opportunity.taxLot.shares - sellTotal;
      const actualTaxSavings = actualLoss * opportunity.taxRate;

      // Record wash sale tracking
      this.recordWashSale(
        opportunity.position.symbol,
        opportunity.position.accountId,
        actualLoss
      );

      // Record harvest
      const result: HarvestResult = {
        success: true,
        opportunity,
        sellOrder: {
          orderId: sellResult.orderId,
          symbol: opportunity.position.symbol,
          shares: sellResult.filledShares,
          price: sellResult.filledPrice,
          total: sellTotal,
        },
        buyOrder: {
          orderId: buyResult.orderId,
          symbol: opportunity.replacement.symbol,
          shares: buyResult.filledShares,
          price: buyResult.filledPrice,
          total: buyTotal,
        },
        actualTaxSavings,
      };

      this.harvestHistory.push(result);

      // Update yearly total
      const year = new Date().getFullYear();
      const current = this.yearlyHarvests.get(year) || 0;
      this.yearlyHarvests.set(year, current + actualTaxSavings);

      logger.info('Tax-loss harvest executed', {
        symbol: opportunity.position.symbol,
        replacement: opportunity.replacement.symbol,
        lossHarvested: actualLoss,
        taxSavings: actualTaxSavings,
      });

      return result;
    } catch (error) {
      logger.error('Tax-loss harvest failed', {
        symbol: opportunity.position.symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        opportunity,
        actualTaxSavings: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find a suitable replacement security
   */
  private findReplacement(
    symbol: string,
    shares: number,
    currentPrice: number
  ): HarvestOpportunity['replacement'] | null {
    const mapping = REPLACEMENT_SECURITIES.find((m) => m.original === symbol);

    if (!mapping || mapping.replacements.length === 0) {
      // No pre-defined mapping, try to find sector ETF
      logger.warn('No replacement mapping for symbol', { symbol });
      return null;
    }

    // Use first available replacement
    const replacementSymbol = mapping.replacements[0];
    const estimatedCost = shares * currentPrice; // Approximate same dollar amount

    return {
      symbol: replacementSymbol,
      shares: shares, // Same number of shares (adjust in real implementation based on price)
      estimatedCost,
      correlation: mapping.correlation,
    };
  }

  /**
   * Check if there's a wash sale risk
   *
   * WASH SALE RULE:
   * - Cannot claim loss if you buy "substantially identical" security
   * - Within 30 days BEFORE or AFTER the sale
   * - Applies across all accounts (IRA, taxable, spouse, etc.)
   */
  private checkWashSaleRisk(
    symbol: string,
    accountId: string
  ): HarvestOpportunity['washSaleRisk'] {
    const now = new Date();
    const entries = this.washSaleTracker.get(symbol) || [];

    // Check for recent purchases or sales within wash sale window
    const conflictingLots: string[] = [];
    let latestExpiration: Date | null = null;

    for (const entry of entries) {
      if (entry.expirationDate > now) {
        conflictingLots.push(entry.accountId);
        if (!latestExpiration || entry.expirationDate > latestExpiration) {
          latestExpiration = entry.expirationDate;
        }
      }
    }

    return {
      hasRisk: conflictingLots.length > 0,
      conflictingLots,
      waitUntil: latestExpiration,
    };
  }

  /**
   * Record a sale for wash sale tracking
   */
  private recordWashSale(symbol: string, accountId: string, amount: number): void {
    const now = new Date();
    const expirationDate = new Date(now.getTime() + TAX_CONFIG.WASH_SALE_DAYS * 24 * 60 * 60 * 1000);

    const entry: WashSaleEntry = {
      symbol,
      saleDate: now,
      saleAmount: amount,
      accountId,
      expirationDate,
    };

    const entries = this.washSaleTracker.get(symbol) || [];
    entries.push(entry);
    this.washSaleTracker.set(symbol, entries);

    logger.info('Wash sale entry recorded', {
      symbol,
      expirationDate: expirationDate.toISOString(),
    });
  }

  /**
   * Check if holding is long-term (> 1 year)
   */
  private isLongTermHolding(purchaseDate: Date): boolean {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    return purchaseDate < oneYearAgo;
  }

  /**
   * Calculate loss for a specific tax lot
   */
  private calculateLotLoss(lot: TaxLot, currentPrice: number): number {
    const costBasis = lot.shares * lot.purchasePrice;
    const currentValue = lot.shares * currentPrice;
    const pl = currentValue - costBasis;
    return pl < 0 ? Math.abs(pl) : 0;
  }

  /**
   * Sort tax lots for optimal harvesting
   */
  private sortLotsForHarvesting(lots: TaxLot[], prioritizeLongTerm?: boolean): TaxLot[] {
    return [...lots].sort((a, b) => {
      const aIsLongTerm = this.isLongTermHolding(a.purchaseDate);
      const bIsLongTerm = this.isLongTermHolding(b.purchaseDate);

      if (prioritizeLongTerm) {
        if (aIsLongTerm && !bIsLongTerm) return -1;
        if (!aIsLongTerm && bIsLongTerm) return 1;
      } else {
        // Prefer short-term (higher tax benefit)
        if (!aIsLongTerm && bIsLongTerm) return -1;
        if (aIsLongTerm && !bIsLongTerm) return 1;
      }

      // Then by loss amount (higher loss first)
      return b.purchasePrice - a.purchasePrice;
    });
  }

  /**
   * Generate harvest recommendation
   */
  private generateRecommendation(
    loss: number,
    taxSavings: number,
    washSaleRisk: HarvestOpportunity['washSaleRisk'],
    correlation: number
  ): { recommendation: HarvestOpportunity['recommendation']; reason: string } {
    if (washSaleRisk.hasRisk) {
      return {
        recommendation: 'wait',
        reason: `Wash sale risk - wait until ${washSaleRisk.waitUntil?.toDateString()}`,
      };
    }

    if (taxSavings < TAX_CONFIG.MIN_TAX_BENEFIT) {
      return {
        recommendation: 'skip',
        reason: `Tax savings ($${taxSavings.toFixed(2)}) below minimum ($${TAX_CONFIG.MIN_TAX_BENEFIT})`,
      };
    }

    if (correlation < 0.8) {
      return {
        recommendation: 'harvest',
        reason: `Good opportunity - $${taxSavings.toFixed(2)} savings. Note: replacement has ${(
          correlation * 100
        ).toFixed(0)}% correlation.`,
      };
    }

    return {
      recommendation: 'harvest',
      reason: `Strong opportunity - $${taxSavings.toFixed(2)} savings with ${(
        correlation * 100
      ).toFixed(0)}% correlated replacement.`,
    };
  }

  /**
   * Get summary of tax-loss harvesting for the year
   */
  getYearlySummary(year?: number): {
    year: number;
    totalHarvested: number;
    totalTaxSavings: number;
    harvestCount: number;
    topHarvests: HarvestResult[];
  } {
    const targetYear = year || new Date().getFullYear();
    const yearlyTotal = this.yearlyHarvests.get(targetYear) || 0;

    const yearHarvests = this.harvestHistory.filter(
      (h) => h.success && h.sellOrder && new Date().getFullYear() === targetYear
    );

    const totalHarvested = yearHarvests.reduce(
      (sum, h) =>
        sum +
        (h.opportunity.taxLot.purchasePrice * h.opportunity.taxLot.shares -
          (h.sellOrder?.total || 0)),
      0
    );

    return {
      year: targetYear,
      totalHarvested,
      totalTaxSavings: yearlyTotal,
      harvestCount: yearHarvests.length,
      topHarvests: yearHarvests.slice(0, 10),
    };
  }

  /**
   * Get wash sale calendar (dates when specific symbols can be traded)
   */
  getWashSaleCalendar(): {
    symbol: string;
    canTradeAfter: Date;
    dayesRemaining: number;
  }[] {
    const calendar: { symbol: string; canTradeAfter: Date; dayesRemaining: number }[] = [];
    const now = new Date();

    for (const [symbol, entries] of this.washSaleTracker) {
      const activeEntries = entries.filter((e) => e.expirationDate > now);
      if (activeEntries.length > 0) {
        const latestExpiration = activeEntries.reduce(
          (latest, e) => (e.expirationDate > latest ? e.expirationDate : latest),
          activeEntries[0].expirationDate
        );

        const daysRemaining = Math.ceil(
          (latestExpiration.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        calendar.push({
          symbol,
          canTradeAfter: latestExpiration,
          dayesRemaining: daysRemaining,
        });
      }
    }

    return calendar.sort((a, b) => a.dayesRemaining - b.dayesRemaining);
  }
}

// Export singleton instance
export const taxLossHarvester = new TaxLossHarvester();

logger.info('Tax-Loss Harvester initialized - Automated tax optimization enabled');

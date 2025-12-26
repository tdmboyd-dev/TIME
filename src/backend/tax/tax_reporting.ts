/**
 * TIME Tax Reporting System
 *
 * Comprehensive tax reporting for the TIME BEYOND US trading platform.
 * Supports multiple asset classes, cost basis methods, IRS form generation,
 * and tax optimization strategies.
 *
 * FEATURES:
 * - Capital gains/losses calculation (short-term vs long-term)
 * - Cost basis methods: FIFO, LIFO, Specific Identification, Average Cost
 * - Wash sale detection and adjustment
 * - IRS Form 8949 data generation
 * - Schedule D summary
 * - Multi-asset support (stocks, crypto, options)
 * - Tax-loss harvesting suggestions
 * - Estimated tax liability calculator
 * - Export to CSV, PDF, TurboTax, H&R Block formats
 */

import { logger } from '../utils/logger';

// ============================================================
// TYPES & INTERFACES
// ============================================================

/** Supported asset classes */
export type AssetClass = 'stock' | 'crypto' | 'option' | 'etf' | 'mutual_fund' | 'bond' | 'futures' | 'forex';

/** Cost basis calculation methods */
export type CostBasisMethod = 'FIFO' | 'LIFO' | 'SPECIFIC_ID' | 'AVERAGE_COST' | 'HIFO';

/** Tax lot for cost basis tracking */
export interface TaxLot {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  assetClass: AssetClass;
  quantity: number;
  costBasisPerShare: number;
  totalCostBasis: number;
  purchaseDate: Date;
  purchasePrice: number;
  fees: number;
  adjustedCostBasis: number;
  washSaleAdjustment: number;
  remainingQuantity: number;
  closed: boolean;
  closedDate?: Date;
  closedPrice?: number;
  realizedGainLoss?: number;
  isLongTerm?: boolean;
}

/** Completed trade/sale for tax reporting */
export interface CompletedTrade {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  assetClass: AssetClass;
  dateAcquired: Date;
  dateSold: Date;
  proceeds: number;
  costBasis: number;
  adjustedCostBasis: number;
  gainLoss: number;
  isLongTerm: boolean;
  holdingPeriodDays: number;
  washSaleDisallowed: number;
  isWashSale: boolean;
  adjustmentCode?: string;
  form8949Box: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  quantity: number;
  fees: number;
  matchedLotIds: string[];
}

/** Wash sale entry */
export interface WashSaleEntry {
  id: string;
  userId: string;
  originalSaleId: string;
  symbol: string;
  saleDate: Date;
  saleProceeds: number;
  disallowedLoss: number;
  replacementPurchaseDate: Date;
  replacementPurchaseId: string;
  adjustedBasisAdded: number;
  windowStart: Date;
  windowEnd: Date;
  resolved: boolean;
}

/** Form 8949 line item */
export interface Form8949Line {
  description: string; // (a) Description of property
  dateAcquired: string; // (b) Date acquired
  dateSold: string; // (c) Date sold or disposed of
  proceeds: number; // (d) Proceeds
  costBasis: number; // (e) Cost or other basis
  adjustmentCode: string; // (f) Code(s) from instructions
  adjustmentAmount: number; // (g) Amount of adjustment
  gainOrLoss: number; // (h) Gain or (loss)
  box: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // Which box this belongs to
}

/** Schedule D summary */
export interface ScheduleDSummary {
  year: number;
  // Part I - Short-Term (assets held 1 year or less)
  shortTermFromForm8949BoxA: number;
  shortTermFromForm8949BoxB: number;
  shortTermFromForm8949BoxC: number;
  shortTermGainFromScheduleK1: number;
  shortTermCarryover: number;
  netShortTermGainLoss: number;
  // Part II - Long-Term (assets held more than 1 year)
  longTermFromForm8949BoxD: number;
  longTermFromForm8949BoxE: number;
  longTermFromForm8949BoxF: number;
  longTermGainFromScheduleK1: number;
  longTermCarryover: number;
  netLongTermGainLoss: number;
  // Part III - Summary
  combinedGainLoss: number;
  capitalLossCarryover: number;
  netCapitalGainLoss: number;
  taxableCapitalGain: number;
}

/** Tax summary for a year */
export interface YearlyTaxSummary {
  year: number;
  userId: string;
  totalProceeds: number;
  totalCostBasis: number;
  shortTermGains: number;
  shortTermLosses: number;
  netShortTerm: number;
  longTermGains: number;
  longTermLosses: number;
  netLongTerm: number;
  totalGains: number;
  totalLosses: number;
  netGainLoss: number;
  washSaleDisallowed: number;
  adjustedNetGainLoss: number;
  estimatedTaxLiability: number;
  carryforwardLoss: number;
  tradeCount: number;
  byAssetClass: Record<AssetClass, {
    proceeds: number;
    costBasis: number;
    gainLoss: number;
    tradeCount: number;
  }>;
  bySymbol: Record<string, {
    proceeds: number;
    costBasis: number;
    gainLoss: number;
    tradeCount: number;
  }>;
  topGainers: Array<{ symbol: string; gainLoss: number }>;
  topLosers: Array<{ symbol: string; gainLoss: number }>;
}

/** Tax-loss harvesting opportunity */
export interface HarvestingOpportunity {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  currentValue: number;
  costBasis: number;
  unrealizedLoss: number;
  unrealizedLossPercent: number;
  isLongTerm: boolean;
  daysHeld: number;
  estimatedTaxSavings: number;
  suggestedReplacement: string[];
  washSaleRisk: boolean;
  washSaleWindowEnd?: Date;
  recommendation: 'strong_harvest' | 'consider' | 'wait' | 'avoid';
  recommendationReason: string;
}

/** Tax liability estimate */
export interface TaxLiabilityEstimate {
  year: number;
  shortTermGains: number;
  shortTermRate: number;
  shortTermTax: number;
  longTermGains: number;
  longTermRate: number;
  longTermTax: number;
  netInvestmentIncomeTax: number;
  stateTax: number;
  totalEstimatedTax: number;
  effectiveTaxRate: number;
  quarterlyPayments: number[];
}

/** Export format options */
export type ExportFormat = 'CSV' | 'PDF' | 'TURBOTAX' | 'HRBLOCK' | 'JSON';

/** Export result */
export interface ExportResult {
  format: ExportFormat;
  filename: string;
  data: string | Buffer;
  mimeType: string;
  generatedAt: Date;
}

// ============================================================
// TAX CONSTANTS
// ============================================================

const TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  married: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
};

const LONG_TERM_RATES_2024 = {
  single: [
    { min: 0, max: 47025, rate: 0.00 },
    { min: 47025, max: 518900, rate: 0.15 },
    { min: 518900, max: Infinity, rate: 0.20 },
  ],
  married: [
    { min: 0, max: 94050, rate: 0.00 },
    { min: 94050, max: 583750, rate: 0.15 },
    { min: 583750, max: Infinity, rate: 0.20 },
  ],
};

const NIIT_THRESHOLD = {
  single: 200000,
  married: 250000,
  niitRate: 0.038, // 3.8% Net Investment Income Tax
};

const WASH_SALE_WINDOW_DAYS = 30;
const LONG_TERM_HOLDING_DAYS = 366; // More than 1 year
const CAPITAL_LOSS_LIMIT = 3000; // Annual deductible capital loss limit

// Replacement securities for tax-loss harvesting (substantially different)
const REPLACEMENT_SECURITIES: Record<string, string[]> = {
  // S&P 500 ETFs
  'SPY': ['VOO', 'IVV', 'SPLG', 'SCHX'],
  'VOO': ['SPY', 'IVV', 'SPLG', 'SCHX'],
  'IVV': ['SPY', 'VOO', 'SPLG', 'SCHX'],
  // Total Market
  'VTI': ['ITOT', 'SPTM', 'SCHB'],
  'ITOT': ['VTI', 'SPTM', 'SCHB'],
  // Tech
  'QQQ': ['QQQM', 'VGT', 'XLK', 'IYW'],
  'QQQM': ['QQQ', 'VGT', 'XLK'],
  // International
  'VEA': ['IEFA', 'EFA', 'SCHF'],
  'IEFA': ['VEA', 'EFA', 'SCHF'],
  'VWO': ['IEMG', 'EEM', 'SCHE'],
  // Bonds
  'BND': ['AGG', 'SCHZ', 'IUSB'],
  'AGG': ['BND', 'SCHZ', 'IUSB'],
  // Crypto (non-substantially identical alternatives)
  'BTC': ['GBTC', 'BITO', 'IBIT'],
  'ETH': ['ETHE', 'ETHU'],
};

// ============================================================
// TAX REPORTING ENGINE
// ============================================================

export class TaxReportingEngine {
  private taxLots: Map<string, TaxLot[]> = new Map(); // userId -> lots
  private completedTrades: Map<string, CompletedTrade[]> = new Map(); // userId -> trades
  private washSales: Map<string, WashSaleEntry[]> = new Map(); // userId -> wash sales
  private carryforwardLosses: Map<string, number> = new Map(); // userId_year -> loss amount

  constructor() {
    logger.info('TaxReportingEngine initialized');
  }

  // ============================================================
  // TAX LOT MANAGEMENT
  // ============================================================

  /**
   * Add a new tax lot when purchasing an asset
   */
  addTaxLot(lot: Omit<TaxLot, 'id' | 'adjustedCostBasis' | 'washSaleAdjustment' | 'remainingQuantity' | 'closed'>): TaxLot {
    const newLot: TaxLot = {
      ...lot,
      id: `lot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      adjustedCostBasis: lot.totalCostBasis + lot.fees,
      washSaleAdjustment: 0,
      remainingQuantity: lot.quantity,
      closed: false,
    };

    const userLots = this.taxLots.get(lot.userId) || [];
    userLots.push(newLot);
    this.taxLots.set(lot.userId, userLots);

    logger.info('Tax lot added', { lotId: newLot.id, symbol: newLot.symbol, quantity: newLot.quantity });
    return newLot;
  }

  /**
   * Get all tax lots for a user
   */
  getTaxLots(userId: string, options?: {
    symbol?: string;
    assetClass?: AssetClass;
    openOnly?: boolean;
  }): TaxLot[] {
    let lots = this.taxLots.get(userId) || [];

    if (options?.symbol) {
      lots = lots.filter(l => l.symbol === options.symbol);
    }
    if (options?.assetClass) {
      lots = lots.filter(l => l.assetClass === options.assetClass);
    }
    if (options?.openOnly) {
      lots = lots.filter(l => !l.closed && l.remainingQuantity > 0);
    }

    return lots;
  }

  // ============================================================
  // COST BASIS CALCULATION
  // ============================================================

  /**
   * Calculate cost basis for a sale using specified method
   */
  calculateCostBasis(
    userId: string,
    symbol: string,
    quantityToSell: number,
    method: CostBasisMethod,
    saleDate: Date,
    specificLotIds?: string[]
  ): { lots: TaxLot[]; totalCostBasis: number; totalAdjustedBasis: number } {
    const openLots = this.getTaxLots(userId, { symbol, openOnly: true });

    if (openLots.length === 0) {
      throw new Error(`No open lots found for symbol ${symbol}`);
    }

    const totalAvailable = openLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
    if (totalAvailable < quantityToSell) {
      throw new Error(`Insufficient quantity. Have ${totalAvailable}, need ${quantityToSell}`);
    }

    let sortedLots: TaxLot[];

    switch (method) {
      case 'FIFO':
        // First In, First Out - oldest lots first
        sortedLots = [...openLots].sort((a, b) =>
          new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
        );
        break;

      case 'LIFO':
        // Last In, First Out - newest lots first
        sortedLots = [...openLots].sort((a, b) =>
          new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        );
        break;

      case 'HIFO':
        // Highest In, First Out - highest cost basis first (tax optimization)
        sortedLots = [...openLots].sort((a, b) =>
          b.costBasisPerShare - a.costBasisPerShare
        );
        break;

      case 'SPECIFIC_ID':
        // Specific Identification - use provided lot IDs
        if (!specificLotIds || specificLotIds.length === 0) {
          throw new Error('Specific lot IDs required for SPECIFIC_ID method');
        }
        sortedLots = openLots.filter(lot => specificLotIds.includes(lot.id));
        if (sortedLots.length !== specificLotIds.length) {
          throw new Error('Some specified lots not found or already closed');
        }
        break;

      case 'AVERAGE_COST':
        // Average cost - calculate weighted average
        const totalCost = openLots.reduce((sum, lot) =>
          sum + (lot.adjustedCostBasis / lot.quantity * lot.remainingQuantity), 0
        );
        const avgCostPerShare = totalCost / totalAvailable;

        // For average cost, we proportionally reduce all lots
        return {
          lots: openLots,
          totalCostBasis: avgCostPerShare * quantityToSell,
          totalAdjustedBasis: avgCostPerShare * quantityToSell,
        };

      default:
        throw new Error(`Unknown cost basis method: ${method}`);
    }

    // Select lots to cover the sale quantity
    const selectedLots: TaxLot[] = [];
    let remainingToSell = quantityToSell;
    let totalCostBasis = 0;
    let totalAdjustedBasis = 0;

    for (const lot of sortedLots) {
      if (remainingToSell <= 0) break;

      const takeFromLot = Math.min(lot.remainingQuantity, remainingToSell);
      const costPerShare = lot.adjustedCostBasis / lot.quantity;
      const lotCost = costPerShare * takeFromLot;

      selectedLots.push(lot);
      totalCostBasis += lot.costBasisPerShare * takeFromLot;
      totalAdjustedBasis += lotCost;
      remainingToSell -= takeFromLot;
    }

    return {
      lots: selectedLots,
      totalCostBasis,
      totalAdjustedBasis,
    };
  }

  // ============================================================
  // TRADE RECORDING & GAIN/LOSS CALCULATION
  // ============================================================

  /**
   * Record a sale and calculate capital gains/losses
   */
  recordSale(
    userId: string,
    accountId: string,
    symbol: string,
    assetClass: AssetClass,
    quantity: number,
    saleDate: Date,
    salePrice: number,
    fees: number,
    method: CostBasisMethod = 'FIFO',
    specificLotIds?: string[]
  ): CompletedTrade[] {
    const proceeds = (salePrice * quantity) - fees;
    const { lots, totalAdjustedBasis } = this.calculateCostBasis(
      userId, symbol, quantity, method, saleDate, specificLotIds
    );

    const trades: CompletedTrade[] = [];
    let remainingQty = quantity;

    for (const lot of lots) {
      if (remainingQty <= 0) break;

      const useQty = Math.min(lot.remainingQuantity, remainingQty);
      const lotCostPerShare = lot.adjustedCostBasis / lot.quantity;
      const lotProceeds = (proceeds / quantity) * useQty;
      const lotCostBasis = lotCostPerShare * useQty;

      const dateAcquired = new Date(lot.purchaseDate);
      const holdingPeriodDays = Math.floor(
        (saleDate.getTime() - dateAcquired.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isLongTerm = holdingPeriodDays > LONG_TERM_HOLDING_DAYS;
      const gainLoss = lotProceeds - lotCostBasis;

      // Check for wash sale
      const washSaleCheck = this.checkWashSale(userId, symbol, saleDate, gainLoss < 0);

      const trade: CompletedTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        accountId,
        symbol,
        assetClass,
        dateAcquired,
        dateSold: saleDate,
        proceeds: lotProceeds,
        costBasis: lot.costBasisPerShare * useQty,
        adjustedCostBasis: lotCostBasis,
        gainLoss: washSaleCheck.isWashSale ? gainLoss + washSaleCheck.disallowedAmount : gainLoss,
        isLongTerm,
        holdingPeriodDays,
        washSaleDisallowed: washSaleCheck.disallowedAmount,
        isWashSale: washSaleCheck.isWashSale,
        adjustmentCode: washSaleCheck.isWashSale ? 'W' : '',
        form8949Box: this.getForm8949Box(isLongTerm, washSaleCheck.isWashSale),
        quantity: useQty,
        fees: (fees / quantity) * useQty,
        matchedLotIds: [lot.id],
      };

      // Update the lot
      lot.remainingQuantity -= useQty;
      if (lot.remainingQuantity <= 0) {
        lot.closed = true;
        lot.closedDate = saleDate;
        lot.closedPrice = salePrice;
        lot.realizedGainLoss = gainLoss;
        lot.isLongTerm = isLongTerm;
      }

      trades.push(trade);
      remainingQty -= useQty;

      // Record wash sale if applicable
      if (washSaleCheck.isWashSale && washSaleCheck.replacementLot) {
        this.recordWashSaleEntry(userId, trade, washSaleCheck);
      }
    }

    // Store completed trades
    const userTrades = this.completedTrades.get(userId) || [];
    userTrades.push(...trades);
    this.completedTrades.set(userId, userTrades);

    logger.info('Sale recorded', {
      userId,
      symbol,
      quantity,
      proceeds,
      tradesCreated: trades.length,
    });

    return trades;
  }

  /**
   * Determine Form 8949 box based on characteristics
   */
  private getForm8949Box(isLongTerm: boolean, hasAdjustments: boolean): Form8949Line['box'] {
    if (isLongTerm) {
      return hasAdjustments ? 'F' : 'D';
    } else {
      return hasAdjustments ? 'C' : 'A';
    }
  }

  // ============================================================
  // WASH SALE DETECTION
  // ============================================================

  /**
   * Check if a sale triggers wash sale rules
   */
  private checkWashSale(
    userId: string,
    symbol: string,
    saleDate: Date,
    isLoss: boolean
  ): { isWashSale: boolean; disallowedAmount: number; replacementLot?: TaxLot } {
    if (!isLoss) {
      return { isWashSale: false, disallowedAmount: 0 };
    }

    const windowStart = new Date(saleDate);
    windowStart.setDate(windowStart.getDate() - WASH_SALE_WINDOW_DAYS);
    const windowEnd = new Date(saleDate);
    windowEnd.setDate(windowEnd.getDate() + WASH_SALE_WINDOW_DAYS);

    // Check for purchases within the wash sale window
    const userLots = this.taxLots.get(userId) || [];
    const replacementLot = userLots.find(lot =>
      lot.symbol === symbol &&
      lot.purchaseDate >= windowStart &&
      lot.purchaseDate <= windowEnd &&
      lot.purchaseDate.getTime() !== saleDate.getTime()
    );

    if (replacementLot) {
      return {
        isWashSale: true,
        disallowedAmount: 0, // Will be calculated based on actual loss
        replacementLot,
      };
    }

    return { isWashSale: false, disallowedAmount: 0 };
  }

  /**
   * Record a wash sale entry and adjust replacement lot basis
   */
  private recordWashSaleEntry(
    userId: string,
    trade: CompletedTrade,
    washSaleCheck: { isWashSale: boolean; disallowedAmount: number; replacementLot?: TaxLot }
  ): void {
    if (!washSaleCheck.replacementLot || trade.gainLoss >= 0) return;

    const disallowedLoss = Math.abs(trade.gainLoss);

    // Adjust the replacement lot's cost basis
    washSaleCheck.replacementLot.washSaleAdjustment += disallowedLoss;
    washSaleCheck.replacementLot.adjustedCostBasis += disallowedLoss;

    // Record the wash sale entry
    const entry: WashSaleEntry = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      originalSaleId: trade.id,
      symbol: trade.symbol,
      saleDate: trade.dateSold,
      saleProceeds: trade.proceeds,
      disallowedLoss,
      replacementPurchaseDate: washSaleCheck.replacementLot.purchaseDate,
      replacementPurchaseId: washSaleCheck.replacementLot.id,
      adjustedBasisAdded: disallowedLoss,
      windowStart: new Date(trade.dateSold.getTime() - WASH_SALE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      windowEnd: new Date(trade.dateSold.getTime() + WASH_SALE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      resolved: false,
    };

    const userWashSales = this.washSales.get(userId) || [];
    userWashSales.push(entry);
    this.washSales.set(userId, userWashSales);

    // Update the trade's wash sale disallowed amount
    trade.washSaleDisallowed = disallowedLoss;
    trade.adjustmentCode = 'W';

    logger.info('Wash sale recorded', {
      userId,
      symbol: trade.symbol,
      disallowedLoss,
      replacementLotId: washSaleCheck.replacementLot.id,
    });
  }

  /**
   * Get all wash sales for a user
   */
  getWashSales(userId: string, year?: number): WashSaleEntry[] {
    let washSales = this.washSales.get(userId) || [];

    if (year) {
      washSales = washSales.filter(ws =>
        ws.saleDate.getFullYear() === year
      );
    }

    return washSales;
  }

  // ============================================================
  // FORM 8949 GENERATION
  // ============================================================

  /**
   * Generate Form 8949 data for IRS reporting
   */
  generateForm8949(userId: string, year: number): {
    boxA: Form8949Line[];
    boxB: Form8949Line[];
    boxC: Form8949Line[];
    boxD: Form8949Line[];
    boxE: Form8949Line[];
    boxF: Form8949Line[];
    totals: {
      boxA: { proceeds: number; costBasis: number; adjustment: number; gainLoss: number };
      boxB: { proceeds: number; costBasis: number; adjustment: number; gainLoss: number };
      boxC: { proceeds: number; costBasis: number; adjustment: number; gainLoss: number };
      boxD: { proceeds: number; costBasis: number; adjustment: number; gainLoss: number };
      boxE: { proceeds: number; costBasis: number; adjustment: number; gainLoss: number };
      boxF: { proceeds: number; costBasis: number; adjustment: number; gainLoss: number };
    };
  } {
    const trades = this.getCompletedTrades(userId, year);
    const result = {
      boxA: [] as Form8949Line[],
      boxB: [] as Form8949Line[],
      boxC: [] as Form8949Line[],
      boxD: [] as Form8949Line[],
      boxE: [] as Form8949Line[],
      boxF: [] as Form8949Line[],
      totals: {
        boxA: { proceeds: 0, costBasis: 0, adjustment: 0, gainLoss: 0 },
        boxB: { proceeds: 0, costBasis: 0, adjustment: 0, gainLoss: 0 },
        boxC: { proceeds: 0, costBasis: 0, adjustment: 0, gainLoss: 0 },
        boxD: { proceeds: 0, costBasis: 0, adjustment: 0, gainLoss: 0 },
        boxE: { proceeds: 0, costBasis: 0, adjustment: 0, gainLoss: 0 },
        boxF: { proceeds: 0, costBasis: 0, adjustment: 0, gainLoss: 0 },
      },
    };

    for (const trade of trades) {
      const line: Form8949Line = {
        description: `${trade.quantity} sh ${trade.symbol}`,
        dateAcquired: this.formatDateForIRS(trade.dateAcquired),
        dateSold: this.formatDateForIRS(trade.dateSold),
        proceeds: Math.round(trade.proceeds * 100) / 100,
        costBasis: Math.round(trade.adjustedCostBasis * 100) / 100,
        adjustmentCode: trade.adjustmentCode || '',
        adjustmentAmount: trade.washSaleDisallowed,
        gainOrLoss: Math.round(trade.gainLoss * 100) / 100,
        box: trade.form8949Box,
      };

      const boxKey = `box${trade.form8949Box}` as keyof typeof result;
      if (Array.isArray(result[boxKey])) {
        (result[boxKey] as Form8949Line[]).push(line);
      }

      // Update totals
      const totalsKey = boxKey as keyof typeof result.totals;
      result.totals[totalsKey].proceeds += line.proceeds;
      result.totals[totalsKey].costBasis += line.costBasis;
      result.totals[totalsKey].adjustment += line.adjustmentAmount;
      result.totals[totalsKey].gainLoss += line.gainOrLoss;
    }

    return result;
  }

  /**
   * Format date for IRS forms (MM/DD/YYYY)
   */
  private formatDateForIRS(date: Date): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  // ============================================================
  // SCHEDULE D GENERATION
  // ============================================================

  /**
   * Generate Schedule D summary
   */
  generateScheduleD(userId: string, year: number): ScheduleDSummary {
    const form8949 = this.generateForm8949(userId, year);
    const carryover = this.carryforwardLosses.get(`${userId}_${year - 1}`) || 0;

    const netShortTermGainLoss =
      form8949.totals.boxA.gainLoss +
      form8949.totals.boxB.gainLoss +
      form8949.totals.boxC.gainLoss;

    const netLongTermGainLoss =
      form8949.totals.boxD.gainLoss +
      form8949.totals.boxE.gainLoss +
      form8949.totals.boxF.gainLoss;

    const combinedGainLoss = netShortTermGainLoss + netLongTermGainLoss;

    // Calculate deductible loss (max $3,000 per year)
    let capitalLossCarryover = 0;
    let netCapitalGainLoss = combinedGainLoss;

    if (combinedGainLoss < 0) {
      const totalLoss = Math.abs(combinedGainLoss) + carryover;
      const deductible = Math.min(totalLoss, CAPITAL_LOSS_LIMIT);
      netCapitalGainLoss = -deductible;
      capitalLossCarryover = totalLoss - deductible;

      // Store carryover for next year
      this.carryforwardLosses.set(`${userId}_${year}`, capitalLossCarryover);
    }

    const taxableCapitalGain = Math.max(0, combinedGainLoss);

    return {
      year,
      shortTermFromForm8949BoxA: form8949.totals.boxA.gainLoss,
      shortTermFromForm8949BoxB: form8949.totals.boxB.gainLoss,
      shortTermFromForm8949BoxC: form8949.totals.boxC.gainLoss,
      shortTermGainFromScheduleK1: 0, // Would come from K-1 forms
      shortTermCarryover: carryover > 0 ? Math.min(carryover, Math.abs(netShortTermGainLoss)) : 0,
      netShortTermGainLoss,
      longTermFromForm8949BoxD: form8949.totals.boxD.gainLoss,
      longTermFromForm8949BoxE: form8949.totals.boxE.gainLoss,
      longTermFromForm8949BoxF: form8949.totals.boxF.gainLoss,
      longTermGainFromScheduleK1: 0,
      longTermCarryover: 0,
      netLongTermGainLoss,
      combinedGainLoss,
      capitalLossCarryover,
      netCapitalGainLoss,
      taxableCapitalGain,
    };
  }

  // ============================================================
  // TAX SUMMARY & LIABILITY
  // ============================================================

  /**
   * Generate comprehensive yearly tax summary
   */
  generateYearlySummary(userId: string, year: number): YearlyTaxSummary {
    const trades = this.getCompletedTrades(userId, year);
    const washSales = this.getWashSales(userId, year);
    const scheduleD = this.generateScheduleD(userId, year);

    let totalProceeds = 0;
    let totalCostBasis = 0;
    let shortTermGains = 0;
    let shortTermLosses = 0;
    let longTermGains = 0;
    let longTermLosses = 0;
    let washSaleDisallowed = 0;

    const byAssetClass: YearlyTaxSummary['byAssetClass'] = {} as any;
    const bySymbol: YearlyTaxSummary['bySymbol'] = {};

    for (const trade of trades) {
      totalProceeds += trade.proceeds;
      totalCostBasis += trade.adjustedCostBasis;
      washSaleDisallowed += trade.washSaleDisallowed;

      if (trade.isLongTerm) {
        if (trade.gainLoss >= 0) {
          longTermGains += trade.gainLoss;
        } else {
          longTermLosses += Math.abs(trade.gainLoss);
        }
      } else {
        if (trade.gainLoss >= 0) {
          shortTermGains += trade.gainLoss;
        } else {
          shortTermLosses += Math.abs(trade.gainLoss);
        }
      }

      // By asset class
      if (!byAssetClass[trade.assetClass]) {
        byAssetClass[trade.assetClass] = { proceeds: 0, costBasis: 0, gainLoss: 0, tradeCount: 0 };
      }
      byAssetClass[trade.assetClass].proceeds += trade.proceeds;
      byAssetClass[trade.assetClass].costBasis += trade.adjustedCostBasis;
      byAssetClass[trade.assetClass].gainLoss += trade.gainLoss;
      byAssetClass[trade.assetClass].tradeCount++;

      // By symbol
      if (!bySymbol[trade.symbol]) {
        bySymbol[trade.symbol] = { proceeds: 0, costBasis: 0, gainLoss: 0, tradeCount: 0 };
      }
      bySymbol[trade.symbol].proceeds += trade.proceeds;
      bySymbol[trade.symbol].costBasis += trade.adjustedCostBasis;
      bySymbol[trade.symbol].gainLoss += trade.gainLoss;
      bySymbol[trade.symbol].tradeCount++;
    }

    // Sort by gain/loss for top gainers/losers
    const symbolEntries = Object.entries(bySymbol);
    const topGainers = symbolEntries
      .filter(([, data]) => data.gainLoss > 0)
      .sort((a, b) => b[1].gainLoss - a[1].gainLoss)
      .slice(0, 10)
      .map(([symbol, data]) => ({ symbol, gainLoss: data.gainLoss }));

    const topLosers = symbolEntries
      .filter(([, data]) => data.gainLoss < 0)
      .sort((a, b) => a[1].gainLoss - b[1].gainLoss)
      .slice(0, 10)
      .map(([symbol, data]) => ({ symbol, gainLoss: data.gainLoss }));

    const netShortTerm = shortTermGains - shortTermLosses;
    const netLongTerm = longTermGains - longTermLosses;
    const totalGains = shortTermGains + longTermGains;
    const totalLosses = shortTermLosses + longTermLosses;
    const netGainLoss = totalGains - totalLosses;
    const adjustedNetGainLoss = netGainLoss + washSaleDisallowed;

    // Estimate tax liability
    const estimate = this.calculateEstimatedTax(
      userId,
      year,
      netShortTerm,
      netLongTerm,
      'single',
      100000 // Default taxable income
    );

    return {
      year,
      userId,
      totalProceeds,
      totalCostBasis,
      shortTermGains,
      shortTermLosses,
      netShortTerm,
      longTermGains,
      longTermLosses,
      netLongTerm,
      totalGains,
      totalLosses,
      netGainLoss,
      washSaleDisallowed,
      adjustedNetGainLoss,
      estimatedTaxLiability: estimate.totalEstimatedTax,
      carryforwardLoss: scheduleD.capitalLossCarryover,
      tradeCount: trades.length,
      byAssetClass,
      bySymbol,
      topGainers,
      topLosers,
    };
  }

  /**
   * Calculate estimated tax liability
   */
  calculateEstimatedTax(
    userId: string,
    year: number,
    shortTermGains: number,
    longTermGains: number,
    filingStatus: 'single' | 'married',
    taxableIncome: number,
    stateRate: number = 0.05
  ): TaxLiabilityEstimate {
    const brackets = TAX_BRACKETS_2024[filingStatus];
    const ltRates = LONG_TERM_RATES_2024[filingStatus];

    // Short-term gains taxed as ordinary income
    let shortTermTax = 0;
    let shortTermRate = 0;
    const shortTermIncome = Math.max(0, shortTermGains);

    if (shortTermIncome > 0) {
      const totalIncome = taxableIncome + shortTermIncome;
      for (const bracket of brackets) {
        if (totalIncome > bracket.min) {
          const taxableInBracket = Math.min(totalIncome, bracket.max) - Math.max(taxableIncome, bracket.min);
          if (taxableInBracket > 0) {
            shortTermTax += taxableInBracket * bracket.rate;
            shortTermRate = bracket.rate;
          }
        }
      }
    }

    // Long-term gains taxed at preferential rates
    let longTermTax = 0;
    let longTermRate = 0;
    const longTermIncome = Math.max(0, longTermGains);

    if (longTermIncome > 0) {
      const totalIncome = taxableIncome + shortTermIncome + longTermIncome;
      for (const bracket of ltRates) {
        if (totalIncome > bracket.min) {
          const taxableInBracket = Math.min(totalIncome, bracket.max) - Math.max(taxableIncome + shortTermIncome, bracket.min);
          if (taxableInBracket > 0) {
            longTermTax += Math.min(taxableInBracket, longTermIncome) * bracket.rate;
            longTermRate = bracket.rate;
          }
        }
      }
    }

    // Net Investment Income Tax (3.8%)
    let niitTax = 0;
    const niitThreshold = NIIT_THRESHOLD[filingStatus];
    const totalInvestmentIncome = shortTermIncome + longTermIncome;
    const modifiedAGI = taxableIncome + totalInvestmentIncome;

    if (modifiedAGI > niitThreshold) {
      const niitBase = Math.min(totalInvestmentIncome, modifiedAGI - niitThreshold);
      niitTax = niitBase * NIIT_THRESHOLD.niitRate;
    }

    // State tax (simplified)
    const stateTax = totalInvestmentIncome * stateRate;

    const totalEstimatedTax = shortTermTax + longTermTax + niitTax + stateTax;
    const effectiveTaxRate = totalInvestmentIncome > 0
      ? (totalEstimatedTax / totalInvestmentIncome) * 100
      : 0;

    // Calculate quarterly payments
    const quarterlyPayment = totalEstimatedTax / 4;

    return {
      year,
      shortTermGains: shortTermIncome,
      shortTermRate,
      shortTermTax: Math.round(shortTermTax * 100) / 100,
      longTermGains: longTermIncome,
      longTermRate,
      longTermTax: Math.round(longTermTax * 100) / 100,
      netInvestmentIncomeTax: Math.round(niitTax * 100) / 100,
      stateTax: Math.round(stateTax * 100) / 100,
      totalEstimatedTax: Math.round(totalEstimatedTax * 100) / 100,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
      quarterlyPayments: [
        Math.round(quarterlyPayment * 100) / 100, // Q1 - April 15
        Math.round(quarterlyPayment * 100) / 100, // Q2 - June 15
        Math.round(quarterlyPayment * 100) / 100, // Q3 - September 15
        Math.round(quarterlyPayment * 100) / 100, // Q4 - January 15
      ],
    };
  }

  // ============================================================
  // TAX-LOSS HARVESTING SUGGESTIONS
  // ============================================================

  /**
   * Find tax-loss harvesting opportunities
   */
  findHarvestingOpportunities(
    userId: string,
    positions: Array<{
      symbol: string;
      assetClass: AssetClass;
      quantity: number;
      currentPrice: number;
      costBasis: number;
      purchaseDate: Date;
    }>,
    options: {
      minLoss?: number;
      minLossPercent?: number;
      excludeWashSaleRisk?: boolean;
      taxRate?: number;
    } = {}
  ): HarvestingOpportunity[] {
    const {
      minLoss = 100,
      minLossPercent = 0.03,
      excludeWashSaleRisk = false,
      taxRate = 0.35,
    } = options;

    const opportunities: HarvestingOpportunity[] = [];
    const recentSales = this.getRecentSales(userId, WASH_SALE_WINDOW_DAYS);

    for (const position of positions) {
      const currentValue = position.quantity * position.currentPrice;
      const unrealizedLoss = position.costBasis - currentValue;

      // Skip if not a loss
      if (unrealizedLoss <= 0) continue;

      const unrealizedLossPercent = unrealizedLoss / position.costBasis;

      // Check minimum thresholds
      if (unrealizedLoss < minLoss) continue;
      if (unrealizedLossPercent < minLossPercent) continue;

      const daysHeld = Math.floor(
        (Date.now() - new Date(position.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const isLongTerm = daysHeld > LONG_TERM_HOLDING_DAYS;

      // Check wash sale risk
      const hasRecentSale = recentSales.some(s => s.symbol === position.symbol);
      const washSaleWindowEnd = hasRecentSale
        ? new Date(Date.now() + WASH_SALE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
        : undefined;

      if (excludeWashSaleRisk && hasRecentSale) continue;

      // Calculate estimated tax savings
      const effectiveRate = isLongTerm ? taxRate * 0.6 : taxRate; // Long-term taxed at lower rates
      const estimatedTaxSavings = unrealizedLoss * effectiveRate;

      // Get replacement suggestions
      const suggestedReplacement = REPLACEMENT_SECURITIES[position.symbol] || [];

      // Generate recommendation
      const { recommendation, reason } = this.generateHarvestRecommendation(
        unrealizedLoss,
        unrealizedLossPercent,
        estimatedTaxSavings,
        hasRecentSale,
        isLongTerm,
        suggestedReplacement.length
      );

      opportunities.push({
        id: `harv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        symbol: position.symbol,
        assetClass: position.assetClass,
        currentValue,
        costBasis: position.costBasis,
        unrealizedLoss,
        unrealizedLossPercent,
        isLongTerm,
        daysHeld,
        estimatedTaxSavings,
        suggestedReplacement,
        washSaleRisk: hasRecentSale,
        washSaleWindowEnd,
        recommendation,
        recommendationReason: reason,
      });
    }

    // Sort by estimated tax savings
    opportunities.sort((a, b) => b.estimatedTaxSavings - a.estimatedTaxSavings);

    return opportunities;
  }

  /**
   * Generate harvest recommendation
   */
  private generateHarvestRecommendation(
    loss: number,
    lossPercent: number,
    taxSavings: number,
    washSaleRisk: boolean,
    isLongTerm: boolean,
    hasReplacements: number
  ): { recommendation: HarvestingOpportunity['recommendation']; reason: string } {
    if (washSaleRisk) {
      return {
        recommendation: 'wait',
        reason: 'Wait for wash sale window to close before harvesting',
      };
    }

    if (hasReplacements === 0) {
      return {
        recommendation: 'avoid',
        reason: 'No suitable replacement securities identified',
      };
    }

    if (lossPercent >= 0.10 && taxSavings >= 500) {
      return {
        recommendation: 'strong_harvest',
        reason: `Significant loss (${(lossPercent * 100).toFixed(1)}%) with $${taxSavings.toFixed(0)} potential tax savings`,
      };
    }

    if (lossPercent >= 0.05 && taxSavings >= 100) {
      return {
        recommendation: 'consider',
        reason: `Moderate loss opportunity with $${taxSavings.toFixed(0)} potential tax savings`,
      };
    }

    if (isLongTerm) {
      return {
        recommendation: 'consider',
        reason: 'Long-term loss - consider if you have offsetting gains',
      };
    }

    return {
      recommendation: 'consider',
      reason: `Minor loss - $${taxSavings.toFixed(0)} potential savings`,
    };
  }

  /**
   * Get recent sales for wash sale checking
   */
  private getRecentSales(userId: string, days: number): CompletedTrade[] {
    const trades = this.completedTrades.get(userId) || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return trades.filter(t => t.dateSold >= cutoff);
  }

  // ============================================================
  // DATA RETRIEVAL
  // ============================================================

  /**
   * Get completed trades for a user
   */
  getCompletedTrades(userId: string, year?: number): CompletedTrade[] {
    let trades = this.completedTrades.get(userId) || [];

    if (year) {
      trades = trades.filter(t =>
        new Date(t.dateSold).getFullYear() === year
      );
    }

    return trades;
  }

  /**
   * Get capital gains report
   */
  getCapitalGainsReport(userId: string, year: number): {
    shortTerm: { gains: number; losses: number; net: number; trades: CompletedTrade[] };
    longTerm: { gains: number; losses: number; net: number; trades: CompletedTrade[] };
    total: { gains: number; losses: number; net: number };
    washSaleAdjustments: number;
  } {
    const trades = this.getCompletedTrades(userId, year);

    const shortTermTrades = trades.filter(t => !t.isLongTerm);
    const longTermTrades = trades.filter(t => t.isLongTerm);

    const shortTermGains = shortTermTrades.filter(t => t.gainLoss > 0).reduce((s, t) => s + t.gainLoss, 0);
    const shortTermLosses = shortTermTrades.filter(t => t.gainLoss < 0).reduce((s, t) => s + Math.abs(t.gainLoss), 0);
    const longTermGains = longTermTrades.filter(t => t.gainLoss > 0).reduce((s, t) => s + t.gainLoss, 0);
    const longTermLosses = longTermTrades.filter(t => t.gainLoss < 0).reduce((s, t) => s + Math.abs(t.gainLoss), 0);
    const washSaleAdjustments = trades.reduce((s, t) => s + t.washSaleDisallowed, 0);

    return {
      shortTerm: {
        gains: shortTermGains,
        losses: shortTermLosses,
        net: shortTermGains - shortTermLosses,
        trades: shortTermTrades,
      },
      longTerm: {
        gains: longTermGains,
        losses: longTermLosses,
        net: longTermGains - longTermLosses,
        trades: longTermTrades,
      },
      total: {
        gains: shortTermGains + longTermGains,
        losses: shortTermLosses + longTermLosses,
        net: (shortTermGains + longTermGains) - (shortTermLosses + longTermLosses),
      },
      washSaleAdjustments,
    };
  }

  // ============================================================
  // EXPORT FUNCTIONALITY
  // ============================================================

  /**
   * Export tax data in various formats
   */
  exportTaxData(
    userId: string,
    year: number,
    format: ExportFormat,
    options?: {
      includeForm8949?: boolean;
      includeScheduleD?: boolean;
      includeSummary?: boolean;
      includeAllTrades?: boolean;
    }
  ): ExportResult {
    const {
      includeForm8949 = true,
      includeScheduleD = true,
      includeSummary = true,
      includeAllTrades = true,
    } = options || {};

    const trades = this.getCompletedTrades(userId, year);
    const form8949 = includeForm8949 ? this.generateForm8949(userId, year) : null;
    const scheduleD = includeScheduleD ? this.generateScheduleD(userId, year) : null;
    const summary = includeSummary ? this.generateYearlySummary(userId, year) : null;

    let data: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'CSV':
        data = this.generateCSV(trades, form8949, scheduleD, summary);
        filename = `tax_report_${year}.csv`;
        mimeType = 'text/csv';
        break;

      case 'PDF':
        // PDF generation would require a PDF library
        data = this.generatePDFContent(trades, form8949, scheduleD, summary);
        filename = `tax_report_${year}.pdf`;
        mimeType = 'application/pdf';
        break;

      case 'TURBOTAX':
        data = this.generateTurboTaxFormat(trades, year);
        filename = `turbotax_import_${year}.txf`;
        mimeType = 'application/x-txf';
        break;

      case 'HRBLOCK':
        data = this.generateHRBlockFormat(trades, year);
        filename = `hrblock_import_${year}.csv`;
        mimeType = 'text/csv';
        break;

      case 'JSON':
      default:
        data = JSON.stringify({
          year,
          trades: includeAllTrades ? trades : undefined,
          form8949,
          scheduleD,
          summary,
        }, null, 2);
        filename = `tax_report_${year}.json`;
        mimeType = 'application/json';
        break;
    }

    return {
      format,
      filename,
      data,
      mimeType,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate CSV export
   */
  private generateCSV(
    trades: CompletedTrade[],
    form8949: ReturnType<typeof this.generateForm8949> | null,
    scheduleD: ScheduleDSummary | null,
    summary: YearlyTaxSummary | null
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('Description,Date Acquired,Date Sold,Proceeds,Cost Basis,Adjustment Code,Adjustment Amount,Gain/Loss,Form 8949 Box');

    // Trade data
    for (const trade of trades) {
      lines.push([
        `"${trade.quantity} ${trade.symbol}"`,
        this.formatDateForIRS(trade.dateAcquired),
        this.formatDateForIRS(trade.dateSold),
        trade.proceeds.toFixed(2),
        trade.adjustedCostBasis.toFixed(2),
        trade.adjustmentCode || '',
        trade.washSaleDisallowed.toFixed(2),
        trade.gainLoss.toFixed(2),
        trade.form8949Box,
      ].join(','));
    }

    // Summary section
    if (summary) {
      lines.push('');
      lines.push('SUMMARY');
      lines.push(`Total Proceeds,${summary.totalProceeds.toFixed(2)}`);
      lines.push(`Total Cost Basis,${summary.totalCostBasis.toFixed(2)}`);
      lines.push(`Net Short-Term,${summary.netShortTerm.toFixed(2)}`);
      lines.push(`Net Long-Term,${summary.netLongTerm.toFixed(2)}`);
      lines.push(`Net Gain/Loss,${summary.netGainLoss.toFixed(2)}`);
      lines.push(`Wash Sale Disallowed,${summary.washSaleDisallowed.toFixed(2)}`);
      lines.push(`Estimated Tax Liability,${summary.estimatedTaxLiability.toFixed(2)}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate PDF content (placeholder - would need PDF library)
   */
  private generatePDFContent(
    trades: CompletedTrade[],
    form8949: ReturnType<typeof this.generateForm8949> | null,
    scheduleD: ScheduleDSummary | null,
    summary: YearlyTaxSummary | null
  ): string {
    // This would generate actual PDF using a library like pdfkit
    // For now, return a text representation
    return `TAX REPORT\n\nTrades: ${trades.length}\nSummary: ${JSON.stringify(summary, null, 2)}`;
  }

  /**
   * Generate TurboTax TXF format
   */
  private generateTurboTaxFormat(trades: CompletedTrade[], year: number): string {
    const lines: string[] = [];

    // TXF header
    lines.push('V042');
    lines.push('ATIME Tax Export');
    lines.push(`D${year}`);

    for (const trade of trades) {
      // TXF format codes
      const typeCode = trade.isLongTerm ? '711' : '321'; // Long-term vs Short-term sales
      lines.push(`TD`);
      lines.push(`N${typeCode}`);
      lines.push(`C1`);
      lines.push(`L1`);
      lines.push(`P${trade.quantity} sh ${trade.symbol}`);
      lines.push(`D${this.formatDateForIRS(trade.dateAcquired)}`);
      lines.push(`D${this.formatDateForIRS(trade.dateSold)}`);
      lines.push(`$${trade.proceeds.toFixed(2)}`);
      lines.push(`$${trade.adjustedCostBasis.toFixed(2)}`);
      if (trade.washSaleDisallowed > 0) {
        lines.push(`$${trade.washSaleDisallowed.toFixed(2)}`);
      }
      lines.push('^');
    }

    return lines.join('\n');
  }

  /**
   * Generate H&R Block format
   */
  private generateHRBlockFormat(trades: CompletedTrade[], year: number): string {
    const lines: string[] = [];

    // H&R Block CSV header
    lines.push('Description,Acquired,Sold,Proceeds,Cost,Code,Adjustment,Gain/Loss,Short/Long');

    for (const trade of trades) {
      lines.push([
        `"${trade.quantity} ${trade.symbol}"`,
        this.formatDateForIRS(trade.dateAcquired),
        this.formatDateForIRS(trade.dateSold),
        trade.proceeds.toFixed(2),
        trade.adjustedCostBasis.toFixed(2),
        trade.adjustmentCode || '',
        trade.washSaleDisallowed.toFixed(2),
        trade.gainLoss.toFixed(2),
        trade.isLongTerm ? 'Long-Term' : 'Short-Term',
      ].join(','));
    }

    return lines.join('\n');
  }

  // ============================================================
  // SAMPLE DATA FOR TESTING
  // ============================================================

  /**
   * Generate sample data for testing/demo
   */
  generateSampleData(userId: string): void {
    const now = new Date();
    const year = now.getFullYear();

    // Add some sample tax lots
    const sampleLots = [
      {
        userId,
        accountId: 'demo_account',
        symbol: 'AAPL',
        assetClass: 'stock' as AssetClass,
        quantity: 100,
        costBasisPerShare: 150,
        totalCostBasis: 15000,
        purchaseDate: new Date(year - 1, 2, 15),
        purchasePrice: 150,
        fees: 7,
      },
      {
        userId,
        accountId: 'demo_account',
        symbol: 'MSFT',
        assetClass: 'stock' as AssetClass,
        quantity: 50,
        costBasisPerShare: 280,
        totalCostBasis: 14000,
        purchaseDate: new Date(year, 1, 10),
        purchasePrice: 280,
        fees: 5,
      },
      {
        userId,
        accountId: 'demo_account',
        symbol: 'BTC',
        assetClass: 'crypto' as AssetClass,
        quantity: 0.5,
        costBasisPerShare: 45000,
        totalCostBasis: 22500,
        purchaseDate: new Date(year - 2, 6, 20),
        purchasePrice: 45000,
        fees: 50,
      },
      {
        userId,
        accountId: 'demo_account',
        symbol: 'SPY',
        assetClass: 'etf' as AssetClass,
        quantity: 30,
        costBasisPerShare: 420,
        totalCostBasis: 12600,
        purchaseDate: new Date(year, 4, 5),
        purchasePrice: 420,
        fees: 3,
      },
    ];

    for (const lot of sampleLots) {
      this.addTaxLot(lot);
    }

    // Record some sample sales
    this.recordSale(
      userId,
      'demo_account',
      'AAPL',
      'stock',
      50,
      new Date(year, 8, 15),
      175, // Sold at profit
      7,
      'FIFO'
    );

    this.recordSale(
      userId,
      'demo_account',
      'SPY',
      'etf',
      15,
      new Date(year, 9, 1),
      405, // Sold at loss
      3,
      'FIFO'
    );

    logger.info('Sample tax data generated', { userId });
  }
}

// Export singleton instance
export const taxReportingEngine = new TaxReportingEngine();

logger.info('Tax Reporting Engine initialized - Comprehensive tax reporting enabled');

/**
 * Platform Fee Service
 *
 * Handles 10% platform fee for Money Machine and DropBot trades.
 * TIMEBEUNUS (owner) has no fees.
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('PlatformFeeService');

export interface TradeWithFee {
  originalAmount: number;
  feeAmount: number;
  feePercentage: number;
  netAmount: number;
  userType: 'timebeunus' | 'money_machine' | 'dropbot';
  feeApplied: boolean;
  feeWaived: boolean;
  waiverReason?: string;
}

export interface FeeConfig {
  moneyMachineFee: number; // 10%
  dropbotFee: number; // 10%
  timebeunusFee: number; // 0% (owner)
  minFee: number; // minimum fee in dollars
  maxFee: number; // maximum fee in dollars
}

class PlatformFeeService {
  private config: FeeConfig = {
    moneyMachineFee: 0.10, // 10%
    dropbotFee: 0.10, // 10%
    timebeunusFee: 0, // Owner pays no fees
    minFee: 0.01, // $0.01 minimum
    maxFee: 500, // $500 maximum per trade
  };

  private totalFeesCollected: number = 0;
  private feesByUser: Map<string, number> = new Map();

  /**
   * Calculate fee for a trade
   */
  calculateFee(
    tradeAmount: number,
    userType: 'timebeunus' | 'money_machine' | 'dropbot',
    userId?: string
  ): TradeWithFee {
    let feePercentage = 0;
    let feeApplied = true;
    let feeWaived = false;
    let waiverReason: string | undefined;

    // TIMEBEUNUS (owner) has no fees
    if (userType === 'timebeunus') {
      feePercentage = this.config.timebeunusFee;
      feeApplied = false;
      feeWaived = true;
      waiverReason = 'Platform owner - no fees';
    } else if (userType === 'money_machine') {
      feePercentage = this.config.moneyMachineFee;
    } else if (userType === 'dropbot') {
      feePercentage = this.config.dropbotFee;
    }

    let feeAmount = tradeAmount * feePercentage;

    // Apply min/max fee limits
    if (feeAmount > 0) {
      feeAmount = Math.max(this.config.minFee, Math.min(this.config.maxFee, feeAmount));
    }

    const netAmount = tradeAmount - feeAmount;

    // Track fees
    if (feeAmount > 0) {
      this.totalFeesCollected += feeAmount;
      if (userId) {
        const currentUserFees = this.feesByUser.get(userId) || 0;
        this.feesByUser.set(userId, currentUserFees + feeAmount);
      }
    }

    logger.info('Fee calculated', {
      tradeAmount,
      userType,
      feePercentage: `${(feePercentage * 100).toFixed(1)}%`,
      feeAmount: `$${feeAmount.toFixed(2)}`,
      netAmount: `$${netAmount.toFixed(2)}`,
    });

    return {
      originalAmount: tradeAmount,
      feeAmount,
      feePercentage,
      netAmount,
      userType,
      feeApplied,
      feeWaived,
      waiverReason,
    };
  }

  /**
   * Deduct fee from trade (background deduction)
   */
  deductFee(tradeAmount: number, userType: 'timebeunus' | 'money_machine' | 'dropbot'): number {
    const feeResult = this.calculateFee(tradeAmount, userType);
    return feeResult.netAmount;
  }

  /**
   * Get total fees collected
   */
  getTotalFeesCollected(): number {
    return this.totalFeesCollected;
  }

  /**
   * Get fees by user
   */
  getUserFees(userId: string): number {
    return this.feesByUser.get(userId) || 0;
  }

  /**
   * Get fee statistics
   */
  getStats() {
    return {
      totalFeesCollected: this.totalFeesCollected,
      totalUsersCharged: this.feesByUser.size,
      feeConfig: this.config,
      breakdown: {
        moneyMachine: `${(this.config.moneyMachineFee * 100).toFixed(0)}% per trade`,
        dropbot: `${(this.config.dropbotFee * 100).toFixed(0)}% per trade`,
        timebeunus: 'No fees (owner)',
      },
    };
  }

  /**
   * Update fee configuration (owner only)
   */
  updateConfig(newConfig: Partial<FeeConfig>): FeeConfig {
    this.config = { ...this.config, ...newConfig };
    logger.info('Fee config updated', this.config);
    return this.config;
  }
}

export const platformFeeService = new PlatformFeeService();

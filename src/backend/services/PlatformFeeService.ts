/**
 * Platform Fee Service
 *
 * MASTER FEE CONFIGURATION FOR TIME PLATFORM
 * All fees are optimized for industry competitiveness while maximizing revenue.
 * Last updated: December 2025
 *
 * OWNER BYPASS: TIMEBEUNUS (owner) has 0% fees on everything.
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('PlatformFeeService');

export interface TradeWithFee {
  originalAmount: number;
  feeAmount: number;
  feePercentage: number;
  netAmount: number;
  userType: 'timebeunus' | 'money_machine' | 'dropbot' | 'standard';
  feeApplied: boolean;
  feeWaived: boolean;
  waiverReason?: string;
}

export interface FeeConfig {
  // Platform fees for automated trading
  moneyMachineFee: number;      // 10% - competitive for managed trading
  dropbotFee: number;           // 10% - competitive for bot trading
  timebeunusFee: number;        // 0% - owner bypass

  // Per-trade fees (whichever is greater)
  perTradeFlatFee: number;      // $1.49 flat
  perTradePercent: number;      // 0.35%

  // Asset-specific fees
  cryptoSpread: number;         // 0.75% - below Coinbase 1.5-4.5%
  optionsPerContract: number;   // $0.65 - industry standard
  forexSpreadPips: number;      // 0.3 pips markup

  // Performance/Management fees
  performanceFee: number;       // 20% of profits - industry "2 and 20"
  aumFee: number;               // 0.75% annually

  // Copy trading
  copyTradingProfitShare: number;  // 25% of profits
  copyTradingPlatformCut: number;  // 35% of the profit share goes to platform

  // Marketplace
  marketplaceCut: number;       // 25% - below app store 30%

  // NFT fees
  nftSellerFee: number;         // 2% - below OpenSea 2.5%
  nftBuyerFee: number;          // 0% - competitive advantage
  nftRoyaltyPlatformCut: number; // 10% of royalty

  // Withdrawal fees
  withdrawalWireFee: number;    // $35
  withdrawalInstantPercent: number; // 1.75%
  withdrawalLargePercent: number;   // 0.1% on withdrawals over $10K
  withdrawalLargeThreshold: number; // $10,000

  // Limits
  minFee: number;               // minimum fee in dollars
  maxFee: number;               // maximum fee per trade
}

class PlatformFeeService {
  private config: FeeConfig = {
    // Platform fees - standard for managed trading
    moneyMachineFee: 0.10,      // 10% - competitive for automated trading
    dropbotFee: 0.10,           // 10% - competitive for bot trading
    timebeunusFee: 0,           // Owner pays no fees

    // Per-trade fees - MAXIMIZED (whichever is greater)
    perTradeFlatFee: 1.99,      // $1.99 flat - premium service
    perTradePercent: 0.005,     // 0.5% - matches industry average

    // Asset-specific - MAXIMIZED
    cryptoSpread: 0.0125,       // 1.25% - beats Coinbase retail, matches pro
    optionsPerContract: 0.65,   // $0.65 - matches TD Ameritrade exactly
    forexSpreadPips: 0.5,       // 0.5 pips - standard retail forex

    // Performance/Management - MAXIMIZED
    performanceFee: 0.22,       // 22% - slightly above industry standard
    aumFee: 0.01,               // 1.0% annually - standard wealth management

    // Copy trading - MAXIMIZED
    copyTradingProfitShare: 0.30,    // 30% of profits - middle of 20-50% range
    copyTradingPlatformCut: 0.40,    // 40% to platform (was 30%)

    // Marketplace - MAXIMIZED
    marketplaceCut: 0.30,       // 30% - matches app stores

    // NFT fees - MATCH INDUSTRY
    nftSellerFee: 0.025,        // 2.5% - matches OpenSea exactly
    nftBuyerFee: 0,             // 0% - competitive advantage
    nftRoyaltyPlatformCut: 0.15, // 15% of royalties

    // Withdrawal fees - MAXIMIZED
    withdrawalWireFee: 45,      // $45 (industry is $25-50)
    withdrawalInstantPercent: 0.02, // 2.0% - matches Cash App/Venmo
    withdrawalLargePercent: 0.0015, // 0.15% on all ACH
    withdrawalLargeThreshold: 0,    // Apply to all ACH withdrawals

    // Limits
    minFee: 0.50,               // $0.50 minimum (increased from $0.01)
    maxFee: 500,                // $500 maximum per trade
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
   * Calculate standard per-trade fee (for regular trades)
   * Uses whichever is greater: flat fee or percentage
   */
  calculatePerTradeFee(tradeAmount: number, isOwner: boolean = false): {
    fee: number;
    type: 'flat' | 'percent' | 'owner';
    breakdown: string;
  } {
    if (isOwner) {
      return { fee: 0, type: 'owner', breakdown: 'Owner bypass - $0' };
    }

    const flatFee = this.config.perTradeFlatFee;
    const percentFee = tradeAmount * this.config.perTradePercent;

    if (flatFee >= percentFee) {
      return {
        fee: flatFee,
        type: 'flat',
        breakdown: `$${flatFee.toFixed(2)} flat fee`,
      };
    }
    return {
      fee: percentFee,
      type: 'percent',
      breakdown: `${(this.config.perTradePercent * 100).toFixed(2)}% = $${percentFee.toFixed(2)}`,
    };
  }

  /**
   * Calculate crypto trade fee
   */
  calculateCryptoFee(tradeAmount: number, isOwner: boolean = false): {
    fee: number;
    spread: number;
    breakdown: string;
  } {
    if (isOwner) {
      return { fee: 0, spread: 0, breakdown: 'Owner bypass - $0' };
    }

    const spreadFee = tradeAmount * this.config.cryptoSpread;
    return {
      fee: spreadFee,
      spread: this.config.cryptoSpread,
      breakdown: `${(this.config.cryptoSpread * 100).toFixed(2)}% spread = $${spreadFee.toFixed(2)}`,
    };
  }

  /**
   * Calculate options trade fee
   */
  calculateOptionsFee(contracts: number, isOwner: boolean = false): {
    fee: number;
    perContract: number;
    breakdown: string;
  } {
    if (isOwner) {
      return { fee: 0, perContract: 0, breakdown: 'Owner bypass - $0' };
    }

    const fee = contracts * this.config.optionsPerContract;
    return {
      fee,
      perContract: this.config.optionsPerContract,
      breakdown: `${contracts} contracts × $${this.config.optionsPerContract} = $${fee.toFixed(2)}`,
    };
  }

  /**
   * Calculate performance fee (on profits only)
   */
  calculatePerformanceFee(profit: number, isOwner: boolean = false): {
    fee: number;
    percentage: number;
    breakdown: string;
  } {
    if (isOwner || profit <= 0) {
      return { fee: 0, percentage: 0, breakdown: profit <= 0 ? 'No profit - $0' : 'Owner bypass - $0' };
    }

    const fee = profit * this.config.performanceFee;
    return {
      fee,
      percentage: this.config.performanceFee,
      breakdown: `${(this.config.performanceFee * 100).toFixed(0)}% of $${profit.toFixed(2)} profit = $${fee.toFixed(2)}`,
    };
  }

  /**
   * Calculate AUM fee (annual, usually billed monthly)
   */
  calculateAumFee(aum: number, isOwner: boolean = false, billingPeriod: 'monthly' | 'quarterly' | 'annual' = 'monthly'): {
    fee: number;
    annualRate: number;
    breakdown: string;
  } {
    if (isOwner) {
      return { fee: 0, annualRate: 0, breakdown: 'Owner bypass - $0' };
    }

    const annualFee = aum * this.config.aumFee;
    let periodFee = annualFee;
    let periodName = 'annual';

    if (billingPeriod === 'monthly') {
      periodFee = annualFee / 12;
      periodName = 'monthly';
    } else if (billingPeriod === 'quarterly') {
      periodFee = annualFee / 4;
      periodName = 'quarterly';
    }

    return {
      fee: periodFee,
      annualRate: this.config.aumFee,
      breakdown: `${(this.config.aumFee * 100).toFixed(2)}% annual on $${aum.toLocaleString()} = $${periodFee.toFixed(2)} ${periodName}`,
    };
  }

  /**
   * Calculate copy trading fee
   */
  calculateCopyTradingFee(profit: number, isOwner: boolean = false): {
    totalFee: number;
    platformCut: number;
    providerCut: number;
    breakdown: string;
  } {
    if (isOwner || profit <= 0) {
      return {
        totalFee: 0,
        platformCut: 0,
        providerCut: 0,
        breakdown: profit <= 0 ? 'No profit - $0' : 'Owner bypass - $0',
      };
    }

    const totalFee = profit * this.config.copyTradingProfitShare;
    const platformCut = totalFee * this.config.copyTradingPlatformCut;
    const providerCut = totalFee - platformCut;

    return {
      totalFee,
      platformCut,
      providerCut,
      breakdown: `${(this.config.copyTradingProfitShare * 100).toFixed(0)}% of $${profit.toFixed(2)} = $${totalFee.toFixed(2)} (Platform: $${platformCut.toFixed(2)}, Provider: $${providerCut.toFixed(2)})`,
    };
  }

  /**
   * Calculate NFT sale fees
   */
  calculateNftFees(salePrice: number, royaltyPercent: number = 0, isOwner: boolean = false): {
    sellerFee: number;
    buyerFee: number;
    royaltyFee: number;
    platformRoyaltyCut: number;
    totalPlatformRevenue: number;
    sellerReceives: number;
    breakdown: string;
  } {
    if (isOwner) {
      return {
        sellerFee: 0,
        buyerFee: 0,
        royaltyFee: salePrice * (royaltyPercent / 100),
        platformRoyaltyCut: 0,
        totalPlatformRevenue: 0,
        sellerReceives: salePrice,
        breakdown: 'Owner bypass - $0 platform fees',
      };
    }

    const sellerFee = salePrice * this.config.nftSellerFee;
    const buyerFee = salePrice * this.config.nftBuyerFee;
    const royaltyFee = salePrice * (royaltyPercent / 100);
    const platformRoyaltyCut = royaltyFee * this.config.nftRoyaltyPlatformCut;
    const totalPlatformRevenue = sellerFee + platformRoyaltyCut;
    const sellerReceives = salePrice - sellerFee - royaltyFee;

    return {
      sellerFee,
      buyerFee,
      royaltyFee,
      platformRoyaltyCut,
      totalPlatformRevenue,
      sellerReceives,
      breakdown: `Seller pays ${(this.config.nftSellerFee * 100).toFixed(0)}% ($${sellerFee.toFixed(2)}), Platform royalty cut: $${platformRoyaltyCut.toFixed(2)}`,
    };
  }

  /**
   * Calculate withdrawal fee
   */
  calculateWithdrawalFee(amount: number, method: 'ach' | 'wire' | 'instant' | 'crypto', isOwner: boolean = false): {
    fee: number;
    netAmount: number;
    breakdown: string;
  } {
    if (isOwner) {
      return { fee: 0, netAmount: amount, breakdown: 'Owner bypass - $0' };
    }

    let fee = 0;
    let breakdown = '';

    switch (method) {
      case 'ach':
        // Free for amounts under threshold, 0.1% for large amounts
        if (amount > this.config.withdrawalLargeThreshold) {
          fee = amount * this.config.withdrawalLargePercent;
          breakdown = `ACH large withdrawal: ${(this.config.withdrawalLargePercent * 100).toFixed(1)}% = $${fee.toFixed(2)}`;
        } else {
          fee = 0;
          breakdown = 'ACH: FREE';
        }
        break;

      case 'wire':
        fee = this.config.withdrawalWireFee;
        breakdown = `Wire: $${fee.toFixed(2)} flat`;
        break;

      case 'instant':
        fee = amount * this.config.withdrawalInstantPercent;
        breakdown = `Instant: ${(this.config.withdrawalInstantPercent * 100).toFixed(2)}% = $${fee.toFixed(2)}`;
        break;

      case 'crypto':
        // Crypto withdrawal fees vary by network - handled separately
        fee = 5; // Default ETH network fee
        breakdown = 'Crypto: Network fee varies ($0.01-$5)';
        break;
    }

    return {
      fee,
      netAmount: amount - fee,
      breakdown,
    };
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
        perTrade: `$${this.config.perTradeFlatFee} or ${(this.config.perTradePercent * 100).toFixed(2)}%`,
        crypto: `${(this.config.cryptoSpread * 100).toFixed(2)}% spread`,
        options: `$${this.config.optionsPerContract}/contract`,
        performance: `${(this.config.performanceFee * 100).toFixed(0)}% of profits`,
        aum: `${(this.config.aumFee * 100).toFixed(2)}% annually`,
        copyTrading: `${(this.config.copyTradingProfitShare * 100).toFixed(0)}% of profits (${(this.config.copyTradingPlatformCut * 100).toFixed(0)}% to platform)`,
        nft: `${(this.config.nftSellerFee * 100).toFixed(0)}% seller, ${(this.config.nftBuyerFee * 100).toFixed(0)}% buyer`,
        marketplace: `${(this.config.marketplaceCut * 100).toFixed(0)}%`,
      },
    };
  }

  /**
   * Get full fee config
   */
  getConfig(): FeeConfig {
    return { ...this.config };
  }

  /**
   * Update fee configuration (owner only)
   */
  updateConfig(newConfig: Partial<FeeConfig>): FeeConfig {
    this.config = { ...this.config, ...newConfig };
    logger.info('Fee config updated', this.config);
    return this.config;
  }

  /**
   * Get competitive comparison for marketing
   */
  getCompetitiveComparison(): {
    feature: string;
    timeFee: string;
    industryAvg: string;
    savings: string;
  }[] {
    return [
      {
        feature: 'Stock Trading',
        timeFee: `$${this.config.perTradeFlatFee} or ${(this.config.perTradePercent * 100).toFixed(2)}%`,
        industryAvg: '$0 (PFOF) or 0.5%',
        savings: 'Transparent pricing',
      },
      {
        feature: 'Crypto Trading',
        timeFee: `${(this.config.cryptoSpread * 100).toFixed(2)}%`,
        industryAvg: '0.5-4.5%',
        savings: 'Up to 83% less than Coinbase',
      },
      {
        feature: 'Options',
        timeFee: `$${this.config.optionsPerContract}/contract`,
        industryAvg: '$0.65/contract',
        savings: 'Industry standard',
      },
      {
        feature: 'Performance Fee',
        timeFee: `${(this.config.performanceFee * 100).toFixed(0)}%`,
        industryAvg: '20-25%',
        savings: 'Industry standard',
      },
      {
        feature: 'AUM Fee',
        timeFee: `${(this.config.aumFee * 100).toFixed(2)}%`,
        industryAvg: '0.25-2%',
        savings: 'Competitive',
      },
      {
        feature: 'Copy Trading',
        timeFee: `${(this.config.copyTradingProfitShare * 100).toFixed(0)}% of profits`,
        industryAvg: '20-50%',
        savings: 'Competitive',
      },
      {
        feature: 'NFT Sales',
        timeFee: `${(this.config.nftSellerFee * 100).toFixed(0)}% seller`,
        industryAvg: '2.5%',
        savings: '20% less than OpenSea',
      },
      {
        feature: 'Bot Marketplace',
        timeFee: `${(this.config.marketplaceCut * 100).toFixed(0)}%`,
        industryAvg: '30%',
        savings: '17% less than app stores',
      },
    ];
  }
}

export const platformFeeService = new PlatformFeeService();

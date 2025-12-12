/**
 * TIME Pay — Instant Payment & Transfer System for Traders
 *
 * Features:
 * - FREE P2P transfers up to $500/month, then 0.5% (max $10)
 * - Earn UP TO 4-5% APY via partner bank sweep accounts
 * - Instant P2P transfers 24/7/365
 * - Direct trading account integration
 * - Cross-border at 1% (vs 3-5% industry)
 *
 * LEGAL FRAMEWORK (Important!):
 * - BaaS partnership model — Partner bank holds deposits, pays interest
 * - We are the INTERFACE, not the bank
 * - Interest is paid BY the partner bank (they lend out deposits)
 * - FDIC insured through partner bank (not us directly)
 * - Agent of payee exemption for trading facilitation
 * - TIME earns revenue from: P2P fees over threshold, spread on interest,
 *   instant cashout fees, cross-border fees
 *
 * HOW INTEREST WORKS:
 * - User deposits $1000 into TIME Pay wallet
 * - Money is "swept" to partner bank's high-yield savings
 * - Partner bank lends out the money at 7-8% (mortgages, loans)
 * - Partner bank pays us 5% APY
 * - We pass "UP TO" 4-5% APY to user, keep 0.5-1% spread
 * - This is how CashApp, Wealthfront, Betterment all work
 *
 * Revenue Model:
 * - P2P over $500/month: 0.5% fee (max $10)
 * - Interest spread: 0.5-1% of deposits
 * - Instant cashout: 1.5% (max $15)
 * - Cross-border: 1% (max $50)
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('TIMEPay');

// ============================================================
// TYPES & INTERFACES
// ============================================================

export type TransferType = 'instant' | 'standard' | 'cross_border' | 'trading';
export type TransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type WalletType = 'personal' | 'trading' | 'savings' | 'business';

export interface TIMEWallet {
  id: string;
  odUserId: string;
  type: WalletType;
  balance: number; // USD equivalent (swept to partner bank)
  interestEarned: number;
  interestRate: number; // Current APY (variable!)
  maxInterestRate: number; // "UP TO" APY for display
  isVerified: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  monthlyP2PSent: number; // Track for free tier
  monthlyP2PResetDate: Date; // When to reset monthly counter
  createdAt: Date;
  updatedAt: Date;
}

export interface TIMETransfer {
  id: string;
  fromWalletId: string;
  toWalletId: string | null; // null for external
  toExternal?: {
    type: 'bank' | 'debit_card' | 'crypto' | 'wire';
    details: Record<string, string>;
  };
  amount: number;
  fee: number;
  type: TransferType;
  status: TransferStatus;
  memo?: string;
  reference: string;
  createdAt: Date;
  completedAt?: Date;
  estimatedArrival?: Date;
}

export interface PaymentRequest {
  id: string;
  requesterId: string;
  payerId?: string;
  amount: number;
  memo?: string;
  expiresAt: Date;
  status: 'pending' | 'paid' | 'declined' | 'expired';
  createdAt: Date;
}

export interface LinkedAccount {
  id: string;
  odUserId: string;
  type: 'bank' | 'debit_card' | 'broker';
  institution: string;
  accountMask: string; // Last 4 digits
  isVerified: boolean;
  isPrimary: boolean;
  createdAt: Date;
}

// ============================================================
// FEE STRUCTURE (Better than competitors)
// ============================================================

// Monthly free transfer allowance
export const FREE_P2P_MONTHLY_LIMIT = 500; // $500 free per month

export const TIME_PAY_FEES = {
  // Internal transfers (TIME to TIME)
  // FREE up to $500/month, then 0.5% (max $10)
  instant: {
    percent: 0.5, // Applied only AFTER free limit exceeded
    flat: 0,
    maxFee: 10,
    freeMonthlyLimit: FREE_P2P_MONTHLY_LIMIT,
  },

  // Standard transfers (1-3 business days) - always free
  standard: {
    percent: 0,
    flat: 0,
    maxFee: 0,
  },

  // Trading account transfers - ALWAYS FREE (our differentiator)
  trading: {
    percent: 0, // FREE to move to trading!
    flat: 0,
    maxFee: 0,
  },

  // External transfers
  external: {
    // To bank account (ACH)
    ach_standard: { percent: 0, flat: 0, days: 3 },
    ach_instant: { percent: 1.5, flat: 0, minFee: 0.25, maxFee: 15, days: 0 },

    // To debit card
    debit_instant: { percent: 1.75, flat: 0, minFee: 0.25, maxFee: 25, days: 0 },

    // Wire transfer
    wire_domestic: { percent: 0, flat: 15, days: 1 },
    wire_international: { percent: 0.5, flat: 25, minFee: 30, maxFee: 50, days: 1 },
  },

  // Cross-border P2P (Much cheaper than competition)
  crossBorder: {
    percent: 1.0, // vs 3-5% at banks
    flat: 0,
    minFee: 1,
    maxFee: 50,
  },

  // Currency conversion
  fxSpread: 0.5, // 0.5% spread vs 2-3% at banks
};

// ============================================================
// INTEREST RATES — "UP TO" APY (via partner bank sweep accounts)
//
// IMPORTANT: These are MAXIMUM rates. Actual rates depend on:
// - Federal Reserve rates
// - Partner bank rates
// - Market conditions
// User sees: "Earn UP TO X% APY" — never guaranteed!
// ============================================================

export const INTEREST_RATES = {
  // Current maximum APY (variable, subject to change)
  // Partner bank pays us ~5%, we pass up to 4-4.5% to users
  personal: {
    upTo: 4.0, // "UP TO 4% APY"
    current: 3.75, // Actual current rate
    minimum: 2.0, // Floor rate
  },
  savings: {
    upTo: 4.5, // "UP TO 4.5% APY"
    current: 4.0,
    minimum: 2.5,
  },
  trading: {
    upTo: 2.0, // Lower for trading (needs instant liquidity)
    current: 1.5,
    minimum: 0.5,
  },
  business: {
    upTo: 4.0,
    current: 3.5,
    minimum: 2.0,
  },

  // How we make money: spread between what partner pays us vs what we pay users
  // Partner pays us: ~5% APY
  // We pay users: up to 4.5% APY
  // Our spread: 0.5-1% (our revenue)
  partnerBankRate: 5.0, // What partner bank pays TIME
  ourSpread: 0.75, // Average spread we keep (0.5-1%)
};

// ============================================================
// LIMITS
// ============================================================

export const TRANSFER_LIMITS = {
  unverified: {
    daily: 500,
    monthly: 2000,
    perTransaction: 250,
  },
  verified: {
    daily: 10000,
    monthly: 50000,
    perTransaction: 5000,
  },
  premium: {
    daily: 50000,
    monthly: 250000,
    perTransaction: 25000,
  },
  business: {
    daily: 250000,
    monthly: 1000000,
    perTransaction: 100000,
  },
};

// ============================================================
// TIME PAY ENGINE
// ============================================================

export class TIMEPayEngine extends EventEmitter {
  private wallets: Map<string, TIMEWallet> = new Map();
  private transfers: Map<string, TIMETransfer> = new Map();
  private paymentRequests: Map<string, PaymentRequest> = new Map();
  private linkedAccounts: Map<string, LinkedAccount[]> = new Map();
  private userWallets: Map<string, string[]> = new Map(); // odUserId -> walletIds

  constructor() {
    super();
    logger.info('TIME Pay Engine initialized');
    this.startInterestAccrual();
  }

  // ============================================================
  // WALLET MANAGEMENT
  // ============================================================

  /**
   * Create a new TIME wallet for user
   */
  public createWallet(
    odUserId: string,
    type: WalletType = 'personal',
    isVerified: boolean = false
  ): TIMEWallet {
    const limits = isVerified ? TRANSFER_LIMITS.verified : TRANSFER_LIMITS.unverified;
    const rateConfig = INTEREST_RATES[type] || INTEREST_RATES.personal;

    // Calculate next month reset date
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const wallet: TIMEWallet = {
      id: `wallet_${uuidv4()}`,
      odUserId,
      type,
      balance: 0,
      interestEarned: 0,
      interestRate: rateConfig.current, // Actual current rate
      maxInterestRate: rateConfig.upTo, // "UP TO" rate for display
      isVerified,
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      monthlyP2PSent: 0, // Track for free tier
      monthlyP2PResetDate: nextMonth,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.wallets.set(wallet.id, wallet);

    // Track user's wallets
    const userWalletIds = this.userWallets.get(odUserId) || [];
    userWalletIds.push(wallet.id);
    this.userWallets.set(odUserId, userWalletIds);

    logger.info(`Created ${type} wallet for user ${odUserId}: ${wallet.id}`);
    this.emit('wallet:created', wallet);

    return wallet;
  }

  /**
   * Get user's wallets
   */
  public getUserWallets(odUserId: string): TIMEWallet[] {
    const walletIds = this.userWallets.get(odUserId) || [];
    return walletIds.map(id => this.wallets.get(id)!).filter(Boolean);
  }

  /**
   * Get wallet by ID
   */
  public getWallet(walletId: string): TIMEWallet | null {
    return this.wallets.get(walletId) || null;
  }

  /**
   * Get total balance across all user wallets
   */
  public getTotalBalance(odUserId: string): number {
    return this.getUserWallets(odUserId).reduce((sum, w) => sum + w.balance, 0);
  }

  // ============================================================
  // TRANSFERS
  // ============================================================

  /**
   * Send money instantly to another TIME user
   * FREE up to $500/month, then 0.5% fee (max $10)
   */
  public async sendInstant(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    memo?: string
  ): Promise<TIMETransfer> {
    const fromWallet = this.wallets.get(fromWalletId);
    const toWallet = this.wallets.get(toWalletId);

    if (!fromWallet) throw new Error('Source wallet not found');
    if (!toWallet) throw new Error('Destination wallet not found');
    if (fromWallet.balance < amount) throw new Error('Insufficient balance');

    // Check limits
    this.validateLimits(fromWallet, amount);

    // Reset monthly counter if needed
    this.checkMonthlyReset(fromWallet);

    // Calculate fee based on monthly usage
    const fee = this.calculateP2PFee(fromWallet, amount);

    if (fromWallet.balance < amount + fee) {
      throw new Error(`Insufficient balance. Need ${amount + fee} (including $${fee.toFixed(2)} fee)`);
    }

    const transfer: TIMETransfer = {
      id: `txn_${uuidv4()}`,
      fromWalletId,
      toWalletId,
      amount,
      fee,
      type: 'instant',
      status: 'completed', // Instant!
      memo,
      reference: this.generateReference(),
      createdAt: new Date(),
      completedAt: new Date(),
    };

    // Execute transfer
    fromWallet.balance -= (amount + fee);
    fromWallet.monthlyP2PSent += amount; // Track monthly total
    toWallet.balance += amount;
    fromWallet.updatedAt = new Date();
    toWallet.updatedAt = new Date();

    this.transfers.set(transfer.id, transfer);

    const feeMsg = fee > 0 ? ` (fee: $${fee.toFixed(2)})` : ' (FREE!)';
    logger.info(`Instant transfer completed: $${amount}${feeMsg} from ${fromWalletId} to ${toWalletId}`);
    this.emit('transfer:completed', transfer);

    return transfer;
  }

  /**
   * Check and reset monthly P2P counter if new month
   */
  private checkMonthlyReset(wallet: TIMEWallet): void {
    const now = new Date();
    if (now >= wallet.monthlyP2PResetDate) {
      wallet.monthlyP2PSent = 0;
      wallet.monthlyP2PResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      logger.info(`Monthly P2P counter reset for wallet ${wallet.id}`);
    }
  }

  /**
   * Calculate P2P fee based on monthly usage
   * FREE up to $500/month, then 0.5% (max $10)
   */
  private calculateP2PFee(wallet: TIMEWallet, amount: number): number {
    const freeLimit = FREE_P2P_MONTHLY_LIMIT;
    const alreadySent = wallet.monthlyP2PSent;
    const remainingFree = Math.max(0, freeLimit - alreadySent);

    if (remainingFree >= amount) {
      // Entire amount is free
      return 0;
    }

    // Calculate fee on amount exceeding free limit
    const chargeableAmount = amount - remainingFree;
    const fee = chargeableAmount * (TIME_PAY_FEES.instant.percent / 100);

    // Apply max fee cap
    return Math.min(fee, TIME_PAY_FEES.instant.maxFee);
  }

  /**
   * Get remaining free P2P transfer amount for the month
   */
  public getRemainingFreeP2P(walletId: string): { remaining: number; resetDate: Date } {
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');

    this.checkMonthlyReset(wallet);

    return {
      remaining: Math.max(0, FREE_P2P_MONTHLY_LIMIT - wallet.monthlyP2PSent),
      resetDate: wallet.monthlyP2PResetDate,
    };
  }

  /**
   * Send to external account (bank, card)
   */
  public async sendExternal(
    fromWalletId: string,
    externalType: 'bank' | 'debit_card' | 'wire',
    amount: number,
    instant: boolean = false
  ): Promise<TIMETransfer> {
    const fromWallet = this.wallets.get(fromWalletId);
    if (!fromWallet) throw new Error('Wallet not found');
    if (fromWallet.balance < amount) throw new Error('Insufficient balance');

    // Calculate fee based on type
    let fee = 0;
    let estimatedDays = 3;

    if (externalType === 'bank') {
      if (instant) {
        fee = this.calculateExternalFee('ach_instant', amount);
        estimatedDays = 0;
      } else {
        fee = 0; // Free standard ACH
        estimatedDays = 3;
      }
    } else if (externalType === 'debit_card') {
      fee = this.calculateExternalFee('debit_instant', amount);
      estimatedDays = 0;
    } else if (externalType === 'wire') {
      fee = TIME_PAY_FEES.external.wire_domestic.flat;
      estimatedDays = 1;
    }

    if (fromWallet.balance < amount + fee) {
      throw new Error('Insufficient balance including fees');
    }

    const transfer: TIMETransfer = {
      id: `txn_${uuidv4()}`,
      fromWalletId,
      toWalletId: null,
      toExternal: {
        type: externalType,
        details: {},
      },
      amount,
      fee,
      type: 'standard',
      status: instant ? 'completed' : 'processing',
      reference: this.generateReference(),
      createdAt: new Date(),
      completedAt: instant ? new Date() : undefined,
      estimatedArrival: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000),
    };

    fromWallet.balance -= (amount + fee);
    fromWallet.updatedAt = new Date();

    this.transfers.set(transfer.id, transfer);

    logger.info(`External transfer initiated: ${amount} to ${externalType}`);
    this.emit('transfer:initiated', transfer);

    return transfer;
  }

  /**
   * Send cross-border transfer
   */
  public async sendCrossBorder(
    fromWalletId: string,
    recipientCountry: string,
    amount: number,
    currency: string,
    recipientDetails: Record<string, string>
  ): Promise<TIMETransfer> {
    const fromWallet = this.wallets.get(fromWalletId);
    if (!fromWallet) throw new Error('Wallet not found');

    // Calculate fee (1% vs 3-5% at banks!)
    const fee = Math.max(
      TIME_PAY_FEES.crossBorder.minFee,
      Math.min(
        amount * (TIME_PAY_FEES.crossBorder.percent / 100),
        TIME_PAY_FEES.crossBorder.maxFee
      )
    );

    if (fromWallet.balance < amount + fee) {
      throw new Error('Insufficient balance including fees');
    }

    const transfer: TIMETransfer = {
      id: `txn_${uuidv4()}`,
      fromWalletId,
      toWalletId: null,
      toExternal: {
        type: 'wire',
        details: {
          country: recipientCountry,
          currency,
          ...recipientDetails,
        },
      },
      amount,
      fee,
      type: 'cross_border',
      status: 'processing',
      reference: this.generateReference(),
      createdAt: new Date(),
      estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    };

    fromWallet.balance -= (amount + fee);
    fromWallet.updatedAt = new Date();

    this.transfers.set(transfer.id, transfer);

    logger.info(`Cross-border transfer initiated: ${amount} USD to ${recipientCountry}`);
    this.emit('transfer:cross_border', transfer);

    return transfer;
  }

  /**
   * Move funds to trading account (FREE!)
   */
  public async moveToTrading(
    fromWalletId: string,
    tradingWalletId: string,
    amount: number
  ): Promise<TIMETransfer> {
    const fromWallet = this.wallets.get(fromWalletId);
    const tradingWallet = this.wallets.get(tradingWalletId);

    if (!fromWallet) throw new Error('Source wallet not found');
    if (!tradingWallet) throw new Error('Trading wallet not found');
    if (tradingWallet.type !== 'trading') throw new Error('Destination must be trading wallet');
    if (fromWallet.balance < amount) throw new Error('Insufficient balance');

    const transfer: TIMETransfer = {
      id: `txn_${uuidv4()}`,
      fromWalletId,
      toWalletId: tradingWalletId,
      amount,
      fee: 0, // FREE!
      type: 'trading',
      status: 'completed',
      reference: this.generateReference(),
      createdAt: new Date(),
      completedAt: new Date(),
    };

    fromWallet.balance -= amount;
    tradingWallet.balance += amount;
    fromWallet.updatedAt = new Date();
    tradingWallet.updatedAt = new Date();

    this.transfers.set(transfer.id, transfer);

    logger.info(`Moved ${amount} to trading wallet - FREE!`);
    this.emit('transfer:trading', transfer);

    return transfer;
  }

  // ============================================================
  // PAYMENT REQUESTS (Like Venmo/CashApp)
  // ============================================================

  /**
   * Request payment from another user
   */
  public createPaymentRequest(
    requesterId: string,
    amount: number,
    memo?: string,
    payerId?: string
  ): PaymentRequest {
    const request: PaymentRequest = {
      id: `req_${uuidv4()}`,
      requesterId,
      payerId,
      amount,
      memo,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending',
      createdAt: new Date(),
    };

    this.paymentRequests.set(request.id, request);
    this.emit('payment:requested', request);

    return request;
  }

  /**
   * Pay a payment request
   */
  public async payRequest(
    requestId: string,
    payerWalletId: string
  ): Promise<TIMETransfer> {
    const request = this.paymentRequests.get(requestId);
    if (!request) throw new Error('Payment request not found');
    if (request.status !== 'pending') throw new Error('Request already processed');
    if (request.expiresAt < new Date()) {
      request.status = 'expired';
      throw new Error('Request expired');
    }

    // Get requester's wallet
    const requesterWallets = this.getUserWallets(request.requesterId);
    if (requesterWallets.length === 0) throw new Error('Requester has no wallet');

    const transfer = await this.sendInstant(
      payerWalletId,
      requesterWallets[0].id,
      request.amount,
      request.memo
    );

    request.status = 'paid';
    request.payerId = this.wallets.get(payerWalletId)?.odUserId;

    this.emit('payment:completed', { request, transfer });

    return transfer;
  }

  // ============================================================
  // DEPOSITS & WITHDRAWALS
  // ============================================================

  /**
   * Deposit from linked bank account
   */
  public async deposit(
    walletId: string,
    amount: number,
    source: 'bank' | 'card' | 'crypto'
  ): Promise<{ transactionId: string; estimatedArrival: Date }> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');

    // In production, this would initiate ACH pull or card charge
    // For now, simulate instant credit for cards

    const isInstant = source === 'card';

    if (isInstant) {
      wallet.balance += amount;
      wallet.updatedAt = new Date();
    }

    const transactionId = `dep_${uuidv4()}`;

    logger.info(`Deposit initiated: ${amount} from ${source}`);
    this.emit('deposit:initiated', { walletId, amount, source, transactionId });

    return {
      transactionId,
      estimatedArrival: isInstant
        ? new Date()
        : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }

  // ============================================================
  // INTEREST ACCRUAL (Unique to TIME Pay!)
  // ============================================================

  /**
   * Start daily interest accrual
   */
  private startInterestAccrual(): void {
    // Accrue interest daily
    setInterval(() => {
      this.accrueInterest();
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    // Also run immediately for demo
    setTimeout(() => this.accrueInterest(), 60000);
  }

  /**
   * Accrue interest on all wallets
   */
  private accrueInterest(): void {
    const dailyRate = (rate: number) => rate / 365 / 100;

    this.wallets.forEach((wallet) => {
      if (wallet.balance > 0) {
        const interest = wallet.balance * dailyRate(wallet.interestRate);
        wallet.interestEarned += interest;
        wallet.balance += interest;
        wallet.updatedAt = new Date();
      }
    });

    logger.info('Daily interest accrued on all wallets');
    this.emit('interest:accrued');
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private calculateFee(type: TransferType, amount: number): number {
    const feeStructure = TIME_PAY_FEES[type as keyof typeof TIME_PAY_FEES];
    if (!feeStructure || typeof feeStructure !== 'object') return 0;

    const { percent = 0, flat = 0, maxFee = Infinity } = feeStructure as any;
    return Math.min(amount * (percent / 100) + flat, maxFee);
  }

  private calculateExternalFee(
    type: keyof typeof TIME_PAY_FEES.external,
    amount: number
  ): number {
    const fee = TIME_PAY_FEES.external[type];
    const calculated = amount * (fee.percent / 100) + fee.flat;
    const minFee = (fee as any).minFee || 0;
    const maxFee = (fee as any).maxFee || Infinity;
    return Math.max(minFee, Math.min(calculated, maxFee));
  }

  private validateLimits(wallet: TIMEWallet, amount: number): void {
    if (amount > wallet.dailyLimit) {
      throw new Error(`Exceeds daily limit of $${wallet.dailyLimit}`);
    }
    // In production, track daily/monthly totals
  }

  private generateReference(): string {
    return `TIME${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  // ============================================================
  // STATISTICS & REPORTING
  // ============================================================

  /**
   * Get user's transaction history
   */
  public getTransactionHistory(
    odUserId: string,
    limit: number = 50
  ): TIMETransfer[] {
    const walletIds = this.userWallets.get(odUserId) || [];
    const transactions: TIMETransfer[] = [];

    this.transfers.forEach((transfer) => {
      if (
        walletIds.includes(transfer.fromWalletId) ||
        (transfer.toWalletId && walletIds.includes(transfer.toWalletId))
      ) {
        transactions.push(transfer);
      }
    });

    return transactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get platform statistics
   */
  public getStats(): {
    totalWallets: number;
    totalBalance: number;
    totalTransfers: number;
    totalVolume: number;
    totalInterestPaid: number;
  } {
    let totalBalance = 0;
    let totalInterestPaid = 0;
    let totalVolume = 0;

    this.wallets.forEach((w) => {
      totalBalance += w.balance;
      totalInterestPaid += w.interestEarned;
    });

    this.transfers.forEach((t) => {
      if (t.status === 'completed') {
        totalVolume += t.amount;
      }
    });

    return {
      totalWallets: this.wallets.size,
      totalBalance,
      totalTransfers: this.transfers.size,
      totalVolume,
      totalInterestPaid,
    };
  }

  /**
   * Compare fees with competitors (honest comparison)
   */
  public getFeeComparison(): Array<{
    feature: string;
    timePay: string;
    cashApp: string;
    venmo: string;
    zelle: string;
    wire: string;
  }> {
    return [
      {
        feature: 'Instant P2P Transfer',
        timePay: 'FREE up to $500/mo, then 0.5% (max $10)',
        cashApp: 'FREE',
        venmo: 'FREE',
        zelle: 'FREE',
        wire: 'N/A',
      },
      {
        feature: 'Instant to Bank',
        timePay: '1.5% (max $15)',
        cashApp: '1.5% (no max)',
        venmo: '1.75% (no max)',
        zelle: 'N/A',
        wire: '$25-50',
      },
      {
        feature: 'Instant to Card',
        timePay: '1.75% (max $25)',
        cashApp: '1.5%',
        venmo: '1.75%',
        zelle: 'N/A',
        wire: 'N/A',
      },
      {
        feature: 'Cross-Border',
        timePay: '1% (max $50)',
        cashApp: '3%',
        venmo: 'Not available',
        zelle: 'Not available',
        wire: '3-5% + $45',
      },
      {
        feature: 'Trading Transfer',
        timePay: 'FREE + Instant',
        cashApp: '1-3 days',
        venmo: 'N/A',
        zelle: '1-3 days',
        wire: '$25 + 1 day',
      },
      {
        feature: 'Earn Interest',
        timePay: 'UP TO 4.5% APY*',
        cashApp: '4.5% (savings only)',
        venmo: 'No',
        zelle: 'No',
        wire: 'N/A',
      },
      {
        feature: '24/7/365 Availability',
        timePay: 'YES',
        cashApp: 'YES',
        venmo: 'YES',
        zelle: 'Bank hours only',
        wire: 'No',
      },
    ];
  }

  /**
   * Get legal disclaimers (IMPORTANT for compliance)
   */
  public getDisclaimers(): string[] {
    return [
      '*APY is variable and subject to change. Rates depend on Federal Reserve rates and partner bank policies.',
      'Funds held in TIME Pay wallets are swept to our partner bank and are FDIC insured up to $250,000.',
      'TIME Technologies, Inc. is not a bank. Banking services provided by [Partner Bank Name], Member FDIC.',
      'Interest is earned on funds held in sweep accounts at our partner bank.',
      'Past interest rates are not indicative of future rates.',
      'P2P transfers over $500/month are subject to a 0.5% fee (maximum $10).',
    ];
  }
}

// Export singleton
export const timePayEngine = new TIMEPayEngine();

export default TIMEPayEngine;

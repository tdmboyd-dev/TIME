/**
 * iKickItz → TIME Pay Bridge
 *
 * Connects iKickItz Creator Economy Platform to TIME Pay
 *
 * Data Flow:
 * - Creator earnings (battles, tips, NFTs, podcasts) → TIME Pay income tracking
 * - iKoinZ conversions → TIME Pay balance
 * - 30% tax reserve → TIME Pay tax savings account
 * - Creator payouts → TIME Pay instant transfers
 *
 * When BaaS partner is live, this bridge enables:
 * - Direct creator payouts without Stripe
 * - Lower fees for creators
 * - Integrated tax filing via MGR Elite Hub
 */

import { EventEmitter } from 'events';

// ============================================================================
// iKICKITZ DATA TYPES (Mirrored from iKickItz schema)
// ============================================================================

export enum IKickItzTransactionType {
  BATTLE_EARNINGS = 'BATTLE_EARNINGS',
  TIP_RECEIVED = 'TIP_RECEIVED',
  NFT_SALE = 'NFT_SALE',
  PODCAST_EARNINGS = 'PODCAST_EARNINGS',
  SPONSORSHIP = 'SPONSORSHIP',
  MERCHANDISE = 'MERCHANDISE',
  SUBSCRIPTION_REVENUE = 'SUBSCRIPTION_REVENUE',
  IKOINZ_PURCHASE = 'IKOINZ_PURCHASE',
  IKOINZ_CONVERSION = 'IKOINZ_CONVERSION',
  WITHDRAWAL = 'WITHDRAWAL',
  TAX_RESERVE = 'TAX_RESERVE',
  PLATFORM_FEE = 'PLATFORM_FEE',
}

export interface IKickItzCreator {
  id: string;
  firebase_uid: string;
  username: string;
  display_name: string;
  email: string;

  // Financial
  balance: number;
  ikoinz_balance: number;
  tax_reserve_balance: number;
  lifetime_earnings: number;

  // Tax info
  tax_info_provided: boolean;
  ssn_last_four?: string;
  ein?: string;
  business_name?: string;

  // Integration flags
  is_mgr_creator: boolean;
  time_pay_linked: boolean;
  time_pay_account_id?: string;

  // Stripe (current)
  stripe_account_id?: string;
  stripe_onboarding_complete: boolean;

  created_at: Date;
  updated_at: Date;
}

export interface IKickItzTransaction {
  id: string;
  creator_id: string;
  type: IKickItzTransactionType;
  amount: number;
  currency: 'USD' | 'IKOINZ';

  // Related entities
  battle_id?: string;
  nft_id?: string;
  podcast_id?: string;
  sponsor_id?: string;

  // Tax tracking
  is_taxable: boolean;
  tax_year: number;
  tax_reserve_amount?: number; // 30% auto-reserved

  // Metadata
  description: string;
  metadata?: Record<string, any>;

  created_at: Date;
}

export interface IKickItzTaxAccount {
  id: string;
  creator_id: string;
  tax_year: number;

  // Income tracking
  gross_income: number;
  platform_fees: number;
  net_income: number;

  // Tax reserve (30%)
  reserve_balance: number;
  reserve_target: number; // net_income * 0.30

  // Quarterly estimates
  q1_estimate: number;
  q2_estimate: number;
  q3_estimate: number;
  q4_estimate: number;

  // Payments made
  q1_paid: number;
  q2_paid: number;
  q3_paid: number;
  q4_paid: number;

  // Filing status
  form_1099_generated: boolean;
  mgr_return_filed: boolean;

  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// TIME PAY ACCOUNT TYPES
// ============================================================================

export interface TimePayCreatorAccount {
  id: string;
  ikickitz_creator_id: string;

  // Balances synced from iKickItz
  available_balance: number;
  pending_balance: number;
  tax_reserve_balance: number;

  // TIME Pay features
  instant_transfer_enabled: boolean;
  invoice_enabled: boolean;
  payroll_enabled: boolean;

  // Linked accounts
  linked_bank_account?: {
    institution: string;
    account_last_four: string;
    routing_number: string;
    verified: boolean;
  };

  linked_debit_card?: {
    brand: string;
    last_four: string;
    exp_month: number;
    exp_year: number;
  };

  // APY earnings
  apy_rate: number; // Up to 3.5%
  apy_earnings_ytd: number;

  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// IKICKITZ BRIDGE ENGINE
// ============================================================================

export class IKickItzBridge extends EventEmitter {
  private linkedAccounts: Map<string, TimePayCreatorAccount> = new Map();
  private syncedTransactions: Set<string> = new Set();

  constructor() {
    super();
    console.log('🎮 iKickItz → TIME Pay Bridge initialized');
  }

  // ==========================================================================
  // ACCOUNT LINKING
  // ==========================================================================

  /**
   * Link an iKickItz creator account to TIME Pay
   */
  public async linkCreatorAccount(
    creator: IKickItzCreator
  ): Promise<TimePayCreatorAccount> {
    console.log(`🔗 Linking iKickItz creator: ${creator.username}`);

    if (!creator.tax_info_provided) {
      throw new Error('Creator must provide tax information before linking to TIME Pay');
    }

    const accountId = `tp_creator_${creator.id}`;

    const timePayAccount: TimePayCreatorAccount = {
      id: accountId,
      ikickitz_creator_id: creator.id,

      available_balance: creator.balance,
      pending_balance: 0,
      tax_reserve_balance: creator.tax_reserve_balance,

      instant_transfer_enabled: true,
      invoice_enabled: true,
      payroll_enabled: false, // Creators don't typically need payroll

      apy_rate: 3.5, // Up to 3.5% APY
      apy_earnings_ytd: 0,

      created_at: new Date(),
      updated_at: new Date(),
    };

    this.linkedAccounts.set(creator.id, timePayAccount);

    this.emit('account:linked', {
      creatorId: creator.id,
      timePayAccountId: accountId,
    });

    console.log(`✅ Creator ${creator.username} linked to TIME Pay`);
    console.log(`   Account ID: ${accountId}`);
    console.log(`   Balance: $${creator.balance.toFixed(2)}`);
    console.log(`   Tax Reserve: $${creator.tax_reserve_balance.toFixed(2)}`);

    return timePayAccount;
  }

  /**
   * Unlink a creator account
   */
  public async unlinkCreatorAccount(creatorId: string): Promise<void> {
    this.linkedAccounts.delete(creatorId);
    this.emit('account:unlinked', { creatorId });
    console.log(`🔓 Creator ${creatorId} unlinked from TIME Pay`);
  }

  // ==========================================================================
  // TRANSACTION SYNC
  // ==========================================================================

  /**
   * Sync iKickItz transactions to TIME Pay for tax tracking
   */
  public async syncTransactions(
    creatorId: string,
    transactions: IKickItzTransaction[]
  ): Promise<{
    synced: number;
    skipped: number;
    totalAmount: number;
  }> {
    console.log(`📊 Syncing ${transactions.length} transactions for creator ${creatorId}`);

    let synced = 0;
    let skipped = 0;
    let totalAmount = 0;

    for (const tx of transactions) {
      if (this.syncedTransactions.has(tx.id)) {
        skipped++;
        continue;
      }

      // Track in TIME Pay
      await this.trackTransaction(creatorId, tx);
      this.syncedTransactions.add(tx.id);
      synced++;

      if (tx.is_taxable && tx.currency === 'USD') {
        totalAmount += tx.amount;
      }
    }

    this.emit('transactions:synced', {
      creatorId,
      synced,
      skipped,
      totalAmount,
    });

    console.log(`✅ Synced ${synced} transactions ($${totalAmount.toFixed(2)} taxable)`);

    return { synced, skipped, totalAmount };
  }

  /**
   * Track individual transaction in TIME Pay
   */
  private async trackTransaction(
    creatorId: string,
    tx: IKickItzTransaction
  ): Promise<void> {
    const account = this.linkedAccounts.get(creatorId);
    if (!account) return;

    // Update balances based on transaction type
    switch (tx.type) {
      case IKickItzTransactionType.BATTLE_EARNINGS:
      case IKickItzTransactionType.TIP_RECEIVED:
      case IKickItzTransactionType.NFT_SALE:
      case IKickItzTransactionType.PODCAST_EARNINGS:
      case IKickItzTransactionType.SPONSORSHIP:
      case IKickItzTransactionType.MERCHANDISE:
      case IKickItzTransactionType.SUBSCRIPTION_REVENUE:
        if (tx.currency === 'USD') {
          account.available_balance += tx.amount;
          if (tx.tax_reserve_amount) {
            account.tax_reserve_balance += tx.tax_reserve_amount;
          }
        }
        break;

      case IKickItzTransactionType.WITHDRAWAL:
        account.available_balance -= tx.amount;
        break;

      case IKickItzTransactionType.PLATFORM_FEE:
        account.available_balance -= tx.amount;
        break;

      case IKickItzTransactionType.IKOINZ_CONVERSION:
        // iKoinZ converted to USD
        account.available_balance += tx.amount;
        break;
    }

    account.updated_at = new Date();
  }

  // ==========================================================================
  // EARNINGS EXPORT (FOR TAX FILING)
  // ==========================================================================

  /**
   * Export creator earnings for tax year
   * Used by Platform Bridge for MGR Elite Hub filing
   */
  public async exportEarningsForTax(
    creatorId: string,
    taxYear: number,
    taxAccount: IKickItzTaxAccount
  ): Promise<{
    creatorId: string;
    taxYear: number;

    // Income breakdown
    battleEarnings: number;
    tipIncome: number;
    nftSales: number;
    podcastRevenue: number;
    sponsorshipIncome: number;
    merchandiseSales: number;
    subscriptionRevenue: number;

    // Totals
    grossIncome: number;
    platformFees: number;
    netIncome: number;

    // Tax info
    taxReserveBalance: number;
    estimatedTaxLiability: number;
    quarterlyPaymentsMade: number;

    // 1099 status
    form1099Required: boolean;
    form1099Generated: boolean;

    exportedAt: Date;
  }> {
    console.log(`📤 Exporting tax data for creator ${creatorId}, year ${taxYear}`);

    // Calculate estimated tax liability (simplified)
    const selfEmploymentTax = taxAccount.net_income * 0.153; // 15.3% SE tax
    const estimatedIncomeTax = taxAccount.net_income * 0.22; // Assume 22% bracket
    const estimatedTaxLiability = selfEmploymentTax + estimatedIncomeTax;

    const quarterlyPaymentsMade =
      taxAccount.q1_paid +
      taxAccount.q2_paid +
      taxAccount.q3_paid +
      taxAccount.q4_paid;

    const result = {
      creatorId,
      taxYear,

      // These would be broken down from actual transaction data
      battleEarnings: 0,
      tipIncome: 0,
      nftSales: 0,
      podcastRevenue: 0,
      sponsorshipIncome: 0,
      merchandiseSales: 0,
      subscriptionRevenue: 0,

      grossIncome: taxAccount.gross_income,
      platformFees: taxAccount.platform_fees,
      netIncome: taxAccount.net_income,

      taxReserveBalance: taxAccount.reserve_balance,
      estimatedTaxLiability,
      quarterlyPaymentsMade,

      // 1099-NEC required if net income >= $600
      form1099Required: taxAccount.net_income >= 600,
      form1099Generated: taxAccount.form_1099_generated,

      exportedAt: new Date(),
    };

    this.emit('earnings:exported', result);
    console.log(`✅ Exported $${result.netIncome.toFixed(2)} net income for ${taxYear}`);

    return result;
  }

  // ==========================================================================
  // PAYOUT PROCESSING (FUTURE - WHEN BaaS IS LIVE)
  // ==========================================================================

  /**
   * Process creator payout via TIME Pay (instead of Stripe)
   *
   * FUTURE: When BaaS partner is integrated, this replaces Stripe payouts
   * Benefits:
   * - Lower fees (0.5% vs Stripe's 0.25% + $0.25 per payout)
   * - Instant transfers to bank
   * - Integrated with tax reserve
   */
  public async processCreatorPayout(
    creatorId: string,
    amount: number,
    options: {
      method: 'standard' | 'instant';
      destination: 'bank' | 'debit_card';
      deductFromTaxReserve?: boolean;
    }
  ): Promise<{
    success: boolean;
    payoutId: string;
    amount: number;
    fee: number;
    netAmount: number;
    estimatedArrival: string;
    method: string;
  }> {
    console.log(`💸 Processing TIME Pay payout for creator ${creatorId}`);

    const account = this.linkedAccounts.get(creatorId);
    if (!account) {
      throw new Error('Creator not linked to TIME Pay');
    }

    // Check balance
    const availableBalance = options.deductFromTaxReserve
      ? account.available_balance + account.tax_reserve_balance
      : account.available_balance;

    if (amount > availableBalance) {
      throw new Error(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`);
    }

    // Calculate fees based on TIME Pay fee structure
    let fee = 0;
    let estimatedArrival = '';

    if (options.method === 'instant') {
      if (options.destination === 'bank') {
        fee = amount * 0.015; // 1.5% instant to bank
        estimatedArrival = 'Within minutes';
      } else {
        fee = amount * 0.0175; // 1.75% instant to card
        estimatedArrival = 'Within minutes';
      }
    } else {
      // Standard ACH - FREE
      fee = 0;
      estimatedArrival = '1-3 business days';
    }

    const netAmount = amount - fee;
    const payoutId = `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update balances
    if (options.deductFromTaxReserve && amount > account.available_balance) {
      const fromTaxReserve = amount - account.available_balance;
      account.available_balance = 0;
      account.tax_reserve_balance -= fromTaxReserve;
      console.log(`   ⚠️ $${fromTaxReserve.toFixed(2)} deducted from tax reserve`);
    } else {
      account.available_balance -= amount;
    }

    account.updated_at = new Date();

    this.emit('payout:processed', {
      payoutId,
      creatorId,
      amount,
      fee,
      netAmount,
      method: options.method,
      destination: options.destination,
    });

    console.log(`✅ Payout processed`);
    console.log(`   Amount: $${amount.toFixed(2)}`);
    console.log(`   Fee: $${fee.toFixed(2)}`);
    console.log(`   Net: $${netAmount.toFixed(2)}`);
    console.log(`   Arrival: ${estimatedArrival}`);

    return {
      success: true,
      payoutId,
      amount,
      fee,
      netAmount,
      estimatedArrival,
      method: `${options.method}_${options.destination}`,
    };
  }

  // ==========================================================================
  // TAX RESERVE MANAGEMENT
  // ==========================================================================

  /**
   * Sync tax reserve from iKickItz to TIME Pay
   */
  public async syncTaxReserve(
    creatorId: string,
    taxAccount: IKickItzTaxAccount
  ): Promise<{
    previousBalance: number;
    newBalance: number;
    difference: number;
  }> {
    const account = this.linkedAccounts.get(creatorId);
    if (!account) {
      throw new Error('Creator not linked to TIME Pay');
    }

    const previousBalance = account.tax_reserve_balance;
    account.tax_reserve_balance = taxAccount.reserve_balance;
    account.updated_at = new Date();

    const difference = taxAccount.reserve_balance - previousBalance;

    console.log(`💰 Tax reserve synced for creator ${creatorId}`);
    console.log(`   Previous: $${previousBalance.toFixed(2)}`);
    console.log(`   New: $${taxAccount.reserve_balance.toFixed(2)}`);
    console.log(`   Change: ${difference >= 0 ? '+' : ''}$${difference.toFixed(2)}`);

    return {
      previousBalance,
      newBalance: taxAccount.reserve_balance,
      difference,
    };
  }

  /**
   * Pay quarterly estimated taxes from tax reserve
   */
  public async payQuarterlyEstimate(
    creatorId: string,
    quarter: 1 | 2 | 3 | 4,
    amount: number
  ): Promise<{
    success: boolean;
    paymentId: string;
    quarter: number;
    amount: number;
    remainingReserve: number;
  }> {
    const account = this.linkedAccounts.get(creatorId);
    if (!account) {
      throw new Error('Creator not linked to TIME Pay');
    }

    if (amount > account.tax_reserve_balance) {
      throw new Error(`Insufficient tax reserve. Available: $${account.tax_reserve_balance.toFixed(2)}`);
    }

    account.tax_reserve_balance -= amount;
    account.updated_at = new Date();

    const paymentId = `qe_${quarter}_${Date.now()}`;

    // In production, this would initiate IRS Direct Pay or EFTPS payment
    console.log(`🏛️ Quarterly tax payment initiated`);
    console.log(`   Quarter: Q${quarter}`);
    console.log(`   Amount: $${amount.toFixed(2)}`);
    console.log(`   Remaining Reserve: $${account.tax_reserve_balance.toFixed(2)}`);

    this.emit('quarterly:paid', {
      paymentId,
      creatorId,
      quarter,
      amount,
    });

    return {
      success: true,
      paymentId,
      quarter,
      amount,
      remainingReserve: account.tax_reserve_balance,
    };
  }

  // ==========================================================================
  // REPORTING
  // ==========================================================================

  /**
   * Get creator's TIME Pay dashboard data
   */
  public getCreatorDashboard(creatorId: string): {
    account: TimePayCreatorAccount | null;
    summary: {
      totalAvailable: number;
      taxReserve: number;
      pendingPayouts: number;
      apyEarnings: number;
    };
    actions: string[];
  } | null {
    const account = this.linkedAccounts.get(creatorId);
    if (!account) {
      return null;
    }

    return {
      account,
      summary: {
        totalAvailable: account.available_balance,
        taxReserve: account.tax_reserve_balance,
        pendingPayouts: account.pending_balance,
        apyEarnings: account.apy_earnings_ytd,
      },
      actions: [
        'Transfer to Bank (FREE - 1-3 days)',
        'Instant Transfer (1.5% fee)',
        'Pay Quarterly Taxes',
        'File Taxes with MGR Elite Hub',
      ],
    };
  }

  /**
   * Get all linked accounts
   */
  public getAllLinkedAccounts(): TimePayCreatorAccount[] {
    return Array.from(this.linkedAccounts.values());
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const ikickitzBridge = new IKickItzBridge();

// ============================================================================
// API ROUTES
// ============================================================================

export const ikickitzBridgeRoutes = {
  /**
   * POST /api/ikickitz/link
   */
  linkAccount: async (creator: IKickItzCreator) => {
    return ikickitzBridge.linkCreatorAccount(creator);
  },

  /**
   * DELETE /api/ikickitz/unlink/:creatorId
   */
  unlinkAccount: async (creatorId: string) => {
    return ikickitzBridge.unlinkCreatorAccount(creatorId);
  },

  /**
   * POST /api/ikickitz/sync-transactions
   */
  syncTransactions: async (body: {
    creatorId: string;
    transactions: IKickItzTransaction[];
  }) => {
    return ikickitzBridge.syncTransactions(body.creatorId, body.transactions);
  },

  /**
   * POST /api/ikickitz/export-earnings
   */
  exportEarnings: async (body: {
    creatorId: string;
    taxYear: number;
    taxAccount: IKickItzTaxAccount;
  }) => {
    return ikickitzBridge.exportEarningsForTax(
      body.creatorId,
      body.taxYear,
      body.taxAccount
    );
  },

  /**
   * POST /api/ikickitz/payout
   */
  processPayout: async (body: {
    creatorId: string;
    amount: number;
    method: 'standard' | 'instant';
    destination: 'bank' | 'debit_card';
    deductFromTaxReserve?: boolean;
  }) => {
    return ikickitzBridge.processCreatorPayout(body.creatorId, body.amount, body);
  },

  /**
   * POST /api/ikickitz/pay-quarterly
   */
  payQuarterly: async (body: {
    creatorId: string;
    quarter: 1 | 2 | 3 | 4;
    amount: number;
  }) => {
    return ikickitzBridge.payQuarterlyEstimate(
      body.creatorId,
      body.quarter,
      body.amount
    );
  },

  /**
   * GET /api/ikickitz/dashboard/:creatorId
   */
  getDashboard: async (creatorId: string) => {
    return ikickitzBridge.getCreatorDashboard(creatorId);
  },
};

console.log('🎮 iKickItz Bridge loaded');
console.log('   Features: Account Linking, Transaction Sync, Tax Export, Payouts');

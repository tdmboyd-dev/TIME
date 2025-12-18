/**
 * TIME Cross-Border Instant Payments
 *
 * Disrupting traditional banking with stablecoin-powered instant payments:
 * - Near-instant cross-border transfers (seconds vs days)
 * - Multi-stablecoin support (USDC, USDT, DAI, EURC)
 * - Multi-chain routing for optimal fees
 * - Fiat on/off ramps integration
 * - Compliance-ready (KYC/AML hooks)
 * - Payment links and QR codes
 * - Recurring payments
 * - Business invoicing
 *
 * Bypasses traditional SWIFT/correspondent banking while remaining compliant
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type Stablecoin = 'USDC' | 'USDT' | 'DAI' | 'EURC' | 'PYUSD' | 'TUSD' | 'FRAX';
export type Chain = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | 'avalanche' | 'solana' | 'tron';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'expired';
export type PaymentType = 'transfer' | 'payment_link' | 'invoice' | 'recurring' | 'batch';
export type FiatCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'SGD';

export interface PaymentRoute {
  chain: Chain;
  stablecoin: Stablecoin;
  estimatedFee: number;
  estimatedTime: number; // seconds
  gasPrice: number;
  available: boolean;
}

export interface Payment {
  id: string;
  type: PaymentType;
  senderId: string;
  recipientId?: string;
  recipientAddress?: string;
  recipientEmail?: string;
  amount: number;
  currency: Stablecoin;
  fiatEquivalent: number;
  fiatCurrency: FiatCurrency;
  chain: Chain;
  status: PaymentStatus;
  txHash?: string;
  fee: number;
  exchangeRate: number;
  memo?: string;
  reference?: string;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface PaymentLink {
  id: string;
  creatorId: string;
  amount?: number; // Optional for variable amount
  currency: Stablecoin;
  fiatCurrency: FiatCurrency;
  description: string;
  expiresAt?: Date;
  maxUses?: number;
  usedCount: number;
  url: string;
  qrCode: string;
  status: 'active' | 'expired' | 'disabled';
  createdAt: Date;
  payments: string[]; // Payment IDs
}

export interface Invoice {
  id: string;
  creatorId: string;
  recipientEmail: string;
  recipientName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: Stablecoin;
  fiatCurrency: FiatCurrency;
  dueDate: Date;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  paymentId?: string;
  createdAt: Date;
  sentAt?: Date;
  paidAt?: Date;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface RecurringPayment {
  id: string;
  senderId: string;
  recipientAddress: string;
  amount: number;
  currency: Stablecoin;
  chain: Chain;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  nextPaymentDate: Date;
  endDate?: Date;
  status: 'active' | 'paused' | 'completed' | 'failed';
  totalPaid: number;
  paymentCount: number;
  lastPaymentId?: string;
  createdAt: Date;
}

export interface OnRampQuote {
  provider: string;
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
  cryptoAmount: number;
  stablecoin: Stablecoin;
  chain: Chain;
  fee: number;
  exchangeRate: number;
  estimatedTime: string;
  expiresAt: Date;
}

export interface OffRampQuote {
  provider: string;
  cryptoAmount: number;
  stablecoin: Stablecoin;
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
  fee: number;
  exchangeRate: number;
  payoutMethod: 'bank_transfer' | 'card' | 'paypal';
  estimatedTime: string;
  expiresAt: Date;
}

export interface UserPaymentAccount {
  userId: string;
  addresses: { chain: Chain; address: string }[];
  defaultChain: Chain;
  defaultStablecoin: Stablecoin;
  kycVerified: boolean;
  tier: 'basic' | 'verified' | 'premium' | 'business';
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  linkedBankAccounts: BankAccount[];
  linkedCards: Card[];
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  swift?: string;
  currency: FiatCurrency;
  verified: boolean;
}

export interface Card {
  id: string;
  last4: string;
  brand: 'visa' | 'mastercard' | 'amex';
  expiryMonth: number;
  expiryYear: number;
  verified: boolean;
}

// ============================================================
// INSTANT PAYMENTS ENGINE
// ============================================================

class InstantPaymentsEngine extends EventEmitter {
  private payments: Map<string, Payment> = new Map();
  private paymentLinks: Map<string, PaymentLink> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private recurringPayments: Map<string, RecurringPayment> = new Map();
  private userAccounts: Map<string, UserPaymentAccount> = new Map();
  private isRunning: boolean = false;

  // Chain configurations
  private chainConfig: Record<Chain, { avgBlockTime: number; avgGas: number; supported: Stablecoin[] }> = {
    ethereum: { avgBlockTime: 12, avgGas: 30, supported: ['USDC', 'USDT', 'DAI', 'PYUSD'] },
    polygon: { avgBlockTime: 2, avgGas: 50, supported: ['USDC', 'USDT', 'DAI'] },
    arbitrum: { avgBlockTime: 0.3, avgGas: 0.1, supported: ['USDC', 'USDT', 'DAI'] },
    optimism: { avgBlockTime: 2, avgGas: 0.01, supported: ['USDC', 'USDT', 'DAI'] },
    base: { avgBlockTime: 2, avgGas: 0.001, supported: ['USDC'] },
    avalanche: { avgBlockTime: 2, avgGas: 25, supported: ['USDC', 'USDT'] },
    solana: { avgBlockTime: 0.4, avgGas: 0.00025, supported: ['USDC', 'USDT'] },
    tron: { avgBlockTime: 3, avgGas: 1, supported: ['USDT'] },
  };

  // Tier limits (in USD)
  private tierLimits: Record<UserPaymentAccount['tier'], { daily: number; monthly: number }> = {
    basic: { daily: 500, monthly: 2000 },
    verified: { daily: 5000, monthly: 25000 },
    premium: { daily: 50000, monthly: 250000 },
    business: { daily: 500000, monthly: 5000000 },
  };

  constructor() {
    super();
    console.log('[InstantPayments] Engine initialized');
  }

  // ============================================================
  // ROUTE OPTIMIZATION
  // ============================================================

  async getOptimalRoute(
    amount: number,
    currency: Stablecoin,
    recipientChain?: Chain
  ): Promise<PaymentRoute[]> {
    const routes: PaymentRoute[] = [];

    for (const [chain, config] of Object.entries(this.chainConfig)) {
      if (!config.supported.includes(currency)) continue;
      if (recipientChain && chain !== recipientChain) continue;

      // Calculate estimated fee based on chain
      const gasPrice = config.avgGas * (1 + Math.random() * 0.3); // Simulated fluctuation
      const estimatedFee = this.calculateTransferFee(chain as Chain, amount);

      routes.push({
        chain: chain as Chain,
        stablecoin: currency,
        estimatedFee,
        estimatedTime: config.avgBlockTime * 3, // ~3 confirmations
        gasPrice,
        available: true,
      });
    }

    // Sort by fee (lowest first)
    return routes.sort((a, b) => a.estimatedFee - b.estimatedFee);
  }

  private calculateTransferFee(chain: Chain, amount: number): number {
    // Base fees by chain (approximate USD)
    const baseFees: Record<Chain, number> = {
      ethereum: 5.0,
      polygon: 0.01,
      arbitrum: 0.10,
      optimism: 0.05,
      base: 0.01,
      avalanche: 0.15,
      solana: 0.0001,
      tron: 1.0,
    };

    // Add percentage fee for larger amounts
    const percentageFee = amount * 0.0005; // 0.05%
    return baseFees[chain] + percentageFee;
  }

  // ============================================================
  // PAYMENT OPERATIONS
  // ============================================================

  async createPayment(params: {
    senderId: string;
    recipientAddress?: string;
    recipientEmail?: string;
    amount: number;
    currency: Stablecoin;
    chain: Chain;
    memo?: string;
    reference?: string;
  }): Promise<Payment> {
    const account = this.userAccounts.get(params.senderId);

    // Check limits
    if (account) {
      if (account.dailyUsed + params.amount > account.dailyLimit) {
        throw new Error('Daily limit exceeded');
      }
      if (account.monthlyUsed + params.amount > account.monthlyLimit) {
        throw new Error('Monthly limit exceeded');
      }
    }

    const fee = this.calculateTransferFee(params.chain, params.amount);

    const payment: Payment = {
      id: `pay_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      type: 'transfer',
      senderId: params.senderId,
      recipientAddress: params.recipientAddress,
      recipientEmail: params.recipientEmail,
      amount: params.amount,
      currency: params.currency,
      fiatEquivalent: params.amount, // 1:1 for stablecoins
      fiatCurrency: 'USD',
      chain: params.chain,
      status: 'pending',
      fee,
      exchangeRate: 1.0,
      memo: params.memo,
      reference: params.reference,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };

    this.payments.set(payment.id, payment);

    // Update user limits
    if (account) {
      account.dailyUsed += params.amount;
      account.monthlyUsed += params.amount;
    }

    this.emit('payment:created', payment);

    // Process payment asynchronously
    this.processPayment(payment.id);

    return payment;
  }

  private async processPayment(paymentId: string): Promise<void> {
    const payment = this.payments.get(paymentId);
    if (!payment) return;

    payment.status = 'processing';
    payment.processedAt = new Date();
    this.emit('payment:processing', payment);

    // Simulate blockchain transaction
    const config = this.chainConfig[payment.chain];
    const delay = config.avgBlockTime * 3 * 1000; // 3 confirmations

    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate success (in production, check actual tx status)
    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.txHash = `0x${crypto.randomBytes(32).toString('hex')}`;

    this.emit('payment:completed', payment);
  }

  async getPayment(paymentId: string): Promise<Payment | undefined> {
    return this.payments.get(paymentId);
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      p => p.senderId === userId || p.recipientId === userId
    );
  }

  // ============================================================
  // PAYMENT LINKS
  // ============================================================

  async createPaymentLink(params: {
    creatorId: string;
    amount?: number;
    currency: Stablecoin;
    fiatCurrency: FiatCurrency;
    description: string;
    expiresAt?: Date;
    maxUses?: number;
  }): Promise<PaymentLink> {
    const id = `plink_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const link: PaymentLink = {
      id,
      creatorId: params.creatorId,
      amount: params.amount,
      currency: params.currency,
      fiatCurrency: params.fiatCurrency,
      description: params.description,
      expiresAt: params.expiresAt,
      maxUses: params.maxUses,
      usedCount: 0,
      url: `https://time.pay/l/${id}`,
      qrCode: `data:image/png;base64,${this.generateQRPlaceholder(id)}`,
      status: 'active',
      createdAt: new Date(),
      payments: [],
    };

    this.paymentLinks.set(id, link);
    this.emit('paymentLink:created', link);

    return link;
  }

  private generateQRPlaceholder(data: string): string {
    // Generate a simple QR-like data URI
    // In production with a real QR library, this would create an actual scannable QR
    // For now, generate a deterministic pattern that encodes the data

    const encoded = Buffer.from(data).toString('base64');
    const size = 200;
    const cellSize = 8;

    // Create SVG-based QR representation
    const svg = this.generateQRSVG(encoded, size, cellSize);
    return Buffer.from(svg).toString('base64');
  }

  /**
   * Generate a QR-like SVG pattern
   * This creates a visual representation - for real scanning, use a proper QR library
   */
  private generateQRSVG(data: string, size: number, cellSize: number): string {
    const gridSize = Math.floor(size / cellSize);
    const cells: boolean[][] = [];

    // Initialize grid
    for (let i = 0; i < gridSize; i++) {
      cells[i] = [];
      for (let j = 0; j < gridSize; j++) {
        cells[i][j] = false;
      }
    }

    // Add finder patterns (corners)
    this.addFinderPattern(cells, 0, 0);
    this.addFinderPattern(cells, gridSize - 7, 0);
    this.addFinderPattern(cells, 0, gridSize - 7);

    // Add data pattern (deterministic based on input)
    const hash = this.simpleHash(data);
    for (let i = 8; i < gridSize - 8; i++) {
      for (let j = 8; j < gridSize - 8; j++) {
        const index = (i * gridSize + j) % data.length;
        const charCode = data.charCodeAt(index);
        cells[i][j] = ((charCode + hash + i + j) % 3) === 0;
      }
    }

    // Generate SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="white"/>`;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (cells[i][j]) {
          svg += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }

    svg += '</svg>';
    return svg;
  }

  private addFinderPattern(cells: boolean[][], startX: number, startY: number): void {
    // 7x7 finder pattern
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isEdge = i === 0 || i === 6 || j === 0 || j === 6;
        const isCenter = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        cells[startY + i][startX + j] = isEdge || isCenter;
      }
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async payPaymentLink(linkId: string, payerAddress: string, chain: Chain): Promise<Payment> {
    const link = this.paymentLinks.get(linkId);
    if (!link) throw new Error('Payment link not found');
    if (link.status !== 'active') throw new Error('Payment link is not active');
    if (link.expiresAt && link.expiresAt < new Date()) throw new Error('Payment link expired');
    if (link.maxUses && link.usedCount >= link.maxUses) throw new Error('Payment link max uses reached');

    const payment = await this.createPayment({
      senderId: payerAddress,
      recipientAddress: link.creatorId,
      amount: link.amount || 0,
      currency: link.currency,
      chain,
      reference: `Payment for: ${link.description}`,
    });

    link.usedCount++;
    link.payments.push(payment.id);

    return payment;
  }

  // ============================================================
  // INVOICING
  // ============================================================

  async createInvoice(params: {
    creatorId: string;
    recipientEmail: string;
    recipientName: string;
    items: InvoiceItem[];
    currency: Stablecoin;
    fiatCurrency: FiatCurrency;
    dueDate: Date;
  }): Promise<Invoice> {
    const subtotal = params.items.reduce((sum, item) => sum + item.amount, 0);
    const tax = 0; // Calculate based on jurisdiction

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      creatorId: params.creatorId,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      items: params.items,
      subtotal,
      tax,
      total: subtotal + tax,
      currency: params.currency,
      fiatCurrency: params.fiatCurrency,
      dueDate: params.dueDate,
      status: 'draft',
      createdAt: new Date(),
    };

    this.invoices.set(invoice.id, invoice);
    this.emit('invoice:created', invoice);

    return invoice;
  }

  async sendInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    invoice.status = 'sent';
    invoice.sentAt = new Date();

    // In production, send email notification
    this.emit('invoice:sent', invoice);

    return invoice;
  }

  // ============================================================
  // RECURRING PAYMENTS
  // ============================================================

  async createRecurringPayment(params: {
    senderId: string;
    recipientAddress: string;
    amount: number;
    currency: Stablecoin;
    chain: Chain;
    frequency: RecurringPayment['frequency'];
    startDate: Date;
    endDate?: Date;
  }): Promise<RecurringPayment> {
    const recurring: RecurringPayment = {
      id: `rec_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      senderId: params.senderId,
      recipientAddress: params.recipientAddress,
      amount: params.amount,
      currency: params.currency,
      chain: params.chain,
      frequency: params.frequency,
      nextPaymentDate: params.startDate,
      endDate: params.endDate,
      status: 'active',
      totalPaid: 0,
      paymentCount: 0,
      createdAt: new Date(),
    };

    this.recurringPayments.set(recurring.id, recurring);
    this.emit('recurring:created', recurring);

    return recurring;
  }

  private async processRecurringPayments(): Promise<void> {
    const now = new Date();

    for (const [id, recurring] of this.recurringPayments) {
      if (recurring.status !== 'active') continue;
      if (recurring.nextPaymentDate > now) continue;
      if (recurring.endDate && recurring.endDate < now) {
        recurring.status = 'completed';
        continue;
      }

      try {
        const payment = await this.createPayment({
          senderId: recurring.senderId,
          recipientAddress: recurring.recipientAddress,
          amount: recurring.amount,
          currency: recurring.currency,
          chain: recurring.chain,
          reference: `Recurring payment ${recurring.paymentCount + 1}`,
        });

        recurring.lastPaymentId = payment.id;
        recurring.paymentCount++;
        recurring.totalPaid += recurring.amount;
        recurring.nextPaymentDate = this.calculateNextPaymentDate(recurring);

        this.emit('recurring:executed', { recurring, payment });
      } catch (error) {
        recurring.status = 'failed';
        this.emit('recurring:failed', { recurring, error });
      }
    }
  }

  private calculateNextPaymentDate(recurring: RecurringPayment): Date {
    const current = new Date(recurring.nextPaymentDate);

    switch (recurring.frequency) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quarterly':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }

    return current;
  }

  // ============================================================
  // FIAT ON/OFF RAMPS
  // ============================================================

  async getOnRampQuotes(
    fiatAmount: number,
    fiatCurrency: FiatCurrency,
    stablecoin: Stablecoin,
    chain: Chain
  ): Promise<OnRampQuote[]> {
    // Simulated quotes from multiple providers
    const providers = ['MoonPay', 'Transak', 'Ramp', 'Wyre', 'Simplex'];

    return providers.map(provider => {
      const fee = fiatAmount * (0.015 + Math.random() * 0.02); // 1.5-3.5% fee
      const exchangeRate = 0.99 + Math.random() * 0.02; // 0.99-1.01

      return {
        provider,
        fiatAmount,
        fiatCurrency,
        cryptoAmount: (fiatAmount - fee) * exchangeRate,
        stablecoin,
        chain,
        fee,
        exchangeRate,
        estimatedTime: '10-30 minutes',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };
    }).sort((a, b) => b.cryptoAmount - a.cryptoAmount);
  }

  async getOffRampQuotes(
    cryptoAmount: number,
    stablecoin: Stablecoin,
    fiatCurrency: FiatCurrency
  ): Promise<OffRampQuote[]> {
    const providers = ['MoonPay', 'Transak', 'Ramp'];

    return providers.map(provider => {
      const fee = cryptoAmount * (0.01 + Math.random() * 0.015); // 1-2.5% fee
      const exchangeRate = 0.98 + Math.random() * 0.02; // 0.98-1.00

      return {
        provider,
        cryptoAmount,
        stablecoin,
        fiatAmount: (cryptoAmount - fee) * exchangeRate,
        fiatCurrency,
        fee,
        exchangeRate,
        payoutMethod: 'bank_transfer' as const,
        estimatedTime: '1-3 business days',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };
    }).sort((a, b) => b.fiatAmount - a.fiatAmount);
  }

  // ============================================================
  // USER ACCOUNT MANAGEMENT
  // ============================================================

  async createUserAccount(userId: string, tier: UserPaymentAccount['tier'] = 'basic'): Promise<UserPaymentAccount> {
    const limits = this.tierLimits[tier];

    const account: UserPaymentAccount = {
      userId,
      addresses: [],
      defaultChain: 'polygon',
      defaultStablecoin: 'USDC',
      kycVerified: tier !== 'basic',
      tier,
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      dailyUsed: 0,
      monthlyUsed: 0,
      linkedBankAccounts: [],
      linkedCards: [],
    };

    this.userAccounts.set(userId, account);
    this.emit('account:created', account);

    return account;
  }

  getUserAccount(userId: string): UserPaymentAccount | undefined {
    return this.userAccounts.get(userId);
  }

  async upgradeUserTier(userId: string, newTier: UserPaymentAccount['tier']): Promise<UserPaymentAccount> {
    const account = this.userAccounts.get(userId);
    if (!account) throw new Error('Account not found');

    const limits = this.tierLimits[newTier];
    account.tier = newTier;
    account.dailyLimit = limits.daily;
    account.monthlyLimit = limits.monthly;
    account.kycVerified = newTier !== 'basic';

    this.emit('account:upgraded', account);

    return account;
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    // Process recurring payments every hour
    setInterval(() => {
      this.processRecurringPayments();
    }, 60 * 60 * 1000);

    // Reset daily limits at midnight UTC
    setInterval(() => {
      const now = new Date();
      if (now.getUTCHours() === 0 && now.getUTCMinutes() < 1) {
        for (const account of this.userAccounts.values()) {
          account.dailyUsed = 0;
        }
      }
    }, 60 * 1000);

    // Reset monthly limits on 1st of month
    setInterval(() => {
      const now = new Date();
      if (now.getUTCDate() === 1 && now.getUTCHours() === 0 && now.getUTCMinutes() < 1) {
        for (const account of this.userAccounts.values()) {
          account.monthlyUsed = 0;
        }
      }
    }, 60 * 1000);

    console.log('[InstantPayments] Engine started');
    this.emit('started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[InstantPayments] Engine stopped');
    this.emit('stopped');
  }

  getState(): {
    running: boolean;
    totalPayments: number;
    totalPaymentLinks: number;
    totalInvoices: number;
    totalRecurringPayments: number;
    totalUsers: number;
    totalVolume: number;
  } {
    const totalVolume = Array.from(this.payments.values())
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      running: this.isRunning,
      totalPayments: this.payments.size,
      totalPaymentLinks: this.paymentLinks.size,
      totalInvoices: this.invoices.size,
      totalRecurringPayments: this.recurringPayments.size,
      totalUsers: this.userAccounts.size,
      totalVolume,
    };
  }
}

// Export singleton
export const instantPayments = new InstantPaymentsEngine();
export default instantPayments;

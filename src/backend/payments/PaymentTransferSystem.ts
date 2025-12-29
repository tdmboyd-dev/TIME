/**
 * CUSTOM PAYMENT TRANSFER SYSTEM
 * Version 1.0.0 | December 19, 2025
 *
 * Alternative to Stripe - Direct bank transfer style payments
 * with 10% platform fee that goes to owner account.
 *
 * Features:
 * - Bank-to-bank transfer simulation
 * - 10% platform fee on all transactions
 * - Payment verification system
 * - Transaction history
 * - Admin withdrawal to owner bank
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

// Owner bank details (encrypted in production)
const OWNER_ACCOUNT = {
  name: 'TIME Platform LLC',
  bankName: 'Chase Bank',
  accountLast4: '4892',
  routingLast4: '2547',
};

// Fee structure
export const FEE_STRUCTURE = {
  platformFee: 0.10, // 10% platform fee
  minFee: 0.99, // Minimum fee
  maxFee: 500, // Maximum fee cap
};

// Payment status
export type PaymentStatus =
  | 'pending'      // Awaiting payment
  | 'processing'   // Processing transfer
  | 'completed'    // Successfully transferred
  | 'failed'       // Transfer failed
  | 'refunded'     // Refunded to user
  | 'disputed';    // Under dispute

// Payment type
export type PaymentType =
  | 'subscription'  // Monthly subscription
  | 'one_time'      // One-time purchase
  | 'deposit'       // Deposit to trading account
  | 'withdrawal';   // Withdrawal from platform

// Payment record
export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  type: PaymentType;
  description: string;
  amount: number;
  fee: number;
  netAmount: number; // After fee
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  referenceNumber: string;
  bankDetails?: {
    bankName: string;
    accountLast4: string;
    accountHolder: string;
  };
  metadata?: Record<string, any>;
}

// Subscription tier
export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
}

// User subscription
export interface UserSubscription {
  userId: string;
  tierId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  startDate: Date;
  endDate: Date;
  nextBillingDate?: Date;
  paymentHistory: string[]; // Payment IDs
}

/**
 * PaymentTransferSystem
 *
 * Handles all payment processing with 10% platform fee.
 * Simulates bank transfer process with verification steps.
 */
export class PaymentTransferSystem extends EventEmitter {
  private payments: Map<string, PaymentRecord> = new Map();
  private subscriptions: Map<string, UserSubscription> = new Map();
  private ownerBalance: number = 0;

  constructor() {
    super();
    console.log('[PaymentTransferSystem] Initialized with 10% platform fee');
  }

  /**
   * Create a new payment request
   */
  createPayment(
    userId: string,
    userEmail: string,
    amount: number,
    type: PaymentType,
    description: string,
    metadata?: Record<string, any>
  ): PaymentRecord {
    // Calculate fee (10% with min/max caps)
    let fee = amount * FEE_STRUCTURE.platformFee;
    fee = Math.max(FEE_STRUCTURE.minFee, Math.min(FEE_STRUCTURE.maxFee, fee));

    const netAmount = amount - fee;

    const payment: PaymentRecord = {
      id: `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      userId,
      userEmail,
      type,
      description,
      amount,
      fee,
      netAmount,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      referenceNumber: this.generateReferenceNumber(),
      metadata,
    };

    this.payments.set(payment.id, payment);
    this.emit('paymentCreated', payment);

    console.log(`[PaymentTransferSystem] Payment created: ${payment.id} for $${amount.toFixed(2)} (fee: $${fee.toFixed(2)})`);

    return payment;
  }

  /**
   * Process a payment (simulate bank transfer)
   */
  async processPayment(paymentId: string, bankDetails: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    accountHolder: string;
  }): Promise<PaymentRecord> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (payment.status !== 'pending') {
      throw new Error(`Payment is not pending: ${payment.status}`);
    }

    // Update status to processing
    payment.status = 'processing';
    payment.updatedAt = new Date();
    payment.bankDetails = {
      bankName: bankDetails.bankName,
      accountLast4: bankDetails.accountNumber.slice(-4),
      accountHolder: bankDetails.accountHolder,
    };

    this.payments.set(paymentId, payment);
    this.emit('paymentProcessing', payment);

    console.log(`[PaymentTransferSystem] Processing payment: ${paymentId}`);

    // Simulate bank processing delay (2-5 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Simulate success (95% success rate in production would be real bank API)
    const success = Math.random() > 0.05;

    if (success) {
      payment.status = 'completed';
      payment.completedAt = new Date();

      // Add fee to owner balance
      this.ownerBalance += payment.fee;

      console.log(`[PaymentTransferSystem] Payment completed: ${paymentId} | Fee collected: $${payment.fee.toFixed(2)}`);
      this.emit('paymentCompleted', payment);
    } else {
      payment.status = 'failed';
      console.log(`[PaymentTransferSystem] Payment failed: ${paymentId}`);
      this.emit('paymentFailed', payment);
    }

    payment.updatedAt = new Date();
    this.payments.set(paymentId, payment);

    return payment;
  }

  /**
   * Verify a pending payment (manual verification by user)
   */
  verifyPayment(paymentId: string, verificationCode: string): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) return false;

    // In production, this would verify against actual bank transfer
    // For now, check if verification code matches pattern
    const expectedCode = payment.referenceNumber.slice(-6);

    if (verificationCode === expectedCode) {
      payment.status = 'completed';
      payment.completedAt = new Date();
      payment.updatedAt = new Date();
      this.ownerBalance += payment.fee;
      this.payments.set(paymentId, payment);
      this.emit('paymentVerified', payment);
      return true;
    }

    return false;
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    userId: string,
    userEmail: string,
    tierId: string
  ): Promise<{ subscription: UserSubscription; payment: PaymentRecord }> {
    // Get tier details
    const tier = this.getSubscriptionTiers().find(t => t.id === tierId);
    if (!tier) {
      throw new Error(`Tier not found: ${tierId}`);
    }

    // Create initial payment
    const payment = this.createPayment(
      userId,
      userEmail,
      tier.price,
      'subscription',
      `${tier.name} Subscription (${tier.interval})`
    );

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    if (tier.interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create subscription
    const subscription: UserSubscription = {
      userId,
      tierId,
      status: 'active',
      startDate,
      endDate,
      nextBillingDate: endDate,
      paymentHistory: [payment.id],
    };

    this.subscriptions.set(userId, subscription);
    this.emit('subscriptionCreated', { subscription, payment });

    return { subscription, payment };
  }

  /**
   * Cancel a subscription
   */
  cancelSubscription(userId: string): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return false;

    subscription.status = 'cancelled';
    this.subscriptions.set(userId, subscription);
    this.emit('subscriptionCancelled', subscription);

    return true;
  }

  /**
   * Request refund
   */
  async requestRefund(paymentId: string, reason: string): Promise<PaymentRecord> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (payment.status !== 'completed') {
      throw new Error('Only completed payments can be refunded');
    }

    // Deduct fee from owner balance
    this.ownerBalance -= payment.fee;

    payment.status = 'refunded';
    payment.updatedAt = new Date();
    payment.metadata = { ...payment.metadata, refundReason: reason };

    this.payments.set(paymentId, payment);
    this.emit('paymentRefunded', payment);

    return payment;
  }

  // ============== GETTERS ==============

  getPayment(paymentId: string): PaymentRecord | undefined {
    return this.payments.get(paymentId);
  }

  getUserPayments(userId: string): PaymentRecord[] {
    return Array.from(this.payments.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getAllPayments(): PaymentRecord[] {
    return Array.from(this.payments.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getSubscription(userId: string): UserSubscription | undefined {
    return this.subscriptions.get(userId);
  }

  getOwnerBalance(): number {
    return this.ownerBalance;
  }

  getOwnerAccount(): typeof OWNER_ACCOUNT {
    return OWNER_ACCOUNT;
  }

  getFeeStructure(): typeof FEE_STRUCTURE {
    return FEE_STRUCTURE;
  }

  /**
   * Get available subscription tiers
   * NOTE: Ultimate Money Machine ($59) is a SEPARATE optional add-on
   *       It requires admin approval and is NOT part of these tiers
   *
   * OFFICIAL PRICING (from GiftAccessService.ts):
   * - FREE: $0
   * - STARTER: $24.99/mo ($19.99/mo annual)
   * - PRO: $79/mo ($63.20/mo annual)
   * - UNLIMITED: $149/mo ($119.20/mo annual)
   * - ENTERPRISE: $499/mo ($399.20/mo annual)
   */
  getSubscriptionTiers(): SubscriptionTier[] {
    return [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'monthly',
        features: [
          'Paper trading',
          'Basic charts',
          'Community bots',
          '5 alerts',
          '3 bot limit',
        ],
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 24.99,
        interval: 'monthly',
        features: [
          'Live trading',
          '1 AI-powered bot',
          '$10K capital limit',
          'Basic alerts',
          'Email support',
          '50 trades/month',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 79,
        interval: 'monthly',
        features: [
          'Everything in Starter',
          '5 AI-powered bots',
          'Unlimited capital',
          'Tax-loss harvesting',
          'Advanced charts',
          'Priority support',
          '500 trades/month',
        ],
      },
      {
        id: 'unlimited',
        name: 'Unlimited',
        price: 149,
        interval: 'monthly',
        features: [
          'Everything in Pro',
          'Unlimited AI bots',
          'Unlimited capital',
          'Dynasty Trust planning',
          'Family Legacy AI',
          'AutoPilot system',
          'Dedicated support',
          'Unlimited trades',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 499,
        interval: 'monthly',
        features: [
          'Everything in Unlimited',
          'White-label solution',
          'Full API access',
          'Custom strategies',
          'Account manager',
          'SLA guarantee',
          'Custom integrations',
        ],
      },
    ];
  }

  /**
   * Ultimate Money Machine - SEPARATE OPTIONAL ADD-ON
   * Requires admin approval - not available for self-purchase
   */
  getUltimateMoneyMachineInfo(): {
    name: string;
    price: number;
    description: string;
    features: string[];
    requiresApproval: boolean;
  } {
    return {
      name: 'Ultimate Money Machine',
      price: 59,
      description: 'The most advanced trading AI - ADMIN APPROVAL REQUIRED',
      features: [
        '25 Super Bots (LEGENDARY, EPIC, RARE)',
        '133 Regular Bots',
        'Attack Strategies',
        'Institutional Techniques',
        'Self-learning AI',
        'Priority Execution',
        'Live Trading Integration',
      ],
      requiresApproval: true,
    };
  }

  /**
   * Get payment statistics
   */
  getStats(): {
    totalPayments: number;
    completedPayments: number;
    totalVolume: number;
    totalFees: number;
    ownerBalance: number;
    activeSubscriptions: number;
  } {
    const payments = Array.from(this.payments.values());
    const completed = payments.filter(p => p.status === 'completed');

    return {
      totalPayments: payments.length,
      completedPayments: completed.length,
      totalVolume: completed.reduce((sum, p) => sum + p.amount, 0),
      totalFees: completed.reduce((sum, p) => sum + p.fee, 0),
      ownerBalance: this.ownerBalance,
      activeSubscriptions: Array.from(this.subscriptions.values())
        .filter(s => s.status === 'active').length,
    };
  }

  // ============== ADMIN FUNCTIONS ==============

  /**
   * Admin: Withdraw fees to owner bank account
   */
  async withdrawToOwner(amount: number): Promise<{
    success: boolean;
    withdrawnAmount: number;
    remainingBalance: number;
    referenceNumber: string;
  }> {
    if (amount > this.ownerBalance) {
      throw new Error(`Insufficient balance: $${this.ownerBalance.toFixed(2)} available`);
    }

    const withdrawAmount = Math.min(amount, this.ownerBalance);
    this.ownerBalance -= withdrawAmount;

    const referenceNumber = this.generateReferenceNumber();

    console.log(`[PaymentTransferSystem] ADMIN WITHDRAWAL: $${withdrawAmount.toFixed(2)} to ${OWNER_ACCOUNT.bankName} ****${OWNER_ACCOUNT.accountLast4}`);

    this.emit('ownerWithdrawal', {
      amount: withdrawAmount,
      referenceNumber,
      bankAccount: OWNER_ACCOUNT,
    });

    return {
      success: true,
      withdrawnAmount: withdrawAmount,
      remainingBalance: this.ownerBalance,
      referenceNumber,
    };
  }

  /**
   * Admin: Manually mark payment as completed
   */
  adminCompletePayment(paymentId: string): PaymentRecord | null {
    const payment = this.payments.get(paymentId);
    if (!payment) return null;

    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.updatedAt = new Date();
    this.ownerBalance += payment.fee;

    this.payments.set(paymentId, payment);
    return payment;
  }

  // ============== HELPERS ==============

  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `TRF-${timestamp}-${random}`;
  }
}

// Singleton instance
let instance: PaymentTransferSystem | null = null;

export function getPaymentTransferSystem(): PaymentTransferSystem {
  if (!instance) {
    instance = new PaymentTransferSystem();
  }
  return instance;
}

export default PaymentTransferSystem;

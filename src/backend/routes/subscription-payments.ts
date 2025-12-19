/**
 * SUBSCRIPTION & TRANSFER PAYMENT ROUTES
 * Version 1.0.0 | December 19, 2025
 *
 * Custom payment system with 10% platform fee
 * Alternative to Stripe - bank transfer style payments
 */

import { Router, Request, Response } from 'express';
import {
  getPaymentTransferSystem,
  PaymentType,
} from '../payments/PaymentTransferSystem';

const router = Router();

// ============== PUBLIC ROUTES ==============

// GET /api/v1/subscription/tiers - Get subscription tiers
router.get('/tiers', (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const tiers = paymentSystem.getSubscriptionTiers();
    const feeStructure = paymentSystem.getFeeStructure();

    res.json({
      success: true,
      tiers,
      feeStructure: {
        platformFee: `${feeStructure.platformFee * 100}%`,
        minFee: feeStructure.minFee,
        maxFee: feeStructure.maxFee,
      },
      note: 'Ultimate Money Machine is a SEPARATE optional add-on requiring admin approval',
    });
  } catch (error) {
    console.error('[Payments] Error getting tiers:', error);
    res.status(500).json({ error: 'Failed to get subscription tiers' });
  }
});

// GET /api/v1/subscription/ultimate-money-machine - Get UMM add-on info
router.get('/ultimate-money-machine', (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const ummInfo = paymentSystem.getUltimateMoneyMachineInfo();

    res.json({
      success: true,
      addOn: ummInfo,
      note: 'This is an OPTIONAL ADD-ON that requires admin approval. Contact admin for access.',
    });
  } catch (error) {
    console.error('[Payments] Error getting UMM info:', error);
    res.status(500).json({ error: 'Failed to get Ultimate Money Machine info' });
  }
});

// GET /api/v1/subscription/fee-calculator - Calculate fee for amount
router.get('/fee-calculator', (req: Request, res: Response) => {
  try {
    const amount = parseFloat(req.query.amount as string);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const paymentSystem = getPaymentTransferSystem();
    const feeStructure = paymentSystem.getFeeStructure();

    let fee = amount * feeStructure.platformFee;
    fee = Math.max(feeStructure.minFee, Math.min(feeStructure.maxFee, fee));

    res.json({
      success: true,
      amount,
      fee,
      netAmount: amount - fee,
      feePercentage: `${(fee / amount * 100).toFixed(2)}%`,
    });
  } catch (error) {
    console.error('[Payments] Error calculating fee:', error);
    res.status(500).json({ error: 'Failed to calculate fee' });
  }
});

// ============== USER PAYMENT ROUTES ==============

// POST /api/v1/subscription/payment/create - Create a new payment
router.post('/payment/create', (req: Request, res: Response) => {
  try {
    const { userId, userEmail, amount, type, description, metadata } = req.body;

    if (!userId || !userEmail || !amount || !type) {
      return res.status(400).json({
        error: 'Required fields: userId, userEmail, amount, type',
      });
    }

    const paymentSystem = getPaymentTransferSystem();
    const payment = paymentSystem.createPayment(
      userId,
      userEmail,
      amount,
      type as PaymentType,
      description || `${type} payment`,
      metadata
    );

    res.json({
      success: true,
      payment,
      instructions: {
        message: 'Please transfer the amount to complete your payment',
        amount: payment.amount,
        fee: payment.fee,
        total: payment.amount,
        referenceNumber: payment.referenceNumber,
        verificationCode: payment.referenceNumber.slice(-6),
        recipientBank: paymentSystem.getOwnerAccount().bankName,
        recipientName: paymentSystem.getOwnerAccount().name,
      },
    });
  } catch (error) {
    console.error('[Payments] Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// POST /api/v1/subscription/payment/:paymentId/process - Process a payment with bank details
router.post('/payment/:paymentId/process', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { bankName, accountNumber, routingNumber, accountHolder } = req.body;

    if (!bankName || !accountNumber || !routingNumber || !accountHolder) {
      return res.status(400).json({
        error: 'Required fields: bankName, accountNumber, routingNumber, accountHolder',
      });
    }

    const paymentSystem = getPaymentTransferSystem();
    const payment = await paymentSystem.processPayment(paymentId, {
      bankName,
      accountNumber,
      routingNumber,
      accountHolder,
    });

    res.json({
      success: true,
      payment,
      message: payment.status === 'completed'
        ? 'Payment completed successfully!'
        : 'Payment processing failed. Please try again.',
    });
  } catch (error: any) {
    console.error('[Payments] Error processing payment:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

// POST /api/v1/subscription/payment/:paymentId/verify - Verify payment with code
router.post('/payment/:paymentId/verify', (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { verificationCode } = req.body;

    if (!verificationCode) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const paymentSystem = getPaymentTransferSystem();
    const verified = paymentSystem.verifyPayment(paymentId, verificationCode);

    if (verified) {
      const payment = paymentSystem.getPayment(paymentId);
      res.json({
        success: true,
        message: 'Payment verified successfully!',
        payment,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid verification code',
      });
    }
  } catch (error) {
    console.error('[Payments] Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// GET /api/v1/subscription/payment/:paymentId - Get payment details
router.get('/payment/:paymentId', (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const payment = paymentSystem.getPayment(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('[Payments] Error getting payment:', error);
    res.status(500).json({ error: 'Failed to get payment' });
  }
});

// GET /api/v1/subscription/payments/user/:userId - Get user's payments
router.get('/payments/user/:userId', (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const payments = paymentSystem.getUserPayments(req.params.userId);

    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('[Payments] Error getting user payments:', error);
    res.status(500).json({ error: 'Failed to get user payments' });
  }
});

// ============== SUBSCRIPTION ROUTES ==============

// POST /api/v1/subscription/subscribe - Create subscription
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { userId, userEmail, tierId } = req.body;

    if (!userId || !userEmail || !tierId) {
      return res.status(400).json({
        error: 'Required fields: userId, userEmail, tierId',
      });
    }

    const paymentSystem = getPaymentTransferSystem();
    const result = await paymentSystem.createSubscription(userId, userEmail, tierId);

    res.json({
      success: true,
      subscription: result.subscription,
      payment: result.payment,
      message: `Subscription to ${tierId} tier created. Please complete payment.`,
    });
  } catch (error: any) {
    console.error('[Payments] Error creating subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
});

// GET /api/v1/subscription/status/:userId - Get user's subscription
router.get('/status/:userId', (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const subscription = paymentSystem.getSubscription(req.params.userId);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No active subscription',
      });
    }

    res.json({ success: true, subscription });
  } catch (error) {
    console.error('[Payments] Error getting subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// POST /api/v1/subscription/:userId/cancel - Cancel subscription
router.post('/:userId/cancel', (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const cancelled = paymentSystem.cancelSubscription(req.params.userId);

    if (!cancelled) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('[Payments] Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// POST /api/v1/subscription/payment/:paymentId/refund - Request refund
router.post('/payment/:paymentId/refund', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const paymentSystem = getPaymentTransferSystem();

    const payment = await paymentSystem.requestRefund(
      req.params.paymentId,
      reason || 'User requested refund'
    );

    res.json({
      success: true,
      payment,
      message: 'Refund processed successfully',
    });
  } catch (error: any) {
    console.error('[Payments] Error processing refund:', error);
    res.status(500).json({ error: error.message || 'Failed to process refund' });
  }
});

// ============== ADMIN ROUTES ==============

// Admin authentication middleware
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const adminKey = req.headers['x-admin-key'] as string;
  // In production, use proper authentication
  if (adminKey !== 'TIME_ADMIN_2025') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/v1/subscription/admin/stats - Get payment statistics
router.get('/admin/stats', requireAdmin, (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const stats = paymentSystem.getStats();

    res.json({
      success: true,
      stats,
      ownerAccount: paymentSystem.getOwnerAccount(),
    });
  } catch (error) {
    console.error('[Payments] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET /api/v1/subscription/admin/all - Get all payments
router.get('/admin/all', requireAdmin, (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const payments = paymentSystem.getAllPayments();

    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('[Payments] Error getting all payments:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// POST /api/v1/subscription/admin/withdraw - Withdraw fees to owner account
router.post('/admin/withdraw', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const paymentSystem = getPaymentTransferSystem();
    const result = await paymentSystem.withdrawToOwner(amount);

    res.json({
      ...result,
      message: `Withdrawn $${result.withdrawnAmount.toFixed(2)} to owner account`,
    });
  } catch (error: any) {
    console.error('[Payments] Error withdrawing:', error);
    res.status(500).json({ error: error.message || 'Failed to withdraw' });
  }
});

// POST /api/v1/subscription/admin/:paymentId/complete - Manually complete payment
router.post('/admin/:paymentId/complete', requireAdmin, (req: Request, res: Response) => {
  try {
    const paymentSystem = getPaymentTransferSystem();
    const payment = paymentSystem.adminCompletePayment(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      success: true,
      payment,
      message: 'Payment marked as completed',
    });
  } catch (error) {
    console.error('[Payments] Error completing payment:', error);
    res.status(500).json({ error: 'Failed to complete payment' });
  }
});

export default router;

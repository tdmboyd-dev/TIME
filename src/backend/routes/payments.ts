/**
 * TIME Pay API Routes
 *
 * Endpoints for the revolutionary instant payment system:
 * - Wallet management
 * - Instant transfers
 * - Payment requests
 * - External transfers
 * - Interest tracking
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { timePayEngine, TIME_PAY_FEES, INTEREST_RATES, TRANSFER_LIMITS } from '../payments/time_pay';

const router = Router();

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

/**
 * GET /payments/info
 * Get TIME Pay information and fee structure
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    name: 'TIME Pay',
    description: 'Revolutionary instant payment system for traders',
    features: [
      'Instant P2P transfers - FREE',
      'Earn 4-5% APY on balances',
      '24/7/365 availability',
      'Instant trading account funding',
      'Cross-border at 1% (vs 3-5% at banks)',
      'FDIC insured through partner bank',
    ],
    fees: TIME_PAY_FEES,
    interestRates: INTEREST_RATES,
    limits: TRANSFER_LIMITS,
    comparison: timePayEngine.getFeeComparison(),
  });
});

/**
 * GET /payments/stats
 * Get platform statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  res.json(timePayEngine.getStats());
});

// ============================================================
// WALLET MANAGEMENT
// ============================================================

/**
 * POST /payments/wallet
 * Create a new wallet
 */
router.post('/wallet', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { type = 'personal' } = req.body;

  const validTypes = ['personal', 'trading', 'savings', 'business'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: 'Invalid wallet type',
      validTypes,
    });
  }

  const wallet = timePayEngine.createWallet(user.id, type, true);

  res.status(201).json({
    success: true,
    message: `${type} wallet created`,
    wallet: {
      id: wallet.id,
      type: wallet.type,
      balance: wallet.balance,
      interestRate: wallet.interestRate,
      dailyLimit: wallet.dailyLimit,
      monthlyLimit: wallet.monthlyLimit,
    },
  });
});

/**
 * GET /payments/wallets
 * Get user's wallets
 */
router.get('/wallets', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const wallets = timePayEngine.getUserWallets(user.id);

  res.json({
    wallets: wallets.map(w => ({
      id: w.id,
      type: w.type,
      balance: w.balance,
      interestEarned: w.interestEarned,
      interestRate: w.interestRate,
      dailyLimit: w.dailyLimit,
      monthlyLimit: w.monthlyLimit,
    })),
    totalBalance: timePayEngine.getTotalBalance(user.id),
  });
});

/**
 * GET /payments/wallet/:walletId
 * Get specific wallet details
 */
router.get('/wallet/:walletId', authMiddleware, (req: Request, res: Response) => {
  const { walletId } = req.params;
  const wallet = timePayEngine.getWallet(walletId);

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  res.json({ wallet });
});

// ============================================================
// TRANSFERS
// ============================================================

/**
 * POST /payments/send
 * Send money to another TIME user (instant & FREE!)
 */
router.post('/send', authMiddleware, async (req: Request, res: Response) => {
  const { fromWalletId, toWalletId, amount, memo } = req.body;

  if (!fromWalletId || !toWalletId || !amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fromWalletId', 'toWalletId', 'amount'],
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  try {
    const transfer = await timePayEngine.sendInstant(fromWalletId, toWalletId, amount, memo);

    res.json({
      success: true,
      message: 'Transfer completed instantly!',
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        fee: transfer.fee,
        reference: transfer.reference,
        status: transfer.status,
        completedAt: transfer.completedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /payments/send-external
 * Send to external account (bank, card)
 */
router.post('/send-external', authMiddleware, async (req: Request, res: Response) => {
  const { fromWalletId, type, amount, instant = false } = req.body;

  if (!fromWalletId || !type || !amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fromWalletId', 'type', 'amount'],
    });
  }

  const validTypes = ['bank', 'debit_card', 'wire'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type', validTypes });
  }

  try {
    const transfer = await timePayEngine.sendExternal(fromWalletId, type, amount, instant);

    res.json({
      success: true,
      message: instant ? 'Instant transfer initiated!' : 'Transfer initiated',
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        fee: transfer.fee,
        reference: transfer.reference,
        status: transfer.status,
        estimatedArrival: transfer.estimatedArrival,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /payments/send-international
 * Send cross-border transfer (1% fee vs 3-5% at banks!)
 */
router.post('/send-international', authMiddleware, async (req: Request, res: Response) => {
  const { fromWalletId, recipientCountry, amount, currency, recipientDetails } = req.body;

  if (!fromWalletId || !recipientCountry || !amount || !currency) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fromWalletId', 'recipientCountry', 'amount', 'currency'],
    });
  }

  try {
    const transfer = await timePayEngine.sendCrossBorder(
      fromWalletId,
      recipientCountry,
      amount,
      currency,
      recipientDetails || {}
    );

    res.json({
      success: true,
      message: 'Cross-border transfer initiated at just 1% fee!',
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        fee: transfer.fee,
        reference: transfer.reference,
        status: transfer.status,
        estimatedArrival: transfer.estimatedArrival,
      },
      savings: `You saved ~$${(amount * 0.03).toFixed(2)} compared to traditional wire!`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /payments/to-trading
 * Move funds to trading account (FREE & instant!)
 */
router.post('/to-trading', authMiddleware, async (req: Request, res: Response) => {
  const { fromWalletId, tradingWalletId, amount } = req.body;

  if (!fromWalletId || !tradingWalletId || !amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fromWalletId', 'tradingWalletId', 'amount'],
    });
  }

  try {
    const transfer = await timePayEngine.moveToTrading(fromWalletId, tradingWalletId, amount);

    res.json({
      success: true,
      message: 'Funds moved to trading instantly - FREE!',
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        fee: 0,
        status: 'completed',
      },
      note: 'Start trading immediately!',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// PAYMENT REQUESTS
// ============================================================

/**
 * POST /payments/request
 * Request payment from someone
 */
router.post('/request', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { amount, memo, payerId } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount required' });
  }

  const request = timePayEngine.createPaymentRequest(user.id, amount, memo, payerId);

  res.status(201).json({
    success: true,
    message: 'Payment request created',
    request: {
      id: request.id,
      amount: request.amount,
      memo: request.memo,
      expiresAt: request.expiresAt,
      status: request.status,
    },
  });
});

/**
 * POST /payments/request/:requestId/pay
 * Pay a payment request
 */
router.post('/request/:requestId/pay', authMiddleware, async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { walletId } = req.body;

  if (!walletId) {
    return res.status(400).json({ error: 'walletId required' });
  }

  try {
    const transfer = await timePayEngine.payRequest(requestId, walletId);

    res.json({
      success: true,
      message: 'Payment completed!',
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        status: transfer.status,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// DEPOSITS
// ============================================================

/**
 * POST /payments/deposit
 * Deposit from linked account
 */
router.post('/deposit', authMiddleware, async (req: Request, res: Response) => {
  const { walletId, amount, source = 'bank' } = req.body;

  if (!walletId || !amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['walletId', 'amount'],
    });
  }

  try {
    const result = await timePayEngine.deposit(walletId, amount, source);

    res.json({
      success: true,
      message: source === 'card' ? 'Instant deposit completed!' : 'Deposit initiated',
      transactionId: result.transactionId,
      estimatedArrival: result.estimatedArrival,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// TRANSACTION HISTORY
// ============================================================

/**
 * GET /payments/history
 * Get transaction history
 */
router.get('/history', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const limit = parseInt(req.query.limit as string) || 50;

  const transactions = timePayEngine.getTransactionHistory(user.id, limit);

  res.json({
    total: transactions.length,
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      fee: t.fee,
      status: t.status,
      reference: t.reference,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })),
  });
});

export default router;

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
import { authMiddleware, adminMiddleware } from './auth';
import {
  timePayEngine,
  TIME_PAY_FEES,
  INTEREST_RATES,
  TRANSFER_LIMITS,
  FREE_P2P_MONTHLY_LIMIT,
  TRADING_FEES,
  CARD_FEES,
  MERCHANT_FEES,
  SUBSCRIPTION_TIERS
} from '../payments/time_pay';
import { auditLogger, AUDIT_ACTIONS } from '../security/audit_logger';

const router = Router();

// Daily transfer limit tracking (should use Redis in production)
const dailyTransferTracker = new Map<string, { amount: number; date: string }>();

/**
 * Verify wallet ownership - CRITICAL SECURITY CHECK
 * Prevents users from accessing/transferring from wallets they don't own
 */
function verifyWalletOwnership(walletId: string, userId: string): boolean {
  const wallet = timePayEngine.getWallet(walletId);
  if (!wallet) return false;
  return wallet.odUserId === userId;
}

/**
 * Check daily transfer limits
 */
function checkDailyLimit(userId: string, amount: number, dailyLimit: number): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${today}`;
  const tracker = dailyTransferTracker.get(key);

  if (!tracker || tracker.date !== today) {
    dailyTransferTracker.set(key, { amount: 0, date: today });
    return { allowed: amount <= dailyLimit, remaining: dailyLimit };
  }

  const remaining = dailyLimit - tracker.amount;
  return { allowed: amount <= remaining, remaining };
}

/**
 * Record transfer for daily limit tracking
 */
function recordTransfer(userId: string, amount: number): void {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${today}`;
  const tracker = dailyTransferTracker.get(key) || { amount: 0, date: today };
  tracker.amount += amount;
  dailyTransferTracker.set(key, tracker);
}

// Duplicate transaction prevention (use Redis in production)
const recentTransactions = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 60000; // 1 minute window

function isDuplicateTransaction(fromWalletId: string, toWalletId: string, amount: number): boolean {
  const key = `${fromWalletId}:${toWalletId}:${amount}`;
  const lastTime = recentTransactions.get(key);
  if (lastTime && Date.now() - lastTime < DUPLICATE_WINDOW_MS) {
    return true;
  }
  recentTransactions.set(key, Date.now());
  return false;
}

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
    description: 'Instant payment system for traders',
    features: [
      `FREE P2P transfers up to $${FREE_P2P_MONTHLY_LIMIT}/month, then 0.5% (max $10)`,
      'Earn UP TO 4.5% APY on balances*',
      '24/7/365 availability',
      'FREE instant trading account funding',
      'Cross-border at 1% (vs 3-5% at banks)',
      'FDIC insured through partner bank',
    ],
    fees: TIME_PAY_FEES,
    interestRates: {
      personal: { upTo: INTEREST_RATES.personal.upTo, current: INTEREST_RATES.personal.current },
      savings: { upTo: INTEREST_RATES.savings.upTo, current: INTEREST_RATES.savings.current },
      trading: { upTo: INTEREST_RATES.trading.upTo, current: INTEREST_RATES.trading.current },
      business: { upTo: INTEREST_RATES.business.upTo, current: INTEREST_RATES.business.current },
    },
    limits: TRANSFER_LIMITS,
    freeP2PMonthlyLimit: FREE_P2P_MONTHLY_LIMIT,
    comparison: timePayEngine.getFeeComparison(),
    disclaimers: timePayEngine.getDisclaimers(),
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
 * SECURITY: Verifies wallet ownership
 */
router.get('/wallet/:walletId', authMiddleware, (req: Request, res: Response) => {
  const { walletId } = req.params;
  const user = (req as any).user;
  const wallet = timePayEngine.getWallet(walletId);

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  // SECURITY: Verify wallet belongs to authenticated user
  if (!verifyWalletOwnership(walletId, user.id)) {
    return res.status(403).json({ error: 'Access denied: You do not own this wallet' });
  }

  // Include remaining free P2P info
  const freeP2PInfo = timePayEngine.getRemainingFreeP2P(walletId);

  res.json({
    wallet: {
      ...wallet,
      displayInterestRate: `UP TO ${wallet.maxInterestRate}% APY`,
      currentInterestRate: `${wallet.interestRate}% APY`,
    },
    freeP2P: {
      remainingFree: freeP2PInfo.remaining,
      monthlyLimit: FREE_P2P_MONTHLY_LIMIT,
      resetsOn: freeP2PInfo.resetDate,
      feeAfterLimit: '0.5% (no cap)',
    },
  });
});

/**
 * GET /payments/wallet/:walletId/free-limit
 * Check remaining free P2P transfer amount
 * SECURITY: Verifies wallet ownership
 */
router.get('/wallet/:walletId/free-limit', authMiddleware, (req: Request, res: Response) => {
  const { walletId } = req.params;
  const user = (req as any).user;

  // SECURITY: Verify wallet belongs to authenticated user
  if (!verifyWalletOwnership(walletId, user.id)) {
    return res.status(403).json({ error: 'Access denied: You do not own this wallet' });
  }

  try {
    const freeP2PInfo = timePayEngine.getRemainingFreeP2P(walletId);

    res.json({
      walletId,
      monthlyLimit: FREE_P2P_MONTHLY_LIMIT,
      used: FREE_P2P_MONTHLY_LIMIT - freeP2PInfo.remaining,
      remaining: freeP2PInfo.remaining,
      resetsOn: freeP2PInfo.resetDate,
      feeAfterLimit: {
        percent: 0.5,
        noCap: true,
        description: '0.5% fee (no cap) on transfers exceeding monthly free limit',
        example: '$5,000 over limit = $25 fee',
      },
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// ============================================================
// TRANSFERS
// ============================================================

/**
 * POST /payments/send
 * Send money to another TIME user (instant & FREE!)
 * SECURITY: Ownership verification, daily limits, duplicate prevention
 */
router.post('/send', authMiddleware, async (req: Request, res: Response) => {
  const { fromWalletId, toWalletId, amount, memo } = req.body;
  const user = (req as any).user;
  const clientIP = req.ip || 'unknown';

  if (!fromWalletId || !toWalletId || !amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fromWalletId', 'toWalletId', 'amount'],
    });
  }

  // Validate amount is positive and has proper decimal precision (2 places max)
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  // Validate decimal precision (max 2 decimal places for currency)
  if (Math.round(parsedAmount * 100) !== parsedAmount * 100) {
    return res.status(400).json({ error: 'Amount cannot have more than 2 decimal places' });
  }

  // SECURITY: Verify the sender owns the fromWallet
  if (!verifyWalletOwnership(fromWalletId, user.id)) {
    const auditAction = AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY || { action: 'security_violation', category: 'security', severity: 'high' };
    await auditLogger.logAction(auditAction as any, {
      userId: user.id,
      clientIP,
      resource: 'wallet',
      resourceId: fromWalletId,
      result: 'failure',
      errorMessage: 'Attempted transfer from wallet not owned by user',
    });
    return res.status(403).json({ error: 'Access denied: You do not own this wallet' });
  }

  // SECURITY: Check for duplicate transactions (prevent double-spend)
  if (isDuplicateTransaction(fromWalletId, toWalletId, parsedAmount)) {
    return res.status(429).json({
      error: 'Duplicate transaction detected. Please wait a moment before retrying.',
      retryAfter: '60 seconds',
    });
  }

  // SECURITY: Check daily transfer limit
  const wallet = timePayEngine.getWallet(fromWalletId);
  const dailyLimit = wallet?.dailyLimit || TRANSFER_LIMITS.verified.daily;
  const limitCheck = checkDailyLimit(user.id, parsedAmount, dailyLimit);

  if (!limitCheck.allowed) {
    return res.status(400).json({
      error: 'Daily transfer limit exceeded',
      dailyLimit,
      remaining: limitCheck.remaining,
      message: `You can transfer up to $${limitCheck.remaining.toFixed(2)} more today`,
    });
  }

  try {
    const transfer = await timePayEngine.sendInstant(fromWalletId, toWalletId, parsedAmount, memo);

    // Record transfer for daily limit tracking
    recordTransfer(user.id, parsedAmount);

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
 * SECURITY: Ownership verification required
 */
router.post('/send-external', authMiddleware, async (req: Request, res: Response) => {
  const { fromWalletId, type, amount, instant = false } = req.body;
  const user = (req as any).user;

  if (!fromWalletId || !type || !amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fromWalletId', 'type', 'amount'],
    });
  }

  // SECURITY: Verify wallet ownership
  if (!verifyWalletOwnership(fromWalletId, user.id)) {
    return res.status(403).json({ error: 'Access denied: You do not own this wallet' });
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
 * SECURITY: Ownership verification required
 */
router.post('/send-international', authMiddleware, async (req: Request, res: Response) => {
  const { fromWalletId, recipientCountry, amount, currency, recipientDetails } = req.body;
  const user = (req as any).user;

  if (!fromWalletId || !recipientCountry || !amount || !currency) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fromWalletId', 'recipientCountry', 'amount', 'currency'],
    });
  }

  // SECURITY: Verify wallet ownership
  if (!verifyWalletOwnership(fromWalletId, user.id)) {
    return res.status(403).json({ error: 'Access denied: You do not own this wallet' });
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
 * SECURITY: Both wallets must be owned by authenticated user
 */
router.post('/to-trading', authMiddleware, async (req: Request, res: Response) => {
  const { fromWalletId, tradingWalletId, amount } = req.body;
  const user = (req as any).user;

  if (!fromWalletId || !tradingWalletId || !amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['fromWalletId', 'tradingWalletId', 'amount'],
    });
  }

  // SECURITY: Verify user owns BOTH wallets
  if (!verifyWalletOwnership(fromWalletId, user.id)) {
    return res.status(403).json({ error: 'Access denied: You do not own the source wallet' });
  }
  if (!verifyWalletOwnership(tradingWalletId, user.id)) {
    return res.status(403).json({ error: 'Access denied: You do not own the trading wallet' });
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
 * SECURITY: Verify wallet ownership before paying
 */
router.post('/request/:requestId/pay', authMiddleware, async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { walletId } = req.body;
  const user = (req as any).user;

  if (!walletId) {
    return res.status(400).json({ error: 'walletId required' });
  }

  // SECURITY: Verify user owns the wallet they're paying from
  if (!verifyWalletOwnership(walletId, user.id)) {
    return res.status(403).json({ error: 'Access denied: You do not own this wallet' });
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
 * SECURITY: Verify wallet ownership
 */
router.post('/deposit', authMiddleware, async (req: Request, res: Response) => {
  const { walletId, amount, source = 'bank' } = req.body;
  const user = (req as any).user;

  if (!walletId || !amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['walletId', 'amount'],
    });
  }

  // SECURITY: Verify user owns the wallet they're depositing to
  if (!verifyWalletOwnership(walletId, user.id)) {
    return res.status(403).json({ error: 'Access denied: You do not own this wallet' });
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

// ============================================================
// SUBSCRIPTION TIERS
// ============================================================

/**
 * GET /payments/subscriptions
 * Get available subscription tiers
 */
router.get('/subscriptions', (req: Request, res: Response) => {
  res.json({
    tiers: SUBSCRIPTION_TIERS,
    comparison: [
      { feature: 'Monthly Price', free: '$0', pro: '$9.99', business: '$29.99' },
      { feature: 'Free P2P Limit', free: '$500/mo', pro: 'Unlimited', business: 'Unlimited' },
      { feature: 'APY on Savings', free: 'UP TO 3.5%', pro: 'UP TO 4.5%', business: 'UP TO 4.5%' },
      { feature: 'Card Cashback', free: '1%', pro: '2%', business: '2%' },
      { feature: 'ATM Fees', free: '$2.50 out-of-network', pro: 'FREE worldwide', business: 'FREE worldwide' },
      { feature: 'Daily Limit', free: '$2,500', pro: '$10,000', business: '$50,000' },
      { feature: 'Invoicing', free: 'No', pro: 'No', business: 'Yes' },
      { feature: 'Payroll', free: 'No', pro: 'No', business: 'Up to 10 employees' },
    ],
  });
});

// ============================================================
// ADMIN REVENUE ANALYTICS (Owner only)
// ============================================================

/**
 * GET /payments/admin/revenue-projection/:userCount
 * Get revenue projections for given user count
 */
router.get('/admin/revenue-projection/:userCount', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const userCount = parseInt(req.params.userCount) || 10000;

  const projection = timePayEngine.getRevenueProjection(userCount);

  res.json(projection);
});

/**
 * GET /payments/admin/revenue-breakdown
 * Get revenue breakdown by category
 */
router.get('/admin/revenue-breakdown', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  res.json({
    breakdown: timePayEngine.getRevenueBreakdown(),
    projections: {
      '10,000 users': timePayEngine.getRevenueProjection(10000),
      '50,000 users': timePayEngine.getRevenueProjection(50000),
      '100,000 users': timePayEngine.getRevenueProjection(100000),
      '500,000 users': timePayEngine.getRevenueProjection(500000),
    },
  });
});

/**
 * GET /payments/admin/all-fees
 * Get complete fee structure (for transparency)
 */
router.get('/admin/all-fees', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  res.json({
    fees: timePayEngine.getAllFees(),
    summary: {
      tradingSpread: '1.75% on crypto (hidden in price)',
      cardInterchange: '1.75% from Visa/MC, 1% to user, 0.75% kept',
      merchantProcessing: '2.5% + $0.10 per transaction',
      subscriptions: 'Pro $9.99, Business $29.99, Enterprise custom',
      instantCashout: '1.5% NO CAP (like CashApp)',
      crossBorder: '1.5% NO CAP',
      p2pOverLimit: '0.5% after $500/month free - NO CAP',
      interestSpread: '0.75% on deposits',
    },
    examples: {
      p2p: '$5,000 over limit × 0.5% = $25 fee',
      instantBank: '$10,000 instant cashout × 1.5% = $150 fee',
      instantCard: '$5,000 to debit card × 1.75% = $87.50 fee',
      crossBorder: '$10,000 international × 1.5% = $150 fee',
    },
  });
});

/**
 * GET /payments/fees/trading
 * Public trading fees info
 */
router.get('/fees/trading', (req: Request, res: Response) => {
  res.json({
    crypto: {
      commission: 'FREE',
      spread: '~1.5-2% (included in price)',
      note: 'No separate commission charged. Price includes our spread.',
    },
    stocks: {
      commission: 'FREE',
      note: 'Commission-free stock trading',
    },
    options: {
      perContract: '$0.65',
      note: '$0.65 per options contract',
    },
  });
});

/**
 * GET /payments/fees/card
 * TIME Card fees
 */
router.get('/fees/card', (req: Request, res: Response) => {
  res.json({
    cardFees: {
      annualFee: '$0',
      cashback: '1-2% on all purchases',
      atmInNetwork: 'FREE',
      atmOutOfNetwork: '$2.50 (FREE with Pro)',
      atmInternational: '$3.00 (FREE with Pro)',
      foreignTransaction: '0%',
      replacement: 'FREE (expedited $25)',
    },
    tiers: {
      free: '1% cashback',
      pro: '2% cashback + free ATM worldwide',
    },
  });
});

/**
 * GET /payments/fees/merchant
 * Merchant processing fees
 */
router.get('/fees/merchant', (req: Request, res: Response) => {
  res.json({
    processing: {
      rate: '2.5% + $0.10',
      comparison: 'vs Stripe 2.9% + $0.30, PayPal 2.9% + $0.30',
      savings: 'Save ~$0.20 per transaction',
    },
    features: {
      invoicing: 'FREE',
      invoiceFinancing: '2.5% to get paid immediately',
      chargebackFee: '$15 per dispute',
    },
    businessAccount: {
      price: '$29.99/month',
      includes: ['Invoicing', 'Payroll (up to 10)', 'Expense tracking', 'QuickBooks sync'],
    },
  });
});

export default router;

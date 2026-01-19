/**
 * Crypto Checkout Routes
 *
 * API endpoints for creating crypto payment checkouts via Coinbase Commerce
 * 1% fees (vs Stripe's 2.9%)
 */

import { Router, Request, Response } from 'express';
import { coinbaseCommerce } from '../payments/coinbase_commerce';
import { SUBSCRIPTION_TIERS, ADD_ONS } from '../payments/stripe_service';
import { authMiddleware } from './auth';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CryptoCheckout');
const router = Router();

// ============================================================
// SUBSCRIPTION CHECKOUT (Crypto)
// ============================================================

/**
 * POST /api/v1/crypto/create-checkout
 * Create a Coinbase Commerce checkout for subscription
 */
router.post('/create-checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { tierId, successUrl, cancelUrl } = req.body;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        error: 'tierId is required',
        availableTiers: Object.keys(SUBSCRIPTION_TIERS).filter(t => t !== 'FREE'),
      });
    }

    const tier = SUBSCRIPTION_TIERS[tierId.toUpperCase()];
    if (!tier) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier: ${tierId}`,
        availableTiers: Object.keys(SUBSCRIPTION_TIERS).filter(t => t !== 'FREE'),
      });
    }

    if (tier.id === 'free') {
      return res.status(400).json({
        success: false,
        error: 'Cannot create checkout for free tier',
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://timebeyondus.com';
    const success = successUrl || `${baseUrl}/payments?crypto_success=true`;
    const cancel = cancelUrl || `${baseUrl}/payments?crypto_canceled=true`;

    const result = await coinbaseCommerce.createSubscriptionCharge(
      user.id,
      tier.id,
      tier.name,
      tier.price,
      success,
      cancel
    );

    logger.info(`Crypto checkout created for user ${user.id}`, {
      tier: tierId,
      chargeId: result.chargeId,
    });

    res.json({
      success: true,
      chargeId: result.chargeId,
      hostedUrl: result.hostedUrl,
      paymentMethod: 'crypto',
      fee: '1%',
      supportedCurrencies: coinbaseCommerce.getSupportedCurrencies(),
    });
  } catch (error: any) {
    logger.error('Failed to create crypto checkout', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// ADD-ON CHECKOUT (Crypto)
// ============================================================

/**
 * POST /api/v1/crypto/create-addon-checkout
 * Create a Coinbase Commerce checkout for add-on purchase
 */
router.post('/create-addon-checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { addOnId, successUrl, cancelUrl } = req.body;

    if (!addOnId) {
      return res.status(400).json({
        success: false,
        error: 'addOnId is required',
        availableAddOns: Object.keys(ADD_ONS),
      });
    }

    const addOn = ADD_ONS[addOnId.toUpperCase()];
    if (!addOn) {
      return res.status(400).json({
        success: false,
        error: `Invalid add-on: ${addOnId}`,
        availableAddOns: Object.keys(ADD_ONS),
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://timebeyondus.com';
    const success = successUrl || `${baseUrl}/pricing?crypto_addon_success=true`;
    const cancel = cancelUrl || `${baseUrl}/pricing?crypto_addon_canceled=true`;

    const result = await coinbaseCommerce.createAddOnCharge(
      user.id,
      addOn.id,
      addOn.name,
      addOn.price,
      success,
      cancel
    );

    logger.info(`Crypto add-on checkout created for user ${user.id}`, {
      addOn: addOnId,
      chargeId: result.chargeId,
    });

    res.json({
      success: true,
      chargeId: result.chargeId,
      hostedUrl: result.hostedUrl,
      paymentMethod: 'crypto',
      fee: '1%',
    });
  } catch (error: any) {
    logger.error('Failed to create crypto add-on checkout', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// BOT PURCHASE (Crypto)
// ============================================================

/**
 * POST /api/v1/crypto/create-bot-checkout
 * Create a Coinbase Commerce checkout for bot rental
 */
router.post('/create-bot-checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { botId, botName, price, duration, successUrl, cancelUrl } = req.body;

    if (!botId || !botName || !price) {
      return res.status(400).json({
        success: false,
        error: 'botId, botName, and price are required',
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://timebeyondus.com';
    const success = successUrl || `${baseUrl}/marketplace?crypto_success=true&botId=${botId}`;
    const cancel = cancelUrl || `${baseUrl}/marketplace?crypto_canceled=true`;

    const result = await coinbaseCommerce.createBotPurchaseCharge(
      user.id,
      botId,
      `${botName} (${duration || 'Monthly'})`,
      price,
      success,
      cancel
    );

    logger.info(`Crypto bot checkout created for user ${user.id}`, {
      botId,
      chargeId: result.chargeId,
    });

    res.json({
      success: true,
      chargeId: result.chargeId,
      hostedUrl: result.hostedUrl,
      paymentMethod: 'crypto',
      fee: '1%',
    });
  } catch (error: any) {
    logger.error('Failed to create crypto bot checkout', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// CHARGE STATUS
// ============================================================

/**
 * GET /api/v1/crypto/charge/:chargeId
 * Get charge status
 */
router.get('/charge/:chargeId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { chargeId } = req.params;
    const charge = await coinbaseCommerce.getCharge(chargeId);

    res.json({
      success: true,
      charge: {
        id: charge.id,
        code: charge.code,
        status: charge.timeline[charge.timeline.length - 1]?.status || 'unknown',
        hostedUrl: charge.hosted_url,
        expiresAt: charge.expires_at,
        confirmedAt: charge.confirmed_at,
        payments: charge.payments,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// PAYMENT INFO
// ============================================================

/**
 * GET /api/v1/crypto/info
 * Get crypto payment information
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    enabled: coinbaseCommerce.isEnabled(),
    provider: 'Coinbase Commerce',
    fee: '1%',
    feeComparison: coinbaseCommerce.getFeeComparison(),
    supportedCurrencies: coinbaseCommerce.getSupportedCurrencies(),
    benefits: [
      'Lower fees (1% vs 2.9% + $0.30)',
      'Accept 9+ cryptocurrencies',
      'Instant settlement',
      'No chargebacks',
      'Global payments',
    ],
  });
});

export default router;

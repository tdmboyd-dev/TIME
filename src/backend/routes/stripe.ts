/**
 * TIME Stripe API Routes
 *
 * Endpoints for Stripe payment and subscription management:
 * - Create checkout sessions
 * - Create customer portal sessions
 * - Handle webhooks
 * - Get subscription status
 */

import { Router, Request, Response } from 'express';
import { stripeService, SUBSCRIPTION_TIERS, ADD_ONS } from '../payments/stripe_service';
import { authMiddleware } from './auth';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('StripeRoutes');
const router = Router();

// ============================================================
// CHECKOUT
// ============================================================

/**
 * POST /api/stripe/create-checkout
 * Create a Stripe checkout session for subscription
 *
 * Body:
 * - tierId: string (starter, pro, unlimited, enterprise)
 * - successUrl: string (optional, defaults to /payments?success=true)
 * - cancelUrl: string (optional, defaults to /payments?canceled=true)
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

    // Validate tier
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

    // Default URLs
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const success = successUrl || `${baseUrl}/payments?success=true`;
    const cancel = cancelUrl || `${baseUrl}/payments?canceled=true`;

    const session = await stripeService.createCheckoutSession(
      user.id,
      tierId,
      success,
      cancel,
      user.email
    );

    logger.info(`Checkout session created for user ${user.id}`, {
      tier: tierId,
      sessionId: session.sessionId,
    });

    res.json({
      success: true,
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error: any) {
    logger.error('Failed to create checkout session', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// ADD-ON CHECKOUT
// ============================================================

/**
 * POST /api/stripe/create-addon-checkout
 * Create a Stripe checkout session for add-on purchase
 *
 * Body:
 * - addOnId: string (dropbot, umm)
 * - successUrl: string (optional)
 * - cancelUrl: string (optional)
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

    // Validate add-on
    const addOn = ADD_ONS[addOnId.toUpperCase()];
    if (!addOn) {
      return res.status(400).json({
        success: false,
        error: `Invalid add-on: ${addOnId}`,
        availableAddOns: Object.keys(ADD_ONS),
      });
    }

    // Default URLs
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const success = successUrl || `${baseUrl}/pricing?addon_success=true`;
    const cancel = cancelUrl || `${baseUrl}/pricing?addon_canceled=true`;

    const session = await stripeService.createAddOnCheckoutSession(
      user.id,
      addOnId,
      success,
      cancel,
      user.email
    );

    logger.info(`Add-on checkout session created for user ${user.id}`, {
      addOn: addOnId,
      sessionId: session.sessionId,
    });

    res.json({
      success: true,
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error: any) {
    logger.error('Failed to create add-on checkout session', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// CUSTOMER PORTAL
// ============================================================

/**
 * POST /api/stripe/create-portal
 * Create a Stripe customer portal session
 *
 * Body:
 * - returnUrl: string (optional, defaults to /payments)
 */
router.post('/create-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { returnUrl } = req.body;

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnTo = returnUrl || `${baseUrl}/payments`;

    const portal = await stripeService.createPortalSession(user.id, returnTo);

    logger.info(`Portal session created for user ${user.id}`);

    res.json({
      success: true,
      url: portal.url,
    });
  } catch (error: any) {
    logger.error('Failed to create portal session', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// WEBHOOKS
// ============================================================

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 *
 * This endpoint should be publicly accessible (no auth middleware)
 * Stripe will send events here when subscriptions change
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.error('Missing stripe-signature header');
      return res.status(400).json({
        success: false,
        error: 'Missing stripe-signature header',
      });
    }

    // Get raw body (must be raw for signature verification)
    const rawBody = (req as any).rawBody || req.body;

    const result = await stripeService.handleWebhook(rawBody, signature);

    logger.info('Webhook processed successfully', { event: result.event });

    res.json({
      success: true,
      received: result.received,
    });
  } catch (error: any) {
    logger.error('Webhook processing failed', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// SUBSCRIPTION STATUS
// ============================================================

/**
 * GET /api/stripe/subscription
 * Get current subscription status for authenticated user
 */
router.get('/subscription', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const subscription = await stripeService.getSubscriptionStatus(user.id);
    const tier = await stripeService.getUserTier(user.id);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        tier: {
          id: 'free',
          name: 'Free',
          price: 0,
          features: tier.features,
          limits: tier.limits,
        },
      });
    }

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      tier: {
        id: tier.id,
        name: tier.name,
        price: tier.price,
        features: tier.features,
        limits: tier.limits,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get subscription status', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/stripe/tiers
 * Get all available subscription tiers
 */
router.get('/tiers', async (req: Request, res: Response) => {
  try {
    const tiers = stripeService.getAvailableTiers();

    res.json({
      success: true,
      tiers: tiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        price: tier.price,
        interval: tier.interval,
        features: tier.features,
        limits: tier.limits,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to get tiers', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/stripe/addons
 * Get all available add-ons
 */
router.get('/addons', async (req: Request, res: Response) => {
  try {
    const addOns = stripeService.getAvailableAddOns();

    res.json({
      success: true,
      addOns: addOns.map(addOn => ({
        id: addOn.id,
        name: addOn.name,
        price: addOn.price,
        description: addOn.description,
        features: addOn.features,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to get add-ons', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/stripe/user-addons
 * Get user's active add-ons
 */
router.get('/user-addons', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const activeAddOns = await stripeService.getUserAddOns(user.id);

    res.json({
      success: true,
      addOns: activeAddOns,
    });
  } catch (error: any) {
    logger.error('Failed to get user add-ons', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/stripe/cancel
 * Cancel subscription at period end
 */
router.post('/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    await stripeService.cancelSubscription(user.id);

    logger.info(`Subscription canceled for user ${user.id}`);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error: any) {
    logger.error('Failed to cancel subscription', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/stripe/reactivate
 * Reactivate a canceled subscription
 */
router.post('/reactivate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    await stripeService.reactivateSubscription(user.id);

    logger.info(`Subscription reactivated for user ${user.id}`);

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to reactivate subscription', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

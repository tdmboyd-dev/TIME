/**
 * TIME Stripe Payment Integration
 *
 * Production-ready Stripe integration for subscription management:
 * - Subscription checkout sessions
 * - Customer portal for managing subscriptions
 * - Webhook handling for subscription events
 * - Subscription status tracking
 *
 * SUBSCRIPTION TIERS:
 * - FREE: $0/month - 3 bots, paper trading only
 * - BASIC: $19/month - 10 bots, $5K capital
 * - PRO: $39/month - 50 bots, $50K capital
 * - PREMIUM: $59/month - 999 bots, $500K capital, Ultimate Money Machine
 * - ENTERPRISE: $250/month - Unlimited everything + white-label
 */

import Stripe from 'stripe';
import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('StripeService');

// ============================================================
// TYPES
// ============================================================

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  priceId: string; // Stripe Price ID
  interval: 'month' | 'year';
  features: string[];
  limits: {
    bots?: number;
    strategies?: number;
    backtests?: number;
    apiCalls?: number;
    support?: string;
  };
}

export interface CustomerSubscription {
  id: string;
  userId: string;
  customerId: string;
  subscriptionId: string;
  tier: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckoutSessionData {
  sessionId: string;
  url: string;
  customerId?: string;
}

export interface PortalSessionData {
  url: string;
}

// ============================================================
// SUBSCRIPTION TIERS
// ============================================================

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: '', // No Stripe price for free tier
    interval: 'month',
    features: [
      '3 active bots',
      'Paper trading only',
      'Basic market data',
      'Community support',
      'Standard backtesting',
    ],
    limits: {
      bots: 3,
      strategies: 5,
      backtests: 10,
      apiCalls: 1000,
      support: 'community',
    },
  },
  BASIC: {
    id: 'basic',
    name: 'Basic',
    price: 19,
    priceId: process.env.STRIPE_PRICE_BASIC || '',
    interval: 'month',
    features: [
      '10 active bots',
      '$5,000 max capital',
      'Real trading enabled',
      'Email support',
      'Advanced backtesting',
      'Real-time market data',
    ],
    limits: {
      bots: 10,
      strategies: 20,
      backtests: 50,
      apiCalls: 10000,
      support: 'email',
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 39,
    priceId: process.env.STRIPE_PRICE_PRO || '',
    interval: 'month',
    features: [
      '50 active bots',
      '$50,000 max capital',
      'Priority execution',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Custom strategies',
    ],
    limits: {
      bots: 50,
      strategies: 100,
      backtests: -1, // Unlimited
      apiCalls: 100000,
      support: 'priority',
    },
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 59,
    priceId: process.env.STRIPE_PRICE_PREMIUM || '',
    interval: 'month',
    features: [
      '999 active bots',
      '$500,000 max capital',
      'Ultimate Money Machine',
      '24/7 priority support',
      'Institutional data feeds',
      'Advanced AI features',
      'Risk management tools',
      'Multi-strategy portfolios',
    ],
    limits: {
      bots: 999,
      strategies: -1,
      backtests: -1,
      apiCalls: -1,
      support: '24/7-priority',
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 250,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    interval: 'month',
    features: [
      'Unlimited bots',
      'Unlimited capital',
      'White-label solution',
      'Dedicated account manager',
      'Custom integrations',
      'On-premise deployment',
      'SLA guarantee',
      'Custom bot development',
      'Training & onboarding',
    ],
    limits: {
      bots: -1,
      strategies: -1,
      backtests: -1,
      apiCalls: -1,
      support: 'dedicated',
    },
  },
};

// ============================================================
// STRIPE SERVICE
// ============================================================

export class StripeService extends EventEmitter {
  private stripe: Stripe;
  private subscriptions: Map<string, CustomerSubscription> = new Map();
  private webhookSecret: string;

  constructor() {
    super();

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });

    logger.info('Stripe service initialized');
  }

  // ============================================================
  // CHECKOUT SESSION
  // ============================================================

  /**
   * Create a checkout session for subscription
   */
  public async createCheckoutSession(
    userId: string,
    tierId: string,
    successUrl: string,
    cancelUrl: string,
    customerEmail?: string
  ): Promise<CheckoutSessionData> {
    try {
      const tier = SUBSCRIPTION_TIERS[tierId.toUpperCase()];
      if (!tier) {
        throw new Error(`Invalid subscription tier: ${tierId}`);
      }

      if (tier.id === 'free') {
        throw new Error('Cannot create checkout session for free tier');
      }

      if (!tier.priceId) {
        throw new Error(`Price ID not configured for tier: ${tierId}`);
      }

      // Create or retrieve customer
      let customer: Stripe.Customer | undefined;
      const existingSub = Array.from(this.subscriptions.values()).find(
        (sub) => sub.userId === userId
      );

      if (existingSub?.customerId) {
        customer = await this.stripe.customers.retrieve(existingSub.customerId) as Stripe.Customer;
      } else if (customerEmail) {
        customer = await this.stripe.customers.create({
          email: customerEmail,
          metadata: {
            userId,
          },
        });
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customer?.id,
        customer_email: !customer && customerEmail ? customerEmail : undefined,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: tier.priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          tier: tier.id,
        },
        subscription_data: {
          metadata: {
            userId,
            tier: tier.id,
          },
        },
        allow_promotion_codes: true,
      });

      logger.info(`Checkout session created for user ${userId}, tier ${tier.name}`, {
        sessionId: session.id,
      });

      return {
        sessionId: session.id,
        url: session.url!,
        customerId: customer?.id,
      };
    } catch (error: any) {
      logger.error('Failed to create checkout session', { error: error.message });
      throw error;
    }
  }

  // ============================================================
  // CUSTOMER PORTAL
  // ============================================================

  /**
   * Create a customer portal session for managing subscription
   */
  public async createPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<PortalSessionData> {
    try {
      const subscription = Array.from(this.subscriptions.values()).find(
        (sub) => sub.userId === userId
      );

      if (!subscription) {
        throw new Error('No active subscription found for user');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: subscription.customerId,
        return_url: returnUrl,
      });

      logger.info(`Portal session created for user ${userId}`);

      return {
        url: session.url,
      };
    } catch (error: any) {
      logger.error('Failed to create portal session', { error: error.message });
      throw error;
    }
  }

  // ============================================================
  // WEBHOOK HANDLING
  // ============================================================

  /**
   * Handle Stripe webhook events
   */
  public async handleWebhook(
    rawBody: string | Buffer,
    signature: string
  ): Promise<{ received: boolean; event?: string }> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );

      logger.info(`Webhook received: ${event.type}`, { eventId: event.id });

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true, event: event.type };
    } catch (error: any) {
      logger.error('Webhook handling failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle checkout session completed event
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;

    if (!userId || !tier) {
      logger.error('Missing metadata in checkout session', { sessionId: session.id });
      return;
    }

    logger.info(`Checkout completed for user ${userId}`, {
      tier,
      sessionId: session.id,
      subscriptionId: session.subscription,
    });

    // The subscription.created event will handle the actual subscription creation
    this.emit('checkout:completed', { userId, tier, session });
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    const tier = subscription.metadata.tier;

    if (!userId || !tier) {
      logger.error('Missing metadata in subscription', { subscriptionId: subscription.id });
      return;
    }

    const customerSubscription: CustomerSubscription = {
      id: `sub_${Date.now()}`,
      userId,
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
      tier,
      status: subscription.status as CustomerSubscription['status'],
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscription.id, customerSubscription);
    this.emit('subscription:created', customerSubscription);

    logger.info(`Subscription created for user ${userId}`, {
      tier,
      subscriptionId: subscription.id,
    });
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const existing = this.subscriptions.get(subscription.id);
    if (!existing) {
      logger.warn(`Subscription update for unknown subscription: ${subscription.id}`);
      return;
    }

    existing.status = subscription.status as CustomerSubscription['status'];
    existing.currentPeriodStart = new Date(subscription.current_period_start * 1000);
    existing.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    existing.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    existing.updatedAt = new Date();

    this.emit('subscription:updated', existing);

    logger.info(`Subscription updated: ${subscription.id}`, {
      status: subscription.status,
    });
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const existing = this.subscriptions.get(subscription.id);
    if (!existing) {
      logger.warn(`Subscription deletion for unknown subscription: ${subscription.id}`);
      return;
    }

    existing.status = 'canceled';
    existing.updatedAt = new Date();

    this.emit('subscription:deleted', existing);

    logger.info(`Subscription deleted: ${subscription.id}`);
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    const existing = this.subscriptions.get(subscriptionId);

    if (existing) {
      this.emit('payment:succeeded', { subscription: existing, invoice });
      logger.info(`Payment succeeded for subscription: ${subscriptionId}`);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    const existing = this.subscriptions.get(subscriptionId);

    if (existing) {
      this.emit('payment:failed', { subscription: existing, invoice });
      logger.warn(`Payment failed for subscription: ${subscriptionId}`);
    }
  }

  // ============================================================
  // SUBSCRIPTION QUERIES
  // ============================================================

  /**
   * Get subscription status for a user
   */
  public async getSubscriptionStatus(userId: string): Promise<CustomerSubscription | null> {
    const subscription = Array.from(this.subscriptions.values()).find(
      (sub) => sub.userId === userId && sub.status === 'active'
    );

    return subscription || null;
  }

  /**
   * Get user subscription (alias for getSubscriptionStatus for API compatibility)
   */
  public async getUserSubscription(userId: string): Promise<CustomerSubscription | null> {
    return this.getSubscriptionStatus(userId);
  }

  /**
   * Get subscription tier for a user
   */
  public async getUserTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.getSubscriptionStatus(userId);

    if (!subscription) {
      return SUBSCRIPTION_TIERS.FREE;
    }

    return SUBSCRIPTION_TIERS[subscription.tier.toUpperCase()] || SUBSCRIPTION_TIERS.FREE;
  }

  /**
   * Check if user has access to a feature
   */
  public async hasAccess(
    userId: string,
    feature: keyof SubscriptionTier['limits']
  ): Promise<boolean> {
    const tier = await this.getUserTier(userId);
    const limit = tier.limits[feature];

    // -1 means unlimited
    if (limit === -1) return true;

    // 0 or undefined means no access
    if (!limit) return false;

    return true;
  }

  /**
   * Get all subscription tiers
   */
  public getAvailableTiers(): SubscriptionTier[] {
    return Object.values(SUBSCRIPTION_TIERS);
  }

  /**
   * Cancel subscription at period end
   */
  public async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getSubscriptionStatus(userId);

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    await this.stripe.subscriptions.update(subscription.subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info(`Subscription canceled at period end for user ${userId}`);
  }

  /**
   * Reactivate a canceled subscription
   */
  public async reactivateSubscription(userId: string): Promise<void> {
    const subscription = Array.from(this.subscriptions.values()).find(
      (sub) => sub.userId === userId
    );

    if (!subscription) {
      throw new Error('No subscription found');
    }

    await this.stripe.subscriptions.update(subscription.subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info(`Subscription reactivated for user ${userId}`);
  }
}

// Export singleton instance
export const stripeService = new StripeService();

export default StripeService;

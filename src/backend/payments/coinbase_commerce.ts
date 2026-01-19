/**
 * Coinbase Commerce Payment Integration
 *
 * Accept crypto payments with 1% fees (vs Stripe's 2.9%)
 * Supports: BTC, ETH, USDC, DAI, LTC, BCH, DOGE, SHIB, and more
 *
 * Features:
 * - Create charges for subscriptions and one-time purchases
 * - Webhook handling for payment confirmations
 * - Automatic currency conversion
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CoinbaseCommerce');

// ============================================================
// TYPES
// ============================================================

export interface CoinbaseCharge {
  id: string;
  code: string;
  name: string;
  description: string;
  pricing_type: 'fixed_price' | 'no_price';
  pricing: {
    local: { amount: string; currency: string };
    [key: string]: { amount: string; currency: string };
  };
  addresses: {
    bitcoin?: string;
    ethereum?: string;
    litecoin?: string;
    usdc?: string;
    dai?: string;
    [key: string]: string | undefined;
  };
  hosted_url: string;
  created_at: string;
  expires_at: string;
  confirmed_at?: string;
  timeline: Array<{
    status: string;
    time: string;
  }>;
  metadata: {
    userId?: string;
    productId?: string;
    type?: string;
    [key: string]: string | undefined;
  };
  payments: Array<{
    network: string;
    transaction_id: string;
    status: string;
    value: {
      local: { amount: string; currency: string };
      crypto: { amount: string; currency: string };
    };
  }>;
}

export interface CreateChargeParams {
  name: string;
  description: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
  cancelUrl?: string;
}

export interface WebhookEvent {
  id: string;
  type: 'charge:created' | 'charge:confirmed' | 'charge:failed' | 'charge:pending' | 'charge:resolved';
  data: CoinbaseCharge;
  api_version: string;
  created_at: string;
}

// ============================================================
// COINBASE COMMERCE SERVICE
// ============================================================

export class CoinbaseCommerceService extends EventEmitter {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.commerce.coinbase.com';
  private enabled: boolean = false;

  constructor() {
    super();

    this.apiKey = process.env.COINBASE_COMMERCE_API_KEY || '';
    this.webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET || '';

    if (!this.apiKey) {
      logger.warn('COINBASE_COMMERCE_API_KEY not configured - crypto payments disabled');
      return;
    }

    this.enabled = true;
    logger.info('Coinbase Commerce service initialized (1% fees!)');
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // ============================================================
  // CREATE CHARGES
  // ============================================================

  /**
   * Create a charge for crypto payment
   */
  public async createCharge(params: CreateChargeParams): Promise<CoinbaseCharge> {
    if (!this.enabled) {
      throw new Error('Coinbase Commerce is not configured');
    }

    const response = await fetch(`${this.baseUrl}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify({
        name: params.name,
        description: params.description,
        pricing_type: 'fixed_price',
        local_price: {
          amount: params.amount.toFixed(2),
          currency: params.currency || 'USD',
        },
        metadata: params.metadata || {},
        redirect_url: params.redirectUrl,
        cancel_url: params.cancelUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to create charge', { error });
      throw new Error(`Failed to create Coinbase charge: ${error}`);
    }

    const result = await response.json();
    const charge = result.data as CoinbaseCharge;

    logger.info(`Charge created: ${charge.code}`, {
      amount: params.amount,
      chargeId: charge.id,
    });

    this.emit('charge:created', charge);
    return charge;
  }

  /**
   * Create a subscription checkout charge
   */
  public async createSubscriptionCharge(
    userId: string,
    tierId: string,
    tierName: string,
    price: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ chargeId: string; hostedUrl: string }> {
    const charge = await this.createCharge({
      name: `${tierName} Subscription`,
      description: `TIME BEYOND US ${tierName} monthly subscription`,
      amount: price,
      metadata: {
        userId,
        productId: tierId,
        type: 'subscription',
      },
      redirectUrl: successUrl,
      cancelUrl: cancelUrl,
    });

    return {
      chargeId: charge.id,
      hostedUrl: charge.hosted_url,
    };
  }

  /**
   * Create a bot purchase charge
   */
  public async createBotPurchaseCharge(
    userId: string,
    botId: string,
    botName: string,
    price: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ chargeId: string; hostedUrl: string }> {
    const charge = await this.createCharge({
      name: `${botName} Bot Rental`,
      description: `TIME BEYOND US trading bot rental: ${botName}`,
      amount: price,
      metadata: {
        userId,
        productId: botId,
        type: 'bot_rental',
      },
      redirectUrl: successUrl,
      cancelUrl: cancelUrl,
    });

    return {
      chargeId: charge.id,
      hostedUrl: charge.hosted_url,
    };
  }

  /**
   * Create an add-on purchase charge
   */
  public async createAddOnCharge(
    userId: string,
    addOnId: string,
    addOnName: string,
    price: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ chargeId: string; hostedUrl: string }> {
    const charge = await this.createCharge({
      name: addOnName,
      description: `TIME BEYOND US add-on: ${addOnName}`,
      amount: price,
      metadata: {
        userId,
        productId: addOnId,
        type: 'addon',
      },
      redirectUrl: successUrl,
      cancelUrl: cancelUrl,
    });

    return {
      chargeId: charge.id,
      hostedUrl: charge.hosted_url,
    };
  }

  // ============================================================
  // GET CHARGE STATUS
  // ============================================================

  /**
   * Get charge by ID
   */
  public async getCharge(chargeId: string): Promise<CoinbaseCharge> {
    if (!this.enabled) {
      throw new Error('Coinbase Commerce is not configured');
    }

    const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
      method: 'GET',
      headers: {
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get charge: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data as CoinbaseCharge;
  }

  /**
   * Get charge by code (short ID)
   */
  public async getChargeByCode(code: string): Promise<CoinbaseCharge> {
    if (!this.enabled) {
      throw new Error('Coinbase Commerce is not configured');
    }

    const response = await fetch(`${this.baseUrl}/charges/${code}`, {
      method: 'GET',
      headers: {
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get charge: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data as CoinbaseCharge;
  }

  // ============================================================
  // WEBHOOK HANDLING
  // ============================================================

  /**
   * Verify webhook signature
   */
  public verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.error('Webhook secret not configured');
      return false;
    }

    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle webhook event
   */
  public async handleWebhook(
    rawBody: string | Buffer,
    signature: string
  ): Promise<{ received: boolean; event?: string; chargeId?: string }> {
    // Verify signature
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      logger.error('Invalid webhook signature');
      throw new Error('Invalid webhook signature');
    }

    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const event: WebhookEvent = JSON.parse(body).event;

    logger.info(`Webhook received: ${event.type}`, {
      chargeId: event.data.id,
      code: event.data.code,
    });

    switch (event.type) {
      case 'charge:created':
        this.emit('charge:created', event.data);
        break;

      case 'charge:confirmed':
        await this.handleChargeConfirmed(event.data);
        break;

      case 'charge:failed':
        this.emit('charge:failed', event.data);
        logger.warn(`Charge failed: ${event.data.code}`);
        break;

      case 'charge:pending':
        this.emit('charge:pending', event.data);
        logger.info(`Charge pending: ${event.data.code}`);
        break;

      case 'charge:resolved':
        // Could be confirmed or resolved manually
        this.emit('charge:resolved', event.data);
        break;

      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }

    return {
      received: true,
      event: event.type,
      chargeId: event.data.id,
    };
  }

  /**
   * Handle confirmed charge - activate subscription/purchase
   */
  private async handleChargeConfirmed(charge: CoinbaseCharge): Promise<void> {
    const { userId, productId, type } = charge.metadata;

    logger.info(`Charge confirmed: ${charge.code}`, {
      userId,
      productId,
      type,
      payments: charge.payments?.length || 0,
    });

    // Get payment details
    const payment = charge.payments?.[0];
    if (payment) {
      logger.info(`Payment received via ${payment.network}`, {
        txId: payment.transaction_id,
        amount: payment.value?.crypto?.amount,
        currency: payment.value?.crypto?.currency,
      });
    }

    // Emit event for handling by subscription/purchase logic
    this.emit('charge:confirmed', {
      charge,
      userId,
      productId,
      type,
      payment,
    });

    // TODO: Activate subscription or bot rental based on type
    // This should be connected to your subscription service
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * List all charges
   */
  public async listCharges(limit: number = 25): Promise<CoinbaseCharge[]> {
    if (!this.enabled) {
      throw new Error('Coinbase Commerce is not configured');
    }

    const response = await fetch(`${this.baseUrl}/charges?limit=${limit}`, {
      method: 'GET',
      headers: {
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list charges: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data as CoinbaseCharge[];
  }

  /**
   * Cancel a charge
   */
  public async cancelCharge(chargeId: string): Promise<CoinbaseCharge> {
    if (!this.enabled) {
      throw new Error('Coinbase Commerce is not configured');
    }

    const response = await fetch(`${this.baseUrl}/charges/${chargeId}/cancel`, {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel charge: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data as CoinbaseCharge;
  }

  /**
   * Get supported cryptocurrencies
   */
  public getSupportedCurrencies(): string[] {
    return [
      'BTC',   // Bitcoin
      'ETH',   // Ethereum
      'USDC',  // USD Coin
      'DAI',   // Dai
      'LTC',   // Litecoin
      'BCH',   // Bitcoin Cash
      'DOGE',  // Dogecoin
      'SHIB',  // Shiba Inu
      'APE',   // ApeCoin
    ];
  }

  /**
   * Get fee comparison
   */
  public getFeeComparison(): { provider: string; fee: string }[] {
    return [
      { provider: 'Coinbase Commerce', fee: '1%' },
      { provider: 'Stripe', fee: '2.9% + $0.30' },
      { provider: 'PayPal', fee: '2.9% + $0.30' },
      { provider: 'Square', fee: '2.6% + $0.10' },
    ];
  }
}

// Export singleton instance
export const coinbaseCommerce = new CoinbaseCommerceService();
export default coinbaseCommerce;

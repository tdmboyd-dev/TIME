/**
 * Coinbase Commerce Webhook Handler
 *
 * Handles payment notifications from Coinbase Commerce:
 * - charge:created - Payment initiated
 * - charge:pending - Payment detected, waiting for confirmations
 * - charge:confirmed - Payment confirmed (ACTIVATE SUBSCRIPTION)
 * - charge:failed - Payment failed or expired
 * - charge:resolved - Payment manually resolved
 */

import { Router, Request, Response } from 'express';
import { coinbaseCommerce } from '../payments/coinbase_commerce';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CoinbaseWebhook');
const router = Router();

/**
 * POST /api/v1/webhooks/coinbase
 * Handle Coinbase Commerce webhook events
 *
 * This endpoint must be publicly accessible (no auth middleware)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-cc-webhook-signature'] as string;

    if (!signature) {
      logger.error('Missing x-cc-webhook-signature header');
      return res.status(400).json({
        success: false,
        error: 'Missing webhook signature',
      });
    }

    // Get raw body for signature verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const result = await coinbaseCommerce.handleWebhook(rawBody, signature);

    logger.info('Coinbase webhook processed', {
      event: result.event,
      chargeId: result.chargeId,
    });

    res.json({
      success: true,
      received: result.received,
      event: result.event,
    });
  } catch (error: any) {
    logger.error('Coinbase webhook processing failed', { error: error.message });

    // Return 200 anyway to prevent Coinbase from retrying
    // Log the error for investigation
    res.status(200).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/webhooks/coinbase/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Coinbase Commerce Webhook',
    enabled: coinbaseCommerce.isEnabled(),
    timestamp: new Date().toISOString(),
  });
});

export default router;

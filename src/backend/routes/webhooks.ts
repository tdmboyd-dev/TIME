/**
 * Webhook Routes for TIME
 *
 * Handles webhooks from external services:
 * - SendGrid (email events: opens, clicks, bounces, unsubscribes)
 * - Stripe (payment events)
 * - Broker webhooks (trade confirmations)
 */

import { Router, Request, Response } from 'express';
import { sendGridService, SendGridWebhookEvent } from '../email/sendgrid_service';
import { dripCampaignService } from '../email/drip_campaign_service';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('WebhookRoutes');

/**
 * POST /api/webhooks/sendgrid
 * Handle SendGrid webhook events
 *
 * SendGrid sends POST requests to this endpoint for email events:
 * - processed: Email was processed and accepted
 * - delivered: Email was successfully delivered
 * - open: Email was opened by recipient
 * - click: Link in email was clicked
 * - bounce: Email bounced
 * - dropped: Email was dropped before sending
 * - spamreport: Email was marked as spam
 * - unsubscribe: Recipient unsubscribed
 *
 * Setup in SendGrid:
 * 1. Go to Settings > Mail Settings > Event Webhook
 * 2. Set HTTP POST URL to: https://yourdomain.com/api/v1/webhooks/sendgrid
 * 3. Select events to track
 * 4. Optional: Enable signed events for security
 */
router.post('/sendgrid', async (req: Request, res: Response) => {
  try {
    const events: SendGridWebhookEvent[] = Array.isArray(req.body) ? req.body : [req.body];

    logger.info('Received SendGrid webhook', { eventCount: events.length });

    // Validate signature if using signed webhooks
    const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
    const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;

    if (signature && timestamp) {
      const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY || '';
      const payload = JSON.stringify(req.body);
      const isValid = sendGridService.validateWebhookSignature(payload, signature, timestamp, publicKey);

      if (!isValid) {
        logger.warn('Invalid SendGrid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Process each event
    for (const event of events) {
      await processWebhookEvent(event);
    }

    // SendGrid expects 200 response
    res.status(200).json({ success: true });

  } catch (error) {
    logger.error('Failed to process SendGrid webhook', { error });
    // Still return 200 to prevent retries
    res.status(200).json({ success: false, error: 'Processing error' });
  }
});

/**
 * Process individual SendGrid webhook event
 */
async function processWebhookEvent(event: SendGridWebhookEvent): Promise<void> {
  try {
    // Log the event
    await sendGridService.processWebhookEvent(event);

    // Extract campaign tracking data from custom args
    const campaignId = event.custom_args?.campaign_id;
    const emailId = event.custom_args?.email_id;
    const userId = event.custom_args?.user_id;
    const emailLogId = event.custom_args?.log_id;

    if (!campaignId || !emailLogId) {
      logger.debug('Webhook event not related to campaign', { event: event.event });
      return;
    }

    // Update campaign tracking based on event type
    switch (event.event) {
      case 'delivered':
        logger.info('Campaign email delivered', {
          campaignId,
          emailId,
          email: event.email,
        });
        break;

      case 'open':
        await dripCampaignService.trackEmailOpen(emailLogId);
        logger.info('Campaign email opened', {
          campaignId,
          emailId,
          email: event.email,
        });
        break;

      case 'click':
        await dripCampaignService.trackEmailClick(emailLogId, event.url);
        logger.info('Campaign email clicked', {
          campaignId,
          emailId,
          email: event.email,
          url: event.url,
        });
        break;

      case 'bounce':
        logger.warn('Campaign email bounced', {
          campaignId,
          emailId,
          email: event.email,
          reason: event.reason,
        });
        // Could mark email as bounced in campaign logs
        break;

      case 'dropped':
        logger.warn('Campaign email dropped', {
          campaignId,
          emailId,
          email: event.email,
          reason: event.reason,
        });
        break;

      case 'spamreport':
        logger.warn('Campaign email marked as spam', {
          campaignId,
          emailId,
          email: event.email,
        });
        // Could trigger review of email content
        break;

      case 'unsubscribe':
        await dripCampaignService.unsubscribeUser(event.email, emailLogId);
        logger.info('User unsubscribed via campaign email', {
          campaignId,
          emailId,
          email: event.email,
        });
        break;

      default:
        logger.debug('Unhandled webhook event type', { event: event.event });
    }
  } catch (error) {
    logger.error('Failed to process webhook event', { error, event: event.event });
  }
}

/**
 * GET /api/webhooks/sendgrid/test
 * Test endpoint to verify webhook configuration
 */
router.get('/sendgrid/test', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SendGrid webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events (payments, subscriptions, etc.)
 */
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const event = req.body;

    logger.info('Received Stripe webhook', { type: event.type });

    // Verify webhook signature
    const signature = req.headers['stripe-signature'] as string;
    // TODO: Verify signature with Stripe SDK

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        logger.info('Payment succeeded', { paymentIntent: event.data.object.id });
        break;

      case 'payment_intent.payment_failed':
        logger.warn('Payment failed', { paymentIntent: event.data.object.id });
        break;

      case 'customer.subscription.created':
        logger.info('Subscription created', { subscription: event.data.object.id });
        break;

      case 'customer.subscription.updated':
        logger.info('Subscription updated', { subscription: event.data.object.id });
        break;

      case 'customer.subscription.deleted':
        logger.info('Subscription cancelled', { subscription: event.data.object.id });
        break;

      default:
        logger.debug('Unhandled Stripe event', { type: event.type });
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Failed to process Stripe webhook', { error });
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/webhooks/broker/:broker
 * Handle broker webhook events (trade confirmations, account updates)
 */
router.post('/broker/:broker', async (req: Request, res: Response) => {
  try {
    const { broker } = req.params;
    const event = req.body;

    logger.info('Received broker webhook', { broker, event });

    // TODO: Process broker-specific events
    // - Trade confirmations
    // - Order fills
    // - Account updates
    // - Margin calls
    // - Position updates

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Failed to process broker webhook', { error });
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

export default router;

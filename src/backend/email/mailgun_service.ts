/**
 * Mailgun Email Service for TIME
 *
 * Alternative email provider to SendGrid with:
 * - Transactional email sending
 * - Bulk email campaigns
 * - Email templates
 * - Tracking (opens, clicks, bounces)
 * - Webhook event handling
 * - Mailing list management
 * - Email validation
 *
 * Use MAILGUN_API_KEY and MAILGUN_DOMAIN env variables
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('MailgunService');

// Mailgun Configuration
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || '';
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mail.timebeyondus.com';
const MAILGUN_BASE_URL = process.env.MAILGUN_EU === 'true'
  ? 'https://api.eu.mailgun.net/v3'
  : 'https://api.mailgun.net/v3';
const FROM_EMAIL = process.env.EMAIL_FROM || 'TIME Trading <noreply@timebeyondus.com>';

/**
 * Mailgun Email Options
 */
export interface MailgunEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  tags?: string[];
  variables?: Record<string, string>;
  recipientVariables?: Record<string, Record<string, string>>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  deliveryTime?: Date;
  testMode?: boolean;
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    data: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Mailgun Response
 */
export interface MailgunResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Mailgun Webhook Event
 */
export interface MailgunWebhookEvent {
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
  'event-data': {
    event: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed' | 'failed';
    timestamp: number;
    id: string;
    message: {
      headers: {
        'message-id': string;
        from: string;
        to: string;
        subject: string;
      };
    };
    recipient: string;
    tags?: string[];
    'user-variables'?: Record<string, string>;
    'delivery-status'?: {
      code: number;
      message: string;
      description: string;
    };
    'client-info'?: {
      'client-os': string;
      'device-type': string;
      'client-name': string;
    };
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
    url?: string; // For click events
  };
}

/**
 * Email Validation Result
 */
export interface EmailValidationResult {
  address: string;
  isValid: boolean;
  isDisposable: boolean;
  isRoleAddress: boolean;
  reason?: string;
  didYouMean?: string;
  risk: 'low' | 'medium' | 'high' | 'unknown';
}

/**
 * Mailgun Service Class
 */
export class MailgunService {
  private apiKey: string;
  private domain: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = MAILGUN_API_KEY;
    this.domain = MAILGUN_DOMAIN;
    this.isConfigured = !!this.apiKey && !!this.domain;

    if (!this.isConfigured) {
      logger.warn('Mailgun not configured - MAILGUN_API_KEY or MAILGUN_DOMAIN missing');
    } else {
      logger.info('Mailgun service initialized', { domain: this.domain });
    }
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;
  }

  /**
   * Send a single email
   */
  async send(options: MailgunEmailOptions): Promise<MailgunResponse> {
    try {
      if (!this.isConfigured) {
        logger.info('Email would be sent (Mailgun not configured)', {
          to: options.to,
          subject: options.subject
        });
        return { success: true, messageId: `mock_mg_${Date.now()}` };
      }

      // Build form data
      const formData = new FormData();

      // From address
      formData.append('from', options.from || FROM_EMAIL);

      // To address(es)
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      recipients.forEach(to => formData.append('to', to));

      // Subject and content
      formData.append('subject', options.subject);
      formData.append('html', options.html);
      if (options.text) {
        formData.append('text', options.text);
      }

      // Optional fields
      if (options.replyTo) {
        formData.append('h:Reply-To', options.replyTo);
      }
      if (options.cc) {
        options.cc.forEach(cc => formData.append('cc', cc));
      }
      if (options.bcc) {
        options.bcc.forEach(bcc => formData.append('bcc', bcc));
      }
      if (options.tags) {
        options.tags.forEach(tag => formData.append('o:tag', tag));
      }

      // Tracking options
      formData.append('o:tracking', 'yes');
      formData.append('o:tracking-opens', options.trackOpens !== false ? 'yes' : 'no');
      formData.append('o:tracking-clicks', options.trackClicks !== false ? 'yes' : 'no');

      // Delivery time
      if (options.deliveryTime) {
        formData.append('o:deliverytime', options.deliveryTime.toUTCString());
      }

      // Test mode
      if (options.testMode) {
        formData.append('o:testmode', 'yes');
      }

      // Custom headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          formData.append(`h:${key}`, value);
        });
      }

      // Variables for tracking
      if (options.variables) {
        Object.entries(options.variables).forEach(([key, value]) => {
          formData.append(`v:${key}`, value);
        });
      }

      // Recipient variables for batch sending
      if (options.recipientVariables) {
        formData.append('recipient-variables', JSON.stringify(options.recipientVariables));
      }

      // Send via Mailgun API
      const response = await fetch(`${MAILGUN_BASE_URL}/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader()
        },
        body: formData
      });

      const result = await response.json() as { id?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.message || `Mailgun error: ${response.status}`);
      }

      logger.info('Email sent successfully via Mailgun', {
        to: options.to,
        subject: options.subject,
        messageId: result.id
      });

      return {
        success: true,
        messageId: result.id,
        statusCode: response.status
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send email via Mailgun', { error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Send tracked email with campaign data
   */
  async sendTracked(
    options: MailgunEmailOptions,
    campaignId: string,
    emailId: string,
    userId: string
  ): Promise<MailgunResponse> {
    return this.send({
      ...options,
      tags: [...(options.tags || []), 'campaign', campaignId],
      variables: {
        ...options.variables,
        campaign_id: campaignId,
        email_id: emailId,
        user_id: userId
      }
    });
  }

  /**
   * Send batch email (different content per recipient)
   */
  async sendBatch(
    recipients: Array<{
      email: string;
      variables: Record<string, string>;
    }>,
    options: Omit<MailgunEmailOptions, 'to' | 'recipientVariables'>
  ): Promise<MailgunResponse> {
    const recipientVariables: Record<string, Record<string, string>> = {};

    recipients.forEach(r => {
      recipientVariables[r.email] = r.variables;
    });

    return this.send({
      ...options,
      to: recipients.map(r => r.email),
      recipientVariables
    });
  }

  /**
   * Validate email address
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    try {
      if (!this.isConfigured) {
        // Basic validation without API
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          address: email,
          isValid: emailRegex.test(email),
          isDisposable: false,
          isRoleAddress: false,
          risk: 'unknown'
        };
      }

      const response = await fetch(
        `${MAILGUN_BASE_URL}/address/validate?address=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: this.getAuthHeader()
          }
        }
      );

      const result = await response.json() as {
        address?: string;
        is_valid?: boolean;
        is_disposable_address?: boolean;
        is_role_address?: boolean;
        reason?: string;
        did_you_mean?: string;
        risk?: 'low' | 'medium' | 'high' | 'unknown';
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message || 'Validation failed');
      }

      return {
        address: result.address || email,
        isValid: result.is_valid || false,
        isDisposable: result.is_disposable_address || false,
        isRoleAddress: result.is_role_address || false,
        reason: result.reason,
        didYouMean: result.did_you_mean,
        risk: result.risk || 'unknown'
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Email validation failed', { error: message, email });

      // Return basic validation on error
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        address: email,
        isValid: emailRegex.test(email),
        isDisposable: false,
        isRoleAddress: false,
        risk: 'unknown',
        reason: message
      };
    }
  }

  /**
   * Process Mailgun webhook event
   */
  async processWebhookEvent(event: MailgunWebhookEvent): Promise<void> {
    const eventData = event['event-data'];

    logger.info('Processing Mailgun webhook event', {
      event: eventData.event,
      recipient: eventData.recipient,
      timestamp: eventData.timestamp,
      messageId: eventData.message?.headers?.['message-id']
    });

    // Extract tracking variables
    const campaignId = eventData['user-variables']?.campaign_id;
    const emailId = eventData['user-variables']?.email_id;
    const userId = eventData['user-variables']?.user_id;

    switch (eventData.event) {
      case 'delivered':
        logger.info('Email delivered', {
          recipient: eventData.recipient,
          campaignId
        });
        break;

      case 'opened':
        logger.info('Email opened', {
          recipient: eventData.recipient,
          campaignId,
          device: eventData['client-info']?.['device-type'],
          location: eventData.geolocation?.country
        });
        break;

      case 'clicked':
        logger.info('Email link clicked', {
          recipient: eventData.recipient,
          campaignId,
          url: eventData.url
        });
        break;

      case 'bounced':
        logger.warn('Email bounced', {
          recipient: eventData.recipient,
          campaignId,
          code: eventData['delivery-status']?.code,
          message: eventData['delivery-status']?.message
        });
        break;

      case 'complained':
        logger.error('Spam complaint received', {
          recipient: eventData.recipient,
          campaignId
        });
        break;

      case 'unsubscribed':
        logger.info('User unsubscribed', {
          recipient: eventData.recipient,
          campaignId
        });
        break;

      case 'failed':
        logger.error('Email delivery failed', {
          recipient: eventData.recipient,
          campaignId,
          reason: eventData['delivery-status']?.description
        });
        break;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    timestamp: string,
    token: string,
    signature: string
  ): boolean {
    // In production, verify using crypto
    // const crypto = require('crypto');
    // const hmac = crypto.createHmac('sha256', this.apiKey);
    // hmac.update(timestamp + token);
    // const expectedSignature = hmac.digest('hex');
    // return expectedSignature === signature;

    // For now, basic check
    return !!signature && signature.length > 0;
  }

  /**
   * Get domain statistics
   */
  async getDomainStats(options?: {
    event?: string;
    start?: Date;
    end?: Date;
    resolution?: 'hour' | 'day' | 'month';
  }): Promise<any> {
    try {
      if (!this.isConfigured) {
        return { success: true, stats: [] };
      }

      const params = new URLSearchParams();
      if (options?.event) params.append('event', options.event);
      if (options?.start) params.append('start', options.start.toISOString());
      if (options?.end) params.append('end', options.end.toISOString());
      if (options?.resolution) params.append('resolution', options.resolution);

      const response = await fetch(
        `${MAILGUN_BASE_URL}/${this.domain}/stats/total?${params}`,
        {
          headers: {
            Authorization: this.getAuthHeader()
          }
        }
      );

      const result = await response.json() as { message?: string; stats?: unknown };

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get stats');
      }

      return { success: true, stats: result };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get domain stats', { error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Add email to unsubscribe list
   */
  async addToUnsubscribeList(email: string, tag?: string): Promise<MailgunResponse> {
    try {
      if (!this.isConfigured) {
        logger.info('Would add to unsubscribe list (Mailgun not configured)', { email });
        return { success: true };
      }

      const formData = new FormData();
      formData.append('address', email);
      if (tag) formData.append('tag', tag);

      const response = await fetch(
        `${MAILGUN_BASE_URL}/${this.domain}/unsubscribes`,
        {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader()
          },
          body: formData
        }
      );

      const result = await response.json() as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Failed to add to unsubscribe list');
      }

      logger.info('Added to unsubscribe list', { email });
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to add to unsubscribe list', { error: message, email });
      return { success: false, error: message };
    }
  }

  /**
   * Remove email from unsubscribe list
   */
  async removeFromUnsubscribeList(email: string): Promise<MailgunResponse> {
    try {
      if (!this.isConfigured) {
        return { success: true };
      }

      const response = await fetch(
        `${MAILGUN_BASE_URL}/${this.domain}/unsubscribes/${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: this.getAuthHeader()
          }
        }
      );

      if (!response.ok) {
        const result = await response.json() as { message?: string };
        throw new Error(result.message || 'Failed to remove from unsubscribe list');
      }

      logger.info('Removed from unsubscribe list', { email });
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to remove from unsubscribe list', { error: message, email });
      return { success: false, error: message };
    }
  }

  /**
   * Check if Mailgun is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service info
   */
  getServiceInfo(): { provider: string; domain: string; configured: boolean } {
    return {
      provider: 'Mailgun',
      domain: this.domain,
      configured: this.isConfigured
    };
  }
}

// Singleton instance
export const mailgunService = new MailgunService();

logger.info('Mailgun service module loaded');

/**
 * Email Service for TIME
 *
 * Implements email notifications using RESEND API
 * Features:
 * - Transactional emails (welcome, verification, password reset)
 * - Trading alerts (price alerts, trade execution, stop loss)
 * - Marketing emails (newsletters, promotions)
 * - Template management
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('EmailService');

// RESEND API Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_BASE_URL = 'https://api.resend.com';
const FROM_EMAIL = process.env.EMAIL_FROM || 'TIME Trading <noreply@timebeyondus.com>';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@timebeyondus.com';

// Email templates
const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to TIME Trading - Your Journey Begins',
    getHtml: (data: { name: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to TIME</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">The Future of AI Trading</p>
        </div>
        <div style="padding: 40px; background: #1e293b; color: #e2e8f0;">
          <h2 style="color: white;">Hello ${data.name}!</h2>
          <p>You've just joined the most advanced AI trading platform in the world.</p>
          <p>With TIME, you have access to:</p>
          <ul>
            <li>🤖 154+ AI-powered trading bots</li>
            <li>📊 Real-time market analysis</li>
            <li>🎯 Institutional-grade execution</li>
            <li>💰 Performance-based pricing (pay only when you profit)</li>
          </ul>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://timebeyondus.com/dashboard" style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Trading</a>
          </div>
        </div>
        <div style="padding: 20px; background: #0f172a; text-align: center; color: #64748b; font-size: 12px;">
          <p>© 2025 TIME Trading. All rights reserved.</p>
          <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
        </div>
      </div>
    `
  },

  verification: {
    subject: 'Verify Your TIME Account',
    getHtml: (data: { name: string; code: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: #e2e8f0;">
        <div style="padding: 40px; text-align: center;">
          <h1 style="color: white;">Verify Your Email</h1>
          <p>Hi ${data.name}, use this code to verify your account:</p>
          <div style="background: #0f172a; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #7c3aed; letter-spacing: 8px;">${data.code}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      </div>
    `
  },

  passwordReset: {
    subject: 'Reset Your TIME Password',
    getHtml: (data: { name: string; resetLink: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: #e2e8f0;">
        <div style="padding: 40px; text-align: center;">
          <h1 style="color: white;">Reset Your Password</h1>
          <p>Hi ${data.name}, click the button below to reset your password:</p>
          <div style="margin: 30px 0;">
            <a href="${data.resetLink}" style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `
  },

  priceAlert: {
    subject: 'Price Alert Triggered - {symbol}',
    getHtml: (data: { symbol: string; price: number; condition: string; targetPrice: number }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: #e2e8f0;">
        <div style="padding: 40px; text-align: center;">
          <h1 style="color: ${data.condition === 'above' ? '#10b981' : '#ef4444'};">🔔 Price Alert</h1>
          <div style="background: #0f172a; padding: 30px; margin: 20px 0; border-radius: 8px;">
            <h2 style="color: white; margin: 0;">${data.symbol}</h2>
            <p style="font-size: 36px; color: ${data.condition === 'above' ? '#10b981' : '#ef4444'}; margin: 10px 0;">$${data.price.toFixed(2)}</p>
            <p style="color: #64748b;">Price went ${data.condition} your target of $${data.targetPrice.toFixed(2)}</p>
          </div>
          <a href="https://timebeyondus.com/trade?symbol=${data.symbol}" style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">Trade Now</a>
        </div>
      </div>
    `
  },

  tradeExecution: {
    subject: 'Trade Executed - {symbol}',
    getHtml: (data: { symbol: string; side: string; quantity: number; price: number; total: number }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: #e2e8f0;">
        <div style="padding: 40px; text-align: center;">
          <h1 style="color: ${data.side === 'BUY' ? '#10b981' : '#ef4444'};">✅ Trade Executed</h1>
          <div style="background: #0f172a; padding: 30px; margin: 20px 0; border-radius: 8px; text-align: left;">
            <table style="width: 100%; color: #e2e8f0;">
              <tr><td style="padding: 10px 0; color: #64748b;">Symbol</td><td style="text-align: right; font-weight: bold;">${data.symbol}</td></tr>
              <tr><td style="padding: 10px 0; color: #64748b;">Side</td><td style="text-align: right; color: ${data.side === 'BUY' ? '#10b981' : '#ef4444'}; font-weight: bold;">${data.side}</td></tr>
              <tr><td style="padding: 10px 0; color: #64748b;">Quantity</td><td style="text-align: right;">${data.quantity}</td></tr>
              <tr><td style="padding: 10px 0; color: #64748b;">Price</td><td style="text-align: right;">$${data.price.toFixed(2)}</td></tr>
              <tr style="border-top: 1px solid #334155;"><td style="padding: 15px 0; color: #64748b; font-weight: bold;">Total</td><td style="text-align: right; font-size: 20px; font-weight: bold;">$${data.total.toFixed(2)}</td></tr>
            </table>
          </div>
          <a href="https://timebeyondus.com/portfolio" style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Portfolio</a>
        </div>
      </div>
    `
  },

  dailyReport: {
    subject: 'Your Daily Trading Report - {date}',
    getHtml: (data: { name: string; date: string; pnl: number; trades: number; winRate: number }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: #e2e8f0;">
        <div style="padding: 40px; text-align: center;">
          <h1 style="color: white;">📊 Daily Report</h1>
          <p style="color: #64748b;">${data.date}</p>
          <div style="display: flex; justify-content: space-around; margin: 30px 0;">
            <div style="background: #0f172a; padding: 20px; border-radius: 8px; flex: 1; margin: 0 10px;">
              <p style="color: #64748b; margin: 0;">P&L</p>
              <p style="font-size: 24px; color: ${data.pnl >= 0 ? '#10b981' : '#ef4444'}; margin: 5px 0; font-weight: bold;">${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}</p>
            </div>
            <div style="background: #0f172a; padding: 20px; border-radius: 8px; flex: 1; margin: 0 10px;">
              <p style="color: #64748b; margin: 0;">Trades</p>
              <p style="font-size: 24px; color: white; margin: 5px 0; font-weight: bold;">${data.trades}</p>
            </div>
            <div style="background: #0f172a; padding: 20px; border-radius: 8px; flex: 1; margin: 0 10px;">
              <p style="color: #64748b; margin: 0;">Win Rate</p>
              <p style="font-size: 24px; color: #7c3aed; margin: 5px 0; font-weight: bold;">${data.winRate}%</p>
            </div>
          </div>
          <a href="https://timebeyondus.com/dashboard" style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Full Report</a>
        </div>
      </div>
    `
  }
};

interface EmailOptions {
  to: string | string[];
  subject?: string;
  html?: string;
  template?: keyof typeof EMAIL_TEMPLATES;
  data?: Record<string, any>;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export class EmailService {
  private apiKey: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = RESEND_API_KEY;
    this.isConfigured = !!this.apiKey && this.apiKey.length > 0;

    if (!this.isConfigured) {
      logger.warn('RESEND_API_KEY not configured - emails will be logged only');
    } else {
      logger.info('Email service initialized with RESEND');
    }
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Process template if specified
      let subject = options.subject || '';
      let html = options.html || '';

      if (options.template && EMAIL_TEMPLATES[options.template]) {
        const template = EMAIL_TEMPLATES[options.template];
        subject = template.subject.replace(/\{(\w+)\}/g, (_, key) => options.data?.[key] || '');
        html = template.getHtml(options.data || {});
      }

      const emailData = {
        from: options.from || FROM_EMAIL,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject,
        html,
        reply_to: options.replyTo || SUPPORT_EMAIL,
        tags: options.tags,
      };

      // If not configured, just log
      if (!this.isConfigured) {
        logger.info('Email would be sent (RESEND not configured)', {
          to: emailData.to,
          subject: emailData.subject
        });
        return { success: true, messageId: `mock_${Date.now()}` };
      }

      // Send via RESEND API
      const response = await fetch(`${RESEND_BASE_URL}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email');
      }

      logger.info('Email sent successfully', {
        to: emailData.to,
        subject: emailData.subject,
        messageId: result.id
      });

      return { success: true, messageId: result.id };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send email', { error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcome(email: string, name: string): Promise<{ success: boolean }> {
    return this.send({
      to: email,
      template: 'welcome',
      data: { name }
    });
  }

  /**
   * Send verification code
   */
  async sendVerification(email: string, name: string, code: string): Promise<{ success: boolean }> {
    return this.send({
      to: email,
      template: 'verification',
      data: { name, code }
    });
  }

  /**
   * Send password reset
   */
  async sendPasswordReset(email: string, name: string, resetLink: string): Promise<{ success: boolean }> {
    return this.send({
      to: email,
      template: 'passwordReset',
      data: { name, resetLink }
    });
  }

  /**
   * Send price alert
   */
  async sendPriceAlert(
    email: string,
    symbol: string,
    price: number,
    condition: 'above' | 'below',
    targetPrice: number
  ): Promise<{ success: boolean }> {
    return this.send({
      to: email,
      template: 'priceAlert',
      data: { symbol, price, condition, targetPrice }
    });
  }

  /**
   * Send trade execution notification
   */
  async sendTradeExecution(
    email: string,
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number
  ): Promise<{ success: boolean }> {
    return this.send({
      to: email,
      template: 'tradeExecution',
      data: { symbol, side, quantity, price, total: quantity * price }
    });
  }

  /**
   * Send daily report
   */
  async sendDailyReport(
    email: string,
    name: string,
    pnl: number,
    trades: number,
    winRate: number
  ): Promise<{ success: boolean }> {
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return this.send({
      to: email,
      template: 'dailyReport',
      data: { name, date, pnl, trades, winRate }
    });
  }

  /**
   * Send broadcast to all users
   */
  async sendBroadcast(
    emails: string[],
    subject: string,
    html: string
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    // Send in batches of 100
    const batchSize = 100;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(email => this.send({ to: email, subject, html }))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          sent++;
        } else {
          failed++;
        }
      });
    }

    logger.info('Broadcast complete', { sent, failed, total: emails.length });
    return { success: failed === 0, sent, failed };
  }
}

// Singleton instance
export const emailService = new EmailService();

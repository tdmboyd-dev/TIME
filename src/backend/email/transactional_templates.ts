/**
 * Transactional Email Templates for TIME
 *
 * Production-ready transactional emails:
 * - Trade confirmations
 * - Subscription receipts
 * - Password reset
 * - Account alerts
 * - Payment notifications
 * - Security alerts
 *
 * PRICING (correct as of 2025):
 * - FREE: $0/mo - 1 bot
 * - BASIC: $19/mo - 3 bots
 * - PRO: $49/mo - 7 bots
 * - PREMIUM: $109/mo - 11 Super Bots
 * - ENTERPRISE: $450/mo - Unlimited
 * - DROPBOT: +$39/mo add-on
 * - UMM: +$59/mo add-on
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('TransactionalTemplates');

// Base email styling
const EMAIL_STYLES = {
  container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;',
  header: 'background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 30px; text-align: center;',
  headerTitle: 'color: white; margin: 0; font-size: 24px;',
  headerSubtitle: 'color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 14px;',
  body: 'padding: 30px; background: #1e293b; color: #e2e8f0;',
  bodyTitle: 'color: white; font-size: 20px; margin-bottom: 15px;',
  text: 'color: #e2e8f0; line-height: 1.6; margin-bottom: 15px;',
  button: 'display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0;',
  buttonDanger: 'display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0;',
  footer: 'padding: 20px; background: #0f172a; text-align: center; color: #64748b; font-size: 12px;',
  table: 'width: 100%; border-collapse: collapse; margin: 15px 0;',
  tableHeader: 'background: #0f172a; color: #94a3b8; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase;',
  tableCell: 'padding: 12px 10px; border-bottom: 1px solid #334155; color: #e2e8f0;',
  alert: 'background: #fef3c7; color: #92400e; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;',
  alertDanger: 'background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 15px 0;',
  alertSuccess: 'background: #d1fae5; color: #065f46; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 15px 0;',
  code: 'background: #0f172a; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 24px; letter-spacing: 4px; text-align: center; color: #7c3aed;'
};

export interface TransactionalEmailData {
  userName?: string;
  email?: string;
  [key: string]: any;
}

/**
 * ===========================================
 * TRADE CONFIRMATIONS
 * ===========================================
 */

export const getTradeConfirmationTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Trade Executed</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.side === 'BUY' ? 'Purchase' : 'Sale'} Confirmation</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Order Confirmed</h2>
      <p style="${EMAIL_STYLES.text}">
        Hi ${data.userName || 'Trader'}, your ${data.side?.toLowerCase() || 'trade'} order has been executed successfully.
      </p>

      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="${EMAIL_STYLES.table}">
          <tr>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none;"><strong>Symbol</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none; text-align: right;">${data.symbol || 'N/A'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Side</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">
              <span style="background: ${data.side === 'BUY' ? '#10b981' : '#ef4444'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                ${data.side || 'N/A'}
              </span>
            </td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Quantity</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.quantity || '0'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Price</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">$${data.price?.toFixed(2) || '0.00'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Total Value</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right; color: #10b981; font-weight: bold;">$${data.total?.toFixed(2) || '0.00'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Commission</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">$${data.commission?.toFixed(2) || '0.00'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none;"><strong>Executed By</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none; text-align: right;">${data.botName || 'Manual Trade'}</td>
          </tr>
        </table>
      </div>

      <p style="${EMAIL_STYLES.text}; font-size: 12px; color: #64748b;">
        Order ID: ${data.orderId || 'N/A'}<br>
        Executed at: ${data.executedAt || new Date().toISOString()}
      </p>

      <div style="text-align: center;">
        <a href="https://timebeyondus.com/trades/${data.orderId}" style="${EMAIL_STYLES.button}">View Trade Details</a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>This is an automated trade confirmation from TIME Trading.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/settings/notifications" style="color: #7c3aed;">Manage Notifications</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * SUBSCRIPTION RECEIPTS
 * ===========================================
 */

export const getSubscriptionReceiptTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Payment Receipt</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}>Subscription Confirmation</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <div style="${EMAIL_STYLES.alertSuccess}">
        <strong>Payment Successful!</strong> Thank you for your subscription.
      </div>

      <h2 style="${EMAIL_STYLES.bodyTitle}">Receipt #${data.receiptNumber || 'N/A'}</h2>

      <table style="${EMAIL_STYLES.table}">
        <tr>
          <td style="${EMAIL_STYLES.tableCell}"><strong>Plan</strong></td>
          <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.planName || 'N/A'}</td>
        </tr>
        <tr>
          <td style="${EMAIL_STYLES.tableCell}"><strong>Billing Period</strong></td>
          <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.billingPeriod || 'Monthly'}</td>
        </tr>
        <tr>
          <td style="${EMAIL_STYLES.tableCell}"><strong>Amount</strong></td>
          <td style="${EMAIL_STYLES.tableCell}; text-align: right; font-weight: bold;">$${data.amount?.toFixed(2) || '0.00'}</td>
        </tr>
        ${data.discount ? `
        <tr>
          <td style="${EMAIL_STYLES.tableCell}"><strong>Discount</strong></td>
          <td style="${EMAIL_STYLES.tableCell}; text-align: right; color: #10b981;">-$${data.discount?.toFixed(2) || '0.00'}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="${EMAIL_STYLES.tableCell}"><strong>Tax</strong></td>
          <td style="${EMAIL_STYLES.tableCell}; text-align: right;">$${data.tax?.toFixed(2) || '0.00'}</td>
        </tr>
        <tr style="background: #0f172a;">
          <td style="${EMAIL_STYLES.tableCell}; border-bottom: none;"><strong>Total Charged</strong></td>
          <td style="${EMAIL_STYLES.tableCell}; border-bottom: none; text-align: right; color: #10b981; font-size: 18px; font-weight: bold;">
            $${data.totalCharged?.toFixed(2) || '0.00'}
          </td>
        </tr>
      </table>

      <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #94a3b8; margin: 0 0 10px 0; font-size: 12px;">PAYMENT METHOD</p>
        <p style="color: #e2e8f0; margin: 0;">
          ${data.paymentMethod || 'Card'} ending in ${data.cardLast4 || '****'}
        </p>
      </div>

      <p style="${EMAIL_STYLES.text}">
        <strong>Next billing date:</strong> ${data.nextBillingDate || 'N/A'}
      </p>

      <div style="text-align: center;">
        <a href="https://timebeyondus.com/billing" style="${EMAIL_STYLES.button}">Manage Subscription</a>
      </div>

      <p style="${EMAIL_STYLES.text}; font-size: 12px; color: #64748b; margin-top: 20px;">
        Transaction ID: ${data.transactionId || 'N/A'}<br>
        Date: ${data.date || new Date().toLocaleDateString()}
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>Questions? Contact support@timebeyondus.com</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * ===========================================
 * PASSWORD RESET
 * ===========================================
 */

export const getPasswordResetTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Password Reset</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Reset Your TIME Account Password</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        We received a request to reset your password. Click the button below to create a new password:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.resetLink || 'https://timebeyondus.com/reset-password'}" style="${EMAIL_STYLES.button}">Reset Password</a>
      </div>

      <p style="${EMAIL_STYLES.text}">
        Or copy and paste this link into your browser:
      </p>
      <div style="${EMAIL_STYLES.code}; font-size: 12px; word-break: break-all; letter-spacing: 0;">
        ${data.resetLink || 'https://timebeyondus.com/reset-password'}
      </div>

      <div style="${EMAIL_STYLES.alert}; margin-top: 20px;">
        <strong>Security Notice:</strong> This link will expire in ${data.expiresIn || '1 hour'}.
        If you didn't request a password reset, please ignore this email or contact support.
      </div>

      <p style="${EMAIL_STYLES.text}; font-size: 12px; color: #64748b;">
        Request originated from: ${data.ipAddress || 'Unknown'}<br>
        Time: ${data.requestTime || new Date().toISOString()}
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>If you didn't request this, please contact support@timebeyondus.com immediately.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * ===========================================
 * EMAIL VERIFICATION
 * ===========================================
 */

export const getEmailVerificationTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Verify Your Email</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">One Last Step to Get Started</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Welcome to TIME, ${data.userName || 'Trader'}!</h2>
      <p style="${EMAIL_STYLES.text}">
        Thanks for signing up. Please verify your email address to activate your account
        and start trading with AI bots.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.verificationLink || 'https://timebeyondus.com/verify'}" style="${EMAIL_STYLES.button}">Verify Email Address</a>
      </div>

      <p style="${EMAIL_STYLES.text}">
        Or enter this verification code on the website:
      </p>
      <div style="${EMAIL_STYLES.code}">
        ${data.verificationCode || '000000'}
      </div>

      <p style="${EMAIL_STYLES.text}; margin-top: 20px;">
        This code expires in ${data.expiresIn || '24 hours'}.
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>If you didn't create a TIME account, please ignore this email.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * ===========================================
 * ACCOUNT ALERTS
 * ===========================================
 */

export const getAccountAlertTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Account Alert</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.alertType || 'Important Notice'}</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <div style="${data.severity === 'danger' ? EMAIL_STYLES.alertDanger : data.severity === 'success' ? EMAIL_STYLES.alertSuccess : EMAIL_STYLES.alert}">
        <strong>${data.alertTitle || 'Alert'}:</strong> ${data.alertMessage || 'You have a new account alert.'}
      </div>

      <h2 style="${EMAIL_STYLES.bodyTitle}">${data.heading || 'Details'}</h2>
      <p style="${EMAIL_STYLES.text}">
        ${data.description || 'Please review the details below.'}
      </p>

      ${data.details ? `
      <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <pre style="color: #e2e8f0; margin: 0; white-space: pre-wrap; font-family: monospace; font-size: 12px;">${data.details}</pre>
      </div>
      ` : ''}

      ${data.actionUrl ? `
      <div style="text-align: center;">
        <a href="${data.actionUrl}" style="${data.severity === 'danger' ? EMAIL_STYLES.buttonDanger : EMAIL_STYLES.button}">${data.actionText || 'Take Action'}</a>
      </div>
      ` : ''}

      <p style="${EMAIL_STYLES.text}; font-size: 12px; color: #64748b; margin-top: 20px;">
        Alert generated: ${data.timestamp || new Date().toISOString()}
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>This is an automated alert from TIME Trading.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/settings/notifications" style="color: #7c3aed;">Manage Alert Preferences</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * SECURITY ALERTS
 * ===========================================
 */

export const getSecurityAlertTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 30px; text-align: center;">
      <h1 style="${EMAIL_STYLES.headerTitle}">Security Alert</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Unusual Activity Detected</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <div style="${EMAIL_STYLES.alertDanger}">
        <strong>Action Required:</strong> We detected unusual activity on your account.
      </div>

      <h2 style="${EMAIL_STYLES.bodyTitle}">${data.alertTitle || 'New Sign-in Detected'}</h2>
      <p style="${EMAIL_STYLES.text}">
        ${data.description || 'A new sign-in to your account was detected.'}
      </p>

      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="${EMAIL_STYLES.table}">
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Device</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.device || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Location</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.location || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>IP Address</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.ipAddress || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none;"><strong>Time</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none; text-align: right;">${data.timestamp || new Date().toISOString()}</td>
          </tr>
        </table>
      </div>

      <p style="${EMAIL_STYLES.text}">
        <strong>Was this you?</strong>
      </p>

      <div style="text-align: center;">
        <a href="https://timebeyondus.com/security/confirm?token=${data.confirmToken}" style="${EMAIL_STYLES.button}">Yes, This Was Me</a>
        <a href="https://timebeyondus.com/security/secure-account?token=${data.secureToken}" style="${EMAIL_STYLES.buttonDanger}; margin-left: 10px;">Secure My Account</a>
      </div>

      <p style="${EMAIL_STYLES.text}; margin-top: 20px;">
        If you don't recognize this activity, we recommend:
      </p>
      <ul style="color: #e2e8f0; line-height: 2;">
        <li>Change your password immediately</li>
        <li>Enable two-factor authentication</li>
        <li>Review your recent account activity</li>
      </ul>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>Need help? Contact security@timebeyondus.com immediately.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * ===========================================
 * PAYMENT FAILED
 * ===========================================
 */

export const getPaymentFailedTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 30px; text-align: center;">
      <h1 style="${EMAIL_STYLES.headerTitle}">Payment Failed</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Action Required</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <div style="${EMAIL_STYLES.alertDanger}">
        <strong>Payment Unsuccessful:</strong> We were unable to process your payment.
      </div>

      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        Your recent payment of <strong>$${data.amount?.toFixed(2) || '0.00'}</strong> for
        <strong>${data.planName || 'your subscription'}</strong> was unsuccessful.
      </p>

      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #94a3b8; margin: 0 0 10px 0; font-size: 12px;">REASON</p>
        <p style="color: #ef4444; margin: 0; font-weight: bold;">
          ${data.failureReason || 'Card declined'}
        </p>
      </div>

      <p style="${EMAIL_STYLES.text}">
        <strong>What happens next?</strong>
      </p>
      <ul style="color: #e2e8f0; line-height: 2;">
        <li>We'll retry the payment in ${data.retryDays || '3'} days</li>
        <li>Your subscription will remain active until ${data.gracePeriodEnd || 'the retry date'}</li>
        <li>Update your payment method to avoid service interruption</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://timebeyondus.com/billing/update" style="${EMAIL_STYLES.buttonDanger}">Update Payment Method</a>
      </div>

      <p style="${EMAIL_STYLES.text}; font-size: 12px; color: #64748b;">
        Invoice #: ${data.invoiceNumber || 'N/A'}<br>
        Transaction ID: ${data.transactionId || 'N/A'}
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>Questions? Contact billing@timebeyondus.com</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * ===========================================
 * BOT PERFORMANCE ALERT
 * ===========================================
 */

export const getBotPerformanceAlertTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Bot Performance Alert</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.botName || 'Your Bot'}</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <div style="${data.alertType === 'positive' ? EMAIL_STYLES.alertSuccess : EMAIL_STYLES.alert}">
        <strong>${data.alertType === 'positive' ? 'Great News!' : 'Attention Needed'}:</strong>
        ${data.alertMessage || 'Your bot has a performance update.'}
      </div>

      <h2 style="${EMAIL_STYLES.bodyTitle}">Performance Summary</h2>

      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="${EMAIL_STYLES.table}">
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Bot Name</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.botName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Today's P&L</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right; color: ${data.dailyPnL >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
              ${data.dailyPnL >= 0 ? '+' : ''}$${data.dailyPnL?.toFixed(2) || '0.00'}
            </td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Win Rate</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.winRate || '0'}%</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Total Trades Today</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">${data.tradesCount || '0'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none;"><strong>Status</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none; text-align: right;">
              <span style="background: ${data.status === 'active' ? '#10b981' : '#f59e0b'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                ${data.status?.toUpperCase() || 'ACTIVE'}
              </span>
            </td>
          </tr>
        </table>
      </div>

      ${data.recommendation ? `
      <p style="${EMAIL_STYLES.text}">
        <strong>Recommendation:</strong> ${data.recommendation}
      </p>
      ` : ''}

      <div style="text-align: center;">
        <a href="https://timebeyondus.com/bots/${data.botId}" style="${EMAIL_STYLES.button}">View Bot Details</a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>This is an automated performance alert from TIME Trading.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/settings/notifications" style="color: #7c3aed;">Manage Bot Alerts</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * MARGIN CALL WARNING
 * ===========================================
 */

export const getMarginCallTemplate = (data: TransactionalEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
      <h1 style="${EMAIL_STYLES.headerTitle}">MARGIN CALL WARNING</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Immediate Action Required</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <div style="${EMAIL_STYLES.alertDanger}">
        <strong>URGENT:</strong> Your account is approaching margin call threshold.
      </div>

      <h2 style="${EMAIL_STYLES.bodyTitle}">Account Status</h2>

      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="${EMAIL_STYLES.table}">
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Account Value</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right;">$${data.accountValue?.toFixed(2) || '0.00'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Margin Used</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right; color: #ef4444;">$${data.marginUsed?.toFixed(2) || '0.00'}</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}"><strong>Margin Level</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; text-align: right; color: #ef4444; font-weight: bold;">${data.marginLevel || '0'}%</td>
          </tr>
          <tr>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none;"><strong>Liquidation Threshold</strong></td>
            <td style="${EMAIL_STYLES.tableCell}; border-bottom: none; text-align: right;">${data.liquidationThreshold || '25'}%</td>
          </tr>
        </table>
      </div>

      <p style="${EMAIL_STYLES.text}">
        <strong>To avoid liquidation, you must:</strong>
      </p>
      <ul style="color: #e2e8f0; line-height: 2;">
        <li>Deposit additional funds: <strong>$${data.requiredDeposit?.toFixed(2) || '0.00'}</strong> minimum</li>
        <li>Close some open positions</li>
        <li>Reduce leverage on existing trades</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://timebeyondus.com/deposit" style="${EMAIL_STYLES.buttonDanger}">Deposit Funds Now</a>
        <a href="https://timebeyondus.com/positions" style="${EMAIL_STYLES.button}; margin-left: 10px;">Manage Positions</a>
      </div>

      <p style="${EMAIL_STYLES.text}; font-size: 12px; color: #64748b;">
        Alert generated: ${data.timestamp || new Date().toISOString()}<br>
        Deadline: ${data.deadline || 'Immediate'}
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>This is an urgent automated alert from TIME Trading.</p>
      <p>Need help? Contact risk@timebeyondus.com immediately.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * Template registry for transactional emails
 */
export const TRANSACTIONAL_TEMPLATES = {
  trade_confirmation: getTradeConfirmationTemplate,
  subscription_receipt: getSubscriptionReceiptTemplate,
  password_reset: getPasswordResetTemplate,
  email_verification: getEmailVerificationTemplate,
  account_alert: getAccountAlertTemplate,
  security_alert: getSecurityAlertTemplate,
  payment_failed: getPaymentFailedTemplate,
  bot_performance: getBotPerformanceAlertTemplate,
  margin_call: getMarginCallTemplate,
};

export type TransactionalTemplateType = keyof typeof TRANSACTIONAL_TEMPLATES;

/**
 * Get transactional template by type
 */
export const getTransactionalTemplate = (
  templateType: TransactionalTemplateType
): ((data: TransactionalEmailData) => string) | null => {
  return TRANSACTIONAL_TEMPLATES[templateType] || null;
};

logger.info('Transactional email templates loaded', {
  templateCount: Object.keys(TRANSACTIONAL_TEMPLATES).length,
});

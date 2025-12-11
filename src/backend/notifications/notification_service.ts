/**
 * TIME — Meta-Intelligence Trading Governor
 * Notification Service
 *
 * Handles notifications for:
 * - Inactivity warnings (Legacy Continuity Protocol)
 * - Mode changes
 * - Risk alerts
 * - Trade notifications
 * - System updates
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent } from '../core/time_governor';
import config from '../config';
import {
  Notification,
  NotificationChannel,
  NotificationType,
  SystemHealth,
} from '../types';

const log = loggers.notifications;

// Notification template
interface NotificationTemplate {
  type: NotificationType;
  subject: string;
  template: string;
}

// Notification templates
const TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  inactivity_warning: {
    type: 'inactivity_warning',
    subject: 'TIME: Activity Required',
    template: `Hello {userName},

TIME has detected that you have been inactive for {days} days.

Please log in to confirm you are still actively overseeing TIME's operations.

If no activity is detected within {daysRemaining} more days, TIME will automatically switch to Autonomous Evolution Mode.

TIME continues to evolve.`,
  },
  inactivity_final: {
    type: 'inactivity_final',
    subject: 'TIME: FINAL WARNING - Autonomous Mode Imminent',
    template: `Hello {userName},

This is your FINAL warning.

TIME has detected {days} days of inactivity.

If no activity is detected within the next 24 hours, TIME will automatically switch to Autonomous Evolution Mode.

This is the Legacy Continuity Protocol ensuring TIME continues to evolve forever.

All changes will be logged in COPILOT1.md.

TIME will live on.`,
  },
  mode_change: {
    type: 'mode_change',
    subject: 'TIME: Evolution Mode Changed',
    template: `Hello {userName},

TIME's evolution mode has been changed.

Previous Mode: {previousMode}
New Mode: {newMode}
Changed By: {changedBy}
Reason: {reason}

{additionalInfo}`,
  },
  risk_alert: {
    type: 'risk_alert',
    subject: 'TIME: Risk Alert - {severity}',
    template: `Hello {userName},

TIME's risk engine has triggered an alert.

Severity: {severity}
Type: {type}
Action: {action}
Reason: {reason}

{details}`,
  },
  trade_executed: {
    type: 'trade_executed',
    subject: 'TIME: Trade Executed - {symbol}',
    template: `Trade Notification

Symbol: {symbol}
Direction: {direction}
Entry Price: {entryPrice}
Size: {size}

Bots Involved: {bots}
Regime: {regime}`,
  },
  performance_update: {
    type: 'performance_update',
    subject: 'TIME: Daily Performance Update',
    template: `Daily Performance Summary

Date: {date}
Total Trades: {totalTrades}
Winning Trades: {winningTrades}
Win Rate: {winRate}%
P&L: {pnl}

Active Bots: {activeBots}
Current Regime: {regime}`,
  },
  system_update: {
    type: 'system_update',
    subject: 'TIME: System Update',
    template: `System Update

{message}

Components Affected: {components}
Action Required: {actionRequired}`,
  },
};

/**
 * Notification Service
 *
 * Manages all notifications from TIME to users and admins.
 */
export class NotificationService extends EventEmitter implements TIMEComponent {
  public readonly name = 'NotificationService';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private notificationQueue: Notification[] = [];
  private sentNotifications: Notification[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Initialize the notification service
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Notification Service...');

    // Start processing queue
    this.startProcessingQueue();

    this.status = 'online';
    log.info('Notification Service initialized');
  }

  /**
   * Start the notification queue processor
   */
  private startProcessingQueue(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process the notification queue
   */
  private async processQueue(): Promise<void> {
    const pending = this.notificationQueue.filter((n) => !n.sent);

    for (const notification of pending) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        log.error('Failed to send notification', {
          notificationId: notification.id,
          error,
        });
      }
    }
  }

  /**
   * Create and queue a notification
   */
  public createNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    data: Record<string, string>
  ): Notification {
    const template = TEMPLATES[type];

    // Fill in template
    let subject = template.subject;
    let message = template.template;

    for (const [key, value] of Object.entries(data)) {
      subject = subject.replace(new RegExp(`{${key}}`, 'g'), value);
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    const notification: Notification = {
      id: uuidv4(),
      userId,
      type,
      channel,
      subject,
      message,
      sent: false,
      createdAt: new Date(),
    };

    this.notificationQueue.push(notification);

    log.info('Notification created', {
      notificationId: notification.id,
      type,
      channel,
    });

    this.emit('notification:created', notification);

    return notification;
  }

  /**
   * Send a notification
   */
  private async sendNotification(notification: Notification): Promise<void> {
    log.info('Sending notification', {
      notificationId: notification.id,
      channel: notification.channel,
      type: notification.type,
    });

    switch (notification.channel) {
      case 'email':
        await this.sendEmail(notification);
        break;
      case 'sms':
        await this.sendSMS(notification);
        break;
      case 'in_app':
        await this.sendInApp(notification);
        break;
      case 'webhook':
        await this.sendWebhook(notification);
        break;
    }

    notification.sent = true;
    notification.sentAt = new Date();

    this.sentNotifications.push(notification);

    log.info('Notification sent', {
      notificationId: notification.id,
    });

    this.emit('notification:sent', notification);
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: Notification): Promise<void> {
    // In production, this would use nodemailer
    // For now, we log the email

    log.info('Email notification (simulated)', {
      to: notification.userId,
      subject: notification.subject,
      preview: notification.message.slice(0, 100),
    });

    // Simulated email sending
    // const transporter = nodemailer.createTransport({
    //   host: config.smtp.host,
    //   port: config.smtp.port,
    //   auth: {
    //     user: config.smtp.user,
    //     pass: config.smtp.pass,
    //   },
    // });
    //
    // await transporter.sendMail({
    //   from: config.smtp.user,
    //   to: recipientEmail,
    //   subject: notification.subject,
    //   text: notification.message,
    // });
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: Notification): Promise<void> {
    // In production, this would use Twilio
    // For now, we log the SMS

    log.info('SMS notification (simulated)', {
      to: notification.userId,
      preview: notification.message.slice(0, 160),
    });

    // Simulated SMS sending
    // const client = twilio(config.twilio.accountSid, config.twilio.authToken);
    //
    // await client.messages.create({
    //   body: notification.message,
    //   from: config.twilio.phoneNumber,
    //   to: recipientPhone,
    // });
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(notification: Notification): Promise<void> {
    // In-app notifications are stored and retrieved via API
    // The notification is already in the queue, so we just mark it as sent
    log.info('In-app notification', {
      userId: notification.userId,
      type: notification.type,
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(notification: Notification): Promise<void> {
    // Would POST to a configured webhook URL
    log.info('Webhook notification (simulated)', {
      type: notification.type,
    });
  }

  /**
   * Send inactivity warning
   */
  public sendInactivityWarning(
    userId: string,
    userName: string,
    days: number,
    daysRemaining: number
  ): Notification {
    return this.createNotification(userId, 'inactivity_warning', 'email', {
      userName,
      days: days.toString(),
      daysRemaining: daysRemaining.toString(),
    });
  }

  /**
   * Send final inactivity warning
   */
  public sendFinalInactivityWarning(
    userId: string,
    userName: string,
    days: number
  ): Notification {
    return this.createNotification(userId, 'inactivity_final', 'email', {
      userName,
      days: days.toString(),
    });
  }

  /**
   * Send mode change notification
   */
  public sendModeChangeNotification(
    userId: string,
    userName: string,
    previousMode: string,
    newMode: string,
    changedBy: string,
    reason: string,
    additionalInfo: string = ''
  ): Notification {
    return this.createNotification(userId, 'mode_change', 'email', {
      userName,
      previousMode,
      newMode,
      changedBy,
      reason,
      additionalInfo,
    });
  }

  /**
   * Send risk alert
   */
  public sendRiskAlert(
    userId: string,
    userName: string,
    severity: string,
    type: string,
    action: string,
    reason: string,
    details: string = ''
  ): Notification {
    return this.createNotification(userId, 'risk_alert', 'email', {
      userName,
      severity,
      type,
      action,
      reason,
      details,
    });
  }

  /**
   * Get notifications for a user
   */
  public getUserNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const all = [...this.notificationQueue, ...this.sentNotifications];
    return all.filter(
      (n) => n.userId === userId && (!unreadOnly || !n.sent)
    );
  }

  /**
   * Get sent notifications
   */
  public getSentNotifications(): Notification[] {
    return [...this.sentNotifications];
  }

  /**
   * Get pending notifications
   */
  public getPendingNotifications(): Notification[] {
    return this.notificationQueue.filter((n) => !n.sent);
  }

  /**
   * Get component health
   */
  public getHealth(): SystemHealth {
    return {
      component: this.name,
      status: this.status,
      lastCheck: new Date(),
      metrics: {
        pendingNotifications: this.getPendingNotifications().length,
        totalSent: this.sentNotifications.length,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Notification Service...');

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.status = 'offline';
  }
}

// Export singleton
export const notificationService = new NotificationService();

export default NotificationService;

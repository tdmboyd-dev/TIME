/**
 * Trigger-Based Email Service for TIME
 *
 * Comprehensive event-driven email triggering system:
 * - User lifecycle events (signup, first trade, milestone)
 * - Subscription events (trial started, payment, renewal)
 * - Trading events (first profit, winning streak, loss alert)
 * - Engagement events (inactive, re-activated)
 * - System events (security, account alerts)
 *
 * PRICING (correct as of 2025):
 * - FREE: $0/mo - 1 bot
 * - BASIC: $19/mo - 3 bots
 * - PRO: $49/mo - 7 bots
 * - PREMIUM: $109/mo - 11 Super Bots
 * - ENTERPRISE: $450/mo - Unlimited
 */

import { createComponentLogger } from '../utils/logger';
import { emailCampaignManager } from './email_campaign_manager';
import { dripCampaignService, CampaignStatus } from './drip_campaign_service';
import { segmentationService, UserProfile } from './segmentation_service';
import { DRIP_SEQUENCES, SequenceType, getSequenceById } from './drip_sequences';

const logger = createComponentLogger('TriggerEmailService');

/**
 * Event Types
 */
export enum TriggerEvent {
  // User Lifecycle
  USER_SIGNUP = 'user.signup',
  EMAIL_VERIFIED = 'user.email_verified',
  PROFILE_COMPLETED = 'user.profile_completed',
  BROKER_CONNECTED = 'user.broker_connected',

  // Trading Events
  FIRST_TRADE = 'trade.first',
  FIRST_PROFIT = 'trade.first_profit',
  MILESTONE_10_TRADES = 'trade.milestone_10',
  MILESTONE_100_TRADES = 'trade.milestone_100',
  MILESTONE_1000_TRADES = 'trade.milestone_1000',
  PROFIT_MILESTONE_100 = 'trade.profit_100',
  PROFIT_MILESTONE_1000 = 'trade.profit_1000',
  PROFIT_MILESTONE_10000 = 'trade.profit_10000',
  WINNING_STREAK = 'trade.winning_streak',
  LOSING_STREAK = 'trade.losing_streak',
  LARGE_TRADE = 'trade.large',

  // Bot Events
  BOT_ACTIVATED = 'bot.activated',
  BOT_DEACTIVATED = 'bot.deactivated',
  BOT_CREATED = 'bot.created',
  BOT_PROFITABLE = 'bot.profitable',
  BOT_LOSING = 'bot.losing',
  BOT_MILESTONE = 'bot.milestone',

  // Subscription Events
  TRIAL_STARTED = 'subscription.trial_started',
  TRIAL_ENDING_3_DAYS = 'subscription.trial_ending_3',
  TRIAL_ENDING_1_DAY = 'subscription.trial_ending_1',
  TRIAL_ENDED = 'subscription.trial_ended',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPGRADED = 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED = 'subscription.downgraded',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_EXPIRED = 'subscription.expired',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_RETRY = 'payment.retry',
  PAYMENT_SUCCEEDED = 'payment.succeeded',

  // Engagement Events
  INACTIVE_7_DAYS = 'engagement.inactive_7',
  INACTIVE_14_DAYS = 'engagement.inactive_14',
  INACTIVE_30_DAYS = 'engagement.inactive_30',
  RE_ACTIVATED = 'engagement.reactivated',
  FREE_TIER_LIMIT_HIT = 'engagement.free_limit',
  BASIC_TIER_LIMIT_HIT = 'engagement.basic_limit',

  // System Events
  PASSWORD_RESET_REQUESTED = 'security.password_reset',
  PASSWORD_CHANGED = 'security.password_changed',
  NEW_DEVICE_LOGIN = 'security.new_device',
  SUSPICIOUS_ACTIVITY = 'security.suspicious',
  TWO_FACTOR_ENABLED = 'security.2fa_enabled',

  // Marketing Events
  REFERRED_USER = 'marketing.referred',
  REFERRAL_CONVERTED = 'marketing.referral_converted',
  ANNIVERSARY_1_MONTH = 'marketing.anniversary_1m',
  ANNIVERSARY_6_MONTHS = 'marketing.anniversary_6m',
  ANNIVERSARY_1_YEAR = 'marketing.anniversary_1y',

  // Cart Events
  CART_ABANDONED = 'cart.abandoned',
  CART_RECOVERED = 'cart.recovered'
}

/**
 * Trigger Event Data
 */
export interface TriggerEventData {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  event: TriggerEvent;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Trigger Configuration
 */
export interface TriggerConfig {
  event: TriggerEvent;
  templateId: string;
  subject: string;
  delayMinutes?: number;
  conditions?: TriggerCondition[];
  sequenceId?: string;
  campaignId?: string;
  abTestId?: string;
  enabled: boolean;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'exists' | 'greater_than' | 'less_than';
  value: any;
}

/**
 * Default Trigger Configurations
 */
const DEFAULT_TRIGGERS: TriggerConfig[] = [
  // User Lifecycle Triggers
  {
    event: TriggerEvent.USER_SIGNUP,
    templateId: 'welcome_day_0',
    subject: 'Welcome to TIME - Your AI Trading Journey Begins!',
    delayMinutes: 0,
    sequenceId: 'seq_onboarding_v2',
    enabled: true
  },
  {
    event: TriggerEvent.EMAIL_VERIFIED,
    templateId: 'email_verified',
    subject: 'Email Verified - You\'re Ready to Trade!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.BROKER_CONNECTED,
    templateId: 'broker_connected',
    subject: 'Broker Connected - Time to Activate Your First Bot!',
    delayMinutes: 5,
    enabled: true
  },

  // Trading Event Triggers
  {
    event: TriggerEvent.FIRST_TRADE,
    templateId: 'milestone_first_trade',
    subject: 'Congratulations on Your First Trade!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.FIRST_PROFIT,
    templateId: 'milestone_first_profit',
    subject: 'You Made Your First Profit! Keep Going!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.MILESTONE_10_TRADES,
    templateId: 'milestone_10_trades',
    subject: '10 Trades Milestone - You\'re on Fire!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.MILESTONE_100_TRADES,
    templateId: 'milestone_100_trades',
    subject: '100 Trades! You\'re a Trading Machine',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.PROFIT_MILESTONE_1000,
    templateId: 'milestone_1000_profit',
    subject: '$1,000 in Profits - Incredible!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.WINNING_STREAK,
    templateId: 'winning_streak',
    subject: 'You\'re On a Winning Streak! ${winningStreak} Wins in a Row',
    delayMinutes: 0,
    conditions: [{ field: 'winningStreak', operator: 'greater_than', value: 4 }],
    enabled: true
  },
  {
    event: TriggerEvent.LOSING_STREAK,
    templateId: 'losing_streak_support',
    subject: 'Trading Can Be Tough - We\'re Here to Help',
    delayMinutes: 30,
    conditions: [{ field: 'losingStreak', operator: 'greater_than', value: 4 }],
    enabled: true
  },

  // Bot Event Triggers
  {
    event: TriggerEvent.BOT_ACTIVATED,
    templateId: 'bot_activated',
    subject: 'Your Bot "${botName}" is Now Live!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.BOT_CREATED,
    templateId: 'bot_created',
    subject: 'Custom Bot Created - Let\'s Make It Profitable!',
    delayMinutes: 5,
    enabled: true
  },
  {
    event: TriggerEvent.BOT_PROFITABLE,
    templateId: 'bot_performance',
    subject: 'Your Bot "${botName}" Just Hit +${profit} Profit!',
    delayMinutes: 0,
    conditions: [{ field: 'profit', operator: 'greater_than', value: 100 }],
    enabled: true
  },

  // Subscription Triggers
  {
    event: TriggerEvent.TRIAL_STARTED,
    templateId: 'trial_welcome',
    subject: 'Your 14-Day Premium Trial Has Begun!',
    delayMinutes: 0,
    sequenceId: 'seq_trial_conversion_v1',
    enabled: true
  },
  {
    event: TriggerEvent.TRIAL_ENDING_3_DAYS,
    templateId: 'trial_3_days_left',
    subject: 'Only 3 Days Left in Your Trial',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.TRIAL_ENDING_1_DAY,
    templateId: 'trial_1_day_left',
    subject: 'Tomorrow: Your Trial Ends - Don\'t Lose Access',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.TRIAL_ENDED,
    templateId: 'trial_ended_offer',
    subject: 'Trial Ended - Continue Your Journey with 20% Off',
    delayMinutes: 60,
    enabled: true
  },
  {
    event: TriggerEvent.SUBSCRIPTION_CREATED,
    templateId: 'subscription_receipt',
    subject: 'Welcome to ${planName}! Payment Confirmed',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.SUBSCRIPTION_UPGRADED,
    templateId: 'subscription_upgraded',
    subject: 'You\'ve Upgraded to ${planName} - New Features Unlocked!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.SUBSCRIPTION_RENEWED,
    templateId: 'subscription_receipt',
    subject: 'Subscription Renewed - Thank You!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.SUBSCRIPTION_CANCELLED,
    templateId: 'winback_sorry',
    subject: 'We\'re Sorry to See You Go',
    delayMinutes: 60,
    sequenceId: 'seq_winback_v1',
    enabled: true
  },
  {
    event: TriggerEvent.PAYMENT_FAILED,
    templateId: 'payment_failed',
    subject: 'Action Required: Payment Failed',
    delayMinutes: 0,
    enabled: true
  },

  // Engagement Triggers
  {
    event: TriggerEvent.INACTIVE_7_DAYS,
    templateId: 'reengagement_miss_you',
    subject: 'We Miss You! Markets Are Moving...',
    delayMinutes: 0,
    sequenceId: 'seq_reengagement_v1',
    enabled: true
  },
  {
    event: TriggerEvent.INACTIVE_30_DAYS,
    templateId: 'reengagement_final_warning',
    subject: 'Account Archival Notice - Action Required',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.RE_ACTIVATED,
    templateId: 'welcome_back',
    subject: 'Welcome Back! Here\'s What You Missed',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.FREE_TIER_LIMIT_HIT,
    templateId: 'upsell_limit_reached',
    subject: 'You\'re Hitting Your Limits - Unlock More',
    delayMinutes: 5,
    sequenceId: 'seq_upsell_free_v1',
    enabled: true
  },
  {
    event: TriggerEvent.BASIC_TIER_LIMIT_HIT,
    templateId: 'upsell_basic_to_pro',
    subject: 'Ready for More Bots? Upgrade to PRO',
    delayMinutes: 5,
    sequenceId: 'seq_upsell_basic_v1',
    enabled: true
  },

  // Security Triggers
  {
    event: TriggerEvent.PASSWORD_RESET_REQUESTED,
    templateId: 'password_reset',
    subject: 'Reset Your Password',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.PASSWORD_CHANGED,
    templateId: 'security_alert',
    subject: 'Your Password Has Been Changed',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.NEW_DEVICE_LOGIN,
    templateId: 'security_alert',
    subject: 'New Device Login Detected',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.SUSPICIOUS_ACTIVITY,
    templateId: 'security_alert',
    subject: 'Suspicious Activity Detected - Action Required',
    delayMinutes: 0,
    enabled: true
  },

  // Marketing Triggers
  {
    event: TriggerEvent.REFERRED_USER,
    templateId: 'referral_signup',
    subject: 'Your Referral ${referredName} Just Signed Up!',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.REFERRAL_CONVERTED,
    templateId: 'referral_converted',
    subject: 'You Earned $${rewardAmount}! Referral Converted',
    delayMinutes: 0,
    enabled: true
  },
  {
    event: TriggerEvent.ANNIVERSARY_1_YEAR,
    templateId: 'milestone_anniversary',
    subject: 'Happy 1-Year Anniversary with TIME!',
    delayMinutes: 0,
    enabled: true
  },

  // Cart Triggers
  {
    event: TriggerEvent.CART_ABANDONED,
    templateId: 'abandoned_cart_1',
    subject: 'You left something behind - Complete your upgrade',
    delayMinutes: 60,
    enabled: true
  }
];

/**
 * Trigger Email Service
 */
export class TriggerEmailService {
  private triggers: Map<TriggerEvent, TriggerConfig[]> = new Map();
  private scheduledTriggers: Map<string, NodeJS.Timeout> = new Map();
  private eventLog: Array<{
    eventId: string;
    event: TriggerEvent;
    userId: string;
    timestamp: Date;
    sent: boolean;
    error?: string;
  }> = [];

  constructor() {
    // Load default triggers
    for (const trigger of DEFAULT_TRIGGERS) {
      this.registerTrigger(trigger);
    }

    logger.info('Trigger email service initialized', {
      triggerCount: DEFAULT_TRIGGERS.length
    });
  }

  /**
   * Register a trigger configuration
   */
  registerTrigger(config: TriggerConfig): void {
    if (!this.triggers.has(config.event)) {
      this.triggers.set(config.event, []);
    }
    this.triggers.get(config.event)!.push(config);

    logger.debug('Trigger registered', { event: config.event, templateId: config.templateId });
  }

  /**
   * Fire a trigger event
   */
  async fireEvent(eventData: TriggerEventData): Promise<void> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Trigger event fired', {
      eventId,
      event: eventData.event,
      userId: eventData.userId
    });

    const triggers = this.triggers.get(eventData.event);
    if (!triggers || triggers.length === 0) {
      logger.debug('No triggers configured for event', { event: eventData.event });
      return;
    }

    for (const trigger of triggers) {
      if (!trigger.enabled) {
        continue;
      }

      // Check conditions
      if (!this.checkConditions(trigger.conditions, eventData.metadata)) {
        logger.debug('Trigger conditions not met', {
          event: eventData.event,
          templateId: trigger.templateId
        });
        continue;
      }

      // Apply delay if configured
      if (trigger.delayMinutes && trigger.delayMinutes > 0) {
        this.scheduleEmail(eventId, trigger, eventData);
      } else {
        await this.sendTriggerEmail(eventId, trigger, eventData);
      }

      // Trigger associated drip sequence if configured
      if (trigger.sequenceId) {
        await this.triggerSequence(trigger.sequenceId, eventData);
      }
    }
  }

  /**
   * Check if trigger conditions are met
   */
  private checkConditions(
    conditions: TriggerCondition[] | undefined,
    metadata: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.every(condition => {
      const value = metadata[condition.field];

      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'exists':
          return value !== undefined && value !== null;
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        default:
          return true;
      }
    });
  }

  /**
   * Schedule a delayed email
   */
  private scheduleEmail(
    eventId: string,
    trigger: TriggerConfig,
    eventData: TriggerEventData
  ): void {
    const delayMs = (trigger.delayMinutes || 0) * 60 * 1000;
    const scheduleId = `${eventId}_${trigger.templateId}`;

    const timeout = setTimeout(async () => {
      await this.sendTriggerEmail(eventId, trigger, eventData);
      this.scheduledTriggers.delete(scheduleId);
    }, delayMs);

    this.scheduledTriggers.set(scheduleId, timeout);

    logger.info('Email scheduled', {
      eventId,
      templateId: trigger.templateId,
      delayMinutes: trigger.delayMinutes
    });
  }

  /**
   * Send trigger email
   */
  private async sendTriggerEmail(
    eventId: string,
    trigger: TriggerConfig,
    eventData: TriggerEventData
  ): Promise<void> {
    try {
      // Substitute variables in subject
      let subject = trigger.subject;
      for (const [key, value] of Object.entries(eventData.metadata)) {
        subject = subject.replace(`\${${key}}`, String(value));
      }

      // Build template data
      const templateData = {
        userName: eventData.firstName || 'Trader',
        firstName: eventData.firstName,
        lastName: eventData.lastName,
        email: eventData.email,
        ...eventData.metadata
      };

      // Send email via campaign manager
      const result = await emailCampaignManager.sendEmail({
        to: eventData.email,
        templateType: trigger.templateId,
        templateData,
        subject,
        userId: eventData.userId,
        campaignId: trigger.campaignId || `trigger_${eventData.event}`,
        abTestId: trigger.abTestId
      });

      // Log event
      this.eventLog.push({
        eventId,
        event: eventData.event,
        userId: eventData.userId,
        timestamp: new Date(),
        sent: result.success,
        error: result.error
      });

      if (result.success) {
        logger.info('Trigger email sent', {
          eventId,
          event: eventData.event,
          templateId: trigger.templateId,
          userId: eventData.userId
        });
      } else {
        logger.error('Trigger email failed', {
          eventId,
          error: result.error
        });
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send trigger email', { error: message, eventId });

      this.eventLog.push({
        eventId,
        event: eventData.event,
        userId: eventData.userId,
        timestamp: new Date(),
        sent: false,
        error: message
      });
    }
  }

  /**
   * Trigger a drip sequence
   */
  private async triggerSequence(
    sequenceId: string,
    eventData: TriggerEventData
  ): Promise<void> {
    const sequence = getSequenceById(sequenceId);
    if (!sequence) {
      logger.warn('Sequence not found', { sequenceId });
      return;
    }

    if (sequence.status !== CampaignStatus.ACTIVE) {
      logger.warn('Sequence not active', { sequenceId, status: sequence.status });
      return;
    }

    logger.info('Triggering drip sequence', {
      sequenceId,
      userId: eventData.userId,
      emailCount: sequence.emails.length
    });

    // The actual sequence execution would be handled by the drip campaign service
    // Here we just log the trigger
  }

  /**
   * Cancel a scheduled email
   */
  cancelScheduledEmail(scheduleId: string): boolean {
    const timeout = this.scheduledTriggers.get(scheduleId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledTriggers.delete(scheduleId);
      logger.info('Scheduled email cancelled', { scheduleId });
      return true;
    }
    return false;
  }

  /**
   * Get trigger configuration
   */
  getTrigger(event: TriggerEvent): TriggerConfig[] | undefined {
    return this.triggers.get(event);
  }

  /**
   * Update trigger configuration
   */
  updateTrigger(event: TriggerEvent, templateId: string, updates: Partial<TriggerConfig>): boolean {
    const triggers = this.triggers.get(event);
    if (!triggers) return false;

    const index = triggers.findIndex(t => t.templateId === templateId);
    if (index === -1) return false;

    triggers[index] = { ...triggers[index], ...updates };
    logger.info('Trigger updated', { event, templateId });
    return true;
  }

  /**
   * Enable/disable trigger
   */
  setTriggerEnabled(event: TriggerEvent, templateId: string, enabled: boolean): boolean {
    return this.updateTrigger(event, templateId, { enabled });
  }

  /**
   * Get event log
   */
  getEventLog(options?: {
    userId?: string;
    event?: TriggerEvent;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): typeof this.eventLog {
    let log = [...this.eventLog];

    if (options?.userId) {
      log = log.filter(l => l.userId === options.userId);
    }
    if (options?.event) {
      log = log.filter(l => l.event === options.event);
    }
    if (options?.startDate) {
      log = log.filter(l => l.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      log = log.filter(l => l.timestamp <= options.endDate!);
    }

    log.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      log = log.slice(0, options.limit);
    }

    return log;
  }

  /**
   * Get all registered triggers
   */
  getAllTriggers(): Map<TriggerEvent, TriggerConfig[]> {
    return this.triggers;
  }

  /**
   * Get trigger stats
   */
  getTriggerStats(): {
    totalEvents: number;
    successRate: number;
    byEvent: Record<string, { total: number; success: number }>;
  } {
    const byEvent: Record<string, { total: number; success: number }> = {};
    let totalSuccess = 0;

    for (const log of this.eventLog) {
      if (!byEvent[log.event]) {
        byEvent[log.event] = { total: 0, success: 0 };
      }
      byEvent[log.event].total++;
      if (log.sent) {
        byEvent[log.event].success++;
        totalSuccess++;
      }
    }

    return {
      totalEvents: this.eventLog.length,
      successRate: this.eventLog.length > 0 ? (totalSuccess / this.eventLog.length) * 100 : 0,
      byEvent
    };
  }
}

// Singleton instance
export const triggerEmailService = new TriggerEmailService();

/**
 * Convenience functions for common triggers
 */
export const triggerUserSignup = (
  userId: string,
  email: string,
  firstName?: string
) => {
  return triggerEmailService.fireEvent({
    userId,
    email,
    firstName,
    event: TriggerEvent.USER_SIGNUP,
    timestamp: new Date(),
    metadata: { signupDate: new Date().toISOString() }
  });
};

export const triggerFirstTrade = (
  userId: string,
  email: string,
  firstName: string,
  tradeData: { symbol: string; side: string; quantity: number; price: number }
) => {
  return triggerEmailService.fireEvent({
    userId,
    email,
    firstName,
    event: TriggerEvent.FIRST_TRADE,
    timestamp: new Date(),
    metadata: tradeData
  });
};

export const triggerFirstProfit = (
  userId: string,
  email: string,
  firstName: string,
  profit: number,
  botName?: string
) => {
  return triggerEmailService.fireEvent({
    userId,
    email,
    firstName,
    event: TriggerEvent.FIRST_PROFIT,
    timestamp: new Date(),
    metadata: { profit, botName }
  });
};

export const triggerMilestone = (
  userId: string,
  email: string,
  firstName: string,
  milestone: 'first_trade' | 'first_profit' | '10_trades' | '100_trades' | '1000_profit',
  value?: number
) => {
  const eventMap: Record<string, TriggerEvent> = {
    first_trade: TriggerEvent.FIRST_TRADE,
    first_profit: TriggerEvent.FIRST_PROFIT,
    '10_trades': TriggerEvent.MILESTONE_10_TRADES,
    '100_trades': TriggerEvent.MILESTONE_100_TRADES,
    '1000_profit': TriggerEvent.PROFIT_MILESTONE_1000
  };

  return triggerEmailService.fireEvent({
    userId,
    email,
    firstName,
    event: eventMap[milestone] || TriggerEvent.FIRST_TRADE,
    timestamp: new Date(),
    metadata: { milestone, value }
  });
};

export const triggerInactive = (
  userId: string,
  email: string,
  firstName: string,
  daysSinceLastLogin: number
) => {
  let event: TriggerEvent;
  if (daysSinceLastLogin >= 30) {
    event = TriggerEvent.INACTIVE_30_DAYS;
  } else if (daysSinceLastLogin >= 14) {
    event = TriggerEvent.INACTIVE_14_DAYS;
  } else {
    event = TriggerEvent.INACTIVE_7_DAYS;
  }

  return triggerEmailService.fireEvent({
    userId,
    email,
    firstName,
    event,
    timestamp: new Date(),
    metadata: { daysSinceLastLogin }
  });
};

export const triggerPaymentFailed = (
  userId: string,
  email: string,
  firstName: string,
  amount: number,
  reason: string,
  planName: string
) => {
  return triggerEmailService.fireEvent({
    userId,
    email,
    firstName,
    event: TriggerEvent.PAYMENT_FAILED,
    timestamp: new Date(),
    metadata: { amount, reason, planName }
  });
};

export const triggerCartAbandoned = (
  userId: string,
  email: string,
  firstName: string,
  cartData: { planName: string; planPrice: number; checkoutLink: string }
) => {
  return triggerEmailService.fireEvent({
    userId,
    email,
    firstName,
    event: TriggerEvent.CART_ABANDONED,
    timestamp: new Date(),
    metadata: cartData
  });
};

logger.info('Trigger email service module loaded');

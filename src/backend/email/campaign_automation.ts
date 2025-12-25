/**
 * Campaign Automation Triggers for TIME
 *
 * Automatically trigger email campaigns based on user events:
 * - User signup → Welcome series
 * - Bot activated → Tips email
 * - First profit → Congratulations email
 * - 7 days inactive → We miss you
 * - Subscription expiring → Renewal reminder
 * - Trade executed → Trade confirmation
 * - Payment failed → Payment retry
 */

import { dripCampaignService } from './drip_campaign_service';
import { WELCOME_SERIES, INACTIVE_USER, UPGRADE_NUDGE } from './campaign_templates';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CampaignAutomation');

export interface UserEvent {
  userId: string;
  userEmail: string;
  userName?: string;
  eventType: string;
  eventData?: Record<string, any>;
  timestamp: Date;
}

export class CampaignAutomation {
  /**
   * Handle user signup event
   * Triggers: Welcome Series campaign
   */
  async onUserSignup(userId: string, userEmail: string, userName: string): Promise<void> {
    try {
      logger.info('Triggering welcome series for new user', { userId, userEmail });

      await dripCampaignService.triggerCampaign(
        WELCOME_SERIES.id,
        userId,
        userEmail,
        {
          userName,
          email: userEmail,
          signupDate: new Date().toLocaleDateString(),
        }
      );

      logger.info('Welcome series triggered', { userId });
    } catch (error) {
      logger.error('Failed to trigger welcome series', { error, userId });
    }
  }

  /**
   * Handle bot activation event
   * Triggers: Bot tips email
   */
  async onBotActivated(
    userId: string,
    userEmail: string,
    userName: string,
    botName: string,
    botType: string
  ): Promise<void> {
    try {
      logger.info('User activated bot', { userId, botName });

      // Could send a custom one-off email with bot-specific tips
      // For now, just log the event
      logger.info('Bot activation email would be sent', { userId, botName });

    } catch (error) {
      logger.error('Failed to handle bot activation', { error, userId });
    }
  }

  /**
   * Handle first profit event
   * Triggers: Congratulations email
   */
  async onFirstProfit(
    userId: string,
    userEmail: string,
    userName: string,
    profitAmount: number,
    botName: string
  ): Promise<void> {
    try {
      logger.info('User achieved first profit', { userId, profitAmount });

      // Could send congratulations email
      logger.info('First profit congratulations would be sent', {
        userId,
        profit: profitAmount,
        botName,
      });

    } catch (error) {
      logger.error('Failed to handle first profit', { error, userId });
    }
  }

  /**
   * Handle user inactivity
   * Triggers: Inactive user re-engagement campaign
   */
  async onUserInactive(
    userId: string,
    userEmail: string,
    userName: string,
    daysSinceLastLogin: number
  ): Promise<void> {
    try {
      // Only trigger if inactive for 30+ days
      if (daysSinceLastLogin < 30) {
        return;
      }

      logger.info('Triggering inactive user campaign', { userId, daysSinceLastLogin });

      await dripCampaignService.triggerCampaign(
        INACTIVE_USER.id,
        userId,
        userEmail,
        {
          userName,
          daysSinceLastLogin,
        }
      );

      logger.info('Inactive user campaign triggered', { userId });
    } catch (error) {
      logger.error('Failed to trigger inactive user campaign', { error, userId });
    }
  }

  /**
   * Handle subscription expiring event
   * Triggers: Renewal reminder email
   */
  async onSubscriptionExpiring(
    userId: string,
    userEmail: string,
    userName: string,
    daysUntilExpiry: number,
    subscriptionPlan: string
  ): Promise<void> {
    try {
      logger.info('Subscription expiring soon', { userId, daysUntilExpiry });

      // Could send renewal reminder
      logger.info('Subscription renewal reminder would be sent', {
        userId,
        daysUntilExpiry,
        subscriptionPlan,
      });

    } catch (error) {
      logger.error('Failed to handle subscription expiring', { error, userId });
    }
  }

  /**
   * Handle trade executed event
   * Triggers: Trade confirmation email (if user has notifications enabled)
   */
  async onTradeExecuted(
    userId: string,
    userEmail: string,
    userName: string,
    tradeData: {
      symbol: string;
      side: 'BUY' | 'SELL';
      quantity: number;
      price: number;
      total: number;
    }
  ): Promise<void> {
    try {
      logger.info('Trade executed', { userId, symbol: tradeData.symbol });

      // Could send trade confirmation email
      logger.info('Trade confirmation would be sent', { userId, tradeData });

    } catch (error) {
      logger.error('Failed to handle trade executed', { error, userId });
    }
  }

  /**
   * Handle payment failed event
   * Triggers: Payment retry email
   */
  async onPaymentFailed(
    userId: string,
    userEmail: string,
    userName: string,
    amount: number,
    reason: string
  ): Promise<void> {
    try {
      logger.info('Payment failed', { userId, amount, reason });

      // Could send payment retry email
      logger.info('Payment retry email would be sent', { userId, amount, reason });

    } catch (error) {
      logger.error('Failed to handle payment failed', { error, userId });
    }
  }

  /**
   * Handle free tier limitation hit
   * Triggers: Upgrade nudge campaign
   */
  async onFreeTierLimitHit(
    userId: string,
    userEmail: string,
    userName: string,
    limitation: string
  ): Promise<void> {
    try {
      logger.info('Free tier limitation hit', { userId, limitation });

      await dripCampaignService.triggerCampaign(
        UPGRADE_NUDGE.id,
        userId,
        userEmail,
        {
          userName,
          limitation,
        }
      );

      logger.info('Upgrade nudge campaign triggered', { userId });
    } catch (error) {
      logger.error('Failed to trigger upgrade nudge', { error, userId });
    }
  }

  /**
   * Process user event and trigger appropriate campaigns
   */
  async processUserEvent(event: UserEvent): Promise<void> {
    const { userId, userEmail, eventType, eventData } = event;
    const userName = eventData?.userName || 'Trader';

    logger.info('Processing user event', { userId, eventType });

    try {
      switch (eventType) {
        case 'user.signup':
          await this.onUserSignup(userId, userEmail, userName);
          break;

        case 'bot.activated':
          await this.onBotActivated(
            userId,
            userEmail,
            userName,
            eventData?.botName || '',
            eventData?.botType || ''
          );
          break;

        case 'user.first_profit':
          await this.onFirstProfit(
            userId,
            userEmail,
            userName,
            eventData?.profitAmount || 0,
            eventData?.botName || ''
          );
          break;

        case 'user.inactive':
          await this.onUserInactive(
            userId,
            userEmail,
            userName,
            eventData?.daysSinceLastLogin || 0
          );
          break;

        case 'subscription.expiring':
          await this.onSubscriptionExpiring(
            userId,
            userEmail,
            userName,
            eventData?.daysUntilExpiry || 0,
            eventData?.subscriptionPlan || ''
          );
          break;

        case 'trade.executed':
          await this.onTradeExecuted(userId, userEmail, userName, eventData?.trade || {});
          break;

        case 'payment.failed':
          await this.onPaymentFailed(
            userId,
            userEmail,
            userName,
            eventData?.amount || 0,
            eventData?.reason || ''
          );
          break;

        case 'free_tier.limit_hit':
          await this.onFreeTierLimitHit(
            userId,
            userEmail,
            userName,
            eventData?.limitation || ''
          );
          break;

        default:
          logger.debug('Unknown event type', { eventType });
      }
    } catch (error) {
      logger.error('Failed to process user event', { error, eventType });
      throw error;
    }
  }

  /**
   * Check for inactive users and trigger campaigns
   * Should be called by a cron job daily
   */
  async checkInactiveUsers(): Promise<void> {
    try {
      logger.info('Checking for inactive users');

      // TODO: Query database for users who haven't logged in for 30+ days
      // For each inactive user, call onUserInactive()

      logger.info('Inactive users check complete');
    } catch (error) {
      logger.error('Failed to check inactive users', { error });
    }
  }

  /**
   * Check for expiring subscriptions and send reminders
   * Should be called by a cron job daily
   */
  async checkExpiringSubscriptions(): Promise<void> {
    try {
      logger.info('Checking for expiring subscriptions');

      // TODO: Query database for subscriptions expiring in 7, 3, 1 days
      // For each expiring subscription, call onSubscriptionExpiring()

      logger.info('Expiring subscriptions check complete');
    } catch (error) {
      logger.error('Failed to check expiring subscriptions', { error });
    }
  }
}

// Singleton instance
export const campaignAutomation = new CampaignAutomation();

/**
 * Convenience functions to trigger campaigns from anywhere in the app
 */
export const triggerWelcomeCampaign = (userId: string, userEmail: string, userName: string) => {
  return campaignAutomation.onUserSignup(userId, userEmail, userName);
};

export const triggerInactiveCampaign = (
  userId: string,
  userEmail: string,
  userName: string,
  daysSinceLastLogin: number
) => {
  return campaignAutomation.onUserInactive(userId, userEmail, userName, daysSinceLastLogin);
};

export const triggerUpgradeNudge = (
  userId: string,
  userEmail: string,
  userName: string,
  limitation: string
) => {
  return campaignAutomation.onFreeTierLimitHit(userId, userEmail, userName, limitation);
};

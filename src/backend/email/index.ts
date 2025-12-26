/**
 * Email System Index for TIME
 *
 * Comprehensive email marketing and transactional email system.
 *
 * Features:
 * - Email Drip Campaigns (Welcome Series, Upgrade Nudge, Inactive User)
 * - Abandoned Cart Recovery
 * - Transactional Emails (Trade confirmations, Receipts, Password Reset, Alerts)
 * - Marketing Emails (Newsletter, Feature Announcements, Promotions)
 * - A/B Testing
 * - Template Editor
 * - Analytics & Conversion Tracking
 * - Rate Limiting
 * - SendGrid Integration
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

// Core Services
export { sendGridService, SendGridService, SendGridEmailOptions, SendGridResponse, SendGridWebhookEvent } from './sendgrid_service';
export { dripCampaignService, DripCampaignService, CampaignType, CampaignStatus, EmailStatus, Campaign, CampaignEmail, EmailLog, CampaignStats } from './drip_campaign_service';
export { campaignEmailService, CampaignEmailService, CampaignEmailData } from './campaign_email_service';
export { campaignAutomation, CampaignAutomation, UserEvent, triggerWelcomeCampaign, triggerInactiveCampaign, triggerUpgradeNudge } from './campaign_automation';

// Campaign Manager (Main Entry Point)
export {
  emailCampaignManager,
  EmailCampaignManager,
  RateLimiter,
  ABTestingService,
  AnalyticsService,
  TemplateEditorService,
  SendEmailOptions,
  ScheduledEmail,
  ABTest,
  ABTestVariant,
  ABTestResult,
  ConversionGoal,
  CampaignAnalytics,
  EmailEngagement,
  CustomTemplate
} from './email_campaign_manager';

// Templates - Drip Campaigns
export {
  TEMPLATE_REGISTRY,
  TemplateData,
  WELCOME_SERIES,
  UPGRADE_NUDGE,
  INACTIVE_USER,
  FEATURE_EDUCATION,
  getAllCampaignTemplates,
  getTemplateById,
  getWelcomeDay0Template,
  getWelcomeDay1Template,
  getWelcomeDay3Template,
  getWelcomeDay7Template,
  getWelcomeDay14Template
} from './campaign_templates';

// Templates - Additional Drip
export {
  ADDITIONAL_TEMPLATES,
  getUpgradeLimitationsTemplate,
  getUpgradeSuccessStoryTemplate,
  getUpgradeOfferTemplate,
  getInactiveMissYouTemplate,
  getInactiveNewFeaturesTemplate,
  getInactiveWarningTemplate
} from './additional_templates';

// Templates - Transactional
export {
  TRANSACTIONAL_TEMPLATES,
  TransactionalTemplateType,
  TransactionalEmailData,
  getTransactionalTemplate,
  getTradeConfirmationTemplate,
  getSubscriptionReceiptTemplate,
  getPasswordResetTemplate,
  getEmailVerificationTemplate,
  getAccountAlertTemplate,
  getSecurityAlertTemplate,
  getPaymentFailedTemplate,
  getBotPerformanceAlertTemplate,
  getMarginCallTemplate
} from './transactional_templates';

// Templates - Marketing
export {
  MARKETING_TEMPLATES,
  MarketingTemplateType,
  MarketingEmailData,
  getMarketingTemplate,
  getNewsletterTemplate,
  getFeatureAnnouncementTemplate,
  getSpecialPromotionTemplate,
  getAbandonedCart1Template,
  getAbandonedCart2Template,
  getAbandonedCart3Template,
  getSeasonalPromotionTemplate
} from './marketing_templates';

/**
 * Quick Start Guide:
 *
 * 1. Send a transactional email:
 *    ```
 *    import { emailCampaignManager } from './email';
 *
 *    await emailCampaignManager.sendEmail({
 *      to: 'user@example.com',
 *      templateType: 'trade_confirmation',
 *      templateData: { symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150.50 }
 *    });
 *    ```
 *
 * 2. Trigger a drip campaign:
 *    ```
 *    import { triggerWelcomeCampaign } from './email';
 *
 *    await triggerWelcomeCampaign('user123', 'user@example.com', 'John');
 *    ```
 *
 * 3. Create an A/B test:
 *    ```
 *    const abService = emailCampaignManager.getABTestingService();
 *    const test = abService.createTest({
 *      name: 'Subject Line Test',
 *      variants: [
 *        { id: 'a', name: 'Variant A', subject: 'Welcome!', weight: 50 },
 *        { id: 'b', name: 'Variant B', subject: 'Get Started Now!', weight: 50 }
 *      ],
 *      winnerMetric: 'open_rate',
 *      minimumSampleSize: 100,
 *      confidenceLevel: 0.95
 *    });
 *    ```
 *
 * 4. Track analytics:
 *    ```
 *    const analytics = emailCampaignManager.getAnalyticsService();
 *    const campaignStats = analytics.getCampaignAnalytics('campaign_123', 'week');
 *    ```
 */

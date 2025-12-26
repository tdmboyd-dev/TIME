/**
 * Email System Index for TIME
 *
 * Comprehensive email marketing and transactional email system.
 *
 * Features:
 * - Email Drip Campaigns (Welcome Series, Upgrade Nudge, Inactive User)
 * - Drip Sequences (Onboarding, Re-engagement, Upsell, Milestones)
 * - Abandoned Cart Recovery
 * - Transactional Emails (Trade confirmations, Receipts, Password Reset, Alerts)
 * - Marketing Emails (Newsletter, Feature Announcements, Promotions)
 * - A/B Testing with statistical significance
 * - Template Editor with variable substitution
 * - Analytics & Conversion Tracking
 * - User Segmentation (by tier, activity, asset class)
 * - Trigger-based Emails (signup, first trade, milestone)
 * - Bounce Handling & Suppression List
 * - Open/Click Tracking with pixel and link tracking
 * - Rate Limiting
 * - SendGrid & Mailgun Integration
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

// Core Email Services
export { sendGridService, SendGridService, SendGridEmailOptions, SendGridResponse, SendGridWebhookEvent } from './sendgrid_service';
export { mailgunService, MailgunService, MailgunEmailOptions, MailgunResponse, MailgunWebhookEvent, EmailValidationResult } from './mailgun_service';

// Drip Campaign Service
export { dripCampaignService, DripCampaignService, CampaignType, CampaignStatus, EmailStatus, Campaign, CampaignEmail, EmailLog, CampaignStats, CampaignTrigger, ABTestConfig, EmailVariant, VariantStats } from './drip_campaign_service';

// Campaign Email Service
export { campaignEmailService, CampaignEmailService, CampaignEmailData } from './campaign_email_service';

// Campaign Automation
export { campaignAutomation, CampaignAutomation, UserEvent, triggerWelcomeCampaign, triggerInactiveCampaign, triggerUpgradeNudge, triggerAbandonedCart, sendWeeklyDigest } from './campaign_automation';

// Email Campaign Manager (Main Entry Point)
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

// Drip Sequences
export {
  DRIP_SEQUENCES,
  ONBOARDING_SEQUENCE,
  REENGAGEMENT_SEQUENCE,
  UPSELL_FREE_SEQUENCE,
  UPSELL_BASIC_SEQUENCE,
  MILESTONE_SEQUENCE,
  WINBACK_SEQUENCE,
  TRIAL_CONVERSION_SEQUENCE,
  LOYALTY_SEQUENCE,
  SequenceType,
  UserSegment,
  DripSequence,
  SequenceEmail,
  SequenceTrigger,
  ExitCondition,
  EmailCondition,
  getSequenceById,
  getSequencesByType,
  getSequencesForSegment
} from './drip_sequences';

// Segmentation Service
export {
  segmentationService,
  SegmentationService,
  PREDEFINED_SEGMENTS,
  Segment,
  SegmentRule,
  SegmentGroup,
  UserProfile,
  RuleOperator
} from './segmentation_service';

// Trigger Email Service
export {
  triggerEmailService,
  TriggerEmailService,
  TriggerEvent,
  TriggerEventData,
  TriggerConfig,
  TriggerCondition,
  triggerUserSignup,
  triggerFirstTrade,
  triggerFirstProfit,
  triggerMilestone,
  triggerInactive,
  triggerPaymentFailed,
  triggerCartAbandoned
} from './trigger_email_service';

// Bounce Handler
export {
  bounceHandler,
  BounceHandler,
  BounceType,
  SuppressionReason,
  BounceRecord,
  SuppressionEntry,
  SoftBounceTracker,
  BounceStats
} from './bounce_handler';

// Tracking Service
export {
  trackingService,
  TrackingService,
  TrackingEventType,
  TrackingEvent,
  TrackingMetadata,
  TrackedLink,
  OpenTrackingData,
  TrackingStats
} from './tracking_service';

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
 * 3. Use trigger-based emails:
 *    ```
 *    import { triggerEmailService, TriggerEvent } from './email';
 *
 *    await triggerEmailService.fireEvent({
 *      userId: 'user123',
 *      email: 'user@example.com',
 *      firstName: 'John',
 *      event: TriggerEvent.FIRST_TRADE,
 *      timestamp: new Date(),
 *      metadata: { symbol: 'AAPL', profit: 150 }
 *    });
 *    ```
 *
 * 4. Create an A/B test:
 *    ```
 *    const abService = emailCampaignManager.getABTestingService();
 *    const test = abService.createTest({
 *      campaignId: 'welcome_series',
 *      name: 'Subject Line Test',
 *      status: 'draft',
 *      variants: [
 *        { id: 'a', name: 'Variant A', subject: 'Welcome!', weight: 50 },
 *        { id: 'b', name: 'Variant B', subject: 'Get Started Now!', weight: 50 }
 *      ],
 *      winnerMetric: 'open_rate',
 *      minimumSampleSize: 100,
 *      confidenceLevel: 0.95
 *    });
 *    abService.startTest(test.id);
 *    ```
 *
 * 5. User Segmentation:
 *    ```
 *    import { segmentationService, UserProfile } from './email';
 *
 *    const user: UserProfile = {
 *      userId: 'user123',
 *      email: 'user@example.com',
 *      tier: 'FREE',
 *      subscriptionStatus: 'active',
 *      // ... other properties
 *    };
 *
 *    const segments = segmentationService.getUserSegments(user);
 *    console.log('User is in segments:', segments);
 *    ```
 *
 * 6. Bounce Handling:
 *    ```
 *    import { bounceHandler, BounceType } from './email';
 *
 *    // Check if email can receive messages
 *    const { canSend, reason } = bounceHandler.canSendTo('user@example.com');
 *
 *    // Process a bounce event
 *    await bounceHandler.processBounce({
 *      email: 'invalid@example.com',
 *      type: BounceType.HARD,
 *      reason: 'Mailbox not found',
 *      timestamp: new Date()
 *    });
 *    ```
 *
 * 7. Email Tracking:
 *    ```
 *    import { trackingService } from './email';
 *
 *    // Add tracking to email HTML
 *    const trackedHtml = trackingService.processEmailLinks(
 *      htmlContent,
 *      'email_log_123',
 *      'campaign_welcome',
 *      'user123'
 *    );
 *
 *    // Add tracking pixel
 *    const pixel = trackingService.generateTrackingPixel({
 *      emailLogId: 'email_log_123',
 *      campaignId: 'campaign_welcome',
 *      userId: 'user123',
 *      email: 'user@example.com'
 *    });
 *
 *    const finalHtml = trackedHtml + pixel;
 *
 *    // Get campaign stats
 *    const stats = trackingService.getStats('campaign_welcome', 'week');
 *    ```
 *
 * 8. Use Mailgun as alternative provider:
 *    ```
 *    import { mailgunService } from './email';
 *
 *    await mailgunService.send({
 *      to: 'user@example.com',
 *      subject: 'Hello from Mailgun',
 *      html: '<h1>Welcome!</h1>',
 *      tags: ['welcome', 'campaign']
 *    });
 *
 *    // Validate email address
 *    const validation = await mailgunService.validateEmail('user@example.com');
 *    if (!validation.isValid) {
 *      console.log('Invalid email:', validation.reason);
 *    }
 *    ```
 */

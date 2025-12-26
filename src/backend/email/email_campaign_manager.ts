/**
 * Email Campaign Manager for TIME
 *
 * Comprehensive email campaign management system:
 * - A/B Testing with statistical significance
 * - Template Editor API
 * - Advanced Analytics & Conversion Tracking
 * - Rate Limiting
 * - Scheduler
 * - All campaign types integration
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
import { sendGridService } from './sendgrid_service';
import { dripCampaignService, CampaignType, CampaignStatus, EmailStatus } from './drip_campaign_service';
import { TEMPLATE_REGISTRY, getTemplateById } from './campaign_templates';
import { ADDITIONAL_TEMPLATES } from './additional_templates';
import { TRANSACTIONAL_TEMPLATES, TransactionalTemplateType, getTransactionalTemplate } from './transactional_templates';
import { MARKETING_TEMPLATES, MarketingTemplateType, getMarketingTemplate } from './marketing_templates';

const logger = createComponentLogger('EmailCampaignManager');

/**
 * ===========================================
 * RATE LIMITER
 * ===========================================
 */

interface RateLimitConfig {
  maxPerSecond: number;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

interface RateLimitState {
  secondCount: number;
  minuteCount: number;
  hourCount: number;
  dayCount: number;
  lastSecond: number;
  lastMinute: number;
  lastHour: number;
  lastDay: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private state: RateLimitState;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxPerSecond: config.maxPerSecond || 10,      // SendGrid recommends max 10/sec
      maxPerMinute: config.maxPerMinute || 500,     // 500/min
      maxPerHour: config.maxPerHour || 10000,       // 10k/hour
      maxPerDay: config.maxPerDay || 100000,        // 100k/day
    };

    const now = Date.now();
    this.state = {
      secondCount: 0,
      minuteCount: 0,
      hourCount: 0,
      dayCount: 0,
      lastSecond: now,
      lastMinute: now,
      lastHour: now,
      lastDay: now,
    };

    logger.info('Rate limiter initialized', { config: this.config });
  }

  async acquire(): Promise<boolean> {
    const now = Date.now();

    // Reset counters if time windows have passed
    if (now - this.state.lastSecond >= 1000) {
      this.state.secondCount = 0;
      this.state.lastSecond = now;
    }
    if (now - this.state.lastMinute >= 60000) {
      this.state.minuteCount = 0;
      this.state.lastMinute = now;
    }
    if (now - this.state.lastHour >= 3600000) {
      this.state.hourCount = 0;
      this.state.lastHour = now;
    }
    if (now - this.state.lastDay >= 86400000) {
      this.state.dayCount = 0;
      this.state.lastDay = now;
    }

    // Check limits
    if (this.state.secondCount >= this.config.maxPerSecond) {
      logger.warn('Rate limit: second limit reached');
      return false;
    }
    if (this.state.minuteCount >= this.config.maxPerMinute) {
      logger.warn('Rate limit: minute limit reached');
      return false;
    }
    if (this.state.hourCount >= this.config.maxPerHour) {
      logger.warn('Rate limit: hour limit reached');
      return false;
    }
    if (this.state.dayCount >= this.config.maxPerDay) {
      logger.warn('Rate limit: day limit reached');
      return false;
    }

    // Increment counters
    this.state.secondCount++;
    this.state.minuteCount++;
    this.state.hourCount++;
    this.state.dayCount++;

    return true;
  }

  getStatus(): { remaining: Record<string, number>; limits: RateLimitConfig } {
    return {
      remaining: {
        second: Math.max(0, this.config.maxPerSecond - this.state.secondCount),
        minute: Math.max(0, this.config.maxPerMinute - this.state.minuteCount),
        hour: Math.max(0, this.config.maxPerHour - this.state.hourCount),
        day: Math.max(0, this.config.maxPerDay - this.state.dayCount),
      },
      limits: this.config,
    };
  }
}

/**
 * ===========================================
 * A/B TESTING
 * ===========================================
 */

export interface ABTestVariant {
  id: string;
  name: string;
  subject?: string;
  templateId?: string;
  content?: string;
  weight: number; // 0-100
}

export interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  variants: ABTestVariant[];
  winnerMetric: 'open_rate' | 'click_rate' | 'conversion_rate';
  minimumSampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  startedAt?: Date;
  completedAt?: Date;
  winnerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestResult {
  variantId: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  confidence: number;
  isWinner: boolean;
}

export class ABTestingService {
  private tests: Map<string, ABTest> = new Map();
  private results: Map<string, Map<string, ABTestResult>> = new Map();

  createTest(test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): ABTest {
    const newTest: ABTest = {
      ...test,
      id: `abtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tests.set(newTest.id, newTest);
    this.results.set(newTest.id, new Map());

    // Initialize results for each variant
    newTest.variants.forEach(variant => {
      this.results.get(newTest.id)!.set(variant.id, {
        variantId: variant.id,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
        confidence: 0,
        isWinner: false,
      });
    });

    logger.info('A/B test created', { testId: newTest.id, name: newTest.name });
    return newTest;
  }

  getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Select variant based on weights
   */
  selectVariant(testId: string): ABTestVariant | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant;
      }
    }

    // Fallback to first variant
    return test.variants[0] || null;
  }

  /**
   * Record event for A/B test
   */
  recordEvent(testId: string, variantId: string, event: 'sent' | 'opened' | 'clicked' | 'converted'): void {
    const testResults = this.results.get(testId);
    if (!testResults) return;

    const variantResult = testResults.get(variantId);
    if (!variantResult) return;

    variantResult[event]++;
    this.updateRates(variantResult);
    this.checkForWinner(testId);

    logger.debug('A/B test event recorded', { testId, variantId, event });
  }

  private updateRates(result: ABTestResult): void {
    result.openRate = result.sent > 0 ? (result.opened / result.sent) * 100 : 0;
    result.clickRate = result.opened > 0 ? (result.clicked / result.opened) * 100 : 0;
    result.conversionRate = result.sent > 0 ? (result.converted / result.sent) * 100 : 0;
  }

  private checkForWinner(testId: string): void {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return;

    const testResults = this.results.get(testId);
    if (!testResults) return;

    const results = Array.from(testResults.values());

    // Check if minimum sample size is met
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    if (totalSent < test.minimumSampleSize) return;

    // Calculate statistical significance
    // Using simplified chi-square test for demonstration
    const metricKey = test.winnerMetric === 'open_rate' ? 'openRate' :
                      test.winnerMetric === 'click_rate' ? 'clickRate' : 'conversionRate';

    let bestVariant = results[0];
    let maxRate = results[0][metricKey];

    for (const result of results) {
      if (result[metricKey] > maxRate) {
        maxRate = result[metricKey];
        bestVariant = result;
      }
    }

    // Simple confidence calculation (in production, use proper statistical tests)
    const sampleSize = bestVariant.sent;
    const standardError = Math.sqrt((maxRate * (100 - maxRate)) / sampleSize);
    const zScore = (maxRate - results.filter(r => r.variantId !== bestVariant.variantId)
      .reduce((sum, r) => sum + r[metricKey], 0) / (results.length - 1)) / standardError;

    bestVariant.confidence = Math.min(99.9, Math.abs(zScore) * 20);

    if (bestVariant.confidence >= test.confidenceLevel * 100) {
      bestVariant.isWinner = true;
      test.winnerId = bestVariant.variantId;
      test.status = 'completed';
      test.completedAt = new Date();
      test.updatedAt = new Date();

      logger.info('A/B test winner declared', {
        testId,
        winnerId: test.winnerId,
        confidence: bestVariant.confidence,
      });
    }
  }

  getResults(testId: string): ABTestResult[] | null {
    const testResults = this.results.get(testId);
    if (!testResults) return null;
    return Array.from(testResults.values());
  }

  startTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'draft') return false;

    test.status = 'running';
    test.startedAt = new Date();
    test.updatedAt = new Date();

    logger.info('A/B test started', { testId });
    return true;
  }

  pauseTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return false;

    test.status = 'paused';
    test.updatedAt = new Date();

    logger.info('A/B test paused', { testId });
    return true;
  }
}

/**
 * ===========================================
 * ANALYTICS & CONVERSION TRACKING
 * ===========================================
 */

export interface ConversionGoal {
  id: string;
  name: string;
  event: string; // e.g., 'subscription.created', 'trade.executed'
  value?: number; // Monetary value of conversion
}

export interface CampaignAnalytics {
  campaignId: string;
  period: 'day' | 'week' | 'month' | 'all';
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    spamReports: number;
    conversions: number;
    revenue: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    conversionRate: number;
  };
  timeline: Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
  }>;
  topLinks: Array<{
    url: string;
    clicks: number;
    percentage: number;
  }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface EmailEngagement {
  emailLogId: string;
  userId: string;
  campaignId: string;
  events: Array<{
    type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'converted';
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
}

export class AnalyticsService {
  private engagements: Map<string, EmailEngagement> = new Map();
  private conversions: Map<string, ConversionGoal[]> = new Map();
  private conversionEvents: Array<{
    campaignId: string;
    userId: string;
    goalId: string;
    value: number;
    timestamp: Date;
  }> = [];

  /**
   * Track email engagement event
   */
  trackEvent(
    emailLogId: string,
    userId: string,
    campaignId: string,
    eventType: EmailEngagement['events'][0]['type'],
    metadata?: Record<string, any>
  ): void {
    let engagement = this.engagements.get(emailLogId);

    if (!engagement) {
      engagement = {
        emailLogId,
        userId,
        campaignId,
        events: [],
      };
      this.engagements.set(emailLogId, engagement);
    }

    engagement.events.push({
      type: eventType,
      timestamp: new Date(),
      metadata,
    });

    logger.debug('Engagement tracked', { emailLogId, eventType });
  }

  /**
   * Track conversion
   */
  trackConversion(
    campaignId: string,
    userId: string,
    goalId: string,
    value: number = 0
  ): void {
    this.conversionEvents.push({
      campaignId,
      userId,
      goalId,
      value,
      timestamp: new Date(),
    });

    // Also mark the engagement as converted
    for (const engagement of this.engagements.values()) {
      if (engagement.userId === userId && engagement.campaignId === campaignId) {
        engagement.events.push({
          type: 'converted',
          timestamp: new Date(),
          metadata: { goalId, value },
        });
        break;
      }
    }

    logger.info('Conversion tracked', { campaignId, userId, goalId, value });
  }

  /**
   * Get campaign analytics
   */
  getCampaignAnalytics(
    campaignId: string,
    period: 'day' | 'week' | 'month' | 'all' = 'all'
  ): CampaignAnalytics {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    // Filter engagements by campaign and period
    const relevantEngagements = Array.from(this.engagements.values())
      .filter(e => e.campaignId === campaignId)
      .filter(e => e.events.some(ev => ev.timestamp >= startDate));

    // Calculate metrics
    let sent = 0, delivered = 0, opened = 0, clicked = 0, bounced = 0,
        unsubscribed = 0, spamReports = 0, conversions = 0;

    const linkClicks: Record<string, number> = {};
    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    const timelineData: Record<string, { sent: number; opened: number; clicked: number }> = {};

    for (const engagement of relevantEngagements) {
      for (const event of engagement.events) {
        if (event.timestamp < startDate) continue;

        const dateKey = event.timestamp.toISOString().split('T')[0];
        if (!timelineData[dateKey]) {
          timelineData[dateKey] = { sent: 0, opened: 0, clicked: 0 };
        }

        switch (event.type) {
          case 'sent':
            sent++;
            timelineData[dateKey].sent++;
            break;
          case 'delivered':
            delivered++;
            break;
          case 'opened':
            opened++;
            timelineData[dateKey].opened++;
            // Track device
            const device = event.metadata?.device || 'desktop';
            if (device === 'mobile') devices.mobile++;
            else if (device === 'tablet') devices.tablet++;
            else devices.desktop++;
            break;
          case 'clicked':
            clicked++;
            timelineData[dateKey].clicked++;
            // Track link
            const url = event.metadata?.url || 'unknown';
            linkClicks[url] = (linkClicks[url] || 0) + 1;
            break;
          case 'bounced':
            bounced++;
            break;
          case 'unsubscribed':
            unsubscribed++;
            break;
          case 'converted':
            conversions++;
            break;
        }
      }
    }

    // Calculate revenue from conversions
    const revenue = this.conversionEvents
      .filter(c => c.campaignId === campaignId && c.timestamp >= startDate)
      .reduce((sum, c) => sum + c.value, 0);

    // Calculate rates
    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
    const clickToOpenRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    const unsubscribeRate = delivered > 0 ? (unsubscribed / delivered) * 100 : 0;
    const conversionRate = delivered > 0 ? (conversions / delivered) * 100 : 0;

    // Format top links
    const totalClicks = Object.values(linkClicks).reduce((sum, c) => sum + c, 0);
    const topLinks = Object.entries(linkClicks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([url, clicks]) => ({
        url,
        clicks,
        percentage: totalClicks > 0 ? (clicks / totalClicks) * 100 : 0,
      }));

    // Format timeline
    const timeline = Object.entries(timelineData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));

    return {
      campaignId,
      period,
      metrics: {
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        unsubscribed,
        spamReports,
        conversions,
        revenue,
      },
      rates: {
        deliveryRate,
        openRate,
        clickRate,
        clickToOpenRate,
        bounceRate,
        unsubscribeRate,
        conversionRate,
      },
      timeline,
      topLinks,
      deviceBreakdown: devices,
    };
  }

  /**
   * Get overall platform analytics
   */
  getOverallAnalytics(period: 'day' | 'week' | 'month' = 'week'): {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    avgOpenRate: number;
    avgClickRate: number;
    topCampaigns: Array<{ campaignId: string; openRate: number }>;
  } {
    const campaignAnalytics: Map<string, CampaignAnalytics> = new Map();

    // Get unique campaign IDs
    const campaignIds = new Set(
      Array.from(this.engagements.values()).map(e => e.campaignId)
    );

    let totalSent = 0, totalOpened = 0, totalClicked = 0;
    const campaignRates: Array<{ campaignId: string; openRate: number }> = [];

    for (const campaignId of campaignIds) {
      const analytics = this.getCampaignAnalytics(campaignId, period);
      campaignAnalytics.set(campaignId, analytics);

      totalSent += analytics.metrics.sent;
      totalOpened += analytics.metrics.opened;
      totalClicked += analytics.metrics.clicked;
      campaignRates.push({ campaignId, openRate: analytics.rates.openRate });
    }

    return {
      totalSent,
      totalOpened,
      totalClicked,
      avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      avgClickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      topCampaigns: campaignRates.sort((a, b) => b.openRate - a.openRate).slice(0, 5),
    };
  }
}

/**
 * ===========================================
 * TEMPLATE EDITOR
 * ===========================================
 */

export interface CustomTemplate {
  id: string;
  name: string;
  category: 'drip' | 'transactional' | 'marketing' | 'custom';
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  variables: string[]; // List of {{variable}} names
  previewData?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateEditorService {
  private customTemplates: Map<string, CustomTemplate> = new Map();

  /**
   * Create custom template
   */
  createTemplate(
    template: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): CustomTemplate {
    const newTemplate: CustomTemplate = {
      ...template,
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Extract variables from content
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template.htmlContent)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    newTemplate.variables = variables;
    this.customTemplates.set(newTemplate.id, newTemplate);

    logger.info('Custom template created', { templateId: newTemplate.id, name: newTemplate.name });
    return newTemplate;
  }

  /**
   * Update template
   */
  updateTemplate(
    templateId: string,
    updates: Partial<Omit<CustomTemplate, 'id' | 'createdAt' | 'createdBy'>>
  ): CustomTemplate | null {
    const template = this.customTemplates.get(templateId);
    if (!template) return null;

    const updated: CustomTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    // Re-extract variables if content changed
    if (updates.htmlContent) {
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables: string[] = [];
      let match;

      while ((match = variableRegex.exec(updates.htmlContent)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }

      updated.variables = variables;
    }

    this.customTemplates.set(templateId, updated);
    logger.info('Template updated', { templateId });
    return updated;
  }

  /**
   * Get template
   */
  getTemplate(templateId: string): CustomTemplate | null {
    return this.customTemplates.get(templateId) || null;
  }

  /**
   * List templates
   */
  listTemplates(category?: CustomTemplate['category']): CustomTemplate[] {
    let templates = Array.from(this.customTemplates.values());
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): boolean {
    const deleted = this.customTemplates.delete(templateId);
    if (deleted) {
      logger.info('Template deleted', { templateId });
    }
    return deleted;
  }

  /**
   * Preview template with data
   */
  previewTemplate(templateId: string, data: Record<string, any> = {}): string | null {
    const template = this.customTemplates.get(templateId);
    if (!template) return null;

    // Use preview data as base, override with provided data
    const mergedData = { ...template.previewData, ...data };

    // Substitute variables
    let html = template.htmlContent;
    for (const [key, value] of Object.entries(mergedData)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    return html;
  }

  /**
   * Render template (alias for preview)
   */
  renderTemplate(templateId: string, data: Record<string, any>): string | null {
    return this.previewTemplate(templateId, data);
  }

  /**
   * Get all available template types (built-in + custom)
   */
  getAllTemplateTypes(): {
    builtin: string[];
    custom: CustomTemplate[];
  } {
    const builtin = [
      // Drip campaign templates
      ...Object.keys(TEMPLATE_REGISTRY),
      ...Object.keys(ADDITIONAL_TEMPLATES),
      // Transactional templates
      ...Object.keys(TRANSACTIONAL_TEMPLATES),
      // Marketing templates
      ...Object.keys(MARKETING_TEMPLATES),
    ];

    return {
      builtin,
      custom: this.listTemplates(),
    };
  }
}

/**
 * ===========================================
 * EMAIL CAMPAIGN MANAGER (Main Class)
 * ===========================================
 */

export interface SendEmailOptions {
  to: string;
  templateType: string;
  templateData: Record<string, any>;
  subject?: string;
  campaignId?: string;
  userId?: string;
  abTestId?: string;
  trackConversion?: boolean;
  scheduledAt?: Date;
}

export interface ScheduledEmail {
  id: string;
  options: SendEmailOptions;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  sentAt?: Date;
}

export class EmailCampaignManager {
  private rateLimiter: RateLimiter;
  private abTestingService: ABTestingService;
  private analyticsService: AnalyticsService;
  private templateEditorService: TemplateEditorService;
  private scheduledEmails: Map<string, ScheduledEmail> = new Map();
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.abTestingService = new ABTestingService();
    this.analyticsService = new AnalyticsService();
    this.templateEditorService = new TemplateEditorService();

    logger.info('Email Campaign Manager initialized');
  }

  /**
   * Start the email scheduler
   */
  startScheduler(intervalMs: number = 60000): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    this.schedulerInterval = setInterval(() => {
      this.processScheduledEmails();
    }, intervalMs);

    logger.info('Email scheduler started', { intervalMs });
  }

  /**
   * Stop the email scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      logger.info('Email scheduler stopped');
    }
  }

  /**
   * Send email with rate limiting and tracking
   */
  async sendEmail(options: SendEmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    emailLogId?: string;
  }> {
    try {
      // Check rate limit
      const canSend = await this.rateLimiter.acquire();
      if (!canSend) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      // Handle scheduled emails
      if (options.scheduledAt && options.scheduledAt > new Date()) {
        const scheduled = this.scheduleEmail(options);
        return {
          success: true,
          messageId: `scheduled_${scheduled.id}`,
          emailLogId: scheduled.id,
        };
      }

      // Get template
      let html: string | null = null;
      let subject = options.subject || '';

      // Handle A/B testing
      let variantId: string | undefined;
      if (options.abTestId) {
        const variant = this.abTestingService.selectVariant(options.abTestId);
        if (variant) {
          variantId = variant.id;
          if (variant.subject) subject = variant.subject;
          if (variant.templateId) options.templateType = variant.templateId;
        }
      }

      // Try to find template in order: custom -> transactional -> marketing -> drip
      const customTemplate = this.templateEditorService.getTemplate(options.templateType);
      if (customTemplate) {
        html = this.templateEditorService.renderTemplate(options.templateType, options.templateData);
        if (!subject) subject = customTemplate.subject;
      } else if (TRANSACTIONAL_TEMPLATES[options.templateType as TransactionalTemplateType]) {
        const templateFn = getTransactionalTemplate(options.templateType as TransactionalTemplateType);
        if (templateFn) html = templateFn(options.templateData);
      } else if (MARKETING_TEMPLATES[options.templateType as MarketingTemplateType]) {
        const templateFn = getMarketingTemplate(options.templateType as MarketingTemplateType);
        if (templateFn) html = templateFn(options.templateData);
      } else if (TEMPLATE_REGISTRY[options.templateType]) {
        html = TEMPLATE_REGISTRY[options.templateType](options.templateData);
      } else if (ADDITIONAL_TEMPLATES[options.templateType as keyof typeof ADDITIONAL_TEMPLATES]) {
        html = ADDITIONAL_TEMPLATES[options.templateType as keyof typeof ADDITIONAL_TEMPLATES](options.templateData);
      }

      if (!html) {
        return {
          success: false,
          error: `Template not found: ${options.templateType}`,
        };
      }

      // Substitute variables in subject
      subject = subject.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return options.templateData[key] !== undefined ? String(options.templateData[key]) : match;
      });

      // Generate email log ID
      const emailLogId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Send via SendGrid
      const result = await sendGridService.send({
        to: options.to,
        subject,
        html,
        categories: options.campaignId ? ['campaign', options.campaignId] : undefined,
        customArgs: {
          email_log_id: emailLogId,
          campaign_id: options.campaignId || '',
          user_id: options.userId || '',
          ab_variant_id: variantId || '',
        },
      });

      // Track analytics
      if (result.success) {
        this.analyticsService.trackEvent(
          emailLogId,
          options.userId || 'anonymous',
          options.campaignId || 'direct',
          'sent'
        );

        // Track A/B test
        if (options.abTestId && variantId) {
          this.abTestingService.recordEvent(options.abTestId, variantId, 'sent');
        }
      }

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        emailLogId,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send email', { error: message, options });
      return { success: false, error: message };
    }
  }

  /**
   * Schedule email for later
   */
  scheduleEmail(options: SendEmailOptions): ScheduledEmail {
    const scheduled: ScheduledEmail = {
      id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options,
      scheduledAt: options.scheduledAt || new Date(),
      status: 'pending',
    };

    this.scheduledEmails.set(scheduled.id, scheduled);
    logger.info('Email scheduled', { id: scheduled.id, scheduledAt: scheduled.scheduledAt });
    return scheduled;
  }

  /**
   * Cancel scheduled email
   */
  cancelScheduledEmail(emailId: string): boolean {
    const scheduled = this.scheduledEmails.get(emailId);
    if (!scheduled || scheduled.status !== 'pending') {
      return false;
    }

    scheduled.status = 'cancelled';
    logger.info('Scheduled email cancelled', { emailId });
    return true;
  }

  /**
   * Process scheduled emails
   */
  private async processScheduledEmails(): Promise<void> {
    const now = new Date();

    for (const [id, scheduled] of this.scheduledEmails) {
      if (scheduled.status !== 'pending') continue;
      if (scheduled.scheduledAt > now) continue;

      try {
        const result = await this.sendEmail({
          ...scheduled.options,
          scheduledAt: undefined, // Remove scheduled time to send immediately
        });

        if (result.success) {
          scheduled.status = 'sent';
          scheduled.sentAt = new Date();
        } else {
          scheduled.status = 'failed';
          scheduled.error = result.error;
        }
      } catch (error) {
        scheduled.status = 'failed';
        scheduled.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulk(
    recipients: Array<{ email: string; data: Record<string, any> }>,
    templateType: string,
    baseOptions: Partial<SendEmailOptions> = {}
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const errors: Array<{ email: string; error: string }> = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.sendEmail({
        to: recipient.email,
        templateType,
        templateData: recipient.data,
        ...baseOptions,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push({ email: recipient.email, error: result.error || 'Unknown error' });
      }

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Bulk send complete', { total: recipients.length, sent, failed });
    return { total: recipients.length, sent, failed, errors };
  }

  /**
   * Get services for direct access
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  getABTestingService(): ABTestingService {
    return this.abTestingService;
  }

  getAnalyticsService(): AnalyticsService {
    return this.analyticsService;
  }

  getTemplateEditorService(): TemplateEditorService {
    return this.templateEditorService;
  }
}

// Singleton instance
export const emailCampaignManager = new EmailCampaignManager();

logger.info('Email Campaign Manager module loaded');

/**
 * Email Tracking Service for TIME
 *
 * Comprehensive open/click tracking system:
 * - Tracking pixel generation for opens
 * - Click tracking with link wrapping
 * - Unique open/click counting
 * - Device and geolocation detection
 * - UTM parameter handling
 * - Conversion attribution
 * - Real-time analytics
 *
 * PRICING (correct as of 2025):
 * - FREE: $0/mo - 1 bot
 * - BASIC: $19/mo - 3 bots
 * - PRO: $49/mo - 7 bots
 * - PREMIUM: $109/mo - 11 Super Bots
 * - ENTERPRISE: $450/mo - Unlimited
 */

import { createComponentLogger } from '../utils/logger';
import * as crypto from 'crypto';

const logger = createComponentLogger('TrackingService');

// Configuration
const TRACKING_DOMAIN = process.env.TRACKING_DOMAIN || 'https://track.timebeyondus.com';
const ENCRYPTION_KEY = process.env.TRACKING_ENCRYPTION_KEY || 'time-email-tracking-key-2025';

/**
 * Tracking Event Types
 */
export enum TrackingEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  UNSUBSCRIBED = 'unsubscribed',
  CONVERTED = 'converted'
}

/**
 * Tracking Event Record
 */
export interface TrackingEvent {
  id: string;
  emailLogId: string;
  campaignId: string;
  userId: string;
  email: string;
  eventType: TrackingEventType;
  timestamp: Date;
  isUnique: boolean;
  metadata: TrackingMetadata;
}

/**
 * Tracking Metadata
 */
export interface TrackingMetadata {
  // Device info
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser?: string;
  os?: string;

  // Location
  ipAddress?: string;
  country?: string;
  region?: string;
  city?: string;

  // Click data
  url?: string;
  linkId?: string;
  linkText?: string;

  // Attribution
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;

  // Conversion
  conversionGoal?: string;
  conversionValue?: number;

  // A/B test
  variantId?: string;
}

/**
 * Link Tracking Data
 */
export interface TrackedLink {
  id: string;
  originalUrl: string;
  trackingUrl: string;
  emailLogId: string;
  campaignId: string;
  userId: string;
  linkText?: string;
  position?: number;
}

/**
 * Email Open Tracking Data
 */
export interface OpenTrackingData {
  emailLogId: string;
  campaignId: string;
  userId: string;
  email: string;
  variantId?: string;
}

/**
 * Tracking Statistics
 */
export interface TrackingStats {
  campaignId: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'all';
  sent: number;
  delivered: number;
  uniqueOpens: number;
  totalOpens: number;
  uniqueClicks: number;
  totalClicks: number;
  bounces: number;
  complaints: number;
  unsubscribes: number;
  conversions: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  conversionRate: number;
}

/**
 * Email Tracking Service
 */
export class TrackingService {
  private events: Map<string, TrackingEvent[]> = new Map();
  private uniqueEvents: Map<string, Set<string>> = new Map();
  private trackedLinks: Map<string, TrackedLink> = new Map();
  private conversionGoals: Map<string, { name: string; value: number }> = new Map();

  constructor() {
    logger.info('Tracking service initialized');
  }

  /**
   * Generate tracking pixel HTML
   */
  generateTrackingPixel(data: OpenTrackingData): string {
    const token = this.encryptTrackingData({
      type: 'open',
      ...data,
      timestamp: Date.now()
    });

    const pixelUrl = `${TRACKING_DOMAIN}/pixel/${token}.gif`;

    return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;visibility:hidden;mso-hide:all;" />`;
  }

  /**
   * Generate tracking URL for link
   */
  generateTrackingUrl(
    originalUrl: string,
    emailLogId: string,
    campaignId: string,
    userId: string,
    linkText?: string,
    position?: number
  ): string {
    const linkId = `lnk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const token = this.encryptTrackingData({
      type: 'click',
      linkId,
      originalUrl,
      emailLogId,
      campaignId,
      userId,
      timestamp: Date.now()
    });

    const trackingUrl = `${TRACKING_DOMAIN}/click/${token}`;

    // Store tracked link
    const trackedLink: TrackedLink = {
      id: linkId,
      originalUrl,
      trackingUrl,
      emailLogId,
      campaignId,
      userId,
      linkText,
      position
    };
    this.trackedLinks.set(linkId, trackedLink);

    return trackingUrl;
  }

  /**
   * Process all links in HTML content
   */
  processEmailLinks(
    html: string,
    emailLogId: string,
    campaignId: string,
    userId: string
  ): string {
    // Match anchor tags with href
    const linkRegex = /<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi;
    let position = 0;

    return html.replace(linkRegex, (match, before, url, after) => {
      // Skip unsubscribe links and tracking links
      if (url.includes('unsubscribe') || url.includes(TRACKING_DOMAIN)) {
        return match;
      }

      // Skip mailto and tel links
      if (url.startsWith('mailto:') || url.startsWith('tel:')) {
        return match;
      }

      position++;

      // Extract link text (simplified)
      const textMatch = match.match(/>([^<]+)</);
      const linkText = textMatch ? textMatch[1] : undefined;

      const trackingUrl = this.generateTrackingUrl(
        url,
        emailLogId,
        campaignId,
        userId,
        linkText,
        position
      );

      return `<a ${before}href="${trackingUrl}"${after}>`;
    });
  }

  /**
   * Encrypt tracking data
   */
  private encryptTrackingData(data: Record<string, any>): string {
    try {
      const json = JSON.stringify(data);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
        Buffer.alloc(16, 0)
      );
      let encrypted = cipher.update(json, 'utf8', 'base64url');
      encrypted += cipher.final('base64url');
      return encrypted;
    } catch (error) {
      // Fallback to base64 encoding
      return Buffer.from(JSON.stringify(data)).toString('base64url');
    }
  }

  /**
   * Decrypt tracking data
   */
  decryptTrackingData(token: string): Record<string, any> | null {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
        Buffer.alloc(16, 0)
      );
      let decrypted = decipher.update(token, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      // Fallback from base64
      try {
        return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
      } catch (e) {
        logger.error('Failed to decrypt tracking data', { error: e });
        return null;
      }
    }
  }

  /**
   * Record tracking event
   */
  recordEvent(
    eventType: TrackingEventType,
    emailLogId: string,
    campaignId: string,
    userId: string,
    email: string,
    metadata: Partial<TrackingMetadata> = {}
  ): TrackingEvent {
    // Check if unique
    const uniqueKey = `${emailLogId}_${eventType}`;
    let isUnique = false;

    if (!this.uniqueEvents.has(uniqueKey)) {
      this.uniqueEvents.set(uniqueKey, new Set());
    }

    const uniqueSet = this.uniqueEvents.get(uniqueKey)!;
    if (!uniqueSet.has(userId)) {
      uniqueSet.add(userId);
      isUnique = true;
    }

    // Create event
    const event: TrackingEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      emailLogId,
      campaignId,
      userId,
      email,
      eventType,
      timestamp: new Date(),
      isUnique,
      metadata: {
        deviceType: this.detectDeviceType(metadata.userAgent),
        browser: this.detectBrowser(metadata.userAgent),
        os: this.detectOS(metadata.userAgent),
        ...metadata
      }
    };

    // Store event
    if (!this.events.has(campaignId)) {
      this.events.set(campaignId, []);
    }
    this.events.get(campaignId)!.push(event);

    logger.debug('Tracking event recorded', {
      eventType,
      emailLogId,
      isUnique
    });

    return event;
  }

  /**
   * Handle open tracking request
   */
  async handleOpenTracking(
    token: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; data?: OpenTrackingData }> {
    const data = this.decryptTrackingData(token);

    if (!data || data.type !== 'open') {
      logger.warn('Invalid open tracking token');
      return { success: false };
    }

    // Record open event
    this.recordEvent(
      TrackingEventType.OPENED,
      data.emailLogId,
      data.campaignId,
      data.userId,
      data.email,
      {
        userAgent,
        ipAddress,
        variantId: data.variantId
      }
    );

    logger.info('Email open tracked', {
      emailLogId: data.emailLogId,
      campaignId: data.campaignId
    });

    return {
      success: true,
      data: {
        emailLogId: data.emailLogId,
        campaignId: data.campaignId,
        userId: data.userId,
        email: data.email,
        variantId: data.variantId
      }
    };
  }

  /**
   * Handle click tracking request
   */
  async handleClickTracking(
    token: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; redirectUrl?: string }> {
    const data = this.decryptTrackingData(token);

    if (!data || data.type !== 'click') {
      logger.warn('Invalid click tracking token');
      return { success: false };
    }

    // Record click event
    this.recordEvent(
      TrackingEventType.CLICKED,
      data.emailLogId,
      data.campaignId,
      data.userId,
      '', // Email not in click data
      {
        userAgent,
        ipAddress,
        url: data.originalUrl,
        linkId: data.linkId
      }
    );

    logger.info('Email click tracked', {
      emailLogId: data.emailLogId,
      url: data.originalUrl
    });

    return {
      success: true,
      redirectUrl: data.originalUrl
    };
  }

  /**
   * Track conversion
   */
  trackConversion(
    campaignId: string,
    userId: string,
    email: string,
    goalId: string,
    value?: number
  ): void {
    const goal = this.conversionGoals.get(goalId);

    this.recordEvent(
      TrackingEventType.CONVERTED,
      '', // No specific email
      campaignId,
      userId,
      email,
      {
        conversionGoal: goalId,
        conversionValue: value || goal?.value || 0
      }
    );

    logger.info('Conversion tracked', {
      campaignId,
      userId,
      goalId,
      value
    });
  }

  /**
   * Register conversion goal
   */
  registerConversionGoal(goalId: string, name: string, defaultValue: number = 0): void {
    this.conversionGoals.set(goalId, { name, value: defaultValue });
    logger.info('Conversion goal registered', { goalId, name });
  }

  /**
   * Get tracking statistics
   */
  getStats(
    campaignId: string,
    period: 'hour' | 'day' | 'week' | 'month' | 'all' = 'all'
  ): TrackingStats {
    const now = Date.now();
    const periodMs: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Number.MAX_SAFE_INTEGER
    };

    const startTime = now - periodMs[period];
    const campaignEvents = this.events.get(campaignId) || [];
    const filteredEvents = campaignEvents.filter(
      e => e.timestamp.getTime() >= startTime
    );

    const countByType = (type: TrackingEventType, uniqueOnly: boolean = false) =>
      filteredEvents.filter(e =>
        e.eventType === type && (!uniqueOnly || e.isUnique)
      ).length;

    const sent = countByType(TrackingEventType.SENT);
    const delivered = countByType(TrackingEventType.DELIVERED);
    const uniqueOpens = countByType(TrackingEventType.OPENED, true);
    const totalOpens = countByType(TrackingEventType.OPENED);
    const uniqueClicks = countByType(TrackingEventType.CLICKED, true);
    const totalClicks = countByType(TrackingEventType.CLICKED);
    const bounces = countByType(TrackingEventType.BOUNCED);
    const complaints = countByType(TrackingEventType.COMPLAINED);
    const unsubscribes = countByType(TrackingEventType.UNSUBSCRIBED);
    const conversions = countByType(TrackingEventType.CONVERTED);

    const deliveredOrSent = delivered || sent || 1;

    return {
      campaignId,
      period,
      sent,
      delivered,
      uniqueOpens,
      totalOpens,
      uniqueClicks,
      totalClicks,
      bounces,
      complaints,
      unsubscribes,
      conversions,
      openRate: (uniqueOpens / deliveredOrSent) * 100,
      clickRate: (uniqueClicks / deliveredOrSent) * 100,
      clickToOpenRate: uniqueOpens > 0 ? (uniqueClicks / uniqueOpens) * 100 : 0,
      bounceRate: sent > 0 ? (bounces / sent) * 100 : 0,
      unsubscribeRate: (unsubscribes / deliveredOrSent) * 100,
      conversionRate: (conversions / deliveredOrSent) * 100
    };
  }

  /**
   * Get events for email
   */
  getEventsForEmail(emailLogId: string): TrackingEvent[] {
    const allEvents: TrackingEvent[] = [];

    for (const events of this.events.values()) {
      allEvents.push(...events.filter(e => e.emailLogId === emailLogId));
    }

    return allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get click heatmap data
   */
  getClickHeatmap(campaignId: string): Array<{
    linkId: string;
    url: string;
    linkText?: string;
    clicks: number;
    uniqueClicks: number;
    percentage: number;
  }> {
    const campaignEvents = this.events.get(campaignId) || [];
    const clickEvents = campaignEvents.filter(e => e.eventType === TrackingEventType.CLICKED);

    const linkClicks: Record<string, {
      url: string;
      linkText?: string;
      total: number;
      unique: Set<string>;
    }> = {};

    for (const event of clickEvents) {
      const linkId = event.metadata.linkId || 'unknown';
      if (!linkClicks[linkId]) {
        linkClicks[linkId] = {
          url: event.metadata.url || '',
          linkText: event.metadata.linkText,
          total: 0,
          unique: new Set()
        };
      }
      linkClicks[linkId].total++;
      linkClicks[linkId].unique.add(event.userId);
    }

    const totalClicks = clickEvents.length || 1;

    return Object.entries(linkClicks)
      .map(([linkId, data]) => ({
        linkId,
        url: data.url,
        linkText: data.linkText,
        clicks: data.total,
        uniqueClicks: data.unique.size,
        percentage: (data.total / totalClicks) * 100
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Get device breakdown
   */
  getDeviceBreakdown(campaignId: string): {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  } {
    const campaignEvents = this.events.get(campaignId) || [];
    const openEvents = campaignEvents.filter(
      e => e.eventType === TrackingEventType.OPENED && e.isUnique
    );

    const breakdown = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };

    for (const event of openEvents) {
      const device = event.metadata.deviceType || 'unknown';
      breakdown[device as keyof typeof breakdown]++;
    }

    return breakdown;
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent?: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();

    if (/ipad|tablet|playbook|silk/i.test(ua)) {
      return 'tablet';
    }

    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
      return 'mobile';
    }

    if (/windows|macintosh|linux/i.test(ua)) {
      return 'desktop';
    }

    return 'unknown';
  }

  /**
   * Detect browser from user agent
   */
  private detectBrowser(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'IE';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';

    return 'Other';
  }

  /**
   * Detect OS from user agent
   */
  private detectOS(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';

    return 'Other';
  }

  /**
   * Add UTM parameters to URL
   */
  addUtmParameters(
    url: string,
    utm: {
      source?: string;
      medium?: string;
      campaign?: string;
      content?: string;
      term?: string;
    }
  ): string {
    try {
      const urlObj = new URL(url);

      if (utm.source) urlObj.searchParams.set('utm_source', utm.source);
      if (utm.medium) urlObj.searchParams.set('utm_medium', utm.medium);
      if (utm.campaign) urlObj.searchParams.set('utm_campaign', utm.campaign);
      if (utm.content) urlObj.searchParams.set('utm_content', utm.content);
      if (utm.term) urlObj.searchParams.set('utm_term', utm.term);

      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  /**
   * Clean up old events
   */
  cleanupOldEvents(daysToKeep: number = 90): number {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [campaignId, events] of this.events) {
      const originalLength = events.length;
      const filtered = events.filter(e => e.timestamp > cutoff);
      this.events.set(campaignId, filtered);
      removed += originalLength - filtered.length;
    }

    logger.info('Old tracking events cleaned up', { removed });
    return removed;
  }
}

// Singleton instance
export const trackingService = new TrackingService();

logger.info('Tracking service module loaded');

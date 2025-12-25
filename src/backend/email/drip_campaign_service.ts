/**
 * Email Drip Campaign Service for TIME
 *
 * Features:
 * - Automated email sequences based on user triggers
 * - Campaign types: WELCOME_SERIES, UPGRADE_NUDGE, INACTIVE_USER, FEATURE_EDUCATION
 * - Email scheduling and tracking (opens, clicks, conversions)
 * - A/B testing support
 * - Unsubscribe management
 * - Production-ready with error handling and logging
 */

import { createComponentLogger } from '../utils/logger';
import { emailService } from '../notifications/email_service';
import { prisma } from '../database/client';

const logger = createComponentLogger('DripCampaignService');

export enum CampaignType {
  WELCOME_SERIES = 'WELCOME_SERIES',
  UPGRADE_NUDGE = 'UPGRADE_NUDGE',
  INACTIVE_USER = 'INACTIVE_USER',
  FEATURE_EDUCATION = 'FEATURE_EDUCATION'
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum EmailStatus {
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  BOUNCED = 'BOUNCED',
  FAILED = 'FAILED'
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description?: string;
  emails: CampaignEmail[];
  trigger: CampaignTrigger;
  abTest?: ABTestConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignEmail {
  id: string;
  campaignId: string;
  sequenceNumber: number;
  delayDays: number;
  subject: string;
  templateId: string;
  variantA?: EmailVariant;
  variantB?: EmailVariant;
  status: CampaignStatus;
}

export interface EmailVariant {
  subject: string;
  content: string;
  weight: number; // 0-100 for A/B testing
}

export interface CampaignTrigger {
  event: 'signup' | 'inactivity' | 'trial_ending' | 'bot_created' | 'trade_executed' | 'manual';
  conditions?: Record<string, any>;
  delayMinutes?: number;
}

export interface ABTestConfig {
  enabled: boolean;
  variantAWeight: number;
  variantBWeight: number;
  winnerMetric: 'open_rate' | 'click_rate' | 'conversion_rate';
}

export interface EmailLog {
  id: string;
  campaignId: string;
  emailId: string;
  userId: string;
  userEmail: string;
  variant?: 'A' | 'B';
  status: EmailStatus;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  unsubscribedAt?: Date;
  metadata?: Record<string, any>;
}

export interface CampaignStats {
  campaignId: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  variantAStats?: VariantStats;
  variantBStats?: VariantStats;
}

export interface VariantStats {
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

export class DripCampaignService {
  private campaigns: Map<string, Campaign> = new Map();
  private emailLogs: EmailLog[] = [];
  private unsubscribed: Set<string> = new Set();

  constructor() {
    logger.info('Drip Campaign Service initialized');
  }

  /**
   * Create a new campaign
   */
  async createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    try {
      const newCampaign: Campaign = {
        ...campaign,
        id: `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.campaigns.set(newCampaign.id, newCampaign);

      logger.info('Campaign created', {
        campaignId: newCampaign.id,
        name: newCampaign.name,
        type: newCampaign.type,
        emailCount: newCampaign.emails.length
      });

      return newCampaign;
    } catch (error) {
      logger.error('Failed to create campaign', { error });
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  getCampaign(campaignId: string): Campaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * List all campaigns
   */
  listCampaigns(filters?: {
    type?: CampaignType;
    status?: CampaignStatus;
  }): Campaign[] {
    let campaigns = Array.from(this.campaigns.values());

    if (filters?.type) {
      campaigns = campaigns.filter(c => c.type === filters.type);
    }

    if (filters?.status) {
      campaigns = campaigns.filter(c => c.status === filters.status);
    }

    return campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<Omit<Campaign, 'id' | 'createdAt'>>
  ): Promise<Campaign | null> {
    try {
      const campaign = this.campaigns.get(campaignId);
      if (!campaign) {
        logger.warn('Campaign not found for update', { campaignId });
        return null;
      }

      const updated: Campaign = {
        ...campaign,
        ...updates,
        updatedAt: new Date()
      };

      this.campaigns.set(campaignId, updated);

      logger.info('Campaign updated', { campaignId, updates: Object.keys(updates) });

      return updated;
    } catch (error) {
      logger.error('Failed to update campaign', { error, campaignId });
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      const deleted = this.campaigns.delete(campaignId);

      if (deleted) {
        logger.info('Campaign deleted', { campaignId });
      } else {
        logger.warn('Campaign not found for deletion', { campaignId });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete campaign', { error, campaignId });
      throw error;
    }
  }

  /**
   * Trigger campaign for a user
   */
  async triggerCampaign(
    campaignId: string,
    userId: string,
    userEmail: string,
    userData: Record<string, any> = {}
  ): Promise<void> {
    try {
      const campaign = this.campaigns.get(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      if (campaign.status !== CampaignStatus.ACTIVE) {
        logger.warn('Cannot trigger inactive campaign', { campaignId, status: campaign.status });
        return;
      }

      // Check if user is unsubscribed
      if (this.unsubscribed.has(userEmail)) {
        logger.info('User is unsubscribed, skipping campaign', { userEmail, campaignId });
        return;
      }

      logger.info('Triggering campaign for user', {
        campaignId,
        userId,
        emailCount: campaign.emails.length
      });

      // Schedule all emails in the campaign
      for (const email of campaign.emails) {
        await this.scheduleEmail(campaign, email, userId, userEmail, userData);
      }

    } catch (error) {
      logger.error('Failed to trigger campaign', { error, campaignId, userId });
      throw error;
    }
  }

  /**
   * Schedule individual email
   */
  private async scheduleEmail(
    campaign: Campaign,
    email: CampaignEmail,
    userId: string,
    userEmail: string,
    userData: Record<string, any>
  ): Promise<void> {
    try {
      // Calculate send time based on delay
      const sendAt = new Date();
      sendAt.setDate(sendAt.getDate() + email.delayDays);

      // Determine variant for A/B testing
      let variant: 'A' | 'B' | undefined;
      let subject = email.subject;

      if (campaign.abTest?.enabled && email.variantA && email.variantB) {
        const random = Math.random() * 100;
        variant = random < (campaign.abTest.variantAWeight || 50) ? 'A' : 'B';
        subject = variant === 'A' ? email.variantA.subject : email.variantB.subject;
      }

      // Create email log
      const emailLog: EmailLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId: campaign.id,
        emailId: email.id,
        userId,
        userEmail,
        variant,
        status: EmailStatus.SCHEDULED,
        metadata: {
          sendAt: sendAt.toISOString(),
          userData,
          sequenceNumber: email.sequenceNumber
        }
      };

      this.emailLogs.push(emailLog);

      // If delay is 0, send immediately
      if (email.delayDays === 0) {
        await this.sendScheduledEmail(emailLog.id);
      } else {
        // In production, use a job queue (Bull, BullMQ, etc.)
        logger.info('Email scheduled', {
          emailLogId: emailLog.id,
          sendAt: sendAt.toISOString(),
          delayDays: email.delayDays
        });
      }

    } catch (error) {
      logger.error('Failed to schedule email', { error, campaignId: campaign.id, emailId: email.id });
      throw error;
    }
  }

  /**
   * Send scheduled email
   */
  async sendScheduledEmail(emailLogId: string): Promise<void> {
    try {
      const emailLog = this.emailLogs.find(log => log.id === emailLogId);
      if (!emailLog) {
        throw new Error(`Email log ${emailLogId} not found`);
      }

      if (emailLog.status !== EmailStatus.SCHEDULED) {
        logger.warn('Email already processed', { emailLogId, status: emailLog.status });
        return;
      }

      // Check if user is unsubscribed
      if (this.unsubscribed.has(emailLog.userEmail)) {
        emailLog.status = EmailStatus.FAILED;
        emailLog.metadata = { ...emailLog.metadata, reason: 'User unsubscribed' };
        logger.info('Email not sent - user unsubscribed', { emailLogId });
        return;
      }

      const campaign = this.campaigns.get(emailLog.campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${emailLog.campaignId} not found`);
      }

      const email = campaign.emails.find(e => e.id === emailLog.emailId);
      if (!email) {
        throw new Error(`Email ${emailLog.emailId} not found in campaign`);
      }

      // Get template content based on variant
      let content = '';
      let subject = email.subject;

      if (emailLog.variant === 'A' && email.variantA) {
        subject = email.variantA.subject;
        content = email.variantA.content;
      } else if (emailLog.variant === 'B' && email.variantB) {
        subject = email.variantB.subject;
        content = email.variantB.content;
      }

      // Send email using email service
      const result = await emailService.send({
        to: emailLog.userEmail,
        subject,
        html: content,
        tags: [
          { name: 'campaign_id', value: campaign.id },
          { name: 'email_id', value: email.id },
          { name: 'log_id', value: emailLog.id }
        ]
      });

      if (result.success) {
        emailLog.status = EmailStatus.SENT;
        emailLog.sentAt = new Date();
        logger.info('Campaign email sent', {
          emailLogId,
          campaignId: campaign.id,
          recipient: emailLog.userEmail
        });
      } else {
        emailLog.status = EmailStatus.FAILED;
        emailLog.metadata = { ...emailLog.metadata, error: result.error };
        logger.error('Failed to send campaign email', {
          emailLogId,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Failed to send scheduled email', { error, emailLogId });
      throw error;
    }
  }

  /**
   * Track email open
   */
  async trackEmailOpen(emailLogId: string): Promise<void> {
    try {
      const emailLog = this.emailLogs.find(log => log.id === emailLogId);
      if (!emailLog) {
        logger.warn('Email log not found for open tracking', { emailLogId });
        return;
      }

      if (!emailLog.openedAt) {
        emailLog.status = EmailStatus.OPENED;
        emailLog.openedAt = new Date();
        logger.info('Email opened', { emailLogId, campaignId: emailLog.campaignId });
      }
    } catch (error) {
      logger.error('Failed to track email open', { error, emailLogId });
    }
  }

  /**
   * Track email click
   */
  async trackEmailClick(emailLogId: string, linkUrl?: string): Promise<void> {
    try {
      const emailLog = this.emailLogs.find(log => log.id === emailLogId);
      if (!emailLog) {
        logger.warn('Email log not found for click tracking', { emailLogId });
        return;
      }

      if (!emailLog.clickedAt) {
        emailLog.status = EmailStatus.CLICKED;
        emailLog.clickedAt = new Date();
        emailLog.metadata = { ...emailLog.metadata, clickedLink: linkUrl };
        logger.info('Email clicked', { emailLogId, campaignId: emailLog.campaignId, linkUrl });
      }
    } catch (error) {
      logger.error('Failed to track email click', { error, emailLogId });
    }
  }

  /**
   * Handle unsubscribe
   */
  async unsubscribeUser(email: string, emailLogId?: string): Promise<void> {
    try {
      this.unsubscribed.add(email);

      if (emailLogId) {
        const emailLog = this.emailLogs.find(log => log.id === emailLogId);
        if (emailLog) {
          emailLog.unsubscribedAt = new Date();
        }
      }

      logger.info('User unsubscribed', { email, emailLogId });
    } catch (error) {
      logger.error('Failed to unsubscribe user', { error, email });
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  getCampaignStats(campaignId: string): CampaignStats | null {
    try {
      const campaign = this.campaigns.get(campaignId);
      if (!campaign) {
        return null;
      }

      const logs = this.emailLogs.filter(log => log.campaignId === campaignId);

      const totalSent = logs.filter(log => log.status === EmailStatus.SENT || log.openedAt || log.clickedAt).length;
      const totalOpened = logs.filter(log => log.openedAt).length;
      const totalClicked = logs.filter(log => log.clickedAt).length;
      const totalBounced = logs.filter(log => log.status === EmailStatus.BOUNCED).length;
      const totalUnsubscribed = logs.filter(log => log.unsubscribedAt).length;

      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
      const conversionRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

      // Calculate variant stats for A/B testing
      let variantAStats: VariantStats | undefined;
      let variantBStats: VariantStats | undefined;

      if (campaign.abTest?.enabled) {
        const variantALogs = logs.filter(log => log.variant === 'A');
        const variantBLogs = logs.filter(log => log.variant === 'B');

        if (variantALogs.length > 0) {
          const aSent = variantALogs.filter(log => log.status === EmailStatus.SENT || log.openedAt).length;
          const aOpened = variantALogs.filter(log => log.openedAt).length;
          const aClicked = variantALogs.filter(log => log.clickedAt).length;

          variantAStats = {
            sent: aSent,
            opened: aOpened,
            clicked: aClicked,
            openRate: aSent > 0 ? (aOpened / aSent) * 100 : 0,
            clickRate: aOpened > 0 ? (aClicked / aOpened) * 100 : 0
          };
        }

        if (variantBLogs.length > 0) {
          const bSent = variantBLogs.filter(log => log.status === EmailStatus.SENT || log.openedAt).length;
          const bOpened = variantBLogs.filter(log => log.openedAt).length;
          const bClicked = variantBLogs.filter(log => log.clickedAt).length;

          variantBStats = {
            sent: bSent,
            opened: bOpened,
            clicked: bClicked,
            openRate: bSent > 0 ? (bOpened / bSent) * 100 : 0,
            clickRate: bOpened > 0 ? (bClicked / bOpened) * 100 : 0
          };
        }
      }

      return {
        campaignId,
        totalSent,
        totalOpened,
        totalClicked,
        totalBounced,
        totalUnsubscribed,
        openRate,
        clickRate,
        conversionRate,
        variantAStats,
        variantBStats
      };
    } catch (error) {
      logger.error('Failed to get campaign stats', { error, campaignId });
      return null;
    }
  }

  /**
   * Process scheduled emails (to be called by cron job)
   */
  async processScheduledEmails(): Promise<void> {
    try {
      const now = new Date();
      const scheduledLogs = this.emailLogs.filter(log => {
        if (log.status !== EmailStatus.SCHEDULED) return false;
        const sendAt = log.metadata?.sendAt ? new Date(log.metadata.sendAt) : null;
        return sendAt && sendAt <= now;
      });

      logger.info('Processing scheduled emails', { count: scheduledLogs.length });

      for (const log of scheduledLogs) {
        await this.sendScheduledEmail(log.id);
      }
    } catch (error) {
      logger.error('Failed to process scheduled emails', { error });
    }
  }
}

// Singleton instance
export const dripCampaignService = new DripCampaignService();

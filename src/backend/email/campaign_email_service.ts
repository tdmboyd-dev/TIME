/**
 * Campaign Email Service
 *
 * Wrapper service that integrates SendGrid with drip campaigns.
 * Handles template rendering, variable substitution, and email sending.
 */

import { sendGridService } from './sendgrid_service';
import { getTemplateById } from './campaign_templates';
import { ADDITIONAL_TEMPLATES } from './additional_templates';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CampaignEmailService');

export interface CampaignEmailData {
  to: string;
  templateId: string;
  subject: string;
  data: Record<string, any>;
  campaignId: string;
  emailId: string;
  userId: string;
  emailLogId: string;
}

export class CampaignEmailService {
  /**
   * Send campaign email with template rendering
   */
  async sendCampaignEmail(emailData: CampaignEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get template function
      let templateFn = getTemplateById(emailData.templateId);

      // If not in main templates, check additional templates
      if (!templateFn && ADDITIONAL_TEMPLATES[emailData.templateId as keyof typeof ADDITIONAL_TEMPLATES]) {
        templateFn = ADDITIONAL_TEMPLATES[emailData.templateId as keyof typeof ADDITIONAL_TEMPLATES];
      }

      if (!templateFn) {
        logger.error('Template not found', { templateId: emailData.templateId });
        return { success: false, error: `Template ${emailData.templateId} not found` };
      }

      // Render HTML template with data
      const html = templateFn(emailData.data);

      // Generate plain text version (strip HTML tags)
      const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      // Perform variable substitution on subject
      const subject = this.substituteVariables(emailData.subject, emailData.data);

      // Send via SendGrid with tracking
      const result = await sendGridService.sendTracked(
        {
          to: emailData.to,
          subject,
          html,
          text,
          categories: ['drip-campaign'],
        },
        emailData.campaignId,
        emailData.emailId,
        emailData.userId
      );

      if (result.success) {
        logger.info('Campaign email sent', {
          to: emailData.to,
          templateId: emailData.templateId,
          campaignId: emailData.campaignId,
          messageId: result.messageId,
        });
      }

      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send campaign email', { error: message, emailData });
      return { success: false, error: message };
    }
  }

  /**
   * Substitute variables in text
   * Supports {{variableName}} syntax
   */
  private substituteVariables(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Preview email template with sample data
   */
  previewTemplate(templateId: string, data: Record<string, any> = {}): string | null {
    let templateFn = getTemplateById(templateId);

    if (!templateFn && ADDITIONAL_TEMPLATES[templateId as keyof typeof ADDITIONAL_TEMPLATES]) {
      templateFn = ADDITIONAL_TEMPLATES[templateId as keyof typeof ADDITIONAL_TEMPLATES];
    }

    if (!templateFn) {
      logger.warn('Template not found for preview', { templateId });
      return null;
    }

    // Provide default sample data
    const sampleData = {
      userName: data.userName || 'John Doe',
      firstName: data.firstName || 'John',
      email: data.email || 'john@example.com',
      botName: data.botName || 'Momentum Trader',
      profit: data.profit || '$1,234.56',
      ...data,
    };

    return templateFn(sampleData);
  }

  /**
   * Test send email to specific address
   */
  async testSend(
    templateId: string,
    testEmail: string,
    testData: Record<string, any> = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const html = this.previewTemplate(templateId, testData);

      if (!html) {
        return { success: false, error: 'Template not found' };
      }

      const result = await sendGridService.send({
        to: testEmail,
        subject: `[TEST] Campaign Email - ${templateId}`,
        html,
        categories: ['test', 'campaign'],
      });

      logger.info('Test email sent', { templateId, testEmail });
      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send test email', { error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Get list of available templates
   */
  getAvailableTemplates(): string[] {
    const mainTemplates = [
      'welcome_day_0',
      'welcome_day_1',
      'welcome_day_3',
      'welcome_day_7',
      'welcome_day_14',
    ];

    const additionalTemplates = Object.keys(ADDITIONAL_TEMPLATES);

    return [...mainTemplates, ...additionalTemplates];
  }
}

// Singleton instance
export const campaignEmailService = new CampaignEmailService();

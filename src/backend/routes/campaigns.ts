/**
 * Email Campaign API Routes for TIME
 *
 * Endpoints:
 * - POST   /api/campaigns/create      - Create new campaign
 * - GET    /api/campaigns             - List all campaigns
 * - GET    /api/campaigns/:id         - Get campaign details
 * - PUT    /api/campaigns/:id         - Update campaign
 * - DELETE /api/campaigns/:id         - Delete campaign
 * - GET    /api/campaigns/:id/stats   - Get campaign statistics
 * - POST   /api/campaigns/:id/trigger - Manually trigger campaign for user
 * - POST   /api/campaigns/:id/pause   - Pause campaign
 * - POST   /api/campaigns/:id/resume  - Resume campaign
 * - GET    /api/campaigns/templates   - Get all campaign templates
 * - POST   /api/campaigns/track/open  - Track email open
 * - POST   /api/campaigns/track/click - Track email click
 * - POST   /api/campaigns/unsubscribe - Unsubscribe user
 */

import { Router, Request, Response } from 'express';
import {
  dripCampaignService,
  Campaign,
  CampaignType,
  CampaignStatus
} from '../email/drip_campaign_service';
import {
  getAllCampaignTemplates,
  WELCOME_SERIES,
  UPGRADE_NUDGE,
  INACTIVE_USER,
  FEATURE_EDUCATION,
  TEMPLATE_REGISTRY
} from '../email/campaign_templates';
import { createComponentLogger } from '../utils/logger';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const logger = createComponentLogger('CampaignRoutes');

/**
 * POST /api/campaigns/create
 * Create a new campaign
 */
router.post('/create', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      type,
      description,
      emails,
      trigger,
      abTest
    } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type'
      });
    }

    if (!Object.values(CampaignType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign type'
      });
    }

    const campaign = await dripCampaignService.createCampaign({
      name,
      type,
      status: CampaignStatus.DRAFT,
      description,
      emails: emails || [],
      trigger: trigger || { event: 'manual' },
      abTest
    });

    logger.info('Campaign created via API', {
      campaignId: campaign.id,
      name: campaign.name,
      createdBy: (req as any).user?.id
    });

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to create campaign', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create campaign'
    });
  }
});

/**
 * GET /api/campaigns
 * List all campaigns with optional filters
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;

    const filters: any = {};
    if (type) filters.type = type as CampaignType;
    if (status) filters.status = status as CampaignStatus;

    const campaigns = dripCampaignService.listCampaigns(filters);

    res.json({
      success: true,
      campaigns,
      total: campaigns.length
    });
  } catch (error) {
    logger.error('Failed to list campaigns', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list campaigns'
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get campaign details
 */
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = dripCampaignService.getCampaign(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to get campaign', { error, campaignId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign'
    });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign
 */
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const campaign = await dripCampaignService.updateCampaign(id, updates);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    logger.info('Campaign updated via API', {
      campaignId: id,
      updatedBy: (req as any).user?.id
    });

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to update campaign', { error, campaignId: req.params.id });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update campaign'
    });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await dripCampaignService.deleteCampaign(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    logger.info('Campaign deleted via API', {
      campaignId: id,
      deletedBy: (req as any).user?.id
    });

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete campaign', { error, campaignId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign'
    });
  }
});

/**
 * GET /api/campaigns/:id/stats
 * Get campaign statistics
 */
router.get('/:id/stats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stats = dripCampaignService.getCampaignStats(id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or no stats available'
      });
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get campaign stats', { error, campaignId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign stats'
    });
  }
});

/**
 * POST /api/campaigns/:id/trigger
 * Manually trigger campaign for a specific user
 */
router.post('/:id/trigger', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userEmail, userData } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, userEmail'
      });
    }

    await dripCampaignService.triggerCampaign(id, userId, userEmail, userData);

    logger.info('Campaign manually triggered', {
      campaignId: id,
      userId,
      triggeredBy: (req as any).user?.id
    });

    res.json({
      success: true,
      message: 'Campaign triggered successfully'
    });
  } catch (error) {
    logger.error('Failed to trigger campaign', { error, campaignId: req.params.id });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger campaign'
    });
  }
});

/**
 * POST /api/campaigns/:id/pause
 * Pause campaign
 */
router.post('/:id/pause', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await dripCampaignService.updateCampaign(id, {
      status: CampaignStatus.PAUSED
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    logger.info('Campaign paused', {
      campaignId: id,
      pausedBy: (req as any).user?.id
    });

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to pause campaign', { error, campaignId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign'
    });
  }
});

/**
 * POST /api/campaigns/:id/resume
 * Resume paused campaign
 */
router.post('/:id/resume', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await dripCampaignService.updateCampaign(id, {
      status: CampaignStatus.ACTIVE
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    logger.info('Campaign resumed', {
      campaignId: id,
      resumedBy: (req as any).user?.id
    });

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to resume campaign', { error, campaignId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to resume campaign'
    });
  }
});

/**
 * GET /api/campaigns/templates
 * Get all pre-built campaign templates
 */
router.get('/templates/all', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const templates = getAllCampaignTemplates();

    res.json({
      success: true,
      templates,
      total: templates.length
    });
  } catch (error) {
    logger.error('Failed to get campaign templates', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign templates'
    });
  }
});

/**
 * POST /api/campaigns/templates/install
 * Install a pre-built template as a new campaign
 */
router.post('/templates/install', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateType } = req.body;

    let template: Campaign | null = null;
    switch (templateType) {
      case 'WELCOME_SERIES':
        template = WELCOME_SERIES;
        break;
      case 'UPGRADE_NUDGE':
        template = UPGRADE_NUDGE;
        break;
      case 'INACTIVE_USER':
        template = INACTIVE_USER;
        break;
      case 'FEATURE_EDUCATION':
        template = FEATURE_EDUCATION;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid template type'
        });
    }

    const campaign = await dripCampaignService.createCampaign({
      name: template.name,
      type: template.type,
      status: CampaignStatus.DRAFT,
      description: template.description,
      emails: template.emails,
      trigger: template.trigger,
      abTest: template.abTest
    });

    logger.info('Campaign template installed', {
      templateType,
      campaignId: campaign.id,
      installedBy: (req as any).user?.id
    });

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to install campaign template', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to install campaign template'
    });
  }
});

/**
 * POST /api/campaigns/track/open
 * Track email open event
 */
router.post('/track/open', async (req: Request, res: Response) => {
  try {
    const { emailLogId } = req.body;

    if (!emailLogId) {
      return res.status(400).json({
        success: false,
        error: 'Missing emailLogId'
      });
    }

    await dripCampaignService.trackEmailOpen(emailLogId);

    res.json({
      success: true,
      message: 'Email open tracked'
    });
  } catch (error) {
    logger.error('Failed to track email open', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track email open'
    });
  }
});

/**
 * POST /api/campaigns/track/click
 * Track email click event
 */
router.post('/track/click', async (req: Request, res: Response) => {
  try {
    const { emailLogId, linkUrl } = req.body;

    if (!emailLogId) {
      return res.status(400).json({
        success: false,
        error: 'Missing emailLogId'
      });
    }

    await dripCampaignService.trackEmailClick(emailLogId, linkUrl);

    res.json({
      success: true,
      message: 'Email click tracked'
    });
  } catch (error) {
    logger.error('Failed to track email click', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track email click'
    });
  }
});

/**
 * POST /api/campaigns/unsubscribe
 * Unsubscribe user from all campaigns
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { email, emailLogId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Missing email'
      });
    }

    await dripCampaignService.unsubscribeUser(email, emailLogId);

    logger.info('User unsubscribed from campaigns', { email });

    res.json({
      success: true,
      message: 'Successfully unsubscribed'
    });
  } catch (error) {
    logger.error('Failed to unsubscribe user', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe'
    });
  }
});

/**
 * POST /api/campaigns/process-scheduled
 * Process all scheduled emails (to be called by cron job)
 * Admin only
 */
router.post('/process-scheduled', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    await dripCampaignService.processScheduledEmails();

    logger.info('Scheduled emails processed', {
      triggeredBy: (req as any).user?.id
    });

    res.json({
      success: true,
      message: 'Scheduled emails processed successfully'
    });
  } catch (error) {
    logger.error('Failed to process scheduled emails', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process scheduled emails'
    });
  }
});

// ============================================
// ENHANCED CAMPAIGN ROUTES (v2)
// ============================================

import {
  emailCampaignManager,
  RateLimiter,
  ABTestingService,
  AnalyticsService,
  TemplateEditorService
} from '../email/email_campaign_manager';
import { TRANSACTIONAL_TEMPLATES } from '../email/transactional_templates';
import { MARKETING_TEMPLATES } from '../email/marketing_templates';

/**
 * GET /api/campaigns/v2/templates
 * Get all available email templates (built-in + custom)
 */
router.get('/v2/templates', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const templateEditor = emailCampaignManager.getTemplateEditorService();
    const templates = templateEditor.getAllTemplateTypes();

    res.json({
      success: true,
      templates: {
        drip: Object.keys(TEMPLATE_REGISTRY),
        transactional: Object.keys(TRANSACTIONAL_TEMPLATES),
        marketing: Object.keys(MARKETING_TEMPLATES),
        custom: templates.custom
      }
    });
  } catch (error) {
    logger.error('Failed to get templates', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

/**
 * POST /api/campaigns/v2/templates
 * Create a custom email template
 */
router.post('/v2/templates', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, category, subject, htmlContent, plainTextContent, previewData } = req.body;

    if (!name || !category || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, category, subject, htmlContent'
      });
    }

    const templateEditor = emailCampaignManager.getTemplateEditorService();
    const template = templateEditor.createTemplate({
      name,
      category,
      subject,
      htmlContent,
      plainTextContent,
      previewData,
      createdBy: (req as any).user?.id || 'system'
    });

    logger.info('Custom template created', { templateId: template.id });

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Failed to create template', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

/**
 * PUT /api/campaigns/v2/templates/:id
 * Update a custom email template
 */
router.put('/v2/templates/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const templateEditor = emailCampaignManager.getTemplateEditorService();
    const template = templateEditor.updateTemplate(id, updates);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Failed to update template', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

/**
 * DELETE /api/campaigns/v2/templates/:id
 * Delete a custom email template
 */
router.delete('/v2/templates/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const templateEditor = emailCampaignManager.getTemplateEditorService();
    const deleted = templateEditor.deleteTemplate(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted'
    });
  } catch (error) {
    logger.error('Failed to delete template', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

/**
 * POST /api/campaigns/v2/templates/:id/preview
 * Preview a template with sample data
 */
router.post('/v2/templates/:id/preview', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    const templateEditor = emailCampaignManager.getTemplateEditorService();
    const html = templateEditor.previewTemplate(id, data || {});

    if (!html) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      html
    });
  } catch (error) {
    logger.error('Failed to preview template', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to preview template'
    });
  }
});

/**
 * POST /api/campaigns/v2/send
 * Send email with enhanced features
 */
router.post('/v2/send', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      to,
      templateType,
      templateData,
      subject,
      campaignId,
      userId,
      abTestId,
      scheduledAt
    } = req.body;

    if (!to || !templateType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, templateType'
      });
    }

    const result = await emailCampaignManager.sendEmail({
      to,
      templateType,
      templateData: templateData || {},
      subject,
      campaignId,
      userId,
      abTestId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
    });

    res.json({
      success: result.success,
      messageId: result.messageId,
      emailLogId: result.emailLogId,
      error: result.error
    });
  } catch (error) {
    logger.error('Failed to send email', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
});

/**
 * POST /api/campaigns/v2/send-bulk
 * Send bulk emails
 */
router.post('/v2/send-bulk', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { recipients, templateType, campaignId } = req.body;

    if (!recipients || !Array.isArray(recipients) || !templateType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipients (array), templateType'
      });
    }

    const result = await emailCampaignManager.sendBulk(
      recipients,
      templateType,
      { campaignId }
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to send bulk emails', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk emails'
    });
  }
});

/**
 * GET /api/campaigns/v2/rate-limit
 * Get current rate limit status
 */
router.get('/v2/rate-limit', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const rateLimiter = emailCampaignManager.getRateLimiter();
    const status = rateLimiter.getStatus();

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('Failed to get rate limit status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status'
    });
  }
});

// ============================================
// A/B TESTING ROUTES
// ============================================

/**
 * POST /api/campaigns/v2/ab-tests
 * Create new A/B test
 */
router.post('/v2/ab-tests', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      campaignId,
      name,
      variants,
      winnerMetric,
      minimumSampleSize,
      confidenceLevel
    } = req.body;

    if (!name || !variants || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Must provide name and at least 2 variants'
      });
    }

    const abService = emailCampaignManager.getABTestingService();
    const test = abService.createTest({
      campaignId: campaignId || '',
      name,
      status: 'draft',
      variants,
      winnerMetric: winnerMetric || 'open_rate',
      minimumSampleSize: minimumSampleSize || 100,
      confidenceLevel: confidenceLevel || 0.95
    });

    res.json({
      success: true,
      test
    });
  } catch (error) {
    logger.error('Failed to create A/B test', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create A/B test'
    });
  }
});

/**
 * GET /api/campaigns/v2/ab-tests/:id
 * Get A/B test details
 */
router.get('/v2/ab-tests/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const abService = emailCampaignManager.getABTestingService();
    const test = abService.getTest(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'A/B test not found'
      });
    }

    const results = abService.getResults(id);

    res.json({
      success: true,
      test,
      results
    });
  } catch (error) {
    logger.error('Failed to get A/B test', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get A/B test'
    });
  }
});

/**
 * POST /api/campaigns/v2/ab-tests/:id/start
 * Start A/B test
 */
router.post('/v2/ab-tests/:id/start', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const abService = emailCampaignManager.getABTestingService();
    const started = abService.startTest(id);

    if (!started) {
      return res.status(400).json({
        success: false,
        error: 'Cannot start test. Check if test exists and is in draft status.'
      });
    }

    res.json({
      success: true,
      message: 'A/B test started'
    });
  } catch (error) {
    logger.error('Failed to start A/B test', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to start A/B test'
    });
  }
});

/**
 * POST /api/campaigns/v2/ab-tests/:id/pause
 * Pause A/B test
 */
router.post('/v2/ab-tests/:id/pause', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const abService = emailCampaignManager.getABTestingService();
    const paused = abService.pauseTest(id);

    if (!paused) {
      return res.status(400).json({
        success: false,
        error: 'Cannot pause test. Check if test exists and is running.'
      });
    }

    res.json({
      success: true,
      message: 'A/B test paused'
    });
  } catch (error) {
    logger.error('Failed to pause A/B test', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to pause A/B test'
    });
  }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * GET /api/campaigns/v2/analytics/:campaignId
 * Get campaign analytics
 */
router.get('/v2/analytics/:campaignId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { period } = req.query;

    const analyticsService = emailCampaignManager.getAnalyticsService();
    const analytics = analyticsService.getCampaignAnalytics(
      campaignId,
      (period as 'day' | 'week' | 'month' | 'all') || 'all'
    );

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Failed to get campaign analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign analytics'
    });
  }
});

/**
 * GET /api/campaigns/v2/analytics
 * Get overall platform analytics
 */
router.get('/v2/analytics', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { period } = req.query;

    const analyticsService = emailCampaignManager.getAnalyticsService();
    const analytics = analyticsService.getOverallAnalytics(
      (period as 'day' | 'week' | 'month') || 'week'
    );

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Failed to get overall analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get overall analytics'
    });
  }
});

/**
 * POST /api/campaigns/v2/analytics/track
 * Track email engagement event
 */
router.post('/v2/analytics/track', async (req: Request, res: Response) => {
  try {
    const { emailLogId, userId, campaignId, eventType, metadata } = req.body;

    if (!emailLogId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: emailLogId, eventType'
      });
    }

    const analyticsService = emailCampaignManager.getAnalyticsService();
    analyticsService.trackEvent(
      emailLogId,
      userId || 'anonymous',
      campaignId || 'direct',
      eventType,
      metadata
    );

    res.json({
      success: true,
      message: 'Event tracked'
    });
  } catch (error) {
    logger.error('Failed to track event', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

/**
 * POST /api/campaigns/v2/analytics/conversion
 * Track conversion
 */
router.post('/v2/analytics/conversion', async (req: Request, res: Response) => {
  try {
    const { campaignId, userId, goalId, value } = req.body;

    if (!campaignId || !userId || !goalId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: campaignId, userId, goalId'
      });
    }

    const analyticsService = emailCampaignManager.getAnalyticsService();
    analyticsService.trackConversion(campaignId, userId, goalId, value || 0);

    res.json({
      success: true,
      message: 'Conversion tracked'
    });
  } catch (error) {
    logger.error('Failed to track conversion', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track conversion'
    });
  }
});

// ============================================
// TRANSACTIONAL EMAIL ROUTES
// ============================================

/**
 * POST /api/campaigns/v2/transactional/trade-confirmation
 * Send trade confirmation email
 */
router.post('/v2/transactional/trade-confirmation', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, email, tradeData } = req.body;

    if (!email || !tradeData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, tradeData'
      });
    }

    const result = await emailCampaignManager.sendEmail({
      to: email,
      templateType: 'trade_confirmation',
      templateData: tradeData,
      subject: `Trade Executed: ${tradeData.side} ${tradeData.symbol}`,
      userId,
      campaignId: 'transactional_trade'
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to send trade confirmation', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send trade confirmation'
    });
  }
});

/**
 * POST /api/campaigns/v2/transactional/subscription-receipt
 * Send subscription receipt email
 */
router.post('/v2/transactional/subscription-receipt', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, email, receiptData } = req.body;

    if (!email || !receiptData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, receiptData'
      });
    }

    const result = await emailCampaignManager.sendEmail({
      to: email,
      templateType: 'subscription_receipt',
      templateData: receiptData,
      subject: `Payment Receipt - TIME Trading`,
      userId,
      campaignId: 'transactional_billing'
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to send subscription receipt', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send subscription receipt'
    });
  }
});

/**
 * POST /api/campaigns/v2/transactional/password-reset
 * Send password reset email
 */
router.post('/v2/transactional/password-reset', async (req: Request, res: Response) => {
  try {
    const { email, resetLink, userName, expiresIn } = req.body;

    if (!email || !resetLink) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, resetLink'
      });
    }

    const result = await emailCampaignManager.sendEmail({
      to: email,
      templateType: 'password_reset',
      templateData: {
        userName,
        resetLink,
        expiresIn: expiresIn || '1 hour',
        ipAddress: req.ip,
        requestTime: new Date().toISOString()
      },
      subject: 'Reset Your TIME Password',
      campaignId: 'transactional_security'
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to send password reset', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send password reset email'
    });
  }
});

/**
 * POST /api/campaigns/v2/transactional/security-alert
 * Send security alert email
 */
router.post('/v2/transactional/security-alert', async (req: Request, res: Response) => {
  try {
    const { email, alertData } = req.body;

    if (!email || !alertData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, alertData'
      });
    }

    const result = await emailCampaignManager.sendEmail({
      to: email,
      templateType: 'security_alert',
      templateData: alertData,
      subject: 'Security Alert - TIME Trading',
      campaignId: 'transactional_security'
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to send security alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send security alert'
    });
  }
});

export default router;

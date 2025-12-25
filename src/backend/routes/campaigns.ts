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
  FEATURE_EDUCATION
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

export default router;

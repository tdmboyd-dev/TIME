/**
 * Gift Access API Routes
 *
 * Admin endpoints for managing gift access and chatbot interaction.
 */

import { Router, Request, Response } from 'express';
import { giftAccessService } from '../services/GiftAccessService';
import { adminMiddleware, ownerMiddleware } from './auth';

const router = Router();

// ============================================================
// ADMIN CHATBOT
// ============================================================

/**
 * POST /gift-access/chat
 * Send message to admin chatbot
 * SECURITY: Owner only
 */
router.post('/chat', ownerMiddleware, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const adminId = (req as any).user?.id || 'admin';

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await giftAccessService.processAdminChat(message, adminId);

    res.json({
      success: true,
      response,
      history: giftAccessService.getChatHistory().slice(-20), // Last 20 messages
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /gift-access/chat/history
 * Get chat history
 * SECURITY: Owner only
 */
router.get('/chat/history', ownerMiddleware, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = giftAccessService.getChatHistory().slice(-limit);

  res.json({
    success: true,
    messages: history,
    count: history.length,
  });
});

/**
 * DELETE /gift-access/chat/history
 * Clear chat history
 * SECURITY: Owner only
 */
router.delete('/chat/history', ownerMiddleware, (req: Request, res: Response) => {
  giftAccessService.clearChatHistory();
  res.json({ success: true, message: 'Chat history cleared' });
});

// ============================================================
// GIFT MANAGEMENT
// ============================================================

/**
 * POST /gift-access/gift
 * Create a new gift
 * SECURITY: Owner only
 */
router.post('/gift', ownerMiddleware, (req: Request, res: Response) => {
  try {
    const { userId, userEmail, tier, features, duration, reason } = req.body;
    const giftedBy = (req as any).user?.id || 'admin';

    if (!userId || !tier || !duration) {
      return res.status(400).json({
        error: 'Required: userId, tier, duration',
        example: {
          userId: 'user@email.com',
          tier: 'PRO',
          duration: '1month',
          reason: 'Early supporter',
        },
      });
    }

    const gift = giftAccessService.giftAccess({
      userId,
      userEmail,
      tier,
      features,
      duration,
      giftedBy,
      reason: reason || 'Admin gift',
    });

    res.json({
      success: true,
      gift,
      message: `${tier} access gifted to ${userId} for ${duration}`,
    });
  } catch (error: any) {
    console.error('Gift error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /gift-access/revoke/:giftId
 * Revoke a gift
 * SECURITY: Owner only
 */
router.post('/revoke/:giftId', ownerMiddleware, (req: Request, res: Response) => {
  try {
    const { giftId } = req.params;
    const { reason } = req.body;
    const revokedBy = (req as any).user?.id || 'admin';

    const gift = giftAccessService.revokeGift(giftId, reason || 'Admin revoked', revokedBy);

    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    res.json({
      success: true,
      gift,
      message: `Gift ${giftId} revoked`,
    });
  } catch (error: any) {
    console.error('Revoke error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /gift-access/gifts
 * List all gifts
 * SECURITY: Admin
 */
router.get('/gifts', adminMiddleware, (req: Request, res: Response) => {
  const status = req.query.status as string;
  let gifts = giftAccessService.getAllGifts();

  if (status) {
    gifts = gifts.filter(g => g.status === status);
  }

  res.json({
    success: true,
    gifts,
    count: gifts.length,
  });
});

/**
 * GET /gift-access/user/:userId
 * Check user's gift status
 * SECURITY: Admin
 */
router.get('/user/:userId', adminMiddleware, (req: Request, res: Response) => {
  const { userId } = req.params;

  const activeGift = giftAccessService.getUserActiveGift(userId);
  const effectiveTier = giftAccessService.getUserEffectiveTier(userId);

  res.json({
    success: true,
    userId,
    hasActiveGift: !!activeGift,
    activeGift,
    effectiveTier,
  });
});

// ============================================================
// GIFT REQUESTS
// ============================================================

/**
 * POST /gift-access/request
 * Create a gift request (user-facing)
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { userId, userEmail, requestedTier, requestedFeatures, requestedDuration, reason } = req.body;

    if (!userId || !requestedTier || !requestedDuration || !reason) {
      return res.status(400).json({
        error: 'Required: userId, requestedTier, requestedDuration, reason',
      });
    }

    const request = giftAccessService.createGiftRequest({
      userId,
      userEmail,
      requestedTier,
      requestedFeatures,
      requestedDuration,
      reason,
    });

    res.json({
      success: true,
      request,
      message: 'Your request has been submitted for review',
    });
  } catch (error: any) {
    console.error('Request error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /gift-access/requests/pending
 * Get pending requests
 * SECURITY: Admin
 */
router.get('/requests/pending', adminMiddleware, (req: Request, res: Response) => {
  const requests = giftAccessService.getPendingRequests();

  res.json({
    success: true,
    requests,
    count: requests.length,
  });
});

/**
 * POST /gift-access/requests/:requestId/approve
 * Approve a request
 * SECURITY: Owner only
 */
router.post('/requests/:requestId/approve', ownerMiddleware, (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    const reviewedBy = (req as any).user?.id || 'admin';

    const gift = giftAccessService.approveRequest(requestId, reviewedBy, notes);

    if (!gift) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    res.json({
      success: true,
      gift,
      message: 'Request approved',
    });
  } catch (error: any) {
    console.error('Approve error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /gift-access/requests/:requestId/deny
 * Deny a request
 * SECURITY: Owner only
 */
router.post('/requests/:requestId/deny', ownerMiddleware, (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    const reviewedBy = (req as any).user?.id || 'admin';

    const request = giftAccessService.denyRequest(requestId, reviewedBy, notes || 'Request denied');

    if (!request) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    res.json({
      success: true,
      request,
      message: 'Request denied',
    });
  } catch (error: any) {
    console.error('Deny error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// RECOMMENDATIONS & PROMOS
// ============================================================

/**
 * GET /gift-access/recommendations
 * Get gift timing recommendations
 * SECURITY: Admin
 */
router.get('/recommendations', adminMiddleware, (req: Request, res: Response) => {
  const recommendations = giftAccessService.getGiftingRecommendations();

  res.json({
    success: true,
    ...recommendations,
  });
});

/**
 * GET /gift-access/promos/active
 * Get active promos
 * SECURITY: Public
 */
router.get('/promos/active', (req: Request, res: Response) => {
  const promos = giftAccessService.getActivePromos();

  res.json({
    success: true,
    promos,
    count: promos.length,
  });
});

/**
 * GET /gift-access/promos/upcoming
 * Get upcoming promos
 * SECURITY: Public
 */
router.get('/promos/upcoming', (req: Request, res: Response) => {
  const promos = giftAccessService.getUpcomingPromos();

  res.json({
    success: true,
    promos,
    count: promos.length,
  });
});

// ============================================================
// PRICING
// ============================================================

/**
 * GET /gift-access/pricing
 * Get current pricing structure
 * SECURITY: Public
 */
router.get('/pricing', (req: Request, res: Response) => {
  const pricing = giftAccessService.pricing;

  res.json({
    success: true,
    pricing,
    comparison: {
      '3Commas': { price: '$29-99/mo', features: 'Bots only' },
      'Cryptohopper': { price: '$19-99/mo', features: 'Crypto only' },
      'Wealthfront': { price: '0.25% AUM', features: 'Robo only' },
      'TradingView': { price: '$15-60/mo', features: 'Charts only' },
      'TIME': { price: '$24.99-149/mo', features: 'ALL: AI bots, stocks, crypto, forex, tax, dynasty trust' },
    },
  });
});

// ============================================================
// STATS
// ============================================================

/**
 * GET /gift-access/stats
 * Get gift statistics
 * SECURITY: Admin
 */
router.get('/stats', adminMiddleware, (req: Request, res: Response) => {
  const stats = giftAccessService.getStats();

  res.json({
    success: true,
    stats,
  });
});

export default router;

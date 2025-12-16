/**
 * Integration Routes
 *
 * API endpoints for the 3-platform integration:
 * - iKickItz ↔ TIME Pay ↔ MGR Elite Hub
 *
 * ONE-CLICK FILE experience endpoints
 */

import { Router, Request, Response } from 'express';
import { platformBridgeRoutes } from '../integrations/platform_bridge';
import { ikickitzBridgeRoutes } from '../integrations/ikickitz_bridge';
import { mgrBridgeRoutes, MGRReturnType } from '../integrations/mgr_bridge';
import { unifiedTaxFlowRoutes, TaxFilingUser } from '../integrations/unified_tax_flow';
import { authMiddleware } from './auth';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const router = Router();

// Webhook secrets (should be stored in env vars)
const WEBHOOK_SECRETS = {
  ikickitz: process.env.IKICKITZ_WEBHOOK_SECRET || '',
  mgr: process.env.MGR_WEBHOOK_SECRET || '',
  irs: process.env.IRS_WEBHOOK_SECRET || '',
};

/**
 * Verify webhook signature using HMAC-SHA256
 * Returns true if signature is valid
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string,
  source: string
): boolean {
  // If no secret configured, log warning and reject in production
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn(`Webhook secret not configured for ${source} - rejecting request`);
      return false;
    }
    // In development, allow without signature (but warn)
    logger.warn(`WARNING: Webhook verification disabled for ${source} in development`);
    return true;
  }

  if (!signature) {
    logger.warn(`Missing webhook signature from ${source}`);
    return false;
  }

  // Extract signature from header (format: "sha256=abc123...")
  const expectedSignature = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  // Calculate HMAC
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'TIME Platform Integration Hub',
    platforms: ['iKickItz', 'TIME Pay', 'MGR Elite Hub'],
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// PLATFORM BRIDGE ROUTES
// ============================================================================

/**
 * POST /integrations/bridge/register
 * Register a platform connection
 */
router.post('/bridge/register', async (req: Request, res: Response) => {
  try {
    const result = await platformBridgeRoutes.registerPlatform(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/bridge/one-click-file
 * Initiate one-click tax filing via platform bridge
 */
router.post('/bridge/one-click-file', async (req: Request, res: Response) => {
  try {
    const result = await platformBridgeRoutes.initiateOneClickFile(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/bridge/approve-and-file
 * Approve prep fee and file via platform bridge
 */
router.post('/bridge/approve-and-file', async (req: Request, res: Response) => {
  try {
    const result = await platformBridgeRoutes.approveAndFile(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /integrations/bridge/status/:userId
 * Get unified filing status
 * SECURITY: Requires auth, user can only access their own status
 */
router.get('/bridge/status/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Users can only access their own status (or admin can access any)
    if (req.params.userId !== user.id && !user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await platformBridgeRoutes.getStatus(req.params.userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /integrations/bridge/quotes/:userId
 * Get pending prep fee quotes
 * SECURITY: Requires auth, user can only access their own quotes
 */
router.get('/bridge/quotes/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (req.params.userId !== user.id && !user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await platformBridgeRoutes.getPendingQuotes(req.params.userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// IKICKITZ BRIDGE ROUTES
// ============================================================================

/**
 * POST /integrations/ikickitz/link
 * Link iKickItz creator account to TIME Pay
 */
router.post('/ikickitz/link', async (req: Request, res: Response) => {
  try {
    const result = await ikickitzBridgeRoutes.linkAccount(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /integrations/ikickitz/unlink/:creatorId
 * Unlink iKickItz creator account
 */
router.delete('/ikickitz/unlink/:creatorId', async (req: Request, res: Response) => {
  try {
    await ikickitzBridgeRoutes.unlinkAccount(req.params.creatorId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/ikickitz/sync-transactions
 * Sync iKickItz transactions to TIME Pay
 */
router.post('/ikickitz/sync-transactions', async (req: Request, res: Response) => {
  try {
    const result = await ikickitzBridgeRoutes.syncTransactions(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/ikickitz/export-earnings
 * Export creator earnings for tax filing
 */
router.post('/ikickitz/export-earnings', async (req: Request, res: Response) => {
  try {
    const result = await ikickitzBridgeRoutes.exportEarnings(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/ikickitz/payout
 * Process creator payout via TIME Pay
 */
router.post('/ikickitz/payout', async (req: Request, res: Response) => {
  try {
    const result = await ikickitzBridgeRoutes.processPayout(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/ikickitz/pay-quarterly
 * Pay quarterly estimated taxes from tax reserve
 */
router.post('/ikickitz/pay-quarterly', async (req: Request, res: Response) => {
  try {
    const result = await ikickitzBridgeRoutes.payQuarterly(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /integrations/ikickitz/dashboard/:creatorId
 * Get creator TIME Pay dashboard
 */
router.get('/ikickitz/dashboard/:creatorId', async (req: Request, res: Response) => {
  try {
    const result = await ikickitzBridgeRoutes.getDashboard(req.params.creatorId);
    if (!result) {
      res.status(404).json({ error: 'Creator not linked to TIME Pay' });
      return;
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// MGR ELITE HUB BRIDGE ROUTES
// ============================================================================

/**
 * POST /integrations/mgr/sync-client
 * Sync TIME Pay user to MGR Elite Hub client
 */
router.post('/mgr/sync-client', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.syncClient(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/mgr/submit-w2
 * Submit W-2 from TIME Payroll to MGR
 */
router.post('/mgr/submit-w2', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.submitW2(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/mgr/submit-1099
 * Submit 1099-NEC from TIME Invoice to MGR
 */
router.post('/mgr/submit-1099', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.submit1099(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/mgr/submit-creator-earnings
 * Submit iKickItz creator earnings as 1099 to MGR
 */
router.post('/mgr/submit-creator-earnings', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.submitCreatorEarnings(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/mgr/calculate-prep-fee
 * Calculate prep fee quote
 */
router.post('/mgr/calculate-prep-fee', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.calculatePrepFee(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/mgr/create-return
 * Create tax return in MGR Elite Hub
 */
router.post('/mgr/create-return', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.createReturn(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/mgr/request-ai-prep/:returnId
 * Request MGR AI to prepare return
 */
router.post('/mgr/request-ai-prep/:returnId', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.requestAIPrep(req.params.returnId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/mgr/approve-and-file
 * Approve prep fee and file return
 */
router.post('/mgr/approve-and-file', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.approveAndFile(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /integrations/mgr/return/:returnId
 * Get return status
 */
router.get('/mgr/return/:returnId', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.getReturn(req.params.returnId);
    if (!result) {
      res.status(404).json({ error: 'Return not found' });
      return;
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /integrations/mgr/client/:clientId/returns
 * Get all returns for a client
 */
router.get('/mgr/client/:clientId/returns', async (req: Request, res: Response) => {
  try {
    const result = await mgrBridgeRoutes.getClientReturns(req.params.clientId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// UNIFIED TAX FLOW ROUTES (ONE-CLICK FILE)
// ============================================================================

/**
 * POST /integrations/tax/register
 * Register user for unified tax filing
 */
router.post('/tax/register', async (req: Request, res: Response) => {
  try {
    const result = await unifiedTaxFlowRoutes.registerUser(req.body as TaxFilingUser);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/tax/one-click-file
 * START THE ONE-CLICK FILE EXPERIENCE
 */
router.post('/tax/one-click-file', async (req: Request, res: Response) => {
  try {
    const result = await unifiedTaxFlowRoutes.startOneClickFile(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/tax/approve-and-file
 * Approve prep fee and file
 */
router.post('/tax/approve-and-file', async (req: Request, res: Response) => {
  try {
    const result = await unifiedTaxFlowRoutes.approveAndFile(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /integrations/tax/session/:sessionId
 * Get tax filing session
 */
router.get('/tax/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const result = await unifiedTaxFlowRoutes.getSession(req.params.sessionId);
    if (!result) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /integrations/tax/user/:userId/sessions
 * Get all tax filing sessions for user
 * SECURITY: Requires auth, user can only access their own sessions
 */
router.get('/tax/user/:userId/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Users can only access their own sessions
    if (req.params.userId !== user.id && !user.isAdmin) {
      return res.status(403).json({ error: 'Access denied: You can only view your own sessions' });
    }
    const result = await unifiedTaxFlowRoutes.getUserSessions(req.params.userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /integrations/tax/user/:userId/summary
 * Get tax filing summary for user dashboard
 * SECURITY: Requires auth, user can only access their own summary
 */
router.get('/tax/user/:userId/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Users can only access their own summary
    if (req.params.userId !== user.id && !user.isAdmin) {
      return res.status(403).json({ error: 'Access denied: You can only view your own summary' });
    }
    const result = await unifiedTaxFlowRoutes.getFilingSummary(req.params.userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// WEBHOOK ENDPOINTS (with signature verification)
// ============================================================================

/**
 * POST /integrations/webhook/ikickitz
 * Handle webhooks from iKickItz
 * SECURITY: Verifies HMAC signature
 */
router.post('/webhook/ikickitz', async (req: Request, res: Response) => {
  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-ikickitz-signature'] as string;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRETS.ikickitz, 'iKickItz')) {
      logger.warn('Invalid webhook signature from iKickItz', {
        ip: req.ip,
        headers: req.headers,
      });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    await platformBridgeRoutes.ikickitzWebhook(req.body);
    res.json({ received: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/webhook/mgr
 * Handle webhooks from MGR Elite Hub
 * SECURITY: Verifies HMAC signature
 */
router.post('/webhook/mgr', async (req: Request, res: Response) => {
  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-mgr-signature'] as string;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRETS.mgr, 'MGR')) {
      logger.warn('Invalid webhook signature from MGR', {
        ip: req.ip,
        headers: req.headers,
      });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    await platformBridgeRoutes.mgrWebhook(req.body);
    res.json({ received: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /integrations/webhook/irs
 * Handle IRS acceptance/rejection webhooks
 * SECURITY: Verifies HMAC signature
 */
router.post('/webhook/irs', async (req: Request, res: Response) => {
  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-irs-signature'] as string;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRETS.irs, 'IRS')) {
      logger.warn('Invalid webhook signature from IRS', {
        ip: req.ip,
        headers: req.headers,
      });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    await mgrBridgeRoutes.irsWebhook(req.body);
    res.json({ received: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// PREP FEE CALCULATOR (PUBLIC)
// ============================================================================

/**
 * GET /integrations/prep-fee/estimate
 * Get prep fee estimate without creating a return
 */
router.get('/prep-fee/estimate', async (req: Request, res: Response) => {
  try {
    const {
      returnType = '1040',
      hasW2 = 'false',
      hasSelfEmployment = 'false',
      hasInvestments = 'false',
      hasRentalIncome = 'false',
      isTimePayCustomer = 'false',
      isIKickItzCreator = 'false',
    } = req.query;

    const formsRequired: string[] = [];
    let complexityLevel: 'simple' | 'moderate' | 'complex' | 'veryComplex' = 'simple';

    if (hasSelfEmployment === 'true') {
      formsRequired.push('Schedule C', 'Schedule SE');
      complexityLevel = 'moderate';
    }

    if (hasInvestments === 'true') {
      formsRequired.push('Schedule D', 'Form 8949');
      complexityLevel = complexityLevel === 'moderate' ? 'complex' : 'moderate';
    }

    if (hasRentalIncome === 'true') {
      formsRequired.push('Schedule E');
      complexityLevel = complexityLevel === 'complex' ? 'veryComplex' : 'complex';
    }

    const result = await mgrBridgeRoutes.calculatePrepFee({
      returnType: returnType as MGRReturnType,
      options: {
        formsRequired,
        complexityLevel,
        isTimePayCustomer: isTimePayCustomer === 'true',
        isIKickItzCreator: isIKickItzCreator === 'true',
      },
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

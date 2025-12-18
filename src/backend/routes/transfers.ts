/**
 * TIME Transfer API Routes v2.0
 *
 * Endpoints for ACATS transfers and account transfers.
 * Now with MongoDB persistence and async operations.
 */

import { Router, Request, Response } from 'express';
import { acatsManager, SUPPORTED_BROKERS } from '../transfers/acats_transfer';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('TransfersRoute');
const router = Router();

/**
 * GET /api/v1/transfers/brokers
 * Get list of supported brokers for transfers
 */
router.get('/brokers', (req: Request, res: Response) => {
  try {
    const brokers = acatsManager.getSupportedBrokers();
    const { category } = req.query;

    // Filter by category if specified
    let filteredBrokers = brokers;
    if (category) {
      const categoryMap: Record<string, string[]> = {
        traditional: ['fidelity', 'schwab', 'vanguard', 'td_ameritrade', 'etrade', 'merrill', 'morgan_stanley', 'jpmorgan', 'wells_fargo', 'ubs', 'goldman', 'raymond_james', 'edward_jones', 'lpl', 'ameriprise'],
        modern: ['robinhood', 'webull', 'cashapp', 'sofi', 'public', 'stash', 'acorns', 'betterment', 'wealthfront', 'm1_finance', 'ally', 'firstrade', 'tradier', 'moomoo', 'dough'],
        retirement: ['tiaa', 'principal', 'empower', 'fidelity_401k', 'transamerica', 'voya', 'axa', 'prudential', 'lincoln', 'john_hancock', 'nationwide'],
        bank: ['chase', 'bofa', 'citi', 'pnc', 'usbank', 'bbva', 'suntrust', 'regions', 'keybank', 'huntington', 'fifth_third', 'zions'],
        crypto: ['coinbase', 'gemini', 'kraken', 'crypto_com', 'blockfi'],
      };
      const ids = categoryMap[category as string] || [];
      filteredBrokers = brokers.filter(b => ids.includes(b.id));
    }

    res.json({
      success: true,
      data: {
        brokers: filteredBrokers,
        totalCount: brokers.length,
        categories: ['traditional', 'modern', 'retirement', 'bank', 'crypto'],
        message: 'List of brokers you can transfer from',
      },
    });
  } catch (error) {
    logger.error('Get brokers failed', { error });
    res.status(500).json({ error: 'Failed to get brokers' });
  }
});

/**
 * POST /api/v1/transfers/initiate
 * Initiate a new ACATS transfer
 */
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      receivingAccountId,
      transferType,
      deliveringBrokerId,
      deliveringAccountNumber,
      deliveringAccountTitle,
      ssnLast4,
      assets,
      userInfo,
    } = req.body;

    if (!userId || !receivingAccountId || !deliveringBrokerId || !deliveringAccountNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!userInfo?.fullName || !userInfo?.dateOfBirth || !userInfo?.address) {
      return res.status(400).json({ error: 'Missing user info (fullName, dateOfBirth, address)' });
    }

    const transfer = await acatsManager.initiateTransfer(
      {
        userId,
        receivingAccountId,
        transferType: transferType || 'full',
        deliveringBrokerId,
        deliveringAccountNumber,
        deliveringAccountTitle,
        ssnLast4,
        assets,
      },
      userInfo
    );

    res.json({
      success: true,
      data: {
        transfer,
        nextSteps: [
          'Upload your most recent account statement from the delivering broker',
          'Verify your identity information is correct',
          'Submit the transfer when ready',
        ],
        message: 'Transfer initiated. Please upload required documents to proceed.',
      },
    });
  } catch (error) {
    logger.error('Initiate transfer failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to initiate transfer' });
  }
});

/**
 * POST /api/v1/transfers/:transferId/submit
 * Submit transfer for processing
 */
router.post('/:transferId/submit', async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;

    const transfer = await acatsManager.submitTransfer(transferId);

    res.json({
      success: true,
      data: {
        transfer,
        message: 'Transfer submitted. Expected completion: ' + transfer.expectedCompletionDate?.toDateString(),
        timeline: {
          submitted: new Date(),
          expectedCompletion: transfer.expectedCompletionDate,
          businessDays: '5-7',
        },
      },
    });
  } catch (error) {
    logger.error('Submit transfer failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit transfer' });
  }
});

/**
 * GET /api/v1/transfers/:transferId
 * Get transfer details
 */
router.get('/:transferId', async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;

    // Skip if it's the stats endpoint
    if (transferId === 'stats') {
      return res.status(400).json({ error: 'Use /stats/overview for statistics' });
    }

    const transfer = await acatsManager.getTransfer(transferId);

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    logger.error('Get transfer failed', { error });
    res.status(500).json({ error: 'Failed to get transfer' });
  }
});

/**
 * GET /api/v1/transfers
 * Get all transfers for user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const transfers = await acatsManager.getUserTransfers(userId);

    // Group by status
    const byStatus = {
      active: transfers.filter(t => !['completed', 'cancelled', 'failed', 'rejected'].includes(t.status)),
      completed: transfers.filter(t => t.status === 'completed'),
      cancelled: transfers.filter(t => ['cancelled', 'failed', 'rejected'].includes(t.status)),
    };

    res.json({
      success: true,
      data: {
        transfers,
        count: transfers.length,
        byStatus,
      },
    });
  } catch (error) {
    logger.error('Get transfers failed', { error });
    res.status(500).json({ error: 'Failed to get transfers' });
  }
});

/**
 * POST /api/v1/transfers/:transferId/cancel
 * Cancel a transfer
 */
router.post('/:transferId/cancel', async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const transfer = await acatsManager.cancelTransfer(transferId, userId);

    res.json({
      success: true,
      data: {
        transfer,
        message: 'Transfer cancelled',
      },
    });
  } catch (error) {
    logger.error('Cancel transfer failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to cancel transfer' });
  }
});

/**
 * POST /api/v1/transfers/:transferId/documents
 * Add document to transfer
 */
router.post('/:transferId/documents', async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;
    const { type, fileName } = req.body;

    if (!type || !fileName) {
      return res.status(400).json({ error: 'type and fileName are required' });
    }

    const validTypes = ['transfer_form', 'account_statement', 'signature', 'identity'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid document type. Valid types: ${validTypes.join(', ')}` });
    }

    const transfer = await acatsManager.addDocument(transferId, {
      type,
      fileName,
    });

    res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    logger.error('Add document failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add document' });
  }
});

/**
 * PUT /api/v1/transfers/:transferId/assets
 * Update assets for partial transfer
 */
router.put('/:transferId/assets', async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;
    const { assets } = req.body;

    if (!assets || !Array.isArray(assets)) {
      return res.status(400).json({ error: 'assets array is required' });
    }

    const transfer = await acatsManager.updateAssets(transferId, assets);

    res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    logger.error('Update assets failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update assets' });
  }
});

/**
 * GET /api/v1/transfers/stats/overview
 * Get transfer statistics
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const stats = await acatsManager.getStatistics();

    res.json({
      success: true,
      data: {
        ...stats,
        supportedBrokerCount: SUPPORTED_BROKERS.length,
      },
    });
  } catch (error) {
    logger.error('Get transfer stats failed', { error });
    res.status(500).json({ error: 'Failed to get transfer statistics' });
  }
});

export default router;

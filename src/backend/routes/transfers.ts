/**
 * TIME Transfer API Routes
 *
 * Endpoints for ACATS transfers and account transfers.
 */

import { Router, Request, Response } from 'express';
import { acatsManager, SUPPORTED_BROKERS } from '../transfers/acats_transfer';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/transfers/brokers
 * Get list of supported brokers for transfers
 */
router.get('/brokers', (req: Request, res: Response) => {
  try {
    const brokers = acatsManager.getSupportedBrokers();

    res.json({
      success: true,
      data: {
        brokers,
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
router.get('/:transferId', (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;

    const transfer = acatsManager.getTransfer(transferId);

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
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const transfers = acatsManager.getUserTransfers(userId);

    res.json({
      success: true,
      data: {
        transfers,
        count: transfers.length,
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
router.post('/:transferId/documents', (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;
    const { type, fileName } = req.body;

    if (!type || !fileName) {
      return res.status(400).json({ error: 'type and fileName are required' });
    }

    const transfer = acatsManager.addDocument(transferId, {
      type,
      fileName,
      uploadedAt: new Date(),
      verified: false,
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
 * GET /api/v1/transfers/stats
 * Get transfer statistics
 */
router.get('/stats/overview', (req: Request, res: Response) => {
  try {
    const stats = acatsManager.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get transfer stats failed', { error });
    res.status(500).json({ error: 'Failed to get transfer statistics' });
  }
});

export default router;

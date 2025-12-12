/**
 * Trading Mode Routes
 *
 * API endpoints for managing practice/live trading mode toggle.
 */

import { Router, Request, Response } from 'express';
import tradingModeService, { TradingMode } from '../services/TradingModeService';
import logger from '../utils/logger';

const router = Router();

// ===========================================
// GET /trading-mode/status
// Get current trading mode status for all brokers
// ===========================================
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = tradingModeService.getStatusSummary();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('[TradingMode] Error getting status:', error);
    res.status(500).json({ success: false, error: 'Failed to get trading mode status' });
  }
});

// ===========================================
// GET /trading-mode/global
// Get current global trading mode
// ===========================================
router.get('/global', (req: Request, res: Response) => {
  try {
    const mode = tradingModeService.getGlobalMode();
    const isPractice = tradingModeService.isPracticeMode();

    res.json({
      success: true,
      data: {
        mode,
        isPractice,
        isLive: !isPractice,
        liveUnlocked: tradingModeService.isLiveUnlocked()
      }
    });
  } catch (error) {
    logger.error('[TradingMode] Error getting global mode:', error);
    res.status(500).json({ success: false, error: 'Failed to get global mode' });
  }
});

// ===========================================
// POST /trading-mode/global
// Set global trading mode (affects all brokers)
// ===========================================
router.post('/global', async (req: Request, res: Response) => {
  try {
    const { mode, confirmation } = req.body;
    const userId = (req as any).userId || 'admin';

    if (!mode || !['practice', 'live'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be "practice" or "live"'
      });
    }

    const result = await tradingModeService.setGlobalMode(
      mode as TradingMode,
      userId,
      confirmation
    );

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    logger.error('[TradingMode] Error setting global mode:', error);
    res.status(500).json({ success: false, error: 'Failed to set global mode' });
  }
});

// ===========================================
// POST /trading-mode/toggle
// Quick toggle between practice and live
// ===========================================
router.post('/toggle', async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;
    const userId = (req as any).userId || 'admin';

    const result = await tradingModeService.toggleGlobalMode(userId, confirmation);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    logger.error('[TradingMode] Error toggling mode:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle mode' });
  }
});

// ===========================================
// GET /trading-mode/broker/:brokerId
// Get mode for specific broker
// ===========================================
router.get('/broker/:brokerId', (req: Request, res: Response) => {
  try {
    const { brokerId } = req.params;
    const mode = tradingModeService.getBrokerMode(brokerId);
    const endpoint = tradingModeService.getBrokerEndpoint(brokerId);

    res.json({
      success: true,
      data: {
        brokerId,
        mode,
        endpoint,
        isPractice: mode === 'practice'
      }
    });
  } catch (error) {
    logger.error('[TradingMode] Error getting broker mode:', error);
    res.status(500).json({ success: false, error: 'Failed to get broker mode' });
  }
});

// ===========================================
// POST /trading-mode/broker/:brokerId
// Set mode for specific broker
// ===========================================
router.post('/broker/:brokerId', async (req: Request, res: Response) => {
  try {
    const { brokerId } = req.params;
    const { mode, confirmation } = req.body;
    const userId = (req as any).userId || 'admin';

    if (!mode || !['practice', 'live'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be "practice" or "live"'
      });
    }

    const result = await tradingModeService.setBrokerMode(
      brokerId,
      mode as TradingMode,
      userId,
      confirmation
    );

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    logger.error('[TradingMode] Error setting broker mode:', error);
    res.status(500).json({ success: false, error: 'Failed to set broker mode' });
  }
});

// ===========================================
// POST /trading-mode/unlock-live
// Unlock live trading (requires acknowledgement)
// ===========================================
router.post('/unlock-live', (req: Request, res: Response) => {
  try {
    const { acknowledgement } = req.body;
    const userId = (req as any).userId || 'admin';

    const result = tradingModeService.unlockLiveTrading(userId, acknowledgement);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    logger.error('[TradingMode] Error unlocking live trading:', error);
    res.status(500).json({ success: false, error: 'Failed to unlock live trading' });
  }
});

// ===========================================
// POST /trading-mode/lock-live
// Lock live trading (force practice mode)
// ===========================================
router.post('/lock-live', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || 'admin';
    const result = tradingModeService.lockLiveTrading(userId);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    logger.error('[TradingMode] Error locking live trading:', error);
    res.status(500).json({ success: false, error: 'Failed to lock live trading' });
  }
});

// ===========================================
// GET /trading-mode/brokers
// Get all broker modes
// ===========================================
router.get('/brokers', (req: Request, res: Response) => {
  try {
    const brokers = tradingModeService.getAllBrokerModes();

    res.json({
      success: true,
      data: {
        count: brokers.length,
        brokers
      }
    });
  } catch (error) {
    logger.error('[TradingMode] Error getting all broker modes:', error);
    res.status(500).json({ success: false, error: 'Failed to get broker modes' });
  }
});

export default router;

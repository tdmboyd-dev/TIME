/**
 * TIME Tokenized Assets API Routes
 *
 * Endpoints for fractional investing and tokenized assets trading
 */

import { Router, Request, Response } from 'express';
import tokenizedAssets from '../assets/tokenized_assets';

const router = Router();

// ============================================================================
// Asset Discovery
// ============================================================================

/**
 * GET /api/assets
 * Get all available tokenized assets
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const filters = {
      assetClass: req.query.class as any,
      minYield: req.query.minYield ? parseFloat(req.query.minYield as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      jurisdiction: req.query.jurisdiction as string,
    };

    const assets = tokenizedAssets.getAssets(filters);

    res.json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/assets/:id
 * Get detailed asset listing with order book
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const listing = tokenizedAssets.getAssetListing(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    res.json({
      success: true,
      ...listing,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Trading
// ============================================================================

/**
 * POST /api/assets/:id/buy
 * Place a buy order for fractional tokens
 */
router.post('/:id/buy', async (req: Request, res: Response) => {
  try {
    const { userId, amount, orderType, limitPrice } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'userId and amount are required',
      });
    }

    const order = await tokenizedAssets.placeBuyOrder(
      userId,
      req.params.id,
      parseFloat(amount),
      orderType || 'market',
      limitPrice ? parseFloat(limitPrice) : undefined
    );

    res.json({
      success: true,
      order,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/:id/sell
 * Place a sell order
 */
router.post('/:id/sell', async (req: Request, res: Response) => {
  try {
    const { userId, quantity, orderType, limitPrice } = req.body;

    if (!userId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'userId and quantity are required',
      });
    }

    const order = await tokenizedAssets.placeSellOrder(
      userId,
      req.params.id,
      parseFloat(quantity),
      orderType || 'market',
      limitPrice ? parseFloat(limitPrice) : undefined
    );

    res.json({
      success: true,
      order,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Portfolio Management
// ============================================================================

/**
 * GET /api/assets/portfolio/:userId
 * Get user's tokenized asset portfolio
 */
router.get('/portfolio/:userId', (req: Request, res: Response) => {
  try {
    const portfolio = tokenizedAssets.getPortfolio(req.params.userId);

    res.json({
      success: true,
      portfolio,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/portfolio/:userId/reinvest
 * Enable/disable yield reinvestment for a position
 */
router.post('/portfolio/:userId/reinvest', (req: Request, res: Response) => {
  try {
    const { assetId, enabled } = req.body;

    if (!assetId || enabled === undefined) {
      return res.status(400).json({
        success: false,
        error: 'assetId and enabled are required',
      });
    }

    tokenizedAssets.enableYieldReinvestment(req.params.userId, assetId, enabled);

    res.json({
      success: true,
      message: `Yield reinvestment ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/portfolio/:userId/claim
 * Claim pending yield for an asset
 */
router.post('/portfolio/:userId/claim', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.body;

    if (!assetId) {
      return res.status(400).json({
        success: false,
        error: 'assetId is required',
      });
    }

    const claimed = await tokenizedAssets.claimYield(req.params.userId, assetId);

    res.json({
      success: true,
      claimed,
      message: `Claimed $${claimed.toFixed(2)} in yield`,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;

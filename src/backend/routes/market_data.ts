/**
 * TIME Market Data API Routes
 *
 * Endpoints for real-time quotes, historical data, and streaming
 */

import { Router, Request, Response } from 'express';
import marketData, { TimeFrame, DataProvider } from '../data/market_data_providers';

const router = Router();

// ============================================================================
// Quote Endpoints
// ============================================================================

/**
 * GET /api/market/quote/:symbol
 * Get real-time quote for a symbol
 */
router.get('/quote/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const provider = req.query.provider as DataProvider | undefined;

    const quote = await marketData.getQuote(symbol, provider);

    res.json({
      success: true,
      quote,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/market/quotes
 * Get quotes for multiple symbols
 */
router.post('/quotes', async (req: Request, res: Response) => {
  try {
    const { symbols, provider } = req.body;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'symbols array required',
      });
    }

    const quotes = await marketData.getQuotes(symbols, provider);

    res.json({
      success: true,
      quotes: Object.fromEntries(quotes),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/market/aggregated/:symbol
 * Get aggregated quote from all providers
 */
router.get('/aggregated/:symbol', async (req: Request, res: Response) => {
  try {
    const quote = await marketData.getAggregatedQuote(req.params.symbol);

    res.json({
      success: true,
      quote,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Historical Data Endpoints
// ============================================================================

/**
 * GET /api/market/history/:symbol
 * Get historical OHLCV data
 */
router.get('/history/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const timeframe = (req.query.timeframe || '1d') as TimeFrame;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const provider = req.query.provider as DataProvider | undefined;

    const historical = await marketData.getHistoricalData(symbol, timeframe, limit, provider);

    res.json({
      success: true,
      data: historical,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/market/analysis/:symbol
 * Get historical data with technical indicators
 */
router.get('/analysis/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const timeframe = (req.query.timeframe || '1d') as TimeFrame;

    const indicators = [
      { name: 'SMA' as const, period: 20 },
      { name: 'EMA' as const, period: 12 },
      { name: 'RSI' as const, period: 14 },
      { name: 'MACD' as const, period: 12 },
      { name: 'BB' as const, period: 20 },
    ];

    const result = await marketData.getHistoricalWithIndicators(symbol, timeframe, indicators);

    res.json({
      success: true,
      historical: result.historical,
      indicators: Object.fromEntries(result.indicators),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Search & Discovery
// ============================================================================

/**
 * GET /api/market/search
 * Search for symbols
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter q required',
      });
    }

    const results = await marketData.searchSymbols(query);

    res.json({
      success: true,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Market Status
// ============================================================================

/**
 * GET /api/market/status
 * Get market status for all market types
 */
router.get('/status', (req: Request, res: Response) => {
  const marketTypes = ['stocks', 'forex', 'crypto', 'options', 'commodities'] as const;

  const status = marketTypes.map(type => ({
    type,
    isOpen: marketData.isMarketOpen(type),
    nextOpen: marketData.isMarketOpen(type) ? null : marketData.getNextMarketOpen(type),
  }));

  res.json({
    success: true,
    timestamp: new Date(),
    providers: marketData.getAvailableProviders(),
    markets: status,
  });
});

export default router;

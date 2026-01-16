/**
 * TIME Real Market Data API Routes
 *
 * RESTful API endpoints for real market data integration
 * Connects to actual market data providers
 */

import { Router, Request, Response } from 'express';
import { realMarketData } from '../data/real_market_data_integration';

const router = Router();

// ============================================================================
// Stock Endpoints
// ============================================================================

/**
 * GET /api/real-market/stock/:symbol
 * Get real-time stock quote
 */
router.get('/stock/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const quote = await realMarketData.getStockQuote(symbol.toUpperCase());

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        message: 'Unable to get quote. Make sure API keys are configured.',
        symbol,
      });
    }

    res.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/real-market/stocks
 * Get multiple stock quotes
 * Query: ?symbols=AAPL,GOOGL,MSFT
 */
router.get('/stocks', async (req: Request, res: Response) => {
  try {
    const symbolsParam = req.query.symbols as string;
    if (!symbolsParam) {
      return res.status(400).json({
        success: false,
        error: 'Missing symbols parameter',
      });
    }

    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
    const quotes = await realMarketData.getBatchQuotes(symbols);

    res.json({
      success: true,
      data: Object.fromEntries(quotes),
      count: quotes.size,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Crypto Endpoints
// ============================================================================

/**
 * GET /api/real-market/crypto/:symbol
 * Get real-time crypto quote
 */
router.get('/crypto/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const quote = await realMarketData.getCryptoQuote(symbol.toUpperCase());

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Crypto quote not found',
        symbol,
      });
    }

    res.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/real-market/crypto/top/:limit
 * Get top cryptocurrencies by market cap
 */
router.get('/crypto/top/:limit', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.params.limit) || 100;
    const cryptos = await realMarketData.getTopCryptos(Math.min(limit, 250));

    res.json({
      success: true,
      data: cryptos,
      count: cryptos.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Search Endpoints (THE SEARCH BAR!)
// ============================================================================

/**
 * GET /api/real-market/search
 * Universal search across all asset types
 * Query: ?q=apple&type=all|stock|crypto
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const type = (req.query.type as string) || 'all';

    if (query.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 1 character',
      });
    }

    let results;
    switch (type) {
      case 'stock':
        results = await realMarketData.searchStocks(query);
        break;
      case 'crypto':
        results = await realMarketData.searchCrypto(query);
        break;
      case 'all':
      default:
        results = await realMarketData.searchAll(query);
    }

    res.json({
      success: true,
      data: results,
      count: results.length,
      query,
      type,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/real-market/search/stocks
 * Search stocks only
 */
router.get('/search/stocks', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';

    if (query.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
      });
    }

    const results = await realMarketData.searchStocks(query);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/real-market/search/crypto
 * Search cryptocurrencies only
 */
router.get('/search/crypto', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';

    if (query.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
      });
    }

    const results = await realMarketData.searchCrypto(query);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Historical Data
// ============================================================================

/**
 * GET /api/real-market/history/:type/:symbol
 * Get historical price data
 * Params: type = stock | crypto
 * Query: ?interval=day|hour|minute&limit=100
 */
router.get('/history/:type/:symbol', async (req: Request, res: Response) => {
  try {
    const { type, symbol } = req.params;
    const interval = (req.query.interval as string) || 'day';
    const limit = parseInt(req.query.limit as string) || 100;

    if (!['stock', 'crypto'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be "stock" or "crypto"',
      });
    }

    const data = await realMarketData.getHistoricalData(
      symbol.toUpperCase(),
      type as 'stock' | 'crypto',
      interval,
      limit
    );

    res.json({
      success: true,
      data,
      count: data.length,
      symbol: symbol.toUpperCase(),
      type,
      interval,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Market News
// ============================================================================

/**
 * GET /api/real-market/news
 * Get market news
 * Query: ?category=general|forex|crypto|merger
 */
router.get('/news', async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'general';
    const news = await realMarketData.getMarketNews(category);

    res.json({
      success: true,
      data: news,
      count: news.length,
      category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Provider Status
// ============================================================================

/**
 * GET /api/real-market/status
 * Get status of all data providers
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = realMarketData.getProviderStatus();

    res.json({
      success: true,
      providers: status,
      message: 'Configure API keys in .env file for full functionality',
      instructions: {
        alphaVantage: 'Get free key at: https://www.alphavantage.co/support/#api-key',
        finnhub: 'Get free key at: https://finnhub.io/register',
        polygon: 'Subscribe at: https://polygon.io/pricing',
        coinGecko: 'No API key needed (free)',
        binance: 'Create account at: https://www.binance.com',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Quick Quote (for search bar autocomplete)
// ============================================================================

/**
 * GET /api/real-market/quick-quote/:symbol
 * Fast price lookup for search bar
 */
router.get('/quick-quote/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();

    // Determine if crypto or stock
    const cryptoSymbols = ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC', 'LINK'];
    const isCrypto = cryptoSymbols.some(c => upperSymbol.includes(c));

    const quote = isCrypto
      ? await realMarketData.getCryptoQuote(upperSymbol)
      : await realMarketData.getStockQuote(upperSymbol);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
      });
    }

    // Return minimal data for quick display
    const quoteData = quote as any;
    res.json({
      success: true,
      data: {
        symbol: upperSymbol,
        price: quoteData.price || 0,
        change: quoteData.change || quoteData.change24h || 0,
        changePercent: quoteData.changePercent || quoteData.changePercent24h || 0,
        type: isCrypto ? 'crypto' : 'stock',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

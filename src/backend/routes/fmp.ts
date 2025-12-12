/**
 * TIME - FMP (Financial Modeling Prep) API Routes
 *
 * Endpoints for financial data, fundamentals, and congressional trading
 */

import { Router, Request, Response } from 'express';
import { fmpAPI } from '../data/fmp_integration';

const router = Router();

// ============================================================================
// Company Information
// ============================================================================

router.get('/profile/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const profile = await fmpAPI.getCompanyProfile(symbol.toUpperCase());

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/quote/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const quote = await fmpAPI.getQuote(symbol.toUpperCase());

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    res.json({ success: true, data: quote });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/batch-quotes', async (req: Request, res: Response) => {
  try {
    const symbols = (req.query.symbols as string)?.split(',') || [];
    if (symbols.length === 0) {
      return res.status(400).json({ success: false, error: 'symbols query param required' });
    }

    const quotes = await fmpAPI.getBatchQuotes(symbols.map(s => s.toUpperCase()));
    res.json({ success: true, data: quotes, count: quotes.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ success: false, error: 'q query param required' });
    }

    const results = await fmpAPI.searchSymbol(query);
    res.json({ success: true, data: results, count: results.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Financial Statements
// ============================================================================

router.get('/income-statement/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const period = (req.query.period as 'annual' | 'quarter') || 'annual';
    const limit = parseInt(req.query.limit as string) || 5;

    const statements = await fmpAPI.getIncomeStatement(symbol.toUpperCase(), period, limit);
    res.json({ success: true, data: statements, count: statements.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/balance-sheet/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const period = (req.query.period as 'annual' | 'quarter') || 'annual';
    const limit = parseInt(req.query.limit as string) || 5;

    const statements = await fmpAPI.getBalanceSheet(symbol.toUpperCase(), period, limit);
    res.json({ success: true, data: statements, count: statements.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/cash-flow/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const period = (req.query.period as 'annual' | 'quarter') || 'annual';
    const limit = parseInt(req.query.limit as string) || 5;

    const statements = await fmpAPI.getCashFlowStatement(symbol.toUpperCase(), period, limit);
    res.json({ success: true, data: statements, count: statements.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/financials/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const period = (req.query.period as 'annual' | 'quarter') || 'annual';
    const upperSymbol = symbol.toUpperCase();

    const [income, balance, cashFlow] = await Promise.all([
      fmpAPI.getIncomeStatement(upperSymbol, period, 3),
      fmpAPI.getBalanceSheet(upperSymbol, period, 3),
      fmpAPI.getCashFlowStatement(upperSymbol, period, 3)
    ]);

    res.json({
      success: true,
      data: {
        incomeStatement: income,
        balanceSheet: balance,
        cashFlowStatement: cashFlow
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Key Metrics & Ratios
// ============================================================================

router.get('/metrics/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const period = (req.query.period as 'annual' | 'quarter') || 'annual';

    const metrics = await fmpAPI.getKeyMetrics(symbol.toUpperCase(), period);
    res.json({ success: true, data: metrics, count: metrics.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ratios/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const period = (req.query.period as 'annual' | 'quarter') || 'annual';

    const ratios = await fmpAPI.getFinancialRatios(symbol.toUpperCase(), period);
    res.json({ success: true, data: ratios, count: ratios.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/scores/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const scores = await fmpAPI.getFinancialScores(symbol.toUpperCase());

    if (!scores) {
      return res.status(404).json({ success: false, error: 'Scores not found' });
    }

    res.json({ success: true, data: scores });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Stock Screener
// ============================================================================

router.get('/screener', async (req: Request, res: Response) => {
  try {
    const params: any = {};

    if (req.query.marketCapMoreThan) params.marketCapMoreThan = parseFloat(req.query.marketCapMoreThan as string);
    if (req.query.marketCapLowerThan) params.marketCapLowerThan = parseFloat(req.query.marketCapLowerThan as string);
    if (req.query.sector) params.sector = req.query.sector as string;
    if (req.query.industry) params.industry = req.query.industry as string;
    if (req.query.betaMoreThan) params.betaMoreThan = parseFloat(req.query.betaMoreThan as string);
    if (req.query.betaLowerThan) params.betaLowerThan = parseFloat(req.query.betaLowerThan as string);
    if (req.query.priceMoreThan) params.priceMoreThan = parseFloat(req.query.priceMoreThan as string);
    if (req.query.priceLowerThan) params.priceLowerThan = parseFloat(req.query.priceLowerThan as string);
    if (req.query.dividendMoreThan) params.dividendMoreThan = parseFloat(req.query.dividendMoreThan as string);
    if (req.query.volumeMoreThan) params.volumeMoreThan = parseFloat(req.query.volumeMoreThan as string);
    if (req.query.exchange) params.exchange = req.query.exchange as string;
    if (req.query.country) params.country = req.query.country as string;
    if (req.query.isEtf) params.isEtf = req.query.isEtf === 'true';
    if (req.query.limit) params.limit = parseInt(req.query.limit as string);

    const results = await fmpAPI.stockScreener(params);
    res.json({ success: true, data: results, count: results.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Congressional Trading (THE GOLD MINE!)
// ============================================================================

router.get('/senate-trades', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const trades = await fmpAPI.getLatestSenateTrades(page, limit);
    res.json({ success: true, data: trades, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/senate-trades/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const trades = await fmpAPI.getSenateTradesBySymbol(symbol.toUpperCase());
    res.json({ success: true, data: trades, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/senate-trades-by-name/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const trades = await fmpAPI.getSenateTradesByName(name);
    res.json({ success: true, data: trades, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/house-trades', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const trades = await fmpAPI.getLatestHouseTrades(page, limit);
    res.json({ success: true, data: trades, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/house-trades/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const trades = await fmpAPI.getHouseTradesBySymbol(symbol.toUpperCase());
    res.json({ success: true, data: trades, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Insider Trading
// ============================================================================

router.get('/insider-trades', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const trades = await fmpAPI.getLatestInsiderTrades(page, limit);
    res.json({ success: true, data: trades, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/insider-trades/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const trades = await fmpAPI.getInsiderTradesBySymbol(symbol.toUpperCase());
    res.json({ success: true, data: trades, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/insider-stats/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const stats = await fmpAPI.getInsiderTradeStatistics(symbol.toUpperCase());

    if (!stats) {
      return res.status(404).json({ success: false, error: 'Stats not found' });
    }

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Earnings, Dividends, Splits
// ============================================================================

router.get('/earnings-calendar', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;

    const earnings = await fmpAPI.getEarningsCalendar(from, to);
    res.json({ success: true, data: earnings, count: earnings.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dividends-calendar', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;

    const dividends = await fmpAPI.getDividendsCalendar(from, to);
    res.json({ success: true, data: dividends, count: dividends.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dividends/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const dividends = await fmpAPI.getCompanyDividends(symbol.toUpperCase());
    res.json({ success: true, data: dividends, count: dividends.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/splits/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const splits = await fmpAPI.getStockSplits(symbol.toUpperCase());
    res.json({ success: true, data: splits, count: splits.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ipo-calendar', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;

    const ipos = await fmpAPI.getIPOCalendar(from, to);
    res.json({ success: true, data: ipos, count: ipos.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// News
// ============================================================================

router.get('/news', async (req: Request, res: Response) => {
  try {
    const symbols = req.query.symbols ? (req.query.symbols as string).split(',') : undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const news = await fmpAPI.getStockNews(symbols, limit);
    res.json({ success: true, data: news, count: news.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/news/general', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;

    const news = await fmpAPI.getGeneralNews(page, limit);
    res.json({ success: true, data: news, count: news.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/news/crypto', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const news = await fmpAPI.getCryptoNews(limit);
    res.json({ success: true, data: news, count: news.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/news/forex', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const news = await fmpAPI.getForexNews(limit);
    res.json({ success: true, data: news, count: news.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DCF Valuation
// ============================================================================

router.get('/dcf/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const dcf = await fmpAPI.getDCF(symbol.toUpperCase());

    if (!dcf) {
      return res.status(404).json({ success: false, error: 'DCF not found' });
    }

    res.json({ success: true, data: dcf });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dcf-levered/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const dcf = await fmpAPI.getLeveredDCF(symbol.toUpperCase());

    if (!dcf) {
      return res.status(404).json({ success: false, error: 'DCF not found' });
    }

    res.json({ success: true, data: dcf });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Market Performance
// ============================================================================

router.get('/gainers', async (req: Request, res: Response) => {
  try {
    const gainers = await fmpAPI.getBiggestGainers();
    res.json({ success: true, data: gainers, count: gainers.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/losers', async (req: Request, res: Response) => {
  try {
    const losers = await fmpAPI.getBiggestLosers();
    res.json({ success: true, data: losers, count: losers.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/most-active', async (req: Request, res: Response) => {
  try {
    const active = await fmpAPI.getMostActive();
    res.json({ success: true, data: active, count: active.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sector-performance', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;
    const performance = await fmpAPI.getSectorPerformance(date);
    res.json({ success: true, data: performance, count: performance.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Indices
// ============================================================================

router.get('/sp500', async (req: Request, res: Response) => {
  try {
    const constituents = await fmpAPI.getSP500Constituents();
    res.json({ success: true, data: constituents, count: constituents.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/nasdaq', async (req: Request, res: Response) => {
  try {
    const constituents = await fmpAPI.getNasdaqConstituents();
    res.json({ success: true, data: constituents, count: constituents.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dowjones', async (req: Request, res: Response) => {
  try {
    const constituents = await fmpAPI.getDowJonesConstituents();
    res.json({ success: true, data: constituents, count: constituents.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// API Status
// ============================================================================

router.get('/status', (req: Request, res: Response) => {
  const stats = fmpAPI.getCallStats();
  res.json({
    success: true,
    data: {
      available: fmpAPI.isAvailable(),
      callsToday: stats.today,
      callsRemaining: stats.remaining,
      dailyLimit: 250
    }
  });
});

export default router;

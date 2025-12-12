/**
 * TIME - FRED (Federal Reserve Economic Data) API Routes
 *
 * Endpoints for economic data, treasury yields, and macro indicators
 */

import { Router, Request, Response } from 'express';
import { fredAPI, FRED_SERIES } from '../data/fred_integration';

const router = Router();

// ============================================================================
// Pre-built Dashboards
// ============================================================================

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await fredAPI.getEconomicDashboard();
    res.json({
      success: true,
      data: dashboard,
      message: 'Full economic dashboard'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Treasury Yields
// ============================================================================

router.get('/yields', async (req: Request, res: Response) => {
  try {
    const yields = await fredAPI.getTreasuryYields();
    res.json({
      success: true,
      data: yields,
      message: 'Treasury yield curve'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recession-indicator', async (req: Request, res: Response) => {
  try {
    const spread = await fredAPI.getYieldCurveSpread();
    res.json({
      success: true,
      data: spread,
      message: spread.isInverted
        ? 'WARNING: Yield curve is inverted - recession indicator!'
        : 'Yield curve is normal - no recession signal'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Interest Rates
// ============================================================================

router.get('/fed-funds-rate', async (req: Request, res: Response) => {
  try {
    const rate = await fredAPI.getFedFundsRate();
    res.json({
      success: true,
      data: { fedFundsRate: rate },
      message: 'Current Federal Funds Rate'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/mortgage-rates', async (req: Request, res: Response) => {
  try {
    const rates = await fredAPI.getMortgageRates();
    res.json({
      success: true,
      data: rates,
      message: 'Current mortgage rates'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Employment
// ============================================================================

router.get('/unemployment', async (req: Request, res: Response) => {
  try {
    const rate = await fredAPI.getUnemploymentRate();
    res.json({
      success: true,
      data: { unemploymentRate: rate },
      message: 'Current unemployment rate'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jobless-claims', async (req: Request, res: Response) => {
  try {
    const claims = await fredAPI.getJoblessClaims();
    res.json({
      success: true,
      data: claims,
      message: 'Weekly jobless claims'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Inflation
// ============================================================================

router.get('/inflation', async (req: Request, res: Response) => {
  try {
    const rate = await fredAPI.getInflationRate();
    res.json({
      success: true,
      data: { inflationRate: rate },
      message: 'Current CPI year-over-year inflation rate'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GDP
// ============================================================================

router.get('/gdp-growth', async (req: Request, res: Response) => {
  try {
    const growth = await fredAPI.getGDPGrowth();
    res.json({
      success: true,
      data: { gdpGrowth: growth },
      message: 'GDP growth rate (annualized QoQ)'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Consumer & Sentiment
// ============================================================================

router.get('/consumer-sentiment', async (req: Request, res: Response) => {
  try {
    const sentiment = await fredAPI.getConsumerSentiment();
    res.json({
      success: true,
      data: { consumerSentiment: sentiment },
      message: 'University of Michigan Consumer Sentiment'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Market Indicators
// ============================================================================

router.get('/vix', async (req: Request, res: Response) => {
  try {
    const vix = await fredAPI.getVIX();
    res.json({
      success: true,
      data: { vix },
      message: vix && vix > 30 ? 'HIGH FEAR - VIX above 30!' : 'Market fear gauge'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Commodities
// ============================================================================

router.get('/oil-prices', async (req: Request, res: Response) => {
  try {
    const prices = await fredAPI.getOilPrices();
    res.json({
      success: true,
      data: prices,
      message: 'Crude oil prices'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Money Supply
// ============================================================================

router.get('/money-supply', async (req: Request, res: Response) => {
  try {
    const supply = await fredAPI.getMoneySupply();
    res.json({
      success: true,
      data: supply,
      message: 'Money supply (M1 and M2)'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/fed-balance-sheet', async (req: Request, res: Response) => {
  try {
    const balance = await fredAPI.getFedBalanceSheet();
    res.json({
      success: true,
      data: { fedBalanceSheet: balance },
      message: 'Federal Reserve balance sheet size (billions)'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Generic Series Access
// ============================================================================

router.get('/series/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const [info, observations] = await Promise.all([
      fredAPI.getSeriesInfo(id),
      fredAPI.getSeriesObservations(id, { limit, sortOrder: 'desc' })
    ]);

    if (!info) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    res.json({
      success: true,
      data: {
        info,
        observations: observations.map(o => ({
          date: o.date,
          value: o.value !== '.' ? parseFloat(o.value) : null
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/series/:id/latest', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const latest = await fredAPI.getLatestValue(id);

    if (!latest) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    res.json({
      success: true,
      data: latest
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/series/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const years = parseInt(req.query.years as string) || 5;

    const history = await fredAPI.getHistoricalData(id, years);
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Search
// ============================================================================

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ success: false, error: 'q query param required' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const results = await fredAPI.searchSeries(query, limit);

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Available Series Reference
// ============================================================================

router.get('/available-series', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: FRED_SERIES,
    categories: {
      gdp: ['GDP', 'GDPC1', 'GDPPOT'],
      employment: ['UNRATE', 'PAYEMS', 'CIVPART', 'ICSA', 'CCSA'],
      inflation: ['CPIAUCSL', 'CPILFESL', 'PCEPI', 'PCEPILFE', 'T10YIE', 'T5YIE'],
      interestRates: ['FEDFUNDS', 'DFEDTARU', 'DFEDTARL', 'PRIME'],
      treasuryYields: ['DGS1MO', 'DGS3MO', 'DGS6MO', 'DGS1', 'DGS2', 'DGS5', 'DGS10', 'DGS20', 'DGS30'],
      yieldCurve: ['T10Y2Y', 'T10Y3M'],
      housing: ['CSUSHPISA', 'HOUST', 'PERMIT', 'HSN1F', 'EXHOSLUSM495S', 'MORTGAGE30US', 'MORTGAGE15US'],
      consumer: ['UMCSENT', 'PCE', 'PSAVERT', 'DSPIC96', 'RRSFS'],
      manufacturing: ['INDPRO', 'DGORDER', 'MNFCTRIRSA', 'BUSLOANS'],
      stockMarket: ['SP500', 'VIXCLS', 'WILL5000PRFC'],
      moneySupply: ['M1SL', 'M2SL', 'WALCL'],
      trade: ['BOPGSTB', 'DTWEXBGS'],
      commodities: ['DCOILWTICO', 'DCOILBRENTEU', 'GOLDAMGBD228NLBM'],
      creditSpreads: ['BAMLH0A0HYM2', 'BAMLC0A0CM']
    },
    message: 'Use these series IDs with /api/fred/series/:id'
  });
});

// ============================================================================
// API Status
// ============================================================================

router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      available: fredAPI.isAvailable(),
      rateLimit: 'Unlimited',
      totalSeries: '800,000+'
    }
  });
});

export default router;

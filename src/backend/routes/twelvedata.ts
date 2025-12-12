/**
 * TIME - TwelveData API Routes
 *
 * Endpoints for real-time quotes and 50+ technical indicators
 */

import { Router, Request, Response } from 'express';
import { twelveDataAPI } from '../data/twelvedata_integration';

const router = Router();

// ============================================================================
// Real-Time Data
// ============================================================================

router.get('/quote/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const quote = await twelveDataAPI.getQuote(symbol.toUpperCase());

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    res.json({ success: true, data: quote });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const price = await twelveDataAPI.getPrice(symbol.toUpperCase());

    if (price === null) {
      return res.status(404).json({ success: false, error: 'Price not found' });
    }

    res.json({ success: true, data: { symbol: symbol.toUpperCase(), price } });
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

    const quotes = await twelveDataAPI.getBatchQuotes(symbols.map(s => s.toUpperCase()));
    res.json({ success: true, data: quotes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Time Series
// ============================================================================

router.get('/timeseries/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as any) || '1day';
    const outputsize = parseInt(req.query.outputsize as string) || 30;
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;

    const series = await twelveDataAPI.getTimeSeries(symbol.toUpperCase(), {
      interval,
      outputsize,
      startDate,
      endDate
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Time series not found' });
    }

    res.json({ success: true, data: series });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Technical Analysis (THE BIG ONE!)
// ============================================================================

router.get('/analysis/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';

    const analysis = await twelveDataAPI.getTechnicalAnalysis(symbol.toUpperCase(), interval);

    res.json({
      success: true,
      data: analysis,
      message: `Signal: ${analysis.signal.toUpperCase()}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Individual Technical Indicators
// ============================================================================

router.get('/sma/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const period = parseInt(req.query.period as string) || 20;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const sma = await twelveDataAPI.getSMA(symbol.toUpperCase(), interval, period, outputsize);

    if (!sma) {
      return res.status(404).json({ success: false, error: 'SMA data not found' });
    }

    res.json({ success: true, data: sma });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ema/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const period = parseInt(req.query.period as string) || 20;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const ema = await twelveDataAPI.getEMA(symbol.toUpperCase(), interval, period, outputsize);

    if (!ema) {
      return res.status(404).json({ success: false, error: 'EMA data not found' });
    }

    res.json({ success: true, data: ema });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/rsi/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const period = parseInt(req.query.period as string) || 14;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const rsi = await twelveDataAPI.getRSI(symbol.toUpperCase(), interval, period, outputsize);

    if (!rsi) {
      return res.status(404).json({ success: false, error: 'RSI data not found' });
    }

    // Add interpretation
    const latestRSI = rsi.values?.[0]?.rsi ? parseFloat(rsi.values[0].rsi) : null;
    let interpretation = 'neutral';
    if (latestRSI !== null) {
      if (latestRSI < 30) interpretation = 'oversold - potential BUY';
      else if (latestRSI > 70) interpretation = 'overbought - potential SELL';
    }

    res.json({
      success: true,
      data: rsi,
      interpretation,
      latestValue: latestRSI
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/macd/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const fastPeriod = parseInt(req.query.fast as string) || 12;
    const slowPeriod = parseInt(req.query.slow as string) || 26;
    const signalPeriod = parseInt(req.query.signal as string) || 9;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const macd = await twelveDataAPI.getMACD(
      symbol.toUpperCase(),
      interval,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      outputsize
    );

    if (!macd) {
      return res.status(404).json({ success: false, error: 'MACD data not found' });
    }

    // Add interpretation
    const latest = macd.values?.[0];
    let interpretation = 'neutral';
    if (latest) {
      const histogram = parseFloat(latest.macd_hist);
      if (histogram > 0) interpretation = 'bullish - histogram positive';
      else if (histogram < 0) interpretation = 'bearish - histogram negative';
    }

    res.json({
      success: true,
      data: macd,
      interpretation
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/bbands/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const period = parseInt(req.query.period as string) || 20;
    const stdDev = parseFloat(req.query.stddev as string) || 2;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const bbands = await twelveDataAPI.getBBands(symbol.toUpperCase(), interval, period, stdDev, outputsize);

    if (!bbands) {
      return res.status(404).json({ success: false, error: 'Bollinger Bands data not found' });
    }

    res.json({ success: true, data: bbands });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/atr/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const period = parseInt(req.query.period as string) || 14;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const atr = await twelveDataAPI.getATR(symbol.toUpperCase(), interval, period, outputsize);

    if (!atr) {
      return res.status(404).json({ success: false, error: 'ATR data not found' });
    }

    res.json({ success: true, data: atr });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stoch/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const fastKPeriod = parseInt(req.query.fastK as string) || 14;
    const slowKPeriod = parseInt(req.query.slowK as string) || 3;
    const slowDPeriod = parseInt(req.query.slowD as string) || 3;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const stoch = await twelveDataAPI.getStoch(
      symbol.toUpperCase(),
      interval,
      fastKPeriod,
      slowKPeriod,
      slowDPeriod,
      outputsize
    );

    if (!stoch) {
      return res.status(404).json({ success: false, error: 'Stochastic data not found' });
    }

    res.json({ success: true, data: stoch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/adx/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const period = parseInt(req.query.period as string) || 14;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const adx = await twelveDataAPI.getADX(symbol.toUpperCase(), interval, period, outputsize);

    if (!adx) {
      return res.status(404).json({ success: false, error: 'ADX data not found' });
    }

    // Add interpretation
    const latestADX = adx.values?.[0]?.adx ? parseFloat(adx.values[0].adx) : null;
    let trendStrength = 'no trend';
    if (latestADX !== null) {
      if (latestADX < 20) trendStrength = 'weak/no trend';
      else if (latestADX < 40) trendStrength = 'moderate trend';
      else if (latestADX < 60) trendStrength = 'strong trend';
      else trendStrength = 'very strong trend';
    }

    res.json({
      success: true,
      data: adx,
      trendStrength,
      latestValue: latestADX
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/cci/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const period = parseInt(req.query.period as string) || 20;
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const cci = await twelveDataAPI.getCCI(symbol.toUpperCase(), interval, period, outputsize);

    if (!cci) {
      return res.status(404).json({ success: false, error: 'CCI data not found' });
    }

    res.json({ success: true, data: cci });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/obv/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1day';
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const obv = await twelveDataAPI.getOBV(symbol.toUpperCase(), interval, outputsize);

    if (!obv) {
      return res.status(404).json({ success: false, error: 'OBV data not found' });
    }

    res.json({ success: true, data: obv });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/vwap/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1h';
    const outputsize = parseInt(req.query.outputsize as string) || 30;

    const vwap = await twelveDataAPI.getVWAP(symbol.toUpperCase(), interval, outputsize);

    if (!vwap) {
      return res.status(404).json({ success: false, error: 'VWAP data not found' });
    }

    res.json({ success: true, data: vwap });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Symbol Search & Lists
// ============================================================================

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ success: false, error: 'q query param required' });
    }

    const outputsize = parseInt(req.query.limit as string) || 20;
    const results = await twelveDataAPI.searchSymbols(query, outputsize);

    res.json({ success: true, data: results, count: results.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stocks', async (req: Request, res: Response) => {
  try {
    const exchange = req.query.exchange as string;
    const stocks = await twelveDataAPI.getStockList(exchange);
    res.json({ success: true, data: stocks.slice(0, 100), totalAvailable: stocks.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/forex-pairs', async (req: Request, res: Response) => {
  try {
    const pairs = await twelveDataAPI.getForexList();
    res.json({ success: true, data: pairs, count: pairs.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/crypto-list', async (req: Request, res: Response) => {
  try {
    const cryptos = await twelveDataAPI.getCryptoList();
    res.json({ success: true, data: cryptos, count: cryptos.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/etf-list', async (req: Request, res: Response) => {
  try {
    const etfs = await twelveDataAPI.getETFList();
    res.json({ success: true, data: etfs.slice(0, 100), totalAvailable: etfs.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/indices', async (req: Request, res: Response) => {
  try {
    const indices = await twelveDataAPI.getIndicesList();
    res.json({ success: true, data: indices, count: indices.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Forex
// ============================================================================

router.get('/exchange-rate/:from/:to', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.params;
    const rate = await twelveDataAPI.getExchangeRate(from.toUpperCase(), to.toUpperCase());

    if (!rate) {
      return res.status(404).json({ success: false, error: 'Exchange rate not found' });
    }

    res.json({ success: true, data: rate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/convert', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const amount = parseFloat(req.query.amount as string);

    if (!from || !to || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Required params: from, to, amount'
      });
    }

    const result = await twelveDataAPI.convertCurrency(
      from.toUpperCase(),
      to.toUpperCase(),
      amount
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Conversion failed' });
    }

    res.json({
      success: true,
      data: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        originalAmount: amount,
        ...result
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// API Status
// ============================================================================

router.get('/status', (req: Request, res: Response) => {
  const stats = twelveDataAPI.getCallStats();
  res.json({
    success: true,
    data: {
      available: twelveDataAPI.isAvailable(),
      callsToday: stats.today,
      callsRemaining: stats.remaining,
      callsThisMinute: stats.thisMinute,
      dailyLimit: 800,
      minuteLimit: 8
    }
  });
});

// ============================================================================
// Available Indicators Reference
// ============================================================================

router.get('/available-indicators', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      movingAverages: ['sma', 'ema', 'wma', 'dema', 'tema'],
      momentum: ['rsi', 'macd', 'stoch', 'adx', 'cci', 'williams'],
      volatility: ['bbands', 'atr', 'stddev'],
      volume: ['obv', 'vwap'],
      trend: ['adx', 'aroon', 'supertrend']
    },
    usage: {
      sma: '/api/twelvedata/sma/:symbol?period=20&interval=1day',
      ema: '/api/twelvedata/ema/:symbol?period=20&interval=1day',
      rsi: '/api/twelvedata/rsi/:symbol?period=14&interval=1day',
      macd: '/api/twelvedata/macd/:symbol?fast=12&slow=26&signal=9',
      bbands: '/api/twelvedata/bbands/:symbol?period=20&stddev=2',
      analysis: '/api/twelvedata/analysis/:symbol - FULL analysis with signal!'
    }
  });
});

export default router;

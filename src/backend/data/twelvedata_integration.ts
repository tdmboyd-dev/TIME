/**
 * TIME - TwelveData Integration
 *
 * FREE tier: 800 calls/day, 8 calls/minute
 *
 * Features:
 * - Real-time stock quotes
 * - Forex rates
 * - Crypto prices
 * - Technical indicators (50+)
 * - Time series data
 * - ETF data
 * - Indices
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

export interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
}

export interface TwelveDataPrice {
  price: string;
}

export interface TwelveDataSymbol {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  mic_code: string;
  country: string;
  type: string;
}

export interface TwelveDataTechnicalIndicator {
  meta: {
    symbol: string;
    interval: string;
    indicator_name: string;
  };
  values: Array<{
    datetime: string;
    [key: string]: string;
  }>;
}

// ============================================================================
// TwelveData API Class
// ============================================================================

export class TwelveDataAPI extends EventEmitter {
  private apiKey: string;
  private baseUrl = 'https://api.twelvedata.com';
  private callCount = 0;
  private callsToday = 0;
  private callsThisMinute = 0;
  private lastMinute = Date.now();
  private lastResetDate = new Date().toDateString();
  private readonly DAILY_LIMIT = 800;
  private readonly MINUTE_LIMIT = 8;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();

    // Reset minute counter
    if (now - this.lastMinute >= 60000) {
      this.callsThisMinute = 0;
      this.lastMinute = now;
    }

    // Reset daily counter
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.callsToday = 0;
      this.lastResetDate = today;
    }

    // Wait if minute limit reached
    if (this.callsThisMinute >= this.MINUTE_LIMIT) {
      const waitTime = 60000 - (now - this.lastMinute);
      if (waitTime > 0) {
        console.log(`[TwelveData] Rate limit - waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.callsThisMinute = 0;
        this.lastMinute = Date.now();
      }
    }
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    if (!this.apiKey) {
      console.log('[TwelveData] No API key - get free key at: https://twelvedata.com/');
      return null;
    }

    // Check daily limit
    if (this.callsToday >= this.DAILY_LIMIT) {
      console.warn('[TwelveData] Daily limit reached (800 calls)');
      return null;
    }

    await this.rateLimit();

    this.callCount++;
    this.callsToday++;
    this.callsThisMinute++;

    try {
      const queryParams = new URLSearchParams({ ...params, apikey: this.apiKey });
      const url = `${this.baseUrl}/${endpoint}?${queryParams}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[TwelveData] HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      const data: any = await response.json();

      // Check for API errors
      if (data.status === 'error') {
        console.error(`[TwelveData] API Error: ${data.message}`);
        return null;
      }

      return data as T;
    } catch (error) {
      console.error('[TwelveData] Error:', error);
      return null;
    }
  }

  // ============================================================================
  // Real-Time Data
  // ============================================================================

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string): Promise<TwelveDataQuote | null> {
    return this.fetch<TwelveDataQuote>('quote', { symbol });
  }

  /**
   * Get real-time price only (faster, uses less credits)
   */
  async getPrice(symbol: string): Promise<number | null> {
    const data = await this.fetch<TwelveDataPrice>('price', { symbol });
    return data ? parseFloat(data.price) : null;
  }

  /**
   * Get quotes for multiple symbols
   */
  async getBatchQuotes(symbols: string[]): Promise<Record<string, TwelveDataQuote>> {
    const data = await this.fetch<Record<string, TwelveDataQuote>>('quote', {
      symbol: symbols.join(',')
    });
    return data || {};
  }

  /**
   * Get end-of-day price
   */
  async getEOD(symbol: string): Promise<any | null> {
    return this.fetch('eod', { symbol });
  }

  // ============================================================================
  // Time Series Data
  // ============================================================================

  /**
   * Get time series data
   */
  async getTimeSeries(
    symbol: string,
    options: {
      interval?: '1min' | '5min' | '15min' | '30min' | '45min' | '1h' | '2h' | '4h' | '1day' | '1week' | '1month';
      outputsize?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<TwelveDataTimeSeries | null> {
    const params: Record<string, string> = { symbol };

    params.interval = options.interval || '1day';
    if (options.outputsize) params.outputsize = options.outputsize.toString();
    if (options.startDate) params.start_date = options.startDate;
    if (options.endDate) params.end_date = options.endDate;

    return this.fetch<TwelveDataTimeSeries>('time_series', params);
  }

  // ============================================================================
  // Technical Indicators
  // ============================================================================

  /**
   * Get SMA (Simple Moving Average)
   */
  async getSMA(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 20,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('sma', {
      symbol,
      interval,
      time_period: timePeriod.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get EMA (Exponential Moving Average)
   */
  async getEMA(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 20,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('ema', {
      symbol,
      interval,
      time_period: timePeriod.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get RSI (Relative Strength Index)
   */
  async getRSI(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 14,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('rsi', {
      symbol,
      interval,
      time_period: timePeriod.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get MACD (Moving Average Convergence Divergence)
   */
  async getMACD(
    symbol: string,
    interval: string = '1day',
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('macd', {
      symbol,
      interval,
      fast_period: fastPeriod.toString(),
      slow_period: slowPeriod.toString(),
      signal_period: signalPeriod.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get Bollinger Bands
   */
  async getBBands(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 20,
    stdDev: number = 2,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('bbands', {
      symbol,
      interval,
      time_period: timePeriod.toString(),
      sd: stdDev.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get ATR (Average True Range)
   */
  async getATR(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 14,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('atr', {
      symbol,
      interval,
      time_period: timePeriod.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get Stochastic Oscillator
   */
  async getStoch(
    symbol: string,
    interval: string = '1day',
    fastKPeriod: number = 14,
    slowKPeriod: number = 3,
    slowDPeriod: number = 3,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('stoch', {
      symbol,
      interval,
      fast_k_period: fastKPeriod.toString(),
      slow_k_period: slowKPeriod.toString(),
      slow_d_period: slowDPeriod.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get ADX (Average Directional Index)
   */
  async getADX(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 14,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('adx', {
      symbol,
      interval,
      time_period: timePeriod.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get CCI (Commodity Channel Index)
   */
  async getCCI(
    symbol: string,
    interval: string = '1day',
    timePeriod: number = 20,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('cci', {
      symbol,
      interval,
      time_period: timePeriod.toString(),
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get OBV (On Balance Volume)
   */
  async getOBV(
    symbol: string,
    interval: string = '1day',
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('obv', {
      symbol,
      interval,
      outputsize: outputsize.toString()
    });
  }

  /**
   * Get VWAP (Volume Weighted Average Price)
   */
  async getVWAP(
    symbol: string,
    interval: string = '1h',
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator | null> {
    return this.fetch<TwelveDataTechnicalIndicator>('vwap', {
      symbol,
      interval,
      outputsize: outputsize.toString()
    });
  }

  // ============================================================================
  // Symbol Search & Lists
  // ============================================================================

  /**
   * Search for symbols
   */
  async searchSymbols(query: string, outputsize: number = 20): Promise<TwelveDataSymbol[]> {
    const data = await this.fetch<{ data: TwelveDataSymbol[] }>('symbol_search', {
      symbol: query,
      outputsize: outputsize.toString()
    });
    return data?.data || [];
  }

  /**
   * Get list of all stocks
   */
  async getStockList(exchange?: string): Promise<TwelveDataSymbol[]> {
    const params: Record<string, string> = { type: 'Stock' };
    if (exchange) params.exchange = exchange;

    const data = await this.fetch<{ data: TwelveDataSymbol[] }>('stocks', params);
    return data?.data || [];
  }

  /**
   * Get list of all forex pairs
   */
  async getForexList(): Promise<TwelveDataSymbol[]> {
    const data = await this.fetch<{ data: TwelveDataSymbol[] }>('forex_pairs');
    return data?.data || [];
  }

  /**
   * Get list of all cryptocurrencies
   */
  async getCryptoList(): Promise<TwelveDataSymbol[]> {
    const data = await this.fetch<{ data: TwelveDataSymbol[] }>('cryptocurrencies');
    return data?.data || [];
  }

  /**
   * Get list of all ETFs
   */
  async getETFList(): Promise<TwelveDataSymbol[]> {
    const data = await this.fetch<{ data: TwelveDataSymbol[] }>('etf');
    return data?.data || [];
  }

  /**
   * Get list of all indices
   */
  async getIndicesList(): Promise<TwelveDataSymbol[]> {
    const data = await this.fetch<{ data: TwelveDataSymbol[] }>('indices');
    return data?.data || [];
  }

  // ============================================================================
  // Forex Specific
  // ============================================================================

  /**
   * Get forex exchange rate
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<{
    symbol: string;
    rate: number;
    timestamp: number;
  } | null> {
    const data = await this.fetch<any>('exchange_rate', {
      symbol: `${fromCurrency}/${toCurrency}`
    });

    if (data) {
      return {
        symbol: data.symbol,
        rate: parseFloat(data.rate),
        timestamp: data.timestamp
      };
    }
    return null;
  }

  /**
   * Currency conversion
   */
  async convertCurrency(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<{ convertedAmount: number; rate: number } | null> {
    const data = await this.fetch<any>('currency_conversion', {
      symbol: `${fromCurrency}/${toCurrency}`,
      amount: amount.toString()
    });

    if (data) {
      return {
        convertedAmount: parseFloat(data.amount),
        rate: parseFloat(data.rate)
      };
    }
    return null;
  }

  // ============================================================================
  // Complex Analysis
  // ============================================================================

  /**
   * Get comprehensive technical analysis for a symbol
   */
  async getTechnicalAnalysis(symbol: string, interval: string = '1day'): Promise<{
    symbol: string;
    interval: string;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema12: number | null;
    ema26: number | null;
    rsi: number | null;
    macd: { macd: number; signal: number; histogram: number } | null;
    bbands: { upper: number; middle: number; lower: number } | null;
    atr: number | null;
    adx: number | null;
    signal: 'buy' | 'sell' | 'neutral';
  }> {
    const [sma20Data, sma50Data, sma200Data, ema12Data, ema26Data, rsiData, macdData, bbandsData, atrData, adxData] =
      await Promise.all([
        this.getSMA(symbol, interval, 20, 1),
        this.getSMA(symbol, interval, 50, 1),
        this.getSMA(symbol, interval, 200, 1),
        this.getEMA(symbol, interval, 12, 1),
        this.getEMA(symbol, interval, 26, 1),
        this.getRSI(symbol, interval, 14, 1),
        this.getMACD(symbol, interval, 12, 26, 9, 1),
        this.getBBands(symbol, interval, 20, 2, 1),
        this.getATR(symbol, interval, 14, 1),
        this.getADX(symbol, interval, 14, 1)
      ]);

    const sma20 = sma20Data?.values?.[0]?.sma ? parseFloat(sma20Data.values[0].sma) : null;
    const sma50 = sma50Data?.values?.[0]?.sma ? parseFloat(sma50Data.values[0].sma) : null;
    const sma200 = sma200Data?.values?.[0]?.sma ? parseFloat(sma200Data.values[0].sma) : null;
    const ema12 = ema12Data?.values?.[0]?.ema ? parseFloat(ema12Data.values[0].ema) : null;
    const ema26 = ema26Data?.values?.[0]?.ema ? parseFloat(ema26Data.values[0].ema) : null;
    const rsi = rsiData?.values?.[0]?.rsi ? parseFloat(rsiData.values[0].rsi) : null;

    const macd = macdData?.values?.[0] ? {
      macd: parseFloat(macdData.values[0].macd),
      signal: parseFloat(macdData.values[0].macd_signal),
      histogram: parseFloat(macdData.values[0].macd_hist)
    } : null;

    const bbands = bbandsData?.values?.[0] ? {
      upper: parseFloat(bbandsData.values[0].upper_band),
      middle: parseFloat(bbandsData.values[0].middle_band),
      lower: parseFloat(bbandsData.values[0].lower_band)
    } : null;

    const atr = atrData?.values?.[0]?.atr ? parseFloat(atrData.values[0].atr) : null;
    const adx = adxData?.values?.[0]?.adx ? parseFloat(adxData.values[0].adx) : null;

    // Generate signal based on indicators
    let buySignals = 0;
    let sellSignals = 0;

    if (rsi !== null) {
      if (rsi < 30) buySignals++;
      else if (rsi > 70) sellSignals++;
    }

    if (macd !== null) {
      if (macd.histogram > 0) buySignals++;
      else if (macd.histogram < 0) sellSignals++;
    }

    if (sma20 !== null && sma50 !== null) {
      if (sma20 > sma50) buySignals++;
      else if (sma20 < sma50) sellSignals++;
    }

    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (buySignals > sellSignals && buySignals >= 2) signal = 'buy';
    else if (sellSignals > buySignals && sellSignals >= 2) signal = 'sell';

    return {
      symbol,
      interval,
      sma20,
      sma50,
      sma200,
      ema12,
      ema26,
      rsi,
      macd,
      bbands,
      atr,
      adx,
      signal
    };
  }

  // ============================================================================
  // Utility
  // ============================================================================

  getCallStats(): { total: number; today: number; remaining: number; thisMinute: number } {
    return {
      total: this.callCount,
      today: this.callsToday,
      remaining: this.DAILY_LIMIT - this.callsToday,
      thisMinute: this.callsThisMinute
    };
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.callsToday < this.DAILY_LIMIT;
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const twelveDataAPI = new TwelveDataAPI(process.env.TWELVE_DATA_API_KEY || '');
export default twelveDataAPI;

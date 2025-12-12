/**
 * TIME - FRED (Federal Reserve Economic Data) Integration
 *
 * 100% FREE - Unlimited calls
 *
 * 800,000+ economic data series including:
 * - GDP & Economic Growth
 * - Unemployment & Labor
 * - Inflation (CPI, PCE)
 * - Interest Rates
 * - Treasury Yields
 * - Housing Data
 * - Consumer Sentiment
 * - Manufacturing
 * - Trade & Exports
 * - Money Supply
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface FREDSeries {
  id: string;
  realtime_start: string;
  realtime_end: string;
  title: string;
  observation_start: string;
  observation_end: string;
  frequency: string;
  frequency_short: string;
  units: string;
  units_short: string;
  seasonal_adjustment: string;
  seasonal_adjustment_short: string;
  last_updated: string;
  popularity: number;
  notes?: string;
}

export interface FREDObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

export interface FREDSearchResult {
  id: string;
  title: string;
  frequency: string;
  units: string;
  popularity: number;
  last_updated: string;
}

// ============================================================================
// Popular FRED Series IDs
// ============================================================================

export const FRED_SERIES = {
  // GDP & Growth
  GDP: 'GDP',                           // Gross Domestic Product
  GDPC1: 'GDPC1',                       // Real GDP
  GDPPOT: 'GDPPOT',                     // Real Potential GDP

  // Unemployment & Labor
  UNRATE: 'UNRATE',                     // Unemployment Rate
  PAYEMS: 'PAYEMS',                     // Total Nonfarm Payrolls
  CIVPART: 'CIVPART',                   // Labor Force Participation Rate
  ICSA: 'ICSA',                         // Initial Jobless Claims
  CCSA: 'CCSA',                         // Continued Claims

  // Inflation
  CPIAUCSL: 'CPIAUCSL',                 // Consumer Price Index
  CPILFESL: 'CPILFESL',                 // Core CPI (Less Food & Energy)
  PCEPI: 'PCEPI',                       // PCE Price Index
  PCEPILFE: 'PCEPILFE',                 // Core PCE
  T10YIE: 'T10YIE',                     // 10-Year Breakeven Inflation Rate
  T5YIE: 'T5YIE',                       // 5-Year Breakeven Inflation Rate

  // Interest Rates
  FEDFUNDS: 'FEDFUNDS',                 // Federal Funds Rate
  DFEDTARU: 'DFEDTARU',                 // Fed Funds Target Upper
  DFEDTARL: 'DFEDTARL',                 // Fed Funds Target Lower
  PRIME: 'PRIME',                       // Prime Rate

  // Treasury Yields
  DGS1MO: 'DGS1MO',                     // 1-Month Treasury
  DGS3MO: 'DGS3MO',                     // 3-Month Treasury
  DGS6MO: 'DGS6MO',                     // 6-Month Treasury
  DGS1: 'DGS1',                         // 1-Year Treasury
  DGS2: 'DGS2',                         // 2-Year Treasury
  DGS5: 'DGS5',                         // 5-Year Treasury
  DGS10: 'DGS10',                       // 10-Year Treasury
  DGS20: 'DGS20',                       // 20-Year Treasury
  DGS30: 'DGS30',                       // 30-Year Treasury

  // Yield Curves
  T10Y2Y: 'T10Y2Y',                     // 10Y-2Y Spread (recession indicator)
  T10Y3M: 'T10Y3M',                     // 10Y-3M Spread

  // Housing
  CSUSHPISA: 'CSUSHPISA',               // Case-Shiller Home Price Index
  HOUST: 'HOUST',                       // Housing Starts
  PERMIT: 'PERMIT',                     // Building Permits
  HSN1F: 'HSN1F',                       // New Home Sales
  EXHOSLUSM495S: 'EXHOSLUSM495S',       // Existing Home Sales
  MORTGAGE30US: 'MORTGAGE30US',         // 30-Year Mortgage Rate
  MORTGAGE15US: 'MORTGAGE15US',         // 15-Year Mortgage Rate

  // Consumer
  UMCSENT: 'UMCSENT',                   // Consumer Sentiment (U of Michigan)
  PCE: 'PCE',                           // Personal Consumption Expenditures
  PSAVERT: 'PSAVERT',                   // Personal Saving Rate
  DSPIC96: 'DSPIC96',                   // Real Disposable Personal Income
  RRSFS: 'RRSFS',                       // Retail Sales

  // Manufacturing & Business
  INDPRO: 'INDPRO',                     // Industrial Production
  DGORDER: 'DGORDER',                   // Durable Goods Orders
  MNFCTRIRSA: 'MNFCTRIRSA',             // Manufacturing Inventories
  BUSLOANS: 'BUSLOANS',                 // Commercial & Industrial Loans

  // Stock Market
  SP500: 'SP500',                       // S&P 500
  VIXCLS: 'VIXCLS',                     // VIX
  WILL5000PRFC: 'WILL5000PRFC',         // Wilshire 5000 Total Market

  // Money Supply
  M1SL: 'M1SL',                         // M1 Money Stock
  M2SL: 'M2SL',                         // M2 Money Stock
  WALCL: 'WALCL',                       // Fed Balance Sheet

  // Trade
  BOPGSTB: 'BOPGSTB',                   // Trade Balance
  DTWEXBGS: 'DTWEXBGS',                 // Trade Weighted Dollar Index

  // Commodities
  DCOILWTICO: 'DCOILWTICO',             // WTI Crude Oil
  DCOILBRENTEU: 'DCOILBRENTEU',         // Brent Crude Oil
  GOLDAMGBD228NLBM: 'GOLDAMGBD228NLBM', // Gold Price

  // Credit Spreads
  BAMLH0A0HYM2: 'BAMLH0A0HYM2',         // High Yield Spread
  BAMLC0A0CM: 'BAMLC0A0CM',             // Corporate Bond Spread
};

// ============================================================================
// FRED API Class
// ============================================================================

export class FREDAPI extends EventEmitter {
  private apiKey: string;
  private baseUrl = 'https://api.stlouisfed.org/fred';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    if (!this.apiKey) {
      console.log('[FRED] No API key - get free key at: https://fred.stlouisfed.org/docs/api/api_key.html');
      return null;
    }

    try {
      const queryParams = new URLSearchParams({
        ...params,
        api_key: this.apiKey,
        file_type: 'json'
      });
      const url = `${this.baseUrl}/${endpoint}?${queryParams}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[FRED] HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error('[FRED] Error:', error);
      return null;
    }
  }

  // ============================================================================
  // Series Data
  // ============================================================================

  /**
   * Get information about a specific series
   */
  async getSeriesInfo(seriesId: string): Promise<FREDSeries | null> {
    const data = await this.fetch<{ seriess: FREDSeries[] }>('series', {
      series_id: seriesId
    });
    return data?.seriess?.[0] || null;
  }

  /**
   * Get observations (data points) for a series
   */
  async getSeriesObservations(
    seriesId: string,
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
      frequency?: 'd' | 'w' | 'm' | 'q' | 'sa' | 'a';
    } = {}
  ): Promise<FREDObservation[]> {
    const params: Record<string, string> = { series_id: seriesId };

    if (options.startDate) params.observation_start = options.startDate;
    if (options.endDate) params.observation_end = options.endDate;
    if (options.limit) params.limit = options.limit.toString();
    if (options.sortOrder) params.sort_order = options.sortOrder;
    if (options.frequency) params.frequency = options.frequency;

    const data = await this.fetch<{ observations: FREDObservation[] }>('series/observations', params);
    return data?.observations || [];
  }

  /**
   * Get the latest value for a series
   */
  async getLatestValue(seriesId: string): Promise<{ date: string; value: number } | null> {
    const observations = await this.getSeriesObservations(seriesId, {
      sortOrder: 'desc',
      limit: 1
    });

    if (observations.length > 0 && observations[0].value !== '.') {
      return {
        date: observations[0].date,
        value: parseFloat(observations[0].value)
      };
    }
    return null;
  }

  /**
   * Search for series
   */
  async searchSeries(query: string, limit: number = 20): Promise<FREDSearchResult[]> {
    const data = await this.fetch<{ seriess: any[] }>('series/search', {
      search_text: query,
      limit: limit.toString()
    });

    return (data?.seriess || []).map(s => ({
      id: s.id,
      title: s.title,
      frequency: s.frequency,
      units: s.units,
      popularity: s.popularity,
      last_updated: s.last_updated
    }));
  }

  // ============================================================================
  // Pre-built Economic Data Getters
  // ============================================================================

  /**
   * Get current federal funds rate
   */
  async getFedFundsRate(): Promise<number | null> {
    const result = await this.getLatestValue(FRED_SERIES.FEDFUNDS);
    return result?.value || null;
  }

  /**
   * Get unemployment rate
   */
  async getUnemploymentRate(): Promise<number | null> {
    const result = await this.getLatestValue(FRED_SERIES.UNRATE);
    return result?.value || null;
  }

  /**
   * Get inflation (CPI YoY)
   */
  async getInflationRate(): Promise<number | null> {
    // Get CPI data and calculate YoY change
    const observations = await this.getSeriesObservations(FRED_SERIES.CPIAUCSL, {
      sortOrder: 'desc',
      limit: 13 // Last 13 months to calculate YoY
    });

    if (observations.length >= 13) {
      const current = parseFloat(observations[0].value);
      const yearAgo = parseFloat(observations[12].value);
      return ((current - yearAgo) / yearAgo) * 100;
    }
    return null;
  }

  /**
   * Get GDP growth rate (QoQ annualized)
   */
  async getGDPGrowth(): Promise<number | null> {
    const observations = await this.getSeriesObservations(FRED_SERIES.GDPC1, {
      sortOrder: 'desc',
      limit: 2
    });

    if (observations.length >= 2) {
      const current = parseFloat(observations[0].value);
      const previous = parseFloat(observations[1].value);
      // Annualized quarterly growth
      return (Math.pow(current / previous, 4) - 1) * 100;
    }
    return null;
  }

  /**
   * Get Treasury yields across maturities
   */
  async getTreasuryYields(): Promise<Record<string, number>> {
    const yields: Record<string, number> = {};

    const maturities = [
      { key: '1M', series: FRED_SERIES.DGS1MO },
      { key: '3M', series: FRED_SERIES.DGS3MO },
      { key: '6M', series: FRED_SERIES.DGS6MO },
      { key: '1Y', series: FRED_SERIES.DGS1 },
      { key: '2Y', series: FRED_SERIES.DGS2 },
      { key: '5Y', series: FRED_SERIES.DGS5 },
      { key: '10Y', series: FRED_SERIES.DGS10 },
      { key: '20Y', series: FRED_SERIES.DGS20 },
      { key: '30Y', series: FRED_SERIES.DGS30 },
    ];

    await Promise.all(
      maturities.map(async ({ key, series }) => {
        const result = await this.getLatestValue(series);
        if (result) yields[key] = result.value;
      })
    );

    return yields;
  }

  /**
   * Check yield curve inversion (recession indicator)
   */
  async getYieldCurveSpread(): Promise<{
    spread10Y2Y: number | null;
    spread10Y3M: number | null;
    isInverted: boolean;
  }> {
    const [spread10Y2Y, spread10Y3M] = await Promise.all([
      this.getLatestValue(FRED_SERIES.T10Y2Y),
      this.getLatestValue(FRED_SERIES.T10Y3M)
    ]);

    return {
      spread10Y2Y: spread10Y2Y?.value || null,
      spread10Y3M: spread10Y3M?.value || null,
      isInverted: (spread10Y2Y?.value || 0) < 0 || (spread10Y3M?.value || 0) < 0
    };
  }

  /**
   * Get consumer sentiment
   */
  async getConsumerSentiment(): Promise<number | null> {
    const result = await this.getLatestValue(FRED_SERIES.UMCSENT);
    return result?.value || null;
  }

  /**
   * Get VIX (market fear gauge)
   */
  async getVIX(): Promise<number | null> {
    const result = await this.getLatestValue(FRED_SERIES.VIXCLS);
    return result?.value || null;
  }

  /**
   * Get mortgage rates
   */
  async getMortgageRates(): Promise<{ rate30Y: number | null; rate15Y: number | null }> {
    const [rate30Y, rate15Y] = await Promise.all([
      this.getLatestValue(FRED_SERIES.MORTGAGE30US),
      this.getLatestValue(FRED_SERIES.MORTGAGE15US)
    ]);

    return {
      rate30Y: rate30Y?.value || null,
      rate15Y: rate15Y?.value || null
    };
  }

  /**
   * Get initial jobless claims (weekly)
   */
  async getJoblessClaims(): Promise<{ initial: number | null; continued: number | null }> {
    const [initial, continued] = await Promise.all([
      this.getLatestValue(FRED_SERIES.ICSA),
      this.getLatestValue(FRED_SERIES.CCSA)
    ]);

    return {
      initial: initial?.value || null,
      continued: continued?.value || null
    };
  }

  /**
   * Get oil prices
   */
  async getOilPrices(): Promise<{ wti: number | null; brent: number | null }> {
    const [wti, brent] = await Promise.all([
      this.getLatestValue(FRED_SERIES.DCOILWTICO),
      this.getLatestValue(FRED_SERIES.DCOILBRENTEU)
    ]);

    return {
      wti: wti?.value || null,
      brent: brent?.value || null
    };
  }

  /**
   * Get Fed balance sheet size
   */
  async getFedBalanceSheet(): Promise<number | null> {
    const result = await this.getLatestValue(FRED_SERIES.WALCL);
    return result?.value || null;
  }

  /**
   * Get money supply (M2)
   */
  async getMoneySupply(): Promise<{ m1: number | null; m2: number | null }> {
    const [m1, m2] = await Promise.all([
      this.getLatestValue(FRED_SERIES.M1SL),
      this.getLatestValue(FRED_SERIES.M2SL)
    ]);

    return {
      m1: m1?.value || null,
      m2: m2?.value || null
    };
  }

  /**
   * Get comprehensive economic dashboard
   */
  async getEconomicDashboard(): Promise<{
    gdpGrowth: number | null;
    unemployment: number | null;
    inflation: number | null;
    fedFundsRate: number | null;
    treasury10Y: number | null;
    yieldCurveInverted: boolean;
    consumerSentiment: number | null;
    vix: number | null;
    mortgage30Y: number | null;
    oilWTI: number | null;
  }> {
    const [
      gdpGrowth,
      unemployment,
      inflation,
      fedFundsRate,
      yields,
      yieldCurve,
      consumerSentiment,
      vix,
      mortgage,
      oil
    ] = await Promise.all([
      this.getGDPGrowth(),
      this.getUnemploymentRate(),
      this.getInflationRate(),
      this.getFedFundsRate(),
      this.getTreasuryYields(),
      this.getYieldCurveSpread(),
      this.getConsumerSentiment(),
      this.getVIX(),
      this.getMortgageRates(),
      this.getOilPrices()
    ]);

    return {
      gdpGrowth,
      unemployment,
      inflation,
      fedFundsRate,
      treasury10Y: yields['10Y'] || null,
      yieldCurveInverted: yieldCurve.isInverted,
      consumerSentiment,
      vix,
      mortgage30Y: mortgage.rate30Y,
      oilWTI: oil.wti
    };
  }

  /**
   * Get historical data for charting
   */
  async getHistoricalData(
    seriesId: string,
    years: number = 5
  ): Promise<Array<{ date: string; value: number }>> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);

    const observations = await this.getSeriesObservations(seriesId, {
      startDate: startDate.toISOString().split('T')[0],
      sortOrder: 'asc'
    });

    return observations
      .filter(o => o.value !== '.')
      .map(o => ({
        date: o.date,
        value: parseFloat(o.value)
      }));
  }

  // ============================================================================
  // Utility
  // ============================================================================

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get all available series IDs
   */
  getAvailableSeries(): typeof FRED_SERIES {
    return FRED_SERIES;
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const fredAPI = new FREDAPI(process.env.FRED_API_KEY || '');
export default fredAPI;

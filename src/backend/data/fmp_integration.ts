/**
 * TIME - Financial Modeling Prep (FMP) Integration
 *
 * FREE tier: 250 calls/day
 *
 * Most Valuable FREE Endpoints:
 * - Company Profile (full company info)
 * - Financial Statements (income, balance, cash flow)
 * - Key Metrics & Ratios
 * - Stock Screener
 * - Earnings Calendar
 * - Dividends Calendar
 * - Stock Splits
 * - News
 * - Congressional Trading (Senate/House)
 * - Insider Trades
 * - DCF Valuations
 * - Technical Indicators
 * - Market Gainers/Losers
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface FMPCompanyProfile {
  symbol: string;
  companyName: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcf: number;
  dcfDiff: number;
  image: string;
  ipoDate: string;
  isEtf: boolean;
  isActivelyTrading: boolean;
}

export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

export interface FMPIncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

export interface FMPBalanceSheet {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  cashAndShortTermInvestments: number;
  netReceivables: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  propertyPlantEquipmentNet: number;
  goodwill: number;
  intangibleAssets: number;
  goodwillAndIntangibleAssets: number;
  longTermInvestments: number;
  taxAssets: number;
  otherNonCurrentAssets: number;
  totalNonCurrentAssets: number;
  otherAssets: number;
  totalAssets: number;
  accountPayables: number;
  shortTermDebt: number;
  taxPayables: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  deferredRevenueNonCurrent: number;
  deferredTaxLiabilitiesNonCurrent: number;
  otherNonCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  otherLiabilities: number;
  capitalLeaseObligations: number;
  totalLiabilities: number;
  preferredStock: number;
  commonStock: number;
  retainedEarnings: number;
  accumulatedOtherComprehensiveIncomeLoss: number;
  othertotalStockholdersEquity: number;
  totalStockholdersEquity: number;
  totalEquity: number;
  totalLiabilitiesAndStockholdersEquity: number;
  minorityInterest: number;
  totalLiabilitiesAndTotalEquity: number;
  totalInvestments: number;
  totalDebt: number;
  netDebt: number;
}

export interface FMPCashFlowStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  netIncome: number;
  depreciationAndAmortization: number;
  deferredIncomeTax: number;
  stockBasedCompensation: number;
  changeInWorkingCapital: number;
  accountsReceivables: number;
  inventory: number;
  accountsPayables: number;
  otherWorkingCapital: number;
  otherNonCashItems: number;
  netCashProvidedByOperatingActivities: number;
  investmentsInPropertyPlantAndEquipment: number;
  acquisitionsNet: number;
  purchasesOfInvestments: number;
  salesMaturitiesOfInvestments: number;
  otherInvestingActivites: number;
  netCashUsedForInvestingActivites: number;
  debtRepayment: number;
  commonStockIssued: number;
  commonStockRepurchased: number;
  dividendsPaid: number;
  otherFinancingActivites: number;
  netCashUsedProvidedByFinancingActivities: number;
  effectOfForexChangesOnCash: number;
  netChangeInCash: number;
  cashAtEndOfPeriod: number;
  cashAtBeginningOfPeriod: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
}

export interface FMPKeyMetrics {
  symbol: string;
  date: string;
  calendarYear: string;
  period: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  bookValuePerShare: number;
  tangibleBookValuePerShare: number;
  shareholdersEquityPerShare: number;
  interestDebtPerShare: number;
  marketCap: number;
  enterpriseValue: number;
  peRatio: number;
  priceToSalesRatio: number;
  pocfratio: number;
  pfcfRatio: number;
  pbRatio: number;
  ptbRatio: number;
  evToSales: number;
  enterpriseValueOverEBITDA: number;
  evToOperatingCashFlow: number;
  evToFreeCashFlow: number;
  earningsYield: number;
  freeCashFlowYield: number;
  debtToEquity: number;
  debtToAssets: number;
  netDebtToEBITDA: number;
  currentRatio: number;
  interestCoverage: number;
  incomeQuality: number;
  dividendYield: number;
  payoutRatio: number;
  salesGeneralAndAdministrativeToRevenue: number;
  researchAndDdevelopementToRevenue: number;
  intangiblesToTotalAssets: number;
  capexToOperatingCashFlow: number;
  capexToRevenue: number;
  capexToDepreciation: number;
  stockBasedCompensationToRevenue: number;
  grahamNumber: number;
  roic: number;
  returnOnTangibleAssets: number;
  grahamNetNet: number;
  workingCapital: number;
  tangibleAssetValue: number;
  netCurrentAssetValue: number;
  investedCapital: number;
  averageReceivables: number;
  averagePayables: number;
  averageInventory: number;
  daysSalesOutstanding: number;
  daysPayablesOutstanding: number;
  daysOfInventoryOnHand: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  roe: number;
  capexPerShare: number;
}

export interface FMPEarningsCalendar {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
  updatedFromDate: string;
  fiscalDateEnding: string;
}

export interface FMPDividendCalendar {
  date: string;
  label: string;
  adjDividend: number;
  symbol: string;
  dividend: number;
  recordDate: string;
  paymentDate: string;
  declarationDate: string;
}

export interface FMPStockScreenerResult {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  beta: number;
  price: number;
  lastAnnualDividend: number;
  volume: number;
  exchange: string;
  exchangeShortName: string;
  country: string;
  isEtf: boolean;
  isFund: boolean;
  isActivelyTrading: boolean;
}

export interface FMPSenateTrade {
  firstName: string;
  lastName: string;
  office: string;
  link: string;
  dateRecieved: string;
  transactionDate: string;
  owner: string;
  assetDescription: string;
  assetType: string;
  type: string;
  amount: string;
  comment: string;
  symbol: string;
}

export interface FMPInsiderTrade {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingCik: string;
  transactionType: string;
  securitiesOwned: number;
  companyCik: string;
  reportingName: string;
  typeOfOwner: string;
  acquistionOrDisposition: string;
  formType: string;
  securitiesTransacted: number;
  price: number;
  securityName: string;
  link: string;
}

export interface FMPNews {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

export interface FMPDCF {
  symbol: string;
  date: string;
  dcf: number;
  'Stock Price': number;
}

export interface FMPGainerLoser {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

// ============================================================================
// FMP API Class
// ============================================================================

export class FMPAPI extends EventEmitter {
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/stable';
  private callCount = 0;
  private callsToday = 0;
  private lastResetDate = new Date().toDateString();
  private readonly DAILY_LIMIT = 250;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    if (!this.apiKey) {
      console.log('[FMP] No API key - get free key at: https://financialmodelingprep.com/developer/docs/');
      return null;
    }

    // Reset daily counter
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.callsToday = 0;
      this.lastResetDate = today;
    }

    // Check daily limit
    if (this.callsToday >= this.DAILY_LIMIT) {
      console.warn('[FMP] Daily limit reached (250 calls)');
      return null;
    }

    this.callCount++;
    this.callsToday++;

    try {
      const queryParams = new URLSearchParams({ ...params, apikey: this.apiKey });
      const url = `${this.baseUrl}/${endpoint}?${queryParams}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[FMP] HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error('[FMP] Error:', error);
      return null;
    }
  }

  // ============================================================================
  // Company Information
  // ============================================================================

  async getCompanyProfile(symbol: string): Promise<FMPCompanyProfile | null> {
    const data = await this.fetch<FMPCompanyProfile[]>('profile', { symbol });
    return data && data.length > 0 ? data[0] : null;
  }

  async getQuote(symbol: string): Promise<FMPQuote | null> {
    const data = await this.fetch<FMPQuote[]>('quote', { symbol });
    return data && data.length > 0 ? data[0] : null;
  }

  async getBatchQuotes(symbols: string[]): Promise<FMPQuote[]> {
    const data = await this.fetch<FMPQuote[]>('batch-quote', { symbols: symbols.join(',') });
    return data || [];
  }

  async searchSymbol(query: string): Promise<any[]> {
    const data = await this.fetch<any[]>('search-symbol', { query });
    return data || [];
  }

  async searchName(query: string): Promise<any[]> {
    const data = await this.fetch<any[]>('search-name', { query });
    return data || [];
  }

  // ============================================================================
  // Financial Statements
  // ============================================================================

  async getIncomeStatement(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<FMPIncomeStatement[]> {
    const data = await this.fetch<FMPIncomeStatement[]>('income-statement', {
      symbol,
      period,
      limit: limit.toString()
    });
    return data || [];
  }

  async getBalanceSheet(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<FMPBalanceSheet[]> {
    const data = await this.fetch<FMPBalanceSheet[]>('balance-sheet-statement', {
      symbol,
      period,
      limit: limit.toString()
    });
    return data || [];
  }

  async getCashFlowStatement(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<FMPCashFlowStatement[]> {
    const data = await this.fetch<FMPCashFlowStatement[]>('cash-flow-statement', {
      symbol,
      period,
      limit: limit.toString()
    });
    return data || [];
  }

  // ============================================================================
  // Key Metrics & Ratios
  // ============================================================================

  async getKeyMetrics(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<FMPKeyMetrics[]> {
    const data = await this.fetch<FMPKeyMetrics[]>('key-metrics', {
      symbol,
      period,
      limit: limit.toString()
    });
    return data || [];
  }

  async getFinancialRatios(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<any[]> {
    const data = await this.fetch<any[]>('ratios', {
      symbol,
      period,
      limit: limit.toString()
    });
    return data || [];
  }

  async getFinancialScores(symbol: string): Promise<any | null> {
    const data = await this.fetch<any[]>('financial-scores', { symbol });
    return data && data.length > 0 ? data[0] : null;
  }

  // ============================================================================
  // Stock Screener
  // ============================================================================

  async stockScreener(params: {
    marketCapMoreThan?: number;
    marketCapLowerThan?: number;
    sector?: string;
    industry?: string;
    betaMoreThan?: number;
    betaLowerThan?: number;
    priceMoreThan?: number;
    priceLowerThan?: number;
    dividendMoreThan?: number;
    volumeMoreThan?: number;
    exchange?: string;
    country?: string;
    isEtf?: boolean;
    limit?: number;
  }): Promise<FMPStockScreenerResult[]> {
    const queryParams: Record<string, string> = {};

    if (params.marketCapMoreThan) queryParams.marketCapMoreThan = params.marketCapMoreThan.toString();
    if (params.marketCapLowerThan) queryParams.marketCapLowerThan = params.marketCapLowerThan.toString();
    if (params.sector) queryParams.sector = params.sector;
    if (params.industry) queryParams.industry = params.industry;
    if (params.betaMoreThan) queryParams.betaMoreThan = params.betaMoreThan.toString();
    if (params.betaLowerThan) queryParams.betaLowerThan = params.betaLowerThan.toString();
    if (params.priceMoreThan) queryParams.priceMoreThan = params.priceMoreThan.toString();
    if (params.priceLowerThan) queryParams.priceLowerThan = params.priceLowerThan.toString();
    if (params.dividendMoreThan) queryParams.dividendMoreThan = params.dividendMoreThan.toString();
    if (params.volumeMoreThan) queryParams.volumeMoreThan = params.volumeMoreThan.toString();
    if (params.exchange) queryParams.exchange = params.exchange;
    if (params.country) queryParams.country = params.country;
    if (params.isEtf !== undefined) queryParams.isEtf = params.isEtf.toString();
    if (params.limit) queryParams.limit = params.limit.toString();

    const data = await this.fetch<FMPStockScreenerResult[]>('company-screener', queryParams);
    return data || [];
  }

  // ============================================================================
  // Earnings, Dividends, Splits
  // ============================================================================

  async getEarningsCalendar(from?: string, to?: string): Promise<FMPEarningsCalendar[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const data = await this.fetch<FMPEarningsCalendar[]>('earnings-calendar', params);
    return data || [];
  }

  async getDividendsCalendar(from?: string, to?: string): Promise<FMPDividendCalendar[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const data = await this.fetch<FMPDividendCalendar[]>('dividends-calendar', params);
    return data || [];
  }

  async getCompanyDividends(symbol: string): Promise<FMPDividendCalendar[]> {
    const data = await this.fetch<FMPDividendCalendar[]>('dividends', { symbol });
    return data || [];
  }

  async getStockSplits(symbol: string): Promise<any[]> {
    const data = await this.fetch<any[]>('splits', { symbol });
    return data || [];
  }

  async getIPOCalendar(from?: string, to?: string): Promise<any[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const data = await this.fetch<any[]>('ipos-calendar', params);
    return data || [];
  }

  // ============================================================================
  // Congressional Trading (GOLD MINE!)
  // ============================================================================

  async getLatestSenateTrades(page: number = 0, limit: number = 100): Promise<FMPSenateTrade[]> {
    const data = await this.fetch<FMPSenateTrade[]>('senate-latest', {
      page: page.toString(),
      limit: limit.toString()
    });
    return data || [];
  }

  async getSenateTradesBySymbol(symbol: string): Promise<FMPSenateTrade[]> {
    const data = await this.fetch<FMPSenateTrade[]>('senate-trades', { symbol });
    return data || [];
  }

  async getSenateTradesByName(name: string): Promise<FMPSenateTrade[]> {
    const data = await this.fetch<FMPSenateTrade[]>('senate-trades-by-name', { name });
    return data || [];
  }

  async getLatestHouseTrades(page: number = 0, limit: number = 100): Promise<any[]> {
    const data = await this.fetch<any[]>('house-latest', {
      page: page.toString(),
      limit: limit.toString()
    });
    return data || [];
  }

  async getHouseTradesBySymbol(symbol: string): Promise<any[]> {
    const data = await this.fetch<any[]>('house-trades', { symbol });
    return data || [];
  }

  // ============================================================================
  // Insider Trading
  // ============================================================================

  async getLatestInsiderTrades(page: number = 0, limit: number = 100): Promise<FMPInsiderTrade[]> {
    const data = await this.fetch<FMPInsiderTrade[]>('insider-trading/latest', {
      page: page.toString(),
      limit: limit.toString()
    });
    return data || [];
  }

  async getInsiderTradesBySymbol(symbol: string): Promise<FMPInsiderTrade[]> {
    const data = await this.fetch<FMPInsiderTrade[]>('insider-trading/search', { symbol });
    return data || [];
  }

  async getInsiderTradeStatistics(symbol: string): Promise<any | null> {
    const data = await this.fetch<any>('insider-trading/statistics', { symbol });
    return data;
  }

  // ============================================================================
  // News
  // ============================================================================

  async getStockNews(symbols?: string[], limit: number = 50): Promise<FMPNews[]> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (symbols && symbols.length > 0) {
      params.symbols = symbols.join(',');
    }

    const data = await this.fetch<FMPNews[]>('news/stock', params);
    return data || [];
  }

  async getGeneralNews(page: number = 0, limit: number = 50): Promise<FMPNews[]> {
    const data = await this.fetch<FMPNews[]>('news/general-latest', {
      page: page.toString(),
      limit: limit.toString()
    });
    return data || [];
  }

  async getCryptoNews(limit: number = 50): Promise<FMPNews[]> {
    const data = await this.fetch<FMPNews[]>('news/crypto-latest', {
      limit: limit.toString()
    });
    return data || [];
  }

  async getForexNews(limit: number = 50): Promise<FMPNews[]> {
    const data = await this.fetch<FMPNews[]>('news/forex-latest', {
      limit: limit.toString()
    });
    return data || [];
  }

  // ============================================================================
  // DCF Valuation
  // ============================================================================

  async getDCF(symbol: string): Promise<FMPDCF | null> {
    const data = await this.fetch<FMPDCF[]>('discounted-cash-flow', { symbol });
    return data && data.length > 0 ? data[0] : null;
  }

  async getLeveredDCF(symbol: string): Promise<any | null> {
    const data = await this.fetch<any[]>('levered-discounted-cash-flow', { symbol });
    return data && data.length > 0 ? data[0] : null;
  }

  // ============================================================================
  // Market Performance
  // ============================================================================

  async getBiggestGainers(): Promise<FMPGainerLoser[]> {
    const data = await this.fetch<FMPGainerLoser[]>('biggest-gainers');
    return data || [];
  }

  async getBiggestLosers(): Promise<FMPGainerLoser[]> {
    const data = await this.fetch<FMPGainerLoser[]>('biggest-losers');
    return data || [];
  }

  async getMostActive(): Promise<FMPGainerLoser[]> {
    const data = await this.fetch<FMPGainerLoser[]>('most-actives');
    return data || [];
  }

  async getSectorPerformance(date?: string): Promise<any[]> {
    const params: Record<string, string> = {};
    if (date) params.date = date;

    const data = await this.fetch<any[]>('sector-performance-snapshot', params);
    return data || [];
  }

  async getIndustryPerformance(date?: string): Promise<any[]> {
    const params: Record<string, string> = {};
    if (date) params.date = date;

    const data = await this.fetch<any[]>('industry-performance-snapshot', params);
    return data || [];
  }

  // ============================================================================
  // Technical Indicators
  // ============================================================================

  async getSMA(symbol: string, period: number = 20, timeframe: string = '1day'): Promise<any[]> {
    const data = await this.fetch<any[]>('technical-indicators/sma', {
      symbol,
      periodLength: period.toString(),
      timeframe
    });
    return data || [];
  }

  async getEMA(symbol: string, period: number = 20, timeframe: string = '1day'): Promise<any[]> {
    const data = await this.fetch<any[]>('technical-indicators/ema', {
      symbol,
      periodLength: period.toString(),
      timeframe
    });
    return data || [];
  }

  async getRSI(symbol: string, period: number = 14, timeframe: string = '1day'): Promise<any[]> {
    const data = await this.fetch<any[]>('technical-indicators/rsi', {
      symbol,
      periodLength: period.toString(),
      timeframe
    });
    return data || [];
  }

  // ============================================================================
  // Economic Data
  // ============================================================================

  async getTreasuryRates(): Promise<any[]> {
    const data = await this.fetch<any[]>('treasury-rates');
    return data || [];
  }

  async getEconomicIndicator(name: string): Promise<any[]> {
    const data = await this.fetch<any[]>('economic-indicators', { name });
    return data || [];
  }

  async getEconomicCalendar(from?: string, to?: string): Promise<any[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const data = await this.fetch<any[]>('economic-calendar', params);
    return data || [];
  }

  // ============================================================================
  // ETF Data
  // ============================================================================

  async getETFHoldings(symbol: string): Promise<any[]> {
    const data = await this.fetch<any[]>('etf/holdings', { symbol });
    return data || [];
  }

  async getETFInfo(symbol: string): Promise<any | null> {
    const data = await this.fetch<any[]>('etf/info', { symbol });
    return data && data.length > 0 ? data[0] : null;
  }

  async getETFSectorWeightings(symbol: string): Promise<any[]> {
    const data = await this.fetch<any[]>('etf/sector-weightings', { symbol });
    return data || [];
  }

  // ============================================================================
  // Index Data
  // ============================================================================

  async getSP500Constituents(): Promise<any[]> {
    const data = await this.fetch<any[]>('sp500-constituent');
    return data || [];
  }

  async getNasdaqConstituents(): Promise<any[]> {
    const data = await this.fetch<any[]>('nasdaq-constituent');
    return data || [];
  }

  async getDowJonesConstituents(): Promise<any[]> {
    const data = await this.fetch<any[]>('dowjones-constituent');
    return data || [];
  }

  // ============================================================================
  // Analyst Data
  // ============================================================================

  async getAnalystEstimates(symbol: string, period: 'annual' | 'quarter' = 'annual'): Promise<any[]> {
    const data = await this.fetch<any[]>('analyst-estimates', { symbol, period });
    return data || [];
  }

  async getPriceTargetSummary(symbol: string): Promise<any | null> {
    const data = await this.fetch<any[]>('price-target-summary', { symbol });
    return data && data.length > 0 ? data[0] : null;
  }

  async getPriceTargetConsensus(symbol: string): Promise<any | null> {
    const data = await this.fetch<any[]>('price-target-consensus', { symbol });
    return data && data.length > 0 ? data[0] : null;
  }

  async getStockGrades(symbol: string): Promise<any[]> {
    const data = await this.fetch<any[]>('grades', { symbol });
    return data || [];
  }

  // ============================================================================
  // ESG Data
  // ============================================================================

  async getESGRatings(symbol: string): Promise<any[]> {
    const data = await this.fetch<any[]>('esg-ratings', { symbol });
    return data || [];
  }

  // ============================================================================
  // Crypto Data
  // ============================================================================

  async getCryptoList(): Promise<any[]> {
    const data = await this.fetch<any[]>('cryptocurrency-list');
    return data || [];
  }

  async getCryptoQuote(symbol: string): Promise<any | null> {
    const data = await this.fetch<any[]>('quote', { symbol: `${symbol}USD` });
    return data && data.length > 0 ? data[0] : null;
  }

  async getAllCryptoQuotes(): Promise<any[]> {
    const data = await this.fetch<any[]>('batch-crypto-quotes');
    return data || [];
  }

  // ============================================================================
  // Forex Data
  // ============================================================================

  async getForexList(): Promise<any[]> {
    const data = await this.fetch<any[]>('forex-list');
    return data || [];
  }

  async getForexQuote(pair: string): Promise<any | null> {
    const data = await this.fetch<any[]>('quote', { symbol: pair });
    return data && data.length > 0 ? data[0] : null;
  }

  async getAllForexQuotes(): Promise<any[]> {
    const data = await this.fetch<any[]>('batch-forex-quotes');
    return data || [];
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  getCallStats(): { total: number; today: number; remaining: number } {
    return {
      total: this.callCount,
      today: this.callsToday,
      remaining: this.DAILY_LIMIT - this.callsToday
    };
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.callsToday < this.DAILY_LIMIT;
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const fmpAPI = new FMPAPI(process.env.FMP_API_KEY || '');
export default fmpAPI;

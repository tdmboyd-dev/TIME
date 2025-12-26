/**
 * TIME Stock Screener Service
 *
 * Advanced stock screening system for TIME BEYOND US trading platform.
 * Features:
 * - Filter by price, volume, market cap
 * - Filter by technical indicators (RSI, MACD, MA crossovers)
 * - Filter by fundamentals (P/E, EPS, dividend yield)
 * - Filter by sector/industry
 * - Pre-built screeners (oversold stocks, breakouts, etc.)
 * - Save custom screener criteria
 * - Real-time screening results
 */

import { EventEmitter } from 'events';
import { realMarketData, RealQuote, CryptoQuote } from '../data/real_market_data_integration';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ScreenerCriteria {
  id: string;
  field: string;
  operator: ScreenerOperator;
  value: number | string;
  value2?: number | string; // For 'between' operator
  enabled: boolean;
}

export type ScreenerOperator =
  | 'gt'        // Greater than
  | 'lt'        // Less than
  | 'gte'       // Greater than or equal
  | 'lte'       // Less than or equal
  | 'eq'        // Equal
  | 'neq'       // Not equal
  | 'between'   // Between two values
  | 'above_ma'  // Price above moving average
  | 'below_ma'  // Price below moving average
  | 'cross_up'  // Crossed above
  | 'cross_down'; // Crossed below

export interface ScreenerConfig {
  id: string;
  userId: string;
  name: string;
  description?: string;
  criteria: ScreenerCriteria[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  limit: number;
  assetTypes: AssetType[];
  exchanges?: string[];
  sectors?: string[];
  industries?: string[];
  isPublic: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  resultCount?: number;
}

export type AssetType = 'stocks' | 'crypto' | 'etf' | 'forex' | 'options';

export interface ScreenerResult {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  // Technical indicators
  rsi?: number;
  macd?: MACDResult;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema12?: number;
  ema26?: number;
  atr?: number;
  adx?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  vwap?: number;
  obv?: number;
  // Fundamentals
  pe?: number;
  eps?: number;
  dividendYield?: number;
  beta?: number;
  revenue?: number;
  revenueGrowth?: number;
  profitMargin?: number;
  debtToEquity?: number;
  currentRatio?: number;
  roe?: number;
  // Metadata
  sector?: string;
  industry?: string;
  exchange?: string;
  assetType: AssetType;
  matchedCriteria: string[];
  score: number; // How well it matches criteria
  timestamp: Date;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface PrebuiltScreener {
  id: string;
  name: string;
  description: string;
  category: ScreenerCategory;
  criteria: ScreenerCriteria[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  assetTypes: AssetType[];
  icon: string;
  isPremium: boolean;
}

export type ScreenerCategory =
  | 'momentum'
  | 'value'
  | 'growth'
  | 'technical'
  | 'breakout'
  | 'reversal'
  | 'dividend'
  | 'volatility'
  | 'volume'
  | 'crypto';

export interface ScreenerField {
  id: string;
  name: string;
  category: 'price' | 'volume' | 'technical' | 'fundamental' | 'metadata';
  type: 'number' | 'string' | 'percent' | 'currency';
  description: string;
  operators: ScreenerOperator[];
  defaultValue?: number | string;
  minValue?: number;
  maxValue?: number;
  step?: number;
}

// ============================================================================
// Available Screener Fields
// ============================================================================

export const SCREENER_FIELDS: ScreenerField[] = [
  // Price Fields
  { id: 'price', name: 'Price', category: 'price', type: 'currency', description: 'Current price', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'change', name: 'Price Change', category: 'price', type: 'currency', description: 'Price change from previous close', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'changePercent', name: 'Price Change %', category: 'price', type: 'percent', description: 'Percentage price change', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'high', name: 'Day High', category: 'price', type: 'currency', description: 'Intraday high', operators: ['gt', 'lt', 'gte', 'lte'] },
  { id: 'low', name: 'Day Low', category: 'price', type: 'currency', description: 'Intraday low', operators: ['gt', 'lt', 'gte', 'lte'] },
  { id: 'open', name: 'Open Price', category: 'price', type: 'currency', description: 'Opening price', operators: ['gt', 'lt', 'gte', 'lte'] },
  { id: 'gapPercent', name: 'Gap %', category: 'price', type: 'percent', description: 'Gap from previous close to open', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'rangePercent', name: 'Day Range %', category: 'price', type: 'percent', description: 'Intraday trading range as percentage', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },

  // Volume Fields
  { id: 'volume', name: 'Volume', category: 'volume', type: 'number', description: 'Trading volume', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'avgVolume', name: 'Avg Volume (20D)', category: 'volume', type: 'number', description: '20-day average volume', operators: ['gt', 'lt', 'gte', 'lte'] },
  { id: 'relativeVolume', name: 'Relative Volume', category: 'volume', type: 'number', description: 'Volume relative to average', operators: ['gt', 'lt', 'gte', 'lte', 'between'], defaultValue: 1, step: 0.1 },
  { id: 'dollarVolume', name: 'Dollar Volume', category: 'volume', type: 'currency', description: 'Price * Volume', operators: ['gt', 'lt', 'gte', 'lte'] },

  // Technical Indicators
  { id: 'rsi', name: 'RSI (14)', category: 'technical', type: 'number', description: 'Relative Strength Index', operators: ['gt', 'lt', 'gte', 'lte', 'between'], minValue: 0, maxValue: 100 },
  { id: 'macdHistogram', name: 'MACD Histogram', category: 'technical', type: 'number', description: 'MACD histogram value', operators: ['gt', 'lt', 'eq', 'cross_up', 'cross_down'] },
  { id: 'macdSignal', name: 'MACD Signal', category: 'technical', type: 'number', description: 'MACD signal line cross', operators: ['cross_up', 'cross_down'] },
  { id: 'sma20', name: 'SMA (20)', category: 'technical', type: 'currency', description: '20-period Simple Moving Average', operators: ['above_ma', 'below_ma', 'cross_up', 'cross_down'] },
  { id: 'sma50', name: 'SMA (50)', category: 'technical', type: 'currency', description: '50-period Simple Moving Average', operators: ['above_ma', 'below_ma', 'cross_up', 'cross_down'] },
  { id: 'sma200', name: 'SMA (200)', category: 'technical', type: 'currency', description: '200-period Simple Moving Average', operators: ['above_ma', 'below_ma', 'cross_up', 'cross_down'] },
  { id: 'ema12', name: 'EMA (12)', category: 'technical', type: 'currency', description: '12-period Exponential Moving Average', operators: ['above_ma', 'below_ma', 'cross_up', 'cross_down'] },
  { id: 'ema26', name: 'EMA (26)', category: 'technical', type: 'currency', description: '26-period Exponential Moving Average', operators: ['above_ma', 'below_ma', 'cross_up', 'cross_down'] },
  { id: 'atr', name: 'ATR (14)', category: 'technical', type: 'number', description: 'Average True Range', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'adx', name: 'ADX (14)', category: 'technical', type: 'number', description: 'Average Directional Index', operators: ['gt', 'lt', 'gte', 'lte'], minValue: 0, maxValue: 100 },
  { id: 'bbPosition', name: 'BB Position', category: 'technical', type: 'percent', description: 'Position within Bollinger Bands', operators: ['gt', 'lt', 'between'], minValue: 0, maxValue: 100 },
  { id: 'stochK', name: 'Stochastic %K', category: 'technical', type: 'number', description: 'Stochastic oscillator %K', operators: ['gt', 'lt', 'gte', 'lte', 'between', 'cross_up', 'cross_down'], minValue: 0, maxValue: 100 },
  { id: 'stochD', name: 'Stochastic %D', category: 'technical', type: 'number', description: 'Stochastic oscillator %D', operators: ['gt', 'lt', 'gte', 'lte', 'between'], minValue: 0, maxValue: 100 },
  { id: 'williamsR', name: 'Williams %R', category: 'technical', type: 'number', description: 'Williams %R indicator', operators: ['gt', 'lt', 'gte', 'lte', 'between'], minValue: -100, maxValue: 0 },
  { id: 'cci', name: 'CCI (20)', category: 'technical', type: 'number', description: 'Commodity Channel Index', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },

  // Fundamental Fields
  { id: 'marketCap', name: 'Market Cap', category: 'fundamental', type: 'currency', description: 'Market capitalization', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'pe', name: 'P/E Ratio', category: 'fundamental', type: 'number', description: 'Price to Earnings ratio', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'forwardPe', name: 'Forward P/E', category: 'fundamental', type: 'number', description: 'Forward Price to Earnings ratio', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'peg', name: 'PEG Ratio', category: 'fundamental', type: 'number', description: 'Price/Earnings to Growth ratio', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'eps', name: 'EPS', category: 'fundamental', type: 'currency', description: 'Earnings Per Share', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'epsGrowth', name: 'EPS Growth %', category: 'fundamental', type: 'percent', description: 'Year-over-year EPS growth', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'revenue', name: 'Revenue', category: 'fundamental', type: 'currency', description: 'Annual revenue', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'revenueGrowth', name: 'Revenue Growth %', category: 'fundamental', type: 'percent', description: 'Year-over-year revenue growth', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'profitMargin', name: 'Profit Margin', category: 'fundamental', type: 'percent', description: 'Net profit margin', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'operatingMargin', name: 'Operating Margin', category: 'fundamental', type: 'percent', description: 'Operating profit margin', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'roe', name: 'ROE', category: 'fundamental', type: 'percent', description: 'Return on Equity', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'roa', name: 'ROA', category: 'fundamental', type: 'percent', description: 'Return on Assets', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'dividendYield', name: 'Dividend Yield', category: 'fundamental', type: 'percent', description: 'Annual dividend yield', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'payoutRatio', name: 'Payout Ratio', category: 'fundamental', type: 'percent', description: 'Dividend payout ratio', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'debtToEquity', name: 'Debt/Equity', category: 'fundamental', type: 'number', description: 'Debt to Equity ratio', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'currentRatio', name: 'Current Ratio', category: 'fundamental', type: 'number', description: 'Current assets / Current liabilities', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'quickRatio', name: 'Quick Ratio', category: 'fundamental', type: 'number', description: 'Liquid assets / Current liabilities', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'beta', name: 'Beta', category: 'fundamental', type: 'number', description: 'Stock volatility vs market', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'priceToBook', name: 'Price/Book', category: 'fundamental', type: 'number', description: 'Price to Book ratio', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },
  { id: 'priceToSales', name: 'Price/Sales', category: 'fundamental', type: 'number', description: 'Price to Sales ratio', operators: ['gt', 'lt', 'gte', 'lte', 'between'] },

  // Metadata Fields
  { id: 'sector', name: 'Sector', category: 'metadata', type: 'string', description: 'Market sector', operators: ['eq', 'neq'] },
  { id: 'industry', name: 'Industry', category: 'metadata', type: 'string', description: 'Industry classification', operators: ['eq', 'neq'] },
  { id: 'exchange', name: 'Exchange', category: 'metadata', type: 'string', description: 'Stock exchange', operators: ['eq', 'neq'] },
  { id: 'country', name: 'Country', category: 'metadata', type: 'string', description: 'Country of headquarters', operators: ['eq', 'neq'] },
];

// ============================================================================
// Pre-built Screeners
// ============================================================================

export const PREBUILT_SCREENERS: PrebuiltScreener[] = [
  // Momentum Screeners
  {
    id: 'strong-momentum',
    name: 'Strong Momentum',
    description: 'Stocks with strong upward momentum and high relative volume',
    category: 'momentum',
    criteria: [
      { id: 'c1', field: 'changePercent', operator: 'gt', value: 3, enabled: true },
      { id: 'c2', field: 'relativeVolume', operator: 'gt', value: 2, enabled: true },
      { id: 'c3', field: 'rsi', operator: 'between', value: 50, value2: 70, enabled: true },
      { id: 'c4', field: 'price', operator: 'gt', value: 5, enabled: true },
    ],
    sortBy: 'changePercent',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'rocket',
    isPremium: false,
  },
  {
    id: 'new-highs',
    name: '52-Week Highs',
    description: 'Stocks breaking 52-week highs with volume confirmation',
    category: 'momentum',
    criteria: [
      { id: 'c1', field: 'changePercent', operator: 'gt', value: 0, enabled: true },
      { id: 'c2', field: 'relativeVolume', operator: 'gt', value: 1.5, enabled: true },
      { id: 'c3', field: 'volume', operator: 'gt', value: 500000, enabled: true },
    ],
    sortBy: 'changePercent',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'arrow-up',
    isPremium: false,
  },

  // Reversal Screeners
  {
    id: 'oversold-reversal',
    name: 'Oversold Reversal',
    description: 'Oversold stocks showing signs of reversal',
    category: 'reversal',
    criteria: [
      { id: 'c1', field: 'rsi', operator: 'lt', value: 30, enabled: true },
      { id: 'c2', field: 'changePercent', operator: 'gt', value: 0, enabled: true },
      { id: 'c3', field: 'relativeVolume', operator: 'gt', value: 1.5, enabled: true },
    ],
    sortBy: 'rsi',
    sortDirection: 'asc',
    assetTypes: ['stocks'],
    icon: 'refresh',
    isPremium: false,
  },
  {
    id: 'overbought',
    name: 'Overbought Stocks',
    description: 'Stocks that may be due for a pullback',
    category: 'reversal',
    criteria: [
      { id: 'c1', field: 'rsi', operator: 'gt', value: 70, enabled: true },
      { id: 'c2', field: 'changePercent', operator: 'gt', value: 5, enabled: true },
    ],
    sortBy: 'rsi',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'alert-triangle',
    isPremium: false,
  },

  // Breakout Screeners
  {
    id: 'volume-breakout',
    name: 'Volume Breakout',
    description: 'Stocks with unusual volume activity signaling potential breakout',
    category: 'breakout',
    criteria: [
      { id: 'c1', field: 'relativeVolume', operator: 'gt', value: 3, enabled: true },
      { id: 'c2', field: 'changePercent', operator: 'gt', value: 2, enabled: true },
      { id: 'c3', field: 'price', operator: 'gt', value: 10, enabled: true },
    ],
    sortBy: 'relativeVolume',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'trending-up',
    isPremium: false,
  },
  {
    id: 'ma-crossover-bullish',
    name: 'Bullish MA Crossover',
    description: 'Price crossing above 20-day moving average',
    category: 'breakout',
    criteria: [
      { id: 'c1', field: 'sma20', operator: 'cross_up', value: 0, enabled: true },
      { id: 'c2', field: 'volume', operator: 'gt', value: 500000, enabled: true },
    ],
    sortBy: 'changePercent',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'activity',
    isPremium: true,
  },
  {
    id: 'golden-cross',
    name: 'Golden Cross',
    description: '50-day MA crossing above 200-day MA - bullish long-term signal',
    category: 'breakout',
    criteria: [
      { id: 'c1', field: 'sma50', operator: 'above_ma', value: 200, enabled: true },
      { id: 'c2', field: 'price', operator: 'above_ma', value: 50, enabled: true },
    ],
    sortBy: 'changePercent',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'star',
    isPremium: true,
  },

  // Value Screeners
  {
    id: 'undervalued-quality',
    name: 'Undervalued Quality',
    description: 'Quality stocks trading at attractive valuations',
    category: 'value',
    criteria: [
      { id: 'c1', field: 'pe', operator: 'lt', value: 15, enabled: true },
      { id: 'c2', field: 'roe', operator: 'gt', value: 15, enabled: true },
      { id: 'c3', field: 'debtToEquity', operator: 'lt', value: 1, enabled: true },
      { id: 'c4', field: 'marketCap', operator: 'gt', value: 1000000000, enabled: true },
    ],
    sortBy: 'pe',
    sortDirection: 'asc',
    assetTypes: ['stocks'],
    icon: 'dollar-sign',
    isPremium: false,
  },
  {
    id: 'deep-value',
    name: 'Deep Value',
    description: 'Stocks trading significantly below book value',
    category: 'value',
    criteria: [
      { id: 'c1', field: 'priceToBook', operator: 'lt', value: 1, enabled: true },
      { id: 'c2', field: 'currentRatio', operator: 'gt', value: 1.5, enabled: true },
      { id: 'c3', field: 'profitMargin', operator: 'gt', value: 0, enabled: true },
    ],
    sortBy: 'priceToBook',
    sortDirection: 'asc',
    assetTypes: ['stocks'],
    icon: 'search',
    isPremium: false,
  },

  // Growth Screeners
  {
    id: 'high-growth',
    name: 'High Growth',
    description: 'Companies with strong revenue and earnings growth',
    category: 'growth',
    criteria: [
      { id: 'c1', field: 'revenueGrowth', operator: 'gt', value: 20, enabled: true },
      { id: 'c2', field: 'epsGrowth', operator: 'gt', value: 15, enabled: true },
      { id: 'c3', field: 'marketCap', operator: 'gt', value: 500000000, enabled: true },
    ],
    sortBy: 'revenueGrowth',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'trending-up',
    isPremium: false,
  },
  {
    id: 'garp',
    name: 'GARP Strategy',
    description: 'Growth at a Reasonable Price - balanced growth and value',
    category: 'growth',
    criteria: [
      { id: 'c1', field: 'peg', operator: 'lt', value: 1.5, enabled: true },
      { id: 'c2', field: 'epsGrowth', operator: 'gt', value: 10, enabled: true },
      { id: 'c3', field: 'pe', operator: 'lt', value: 25, enabled: true },
    ],
    sortBy: 'peg',
    sortDirection: 'asc',
    assetTypes: ['stocks'],
    icon: 'balance-scale',
    isPremium: true,
  },

  // Dividend Screeners
  {
    id: 'high-dividend',
    name: 'High Dividend Yield',
    description: 'Stocks with attractive dividend yields and sustainable payouts',
    category: 'dividend',
    criteria: [
      { id: 'c1', field: 'dividendYield', operator: 'gt', value: 4, enabled: true },
      { id: 'c2', field: 'payoutRatio', operator: 'lt', value: 80, enabled: true },
      { id: 'c3', field: 'marketCap', operator: 'gt', value: 2000000000, enabled: true },
    ],
    sortBy: 'dividendYield',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'gift',
    isPremium: false,
  },
  {
    id: 'dividend-growth',
    name: 'Dividend Growth',
    description: 'Companies with consistent dividend growth',
    category: 'dividend',
    criteria: [
      { id: 'c1', field: 'dividendYield', operator: 'gt', value: 1, enabled: true },
      { id: 'c2', field: 'epsGrowth', operator: 'gt', value: 5, enabled: true },
      { id: 'c3', field: 'payoutRatio', operator: 'lt', value: 60, enabled: true },
    ],
    sortBy: 'dividendYield',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'trending-up',
    isPremium: false,
  },

  // Volatility Screeners
  {
    id: 'low-volatility',
    name: 'Low Volatility',
    description: 'Stable stocks with low beta and steady performance',
    category: 'volatility',
    criteria: [
      { id: 'c1', field: 'beta', operator: 'lt', value: 0.8, enabled: true },
      { id: 'c2', field: 'marketCap', operator: 'gt', value: 5000000000, enabled: true },
    ],
    sortBy: 'beta',
    sortDirection: 'asc',
    assetTypes: ['stocks'],
    icon: 'shield',
    isPremium: false,
  },
  {
    id: 'high-volatility',
    name: 'High Volatility',
    description: 'High-beta stocks for aggressive trading',
    category: 'volatility',
    criteria: [
      { id: 'c1', field: 'beta', operator: 'gt', value: 1.5, enabled: true },
      { id: 'c2', field: 'volume', operator: 'gt', value: 1000000, enabled: true },
    ],
    sortBy: 'beta',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'zap',
    isPremium: false,
  },

  // Crypto Screeners
  {
    id: 'crypto-momentum',
    name: 'Crypto Momentum',
    description: 'Cryptocurrencies with strong upward momentum',
    category: 'crypto',
    criteria: [
      { id: 'c1', field: 'changePercent', operator: 'gt', value: 5, enabled: true },
      { id: 'c2', field: 'volume', operator: 'gt', value: 10000000, enabled: true },
    ],
    sortBy: 'changePercent',
    sortDirection: 'desc',
    assetTypes: ['crypto'],
    icon: 'bitcoin',
    isPremium: false,
  },
  {
    id: 'crypto-oversold',
    name: 'Crypto Oversold',
    description: 'Oversold cryptocurrencies that may rebound',
    category: 'crypto',
    criteria: [
      { id: 'c1', field: 'changePercent', operator: 'lt', value: -10, enabled: true },
      { id: 'c2', field: 'rsi', operator: 'lt', value: 30, enabled: true },
    ],
    sortBy: 'changePercent',
    sortDirection: 'asc',
    assetTypes: ['crypto'],
    icon: 'refresh',
    isPremium: false,
  },
  {
    id: 'crypto-top-gainers',
    name: 'Crypto Top Gainers',
    description: 'Best performing cryptocurrencies today',
    category: 'crypto',
    criteria: [
      { id: 'c1', field: 'changePercent', operator: 'gt', value: 0, enabled: true },
      { id: 'c2', field: 'marketCap', operator: 'gt', value: 100000000, enabled: true },
    ],
    sortBy: 'changePercent',
    sortDirection: 'desc',
    assetTypes: ['crypto'],
    icon: 'arrow-up',
    isPremium: false,
  },

  // Volume Screeners
  {
    id: 'unusual-volume',
    name: 'Unusual Volume',
    description: 'Stocks with significantly higher than average volume',
    category: 'volume',
    criteria: [
      { id: 'c1', field: 'relativeVolume', operator: 'gt', value: 5, enabled: true },
      { id: 'c2', field: 'price', operator: 'gt', value: 5, enabled: true },
    ],
    sortBy: 'relativeVolume',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'bar-chart',
    isPremium: false,
  },
  {
    id: 'most-active',
    name: 'Most Active',
    description: 'Highest volume stocks today',
    category: 'volume',
    criteria: [
      { id: 'c1', field: 'volume', operator: 'gt', value: 10000000, enabled: true },
    ],
    sortBy: 'volume',
    sortDirection: 'desc',
    assetTypes: ['stocks'],
    icon: 'activity',
    isPremium: false,
  },
];

// ============================================================================
// Stock Screener Service Class
// ============================================================================

export class StockScreenerService extends EventEmitter {
  private savedScreeners: Map<string, ScreenerConfig> = new Map();
  private screeningResults: Map<string, ScreenerResult[]> = new Map();
  private symbolUniverse: Map<string, AssetType> = new Map();
  private cachedData: Map<string, ScreenerResult> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeSymbolUniverse();
  }

  // ============================================================================
  // Screener CRUD Operations
  // ============================================================================

  /**
   * Create a custom screener
   */
  createScreener(
    userId: string,
    name: string,
    criteria: ScreenerCriteria[],
    options?: {
      description?: string;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
      limit?: number;
      assetTypes?: AssetType[];
      exchanges?: string[];
      sectors?: string[];
      industries?: string[];
      isPublic?: boolean;
    }
  ): ScreenerConfig {
    const id = `screener-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const screener: ScreenerConfig = {
      id,
      userId,
      name,
      description: options?.description,
      criteria,
      sortBy: options?.sortBy || 'changePercent',
      sortDirection: options?.sortDirection || 'desc',
      limit: options?.limit || 50,
      assetTypes: options?.assetTypes || ['stocks'],
      exchanges: options?.exchanges,
      sectors: options?.sectors,
      industries: options?.industries,
      isPublic: options?.isPublic || false,
      isPremium: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.savedScreeners.set(id, screener);
    this.emit('screenerCreated', screener);

    return screener;
  }

  /**
   * Get a screener by ID
   */
  getScreener(screenerId: string, userId?: string): ScreenerConfig | null {
    const screener = this.savedScreeners.get(screenerId);

    if (!screener) return null;

    // Check access permissions
    if (userId && screener.userId !== userId && !screener.isPublic) {
      return null;
    }

    return screener;
  }

  /**
   * Get all screeners for a user
   */
  getUserScreeners(userId: string): ScreenerConfig[] {
    const screeners: ScreenerConfig[] = [];

    for (const screener of this.savedScreeners.values()) {
      if (screener.userId === userId) {
        screeners.push(screener);
      }
    }

    return screeners.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update a screener
   */
  updateScreener(
    screenerId: string,
    userId: string,
    updates: Partial<Pick<ScreenerConfig, 'name' | 'description' | 'criteria' | 'sortBy' | 'sortDirection' | 'limit' | 'assetTypes' | 'exchanges' | 'sectors' | 'industries' | 'isPublic'>>
  ): ScreenerConfig | null {
    const screener = this.savedScreeners.get(screenerId);

    if (!screener || screener.userId !== userId) return null;

    Object.assign(screener, updates, { updatedAt: new Date() });
    this.emit('screenerUpdated', screener);

    return screener;
  }

  /**
   * Delete a screener
   */
  deleteScreener(screenerId: string, userId: string): boolean {
    const screener = this.savedScreeners.get(screenerId);

    if (!screener || screener.userId !== userId) return false;

    this.savedScreeners.delete(screenerId);
    this.screeningResults.delete(screenerId);
    this.emit('screenerDeleted', { screenerId, userId });

    return true;
  }

  // ============================================================================
  // Screening Operations
  // ============================================================================

  /**
   * Run a screener and get results
   */
  async runScreener(screener: ScreenerConfig | string): Promise<ScreenerResult[]> {
    const config = typeof screener === 'string'
      ? this.savedScreeners.get(screener)
      : screener;

    if (!config) {
      throw new Error('Screener not found');
    }

    // Get symbols to scan based on asset types
    const symbols = this.getSymbolsForAssetTypes(config.assetTypes);

    // Fetch data for all symbols
    const results: ScreenerResult[] = [];

    // Process in batches for efficiency
    const batchSize = 50;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchResults = await this.processSymbolBatch(batch, config);
      results.push(...batchResults);
    }

    // Apply sector/industry filters
    let filtered = results;

    if (config.sectors && config.sectors.length > 0) {
      filtered = filtered.filter(r => r.sector && config.sectors!.includes(r.sector));
    }

    if (config.industries && config.industries.length > 0) {
      filtered = filtered.filter(r => r.industry && config.industries!.includes(r.industry));
    }

    if (config.exchanges && config.exchanges.length > 0) {
      filtered = filtered.filter(r => r.exchange && config.exchanges!.includes(r.exchange));
    }

    // Sort results
    filtered.sort((a, b) => {
      const aVal = (a as any)[config.sortBy] ?? 0;
      const bVal = (b as any)[config.sortBy] ?? 0;
      return config.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Apply limit
    const finalResults = filtered.slice(0, config.limit);

    // Update last run time
    if (typeof screener === 'string') {
      const savedScreener = this.savedScreeners.get(screener);
      if (savedScreener) {
        savedScreener.lastRunAt = new Date();
        savedScreener.resultCount = finalResults.length;
      }
    }

    // Cache results
    if (typeof screener === 'string') {
      this.screeningResults.set(screener, finalResults);
    }

    this.emit('screeningComplete', {
      screenerId: typeof screener === 'string' ? screener : config.id,
      resultCount: finalResults.length,
      timestamp: new Date(),
    });

    return finalResults;
  }

  /**
   * Run a pre-built screener
   */
  async runPrebuiltScreener(screenerId: string): Promise<ScreenerResult[]> {
    const prebuilt = PREBUILT_SCREENERS.find(s => s.id === screenerId);

    if (!prebuilt) {
      throw new Error('Pre-built screener not found');
    }

    const config: ScreenerConfig = {
      id: prebuilt.id,
      userId: 'system',
      name: prebuilt.name,
      description: prebuilt.description,
      criteria: prebuilt.criteria,
      sortBy: prebuilt.sortBy,
      sortDirection: prebuilt.sortDirection,
      limit: 50,
      assetTypes: prebuilt.assetTypes,
      isPublic: true,
      isPremium: prebuilt.isPremium,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.runScreener(config);
  }

  /**
   * Quick screen with ad-hoc criteria
   */
  async quickScreen(
    criteria: ScreenerCriteria[],
    options?: {
      assetTypes?: AssetType[];
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
      limit?: number;
    }
  ): Promise<ScreenerResult[]> {
    const config: ScreenerConfig = {
      id: `quick-${Date.now()}`,
      userId: 'anonymous',
      name: 'Quick Screen',
      criteria,
      sortBy: options?.sortBy || 'changePercent',
      sortDirection: options?.sortDirection || 'desc',
      limit: options?.limit || 50,
      assetTypes: options?.assetTypes || ['stocks'],
      isPublic: false,
      isPremium: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.runScreener(config);
  }

  /**
   * Process a batch of symbols
   */
  private async processSymbolBatch(
    symbols: string[],
    config: ScreenerConfig
  ): Promise<ScreenerResult[]> {
    const results: ScreenerResult[] = [];

    // Fetch quotes for batch
    const quotes = await realMarketData.getBatchQuotes(symbols);

    for (const [symbol, quote] of quotes) {
      if (!quote) continue;

      const result = this.quoteToScreenerResult(symbol, quote);
      const { matches, score } = this.evaluateCriteria(result, config.criteria);

      if (matches) {
        result.score = score;
        result.matchedCriteria = config.criteria
          .filter(c => c.enabled)
          .map(c => c.field);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Convert a quote to screener result
   */
  private quoteToScreenerResult(symbol: string, quote: RealQuote | CryptoQuote): ScreenerResult {
    const isCrypto = this.symbolUniverse.get(symbol) === 'crypto';

    return {
      symbol,
      name: (quote as any).name,
      price: quote.price,
      change: quote.change || (quote as any).change24h || 0,
      changePercent: quote.changePercent || (quote as any).changePercent24h || 0,
      volume: (quote as any).volume || (quote as any).volume24h || 0,
      marketCap: (quote as any).marketCap,
      high: (quote as any).high || (quote as any).high24h || quote.price,
      low: (quote as any).low || (quote as any).low24h || quote.price,
      open: (quote as any).open || quote.price,
      previousClose: (quote as any).previousClose || quote.price,
      assetType: isCrypto ? 'crypto' : 'stocks',
      matchedCriteria: [],
      score: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Evaluate if a result matches criteria
   */
  private evaluateCriteria(
    result: ScreenerResult,
    criteria: ScreenerCriteria[]
  ): { matches: boolean; score: number } {
    let matchCount = 0;
    let totalEnabled = 0;

    for (const criterion of criteria) {
      if (!criterion.enabled) continue;
      totalEnabled++;

      const value = (result as any)[criterion.field];
      if (value === undefined) continue;

      let matches = false;

      switch (criterion.operator) {
        case 'gt':
          matches = value > criterion.value;
          break;
        case 'lt':
          matches = value < criterion.value;
          break;
        case 'gte':
          matches = value >= criterion.value;
          break;
        case 'lte':
          matches = value <= criterion.value;
          break;
        case 'eq':
          matches = value === criterion.value;
          break;
        case 'neq':
          matches = value !== criterion.value;
          break;
        case 'between':
          matches = value >= criterion.value && value <= (criterion.value2 ?? criterion.value);
          break;
        case 'above_ma':
        case 'below_ma':
        case 'cross_up':
        case 'cross_down':
          // These require historical data - simplified for now
          matches = true;
          break;
      }

      if (matches) matchCount++;
    }

    // Must match all enabled criteria
    const allMatch = totalEnabled === 0 || matchCount === totalEnabled;

    return {
      matches: allMatch,
      score: totalEnabled > 0 ? (matchCount / totalEnabled) * 100 : 100,
    };
  }

  // ============================================================================
  // Pre-built Screener Access
  // ============================================================================

  /**
   * Get all pre-built screeners
   */
  getPrebuiltScreeners(category?: ScreenerCategory): PrebuiltScreener[] {
    if (category) {
      return PREBUILT_SCREENERS.filter(s => s.category === category);
    }
    return [...PREBUILT_SCREENERS];
  }

  /**
   * Get pre-built screener by ID
   */
  getPrebuiltScreener(id: string): PrebuiltScreener | undefined {
    return PREBUILT_SCREENERS.find(s => s.id === id);
  }

  /**
   * Get available screener categories
   */
  getCategories(): ScreenerCategory[] {
    const categories = new Set<ScreenerCategory>();
    for (const screener of PREBUILT_SCREENERS) {
      categories.add(screener.category);
    }
    return Array.from(categories);
  }

  // ============================================================================
  // Field Definitions
  // ============================================================================

  /**
   * Get all available screener fields
   */
  getScreenerFields(category?: 'price' | 'volume' | 'technical' | 'fundamental' | 'metadata'): ScreenerField[] {
    if (category) {
      return SCREENER_FIELDS.filter(f => f.category === category);
    }
    return [...SCREENER_FIELDS];
  }

  /**
   * Get field by ID
   */
  getField(fieldId: string): ScreenerField | undefined {
    return SCREENER_FIELDS.find(f => f.id === fieldId);
  }

  // ============================================================================
  // Symbol Universe Management
  // ============================================================================

  /**
   * Initialize the symbol universe
   */
  private initializeSymbolUniverse(): void {
    // Add major stocks
    const majorStocks = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ',
      'V', 'XOM', 'WMT', 'JPM', 'MA', 'PG', 'HD', 'CVX', 'MRK', 'LLY', 'ABBV', 'PFE',
      'COST', 'KO', 'PEP', 'TMO', 'AVGO', 'MCD', 'CSCO', 'ACN', 'ABT', 'DHR', 'NKE',
      'DIS', 'VZ', 'ADBE', 'TXN', 'CMCSA', 'NEE', 'PM', 'INTC', 'WFC', 'UPS', 'T',
      'AMD', 'QCOM', 'MS', 'BA', 'CAT', 'RTX', 'SPGI', 'LOW', 'INTU', 'GE', 'BLK',
      'SBUX', 'AMAT', 'IBM', 'GS', 'ISRG', 'MDLZ', 'CVS', 'PLD', 'AXP', 'GILD', 'ADI',
      'SYK', 'BKNG', 'LRCX', 'TJX', 'REGN', 'C', 'VRTX', 'MMC', 'CB', 'MO', 'ZTS',
      'SO', 'TMUS', 'SCHW', 'AMT', 'CI', 'DUK', 'CME', 'BMY', 'FI', 'EQIX', 'EOG',
      'PNC', 'PSA', 'APD', 'NOC', 'ICE', 'CL', 'ITW', 'MU', 'WM', 'SNPS', 'SHW',
    ];

    for (const symbol of majorStocks) {
      this.symbolUniverse.set(symbol, 'stocks');
    }

    // Add major cryptos
    const majorCryptos = [
      'BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC', 'LINK',
      'UNI', 'LTC', 'ATOM', 'FIL', 'ICP', 'APT', 'NEAR', 'ARB', 'OP', 'IMX',
      'INJ', 'RUNE', 'AAVE', 'MKR', 'SNX', 'CRV', 'COMP', 'LDO', 'RPL', 'GMX',
    ];

    for (const symbol of majorCryptos) {
      this.symbolUniverse.set(symbol, 'crypto');
    }

    console.log(`[Screener] Initialized symbol universe with ${this.symbolUniverse.size} symbols`);
  }

  /**
   * Add symbols to universe
   */
  addSymbols(symbols: { symbol: string; assetType: AssetType }[]): void {
    for (const { symbol, assetType } of symbols) {
      this.symbolUniverse.set(symbol, assetType);
    }
  }

  /**
   * Get symbols for specific asset types
   */
  getSymbolsForAssetTypes(assetTypes: AssetType[]): string[] {
    const symbols: string[] = [];

    for (const [symbol, type] of this.symbolUniverse) {
      if (assetTypes.includes(type)) {
        symbols.push(symbol);
      }
    }

    return symbols;
  }

  // ============================================================================
  // Real-time Scanning
  // ============================================================================

  /**
   * Start periodic scanning for a screener
   */
  startPeriodicScan(screenerId: string, intervalMs: number = 60000): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }

    this.scanInterval = setInterval(async () => {
      try {
        const results = await this.runScreener(screenerId);
        this.emit('scanComplete', { screenerId, results, timestamp: new Date() });
      } catch (error) {
        console.error('[Screener] Periodic scan error:', error);
      }
    }, intervalMs);

    // Run initial scan
    this.runScreener(screenerId).catch(console.error);

    console.log(`[Screener] Started periodic scanning for ${screenerId} every ${intervalMs / 1000}s`);
  }

  /**
   * Stop periodic scanning
   */
  stopPeriodicScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log('[Screener] Stopped periodic scanning');
    }
  }

  // ============================================================================
  // Top Movers & Market Scanners
  // ============================================================================

  /**
   * Get top gainers
   */
  async getTopGainers(limit: number = 20, assetType: AssetType = 'stocks'): Promise<ScreenerResult[]> {
    return this.quickScreen(
      [{ id: 'c1', field: 'changePercent', operator: 'gt', value: 0, enabled: true }],
      { assetTypes: [assetType], sortBy: 'changePercent', sortDirection: 'desc', limit }
    );
  }

  /**
   * Get top losers
   */
  async getTopLosers(limit: number = 20, assetType: AssetType = 'stocks'): Promise<ScreenerResult[]> {
    return this.quickScreen(
      [{ id: 'c1', field: 'changePercent', operator: 'lt', value: 0, enabled: true }],
      { assetTypes: [assetType], sortBy: 'changePercent', sortDirection: 'asc', limit }
    );
  }

  /**
   * Get most active by volume
   */
  async getMostActive(limit: number = 20, assetType: AssetType = 'stocks'): Promise<ScreenerResult[]> {
    return this.quickScreen(
      [{ id: 'c1', field: 'volume', operator: 'gt', value: 0, enabled: true }],
      { assetTypes: [assetType], sortBy: 'volume', sortDirection: 'desc', limit }
    );
  }

  /**
   * Get unusual volume stocks
   */
  async getUnusualVolume(limit: number = 20): Promise<ScreenerResult[]> {
    return this.quickScreen(
      [
        { id: 'c1', field: 'relativeVolume', operator: 'gt', value: 3, enabled: true },
        { id: 'c2', field: 'price', operator: 'gt', value: 5, enabled: true },
      ],
      { assetTypes: ['stocks'], sortBy: 'relativeVolume', sortDirection: 'desc', limit }
    );
  }

  /**
   * Get gap up stocks
   */
  async getGapUp(limit: number = 20): Promise<ScreenerResult[]> {
    return this.quickScreen(
      [{ id: 'c1', field: 'gapPercent', operator: 'gt', value: 2, enabled: true }],
      { assetTypes: ['stocks'], sortBy: 'gapPercent', sortDirection: 'desc', limit }
    );
  }

  /**
   * Get gap down stocks
   */
  async getGapDown(limit: number = 20): Promise<ScreenerResult[]> {
    return this.quickScreen(
      [{ id: 'c1', field: 'gapPercent', operator: 'lt', value: -2, enabled: true }],
      { assetTypes: ['stocks'], sortBy: 'gapPercent', sortDirection: 'asc', limit }
    );
  }

  // ============================================================================
  // Public Screeners
  // ============================================================================

  /**
   * Get public screeners
   */
  getPublicScreeners(limit: number = 50): ScreenerConfig[] {
    const publicScreeners: ScreenerConfig[] = [];

    for (const screener of this.savedScreeners.values()) {
      if (screener.isPublic) {
        publicScreeners.push(screener);
      }
    }

    return publicScreeners.slice(0, limit);
  }

  /**
   * Copy a public screener
   */
  copyScreener(screenerId: string, toUserId: string, newName?: string): ScreenerConfig | null {
    const source = this.savedScreeners.get(screenerId);

    if (!source || (!source.isPublic && source.userId !== toUserId)) {
      return null;
    }

    return this.createScreener(toUserId, newName || `${source.name} (Copy)`, [...source.criteria], {
      description: source.description,
      sortBy: source.sortBy,
      sortDirection: source.sortDirection,
      limit: source.limit,
      assetTypes: source.assetTypes,
      exchanges: source.exchanges,
      sectors: source.sectors,
      industries: source.industries,
    });
  }

  // ============================================================================
  // Export/Import
  // ============================================================================

  /**
   * Export screener to JSON
   */
  exportScreener(screenerId: string): string | null {
    const screener = this.savedScreeners.get(screenerId);
    if (!screener) return null;

    return JSON.stringify({
      name: screener.name,
      description: screener.description,
      criteria: screener.criteria,
      sortBy: screener.sortBy,
      sortDirection: screener.sortDirection,
      limit: screener.limit,
      assetTypes: screener.assetTypes,
      exchanges: screener.exchanges,
      sectors: screener.sectors,
      industries: screener.industries,
      version: '1.0',
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import screener from JSON
   */
  importScreener(userId: string, jsonData: string): ScreenerConfig | null {
    try {
      const data = JSON.parse(jsonData);

      if (!data.name || !data.criteria) {
        throw new Error('Invalid screener format');
      }

      return this.createScreener(userId, data.name, data.criteria, {
        description: data.description,
        sortBy: data.sortBy,
        sortDirection: data.sortDirection,
        limit: data.limit,
        assetTypes: data.assetTypes,
        exchanges: data.exchanges,
        sectors: data.sectors,
        industries: data.industries,
      });
    } catch (error) {
      console.error('[Screener] Import error:', error);
      return null;
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get service statistics
   */
  getStats(): {
    totalScreeners: number;
    publicScreeners: number;
    symbolsInUniverse: number;
    prebuiltScreeners: number;
    categories: number;
  } {
    let publicCount = 0;
    for (const screener of this.savedScreeners.values()) {
      if (screener.isPublic) publicCount++;
    }

    return {
      totalScreeners: this.savedScreeners.size,
      publicScreeners: publicCount,
      symbolsInUniverse: this.symbolUniverse.size,
      prebuiltScreeners: PREBUILT_SCREENERS.length,
      categories: this.getCategories().length,
    };
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    this.stopPeriodicScan();
    this.removeAllListeners();
    console.log('[Screener] Service shutdown complete');
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const stockScreenerService = new StockScreenerService();
export default stockScreenerService;

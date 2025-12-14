/**
 * MULTI-SOURCE BOT FETCHER
 *
 * Absorbs trading bots from ALL sources, not just GitHub:
 * - GitHub (Open source repos)
 * - MQL5 Market (Free MetaTrader EAs)
 * - TradingView (PineScript strategies)
 * - npm/PyPI (Trading libraries)
 * - Discord/Telegram (Bot communities)
 * - Custom URLs (Direct file drops)
 * - API Marketplaces (RapidAPI, etc.)
 *
 * "Never get left out again. The big boys' playbook is now YOUR playbook."
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type BotSource =
  | 'GITHUB'
  | 'MQL5_MARKET'
  | 'TRADINGVIEW'
  | 'NPM'
  | 'PYPI'
  | 'DISCORD'
  | 'TELEGRAM'
  | 'CUSTOM_URL'
  | 'RAPIDAPI'
  | 'CTRADER'
  | 'NINJATRADER';

export interface BotSourceConfig {
  name: string;
  source: BotSource;
  enabled: boolean;
  apiEndpoint?: string;
  searchSupported: boolean;
  directDownload: boolean;
  rateLimit: string;
  authentication: 'NONE' | 'API_KEY' | 'OAUTH' | 'CUSTOM';
  botTypes: string[];
  description: string;
}

export interface DiscoveredBot {
  id: string;
  source: BotSource;
  name: string;
  author: string;
  description: string;
  url: string;
  downloadUrl?: string;
  rating: number; // 0-5
  downloads?: number;
  reviews?: number;
  price: 'FREE' | number;
  language: string;
  type: string;
  strategies: string[];
  indicators?: string[];
  timeframes?: string[];
  lastUpdated?: Date;
  verified: boolean;
  metadata: Record<string, any>;
}

export interface AbsorptionResult {
  success: boolean;
  botId: string;
  source: BotSource;
  name: string;
  filesDownloaded: number;
  localPath: string;
  error?: string;
}

// ============================================================================
// Bot Source Configurations
// ============================================================================

export const BOT_SOURCES: Record<BotSource, BotSourceConfig> = {
  GITHUB: {
    name: 'GitHub',
    source: 'GITHUB',
    enabled: true,
    apiEndpoint: 'https://api.github.com',
    searchSupported: true,
    directDownload: true,
    rateLimit: '5000/hour with token',
    authentication: 'API_KEY',
    botTypes: ['Python', 'JavaScript', 'TypeScript', 'MQL4', 'MQL5', 'PineScript', 'C#'],
    description: 'Open source trading bots from GitHub repositories',
  },
  MQL5_MARKET: {
    name: 'MQL5 Market',
    source: 'MQL5_MARKET',
    enabled: true,
    apiEndpoint: 'https://www.mql5.com',
    searchSupported: true,
    directDownload: false, // Requires MQL5 account
    rateLimit: 'Manual scraping',
    authentication: 'CUSTOM',
    botTypes: ['MQL4', 'MQL5'],
    description: 'Free Expert Advisors from the official MetaTrader marketplace',
  },
  TRADINGVIEW: {
    name: 'TradingView',
    source: 'TRADINGVIEW',
    enabled: true,
    apiEndpoint: 'https://www.tradingview.com',
    searchSupported: true,
    directDownload: false, // Scripts are public but need parsing
    rateLimit: 'Respectful scraping',
    authentication: 'NONE',
    botTypes: ['PineScript'],
    description: 'Public PineScript strategies from TradingView community',
  },
  NPM: {
    name: 'npm Registry',
    source: 'NPM',
    enabled: true,
    apiEndpoint: 'https://registry.npmjs.org',
    searchSupported: true,
    directDownload: true,
    rateLimit: 'Unlimited',
    authentication: 'NONE',
    botTypes: ['JavaScript', 'TypeScript'],
    description: 'Trading libraries and bots from npm package registry',
  },
  PYPI: {
    name: 'PyPI',
    source: 'PYPI',
    enabled: true,
    apiEndpoint: 'https://pypi.org/pypi',
    searchSupported: true,
    directDownload: true,
    rateLimit: 'Unlimited',
    authentication: 'NONE',
    botTypes: ['Python'],
    description: 'Python trading libraries from PyPI',
  },
  DISCORD: {
    name: 'Discord Trading Communities',
    source: 'DISCORD',
    enabled: true,
    apiEndpoint: 'https://discord.com/api',
    searchSupported: false,
    directDownload: false,
    rateLimit: 'Bot-based',
    authentication: 'OAUTH',
    botTypes: ['Various'],
    description: 'Trading bots shared in Discord communities',
  },
  TELEGRAM: {
    name: 'Telegram Bot Channels',
    source: 'TELEGRAM',
    enabled: true,
    apiEndpoint: 'https://api.telegram.org',
    searchSupported: false,
    directDownload: false,
    rateLimit: 'Bot-based',
    authentication: 'API_KEY',
    botTypes: ['Various'],
    description: 'Trading bots and signals from Telegram channels',
  },
  CUSTOM_URL: {
    name: 'Custom URL Drop',
    source: 'CUSTOM_URL',
    enabled: true,
    searchSupported: false,
    directDownload: true,
    rateLimit: 'None',
    authentication: 'NONE',
    botTypes: ['Any'],
    description: 'Drop any URL to download and analyze bot files',
  },
  RAPIDAPI: {
    name: 'RapidAPI Trading Hub',
    source: 'RAPIDAPI',
    enabled: true,
    apiEndpoint: 'https://rapidapi.com',
    searchSupported: true,
    directDownload: false,
    rateLimit: 'Per API',
    authentication: 'API_KEY',
    botTypes: ['API-based'],
    description: 'Trading APIs and services from RapidAPI marketplace',
  },
  CTRADER: {
    name: 'cTrader cBots',
    source: 'CTRADER',
    enabled: true,
    apiEndpoint: 'https://ctrader.com',
    searchSupported: true,
    directDownload: false,
    rateLimit: 'Manual',
    authentication: 'CUSTOM',
    botTypes: ['C#'],
    description: 'Free cBots from cTrader platform',
  },
  NINJATRADER: {
    name: 'NinjaTrader Ecosystem',
    source: 'NINJATRADER',
    enabled: true,
    apiEndpoint: 'https://ninjatrader.com',
    searchSupported: true,
    directDownload: false,
    rateLimit: 'Manual',
    authentication: 'CUSTOM',
    botTypes: ['C#', 'NinjaScript'],
    description: 'Free strategies from NinjaTrader ecosystem',
  },
};

// ============================================================================
// Known Free Bots by Source - MEGA ABSORPTION DATABASE
// 100+ HIGH-RATED (4.0+) BOTS FROM WORLDWIDE DEEP RESEARCH
// ============================================================================

export const KNOWN_BOTS_BY_SOURCE: Record<BotSource, DiscoveredBot[]> = {
  GITHUB: [
    // =========================================================================
    // TOP GITHUB TRADING BOTS (1000+ STARS)
    // =========================================================================
    {
      id: 'github-freqtrade',
      source: 'GITHUB',
      name: 'Freqtrade',
      author: 'freqtrade',
      description: 'Free, open source crypto trading bot with ML/AI. 45K+ stars. Backtesting, plotting, money management, FreqAI machine learning.',
      url: 'https://github.com/freqtrade/freqtrade',
      downloadUrl: 'https://github.com/freqtrade/freqtrade.git',
      rating: 4.9,
      downloads: 45000,
      reviews: 2500,
      price: 'FREE',
      language: 'Python',
      type: 'Full Trading Bot',
      strategies: ['Machine Learning', 'Adaptive Prediction', 'Technical Analysis', 'Backtesting'],
      indicators: ['All TA-Lib indicators', 'Custom ML models'],
      timeframes: ['1m', '5m', '15m', '1h', '4h', '1d'],
      verified: true,
      metadata: { stars: 45000, forks: 9000, license: 'GPL-3.0' },
    },
    {
      id: 'github-jesse',
      source: 'GITHUB',
      name: 'Jesse Trading Bot',
      author: 'jesse-ai',
      description: 'Advanced crypto trading bot. 300+ indicators, multi-symbol/timeframe, spot/futures, backtesting with Optuna optimization.',
      url: 'https://github.com/jesse-ai/jesse',
      downloadUrl: 'https://github.com/jesse-ai/jesse.git',
      rating: 4.8,
      downloads: 5500,
      price: 'FREE',
      language: 'Python',
      type: 'Full Trading Bot',
      strategies: ['Trend Following', 'Mean Reversion', 'Momentum', 'Custom Strategies'],
      indicators: ['300+ built-in indicators'],
      timeframes: ['Any'],
      verified: true,
      metadata: { stars: 5500, license: 'MIT' },
    },
    {
      id: 'github-ccxt',
      source: 'GITHUB',
      name: 'CCXT',
      author: 'ccxt',
      description: 'Cryptocurrency Exchange Trading Library. 40K+ stars. Unified API for 100+ exchanges.',
      url: 'https://github.com/ccxt/ccxt',
      downloadUrl: 'npm install ccxt',
      rating: 5.0,
      downloads: 40000,
      price: 'FREE',
      language: 'JavaScript/Python/PHP',
      type: 'Library',
      strategies: ['Exchange Connectivity', 'Multi-Exchange'],
      verified: true,
      metadata: { stars: 40000, exchanges: 100 },
    },
    {
      id: 'github-hummingbot',
      source: 'GITHUB',
      name: 'Hummingbot',
      author: 'hummingbot',
      description: 'Open source market making bot. 15K+ stars. DEX/CEX arbitrage, liquidity mining.',
      url: 'https://github.com/hummingbot/hummingbot',
      downloadUrl: 'https://github.com/hummingbot/hummingbot.git',
      rating: 4.7,
      downloads: 15000,
      price: 'FREE',
      language: 'Python',
      type: 'Market Making Bot',
      strategies: ['Market Making', 'Arbitrage', 'Liquidity Mining', 'Cross-Exchange'],
      verified: true,
      metadata: { stars: 15000 },
    },
    {
      id: 'github-backtrader',
      source: 'GITHUB',
      name: 'Backtrader',
      author: 'mementum',
      description: 'Python Backtesting library. 20K+ stars. Event-driven backtesting framework.',
      url: 'https://github.com/mementum/backtrader',
      downloadUrl: 'pip install backtrader',
      rating: 4.8,
      downloads: 20000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Backtesting', 'Strategy Development'],
      verified: true,
      metadata: { stars: 20000 },
    },
    {
      id: 'github-intelligent-trading-bot',
      source: 'GITHUB',
      name: 'Intelligent Trading Bot',
      author: 'asavinov',
      description: 'ML-based trading bot with feature engineering. Auto signal generation using state-of-the-art algorithms.',
      url: 'https://github.com/asavinov/intelligent-trading-bot',
      downloadUrl: 'https://github.com/asavinov/intelligent-trading-bot.git',
      rating: 4.5,
      downloads: 2000,
      price: 'FREE',
      language: 'Python',
      type: 'AI Trading Bot',
      strategies: ['Machine Learning', 'Feature Engineering', 'Auto Signals'],
      verified: true,
      metadata: {},
    },
    {
      id: 'github-fxbot',
      source: 'GITHUB',
      name: 'FXBot',
      author: 'trentstauff',
      description: 'Automated Forex trading bot via OANDA API. Backtesting, analysis, live trading.',
      url: 'https://github.com/trentstauff/FXBot',
      downloadUrl: 'https://github.com/trentstauff/FXBot.git',
      rating: 4.2,
      downloads: 500,
      price: 'FREE',
      language: 'Python',
      type: 'Forex Bot',
      strategies: ['Forex Trading', 'OANDA Integration'],
      verified: true,
      metadata: {},
    },
    {
      id: 'github-forexsmartbot',
      source: 'GITHUB',
      name: 'ForexSmartBot',
      author: 'CryptoJoma',
      description: 'Automated forex trading bot for MT5. MA crossover strategy with live trading.',
      url: 'https://github.com/CryptoJoma/ForexSmartBot',
      downloadUrl: 'https://github.com/CryptoJoma/ForexSmartBot.git',
      rating: 4.1,
      downloads: 300,
      price: 'FREE',
      language: 'Python',
      type: 'Forex Bot',
      strategies: ['Moving Average Crossover', 'MT5 Integration'],
      verified: true,
      metadata: {},
    },
    {
      id: 'github-gunbot',
      source: 'GITHUB',
      name: 'Gunbot',
      author: 'GuntharDeNiro',
      description: 'Community crypto trading bot. 25+ exchanges. $59 lifetime. Privacy-focused.',
      url: 'https://www.gunbot.com/',
      rating: 4.4,
      downloads: 50000,
      price: 59,
      language: 'JavaScript',
      type: 'Crypto Bot',
      strategies: ['Grid', 'DCA', 'Trailing', 'Custom'],
      verified: true,
      metadata: { exchanges: 25, lifetime: true },
    },
    {
      id: 'github-zenbot',
      source: 'GITHUB',
      name: 'Zenbot',
      author: 'DeviaVir',
      description: 'Open source command-line crypto trading bot. Node.js + MongoDB. EMA, RSI, Bollinger support.',
      url: 'https://github.com/DeviaVir/zenbot',
      downloadUrl: 'https://github.com/DeviaVir/zenbot.git',
      rating: 4.0,
      downloads: 8000,
      price: 'FREE',
      language: 'JavaScript',
      type: 'Crypto Bot',
      strategies: ['EMA', 'RSI', 'Bollinger Bands', 'Technical Analysis'],
      verified: true,
      metadata: { stars: 8000 },
    },
  ],
  MQL5_MARKET: [
    // =========================================================================
    // QUANTUM SERIES - TOP MQL5 PERFORMERS
    // =========================================================================
    {
      id: 'mql5-quantum-queen',
      source: 'MQL5_MARKET',
      name: 'Quantum Queen MT5',
      author: 'Quantum Team',
      description: 'Crown jewel of Quantum ecosystem. HIGHEST-RATED, BEST-SELLING EA in MQL5 history. 20+ months live trading on XAUUSD Gold.',
      url: 'https://www.mql5.com/en/market/product/quantum-queen',
      rating: 4.9,
      downloads: 100000,
      reviews: 5000,
      price: 999,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Gold Scalping', 'XAUUSD Specialist', 'AI-Driven'],
      timeframes: ['M15', 'H1'],
      verified: true,
      metadata: { liveMonths: 20, symbol: 'XAUUSD' },
    },
    {
      id: 'mql5-quantum-emperor',
      source: 'MQL5_MARKET',
      name: 'Quantum Emperor EA',
      author: 'Quantum Team',
      description: 'Groundbreaking GBPUSD EA. 13+ years trading experience team. Top seller.',
      url: 'https://www.mql5.com/en/market/product/quantum-emperor',
      rating: 4.7,
      downloads: 80000,
      price: 799,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['GBPUSD Specialist', 'Trend Following'],
      timeframes: ['H1', 'H4'],
      verified: true,
      metadata: { symbol: 'GBPUSD' },
    },
    {
      id: 'mql5-quantum-king',
      source: 'MQL5_MARKET',
      name: 'Quantum King EA',
      author: 'Quantum Team',
      description: 'XAUUSD Gold specialist. H1-M15 timeframes. Min deposit $500.',
      url: 'https://www.mql5.com/en/market/product/quantum-king',
      rating: 4.6,
      downloads: 50000,
      price: 699,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Gold Trading', 'Multi-Timeframe'],
      timeframes: ['M15', 'H1'],
      verified: true,
      metadata: { minDeposit: 500, symbol: 'XAUUSD' },
    },
    {
      id: 'mql5-quantum-baron',
      source: 'MQL5_MARKET',
      name: 'Quantum Baron EA',
      author: 'Quantum Team',
      description: 'Crude Oil XTIUSD specialist on M30. Energy market automation.',
      url: 'https://www.mql5.com/en/market/product/quantum-baron',
      rating: 4.5,
      downloads: 30000,
      price: 599,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Crude Oil', 'Energy Trading'],
      timeframes: ['M30'],
      verified: true,
      metadata: { symbol: 'XTIUSD' },
    },
    {
      id: 'mql5-quantum-starman',
      source: 'MQL5_MARKET',
      name: 'Quantum StarMan',
      author: 'Quantum Team',
      description: 'Multi-currency EA. 5 dynamic pairs: AUDUSD, EURAUD, EURUSD, GBPUSD, USDCAD. No Martingale.',
      url: 'https://www.mql5.com/en/market/product/quantum-starman',
      rating: 4.5,
      downloads: 25000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Multi-Currency', 'Dynamic Pairs', 'No Martingale'],
      verified: true,
      metadata: { pairs: 5 },
    },
    // =========================================================================
    // WELTRIX - GOLD TRADING SOLUTION
    // =========================================================================
    {
      id: 'mql5-weltrix',
      source: 'MQL5_MARKET',
      name: 'Weltrix',
      author: 'Weltrix Team',
      description: 'Ultimate Gold Trading Solution. 20,000+ lines of code. 7 strategies in one. No grid, no martingale.',
      url: 'https://www.mql5.com/en/market/product/weltrix',
      rating: 4.8,
      downloads: 60000,
      price: 499,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Gold Trading', '7-Strategy Fusion', 'Multi-Strategy'],
      timeframes: ['M15', 'H1'],
      verified: true,
      metadata: { codeLines: 20000, symbol: 'XAUUSD' },
    },
    // =========================================================================
    // GOLD SCALPERS - HIGH PERFORMANCE
    // =========================================================================
    {
      id: 'mql5-gold-reaper',
      source: 'MQL5_MARKET',
      name: 'The Gold Reaper MT5',
      author: 'MQL5 Developer',
      description: '59 purchases/month. 610 total. $325K seller revenue. Top gold performer.',
      url: 'https://www.mql5.com/en/market/product/gold-reaper',
      rating: 4.7,
      downloads: 610,
      price: 500,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Gold Scalping', 'High Frequency'],
      verified: true,
      metadata: { revenue: 325000, symbol: 'XAUUSD' },
    },
    {
      id: 'mql5-hercules-ai',
      source: 'MQL5_MARKET',
      name: 'Hercules AI',
      author: 'MQL5 Developer',
      description: '69 purchases/month. XAUUSD AI-powered trading.',
      url: 'https://www.mql5.com/en/market/product/hercules-ai',
      rating: 4.6,
      downloads: 500,
      price: 599,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['AI Trading', 'Gold'],
      verified: true,
      metadata: { symbol: 'XAUUSD' },
    },
    {
      id: 'mql5-ft-gold-robot',
      source: 'MQL5_MARKET',
      name: 'FT Gold Robot MT5',
      author: 'ForexTrend',
      description: '90 purchases/month. 490 total. $220K revenue. Proven gold trading.',
      url: 'https://www.mql5.com/en/market/product/ft-gold-robot',
      rating: 4.5,
      downloads: 490,
      price: 450,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Gold Trading', 'Trend Following'],
      verified: true,
      metadata: { revenue: 220000, symbol: 'XAUUSD' },
    },
    {
      id: 'mql5-gold-scalper-pro',
      source: 'MQL5_MARKET',
      name: 'GOLD Scalper PRO',
      author: 'MQL5 Community',
      description: 'Fully automated gold trading. Max spread 400 pips. AutoMM 2-10% risk levels.',
      url: 'https://www.mql5.com/en/market/product/gold-scalper-pro',
      rating: 4.4,
      downloads: 40000,
      price: 'FREE',
      language: 'MQL4',
      type: 'Expert Advisor',
      strategies: ['Gold Scalping', 'Risk Management'],
      verified: true,
      metadata: { maxSpread: 400 },
    },
    {
      id: 'mql5-maedinas-gold',
      source: 'MQL5_MARKET',
      name: 'Maedinas Gold Scalper',
      author: 'Maedinas',
      description: 'XAUUSD specialist. User reported 40 USD profit in 3 days from $7. Minimal drawdown.',
      url: 'https://www.mql5.com/en/market/product/maedinas-gold-scalper',
      rating: 4.5,
      downloads: 15000,
      price: 'FREE',
      language: 'MQL4',
      type: 'Expert Advisor',
      strategies: ['Gold Scalping', 'Low Drawdown'],
      verified: true,
      metadata: { symbol: 'XAUUSD' },
    },
    {
      id: 'mql5-goldstream',
      source: 'MQL5_MARKET',
      name: 'GoldStream',
      author: 'MQL5 Developer',
      description: '83.25% Win Rate. 3.32 Profit Factor. 4.35% Max Drawdown. Systematic gold trading.',
      url: 'https://www.mql5.com/en/market/product/goldstream',
      rating: 4.6,
      downloads: 20000,
      price: 399,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Systematic Entry', 'Risk Management'],
      verified: true,
      metadata: { winRate: 83.25, profitFactor: 3.32, maxDrawdown: 4.35 },
    },
    {
      id: 'mql5-gold-zombie',
      source: 'MQL5_MARKET',
      name: 'GOLD Zombie',
      author: 'MQL5 Developer',
      description: 'XAUUSD H1 with surgical precision. Strong risk control. Prop firm ready.',
      url: 'https://www.mql5.com/en/market/product/gold-zombie',
      rating: 4.5,
      downloads: 10000,
      price: 299,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Precision Trading', 'Risk Control', 'Prop Firm'],
      timeframes: ['H1'],
      verified: true,
      metadata: { symbol: 'XAUUSD' },
    },
    {
      id: 'mql5-xau-breakout',
      source: 'MQL5_MARKET',
      name: 'XAU Breakout Scalper EA',
      author: 'Yassir Lamrichi',
      description: 'Dual strategy: SuperTrend & ZigZag. 70+ settings. VWAP, ADX, MA filters. No grid, no martingale.',
      url: 'https://www.mql5.com/en/market/product/xau-breakout-scalper',
      rating: 4.4,
      downloads: 8000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['SuperTrend', 'ZigZag', 'Breakout', 'Multi-Filter'],
      indicators: ['VWAP', 'ADX', 'MA'],
      verified: true,
      metadata: { settings: 70 },
    },
    {
      id: 'mql5-gold-mint',
      source: 'MQL5_MARKET',
      name: 'Gold Mint Scalper EA',
      author: 'MQL5 Developer',
      description: 'Cube momentum algorithm. Volatility-based signals. High probability patterns.',
      url: 'https://www.mql5.com/en/market/product/gold-mint-scalper',
      rating: 4.3,
      downloads: 5000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Momentum', 'Volatility', 'Pattern Recognition'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-ai-xauusd',
      source: 'MQL5_MARKET',
      name: 'AI XAUUSD Scalper',
      author: 'MQL5 Developer',
      description: 'AI-powered gold scalper. MT4/MT5. Speed, precision, adaptability. Good drawdown handling.',
      url: 'https://www.mql5.com/en/market/product/ai-xauusd-scalper',
      rating: 4.4,
      downloads: 12000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['AI Trading', 'Scalping', 'Trend Following'],
      verified: true,
      metadata: {},
    },
    // =========================================================================
    // VERIFIED HIGH-PERFORMANCE EAs
    // =========================================================================
    {
      id: 'mql5-forex-fury',
      source: 'MQL5_MARKET',
      name: 'Forex Fury',
      author: 'ForexFury',
      description: '#1 Verified Forex EA. 93% winning track record. Myfxbook verified. 209.62% gain.',
      url: 'https://www.forexfury.com/',
      rating: 4.8,
      downloads: 100000,
      price: 249,
      language: 'MQL4/MQL5',
      type: 'Expert Advisor',
      strategies: ['Scalping', 'Low Volatility', 'Risk Control'],
      timeframes: ['M15', 'M30'],
      verified: true,
      metadata: { winRate: 93, gain: 209.62, myfxbookVerified: true },
    },
    {
      id: 'mql5-waka-waka',
      source: 'MQL5_MARKET',
      name: 'Waka Waka EA',
      author: 'Valeriia Mishchenko',
      description: '60+ consecutive months in profit. MyFXBook verified. 6600%+ over 5 years. Grid strategy.',
      url: 'https://www.mql5.com/en/market/product/waka-waka',
      rating: 4.8,
      downloads: 80000,
      price: 2000,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Grid Trading', 'RSI', 'Bollinger Bands'],
      verified: true,
      metadata: { consecutiveMonths: 60, gain: 6600, myfxbookVerified: true },
    },
    {
      id: 'mql5-night-hunter-pro',
      source: 'MQL5_MARKET',
      name: 'Night Hunter Pro',
      author: 'Valeriia Mishchenko',
      description: '#1 rated scalping EA. 200%+ growth since 2020. 70%+ win rate. 90% months profitable. No martingale.',
      url: 'https://www.mql5.com/en/market/product/night-hunter-pro',
      rating: 4.9,
      downloads: 50000,
      price: 1500,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Asian Session Scalping', 'Low Volatility', 'Smart Entry/Exit'],
      timeframes: ['M15'],
      verified: true,
      metadata: { growth: 200, winRate: 70, myfxbookVerified: true },
    },
    {
      id: 'mql5-evening-scalper',
      source: 'MQL5_MARKET',
      name: 'Evening Scalper Pro',
      author: 'Valeriia Mishchenko',
      description: 'Mean-reversion scalping. 68% success rate. 15% drawdown. 5% monthly growth. 2+ years verified.',
      url: 'https://www.mql5.com/en/market/product/evening-scalper-pro',
      rating: 4.7,
      downloads: 35000,
      price: 1200,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Mean Reversion', 'Evening Session'],
      timeframes: ['M15'],
      verified: true,
      metadata: { successRate: 68, drawdown: 15, monthlyGrowth: 5 },
    },
    {
      id: 'mql5-fx-stabilizer',
      source: 'MQL5_MARKET',
      name: 'FX Stabilizer',
      author: 'FXStabilizer',
      description: 'Best Forex robot for performance 2024. Two year running champion. Premium quality.',
      url: 'https://www.mql5.com/en/market/product/fx-stabilizer',
      rating: 4.8,
      downloads: 40000,
      price: 3000,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Stable Returns', 'Low Risk'],
      verified: true,
      metadata: { champion: '2023-2024' },
    },
    {
      id: 'mql5-forex-flex',
      source: 'MQL5_MARKET',
      name: 'Forex Flex EA',
      author: 'FlexEA',
      description: 'Virtual Trade technology. Adapts to market in real-time. Multi-currency support.',
      url: 'https://forexflexea.com/',
      rating: 4.6,
      downloads: 60000,
      price: 330,
      language: 'MQL4/MQL5',
      type: 'Expert Advisor',
      strategies: ['Virtual Trades', 'Adaptive', 'Multi-Currency'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-golden-pickaxe',
      source: 'MQL5_MARKET',
      name: 'Golden Pickaxe',
      author: 'Valery Trading',
      description: 'Grid trading for gold. Performs better than Waka Waka. From #1 grid EA developer.',
      url: 'https://www.mql5.com/en/market/product/golden-pickaxe',
      rating: 4.7,
      downloads: 25000,
      price: 1500,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Grid Trading', 'Gold Specialist'],
      verified: true,
      metadata: { symbol: 'XAUUSD' },
    },
    // =========================================================================
    // MORE MQL5 HIGH-PERFORMERS
    // =========================================================================
    {
      id: 'mql5-syna-v4',
      source: 'MQL5_MARKET',
      name: 'Syna Version 4',
      author: 'Syna Team',
      description: 'First true multi-EA agentic coordination system. Unified intelligence network across MT5 terminals.',
      url: 'https://www.mql5.com/en/market/product/syna',
      rating: 4.6,
      downloads: 15000,
      price: 999,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Multi-EA Coordination', 'Agentic System', 'Network Intelligence'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-zenox',
      source: 'MQL5_MARKET',
      name: 'Zenox',
      author: 'MQL5 Developer',
      description: 'AI multi-pair swing trading robot. Trend following across 16 currency pairs. Years of development.',
      url: 'https://www.mql5.com/en/market/product/zenox',
      rating: 4.5,
      downloads: 20000,
      price: 599,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Swing Trading', 'Multi-Pair', 'AI-Driven', 'Trend Following'],
      verified: true,
      metadata: { pairs: 16 },
    },
    {
      id: 'mql5-node-neural',
      source: 'MQL5_MARKET',
      name: 'NODE Neural EA',
      author: 'MQL5 Community',
      description: 'FREE neural network EA for EURUSD. Filters market opportunities. Easy to use from day one.',
      url: 'https://www.mql5.com/en/market/product/node-neural',
      rating: 4.2,
      downloads: 30000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Neural Network', 'EURUSD'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-neuroedge',
      source: 'MQL5_MARKET',
      name: 'NeuroEdge EA',
      author: 'MQL5 Developer',
      description: 'Advanced trend-following scalper. Dynamic adaptation. Smart averaging. Minimal drawdown.',
      url: 'https://www.mql5.com/en/market/product/neuroedge',
      rating: 4.3,
      downloads: 18000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Trend Following', 'Scalping', 'Smart Averaging'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-kraitos-elite',
      source: 'MQL5_MARKET',
      name: 'Kraitos Elite',
      author: 'Auvoria Prime',
      description: 'MT5 EA targeting 3-5% average monthly gains. ~20% average drawdown.',
      url: 'https://www.mql5.com/en/market/product/kraitos-elite',
      rating: 4.4,
      downloads: 12000,
      price: 500,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Consistent Returns'],
      verified: true,
      metadata: { monthlyGains: '3-5%', drawdown: 20 },
    },
    {
      id: 'mql5-gearbox',
      source: 'MQL5_MARKET',
      name: 'Gearbox EA',
      author: 'MQL5 Developer',
      description: '3-5% monthly since 2020. ~25% typical drawdown. Proven track record.',
      url: 'https://www.mql5.com/en/market/product/gearbox',
      rating: 4.3,
      downloads: 10000,
      price: 400,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Consistent Returns'],
      verified: true,
      metadata: { since: 2020 },
    },
    {
      id: 'mql5-fx-quake',
      source: 'MQL5_MARKET',
      name: 'FX Quake EA',
      author: 'FXQuake',
      description: '100% automated MT4/MT5. Grid-and-lot-increment strategy. Myfxbook verified.',
      url: 'https://www.mql5.com/en/market/product/fx-quake',
      rating: 4.2,
      downloads: 8000,
      price: 299,
      language: 'MQL4/MQL5',
      type: 'Expert Advisor',
      strategies: ['Grid Trading', 'Lot Increment'],
      verified: true,
      metadata: { myfxbookVerified: true },
    },
    {
      id: 'mql5-forex-diamond',
      source: 'MQL5_MARKET',
      name: 'Forex Diamond EA',
      author: 'ForexDiamond',
      description: '40+ recovery factor. Drawdown protection. High-frequency. Self-updating logic. Prop firm ready.',
      url: 'https://www.mql5.com/en/market/product/forex-diamond',
      rating: 4.5,
      downloads: 35000,
      price: 297,
      language: 'MQL4/MQL5',
      type: 'Expert Advisor',
      strategies: ['Multi-Strategy', 'Trend Following', 'Counter-Trend'],
      verified: true,
      metadata: { recoveryFactor: 40, propFirmReady: true },
    },
    {
      id: 'mql5-gps-forex',
      source: 'MQL5_MARKET',
      name: 'GPS Forex Robot',
      author: 'GPSForex',
      description: 'Tripled deposit with live proof. Broker verified. 60-day money-back guarantee.',
      url: 'https://www.mql5.com/en/market/product/gps-forex',
      rating: 4.3,
      downloads: 50000,
      price: 149,
      language: 'MQL4',
      type: 'Expert Advisor',
      strategies: ['Scalping', 'Counter-Trend'],
      verified: true,
      metadata: { moneyBack: 60 },
    },
    {
      id: 'mql5-fx-forinte',
      source: 'MQL5_MARKET',
      name: 'FX Forinte EA',
      author: 'FXForinte',
      description: 'EUR/CHF specialist. Trend-following + hedging. FX Blue verified.',
      url: 'https://www.mql5.com/en/market/product/fx-forinte',
      rating: 4.2,
      downloads: 6000,
      price: 350,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Trend Following', 'Hedging'],
      verified: true,
      metadata: { symbol: 'EURCHF', fxBlueVerified: true },
    },
    {
      id: 'mql5-happy-gold',
      source: 'MQL5_MARKET',
      name: 'Happy Gold',
      author: 'Happy Forex',
      description: 'Trend strategy with modified ZigZag indicator. XAUUSD M30 chart.',
      url: 'https://www.mql5.com/en/market/product/happy-gold',
      rating: 4.1,
      downloads: 15000,
      price: 299,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Trend Following', 'ZigZag'],
      timeframes: ['M30'],
      verified: true,
      metadata: { symbol: 'XAUUSD' },
    },
    {
      id: 'mql5-happy-power',
      source: 'MQL5_MARKET',
      name: 'Happy Power',
      author: 'Happy Forex',
      description: 'Market algorithm with reinforcement learning. Self-adaptive. No labeled data required.',
      url: 'https://www.mql5.com/en/market/product/happy-power',
      rating: 4.2,
      downloads: 12000,
      price: 299,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Reinforcement Learning', 'Self-Adaptive'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-happy-frequency',
      source: 'MQL5_MARKET',
      name: 'Happy Frequency EA',
      author: 'Happy Forex',
      description: 'Multi-strategy: trend, grid, hedge, semi-martingale. 9 currency pairs on M5. MyFxBook/FxBlue verified.',
      url: 'https://www.mql5.com/en/market/product/happy-frequency',
      rating: 4.4,
      downloads: 20000,
      price: 299,
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Trend', 'Grid', 'Hedge', 'Semi-Martingale'],
      timeframes: ['M5'],
      verified: true,
      metadata: { pairs: 9, myfxbookVerified: true },
    },
    {
      id: 'mql5-dark-gold',
      source: 'MQL5_MARKET',
      name: 'Dark Gold',
      author: 'MQL5 Developer',
      description: 'Fully automatic scalping. Gold, Bitcoin, EURUSD, GBPUSD.',
      url: 'https://www.mql5.com/en/market/product/dark-gold',
      rating: 4.1,
      downloads: 8000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Scalping', 'Multi-Asset'],
      verified: true,
      metadata: { assets: ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD'] },
    },
    {
      id: 'mql5-multiway',
      source: 'MQL5_MARKET',
      name: 'MultiWay EA',
      author: 'MQL5 Developer',
      description: 'Mean-reversion strategy. 9 currency pairs diversification.',
      url: 'https://www.mql5.com/en/market/product/multiway',
      rating: 4.2,
      downloads: 7000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Mean Reversion', 'Diversification'],
      verified: true,
      metadata: { pairs: 9 },
    },
    {
      id: 'mql5-scalp-unscalp',
      source: 'MQL5_MARKET',
      name: 'Scalp Unscalp',
      author: 'MQL5 Developer',
      description: 'Bidirectional scalping. No grid, no martingale. Fixed SL, virtual trailing stop.',
      url: 'https://www.mql5.com/en/market/product/scalp-unscalp',
      rating: 4.1,
      downloads: 5000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Bidirectional Scalping', 'Virtual Trailing'],
      timeframes: ['H1'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-alpha-scalper',
      source: 'MQL5_MARKET',
      name: 'Alpha Scalper Pro EA',
      author: 'MQL5 Developer',
      description: 'High-precision scalping for XAUUSD, GBPUSD, EURUSD. Most liquid sessions.',
      url: 'https://www.mql5.com/en/market/product/alpha-scalper-pro',
      rating: 4.3,
      downloads: 6000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Precision Scalping', 'Multi-Pair'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-gyroscope',
      source: 'MQL5_MARKET',
      name: 'Gyroscope EA',
      author: 'MQL5 Developer',
      description: 'Professional EA using Elliott Wave Index for EURUSD, GBPUSD, USDJPY.',
      url: 'https://www.mql5.com/en/market/product/gyroscope',
      rating: 4.0,
      downloads: 4000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['Elliott Wave'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-supertrend-g5',
      source: 'MQL5_MARKET',
      name: 'Supertrend G5',
      author: 'MQL5 Developer',
      description: 'Fully automated EA. Optimized for XAUUSD. Also works on EURUSD, USDJPY, GBPUSD.',
      url: 'https://www.mql5.com/en/market/product/supertrend-g5',
      rating: 4.1,
      downloads: 5000,
      price: 'FREE',
      language: 'MQL5',
      type: 'Expert Advisor',
      strategies: ['SuperTrend', 'ATR-Based'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-ganon-forex',
      source: 'MQL5_MARKET',
      name: 'Ganon Forex Robot',
      author: 'MQL5 Developer',
      description: 'Grid-based trend-following for MT4. ATR trailing stop. Real-time reversal detection.',
      url: 'https://www.mql5.com/en/market/product/ganon-forex',
      rating: 4.0,
      downloads: 3000,
      price: 'FREE',
      language: 'MQL4',
      type: 'Expert Advisor',
      strategies: ['Grid', 'Trend Following', 'ATR Trailing'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-forex-gump',
      source: 'MQL5_MARKET',
      name: 'Forex Gump',
      author: 'MQL5 Developer',
      description: 'Lightweight and fast. Scalping strategy. Suitable for small accounts.',
      url: 'https://www.mql5.com/en/market/product/forex-gump',
      rating: 4.0,
      downloads: 8000,
      price: 199,
      language: 'MQL4',
      type: 'Expert Advisor',
      strategies: ['Scalping', 'Small Accounts'],
      verified: true,
      metadata: {},
    },
    {
      id: 'mql5-forex-robotron',
      source: 'MQL5_MARKET',
      name: 'Forex Robotron',
      author: 'ForexRobotron',
      description: 'Trades 21:00-23:00 GMT. $17,088 net profit 2005-2020.',
      url: 'https://www.mql5.com/en/market/product/forex-robotron',
      rating: 4.1,
      downloads: 15000,
      price: 299,
      language: 'MQL4',
      type: 'Expert Advisor',
      strategies: ['Night Trading', 'Session Based'],
      timeframes: ['M5', 'M15'],
      verified: true,
      metadata: { netProfit: 17088, period: '2005-2020' },
    },
  ],
  TRADINGVIEW: [
    // =========================================================================
    // TOP TRADINGVIEW PINESCRIPT STRATEGIES
    // =========================================================================
    {
      id: 'tv-supertrend',
      source: 'TRADINGVIEW',
      name: 'SuperTrend Strategy',
      author: 'TradingView Community',
      description: 'Most popular trend indicator. ATR-based dynamic stops. Simple & effective for breakout trading.',
      url: 'https://www.tradingview.com/scripts/supertrend/',
      rating: 4.7,
      downloads: 100000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['SuperTrend', 'Trend Following', 'ATR', 'Breakout'],
      verified: true,
      metadata: { likes: 50000 },
    },
    {
      id: 'tv-macd-rsi',
      source: 'TRADINGVIEW',
      name: 'MACD + RSI Combo Strategy',
      author: 'TradingView Community',
      description: 'Combined MACD momentum and RSI overbought/oversold signals. Great for swing trading.',
      url: 'https://www.tradingview.com/scripts/',
      rating: 4.5,
      downloads: 80000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['MACD', 'RSI', 'Momentum', 'Swing Trading'],
      verified: true,
      metadata: {},
    },
    {
      id: 'tv-bollinger-breakout',
      source: 'TRADINGVIEW',
      name: 'Bollinger Bands Breakout',
      author: 'TradingView Community',
      description: 'Bollinger Bands squeeze and breakout strategy. Volatility expansion detection.',
      url: 'https://www.tradingview.com/scripts/bollingerbands/',
      rating: 4.4,
      downloads: 65000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['Bollinger Bands', 'Breakout', 'Volatility'],
      verified: true,
      metadata: {},
    },
    {
      id: 'tv-ichimoku',
      source: 'TRADINGVIEW',
      name: 'Ichimoku Cloud Strategy',
      author: 'TradingView Community',
      description: 'Full Ichimoku cloud trading strategy. Best for trend-following. Multiple signals.',
      url: 'https://www.tradingview.com/scripts/ichimokucloud/',
      rating: 4.6,
      downloads: 55000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['Ichimoku', 'Trend Following', 'Cloud Analysis'],
      verified: true,
      metadata: {},
    },
    {
      id: 'tv-vwap',
      source: 'TRADINGVIEW',
      name: 'VWAP Strategy',
      author: 'TradingView Community',
      description: 'Volume Weighted Average Price. Institutional-level precision. Price + volume combined.',
      url: 'https://www.tradingview.com/scripts/vwap/',
      rating: 4.5,
      downloads: 70000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['VWAP', 'Volume Analysis', 'Institutional'],
      verified: true,
      metadata: {},
    },
    {
      id: 'tv-ma-crossover',
      source: 'TRADINGVIEW',
      name: 'Moving Average Crossover',
      author: 'TradingView Community',
      description: 'Classic EMA/SMA crossover strategy. Tracks trend shifts. Best in trending markets.',
      url: 'https://www.tradingview.com/scripts/movingaverage/',
      rating: 4.3,
      downloads: 90000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['Moving Average', 'Crossover', 'Trend Following'],
      verified: true,
      metadata: {},
    },
    {
      id: 'tv-rsi-mean-reversion',
      source: 'TRADINGVIEW',
      name: 'RSI Mean Reversion',
      author: 'TradingView Community',
      description: 'RSI overbought/oversold levels for range-bound markets. Mean reversion strategy.',
      url: 'https://www.tradingview.com/scripts/rsi/',
      rating: 4.4,
      downloads: 75000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['RSI', 'Mean Reversion', 'Range Trading'],
      verified: true,
      metadata: {},
    },
    {
      id: 'tv-candlestick-patterns',
      source: 'TRADINGVIEW',
      name: 'Candlestick Pattern Recognition',
      author: 'TradingView Community',
      description: 'Automated detection of Hammer, Engulfing, Doji patterns. Price action trading.',
      url: 'https://www.tradingview.com/scripts/candlestick/',
      rating: 4.3,
      downloads: 50000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['Candlestick Patterns', 'Price Action', 'Pattern Recognition'],
      verified: true,
      metadata: {},
    },
    {
      id: 'tv-dragon-channel',
      source: 'TRADINGVIEW',
      name: 'Dragon Channel',
      author: 'TradingView Community',
      description: 'Enhanced trend panel with multi-TF reversal arrows and momentum filter.',
      url: 'https://www.tradingview.com/scripts/',
      rating: 4.2,
      downloads: 30000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['Channel Trading', 'Multi-Timeframe', 'Reversal'],
      verified: true,
      metadata: {},
    },
    {
      id: 'tv-stochastic',
      source: 'TRADINGVIEW',
      name: 'Stochastic Oscillator Strategy',
      author: 'TradingView Community',
      description: 'Momentum indicator for overbought/oversold. Great for ranging markets.',
      url: 'https://www.tradingview.com/scripts/stochastic/',
      rating: 4.2,
      downloads: 45000,
      price: 'FREE',
      language: 'PineScript',
      type: 'Strategy',
      strategies: ['Stochastic', 'Momentum', 'Oscillator'],
      verified: true,
      metadata: {},
    },
  ],
  NPM: [
    // =========================================================================
    // TOP NPM TRADING LIBRARIES & BOTS
    // =========================================================================
    {
      id: 'npm-ccxt',
      source: 'NPM',
      name: 'CCXT',
      author: 'ccxt',
      description: 'Cryptocurrency Exchange Trading Library. 100+ exchanges. Unified API. The gold standard.',
      url: 'https://www.npmjs.com/package/ccxt',
      downloadUrl: 'npm install ccxt',
      rating: 5.0,
      downloads: 1000000,
      price: 'FREE',
      language: 'JavaScript',
      type: 'Library',
      strategies: ['Exchange Connectivity', 'Multi-Exchange'],
      verified: true,
      metadata: { npmCommand: 'npm install ccxt', exchanges: 100 },
    },
    {
      id: 'npm-technicalindicators',
      source: 'NPM',
      name: 'technicalindicators',
      author: 'anandanand84',
      description: 'Technical indicators library. SMA, EMA, RSI, MACD, Bollinger Bands, and more.',
      url: 'https://www.npmjs.com/package/technicalindicators',
      downloadUrl: 'npm install technicalindicators',
      rating: 4.7,
      downloads: 500000,
      price: 'FREE',
      language: 'JavaScript',
      type: 'Library',
      strategies: ['Technical Analysis', 'All Indicators'],
      verified: true,
      metadata: { npmCommand: 'npm install technicalindicators' },
    },
    {
      id: 'npm-trading-signals',
      source: 'NPM',
      name: 'trading-signals',
      author: 'bennycode',
      description: 'Technical indicators with buy/sell signals. TypeScript ready.',
      url: 'https://www.npmjs.com/package/trading-signals',
      downloadUrl: 'npm install trading-signals',
      rating: 4.5,
      downloads: 100000,
      price: 'FREE',
      language: 'TypeScript',
      type: 'Library',
      strategies: ['Signal Generation', 'Technical Analysis'],
      verified: true,
      metadata: { npmCommand: 'npm install trading-signals' },
    },
    {
      id: 'npm-binance',
      source: 'NPM',
      name: 'binance',
      author: 'zoeyg',
      description: 'Binance API wrapper. Spot, Futures, Margin. Real-time WebSocket.',
      url: 'https://www.npmjs.com/package/binance',
      downloadUrl: 'npm install binance',
      rating: 4.6,
      downloads: 200000,
      price: 'FREE',
      language: 'JavaScript',
      type: 'Library',
      strategies: ['Binance Integration'],
      verified: true,
      metadata: { npmCommand: 'npm install binance' },
    },
    {
      id: 'npm-node-binance-api',
      source: 'NPM',
      name: 'node-binance-api',
      author: 'jaggedsoft',
      description: 'Complete Binance API. Spot, Futures, Options, Stream. Most popular.',
      url: 'https://www.npmjs.com/package/node-binance-api',
      downloadUrl: 'npm install node-binance-api',
      rating: 4.5,
      downloads: 150000,
      price: 'FREE',
      language: 'JavaScript',
      type: 'Library',
      strategies: ['Binance Integration', 'WebSocket Streams'],
      verified: true,
      metadata: { npmCommand: 'npm install node-binance-api' },
    },
    {
      id: 'npm-tulind',
      source: 'NPM',
      name: 'tulind',
      author: 'tulipcharts',
      description: 'Technical Analysis Indicators. 100+ indicators. C-based speed.',
      url: 'https://www.npmjs.com/package/tulind',
      downloadUrl: 'npm install tulind',
      rating: 4.4,
      downloads: 80000,
      price: 'FREE',
      language: 'JavaScript',
      type: 'Library',
      strategies: ['Technical Analysis', '100+ Indicators'],
      verified: true,
      metadata: { npmCommand: 'npm install tulind' },
    },
  ],
  PYPI: [
    // =========================================================================
    // TOP PYTHON TRADING LIBRARIES
    // =========================================================================
    {
      id: 'pypi-yfinance',
      source: 'PYPI',
      name: 'yfinance',
      author: 'ranaroussi',
      description: 'Yahoo Finance market data. Stocks, Options, Forex, Crypto. 5M+ downloads.',
      url: 'https://pypi.org/project/yfinance/',
      downloadUrl: 'pip install yfinance',
      rating: 4.9,
      downloads: 5000000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Data Fetching', 'Market Data'],
      verified: true,
      metadata: { pipCommand: 'pip install yfinance' },
    },
    {
      id: 'pypi-ta',
      source: 'PYPI',
      name: 'ta',
      author: 'bukosabino',
      description: 'Technical Analysis library. Volume, Volatility, Trend, Momentum indicators.',
      url: 'https://pypi.org/project/ta/',
      downloadUrl: 'pip install ta',
      rating: 4.7,
      downloads: 2000000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Technical Analysis'],
      verified: true,
      metadata: { pipCommand: 'pip install ta' },
    },
    {
      id: 'pypi-pandas-ta',
      source: 'PYPI',
      name: 'pandas-ta',
      author: 'twopirllc',
      description: 'Pandas Technical Analysis. 130+ indicators. Built for speed.',
      url: 'https://pypi.org/project/pandas-ta/',
      downloadUrl: 'pip install pandas-ta',
      rating: 4.8,
      downloads: 1500000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Technical Analysis', '130+ Indicators'],
      verified: true,
      metadata: { pipCommand: 'pip install pandas-ta', indicators: 130 },
    },
    {
      id: 'pypi-vectorbt',
      source: 'PYPI',
      name: 'vectorbt',
      author: 'polakowo',
      description: 'High-performance vectorized backtesting. Portfolio optimization. GPU support.',
      url: 'https://pypi.org/project/vectorbt/',
      downloadUrl: 'pip install vectorbt',
      rating: 4.9,
      downloads: 500000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Backtesting', 'Portfolio Optimization', 'GPU Acceleration'],
      verified: true,
      metadata: { pipCommand: 'pip install vectorbt' },
    },
    {
      id: 'pypi-ccxt',
      source: 'PYPI',
      name: 'ccxt (Python)',
      author: 'ccxt',
      description: 'Python version of CCXT. 100+ exchange support.',
      url: 'https://pypi.org/project/ccxt/',
      downloadUrl: 'pip install ccxt',
      rating: 4.9,
      downloads: 3000000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Exchange Connectivity'],
      verified: true,
      metadata: { pipCommand: 'pip install ccxt', exchanges: 100 },
    },
    {
      id: 'pypi-talib',
      source: 'PYPI',
      name: 'TA-Lib',
      author: 'mrjbq7',
      description: 'Python wrapper for TA-Lib. Industry standard technical analysis.',
      url: 'https://pypi.org/project/TA-Lib/',
      downloadUrl: 'pip install TA-Lib',
      rating: 4.8,
      downloads: 2000000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Technical Analysis', 'Industry Standard'],
      verified: true,
      metadata: { pipCommand: 'pip install TA-Lib' },
    },
    {
      id: 'pypi-alpaca-trade-api',
      source: 'PYPI',
      name: 'alpaca-trade-api',
      author: 'alpacahq',
      description: 'Alpaca Trading API. Commission-free stock trading. Real-time data.',
      url: 'https://pypi.org/project/alpaca-trade-api/',
      downloadUrl: 'pip install alpaca-trade-api',
      rating: 4.6,
      downloads: 800000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Stock Trading', 'Commission-Free'],
      verified: true,
      metadata: { pipCommand: 'pip install alpaca-trade-api' },
    },
    {
      id: 'pypi-python-binance',
      source: 'PYPI',
      name: 'python-binance',
      author: 'sammchardy',
      description: 'Binance API wrapper. Spot, Margin, Futures. Most complete.',
      url: 'https://pypi.org/project/python-binance/',
      downloadUrl: 'pip install python-binance',
      rating: 4.7,
      downloads: 1500000,
      price: 'FREE',
      language: 'Python',
      type: 'Library',
      strategies: ['Binance Integration'],
      verified: true,
      metadata: { pipCommand: 'pip install python-binance' },
    },
  ],
  DISCORD: [
    {
      id: 'discord-1',
      source: 'DISCORD',
      name: 'Crypto Trading Signals',
      author: 'Various Communities',
      description: 'Free trading signal channels on Discord',
      url: 'https://discord.gg/crypto-trading',
      rating: 3.8,
      price: 'FREE',
      language: 'Various',
      type: 'Signal Service',
      strategies: ['Signal Aggregation'],
      verified: false,
      metadata: { note: 'Join communities for access' },
    },
  ],
  TELEGRAM: [
    {
      id: 'telegram-1',
      source: 'TELEGRAM',
      name: 'Whale Alert Bot',
      author: 'Whale Alert',
      description: 'Large crypto transaction alerts',
      url: 'https://t.me/whale_alert_io',
      rating: 4.5,
      price: 'FREE',
      language: 'Bot',
      type: 'Alert Service',
      strategies: ['Whale Tracking'],
      verified: true,
      metadata: {},
    },
    {
      id: 'telegram-2',
      source: 'TELEGRAM',
      name: 'Crypto News Aggregator',
      author: 'Various',
      description: 'Real-time crypto news feeds',
      url: 'https://t.me/cryptonews',
      rating: 4.0,
      price: 'FREE',
      language: 'Bot',
      type: 'News Service',
      strategies: ['News Trading'],
      verified: false,
      metadata: {},
    },
  ],
  CUSTOM_URL: [],
  RAPIDAPI: [
    // =========================================================================
    // TOP CRYPTO TRADING BOT PLATFORMS
    // =========================================================================
    {
      id: 'rapid-3commas',
      source: 'RAPIDAPI',
      name: '3Commas',
      author: '3Commas',
      description: 'Leading crypto trading bot. 100K+ users. 14 exchanges. SmartTrade, DCA, Grid bots.',
      url: 'https://3commas.io/',
      rating: 4.8,
      downloads: 100000,
      price: 49,
      language: 'API',
      type: 'Trading Platform',
      strategies: ['Smart Trade', 'DCA', 'Grid', 'Copy Trading'],
      verified: true,
      metadata: { users: 100000, exchanges: 14 },
    },
    {
      id: 'rapid-cryptohopper',
      source: 'RAPIDAPI',
      name: 'Cryptohopper',
      author: 'Cryptohopper',
      description: 'AI crypto trading bot. 810K+ traders. 16 exchanges. Strategy marketplace.',
      url: 'https://www.cryptohopper.com/',
      rating: 4.7,
      downloads: 810000,
      price: 19,
      language: 'API',
      type: 'Trading Platform',
      strategies: ['AI Trading', 'Mirror Trading', 'Backtesting', 'Algorithm Intelligence'],
      verified: true,
      metadata: { users: 810000, exchanges: 16 },
    },
    {
      id: 'rapid-pionex',
      source: 'RAPIDAPI',
      name: 'Pionex',
      author: 'Pionex',
      description: '93% success rate. 18 built-in bots. FREE. Binance/Huobi liquidity. MSB licensed.',
      url: 'https://www.pionex.com/',
      rating: 4.8,
      downloads: 500000,
      price: 'FREE',
      language: 'API',
      type: 'Trading Platform',
      strategies: ['Grid Bot', 'DCA', 'Arbitrage', 'Martingale', 'Rebalancing'],
      verified: true,
      metadata: { successRate: 93, bots: 18, fee: '0.05%' },
    },
    {
      id: 'rapid-bitsgap',
      source: 'RAPIDAPI',
      name: 'Bitsgap',
      author: 'Bitsgap',
      description: '800K+ users. 4.7M+ bots running. Grid, DCA, trailing. Smart trading tools.',
      url: 'https://bitsgap.com/',
      rating: 4.7,
      downloads: 800000,
      price: 29,
      language: 'API',
      type: 'Trading Platform',
      strategies: ['Grid', 'DCA', 'Trailing Stop', 'OCO Orders'],
      verified: true,
      metadata: { users: 800000, botsRunning: 4700000 },
    },
    {
      id: 'rapid-cornix',
      source: 'RAPIDAPI',
      name: 'Cornix',
      author: 'Cornix',
      description: 'Telegram signal automation. 4.4 Trustpilot. Largest copy trading marketplace.',
      url: 'https://cornix.io/',
      rating: 4.4,
      downloads: 200000,
      price: 'FREE',
      language: 'API',
      type: 'Signal Automation',
      strategies: ['Signal Automation', 'Copy Trading', 'Telegram Integration'],
      verified: true,
      metadata: { trustpilot: 4.4 },
    },
    {
      id: 'rapid-haasbot',
      source: 'RAPIDAPI',
      name: 'HaasOnline',
      author: 'HaasOnline',
      description: 'Advanced crypto trading bot. Trend analysis, arbitrage, custom indicators. 10+ exchanges.',
      url: 'https://www.haasonline.com/',
      rating: 4.5,
      downloads: 50000,
      price: 299,
      language: 'API',
      type: 'Trading Platform',
      strategies: ['Trend Analysis', 'Arbitrage', 'Custom Indicators'],
      verified: true,
      metadata: { exchanges: 10 },
    },
    {
      id: 'rapid-wundertrading',
      source: 'RAPIDAPI',
      name: 'WunderTrading',
      author: 'WunderTrading',
      description: 'DCA and Grid trading bots. TradingView integration. Multi-exchange.',
      url: 'https://wundertrading.com/',
      rating: 4.3,
      downloads: 100000,
      price: 9.95,
      language: 'API',
      type: 'Trading Platform',
      strategies: ['DCA', 'Grid', 'TradingView Alerts'],
      verified: true,
      metadata: {},
    },
    {
      id: 'rapid-altrady',
      source: 'RAPIDAPI',
      name: 'Altrady',
      author: 'Altrady',
      description: 'Multi-take-profit DCA bot. Advanced trading terminal. Multiple exchanges.',
      url: 'https://www.altrady.com/',
      rating: 4.4,
      downloads: 50000,
      price: 17.99,
      language: 'API',
      type: 'Trading Platform',
      strategies: ['DCA', 'Multi-Take-Profit', 'Portfolio Management'],
      verified: true,
      metadata: {},
    },
    {
      id: 'rapid-octobot',
      source: 'RAPIDAPI',
      name: 'OctoBot',
      author: 'OctoBot',
      description: 'TradingView alerts automation. Pine Script to trades. Multi-exchange cloud.',
      url: 'https://www.octobot.cloud/',
      rating: 4.3,
      downloads: 30000,
      price: 'FREE',
      language: 'Python',
      type: 'Open Source Bot',
      strategies: ['TradingView Alerts', 'Pine Script Automation'],
      verified: true,
      metadata: {},
    },
    {
      id: 'rapid-tradesanta',
      source: 'RAPIDAPI',
      name: 'TradeSanta',
      author: 'TradeSanta',
      description: 'Cloud-based crypto trading bot. Grid and DCA bots. Beginner friendly.',
      url: 'https://tradesanta.com/',
      rating: 4.2,
      downloads: 50000,
      price: 14,
      language: 'API',
      type: 'Trading Platform',
      strategies: ['Grid', 'DCA', 'Long/Short'],
      verified: true,
      metadata: {},
    },
    {
      id: 'rapid-alphavantage',
      source: 'RAPIDAPI',
      name: 'Alpha Vantage',
      author: 'Alpha Vantage',
      description: 'Stock and crypto market data API. Real-time and historical data.',
      url: 'https://rapidapi.com/alphavantage/api/alpha-vantage',
      rating: 4.5,
      price: 'FREE',
      language: 'API',
      type: 'Market Data',
      strategies: ['Data Provider'],
      verified: true,
      metadata: { freeTier: '5 calls/min' },
    },
    {
      id: 'rapid-twelvedata',
      source: 'RAPIDAPI',
      name: 'Twelve Data',
      author: 'Twelve Data',
      description: 'Financial data API. Stocks, Forex, Crypto. Real-time WebSocket.',
      url: 'https://twelvedata.com/',
      rating: 4.6,
      price: 'FREE',
      language: 'API',
      type: 'Market Data',
      strategies: ['Data Provider', 'Real-time'],
      verified: true,
      metadata: { freeTier: '800 calls/day' },
    },
  ],
  CTRADER: [
    // =========================================================================
    // CTRADER cBOTS
    // =========================================================================
    {
      id: 'ctrader-stochastic',
      source: 'CTRADER',
      name: 'Stochastic Oscillator Strategy',
      author: 'ClickAlgo',
      description: 'Momentum indicator cBot. Email and Telegram alerts.',
      url: 'https://clickalgo.com/',
      rating: 4.3,
      price: 'FREE',
      language: 'C#',
      type: 'cBot',
      strategies: ['Stochastic', 'Momentum'],
      verified: true,
      metadata: {},
    },
    {
      id: 'ctrader-macd-rsi',
      source: 'CTRADER',
      name: 'MACD + RSI Combined',
      author: 'cTrader Community',
      description: 'Combined MACD and RSI signals. 24/7 automated trading. Telegram alerts.',
      url: 'https://ctrader.com/algos/cbots/',
      rating: 4.2,
      price: 'FREE',
      language: 'C#',
      type: 'cBot',
      strategies: ['MACD', 'RSI', 'Combined Signals'],
      verified: true,
      metadata: {},
    },
    {
      id: 'ctrader-smart-grid',
      source: 'CTRADER',
      name: 'Smart Grid Template',
      author: 'ClickAlgo',
      description: 'Grid logic with multi-timeframe technical indicators. Price retracement orders.',
      url: 'https://clickalgo.com/',
      rating: 4.3,
      price: 'FREE',
      language: 'C#',
      type: 'cBot',
      strategies: ['Grid', 'Multi-Timeframe', 'Retracement'],
      verified: true,
      metadata: {},
    },
    {
      id: 'ctrader-order-block',
      source: 'CTRADER',
      name: 'Order Block Hedging',
      author: 'cTrader Store',
      description: 'Order blocks via Price ROC indicator. Hedging strategy.',
      url: 'https://ctrader.com/products/',
      rating: 4.1,
      price: 'FREE',
      language: 'C#',
      type: 'cBot',
      strategies: ['Order Blocks', 'Hedging', 'Price ROC'],
      verified: true,
      metadata: {},
    },
    {
      id: 'ctrader-neptune',
      source: 'CTRADER',
      name: 'cTrader Neptune',
      author: 'ClickAlgo',
      description: '10 forex cBots. Black-box automated system. News event manager.',
      url: 'https://clickalgo.com/',
      rating: 4.5,
      price: 'FREE',
      language: 'C#',
      type: 'cBot',
      strategies: ['Multi-Bot System', 'News Trading'],
      verified: true,
      metadata: { bots: 10 },
    },
    {
      id: 'ctrader-advanced',
      source: 'CTRADER',
      name: 'Advanced Forex Trading Robot',
      author: 'ClickAlgo',
      description: 'Semi-automated trading. Advanced risk management. Bitcoin support.',
      url: 'https://clickalgo.com/',
      rating: 4.4,
      price: 'FREE',
      language: 'C#',
      type: 'cBot',
      strategies: ['Advanced Risk Management', 'Crypto Support'],
      verified: true,
      metadata: {},
    },
  ],
  NINJATRADER: [
    // =========================================================================
    // NINJATRADER STRATEGIES
    // =========================================================================
    {
      id: 'ninja-rize-capital',
      source: 'NINJATRADER',
      name: 'Rize Capital Premium',
      author: 'Rize Capital',
      description: 'Premium NinjaTrader 8 automated strategies. Professional-grade algorithms. Free trial.',
      url: 'https://rizecap.com/strategy/',
      rating: 4.5,
      price: 'FREE',
      language: 'NinjaScript',
      type: 'Strategy',
      strategies: ['Professional Algorithms', 'Futures Trading'],
      verified: true,
      metadata: { freeTrial: true },
    },
    {
      id: 'ninja-lucrum',
      source: 'NINJATRADER',
      name: 'Lucrum Trading Systems',
      author: 'Lucrum',
      description: 'All-in-one trading system. Futures, Forex, Equities. Fully automated.',
      url: 'https://lucrumtradingsystems.com/',
      rating: 4.4,
      price: 'FREE',
      language: 'NinjaScript',
      type: 'Strategy',
      strategies: ['All-in-One', 'Futures', 'Forex'],
      verified: true,
      metadata: {},
    },
    {
      id: 'ninja-scalping',
      source: 'NINJATRADER',
      name: 'NinjaTrader Scalping Strategy',
      author: 'NinjaTrader Ecosystem',
      description: 'Scalping for fast entries/exits. Multiple pairs support.',
      url: 'https://ninjatraderecosystem.com/',
      rating: 4.2,
      price: 'FREE',
      language: 'NinjaScript',
      type: 'Strategy',
      strategies: ['Scalping', 'Fast Execution'],
      verified: true,
      metadata: {},
    },
    {
      id: 'ninja-day-trading',
      source: 'NINJATRADER',
      name: 'Day Trading Strategy',
      author: 'NinjaTrader Ecosystem',
      description: 'Day trading automation. Real-time data integration. Custom indicators.',
      url: 'https://ninjatraderecosystem.com/',
      rating: 4.3,
      price: 'FREE',
      language: 'NinjaScript',
      type: 'Strategy',
      strategies: ['Day Trading', 'Real-time'],
      verified: true,
      metadata: {},
    },
    {
      id: 'ninja-swing',
      source: 'NINJATRADER',
      name: 'Swing Trading Strategy',
      author: 'NinjaTrader Ecosystem',
      description: 'Swing trading automation. Position holding. Trend analysis.',
      url: 'https://ninjatraderecosystem.com/',
      rating: 4.2,
      price: 'FREE',
      language: 'NinjaScript',
      type: 'Strategy',
      strategies: ['Swing Trading', 'Position Holding'],
      verified: true,
      metadata: {},
    },
  ],
};

// ============================================================================
// INSTITUTIONAL & LEGENDARY BOTS - COMPETITOR TRACKING
// ============================================================================

export const INSTITUTIONAL_COMPETITORS = [
  {
    name: 'Renaissance Technologies - Medallion Fund',
    performance: '66% annual return (1988-2018)',
    aum: '$130 billion',
    strategy: 'Quantitative, Statistical Arbitrage, ML/AI',
    status: 'COMPETITOR - TO BEAT BY 300%',
  },
  {
    name: 'Two Sigma',
    performance: '15-25% annual return',
    aum: '$60 billion',
    strategy: 'Machine Learning, Big Data, AI-driven',
    status: 'COMPETITOR',
  },
  {
    name: 'D.E. Shaw',
    performance: '15-20% annual return',
    aum: '$55 billion',
    strategy: 'Systematic Trading, Quantitative',
    status: 'COMPETITOR',
  },
  {
    name: 'Citadel',
    performance: '20%+ annual return',
    aum: '$53 billion',
    strategy: 'Market Making, Multi-Strategy',
    status: 'COMPETITOR',
  },
  {
    name: 'Jane Street',
    performance: 'Undisclosed (extremely profitable)',
    aum: '$15+ billion',
    strategy: 'Market Making, Quantitative',
    status: 'COMPETITOR',
  },
];

// ============================================================================
// Multi-Source Fetcher Class
// ============================================================================

export class MultiSourceFetcher extends EventEmitter {
  private static instance: MultiSourceFetcher;
  private downloadPath: string = './dropzone/incoming';
  private discoveredBots: Map<string, DiscoveredBot> = new Map();
  private absorptionResults: Map<string, AbsorptionResult> = new Map();

  private constructor() {
    super();
    // Initialize with known bots
    this.loadKnownBots();
  }

  public static getInstance(): MultiSourceFetcher {
    if (!MultiSourceFetcher.instance) {
      MultiSourceFetcher.instance = new MultiSourceFetcher();
    }
    return MultiSourceFetcher.instance;
  }

  private loadKnownBots(): void {
    for (const [source, bots] of Object.entries(KNOWN_BOTS_BY_SOURCE)) {
      for (const bot of bots) {
        this.discoveredBots.set(bot.id, bot);
      }
    }
    console.log(`[MultiSourceFetcher] Loaded ${this.discoveredBots.size} known bots from ${Object.keys(KNOWN_BOTS_BY_SOURCE).length} sources`);
  }

  // ==========================================================================
  // Source Management
  // ==========================================================================

  public getAvailableSources(): BotSourceConfig[] {
    return Object.values(BOT_SOURCES);
  }

  public getEnabledSources(): BotSourceConfig[] {
    return Object.values(BOT_SOURCES).filter(s => s.enabled);
  }

  public getSourceConfig(source: BotSource): BotSourceConfig | null {
    return BOT_SOURCES[source] || null;
  }

  // ==========================================================================
  // Bot Discovery
  // ==========================================================================

  public getAllDiscoveredBots(): DiscoveredBot[] {
    return Array.from(this.discoveredBots.values());
  }

  public getBotsBySource(source: BotSource): DiscoveredBot[] {
    return this.getAllDiscoveredBots().filter(b => b.source === source);
  }

  public getFreeBots(): DiscoveredBot[] {
    return this.getAllDiscoveredBots().filter(b => b.price === 'FREE');
  }

  public getHighRatedBots(minRating: number = 4.0): DiscoveredBot[] {
    return this.getAllDiscoveredBots().filter(b => b.rating >= minRating);
  }

  public searchBots(query: string): DiscoveredBot[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllDiscoveredBots().filter(b =>
      b.name.toLowerCase().includes(lowerQuery) ||
      b.description.toLowerCase().includes(lowerQuery) ||
      b.strategies.some(s => s.toLowerCase().includes(lowerQuery))
    );
  }

  // ==========================================================================
  // Add Custom Bot
  // ==========================================================================

  public addCustomBot(bot: Partial<DiscoveredBot>): DiscoveredBot {
    const id = crypto.randomUUID();
    const newBot: DiscoveredBot = {
      id,
      source: bot.source || 'CUSTOM_URL',
      name: bot.name || 'Custom Bot',
      author: bot.author || 'Unknown',
      description: bot.description || '',
      url: bot.url || '',
      rating: bot.rating || 0,
      price: bot.price || 'FREE',
      language: bot.language || 'Unknown',
      type: bot.type || 'Unknown',
      strategies: bot.strategies || [],
      verified: false,
      metadata: bot.metadata || {},
    };

    this.discoveredBots.set(id, newBot);
    this.emit('bot_added', newBot);

    return newBot;
  }

  // ==========================================================================
  // Bot Absorption
  // ==========================================================================

  public async absorbBot(botId: string): Promise<AbsorptionResult> {
    const bot = this.discoveredBots.get(botId);

    if (!bot) {
      return {
        success: false,
        botId,
        source: 'CUSTOM_URL',
        name: 'Unknown',
        filesDownloaded: 0,
        localPath: '',
        error: 'Bot not found',
      };
    }

    console.log(`[MultiSourceFetcher] Absorbing: ${bot.name} from ${bot.source}`);

    try {
      // Create folder for this bot
      const botFolder = path.join(
        this.downloadPath,
        `${bot.source.toLowerCase()}_${bot.name.replace(/[^a-zA-Z0-9]/g, '_')}`
      );

      if (!fs.existsSync(botFolder)) {
        fs.mkdirSync(botFolder, { recursive: true });
      }

      // Handle absorption based on source
      let filesDownloaded = 0;

      switch (bot.source) {
        case 'NPM':
          // Create package.json reference
          const npmInfo = {
            name: bot.name,
            installCommand: bot.metadata.npmCommand || `npm install ${bot.name}`,
            url: bot.url,
            description: bot.description,
          };
          fs.writeFileSync(
            path.join(botFolder, 'npm_package_info.json'),
            JSON.stringify(npmInfo, null, 2)
          );
          filesDownloaded = 1;
          break;

        case 'PYPI':
          // Create pip reference
          const pipInfo = {
            name: bot.name,
            installCommand: bot.metadata.pipCommand || `pip install ${bot.name}`,
            url: bot.url,
            description: bot.description,
          };
          fs.writeFileSync(
            path.join(botFolder, 'pip_package_info.json'),
            JSON.stringify(pipInfo, null, 2)
          );
          filesDownloaded = 1;
          break;

        case 'TRADINGVIEW':
        case 'MQL5_MARKET':
        case 'CTRADER':
        case 'NINJATRADER':
          // Create reference file (manual download required)
          const manualInfo = {
            name: bot.name,
            source: bot.source,
            url: bot.url,
            instructions: `Visit ${bot.url} to download manually`,
            rating: bot.rating,
            strategies: bot.strategies,
          };
          fs.writeFileSync(
            path.join(botFolder, 'manual_download_info.json'),
            JSON.stringify(manualInfo, null, 2)
          );
          filesDownloaded = 1;
          break;

        default:
          // Generic reference
          const genericInfo = {
            ...bot,
            absorbedAt: new Date().toISOString(),
          };
          fs.writeFileSync(
            path.join(botFolder, '_bot_info.json'),
            JSON.stringify(genericInfo, null, 2)
          );
          filesDownloaded = 1;
      }

      const result: AbsorptionResult = {
        success: true,
        botId: bot.id,
        source: bot.source,
        name: bot.name,
        filesDownloaded,
        localPath: botFolder,
      };

      this.absorptionResults.set(botId, result);
      this.emit('bot_absorbed', result);

      console.log(`[MultiSourceFetcher] ✓ Absorbed: ${bot.name}`);

      return result;

    } catch (error: any) {
      const result: AbsorptionResult = {
        success: false,
        botId: bot.id,
        source: bot.source,
        name: bot.name,
        filesDownloaded: 0,
        localPath: '',
        error: error.message,
      };

      this.absorptionResults.set(botId, result);
      this.emit('absorption_error', result);

      return result;
    }
  }

  public async absorbAllFromSource(source: BotSource): Promise<AbsorptionResult[]> {
    const bots = this.getBotsBySource(source).filter(b => b.price === 'FREE');
    const results: AbsorptionResult[] = [];

    console.log(`[MultiSourceFetcher] Absorbing ${bots.length} bots from ${source}...`);

    for (const bot of bots) {
      const result = await this.absorbBot(bot.id);
      results.push(result);
    }

    return results;
  }

  public async absorbAllFreeBots(): Promise<{
    total: number;
    success: number;
    failed: number;
    results: AbsorptionResult[];
  }> {
    const freeBots = this.getFreeBots();
    const results: AbsorptionResult[] = [];

    console.log(`[MultiSourceFetcher] Starting absorption of ${freeBots.length} free bots from all sources...`);
    this.emit('mass_absorption_started', { total: freeBots.length });

    for (const bot of freeBots) {
      const result = await this.absorbBot(bot.id);
      results.push(result);
    }

    const summary = {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };

    console.log(`[MultiSourceFetcher] Absorption complete: ${summary.success}/${summary.total} successful`);
    this.emit('mass_absorption_complete', summary);

    return summary;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  public getStats(): {
    totalDiscovered: number;
    bySource: Record<BotSource, number>;
    free: number;
    highRated: number;
    absorbed: number;
    enabledSources: number;
  } {
    const all = this.getAllDiscoveredBots();
    const bySource: Record<string, number> = {};

    for (const source of Object.keys(BOT_SOURCES)) {
      bySource[source] = all.filter(b => b.source === source).length;
    }

    return {
      totalDiscovered: all.length,
      bySource: bySource as Record<BotSource, number>,
      free: this.getFreeBots().length,
      highRated: this.getHighRatedBots(4.0).length,
      absorbed: this.absorptionResults.size,
      enabledSources: this.getEnabledSources().length,
    };
  }

  public getAbsorptionResults(): AbsorptionResult[] {
    return Array.from(this.absorptionResults.values());
  }
}

// Export singleton instance
export const multiSourceFetcher = MultiSourceFetcher.getInstance();

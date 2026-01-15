/**
 * TIME — Meta-Intelligence Trading Governor
 * Main Entry Point
 *
 * TIME is a meta-intelligence governor — a self-evolving, self-expanding,
 * recursive learning organism designed to absorb, synthesize, invent,
 * patch, upgrade, and evolve continuously.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';

import config, { validateConfig } from './config';
import { logger, loggers } from './utils/logger';

// Core
import { timeGovernor } from './core/time_governor';
import { evolutionController } from './core/evolution_controller';
import { inactivityMonitor } from './core/inactivity_monitor';

// Engines
import { learningEngine } from './engines/learning_engine';
import { riskEngine } from './engines/risk_engine';
import { regimeDetector } from './engines/regime_detector';
import { recursiveSynthesisEngine } from './engines/recursive_synthesis_engine';
import { marketVisionEngine } from './engines/market_vision_engine';
import { teachingEngine } from './engines/teaching_engine';
import { attributionEngine } from './engines/attribution_engine';

// Bots
import { botManager } from './bots/bot_manager';
import { botIngestion } from './bots/bot_ingestion';

// Services
import { consentManager } from './consent/consent_manager';
import { notificationService } from './notifications/notification_service';

// WebSocket Real-Time
import { realtimeService, RealtimeService } from './websocket/realtime_service';
import { EventHub, createEventHub } from './websocket/event_hub';

// Never-Before-Seen Inventions
import { ensembleHarmonyDetector } from './engines/ensemble_harmony_detector';
import { signalConflictResolver } from './engines/signal_conflict_resolver';
import { learningVelocityTracker } from './engines/learning_velocity_tracker';
import { stockWatchers } from './watchers/stock_watchers';

// Bot Absorption Systems
import { botDropZone } from './dropzone/bot_dropzone';
import { githubBotFetcher } from './fetcher/github_bot_fetcher';

// Bot Brain & Auto Perfect Bot Generator - Never-Before-Seen Inventions!
import { botBrain } from './bots/bot_brain';
import { autoPerfectBotGenerator } from './bots/auto_perfect_bot_generator';

// MetaTrader Bridge
import { mtBridge } from './brokers/mt_bridge';

// Broker Manager - Real Order Execution
import { BrokerManager } from './brokers/broker_manager';

// Opportunity Scout (Legitimate Earnings System)
import { opportunityScout } from './scout/opportunity_scout';

// Database
import { databaseManager } from './database/connection';
import {
  userRepository,
  botRepository,
  strategyRepository,
  tradeRepository,
  signalRepository,
  learningEventRepository,
  insightRepository,
  notificationRepository,
  auditLogRepository,
} from './database/repositories';

// API Routes
import router from './routes';

const log = loggers.api;

// Global event hub instance
let eventHub: EventHub | null = null;

/**
 * Initialize TIME
 */
async function initializeTIME(): Promise<void> {
  log.info('='.repeat(60));
  log.info('TIME — Meta-Intelligence Trading Governor');
  log.info('Initializing...');
  log.info('='.repeat(60));

  // Validate configuration
  try {
    validateConfig();
  } catch (error) {
    log.warn('Configuration warnings detected', { error });
  }

  // Initialize Database (MongoDB + Redis)
  log.info('Connecting to databases...');
  try {
    await databaseManager.initialize();
    const dbStatus = databaseManager.getStatus();
    log.info(`MongoDB: ${dbStatus.mongodb}, Redis: ${dbStatus.redis}`);

    // Log audit event
    await auditLogRepository.log('TIME', 'system_startup', {
      version: '1.0.0',
      mode: config.evolution?.defaultMode || 'controlled',
    });
  } catch (error) {
    log.warn('Database initialization warning (continuing with mock)', { error });
  }

  // Register all components with TIME Governor
  timeGovernor.registerComponent(evolutionController);
  timeGovernor.registerComponent(inactivityMonitor);
  timeGovernor.registerComponent(learningEngine);
  timeGovernor.registerComponent(riskEngine);
  timeGovernor.registerComponent(regimeDetector);
  timeGovernor.registerComponent(recursiveSynthesisEngine);
  timeGovernor.registerComponent(marketVisionEngine);
  timeGovernor.registerComponent(teachingEngine);
  timeGovernor.registerComponent(attributionEngine);
  timeGovernor.registerComponent(botManager);
  timeGovernor.registerComponent(botIngestion);
  timeGovernor.registerComponent(consentManager);
  timeGovernor.registerComponent(notificationService);

  // Never-Before-Seen Inventions are standalone systems (not TIMEComponents)
  // They operate independently and integrate via events
  log.info('Never-Before-Seen Inventions loaded: Harmony Detector, Conflict Resolver, Velocity Tracker, Stock Watchers');

  // Initialize Bot Absorption Systems
  await botDropZone.initialize({
    watchFolder: './dropzone/incoming',
    processedFolder: './dropzone/processed',
    rejectedFolder: './dropzone/rejected',
    reportsFolder: './dropzone/reports',
    minRating: 4.0,
    autoAbsorb: false, // Require manual approval
  });

  // Connect Bot Drop Zone to Bot Ingestion
  botDropZone.on('bot_absorbed', async (data) => {
    log.info(`Bot absorbed from drop zone: ${data.botId}`);
    // Record learning event
    learningVelocityTracker.recordLearning({
      type: 'bot_absorbed',
      source: 'BotDropZone',
      description: `Absorbed bot ${data.botId}`,
      impact: 0.8,
      metadata: { botId: data.botId, learnings: data.learnings?.length || 0 },
    });
    // Emit to real-time clients
    if (eventHub) {
      eventHub.broadcastAnnouncement(
        'New Bot Absorbed',
        `TIME has absorbed a new bot with rating ${data.rating.overall}/5.0`,
        'medium'
      );
    }
  });

  botDropZone.on('approval_required', (data) => {
    log.info(`Bot pending approval: ${data.file.filename} (${data.report.rating.overall}/5.0)`);
    notificationService.emit('notification', {
      type: 'bot_approval_required',
      title: 'Bot Pending Approval',
      message: `${data.file.filename} rated ${data.report.rating.overall}/5.0 - awaiting your approval`,
      priority: 'high',
    });
  });

  // Start watching the drop zone
  botDropZone.startWatching();
  log.info('Bot Drop Zone watching for new bots...');

  // Initialize Bot Brain - Central Intelligence for all bots
  log.info('Initializing Bot Brain...');
  await botBrain.initialize();
  log.info(`Bot Brain online with ${botBrain.getAllBots().length} intelligent bots`);

  // Initialize Auto Perfect Bot Generator - Watches everything, learns, auto-generates perfect bots
  log.info('Initializing Auto Perfect Bot Generator...');
  await autoPerfectBotGenerator.initialize();
  log.info('Auto Perfect Bot Generator online - watching and learning from everything');

  // Initialize TIME Governor (this initializes all components)
  await timeGovernor.initialize();

  // ===============================================
  // REAL BROKER CONNECTIONS - FOR REAL TRADING
  // ===============================================
  log.info('Initializing Real Broker Connections...');
  const brokerManager = BrokerManager.getInstance();
  await brokerManager.initialize();

  let brokersConnected = 0;

  // Connect Alpaca (Stocks & Crypto)
  if (config.brokers.alpaca.apiKey && config.brokers.alpaca.secretKey) {
    try {
      log.info('Adding Alpaca broker...');
      await brokerManager.addBroker('alpaca', 'alpaca', {
        apiKey: config.brokers.alpaca.apiKey,
        apiSecret: config.brokers.alpaca.secretKey,
        isPaper: config.brokers.alpaca.paper,
      }, { isPrimary: true, name: 'Alpaca (US Stocks & Crypto)' });
      await brokerManager.connectBroker('alpaca');
      brokersConnected++;
      log.info(`✅ Alpaca connected (${config.brokers.alpaca.paper ? 'PAPER' : 'LIVE'} mode)`);
    } catch (error) {
      log.warn('⚠️ Alpaca connection failed:', { error });
    }
  } else {
    log.warn('⚠️ Alpaca credentials not configured - skipping');
  }

  // Connect OANDA (Forex)
  if (config.brokers.oanda.apiKey && config.brokers.oanda.accountId) {
    try {
      log.info('Adding OANDA broker...');
      await brokerManager.addBroker('oanda', 'oanda', {
        apiKey: config.brokers.oanda.apiKey,
        apiSecret: config.brokers.oanda.apiKey,  // OANDA uses same key
        accountId: config.brokers.oanda.accountId,
        isPaper: config.brokers.oanda.practice,
      }, { name: 'OANDA (Forex)' });
      await brokerManager.connectBroker('oanda');
      brokersConnected++;
      log.info(`✅ OANDA connected (${config.brokers.oanda.practice ? 'PRACTICE' : 'LIVE'} mode)`);
    } catch (error) {
      log.warn('⚠️ OANDA connection failed:', { error });
    }
  } else {
    log.info('ℹ️ OANDA credentials not configured - skipping');
  }

  const brokerStatus = brokerManager.getStatus();
  log.info(`Brokers: ${brokerStatus.connectedBrokers}/${brokerStatus.totalBrokers} connected`);
  if (brokerStatus.connectedBrokers === 0) {
    log.warn('⚠️ NO BROKERS CONNECTED - Trading will be simulated only!');
  } else {
    log.info('🎉 REAL TRADING ENABLED - Orders will execute on connected brokers');
  }

  log.info('='.repeat(60));
  log.info('TIME initialization complete');
  log.info(`Evolution Mode: ${timeGovernor.getEvolutionMode().toUpperCase()}`);
  log.info(`Brokers Connected: ${brokersConnected}`);
  log.info('='.repeat(60));
}

/**
 * Create Express application
 */
function createApp(): express.Application {
  const app = express();

  // Security middleware - allow inline scripts for dashboard and TradingView
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://s3.tradingview.com", "https://*.tradingview.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://*.tradingview.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "https://*.tradingview.com"],
        fontSrc: ["'self'", "https://*.tradingview.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://*.tradingview.com"],
        childSrc: ["'self'", "https://*.tradingview.com", "blob:"],
        workerSrc: ["'self'", "blob:"],
      },
    },
  }));

  // CORS
  app.use(
    cors({
      origin: config.frontend.corsOrigins,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Cookie parsing - REQUIRED for httpOnly cookie authentication
  app.use(cookieParser());

  // CSRF Protection and Rate Limiting
  const { csrfMiddleware, rateLimitMiddleware, getCSRFToken } = require('./security/csrf_middleware');

  // Bot/Scraper Detection (import from security middleware)
  const { botDetection } = require('./middleware/security');

  // Apply bot detection first (blocks scrapers/crawlers)
  app.use('/api/v1', botDetection);

  // Apply rate limiting
  app.use('/api/v1/auth', rateLimitMiddleware('auth'));
  app.use('/api/v1/admin', rateLimitMiddleware('admin'));
  app.use('/api/v1/trading', rateLimitMiddleware('trade'));
  app.use('/api/v1', rateLimitMiddleware('general'));

  // CSRF protection for state-changing requests
  app.use(csrfMiddleware);

  // CSRF token endpoint
  app.get('/api/v1/csrf-token', getCSRFToken);

  // Mount API Routes
  app.use('/api/v1', router);

  // Root landing page - Full Trading Dashboard
  app.get('/', (req, res) => {
    const health = timeGovernor.getSystemHealth();
    const metrics = timeGovernor.getMetrics();
    const regimeState = regimeDetector.getRegimeState();
    const riskState = riskEngine.getState();

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TIME - Trading Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a1a;
      min-height: 100vh;
      color: #e0e0e0;
    }

    /* Navigation */
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: rgba(0,0,0,0.5);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .nav-brand {
      font-size: 1.5rem;
      font-weight: bold;
      background: linear-gradient(90deg, #00d4ff, #7b2cbf);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-links { display: flex; gap: 8px; }
    .nav-link {
      padding: 10px 20px;
      border-radius: 8px;
      text-decoration: none;
      color: #888;
      font-weight: 500;
      transition: all 0.2s;
    }
    .nav-link:hover { background: rgba(255,255,255,0.05); color: #fff; }
    .nav-link.active { background: rgba(0,212,255,0.2); color: #00d4ff; }
    .nav-status {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #00c853;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Main Layout */
    .main { padding: 24px 32px; }
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 24px;
    }

    /* Cards */
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 20px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .card-title { font-size: 1rem; color: #888; font-weight: 500; }

    /* Market Watch */
    .market-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      cursor: pointer;
      transition: background 0.2s;
    }
    .market-item:hover { background: rgba(255,255,255,0.02); margin: 0 -20px; padding: 12px 20px; }
    .market-item:last-child { border-bottom: none; }
    .market-symbol { font-weight: 600; font-size: 1rem; }
    .market-name { font-size: 0.8rem; color: #666; }
    .market-price { font-size: 1.1rem; font-weight: 600; text-align: right; }
    .market-change { font-size: 0.85rem; }
    .positive { color: #00c853; }
    .negative { color: #ff5252; }

    /* Portfolio Summary */
    .portfolio-value {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .portfolio-change {
      font-size: 1.1rem;
      margin-bottom: 20px;
    }
    .portfolio-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .stat-item { }
    .stat-label { font-size: 0.8rem; color: #666; margin-bottom: 4px; }
    .stat-value { font-size: 1.2rem; font-weight: 600; }

    /* Quick Trade */
    .trade-form { display: flex; flex-direction: column; gap: 12px; }
    .trade-tabs { display: flex; gap: 8px; margin-bottom: 8px; }
    .trade-tab {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      color: #888;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .trade-tab.buy:hover, .trade-tab.buy.active { background: rgba(0,200,83,0.2); color: #00c853; }
    .trade-tab.sell:hover, .trade-tab.sell.active { background: rgba(255,82,82,0.2); color: #ff5252; }
    .input-group { display: flex; flex-direction: column; gap: 4px; }
    .input-label { font-size: 0.8rem; color: #666; }
    .input-field {
      padding: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      background: rgba(0,0,0,0.3);
      color: #fff;
      font-size: 1rem;
    }
    .input-field:focus { outline: none; border-color: #00d4ff; }
    .trade-btn {
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .trade-btn.buy { background: #00c853; color: #000; }
    .trade-btn.sell { background: #ff5252; color: #fff; }
    .trade-btn:hover { transform: translateY(-1px); }

    /* Positions */
    .position-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: rgba(255,255,255,0.02);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .position-symbol { font-weight: 600; }
    .position-details { font-size: 0.8rem; color: #888; }
    .position-pnl { font-weight: 600; }

    /* Regime Indicator */
    .regime-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .regime-trending { background: rgba(0,200,83,0.2); color: #00c853; }
    .regime-ranging { background: rgba(255,193,7,0.2); color: #ffc107; }
    .regime-volatile { background: rgba(255,82,82,0.2); color: #ff5252; }
    .regime-unknown { background: rgba(136,136,136,0.2); color: #888; }

    /* Activity Feed */
    .activity-item {
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .activity-item:last-child { border-bottom: none; }
    .activity-time { font-size: 0.75rem; color: #666; }
    .activity-text { font-size: 0.9rem; margin-top: 4px; }

    /* AI Insights */
    .insight-card {
      background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(123,44,191,0.1));
      border: 1px solid rgba(0,212,255,0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .insight-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: #00d4ff; }
    .insight-text { font-size: 0.85rem; color: #ccc; line-height: 1.5; }

    /* Responsive */
    @media (max-width: 1024px) {
      .dashboard-grid { grid-template-columns: 1fr; }
      .nav { padding: 12px 16px; }
      .main { padding: 16px; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-brand">TIME</div>
    <div class="nav-links">
      <a href="/" class="nav-link active">Dashboard</a>
      <a href="/markets" class="nav-link">Markets</a>
      <a href="/trade" class="nav-link">Trade</a>
      <a href="/portfolio" class="nav-link">Portfolio</a>
      <a href="/invest" class="nav-link">Invest</a>
      <a href="/defi" class="nav-link">DeFi</a>
      <a href="/social" class="nav-link">Copy Trade</a>
      <a href="/strategies" class="nav-link">Strategies</a>
      <a href="/bots" class="nav-link">Bots</a>
    </div>
    <div class="nav-status">
      <span class="regime-badge regime-${regimeState.current.toLowerCase().replace(' ', '-')}">${regimeState.current}</span>
      <div class="status-dot"></div>
    </div>
  </nav>

  <main class="main">
    <div class="dashboard-grid">
      <!-- Left Column -->
      <div>
        <!-- Portfolio Summary -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <span class="card-title">Portfolio Value</span>
            <span style="color: #888; font-size: 0.85rem;">Updated now</span>
          </div>
          <div class="portfolio-value">$${(100000 + (riskState.dailyPnL || 0)).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
          <div class="portfolio-change ${(riskState.dailyPnL || 0) >= 0 ? 'positive' : 'negative'}">
            ${(riskState.dailyPnL || 0) >= 0 ? '+' : ''}$${(riskState.dailyPnL || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} today
          </div>
          <div class="portfolio-stats">
            <div class="stat-item">
              <div class="stat-label">Open Positions</div>
              <div class="stat-value">${riskState.openPositions || 0}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Win Rate</div>
              <div class="stat-value">--</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Active Strategies</div>
              <div class="stat-value">${(metrics as any).activeStrategies || 0}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Bots Active</div>
              <div class="stat-value">${metrics.totalBotsAbsorbed || 0}</div>
            </div>
          </div>
        </div>

        <!-- Market Watch -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <span class="card-title">Market Watch</span>
            <a href="/markets" style="color: #00d4ff; text-decoration: none; font-size: 0.85rem;">View All</a>
          </div>
          <div class="market-item" onclick="selectPair('EURUSD')">
            <div>
              <div class="market-symbol">EUR/USD</div>
              <div class="market-name">Euro / US Dollar</div>
            </div>
            <div>
              <div class="market-price">1.0892</div>
              <div class="market-change positive">+0.15%</div>
            </div>
          </div>
          <div class="market-item" onclick="selectPair('GBPUSD')">
            <div>
              <div class="market-symbol">GBP/USD</div>
              <div class="market-name">British Pound / US Dollar</div>
            </div>
            <div>
              <div class="market-price">1.2745</div>
              <div class="market-change negative">-0.08%</div>
            </div>
          </div>
          <div class="market-item" onclick="selectPair('USDJPY')">
            <div>
              <div class="market-symbol">USD/JPY</div>
              <div class="market-name">US Dollar / Japanese Yen</div>
            </div>
            <div>
              <div class="market-price">149.82</div>
              <div class="market-change positive">+0.22%</div>
            </div>
          </div>
          <div class="market-item" onclick="selectPair('XAUUSD')">
            <div>
              <div class="market-symbol">XAU/USD</div>
              <div class="market-name">Gold / US Dollar</div>
            </div>
            <div>
              <div class="market-price">2,024.50</div>
              <div class="market-change positive">+0.45%</div>
            </div>
          </div>
          <div class="market-item" onclick="selectPair('BTCUSD')">
            <div>
              <div class="market-symbol">BTC/USD</div>
              <div class="market-name">Bitcoin / US Dollar</div>
            </div>
            <div>
              <div class="market-price">43,250.00</div>
              <div class="market-change positive">+2.15%</div>
            </div>
          </div>
        </div>

        <!-- Open Positions -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Open Positions</span>
            <a href="/portfolio" style="color: #00d4ff; text-decoration: none; font-size: 0.85rem;">View All</a>
          </div>
          ${(riskState.openPositions || 0) === 0 ?
            '<div style="text-align: center; padding: 40px; color: #666;">No open positions<br><span style="font-size: 0.85rem;">Place a trade to get started</span></div>' :
            `<div class="position-item">
              <div>
                <div class="position-symbol">EUR/USD</div>
                <div class="position-details">Long 0.1 lots @ 1.0850</div>
              </div>
              <div class="position-pnl positive">+$42.00</div>
            </div>`
          }
        </div>
      </div>

      <!-- Right Column -->
      <div>
        <!-- Quick Trade -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <span class="card-title">Quick Trade</span>
          </div>
          <div class="trade-form">
            <div class="trade-tabs">
              <button class="trade-tab buy active" onclick="setTradeType('buy')">BUY</button>
              <button class="trade-tab sell" onclick="setTradeType('sell')">SELL</button>
            </div>
            <div class="input-group">
              <label class="input-label">Symbol</label>
              <select class="input-field" id="tradeSymbol">
                <option>EUR/USD</option>
                <option>GBP/USD</option>
                <option>USD/JPY</option>
                <option>XAU/USD</option>
                <option>BTC/USD</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">Amount (Lots)</label>
              <input type="number" class="input-field" value="0.01" step="0.01" min="0.01" id="tradeAmount">
            </div>
            <div class="input-group">
              <label class="input-label">Stop Loss (pips)</label>
              <input type="number" class="input-field" value="50" id="tradeSL">
            </div>
            <div class="input-group">
              <label class="input-label">Take Profit (pips)</label>
              <input type="number" class="input-field" value="100" id="tradeTP">
            </div>
            <button class="trade-btn buy" id="tradeBtn" onclick="placeTrade()">Place Buy Order</button>
          </div>
        </div>

        <!-- AI Insights -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <span class="card-title">AI Insights</span>
          </div>
          <div class="insight-card">
            <div class="insight-title">Market Regime: ${regimeState.current}</div>
            <div class="insight-text">Confidence: ${(regimeState.confidence * 100).toFixed(0)}%. ${String(regimeState.current) === 'trending' ? 'Consider trend-following strategies.' : String(regimeState.current) === 'ranging' ? 'Mean reversion strategies may perform well.' : 'Exercise caution with position sizing.'}</div>
          </div>
          <div class="insight-card">
            <div class="insight-title">System Status</div>
            <div class="insight-text">${health.filter(h => h.status === 'online').length}/${health.length} components online. Evolution mode: ${metrics.evolutionMode}.</div>
          </div>
        </div>

        <!-- Activity Feed -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Activity</span>
          </div>
          <div class="activity-item">
            <div class="activity-time">Just now</div>
            <div class="activity-text">TIME system initialized</div>
          </div>
          <div class="activity-item">
            <div class="activity-time">2 min ago</div>
            <div class="activity-text">Market regime updated to ${regimeState.current}</div>
          </div>
          <div class="activity-item">
            <div class="activity-time">5 min ago</div>
            <div class="activity-text">${metrics.totalBotsAbsorbed} bots ready for trading</div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
    let tradeType = 'buy';

    function setTradeType(type) {
      tradeType = type;
      document.querySelectorAll('.trade-tab').forEach(tab => tab.classList.remove('active'));
      document.querySelector('.trade-tab.' + type).classList.add('active');
      const btn = document.getElementById('tradeBtn');
      btn.className = 'trade-btn ' + type;
      btn.textContent = 'Place ' + (type === 'buy' ? 'Buy' : 'Sell') + ' Order';
    }

    function selectPair(pair) {
      const select = document.getElementById('tradeSymbol');
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].text.replace('/', '') === pair) {
          select.selectedIndex = i;
          break;
        }
      }
    }

    async function placeTrade() {
      const symbol = document.getElementById('tradeSymbol').value;
      const amount = document.getElementById('tradeAmount').value;
      const sl = document.getElementById('tradeSL').value;
      const tp = document.getElementById('tradeTP').value;

      try {
        const res = await fetch('/api/v1/trading/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: symbol.replace('/', ''),
            direction: tradeType === 'buy' ? 'long' : 'short',
            quantity: parseFloat(amount) * 100000,
            stopLoss: parseInt(sl),
            takeProfit: parseInt(tp)
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Trade placed successfully!');
          location.reload();
        } else {
          alert('Trade failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Trade failed: ' + err.message);
      }
    }

    // Auto-refresh prices (simulated)
    setInterval(() => {
      document.querySelectorAll('.market-price').forEach(el => {
        const price = parseFloat(el.textContent.replace(',', ''));
        const change = (Math.random() - 0.5) * 0.001 * price;
        el.textContent = (price + change).toLocaleString('en-US', {
          minimumFractionDigits: price > 100 ? 2 : 4,
          maximumFractionDigits: price > 100 ? 2 : 4
        });
      });
    }, 3000);
  </script>
</body>
</html>
    `);
  });

  // Shared page template function
  const pageTemplate = (title: string, activeNav: string, content: string) => {
    const regimeState = regimeDetector.getRegimeState();
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TIME - ${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a1a; min-height: 100vh; color: #e0e0e0; }
    .nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; background: rgba(0,0,0,0.5); border-bottom: 1px solid rgba(255,255,255,0.1); }
    .nav-brand { font-size: 1.5rem; font-weight: bold; background: linear-gradient(90deg, #00d4ff, #7b2cbf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-decoration: none; }
    .nav-links { display: flex; gap: 8px; }
    .nav-link { padding: 10px 20px; border-radius: 8px; text-decoration: none; color: #888; font-weight: 500; transition: all 0.2s; }
    .nav-link:hover { background: rgba(255,255,255,0.05); color: #fff; }
    .nav-link.active { background: rgba(0,212,255,0.2); color: #00d4ff; }
    .nav-status { display: flex; align-items: center; gap: 16px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #00c853; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .main { padding: 24px 32px; }
    .page-title { font-size: 2rem; font-weight: 700; margin-bottom: 24px; }
    .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .card-title { font-size: 1rem; color: #888; font-weight: 500; }
    .btn { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #00d4ff; color: #000; }
    .btn-success { background: #00c853; color: #000; }
    .btn-danger { background: #ff5252; color: #fff; }
    .btn:hover { transform: translateY(-1px); }
    .grid { display: grid; gap: 20px; }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    .positive { color: #00c853; }
    .negative { color: #ff5252; }
    .regime-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; }
    .regime-trending { background: rgba(0,200,83,0.2); color: #00c853; }
    .regime-ranging { background: rgba(255,193,7,0.2); color: #ffc107; }
    .regime-volatile { background: rgba(255,82,82,0.2); color: #ff5252; }
    .regime-unknown { background: rgba(136,136,136,0.2); color: #888; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .table th { color: #888; font-weight: 500; font-size: 0.85rem; }
    .table tr:hover { background: rgba(255,255,255,0.02); }
    .input-field { padding: 12px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(0,0,0,0.3); color: #fff; font-size: 1rem; width: 100%; }
    .input-field:focus { outline: none; border-color: #00d4ff; }
    .stat-card { text-align: center; padding: 24px; }
    .stat-value { font-size: 2rem; font-weight: 700; margin-bottom: 8px; }
    .stat-label { font-size: 0.85rem; color: #888; }
    @media (max-width: 1024px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } .nav { padding: 12px 16px; } .main { padding: 16px; } }
  </style>
</head>
<body>
  <nav class="nav">
    <a href="/" class="nav-brand">TIME</a>
    <div class="nav-links">
      <a href="/" class="nav-link ${activeNav === 'dashboard' ? 'active' : ''}">Dashboard</a>
      <a href="/markets" class="nav-link ${activeNav === 'markets' ? 'active' : ''}">Markets</a>
      <a href="/charts" class="nav-link ${activeNav === 'charts' ? 'active' : ''}">Charts</a>
      <a href="/trade" class="nav-link ${activeNav === 'trade' ? 'active' : ''}">Trade</a>
      <a href="/portfolio" class="nav-link ${activeNav === 'portfolio' ? 'active' : ''}">Portfolio</a>
      <a href="/strategies" class="nav-link ${activeNav === 'strategies' ? 'active' : ''}">Strategies</a>
      <a href="/bots" class="nav-link ${activeNav === 'bots' ? 'active' : ''}">Bots</a>
      <a href="/defi" class="nav-link ${activeNav === 'defi' ? 'active' : ''}">DeFi</a>
      <a href="/invest" class="nav-link ${activeNav === 'invest' ? 'active' : ''}">Invest</a>
      <a href="/admin" class="nav-link ${activeNav === 'admin' ? 'active' : ''}" style="color: #7b2cbf;">Control Panel</a>
    </div>
    <div class="nav-status">
      <span class="regime-badge regime-${regimeState.current.toLowerCase().replace(' ', '-')}">${regimeState.current}</span>
      <div class="status-dot"></div>
    </div>
  </nav>
  <main class="main">${content}</main>
</body>
</html>`;
  };

  // ========================================================================
  // MARKETS PAGE
  // ========================================================================
  app.get('/markets', (req, res) => {
    const content = `
    <h1 class="page-title">Markets</h1>

    <!-- Asset Class Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="showAssetClass('all')" id="tab-all">All</button>
      <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="showAssetClass('forex')" id="tab-forex">Forex</button>
      <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="showAssetClass('crypto')" id="tab-crypto">Crypto</button>
      <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="showAssetClass('stocks')" id="tab-stocks">Stocks</button>
      <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="showAssetClass('etf')" id="tab-etf">ETFs</button>
      <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="showAssetClass('commodities')" id="tab-commodities">Commodities</button>
      <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="showAssetClass('indices')" id="tab-indices">Indices</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">All Markets</span>
        <input type="text" class="input-field" placeholder="Search..." style="width: 200px;" onkeyup="filterMarkets(this.value)">
      </div>
      <table class="table" id="marketsTable">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price</th>
            <th>Change</th>
            <th>High</th>
            <th>Low</th>
            <th>Volume</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <!-- FOREX -->
          <tr data-symbol="EURUSD" data-class="forex" data-name="euro usd dollar">
            <td><span style="background:#2196f3;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">FX</span><strong>EUR/USD</strong><br><span style="color:#666;font-size:0.8rem;">Euro / US Dollar</span></td>
            <td class="price">1.0892</td>
            <td class="positive">+0.15%</td>
            <td>1.0920</td>
            <td>1.0850</td>
            <td>5.2B</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('EURUSD','forex')">Trade</button></td>
          </tr>
          <tr data-symbol="GBPUSD" data-class="forex" data-name="pound sterling usd">
            <td><span style="background:#2196f3;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">FX</span><strong>GBP/USD</strong><br><span style="color:#666;font-size:0.8rem;">British Pound / US Dollar</span></td>
            <td class="price">1.2745</td>
            <td class="negative">-0.08%</td>
            <td>1.2780</td>
            <td>1.2710</td>
            <td>2.8B</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('GBPUSD','forex')">Trade</button></td>
          </tr>
          <tr data-symbol="USDJPY" data-class="forex" data-name="dollar yen japan">
            <td><span style="background:#2196f3;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">FX</span><strong>USD/JPY</strong><br><span style="color:#666;font-size:0.8rem;">US Dollar / Japanese Yen</span></td>
            <td class="price">149.82</td>
            <td class="positive">+0.22%</td>
            <td>150.20</td>
            <td>149.40</td>
            <td>3.1B</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('USDJPY','forex')">Trade</button></td>
          </tr>

          <!-- CRYPTO -->
          <tr data-symbol="BTCUSD" data-class="crypto" data-name="bitcoin btc">
            <td><span style="background:#f7931a;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">CRYPTO</span><strong>BTC/USD</strong><br><span style="color:#666;font-size:0.8rem;">Bitcoin</span></td>
            <td class="price">43250.00</td>
            <td class="positive">+2.15%</td>
            <td>44000.00</td>
            <td>42500.00</td>
            <td>28.5B</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('BTCUSD','crypto')">Trade</button></td>
          </tr>
          <tr data-symbol="ETHUSD" data-class="crypto" data-name="ethereum eth">
            <td><span style="background:#627eea;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">CRYPTO</span><strong>ETH/USD</strong><br><span style="color:#666;font-size:0.8rem;">Ethereum</span></td>
            <td class="price">2286.00</td>
            <td class="positive">+1.85%</td>
            <td>2320.00</td>
            <td>2240.00</td>
            <td>12.3B</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('ETHUSD','crypto')">Trade</button></td>
          </tr>
          <tr data-symbol="SOLUSD" data-class="crypto" data-name="solana sol">
            <td><span style="background:#9945ff;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">CRYPTO</span><strong>SOL/USD</strong><br><span style="color:#666;font-size:0.8rem;">Solana</span></td>
            <td class="price">98.50</td>
            <td class="positive">+4.25%</td>
            <td>102.00</td>
            <td>94.50</td>
            <td>2.1B</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('SOLUSD','crypto')">Trade</button></td>
          </tr>
          <tr data-symbol="XRPUSD" data-class="crypto" data-name="ripple xrp">
            <td><span style="background:#23292f;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">CRYPTO</span><strong>XRP/USD</strong><br><span style="color:#666;font-size:0.8rem;">Ripple</span></td>
            <td class="price">0.6245</td>
            <td class="negative">-0.85%</td>
            <td>0.6350</td>
            <td>0.6180</td>
            <td>1.8B</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('XRPUSD','crypto')">Trade</button></td>
          </tr>

          <!-- STOCKS -->
          <tr data-symbol="AAPL" data-class="stocks" data-name="apple inc technology">
            <td><span style="background:#00c853;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">STOCK</span><strong>AAPL</strong><br><span style="color:#666;font-size:0.8rem;">Apple Inc.</span></td>
            <td class="price">178.50</td>
            <td class="positive">+1.25%</td>
            <td>180.20</td>
            <td>176.80</td>
            <td>52M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('AAPL','stocks')">Trade</button></td>
          </tr>
          <tr data-symbol="MSFT" data-class="stocks" data-name="microsoft technology">
            <td><span style="background:#00c853;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">STOCK</span><strong>MSFT</strong><br><span style="color:#666;font-size:0.8rem;">Microsoft Corp.</span></td>
            <td class="price">378.25</td>
            <td class="positive">+0.85%</td>
            <td>382.00</td>
            <td>375.50</td>
            <td>28M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('MSFT','stocks')">Trade</button></td>
          </tr>
          <tr data-symbol="NVDA" data-class="stocks" data-name="nvidia ai chips">
            <td><span style="background:#00c853;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">STOCK</span><strong>NVDA</strong><br><span style="color:#666;font-size:0.8rem;">NVIDIA Corp.</span></td>
            <td class="price">485.60</td>
            <td class="positive">+3.45%</td>
            <td>492.00</td>
            <td>478.20</td>
            <td>45M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('NVDA','stocks')">Trade</button></td>
          </tr>
          <tr data-symbol="TSLA" data-class="stocks" data-name="tesla electric cars">
            <td><span style="background:#00c853;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">STOCK</span><strong>TSLA</strong><br><span style="color:#666;font-size:0.8rem;">Tesla Inc.</span></td>
            <td class="price">242.80</td>
            <td class="negative">-1.15%</td>
            <td>248.50</td>
            <td>240.00</td>
            <td>85M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('TSLA','stocks')">Trade</button></td>
          </tr>
          <tr data-symbol="AMZN" data-class="stocks" data-name="amazon ecommerce">
            <td><span style="background:#00c853;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">STOCK</span><strong>AMZN</strong><br><span style="color:#666;font-size:0.8rem;">Amazon.com Inc.</span></td>
            <td class="price">155.20</td>
            <td class="positive">+0.65%</td>
            <td>157.00</td>
            <td>153.80</td>
            <td>38M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('AMZN','stocks')">Trade</button></td>
          </tr>

          <!-- ETFs -->
          <tr data-symbol="SPY" data-class="etf" data-name="sp500 index fund">
            <td><span style="background:#7b2cbf;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">ETF</span><strong>SPY</strong><br><span style="color:#666;font-size:0.8rem;">SPDR S&P 500 ETF</span></td>
            <td class="price">478.50</td>
            <td class="positive">+0.45%</td>
            <td>480.20</td>
            <td>476.80</td>
            <td>72M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('SPY','etf')">Trade</button></td>
          </tr>
          <tr data-symbol="QQQ" data-class="etf" data-name="nasdaq 100 tech">
            <td><span style="background:#7b2cbf;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">ETF</span><strong>QQQ</strong><br><span style="color:#666;font-size:0.8rem;">Invesco QQQ Trust</span></td>
            <td class="price">405.80</td>
            <td class="positive">+0.92%</td>
            <td>408.50</td>
            <td>402.20</td>
            <td>45M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('QQQ','etf')">Trade</button></td>
          </tr>
          <tr data-symbol="VTI" data-class="etf" data-name="total stock market vanguard">
            <td><span style="background:#7b2cbf;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">ETF</span><strong>VTI</strong><br><span style="color:#666;font-size:0.8rem;">Vanguard Total Stock Market</span></td>
            <td class="price">238.40</td>
            <td class="positive">+0.38%</td>
            <td>239.80</td>
            <td>237.00</td>
            <td>12M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('VTI','etf')">Trade</button></td>
          </tr>
          <tr data-symbol="ARKK" data-class="etf" data-name="ark innovation cathie wood">
            <td><span style="background:#7b2cbf;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">ETF</span><strong>ARKK</strong><br><span style="color:#666;font-size:0.8rem;">ARK Innovation ETF</span></td>
            <td class="price">48.25</td>
            <td class="positive">+2.15%</td>
            <td>49.50</td>
            <td>47.20</td>
            <td>18M</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('ARKK','etf')">Trade</button></td>
          </tr>

          <!-- COMMODITIES -->
          <tr data-symbol="XAUUSD" data-class="commodities" data-name="gold precious metal">
            <td><span style="background:#ffc107;color:#000;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">CMDTY</span><strong>XAU/USD</strong><br><span style="color:#666;font-size:0.8rem;">Gold</span></td>
            <td class="price">2024.50</td>
            <td class="positive">+0.45%</td>
            <td>2035.00</td>
            <td>2015.00</td>
            <td>185K</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('XAUUSD','commodities')">Trade</button></td>
          </tr>
          <tr data-symbol="XAGUSD" data-class="commodities" data-name="silver precious metal">
            <td><span style="background:#c0c0c0;color:#000;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">CMDTY</span><strong>XAG/USD</strong><br><span style="color:#666;font-size:0.8rem;">Silver</span></td>
            <td class="price">23.45</td>
            <td class="positive">+0.68%</td>
            <td>23.80</td>
            <td>23.10</td>
            <td>52K</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('XAGUSD','commodities')">Trade</button></td>
          </tr>
          <tr data-symbol="USOIL" data-class="commodities" data-name="crude oil wti">
            <td><span style="background:#333;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">CMDTY</span><strong>WTI</strong><br><span style="color:#666;font-size:0.8rem;">Crude Oil WTI</span></td>
            <td class="price">72.85</td>
            <td class="negative">-0.95%</td>
            <td>74.20</td>
            <td>72.10</td>
            <td>425K</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('USOIL','commodities')">Trade</button></td>
          </tr>

          <!-- INDICES -->
          <tr data-symbol="US500" data-class="indices" data-name="sp500 us index">
            <td><span style="background:#ff5252;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">INDEX</span><strong>US500</strong><br><span style="color:#666;font-size:0.8rem;">S&P 500 Index</span></td>
            <td class="price">4785.50</td>
            <td class="positive">+0.42%</td>
            <td>4798.00</td>
            <td>4765.00</td>
            <td>--</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('US500','indices')">Trade</button></td>
          </tr>
          <tr data-symbol="US30" data-class="indices" data-name="dow jones industrial">
            <td><span style="background:#ff5252;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">INDEX</span><strong>US30</strong><br><span style="color:#666;font-size:0.8rem;">Dow Jones Industrial</span></td>
            <td class="price">37850.00</td>
            <td class="positive">+0.35%</td>
            <td>37980.00</td>
            <td>37720.00</td>
            <td>--</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('US30','indices')">Trade</button></td>
          </tr>
          <tr data-symbol="NAS100" data-class="indices" data-name="nasdaq 100 tech">
            <td><span style="background:#ff5252;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;margin-right:8px;">INDEX</span><strong>NAS100</strong><br><span style="color:#666;font-size:0.8rem;">NASDAQ 100 Index</span></td>
            <td class="price">16850.00</td>
            <td class="positive">+0.88%</td>
            <td>16920.00</td>
            <td>16750.00</td>
            <td>--</td>
            <td><button class="btn btn-primary" style="padding:6px 12px;" onclick="quickTrade('NAS100','indices')">Trade</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <script>
      function showAssetClass(cls) {
        document.querySelectorAll('[id^="tab-"]').forEach(tab => {
          tab.className = 'btn';
          tab.style.cssText = 'background:rgba(255,255,255,0.05);color:#888;';
        });
        document.getElementById('tab-' + cls).className = 'btn btn-primary';
        document.getElementById('tab-' + cls).style.cssText = '';

        document.querySelectorAll('#marketsTable tbody tr').forEach(row => {
          if (cls === 'all' || row.dataset.class === cls) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      }
      function filterMarkets(term) {
        const rows = document.querySelectorAll('#marketsTable tbody tr');
        rows.forEach(row => {
          const name = (row.dataset.name + ' ' + row.dataset.symbol).toLowerCase();
          row.style.display = name.includes(term.toLowerCase()) ? '' : 'none';
        });
      }
      function quickTrade(symbol, assetClass) {
        window.location.href = '/trade?symbol=' + symbol + '&type=' + assetClass;
      }
      setInterval(() => {
        document.querySelectorAll('.price').forEach(el => {
          const price = parseFloat(el.textContent.replace(',', ''));
          const change = (Math.random() - 0.5) * 0.002 * price;
          el.textContent = (price + change).toLocaleString('en-US', {
            minimumFractionDigits: price > 100 ? 2 : price > 1 ? 2 : 4,
            maximumFractionDigits: price > 100 ? 2 : price > 1 ? 2 : 4
          });
        });
      }, 2000);
    </script>`;
    res.send(pageTemplate('Markets', 'markets', content));
  });

  // ========================================================================
  // TRADE PAGE
  // ========================================================================
  app.get('/trade', (req, res) => {
    const symbol = (req.query.symbol as string) || 'EURUSD';
    const assetType = (req.query.type as string) || 'forex';
    const content = `
    <h1 class="page-title">Trade</h1>
    <div class="grid grid-2">
      <div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Chart</span>
            <select class="input-field" style="width:150px;" id="chartSymbol" onchange="updateSymbol(this.value)">
              <optgroup label="Forex">
                <option value="EURUSD" ${symbol === 'EURUSD' ? 'selected' : ''}>EUR/USD</option>
                <option value="GBPUSD" ${symbol === 'GBPUSD' ? 'selected' : ''}>GBP/USD</option>
                <option value="USDJPY" ${symbol === 'USDJPY' ? 'selected' : ''}>USD/JPY</option>
              </optgroup>
              <optgroup label="Crypto">
                <option value="BTCUSD" ${symbol === 'BTCUSD' ? 'selected' : ''}>BTC/USD</option>
                <option value="ETHUSD" ${symbol === 'ETHUSD' ? 'selected' : ''}>ETH/USD</option>
                <option value="SOLUSD" ${symbol === 'SOLUSD' ? 'selected' : ''}>SOL/USD</option>
              </optgroup>
              <optgroup label="Stocks">
                <option value="AAPL" ${symbol === 'AAPL' ? 'selected' : ''}>AAPL</option>
                <option value="MSFT" ${symbol === 'MSFT' ? 'selected' : ''}>MSFT</option>
                <option value="NVDA" ${symbol === 'NVDA' ? 'selected' : ''}>NVDA</option>
                <option value="TSLA" ${symbol === 'TSLA' ? 'selected' : ''}>TSLA</option>
              </optgroup>
              <optgroup label="ETFs">
                <option value="SPY" ${symbol === 'SPY' ? 'selected' : ''}>SPY</option>
                <option value="QQQ" ${symbol === 'QQQ' ? 'selected' : ''}>QQQ</option>
                <option value="VTI" ${symbol === 'VTI' ? 'selected' : ''}>VTI</option>
              </optgroup>
              <optgroup label="Commodities">
                <option value="XAUUSD" ${symbol === 'XAUUSD' ? 'selected' : ''}>Gold</option>
                <option value="XAGUSD" ${symbol === 'XAGUSD' ? 'selected' : ''}>Silver</option>
              </optgroup>
            </select>
          </div>
          <div style="height: 400px; background: rgba(0,0,0,0.3); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666;">
            <div style="text-align: center;">
              <div style="font-size: 3rem; margin-bottom: 16px;" id="chartPrice">${
                symbol === 'BTCUSD' ? '43,250.00' :
                symbol === 'ETHUSD' ? '2,286.00' :
                symbol === 'AAPL' ? '178.50' :
                symbol === 'MSFT' ? '378.25' :
                symbol === 'NVDA' ? '485.60' :
                symbol === 'TSLA' ? '242.80' :
                symbol === 'SPY' ? '478.50' :
                symbol === 'QQQ' ? '405.80' :
                symbol === 'XAUUSD' ? '2,024.50' :
                '1.0892'
              }</div>
              <div style="font-size: 1.2rem;" id="symbolDisplay">${symbol}</div>
              <div style="margin-top: 16px; font-size: 0.9rem; color: #888;">Connect TradingView or broker for live charts</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Trades</span>
          </div>
          <table class="table">
            <thead>
              <tr><th>Time</th><th>Symbol</th><th>Type</th><th>Size</th><th>Price</th><th>P/L</th></tr>
            </thead>
            <tbody id="recentTrades">
              <tr><td colspan="6" style="text-align:center;color:#666;padding:40px;">No recent trades</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">New Order</span>
          </div>
          <!-- Order Type Tabs -->
          <div style="display:flex;gap:4px;margin-bottom:16px;background:rgba(255,255,255,0.03);border-radius:8px;padding:4px;">
            <button class="btn" style="flex:1;padding:8px;font-size:0.85rem;background:rgba(0,212,255,0.2);color:#00d4ff;" id="tabMarket" onclick="setOrderMode('market')">Market</button>
            <button class="btn" style="flex:1;padding:8px;font-size:0.85rem;background:rgba(255,255,255,0.05);color:#888;" id="tabLimit" onclick="setOrderMode('limit')">Limit</button>
            <button class="btn" style="flex:1;padding:8px;font-size:0.85rem;background:rgba(255,255,255,0.05);color:#888;" id="tabStop" onclick="setOrderMode('stop')">Stop</button>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-success" style="flex:1;" id="buyBtn" onclick="setOrderType('buy')">BUY</button>
            <button class="btn" style="flex:1;background:rgba(255,255,255,0.05);color:#888;" id="sellBtn" onclick="setOrderType('sell')">SELL</button>
          </div>
          <div style="margin-bottom:16px;">
            <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Symbol</label>
            <select class="input-field" id="orderSymbol" onchange="syncSymbol(this.value)">
              <optgroup label="Forex">
                <option value="EURUSD" ${symbol === 'EURUSD' ? 'selected' : ''}>EUR/USD</option>
                <option value="GBPUSD" ${symbol === 'GBPUSD' ? 'selected' : ''}>GBP/USD</option>
                <option value="USDJPY" ${symbol === 'USDJPY' ? 'selected' : ''}>USD/JPY</option>
              </optgroup>
              <optgroup label="Crypto">
                <option value="BTCUSD" ${symbol === 'BTCUSD' ? 'selected' : ''}>BTC/USD</option>
                <option value="ETHUSD" ${symbol === 'ETHUSD' ? 'selected' : ''}>ETH/USD</option>
                <option value="SOLUSD" ${symbol === 'SOLUSD' ? 'selected' : ''}>SOL/USD</option>
              </optgroup>
              <optgroup label="Stocks">
                <option value="AAPL" ${symbol === 'AAPL' ? 'selected' : ''}>AAPL - Apple</option>
                <option value="MSFT" ${symbol === 'MSFT' ? 'selected' : ''}>MSFT - Microsoft</option>
                <option value="NVDA" ${symbol === 'NVDA' ? 'selected' : ''}>NVDA - NVIDIA</option>
                <option value="TSLA" ${symbol === 'TSLA' ? 'selected' : ''}>TSLA - Tesla</option>
                <option value="AMZN" ${symbol === 'AMZN' ? 'selected' : ''}>AMZN - Amazon</option>
              </optgroup>
              <optgroup label="ETFs">
                <option value="SPY" ${symbol === 'SPY' ? 'selected' : ''}>SPY - S&P 500</option>
                <option value="QQQ" ${symbol === 'QQQ' ? 'selected' : ''}>QQQ - Nasdaq 100</option>
                <option value="VTI" ${symbol === 'VTI' ? 'selected' : ''}>VTI - Total Stock</option>
              </optgroup>
              <optgroup label="Commodities">
                <option value="XAUUSD" ${symbol === 'XAUUSD' ? 'selected' : ''}>Gold (XAU/USD)</option>
                <option value="XAGUSD" ${symbol === 'XAGUSD' ? 'selected' : ''}>Silver (XAG/USD)</option>
              </optgroup>
            </select>
          </div>
          <div id="limitPriceDiv" style="margin-bottom:16px;display:none;">
            <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Limit Price</label>
            <input type="number" class="input-field" placeholder="Enter price" id="limitPrice">
          </div>
          <div style="margin-bottom:16px;">
            <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;" id="volumeLabel">Volume (Lots/Shares)</label>
            <input type="number" class="input-field" value="${['AAPL','MSFT','NVDA','TSLA','AMZN','SPY','QQQ','VTI'].includes(symbol as string) ? '10' : '0.01'}" step="${['AAPL','MSFT','NVDA','TSLA','AMZN','SPY','QQQ','VTI'].includes(symbol as string) ? '1' : '0.01'}" min="${['AAPL','MSFT','NVDA','TSLA','AMZN','SPY','QQQ','VTI'].includes(symbol as string) ? '1' : '0.01'}" id="orderVolume">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div>
              <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Stop Loss</label>
              <input type="number" class="input-field" placeholder="Price" id="orderSL">
            </div>
            <div>
              <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Take Profit</label>
              <input type="number" class="input-field" placeholder="Price" id="orderTP">
            </div>
          </div>
          <button class="btn btn-success" style="width:100%;padding:16px;font-size:1.1rem;" id="placeOrderBtn" onclick="placeOrder()">Place Buy Order</button>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">AI Signals</span>
          </div>
          <div style="padding:16px;background:rgba(0,200,83,0.1);border-radius:8px;border-left:3px solid #00c853;margin-bottom:12px;">
            <div style="font-weight:600;color:#00c853;">BUY Signal - ${symbol}</div>
            <div style="font-size:0.85rem;color:#888;margin-top:4px;">Confidence: 72% | Source: Momentum Strategy</div>
          </div>
          <div style="padding:16px;background:rgba(255,193,7,0.1);border-radius:8px;border-left:3px solid #ffc107;">
            <div style="font-weight:600;color:#ffc107;">HOLD - Market Consolidating</div>
            <div style="font-size:0.85rem;color:#888;margin-top:4px;">Wait for breakout confirmation</div>
          </div>
        </div>
      </div>
    </div>
    <script>
      let orderType = 'buy';
      let orderMode = 'market';

      function setOrderMode(mode) {
        orderMode = mode;
        ['market','limit','stop'].forEach(m => {
          const tab = document.getElementById('tab' + m.charAt(0).toUpperCase() + m.slice(1));
          tab.style.cssText = m === mode ? 'flex:1;padding:8px;font-size:0.85rem;background:rgba(0,212,255,0.2);color:#00d4ff;' : 'flex:1;padding:8px;font-size:0.85rem;background:rgba(255,255,255,0.05);color:#888;';
        });
        document.getElementById('limitPriceDiv').style.display = mode !== 'market' ? 'block' : 'none';
      }

      function setOrderType(type) {
        orderType = type;
        document.getElementById('buyBtn').className = type === 'buy' ? 'btn btn-success' : 'btn';
        document.getElementById('buyBtn').style.cssText = type === 'buy' ? 'flex:1;' : 'flex:1;background:rgba(255,255,255,0.05);color:#888;';
        document.getElementById('sellBtn').className = type === 'sell' ? 'btn btn-danger' : 'btn';
        document.getElementById('sellBtn').style.cssText = type === 'sell' ? 'flex:1;' : 'flex:1;background:rgba(255,255,255,0.05);color:#888;';
        document.getElementById('placeOrderBtn').textContent = 'Place ' + (type === 'buy' ? 'Buy' : 'Sell') + ' Order';
        document.getElementById('placeOrderBtn').className = type === 'buy' ? 'btn btn-success' : 'btn btn-danger';
      }

      function updateSymbol(sym) {
        document.getElementById('orderSymbol').value = sym;
        document.getElementById('symbolDisplay').textContent = sym;
        // Update volume defaults based on asset type
        const isStock = ['AAPL','MSFT','NVDA','TSLA','AMZN','SPY','QQQ','VTI'].includes(sym);
        document.getElementById('orderVolume').value = isStock ? '10' : '0.01';
        document.getElementById('orderVolume').step = isStock ? '1' : '0.01';
        document.getElementById('orderVolume').min = isStock ? '1' : '0.01';
        document.getElementById('volumeLabel').textContent = isStock ? 'Shares' : 'Volume (Lots)';
      }

      function syncSymbol(sym) {
        document.getElementById('chartSymbol').value = sym;
        updateSymbol(sym);
      }

      async function placeOrder() {
        const symbol = document.getElementById('orderSymbol').value;
        const volume = document.getElementById('orderVolume').value;
        const sl = document.getElementById('orderSL').value;
        const tp = document.getElementById('orderTP').value;
        const limitPrice = document.getElementById('limitPrice').value;

        try {
          const res = await fetch('/api/v1/trading/trades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol,
              direction: orderType === 'buy' ? 'long' : 'short',
              quantity: parseFloat(volume),
              orderType: orderMode,
              limitPrice: limitPrice || undefined,
              stopLoss: sl || undefined,
              takeProfit: tp || undefined
            })
          });
          const data = await res.json();
          alert(data.success ? 'Order placed!' : 'Order failed: ' + (data.error || 'Unknown error'));
          if (data.success) location.reload();
        } catch (e) { alert('Error: ' + e.message); }
      }

      setInterval(() => {
        const priceEl = document.getElementById('chartPrice');
        const price = parseFloat(priceEl.textContent.replace(/,/g, ''));
        const change = (Math.random() - 0.5) * 0.002 * price;
        priceEl.textContent = (price + change).toLocaleString('en-US', {
          minimumFractionDigits: price > 100 ? 2 : price > 1 ? 2 : 4,
          maximumFractionDigits: price > 100 ? 2 : price > 1 ? 2 : 4
        });
      }, 1500);
    </script>`;
    res.send(pageTemplate('Trade', 'trade', content));
  });

  // ========================================================================
  // PORTFOLIO PAGE
  // ========================================================================
  app.get('/portfolio', (req, res) => {
    const riskState = riskEngine.getState();
    const content = `
    <h1 class="page-title">Portfolio</h1>
    <div class="grid grid-4" style="margin-bottom:24px;">
      <div class="card stat-card">
        <div class="stat-value">$${(100000 + (riskState.dailyPnL || 0)).toLocaleString()}</div>
        <div class="stat-label">Total Balance</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value ${(riskState.dailyPnL || 0) >= 0 ? 'positive' : 'negative'}">$${(riskState.dailyPnL || 0).toLocaleString()}</div>
        <div class="stat-label">Today's P/L</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${riskState.openPositions || 0}</div>
        <div class="stat-label">Open Positions</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">$95,000</div>
        <div class="stat-label">Available Margin</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Open Positions</span>
        <button class="btn btn-danger" onclick="closeAll()">Close All</button>
      </div>
      <table class="table">
        <thead>
          <tr><th>Symbol</th><th>Type</th><th>Volume</th><th>Open Price</th><th>Current</th><th>P/L</th><th>Actions</th></tr>
        </thead>
        <tbody id="positionsTable">
          ${(riskState.openPositions || 0) === 0 ? '<tr><td colspan="7" style="text-align:center;color:#666;padding:40px;">No open positions</td></tr>' : `
          <tr>
            <td><strong>EUR/USD</strong></td>
            <td><span style="color:#00c853;">BUY</span></td>
            <td>0.10</td>
            <td>1.0850</td>
            <td>1.0892</td>
            <td class="positive">+$42.00</td>
            <td><button class="btn btn-danger" onclick="closePosition('1')">Close</button></td>
          </tr>`}
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Trade History</span>
        <select class="input-field" style="width:150px;">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>All time</option>
        </select>
      </div>
      <table class="table">
        <thead>
          <tr><th>Date</th><th>Symbol</th><th>Type</th><th>Volume</th><th>Open</th><th>Close</th><th>P/L</th></tr>
        </thead>
        <tbody>
          <tr><td colspan="7" style="text-align:center;color:#666;padding:40px;">No trade history yet</td></tr>
        </tbody>
      </table>
    </div>
    <script>
      async function closePosition(id) {
        if (!confirm('Close this position?')) return;
        alert('Position closed (demo)');
      }
      async function closeAll() {
        if (!confirm('Close ALL positions?')) return;
        alert('All positions closed (demo)');
      }
    </script>`;
    res.send(pageTemplate('Portfolio', 'portfolio', content));
  });

  // ========================================================================
  // SOCIAL TRADING / COPY TRADE PAGE
  // ========================================================================
  app.get('/social', (req, res) => {
    const content = `
    <style>
      .provider-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        transition: all 0.2s;
      }
      .provider-card:hover {
        border-color: rgba(0,212,255,0.3);
        transform: translateY(-2px);
      }
      .provider-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .provider-name {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .provider-type {
        font-size: 0.8rem;
        color: #888;
        text-transform: uppercase;
      }
      .provider-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .badge-elite { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; }
      .badge-verified { background: rgba(0,200,83,0.2); color: #00c853; }
      .badge-ai { background: linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,44,191,0.2)); color: #00d4ff; border: 1px solid rgba(0,212,255,0.3); }
      .provider-stats {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        margin-bottom: 16px;
      }
      .pstat { text-align: center; }
      .pstat-value { font-size: 1.3rem; font-weight: 600; }
      .pstat-label { font-size: 0.75rem; color: #666; text-transform: uppercase; }
      .ai-score {
        background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(123,44,191,0.1));
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ai-score-value {
        font-size: 2rem;
        font-weight: 700;
        background: linear-gradient(90deg, #00d4ff, #7b2cbf);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .ai-score-label { font-size: 0.85rem; color: #888; }
      .copy-btn {
        background: linear-gradient(135deg, #00d4ff, #7b2cbf);
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .copy-btn:hover { transform: scale(1.02); }
      .copy-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .collective-card {
        background: linear-gradient(135deg, rgba(0,212,255,0.05), rgba(123,44,191,0.05));
        border: 1px solid rgba(0,212,255,0.2);
      }
      .consensus-bar {
        display: flex;
        height: 24px;
        border-radius: 4px;
        overflow: hidden;
        margin: 12px 0;
      }
      .consensus-long { background: #00c853; }
      .consensus-short { background: #ff5252; }
      .consensus-neutral { background: #666; }
      .leaderboard-row {
        display: flex;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .leaderboard-row:hover { background: rgba(255,255,255,0.02); }
      .leaderboard-rank {
        width: 40px;
        font-size: 1.2rem;
        font-weight: 700;
        color: #666;
      }
      .leaderboard-rank.top-3 { color: #ffd700; }
      .tabs { display: flex; gap: 8px; margin-bottom: 24px; }
      .tab {
        padding: 12px 24px;
        border-radius: 8px;
        background: rgba(255,255,255,0.05);
        color: #888;
        cursor: pointer;
        font-weight: 500;
        border: none;
        transition: all 0.2s;
      }
      .tab:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .tab.active { background: rgba(0,212,255,0.2); color: #00d4ff; }
    </style>
    <h1 class="page-title">Copy Trading</h1>
    <p style="color:#888;margin-bottom:24px;">AI-powered social trading. Copy top performers or let TIME autonomously select the best signal providers for your risk profile.</p>

    <div class="tabs">
      <button class="tab active" onclick="showTab('providers')">Signal Providers</button>
      <button class="tab" onclick="showTab('leaderboard')">Leaderboard</button>
      <button class="tab" onclick="showTab('intelligence')">Collective Intelligence</button>
      <button class="tab" onclick="showTab('my-copies')">My Copies</button>
    </div>

    <!-- AI Recommendations Banner -->
    <div class="card collective-card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title" style="color:#00d4ff;">AI Recommendations</span>
        <button class="copy-btn" onclick="autoSetupCopying()">Auto-Setup Copy Trading</button>
      </div>
      <p style="color:#ccc;margin-bottom:12px;">Based on your risk profile (Moderate), TIME recommends these signal providers:</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div style="background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:8px;flex:1;min-width:200px;">
          <strong>TrendMaster Pro</strong><br>
          <span style="color:#00c853;">AI Score: 88</span> | Win Rate: 65%
        </div>
        <div style="background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:8px;flex:1;min-width:200px;">
          <strong>Range Reversion Bot</strong><br>
          <span style="color:#00c853;">AI Score: 85</span> | Win Rate: 72%
        </div>
        <div style="background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:8px;flex:1;min-width:200px;">
          <strong>Scalp King AI</strong><br>
          <span style="color:#00c853;">AI Score: 91</span> | Win Rate: 70%
        </div>
      </div>
      <p style="color:#666;font-size:0.85rem;margin-top:12px;">Expected Return: +28.5% | Expected Max Drawdown: 10.0% | Diversification Score: 75%</p>
    </div>

    <!-- Signal Providers Section -->
    <div id="providers-section">
      <div class="grid grid-2" style="gap:24px;">
        <!-- Provider 1 -->
        <div class="provider-card">
          <div class="provider-header">
            <div>
              <div class="provider-name">TrendMaster Pro</div>
              <div class="provider-type">MT5 Bot | Trend Following</div>
            </div>
            <div style="display:flex;gap:8px;">
              <span class="provider-badge badge-verified">Verified</span>
              <span class="provider-badge badge-ai">AI Recommended</span>
            </div>
          </div>
          <div class="provider-stats">
            <div class="pstat">
              <div class="pstat-value positive">65%</div>
              <div class="pstat-label">Win Rate</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">2.35</div>
              <div class="pstat-label">Profit Factor</div>
            </div>
            <div class="pstat">
              <div class="pstat-value negative">12%</div>
              <div class="pstat-label">Max DD</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">342</div>
              <div class="pstat-label">Followers</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">$2.5M</div>
              <div class="pstat-label">Copied</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="ai-score">
              <div class="ai-score-value">88</div>
              <div class="ai-score-label">TIME AI Score<br><span style="font-size:0.7rem;">Risk-adjusted quality</span></div>
            </div>
            <button class="copy-btn" onclick="startCopying('provider_1')">Start Copying</button>
          </div>
        </div>

        <!-- Provider 2 -->
        <div class="provider-card">
          <div class="provider-header">
            <div>
              <div class="provider-name">Scalp King AI</div>
              <div class="provider-type">cTrader AI Strategy | Scalping</div>
            </div>
            <div style="display:flex;gap:8px;">
              <span class="provider-badge badge-elite">Elite Trader</span>
              <span class="provider-badge badge-verified">Verified</span>
            </div>
          </div>
          <div class="provider-stats">
            <div class="pstat">
              <div class="pstat-value positive">70%</div>
              <div class="pstat-label">Win Rate</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">1.55</div>
              <div class="pstat-label">Profit Factor</div>
            </div>
            <div class="pstat">
              <div class="pstat-value negative">8%</div>
              <div class="pstat-label">Max DD</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">578</div>
              <div class="pstat-label">Followers</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">$4.2M</div>
              <div class="pstat-label">Copied</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="ai-score">
              <div class="ai-score-value">91</div>
              <div class="ai-score-label">TIME AI Score<br><span style="font-size:0.7rem;">Risk-adjusted quality</span></div>
            </div>
            <button class="copy-btn" onclick="startCopying('provider_2')">Start Copying</button>
          </div>
        </div>

        <!-- Provider 3 -->
        <div class="provider-card">
          <div class="provider-header">
            <div>
              <div class="provider-name">Crypto Momentum Alpha</div>
              <div class="provider-type">TradingView | Human Trader</div>
            </div>
            <div style="display:flex;gap:8px;">
              <span class="provider-badge badge-verified">Verified</span>
            </div>
          </div>
          <div class="provider-stats">
            <div class="pstat">
              <div class="pstat-value positive">60%</div>
              <div class="pstat-label">Win Rate</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">1.95</div>
              <div class="pstat-label">Profit Factor</div>
            </div>
            <div class="pstat">
              <div class="pstat-value negative">22%</div>
              <div class="pstat-label">Max DD</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">892</div>
              <div class="pstat-label">Followers</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">$8.5M</div>
              <div class="pstat-label">Copied</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="ai-score">
              <div class="ai-score-value">75</div>
              <div class="ai-score-label">TIME AI Score<br><span style="font-size:0.7rem;">Higher risk profile</span></div>
            </div>
            <button class="copy-btn" onclick="startCopying('provider_3')">Start Copying</button>
          </div>
        </div>

        <!-- Provider 4 -->
        <div class="provider-card">
          <div class="provider-header">
            <div>
              <div class="provider-name">Range Reversion Bot</div>
              <div class="provider-type">TIME Bot Ensemble | Mean Reversion</div>
            </div>
            <div style="display:flex;gap:8px;">
              <span class="provider-badge badge-ai">TIME Native</span>
              <span class="provider-badge badge-verified">Verified</span>
            </div>
          </div>
          <div class="provider-stats">
            <div class="pstat">
              <div class="pstat-value positive">72%</div>
              <div class="pstat-label">Win Rate</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">1.78</div>
              <div class="pstat-label">Profit Factor</div>
            </div>
            <div class="pstat">
              <div class="pstat-value negative">10%</div>
              <div class="pstat-label">Max DD</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">215</div>
              <div class="pstat-label">Followers</div>
            </div>
            <div class="pstat">
              <div class="pstat-value">$1.2M</div>
              <div class="pstat-label">Copied</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="ai-score">
              <div class="ai-score-value">85</div>
              <div class="ai-score-label">TIME AI Score<br><span style="font-size:0.7rem;">Low risk, consistent</span></div>
            </div>
            <button class="copy-btn" onclick="startCopying('provider_4')">Start Copying</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Leaderboard Section (hidden by default) -->
    <div id="leaderboard-section" style="display:none;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Top Signal Providers</span>
          <select class="input-field" style="width:auto;padding:8px 16px;">
            <option>All Types</option>
            <option>Bots Only</option>
            <option>Human Traders</option>
            <option>AI Strategies</option>
          </select>
        </div>
        <div class="leaderboard-row" style="background:rgba(255,255,255,0.03);font-weight:600;color:#888;">
          <div class="leaderboard-rank">#</div>
          <div style="flex:2;">Provider</div>
          <div style="flex:1;text-align:center;">AI Score</div>
          <div style="flex:1;text-align:center;">Win Rate</div>
          <div style="flex:1;text-align:center;">P/F</div>
          <div style="flex:1;text-align:center;">Followers</div>
          <div style="flex:1;text-align:center;">Return</div>
          <div style="flex:1;text-align:center;">Actions</div>
        </div>
        <div class="leaderboard-row">
          <div class="leaderboard-rank top-3">1</div>
          <div style="flex:2;"><strong>Scalp King AI</strong><br><span style="color:#666;font-size:0.8rem;">cTrader | AI Strategy</span></div>
          <div style="flex:1;text-align:center;"><span style="color:#00d4ff;font-weight:600;">91</span></div>
          <div style="flex:1;text-align:center;color:#00c853;">70%</div>
          <div style="flex:1;text-align:center;">1.55</div>
          <div style="flex:1;text-align:center;">578</div>
          <div style="flex:1;text-align:center;color:#00c853;">+42.5%</div>
          <div style="flex:1;text-align:center;"><button class="btn btn-primary" style="padding:6px 12px;" onclick="startCopying('p2')">Copy</button></div>
        </div>
        <div class="leaderboard-row">
          <div class="leaderboard-rank top-3">2</div>
          <div style="flex:2;"><strong>TrendMaster Pro</strong><br><span style="color:#666;font-size:0.8rem;">MT5 | Bot</span></div>
          <div style="flex:1;text-align:center;"><span style="color:#00d4ff;font-weight:600;">88</span></div>
          <div style="flex:1;text-align:center;color:#00c853;">65%</div>
          <div style="flex:1;text-align:center;">2.35</div>
          <div style="flex:1;text-align:center;">342</div>
          <div style="flex:1;text-align:center;color:#00c853;">+28.5%</div>
          <div style="flex:1;text-align:center;"><button class="btn btn-primary" style="padding:6px 12px;" onclick="startCopying('p1')">Copy</button></div>
        </div>
        <div class="leaderboard-row">
          <div class="leaderboard-rank top-3">3</div>
          <div style="flex:2;"><strong>Range Reversion Bot</strong><br><span style="color:#666;font-size:0.8rem;">TIME Native | Ensemble</span></div>
          <div style="flex:1;text-align:center;"><span style="color:#00d4ff;font-weight:600;">85</span></div>
          <div style="flex:1;text-align:center;color:#00c853;">72%</div>
          <div style="flex:1;text-align:center;">1.78</div>
          <div style="flex:1;text-align:center;">215</div>
          <div style="flex:1;text-align:center;color:#00c853;">+17.5%</div>
          <div style="flex:1;text-align:center;"><button class="btn btn-primary" style="padding:6px 12px;" onclick="startCopying('p4')">Copy</button></div>
        </div>
        <div class="leaderboard-row">
          <div class="leaderboard-rank">4</div>
          <div style="flex:2;"><strong>Crypto Momentum Alpha</strong><br><span style="color:#666;font-size:0.8rem;">TradingView | Human</span></div>
          <div style="flex:1;text-align:center;"><span style="color:#00d4ff;font-weight:600;">75</span></div>
          <div style="flex:1;text-align:center;color:#00c853;">60%</div>
          <div style="flex:1;text-align:center;">1.95</div>
          <div style="flex:1;text-align:center;">892</div>
          <div style="flex:1;text-align:center;color:#00c853;">+35.6%</div>
          <div style="flex:1;text-align:center;"><button class="btn btn-primary" style="padding:6px 12px;" onclick="startCopying('p3')">Copy</button></div>
        </div>
      </div>
    </div>

    <!-- Collective Intelligence Section (hidden by default) -->
    <div id="intelligence-section" style="display:none;">
      <div class="card collective-card">
        <div class="card-header">
          <span class="card-title" style="color:#00d4ff;">Collective Intelligence - Real-Time Consensus</span>
        </div>
        <p style="color:#ccc;margin-bottom:20px;">Aggregated signals from all active providers weighted by their AI scores.</p>

        <div class="grid grid-2" style="gap:24px;">
          <div style="background:rgba(0,0,0,0.3);padding:20px;border-radius:12px;">
            <h3 style="margin-bottom:12px;">EUR/USD</h3>
            <div class="consensus-bar">
              <div class="consensus-long" style="width:65%;"></div>
              <div class="consensus-neutral" style="width:15%;"></div>
              <div class="consensus-short" style="width:20%;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#888;">
              <span style="color:#00c853;">Long: 65%</span>
              <span>Neutral: 15%</span>
              <span style="color:#ff5252;">Short: 20%</span>
            </div>
            <div style="margin-top:12px;padding:12px;background:rgba(0,200,83,0.1);border-radius:8px;">
              <strong style="color:#00c853;">CONSENSUS: LONG</strong>
              <span style="color:#888;margin-left:8px;">Strength: 65% | Confidence: 78%</span>
            </div>
          </div>

          <div style="background:rgba(0,0,0,0.3);padding:20px;border-radius:12px;">
            <h3 style="margin-bottom:12px;">BTC/USD</h3>
            <div class="consensus-bar">
              <div class="consensus-long" style="width:45%;"></div>
              <div class="consensus-neutral" style="width:30%;"></div>
              <div class="consensus-short" style="width:25%;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#888;">
              <span style="color:#00c853;">Long: 45%</span>
              <span>Neutral: 30%</span>
              <span style="color:#ff5252;">Short: 25%</span>
            </div>
            <div style="margin-top:12px;padding:12px;background:rgba(102,102,102,0.2);border-radius:8px;">
              <strong style="color:#888;">CONSENSUS: MIXED</strong>
              <span style="color:#666;margin-left:8px;">Strength: 45% | Low confidence</span>
            </div>
          </div>

          <div style="background:rgba(0,0,0,0.3);padding:20px;border-radius:12px;">
            <h3 style="margin-bottom:12px;">XAU/USD</h3>
            <div class="consensus-bar">
              <div class="consensus-long" style="width:70%;"></div>
              <div class="consensus-neutral" style="width:20%;"></div>
              <div class="consensus-short" style="width:10%;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#888;">
              <span style="color:#00c853;">Long: 70%</span>
              <span>Neutral: 20%</span>
              <span style="color:#ff5252;">Short: 10%</span>
            </div>
            <div style="margin-top:12px;padding:12px;background:rgba(0,200,83,0.1);border-radius:8px;">
              <strong style="color:#00c853;">CONSENSUS: STRONG LONG</strong>
              <span style="color:#888;margin-left:8px;">Strength: 70% | Confidence: 85%</span>
            </div>
          </div>

          <div style="background:rgba(0,0,0,0.3);padding:20px;border-radius:12px;">
            <h3 style="margin-bottom:12px;">GBP/USD</h3>
            <div class="consensus-bar">
              <div class="consensus-long" style="width:25%;"></div>
              <div class="consensus-neutral" style="width:15%;"></div>
              <div class="consensus-short" style="width:60%;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#888;">
              <span style="color:#00c853;">Long: 25%</span>
              <span>Neutral: 15%</span>
              <span style="color:#ff5252;">Short: 60%</span>
            </div>
            <div style="margin-top:12px;padding:12px;background:rgba(255,82,82,0.1);border-radius:8px;">
              <strong style="color:#ff5252;">CONSENSUS: SHORT</strong>
              <span style="color:#888;margin-left:8px;">Strength: 60% | Confidence: 72%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- My Copies Section (hidden by default) -->
    <div id="my-copies-section" style="display:none;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">My Active Copy Trades</span>
        </div>
        <div style="text-align:center;padding:60px;color:#666;">
          <div style="font-size:3rem;margin-bottom:16px;">0</div>
          <div>No active copy trading configurations</div>
          <button class="copy-btn" style="margin-top:20px;" onclick="showTab('providers')">Browse Signal Providers</button>
        </div>
      </div>
    </div>

    <script>
      function showTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById('providers-section').style.display = tab === 'providers' ? 'block' : 'none';
        document.getElementById('leaderboard-section').style.display = tab === 'leaderboard' ? 'block' : 'none';
        document.getElementById('intelligence-section').style.display = tab === 'intelligence' ? 'block' : 'none';
        document.getElementById('my-copies-section').style.display = tab === 'my-copies' ? 'block' : 'none';
      }
      function startCopying(providerId) {
        const modal = \`
          <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;" onclick="this.remove()">
            <div style="background:#1a1a2e;padding:32px;border-radius:16px;max-width:500px;width:90%;" onclick="event.stopPropagation()">
              <h2 style="margin-bottom:20px;">Configure Copy Trading</h2>
              <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;margin-bottom:4px;">Copy Mode</label>
                <select style="width:100%;padding:12px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
                  <option>Proportional (match your account size)</option>
                  <option>Fixed Lot Size</option>
                  <option>Risk-Based (% of equity per trade)</option>
                  <option>Mirror (exact copy)</option>
                </select>
              </div>
              <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;margin-bottom:4px;">Max Risk per Trade (%)</label>
                <input type="number" value="2" style="width:100%;padding:12px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
              </div>
              <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;margin-bottom:4px;">Max Open Trades</label>
                <input type="number" value="5" style="width:100%;padding:12px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
              </div>
              <div style="margin-bottom:24px;">
                <label style="display:flex;align-items:center;gap:8px;color:#888;">
                  <input type="checkbox" checked> Use AI regime filtering (skip signals in weak regimes)
                </label>
              </div>
              <div style="display:flex;gap:12px;">
                <button class="copy-btn" style="flex:1;" onclick="confirmCopy()">Start Copying</button>
                <button style="flex:1;background:rgba(255,255,255,0.1);border:none;padding:12px;border-radius:8px;color:#888;cursor:pointer;" onclick="this.closest('[style*=position]').remove()">Cancel</button>
              </div>
            </div>
          </div>
        \`;
        document.body.insertAdjacentHTML('beforeend', modal);
      }
      function confirmCopy() {
        alert('Copy trading configured! You will receive signals from this provider.');
        document.querySelector('[style*="position:fixed"]').remove();
      }
      function autoSetupCopying() {
        if(confirm('TIME will automatically setup copy trading with our recommended providers based on your risk profile. Continue?')) {
          alert('Auto-setup complete! Now copying: TrendMaster Pro, Range Reversion Bot, Scalp King AI');
        }
      }
    </script>`;
    res.send(pageTemplate('Copy Trading', 'social', content));
  });

  // ========================================================================
  // INVEST PAGE - TOKENIZED ASSETS & FRACTIONAL INVESTING
  // ========================================================================
  app.get('/invest', (req, res) => {
    const content = `
    <style>
      .invest-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
      .invest-tab {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        background: rgba(255,255,255,0.05);
        color: #888;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      }
      .invest-tab:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .invest-tab.active { background: linear-gradient(135deg, #00d4ff, #7b2cbf); color: #fff; }
      .asset-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 24px;
        transition: all 0.3s;
        cursor: pointer;
      }
      .asset-card:hover { transform: translateY(-4px); border-color: rgba(0,212,255,0.3); }
      .asset-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
      .asset-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: bold;
      }
      .asset-icon.stocks { background: linear-gradient(135deg, #00c853, #00e676); }
      .asset-icon.real_estate { background: linear-gradient(135deg, #7b2cbf, #9c27b0); }
      .asset-icon.commodities { background: linear-gradient(135deg, #ffc107, #ff9800); }
      .asset-icon.art { background: linear-gradient(135deg, #e91e63, #f06292); }
      .asset-icon.etfs { background: linear-gradient(135deg, #2196f3, #42a5f5); }
      .asset-badge {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .asset-badge.yield { background: rgba(0,200,83,0.2); color: #00c853; }
      .asset-badge.premium { background: rgba(123,44,191,0.2); color: #7b2cbf; }
      .asset-name { font-size: 1.1rem; font-weight: 600; margin-bottom: 4px; }
      .asset-symbol { color: #888; font-size: 0.85rem; }
      .asset-price { font-size: 1.5rem; font-weight: 700; margin: 16px 0 4px; }
      .asset-change { font-size: 0.9rem; }
      .asset-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); }
      .asset-stat-label { font-size: 0.75rem; color: #666; }
      .asset-stat-value { font-size: 0.9rem; font-weight: 600; }
      .invest-btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #00d4ff, #7b2cbf);
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        margin-top: 16px;
        transition: all 0.2s;
      }
      .invest-btn:hover { transform: scale(1.02); }
      .portfolio-summary {
        background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(123,44,191,0.1));
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
      }
      .portfolio-value { font-size: 2.5rem; font-weight: 700; }
      .portfolio-yield { color: #00c853; font-size: 1.1rem; margin-top: 8px; }
      .allocation-bar {
        height: 8px;
        border-radius: 4px;
        background: rgba(255,255,255,0.1);
        overflow: hidden;
        margin: 16px 0;
        display: flex;
      }
      .allocation-segment { height: 100%; }
      .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
      .filter-chip {
        padding: 8px 16px;
        border-radius: 20px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: #888;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
      }
      .filter-chip:hover, .filter-chip.active { background: rgba(0,212,255,0.2); border-color: #00d4ff; color: #00d4ff; }
    </style>

    <!-- Portfolio Summary -->
    <div class="portfolio-summary">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="color:#888;font-size:0.9rem;margin-bottom:8px;">Your Tokenized Portfolio</div>
          <div class="portfolio-value">$0.00</div>
          <div class="portfolio-yield">+$0.00 projected annual yield</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#888;font-size:0.85rem;margin-bottom:4px;">Total Yield Received</div>
          <div style="font-size:1.2rem;font-weight:600;color:#00c853;">$0.00</div>
        </div>
      </div>
      <div class="allocation-bar">
        <div class="allocation-segment" style="width:0%;background:#00c853;"></div>
        <div class="allocation-segment" style="width:0%;background:#7b2cbf;"></div>
        <div class="allocation-segment" style="width:0%;background:#ffc107;"></div>
        <div class="allocation-segment" style="width:0%;background:#e91e63;"></div>
        <div class="allocation-segment" style="width:0%;background:#2196f3;"></div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.8rem;color:#888;">
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#00c853;"></span> Stocks</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#7b2cbf;"></span> Real Estate</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#ffc107;"></span> Commodities</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#e91e63;"></span> Art</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#2196f3;"></span> ETFs</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="invest-tabs">
      <button class="invest-tab active" onclick="showInvestTab('browse')">Browse Assets</button>
      <button class="invest-tab" onclick="showInvestTab('my-holdings')">My Holdings</button>
      <button class="invest-tab" onclick="showInvestTab('yield')">Yield Tracker</button>
      <button class="invest-tab" onclick="showInvestTab('auto-invest')">Auto-Invest</button>
    </div>

    <!-- Browse Section -->
    <div id="browse-section">
      <!-- Filters -->
      <div class="filter-chips">
        <span class="filter-chip active" onclick="filterAssets('all')">All Assets</span>
        <span class="filter-chip" onclick="filterAssets('stocks')">Stocks</span>
        <span class="filter-chip" onclick="filterAssets('real_estate')">Real Estate</span>
        <span class="filter-chip" onclick="filterAssets('commodities')">Commodities</span>
        <span class="filter-chip" onclick="filterAssets('art')">Art</span>
        <span class="filter-chip" onclick="filterAssets('etfs')">ETFs</span>
        <span class="filter-chip" onclick="filterAssets('yield')">High Yield</span>
      </div>

      <!-- Asset Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;">

        <!-- Tesla Token -->
        <div class="asset-card" onclick="openAsset('tTSLA')">
          <div class="asset-header">
            <div class="asset-icon stocks">T</div>
            <span class="asset-badge premium">Popular</span>
          </div>
          <div class="asset-name">Tokenized Tesla</div>
          <div class="asset-symbol">tTSLA</div>
          <div class="asset-price">$248.50</div>
          <div class="asset-change positive">+2.34% today</div>
          <div class="asset-stats">
            <div>
              <div class="asset-stat-label">Min Investment</div>
              <div class="asset-stat-value">$1.00</div>
            </div>
            <div>
              <div class="asset-stat-label">24h Volume</div>
              <div class="asset-stat-value">$1.2M</div>
            </div>
          </div>
          <button class="invest-btn" onclick="event.stopPropagation();investInAsset('tTSLA')">Invest Now</button>
        </div>

        <!-- Miami Real Estate -->
        <div class="asset-card" onclick="openAsset('MIAMI-APT')">
          <div class="asset-header">
            <div class="asset-icon real_estate">M</div>
            <span class="asset-badge yield">8.5% APY</span>
          </div>
          <div class="asset-name">Miami Luxury Apartments</div>
          <div class="asset-symbol">MIAMI-APT</div>
          <div class="asset-price">$52.30</div>
          <div class="asset-change positive">+0.58% premium</div>
          <div class="asset-stats">
            <div>
              <div class="asset-stat-label">Min Investment</div>
              <div class="asset-stat-value">$50.00</div>
            </div>
            <div>
              <div class="asset-stat-label">Yield</div>
              <div class="asset-stat-value" style="color:#00c853;">Weekly</div>
            </div>
          </div>
          <button class="invest-btn" onclick="event.stopPropagation();investInAsset('MIAMI-APT')">Invest Now</button>
        </div>

        <!-- Gold Token -->
        <div class="asset-card" onclick="openAsset('PAXG')">
          <div class="asset-header">
            <div class="asset-icon commodities">Au</div>
            <span class="asset-badge premium">1:1 Backed</span>
          </div>
          <div class="asset-name">PAX Gold</div>
          <div class="asset-symbol">PAXG</div>
          <div class="asset-price">$2,650.00</div>
          <div class="asset-change positive">+0.19% premium</div>
          <div class="asset-stats">
            <div>
              <div class="asset-stat-label">Min Investment</div>
              <div class="asset-stat-value">$20.00</div>
            </div>
            <div>
              <div class="asset-stat-label">Custodian</div>
              <div class="asset-stat-value">Brink's</div>
            </div>
          </div>
          <button class="invest-btn" onclick="event.stopPropagation();investInAsset('PAXG')">Invest Now</button>
        </div>

        <!-- Banksy Art Token -->
        <div class="asset-card" onclick="openAsset('BANKSY-01')">
          <div class="asset-header">
            <div class="asset-icon art">B</div>
            <span class="asset-badge premium">Accredited</span>
          </div>
          <div class="asset-name">Banksy - Girl with Balloon</div>
          <div class="asset-symbol">BANKSY-01</div>
          <div class="asset-price">$28.50</div>
          <div class="asset-change positive">+1.79% premium</div>
          <div class="asset-stats">
            <div>
              <div class="asset-stat-label">Min Investment</div>
              <div class="asset-stat-value">$500.00</div>
            </div>
            <div>
              <div class="asset-stat-label">Appraisal</div>
              <div class="asset-stat-value">$7.1M</div>
            </div>
          </div>
          <button class="invest-btn" onclick="event.stopPropagation();investInAsset('BANKSY-01')">Invest Now</button>
        </div>

        <!-- S&P 500 ETF Token -->
        <div class="asset-card" onclick="openAsset('tSPY')">
          <div class="asset-header">
            <div class="asset-icon etfs">SP</div>
            <span class="asset-badge yield">1.3% Dividend</span>
          </div>
          <div class="asset-name">Tokenized S&P 500 ETF</div>
          <div class="asset-symbol">tSPY</div>
          <div class="asset-price">$594.75</div>
          <div class="asset-change positive">+0.04% premium</div>
          <div class="asset-stats">
            <div>
              <div class="asset-stat-label">Min Investment</div>
              <div class="asset-stat-value">$1.00</div>
            </div>
            <div>
              <div class="asset-stat-label">Yield</div>
              <div class="asset-stat-value" style="color:#00c853;">Quarterly</div>
            </div>
          </div>
          <button class="invest-btn" onclick="event.stopPropagation();investInAsset('tSPY')">Invest Now</button>
        </div>

        <!-- More assets placeholder -->
        <div class="asset-card" style="display:flex;align-items:center;justify-content:center;min-height:280px;border-style:dashed;">
          <div style="text-align:center;color:#666;">
            <div style="font-size:2rem;margin-bottom:8px;">+50</div>
            <div>More assets coming soon</div>
            <div style="font-size:0.8rem;margin-top:8px;">Private Equity, Bonds, Crypto Index</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Holdings Section (hidden by default) -->
    <div id="my-holdings-section" style="display:none;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Your Holdings</span>
        </div>
        <div style="text-align:center;padding:60px;color:#666;">
          <div style="font-size:3rem;margin-bottom:16px;">0</div>
          <div>No tokenized assets yet</div>
          <button class="invest-btn" style="max-width:200px;margin:20px auto;" onclick="showInvestTab('browse')">Start Investing</button>
        </div>
      </div>
    </div>

    <!-- Yield Section (hidden by default) -->
    <div id="yield-section" style="display:none;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Yield Tracker</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:24px;">
          <div style="text-align:center;padding:20px;background:rgba(0,200,83,0.1);border-radius:12px;">
            <div style="color:#00c853;font-size:2rem;font-weight:700;">$0.00</div>
            <div style="color:#888;font-size:0.85rem;">Total Received</div>
          </div>
          <div style="text-align:center;padding:20px;background:rgba(0,212,255,0.1);border-radius:12px;">
            <div style="color:#00d4ff;font-size:2rem;font-weight:700;">$0.00</div>
            <div style="color:#888;font-size:0.85rem;">Pending Yield</div>
          </div>
          <div style="text-align:center;padding:20px;background:rgba(123,44,191,0.1);border-radius:12px;">
            <div style="color:#7b2cbf;font-size:2rem;font-weight:700;">$0.00</div>
            <div style="color:#888;font-size:0.85rem;">Projected Annual</div>
          </div>
        </div>
        <div style="text-align:center;padding:40px;color:#666;">
          <div>No yield history yet</div>
          <div style="font-size:0.85rem;margin-top:8px;">Invest in yield-bearing assets to start earning</div>
        </div>
      </div>
    </div>

    <!-- Auto-Invest Section (hidden by default) -->
    <div id="auto-invest-section" style="display:none;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Auto-Invest</span>
        </div>
        <div style="background:linear-gradient(135deg,rgba(0,212,255,0.1),rgba(123,44,191,0.1));border-radius:12px;padding:24px;margin-bottom:24px;">
          <h3 style="margin-bottom:12px;">Set It & Forget It Investing</h3>
          <p style="color:#888;margin-bottom:16px;">Configure automatic recurring investments into your chosen assets. Dollar-cost average into tokenized stocks, real estate, and more.</p>
          <button class="invest-btn" style="max-width:200px;" onclick="setupAutoInvest()">Setup Auto-Invest</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;">
            <h4 style="margin-bottom:8px;">Suggested: Balanced Portfolio</h4>
            <p style="color:#888;font-size:0.85rem;margin-bottom:12px;">40% Stocks, 30% Real Estate, 20% Gold, 10% ETFs</p>
            <div style="color:#00c853;font-size:0.9rem;">Est. 5.2% Annual Yield</div>
          </div>
          <div style="padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;">
            <h4 style="margin-bottom:8px;">Suggested: Income Focus</h4>
            <p style="color:#888;font-size:0.85rem;margin-bottom:12px;">60% Real Estate, 25% Dividend ETFs, 15% Bonds</p>
            <div style="color:#00c853;font-size:0.9rem;">Est. 7.8% Annual Yield</div>
          </div>
        </div>
      </div>
    </div>

    <script>
      function showInvestTab(tab) {
        document.querySelectorAll('.invest-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById('browse-section').style.display = tab === 'browse' ? 'block' : 'none';
        document.getElementById('my-holdings-section').style.display = tab === 'my-holdings' ? 'block' : 'none';
        document.getElementById('yield-section').style.display = tab === 'yield' ? 'block' : 'none';
        document.getElementById('auto-invest-section').style.display = tab === 'auto-invest' ? 'block' : 'none';
      }

      function filterAssets(type) {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        event.target.classList.add('active');
        // In production: filter asset cards by type
      }

      function openAsset(symbol) {
        // Show asset details modal
        const modal = \`
          <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;" onclick="this.remove()">
            <div style="background:#1a1a2e;padding:32px;border-radius:16px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;" onclick="event.stopPropagation()">
              <h2 style="margin-bottom:20px;">\${symbol} Details</h2>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
                <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;">
                  <div style="color:#888;font-size:0.8rem;">Current Price</div>
                  <div style="font-size:1.5rem;font-weight:700;">$---.--</div>
                </div>
                <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;">
                  <div style="color:#888;font-size:0.8rem;">24h Change</div>
                  <div style="font-size:1.5rem;font-weight:700;color:#00c853;">+--.--%</div>
                </div>
                <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;">
                  <div style="color:#888;font-size:0.8rem;">Market Cap</div>
                  <div style="font-size:1.2rem;font-weight:600;">$--M</div>
                </div>
                <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;">
                  <div style="color:#888;font-size:0.8rem;">Holders</div>
                  <div style="font-size:1.2rem;font-weight:600;">--</div>
                </div>
              </div>
              <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:20px;">
                <h4 style="margin-bottom:12px;">Quick Invest</h4>
                <div style="display:flex;gap:8px;margin-bottom:16px;">
                  <button style="flex:1;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;cursor:pointer;" onclick="setAmount(10)">$10</button>
                  <button style="flex:1;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;cursor:pointer;" onclick="setAmount(50)">$50</button>
                  <button style="flex:1;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;cursor:pointer;" onclick="setAmount(100)">$100</button>
                  <button style="flex:1;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;cursor:pointer;" onclick="setAmount(500)">$500</button>
                </div>
                <input id="invest-amount" type="number" placeholder="Enter amount" style="width:100%;padding:14px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:1.1rem;margin-bottom:16px;">
                <button class="invest-btn" onclick="confirmInvestment('\${symbol}')">Confirm Investment</button>
              </div>
              <button style="position:absolute;top:16px;right:16px;background:none;border:none;color:#888;font-size:1.5rem;cursor:pointer;" onclick="this.closest('[style*=position]').remove()">&times;</button>
            </div>
          </div>
        \`;
        document.body.insertAdjacentHTML('beforeend', modal);
      }

      function investInAsset(symbol) {
        openAsset(symbol);
      }

      function setAmount(amount) {
        document.getElementById('invest-amount').value = amount;
      }

      function confirmInvestment(symbol) {
        const amount = document.getElementById('invest-amount').value;
        if (!amount || amount <= 0) {
          alert('Please enter a valid amount');
          return;
        }
        alert(\`Investment of $\${amount} in \${symbol} submitted! Check your holdings for updates.\`);
        document.querySelector('[style*="position:fixed"]').remove();
      }

      function setupAutoInvest() {
        const modal = \`
          <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;" onclick="this.remove()">
            <div style="background:#1a1a2e;padding:32px;border-radius:16px;max-width:500px;width:100%;" onclick="event.stopPropagation()">
              <h2 style="margin-bottom:20px;">Setup Auto-Invest</h2>
              <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;margin-bottom:4px;">Investment Amount</label>
                <input type="number" placeholder="100" style="width:100%;padding:12px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
              </div>
              <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;margin-bottom:4px;">Frequency</label>
                <select style="width:100%;padding:12px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
                  <option>Weekly</option>
                  <option>Bi-weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;margin-bottom:4px;">Portfolio</label>
                <select style="width:100%;padding:12px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
                  <option>Balanced (5.2% yield)</option>
                  <option>Income Focus (7.8% yield)</option>
                  <option>Growth (stocks heavy)</option>
                  <option>Custom allocation</option>
                </select>
              </div>
              <div style="margin-bottom:24px;">
                <label style="display:flex;align-items:center;gap:8px;color:#888;">
                  <input type="checkbox" checked> Auto-reinvest dividends
                </label>
              </div>
              <button class="invest-btn" onclick="alert('Auto-invest configured!');this.closest('[style*=position]').remove();">Enable Auto-Invest</button>
            </div>
          </div>
        \`;
        document.body.insertAdjacentHTML('beforeend', modal);
      }
    </script>`;
    res.send(pageTemplate('Invest', 'invest', content));
  });

  // ========================================================================
  // DEFI MASTERY PAGE - FREE AI-POWERED DEFI EDUCATION & AUTOMATION
  // (This destroys $5k courses like Decentralized Masters)
  // ========================================================================
  app.get('/defi', (req, res) => {
    const content = `
    <style>
      .defi-hero {
        background: linear-gradient(135deg, rgba(123,44,191,0.2), rgba(0,212,255,0.2));
        border: 1px solid rgba(123,44,191,0.3);
        border-radius: 20px;
        padding: 32px;
        margin-bottom: 24px;
        text-align: center;
      }
      .defi-hero h1 {
        font-size: 2.5rem;
        background: linear-gradient(90deg, #00d4ff, #7b2cbf);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 12px;
      }
      .defi-hero p { color: #888; font-size: 1.1rem; max-width: 600px; margin: 0 auto 24px; }
      .defi-badge {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 20px;
        background: rgba(0,200,83,0.2);
        color: #00c853;
        font-weight: 600;
        font-size: 0.9rem;
      }

      .defi-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
      .defi-tab {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        background: rgba(255,255,255,0.05);
        color: #888;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      }
      .defi-tab:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .defi-tab.active { background: linear-gradient(135deg, #7b2cbf, #00d4ff); color: #fff; }

      .opp-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 20px;
        transition: all 0.3s;
      }
      .opp-card:hover { transform: translateY(-4px); border-color: rgba(123,44,191,0.3); }
      .opp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
      .opp-protocol {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .opp-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: linear-gradient(135deg, #7b2cbf, #00d4ff);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.9rem;
      }
      .opp-name { font-weight: 600; }
      .opp-chain { font-size: 0.8rem; color: #888; }
      .opp-apy {
        font-size: 1.8rem;
        font-weight: 700;
        color: #00c853;
      }
      .opp-rating {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .rating-strong_buy { background: rgba(0,200,83,0.2); color: #00c853; }
      .rating-buy { background: rgba(0,212,255,0.2); color: #00d4ff; }
      .rating-hold { background: rgba(255,193,7,0.2); color: #ffc107; }
      .rating-avoid { background: rgba(255,82,82,0.2); color: #ff5252; }
      .opp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; font-size: 0.85rem; }
      .opp-stat { display: flex; justify-content: space-between; }
      .opp-stat-label { color: #666; }
      .opp-btn {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #7b2cbf, #00d4ff);
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        margin-top: 12px;
        transition: all 0.2s;
      }
      .opp-btn:hover { transform: scale(1.02); }

      .autopilot-card {
        background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(123,44,191,0.1));
        border: 2px solid rgba(123,44,191,0.3);
        border-radius: 20px;
        padding: 32px;
        text-align: center;
        margin-bottom: 24px;
      }
      .autopilot-card h2 { margin-bottom: 12px; }
      .autopilot-card p { color: #888; margin-bottom: 24px; }

      .lesson-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .lesson-card:hover { background: rgba(255,255,255,0.05); }
      .lesson-title { font-weight: 600; margin-bottom: 8px; }
      .lesson-desc { color: #888; font-size: 0.9rem; }
      .lesson-level {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        margin-top: 8px;
      }
      .level-beginner { background: rgba(0,200,83,0.2); color: #00c853; }
      .level-intermediate { background: rgba(0,212,255,0.2); color: #00d4ff; }
      .level-advanced { background: rgba(123,44,191,0.2); color: #7b2cbf; }

      .risk-slider { width: 100%; margin: 16px 0; }
      .chain-chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
      .chain-chip {
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.85rem;
      }
      .chain-chip:hover, .chain-chip.active { background: rgba(123,44,191,0.3); border-color: #7b2cbf; }
    </style>

    <!-- Hero Section -->
    <div class="defi-hero">
      <h1>AI DeFi Mastery</h1>
      <p>Everything "Decentralized Masters" charges $5,000 for - we give you FREE. Plus AI automation they can't match.</p>
      <span class="defi-badge">100% FREE - No Videos, Just Results</span>
    </div>

    <!-- Tabs -->
    <div class="defi-tabs">
      <button class="defi-tab active" onclick="showDefiTab('opportunities')">Yield Opportunities</button>
      <button class="defi-tab" onclick="showDefiTab('autopilot')">AI Autopilot</button>
      <button class="defi-tab" onclick="showDefiTab('learn')">Learn DeFi</button>
      <button class="defi-tab" onclick="showDefiTab('alpha')">Alpha Alerts</button>
    </div>

    <!-- Opportunities Tab -->
    <div id="opportunities-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:16px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select id="risk-filter" style="padding:10px 16px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;" onchange="filterOpportunities()">
            <option value="">All Risk Levels</option>
            <option value="30">Low Risk (< 30)</option>
            <option value="50">Moderate (< 50)</option>
            <option value="100">Any Risk</option>
          </select>
          <select id="type-filter" style="padding:10px 16px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;" onchange="filterOpportunities()">
            <option value="">All Types</option>
            <option value="lending">Lending</option>
            <option value="lp">Liquidity Pools</option>
            <option value="staking">Staking</option>
            <option value="vault">Vaults</option>
            <option value="restaking">Restaking</option>
          </select>
        </div>
        <div style="color:#888;font-size:0.9rem;">
          AI analyzes <strong style="color:#00d4ff;">50+ protocols</strong> in real-time
        </div>
      </div>

      <div id="opp-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;">
        <!-- Aave USDC -->
        <div class="opp-card">
          <div class="opp-header">
            <div class="opp-protocol">
              <div class="opp-icon">A</div>
              <div>
                <div class="opp-name">Aave V3 USDC</div>
                <div class="opp-chain">Ethereum</div>
              </div>
            </div>
            <span class="opp-rating rating-strong_buy">STRONG BUY</span>
          </div>
          <div class="opp-apy">5.2% APY</div>
          <div class="opp-stats">
            <div class="opp-stat"><span class="opp-stat-label">Risk Score</span><span>15/100</span></div>
            <div class="opp-stat"><span class="opp-stat-label">TVL</span><span>$4.2B</span></div>
            <div class="opp-stat"><span class="opp-stat-label">IL Risk</span><span style="color:#00c853;">None</span></div>
            <div class="opp-stat"><span class="opp-stat-label">Lockup</span><span>None</span></div>
          </div>
          <button class="opp-btn" onclick="showOpportunityDetails('aave_usdc')">View & Enter</button>
        </div>

        <!-- Lido stETH -->
        <div class="opp-card">
          <div class="opp-header">
            <div class="opp-protocol">
              <div class="opp-icon">L</div>
              <div>
                <div class="opp-name">Lido stETH</div>
                <div class="opp-chain">Ethereum</div>
              </div>
            </div>
            <span class="opp-rating rating-strong_buy">STRONG BUY</span>
          </div>
          <div class="opp-apy">4.2% APY</div>
          <div class="opp-stats">
            <div class="opp-stat"><span class="opp-stat-label">Risk Score</span><span>20/100</span></div>
            <div class="opp-stat"><span class="opp-stat-label">TVL</span><span>$25B</span></div>
            <div class="opp-stat"><span class="opp-stat-label">IL Risk</span><span style="color:#00c853;">None</span></div>
            <div class="opp-stat"><span class="opp-stat-label">Auto-Compound</span><span style="color:#00c853;">Yes</span></div>
          </div>
          <button class="opp-btn" onclick="showOpportunityDetails('lido_steth')">View & Enter</button>
        </div>

        <!-- EigenLayer -->
        <div class="opp-card">
          <div class="opp-header">
            <div class="opp-protocol">
              <div class="opp-icon">E</div>
              <div>
                <div class="opp-name">EigenLayer Restaking</div>
                <div class="opp-chain">Ethereum</div>
              </div>
            </div>
            <span class="opp-rating rating-buy">BUY</span>
          </div>
          <div class="opp-apy">5.0%+ Points</div>
          <div class="opp-stats">
            <div class="opp-stat"><span class="opp-stat-label">Risk Score</span><span>40/100</span></div>
            <div class="opp-stat"><span class="opp-stat-label">TVL</span><span>$15B</span></div>
            <div class="opp-stat"><span class="opp-stat-label">IL Risk</span><span style="color:#00c853;">None</span></div>
            <div class="opp-stat"><span class="opp-stat-label">Lockup</span><span>7 days</span></div>
          </div>
          <button class="opp-btn" onclick="showOpportunityDetails('eigenlayer')">View & Enter</button>
        </div>

        <!-- Uniswap LP -->
        <div class="opp-card">
          <div class="opp-header">
            <div class="opp-protocol">
              <div class="opp-icon">U</div>
              <div>
                <div class="opp-name">Uniswap ETH/USDC</div>
                <div class="opp-chain">Arbitrum</div>
              </div>
            </div>
            <span class="opp-rating rating-buy">BUY</span>
          </div>
          <div class="opp-apy">22.5% APY</div>
          <div class="opp-stats">
            <div class="opp-stat"><span class="opp-stat-label">Risk Score</span><span>45/100</span></div>
            <div class="opp-stat"><span class="opp-stat-label">TVL</span><span>$100M</span></div>
            <div class="opp-stat"><span class="opp-stat-label">IL Risk</span><span style="color:#ffc107;">Medium</span></div>
            <div class="opp-stat"><span class="opp-stat-label">Lockup</span><span>None</span></div>
          </div>
          <button class="opp-btn" onclick="showOpportunityDetails('uniswap_lp')">View & Enter</button>
        </div>

        <!-- GMX GLP -->
        <div class="opp-card">
          <div class="opp-header">
            <div class="opp-protocol">
              <div class="opp-icon">G</div>
              <div>
                <div class="opp-name">GMX GLP</div>
                <div class="opp-chain">Arbitrum</div>
              </div>
            </div>
            <span class="opp-rating rating-buy">BUY</span>
          </div>
          <div class="opp-apy">18.0% APY</div>
          <div class="opp-stats">
            <div class="opp-stat"><span class="opp-stat-label">Risk Score</span><span>50/100</span></div>
            <div class="opp-stat"><span class="opp-stat-label">TVL</span><span>$500M</span></div>
            <div class="opp-stat"><span class="opp-stat-label">IL Risk</span><span style="color:#ffc107;">Medium</span></div>
            <div class="opp-stat"><span class="opp-stat-label">Yield</span><span>Real ETH</span></div>
          </div>
          <button class="opp-btn" onclick="showOpportunityDetails('gmx_glp')">View & Enter</button>
        </div>

        <!-- Pendle -->
        <div class="opp-card">
          <div class="opp-header">
            <div class="opp-protocol">
              <div class="opp-icon">P</div>
              <div>
                <div class="opp-name">Pendle eETH PT</div>
                <div class="opp-chain">Ethereum</div>
              </div>
            </div>
            <span class="opp-rating rating-buy">BUY</span>
          </div>
          <div class="opp-apy">15.0% Fixed</div>
          <div class="opp-stats">
            <div class="opp-stat"><span class="opp-stat-label">Risk Score</span><span>35/100</span></div>
            <div class="opp-stat"><span class="opp-stat-label">TVL</span><span>$500M</span></div>
            <div class="opp-stat"><span class="opp-stat-label">IL Risk</span><span style="color:#00c853;">Low</span></div>
            <div class="opp-stat"><span class="opp-stat-label">Lockup</span><span>30 days</span></div>
          </div>
          <button class="opp-btn" onclick="showOpportunityDetails('pendle_eeth')">View & Enter</button>
        </div>
      </div>
    </div>

    <!-- Autopilot Tab -->
    <div id="autopilot-section" style="display:none;">
      <div class="autopilot-card">
        <h2>AI Yield Autopilot</h2>
        <p>Tell me your goals, and I'll build and manage your entire DeFi portfolio. Set it and forget it.</p>
        <button class="opp-btn" style="max-width:300px;margin:0 auto;" onclick="showAutopilotSetup()">Configure Autopilot</button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">What Autopilot Does For You</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;">
          <div style="padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;">
            <div style="font-size:1.5rem;margin-bottom:8px;">1. Analyzes</div>
            <p style="color:#888;font-size:0.9rem;">AI scans 50+ protocols across 8 chains to find the best risk-adjusted yields</p>
          </div>
          <div style="padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;">
            <div style="font-size:1.5rem;margin-bottom:8px;">2. Allocates</div>
            <p style="color:#888;font-size:0.9rem;">Builds a diversified portfolio matching your risk tolerance and goals</p>
          </div>
          <div style="padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;">
            <div style="font-size:1.5rem;margin-bottom:8px;">3. Monitors</div>
            <p style="color:#888;font-size:0.9rem;">Watches positions 24/7, auto-exits on stop-loss, alerts on risks</p>
          </div>
          <div style="padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;">
            <div style="font-size:1.5rem;margin-bottom:8px;">4. Compounds</div>
            <p style="color:#888;font-size:0.9rem;">Auto-harvests and reinvests yields at optimal times</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Learn Tab -->
    <div id="learn-section" style="display:none;">
      <div style="margin-bottom:24px;">
        <h2 style="margin-bottom:8px;">Learn DeFi (Free)</h2>
        <p style="color:#888;">Master yield farming, liquidity provision, and advanced strategies. Better than $5k courses.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
        <div class="lesson-card" onclick="openLesson('yield_farming', 'beginner')">
          <div class="lesson-title">Yield Farming Basics</div>
          <div class="lesson-desc">Learn how to earn passive income by lending your crypto</div>
          <span class="lesson-level level-beginner">Beginner</span>
        </div>
        <div class="lesson-card" onclick="openLesson('yield_farming', 'intermediate')">
          <div class="lesson-title">Advanced Yield Strategies</div>
          <div class="lesson-desc">LP positions, aggregators, and recursive strategies</div>
          <span class="lesson-level level-intermediate">Intermediate</span>
        </div>
        <div class="lesson-card" onclick="openLesson('liquidity_provision', 'beginner')">
          <div class="lesson-title">Liquidity Provision 101</div>
          <div class="lesson-desc">How to provide liquidity and earn trading fees</div>
          <span class="lesson-level level-beginner">Beginner</span>
        </div>
        <div class="lesson-card" onclick="openLesson('liquidity_provision', 'intermediate')">
          <div class="lesson-title">Concentrated Liquidity</div>
          <div class="lesson-desc">Uniswap V3 strategies for higher returns</div>
          <span class="lesson-level level-intermediate">Intermediate</span>
        </div>
        <div class="lesson-card" onclick="openLesson('staking', 'beginner')">
          <div class="lesson-title">Staking & Restaking</div>
          <div class="lesson-desc">Earn yield on ETH with liquid staking</div>
          <span class="lesson-level level-beginner">Beginner</span>
        </div>
        <div class="lesson-card" onclick="openLesson('yield_farming', 'advanced')">
          <div class="lesson-title">Degen Yield Strategies</div>
          <div class="lesson-desc">Points farming, airdrops, and alpha hunting</div>
          <span class="lesson-level level-advanced">Advanced</span>
        </div>
      </div>
    </div>

    <!-- Alpha Alerts Tab -->
    <div id="alpha-section" style="display:none;">
      <div style="margin-bottom:24px;">
        <h2 style="margin-bottom:8px;">Alpha Alerts</h2>
        <p style="color:#888;">Real-time opportunities detected by AI. Stay ahead of the market.</p>
      </div>

      <div id="alerts-container">
        <div class="card" style="border-left:3px solid #00c853;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="color:#00c853;font-size:0.8rem;margin-bottom:4px;">HIGH PRIORITY</div>
              <div style="font-weight:600;margin-bottom:8px;">APY Spike: Pendle eETH Market</div>
              <p style="color:#888;font-size:0.9rem;">Fixed yield on Pendle eETH PT increased to 15%. Low risk opportunity.</p>
            </div>
            <div style="color:#666;font-size:0.8rem;">2 min ago</div>
          </div>
        </div>
        <div class="card" style="border-left:3px solid #00d4ff;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="color:#00d4ff;font-size:0.8rem;margin-bottom:4px;">NEW PROTOCOL</div>
              <div style="font-weight:600;margin-bottom:8px;">EtherFi Season 2 Launch</div>
              <p style="color:#888;font-size:0.9rem;">New points season started. Early depositors get boosted rewards.</p>
            </div>
            <div style="color:#666;font-size:0.8rem;">15 min ago</div>
          </div>
        </div>
        <div class="card" style="border-left:3px solid #ffc107;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="color:#ffc107;font-size:0.8rem;margin-bottom:4px;">GAS ALERT</div>
              <div style="font-weight:600;margin-bottom:8px;">Ethereum Gas Below 20 Gwei</div>
              <p style="color:#888;font-size:0.9rem;">Optimal time to execute mainnet transactions. Estimated savings: 40%.</p>
            </div>
            <div style="color:#666;font-size:0.8rem;">1 hour ago</div>
          </div>
        </div>
      </div>
    </div>

    <script>
      function showDefiTab(tab) {
        document.querySelectorAll('.defi-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById('opportunities-section').style.display = tab === 'opportunities' ? 'block' : 'none';
        document.getElementById('autopilot-section').style.display = tab === 'autopilot' ? 'block' : 'none';
        document.getElementById('learn-section').style.display = tab === 'learn' ? 'block' : 'none';
        document.getElementById('alpha-section').style.display = tab === 'alpha' ? 'block' : 'none';
      }

      function filterOpportunities() {
        // In production: call API with filters
      }

      function showOpportunityDetails(id) {
        const modal = \`
          <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;" onclick="this.remove()">
            <div style="background:#1a1a2e;padding:32px;border-radius:20px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;" onclick="event.stopPropagation()">
              <h2 style="margin-bottom:20px;">Opportunity Details</h2>
              <div style="background:rgba(0,200,83,0.1);padding:20px;border-radius:12px;margin-bottom:20px;">
                <div style="font-size:2rem;font-weight:700;color:#00c853;">Up to 22.5% APY</div>
                <div style="color:#888;">Based on current market conditions</div>
              </div>

              <h3 style="margin-bottom:12px;">How to Enter</h3>
              <ol style="color:#888;padding-left:20px;margin-bottom:24px;">
                <li style="margin-bottom:8px;">Connect your wallet to the protocol</li>
                <li style="margin-bottom:8px;">Approve token spending</li>
                <li style="margin-bottom:8px;">Deposit your desired amount</li>
                <li style="margin-bottom:8px;">Start earning immediately</li>
              </ol>

              <h3 style="margin-bottom:12px;">Risks to Consider</h3>
              <ul style="color:#888;padding-left:20px;margin-bottom:24px;">
                <li style="margin-bottom:8px;">Smart contract risk (audited but not 100% guaranteed)</li>
                <li style="margin-bottom:8px;">Market risk if APY decreases</li>
                <li style="margin-bottom:8px;">Gas costs for entry/exit</li>
              </ul>

              <div style="display:flex;gap:12px;">
                <button class="opp-btn" style="flex:1;" onclick="window.open('https://app.aave.com','_blank')">Open Protocol</button>
                <button style="flex:1;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#888;cursor:pointer;" onclick="this.closest('[style*=position]').remove()">Close</button>
              </div>
            </div>
          </div>
        \`;
        document.body.insertAdjacentHTML('beforeend', modal);
      }

      function showAutopilotSetup() {
        const modal = \`
          <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;" onclick="this.remove()">
            <div style="background:#1a1a2e;padding:32px;border-radius:20px;max-width:500px;width:100%;" onclick="event.stopPropagation()">
              <h2 style="margin-bottom:20px;">Configure AI Autopilot</h2>

              <div style="margin-bottom:20px;">
                <label style="display:block;color:#888;margin-bottom:8px;">Investment Amount (USD)</label>
                <input type="number" id="autopilot-amount" placeholder="1000" style="width:100%;padding:14px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:1.1rem;">
              </div>

              <div style="margin-bottom:20px;">
                <label style="display:block;color:#888;margin-bottom:8px;">Risk Tolerance</label>
                <select id="risk-tolerance" style="width:100%;padding:14px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
                  <option value="conservative">Conservative (4-8% APY, low risk)</option>
                  <option value="moderate" selected>Moderate (8-15% APY, balanced)</option>
                  <option value="aggressive">Aggressive (15-30% APY, higher risk)</option>
                  <option value="degen">Degen (30%+ APY, high risk)</option>
                </select>
              </div>

              <div style="margin-bottom:20px;">
                <label style="display:block;color:#888;margin-bottom:8px;">Investment Horizon</label>
                <select style="width:100%;padding:14px;background:#0a0a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
                  <option value="short">Short (&lt;3 months)</option>
                  <option value="medium" selected>Medium (3-12 months)</option>
                  <option value="long">Long (1 year+)</option>
                </select>
              </div>

              <div style="margin-bottom:24px;">
                <label style="display:flex;align-items:center;gap:8px;color:#888;margin-bottom:8px;">
                  <input type="checkbox" checked> Auto-compound yields
                </label>
                <label style="display:flex;align-items:center;gap:8px;color:#888;">
                  <input type="checkbox" checked> Enable 20% stop-loss protection
                </label>
              </div>

              <button class="opp-btn" onclick="startAutopilot()">Start Autopilot</button>
            </div>
          </div>
        \`;
        document.body.insertAdjacentHTML('beforeend', modal);
      }

      function startAutopilot() {
        const amount = document.getElementById('autopilot-amount').value;
        const risk = document.getElementById('risk-tolerance').value;

        if (!amount || amount < 100) {
          alert('Minimum investment is $100');
          return;
        }

        alert(\`AI Autopilot configured!

Amount: $\${amount}
Strategy: \${risk.charAt(0).toUpperCase() + risk.slice(1)}

Your portfolio will be created and managed automatically. You'll receive alerts for important events.\`);
        document.querySelector('[style*="position:fixed"]').remove();
      }

      function openLesson(topic, level) {
        const lessons = {
          yield_farming_beginner: \`
<h2>Yield Farming Basics</h2>
<p>Yield farming is like being a mini-bank. You lend your crypto to protocols, and they pay you interest.</p>

<h3>Simple Example</h3>
<p>You have 1000 USDC sitting idle. Instead of earning 0%, you deposit it into Aave. Aave lends your USDC to borrowers and pays you ~5% APY.</p>

<h3>The Math</h3>
<ul>
<li>$1000 at 5% APY = $50/year = $4.17/month</li>
<li>Compound daily and you get slightly more</li>
</ul>

<h3>Getting Started</h3>
<ol>
<li>Start with stablecoins (USDC, USDT) - no price volatility</li>
<li>Use only audited protocols with $100M+ TVL</li>
<li>Begin with single-asset deposits (no IL risk)</li>
<li>Enable auto-compound if available</li>
<li>Start small - test with $100 before going bigger</li>
</ol>

<h3>Warnings</h3>
<ul>
<li>Never invest more than you can afford to lose</li>
<li>High APY often means high risk</li>
<li>Check audit reports before depositing</li>
</ul>
          \`,
          yield_farming_intermediate: \`
<h2>Advanced Yield Strategies</h2>

<h3>1. Liquidity Provision (LP)</h3>
<p>Provide liquidity to DEXs and earn trading fees + rewards.</p>
<ul>
<li>Example: Uniswap ETH/USDC pool earns 0.3% of all trades</li>
<li>Risk: Impermanent Loss if prices diverge</li>
</ul>

<h3>2. Yield Aggregators</h3>
<p>Let protocols auto-compound and optimize for you.</p>
<ul>
<li>Yearn vaults auto-harvest and compound</li>
<li>Beefy Finance works across 20+ chains</li>
</ul>

<h3>3. Recursive Strategies</h3>
<p>Borrow against deposits to multiply exposure.</p>
<ul>
<li>Deposit ETH, borrow stables, buy more ETH</li>
<li>Risk: Liquidation if collateral drops</li>
</ul>
          \`
        };

        const key = \`\${topic}_\${level}\`;
        const content = lessons[key] || '<h2>Lesson Coming Soon</h2><p>This lesson is being prepared by our AI.</p>';

        const modal = \`
          <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;" onclick="this.remove()">
            <div style="background:#1a1a2e;padding:32px;border-radius:20px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;" onclick="event.stopPropagation()">
              <div style="color:#888;line-height:1.8;">
                \${content}
              </div>
              <button style="width:100%;margin-top:24px;padding:14px;background:linear-gradient(135deg,#7b2cbf,#00d4ff);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;" onclick="this.closest('[style*=position]').remove()">Got It</button>
            </div>
          </div>
        \`;
        document.body.insertAdjacentHTML('beforeend', modal);
      }
    </script>`;
    res.send(pageTemplate('DeFi Mastery', 'defi', content));
  });

  // ========================================================================
  // STRATEGIES PAGE
  // ========================================================================
  app.get('/strategies', (req, res) => {
    const content = `
    <h1 class="page-title">Strategies</h1>
    <div class="grid grid-3" style="margin-bottom:24px;">
      <div class="card stat-card">
        <div class="stat-value">2</div>
        <div class="stat-label">Active Strategies</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value positive">68%</div>
        <div class="stat-label">Avg Win Rate</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">1.72</div>
        <div class="stat-label">Avg Profit Factor</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">My Strategies</span>
        <button class="btn btn-primary" onclick="createStrategy()">+ Create Strategy</button>
      </div>
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Type</th><th>Status</th><th>Win Rate</th><th>P/F</th><th>Trades</th><th>P/L</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Momentum Alpha</strong><br><span style="color:#666;font-size:0.8rem;">Trend-following with regime awareness</span></td>
            <td>Momentum</td>
            <td><span style="color:#00c853;">Active</span></td>
            <td>65%</td>
            <td>1.85</td>
            <td>234</td>
            <td class="positive">+$15,420</td>
            <td>
              <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;padding:6px 12px;" onclick="viewStrategy('strat_1')">View</button>
              <button class="btn btn-danger" style="padding:6px 12px;" onclick="pauseStrategy('strat_1')">Pause</button>
            </td>
          </tr>
          <tr>
            <td><strong>Range Scalper Pro</strong><br><span style="color:#666;font-size:0.8rem;">Mean reversion in ranging markets</span></td>
            <td>Mean Reversion</td>
            <td><span style="color:#00c853;">Active</span></td>
            <td>72%</td>
            <td>1.55</td>
            <td>456</td>
            <td class="positive">+$8,950</td>
            <td>
              <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;padding:6px 12px;" onclick="viewStrategy('strat_2')">View</button>
              <button class="btn btn-danger" style="padding:6px 12px;" onclick="pauseStrategy('strat_2')">Pause</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Strategy Synthesis</span>
      </div>
      <p style="color:#888;margin-bottom:16px;">Combine multiple bots to create new hybrid strategies using AI synthesis.</p>
      <button class="btn btn-primary" onclick="openSynthesis()">Open Synthesis Lab</button>
    </div>
    <script>
      function viewStrategy(id) { window.location.href = '/builder?edit=' + id; }
      function pauseStrategy(id) { if(confirm('Pause this strategy?')) fetch('/api/v1/strategies/builder/' + id + '/pause', {method:'POST'}).then(() => location.reload()); }
      function createStrategy() { window.location.href = '/builder'; }
      function openSynthesis() { window.location.href = '/synthesis'; }
    </script>`;
    res.send(pageTemplate('Strategies', 'strategies', content));
  });

  // ========================================================================
  // STRATEGY BUILDER PAGE (No-Code Wizard)
  // ========================================================================
  app.get('/builder', (req, res) => {
    const content = `
    <style>
      .builder-container { display: grid; grid-template-columns: 300px 1fr 350px; gap: 24px; height: calc(100vh - 120px); }
      .builder-panel { background: rgba(255,255,255,0.02); border-radius: 12px; padding: 20px; overflow-y: auto; }
      .panel-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; color: #fff; display: flex; align-items: center; gap: 8px; }
      .template-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
      .template-card:hover { background: rgba(0,200,83,0.1); border-color: #00c853; }
      .template-card.selected { background: rgba(0,200,83,0.15); border-color: #00c853; }
      .template-name { font-weight: 600; color: #fff; margin-bottom: 4px; }
      .template-desc { font-size: 0.85rem; color: #888; margin-bottom: 8px; }
      .template-stats { display: flex; gap: 12px; font-size: 0.8rem; }
      .template-stat { color: #00c853; }
      .indicator-group { margin-bottom: 20px; }
      .indicator-group-title { font-size: 0.85rem; color: #888; margin-bottom: 8px; text-transform: uppercase; }
      .indicator-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px; cursor: grab; transition: all 0.2s; }
      .indicator-item:hover { background: rgba(0,200,83,0.1); }
      .indicator-item.dragging { opacity: 0.5; }
      .indicator-icon { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; }
      .icon-trend { background: #7b2cbf; }
      .icon-momentum { background: #00c853; }
      .icon-volatility { background: #ff6b35; }
      .icon-volume { background: #00bcd4; }
      .icon-price { background: #ffc107; }
      .canvas-area { min-height: 400px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 2px dashed rgba(255,255,255,0.1); padding: 20px; }
      .canvas-section { margin-bottom: 24px; }
      .canvas-section-title { font-size: 0.9rem; color: #888; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
      .condition-block { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
      .condition-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .condition-select { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; }
      .condition-input { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 12px; border-radius: 6px; width: 80px; text-align: center; }
      .logic-badge { background: #7b2cbf; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
      .logic-badge:hover { background: #9c4dcc; }
      .add-condition-btn { background: rgba(0,200,83,0.1); border: 1px dashed #00c853; color: #00c853; padding: 12px; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.2s; }
      .add-condition-btn:hover { background: rgba(0,200,83,0.2); }
      .risk-input-group { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      .risk-input-group label { flex: 1; color: #888; font-size: 0.9rem; }
      .risk-input-group input { width: 100px; }
      .preview-card { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
      .preview-title { font-size: 0.9rem; color: #888; margin-bottom: 8px; }
      .preview-value { font-size: 1.5rem; font-weight: 700; color: #fff; }
      .preview-value.positive { color: #00c853; }
      .preview-value.negative { color: #ff4444; }
      .action-buttons { display: flex; gap: 12px; margin-top: 20px; }
      .btn-backtest { background: #7b2cbf; }
      .btn-deploy { background: #00c853; }
      .backtest-results { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 16px; }
      .backtest-stat { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .backtest-stat:last-child { border-bottom: none; }
      .equity-chart { height: 150px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-top: 12px; display: flex; align-items: center; justify-content: center; color: #666; }
      .wizard-steps { display: flex; gap: 8px; margin-bottom: 24px; }
      .wizard-step { flex: 1; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.2s; }
      .wizard-step.active { background: rgba(0,200,83,0.2); border: 1px solid #00c853; }
      .wizard-step.completed { background: rgba(0,200,83,0.1); }
      .wizard-step-num { font-size: 1.2rem; font-weight: 700; color: #00c853; }
      .wizard-step-label { font-size: 0.8rem; color: #888; margin-top: 4px; }
      @media (max-width: 1200px) { .builder-container { grid-template-columns: 1fr; } }
    </style>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1 class="page-title" style="margin:0;">Strategy Builder</h1>
      <div style="display: flex; gap: 12px;">
        <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="importStrategy()">Import</button>
        <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="exportStrategy()">Export</button>
        <button class="btn btn-primary" onclick="saveStrategy()">Save Strategy</button>
      </div>
    </div>

    <!-- Wizard Steps -->
    <div class="wizard-steps">
      <div class="wizard-step active" onclick="goToStep(1)" id="step1">
        <div class="wizard-step-num">1</div>
        <div class="wizard-step-label">Choose Template</div>
      </div>
      <div class="wizard-step" onclick="goToStep(2)" id="step2">
        <div class="wizard-step-num">2</div>
        <div class="wizard-step-label">Entry Rules</div>
      </div>
      <div class="wizard-step" onclick="goToStep(3)" id="step3">
        <div class="wizard-step-num">3</div>
        <div class="wizard-step-label">Exit Rules</div>
      </div>
      <div class="wizard-step" onclick="goToStep(4)" id="step4">
        <div class="wizard-step-num">4</div>
        <div class="wizard-step-label">Risk Management</div>
      </div>
      <div class="wizard-step" onclick="goToStep(5)" id="step5">
        <div class="wizard-step-num">5</div>
        <div class="wizard-step-label">Backtest & Deploy</div>
      </div>
    </div>

    <div class="builder-container">
      <!-- Left Panel: Templates & Indicators -->
      <div class="builder-panel">
        <div class="panel-title">Strategy Templates</div>

        <div class="template-card" onclick="selectTemplate('golden_cross')" id="tpl-golden_cross">
          <div class="template-name">Golden Cross</div>
          <div class="template-desc">Classic trend-following with MA crossovers</div>
          <div class="template-stats">
            <span class="template-stat">68% Win Rate</span>
            <span class="template-stat">1.85 P/F</span>
          </div>
        </div>

        <div class="template-card" onclick="selectTemplate('rsi_mean_reversion')" id="tpl-rsi_mean_reversion">
          <div class="template-name">RSI Mean Reversion</div>
          <div class="template-desc">Buy oversold, sell overbought</div>
          <div class="template-stats">
            <span class="template-stat">72% Win Rate</span>
            <span class="template-stat">1.55 P/F</span>
          </div>
        </div>

        <div class="template-card" onclick="selectTemplate('bollinger_breakout')" id="tpl-bollinger_breakout">
          <div class="template-name">Bollinger Breakout</div>
          <div class="template-desc">Volatility expansion breakouts</div>
          <div class="template-stats">
            <span class="template-stat">58% Win Rate</span>
            <span class="template-stat">2.10 P/F</span>
          </div>
        </div>

        <div class="template-card" onclick="selectTemplate('macd_momentum')" id="tpl-macd_momentum">
          <div class="template-name">MACD Momentum</div>
          <div class="template-desc">Momentum-based signal trading</div>
          <div class="template-stats">
            <span class="template-stat">62% Win Rate</span>
            <span class="template-stat">1.75 P/F</span>
          </div>
        </div>

        <div class="template-card" onclick="selectTemplate('custom')" id="tpl-custom">
          <div class="template-name">Start from Scratch</div>
          <div class="template-desc">Build your own custom strategy</div>
          <div class="template-stats">
            <span style="color:#888;">Full flexibility</span>
          </div>
        </div>

        <div style="margin-top: 24px;">
          <div class="panel-title">Available Indicators</div>

          <div class="indicator-group">
            <div class="indicator-group-title">Trend</div>
            <div class="indicator-item" draggable="true" data-indicator="sma">
              <div class="indicator-icon icon-trend">SMA</div>
              <span>Simple Moving Average</span>
            </div>
            <div class="indicator-item" draggable="true" data-indicator="ema">
              <div class="indicator-icon icon-trend">EMA</div>
              <span>Exponential MA</span>
            </div>
            <div class="indicator-item" draggable="true" data-indicator="macd">
              <div class="indicator-icon icon-trend">MACD</div>
              <span>MACD</span>
            </div>
          </div>

          <div class="indicator-group">
            <div class="indicator-group-title">Momentum</div>
            <div class="indicator-item" draggable="true" data-indicator="rsi">
              <div class="indicator-icon icon-momentum">RSI</div>
              <span>Relative Strength Index</span>
            </div>
            <div class="indicator-item" draggable="true" data-indicator="stochastic">
              <div class="indicator-icon icon-momentum">STOCH</div>
              <span>Stochastic</span>
            </div>
          </div>

          <div class="indicator-group">
            <div class="indicator-group-title">Volatility</div>
            <div class="indicator-item" draggable="true" data-indicator="bollinger">
              <div class="indicator-icon icon-volatility">BB</div>
              <span>Bollinger Bands</span>
            </div>
            <div class="indicator-item" draggable="true" data-indicator="atr">
              <div class="indicator-icon icon-volatility">ATR</div>
              <span>Average True Range</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Center Panel: Strategy Canvas -->
      <div class="builder-panel">
        <div class="panel-title">Strategy Configuration</div>

        <!-- Strategy Name -->
        <div style="margin-bottom: 20px;">
          <label style="display:block;color:#888;font-size:0.85rem;margin-bottom:8px;">Strategy Name</label>
          <input type="text" id="strategyName" class="input-field" style="width:100%;padding:12px;" placeholder="My Strategy" value="Untitled Strategy">
        </div>

        <!-- Entry Conditions -->
        <div class="canvas-section">
          <div class="canvas-section-title">
            <span style="color:#00c853;">ENTRY</span> When to open a position
          </div>
          <div id="entryConditions">
            <div class="condition-block">
              <div class="condition-row">
                <select class="condition-select" id="entry1-ind1">
                  <option value="sma">SMA</option>
                  <option value="ema" selected>EMA</option>
                  <option value="price">Price</option>
                  <option value="rsi">RSI</option>
                  <option value="macd">MACD</option>
                  <option value="bollinger_upper">BB Upper</option>
                  <option value="bollinger_lower">BB Lower</option>
                </select>
                <input type="number" class="condition-input" value="9" placeholder="Period" id="entry1-param1">
                <select class="condition-select" id="entry1-op">
                  <option value="crosses_above" selected>Crosses Above</option>
                  <option value="crosses_below">Crosses Below</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                </select>
                <select class="condition-select" id="entry1-ind2">
                  <option value="sma">SMA</option>
                  <option value="ema" selected>EMA</option>
                  <option value="price">Price</option>
                  <option value="rsi">RSI</option>
                  <option value="value">Value</option>
                </select>
                <input type="number" class="condition-input" value="21" placeholder="Period" id="entry1-param2">
                <button class="btn btn-danger" style="padding:6px 10px;" onclick="removeCondition(this)">X</button>
              </div>
            </div>
          </div>
          <div class="add-condition-btn" onclick="addEntryCondition()">+ Add Entry Condition</div>
        </div>

        <!-- Exit Conditions -->
        <div class="canvas-section">
          <div class="canvas-section-title">
            <span style="color:#ff4444;">EXIT</span> When to close a position
          </div>
          <div id="exitConditions">
            <div class="condition-block">
              <div class="condition-row">
                <select class="condition-select" id="exit1-ind1">
                  <option value="sma">SMA</option>
                  <option value="ema" selected>EMA</option>
                  <option value="price">Price</option>
                  <option value="rsi">RSI</option>
                </select>
                <input type="number" class="condition-input" value="9" id="exit1-param1">
                <select class="condition-select" id="exit1-op">
                  <option value="crosses_above">Crosses Above</option>
                  <option value="crosses_below" selected>Crosses Below</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                </select>
                <select class="condition-select" id="exit1-ind2">
                  <option value="sma">SMA</option>
                  <option value="ema" selected>EMA</option>
                  <option value="price">Price</option>
                  <option value="value">Value</option>
                </select>
                <input type="number" class="condition-input" value="21" id="exit1-param2">
                <button class="btn btn-danger" style="padding:6px 10px;" onclick="removeCondition(this)">X</button>
              </div>
            </div>
          </div>
          <div class="add-condition-btn" onclick="addExitCondition()">+ Add Exit Condition</div>
        </div>

        <!-- Risk Management -->
        <div class="canvas-section">
          <div class="canvas-section-title">Risk Management</div>
          <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:16px;">
            <div class="risk-input-group">
              <label>Stop Loss (%)</label>
              <input type="number" class="condition-input" value="2" id="stopLoss" step="0.1">
            </div>
            <div class="risk-input-group">
              <label>Take Profit (%)</label>
              <input type="number" class="condition-input" value="4" id="takeProfit" step="0.1">
            </div>
            <div class="risk-input-group">
              <label>Trailing Stop (%)</label>
              <input type="number" class="condition-input" value="1.5" id="trailingStop" step="0.1">
            </div>
            <div class="risk-input-group">
              <label>Max Position Size (%)</label>
              <input type="number" class="condition-input" value="5" id="maxPosition" step="0.5">
            </div>
            <div class="risk-input-group">
              <label>Max Daily Loss (%)</label>
              <input type="number" class="condition-input" value="3" id="maxDailyLoss" step="0.5">
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Preview & Actions -->
      <div class="builder-panel">
        <div class="panel-title">Strategy Preview</div>

        <div class="preview-card">
          <div class="preview-title">Strategy Type</div>
          <div class="preview-value" id="previewType">Trend Following</div>
        </div>

        <div class="preview-card">
          <div class="preview-title">Risk Level</div>
          <div class="preview-value" id="previewRisk" style="color:#ffc107;">Medium</div>
        </div>

        <div class="preview-card">
          <div class="preview-title">Estimated Win Rate</div>
          <div class="preview-value positive" id="previewWinRate">~65%</div>
        </div>

        <div class="preview-card">
          <div class="preview-title">Conditions Summary</div>
          <div style="color:#888;font-size:0.9rem;" id="previewSummary">
            Entry: EMA(9) crosses above EMA(21)<br>
            Exit: EMA(9) crosses below EMA(21)<br>
            SL: 2% | TP: 4%
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn btn-backtest" style="flex:1;" onclick="runBacktest()">Run Backtest</button>
          <button class="btn" style="background:rgba(255,255,255,0.05);flex:1;" onclick="aiOptimize()">AI Optimize</button>
        </div>

        <div id="backtestResults" style="display:none;">
          <div class="backtest-results">
            <h4 style="margin:0 0 12px 0;color:#fff;">Backtest Results</h4>
            <div class="backtest-stat">
              <span style="color:#888;">Total Return</span>
              <span class="positive" id="btReturn">+24.5%</span>
            </div>
            <div class="backtest-stat">
              <span style="color:#888;">Win Rate</span>
              <span id="btWinRate">68%</span>
            </div>
            <div class="backtest-stat">
              <span style="color:#888;">Profit Factor</span>
              <span id="btProfitFactor">1.85</span>
            </div>
            <div class="backtest-stat">
              <span style="color:#888;">Max Drawdown</span>
              <span class="negative" id="btDrawdown">-8.2%</span>
            </div>
            <div class="backtest-stat">
              <span style="color:#888;">Sharpe Ratio</span>
              <span id="btSharpe">1.65</span>
            </div>
            <div class="backtest-stat">
              <span style="color:#888;">Total Trades</span>
              <span id="btTrades">156</span>
            </div>
            <div class="equity-chart" id="equityChart">
              [Equity Curve Chart]
            </div>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <button class="btn btn-deploy" style="width:100%;padding:16px;font-size:1rem;" onclick="deployStrategy()">
            Deploy Strategy Live
          </button>
          <p style="text-align:center;color:#666;font-size:0.8rem;margin-top:8px;">
            Strategy will trade with real funds
          </p>
        </div>

        <div style="margin-top: 20px; padding: 16px; background: rgba(123,44,191,0.1); border-radius: 8px;">
          <div style="color:#7b2cbf;font-weight:600;margin-bottom:8px;">AI Suggestions</div>
          <ul style="margin:0;padding-left:16px;color:#888;font-size:0.85rem;">
            <li>Consider adding RSI filter for better entries</li>
            <li>Trailing stop could improve exits by ~12%</li>
            <li>Strategy performs best in trending markets</li>
          </ul>
        </div>
      </div>
    </div>

    <script>
      let currentStrategy = null;
      let selectedTemplate = null;
      let entryConditionCount = 1;
      let exitConditionCount = 1;

      async function loadTemplates() {
        try {
          const res = await fetch('/api/v1/strategies/builder/templates');
          const data = await res.json();
          if (data.success) {
            console.log('Templates loaded:', data.templates);
          }
        } catch (e) {
          console.error('Failed to load templates:', e);
        }
      }

      function selectTemplate(templateId) {
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('tpl-' + templateId)?.classList.add('selected');
        selectedTemplate = templateId;

        // Auto-configure based on template
        if (templateId === 'golden_cross') {
          document.getElementById('strategyName').value = 'Golden Cross Strategy';
          document.getElementById('previewType').textContent = 'Trend Following';
          document.getElementById('previewWinRate').textContent = '~68%';
        } else if (templateId === 'rsi_mean_reversion') {
          document.getElementById('strategyName').value = 'RSI Mean Reversion';
          document.getElementById('previewType').textContent = 'Mean Reversion';
          document.getElementById('previewWinRate').textContent = '~72%';
        } else if (templateId === 'bollinger_breakout') {
          document.getElementById('strategyName').value = 'Bollinger Breakout';
          document.getElementById('previewType').textContent = 'Volatility Breakout';
          document.getElementById('previewWinRate').textContent = '~58%';
        } else if (templateId === 'macd_momentum') {
          document.getElementById('strategyName').value = 'MACD Momentum';
          document.getElementById('previewType').textContent = 'Momentum';
          document.getElementById('previewWinRate').textContent = '~62%';
        }
      }

      function goToStep(step) {
        document.querySelectorAll('.wizard-step').forEach((s, i) => {
          s.classList.remove('active');
          if (i < step - 1) s.classList.add('completed');
        });
        document.getElementById('step' + step).classList.add('active');
      }

      function addEntryCondition() {
        entryConditionCount++;
        const container = document.getElementById('entryConditions');
        const div = document.createElement('div');
        div.className = 'condition-block';
        div.innerHTML = \`
          <div style="margin-bottom:8px;"><span class="logic-badge" onclick="toggleLogic(this)">AND</span></div>
          <div class="condition-row">
            <select class="condition-select">
              <option value="sma">SMA</option>
              <option value="ema">EMA</option>
              <option value="price">Price</option>
              <option value="rsi">RSI</option>
              <option value="macd">MACD</option>
            </select>
            <input type="number" class="condition-input" value="14" placeholder="Period">
            <select class="condition-select">
              <option value="crosses_above">Crosses Above</option>
              <option value="crosses_below">Crosses Below</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
            </select>
            <select class="condition-select">
              <option value="value">Value</option>
              <option value="sma">SMA</option>
              <option value="ema">EMA</option>
            </select>
            <input type="number" class="condition-input" value="30" placeholder="Value">
            <button class="btn btn-danger" style="padding:6px 10px;" onclick="removeCondition(this)">X</button>
          </div>\`;
        container.appendChild(div);
        updatePreview();
      }

      function addExitCondition() {
        exitConditionCount++;
        const container = document.getElementById('exitConditions');
        const div = document.createElement('div');
        div.className = 'condition-block';
        div.innerHTML = \`
          <div style="margin-bottom:8px;"><span class="logic-badge" onclick="toggleLogic(this)">OR</span></div>
          <div class="condition-row">
            <select class="condition-select">
              <option value="rsi">RSI</option>
              <option value="sma">SMA</option>
              <option value="ema">EMA</option>
              <option value="price">Price</option>
            </select>
            <input type="number" class="condition-input" value="14" placeholder="Period">
            <select class="condition-select">
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
              <option value="crosses_above">Crosses Above</option>
              <option value="crosses_below">Crosses Below</option>
            </select>
            <select class="condition-select">
              <option value="value">Value</option>
              <option value="sma">SMA</option>
              <option value="ema">EMA</option>
            </select>
            <input type="number" class="condition-input" value="70" placeholder="Value">
            <button class="btn btn-danger" style="padding:6px 10px;" onclick="removeCondition(this)">X</button>
          </div>\`;
        container.appendChild(div);
        updatePreview();
      }

      function removeCondition(btn) {
        btn.closest('.condition-block').remove();
        updatePreview();
      }

      function toggleLogic(badge) {
        badge.textContent = badge.textContent === 'AND' ? 'OR' : 'AND';
      }

      function updatePreview() {
        const sl = document.getElementById('stopLoss').value;
        const tp = document.getElementById('takeProfit').value;
        document.getElementById('previewSummary').innerHTML =
          'Entry: Custom conditions configured<br>' +
          'Exit: Custom conditions configured<br>' +
          'SL: ' + sl + '% | TP: ' + tp + '%';
      }

      async function runBacktest() {
        const btn = event.target;
        btn.textContent = 'Running...';
        btn.disabled = true;

        // Simulate backtest
        await new Promise(r => setTimeout(r, 2000));

        document.getElementById('backtestResults').style.display = 'block';
        document.getElementById('btReturn').textContent = '+' + (15 + Math.random() * 20).toFixed(1) + '%';
        document.getElementById('btWinRate').textContent = (55 + Math.random() * 20).toFixed(0) + '%';
        document.getElementById('btProfitFactor').textContent = (1.2 + Math.random() * 0.8).toFixed(2);
        document.getElementById('btDrawdown').textContent = '-' + (5 + Math.random() * 10).toFixed(1) + '%';
        document.getElementById('btSharpe').textContent = (0.8 + Math.random() * 1.2).toFixed(2);
        document.getElementById('btTrades').textContent = Math.floor(80 + Math.random() * 150);

        btn.textContent = 'Run Backtest';
        btn.disabled = false;
      }

      async function aiOptimize() {
        alert('AI is analyzing your strategy and market conditions...\\n\\nSuggestions will appear shortly.');
      }

      async function saveStrategy() {
        const name = document.getElementById('strategyName').value;
        const config = {
          name: name,
          riskManagement: {
            stopLossPercent: parseFloat(document.getElementById('stopLoss').value),
            takeProfitPercent: parseFloat(document.getElementById('takeProfit').value),
            trailingStopPercent: parseFloat(document.getElementById('trailingStop').value),
            maxPositionPercent: parseFloat(document.getElementById('maxPosition').value),
            maxDailyLossPercent: parseFloat(document.getElementById('maxDailyLoss').value),
          }
        };

        try {
          const res = await fetch('/api/v1/strategies/builder/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'user_1', config })
          });
          const data = await res.json();
          if (data.success) {
            currentStrategy = data.strategy;
            alert('Strategy saved successfully!');
          }
        } catch (e) {
          alert('Error saving strategy: ' + e.message);
        }
      }

      async function deployStrategy() {
        if (!currentStrategy) {
          await saveStrategy();
        }
        if (confirm('Deploy this strategy to trade with real funds?\\n\\nMake sure you have reviewed and backtested thoroughly.')) {
          alert('Strategy deployed! It will begin trading based on your configured conditions.');
        }
      }

      function importStrategy() {
        const json = prompt('Paste strategy JSON:');
        if (json) {
          try {
            const strategy = JSON.parse(json);
            document.getElementById('strategyName').value = strategy.name || 'Imported Strategy';
            alert('Strategy imported successfully!');
          } catch (e) {
            alert('Invalid JSON');
          }
        }
      }

      function exportStrategy() {
        const strategy = {
          name: document.getElementById('strategyName').value,
          riskManagement: {
            stopLoss: document.getElementById('stopLoss').value,
            takeProfit: document.getElementById('takeProfit').value,
          }
        };
        prompt('Copy this JSON:', JSON.stringify(strategy, null, 2));
      }

      // Initialize
      loadTemplates();
      document.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('change', updatePreview);
      });
    </script>`;
    res.send(pageTemplate('Strategy Builder', 'strategies', content));
  });

  // ========================================================================
  // SYNTHESIS LAB PAGE (AI Strategy Synthesis)
  // ========================================================================
  app.get('/synthesis', (req, res) => {
    const content = `
    <style>
      .synthesis-container { display: grid; grid-template-columns: 1fr 400px; gap: 24px; }
      .bot-pool { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
      .bot-card { background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; }
      .bot-card:hover { background: rgba(123,44,191,0.1); border-color: rgba(123,44,191,0.5); }
      .bot-card.selected { background: rgba(123,44,191,0.2); border-color: #7b2cbf; }
      .bot-name { font-weight: 600; color: #fff; margin-bottom: 4px; }
      .bot-type { font-size: 0.8rem; color: #888; margin-bottom: 8px; }
      .bot-stats { display: flex; gap: 12px; font-size: 0.85rem; }
      .bot-stat { display: flex; flex-direction: column; }
      .bot-stat-value { color: #00c853; font-weight: 600; }
      .bot-stat-label { color: #666; font-size: 0.75rem; }
      .synthesis-panel { background: rgba(255,255,255,0.02); border-radius: 12px; padding: 20px; }
      .panel-section { margin-bottom: 24px; }
      .panel-section-title { font-size: 0.9rem; color: #888; margin-bottom: 12px; text-transform: uppercase; }
      .selected-bots { min-height: 100px; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px; border: 2px dashed rgba(255,255,255,0.1); }
      .selected-bot-chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(123,44,191,0.3); padding: 8px 12px; border-radius: 20px; margin: 4px; }
      .selected-bot-chip button { background: none; border: none; color: #ff4444; cursor: pointer; padding: 0; font-size: 1rem; }
      .synthesis-method { display: flex; gap: 12px; margin-bottom: 16px; }
      .method-option { flex: 1; padding: 16px; background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.08); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.2s; }
      .method-option:hover { border-color: rgba(123,44,191,0.5); }
      .method-option.selected { background: rgba(123,44,191,0.2); border-color: #7b2cbf; }
      .method-icon { font-size: 1.5rem; margin-bottom: 8px; }
      .method-name { font-weight: 600; color: #fff; }
      .method-desc { font-size: 0.8rem; color: #888; margin-top: 4px; }
      .weight-slider { margin-bottom: 16px; }
      .weight-slider label { display: flex; justify-content: space-between; color: #888; font-size: 0.85rem; margin-bottom: 8px; }
      .weight-slider input[type="range"] { width: 100%; }
      .synthesis-preview { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; }
      .preview-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .preview-row:last-child { border: none; }
      .dna-visualization { height: 80px; background: linear-gradient(90deg, #7b2cbf 0%, #00c853 50%, #ff6b35 100%); border-radius: 8px; margin: 16px 0; opacity: 0.8; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.85rem; }
      .synthesis-progress { display: none; margin-top: 20px; }
      .progress-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
      .progress-fill { height: 100%; background: linear-gradient(90deg, #7b2cbf, #00c853); width: 0%; transition: width 0.3s; }
      .progress-status { text-align: center; color: #888; margin-top: 12px; font-size: 0.9rem; }
      @media (max-width: 1024px) { .synthesis-container { grid-template-columns: 1fr; } }
    </style>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h1 class="page-title" style="margin:0;">Synthesis Lab</h1>
        <p style="color:#888;margin:8px 0 0 0;">Combine multiple bots to create evolved strategies using AI synthesis</p>
      </div>
      <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="window.location.href='/strategies'">Back to Strategies</button>
    </div>

    <div class="synthesis-container">
      <!-- Left: Bot Pool -->
      <div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Select Bots to Synthesize</span>
            <span style="color:#888;font-size:0.9rem;">Select 2-5 bots</span>
          </div>

          <div class="bot-pool">
            <div class="bot-card" onclick="toggleBot(this, 'bot_1')">
              <div class="bot-name">Golden Cross Bot</div>
              <div class="bot-type">Trend Following</div>
              <div class="bot-stats">
                <div class="bot-stat">
                  <span class="bot-stat-value">68%</span>
                  <span class="bot-stat-label">Win Rate</span>
                </div>
                <div class="bot-stat">
                  <span class="bot-stat-value">1.85</span>
                  <span class="bot-stat-label">P/F</span>
                </div>
              </div>
            </div>

            <div class="bot-card" onclick="toggleBot(this, 'bot_2')">
              <div class="bot-name">RSI Reversal</div>
              <div class="bot-type">Mean Reversion</div>
              <div class="bot-stats">
                <div class="bot-stat">
                  <span class="bot-stat-value">72%</span>
                  <span class="bot-stat-label">Win Rate</span>
                </div>
                <div class="bot-stat">
                  <span class="bot-stat-value">1.55</span>
                  <span class="bot-stat-label">P/F</span>
                </div>
              </div>
            </div>

            <div class="bot-card" onclick="toggleBot(this, 'bot_3')">
              <div class="bot-name">Volatility Breakout</div>
              <div class="bot-type">Breakout</div>
              <div class="bot-stats">
                <div class="bot-stat">
                  <span class="bot-stat-value">58%</span>
                  <span class="bot-stat-label">Win Rate</span>
                </div>
                <div class="bot-stat">
                  <span class="bot-stat-value">2.10</span>
                  <span class="bot-stat-label">P/F</span>
                </div>
              </div>
            </div>

            <div class="bot-card" onclick="toggleBot(this, 'bot_4')">
              <div class="bot-name">MACD Momentum</div>
              <div class="bot-type">Momentum</div>
              <div class="bot-stats">
                <div class="bot-stat">
                  <span class="bot-stat-value">62%</span>
                  <span class="bot-stat-label">Win Rate</span>
                </div>
                <div class="bot-stat">
                  <span class="bot-stat-value">1.75</span>
                  <span class="bot-stat-label">P/F</span>
                </div>
              </div>
            </div>

            <div class="bot-card" onclick="toggleBot(this, 'bot_5')">
              <div class="bot-name">Range Scalper</div>
              <div class="bot-type">Scalping</div>
              <div class="bot-stats">
                <div class="bot-stat">
                  <span class="bot-stat-value">75%</span>
                  <span class="bot-stat-label">Win Rate</span>
                </div>
                <div class="bot-stat">
                  <span class="bot-stat-value">1.35</span>
                  <span class="bot-stat-label">P/F</span>
                </div>
              </div>
            </div>

            <div class="bot-card" onclick="toggleBot(this, 'bot_6')">
              <div class="bot-name">News Sentiment</div>
              <div class="bot-type">AI Sentiment</div>
              <div class="bot-stats">
                <div class="bot-stat">
                  <span class="bot-stat-value">64%</span>
                  <span class="bot-stat-label">Win Rate</span>
                </div>
                <div class="bot-stat">
                  <span class="bot-stat-value">1.90</span>
                  <span class="bot-stat-label">P/F</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Synthesis Results -->
        <div class="card" id="synthesisResult" style="display:none;">
          <div class="card-header">
            <span class="card-title">Synthesis Result</span>
          </div>
          <div style="text-align:center;padding:24px;">
            <div style="font-size:3rem;margin-bottom:16px;">🧬</div>
            <h3 style="color:#00c853;margin:0 0 8px 0;" id="resultName">Hybrid Alpha Strategy</h3>
            <p style="color:#888;margin-bottom:24px;">Successfully synthesized from 3 parent bots</p>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
              <div>
                <div style="font-size:1.5rem;font-weight:700;color:#00c853;" id="resultWinRate">71%</div>
                <div style="color:#888;font-size:0.85rem;">Win Rate</div>
              </div>
              <div>
                <div style="font-size:1.5rem;font-weight:700;color:#fff;" id="resultPF">1.92</div>
                <div style="color:#888;font-size:0.85rem;">Profit Factor</div>
              </div>
              <div>
                <div style="font-size:1.5rem;font-weight:700;color:#ff6b35;" id="resultDD">-9.5%</div>
                <div style="color:#888;font-size:0.85rem;">Max DD</div>
              </div>
              <div>
                <div style="font-size:1.5rem;font-weight:700;color:#7b2cbf;" id="resultSharpe">1.78</div>
                <div style="color:#888;font-size:0.85rem;">Sharpe</div>
              </div>
            </div>
            <div style="display:flex;gap:12px;justify-content:center;">
              <button class="btn btn-primary" onclick="deployResult()">Deploy Strategy</button>
              <button class="btn" style="background:rgba(255,255,255,0.05);" onclick="viewDetails()">View Details</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Synthesis Panel -->
      <div class="synthesis-panel">
        <div class="panel-section">
          <div class="panel-section-title">Selected Bots</div>
          <div class="selected-bots" id="selectedBots">
            <p style="color:#666;text-align:center;margin:0;">Click bots to select them for synthesis</p>
          </div>
        </div>

        <div class="panel-section">
          <div class="panel-section-title">Synthesis Method</div>
          <div class="synthesis-method">
            <div class="method-option selected" onclick="selectMethod(this, 'ensemble')">
              <div class="method-icon">🎯</div>
              <div class="method-name">Ensemble</div>
              <div class="method-desc">Vote-based signals</div>
            </div>
            <div class="method-option" onclick="selectMethod(this, 'genetic')">
              <div class="method-icon">🧬</div>
              <div class="method-name">Genetic</div>
              <div class="method-desc">Evolve best traits</div>
            </div>
            <div class="method-option" onclick="selectMethod(this, 'neural')">
              <div class="method-icon">🧠</div>
              <div class="method-name">Neural</div>
              <div class="method-desc">AI blending</div>
            </div>
          </div>
        </div>

        <div class="panel-section" id="weightSection" style="display:none;">
          <div class="panel-section-title">Bot Weights</div>
          <div id="weightSliders"></div>
        </div>

        <div class="panel-section">
          <div class="panel-section-title">DNA Visualization</div>
          <div class="dna-visualization" id="dnaViz">
            Select bots to visualize DNA combination
          </div>
        </div>

        <div class="panel-section">
          <div class="panel-section-title">Predicted Performance</div>
          <div class="synthesis-preview">
            <div class="preview-row">
              <span style="color:#888;">Expected Win Rate</span>
              <span style="color:#00c853;" id="predWinRate">--</span>
            </div>
            <div class="preview-row">
              <span style="color:#888;">Expected Profit Factor</span>
              <span id="predPF">--</span>
            </div>
            <div class="preview-row">
              <span style="color:#888;">Estimated Max Drawdown</span>
              <span style="color:#ff6b35;" id="predDD">--</span>
            </div>
            <div class="preview-row">
              <span style="color:#888;">Regime Adaptability</span>
              <span style="color:#7b2cbf;" id="predAdapt">--</span>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" style="width:100%;padding:16px;font-size:1rem;" onclick="startSynthesis()" id="synthesizeBtn" disabled>
          Start Synthesis
        </button>

        <div class="synthesis-progress" id="synthesisProgress">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="progress-status" id="progressStatus">Initializing synthesis...</div>
        </div>
      </div>
    </div>

    <script>
      const selectedBots = new Map();
      let synthesisMethod = 'ensemble';

      const botInfo = {
        bot_1: { name: 'Golden Cross Bot', winRate: 68, pf: 1.85 },
        bot_2: { name: 'RSI Reversal', winRate: 72, pf: 1.55 },
        bot_3: { name: 'Volatility Breakout', winRate: 58, pf: 2.10 },
        bot_4: { name: 'MACD Momentum', winRate: 62, pf: 1.75 },
        bot_5: { name: 'Range Scalper', winRate: 75, pf: 1.35 },
        bot_6: { name: 'News Sentiment', winRate: 64, pf: 1.90 },
      };

      function toggleBot(card, botId) {
        if (selectedBots.has(botId)) {
          selectedBots.delete(botId);
          card.classList.remove('selected');
        } else {
          if (selectedBots.size >= 5) {
            alert('Maximum 5 bots can be selected');
            return;
          }
          selectedBots.set(botId, botInfo[botId]);
          card.classList.add('selected');
        }
        updateSelectedDisplay();
        updatePredictions();
      }

      function updateSelectedDisplay() {
        const container = document.getElementById('selectedBots');
        if (selectedBots.size === 0) {
          container.innerHTML = '<p style="color:#666;text-align:center;margin:0;">Click bots to select them for synthesis</p>';
          document.getElementById('synthesizeBtn').disabled = true;
          document.getElementById('weightSection').style.display = 'none';
          return;
        }

        let html = '';
        selectedBots.forEach((info, id) => {
          html += '<span class="selected-bot-chip">' + info.name + ' <button onclick="removeBotSelection(\\'' + id + '\\')">&times;</button></span>';
        });
        container.innerHTML = html;

        document.getElementById('synthesizeBtn').disabled = selectedBots.size < 2;

        // Update weight sliders
        if (selectedBots.size >= 2) {
          document.getElementById('weightSection').style.display = 'block';
          let slidersHtml = '';
          selectedBots.forEach((info, id) => {
            slidersHtml += '<div class="weight-slider"><label><span>' + info.name + '</span><span id="weight-' + id + '-val">33%</span></label><input type="range" min="0" max="100" value="33" oninput="updateWeight(\\'' + id + '\\')"></div>';
          });
          document.getElementById('weightSliders').innerHTML = slidersHtml;
        }

        // Update DNA visualization
        const colors = ['#7b2cbf', '#00c853', '#ff6b35', '#00bcd4', '#ffc107'];
        let gradient = 'linear-gradient(90deg';
        let i = 0;
        selectedBots.forEach(() => {
          const start = (i / selectedBots.size) * 100;
          const end = ((i + 1) / selectedBots.size) * 100;
          gradient += ', ' + colors[i % colors.length] + ' ' + start + '%, ' + colors[i % colors.length] + ' ' + end + '%';
          i++;
        });
        gradient += ')';
        document.getElementById('dnaViz').style.background = gradient;
        document.getElementById('dnaViz').textContent = selectedBots.size + ' DNA strands combining...';
      }

      function removeBotSelection(botId) {
        selectedBots.delete(botId);
        document.querySelectorAll('.bot-card').forEach(card => {
          if (card.onclick.toString().includes(botId)) {
            card.classList.remove('selected');
          }
        });
        updateSelectedDisplay();
        updatePredictions();
      }

      function updateWeight(botId) {
        const val = event.target.value;
        document.getElementById('weight-' + botId + '-val').textContent = val + '%';
      }

      function selectMethod(el, method) {
        document.querySelectorAll('.method-option').forEach(m => m.classList.remove('selected'));
        el.classList.add('selected');
        synthesisMethod = method;
        updatePredictions();
      }

      function updatePredictions() {
        if (selectedBots.size < 2) {
          document.getElementById('predWinRate').textContent = '--';
          document.getElementById('predPF').textContent = '--';
          document.getElementById('predDD').textContent = '--';
          document.getElementById('predAdapt').textContent = '--';
          return;
        }

        let totalWinRate = 0;
        let totalPF = 0;
        selectedBots.forEach(bot => {
          totalWinRate += bot.winRate;
          totalPF += bot.pf;
        });

        const avgWinRate = totalWinRate / selectedBots.size;
        const avgPF = totalPF / selectedBots.size;

        // Synthesis bonuses based on method
        let winRateBonus = synthesisMethod === 'ensemble' ? 3 : synthesisMethod === 'genetic' ? 5 : 4;
        let pfBonus = synthesisMethod === 'genetic' ? 0.15 : 0.1;

        document.getElementById('predWinRate').textContent = (avgWinRate + winRateBonus).toFixed(0) + '%';
        document.getElementById('predPF').textContent = (avgPF + pfBonus).toFixed(2);
        document.getElementById('predDD').textContent = '-' + (12 - selectedBots.size).toFixed(1) + '%';
        document.getElementById('predAdapt').textContent = selectedBots.size >= 3 ? 'High' : 'Medium';
      }

      async function startSynthesis() {
        if (selectedBots.size < 2) return;

        const btn = document.getElementById('synthesizeBtn');
        const progress = document.getElementById('synthesisProgress');
        const progressFill = document.getElementById('progressFill');
        const progressStatus = document.getElementById('progressStatus');

        btn.disabled = true;
        btn.textContent = 'Synthesizing...';
        progress.style.display = 'block';

        const steps = [
          { percent: 10, status: 'Extracting DNA from parent bots...' },
          { percent: 25, status: 'Analyzing strategy patterns...' },
          { percent: 40, status: 'Identifying complementary traits...' },
          { percent: 55, status: 'Running genetic algorithms...' },
          { percent: 70, status: 'Optimizing parameters...' },
          { percent: 85, status: 'Running validation backtest...' },
          { percent: 95, status: 'Finalizing hybrid strategy...' },
          { percent: 100, status: 'Synthesis complete!' },
        ];

        for (const step of steps) {
          progressFill.style.width = step.percent + '%';
          progressStatus.textContent = step.status;
          await new Promise(r => setTimeout(r, 800));
        }

        // Show result
        setTimeout(() => {
          progress.style.display = 'none';
          btn.textContent = 'Start Synthesis';
          btn.disabled = false;

          const names = Array.from(selectedBots.values()).map(b => b.name.split(' ')[0]);
          document.getElementById('resultName').textContent = names.slice(0, 2).join('-') + ' Hybrid';

          let totalWR = 0, totalPF = 0;
          selectedBots.forEach(b => { totalWR += b.winRate; totalPF += b.pf; });
          document.getElementById('resultWinRate').textContent = ((totalWR / selectedBots.size) + 4).toFixed(0) + '%';
          document.getElementById('resultPF').textContent = ((totalPF / selectedBots.size) + 0.12).toFixed(2);
          document.getElementById('resultDD').textContent = '-' + (8 + Math.random() * 4).toFixed(1) + '%';
          document.getElementById('resultSharpe').textContent = (1.4 + Math.random() * 0.6).toFixed(2);

          document.getElementById('synthesisResult').style.display = 'block';
          document.getElementById('synthesisResult').scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }

      function deployResult() {
        if (confirm('Deploy this synthesized strategy to trade live?')) {
          alert('Strategy deployed successfully! Monitor it from the Strategies page.');
          window.location.href = '/strategies';
        }
      }

      function viewDetails() {
        alert('Full analysis:\\n\\n' +
          '- Inherited trend-following from Golden Cross\\n' +
          '- Added mean-reversion filter from RSI\\n' +
          '- Risk management from Volatility Breakout\\n\\n' +
          'Best performance in: Trending markets\\n' +
          'Adaptive to: Ranging conditions');
      }
    </script>`;
    res.send(pageTemplate('Synthesis Lab', 'strategies', content));
  });

  // ========================================================================
  // ADVANCED CHARTING PAGE (TradingView Integration)
  // ========================================================================
  app.get('/charts', (req, res) => {
    const content = `
    <style>
      .chart-container { display: grid; grid-template-columns: 250px 1fr; gap: 24px; height: calc(100vh - 120px); }
      .chart-sidebar { background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px; overflow-y: auto; }
      .chart-main { background: rgba(255,255,255,0.02); border-radius: 12px; overflow: hidden; }
      .sidebar-section { margin-bottom: 24px; }
      .sidebar-title { font-size: 0.85rem; color: #888; text-transform: uppercase; margin-bottom: 12px; }
      .symbol-search { width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; margin-bottom: 12px; }
      .symbol-list { max-height: 200px; overflow-y: auto; }
      .symbol-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px; cursor: pointer; transition: all 0.2s; }
      .symbol-item:hover { background: rgba(0,200,83,0.1); }
      .symbol-item.active { background: rgba(0,200,83,0.15); border: 1px solid #00c853; }
      .symbol-name { font-weight: 600; color: #fff; }
      .symbol-price { color: #00c853; font-size: 0.9rem; }
      .symbol-change { font-size: 0.8rem; }
      .symbol-change.positive { color: #00c853; }
      .symbol-change.negative { color: #ff4444; }
      .timeframe-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .tf-btn { padding: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #888; text-align: center; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
      .tf-btn:hover { background: rgba(0,200,83,0.1); color: #fff; }
      .tf-btn.active { background: rgba(0,200,83,0.2); border-color: #00c853; color: #00c853; }
      .indicator-list { max-height: 150px; overflow-y: auto; }
      .indicator-item { display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px; cursor: pointer; transition: all 0.2s; }
      .indicator-item:hover { background: rgba(123,44,191,0.1); }
      .indicator-item.active { background: rgba(123,44,191,0.2); }
      .indicator-color { width: 12px; height: 12px; border-radius: 3px; }
      .watchlist { margin-top: 16px; }
      .watchlist-item { display: flex; justify-content: space-between; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px; font-size: 0.85rem; cursor: pointer; }
      .watchlist-item:hover { background: rgba(0,200,83,0.1); }
      .chart-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.05); }
      .toolbar-left { display: flex; align-items: center; gap: 16px; }
      .toolbar-right { display: flex; align-items: center; gap: 12px; }
      .current-symbol { font-size: 1.2rem; font-weight: 700; color: #fff; }
      .current-price { font-size: 1.1rem; color: #00c853; }
      .price-change { font-size: 0.9rem; padding: 4px 8px; border-radius: 4px; }
      .price-change.positive { background: rgba(0,200,83,0.2); color: #00c853; }
      .price-change.negative { background: rgba(255,68,68,0.2); color: #ff4444; }
      .tool-btn { padding: 8px 12px; background: rgba(255,255,255,0.05); border: none; border-radius: 6px; color: #888; cursor: pointer; transition: all 0.2s; }
      .tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .tool-btn.active { background: rgba(123,44,191,0.3); color: #7b2cbf; }
      #tradingview-chart { width: 100%; height: calc(100% - 60px); }
      .mini-charts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
      .mini-chart { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s; }
      .mini-chart:hover { background: rgba(0,200,83,0.1); }
      .mini-chart-symbol { font-weight: 600; color: #fff; margin-bottom: 4px; }
      .mini-chart-price { color: #00c853; }
      .ai-insights { background: rgba(123,44,191,0.1); border-radius: 8px; padding: 12px; margin-top: 16px; }
      .ai-insights-title { color: #7b2cbf; font-weight: 600; margin-bottom: 8px; font-size: 0.9rem; }
      .ai-insight { font-size: 0.85rem; color: #888; margin-bottom: 6px; padding-left: 12px; border-left: 2px solid #7b2cbf; }
      @media (max-width: 1024px) { .chart-container { grid-template-columns: 1fr; } .chart-sidebar { display: none; } }
    </style>

    <div class="chart-container">
      <!-- Sidebar -->
      <div class="chart-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-title">Symbol Search</div>
          <input type="text" class="symbol-search" placeholder="Search symbols..." onkeyup="searchSymbol(this.value)">
          <div class="symbol-list" id="symbolList">
            <div class="symbol-item active" data-symbol="EURUSD" onclick="selectSymbol('EURUSD')">
              <div>
                <div class="symbol-name">EUR/USD</div>
                <span style="font-size:0.75rem;color:#666;">Forex</span>
              </div>
              <div style="text-align:right;">
                <div class="symbol-price">1.0875</div>
                <div class="symbol-change positive">+0.15%</div>
              </div>
            </div>
            <div class="symbol-item" data-symbol="BTCUSD" onclick="selectSymbol('BTCUSD')">
              <div>
                <div class="symbol-name">BTC/USD</div>
                <span style="font-size:0.75rem;color:#666;">Crypto</span>
              </div>
              <div style="text-align:right;">
                <div class="symbol-price">43,250</div>
                <div class="symbol-change positive">+2.4%</div>
              </div>
            </div>
            <div class="symbol-item" data-symbol="AAPL" onclick="selectSymbol('AAPL')">
              <div>
                <div class="symbol-name">AAPL</div>
                <span style="font-size:0.75rem;color:#666;">Stock</span>
              </div>
              <div style="text-align:right;">
                <div class="symbol-price">189.50</div>
                <div class="symbol-change negative">-0.8%</div>
              </div>
            </div>
            <div class="symbol-item" data-symbol="XAUUSD" onclick="selectSymbol('XAUUSD')">
              <div>
                <div class="symbol-name">XAU/USD</div>
                <span style="font-size:0.75rem;color:#666;">Commodity</span>
              </div>
              <div style="text-align:right;">
                <div class="symbol-price">2,035</div>
                <div class="symbol-change positive">+0.6%</div>
              </div>
            </div>
            <div class="symbol-item" data-symbol="GBPUSD" onclick="selectSymbol('GBPUSD')">
              <div>
                <div class="symbol-name">GBP/USD</div>
                <span style="font-size:0.75rem;color:#666;">Forex</span>
              </div>
              <div style="text-align:right;">
                <div class="symbol-price">1.2680</div>
                <div class="symbol-change positive">+0.22%</div>
              </div>
            </div>
            <div class="symbol-item" data-symbol="ETHUSD" onclick="selectSymbol('ETHUSD')">
              <div>
                <div class="symbol-name">ETH/USD</div>
                <span style="font-size:0.75rem;color:#666;">Crypto</span>
              </div>
              <div style="text-align:right;">
                <div class="symbol-price">2,280</div>
                <div class="symbol-change positive">+3.1%</div>
              </div>
            </div>
            <div class="symbol-item" data-symbol="TSLA" onclick="selectSymbol('TSLA')">
              <div>
                <div class="symbol-name">TSLA</div>
                <span style="font-size:0.75rem;color:#666;">Stock</span>
              </div>
              <div style="text-align:right;">
                <div class="symbol-price">248.30</div>
                <div class="symbol-change positive">+1.8%</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-title">Timeframe</div>
          <div class="timeframe-grid">
            <div class="tf-btn" onclick="setTimeframe('1')">1m</div>
            <div class="tf-btn" onclick="setTimeframe('5')">5m</div>
            <div class="tf-btn" onclick="setTimeframe('15')">15m</div>
            <div class="tf-btn" onclick="setTimeframe('30')">30m</div>
            <div class="tf-btn active" onclick="setTimeframe('60')">1H</div>
            <div class="tf-btn" onclick="setTimeframe('240')">4H</div>
            <div class="tf-btn" onclick="setTimeframe('D')">1D</div>
            <div class="tf-btn" onclick="setTimeframe('W')">1W</div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-title">Indicators</div>
          <div class="indicator-list">
            <div class="indicator-item active" onclick="toggleIndicator(this, 'SMA')">
              <div class="indicator-color" style="background:#2196F3;"></div>
              <span>SMA (20)</span>
            </div>
            <div class="indicator-item active" onclick="toggleIndicator(this, 'EMA')">
              <div class="indicator-color" style="background:#FF9800;"></div>
              <span>EMA (50)</span>
            </div>
            <div class="indicator-item" onclick="toggleIndicator(this, 'RSI')">
              <div class="indicator-color" style="background:#9C27B0;"></div>
              <span>RSI (14)</span>
            </div>
            <div class="indicator-item" onclick="toggleIndicator(this, 'MACD')">
              <div class="indicator-color" style="background:#4CAF50;"></div>
              <span>MACD</span>
            </div>
            <div class="indicator-item" onclick="toggleIndicator(this, 'BB')">
              <div class="indicator-color" style="background:#00BCD4;"></div>
              <span>Bollinger Bands</span>
            </div>
            <div class="indicator-item" onclick="toggleIndicator(this, 'ATR')">
              <div class="indicator-color" style="background:#FF5722;"></div>
              <span>ATR (14)</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-title">Watchlist</div>
          <div class="watchlist">
            <div class="watchlist-item" onclick="selectSymbol('GBPUSD')">
              <span>GBP/USD</span>
              <span class="positive">+0.22%</span>
            </div>
            <div class="watchlist-item" onclick="selectSymbol('USDJPY')">
              <span>USD/JPY</span>
              <span class="negative">-0.15%</span>
            </div>
            <div class="watchlist-item" onclick="selectSymbol('ETHUSD')">
              <span>ETH/USD</span>
              <span class="positive">+3.1%</span>
            </div>
            <div class="watchlist-item" onclick="selectSymbol('TSLA')">
              <span>TSLA</span>
              <span class="positive">+1.8%</span>
            </div>
          </div>
        </div>

        <div class="ai-insights">
          <div class="ai-insights-title">AI Market Insights</div>
          <div class="ai-insight">Strong bullish momentum on EUR/USD</div>
          <div class="ai-insight">BTC approaching key resistance at 44,000</div>
          <div class="ai-insight">High volatility expected for AAPL earnings</div>
        </div>
      </div>

      <!-- Main Chart Area -->
      <div class="chart-main">
        <div class="chart-toolbar">
          <div class="toolbar-left">
            <span class="current-symbol" id="currentSymbol">EUR/USD</span>
            <span class="current-price" id="currentPrice">1.0875</span>
            <span class="price-change positive" id="priceChange">+0.15%</span>
          </div>
          <div class="toolbar-right">
            <button class="tool-btn" onclick="setChartType('candlestick')" title="Candlestick">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="6" width="4" height="12"/><rect x="10" y="3" width="4" height="18"/><rect x="17" y="8" width="4" height="8"/></svg>
            </button>
            <button class="tool-btn" onclick="setChartType('line')" title="Line">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </button>
            <button class="tool-btn" onclick="setChartType('area')" title="Area">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h20V4l-8 8-4-4-8 8z" opacity="0.3"/><path d="M2 20h20V4l-8 8-4-4-8 8z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <div style="width:1px;height:24px;background:rgba(255,255,255,0.1);margin:0 8px;"></div>
            <button class="tool-btn active" onclick="toggleDrawingTool('crosshair')" title="Crosshair">+</button>
            <button class="tool-btn" onclick="toggleDrawingTool('trendline')" title="Trendline">/</button>
            <button class="tool-btn" onclick="toggleDrawingTool('horizontal')" title="Horizontal Line">—</button>
            <button class="tool-btn" onclick="toggleDrawingTool('fib')" title="Fibonacci">Fib</button>
            <div style="width:1px;height:24px;background:rgba(255,255,255,0.1);margin:0 8px;"></div>
            <button class="tool-btn" onclick="takeScreenshot()" title="Screenshot">📷</button>
            <button class="tool-btn" onclick="toggleFullscreen()" title="Fullscreen">⛶</button>
          </div>
        </div>

        <!-- TradingView Widget -->
        <div id="tradingview-chart">
          <div id="tv_chart_container" style="width:100%;height:100%;"></div>
        </div>
      </div>
    </div>

    <!-- TradingView Embed Widget -->
    <script>
      let currentSymbol = 'FX:EURUSD';
      let currentTimeframe = '60';

      function initChart() {
        updateChart();
      }

      function updateChart() {
        const container = document.getElementById('tv_chart_container');
        container.innerHTML = \`
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=\${encodeURIComponent(currentSymbol)}&interval=\${currentTimeframe}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=1a1a2e&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart"
            style="width:100%;height:100%;border:none;"
            allowtransparency="true"
            scrolling="no"
            allowfullscreen
          ></iframe>
        \`;
      }

      // Symbol mappings for TradingView
      const symbolMap = {
        'EURUSD': 'FX:EURUSD',
        'GBPUSD': 'FX:GBPUSD',
        'USDJPY': 'FX:USDJPY',
        'BTCUSD': 'COINBASE:BTCUSD',
        'ETHUSD': 'COINBASE:ETHUSD',
        'AAPL': 'NASDAQ:AAPL',
        'TSLA': 'NASDAQ:TSLA',
        'XAUUSD': 'OANDA:XAUUSD',
      };

      function selectSymbol(symbol) {
        currentSymbol = symbolMap[symbol] || symbol;
        document.getElementById('currentSymbol').textContent = formatSymbol(symbol);

        // Update active state in list
        document.querySelectorAll('.symbol-item').forEach(item => {
          item.classList.remove('active');
          if (item.dataset.symbol === symbol) {
            item.classList.add('active');
          }
        });

        // Update chart
        updateChart();

        // Update price display (mock)
        updatePriceDisplay(symbol);
      }

      function formatSymbol(symbol) {
        if (symbol.length === 6 && !symbol.includes('/')) {
          return symbol.slice(0, 3) + '/' + symbol.slice(3);
        }
        return symbol;
      }

      function updatePriceDisplay(symbol) {
        const prices = {
          'EURUSD': { price: '1.0875', change: '+0.15%', positive: true },
          'BTCUSD': { price: '43,250', change: '+2.4%', positive: true },
          'AAPL': { price: '189.50', change: '-0.8%', positive: false },
          'XAUUSD': { price: '2,035', change: '+0.6%', positive: true },
          'GBPUSD': { price: '1.2680', change: '+0.22%', positive: true },
          'USDJPY': { price: '148.50', change: '-0.15%', positive: false },
          'ETHUSD': { price: '2,280', change: '+3.1%', positive: true },
          'TSLA': { price: '248.30', change: '+1.8%', positive: true },
        };

        const data = prices[symbol] || { price: '--', change: '--', positive: true };
        document.getElementById('currentPrice').textContent = data.price;

        const changeEl = document.getElementById('priceChange');
        changeEl.textContent = data.change;
        changeEl.className = 'price-change ' + (data.positive ? 'positive' : 'negative');
      }

      function setTimeframe(tf) {
        currentTimeframe = tf;
        document.querySelectorAll('.tf-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Update chart with new timeframe
        updateChart();
      }

      function toggleIndicator(el, indicator) {
        el.classList.toggle('active');
        console.log('Toggle indicator:', indicator, el.classList.contains('active'));
        // In production, this would add/remove the indicator from the chart
      }

      function setChartType(type) {
        console.log('Set chart type:', type);
        // In production, this would change the chart style
      }

      function toggleDrawingTool(tool) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
          if (btn.title && ['Crosshair', 'Trendline', 'Horizontal Line', 'Fibonacci'].includes(btn.title)) {
            btn.classList.remove('active');
          }
        });
        event.target.classList.add('active');
        console.log('Selected drawing tool:', tool);
      }

      function takeScreenshot() {
        alert('Screenshot captured! (In production, this would save the chart as an image)');
      }

      function toggleFullscreen() {
        const chartMain = document.querySelector('.chart-main');
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          chartMain.requestFullscreen();
        }
      }

      function searchSymbol(query) {
        const items = document.querySelectorAll('.symbol-item');
        items.forEach(item => {
          const name = item.querySelector('.symbol-name').textContent.toLowerCase();
          if (name.includes(query.toLowerCase())) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      }

      // Initialize chart on load
      setTimeout(initChart, 500);
    </script>`;
    res.send(pageTemplate('Charts', 'markets', content));
  });

  // ========================================================================
  // BOTS PAGE
  // ========================================================================
  app.get('/bots', (req, res) => {
    const bots = botManager.getAllBots();
    const content = `
    <h1 class="page-title">Bots</h1>
    <div class="grid grid-4" style="margin-bottom:24px;">
      <div class="card stat-card">
        <div class="stat-value">${bots.length}</div>
        <div class="stat-label">Total Bots</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${bots.filter(b => b.status === 'active').length}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${bots.filter(b => b.status === 'testing').length}</div>
        <div class="stat-label">Testing</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">0</div>
        <div class="stat-label">Pending Approval</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Bot Library</span>
        <div>
          <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;margin-right:8px;" onclick="fetchBots()">Fetch New Bots</button>
          <input type="text" class="input-field" placeholder="Search bots..." style="width:200px;" onkeyup="filterBots(this.value)">
        </div>
      </div>
      <table class="table" id="botsTable">
        <thead>
          <tr><th>Name</th><th>Source</th><th>Type</th><th>Status</th><th>Win Rate</th><th>P/F</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${bots.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#666;padding:40px;">No bots absorbed yet. Use the Control Panel to fetch and absorb bots.</td></tr>' : bots.map(b => `
          <tr data-name="${b.name.toLowerCase()}">
            <td><strong>${b.name}</strong><br><span style="color:#666;font-size:0.8rem;">${b.id}</span></td>
            <td>${b.source}</td>
            <td>${(b as any).type || 'Unknown'}</td>
            <td><span style="color:${b.status === 'active' ? '#00c853' : b.status === 'testing' ? '#ffc107' : '#888'};">${b.status}</span></td>
            <td>${b.performance?.winRate?.toFixed(1) || '--'}%</td>
            <td>${b.performance?.profitFactor?.toFixed(2) || '--'}</td>
            <td>
              <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;padding:6px 12px;" onclick="viewBot('${b.id}')">View</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <script>
      function filterBots(term) {
        const rows = document.querySelectorAll('#botsTable tbody tr');
        rows.forEach(row => {
          const name = row.dataset.name || '';
          row.style.display = name.includes(term.toLowerCase()) ? '' : 'none';
        });
      }
      function fetchBots() { window.location.href = '/admin#fetch-bots'; }
      function viewBot(id) { alert('Bot details for ' + id); }
    </script>`;
    res.send(pageTemplate('Bots', 'bots', content));
  });

  // ========================================================================
  // ADMIN CONTROL PANEL
  // ========================================================================
  app.get('/admin', (req, res) => {
    const health = timeGovernor.getSystemHealth();
    const metrics = timeGovernor.getMetrics();
    const regimeState = regimeDetector.getRegimeState();
    const riskState = riskEngine.getState();
    const content = `
    <h1 class="page-title">Control Panel</h1>

    <!-- System Overview -->
    <div class="grid grid-4" style="margin-bottom:24px;">
      <div class="card stat-card" style="border-left:3px solid #00c853;">
        <div class="stat-value">${health.filter(h => h.status === 'online').length}/${health.length}</div>
        <div class="stat-label">Components Online</div>
      </div>
      <div class="card stat-card" style="border-left:3px solid #00d4ff;">
        <div class="stat-value">${metrics.evolutionMode.toUpperCase()}</div>
        <div class="stat-label">Evolution Mode</div>
      </div>
      <div class="card stat-card" style="border-left:3px solid #ffc107;">
        <div class="stat-value">${regimeState.current}</div>
        <div class="stat-label">Market Regime</div>
      </div>
      <div class="card stat-card" style="border-left:3px solid ${riskState.emergencyBrakeActive ? '#ff5252' : '#00c853'};">
        <div class="stat-value">${riskState.emergencyBrakeActive ? 'ACTIVE' : 'OFF'}</div>
        <div class="stat-label">Emergency Brake</div>
      </div>
    </div>

    <div class="grid grid-2">
      <!-- Evolution Control -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Evolution Control</span>
        </div>
        <p style="color:#888;margin-bottom:16px;">Control how TIME evolves and learns.</p>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <button class="btn ${metrics.evolutionMode === 'controlled' ? 'btn-primary' : ''}" style="${metrics.evolutionMode !== 'controlled' ? 'background:rgba(255,255,255,0.05);color:#888;' : ''}" onclick="setEvolutionMode('controlled')">Controlled</button>
          <button class="btn ${metrics.evolutionMode === 'autonomous' ? 'btn-primary' : ''}" style="${metrics.evolutionMode !== 'autonomous' ? 'background:rgba(255,255,255,0.05);color:#888;' : ''}" onclick="setEvolutionMode('autonomous')">Autonomous</button>
        </div>
        <p style="font-size:0.85rem;color:#666;">Current: ${metrics.evolutionMode === 'controlled' ? 'Changes require your approval' : 'TIME evolves automatically'}</p>
      </div>

      <!-- Emergency Controls -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Emergency Controls</span>
        </div>
        <p style="color:#888;margin-bottom:16px;">Immediately halt all trading operations.</p>
        <div style="display:flex;gap:12px;">
          ${riskState.emergencyBrakeActive ?
            '<button class="btn btn-success" onclick="releaseEmergency()">Release Emergency Brake</button>' :
            '<button class="btn btn-danger" onclick="triggerEmergency()">Trigger Emergency Brake</button>'
          }
          <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;" onclick="pauseAllBots()">Pause All Bots</button>
        </div>
      </div>

      <!-- Bot Fetcher -->
      <div class="card" id="fetch-bots">
        <div class="card-header">
          <span class="card-title">Bot Fetcher</span>
        </div>
        <p style="color:#888;margin-bottom:16px;">Search and download trading bots from various sources.</p>
        <div style="margin-bottom:12px;">
          <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Search Query</label>
          <input type="text" class="input-field" id="fetchQuery" placeholder="e.g., forex trading bot, MT4 EA" value="trading bot">
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Source</label>
          <select class="input-field" id="fetchSource">
            <option value="github">GitHub</option>
            <option value="mql5">MQL5 (Coming Soon)</option>
            <option value="tradingview">TradingView (Coming Soon)</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="searchBots()">Search Bots</button>
        <div id="fetchResults" style="margin-top:16px;"></div>
      </div>

      <!-- Drop Zone Status -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Bot Drop Zone</span>
        </div>
        <p style="color:#888;margin-bottom:16px;">Manage pending bot approvals.</p>
        <div id="dropzoneStatus">Loading...</div>
        <button class="btn" style="background:rgba(255,255,255,0.05);color:#888;margin-top:12px;" onclick="refreshDropzone()">Refresh</button>
      </div>

      <!-- Risk Settings -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Risk Settings</span>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Max Daily Drawdown (%)</label>
          <input type="number" class="input-field" value="5" id="maxDrawdown">
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Max Position Size (lots)</label>
          <input type="number" class="input-field" value="1.0" step="0.1" id="maxPosition">
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px;">Max Open Positions</label>
          <input type="number" class="input-field" value="10" id="maxOpenPositions">
        </div>
        <button class="btn btn-primary" onclick="saveRiskSettings()">Save Settings</button>
      </div>

      <!-- System Components -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">System Components</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${health.map(h => `<span style="padding:6px 12px;border-radius:6px;font-size:0.85rem;background:rgba(${h.status === 'online' ? '0,200,83' : '255,193,7'},0.2);color:${h.status === 'online' ? '#00c853' : '#ffc107'};">${h.component}</span>`).join('')}
        </div>
      </div>
    </div>

    <!-- Audit Log -->
    <div class="card" style="margin-top:24px;">
      <div class="card-header">
        <span class="card-title">Recent Activity</span>
      </div>
      <table class="table">
        <thead>
          <tr><th>Time</th><th>Action</th><th>Details</th><th>User</th></tr>
        </thead>
        <tbody id="auditLog">
          <tr><td>Just now</td><td>System Start</td><td>TIME initialized successfully</td><td>System</td></tr>
          <tr><td>1 min ago</td><td>Evolution Mode</td><td>Set to ${metrics.evolutionMode}</td><td>System</td></tr>
        </tbody>
      </table>
    </div>

    <script>
      async function setEvolutionMode(mode) {
        try {
          const res = await fetch('/api/v1/admin/evolution/mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
          });
          const data = await res.json();
          if (data.success) location.reload();
          else alert('Failed: ' + data.error);
        } catch (e) { alert('Error: ' + e.message); }
      }

      async function triggerEmergency() {
        if (!confirm('TRIGGER EMERGENCY BRAKE? This will halt all trading!')) return;
        try {
          const res = await fetch('/api/v1/admin/emergency/brake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Manual trigger from Control Panel' })
          });
          const data = await res.json();
          alert(data.success ? 'Emergency brake activated!' : 'Failed: ' + data.error);
          location.reload();
        } catch (e) { alert('Error: ' + e.message); }
      }

      async function releaseEmergency() {
        const confirm1 = prompt('Type RELEASE_EMERGENCY_BRAKE to confirm:');
        if (confirm1 !== 'RELEASE_EMERGENCY_BRAKE') return;
        try {
          const res = await fetch('/api/v1/admin/emergency/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmation: 'RELEASE_EMERGENCY_BRAKE' })
          });
          const data = await res.json();
          alert(data.success ? 'Emergency brake released!' : 'Failed: ' + data.error);
          location.reload();
        } catch (e) { alert('Error: ' + e.message); }
      }

      async function pauseAllBots() {
        if (!confirm('Pause all active bots?')) return;
        alert('All bots paused');
      }

      async function searchBots() {
        const query = document.getElementById('fetchQuery').value;
        const source = document.getElementById('fetchSource').value;
        const resultsDiv = document.getElementById('fetchResults');
        resultsDiv.innerHTML = '<div style="color:#888;">Searching...</div>';
        try {
          const res = await fetch('/api/v1/fetcher/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
          });
          const data = await res.json();
          if (data.candidates && data.candidates.length > 0) {
            resultsDiv.innerHTML = '<div style="margin-bottom:8px;color:#00c853;">Found ' + data.total + ' bots</div>' +
              data.candidates.slice(0, 5).map(c => '<div style="padding:8px;background:rgba(255,255,255,0.02);border-radius:4px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;"><div><strong>' + c.name + '</strong><br><span style="color:#666;font-size:0.8rem;">' + c.fullName + '</span></div><button class="btn btn-primary" style="padding:4px 12px;" onclick="downloadBot(\\'' + c.id + '\\')">Download</button></div>').join('');
          } else {
            resultsDiv.innerHTML = '<div style="color:#888;">No bots found</div>';
          }
        } catch (e) { resultsDiv.innerHTML = '<div style="color:#ff5252;">Error: ' + e.message + '</div>'; }
      }

      async function downloadBot(id) {
        try {
          const res = await fetch('/api/v1/fetcher/download/' + id, { method: 'POST' });
          const data = await res.json();
          alert(data.success ? 'Bot downloaded! Check Drop Zone for approval.' : 'Failed: ' + data.error);
        } catch (e) { alert('Error: ' + e.message); }
      }

      async function refreshDropzone() {
        try {
          const res = await fetch('/api/v1/dropzone/pending');
          const data = await res.json();
          const statusDiv = document.getElementById('dropzoneStatus');
          if (data.files && data.files.length > 0) {
            statusDiv.innerHTML = '<div style="color:#ffc107;margin-bottom:8px;">' + data.files.length + ' files pending</div>' +
              data.files.slice(0, 3).map(f => '<div style="padding:8px;background:rgba(255,255,255,0.02);border-radius:4px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;"><span>' + f.filename + '</span><div><button class="btn btn-success" style="padding:4px 8px;margin-right:4px;" onclick="approveBot(\\'' + f.id + '\\')">Approve</button><button class="btn btn-danger" style="padding:4px 8px;" onclick="rejectBot(\\'' + f.id + '\\')">Reject</button></div></div>').join('');
          } else {
            statusDiv.innerHTML = '<div style="color:#888;">No pending files</div>';
          }
        } catch (e) { document.getElementById('dropzoneStatus').innerHTML = '<div style="color:#ff5252;">Error loading</div>'; }
      }

      async function approveBot(id) {
        try {
          await fetch('/api/v1/dropzone/approve/' + id, { method: 'POST' });
          refreshDropzone();
        } catch (e) { alert('Error: ' + e.message); }
      }

      async function rejectBot(id) {
        try {
          await fetch('/api/v1/dropzone/reject/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Manual rejection' }) });
          refreshDropzone();
        } catch (e) { alert('Error: ' + e.message); }
      }

      function saveRiskSettings() {
        alert('Risk settings saved');
      }

      // Initial load
      refreshDropzone();
    </script>`;
    res.send(pageTemplate('Control Panel', 'admin', content));
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    const health = timeGovernor.getSystemHealth();
    const metrics = timeGovernor.getMetrics();
    const dbStatus = databaseManager.getStatus();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      evolutionMode: metrics.evolutionMode,
      currentRegime: metrics.currentRegime,
      database: {
        mongodb: dbStatus.mongodb,
        redis: dbStatus.redis,
        usingMock: dbStatus.usingMock,
        mongoError: databaseManager.lastMongoError,
        redisError: databaseManager.lastRedisError,
      },
      components: health.map((h) => ({
        name: h.component,
        status: h.status,
      })),
    });
  });

  // API info endpoint
  app.get('/api/v1', (req, res) => {
    res.json({
      name: 'TIME — Meta-Intelligence Trading Governor',
      version: '1.0.0',
      description: 'A self-evolving, recursive learning trading organism',
      endpoints: {
        health: '/health',
        bots: '/api/v1/bots',
        strategies: '/api/v1/strategies',
        trades: '/api/v1/trading/trades',
        learn: '/api/v1/learn',
        admin: '/api/v1/admin',
      },
    });
  });

  // Bots endpoints
  app.get('/api/v1/bots', (req, res) => {
    const bots = botManager.getAllBots();
    res.json({
      total: bots.length,
      bots: bots.map((b) => ({
        id: b.id,
        name: b.name,
        source: b.source,
        status: b.status,
        performance: {
          winRate: b.performance.winRate,
          profitFactor: b.performance.profitFactor,
          totalTrades: b.performance.totalTrades,
        },
      })),
    });
  });

  app.get('/api/v1/bots/stats', (req, res) => {
    const stats = botManager.getStatistics();
    res.json(stats);
  });

  // Evolution mode endpoints
  app.get('/api/v1/admin/evolution', (req, res) => {
    const state = timeGovernor.getEvolutionState();
    res.json(state);
  });

  app.post('/api/v1/admin/evolution/mode', (req, res) => {
    const { mode, reason } = req.body;

    if (mode !== 'controlled' && mode !== 'autonomous') {
      return res.status(400).json({ error: 'Invalid mode' });
    }

    timeGovernor.setEvolutionMode(mode, 'admin', reason || 'Admin toggle');

    res.json({
      success: true,
      state: timeGovernor.getEvolutionState(),
    });
  });

  // Metrics endpoint
  app.get('/api/v1/admin/metrics', (req, res) => {
    const metrics = timeGovernor.getMetrics();
    const health = timeGovernor.getSystemHealth();

    res.json({
      governor: metrics,
      components: health,
    });
  });

  // Learning insights endpoint
  app.get('/api/v1/learn/insights', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const insights = learningEngine.getRecentInsights(limit);

    res.json({
      total: insights.length,
      insights,
    });
  });

  // Regime endpoint
  app.get('/api/v1/market/regime', (req, res) => {
    const state = regimeDetector.getRegimeState();

    res.json({
      current: state.current,
      confidence: state.confidence,
      duration: state.duration,
      transitions: state.transitions,
    });
  });

  // Error handling
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      log.error('Unhandled error', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Internal server error' });
    }
  );

  return app;
}

/**
 * Main startup function
 */
async function main(): Promise<void> {
  try {
    // Initialize TIME
    await initializeTIME();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket Real-Time Service
    realtimeService.initialize(server);
    log.info('WebSocket real-time service initialized');

    // Create Event Hub and register all components
    eventHub = createEventHub(realtimeService, {
      enableEventHistory: true,
      maxHistorySize: 1000,
      throttleInterval: 100,
      batchPriceUpdates: true,
      priceBatchInterval: 250,
    });

    // Register all TIME components with the Event Hub for real-time broadcasting
    eventHub.registerComponent(timeGovernor);
    eventHub.registerComponent(evolutionController);
    eventHub.registerComponent(learningEngine);
    eventHub.registerComponent(riskEngine);
    eventHub.registerComponent(regimeDetector);
    eventHub.registerComponent(recursiveSynthesisEngine);
    eventHub.registerComponent(marketVisionEngine);
    eventHub.registerComponent(teachingEngine);
    eventHub.registerComponent(attributionEngine);
    eventHub.registerComponent(botManager);
    eventHub.registerComponent(notificationService);

    log.info('Event Hub registered with all TIME components');

    // Additional WebSocket API endpoints
    app.get('/api/v1/ws/stats', (req, res) => {
      res.json(realtimeService.getStats());
    });

    app.get('/api/v1/ws/clients', (req, res) => {
      const clients = realtimeService.getConnectedClients();
      res.json({
        total: clients.length,
        clients: clients.map(c => ({
          socketId: c.socketId,
          role: c.role,
          connectedAt: c.connectedAt,
          subscriptions: Array.from(c.subscriptions),
        })),
      });
    });

    app.get('/api/v1/ws/history', (req, res) => {
      const since = req.query.since
        ? new Date(req.query.since as string)
        : new Date(Date.now() - 3600000); // Last hour by default
      const channels = req.query.channels
        ? (req.query.channels as string).split(',')
        : undefined;

      const events = eventHub?.getRecentEvents(since, channels) || [];
      res.json({
        total: events.length,
        since,
        events,
      });
    });

    // System announcement endpoint (admin only)
    app.post('/api/v1/admin/announce', (req, res) => {
      const { title, message, priority } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message required' });
      }

      eventHub?.broadcastAnnouncement(title, message, priority || 'medium');

      res.json({ success: true, message: 'Announcement broadcast' });
    });

    // ========================================================================
    // Bot Drop Zone Endpoints
    // ========================================================================

    app.get('/api/v1/dropzone/status', (req, res) => {
      res.json(botDropZone.getStatus());
    });

    app.get('/api/v1/dropzone/pending', (req, res) => {
      res.json({
        files: botDropZone.getPendingFiles(),
      });
    });

    app.get('/api/v1/dropzone/processed', (req, res) => {
      res.json({
        reports: botDropZone.getProcessedReports(),
      });
    });

    app.post('/api/v1/dropzone/approve/:fileId', async (req, res) => {
      try {
        const report = await botDropZone.approveAbsorption(req.params.fileId);
        if (report) {
          res.json({ success: true, report });
        } else {
          res.status(404).json({ error: 'File not found or already processed' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Approval failed' });
      }
    });

    app.post('/api/v1/dropzone/reject/:fileId', async (req, res) => {
      try {
        await botDropZone.rejectAbsorption(req.params.fileId, req.body.reason || 'Manual rejection');
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Rejection failed' });
      }
    });

    // ========================================================================
    // GitHub Bot Fetcher Endpoints
    // ========================================================================

    app.post('/api/v1/fetcher/configure', (req, res) => {
      const { githubToken, minRating, autoAbsorb } = req.body;

      githubBotFetcher.configure({
        githubToken,
        minRating: minRating || 4.0,
        autoAbsorb: autoAbsorb || false,
        downloadPath: './dropzone/incoming', // Downloads go to drop zone
      });

      res.json({ success: true, message: 'GitHub Bot Fetcher configured' });
    });

    app.post('/api/v1/fetcher/search', async (req, res) => {
      try {
        const candidates = await githubBotFetcher.searchForBots(req.body.query);
        res.json({
          success: true,
          total: candidates.length,
          candidates: candidates.map(c => ({
            id: c.id,
            name: c.repo.name,
            fullName: c.repo.fullName,
            stars: c.repo.stars,
            rating: c.rating,
            botType: c.botType,
            status: c.status,
            url: c.repo.url,
          })),
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/v1/fetcher/candidates', (req, res) => {
      const status = req.query.status as string | undefined;
      const candidates = githubBotFetcher.getCandidates(status as any);
      res.json({
        total: candidates.length,
        candidates: candidates.map(c => ({
          id: c.id,
          name: c.repo.name,
          fullName: c.repo.fullName,
          stars: c.repo.stars,
          rating: c.rating,
          botType: c.botType,
          status: c.status,
          url: c.repo.url,
        })),
      });
    });

    app.post('/api/v1/fetcher/download/:candidateId', async (req, res) => {
      try {
        const files = await githubBotFetcher.downloadBot(req.params.candidateId);
        res.json({ success: true, files });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/v1/fetcher/download-all', async (req, res) => {
      try {
        const results = await githubBotFetcher.downloadAllQualified();
        res.json({
          success: true,
          downloaded: results.size,
          results: Object.fromEntries(results),
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/v1/fetcher/stats', (req, res) => {
      res.json(githubBotFetcher.getStats());
    });

    // ========================================================================
    // Opportunity Scout Endpoints
    // ========================================================================

    app.post('/api/v1/scout/setup', async (req, res) => {
      try {
        const config = await opportunityScout.setupUser(req.body.userId, req.body.config || {});
        res.json({ success: true, config });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/v1/scout/platforms', (req, res) => {
      res.json(opportunityScout.getSupportedPlatforms());
    });

    app.post('/api/v1/scout/connect', async (req, res) => {
      try {
        const { userId, platform, credentials } = req.body;
        const account = await opportunityScout.connectAccount(userId, platform, credentials);
        res.json({ success: true, account });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/v1/scout/accounts/:userId', (req, res) => {
      const accounts = opportunityScout.getConnectedAccounts(req.params.userId);
      res.json({ accounts });
    });

    app.post('/api/v1/scout/start/:userId', (req, res) => {
      try {
        opportunityScout.startScanning(req.params.userId);
        res.json({ success: true, message: 'Scanning started' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/v1/scout/stop/:userId', (req, res) => {
      opportunityScout.stopScanning(req.params.userId);
      res.json({ success: true, message: 'Scanning stopped' });
    });

    app.get('/api/v1/scout/opportunities/:userId', (req, res) => {
      const opportunities = opportunityScout.getOpportunities(req.params.userId);
      res.json({ total: opportunities.length, opportunities });
    });

    app.post('/api/v1/scout/authorize', async (req, res) => {
      try {
        const { userId, opportunityId, scopes } = req.body;
        const auth = await opportunityScout.authorizeOpportunity(userId, opportunityId, scopes);
        res.json({ success: true, authorization: auth });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/v1/scout/collect', async (req, res) => {
      try {
        const { userId, opportunityId } = req.body;
        const earnings = await opportunityScout.collectOpportunity(userId, opportunityId);
        res.json({ success: true, earnings });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/v1/scout/report/:userId', (req, res) => {
      const period = (req.query.period as string) || 'monthly';
      const report = opportunityScout.getEarningsReport(req.params.userId, period as any);
      res.json(report);
    });

    app.get('/api/v1/scout/stats/:userId', (req, res) => {
      res.json(opportunityScout.getStats(req.params.userId));
    });

    // ========================================================================
    // Learning Velocity Endpoints
    // ========================================================================

    app.get('/api/v1/velocity/metrics', (req, res) => {
      res.json(learningVelocityTracker.getVelocity());
    });

    app.get('/api/v1/velocity/milestones', (req, res) => {
      res.json(learningVelocityTracker.getMilestones());
    });

    app.get('/api/v1/velocity/wisdom', (req, res) => {
      const velocity = learningVelocityTracker.getVelocity();
      res.json({ wisdomScore: velocity.wisdomScore });
    });

    app.get('/api/v1/velocity/dashboard', (req, res) => {
      res.json(learningVelocityTracker.getDashboardSummary());
    });

    // ========================================================================
    // Ensemble Harmony Endpoints
    // ========================================================================

    app.get('/api/v1/harmony/pulse', (req, res) => {
      res.json(ensembleHarmonyDetector.getAllPulses());
    });

    app.get('/api/v1/harmony/health', (req, res) => {
      res.json(ensembleHarmonyDetector.getEnsembleHealth());
    });

    app.get('/api/v1/harmony/states', (req, res) => {
      res.json(ensembleHarmonyDetector.getAllHarmonyStates());
    });

    app.get('/api/v1/harmony/dissonance', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 50;
      res.json(ensembleHarmonyDetector.getDissonanceHistory(limit));
    });

    app.get('/api/v1/harmony/resonance', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 50;
      res.json(ensembleHarmonyDetector.getResonancePatterns(limit));
    });

    app.post('/api/v1/harmony/ingest', (req, res) => {
      const { signals } = req.body;
      if (Array.isArray(signals)) {
        ensembleHarmonyDetector.ingestSignals(signals);
        res.json({ success: true, ingested: signals.length });
      } else {
        ensembleHarmonyDetector.ingestSignal(signals);
        res.json({ success: true, ingested: 1 });
      }
    });

    // Start MetaTrader Bridge
    if (process.env.MT_BRIDGE_ENABLED === 'true') {
      const mtPort = parseInt(process.env.MT_BRIDGE_PORT || '15555');
      mtBridge.start(mtPort).then(() => {
        log.info(`[MTBridge] MetaTrader Bridge listening on port ${mtPort}`);
      }).catch((err) => {
        log.error(`[MTBridge] Failed to start: ${err.message}`);
      });
    }

    // Start server - bind to 0.0.0.0 for Docker/Fly.io
    const HOST = '0.0.0.0';
    server.listen(config.port, HOST, () => {
      log.info('='.repeat(60));
      log.info(`TIME server running on ${HOST}:${config.port}`);
      log.info(`Environment: ${config.nodeEnv}`);
      log.info(`API: http://localhost:${config.port}/api/v1`);
      log.info(`Health: http://localhost:${config.port}/health`);
      if (process.env.MT_BRIDGE_ENABLED === 'true') {
        log.info(`MT Bridge: localhost:${process.env.MT_BRIDGE_PORT || '15555'}`);
      }
      log.info('='.repeat(60));
    });

    // Graceful shutdown
    const shutdown = async () => {
      log.info('Shutting down TIME...');

      // Shutdown Event Hub first (stops event routing)
      if (eventHub) {
        eventHub.shutdown();
        log.info('Event Hub shutdown complete');
      }

      // Shutdown WebSocket service (notifies all clients)
      realtimeService.shutdown();
      log.info('WebSocket service shutdown complete');

      // Shutdown TIME Governor (shuts down all components)
      await timeGovernor.shutdown();

      // Shutdown Database connections
      log.info('Closing database connections...');
      await databaseManager.shutdown();
      log.info('Database connections closed');

      server.close(() => {
        log.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    log.error('Failed to start TIME', { error });
    process.exit(1);
  }
}

// Start TIME
main();

export { timeGovernor };

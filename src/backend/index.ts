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

// Opportunity Scout (Legitimate Earnings System)
import { opportunityScout } from './scout/opportunity_scout';

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

  // Initialize TIME Governor (this initializes all components)
  await timeGovernor.initialize();

  log.info('='.repeat(60));
  log.info('TIME initialization complete');
  log.info(`Evolution Mode: ${timeGovernor.getEvolutionMode().toUpperCase()}`);
  log.info('='.repeat(60));
}

/**
 * Create Express application
 */
function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet());

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

  // Mount API Routes
  app.use('/api/v1', router);

  // Health check endpoint
  app.get('/health', (req, res) => {
    const health = timeGovernor.getSystemHealth();
    const metrics = timeGovernor.getMetrics();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      evolutionMode: metrics.evolutionMode,
      currentRegime: metrics.currentRegime,
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
        trades: '/api/v1/trades',
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

    // Start server
    server.listen(config.port, () => {
      log.info('='.repeat(60));
      log.info(`TIME server running on port ${config.port}`);
      log.info(`Environment: ${config.nodeEnv}`);
      log.info(`API: http://localhost:${config.port}/api/v1`);
      log.info(`Health: http://localhost:${config.port}/health`);
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

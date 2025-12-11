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
import { Server as SocketServer } from 'socket.io';

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

const log = loggers.api;

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

    // Create Socket.IO server for real-time updates
    const io = new SocketServer(server, {
      cors: {
        origin: config.frontend.corsOrigins,
        credentials: true,
      },
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      log.debug('Client connected', { socketId: socket.id });

      socket.on('subscribe', (channel: string) => {
        socket.join(channel);
        log.debug('Client subscribed to channel', {
          socketId: socket.id,
          channel,
        });
      });

      socket.on('disconnect', () => {
        log.debug('Client disconnected', { socketId: socket.id });
      });
    });

    // Forward TIME events to Socket.IO
    timeGovernor.on('evolution:mode_changed', (state) => {
      io.to('admin').emit('evolution:mode_changed', state);
    });

    timeGovernor.on('regime:changed', (regime) => {
      io.to('market').emit('regime:changed', regime);
    });

    timeGovernor.on('learning:insight', (insight) => {
      io.to('learning').emit('insight', insight);
    });

    timeGovernor.on('risk:alert', (alert) => {
      io.to('risk').emit('alert', alert);
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

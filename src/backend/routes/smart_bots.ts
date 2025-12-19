/**
 * Smart Bot API Routes
 *
 * Advanced intelligent bot features for TIMEBEUNUS.
 */

import { Router, Request, Response } from 'express';
import { smartBotService } from '../services/SmartBotService';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('SmartBotRoutes');

// Get all smart bots
router.get('/', (_req: Request, res: Response) => {
  try {
    const bots = smartBotService.getAllSmartBots().map(bot => ({
      ...bot,
      capabilityDescriptions: bot.capabilities.map(c => ({
        name: c,
        description: smartBotService.getCapabilityDescription(c),
      })),
    }));

    res.json({
      success: true,
      bots,
      count: bots.length,
    });
  } catch (error) {
    logger.error('Error getting smart bots', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get smart bots' });
  }
});

// Get specific smart bot
router.get('/:botId', (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    const bot = smartBotService.getSmartBot(botId);

    if (!bot) {
      return res.status(404).json({ error: 'Smart bot not found' });
    }

    res.json({
      success: true,
      bot: {
        ...bot,
        capabilityDescriptions: bot.capabilities.map(c => ({
          name: c,
          description: smartBotService.getCapabilityDescription(c),
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting smart bot', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get smart bot' });
  }
});

// Generate smart signal
router.post('/signal', (req: Request, res: Response) => {
  try {
    const { botId, symbol } = req.body;

    if (!botId || !symbol) {
      return res.status(400).json({ error: 'Bot ID and symbol are required' });
    }

    const signal = smartBotService.generateSmartSignal(botId, symbol);

    res.json({
      success: true,
      signal,
    });
  } catch (error) {
    logger.error('Error generating signal', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to generate signal' });
  }
});

// Update market conditions
router.post('/market-conditions', (req: Request, res: Response) => {
  try {
    const { trend, volatility, volume, sentiment, regime } = req.body;

    smartBotService.updateMarketConditions({
      trend,
      volatility,
      volume,
      sentiment,
      regime,
    });

    res.json({
      success: true,
      message: 'Market conditions updated, bots adapting',
    });
  } catch (error) {
    logger.error('Error updating conditions', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to update conditions' });
  }
});

// Initiate swarm task
router.post('/swarm', (req: Request, res: Response) => {
  try {
    const { type, botIds, target } = req.body;

    if (!type || !['attack', 'defend', 'scout', 'harvest'].includes(type)) {
      return res.status(400).json({ error: 'Valid task type is required (attack, defend, scout, harvest)' });
    }

    const allBots = smartBotService.getAllSmartBots().map(b => b.botId);
    const selectedBots = botIds || allBots.slice(0, 10);

    const task = smartBotService.initiateSwarmTask(type, selectedBots, target);

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    logger.error('Error initiating swarm', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to initiate swarm task' });
  }
});

// Get active swarm tasks
router.get('/swarm/active', (_req: Request, res: Response) => {
  try {
    const tasks = smartBotService.getActiveTasks();

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    logger.error('Error getting active tasks', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get active tasks' });
  }
});

// Self-optimize a bot
router.post('/optimize/:botId', (req: Request, res: Response) => {
  try {
    const { botId } = req.params;

    const result = smartBotService.selfOptimize(botId);

    res.json({
      success: result.success,
      changes: result.changes,
      message: result.success
        ? `Bot ${botId} optimized with ${result.changes.length} changes`
        : 'Bot cannot self-optimize (capability not enabled)',
    });
  } catch (error) {
    logger.error('Error optimizing bot', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to optimize bot' });
  }
});

// Process natural language command
router.post('/command', (req: Request, res: Response) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = smartBotService.processNaturalLanguage(command);

    res.json({
      success: result.success,
      action: result.action,
      response: result.response,
    });
  } catch (error) {
    logger.error('Error processing command', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to process command' });
  }
});

// Get capability descriptions
router.get('/capabilities', (_req: Request, res: Response) => {
  try {
    const capabilities = [
      'self_optimize',
      'market_adapt',
      'swarm_coordinate',
      'natural_language',
      'predict_future',
      'sentiment_read',
      'whale_track',
      'risk_adjust',
      'copy_success',
      'avoid_traps',
    ].map(c => ({
      name: c,
      description: smartBotService.getCapabilityDescription(c as any),
    }));

    res.json({
      success: true,
      capabilities,
    });
  } catch (error) {
    logger.error('Error getting capabilities', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get capabilities' });
  }
});

export default router;

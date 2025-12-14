/**
 * Bot Brain API Routes
 *
 * COMPLETE API for bot intelligence features:
 * - Auto-generation of bots from research
 * - Smart bot placement
 * - Multi-tasking management
 * - Bot breeding
 * - Bot evolution
 * - External rating verification
 * - Absorption approval buttons
 *
 * All endpoints designed to be called from frontend buttons!
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { botBrain, BotAbility, BotPersonality, BotTask } from '../bots/bot_brain';
import { botDropZone } from '../dropzone/bot_dropzone';
import { multiSourceFetcher, KNOWN_BOTS_BY_SOURCE } from '../fetcher/multi_source_fetcher';

const router = Router();

// ============================================================================
// PUBLIC ENDPOINTS (Dashboard Display)
// ============================================================================

/**
 * GET /bot-brain/stats
 * Get bot brain statistics for dashboard
 */
router.get('/stats', (req: Request, res: Response) => {
  const stats = botBrain.getStats();
  const dropzoneStatus = botDropZone.getStatus();

  res.json({
    success: true,
    stats,
    dropzone: dropzoneStatus,
    message: 'Bot Brain is thinking...',
  });
});

/**
 * GET /bot-brain/bots
 * List all intelligent bots
 */
router.get('/bots', (req: Request, res: Response) => {
  const { ability, personality, state } = req.query;

  let bots = botBrain.getAllBots();

  if (ability) {
    bots = bots.filter(b => b.abilities.includes(ability as BotAbility));
  }

  if (personality) {
    bots = bots.filter(b => b.personality === personality);
  }

  if (state) {
    bots = bots.filter(b => b.state === state);
  }

  res.json({
    success: true,
    total: bots.length,
    bots: bots.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      abilities: b.abilities,
      personality: b.personality,
      state: b.state,
      currentTaskCount: b.currentTasks.length,
      maxTasks: b.maxConcurrentTasks,
      ratings: b.ratings,
      generation: b.generation,
      canTrade: botBrain.canBotTrade(b.id),
    })),
  });
});

/**
 * GET /bot-brain/bots/:id
 * Get detailed bot info
 */
router.get('/bots/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const bot = botBrain.getBot(id);

  if (!bot) {
    return res.status(404).json({ success: false, error: 'Bot not found' });
  }

  res.json({
    success: true,
    bot,
  });
});

/**
 * GET /bot-brain/placements
 * Get all current bot placements
 */
router.get('/placements', (req: Request, res: Response) => {
  const placements = botBrain.getPlacements();
  const result: Record<string, any[]> = {};

  placements.forEach((p, area) => {
    result[area] = p.map(placement => ({
      ...placement,
      botName: botBrain.getBot(placement.botId)?.name || 'Unknown',
    }));
  });

  res.json({
    success: true,
    placements: result,
    totalAreas: placements.size,
  });
});

// ============================================================================
// BOT ABSORPTION BUTTONS - FRONTEND ACTIONS
// ============================================================================

/**
 * GET /bot-brain/pending-absorption
 * Get all bots pending absorption approval
 * Frontend can show these with APPROVE/REJECT buttons
 */
router.get('/pending-absorption', (req: Request, res: Response) => {
  const pendingFiles = botDropZone.getPendingFiles();

  // Also get discovered bots not yet absorbed
  const discoveredBots = multiSourceFetcher.getAllDiscoveredBots();
  const absorbedIds = new Set(multiSourceFetcher.getAbsorptionResults().map(r => r.botId));
  const pendingBots = discoveredBots.filter(b => !absorbedIds.has(b.id));

  res.json({
    success: true,
    pendingFiles: pendingFiles.map(f => ({
      id: f.id,
      filename: f.filename,
      status: f.status,
      droppedAt: f.droppedAt,
      actions: {
        approveUrl: `/api/v1/bot-brain/approve/${f.id}`,
        rejectUrl: `/api/v1/bot-brain/reject/${f.id}`,
      },
    })),
    pendingBots: pendingBots.slice(0, 50).map(b => ({
      id: b.id,
      name: b.name,
      source: b.source,
      rating: b.rating,
      price: b.price,
      actions: {
        absorbUrl: `/api/v1/bot-brain/absorb/${b.id}`,
        detailsUrl: `/api/v1/fetcher/bot-details/${b.id}`,
      },
    })),
    totalPendingFiles: pendingFiles.length,
    totalPendingBots: pendingBots.length,
    message: pendingFiles.length + pendingBots.length > 0
      ? `${pendingFiles.length + pendingBots.length} items awaiting your decision`
      : 'No pending items',
  });
});

/**
 * POST /bot-brain/approve/:fileId
 * BUTTON: Approve a pending file for absorption
 */
router.post('/approve/:fileId', authMiddleware, async (req: Request, res: Response) => {
  const { fileId } = req.params;

  try {
    const report = await botDropZone.approveAbsorption(fileId);

    if (report) {
      res.json({
        success: true,
        message: `Bot "${report.filename}" absorbed successfully!`,
        report,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'File not found or already processed',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /bot-brain/reject/:fileId
 * BUTTON: Reject a pending file
 */
router.post('/reject/:fileId', authMiddleware, async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const { reason } = req.body;

  try {
    await botDropZone.rejectAbsorption(fileId, reason || 'Rejected by user');

    res.json({
      success: true,
      message: 'Bot rejected',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /bot-brain/absorb/:botId
 * BUTTON: Absorb a discovered bot from the database
 */
router.post('/absorb/:botId', authMiddleware, async (req: Request, res: Response) => {
  const { botId } = req.params;

  try {
    const result = await multiSourceFetcher.absorbBot(botId);

    res.json({
      success: result.success,
      message: result.success
        ? `Bot "${result.name}" absorbed from ${result.source}!`
        : `Failed to absorb: ${result.error}`,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /bot-brain/absorb-all
 * BUTTON: Absorb ALL pending bots (mass absorption)
 */
router.post('/absorb-all', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { minRating = 4.0 } = req.body;

  try {
    // Start absorption in background
    const absorptionPromise = multiSourceFetcher.absorbAllFreeBots();

    res.json({
      success: true,
      message: 'Mass absorption started!',
      minRating,
      checkStatusAt: '/api/v1/bot-brain/absorption-status',
    });

    // Continue in background
    absorptionPromise.then(results => {
      console.log('[BotBrain] Mass absorption complete');
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /bot-brain/absorption-status
 * Check absorption progress
 */
router.get('/absorption-status', (req: Request, res: Response) => {
  const results = multiSourceFetcher.getAbsorptionResults();
  const stats = multiSourceFetcher.getStats();

  res.json({
    success: true,
    stats,
    recentResults: results.slice(-20),
    totalAbsorbed: stats.absorbed,
    totalDiscovered: stats.totalDiscovered,
  });
});

// ============================================================================
// BOT GENERATION BUTTONS
// ============================================================================

/**
 * POST /bot-brain/generate
 * BUTTON: Generate new bots from research
 */
router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const templates = await botBrain.generateBotsFromResearch();

    res.json({
      success: true,
      message: `Generated ${templates.length} new bot templates!`,
      templates,
      actions: templates.map(t => ({
        name: t.name,
        createUrl: `/api/v1/bot-brain/create-from-template`,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /bot-brain/templates
 * Get generated bot templates
 */
router.get('/templates', (req: Request, res: Response) => {
  const templates = botBrain.getGeneratedTemplates();

  res.json({
    success: true,
    templates,
    total: templates.length,
  });
});

/**
 * POST /bot-brain/create-from-template
 * BUTTON: Create a bot from a generated template
 */
router.post('/create-from-template', authMiddleware, async (req: Request, res: Response) => {
  const { templateIndex } = req.body;

  const templates = botBrain.getGeneratedTemplates();

  if (templateIndex === undefined || templateIndex >= templates.length) {
    return res.status(400).json({
      success: false,
      error: 'Invalid template index',
      availableTemplates: templates.length,
    });
  }

  try {
    const bot = botBrain.createBotFromTemplate(templates[templateIndex]);

    res.json({
      success: true,
      message: `Created bot "${bot.name}" from template!`,
      bot: {
        id: bot.id,
        name: bot.name,
        abilities: bot.abilities,
        personality: bot.personality,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// SMART PLACEMENT BUTTONS
// ============================================================================

/**
 * POST /bot-brain/smart-placement
 * BUTTON: Run smart placement algorithm
 */
router.post('/smart-placement', authMiddleware, async (req: Request, res: Response) => {
  try {
    const placements = await botBrain.smartPlacement();

    res.json({
      success: true,
      message: `Placed ${placements.length} bots in optimal positions!`,
      placements,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /bot-brain/place-bot
 * BUTTON: Manually place a bot
 */
router.post('/place-bot', authMiddleware, async (req: Request, res: Response) => {
  const { botId, area, role, tasks } = req.body;

  if (!botId || !area || !role) {
    return res.status(400).json({
      success: false,
      error: 'botId, area, and role are required',
    });
  }

  const placement = botBrain.placeBot(botId, area, role, tasks || []);

  if (!placement) {
    return res.status(404).json({
      success: false,
      error: 'Bot not found',
    });
  }

  res.json({
    success: true,
    message: `Bot placed in ${area} as ${role}`,
    placement,
  });
});

// ============================================================================
// TASK MANAGEMENT BUTTONS
// ============================================================================

/**
 * POST /bot-brain/assign-task
 * BUTTON: Assign a task to best available bot
 */
router.post('/assign-task', authMiddleware, async (req: Request, res: Response) => {
  const { type, priority, description, params } = req.body;

  if (!type || !description) {
    return res.status(400).json({
      success: false,
      error: 'type and description are required',
    });
  }

  try {
    const botId = await botBrain.assignTask({
      type,
      priority: priority || 'medium',
      description,
      params: params || {},
    });

    if (botId) {
      const bot = botBrain.getBot(botId);
      res.json({
        success: true,
        message: `Task assigned to "${bot?.name}"`,
        botId,
        botName: bot?.name,
      });
    } else {
      res.json({
        success: true,
        message: 'Task queued - waiting for available bot',
        queued: true,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /bot-brain/task-queue
 * Get current task queue
 */
router.get('/task-queue', (req: Request, res: Response) => {
  const queue = botBrain.getTaskQueue();

  res.json({
    success: true,
    queue,
    total: queue.length,
  });
});

/**
 * GET /bot-brain/bots/:id/tasks
 * Get tasks for a specific bot
 */
router.get('/bots/:id/tasks', (req: Request, res: Response) => {
  const { id } = req.params;
  const tasks = botBrain.getBotTasks(id);

  res.json({
    success: true,
    tasks,
    total: tasks.length,
  });
});

// ============================================================================
// BOT EVOLUTION BUTTONS
// ============================================================================

/**
 * POST /bot-brain/evolve/:botId
 * BUTTON: Evolve a specific bot
 */
router.post('/evolve/:botId', authMiddleware, async (req: Request, res: Response) => {
  const { botId } = req.params;

  try {
    const evolvedBot = await botBrain.evolveBot(botId);

    if (evolvedBot) {
      res.json({
        success: true,
        message: `"${evolvedBot.name}" evolved to generation ${evolvedBot.generation}!`,
        bot: {
          id: evolvedBot.id,
          name: evolvedBot.name,
          generation: evolvedBot.generation,
          mutations: evolvedBot.mutations,
          dna: evolvedBot.dna,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Bot not found',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// BOT BREEDING BUTTONS
// ============================================================================

/**
 * POST /bot-brain/breed
 * BUTTON: Breed two bots to create offspring
 */
router.post('/breed', authMiddleware, async (req: Request, res: Response) => {
  const { parent1Id, parent2Id, targetAbilities, targetPersonality, mutationRate } = req.body;

  if (!parent1Id || !parent2Id) {
    return res.status(400).json({
      success: false,
      error: 'parent1Id and parent2Id are required',
    });
  }

  try {
    const child = await botBrain.breedBots({
      parent1Id,
      parent2Id,
      targetAbilities,
      targetPersonality,
      mutationRate,
    });

    if (child) {
      res.json({
        success: true,
        message: `Created "${child.name}" from breeding!`,
        child: {
          id: child.id,
          name: child.name,
          parents: child.parents,
          generation: child.generation,
          abilities: child.abilities,
          personality: child.personality,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to breed bots - check parent IDs',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// EXTERNAL RATING VERIFICATION BUTTONS
// ============================================================================

/**
 * POST /bot-brain/verify-rating
 * BUTTON: Verify external rating before absorption
 */
router.post('/verify-rating', authMiddleware, async (req: Request, res: Response) => {
  const { source, url } = req.body;

  if (!source || !url) {
    return res.status(400).json({
      success: false,
      error: 'source and url are required',
      validSources: ['MQL5', 'GitHub', 'TradingView', 'MyFXBook', 'ForexFactory'],
    });
  }

  try {
    const rating = await botBrain.verifyExternalRating(source, url);

    if (rating) {
      res.json({
        success: true,
        message: `Verified ${source} rating: ${rating.rating.toFixed(1)}/5`,
        rating,
        meetsMinimum: rating.rating >= 4.0,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to verify rating',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * GET /bot-brain/config
 * Get Bot Brain configuration
 */
router.get('/config', authMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    config: botBrain.getConfig(),
  });
});

/**
 * PUT /bot-brain/config
 * Update Bot Brain configuration
 */
router.put('/config', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const updates = req.body;

  botBrain.updateConfig(updates);

  res.json({
    success: true,
    message: 'Configuration updated',
    config: botBrain.getConfig(),
  });
});

// ============================================================================
// QUICK ACTIONS - ONE-CLICK BUTTONS
// ============================================================================

/**
 * POST /bot-brain/quick/absorb-high-rated
 * BUTTON: One-click absorb all 4.5+ rated bots
 */
router.post('/quick/absorb-high-rated', authMiddleware, async (req: Request, res: Response) => {
  const highRated = multiSourceFetcher.getHighRatedBots(4.5);

  let absorbed = 0;
  for (const bot of highRated.slice(0, 20)) {
    try {
      const result = await multiSourceFetcher.absorbBot(bot.id);
      if (result.success) absorbed++;
    } catch {
      // Continue with next bot
    }
  }

  res.json({
    success: true,
    message: `Absorbed ${absorbed} high-rated bots!`,
    totalFound: highRated.length,
    absorbed,
  });
});

/**
 * POST /bot-brain/quick/optimize-placements
 * BUTTON: One-click optimize all bot placements
 */
router.post('/quick/optimize-placements', authMiddleware, async (req: Request, res: Response) => {
  const placements = await botBrain.smartPlacement();

  res.json({
    success: true,
    message: `Optimized ${placements.length} bot placements!`,
    placements,
  });
});

/**
 * POST /bot-brain/quick/generate-and-create
 * BUTTON: Generate templates and create best one
 */
router.post('/quick/generate-and-create', authMiddleware, async (req: Request, res: Response) => {
  const templates = await botBrain.generateBotsFromResearch();

  if (templates.length === 0) {
    return res.json({
      success: false,
      message: 'No new templates to generate',
    });
  }

  // Find best template by confidence
  const best = templates.sort((a, b) => b.confidence - a.confidence)[0];
  const bot = botBrain.createBotFromTemplate(best);

  res.json({
    success: true,
    message: `Generated and created "${bot.name}"!`,
    templatesGenerated: templates.length,
    createdBot: {
      id: bot.id,
      name: bot.name,
      abilities: bot.abilities,
    },
  });
});

// ============================================================================
// BULK AUTO SCAN FEATURE
// ============================================================================

// Storage for rejected bots with grace period
const rejectedBotsGracePeriod: Map<string, {
  fileId: string;
  filename: string;
  rejectedAt: Date;
  expiresAt: Date;
  reason: string;
  rating: number;
  strategyType: string[];
}> = new Map();

// Clean up expired bots every hour
setInterval(() => {
  const now = new Date();
  for (const [id, bot] of rejectedBotsGracePeriod) {
    if (now > bot.expiresAt) {
      rejectedBotsGracePeriod.delete(id);
      console.log(`[BotBrain] Expired rejected bot: ${bot.filename}`);
    }
  }
}, 60 * 60 * 1000);

/**
 * POST /bot-brain/bulk-scan
 * BUTTON: Bulk auto scan from all sources
 */
router.post('/bulk-scan', authMiddleware, async (req: Request, res: Response) => {
  const { sources, minRating = 4.0, maxResults = 50 } = req.body;

  const allSources = sources || ['github', 'mql5', 'ctrader', 'tradingview', 'npm'];

  let totalScanned = 0;
  let totalFound = 0;
  let totalAbsorbed = 0;
  const results: any[] = [];

  for (const source of allSources) {
    try {
      const bots = KNOWN_BOTS_BY_SOURCE[source] || [];
      const qualified = bots.filter((b: any) => b.rating >= minRating).slice(0, maxResults);

      totalScanned += bots.length;
      totalFound += qualified.length;

      for (const bot of qualified.slice(0, 10)) {
        try {
          const result = await multiSourceFetcher.absorbBot(bot.id);
          if (result.success) {
            totalAbsorbed++;
            results.push({
              source,
              name: bot.name,
              rating: bot.rating,
              status: 'absorbed',
            });
          }
        } catch {
          results.push({
            source,
            name: bot.name,
            rating: bot.rating,
            status: 'failed',
          });
        }
      }
    } catch (error) {
      console.error(`Bulk scan error for ${source}:`, error);
    }
  }

  res.json({
    success: true,
    message: `Bulk scan complete! Absorbed ${totalAbsorbed} bots`,
    stats: {
      sourcesScanned: allSources.length,
      totalScanned,
      qualifiedBots: totalFound,
      absorbed: totalAbsorbed,
    },
    results,
    nextActions: {
      viewAbsorbed: { method: 'GET', url: '/api/v1/bot-brain/bots' },
      runAgain: { method: 'POST', url: '/api/v1/bot-brain/bulk-scan' },
    },
  });
});

/**
 * POST /bot-brain/bulk-scan/sources
 * Get available sources for bulk scan
 */
router.get('/bulk-scan/sources', (req: Request, res: Response) => {
  const sources = Object.keys(KNOWN_BOTS_BY_SOURCE).map(source => ({
    id: source,
    name: source.charAt(0).toUpperCase() + source.slice(1),
    botCount: KNOWN_BOTS_BY_SOURCE[source]?.length || 0,
    highRatedCount: (KNOWN_BOTS_BY_SOURCE[source] || []).filter((b: any) => b.rating >= 4.0).length,
  }));

  res.json({
    success: true,
    sources,
    totalBots: sources.reduce((sum, s) => sum + s.botCount, 0),
    totalHighRated: sources.reduce((sum, s) => sum + s.highRatedCount, 0),
  });
});

// ============================================================================
// AUTONOMOUS MODE
// ============================================================================

let autonomousMode = {
  enabled: false,
  autoApprove: false,
  autoReject: false,
  minRatingForAutoApprove: 4.5,
  maxRatingForAutoReject: 3.0,
  scanInterval: 60 * 60 * 1000, // 1 hour
  lastScan: null as Date | null,
  botsApprovedAuto: 0,
  botsRejectedAuto: 0,
};

let autonomousScanTimer: NodeJS.Timeout | null = null;

/**
 * GET /bot-brain/autonomous
 * Get autonomous mode status
 */
router.get('/autonomous', authMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    autonomousMode,
    isRunning: autonomousScanTimer !== null,
  });
});

/**
 * POST /bot-brain/autonomous/enable
 * BUTTON: Enable autonomous mode
 */
router.post('/autonomous/enable', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { autoApprove = true, autoReject = true, minRating = 4.5, maxRatingReject = 3.0, scanIntervalMinutes = 60 } = req.body;

  autonomousMode.enabled = true;
  autonomousMode.autoApprove = autoApprove;
  autonomousMode.autoReject = autoReject;
  autonomousMode.minRatingForAutoApprove = minRating;
  autonomousMode.maxRatingForAutoReject = maxRatingReject;
  autonomousMode.scanInterval = scanIntervalMinutes * 60 * 1000;

  // Start autonomous scanning
  if (autonomousScanTimer) {
    clearInterval(autonomousScanTimer);
  }

  autonomousScanTimer = setInterval(async () => {
    console.log('[BotBrain] Running autonomous scan...');
    await runAutonomousScan();
  }, autonomousMode.scanInterval);

  // Run immediately
  runAutonomousScan();

  res.json({
    success: true,
    message: 'Autonomous mode ENABLED',
    settings: autonomousMode,
  });
});

/**
 * POST /bot-brain/autonomous/disable
 * BUTTON: Disable autonomous mode
 */
router.post('/autonomous/disable', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  autonomousMode.enabled = false;

  if (autonomousScanTimer) {
    clearInterval(autonomousScanTimer);
    autonomousScanTimer = null;
  }

  res.json({
    success: true,
    message: 'Autonomous mode DISABLED',
    stats: {
      botsApprovedAuto: autonomousMode.botsApprovedAuto,
      botsRejectedAuto: autonomousMode.botsRejectedAuto,
    },
  });
});

async function runAutonomousScan() {
  if (!autonomousMode.enabled) return;

  autonomousMode.lastScan = new Date();

  // Check pending bots
  const pending = botDropZone.getPendingFiles();

  for (const file of pending) {
    try {
      const report = await botDropZone.analyzeFile(file);

      if (autonomousMode.autoApprove && report.rating.overall >= autonomousMode.minRatingForAutoApprove) {
        // Auto-approve high-rated bots
        await botDropZone.approveBot(file.filename);
        autonomousMode.botsApprovedAuto++;
        console.log(`[Autonomous] Auto-approved: ${file.filename} (${report.rating.overall}/5)`);
      } else if (autonomousMode.autoReject && report.rating.overall <= autonomousMode.maxRatingForAutoReject) {
        // Move to grace period instead of immediate rejection
        const gracePeriodDays = 3;
        rejectedBotsGracePeriod.set(file.filename, {
          fileId: file.filename,
          filename: file.filename,
          rejectedAt: new Date(),
          expiresAt: new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000),
          reason: `Auto-rejected: Rating ${report.rating.overall}/5 below threshold`,
          rating: report.rating.overall,
          strategyType: report.strategyType || [],
        });
        autonomousMode.botsRejectedAuto++;
        console.log(`[Autonomous] Moved to grace period: ${file.filename} (expires in ${gracePeriodDays} days)`);
      }
    } catch (error) {
      console.error(`[Autonomous] Error processing ${file.filename}:`, error);
    }
  }
}

// ============================================================================
// REJECTION GRACE PERIOD (User can approve before deletion)
// ============================================================================

/**
 * GET /bot-brain/rejected
 * Get bots in rejection grace period (can still be approved)
 */
router.get('/rejected', authMiddleware, (req: Request, res: Response) => {
  const rejected = Array.from(rejectedBotsGracePeriod.values()).map(bot => ({
    ...bot,
    daysRemaining: Math.ceil((bot.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    actions: {
      approve: {
        method: 'POST',
        url: `/api/v1/bot-brain/rejected/${bot.fileId}/rescue`,
        label: 'Rescue & Approve',
      },
      delete: {
        method: 'DELETE',
        url: `/api/v1/bot-brain/rejected/${bot.fileId}`,
        label: 'Delete Now',
      },
    },
  }));

  res.json({
    success: true,
    total: rejected.length,
    rejected,
    message: rejected.length > 0
      ? `${rejected.length} bots pending deletion - review before they expire!`
      : 'No bots in grace period',
  });
});

/**
 * POST /bot-brain/rejected/:fileId/rescue
 * BUTTON: Rescue a rejected bot (approve it before deletion)
 */
router.post('/rejected/:fileId/rescue', authMiddleware, async (req: Request, res: Response) => {
  const { fileId } = req.params;

  const bot = rejectedBotsGracePeriod.get(fileId);
  if (!bot) {
    return res.status(404).json({
      success: false,
      error: 'Bot not found in grace period (may have expired)',
    });
  }

  try {
    // Approve the bot
    await botDropZone.approveBot(fileId);

    // Remove from grace period
    rejectedBotsGracePeriod.delete(fileId);

    res.json({
      success: true,
      message: `Rescued "${bot.filename}"! Bot has been approved and absorbed.`,
      bot: {
        filename: bot.filename,
        rating: bot.rating,
        wasScheduledFor: bot.expiresAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /bot-brain/rejected/:fileId
 * BUTTON: Permanently delete a rejected bot
 */
router.delete('/rejected/:fileId', authMiddleware, async (req: Request, res: Response) => {
  const { fileId } = req.params;

  const bot = rejectedBotsGracePeriod.get(fileId);
  if (!bot) {
    return res.status(404).json({
      success: false,
      error: 'Bot not found in grace period',
    });
  }

  try {
    await botDropZone.rejectBot(fileId, 'Manually deleted by user');
    rejectedBotsGracePeriod.delete(fileId);

    res.json({
      success: true,
      message: `Permanently deleted "${bot.filename}"`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /bot-brain/alerts
 * Get all alerts (rejected bots pending, etc.)
 */
router.get('/alerts', authMiddleware, (req: Request, res: Response) => {
  const alerts: any[] = [];

  // Rejected bots about to expire
  const rejected = Array.from(rejectedBotsGracePeriod.values());
  for (const bot of rejected) {
    const daysRemaining = Math.ceil((bot.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysRemaining <= 1) {
      alerts.push({
        type: 'urgent',
        title: 'Bot Expiring Soon!',
        message: `"${bot.filename}" will be deleted in ${daysRemaining} day(s)`,
        action: {
          method: 'POST',
          url: `/api/v1/bot-brain/rejected/${bot.fileId}/rescue`,
          label: 'Rescue Now',
        },
      });
    } else {
      alerts.push({
        type: 'warning',
        title: 'Bot Pending Deletion',
        message: `"${bot.filename}" (${bot.rating}/5) - ${daysRemaining} days remaining`,
        action: {
          method: 'POST',
          url: `/api/v1/bot-brain/rejected/${bot.fileId}/rescue`,
          label: 'Review',
        },
      });
    }
  }

  // Pending bots in dropzone
  const pending = botDropZone.getPendingFiles();
  if (pending.length > 0) {
    alerts.push({
      type: 'info',
      title: 'Bots Awaiting Approval',
      message: `${pending.length} bot(s) waiting for your approval`,
      action: {
        method: 'GET',
        url: '/api/v1/bot-brain/pending-absorption',
        label: 'Review',
      },
    });
  }

  // Autonomous mode status
  if (autonomousMode.enabled) {
    alerts.push({
      type: 'success',
      title: 'Autonomous Mode Active',
      message: `Auto-approved: ${autonomousMode.botsApprovedAuto}, Auto-rejected: ${autonomousMode.botsRejectedAuto}`,
    });
  }

  res.json({
    success: true,
    total: alerts.length,
    alerts,
  });
});

export default router;

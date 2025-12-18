/**
 * ML Training Pipeline Routes
 *
 * API endpoints for machine learning training and pattern recognition.
 */

import { Router, Request, Response } from 'express';
// Auth middleware import
const authMiddleware = async (req: Request, res: Response, next: Function) => {
  // Basic auth check - in production this would verify JWT
  const authHeader = req.headers.authorization;
  if (!authHeader && !req.headers['x-admin-key']) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};
import { mlTrainingPipeline, PATTERN_TEMPLATES } from '../ml/training_pipeline';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('MLRoutes');

// =========================================================================
// DATASETS
// =========================================================================

/**
 * GET /ml/datasets
 * List all training datasets
 */
router.get('/datasets', authMiddleware, async (req: Request, res: Response) => {
  try {
    const datasets = mlTrainingPipeline.getDatasets();
    res.json({
      success: true,
      datasets,
      total: datasets.length
    });
  } catch (error) {
    logger.error('Failed to get datasets', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get datasets' });
  }
});

/**
 * POST /ml/datasets/collect
 * Start collecting historical data for a new dataset
 */
router.post('/datasets/collect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbols, startDate, endDate, name } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ success: false, error: 'symbols array is required' });
    }

    const dataset = await mlTrainingPipeline.collectHistoricalData(
      symbols,
      new Date(startDate || Date.now() - 365 * 24 * 60 * 60 * 1000), // Default: 1 year ago
      new Date(endDate || Date.now()),
      name || `Dataset_${Date.now()}`
    );

    res.json({
      success: true,
      dataset,
      message: 'Data collection started. Check status with GET /ml/datasets/:id'
    });
  } catch (error) {
    logger.error('Failed to start data collection', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to start data collection' });
  }
});

// =========================================================================
// TRAINING JOBS
// =========================================================================

/**
 * GET /ml/jobs
 * List all training jobs
 */
router.get('/jobs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const jobs = mlTrainingPipeline.getJobs();
    res.json({
      success: true,
      jobs,
      total: jobs.length
    });
  } catch (error) {
    logger.error('Failed to get jobs', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get jobs' });
  }
});

/**
 * POST /ml/jobs/train
 * Start a new training job
 */
router.post('/jobs/train', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { datasetId, modelType, hyperparameters, name } = req.body;

    if (!datasetId) {
      return res.status(400).json({ success: false, error: 'datasetId is required' });
    }

    const validModelTypes = ['random_forest', 'gradient_boosting', 'lstm', 'transformer', 'ensemble', 'reinforcement_learning'];
    if (!validModelTypes.includes(modelType)) {
      return res.status(400).json({ success: false, error: `Invalid modelType. Valid types: ${validModelTypes.join(', ')}` });
    }

    const job = await mlTrainingPipeline.startTrainingJob(
      datasetId,
      modelType,
      hyperparameters || {},
      name || `Training_${modelType}_${Date.now()}`
    );

    res.json({
      success: true,
      job,
      message: 'Training job started. Check status with GET /ml/jobs/:id'
    });
  } catch (error) {
    logger.error('Failed to start training job', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to start training job' });
  }
});

// =========================================================================
// MODELS
// =========================================================================

/**
 * GET /ml/models
 * List all trained models
 */
router.get('/models', authMiddleware, async (req: Request, res: Response) => {
  try {
    const models = mlTrainingPipeline.getModels();
    res.json({
      success: true,
      models,
      total: models.length
    });
  } catch (error) {
    logger.error('Failed to get models', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get models' });
  }
});

/**
 * GET /ml/models/active
 * Get all active models
 */
router.get('/models/active', authMiddleware, async (req: Request, res: Response) => {
  try {
    const models = mlTrainingPipeline.getModels().filter(m => m.isActive);
    res.json({
      success: true,
      models,
      total: models.length
    });
  } catch (error) {
    logger.error('Failed to get active models', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get active models' });
  }
});

// =========================================================================
// PATTERNS
// =========================================================================

/**
 * GET /ml/patterns
 * List all pattern templates
 */
router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    let patterns = mlTrainingPipeline.getPatterns();

    if (category) {
      patterns = patterns.filter(p => p.category === category);
    }

    res.json({
      success: true,
      patterns,
      total: patterns.length,
      categories: ['reversal', 'continuation', 'breakout', 'momentum', 'volume', 'candlestick', 'harmonic']
    });
  } catch (error) {
    logger.error('Failed to get patterns', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get patterns' });
  }
});

/**
 * GET /ml/patterns/default
 * Get default pattern templates (50+)
 */
router.get('/patterns/default', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      patterns: PATTERN_TEMPLATES,
      total: PATTERN_TEMPLATES.length,
      breakdown: {
        reversal: PATTERN_TEMPLATES.filter(p => p.category === 'reversal').length,
        continuation: PATTERN_TEMPLATES.filter(p => p.category === 'continuation').length,
        breakout: PATTERN_TEMPLATES.filter(p => p.category === 'breakout').length,
        momentum: PATTERN_TEMPLATES.filter(p => p.category === 'momentum').length,
        volume: PATTERN_TEMPLATES.filter(p => p.category === 'volume').length,
        harmonic: PATTERN_TEMPLATES.filter(p => p.category === 'harmonic').length
      }
    });
  } catch (error) {
    logger.error('Failed to get default patterns', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get default patterns' });
  }
});

/**
 * POST /ml/patterns/detect
 * Detect patterns in provided market data
 */
router.post('/patterns/detect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol, bars } = req.body;

    if (!symbol || !bars || !Array.isArray(bars)) {
      return res.status(400).json({ success: false, error: 'symbol and bars array are required' });
    }

    const detectedPatterns = await mlTrainingPipeline.detectPatterns(symbol, bars);

    res.json({
      success: true,
      symbol,
      detectedPatterns,
      total: detectedPatterns.length
    });
  } catch (error) {
    logger.error('Failed to detect patterns', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to detect patterns' });
  }
});

// =========================================================================
// HEALTH
// =========================================================================

/**
 * GET /ml/health
 * Get ML pipeline health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = mlTrainingPipeline.getHealth();
    res.json({
      success: true,
      health,
      capabilities: {
        dataCollection: true,
        modelTraining: true,
        patternRecognition: true,
        predictionServing: true
      },
      supportedModels: [
        'random_forest',
        'gradient_boosting',
        'lstm',
        'transformer',
        'ensemble',
        'reinforcement_learning'
      ],
      patternCategories: [
        'reversal',
        'continuation',
        'breakout',
        'momentum',
        'volume',
        'candlestick',
        'harmonic'
      ]
    });
  } catch (error) {
    logger.error('Failed to get ML health', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get ML health' });
  }
});

export default router;

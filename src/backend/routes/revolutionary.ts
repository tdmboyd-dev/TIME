/**
 * TIME Revolutionary Systems API Routes
 *
 * API endpoints for accessing the never-before-seen trading systems
 */

import { Router, Request, Response } from 'express';
import {
  revolutionaryOrchestrator,
  quantumAlphaSynthesizer,
  sentimentVelocityEngine,
  darkPoolReconstructor,
  smartMoneyTracker,
  volatilitySurfaceTrader,
} from '../revolutionary';

const router = Router();

// ============================================================================
// Orchestrator Endpoints
// ============================================================================

/**
 * GET /api/revolutionary/status
 * Get status of all revolutionary systems
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = revolutionaryOrchestrator.getSystemStatus();
    res.json({
      success: true,
      data: status,
      message: 'Revolutionary systems operational',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/signal/:symbol
 * Get unified signal from all systems for a symbol
 */
router.get('/signal/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const signal = await revolutionaryOrchestrator.generateUnifiedSignal(symbol.toUpperCase());
    res.json({
      success: true,
      data: signal,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Quantum Alpha Synthesizer Endpoints
// ============================================================================

/**
 * GET /api/revolutionary/quantum/sources
 * Get all signal sources and their status
 */
router.get('/quantum/sources', (req: Request, res: Response) => {
  try {
    const sources = quantumAlphaSynthesizer.getSourceStatus();
    res.json({
      success: true,
      data: sources,
      count: sources.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/quantum/synthesize/:symbol
 * Synthesize alpha signal for a symbol
 */
router.get('/quantum/synthesize/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const synthesis = await quantumAlphaSynthesizer.synthesizeAlpha(symbol.toUpperCase());
    res.json({
      success: true,
      data: synthesis,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/revolutionary/quantum/update-signal
 * Update a signal source value
 */
router.post('/quantum/update-signal', (req: Request, res: Response) => {
  try {
    const { sourceId, signal, confidence } = req.body;
    quantumAlphaSynthesizer.updateSignal(sourceId, signal, confidence);
    res.json({
      success: true,
      message: `Signal ${sourceId} updated to ${signal}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/quantum/history
 * Get historical syntheses
 */
router.get('/quantum/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = quantumAlphaSynthesizer.getHistoricalSyntheses(limit);
    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Sentiment Velocity Engine Endpoints
// ============================================================================

/**
 * GET /api/revolutionary/sentiment/:symbol
 * Get sentiment velocity state for a symbol
 */
router.get('/sentiment/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const state = sentimentVelocityEngine.getState(symbol.toUpperCase());
    if (!state) {
      return res.status(404).json({ success: false, error: 'No sentiment data for symbol' });
    }
    res.json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/revolutionary/sentiment/ingest
 * Ingest sentiment data
 */
router.post('/sentiment/ingest', (req: Request, res: Response) => {
  try {
    const { symbol, sentiment, source, volume } = req.body;
    sentimentVelocityEngine.ingestSentiment(symbol.toUpperCase(), sentiment, source, volume);
    res.json({
      success: true,
      message: 'Sentiment ingested',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/sentiment/active-signals
 * Get all active sentiment signals
 */
router.get('/sentiment/active-signals', (req: Request, res: Response) => {
  try {
    const signals = sentimentVelocityEngine.getActiveSignals();
    res.json({
      success: true,
      data: signals,
      count: signals.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/sentiment/exhaustion-warnings
 * Get all exhaustion warnings
 */
router.get('/sentiment/exhaustion-warnings', (req: Request, res: Response) => {
  try {
    const warnings = sentimentVelocityEngine.getExhaustionWarnings();
    res.json({
      success: true,
      data: warnings,
      count: warnings.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Dark Pool Flow Reconstructor Endpoints
// ============================================================================

/**
 * GET /api/revolutionary/darkpool/:symbol
 * Get dark pool footprint for a symbol
 */
router.get('/darkpool/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const footprint = darkPoolReconstructor.getLatestFootprint(symbol.toUpperCase());
    if (!footprint) {
      return res.status(404).json({ success: false, error: 'No dark pool data for symbol' });
    }
    res.json({
      success: true,
      data: footprint,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/darkpool/high-probability
 * Get high probability institutional activity
 */
router.get('/darkpool/high-probability', (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.6;
    const activity = darkPoolReconstructor.getHighProbabilityActivity(threshold);
    res.json({
      success: true,
      data: activity,
      count: activity.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/darkpool/phases
 * Get all accumulation/distribution phases
 */
router.get('/darkpool/phases', (req: Request, res: Response) => {
  try {
    const phases = darkPoolReconstructor.getActivePhases();
    res.json({
      success: true,
      data: phases,
      count: phases.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/darkpool/volume-profile/:symbol
 * Get volume profile for a symbol
 */
router.get('/darkpool/volume-profile/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const levels = parseInt(req.query.levels as string) || 20;
    const profile = darkPoolReconstructor.getVolumeProfile(symbol.toUpperCase(), levels);
    res.json({
      success: true,
      data: profile,
      count: profile.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Smart Money Tracker Endpoints
// ============================================================================

/**
 * GET /api/revolutionary/smartmoney/:symbol
 * Get smart money consensus for a symbol
 */
router.get('/smartmoney/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const consensus = smartMoneyTracker.generateConsensus(symbol.toUpperCase());
    if (!consensus) {
      return res.status(404).json({ success: false, error: 'No smart money data for symbol' });
    }
    res.json({
      success: true,
      data: consensus,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/smartmoney/top-activity
 * Get top smart money activity
 */
router.get('/smartmoney/top-activity', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const activity = smartMoneyTracker.getTopActivity(limit);
    res.json({
      success: true,
      data: activity,
      count: activity.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/smartmoney/congress
 * Get recent congressional trades
 */
router.get('/smartmoney/congress', (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trades = smartMoneyTracker.getCongressionalTrades(days);
    res.json({
      success: true,
      data: trades,
      count: trades.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/smartmoney/suspicious
 * Get suspicious trades
 */
router.get('/smartmoney/suspicious', (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.6;
    const trades = smartMoneyTracker.getSuspiciousTrades(threshold);
    res.json({
      success: true,
      data: trades,
      count: trades.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/smartmoney/entities
 * Get all tracked entities
 */
router.get('/smartmoney/entities', (req: Request, res: Response) => {
  try {
    const entities = smartMoneyTracker.getAllEntities();
    res.json({
      success: true,
      data: entities,
      count: entities.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Volatility Surface Trader Endpoints
// ============================================================================

/**
 * GET /api/revolutionary/volatility/:symbol
 * Get volatility surface for a symbol
 */
router.get('/volatility/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const surface = volatilitySurfaceTrader.getSurface(symbol.toUpperCase());
    if (!surface) {
      return res.status(404).json({ success: false, error: 'No volatility surface for symbol' });
    }
    res.json({
      success: true,
      data: surface,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/volatility/anomalies
 * Get all detected volatility anomalies
 */
router.get('/volatility/anomalies', (req: Request, res: Response) => {
  try {
    const anomalies = volatilitySurfaceTrader.getAnomalies();
    res.json({
      success: true,
      data: anomalies,
      count: anomalies.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/volatility/high-iv
 * Get high IV opportunities (premium selling)
 */
router.get('/volatility/high-iv', (req: Request, res: Response) => {
  try {
    const minPercentile = parseInt(req.query.min as string) || 70;
    const opportunities = volatilitySurfaceTrader.getHighIVOpportunities(minPercentile);
    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/volatility/low-iv
 * Get low IV opportunities (premium buying)
 */
router.get('/volatility/low-iv', (req: Request, res: Response) => {
  try {
    const maxPercentile = parseInt(req.query.max as string) || 30;
    const opportunities = volatilitySurfaceTrader.getLowIVOpportunities(maxPercentile);
    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/volatility/trade/:symbol
 * Generate optimal volatility trade for a symbol
 */
router.get('/volatility/trade/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const bias = req.query.bias as 'bullish' | 'bearish' | 'neutral' | undefined;
    const trade = volatilitySurfaceTrader.generateTrade(symbol.toUpperCase(), bias);
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Unable to generate trade' });
    }
    res.json({
      success: true,
      data: trade,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/revolutionary/volatility/iv-crush/:symbol
 * Predict IV crush for earnings
 */
router.get('/volatility/iv-crush/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const earningsDate = req.query.earnings
      ? new Date(req.query.earnings as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const prediction = volatilitySurfaceTrader.predictIVCrush(symbol.toUpperCase(), earningsDate);
    if (!prediction) {
      return res.status(404).json({ success: false, error: 'Unable to predict IV crush' });
    }
    res.json({
      success: true,
      data: prediction,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

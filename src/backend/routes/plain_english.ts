/**
 * Plain English API Routes
 *
 * Translates all technical data into human-readable format.
 */

import { Router, Request, Response } from 'express';
import { plainEnglishService } from '../services/PlainEnglishService';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('PlainEnglishRoutes');

// Translate portfolio stats
router.post('/portfolio', (req: Request, res: Response) => {
  try {
    const { totalValue, dailyChange, dailyChangePercent, winRate, totalTrades } = req.body;

    const translation = plainEnglishService.translatePortfolio({
      totalValue: totalValue || 0,
      dailyChange: dailyChange || 0,
      dailyChangePercent: dailyChangePercent || 0,
      winRate,
      totalTrades,
    });

    res.json({
      success: true,
      translation,
    });
  } catch (error) {
    logger.error('Error translating portfolio', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to translate' });
  }
});

// Translate bot info
router.post('/bot', (req: Request, res: Response) => {
  try {
    const { name, category, strategy, expectedROI, risk, winRate, abilities } = req.body;

    const translation = plainEnglishService.translateBot({
      name: name || 'Unknown Bot',
      category: category || 'Unknown',
      strategy: strategy || 'unknown',
      expectedROI: expectedROI || 0,
      risk: risk || 'Medium',
      winRate,
      abilities,
    });

    res.json({
      success: true,
      translation,
    });
  } catch (error) {
    logger.error('Error translating bot', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to translate' });
  }
});

// Translate market conditions
router.post('/market', (req: Request, res: Response) => {
  try {
    const { trend, volatility, fearGreedIndex, topMovers } = req.body;

    const translation = plainEnglishService.translateMarket({
      trend: trend || 'neutral',
      volatility: volatility || 'medium',
      fearGreedIndex,
      topMovers,
    });

    res.json({
      success: true,
      translation,
    });
  } catch (error) {
    logger.error('Error translating market', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to translate' });
  }
});

// Translate trade
router.post('/trade', (req: Request, res: Response) => {
  try {
    const { symbol, side, quantity, price, pnl, botName } = req.body;

    const translation = plainEnglishService.translateTrade({
      symbol: symbol || 'UNKNOWN',
      side: side || 'buy',
      quantity: quantity || 0,
      price: price || 0,
      pnl,
      botName,
    });

    res.json({
      success: true,
      translation,
    });
  } catch (error) {
    logger.error('Error translating trade', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to translate' });
  }
});

// Get quick summary
router.post('/summary', (req: Request, res: Response) => {
  try {
    const { portfolioValue, dailyPnL, activeBots, openPositions } = req.body;

    const summary = plainEnglishService.getQuickSummary({
      portfolioValue: portfolioValue || 0,
      dailyPnL: dailyPnL || 0,
      activeBots: activeBots || 0,
      openPositions: openPositions || 0,
    });

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error('Error getting summary', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// Process natural language command
router.post('/command', (req: Request, res: Response) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = plainEnglishService.processCommand(command);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error processing command', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to process command' });
  }
});

export default router;

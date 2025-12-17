/**
 * TIME API Routes Index
 *
 * Aggregates all route modules for the Express app.
 */

import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import botRoutes from './bots';
import strategyRoutes from './strategies';
import adminRoutes from './admin';
import socialRoutes from './social';
import assetsRoutes from './assets';
import marketDataRoutes from './market_data';
import defiMasteryRoutes from './defi_mastery';
import riskProfileRoutes from './risk_profile';
import fetcherRoutes from './fetcher';
import paymentsRoutes from './payments';
import universalBotsRoutes from './universal_bots';
import advancedBrokerRoutes from './advanced_broker';
import realMarketRoutes from './real_market_api';
import revolutionaryRoutes from './revolutionary';
import fmpRoutes from './fmp';
import fredRoutes from './fred';
import twelveDataRoutes from './twelvedata';
import alertsRoutes from './alertsRoutes';
import tradingModeRoutes from './tradingMode';
import tradingRoutes from './trading';
import portfolioRoutes from './portfolio';

// NEW! Vanguard-Level Systems
import securityRoutes from './security';
import taxRoutes from './tax';
import transfersRoutes from './transfers';
import roboRoutes from './robo';

// NEW! Full-Featured Routes (No More Stubs!)
import chartsRoutes from './charts';
import learnRoutes from './learn';
import visionRoutes from './vision';
import retirementRoutes from './retirement';

// BOT BRAIN & AUTO PERFECT BOT GENERATOR - Never-Before-Seen Features!
import botBrainRoutes from './bot_brain';
import autoPerfectBotRoutes from './auto_perfect_bot';

// NEW! Bot Marketplace & Backtesting
import marketplaceRoutes from './marketplace';
import backtestRoutes from './backtest';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/bots', botRoutes);
router.use('/strategies', strategyRoutes);
router.use('/admin', adminRoutes);
router.use('/social', socialRoutes);
router.use('/assets', assetsRoutes);
router.use('/market', marketDataRoutes);
router.use('/defi', defiMasteryRoutes);
router.use('/risk', riskProfileRoutes);
router.use('/fetcher', fetcherRoutes);
router.use('/payments', paymentsRoutes);
router.use('/universal-bots', universalBotsRoutes);
router.use('/advanced-broker', advancedBrokerRoutes);
router.use('/real-market', realMarketRoutes);
router.use('/revolutionary', revolutionaryRoutes);

// NEW! Premium Data APIs
router.use('/fmp', fmpRoutes);           // Financial Modeling Prep - Fundamentals, Congress trades
router.use('/fred', fredRoutes);         // Federal Reserve - Economic data
router.use('/twelvedata', twelveDataRoutes); // TwelveData - Technical indicators

// BIG MOVES ALERT SYSTEM & AI TRADE GOD BOT
router.use('/alerts', alertsRoutes);     // Whale alerts, government policy, institutional moves, AI bot trading

// TRADING MODE - Practice/Live Toggle
router.use('/trading-mode', tradingModeRoutes);  // Practice/Live mode toggle for all brokers

// LIVE BOT TRADING - Execute trades from bots!
router.use('/trading', tradingRoutes);  // Start/stop bots, execute signals, track P&L

// PORTFOLIO - Real positions and broker data
router.use('/portfolio', portfolioRoutes);  // Real portfolio positions, broker status, trades

// NEW! VANGUARD-LEVEL SYSTEMS - Rivaling Major Brokerages
router.use('/security', securityRoutes);  // MFA, API keys, audit logging
router.use('/tax', taxRoutes);            // Tax-loss harvesting, wash sale tracking
router.use('/transfers', transfersRoutes); // ACATS transfers, account moves
router.use('/robo', roboRoutes);          // Robo-advisory, goal-based investing

// NEW! Full-Featured Routes
router.use('/charts', chartsRoutes);        // Real candlestick data, indicators, patterns
router.use('/learn', learnRoutes);          // Educational content, trading courses
router.use('/vision', visionRoutes);        // Market Vision Engine outputs
router.use('/retirement', retirementRoutes); // IRA, 401k, RMD tracking

// BOT BRAIN & AUTO PERFECT BOT GENERATOR - Never-Before-Seen Features!
router.use('/bot-brain', botBrainRoutes);              // Bot Intelligence: generation, placement, multi-tasking
router.use('/auto-perfect-bot', autoPerfectBotRoutes); // Auto-watches everything, learns, generates perfect bots

// NEW! Bot Marketplace & Backtesting
router.use('/marketplace', marketplaceRoutes);  // Bot rental marketplace - rent bots from $5/day
router.use('/backtest', backtestRoutes);        // Industry-standard backtesting with Monte Carlo

export default router;

// Re-export middleware
export { authMiddleware, adminMiddleware, ownerMiddleware } from './auth';

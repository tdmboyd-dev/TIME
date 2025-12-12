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

export default router;

// Re-export middleware
export { authMiddleware, adminMiddleware, ownerMiddleware } from './auth';

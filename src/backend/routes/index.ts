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

export default router;

// Re-export middleware
export { authMiddleware, adminMiddleware, ownerMiddleware } from './auth';

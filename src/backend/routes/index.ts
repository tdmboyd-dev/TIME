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

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/bots', botRoutes);
router.use('/strategies', strategyRoutes);
router.use('/admin', adminRoutes);

export default router;

// Re-export middleware
export { authMiddleware, adminMiddleware, ownerMiddleware } from './auth';

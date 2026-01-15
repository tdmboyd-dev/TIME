/**
 * Authentication Middleware for TIME
 *
 * Provides authentication and authorization middleware for protected routes.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('AuthMiddleware');

// JWT_SECRET must be set in production - no fallback allowed
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET_VALUE = JWT_SECRET || 'dev-only-secret-not-for-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier: string;
  };
}

/**
 * Verify JWT token and attach user to request
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Also check cookies
  const cookieToken = req.cookies?.time_auth_token;

  const finalToken = token || cookieToken;

  if (!finalToken) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(finalToken, JWT_SECRET_VALUE) as any;
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      tier: decoded.tier || 'free',
    };
    next();
  } catch (error) {
    logger.warn('Invalid token', { error });
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication - attaches user if token present, continues otherwise
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies?.time_auth_token;
  const finalToken = token || cookieToken;

  if (finalToken) {
    try {
      const decoded = jwt.verify(finalToken, JWT_SECRET_VALUE) as any;
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        tier: decoded.tier || 'free',
      };
    } catch {
      // Token invalid, but continue without user
    }
  }

  next();
}

/**
 * Require admin role
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Require specific tier or higher
 */
export function requireTier(minTier: 'free' | 'basic' | 'premium') {
  const tierOrder = { free: 0, basic: 1, premium: 2 };

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userTierLevel = tierOrder[req.user.tier as keyof typeof tierOrder] || 0;
    const requiredTierLevel = tierOrder[minTier];

    if (userTierLevel < requiredTierLevel) {
      res.status(403).json({
        error: `${minTier} tier or higher required`,
        currentTier: req.user.tier,
        requiredTier: minTier,
      });
      return;
    }

    next();
  };
}

export default authenticateToken;

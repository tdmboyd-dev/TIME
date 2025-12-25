/**
 * TIME BEYOND US - Proper Admin Authentication
 *
 * Replaces hardcoded admin key with:
 * 1. JWT-based admin tokens
 * 2. Role-based access control
 * 3. Session management
 * 4. Audit logging
 *
 * Admin Roles:
 * - OWNER: Full access (Timebeunus Boyd)
 * - SUPER_ADMIN: All admin features
 * - ADMIN: User management, bot control
 * - MODERATOR: Content moderation, support
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { userRepository, auditLogRepository } from '../database/repositories';
import { getSecret } from '../config/secrets_manager';

// =============================================================================
// TYPES
// =============================================================================

export type AdminRole = 'OWNER' | 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: string[];
  lastLogin: Date;
  mfaEnabled: boolean;
}

export interface AdminSession {
  adminId: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  iat: number;
  exp: number;
  sessionId: string;
  ipAddress: string;
}

// Permission definitions by role
const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  OWNER: ['*'], // Full access
  SUPER_ADMIN: [
    'admin:users',
    'admin:bots',
    'admin:billing',
    'admin:system',
    'admin:analytics',
    'admin:support',
    'trading:all',
    'view:all',
  ],
  ADMIN: [
    'admin:users',
    'admin:bots',
    'admin:support',
    'admin:analytics',
    'view:all',
  ],
  MODERATOR: [
    'admin:support',
    'view:users',
    'view:bots',
  ],
};

// Active sessions (use Redis in production)
const activeSessions = new Map<string, AdminSession>();

// =============================================================================
// JWT FUNCTIONS
// =============================================================================

/**
 * Get JWT secret from secrets manager or environment
 */
function getJWTSecret(): string {
  const secret = getSecret('ADMIN_SECRET_KEY') || process.env.ADMIN_SECRET_KEY || process.env.JWT_SECRET;
  if (!secret || secret === 'time-beyond-us-admin-2025') {
    // Generate a secure random secret if not configured
    logger.warn('[AdminAuth] Using fallback JWT secret - configure ADMIN_SECRET_KEY in production!');
    return 'time-beyond-us-' + crypto.randomBytes(32).toString('hex');
  }
  return secret;
}

/**
 * Generate admin JWT token
 */
export function generateAdminToken(admin: AdminUser, ipAddress: string): string {
  const sessionId = crypto.randomUUID();
  const permissions = ROLE_PERMISSIONS[admin.role];

  const payload: Omit<AdminSession, 'iat' | 'exp'> = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    permissions,
    sessionId,
    ipAddress,
  };

  const token = jwt.sign(payload, getJWTSecret(), {
    expiresIn: '8h', // Admin sessions expire in 8 hours
    issuer: 'time-beyond-us',
    audience: 'admin-portal',
  });

  // Store session
  const session: AdminSession = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  };
  activeSessions.set(sessionId, session);

  logger.info(`[AdminAuth] Admin token generated for ${admin.email} (${admin.role})`);

  return token;
}

/**
 * Verify admin JWT token
 */
export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const decoded = jwt.verify(token, getJWTSecret(), {
      issuer: 'time-beyond-us',
      audience: 'admin-portal',
    }) as AdminSession;

    // Check if session is still active
    const session = activeSessions.get(decoded.sessionId);
    if (!session) {
      logger.warn(`[AdminAuth] Session not found: ${decoded.sessionId}`);
      return null;
    }

    return decoded;
  } catch (error: any) {
    logger.warn(`[AdminAuth] Token verification failed: ${error.message}`);
    return null;
  }
}

/**
 * Revoke admin session
 */
export function revokeAdminSession(sessionId: string): boolean {
  if (activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
    logger.info(`[AdminAuth] Session revoked: ${sessionId}`);
    return true;
  }
  return false;
}

/**
 * Revoke all sessions for an admin
 */
export function revokeAllAdminSessions(adminId: string): number {
  let count = 0;
  activeSessions.forEach((session, id) => {
    if (session.adminId === adminId) {
      activeSessions.delete(id);
      count++;
    }
  });
  logger.info(`[AdminAuth] Revoked ${count} sessions for admin ${adminId}`);
  return count;
}

// =============================================================================
// ADMIN LOGIN
// =============================================================================

interface AdminLoginResult {
  success: boolean;
  token?: string;
  admin?: AdminUser;
  error?: string;
  requiresMfa?: boolean;
}

/**
 * Admin login
 */
export async function adminLogin(
  email: string,
  password: string,
  mfaCode: string | undefined,
  ipAddress: string
): Promise<AdminLoginResult> {
  try {
    // Find admin user
    const user = await userRepository.findByEmail(email);

    if (!user) {
      await auditLogRepository.log('admin', 'login_failed', { email, reason: 'user_not_found' }, { success: false });
      return { success: false, error: 'Invalid credentials' };
    }

    // Check if user has admin role
    if (!['admin', 'owner', 'co-admin'].includes(user.role)) {
      await auditLogRepository.log('admin', 'login_failed', { email, reason: 'not_admin' }, { success: false });
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    if (!user.passwordHash) {
      return { success: false, error: 'Account not configured for password login' };
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      await auditLogRepository.log('admin', 'login_failed', { email, reason: 'wrong_password' }, { success: false });
      return { success: false, error: 'Invalid credentials' };
    }

    // Check MFA if enabled
    if (user.mfaEnabled || user.settings?.mfaEnabled) {
      if (!mfaCode) {
        return { success: false, requiresMfa: true };
      }

      // Verify MFA (simplified - would use actual TOTP verification)
      // In production, use speakeasy or similar
      const mfaSecret = user.mfaSecret || user.settings?.mfaSecret;
      if (mfaSecret) {
        // TODO: Verify TOTP code
        // const valid = speakeasy.totp.verify({ secret: mfaSecret, encoding: 'base32', token: mfaCode });
        // if (!valid) return { success: false, error: 'Invalid MFA code' };
      }
    }

    // Map database role to AdminRole
    let adminRole: AdminRole;
    switch (user.role) {
      case 'owner':
        adminRole = 'OWNER';
        break;
      case 'co-admin':
        adminRole = 'SUPER_ADMIN';
        break;
      case 'admin':
        adminRole = 'ADMIN';
        break;
      default:
        adminRole = 'MODERATOR';
    }

    const admin: AdminUser = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: adminRole,
      permissions: ROLE_PERMISSIONS[adminRole],
      lastLogin: new Date(),
      mfaEnabled: user.mfaEnabled || user.settings?.mfaEnabled || false,
    };

    // Generate token
    const token = generateAdminToken(admin, ipAddress);

    // Update last login
    await userRepository.update(user._id, { lastLogin: new Date() });

    // Audit log
    await auditLogRepository.log('admin', 'login_success', {
      adminId: user._id,
      email: user.email,
      role: adminRole,
      ipAddress,
    }, { success: true, userId: user._id });

    logger.info(`[AdminAuth] Admin login successful: ${email} (${adminRole})`);

    return { success: true, token, admin };
  } catch (error: any) {
    logger.error('[AdminAuth] Login error:', error);
    return { success: false, error: 'Login failed' };
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Admin authentication middleware
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Get token from header or cookie
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies?.admin_token;

  if (!token) {
    res.status(401).json({ error: 'Admin authentication required' });
    return;
  }

  const session = verifyAdminToken(token);
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired admin session' });
    return;
  }

  // Attach admin session to request
  (req as any).adminSession = session;
  next();
}

/**
 * Permission check middleware
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = (req as any).adminSession as AdminSession | undefined;

    if (!session) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    // OWNER has all permissions
    if (session.role === 'OWNER' || session.permissions.includes('*')) {
      next();
      return;
    }

    // Check specific permission
    if (session.permissions.includes(permission)) {
      next();
      return;
    }

    // Check wildcard permissions (e.g., 'admin:*' matches 'admin:users')
    const [category] = permission.split(':');
    if (session.permissions.includes(`${category}:*`)) {
      next();
      return;
    }

    logger.warn(`[AdminAuth] Permission denied: ${session.email} tried to access ${permission}`);
    res.status(403).json({ error: 'Permission denied' });
  };
}

/**
 * Owner-only middleware
 */
export function ownerOnly(req: Request, res: Response, next: NextFunction): void {
  const session = (req as any).adminSession as AdminSession | undefined;

  if (!session || session.role !== 'OWNER') {
    res.status(403).json({ error: 'Owner access required' });
    return;
  }

  next();
}

// =============================================================================
// ADMIN ROUTES HELPER
// =============================================================================

/**
 * Get current admin from request
 */
export function getCurrentAdmin(req: Request): AdminSession | null {
  return (req as any).adminSession || null;
}

/**
 * Get all active admin sessions (for monitoring)
 */
export function getActiveSessions(): AdminSession[] {
  return Array.from(activeSessions.values());
}

/**
 * Clean expired sessions
 */
export function cleanExpiredSessions(): number {
  const now = Math.floor(Date.now() / 1000);
  let cleaned = 0;

  activeSessions.forEach((session, id) => {
    if (session.exp < now) {
      activeSessions.delete(id);
      cleaned++;
    }
  });

  if (cleaned > 0) {
    logger.info(`[AdminAuth] Cleaned ${cleaned} expired sessions`);
  }

  return cleaned;
}

// Run cleanup every hour
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

export default {
  adminLogin,
  generateAdminToken,
  verifyAdminToken,
  revokeAdminSession,
  revokeAllAdminSessions,
  adminAuthMiddleware,
  requirePermission,
  ownerOnly,
  getCurrentAdmin,
  getActiveSessions,
  cleanExpiredSessions,
};

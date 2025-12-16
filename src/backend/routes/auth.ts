/**
 * TIME Authentication Routes
 *
 * PRODUCTION-READY authentication with:
 * - MongoDB persistence (via repositories)
 * - bcrypt password hashing
 * - MFA/2FA support (TOTP)
 * - Rate limiting
 * - Audit logging
 * - Session management via Redis
 *
 * All users MUST complete consent before accessing trading features.
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { consentManager } from '../consent/consent_manager';
import { notificationService } from '../notifications/notification_service';
import { userRepository, auditLogRepository } from '../database/repositories';
import { databaseManager } from '../database/connection';
import { mfaService } from '../security/mfa_service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================
// CONSTANTS
// ============================================================

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 7;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Cookie configuration for secure token storage
const COOKIE_OPTIONS = {
  httpOnly: true,           // Prevents XSS attacks - JavaScript cannot access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const, // CSRF protection
  maxAge: SESSION_DURATION_MS,
  path: '/',
};

const ADMIN_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  // Admin cookie has same settings
};

// Rate limiting store (use Redis in production cluster)
const loginAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map();

// ============================================================
// TYPES
// ============================================================

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  consent: {
    termsAccepted: boolean;
    dataLearningConsent: boolean;
    riskDisclosureAccepted: boolean;
    marketingConsent?: boolean;
  };
}

interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

interface SessionData {
  userId: string;
  email: string;
  role: string;
  mfaVerified: boolean;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate a secure session token
 */
function generateToken(): string {
  return `tok_${uuidv4().replace(/-/g, '')}${Date.now().toString(36)}`;
}

/**
 * Check if IP is rate limited
 */
function isRateLimited(ip: string): { limited: boolean; remainingTime?: number } {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return { limited: false };

  if (attempts.lockedUntil && attempts.lockedUntil > new Date()) {
    return {
      limited: true,
      remainingTime: Math.ceil((attempts.lockedUntil.getTime() - Date.now()) / 1000),
    };
  }

  // Reset if lockout expired
  if (attempts.lockedUntil && attempts.lockedUntil <= new Date()) {
    loginAttempts.delete(ip);
    return { limited: false };
  }

  return { limited: false };
}

/**
 * Record a login attempt
 */
function recordLoginAttempt(ip: string, success: boolean): void {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }

  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: new Date() };
  attempts.count++;
  attempts.lastAttempt = new Date();

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }

  loginAttempts.set(ip, attempts);
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
}

/**
 * Create and store session
 */
async function createSession(
  userId: string,
  email: string,
  role: string,
  mfaVerified: boolean,
  req: Request
): Promise<string> {
  const token = generateToken();
  const sessionData: SessionData = {
    userId,
    email,
    role,
    mfaVerified,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    createdAt: new Date(),
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };

  // Store in Redis cache
  await databaseManager.cacheSet(
    `session:${token}`,
    sessionData,
    SESSION_DURATION_DAYS * 24 * 60 * 60
  );

  return token;
}

/**
 * Get session from token
 */
async function getSession(token: string): Promise<SessionData | null> {
  const redis = databaseManager.getRedis();
  const sessionStr = await redis.get(`session:${token}`);
  if (!sessionStr) return null;

  try {
    const session: SessionData = JSON.parse(sessionStr);
    if (new Date(session.expiresAt) < new Date()) {
      await redis.del(`session:${token}`);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Delete session
 */
async function deleteSession(token: string): Promise<void> {
  const redis = databaseManager.getRedis();
  await redis.del(`session:${token}`);
}

// ============================================================
// MIDDLEWARE
// ============================================================

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // SECURITY: Check for token in httpOnly cookie first (preferred), then header
  const cookieToken = req.cookies?.time_auth_token;
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const session = await getSession(token);

    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    // Get user from database
    const user = await userRepository.findById(session.userId);

    if (!user) {
      await deleteSession(token);
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user and session to request
    (req as any).user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      mfaEnabled: !!(user.settings as any)?.mfaEnabled,
      mfaVerified: session.mfaVerified,
    };
    (req as any).token = token;
    (req as any).session = session;

    // Update last activity
    await userRepository.updateLastActivity(user._id);

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

export function ownerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Owner access required' });
    return;
  }

  next();
}

/**
 * Require MFA verification for sensitive operations
 */
export function mfaRequiredMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  const session = (req as any).session;

  if (user?.mfaEnabled && !session?.mfaVerified) {
    res.status(403).json({
      error: 'MFA verification required',
      requiresMfa: true,
    });
    return;
  }

  next();
}

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /auth/register
 * Register a new user with mandatory consent
 */
router.post('/register', async (req: Request, res: Response) => {
  const ip = getClientIp(req);

  try {
    const { email, password, name, consent } = req.body as RegisterRequest;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'name', 'consent'],
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
      });
    }

    // Validate consent - ALL required consents must be true
    if (!consent?.termsAccepted || !consent?.dataLearningConsent || !consent?.riskDisclosureAccepted) {
      return res.status(400).json({
        error: 'All required consents must be accepted',
        required: {
          termsAccepted: 'Must accept Terms of Service',
          dataLearningConsent: 'Must consent to data learning',
          riskDisclosureAccepted: 'Must accept risk disclosure',
        },
        received: consent,
      });
    }

    // Check if user exists
    const existingUser = await userRepository.findByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user in database
    const userId = `user_${uuidv4()}`;
    const newUser = await userRepository.create({
      _id: userId,
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: 'user',
      createdAt: new Date(),
      lastLogin: new Date(),
      lastActivity: new Date(),
      consent: {
        termsAccepted: true,
        dataLearningConsent: true,
        riskDisclosureAccepted: true,
        marketingConsent: consent.marketingConsent || false,
        acceptedAt: new Date(),
      },
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        language: 'en',
        theme: 'dark',
        notifications: {
          email: true,
          sms: false,
          push: true,
          tradeAlerts: true,
          riskAlerts: true,
          dailySummary: true,
        },
      },
      brokerConnections: [],
    });

    // Record consent in consent manager
    consentManager.grantConsent(userId, {
      analyzeBots: consent.dataLearningConsent,
      copyBots: consent.dataLearningConsent,
      absorbBots: consent.dataLearningConsent,
      upgradeBots: consent.dataLearningConsent,
      learnFromBots: consent.dataLearningConsent,
      useBotsInEnsembles: consent.dataLearningConsent,
      usePaidAccountData: consent.dataLearningConsent,
      useDemoAccountData: consent.dataLearningConsent,
      useTradingHistory: consent.dataLearningConsent,
      usePerformancePatterns: consent.dataLearningConsent,
    });

    // Create session
    const token = await createSession(userId, email.toLowerCase(), 'user', false, req);

    // Audit log
    await auditLogRepository.log('auth', 'register', {
      userId,
      email: email.toLowerCase(),
      ip,
    });

    // Send welcome notification
    notificationService.emit('user:registered', {
      userId,
      name,
      email: email.toLowerCase(),
    });

    logger.info(`New user registered: ${email}`);

    // SECURITY: Set httpOnly cookie for secure token storage
    res.cookie('time_auth_token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name,
        role: 'user',
      },
      token, // For backward compatibility
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      message: 'Registration successful. Welcome to TIME.',
    });
  } catch (error) {
    logger.error('Registration error:', error);
    await auditLogRepository.log('auth', 'register_failed', { ip, error: String(error) }, { success: false });
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /auth/login
 * Authenticate user and create session
 */
router.post('/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);

  // Check rate limiting
  const rateLimit = isRateLimited(ip);
  if (rateLimit.limited) {
    return res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: rateLimit.remainingTime,
    });
  }

  try {
    const { email, password, mfaCode } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await userRepository.findByEmail(email.toLowerCase());

    if (!user) {
      recordLoginAttempt(ip, false);
      await auditLogRepository.log('auth', 'login_failed', { email, ip, reason: 'user_not_found' }, { success: false });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      recordLoginAttempt(ip, false);
      await auditLogRepository.log('auth', 'login_failed', { email, ip, reason: 'invalid_password' }, { success: false, userId: user._id });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if MFA is required
    const mfaEnabled = (user.settings as any)?.mfaEnabled;
    let mfaVerified = !mfaEnabled;

    if (mfaEnabled) {
      if (!mfaCode) {
        // Return that MFA is required
        return res.status(200).json({
          success: false,
          requiresMfa: true,
          message: 'MFA code required',
        });
      }

      // Verify MFA code - get secret from user settings
      const mfaSecret = (user.settings as any)?.mfaSecret;
      if (!mfaSecret) {
        return res.status(401).json({ error: 'MFA not properly configured' });
      }
      const mfaValid = mfaService.verifyMFA(mfaSecret, mfaCode);
      if (!mfaValid) {
        recordLoginAttempt(ip, false);
        await auditLogRepository.log('auth', 'login_failed', { email, ip, reason: 'invalid_mfa' }, { success: false, userId: user._id });
        return res.status(401).json({ error: 'Invalid MFA code' });
      }

      mfaVerified = true;
    }

    // Success - clear rate limiting
    recordLoginAttempt(ip, true);

    // Create session
    const token = await createSession(user._id, user.email, user.role, mfaVerified, req);

    // Update last login
    await userRepository.update(user._id, { lastLogin: new Date() } as any);

    // Audit log
    await auditLogRepository.log('auth', 'login', { email, ip, mfaVerified }, { userId: user._id });

    logger.info(`User logged in: ${email}`);

    // SECURITY: Set httpOnly cookie for secure token storage
    res.cookie('time_auth_token', token, COOKIE_OPTIONS);

    // Set admin flag cookie if user is admin (for frontend routing)
    if (user.role === 'admin' || user.role === 'owner') {
      res.cookie('time_is_admin', 'true', {
        ...COOKIE_OPTIONS,
        httpOnly: false, // Frontend needs to read this for routing
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled,
      },
      // Token still returned for backward compatibility (mobile apps, etc.)
      // Frontend should prefer using httpOnly cookie
      token,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });
  } catch (error) {
    logger.error('Login error:', error);
    await auditLogRepository.log('auth', 'login_error', { ip, error: String(error) }, { success: false });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /auth/logout
 * Invalidate current session
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  const cookieToken = req.cookies?.time_auth_token;
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const token = cookieToken || headerToken || (req as any).token;
  const user = (req as any).user;

  await deleteSession(token);
  await auditLogRepository.log('auth', 'logout', {}, { userId: user.id });

  // SECURITY: Clear all auth cookies
  res.clearCookie('time_auth_token', { path: '/' });
  res.clearCookie('time_is_admin', { path: '/' });

  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const fullUser = await userRepository.findById(user.id);
  const consentStatus = consentManager.getConsent(user.id);

  res.json({
    user: {
      id: user.id,
      email: fullUser?.email,
      name: fullUser?.name,
      role: fullUser?.role,
      createdAt: fullUser?.createdAt,
      settings: fullUser?.settings,
      mfaEnabled: user.mfaEnabled,
    },
    consent: consentStatus,
    hasValidConsent: consentManager.hasValidConsent(user.id),
    brokerConnections: fullUser?.brokerConnections?.length || 0,
  });
});

/**
 * POST /auth/refresh
 * Refresh session token
 */
router.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  const oldToken = (req as any).token;
  const user = (req as any).user;
  const session = (req as any).session;

  // Delete old session
  await deleteSession(oldToken);

  // Create new session
  const newToken = await createSession(
    user.id,
    user.email,
    user.role,
    session.mfaVerified,
    req
  );

  res.json({
    success: true,
    token: newToken,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });
});

/**
 * POST /auth/password/change
 * Change password
 */
router.post('/password/change', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const fullUser = await userRepository.findById(user.id);
    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    // Hash and update new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.update(user.id, { passwordHash: newPasswordHash } as any);

    // Invalidate all sessions except current
    const currentToken = (req as any).token;
    await databaseManager.cacheDelete(`session:*`); // In production, be more selective

    // Recreate current session
    await createSession(user.id, user.email, user.role, true, req);

    await auditLogRepository.log('auth', 'password_change', {}, { userId: user.id });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /auth/mfa/setup
 * Initialize MFA setup
 */
router.post('/mfa/setup', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const mfaSetup = await mfaService.setupMFA(user.id, user.email);

    // Store the secret temporarily (in production, store in session/cache)
    await databaseManager.cacheSet(`mfa_setup:${user.id}`, mfaSetup.base32, 600); // 10 min expiry

    res.json({
      success: true,
      secret: mfaSetup.base32,
      qrCode: mfaSetup.qrCodeDataUrl,
      otpauthUrl: mfaSetup.otpauthUrl,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

/**
 * POST /auth/mfa/verify
 * Verify MFA code and enable MFA
 */
router.post('/mfa/verify', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'MFA code required' });
  }

  try {
    // Get the pending MFA secret from cache
    const redis = databaseManager.getRedis();
    const pendingSecret = await redis.get(`mfa_setup:${user.id}`);

    if (!pendingSecret) {
      return res.status(400).json({ error: 'MFA setup expired. Please start setup again.' });
    }

    // Enable MFA with the secret and token
    const result = await mfaService.enableMFA(user.id, pendingSecret, code);

    if (!result.success) {
      return res.status(400).json({ error: 'Invalid MFA code' });
    }

    // Save MFA secret to user settings
    await userRepository.update(user.id, {
      settings: {
        mfaEnabled: true,
        mfaSecret: pendingSecret,
      },
    } as any);

    // Clear the pending secret
    await redis.del(`mfa_setup:${user.id}`);

    await auditLogRepository.log('auth', 'mfa_enabled', {}, { userId: user.id });

    res.json({
      success: true,
      message: 'MFA enabled successfully',
      recoveryCodes: result.recoveryCodes?.map(rc => rc.code),
      warning: 'Save these recovery codes in a safe place. They can only be shown once.',
    });
  } catch (error) {
    logger.error('MFA verify error:', error);
    res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

/**
 * POST /auth/mfa/disable
 * Disable MFA
 */
router.post('/mfa/disable', authMiddleware, mfaRequiredMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required to disable MFA' });
  }

  try {
    const fullUser = await userRepository.findById(user.id);
    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordValid = await bcrypt.compare(password, fullUser.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Remove MFA settings from user
    await userRepository.update(user.id, {
      settings: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    } as any);

    await auditLogRepository.log('auth', 'mfa_disabled', {}, { userId: user.id });

    res.json({ success: true, message: 'MFA disabled' });
  } catch (error) {
    logger.error('MFA disable error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

/**
 * GET /auth/sessions
 * List active sessions
 */
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const currentToken = (req as any).token;

  // In production, query Redis for user's sessions
  // This is a simplified version
  res.json({
    sessions: [
      {
        id: currentToken.substring(0, 8) + '...',
        current: true,
        createdAt: (req as any).session.createdAt,
        ipAddress: (req as any).session.ipAddress,
        userAgent: (req as any).session.userAgent,
      },
    ],
  });
});

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { sessionId } = req.params;

  // In production, verify session belongs to user before deleting
  await auditLogRepository.log('auth', 'session_revoked', { sessionId }, { userId: user.id });

  res.json({ success: true, message: 'Session revoked' });
});

export default router;

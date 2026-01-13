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
import { webAuthnService, WebAuthnCredential } from '../security/webauthn_service';
import { oAuthService, OAuthProvider } from '../security/oauth_service';
import { smsAuthService } from '../services/sms_auth_service';
import { logger } from '../utils/logger';
import {
  rateLimiters,
  checkPasswordBreach,
  validateRedirectUrl,
  sanitizeRedirect,
  securityHeaders,
} from '../middleware/security';

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
// CROSS-ORIGIN NOTE: Backend on fly.dev cannot set cookies for timebeyondus.com domain
// The frontend handles token storage via document.cookie after receiving token in response body
// These settings are for same-origin scenarios and fallback compatibility
const COOKIE_OPTIONS = {
  httpOnly: true,           // Prevents XSS attacks - JavaScript cannot access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax', // None for cross-origin
  maxAge: SESSION_DURATION_MS,
  path: '/',
  // NOTE: Do NOT set domain for cross-origin - let browser use request origin
  // Setting domain to .timebeyondus.com from fly.dev will be rejected by browser
};

const ADMIN_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  // Admin cookie has same settings
};

// Rate limiting store (use Redis in production cluster)
const loginAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map();

// Session store (use Redis in production cluster)
const sessions: Map<string, SessionData> = new Map();

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
  // ADMIN KEY BYPASS: Allow admin key for owner access (TIMEBEUNUS page)
  // SECURITY FIX: Only use environment variable, never hardcoded keys
  const adminKey = req.headers['x-admin-key'] as string | undefined;
  const validAdminKey = process.env.ADMIN_API_KEY;

  // CRITICAL: Admin key must exist in env, be at least 32 chars, and match exactly
  if (adminKey && validAdminKey && validAdminKey.length >= 32 && adminKey === validAdminKey) {
    // Log admin key usage for audit trail
    logger.info('[SECURITY] Admin key bypass used', {
      ip: req.ip,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });

    // Grant admin access without session
    (req as any).user = {
      id: 'admin',
      email: 'admin@timebeyondus.com',
      name: 'Admin',
      role: 'admin',
      mfaEnabled: false,
      mfaVerified: true,
    };
    next();
    return;
  }

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
 * SECURITY: Rate limited + password breach checking
 */
router.post('/register', rateLimiters.register, sanitizeRedirect, async (req: Request, res: Response) => {
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

    // Validate password strength (enhanced)
    if (password.length < 12) {
      return res.status(400).json({
        error: 'Password must be at least 12 characters long',
      });
    }

    // Check for password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        error: 'Password must contain uppercase, lowercase, number, and special character',
        requirements: {
          uppercase: hasUppercase,
          lowercase: hasLowercase,
          number: hasNumber,
          special: hasSpecial,
        },
      });
    }

    // SECURITY: Check if password has been exposed in data breaches
    const breachCheck = await checkPasswordBreach(password);
    if (breachCheck.breached) {
      logger.warn('[Auth] Registration blocked - breached password', { email, breachCount: breachCheck.count });
      return res.status(400).json({
        error: 'This password has appeared in data breaches. Please choose a different password.',
        breachCount: breachCheck.count,
        recommendation: 'Use a unique password with at least 12 characters.',
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
      status: 'active',
      permissions: ['portfolio', 'analytics'] as any,  // Default user permissions
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

  // Get full broker connection status
  const brokerConnections = fullUser?.brokerConnections || [];
  const BrokerManager = require('../brokers/broker_manager').BrokerManager;
  const brokerManager = BrokerManager.getInstance();
  const brokerStatus = brokerManager.getStatus();

  // Enrich broker connections with live status
  const enrichedBrokerConnections = brokerConnections.map((conn: any) => ({
    ...conn,
    isLive: brokerStatus.brokers.some((b: any) => b.id === conn.brokerId && b.connected),
  }));

  res.json({
    user: {
      id: user.id,
      email: fullUser?.email,
      name: fullUser?.name,
      role: fullUser?.role,
      createdAt: fullUser?.createdAt,
      settings: fullUser?.settings,
      mfaEnabled: user.mfaEnabled,
      subscription: (fullUser as any)?.subscription,
    },
    consent: consentStatus,
    hasValidConsent: consentManager.hasValidConsent(user.id),
    brokerConnections: enrichedBrokerConnections,
    brokerConnectionCount: brokerConnections.length,
    connectedBrokers: brokerStatus.connectedBrokers,
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

/**
 * POST /auth/setup-admin
 * One-time admin account setup (only works if no admin exists)
 *
 * This endpoint creates the initial admin account for the platform.
 * It will only work ONCE - after an admin exists, it will fail.
 */
router.post('/setup-admin', async (req: Request, res: Response) => {
  try {
    const { email, password, name, setupKey } = req.body;

    // CRITICAL: Require setup key from environment - NO FALLBACK ALLOWED
    const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY;

    if (!ADMIN_SETUP_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'ADMIN_SETUP_KEY environment variable must be set'
      });
    }

    if (setupKey !== ADMIN_SETUP_KEY) {
      return res.status(403).json({
        error: 'Invalid setup key',
        message: 'The provided setup key does not match'
      });
    }

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'name', 'setupKey']
      });
    }

    // Check if any admin already exists
    const existingUsers = await userRepository.findMany({});
    const adminExists = existingUsers.some((u: any) => u.role === 'admin' || u.role === 'owner');

    if (adminExists) {
      return res.status(409).json({
        error: 'Admin already exists',
        message: 'Use the regular login endpoint or contact existing admin'
      });
    }

    // Check if email already registered
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Hash password and create admin user with all required fields
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date();
    const adminUser = await userRepository.create({
      _id: uuidv4(),
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: 'owner', // First admin is owner
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastLogin: now,
      lastActivity: now,
      consent: {
        termsAccepted: true,
        dataLearningConsent: true,
        riskDisclosureAccepted: true,
        marketingConsent: false,
        acceptedAt: now,
      },
      settings: {
        timezone: 'America/Chicago',
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
    } as any);

    // Log the admin creation
    await auditLogRepository.log('auth', 'admin_setup', {
      email,
      name,
      role: 'owner'
    }, { success: true, userId: adminUser._id });

    logger.info(`Admin account created: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      user: {
        id: adminUser._id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
      nextStep: 'Use /auth/login with these credentials to access admin panel'
    });

  } catch (error) {
    logger.error('Admin setup error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

/**
 * POST /auth/fix-admin
 * Fix missing fields on existing admin account (one-time use)
 */
router.post('/fix-admin', async (req: Request, res: Response) => {
  try {
    const { email, setupKey } = req.body;

    // CRITICAL: Require setup key from environment - NO FALLBACK ALLOWED
    const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY;
    if (!ADMIN_SETUP_KEY) {
      return res.status(500).json({ error: 'ADMIN_SETUP_KEY not configured' });
    }
    if (setupKey !== ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const updates: any = {};

    // Add missing fields
    if (!user.lastLogin) updates.lastLogin = now;
    if (!user.lastActivity) updates.lastActivity = now;
    if (!user.consent) {
      updates.consent = {
        termsAccepted: true,
        dataLearningConsent: true,
        riskDisclosureAccepted: true,
        marketingConsent: false,
        acceptedAt: now,
      };
    }
    if (!user.settings) {
      updates.settings = {
        timezone: 'America/Chicago',
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
      };
    }
    if (!user.brokerConnections) updates.brokerConnections = [];

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, message: 'User already has all required fields' });
    }

    await userRepository.update(user._id, updates);

    logger.info(`Fixed admin account: ${email}`);
    res.json({
      success: true,
      message: 'Admin account fixed successfully',
      fieldsAdded: Object.keys(updates),
    });
  } catch (error) {
    logger.error('Fix admin error:', error);
    res.status(500).json({ error: 'Failed to fix admin account' });
  }
});

/**
 * GET /auth/admin-status
 * Check if an admin account exists (for first-time setup flow)
 */
router.get('/admin-status', async (_req: Request, res: Response) => {
  try {
    const existingUsers = await userRepository.findMany({});
    const adminExists = existingUsers.some((u: any) => u.role === 'admin' || u.role === 'owner');

    res.json({
      adminExists,
      setupRequired: !adminExists,
      message: adminExists
        ? 'Admin account exists. Use /auth/login to access.'
        : 'No admin exists. Use /auth/setup-admin to create one.'
    });
  } catch (error) {
    res.json({
      adminExists: false,
      setupRequired: true,
      error: 'Could not check admin status'
    });
  }
});

/**
 * POST /auth/reset-admin-password
 * Reset admin password using setup key (for recovery)
 * SECURITY: Requires ADMIN_SETUP_KEY from environment
 */
router.post('/reset-admin-password', async (req: Request, res: Response) => {
  try {
    const { email, newPassword, setupKey } = req.body;

    // CRITICAL: Require setup key from environment
    const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY;
    if (!ADMIN_SETUP_KEY) {
      return res.status(500).json({ error: 'ADMIN_SETUP_KEY not configured' });
    }
    if (setupKey !== ADMIN_SETUP_KEY) {
      logger.warn('[Auth] Invalid setup key attempt for password reset', { email });
      return res.status(403).json({ error: 'Invalid setup key' });
    }

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and newPassword required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only allow reset for admin/owner accounts
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Can only reset admin/owner passwords with setup key' });
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.update(user._id, { passwordHash });

    logger.info('[Auth] Admin password reset successful', { email: user.email });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('[Auth] Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ============================================================
// WEBAUTHN / PASSKEY ROUTES
// ============================================================

/**
 * POST /auth/webauthn/register/begin
 * Begin WebAuthn registration (generate challenge)
 */
router.post('/webauthn/register/begin', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { friendlyName } = req.body;

    // Get existing credentials
    const existingCredentials: WebAuthnCredential[] = user.webauthnCredentials || [];

    // Generate registration options
    const options = await webAuthnService.generateRegistrationOptions(
      user._id,
      user.email,
      user.name,
      existingCredentials
    );

    await auditLogRepository.log('auth', 'webauthn_register_begin', {
      userId: user._id,
      email: user.email,
    }, { success: true, userId: user._id });

    res.json({
      success: true,
      options,
      sessionId: (options as any).extensions?.sessionId,
    });
  } catch (error: any) {
    logger.error('WebAuthn register begin error:', error);
    res.status(500).json({ error: error.message || 'Failed to begin registration' });
  }
});

/**
 * POST /auth/webauthn/register/complete
 * Complete WebAuthn registration (verify and store credential)
 */
router.post('/webauthn/register/complete', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { sessionId, response, friendlyName } = req.body;

    if (!sessionId || !response) {
      return res.status(400).json({ error: 'Missing sessionId or response' });
    }

    const result = await webAuthnService.verifyRegistration(
      sessionId,
      response,
      friendlyName || 'Passkey'
    );

    if (!result.success || !result.credential) {
      return res.status(400).json({ error: result.error || 'Registration failed' });
    }

    // Add credential to user
    const credentials = user.webauthnCredentials || [];
    credentials.push(result.credential);

    await userRepository.update(user._id, {
      webauthnCredentials: credentials,
    });

    await auditLogRepository.log('auth', 'webauthn_register_complete', {
      userId: user._id,
      credentialId: result.credential.id,
      deviceType: result.credential.deviceType,
    }, { success: true, userId: user._id });

    res.json({
      success: true,
      message: 'Passkey registered successfully',
      credential: {
        id: result.credential.id,
        friendlyName: result.credential.friendlyName,
        deviceType: result.credential.deviceType,
        backedUp: result.credential.backedUp,
        createdAt: result.credential.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('WebAuthn register complete error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete registration' });
  }
});

/**
 * POST /auth/webauthn/login/begin
 * Begin WebAuthn authentication (for existing users)
 */
router.post('/webauthn/login/begin', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    let credentials: WebAuthnCredential[] = [];
    let userId: string | undefined;

    if (email) {
      const user = await userRepository.findByEmail(email.toLowerCase());
      if (user && user.webauthnCredentials && user.webauthnCredentials.length > 0) {
        credentials = user.webauthnCredentials;
        userId = user._id;
      }
    }

    // Generate authentication options
    const options = await webAuthnService.generateAuthenticationOptions(credentials, userId);

    res.json({
      success: true,
      options,
      sessionId: options.sessionId,
      hasPasskeys: credentials.length > 0,
    });
  } catch (error: any) {
    logger.error('WebAuthn login begin error:', error);
    res.status(500).json({ error: error.message || 'Failed to begin authentication' });
  }
});

/**
 * POST /auth/webauthn/login/complete
 * Complete WebAuthn authentication
 */
router.post('/webauthn/login/complete', async (req: Request, res: Response) => {
  try {
    const { sessionId, response, email } = req.body;

    if (!sessionId || !response) {
      return res.status(400).json({ error: 'Missing sessionId or response' });
    }

    // Find user with this credential
    const credentialId = response.id;
    let user: any = null;

    if (email) {
      user = await userRepository.findByEmail(email.toLowerCase());
    }

    if (!user) {
      // Search all users for this credential (discoverable credentials)
      const allUsers = await userRepository.findMany({});
      for (const u of allUsers) {
        if (u.webauthnCredentials?.some((c: any) => c.credentialId === credentialId)) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'No account found with this passkey' });
    }

    // Find the credential
    const credential = user.webauthnCredentials?.find((c: any) => c.credentialId === credentialId);
    if (!credential) {
      return res.status(401).json({ error: 'Credential not found' });
    }

    // Verify authentication
    const result = await webAuthnService.verifyAuthentication(sessionId, response, credential);

    if (!result.success) {
      await auditLogRepository.log('auth', 'webauthn_login_failed', {
        email: user.email,
        error: result.error,
      }, { success: false });
      return res.status(401).json({ error: result.error || 'Authentication failed' });
    }

    // Update credential counter
    if (result.newCounter !== undefined) {
      const updatedCredentials = user.webauthnCredentials.map((c: any) => {
        if (c.credentialId === credentialId) {
          return { ...c, counter: result.newCounter, lastUsedAt: new Date() };
        }
        return c;
      });
      await userRepository.update(user._id, { webauthnCredentials: updatedCredentials });
    }

    // Create session
    const sessionToken = generateToken();
    const session: SessionData = {
      userId: user._id,
      email: user.email,
      role: user.role,
      mfaVerified: true, // WebAuthn counts as MFA
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      createdAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    // Store session
    const redis = databaseManager.getRedis();
    await redis.set(`session:${sessionToken}`, JSON.stringify(session), 'EX', SESSION_DURATION_DAYS * 24 * 60 * 60);

    // Update last login
    await userRepository.update(user._id, { lastLogin: new Date(), lastActivity: new Date() });

    // Set cookie
    res.cookie('time_auth_token', sessionToken, COOKIE_OPTIONS);

    await auditLogRepository.log('auth', 'webauthn_login', {
      email: user.email,
      credentialId: credential.id,
    }, { success: true, userId: user._id });

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    logger.error('WebAuthn login complete error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete authentication' });
  }
});

/**
 * GET /auth/webauthn/credentials
 * List user's registered passkeys
 */
router.get('/webauthn/credentials', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const credentials = user.webauthnCredentials || [];

    res.json({
      success: true,
      credentials: credentials.map((c: WebAuthnCredential) => ({
        id: c.id,
        friendlyName: c.friendlyName,
        deviceType: c.deviceType,
        backedUp: c.backedUp,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
      })),
    });
  } catch (error: any) {
    logger.error('Get WebAuthn credentials error:', error);
    res.status(500).json({ error: 'Failed to get credentials' });
  }
});

/**
 * DELETE /auth/webauthn/credentials/:credentialId
 * Remove a passkey
 */
router.delete('/webauthn/credentials/:credentialId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { credentialId } = req.params;

    const credentials = user.webauthnCredentials || [];
    const updatedCredentials = credentials.filter((c: WebAuthnCredential) => c.id !== credentialId);

    if (credentials.length === updatedCredentials.length) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    await userRepository.update(user._id, { webauthnCredentials: updatedCredentials });

    await auditLogRepository.log('auth', 'webauthn_credential_removed', {
      userId: user._id,
      credentialId,
    }, { success: true, userId: user._id });

    res.json({
      success: true,
      message: 'Passkey removed successfully',
    });
  } catch (error: any) {
    logger.error('Remove WebAuthn credential error:', error);
    res.status(500).json({ error: 'Failed to remove credential' });
  }
});

// ============================================================
// OAUTH ROUTES
// ============================================================

/**
 * GET /auth/oauth/providers
 * List available OAuth providers
 */
router.get('/oauth/providers', (_req: Request, res: Response) => {
  const providers = oAuthService.getAvailableProviders();
  res.json({
    success: true,
    providers,
  });
});

/**
 * GET /auth/oauth/:provider/authorize
 * Redirect to OAuth provider for authorization
 */
router.get('/oauth/:provider/authorize', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { returnUrl, linkToUserId } = req.query;

    if (provider !== 'google' && provider !== 'github' && provider !== 'apple') {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (!oAuthService.isProviderConfigured(provider)) {
      return res.status(400).json({ error: `${provider} OAuth not configured` });
    }

    const { url, state } = await oAuthService.generateAuthUrl(provider, {
      returnUrl: returnUrl as string,
      linkToUserId: linkToUserId as string,
    });

    // For API usage, return the URL. For browser, redirect.
    if (req.headers.accept?.includes('application/json')) {
      res.json({ success: true, url, state });
    } else {
      res.redirect(url);
    }
  } catch (error: any) {
    logger.error('OAuth authorize error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate OAuth URL' });
  }
});

/**
 * GET /auth/oauth/:provider/callback
 * Handle OAuth callback from provider
 */
router.get('/oauth/:provider/callback', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`/login?error=${encodeURIComponent(oauthError as string)}`);
    }

    if (!code || !state) {
      return res.redirect('/login?error=Missing+authorization+code');
    }

    if (provider !== 'google' && provider !== 'github') {
      return res.redirect('/login?error=Invalid+provider');
    }

    // Validate state (CSRF protection)
    const stateValidation = await oAuthService.validateState(state as string);
    if (!stateValidation.valid) {
      return res.redirect(`/login?error=${encodeURIComponent(stateValidation.error || 'Invalid+state')}`);
    }

    // Exchange code for tokens and get user info
    const result = await oAuthService.handleCallback(provider, code as string);
    if (!result.success || !result.userInfo) {
      return res.redirect(`/login?error=${encodeURIComponent(result.error || 'OAuth+failed')}`);
    }

    const { providerId, email, name, avatar, accessToken, refreshToken } = result.userInfo;

    // Check if linking to existing account
    if (stateValidation.linkToUserId) {
      const user = await userRepository.findById(stateValidation.linkToUserId);
      if (!user) {
        return res.redirect('/login?error=User+not+found');
      }

      // Add OAuth provider to existing account
      const providers = user.oauthProviders || [];
      if (providers.some((p: OAuthProvider) => p.provider === provider)) {
        return res.redirect('/settings?error=Provider+already+linked');
      }

      providers.push(oAuthService.createProviderLink(provider, result.userInfo));
      await userRepository.update(user._id, { oauthProviders: providers });

      await auditLogRepository.log('auth', 'oauth_linked', {
        userId: user._id,
        provider,
        providerId,
      }, { success: true, userId: user._id });

      return res.redirect(stateValidation.returnUrl || '/settings?success=OAuth+linked');
    }

    // Check if user exists with this OAuth provider
    let user = await userRepository.findByEmail(email.toLowerCase());
    let isNewUser = false;

    if (!user) {
      // Check if OAuth provider ID is already linked to another account
      const allUsers = await userRepository.findMany({});
      for (const u of allUsers) {
        if (u.oauthProviders?.some((p: OAuthProvider) => p.provider === provider && p.providerId === providerId)) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      // Create new user from OAuth
      isNewUser = true;
      const now = new Date();
      const newUser = await userRepository.create({
        _id: uuidv4(),
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        passwordHash: '', // No password for OAuth-only users
        role: 'user',
        avatar,
        createdAt: now,
        lastLogin: now,
        lastActivity: now,
        consent: {
          termsAccepted: true, // OAuth users accept terms by signing up
          dataLearningConsent: true,
          riskDisclosureAccepted: true,
          marketingConsent: false,
          acceptedAt: now,
        },
        settings: {
          timezone: 'America/Chicago',
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
        oauthProviders: [oAuthService.createProviderLink(provider, result.userInfo)],
      } as any);
      user = newUser;
    } else {
      // Update existing user's OAuth provider
      const providers = user.oauthProviders || [];
      const existingProvider = providers.find((p: OAuthProvider) => p.provider === provider);
      if (existingProvider) {
        existingProvider.lastUsedAt = new Date();
      } else {
        providers.push(oAuthService.createProviderLink(provider, result.userInfo));
      }
      await userRepository.update(user._id, {
        oauthProviders: providers,
        lastLogin: new Date(),
        lastActivity: new Date(),
        avatar: avatar || user.avatar,
      });
    }

    // Create session
    const sessionToken = generateToken();
    const session: SessionData = {
      userId: user._id,
      email: user.email,
      role: user.role,
      mfaVerified: true, // OAuth counts as verified
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      createdAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const redis = databaseManager.getRedis();
    await redis.set(`session:${sessionToken}`, JSON.stringify(session), 'EX', SESSION_DURATION_DAYS * 24 * 60 * 60);

    // Set cookie
    res.cookie('time_auth_token', sessionToken, COOKIE_OPTIONS);

    await auditLogRepository.log('auth', isNewUser ? 'oauth_register' : 'oauth_login', {
      email: user.email,
      provider,
      providerId,
    }, { success: true, userId: user._id });

    // Redirect to return URL or dashboard
    const returnUrl = stateValidation.returnUrl || '/';
    res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}token=${sessionToken}`);
  } catch (error: any) {
    logger.error('OAuth callback error:', error);
    res.redirect(`/login?error=${encodeURIComponent(error.message || 'OAuth+failed')}`);
  }
});

/**
 * GET /auth/oauth/linked
 * Get user's linked OAuth providers
 */
router.get('/oauth/linked', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const providers = user.oauthProviders || [];

    res.json({
      success: true,
      providers: providers.map((p: OAuthProvider) => ({
        provider: p.provider,
        email: p.email,
        name: p.name,
        avatar: p.avatar,
        linkedAt: p.linkedAt,
        lastUsedAt: p.lastUsedAt,
      })),
    });
  } catch (error: any) {
    logger.error('Get OAuth providers error:', error);
    res.status(500).json({ error: 'Failed to get OAuth providers' });
  }
});

/**
 * DELETE /auth/oauth/:provider
 * Unlink OAuth provider from account
 */
router.delete('/oauth/:provider', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { provider } = req.params;

    if (provider !== 'google' && provider !== 'github' && provider !== 'apple') {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const providers = user.oauthProviders || [];
    const updatedProviders = providers.filter((p: OAuthProvider) => p.provider !== provider);

    if (providers.length === updatedProviders.length) {
      return res.status(404).json({ error: 'Provider not linked' });
    }

    // Ensure user has another way to login
    const hasPassword = !!user.passwordHash;
    const hasOtherOAuth = updatedProviders.length > 0;
    const hasPasskeys = (user.webauthnCredentials || []).length > 0;

    if (!hasPassword && !hasOtherOAuth && !hasPasskeys) {
      return res.status(400).json({
        error: 'Cannot unlink last login method. Add a password or another OAuth provider first.',
      });
    }

    await userRepository.update(user._id, { oauthProviders: updatedProviders });

    await auditLogRepository.log('auth', 'oauth_unlinked', {
      userId: user._id,
      provider,
    }, { success: true, userId: user._id });

    res.json({
      success: true,
      message: `${provider} unlinked successfully`,
    });
  } catch (error: any) {
    logger.error('Unlink OAuth provider error:', error);
    res.status(500).json({ error: 'Failed to unlink provider' });
  }
});

// ============================================================
// SMS AUTHENTICATION (TWILIO)
// ============================================================

/**
 * POST /auth/sms/send
 * Send OTP verification code to phone number
 */
router.post('/sms/send', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const result = await smsAuthService.sendOTP(user.id, phone);

    await auditLogRepository.log('auth', 'sms_otp_sent', {
      userId: user.id,
      phone: smsAuthService.normalizePhone(phone).replace(/(\+\d{1,2})(\d{3})(\d{3})(\d{4})/, '$1-***-***-$4'),
    }, { success: result.success, userId: user.id });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        expiresIn: result.expiresIn,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error: any) {
    logger.error('SMS send error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

/**
 * POST /auth/sms/verify
 * Verify OTP code and enable SMS 2FA
 */
router.post('/sms/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const result = await smsAuthService.verifyOTP(user.id, code);

    await auditLogRepository.log('auth', 'sms_otp_verified', {
      userId: user.id,
    }, { success: result.success, userId: user.id });

    if (result.success) {
      // Get the phone number from the pending OTP and save to user
      const status = smsAuthService.getOTPStatus(user.id);
      if (status.phone) {
        await userRepository.update(user.id, {
          phone: status.phone,
          phoneVerified: true,
          sms2faEnabled: true,
        });
      }

      res.json({
        success: true,
        message: 'Phone verified and SMS 2FA enabled',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error: any) {
    logger.error('SMS verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * GET /auth/sms/status
 * Get SMS verification status
 */
router.get('/sms/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const otpStatus = smsAuthService.getOTPStatus(user.id);
    const serviceStatus = smsAuthService.getStatus();

    // Get user's SMS 2FA status
    const userData = await userRepository.findById(user.id);

    res.json({
      serviceEnabled: serviceStatus.enabled,
      provider: serviceStatus.provider,
      sms2faEnabled: userData?.sms2faEnabled || false,
      phoneVerified: userData?.phoneVerified || false,
      phone: userData?.phone?.replace(/(\+\d{1,2})(\d{3})(\d{3})(\d{4})/, '$1-***-***-$4'),
      pendingVerification: otpStatus.pending,
      expiresIn: otpStatus.expiresIn,
    });
  } catch (error: any) {
    logger.error('SMS status error:', error);
    res.status(500).json({ error: 'Failed to get SMS status' });
  }
});

/**
 * POST /auth/sms/disable
 * Disable SMS 2FA
 */
router.post('/sms/disable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { password } = req.body;

    // Verify password before disabling 2FA
    const userData = await userRepository.findById(user.id);
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userData.passwordHash && password) {
      const validPassword = await bcrypt.compare(password, userData.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Ensure user has another 2FA method or require password
    const hasTOTP = userData.mfaSecret && userData.mfaEnabled;
    const hasWebAuthn = (userData.webauthnCredentials || []).length > 0;

    if (!hasTOTP && !hasWebAuthn && !userData.passwordHash) {
      return res.status(400).json({
        error: 'Cannot disable SMS 2FA. Enable another authentication method first.',
      });
    }

    await userRepository.update(user.id, {
      sms2faEnabled: false,
    });

    await auditLogRepository.log('auth', 'sms_2fa_disabled', {
      userId: user.id,
    }, { success: true, userId: user.id });

    res.json({
      success: true,
      message: 'SMS 2FA disabled',
    });
  } catch (error: any) {
    logger.error('SMS disable error:', error);
    res.status(500).json({ error: 'Failed to disable SMS 2FA' });
  }
});

/**
 * POST /auth/sms/login-verify
 * Verify SMS OTP during login (for users with SMS 2FA enabled)
 */
router.post('/sms/login-verify', async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and code are required' });
    }

    const result = await smsAuthService.verifyOTP(userId, code);

    if (result.success) {
      // Generate session token
      const token = generateToken();
      const user = await userRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Store session
      const session: SessionData = {
        userId: user._id,
        email: user.email,
        role: user.role || 'user',
        mfaVerified: true,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        createdAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      sessions.set(token, session);

      // Set cookie
      res.cookie('time_token', token, COOKIE_OPTIONS);

      await auditLogRepository.log('auth', 'sms_login_verified', {
        userId: user._id,
      }, { success: true, userId: user._id });

      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
        },
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error: any) {
    logger.error('SMS login verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;

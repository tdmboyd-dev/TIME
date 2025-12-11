/**
 * TIME Authentication Routes
 *
 * Handles user authentication, registration, and session management.
 * All users MUST complete consent before accessing trading features.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { consentManager } from '../consent/consent_manager';
import { notificationService } from '../notifications/notification_service';

const router = Router();

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
}

// Mock user store (replace with MongoDB in production)
const users: Map<string, {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin' | 'owner';
  createdAt: Date;
  consentComplete: boolean;
}> = new Map();

// Mock sessions (replace with Redis in production)
const sessions: Map<string, { userId: string; expiresAt: Date }> = new Map();

// Create default owner account for development
const defaultOwner = {
  id: 'owner_timebeunus',
  email: 'admin@time.local',
  passwordHash: 'hash_admin123',
  name: 'Timebeunus Boyd',
  role: 'owner' as const,
  createdAt: new Date(),
  consentComplete: true,
};
users.set(defaultOwner.id, defaultOwner);

// Create permanent dev token for default owner
const devToken = 'dev_token_time_admin_2024';
sessions.set(devToken, {
  userId: defaultOwner.id,
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
});

// ============================================================
// MIDDLEWARE
// ============================================================

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const session = sessions.get(token);

  if (!session || session.expiresAt < new Date()) {
    sessions.delete(token);
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  const user = Array.from(users.values()).find(u => u.id === session.userId);

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
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

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /auth/register
 * Register a new user with mandatory consent
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, consent } = req.body as RegisterRequest;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'name', 'consent'],
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
    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = `hash_${password}`; // Use bcrypt in production

    const newUser = {
      id: userId,
      email,
      passwordHash,
      name,
      role: 'user' as const,
      createdAt: new Date(),
      consentComplete: true,
    };

    users.set(userId, newUser);

    // Record consent using grantConsent
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
    const token = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    sessions.set(token, {
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Send welcome notification - just emit an event for now
    notificationService.emit('user:registered', {
      userId,
      name,
      email,
    });

    res.status(201).json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        role: 'user',
      },
      token,
      message: 'Registration successful. Welcome to TIME.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /auth/login
 * Authenticate user and create session
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = Array.from(users.values()).find(u => u.email === email);

    if (!user || user.passwordHash !== `hash_${password}`) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const token = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    sessions.set(token, {
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /auth/logout
 * Invalidate current session
 */
router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  const token = (req as any).token;
  sessions.delete(token);

  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const consentStatus = consentManager.getConsent(user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
    consent: consentStatus,
    hasValidConsent: consentManager.hasValidConsent(user.id),
  });
});

/**
 * POST /auth/refresh
 * Refresh session token
 */
router.post('/refresh', authMiddleware, (req: Request, res: Response) => {
  const oldToken = (req as any).token;
  const user = (req as any).user;

  // Delete old session
  sessions.delete(oldToken);

  // Create new session
  const newToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  sessions.set(newToken, {
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.json({
    success: true,
    token: newToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
});

/**
 * POST /auth/password/change
 * Change password
 */
router.post('/password/change', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  if (user.passwordHash !== `hash_${currentPassword}`) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }

  // Update password
  user.passwordHash = `hash_${newPassword}`;
  users.set(user.id, user);

  // Invalidate all other sessions
  for (const [token, session] of sessions) {
    if (session.userId === user.id && token !== (req as any).token) {
      sessions.delete(token);
    }
  }

  res.json({ success: true, message: 'Password changed successfully' });
});

export default router;

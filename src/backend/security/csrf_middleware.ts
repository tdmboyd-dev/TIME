/**
 * CSRF Protection Middleware for TIME
 *
 * Implements CSRF protection using double-submit cookie pattern
 * Combined with SameSite cookies for defense in depth
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CSRFMiddleware');

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'time_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Cookie configuration
// IMPORTANT: SameSite=None required for cross-origin requests
// (frontend at timebeyondus.com, backend at time-backend-hosting.fly.dev)
const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,  // Must be readable by JavaScript
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF Middleware - Sets token cookie and validates on state-changing requests
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Safe methods don't need CSRF protection
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  // Set CSRF token cookie if not present
  let csrfToken = req.cookies[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);
  }

  // Make token available to response for client to read
  res.locals.csrfToken = csrfToken;

  // Skip validation for safe methods
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for API key authenticated requests (admin/server)
  const adminKey = req.headers['x-admin-key'];
  if (adminKey && adminKey === process.env.ADMIN_API_KEY) {
    return next();
  }

  // Skip CSRF for webhook endpoints
  if (req.path.includes('/webhook') || req.path.includes('/callback')) {
    return next();
  }

  // Validate CSRF token from header or body
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;
  const bodyToken = req.body?._csrf;
  const submittedToken = headerToken || bodyToken;

  if (!submittedToken) {
    logger.warn('CSRF token missing', { path: req.path, method: req.method });
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const tokenValid = crypto.timingSafeEqual(
    Buffer.from(csrfToken),
    Buffer.from(submittedToken)
  );

  if (!tokenValid) {
    logger.warn('CSRF token invalid', { path: req.path, method: req.method });
    res.status(403).json({ error: 'CSRF token invalid' });
    return;
  }

  next();
}

/**
 * Generate new CSRF token endpoint
 * Uses token from middleware if available, otherwise generates new one
 */
export function getCSRFToken(req: Request, res: Response): void {
  // Use token already set by middleware, or generate new one
  let csrfToken = res.locals.csrfToken || req.cookies[CSRF_COOKIE_NAME];

  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);
  }

  res.json({ csrfToken });
}

/**
 * Rate limiting store with cleanup
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  isRateLimited(key: string): { limited: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      return { limited: false, remaining: this.maxRequests - 1, resetIn: this.windowMs };
    }

    record.count++;

    if (record.count > this.maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetIn: record.resetTime - now
      };
    }

    return {
      limited: false,
      remaining: this.maxRequests - record.count,
      resetIn: record.resetTime - now
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Create rate limiters for different use cases
const generalLimiter = new RateLimiter(60000, 100);      // 100 req/min
const authLimiter = new RateLimiter(60000, 10);          // 10 req/min for auth
const tradeLimiter = new RateLimiter(60000, 30);         // 30 req/min for trades
const adminLimiter = new RateLimiter(60000, 50);         // 50 req/min for admin

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(type: 'general' | 'auth' | 'trade' | 'admin' = 'general') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               req.socket.remoteAddress ||
               'unknown';

    const key = `${type}:${ip}`;

    let limiter: RateLimiter;
    switch (type) {
      case 'auth': limiter = authLimiter; break;
      case 'trade': limiter = tradeLimiter; break;
      case 'admin': limiter = adminLimiter; break;
      default: limiter = generalLimiter;
    }

    const result = limiter.isRateLimited(key);

    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetIn / 1000).toString());

    if (result.limited) {
      logger.warn('Rate limit exceeded', { ip, type, path: req.path });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(result.resetIn / 1000)
      });
      return;
    }

    next();
  };
}

export { generateCSRFToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };

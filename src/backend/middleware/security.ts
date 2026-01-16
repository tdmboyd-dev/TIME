/**
 * TIME BEYOND US - Comprehensive Security Middleware
 *
 * Security features:
 * - Redis-based rate limiting (distributed)
 * - Distributed locks for financial operations
 * - Open redirect protection
 * - Password breach checking (HaveIBeenPwned)
 * - HMAC webhook signature validation
 * - Request sanitization
 *
 * All features work with Redis and fall back to in-memory for development.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sessionStore } from '../utils/session_store';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('Security');

// ============================================================================
// REDIS-BASED RATE LIMITING
// ============================================================================

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // General API rate limits
  general: { windowMs: 60000, maxRequests: 100 },

  // Authentication - PRODUCTION SECURITY ENABLED
  login: { windowMs: 900000, maxRequests: 5, message: 'Too many login attempts. Please wait 15 minutes.' }, // 5 per 15 min
  register: { windowMs: 3600000, maxRequests: 3, message: 'Too many registration attempts. Please wait 1 hour.' }, // 3 per hour
  passwordReset: { windowMs: 3600000, maxRequests: 3, message: 'Too many password reset requests. Please wait 1 hour.' }, // 3 per hour

  // Financial operations - very strict
  withdrawal: { windowMs: 60000, maxRequests: 3, message: 'Too many withdrawal requests. Please wait.' },
  trade: { windowMs: 1000, maxRequests: 10, message: 'Trade rate limit exceeded.' },
  transfer: { windowMs: 3600000, maxRequests: 5, message: 'Too many transfer requests. Please wait.' }, // 5 per hour

  // Admin operations
  admin: { windowMs: 60000, maxRequests: 50 },

  // SMS/MFA
  sms: { windowMs: 3600000, maxRequests: 5, message: 'Too many SMS requests. Please wait 1 hour.' }, // 5 per hour

  // Public API
  publicApi: { windowMs: 60000, maxRequests: 60 },
};

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(configName: string | RateLimitConfig) {
  const config = typeof configName === 'string'
    ? DEFAULT_RATE_LIMITS[configName] || DEFAULT_RATE_LIMITS.general
    : configName;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate rate limit key
      const keyGenerator = config.keyGenerator || ((r: Request) => {
        const ip = r.ip || r.socket.remoteAddress || 'unknown';
        const userId = (r as any).user?.id || 'anonymous';
        return `${ip}:${userId}:${r.path}`;
      });

      const key = keyGenerator(req);
      const windowSeconds = Math.ceil(config.windowMs / 1000);

      // Check rate limit using Redis/memory store
      const result = await sessionStore.checkRateLimit(key, config.maxRequests, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + result.resetIn);

      if (!result.allowed) {
        logger.warn('[RateLimit] Rate limit exceeded', {
          key,
          path: req.path,
          ip: req.ip
        });

        res.setHeader('Retry-After', result.resetIn);
        return res.status(429).json({
          success: false,
          error: config.message || 'Too many requests. Please slow down.',
          retryAfter: result.resetIn,
        });
      }

      next();
    } catch (error: unknown) {
      // On error, allow request to proceed (fail open for availability)
      logger.error('[RateLimit] Error checking rate limit', { error: String(error) });
      next();
    }
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  general: createRateLimiter('general'),
  login: createRateLimiter('login'),
  register: createRateLimiter('register'),
  passwordReset: createRateLimiter('passwordReset'),
  withdrawal: createRateLimiter('withdrawal'),
  trade: createRateLimiter('trade'),
  admin: createRateLimiter('admin'),
  publicApi: createRateLimiter('publicApi'),
};

// ============================================================================
// DISTRIBUTED LOCKS FOR FINANCIAL OPERATIONS
// ============================================================================

const activeLocks = new Map<string, { expiresAt: number; owner: string }>();

/**
 * Acquire a distributed lock
 */
export async function acquireLock(
  lockKey: string,
  owner: string,
  ttlMs: number = 5000
): Promise<boolean> {
  const fullKey = `lock:${lockKey}`;

  try {
    // Check if lock exists and is not expired
    const existing = await sessionStore.get<{ owner: string; expiresAt: number }>(fullKey);

    if (existing && existing.expiresAt > Date.now()) {
      // Lock is held by someone else
      if (existing.owner !== owner) {
        return false;
      }
      // Same owner - refresh lock
    }

    // Acquire lock
    const lockData = { owner, expiresAt: Date.now() + ttlMs };
    await sessionStore.set(fullKey, lockData, Math.ceil(ttlMs / 1000));

    // Also store in memory for fast lookup
    activeLocks.set(fullKey, lockData);

    logger.debug('[Lock] Acquired', { lockKey, owner, ttlMs });
    return true;
  } catch (error) {
    logger.error('[Lock] Error acquiring lock', { error: String(error) });
    return false;
  }
}

/**
 * Release a distributed lock
 */
export async function releaseLock(lockKey: string, owner: string): Promise<boolean> {
  const fullKey = `lock:${lockKey}`;

  try {
    const existing = await sessionStore.get<{ owner: string }>(fullKey);

    if (!existing || existing.owner !== owner) {
      logger.warn('[Lock] Cannot release - not owner', { lockKey, owner });
      return false;
    }

    await sessionStore.delete(fullKey);
    activeLocks.delete(fullKey);

    logger.debug('[Lock] Released', { lockKey, owner });
    return true;
  } catch (error) {
    logger.error('[Lock] Error releasing lock', { error: String(error) });
    return false;
  }
}

/**
 * Middleware for operations requiring locks
 */
export function requireLock(keyGenerator: (req: Request) => string, ttlMs: number = 5000) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const lockKey = keyGenerator(req);
    const owner = `${req.ip}:${(req as any).user?.id || 'anon'}:${Date.now()}`;

    const acquired = await acquireLock(lockKey, owner, ttlMs);

    if (!acquired) {
      logger.warn('[Lock] Failed to acquire lock', { lockKey, path: req.path } as object);
      return res.status(423).json({
        success: false,
        error: 'Operation in progress. Please wait and try again.',
        retryAfter: Math.ceil(ttlMs / 1000),
      });
    }

    // Store lock info on request for cleanup
    (req as any).distributedLock = { key: lockKey, owner };

    // Auto-release on response finish
    res.on('finish', async () => {
      await releaseLock(lockKey, owner);
    });

    next();
  };
}

// Pre-configured lock middleware for withdrawals
export const withdrawalLock = requireLock(
  (req) => `withdrawal:${req.params.pilotId || req.body.pilotId || (req as any).user?.id}`,
  10000 // 10 second lock
);

// ============================================================================
// OPEN REDIRECT PROTECTION
// ============================================================================

// Configurable via ALLOWED_REDIRECT_HOSTS env var (comma-separated)
const DEFAULT_REDIRECT_HOSTS = [
  'localhost',
  '127.0.0.1',
  'timebeyondus.com',
  'www.timebeyondus.com',
  'app.timebeyondus.com',
  'api.timebeyondus.com',
];

const envHosts = process.env.ALLOWED_REDIRECT_HOSTS?.split(',').map(h => h.trim()).filter(Boolean) || [];
const ALLOWED_REDIRECT_HOSTS = new Set([...DEFAULT_REDIRECT_HOSTS, ...envHosts]);

/**
 * Validate and sanitize redirect URL
 */
export function validateRedirectUrl(url: string | null | undefined): string {
  if (!url) return '/';

  // Must start with /
  if (!url.startsWith('/')) {
    // Check if it's a full URL
    try {
      const parsed = new URL(url);

      // Check if host is allowed
      if (!ALLOWED_REDIRECT_HOSTS.has(parsed.hostname)) {
        logger.warn('[Redirect] Blocked external redirect', { url, host: parsed.hostname });
        return '/';
      }

      // Return just the path + query
      return parsed.pathname + parsed.search;
    } catch {
      // Invalid URL
      logger.warn('[Redirect] Invalid redirect URL', { url });
      return '/';
    }
  }

  // Prevent protocol-relative URLs (//evil.com)
  if (url.startsWith('//')) {
    logger.warn('[Redirect] Blocked protocol-relative redirect', { url });
    return '/';
  }

  // Prevent javascript: and data: URLs
  if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
    logger.warn('[Redirect] Blocked script redirect', { url });
    return '/';
  }

  return url;
}

/**
 * Middleware to sanitize redirect parameters
 */
export function sanitizeRedirect(req: Request, _res: Response, next: NextFunction) {
  if (req.query.redirect) {
    req.query.redirect = validateRedirectUrl(req.query.redirect as string);
  }
  if (req.query.returnUrl) {
    req.query.returnUrl = validateRedirectUrl(req.query.returnUrl as string);
  }
  if (req.body?.redirect) {
    req.body.redirect = validateRedirectUrl(req.body.redirect);
  }
  if (req.body?.returnUrl) {
    req.body.returnUrl = validateRedirectUrl(req.body.returnUrl);
  }
  next();
}

// ============================================================================
// PASSWORD BREACH CHECKING (HaveIBeenPwned)
// ============================================================================

/**
 * Check if password has been exposed in data breaches
 * Uses k-anonymity model - only sends first 5 chars of SHA-1 hash
 */
export async function checkPasswordBreach(password: string): Promise<{
  breached: boolean;
  count: number;
}> {
  try {
    // Create SHA-1 hash of password
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    // Query HIBP API with k-anonymity
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'TIME-Security-Check',
        'Add-Padding': 'true', // Add padding to prevent timing attacks
      },
    });

    if (!response.ok) {
      logger.warn('[PasswordBreach] API error', { status: response.status });
      return { breached: false, count: 0 }; // Fail open
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        const count = parseInt(countStr.trim(), 10);
        logger.info('[PasswordBreach] Password found in breach database', { count });
        return { breached: true, count };
      }
    }

    return { breached: false, count: 0 };
  } catch (error) {
    logger.error('[PasswordBreach] Error checking password', { error: String(error) });
    return { breached: false, count: 0 }; // Fail open
  }
}

/**
 * Middleware to check password on registration/change
 */
export async function checkPasswordBreachMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const password = req.body.password || req.body.newPassword;

  if (!password) {
    return next();
  }

  const result = await checkPasswordBreach(password);

  if (result.breached) {
    return res.status(400).json({
      success: false,
      error: 'This password has been exposed in data breaches. Please choose a different password.',
      breachCount: result.count,
      recommendation: 'Use a unique password that you have not used on any other website.',
    });
  }

  next();
}

// ============================================================================
// HMAC WEBHOOK SIGNATURE VALIDATION
// ============================================================================

interface WebhookConfig {
  secret: string;
  headerName: string;
  algorithm?: string;
  tolerance?: number; // Time tolerance in seconds for timestamp validation
}

const WEBHOOK_CONFIGS: Record<string, Partial<WebhookConfig>> = {
  alchemy: {
    headerName: 'x-alchemy-signature',
    algorithm: 'sha256',
  },
  stripe: {
    headerName: 'stripe-signature',
    algorithm: 'sha256',
    tolerance: 300, // 5 minutes
  },
  twilio: {
    headerName: 'x-twilio-signature',
    algorithm: 'sha1',
  },
};

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    logger.error('[Webhook] Signature validation error', { error: String(error) });
    return false;
  }
}

/**
 * Create webhook validation middleware
 */
export function createWebhookValidator(provider: string) {
  const config = WEBHOOK_CONFIGS[provider];

  if (!config) {
    throw new Error(`Unknown webhook provider: ${provider}`);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];

    if (!secret) {
      logger.warn(`[Webhook] No secret configured for ${provider}`);
      return res.status(500).json({
        success: false,
        error: 'Webhook not configured',
      });
    }

    const signature = req.headers[config.headerName!] as string;

    if (!signature) {
      logger.warn(`[Webhook] Missing signature header for ${provider}`, {} as object);
      return res.status(401).json({
        success: false,
        error: 'Missing webhook signature',
      });
    }

    // Get raw body
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const isValid = validateWebhookSignature(
      rawBody,
      signature,
      secret,
      config.algorithm
    );

    if (!isValid) {
      logger.warn(`[Webhook] Invalid signature for ${provider}`, {
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    logger.info(`[Webhook] Valid signature for ${provider}`);
    next();
  };
}

// Pre-configured webhook validators
export const webhookValidators = {
  alchemy: createWebhookValidator('alchemy'),
  stripe: createWebhookValidator('stripe'),
  twilio: createWebhookValidator('twilio'),
};

// ============================================================================
// SECURITY HEADERS MIDDLEWARE
// ============================================================================

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.timebeyondus.com wss://ws.timebeyondus.com",
    "frame-ancestors 'none'",
  ].join('; '));

  // HSTS (if in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Deep sanitize object
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// ============================================================================
// BOT & SCRAPER DETECTION
// ============================================================================

// Known bot/scraper user agents
const BOT_USER_AGENTS = [
  'GPTBot', 'ChatGPT-User', 'CCBot', 'Google-Extended', 'anthropic-ai', 'Claude-Web',
  'cohere-ai', 'Bytespider', 'PetalBot', 'Amazonbot', 'FacebookBot', 'AhrefsBot',
  'SemrushBot', 'MJ12bot', 'DotBot', 'BLEXBot', 'YandexBot', 'Baiduspider',
  'DataForSeoBot', 'serpstatbot', 'SEOkicks', 'LinkpadBot', 'Cliqzbot', 'ZoominfoBot',
  'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests', 'axios/',
  'node-fetch', 'scrapy', 'httpclient', 'libwww', 'Mechanize',
];

// Known suspicious patterns
const SUSPICIOUS_PATTERNS = [
  /^$/,                    // Empty user agent
  /bot|crawler|spider/i,   // Generic bot patterns
  /scraper|harvest/i,      // Scraping tools
  /http|client|library/i,  // HTTP libraries
];

/**
 * Detect and block bots/scrapers
 */
export function botDetection(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Check against known bot user agents
  const isKnownBot = BOT_USER_AGENTS.some(bot =>
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );

  // Check suspicious patterns
  const isSuspiciousPattern = SUSPICIOUS_PATTERNS.some(pattern =>
    pattern.test(userAgent)
  );

  // Check for missing/empty user agent (very suspicious)
  const hasNoUserAgent = !userAgent || userAgent.length < 10;

  // Check for too many headers (automated tool signature)
  const headerCount = Object.keys(req.headers).length;
  const hasTooManyHeaders = headerCount > 50;

  // Calculate suspicion score
  let suspicionScore = 0;
  if (isKnownBot) suspicionScore += 100;
  if (isSuspiciousPattern) suspicionScore += 50;
  if (hasNoUserAgent) suspicionScore += 30;
  if (hasTooManyHeaders) suspicionScore += 20;

  // Block if highly suspicious
  if (suspicionScore >= 50) {
    logger.warn('[BotDetection] Blocked suspicious request', {
      ip,
      userAgent: userAgent.substring(0, 100),
      score: suspicionScore,
      path: req.path,
    });

    // Return 403 with minimal info (don't help scrapers)
    return res.status(403).json({
      error: 'Access denied',
    });
  }

  // Add anti-scraping headers
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');

  next();
}

/**
 * Apply strict bot blocking to sensitive routes
 */
export function strictBotBlocking(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.headers['user-agent'] || '';

  // Block ANY request without a proper browser user agent
  const browserSignatures = ['Mozilla', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'];
  const hasBrowserSignature = browserSignatures.some(sig =>
    userAgent.includes(sig)
  );

  if (!hasBrowserSignature) {
    logger.warn('[StrictBot] Blocked non-browser request', {
      ip: req.ip,
      userAgent: userAgent.substring(0, 50),
      path: req.path,
    });

    return res.status(403).json({
      error: 'Access denied',
    });
  }

  next();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Rate limiting
  createRateLimiter,
  rateLimiters,

  // Distributed locks
  acquireLock,
  releaseLock,
  requireLock,
  withdrawalLock,

  // Redirect protection
  validateRedirectUrl,
  sanitizeRedirect,

  // Password security
  checkPasswordBreach,
  checkPasswordBreachMiddleware,

  // Webhook validation
  validateWebhookSignature,
  createWebhookValidator,
  webhookValidators,

  // Headers
  securityHeaders,

  // Sanitization
  sanitizeString,
  sanitizeObject,

  // Bot/scraper detection
  botDetection,
  strictBotBlocking,
};

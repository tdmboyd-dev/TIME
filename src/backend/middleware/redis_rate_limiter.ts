/**
 * Redis-Based Rate Limiter for TIME
 *
 * Distributed rate limiting using Redis for multi-server support.
 * Falls back to in-memory limiting if Redis is unavailable.
 */

import { Request, Response, NextFunction } from 'express';
import { databaseManager } from '../database/connection';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('RateLimiter');

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // Redis key prefix
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  general: { windowMs: 60000, maxRequests: 100, keyPrefix: 'rl:general' },
  auth: { windowMs: 60000, maxRequests: 10, keyPrefix: 'rl:auth' },
  authStrict: { windowMs: 900000, maxRequests: 5, keyPrefix: 'rl:auth_strict' }, // 15 min, 5 attempts
  trade: { windowMs: 60000, maxRequests: 30, keyPrefix: 'rl:trade' },
  admin: { windowMs: 60000, maxRequests: 50, keyPrefix: 'rl:admin' },
  api: { windowMs: 60000, maxRequests: 100, keyPrefix: 'rl:api' },
  websocket: { windowMs: 1000, maxRequests: 10, keyPrefix: 'rl:ws' }, // Per second for WS
};

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup in-memory store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryStore) {
    if (now > data.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60000);

/**
 * Get client identifier for rate limiting
 */
function getClientKey(req: Request, prefix: string): string {
  // Use X-Forwarded-For for proxied requests, fall back to IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
             req.socket.remoteAddress ||
             'unknown';

  // Include user ID if authenticated for more granular limiting
  const userId = (req as any).user?.id;

  return userId ? `${prefix}:user:${userId}` : `${prefix}:ip:${ip}`;
}

/**
 * Check rate limit using Redis (with in-memory fallback)
 */
async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const windowEnd = now + config.windowMs;

  try {
    const redis = databaseManager.getRedis();

    // Check if Redis is actually available (not mock)
    if (redis && 'incr' in redis) {
      // Use Redis for distributed rate limiting
      const redisKey = `${config.keyPrefix}:${key}`;

      // Increment counter
      const count = await (redis as any).incr(redisKey);

      // Set expiry on first request
      if (count === 1) {
        await (redis as any).pExpire(redisKey, config.windowMs);
      }

      // Get TTL for reset time
      const ttl = await (redis as any).pTTL(redisKey);
      const resetTime = now + (ttl > 0 ? ttl : config.windowMs);

      const allowed = count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      };
    }
  } catch (error) {
    logger.warn('Redis rate limit check failed, using in-memory fallback', { error });
  }

  // Fallback to in-memory
  const memKey = `${config.keyPrefix}:${key}`;
  const existing = memoryStore.get(memKey);

  if (!existing || now > existing.resetTime) {
    memoryStore.set(memKey, { count: 1, resetTime: windowEnd });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: windowEnd };
  }

  existing.count++;
  const allowed = existing.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - existing.count);

  return {
    allowed,
    remaining,
    resetTime: existing.resetTime,
    retryAfter: allowed ? undefined : Math.ceil((existing.resetTime - now) / 1000),
  };
}

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(configOrType: RateLimitConfig | keyof typeof RATE_LIMIT_CONFIGS) {
  const config = typeof configOrType === 'string'
    ? RATE_LIMIT_CONFIGS[configOrType]
    : configOrType;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = getClientKey(req, config.keyPrefix);
    const result = await checkRateLimit(key, config);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter!.toString());
      logger.warn('Rate limit exceeded', {
        key,
        prefix: config.keyPrefix,
        path: req.path,
      });

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      });
      return;
    }

    next();
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  general: createRateLimiter('general'),
  auth: createRateLimiter('auth'),
  authStrict: createRateLimiter('authStrict'),
  trade: createRateLimiter('trade'),
  admin: createRateLimiter('admin'),
  api: createRateLimiter('api'),
  websocket: createRateLimiter('websocket'),
};

/**
 * Check if IP is blocked (for severe abuse)
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  try {
    const redis = databaseManager.getRedis();
    if (redis && 'get' in redis) {
      const blocked = await redis.get(`blocked:ip:${ip}`);
      return blocked === 'true';
    }
  } catch {
    // Fallback - not blocked if can't check
  }
  return false;
}

/**
 * Block an IP for abuse
 */
export async function blockIP(ip: string, durationSeconds: number = 3600): Promise<void> {
  try {
    const redis = databaseManager.getRedis();
    if (redis && 'setEx' in redis) {
      await (redis as any).setEx(`blocked:ip:${ip}`, durationSeconds, 'true');
      logger.warn(`IP blocked for ${durationSeconds}s: ${ip}`);
    }
  } catch (error) {
    logger.error('Failed to block IP', { error, ip });
  }
}

export default rateLimiters;

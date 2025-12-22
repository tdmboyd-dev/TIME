/**
 * Session Store for TIME
 *
 * Redis-backed session storage for:
 * - WebAuthn challenges
 * - OAuth states
 * - Rate limiting
 * - General session data
 *
 * Automatically falls back to in-memory storage if Redis unavailable.
 */

import { databaseManager } from '../database/connection';
import { createComponentLogger } from './logger';

const logger = createComponentLogger('SessionStore');

// TTL constants (in seconds)
const DEFAULT_TTL = 300; // 5 minutes
const WEBAUTHN_CHALLENGE_TTL = 120; // 2 minutes
const OAUTH_STATE_TTL = 600; // 10 minutes
const RATE_LIMIT_TTL = 60; // 1 minute

// In-memory fallback store
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

// Clean up expired in-memory entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryStore.entries()) {
    if (data.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, 60000);

/**
 * Session Store class with Redis + in-memory fallback
 */
class SessionStore {
  private prefix = 'time:session:';

  /**
   * Set a value with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    const fullKey = this.prefix + key;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      const redis = databaseManager.getRedis();
      if (redis && 'set' in redis && typeof redis.set === 'function') {
        await redis.set(fullKey, stringValue, { EX: ttlSeconds });
        return;
      }
    } catch (error) {
      // Fall through to memory store
    }

    // In-memory fallback
    memoryStore.set(fullKey, {
      value: stringValue,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
  }

  /**
   * Get a value
   */
  async get<T = string>(key: string): Promise<T | null> {
    const fullKey = this.prefix + key;

    try {
      const redis = databaseManager.getRedis();
      if (redis && 'get' in redis && typeof redis.get === 'function') {
        const value = await redis.get(fullKey);
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      }
    } catch (error) {
      // Fall through to memory store
    }

    // In-memory fallback
    const data = memoryStore.get(fullKey);
    if (!data || data.expiresAt < Date.now()) {
      memoryStore.delete(fullKey);
      return null;
    }
    try {
      return JSON.parse(data.value) as T;
    } catch {
      return data.value as T;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.prefix + key;

    try {
      const redis = databaseManager.getRedis();
      if (redis && 'del' in redis && typeof redis.del === 'function') {
        await redis.del(fullKey);
        return;
      }
    } catch (error) {
      // Fall through to memory store
    }

    // In-memory fallback
    memoryStore.delete(fullKey);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.prefix + key;

    try {
      const redis = databaseManager.getRedis();
      if (redis && 'exists' in redis && typeof redis.exists === 'function') {
        return (await redis.exists(fullKey)) === 1;
      }
    } catch (error) {
      // Fall through to memory store
    }

    // In-memory fallback
    const data = memoryStore.get(fullKey);
    if (!data || data.expiresAt < Date.now()) {
      memoryStore.delete(fullKey);
      return false;
    }
    return true;
  }

  /**
   * Increment a counter (for rate limiting)
   */
  async increment(key: string, ttlSeconds: number = RATE_LIMIT_TTL): Promise<number> {
    const fullKey = this.prefix + key;

    try {
      const redis = databaseManager.getRedis();
      if (redis && 'incr' in redis && typeof redis.incr === 'function') {
        const value = await redis.incr(fullKey);
        if (value === 1) {
          await redis.expire(fullKey, ttlSeconds);
        }
        return value;
      }
    } catch (error) {
      // Fall through to memory store
    }

    // In-memory fallback
    const data = memoryStore.get(fullKey);
    let count = 1;
    if (data && data.expiresAt > Date.now()) {
      count = parseInt(data.value, 10) + 1;
    }
    memoryStore.set(fullKey, {
      value: count.toString(),
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
    return count;
  }

  // ============================================================================
  // Specialized Methods
  // ============================================================================

  /**
   * Store WebAuthn challenge
   */
  async setWebAuthnChallenge(
    sessionId: string,
    data: { challenge: string; userId?: string }
  ): Promise<void> {
    await this.set(`webauthn:${sessionId}`, data, WEBAUTHN_CHALLENGE_TTL);
    logger.debug('WebAuthn challenge stored', { sessionId });
  }

  /**
   * Get and delete WebAuthn challenge (one-time use)
   */
  async getWebAuthnChallenge(
    sessionId: string
  ): Promise<{ challenge: string; userId?: string } | null> {
    const data = await this.get<{ challenge: string; userId?: string }>(`webauthn:${sessionId}`);
    if (data) {
      await this.delete(`webauthn:${sessionId}`);
      logger.debug('WebAuthn challenge retrieved and deleted', { sessionId });
    }
    return data;
  }

  /**
   * Store OAuth state
   */
  async setOAuthState(
    state: string,
    data: { provider: string; returnUrl?: string; linkToUserId?: string }
  ): Promise<void> {
    await this.set(`oauth:${state}`, data, OAUTH_STATE_TTL);
    logger.debug('OAuth state stored', { state, provider: data.provider });
  }

  /**
   * Get and delete OAuth state (one-time use)
   */
  async getOAuthState(
    state: string
  ): Promise<{ provider: string; returnUrl?: string; linkToUserId?: string } | null> {
    const data = await this.get<{ provider: string; returnUrl?: string; linkToUserId?: string }>(`oauth:${state}`);
    if (data) {
      await this.delete(`oauth:${state}`);
      logger.debug('OAuth state retrieved and deleted', { state });
    }
    return data;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const count = await this.increment(`ratelimit:${key}`, windowSeconds);
    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetIn: windowSeconds,
    };
  }
}

// Export singleton instance
export const sessionStore = new SessionStore();
export default sessionStore;

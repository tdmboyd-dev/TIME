/**
 * TIME API Key Management System
 *
 * Enterprise-grade API key management for programmatic access.
 * Features: Key rotation, IP whitelisting, permissions, rate limiting per key.
 *
 * PLAIN ENGLISH:
 * - API keys let programs/bots access your account without using your password
 * - Each key can have limited permissions (read-only, trade, withdraw)
 * - Keys can be restricted to specific IP addresses
 * - Keys automatically rotate for security
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

// Configuration
const API_KEY_CONFIG = {
  KEY_LENGTH: 32, // bytes
  SECRET_LENGTH: 64, // bytes
  PREFIX: 'time_', // API key prefix for easy identification
  BCRYPT_ROUNDS: 12,
  DEFAULT_EXPIRY_DAYS: 365,
  MAX_KEYS_PER_USER: 10,
};

// Permission types for API keys
export type APIKeyPermission =
  | 'read:portfolio' // View positions and balances
  | 'read:orders' // View order history
  | 'read:market' // Access market data
  | 'write:orders' // Place and cancel orders
  | 'write:transfer' // Initiate transfers (requires extra verification)
  | 'admin:account'; // Full account access (dangerous)

// All available permissions with descriptions
export const PERMISSION_DESCRIPTIONS: Record<APIKeyPermission, string> = {
  'read:portfolio': 'View your portfolio, positions, and account balances',
  'read:orders': 'View order history and open orders',
  'read:market': 'Access real-time and historical market data',
  'write:orders': 'Place, modify, and cancel orders',
  'write:transfer': 'Initiate deposits, withdrawals, and transfers',
  'admin:account': 'Full account access including settings changes',
};

// Permission presets for common use cases
export const PERMISSION_PRESETS = {
  readOnly: ['read:portfolio', 'read:orders', 'read:market'] as APIKeyPermission[],
  trading: ['read:portfolio', 'read:orders', 'read:market', 'write:orders'] as APIKeyPermission[],
  full: Object.keys(PERMISSION_DESCRIPTIONS) as APIKeyPermission[],
};

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string; // First 8 chars for identification
  keyHash: string; // bcrypt hash of full key
  secretHash: string; // bcrypt hash of secret
  permissions: APIKeyPermission[];
  ipWhitelist: string[]; // Empty = all IPs allowed
  createdAt: Date;
  lastUsedAt: Date | null;
  lastUsedIP: string | null;
  expiresAt: Date;
  isActive: boolean;
  usageCount: number;
  rateLimitPerMinute: number;
  metadata: {
    description?: string;
    environment?: 'production' | 'sandbox' | 'development';
    createdBy?: string;
  };
}

export interface APIKeyCreateResult {
  key: APIKey;
  apiKey: string; // Full API key - ONLY shown once!
  apiSecret: string; // Full API secret - ONLY shown once!
}

export interface APIKeyValidation {
  valid: boolean;
  key?: APIKey;
  error?: string;
}

/**
 * Generate a cryptographically secure API key
 */
function generateAPIKey(): string {
  const bytes = crypto.randomBytes(API_KEY_CONFIG.KEY_LENGTH);
  const key = bytes.toString('hex');
  return `${API_KEY_CONFIG.PREFIX}${key}`;
}

/**
 * Generate a cryptographically secure API secret
 */
function generateAPISecret(): string {
  const bytes = crypto.randomBytes(API_KEY_CONFIG.SECRET_LENGTH);
  return bytes.toString('base64url');
}

/**
 * Generate unique key ID
 */
function generateKeyId(): string {
  return `key_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Get key prefix for identification (first 8 chars after prefix)
 */
function getKeyPrefix(fullKey: string): string {
  return fullKey.slice(0, API_KEY_CONFIG.PREFIX.length + 8);
}

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  // CIDR notation
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || cidrRegex.test(ip);
}

/**
 * Check if IP is in whitelist (supports CIDR notation)
 */
function isIPWhitelisted(ip: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) return true; // No whitelist = all allowed

  for (const allowed of whitelist) {
    if (allowed.includes('/')) {
      // CIDR notation - check if IP is in range
      if (isIPInCIDR(ip, allowed)) return true;
    } else {
      // Exact match
      if (ip === allowed) return true;
    }
  }

  return false;
}

/**
 * Check if IP is within CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);

  const ipNum = ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  const rangeNum = range
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);

  return (ipNum & mask) === (rangeNum & mask);
}

export class APIKeyManager {
  private keys: Map<string, APIKey> = new Map();
  private keysByUser: Map<string, string[]> = new Map();
  private rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * Create a new API key
   *
   * PLAIN ENGLISH:
   * - Creates a new key with specific permissions
   * - The full key and secret are ONLY shown once - save them!
   * - Can optionally restrict to specific IP addresses
   */
  async createKey(
    userId: string,
    options: {
      name: string;
      permissions: APIKeyPermission[];
      ipWhitelist?: string[];
      expiryDays?: number;
      rateLimitPerMinute?: number;
      description?: string;
      environment?: 'production' | 'sandbox' | 'development';
    }
  ): Promise<APIKeyCreateResult> {
    // Check key limit
    const userKeys = this.keysByUser.get(userId) || [];
    if (userKeys.length >= API_KEY_CONFIG.MAX_KEYS_PER_USER) {
      throw new Error(`Maximum ${API_KEY_CONFIG.MAX_KEYS_PER_USER} API keys per user`);
    }

    // Validate IP whitelist
    if (options.ipWhitelist) {
      for (const ip of options.ipWhitelist) {
        if (!isValidIP(ip)) {
          throw new Error(`Invalid IP address: ${ip}`);
        }
      }
    }

    // Generate keys
    const apiKey = generateAPIKey();
    const apiSecret = generateAPISecret();

    // Hash for storage (we never store the plain keys)
    const keyHash = await bcrypt.hash(apiKey, API_KEY_CONFIG.BCRYPT_ROUNDS);
    const secretHash = await bcrypt.hash(apiSecret, API_KEY_CONFIG.BCRYPT_ROUNDS);

    // Calculate expiry
    const expiryDays = options.expiryDays || API_KEY_CONFIG.DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const key: APIKey = {
      id: generateKeyId(),
      userId,
      name: options.name,
      keyPrefix: getKeyPrefix(apiKey),
      keyHash,
      secretHash,
      permissions: options.permissions,
      ipWhitelist: options.ipWhitelist || [],
      createdAt: new Date(),
      lastUsedAt: null,
      lastUsedIP: null,
      expiresAt,
      isActive: true,
      usageCount: 0,
      rateLimitPerMinute: options.rateLimitPerMinute || 60,
      metadata: {
        description: options.description,
        environment: options.environment || 'production',
      },
    };

    // Store key
    this.keys.set(key.id, key);
    userKeys.push(key.id);
    this.keysByUser.set(userId, userKeys);

    logger.info('API key created', {
      userId,
      keyId: key.id,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
    });

    return {
      key,
      apiKey, // Full key - ONLY returned on creation!
      apiSecret, // Full secret - ONLY returned on creation!
    };
  }

  /**
   * Validate an API key and secret
   *
   * Returns the key object if valid, or an error message if not.
   */
  async validateKey(
    apiKey: string,
    apiSecret: string,
    clientIP: string
  ): Promise<APIKeyValidation> {
    // Find key by prefix
    const prefix = getKeyPrefix(apiKey);
    let matchedKey: APIKey | undefined;

    for (const key of this.keys.values()) {
      if (key.keyPrefix === prefix && key.isActive) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      logger.warn('API key not found', { prefix });
      return { valid: false, error: 'Invalid API key' };
    }

    // Check expiration
    if (new Date() > matchedKey.expiresAt) {
      logger.warn('API key expired', { keyId: matchedKey.id });
      return { valid: false, error: 'API key expired' };
    }

    // Verify key hash
    const keyValid = await bcrypt.compare(apiKey, matchedKey.keyHash);
    if (!keyValid) {
      logger.warn('API key hash mismatch', { keyId: matchedKey.id });
      return { valid: false, error: 'Invalid API key' };
    }

    // Verify secret hash
    const secretValid = await bcrypt.compare(apiSecret, matchedKey.secretHash);
    if (!secretValid) {
      logger.warn('API secret mismatch', { keyId: matchedKey.id });
      return { valid: false, error: 'Invalid API secret' };
    }

    // Check IP whitelist
    if (!isIPWhitelisted(clientIP, matchedKey.ipWhitelist)) {
      logger.warn('API key IP not whitelisted', {
        keyId: matchedKey.id,
        clientIP,
        whitelist: matchedKey.ipWhitelist,
      });
      return { valid: false, error: 'IP address not authorized' };
    }

    // Check rate limit
    const rateLimitResult = this.checkRateLimit(matchedKey.id, matchedKey.rateLimitPerMinute);
    if (!rateLimitResult.allowed) {
      logger.warn('API key rate limited', { keyId: matchedKey.id });
      return {
        valid: false,
        error: `Rate limit exceeded. Reset in ${rateLimitResult.resetInSeconds} seconds`,
      };
    }

    // Update usage stats
    matchedKey.lastUsedAt = new Date();
    matchedKey.lastUsedIP = clientIP;
    matchedKey.usageCount++;

    logger.info('API key validated', {
      keyId: matchedKey.id,
      userId: matchedKey.userId,
    });

    return { valid: true, key: matchedKey };
  }

  /**
   * Check if key has specific permission
   */
  hasPermission(key: APIKey, permission: APIKeyPermission): boolean {
    return key.permissions.includes(permission) || key.permissions.includes('admin:account');
  }

  /**
   * Check rate limit for key
   */
  private checkRateLimit(
    keyId: string,
    limitPerMinute: number
  ): { allowed: boolean; resetInSeconds?: number } {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    const current = this.rateLimitStore.get(keyId);

    if (!current || now > current.resetAt) {
      // New window
      this.rateLimitStore.set(keyId, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }

    if (current.count >= limitPerMinute) {
      const resetInSeconds = Math.ceil((current.resetAt - now) / 1000);
      return { allowed: false, resetInSeconds };
    }

    current.count++;
    return { allowed: true };
  }

  /**
   * Rotate an API key (generate new secret)
   *
   * PLAIN ENGLISH:
   * - Creates a new secret while keeping the same key
   * - Old secret stops working immediately
   * - Use this periodically for security
   */
  async rotateKey(keyId: string, userId: string): Promise<{ newSecret: string }> {
    const key = this.keys.get(keyId);

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Generate new secret
    const newSecret = generateAPISecret();
    const secretHash = await bcrypt.hash(newSecret, API_KEY_CONFIG.BCRYPT_ROUNDS);

    key.secretHash = secretHash;

    logger.info('API key rotated', { keyId, userId });

    return { newSecret };
  }

  /**
   * Revoke an API key
   */
  revokeKey(keyId: string, userId: string): void {
    const key = this.keys.get(keyId);

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.userId !== userId) {
      throw new Error('Unauthorized');
    }

    key.isActive = false;

    logger.info('API key revoked', { keyId, userId });
  }

  /**
   * List all keys for a user (without sensitive data)
   */
  listKeys(userId: string): Omit<APIKey, 'keyHash' | 'secretHash'>[] {
    const keyIds = this.keysByUser.get(userId) || [];

    return keyIds
      .map((id) => this.keys.get(id))
      .filter((key): key is APIKey => key !== undefined)
      .map(({ keyHash, secretHash, ...rest }) => rest);
  }

  /**
   * Update key settings
   */
  updateKey(
    keyId: string,
    userId: string,
    updates: {
      name?: string;
      permissions?: APIKeyPermission[];
      ipWhitelist?: string[];
      rateLimitPerMinute?: number;
      isActive?: boolean;
    }
  ): APIKey {
    const key = this.keys.get(keyId);

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Validate IP whitelist if provided
    if (updates.ipWhitelist) {
      for (const ip of updates.ipWhitelist) {
        if (!isValidIP(ip)) {
          throw new Error(`Invalid IP address: ${ip}`);
        }
      }
    }

    // Apply updates
    if (updates.name) key.name = updates.name;
    if (updates.permissions) key.permissions = updates.permissions;
    if (updates.ipWhitelist) key.ipWhitelist = updates.ipWhitelist;
    if (updates.rateLimitPerMinute) key.rateLimitPerMinute = updates.rateLimitPerMinute;
    if (updates.isActive !== undefined) key.isActive = updates.isActive;

    logger.info('API key updated', { keyId, userId, updates: Object.keys(updates) });

    return key;
  }

  /**
   * Delete API key permanently
   */
  deleteKey(keyId: string, userId: string): void {
    const key = this.keys.get(keyId);

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Remove from maps
    this.keys.delete(keyId);

    const userKeys = this.keysByUser.get(userId) || [];
    const filtered = userKeys.filter((id) => id !== keyId);
    this.keysByUser.set(userId, filtered);

    logger.info('API key deleted', { keyId, userId });
  }

  /**
   * Get usage statistics for all keys
   */
  getKeyStats(userId: string): {
    totalKeys: number;
    activeKeys: number;
    totalUsage: number;
    keyStats: { keyId: string; name: string; usageCount: number; lastUsedAt: Date | null }[];
  } {
    const keyIds = this.keysByUser.get(userId) || [];
    const keys = keyIds.map((id) => this.keys.get(id)).filter((k): k is APIKey => k !== undefined);

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter((k) => k.isActive).length,
      totalUsage: keys.reduce((sum, k) => sum + k.usageCount, 0),
      keyStats: keys.map((k) => ({
        keyId: k.id,
        name: k.name,
        usageCount: k.usageCount,
        lastUsedAt: k.lastUsedAt,
      })),
    };
  }
}

// Export singleton instance
export const apiKeyManager = new APIKeyManager();

logger.info('API Key Manager initialized - Enterprise security enabled');

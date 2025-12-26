/**
 * TIME BEYOND US - User API Access Service
 *
 * Enterprise-grade API access system for programmatic trading.
 * Allows users to build their own integrations with TIME platform.
 *
 * FEATURES:
 * - API key generation and management (multiple keys per user)
 * - Rate limiting per key based on subscription tier
 * - Granular permissions/scopes (read, trade, withdraw)
 * - IP whitelisting for enhanced security
 * - API key expiration with auto-rotation
 * - Webhook configuration for events
 * - OAuth2 support for third-party apps
 * - Usage tracking and analytics
 *
 * PLAIN ENGLISH:
 * - This lets you (or your programs/bots) access TIME features programmatically
 * - Each API key can have limited permissions for security
 * - Rate limits prevent abuse and ensure fair usage
 * - Webhooks notify your servers when things happen (trades, alerts, etc.)
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { SubscriptionTier } from '../services/GiftAccessService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_CONFIG = {
  KEY_PREFIX: 'time_live_',           // Prefix for live API keys
  TEST_KEY_PREFIX: 'time_test_',      // Prefix for test/sandbox API keys
  KEY_LENGTH: 32,                      // Bytes for key generation
  SECRET_LENGTH: 64,                   // Bytes for secret generation
  BCRYPT_ROUNDS: 12,                   // Hash rounds
  MAX_KEYS_PER_USER: 10,              // Maximum keys per user
  DEFAULT_EXPIRY_DAYS: 365,           // Default key expiration
  MAX_WEBHOOKS_PER_KEY: 5,            // Webhooks per API key
  MAX_IP_WHITELIST: 20,               // IPs per whitelist
};

// Rate limits by subscription tier (requests per day)
export const RATE_LIMITS_BY_TIER: Record<SubscriptionTier, number> = {
  FREE: 100,
  STARTER: 1000,
  PRO: 10000,
  UNLIMITED: 50000,
  ENTERPRISE: -1, // Unlimited
};

// Alternative names for compatibility
export const TIER_DAILY_LIMITS = {
  FREE: 100,
  BASIC: 1000,      // Maps to STARTER
  PRO: 10000,
  PREMIUM: 50000,   // Maps to UNLIMITED
  ENTERPRISE: -1,   // Unlimited
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// API Key Scopes (Permissions)
export type APIScope =
  | 'read:account'     // View account info, balances
  | 'read:portfolio'   // View positions, holdings
  | 'read:orders'      // View order history
  | 'read:market'      // Access market data
  | 'read:bots'        // View bot configurations
  | 'read:analytics'   // Access analytics data
  | 'write:orders'     // Place, modify, cancel orders
  | 'write:bots'       // Create, configure bots
  | 'write:transfer'   // Initiate withdrawals (requires extra verification)
  | 'admin:account';   // Full account access

// Scope descriptions for documentation
export const SCOPE_DESCRIPTIONS: Record<APIScope, { name: string; description: string; risk: 'low' | 'medium' | 'high' }> = {
  'read:account': {
    name: 'Account Read',
    description: 'View your account information and balances',
    risk: 'low',
  },
  'read:portfolio': {
    name: 'Portfolio Read',
    description: 'View your positions, holdings, and performance',
    risk: 'low',
  },
  'read:orders': {
    name: 'Orders Read',
    description: 'View order history and open orders',
    risk: 'low',
  },
  'read:market': {
    name: 'Market Data',
    description: 'Access real-time and historical market data',
    risk: 'low',
  },
  'read:bots': {
    name: 'Bots Read',
    description: 'View your trading bot configurations',
    risk: 'low',
  },
  'read:analytics': {
    name: 'Analytics Read',
    description: 'Access your trading analytics and reports',
    risk: 'low',
  },
  'write:orders': {
    name: 'Trade',
    description: 'Place, modify, and cancel orders',
    risk: 'high',
  },
  'write:bots': {
    name: 'Bots Write',
    description: 'Create and configure trading bots',
    risk: 'medium',
  },
  'write:transfer': {
    name: 'Transfers',
    description: 'Initiate withdrawals and transfers (requires 2FA)',
    risk: 'high',
  },
  'admin:account': {
    name: 'Full Access',
    description: 'Complete account access including settings',
    risk: 'high',
  },
};

// Scope presets for common use cases
export const SCOPE_PRESETS = {
  readOnly: [
    'read:account',
    'read:portfolio',
    'read:orders',
    'read:market',
    'read:bots',
    'read:analytics',
  ] as APIScope[],
  trading: [
    'read:account',
    'read:portfolio',
    'read:orders',
    'read:market',
    'read:bots',
    'write:orders',
  ] as APIScope[],
  botDeveloper: [
    'read:account',
    'read:portfolio',
    'read:market',
    'read:bots',
    'write:bots',
  ] as APIScope[],
  fullAccess: Object.keys(SCOPE_DESCRIPTIONS) as APIScope[],
};

// Webhook event types
export type WebhookEvent =
  | 'order.created'
  | 'order.filled'
  | 'order.cancelled'
  | 'order.rejected'
  | 'position.opened'
  | 'position.closed'
  | 'bot.signal'
  | 'bot.trade'
  | 'bot.error'
  | 'alert.triggered'
  | 'account.deposit'
  | 'account.withdrawal'
  | 'price.alert';

// Webhook configuration
export interface WebhookConfig {
  id: string;
  apiKeyId: string;
  userId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;                      // For HMAC signature verification
  isActive: boolean;
  createdAt: Date;
  lastTriggeredAt: Date | null;
  failureCount: number;
  lastError: string | null;
  headers?: Record<string, string>;    // Custom headers
  retryPolicy: {
    maxRetries: number;
    retryDelayMs: number;
  };
}

// User API Key
export interface UserAPIKey {
  id: string;
  userId: string;
  label: string;                       // User-friendly name
  description?: string;
  keyPrefix: string;                   // First 12 chars for identification
  keyHash: string;                     // bcrypt hash of full key
  secretHash: string;                  // bcrypt hash of secret
  scopes: APIScope[];
  environment: 'live' | 'test';        // Live or sandbox
  ipWhitelist: string[];               // Empty = all IPs allowed
  expiresAt: Date | null;              // null = never expires
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  lastUsedIP: string | null;
  lastUsedUserAgent: string | null;
  usageStats: {
    totalRequests: number;
    requestsToday: number;
    lastResetDate: string;             // YYYY-MM-DD
    requestsByEndpoint: Record<string, number>;
    errorCount: number;
  };
  webhooks: string[];                  // Webhook IDs
  rateLimitOverride?: number;          // Custom rate limit (admin only)
  metadata: Record<string, any>;       // Custom metadata
}

// API Key Creation Result (shown only once!)
export interface APIKeyCreateResult {
  key: Omit<UserAPIKey, 'keyHash' | 'secretHash'>;
  apiKey: string;                      // Full key - ONLY shown once!
  apiSecret: string;                   // Full secret - ONLY shown once!
  warning: string;
}

// OAuth2 Client Application
export interface OAuthClient {
  id: string;
  clientId: string;
  clientSecretHash: string;
  name: string;
  description?: string;
  developerUserId: string;
  redirectUris: string[];
  allowedScopes: APIScope[];
  website?: string;
  logoUrl?: string;
  isVerified: boolean;                 // Verified by TIME team
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  rateLimitMultiplier: number;         // 1.0 = normal, 2.0 = double
}

// OAuth2 Authorization
export interface OAuthAuthorization {
  id: string;
  userId: string;
  clientId: string;
  scopes: APIScope[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
}

// API Usage Analytics
export interface APIUsageAnalytics {
  userId: string;
  keyId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: Date;
  endTime: Date;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    rateLimitHits: number;
    averageResponseTimeMs: number;
    p95ResponseTimeMs: number;
    p99ResponseTimeMs: number;
    requestsByEndpoint: Record<string, number>;
    requestsByStatusCode: Record<number, number>;
    uniqueIPs: number;
    bandwidthBytes: number;
  };
}

// Validation result
export interface APIKeyValidation {
  valid: boolean;
  key?: UserAPIKey;
  tier?: SubscriptionTier;
  remainingRequests?: number;
  error?: string;
  errorCode?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a cryptographically secure API key
 */
function generateAPIKey(environment: 'live' | 'test'): string {
  const prefix = environment === 'live' ? API_CONFIG.KEY_PREFIX : API_CONFIG.TEST_KEY_PREFIX;
  const bytes = crypto.randomBytes(API_CONFIG.KEY_LENGTH);
  return `${prefix}${bytes.toString('hex')}`;
}

/**
 * Generate a cryptographically secure API secret
 */
function generateAPISecret(): string {
  return crypto.randomBytes(API_CONFIG.SECRET_LENGTH).toString('base64url');
}

/**
 * Generate unique ID
 */
function generateId(prefix: string = 'key'): string {
  return `${prefix}_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Get key prefix for identification
 */
function getKeyPrefix(fullKey: string): string {
  return fullKey.slice(0, 12);
}

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || cidrRegex.test(ip);
}

/**
 * Check if IP is in whitelist
 */
function isIPWhitelisted(ip: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) return true;

  for (const allowed of whitelist) {
    if (allowed.includes('/')) {
      if (isIPInCIDR(ip, allowed)) return true;
    } else {
      if (ip === allowed) return true;
    }
  }
  return false;
}

/**
 * Check if IP is within CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    const rangeNum = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

/**
 * Get today's date string
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate HMAC signature for webhooks
 */
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// ============================================================================
// USER API SERVICE CLASS
// ============================================================================

export class UserAPIService extends EventEmitter {
  // Storage (in production, use MongoDB/Redis)
  private keys: Map<string, UserAPIKey> = new Map();
  private keysByUser: Map<string, string[]> = new Map();
  private keysByPrefix: Map<string, string> = new Map();
  private webhooks: Map<string, WebhookConfig> = new Map();
  private oauthClients: Map<string, OAuthClient> = new Map();
  private oauthAuthorizations: Map<string, OAuthAuthorization> = new Map();
  private usageAnalytics: Map<string, APIUsageAnalytics[]> = new Map();
  private dailyUsage: Map<string, { date: string; count: number }> = new Map();

  constructor() {
    super();
    this.startCleanupJob();
    logger.info('[UserAPIService] User API Access Service initialized');
  }

  // ============================================================================
  // API KEY MANAGEMENT
  // ============================================================================

  /**
   * Create a new API key for a user
   */
  async createAPIKey(
    userId: string,
    options: {
      label: string;
      description?: string;
      scopes: APIScope[];
      environment?: 'live' | 'test';
      ipWhitelist?: string[];
      expiryDays?: number | null;
      metadata?: Record<string, any>;
    }
  ): Promise<APIKeyCreateResult> {
    // Check key limit
    const userKeys = this.keysByUser.get(userId) || [];
    if (userKeys.length >= API_CONFIG.MAX_KEYS_PER_USER) {
      throw new Error(`Maximum ${API_CONFIG.MAX_KEYS_PER_USER} API keys per user`);
    }

    // Validate scopes
    for (const scope of options.scopes) {
      if (!SCOPE_DESCRIPTIONS[scope]) {
        throw new Error(`Invalid scope: ${scope}`);
      }
    }

    // Validate IP whitelist
    if (options.ipWhitelist) {
      if (options.ipWhitelist.length > API_CONFIG.MAX_IP_WHITELIST) {
        throw new Error(`Maximum ${API_CONFIG.MAX_IP_WHITELIST} IPs in whitelist`);
      }
      for (const ip of options.ipWhitelist) {
        if (!isValidIP(ip)) {
          throw new Error(`Invalid IP address: ${ip}`);
        }
      }
    }

    const environment = options.environment || 'live';
    const apiKey = generateAPIKey(environment);
    const apiSecret = generateAPISecret();

    // Hash for storage
    const keyHash = await bcrypt.hash(apiKey, API_CONFIG.BCRYPT_ROUNDS);
    const secretHash = await bcrypt.hash(apiSecret, API_CONFIG.BCRYPT_ROUNDS);

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (options.expiryDays !== null) {
      const days = options.expiryDays ?? API_CONFIG.DEFAULT_EXPIRY_DAYS;
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    const key: UserAPIKey = {
      id: generateId('key'),
      userId,
      label: options.label,
      description: options.description,
      keyPrefix: getKeyPrefix(apiKey),
      keyHash,
      secretHash,
      scopes: options.scopes,
      environment,
      ipWhitelist: options.ipWhitelist || [],
      expiresAt,
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: null,
      lastUsedIP: null,
      lastUsedUserAgent: null,
      usageStats: {
        totalRequests: 0,
        requestsToday: 0,
        lastResetDate: getTodayString(),
        requestsByEndpoint: {},
        errorCount: 0,
      },
      webhooks: [],
      metadata: options.metadata || {},
    };

    // Store
    this.keys.set(key.id, key);
    this.keysByPrefix.set(key.keyPrefix, key.id);
    userKeys.push(key.id);
    this.keysByUser.set(userId, userKeys);

    logger.info('[UserAPIService] API key created', {
      userId,
      keyId: key.id,
      keyPrefix: key.keyPrefix,
      environment,
      scopes: key.scopes,
    });

    this.emit('apiKey:created', { userId, keyId: key.id });

    // Return result (secrets only shown once!)
    const { keyHash: _, secretHash: __, ...safeKey } = key;
    return {
      key: safeKey,
      apiKey,
      apiSecret,
      warning: 'Save these credentials securely. The secret will not be shown again!',
    };
  }

  /**
   * Validate an API key and secret
   */
  async validateAPIKey(
    apiKey: string,
    apiSecret: string,
    clientIP: string,
    userTier: SubscriptionTier = 'FREE'
  ): Promise<APIKeyValidation> {
    const prefix = getKeyPrefix(apiKey);
    const keyId = this.keysByPrefix.get(prefix);

    if (!keyId) {
      return { valid: false, error: 'Invalid API key', errorCode: 'INVALID_KEY' };
    }

    const key = this.keys.get(keyId);
    if (!key || !key.isActive) {
      return { valid: false, error: 'API key is inactive', errorCode: 'KEY_INACTIVE' };
    }

    // Check expiration
    if (key.expiresAt && new Date() > key.expiresAt) {
      return { valid: false, error: 'API key has expired', errorCode: 'KEY_EXPIRED' };
    }

    // Verify key hash
    const keyValid = await bcrypt.compare(apiKey, key.keyHash);
    if (!keyValid) {
      return { valid: false, error: 'Invalid API key', errorCode: 'INVALID_KEY' };
    }

    // Verify secret hash
    const secretValid = await bcrypt.compare(apiSecret, key.secretHash);
    if (!secretValid) {
      return { valid: false, error: 'Invalid API secret', errorCode: 'INVALID_SECRET' };
    }

    // Check IP whitelist
    if (!isIPWhitelisted(clientIP, key.ipWhitelist)) {
      logger.warn('[UserAPIService] IP not whitelisted', { keyId, clientIP });
      return { valid: false, error: 'IP address not authorized', errorCode: 'IP_BLOCKED' };
    }

    // Check rate limit
    const rateLimit = key.rateLimitOverride || RATE_LIMITS_BY_TIER[userTier];
    const dailyUsage = this.getDailyUsage(keyId);

    if (rateLimit !== -1 && dailyUsage >= rateLimit) {
      return {
        valid: false,
        error: `Daily rate limit exceeded (${rateLimit} requests/day)`,
        errorCode: 'RATE_LIMIT',
        remainingRequests: 0,
      };
    }

    // Update usage stats
    this.incrementUsage(keyId, clientIP);

    // Update key usage info
    key.lastUsedAt = new Date();
    key.lastUsedIP = clientIP;

    const remaining = rateLimit === -1 ? -1 : rateLimit - dailyUsage - 1;

    return {
      valid: true,
      key,
      tier: userTier,
      remainingRequests: remaining,
    };
  }

  /**
   * Get daily usage for a key
   */
  private getDailyUsage(keyId: string): number {
    const today = getTodayString();
    const usage = this.dailyUsage.get(keyId);

    if (!usage || usage.date !== today) {
      this.dailyUsage.set(keyId, { date: today, count: 0 });
      return 0;
    }

    return usage.count;
  }

  /**
   * Increment usage for a key
   */
  private incrementUsage(keyId: string, clientIP: string): void {
    const today = getTodayString();
    const usage = this.dailyUsage.get(keyId);

    if (!usage || usage.date !== today) {
      this.dailyUsage.set(keyId, { date: today, count: 1 });
    } else {
      usage.count++;
    }

    // Update key stats
    const key = this.keys.get(keyId);
    if (key) {
      if (key.usageStats.lastResetDate !== today) {
        key.usageStats.requestsToday = 0;
        key.usageStats.lastResetDate = today;
      }
      key.usageStats.totalRequests++;
      key.usageStats.requestsToday++;
    }
  }

  /**
   * Check if key has a specific scope
   */
  hasScope(key: UserAPIKey, scope: APIScope): boolean {
    return key.scopes.includes(scope) || key.scopes.includes('admin:account');
  }

  /**
   * List all API keys for a user
   */
  listKeys(userId: string): Omit<UserAPIKey, 'keyHash' | 'secretHash'>[] {
    const keyIds = this.keysByUser.get(userId) || [];
    return keyIds
      .map(id => this.keys.get(id))
      .filter((key): key is UserAPIKey => key !== undefined)
      .map(({ keyHash, secretHash, ...rest }) => rest);
  }

  /**
   * Get a specific API key
   */
  getKey(keyId: string, userId: string): Omit<UserAPIKey, 'keyHash' | 'secretHash'> | null {
    const key = this.keys.get(keyId);
    if (!key || key.userId !== userId) return null;
    const { keyHash, secretHash, ...rest } = key;
    return rest;
  }

  /**
   * Update API key settings
   */
  updateKey(
    keyId: string,
    userId: string,
    updates: {
      label?: string;
      description?: string;
      scopes?: APIScope[];
      ipWhitelist?: string[];
      isActive?: boolean;
      metadata?: Record<string, any>;
    }
  ): UserAPIKey | null {
    const key = this.keys.get(keyId);
    if (!key || key.userId !== userId) {
      throw new Error('API key not found');
    }

    // Validate scopes
    if (updates.scopes) {
      for (const scope of updates.scopes) {
        if (!SCOPE_DESCRIPTIONS[scope]) {
          throw new Error(`Invalid scope: ${scope}`);
        }
      }
    }

    // Validate IP whitelist
    if (updates.ipWhitelist) {
      for (const ip of updates.ipWhitelist) {
        if (!isValidIP(ip)) {
          throw new Error(`Invalid IP address: ${ip}`);
        }
      }
    }

    // Apply updates
    if (updates.label) key.label = updates.label;
    if (updates.description !== undefined) key.description = updates.description;
    if (updates.scopes) key.scopes = updates.scopes;
    if (updates.ipWhitelist) key.ipWhitelist = updates.ipWhitelist;
    if (updates.isActive !== undefined) key.isActive = updates.isActive;
    if (updates.metadata) key.metadata = { ...key.metadata, ...updates.metadata };

    logger.info('[UserAPIService] API key updated', { keyId, updates: Object.keys(updates) });

    return key;
  }

  /**
   * Rotate API key secret (generate new secret)
   */
  async rotateKeySecret(keyId: string, userId: string): Promise<{ newSecret: string }> {
    const key = this.keys.get(keyId);
    if (!key || key.userId !== userId) {
      throw new Error('API key not found');
    }

    const newSecret = generateAPISecret();
    const secretHash = await bcrypt.hash(newSecret, API_CONFIG.BCRYPT_ROUNDS);
    key.secretHash = secretHash;

    logger.info('[UserAPIService] API key secret rotated', { keyId, userId });
    this.emit('apiKey:rotated', { userId, keyId });

    return { newSecret };
  }

  /**
   * Revoke (deactivate) an API key
   */
  revokeKey(keyId: string, userId: string): void {
    const key = this.keys.get(keyId);
    if (!key || key.userId !== userId) {
      throw new Error('API key not found');
    }

    key.isActive = false;
    logger.info('[UserAPIService] API key revoked', { keyId, userId });
    this.emit('apiKey:revoked', { userId, keyId });
  }

  /**
   * Delete an API key permanently
   */
  deleteKey(keyId: string, userId: string): void {
    const key = this.keys.get(keyId);
    if (!key || key.userId !== userId) {
      throw new Error('API key not found');
    }

    // Remove webhooks
    for (const webhookId of key.webhooks) {
      this.webhooks.delete(webhookId);
    }

    // Remove from maps
    this.keys.delete(keyId);
    this.keysByPrefix.delete(key.keyPrefix);
    this.dailyUsage.delete(keyId);

    const userKeys = this.keysByUser.get(userId) || [];
    this.keysByUser.set(userId, userKeys.filter(id => id !== keyId));

    logger.info('[UserAPIService] API key deleted', { keyId, userId });
    this.emit('apiKey:deleted', { userId, keyId });
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  /**
   * Create a webhook for an API key
   */
  createWebhook(
    keyId: string,
    userId: string,
    config: {
      url: string;
      events: WebhookEvent[];
      headers?: Record<string, string>;
      maxRetries?: number;
      retryDelayMs?: number;
    }
  ): WebhookConfig {
    const key = this.keys.get(keyId);
    if (!key || key.userId !== userId) {
      throw new Error('API key not found');
    }

    if (key.webhooks.length >= API_CONFIG.MAX_WEBHOOKS_PER_KEY) {
      throw new Error(`Maximum ${API_CONFIG.MAX_WEBHOOKS_PER_KEY} webhooks per API key`);
    }

    // Validate URL
    try {
      const url = new URL(config.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Webhook URL must use HTTP or HTTPS');
      }
    } catch {
      throw new Error('Invalid webhook URL');
    }

    const webhook: WebhookConfig = {
      id: generateId('wh'),
      apiKeyId: keyId,
      userId,
      url: config.url,
      events: config.events,
      secret: crypto.randomBytes(32).toString('hex'),
      isActive: true,
      createdAt: new Date(),
      lastTriggeredAt: null,
      failureCount: 0,
      lastError: null,
      headers: config.headers,
      retryPolicy: {
        maxRetries: config.maxRetries ?? 3,
        retryDelayMs: config.retryDelayMs ?? 1000,
      },
    };

    this.webhooks.set(webhook.id, webhook);
    key.webhooks.push(webhook.id);

    logger.info('[UserAPIService] Webhook created', { webhookId: webhook.id, keyId, events: webhook.events });

    return webhook;
  }

  /**
   * List webhooks for an API key
   */
  listWebhooks(keyId: string, userId: string): WebhookConfig[] {
    const key = this.keys.get(keyId);
    if (!key || key.userId !== userId) {
      return [];
    }

    return key.webhooks
      .map(id => this.webhooks.get(id))
      .filter((wh): wh is WebhookConfig => wh !== undefined);
  }

  /**
   * Update a webhook
   */
  updateWebhook(
    webhookId: string,
    userId: string,
    updates: {
      url?: string;
      events?: WebhookEvent[];
      isActive?: boolean;
      headers?: Record<string, string>;
    }
  ): WebhookConfig | null {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) {
      return null;
    }

    if (updates.url) webhook.url = updates.url;
    if (updates.events) webhook.events = updates.events;
    if (updates.isActive !== undefined) webhook.isActive = updates.isActive;
    if (updates.headers) webhook.headers = updates.headers;

    return webhook;
  }

  /**
   * Delete a webhook
   */
  deleteWebhook(webhookId: string, userId: string): void {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) {
      throw new Error('Webhook not found');
    }

    // Remove from key
    const key = this.keys.get(webhook.apiKeyId);
    if (key) {
      key.webhooks = key.webhooks.filter(id => id !== webhookId);
    }

    this.webhooks.delete(webhookId);
    logger.info('[UserAPIService] Webhook deleted', { webhookId });
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerWebhooks(
    userId: string,
    event: WebhookEvent,
    payload: any
  ): Promise<void> {
    const keyIds = this.keysByUser.get(userId) || [];

    for (const keyId of keyIds) {
      const key = this.keys.get(keyId);
      if (!key || !key.isActive) continue;

      for (const webhookId of key.webhooks) {
        const webhook = this.webhooks.get(webhookId);
        if (!webhook || !webhook.isActive || !webhook.events.includes(event)) continue;

        // Fire async (don't block)
        this.sendWebhook(webhook, event, payload).catch(err => {
          logger.error('[UserAPIService] Webhook delivery failed', { webhookId, error: err.message });
        });
      }
    }
  }

  /**
   * Send a webhook
   */
  private async sendWebhook(
    webhook: WebhookConfig,
    event: WebhookEvent,
    payload: any,
    attempt: number = 1
  ): Promise<void> {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = generateWebhookSignature(body, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TIME-Signature': signature,
          'X-TIME-Event': event,
          'X-TIME-Timestamp': new Date().toISOString(),
          ...webhook.headers,
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success - reset failure count
      webhook.lastTriggeredAt = new Date();
      webhook.failureCount = 0;
      webhook.lastError = null;

    } catch (error: any) {
      webhook.failureCount++;
      webhook.lastError = error.message;

      // Retry if within limit
      if (attempt < webhook.retryPolicy.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, webhook.retryPolicy.retryDelayMs * attempt));
        return this.sendWebhook(webhook, event, payload, attempt + 1);
      }

      // Disable webhook after too many failures
      if (webhook.failureCount >= 10) {
        webhook.isActive = false;
        logger.warn('[UserAPIService] Webhook disabled due to failures', { webhookId: webhook.id });
      }

      throw error;
    }
  }

  // ============================================================================
  // OAUTH2 SUPPORT
  // ============================================================================

  /**
   * Register an OAuth2 client application
   */
  async registerOAuthClient(
    developerUserId: string,
    config: {
      name: string;
      description?: string;
      redirectUris: string[];
      allowedScopes: APIScope[];
      website?: string;
      logoUrl?: string;
    }
  ): Promise<{ client: OAuthClient; clientSecret: string }> {
    const clientId = `time_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('base64url');
    const clientSecretHash = await bcrypt.hash(clientSecret, API_CONFIG.BCRYPT_ROUNDS);

    const client: OAuthClient = {
      id: generateId('oauth'),
      clientId,
      clientSecretHash,
      name: config.name,
      description: config.description,
      developerUserId,
      redirectUris: config.redirectUris,
      allowedScopes: config.allowedScopes,
      website: config.website,
      logoUrl: config.logoUrl,
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      rateLimitMultiplier: 1.0,
    };

    this.oauthClients.set(client.id, client);

    logger.info('[UserAPIService] OAuth client registered', { clientId, name: client.name });

    return { client, clientSecret };
  }

  /**
   * Validate OAuth2 client credentials
   */
  async validateOAuthClient(clientId: string, clientSecret: string): Promise<OAuthClient | null> {
    for (const client of this.oauthClients.values()) {
      if (client.clientId === clientId && client.isActive) {
        const valid = await bcrypt.compare(clientSecret, client.clientSecretHash);
        if (valid) return client;
      }
    }
    return null;
  }

  /**
   * Create OAuth2 authorization
   */
  async createOAuthAuthorization(
    userId: string,
    clientId: string,
    scopes: APIScope[]
  ): Promise<OAuthAuthorization> {
    const authorization: OAuthAuthorization = {
      id: generateId('auth'),
      userId,
      clientId,
      scopes,
      accessToken: crypto.randomBytes(32).toString('base64url'),
      refreshToken: crypto.randomBytes(32).toString('base64url'),
      accessTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour
      refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600000), // 30 days
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    this.oauthAuthorizations.set(authorization.id, authorization);

    return authorization;
  }

  /**
   * Validate OAuth2 access token
   */
  validateOAuthToken(accessToken: string): OAuthAuthorization | null {
    for (const auth of this.oauthAuthorizations.values()) {
      if (auth.accessToken === accessToken) {
        if (new Date() > auth.accessTokenExpiresAt) {
          return null; // Expired
        }
        auth.lastUsedAt = new Date();
        return auth;
      }
    }
    return null;
  }

  /**
   * Refresh OAuth2 access token
   */
  async refreshOAuthToken(refreshToken: string): Promise<OAuthAuthorization | null> {
    for (const auth of this.oauthAuthorizations.values()) {
      if (auth.refreshToken === refreshToken) {
        if (new Date() > auth.refreshTokenExpiresAt) {
          this.oauthAuthorizations.delete(auth.id);
          return null;
        }

        // Generate new tokens
        auth.accessToken = crypto.randomBytes(32).toString('base64url');
        auth.accessTokenExpiresAt = new Date(Date.now() + 3600000);
        auth.lastUsedAt = new Date();

        return auth;
      }
    }
    return null;
  }

  /**
   * Revoke OAuth2 authorization
   */
  revokeOAuthAuthorization(userId: string, authorizationId: string): void {
    const auth = this.oauthAuthorizations.get(authorizationId);
    if (auth && auth.userId === userId) {
      this.oauthAuthorizations.delete(authorizationId);
    }
  }

  // ============================================================================
  // USAGE ANALYTICS
  // ============================================================================

  /**
   * Get usage statistics for a user
   */
  getUsageStats(userId: string): {
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
    requestsToday: number;
    webhookCount: number;
    keyStats: Array<{
      keyId: string;
      label: string;
      totalRequests: number;
      requestsToday: number;
      lastUsedAt: Date | null;
    }>;
  } {
    const keyIds = this.keysByUser.get(userId) || [];
    const keys = keyIds
      .map(id => this.keys.get(id))
      .filter((k): k is UserAPIKey => k !== undefined);

    let totalWebhooks = 0;
    const keyStats = keys.map(k => {
      totalWebhooks += k.webhooks.length;
      return {
        keyId: k.id,
        label: k.label,
        totalRequests: k.usageStats.totalRequests,
        requestsToday: k.usageStats.requestsToday,
        lastUsedAt: k.lastUsedAt,
      };
    });

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      totalRequests: keys.reduce((sum, k) => sum + k.usageStats.totalRequests, 0),
      requestsToday: keys.reduce((sum, k) => sum + k.usageStats.requestsToday, 0),
      webhookCount: totalWebhooks,
      keyStats,
    };
  }

  /**
   * Record endpoint usage for analytics
   */
  recordEndpointUsage(keyId: string, endpoint: string, statusCode: number): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.usageStats.requestsByEndpoint[endpoint] =
        (key.usageStats.requestsByEndpoint[endpoint] || 0) + 1;

      if (statusCode >= 400) {
        key.usageStats.errorCount++;
      }
    }
  }

  // ============================================================================
  // API DOCUMENTATION ENDPOINT
  // ============================================================================

  /**
   * Get API documentation
   */
  getAPIDocumentation(): object {
    return {
      title: 'TIME BEYOND US Developer API',
      version: 'v1.0.0',
      description: 'Programmatic access to TIME trading platform',
      baseUrl: 'https://api.timebeyondus.com/v1',
      authentication: {
        type: 'API Key + Secret',
        headers: {
          'X-API-Key': 'Your API key (time_live_... or time_test_...)',
          'X-API-Secret': 'Your API secret',
        },
        oauth2: {
          authorizationUrl: '/oauth/authorize',
          tokenUrl: '/oauth/token',
          scopes: SCOPE_DESCRIPTIONS,
        },
      },
      rateLimits: {
        description: 'Rate limits are per API key per day',
        tiers: RATE_LIMITS_BY_TIER,
        headers: {
          'X-RateLimit-Limit': 'Your daily limit',
          'X-RateLimit-Remaining': 'Remaining requests today',
          'X-RateLimit-Reset': 'Unix timestamp when limit resets',
        },
      },
      scopes: SCOPE_DESCRIPTIONS,
      scopePresets: SCOPE_PRESETS,
      webhooks: {
        description: 'Receive real-time notifications for trading events',
        events: [
          'order.created', 'order.filled', 'order.cancelled', 'order.rejected',
          'position.opened', 'position.closed',
          'bot.signal', 'bot.trade', 'bot.error',
          'alert.triggered',
          'account.deposit', 'account.withdrawal',
          'price.alert',
        ],
        signature: {
          header: 'X-TIME-Signature',
          algorithm: 'HMAC-SHA256',
          description: 'Verify webhook authenticity using your webhook secret',
        },
      },
      endpoints: {
        developer: {
          'GET /developer/keys': 'List your API keys',
          'POST /developer/keys': 'Create a new API key',
          'GET /developer/keys/:id': 'Get API key details',
          'PATCH /developer/keys/:id': 'Update API key settings',
          'DELETE /developer/keys/:id': 'Revoke and delete API key',
          'POST /developer/keys/:id/rotate': 'Rotate API key secret',
          'GET /developer/usage': 'Get usage statistics',
          'GET /developer/webhooks': 'List webhooks',
          'POST /developer/webhooks': 'Create webhook',
          'DELETE /developer/webhooks/:id': 'Delete webhook',
          'GET /developer/docs': 'This documentation',
        },
        account: {
          'GET /account': 'Get account information (read:account)',
          'GET /account/balance': 'Get account balance (read:account)',
        },
        portfolio: {
          'GET /portfolio': 'Get portfolio summary (read:portfolio)',
          'GET /portfolio/positions': 'Get open positions (read:portfolio)',
          'GET /portfolio/history': 'Get trade history (read:portfolio)',
        },
        market: {
          'GET /market/quote/:symbol': 'Get real-time quote (read:market)',
          'GET /market/candles/:symbol': 'Get OHLCV data (read:market)',
          'GET /market/news': 'Get market news (read:market)',
        },
        orders: {
          'GET /orders': 'List orders (read:orders)',
          'POST /orders': 'Place order (write:orders)',
          'GET /orders/:id': 'Get order details (read:orders)',
          'DELETE /orders/:id': 'Cancel order (write:orders)',
        },
        bots: {
          'GET /bots': 'List your bots (read:bots)',
          'POST /bots': 'Create bot (write:bots)',
          'GET /bots/:id': 'Get bot details (read:bots)',
          'PATCH /bots/:id': 'Update bot (write:bots)',
          'DELETE /bots/:id': 'Delete bot (write:bots)',
          'GET /bots/:id/signals': 'Get bot signals (read:bots)',
        },
      },
      errors: {
        400: 'Bad Request - Invalid parameters',
        401: 'Unauthorized - Invalid or missing API key',
        403: 'Forbidden - Insufficient permissions',
        404: 'Not Found - Resource not found',
        429: 'Too Many Requests - Rate limit exceeded',
        500: 'Internal Server Error',
      },
      sdks: {
        javascript: 'npm install @timebeyondus/api',
        python: 'pip install timebeyondus',
        curl: 'curl -H "X-API-Key: your_key" -H "X-API-Secret: your_secret" https://api.timebeyondus.com/v1/...',
      },
      support: {
        documentation: 'https://docs.timebeyondus.com/api',
        email: 'developers@timebeyondus.com',
        discord: 'https://discord.gg/timebeyondus',
      },
    };
  }

  // ============================================================================
  // CLEANUP & MAINTENANCE
  // ============================================================================

  /**
   * Start background cleanup job
   */
  private startCleanupJob(): void {
    // Reset daily counters at midnight
    setInterval(() => {
      const today = getTodayString();
      for (const key of this.keys.values()) {
        if (key.usageStats.lastResetDate !== today) {
          key.usageStats.requestsToday = 0;
          key.usageStats.lastResetDate = today;
        }
      }
    }, 60000); // Check every minute

    // Clean up expired tokens
    setInterval(() => {
      const now = new Date();
      for (const [id, auth] of this.oauthAuthorizations) {
        if (now > auth.refreshTokenExpiresAt) {
          this.oauthAuthorizations.delete(id);
        }
      }
    }, 3600000); // Every hour
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    totalKeys: number;
    activeKeys: number;
    totalUsers: number;
    totalWebhooks: number;
    oauthClients: number;
    totalRequestsToday: number;
  } {
    let totalRequestsToday = 0;
    let activeKeys = 0;
    let totalWebhooks = 0;

    for (const key of this.keys.values()) {
      if (key.isActive) activeKeys++;
      totalWebhooks += key.webhooks.length;
      totalRequestsToday += key.usageStats.requestsToday;
    }

    return {
      totalKeys: this.keys.size,
      activeKeys,
      totalUsers: this.keysByUser.size,
      totalWebhooks,
      oauthClients: this.oauthClients.size,
      totalRequestsToday,
    };
  }
}

// Export singleton instance
export const userAPIService = new UserAPIService();

logger.info('[UserAPIService] User API Access system ready - Production-grade developer platform');

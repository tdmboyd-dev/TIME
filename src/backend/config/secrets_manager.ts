/**
 * TIME BEYOND US - AWS Secrets Manager Integration
 *
 * Production-grade secret management:
 * - Loads secrets from AWS Secrets Manager
 * - Falls back to .env for development
 * - Supports automatic secret rotation
 * - Caches secrets with TTL
 *
 * Usage:
 * 1. Set AWS_REGION and AWS_SECRET_NAME in .env
 * 2. Configure IAM role/credentials for Secrets Manager access
 * 3. Call await loadSecrets() before app starts
 *
 * Sources:
 * - https://medium.com/@niklas_braun/a-developers-guide-storing-node-js-environment-variables-in-aws-secret-manager-d41a137399a0
 */

import { logger } from '../utils/logger';

// Types for secrets
interface TimeSecrets {
  // Database
  MONGODB_URI?: string;
  REDIS_URL?: string;

  // Authentication
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  ADMIN_SECRET_KEY?: string;

  // Trading APIs
  ALPACA_API_KEY?: string;
  ALPACA_SECRET_KEY?: string;
  OANDA_API_KEY?: string;
  OANDA_ACCOUNT_ID?: string;
  SNAPTRADE_CLIENT_ID?: string;
  SNAPTRADE_CONSUMER_KEY?: string;

  // Market Data
  TWELVE_DATA_API_KEY?: string;
  FINNHUB_API_KEY?: string;
  FMP_API_KEY?: string;
  FRED_API_KEY?: string;

  // Notifications
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;

  // OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;

  // DeFi
  INFURA_PROJECT_ID?: string;
  ALCHEMY_API_KEY?: string;
  WEB3_PRIVATE_KEY?: string;

  // Misc
  NODE_ENV?: string;
  COOKIE_DOMAIN?: string;
}

// Cache for secrets
let secretsCache: TimeSecrets | null = null;
let cacheExpiry: Date | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load secrets from AWS Secrets Manager
 */
async function loadFromAWS(secretName: string, region: string): Promise<TimeSecrets> {
  try {
    // Dynamic import to avoid requiring AWS SDK if not using it
    // @ts-ignore - Dynamic import for optional AWS SDK
    const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');

    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString) as TimeSecrets;
      logger.info('[SecretsManager] Loaded secrets from AWS Secrets Manager');
      return secrets;
    }

    throw new Error('No SecretString in response');
  } catch (error: any) {
    logger.warn('[SecretsManager] AWS Secrets Manager not available:', error.message);
    throw error;
  }
}

/**
 * Load secrets from environment variables (.env fallback)
 */
function loadFromEnv(): TimeSecrets {
  return {
    // Database
    MONGODB_URI: process.env.MONGODB_URI,
    REDIS_URL: process.env.REDIS_URL,

    // Authentication
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY,

    // Trading APIs
    ALPACA_API_KEY: process.env.ALPACA_API_KEY,
    ALPACA_SECRET_KEY: process.env.ALPACA_SECRET_KEY,
    OANDA_API_KEY: process.env.OANDA_API_KEY,
    OANDA_ACCOUNT_ID: process.env.OANDA_ACCOUNT_ID,
    SNAPTRADE_CLIENT_ID: process.env.SNAPTRADE_CLIENT_ID,
    SNAPTRADE_CONSUMER_KEY: process.env.SNAPTRADE_CONSUMER_KEY,

    // Market Data
    TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
    FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
    FMP_API_KEY: process.env.FMP_API_KEY,
    FRED_API_KEY: process.env.FRED_API_KEY,

    // Notifications
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

    // OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
    APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
    APPLE_KEY_ID: process.env.APPLE_KEY_ID,

    // DeFi
    INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    WEB3_PRIVATE_KEY: process.env.WEB3_PRIVATE_KEY,

    // Misc
    NODE_ENV: process.env.NODE_ENV,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  };
}

/**
 * Load secrets with caching
 */
export async function loadSecrets(forceRefresh = false): Promise<TimeSecrets> {
  // Return cached secrets if still valid
  if (!forceRefresh && secretsCache && cacheExpiry && new Date() < cacheExpiry) {
    return secretsCache;
  }

  const secretName = process.env.AWS_SECRET_NAME;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (secretName) {
    try {
      secretsCache = await loadFromAWS(secretName, region);

      // Merge with process.env (AWS takes precedence)
      Object.entries(secretsCache).forEach(([key, value]) => {
        if (value) {
          process.env[key] = value;
        }
      });

      cacheExpiry = new Date(Date.now() + CACHE_TTL_MS);
      logger.info('[SecretsManager] Secrets loaded from AWS and injected into process.env');
      return secretsCache;
    } catch (error) {
      logger.warn('[SecretsManager] Falling back to .env file');
    }
  }

  // Fallback to .env
  secretsCache = loadFromEnv();
  cacheExpiry = new Date(Date.now() + CACHE_TTL_MS);
  logger.info('[SecretsManager] Secrets loaded from environment variables');
  return secretsCache;
}

/**
 * Get a specific secret
 */
export function getSecret(key: keyof TimeSecrets): string | undefined {
  return secretsCache?.[key] || process.env[key];
}

/**
 * Check if secrets are loaded
 */
export function areSecretsLoaded(): boolean {
  return secretsCache !== null;
}

/**
 * Clear secrets cache (for rotation)
 */
export function clearSecretsCache(): void {
  secretsCache = null;
  cacheExpiry = null;
  logger.info('[SecretsManager] Secrets cache cleared');
}

/**
 * Get all secret keys (without values, for debugging)
 */
export function getSecretKeys(): string[] {
  if (!secretsCache) return [];
  return Object.keys(secretsCache).filter(key => secretsCache![key as keyof TimeSecrets]);
}

export default {
  loadSecrets,
  getSecret,
  areSecretsLoaded,
  clearSecretsCache,
  getSecretKeys,
};

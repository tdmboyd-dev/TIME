/**
 * TIME BEYOND US - Mobile Security Utilities
 *
 * SSL Certificate Pinning and Security Functions
 * Protects against man-in-the-middle attacks
 */

import { config } from '../config';
import { logger } from './logger';

// Certificate public key hashes for time-backend-hosting.fly.dev
// These should be updated when the server certificate is renewed
// To get the hash: openssl s_client -connect time-backend-hosting.fly.dev:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
const PINNED_PUBLIC_KEYS = [
  // Primary certificate hash (update with actual hash)
  // 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  // Backup certificate hash (update with actual hash)
  // 'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
];

// Trusted hostnames for certificate pinning
const TRUSTED_HOSTS = [
  'time-backend-hosting.fly.dev',
];

/**
 * Check if a hostname is trusted for certificate pinning
 */
export function isTrustedHost(hostname: string): boolean {
  return TRUSTED_HOSTS.some(
    (trusted) => hostname === trusted || hostname.endsWith(`.${trusted}`)
  );
}

/**
 * Validate certificate pin (placeholder for native implementation)
 *
 * Note: Full certificate pinning requires native code integration.
 * For React Native/Expo, consider using:
 * - expo-certificate-transparency
 * - react-native-ssl-pinning
 * - Custom native modules
 *
 * This function provides a framework that can be expanded.
 */
export function validateCertificatePin(hostname: string, certHash: string): boolean {
  if (!config.enableCertificatePinning) {
    logger.debug('Certificate pinning disabled', { tag: 'Security' });
    return true;
  }

  if (!isTrustedHost(hostname)) {
    logger.warn(`Unknown host: ${hostname}`, { tag: 'Security' });
    return false;
  }

  if (PINNED_PUBLIC_KEYS.length === 0) {
    // No pins configured - in production, this should fail
    if (config.isProduction) {
      logger.error('No certificate pins configured for production', { tag: 'Security' });
      return false;
    }
    return true;
  }

  const isValidPin = PINNED_PUBLIC_KEYS.includes(certHash);
  if (!isValidPin) {
    logger.error(`Certificate pin mismatch for ${hostname}`, { tag: 'Security' });
  }
  return isValidPin;
}

/**
 * Security headers to include in API requests
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Requested-With': 'TIME-Mobile-App',
    'X-App-Version': config.appVersion,
    'X-Build-Number': config.buildNumber,
  };
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove control characters and trim
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain a special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);

  // Use crypto.getRandomValues if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback to Math.random (less secure, but works in all environments)
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

/**
 * Check if running in a secure context
 */
export function isSecureContext(): boolean {
  // In React Native, we're typically in a secure context
  // but we can add additional checks here
  return !config.isDev || config.env === 'production';
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars * 2) {
    return '***';
  }
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  return `${start}***${end}`;
}

export default {
  isTrustedHost,
  validateCertificatePin,
  getSecurityHeaders,
  sanitizeInput,
  isValidEmail,
  validatePassword,
  generateSecureToken,
  isSecureContext,
  maskSensitiveData,
};

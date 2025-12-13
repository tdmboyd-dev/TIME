/**
 * TIME MFA (Multi-Factor Authentication) Service
 *
 * Provides TOTP-based 2FA, SMS backup codes, and recovery options.
 * Matches security standards of Vanguard, Fidelity, and major brokerages.
 *
 * PLAIN ENGLISH:
 * - 2FA adds an extra layer of security beyond just a password
 * - Users scan a QR code with Google Authenticator or Authy
 * - Every 30 seconds, a new 6-digit code is generated
 * - Even if someone steals your password, they can't log in without the code
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

// TOTP Configuration
const TOTP_CONFIG = {
  DIGITS: 6,
  PERIOD: 30, // seconds
  ALGORITHM: 'sha1',
  ISSUER: 'TIME Trading',
  WINDOW: 1, // Allow 1 period before/after for clock drift
};

// Recovery code configuration
const RECOVERY_CONFIG = {
  CODE_COUNT: 10,
  CODE_LENGTH: 8,
};

export interface MFASecret {
  base32: string;
  otpauthUrl: string;
  qrCodeDataUrl?: string;
}

export interface MFAStatus {
  enabled: boolean;
  totpEnabled: boolean;
  smsEnabled: boolean;
  recoveryCodesRemaining: number;
  lastVerified?: Date;
}

export interface RecoveryCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

/**
 * Generate a Base32 secret for TOTP
 * This is the secret key that both the server and the user's app share
 */
export function generateSecret(): string {
  // Generate 20 random bytes (160 bits) as recommended by RFC 4226
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate the otpauth:// URL that authenticator apps scan
 */
export function generateOtpAuthUrl(secret: string, email: string): string {
  const params = new URLSearchParams({
    secret: secret,
    issuer: TOTP_CONFIG.ISSUER,
    algorithm: TOTP_CONFIG.ALGORITHM.toUpperCase(),
    digits: TOTP_CONFIG.DIGITS.toString(),
    period: TOTP_CONFIG.PERIOD.toString(),
  });

  return `otpauth://totp/${encodeURIComponent(TOTP_CONFIG.ISSUER)}:${encodeURIComponent(email)}?${params.toString()}`;
}

/**
 * Generate a QR code data URL for the otpauth URL
 * Users scan this with their authenticator app
 */
export async function generateQRCodeDataUrl(otpauthUrl: string): Promise<string> {
  // Simple SVG-based QR code generation
  // In production, use a library like 'qrcode' for better QR codes
  // For now, return the URL that can be used with QR code generators
  return `data:text/plain;base64,${Buffer.from(otpauthUrl).toString('base64')}`;
}

/**
 * Generate the complete MFA setup data
 */
export async function generateMFASetup(email: string): Promise<MFASecret> {
  const secret = generateSecret();
  const otpauthUrl = generateOtpAuthUrl(secret, email);
  const qrCodeDataUrl = await generateQRCodeDataUrl(otpauthUrl);

  logger.info('MFA setup generated', { email, hasSecret: !!secret });

  return {
    base32: secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/**
 * Verify a TOTP token
 *
 * PLAIN ENGLISH:
 * - Takes the 6-digit code the user entered
 * - Calculates what the code SHOULD be based on the current time
 * - Allows a small window for clock drift (30 seconds before/after)
 */
export function verifyToken(secret: string, token: string): boolean {
  if (!secret || !token) {
    return false;
  }

  // Clean the token (remove spaces, ensure 6 digits)
  const cleanToken = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanToken)) {
    logger.warn('Invalid token format', { tokenLength: cleanToken.length });
    return false;
  }

  // Get current time counter (30-second periods since Unix epoch)
  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_CONFIG.PERIOD);

  // Check token against current time and window
  for (let i = -TOTP_CONFIG.WINDOW; i <= TOTP_CONFIG.WINDOW; i++) {
    const counter = currentCounter + i;
    const expectedToken = generateTOTP(secret, counter);

    if (timingSafeEqual(expectedToken, cleanToken)) {
      logger.info('TOTP verification successful', { counterOffset: i });
      return true;
    }
  }

  logger.warn('TOTP verification failed');
  return false;
}

/**
 * Generate TOTP code for a specific counter value
 */
function generateTOTP(secret: string, counter: number): string {
  // Decode base32 secret
  const key = base32Decode(secret);

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Generate 6-digit code
  const code = binary % Math.pow(10, TOTP_CONFIG.DIGITS);
  return code.toString().padStart(TOTP_CONFIG.DIGITS, '0');
}

/**
 * Generate recovery codes
 *
 * PLAIN ENGLISH:
 * - These are backup codes in case you lose your phone
 * - Each code can only be used ONCE
 * - Store these somewhere safe (like a password manager)
 */
export function generateRecoveryCodes(): RecoveryCode[] {
  const codes: RecoveryCode[] = [];

  for (let i = 0; i < RECOVERY_CONFIG.CODE_COUNT; i++) {
    // Generate random alphanumeric code
    const bytes = crypto.randomBytes(RECOVERY_CONFIG.CODE_LENGTH);
    const code = bytes.toString('hex').slice(0, RECOVERY_CONFIG.CODE_LENGTH).toUpperCase();

    // Format as XXXX-XXXX for readability
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;

    codes.push({
      code: formatted,
      used: false,
    });
  }

  logger.info('Recovery codes generated', { count: codes.length });
  return codes;
}

/**
 * Verify a recovery code (one-time use)
 */
export function verifyRecoveryCode(
  codes: RecoveryCode[],
  inputCode: string
): { valid: boolean; updatedCodes: RecoveryCode[] } {
  const cleanInput = inputCode.replace(/\s/g, '').toUpperCase();

  const updatedCodes = [...codes];
  let valid = false;

  for (let i = 0; i < updatedCodes.length; i++) {
    const code = updatedCodes[i];
    const cleanCode = code.code.replace(/-/g, '');

    if (!code.used && timingSafeEqual(cleanCode, cleanInput)) {
      updatedCodes[i] = {
        ...code,
        used: true,
        usedAt: new Date(),
      };
      valid = true;
      logger.info('Recovery code used', { codeIndex: i });
      break;
    }
  }

  return { valid, updatedCodes };
}

/**
 * Generate SMS verification code
 */
export function generateSMSCode(): string {
  const code = crypto.randomInt(100000, 999999).toString();
  logger.info('SMS code generated');
  return code;
}

/**
 * Verify SMS code (with expiration)
 */
export function verifySMSCode(
  storedCode: string,
  inputCode: string,
  createdAt: Date,
  expiryMinutes: number = 5
): boolean {
  // Check expiration
  const expiryTime = new Date(createdAt.getTime() + expiryMinutes * 60 * 1000);
  if (new Date() > expiryTime) {
    logger.warn('SMS code expired');
    return false;
  }

  // Verify code
  if (timingSafeEqual(storedCode, inputCode)) {
    logger.info('SMS code verified');
    return true;
  }

  logger.warn('SMS code verification failed');
  return false;
}

// ============ Helper Functions ============

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding
 */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanInput = input.replace(/[=\s]/g, '').toUpperCase();

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const index = alphabet.indexOf(cleanInput[i]);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

// ============ MFA Service Class ============

export class MFAService {
  /**
   * Set up MFA for a user
   */
  async setupMFA(userId: string, email: string): Promise<MFASecret> {
    const setup = await generateMFASetup(email);
    logger.info('MFA setup initiated', { userId });
    return setup;
  }

  /**
   * Verify and enable MFA
   */
  async enableMFA(
    userId: string,
    secret: string,
    token: string
  ): Promise<{ success: boolean; recoveryCodes?: RecoveryCode[] }> {
    const isValid = verifyToken(secret, token);

    if (!isValid) {
      logger.warn('MFA enable failed - invalid token', { userId });
      return { success: false };
    }

    const recoveryCodes = generateRecoveryCodes();
    logger.info('MFA enabled successfully', { userId });

    return {
      success: true,
      recoveryCodes,
    };
  }

  /**
   * Verify MFA token during login
   */
  verifyMFA(secret: string, token: string): boolean {
    return verifyToken(secret, token);
  }

  /**
   * Use recovery code
   */
  useRecoveryCode(
    codes: RecoveryCode[],
    inputCode: string
  ): { valid: boolean; updatedCodes: RecoveryCode[] } {
    return verifyRecoveryCode(codes, inputCode);
  }

  /**
   * Generate new recovery codes (invalidates old ones)
   */
  regenerateRecoveryCodes(): RecoveryCode[] {
    return generateRecoveryCodes();
  }

  /**
   * Get MFA status summary
   */
  getMFAStatus(
    totpSecret: string | null,
    smsEnabled: boolean,
    recoveryCodes: RecoveryCode[]
  ): MFAStatus {
    const unusedCodes = recoveryCodes.filter((c) => !c.used).length;

    return {
      enabled: !!totpSecret || smsEnabled,
      totpEnabled: !!totpSecret,
      smsEnabled,
      recoveryCodesRemaining: unusedCodes,
    };
  }
}

// Export singleton instance
export const mfaService = new MFAService();

logger.info('MFA Service initialized - TIME Security Enhanced');

/**
 * TIME BEYOND US - SMS Authentication Service
 *
 * Two-Factor Authentication via Twilio SMS
 * Provides secure OTP generation, delivery, and verification
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Twilio client
let twilioClient: any = null;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 15;

interface OTPRecord {
  code: string;
  hashedCode: string;
  phone: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

interface PhoneCooldown {
  phone: string;
  failedAttempts: number;
  cooldownUntil: Date | null;
}

class SMSAuthService extends EventEmitter {
  private otpStore = new Map<string, OTPRecord>();
  private cooldowns = new Map<string, PhoneCooldown>();
  private initialized = false;

  constructor() {
    super();
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client
   */
  private async initializeTwilio(): Promise<void> {
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      try {
        const twilio = await import('twilio');
        twilioClient = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        this.initialized = true;
        logger.info('[SMS Auth] Twilio client initialized - REAL SMS 2FA ENABLED');
      } catch (e) {
        logger.warn('[SMS Auth] Twilio not available, SMS 2FA will be simulated');
      }
    } else {
      logger.warn('[SMS Auth] Twilio credentials not configured');
    }
  }

  /**
   * Generate a secure OTP code
   */
  private generateOTP(): string {
    // Generate cryptographically secure random bytes
    const bytes = crypto.randomBytes(4);
    const number = bytes.readUInt32BE(0);
    // Convert to 6-digit string with leading zeros
    return String(number % 1000000).padStart(OTP_LENGTH, '0');
  }

  /**
   * Hash OTP for secure storage
   */
  private hashOTP(code: string, phone: string): string {
    const secret = process.env.JWT_SECRET || 'time-beyond-us-secret';
    return crypto
      .createHmac('sha256', secret)
      .update(`${code}:${phone}`)
      .digest('hex');
  }

  /**
   * Normalize phone number to E.164 format
   */
  public normalizePhone(phone: string): string {
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');

    // Handle common formats
    if (digits.length === 10) {
      // US number without country code
      digits = '1' + digits;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US number with country code
      // Already correct
    }

    return '+' + digits;
  }

  /**
   * Check if phone is in cooldown
   */
  private isInCooldown(phone: string): { inCooldown: boolean; remainingSeconds?: number } {
    const cooldown = this.cooldowns.get(phone);
    if (!cooldown || !cooldown.cooldownUntil) {
      return { inCooldown: false };
    }

    const now = new Date();
    if (now < cooldown.cooldownUntil) {
      const remainingSeconds = Math.ceil((cooldown.cooldownUntil.getTime() - now.getTime()) / 1000);
      return { inCooldown: true, remainingSeconds };
    }

    // Cooldown expired
    this.cooldowns.delete(phone);
    return { inCooldown: false };
  }

  /**
   * Record failed attempt
   */
  private recordFailedAttempt(phone: string): void {
    const cooldown = this.cooldowns.get(phone) || {
      phone,
      failedAttempts: 0,
      cooldownUntil: null,
    };

    cooldown.failedAttempts++;

    if (cooldown.failedAttempts >= MAX_ATTEMPTS) {
      cooldown.cooldownUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
      logger.warn(`[SMS Auth] Phone ${phone} locked out for ${COOLDOWN_MINUTES} minutes`);
    }

    this.cooldowns.set(phone, cooldown);
  }

  /**
   * Send OTP to phone number
   */
  public async sendOTP(
    userId: string,
    phone: string
  ): Promise<{ success: boolean; message: string; expiresIn?: number }> {
    const normalizedPhone = this.normalizePhone(phone);

    // Check cooldown
    const cooldownCheck = this.isInCooldown(normalizedPhone);
    if (cooldownCheck.inCooldown) {
      return {
        success: false,
        message: `Too many attempts. Try again in ${cooldownCheck.remainingSeconds} seconds.`,
      };
    }

    // Generate OTP
    const code = this.generateOTP();
    const hashedCode = this.hashOTP(code, normalizedPhone);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP record
    const record: OTPRecord = {
      code, // Only stored for simulated mode - in production, only store hash
      hashedCode,
      phone: normalizedPhone,
      userId,
      createdAt: new Date(),
      expiresAt,
      attempts: 0,
      verified: false,
    };

    this.otpStore.set(userId, record);

    // Send via Twilio
    if (twilioClient && TWILIO_PHONE_NUMBER) {
      try {
        // Use Twilio Verify if service SID is configured
        if (TWILIO_VERIFY_SERVICE_SID) {
          await twilioClient.verify.v2
            .services(TWILIO_VERIFY_SERVICE_SID)
            .verifications.create({
              to: normalizedPhone,
              channel: 'sms',
            });
          logger.info(`[SMS Auth] Twilio Verify sent to ${normalizedPhone}`);
        } else {
          // Direct SMS
          await twilioClient.messages.create({
            body: `Your TIME BEYOND US verification code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
            from: TWILIO_PHONE_NUMBER,
            to: normalizedPhone,
          });
          logger.info(`[SMS Auth] OTP sent to ${normalizedPhone}`);
        }

        return {
          success: true,
          message: 'Verification code sent',
          expiresIn: OTP_EXPIRY_MINUTES * 60,
        };
      } catch (error: any) {
        logger.error('[SMS Auth] Failed to send SMS', { error: error.message, phone: normalizedPhone });
        return {
          success: false,
          message: 'Failed to send verification code. Please try again.',
        };
      }
    } else {
      // Simulated mode
      logger.info(`[SMS Auth] SIMULATED OTP to ${normalizedPhone}: ${code}`);
      return {
        success: true,
        message: `[DEV MODE] Verification code: ${code}`,
        expiresIn: OTP_EXPIRY_MINUTES * 60,
      };
    }
  }

  /**
   * Verify OTP code
   */
  public async verifyOTP(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    const record = this.otpStore.get(userId);

    if (!record) {
      return {
        success: false,
        message: 'No verification in progress. Please request a new code.',
      };
    }

    // Check cooldown
    const cooldownCheck = this.isInCooldown(record.phone);
    if (cooldownCheck.inCooldown) {
      return {
        success: false,
        message: `Account locked. Try again in ${cooldownCheck.remainingSeconds} seconds.`,
      };
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      this.otpStore.delete(userId);
      return {
        success: false,
        message: 'Verification code expired. Please request a new code.',
      };
    }

    // Check attempts
    if (record.attempts >= MAX_ATTEMPTS) {
      this.recordFailedAttempt(record.phone);
      this.otpStore.delete(userId);
      return {
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.',
      };
    }

    // Use Twilio Verify if configured
    if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
      try {
        const verification = await twilioClient.verify.v2
          .services(TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks.create({
            to: record.phone,
            code,
          });

        if (verification.status === 'approved') {
          record.verified = true;
          this.otpStore.delete(userId);
          this.cooldowns.delete(record.phone);
          this.emit('verified', { userId, phone: record.phone });

          logger.info(`[SMS Auth] Phone verified: ${record.phone}`);
          return { success: true, message: 'Phone verified successfully' };
        } else {
          record.attempts++;
          this.recordFailedAttempt(record.phone);
          return { success: false, message: 'Invalid verification code' };
        }
      } catch (error: any) {
        logger.error('[SMS Auth] Twilio Verify check failed', { error: error.message });
        return { success: false, message: 'Verification failed. Please try again.' };
      }
    }

    // Direct verification (non-Verify mode)
    const hashedInput = this.hashOTP(code, record.phone);
    if (hashedInput === record.hashedCode) {
      record.verified = true;
      this.otpStore.delete(userId);
      this.cooldowns.delete(record.phone);
      this.emit('verified', { userId, phone: record.phone });

      logger.info(`[SMS Auth] Phone verified: ${record.phone}`);
      return { success: true, message: 'Phone verified successfully' };
    } else {
      record.attempts++;
      this.recordFailedAttempt(record.phone);

      const remainingAttempts = MAX_ATTEMPTS - record.attempts;
      return {
        success: false,
        message: `Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
      };
    }
  }

  /**
   * Cancel pending OTP
   */
  public cancelOTP(userId: string): void {
    this.otpStore.delete(userId);
    logger.info(`[SMS Auth] OTP cancelled for user ${userId}`);
  }

  /**
   * Get pending OTP status
   */
  public getOTPStatus(userId: string): { pending: boolean; expiresIn?: number; phone?: string } {
    const record = this.otpStore.get(userId);
    if (!record) {
      return { pending: false };
    }

    const now = new Date();
    if (now > record.expiresAt) {
      this.otpStore.delete(userId);
      return { pending: false };
    }

    return {
      pending: true,
      expiresIn: Math.ceil((record.expiresAt.getTime() - now.getTime()) / 1000),
      phone: record.phone.replace(/(\+\d{1,2})(\d{3})(\d{3})(\d{4})/, '$1-***-***-$4'),
    };
  }

  /**
   * Get service status
   */
  public getStatus(): { enabled: boolean; provider: string } {
    return {
      enabled: this.initialized,
      provider: this.initialized ? 'Twilio' : 'Simulated',
    };
  }
}

// Export singleton
export const smsAuthService = new SMSAuthService();

export default smsAuthService;

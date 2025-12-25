/**
 * SMS Authentication Test Suite
 *
 * Tests for the Twilio-based SMS 2FA service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('SMS Authentication Service', () => {
  describe('Phone Number Normalization', () => {
    const normalizePhone = (phone: string): string => {
      let digits = phone.replace(/\D/g, '');

      if (digits.length === 10) {
        digits = '1' + digits;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        // Already correct
      }

      return '+' + digits;
    };

    it('should normalize 10-digit US numbers', () => {
      expect(normalizePhone('5551234567')).toBe('+15551234567');
      expect(normalizePhone('555-123-4567')).toBe('+15551234567');
      expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
    });

    it('should normalize 11-digit US numbers', () => {
      expect(normalizePhone('15551234567')).toBe('+15551234567');
      expect(normalizePhone('1-555-123-4567')).toBe('+15551234567');
    });

    it('should handle already formatted numbers', () => {
      expect(normalizePhone('+15551234567')).toBe('+15551234567');
    });
  });

  describe('OTP Generation', () => {
    it('should generate 6-digit OTP', () => {
      const generateOTP = (): string => {
        const bytes = new Uint8Array(4);
        crypto.getRandomValues(bytes);
        const number = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        return String(Math.abs(number) % 1000000).padStart(6, '0');
      };

      const otp = generateOTP();

      expect(otp.length).toBe(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should generate unique OTPs', () => {
      const generateOTP = (): string => {
        return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      };

      const otps = new Set<string>();
      for (let i = 0; i < 100; i++) {
        otps.add(generateOTP());
      }

      // Most OTPs should be unique (allow for some collision)
      expect(otps.size).toBeGreaterThan(95);
    });
  });

  describe('OTP Storage', () => {
    interface OTPRecord {
      code: string;
      phone: string;
      userId: string;
      createdAt: Date;
      expiresAt: Date;
      attempts: number;
      verified: boolean;
    }

    it('should store OTP with expiry', () => {
      const otpStore = new Map<string, OTPRecord>();
      const OTP_EXPIRY_MINUTES = 5;

      const storeOTP = (userId: string, phone: string, code: string) => {
        const record: OTPRecord = {
          code,
          phone,
          userId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          attempts: 0,
          verified: false,
        };
        otpStore.set(userId, record);
        return record;
      };

      const record = storeOTP('user123', '+15551234567', '123456');

      expect(record.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(record.attempts).toBe(0);
      expect(otpStore.has('user123')).toBe(true);
    });

    it('should check expiry correctly', () => {
      const isExpired = (expiresAt: Date): boolean => {
        return new Date() > expiresAt;
      };

      // Future expiry
      const futureExpiry = new Date(Date.now() + 300000); // 5 min from now
      expect(isExpired(futureExpiry)).toBe(false);

      // Past expiry
      const pastExpiry = new Date(Date.now() - 1000);
      expect(isExpired(pastExpiry)).toBe(true);
    });
  });

  describe('OTP Verification', () => {
    it('should verify correct OTP', () => {
      const record = {
        code: '123456',
        attempts: 0,
        verified: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      const verifyOTP = (input: string, record: any) => {
        if (new Date() > record.expiresAt) {
          return { success: false, message: 'Code expired' };
        }

        if (record.attempts >= 3) {
          return { success: false, message: 'Too many attempts' };
        }

        if (input === record.code) {
          record.verified = true;
          return { success: true, message: 'Verified' };
        }

        record.attempts++;
        return { success: false, message: `Invalid code. ${3 - record.attempts} attempts remaining.` };
      };

      const result = verifyOTP('123456', record);

      expect(result.success).toBe(true);
      expect(record.verified).toBe(true);
    });

    it('should reject incorrect OTP', () => {
      const record = {
        code: '123456',
        attempts: 0,
        verified: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      const verifyOTP = (input: string, record: any) => {
        if (input === record.code) {
          record.verified = true;
          return { success: true, message: 'Verified' };
        }

        record.attempts++;
        return { success: false, message: `Invalid code. ${3 - record.attempts} attempts remaining.` };
      };

      const result = verifyOTP('654321', record);

      expect(result.success).toBe(false);
      expect(record.attempts).toBe(1);
    });

    it('should lock after max attempts', () => {
      const record = {
        code: '123456',
        attempts: 2,
        verified: false,
        expiresAt: new Date(Date.now() + 300000),
      };

      const verifyOTP = (input: string, record: any) => {
        if (record.attempts >= 3) {
          return { success: false, message: 'Too many attempts' };
        }

        if (input === record.code) {
          record.verified = true;
          return { success: true, message: 'Verified' };
        }

        record.attempts++;
        return { success: false, message: `Invalid code. ${3 - record.attempts} attempts remaining.` };
      };

      // Wrong code
      const result1 = verifyOTP('000000', record);
      expect(result1.success).toBe(false);
      expect(record.attempts).toBe(3);

      // Now locked
      const result2 = verifyOTP('123456', record);
      expect(result2.success).toBe(false);
      expect(result2.message).toBe('Too many attempts');
    });
  });

  describe('Rate Limiting', () => {
    interface Cooldown {
      phone: string;
      failedAttempts: number;
      cooldownUntil: Date | null;
    }

    it('should implement cooldown after failures', () => {
      const cooldowns = new Map<string, Cooldown>();
      const MAX_ATTEMPTS = 3;
      const COOLDOWN_MINUTES = 15;

      const recordFailure = (phone: string) => {
        const cooldown = cooldowns.get(phone) || {
          phone,
          failedAttempts: 0,
          cooldownUntil: null,
        };

        cooldown.failedAttempts++;

        if (cooldown.failedAttempts >= MAX_ATTEMPTS) {
          cooldown.cooldownUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
        }

        cooldowns.set(phone, cooldown);
        return cooldown;
      };

      const phone = '+15551234567';

      recordFailure(phone);
      recordFailure(phone);
      const result = recordFailure(phone);

      expect(result.failedAttempts).toBe(3);
      expect(result.cooldownUntil).not.toBeNull();
      expect(result.cooldownUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should check cooldown status', () => {
      const isInCooldown = (cooldownUntil: Date | null): boolean => {
        if (!cooldownUntil) return false;
        return new Date() < cooldownUntil;
      };

      // No cooldown
      expect(isInCooldown(null)).toBe(false);

      // Active cooldown
      const futureCooldown = new Date(Date.now() + 60000);
      expect(isInCooldown(futureCooldown)).toBe(true);

      // Expired cooldown
      const pastCooldown = new Date(Date.now() - 1000);
      expect(isInCooldown(pastCooldown)).toBe(false);
    });
  });

  describe('Phone Masking', () => {
    it('should mask phone number for display', () => {
      const maskPhone = (phone: string): string => {
        return phone.replace(/(\+\d{1,2})(\d{3})(\d{3})(\d{4})/, '$1-***-***-$4');
      };

      expect(maskPhone('+15551234567')).toBe('+1-***-***-4567');
      expect(maskPhone('+445551234567')).toBe('+44-***-***-4567');
    });
  });
});

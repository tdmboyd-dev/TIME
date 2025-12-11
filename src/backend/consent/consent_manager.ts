/**
 * TIME — Meta-Intelligence Trading Governor
 * Consent Manager
 *
 * Manages mandatory user consent for TIME's learning capabilities.
 * Before a user can trade, they MUST consent to all required fields.
 *
 * Consent includes:
 * - TIME may analyze their bots
 * - TIME may copy their bots
 * - TIME may absorb their bots
 * - TIME may upgrade their bots
 * - TIME may learn from their bots
 * - TIME may use their bots in ensembles
 * - TIME may use their paid account data
 * - TIME may use their demo account data
 * - TIME may use their trading history
 * - TIME may use their performance patterns
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent } from '../core/time_governor';
import { UserConsent, CONSENT_FIELDS, SystemHealth } from '../types';

const log = loggers.consent;

// Current consent version - increment when consent text changes
export const CURRENT_CONSENT_VERSION = '1.0.0';

// Consent field descriptions for UI
export const CONSENT_DESCRIPTIONS: Record<keyof Omit<UserConsent, 'consentedAt' | 'consentVersion'>, string> = {
  analyzeBots: 'TIME may analyze your trading bots to understand their strategies, patterns, and performance characteristics.',
  copyBots: 'TIME may create copies of your bots for internal learning and testing purposes. You retain full ownership of your original bots.',
  absorbBots: 'TIME may absorb your bots into its core intelligence, learning from their strategies to improve overall system performance.',
  upgradeBots: 'TIME may suggest or apply upgrades to your bots based on learned patterns and market conditions.',
  learnFromBots: 'TIME may use insights from your bots to improve its learning algorithms and generate new strategies.',
  useBotsInEnsembles: 'TIME may include your bots in ensemble strategies that combine multiple bots for better performance.',
  usePaidAccountData: 'TIME may use data from your paid trading accounts for learning and analysis.',
  useDemoAccountData: 'TIME may use data from your demo/paper trading accounts for learning and analysis.',
  useTradingHistory: 'TIME may analyze your complete trading history to identify patterns and improve strategies.',
  usePerformancePatterns: 'TIME may study your performance patterns to personalize recommendations and improve overall system intelligence.',
};

// Consent record for audit trail
export interface ConsentRecord {
  id: string;
  userId: string;
  consent: UserConsent;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  action: 'granted' | 'revoked' | 'updated';
  previousVersion?: string;
}

/**
 * Consent Manager
 *
 * Ensures all users provide mandatory consent before trading.
 * Maintains audit trail of all consent actions.
 */
export class ConsentManager extends EventEmitter implements TIMEComponent {
  public readonly name = 'ConsentManager';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  // In-memory storage (would be database in production)
  private userConsents: Map<string, UserConsent> = new Map();
  private consentHistory: ConsentRecord[] = [];

  constructor() {
    super();
  }

  /**
   * Initialize the consent manager
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Consent Manager...', {
      version: CURRENT_CONSENT_VERSION,
    });

    this.status = 'online';
    log.info('Consent Manager initialized');
  }

  /**
   * Check if a user has valid consent
   */
  public hasValidConsent(userId: string): boolean {
    const consent = this.userConsents.get(userId);

    if (!consent) {
      return false;
    }

    // Check if consent version is current
    if (consent.consentVersion !== CURRENT_CONSENT_VERSION) {
      log.debug('User consent version outdated', {
        userId,
        userVersion: consent.consentVersion,
        currentVersion: CURRENT_CONSENT_VERSION,
      });
      return false;
    }

    // Check if all required fields are consented
    for (const field of CONSENT_FIELDS) {
      if (!consent[field]) {
        log.debug('User missing required consent field', { userId, field });
        return false;
      }
    }

    return true;
  }

  /**
   * Get missing consent fields for a user
   */
  public getMissingConsent(userId: string): string[] {
    const consent = this.userConsents.get(userId);
    const missing: string[] = [];

    if (!consent) {
      return [...CONSENT_FIELDS];
    }

    for (const field of CONSENT_FIELDS) {
      if (!consent[field]) {
        missing.push(field);
      }
    }

    return missing;
  }

  /**
   * Grant consent for a user
   */
  public grantConsent(
    userId: string,
    consentData: Partial<UserConsent>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): UserConsent {
    const existingConsent = this.userConsents.get(userId);

    // Create full consent object
    const consent: UserConsent = {
      analyzeBots: consentData.analyzeBots ?? false,
      copyBots: consentData.copyBots ?? false,
      absorbBots: consentData.absorbBots ?? false,
      upgradeBots: consentData.upgradeBots ?? false,
      learnFromBots: consentData.learnFromBots ?? false,
      useBotsInEnsembles: consentData.useBotsInEnsembles ?? false,
      usePaidAccountData: consentData.usePaidAccountData ?? false,
      useDemoAccountData: consentData.useDemoAccountData ?? false,
      useTradingHistory: consentData.useTradingHistory ?? false,
      usePerformancePatterns: consentData.usePerformancePatterns ?? false,
      consentedAt: new Date(),
      consentVersion: CURRENT_CONSENT_VERSION,
    };

    // Store consent
    this.userConsents.set(userId, consent);

    // Create audit record
    const record: ConsentRecord = {
      id: uuidv4(),
      userId,
      consent,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      timestamp: new Date(),
      action: existingConsent ? 'updated' : 'granted',
      previousVersion: existingConsent?.consentVersion,
    };

    this.consentHistory.push(record);

    log.info('User consent granted', {
      userId,
      version: CURRENT_CONSENT_VERSION,
      action: record.action,
    });

    this.emit('consent:granted', userId, consent);

    return consent;
  }

  /**
   * Grant all consent at once (for users who agree to everything)
   */
  public grantFullConsent(
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): UserConsent {
    const fullConsent: Partial<UserConsent> = {};

    for (const field of CONSENT_FIELDS) {
      fullConsent[field] = true;
    }

    return this.grantConsent(userId, fullConsent, metadata);
  }

  /**
   * Revoke consent for a user
   */
  public revokeConsent(
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): void {
    const existingConsent = this.userConsents.get(userId);

    if (!existingConsent) {
      log.warn('Attempted to revoke non-existent consent', { userId });
      return;
    }

    // Create revoked consent (all false)
    const revokedConsent: UserConsent = {
      analyzeBots: false,
      copyBots: false,
      absorbBots: false,
      upgradeBots: false,
      learnFromBots: false,
      useBotsInEnsembles: false,
      usePaidAccountData: false,
      useDemoAccountData: false,
      useTradingHistory: false,
      usePerformancePatterns: false,
      consentedAt: new Date(),
      consentVersion: CURRENT_CONSENT_VERSION,
    };

    this.userConsents.set(userId, revokedConsent);

    // Create audit record
    const record: ConsentRecord = {
      id: uuidv4(),
      userId,
      consent: revokedConsent,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      timestamp: new Date(),
      action: 'revoked',
      previousVersion: existingConsent.consentVersion,
    };

    this.consentHistory.push(record);

    log.info('User consent revoked', { userId });
    this.emit('consent:revoked', userId);
  }

  /**
   * Get user's current consent
   */
  public getConsent(userId: string): UserConsent | undefined {
    return this.userConsents.get(userId);
  }

  /**
   * Get consent history for a user
   */
  public getConsentHistory(userId: string): ConsentRecord[] {
    return this.consentHistory.filter((r) => r.userId === userId);
  }

  /**
   * Get all consent records (admin function)
   */
  public getAllConsentRecords(): ConsentRecord[] {
    return [...this.consentHistory];
  }

  /**
   * Check if a specific consent field is granted
   */
  public hasSpecificConsent(
    userId: string,
    field: keyof Omit<UserConsent, 'consentedAt' | 'consentVersion'>
  ): boolean {
    const consent = this.userConsents.get(userId);
    return consent ? consent[field] : false;
  }

  /**
   * Get consent description for UI
   */
  public getConsentDescription(
    field: keyof Omit<UserConsent, 'consentedAt' | 'consentVersion'>
  ): string {
    return CONSENT_DESCRIPTIONS[field];
  }

  /**
   * Get all consent descriptions for UI
   */
  public getAllConsentDescriptions(): Record<string, string> {
    return { ...CONSENT_DESCRIPTIONS };
  }

  /**
   * Validate that user can perform an action based on consent
   */
  public validateAction(
    userId: string,
    requiredConsents: Array<keyof Omit<UserConsent, 'consentedAt' | 'consentVersion'>>
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of requiredConsents) {
      if (!this.hasSpecificConsent(userId, field)) {
        missing.push(field);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get statistics about consent
   */
  public getStats(): {
    totalUsers: number;
    usersWithFullConsent: number;
    usersWithPartialConsent: number;
    usersWithNoConsent: number;
    consentByField: Record<string, number>;
  } {
    let fullConsent = 0;
    let partialConsent = 0;
    const consentByField: Record<string, number> = {};

    for (const field of CONSENT_FIELDS) {
      consentByField[field] = 0;
    }

    for (const consent of this.userConsents.values()) {
      let allTrue = true;
      let anyTrue = false;

      for (const field of CONSENT_FIELDS) {
        if (consent[field]) {
          consentByField[field]++;
          anyTrue = true;
        } else {
          allTrue = false;
        }
      }

      if (allTrue) {
        fullConsent++;
      } else if (anyTrue) {
        partialConsent++;
      }
    }

    return {
      totalUsers: this.userConsents.size,
      usersWithFullConsent: fullConsent,
      usersWithPartialConsent: partialConsent,
      usersWithNoConsent: this.userConsents.size - fullConsent - partialConsent,
      consentByField,
    };
  }

  /**
   * Get component health
   */
  public getHealth(): SystemHealth {
    const stats = this.getStats();

    return {
      component: this.name,
      status: this.status,
      lastCheck: new Date(),
      metrics: {
        totalUsers: stats.totalUsers,
        usersWithFullConsent: stats.usersWithFullConsent,
        totalConsentRecords: this.consentHistory.length,
        currentVersion: parseFloat(CURRENT_CONSENT_VERSION),
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Consent Manager...');
    this.status = 'offline';
  }
}

// Export singleton
export const consentManager = new ConsentManager();

export default ConsentManager;

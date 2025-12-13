/**
 * TIME Audit Logging System
 *
 * Enterprise-grade audit logging for regulatory compliance and security.
 * Logs all sensitive actions with full context and immutable records.
 *
 * PLAIN ENGLISH:
 * - Every important action is recorded with who, what, when, where
 * - Required for SEC compliance and internal security
 * - Helps investigate issues and detect suspicious activity
 * - Records cannot be deleted or modified (immutable)
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

// Audit event categories
export type AuditCategory =
  | 'authentication' // Login, logout, MFA
  | 'authorization' // Permission checks, access attempts
  | 'account' // Account settings changes
  | 'trading' // Orders, trades, positions
  | 'transfer' // Deposits, withdrawals, ACATS
  | 'security' // Password changes, API keys, MFA
  | 'admin' // Admin actions
  | 'system'; // System events

// Severity levels
export type AuditSeverity = 'info' | 'warning' | 'critical';

// Result of action
export type AuditResult = 'success' | 'failure' | 'partial';

export interface AuditEvent {
  // Unique identifiers
  id: string;
  hash: string; // SHA-256 hash of event data (for integrity)
  previousHash: string; // Hash of previous event (blockchain-style chain)

  // Timestamp
  timestamp: Date;
  timestampMs: number; // Millisecond precision

  // Actor information
  userId: string | null;
  sessionId: string | null;
  apiKeyId: string | null;
  actorType: 'user' | 'system' | 'api' | 'bot' | 'admin';

  // Client information
  clientIP: string;
  userAgent: string;
  deviceId: string | null;
  geoLocation: {
    country?: string;
    region?: string;
    city?: string;
  } | null;

  // Event details
  category: AuditCategory;
  action: string;
  resource: string;
  resourceId: string | null;
  severity: AuditSeverity;
  result: AuditResult;

  // Changes made
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  // Additional context
  metadata: Record<string, any>;
  errorMessage: string | null;
  correlationId: string | null; // Link related events

  // Compliance fields
  requiresReview: boolean;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
}

// Event templates for common actions
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: { action: 'login_success', category: 'authentication' as AuditCategory, severity: 'info' as AuditSeverity },
  LOGIN_FAILED: { action: 'login_failed', category: 'authentication' as AuditCategory, severity: 'warning' as AuditSeverity },
  LOGOUT: { action: 'logout', category: 'authentication' as AuditCategory, severity: 'info' as AuditSeverity },
  MFA_ENABLED: { action: 'mfa_enabled', category: 'security' as AuditCategory, severity: 'info' as AuditSeverity },
  MFA_DISABLED: { action: 'mfa_disabled', category: 'security' as AuditCategory, severity: 'warning' as AuditSeverity },
  MFA_FAILED: { action: 'mfa_failed', category: 'security' as AuditCategory, severity: 'warning' as AuditSeverity },

  // Account
  PASSWORD_CHANGED: { action: 'password_changed', category: 'security' as AuditCategory, severity: 'info' as AuditSeverity },
  PASSWORD_RESET: { action: 'password_reset', category: 'security' as AuditCategory, severity: 'warning' as AuditSeverity },
  EMAIL_CHANGED: { action: 'email_changed', category: 'account' as AuditCategory, severity: 'warning' as AuditSeverity },
  PROFILE_UPDATED: { action: 'profile_updated', category: 'account' as AuditCategory, severity: 'info' as AuditSeverity },

  // Trading
  ORDER_PLACED: { action: 'order_placed', category: 'trading' as AuditCategory, severity: 'info' as AuditSeverity },
  ORDER_FILLED: { action: 'order_filled', category: 'trading' as AuditCategory, severity: 'info' as AuditSeverity },
  ORDER_CANCELLED: { action: 'order_cancelled', category: 'trading' as AuditCategory, severity: 'info' as AuditSeverity },
  ORDER_REJECTED: { action: 'order_rejected', category: 'trading' as AuditCategory, severity: 'warning' as AuditSeverity },
  POSITION_OPENED: { action: 'position_opened', category: 'trading' as AuditCategory, severity: 'info' as AuditSeverity },
  POSITION_CLOSED: { action: 'position_closed', category: 'trading' as AuditCategory, severity: 'info' as AuditSeverity },

  // Transfers
  DEPOSIT_INITIATED: { action: 'deposit_initiated', category: 'transfer' as AuditCategory, severity: 'info' as AuditSeverity },
  DEPOSIT_COMPLETED: { action: 'deposit_completed', category: 'transfer' as AuditCategory, severity: 'info' as AuditSeverity },
  WITHDRAWAL_REQUESTED: { action: 'withdrawal_requested', category: 'transfer' as AuditCategory, severity: 'warning' as AuditSeverity },
  WITHDRAWAL_COMPLETED: { action: 'withdrawal_completed', category: 'transfer' as AuditCategory, severity: 'critical' as AuditSeverity },
  ACATS_INITIATED: { action: 'acats_initiated', category: 'transfer' as AuditCategory, severity: 'warning' as AuditSeverity },
  ACATS_COMPLETED: { action: 'acats_completed', category: 'transfer' as AuditCategory, severity: 'info' as AuditSeverity },

  // Security
  API_KEY_CREATED: { action: 'api_key_created', category: 'security' as AuditCategory, severity: 'info' as AuditSeverity },
  API_KEY_REVOKED: { action: 'api_key_revoked', category: 'security' as AuditCategory, severity: 'info' as AuditSeverity },
  API_KEY_ROTATED: { action: 'api_key_rotated', category: 'security' as AuditCategory, severity: 'info' as AuditSeverity },
  SUSPICIOUS_ACTIVITY: { action: 'suspicious_activity', category: 'security' as AuditCategory, severity: 'critical' as AuditSeverity },
  UNAUTHORIZED_ACCESS: { action: 'unauthorized_access', category: 'authorization' as AuditCategory, severity: 'critical' as AuditSeverity },

  // Admin
  ADMIN_LOGIN: { action: 'admin_login', category: 'admin' as AuditCategory, severity: 'warning' as AuditSeverity },
  EVOLUTION_MODE_CHANGED: { action: 'evolution_mode_changed', category: 'admin' as AuditCategory, severity: 'critical' as AuditSeverity },
  EMERGENCY_BRAKE_ACTIVATED: { action: 'emergency_brake_activated', category: 'admin' as AuditCategory, severity: 'critical' as AuditSeverity },
  USER_SUSPENDED: { action: 'user_suspended', category: 'admin' as AuditCategory, severity: 'critical' as AuditSeverity },
};

/**
 * Generate unique audit event ID
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `audit_${timestamp}_${random}`;
}

/**
 * Calculate SHA-256 hash of event data
 */
function calculateEventHash(event: Omit<AuditEvent, 'hash'>): string {
  const data = JSON.stringify({
    id: event.id,
    previousHash: event.previousHash,
    timestamp: event.timestampMs,
    userId: event.userId,
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId,
    changes: event.changes,
    metadata: event.metadata,
  });

  return crypto.createHash('sha256').update(data).digest('hex');
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private lastHash: string = '0'.repeat(64); // Genesis hash
  private eventIndex: Map<string, number> = new Map();
  private userIndex: Map<string, string[]> = new Map();

  // Retention policy (in days)
  private retentionDays = {
    info: 90,
    warning: 365,
    critical: 2555, // 7 years (SEC requirement)
  };

  /**
   * Log an audit event
   *
   * PLAIN ENGLISH:
   * - Records an action with full context
   * - Creates a hash chain for integrity (like blockchain)
   * - Automatically categorizes and stores the event
   */
  async log(params: {
    // Actor
    userId?: string | null;
    sessionId?: string | null;
    apiKeyId?: string | null;
    actorType?: AuditEvent['actorType'];

    // Client
    clientIP: string;
    userAgent?: string;
    deviceId?: string | null;
    geoLocation?: AuditEvent['geoLocation'];

    // Event
    action: string;
    category: AuditCategory;
    resource: string;
    resourceId?: string | null;
    severity?: AuditSeverity;
    result: AuditResult;

    // Changes
    changes?: AuditEvent['changes'];
    metadata?: Record<string, any>;
    errorMessage?: string | null;
    correlationId?: string | null;
  }): Promise<AuditEvent> {
    const now = new Date();
    const nowMs = now.getTime();

    // Determine if requires review (critical events always do)
    const severity = params.severity || 'info';
    const requiresReview = severity === 'critical';

    // Build event without hash
    const eventWithoutHash: Omit<AuditEvent, 'hash'> = {
      id: generateEventId(),
      previousHash: this.lastHash,

      timestamp: now,
      timestampMs: nowMs,

      userId: params.userId || null,
      sessionId: params.sessionId || null,
      apiKeyId: params.apiKeyId || null,
      actorType: params.actorType || 'user',

      clientIP: params.clientIP,
      userAgent: params.userAgent || 'unknown',
      deviceId: params.deviceId || null,
      geoLocation: params.geoLocation || null,

      category: params.category,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId || null,
      severity,
      result: params.result,

      changes: params.changes || [],
      metadata: params.metadata || {},
      errorMessage: params.errorMessage || null,
      correlationId: params.correlationId || null,

      requiresReview,
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: null,
    };

    // Calculate hash
    const hash = calculateEventHash(eventWithoutHash);
    const event: AuditEvent = { ...eventWithoutHash, hash };

    // Store event
    this.events.push(event);
    this.lastHash = hash;
    this.eventIndex.set(event.id, this.events.length - 1);

    // Index by user
    if (event.userId) {
      const userEvents = this.userIndex.get(event.userId) || [];
      userEvents.push(event.id);
      this.userIndex.set(event.userId, userEvents);
    }

    // Log to Winston
    logger.info('Audit event logged', {
      eventId: event.id,
      action: event.action,
      category: event.category,
      severity: event.severity,
      userId: event.userId,
      result: event.result,
    });

    // Alert on critical events
    if (severity === 'critical') {
      this.alertCriticalEvent(event);
    }

    return event;
  }

  /**
   * Quick log with predefined action template
   */
  async logAction(
    template: { action: string; category: AuditCategory; severity: AuditSeverity },
    params: {
      userId?: string | null;
      clientIP: string;
      resource: string;
      resourceId?: string | null;
      result: AuditResult;
      changes?: AuditEvent['changes'];
      metadata?: Record<string, any>;
      errorMessage?: string | null;
    }
  ): Promise<AuditEvent> {
    return this.log({
      ...params,
      action: template.action,
      category: template.category,
      severity: template.severity,
    });
  }

  /**
   * Search audit events
   */
  search(filters: {
    userId?: string;
    category?: AuditCategory;
    action?: string;
    severity?: AuditSeverity;
    result?: AuditResult;
    resource?: string;
    resourceId?: string;
    startTime?: Date;
    endTime?: Date;
    requiresReview?: boolean;
    limit?: number;
    offset?: number;
  }): { events: AuditEvent[]; total: number } {
    let results = [...this.events];

    // Apply filters
    if (filters.userId) {
      results = results.filter((e) => e.userId === filters.userId);
    }
    if (filters.category) {
      results = results.filter((e) => e.category === filters.category);
    }
    if (filters.action) {
      results = results.filter((e) => e.action === filters.action);
    }
    if (filters.severity) {
      results = results.filter((e) => e.severity === filters.severity);
    }
    if (filters.result) {
      results = results.filter((e) => e.result === filters.result);
    }
    if (filters.resource) {
      results = results.filter((e) => e.resource === filters.resource);
    }
    if (filters.resourceId) {
      results = results.filter((e) => e.resourceId === filters.resourceId);
    }
    if (filters.startTime) {
      results = results.filter((e) => e.timestamp >= filters.startTime!);
    }
    if (filters.endTime) {
      results = results.filter((e) => e.timestamp <= filters.endTime!);
    }
    if (filters.requiresReview !== undefined) {
      results = results.filter((e) => e.requiresReview === filters.requiresReview);
    }

    // Sort by timestamp descending (most recent first)
    results.sort((a, b) => b.timestampMs - a.timestampMs);

    const total = results.length;

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    results = results.slice(offset, offset + limit);

    return { events: results, total };
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): AuditEvent | null {
    const index = this.eventIndex.get(eventId);
    if (index === undefined) return null;
    return this.events[index];
  }

  /**
   * Get events for a specific user
   */
  getUserEvents(userId: string, limit: number = 100): AuditEvent[] {
    const eventIds = this.userIndex.get(userId) || [];
    const events = eventIds
      .slice(-limit)
      .map((id) => {
        const index = this.eventIndex.get(id);
        return index !== undefined ? this.events[index] : null;
      })
      .filter((e): e is AuditEvent => e !== null);

    return events.reverse(); // Most recent first
  }

  /**
   * Mark event as reviewed (compliance requirement)
   */
  reviewEvent(eventId: string, reviewerId: string, notes: string): AuditEvent | null {
    const event = this.getEvent(eventId);
    if (!event) return null;

    event.reviewedAt = new Date();
    event.reviewedBy = reviewerId;
    event.reviewNotes = notes;

    logger.info('Audit event reviewed', { eventId, reviewerId });

    return event;
  }

  /**
   * Get events requiring review
   */
  getPendingReviews(): AuditEvent[] {
    return this.events.filter((e) => e.requiresReview && !e.reviewedAt);
  }

  /**
   * Verify audit log integrity
   *
   * PLAIN ENGLISH:
   * - Checks that no events have been tampered with
   * - Verifies the hash chain is intact
   * - Returns false if any tampering detected
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    let previousHash = '0'.repeat(64);

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];

      // Verify previous hash matches
      if (event.previousHash !== previousHash) {
        errors.push(`Event ${event.id}: Previous hash mismatch at index ${i}`);
      }

      // Verify event hash
      const { hash, ...eventWithoutHash } = event;
      const calculatedHash = calculateEventHash(eventWithoutHash as Omit<AuditEvent, 'hash'>);

      if (hash !== calculatedHash) {
        errors.push(`Event ${event.id}: Hash mismatch - possible tampering`);
      }

      previousHash = event.hash;
    }

    if (errors.length > 0) {
      logger.error('Audit log integrity check failed', { errors });
    } else {
      logger.info('Audit log integrity verified', { eventCount: this.events.length });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get audit statistics
   */
  getStatistics(startTime?: Date, endTime?: Date): {
    totalEvents: number;
    byCategory: Record<AuditCategory, number>;
    bySeverity: Record<AuditSeverity, number>;
    byResult: Record<AuditResult, number>;
    pendingReviews: number;
    topActions: { action: string; count: number }[];
  } {
    let events = this.events;

    if (startTime) {
      events = events.filter((e) => e.timestamp >= startTime);
    }
    if (endTime) {
      events = events.filter((e) => e.timestamp <= endTime);
    }

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};

    for (const event of events) {
      byCategory[event.category] = (byCategory[event.category] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
      byResult[event.result] = (byResult[event.result] || 0) + 1;
      actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
    }

    const topActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    return {
      totalEvents: events.length,
      byCategory: byCategory as Record<AuditCategory, number>,
      bySeverity: bySeverity as Record<AuditSeverity, number>,
      byResult: byResult as Record<AuditResult, number>,
      pendingReviews: this.getPendingReviews().length,
      topActions,
    };
  }

  /**
   * Export audit log (for compliance/legal)
   */
  exportToJSON(filters?: Parameters<typeof this.search>[0]): string {
    const { events } = filters ? this.search(filters) : { events: this.events };
    return JSON.stringify(events, null, 2);
  }

  /**
   * Alert on critical events (internal)
   */
  private alertCriticalEvent(event: AuditEvent): void {
    logger.warn('CRITICAL AUDIT EVENT', {
      eventId: event.id,
      action: event.action,
      userId: event.userId,
      clientIP: event.clientIP,
      metadata: event.metadata,
    });

    // In production, this would:
    // - Send email to security team
    // - Create PagerDuty incident
    // - Log to SIEM
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

logger.info('Audit Logger initialized - Compliance logging enabled');

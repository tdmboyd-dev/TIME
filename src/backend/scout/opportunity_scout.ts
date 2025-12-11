/**
 * Opportunity Scout - Legitimate Automated Earnings System
 *
 * This system helps users discover and manage legitimate income opportunities
 * through official APIs and user-authorized automation.
 *
 * KEY PRINCIPLES:
 * 1. User Authorization - All actions require explicit user consent
 * 2. API-Based - Uses official APIs, never scraping
 * 3. Transparent - All activity is logged and visible to user
 * 4. Legal - Only legitimate, legal income sources
 * 5. Your Accounts - Works with accounts YOU own and authorize
 *
 * SUPPORTED OPPORTUNITY TYPES:
 * - Dividend tracking & collection alerts
 * - Cashback aggregation
 * - Staking rewards monitoring
 * - Referral program management
 * - Freelance job alerts
 * - Survey/reward site routing (API-enabled only)
 * - Passive income tracking
 * - Affiliate earnings monitoring
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type OpportunityType =
  | 'dividend'
  | 'cashback'
  | 'staking'
  | 'referral'
  | 'freelance'
  | 'survey'
  | 'passive'
  | 'affiliate'
  | 'airdrop'
  | 'interest'
  | 'royalty';

export type OpportunityStatus =
  | 'discovered'
  | 'analyzing'
  | 'available'
  | 'pending_authorization'
  | 'authorized'
  | 'in_progress'
  | 'completed'
  | 'collected'
  | 'expired'
  | 'rejected';

export interface Opportunity {
  id: string;
  type: OpportunityType;
  source: OpportunitySource;
  title: string;
  description: string;
  estimatedValue: number;
  currency: string;
  confidence: number; // 0-100
  status: OpportunityStatus;
  requiresAction: boolean;
  actionDescription?: string;
  expiresAt?: Date;
  discoveredAt: Date;
  authorizedAt?: Date;
  completedAt?: Date;
  earnings?: number;
  metadata: Record<string, any>;
}

export interface OpportunitySource {
  name: string;
  type: 'api' | 'webhook' | 'manual' | 'notification';
  apiKey?: string;
  connected: boolean;
  lastSync?: Date;
}

export interface UserAuthorization {
  userId: string;
  opportunityId: string;
  authorized: boolean;
  authorizedAt: Date;
  scope: AuthorizationScope[];
  expiresAt?: Date;
}

export type AuthorizationScope =
  | 'view'
  | 'notify'
  | 'collect'
  | 'auto_collect'
  | 'reinvest';

export interface ConnectedAccount {
  id: string;
  userId: string;
  platform: string;
  accountType: string;
  connected: boolean;
  connectedAt: Date;
  lastActivity?: Date;
  balance?: number;
  currency?: string;
  apiCredentials: {
    hasApiKey: boolean;
    hasApiSecret: boolean;
    scopes: string[];
  };
}

export interface EarningsReport {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  startDate: Date;
  endDate: Date;
  totalEarnings: number;
  currency: string;
  byType: Record<OpportunityType, number>;
  bySource: Record<string, number>;
  opportunities: Opportunity[];
  projectedNextPeriod: number;
}

export interface ScoutConfig {
  userId: string;
  enabledTypes: OpportunityType[];
  minValue: number;
  autoAuthorize: boolean;
  autoCollect: boolean;
  notifyOnDiscovery: boolean;
  notifyOnCompletion: boolean;
  scanInterval: number; // ms
  reinvestmentRules: ReinvestmentRule[];
}

export interface ReinvestmentRule {
  id: string;
  enabled: boolean;
  sourceType: OpportunityType;
  targetType: 'savings' | 'investment' | 'crypto' | 'custom';
  percentage: number;
  minAmount: number;
  targetAccount?: string;
}

// ============================================================================
// Supported Platforms Configuration
// ============================================================================

export const SUPPORTED_PLATFORMS = {
  // Dividend & Investment Platforms
  investment: [
    {
      name: 'Alpaca',
      type: 'broker',
      opportunities: ['dividend', 'interest'],
      apiDocs: 'https://alpaca.markets/docs/api-references/',
      requiresApiKey: true,
    },
    {
      name: 'Robinhood',
      type: 'broker',
      opportunities: ['dividend'],
      apiDocs: 'https://robinhood.com/us/en/support/',
      requiresApiKey: true,
    },
  ],

  // Crypto Platforms
  crypto: [
    {
      name: 'Coinbase',
      type: 'exchange',
      opportunities: ['staking', 'interest', 'airdrop'],
      apiDocs: 'https://docs.cloud.coinbase.com/',
      requiresApiKey: true,
    },
    {
      name: 'Binance',
      type: 'exchange',
      opportunities: ['staking', 'interest', 'airdrop'],
      apiDocs: 'https://binance-docs.github.io/apidocs/',
      requiresApiKey: true,
    },
    {
      name: 'Kraken',
      type: 'exchange',
      opportunities: ['staking', 'interest'],
      apiDocs: 'https://docs.kraken.com/',
      requiresApiKey: true,
    },
  ],

  // Cashback & Rewards
  cashback: [
    {
      name: 'Rakuten',
      type: 'cashback',
      opportunities: ['cashback'],
      apiDocs: 'https://developers.rakuten.com/',
      requiresApiKey: true,
    },
    {
      name: 'Honey',
      type: 'cashback',
      opportunities: ['cashback'],
      apiDocs: null, // No public API
      requiresApiKey: false,
    },
  ],

  // Freelance Platforms (Job Alerts)
  freelance: [
    {
      name: 'Upwork',
      type: 'freelance',
      opportunities: ['freelance'],
      apiDocs: 'https://developers.upwork.com/',
      requiresApiKey: true,
    },
    {
      name: 'Fiverr',
      type: 'freelance',
      opportunities: ['freelance'],
      apiDocs: null,
      requiresApiKey: false,
    },
  ],

  // Affiliate Networks
  affiliate: [
    {
      name: 'Amazon Associates',
      type: 'affiliate',
      opportunities: ['affiliate'],
      apiDocs: 'https://affiliate-program.amazon.com/',
      requiresApiKey: true,
    },
    {
      name: 'ShareASale',
      type: 'affiliate',
      opportunities: ['affiliate'],
      apiDocs: 'https://www.shareasale.com/info/api/',
      requiresApiKey: true,
    },
  ],

  // Survey/Reward Platforms (API-enabled only)
  surveys: [
    {
      name: 'Prolific',
      type: 'survey',
      opportunities: ['survey'],
      apiDocs: 'https://docs.prolific.co/',
      requiresApiKey: true,
    },
  ],
};

// ============================================================================
// Opportunity Scout Class
// ============================================================================

export class OpportunityScout extends EventEmitter {
  private static instance: OpportunityScout;

  private config: Map<string, ScoutConfig> = new Map();
  private opportunities: Map<string, Opportunity> = new Map();
  private connectedAccounts: Map<string, ConnectedAccount[]> = new Map();
  private authorizations: Map<string, UserAuthorization> = new Map();
  private scanIntervals: Map<string, NodeJS.Timeout> = new Map();
  private totalEarnings: Map<string, number> = new Map();

  private constructor() {
    super();
    console.log('[OpportunityScout] Initialized');
  }

  public static getInstance(): OpportunityScout {
    if (!OpportunityScout.instance) {
      OpportunityScout.instance = new OpportunityScout();
    }
    return OpportunityScout.instance;
  }

  // ==========================================================================
  // User Configuration
  // ==========================================================================

  public async setupUser(userId: string, config: Partial<ScoutConfig>): Promise<ScoutConfig> {
    const fullConfig: ScoutConfig = {
      userId,
      enabledTypes: config.enabledTypes || ['dividend', 'cashback', 'staking'],
      minValue: config.minValue || 1.00,
      autoAuthorize: config.autoAuthorize || false, // Default: require manual authorization
      autoCollect: config.autoCollect || false,
      notifyOnDiscovery: config.notifyOnDiscovery || true,
      notifyOnCompletion: config.notifyOnCompletion || true,
      scanInterval: config.scanInterval || 3600000, // 1 hour default
      reinvestmentRules: config.reinvestmentRules || [],
    };

    this.config.set(userId, fullConfig);
    this.connectedAccounts.set(userId, []);
    this.totalEarnings.set(userId, 0);

    console.log(`[OpportunityScout] User ${userId} configured`);
    this.emit('user_configured', { userId, config: fullConfig });

    return fullConfig;
  }

  public getConfig(userId: string): ScoutConfig | null {
    return this.config.get(userId) || null;
  }

  public updateConfig(userId: string, updates: Partial<ScoutConfig>): ScoutConfig | null {
    const existing = this.config.get(userId);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    this.config.set(userId, updated);

    this.emit('config_updated', { userId, config: updated });
    return updated;
  }

  // ==========================================================================
  // Account Connection
  // ==========================================================================

  public async connectAccount(
    userId: string,
    platform: string,
    credentials: {
      apiKey?: string;
      apiSecret?: string;
      accessToken?: string;
      refreshToken?: string;
    }
  ): Promise<ConnectedAccount> {
    // Verify platform is supported
    const platformInfo = this.findPlatform(platform);
    if (!platformInfo) {
      throw new Error(`Platform ${platform} is not supported`);
    }

    // Create connected account record
    const account: ConnectedAccount = {
      id: crypto.randomUUID(),
      userId,
      platform,
      accountType: platformInfo.type,
      connected: true,
      connectedAt: new Date(),
      apiCredentials: {
        hasApiKey: !!credentials.apiKey,
        hasApiSecret: !!credentials.apiSecret,
        scopes: platformInfo.opportunities,
      },
    };

    // Store account (in production, encrypt credentials)
    const userAccounts = this.connectedAccounts.get(userId) || [];
    userAccounts.push(account);
    this.connectedAccounts.set(userId, userAccounts);

    console.log(`[OpportunityScout] Connected ${platform} for user ${userId}`);
    this.emit('account_connected', { userId, account });

    return account;
  }

  public disconnectAccount(userId: string, accountId: string): boolean {
    const userAccounts = this.connectedAccounts.get(userId);
    if (!userAccounts) return false;

    const index = userAccounts.findIndex(a => a.id === accountId);
    if (index === -1) return false;

    const removed = userAccounts.splice(index, 1)[0];
    this.emit('account_disconnected', { userId, account: removed });

    return true;
  }

  public getConnectedAccounts(userId: string): ConnectedAccount[] {
    return this.connectedAccounts.get(userId) || [];
  }

  private findPlatform(name: string): any {
    for (const category of Object.values(SUPPORTED_PLATFORMS)) {
      for (const platform of category) {
        if (platform.name.toLowerCase() === name.toLowerCase()) {
          return platform;
        }
      }
    }
    return null;
  }

  // ==========================================================================
  // Opportunity Scanning
  // ==========================================================================

  public startScanning(userId: string): void {
    const config = this.config.get(userId);
    if (!config) {
      throw new Error('User not configured');
    }

    // Stop existing scan if running
    this.stopScanning(userId);

    // Start new scan interval
    const interval = setInterval(() => {
      this.scanForOpportunities(userId);
    }, config.scanInterval);

    this.scanIntervals.set(userId, interval);

    // Initial scan
    this.scanForOpportunities(userId);

    console.log(`[OpportunityScout] Started scanning for user ${userId}`);
    this.emit('scanning_started', { userId });
  }

  public stopScanning(userId: string): void {
    const interval = this.scanIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.scanIntervals.delete(userId);
      console.log(`[OpportunityScout] Stopped scanning for user ${userId}`);
      this.emit('scanning_stopped', { userId });
    }
  }

  private async scanForOpportunities(userId: string): Promise<void> {
    const config = this.config.get(userId);
    const accounts = this.connectedAccounts.get(userId);

    if (!config || !accounts || accounts.length === 0) {
      return;
    }

    console.log(`[OpportunityScout] Scanning for opportunities for user ${userId}...`);

    for (const account of accounts) {
      try {
        const opportunities = await this.scanAccount(userId, account, config);

        for (const opportunity of opportunities) {
          // Check if meets minimum value
          if (opportunity.estimatedValue >= config.minValue) {
            this.opportunities.set(opportunity.id, opportunity);

            // Notify user
            if (config.notifyOnDiscovery) {
              this.emit('opportunity_discovered', { userId, opportunity });
            }

            // Auto-authorize if enabled
            if (config.autoAuthorize && opportunity.confidence >= 80) {
              await this.authorizeOpportunity(userId, opportunity.id, ['view', 'notify', 'collect']);
            }
          }
        }
      } catch (error) {
        console.error(`[OpportunityScout] Error scanning ${account.platform}:`, error);
        this.emit('scan_error', { userId, account, error });
      }
    }
  }

  private async scanAccount(
    userId: string,
    account: ConnectedAccount,
    config: ScoutConfig
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    // This is where you'd make actual API calls
    // For now, we'll create a simulation framework

    switch (account.accountType) {
      case 'broker':
        if (config.enabledTypes.includes('dividend')) {
          opportunities.push(...await this.scanDividends(userId, account));
        }
        break;

      case 'exchange':
        if (config.enabledTypes.includes('staking')) {
          opportunities.push(...await this.scanStakingRewards(userId, account));
        }
        if (config.enabledTypes.includes('airdrop')) {
          opportunities.push(...await this.scanAirdrops(userId, account));
        }
        break;

      case 'cashback':
        if (config.enabledTypes.includes('cashback')) {
          opportunities.push(...await this.scanCashback(userId, account));
        }
        break;

      case 'freelance':
        if (config.enabledTypes.includes('freelance')) {
          opportunities.push(...await this.scanFreelanceJobs(userId, account));
        }
        break;

      case 'affiliate':
        if (config.enabledTypes.includes('affiliate')) {
          opportunities.push(...await this.scanAffiliateEarnings(userId, account));
        }
        break;
    }

    return opportunities;
  }

  // ==========================================================================
  // Opportunity Type Scanners (API Integration Points)
  // ==========================================================================

  private async scanDividends(userId: string, account: ConnectedAccount): Promise<Opportunity[]> {
    // In production: Call broker API to get upcoming dividends
    // Example: Alpaca API - GET /v2/account/portfolio/history

    // Placeholder - would be replaced with actual API call
    return [];
  }

  private async scanStakingRewards(userId: string, account: ConnectedAccount): Promise<Opportunity[]> {
    // In production: Call exchange API to get staking rewards
    // Example: Coinbase API - GET /v2/accounts/:account_id/transactions

    return [];
  }

  private async scanAirdrops(userId: string, account: ConnectedAccount): Promise<Opportunity[]> {
    // In production: Check for eligible airdrops based on holdings

    return [];
  }

  private async scanCashback(userId: string, account: ConnectedAccount): Promise<Opportunity[]> {
    // In production: Check cashback balance ready for withdrawal

    return [];
  }

  private async scanFreelanceJobs(userId: string, account: ConnectedAccount): Promise<Opportunity[]> {
    // In production: Search for jobs matching user's skills
    // This would only ALERT the user, not auto-apply

    return [];
  }

  private async scanAffiliateEarnings(userId: string, account: ConnectedAccount): Promise<Opportunity[]> {
    // In production: Check affiliate dashboard for pending payouts

    return [];
  }

  // ==========================================================================
  // Manual Opportunity Addition
  // ==========================================================================

  public addManualOpportunity(userId: string, opportunity: Partial<Opportunity>): Opportunity {
    const fullOpportunity: Opportunity = {
      id: crypto.randomUUID(),
      type: opportunity.type || 'passive',
      source: {
        name: 'Manual Entry',
        type: 'manual',
        connected: true,
      },
      title: opportunity.title || 'Manual Opportunity',
      description: opportunity.description || '',
      estimatedValue: opportunity.estimatedValue || 0,
      currency: opportunity.currency || 'USD',
      confidence: opportunity.confidence || 50,
      status: 'pending_authorization',
      requiresAction: opportunity.requiresAction || false,
      actionDescription: opportunity.actionDescription,
      expiresAt: opportunity.expiresAt,
      discoveredAt: new Date(),
      metadata: opportunity.metadata || {},
    };

    this.opportunities.set(fullOpportunity.id, fullOpportunity);
    this.emit('opportunity_added', { userId, opportunity: fullOpportunity });

    return fullOpportunity;
  }

  // ==========================================================================
  // Authorization
  // ==========================================================================

  public async authorizeOpportunity(
    userId: string,
    opportunityId: string,
    scopes: AuthorizationScope[]
  ): Promise<UserAuthorization> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const authorization: UserAuthorization = {
      userId,
      opportunityId,
      authorized: true,
      authorizedAt: new Date(),
      scope: scopes,
    };

    this.authorizations.set(`${userId}:${opportunityId}`, authorization);

    // Update opportunity status
    opportunity.status = 'authorized';
    opportunity.authorizedAt = new Date();

    console.log(`[OpportunityScout] User ${userId} authorized opportunity ${opportunityId}`);
    this.emit('opportunity_authorized', { userId, opportunity, authorization });

    // If auto-collect is enabled and user authorized collection
    const config = this.config.get(userId);
    if (config?.autoCollect && scopes.includes('auto_collect')) {
      await this.collectOpportunity(userId, opportunityId);
    }

    return authorization;
  }

  public revokeAuthorization(userId: string, opportunityId: string): boolean {
    const key = `${userId}:${opportunityId}`;
    const existed = this.authorizations.has(key);
    this.authorizations.delete(key);

    if (existed) {
      const opportunity = this.opportunities.get(opportunityId);
      if (opportunity) {
        opportunity.status = 'available';
        opportunity.authorizedAt = undefined;
      }
      this.emit('authorization_revoked', { userId, opportunityId });
    }

    return existed;
  }

  // ==========================================================================
  // Collection
  // ==========================================================================

  public async collectOpportunity(userId: string, opportunityId: string): Promise<number> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const authorization = this.authorizations.get(`${userId}:${opportunityId}`);
    if (!authorization || !authorization.scope.includes('collect')) {
      throw new Error('Not authorized to collect this opportunity');
    }

    opportunity.status = 'in_progress';
    this.emit('collection_started', { userId, opportunity });

    try {
      // In production: Execute actual collection via API
      // For now, simulate success

      const earnings = opportunity.estimatedValue;
      opportunity.status = 'collected';
      opportunity.completedAt = new Date();
      opportunity.earnings = earnings;

      // Track total earnings
      const currentTotal = this.totalEarnings.get(userId) || 0;
      this.totalEarnings.set(userId, currentTotal + earnings);

      console.log(`[OpportunityScout] Collected $${earnings} for user ${userId}`);
      this.emit('opportunity_collected', { userId, opportunity, earnings });

      // Check reinvestment rules
      const config = this.config.get(userId);
      if (config?.reinvestmentRules.length > 0) {
        await this.processReinvestment(userId, opportunity, earnings, config);
      }

      // Notify user
      if (config?.notifyOnCompletion) {
        this.emit('collection_complete', { userId, opportunity, earnings });
      }

      return earnings;

    } catch (error) {
      opportunity.status = 'available'; // Reset for retry
      this.emit('collection_error', { userId, opportunity, error });
      throw error;
    }
  }

  private async processReinvestment(
    userId: string,
    opportunity: Opportunity,
    earnings: number,
    config: ScoutConfig
  ): Promise<void> {
    for (const rule of config.reinvestmentRules) {
      if (!rule.enabled) continue;
      if (rule.sourceType !== opportunity.type) continue;
      if (earnings < rule.minAmount) continue;

      const amount = earnings * (rule.percentage / 100);

      this.emit('reinvestment_triggered', {
        userId,
        rule,
        amount,
        targetType: rule.targetType,
      });

      // In production: Execute reinvestment via appropriate API
      console.log(`[OpportunityScout] Reinvesting $${amount} to ${rule.targetType}`);
    }
  }

  // ==========================================================================
  // Earnings Reports
  // ==========================================================================

  public getEarningsReport(
    userId: string,
    period: EarningsReport['period']
  ): EarningsReport {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all_time':
      default:
        startDate = new Date(0);
    }

    // Filter opportunities by date and user
    const relevantOpportunities = Array.from(this.opportunities.values())
      .filter(o =>
        o.status === 'collected' &&
        o.completedAt &&
        o.completedAt >= startDate &&
        o.completedAt <= now
      );

    // Calculate totals
    const byType: Record<OpportunityType, number> = {} as any;
    const bySource: Record<string, number> = {};
    let totalEarnings = 0;

    for (const opp of relevantOpportunities) {
      const earnings = opp.earnings || 0;
      totalEarnings += earnings;

      byType[opp.type] = (byType[opp.type] || 0) + earnings;
      bySource[opp.source.name] = (bySource[opp.source.name] || 0) + earnings;
    }

    // Project next period (simple average-based projection)
    const daysInPeriod = (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    const dailyAverage = daysInPeriod > 0 ? totalEarnings / daysInPeriod : 0;
    const projectedNextPeriod = dailyAverage * this.getPeriodDays(period);

    return {
      userId,
      period,
      startDate,
      endDate: now,
      totalEarnings,
      currency: 'USD',
      byType,
      bySource,
      opportunities: relevantOpportunities,
      projectedNextPeriod,
    };
  }

  private getPeriodDays(period: EarningsReport['period']): number {
    switch (period) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'yearly': return 365;
      default: return 30;
    }
  }

  // ==========================================================================
  // Opportunity Management
  // ==========================================================================

  public getOpportunities(userId: string, status?: OpportunityStatus): Opportunity[] {
    const allOpportunities = Array.from(this.opportunities.values());

    if (status) {
      return allOpportunities.filter(o => o.status === status);
    }

    return allOpportunities;
  }

  public getOpportunity(opportunityId: string): Opportunity | null {
    return this.opportunities.get(opportunityId) || null;
  }

  public dismissOpportunity(userId: string, opportunityId: string): boolean {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) return false;

    opportunity.status = 'rejected';
    this.emit('opportunity_dismissed', { userId, opportunity });

    return true;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  public getStats(userId: string): {
    totalEarnings: number;
    pendingOpportunities: number;
    authorizedOpportunities: number;
    collectedOpportunities: number;
    connectedAccounts: number;
    isScanning: boolean;
  } {
    const opportunities = this.getOpportunities(userId);

    return {
      totalEarnings: this.totalEarnings.get(userId) || 0,
      pendingOpportunities: opportunities.filter(o => o.status === 'pending_authorization').length,
      authorizedOpportunities: opportunities.filter(o => o.status === 'authorized').length,
      collectedOpportunities: opportunities.filter(o => o.status === 'collected').length,
      connectedAccounts: (this.connectedAccounts.get(userId) || []).length,
      isScanning: this.scanIntervals.has(userId),
    };
  }

  public getSupportedPlatforms(): typeof SUPPORTED_PLATFORMS {
    return SUPPORTED_PLATFORMS;
  }
}

// Export singleton instance
export const opportunityScout = OpportunityScout.getInstance();

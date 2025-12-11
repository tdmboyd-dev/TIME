/**
 * TIME — Meta-Intelligence Trading Governor
 * Bot Ingestion System
 *
 * TIME must ingest bots from:
 * - User uploads
 * - Public free bots
 * - Open-source bots
 * - Bots with 4.0+ reviews
 * - GitHub repositories
 * - Marketplaces (where allowed)
 * - Forums
 * - Strategy libraries
 *
 * TIME must:
 * - Copy bots (with consent)
 * - Fingerprint bots
 * - Analyze bots
 * - Learn from bots
 * - Absorb bots
 * - Upgrade bots
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { TIMEComponent } from '../core/time_governor';
import { botManager } from './bot_manager';
import { consentManager } from '../consent/consent_manager';
import {
  Bot,
  BotSource,
  BotConfig,
  SystemHealth,
} from '../types';

const log = loggers.bots;

// Bot ingestion request
export interface BotIngestionRequest {
  name: string;
  description: string;
  source: BotSource;
  sourceUrl?: string;
  code: string;
  config: Partial<BotConfig>;
  ownerId?: string;
  metadata?: BotMetadata;
}

// Bot metadata from external sources
export interface BotMetadata {
  rating?: number;
  reviewCount?: number;
  license?: string;
  author?: string;
  version?: string;
  language?: string;
  dependencies?: string[];
  lastUpdated?: Date;
}

// Ingestion result
export interface IngestionResult {
  success: boolean;
  botId?: string;
  error?: string;
  warnings: string[];
  analysisResults?: BotAnalysisResult;
}

// Bot analysis result
export interface BotAnalysisResult {
  isSafe: boolean;
  hasKnownVulnerabilities: boolean;
  detectedStrategies: string[];
  detectedIndicators: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  compatibilityScore: number;
  recommendations: string[];
}

/**
 * Bot Ingestion System
 *
 * Handles the intake of bots from various sources,
 * validates them, analyzes them, and registers them with TIME.
 */
export class BotIngestion extends EventEmitter implements TIMEComponent {
  public readonly name = 'BotIngestion';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private ingestionQueue: BotIngestionRequest[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Initialize the bot ingestion system
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Bot Ingestion System...');

    // Start processing queue
    this.startProcessingQueue();

    this.status = 'online';
    log.info('Bot Ingestion System initialized');
  }

  /**
   * Start the ingestion queue processor
   */
  private startProcessingQueue(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process the ingestion queue
   */
  private async processQueue(): Promise<void> {
    if (this.ingestionQueue.length === 0) return;

    const request = this.ingestionQueue.shift();
    if (!request) return;

    try {
      await this.processIngestion(request);
    } catch (error) {
      log.error('Failed to process bot ingestion', { error, request: request.name });
    }
  }

  /**
   * Ingest a bot from user upload
   */
  public async ingestFromUser(
    userId: string,
    request: Omit<BotIngestionRequest, 'source' | 'ownerId'>
  ): Promise<IngestionResult> {
    // Check consent
    if (!consentManager.hasValidConsent(userId)) {
      return {
        success: false,
        error: 'User has not provided required consent',
        warnings: [],
      };
    }

    const fullRequest: BotIngestionRequest = {
      ...request,
      source: 'user_upload',
      ownerId: userId,
    };

    return this.ingest(fullRequest);
  }

  /**
   * Ingest a bot from public source
   */
  public async ingestFromPublicSource(
    request: Omit<BotIngestionRequest, 'source'>
  ): Promise<IngestionResult> {
    // Determine source type
    let source: BotSource = 'public_free';

    if (request.sourceUrl?.includes('github.com')) {
      source = 'github';
    } else if (request.metadata?.license?.toLowerCase().includes('open')) {
      source = 'open_source';
    }

    const fullRequest: BotIngestionRequest = {
      ...request,
      source,
    };

    return this.ingest(fullRequest);
  }

  /**
   * Main ingestion method
   */
  public async ingest(request: BotIngestionRequest): Promise<IngestionResult> {
    const warnings: string[] = [];

    log.info('Starting bot ingestion', {
      name: request.name,
      source: request.source,
    });

    // Step 1: Validate the request
    const validationResult = this.validateRequest(request);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error,
        warnings,
      };
    }
    warnings.push(...validationResult.warnings);

    // Step 2: Analyze the bot code
    const analysisResults = await this.analyzeBot(request);
    if (!analysisResults.isSafe) {
      return {
        success: false,
        error: 'Bot failed safety analysis',
        warnings,
        analysisResults,
      };
    }
    warnings.push(...analysisResults.recommendations);

    // Step 3: Check license compatibility (for external sources)
    if (request.source !== 'user_upload' && request.metadata?.license) {
      const licenseCheck = this.checkLicense(request.metadata.license);
      if (!licenseCheck.compatible) {
        return {
          success: false,
          error: `License not compatible: ${licenseCheck.reason}`,
          warnings,
        };
      }
    }

    // Step 4: Register the bot
    const config = this.buildConfig(request.config);
    const bot = botManager.registerBot(
      request.name,
      request.description,
      request.source,
      request.code,
      config,
      request.ownerId,
      request.sourceUrl
    );

    // Step 5: Update with metadata
    if (request.metadata) {
      if (request.metadata.rating) {
        bot.rating = request.metadata.rating;
      }
      if (request.metadata.reviewCount) {
        bot.reviewCount = request.metadata.reviewCount;
      }
      if (request.metadata.license) {
        bot.license = request.metadata.license;
      }
    }

    // Step 6: Queue for fingerprinting
    this.emit('bot:ingested', bot, analysisResults);

    log.info('Bot ingestion successful', {
      botId: bot.id,
      name: bot.name,
      source: bot.source,
    });

    return {
      success: true,
      botId: bot.id,
      warnings,
      analysisResults,
    };
  }

  /**
   * Validate ingestion request
   */
  private validateRequest(request: BotIngestionRequest): {
    valid: boolean;
    error?: string;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check required fields
    if (!request.name || request.name.trim().length === 0) {
      return { valid: false, error: 'Bot name is required', warnings };
    }

    if (!request.code || request.code.trim().length === 0) {
      return { valid: false, error: 'Bot code is required', warnings };
    }

    // Check name length
    if (request.name.length > 100) {
      warnings.push('Bot name truncated to 100 characters');
      request.name = request.name.slice(0, 100);
    }

    // Check description
    if (!request.description) {
      warnings.push('No description provided');
      request.description = 'No description available';
    }

    // Check code size (max 1MB)
    if (request.code.length > 1024 * 1024) {
      return { valid: false, error: 'Bot code exceeds maximum size (1MB)', warnings };
    }

    return { valid: true, warnings };
  }

  /**
   * Analyze bot code for safety and strategy detection
   */
  private async analyzeBot(request: BotIngestionRequest): Promise<BotAnalysisResult> {
    const code = request.code.toLowerCase();
    const recommendations: string[] = [];

    // Safety checks
    const dangerousPatterns = [
      { pattern: 'eval(', reason: 'Uses eval which can execute arbitrary code' },
      { pattern: 'exec(', reason: 'Uses exec which can execute system commands' },
      { pattern: 'rm -rf', reason: 'Contains dangerous shell command' },
      { pattern: 'format c:', reason: 'Contains dangerous disk operation' },
      { pattern: 'drop table', reason: 'Contains SQL injection pattern' },
    ];

    let isSafe = true;
    const vulnerabilities: string[] = [];

    for (const { pattern, reason } of dangerousPatterns) {
      if (code.includes(pattern)) {
        isSafe = false;
        vulnerabilities.push(reason);
      }
    }

    // Strategy detection
    const strategyIndicators: Record<string, string[]> = {
      trend_following: ['moving average', 'ma', 'ema', 'sma', 'trend'],
      mean_reversion: ['bollinger', 'std', 'deviation', 'mean reversion', 'zscore'],
      momentum: ['rsi', 'momentum', 'roc', 'macd'],
      breakout: ['breakout', 'support', 'resistance', 'high', 'low'],
      scalping: ['scalp', 'tick', 'spread', 'market maker'],
    };

    const detectedStrategies: string[] = [];
    for (const [strategy, keywords] of Object.entries(strategyIndicators)) {
      if (keywords.some((kw) => code.includes(kw))) {
        detectedStrategies.push(strategy);
      }
    }

    // Indicator detection
    const indicators = ['rsi', 'macd', 'ema', 'sma', 'bollinger', 'atr', 'adx', 'stochastic', 'cci'];
    const detectedIndicators = indicators.filter((ind) => code.includes(ind));

    // Complexity estimation
    const lines = request.code.split('\n').length;
    let estimatedComplexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (lines > 500) {
      estimatedComplexity = 'complex';
    } else if (lines > 100) {
      estimatedComplexity = 'moderate';
    }

    // Compatibility score (0-1)
    let compatibilityScore = 1.0;
    if (vulnerabilities.length > 0) {
      compatibilityScore -= 0.3 * vulnerabilities.length;
    }
    if (detectedStrategies.length === 0) {
      compatibilityScore -= 0.1;
      recommendations.push('No clear strategy detected - may need manual classification');
    }

    // Generate recommendations
    if (estimatedComplexity === 'complex') {
      recommendations.push('Complex bot - consider breaking into smaller modules');
    }
    if (detectedIndicators.length === 0) {
      recommendations.push('No standard indicators detected - may be custom logic');
    }

    return {
      isSafe,
      hasKnownVulnerabilities: vulnerabilities.length > 0,
      detectedStrategies,
      detectedIndicators,
      estimatedComplexity,
      compatibilityScore: Math.max(0, compatibilityScore),
      recommendations,
    };
  }

  /**
   * Check license compatibility
   */
  private checkLicense(license: string): { compatible: boolean; reason?: string } {
    const lowerLicense = license.toLowerCase();

    // Compatible licenses
    const compatibleLicenses = ['mit', 'apache', 'bsd', 'public domain', 'cc0', 'unlicense', 'gpl'];

    // Incompatible licenses
    const incompatibleLicenses = ['proprietary', 'all rights reserved', 'commercial'];

    if (incompatibleLicenses.some((l) => lowerLicense.includes(l))) {
      return {
        compatible: false,
        reason: 'License does not permit commercial or derivative use',
      };
    }

    if (compatibleLicenses.some((l) => lowerLicense.includes(l))) {
      return { compatible: true };
    }

    // Unknown license - allow but warn
    return { compatible: true };
  }

  /**
   * Build bot config with defaults
   */
  private buildConfig(partial: Partial<BotConfig>): BotConfig {
    return {
      symbols: partial.symbols ?? [],
      timeframes: partial.timeframes ?? ['1h'],
      riskParams: {
        maxPositionSize: partial.riskParams?.maxPositionSize ?? 0.02,
        maxDrawdown: partial.riskParams?.maxDrawdown ?? 0.1,
        stopLossPercent: partial.riskParams?.stopLossPercent ?? 0.02,
        takeProfitPercent: partial.riskParams?.takeProfitPercent ?? 0.04,
      },
      customParams: partial.customParams ?? {},
    };
  }

  /**
   * Process ingestion request (internal)
   */
  private async processIngestion(request: BotIngestionRequest): Promise<void> {
    const result = await this.ingest(request);
    this.emit('ingestion:processed', request, result);
  }

  /**
   * Queue a bot for ingestion
   */
  public queueIngestion(request: BotIngestionRequest): void {
    this.ingestionQueue.push(request);
    log.debug('Bot queued for ingestion', { name: request.name });
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): { pending: number; requests: string[] } {
    return {
      pending: this.ingestionQueue.length,
      requests: this.ingestionQueue.map((r) => r.name),
    };
  }

  /**
   * Get component health
   */
  public getHealth(): SystemHealth {
    return {
      component: this.name,
      status: this.status,
      lastCheck: new Date(),
      metrics: {
        queueSize: this.ingestionQueue.length,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Bot Ingestion System...');

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.status = 'offline';
  }
}

// Export singleton
export const botIngestion = new BotIngestion();

export default BotIngestion;

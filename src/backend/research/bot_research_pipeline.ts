/**
 * Bot Research Pipeline
 *
 * TIME's automated system for discovering, evaluating, and ingesting
 * trading bots from various sources:
 * - GitHub (open-source trading bots)
 * - MQL5 Marketplace (free bots with 4.0+ ratings)
 * - cTrader (free algos)
 * - TradingView (community scripts)
 * - Reddit/Forums (community recommendations)
 *
 * This pipeline continuously searches, evaluates, and prepares bots
 * for TIME to absorb and learn from.
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';
import { TIMEGovernor } from '../core/time_governor';
import { Bot, BotSource, TIMEComponent } from '../types';

const logger = createComponentLogger('BotResearchPipeline');

// Minimum rating threshold for bot discovery
const MIN_RATING = 4.0;
const MIN_DOWNLOADS = 100;
const MIN_REVIEWS = 5;

// Research sources configuration
interface ResearchSource {
  name: string;
  type: BotSource;
  enabled: boolean;
  searchInterval: number; // hours
  lastSearch: Date | null;
  resultCount: number;
}

// Discovered bot candidate
interface BotCandidate {
  id: string;
  name: string;
  source: BotSource;
  sourceUrl: string;
  description: string;
  rating: number;
  downloads: number;
  reviews: number;
  author: string;
  lastUpdated: Date;
  tags: string[];
  codeAvailable: boolean;
  license: string;
  evaluationScore: number;
  discoveredAt: Date;
  status: 'pending' | 'evaluating' | 'approved' | 'rejected' | 'ingested';
}

// Search criteria for different sources
interface SearchCriteria {
  keywords: string[];
  minRating: number;
  minDownloads: number;
  categories: string[];
  excludePatterns: string[];
  maxAge: number; // days since last update
}

// Evaluation result
interface EvaluationResult {
  candidateId: string;
  score: number;
  factors: {
    codeQuality: number;
    documentation: number;
    communityTrust: number;
    performanceClaims: number;
    safetyCheck: number;
  };
  risks: string[];
  recommendations: string[];
  approved: boolean;
}

export class BotResearchPipeline extends EventEmitter implements TIMEComponent {
  private static instance: BotResearchPipeline | null = null;
  private isRunning: boolean = false;
  private sources: Map<string, ResearchSource> = new Map();
  private candidates: Map<string, BotCandidate> = new Map();
  private searchCriteria: SearchCriteria;
  private searchIntervalId: NodeJS.Timeout | null = null;

  public readonly name = 'BotResearchPipeline';
  public readonly version = '1.0.0';
  public status: 'online' | 'offline' | 'degraded' | 'building' = 'offline';

  private constructor() {
    super();
    this.initializeSources();
    this.searchCriteria = this.getDefaultSearchCriteria();
  }

  public static getInstance(): BotResearchPipeline {
    if (!BotResearchPipeline.instance) {
      BotResearchPipeline.instance = new BotResearchPipeline();
    }
    return BotResearchPipeline.instance;
  }

  private initializeSources(): void {
    const defaultSources: ResearchSource[] = [
      {
        name: 'GitHub',
        type: 'github',
        enabled: true,
        searchInterval: 6, // Every 6 hours
        lastSearch: null,
        resultCount: 0,
      },
      {
        name: 'MQL5 Market',
        type: 'mql5',
        enabled: true,
        searchInterval: 12,
        lastSearch: null,
        resultCount: 0,
      },
      {
        name: 'cTrader',
        type: 'ctrader',
        enabled: true,
        searchInterval: 12,
        lastSearch: null,
        resultCount: 0,
      },
      {
        name: 'TradingView',
        type: 'tradingview',
        enabled: true,
        searchInterval: 24,
        lastSearch: null,
        resultCount: 0,
      },
      {
        name: 'Reddit',
        type: 'forum',
        enabled: true,
        searchInterval: 24,
        lastSearch: null,
        resultCount: 0,
      },
    ];

    defaultSources.forEach((source) => {
      this.sources.set(source.name, source);
    });
  }

  private getDefaultSearchCriteria(): SearchCriteria {
    return {
      keywords: [
        'trading bot',
        'algo trading',
        'automated trading',
        'forex bot',
        'crypto trading bot',
        'stock trading algorithm',
        'mean reversion',
        'trend following',
        'momentum strategy',
        'scalping bot',
        'swing trading',
        'arbitrage',
        'market making',
        'quantitative trading',
      ],
      minRating: MIN_RATING,
      minDownloads: MIN_DOWNLOADS,
      categories: [
        'trading',
        'finance',
        'algorithmic-trading',
        'cryptocurrency',
        'forex',
        'stocks',
      ],
      excludePatterns: [
        'scam',
        'guaranteed profits',
        '100% win rate',
        'get rich quick',
        'no risk',
      ],
      maxAge: 365, // Bots updated within the last year
    };
  }

  public async initialize(): Promise<void> {
    this.status = 'building';
    logger.info('Initializing Bot Research Pipeline');

    // Register with TIME Governor
    const governor = TIMEGovernor.getInstance();
    governor.registerComponent(this);

    this.status = 'online';
    logger.info('Bot Research Pipeline initialized');
  }

  public async shutdown(): Promise<void> {
    this.stop();
    this.status = 'offline';
    logger.info('Bot Research Pipeline shut down');
  }

  public getHealth(): { component: string; status: 'online' | 'offline' | 'degraded'; lastCheck: Date; metrics: Record<string, number> } {
    return {
      component: this.name,
      status: this.isRunning ? 'online' : 'offline',
      lastCheck: new Date(),
      metrics: {
        candidates: this.candidates.size,
        sources: this.sources.size,
      },
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot Research Pipeline is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Bot Research Pipeline');

    // Start periodic search
    this.startPeriodicSearch();

    // Emit started event
    this.emit('started');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping Bot Research Pipeline');

    if (this.searchIntervalId) {
      clearInterval(this.searchIntervalId);
      this.searchIntervalId = null;
    }

    this.emit('stopped');
  }

  public getStatus(): { running: boolean; sources: ResearchSource[]; candidateCount: number } {
    return {
      running: this.isRunning,
      sources: Array.from(this.sources.values()),
      candidateCount: this.candidates.size,
    };
  }

  private startPeriodicSearch(): void {
    // Run search every hour to check if any source is due
    this.searchIntervalId = setInterval(async () => {
      await this.runScheduledSearches();
    }, 60 * 60 * 1000); // Every hour

    // Also run immediately on start
    this.runScheduledSearches();
  }

  private async runScheduledSearches(): Promise<void> {
    const now = new Date();

    for (const [name, source] of this.sources) {
      if (!source.enabled) continue;

      const hoursSinceLastSearch = source.lastSearch
        ? (now.getTime() - source.lastSearch.getTime()) / (1000 * 60 * 60)
        : Infinity;

      if (hoursSinceLastSearch >= source.searchInterval) {
        logger.info(`Running scheduled search for ${name}`);
        await this.searchSource(source);
      }
    }
  }

  /**
   * Search a specific source for bot candidates
   */
  public async searchSource(source: ResearchSource): Promise<BotCandidate[]> {
    logger.info(`Searching ${source.name} for trading bots...`);
    const candidates: BotCandidate[] = [];

    try {
      switch (source.type) {
        case 'github':
          candidates.push(...(await this.searchGitHub()));
          break;
        case 'mql5':
          candidates.push(...(await this.searchMQL5()));
          break;
        case 'ctrader':
          candidates.push(...(await this.searchCTrader()));
          break;
        case 'tradingview':
          candidates.push(...(await this.searchTradingView()));
          break;
        case 'forum':
          candidates.push(...(await this.searchForums()));
          break;
        default:
          logger.warn(`Unknown source type: ${source.type}`);
      }

      // Update source stats
      source.lastSearch = new Date();
      source.resultCount = candidates.length;
      this.sources.set(source.name, source);

      // Add candidates to the pool
      candidates.forEach((candidate) => {
        this.candidates.set(candidate.id, candidate);
      });

      logger.info(`Found ${candidates.length} candidates from ${source.name}`);
      this.emit('searchComplete', { source: source.name, count: candidates.length });

      return candidates;
    } catch (error) {
      logger.error(`Error searching ${source.name}:`, error as object);
      return [];
    }
  }

  /**
   * Search GitHub for open-source trading bots
   */
  private async searchGitHub(): Promise<BotCandidate[]> {
    const candidates: BotCandidate[] = [];

    // In a real implementation, this would use the GitHub API
    // For now, we'll simulate the search results
    logger.info('Searching GitHub for trading bots...');

    // Simulated results - in production, use:
    // const response = await fetch('https://api.github.com/search/repositories?q=trading+bot+language:python+stars:>50');

    const simulatedResults = [
      {
        name: 'freqtrade/freqtrade',
        description: 'Free, open source crypto trading bot',
        stars: 25000,
        forks: 5600,
        language: 'Python',
        updated: new Date(Date.now() - 86400000), // 1 day ago
        license: 'GPL-3.0',
      },
      {
        name: 'jesse-ai/jesse',
        description: 'An advanced crypto trading bot written in Python',
        stars: 5200,
        forks: 890,
        language: 'Python',
        updated: new Date(Date.now() - 172800000), // 2 days ago
        license: 'MIT',
      },
      {
        name: 'ccxt/ccxt',
        description: 'CryptoCurrency eXchange Trading Library',
        stars: 31000,
        forks: 7500,
        language: 'JavaScript',
        updated: new Date(Date.now() - 43200000), // 12 hours ago
        license: 'MIT',
      },
    ];

    for (const repo of simulatedResults) {
      const candidate: BotCandidate = {
        id: `github-${repo.name.replace('/', '-')}`,
        name: repo.name.split('/')[1],
        source: 'github',
        sourceUrl: `https://github.com/${repo.name}`,
        description: repo.description,
        rating: Math.min(5, 3.5 + (repo.stars / 10000)), // Derive rating from stars
        downloads: repo.stars,
        reviews: repo.forks,
        author: repo.name.split('/')[0],
        lastUpdated: repo.updated,
        tags: ['open-source', repo.language.toLowerCase(), 'community'],
        codeAvailable: true,
        license: repo.license,
        evaluationScore: 0,
        discoveredAt: new Date(),
        status: 'pending',
      };

      if (this.meetsSearchCriteria(candidate)) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Search MQL5 Market for free expert advisors
   */
  private async searchMQL5(): Promise<BotCandidate[]> {
    const candidates: BotCandidate[] = [];

    logger.info('Searching MQL5 Market for free EAs...');

    // Simulated MQL5 results
    const simulatedResults = [
      {
        id: 'mql5-ea-123456',
        name: 'Trend Master Pro',
        description: 'Advanced trend following EA with dynamic trailing stop',
        rating: 4.5,
        downloads: 15420,
        reviews: 234,
        author: 'TradePro',
        updated: new Date(Date.now() - 604800000), // 1 week ago
      },
      {
        id: 'mql5-ea-789012',
        name: 'Scalper Grid',
        description: 'High-frequency scalping EA with grid recovery',
        rating: 4.2,
        downloads: 8750,
        reviews: 156,
        author: 'AlgoMaster',
        updated: new Date(Date.now() - 1209600000), // 2 weeks ago
      },
    ];

    for (const ea of simulatedResults) {
      const candidate: BotCandidate = {
        id: ea.id,
        name: ea.name,
        source: 'mql5',
        sourceUrl: `https://www.mql5.com/en/market/product/${ea.id.split('-').pop()}`,
        description: ea.description,
        rating: ea.rating,
        downloads: ea.downloads,
        reviews: ea.reviews,
        author: ea.author,
        lastUpdated: ea.updated,
        tags: ['metatrader', 'forex', 'expert-advisor'],
        codeAvailable: false, // MQL5 compiled code
        license: 'Commercial Free',
        evaluationScore: 0,
        discoveredAt: new Date(),
        status: 'pending',
      };

      if (this.meetsSearchCriteria(candidate)) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Search cTrader for free cBots
   */
  private async searchCTrader(): Promise<BotCandidate[]> {
    const candidates: BotCandidate[] = [];

    logger.info('Searching cTrader for free cBots...');

    // Simulated cTrader results
    const simulatedResults = [
      {
        id: 'ctrader-bot-001',
        name: 'Smart Money cBot',
        description: 'Identifies institutional order flow and smart money',
        rating: 4.3,
        downloads: 5600,
        reviews: 89,
        author: 'PriceAction_Pro',
        updated: new Date(Date.now() - 432000000), // 5 days ago
      },
    ];

    for (const bot of simulatedResults) {
      const candidate: BotCandidate = {
        id: bot.id,
        name: bot.name,
        source: 'ctrader',
        sourceUrl: `https://ctrader.com/algos/${bot.id}`,
        description: bot.description,
        rating: bot.rating,
        downloads: bot.downloads,
        reviews: bot.reviews,
        author: bot.author,
        lastUpdated: bot.updated,
        tags: ['ctrader', 'cbot', 'forex'],
        codeAvailable: true, // cTrader provides source
        license: 'Free',
        evaluationScore: 0,
        discoveredAt: new Date(),
        status: 'pending',
      };

      if (this.meetsSearchCriteria(candidate)) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Search TradingView for community scripts
   */
  private async searchTradingView(): Promise<BotCandidate[]> {
    const candidates: BotCandidate[] = [];

    logger.info('Searching TradingView for trading scripts...');

    // Simulated TradingView results
    const simulatedResults = [
      {
        id: 'tv-script-supertrend',
        name: 'SuperTrend Strategy',
        description: 'ATR-based trend following with dynamic bands',
        likes: 12500,
        views: 450000,
        author: 'LuxAlgo',
        updated: new Date(Date.now() - 259200000), // 3 days ago
      },
      {
        id: 'tv-script-rsi-divergence',
        name: 'RSI Divergence Pro',
        description: 'Automatic divergence detection with alerts',
        likes: 8900,
        views: 320000,
        author: 'QuantVue',
        updated: new Date(Date.now() - 518400000), // 6 days ago
      },
    ];

    for (const script of simulatedResults) {
      const candidate: BotCandidate = {
        id: script.id,
        name: script.name,
        source: 'tradingview',
        sourceUrl: `https://www.tradingview.com/script/${script.id}`,
        description: script.description,
        rating: Math.min(5, 3.5 + (script.likes / 5000)), // Derive from likes
        downloads: script.views,
        reviews: script.likes,
        author: script.author,
        lastUpdated: script.updated,
        tags: ['pinescript', 'tradingview', 'indicator'],
        codeAvailable: true, // TradingView open source scripts
        license: 'MPL-2.0',
        evaluationScore: 0,
        discoveredAt: new Date(),
        status: 'pending',
      };

      if (this.meetsSearchCriteria(candidate)) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Search trading forums and Reddit for recommended bots
   */
  private async searchForums(): Promise<BotCandidate[]> {
    const candidates: BotCandidate[] = [];

    logger.info('Searching forums and Reddit for bot recommendations...');

    // In production, this would scrape/API forums like:
    // - r/algotrading
    // - r/forex
    // - r/cryptocurrency
    // - ForexFactory
    // - Elite Trader

    // Simulated forum discoveries
    const simulatedResults = [
      {
        id: 'forum-discovery-001',
        name: 'Community Grid Bot',
        description: 'Highly recommended grid bot from r/algotrading',
        source: 'Reddit r/algotrading',
        upvotes: 450,
        comments: 89,
        author: 'algo_enthusiast',
        repoUrl: 'https://github.com/community/grid-bot',
      },
    ];

    for (const discovery of simulatedResults) {
      const candidate: BotCandidate = {
        id: discovery.id,
        name: discovery.name,
        source: 'forum',
        sourceUrl: discovery.repoUrl,
        description: discovery.description,
        rating: Math.min(5, 3.5 + (discovery.upvotes / 200)),
        downloads: discovery.upvotes * 10, // Estimate
        reviews: discovery.comments,
        author: discovery.author,
        lastUpdated: new Date(),
        tags: ['community', 'recommended', 'reddit'],
        codeAvailable: true,
        license: 'Unknown',
        evaluationScore: 0,
        discoveredAt: new Date(),
        status: 'pending',
      };

      if (this.meetsSearchCriteria(candidate)) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Check if a bot candidate meets search criteria
   */
  private meetsSearchCriteria(candidate: BotCandidate): boolean {
    // Check minimum rating
    if (candidate.rating < this.searchCriteria.minRating) {
      return false;
    }

    // Check minimum downloads
    if (candidate.downloads < this.searchCriteria.minDownloads) {
      return false;
    }

    // Check for exclude patterns (scams, etc.)
    const descLower = candidate.description.toLowerCase();
    for (const pattern of this.searchCriteria.excludePatterns) {
      if (descLower.includes(pattern.toLowerCase())) {
        logger.warn(`Excluding ${candidate.name}: contains "${pattern}"`);
        return false;
      }
    }

    // Check age
    const ageInDays =
      (Date.now() - candidate.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > this.searchCriteria.maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate a bot candidate for quality and safety
   */
  public async evaluateCandidate(candidateId: string): Promise<EvaluationResult | null> {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      logger.warn(`Candidate not found: ${candidateId}`);
      return null;
    }

    logger.info(`Evaluating candidate: ${candidate.name}`);
    candidate.status = 'evaluating';

    const evaluation: EvaluationResult = {
      candidateId,
      score: 0,
      factors: {
        codeQuality: 0,
        documentation: 0,
        communityTrust: 0,
        performanceClaims: 0,
        safetyCheck: 0,
      },
      risks: [],
      recommendations: [],
      approved: false,
    };

    // Evaluate code quality (if available)
    if (candidate.codeAvailable) {
      evaluation.factors.codeQuality = await this.evaluateCodeQuality(candidate);
    } else {
      evaluation.factors.codeQuality = 50; // Neutral for compiled code
      evaluation.risks.push('Source code not available for review');
    }

    // Evaluate documentation
    evaluation.factors.documentation = this.evaluateDocumentation(candidate);

    // Evaluate community trust
    evaluation.factors.communityTrust = this.evaluateCommunityTrust(candidate);

    // Evaluate performance claims
    evaluation.factors.performanceClaims = this.evaluatePerformanceClaims(candidate);

    // Safety check
    evaluation.factors.safetyCheck = await this.performSafetyCheck(candidate);

    // Calculate overall score (weighted average)
    const weights = {
      codeQuality: 0.25,
      documentation: 0.15,
      communityTrust: 0.25,
      performanceClaims: 0.15,
      safetyCheck: 0.20,
    };

    evaluation.score =
      evaluation.factors.codeQuality * weights.codeQuality +
      evaluation.factors.documentation * weights.documentation +
      evaluation.factors.communityTrust * weights.communityTrust +
      evaluation.factors.performanceClaims * weights.performanceClaims +
      evaluation.factors.safetyCheck * weights.safetyCheck;

    // Generate recommendations
    if (evaluation.factors.codeQuality < 60) {
      evaluation.recommendations.push('Review code quality before integration');
    }
    if (evaluation.factors.safetyCheck < 70) {
      evaluation.recommendations.push('Run extended safety tests in sandbox');
    }
    if (evaluation.factors.communityTrust < 50) {
      evaluation.recommendations.push('Limited community feedback - monitor closely');
    }

    // Determine approval
    evaluation.approved = evaluation.score >= 65 && evaluation.factors.safetyCheck >= 60;

    // Update candidate
    candidate.evaluationScore = evaluation.score;
    candidate.status = evaluation.approved ? 'approved' : 'rejected';
    this.candidates.set(candidateId, candidate);

    logger.info(
      `Evaluation complete for ${candidate.name}: Score=${evaluation.score.toFixed(1)}, Approved=${evaluation.approved}`
    );

    this.emit('evaluationComplete', { candidateId, evaluation });
    return evaluation;
  }

  private async evaluateCodeQuality(candidate: BotCandidate): Promise<number> {
    // In production, this would:
    // 1. Clone/download the repository
    // 2. Run static analysis (ESLint, Pylint, etc.)
    // 3. Check for code patterns (proper error handling, etc.)
    // 4. Analyze complexity metrics

    let score = 70; // Base score

    // Boost for well-known licenses
    if (['MIT', 'Apache-2.0', 'GPL-3.0'].includes(candidate.license)) {
      score += 10;
    }

    // Boost for popular repos (GitHub)
    if (candidate.source === 'github' && candidate.downloads > 1000) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private evaluateDocumentation(candidate: BotCandidate): number {
    let score = 50; // Base score

    // Check description length
    if (candidate.description.length > 100) {
      score += 15;
    }

    // Boost for having tags
    if (candidate.tags.length >= 3) {
      score += 10;
    }

    // Boost for recent updates
    const daysSinceUpdate =
      (Date.now() - candidate.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += 15;
    } else if (daysSinceUpdate < 90) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private evaluateCommunityTrust(candidate: BotCandidate): number {
    let score = 40; // Base score

    // Rating contribution
    score += (candidate.rating / 5) * 30;

    // Downloads/reviews contribution
    if (candidate.downloads > 10000) {
      score += 20;
    } else if (candidate.downloads > 1000) {
      score += 10;
    }

    if (candidate.reviews > 50) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private evaluatePerformanceClaims(candidate: BotCandidate): number {
    const descLower = candidate.description.toLowerCase();
    let score = 70; // Base score (assume honest until red flags)

    // Red flags for unrealistic claims
    const redFlags = [
      'guaranteed',
      '100%',
      'no loss',
      'always win',
      'risk free',
      'double your money',
      'millionaire',
    ];

    for (const flag of redFlags) {
      if (descLower.includes(flag)) {
        score -= 20;
      }
    }

    // Green flags for realistic language
    const greenFlags = [
      'backtest',
      'drawdown',
      'risk management',
      'stop loss',
      'position sizing',
    ];

    for (const flag of greenFlags) {
      if (descLower.includes(flag)) {
        score += 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private async performSafetyCheck(candidate: BotCandidate): Promise<number> {
    let score = 80; // Base score

    // Source-based trust
    const trustedSources: BotSource[] = ['github', 'tradingview'];
    if (trustedSources.includes(candidate.source)) {
      score += 10;
    }

    // Code availability is a safety plus
    if (candidate.codeAvailable) {
      score += 10;
    } else {
      score -= 10;
    }

    // In production, would also:
    // 1. Scan for malicious patterns
    // 2. Check for known vulnerabilities
    // 3. Analyze network calls
    // 4. Check API key handling

    return Math.min(100, score);
  }

  /**
   * Get all candidates
   */
  public getCandidates(filter?: {
    status?: BotCandidate['status'];
    source?: BotSource;
    minRating?: number;
  }): BotCandidate[] {
    let results = Array.from(this.candidates.values());

    if (filter?.status) {
      results = results.filter((c) => c.status === filter.status);
    }
    if (filter?.source) {
      results = results.filter((c) => c.source === filter.source);
    }
    if (filter?.minRating !== undefined) {
      results = results.filter((c) => c.rating >= filter.minRating!);
    }

    return results.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get approved candidates ready for ingestion
   */
  public getApprovedCandidates(): BotCandidate[] {
    return this.getCandidates({ status: 'approved' });
  }

  /**
   * Mark a candidate as ingested
   */
  public markAsIngested(candidateId: string): void {
    const candidate = this.candidates.get(candidateId);
    if (candidate) {
      candidate.status = 'ingested';
      this.candidates.set(candidateId, candidate);
      this.emit('candidateIngested', { candidateId });
    }
  }

  /**
   * Force search all sources now
   */
  public async searchAllNow(): Promise<void> {
    logger.info('Force searching all sources...');

    for (const [name, source] of this.sources) {
      if (source.enabled) {
        await this.searchSource(source);
      }
    }
  }

  /**
   * Update search criteria
   */
  public updateSearchCriteria(criteria: Partial<SearchCriteria>): void {
    this.searchCriteria = { ...this.searchCriteria, ...criteria };
    logger.info('Search criteria updated');
  }

  /**
   * Enable or disable a source
   */
  public setSourceEnabled(sourceName: string, enabled: boolean): void {
    const source = this.sources.get(sourceName);
    if (source) {
      source.enabled = enabled;
      this.sources.set(sourceName, source);
      logger.info(`Source ${sourceName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

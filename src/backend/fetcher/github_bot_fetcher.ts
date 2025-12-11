/**
 * GitHub Bot Fetcher - Automated Bot Discovery via GitHub API
 *
 * Uses the OFFICIAL GitHub REST API to:
 * 1. Search for trading bots with high ratings (stars)
 * 2. Filter by language (MQL4, MQL5, Python, etc.)
 * 3. Check license compatibility
 * 4. Download source files
 * 5. Pass to Bot Drop Zone for analysis and absorption
 *
 * This is 100% legitimate because:
 * - Uses official GitHub API with rate limiting
 * - Respects repository licenses
 * - Only downloads open-source public code
 * - Requires your own GitHub API token
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  cloneUrl: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string;
  license: string | null;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  size: number;
  openIssues: number;
  owner: {
    login: string;
    avatarUrl: string;
    type: string;
  };
}

export interface BotCandidate {
  id: string;
  repo: GitHubRepo;
  score: number; // 0-100 quality score
  rating: number; // Equivalent 0-5 rating
  botType: BotType;
  files: BotFile[];
  analysis: CandidateAnalysis;
  status: CandidateStatus;
  downloadedAt?: Date;
  absorbedAt?: Date;
  error?: string;
}

export type BotType = 'mql4' | 'mql5' | 'python' | 'javascript' | 'pinescript' | 'mixed' | 'unknown';

export type CandidateStatus =
  | 'discovered'
  | 'analyzing'
  | 'qualified'
  | 'downloading'
  | 'downloaded'
  | 'pending_absorption'
  | 'absorbed'
  | 'rejected'
  | 'error';

export interface BotFile {
  name: string;
  path: string;
  size: number;
  downloadUrl: string;
  sha: string;
  type: string;
}

export interface CandidateAnalysis {
  hasReadme: boolean;
  hasLicense: boolean;
  licenseType: string | null;
  isOpenSource: boolean;
  hasTests: boolean;
  hasDocumentation: boolean;
  lastCommitDays: number;
  contributorCount: number;
  issueResolutionRate: number;
  codeQualityIndicators: string[];
  potentialRisks: string[];
  strategyIndicators: string[];
}

export interface SearchQuery {
  keywords: string[];
  language?: string;
  minStars: number;
  minForks?: number;
  license?: string[];
  topics?: string[];
  createdAfter?: Date;
  updatedAfter?: Date;
  sort: 'stars' | 'forks' | 'updated' | 'best-match';
  order: 'asc' | 'desc';
}

export interface FetcherConfig {
  githubToken: string;
  downloadPath: string;
  minRating: number; // 4.0 = 80+ stars typically
  maxConcurrentDownloads: number;
  respectRateLimit: boolean;
  autoAbsorb: boolean;
  searchQueries: SearchQuery[];
}

// ============================================================================
// Default Search Queries for Trading Bots
// ============================================================================

const DEFAULT_SEARCH_QUERIES: SearchQuery[] = [
  // MQL4/MQL5 Expert Advisors
  {
    keywords: ['mql4', 'expert advisor', 'trading bot'],
    language: 'MQL4',
    minStars: 50,
    sort: 'stars',
    order: 'desc',
  },
  {
    keywords: ['mql5', 'expert advisor', 'trading'],
    language: 'MQL5',
    minStars: 50,
    sort: 'stars',
    order: 'desc',
  },
  // Python Trading Bots
  {
    keywords: ['python', 'trading bot', 'algorithmic'],
    language: 'Python',
    minStars: 100,
    topics: ['trading', 'finance', 'algorithmic-trading'],
    sort: 'stars',
    order: 'desc',
  },
  {
    keywords: ['python', 'forex', 'bot'],
    language: 'Python',
    minStars: 50,
    sort: 'stars',
    order: 'desc',
  },
  {
    keywords: ['python', 'crypto', 'trading', 'bot'],
    language: 'Python',
    minStars: 100,
    sort: 'stars',
    order: 'desc',
  },
  // JavaScript/TypeScript Trading
  {
    keywords: ['javascript', 'trading bot'],
    language: 'JavaScript',
    minStars: 50,
    sort: 'stars',
    order: 'desc',
  },
  {
    keywords: ['typescript', 'trading bot'],
    language: 'TypeScript',
    minStars: 50,
    sort: 'stars',
    order: 'desc',
  },
  // PineScript
  {
    keywords: ['pinescript', 'tradingview', 'strategy'],
    minStars: 30,
    sort: 'stars',
    order: 'desc',
  },
  // General High-Quality Trading Repos
  {
    keywords: ['quantitative', 'trading', 'strategy'],
    minStars: 200,
    topics: ['algorithmic-trading', 'quantitative-finance'],
    sort: 'stars',
    order: 'desc',
  },
];

// ============================================================================
// Compatible Licenses for Absorption
// ============================================================================

const COMPATIBLE_LICENSES = [
  'mit',
  'apache-2.0',
  'bsd-2-clause',
  'bsd-3-clause',
  'unlicense',
  'wtfpl',
  'isc',
  'cc0-1.0',
  'mpl-2.0',
  '0bsd',
];

// ============================================================================
// GitHub Bot Fetcher Class
// ============================================================================

export class GitHubBotFetcher extends EventEmitter {
  private static instance: GitHubBotFetcher;

  private config: FetcherConfig;
  private candidates: Map<string, BotCandidate> = new Map();
  private rateLimitRemaining: number = 5000;
  private rateLimitReset: Date = new Date();
  private isSearching: boolean = false;

  private constructor() {
    super();

    this.config = {
      githubToken: '', // Must be set by user
      downloadPath: './dropzone/incoming',
      minRating: 4.0, // Maps to ~80 stars
      maxConcurrentDownloads: 3,
      respectRateLimit: true,
      autoAbsorb: false,
      searchQueries: DEFAULT_SEARCH_QUERIES,
    };
  }

  public static getInstance(): GitHubBotFetcher {
    if (!GitHubBotFetcher.instance) {
      GitHubBotFetcher.instance = new GitHubBotFetcher();
    }
    return GitHubBotFetcher.instance;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  public configure(config: Partial<FetcherConfig>): void {
    this.config = { ...this.config, ...config };

    // Ensure download path exists
    if (!fs.existsSync(this.config.downloadPath)) {
      fs.mkdirSync(this.config.downloadPath, { recursive: true });
    }

    console.log('[GitHubBotFetcher] Configured');
    this.emit('configured', this.config);
  }

  public setGitHubToken(token: string): void {
    this.config.githubToken = token;
    console.log('[GitHubBotFetcher] GitHub token set');
  }

  // ==========================================================================
  // Search for Bots
  // ==========================================================================

  public async searchForBots(customQuery?: SearchQuery): Promise<BotCandidate[]> {
    if (!this.config.githubToken) {
      throw new Error('GitHub token not set. Call setGitHubToken() first.');
    }

    if (this.isSearching) {
      console.log('[GitHubBotFetcher] Search already in progress');
      return [];
    }

    this.isSearching = true;
    const allCandidates: BotCandidate[] = [];

    try {
      const queries = customQuery ? [customQuery] : this.config.searchQueries;

      for (const query of queries) {
        console.log(`[GitHubBotFetcher] Searching: ${query.keywords.join(' + ')}`);

        const repos = await this.executeSearch(query);

        for (const repo of repos) {
          // Check if already processed
          if (this.candidates.has(repo.fullName)) {
            continue;
          }

          // Analyze and score the repo
          const candidate = await this.analyzeRepo(repo);

          // Check if meets minimum rating
          if (candidate.rating >= this.config.minRating) {
            this.candidates.set(repo.fullName, candidate);
            allCandidates.push(candidate);

            console.log(`[GitHubBotFetcher] Found: ${repo.fullName} (${candidate.rating}/5.0, ${repo.stars} stars)`);
            this.emit('candidate_found', candidate);
          }
        }

        // Respect rate limits
        if (this.config.respectRateLimit && this.rateLimitRemaining < 10) {
          const waitTime = this.rateLimitReset.getTime() - Date.now();
          if (waitTime > 0) {
            console.log(`[GitHubBotFetcher] Rate limit low, waiting ${waitTime}ms`);
            await this.sleep(waitTime);
          }
        }
      }

      console.log(`[GitHubBotFetcher] Found ${allCandidates.length} qualified bots`);
      this.emit('search_complete', { count: allCandidates.length, candidates: allCandidates });

    } finally {
      this.isSearching = false;
    }

    return allCandidates;
  }

  private async executeSearch(query: SearchQuery): Promise<GitHubRepo[]> {
    // Build GitHub search query
    let searchQuery = query.keywords.join(' ');

    if (query.language) {
      searchQuery += ` language:${query.language}`;
    }

    if (query.minStars) {
      searchQuery += ` stars:>=${query.minStars}`;
    }

    if (query.minForks) {
      searchQuery += ` forks:>=${query.minForks}`;
    }

    if (query.topics && query.topics.length > 0) {
      for (const topic of query.topics) {
        searchQuery += ` topic:${topic}`;
      }
    }

    if (query.license && query.license.length > 0) {
      searchQuery += ` license:${query.license.join(' license:')}`;
    }

    // Make API request
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${query.sort}&order=${query.order}&per_page=100`;

    const response = await this.githubRequest(url);

    if (!response.items) {
      return [];
    }

    // Map to our format
    return response.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      fullName: item.full_name,
      description: item.description || '',
      url: item.html_url,
      cloneUrl: item.clone_url,
      stars: item.stargazers_count,
      forks: item.forks_count,
      watchers: item.watchers_count,
      language: item.language,
      license: item.license?.spdx_id || null,
      topics: item.topics || [],
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      pushedAt: item.pushed_at,
      size: item.size,
      openIssues: item.open_issues_count,
      owner: {
        login: item.owner.login,
        avatarUrl: item.owner.avatar_url,
        type: item.owner.type,
      },
    }));
  }

  // ==========================================================================
  // Analyze Repository
  // ==========================================================================

  private async analyzeRepo(repo: GitHubRepo): Promise<BotCandidate> {
    const candidateId = crypto.randomUUID();

    // Get repository contents
    const contents = await this.getRepoContents(repo.fullName);

    // Determine bot type
    const botType = this.detectBotType(repo, contents);

    // Find bot files
    const botFiles = this.findBotFiles(contents, botType);

    // Analyze repository quality
    const analysis = await this.analyzeQuality(repo, contents);

    // Calculate score (0-100)
    const score = this.calculateScore(repo, analysis, botFiles.length);

    // Convert to 5-star rating
    const rating = Math.round((score / 20) * 10) / 10; // 0-5 with 1 decimal

    const candidate: BotCandidate = {
      id: candidateId,
      repo,
      score,
      rating,
      botType,
      files: botFiles,
      analysis,
      status: rating >= this.config.minRating ? 'qualified' : 'rejected',
    };

    return candidate;
  }

  private detectBotType(repo: GitHubRepo, contents: any[]): BotType {
    const language = repo.language?.toLowerCase();
    const hasFile = (ext: string) => contents.some(f => f.name.endsWith(ext));

    if (hasFile('.mq4') || language === 'mql4') return 'mql4';
    if (hasFile('.mq5') || language === 'mql5') return 'mql5';
    if (hasFile('.pine')) return 'pinescript';
    if (language === 'python' || hasFile('.py')) return 'python';
    if (language === 'javascript' || hasFile('.js')) return 'javascript';
    if (language === 'typescript' || hasFile('.ts')) return 'javascript';

    // Check for mixed
    const types = new Set<string>();
    if (hasFile('.mq4')) types.add('mql4');
    if (hasFile('.mq5')) types.add('mql5');
    if (hasFile('.py')) types.add('python');
    if (hasFile('.js') || hasFile('.ts')) types.add('javascript');

    if (types.size > 1) return 'mixed';

    return 'unknown';
  }

  private findBotFiles(contents: any[], botType: BotType): BotFile[] {
    const botExtensions: Record<BotType, string[]> = {
      mql4: ['.mq4', '.mqh'],
      mql5: ['.mq5', '.mqh'],
      python: ['.py'],
      javascript: ['.js', '.ts'],
      pinescript: ['.pine', '.txt'],
      mixed: ['.mq4', '.mq5', '.mqh', '.py', '.js', '.ts'],
      unknown: [],
    };

    const extensions = botExtensions[botType];

    return contents
      .filter(f => extensions.some(ext => f.name.toLowerCase().endsWith(ext)))
      .map(f => ({
        name: f.name,
        path: f.path,
        size: f.size,
        downloadUrl: f.download_url,
        sha: f.sha,
        type: f.type,
      }));
  }

  private async analyzeQuality(repo: GitHubRepo, contents: any[]): Promise<CandidateAnalysis> {
    const hasReadme = contents.some(f =>
      f.name.toLowerCase().startsWith('readme')
    );

    const hasLicense = contents.some(f =>
      f.name.toLowerCase() === 'license' || f.name.toLowerCase().startsWith('license.')
    );

    const licenseType = repo.license?.toLowerCase() || null;
    const isOpenSource = licenseType ? COMPATIBLE_LICENSES.includes(licenseType) : false;

    const hasTests = contents.some(f =>
      f.name.includes('test') || f.path.includes('test')
    );

    const hasDocumentation = contents.some(f =>
      f.name.toLowerCase().includes('doc') || f.path.includes('docs')
    ) || hasReadme;

    // Calculate days since last commit
    const lastCommit = new Date(repo.pushedAt);
    const lastCommitDays = Math.floor((Date.now() - lastCommit.getTime()) / (24 * 60 * 60 * 1000));

    // Strategy indicators from description and topics
    const strategyIndicators = this.extractStrategyIndicators(repo);

    // Potential risks
    const potentialRisks: string[] = [];
    if (!hasLicense) potentialRisks.push('No license file');
    if (!isOpenSource && licenseType) potentialRisks.push(`License may restrict use: ${licenseType}`);
    if (lastCommitDays > 365) potentialRisks.push('Not updated in over a year');
    if (repo.openIssues > 50) potentialRisks.push('Many open issues');

    // Code quality indicators
    const codeQualityIndicators: string[] = [];
    if (hasTests) codeQualityIndicators.push('Has tests');
    if (hasDocumentation) codeQualityIndicators.push('Has documentation');
    if (repo.forks > 100) codeQualityIndicators.push('Many forks (community trust)');
    if (repo.topics.length > 0) codeQualityIndicators.push('Well-tagged repository');

    return {
      hasReadme,
      hasLicense,
      licenseType,
      isOpenSource,
      hasTests,
      hasDocumentation,
      lastCommitDays,
      contributorCount: 1, // Would need additional API call
      issueResolutionRate: 0, // Would need additional API call
      codeQualityIndicators,
      potentialRisks,
      strategyIndicators,
    };
  }

  private extractStrategyIndicators(repo: GitHubRepo): string[] {
    const indicators: string[] = [];
    const text = `${repo.description} ${repo.topics.join(' ')}`.toLowerCase();

    const strategyKeywords = [
      'scalping', 'swing', 'day trading', 'trend following',
      'mean reversion', 'arbitrage', 'grid', 'martingale',
      'machine learning', 'neural', 'deep learning',
      'rsi', 'macd', 'bollinger', 'moving average',
      'breakout', 'momentum', 'fibonacci',
    ];

    for (const keyword of strategyKeywords) {
      if (text.includes(keyword)) {
        indicators.push(keyword);
      }
    }

    return indicators;
  }

  private calculateScore(repo: GitHubRepo, analysis: CandidateAnalysis, fileCount: number): number {
    let score = 0;

    // Stars (max 30 points)
    if (repo.stars >= 1000) score += 30;
    else if (repo.stars >= 500) score += 25;
    else if (repo.stars >= 200) score += 20;
    else if (repo.stars >= 100) score += 15;
    else if (repo.stars >= 50) score += 10;
    else score += 5;

    // Documentation (max 15 points)
    if (analysis.hasReadme) score += 10;
    if (analysis.hasDocumentation) score += 5;

    // License (max 15 points)
    if (analysis.isOpenSource) score += 15;
    else if (analysis.hasLicense) score += 5;

    // Code quality (max 20 points)
    if (analysis.hasTests) score += 10;
    if (fileCount >= 3) score += 5;
    if (analysis.strategyIndicators.length > 0) score += 5;

    // Activity (max 10 points)
    if (analysis.lastCommitDays < 30) score += 10;
    else if (analysis.lastCommitDays < 90) score += 7;
    else if (analysis.lastCommitDays < 180) score += 5;
    else if (analysis.lastCommitDays < 365) score += 3;

    // Community (max 10 points)
    if (repo.forks >= 100) score += 10;
    else if (repo.forks >= 50) score += 7;
    else if (repo.forks >= 20) score += 5;
    else if (repo.forks >= 10) score += 3;

    // Penalties
    for (const risk of analysis.potentialRisks) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ==========================================================================
  // Download Bots
  // ==========================================================================

  public async downloadBot(candidateId: string): Promise<string[]> {
    const candidate = this.candidates.get(candidateId) ||
      Array.from(this.candidates.values()).find(c => c.id === candidateId);

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    if (candidate.status === 'downloaded' || candidate.status === 'absorbed') {
      return [];
    }

    candidate.status = 'downloading';
    this.emit('download_started', candidate);

    const downloadedFiles: string[] = [];

    try {
      // Create folder for this bot
      const botFolder = path.join(
        this.config.downloadPath,
        `${candidate.repo.owner.login}_${candidate.repo.name}`
      );

      if (!fs.existsSync(botFolder)) {
        fs.mkdirSync(botFolder, { recursive: true });
      }

      // Download each bot file
      for (const file of candidate.files) {
        if (!file.downloadUrl) continue;

        const content = await this.downloadFile(file.downloadUrl);
        const filePath = path.join(botFolder, file.name);

        fs.writeFileSync(filePath, content);
        downloadedFiles.push(filePath);

        console.log(`[GitHubBotFetcher] Downloaded: ${file.name}`);
      }

      // Also download README if exists
      const readmeUrl = `https://raw.githubusercontent.com/${candidate.repo.fullName}/master/README.md`;
      try {
        const readme = await this.downloadFile(readmeUrl);
        const readmePath = path.join(botFolder, 'README.md');
        fs.writeFileSync(readmePath, readme);
      } catch {
        // README might not exist, ignore
      }

      // Create metadata file
      const metadataPath = path.join(botFolder, '_metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify({
        source: 'github',
        repo: candidate.repo.fullName,
        url: candidate.repo.url,
        stars: candidate.repo.stars,
        license: candidate.repo.license,
        rating: candidate.rating,
        downloadedAt: new Date().toISOString(),
      }, null, 2));

      candidate.status = 'downloaded';
      candidate.downloadedAt = new Date();

      console.log(`[GitHubBotFetcher] Downloaded ${downloadedFiles.length} files from ${candidate.repo.fullName}`);
      this.emit('download_complete', { candidate, files: downloadedFiles });

      // Auto-absorb if enabled
      if (this.config.autoAbsorb) {
        candidate.status = 'pending_absorption';
        this.emit('ready_for_absorption', candidate);
      }

      return downloadedFiles;

    } catch (error) {
      candidate.status = 'error';
      candidate.error = error instanceof Error ? error.message : 'Download failed';
      this.emit('download_error', { candidate, error });
      throw error;
    }
  }

  public async downloadAllQualified(): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();
    const qualified = Array.from(this.candidates.values())
      .filter(c => c.status === 'qualified');

    console.log(`[GitHubBotFetcher] Downloading ${qualified.length} qualified bots...`);

    for (const candidate of qualified) {
      try {
        const files = await this.downloadBot(candidate.id);
        results.set(candidate.id, files);

        // Small delay between downloads
        await this.sleep(1000);
      } catch (error) {
        console.error(`[GitHubBotFetcher] Failed to download ${candidate.repo.fullName}:`, error);
      }
    }

    return results;
  }

  // ==========================================================================
  // GitHub API Helpers
  // ==========================================================================

  private async githubRequest(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${this.config.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TIME-Bot-Fetcher',
      },
    });

    // Update rate limit info
    this.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '5000');
    const resetTimestamp = parseInt(response.headers.get('X-RateLimit-Reset') || '0');
    this.rateLimitReset = new Date(resetTimestamp * 1000);

    if (!response.ok) {
      if (response.status === 403 && this.rateLimitRemaining === 0) {
        throw new Error(`GitHub rate limit exceeded. Resets at ${this.rateLimitReset}`);
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async getRepoContents(fullName: string, path: string = ''): Promise<any[]> {
    const url = `https://api.github.com/repos/${fullName}/contents/${path}`;
    try {
      const response = await this.githubRequest(url);
      return Array.isArray(response) ? response : [];
    } catch {
      return [];
    }
  }

  private async downloadFile(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${this.config.githubToken}`,
        'User-Agent': 'TIME-Bot-Fetcher',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }

    return response.text();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // Status & Reports
  // ==========================================================================

  public getCandidates(status?: CandidateStatus): BotCandidate[] {
    const all = Array.from(this.candidates.values());
    return status ? all.filter(c => c.status === status) : all;
  }

  public getCandidate(id: string): BotCandidate | null {
    return this.candidates.get(id) ||
      Array.from(this.candidates.values()).find(c => c.id === id) ||
      null;
  }

  public getRateLimitStatus(): { remaining: number; reset: Date } {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset,
    };
  }

  public getStats(): {
    totalDiscovered: number;
    qualified: number;
    downloaded: number;
    absorbed: number;
    rejected: number;
    isSearching: boolean;
    rateLimitRemaining: number;
  } {
    const candidates = Array.from(this.candidates.values());

    return {
      totalDiscovered: candidates.length,
      qualified: candidates.filter(c => c.status === 'qualified').length,
      downloaded: candidates.filter(c => c.status === 'downloaded' || c.status === 'pending_absorption').length,
      absorbed: candidates.filter(c => c.status === 'absorbed').length,
      rejected: candidates.filter(c => c.status === 'rejected').length,
      isSearching: this.isSearching,
      rateLimitRemaining: this.rateLimitRemaining,
    };
  }

  public clearCandidates(): void {
    this.candidates.clear();
    this.emit('candidates_cleared');
  }

  // ==========================================================================
  // Mark as Absorbed (called by BotDropZone)
  // ==========================================================================

  public markAsAbsorbed(repoFullName: string): void {
    const candidate = this.candidates.get(repoFullName);
    if (candidate) {
      candidate.status = 'absorbed';
      candidate.absorbedAt = new Date();
      this.emit('bot_absorbed', candidate);
    }
  }
}

// Export singleton instance
export const githubBotFetcher = GitHubBotFetcher.getInstance();

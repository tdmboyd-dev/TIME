/**
 * Bot Drop Zone - File-based Bot Absorption System
 *
 * Drop bot files into the designated folder and TIME will:
 * 1. Detect new files automatically
 * 2. Scan for safety (malware, suspicious code)
 * 3. Parse and analyze the bot strategy
 * 4. Fingerprint the bot
 * 5. Rate the bot quality
 * 6. Absorb if quality >= 4.0/5.0
 * 7. Generate absorption report
 *
 * Supported formats: .mq4, .mq5, .py, .js, .ts, .ex4, .ex5, .pine, .json
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type BotFileType = 'mq4' | 'mq5' | 'python' | 'javascript' | 'typescript' | 'pinescript' | 'json' | 'compiled' | 'unknown';

export interface DroppedFile {
  id: string;
  filename: string;
  filepath: string;
  fileType: BotFileType;
  size: number;
  hash: string;
  droppedAt: Date;
  status: 'pending' | 'scanning' | 'analyzing' | 'rating' | 'absorbing' | 'complete' | 'rejected' | 'error';
  error?: string;
}

export interface SafetyScanResult {
  safe: boolean;
  score: number; // 0-100
  threats: SecurityThreat[];
  warnings: string[];
  scannedAt: Date;
}

export interface SecurityThreat {
  type: 'malware' | 'suspicious_code' | 'obfuscation' | 'network_call' | 'file_access' | 'credential_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
}

export interface BotAnalysis {
  strategyType: string;
  indicators: string[];
  timeframes: string[];
  assets: string[];
  entryLogic: string;
  exitLogic: string;
  riskManagement: {
    hasStopLoss: boolean;
    hasTakeProfit: boolean;
    hasPositionSizing: boolean;
    maxDrawdownProtection: boolean;
  };
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  estimatedWinRate?: number;
  codeQuality: number; // 0-100
}

export interface BotRating {
  overall: number; // 0-5
  breakdown: {
    codeQuality: number;
    strategyClarity: number;
    riskManagement: number;
    documentation: number;
    uniqueness: number;
  };
  recommendation: 'absorb' | 'review' | 'reject';
  reasoning: string;
}

export interface AbsorptionReport {
  fileId: string;
  filename: string;
  safetyScan: SafetyScanResult;
  analysis: BotAnalysis;
  rating: BotRating;
  absorbed: boolean;
  botId?: string;
  fingerprint?: string;
  learningsExtracted: string[];
  absorbedAt?: Date;
}

export interface DropZoneConfig {
  watchFolder: string;
  processedFolder: string;
  rejectedFolder: string;
  reportsFolder: string;
  minRating: number; // Minimum rating to absorb (default 4.0)
  autoAbsorb: boolean;
  scanInterval: number; // ms
  maxFileSize: number; // bytes
}

// ============================================================================
// Dangerous Patterns for Safety Scanning
// ============================================================================

const DANGEROUS_PATTERNS = {
  // Network calls that could exfiltrate data
  network: [
    /fetch\s*\(/gi,
    /XMLHttpRequest/gi,
    /WebRequest/gi,
    /InternetOpen/gi,
    /curl_exec/gi,
    /urllib/gi,
    /requests\.(get|post|put|delete)/gi,
    /socket\./gi,
    /SendFTP/gi,
  ],

  // File system access
  fileAccess: [
    /FileDelete/gi,
    /FileWrite/gi,
    /os\.(remove|unlink|rmdir)/gi,
    /shutil\.rmtree/gi,
    /fs\.(unlink|rmdir|writeFile)/gi,
    /Registry/gi,
  ],

  // Credential/sensitive data access
  credentials: [
    /password/gi,
    /credential/gi,
    /AccountInfoString/gi,
    /GetPrivateProfileString/gi,
    /keyring/gi,
    /wallet.*private/gi,
  ],

  // Code obfuscation
  obfuscation: [
    /eval\s*\(/gi,
    /exec\s*\(/gi,
    /compile\s*\(/gi,
    /\\x[0-9a-f]{2}/gi,
    /fromCharCode/gi,
    /atob\s*\(/gi,
    /base64.*decode/gi,
  ],

  // System commands
  systemCommands: [
    /Shell\s*\(/gi,
    /system\s*\(/gi,
    /subprocess/gi,
    /child_process/gi,
    /WinExec/gi,
    /CreateProcess/gi,
  ],
};

// ============================================================================
// Strategy Detection Patterns
// ============================================================================

const STRATEGY_PATTERNS = {
  indicators: {
    'Moving Average': [/\b(SMA|EMA|WMA|DEMA|TEMA|iMA)\b/gi, /MovingAverage/gi],
    'RSI': [/\bRSI\b/gi, /iRSI/gi, /RelativeStrength/gi],
    'MACD': [/\bMACD\b/gi, /iMACD/gi],
    'Bollinger Bands': [/Bollinger/gi, /iBands/gi, /\bBB\b/g],
    'Stochastic': [/Stochastic/gi, /iStochastic/gi],
    'ATR': [/\bATR\b/gi, /iATR/gi, /AverageTrueRange/gi],
    'ADX': [/\bADX\b/gi, /iADX/gi],
    'Ichimoku': [/Ichimoku/gi, /iIchimoku/gi],
    'Fibonacci': [/Fibonacci/gi, /Fibo/gi],
    'Volume': [/Volume/gi, /iVolume/gi, /OBV/gi],
    'Pivot Points': [/Pivot/gi, /Support.*Resistance/gi],
    'CCI': [/\bCCI\b/gi, /CommodityChannel/gi],
    'Williams %R': [/Williams/gi, /iWPR/gi],
    'Parabolic SAR': [/Parabolic/gi, /iSAR/gi],
  },

  strategyTypes: {
    'Trend Following': [/trend/gi, /breakout/gi, /momentum/gi],
    'Mean Reversion': [/reversion/gi, /oversold/gi, /overbought/gi, /bounce/gi],
    'Scalping': [/scalp/gi, /quick.*profit/gi, /small.*move/gi],
    'Grid Trading': [/grid/gi, /martingale/gi, /averaging/gi],
    'Arbitrage': [/arbitrage/gi, /spread.*trading/gi],
    'News Trading': [/news/gi, /event.*driven/gi, /economic.*calendar/gi],
    'Pattern Recognition': [/pattern/gi, /candlestick/gi, /formation/gi],
    'Machine Learning': [/neural/gi, /ml\b/gi, /tensorflow/gi, /sklearn/gi],
  },

  timeframes: {
    'M1': [/\bM1\b/g, /PERIOD_M1/g, /1.*minute/gi],
    'M5': [/\bM5\b/g, /PERIOD_M5/g, /5.*minute/gi],
    'M15': [/\bM15\b/g, /PERIOD_M15/g, /15.*minute/gi],
    'M30': [/\bM30\b/g, /PERIOD_M30/g, /30.*minute/gi],
    'H1': [/\bH1\b/g, /PERIOD_H1/g, /1.*hour/gi, /hourly/gi],
    'H4': [/\bH4\b/g, /PERIOD_H4/g, /4.*hour/gi],
    'D1': [/\bD1\b/g, /PERIOD_D1/g, /daily/gi],
    'W1': [/\bW1\b/g, /PERIOD_W1/g, /weekly/gi],
  },
};

// ============================================================================
// Bot Drop Zone Class
// ============================================================================

export class BotDropZone extends EventEmitter {
  private static instance: BotDropZone;

  private config: DropZoneConfig;
  private watchInterval: NodeJS.Timeout | null = null;
  private processingQueue: Map<string, DroppedFile> = new Map();
  private processedFiles: Map<string, AbsorptionReport> = new Map();
  private isProcessing: boolean = false;

  private constructor() {
    super();

    this.config = {
      watchFolder: './dropzone/incoming',
      processedFolder: './dropzone/processed',
      rejectedFolder: './dropzone/rejected',
      reportsFolder: './dropzone/reports',
      minRating: 4.0,
      autoAbsorb: false, // Require manual approval by default
      scanInterval: 5000, // Check every 5 seconds
      maxFileSize: 10 * 1024 * 1024, // 10MB max
    };
  }

  public static getInstance(): BotDropZone {
    if (!BotDropZone.instance) {
      BotDropZone.instance = new BotDropZone();
    }
    return BotDropZone.instance;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  public async initialize(config?: Partial<DropZoneConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Create folders if they don't exist
    await this.ensureFolders();

    console.log('[BotDropZone] Initialized');
    console.log(`[BotDropZone] Watch folder: ${this.config.watchFolder}`);
    console.log(`[BotDropZone] Min rating for absorption: ${this.config.minRating}/5.0`);

    this.emit('initialized', this.config);
  }

  private async ensureFolders(): Promise<void> {
    const folders = [
      this.config.watchFolder,
      this.config.processedFolder,
      this.config.rejectedFolder,
      this.config.reportsFolder,
    ];

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
    }
  }

  // ==========================================================================
  // File Watching
  // ==========================================================================

  public startWatching(): void {
    if (this.watchInterval) {
      return;
    }

    console.log('[BotDropZone] Started watching for new bot files...');

    this.watchInterval = setInterval(() => {
      this.scanForNewFiles();
    }, this.config.scanInterval);

    // Initial scan
    this.scanForNewFiles();

    this.emit('watching_started');
  }

  public stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      console.log('[BotDropZone] Stopped watching');
      this.emit('watching_stopped');
    }
  }

  private async scanForNewFiles(): Promise<void> {
    if (!fs.existsSync(this.config.watchFolder)) {
      return;
    }

    const files = fs.readdirSync(this.config.watchFolder);

    for (const filename of files) {
      const filepath = path.join(this.config.watchFolder, filename);
      const stats = fs.statSync(filepath);

      // Skip directories
      if (stats.isDirectory()) continue;

      // Skip if already processing
      const hash = this.getFileHash(filepath);
      if (this.processingQueue.has(hash) || this.processedFiles.has(hash)) {
        continue;
      }

      // Check file size
      if (stats.size > this.config.maxFileSize) {
        console.log(`[BotDropZone] File too large: ${filename}`);
        continue;
      }

      // Create dropped file entry
      const droppedFile: DroppedFile = {
        id: crypto.randomUUID(),
        filename,
        filepath,
        fileType: this.detectFileType(filename),
        size: stats.size,
        hash,
        droppedAt: new Date(),
        status: 'pending',
      };

      this.processingQueue.set(hash, droppedFile);
      console.log(`[BotDropZone] New file detected: ${filename}`);
      this.emit('file_detected', droppedFile);

      // Process the file
      this.processFile(droppedFile);
    }
  }

  // ==========================================================================
  // File Processing Pipeline
  // ==========================================================================

  private async processFile(file: DroppedFile): Promise<void> {
    try {
      // Step 1: Safety Scan
      file.status = 'scanning';
      this.emit('status_changed', file);

      const safetyScan = await this.performSafetyScan(file);

      if (!safetyScan.safe) {
        file.status = 'rejected';
        file.error = `Failed safety scan: ${safetyScan.threats.map(t => t.description).join(', ')}`;
        await this.rejectFile(file, safetyScan);
        return;
      }

      // Step 2: Analyze Bot
      file.status = 'analyzing';
      this.emit('status_changed', file);

      const analysis = await this.analyzeBot(file);

      // Step 3: Rate Bot
      file.status = 'rating';
      this.emit('status_changed', file);

      const rating = await this.rateBot(file, analysis, safetyScan);

      // Step 4: Decide on Absorption
      if (rating.overall >= this.config.minRating) {
        if (this.config.autoAbsorb) {
          file.status = 'absorbing';
          this.emit('status_changed', file);

          const report = await this.absorbBot(file, safetyScan, analysis, rating);
          await this.completeProcessing(file, report);
        } else {
          // Queue for manual approval
          const report: AbsorptionReport = {
            fileId: file.id,
            filename: file.filename,
            safetyScan,
            analysis,
            rating,
            absorbed: false,
            learningsExtracted: this.extractLearnings(analysis),
          };

          this.emit('approval_required', { file, report });
          console.log(`[BotDropZone] ${file.filename} rated ${rating.overall}/5.0 - awaiting approval`);
        }
      } else {
        file.status = 'rejected';
        file.error = `Rating too low: ${rating.overall}/5.0 (min: ${this.config.minRating})`;

        const report: AbsorptionReport = {
          fileId: file.id,
          filename: file.filename,
          safetyScan,
          analysis,
          rating,
          absorbed: false,
          learningsExtracted: [],
        };

        await this.rejectFile(file, report);
      }

    } catch (error) {
      file.status = 'error';
      file.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('processing_error', { file, error });
    }
  }

  // ==========================================================================
  // Safety Scanning
  // ==========================================================================

  private async performSafetyScan(file: DroppedFile): Promise<SafetyScanResult> {
    const content = fs.readFileSync(file.filepath, 'utf-8');
    const threats: SecurityThreat[] = [];
    const warnings: string[] = [];

    // Skip binary files
    if (file.fileType === 'compiled') {
      warnings.push('Compiled file - cannot perform deep code analysis');
      return {
        safe: true, // Allow but warn
        score: 70,
        threats: [],
        warnings,
        scannedAt: new Date(),
      };
    }

    // Check for dangerous patterns
    for (const [category, patterns] of Object.entries(DANGEROUS_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          const severity = this.getThreatSeverity(category);
          threats.push({
            type: this.mapCategoryToThreatType(category),
            severity,
            description: `Found ${category} pattern: ${matches[0]}`,
            location: this.findPatternLocation(content, pattern),
          });
        }
      }
    }

    // Calculate safety score
    let score = 100;
    for (const threat of threats) {
      switch (threat.severity) {
        case 'critical': score -= 40; break;
        case 'high': score -= 25; break;
        case 'medium': score -= 15; break;
        case 'low': score -= 5; break;
      }
    }

    score = Math.max(0, score);

    // Determine if safe (no critical/high threats, score >= 50)
    const hasCriticalThreat = threats.some(t => t.severity === 'critical' || t.severity === 'high');
    const safe = !hasCriticalThreat && score >= 50;

    return {
      safe,
      score,
      threats,
      warnings,
      scannedAt: new Date(),
    };
  }

  private getThreatSeverity(category: string): SecurityThreat['severity'] {
    switch (category) {
      case 'systemCommands':
      case 'credentials':
        return 'critical';
      case 'network':
      case 'fileAccess':
        return 'high';
      case 'obfuscation':
        return 'medium';
      default:
        return 'low';
    }
  }

  private mapCategoryToThreatType(category: string): SecurityThreat['type'] {
    const mapping: Record<string, SecurityThreat['type']> = {
      network: 'network_call',
      fileAccess: 'file_access',
      credentials: 'credential_access',
      obfuscation: 'obfuscation',
      systemCommands: 'suspicious_code',
    };
    return mapping[category] || 'suspicious_code';
  }

  private findPatternLocation(content: string, pattern: RegExp): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return `Line ${i + 1}`;
      }
    }
    return 'Unknown';
  }

  // ==========================================================================
  // Bot Analysis
  // ==========================================================================

  private async analyzeBot(file: DroppedFile): Promise<BotAnalysis> {
    const content = fs.readFileSync(file.filepath, 'utf-8');

    // Detect indicators
    const indicators: string[] = [];
    for (const [indicator, patterns] of Object.entries(STRATEGY_PATTERNS.indicators)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          indicators.push(indicator);
          break;
        }
      }
    }

    // Detect strategy type
    let strategyType = 'Unknown';
    for (const [type, patterns] of Object.entries(STRATEGY_PATTERNS.strategyTypes)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          strategyType = type;
          break;
        }
      }
      if (strategyType !== 'Unknown') break;
    }

    // Detect timeframes
    const timeframes: string[] = [];
    for (const [tf, patterns] of Object.entries(STRATEGY_PATTERNS.timeframes)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          timeframes.push(tf);
          break;
        }
      }
    }

    // Detect assets
    const assets = this.detectAssets(content);

    // Analyze risk management
    const riskManagement = {
      hasStopLoss: /stop.?loss|SL\s*=|OrderSend.*sl/gi.test(content),
      hasTakeProfit: /take.?profit|TP\s*=|OrderSend.*tp/gi.test(content),
      hasPositionSizing: /lot.?size|position.?size|risk.?percent/gi.test(content),
      maxDrawdownProtection: /max.?drawdown|drawdown.?limit/gi.test(content),
    };

    // Determine complexity
    const complexity = this.determineComplexity(content, indicators.length);

    // Estimate code quality
    const codeQuality = this.estimateCodeQuality(content);

    // Extract entry/exit logic descriptions
    const entryLogic = this.extractLogicDescription(content, 'entry');
    const exitLogic = this.extractLogicDescription(content, 'exit');

    return {
      strategyType,
      indicators,
      timeframes: timeframes.length > 0 ? timeframes : ['Unknown'],
      assets,
      entryLogic,
      exitLogic,
      riskManagement,
      complexity,
      codeQuality,
    };
  }

  private detectAssets(content: string): string[] {
    const assets: string[] = [];

    // Forex pairs
    const forexPattern = /\b(EUR|USD|GBP|JPY|CHF|AUD|NZD|CAD)(EUR|USD|GBP|JPY|CHF|AUD|NZD|CAD)\b/g;
    const forexMatches = content.match(forexPattern);
    if (forexMatches) {
      assets.push(...new Set(forexMatches));
    }

    // Crypto
    const cryptoPattern = /\b(BTC|ETH|XRP|LTC|BCH|ADA|DOT|LINK|BNB)(USD|USDT|EUR|BTC)?\b/gi;
    const cryptoMatches = content.match(cryptoPattern);
    if (cryptoMatches) {
      assets.push(...new Set(cryptoMatches.map(m => m.toUpperCase())));
    }

    // Stocks
    const stockPattern = /Symbol\s*=\s*["']([A-Z]{1,5})["']/g;
    let stockMatch;
    while ((stockMatch = stockPattern.exec(content)) !== null) {
      assets.push(stockMatch[1]);
    }

    return assets.length > 0 ? [...new Set(assets)] : ['Multi-Asset'];
  }

  private determineComplexity(content: string, indicatorCount: number): BotAnalysis['complexity'] {
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+|def\s+\w+|void\s+\w+/g) || []).length;

    if (lines > 1000 || indicatorCount > 5 || functions > 20) return 'advanced';
    if (lines > 500 || indicatorCount > 3 || functions > 10) return 'complex';
    if (lines > 200 || indicatorCount > 1 || functions > 5) return 'moderate';
    return 'simple';
  }

  private estimateCodeQuality(content: string): number {
    let score = 50; // Base score

    // Good practices
    if (/\/\/|\/\*|\*\/|#.*comment|"""/.test(content)) score += 10; // Has comments
    if (/function|def |void /.test(content)) score += 10; // Has functions
    if (/try\s*{|try:|except|catch/.test(content)) score += 10; // Has error handling
    if (/const |let |var |input |extern /.test(content)) score += 5; // Variable declarations
    if (/return /.test(content)) score += 5; // Has return statements

    // Bad practices
    if (/goto /.test(content)) score -= 20; // Uses goto
    if (content.split('\n').some(line => line.length > 200)) score -= 10; // Very long lines
    if (!/\n\s*\n/.test(content)) score -= 10; // No blank lines (poor formatting)

    return Math.min(100, Math.max(0, score));
  }

  private extractLogicDescription(content: string, type: 'entry' | 'exit'): string {
    const patterns = type === 'entry'
      ? [/entry|buy.*signal|sell.*signal|open.*position|OrderSend/gi]
      : [/exit|close.*position|OrderClose|take.*profit|stop.*loss/gi];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return `${type === 'entry' ? 'Entry' : 'Exit'} logic detected`;
      }
    }

    return `No clear ${type} logic found`;
  }

  // ==========================================================================
  // Bot Rating
  // ==========================================================================

  private async rateBot(file: DroppedFile, analysis: BotAnalysis, safetyScan: SafetyScanResult): Promise<BotRating> {
    const breakdown = {
      codeQuality: analysis.codeQuality / 20, // Convert 0-100 to 0-5
      strategyClarity: this.rateStrategyClarity(analysis),
      riskManagement: this.rateRiskManagement(analysis.riskManagement),
      documentation: this.rateDocumentation(file),
      uniqueness: this.rateUniqueness(analysis),
    };

    // Calculate overall (weighted average)
    const weights = {
      codeQuality: 0.2,
      strategyClarity: 0.25,
      riskManagement: 0.3,
      documentation: 0.1,
      uniqueness: 0.15,
    };

    let overall = 0;
    for (const [key, weight] of Object.entries(weights)) {
      overall += breakdown[key as keyof typeof breakdown] * weight;
    }

    // Apply safety penalty
    if (safetyScan.score < 100) {
      overall *= (safetyScan.score / 100);
    }

    overall = Math.round(overall * 10) / 10; // Round to 1 decimal

    // Determine recommendation
    let recommendation: BotRating['recommendation'];
    let reasoning: string;

    if (overall >= 4.0) {
      recommendation = 'absorb';
      reasoning = `High quality bot with ${analysis.strategyType} strategy. Strong ${this.getTopStrength(breakdown)}.`;
    } else if (overall >= 3.0) {
      recommendation = 'review';
      reasoning = `Moderate quality. Consider manual review. Weakness in ${this.getTopWeakness(breakdown)}.`;
    } else {
      recommendation = 'reject';
      reasoning = `Quality below threshold. Issues with ${this.getTopWeakness(breakdown)}.`;
    }

    return { overall, breakdown, recommendation, reasoning };
  }

  private rateStrategyClarity(analysis: BotAnalysis): number {
    let score = 2.5; // Base

    if (analysis.strategyType !== 'Unknown') score += 1;
    if (analysis.indicators.length > 0) score += 0.5;
    if (analysis.indicators.length > 2) score += 0.5;
    if (analysis.entryLogic !== 'No clear entry logic found') score += 0.25;
    if (analysis.exitLogic !== 'No clear exit logic found') score += 0.25;

    return Math.min(5, score);
  }

  private rateRiskManagement(rm: BotAnalysis['riskManagement']): number {
    let score = 0;

    if (rm.hasStopLoss) score += 1.5;
    if (rm.hasTakeProfit) score += 1;
    if (rm.hasPositionSizing) score += 1.5;
    if (rm.maxDrawdownProtection) score += 1;

    return Math.min(5, score);
  }

  private rateDocumentation(file: DroppedFile): number {
    const content = fs.readFileSync(file.filepath, 'utf-8');
    let score = 1; // Base

    // Check for comments ratio
    const lines = content.split('\n');
    const commentLines = lines.filter(l => /^\s*(\/\/|#|\/\*|\*|""")/.test(l)).length;
    const commentRatio = commentLines / lines.length;

    if (commentRatio > 0.1) score += 1;
    if (commentRatio > 0.2) score += 1;

    // Check for header/description
    if (/description|author|version|copyright/gi.test(content)) score += 1;

    // Check for parameter descriptions
    if (/input\s+\w+.*\/\/|#\s*param/gi.test(content)) score += 1;

    return Math.min(5, score);
  }

  private rateUniqueness(analysis: BotAnalysis): number {
    // This would ideally compare against existing bots in the library
    // For now, use complexity and indicator diversity as proxy

    let score = 2.5;

    if (analysis.complexity === 'advanced') score += 1;
    if (analysis.complexity === 'complex') score += 0.5;
    if (analysis.indicators.length > 3) score += 0.5;
    if (analysis.timeframes.length > 2) score += 0.5;

    return Math.min(5, score);
  }

  private getTopStrength(breakdown: BotRating['breakdown']): string {
    const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    return sorted[0][0].replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  }

  private getTopWeakness(breakdown: BotRating['breakdown']): string {
    const sorted = Object.entries(breakdown).sort((a, b) => a[1] - b[1]);
    return sorted[0][0].replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  }

  // ==========================================================================
  // Absorption
  // ==========================================================================

  private async absorbBot(
    file: DroppedFile,
    safetyScan: SafetyScanResult,
    analysis: BotAnalysis,
    rating: BotRating
  ): Promise<AbsorptionReport> {
    const botId = crypto.randomUUID();
    const fingerprint = this.generateFingerprint(file, analysis);
    const learningsExtracted = this.extractLearnings(analysis);

    // Move file to processed folder
    const newPath = path.join(this.config.processedFolder, file.filename);
    fs.renameSync(file.filepath, newPath);

    const report: AbsorptionReport = {
      fileId: file.id,
      filename: file.filename,
      safetyScan,
      analysis,
      rating,
      absorbed: true,
      botId,
      fingerprint,
      learningsExtracted,
      absorbedAt: new Date(),
    };

    // Save report
    await this.saveReport(report);

    // Emit absorption event for other TIME components
    this.emit('bot_absorbed', {
      botId,
      fingerprint,
      analysis,
      rating,
      learnings: learningsExtracted,
    });

    console.log(`[BotDropZone] Absorbed bot: ${file.filename} (ID: ${botId})`);

    return report;
  }

  private extractLearnings(analysis: BotAnalysis): string[] {
    const learnings: string[] = [];

    if (analysis.strategyType !== 'Unknown') {
      learnings.push(`Strategy: ${analysis.strategyType}`);
    }

    if (analysis.indicators.length > 0) {
      learnings.push(`Indicators: ${analysis.indicators.join(', ')}`);
    }

    if (analysis.riskManagement.hasStopLoss && analysis.riskManagement.hasTakeProfit) {
      learnings.push('Risk Management: SL/TP implementation pattern');
    }

    if (analysis.riskManagement.hasPositionSizing) {
      learnings.push('Position Sizing: Dynamic lot calculation');
    }

    return learnings;
  }

  private generateFingerprint(file: DroppedFile, analysis: BotAnalysis): string {
    const data = JSON.stringify({
      fileHash: file.hash,
      strategyType: analysis.strategyType,
      indicators: analysis.indicators.sort(),
      complexity: analysis.complexity,
    });

    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  // ==========================================================================
  // File Management
  // ==========================================================================

  private async rejectFile(file: DroppedFile, report: SafetyScanResult | AbsorptionReport): Promise<void> {
    // Move to rejected folder
    const newPath = path.join(this.config.rejectedFolder, file.filename);

    if (fs.existsSync(file.filepath)) {
      fs.renameSync(file.filepath, newPath);
    }

    // Save rejection report
    const reportPath = path.join(
      this.config.reportsFolder,
      `rejected_${file.id}.json`
    );

    fs.writeFileSync(reportPath, JSON.stringify({
      file,
      report,
      rejectedAt: new Date(),
    }, null, 2));

    this.processingQueue.delete(file.hash);

    console.log(`[BotDropZone] Rejected: ${file.filename} - ${file.error}`);
    this.emit('file_rejected', { file, report });
  }

  private async completeProcessing(file: DroppedFile, report: AbsorptionReport): Promise<void> {
    file.status = 'complete';
    this.processingQueue.delete(file.hash);
    this.processedFiles.set(file.hash, report);

    this.emit('processing_complete', { file, report });
  }

  private async saveReport(report: AbsorptionReport): Promise<void> {
    const reportPath = path.join(
      this.config.reportsFolder,
      `absorbed_${report.botId}.json`
    );

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  // ==========================================================================
  // Manual Approval
  // ==========================================================================

  public async approveAbsorption(fileId: string): Promise<AbsorptionReport | null> {
    // Find pending file
    for (const [hash, file] of this.processingQueue.entries()) {
      if (file.id === fileId && file.status !== 'rejected' && file.status !== 'complete') {
        // Re-process with absorption
        const content = fs.readFileSync(file.filepath, 'utf-8');
        const safetyScan = await this.performSafetyScan(file);
        const analysis = await this.analyzeBot(file);
        const rating = await this.rateBot(file, analysis, safetyScan);

        file.status = 'absorbing';
        const report = await this.absorbBot(file, safetyScan, analysis, rating);
        await this.completeProcessing(file, report);

        return report;
      }
    }

    return null;
  }

  public async rejectAbsorption(fileId: string, reason: string): Promise<void> {
    for (const [hash, file] of this.processingQueue.entries()) {
      if (file.id === fileId) {
        file.status = 'rejected';
        file.error = reason;
        await this.rejectFile(file, {} as any);
        break;
      }
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private getFileHash(filepath: string): string {
    const content = fs.readFileSync(filepath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private detectFileType(filename: string): BotFileType {
    const ext = path.extname(filename).toLowerCase();

    switch (ext) {
      case '.mq4': return 'mq4';
      case '.mq5': return 'mq5';
      case '.py': return 'python';
      case '.js': return 'javascript';
      case '.ts': return 'typescript';
      case '.pine': return 'pinescript';
      case '.json': return 'json';
      case '.ex4':
      case '.ex5':
        return 'compiled';
      default:
        return 'unknown';
    }
  }

  // ==========================================================================
  // Status & Reports
  // ==========================================================================

  public getStatus(): {
    watching: boolean;
    pendingCount: number;
    processedCount: number;
    config: DropZoneConfig;
  } {
    return {
      watching: this.watchInterval !== null,
      pendingCount: this.processingQueue.size,
      processedCount: this.processedFiles.size,
      config: this.config,
    };
  }

  public getPendingFiles(): DroppedFile[] {
    return Array.from(this.processingQueue.values());
  }

  public getProcessedReports(): AbsorptionReport[] {
    return Array.from(this.processedFiles.values());
  }

  public getReport(botId: string): AbsorptionReport | null {
    const reportPath = path.join(this.config.reportsFolder, `absorbed_${botId}.json`);

    if (fs.existsSync(reportPath)) {
      return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    }

    return null;
  }
}

// Export singleton instance
export const botDropZone = BotDropZone.getInstance();

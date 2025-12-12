/**
 * TIME Research & Annotation Engine
 *
 * THE MARKET TIME MACHINE
 *
 * Annotates charts, marks regime shifts, marks bot events, marks economic events,
 * generates symbol summaries, and replays historical days.
 *
 * Features:
 * - Chart annotation system
 * - Regime shift marking
 * - Bot event logging
 * - Economic event calendar
 * - Symbol research summaries
 * - Historical day replay (Market Time Machine)
 * - Trade journal automation
 * - Pattern recognition storage
 * - Narrated playback (via Teaching Engine)
 * - Research collaboration
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('ResearchAnnotationEngine');

// =============================================================================
// TYPES
// =============================================================================

export type AnnotationType =
  | 'support'              // Support level
  | 'resistance'           // Resistance level
  | 'trendline'            // Trendline
  | 'channel'              // Price channel
  | 'pattern'              // Chart pattern
  | 'fibonacci'            // Fibonacci levels
  | 'zone'                 // Trading zone
  | 'note'                 // Text note
  | 'signal'               // Bot signal
  | 'trade'                // Trade entry/exit
  | 'news'                 // News event
  | 'economic'             // Economic event
  | 'regime'               // Regime change
  | 'alert'                // Price alert
  | 'custom';              // Custom annotation

export type PatternType =
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'triple_top'
  | 'triple_bottom'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'wedge_rising'
  | 'wedge_falling'
  | 'flag_bullish'
  | 'flag_bearish'
  | 'pennant'
  | 'cup_and_handle'
  | 'rounding_bottom'
  | 'rectangle'
  | 'gap'
  | 'island_reversal';

export type EconomicEventType =
  | 'fomc'                 // Federal Reserve
  | 'nfp'                  // Non-Farm Payrolls
  | 'cpi'                  // Consumer Price Index
  | 'gdp'                  // Gross Domestic Product
  | 'pmi'                  // Purchasing Managers Index
  | 'retail_sales'         // Retail Sales
  | 'earnings'             // Company earnings
  | 'dividend'             // Ex-dividend date
  | 'ipo'                  // IPO
  | 'split'                // Stock split
  | 'central_bank'         // Other central bank
  | 'geopolitical'         // Geopolitical event
  | 'custom';              // Custom event

export type EventImpact = 'low' | 'medium' | 'high' | 'critical';

export interface Annotation {
  id: string;
  symbol: string;
  type: AnnotationType;
  timestamp: Date;
  price?: number;
  priceEnd?: number;                // For ranges
  timestampEnd?: Date;              // For time ranges
  title: string;
  description: string;
  color: string;
  visible: boolean;
  createdBy: 'user' | 'bot' | 'system';
  botId?: string;
  signalId?: string;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RegimeShift {
  id: string;
  symbol: string;
  timestamp: Date;
  fromRegime: string;
  toRegime: string;
  confidence: number;
  detectedBy: string;              // Which detector
  confirmedBy: string[];           // Other confirming signals
  priceAtShift: number;
  volumeAtShift: number;
  indicators: {
    name: string;
    value: number;
    signal: string;
  }[];
  annotation?: Annotation;
}

export interface BotEvent {
  id: string;
  botId: string;
  botName: string;
  symbol: string;
  timestamp: Date;
  eventType: 'signal' | 'entry' | 'exit' | 'stop_loss' | 'take_profit' | 'error' | 'status_change';
  direction?: 'long' | 'short' | 'neutral';
  price?: number;
  quantity?: number;
  confidence?: number;
  reason: string;
  pnl?: number;
  annotation?: Annotation;
}

export interface EconomicEvent {
  id: string;
  type: EconomicEventType;
  name: string;
  symbol?: string;                 // Affected symbol (for earnings, etc.)
  timestamp: Date;
  impact: EventImpact;
  previous?: number;
  forecast?: number;
  actual?: number;
  surprise?: number;               // actual - forecast
  currency?: string;
  country?: string;
  description: string;
  marketReaction?: {
    direction: 'bullish' | 'bearish' | 'neutral';
    magnitude: number;
    duration: number;              // Minutes of impact
  };
  annotation?: Annotation;
}

export interface SymbolSummary {
  symbol: string;
  name: string;
  assetClass: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  currentPrice: number;
  change24h: number;
  change7d: number;
  change30d: number;
  ytdReturn: number;
  avgVolume: number;
  beta?: number;
  pe?: number;
  dividendYield?: number;

  // Technical summary
  trend: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  support: number[];
  resistance: number[];
  keyLevels: { price: number; type: string; strength: number }[];
  patterns: { type: PatternType; confidence: number; target?: number }[];

  // Bot activity
  activeBots: string[];
  recentSignals: { botId: string; direction: string; confidence: number }[];

  // Events
  upcomingEvents: EconomicEvent[];
  recentAnnotations: Annotation[];

  // Regime
  currentRegime: string;
  regimeHistory: { regime: string; start: Date; end?: Date }[];

  generatedAt: Date;
}

export interface HistoricalReplaySession {
  id: string;
  symbol: string;
  startDate: Date;
  endDate: Date;
  currentTime: Date;
  speed: number;                   // 1 = real-time, 60 = 1 minute per second
  isPlaying: boolean;

  // Captured data
  priceData: { time: Date; open: number; high: number; low: number; close: number; volume: number }[];
  annotations: Annotation[];
  botEvents: BotEvent[];
  regimeShifts: RegimeShift[];
  economicEvents: EconomicEvent[];

  // Narration
  narrationEnabled: boolean;
  narrationMode: 'plain_english' | 'beginner' | 'intermediate' | 'pro' | 'quant';
  narrationQueue: { time: Date; text: string }[];

  // User interactions
  bookmarks: { time: Date; note: string }[];
  notes: string[];
}

export interface TradeJournalEntry {
  id: string;
  tradeId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryTime: Date;
  entryPrice: number;
  exitTime?: Date;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;

  // Analysis
  botId?: string;
  strategyUsed: string;
  regimeAtEntry: string;
  regimeAtExit?: string;

  // Context
  entryReason: string;
  exitReason?: string;
  preTradeAnalysis: string;
  postTradeAnalysis?: string;
  lessonsLearned?: string;

  // Annotations
  chartSnapshot?: string;          // Base64 or URL
  relatedAnnotations: string[];

  // Ratings
  executionRating?: number;        // 1-5
  planFollowedRating?: number;     // 1-5
  emotionalStateEntry?: string;
  emotionalStateExit?: string;

  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchReport {
  id: string;
  title: string;
  symbol?: string;
  symbols?: string[];
  type: 'technical' | 'fundamental' | 'quantitative' | 'macro' | 'sector' | 'custom';
  summary: string;
  sections: {
    title: string;
    content: string;
    charts?: string[];
    tables?: { headers: string[]; rows: string[][] }[];
  }[];
  conclusion: string;
  actionItems: string[];
  riskFactors: string[];
  createdBy: string;
  createdAt: Date;
  tags: string[];
}

// =============================================================================
// RESEARCH & ANNOTATION ENGINE
// =============================================================================

class ResearchAnnotationEngine extends EventEmitter {
  private static instance: ResearchAnnotationEngine;

  // Data stores
  private annotations: Map<string, Annotation> = new Map();
  private regimeShifts: Map<string, RegimeShift> = new Map();
  private botEvents: Map<string, BotEvent> = new Map();
  private economicEvents: Map<string, EconomicEvent> = new Map();
  private symbolSummaries: Map<string, SymbolSummary> = new Map();
  private replaySessions: Map<string, HistoricalReplaySession> = new Map();
  private journalEntries: Map<string, TradeJournalEntry> = new Map();
  private reports: Map<string, ResearchReport> = new Map();

  // Indexes for efficient lookup
  private annotationsBySymbol: Map<string, string[]> = new Map();
  private eventsByDate: Map<string, string[]> = new Map();

  // Configuration
  private config = {
    maxAnnotationsPerSymbol: 1000,
    summaryUpdateInterval: 300000,   // Update summaries every 5 minutes
    patternDetectionEnabled: true,
    autoAnnotateEnabled: true,
  };

  private constructor() {
    super();
    this.initializeEngine();
  }

  public static getInstance(): ResearchAnnotationEngine {
    if (!ResearchAnnotationEngine.instance) {
      ResearchAnnotationEngine.instance = new ResearchAnnotationEngine();
    }
    return ResearchAnnotationEngine.instance;
  }

  private initializeEngine(): void {
    logger.info('Initializing Research & Annotation Engine...');

    // Load economic calendar
    this.loadEconomicCalendar();

    // Start background processes
    this.startSummaryUpdateLoop();

    logger.info('Research & Annotation Engine initialized');
    this.emit('initialized');
  }

  // ===========================================================================
  // ANNOTATION MANAGEMENT
  // ===========================================================================

  /**
   * Create an annotation
   */
  public createAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Annotation {
    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullAnnotation: Annotation = {
      ...annotation,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.annotations.set(id, fullAnnotation);

    // Index by symbol
    const symbolAnnotations = this.annotationsBySymbol.get(annotation.symbol) || [];
    symbolAnnotations.push(id);

    // Limit annotations per symbol
    if (symbolAnnotations.length > this.config.maxAnnotationsPerSymbol) {
      const oldestId = symbolAnnotations.shift()!;
      this.annotations.delete(oldestId);
    }

    this.annotationsBySymbol.set(annotation.symbol, symbolAnnotations);

    logger.info(`Created annotation: ${annotation.title} on ${annotation.symbol}`);
    this.emit('annotation:created', fullAnnotation);

    return fullAnnotation;
  }

  /**
   * Update an annotation
   */
  public updateAnnotation(id: string, updates: Partial<Annotation>): Annotation | null {
    const annotation = this.annotations.get(id);
    if (!annotation) return null;

    const updated: Annotation = {
      ...annotation,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.annotations.set(id, updated);
    this.emit('annotation:updated', updated);

    return updated;
  }

  /**
   * Delete an annotation
   */
  public deleteAnnotation(id: string): boolean {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;

    this.annotations.delete(id);

    // Update index
    const symbolAnnotations = this.annotationsBySymbol.get(annotation.symbol) || [];
    const idx = symbolAnnotations.indexOf(id);
    if (idx > -1) {
      symbolAnnotations.splice(idx, 1);
      this.annotationsBySymbol.set(annotation.symbol, symbolAnnotations);
    }

    this.emit('annotation:deleted', annotation);
    return true;
  }

  /**
   * Get annotations for a symbol
   */
  public getAnnotations(symbol: string, options?: {
    type?: AnnotationType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Annotation[] {
    const annotationIds = this.annotationsBySymbol.get(symbol) || [];
    let annotations = annotationIds
      .map(id => this.annotations.get(id))
      .filter((a): a is Annotation => a !== undefined);

    if (options?.type) {
      annotations = annotations.filter(a => a.type === options.type);
    }

    if (options?.startDate) {
      annotations = annotations.filter(a => a.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      annotations = annotations.filter(a => a.timestamp <= options.endDate!);
    }

    annotations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      annotations = annotations.slice(0, options.limit);
    }

    return annotations;
  }

  // ===========================================================================
  // REGIME SHIFT TRACKING
  // ===========================================================================

  /**
   * Record a regime shift
   */
  public recordRegimeShift(shift: Omit<RegimeShift, 'id' | 'annotation'>): RegimeShift {
    const id = `regime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create annotation for the shift
    const annotation = this.createAnnotation({
      symbol: shift.symbol,
      type: 'regime',
      timestamp: shift.timestamp,
      price: shift.priceAtShift,
      title: `Regime: ${shift.fromRegime} → ${shift.toRegime}`,
      description: `Regime shifted with ${(shift.confidence * 100).toFixed(0)}% confidence`,
      color: shift.toRegime.includes('up') || shift.toRegime.includes('bull') ? '#22c55e' :
             shift.toRegime.includes('down') || shift.toRegime.includes('bear') ? '#ef4444' : '#eab308',
      visible: true,
      createdBy: 'system',
      metadata: { fromRegime: shift.fromRegime, toRegime: shift.toRegime },
      tags: ['regime', shift.fromRegime, shift.toRegime],
    });

    const fullShift: RegimeShift = {
      ...shift,
      id,
      annotation,
    };

    this.regimeShifts.set(id, fullShift);

    logger.info(`Recorded regime shift: ${shift.symbol} ${shift.fromRegime} → ${shift.toRegime}`);
    this.emit('regime:shifted', fullShift);

    return fullShift;
  }

  /**
   * Get regime shifts for a symbol
   */
  public getRegimeShifts(symbol: string, limit?: number): RegimeShift[] {
    const shifts = Array.from(this.regimeShifts.values())
      .filter(s => s.symbol === symbol)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? shifts.slice(0, limit) : shifts;
  }

  // ===========================================================================
  // BOT EVENT TRACKING
  // ===========================================================================

  /**
   * Record a bot event
   */
  public recordBotEvent(event: Omit<BotEvent, 'id' | 'annotation'>): BotEvent {
    const id = `bot_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create annotation for significant events
    let annotation: Annotation | undefined;
    if (['entry', 'exit', 'stop_loss', 'take_profit'].includes(event.eventType)) {
      annotation = this.createAnnotation({
        symbol: event.symbol,
        type: event.eventType === 'entry' ? 'trade' : 'trade',
        timestamp: event.timestamp,
        price: event.price,
        title: `${event.botName}: ${event.eventType.toUpperCase()}`,
        description: event.reason,
        color: event.direction === 'long' ? '#22c55e' :
               event.direction === 'short' ? '#ef4444' : '#6b7280',
        visible: true,
        createdBy: 'bot',
        botId: event.botId,
        metadata: {
          direction: event.direction,
          quantity: event.quantity,
          pnl: event.pnl,
        },
        tags: ['bot', event.botName, event.eventType],
      });
    }

    const fullEvent: BotEvent = {
      ...event,
      id,
      annotation,
    };

    this.botEvents.set(id, fullEvent);
    this.emit('bot_event:recorded', fullEvent);

    return fullEvent;
  }

  /**
   * Get bot events
   */
  public getBotEvents(options?: {
    symbol?: string;
    botId?: string;
    eventType?: BotEvent['eventType'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): BotEvent[] {
    let events = Array.from(this.botEvents.values());

    if (options?.symbol) {
      events = events.filter(e => e.symbol === options.symbol);
    }

    if (options?.botId) {
      events = events.filter(e => e.botId === options.botId);
    }

    if (options?.eventType) {
      events = events.filter(e => e.eventType === options.eventType);
    }

    if (options?.startDate) {
      events = events.filter(e => e.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      events = events.filter(e => e.timestamp <= options.endDate!);
    }

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return options?.limit ? events.slice(0, options.limit) : events;
  }

  // ===========================================================================
  // ECONOMIC EVENTS
  // ===========================================================================

  /**
   * Add an economic event
   */
  public addEconomicEvent(event: Omit<EconomicEvent, 'id' | 'annotation'>): EconomicEvent {
    const id = `econ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create annotation if symbol-specific
    let annotation: Annotation | undefined;
    if (event.symbol) {
      const impactColor = {
        low: '#6b7280',
        medium: '#eab308',
        high: '#f97316',
        critical: '#ef4444',
      };

      annotation = this.createAnnotation({
        symbol: event.symbol,
        type: 'economic',
        timestamp: event.timestamp,
        title: event.name,
        description: event.description,
        color: impactColor[event.impact],
        visible: true,
        createdBy: 'system',
        metadata: {
          eventType: event.type,
          impact: event.impact,
          previous: event.previous,
          forecast: event.forecast,
          actual: event.actual,
        },
        tags: ['economic', event.type, event.impact],
      });
    }

    const fullEvent: EconomicEvent = {
      ...event,
      id,
      annotation,
    };

    this.economicEvents.set(id, fullEvent);

    // Index by date
    const dateKey = event.timestamp.toISOString().split('T')[0];
    const dateEvents = this.eventsByDate.get(dateKey) || [];
    dateEvents.push(id);
    this.eventsByDate.set(dateKey, dateEvents);

    this.emit('economic_event:added', fullEvent);

    return fullEvent;
  }

  /**
   * Get economic events
   */
  public getEconomicEvents(options?: {
    type?: EconomicEventType;
    symbol?: string;
    startDate?: Date;
    endDate?: Date;
    impact?: EventImpact;
  }): EconomicEvent[] {
    let events = Array.from(this.economicEvents.values());

    if (options?.type) {
      events = events.filter(e => e.type === options.type);
    }

    if (options?.symbol) {
      events = events.filter(e => e.symbol === options.symbol);
    }

    if (options?.startDate) {
      events = events.filter(e => e.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      events = events.filter(e => e.timestamp <= options.endDate!);
    }

    if (options?.impact) {
      events = events.filter(e => e.impact === options.impact);
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get upcoming economic events
   */
  public getUpcomingEvents(days: number = 7): EconomicEvent[] {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.getEconomicEvents({ startDate: now, endDate });
  }

  /**
   * Load default economic calendar
   */
  private loadEconomicCalendar(): void {
    // Add sample recurring events (in production, would fetch from API)
    const now = new Date();

    // FOMC meetings (sample)
    this.addEconomicEvent({
      type: 'fomc',
      name: 'FOMC Interest Rate Decision',
      timestamp: new Date(now.getFullYear(), now.getMonth() + 1, 15, 14, 0),
      impact: 'critical',
      description: 'Federal Reserve interest rate decision and statement',
      country: 'US',
    });

    // NFP (first Friday of month)
    const nfpDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    while (nfpDate.getDay() !== 5) {
      nfpDate.setDate(nfpDate.getDate() + 1);
    }
    this.addEconomicEvent({
      type: 'nfp',
      name: 'Non-Farm Payrolls',
      timestamp: new Date(nfpDate.setHours(8, 30)),
      impact: 'high',
      description: 'US employment situation report',
      country: 'US',
    });

    // CPI
    this.addEconomicEvent({
      type: 'cpi',
      name: 'Consumer Price Index',
      timestamp: new Date(now.getFullYear(), now.getMonth() + 1, 12, 8, 30),
      impact: 'high',
      description: 'US consumer inflation data',
      country: 'US',
    });
  }

  // ===========================================================================
  // SYMBOL SUMMARIES
  // ===========================================================================

  /**
   * Generate a symbol summary
   */
  public generateSymbolSummary(symbol: string, data: Partial<SymbolSummary>): SymbolSummary {
    const annotations = this.getAnnotations(symbol, { limit: 20 });
    const botEvents = this.getBotEvents({ symbol, limit: 10 });
    const regimeShifts = this.getRegimeShifts(symbol, 5);
    const upcomingEvents = this.getEconomicEvents({
      symbol,
      startDate: new Date(),
    }).slice(0, 5);

    // Build regime history
    const regimeHistory = regimeShifts.map((shift, idx) => ({
      regime: shift.toRegime,
      start: shift.timestamp,
      end: idx > 0 ? regimeShifts[idx - 1].timestamp : undefined,
    }));

    // Get recent signals
    const recentSignals = botEvents
      .filter(e => e.eventType === 'signal')
      .map(e => ({
        botId: e.botId,
        direction: e.direction || 'neutral',
        confidence: e.confidence || 0,
      }));

    const summary: SymbolSummary = {
      symbol,
      name: data.name || symbol,
      assetClass: data.assetClass || 'equity',
      sector: data.sector,
      industry: data.industry,
      marketCap: data.marketCap,
      currentPrice: data.currentPrice || 0,
      change24h: data.change24h || 0,
      change7d: data.change7d || 0,
      change30d: data.change30d || 0,
      ytdReturn: data.ytdReturn || 0,
      avgVolume: data.avgVolume || 0,
      beta: data.beta,
      pe: data.pe,
      dividendYield: data.dividendYield,
      trend: data.trend || 'neutral',
      support: data.support || [],
      resistance: data.resistance || [],
      keyLevels: data.keyLevels || [],
      patterns: data.patterns || [],
      activeBots: data.activeBots || [],
      recentSignals,
      upcomingEvents,
      recentAnnotations: annotations,
      currentRegime: regimeShifts[0]?.toRegime || 'unknown',
      regimeHistory,
      generatedAt: new Date(),
    };

    this.symbolSummaries.set(symbol, summary);
    this.emit('summary:generated', summary);

    return summary;
  }

  /**
   * Get symbol summary
   */
  public getSymbolSummary(symbol: string): SymbolSummary | null {
    return this.symbolSummaries.get(symbol) || null;
  }

  // ===========================================================================
  // HISTORICAL REPLAY (MARKET TIME MACHINE)
  // ===========================================================================

  /**
   * Create a replay session
   */
  public createReplaySession(options: {
    symbol: string;
    startDate: Date;
    endDate: Date;
    narrationEnabled?: boolean;
    narrationMode?: HistoricalReplaySession['narrationMode'];
  }): HistoricalReplaySession {
    const id = `replay_${Date.now()}`;

    // Gather historical data
    const annotations = this.getAnnotations(options.symbol, {
      startDate: options.startDate,
      endDate: options.endDate,
    });

    const botEvents = this.getBotEvents({
      symbol: options.symbol,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    const regimeShifts = Array.from(this.regimeShifts.values())
      .filter(s =>
        s.symbol === options.symbol &&
        s.timestamp >= options.startDate &&
        s.timestamp <= options.endDate
      );

    const economicEvents = this.getEconomicEvents({
      symbol: options.symbol,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    const session: HistoricalReplaySession = {
      id,
      symbol: options.symbol,
      startDate: options.startDate,
      endDate: options.endDate,
      currentTime: options.startDate,
      speed: 1,
      isPlaying: false,
      priceData: [], // Would be populated from market data
      annotations,
      botEvents,
      regimeShifts,
      economicEvents,
      narrationEnabled: options.narrationEnabled || false,
      narrationMode: options.narrationMode || 'intermediate',
      narrationQueue: [],
      bookmarks: [],
      notes: [],
    };

    // Generate narration if enabled
    if (session.narrationEnabled) {
      this.generateNarration(session);
    }

    this.replaySessions.set(id, session);

    logger.info(`Created replay session: ${options.symbol} from ${options.startDate.toISOString()} to ${options.endDate.toISOString()}`);
    this.emit('replay:created', session);

    return session;
  }

  /**
   * Play/pause replay
   */
  public toggleReplay(sessionId: string): boolean {
    const session = this.replaySessions.get(sessionId);
    if (!session) return false;

    session.isPlaying = !session.isPlaying;
    this.emit(session.isPlaying ? 'replay:started' : 'replay:paused', session);

    return session.isPlaying;
  }

  /**
   * Set replay speed
   */
  public setReplaySpeed(sessionId: string, speed: number): void {
    const session = this.replaySessions.get(sessionId);
    if (!session) return;

    session.speed = Math.max(0.1, Math.min(100, speed));
    this.emit('replay:speed_changed', { sessionId, speed: session.speed });
  }

  /**
   * Jump to time in replay
   */
  public jumpToTime(sessionId: string, time: Date): void {
    const session = this.replaySessions.get(sessionId);
    if (!session) return;

    if (time < session.startDate || time > session.endDate) {
      logger.warn('Jump time out of session range');
      return;
    }

    session.currentTime = time;
    this.emit('replay:time_changed', { sessionId, time });
  }

  /**
   * Add bookmark to replay
   */
  public addBookmark(sessionId: string, note: string): void {
    const session = this.replaySessions.get(sessionId);
    if (!session) return;

    session.bookmarks.push({
      time: session.currentTime,
      note,
    });
    this.emit('replay:bookmark_added', { sessionId, bookmark: session.bookmarks[session.bookmarks.length - 1] });
  }

  /**
   * Generate narration for replay
   */
  private generateNarration(session: HistoricalReplaySession): void {
    // Generate narration for key events
    for (const regimeShift of session.regimeShifts) {
      session.narrationQueue.push({
        time: regimeShift.timestamp,
        text: this.generateRegimeNarration(regimeShift, session.narrationMode),
      });
    }

    for (const botEvent of session.botEvents) {
      if (['entry', 'exit', 'stop_loss', 'take_profit'].includes(botEvent.eventType)) {
        session.narrationQueue.push({
          time: botEvent.timestamp,
          text: this.generateBotEventNarration(botEvent, session.narrationMode),
        });
      }
    }

    for (const econEvent of session.economicEvents) {
      session.narrationQueue.push({
        time: econEvent.timestamp,
        text: this.generateEconomicEventNarration(econEvent, session.narrationMode),
      });
    }

    // Sort by time
    session.narrationQueue.sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  private generateRegimeNarration(shift: RegimeShift, mode: string): string {
    if (mode === 'plain_english') {
      return `The market mood changed from "${shift.fromRegime}" to "${shift.toRegime}". ` +
             `This means the overall direction and behavior of the market has shifted. ` +
             `The price was $${shift.priceAtShift.toFixed(2)} when this happened.`;
    }

    if (mode === 'pro') {
      return `Regime transition detected: ${shift.fromRegime} → ${shift.toRegime}. ` +
             `Confidence: ${(shift.confidence * 100).toFixed(0)}%. ` +
             `Detected by: ${shift.detectedBy}. ` +
             `Price: $${shift.priceAtShift.toFixed(2)}, Volume: ${shift.volumeAtShift.toLocaleString()}.`;
    }

    // Default (intermediate)
    return `The market regime shifted from ${shift.fromRegime} to ${shift.toRegime}. ` +
           `Detection confidence was ${(shift.confidence * 100).toFixed(0)}%. ` +
           `Price at shift: $${shift.priceAtShift.toFixed(2)}.`;
  }

  private generateBotEventNarration(event: BotEvent, mode: string): string {
    if (mode === 'plain_english') {
      if (event.eventType === 'entry') {
        return `A trading bot named "${event.botName}" decided to ${event.direction === 'long' ? 'buy' : 'sell'} ` +
               `at $${event.price?.toFixed(2)}. It did this because: ${event.reason}.`;
      }
      if (event.eventType === 'exit') {
        const pnlText = event.pnl && event.pnl > 0 ? `made $${event.pnl.toFixed(2)}` :
                       event.pnl ? `lost $${Math.abs(event.pnl).toFixed(2)}` : 'closed the trade';
        return `The bot "${event.botName}" ${pnlText} when it exited at $${event.price?.toFixed(2)}.`;
      }
    }

    if (mode === 'pro') {
      return `${event.botName} ${event.eventType.toUpperCase()} - ` +
             `${event.direction?.toUpperCase() || 'N/A'} @ $${event.price?.toFixed(2)}, ` +
             `Qty: ${event.quantity}, Confidence: ${(event.confidence || 0) * 100}%, ` +
             `PnL: ${event.pnl ? `$${event.pnl.toFixed(2)}` : 'N/A'}. Reason: ${event.reason}`;
    }

    // Default
    return `${event.botName} ${event.eventType}: ${event.direction || ''} at $${event.price?.toFixed(2)}. ` +
           `Reason: ${event.reason}. ${event.pnl ? `PnL: $${event.pnl.toFixed(2)}` : ''}`;
  }

  private generateEconomicEventNarration(event: EconomicEvent, mode: string): string {
    if (mode === 'plain_english') {
      return `An important economic event happened: "${event.name}". ` +
             `This is considered a ${event.impact} impact event. ${event.description}`;
    }

    if (mode === 'pro') {
      let text = `${event.name} (${event.type.toUpperCase()}) - Impact: ${event.impact}. `;
      if (event.actual !== undefined) {
        text += `Actual: ${event.actual}, Forecast: ${event.forecast}, `;
        text += `Surprise: ${event.surprise?.toFixed(2) || 'N/A'}. `;
      }
      if (event.marketReaction) {
        text += `Market reaction: ${event.marketReaction.direction}, ` +
                `magnitude: ${event.marketReaction.magnitude}, ` +
                `duration: ${event.marketReaction.duration}min.`;
      }
      return text;
    }

    // Default
    return `${event.name} - ${event.impact} impact. ${event.description}`;
  }

  // ===========================================================================
  // TRADE JOURNAL
  // ===========================================================================

  /**
   * Create a journal entry
   */
  public createJournalEntry(entry: Omit<TradeJournalEntry, 'id' | 'createdAt' | 'updatedAt'>): TradeJournalEntry {
    const id = `journal_${Date.now()}`;

    const fullEntry: TradeJournalEntry = {
      ...entry,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.journalEntries.set(id, fullEntry);

    logger.info(`Created journal entry for trade ${entry.tradeId}`);
    this.emit('journal:created', fullEntry);

    return fullEntry;
  }

  /**
   * Update a journal entry
   */
  public updateJournalEntry(id: string, updates: Partial<TradeJournalEntry>): TradeJournalEntry | null {
    const entry = this.journalEntries.get(id);
    if (!entry) return null;

    const updated: TradeJournalEntry = {
      ...entry,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.journalEntries.set(id, updated);
    this.emit('journal:updated', updated);

    return updated;
  }

  /**
   * Get journal entries
   */
  public getJournalEntries(options?: {
    symbol?: string;
    botId?: string;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    limit?: number;
  }): TradeJournalEntry[] {
    let entries = Array.from(this.journalEntries.values());

    if (options?.symbol) {
      entries = entries.filter(e => e.symbol === options.symbol);
    }

    if (options?.botId) {
      entries = entries.filter(e => e.botId === options.botId);
    }

    if (options?.startDate) {
      entries = entries.filter(e => e.entryTime >= options.startDate!);
    }

    if (options?.endDate) {
      entries = entries.filter(e => e.entryTime <= options.endDate!);
    }

    if (options?.tags && options.tags.length > 0) {
      entries = entries.filter(e =>
        options.tags!.some(tag => e.tags.includes(tag))
      );
    }

    entries.sort((a, b) => b.entryTime.getTime() - a.entryTime.getTime());

    return options?.limit ? entries.slice(0, options.limit) : entries;
  }

  /**
   * Get journal statistics
   */
  public getJournalStats(): {
    totalTrades: number;
    winRate: number;
    avgPnL: number;
    totalPnL: number;
    bestTrade: TradeJournalEntry | null;
    worstTrade: TradeJournalEntry | null;
    avgExecutionRating: number;
    avgPlanFollowedRating: number;
    commonTags: { tag: string; count: number }[];
    commonLessons: string[];
  } {
    const entries = Array.from(this.journalEntries.values());
    const completedEntries = entries.filter(e => e.exitTime && e.pnl !== undefined);

    if (completedEntries.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgPnL: 0,
        totalPnL: 0,
        bestTrade: null,
        worstTrade: null,
        avgExecutionRating: 0,
        avgPlanFollowedRating: 0,
        commonTags: [],
        commonLessons: [],
      };
    }

    const winningTrades = completedEntries.filter(e => (e.pnl || 0) > 0);
    const winRate = winningTrades.length / completedEntries.length;

    const totalPnL = completedEntries.reduce((sum, e) => sum + (e.pnl || 0), 0);
    const avgPnL = totalPnL / completedEntries.length;

    const bestTrade = completedEntries.reduce((best, e) =>
      (e.pnl || 0) > (best.pnl || 0) ? e : best
    , completedEntries[0]);

    const worstTrade = completedEntries.reduce((worst, e) =>
      (e.pnl || 0) < (worst.pnl || 0) ? e : worst
    , completedEntries[0]);

    const entriesWithExecutionRating = completedEntries.filter(e => e.executionRating);
    const avgExecutionRating = entriesWithExecutionRating.length > 0 ?
      entriesWithExecutionRating.reduce((sum, e) => sum + (e.executionRating || 0), 0) / entriesWithExecutionRating.length : 0;

    const entriesWithPlanRating = completedEntries.filter(e => e.planFollowedRating);
    const avgPlanFollowedRating = entriesWithPlanRating.length > 0 ?
      entriesWithPlanRating.reduce((sum, e) => sum + (e.planFollowedRating || 0), 0) / entriesWithPlanRating.length : 0;

    // Count tags
    const tagCounts = new Map<string, number>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const commonTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Common lessons
    const lessons = entries
      .map(e => e.lessonsLearned)
      .filter((l): l is string => !!l);
    const commonLessons = [...new Set(lessons)].slice(0, 5);

    return {
      totalTrades: completedEntries.length,
      winRate,
      avgPnL,
      totalPnL,
      bestTrade,
      worstTrade,
      avgExecutionRating,
      avgPlanFollowedRating,
      commonTags,
      commonLessons,
    };
  }

  // ===========================================================================
  // STATE & SUMMARY
  // ===========================================================================

  public getState(): {
    annotationCount: number;
    regimeShiftCount: number;
    botEventCount: number;
    economicEventCount: number;
    symbolSummaryCount: number;
    replaySessionCount: number;
    journalEntryCount: number;
  } {
    return {
      annotationCount: this.annotations.size,
      regimeShiftCount: this.regimeShifts.size,
      botEventCount: this.botEvents.size,
      economicEventCount: this.economicEvents.size,
      symbolSummaryCount: this.symbolSummaries.size,
      replaySessionCount: this.replaySessions.size,
      journalEntryCount: this.journalEntries.size,
    };
  }

  private startSummaryUpdateLoop(): void {
    // Update symbol summaries periodically
    setInterval(() => {
      for (const symbol of this.symbolSummaries.keys()) {
        const existing = this.symbolSummaries.get(symbol);
        if (existing) {
          this.generateSymbolSummary(symbol, existing);
        }
      }
    }, this.config.summaryUpdateInterval);
  }
}

// Export singleton instance
export const researchAnnotationEngine = ResearchAnnotationEngine.getInstance();
export default researchAnnotationEngine;

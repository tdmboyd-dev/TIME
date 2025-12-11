/**
 * TIME Database Repositories
 *
 * Repository pattern implementation for all TIME entities.
 * Provides type-safe data access with caching support.
 * Works with both real MongoDB and in-memory mock.
 */

import { databaseManager } from './connection';
import {
  UserSchema,
  BotSchema,
  StrategySchema,
  TradeSchema,
  SignalSchema,
  LearningEventSchema,
  InsightSchema,
  NotificationSchema,
  AuditLogSchema,
} from './schemas';

// ============================================================================
// Collection Interface (unified for real and mock)
// ============================================================================

interface CollectionLike {
  findOne(query: any): Promise<any>;
  find(query: any): Promise<{ toArray(): Promise<any[]> }>;
  insertOne(doc: any): Promise<{ insertedId: any }>;
  updateOne(query: any, update: any): Promise<{ modifiedCount: number }>;
  deleteOne(query: any): Promise<{ deletedCount: number }>;
  countDocuments(query: any): Promise<number>;
}

// ============================================================================
// Base Repository
// ============================================================================

export abstract class BaseRepository<T extends { _id: string }> {
  protected collectionName: string;
  protected cachePrefix: string;
  protected defaultCacheTTL: number;

  constructor(collectionName: string, cachePrefix: string, cacheTTL: number = 300) {
    this.collectionName = collectionName;
    this.cachePrefix = cachePrefix;
    this.defaultCacheTTL = cacheTTL;
  }

  protected get collection(): CollectionLike {
    return databaseManager.collection(this.collectionName) as CollectionLike;
  }

  async findById(id: string): Promise<T | null> {
    const cacheKey = `${this.cachePrefix}:${id}`;

    return databaseManager.cacheGet(cacheKey, async () => {
      return this.collection.findOne({ _id: id }) as Promise<T | null>;
    }, this.defaultCacheTTL);
  }

  async findOne(query: Partial<T>): Promise<T | null> {
    return this.collection.findOne(query) as Promise<T | null>;
  }

  async findMany(query: Partial<T> = {}): Promise<T[]> {
    const cursor = await this.collection.find(query);
    return cursor.toArray() as Promise<T[]>;
  }

  async create(data: Omit<T, '_id'> & { _id?: string }): Promise<T> {
    const doc = {
      _id: data._id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.collection.insertOne(doc);
    await this.invalidateCache(doc._id);

    return doc as unknown as T;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    await this.collection.updateOne(
      { _id: id },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    await this.invalidateCache(id);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    await this.invalidateCache(id);
    return result.deletedCount > 0;
  }

  async count(query: Partial<T> = {}): Promise<number> {
    return this.collection.countDocuments(query);
  }

  protected async invalidateCache(id: string): Promise<void> {
    await databaseManager.cacheDelete(`${this.cachePrefix}:${id}`);
  }
}

// ============================================================================
// User Repository
// ============================================================================

export class UserRepository extends BaseRepository<UserSchema> {
  constructor() {
    super('users', 'user', 600);
  }

  async findByEmail(email: string): Promise<UserSchema | null> {
    return this.findOne({ email } as any);
  }

  async updateLastActivity(userId: string): Promise<void> {
    await this.update(userId, { lastActivity: new Date() } as any);
  }

  async updateConsent(userId: string, consent: UserSchema['consent']): Promise<UserSchema | null> {
    return this.update(userId, { consent } as any);
  }

  async addBrokerConnection(userId: string, connection: UserSchema['brokerConnections'][0]): Promise<UserSchema | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    const connections = user.brokerConnections || [];
    connections.push(connection);

    return this.update(userId, { brokerConnections: connections } as any);
  }
}

// ============================================================================
// Bot Repository
// ============================================================================

export class BotRepository extends BaseRepository<BotSchema> {
  constructor() {
    super('bots', 'bot', 300);
  }

  async findByStatus(status: BotSchema['status']): Promise<BotSchema[]> {
    return this.findMany({ status } as any);
  }

  async findBySource(source: BotSchema['source']): Promise<BotSchema[]> {
    return this.findMany({ source } as any);
  }

  async findAbsorbed(): Promise<BotSchema[]> {
    return this.findMany({ isAbsorbed: true } as any);
  }

  async findPending(): Promise<BotSchema[]> {
    return this.findMany({ status: 'pending' } as any);
  }

  async updatePerformance(botId: string, performance: BotSchema['performance']): Promise<BotSchema | null> {
    return this.update(botId, { performance } as any);
  }

  async updateFingerprint(botId: string, fingerprint: BotSchema['fingerprint']): Promise<BotSchema | null> {
    return this.update(botId, { fingerprint } as any);
  }

  async markAbsorbed(botId: string): Promise<BotSchema | null> {
    return this.update(botId, {
      isAbsorbed: true,
      absorbedAt: new Date(),
      status: 'active',
    } as any);
  }

  async getTopPerformers(limit: number = 10): Promise<BotSchema[]> {
    const bots = await this.findMany({ status: 'active' } as any);
    return bots
      .sort((a, b) => (b.performance?.sharpeRatio || 0) - (a.performance?.sharpeRatio || 0))
      .slice(0, limit);
  }
}

// ============================================================================
// Strategy Repository
// ============================================================================

export class StrategyRepository extends BaseRepository<StrategySchema> {
  constructor() {
    super('strategies', 'strategy', 300);
  }

  async findByStatus(status: StrategySchema['status']): Promise<StrategySchema[]> {
    return this.findMany({ status } as any);
  }

  async findActive(): Promise<StrategySchema[]> {
    return this.findByStatus('active');
  }

  async updatePerformance(strategyId: string, performance: StrategySchema['performance']): Promise<StrategySchema | null> {
    return this.update(strategyId, { performance } as any);
  }

  async addEvolutionHistory(
    strategyId: string,
    evolution: StrategySchema['evolutionHistory'][0]
  ): Promise<StrategySchema | null> {
    const strategy = await this.findById(strategyId);
    if (!strategy) return null;

    const history = strategy.evolutionHistory || [];
    history.push(evolution);

    return this.update(strategyId, { evolutionHistory: history } as any);
  }

  async updateRegimePerformance(
    strategyId: string,
    regimePerformance: StrategySchema['regimePerformance']
  ): Promise<StrategySchema | null> {
    return this.update(strategyId, { regimePerformance } as any);
  }
}

// ============================================================================
// Trade Repository
// ============================================================================

export class TradeRepository extends BaseRepository<TradeSchema> {
  constructor() {
    super('trades', 'trade', 60);
  }

  async findByAccount(accountId: string): Promise<TradeSchema[]> {
    return this.findMany({ accountId } as any);
  }

  async findByBot(botId: string): Promise<TradeSchema[]> {
    const trades = await this.findMany({} as any);
    return trades.filter(t => t.attribution?.botId === botId);
  }

  async findByStrategy(strategyId: string): Promise<TradeSchema[]> {
    const trades = await this.findMany({} as any);
    return trades.filter(t => t.attribution?.strategyId === strategyId);
  }

  async findOpenTrades(): Promise<TradeSchema[]> {
    return this.findMany({ status: 'open' } as any);
  }

  async closeTrade(
    tradeId: string,
    exitPrice: number,
    exitTime: Date,
    exitReason?: string
  ): Promise<TradeSchema | null> {
    const trade = await this.findById(tradeId);
    if (!trade || trade.status !== 'open') return null;

    const pnl = (exitPrice - trade.entryPrice) * trade.quantity * (trade.direction === 'long' ? 1 : -1);
    const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.direction === 'long' ? 1 : -1);

    return this.update(tradeId, {
      exitPrice,
      exitTime,
      status: 'closed',
      pnl,
      pnlPercent,
      analysis: trade.analysis ? { ...trade.analysis, exitReason } : { exitReason, tags: [] },
    } as any);
  }

  async getRecentTrades(limit: number = 50): Promise<TradeSchema[]> {
    const trades = await this.findMany({} as any);
    return trades
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
      .slice(0, limit);
  }

  async getPerformanceStats(filter: { botId?: string; strategyId?: string; symbol?: string } = {}): Promise<{
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    totalPnL: number;
    avgWin: number;
    avgLoss: number;
  }> {
    let trades = await this.findMany({ status: 'closed' } as any);

    if (filter.botId) {
      trades = trades.filter(t => t.attribution?.botId === filter.botId);
    }
    if (filter.strategyId) {
      trades = trades.filter(t => t.attribution?.strategyId === filter.strategyId);
    }
    if (filter.symbol) {
      trades = trades.filter(t => t.symbol === filter.symbol);
    }

    const wins = trades.filter(t => (t.pnl || 0) > 0);
    const losses = trades.filter(t => (t.pnl || 0) < 0);

    const totalWin = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));

    return {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      profitFactor: totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0,
      totalPnL: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      avgWin: wins.length > 0 ? totalWin / wins.length : 0,
      avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
    };
  }
}

// ============================================================================
// Signal Repository
// ============================================================================

export class SignalRepository extends BaseRepository<SignalSchema> {
  constructor() {
    super('signals', 'signal', 60);
  }

  async findByBot(botId: string, limit?: number): Promise<SignalSchema[]> {
    const signals = await this.findMany({ botId } as any);
    const sorted = signals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async findBySymbol(symbol: string, limit?: number): Promise<SignalSchema[]> {
    const signals = await this.findMany({ symbol } as any);
    const sorted = signals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async findUnexecuted(): Promise<SignalSchema[]> {
    return this.findMany({ executed: false } as any);
  }

  async markExecuted(signalId: string, tradeId: string): Promise<SignalSchema | null> {
    return this.update(signalId, {
      executed: true,
      executedAt: new Date(),
      tradeId,
    } as any);
  }

  async setOutcome(signalId: string, outcome: SignalSchema['outcome']): Promise<SignalSchema | null> {
    return this.update(signalId, { outcome } as any);
  }

  async getRecentSignals(limit: number = 100): Promise<SignalSchema[]> {
    const signals = await this.findMany({} as any);
    return signals
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

// ============================================================================
// Learning Event Repository
// ============================================================================

export class LearningEventRepository extends BaseRepository<LearningEventSchema> {
  constructor() {
    super('learning_events', 'learning', 120);
  }

  async findUnprocessed(): Promise<LearningEventSchema[]> {
    return this.findMany({ processed: false } as any);
  }

  async findBySource(source: LearningEventSchema['source']): Promise<LearningEventSchema[]> {
    return this.findMany({ source } as any);
  }

  async markProcessed(eventId: string, insights: LearningEventSchema['insights']): Promise<LearningEventSchema | null> {
    return this.update(eventId, {
      processed: true,
      processedAt: new Date(),
      insights,
    } as any);
  }

  async getRecentInsights(limit: number = 50): Promise<LearningEventSchema[]> {
    const events = await this.findMany({ processed: true } as any);
    return events
      .sort((a, b) => new Date(b.processedAt || b.timestamp).getTime() - new Date(a.processedAt || a.timestamp).getTime())
      .slice(0, limit);
  }
}

// ============================================================================
// Insight Repository
// ============================================================================

export class InsightRepository extends BaseRepository<InsightSchema> {
  constructor() {
    super('insights', 'insight', 300);
  }

  async findActionable(): Promise<InsightSchema[]> {
    return this.findMany({ actionable: true, actedUpon: false } as any);
  }

  async findByCategory(category: InsightSchema['category']): Promise<InsightSchema[]> {
    return this.findMany({ category } as any);
  }

  async markActedUpon(insightId: string, outcome: InsightSchema['outcome']): Promise<InsightSchema | null> {
    return this.update(insightId, {
      actedUpon: true,
      actedAt: new Date(),
      outcome,
    } as any);
  }

  async getRecentInsights(limit: number = 50): Promise<InsightSchema[]> {
    const insights = await this.findMany({} as any);
    return insights
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

// ============================================================================
// Notification Repository
// ============================================================================

export class NotificationRepository extends BaseRepository<NotificationSchema> {
  constructor() {
    super('notifications', 'notification', 60);
  }

  async findByUser(userId: string): Promise<NotificationSchema[]> {
    return this.findMany({ userId } as any);
  }

  async findUnread(userId: string): Promise<NotificationSchema[]> {
    const notifications = await this.findByUser(userId);
    return notifications.filter(n => !n.readAt);
  }

  async markRead(notificationId: string): Promise<NotificationSchema | null> {
    return this.update(notificationId, { readAt: new Date() } as any);
  }

  async markAllRead(userId: string): Promise<number> {
    const unread = await this.findUnread(userId);
    for (const notification of unread) {
      await this.markRead(notification._id);
    }
    return unread.length;
  }
}

// ============================================================================
// Audit Log Repository
// ============================================================================

export class AuditLogRepository extends BaseRepository<AuditLogSchema> {
  constructor() {
    super('audit_logs', 'audit', 60);
  }

  async log(
    component: string,
    action: string,
    details: Record<string, any>,
    options: { userId?: string; success?: boolean; errorMessage?: string } = {}
  ): Promise<AuditLogSchema> {
    return this.create({
      timestamp: new Date(),
      component,
      action,
      details,
      userId: options.userId,
      success: options.success !== false,
      errorMessage: options.errorMessage,
    } as any);
  }

  async findByComponent(component: string, limit?: number): Promise<AuditLogSchema[]> {
    const logs = await this.findMany({ component } as any);
    const sorted = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async findByUser(userId: string, limit?: number): Promise<AuditLogSchema[]> {
    const logs = await this.findMany({ userId } as any);
    const sorted = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async getRecentLogs(limit: number = 100): Promise<AuditLogSchema[]> {
    const logs = await this.findMany({} as any);
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

// ============================================================================
// Export Repository Instances
// ============================================================================

export const userRepository = new UserRepository();
export const botRepository = new BotRepository();
export const strategyRepository = new StrategyRepository();
export const tradeRepository = new TradeRepository();
export const signalRepository = new SignalRepository();
export const learningEventRepository = new LearningEventRepository();
export const insightRepository = new InsightRepository();
export const notificationRepository = new NotificationRepository();
export const auditLogRepository = new AuditLogRepository();

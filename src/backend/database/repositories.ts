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
  TradingStateSchema,
  ACATSTransferSchema,
  ACATSTransferStatus,
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
    // PERFORMANCE FIX: Query directly instead of loading all and filtering
    return this.findMany({ 'attribution.botId': botId } as any);
  }

  async findByStrategy(strategyId: string): Promise<TradeSchema[]> {
    // PERFORMANCE FIX: Query directly instead of loading all and filtering
    return this.findMany({ 'attribution.strategyId': strategyId } as any);
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
    // PERFORMANCE FIX: Use database sorting and limit
    const collection = this.getCollection();
    const cursor = collection.find({}).sort({ entryTime: -1 }).limit(limit);
    return cursor.toArray() as Promise<TradeSchema[]>;
  }

  async getPerformanceStats(filter: { botId?: string; strategyId?: string; symbol?: string } = {}): Promise<{
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    totalPnL: number;
    avgWin: number;
    avgLoss: number;
  }> {
    // PERFORMANCE FIX: Build query filter instead of loading all and filtering
    const query: any = { status: 'closed' };
    if (filter.botId) {
      query['attribution.botId'] = filter.botId;
    }
    if (filter.strategyId) {
      query['attribution.strategyId'] = filter.strategyId;
    }
    if (filter.symbol) {
      query.symbol = filter.symbol;
    }

    const trades = await this.findMany(query);

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
    // PERFORMANCE FIX: Use database sorting and limit
    const collection = this.getCollection();
    const cursor = collection.find({ botId }).sort({ timestamp: -1 });
    if (limit) cursor.limit(limit);
    return cursor.toArray() as Promise<SignalSchema[]>;
  }

  async findBySymbol(symbol: string, limit?: number): Promise<SignalSchema[]> {
    // PERFORMANCE FIX: Use database sorting and limit
    const collection = this.getCollection();
    const cursor = collection.find({ symbol }).sort({ timestamp: -1 });
    if (limit) cursor.limit(limit);
    return cursor.toArray() as Promise<SignalSchema[]>;
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
    // PERFORMANCE FIX: Use database sorting and limit
    const collection = this.getCollection();
    return collection.find({}).sort({ timestamp: -1 }).limit(limit).toArray() as Promise<SignalSchema[]>;
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
    // PERFORMANCE FIX: Use database sorting and limit
    const collection = this.getCollection();
    return collection.find({ processed: true }).sort({ processedAt: -1, timestamp: -1 }).limit(limit).toArray() as Promise<LearningEventSchema[]>;
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
// Trading State Repository (For shared state across machines)
// ============================================================================

class TradingStateRepository extends BaseRepository<TradingStateSchema> {
  constructor() {
    super('trading_state', 'trading_state', 60); // 60 second cache
  }

  // Get or create global config
  async getGlobalConfig(): Promise<TradingStateSchema | null> {
    const configs = await this.findMany({ type: 'global_config' } as any);
    return configs[0] || null;
  }

  async saveGlobalConfig(config: Partial<TradingStateSchema>): Promise<TradingStateSchema> {
    const existing = await this.getGlobalConfig();
    if (existing) {
      return this.update(existing._id, { ...config, updatedAt: new Date() }) as Promise<TradingStateSchema>;
    }
    return this.create({
      type: 'global_config',
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }

  // Bot state management
  async getBotState(botId: string): Promise<TradingStateSchema | null> {
    const states = await this.findMany({ type: 'bot_state', botId } as any);
    return states[0] || null;
  }

  async saveBotState(botId: string, state: Partial<TradingStateSchema>): Promise<TradingStateSchema> {
    const existing = await this.getBotState(botId);
    if (existing) {
      return this.update(existing._id, { ...state, updatedAt: new Date() }) as Promise<TradingStateSchema>;
    }
    return this.create({
      _id: `bot_state_${botId}`,
      type: 'bot_state',
      botId,
      ...state,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }

  async getAllBotStates(): Promise<TradingStateSchema[]> {
    return this.findMany({ type: 'bot_state' } as any);
  }

  async getEnabledBotStates(): Promise<TradingStateSchema[]> {
    return this.findMany({ type: 'bot_state', isEnabled: true } as any);
  }

  // Signal management
  async saveSignal(signalId: string, signal: Partial<TradingStateSchema>): Promise<TradingStateSchema> {
    return this.create({
      _id: `signal_${signalId}`,
      type: 'signal',
      signalId,
      ...signal,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }

  async getPendingSignals(): Promise<TradingStateSchema[]> {
    return this.findMany({ type: 'signal', status: { $ne: 'EXECUTED' } } as any);
  }

  // Trade management
  async saveTrade(tradeId: string, trade: Partial<TradingStateSchema>): Promise<TradingStateSchema> {
    const existing = await this.findOne({ _id: `trade_${tradeId}` } as any);
    if (existing) {
      return this.update(`trade_${tradeId}`, { ...trade, updatedAt: new Date() }) as Promise<TradingStateSchema>;
    }
    return this.create({
      _id: `trade_${tradeId}`,
      type: 'trade',
      tradeId,
      ...trade,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }

  async getOpenTrades(): Promise<TradingStateSchema[]> {
    return this.findMany({ type: 'trade', status: 'OPEN' } as any);
  }

  async getTrades(botId?: string): Promise<TradingStateSchema[]> {
    const filter: any = { type: 'trade' };
    if (botId) filter.botId = botId;
    return this.findMany(filter);
  }
}

// ============================================================================
// ACATS Transfer Repository
// ============================================================================

export class ACATSTransferRepository extends BaseRepository<ACATSTransferSchema> {
  constructor() {
    super('acats_transfers', 'acats', 120); // 2 minute cache
  }

  /**
   * Find all transfers for a user
   */
  async findByUser(userId: string): Promise<ACATSTransferSchema[]> {
    const transfers = await this.findMany({ userId } as any);
    return transfers.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Find transfer by control number
   */
  async findByControlNumber(requestNumber: string): Promise<ACATSTransferSchema | null> {
    return this.findOne({ requestNumber } as any);
  }

  /**
   * Find transfers by status
   */
  async findByStatus(status: ACATSTransferStatus): Promise<ACATSTransferSchema[]> {
    const transfers = await this.findMany({ status } as any);
    return transfers.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Find active transfers (not completed, cancelled, or failed)
   */
  async findActiveTransfers(): Promise<ACATSTransferSchema[]> {
    const allTransfers = await this.findMany({} as any);
    const inactiveStatuses: ACATSTransferStatus[] = ['completed', 'cancelled', 'failed', 'rejected'];
    return allTransfers
      .filter(t => !inactiveStatuses.includes(t.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Find transfers pending processing (for background job)
   */
  async findPendingProcessing(): Promise<ACATSTransferSchema[]> {
    const processingStatuses: ACATSTransferStatus[] = [
      'pending_validation',
      'submitted',
      'received_by_delivering',
      'in_review',
      'approved',
      'in_progress',
    ];
    const allTransfers = await this.findMany({} as any);
    return allTransfers.filter(t => processingStatuses.includes(t.status));
  }

  /**
   * Update transfer status with history
   */
  async updateStatus(
    transferId: string,
    status: ACATSTransferStatus,
    message: string,
    details?: Record<string, any>
  ): Promise<ACATSTransferSchema | null> {
    const transfer = await this.findById(transferId);
    if (!transfer) return null;

    const statusHistory = transfer.statusHistory || [];
    statusHistory.push({
      status,
      timestamp: new Date(),
      message,
      details,
    });

    const updates: Partial<ACATSTransferSchema> = {
      status,
      statusHistory,
      updatedAt: new Date(),
    };

    // Set completion date if completed
    if (status === 'completed') {
      updates.completedAt = new Date();
    }

    return this.update(transferId, updates as any);
  }

  /**
   * Add document to transfer
   */
  async addDocument(
    transferId: string,
    document: ACATSTransferSchema['documents'][0]
  ): Promise<ACATSTransferSchema | null> {
    const transfer = await this.findById(transferId);
    if (!transfer) return null;

    const documents = transfer.documents || [];
    documents.push(document);

    return this.update(transferId, { documents } as any);
  }

  /**
   * Add issue to transfer
   */
  async addIssue(
    transferId: string,
    issue: ACATSTransferSchema['issues'][0]
  ): Promise<ACATSTransferSchema | null> {
    const transfer = await this.findById(transferId);
    if (!transfer) return null;

    const issues = transfer.issues || [];
    issues.push(issue);

    return this.update(transferId, { issues } as any);
  }

  /**
   * Record notification sent
   */
  async recordNotification(
    transferId: string,
    notification: ACATSTransferSchema['notificationsSent'][0]
  ): Promise<ACATSTransferSchema | null> {
    const transfer = await this.findById(transferId);
    if (!transfer) return null;

    const notificationsSent = transfer.notificationsSent || [];
    notificationsSent.push(notification);

    return this.update(transferId, { notificationsSent } as any);
  }

  /**
   * Get transfer statistics
   */
  async getStatistics(): Promise<{
    totalTransfers: number;
    byStatus: Record<ACATSTransferStatus, number>;
    averageCompletionDays: number;
    byBroker: Array<{ broker: string; count: number }>;
    totalValue: number;
  }> {
    const transfers = await this.findMany({} as any);

    const byStatus: Record<string, number> = {};
    const byBroker: Record<string, number> = {};
    let totalDays = 0;
    let completedCount = 0;
    let totalValue = 0;

    for (const transfer of transfers) {
      // Count by status
      byStatus[transfer.status] = (byStatus[transfer.status] || 0) + 1;

      // Count by broker
      const brokerName = transfer.deliveringBroker.brokerName;
      byBroker[brokerName] = (byBroker[brokerName] || 0) + 1;

      // Calculate average completion time
      if (transfer.status === 'completed' && transfer.completedAt && transfer.submittedAt) {
        const days =
          (new Date(transfer.completedAt).getTime() - new Date(transfer.submittedAt).getTime()) /
          (24 * 60 * 60 * 1000);
        totalDays += days;
        completedCount++;
      }

      // Sum total value
      totalValue += transfer.totalEstimatedValue || 0;
    }

    return {
      totalTransfers: transfers.length,
      byStatus: byStatus as Record<ACATSTransferStatus, number>,
      averageCompletionDays: completedCount > 0 ? totalDays / completedCount : 0,
      byBroker: Object.entries(byBroker)
        .map(([broker, count]) => ({ broker, count }))
        .sort((a, b) => b.count - a.count),
      totalValue,
    };
  }

  /**
   * Find transfers needing follow-up (stalled in a status)
   */
  async findStalledTransfers(maxAgeHours: number = 48): Promise<ACATSTransferSchema[]> {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const activeTransfers = await this.findActiveTransfers();

    return activeTransfers.filter(t => {
      const lastUpdate = t.statusHistory?.[t.statusHistory.length - 1]?.timestamp;
      return lastUpdate && new Date(lastUpdate) < cutoff;
    });
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
export const tradingStateRepository = new TradingStateRepository();
export const acatsTransferRepository = new ACATSTransferRepository();

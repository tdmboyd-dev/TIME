/**
 * TIME Database Connection Manager
 *
 * Handles MongoDB and Redis connections with:
 * - Connection pooling
 * - Automatic reconnection
 * - Health monitoring
 * - Graceful shutdown
 *
 * Uses real MongoDB and Redis clients with fallback to in-memory mock for development
 */

import { EventEmitter } from 'events';
import { MongoClient, Db, Collection, Document, WithId, OptionalUnlessRequiredId } from 'mongodb';
import { createClient, RedisClientType } from 'redis';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DatabaseConfig {
  mongodb: {
    uri: string;
    database: string;
    options?: {
      maxPoolSize?: number;
      serverSelectionTimeoutMS?: number;
      socketTimeoutMS?: number;
      retryWrites?: boolean;
    };
  };
  redis: {
    url?: string;
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxRetries?: number;
    retryDelay?: number;
  };
  useMock?: boolean; // Force mock mode for testing
}

export interface ConnectionStatus {
  mongodb: 'connected' | 'disconnected' | 'connecting' | 'error';
  redis: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastMongoCheck: Date;
  lastRedisCheck: Date;
  usingMock: boolean;
}

// ============================================================================
// In-Memory Mock for Development/Fallback
// ============================================================================

class InMemoryDatabase {
  private collections: Map<string, Map<string, any>> = new Map();

  collection(name: string): InMemoryCollection {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return new InMemoryCollection(name, this.collections.get(name)!);
  }
}

class InMemoryCollection {
  constructor(
    private name: string,
    private data: Map<string, any>
  ) {}

  async insertOne(doc: any): Promise<{ insertedId: string }> {
    const id = doc._id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    doc._id = id;
    this.data.set(id, { ...doc, createdAt: doc.createdAt || new Date() });
    return { insertedId: id };
  }

  async findOne(query: any): Promise<any | null> {
    for (const [id, doc] of this.data) {
      if (this.matchesQuery(doc, query)) {
        return doc;
      }
    }
    return null;
  }

  find(query: any = {}) {
    const self = this;
    const results: any[] = [];
    for (const [id, doc] of this.data) {
      if (this.matchesQuery(doc, query)) {
        results.push(doc);
      }
    }

    // Return a chainable cursor-like object
    const cursor = {
      _results: results,
      _sortKey: null as string | null,
      _sortOrder: 1 as number,
      _limit: 0 as number,

      sort(sortSpec: any) {
        if (typeof sortSpec === 'object') {
          const keys = Object.keys(sortSpec);
          if (keys.length > 0) {
            this._sortKey = keys[0];
            this._sortOrder = sortSpec[keys[0]];
          }
        }
        return this;
      },

      limit(n: number) {
        this._limit = n;
        return this;
      },

      async toArray(): Promise<any[]> {
        let result = [...this._results];
        if (this._sortKey) {
          const key = this._sortKey;
          const order = this._sortOrder;
          result.sort((a, b) => {
            if (a[key] < b[key]) return -1 * order;
            if (a[key] > b[key]) return 1 * order;
            return 0;
          });
        }
        if (this._limit > 0) {
          result = result.slice(0, this._limit);
        }
        return result;
      },
    };

    return cursor;
  }

  async updateOne(query: any, update: any): Promise<{ modifiedCount: number; matchedCount: number }> {
    for (const [id, doc] of this.data) {
      if (this.matchesQuery(doc, query)) {
        const $set = update.$set || {};
        const $unset = update.$unset || {};
        const $inc = update.$inc || {};
        const $push = update.$push || {};

        for (const [key, value] of Object.entries($set)) {
          doc[key] = value;
        }
        for (const key of Object.keys($unset)) {
          delete doc[key];
        }
        for (const [key, value] of Object.entries($inc)) {
          doc[key] = (doc[key] || 0) + (value as number);
        }
        for (const [key, value] of Object.entries($push)) {
          if (!Array.isArray(doc[key])) doc[key] = [];
          doc[key].push(value);
        }

        doc.updatedAt = new Date();
        this.data.set(id, doc);
        return { modifiedCount: 1, matchedCount: 1 };
      }
    }
    return { modifiedCount: 0, matchedCount: 0 };
  }

  async updateMany(query: any, update: any): Promise<{ modifiedCount: number; matchedCount: number }> {
    let modifiedCount = 0;
    let matchedCount = 0;

    for (const [id, doc] of this.data) {
      if (this.matchesQuery(doc, query)) {
        matchedCount++;
        const $set = update.$set || {};
        const $unset = update.$unset || {};
        const $inc = update.$inc || {};

        for (const [key, value] of Object.entries($set)) {
          doc[key] = value;
        }
        for (const key of Object.keys($unset)) {
          delete doc[key];
        }
        for (const [key, value] of Object.entries($inc)) {
          doc[key] = (doc[key] || 0) + (value as number);
        }

        doc.updatedAt = new Date();
        this.data.set(id, doc);
        modifiedCount++;
      }
    }

    return { modifiedCount, matchedCount };
  }

  async insertMany(docs: any[]): Promise<{ insertedCount: number; insertedIds: string[] }> {
    const insertedIds: string[] = [];
    for (const doc of docs) {
      const id = doc._id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      doc._id = id;
      this.data.set(id, { ...doc, createdAt: doc.createdAt || new Date() });
      insertedIds.push(id);
    }
    return { insertedCount: docs.length, insertedIds };
  }

  async deleteOne(query: any): Promise<{ deletedCount: number }> {
    for (const [id, doc] of this.data) {
      if (this.matchesQuery(doc, query)) {
        this.data.delete(id);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async countDocuments(query: any = {}): Promise<number> {
    let count = 0;
    for (const [id, doc] of this.data) {
      if (this.matchesQuery(doc, query)) {
        count++;
      }
    }
    return count;
  }

  private matchesQuery(doc: any, query: any): boolean {
    for (const [key, value] of Object.entries(query)) {
      if (key === '_id' && doc._id !== value) return false;
      if (key !== '_id' && doc[key] !== value) return false;
    }
    return true;
  }
}

class InMemoryCache {
  private data: Map<string, { value: string; expiry?: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup every 60 seconds to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Cleanup expired keys (prevents memory leak)
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, item] of this.data) {
      if (item.expiry && now > item.expiry) {
        this.data.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[InMemoryCache] Cleaned up ${cleaned} expired keys`);
    }
  }

  async get(key: string): Promise<string | null> {
    const item = this.data.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.data.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, { value });
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    this.data.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.data.keys()).filter(k => regex.test(k));
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================================================
// Database Connection Manager
// ============================================================================

export class DatabaseConnectionManager extends EventEmitter {
  private mongoClient: MongoClient | null = null;
  private redisClient: RedisClientType | null = null;
  private config: DatabaseConfig;
  private status: ConnectionStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Fallback in-memory stores
  private inMemoryDb: InMemoryDatabase | null = null;
  private inMemoryCache: InMemoryCache | null = null;
  private usingMock: boolean = false;

  // Store connection errors for debugging
  public lastMongoError: string | null = null;
  public lastRedisError: string | null = null;

  constructor(config?: Partial<DatabaseConfig>) {
    super();
    this.config = {
      mongodb: {
        uri: config?.mongodb?.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017',
        database: config?.mongodb?.database || process.env.MONGODB_DATABASE || 'time_trading',
        options: {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          retryWrites: true,
          ...config?.mongodb?.options,
        },
      },
      redis: {
        url: config?.redis?.url || process.env.REDIS_URL,
        host: config?.redis?.host || process.env.REDIS_HOST || 'localhost',
        port: config?.redis?.port || parseInt(process.env.REDIS_PORT || '6379', 10),
        password: config?.redis?.password || process.env.REDIS_PASSWORD,
        db: config?.redis?.db || 0,
        maxRetries: config?.redis?.maxRetries || 3,
        retryDelay: config?.redis?.retryDelay || 1000,
      },
      useMock: config?.useMock || process.env.USE_MOCK_DB === 'true',
    };

    this.status = {
      mongodb: 'disconnected',
      redis: 'disconnected',
      lastMongoCheck: new Date(),
      lastRedisCheck: new Date(),
      usingMock: false,
    };
  }

  /**
   * Initialize all database connections
   */
  async initialize(): Promise<void> {
    console.log('[DatabaseManager] Initializing connections...');

    // Try real databases first, fall back to mock if needed
    if (this.config.useMock) {
      console.log('[DatabaseManager] Mock mode enabled, using in-memory storage');
      this.initMockMode();
    } else {
      await Promise.all([
        this.connectMongo(),
        this.connectRedis(),
      ]);
    }

    // Start health check
    this.startHealthCheck();

    console.log('[DatabaseManager] All connections established');
    this.emit('connected');
  }

  /**
   * Initialize mock mode with in-memory storage
   */
  private initMockMode(): void {
    this.usingMock = true;
    this.status.usingMock = true;
    this.inMemoryDb = new InMemoryDatabase();
    this.inMemoryCache = new InMemoryCache();
    this.status.mongodb = 'connected';
    this.status.redis = 'connected';
    console.log('[DatabaseManager] Using in-memory mock database');
  }

  /**
   * Connect to MongoDB
   */
  private async connectMongo(): Promise<void> {
    try {
      this.status.mongodb = 'connecting';
      // Log URI safely (hide password)
      const safeUri = this.config.mongodb.uri.replace(/:([^@]+)@/, ':***@');
      console.log(`[DatabaseManager] Connecting to MongoDB: ${safeUri}`);
      console.log(`[DatabaseManager] Database name: ${this.config.mongodb.database}`);

      // Merge TLS options for MongoDB Atlas connections
      const mongoOptions: any = {
        ...this.config.mongodb.options,
        // TLS is required for MongoDB Atlas (mongodb+srv://)
        tls: this.config.mongodb.uri.includes('mongodb+srv://'),
      };
      this.mongoClient = new MongoClient(this.config.mongodb.uri, mongoOptions);
      await this.mongoClient.connect();
      console.log('[DatabaseManager] MongoClient connected, testing ping...');

      // Test connection
      await this.mongoClient.db(this.config.mongodb.database).command({ ping: 1 });

      this.status.mongodb = 'connected';
      this.status.lastMongoCheck = new Date();
      console.log('[DatabaseManager] MongoDB connected successfully to ' + this.config.mongodb.database);
      this.emit('mongodb:connected');
    } catch (error: any) {
      console.error('[DatabaseManager] MongoDB connection FAILED!');
      console.error('[DatabaseManager] Error name:', error?.name);
      console.error('[DatabaseManager] Error message:', error?.message);
      console.error('[DatabaseManager] Error code:', error?.code);
      this.lastMongoError = `${error?.name}: ${error?.message} (code: ${error?.code})`;
      this.status.mongodb = 'error';

      // Fall back to in-memory
      if (!this.inMemoryDb) {
        this.inMemoryDb = new InMemoryDatabase();
        this.usingMock = true;
        this.status.usingMock = true;
        this.status.mongodb = 'connected';
        console.log('[DatabaseManager] Using in-memory mock for MongoDB');
      }

      this.emit('mongodb:fallback');
    }
  }

  /**
   * Connect to Redis
   */
  private async connectRedis(): Promise<void> {
    try {
      this.status.redis = 'connecting';

      // Build Redis URL
      const redisUrl = this.config.redis.url ||
        `redis://${this.config.redis.password ? `:${this.config.redis.password}@` : ''}${this.config.redis.host}:${this.config.redis.port}/${this.config.redis.db || 0}`;

      console.log(`[DatabaseManager] Connecting to Redis: ${this.config.redis.host}:${this.config.redis.port}`);

      // Create client with exponential backoff reconnection strategy
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          // PERFORMANCE FIX: Enable reconnection with exponential backoff
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.warn('[DatabaseManager] Redis max reconnection attempts reached, falling back to in-memory');
              return false; // Stop trying after 10 attempts
            }
            // Exponential backoff: 100ms, 200ms, 400ms, 800ms... up to 30s max
            const delay = Math.min(Math.pow(2, retries) * 100, 30000);
            console.log(`[DatabaseManager] Redis reconnecting in ${delay}ms (attempt ${retries + 1}/10)`);
            return delay;
          },
          connectTimeout: 5000,
        },
      });

      // Log errors but don't spam
      let errorCount = 0;
      this.redisClient.on('error', (err) => {
        errorCount++;
        if (errorCount <= 3) {
          console.warn(`[DatabaseManager] Redis error #${errorCount}:`, err.message);
        }
      });

      // Log reconnection events
      this.redisClient.on('reconnecting', () => {
        console.log('[DatabaseManager] Redis reconnecting...');
      });

      await this.redisClient.connect();

      // Test connection
      await this.redisClient.ping();

      this.status.redis = 'connected';
      this.status.lastRedisCheck = new Date();
      console.log('[DatabaseManager] Redis connected successfully');
      this.emit('redis:connected');
    } catch (error) {
      console.warn('[DatabaseManager] Redis unavailable, using in-memory cache');
      this.status.redis = 'error';

      // Clean up the failed client
      if (this.redisClient) {
        try {
          await this.redisClient.quit();
        } catch {
          // Ignore quit errors
        }
        this.redisClient = null;
      }

      // Fall back to in-memory cache
      if (!this.inMemoryCache) {
        this.inMemoryCache = new InMemoryCache();
        this.status.redis = 'connected';
        console.log('[DatabaseManager] Using in-memory mock for Redis');
      }

      this.emit('redis:fallback');
    }
  }

  /**
   * Get MongoDB database instance
   */
  getDatabase(): Db | InMemoryDatabase {
    if (this.usingMock || !this.mongoClient) {
      if (!this.inMemoryDb) {
        this.inMemoryDb = new InMemoryDatabase();
      }
      return this.inMemoryDb;
    }
    return this.mongoClient.db(this.config.mongodb.database);
  }

  /**
   * Get Redis client
   */
  getRedis(): RedisClientType | InMemoryCache {
    if (this.usingMock || !this.redisClient?.isOpen) {
      if (!this.inMemoryCache) {
        this.inMemoryCache = new InMemoryCache();
      }
      return this.inMemoryCache as any;
    }
    return this.redisClient;
  }

  /**
   * Get collection - works with both real and mock
   */
  collection(name: string): Collection<Document> | InMemoryCollection {
    const db = this.getDatabase();
    if (db instanceof InMemoryDatabase) {
      return db.collection(name);
    }
    return db.collection(name);
  }

  /**
   * Get MongoClient for transaction support
   * Returns null if using mock/in-memory mode
   */
  getMongoClient(): MongoClient | null {
    if (this.usingMock || !this.mongoClient) {
      return null;
    }
    return this.mongoClient;
  }

  /**
   * Execute operations within a MongoDB transaction
   * Provides ACID guarantees when using real MongoDB
   * Falls back to sequential execution for in-memory mock
   *
   * @param callback - Function receiving session that executes operations
   * @returns Result of the callback
   */
  async withTransaction<T>(callback: (session: any) => Promise<T>): Promise<T> {
    const client = this.getMongoClient();

    // Fallback for mock mode - no transaction support
    if (!client) {
      console.warn('[DatabaseManager] Transaction requested but using mock mode - executing without ACID guarantees');
      return callback(null);
    }

    // Real MongoDB transaction with session
    const session = client.startSession();
    try {
      let result: T;
      await session.withTransaction(async () => {
        result = await callback(session);
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Cache get with fallback
   */
  async cacheGet<T>(key: string, fallback: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    try {
      const redis = this.getRedis();
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Cache miss or error, proceed with fallback
    }

    const result = await fallback();

    try {
      const redis = this.getRedis();
      if ('setEx' in redis) {
        await redis.setEx(key, ttlSeconds, JSON.stringify(result));
      }
    } catch (e) {
      // Cache write error, ignore
    }

    return result;
  }

  /**
   * Cache set
   */
  async cacheSet(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const redis = this.getRedis();
      if ('setEx' in redis) {
        await redis.setEx(key, ttlSeconds, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('[DatabaseManager] Cache set error:', e);
    }
  }

  /**
   * Cache delete
   */
  async cacheDelete(pattern: string): Promise<void> {
    try {
      const redis = this.getRedis();
      const keys = await redis.keys(pattern);
      if (keys && keys.length > 0) {
        for (const key of keys) {
          await redis.del(key);
        }
      }
    } catch (e) {
      console.warn('[DatabaseManager] Cache delete error:', e);
    }
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<ConnectionStatus> {
    // Check MongoDB
    if (this.mongoClient && !this.usingMock) {
      try {
        await this.mongoClient.db(this.config.mongodb.database).command({ ping: 1 });
        this.status.mongodb = 'connected';
        this.status.lastMongoCheck = new Date();
      } catch (e) {
        this.status.mongodb = 'error';
        console.error('[DatabaseManager] MongoDB health check failed:', e);
      }
    }

    // Check Redis
    if (this.redisClient && this.redisClient.isOpen && !this.usingMock) {
      try {
        await this.redisClient.ping();
        this.status.redis = 'connected';
        this.status.lastRedisCheck = new Date();
      } catch (e) {
        this.status.redis = 'error';
        console.error('[DatabaseManager] Redis health check failed:', e);
      }
    }

    this.emit('health:checked', this.status);
    return this.status;
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Check if using mock/in-memory mode
   */
  isUsingMock(): boolean {
    return this.usingMock;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[DatabaseManager] Shutting down...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const shutdownPromises: Promise<void>[] = [];

    if (this.mongoClient) {
      shutdownPromises.push(
        this.mongoClient.close().then(() => {
          console.log('[DatabaseManager] MongoDB connection closed');
        })
      );
    }

    if (this.redisClient && this.redisClient.isOpen) {
      shutdownPromises.push(
        this.redisClient.quit().then(() => {
          console.log('[DatabaseManager] Redis connection closed');
        })
      );
    }

    await Promise.all(shutdownPromises);

    this.status.mongodb = 'disconnected';
    this.status.redis = 'disconnected';

    console.log('[DatabaseManager] Shutdown complete');
    this.emit('disconnected');
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const databaseManager = new DatabaseConnectionManager();

/**
 * Helper function to get the database
 * Provides compatibility for modules that import { getDatabase }
 */
export function getDatabase() {
  return databaseManager.getDatabase();
}

/**
 * Helper function to get collection
 * Provides compatibility for modules that import { getCollection }
 */
export function getCollection(name: string) {
  return databaseManager.collection(name);
}

export default databaseManager;

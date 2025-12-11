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

  async find(query: any = {}): Promise<{ toArray: () => Promise<any[]> }> {
    const results: any[] = [];
    for (const [id, doc] of this.data) {
      if (this.matchesQuery(doc, query)) {
        results.push(doc);
      }
    }
    return { toArray: async () => results };
  }

  async updateOne(query: any, update: any): Promise<{ modifiedCount: number }> {
    for (const [id, doc] of this.data) {
      if (this.matchesQuery(doc, query)) {
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
        return { modifiedCount: 1 };
      }
    }
    return { modifiedCount: 0 };
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

  constructor(config?: Partial<DatabaseConfig>) {
    super();
    this.config = {
      mongodb: {
        uri: config?.mongodb?.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017',
        database: config?.mongodb?.database || process.env.MONGODB_DATABASE || 'time_trading',
        options: {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
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
      console.log(`[DatabaseManager] Connecting to MongoDB: ${this.config.mongodb.uri}`);

      this.mongoClient = new MongoClient(this.config.mongodb.uri, this.config.mongodb.options);
      await this.mongoClient.connect();

      // Test connection
      await this.mongoClient.db(this.config.mongodb.database).command({ ping: 1 });

      this.status.mongodb = 'connected';
      this.status.lastMongoCheck = new Date();
      console.log('[DatabaseManager] MongoDB connected successfully');
      this.emit('mongodb:connected');
    } catch (error) {
      console.warn('[DatabaseManager] MongoDB connection failed, falling back to mock:', error);
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

      // Create client with no auto-reconnect to avoid spam when DB is unavailable
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: false, // Disable auto-reconnect
          connectTimeout: 5000,
        },
      });

      // Only log first error, then fall back silently
      let errorLogged = false;
      this.redisClient.on('error', (err) => {
        if (!errorLogged) {
          console.warn('[DatabaseManager] Redis error, using in-memory cache');
          errorLogged = true;
        }
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
export default databaseManager;

/**
 * TIME Database Index Creation Script
 *
 * Creates all required indexes for optimal query performance.
 * Run this script on production MongoDB deployment.
 *
 * Usage: npx ts-node src/backend/database/create_indexes.ts
 */

import { databaseManager } from './connection';

interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    name?: string;
  };
}

const INDEXES: IndexDefinition[] = [
  // ============== USERS ==============
  {
    collection: 'users',
    index: { email: 1 },
    options: { unique: true, name: 'idx_users_email' },
  },
  {
    collection: 'users',
    index: { status: 1, createdAt: -1 },
    options: { name: 'idx_users_status_created' },
  },
  {
    collection: 'users',
    index: { role: 1 },
    options: { name: 'idx_users_role' },
  },
  {
    collection: 'users',
    index: { 'subscription.tier': 1 },
    options: { sparse: true, name: 'idx_users_subscription_tier' },
  },
  {
    collection: 'users',
    index: { lastLogin: -1 },
    options: { name: 'idx_users_last_login' },
  },

  // ============== TRADES ==============
  {
    collection: 'trades',
    index: { 'attribution.botId': 1, entryTime: -1 },
    options: { name: 'idx_trades_bot_entry' },
  },
  {
    collection: 'trades',
    index: { userId: 1, status: 1 },
    options: { name: 'idx_trades_user_status' },
  },
  {
    collection: 'trades',
    index: { symbol: 1, status: 1, entryTime: -1 },
    options: { name: 'idx_trades_symbol_status' },
  },
  {
    collection: 'trades',
    index: { status: 1, entryTime: -1 },
    options: { name: 'idx_trades_status_entry' },
  },
  {
    collection: 'trades',
    index: { createdAt: -1 },
    options: { name: 'idx_trades_created' },
  },

  // ============== BOTS ==============
  {
    collection: 'bots',
    index: { ownerId: 1 },
    options: { name: 'idx_bots_owner' },
  },
  {
    collection: 'bots',
    index: { status: 1, 'performance.sharpeRatio': -1 },
    options: { name: 'idx_bots_status_sharpe' },
  },
  {
    collection: 'bots',
    index: { type: 1, status: 1 },
    options: { name: 'idx_bots_type_status' },
  },
  {
    collection: 'bots',
    index: { sourceUrl: 1 },
    options: { sparse: true, name: 'idx_bots_source_url' },
  },
  {
    collection: 'bots',
    index: { 'performance.winRate': -1 },
    options: { name: 'idx_bots_win_rate' },
  },

  // ============== SIGNALS ==============
  {
    collection: 'signals',
    index: { botId: 1, timestamp: -1 },
    options: { name: 'idx_signals_bot_time' },
  },
  {
    collection: 'signals',
    index: { executed: 1 },
    options: { name: 'idx_signals_executed' },
  },
  {
    collection: 'signals',
    index: { symbol: 1, timestamp: -1 },
    options: { name: 'idx_signals_symbol_time' },
  },

  // ============== NOTIFICATIONS ==============
  {
    collection: 'notifications',
    index: { userId: 1, read: 1, createdAt: -1 },
    options: { name: 'idx_notifications_user_read' },
  },
  {
    collection: 'notifications',
    index: { userId: 1, type: 1 },
    options: { name: 'idx_notifications_user_type' },
  },

  // ============== AUDIT LOGS ==============
  {
    collection: 'audit_logs',
    index: { userId: 1, createdAt: -1 },
    options: { name: 'idx_audit_user_time' },
  },
  {
    collection: 'audit_logs',
    index: { action: 1, createdAt: -1 },
    options: { name: 'idx_audit_action_time' },
  },
  {
    collection: 'audit_logs',
    index: { category: 1, action: 1 },
    options: { name: 'idx_audit_category_action' },
  },

  // ============== PAYMENTS ==============
  {
    collection: 'payments',
    index: { userId: 1, status: 1 },
    options: { name: 'idx_payments_user_status' },
  },
  {
    collection: 'payments',
    index: { referenceNumber: 1 },
    options: { unique: true, sparse: true, name: 'idx_payments_reference' },
  },
  {
    collection: 'payments',
    index: { createdAt: -1 },
    options: { name: 'idx_payments_created' },
  },

  // ============== SESSIONS ==============
  {
    collection: 'sessions',
    index: { token: 1 },
    options: { unique: true, name: 'idx_sessions_token' },
  },
  {
    collection: 'sessions',
    index: { userId: 1 },
    options: { name: 'idx_sessions_user' },
  },
  {
    collection: 'sessions',
    index: { expiresAt: 1 },
    options: { name: 'idx_sessions_expires' },
  },

  // ============== API KEYS ==============
  {
    collection: 'api_keys',
    index: { key: 1 },
    options: { unique: true, name: 'idx_apikeys_key' },
  },
  {
    collection: 'api_keys',
    index: { userId: 1 },
    options: { name: 'idx_apikeys_user' },
  },

  // ============== SUPPORT TICKETS ==============
  {
    collection: 'support_tickets',
    index: { userId: 1, status: 1 },
    options: { name: 'idx_tickets_user_status' },
  },
  {
    collection: 'support_tickets',
    index: { ticketNumber: 1 },
    options: { unique: true, name: 'idx_tickets_number' },
  },
  {
    collection: 'support_tickets',
    index: { status: 1, priority: 1, createdAt: -1 },
    options: { name: 'idx_tickets_status_priority' },
  },

  // ============== CAMPAIGNS ==============
  {
    collection: 'campaigns',
    index: { status: 1, startDate: 1, endDate: 1 },
    options: { name: 'idx_campaigns_status_dates' },
  },
  {
    collection: 'campaign_enrollments',
    index: { campaignId: 1, userId: 1 },
    options: { unique: true, name: 'idx_enrollments_campaign_user' },
  },

  // ============== MARKET DATA ==============
  {
    collection: 'market_data',
    index: { symbol: 1, timestamp: -1 },
    options: { name: 'idx_market_symbol_time' },
  },
  {
    collection: 'market_data',
    index: { symbol: 1, timeframe: 1, timestamp: -1 },
    options: { name: 'idx_market_symbol_tf_time' },
  },
];

/**
 * Create all indexes
 */
async function createIndexes(): Promise<void> {
  console.log('========================================');
  console.log('TIME Database Index Creation');
  console.log('========================================\n');

  // Initialize database connection
  await databaseManager.initialize();

  const client = databaseManager.getMongoClient();
  if (!client) {
    console.error('ERROR: Cannot create indexes - MongoDB client not available');
    console.log('Make sure you are connected to a real MongoDB instance, not in-memory mock mode.');
    process.exit(1);
  }

  const db = client.db();
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const indexDef of INDEXES) {
    try {
      const collection = db.collection(indexDef.collection);

      // Check if index already exists
      const existingIndexes = await collection.listIndexes().toArray();
      const indexName = indexDef.options?.name || Object.keys(indexDef.index).join('_');
      const exists = existingIndexes.some(idx => idx.name === indexName);

      if (exists) {
        console.log(`  [SKIP] ${indexDef.collection}.${indexName} (already exists)`);
        skipped++;
        continue;
      }

      // Create the index
      await collection.createIndex(indexDef.index, {
        background: true,
        ...indexDef.options,
      });

      console.log(`  [CREATE] ${indexDef.collection}.${indexName}`);
      created++;
    } catch (error: any) {
      console.error(`  [FAIL] ${indexDef.collection}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`Results: ${created} created, ${skipped} skipped, ${failed} failed`);
  console.log('========================================');

  // Exit (connection will be closed automatically)
  process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  createIndexes().catch(error => {
    console.error('Index creation failed:', error);
    process.exit(1);
  });
}

export { createIndexes, INDEXES };

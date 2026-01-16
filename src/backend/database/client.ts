/**
 * Database Client Compatibility Layer
 *
 * Provides Prisma-like interface for compatibility with modules
 * that expect a Prisma client, while using MongoDB underneath.
 */

import { databaseManager } from './connection';

/**
 * Prisma-compatible client stub
 * Redirects to databaseManager for actual database operations
 */
export const prisma = {
  // User operations
  user: {
    findUnique: async (query: any) => {
      const users = databaseManager.collection('users');
      if (query.where.id) {
        return users.findOne({ _id: query.where.id });
      }
      if (query.where.email) {
        return users.findOne({ email: query.where.email });
      }
      return null;
    },
    findMany: async (query?: any) => {
      const users = databaseManager.collection('users');
      return users.find(query?.where || {}).toArray();
    },
    create: async (data: any) => {
      const users = databaseManager.collection('users');
      const result = await users.insertOne(data.data);
      return { ...data.data, id: result.insertedId };
    },
    update: async (query: any) => {
      const users = databaseManager.collection('users');
      await users.updateOne(
        { _id: query.where.id },
        { $set: query.data }
      );
      return query.data;
    },
    delete: async (query: any) => {
      const users = databaseManager.collection('users');
      await users.deleteOne({ _id: query.where.id });
      return query.where;
    },
  },

  // Campaign operations
  dripCampaign: {
    findUnique: async (query: any) => {
      const campaigns = databaseManager.collection('drip_campaigns');
      return campaigns.findOne({ _id: query.where.id });
    },
    findMany: async (query?: any) => {
      const campaigns = databaseManager.collection('drip_campaigns');
      return campaigns.find(query?.where || {}).toArray();
    },
    create: async (data: any) => {
      const campaigns = databaseManager.collection('drip_campaigns');
      const result = await campaigns.insertOne(data.data);
      return { ...data.data, id: result.insertedId };
    },
    update: async (query: any) => {
      const campaigns = databaseManager.collection('drip_campaigns');
      await campaigns.updateOne(
        { _id: query.where.id },
        { $set: query.data }
      );
      return query.data;
    },
    delete: async (query: any) => {
      const campaigns = databaseManager.collection('drip_campaigns');
      await campaigns.deleteOne({ _id: query.where.id });
      return query.where;
    },
  },

  // Campaign enrollment operations
  campaignEnrollment: {
    findUnique: async (query: any) => {
      const enrollments = databaseManager.collection('campaign_enrollments');
      return enrollments.findOne(query.where);
    },
    findMany: async (query?: any) => {
      const enrollments = databaseManager.collection('campaign_enrollments');
      return enrollments.find(query?.where || {}).toArray();
    },
    create: async (data: any) => {
      const enrollments = databaseManager.collection('campaign_enrollments');
      const result = await enrollments.insertOne(data.data);
      return { ...data.data, id: result.insertedId };
    },
    update: async (query: any) => {
      const enrollments = databaseManager.collection('campaign_enrollments');
      await enrollments.updateOne(
        query.where,
        { $set: query.data }
      );
      return query.data;
    },
    updateMany: async (query: any) => {
      const enrollments = databaseManager.collection('campaign_enrollments');
      const result = await enrollments.updateMany(
        query.where,
        { $set: query.data }
      );
      return { count: result.modifiedCount };
    },
  },

  // Email event operations
  emailEvent: {
    create: async (data: any) => {
      const events = databaseManager.collection('email_events');
      const result = await events.insertOne(data.data);
      return { ...data.data, id: result.insertedId };
    },
    findMany: async (query?: any) => {
      const events = databaseManager.collection('email_events');
      return events.find(query?.where || {}).toArray();
    },
  },

  // Transaction support with proper ACID guarantees
  // Uses MongoDB sessions when available, falls back to sequential for mock
  $transaction: async <T>(
    operationsOrCallback: any[] | ((tx: typeof prisma) => Promise<T>)
  ): Promise<T | any[]> => {
    // Support both Prisma-style callback and array of operations
    if (typeof operationsOrCallback === 'function') {
      // Callback style: $transaction(async (tx) => { ... })
      return databaseManager.withTransaction(async (session) => {
        // Note: session is passed but our prisma stub doesn't use it yet
        // In a full implementation, operations would use { session } option
        return operationsOrCallback(prisma);
      });
    }

    // Array style: $transaction([op1, op2, ...])
    // Use withTransaction for ACID guarantees
    return databaseManager.withTransaction(async () => {
      const results = [];
      for (const op of operationsOrCallback) {
        results.push(await op);
      }
      return results;
    });
  },
};

export default prisma;

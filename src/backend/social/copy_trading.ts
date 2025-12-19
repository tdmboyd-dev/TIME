/**
 * COPY TRADING & SOCIAL LEADERBOARDS
 *
 * Features:
 * - Copy top traders automatically
 * - Social leaderboards (daily, weekly, monthly, all-time)
 * - Trader profiles with performance stats
 * - Follow/unfollow traders
 * - Proportional trade copying
 * - Risk scaling for copied trades
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CopyTrading');

// Types
export interface TraderProfile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  isCopyable: boolean;

  // Stats
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  totalTrades: number;
  avgTradeReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;

  // Followers
  followerCount: number;
  copierCount: number;

  // Time periods
  returns: {
    day: number;
    week: number;
    month: number;
    quarter: number;
    year: number;
    allTime: number;
  };

  // Ranking
  rank: {
    overall: number;
    category: number;
    percentile: number;
  };

  // Settings
  copySettings: {
    minCopyAmount: number;
    maxCopyAmount: number;
    performanceFee: number; // % of profits
    allowPartialCopy: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface CopyRelationship {
  id: string;
  followerId: string;
  traderId: string;

  // Settings
  copyAmount: number;
  riskMultiplier: number; // 0.5 = half risk, 2 = double risk
  maxPositionSize: number;
  copyStopLoss: boolean;
  copyTakeProfit: boolean;

  // Performance
  totalCopiedTrades: number;
  profitFromCopying: number;
  profitFromCopyingPercent: number;

  // Status
  isActive: boolean;
  pausedReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank: number;
  trader: TraderProfile;
  returnValue: number;
  returnPercent: number;
  tradeCount: number;
}

export interface CopiedTrade {
  id: string;
  originalTradeId: string;
  copyRelationshipId: string;

  // Trade details
  symbol: string;
  side: 'buy' | 'sell';
  originalQuantity: number;
  copiedQuantity: number;
  entryPrice: number;
  exitPrice?: number;

  // Performance
  pnl?: number;
  pnlPercent?: number;

  // Timing
  originalExecutedAt: Date;
  copiedExecutedAt: Date;
  delay: number; // ms between original and copy

  status: 'pending' | 'executed' | 'failed' | 'closed';
}

// Copy Trading Engine
export class CopyTradingEngine extends EventEmitter {
  private traders: Map<string, TraderProfile> = new Map();
  private relationships: Map<string, CopyRelationship> = new Map();
  private copiedTrades: Map<string, CopiedTrade> = new Map();

  constructor() {
    super();
    logger.info('CopyTradingEngine initialized');
    this.createDemoTraders();
  }

  // Create demo traders for initial data
  private createDemoTraders(): void {
    const demoTraders: Omit<TraderProfile, 'id'>[] = [
      {
        userId: 'user-001',
        username: 'alpha_hunter',
        displayName: 'Alpha Hunter',
        bio: 'Professional quant trader. 10+ years experience.',
        isVerified: true,
        isCopyable: true,
        totalReturn: 125430.50,
        totalReturnPercent: 156.7,
        winRate: 72.5,
        totalTrades: 1247,
        avgTradeReturn: 2.1,
        sharpeRatio: 2.4,
        maxDrawdown: 8.2,
        profitFactor: 2.8,
        followerCount: 1523,
        copierCount: 342,
        returns: { day: 1.2, week: 4.5, month: 12.3, quarter: 28.5, year: 156.7, allTime: 156.7 },
        rank: { overall: 1, category: 1, percentile: 99.9 },
        copySettings: { minCopyAmount: 100, maxCopyAmount: 100000, performanceFee: 20, allowPartialCopy: true },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        userId: 'user-002',
        username: 'crypto_whale',
        displayName: 'Crypto Whale',
        bio: 'Crypto-focused trader. DeFi & NFT specialist.',
        isVerified: true,
        isCopyable: true,
        totalReturn: 89234.25,
        totalReturnPercent: 134.2,
        winRate: 68.3,
        totalTrades: 892,
        avgTradeReturn: 3.2,
        sharpeRatio: 2.1,
        maxDrawdown: 15.4,
        profitFactor: 2.3,
        followerCount: 987,
        copierCount: 234,
        returns: { day: -0.5, week: 8.2, month: 15.7, quarter: 42.3, year: 134.2, allTime: 134.2 },
        rank: { overall: 2, category: 1, percentile: 99.5 },
        copySettings: { minCopyAmount: 50, maxCopyAmount: 50000, performanceFee: 15, allowPartialCopy: true },
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date(),
      },
      {
        userId: 'user-003',
        username: 'steady_gains',
        displayName: 'Steady Gains',
        bio: 'Low risk, consistent returns. Dividend & value focus.',
        isVerified: true,
        isCopyable: true,
        totalReturn: 45678.90,
        totalReturnPercent: 45.6,
        winRate: 78.9,
        totalTrades: 456,
        avgTradeReturn: 1.2,
        sharpeRatio: 3.1,
        maxDrawdown: 4.5,
        profitFactor: 3.5,
        followerCount: 2341,
        copierCount: 567,
        returns: { day: 0.3, week: 1.2, month: 3.5, quarter: 10.2, year: 45.6, allTime: 45.6 },
        rank: { overall: 3, category: 1, percentile: 98.7 },
        copySettings: { minCopyAmount: 500, maxCopyAmount: 200000, performanceFee: 10, allowPartialCopy: true },
        createdAt: new Date('2023-06-01'),
        updatedAt: new Date(),
      },
      {
        userId: 'user-004',
        username: 'options_master',
        displayName: 'Options Master',
        bio: 'Options strategies. Theta gang leader.',
        isVerified: true,
        isCopyable: true,
        totalReturn: 78234.00,
        totalReturnPercent: 98.2,
        winRate: 82.1,
        totalTrades: 678,
        avgTradeReturn: 1.8,
        sharpeRatio: 2.7,
        maxDrawdown: 6.8,
        profitFactor: 2.9,
        followerCount: 756,
        copierCount: 189,
        returns: { day: 0.8, week: 3.2, month: 8.5, quarter: 22.1, year: 98.2, allTime: 98.2 },
        rank: { overall: 4, category: 1, percentile: 97.8 },
        copySettings: { minCopyAmount: 1000, maxCopyAmount: 150000, performanceFee: 25, allowPartialCopy: false },
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date(),
      },
      {
        userId: 'user-005',
        username: 'swing_trader_pro',
        displayName: 'Swing Trader Pro',
        bio: 'Swing trading stocks & ETFs. Technical analysis focus.',
        isVerified: false,
        isCopyable: true,
        totalReturn: 34567.80,
        totalReturnPercent: 67.8,
        winRate: 65.4,
        totalTrades: 345,
        avgTradeReturn: 2.5,
        sharpeRatio: 1.9,
        maxDrawdown: 12.3,
        profitFactor: 2.1,
        followerCount: 432,
        copierCount: 98,
        returns: { day: 1.5, week: 5.8, month: 9.2, quarter: 18.5, year: 67.8, allTime: 67.8 },
        rank: { overall: 5, category: 2, percentile: 95.2 },
        copySettings: { minCopyAmount: 200, maxCopyAmount: 75000, performanceFee: 15, allowPartialCopy: true },
        createdAt: new Date('2024-04-01'),
        updatedAt: new Date(),
      },
    ];

    demoTraders.forEach((trader, index) => {
      const id = `trader-${String(index + 1).padStart(3, '0')}`;
      this.traders.set(id, { ...trader, id });
    });

    logger.info(`Created ${demoTraders.length} demo traders`);
  }

  // Get leaderboard
  getLeaderboard(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'allTime' = 'month',
    limit: number = 50
  ): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    const sortedTraders = Array.from(this.traders.values())
      .filter(t => t.isCopyable)
      .sort((a, b) => b.returns[period] - a.returns[period])
      .slice(0, limit);

    sortedTraders.forEach((trader, index) => {
      entries.push({
        rank: index + 1,
        previousRank: trader.rank.overall, // Simplified
        trader,
        returnValue: trader.totalReturn * (trader.returns[period] / 100),
        returnPercent: trader.returns[period],
        tradeCount: Math.floor(trader.totalTrades * (period === 'day' ? 0.01 : period === 'week' ? 0.05 : 0.2)),
      });
    });

    return entries;
  }

  // Get trader profile
  getTrader(traderId: string): TraderProfile | null {
    return this.traders.get(traderId) || null;
  }

  // Get all traders
  getAllTraders(): TraderProfile[] {
    return Array.from(this.traders.values());
  }

  // Start copying a trader
  startCopying(
    followerId: string,
    traderId: string,
    settings: {
      copyAmount: number;
      riskMultiplier?: number;
      maxPositionSize?: number;
      copyStopLoss?: boolean;
      copyTakeProfit?: boolean;
    }
  ): CopyRelationship {
    const trader = this.traders.get(traderId);
    if (!trader) {
      throw new Error('Trader not found');
    }

    if (!trader.isCopyable) {
      throw new Error('Trader is not available for copying');
    }

    if (settings.copyAmount < trader.copySettings.minCopyAmount) {
      throw new Error(`Minimum copy amount is $${trader.copySettings.minCopyAmount}`);
    }

    if (settings.copyAmount > trader.copySettings.maxCopyAmount) {
      throw new Error(`Maximum copy amount is $${trader.copySettings.maxCopyAmount}`);
    }

    const relationshipId = `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const relationship: CopyRelationship = {
      id: relationshipId,
      followerId,
      traderId,
      copyAmount: settings.copyAmount,
      riskMultiplier: settings.riskMultiplier || 1,
      maxPositionSize: settings.maxPositionSize || settings.copyAmount * 0.25,
      copyStopLoss: settings.copyStopLoss ?? true,
      copyTakeProfit: settings.copyTakeProfit ?? true,
      totalCopiedTrades: 0,
      profitFromCopying: 0,
      profitFromCopyingPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.relationships.set(relationshipId, relationship);

    // Update trader stats
    trader.copierCount += 1;
    trader.followerCount += 1;
    this.traders.set(traderId, trader);

    this.emit('copyStarted', { relationship, trader });
    logger.info(`User ${followerId} started copying ${trader.displayName}`);

    return relationship;
  }

  // Stop copying
  stopCopying(relationshipId: string): void {
    const relationship = this.relationships.get(relationshipId);
    if (!relationship) {
      throw new Error('Copy relationship not found');
    }

    relationship.isActive = false;
    relationship.pausedReason = 'User stopped copying';
    relationship.updatedAt = new Date();
    this.relationships.set(relationshipId, relationship);

    // Update trader stats
    const trader = this.traders.get(relationship.traderId);
    if (trader) {
      trader.copierCount = Math.max(0, trader.copierCount - 1);
      this.traders.set(relationship.traderId, trader);
    }

    this.emit('copyStopped', { relationship });
    logger.info(`Copy relationship ${relationshipId} stopped`);
  }

  // Get user's copy relationships
  getUserCopyRelationships(userId: string): CopyRelationship[] {
    return Array.from(this.relationships.values())
      .filter(r => r.followerId === userId);
  }

  // Get copied trades for a relationship
  getCopiedTrades(relationshipId: string): CopiedTrade[] {
    return Array.from(this.copiedTrades.values())
      .filter(t => t.copyRelationshipId === relationshipId);
  }

  // Copy a trade (called when a trader makes a trade)
  async copyTrade(
    originalTradeId: string,
    traderId: string,
    tradeDetails: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      price: number;
    }
  ): Promise<CopiedTrade[]> {
    const copiedTrades: CopiedTrade[] = [];

    // Find all active relationships for this trader
    const relationships = Array.from(this.relationships.values())
      .filter(r => r.traderId === traderId && r.isActive);

    for (const relationship of relationships) {
      // Calculate proportional size
      const proportionOfTraderCapital = tradeDetails.quantity * tradeDetails.price / 100000; // Assume trader has 100k
      let copiedQuantity = Math.floor((relationship.copyAmount * proportionOfTraderCapital) / tradeDetails.price);

      // Apply risk multiplier
      copiedQuantity = Math.floor(copiedQuantity * relationship.riskMultiplier);

      // Check max position size
      const positionValue = copiedQuantity * tradeDetails.price;
      if (positionValue > relationship.maxPositionSize) {
        copiedQuantity = Math.floor(relationship.maxPositionSize / tradeDetails.price);
      }

      if (copiedQuantity <= 0) continue;

      const copiedTrade: CopiedTrade = {
        id: `copied-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalTradeId,
        copyRelationshipId: relationship.id,
        symbol: tradeDetails.symbol,
        side: tradeDetails.side,
        originalQuantity: tradeDetails.quantity,
        copiedQuantity,
        entryPrice: tradeDetails.price,
        originalExecutedAt: new Date(),
        copiedExecutedAt: new Date(),
        delay: Math.random() * 100, // Simulated delay
        status: 'executed',
      };

      this.copiedTrades.set(copiedTrade.id, copiedTrade);
      copiedTrades.push(copiedTrade);

      // Update relationship stats
      relationship.totalCopiedTrades += 1;
      relationship.updatedAt = new Date();
      this.relationships.set(relationship.id, relationship);
    }

    if (copiedTrades.length > 0) {
      this.emit('tradesCopied', { originalTradeId, copiedTrades });
      logger.info(`Copied trade ${originalTradeId} to ${copiedTrades.length} copiers`);
    }

    return copiedTrades;
  }

  // Get stats
  getStats(): {
    totalTraders: number;
    totalCopiers: number;
    totalCopiedTrades: number;
    totalCopiedVolume: number;
  } {
    const relationships = Array.from(this.relationships.values());
    const trades = Array.from(this.copiedTrades.values());

    return {
      totalTraders: this.traders.size,
      totalCopiers: new Set(relationships.map(r => r.followerId)).size,
      totalCopiedTrades: trades.length,
      totalCopiedVolume: trades.reduce((sum, t) => sum + (t.copiedQuantity * t.entryPrice), 0),
    };
  }
}

// Singleton instance
export const copyTradingEngine = new CopyTradingEngine();

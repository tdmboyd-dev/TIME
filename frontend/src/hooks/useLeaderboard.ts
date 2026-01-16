'use client';

/**
 * TIME - useLeaderboard Hook
 *
 * Provides access to trader leaderboard data including:
 * - Top performers rankings
 * - Performance metrics
 * - Achievement badges
 * - Real-time leaderboard updates
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    winRate: number;
    totalTrades: number;
    profitFactor: number;
    sharpeRatio: number;
    bestTrade: number;
  };
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  badges: string[];
  followers: number;
  copiers: number;
  joinedAt: Date;
  isVerified: boolean;
}

export interface LeaderboardStats {
  totalTraders: number;
  avgReturn: number;
  topPerformerReturn: number;
  tradesToday: number;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year' | 'all';
export type LeaderboardMetric = 'return' | 'winRate' | 'trades' | 'profitFactor' | 'followers';

export interface UseLeaderboardOptions {
  period?: LeaderboardPeriod;
  metric?: LeaderboardMetric;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  stats: LeaderboardStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  period: LeaderboardPeriod;
  setPeriod: (period: LeaderboardPeriod) => void;
  metric: LeaderboardMetric;
  setMetric: (metric: LeaderboardMetric) => void;
  userRank: LeaderboardEntry | null;
}

// ============================================================================
// MOCK DATA (fallback)
// ============================================================================

const mockEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    id: 'user-1',
    username: 'quantum_trader',
    displayName: 'Quantum Trader',
    performance: {
      totalReturn: 125450.75,
      totalReturnPercent: 45.2,
      winRate: 0.72,
      totalTrades: 892,
      profitFactor: 2.8,
      sharpeRatio: 2.4,
      bestTrade: 12500,
    },
    tier: 'diamond',
    badges: ['top_performer', 'consistent', 'verified'],
    followers: 12450,
    copiers: 342,
    joinedAt: new Date('2023-01-15'),
    isVerified: true,
  },
  {
    rank: 2,
    id: 'user-2',
    username: 'algo_king',
    displayName: 'Algo King',
    performance: {
      totalReturn: 98750.50,
      totalReturnPercent: 38.5,
      winRate: 0.68,
      totalTrades: 1245,
      profitFactor: 2.4,
      sharpeRatio: 2.1,
      bestTrade: 8900,
    },
    tier: 'platinum',
    badges: ['high_volume', 'verified'],
    followers: 8920,
    copiers: 256,
    joinedAt: new Date('2023-03-20'),
    isVerified: true,
  },
  {
    rank: 3,
    id: 'user-3',
    username: 'momentum_master',
    displayName: 'Momentum Master',
    performance: {
      totalReturn: 85230.00,
      totalReturnPercent: 32.8,
      winRate: 0.65,
      totalTrades: 567,
      profitFactor: 2.2,
      sharpeRatio: 1.9,
      bestTrade: 15200,
    },
    tier: 'gold',
    badges: ['risk_manager'],
    followers: 5670,
    copiers: 178,
    joinedAt: new Date('2023-06-10'),
    isVerified: false,
  },
  {
    rank: 4,
    id: 'user-4',
    username: 'crypto_whale',
    displayName: 'Crypto Whale',
    performance: {
      totalReturn: 72100.25,
      totalReturnPercent: 28.4,
      winRate: 0.61,
      totalTrades: 423,
      profitFactor: 1.9,
      sharpeRatio: 1.7,
      bestTrade: 22000,
    },
    tier: 'gold',
    badges: ['crypto_expert'],
    followers: 4230,
    copiers: 134,
    joinedAt: new Date('2023-08-05'),
    isVerified: true,
  },
  {
    rank: 5,
    id: 'user-5',
    username: 'swing_trader',
    displayName: 'Swing Trader Pro',
    performance: {
      totalReturn: 65780.00,
      totalReturnPercent: 24.1,
      winRate: 0.58,
      totalTrades: 312,
      profitFactor: 1.8,
      sharpeRatio: 1.5,
      bestTrade: 9800,
    },
    tier: 'silver',
    badges: ['consistent'],
    followers: 2890,
    copiers: 89,
    joinedAt: new Date('2023-09-15'),
    isVerified: false,
  },
];

const mockStats: LeaderboardStats = {
  totalTraders: 15420,
  avgReturn: 12.5,
  topPerformerReturn: 45.2,
  tradesToday: 8923,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useLeaderboard(options: UseLeaderboardOptions = {}): UseLeaderboardReturn {
  const {
    period: initialPeriod = 'month',
    metric: initialMetric = 'return',
    limit = 100,
    autoRefresh = false,
    refreshInterval = 60000,
  } = options;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [metric, setMetric] = useState<LeaderboardMetric>(initialMetric);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/social/leaderboard?period=${period}&metric=${metric}&limit=${limit}`,
        {
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.entries && Array.isArray(data.entries)) {
          setEntries(data.entries.map((e: any) => ({
            ...e,
            joinedAt: new Date(e.joinedAt || Date.now()),
          })));
        } else {
          setEntries(mockEntries);
        }

        if (data.stats) {
          setStats(data.stats);
        } else {
          setStats(mockStats);
        }

        if (data.userRank) {
          setUserRank({
            ...data.userRank,
            joinedAt: new Date(data.userRank.joinedAt || Date.now()),
          });
        }

        setError(null);
      } else {
        setEntries(mockEntries);
        setStats(mockStats);
        setError(null);
      }
    } catch (err: any) {
      console.error('[useLeaderboard] Fetch error:', err);
      setEntries(mockEntries);
      setStats(mockStats);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [period, metric, limit]);

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchLeaderboard, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchLeaderboard]);

  return {
    entries,
    stats,
    loading,
    error,
    refresh: fetchLeaderboard,
    period,
    setPeriod,
    metric,
    setMetric,
    userRank,
  };
}

export default useLeaderboard;

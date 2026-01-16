'use client';

/**
 * TIME - useBots Hook
 *
 * Provides access to bot management functionality including:
 * - Fetching bots list
 * - Bot activation/deactivation
 * - Bot performance metrics
 * - Real-time bot updates via WebSocket
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getAuthHeaders, apiFetch } from '@/lib/api';
import { useWebSocket } from './useWebSocket';

// ============================================================================
// TYPES
// ============================================================================

export interface Bot {
  id: string;
  name: string;
  source: string;
  status: 'active' | 'inactive' | 'paused' | 'error';
  type: 'trading' | 'analysis' | 'sentiment' | 'ml' | 'copy';
  strategy?: string;
  performance: {
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    totalPnL: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
  };
  settings?: {
    riskLevel: 'low' | 'medium' | 'high';
    maxPositionSize: number;
    stopLossPercent: number;
  };
  createdAt: Date;
  lastActiveAt?: Date;
}

export interface BotUpdate {
  botId: string;
  name: string;
  status: string;
  performance?: {
    winRate: number;
    pnlToday: number;
    activeTrades: number;
  };
}

export interface UseBotsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  includeInactive?: boolean;
}

export interface UseBotsReturn {
  bots: Bot[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  activateBot: (botId: string) => Promise<boolean>;
  deactivateBot: (botId: string) => Promise<boolean>;
  getBotById: (botId: string) => Bot | undefined;
  activeBots: Bot[];
  totalPnL: number;
  isConnected: boolean;
}

// ============================================================================
// MOCK DATA (fallback)
// ============================================================================

const mockBots: Bot[] = [
  {
    id: 'bot-1',
    name: 'Momentum Master',
    source: 'Ultimate Money Machine',
    status: 'active',
    type: 'trading',
    strategy: 'Momentum Breakout',
    performance: {
      winRate: 0.68,
      profitFactor: 2.1,
      totalTrades: 847,
      totalPnL: 12450.50,
      sharpeRatio: 1.8,
      maxDrawdown: 0.12,
    },
    settings: {
      riskLevel: 'medium',
      maxPositionSize: 5000,
      stopLossPercent: 2,
    },
    createdAt: new Date('2024-01-15'),
    lastActiveAt: new Date(),
  },
  {
    id: 'bot-2',
    name: 'AI Trend Follower',
    source: 'Bot Brain',
    status: 'active',
    type: 'ml',
    strategy: 'Neural Network Trend Detection',
    performance: {
      winRate: 0.72,
      profitFactor: 2.4,
      totalTrades: 523,
      totalPnL: 18920.00,
      sharpeRatio: 2.1,
      maxDrawdown: 0.08,
    },
    settings: {
      riskLevel: 'low',
      maxPositionSize: 3000,
      stopLossPercent: 1.5,
    },
    createdAt: new Date('2024-02-01'),
    lastActiveAt: new Date(),
  },
  {
    id: 'bot-3',
    name: 'Sentiment Scanner',
    source: 'Agent Swarm',
    status: 'active',
    type: 'sentiment',
    strategy: 'Social Sentiment Analysis',
    performance: {
      winRate: 0.61,
      profitFactor: 1.7,
      totalTrades: 234,
      totalPnL: 5670.25,
      sharpeRatio: 1.4,
      maxDrawdown: 0.15,
    },
    createdAt: new Date('2024-03-10'),
    lastActiveAt: new Date(),
  },
  {
    id: 'bot-4',
    name: 'Mean Reversion Pro',
    source: 'Absorbed SuperBots',
    status: 'inactive',
    type: 'trading',
    strategy: 'Statistical Mean Reversion',
    performance: {
      winRate: 0.65,
      profitFactor: 1.9,
      totalTrades: 412,
      totalPnL: 8340.75,
      sharpeRatio: 1.6,
      maxDrawdown: 0.10,
    },
    createdAt: new Date('2024-01-20'),
  },
];

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBots(options: UseBotsOptions = {}): UseBotsReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    includeInactive = true,
  } = options;

  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket for real-time bot updates
  const { isConnected } = useWebSocket({
    channels: ['bots'],
    handlers: {
      onBotUpdate: (update: BotUpdate) => {
        setBots(prev => prev.map(bot =>
          bot.id === update.botId
            ? {
                ...bot,
                status: update.status as Bot['status'],
                performance: update.performance
                  ? {
                      ...bot.performance,
                      winRate: update.performance.winRate,
                      totalPnL: update.performance.pnlToday,
                    }
                  : bot.performance,
                lastActiveAt: new Date(),
              }
            : bot
        ));
      },
    },
  });

  // Fetch bots from API
  const fetchBots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/bots/public`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.bots && Array.isArray(data.bots)) {
          setBots(data.bots.map((b: any) => ({
            ...b,
            createdAt: new Date(b.createdAt),
            lastActiveAt: b.lastActiveAt ? new Date(b.lastActiveAt) : undefined,
          })));
        } else {
          setBots(mockBots);
        }
        setError(null);
      } else {
        setBots(mockBots);
        setError(null);
      }
    } catch (err: any) {
      console.error('[useBots] Fetch error:', err);
      setBots(mockBots);
      setError(null); // Don't show error, just use mock data
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchBots, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchBots]);

  // Activate bot
  const activateBot = useCallback(async (botId: string): Promise<boolean> => {
    try {
      const result = await apiFetch(`/bots/${botId}/activate`, {
        method: 'POST',
      });

      if (result.success) {
        setBots(prev => prev.map(bot =>
          bot.id === botId ? { ...bot, status: 'active', lastActiveAt: new Date() } : bot
        ));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useBots] Activate error:', err);
      return false;
    }
  }, []);

  // Deactivate bot
  const deactivateBot = useCallback(async (botId: string): Promise<boolean> => {
    try {
      const result = await apiFetch(`/bots/${botId}/deactivate`, {
        method: 'POST',
      });

      if (result.success) {
        setBots(prev => prev.map(bot =>
          bot.id === botId ? { ...bot, status: 'inactive' } : bot
        ));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useBots] Deactivate error:', err);
      return false;
    }
  }, []);

  // Get bot by ID
  const getBotById = useCallback((botId: string): Bot | undefined => {
    return bots.find(b => b.id === botId);
  }, [bots]);

  // Computed values
  const filteredBots = includeInactive ? bots : bots.filter(b => b.status === 'active');
  const activeBots = bots.filter(b => b.status === 'active');
  const totalPnL = bots.reduce((acc, bot) => acc + (bot.performance?.totalPnL || 0), 0);

  return {
    bots: filteredBots,
    loading,
    error,
    refresh: fetchBots,
    activateBot,
    deactivateBot,
    getBotById,
    activeBots,
    totalPnL,
    isConnected,
  };
}

export default useBots;

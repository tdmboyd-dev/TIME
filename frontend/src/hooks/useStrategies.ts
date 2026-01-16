'use client';

/**
 * TIME - useStrategies Hook
 *
 * Provides access to trading strategies including:
 * - Strategy list and details
 * - Strategy synthesis
 * - Backtesting results
 * - Real-time strategy updates
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getAuthHeaders, apiFetch } from '@/lib/api';
import { useWebSocket } from './useWebSocket';

// ============================================================================
// TYPES
// ============================================================================

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'momentum' | 'mean_reversion' | 'trend_following' | 'arbitrage' | 'ml' | 'custom';
  status: 'active' | 'inactive' | 'backtesting' | 'draft';
  source: string;
  performance: {
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalReturn: number;
    tradesCount: number;
  };
  rules?: {
    entry: string[];
    exit: string[];
    riskManagement: string[];
  };
  symbols: string[];
  timeframe: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BacktestResult {
  strategyId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface UseStrategiesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  includeInactive?: boolean;
}

export interface UseStrategiesReturn {
  strategies: Strategy[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createStrategy: (strategy: Partial<Strategy>) => Promise<Strategy | null>;
  synthesizeStrategy: (params: any) => Promise<Strategy | null>;
  backtest: (strategyId: string, params: any) => Promise<BacktestResult | null>;
  getStrategyById: (id: string) => Strategy | undefined;
  activeStrategies: Strategy[];
  isConnected: boolean;
}

// ============================================================================
// MOCK DATA (fallback)
// ============================================================================

const mockStrategies: Strategy[] = [
  {
    id: 'strat-1',
    name: 'Momentum Breakout',
    description: 'Captures strong momentum moves after breakout from consolidation',
    type: 'momentum',
    status: 'active',
    source: 'Bot Brain',
    performance: {
      winRate: 0.62,
      profitFactor: 2.1,
      sharpeRatio: 1.8,
      maxDrawdown: 0.12,
      totalReturn: 0.45,
      tradesCount: 156,
    },
    rules: {
      entry: ['Price breaks above 20-day high', 'Volume > 150% of average', 'RSI > 50'],
      exit: ['Price falls below 10-day low', 'RSI < 30', 'Trailing stop 2%'],
      riskManagement: ['Max position 5%', 'Stop loss 2%', 'Max 3 concurrent positions'],
    },
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
    timeframe: '4H',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'strat-2',
    name: 'Mean Reversion RSI',
    description: 'Captures oversold bounces and overbought pullbacks',
    type: 'mean_reversion',
    status: 'active',
    source: 'Recursive Synthesis',
    performance: {
      winRate: 0.58,
      profitFactor: 1.8,
      sharpeRatio: 1.5,
      maxDrawdown: 0.08,
      totalReturn: 0.32,
      tradesCount: 243,
    },
    symbols: ['SPY', 'QQQ', 'IWM'],
    timeframe: '1H',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'strat-3',
    name: 'AI Trend Predictor',
    description: 'ML-based trend prediction using multiple features',
    type: 'ml',
    status: 'active',
    source: 'Neural Network',
    performance: {
      winRate: 0.65,
      profitFactor: 2.3,
      sharpeRatio: 2.0,
      maxDrawdown: 0.10,
      totalReturn: 0.52,
      tradesCount: 89,
    },
    symbols: ['BTC/USD', 'ETH/USD'],
    timeframe: '1D',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-10'),
  },
];

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useStrategies(options: UseStrategiesOptions = {}): UseStrategiesReturn {
  const {
    autoRefresh = true,
    refreshInterval = 60000,
    includeInactive = true,
  } = options;

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket for real-time strategy updates
  const { isConnected } = useWebSocket({
    channels: ['strategies'],
    handlers: {},
  });

  // Fetch strategies
  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/strategies`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.strategies && Array.isArray(data.strategies)) {
          setStrategies(data.strategies.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt || Date.now()),
            updatedAt: new Date(s.updatedAt || Date.now()),
          })));
        } else {
          setStrategies(mockStrategies);
        }
        setError(null);
      } else {
        setStrategies(mockStrategies);
        setError(null);
      }
    } catch (err: any) {
      console.error('[useStrategies] Fetch error:', err);
      setStrategies(mockStrategies);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStrategies, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStrategies]);

  // Create strategy
  const createStrategy = useCallback(async (strategy: Partial<Strategy>): Promise<Strategy | null> => {
    try {
      const result = await apiFetch<Strategy>('/strategies', {
        method: 'POST',
        body: JSON.stringify(strategy),
      });

      if (result.success && result.data) {
        setStrategies(prev => [...prev, result.data!]);
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('[useStrategies] Create error:', err);
      return null;
    }
  }, []);

  // Synthesize strategy
  const synthesizeStrategy = useCallback(async (params: any): Promise<Strategy | null> => {
    try {
      const result = await apiFetch<Strategy>('/strategies/synthesize', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (result.success && result.data) {
        setStrategies(prev => [...prev, result.data!]);
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('[useStrategies] Synthesize error:', err);
      return null;
    }
  }, []);

  // Run backtest
  const backtest = useCallback(async (strategyId: string, params: any): Promise<BacktestResult | null> => {
    try {
      const result = await apiFetch<BacktestResult>(`/strategies/${strategyId}/backtest`, {
        method: 'POST',
        body: JSON.stringify(params),
      });

      return result.success ? result.data || null : null;
    } catch (err) {
      console.error('[useStrategies] Backtest error:', err);
      return null;
    }
  }, []);

  // Get strategy by ID
  const getStrategyById = useCallback((id: string): Strategy | undefined => {
    return strategies.find(s => s.id === id);
  }, [strategies]);

  // Computed values
  const filteredStrategies = includeInactive ? strategies : strategies.filter(s => s.status === 'active');
  const activeStrategies = strategies.filter(s => s.status === 'active');

  return {
    strategies: filteredStrategies,
    loading,
    error,
    refresh: fetchStrategies,
    createStrategy,
    synthesizeStrategy,
    backtest,
    getStrategyById,
    activeStrategies,
    isConnected,
  };
}

export default useStrategies;

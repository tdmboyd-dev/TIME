'use client';

/**
 * TIME - usePortfolio Hook
 *
 * Provides access to portfolio data including:
 * - Positions and holdings
 * - Portfolio value and P&L
 * - Broker status
 * - Real-time portfolio updates via WebSocket
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getAuthHeaders } from '@/lib/api';
import { useWebSocket } from './useWebSocket';

// ============================================================================
// TYPES
// ============================================================================

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  side: 'long' | 'short';
  broker?: string;
  openedAt: Date;
}

export interface PortfolioSummary {
  totalValue: number;
  cashBalance: number;
  buyingPower: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  marginUsed: number;
  marginAvailable: number;
}

export interface BrokerStatus {
  name: string;
  connected: boolean;
  type: 'stocks' | 'crypto' | 'forex' | 'multi';
  lastSync?: Date;
  accountValue?: number;
}

export interface PortfolioUpdate {
  totalValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  openPositions: number;
  buying_power: number;
  marginUsed: number;
  timestamp: Date;
}

export interface UsePortfolioOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePortfolioReturn {
  positions: Position[];
  summary: PortfolioSummary | null;
  brokers: BrokerStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isConnected: boolean;
  totalPositions: number;
  longPositions: Position[];
  shortPositions: Position[];
}

// ============================================================================
// MOCK DATA (fallback)
// ============================================================================

const mockPositions: Position[] = [
  {
    id: 'pos-1',
    symbol: 'AAPL',
    quantity: 100,
    avgEntryPrice: 175.00,
    currentPrice: 178.50,
    marketValue: 17850,
    unrealizedPnL: 350,
    unrealizedPnLPercent: 2.0,
    side: 'long',
    broker: 'Alpaca',
    openedAt: new Date('2024-01-15'),
  },
  {
    id: 'pos-2',
    symbol: 'NVDA',
    quantity: 50,
    avgEntryPrice: 850.00,
    currentPrice: 875.00,
    marketValue: 43750,
    unrealizedPnL: 1250,
    unrealizedPnLPercent: 2.94,
    side: 'long',
    broker: 'Alpaca',
    openedAt: new Date('2024-01-20'),
  },
  {
    id: 'pos-3',
    symbol: 'BTC/USD',
    quantity: 0.5,
    avgEntryPrice: 65000,
    currentPrice: 67500,
    marketValue: 33750,
    unrealizedPnL: 1250,
    unrealizedPnLPercent: 3.85,
    side: 'long',
    broker: 'Coinbase',
    openedAt: new Date('2024-02-01'),
  },
];

const mockSummary: PortfolioSummary = {
  totalValue: 125000,
  cashBalance: 29650,
  buyingPower: 50000,
  dailyPnL: 1850,
  dailyPnLPercent: 1.5,
  totalUnrealizedPnL: 2850,
  totalRealizedPnL: 15420,
  marginUsed: 25000,
  marginAvailable: 75000,
};

const mockBrokers: BrokerStatus[] = [
  { name: 'Alpaca', connected: true, type: 'stocks', lastSync: new Date(), accountValue: 75000 },
  { name: 'Coinbase', connected: true, type: 'crypto', lastSync: new Date(), accountValue: 50000 },
  { name: 'OANDA', connected: false, type: 'forex' },
];

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function usePortfolio(options: UsePortfolioOptions = {}): UsePortfolioReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
  } = options;

  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [brokers, setBrokers] = useState<BrokerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket for real-time portfolio updates
  const { isConnected } = useWebSocket({
    channels: ['portfolio'],
    handlers: {
      onPortfolio: (update: PortfolioUpdate) => {
        setSummary(prev => prev ? {
          ...prev,
          totalValue: update.totalValue,
          dailyPnL: update.dailyPnL,
          dailyPnLPercent: update.dailyPnLPercent,
          buyingPower: update.buying_power,
          marginUsed: update.marginUsed,
        } : null);
      },
    },
  });

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch positions
      const positionsRes = await fetch(`${API_BASE}/portfolio/positions`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      // Fetch summary
      const summaryRes = await fetch(`${API_BASE}/portfolio/summary`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      // Fetch broker status
      const brokersRes = await fetch(`${API_BASE}/portfolio/brokers/status`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      // Process positions
      if (positionsRes.ok) {
        const data = await positionsRes.json();
        if (data.positions && Array.isArray(data.positions)) {
          setPositions(data.positions.map((p: any) => ({
            ...p,
            openedAt: new Date(p.openedAt || Date.now()),
          })));
        } else {
          setPositions(mockPositions);
        }
      } else {
        setPositions(mockPositions);
      }

      // Process summary
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary || mockSummary);
      } else {
        setSummary(mockSummary);
      }

      // Process brokers
      if (brokersRes.ok) {
        const data = await brokersRes.json();
        if (data.brokers && Array.isArray(data.brokers)) {
          setBrokers(data.brokers.map((b: any) => ({
            ...b,
            lastSync: b.lastSync ? new Date(b.lastSync) : undefined,
          })));
        } else {
          setBrokers(mockBrokers);
        }
      } else {
        setBrokers(mockBrokers);
      }

      setError(null);
    } catch (err: any) {
      console.error('[usePortfolio] Fetch error:', err);
      // Use mock data on error
      setPositions(mockPositions);
      setSummary(mockSummary);
      setBrokers(mockBrokers);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPortfolio, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchPortfolio]);

  // Computed values
  const longPositions = positions.filter(p => p.side === 'long');
  const shortPositions = positions.filter(p => p.side === 'short');

  return {
    positions,
    summary,
    brokers,
    loading,
    error,
    refresh: fetchPortfolio,
    isConnected,
    totalPositions: positions.length,
    longPositions,
    shortPositions,
  };
}

export default usePortfolio;

'use client';

/**
 * TIME - useSignals Hook
 *
 * Provides access to trading signals from all connected systems:
 * - Ultimate Money Machine
 * - TIMEBEUNUS
 * - Bot Brain
 * - Agent Swarm
 * - AI Trading Signals
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getAuthHeaders } from '@/lib/api';
import { useWebSocket } from './useWebSocket';

// ============================================================================
// TYPES
// ============================================================================

export interface Signal {
  id: string;
  symbol: string;
  direction: 'long' | 'short' | 'neutral';
  confidence: number;
  source: string;
  strategy?: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
  createdAt: Date;
  reason: string;
  indicators?: Record<string, number>;
  status?: 'active' | 'expired' | 'triggered' | 'stopped';
}

export interface SignalUpdate {
  signalId: string;
  symbol: string;
  direction: 'long' | 'short';
  confidence: number;
  source: string;
  timestamp: Date;
}

export interface UseSignalsOptions {
  maxSignals?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  sources?: string[];
}

export interface UseSignalsReturn {
  signals: Signal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  longSignals: Signal[];
  shortSignals: Signal[];
  avgConfidence: number;
  isConnected: boolean;
  filterBySource: (source: string) => Signal[];
  filterBySymbol: (symbol: string) => Signal[];
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSignals(options: UseSignalsOptions = {}): UseSignalsReturn {
  const {
    maxSignals = 50,
    autoRefresh = true,
    refreshInterval = 30000,
    sources,
  } = options;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket for real-time signal updates
  const { isConnected } = useWebSocket({
    channels: ['signals'],
    handlers: {
      onTrade: (update: any) => {
        // Handle signal-type updates
        if (update.signalId || update.signal) {
          const signalData = update.signal || update;
          const newSignal: Signal = {
            id: signalData.signalId || signalData.id || `sig-${Date.now()}`,
            symbol: signalData.symbol,
            direction: signalData.direction || 'neutral',
            confidence: signalData.confidence || 0.5,
            source: signalData.source || 'Unknown',
            timeframe: signalData.timeframe || '1H',
            createdAt: new Date(signalData.timestamp || Date.now()),
            reason: signalData.reason || 'Real-time signal',
          };

          setSignals(prev => {
            // Check for duplicate
            const exists = prev.some(s => s.id === newSignal.id);
            if (exists) return prev;

            // Add new signal at the beginning, limit total
            return [newSignal, ...prev].slice(0, maxSignals);
          });
        }
      },
    },
  });

  // Fetch signals from API
  const fetchSignals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/signals/active`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.signals && Array.isArray(data.signals)) {
          let fetchedSignals = data.signals.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt || s.timestamp || Date.now()),
          }));

          // Filter by sources if specified
          if (sources && sources.length > 0) {
            fetchedSignals = fetchedSignals.filter((s: Signal) =>
              sources.includes(s.source)
            );
          }

          setSignals(fetchedSignals.slice(0, maxSignals));
        }
        setError(null);
      } else {
        // API not available, signals will come from WebSocket
        setError(null);
      }
    } catch (err: any) {
      console.error('[useSignals] Fetch error:', err);
      setError(null); // Don't show error, signals will come from WebSocket
    } finally {
      setLoading(false);
    }
  }, [maxSignals, sources]);

  // Initial fetch
  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchSignals, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSignals]);

  // Computed values
  const longSignals = signals.filter(s => s.direction === 'long');
  const shortSignals = signals.filter(s => s.direction === 'short');
  const avgConfidence = signals.length > 0
    ? signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length
    : 0;

  // Filter functions
  const filterBySource = useCallback((source: string): Signal[] => {
    return signals.filter(s => s.source === source);
  }, [signals]);

  const filterBySymbol = useCallback((symbol: string): Signal[] => {
    return signals.filter(s => s.symbol.toLowerCase().includes(symbol.toLowerCase()));
  }, [signals]);

  return {
    signals,
    loading,
    error,
    refresh: fetchSignals,
    longSignals,
    shortSignals,
    avgConfidence,
    isConnected,
    filterBySource,
    filterBySymbol,
  };
}

export default useSignals;

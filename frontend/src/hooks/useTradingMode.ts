/**
 * Trading Mode Hook
 *
 * Frontend hook for managing Paper/Live trading mode across all pages.
 * Connects to /api/v1/trading-mode/* endpoints.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api';

export type TradingMode = 'practice' | 'live';

export interface BrokerModeConfig {
  id: string;
  name: string;
  mode: TradingMode;
  supportsToggle: boolean;
  liveEnabled: boolean;
}

export interface TradingModeStatus {
  globalMode: TradingMode;
  liveUnlocked: boolean;
  brokers: BrokerModeConfig[];
  warnings: string[];
  isLoading: boolean;
  error: string | null;
}

export interface UseTradingModeReturn {
  // State
  mode: TradingMode;
  isPractice: boolean;
  isLive: boolean;
  liveUnlocked: boolean;
  brokers: BrokerModeConfig[];
  warnings: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setGlobalMode: (mode: TradingMode, confirmation?: string) => Promise<{ success: boolean; message: string }>;
  toggleMode: (confirmation?: string) => Promise<{ success: boolean; message: string }>;
  unlockLiveTrading: (acknowledgement: string) => Promise<{ success: boolean; message: string }>;
  lockLiveTrading: () => Promise<{ success: boolean; message: string }>;
  setBrokerMode: (brokerId: string, mode: TradingMode, confirmation?: string) => Promise<{ success: boolean; message: string }>;
  refresh: () => Promise<void>;
}

export function useTradingMode(): UseTradingModeReturn {
  const [status, setStatus] = useState<TradingModeStatus>({
    globalMode: 'practice',
    liveUnlocked: false,
    brokers: [],
    warnings: [],
    isLoading: true,
    error: null,
  });

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/trading-mode/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatus(prev => ({
            ...prev,
            globalMode: data.data.globalMode,
            liveUnlocked: data.data.liveUnlocked,
            brokers: data.data.brokers || [],
            warnings: data.data.warnings || [],
            isLoading: false,
            error: null,
          }));
        }
      } else {
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to fetch trading mode status',
        }));
      }
    } catch {
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: 'Trading mode API not available',
      }));
    }
  }, []);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Set global mode
  const setGlobalMode = useCallback(async (mode: TradingMode, confirmation?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/trading-mode/global`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode, confirmation }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchStatus();
      }

      return {
        success: data.success,
        message: data.data?.message || data.error || 'Unknown error',
      };
    } catch (error) {
      return { success: false, message: 'Failed to set trading mode' };
    }
  }, [fetchStatus]);

  // Toggle mode
  const toggleMode = useCallback(async (confirmation?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/trading-mode/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmation }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchStatus();
      }

      return {
        success: data.success,
        message: data.data?.message || data.error || 'Unknown error',
      };
    } catch (error) {
      return { success: false, message: 'Failed to toggle trading mode' };
    }
  }, [fetchStatus]);

  // Unlock live trading
  const unlockLiveTrading = useCallback(async (acknowledgement: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/trading-mode/unlock-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ acknowledgement }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchStatus();
      }

      return {
        success: data.success,
        message: data.data?.message || data.error || 'Unknown error',
      };
    } catch (error) {
      return { success: false, message: 'Failed to unlock live trading' };
    }
  }, [fetchStatus]);

  // Lock live trading
  const lockLiveTrading = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/trading-mode/lock-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        await fetchStatus();
      }

      return {
        success: data.success,
        message: data.data?.message || data.error || 'Unknown error',
      };
    } catch (error) {
      return { success: false, message: 'Failed to lock live trading' };
    }
  }, [fetchStatus]);

  // Set broker mode
  const setBrokerMode = useCallback(async (brokerId: string, mode: TradingMode, confirmation?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/trading-mode/broker/${brokerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode, confirmation }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchStatus();
      }

      return {
        success: data.success,
        message: data.data?.message || data.error || 'Unknown error',
      };
    } catch (error) {
      return { success: false, message: 'Failed to set broker mode' };
    }
  }, [fetchStatus]);

  return {
    // State
    mode: status.globalMode,
    isPractice: status.globalMode === 'practice',
    isLive: status.globalMode === 'live',
    liveUnlocked: status.liveUnlocked,
    brokers: status.brokers,
    warnings: status.warnings,
    isLoading: status.isLoading,
    error: status.error,

    // Actions
    setGlobalMode,
    toggleMode,
    unlockLiveTrading,
    lockLiveTrading,
    setBrokerMode,
    refresh: fetchStatus,
  };
}

export default useTradingMode;
